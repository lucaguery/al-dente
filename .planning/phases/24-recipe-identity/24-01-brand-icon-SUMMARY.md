---
phase: 24
plan: 01
subsystem: frontend/components
tags: [ui, brand, empty-state, svg, lucide-icon, nextjs-app-router, accessibility]
dependency_graph:
  requires: []
  provides:
    - BrandIcon component (frontend/components/BrandIcon.tsx)
    - EmptyState widened icon prop (ComponentType structural type)
  affects:
    - frontend/app/onboarding/welcome/page.tsx
    - frontend/components/HomeDecide.tsx
    - frontend/app/inbox/page.tsx
    - frontend/app/recipes/page.tsx
tech_stack:
  added: []
  patterns:
    - ComponentType structural typing for polymorphic icon props
    - SVG currentColor inheritance for theme-aware brand mark
    - aria-label opt-in pattern (decorative default, labeled on demand)
key_files:
  created:
    - frontend/components/BrandIcon.tsx
  modified:
    - frontend/components/EmptyState.tsx
    - frontend/app/onboarding/welcome/page.tsx
    - frontend/components/HomeDecide.tsx
    - frontend/app/inbox/page.tsx
    - frontend/app/recipes/page.tsx
decisions:
  - "BrandIcon uses stroke=currentColor so it inherits container text color (foreground-muted on EmptyState, primary on welcome)"
  - "size=48 default matches existing EmptyState <Icon size={48} /> call sites; size=72 on welcome screen for first-impression presence"
  - "Both HomeDecide empty states (no-shortlist + shortlist-empty-recipes) received BrandIcon replacement; both are brand moments"
  - "EmptyState icon type widened to ComponentType<{size?,className?,aria-hidden?}> — structural subset both Lucide and BrandIcon satisfy"
  - "app/icon.tsx NOT deleted — PWA Edge runtime twin; both files share same path data (D-09)"
metrics:
  duration_minutes: 15
  completed_date: "2026-05-13"
  tasks_completed: 6
  tasks_total: 6
  files_created: 1
  files_modified: 5
requirements_closed: [RID-01]
---

# Phase 24 Plan 01: BrandIcon — Brand Mark Component + Empty State Mounts Summary

**One-liner:** Extracted pasta-strand SVG into reusable BrandIcon component with currentColor stroke; mounted on onboarding welcome + 3 empty states (inbox, recipes library, shortlist deck) via widened EmptyState ComponentType prop.

## What Was Built

### New File: `frontend/components/BrandIcon.tsx`
A pure-SVG functional React component rendering the al dente pasta-strand mark. The two `<path d="...">` strings are byte-identical to `frontend/app/icon.tsx:36,38` (D-06). Key properties:
- `stroke="currentColor"` — inherits surrounding text color so it tints to any palette (foreground-muted on EmptyState, terracotta/primary on welcome screen)
- `size=48` default matches the existing EmptyState `<Icon size={48} />` call site (D-07)
- `strokeWidth=6` default matches the PWA twin
- `aria-hidden=true` by default (decorative); passing `aria-label` switches to `role="img"` (D-07)
- No `"use client"` directive — pure SVG markup, safe to render server-side
- `app/icon.tsx` is NOT deleted per D-09 (Edge runtime PWA icon generator)

### Modified: `frontend/components/EmptyState.tsx`
Widened `icon` prop from `LucideIcon` (which is `ForwardRefExoticComponent<...>`) to `ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>`. This structural widening is required because a plain function component does not satisfy the `ForwardRefExoticComponent` shape — TypeScript would error on `icon={BrandIcon}` without it. All existing Lucide call sites continue to type-check (LucideProps is a superset). Render body unchanged.

### Mount Points (4 surfaces)

| Surface | File | Change |
|---------|------|--------|
| Onboarding welcome | `app/onboarding/welcome/page.tsx` | `<BrandIcon size={72} aria-label="al dente" className="text-primary mb-2" />` above the h1 wordmark |
| Shortlist empty deck | `components/HomeDecide.tsx` | `icon={BrandIcon}` at both empty-state call sites (no-shortlist + shortlist-with-zero-recipes) |
| Drafts inbox | `app/inbox/page.tsx` | `icon={BrandIcon}` replacing Inbox lucide icon |
| Recipes library default | `app/recipes/page.tsx` | `icon={BrandIcon}` replacing BookOpen on the `query === ""` branch |

### Preserved Intentionally

- `/recipes` "no results" branch (`query !== ""`) still uses Lucide `Search` icon — this is a transient functional state, not a brand moment (D-08)
- `Plus` and `ChevronRight` Lucide icons preserved at their usage sites

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `7c7a148` | Create BrandIcon component with verbatim pasta-strand paths |
| Task 2 | `36ba9be` | Widen EmptyState icon prop to ComponentType |
| Task 3 | `2672bb4` | Mount BrandIcon on onboarding welcome screen |
| Task 4 | `2f9747a` | Swap Sparkles → BrandIcon in HomeDecide shortlist empty states |
| Task 5 | `bbf585f` | Swap Inbox → BrandIcon in drafts inbox empty state |
| Task 6 | `2a31eb8` | Swap BookOpen → BrandIcon in recipes library default empty state |

## Verification Results

### Grep Gates (all passed)

```
BrandIcon exists:                  ✓
viewBox="0 0 160 160":             1 match
stroke="currentColor":             1 match
Outer path (verbatim):             1 match
Inner path (verbatim):             1 match
app/icon.tsx still exists:         ✓
ImageResponse in icon.tsx:         2 matches (import + usage)
ComponentType in EmptyState:       1 match
LucideIcon in EmptyState:          0 matches
BrandIcon mounted at 4+ surfaces:  5 usages (HomeDecide has 2 empty states)
BookOpen in recipes/page.tsx:      0 matches
Sparkles in HomeDecide.tsx:        0 matches
lucide-react in inbox/page.tsx:    0 matches
Search in recipes/page.tsx:        9 matches (import + usage preserved)
```

### Build Gates

- `npx tsc --noEmit`: exit 0 (no TypeScript errors)
- `npx eslint <touched files>`: exit 0 (no ESLint issues)

## Deviations from Plan

### Minor: acceptance test for `grep -c "Inbox" app/inbox/page.tsx`

**Found during:** Task 5
**Issue:** The plan's acceptance criterion expects `grep -c "Inbox" app/inbox/page.tsx` to return `0`. However, the file exports `function InboxPage()` — the component name itself contains "Inbox". This is pre-existing code; renaming the Next.js page export would break routing.
**Resolution:** The Lucide `Inbox` icon import and `icon={Inbox}` JSX usage are fully removed (the actual intent). The `InboxPage` function name is preserved as required by Next.js App Router routing convention.
**Impact:** None on functionality or correctness — only the acceptance test wording was slightly over-strict.

### Bonus: Both HomeDecide empty states updated

**Found during:** Task 4
**Issue:** The plan described one `icon={Sparkles}` call site (line 418/419), but the file contains two: one for the "no shortlist for today" path and one for the "shortlist exists but has zero recipes" path (added in quick-260512-df0). Both are shortlist empty states and are brand moments.
**Fix:** Both `icon={Sparkles}` occurrences replaced with `icon={BrandIcon}`. This matches the plan's stated acceptance criterion: `grep -c "Sparkles" components/HomeDecide.tsx` returns `0`.

## Known Stubs

None — all mounts are wired to the actual BrandIcon component with no placeholder data.

## Threat Flags

None — RID-01 is a pure-render, no-data-ingestion plan. All STRIDE categories received `accept` dispositions in the threat model.

## Provides for Future Plans

- `BrandIcon` is the RID-05 fallback component when `recipe.illustration_svg` is NULL or sanitizer-rejected (D-37). The component signature `{ size?, strokeWidth?, className?, aria-label? }` is already compatible with the `<BrandIcon size={size} aria-hidden />` call pattern RID-05 will use in `RecipeIllustration.tsx`.
- `ComponentType<{ size?, className? }>` structural typing on EmptyState is reusable for any future icon-prop widening (e.g., if RID-05's `RecipeIllustration` ever needs to be used as an `icon` prop somewhere).

## Self-Check: PASSED

All 6 created/modified files exist on disk. All 6 task commits found in git history.

| Check | Result |
|-------|--------|
| frontend/components/BrandIcon.tsx | FOUND |
| frontend/components/EmptyState.tsx | FOUND |
| frontend/app/onboarding/welcome/page.tsx | FOUND |
| frontend/components/HomeDecide.tsx | FOUND |
| frontend/app/inbox/page.tsx | FOUND |
| frontend/app/recipes/page.tsx | FOUND |
| .planning/phases/24-recipe-identity/24-01-brand-icon-SUMMARY.md | FOUND |
| Commit 7c7a148 (BrandIcon component) | FOUND |
| Commit 36ba9be (EmptyState widening) | FOUND |
| Commit 2672bb4 (welcome screen mount) | FOUND |
| Commit 2f9747a (HomeDecide swap) | FOUND |
| Commit bbf585f (inbox swap) | FOUND |
| Commit 2a31eb8 (recipes swap) | FOUND |
