---
phase: 29-llm-prompt-rework-completeness-wire-up
plan: "02"
subsystem: backend-completeness
tags: [completeness, tdd, parity, locked-vocabulary, python-port]
dependency_graph:
  requires: []
  provides: [backend/app/services/completeness.py]
  affects: [backend/app/services/llm.py, backend/app/routers/recipes.py]
tech_stack:
  added: []
  patterns: [tdd-red-green, locked-vocabulary-parity, pure-function-module]
key_files:
  created:
    - backend/app/services/completeness.py
    - backend/tests/test_completeness.py
  modified: []
decisions:
  - "FIELD_KEYS tuple evaluation order locked byte-for-byte with frontend/lib/recipe-completeness.ts"
  - "OPTIONS_MAP imports _VALID_* frozensets from schemas/recipe_turn.py (drift-free single source)"
  - "is_conflict returns False for unknown fields (defensive default)"
  - "Test _make_recipe helper uses {**kwargs, key: val} dict-merge pattern to override recipe fields"
metrics:
  duration: "272s (~4m)"
  completed_at: "2026-05-17"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 29 Plan 02: Backend Completeness Module Summary

**One-liner:** Python port of `frontend/lib/recipe-completeness.ts` with drift-free `OPTIONS_MAP` import chain and D-16 `is_conflict` predicate, verified by 44 parity tests (RED→GREEN TDD).

## What Was Built

`backend/app/services/completeness.py` — the canonical D-15 server-side parallel of `frontend/lib/recipe-completeness.ts`. Exposes:

| Export | Purpose |
|--------|---------|
| `FIELD_KEYS` | 11-field tuple in canonical evaluation order (byte-for-byte TS parity) |
| `is_field_filled(recipe, key)` | Strict non-empty rule: string trim+non-empty, number not-null, list len>0 (D-18) |
| `compute_completeness(recipe)` | Returns `(percent: int, missing_fields: list[FieldKey])` in FIELD_KEYS order |
| `INPUT_TYPE_MAP` | chip/stepper/text/None per field (D-10; ingredients/steps=None=SKIP) |
| `_FIELD_PROMPTS_FR` | 9 locked French prompt strings per D-14 |
| `_FIELD_LABELS_FR` | 11 French field labels per D-06 |
| `OPTIONS_MAP` | Chip option lists imported from `_VALID_*` frozensets in `schemas/recipe_turn.py` |
| `is_conflict(field, current, proposed)` | D-16 strict equality after type-normalize |

`backend/tests/test_completeness.py` — 44 parity tests (ports `frontend/lib/recipe-completeness.test.ts` verbatim + per-decision coverage):

- `test_field_keys_order`: asserts tuple byte-for-byte match with TS
- `test_compute_completeness_*`: full/empty/5-of-11/6-of-11 percent rounding
- `test_string_whitespace_*`: 5 whitespace-only string tests
- `test_number_zero_*`: zero is valid for all 3 number fields
- `test_number_null_is_missing`, `test_array_*`: null/empty edge cases
- `test_input_type_map`: all 11 field input_type values
- `test_field_prompts_fr`: all 9 D-14 locked French strings verbatim
- `test_field_labels_fr`: all 11 D-06 French labels verbatim
- `test_options_map_drift_free`: `OPTIONS_MAP["cuisine"] == sorted(_VALID_CUISINES)` etc.
- `test_is_conflict_*`: string/enum/number/unordered-list/ordered-list coverage (18 cases)

## Test Results

```
44 passed in 0.07s
```

Drift gate: `python -c "from app.services.completeness import FIELD_KEYS; assert FIELD_KEYS == ('title', 'description', 'ingredients', 'steps', 'prep_time_minutes', 'cook_time_minutes', 'servings', 'difficulty', 'cuisine', 'mood', 'main_protein')"` — PASS.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 (RED) | `c4ff736` | `test(29-02): RED — parity tests for completeness module` |
| Task 2 (GREEN) | `68f4c3e` | `feat(29-02): GREEN — implement completeness module with parity tests passing` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `_make_recipe(**KWARGS, key=val)` keyword collision**
- **Found during:** Task 2 (GREEN run, first test failure)
- **Issue:** `_make_recipe(**FULL_RECIPE_KWARGS, title="   ")` raises `TypeError: got multiple values for keyword argument 'title'` because `FULL_RECIPE_KWARGS` already contains `title`. Python's `**kwargs, key=val` syntax rejects duplicate keys at the call site.
- **Fix:** Changed all override calls to `_make_recipe(**{**FULL_RECIPE_KWARGS, "key": val})` dict-merge pattern.
- **Files modified:** `backend/tests/test_completeness.py` (14 call sites)
- **Commit:** `68f4c3e` (included in GREEN commit)

## Must-Have Status

| Must-Have | Status |
|-----------|--------|
| `compute_completeness(recipe)` returns same percent/missing_fields as TS for parity inputs | PASS — 44 tests confirm |
| FIELD_KEYS evaluation order byte-for-byte with TS | PASS — `test_field_keys_order` asserts exact tuple |
| INPUT_TYPE_MAP returns None for ingredients/steps | PASS — `test_input_type_map` covers all 11 fields |
| OPTIONS_MAP draws from `_VALID_*` frozensets (drift-free) | PASS — import chain + `test_options_map_drift_free` |
| is_conflict applies strict equality after type-normalize per D-16 | PASS — 18 is_conflict tests cover all 5 type categories |
| `_FIELD_PROMPTS_FR` and `_FIELD_LABELS_FR` contain locked French strings | PASS — `test_field_prompts_fr` + `test_field_labels_fr` assert every key verbatim |

## Known Stubs

None. Pure-function module with no data source stubs. All constants fully populated from locked decision values.

## Threat Flags

None. Pure-function module with no I/O, no network, no DB writes. OPTIONS_MAP imports from the single source (`schemas/recipe_turn.py`) to prevent vocab drift.

## Self-Check: PASSED

- `backend/app/services/completeness.py` exists: FOUND
- `backend/tests/test_completeness.py` exists: FOUND
- Commit `c4ff736` exists: FOUND
- Commit `68f4c3e` exists: FOUND
- All 44 tests pass: CONFIRMED (0.07s run)
- FIELD_KEYS drift gate: PASSED
