---
phase: 24
plan: "04"
subsystem: backend-llm
tags: [backend, llm, background-task, gemini, fastapi, invariants, claude-md]
requirements: [RID-04]

dependency_graph:
  requires: [24-03]
  provides: [promote_quick_draft, promote_full_draft, rewrite_title, _record_rewrite_failure]
  affects: [backend/app/services/llm.py, backend/app/routers/recipes.py, CLAUDE.md]

tech_stack:
  added: []
  patterns:
    - "Plain-text Gemini call via response.text (no response_schema for rewrite_title)"
    - "BackgroundTask body opens own SessionLocal (mirrors promote_voice_draft template)"
    - "Failure-mode asymmetry: rewrite failure → status='structured'; extract failure → status='failed'"

key_files:
  created: []
  modified:
    - backend/app/services/llm.py
    - backend/app/services/llm_fixtures.py
    - backend/app/routers/recipes.py
    - backend/app/models/enums.py
    - backend/app/models/recipe.py
    - backend/app/schemas/recipe.py
    - backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py
    - CLAUDE.md

decisions:
  - "D-25: rewrite_title() uses plain-text Gemini call (no response_schema); response.text is the accessor"
  - "D-26: _record_rewrite_failure sets status='structured' NOT 'failed'; recipe is usable without catchy title"
  - "D-27: voice/photo extract prompts gain catchy-title clause inline — no extra Gemini round-trip"
  - "D-28: retry_promotion now dispatches source_capture.type='manual' to promote_full_draft"
  - "D-29: BackgroundTask always wins edit-race (silent overwrite); accepted at couple-scale"
  - "D-30: CLAUDE.md invariant #1 parenthetical added noting v0.5 RID-04 sync→async shift"
  - "D-31: recipe.created broadcasts sync at router; recipe.promoted broadcasts from BackgroundTask"
  - "Deviation: RID-02 backend files (SQLAlchemy columns, Pydantic schemas, enums.py, migration 0007) were missing from worktree after wave-1 merge; auto-fixed inline as Rule 3 (blocking issue)"

metrics:
  duration_minutes: 35
  completed_date: "2026-05-13"
  tasks_completed: 6
  files_modified: 8

commits:
  - hash: "5e6a2ff"
    message: "feat(24-04): llm catchy titles + invariant #1 shift — quick/full-form become async BackgroundTask (RID-04, gh#10)"
  - hash: "e758abe"
    message: "chore(24-04): restore Alembic migration 0007 — cook_time/difficulty/description (RID-02, dropped in wave-1 merge)"
---

# Phase 24 Plan 04: Title Rewrite — SUMMARY

**One-liner:** JWT-like async LLM rewrite via plain-text Gemini for all five capture surfaces — quick/full-form BackgroundTask bodies + voice/photo inline clause + failure asymmetry preserving user's recipe at status='structured'.

## What Was Built

### New symbols in `backend/app/services/llm.py`

| Symbol | Type | Description |
|--------|------|-------------|
| `_REWRITE_TITLE_PROMPT` | constant | Plain-text French catchy-title prompt (verbatim from gh#10 / D-25) |
| `rewrite_title(original_title, recipe_context)` | function | Plain-text Gemini call — `response.text`, no `response_schema`. Test-mode returns `canned_rewritten_title()`. Length-capped at 60 chars. |
| `_record_rewrite_failure(db, recipe, exc)` | function | Sets `status='structured'` (NOT `'failed'`), sets `promotion_error`, increments attempts, commits, refreshes, broadcasts `recipe.promoted`. KEY asymmetry with `_record_failure` per D-26. |
| `promote_quick_draft(recipe_id)` | BackgroundTask body | Opens own `SessionLocal`, calls `rewrite_title`, flips `status='structured'`, broadcasts `recipe.promoted`. Failure routes to `_record_rewrite_failure`. |
| `promote_full_draft(recipe_id)` | BackgroundTask body | Structurally identical to `promote_quick_draft`; separated so `retry_promotion` can dispatch by surface type. |

### Extract prompt extensions (`_EXTRACT_PROMPT_VOICE` + `_EXTRACT_PROMPT_PHOTOS`)

Both prompts gained two additions (combined RID-02 + RID-04 clauses that were missing from worktree):

1. **RID-02 clause:** "Extrais aussi cook_time_minutes (en minutes), difficulty ('easy'/'medium'/'hard'), et description (1-2 phrases résumant la recette)."
2. **RID-04 catchy-title clause (D-27):** "Le champ title doit être une formule courte et accrocheuse en français (max 60 caractères, sans guillemets, sans liste d'ingrédients)."

No extra Gemini round-trip for voice/photo — the catchy title comes from the existing extract call.

### `retry_promotion` extension

Added `if sc_type == "manual":` branch that closes the request DB session and dispatches to `promote_full_draft(recipe_id)`. Quick and full-form both land `source_capture.type == "manual"`. Closes the D-28 "retry endpoint compatibility" requirement.

### Router changes (`backend/app/routers/recipes.py`)

| Endpoint | Before | After |
|----------|--------|-------|
| `POST /recipes` (`create_full`) | `status='structured'`, synchronous | `status='draft'` + `BackgroundTasks` + `promote_full_draft` queued; 3 RID-02 fields written |
| `POST /recipes/quick` (`create_quick`) | `status='draft'`, no BackgroundTask | `status='draft'` + `BackgroundTasks` + `promote_quick_draft` queued |

Both endpoints still broadcast `recipe.created` synchronously before the BackgroundTask (D-31 / invariant #4).

### CLAUDE.md invariant #1

Added parenthetical: "(quick and full-form moved from sync `structured`-on-return to BackgroundTask-based rewrite in v0.5 RID-04 — see `.planning/phases/24-recipe-identity/`)"

Also updated locked vocabularies section to include `Difficulty`.

## Architecture Invariants Verified

| Invariant | Status |
|-----------|--------|
| #1 (five capture surfaces, one shape) | Updated in same commit — now correctly describes async BackgroundTask for all surfaces |
| #4 (realtime contract) | `recipe.created` sync at router + `recipe.promoted` from BackgroundTask — both paths covered |
| #5 (raw inputs forever) | `source_capture.payload.title` preserves user's original title; only `recipe.title` is overwritten |
| #7 (single uvicorn worker) | BackgroundTask runs in-process — no scheduler/pool concern |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing RID-02 backend content in worktree**

- **Found during:** Pre-execution worktree verification
- **Issue:** The wave-1 merge commit (`e33e7dd chore(24): record wave 1 completion`) had unexpectedly DELETED the 0007 Alembic migration and left the worktree without the RID-02 backend changes: SQLAlchemy Recipe model columns (`cook_time_minutes`, `difficulty`, `description`), Pydantic schema extensions, `backend/app/models/enums.py` Difficulty class, `GeminiExtractedRecipe` extensions, `_apply_extracted` extensions. The PLAN (Task 5 acceptance criteria) requires these fields to be written in `create_full` — they're blocking.
- **Fix:** Inline application of all missing RID-02 backend content within this plan's scope: `enums.py` Difficulty class, SQLAlchemy columns + CHECK constraint in `recipe.py`, Pydantic schema fields in `RecipeFullCreate`/`RecipeUpdate`/`RecipeResponse`, `GeminiExtractedRecipe` fields + `_apply_extracted` writes, separate commit for Alembic migration 0007 restoration.
- **Files modified:** `backend/app/models/enums.py`, `backend/app/models/recipe.py`, `backend/app/schemas/recipe.py`, `backend/app/services/llm.py` (GeminiExtractedRecipe + _apply_extracted), `backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py` (restored)
- **Commits:** `5e6a2ff` (inline with all RID-04 changes), `e758abe` (migration restoration)

**2. [Rule 3 - Blocking] Extract prompts missing RID-02 clause**

- **Found during:** Reading current llm.py during execution
- **Issue:** The extract prompts (`_EXTRACT_PROMPT_VOICE`, `_EXTRACT_PROMPT_PHOTOS`) were at their original pre-RID-02 state. The PLAN's Task 4 specified appending the RID-04 catchy-title clause to prompts "already extended by 24-02 Task 5" — but those extensions weren't there.
- **Fix:** Added both the RID-02 clause (cook_time/difficulty/description extraction instruction) AND the RID-04 catchy-title clause to both prompts in a single edit. The combined result matches the intended final state.
- **Commit:** `5e6a2ff`

## Grep Gate Results

All gates from the plan's §Verification section passed:

```
rewrite_title signature: 1 ✓
_REWRITE_TITLE_PROMPT occurrences: 2 ✓
Réécris ce titre: 1 ✓
canned_rewritten_title: 1 ✓
Délices maison (test): 1 ✓
_record_rewrite_failure: 1 ✓
status='structured' in _record_rewrite_failure: present ✓
status='failed' absent in _record_rewrite_failure: 0 ✓
promote_quick_draft signature: 1 ✓
promote_full_draft signature: 1 ✓
rewrite_title(recipe.title, {}): 2 ✓
catchy-title clauses in extract prompts: 2 ✓
manual dispatch in retry_promotion: 1 ✓
BackgroundTasks in router: 5 ✓ (>=3)
promote_full_draft in router: 3 ✓ (>=2)
promote_quick_draft in router: 2 ✓ (>=2)
add_task promote_full_draft: 1 ✓
add_task promote_quick_draft: 1 ✓
CLAUDE.md invariant update: 1 ✓
Invariant #2 preserved: 1 ✓
Invariant #8 preserved: 1 ✓
```

## Provides for Downstream Plans

**RID-05 (24-05 illustration):** The four BackgroundTask bodies (`promote_voice_draft`, `promote_photo_draft`, `promote_quick_draft`, `promote_full_draft`) are the mount points for the new `generate_recipe_illustration()` call. RID-05 extends all four bodies to also generate + sanitize + persist the SVG illustration after the title rewrite.

## Known Stubs

None — all code paths are fully wired. The `recipe_context` parameter of `rewrite_title()` is currently always called with `{}` (future enrichment reserved per D-25 — not a stub, intentional v1 simplification).

## Threat Flags

None beyond what was already in the plan's threat model (T-24-04-01 through T-24-04-07 — all mitigated or accepted per plan).

## Self-Check: PASSED

- `backend/app/services/llm.py` — modified and committed at 5e6a2ff ✓
- `backend/app/services/llm_fixtures.py` — modified and committed at 5e6a2ff ✓
- `backend/app/routers/recipes.py` — modified and committed at 5e6a2ff ✓
- `CLAUDE.md` — modified and committed at 5e6a2ff ✓
- `backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py` — restored and committed at e758abe ✓
- `backend/app/models/enums.py` — modified and committed at 5e6a2ff ✓
- `backend/app/models/recipe.py` — modified and committed at 5e6a2ff ✓
- `backend/app/schemas/recipe.py` — modified and committed at 5e6a2ff ✓
