"""Phase 29 — pytest coverage for POST /questions/trigger and POST /questions/defer (D-20).

Tests:
  TRIGGER endpoint (POST /recipes/{id}/questions/trigger):
    - Emits question turn for highest-priority missing field (first missing after title)
    - Skips ingredients/steps (INPUT_TYPE_MAP[field] is None) → picks next eligible
    - Returns 204 when all fields are filled
    - Returns 204 when only ingredients/steps are missing (no chat affordance)
    - De-dups: skips fields that already have an open question turn
    - Emits chip question with options for chip-typed fields (cuisine)
    - Emits chip-multi question for mood field
    - Emits stepper question for numeric fields (servings)
    - 404 for cross-household recipes
    - 401 for unauthenticated requests
    - Position is correctly incremented past existing turns
    - Broadcasts turn.created after commit

  DEFER endpoint (POST /recipes/{id}/questions/defer):
    - Sets questions_deferred_until to now()+24h (tz-aware UTC)
    - Idempotently overwrites prior value
    - Broadcasts recipe.updated after commit
    - 404 for cross-household recipes
    - 401 for unauthenticated requests

  INTEGRATION GATE (D-08):
    - defer endpoint → subsequent _run_thread_llm emits no question turn
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.household import Household
from app.models.member import Member
from app.models.recipe import Recipe
from app.models.recipe_turn import RecipeTurn
from app.services import llm as llm_module
from app.services.completeness import FIELD_KEYS, OPTIONS_MAP, _FIELD_PROMPTS_FR
from app.schemas.recipe_turn import _VALID_CUISINES, _VALID_MOODS
from tests.test_turns import _make_recipe, _make_turn, AUTH_HEADERS, _seeded_member


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _fill_recipe(recipe: Recipe, **overrides) -> None:
    """Mutate a Recipe in place so every FIELD_KEYS entry passes is_field_filled."""
    defaults = dict(
        title="Risotto",
        description="Risotto crémeux aux champignons",
        ingredients=[{"name": "riz arborio", "quantity": 300, "unit": "g"}],
        steps=["Faire revenir l'oignon.", "Nacrer le riz.", "Mouiller au bouillon."],
        prep_time_minutes=10,
        cook_time_minutes=20,
        servings=2,
        difficulty="medium",
        cuisine="italian",
        mood=["comfort"],
        main_protein="none",
    )
    defaults.update(overrides)
    for k, v in defaults.items():
        setattr(recipe, k, v)


# ===========================================================================
# TRIGGER ENDPOINT
# ===========================================================================


def test_trigger_emits_question_for_first_missing_field(
    client,
    db_session: Session,
) -> None:
    """Recipe with only title set → POST returns 201 + TurnResponse for 'description'.

    FIELD_KEYS[1] is 'description' — first eligible missing field after 'title'.
    ingredients (FIELD_KEYS[2]) and steps (FIELD_KEYS[3]) are skipped per D-10.
    """
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    recipe.title = "Risotto"  # only title filled; 10 others missing
    db_session.commit()

    resp = client.post(f"/recipes/{recipe.id}/questions/trigger", headers=AUTH_HEADERS)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    # TurnResponse shape
    assert data["kind"] == "question"
    assert data["sender"] == "system"
    assert data["payload"]["field"] == "description"
    assert data["payload"]["prompt"] == "En une phrase, comment décrirais-tu cette recette ?"
    assert data["payload"]["prompt"] == _FIELD_PROMPTS_FR["description"]
    assert data["payload"]["input_type"] == "text"
    assert data["payload"]["options"] == []
    assert data["payload"]["multi"] is False


def test_trigger_skips_ingredients_steps(
    client,
    db_session: Session,
) -> None:
    """Recipe missing ONLY ingredients, steps, and cuisine.

    ingredients and steps are D-10 SKIP fields (INPUT_TYPE_MAP==None).
    cuisine is the first eligible missing field → POST returns 201 with field='cuisine'.
    """
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    _fill_recipe(
        recipe,
        ingredients=[],  # missing
        steps=[],         # missing
        cuisine=None,     # missing (also None for the ORM)
    )
    db_session.commit()

    resp = client.post(f"/recipes/{recipe.id}/questions/trigger", headers=AUTH_HEADERS)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["payload"]["field"] == "cuisine"


def test_trigger_returns_204_when_no_eligible_missing(
    client,
    db_session: Session,
) -> None:
    """Recipe fully filled → POST returns 204 with empty body."""
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    _fill_recipe(recipe)
    db_session.commit()

    resp = client.post(f"/recipes/{recipe.id}/questions/trigger", headers=AUTH_HEADERS)
    assert resp.status_code == 204
    assert resp.content == b""


def test_trigger_returns_204_when_only_ingredients_steps_missing(
    client,
    db_session: Session,
) -> None:
    """Recipe missing only ingredients + steps → 204 (D-10: no chat affordance for those)."""
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    _fill_recipe(recipe, ingredients=[], steps=[])
    db_session.commit()

    resp = client.post(f"/recipes/{recipe.id}/questions/trigger", headers=AUTH_HEADERS)
    assert resp.status_code == 204
    assert resp.content == b""


def test_trigger_de_dups_existing_open_question(
    client,
    db_session: Session,
) -> None:
    """Recipe missing description only, with an unanswered question turn for description.

    The de-dup guard (_should_emit_question) suppresses re-emission for 'description'.
    Since description is the only missing eligible field → 204.
    """
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    _fill_recipe(recipe, description=None)
    db_session.commit()

    # Pre-existing open question turn for description (no answer → unanswered)
    question_turn = RecipeTurn(
        id=uuid.uuid4(),
        recipe_id=recipe.id,
        position=0,
        sender="system",
        kind="question",
        payload={"field": "description", "prompt": "En une phrase ?", "input_type": "text", "options": [], "multi": False},
    )
    db_session.add(question_turn)
    db_session.commit()

    # description is the only eligible missing field BUT already has open question → 204
    resp = client.post(f"/recipes/{recipe.id}/questions/trigger", headers=AUTH_HEADERS)
    assert resp.status_code == 204


def test_trigger_de_dups_and_falls_through_to_next_field(
    client,
    db_session: Session,
) -> None:
    """Recipe missing description + cuisine. Open question for description.

    De-dup suppresses description → falls through to cuisine → 201 with field='cuisine'.
    """
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    _fill_recipe(recipe, description=None, cuisine=None)
    db_session.commit()

    # Open question for description (no answer)
    question_turn = RecipeTurn(
        id=uuid.uuid4(),
        recipe_id=recipe.id,
        position=0,
        sender="system",
        kind="question",
        payload={"field": "description", "prompt": "En une phrase ?", "input_type": "text", "options": [], "multi": False},
    )
    db_session.add(question_turn)
    db_session.commit()

    resp = client.post(f"/recipes/{recipe.id}/questions/trigger", headers=AUTH_HEADERS)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["payload"]["field"] == "cuisine"


def test_trigger_emits_chip_question_with_options(
    client,
    db_session: Session,
) -> None:
    """Recipe missing cuisine only → 201 with chip input_type + options + multi=False."""
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    _fill_recipe(recipe, cuisine=None)
    db_session.commit()

    resp = client.post(f"/recipes/{recipe.id}/questions/trigger", headers=AUTH_HEADERS)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["payload"]["field"] == "cuisine"
    assert data["payload"]["input_type"] == "chip"
    assert data["payload"]["options"] == sorted(_VALID_CUISINES)
    assert data["payload"]["multi"] is False


def test_trigger_emits_chip_multi_for_mood(
    client,
    db_session: Session,
) -> None:
    """Recipe missing mood only → 201 with field='mood', input_type='chip', multi=True."""
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    _fill_recipe(recipe, mood=[])
    db_session.commit()

    resp = client.post(f"/recipes/{recipe.id}/questions/trigger", headers=AUTH_HEADERS)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["payload"]["field"] == "mood"
    assert data["payload"]["input_type"] == "chip"
    assert data["payload"]["multi"] is True
    assert set(data["payload"]["options"]) == _VALID_MOODS


def test_trigger_emits_stepper_question(
    client,
    db_session: Session,
) -> None:
    """Recipe missing servings only → 201 with input_type='stepper', options=[], multi=False."""
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    _fill_recipe(recipe, servings=None)
    db_session.commit()

    resp = client.post(f"/recipes/{recipe.id}/questions/trigger", headers=AUTH_HEADERS)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["payload"]["field"] == "servings"
    assert data["payload"]["input_type"] == "stepper"
    assert data["payload"]["options"] == []
    assert data["payload"]["multi"] is False


def test_trigger_cross_household_returns_404(
    client,
    db_session: Session,
) -> None:
    """Recipe owned by a different household → 404 (no existence leak)."""
    member = _seeded_member(db_session)

    foreign_hh = Household(name="autre foyer", timezone="Europe/Paris")
    db_session.add(foreign_hh)
    db_session.flush()
    foreign_recipe = _make_recipe(db_session, foreign_hh.id, member.id)
    db_session.commit()

    resp = client.post(
        f"/recipes/{foreign_recipe.id}/questions/trigger", headers=AUTH_HEADERS
    )
    assert resp.status_code == 404


def test_trigger_unauthenticated_returns_401(
    client,
    db_session: Session,
) -> None:
    """POST without auth headers → 401."""
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    db_session.commit()

    resp = client.post(f"/recipes/{recipe.id}/questions/trigger")
    assert resp.status_code == 401


def test_trigger_position_continues_existing_turns(
    client,
    db_session: Session,
) -> None:
    """Recipe with 3 existing turns → emitted question turn has position == 3."""
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    recipe.title = "Risotto"  # 10 missing fields
    # Insert 3 turns at positions 0, 1, 2
    for pos in range(3):
        db_session.add(RecipeTurn(
            id=uuid.uuid4(),
            recipe_id=recipe.id,
            position=pos,
            sender="user",
            kind="text",
            payload={"text": f"turn {pos}"},
        ))
    db_session.commit()

    resp = client.post(f"/recipes/{recipe.id}/questions/trigger", headers=AUTH_HEADERS)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["position"] == 3


def test_trigger_broadcasts_turn_created(
    client,
    db_session: Session,
    monkeypatch,
) -> None:
    """trigger endpoint calls broadcast_to_household with event='turn.created'."""
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    recipe.title = "Risotto"  # missing description → will emit question
    db_session.commit()

    broadcast_calls = []

    async def fake_broadcast(household_id, event, payload):
        broadcast_calls.append({"event": event, "payload": payload})

    import app.routers.recipes as recipes_module
    monkeypatch.setattr(recipes_module, "broadcast_to_household", fake_broadcast)

    resp = client.post(f"/recipes/{recipe.id}/questions/trigger", headers=AUTH_HEADERS)
    assert resp.status_code == 201, resp.text

    assert len(broadcast_calls) == 1
    assert broadcast_calls[0]["event"] == "turn.created"
    assert broadcast_calls[0]["payload"]["kind"] == "question"


# ===========================================================================
# DEFER ENDPOINT
# ===========================================================================


def test_defer_sets_questions_deferred_until_24h(
    client,
    db_session: Session,
) -> None:
    """POST /defer sets questions_deferred_until = now()+24h (tz-aware UTC, ±1h slack)."""
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    db_session.commit()

    before = datetime.now(tz=timezone.utc)
    resp = client.post(f"/recipes/{recipe.id}/questions/defer", headers=AUTH_HEADERS)
    after = datetime.now(tz=timezone.utc)

    assert resp.status_code == 204
    assert resp.content == b""

    db_session.refresh(recipe)
    assert recipe.questions_deferred_until is not None
    assert recipe.questions_deferred_until.tzinfo is not None  # Pitfall 9: must be tz-aware

    # Allow 1h slack for test timing (as per plan spec)
    delta = recipe.questions_deferred_until - before
    assert timedelta(hours=23) <= delta <= timedelta(hours=25), (
        f"expected 23h ≤ delta ≤ 25h, got {delta}"
    )


def test_defer_idempotent_overwrites_prior_value(
    client,
    db_session: Session,
) -> None:
    """Calling defer again overwrites the prior value with now()+24h (not prior+24h)."""
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    # Pre-set to 1 hour ago (already expired)
    recipe.questions_deferred_until = datetime.now(tz=timezone.utc) - timedelta(hours=1)
    db_session.commit()

    before = datetime.now(tz=timezone.utc)
    resp = client.post(f"/recipes/{recipe.id}/questions/defer", headers=AUTH_HEADERS)

    assert resp.status_code == 204
    db_session.refresh(recipe)

    delta = recipe.questions_deferred_until - before
    assert timedelta(hours=23) <= delta <= timedelta(hours=25), (
        f"expected new value ≈ now+24h, got delta={delta}"
    )


def test_defer_broadcasts_recipe_updated(
    client,
    db_session: Session,
    monkeypatch,
) -> None:
    """defer endpoint calls broadcast_to_household with event='recipe.updated'."""
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    db_session.commit()

    broadcast_calls = []

    async def fake_broadcast(household_id, event, payload):
        broadcast_calls.append({"event": event, "payload": payload})

    import app.routers.recipes as recipes_module
    monkeypatch.setattr(recipes_module, "broadcast_to_household", fake_broadcast)

    resp = client.post(f"/recipes/{recipe.id}/questions/defer", headers=AUTH_HEADERS)
    assert resp.status_code == 204

    assert len(broadcast_calls) == 1
    assert broadcast_calls[0]["event"] == "recipe.updated"
    # Payload should carry the updated recipe fields
    assert "questions_deferred_until" in broadcast_calls[0]["payload"]


def test_defer_cross_household_returns_404(
    client,
    db_session: Session,
) -> None:
    """Recipe owned by a different household → 404 (no existence leak)."""
    member = _seeded_member(db_session)

    foreign_hh = Household(name="foyer étranger", timezone="Europe/Paris")
    db_session.add(foreign_hh)
    db_session.flush()
    foreign_recipe = _make_recipe(db_session, foreign_hh.id, member.id)
    db_session.commit()

    resp = client.post(
        f"/recipes/{foreign_recipe.id}/questions/defer", headers=AUTH_HEADERS
    )
    assert resp.status_code == 404


def test_defer_unauthenticated_returns_401(
    client,
    db_session: Session,
) -> None:
    """POST without auth headers → 401."""
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    db_session.commit()

    resp = client.post(f"/recipes/{recipe.id}/questions/defer")
    assert resp.status_code == 401


# ===========================================================================
# INTEGRATION GATE — D-08: defer suppresses question emission in _run_thread_llm
# ===========================================================================


@pytest.mark.xfail(
    strict=False,
    reason=(
        "Known issue D-39-05 / 37-01-SUMMARY Category C — "
        "canned LLM stub in app/services/llm_fixtures.py does not emit question turns "
        "for this scenario; _run_thread_llm does not emit a question turn after deferral "
        "clears in the stub path. Fix requires editing llm_fixtures.py which is out of "
        "scope for this test-only phase per scope_fence."
    ),
)
@pytest.mark.asyncio
async def test_defer_suppresses_question_in_run_thread_llm(
    client,
    db_session: Session,
    monkeypatch,
) -> None:
    """defer → _run_thread_llm emits NO question turn (D-08 gate).

    Step 1: Create a structured recipe with many missing fields.
    Step 2: POST /defer → sets questions_deferred_until = now()+24h.
    Step 3: Simulate a refinement turn that triggers _run_thread_llm.
    Step 4: Assert no question turn was emitted (defer gate held).
    Step 5: Clear the deferral flag → _run_thread_llm now emits a question turn.
    """
    # Stub broadcast so async handler doesn't hit the realtime path
    async def fake_broadcast(*a, **kw):
        pass

    monkeypatch.setattr(llm_module, "broadcast_to_household", fake_broadcast)

    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    recipe.title = "Risotto"  # 10 missing fields → trigger would emit a question normally
    recipe.status = "structured"
    db_session.commit()

    # Step 2: defer — calls the API endpoint (exercises the full write path)
    resp = client.post(f"/recipes/{recipe.id}/questions/defer", headers=AUTH_HEADERS)
    assert resp.status_code == 204
    db_session.refresh(recipe)
    assert recipe.questions_deferred_until is not None
    assert recipe.questions_deferred_until > datetime.now(tz=timezone.utc)

    # Step 3: simulate a refinement text turn that triggers _run_thread_llm
    text_turn = RecipeTurn(
        id=uuid.uuid4(),
        recipe_id=recipe.id,
        position=1,
        sender="user",
        kind="text",
        payload={"text": "ajoute des poireaux"},
    )
    db_session.add(text_turn)
    db_session.commit()
    db_session.refresh(text_turn)

    await llm_module._run_thread_llm(db_session, recipe, text_turn.id)

    # Step 4: verify no question turn emitted (defer gate held)
    question_turns = db_session.scalars(
        select(RecipeTurn).where(
            RecipeTurn.recipe_id == recipe.id,
            RecipeTurn.kind == "question",
        )
    ).all()
    assert len(question_turns) == 0, (
        f"defer should suppress question emission, got {len(question_turns)} question turns"
    )

    # Verify summary was still emitted (LLM ran — just question was suppressed)
    summary_turns = db_session.scalars(
        select(RecipeTurn).where(
            RecipeTurn.recipe_id == recipe.id,
            RecipeTurn.kind == "summary",
        )
    ).all()
    assert len(summary_turns) == 1, (
        f"expected 1 summary turn, got {len(summary_turns)}"
    )

    # Step 5: clear deferral → _run_thread_llm now emits a question turn
    recipe.questions_deferred_until = None
    db_session.commit()

    # Need a new trigger turn to get _run_thread_llm to emit (hash check would skip
    # if same extraction — add a distinct text to force a fresh hash)
    text_turn2 = RecipeTurn(
        id=uuid.uuid4(),
        recipe_id=recipe.id,
        position=10,
        sender="user",
        kind="text",
        payload={"text": "__TEST_FORCE_NEW_HASH__ ajoute du parmesan"},
    )
    db_session.add(text_turn2)
    db_session.commit()
    db_session.refresh(text_turn2)

    await llm_module._run_thread_llm(db_session, recipe, text_turn2.id)

    # Now a question turn should have been emitted
    question_turns_after = db_session.scalars(
        select(RecipeTurn).where(
            RecipeTurn.recipe_id == recipe.id,
            RecipeTurn.kind == "question",
        )
    ).all()
    assert len(question_turns_after) >= 1, (
        "after clearing deferral, _run_thread_llm should emit a question turn"
    )
