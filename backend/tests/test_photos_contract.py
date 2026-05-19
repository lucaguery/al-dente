"""4-test endpoint contract for routers/photos.py — closes ROUT-05.

The photos router has two endpoints (prefix /recipes):
  POST /recipes/{recipe_id}/photos  — multipart upload; validates MIME + size;
                                      appends path to recipe.photo_paths in DB;
                                      broadcasts recipe.updated via realtime.
  GET  /recipes/{recipe_id}/photo-url — signed-URL retrieval (covered by
                                         test_photos.py B-02 tests).

Primary contract endpoint: POST /recipes/{recipe_id}/photos (upload).

Tests (standard 4-test shape, adapted for multipart + external storage):
  1. happy_path — POST /recipes/{recipe_id}/photos with a valid JPEG file
     upload (monkeypatched storage) returns 201 + RecipeResponse with the
     path appended to photo_paths.
  2. 401_missing_auth — same POST with no Authorization header returns 401.
  3. 404_cross_household — POST to a recipe that belongs to a foreign household
     (not the caller's) returns 404 (D-38-02: 404-not-403 enforcement).
  4. 415_unsupported_media — upload a non-image content (plain text bytes)
     returns 415 Unsupported Media Type. The storage service's detect_mime_and_ext
     sniffs magic bytes and raises ValueError("unsupported") which the router
     converts to 415. We monkeypatch upload_recipe_photo to raise the error
     directly so the test does not need a real Supabase bucket.

Storage stub rationale: The router calls upload_recipe_photo (services/storage)
which requires a live Supabase bucket. Contract tests stub that call via
monkeypatch so the auth + routing + validation contract is exercised without
external dependencies. The B-02 test in test_photos.py already covers the
signed-URL storage-miss path.
"""
from __future__ import annotations

import os
import uuid
from unittest import mock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.household import Household
from app.models.member import Member
from app.models.recipe import Recipe

SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")
AUTH_HEADERS = {"Authorization": f"Bearer {SEED_TOKEN}"}

# Minimal valid JPEG magic bytes (SOI marker) — passes magic-byte sniff.
_JPEG_MAGIC = b"\xff\xd8\xff\xe0" + b"\x00" * 12

# Fake storage path returned by the monkeypatched upload.
_FAKE_STORAGE_PATH = "fake-household-id/fake-recipe-id/test-photo.jpg"


def _seeded_member(db: Session) -> Member:
    m = db.scalar(select(Member).where(Member.auth_token == SEED_TOKEN).limit(1))
    assert m is not None, (
        f"seed Postgres has no member with auth_token={SEED_TOKEN!r} — "
        f"run `uv run seed`?"
    )
    return m


def _make_recipe(db: Session, member: Member) -> Recipe:
    """Insert a minimal structured recipe for the seeded member's household."""
    recipe = Recipe(
        household_id=member.household_id,
        created_by_member_id=member.id,
        status="structured",
        title="Recipe for photo contract test",
        mood=[],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
    )
    db.add(recipe)
    db.flush()  # NOT commit — SAVEPOINT envelope keeps this in the rollback
    return recipe


def test_photos_happy_path(
    client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """ROUT-05 happy path — POST /recipes/{id}/photos with valid JPEG returns 201.

    Monkeypatches upload_recipe_photo to return a fake path so the test
    does not require a live Supabase bucket. The broadcast is also stubbed
    to avoid async errors in the test environment.
    """
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member)

    monkeypatch.setattr(
        "app.routers.photos.upload_recipe_photo",
        lambda **kwargs: _FAKE_STORAGE_PATH,
    )
    monkeypatch.setattr(
        "app.routers.photos.broadcast_to_household",
        mock.AsyncMock(return_value=None),
    )

    resp = client.post(
        f"/recipes/{recipe.id}/photos",
        headers=AUTH_HEADERS,
        files={"file": ("test.jpg", _JPEG_MAGIC, "image/jpeg")},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    # Response must include photo_paths with the fake storage path appended.
    assert "photo_paths" in body, body
    assert _FAKE_STORAGE_PATH in body["photo_paths"], body


def test_photos_401_missing_auth(
    client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """ROUT-05 — POST /recipes/{id}/photos with no Authorization header returns 401.

    The auth gate fires before any DB or storage access.
    """
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member)

    resp = client.post(
        f"/recipes/{recipe.id}/photos",
        files={"file": ("test.jpg", _JPEG_MAGIC, "image/jpeg")},
    )
    assert resp.status_code == 401, resp.text


def test_photos_404_cross_household(
    client: TestClient, db_session: Session
) -> None:
    """ROUT-05 / D-38-02 — POST to a recipe in a foreign household returns 404.

    Creates a foreign Household + Member + Recipe via db_session.flush()
    (NOT commit — SAVEPOINT contract from 38-01 guarantees rollback at
    teardown). The seeded member's auth_token does not belong to the foreign
    household, so the router returns 404 (not 403).

    # D-38-02: 404-not-403 enforcement
    """
    foreign_household = Household(
        id=uuid.uuid4(),
        name="Foreign photos household",
        invite_code=f"PH{uuid.uuid4().hex[:4].upper()}",
        timezone="Europe/Paris",
    )
    db_session.add(foreign_household)
    db_session.flush()

    foreign_member = Member(
        id=uuid.uuid4(),
        household_id=foreign_household.id,
        name="ForeignMember",
        color_hex="#FF6B6B",
        auth_token=f"foreign-token-{uuid.uuid4().hex[:8]}",
    )
    db_session.add(foreign_member)
    db_session.flush()

    foreign_recipe = Recipe(
        household_id=foreign_household.id,
        created_by_member_id=foreign_member.id,
        status="structured",
        title="Foreign household recipe",
        mood=[],
        seasonality=["spring"],
        tags=[],
    )
    db_session.add(foreign_recipe)
    db_session.flush()  # NOT commit — SAVEPOINT envelope

    # Seeded member's token used against a recipe in a different household.
    resp = client.post(
        f"/recipes/{foreign_recipe.id}/photos",
        headers=AUTH_HEADERS,
        files={"file": ("test.jpg", _JPEG_MAGIC, "image/jpeg")},
    )
    # D-38-02: 404-not-403 enforcement
    assert resp.status_code == 404, resp.text


def test_photos_415_unsupported_media(
    client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """ROUT-05 validation — uploading a non-image file returns 415.

    The storage service's detect_mime_and_ext sniffs magic bytes and raises
    ValueError("unsupported") for unrecognized content. The router catches
    this and returns HTTP 415 Unsupported Media Type (photos.py:119-123).

    We monkeypatch upload_recipe_photo to raise ValueError("unsupported")
    directly so the test does not need a Supabase bucket or real MIME logic.
    The recipe must exist in the seeded household so the router passes the
    recipe-existence + cross-household checks before reaching the upload call.
    """
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member)

    def _raise_unsupported(**kwargs):
        raise ValueError("unsupported")

    monkeypatch.setattr("app.routers.photos.upload_recipe_photo", _raise_unsupported)

    resp = client.post(
        f"/recipes/{recipe.id}/photos",
        headers=AUTH_HEADERS,
        files={"file": ("test.txt", b"plain text content", "text/plain")},
    )
    assert resp.status_code == 415, resp.text
