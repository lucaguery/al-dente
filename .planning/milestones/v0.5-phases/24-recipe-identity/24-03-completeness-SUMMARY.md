---
phase: 24
plan: "03"
subsystem: frontend
tags: [frontend, ui, completeness, next-intl, nextjs-app-router, useSearchParams, suspense, recipe-identity]
dependency_graph:
  requires: [24-02]
  provides: [RID-03, CompletenessCard, computeCompleteness, focusRefs, recipe-form-refs]
  affects: [frontend/app/recipes/[id]/page.tsx, frontend/app/recipes/[id]/edit/page.tsx, frontend/components/RecipeForm.tsx]
tech_stack:
  added: []
  patterns:
    - "Inner/Suspense pattern for useSearchParams() in Next.js 16 production builds"
    - "focusRefs prop pattern: edit page owns ref map, passes to RecipeForm (D-23 option A)"
    - "node --experimental-strip-types for TypeScript unit tests without vitest"
key_files:
  created:
    - frontend/lib/recipe-completeness.ts
    - frontend/lib/recipe-completeness.test.ts
    - frontend/components/CompletenessCard.tsx
  modified:
    - frontend/app/recipes/[id]/page.tsx
    - frontend/app/recipes/[id]/edit/page.tsx
    - frontend/components/RecipeForm.tsx
    - frontend/lib/recipes.ts
    - frontend/lib/enums.ts
    - frontend/lib/enum-labels.ts
    - frontend/lib/i18n/fr.json
decisions:
  - "Used RecipeForCompleteness local type in recipe-completeness.ts rather than importing from recipes.ts, since the Recipe type at HEAD was missing cook_time_minutes/difficulty/description"
  - "Option A (D-23): edit page constructs ref map and passes as focusRefs prop — simpler than hook export for single consumer"
  - "Node 24 --experimental-strip-types for running TS unit tests: no vitest/jest installed, no ts-node available, but Node 24 supports direct TS execution"
  - "Restored Difficulty enum to enums.ts and cook_time/difficulty/description to recipes.ts — the Wave 1 HEAD sync commit (e33e7dd) had reverted these; Wave 2 plan re-adds as documented in plan interfaces section"
metrics:
  duration_minutes: 7
  tasks_completed: 5
  tasks_total: 5
  files_created: 3
  files_modified: 7
  completed_date: "2026-05-13"
---

# Phase 24 Plan 03: CompletenessCard Summary

**One-liner:** Client-computed 11-field recipe completeness score with paper-grain nudge card, chip-links to edit page, and Suspense-wrapped `?focus=` scroll/focus wiring.

## What Was Built

### Task 1 — `computeCompleteness()` pure function + unit tests (commit `90c23dd`)

New file `frontend/lib/recipe-completeness.ts`:
- `FieldKey` discriminated union (11 fields exactly per D-17)
- `computeCompleteness(recipe)` → `{ percent: number; missingFields: FieldKey[] }` with strict non-empty rules (D-18) and integer rounding (D-19)
- `isFieldKey()` type guard for `?focus=` URL param validation
- Pure: no React, no DOM, no network

New file `frontend/lib/recipe-completeness.test.ts`:
- 23 tests covering all 11 fields, whitespace/null/empty-array edge cases, zero-is-valid for numbers, percent rounding (5/11→45, 6/11→55), canonical field order
- Runs with: `node --experimental-strip-types lib/recipe-completeness.test.ts`

### Task 2 — `CompletenessCard.tsx` component (commit `36e5fea`)

New file `frontend/components/CompletenessCard.tsx`:
- Returns `null` at 100% (D-20 — no nagging)
- `paper-grain shadow-card` surface matching EmptyState shell
- `role="progressbar"` with `aria-valuenow/min/max`
- Chip row: `<Badge variant="outline" asChild><Link href="/recipes/{id}/edit?focus={fieldKey}">` per D-20
- French labels from `completeness.*` fr.json namespace

### Task 3 — Mount on `/recipes/[id]/page.tsx` (commit `aa6a776`)

- Import + mount `<CompletenessCard recipe={recipe} />` above the metadata pill row
- Component self-gates at 100% (no conditional needed at call site)

### Task 4 — `focusRefs` prop + edit page Suspense/?focus= (commit `810580a`)

`frontend/app/recipes/[id]/edit/page.tsx` rewritten:
- `export default RecipeEditPage` wraps `<EditInner>` in `<Suspense fallback={null}>` per Next.js 16 production requirement (RESEARCH Pitfall 1)
- `EditInner` reads `?focus=` via `useSearchParams()`, validates via `isFieldKey()`
- Builds `focusRefs` map (`Record<FieldKey, RefObject<HTMLElement>>`) with 11 entries
- `useEffect` fires `scrollIntoView + focus` after data loads, then `router.replace(pathname)` strips the param (D-22)

`frontend/components/RecipeForm.tsx` updated:
- New `RecipeFormRefs` type exported (`Partial<Record<FieldKey, RefObject<HTMLElement>>>`)
- Optional `focusRefs?` prop on `Props` type (D-23 option A)
- `ref` attached to all 11 FieldKey input nodes (title Input, description Textarea, ingredients Textarea, steps Textarea, prep_time Input, cook_time Input, servings Input, difficulty SelectTrigger, cuisine SelectTrigger, mood div, main_protein SelectTrigger)
- Added cook_time_minutes Input, difficulty Select, description Textarea (RID-02 D-14 fields restored at Wave 2)

`frontend/lib/recipes.ts`: restored `cook_time_minutes`, `difficulty`, `description` to `Recipe` type
`frontend/lib/enums.ts`: restored `Difficulty` enum (easy/medium/hard)
`frontend/lib/enum-labels.ts`: added `difficulty()` label function

### Task 5 — French labels in `fr.json` (commit `3a2bac9`)

- `completeness.*` namespace: `header`, `progress_aria`, and 10 chip labels (all FieldKeys except title)
- `enums.difficulty`: `easy→Facile`, `medium→Moyen`, `hard→Difficile`
- `recipes.new`: labels for cook_time_minutes, difficulty, description inputs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing fields] Restored RID-02 type/enum fields reverted by Wave 1 HEAD sync**
- **Found during:** Task 4 (pre-flight check)
- **Issue:** The `e33e7dd` "record wave 1 completion" commit (which set the worktree base) had reverted `cook_time_minutes/difficulty/description` from `recipes.ts`, `Difficulty` from `enums.ts`, and labels from `fr.json`. This was noted in the plan's `<interfaces>` section as a contingency: "if cook_time_minutes / difficulty / description are not present, this plan adds them."
- **Fix:** Re-added `cook_time_minutes`, `difficulty`, `description` to `Recipe` type in `recipes.ts`; re-added `Difficulty` enum to `enums.ts`; added `enums.difficulty` to `fr.json`; added `difficulty()` to `enum-labels.ts`
- **Files modified:** `frontend/lib/recipes.ts`, `frontend/lib/enums.ts`, `frontend/lib/enum-labels.ts`, `frontend/lib/i18n/fr.json`
- **Commit:** `810580a` (Task 4)

**2. [Rule 2 - Missing labels] Added RID-02 form labels to `recipes.new` in fr.json**
- **Found during:** Task 5
- **Issue:** `RecipeForm.tsx` references `t("cook_time_minutes_label")`, `t("difficulty_label")`, `t("description_label")` etc. which were also reverted by the same sync commit
- **Fix:** Added all 6 missing `recipes.new` labels in Task 5
- **Commit:** `3a2bac9` (Task 5)

**3. [Rule 3 - Test runner] Used `node --experimental-strip-types` instead of vitest**
- **Found during:** Task 1 (TDD setup)
- **Issue:** Project has no vitest configured (only `@playwright/test` for E2E). `ts-node` not installed. Needed a way to run TypeScript unit tests.
- **Fix:** Node 24.3.0 supports `--experimental-strip-types` for direct TS execution. Tests use only Node's built-in `assert/strict` module — zero new dependencies.
- **Run command:** `node --experimental-strip-types lib/recipe-completeness.test.ts`

## Known Stubs

None — all chip labels are wired to real fr.json keys; `computeCompleteness()` scores real recipe fields; `CompletenessCard` renders real data.

## Threat Flags

None — the completeness card is read-only (no mutations). The `?focus=` param is validated via `isFieldKey()` before use and never rendered as HTML — only used as an object key lookup. No new network endpoints or auth surfaces introduced.

## Self-Check

| Check | Result |
|-------|--------|
| `frontend/lib/recipe-completeness.ts` exists | FOUND |
| `frontend/lib/recipe-completeness.test.ts` exists | FOUND |
| `frontend/components/CompletenessCard.tsx` exists | FOUND |
| Commit `90c23dd` (Task 1) | FOUND |
| Commit `36e5fea` (Task 2) | FOUND |
| Commit `aa6a776` (Task 3) | FOUND |
| Commit `810580a` (Task 4) | FOUND |
| Commit `3a2bac9` (Task 5) | FOUND |

## Self-Check: PASSED
