---
phase: 27
plan: 01
subsystem: backend-capture + frontend-helpers
tags: [capture, api, cleanup, phase-27]
dependency_graph:
  requires:
    - 26-03 (POST /recipes/{id}/turns + POST /recipes/{id}/turns/photo — unchanged, these are the turn-write paths)
    - 26-02 (process_thread_turn stub + promote_draft — used by new /promote endpoint)
  provides:
    - POST /recipes (blank draft create, empty body)
    - POST /recipes/{id}/promote (D-13b coalescing promote trigger)
    - createBlankRecipe frontend helper
    - promoteDraft frontend helper
  affects:
    - 27-03 (new /recipes/new page imports createBlankRecipe + promoteDraft)
    - 27-05 (recipe-detail composer uses same /turns endpoints, unchanged)
tech_stack:
  added: []
  patterns:
    - RecipeBlankCreate (strict empty Pydantic model, no fields)
    - D-13b explicit promote endpoint pattern (mirrors /retry-promotion precedent)
key_files:
  created: []
  modified:
    - backend/app/schemas/recipe.py
    - backend/app/routers/recipes.py
    - frontend/lib/recipes.ts
decisions:
  - "D-13 resolved as D-13b: explicit POST /recipes/{id}/promote endpoint rather than coalescing timer (D-13a). Rationale: simpler, precedent exists (/retry-promotion), avoids APScheduler complexity in single-worker setup."
  - "POST /recipes does NOT schedule promote_draft — avoids race with Phase 26 per-turn process_thread_turn BackgroundTasks. promote_draft runs only via POST /promote."
  - "RecipeBlankCreate is a strict empty schema (pass) — no client-supplied fields reach the DB. Title and status are server-stamped."
metrics:
  duration_minutes: 45
  completed_date: "2026-05-13"
  tasks_completed: 3
  files_modified: 3
  lines_added: 152
  lines_deleted: 463
---

# Phase 27 Plan 01: Collapse to Single Chat-Shaped Capture Path Summary

**One-liner:** Deleted 5 legacy capture endpoints + 4 schemas, added `POST /recipes` (blank draft) + `POST /recipes/{id}/promote` (D-13b coalescing trigger), and swapped frontend helpers to `createBlankRecipe` + `promoteDraft`.

## What Was Built

### Backend: `backend/app/schemas/recipe.py`

**Deleted (4 schemas, ~100 lines):**
- `RecipeFullCreate` — full-form create schema (title + all recipe fields)
- `RecipeQuickCreate` — title-only quick-add schema
- `VoiceCaptureRequest` — transcript body for POST /recipes/voice
- `UrlCaptureRequest` — URL body for POST /recipes/url

**Added (1 schema, ~12 lines):**
- `RecipeBlankCreate` — strict empty body (`pass`). Pydantic v2 with `extra="ignore"` default ensures no client fields reach the DB. T-27-01-02 mitigation.

**Kept:** `RecipeUpdate`, `RecipeResponse`, `IngredientItem`, `VoiceModifyRequest`, `PromotionRetryResponse`

### Backend: `backend/app/routers/recipes.py`

**Deleted (4 handlers, ~320 lines):**
- `create_full` — POST /recipes (full-form)
- `create_quick` — POST /recipes/quick
- `create_voice` — POST /recipes/voice
- `create_photo` — POST /recipes/photo
- `create_url` — POST /recipes/url

**Added (2 handlers, ~85 lines):**

`create_blank` — `POST /recipes`:
- Accepts `RecipeBlankCreate` (empty body `{}`)
- Creates `Recipe(status='draft', title='Extraction en cours…', photo_paths=[], mood=[], seasonality=[all 4], tags=[])`
- Does NOT insert a RecipeTurn (Phase 26 D-20 — turns arrive via POST /turns)
- Does NOT schedule `promote_draft` (D-13b — that is POST /promote's job)
- Broadcasts `recipe.created` with `initial_turn_kind=None`
- Returns 201 + RecipeResponse

`promote_recipe` — `POST /recipes/{id}/promote`:
- Validates household membership → 404 on cross-household (T-27-01-03)
- Validates position=0 user turn exists → 422 if absent (T-27-01-04, fail-fast before BackgroundTask)
- Schedules `promote_draft(recipe_id)` as BackgroundTask
- Returns 202 + `{recipe_id, queued: true}`

**Module docstring updated** to list the new 4-endpoint capture surface.

### Frontend: `frontend/lib/recipes.ts`

**Deleted (3 helpers + `API_BASE` constant, ~50 lines):**
- `postVoiceCapture` — POST /api/recipes/voice
- `postPhotoCapture` — POST /api/recipes/photo (multipart, used `API_BASE`)
- `postUrlCapture` — POST /api/recipes/url
- `API_BASE` — only referenced by the deleted `postPhotoCapture`

**Added (2 helpers, ~20 lines):**
- `createBlankRecipe()` — POST /api/recipes with `body: "{}"`, returns `Recipe`
- `promoteDraft(recipeId)` — POST /api/recipes/{id}/promote, returns `{recipe_id, queued}`

**Kept:** `postVoiceModify` (detail page, D-15 untouched), `deleteRecipe`, `postRetryPromotion`, `getSignedPhotoUrl`, `invalidateSignedPhotoUrl`, all type exports

## D-13 Resolution: D-13b Explicit Endpoint

CONTEXT.md D-13 offered two options:
- **D-13a (recommended):** Coalescing timer — `POST /recipes` schedules `promote_draft` after a delay
- **D-13b:** Explicit `POST /recipes/{id}/promote` endpoint

The plan resolved as **D-13b** for these reasons:
1. `/retry-promotion` is a direct precedent in the same file (Phase 16 D-09)
2. D-13a would require APScheduler or asyncio timer management in the single-worker setup (invariant #7) — added complexity for no correctness benefit
3. D-13b is explicit: the frontend controls exactly when promotion fires (after all /turns POSTs complete)
4. The "one Gemini call per Enregistrer" invariant (ADR-0001) is enforced by client behavior, not server coalescing

## Phase 26 BackgroundTask Layering

Phase 26's `POST /turns` handler (D-22 dispatch matrix) schedules:
- `process_thread_turn(recipe_id, turn_id)` for text/voice/photo turns
- `extract_and_process_url_turn(recipe_id, turn_id)` for url turns

These BackgroundTasks continue to fire on every `/turns` POST in Phase 27's save flow. In the same save flow, `POST /promote` schedules `promote_draft(recipe_id)`.

**Why this coexistence is safe today (Phase 27):**
- `process_thread_turn` is a stub body (Phase 26 26-02-PLAN Task 1 — returns immediately without doing real work)
- Only `promote_draft` does meaningful LLM extraction in Phase 27
- Phase 29 fills `process_thread_turn`'s body to emit `summary`/`question`/`advisory` system turns

At Phase 29, both `process_thread_turn` (per-turn) and `promote_draft` (once per save) will run over the same thread. The `promote_draft` path handles the full recipe extraction; `process_thread_turn` handles incremental system-turn emission. They are designed to be complementary, not duplicate, per ADR-0001 §"Full thread re-read every run."

## STRIDE Threat Register (from plan)

| ID | Mitigated By |
|----|-------------|
| T-27-01-01 Spoofing | `current_member` dep (existing HttpOnly cookie auth) — cross-household → 404 |
| T-27-01-02 Tampering | `RecipeBlankCreate` strict `{}` — Pydantic v2 rejects extra keys |
| T-27-01-03 Elevation | `promote_recipe` checks `recipe.household_id == member.household_id` before scheduling |
| T-27-01-04 DoS (empty promote) | 422 returned early; BackgroundTask NOT scheduled on no-turn recipe |
| T-27-01-05 Cost amplification | Accepted at couple-scale |
| T-27-01-06 Legacy endpoint leak | FastAPI returns 404 on POST /recipes/{quick,voice,photo,url} — routes deleted |

## Deviations from Plan

None — plan executed exactly as written. The only deviation was operational: the worktree was initialized from a pre-Phase-25 base requiring a `git checkout HEAD --` to restore the Phase 25/26 working tree before edits could be applied. This is a worktree setup issue, not a code deviation.

## Known Stubs

None. All three files are fully functional with respect to this plan's scope. `process_thread_turn` remains a stub in `backend/app/services/llm.py` (Phase 26 26-02-PLAN scope, documented in `create_blank`'s docstring as the Phase 27→29 layering note).

## Threat Flags

None — no new network endpoints beyond those defined in the plan's threat model. The `POST /recipes/{id}/promote` endpoint is explicitly modeled as T-27-01-03 + T-27-01-04.

## Self-Check

- [x] `backend/app/schemas/recipe.py` — `RecipeBlankCreate` present, legacy schemas absent
- [x] `backend/app/routers/recipes.py` — `create_blank` + `promote_recipe` present, 5 legacy handlers absent
- [x] `frontend/lib/recipes.ts` — `createBlankRecipe` + `promoteDraft` present, 3 legacy helpers absent
- [x] Commit `8f5d3b5` exists
