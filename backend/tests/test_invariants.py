"""Cross-cutting invariant regression tests (CLAUDE.md §Architecture invariants).

This file is the canonical home for tests that guard the architecture
invariants listed in CLAUDE.md — tests that don't fit cleanly under any one
router/service module because they exercise the *contract between modules*.

Current coverage:
- Invariant #5 (raw inputs preserved forever — turn-0 immutability) through
  the Phase 42 STEP-03 lazy-backfill BackgroundTask.
"""

from __future__ import annotations

import asyncio
import copy
import os
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.member import Member
from app.models.recipe import Recipe
from app.models.recipe_turn import RecipeTurn

SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")


def _seeded_member(db: Session) -> Member:
    m = db.scalar(select(Member).where(Member.auth_token == SEED_TOKEN).limit(1))
    assert m is not None, (
        f"seed Postgres has no member with auth_token={SEED_TOKEN!r} — run `uv run seed`?"
    )
    return m


def _make_recipe(db: Session, household_id: uuid.UUID, member_id: uuid.UUID) -> Recipe:
    r = Recipe(
        household_id=household_id,
        created_by_member_id=member_id,
        status="structured",
        title="Risotto invariant test",
        ingredients=[{"name": "riz arborio", "quantity": 300.0, "unit": "g"}],
        steps=[],
        photo_paths=[],
        mood=[],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
        manually_edited_fields=[],
    )
    db.add(r)
    db.flush()
    return r


def test_extract_and_persist_steps_preserves_turn_zero_payload(
    db_session: Session, monkeypatch
) -> None:
    """Invariant #5 — raw inputs in recipe_turns are immutable.

    Phase 42 STEP-03 backfill reads turn-0 to feed Gemini, but MUST NOT
    mutate it. This regression test asserts the turn-0 payload is
    byte-identical before and after `extract_and_persist_steps` runs.
    """

    from app.services import llm as llm_module
    from app.services.llm import extract_and_persist_steps

    # Replace broadcast (async coroutine) with a no-op stub; routing the
    # BackgroundTask's SessionLocal to the per-test session via a no-close
    # wrapper so the test rollback contract is preserved.
    async def _noop_broadcast(*args, **kwargs):
        return None

    monkeypatch.setattr(llm_module, "broadcast_to_household", _noop_broadcast)

    class _NoCloseWrapper:
        def close(self) -> None:
            pass

        def __getattr__(self, name: str):
            return getattr(db_session, name)

    monkeypatch.setattr(llm_module, "SessionLocal", lambda: _NoCloseWrapper())

    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    turn_zero = RecipeTurn(
        recipe_id=recipe.id,
        position=0,
        sender="user",
        kind="voice",
        payload={"transcript": "Risotto aux champignons avec 200g de riz arborio"},
    )
    db_session.add(turn_zero)
    db_session.commit()

    payload_before = copy.deepcopy(turn_zero.payload)

    asyncio.run(
        extract_and_persist_steps(
            recipe_id=recipe.id,
            household_id=member.household_id,
        )
    )
    db_session.expire(turn_zero)

    assert turn_zero.payload == payload_before, (
        f"Invariant #5 violated: turn-0 payload mutated.\n"
        f"Before: {payload_before}\n"
        f"After: {turn_zero.payload}"
    )
    # Confirm steps DID change (otherwise the test wasn't actually exercising
    # the backfill path).
    db_session.refresh(recipe)
    assert len(recipe.steps) > 0, "Backfill did not populate steps (test setup error)"
    # And the persisted steps must be structured StepEntry dicts.
    for entry in recipe.steps:
        assert isinstance(entry, dict)
        assert "text" in entry and isinstance(entry["text"], str) and entry["text"]
        assert "ingredient_refs" in entry and isinstance(entry["ingredient_refs"], list)
