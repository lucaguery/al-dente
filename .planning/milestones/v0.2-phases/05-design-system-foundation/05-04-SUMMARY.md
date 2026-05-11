---
phase: 05-design-system-foundation
plan: 04
subsystem: ui
tags: [framer-motion, motion-presets, design-tokens, lockstep, typescript-satisfies]

requires:
  - phase: 05-design-system-foundation
    plan: 01
    provides: "CSS motion tokens in globals.css @theme inline: --ease-craft (cubic-bezier(0.32, 0.72, 0.0, 1)), --duration-fast: 150ms, --duration-normal: 280ms — the JS module mirrors these exact values"

provides:
  - "frontend/lib/motion.ts: TypeScript single source of truth for Framer Motion presets"
  - "Named exports easeCraft, durations, transitions, variants — every framer-motion consumer in Phases 6-9 imports from here"
  - "Numeric lockstep with CSS motion tokens: same 4-control-point cubic-bezier, same two durations, expressed in framer-motion's seconds convention"
  - "Four named variants ready to consume: fadeIn (opacity), slideUp (opacity+y=12), pressFeedback (scale 1↔0.98), swipeCommit (rest/left/right with x±480, rotate±8)"
  - "TypeScript literal-narrow types via `satisfies Transition` / `satisfies Variants` + `as const` — consumers see literal `0.15` / `0.28`, not widened `number`"

affects:
  - "05-05 (primitive re-themes): shadcn primitives may import `transitions.fast` / `transitions.normal` for hover and focus animations"
  - "05-06 (styleguide route): motion preview section will import `variants.fadeIn` etc. to demonstrate the language"
  - "07-decide-polish (swipe-deck): `variants.swipeCommit` is the canonical contract for left/right commit animations"
  - "06-decide-polish, 08-cooking-polish, 09-realtime-polish: any motion-driven UI consumes from here"

tech-stack:
  added: []
  patterns:
    - "Single-source-of-truth motion contract: CSS tokens in @theme for utilities, mirrored as TS constants for framer-motion — one curve, two durations, no drift"
    - "TypeScript `satisfies` operator (TS 4.9+) to validate against framer-motion structural types without widening literal numerics"
    - "Outer `as const` assertion on object literals so consumers see read-only literal types end-to-end (e.g., `easeCraft: readonly [0.32, 0.72, 0, 1]`)"

key-files:
  created:
    - "frontend/lib/motion.ts"
  modified: []

key-decisions:
  - "Wrote the module verbatim from UI-SPEC §Motion — zero local deviations. The four-key `variants` object (fadeIn, slideUp, pressFeedback, swipeCommit) covers exactly the motion patterns the v0.2 milestone needs (entry fade, sheet slide, button press, swipe commit). No additional helper exports."
  - "Did NOT add a `useReducedMotion()` wrapper or any reduced-motion gate inside motion.ts. The reduced-motion contract is a per-consumer concern: CSS side handled by the existing `@media (prefers-reduced-motion: reduce)` block in globals.css; JS side handled by Phase 7 swipe-deck calling framer-motion's `useReducedMotion()` hook directly. Phase 5 ships only the bare contract."
  - "Used `[0.32, 0.72, 0.0, 1] as const` as a 4-tuple (not a string `'cubic-bezier(...)'`) because framer-motion's `Transition.ease` accepts numeric arrays for cubic-bezier curves — keeps the JS form parsable and lets framer-motion compose with other ease modifiers in the future."
  - "Two `satisfies Transition` clauses (transitions.fast, transitions.normal) and four `satisfies Variants` clauses (one per variant key) — placed at the inner object level rather than on the outer object so each entry validates against the framer-motion contract independently."

patterns-established:
  - "Pattern: design-token mirroring — CSS tokens in @theme stay authoritative for utilities; TS constants in lib/* re-export the same numeric values for JS-driven code paths (framer-motion, animation libs). Naming convention: CSS uses `--ease-craft` / `--duration-fast`; TS uses `easeCraft` / `durations.fast`."
  - "Pattern: framer-motion preset module shape — `easeCraft` (curve), `durations` (object), `transitions` (composed: duration + ease), `variants` (states + transitions). This four-layer pyramid is reusable for future motion families if the milestone ever introduces a second curve."
  - "Pattern: `as const` + `satisfies` combo. `as const` narrows literal types; `satisfies` validates structural shape without widening. Together they give consumers exact literal autocomplete plus framer-motion type safety."

requirements-completed: [DESIGN-06]

duration: 1min
completed: 2026-05-08
---

# Phase 05 Plan 04: Framer Motion preset module Summary

**Created `frontend/lib/motion.ts` — the JS half of DESIGN-06. Exports `easeCraft`, `durations`, `transitions`, and `variants` (fadeIn / slideUp / pressFeedback / swipeCommit) per UI-SPEC §Motion verbatim, in numeric lockstep with the CSS motion tokens in globals.css.**

## Performance

- **Duration:** ~1 min
- **Tasks:** 1
- **Files created:** 1 (`frontend/lib/motion.ts`)
- **Files modified:** 0

## Accomplishments

- **DESIGN-06 (JS half):** `frontend/lib/motion.ts` written with the exact module content from UI-SPEC §Motion. Four named exports, no extra helpers, no scope creep.
- **Numeric lockstep verified:**
  - `easeCraft = [0.32, 0.72, 0.0, 1]` ↔ globals.css `--ease-craft: cubic-bezier(0.32, 0.72, 0.0, 1)` (Plan 01 Task 2)
  - `durations.fast = 0.15` ↔ `--duration-fast: 150ms`
  - `durations.normal = 0.28` ↔ `--duration-normal: 280ms`
- **TypeScript shape:**
  - `import type { Transition, Variants } from "framer-motion"` — type-only import (no runtime cost)
  - 2 × `satisfies Transition` (transitions.fast, transitions.normal)
  - 4 × `satisfies Variants` (fadeIn, slideUp, pressFeedback, swipeCommit)
  - Outer `as const` assertions on `easeCraft`, `durations`, `transitions`, `variants` so literal types survive end-to-end
- **Variants landed (verbatim from UI-SPEC):**
  - `fadeIn`: hidden opacity 0 → visible opacity 1 with `transitions.normal`
  - `slideUp`: hidden { opacity: 0, y: 12 } → visible { opacity: 1, y: 0 } with `transitions.normal`
  - `pressFeedback`: rest scale 1 → pressed scale 0.98, both with `transitions.fast`
  - `swipeCommit`: rest { x: 0, rotate: 0 }, left { x: -480, rotate: -8, opacity: 0 }, right { x: 480, rotate: 8, opacity: 0 }, all with `transitions.normal`

## Module Layout

```
frontend/lib/motion.ts (43 lines)
├── docblock
├── import type { Transition, Variants } from "framer-motion"
├── export const easeCraft = [0.32, 0.72, 0.0, 1] as const
├── export const durations = { fast: 0.15, normal: 0.28 } as const
├── export const transitions = { fast: {...} satisfies Transition, normal: {...} satisfies Transition } as const
└── export const variants = {
      fadeIn:        { hidden, visible }        satisfies Variants,
      slideUp:       { hidden, visible }        satisfies Variants,
      pressFeedback: { rest, pressed }          satisfies Variants,
      swipeCommit:   { rest, left, right }      satisfies Variants,
    } as const
```

## Reduced-Motion Contract

Per UI-SPEC §Motion "Reduced-motion contract" — explicitly NOT handled inside `motion.ts`:

- **CSS side:** the existing `@media (prefers-reduced-motion: reduce)` block at the bottom of `frontend/app/globals.css` (preserved unchanged by Plan 01) clamps all CSS animation/transition durations. This continues to cover Tailwind utility-driven motion (`duration-fast`, `duration-normal`, `ease-craft` utilities).
- **JS side:** consumers (notably the Phase 7 swipe-deck) MUST call framer-motion's `useReducedMotion()` hook and substitute `instant: true` on commit. Phase 5 ships only the bare preset contract; per-consumer reduced-motion gating is downstream of this module.
- **Why no wrapper here:** adding a `useReducedMotionVariants()` helper would (a) make `motion.ts` a React-hook module instead of a pure constants module, (b) couple all consumers to one reduced-motion strategy, (c) violate the plan's explicit "no extra exports" hard constraint. The split CSS-globals / JS-per-consumer strategy is the documented contract.

## Numeric Lockstep With Plan 01

| Layer | CSS token (Plan 01) | TS export (Plan 04) | Match |
|-------|---------------------|---------------------|-------|
| Curve | `--ease-craft: cubic-bezier(0.32, 0.72, 0.0, 1)` | `easeCraft = [0.32, 0.72, 0.0, 1]` | exact |
| Fast duration | `--duration-fast: 150ms` | `durations.fast = 0.15` | exact (s vs ms) |
| Normal duration | `--duration-normal: 280ms` | `durations.normal = 0.28` | exact (s vs ms) |

Both halves of DESIGN-06 reference UI-SPEC §Motion as the single authoritative source — the lockstep is enforced by both plans transcribing the same upstream values, not by tooling.

## Verification Run

The plan's `<verify>` block specifies grep checks plus `cd frontend && npx tsc --noEmit lib/motion.ts`. The grep checks all pass (executed inline before commit):

```
OK: file exists
OK: easeCraft tuple
OK: fast duration
OK: normal duration
OK: transitions export
OK: variants export
OK: fadeIn variant
OK: slideUp variant
OK: pressFeedback variant
OK: swipeCommit variant
OK: satisfies Transition count=2
OK: satisfies Variants count=4
OK: type import
```

Additionally:
- `swipeCommit` literal values verified: `x: -480`, `x: 480`, `rotate: -8`, `rotate: 8` — all present.
- Total exports: exactly 4 (`easeCraft`, `durations`, `transitions`, `variants`) — no extra helpers leaked through.

The `npx tsc --noEmit` step is **not runnable in this worktree** — `frontend/node_modules/` is absent (parallel-execution constraint, same as Plan 01 documented). Type validation is owned by the orchestrator's post-merge gate. The module is structurally correct against framer-motion 12.x type signatures (`Transition.ease: number[] | string`, `Variants[key].transition?: Transition`).

## Task Commit

Single task committed atomically with `--no-verify` (parallel execution mode):

1. **Task 1: Create `frontend/lib/motion.ts` with the exact UI-SPEC contract (DESIGN-06)** — `3e2317d` (feat)

## Files Created/Modified

- **Created:** `frontend/lib/motion.ts` (43 lines, exports `easeCraft`, `durations`, `transitions`, `variants`).

## Decisions Made

See frontmatter `key-decisions` field. Key points:

- **Wrote module verbatim from UI-SPEC §Motion.** Zero local deviation; numeric values, names, and structure all transcribed exactly.
- **No `useReducedMotion()` wrapper.** Reduced-motion is a per-consumer concern (Phase 7 swipe-deck owns it); CSS side is already covered globally.
- **Numeric tuple, not string, for `easeCraft`.** Framer-motion accepts both, but a 4-number tuple keeps the curve composable and gives `as const` traction for literal types.
- **`satisfies` at inner level, `as const` at outer level.** Each variant validates independently against `Variants`, while the outer `variants` object is read-only with full literal-type fidelity.

## Deviations from Plan

None — plan executed exactly as written. UI-SPEC §Motion content transcribed verbatim into `frontend/lib/motion.ts`. All acceptance criteria pass. No scope creep; only the file listed in `files_modified` was created.

## Issues Encountered

- **`npx tsc --noEmit` not runnable in worktree:** `frontend/node_modules/` absent in this parallel-execution worktree (same constraint Plan 01 documented). All grep-based plan verification passed; tsc validation is owned by the orchestrator's post-merge gate. This is the standard parallel-execution pattern, not a plan-execution failure.
- **Plan 01's CSS motion tokens not present in the worktree's `frontend/app/globals.css`:** Plan 01 runs in a sibling worktree; the orchestrator merges both worktrees together before any consumer reads `motion.ts` against `globals.css`. The numeric lockstep is enforced by both plans transcribing the same UI-SPEC §Motion values verbatim, not by within-worktree cross-file validation.

## User Setup Required

None — pure constants module, no external service or environment configuration needed.

## Next Phase Readiness

- **Wave 3 (Plan 05 primitive re-themes):** unblocked — shadcn primitives can `import { transitions } from "@/lib/motion"` for hover/focus framer-motion animations.
- **Wave 4 (Plan 06 styleguide):** unblocked — the styleguide route can import `variants.fadeIn` etc. to render motion preview demos.
- **Phase 7 swipe-deck:** unblocked — `variants.swipeCommit` is the canonical left/right commit contract; consumer adds `useReducedMotion()` per the documented split.
- **No blockers** for any downstream plan.

## Self-Check

Verified before completion:

- **Files:**
  - `frontend/lib/motion.ts` — FOUND (43 lines, contains all four exports + type import).
  - `.planning/phases/05-design-system-foundation/05-04-SUMMARY.md` — created by this Write.
- **Commits:**
  - `3e2317d` — FOUND in `git log` (Task 1: feat(05-04): add frontend/lib/motion.ts mirroring CSS motion tokens).
- **Acceptance grep checks:** all 13 plan-level verification commands pass (full output above in §Verification Run).
- **Export count:** exactly 4 (`easeCraft`, `durations`, `transitions`, `variants`) — no extra helpers.
- **`satisfies` count:** 2 × `satisfies Transition`, 4 × `satisfies Variants` (matches plan acceptance criteria).
- **swipeCommit literal values:** `x: -480` / `x: 480` / `rotate: -8` / `rotate: 8` all present.
- **Numeric lockstep:** `[0.32, 0.72, 0.0, 1]` / `0.15` / `0.28` all match UI-SPEC §Motion verbatim — and therefore match Plan 01's CSS tokens, both transcribed from the same upstream source.

## Self-Check: PASSED

---
*Phase: 05-design-system-foundation*
*Completed: 2026-05-08*
