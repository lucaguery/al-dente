"""Phase 26 — TURN-01..04 success-criteria pytest suite.

Tests:
  1. SC-1: POST text turn → appears in GET /turns at next position.
  2. T-26-08: cross-household POST /turns returns 404 (no existence leak).
  3. SC-2: answer turn applies value + pins manually_edited_fields, NO LLM call.
  4. T-26-10: answer turn with non-whitelisted field → 422 (Pydantic Literal).
  5. T-26-12: answer turn referencing a non-question turn → 422.
  6. SC-3: url turn schedules extract_and_process_url_turn; test-mode bypass
     fills extracted_html_path via canned_url_extract; closes TODO(productize).
  7. SC-4: proposal_dismissed turn is pure no-op (no field mutation, no LLM).
  8. proposal_accepted applies advisory.proposed_value + REMOVES pin.

Auth: Bearer fallback (test_recipes.py convention) — the seed inserts a member
with auth_token=SEED_TOKEN; `current_member` accepts the Authorization header
as well as the aldente_auth cookie.

Test mode (settings.environment='test') makes the suite hermetic:
  - upload_recipe_url_extract returns a deterministic path without touching Supabase
  - canned_url_extract returns deterministic markdown without httpx/trafilatura
  - broadcast_to_household runs but has no connected WS peers (no-op fan-out)
"""
from __future__ import annotations

import os
import uuid
from typing import Optional

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.household import Household
from app.models.member import Member
from app.models.recipe import Recipe
from app.models.recipe_turn import RecipeTurn

# Reuse the convention from test_recipes.py.
SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")
AUTH_HEADERS = {"Authorization": f"Bearer {SEED_TOKEN}"}


def _seeded_member(db: Session) -> Member:
    m = db.scalar(select(Member).where(Member.auth_token == SEED_TOKEN).limit(1))
    assert m is not None, (
        f"seed Postgres has no member with auth_token={SEED_TOKEN!r} — "
        f"run `uv run seed`?"
    )
    return m


def _make_recipe(db: Session, household_id: uuid.UUID, member_id: uuid.UUID) -> Recipe:
    """Insert a minimal structured recipe to attach turns to."""
    r = Recipe(
        household_id=household_id,
        created_by_member_id=member_id,
        status="structured",
        title="Recette test",
        photo_paths=[],
        mood=[],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
        manually_edited_fields=[],  # Phase 25 THREAD-03 default
    )
    db.add(r)
    db.flush()
    return r


def _make_turn(
    db: Session,
    recipe_id: uuid.UUID,
    position: int,
    kind: str,
    sender: str = "user",
    payload: Optional[dict] = None,
) -> RecipeTurn:
    """Insert a turn directly (bypasses the API; for arranging test state)."""
    t = RecipeTurn(
        recipe_id=recipe_id,
        position=position,
        sender=sender,
        kind=kind,
        payload=payload or {},
    )
    db.add(t)
    db.flush()
    return t


# ---------------------------------------------------------------------------
# Test 1 — SC-1: POST text turn → appears in GET /turns.
# ---------------------------------------------------------------------------


def test_post_text_turn_persists_and_lists(
    client: TestClient,
    db_session: Session,
) -> None:
    """ROADMAP SC-1: a text turn is appended at the next position and is
    visible via GET /turns in the same request lifecycle.
    """
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    _make_turn(db_session, recipe.id, position=0, kind="text", payload={"text": "initial"})
    db_session.commit()

    response = client.post(
        f"/recipes/{recipe.id}/turns",
        headers=AUTH_HEADERS,
        json={"kind": "text", "text": "deuxième bulle"},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["kind"] == "text"
    assert body["sender"] == "user"
    assert body["position"] == 1
    assert body["payload"]["text"] == "deuxième bulle"

    # GET /turns returns both turns in position order.
    listing = client.get(f"/recipes/{recipe.id}/turns", headers=AUTH_HEADERS)
    assert listing.status_code == 200
    items = listing.json()
    assert len(items) == 2
    assert [t["position"] for t in items] == [0, 1]
    assert items[1]["payload"]["text"] == "deuxième bulle"


# ---------------------------------------------------------------------------
# Test 2 — T-26-08: cross-household POST /turns → 404 (no leak).
# ---------------------------------------------------------------------------


def test_get_turns_cross_household_returns_404(
    client: TestClient,
    db_session: Session,
) -> None:
    """T-26-08: a recipe owned by a different household 404s on GET /turns
    AND on POST /turns (no existence leak — matches GET /recipes/{id}).
    """
    member = _seeded_member(db_session)

    # Construct a foreign household + recipe directly in DB.
    foreign_hh = Household(name="autre foyer", timezone="Europe/Paris")
    db_session.add(foreign_hh)
    db_session.flush()
    foreign_recipe = _make_recipe(db_session, foreign_hh.id, member.id)
    db_session.commit()

    # GET → 404
    resp = client.get(f"/recipes/{foreign_recipe.id}/turns", headers=AUTH_HEADERS)
    assert resp.status_code == 404

    # POST → 404
    resp = client.post(
        f"/recipes/{foreign_recipe.id}/turns",
        headers=AUTH_HEADERS,
        json={"kind": "text", "text": "drive-by"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Test 3 — SC-2: answer turn applies field + pins + NO LLM scheduled.
# ---------------------------------------------------------------------------


def test_answer_turn_applies_value_and_pins_without_llm(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """ROADMAP SC-2 + D-10/D-11: answer turn applies value directly to
    recipes.<field>, adds field to manually_edited_fields, and DOES NOT
    schedule process_thread_turn.
    """
    from app.services import llm as llm_service

    calls: list[tuple] = []

    def _spy(*args, **kwargs):
        calls.append((args, kwargs))

    # Replace the BackgroundTask body for the duration of this test.
    monkeypatch.setattr(llm_service, "process_thread_turn", _spy)
    monkeypatch.setattr(
        "app.routers.recipes.process_thread_turn", _spy, raising=True
    )

    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    # Seed a question turn that the answer references.
    question = _make_turn(
        db_session,
        recipe.id,
        position=0,
        kind="question",
        sender="system",
        payload={"field": "difficulty", "input_type": "chip"},
    )
    db_session.commit()

    response = client.post(
        f"/recipes/{recipe.id}/turns",
        headers=AUTH_HEADERS,
        json={
            "kind": "answer",
            "in_reply_to_turn_id": str(question.id),
            "field": "difficulty",
            "value": "medium",
        },
    )
    assert response.status_code == 201, response.text

    # The field was applied + pinned.
    db_session.expire_all()  # force reload from rolled-back tx
    refreshed = db_session.scalar(select(Recipe).where(Recipe.id == recipe.id))
    assert refreshed is not None
    assert refreshed.difficulty == "medium"
    assert "difficulty" in (refreshed.manually_edited_fields or [])

    # No LLM BackgroundTask was scheduled (D-11).
    assert calls == [], f"answer turn must not schedule process_thread_turn, got {calls}"


# ---------------------------------------------------------------------------
# Test 4 — T-26-10: answer turn with non-whitelisted field → 422.
# ---------------------------------------------------------------------------


def test_answer_turn_rejects_non_whitelisted_field(
    client: TestClient,
    db_session: Session,
) -> None:
    """T-26-10: AnswerField Literal whitelist excludes `photo_paths`, `password`,
    `manually_edited_fields`, etc. Pydantic rejects with 422 at schema boundary.
    """
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    question = _make_turn(
        db_session, recipe.id, 0, "question", sender="system",
        payload={"field": "title", "input_type": "text"},
    )
    db_session.commit()

    response = client.post(
        f"/recipes/{recipe.id}/turns",
        headers=AUTH_HEADERS,
        json={
            "kind": "answer",
            "in_reply_to_turn_id": str(question.id),
            "field": "photo_paths",  # not in AnswerField Literal
            "value": ["evil"],
        },
    )
    assert response.status_code == 422, response.text


# ---------------------------------------------------------------------------
# Test 5 — T-26-12: answer turn pointing at non-question → 422.
# ---------------------------------------------------------------------------


def test_answer_turn_rejects_invalid_in_reply_to_ref(
    client: TestClient,
    db_session: Session,
) -> None:
    """T-26-12: in_reply_to_turn_id must point to a question turn in the
    SAME recipe. Pointing at a text turn → 422.
    """
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    text_turn = _make_turn(db_session, recipe.id, 0, "text", payload={"text": "hi"})
    db_session.commit()

    response = client.post(
        f"/recipes/{recipe.id}/turns",
        headers=AUTH_HEADERS,
        json={
            "kind": "answer",
            "in_reply_to_turn_id": str(text_turn.id),
            "field": "difficulty",
            "value": "easy",
        },
    )
    assert response.status_code == 422, response.text
    assert "question" in response.text.lower()


# ---------------------------------------------------------------------------
# Test 6 — SC-3: url turn → BackgroundTask runs, extracted_html_path set.
# ---------------------------------------------------------------------------


def test_url_turn_schedules_extraction_and_sets_extracted_path(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """ROADMAP SC-3 + D-28: url turn dispatches extract_and_process_url_turn.
    Under settings.environment='test', the BackgroundTask uses canned_url_extract
    and upload_recipe_url_extract's test-mode short-circuit. After the response
    returns 201, the BackgroundTask has run and the turn payload contains
    extracted_html_path. Closes the long-standing TODO(productize).

    Implementation note: extract_and_process_url_turn opens its own SessionLocal()
    which cannot see data in the conftest's connection-scoped savepoint (see
    test_recipes.py docstring for the same pattern). We monkeypatch SessionLocal
    to return the test's db_session so the BackgroundTask sees the recipe + turn
    rows that were inserted by this test.
    """
    from app.services import llm as llm_service

    # Monkeypatch SessionLocal in the llm module so the BackgroundTask can see
    # the rows in the connection-scoped test transaction.
    monkeypatch.setattr(llm_service, "SessionLocal", lambda: db_session)

    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    db_session.commit()

    response = client.post(
        f"/recipes/{recipe.id}/turns",
        headers=AUTH_HEADERS,
        json={"kind": "url", "url": "https://example.com/recette-tarte"},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["kind"] == "url"

    # Starlette TestClient runs BackgroundTasks sync after the response is
    # returned; by the time control returns to us, extract_and_process_url_turn
    # has executed (test-mode bypass via canned_url_extract).
    db_session.expire_all()
    turn = db_session.scalar(select(RecipeTurn).where(RecipeTurn.id == body["id"]))
    assert turn is not None
    assert turn.payload.get("extracted_html_path"), (
        f"expected extracted_html_path on url turn, got {turn.payload!r}"
    )
    # Path shape matches Plan 26-02's upload_recipe_url_extract test-mode return:
    # "{household_id}/{recipe_id}/{turn_id}.md"
    assert str(turn.id) in turn.payload["extracted_html_path"]
    assert turn.payload["extracted_html_path"].endswith(".md")


# ---------------------------------------------------------------------------
# Test 7 — SC-4: proposal_dismissed is pure no-op.
# ---------------------------------------------------------------------------


def test_proposal_dismissed_is_pure_no_op(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """ROADMAP SC-4 + D-15: proposal_dismissed dismisses an advisory without
    mutating any field on the recipe and without scheduling any LLM call.
    """
    calls: list[tuple] = []
    monkeypatch.setattr(
        "app.routers.recipes.process_thread_turn",
        lambda *a, **k: calls.append(("ptt", a, k)),
        raising=True,
    )
    monkeypatch.setattr(
        "app.routers.recipes.extract_and_process_url_turn",
        lambda *a, **k: calls.append(("euet", a, k)),
        raising=True,
    )

    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    recipe.difficulty = "medium"
    recipe.manually_edited_fields = ["difficulty"]
    db_session.flush()

    # Synthetic advisory (Phase 29 emits these; Phase 26 tests inject directly).
    advisory = _make_turn(
        db_session,
        recipe.id,
        0,
        "advisory",
        sender="system",
        payload={
            "field": "difficulty",
            "current_value": "medium",
            "proposed_value": "hard",
            "reason_excerpt": "user mentioned long technique",
        },
    )
    db_session.commit()

    response = client.post(
        f"/recipes/{recipe.id}/turns",
        headers=AUTH_HEADERS,
        json={
            "kind": "proposal_dismissed",
            "in_reply_to_turn_id": str(advisory.id),
        },
    )
    assert response.status_code == 201, response.text

    # No field mutation.
    db_session.expire_all()
    refreshed = db_session.scalar(select(Recipe).where(Recipe.id == recipe.id))
    assert refreshed.difficulty == "medium"  # unchanged
    assert refreshed.manually_edited_fields == ["difficulty"]  # pin preserved

    # No LLM scheduled.
    assert calls == [], f"proposal_dismissed must be pure no-op, got {calls}"


# ---------------------------------------------------------------------------
# Test 8 — proposal_accepted applies proposed_value + REMOVES pin (D-16).
# ---------------------------------------------------------------------------


def test_proposal_accepted_removes_pin_and_applies_proposed_value(
    client: TestClient,
    db_session: Session,
) -> None:
    """D-16: proposal_accepted reads advisory.payload.proposed_value, applies
    it to recipes.<field>, and REMOVES the field from manually_edited_fields.
    """
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    recipe.difficulty = "easy"
    recipe.manually_edited_fields = ["difficulty", "title"]  # multiple pins
    db_session.flush()

    advisory = _make_turn(
        db_session,
        recipe.id,
        0,
        "advisory",
        sender="system",
        payload={
            "field": "difficulty",
            "current_value": "easy",
            "proposed_value": "hard",
            "reason_excerpt": "long technique",
        },
    )
    db_session.commit()

    response = client.post(
        f"/recipes/{recipe.id}/turns",
        headers=AUTH_HEADERS,
        json={
            "kind": "proposal_accepted",
            "in_reply_to_turn_id": str(advisory.id),
        },
    )
    assert response.status_code == 201, response.text

    db_session.expire_all()
    refreshed = db_session.scalar(select(Recipe).where(Recipe.id == recipe.id))
    assert refreshed.difficulty == "hard"  # proposed_value applied
    # 'difficulty' removed from pins; 'title' still pinned (set semantics + sorted).
    assert refreshed.manually_edited_fields == ["title"]
