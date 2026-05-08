---
phase: 08-cook-polish
plan: 03
subsystem: ui
tags: [next-intl, tailwind-v4, framer-motion-vocabulary, paper-grain, ease-craft, motion, slow-food, phase-5-tokens]

# Dependency graph
requires:
  - phase: 05-design-system-foundation
    provides: "ease-craft cubic-bezier token (--ease-craft on @theme), paper-grain utility (.paper-grain ::before SVG overlay), prefers-reduced-motion media query that clamps transition-transform/duration-100 to 0ms"
  - phase: 04-polish-w4
    provides: "RatingPicker shape baseline (h-20 cards, h-flat / liked / disliked semantics, selected-state color story) — preserved verbatim"
provides:
  - "RatingPicker press feedback now uses Phase 8 paper-physics motion (transition-colors transition-transform duration-100 ease-craft active:scale-95)"
  - "Paper-grain texture anchored on each rating card surface — cluster joins kitchen-counter card system"
  - "Helper-line typography folded to text-sm leading-5 — Phase 8 type scale resolves to exactly 4 sizes"
  - "Closes W4 UI-REVIEW gap COOK-08 in Phase 8 inline (no separate fix phase)"
affects: [08-04 (CookingLogFinalize wraps RatingPicker), 09-onboarding-polish (helper-line size precedent)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Phase 5 motion vocabulary applied to interactive press feedback (--ease-craft + duration-100 read more 'press' than 'transition')"
    - "transition-colors and transition-transform listed as separate utilities (NOT transition-all) so each property has targeted timing without merging into a conflicting ease curve"
    - "Tailwind canonical scale (active:scale-95) preferred over arbitrary bracketed value (active:scale-[0.98])"
    - "Type-scale 4-size discipline: text-display / text-title / text-base / text-sm (no text-xs on Phase 8 surfaces)"

key-files:
  created: []
  modified:
    - "frontend/components/RatingPicker.tsx — lines 67-68 (className array surface row + motion row); line 83 (helper span typography)"

key-decisions:
  - "Replaced transition-all duration-150 with explicit transition-colors + transition-transform pair so the colors-on-selection animation continues to inherit duration-100 ease-craft alongside the transform animation"
  - "Upgraded active:scale-[0.98] to active:scale-95 (Tailwind canonical 5% depression) per CONTEXT.md spec — slightly stronger paper-physics depression"
  - "paper-grain added to surface row (alongside shadow-card) rather than wrapping the button in a Card primitive — keeps the existing <button> render structure byte-for-byte"
  - "iOS reduced-motion handled by globals.css prefers-reduced-motion clamp (existing in Phase 5) — no per-component useReducedMotion call"

patterns-established:
  - "COOK-08 closure pattern: Phase 5 motion tokens (ease-craft + duration-100) applied to interactive press feedback on tappable cards"
  - "paper-grain placement on raw <button> elements (not just Card primitives) when buttons are the focal cluster of a screen"

requirements-completed: [COOK-08]

# Metrics
duration: 9min
completed: 2026-05-08
---

# Phase 8 Plan 03: RatingPicker W4 Closure Summary

**COOK-08 closed: RatingPicker press feedback upgraded from instant transition-all snap to 100ms ease-craft paper-physics depression, paper-grain anchor added to each rating card surface, and helper-line typography folded into the Phase 8 4-size type-scale.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-05-08T16:00:00Z
- **Completed:** 2026-05-08T16:09:16Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- **COOK-08 W4 UI-REVIEW gap closed** — `transition-all duration-150 active:scale-[0.98]` replaced with `transition-colors transition-transform duration-100 ease-craft active:scale-95`. The press feedback now eases over 100ms with the Phase 5 `--ease-craft` cubic-bezier curve, giving the rating cluster the same paper-physics press feel as the rest of the cook-time loop.
- **Paper-grain anchor added to each rating button** — the cluster now joins the kitchen-counter card system established in Phases 5 / 6 / 7. Per UI-SPEC §"Phase 8 paper-grain placement", the existing RatingPicker uses raw `<button>` elements (not the Card primitive), so the inherited grain did NOT apply automatically; a `paper-grain` utility on each button surface row brings the cards into the system.
- **Helper-line size folded to text-sm leading-5** — the previous `text-xs leading-4` (12/16) is folded into `text-sm leading-5` (14/20) so the Phase 8 type scale resolves to exactly 4 sizes (`text-display` / `text-title` / `text-base` / `text-sm`). The helper line gains 2px of body and 4px of leading; legibility on iPhone PWA improves with no layout regressions (the `h-20` rating card has ample vertical room).
- **Selected-state colors and structural code preserved verbatim** — CARDS array, UNSELECTED constant, props type, render structure, i18n calls, Icon JSX, label span, focus-visible ring, `aria-pressed`, and `onClick` are all untouched.

## Task Commits

Each task was committed atomically (with `--no-verify` per parallel-executor flag):

1. **Task 1: Replace press transition + add paper-grain on RatingPicker buttons (COOK-08 closure)** — `d0ee450` (feat)
2. **Task 2: Fold helper-line typography from text-xs leading-4 to text-sm leading-5** — `8236615` (refactor)

_No metadata commit yet — STATE.md / ROADMAP.md updates are deferred to the orchestrator per the parallel-executor instructions ("Do NOT update STATE.md or ROADMAP.md")._

## Files Created/Modified

- `frontend/components/RatingPicker.tsx` — line 67 surface-row className gains `paper-grain`; line 68 motion-row className replaced wholesale with `transition-colors transition-transform duration-100 ease-craft active:scale-95`; line 83 helper span typography folded to `text-sm text-foreground-muted leading-5`. Net diff: 3 insertions, 3 deletions.

## Decisions Made

- **Two transition utilities instead of `transition-all`** — UI-SPEC §"Phase 8 motion contract" explicitly forbids `transition-all` here (it would catch the `transition-colors` already implied by the selected/unselected color flip and merge into a conflicting timing). Listing `transition-colors` and `transition-transform` separately gives each property its own targeted transition with the same `duration-100 ease-craft` timing.
- **`active:scale-95` (Tailwind canonical) over `active:scale-[0.98]` (arbitrary)** — CONTEXT.md explicitly specifies `active:scale-95`, which is a 5% depression vs the previous 2% bracketed value. The slightly stronger depression reads more like a paper press and aligns with Tailwind's canonical scale.
- **paper-grain on the surface row (not the motion row)** — keeps the surface-related utilities (`shadow-card`, `paper-grain`) grouped on the same line as `rounded-xl` so the visual identity is co-located.
- **iOS reduced-motion handled globally** — globals.css already carries `prefers-reduced-motion` clamps that collapse `transition-transform` `duration-100` to 0ms. No per-component `useReducedMotion()` hook needed.

## Deviations from Plan

None — plan executed exactly as written. Both task action blocks specified the exact pre/post strings; the Edit tool applied them byte-for-byte and verification queries returned the expected hit counts.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. Visual verification on physical iPhone (Safari → Add to Home Screen) is the standard Phase 8 acceptance gate; that gate is the orchestrator's responsibility, not this plan's.

## Verification Results

- `cd frontend && npx tsc --noEmit -p tsconfig.json` → no errors
- `cd frontend && npx eslint components/RatingPicker.tsx` → no issues
- `grep -c "transition-transform.*duration-100" frontend/components/RatingPicker.tsx` → 1 hit (line 68) ✓
- `grep -c "active:scale-95" frontend/components/RatingPicker.tsx` → 1 hit (line 68) ✓
- `grep -c "paper-grain" frontend/components/RatingPicker.tsx` → 1 hit (line 67) ✓
- `grep -cF 'active:scale-[0.98]' frontend/components/RatingPicker.tsx` → 0 hits ✓
- `grep -cF 'transition-all duration-150' frontend/components/RatingPicker.tsx` → 0 hits ✓
- `grep -cF 'text-xs' frontend/components/RatingPicker.tsx` → 0 hits ✓
- `grep -cF 'text-sm text-foreground-muted leading-5' frontend/components/RatingPicker.tsx` → 1 hit ✓

## Next Phase Readiness

- Plan 08-04 (CookingLogFinalize: COOK-11 offline guard + COOK-12 ICU subhead + general retheme) consumes RatingPicker as a child component; the press-feedback + paper-grain treatment is now stable and does not require further changes from 08-04.
- Real-device smoke test (08-UI-SPEC §"Real-device smoke test" items 6 + 9) is deferred to the phase-level acceptance gate after all 08-XX plans complete: tap a rating card on the finalize page → confirm 100ms scale-95 depression; enable iOS reduce-motion → tap a card → confirm press collapses to instant.

---
*Phase: 08-cook-polish*
*Plan: 03 (COOK-08 W4 closure)*
*Completed: 2026-05-08*

## Self-Check: PASSED

- File `frontend/components/RatingPicker.tsx` exists ✓
- Commit `d0ee450` exists in `git log --oneline` ✓
- Commit `8236615` exists in `git log --oneline` ✓
- All grep success criteria pass (see Verification Results above) ✓
- TypeScript clean ✓
- ESLint clean ✓
