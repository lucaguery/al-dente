"""4-test endpoint contract for routers/cooking_logs.py — closes ROUT-08.

Tests:
1. happy_path  — GET /cooking-logs/active returns 200 (or null when no active log).
2. 401_missing_auth — same request with no auth header returns 401.
3. 404_cross_household — GET /cooking-logs/{id} for a log belonging to a foreign
   household returns 404 (D-38-02: 404-not-403 enforcement).
4. 422_validation — PUT /cooking-logs/{id} with a bad UUID path param returns 422.

Auth convention: SEED_TOKEN Bearer header (same as test_cooking_logs.py).
Cross-household pattern: insert a foreign Household + Member + CookingLog via
  db_session.flush() (NOT commit — per 38-01 SAVEPOINT contract). Then hit
  GET /cooking-logs/{foreign_log_id} with SEED_TOKEN auth → 404.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.cooking_log import CookingLog
from app.models.household import Household
from app.models.member import Member
from app.models.recipe import Recipe

SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")
AUTH_HEADERS = {"Authorization": f"Bearer {SEED_TOKEN}"}


def _seeded_member(db: Session) -> Member:
    """Resolve the seeded test member (auth_token == SEED_TOKEN)."""
    m = db.scalar(select(Member).where(Member.auth_token == SEED_TOKEN).limit(1))
    assert m is not None, (
        f"seed Postgres has no member with auth_token={SEED_TOKEN!r} — "
        f"run `uv run seed`?"
    )
    return m


def test_cooking_logs_happy_path(client: TestClient, db_session: Session) -> None:
    """ROUT-08 happy path — GET /cooking-logs/active returns 200.

    The response is either null (no active session today) or a CookingLogResponse.
    Both are valid per the COOK-02 contract.
    """
    resp = client.get("/cooking-logs/active", headers=AUTH_HEADERS)
    assert resp.status_code == 200, resp.text
    # May return null (no active log today) — that's the happy path too.
    assert resp.json() is None or isinstance(resp.json(), dict)


def test_cooking_logs_401_missing_auth(client: TestClient, db_session: Session) -> None:
    """ROUT-08 — GET /cooking-logs/active with no Authorization header returns 401."""
    resp = client.get("/cooking-logs/active")
    assert resp.status_code == 401, resp.text


def test_cooking_logs_404_cross_household(
    client: TestClient, db_session: Session
) -> None:
    """ROUT-08 / D-38-02 — GET /cooking-logs/{id} for a foreign household's log
    returns 404 (not 403 — no existence leak per T-04-01-03).

    Inserts a foreign Household + Member + Recipe + CookingLog via
    db_session.flush() (NOT commit). The SEED_TOKEN member is not part of
    that household, so the log is cross-household.

    D-38-02: 404-not-403 enforcement.
    """
    member = _seeded_member(db_session)

    # Create a foreign household (NOT the seeded one).
    foreign_hh = Household(
        name=f"Foreign-{uuid.uuid4().hex[:8]}",
        invite_code=f"FRN{uuid.uuid4().hex[:3].upper()}",
    )
    db_session.add(foreign_hh)
    db_session.flush()

    foreign_member = Member(
        household_id=foreign_hh.id,
        name="ForeignMember",
        color_hex="#123456",
        auth_token=f"foreign-token-{uuid.uuid4().hex}",
    )
    db_session.add(foreign_member)
    db_session.flush()

    # A minimal Recipe in the foreign household (CookingLog needs a recipe_id).
    foreign_recipe = Recipe(
        household_id=foreign_hh.id,
        created_by_member_id=foreign_member.id,
        status="structured",
        title="Foreign Recipe",
        photo_paths=[],
        mood=[],
        seasonality=[],
        tags=[],
    )
    db_session.add(foreign_recipe)
    db_session.flush()

    # A CookingLog in the foreign household.
    foreign_log = CookingLog(
        recipe_id=foreign_recipe.id,
        household_id=foreign_hh.id,
        cooked_by_member_id=foreign_member.id,
        cooked_at=datetime.now(timezone.utc),
    )
    db_session.add(foreign_log)
    db_session.flush()

    # SEED_TOKEN member hits the foreign log — must return 404.
    resp = client.get(
        f"/cooking-logs/{foreign_log.id}",
        headers=AUTH_HEADERS,
    )
    # D-38-02: 404-not-403 enforcement
    assert resp.status_code == 404, resp.text


def test_cooking_logs_422_validation(client: TestClient, db_session: Session) -> None:
    """ROUT-08 — GET /cooking-logs/{id} with a non-UUID path parameter returns 422.

    FastAPI validates UUID path params before the handler runs — a bad UUID
    string short-circuits to 422 (Unprocessable Entity).
    """
    resp = client.get("/cooking-logs/not-a-valid-uuid", headers=AUTH_HEADERS)
    assert resp.status_code == 422, resp.text
