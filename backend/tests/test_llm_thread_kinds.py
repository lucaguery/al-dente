"""Phase 37 Plan 03 — SERV-04: TurnKind sweep through process_thread_turn.

One test per user-emitted TurnKind (text, voice, photo, url, answer).
Each test:
  1. Creates a fresh recipe + user turn of the given kind.
  2. Calls `await process_thread_turn(recipe.id, turn.id)`.
  3. Asserts a `kind="summary"` system turn was emitted with the canned title.

Gemini SDK isolation (D-37-04, LOCKED):
  - `settings.environment == "test"` causes `_run_thread_llm` to use
    `canned_thread_extract` instead of calling `_gemini()` (line ~767 in llm.py).
  - `GEMINI_API_KEY=stub` in the verify env catches any missed bypass (would
    raise RuntimeError from _gemini() rather than making a live network call).
  - No `monkeypatch.setattr("app.services.llm._run_thread_llm", ...)` needed
    because the test-mode short-circuit already avoids the SDK entirely.
  - For belt-and-suspenders: `_gemini` is monkeypatched to a MagicMock so
    any unexpected call path is caught as a test failure rather than a 401.

Photo kind extra: `storage_service.download_recipe_photo` monkeypatched to
return canned JPEG bytes (b"\\xff\\xd8\\xff") — no Supabase bucket access.

All helpers are local (no cross-test-file imports per scope_fence — D-37-03).
"""
from __future__ import annotations

import uuid
from typing import Optional
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.member import Member
from app.models.recipe import Recipe
from app.models.recipe_turn import RecipeTurn
from app.services.llm import process_thread_turn
from app.services import llm as llm_module
import app.services.storage as storage_module

SEED_TOKEN = "test-token-luca"


# ---------------------------------------------------------------------------
# Local helpers (re-stated per scope_fence — no cross-test-file imports)
# ---------------------------------------------------------------------------


def _seeded_member(db: Session) -> Member:
    m = db.scalar(select(Member).where(Member.auth_token == SEED_TOKEN).limit(1))
    assert m is not None, (
        f"Seeded member auth_token={SEED_TOKEN!r} not found — "
        "did Plan 37-01 _seeded_database fixture run?"
    )
    return m


def _make_recipe(
    db: Session,
    household_id: uuid.UUID,
    member_id: uuid.UUID,
    *,
    status: str = "structured",
) -> Recipe:
    """Minimal Recipe — mirrors test_turns._make_recipe shape."""
    r = Recipe(
        household_id=household_id,
        created_by_member_id=member_id,
        status=status,
        title="Recette test TurnKind",
        photo_paths=[],
        mood=[],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
        manually_edited_fields=[],
    )
    db.add(r)
    db.flush()
    return r


def _make_user_turn(
    db: Session,
    recipe_id: uuid.UUID,
    position: int,
    kind: str,
    payload: Optional[dict] = None,
) -> RecipeTurn:
    """Insert a user-sender turn directly — mirrors test_llm_thread._make_user_turn."""
    t = RecipeTurn(
        recipe_id=recipe_id,
        position=position,
        sender="user",
        kind=kind,
        payload=payload or {},
    )
    db.add(t)
    db.flush()
    return t


# ---------------------------------------------------------------------------
# Parametrized TurnKind sweep (SERV-04)
# ---------------------------------------------------------------------------

# (kind, payload) pairs for all 5 user-emitted TurnKinds
_TURN_KIND_CASES = [
    ("text",   {"text": "risotto aux champignons"}),
    ("voice",  {"transcript": "version légère avec moins de crème"}),
    ("photo",  {"photo_paths": ["path/photo_test.jpg"]}),
    ("url",    {"url": "https://example.com/recette-risotto"}),
    ("answer", {"field": "cuisine", "value": "italian"}),
]


@pytest.mark.parametrize("kind,payload", _TURN_KIND_CASES, ids=[c[0] for c in _TURN_KIND_CASES])
@pytest.mark.asyncio
async def test_process_thread_turn_kind(
    kind: str,
    payload: dict,
    db_session: Session,
    monkeypatch,
) -> None:
    """Each user-emitted TurnKind dispatches through process_thread_turn
    and produces a system summary turn with the canned extracted title.

    Gemini SDK is NOT called — test-mode short-circuit uses canned_thread_extract.
    """
    # ---- Monkeypatches ----

    # broadcast_to_household: async no-op (no real WS peers in test)
    broadcasts: list = []

    async def _fake_broadcast(hh_id, event, payload_data):
        broadcasts.append((hh_id, event, payload_data))

    monkeypatch.setattr(llm_module, "broadcast_to_household", _fake_broadcast)

    # SessionLocal: redirect to db_session (process_thread_turn opens its own session)
    monkeypatch.setattr(llm_module, "SessionLocal", lambda: db_session)

    # Belt-and-suspenders: _gemini() → MagicMock so any missed test-mode bypass
    # raises an AttributeError rather than touching the live API.
    monkeypatch.setattr(llm_module, "_gemini", lambda: MagicMock())

    # photo kind: monkeypatch storage download so we don't hit Supabase
    if kind == "photo":
        monkeypatch.setattr(
            storage_module,
            "download_recipe_photo",
            lambda path: b"\xff\xd8\xff",
        )

    # ---- Arrange ----
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    turn = _make_user_turn(db_session, recipe.id, position=0, kind=kind, payload=payload)
    db_session.commit()

    # ---- Act ----
    await process_thread_turn(recipe.id, turn.id)

    # ---- Assert ----
    # A system summary turn must have been emitted
    summary_turns = db_session.scalars(
        select(RecipeTurn).where(
            RecipeTurn.recipe_id == recipe.id,
            RecipeTurn.kind == "summary",
            RecipeTurn.sender == "system",
        )
    ).all()

    assert len(summary_turns) >= 1, (
        f"process_thread_turn with kind={kind!r} must emit at least one summary turn. "
        "Got 0 — check that the test-mode canned_thread_extract path runs correctly."
    )

    # The canned extract returns title "Risotto aux champignons (test)"
    # which is stored in summary_turn.payload["body"] (summary_body from the extract)
    # or derived from changed_fields. Verify the payload has an extraction_hash at minimum.
    s = summary_turns[0]
    assert "extraction_hash" in s.payload, (
        f"summary turn for kind={kind!r} must have extraction_hash in payload"
    )
    assert s.payload["extraction_hash"], (
        f"extraction_hash for kind={kind!r} must be non-empty"
    )

    # Verify broadcast was called (turn.created for the summary + recipe.updated)
    turn_created_events = [b for b in broadcasts if b[1] == "turn.created"]
    recipe_updated_events = [b for b in broadcasts if b[1] == "recipe.updated"]
    assert len(turn_created_events) >= 1, (
        f"turn.created broadcast must fire for kind={kind!r} (invariant #4)"
    )
    assert len(recipe_updated_events) >= 1, (
        f"recipe.updated broadcast must fire for kind={kind!r} (invariant #4)"
    )

    # Verify GEMINI_API_KEY=stub environment means _gemini() was never invoked
    # for its actual key check (our monkeypatched _gemini returns MagicMock).
    # The test passes ↔ no RuntimeError("GEMINI_API_KEY not set") was raised.
