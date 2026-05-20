"""Phase 34 LIVE-02 (B-02) — photo signed-URL handler returns 404 on a
missing storage object instead of letting the upstream surface as 500.

Two cases:

* ``test_signed_photo_url_returns_404_on_storage_miss`` — when
  ``services.storage.create_signed_photo_url`` raises ``StorageObjectNotFound``
  the router returns ``404 storage object not found`` (NOT 500).
* ``test_signed_photo_url_logs_warning_on_storage_miss`` — the same path emits
  a single ``log.warning`` carrying the recipe id + storage path so ops can
  spot seed/upload drift without a paging-level alert.

Both tests use the Phase 15 conftest fixtures (`db_session` rolled-back
transaction + `client` TestClient with `get_db` overridden) and the seeded
Bearer token already established in test_cooking_logs.py / test_recipes.py.
"""

from __future__ import annotations

import logging
import os
from unittest import mock

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.member import Member
from app.models.recipe import Recipe
from app.services.storage import StorageObjectNotFound

# Mirrors backend/tests/test_recipes.py SEED_TOKEN — the seeded household's
# Bearer (cookie-or-Bearer auth contract; backend/app/auth.py D-03 fallback).
SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")
AUTH_HEADERS = {"Authorization": f"Bearer {SEED_TOKEN}"}


def _seeded_member(db: Session) -> Member:
    m = db.scalar(select(Member).where(Member.auth_token == SEED_TOKEN).limit(1))
    assert m is not None, (
        f"seed Postgres has no member with auth_token={SEED_TOKEN!r} — run `uv run seed`?"
    )
    return m


def _seed_recipe_with_phantom_path(db: Session, member: Member) -> tuple[Recipe, str]:
    """Insert a structured recipe whose ``photo_paths`` references a storage
    object that does NOT exist. Mirrors the B-02 punch-list cascade: the
    local seed inserts ``recipes.photo_paths`` rows without uploading the
    matching bytes, so every photo-url read hit the unhardened handler's 500.
    """
    phantom_path = f"{member.household_id}/00000000-0000-0000-0000-000000000000/missing.jpg"
    recipe = Recipe(
        household_id=member.household_id,
        created_by_member_id=member.id,
        status="structured",
        title="Recette fantôme (test)",
        photo_paths=[phantom_path],
        mood=[],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe, phantom_path


def test_signed_photo_url_returns_404_on_storage_miss(
    client: TestClient,
    db_session: Session,
) -> None:
    """B-02 — the authorized-but-missing object path returns 404, not 500.

    The recipe + path pass both authorization gates (recipe-household match,
    path-in-photo_paths), so the handler reaches ``create_signed_photo_url``.
    We patch the service to raise ``StorageObjectNotFound`` (the typed
    Phase 34 LIVE-02 signal) and assert the router converts that into a
    clean 404 with the contracted detail string.
    """
    member = _seeded_member(db_session)
    recipe, phantom_path = _seed_recipe_with_phantom_path(db_session, member)

    with mock.patch(
        "app.routers.photos.create_signed_photo_url",
        side_effect=StorageObjectNotFound(phantom_path),
    ):
        resp = client.get(
            f"/recipes/{recipe.id}/photo-url",
            params={"path": phantom_path},
            headers=AUTH_HEADERS,
        )

    # 404 (not 500) — the frontend's useSignedPhotoUrl single-retry self-heal
    # needs a distinguishable signal: "object missing forever" vs "server
    # error, maybe retry". 404 settles cleanly on the placeholder branch.
    assert resp.status_code == 404, resp.text
    assert resp.json() == {"detail": "storage object not found"}


def test_signed_photo_url_logs_warning_on_storage_miss(
    client: TestClient,
    db_session: Session,
    caplog: pytest.LogCaptureFixture,  # type: ignore[name-defined]
) -> None:
    """B-02 — the 404 conversion emits a structured warn carrying the
    recipe id + storage path. ``log.warning`` (not ``log.error``) is the
    contract: a missing object is operationally interesting (seed/upload
    drift) but not a paging-level event.
    """
    member = _seeded_member(db_session)
    recipe, phantom_path = _seed_recipe_with_phantom_path(db_session, member)

    with caplog.at_level(logging.WARNING, logger="app.routers.photos"):
        with mock.patch(
            "app.routers.photos.create_signed_photo_url",
            side_effect=StorageObjectNotFound(phantom_path),
        ):
            resp = client.get(
                f"/recipes/{recipe.id}/photo-url",
                params={"path": phantom_path},
                headers=AUTH_HEADERS,
            )

    assert resp.status_code == 404, resp.text

    # Exactly one warn record carrying both the recipe id and storage path.
    matching = [
        rec
        for rec in caplog.records
        if rec.levelno == logging.WARNING
        and "signed_photo_url.storage_object_missing" in rec.getMessage()
    ]
    assert len(matching) == 1, (
        f"expected exactly one storage_object_missing warn; got {len(matching)} "
        f"(all WARNING records: {[r.getMessage() for r in caplog.records if r.levelno == logging.WARNING]})"
    )
    msg = matching[0].getMessage()
    assert str(recipe.id) in msg, msg
    assert phantom_path in msg, msg


def test_signed_photo_url_returns_404_when_sdk_returns_unexpected_shape(
    client: TestClient,
    db_session: Session,
) -> None:
    """Phase 34 follow-up WR-02 — the create_signed_photo_url response
    normalization must reject every non-dict, non-string shape and raise
    StorageObjectNotFound so the router still maps to 404.

    Pre-fix, `(result or {}).get("signedURL")` evaluated to `result.get(...)`
    when result was a truthy non-dict (list, custom object), raising
    AttributeError outside the SDK try/except — bubbled as a generic 500
    and defeated LIVE-02's "missing object → 404" contract.

    Three SDK-return shapes are exercised by patching the storage facade
    directly so the real normalization branch executes end-to-end:
      - bare list ([])
      - None
      - a non-dict, non-string object (sentinel instance)
    Each must surface as a clean 404 from the router.
    """
    member = _seeded_member(db_session)
    recipe, phantom_path = _seed_recipe_with_phantom_path(db_session, member)

    class _FakeBucket:
        def __init__(self, payload: object) -> None:
            self._payload = payload

        def create_signed_url(self, path: str, ttl: int) -> object:  # noqa: ARG002
            return self._payload

    class _FakeStorage:
        def __init__(self, payload: object) -> None:
            self._payload = payload

        def from_(self, bucket: str) -> _FakeBucket:  # noqa: ARG002
            return _FakeBucket(self._payload)

    class _FakeClient:
        def __init__(self, payload: object) -> None:
            self.storage = _FakeStorage(payload)

    class _OpaqueSentinel:
        """A truthy non-dict, non-string — pre-fix, this would hit
        AttributeError on `(result or {}).get(...)` and 500 the response."""

    unexpected_shapes: list[object] = [
        [],  # list — `.get` not defined
        None,  # falsy non-dict
        _OpaqueSentinel(),  # truthy non-dict, non-string
    ]

    for payload in unexpected_shapes:
        fake = _FakeClient(payload)
        # Patch the lazy-singleton accessor used by create_signed_photo_url
        # so the real normalization branch runs against `payload`.
        with mock.patch("app.services.storage._supabase", return_value=fake):
            resp = client.get(
                f"/recipes/{recipe.id}/photo-url",
                params={"path": phantom_path},
                headers=AUTH_HEADERS,
            )

        assert resp.status_code == 404, (
            f"payload={payload!r} expected 404, got {resp.status_code}: {resp.text}"
        )
        assert resp.json() == {"detail": "storage object not found"}, (
            f"payload={payload!r} unexpected body: {resp.json()}"
        )
