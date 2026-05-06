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


def detect_mime_and_ext(content: bytes) -> tuple[str, str] | None:
    """Sniff magic bytes. Returns ``(mime, ext)`` or ``None`` if unrecognized.

    Does NOT trust ``Content-Type`` — clients can lie about that header
    (T-01-09-01). The MIME allowlist (locked for v0.1) is JPEG, PNG, HEIC.
    """
    if not content:
        return None
    # JPEG — first 3 bytes are FF D8 FF (any JPEG variant: JFIF, EXIF, etc.)
    if content[:3] == b"\xff\xd8\xff":
        return ("image/jpeg", "jpg")
    # PNG — 89 50 4E 47 0D 0A 1A 0A
    if content[:8] == b"\x89PNG\r\n\x1a\n":
        return ("image/png", "png")
    # HEIC/HEIF (iOS native) — variable header but ftyp{brand} sits at offset 4
    if len(content) >= 12 and content[4:8] == b"ftyp":
        brand = content[8:12]
        if brand in (b"heic", b"heix", b"mif1", b"msf1", b"heim", b"hevc"):
            return ("image/heic", "heic")
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
