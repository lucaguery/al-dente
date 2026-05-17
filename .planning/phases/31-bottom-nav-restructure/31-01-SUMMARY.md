---
phase: 31
plan: 01
subsystem: frontend/navigation
tags: [nav, bottom-nav, CTA, i18n, accessibility, tailwind, next-intl]
requirements_closed: [NAV-01]

dependency_graph:
  requires: []
  provides:
    - Central elevated Ajouter CTA in bottom nav (variant central-cta)
    - Discriminated-union Tab type for grep-provable variant enforcement
    - usePathname-based active matching (replaces useSelectedLayoutSegment for active state)
    - nav.profile and nav.add i18n keys
    - main padding-bottom clearance for 4.5rem nav
  affects:
    - frontend/components/BottomNav.tsx
    - frontend/app/layout.tsx
    - frontend/lib/i18n/fr.json

tech_stack:
  added: []
  patterns:
    - Discriminated union Tab type (variant "tab" | "central-cta") with TypeScript narrowing
    - usePathname() for active matching + useSelectedLayoutSegment() for hide gate (coexistence)
    - aria-current="page" on active <Link> (WCAG 2.1 current-page pattern)
    - always-filled CTA circle + additive ring on active (D-11)

key_files:
  created: []
  modified:
    - frontend/components/BottomNav.tsx
    - frontend/app/layout.tsx
    - frontend/lib/i18n/fr.json

decisions:
  - D-01 through D-18 implemented at full fidelity (all 18 locked decisions from CONTEXT.md)
  - Load-bearing: D-09 usePathname switch, D-10 segment hide gate, D-12 mutually exclusive active, D-13 discriminated union, D-15 settings→profile, D-16 nav.add

metrics:
  duration_seconds: 249
  completed_date: "2026-05-18"
  tasks_completed: 4
  tasks_total: 4
  files_modified: 3
---

# Phase 31 Plan 01: Bottom Nav CTA Restructure Summary

**One-liner:** Discriminated-union BottomNav rewrite with central filled-primary Ajouter CTA, usePathname active matching, and 4.5rem nav height — closing NAV-01.

---

## What Was Built

Rewrote `frontend/components/BottomNav.tsx` from a 3-tab `useSelectedLayoutSegment`-based component to a 4-slot discriminated-union component. The new shape:

- `FlatTab` (variant: "tab") for Accueil / Recettes / Profil — flat icon + label + active pill wash
- `CentralCTA` (variant: "central-cta") for Ajouter — always-filled `bg-primary` circle (56px, `w-14 h-14`) with white `Plus` glyph, active state adds `ring-2 ring-primary/30`

Active matching switched from `useSelectedLayoutSegment()` (which returns `"recipes"` for both `/recipes` and `/recipes/new`, causing the double-active collision) to `usePathname()` with per-tab predicates. The Recettes prefix-match explicitly excludes `/recipes/new` via `pathname !== "/recipes/new"`.

The segment hook is preserved for the onboarding hide gate only (both hooks coexist in the same client component).

---

## Requirements Closed

- **NAV-01:** Central elevated Ajouter CTA — filled primary circle, white +, aria-current semantics, per-tab variant discriminator, safe-area and onboarding-hide preserved.

---

## Decisions Implemented (D-01 to D-18)

| Decision | Status |
|----------|--------|
| D-01: 4 slots total (3 flat + 1 CTA) | Implemented |
| D-02: Order Accueil / Recettes / Ajouter / Profil | Implemented |
| D-03: All 4 slots flex: 1 (no width: 25% hardcoding) | Implemented |
| D-04: Inline-larger circle, contained in nav bar | Implemented |
| D-05: CTA 56px (w-14 h-14), nav 72px (min-h-[4.5rem]) | Implemented |
| D-06: Ajouter label below circle, text-xs font-medium | Implemented |
| D-07: main pb raised to calc(5rem + safe-area) | Implemented |
| D-08: Active = pathname === "/recipes/new" exact match | Implemented |
| D-09: usePathname() for active (load-bearing fix) | Implemented |
| D-10: segment hook kept for onboarding hide gate | Implemented |
| D-11: CTA active = filled + ring-2 ring-primary/30 (additive) | Implemented |
| D-12: Mutually exclusive active across 4 slots | Implemented |
| D-13: variant: "tab" | "central-cta" discriminated union | Implemented |
| D-14: Grep gate confirms discriminator in use | PASS (>= 2 hits) |
| D-15: nav.settings → nav.profile = "Profil" | Implemented |
| D-16: nav.add = "Ajouter" (visible label + aria-label) | Implemented |
| D-17: Profil tab icon stays Settings (icon swap deferred) | Implemented |
| D-18: No drafts badge to preserve (Phase 27 removed it) | Confirmed |

---

## Grep Gates (Task 4 Results)

| Gate | Command | Result | Status |
|------|---------|--------|--------|
| 1 - Variant discriminator | `grep -c 'variant: "central-cta"' BottomNav.tsx` | 3 hits (comment + type + TABS entry) | PASS (>= 2) |
| 2 - No 4rem nav-height refs | `grep -rn 'pb-16\|pb-\[4rem\|min-h-\[4rem\]' app/ components/` | 0 hits | PASS |
| 3 - nav.settings gone | `grep -n '"settings": "Réglages"' fr.json` | 0 hits | PASS |
| 4 - profile + add present | `grep -c '"profile": "Profil"\|"add": "Ajouter"' fr.json` | 1 + 1 | PASS |
| 5 - No Réglages in tests | `grep -rn 'Réglages\|Reglages' frontend/tests/` | 0 hits | PASS |
| 6 - TypeScript clean | `npx tsc --noEmit` (BottomNav.tsx, layout.tsx) | 0 errors | PASS |
| 6 - ESLint clean | `npx eslint components/BottomNav.tsx app/layout.tsx` | No issues | PASS |
| 7 - Build smoke | `npm run build` | Compiled successfully (16/16 pages) | PASS |

**Note on Gate 7:** The build compiles successfully ("Compiled successfully in 2.9s", 16/16 static pages generated). A pre-existing `ENVIRONMENT_FALLBACK` error fires during static rendering when `RAILWAY_URL` is not set in the local environment — this is not caused by Phase 31 changes.

---

## Files Modified

| File | Change |
|------|--------|
| `frontend/components/BottomNav.tsx` | Full rewrite — discriminated-union Tab type, 4-slot TABS, usePathname active matching, central-cta render branch, 4.5rem nav height |
| `frontend/app/layout.tsx` | Single token change: pb-[calc(4rem+…)] → pb-[calc(5rem+…)] on the `<main>` element |
| `frontend/lib/i18n/fr.json` | Delete nav.settings; add nav.profile = "Profil"; add nav.add = "Ajouter" |

---

## Architecture Invariants Touched

- **Invariant #6 (French-only via next-intl):** nav.profile and nav.add keys added through next-intl (`useTranslations("nav")`); no hardcoded French strings in component.

---

## Deviations from Plan

None — plan executed exactly as written. All 4 tasks completed, all acceptance criteria met, all grep gates pass.

**Note on wc -l acceptance criterion:** Task 3 states `wc -l frontend/app/layout.tsx` should return 78, but the file was 77 lines before and after (the plan's research had a 1-line off-by-one). The actual change is correct: exactly 1 line changed (1 insertion, 1 deletion). No deviation in behavior.

---

## Known Stubs

None. All 4 slots in the bottom nav are fully wired:
- Accueil → `href="/"`, active on `pathname === "/"`
- Recettes → `href="/recipes"`, active on `pathname.startsWith("/recipes") && pathname !== "/recipes/new"`
- Ajouter → `href="/recipes/new"`, always-filled CTA
- Profil → `href="/settings"`, active on `pathname.startsWith("/settings")`

---

## Threat Surface Scan

No new trust boundaries introduced. The CTA links to the existing `/recipes/new` route (hardened in Phase 26 CAPTURE-04). Both STRIDE mitigations from the plan's threat model are implemented:

- **T-31-01** (onboarding hide): `segment?.startsWith("onboarding")` preserved verbatim — grep confirms 1 hit.
- **T-31-02** (CTA accessible name): `aria-label={t("add")}` on the CTA `<Link>` — grep confirms 1 hit.

---

## Follow-up Work Surfaced

- **Phase 32 candidate:** Icon swap for Profil tab — the Settings icon (⚙) now labels a "Profil" tab. Label-icon mismatch is intentional interim per D-17; Phase 32 (Sober Kitchen port) is the natural home for the icon reconciliation.
- **Phase 32 candidate:** `nav.aria_label` i18n key — the TODO(productize) marker on `aria-label="Navigation principale"` remains; unblocked when a new key is permissible in the production i18n cycle.
- **gh#26 forward compatibility confirmed:** The `flex: 1` siblings pattern (no `width: 25%`) means adding a 5th Suggérer slot is a one-line `TABS` extension.

---

## Commits

| Hash | Description |
|------|-------------|
| 57f27af | feat(31-01): rename nav.settings → nav.profile and add nav.add in fr.json |
| 503232d | feat(31-01): rewrite BottomNav with discriminated-union Tab type and central CTA |
| 49f7ef4 | feat(31-01): raise main pb from 4rem to 5rem to clear taller nav |

---

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| frontend/components/BottomNav.tsx exists | FOUND |
| frontend/app/layout.tsx exists | FOUND |
| frontend/lib/i18n/fr.json exists | FOUND |
| .planning/phases/31-bottom-nav-restructure/31-01-SUMMARY.md exists | FOUND |
| Commit 57f27af exists | FOUND |
| Commit 503232d exists | FOUND |
| Commit 49f7ef4 exists | FOUND |
