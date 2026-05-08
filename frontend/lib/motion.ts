/**
 * Phase 5 motion language — single source of truth.
 * CSS tokens (`--ease-craft`, `--duration-fast`, `--duration-normal`)
 * defined in `globals.css` @theme block; this module re-exports the
 * same numbers as Framer Motion presets so swipe-deck animations and
 * CSS transitions stay in lockstep.
 */
import type { Transition, Variants } from "framer-motion";

export const easeCraft = [0.32, 0.72, 0.0, 1] as const;

export const durations = {
  fast: 0.15,    // 150ms — interactive feedback
  normal: 0.28,  // 280ms — structural transitions
} as const;

export const transitions = {
  fast: { duration: durations.fast, ease: easeCraft } satisfies Transition,
  normal: { duration: durations.normal, ease: easeCraft } satisfies Transition,
} as const;

export const variants = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: transitions.normal },
  } satisfies Variants,

  slideUp: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: transitions.normal },
  } satisfies Variants,

  pressFeedback: {
    rest: { scale: 1, transition: transitions.fast },
    pressed: { scale: 0.98, transition: transitions.fast },
  } satisfies Variants,

  swipeCommit: {
    rest: { x: 0, rotate: 0, transition: transitions.normal },
    left: { x: -480, rotate: -8, opacity: 0, transition: transitions.normal },
    right: { x: 480, rotate: 8, opacity: 0, transition: transitions.normal },
  } satisfies Variants,
} as const;
