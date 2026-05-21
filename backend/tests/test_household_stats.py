"""4-test endpoint contract for GET /households/{id}/stats — Phase 40 PROF-01.

Tests (D-04, D-05):

1. ``test_stats_happy_path`` — authenticated member of household H gets 200 with
   filtered counts: 2 structured recipes + 1 draft → recipes_count=2; 1 finalized
   (rating IS NOT NULL) + 1 in-progress (rating IS NULL) cooking_log →
   cooking_logs_count=1; 3 votes from members of H → votes_count=3.

2. ``test_stats_requires_auth`` — request with no Authorization header → 401.

3. ``test_stats_cross_household_returns_404`` — member of household A requesting
   household B's stats returns 404 (NOT 403) per invariant #4. Response body
   does not leak B's id.

4. ``test_stats_schema_shape`` — response JSON has exactly the three keys
   {recipes_count, cooking_logs_count, votes_count}, all ints. No extra fields.

Auth convention: SEED_TOKEN Bearer header (same as test_households_contract.py).
Per 38-01 SAVEPOINT contract: inserts use db_session.flush() or commit() inside
the rolled-back outer transaction — teardown undoes everything.
"""

from __future__ import annotations

import os
import uuid
from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.colors import MEMBER_COLORS
from app.models.cooking_log import CookingLog, LogRating
from app.models.daily_shortlist import DailyShortlist
from app.models.household import Household
from app.models.member import Member
from app.models.recipe import Recipe, RecipeStatus
from app.models.vote import Vote, VoteValue

SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")
AUTH_HEADERS = {"Authorization": f"Bearer {SEED_TOKEN}"}


def _seeded_member(db: Session) -> Member:
    """Resolve the seeded test member (auth_token == SEED_TOKEN)."""
    m = db.scalar(select(Member).where(Member.auth_token == SEED_TOKEN).limit(1))
    assert m is not None, (
        f"seed Postgres has no member with auth_token={SEED_TOKEN!r} — run `uv run seed`?"
    )
    return m


def _make_foreign_household(db: Session) -> tuple[Household, Member]:
    """Insert a foreign household + a member inside the rolled-back transaction.

    Returns (household, member). Uses commit() inside the SAVEPOINT envelope so
    the rows are visible to the TestClient's overridden session, and rolls back
    at fixture teardown per the 38-01 SAVEPOINT pattern.
    """
    foreign = Household(
        name=f"foreign-{uuid.uuid4().hex[:6]}",
        invite_code=f"XF{uuid.uuid4().hex[:4].upper()}",
    )
    db.add(foreign)
    db.flush()
    foreign_member = Member(
        household_id=foreign.id,
        name=f"ForeignMember-{uuid.uuid4().hex[:6]}",
        color_hex=MEMBER_COLORS[0],
        auth_token=f"test-token-foreign-{uuid.uuid4().hex[:8]}",
    )
    db.add(foreign_member)
    db.commit()
    db.refresh(foreign)
    db.refresh(foreign_member)
    return foreign, foreign_member


def test_stats_happy_path(client: TestClient, db_session: Session) -> None:
    """D-05 — counts respect the filtered definitions.

    Inserts inside the rolled-back transaction:
    - 2 structured recipes + 1 draft → recipes_count must increase by 2 (drafts excluded).
    - 1 finalized cooking_log (rating IS NOT NULL) + 1 in-progress (rating IS NULL)
      → cooking_logs_count must increase by 1.
    - 3 votes from a seeded member → votes_count must increase by 3.

    Uses delta assertions against pre-insert counts so the test does not
    depend on the seed's baseline counts (which can shift if the seeder grows).
    """
    caller = _seeded_member(db_session)
    household_id = caller.household_id

    # Snapshot pre-insert counts via the endpoint itself (round-trips through
    # the same query path, so any drift would surface symmetrically).
    pre_resp = client.get(f"/households/{household_id}/stats", headers=AUTH_HEADERS)
    assert pre_resp.status_code == 200, pre_resp.text
    pre = pre_resp.json()

    # Seed a daily_shortlist row so the FK on votes.shortlist_id is satisfied.
    # Use a high generation number to avoid colliding with any seeded shortlist
    # for today (UNIQUE(household_id, date, generation) constraint).
    shortlist = DailyShortlist(
        household_id=household_id,
        date=datetime.now(UTC).date(),
        generation=9999,
        recipe_ids=[],
    )
    db_session.add(shortlist)
    db_session.flush()

    # 2 structured + 1 draft recipe.
    structured_a = Recipe(
        household_id=household_id,
        created_by_member_id=caller.id,
        title=f"Stats-Structured-A-{uuid.uuid4().hex[:6]}",
        status=RecipeStatus.structured,
    )
    structured_b = Recipe(
        household_id=household_id,
        created_by_member_id=caller.id,
        title=f"Stats-Structured-B-{uuid.uuid4().hex[:6]}",
        status=RecipeStatus.structured,
    )
    draft = Recipe(
        household_id=household_id,
        created_by_member_id=caller.id,
        title=f"Stats-Draft-{uuid.uuid4().hex[:6]}",
        status=RecipeStatus.draft,
    )
    db_session.add_all([structured_a, structured_b, draft])
    db_session.flush()

    # 1 finalized cooking_log (rating="loved") + 1 in-progress (rating=None).
    finalized_log = CookingLog(
        household_id=household_id,
        recipe_id=structured_a.id,
        cooked_by_member_id=caller.id,
        cooked_at=datetime.now(UTC),
        rating=LogRating.loved,
    )
    in_progress_log = CookingLog(
        household_id=household_id,
        recipe_id=structured_b.id,
        cooked_by_member_id=caller.id,
        cooked_at=datetime.now(UTC),
        rating=None,
    )
    db_session.add_all([finalized_log, in_progress_log])
    db_session.flush()

    # 3 votes from the caller — one per recipe to respect the unique constraint
    # on (shortlist_id, recipe_id, member_id). Cast a third vote on the draft
    # so we still get 3 votes_count rows (votes are unfiltered per D-05).
    for recipe in (structured_a, structured_b, draft):
        db_session.add(
            Vote(
                shortlist_id=shortlist.id,
                recipe_id=recipe.id,
                member_id=caller.id,
                vote=VoteValue.yes,
            )
        )
    db_session.commit()

    resp = client.get(f"/households/{household_id}/stats", headers=AUTH_HEADERS)
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert body["recipes_count"] == pre["recipes_count"] + 2, (
        f"expected +2 structured (drafts excluded); got {body['recipes_count']} from {pre['recipes_count']}"
    )
    assert body["cooking_logs_count"] == pre["cooking_logs_count"] + 1, (
        f"expected +1 finalized (in-progress excluded); got {body['cooking_logs_count']} from {pre['cooking_logs_count']}"
    )
    assert body["votes_count"] == pre["votes_count"] + 3, (
        f"expected +3 votes; got {body['votes_count']} from {pre['votes_count']}"
    )


def test_stats_requires_auth(client: TestClient, db_session: Session) -> None:
    """No Authorization header → 401."""
    caller = _seeded_member(db_session)
    resp = client.get(f"/households/{caller.household_id}/stats")
    assert resp.status_code == 401, resp.text


def test_stats_cross_household_returns_404(client: TestClient, db_session: Session) -> None:
    """Member of household A requesting household B's stats returns 404 (not 403).

    Invariant #4: 404 hides whether the household exists, preventing existence
    probing of foreign UUIDs. Response body must not leak B's id.
    """
    foreign, _ = _make_foreign_household(db_session)

    resp = client.get(f"/households/{foreign.id}/stats", headers=AUTH_HEADERS)
    assert resp.status_code == 404, resp.text
    body_text = resp.text
    assert str(foreign.id) not in body_text, (
        f"response body leaks foreign household id: {body_text}"
    )


def test_stats_schema_shape(client: TestClient, db_session: Session) -> None:
    """Response JSON has exactly {recipes_count, cooking_logs_count, votes_count}, all ints."""
    caller = _seeded_member(db_session)
    resp = client.get(f"/households/{caller.household_id}/stats", headers=AUTH_HEADERS)
    assert resp.status_code == 200, resp.text
    body = resp.json()

    expected_keys = {"recipes_count", "cooking_logs_count", "votes_count"}
    assert set(body.keys()) == expected_keys, (
        f"unexpected keys: extra={set(body.keys()) - expected_keys}, missing={expected_keys - set(body.keys())}"
    )
    for key in expected_keys:
        assert isinstance(body[key], int), f"{key} is {type(body[key]).__name__}, expected int"
