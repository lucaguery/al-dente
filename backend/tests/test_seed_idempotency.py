"""FIX-02 / SEED-01 — cross-day idempotency for `uv run seed`.

The seed CLI uses its own SessionLocal() and commits its own transactions,
so the conftest db_session rollback fixture does NOT clean up after it.
This test does its own DELETE pass at the end, scoped to the test household
id (_id("household", "luca")).

Requires the test DB stack to be up on port 5433 AND the env vars the seed's
`_guard_environment` checks:

    ENVIRONMENT=test
    DATABASE_URL contains 'aldente_test'

Without those, the seed sys.exits — that's the seed's own safety guard, NOT
a test bug. CI / local dev should source `.env.test` before invoking pytest.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest
from sqlalchemy import func, select, text

from app.cli import seed as seed_mod
from app.cli.seed import _id, run_test_seed
from app.db import SessionLocal
from app.models.cooking_log import CookingLog
from app.models.daily_shortlist import DailyShortlist
from app.models.recipe import Recipe
from app.models.vote import Vote

TEST_HOUSEHOLD_ID: UUID = _id("household", "luca")


def _snapshot_counts(db) -> dict[str, int]:
    """Per-table row counts scoped to the test household."""
    recipes = (
        db.scalar(select(func.count(Recipe.id)).where(Recipe.household_id == TEST_HOUSEHOLD_ID))
        or 0
    )
    cooking_logs = (
        db.scalar(
            select(func.count(CookingLog.id)).where(CookingLog.household_id == TEST_HOUSEHOLD_ID)
        )
        or 0
    )
    shortlists = (
        db.scalar(
            select(func.count(DailyShortlist.id)).where(
                DailyShortlist.household_id == TEST_HOUSEHOLD_ID
            )
        )
        or 0
    )
    # Vote has no household_id column; scope via shortlist_id -> daily_shortlists.
    votes = (
        db.scalar(
            select(func.count(Vote.id))
            .join(DailyShortlist, Vote.shortlist_id == DailyShortlist.id)
            .where(DailyShortlist.household_id == TEST_HOUSEHOLD_ID)
        )
        or 0
    )
    return {
        "recipes": int(recipes),
        "cooking_logs": int(cooking_logs),
        "shortlists": int(shortlists),
        "votes": int(votes),
    }


def _cleanup() -> None:
    """Hard-DELETE everything the seed produced for the test household.

    Order mirrors run_teardown(): votes (via shortlist join) -> cooking_logs ->
    daily_shortlists -> recipes -> members -> households. Idempotent — each
    DELETE is scoped on household_id so previously-deleted rows are no-ops.
    """
    with SessionLocal() as db:
        db.execute(
            text(
                "DELETE FROM votes WHERE shortlist_id IN ("
                "SELECT id FROM daily_shortlists WHERE household_id = :h)"
            ),
            {"h": TEST_HOUSEHOLD_ID},
        )
        db.execute(
            text("DELETE FROM cooking_logs WHERE household_id = :h"),
            {"h": TEST_HOUSEHOLD_ID},
        )
        db.execute(
            text("DELETE FROM daily_shortlists WHERE household_id = :h"),
            {"h": TEST_HOUSEHOLD_ID},
        )
        db.execute(
            text("DELETE FROM recipes WHERE household_id = :h"),
            {"h": TEST_HOUSEHOLD_ID},
        )
        db.execute(
            text("DELETE FROM members WHERE household_id = :h"),
            {"h": TEST_HOUSEHOLD_ID},
        )
        db.execute(
            text("DELETE FROM households WHERE id = :h"),
            {"h": TEST_HOUSEHOLD_ID},
        )
        db.commit()


@pytest.fixture(autouse=True)
def _cleanup_around_test():
    """Ensure a clean slate before and after — the seed merges on stable UUIDs
    but other tests may have inserted unrelated rows under the same household_id.

    38-01 fix: after teardown _cleanup(), re-seed so subsequent test files
    (e.g. test_turns.py) can find the seeded member via _seeded_member().
    Without this re-seed, _cleanup()'s direct DELETE via SessionLocal() removes
    the session-scoped _seeded_database rows permanently for the remainder of
    the pytest process, causing 14 test_turns.py failures (Category A,
    37-01-SUMMARY §Remaining Failures).
    """
    from app.cli.seed import run_test_seed

    _cleanup()
    yield
    _cleanup()
    run_test_seed()


def test_seed_cross_day_no_duplicates(monkeypatch: pytest.MonkeyPatch) -> None:
    """FIX-02 — seed re-run on a later calendar day must not insert new rows.

    Monkeypatches `seed_mod.datetime` (the symbol the seed imported at module
    top) so the second call simulates day D+1 without waiting 24h. `date.today()`
    is NOT monkeypatched — the DailyShortlist.date column legitimately tracks
    today for both runs, and the UUID no longer depends on it.
    """
    # ---- 1st run: day D ----
    day_d = datetime(2026, 6, 1, 12, 0, 0, tzinfo=UTC)

    class _FrozenDateTime(datetime):
        @classmethod
        def now(cls, tz=None):  # type: ignore[override]
            return day_d if tz is None else day_d.astimezone(tz)

    monkeypatch.setattr(seed_mod, "datetime", _FrozenDateTime)
    run_test_seed()

    with SessionLocal() as db:
        first = _snapshot_counts(db)

    # Sanity — first run produced the canonical seed shape.
    assert first["recipes"] == 21, first
    assert first["cooking_logs"] == 3, first
    assert first["shortlists"] == 1, first
    # vote_specs at seed.py:506-513 — (2 + 1 + 2 + 2 + 0) = 7 rows for the 5 states.
    assert first["votes"] == 7, first

    # ---- 2nd run: day D+1 ----
    day_d_plus_1 = day_d + timedelta(days=1)

    class _FrozenDateTimePlus1(datetime):
        @classmethod
        def now(cls, tz=None):  # type: ignore[override]
            return day_d_plus_1 if tz is None else day_d_plus_1.astimezone(tz)

    monkeypatch.setattr(seed_mod, "datetime", _FrozenDateTimePlus1)
    run_test_seed()

    with SessionLocal() as db:
        second = _snapshot_counts(db)

    # The whole point: counts must be FLAT across the day boundary.
    assert second == first, (
        f"FIX-02 regression: seed re-run on day D+1 produced different "
        f"row counts. first={first} second={second}"
    )
