---
phase: 42-structured-steps-active-cooking-session
plan: "04"
subsystem: frontend
tags: [active-cooking-session, step-navigator, backfill-loader, realtime, la-grille]
dependency_graph:
  requires: [42-01, 42-02, 42-03]
  provides: [ACTV-01, ACTV-02, ACTV-03]
  affects:
    - frontend/lib/recipes.ts
    - frontend/lib/cooking.ts
    - frontend/lib/i18n/fr.json
    - frontend/components/RecipeForm.tsx
    - frontend/app/recipes/[id]/page.tsx
    - frontend/app/recipes/[id]/edit/page.tsx
    - frontend/app/cooking-logs/[id]/active/page.tsx
tech_stack:
  added: []
  patterns:
    - Steps shape detection (StepsState = "empty" | "legacy" | "structured")
    - First-mount backfill trigger via POST /recipes/{id}/extract-steps
    - recipe.updated realtime subscription via useRealtime().onEvent
    - 60s elapsed-time refresh via setInterval + nowTick state
    - Defensive stepIndex clamping (handles Gemini extraction returning fewer steps than user navigated)
key_files:
  created:
    - frontend/app/cooking-logs/[id]/active/page.tsx (274 LOC)
  modified:
    - frontend/lib/recipes.ts (StepEntry type, Recipe.steps non-nullable)
    - frontend/lib/cooking.ts (triggerStepsExtraction helper)
    - frontend/lib/i18n/fr.json (cooking_active.* namespace, 8 keys)
    - frontend/components/RecipeForm.tsx (textarea round-trip with empty refs)
    - frontend/app/recipes/[id]/edit/page.tsx (prefill steps fallback)
    - frontend/app/recipes/[id]/page.tsx (structured step display + legacy fallback)
status: complete
commit_hashes:
  - 99765f4 # foundation TS types + i18n + helper
  - f61a28f # fan-out type fixes (RecipeForm + edit + [id]/page)
  - ee631b6 # /active route page.tsx + eslint-disable-line for deps
---

# Plan 42-04 Summary

ACTV-01/02/03 shipped. The /cooking-logs/[id]/active route exists, renders the sketch §Cuisine session active composition (lines 2015-2058), and handles all three steps-shape states (empty / legacy string[] / structured StepEntry[]) gracefully.

## What was built

### Foundation (commit 99765f4)
- **`StepEntry` TS type** in `frontend/lib/recipes.ts` mirrors backend `StepEntry` (locked-vocabularies discipline per CLAUDE.md). Drift = bug category.
- **`Recipe.steps`** flipped from `string[] | null | undefined` to non-nullable `StepEntry[]`. Aligns with backend `RecipeResponse` always emitting default `[]`.
- **`triggerStepsExtraction(recipeId)`** helper in `lib/cooking.ts` calls `POST /api/recipes/{id}/extract-steps` (Plan 42-03's endpoint).
- **`cooking_active.*` namespace** in `fr.json` (8 keys): close_aria, crumb_started_at, step_count_pin, steps_extracting, step_prev, step_next, finalize_cta, uses_ingredients_label.

### Fan-out type fixes (commit f61a28f)
The TS type change in `recipes.ts` required updating 3 consumers that were OUTSIDE Plan 42-04's declared `files_modified`:

- **`RecipeForm.tsx`** — textarea round-trips StepEntry as `{ text, ingredient_refs: [] }`. Manual-edit path loses ref metadata; follow-up Gemini re-extract restores it.
- **`recipes/[id]/edit/page.tsx`** — prefill.steps fallback when null.
- **`recipes/[id]/page.tsx`** — structured step display: `typeof step === "string" ? step : step.text` (handles both legacy and migrated rows during the backfill transition).

These were necessary type alignment, not scope creep. Compiler would have refused to build otherwise.

### /active route (commit ee631b6)
274-LOC client component delivering:

- **det-top header**: X close (routes to `/cooking-logs/{id}`) + `démarrée à HH:MM · N min` crumb + Geist Mono `étape N/M` pin
- **Progress segments**: M flex-1 bars — prior = terracotta tint 15%, current = terracotta solid, future = hairline border
- **Step text + ingredient-ref line**: Geist 400 text-lg for the instruction; Geist Mono faint for `utilise: 200g riz arborio · 1L bouillon` (name match against `recipe.ingredients[].name`)
- **Navigator footer**: prev (disabled at step 1) + next OR `Terminé · marquer cuisinée` CTA on the last step (routes to `/cooking-logs/{id}/finalize` per D-17)

### Backfill orchestration
- **`detectStepsState(steps)`** returns "empty" | "legacy" | "structured" based on first-element shape
- **Empty + legacy** route to `<BrandLoader />` + trigger backend `extract_and_persist_steps` BackgroundTask via `triggerStepsExtraction()`
- **`recipe.updated` subscription** swaps in the populated recipe when the BackgroundTask commits + broadcasts. Once stepsState transitions to "structured", the loader is replaced by the navigator.

### State posture (D-13)
- `stepIndex` is UI-state only — no server column, no persistence across reload. Couple-scale acceptable.
- `nowTick` refreshes every 60s for crumb elapsed-time.
- Defensive `safeStepIndex = Math.min(stepIndex, totalSteps - 1)` clamps in case Gemini extraction lands a shorter list than the user has navigated.

## Architecture invariants honored

- **#1 backend BackgroundTask pattern**: page never runs Gemini inline; just triggers and waits for broadcast
- **#4 realtime broadcast**: `recipe.updated` subscription via `useRealtime().onEvent`
- **#6 French-only**: all visible strings via `useTranslations("cooking_active")` — zero hardcoded French
- **#8 HttpOnly cookie auth**: `api()` + same-origin `/api/*` rewrite

## ESLint exhaustive-deps suppression (4 sites)

Used `// eslint-disable-line react-hooks/exhaustive-deps` at the dep-array line for:
- Backfill trigger useEffect — deps narrowed to `recipe?.id` (full recipe would re-fire on every realtime update → backend BackgroundTask spam)
- recipe.updated subscription useEffect — deps narrowed to `recipe?.id` (full recipe would cause double-subscription on every setRecipe)
- Two useMemo timers — deps narrowed to `log?.cooked_at` (full log unnecessary; nothing else changes mid-session)

All four are intentional optimizations, documented with WHY comments.

## Files written

- **Created**: `frontend/app/cooking-logs/[id]/active/page.tsx` (274 LOC, lint-clean, type-check clean)
- **Modified**: 6 files (3 in `lib/`, 3 in pages/components — fan-out)

## Test posture

Plan 42-04 covers the route + UI logic; Plan 42-05 covers the Playwright E2E spec. No unit tests added in this plan (the file is mostly React composition + a single state-detection function — `detectStepsState` could be unit-tested in v0.10+ if needed).

## Deferred to v0.10+

- Resume cooking position (D-13 — UI-state only by design)
- Step images per step (sketch shows text + refs only)
- Wake-lock during /active (screen-stays-awake)
- Voice-controlled step navigation
- Step timer per step
- Multi-recipe parallel cooking
