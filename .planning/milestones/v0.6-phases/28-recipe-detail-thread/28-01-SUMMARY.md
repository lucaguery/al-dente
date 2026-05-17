---
phase: 28
plan: "01"
subsystem: backend
tags: [pinning, recipe-response, put-handler, tdd, detail-05]
dependency_graph:
  requires:
    - 26-01 (AnswerField literal + _apply_answer_turn/_apply_proposal_accepted idiom)
    - 27-05 (RecipeThread mounted on /recipes/[id]; recipe.updated WS subscription)
  provides:
    - manually_edited_fields on RecipeResponse wire shape (prerequisite for all Phase 28 frontend work)
    - _apply_put_pinning helper (PUT /recipes/{id} auto-pin mechanism)
  affects:
    - 28-02 (frontend vocab plan reads manually_edited_fields from Recipe type)
    - 28-03 (SystemBubble handlers + optimistic state use manually_edited_fields)
    - 28-04 (pin marginalia renders from recipe.manually_edited_fields in WS payloads)
tech_stack:
  added: []
  patterns:
    - diff-based auto-pin with pre-update snapshot (enum-coercion ordering workaround)
    - JSONB full-reassignment idiom (set-semantics + sorted assignment)
    - blank-predicate by field type (mirrors frontend recipe-completeness.ts isFieldFilled)
key_files:
  created: []
  modified:
    - backend/app/schemas/recipe.py
    - backend/app/routers/recipes.py
    - backend/tests/test_recipes.py
decisions:
  - "Call _apply_put_pinning BEFORE the setattr loop with a pre-update snapshot — avoids enum-coercion ordering gotcha (getattr after setattr already holds new value)"
  - "Sort mood/seasonality before comparison to avoid spurious pins on list-reorder (T-28-10)"
  - "Use inline helper in routers/recipes.py next to _apply_answer_turn/_apply_proposal_accepted for visual symmetry; no separate services/pinning.py"
  - "Test T-28-03 uses description (not title) for blank-string unpin path because RecipeUpdate.title has min_length=1 — documented in test comment"
  - "test_recipe_response_default_factory_handles_null replaced with test_recipe_response_field_is_in_model_fields — Pydantic v2 List[str] rejects None at validation time; the None guard lives in write-side helpers (_apply_put_pinning uses 'or []'); DB NOT NULL DEFAULT prevents None in production"
metrics:
  duration: "4 minutes"
  completed_date: "2026-05-17"
  tasks_completed: 2
  files_modified: 3
---

# Phase 28 Plan 01: Backend PUT Pinning Foundation — Summary

Backend foundation for DETAIL-05: `RecipeResponse.manually_edited_fields` serialized to the wire + `_apply_put_pinning` diff-based auto-pin helper integrated into `PUT /recipes/{id}`.

## What Was Built

### Task 1 — RecipeResponse.manually_edited_fields field (TDD GREEN)

Added `manually_edited_fields: List[str] = Field(default_factory=list)` to `RecipeResponse` in `backend/app/schemas/recipe.py` (between `tags: List[str]` and `last_cooked_at`). This single-line addition makes every HTTP read endpoint and every `recipe.updated` WebSocket broadcast carry the current pin set — no change needed to `_to_response` or `_to_response_payload` since `model_validate(r)` automatically picks up the new field via `from_attributes=True`.

Three tests in `TestRecipeResponsePinSet` verify: non-empty list round-trips correctly, empty list serializes as `[]`, and the field is declared with `default_factory=list` in `model_fields`.

### Task 2 — _apply_put_pinning helper + update_recipe integration (TDD GREEN)

**Module-level additions to `backend/app/routers/recipes.py`:**
- `get_args` added to the `typing` import
- `AnswerField` imported from `app.schemas.recipe_turn`
- `_ANSWER_FIELD_SET: frozenset[str] = frozenset(get_args(AnswerField))` — single-source gate for eligible fields
- `_STRING/INT/LIST_ANSWER_FIELDS` frozensets for blank-predicate dispatch
- `_is_blank_for_field(field_name, value) -> bool` — mirrors `frontend/lib/recipe-completeness.ts::isFieldFilled` exactly (string = None or strip=="", int = None only, list = None or len==0)

**`_apply_put_pinning(db, recipe, body, pre_update_snapshot)` helper** placed after `_apply_proposal_accepted` for visual symmetry. Algorithm:
1. Iterate over `body.model_dump(exclude_unset=True)` for AnswerField-eligible keys only
2. Coerce `new_value` to match the DB storage shape (enum `.value`, sorted list for mood/seasonality, `model_dump()` for ingredients)
3. Sort both sides for mood/seasonality (list-order gotcha)
4. If blank → `current_pins.discard(field_name)` (unpin, D-09)
5. If differs from old snapshot → `current_pins.add(field_name)` (pin, D-08)
6. Full JSONB reassignment: `recipe.manually_edited_fields = sorted(current_pins)`

**`update_recipe` handler modification:** Two lines inserted between the 404-guard and the `data = body.model_dump(...)` line:
```python
pre_update_snapshot = {field: getattr(r, field, None) for field in _ANSWER_FIELD_SET}
_apply_put_pinning(db, r, body, pre_update_snapshot)
```

`_UPDATE_FORBIDDEN_FIELDS` is untouched — `manually_edited_fields` remains defense-in-depth protected.

**10 tests in `TestPutPinning`** cover: T-28-01 (changed cuisine pins), T-28-02 (same value no-op), T-28-03 (blank description unpins), T-28-04 (empty list unpins ingredients), T-28-05 (null int unpins), T-28-06 (zero int pins — valid, not blank), T-28-07 (status non-AnswerField no-op), T-28-08 (WS broadcast carries new pins), T-28-09 (mood set change pins), T-28-10 (mood reorder no-op).

## Test Results

```
30 passed, 3 warnings in 0.74s
  tests/test_recipes.py: 15 passed (2 existing + 3 PinSet + 10 PutPinning)
  tests/test_turns.py: 15 passed (all existing — zero regression)
```

The 3 deprecation warnings (`HTTP_422_UNPROCESSABLE_ENTITY`) are pre-existing from Phase 26 and not introduced by this plan.

## Deviations from Plan

### Rule 1 — test_recipe_response_default_factory_handles_null adjusted

The plan called for a third `RecipeResponse` test confirming that `None` from the column still serializes as `[]`. At RED-phase run, Pydantic v2 raises `ValidationError` on `None` for `List[str]` (not `Optional[List[str]]`). The plan's proposed assertion `"no crash"` was incorrect.

- **Decision:** Keep `List[str]` (not Optional) because the DB has `NOT NULL DEFAULT '[]'::jsonb` and the write-side helpers guard with `recipe.manually_edited_fields or []`. None will never reach the wire in production.
- **Fix:** Replaced the test with `test_recipe_response_field_is_in_model_fields` which verifies the field exists in `model_fields` with `default_factory=list` — more useful as a refactor canary.
- **Impact:** Equivalent coverage; no schema change required.

### Rule 1 — _make_recipe_with_pins kwarg conflict fixed

Tests T-28-09 and T-28-10 pass `mood=["comfort", "light"]` via `**kwargs` to `_make_recipe_with_pins`, which also hardcoded `mood=[]` in the `Recipe(...)` constructor — triggering `TypeError: multiple values for keyword argument 'mood'`.

- **Fix:** Refactored `_make_recipe_with_pins` to collect defaults in a `dict`, apply `defaults.update(kwargs)` so caller overrides win, then splat into `Recipe(...)`. Clean pattern, no logic change.

## Known Stubs

None. This plan's outputs are fully wired: the field is on `RecipeResponse`, the helper is integrated into `update_recipe`, and the WS broadcast payload now carries `manually_edited_fields` automatically.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `backend/app/schemas/recipe.py` exists | FOUND |
| `backend/app/routers/recipes.py` exists | FOUND |
| `backend/tests/test_recipes.py` exists | FOUND |
| Commit `78ff0f1` exists | FOUND |
| `manually_edited_fields: List[str]` on line 155 of `recipe.py` | FOUND |
| `_apply_put_pinning` count in `recipes.py` >= 3 | 3 matches |
| `manually_edited_fields in RecipeResponse.model_fields` | True |
| All 30 tests pass (`test_recipes.py` + `test_turns.py`) | 30 passed |
