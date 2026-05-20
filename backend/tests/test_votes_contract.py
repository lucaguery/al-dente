"""4-test endpoint contract for routers/votes.py — closes ROUT-07.

The votes router exposes one endpoint:
  POST /shortlists/{shortlist_id}/recipes/{recipe_id}/vote

Tests:
1. happy_path  — POST vote on an in-shortlist recipe returns 201 + VoteResponse shape.
2. 401_missing_auth — same request with no auth header returns 401.
3. 404_cross_household — POST vote on a shortlist belonging to a foreign household
   returns 404 (D-38-02: 404-not-403 enforcement — the router checks
   `shortlist.household_id != member.household_id` and raises HTTPException(404)).
4. 400_validation — POST vote on a shortlist where the recipe is NOT in
   shortlist.recipe_ids returns 400 ("recipe not in this shortlist").
   (The router uses HTTPException(400) for this case, not 422.)

Auth convention: SEED_TOKEN Bearer header.
Cross-household pattern: insert a foreign Household + shortlist via
  db_session.flush() (NOT commit — 38-01 SAVEPOINT contract).

Architecture invariant #2: voting state is COMPUTED, never stored.
  This contract test drives the HTTP layer only; VoteState derivation
  is covered by test_voting_unit.py.
"""

from __future__ import annotations

import os
import uuid
from datetime import date as DateType

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.daily_shortlist import DailyShortlist
from app.models.household import Household
from app.models.member import Member
from app.models.recipe import Recipe

SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")
AUTH_HEADERS = {"Authorization": f"Bearer {SEED_TOKEN}"}


def _seeded_member(db: Session) -> Member:
    """Resolve the seeded test member (auth_token == SEED_TOKEN)."""
    m = db.scalar(select(Member).where(Member.auth_token == SEED_TOKEN).limit(1))
    assert m is not None, (
        f"seed Postgres has no member with auth_token={SEED_TOKEN!r} — run `uv run seed`?"
    )
    return m


def _make_shortlist_with_recipe(db: Session, member: Member) -> tuple[DailyShortlist, Recipe]:
    """Create a DailyShortlist containing one Recipe for the seeded household.

    Uses a unique generation number to avoid the UNIQUE(household_id, date, generation)
    constraint if the shortlist for today already exists (e.g. from the seed or a
    prior test).

    Returns (shortlist, recipe) — both flushed into the current SAVEPOINT.
    """
    # Pick or create a recipe for this household.
    recipe = db.scalar(select(Recipe).where(Recipe.household_id == member.household_id).limit(1))
    if recipe is None:
        recipe = Recipe(
            household_id=member.household_id,
            created_by_member_id=member.id,
            status="structured",
            title="Test Recipe for Votes",
            photo_paths=[],
            mood=[],
            seasonality=[],
            tags=[],
        )
        db.add(recipe)
        db.flush()

    # Use a large generation number to avoid UNIQUE constraint collision.
    gen = int(uuid.uuid4().int % 9000) + 1000
    shortlist = DailyShortlist(
        household_id=member.household_id,
        date=DateType.today(),
        generation=gen,
        recipe_ids=[recipe.id],
    )
    db.add(shortlist)
    db.flush()

    return shortlist, recipe


def test_votes_happy_path(client: TestClient, db_session: Session) -> None:
    """ROUT-07 happy path — POST vote on an in-shortlist recipe returns 201.

    Asserts the VoteResponse shape: shortlist_id, recipe_id, member_id, vote, state.
    Architecture invariant #2: state is computed from DB rows, never stored.
    """
    member = _seeded_member(db_session)
    shortlist, recipe = _make_shortlist_with_recipe(db_session, member)

    resp = client.post(
        f"/shortlists/{shortlist.id}/recipes/{recipe.id}/vote",
        headers=AUTH_HEADERS,
        json={"vote": "yes"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["shortlist_id"] == str(shortlist.id)
    assert body["recipe_id"] == str(recipe.id)
    assert "member_id" in body
    assert body["vote"] == "yes"
    assert "state" in body  # computed — one of valide/pressenti/conteste/rejete/sans_avis


def test_votes_401_missing_auth(client: TestClient, db_session: Session) -> None:
    """ROUT-07 — POST vote with no Authorization header returns 401."""
    random_shortlist_id = uuid.uuid4()
    random_recipe_id = uuid.uuid4()
    resp = client.post(
        f"/shortlists/{random_shortlist_id}/recipes/{random_recipe_id}/vote",
        json={"vote": "yes"},
    )
    assert resp.status_code == 401, resp.text


def test_votes_404_cross_household(client: TestClient, db_session: Session) -> None:
    """ROUT-07 / D-38-02 — POST vote on a foreign household's shortlist returns 404.

    Inserts a foreign Household + Member + Shortlist via flush() (NOT commit).
    The SEED_TOKEN member is not part of that household.
    The router checks `shortlist.household_id != member.household_id` and raises
    HTTPException(404, "shortlist not found").

    D-38-02: 404-not-403 enforcement.
    """
    # Create a foreign household + shortlist.
    foreign_hh = Household(
        name=f"Foreign-{uuid.uuid4().hex[:8]}",
        invite_code=f"FVT{uuid.uuid4().hex[:3].upper()}",
    )
    db_session.add(foreign_hh)
    db_session.flush()

    foreign_member = Member(
        household_id=foreign_hh.id,
        name="ForeignVoter",
        color_hex="#abcdef",
        auth_token=f"foreign-vote-token-{uuid.uuid4().hex}",
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

    # SEED_TOKEN member votes on the foreign shortlist — must return 404.
    resp = client.post(
        f"/shortlists/{foreign_shortlist.id}/recipes/{foreign_recipe.id}/vote",
        headers=AUTH_HEADERS,
        json={"vote": "yes"},
    )
    # D-38-02: 404-not-403 enforcement
    assert resp.status_code == 404, resp.text


def test_votes_400_recipe_not_in_shortlist(client: TestClient, db_session: Session) -> None:
    """ROUT-07 — POST vote with a recipe not in shortlist.recipe_ids returns 400.

    The router raises HTTPException(400, "recipe not in this shortlist") — NOT 422.
    This is the explicit validation path (per routes/votes.py:50).
    """
    member = _seeded_member(db_session)
    shortlist, _ = _make_shortlist_with_recipe(db_session, member)

    # A recipe UUID that is NOT in shortlist.recipe_ids.
    unrelated_recipe_id = uuid.uuid4()

    resp = client.post(
        f"/shortlists/{shortlist.id}/recipes/{unrelated_recipe_id}/vote",
        headers=AUTH_HEADERS,
        json={"vote": "yes"},
    )
    assert resp.status_code == 400, resp.text
    assert "not in this shortlist" in resp.json()["detail"]
