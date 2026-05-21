"""Phase 42 STEP-01 D-03 — StepEntry + RecipeResponse.steps contract tests.

Asserts the new Pydantic shape for structured steps:
- StepEntry { text: str, ingredient_refs: list[str] = [] }
- RecipeResponse.steps: list[StepEntry] with default_factory=list (never None)

These tests are RED until Task 4 lands the schema changes.
"""

from __future__ import annotations

from uuid import uuid4

import pytest


def test_step_entry_requires_text() -> None:
    """StepEntry requires non-empty text; ingredient_refs defaults to []."""
    from pydantic import ValidationError

    from app.schemas.recipe import StepEntry

    # Default ingredient_refs.
    entry = StepEntry(text="sauter l'oignon")
    assert entry.text == "sauter l'oignon"
    assert entry.ingredient_refs == []

    # Explicit ingredient_refs round-trips through model_dump.
    entry2 = StepEntry(text="ajouter la tomate", ingredient_refs=["tomate"])
    dumped = entry2.model_dump()
    assert dumped == {"text": "ajouter la tomate", "ingredient_refs": ["tomate"]}

    # Missing text is rejected.
    with pytest.raises(ValidationError):
        StepEntry()  # type: ignore[call-arg]


def _minimal_recipe_response_kwargs() -> dict:
    """Minimum required RecipeResponse fields for a successful construct."""
    now_iso = "2026-05-21T12:00:00+00:00"
    return {
        "id": uuid4(),
        "household_id": uuid4(),
        "created_by_member_id": uuid4(),
        "status": "structured",
        "title": "x",
        "photo_paths": [],
        "mood": [],
        "seasonality": [],
        "tags": [],
        "cook_count": 0,
        "created_at": now_iso,
        "updated_at": now_iso,
    }


def test_recipe_response_steps_defaults_empty_list() -> None:
    """RecipeResponse.steps defaults to [] (never None)."""
    from app.schemas.recipe import RecipeResponse

    instance = RecipeResponse(**_minimal_recipe_response_kwargs())
    assert instance.steps == []
    assert instance.model_dump(mode="json")["steps"] == []


def test_recipe_response_accepts_step_entry_list() -> None:
    """RecipeResponse.steps round-trips a list[StepEntry] through model_dump."""
    from app.schemas.recipe import RecipeResponse, StepEntry

    kwargs = _minimal_recipe_response_kwargs()
    kwargs["steps"] = [StepEntry(text="a", ingredient_refs=["b"])]

    instance = RecipeResponse(**kwargs)
    assert instance.steps[0].text == "a"
    assert instance.steps[0].ingredient_refs == ["b"]

    dumped_steps = instance.model_dump(mode="json")["steps"]
    assert dumped_steps == [{"text": "a", "ingredient_refs": ["b"]}]
