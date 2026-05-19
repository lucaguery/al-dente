"""4-test endpoint contract for routers/shortlist.py — closes ROUT-06.

Primary endpoint under test: GET /shortlists/today

Tests:
1. happy_path  — GET /shortlists/today returns 200 (null or ShortlistResponse).
2. 401_missing_auth — same request with no auth header returns 401.
3. 404_cross_household — POST /shortlists/{shortlist_id}/delegate with a
   shortlist_id owned by a foreign household returns 404.
   (D-38-02: 404-not-403 enforcement — routers/shortlist.py:140 raises
   HTTPException(404, "shortlist not found") when
   shortlist.household_id != member.household_id.)
4. 422_validation — GET /shortlists/today with a bad UUID shortlist path
   returns 422. Specifically: POST /shortlists/{bad_uuid}/delegate with a
   malformed UUID returns 422 (FastAPI path-param validation fires before
   the handler).

Auth convention: SEED_TOKEN Bearer header.
Cross-household pattern: insert a foreign Household + DailyShortlist via
  db_session.flush() (NOT commit — 38-01 SAVEPOINT contract).
"""
from __future__ import annotations

import os
import uuid
from datetime import date as DateType

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.daily_shortlist import DailyShortlist
from app.models.household import Household
from app.models.member import Member
from app.models.recipe import Recipe

SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")
AUTH_HEADERS = {"Authorization": f"Bearer {SEED_TOKEN}"}


def test_shortlist_happy_path(client: TestClient, db_session: Session) -> None:
    """ROUT-06 happy path — GET /shortlists/today returns 200.

    The response may be null (no shortlist generated today) or a
    ShortlistResponse (if the cron already ran or tests created one).
    Both are valid per the SHORTLIST-01 contract.
    """
    resp = client.get("/shortlists/today", headers=AUTH_HEADERS)
    assert resp.status_code == 200, resp.text
    # May be null (no shortlist generated today) — that is valid.
    body = resp.json()
    assert body is None or isinstance(body, dict)


def test_shortlist_401_missing_auth(client: TestClient, db_session: Session) -> None:
    """ROUT-06 — GET /shortlists/today with no Authorization header returns 401."""
    resp = client.get("/shortlists/today")
    assert resp.status_code == 401, resp.text


def test_shortlist_404_cross_household(client: TestClient, db_session: Session) -> None:
    """ROUT-06 / D-38-02 — POST /shortlists/{id}/delegate on a foreign household's
    shortlist returns 404 (not 403 — T-01-08-04 pattern).

    Inserts a foreign Household + DailyShortlist via flush() (NOT commit —
    38-01 SAVEPOINT contract). The SEED_TOKEN member belongs to a different
    household, so the delegate endpoint returns 404.

    D-38-02: 404-not-403 enforcement.
    """
    # Create a foreign household.
    foreign_hh = Household(
        name=f"ShortlistForeign-{uuid.uuid4().hex[:8]}",
        invite_code=f"SLF{uuid.uuid4().hex[:3].upper()}",
    )
    db_session.add(foreign_hh)
    db_session.flush()

    foreign_member = Member(
        household_id=foreign_hh.id,
        name="ForeignShortlistMember",
        color_hex="#111222",
        auth_token=f"foreign-shortlist-token-{uuid.uuid4().hex}",
    )
    db_session.add(foreign_member)
    db_session.flush()

    foreign_recipe = Recipe(
        household_id=foreign_hh.id,
        created_by_member_id=foreign_member.id,
        status="structured",
        title="Foreign Shortlist Recipe",
        photo_paths=[],
        mood=[],
        seasonality=[],
        tags=[],
    )
    db_session.add(foreign_recipe)
    db_session.flush()

    gen = int(uuid.uuid4().int % 9000) + 1000
    foreign_shortlist = DailyShortlist(
        household_id=foreign_hh.id,
        date=DateType.today(),
        generation=gen,
        recipe_ids=[foreign_recipe.id],
    )
    db_session.add(foreign_shortlist)
    db_session.flush()

    # SEED_TOKEN member tries to delegate on the foreign shortlist.
    resp = client.post(
        f"/shortlists/{foreign_shortlist.id}/delegate",
        headers=AUTH_HEADERS,
    )
    # D-38-02: 404-not-403 enforcement
    assert resp.status_code == 404, resp.text


def test_shortlist_422_validation(client: TestClient, db_session: Session) -> None:
    """ROUT-06 — POST /shortlists/{id}/delegate with a non-UUID path param
    returns 422.

    FastAPI validates UUID path params before the handler runs — a malformed
    UUID string short-circuits to 422 (Unprocessable Entity).
    """
    resp = client.post(
        "/shortlists/not-a-valid-uuid/delegate",
        headers=AUTH_HEADERS,
    )
    assert resp.status_code == 422, resp.text
