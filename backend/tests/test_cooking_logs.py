"""Regression tests for backend.app.routers.cooking_logs.

Phase 15 INV-02 / ASSESSMENT B-4: two concurrent finalize PUTs must result
in cook_count incrementing exactly once. The atomic-UPDATE-with-rowcount
gate in finalize_cooking_log encodes the check at the DB layer; this test
proves it under simulated concurrency via httpx.AsyncClient + asyncio.gather
(15-RESEARCH §Pattern 3).

Per 15-RESEARCH §Pitfall 2: DO NOT assert on WebSocket broadcast ordering.
The race observable is the DB state — cook_count == start + 1, both
responses identical. Broadcast-tap inspection is out of scope.
"""

from __future__ import annotations

import asyncio
import os
import uuid
from datetime import UTC, datetime
from uuid import UUID

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.main import app
from app.models.cooking_log import CookingLog
from app.models.member import Member
from app.models.recipe import Recipe

# Mirrors frontend/playwright.config.ts SEED_AUTH_TOKEN — the seeded
# household's Bearer (the existing E2E specs use the same fallback path).
SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")
AUTH_HEADERS = {"Authorization": f"Bearer {SEED_TOKEN}"}


def _make_unfinalized_log(db: Session) -> tuple[UUID, UUID, int]:
    """Create a fresh CookingLog with rating=NULL against a seeded recipe.

    Returns (log_id, recipe_id, recipe_cook_count_at_start).

    The seeded DB has at least one recipe with no unfinalized log; we
    create a new log on it. The `db_session` fixture rolls back at
    teardown so this insert is undone.
    """
    member = db.scalar(select(Member).where(Member.auth_token == SEED_TOKEN).limit(1))
    assert member is not None, (
        f"seed Postgres has no member with auth_token={SEED_TOKEN!r} — run `uv run seed`?"
    )
    # Pick a recipe that belongs to this household. cook_count snapshot
    # captures the pre-test value so the assertion is N+1 rather than ==1.
    recipe = db.scalar(select(Recipe).where(Recipe.household_id == member.household_id).limit(1))
    assert recipe is not None, "seed Postgres has no recipes — run `uv run seed`?"
    start_cook_count = recipe.cook_count

    # If any unfinalized log exists for today, finalize it first so our new
    # log is the unique active one (mirrors the test E2E drain loop in
    # cooking-log-create-finalize.spec.ts).
    existing = db.scalar(
        select(CookingLog).where(
            CookingLog.household_id == member.household_id,
            CookingLog.rating.is_(None),
        )
    )
    if existing is not None:
        existing.rating = "disliked"
        existing.notes = "drained by test_cooking_logs.py setup"
        db.commit()

    log = CookingLog(
        id=uuid.uuid4(),
        recipe_id=recipe.id,
        household_id=member.household_id,
        cooked_by_member_id=member.id,
        cooked_at=datetime.now(UTC),
        photo_paths=[],
    )
    db.add(log)
    db.commit()
    return log.id, recipe.id, start_cook_count


@pytest.fixture
def unfinalized_log(db_session: Session) -> tuple[UUID, UUID, int]:
    return _make_unfinalized_log(db_session)


@pytest.fixture
def app_with_db_override(db_session: Session):
    """Override get_db for the AsyncClient path — TestClient's `client`
    fixture already does this, but AsyncClient uses ASGITransport directly
    so we set the override on `app` for the duration of the test.

    Pitfall 5: clear the override in `finally` even if a test raises.
    """

    def _override():
        yield db_session

    app.dependency_overrides[get_db] = _override
    try:
        yield app
    finally:
        app.dependency_overrides.pop(get_db, None)


async def test_finalize_idempotent_concurrent(
    app_with_db_override,
    unfinalized_log,
    db_session: Session,
):
    """B-4 regression — two concurrent PUTs must yield cook_count == start + 1.

    The atomic UPDATE-with-rowcount gate in finalize_cooking_log serializes
    the contenders at the Postgres layer: only one PUT's UPDATE matches
    `rating IS NULL`, the loser's UPDATE matches zero rows, both responses
    return the canonical persisted state.
    """
    log_id, recipe_id, start_cook_count = unfinalized_log

    body = {"rating": "liked", "notes": "concurrent finalize", "photo_paths": []}

    async with AsyncClient(
        transport=ASGITransport(app=app_with_db_override),
        base_url="http://test",
    ) as ac:
        responses = await asyncio.gather(
            ac.put(f"/cooking-logs/{log_id}", json=body, headers=AUTH_HEADERS),
            ac.put(f"/cooking-logs/{log_id}", json=body, headers=AUTH_HEADERS),
        )

    # Both must return 200 with identical canonical bodies.
    assert responses[0].status_code == 200, responses[0].text
    assert responses[1].status_code == 200, responses[1].text
    assert responses[0].json() == responses[1].json()

    # Re-read recipe — cook_count must have incremented exactly once.
    db_session.expire_all()  # bust the ORM cache; the UPDATE went around it
    recipe = db_session.get(Recipe, recipe_id)
    assert recipe is not None
    assert recipe.cook_count == start_cook_count + 1, (
        f"cook_count race not closed: start={start_cook_count}, "
        f"after two concurrent PUTs={recipe.cook_count}"
    )
    assert recipe.last_cooked_at is not None


async def test_finalize_first_time_increments_cook_count(
    app_with_db_override,
    unfinalized_log,
    db_session: Session,
):
    """Happy-path canary: a single (non-concurrent) PUT increments cook_count."""
    log_id, recipe_id, start_cook_count = unfinalized_log

    body = {"rating": "liked", "notes": "first finalize", "photo_paths": []}

    async with AsyncClient(
        transport=ASGITransport(app=app_with_db_override),
        base_url="http://test",
    ) as ac:
        resp = await ac.put(f"/cooking-logs/{log_id}", json=body, headers=AUTH_HEADERS)

    assert resp.status_code == 200, resp.text
    db_session.expire_all()
    recipe = db_session.get(Recipe, recipe_id)
    assert recipe is not None
    assert recipe.cook_count == start_cook_count + 1
    assert recipe.last_cooked_at is not None


async def test_finalize_cross_household_returns_404(
    app_with_db_override,
    db_session: Session,
):
    """T-04-01-03 — the SELECT-first ordering preserves the cross-household
    404 contract that the rewrite must not regress.

    A log_id that does not exist for ANY household returns 404 from Step 1
    of finalize_cooking_log — never reaches the atomic UPDATE.
    """
    random_log_id = uuid.uuid4()
    body = {"rating": "liked", "notes": "x", "photo_paths": []}

    async with AsyncClient(
        transport=ASGITransport(app=app_with_db_override),
        base_url="http://test",
    ) as ac:
        resp = await ac.put(
            f"/cooking-logs/{random_log_id}",
            json=body,
            headers=AUTH_HEADERS,
        )

    assert resp.status_code == 404
