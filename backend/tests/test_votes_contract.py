"""Endpoint contract tests for routers/votes.py.

Original 4-test POST contract — closes ROUT-07:
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

Phase 41 — UNDO-01 DELETE contract (D-10):
  DELETE /votes/{vote_id}

Tests:
5. delete_vote_happy_path — POST then DELETE; row gone; vote.deleted broadcast fired.
6. delete_vote_401_missing_auth — DELETE with no auth header returns 401.
7. delete_vote_404_cross_household — DELETE a vote owned by a foreign household
   returns 404 (NOT 403) — invariant #2 record-existence non-leak.
8. delete_vote_404_not_found — DELETE a non-existent vote_id returns 404.
9. delete_vote_409_veto_window_closed — DELETE when a CookingLog exists for the
   shortlist's date returns 409 with detail `veto_window_closed` (D-12).
10. delete_vote_broadcast_shape — broadcast payload contains exactly the five
    keys {vote_id, shortlist_id, recipe_id, member_id, shortlist_date}.

Auth convention: SEED_TOKEN Bearer header.
Cross-household pattern: insert a foreign Household + shortlist via
  db_session.flush() (NOT commit — 38-01 SAVEPOINT contract).

Architecture invariant #2: voting state is COMPUTED, never stored.
  This contract test drives the HTTP layer only; VoteState derivation
  is covered by test_voting_unit.py. DELETE preserves the invariant —
  see test_architecture_invariants.py for the no-state-column regression.
"""

from __future__ import annotations

import os
import uuid
from datetime import UTC, datetime
from datetime import date as DateType

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.cooking_log import CookingLog
from app.models.daily_shortlist import DailyShortlist
from app.models.household import Household
from app.models.member import Member
from app.models.recipe import Recipe
from app.models.vote import Vote

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


# ===========================================================================
# Phase 41 UNDO-01 — DELETE /votes/{vote_id} contract (D-10)
# ===========================================================================


def _post_vote_for_seeded_member(
    client: TestClient, db_session: Session
) -> tuple[str, DailyShortlist, Recipe, Member]:
    """Helper — POST a vote as the seeded member; return (vote_id, shortlist, recipe, member).

    Uses the same path as production: POST /shortlists/{sid}/recipes/{rid}/vote.
    Asserts the response payload contains `vote_id` (Plan 41-01 Task 1).
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
    assert "vote_id" in body, "Plan 41-01 Task 1 — POST must return vote_id"
    return body["vote_id"], shortlist, recipe, member


def test_delete_vote_happy_path(client: TestClient, db_session: Session, monkeypatch) -> None:
    """41-01 / D-07 / D-09 — POST then DELETE; row gone; vote.deleted broadcast emitted.

    Validates the full UNDO-01 round-trip:
      1. POST returns 201 with vote_id (Task 1 contract).
      2. DELETE /votes/{vote_id} returns 204.
      3. The Vote row is gone from the DB.
      4. broadcast_to_household was called with event='vote.deleted' and a
         payload carrying all five required keys.
    """
    broadcast_calls: list[dict] = []

    async def fake_broadcast(household_id, event, payload):
        broadcast_calls.append({"household_id": household_id, "event": event, "payload": payload})

    import app.routers.votes as votes_module

    monkeypatch.setattr(votes_module, "broadcast_to_household", fake_broadcast)

    vote_id, shortlist, recipe, member = _post_vote_for_seeded_member(client, db_session)

    resp = client.delete(f"/votes/{vote_id}", headers=AUTH_HEADERS)
    assert resp.status_code == 204, resp.text
    assert resp.content == b"" or resp.text == ""

    # Row is gone.
    remaining = db_session.scalar(select(Vote).where(Vote.id == uuid.UUID(vote_id)))
    assert remaining is None, "DELETE should have removed the Vote row"

    # Broadcast: vote.created (from POST) + vote.deleted (from DELETE).
    delete_calls = [c for c in broadcast_calls if c["event"] == "vote.deleted"]
    assert len(delete_calls) == 1, f"expected one vote.deleted broadcast, got {broadcast_calls}"
    payload = delete_calls[0]["payload"]
    assert payload["vote_id"] == vote_id
    assert payload["shortlist_id"] == str(shortlist.id)
    assert payload["recipe_id"] == str(recipe.id)
    assert payload["member_id"] == str(member.id)
    assert "shortlist_date" in payload


def test_delete_vote_401_missing_auth(client: TestClient, db_session: Session) -> None:
    """41-01 — DELETE /votes/{vote_id} with no Authorization header returns 401."""
    random_vote_id = uuid.uuid4()
    resp = client.delete(f"/votes/{random_vote_id}")
    assert resp.status_code == 401, resp.text


def test_delete_vote_404_cross_household(client: TestClient, db_session: Session) -> None:
    """41-01 / D-08 / T-41-01 — DELETE another household's vote returns 404 (not 403).

    Insert foreign Household + Member + Shortlist + Recipe + Vote via flush()
    (NOT commit — 38-01 SAVEPOINT). Then authenticate as SEED_TOKEN (a member
    of a different household) and DELETE the foreign vote.

    Invariant #2 — record-existence non-leak: same 404 as missing-vote so the
    attacker cannot distinguish 'does not exist' from 'belongs to another
    household'. Asserts the vote row STILL EXISTS after the refusal.
    """
    # Foreign household + member + recipe + shortlist + vote.
    foreign_hh = Household(
        name=f"Foreign-{uuid.uuid4().hex[:8]}",
        invite_code=f"FVD{uuid.uuid4().hex[:3].upper()}",
    )
    db_session.add(foreign_hh)
    db_session.flush()

    foreign_member = Member(
        household_id=foreign_hh.id,
        name="ForeignDeleter",
        color_hex="#abcdef",
        auth_token=f"foreign-delete-token-{uuid.uuid4().hex}",
    )
    db_session.add(foreign_member)
    db_session.flush()

    foreign_recipe = Recipe(
        household_id=foreign_hh.id,
        created_by_member_id=foreign_member.id,
        status="structured",
        title="Foreign Delete Recipe",
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

    foreign_vote = Vote(
        shortlist_id=foreign_shortlist.id,
        recipe_id=foreign_recipe.id,
        member_id=foreign_member.id,
        vote="yes",
    )
    db_session.add(foreign_vote)
    db_session.flush()
    foreign_vote_id = foreign_vote.id

    # SEED_TOKEN member (different household) attempts DELETE.
    resp = client.delete(f"/votes/{foreign_vote_id}", headers=AUTH_HEADERS)
    assert resp.status_code == 404, resp.text
    # No household / member id leak in the response body.
    body_text = resp.text
    assert str(foreign_hh.id) not in body_text
    assert str(foreign_member.id) not in body_text

    # Defensive — the foreign vote must still exist.
    still_there = db_session.get(Vote, foreign_vote_id)
    assert still_there is not None, "cross-household DELETE must NOT delete the row"


def test_delete_vote_404_not_found(client: TestClient, db_session: Session) -> None:
    """41-01 — DELETE /votes/{random_uuid} for a non-existent vote returns 404."""
    random_vote_id = uuid.uuid4()
    resp = client.delete(f"/votes/{random_vote_id}", headers=AUTH_HEADERS)
    assert resp.status_code == 404, resp.text


def test_delete_vote_409_veto_window_closed(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    """41-01 / D-12 — DELETE refused when a CookingLog exists for the shortlist's date.

    Defense-in-depth behind the frontend's preemptive disabled-button tooltip
    (Plan 41-04). The literal detail string must be exactly
    `veto_window_closed` so the frontend can drive the i18n key
    `shortlist.undo.locked` without parsing prose.
    """
    broadcast_calls: list[dict] = []

    async def fake_broadcast(household_id, event, payload):
        broadcast_calls.append({"event": event})

    import app.routers.votes as votes_module

    monkeypatch.setattr(votes_module, "broadcast_to_household", fake_broadcast)

    vote_id, shortlist, recipe, member = _post_vote_for_seeded_member(client, db_session)

    # Insert a CookingLog for today's shortlist date — closes the veto window.
    today = shortlist.date
    cooking_log = CookingLog(
        recipe_id=recipe.id,
        household_id=member.household_id,
        cooked_by_member_id=member.id,
        cooked_at=datetime(today.year, today.month, today.day, 19, 0, tzinfo=UTC),
    )
    db_session.add(cooking_log)
    db_session.flush()

    resp = client.delete(f"/votes/{vote_id}", headers=AUTH_HEADERS)
    assert resp.status_code == 409, resp.text
    assert resp.json()["detail"] == "veto_window_closed", resp.json()

    # Vote must STILL exist — the guard fired before the delete.
    still_there = db_session.get(Vote, uuid.UUID(vote_id))
    assert still_there is not None, "veto-window guard must fire BEFORE the row is touched"

    # No vote.deleted broadcast should have been emitted.
    assert not any(c["event"] == "vote.deleted" for c in broadcast_calls), broadcast_calls


def test_delete_vote_broadcast_shape(client: TestClient, db_session: Session, monkeypatch) -> None:
    """41-01 / D-09 — vote.deleted broadcast payload has exactly the 5 required keys.

    Schema (per CONTEXT.md <specifics>):
      {vote_id, shortlist_id, recipe_id, member_id, shortlist_date}
    All values must be JSON-serializable strings; shortlist_date must be
    ISO-8601 YYYY-MM-DD.
    """
    broadcast_calls: list[dict] = []

    async def fake_broadcast(household_id, event, payload):
        broadcast_calls.append({"event": event, "payload": payload})

    import app.routers.votes as votes_module

    monkeypatch.setattr(votes_module, "broadcast_to_household", fake_broadcast)

    vote_id, shortlist, recipe, member = _post_vote_for_seeded_member(client, db_session)
    resp = client.delete(f"/votes/{vote_id}", headers=AUTH_HEADERS)
    assert resp.status_code == 204, resp.text

    delete_calls = [c for c in broadcast_calls if c["event"] == "vote.deleted"]
    assert len(delete_calls) == 1, broadcast_calls
    payload = delete_calls[0]["payload"]

    expected_keys = {"vote_id", "shortlist_id", "recipe_id", "member_id", "shortlist_date"}
    assert set(payload.keys()) == expected_keys, (
        f"vote.deleted payload key set drift — got {set(payload.keys())}, want {expected_keys}"
    )

    # All values must be strings (JSON-serializable broadcast frame).
    for k, v in payload.items():
        assert isinstance(v, str), f"payload[{k!r}] is {type(v).__name__}, expected str"

    # shortlist_date is ISO-8601 YYYY-MM-DD.
    assert payload["shortlist_date"] == shortlist.date.isoformat()
    assert len(payload["shortlist_date"]) == 10, payload["shortlist_date"]
    assert payload["shortlist_date"][4] == "-" and payload["shortlist_date"][7] == "-"
