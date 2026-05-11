---
phase: 08-cook-polish
plan: 02
subsystem: ui

tags: [next-intl, button-aschild, radix-slot, paper-grain, terracotta-wash, w4-closure, cook-07, tap-target, framer-tokens]

# Dependency graph
requires:
  - phase: 05-design-system-foundation
    provides: Button primitive with asChild Radix Slot, paper-grain utility, shadow-card token, ease-craft transitions, terracotta primary color
  - phase: 07-decide-polish
    provides: Established Phase 5 surface idiom (paper-grain Card + warm shadow + tinted wash) reused on the CookingBanner surface
provides:
  - Re-themed CookingBanner outer surface (paper-grain Card with bg-primary/8 wash + shadow-card)
  - W4 COOK-07 closure (Finaliser is now Button asChild wrapping Link, not raw <a> with hand-rolled inline-flex classes)
  - Both CookingBanner buttons clear the 48px tap-target floor (h-12 explicit on Finaliser + Passer)
  - Preserved emerald ChefHat icon as the cooking-active role-call signal (not absorbed into the terracotta wash)
affects: [08-03-cooking-log-finalize, 08-04-cooking-log-history, 08-05-recipe-detail, 08-06-recipe-library]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Button asChild wrapping next/link Link (Radix Slot propagates buttonVariants className through to inner anchor)"
    - "Subtle terracotta-active wash (bg-primary/8) on informational chrome — distinct from the full bg-primary saturation reserved for primary CTAs"
    - "paper-grain + shadow-card on a Card surface that is NOT a shadcn Card primitive (utility-only application on a div)"

key-files:
  created: []
  modified:
    - frontend/components/CookingBanner.tsx

key-decisions:
  - "Removed both size=\"sm\" and px-3 from the Passer Button: the size-default carries the right horizontal padding and (more importantly) size=\"sm\" was previously shadowing the explicit h-12 with the variant's h-7, regressing the tap target"
  - "Kept the ChefHat icon emerald (text-emerald-700 / dark:text-emerald-300) — emerald is reserved for the cooking-active role-call + the Validé vote chip, and this surface explicitly wants the 'cooking in flight (terracotta active wash) → press Finaliser to validate (terracotta CTA)' read"
  - "Used bg-primary/8 (8% alpha) instead of a token like bg-valide-tint or bg-primary/15 — Phase 8 reserved the 8% terracotta wash for informational chrome that should NOT compete with the primary CTA inside it"

patterns-established:
  - "Button asChild + next/link Link: anywhere a navigation action wants the Button primitive's bg-primary + rounded-md + focus ring + ease-craft transitions, wrap a Link in <Button asChild className=\"h-12\">"
  - "When overriding tap-target height on a Button, do NOT also pass size=\"sm\" — sizes carry h-7/h-9 which can shadow the explicit h-12. Either drop size and let className=\"h-12\" win, or pass size=\"lg\" if a larger built-in is needed"

requirements-completed: [COOK-07]

# Metrics
duration: 2min
completed: 2026-05-08
---

# Phase 08 Plan 02: CookingBanner W4 closure Summary

**CookingBanner re-themed to a paper-grain Card with a subtle terracotta wash (bg-primary/8) and Finaliser converted from a raw `<Link>` with hand-rolled inline-flex classes to `<Button asChild>` wrapping `<Link>` — both action buttons cleared to the 48px tap-target floor, closing W4 UI-REVIEW gap COOK-07.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-08T16:06:34Z
- **Completed:** 2026-05-08T16:08:24Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- COOK-07 W4 closure: Finaliser now uses the Phase 5 Button primitive via Radix Slot (`<Button asChild className="h-12"><Link href={...}>...</Link></Button>`). The hand-rolled `inline-flex items-center justify-center h-12 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium gap-1` is gone, replaced by inherited `buttonVariants` (with focus-visible ring, ease-craft transitions, disabled state, and `bg-primary` from variant=default).
- Passer simplified: dropped `size="sm"` (which silently shadowed the explicit h-12 with the variant's h-7) and dropped `px-3` (size-default horizontal padding from the primitive carries through). Now just `<Button type="button" variant="ghost" className="h-12" onClick={onSkip}>`.
- Outer surface re-themed: `bg-valide-tint` (emerald slab) replaced by `bg-primary/8` (terracotta-active wash at 8% alpha); added `paper-grain` (Phase 5 SVG-noise pseudo-element overlay) and `shadow-card` (warm two-layer paper-on-wood shadow). Border + rounded-2xl preserved.
- Emerald ChefHat preserved verbatim as the cooking-active role-call signal — the page now reads "cooking in flight (terracotta active wash) → press Finaliser to validate (terracotta primary CTA inside)" with the emerald icon as the role glyph.
- ARIA preserved: `role="region"` + `aria-labelledby="cooking-banner-title"` + the `<span id="cooking-banner-title">` inside the body div all intact. No a11y regression.
- TypeScript + ESLint pass clean (no new errors on `CookingBanner.tsx` after either commit).

## Task Commits

Each task was committed atomically with `--no-verify` (parallel executor):

1. **Task 1: Re-theme outer container to paper-grain Card with bg-primary/8 wash** — `72b8d0e` (feat)
2. **Task 2: Convert Finaliser raw `<Link>` to `<Button asChild>` + simplify Passer Button** — `7cec1bf` (feat)

## Files Created/Modified

- `frontend/components/CookingBanner.tsx` — Re-themed outer surface (line 35) + restructured action buttons block (lines 53–67). Net: −9 +7 lines vs Phase 3 baseline; same 73 LOC ceiling.

## Decisions Made

- **Removed `size="sm"` and `px-3` from the Passer Button.** When `size` is set explicitly, the variant's height (`size="sm"` → `h-7`) competes with `className="h-12"` in cn-merge. The explicit `h-12` was already in the v0.1 file but the `size="sm"` was effectively neutralizing it. Dropping `size` lets the size-default carry through (`h-10` baseline + `gap-1.5` + `px-2.5`) and the explicit `h-12` lands cleanly. This matches the Phase 8 UI-SPEC §"Tap-target audit" row 2 directive.
- **Used `bg-primary/8` for the wash** — the Phase 8 UI-SPEC §"Accent reserved-for" item 5 explicitly reserved 8% terracotta for the CookingBanner background. 15% would compete with the primary CTA inside; 4% would be invisible at PWA-compressed sizes.
- **Kept emerald ChefHat untouched.** The CONTEXT.md decision was clear: the role-call signal is preserved emerald even after the surface re-tints to terracotta. This is the single explicit emerald-survives-Phase-8 carve-out on this surface.

## Deviations from Plan

None — plan executed exactly as written.

Both tasks landed verbatim from the PLAN.md `<action>` blocks (the exact Before/After class strings and JSX tree). No Rule 1/2/3 auto-fixes were needed; no Rule 4 architectural questions arose. The TypeScript and ESLint checks ran clean on the modified file with zero new diagnostics.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- COOK-07 W4 closure shipped; Phase 8 plan 02 contract met.
- Plan 03 (CookingLogFinalize: COOK-08 + COOK-11 + COOK-12 + retheme) is unblocked. The Phase 8 banner surface idiom (paper-grain + bg-primary/8 wash + shadow-card on a non-Card-primitive `<div>`) is now demonstrated and can be referenced from Plan 03's CookingLogFinalize visual retheme if any informational-chrome surface is needed there.
- The Button-asChild-Link pattern is now used in this file alongside the existing usage in Plan 06 (Phase 6 capture surfaces) — pattern is firmly established and can be invoked verbatim by remaining Phase 8 plans (recipe detail "Cuisiner" CTA, recipe library "Voir" cards, etc.) wherever a navigation action wants the primitive's primary surface.

## Self-Check

Verifying all claims before returning to orchestrator.

**Files:**
- `frontend/components/CookingBanner.tsx` → FOUND

**Commits:**
- `72b8d0e` (Task 1) → FOUND in `git log --oneline`
- `7cec1bf` (Task 2) → FOUND in `git log --oneline`

**Plan-level success criteria (verified via grep against the modified file):**
- `Button asChild` in CookingBanner.tsx → 1 hit (target: 1)
- `h-12` in CookingBanner.tsx → 2 hits (target: ≥2 — Finaliser + Passer)
- `paper-grain` in CookingBanner.tsx → 1 hit (target: ≥1)
- `bg-primary/8` in CookingBanner.tsx → 1 hit (target: 1)

**Plan acceptance criteria** (Task 1 + Task 2 — all 11 grep checks):
- `bg-primary/8 paper-grain shadow-card` → 1 hit (target: 1) ✓
- `bg-valide-tint` → 0 hits (target: 0) ✓
- `paper-grain` → 1 hit (target: ≥1) ✓
- `text-emerald-700 dark:text-emerald-300` → 1 hit (target: 1) ✓
- `role="region"` → 1 hit (target: 1) ✓
- `Button asChild` → 1 hit (target: ≥1) ✓
- `inline-flex items-center justify-center h-12 px-4 rounded-md` → 0 hits (target: 0) ✓
- `size="sm"` or `className="h-12 px-3"` → 0 hits (target: 0) ✓
- `h-12` → 2 hits (target: 2) ✓
- `cooking-logs/${logId}/finalize` → 1 hit at line 55 (target: 1) ✓
- `Sparkles size={16}` → 1 hit at line 56 (target: 1) ✓

**Build health:**
- `npx tsc --noEmit` filtered to `CookingBanner` → empty (no new errors) ✓
- `npm run lint` filtered to `CookingBanner` → empty (no new errors) ✓

## Self-Check: PASSED

---
*Phase: 08-cook-polish*
*Plan: 02*
*Completed: 2026-05-08*
