---
phase: 260512-gpl
plan: "01"
subsystem: frontend/typography, frontend/recipe-library
tags: [font-swap, ui, recipe-card, cormorant-garamond, direction-b]
dependency_graph:
  requires: []
  provides: [global-display-font-cormorant-garamond, recipe-card-photo-grid-v2]
  affects: [frontend/app/layout.tsx, frontend/app/globals.css, frontend/components/RecipeCard.tsx]
tech_stack:
  added: []
  patterns: [next/font/google non-variable weight array, Tailwind aspect-[4/3] arbitrary value]
key_files:
  created: []
  modified:
    - frontend/app/layout.tsx
    - frontend/app/globals.css
    - frontend/components/RecipeCard.tsx
decisions:
  - "Display font weight 500 chosen (not 400) for Cormorant Garamond — at text-lg (18px) and display sizes, weight 400 reads thin; 500 is the minimum for comfortable classical serif legibility on mobile"
  - "gap-3 (12px) retained on recipes/page.tsx grid container — adequate gutter for 2-col photo cards on narrow viewports; gap-3.5 not needed"
  - "Card title is UPRIGHT (no italic) — italic is reserved for hero/wordmark (.text-display) and invite-code contexts; card titles in a dense grid read better upright at body-adjacent sizes"
  - "Task 3 human-verify checkpoint skipped per executor constraints — flagged as manual verification recommended in summary"
metrics:
  duration: ~8 minutes
  completed: "2026-05-12"
  tasks_completed: 2
  tasks_total: 3
  files_modified: 3
---

# Phase 260512-gpl Plan 01: Cormorant Garamond Font Swap + Recipe Card Direction B Summary

**One-liner:** Swapped global display font Fraunces → Cormorant Garamond (non-variable, weights 400+500) and rebuilt RecipeCard as a vertical 2-col photo-grid card (4:3 photo on top, Cormorant Garamond upright title, meta row below).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Swap Fraunces → Cormorant Garamond globally | ae9cd67 | frontend/app/layout.tsx, frontend/app/globals.css |
| 2 | Rebuild RecipeCard as vertical photo-grid card | 5441edb | frontend/components/RecipeCard.tsx |
| 3 | Visual verification on dev server | — | Manual verification recommended (checkpoint skipped per executor constraints) |

## What Was Built

### Task 1: Font swap (layout.tsx + globals.css)

- Replaced `Fraunces` import with `Cormorant_Garamond` from `next/font/google`
- Config: `weight: ["400", "500"]`, `style: ["normal", "italic"]`, no `axes` property (Cormorant Garamond is not a variable font — passing `axes: ["opsz"]` would throw at build time)
- `variable: "--font-display"` preserved — all consumers (`font-display` Tailwind utility, `.text-display`, `.text-title`, `font-display italic` classNames) pick up the new font automatically via the CSS var
- HTML className updated: `cormorantGaramond.variable` replaces `fraunces.variable`
- Dropped `font-variation-settings: "opsz" 96` from `.text-display` and `"opsz" 36` from `.text-title` — dead code since Cormorant Garamond has no opsz axis
- Updated CSS comments to reference Cormorant Garamond instead of Fraunces

### Task 2: RecipeCard Direction B (RecipeCard.tsx)

- Top-level `<Link>` changed from `flex gap-4 p-3` (horizontal) to `flex flex-col overflow-hidden` (vertical)
- `rounded-2xl` on Link wrapper with `overflow-hidden` clips the photo's top corners cleanly
- Photo area: `w-full aspect-[4/3] object-cover` (was `h-16 w-16 rounded-lg` thumbnail)
- Placeholder: `w-full aspect-[4/3] bg-surface-muted` (was `h-16 w-16 rounded-lg bg-surface-muted`)
- Title: `font-display text-lg font-medium leading-tight tracking-tight line-clamp-2` (was `text-base font-semibold line-clamp-1`)
- Meta row: `text-xs text-foreground-muted` with cuisine Badge at `text-[11px] px-1.5 py-0` + dot separator (only when cuisine present) + relative-last-cooked or `t("never_cooked")`
- D-05 `useEffect` (signed URL, cooking-log path branch, `alive` cleanup, silent `.catch()`) preserved byte-identical
- recipes/page.tsx untouched — grid container already `grid grid-cols-2 gap-3` as required

## Decisions Made

1. **Display weight: 500** — Cormorant Garamond at weight 400 reads thin at `text-lg` (18px) on mobile retina. Weight 500 gives the "editorial classical serif" feel without crossing into advertising-heavy territory. Consistent with the Slow Food restraint principle in the original CSS comments.

2. **gap-3 retained** — The 12px gutter is appropriate for narrow phone viewports. gap-3.5 (14px) is available as a one-line follow-up tweak if visual review finds it tight, but the default brief value is correct.

3. **Card title upright, not italic** — Italic display is reserved for `.text-display` hero/wordmark (HomeDecide date header, invite-code styling on share-code + Settings). Card titles in a 2-col photo grid read better upright — italic at body-adjacent sizes in a dense grid reads as emphasis rather than brand signature.

4. **Task 3 checkpoint not blocking** — Per executor constraints: Task 3 is a `checkpoint:human-verify` gate. Manual verification recommended before merging/deploying. See verification checklist below.

## Verification: Manual Steps Recommended

Per Task 3 of the plan — the following should be confirmed on a dev server before merging to main:

1. `cd frontend && npm run dev` → visit `http://localhost:3000/recipes`
   - Cards should be 2-column, each with a 4:3 photo on top and title + meta below
   - `paper-grain` texture visible on each card
2. Visit `/onboarding/share-code` or `/settings` — invite code should render in Cormorant Garamond italic (lighter, narrower glyphs than Fraunces)
3. Visit `/` (HomeDecide) — date header should render in Cormorant Garamond italic
4. Visit any `/recipes/{id}` — title strip should render in Cormorant Garamond (no code change needed; picks up via `--font-display`)
5. Browser DevTools → Network → confirm `cormorant-garamond` woff2 loads; confirm NO Fraunces woff2 loads
6. DevTools → Elements → inspect `.text-display` element → computed `font-family` should be `'Cormorant Garamond', ...` with no `font-variation-settings` rule

## Deviations from Plan

None — plan executed exactly as written.

- `font-variation-settings` removed from both `.text-display` and `.text-title` as specified
- RecipeCard JSX return replaced; `useEffect` block preserved byte-identical
- recipes/page.tsx left untouched (grid already `grid grid-cols-2 gap-3`)
- No scope creep: ShortlistCard, RecipeDraftCard, recipe detail page, BottomNav, HomeDecide, onboarding, Settings — none modified

## Known Stubs

None. All data flow preserved: D-05 living-image preference, cooking-log signed-URL fallback, `bg-surface-muted` placeholder when no photo, `Link` to `/recipes/${id}`.

## Threat Flags

None. This is a pure cosmetic/typography change with no new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check: PASSED

- frontend/app/layout.tsx: modified ✓
- frontend/app/globals.css: modified ✓
- frontend/components/RecipeCard.tsx: modified ✓
- frontend/app/recipes/page.tsx: no change needed (gap-3 already correct) ✓
- Commits ae9cd67 and 5441edb exist in git log ✓
- tsc --noEmit: 0 errors ✓
- eslint on .tsx files: 0 warnings ✓
