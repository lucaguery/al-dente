---
phase: 24
plan: 02
subsystem: recipe-model
tags: [backend, frontend, alembic, locked-vocabulary, llm, pydantic, recipe-model]
requirements: [RID-02]
dependency_graph:
  requires: []
  provides: [cook_time_minutes-column, difficulty-column-with-CHECK, description-column, Difficulty-enum-both-sides, DifficultyLiteral-pydantic, GeminiExtractedRecipe-extended, _apply_extracted-extended, RecipeForm-3-inputs, detail-page-3-fields, seed-deterministic-values]
  affects: [24-03-completeness, 24-04-title-rewrite, 24-05-illustration]
tech_stack:
  added: []
  patterns: [TEXT+CHECK-constraint, Literal-type-locked-vocabulary, nullable-column-no-server-default, conditional-null-render]
key_files:
  created:
    - backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py
  modified:
    - backend/app/models/recipe.py
    - backend/app/models/enums.py
    - backend/app/schemas/recipe.py
    - backend/app/services/llm.py
    - backend/app/services/llm_fixtures.py
    - backend/app/cli/seed.py
    - frontend/lib/enums.ts
    - frontend/lib/enum-labels.ts
    - frontend/lib/recipes.ts
    - frontend/components/RecipeForm.tsx
    - frontend/app/recipes/[id]/page.tsx
    - frontend/lib/i18n/fr.json
decisions:
  - "D-10: Difficulty enum values locked as exactly easy/medium/hard (lowercase, no underscores) on both sides; drift gate established"
  - "D-11: Three new columns all nullable, no server_default — NULL backfill is the intended nudge per D-16"
  - "D-12: DifficultyLiteral used on write side (Create/Update); plain Optional[str] on RecipeResponse (response relays DB value)"
  - "D-13: Voice and photo extract prompts extended in-place — same Gemini call, no extra round-trip"
  - "D-16: Existing rows get NULL — intentional low CompletenessCard score nudge per gh#22"
  - "Rule 2 auto-add: Recipe TypeScript type in lib/recipes.ts was missing the 3 new fields — added to keep frontend type in sync with RecipeResponse"
metrics:
  duration: "~7 minutes"
  completed_date: "2026-05-13"
  tasks_completed: 8
  tasks_total: 8
  files_created: 1
  files_modified: 12
---

# Phase 24 Plan 02: Recipe Data Model Summary

**One-liner:** Three optional recipe columns (cook_time_minutes INTEGER, difficulty TEXT+CHECK, description TEXT) with locked Difficulty enum on both Python and TypeScript sides, threaded through Pydantic schemas, Gemini extraction pipeline, RecipeForm UI, and recipe detail page.

## What Was Built

RID-02 establishes the data foundation for the Phase 24 recipe-identity cluster. The three new optional columns land via Alembic migration 0007 with NULL backfill (no server_default — intentional per D-16 to produce low CompletenessCard scores as a nudge after RID-03 ships).

### Files Created (1)

- `backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py` — Alembic migration adding cook_time_minutes INTEGER NULL, difficulty TEXT NULL + recipes_difficulty_check CHECK constraint, description TEXT NULL. Revision 0007 / down_revision 0006. Downgrade drops constraint before columns (correct order).

### Files Modified (12)

- `backend/app/models/recipe.py` — 3 new mapped_column declarations after prep_time_minutes; recipes_difficulty_check CheckConstraint added to __table_args__ (cuisine → main_protein → difficulty order)
- `backend/app/models/enums.py` — class Difficulty(str, Enum) with easy/medium/hard appended after Protein
- `backend/app/schemas/recipe.py` — DifficultyLiteral defined; RecipeFullCreate + RecipeUpdate extended with cook_time_minutes (ge=0,le=1440), difficulty (DifficultyLiteral), description (max_length=2000); RecipeResponse extended with nullable fields; RecipeQuickCreate intentionally unchanged
- `backend/app/services/llm.py` — GeminiExtractedRecipe extended with 3 new fields; both _EXTRACT_PROMPT_VOICE and _EXTRACT_PROMPT_PHOTOS gain extraction clause; _apply_extracted writes the 3 fields unconditionally
- `backend/app/services/llm_fixtures.py` — canned_voice_recipe and canned_photo_recipe both include cook_time_minutes, difficulty, description for Playwright determinism
- `backend/app/cli/seed.py` — Difficulty imported; recipes 1/3/6 (poulet-citron/risotto/tarte-tatin) seeded with all 3 new fields covering all difficulty levels (easy/medium/hard)
- `frontend/lib/enums.ts` — export const Difficulty + export type Difficulty appended after Protein
- `frontend/lib/enum-labels.ts` — useEnumLabels() extended with difficulty(v) translator via enums.difficulty namespace
- `frontend/lib/recipes.ts` — Recipe TypeScript type extended with cook_time_minutes/difficulty/description (nullable) to match RecipeResponse
- `frontend/components/RecipeForm.tsx` — RecipeFormValues + RecipeBody extended; recipeToFormValues + formValuesToBody extended; initial state extended; 3 new inputs rendered: cook_time_minutes (Input number), difficulty (Select + NONE_VALUE sentinel), description (Textarea)
- `frontend/app/recipes/[id]/page.tsx` — useEnumLabels + tDetail added; cook_time and difficulty displayed in metadata block when non-null; description rendered as paragraph (whitespace-pre-line) above ingredients when non-empty
- `frontend/lib/i18n/fr.json` — enums.difficulty namespace (Facile/Moyen/Difficile); recipes.new form labels (cook_time_minutes_label, difficulty_label, description_label + placeholders); recipes.detail labels

## Locked Vocabulary

Difficulty enum values are LOCKED as `easy` / `medium` / `hard` on both sides:
- Python: `backend/app/models/enums.py` → `class Difficulty(str, Enum)`
- TypeScript: `frontend/lib/enums.ts` → `export const Difficulty`

Drift check passed: `diff <(grep -oE "easy|medium|hard" enums.py | sort -u) <(grep -oE "easy|medium|hard" enums.ts | sort -u)` — no output.

## Verification Gates Passed

All 8 plan grep gates confirmed:
1. Migration file exists with revision=0007, down_revision=0006, 3 add_column + create_check + 3 drop_column
2. Recipe model has 3 new columns + recipes_difficulty_check in __table_args__
3. Both enum files export Difficulty with identical sorted values (easy/hard/medium)
4. Pydantic schemas: DifficultyLiteral defined + used in Create/Update; RecipeResponse has nullable fields
5. llm.py: GeminiExtractedRecipe extended; "Extrais aussi cook_time_minutes" appears in both prompts; _apply_extracted writes all 3 fields
6. Frontend: 3 form inputs with ids; fr.json has Facile/Moyen/Difficile; enum-labels has difficulty translator
7. Detail page: conditional rendering of all 3 fields (cook_time != null, difficulty truthy, description truthy)
8. Seed: Difficulty imported; 3 recipes seeded with all levels

## Deviations from Plan

### Auto-added Missing Critical Functionality

**1. [Rule 2 - Missing Field] Extended Recipe TypeScript type in lib/recipes.ts**
- **Found during:** Task 6 (RecipeForm.tsx extension)
- **Issue:** `lib/recipes.ts` Recipe type was missing `cook_time_minutes`, `difficulty`, `description` fields. RecipeForm.tsx accesses `r.cook_time_minutes`, `r.difficulty`, `r.description` via `recipeToFormValues(r: Recipe)`. Without the fields on the type, TypeScript would report errors in production builds.
- **Fix:** Added the 3 nullable fields to the Recipe type in `frontend/lib/recipes.ts` to match the extended RecipeResponse schema
- **Files modified:** `frontend/lib/recipes.ts`
- **Commit:** f50455c

## Backfill Posture

Existing rows get NULL for all three columns (no server_default). This is intentional per D-16: existing recipes will show low CompletenessCard scores after RID-03 ships — the intended nudge per gh#22.

## Provides for Downstream Plans

- **RID-03 (CompletenessCard):** The 11-field completeness score derives from the now-extended Recipe model. `useEnumLabels().difficulty()` translator is ready. `cook_time_minutes` and `difficulty` are among the 11 scored fields.
- **RID-04 (title rewrite):** GeminiExtractedRecipe is the schema the new `promote_quick_draft` / `promote_full_draft` BackgroundTasks will operate on — no further model change needed.
- **RID-05 (illustration):** RecipeResponse exposes nullable string fields pattern; `illustration_svg` will be added adjacent to these fields.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 7bb7441 | Alembic migration 0007 |
| 2 | 4f5bd34 | Recipe SQLAlchemy model |
| 3 | f9c6da6 | Difficulty enum both sides |
| 4 | 941efd3 | Pydantic schemas |
| 5 | 62d654e | GeminiExtractedRecipe + prompts + _apply_extracted |
| 6 | f50455c | Difficulty labels + RecipeForm inputs + Recipe type |
| 7 | 4ebe98e | Detail page rendering |
| 8 | 8624c37 | Seed script |

## Self-Check: PASSED

All created/modified files verified:
- `test -f backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py` → present
- All 8 commits present in git log
- Difficulty enum drift check: no diff between Python and TypeScript values
- 3 form input ids present in RecipeForm.tsx
- Conditional rendering of all 3 fields in detail page
- 3 seeded recipes with all 3 new fields in seed.py
