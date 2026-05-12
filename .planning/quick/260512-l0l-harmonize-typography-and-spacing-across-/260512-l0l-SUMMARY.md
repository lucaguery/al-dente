---
phase: 260512-l0l
plan: 01
subsystem: frontend
tags: [ui, typography, spacing, tokens, tailwind-v4]
requires: []
provides:
  - frontend/app/globals.css @theme spacing tokens (--spacing-page-x, --spacing-section-y, --spacing-stack-y, --spacing-bottom-safe)
  - frontend/app/globals.css @layer utilities .text-page-header
  - Page-chrome rhythm contract across every app/**/page.tsx + HomeDecide + RecipeForm
affects:
  - frontend/app/recipes/page.tsx (px-4 outlier closed → token; sticky h1 register locked)
  - frontend/app/inbox/page.tsx (sticky h1 register locked)
  - frontend/app/settings/page.tsx (sticky h1 + 5-Card stack rhythm tokenized)
  - frontend/app/recipes/[id]/page.tsx (3 sticky headers + content stack tokenized)
  - frontend/app/recipes/new/page.tsx (sticky header + Rapide tab content tokenized)
  - frontend/app/cooking-logs/page.tsx (date-divider register lifted + content tokenized)
  - frontend/app/cooking-logs/[id]/page.tsx (content tokenized)
  - frontend/app/onboarding/{welcome,create,join,share-code}/page.tsx (gutter tokenized; pb-32 retained on sticky-CTA pages)
  - frontend/app/styleguide/page.tsx (gutter + bottom safe tokenized)
  - frontend/components/HomeDecide.tsx (6 Decide-layer containers tokenized)
  - frontend/components/RecipeForm.tsx (sticky header span register + content stack tokenized)
tech-stack:
  added: []
  patterns:
    - Tailwind v4 arbitrary-value `px-(--var)` / `pb-(--var)` / `gap-(--var)` syntax that resolves directly to `@theme` custom properties (no tailwind.config.* needed)
    - Heading register hierarchy: `.text-display` (hero / wordmark) → `.text-page-header` (sticky chrome) → `.text-title` (Card / section title) → `.text-body` → `.text-caption`
key-files:
  created: []
  modified:
    - frontend/app/globals.css
    - frontend/app/recipes/page.tsx
    - frontend/app/recipes/new/page.tsx
    - frontend/app/recipes/[id]/page.tsx
    - frontend/app/cooking-logs/page.tsx
    - frontend/app/cooking-logs/[id]/page.tsx
    - frontend/app/inbox/page.tsx
    - frontend/app/settings/page.tsx
    - frontend/app/onboarding/welcome/page.tsx
    - frontend/app/onboarding/create/page.tsx
    - frontend/app/onboarding/join/page.tsx
    - frontend/app/onboarding/share-code/page.tsx
    - frontend/app/styleguide/page.tsx
    - frontend/components/HomeDecide.tsx
    - frontend/components/RecipeForm.tsx
decisions:
  - "Spacing rhythm becomes a 4-token vocabulary in `@theme`, not per-page literals — future tweaks (e.g. shipping iPad layout) ripple from globals.css."
  - "`.text-page-header` is the missing rung between `.text-display` and `.text-body` — italic Cormorant 20px so sticky chrome reads as cookbook chapter-tab, not generic UI label. `.text-title` stays upright for Card-internal titles to keep visual separation between page chrome and content."
  - "Sticky-CTA pages (onboarding flows, recipes/new Rapide tab, RecipeForm) keep literal `pb-32` — a `--spacing-sticky-cta-y` token is a productize-later concern. `pb-(--spacing-bottom-safe)` (= prior `pb-24`) is the BottomNav-only clearance."
metrics:
  duration_min: 18
  completed: 2026-05-12
---

# Quick Task 260512-l0l: Harmonize Typography and Spacing Summary

One sweep that adds spacing tokens to Tailwind v4 `@theme`, locks the page-chrome heading register on sticky headers, and replaces ad-hoc utility classes with token references — so every screen reads as belonging to the same book.

## Files Touched

**14 files modified, 2 commits (a83c615, db3fb44):**

1. `frontend/app/globals.css` — added 4 spacing tokens + `.text-page-header` utility
2. `frontend/app/recipes/page.tsx` — header (px+h1), search wrapper (px), empty wrapper (px+pb), grid wrapper (px+gap+pb)
3. `frontend/app/recipes/new/page.tsx` — sticky header (px+span→text-page-header), tab strip mx, Rapide tab content (px+gap), floating CTA bar (px)
4. `frontend/app/recipes/[id]/page.tsx` — 3 sticky headers (px), main content wrapper (px+gap+pb)
5. `frontend/app/cooking-logs/page.tsx` — content wrapper (px+pt+pb+gap), date divider (text-title italic)
6. `frontend/app/cooking-logs/[id]/page.tsx` — content wrapper (px+pt+pb+gap)
7. `frontend/app/inbox/page.tsx` — sticky header (px+h1), content wrapper (px+pt+pb)
8. `frontend/app/settings/page.tsx` — loading shell (px+pt), sticky header (px+h1), content wrapper (px+pt+pb+gap)
9. `frontend/app/onboarding/welcome/page.tsx` — outer section (px+py-16 kept)
10. `frontend/app/onboarding/create/page.tsx` — sticky header (px), content wrapper (px+pt, pb-32 kept), floating CTA bar (px, pb-6 kept)
11. `frontend/app/onboarding/join/page.tsx` — same pattern as create, both happy-path and HOUSEHOLD_FULL branches
12. `frontend/app/onboarding/share-code/page.tsx` — main section (px+pt-12, pb-32 kept), floating CTA bar (px, pb-6 kept)
13. `frontend/app/styleguide/page.tsx` — main wrapper (px + pb token)
14. `frontend/components/HomeDecide.tsx` — 6 Decide-layer containers (px on 4 layout shells, px+gap on partner-waiting, px on empty-state wrappers, header)
15. `frontend/components/RecipeForm.tsx` — sticky header (px+span→text-page-header), content stack (px+gap+pt, pb-32 kept), floating CTA bar (px, pb-[calc...] kept)

**Skipped per plan:** `frontend/app/page.tsx` (defers all chrome to `HomeDecide` — confirmed during the sweep); `frontend/app/ws-config/` (route handler only, no `page.tsx`).

## Before / After Stats

| Metric                                       | Before | After |
| -------------------------------------------- | ------ | ----- |
| `px-4` in recipes library page (outlier)     | 1      | 0     |
| `text-xl font-semibold` on page-chrome `<h1>`| 2      | 0     |
| `text-base font-semibold` on listed sticky headers | 3 | 0 |
| `px-(--spacing-page-x)` adoption (file-line hits) | 0 | 41    |
| `pb-(--spacing-bottom-safe)` adoption        | 0      | 8     |
| `gap-(--spacing-section-y)` adoption         | 0      | 8     |
| `text-page-header` adoption (1 def + 5 uses) | 0      | 6     |
| Total token references across app+components | 0      | 63    |

Surviving `text-xl font-semibold` instances (PhotoCaptureTab line 116, RegenerateSheet line 94) live inside Sheet bodies / empty-state Cards — Card-internal, NOT page chrome, NOT in plan scope.

## Visual Delta (One Line)

`/recipes`, `/inbox`, `/settings`, `/recipes/[id]`, `/recipes/new` now share identical left/right gutters (24px), identical bottom clearance above the BottomNav (96px content + 4rem nav clearance from `<main>`), and identical Cormorant italic 20px sticky-header register — replacing the prior mix of `text-xl font-semibold` (sans, no italic, off-scale) and `text-base font-semibold` (smaller-than-peer rung).

## Deviations from Plan

None — plan executed exactly as written. Every substitution rule and per-file map item landed; the only files in the listed scope that came back unchanged at write time were the audit-marked exceptions (Cards `mx-6`, photo carousel `-mx-6 px-6` bleed, Sheet/Dialog internals).

## Out-of-Scope Findings (NOT modified per HARD SCOPE LOCK)

Logged for a future sweep — these files use page-level `px-6 pt-6 pb-24` / `pb-32` patterns identical to the ones the plan tokenized, but they were not in the plan's `files:` list:

- `frontend/components/VoiceCaptureTab.tsx:65` — `<div className="px-6 pt-6 pb-32 flex flex-col gap-6">`
- `frontend/components/PhotoCaptureTab.tsx:114` — same shape
- `frontend/components/UrlCaptureTab.tsx:62` — same shape
- `frontend/components/VoteSummary.tsx:138,167` — two `px-6 pt-6 pb-24 gap-6` containers (loading + main)
- `frontend/components/CookingLogFinalize.tsx:114,138` — `px-6 pt-6 pb-24 gap-{4,8}` containers
- `frontend/components/RegenerateSheet.tsx:93` — `px-6 pt-6 pb-8` (Sheet body — debatable: Sheet vs page chrome)
- Onboarding `<span className="text-base font-semibold">{t("title")}</span>` headers on `create`, `join` (`x2`), and `share-code` were not in the plan's Rule 5 list of 5 files; left intact per scope lock. Their layout-level `px-6 / pb-32` tokens were converted, so the gutters match. The text register will fall a step short of the 5 listed pages until a follow-up sweep includes them.

A follow-up quick task could (a) extend the page-chrome sweep into these 6 components and the 4 onboarding sticky-header spans, then (b) consider introducing `--spacing-sticky-cta-y` (the `pb-32` literal). Both deferred deliberately to keep this plan atomic.

## Build Verification

`cd frontend && npm run build` (next 16.2.4 webpack):
- `✓ Compiled successfully in 15.2s`
- TypeScript: pass
- 17/17 static pages generated
- No new ESLint warnings introduced by this plan's files.

Trailing `ENVIRONMENT_FALLBACK` runtime warning is unrelated build-trace noise (RAILWAY_URL fallback in this worktree without a Railway env), present pre-change.

## Self-Check: PASSED

- ✓ `frontend/app/globals.css` contains the 4 `--spacing-*` tokens inside `@theme inline { ... }` (11 grep hits)
- ✓ `frontend/app/globals.css` contains `.text-page-header` utility inside `@layer utilities { ... }`
- ✓ `a83c615` commit present in git log
- ✓ `db3fb44` commit present in git log
- ✓ 14 page/component files modified (matches plan `files_modified`)
- ✓ No backend / planning / test files touched
- ✓ No new dependency added
- ✓ No `next-intl` string changed
- ✓ Build passes
