"""Phase 16 + Phase 28 tests for backend.app.routers.recipes and
backend.app.services.llm.

Phase 16 Tests:
  Test 1 (test_promotion_failure_sets_failed_state): forces extract_from_transcript
  to raise via monkeypatch and asserts the recipe row transitions to
  status='failed' with non-null promotion_error. Validates the symmetric
  treatment introduced in Plan 16-03 Task 1 (services/llm.py::_record_failure
  now writes status alongside the existing error + attempts).

  Test 2 (test_retry_promotion_resets_failed_to_draft): given a recipe row in
  the failed terminal state, asserts POST /recipes/{id}/retry-promotion
  resets status to 'draft' and clears promotion_error. Validates the synchronous
  reset introduced in Plan 16-03 Task 2 (routers/recipes.py::retry_promote).

Phase 28 Tests:
  TestRecipeResponsePinSet (3 tests): RecipeResponse.manually_edited_fields
  serialized correctly (non-empty list, empty list, None-defensive).

  TestPutPinning (10 tests T-28-01..T-28-10): _apply_put_pinning covers all
  diff-pin / unpin / no-op / list-order / non-AnswerField paths (DETAIL-05).

All tests use the Phase 15 conftest fixtures: `db_session` (per-test rolled-
back transaction) and `client` (TestClient with `get_db` overridden to the
rolled-back session). Authentication uses the seeded Bearer token convention
established in test_cooking_logs.py.
"""

from __future__ import annotations

import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.member import Member
from app.models.recipe import Recipe
from app.models.recipe_turn import RecipeTurn
from app.schemas.recipe import RecipeResponse
from app.services import llm as llm_service

# Mirrors backend/tests/test_cooking_logs.py SEED_TOKEN — the seeded
# household's Bearer (the existing E2E specs use the same fallback path).
SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")
AUTH_HEADERS = {"Authorization": f"Bearer {SEED_TOKEN}"}


def _seeded_member(db: Session) -> Member:
    """Resolve the seeded test member (auth_token == SEED_TOKEN).

    Raises with a clear message if the seed hasn't run — points the operator
    at `uv run seed`.
    """
    m = db.scalar(select(Member).where(Member.auth_token == SEED_TOKEN).limit(1))
    assert m is not None, (
        f"seed Postgres has no member with auth_token={SEED_TOKEN!r} — run `uv run seed`?"
    )
    return m


def test_promotion_failure_sets_failed_state(
    db_session: Session,
) -> None:
    """D-16-04 / D-16-12 — Gemini failure deterministically transitions the
    draft row to status='failed' with the truncated error in promotion_error.

    Unit-level assertion on `_record_failure` directly: the function is the
    sole writer of the failed-state transition (called by promote_draft
    in its except blocks for voice and photo branches).
    Driving this from the HTTP layer would require monkeypatching
    `app.services.llm.SessionLocal` so the BackgroundTask sees the
    rolled-back transaction's data, which is incompatible with the Phase 15
    conftest's connection-scoped transaction pattern (the BackgroundTask
    opens its own SessionLocal which can't see the uncommitted recipe).

    Per Plan 16-03 Task 1 acceptance criteria, the contract under test is:
    `_record_failure(db, recipe, exc)` MUST set status='failed', persist
    the truncated error, and increment promotion_attempts. Plan 16-05's
    E2E spec exercises the full HTTP + BackgroundTask path against a real
    seeded environment.
    """
    member = _seeded_member(db_session)

    # Seed a draft recipe in the rolled-back transaction.
    draft = Recipe(
        household_id=member.household_id,
        created_by_member_id=member.id,
        status="draft",
        title="(extraction en cours…)",
        photo_paths=[],
        mood=[],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
    )
    db_session.add(draft)
    db_session.flush()  # need draft.id for turn FK
    db_session.add(
        RecipeTurn(
            id=uuid.uuid4(),
            recipe_id=draft.id,
            position=0,
            sender="user",
            kind="voice",
            payload={"transcript": "test"},
        )
    )
    db_session.commit()
    db_session.refresh(draft)

    # Pre-condition sanity check.
    assert draft.status == "draft"
    assert draft.promotion_error is None
    starting_attempts = draft.promotion_attempts or 0

    # Drive the failure path. The exception text is short — no truncation
    # needed — so we can assert on the full message.
    llm_service._record_failure(db_session, draft, RuntimeError("forced test failure"))

    # Re-read the row (the function commits internally).
    db_session.expire_all()
    row = db_session.scalar(select(Recipe).where(Recipe.id == draft.id))
    assert row is not None
    assert row.status == "failed", row.status
    assert row.promotion_error == "forced test failure", row.promotion_error
    assert row.promotion_attempts == starting_attempts + 1, row.promotion_attempts

    # Bonus: D-16-03 truncation contract — a 600-char message is clipped to 500.
    long_exc = RuntimeError("a" * 600)
    llm_service._record_failure(db_session, row, long_exc)
    db_session.expire_all()
    row2 = db_session.scalar(select(Recipe).where(Recipe.id == draft.id))
    assert row2 is not None
    assert row2.promotion_error is not None
    assert len(row2.promotion_error) == 500, len(row2.promotion_error)


def test_retry_promotion_resets_failed_to_draft(
    client: TestClient,
    db_session: Session,
) -> None:
    """D-16-05 / D-16-12 — POST /recipes/{id}/retry-promotion against a
    failed row resets status to 'draft' and clears promotion_error.

    We seed a recipe row directly into the rolled-back test session (no
    BackgroundTask plumbing required) and assert the synchronous reset
    observable in the response and on a follow-up GET. The retry
    BackgroundTask is queued by the endpoint but its completion is not
    asserted here — the photo-path retry is TODO(productize) and the
    voice-path's re-promotion is exercised by Plan 16-05's E2E spec.
    """
    member = _seeded_member(db_session)

    # Seed a failed-state recipe directly. A voice turn is inserted so
    # retry_promotion (→ promote_draft) has a transcript to re-feed.
    failed = Recipe(
        household_id=member.household_id,
        created_by_member_id=member.id,
        status="failed",
        title="(extraction en cours…)",
        photo_paths=[],
        mood=[],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
        promotion_error="prior failure to be cleared",
        promotion_attempts=1,
    )
    db_session.add(failed)
    db_session.flush()  # need failed.id for turn FK
    db_session.add(
        RecipeTurn(
            id=uuid.uuid4(),
            recipe_id=failed.id,
            position=0,
            sender="user",
            kind="voice",
            payload={"transcript": "test"},
        )
    )
    db_session.commit()
    db_session.refresh(failed)

    # POST retry-promotion. The endpoint's synchronous body:
    #   - resets recipe.status from 'failed' to 'draft'
    #   - clears recipe.promotion_error
    #   - broadcasts recipe.created
    #   - queues retry_promotion as a BackgroundTask
    resp = client.post(
        f"/recipes/{failed.id}/retry-promotion",
        headers=AUTH_HEADERS,
    )
    # 202 ACCEPTED per the endpoint's status_code declaration.
    assert resp.status_code == 202, resp.text

    # Follow-up GET reflects the synchronous post-state. Note: by the time
    # this GET returns, the retry BackgroundTask may have RE-failed (the
    # monkeypatched stub is NOT in place for THIS test, so the real
    # extract_from_transcript is invoked, which short-circuits to the
    # test-mode canned voice recipe — promoting status to 'structured').
    # We accept either {draft, structured} here because the retry
    # BackgroundTask completion is non-deterministic relative to this GET.
    # The CORE assertion is "status is no longer 'failed' and error cleared".
    db_session.expire_all()
    row = db_session.scalar(select(Recipe).where(Recipe.id == failed.id))
    assert row is not None
    assert row.status in ("draft", "structured"), row.status
    assert row.status != "failed", row.status
    assert row.promotion_error is None, row.promotion_error


# ===========================================================================
# Phase 28 — Task 1: RecipeResponse.manually_edited_fields serialization
# ===========================================================================


def _make_recipe_with_pins(
    db: Session,
    member: Member,
    manually_edited_fields: list[str],
    cuisine: str = "italian",
    description: str = "une description",
    **kwargs,
) -> Recipe:
    """Minimal structured recipe with a specific pin set and optional fields.

    Used by both TestRecipeResponsePinSet and TestPutPinning.
    Callers can override any Recipe field via **kwargs (e.g. mood=["comfort"]).
    The defaults (mood=[], seasonality=..., tags=[]) are only applied when the
    caller does not supply those fields.
    """
    defaults = dict(
        mood=[],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
    )
    defaults.update(kwargs)  # caller overrides win
    r = Recipe(
        household_id=member.household_id,
        created_by_member_id=member.id,
        status="structured",
        title="Risotto test",
        photo_paths=[],
        cuisine=cuisine,
        description=description,
        manually_edited_fields=manually_edited_fields,
        **defaults,
    )
    db.add(r)
    db.flush()
    return r


class TestRecipeResponsePinSet:
    """Phase 28 DETAIL-05 — RecipeResponse serializes manually_edited_fields."""

    def test_recipe_response_serializes_manually_edited_fields(self, db_session: Session) -> None:
        """Non-empty pin set is preserved through model_validate → model_dump."""
        member = _seeded_member(db_session)
        r = _make_recipe_with_pins(db_session, member, ["cuisine", "title"])
        db_session.commit()
        db_session.refresh(r)

        resp = RecipeResponse.model_validate(r)
        data = resp.model_dump()
        assert "manually_edited_fields" in data
        assert data["manually_edited_fields"] == ["cuisine", "title"]

    def test_recipe_response_default_empty_pin_set(self, db_session: Session) -> None:
        """Empty pin set serializes as [] not null."""
        member = _seeded_member(db_session)
        r = _make_recipe_with_pins(db_session, member, [])
        db_session.commit()
        db_session.refresh(r)

        resp = RecipeResponse.model_validate(r)
        assert resp.manually_edited_fields == []

    def test_recipe_response_field_is_in_model_fields(self) -> None:
        """Defensive: manually_edited_fields is declared in RecipeResponse.model_fields.

        This confirms the field survives refactors and is present in the schema
        contract without needing a live DB row. The NOT NULL DEFAULT '[]'::jsonb
        DB constraint means the None case never reaches the wire in production;
        write-side helpers guard with `recipe.manually_edited_fields or []`.
        """
        assert "manually_edited_fields" in RecipeResponse.model_fields
        # The field should have a default_factory of list (not a bare []).
        field_info = RecipeResponse.model_fields["manually_edited_fields"]
        assert field_info.default_factory is list


# ===========================================================================
# Phase 28 — Task 2: _apply_put_pinning helper via PUT /recipes/{id}
# ===========================================================================


class TestPutPinning:
    """Phase 28 DETAIL-05 — PUT /recipes/{id} auto-pin diff logic (T-28-01..T-28-10)."""

    def _make_pinned_recipe(
        self,
        db: Session,
        member: Member,
        pins: list[str] | None = None,
        **field_overrides,
    ) -> Recipe:
        """Create a recipe with the given initial pin set and field values."""
        return _make_recipe_with_pins(
            db,
            member,
            manually_edited_fields=pins or [],
            **field_overrides,
        )

    def test_put_pin_on_changed_cuisine(self, client: TestClient, db_session: Session) -> None:
        """T-28-01: changing cuisine pins it."""
        member = _seeded_member(db_session)
        recipe = self._make_pinned_recipe(db_session, member, cuisine="italian")
        db_session.commit()

        resp = client.put(
            f"/recipes/{recipe.id}",
            headers=AUTH_HEADERS,
            json={"cuisine": "french"},
        )
        assert resp.status_code == 200, resp.text
        db_session.expire_all()
        db_session.refresh(recipe)
        assert recipe.cuisine == "french"
        assert "cuisine" in recipe.manually_edited_fields

    def test_put_no_pin_on_same_value(self, client: TestClient, db_session: Session) -> None:
        """T-28-02: re-saving the same cuisine value is a no-op — no spurious pin."""
        member = _seeded_member(db_session)
        recipe = self._make_pinned_recipe(db_session, member, cuisine="italian")
        db_session.commit()

        resp = client.put(
            f"/recipes/{recipe.id}",
            headers=AUTH_HEADERS,
            json={"cuisine": "italian"},
        )
        assert resp.status_code == 200, resp.text
        db_session.expire_all()
        db_session.refresh(recipe)
        assert recipe.manually_edited_fields == []

    def test_put_unpin_on_blank_description(self, client: TestClient, db_session: Session) -> None:
        """T-28-03: clearing description to "" unpins it.

        Note: title has min_length=1 so clearing title to "" returns 422.
        We use description (no min_length constraint) to exercise the string
        blank-unpin path per D-09.
        """
        member = _seeded_member(db_session)
        recipe = self._make_pinned_recipe(
            db_session, member, pins=["description"], description="du texte"
        )
        db_session.commit()

        resp = client.put(
            f"/recipes/{recipe.id}",
            headers=AUTH_HEADERS,
            json={"description": ""},
        )
        assert resp.status_code == 200, resp.text
        db_session.expire_all()
        db_session.refresh(recipe)
        assert "description" not in recipe.manually_edited_fields

    def test_put_unpin_on_empty_list_ingredients(
        self, client: TestClient, db_session: Session
    ) -> None:
        """T-28-04: clearing ingredients to [] unpins it."""
        member = _seeded_member(db_session)
        recipe = self._make_pinned_recipe(
            db_session,
            member,
            pins=["ingredients"],
            ingredients=[{"name": "oeuf"}],
        )
        db_session.commit()

        resp = client.put(
            f"/recipes/{recipe.id}",
            headers=AUTH_HEADERS,
            json={"ingredients": []},
        )
        assert resp.status_code == 200, resp.text
        db_session.expire_all()
        db_session.refresh(recipe)
        assert "ingredients" not in recipe.manually_edited_fields
        assert recipe.ingredients == []

    def test_put_unpin_on_null_prep_time(self, client: TestClient, db_session: Session) -> None:
        """T-28-05: clearing prep_time_minutes to null unpins it."""
        member = _seeded_member(db_session)
        recipe = self._make_pinned_recipe(
            db_session,
            member,
            pins=["prep_time_minutes"],
            prep_time_minutes=10,
        )
        db_session.commit()

        resp = client.put(
            f"/recipes/{recipe.id}",
            headers=AUTH_HEADERS,
            json={"prep_time_minutes": None},
        )
        assert resp.status_code == 200, resp.text
        db_session.expire_all()
        db_session.refresh(recipe)
        assert "prep_time_minutes" not in recipe.manually_edited_fields
        assert recipe.prep_time_minutes is None

    def test_put_zero_prep_time_is_valid_not_blank(
        self, client: TestClient, db_session: Session
    ) -> None:
        """T-28-06: setting prep_time_minutes to 0 is a genuine value change (pins it).

        Previous value was 10; new value is 0. 0 is valid per D-09 (not blank);
        the field differs so it gets pinned.
        """
        member = _seeded_member(db_session)
        recipe = self._make_pinned_recipe(
            db_session,
            member,
            pins=["prep_time_minutes"],
            prep_time_minutes=10,
        )
        db_session.commit()

        resp = client.put(
            f"/recipes/{recipe.id}",
            headers=AUTH_HEADERS,
            json={"prep_time_minutes": 0},
        )
        assert resp.status_code == 200, resp.text
        db_session.expire_all()
        db_session.refresh(recipe)
        # 0 differs from 10, so it should stay/become pinned.
        assert "prep_time_minutes" in recipe.manually_edited_fields
        assert recipe.prep_time_minutes == 0

    def test_put_status_change_does_not_pin(self, client: TestClient, db_session: Session) -> None:
        """T-28-07: `status` is not an AnswerField — changing it never pins."""
        member = _seeded_member(db_session)
        recipe = self._make_pinned_recipe(db_session, member)
        db_session.commit()

        resp = client.put(
            f"/recipes/{recipe.id}",
            headers=AUTH_HEADERS,
            json={"status": "verified"},
        )
        assert resp.status_code == 200, resp.text
        db_session.expire_all()
        db_session.refresh(recipe)
        assert recipe.manually_edited_fields == []
        assert recipe.status == "verified"

    def test_recipe_updated_broadcast_carries_pins(
        self, client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """T-28-08: recipe.updated WS broadcast payload includes new manually_edited_fields."""
        member = _seeded_member(db_session)
        recipe = self._make_pinned_recipe(db_session, member, cuisine="italian")
        db_session.commit()

        captured_payloads: list[dict] = []

        async def mock_broadcast(household_id, event, payload):
            if event == "recipe.updated":
                captured_payloads.append(payload)

        monkeypatch.setattr("app.routers.recipes.broadcast_to_household", mock_broadcast)

        resp = client.put(
            f"/recipes/{recipe.id}",
            headers=AUTH_HEADERS,
            json={"cuisine": "french"},
        )
        assert resp.status_code == 200, resp.text
        assert len(captured_payloads) == 1
        assert "manually_edited_fields" in captured_payloads[0]
        assert "cuisine" in captured_payloads[0]["manually_edited_fields"]

    def test_put_pin_on_mood_set_change(self, client: TestClient, db_session: Session) -> None:
        """T-28-09: adding a mood value to the set pins mood."""
        member = _seeded_member(db_session)
        recipe = self._make_pinned_recipe(db_session, member, mood=["comfort"])
        db_session.commit()

        resp = client.put(
            f"/recipes/{recipe.id}",
            headers=AUTH_HEADERS,
            json={"mood": ["comfort", "light"]},
        )
        assert resp.status_code == 200, resp.text
        db_session.expire_all()
        db_session.refresh(recipe)
        assert "mood" in recipe.manually_edited_fields

    def test_put_no_pin_on_mood_reorder(self, client: TestClient, db_session: Session) -> None:
        """T-28-10: same mood set in different order is NOT a genuine change (sort-before-compare)."""
        member = _seeded_member(db_session)
        recipe = self._make_pinned_recipe(db_session, member, mood=["comfort", "light"])
        db_session.commit()

        resp = client.put(
            f"/recipes/{recipe.id}",
            headers=AUTH_HEADERS,
            json={"mood": ["light", "comfort"]},
        )
        assert resp.status_code == 200, resp.text
        db_session.expire_all()
        db_session.refresh(recipe)
        # Same set, different order → no pin change.
        assert "mood" not in recipe.manually_edited_fields
