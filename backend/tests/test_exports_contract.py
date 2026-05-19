"""4-test endpoint contract for routers/exports.py — closes ROUT-04.

The exports router has a single endpoint:
  GET /households/{household_id}/export.json

Endpoint semantics:
  * household_id path-param MUST match member.household_id — 404 otherwise
    (not 403, per D-38-02 and exports.py:46-49 comment "T-01-08-06").
  * Returns Content-Disposition: attachment header (so Safari prompts "Save to Files").
  * Body is JSON {"recipes": [...]}.

Tests (standard 4-test shape):
  1. happy_path — authenticated GET with matching household_id returns 200,
     Content-Disposition header present, body is valid {"recipes": [...]} JSON.
  2. 401_missing_auth — same URL with no auth headers returns 401.
  3. 404_cross_household — GET with a foreign household_id (not matching
     caller's household) returns 404 (D-38-02: 404-not-403 enforcement).
  4. 422_validation — malformed (non-UUID) household_id in path returns 422
     from FastAPI's path-param coercion.
"""
from __future__ import annotations

import os
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.household import Household
from app.models.member import Member

SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")
AUTH_HEADERS = {"Authorization": f"Bearer {SEED_TOKEN}"}


def _seeded_member(db: Session) -> Member:
    m = db.scalar(select(Member).where(Member.auth_token == SEED_TOKEN).limit(1))
    assert m is not None, (
        f"seed Postgres has no member with auth_token={SEED_TOKEN!r} — "
        f"run `uv run seed`?"
    )
    return m


def test_exports_happy_path(client: TestClient, db_session: Session) -> None:
    """ROUT-04 happy path — authenticated GET returns 200 with correct headers.

    Asserts:
    * Status 200.
    * Content-Disposition header contains 'attachment'.
    * Body parses as JSON with top-level 'recipes' key.
    """
    member = _seeded_member(db_session)
    resp = client.get(
        f"/households/{member.household_id}/export.json",
        headers=AUTH_HEADERS,
    )
    assert resp.status_code == 200, resp.text

    content_disp = resp.headers.get("content-disposition", "")
    assert "attachment" in content_disp, (
        f"Expected Content-Disposition: attachment, got: {content_disp!r}"
    )

    body = resp.json()
    assert "recipes" in body, f"Expected 'recipes' key in body, got: {list(body.keys())}"
    assert isinstance(body["recipes"], list), (
        f"Expected 'recipes' to be a list, got {type(body['recipes'])}"
    )


def test_exports_401_missing_auth(client: TestClient, db_session: Session) -> None:
    """ROUT-04 — GET without auth headers returns 401.

    Uses a seeded household_id so the 401 fires before the household check.
    """
    member = _seeded_member(db_session)
    resp = client.get(f"/households/{member.household_id}/export.json")
    assert resp.status_code == 401, resp.text


def test_exports_404_cross_household(client: TestClient, db_session: Session) -> None:
    """ROUT-04 / D-38-02 — GET with a foreign household_id returns 404.

    Inserts a second Household via db_session.flush() (NOT commit — SAVEPOINT
    contract from 38-01 ensures rollback at teardown). The seeded member's
    auth_token does not belong to that household; the router must return 404
    (not 403) per the cross-household 404-not-403 invariant.

    # D-38-02: 404-not-403 enforcement
    """
    foreign_household = Household(
        id=uuid.uuid4(),
        name="Foreign export household",
        invite_code=f"EX{uuid.uuid4().hex[:4].upper()}",
        timezone="Europe/Paris",
    )
    db_session.add(foreign_household)
    db_session.flush()  # NOT commit — stays inside the SAVEPOINT envelope

    resp = client.get(
        f"/households/{foreign_household.id}/export.json",
        headers=AUTH_HEADERS,
    )
    # D-38-02: 404-not-403 enforcement
    assert resp.status_code == 404, resp.text


def test_exports_422_validation(client: TestClient, db_session: Session) -> None:
    """ROUT-04 — malformed (non-UUID) household_id in path returns 422.

    FastAPI coerces the path param to UUID before the handler runs.
    A non-UUID string triggers a 422 Unprocessable Entity from Pydantic
    validation before any auth or DB access occurs.
    """
    resp = client.get(
        "/households/not-a-valid-uuid/export.json",
        headers=AUTH_HEADERS,
    )
    assert resp.status_code == 422, resp.text
