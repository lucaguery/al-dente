"""Phase 29 D-15 — server-side parallel of frontend/lib/recipe-completeness.ts.

Locked-vocabulary discipline per CLAUDE.md §"Locked vocabularies": drift
between FIELD_KEYS / INPUT_TYPE_MAP / _FIELD_PROMPTS_FR / _FIELD_LABELS_FR
/ OPTIONS_MAP in this module and the TS file is a bug category.

Single source for:
  - compute_completeness(recipe) → (percent, missing_fields) — D-15
  - is_conflict(field, current, proposed) → bool — D-16 strict equality after type-normalize
  - INPUT_TYPE_MAP per field — D-10 (None = skip emission)
  - _FIELD_PROMPTS_FR per field — D-14 locked French strings
  - _FIELD_LABELS_FR per field — D-06 chip-label French labels
  - OPTIONS_MAP per chip field — imports _VALID_* frozensets from schemas/recipe_turn.py (drift-free)
"""
from __future__ import annotations

from typing import Any, Literal, Optional

from app.models.recipe import Recipe
from app.schemas.recipe_turn import (
    _VALID_CUISINES,
    _VALID_DIFFICULTIES,
    _VALID_MOODS,
    _VALID_PROTEINS,
)

FieldKey = Literal[
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
]

# Canonical evaluation order — mirrors frontend/lib/recipe-completeness.ts:FIELD_KEYS
# byte-for-byte (D-15). The order is preserved in missing_fields so the
# CompletenessCard chip layout is stable across renders.
FIELD_KEYS: tuple[FieldKey, ...] = (
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


def is_field_filled(recipe: Recipe, key: FieldKey) -> bool:
    """Strict non-empty rule (mirrors TS isFieldFilled at recipe-completeness.ts:80).

    - strings: not None AND .strip() != ""
    - numbers: not None (0 is valid — a 0-minute prep time is a valid input)
    - arrays: len > 0 (None treated as empty)

    Per D-18: zero is explicitly valid for number fields. Whitespace-only
    strings are treated as missing. Empty arrays and None arrays are both
    treated as missing.
    """
    value = getattr(recipe, key)
    if key in ("title", "description", "difficulty", "cuisine", "main_protein"):
        return value is not None and str(value).strip() != ""
    if key in ("prep_time_minutes", "cook_time_minutes", "servings"):
        return value is not None
    # ingredients, steps, mood — list fields
    return isinstance(value, list) and len(value) > 0


def compute_completeness(recipe: Recipe) -> tuple[int, list[FieldKey]]:
    """Returns (percent: int, missing_fields: list[FieldKey]).

    Order of missing_fields preserved per FIELD_KEYS (canonical priority).
    Percent = round((filled / 11) * 100) — Python built-in round() is
    banker's rounding (round-half-to-even), which matches JS Math.round()
    for the cases tested (5/11=45, 6/11=55, 1/11=9, 11/11=100).
    """
    missing: list[FieldKey] = [k for k in FIELD_KEYS if not is_field_filled(recipe, k)]
    filled = len(FIELD_KEYS) - len(missing)
    percent = round((filled / len(FIELD_KEYS)) * 100)
    return percent, missing


# D-10 — input type per field (None = SKIP emission for that field).
# chip-single: cuisine, difficulty, main_protein
# chip-multi: mood (multi=True communicated separately in QuestionTurnPayload)
# stepper: prep_time_minutes, cook_time_minutes, servings
# text: title, description
# SKIP: ingredients, steps — list fields with no good chat affordance
INPUT_TYPE_MAP: dict[FieldKey, Optional[Literal["chip", "stepper", "text"]]] = {
    "title": "text",
    "description": "text",
    "ingredients": None,
    "steps": None,
    "prep_time_minutes": "stepper",
    "cook_time_minutes": "stepper",
    "servings": "stepper",
    "difficulty": "chip",
    "cuisine": "chip",
    "mood": "chip",
    "main_protein": "chip",
}

# D-14 — locked French prompts per field (drift = bug category).
# ingredients / steps intentionally absent — D-10 SKIP (no prompt emission).
_FIELD_PROMPTS_FR: dict[FieldKey, str] = {
    "title": "Quel est le titre de cette recette ?",
    "description": "En une phrase, comment décrirais-tu cette recette ?",
    "prep_time_minutes": "Combien de minutes de préparation ?",
    "cook_time_minutes": "Combien de minutes de cuisson ?",
    "servings": "Pour combien de personnes ?",
    "difficulty": "Quel niveau de difficulté ?",
    "cuisine": "Quelle cuisine ?",
    "mood": "Quelle ambiance ?",
    "main_protein": "Quelle protéine principale ?",
}

# D-06 — French field labels for summary chips ("{label}: {value}").
# Mirrors ANSWER_FIELD_LABELS in frontend/lib/enum-labels.ts (drift = bug category).
_FIELD_LABELS_FR: dict[FieldKey, str] = {
    "title": "titre",
    "description": "description",
    "ingredients": "ingrédients",
    "steps": "étapes",
    "prep_time_minutes": "préparation",
    "cook_time_minutes": "cuisson",
    "servings": "personnes",
    "difficulty": "difficulté",
    "cuisine": "cuisine",
    "mood": "ambiance",
    "main_protein": "protéine",
}

# Chip options drawn from the locked vocab frozensets in schemas/recipe_turn.py
# (drift-free per D-15 — single source, no duplication).
OPTIONS_MAP: dict[FieldKey, list[str]] = {
    "difficulty": sorted(_VALID_DIFFICULTIES),
    "cuisine": sorted(_VALID_CUISINES),
    "mood": sorted(_VALID_MOODS),
    "main_protein": sorted(_VALID_PROTEINS),
}


def is_conflict(field: str, current: Any, proposed: Any) -> bool:
    """Phase 29 D-16 — strict equality after type-normalize.

    True = conflict (the LLM's interpretation differs from the user's pinned value).
    False = no conflict (skip advisory emission for this field).

    Per-type rules:
    - Strings (title, description): strip-and-compare, case-sensitive.
    - Enums (cuisine, difficulty, main_protein): literal inequality.
    - Numbers (prep_time_minutes, cook_time_minutes, servings): integer inequality.
    - Unordered lists (mood, seasonality): set inequality.
    - Ordered lists (ingredients, steps, tags): positional inequality;
      for ingredients, dict-element equality on {name, quantity, unit}.
    - Unknown fields: defensive default = no conflict.
    """
    # Strings (case-sensitive, trim-only)
    if field in ("title", "description"):
        return (current or "").strip() != (proposed or "").strip()

    # Enum scalars — literal inequality
    if field in ("cuisine", "difficulty", "main_protein"):
        return current != proposed

    # Integers — exact inequality (no rounding tolerance per D-16)
    if field in ("prep_time_minutes", "cook_time_minutes", "servings"):
        return current != proposed

    # Unordered list-of-string — set inequality
    if field in ("mood", "seasonality"):
        return set(current or []) != set(proposed or [])

    # Ordered list-of-string
    if field in ("steps", "tags"):
        return list(current or []) != list(proposed or [])

    # ingredients = ordered list-of-dict on {name, quantity, unit}
    if field == "ingredients":
        return list(current or []) != list(proposed or [])

    # Unknown field — defensive: no conflict (don't block on unrecognized fields)
    return False
