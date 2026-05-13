---
phase: 22
plan: 22-01-geist-mono-removal
subsystem: frontend/fonts
tags: [fonts, css, performance, quick-win]
requirements: [QW-01]

dependency_graph:
  requires: []
  provides: [geist-mono-removed]
  affects: [frontend/app/layout.tsx, frontend/app/globals.css, frontend/app/onboarding/join/page.tsx, frontend/components/UrlCaptureTab.tsx]

tech_stack:
  added: []
  patterns: [tabular-nums as font-mono fallback without loading a new font]

key_files:
  modified:
    - frontend/app/layout.tsx
    - frontend/app/globals.css
    - frontend/app/onboarding/join/page.tsx
    - frontend/components/UrlCaptureTab.tsx

decisions:
  - "D-03: Remove Geist_Mono import + geistMono variable from layout.tsx entirely"
  - "D-04: Remove --font-mono self-reference from globals.css @theme block"
  - "D-01: Invite-code input uses tabular-nums + tracking-[0.3em] + uppercase (IBM Plex Sans carries the code signal)"
  - "D-02: URL input uses tabular-nums text-sm (equal-width digits without a new font request)"

metrics:
  duration_minutes: 20
  completed_date: "2026-05-12T21:11:03Z"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 4
---

# Phase 22 Plan 01: Geist Mono Removal Summary

**One-liner:** Removed Geist Mono font entirely from the bundle — import, CSS variable, and both `font-mono` render call sites — replacing with `tabular-nums` on IBM Plex Sans.

## What Was Built

Geist Mono is no longer requested on any page load. The three touchpoints in `layout.tsx` (import, const block, html className) and the `--font-mono` alias in `globals.css` are gone. Both render call sites that used `font-mono` (`onboarding/join` invite-code input and `UrlCaptureTab` URL input) now use `tabular-nums` instead, preserving equal-width character alignment without adding a font request.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove Geist_Mono import and variable from root layout | 906b03c | frontend/app/layout.tsx |
| 2 | Remove --font-mono alias from globals.css @theme block | 387db85 | frontend/app/globals.css |
| 3 | Swap font-mono → tabular-nums at the two render call sites | a82069f | frontend/app/onboarding/join/page.tsx, frontend/components/UrlCaptureTab.tsx |

## Verification Results

- D-18 grep gate: `grep -rn "font-mono\|--font-mono\|Geist_Mono" frontend/{app,components,lib}` returns **zero matches**
- Invite-code input on `/onboarding/join` — class is `text-center tabular-nums tracking-[0.3em] uppercase`
- URL input in `UrlCaptureTab` — class is `tabular-nums text-sm`
- `Geist_Mono` import and `geistMono` variable removed from `layout.tsx`
- `--font-mono: var(--font-mono);` removed from `globals.css`
- TypeScript type check (`tsc --noEmit`) passed clean

## Deviations from Plan

None — plan executed exactly as written. All three tasks were surgical single-line/single-block removals per D-01 through D-04.

## Known Stubs

None.

## Threat Flags

None — pure display/bundle change with no security surface.

## Self-Check: PASSED

All modified files exist on disk. All three task commits (906b03c, 387db85, a82069f) are present in git history.
