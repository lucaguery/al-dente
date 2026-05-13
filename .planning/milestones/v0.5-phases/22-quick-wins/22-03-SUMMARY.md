---
phase: 22
plan: 22-03-french-tag-labels
subsystem: frontend/components
tags: [i18n, enum-labels, badge, shortlist, recipe-detail]
dependency_graph:
  requires: [frontend/lib/enum-labels.ts]
  provides: [French enum labels on ShortlistCard, French enum labels on recipe detail page]
  affects: [/decide shortlist deck, /recipes/[id] detail page]
tech_stack:
  added: []
  patterns: [useEnumLabels() hook, next-intl enum translation]
key_files:
  created: []
  modified:
    - frontend/components/ShortlistCard.tsx
    - frontend/app/recipes/[id]/page.tsx
decisions:
  - D-12: Surgical fix to exactly two locked call sites (ShortlistCard + recipe detail); no other surfaces touched
  - D-13: No new infrastructure — useEnumLabels() at frontend/lib/enum-labels.ts is the canonical translator; not modified
  - D-14: Drafts inbox holds trivially — inbox renders no cuisine/mood/protein badges; no code change
  - D-15: recipe.season grep returned zero matches — no code change needed for season
metrics:
  duration_minutes: 15
  completed_date: 2026-05-12
  tasks_completed: 4
  files_modified: 2
---

# Phase 22 Plan 03: French Tag Labels Summary

**One-liner:** Wire `useEnumLabels()` into ShortlistCard and recipe detail page so cuisine/mood/protein badges display French labels (e.g. `Méditerranéen`, `Boeuf`) instead of raw wire-format enum keys.

## What Was Built

Closed gh#21 by routing three raw enum renders through the existing `useEnumLabels()` hook on the two surfaces locked in CONTEXT.md D-12:

1. `ShortlistCard.tsx` — cuisine + mood badges on the swipe deck now call `labels.cuisine(cuisine)` and `labels.mood(m)` respectively.
2. `app/recipes/[id]/page.tsx` — cuisine + mood + protein badges on the detail page now call `labels.cuisine(recipe.cuisine)`, `labels.mood(m)`, and `labels.protein(recipe.main_protein)`.

No new translation infrastructure introduced. `frontend/lib/enum-labels.ts` is unchanged. Invariant 9 (locked-vocabulary canonical translator) holds.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Pre-flight grep — confirm recipe.season not rendered raw | (no commit — read-only) | — |
| 2 | Wrap ShortlistCard cuisine + mood badges with useEnumLabels | 3999fc0 | frontend/components/ShortlistCard.tsx |
| 3 | Wrap recipe detail cuisine + mood + protein badges with useEnumLabels | 3476213 | frontend/app/recipes/[id]/page.tsx |
| 4 | Document inbox no-op and library out-of-scope decision | (no commit — documentation) | — |

## Deviations from Plan

None — plan executed exactly as written.

## Scope Notes

### D-14: Inbox no-op confirmed

`grep -nE "recipe\.(cuisine|mood|main_protein)" frontend/app/inbox/page.tsx frontend/components/RecipeDraftCard.tsx` returned **zero matches**. The drafts inbox renders title + status badge only — no cuisine/mood/protein fields at all. The ROADMAP.md phase success criterion ("drafts inbox displays French labels") holds trivially. No code change needed; no regression risk.

### D-15: recipe.season grep clean

`grep -rnE "\{[^}]*recipe\.season[^}]*\}" frontend/app frontend/components` returned **zero matches**. No user-facing surface renders `recipe.season` raw today. No code change needed for season.

### Library page (RecipeCard.tsx) out of scope

`frontend/components/RecipeCard.tsx` line 129 renders `{recipe.cuisine}` raw on the `/recipes` library page. This is NOT one of the two locked call sites in D-12 ("surgical fix: only ShortlistCard.tsx:307-310 and app/recipes/[id]/page.tsx:256,259-261,264"). The library page is also not named in the phase success criteria (which list deck / detail / inbox). Per D-12's surgical-fix mandate, `RecipeCard.tsx` is out of scope for Phase 22. Can be picked up in a future identity-polish pass if raw enum leak recurs.

## Verification Results

All grep gates passed:

- `useEnumLabels` present in both locked files (import + invocation): 2 matches each
- `{recipe.cuisine}` / `{recipe.main_protein}` raw renders in locked files: ZERO matches
- `recipe.season` raw renders across all of frontend/app + frontend/components: ZERO matches
- `frontend/lib/enum-labels.ts` git status: clean (unmodified)
- `npx tsc --noEmit`: passed

## Self-Check: PASSED

- `frontend/components/ShortlistCard.tsx` — exists, modified (commit 3999fc0)
- `frontend/app/recipes/[id]/page.tsx` — exists, modified (commit 3476213)
- Both commits verified in git log
- `frontend/lib/enum-labels.ts` — verified unchanged
