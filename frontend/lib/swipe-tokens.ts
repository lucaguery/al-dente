// Phase 3 swipe-deck motion thresholds (locked by 03-UI-SPEC.md §Design System).
// Imported by ShortlistCard.tsx; do NOT pick alternative numbers without an UI-SPEC update.

/** Drag-distance threshold in px past which release commits the vote. */
export const SWIPE_THRESHOLD_PX = 100;

/** Flick-velocity threshold in px/s; commits even below the px threshold. */
export const SWIPE_VELOCITY_PX_S = 500;

/** Multiplier applied to viewport width for off-screen fly-off. */
export const SWIPE_FLY_OFFSCREEN_FACTOR = 1.4;

/** Range (degrees) for card rotation tied to drag x via useTransform.
 *  Used as -SWIPE_ROTATE_RANGE_DEG to +SWIPE_ROTATE_RANGE_DEG. */
export const SWIPE_ROTATE_RANGE_DEG = 15;

/** Drag input range mapped to full opacity for yes/no overlay. */
export const SWIPE_OVERLAY_INPUT_PX = 100;

/** Spring config for snap-back (iOS-native feel). */
export const SWIPE_SPRING = {
  type: "spring" as const,
  stiffness: 400,
  damping: 40,
};

/** Fly-off animation duration in seconds. */
export const SWIPE_FLYOFF_DURATION_S = 0.2;
