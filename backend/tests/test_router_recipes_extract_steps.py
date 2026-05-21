"""Phase 42 STEP-03 — contract tests for POST /recipes/{id}/extract-steps.

This endpoint lazily backfills structured steps for a promoted recipe whose
`recipes.steps` JSONB column is empty OR contains legacy `list[str]` entries.

Documented response branches:
- 401 unauthorized (no/invalid cookie or Bearer token)
- 404 cross-household leak prevention (NOT 403)
- 404 recipe not found
- 202 Accepted with body {recipe_id, scheduled: true, reason: null}
- 200 OK (idempotent) with body {recipe_id, scheduled: false, reason: "already_extracted"}

Wave 2 dependency on 42-01 + 42-02: StepEntry shape (text + ingredient_refs)
already lives in app/schemas/recipe.py and app/services/llm.py.

Fixture pattern mirrors tests/test_turns.py and tests/test_recipes.py — uses
the seeded household member with the SEED_TOKEN Bearer (which the cookie-first
auth dependency accepts as a fallback during tests per app/auth.py).
"""

from __future__ import annotations

import asyncio
import os
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.household import Household
from app.models.member import Member
from app.models.recipe import Recipe
from app.models.recipe_turn import RecipeTurn

SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")
AUTH_HEADERS = {"Authorization": f"Bearer {SEED_TOKEN}"}


def _seeded_member(db: Session) -> Member:
    m = db.scalar(select(Member).where(Member.auth_token == SEED_TOKEN).limit(1))
    assert m is not None, (
        f"seed Postgres has no member with auth_token={SEED_TOKEN!r} — run `uv run seed`?"
    )
    return m


def _make_recipe(
    db: Session,
    household_id: uuid.UUID,
    member_id: uuid.UUID,
    *,
    steps: list | None = None,
) -> Recipe:
    """Insert a structured recipe with a deterministic steps shape."""
    r = Recipe(
        household_id=household_id,
        created_by_member_id=member_id,
        status="structured",
        title="Risotto aux champignons",
        ingredients=[
            {"name": "riz arborio", "quantity": 300.0, "unit": "g"},
            {"name": "champignons", "quantity": 400.0, "unit": "g"},
        ],
        steps=steps if steps is not None else [],
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
    payload: dict | None = None,
) -> RecipeTurn:
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


def _make_other_household(db: Session) -> tuple[Household, Member]:
    """Build a second household + member so cross-household leak tests have a
    foreign tenant to read from. The member's auth_token is NOT used for auth
    (we authenticate as the seeded member); this household exists only as
    the recipe owner.
    """
    hh = Household(name="Autre foyer test")
    db.add(hh)
    db.flush()
    member = Member(
        household_id=hh.id,
        name="Autre membre",
        color_hex="#000000",
        auth_token=f"foreign-{uuid.uuid4().hex}",
    )
    db.add(member)
    db.flush()
    return hh, member


# ---------------------------------------------------------------------------
# Test 1 — 401 unauthorized when no cookie/Bearer provided
# ---------------------------------------------------------------------------


def test_extract_steps_unauthorized_returns_401(
    client: TestClient,
    db_session: Session,
) -> None:
    """No auth header → 401 Unauthorized (existing auth dependency)."""
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    db_session.commit()

    response = client.post(f"/recipes/{recipe.id}/extract-steps")
    assert response.status_code == 401, response.text


# ---------------------------------------------------------------------------
# Test 2 — 404 cross-household (NOT 403, leak prevention per invariant)
# ---------------------------------------------------------------------------


def test_extract_steps_cross_household_returns_404(
    client: TestClient,
    db_session: Session,
) -> None:
    """Member of A authenticates and POSTs against a recipe in B → 404."""
    auth_member = _seeded_member(db_session)
    other_hh, other_member = _make_other_household(db_session)
    foreign_recipe = _make_recipe(db_session, other_hh.id, other_member.id)
    db_session.commit()

    response = client.post(
        f"/recipes/{foreign_recipe.id}/extract-steps",
        headers=AUTH_HEADERS,
    )
    assert response.status_code == 404, response.text
    # Detail body must not leak the recipe's household_id or any other field.
    body = response.json()
    assert "household_id" not in str(body)
    assert str(other_hh.id) not in str(body)


# ---------------------------------------------------------------------------
# Test 3 — 404 recipe not found
# ---------------------------------------------------------------------------


def test_extract_steps_recipe_not_found_returns_404(
    client: TestClient,
    db_session: Session,
) -> None:
    """Random UUID → 404."""
    _ = _seeded_member(db_session)
    db_session.commit()

    random_id = uuid.uuid4()
    response = client.post(
        f"/recipes/{random_id}/extract-steps",
        headers=AUTH_HEADERS,
    )
    assert response.status_code == 404, response.text


# ---------------------------------------------------------------------------
# Test 4 — 202 Accepted + BackgroundTask scheduled when steps need backfill
# ---------------------------------------------------------------------------


def test_extract_steps_empty_steps_returns_202_and_schedules_task(
    client: TestClient,
    db_session: Session,
    monkeypatch,
) -> None:
    """Recipe with steps=[] + turn-0 → 202, response shape correct, BackgroundTask
    schedules `extract_and_persist_steps` exactly once."""

    # Intercept extract_and_persist_steps to verify scheduling without running
    # the (test-mode-only) Gemini path. The router calls add_task BEFORE
    # importing the function via from-import (see Task 3 impl), so we patch
    # the function symbol in the llm module.
    calls: list[tuple] = []

    def fake_extract(recipe_id, household_id):
        calls.append((recipe_id, household_id))

    monkeypatch.setattr("app.services.llm.extract_and_persist_steps", fake_extract)

    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id, steps=[])
    _make_user_turn(
        db_session,
        recipe.id,
        position=0,
        kind="voice",
        payload={"transcript": "risotto aux champignons"},
    )
    db_session.commit()

    response = client.post(
        f"/recipes/{recipe.id}/extract-steps",
        headers=AUTH_HEADERS,
    )
    assert response.status_code == 202, response.text
    body = response.json()
    assert body["recipe_id"] == str(recipe.id)
    assert body["scheduled"] is True
    assert body["reason"] is None

    # BackgroundTask must fire exactly once with the right args.
    assert len(calls) == 1, f"expected 1 scheduled task, got {len(calls)}"
    rid, hh_id = calls[0]
    assert str(rid) == str(recipe.id)
    assert str(hh_id) == str(member.household_id)


# ---------------------------------------------------------------------------
# Test 5 — 200 idempotent when steps already structured
# ---------------------------------------------------------------------------


def test_extract_steps_already_structured_returns_200_idempotent(
    client: TestClient,
    db_session: Session,
    monkeypatch,
) -> None:
    """Recipe with steps=[{text, ingredient_refs}] → 200, scheduled=false,
    reason='already_extracted', no BackgroundTask."""

    calls: list[tuple] = []

    def fake_extract(recipe_id, household_id):
        calls.append((recipe_id, household_id))

    monkeypatch.setattr("app.services.llm.extract_and_persist_steps", fake_extract)

    member = _seeded_member(db_session)
    recipe = _make_recipe(
        db_session,
        member.household_id,
        member.id,
        steps=[{"text": "Faire revenir l'oignon.", "ingredient_refs": []}],
    )
    db_session.commit()

    response = client.post(
        f"/recipes/{recipe.id}/extract-steps",
        headers=AUTH_HEADERS,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["recipe_id"] == str(recipe.id)
    assert body["scheduled"] is False
    assert body["reason"] == "already_extracted"

    # No BackgroundTask scheduled.
    assert len(calls) == 0, f"expected 0 scheduled tasks, got {len(calls)}"


# ---------------------------------------------------------------------------
# Test 6 — recipe.updated broadcast fires after extract_and_persist_steps commits
# ---------------------------------------------------------------------------


def test_extract_steps_broadcasts_recipe_updated_after_commit(
    db_session: Session,
    monkeypatch,
) -> None:
    """STEP-03 + invariant #4 — recipe.updated broadcast fires after the
    BackgroundTask commits new steps. Bypasses the HTTP layer and invokes
    the BackgroundTask body directly so we can assert the broadcast
    contract end-to-end (the BackgroundTask's SessionLocal is replaced
    with the test session via monkeypatch).

    Test mode (settings.environment == 'test') routes _run_thread_llm to
    canned_thread_extract which returns the 4-step risotto fixture (42-02).
    """

    from app.services import llm as llm_module
    from app.services.llm import extract_and_persist_steps

    broadcasts: list[tuple] = []

    async def fake_broadcast(household_id, event, payload):
        broadcasts.append((household_id, event, payload))

    monkeypatch.setattr(llm_module, "broadcast_to_household", fake_broadcast)

    # BackgroundTask opens its own SessionLocal; route it to the test session
    # via a no-close wrapper so the per-test transaction stays alive.
    class _NoCloseWrapper:
        def close(self) -> None:
            pass

        def __getattr__(self, name: str):
            return getattr(db_session, name)

    monkeypatch.setattr(llm_module, "SessionLocal", lambda: _NoCloseWrapper())

    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id, steps=[])
    _make_user_turn(
        db_session,
        recipe.id,
        position=0,
        kind="voice",
        payload={"transcript": "risotto aux champignons"},
    )
    db_session.commit()

    asyncio.run(
        extract_and_persist_steps(
            recipe_id=recipe.id,
            household_id=member.household_id,
        )
    )

    # Exactly one recipe.updated broadcast.
    updates = [b for b in broadcasts if b[1] == "recipe.updated"]
    assert len(updates) == 1, f"expected 1 recipe.updated broadcast, got {len(updates)}"
    hh_id_arg, _event, payload = updates[0]
    assert str(hh_id_arg) == str(member.household_id)
    assert payload["id"] == str(recipe.id)
    # Steps must be populated with StepEntry-shaped dicts.
    assert len(payload["steps"]) > 0, "broadcast payload must include populated steps"
    for entry in payload["steps"]:
        assert "text" in entry and isinstance(entry["text"], str) and entry["text"]
        assert "ingredient_refs" in entry and isinstance(entry["ingredient_refs"], list)
