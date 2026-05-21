/**
 * ADR-0004 motion language — single source of truth.
 * CSS tokens (`--ease`, `--duration-fast`, `--duration-base`, `--duration-sheet`)
 * defined in `globals.css` @theme block; this module re-exports the same
 * numbers as Framer Motion presets so swipe-deck animations and CSS
 * transitions stay in lockstep.
 *
 * Per ADR-0004 §Type stack / SKILL.md Motion: one ease curve
 * (cubic-bezier(0.22, 1, 0.36, 1) — deliberate ease-out, no overshoot)
 * and three durations (160ms fast / 240ms base / 380ms sheet).
 *
 * Wave 5 rename: prior ease + duration symbol names dropped in favour of
 * `ease` + `durations.{fast, base, sheet}`. The Phase 7 `springSnap`
 * paper-physics curve is preserved — the swipe-deck snap-back is an
 * exception to the single-ease rule (a physical spring response, not a UI
 * transition).
 */
import type { Transition, Variants } from "framer-motion";

export const ease = [0.22, 1, 0.36, 1] as const;

export const durations = {
  fast: 0.16, // 160ms — interactive feedback
  base: 0.24, // 240ms — structural transitions
  sheet: 0.38, // 380ms — sheet / dialog enter+exit
} as const;

export const transitions = {
  fast: { duration: durations.fast, ease } satisfies Transition,
  base: { duration: durations.base, ease } satisfies Transition,
  sheet: { duration: durations.sheet, ease } satisfies Transition,
  // Phase 7 — paper-physics card snap-back. Slightly higher mass than the
  // Framer Motion default reads as "card on a counter," not "rubber band."
  // The spring damps naturally without an explicit bounce parameter.
  // Per 07-UI-SPEC §Motion + 07-CONTEXT §"Swipe Deck Physics".
  springSnap: { type: "spring", stiffness: 240, damping: 28, mass: 1.1 } satisfies Transition,
} as const;

export const variants = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: transitions.base },
  } satisfies Variants,

  slideUp: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: transitions.base },
  } satisfies Variants,

  pressFeedback: {
    rest: { scale: 1, transition: transitions.fast },
    pressed: { scale: 0.98, transition: transitions.fast },
  } satisfies Variants,

  swipeCommit: {
    rest: { x: 0, rotate: 0, transition: transitions.base },
    left: { x: -480, rotate: -8, opacity: 0, transition: transitions.base },
    right: { x: 480, rotate: 8, opacity: 0, transition: transitions.base },
  } satisfies Variants,
} as const;
