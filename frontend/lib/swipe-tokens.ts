// Swipe-deck motion thresholds — single source of truth.
// Originally locked in Phase 3 / 03-UI-SPEC.md §Design System; **retuned in
// Phase 23** (23-CONTEXT.md D-08) for the deck-polish "deliberate motion"
// pass — casual drift snaps back, deliberate motion commits cleanly.
// Imported by ShortlistCard.tsx; do NOT pick alternative numbers without a
// matching UI-SPEC update.

/** Drag-distance threshold in px past which release commits the vote. */
export const SWIPE_THRESHOLD_PX = 140;

/** Flick-velocity threshold in px/s; commits even below the px threshold. */
export const SWIPE_VELOCITY_PX_S = 750;

/** Multiplier applied to viewport width for off-screen fly-off. */
export const SWIPE_FLY_OFFSCREEN_FACTOR = 1.4;

/** Range (degrees) for card rotation tied to drag x via useTransform.
 *  Used as -SWIPE_ROTATE_RANGE_DEG to +SWIPE_ROTATE_RANGE_DEG. */
export const SWIPE_ROTATE_RANGE_DEG = 15;

/** Drag input range mapped to full opacity for yes/no ring feedback.
 *  Phase 23: ring hits full opacity at ~80px, well before the 140px commit
 *  threshold — a 50px casual drift produces ~62% ring opacity, the intended
 *  "you're trying something" affordance without committing. */
export const SWIPE_OVERLAY_INPUT_PX = 80;

/** Fly-off animation duration in seconds. */
export const SWIPE_FLYOFF_DURATION_S = 0.28;
