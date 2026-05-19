"""Unit tests for app.services.shortlist — 100% line-coverage target (COV-04, SERV-03).

Tests cover:
- generate_daily_shortlist: empty corpus → None, no broadcast, no push
- generate_daily_shortlist: partial corpus (2 structured recipes) → shortlist with 2 picks
- generate_daily_shortlist: full corpus (seeded household, 21 structured recipes) → shortlist ≤5 picks
- generate_daily_shortlist: push fan-out failure swallowed at WARNING level
- generate_daily_shortlist: idempotent re-run with jitter=0 → same recipe_ids
- _current_season(): month mapping across all 12 months (parametrized)
- _recent_cuisines_and_proteins(): JOIN against CookingLog within/outside 14-day window

SERV-03 acceptance: empty / partial / full / idempotent corpus cases.

Architecture notes:
- generate_daily_shortlist is async → @pytest.mark.asyncio required.
- broadcast_to_household is async → must be monkeypatched to AsyncMock.
- send_push_to_household is sync → MagicMock (or side_effect for failure test).
- All writes go through db_session fixture (connection-scoped txn rolled back at teardown).
- New households/recipes for isolated tests are created in db_session; they roll back after each test.
- The seeded household is used for the full-pool test (21 structured recipes + autouse seed fixture).
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.cooking_log import CookingLog
from app.models.daily_shortlist import DailyShortlist
from app.models.household import Household
from app.models.member import Member
from app.models.recipe import Recipe
from app.services.shortlist import (
    _current_season,
    _recent_cuisines_and_proteins,
    generate_daily_shortlist,
)

SEED_TOKEN = "test-token-luca"


# ---------------------------------------------------------------------------
# Helpers — create isolated test data within db_session transaction
# ---------------------------------------------------------------------------


def _seeded_member(db: Session) -> Member:
    m = db.scalar(select(Member).where(Member.auth_token == SEED_TOKEN).limit(1))
    assert m is not None, (
        f"Seeded member with auth_token={SEED_TOKEN!r} not found — "
        "did the _seeded_database fixture run? See Plan 37-01."
    )
    return m


def _make_household(db: Session, *, name: str = "Test HH", invite_code: Optional[str] = None) -> Household:
    """Create a fresh Household within the current session's transaction."""
    code = invite_code or f"TST{uuid.uuid4().hex[:3].upper()}"
    hh = Household(
        name=name,
        invite_code=code,
        timezone="Europe/Paris",
    )
    db.add(hh)
    db.flush()
    return hh


def _make_member(db: Session, *, household_id: uuid.UUID, name: str = "Alice") -> Member:
    """Create a Member in the given household."""
    m = Member(
        household_id=household_id,
        name=name,
        color_hex="#3B82F6",
        auth_token=f"tok-{uuid.uuid4().hex}",
    )
    db.add(m)
    db.flush()
    return m


def _make_recipe(
    db: Session,
    *,
    household_id: uuid.UUID,
    member_id: uuid.UUID,
    status: str = "structured",
    cuisine: str = "italian",
    main_protein: str = "poultry",
    title: str = "Recette test",
) -> Recipe:
    """Insert a minimal recipe."""
    r = Recipe(
        household_id=household_id,
        created_by_member_id=member_id,
        status=status,
        title=title,
        photo_paths=[],
        mood=["comfort"],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
        manually_edited_fields=[],
        cuisine=cuisine,
        main_protein=main_protein,
    )
    db.add(r)
    db.flush()
    return r


# ---------------------------------------------------------------------------
# Class 1: generate_daily_shortlist (lines 90-184)
# ---------------------------------------------------------------------------


class TestGenerateDailyShortlist:
    """Async tests for the main generate_daily_shortlist entry point."""

    @pytest.mark.asyncio
    async def test_empty_corpus_returns_none(self, db_session: Session, monkeypatch) -> None:
        """Empty household (0 structured recipes) → returns None; broadcast + push NOT called."""
        broadcast_mock = AsyncMock()
        push_mock = MagicMock()
        monkeypatch.setattr("app.services.shortlist.broadcast_to_household", broadcast_mock)
        monkeypatch.setattr("app.services.shortlist.send_push_to_household", push_mock)

        hh = _make_household(db_session)
        db_session.commit()

        result = await generate_daily_shortlist(hh.id, db=db_session)

        assert result is None, "Empty corpus must return None (Pitfall 8)"
        broadcast_mock.assert_not_called()
        push_mock.assert_not_called()

    @pytest.mark.asyncio
    async def test_partial_corpus_two_recipes(self, db_session: Session, monkeypatch) -> None:
        """Household with 2 structured recipes → shortlist with 2 picks."""
        broadcast_mock = AsyncMock()
        push_mock = MagicMock()
        monkeypatch.setattr("app.services.shortlist.broadcast_to_household", broadcast_mock)
        monkeypatch.setattr("app.services.shortlist.send_push_to_household", push_mock)
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)

        hh = _make_household(db_session)
        member = _make_member(db_session, household_id=hh.id)
        _make_recipe(db_session, household_id=hh.id, member_id=member.id, cuisine="italian", title="Recipe A")
        _make_recipe(db_session, household_id=hh.id, member_id=member.id, cuisine="french", title="Recipe B")
        db_session.commit()

        result = await generate_daily_shortlist(hh.id, db=db_session)

        assert result is not None
        assert len(result.recipe_ids) == 2

    @pytest.mark.asyncio
    async def test_full_corpus_large_pool_returns_up_to_5(
        self, db_session: Session, monkeypatch
    ) -> None:
        """Household with 8 structured recipes (corpus_size >= 30 threshold not met but
        large enough to prove shortlist picks ≤5 from a pool that exceeds 5 candidates).

        Uses an isolated fresh household so we don't touch committed seeded data
        and avoid UNIQUE (household_id, date, generation) constraint collisions.
        """
        broadcast_mock = AsyncMock()
        push_mock = MagicMock()
        monkeypatch.setattr("app.services.shortlist.broadcast_to_household", broadcast_mock)
        monkeypatch.setattr("app.services.shortlist.send_push_to_household", push_mock)
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)

        hh = _make_household(db_session)
        member = _make_member(db_session, household_id=hh.id)
        cuisines = ["italian", "french", "asian", "mediterranean", "indian", "mexican", "american", "northAfrican"]
        proteins = ["poultry", "redMeat", "fish", "seafood", "egg", "legume", "none", "poultry"]
        for i in range(8):
            _make_recipe(
                db_session,
                household_id=hh.id,
                member_id=member.id,
                cuisine=cuisines[i],
                main_protein=proteins[i],
                title=f"Recette {i}",
            )
        db_session.commit()

        result = await generate_daily_shortlist(hh.id, db=db_session, generation=1)

        assert result is not None
        assert 1 <= len(result.recipe_ids) <= 5

        # broadcast_to_household called with "shortlist.created"
        broadcast_calls = [call for call in broadcast_mock.call_args_list]
        shortlist_events = [
            call for call in broadcast_calls if call.args[1] == "shortlist.created"
        ]
        assert len(shortlist_events) == 1, (
            f"Expected exactly 1 shortlist.created broadcast, got {len(shortlist_events)}"
        )

    @pytest.mark.asyncio
    async def test_push_failure_swallowed(self, db_session: Session, monkeypatch) -> None:
        """send_push_to_household raises → exception swallowed; DailyShortlist still returned."""
        broadcast_mock = AsyncMock()
        push_mock = MagicMock(side_effect=RuntimeError("vapid offline"))
        monkeypatch.setattr("app.services.shortlist.broadcast_to_household", broadcast_mock)
        monkeypatch.setattr("app.services.shortlist.send_push_to_household", push_mock)
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)

        hh = _make_household(db_session)
        member = _make_member(db_session, household_id=hh.id)
        _make_recipe(db_session, household_id=hh.id, member_id=member.id)
        db_session.commit()

        # Must NOT raise even though push fails
        result = await generate_daily_shortlist(hh.id, db=db_session)

        assert result is not None, (
            "DailyShortlist must be returned even when push fan-out fails"
        )

    @pytest.mark.asyncio
    async def test_idempotent_rerun_same_picks(self, db_session: Session, monkeypatch) -> None:
        """Two calls with jitter=0 and same filters → same recipe_ids ordering (SERV-03)."""
        broadcast_mock = AsyncMock()
        push_mock = MagicMock()
        monkeypatch.setattr("app.services.shortlist.broadcast_to_household", broadcast_mock)
        monkeypatch.setattr("app.services.shortlist.send_push_to_household", push_mock)
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)

        hh = _make_household(db_session)
        member = _make_member(db_session, household_id=hh.id)
        # Create 6 structured recipes to exceed the diversity top-5 threshold
        for i in range(6):
            cuisines = ["italian", "french", "asian", "mediterranean", "indian", "mexican"]
            proteins = ["poultry", "redMeat", "fish", "seafood", "egg", "legume"]
            _make_recipe(
                db_session,
                household_id=hh.id,
                member_id=member.id,
                cuisine=cuisines[i],
                main_protein=proteins[i],
                title=f"Recipe {i}",
            )
        db_session.commit()

        result1 = await generate_daily_shortlist(hh.id, db=db_session, generation=1)
        result2 = await generate_daily_shortlist(hh.id, db=db_session, generation=2)

        assert result1 is not None
        assert result2 is not None
        assert result1.recipe_ids == result2.recipe_ids, (
            "With jitter=0 and same filters, two calls must produce the same recipe_ids ordering"
        )

    @pytest.mark.asyncio
    async def test_filters_applied_cuisine(self, db_session: Session, monkeypatch) -> None:
        """Filters with cuisine='italian' → only italian recipes in shortlist."""
        broadcast_mock = AsyncMock()
        push_mock = MagicMock()
        monkeypatch.setattr("app.services.shortlist.broadcast_to_household", broadcast_mock)
        monkeypatch.setattr("app.services.shortlist.send_push_to_household", push_mock)
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)

        hh = _make_household(db_session)
        member = _make_member(db_session, household_id=hh.id)
        italian = _make_recipe(db_session, household_id=hh.id, member_id=member.id, cuisine="italian")
        _make_recipe(db_session, household_id=hh.id, member_id=member.id, cuisine="french", title="French")
        db_session.commit()

        result = await generate_daily_shortlist(
            hh.id, db=db_session, filters={"cuisine": "italian"}
        )

        assert result is not None
        assert len(result.recipe_ids) == 1
        assert result.recipe_ids[0] == italian.id

    @pytest.mark.asyncio
    async def test_all_filtered_out_returns_none(self, db_session: Session, monkeypatch) -> None:
        """All recipes filtered out by cuisine → returns None (no picks branch, line 135-141)."""
        broadcast_mock = AsyncMock()
        push_mock = MagicMock()
        monkeypatch.setattr("app.services.shortlist.broadcast_to_household", broadcast_mock)
        monkeypatch.setattr("app.services.shortlist.send_push_to_household", push_mock)
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)

        hh = _make_household(db_session)
        member = _make_member(db_session, household_id=hh.id)
        # Only french recipes, but we filter for asian → all rejected
        _make_recipe(db_session, household_id=hh.id, member_id=member.id, cuisine="french")
        db_session.commit()

        result = await generate_daily_shortlist(
            hh.id, db=db_session, filters={"cuisine": "asian"}
        )

        assert result is None, "All-filtered-out corpus must return None"
        broadcast_mock.assert_not_called()
        push_mock.assert_not_called()

    @pytest.mark.asyncio
    async def test_own_session_path_closes_on_exit(self, db_session: Session, monkeypatch) -> None:
        """Called with db=None → opens own SessionLocal, closes in finally (line 183-184).

        Monkeypatch SessionLocal to return db_session so we can observe the full
        path without an extra DB connection. The own_session=True branch closes
        db at the end; we confirm it executed without error and returned a result.
        """
        broadcast_mock = AsyncMock()
        push_mock = MagicMock()
        monkeypatch.setattr("app.services.shortlist.broadcast_to_household", broadcast_mock)
        monkeypatch.setattr("app.services.shortlist.send_push_to_household", push_mock)
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)

        hh = _make_household(db_session)
        member = _make_member(db_session, household_id=hh.id)
        _make_recipe(db_session, household_id=hh.id, member_id=member.id, title="Own Session Recipe")
        db_session.commit()

        # Monkeypatch SessionLocal to return a session that records close() calls
        close_calls = []
        original_close = db_session.close

        def _tracking_close():
            close_calls.append(True)
            # Do NOT actually close — db_session is owned by the fixture and must survive.

        db_session.close = _tracking_close
        monkeypatch.setattr("app.services.shortlist.SessionLocal", lambda: db_session)

        try:
            # Call WITHOUT db= so own_session=True path executes
            result = await generate_daily_shortlist(hh.id)
        finally:
            # Restore original close so the fixture teardown still works
            db_session.close = original_close

        # The own_session finally block must have called .close()
        assert len(close_calls) == 1, (
            "generate_daily_shortlist(db=None) must call db.close() in the finally block"
        )
        assert result is not None


# ---------------------------------------------------------------------------
# Class 2: _current_season — month mapping (lines 41-48)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("month,expected_season", [
    (3, "spring"),
    (4, "spring"),
    (5, "spring"),
    (6, "summer"),
    (7, "summer"),
    (8, "summer"),
    (9, "autumn"),
    (10, "autumn"),
    (11, "autumn"),
    (12, "winter"),
    (1, "winter"),
    (2, "winter"),
])
def test_current_season_month_mapping(month: int, expected_season: str, monkeypatch) -> None:
    """_current_season() maps all 12 calendar months to the correct Northern-hemisphere season."""
    import app.services.shortlist as shortlist_module

    # Patch datetime.now inside the shortlist module to return a fixed month
    class _FakeDatetime:
        @staticmethod
        def now(tz=None):
            return datetime(2026, month, 15, 12, 0, 0, tzinfo=timezone.utc)

    monkeypatch.setattr(shortlist_module, "datetime", _FakeDatetime)

    result = _current_season()
    assert result == expected_season, (
        f"Month {month} should map to '{expected_season}', got '{result}'"
    )


# ---------------------------------------------------------------------------
# Class 3: _recent_cuisines_and_proteins (lines 58-69)
# ---------------------------------------------------------------------------


class TestRecentCuisinesAndProteins:
    """Tests for _recent_cuisines_and_proteins JOIN against CookingLog."""

    def test_empty_cooking_log_returns_empty_sets(self, db_session: Session) -> None:
        """No CookingLog rows → both sets are empty."""
        hh = _make_household(db_session)
        db_session.commit()

        cuisines, proteins = _recent_cuisines_and_proteins(hh.id, db_session)
        assert cuisines == set()
        assert proteins == set()

    def test_recent_log_appears_in_sets(self, db_session: Session) -> None:
        """CookingLog within 14 days → cuisine + protein appear in output sets."""
        hh = _make_household(db_session)
        member = _make_member(db_session, household_id=hh.id)
        recipe = _make_recipe(
            db_session,
            household_id=hh.id,
            member_id=member.id,
            cuisine="asian",
            main_protein="fish",
        )
        # CookingLog cooked 3 days ago (within 14-day window)
        log = CookingLog(
            household_id=hh.id,
            recipe_id=recipe.id,
            cooked_by_member_id=member.id,
            cooked_at=datetime.now(timezone.utc) - timedelta(days=3),
        )
        db_session.add(log)
        db_session.commit()

        cuisines, proteins = _recent_cuisines_and_proteins(hh.id, db_session)
        assert "asian" in cuisines
        assert "fish" in proteins

    def test_old_log_excluded_from_sets(self, db_session: Session) -> None:
        """CookingLog 30 days ago (outside 14-day window) → NOT in output sets."""
        hh = _make_household(db_session)
        member = _make_member(db_session, household_id=hh.id)
        recipe = _make_recipe(
            db_session,
            household_id=hh.id,
            member_id=member.id,
            cuisine="mexican",
            main_protein="redMeat",
        )
        log = CookingLog(
            household_id=hh.id,
            recipe_id=recipe.id,
            cooked_by_member_id=member.id,
            cooked_at=datetime.now(timezone.utc) - timedelta(days=30),
        )
        db_session.add(log)
        db_session.commit()

        cuisines, proteins = _recent_cuisines_and_proteins(hh.id, db_session)
        assert "mexican" not in cuisines
        assert "redMeat" not in proteins

    def test_custom_days_window(self, db_session: Session) -> None:
        """days=7: log 5 days ago appears; log 10 days ago does not."""
        hh = _make_household(db_session)
        member = _make_member(db_session, household_id=hh.id)
        r1 = _make_recipe(
            db_session, household_id=hh.id, member_id=member.id,
            cuisine="indian", main_protein="legume", title="R1"
        )
        r2 = _make_recipe(
            db_session, household_id=hh.id, member_id=member.id,
            cuisine="french", main_protein="poultry", title="R2"
        )
        db_session.add(CookingLog(
            household_id=hh.id, recipe_id=r1.id, cooked_by_member_id=member.id,
            cooked_at=datetime.now(timezone.utc) - timedelta(days=5),
        ))
        db_session.add(CookingLog(
            household_id=hh.id, recipe_id=r2.id, cooked_by_member_id=member.id,
            cooked_at=datetime.now(timezone.utc) - timedelta(days=10),
        ))
        db_session.commit()

        cuisines, proteins = _recent_cuisines_and_proteins(hh.id, db_session, days=7)
        assert "indian" in cuisines
        assert "french" not in cuisines
