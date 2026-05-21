---
phase: 40
plan: 02
subsystem: frontend
tags: [onboarding, la-grille, wordmark]
requires: []
provides:
  - La Grille onboarding welcome composition
affects:
  - frontend/app/onboarding/welcome/page.tsx
tech_stack:
  added: []
  patterns:
    - "Tagline split into three i18n keys to wrap italic <em> emphasis cleanly"
key_files:
  created:
    - frontend/tests/e2e/onboarding-welcome-la-grille.spec.ts
  modified:
    - frontend/lib/i18n/fr.json
    - frontend/app/onboarding/welcome/page.tsx
key_decisions:
  - "Tagline split: tagline_lead + tagline_emphasis + tagline_tail (three keys) so <em> wraps only ce soir"
  - "Existing tagline/create_cta/join_cta keys preserved alongside new primary_cta/ghost_cta/footer (additive)"
requirements_completed:
  - ONBO-01
duration: "~10 min"
completed: 2026-05-21
---

# Phase 40 Plan 02: Onboarding Welcome La Grille Rewrite Summary

Rewrote `/onboarding/welcome` from the prior Card-wrapped CTA pair to the La Grille wordmark-centric composition: BrandIcon + `Al Dente.` wordmark with terracotta accent dot + italic-emphasis tagline + sub-tagline + primary filled-dark CTA + ghost hairline CTA + footer marketing line.

## What was built

- `frontend/lib/i18n/fr.json`: added 6 new keys under `onboarding.welcome.*` (`tagline_lead`, `tagline_emphasis`, `tagline_tail`, `sub_tagline`, `primary_cta`, `ghost_cta`, `footer`). Existing keys (`tagline`, `create_cta`, `join_cta`) preserved for backward-safe additive diff.
- `frontend/app/onboarding/welcome/page.tsx` (40 insertions / 61 deletions): centered composition on `bg-background`. `BrandIcon` at 72px, `<h1>` wordmark with `.text-primary` accent dot, tagline `<p>` with `<em>` on "ce soir", sub-tagline `<p>` with `max-w-[32ch]`, button pair (default + outline) wrapping `Link href="/onboarding/create"` and `Link href="/onboarding/join"`, footer in `text-caption`.
- `frontend/tests/e2e/onboarding-welcome-la-grille.spec.ts` (57 lines, 7 tests): Card-free, wordmark h1, italic emphasis on `ce soir`, sub-tagline, both CTAs with correct hrefs, footer marketing line.

## Deviations from Plan

None — plan executed exactly as written. Existing `tagline`/`create_cta`/`join_cta` keys were left in fr.json (no consumers identified outside this page, but additive-diff is safer than rename-during-MVP).

**Total deviations:** 0. **Impact:** None.

## Verification

- ✓ `cd frontend && npm run lint` — clean.
- ✓ `grep -E "<Card|from.*\"card\"" frontend/app/onboarding/welcome/page.tsx | wc -l` — 0.
- ✓ `grep -F "<em" frontend/app/onboarding/welcome/page.tsx | wc -l` — 1.
- ✓ Both `/onboarding/create` and `/onboarding/join` hrefs present.
- ✓ Spec file exists with 7 test blocks.

## Issues Encountered

None.

## Self-Check: PASSED

Ready for Plan 40-03.
