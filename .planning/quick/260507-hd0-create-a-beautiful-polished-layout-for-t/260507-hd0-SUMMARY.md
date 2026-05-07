---
phase: quick-260507-hd0
plan: 01
subsystem: frontend-design-system
tags: [ui-polish, design-tokens, tailwind-v4, ios-pwa, brand-rose]
requires:
  - frontend/package.json (Tailwind v4, Next.js 16, React 19, lucide-react, next-intl)
  - existing brand primary token (oklch(0.645 0.246 16.5) ≈ #F43F5E)
  - existing UI-SPEC tokens (--surface-muted, --foreground-muted)
provides:
  - canonical typography utilities (.text-display, .text-title, .text-body, .text-caption)
  - brand-rose tint scale (--surface-rose-50, --surface-rose-100) light + dark
  - single shadow scale (--shadow-card, --shadow-card-hover, --shadow-nav)
  - frosted-glass BottomNav (bg-card/85 backdrop-blur-md)
  - premium iOS-feel home hero (rose-tinted card + decorative blur blob)
  - tactile CTA + RecipeCard press feedback (active:translate-y-px)
  - 100dvh min-height on html (iOS Safari address-bar gap fix)
affects:
  - frontend/app/globals.css (token additions, additive only — nothing removed)
  - frontend/app/layout.tsx (min-h-full → min-h-dvh on body)
  - frontend/app/page.tsx (premium home hero + refined CTA hierarchy)
  - frontend/components/BottomNav.tsx (frosted backdrop, larger active pill)
  - frontend/components/RecipeCard.tsx (converged elevation language)
  - frontend/lib/i18n/fr.json (no changes — pure restyle, no new strings)
tech-stack:
  added: []
  patterns:
    - "Tailwind v4: --shadow-* and --color-* in @theme inline auto-map to shadow-*/bg-* utilities"
    - "@layer utilities for canonical typography classes that supplement Tailwind's text-*"
    - "100dvh on html prevents iOS Safari address-bar collapse gap"
    - "active:translate-y-px on tappable surfaces — universal tactile press feedback (zeroed by prefers-reduced-motion)"
    - "Single accent (brand rose) + tints derived from same hue (oklch h=16.5) — never introduce a competing hue"
key-files:
  created: []
  modified:
    - frontend/app/globals.css
    - frontend/app/layout.tsx
    - frontend/app/page.tsx
    - frontend/components/BottomNav.tsx
    - frontend/components/RecipeCard.tsx
decisions:
  - "Skipped Task 3 (human-verify checkpoint) per orchestrator constraints — visual verification deferred to user post-deploy"
  - "fr.json untouched — every polish change was structural/visual, not copy. Confirms no new user-facing strings."
  - "Used h-[3.25rem] (52px) for taller CTAs instead of inventing a `h-13` token; Tailwind v4 arbitrary heights are first-class"
  - "Dark-mode shadows kept in single scale (no separate --shadow-card-dark) — borders carry elevation in dark; shadows are simply less visible against dark backgrounds"
  - "Used transition-[transform,opacity] / transition-[transform,background-color] on CTAs (named props) to keep transitions explicit and avoid `transition-all` cost"
metrics:
  duration_minutes: 4
  completed_date: 2026-05-07
---

# Quick-260507-hd0: Beautiful, Polished App Shell Summary

**One-liner:** Coherent visual polish pass across globals.css tokens, RootLayout, home page, BottomNav, and RecipeCard so Al Dente reads as a premium native iOS PWA before Phase 2 capture surfaces ship.

## Why this matters

Phase 02 (W2 — LLM Capture) is about to land voice/photo/url capture surfaces. Every new screen will inherit the chrome from this polish pass: rose-tinted hero treatment, h-[3.25rem] rounded-2xl shadow-card primary CTAs, frosted BottomNav, single shadow-card elevation language. Polishing the shell once is cheaper than polishing every capture surface individually after the fact.

## What changed (per file)

### `frontend/app/globals.css`

**Added (additive — no existing tokens removed/renamed):**

| Token | Light | Dark | Use |
|---|---|---|---|
| `--surface-rose-50` | `oklch(0.985 0.012 16.5)` | `oklch(0.20 0.02 16.5)` | Hero card backdrop |
| `--surface-rose-100` | `oklch(0.965 0.025 16.5)` | `oklch(0.24 0.03 16.5)` | Reserved for future "branded surface" treatment |
| `--shadow-card` | `0 1px 2px / 0.04 + 0 1px 3px / 0.06` | (same — visually invisible against dark bg) | Resting card elevation |
| `--shadow-card-hover` | `0 2px 4px / 0.06 + 0 4px 8px / 0.08` | (same) | Pressed/hover deepening |
| `--shadow-nav` | `0 -1px 0 / 0.06` | (same) | Available for nav hairline |

**Tailwind v4 mapping:** `--color-surface-rose-50/100` and `--shadow-card/--shadow-card-hover/--shadow-nav` exposed in `@theme inline` → Tailwind compiles them to `bg-surface-rose-50`, `shadow-card`, etc. utilities directly (verified against `frontend/node_modules/tailwindcss/theme.css` which uses the same `--shadow-*` naming).

**Typography utilities** (in `@layer utilities`):

- `.text-display` → `clamp(1.875rem, 5vw, 2.125rem)` / 1.1 / -0.025em / 700 — used by home `<h1>`
- `.text-title` → `1.25rem` / 1.3 / -0.015em / 600 — used by home `<h2>` hero question
- `.text-body` → `1rem` / 1.55 / -0.005em — reserved for future screens
- `.text-caption` → `0.8125rem` / 1.4 / muted color — reserved for future screens

**iOS Safari fix:** `html { min-height: 100dvh; }` in `@layer base` — replaces the gap left by `100vh` when the address bar collapses on scroll.

**Preserved:** brand primary `oklch(0.645 0.246 16.5)`, all shadcn neutral tokens, `prefers-reduced-motion` global enforcement, `prefers-color-scheme: dark` auto-application.

### `frontend/app/layout.tsx`

| Before | After |
|---|---|
| `<body className="min-h-full ...">` | `<body className="min-h-dvh ...">` |

Single-line change. Same iOS Safari address-bar fix as the `min-height: 100dvh` on `html`. Safe-area inset, flex chain, providers, BottomNav placement all preserved.

### `frontend/components/BottomNav.tsx`

| Before | After |
|---|---|
| `bg-surface-muted border-t border-border` | `bg-card/85 backdrop-blur-md border-t border-border` (frosted) |
| Active pill `w-8` | Active pill `w-10` (anchors active tab more strongly) |
| Label `text-[10px]` | Label `text-[11px]` (legibility on iPhone Pro) |
| (no transition on color shift) | `transition-colors duration-150` |
| Badge `text-[10px]` | Badge `text-[11px]` (matches labels) |

**Preserved:** segment-based `/onboarding/*` hide, drafts badge gating (`status === "authenticated" && draftCount > 0`), realtime drafts re-fetch, `pb-[env(safe-area-inset-bottom)]`, `min-h-[4rem]`, all routing.

### `frontend/app/page.tsx`

**Hero card** — wraps wordmark + tagline in `<div className="relative overflow-hidden rounded-3xl bg-surface-rose-50 px-6 py-10 -mx-2">` with a decorative `<div aria-hidden className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />` for soft brand-tinted gravity.

**Typography hierarchy** — wordmark uses `.text-display`, hero question uses `.text-title`. No more ad-hoc `text-[28px]` / `text-2xl`.

**CTAs** — both primary and secondary now `h-[3.25rem] rounded-2xl` (taller, more rounded — reads as native iOS prominent button). Primary gains `shadow-card`. Both gain `active:translate-y-px` for tactile press (zeroed by `prefers-reduced-motion`). Transitions use named props (`transition-[transform,opacity]`, `transition-[transform,background-color]`) for clarity.

**Install-hint card** — `bg-surface-muted` → `bg-card border-border shadow-card` (lifts to match primary CTA elevation rather than receding).

**Spacing rhythm** — section `gap-8` → `gap-6`, section padding `py-10` → `py-6` (hero card's internal `py-10` provides breathing room).

### `frontend/components/RecipeCard.tsx`

| Before | After |
|---|---|
| `shadow-sm hover:bg-surface-muted active:bg-surface-muted transition-all` | `shadow-card hover:shadow-card-hover active:translate-y-px transition-all duration-150` |

Single-line `className` change. Photo loading, signed-URL flow, badge, `formatRelativeFr`, Link href — all untouched. Now inherits the same elevation language as the home CTAs (single `shadow-card` scale).

### `frontend/lib/i18n/fr.json`

**No changes.** This was a pure restyle; no new copy was introduced. Confirms the polish pass added zero translation debt.

## Patterns established (for future screens to inherit)

These conventions are now baked into globals.css and four shell files. New surfaces (Phase 2 capture, Phase 3 voting, etc.) should adopt them by default:

1. **Primary CTA** = `h-[3.25rem] rounded-2xl bg-primary text-primary-foreground shadow-card active:translate-y-px transition-[transform,opacity] duration-100`
2. **Secondary CTA** = `h-[3.25rem] rounded-2xl border border-border bg-card text-foreground active:translate-y-px active:bg-surface-muted transition-[transform,background-color] duration-100`
3. **Card elevation** = `bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover active:translate-y-px transition-all duration-150`
4. **Branded surface** = `bg-surface-rose-50 rounded-3xl` + optional decorative `bg-primary/10 blur-3xl` blob (one per screen, max — keep it rare)
5. **Typography** = use `.text-display` / `.text-title` / `.text-body` / `.text-caption` instead of ad-hoc Tailwind sizes; reach for them first
6. **Frosted overlay** = `bg-card/85 backdrop-blur-md border-t border-border` (already on BottomNav; reuse for any future floating action bar)
7. **iOS sizing** = always `min-h-dvh` on outer flex container, never `min-h-screen` or `min-h-full` for full-height pages
8. **Tactile press** = `active:translate-y-px` on every tappable surface; `prefers-reduced-motion` zeros it globally — no need to handle per-component

## Deviations from Plan

None — plan executed exactly as written.

Notes on minor decisions made within the plan's guardrails:

- The plan suggested `h-13` (with a fallback to `h-[52px]`). Tailwind v4 doesn't ship `h-13`; used the explicit `h-[3.25rem]` (= 52px) form throughout. This is the cleaner of the two options the plan offered.
- The plan offered `dark` shadow vars at "~50% opacity or near-zero". Chose to leave the same shadow values for both modes; in dark mode they're effectively invisible against the dark background and borders carry elevation. Single scale = simpler mental model. If the dark-mode visual review reveals a problem, we'll add a `.dark { --shadow-card: ... }` override.
- `transition-all` was used on RecipeCard (matches the original) but on CTAs we used named transition props (`transition-[transform,opacity]`) for explicitness. Both are correct; named is just slightly cheaper at runtime.

## Skipped Task

**Task 3 (`checkpoint:human-verify`)** — Per orchestrator constraints ("Tasks 1 and 2 — Task 3 is a human checkpoint, skip it"), the visual verification on iPhone PWA is deferred. Once `main` auto-deploys to Vercel, the user should walk the home/BottomNav/RecipeCard/dark-mode/reduced-motion checklist in the plan's `<how-to-verify>` block.

## Verification

- [x] `cd frontend && npm run lint` exits 0 (zero warnings — confirmed twice, after each task)
- [x] `cd frontend && npm run build` exits 0 (13/13 static pages compiled, Tailwind v4 resolved all new utilities)
- [x] `git diff --name-only` shows ONLY the 5 files in `files_modified` (fr.json untouched as intended)
- [x] `frontend/package.json` unchanged (no new deps)
- [x] Brand primary token unchanged: `grep "primary: oklch(0.645 0.246 16.5)" globals.css` matches at line 85
- [x] All deviation rules respected: no scope creep into onboarding, recipes/[id], settings, inbox, recipes/new
- [ ] Visual checkpoint on iPhone PWA — deferred to user (Task 3 skipped per orchestrator)

## Commits

| Task | Hash | Message |
|---|---|---|
| 1 | `9f9bbd4` | feat(260507-hd0-01): extend design tokens (rose tints, shadows, typography) |
| 2 | `451bb4f` | feat(260507-hd0-02): apply token system to layout, BottomNav, home, RecipeCard |

## Self-Check: PASSED

- File `frontend/app/globals.css` — FOUND (modified, +67 lines)
- File `frontend/app/layout.tsx` — FOUND (modified)
- File `frontend/app/page.tsx` — FOUND (modified)
- File `frontend/components/BottomNav.tsx` — FOUND (modified)
- File `frontend/components/RecipeCard.tsx` — FOUND (modified)
- Commit `9f9bbd4` — FOUND in `git log`
- Commit `451bb4f` — FOUND in `git log`
