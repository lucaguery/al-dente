"""Phase 29 LLM-03 — parity test suite for backend/app/services/completeness.py.

Ports frontend/lib/recipe-completeness.test.ts verbatim where possible,
then adds per-decision pytest coverage for D-10, D-14, D-06, D-16.

Pure-function tests: no DB session required. Recipe instances are built
in-memory via _make_recipe(); completeness.py helpers read ORM attributes
directly with getattr() — no DB round-trip needed.

RED state: module app.services.completeness does NOT exist yet.
All tests will fail with ModuleNotFoundError on collection. That is the
expected RED state for the TDD cycle.
"""
from __future__ import annotations

from uuid import uuid4

import pytest

from app.models.recipe import Recipe
from app.schemas.recipe_turn import (
    _VALID_CUISINES,
    _VALID_DIFFICULTIES,
    _VALID_MOODS,
    _VALID_PROTEINS,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_recipe(**overrides) -> Recipe:
    """Build a Recipe ORM instance with sane defaults for completeness tests.

    No DB session — these are pure-function tests on the helper module.
    """
    defaults = dict(
        id=uuid4(),
        household_id=uuid4(),
        created_by_member_id=uuid4(),
        status="structured",
        title="",  # overridden per test
        photo_paths=[],
        ingredients=None,
        steps=None,
        manually_edited_fields=[],
        prep_time_minutes=None,
        cook_time_minutes=None,
        difficulty=None,
        description=None,
        servings=None,
        cuisine=None,
        mood=[],
        main_protein=None,
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
        cook_count=0,
    )
    defaults.update(overrides)
    return Recipe(**defaults)


# Full recipe — all 11 fields filled
FULL_RECIPE_KWARGS = dict(
    title="Pâtes carbonara",
    description="Un classique romain crémeux.",
    ingredients=[{"name": "pancetta", "quantity": 150, "unit": "g"}],
    steps=["Cuire les pâtes", "Mélanger les oeufs"],
    prep_time_minutes=10,
    cook_time_minutes=15,
    servings=2,
    difficulty="medium",
    cuisine="italian",
    mood=["quick"],
    main_protein="egg",
)

# Title-only recipe — only title present (1/11)
TITLE_ONLY_KWARGS = dict(
    title="Pâtes carbonara",
    description=None,
    ingredients=None,
    steps=None,
    prep_time_minutes=None,
    cook_time_minutes=None,
    servings=None,
    difficulty=None,
    cuisine=None,
    mood=[],
    main_protein=None,
)


# ---------------------------------------------------------------------------
# Import the module under test (will fail with ModuleNotFoundError in RED state)
# ---------------------------------------------------------------------------

from app.services.completeness import (  # noqa: E402  (intentional — RED state)
    FIELD_KEYS,
    INPUT_TYPE_MAP,
    OPTIONS_MAP,
    _FIELD_LABELS_FR,
    _FIELD_PROMPTS_FR,
    compute_completeness,
    is_conflict,
    is_field_filled,
)


# ---------------------------------------------------------------------------
# 1. FIELD_KEYS ordering (byte-for-byte parity with TS)
# ---------------------------------------------------------------------------


def test_field_keys_order():
    """FIELD_KEYS must match frontend/lib/recipe-completeness.ts byte-for-byte (D-15)."""
    assert FIELD_KEYS == (
        "title",
        "description",
        "ingredients",
        "steps",
        "prep_time_minutes",
        "cook_time_minutes",
        "servings",
        "difficulty",
        "cuisine",
        "mood",
        "main_protein",
    )


# ---------------------------------------------------------------------------
# 2. compute_completeness — ported from recipe-completeness.test.ts
# ---------------------------------------------------------------------------


def test_compute_completeness_full_recipe():
    """100% complete recipe → percent=100, missing_fields=[]."""
    recipe = _make_recipe(**FULL_RECIPE_KWARGS)
    percent, missing = compute_completeness(recipe)
    assert percent == 100
    assert missing == []


def test_compute_completeness_empty_recipe():
    """Title-only recipe → percent=9 (1/11 = 9.09% → rounds to 9), 10 missing."""
    recipe = _make_recipe(**TITLE_ONLY_KWARGS)
    percent, missing = compute_completeness(recipe)
    assert percent == 9
    assert len(missing) == 10
    assert "title" not in missing
    # All other fields missing in FIELD_KEYS order
    expected = [
        "description",
        "ingredients",
        "steps",
        "prep_time_minutes",
        "cook_time_minutes",
        "servings",
        "difficulty",
        "cuisine",
        "mood",
        "main_protein",
    ]
    assert missing == expected


def test_compute_completeness_partial_5_of_11():
    """5/11 filled → percent=45 (round(5/11*100) = round(45.45) = 45)."""
    kwargs = {**TITLE_ONLY_KWARGS, "description": "Desc", "ingredients": [{"name": "sel"}], "steps": ["Cuire"], "prep_time_minutes": 5}
    recipe = _make_recipe(**kwargs)
    percent, missing = compute_completeness(recipe)
    assert percent == 45


def test_compute_completeness_partial_6_of_11():
    """6/11 filled → percent=55 (round(6/11*100) = round(54.54) = 55)."""
    kwargs = {**TITLE_ONLY_KWARGS, "description": "Desc", "ingredients": [{"name": "sel"}], "steps": ["Cuire"], "prep_time_minutes": 5, "cook_time_minutes": 10}
    recipe = _make_recipe(**kwargs)
    percent, missing = compute_completeness(recipe)
    assert percent == 55


# ---------------------------------------------------------------------------
# 3. is_field_filled — string rules
# ---------------------------------------------------------------------------


def test_string_whitespace_is_missing():
    """Whitespace-only string fields → missing (trim+empty rule, D-18)."""
    recipe = _make_recipe(**{**FULL_RECIPE_KWARGS, "title": "   "})
    percent, missing = compute_completeness(recipe)
    assert "title" in missing
    assert percent < 100


def test_string_whitespace_description_is_missing():
    recipe = _make_recipe(**{**FULL_RECIPE_KWARGS, "description": "  "})
    _, missing = compute_completeness(recipe)
    assert "description" in missing


def test_string_whitespace_difficulty_is_missing():
    recipe = _make_recipe(**{**FULL_RECIPE_KWARGS, "difficulty": "\t"})
    _, missing = compute_completeness(recipe)
    assert "difficulty" in missing


def test_string_whitespace_cuisine_is_missing():
    recipe = _make_recipe(**{**FULL_RECIPE_KWARGS, "cuisine": " "})
    _, missing = compute_completeness(recipe)
    assert "cuisine" in missing


def test_string_whitespace_main_protein_is_missing():
    recipe = _make_recipe(**{**FULL_RECIPE_KWARGS, "main_protein": " "})
    _, missing = compute_completeness(recipe)
    assert "main_protein" in missing


# ---------------------------------------------------------------------------
# 4. is_field_filled — number rules (D-18: zero is valid)
# ---------------------------------------------------------------------------


def test_number_zero_is_filled():
    """prep_time_minutes=0 → field IS filled (D-18 strict rule: 0 is valid)."""
    recipe = _make_recipe(**{**FULL_RECIPE_KWARGS, "prep_time_minutes": 0})
    _, missing = compute_completeness(recipe)
    assert "prep_time_minutes" not in missing


def test_number_zero_cook_time_is_filled():
    recipe = _make_recipe(**{**FULL_RECIPE_KWARGS, "cook_time_minutes": 0})
    _, missing = compute_completeness(recipe)
    assert "cook_time_minutes" not in missing


def test_number_zero_servings_is_filled():
    recipe = _make_recipe(**{**FULL_RECIPE_KWARGS, "servings": 0})
    _, missing = compute_completeness(recipe)
    assert "servings" not in missing


def test_number_null_is_missing():
    """prep_time_minutes=None → field is missing."""
    recipe = _make_recipe(**{**FULL_RECIPE_KWARGS, "prep_time_minutes": None})
    _, missing = compute_completeness(recipe)
    assert "prep_time_minutes" in missing


# ---------------------------------------------------------------------------
# 5. is_field_filled — array rules
# ---------------------------------------------------------------------------


def test_array_empty_is_missing():
    """mood=[] → field is missing."""
    recipe = _make_recipe(**{**FULL_RECIPE_KWARGS, "mood": []})
    _, missing = compute_completeness(recipe)
    assert "mood" in missing


def test_array_null_is_missing():
    """ingredients=None → field is missing (None treated as empty)."""
    recipe = _make_recipe(**{**FULL_RECIPE_KWARGS, "ingredients": None})
    _, missing = compute_completeness(recipe)
    assert "ingredients" in missing


def test_array_empty_steps_is_missing():
    recipe = _make_recipe(**{**FULL_RECIPE_KWARGS, "steps": []})
    _, missing = compute_completeness(recipe)
    assert "steps" in missing


def test_array_nonempty_ingredients_is_filled():
    """Single-item ingredients → NOT missing."""
    recipe = _make_recipe(**{**FULL_RECIPE_KWARGS, "ingredients": [{"name": "sel"}]})
    _, missing = compute_completeness(recipe)
    assert "ingredients" not in missing


# ---------------------------------------------------------------------------
# 6. INPUT_TYPE_MAP (D-10)
# ---------------------------------------------------------------------------


def test_input_type_map():
    """INPUT_TYPE_MAP must match D-10 exactly (chip/stepper/text/None)."""
    # chip fields (chip-single + chip-multi both map to "chip")
    assert INPUT_TYPE_MAP["cuisine"] == "chip"
    assert INPUT_TYPE_MAP["difficulty"] == "chip"
    assert INPUT_TYPE_MAP["main_protein"] == "chip"
    assert INPUT_TYPE_MAP["mood"] == "chip"
    # stepper fields
    assert INPUT_TYPE_MAP["prep_time_minutes"] == "stepper"
    assert INPUT_TYPE_MAP["cook_time_minutes"] == "stepper"
    assert INPUT_TYPE_MAP["servings"] == "stepper"
    # text fields
    assert INPUT_TYPE_MAP["title"] == "text"
    assert INPUT_TYPE_MAP["description"] == "text"
    # SKIP fields (D-10 — no question emitted for list fields)
    assert INPUT_TYPE_MAP["ingredients"] is None
    assert INPUT_TYPE_MAP["steps"] is None


# ---------------------------------------------------------------------------
# 7. _FIELD_PROMPTS_FR (D-14 locked strings)
# ---------------------------------------------------------------------------


def test_field_prompts_fr():
    """Every locked French prompt per D-14 must be present verbatim."""
    assert _FIELD_PROMPTS_FR["title"] == "Quel est le titre de cette recette ?"
    assert _FIELD_PROMPTS_FR["description"] == "En une phrase, comment décrirais-tu cette recette ?"
    assert _FIELD_PROMPTS_FR["prep_time_minutes"] == "Combien de minutes de préparation ?"
    assert _FIELD_PROMPTS_FR["cook_time_minutes"] == "Combien de minutes de cuisson ?"
    assert _FIELD_PROMPTS_FR["servings"] == "Pour combien de personnes ?"
    assert _FIELD_PROMPTS_FR["difficulty"] == "Quel niveau de difficulté ?"
    assert _FIELD_PROMPTS_FR["cuisine"] == "Quelle cuisine ?"
    assert _FIELD_PROMPTS_FR["mood"] == "Quelle ambiance ?"
    assert _FIELD_PROMPTS_FR["main_protein"] == "Quelle protéine principale ?"
    # ingredients and steps intentionally absent (D-10 SKIP)
    assert "ingredients" not in _FIELD_PROMPTS_FR
    assert "steps" not in _FIELD_PROMPTS_FR


# ---------------------------------------------------------------------------
# 8. _FIELD_LABELS_FR (D-06 locked labels)
# ---------------------------------------------------------------------------


def test_field_labels_fr():
    """Every locked French label per D-06 must be present verbatim."""
    assert _FIELD_LABELS_FR["title"] == "titre"
    assert _FIELD_LABELS_FR["description"] == "description"
    assert _FIELD_LABELS_FR["ingredients"] == "ingrédients"
    assert _FIELD_LABELS_FR["steps"] == "étapes"
    assert _FIELD_LABELS_FR["prep_time_minutes"] == "préparation"
    assert _FIELD_LABELS_FR["cook_time_minutes"] == "cuisson"
    assert _FIELD_LABELS_FR["servings"] == "personnes"
    assert _FIELD_LABELS_FR["difficulty"] == "difficulté"
    assert _FIELD_LABELS_FR["cuisine"] == "cuisine"
    assert _FIELD_LABELS_FR["mood"] == "ambiance"
    assert _FIELD_LABELS_FR["main_protein"] == "protéine"


# ---------------------------------------------------------------------------
# 9. OPTIONS_MAP — drift-free import from _VALID_* frozensets (D-15)
# ---------------------------------------------------------------------------


def test_options_map_drift_free():
    """OPTIONS_MAP must equal sorted(_VALID_*) frozensets — proves drift-free import chain."""
    assert OPTIONS_MAP["cuisine"] == sorted(_VALID_CUISINES)
    assert OPTIONS_MAP["difficulty"] == sorted(_VALID_DIFFICULTIES)
    assert OPTIONS_MAP["mood"] == sorted(_VALID_MOODS)
    assert OPTIONS_MAP["main_protein"] == sorted(_VALID_PROTEINS)


# ---------------------------------------------------------------------------
# 10. is_conflict — string fields (D-16)
# ---------------------------------------------------------------------------


def test_is_conflict_strings_equal_no_conflict():
    """Identical stripped strings → no conflict."""
    assert is_conflict("title", "Risotto", "Risotto") is False


def test_is_conflict_strings_trim_no_conflict():
    """Strip-equal strings → no conflict (trim rule per D-16)."""
    assert is_conflict("title", "Risotto", "  Risotto  ") is False


def test_is_conflict_strings_different():
    """Different strings → conflict."""
    assert is_conflict("title", "Risotto", "Pasta") is True


def test_is_conflict_strings_none_vs_nonempty():
    """None vs non-empty string → conflict (None becomes "")."""
    assert is_conflict("title", None, "Risotto") is True


def test_is_conflict_strings_both_none():
    """None vs None → no conflict."""
    assert is_conflict("title", None, None) is False


def test_is_conflict_description_trim():
    """Description field uses same strip equality."""
    assert is_conflict("description", "Un plat crémeux.", "  Un plat crémeux.  ") is False


# ---------------------------------------------------------------------------
# 11. is_conflict — enum fields (D-16)
# ---------------------------------------------------------------------------


def test_is_conflict_enums_equal():
    """Same enum literal → no conflict."""
    assert is_conflict("cuisine", "italian", "italian") is False


def test_is_conflict_enums_different():
    """Different enum literals → conflict."""
    assert is_conflict("cuisine", "italian", "french") is True


def test_is_conflict_difficulty_same():
    assert is_conflict("difficulty", "medium", "medium") is False


def test_is_conflict_main_protein_different():
    assert is_conflict("main_protein", "poultry", "fish") is True


# ---------------------------------------------------------------------------
# 12. is_conflict — number fields (D-16)
# ---------------------------------------------------------------------------


def test_is_conflict_numbers_different():
    """Different int values → conflict."""
    assert is_conflict("prep_time_minutes", 30, 35) is True


def test_is_conflict_numbers_equal():
    """Equal int values → no conflict."""
    assert is_conflict("prep_time_minutes", 30, 30) is False


def test_is_conflict_numbers_zero_vs_zero():
    """0 vs 0 → no conflict."""
    assert is_conflict("cook_time_minutes", 0, 0) is False


def test_is_conflict_servings_different():
    assert is_conflict("servings", 2, 4) is True


# ---------------------------------------------------------------------------
# 13. is_conflict — unordered list fields (D-16)
# ---------------------------------------------------------------------------


def test_is_conflict_unordered_lists_equal_order_insensitive():
    """Same elements in different order → no conflict (set equality for mood)."""
    assert is_conflict("mood", ["comfort", "light"], ["light", "comfort"]) is False


def test_is_conflict_unordered_lists_different():
    """Different mood sets → conflict."""
    assert is_conflict("mood", ["comfort"], ["light"]) is True


def test_is_conflict_unordered_lists_empty_vs_empty():
    """Both empty → no conflict."""
    assert is_conflict("mood", [], []) is False


def test_is_conflict_unordered_lists_none_vs_empty():
    """None treated as empty → no conflict vs []."""
    assert is_conflict("mood", None, []) is False


# ---------------------------------------------------------------------------
# 14. is_conflict — ordered list fields / ingredients (D-16)
# ---------------------------------------------------------------------------


def test_is_conflict_ordered_lists_ingredients_identical():
    """Identical ingredient lists → no conflict."""
    ingredients = [{"name": "riz", "quantity": 200, "unit": "g"}]
    assert is_conflict("ingredients", ingredients, ingredients) is False


def test_is_conflict_ordered_lists_ingredients_different():
    """Different ingredient dicts → conflict."""
    assert is_conflict(
        "ingredients",
        [{"name": "riz"}],
        [{"name": "pâtes"}],
    ) is True


def test_is_conflict_steps_same():
    """Identical steps list → no conflict."""
    steps = ["Cuire", "Assaisonner"]
    assert is_conflict("steps", steps, steps) is False


def test_is_conflict_steps_different():
    """Different steps lists → conflict."""
    assert is_conflict("steps", ["Cuire"], ["Cuire", "Assaisonner"]) is True
