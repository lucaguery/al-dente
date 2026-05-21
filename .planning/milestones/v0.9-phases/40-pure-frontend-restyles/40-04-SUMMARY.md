---
phase: 40
plan: 04
subsystem: frontend
tags: [splash, la-grille, loading-state]
requires: []
provides:
  - Next.js App Router root loading state with La Grille splash composition
affects:
  - frontend/app/loading.tsx
tech_stack:
  added: []
  patterns:
    - "Server Component loading.tsx via next-intl/server.getTranslations() (root-level App Router loading state)"
key_files:
  created:
    - frontend/app/loading.tsx
  modified:
    - frontend/lib/i18n/fr.json
key_decisions:
  - "Task 1 no-op: NEXT_PUBLIC_APP_VERSION was already exposed in frontend/next.config.ts (line 93) — reused"
  - "loading.tsx is a Server Component (async function) using next-intl/server.getTranslations to avoid client-side hydration overhead on a transient render"
  - "SPLA-02 properly deferred — layout.tsx contains 0 apple-touch-startup-image references"
requirements_completed:
  - SPLA-01
duration: "~10 min"
completed: 2026-05-21
---

# Phase 40 Plan 04: Root Loading.tsx La Grille Splash Summary

Added `frontend/app/loading.tsx` as the App Router root loading state with the La Grille splash composition (BrandIcon 128px + `Al Dente.` wordmark with terracotta accent dot + tagline + 3-dot Geist Mono loader + version footer). SPLA-02 (iOS apple-touch-startup-image matrix) explicitly deferred per D-09.

## What was built

- `frontend/app/loading.tsx` (60 lines): Server Component, async default export reading `splash.tagline` via `getTranslations()` from `next-intl/server`. Layout: `min-h-screen flex flex-col items-center justify-center gap-4 bg-background`. Version footer reads `process.env.NEXT_PUBLIC_APP_VERSION` (already exposed via `next.config.ts`) + current year via `new Date().getFullYear()`.
- `frontend/lib/i18n/fr.json`: added `splash.tagline` ("On mange quoi ce soir ?") as a new top-level namespace.

## Deviations from Plan

**[Rule 1 — no-op] Task 1 already complete**
- Found during: Task 1 (next.config.ts inspection).
- Issue: Plan instructed adding `NEXT_PUBLIC_APP_VERSION` to `next.config.ts` env block. Inspection showed line 93 already exposes it (QW-02 / gh#15 work).
- Fix: Skipped Task 1 modifications; reused the existing exposure.
- Files modified: None.

**Total deviations:** 1 (pre-existing infrastructure). **Impact:** None — saves 1 commit.

## Verification

- ✓ `cd frontend && npm run lint` — clean.
- ✓ `grep -E "BrandIcon|Al Dente|NEXT_PUBLIC_APP_VERSION" frontend/app/loading.tsx | wc -l` — 5 matches (≥3).
- ✓ `grep -E "Fraunces|Cormorant|Caveat|paper-grain|Sober Kitchen|bg-surface-rose-100|apple-touch-startup-image" frontend/app/loading.tsx | wc -l` — 0.
- ✓ `grep -c "apple-touch-startup-image" frontend/app/layout.tsx` — 0 (SPLA-02 properly deferred).
- ✓ `frontend/app/loading.tsx` exists with 60 lines (≥30).

## Issues Encountered

None.

## Self-Check: PASSED

Ready for Plan 40-05.
