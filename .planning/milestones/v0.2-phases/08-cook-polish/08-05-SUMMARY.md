---
phase: 08-cook-polish
plan: 05
subsystem: ui
tags: [next-intl, tailwindv4, framer-motion, paper-grain, slow-food, terracotta, recipes-library, search, react19]

# Dependency graph
requires:
  - phase: 05-design-system-foundation
    provides: paper-grain Tailwind utility, terracotta primary token (--ring), Card primitive, h-12 D-08 floor
  - phase: 06-capture-surfaces-polish
    provides: EmptyState retheme (paper-grain Card + Fraunces italic body)
  - phase: 07-decide-polish
    provides: ShortlistCard frame pattern (paper-grain + warm shadows + rounded-xl)
provides:
  - RecipeCard with paper-grain frame (kitchen-counter card system)
  - SearchInput at 48px D-08 floor with terracotta-30 focus ring + paper-grain wrapper
  - Recipe library 2-col mobile-first responsive grid (md:3, lg:4)
  - Empty-state branches that never split across grid columns
affects: [08-cook-polish remaining plans, future cookbook surfaces, V2 product fork]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Library list rendering pattern: grid container vs empty-state container as mutually exclusive sibling render paths (no col-span-full needed)"
    - "Search input retheme pattern: paper-grain on relative wrapper div with rounded-xl so the grain ::before pseudo-element clips correctly via border-radius: inherit"

key-files:
  created: []
  modified:
    - frontend/components/RecipeCard.tsx
    - frontend/components/SearchInput.tsx
    - frontend/app/recipes/page.tsx

key-decisions:
  - "Empty-state branch extracted outside the grid container (sibling render path) rather than wrapping the EmptyState in col-span-full inside the grid — lower-churn diff, identical visual outcome."
  - "Search-row paper-grain placement on the wrapper div, NOT on the Input primitive — mirrors Phase 5 'inputs are chrome' anti-pattern; grain lives on the bounding box."
  - "Library grid gap = gap-3 (12px) at 2-col mobile baseline — tightest gap that still reads as separated cards (vs. seamless tiles); mirrors Phase 6 PhotoUploader 2x2 photo grid."

patterns-established:
  - "RecipeCard frame pattern: paper-grain prepended to the existing Link className; living-image fetch logic preserved verbatim (no rewrite)"
  - "Library page conditional render: !loading && recipes.length === 0 -> empty-state container; else -> grid container; never both rendered simultaneously"
  - "Header chrome icon-buttons raised to h-12 w-12 floor across all detail-page states (matches Plan 04 recipe-detail header pattern)"

requirements-completed: [COOK-09]

# Metrics
duration: ~9 min
completed: 2026-05-08
---

# Phase 8 Plan 5: Recipe library + SearchInput + grid Summary

**RecipeCard joins the kitchen-counter card system (paper-grain frame), SearchInput field rises to 48px D-08 floor with terracotta-30 focus ring on a paper-grain wrapper, and the recipe library converts from a flex-stack to a responsive 2-col mobile-first grid (md:3 / lg:4) — closing COOK-09 in 3 surgical edits, ~15 lines total.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-05-08T16:01:30Z
- **Completed:** 2026-05-08T16:10:48Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- RecipeCard outer Link now carries `paper-grain` (mirrors Phase 7 ShortlistCard frame pattern); living-image fetch logic, photo region, and body region all preserved byte-for-byte.
- SearchInput wrapper carries `paper-grain rounded-xl`; Input field at `h-12 focus:ring-2 focus:ring-primary/30` (terracotta-30); clear button at `h-12 w-12` (D-08 floor); debounce + AbortController state machine + ARIA labels untouched.
- `/recipes` body restructured: when `recipes.length === 0`, renders an empty-state container at `px-6 pb-24` (no grid); else renders `grid grid-cols-2 gap-3 pb-24 md:grid-cols-3 lg:grid-cols-4`. Header `Plus` button raised to `h-12 w-12`. Sticky chrome (header h-12 + search top-12) preserved verbatim. Realtime listeners (recipe.created/updated/deleted), module-level `recipesCache`, and `handleSearch` callback all untouched.

## Task Commits

Each task was committed atomically (parallel executor mode, --no-verify):

1. **Task 1: Add paper-grain to RecipeCard outer Link** — `48af9f6` (feat)
2. **Task 2: SearchInput retheme — paper-grain wrapper + h-12 field + h-12 w-12 clear + terracotta-30 focus ring** — `6da7cf6` (feat)
3. **Task 3: Library 2-col responsive grid + Plus button h-12 w-12 + empty-state branch restructure** — `b1db835` (feat)

**Plan metadata:** _will be added after this SUMMARY is committed by orchestrator_

## Files Created/Modified

- `frontend/components/RecipeCard.tsx` (+1 / -1 line) — outer Link className gets `paper-grain` prepended (Phase 5 anchor; Phase 7 frame pattern).
- `frontend/components/SearchInput.tsx` (+3 / -3 lines) — wrapper class gets `paper-grain rounded-xl`; Input class becomes `pl-10 pr-10 h-12 focus:ring-2 focus:ring-primary/30`; clear button class becomes `h-12 w-12`.
- `frontend/app/recipes/page.tsx` (+11 / -8 lines) — header Plus gets `className="h-12 w-12"`; body conditional flips to a parent-level branch (empty-state container OR grid container, never both); grid is `grid grid-cols-2 gap-3 pb-24 md:grid-cols-3 lg:grid-cols-4`.

## Decisions Made

- **Empty-state branch placement:** extracted as a sibling render path rather than wrapped in `col-span-full` inside the grid. The 08-UI-SPEC §"Component Inventory" step (4) flagged both options as valid; the lower-churn diff was the executor preference. Visual outcome identical (full-width EmptyState).
- **Plus button as the only header className addition:** the existing `size="icon" variant="ghost"` Button primitive already drives the visual; only the size override (`h-12 w-12`) was needed to clear the D-08 floor. The `Plus` icon stays at `h-5 w-5` (20px inside the 48px square).
- **Grid gap:** `gap-3` (12px), not `gap-4` (16px). Matches Phase 6 PhotoUploader 2x2 grid; tightest gap that still reads as separated cards at 2-col mobile.

## Deviations from Plan

None — plan executed exactly as written. All three tasks landed with the exact className strings prescribed by 08-05-PLAN.md and 08-UI-SPEC.md. No auto-fixes triggered. No architectural decisions raised. No CLAUDE.md adjustments needed.

## Issues Encountered

**Worktree base mismatch (resolved before any edits).** The worktree's HEAD (`5562a86 docs(08): UI design contract for cook polish`) was older than the orchestrator's expected base (`86cd1f9 docs(08): commit phase plans + STATE/ROADMAP for Phase 8 execution`), so the worktree didn't have the PLAN.md files on disk yet. Resolution: ran `git checkout HEAD -- .planning/` to align the worktree's `.planning/` directory with HEAD's tree before starting any task work. (The `git reset --soft 86cd1f9` step from the worktree-branch-check protocol staged deletions that didn't make sense — the underlying issue was a missing checkout, not a base divergence at the commit level. Reset was undone and `checkout HEAD -- .planning/` did the right thing.) No code changes affected; only the planning artifacts were touched.

## Authentication Gates

None — no CLI auth required for this plan.

## User Setup Required

None — no external service configuration required.

## Verification Status

- TypeScript: clean (`npx tsc --noEmit -p tsconfig.json` — zero errors on the 3 modified files)
- ESLint: clean on the 3 modified files (the 2 pre-existing warnings are in `frontend/public/worker-9e66885325cabad7.js`, an untracked generated PWA service-worker artifact present in the working tree before this plan started — see `deferred-items.md`).
- Plan-level acceptance criteria: all 4 success-criteria greps from the orchestrator's prompt pass (paper-grain x1 in RecipeCard.tsx, grid-cols-2 gap-3 x1 in app/recipes/page.tsx, h-12 x2 in SearchInput.tsx, focus:ring-2 focus:ring-primary/30 x1 in SearchInput.tsx).
- Per-task acceptance criteria: all greps from the plan's `<acceptance_criteria>` blocks pass (verified after each task before commit).

## Deferred Issues

See `.planning/phases/08-cook-polish/deferred-items.md` for one out-of-scope item (pre-existing lint warnings in the generated PWA service-worker artifact at `frontend/public/worker-9e66885325cabad7.js`).

## Next Phase Readiness

- Plan 08-05 closes COOK-09 in full. Ready for Plan 08-06 (next plan in Phase 8).
- The `RecipeCard` paper-grain frame is now the shared shape for any future cookbook list surface (recipe library, drafts inbox already retheme-compatible).
- The `SearchInput` retheme is the canonical search-row pattern for any future filter/sort surface in v0.2.

## Self-Check: PASSED

All claims in this SUMMARY verified post-write:

- `frontend/components/RecipeCard.tsx` — modified, line 72 contains `paper-grain flex gap-4 p-3 bg-card rounded-xl ...` (verified via grep)
- `frontend/components/SearchInput.tsx` — modified, line 77 contains `relative paper-grain rounded-xl`, line 86 contains `pl-10 pr-10 h-12 focus:ring-2 focus:ring-primary/30`, line 102 contains `h-12 w-12` (all verified via grep)
- `frontend/app/recipes/page.tsx` — modified, line 118 contains `h-12 w-12`, line 148 contains `grid grid-cols-2 gap-3 pb-24 md:grid-cols-3 lg:grid-cols-4`, line 149 contains `recipes.map((r) => <RecipeCard ...` (all verified via grep)
- Commit `48af9f6` exists (`git log --oneline -10` confirms `48af9f6 feat(08-05): add paper-grain to RecipeCard outer Link`)
- Commit `6da7cf6` exists (`git log --oneline -10` confirms `6da7cf6 feat(08-05): retheme SearchInput with paper-grain, h-12 field, h-12 w-12 clear`)
- Commit `b1db835` exists (`git log --oneline -10` confirms `b1db835 feat(08-05): convert library to 2-col responsive grid + raise Plus to h-12 w-12`)

---
*Phase: 08-cook-polish*
*Completed: 2026-05-08*
