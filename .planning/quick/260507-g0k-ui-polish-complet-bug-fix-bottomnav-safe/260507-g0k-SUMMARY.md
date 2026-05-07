# Quick Task 260507-g0k — Summary

**Task:** UI polish complet : bug fix BottomNav safe-area-inset (h-16 squish), introduction couleur brand #F43F5E comme primary accent, BottomNav visuellement plus soignée, home page moins placeholder, RecipeCard plus propre, typographie
**Date:** 2026-05-07
**Commits:** 84ed5d2, 1702af2
**Status:** Tasks 1-2 complete — Task 3 (human-verify on both iPhones) pending

## What Changed

### Task 1 — Brand color tokens + BottomNav fix + RecipeCard polish

**`frontend/app/globals.css`**
- `--primary`: `oklch(0.205 0 0)` → `oklch(0.645 0.246 16.5)` (rose #F43F5E, light mode)
- `--ring`: `oklch(0.708 0 0)` → `oklch(0.645 0.246 16.5)` (brand focus rings, light mode)
- `--primary` dark: `oklch(0.922 0 0)` → `oklch(0.72 0.19 16.5)` (lighter rose for dark bg)
- `--primary-foreground` dark: `oklch(0.205 0 0)` → `oklch(0.145 0 0)` (darker text on lighter rose)
- `--ring` dark: `oklch(0.556 0 0)` → `oklch(0.72 0.19 16.5)`

**`frontend/components/BottomNav.tsx`**
- Nav height: `h-16` → `min-h-[4rem]` — fixes iOS squish bug (safe-area no longer consumes the fixed 64px)
- Active tab: `text-foreground` → `text-primary` — active tab now tinted brand rose

**`frontend/app/layout.tsx`**
- Removed `paddingBottom: env(safe-area-inset-bottom)` from `<body>` (was double-counting with nav's own safe-area padding)
- `<main>` padding: `pb-16` → `pb-[calc(4rem+env(safe-area-inset-bottom))]` (accounts for full nav height including safe area)
- `viewport.themeColor`: `#0A0A0A` → `#F43F5E` (iOS status bar tint matches brand)

**`frontend/components/RecipeCard.tsx`**
- `bg-background` → `bg-card` (semantic card surface)
- `rounded-lg` → `rounded-xl` (softer corners)
- Added `shadow-sm` (subtle elevation)
- Added `active:bg-surface-muted` (iOS touch feedback)
- `transition-colors` → `transition-all`
- Title: added `tracking-tight`

### Task 2 — Home page hero + FR strings

**`frontend/lib/i18n/fr.json`**
- Added under `home` namespace: `hero_question`, `cta_browse`, `cta_add`

**`frontend/app/page.tsx`**
- Replaced placeholder section with hero layout: wordmark → tagline → "On mange quoi ce soir ?" heading → rose primary CTA (/recipes) + neutral secondary CTA (/recipes/new)
- Install hint card preserved (same conditional render)
- Added `import Link from "next/link"`

## Verification

- `npm run lint` — clean
- `npm run build` — exit 0, 13/13 static pages generated
- All plan `<done>` grep checks passing

## Pending

**Task 3 (human-verify):** Push to main → Vercel auto-deploy → verify on both iPhones:
- BottomNav squish fix (icon + label clear of home indicator)
- Brand rose active tab
- Home hero + 2 CTAs functional
- RecipeCard shadow + touch feedback
- Status bar tint rose
- Dark mode contrast
- No regressions in other flows
