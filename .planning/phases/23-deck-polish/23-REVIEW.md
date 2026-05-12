---
phase: 23-deck-polish
reviewed: 2026-05-13T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - frontend/components/ShortlistCard.tsx
  - frontend/lib/swipe-tokens.ts
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-05-13T00:00:00Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Phase 23 polishes the swipe deck: text "OUI/NON" overlays were replaced with two stacked `motion.div` ring-inset strokes driven by `useTransform`, motion thresholds were retuned, the no-button icon was swapped to an outline Heart (removing the `X` import), and a `panRef`/`setTimeout(0)` guard was added in `onPanEnd` to disambiguate tap-vs-pan for `router.push` navigation.

All four "focus areas" from the phase context check out:

1. **`ring-inset` applied consistently.** Both yes and no ring divs use `ring-2 ring-inset` (lines 326 and 331). Outer card uses `overflow-hidden` (lines 265, 267, 268), so the inset choice is correct — plain `ring-*` would clip on the rounded corners per RESEARCH SE-1.
2. **`setTimeout(0)` placement correct.** `onPanEnd` (lines 235–245) schedules the reset on a macrotask while `onTap`'s guard (line 249) reads `panRef.current` synchronously. iOS Safari's synthetic-tap fires in the same task as `panEnd`, so the macrotask defer is the right primitive.
3. **`panRef` guard is harmless belt-and-suspenders** as called out — framer-motion v12.38 already filters tap during active drag, and the additional guard adds <10 LOC.
4. **Ring overlay block is conditionally mounted, not opacity-zeroed.** Lines 321–334 wrap the two `motion.div`s in `{isFront && !reducedMotion && (...)}`. The `useTransform` hooks themselves (lines 107–117) still run on every render of any front card, but that's unavoidable — hooks can't be conditional. The expensive part (the subscribed motion-value DOM writes) is gated correctly.
5. **Invariant #2 (voting state computed, not stored) untouched.** `onVote(value)` plumbing in `handleDragEnd` (line 124) and `ShortlistThumbButtons` (lines 398, 409) is unchanged; icon swap is purely presentational.

Three Info-level findings below — none are bugs, all are small clarity/maintainability nits.

## Info

### IN-01: `noOpacity` `useTransform` input range maps backwards-feeling

**File:** `frontend/components/ShortlistCard.tsx:113-117`
**Issue:** `noOpacity = useTransform(x, [-SWIPE_OVERLAY_INPUT_PX, 0], [1, 0])` is correct (at x=-80 → opacity 1, at x=0 → opacity 0) but the input array reads backwards next to `yesOpacity` (`[0, 80] → [0, 1]`). Both arrive at the same semantic ("ring fades in as drag distance grows in that direction") but a future reader scanning the pair has to flip the no-mapping in their head. A symmetric form would be `useTransform(x, [0, -SWIPE_OVERLAY_INPUT_PX], [0, 1])`.
**Fix:**
```tsx
const yesOpacity = useTransform(x, [0,  SWIPE_OVERLAY_INPUT_PX], [0, 1]);
const noOpacity  = useTransform(x, [0, -SWIPE_OVERLAY_INPUT_PX], [0, 1]);
```
framer-motion accepts a descending input range and the output of `clamp` is identical, so this is a pure readability win. Optional.

### IN-02: Two `motion.div` ring overlays sit between the photo region and the card body in DOM order

**File:** `frontend/components/ShortlistCard.tsx:321-334`
**Issue:** The drag-feedback ring block is placed after the photo `<div>` (closes line 313) and before the body `<div>` (opens line 337). Because both overlays use `absolute inset-0` on the parent `motion.div` (the card), they paint over the entire card — including the partner-vote dot footer at lines 360–374, which is `absolute bottom-3 right-3`. The footer has `bg-card/70 backdrop-blur-sm`, so the ring's 2px inset stroke at the bottom-right will sit on top of the footer when the user drags. That may be visually fine (the ring is 2px and the footer is small), but if the intent was "ring frames the card, footer reads through", the ring divs should come last so the partner footer can paint on top. Worth eyeballing on device.
**Fix:** Move the `{isFront && !reducedMotion && (...)}` block to right before the closing `</motion.div>` (after line 374), so the rings paint last and the partner-footer stays visually on top of any colored stroke that creeps under it. No functional change for the common case (rings at opacity 0 when not dragging).

### IN-03: `flyX` computed at render time can briefly use the SSR-safe fallback on first client paint

**File:** `frontend/components/ShortlistCard.tsx:192-195`
**Issue:** `flyX = typeof window === "undefined" ? 480 : window.innerWidth * SWIPE_FLY_OFFSCREEN_FACTOR`. During hydration on a narrow viewport (e.g. 360px wide iPhone SE), the server render uses 480 and the client's first render uses ~504 — the value is consistent because `motionExit` is only consumed on the AnimatePresence exit pathway (never during initial hydration), so there's no hydration mismatch. But the computation is on every render. Not a bug — the cost is negligible — but caching it in a `useMemo` or reading from a one-time `useEffect` would dodge the `typeof window` re-check.
**Fix:** Either ignore (the cost is sub-microsecond and the value only matters at exit time), or extract a small `useViewportFlyX()` hook that subscribes to resize once. Optional. Not blocking.

---

_Reviewed: 2026-05-13T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
