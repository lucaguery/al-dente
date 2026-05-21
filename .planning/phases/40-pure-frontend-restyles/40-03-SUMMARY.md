---
phase: 40
plan: 03
subsystem: frontend
tags: [library, la-grille, minimal-view]
requires: []
provides:
  - 3-state LibraryViewSwitch (grid/list/minimal)
  - RecipeRowMinimal component
affects:
  - frontend/components/LibraryViewSwitch.tsx
  - frontend/app/recipes/page.tsx
tech_stack:
  added: []
  patterns:
    - "Text-only list mode using `divide-y divide-border` for hairline separation between rows"
key_files:
  created:
    - frontend/components/RecipeRowMinimal.tsx
    - frontend/tests/e2e/library-minimal-view.spec.ts
  modified:
    - frontend/components/LibraryViewSwitch.tsx
    - frontend/app/recipes/page.tsx
    - frontend/lib/i18n/fr.json
key_decisions:
  - "Library page is at /recipes/page.tsx, NOT /library/page.tsx (planner's `files_modified` was approximate; corrected via grep)"
  - "Existing aria-label pattern in LibraryViewSwitch uses `home.library.view.{key}.aria` — added `home.library.view.minimal.aria` to match; also added `library.minimal.validated_pill` namespace for the RecipeRowMinimal validé pill"
  - "validated prop is stubbed to false (no daily-shortlist wiring) — flagged with TODO(productize) per CONTEXT.md line 61-62"
requirements_completed:
  - LIB-01
duration: "~15 min"
completed: 2026-05-21
---

# Phase 40 Plan 03: Library Minimal View Summary

Added a third "minimal" (text-only) mode to the Bibliothèque view switch and shipped the `RecipeRowMinimal` component (numbered index + name + cuisine meta + optional validé pill, no photo column).

## What was built

- `frontend/components/LibraryViewSwitch.tsx`: extended `LibraryView` type from `"grid" | "list"` to `"grid" | "list" | "minimal"`. Added `AlignJustify` icon import and the third `VIEWS` entry.
- `frontend/components/RecipeRowMinimal.tsx` (61 lines): new component, sibling to `RecipeRow.tsx`. Renders `<Link>` with numbered Geist Mono index + name + cuisine meta + optional `validé` pill (terracotta border, `bg-[var(--color-valide-tint)]`). No photo column, no `useSignedPhotoUrl` import.
- `frontend/app/recipes/page.tsx`: imported `RecipeRowMinimal`, added third render branch for `view === "minimal"` using `divide-y divide-border`, extended the localStorage hydration to accept `"minimal"` as a valid stored value.
- `frontend/lib/i18n/fr.json`: added `library.minimal.validated_pill` ("validé"), `library.view_switch.minimal` ("Vue texte"), and `home.library.view.minimal.aria` ("Vue texte" — matches existing aria-label pattern in the switch component).
- `frontend/tests/e2e/library-minimal-view.spec.ts` (55 lines, 2 tests): minimal mode renders without `<img>`; choice persists across `page.reload()`.

## Deviations from Plan

**[Rule 1 — bug] Plan listed `frontend/app/library/page.tsx` but the actual library route is `/recipes/page.tsx`**
- Found during: Task 3 (wire-up step).
- Issue: `files_modified` referenced `frontend/app/library/page.tsx`, which does not exist. The Bibliothèque page lives at `frontend/app/recipes/page.tsx` (confirmed by `grep -rln "LibraryViewSwitch" frontend/app/`).
- Fix: Wired the third render branch into `/recipes/page.tsx` per the planner's explicit fallback note ("if the route is different ... READ the existing import sites").
- Files modified: `frontend/app/recipes/page.tsx`.
- Verification: Lint clean; minimal branch renders without unhandled cases.

**[Rule 3 — bug] Plan referenced `recipe.name` but the actual field is `recipe.title`**
- Found during: Task 2 (writing RecipeRowMinimal).
- Issue: Plan's pseudocode used `recipe.name`. The `Recipe` type in `frontend/lib/recipes.ts` exposes `recipe.title` (consistent with `backend/app/models/recipe.py` line 69 `title: Mapped[str]`).
- Fix: Used `recipe.title` in the rendered span.
- Verification: Lint clean.

**Total deviations:** 2 auto-fixed (1 wrong path, 1 wrong field name). **Impact:** None — both flagged by the planner's `<read_first>` directive ("if the route is different ... READ the existing import sites") + sibling component pattern (`RecipeRow.tsx` uses `recipe.title`).

## Verification

- ✓ `cd frontend && npm run lint` — clean.
- ✓ `grep -E "<img|<Image" frontend/components/RecipeRowMinimal.tsx | wc -l` — 0.
- ✓ `grep -F "useSignedPhotoUrl" frontend/components/RecipeRowMinimal.tsx | wc -l` — 0.
- ✓ Switch component exports `LibraryView` with three values.
- ✓ `recipes/page.tsx` imports and conditionally renders `RecipeRowMinimal`.
- ✓ Spec exists with persistence + no-photo assertions.

## Issues Encountered

None — both deviations were anticipated by the planner via the `<read_first>` directive and the conditional path-discovery note.

## Self-Check: PASSED

Ready for Plan 40-04.
