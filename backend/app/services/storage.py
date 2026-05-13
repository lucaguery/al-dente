"""Photo upload to Supabase Storage (RECIPE-07, plan 01-09).

Per CONTEXT.md D-02, all v0.1 photo bytes traverse the backend (no presigned
URLs). Service-role key lives only here — never in any frontend bundle.

# TODO(productize): D-02 — revisit at W2 (CAPTURE-02 multimodal photo capture)
# or W4 (COOK-03 cooking-log photos / Album finalization) if Railway egress
# shows up in metrics. Switch to Supabase presigned PUT URLs at that point.

Defenses encoded here:

* T-01-09-01 (MIME spoofing): ``detect_mime_and_ext`` sniffs magic bytes only;
  the client's ``Content-Type`` header is ignored.
* T-01-09-02 (path traversal): the storage path is built from server-side
  values — ``{household_id}/{recipe_id}/{uuid4}.{ext}``. The client filename
  is read by FastAPI but never used in the path.
* T-01-09-03 (DoS via huge upload): ``MAX_BYTES = 8 MiB`` hard cap; the
  router reads ``MAX_BYTES + 1`` and 413's anything over.
* T-01-09-04 (key leak): the service-role key is read from settings at first
  use only, and only on the backend; ``.env.example`` documents the boundary.
"""

from __future__ import annotations

import logging
from uuid import UUID, uuid4

from supabase import Client, create_client

from app.config import settings

log = logging.getLogger(__name__)

BUCKET = "recipe-photos"
MAX_BYTES = 8 * 1024 * 1024  # 8 MiB hard cap (T-01-09-03 mitigation)
SIGNED_URL_TTL_SECONDS = 60 * 5  # 5 minutes; FE re-fetches on each detail mount (01-10)


def detect_mime_and_ext(content: bytes) -> tuple[str, str] | None:
    """Sniff magic bytes. Returns ``(mime, ext)`` or ``None`` if unrecognized.

    Does NOT trust ``Content-Type`` — clients can lie about that header
    (T-01-09-01). The MIME allowlist is JPEG, PNG, HEIC/HEIF, WebP, AVIF.
    """
    if not content:
        return None
    # JPEG — first 3 bytes are FF D8 FF (any JPEG variant: JFIF, EXIF, etc.)
    if content[:3] == b"\xff\xd8\xff":
        return ("image/jpeg", "jpg")
    # PNG — 89 50 4E 47 0D 0A 1A 0A
    if content[:8] == b"\x89PNG\r\n\x1a\n":
        return ("image/png", "png")
    # WebP — RIFF????WEBP
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return ("image/webp", "webp")
    # HEIC/HEIF/AVIF — ISO Base Media File Format: ftyp{brand} at offset 4
    if len(content) >= 12 and content[4:8] == b"ftyp":
        brand = content[8:12]
        if brand in (b"heic", b"heix", b"mif1", b"msf1", b"heim", b"hevc", b"heif"):
            return ("image/heic", "heic")
        if brand in (b"avif", b"avis"):
            return ("image/avif", "avif")
    return None


_client: Client | None = None


def _supabase() -> Client:
    """Lazy-construct the Supabase client so missing env doesn't crash import.

    Module import time has to stay safe (Alembic / pytest collection import
    services without env). The error surfaces at upload time instead.
    """
    global _client
    if _client is None:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise RuntimeError(
                "Supabase URL / service-role key not configured "
                "(set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend env)"
            )
        _client = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )
    return _client


def upload_recipe_photo(
    *,
    household_id: UUID,
    recipe_id: UUID,
    content: bytes,
) -> str:
    """Validate, generate a server-side filename, upload, return the storage path.

    Args:
        household_id: trust-boundary scope; the on-disk folder.
        recipe_id: recipe owning the photo (validated household-scoped by caller).
        content: raw bytes (already size-checked by the router; we re-check
            here as defense-in-depth).

    Raises:
        ValueError("oversize") if ``len(content) > MAX_BYTES``.
        ValueError("unsupported") if the magic bytes don't match an allowed
            image type.

    Returns:
        The storage path **relative to the bucket root**:
        ``"{household_id}/{recipe_id}/{uuid}.{ext}"``. The bucket name is NOT
        in the path — that string is what we persist on
        ``recipes.photo_paths`` and what 01-10 will feed into
        ``create_signed_url`` for the read side.
    """
    # T-10-06 / Pitfall 8 — deterministic test mode: skip Supabase upload,
    # return a fake bucket-relative path. Bytes are not validated either —
    # the canned LLM response (D-04) doesn't need to match anything in object storage.
    if settings.environment == "test":
        sniffed = detect_mime_and_ext(content)
        ext = sniffed[1] if sniffed else "jpg"
        return f"{household_id}/{recipe_id}/{uuid4()}.{ext}"

    if len(content) > MAX_BYTES:
        raise ValueError("oversize")
    sniffed = detect_mime_and_ext(content)
    if sniffed is None:
        raise ValueError("unsupported")
    mime, ext = sniffed

    # Server-generated filename — client-supplied filename is discarded
    # (T-01-09-02 path-traversal guard). household_id and recipe_id are
    # already UUIDs validated by FastAPI's path coercion.
    path = f"{household_id}/{recipe_id}/{uuid4()}.{ext}"

    client = _supabase()
    try:
        client.storage.from_(BUCKET).upload(
            path=path,
            file=content,
            file_options={"content-type": mime, "upsert": "false"},
        )
    except Exception as exc:  # noqa: BLE001 — broad catch is intentional
        # T-01-09-09: log internal detail, surface generic 500 upstream.
        log.exception(
            "supabase upload failed path=%s err=%s", path, exc,
        )
        raise
    log.info(
        "photo.uploaded household=%s recipe=%s path=%s bytes=%d",
        household_id,
        recipe_id,
        path,
        len(content),
    )
    return path


def upload_cooking_log_photo(
    *,
    household_id: UUID,
    log_id: UUID,
    content: bytes,
) -> str:
    """Validate, generate a server-side filename, upload, return the storage path.

    Mirrors :func:`upload_recipe_photo` but writes to a different prefix so
    cooking-log photos and recipe photos do not collide. Same bucket
    (``recipe-photos``) — couple-scale storage; productize-later if we ever
    need a separate bucket for retention policies.

    Args:
        household_id: trust-boundary scope; the on-disk folder root.
        log_id: cooking log owning the photo (validated household-scoped by caller).
        content: raw bytes (already size-checked by the router; we re-check
            here as defense-in-depth).

    Raises:
        ValueError("oversize") if ``len(content) > MAX_BYTES``.
        ValueError("unsupported") if the magic bytes don't match an allowed
            image type.

    Returns:
        The bucket-relative path
        ``"cooking-logs/{household_id}/{log_id}/{uuid}.{ext}"``.

    # TODO(productize): D-02 — same egress/presigned-PUT switch as
    # upload_recipe_photo if Railway egress shows up in metrics.
    """
    # T-10-06 / Pitfall 8 — deterministic test mode: skip Supabase upload,
    # return a fake bucket-relative path under the cooking-logs prefix.
    if settings.environment == "test":
        sniffed = detect_mime_and_ext(content)
        ext = sniffed[1] if sniffed else "jpg"
        return f"cooking-logs/{household_id}/{log_id}/{uuid4()}.{ext}"

    if len(content) > MAX_BYTES:
        raise ValueError("oversize")
    sniffed = detect_mime_and_ext(content)
    if sniffed is None:
        raise ValueError("unsupported")
    mime, ext = sniffed

    # Server-generated filename — client filename never enters the path
    # (T-04-01-04 path-traversal guard, mirrors T-01-09-02).
    path = f"cooking-logs/{household_id}/{log_id}/{uuid4()}.{ext}"

    client = _supabase()
    try:
        client.storage.from_(BUCKET).upload(
            path=path,
            file=content,
            file_options={"content-type": mime, "upsert": "false"},
        )
    except Exception as exc:  # noqa: BLE001 — broad catch is intentional
        log.exception(
            "supabase upload failed (cooking_log) path=%s err=%s", path, exc,
        )
        raise
    log.info(
        "cooking_log_photo.uploaded household=%s log=%s path=%s bytes=%d",
        household_id,
        log_id,
        path,
        len(content),
    )
    return path


def create_signed_photo_url(path: str) -> str:
    """Return a short-lived URL the frontend can drop into ``<img src>``.

    ``path`` must already be the canonical bucket-relative path stored in
    ``recipes.photo_paths`` (no ``{bucket}/`` prefix). Caller is responsible
    for authorizing that ``path`` belongs to the requester's household — see
    ``app/routers/photos.py::signed_photo_url`` (T-01-10-01 mitigation).

    supabase-py returns the signed URL under one of several keys depending on
    SDK version. We normalize all three known shapes so a minor SDK bump
    doesn't silently break the read path.
    """
    client = _supabase()
    result = client.storage.from_(BUCKET).create_signed_url(
        path, SIGNED_URL_TTL_SECONDS
    )
    url = (
        (result or {}).get("signedURL")
        or (result or {}).get("signedUrl")
        or ((result or {}).get("data") or {}).get("signedUrl")
    )
    if not url:
        raise RuntimeError(f"unexpected signed-url response: {result!r}")
    return url


# ============================================================================
# Phase 11 — Synthetic-household scope helpers (D-08, D-22).
# All Storage writes/deletes for the prod-synthetic seed go through these.
# The `synthetic/` prefix is the structural marker for the scope guard and
# the teardown scope.
# ============================================================================

SYNTHETIC_PREFIX = "synthetic/"


def _assert_synthetic_storage_path(path: str) -> None:
    """D-08 — every prod-synthetic Storage write/delete passes through this.
    Refuses any path not under `synthetic/` to prevent the seed from ever
    touching real-user photo objects.
    """
    if not path.startswith(SYNTHETIC_PREFIX):
        raise AssertionError(
            f"refusing storage operation outside synthetic/ scope: {path!r}"
        )


def upload_synthetic_photo_idempotent(*, slug: str, content: bytes) -> str:
    """D-08 + D-22 — skip-if-exists, scope-guarded upload.

    Returns the bucket-relative path stored in `recipes.photo_paths`.
    Caller is responsible for setting `recipe.photo_paths = [returned_path]`
    in the same DB tx (Pitfall 2 — without this, signed-URL reads 404).
    """
    path = f"{SYNTHETIC_PREFIX}{slug}.jpg"
    _assert_synthetic_storage_path(path)

    client = _supabase()
    bucket = client.storage.from_(BUCKET)  # BUCKET = "recipe-photos"

    # storage3.SyncBucket.exists() issues HEAD; returns True/False.
    if bucket.exists(path):
        log.info("synthetic_photo.skipped_exists path=%s", path)
        return path  # D-22 idempotent — no re-upload.

    bucket.upload(
        path=path,
        file=content,
        file_options={"content-type": "image/jpeg", "upsert": "false"},
    )
    log.info("synthetic_photo.uploaded path=%s bytes=%d", path, len(content))
    return path


def list_synthetic_storage_count() -> int:
    """Return the number of objects under `synthetic/`. Used by Plan 04's
    post-seed COUNT-diff banner (D-13).
    """
    client = _supabase()
    bucket = client.storage.from_(BUCKET)
    # Default page size is 100; for 21 objects a single call suffices.
    listed = bucket.list("synthetic")
    return len(listed or [])


def download_recipe_photo(path: str) -> bytes:
    """Download bytes from Supabase Storage by bucket-relative path.

    Phase 25 D-08 — used by promote_draft's photo branch. Closes the
    v0.1 TODO(productize) at services/llm.py that noted photo retry was
    not supported because bytes weren't stored (only paths were).

    Returns raw bytes. Raises on Supabase error; caller wraps via
    _record_failure.
    """
    if settings.environment == "test":
        # Test mode: return minimal valid JPEG bytes (FFD8FF header).
        return b"\xff\xd8\xff\xe0" + b"\x00" * 100

    client = _supabase()
    return client.storage.from_(BUCKET).download(path)


def teardown_synthetic_storage() -> int:
    """D-16 + D-08 — scope-guarded prefix delete. Lists every object under
    `synthetic/`, asserts each path is in scope (belt-and-suspenders), then
    issues a single DELETE with the list. Returns the number of objects
    removed.
    """
    client = _supabase()
    bucket = client.storage.from_(BUCKET)
    listed = bucket.list("synthetic") or []
    paths = [f"{SYNTHETIC_PREFIX}{obj['name']}" for obj in listed]
    for p in paths:
        _assert_synthetic_storage_path(p)
    if paths:
        bucket.remove(paths)
    log.info("synthetic_storage.teardown removed=%d", len(paths))
    return len(paths)
