# Phase 23: Deck polish — Research

**Researched:** 2026-05-12
**Domain:** Cosmetic polish on existing framer-motion swipe deck (Next.js 16 App Router)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

D-01..D-29 are locked in `.planning/phases/23-deck-polish/23-CONTEXT.md` and `23-UI-SPEC.md`. Summary of load-bearing locks:

- **D-01 / Deliverable**: REQUIREMENTS.md DECK-01 success criterion will be **rewritten** by the plan to replace "full-card background tint" with "border-ring fade-in" (this is a deliverable, not a gotcha).
- **D-02 / D-03**: Yes-ring color = `--color-valide-foreground` (#10B981 emerald); no-ring color = `--destructive`. Stroke = `ring-2`, no `ring-offset`.
- **D-04**: Implementation pattern is **two stacked absolutely-positioned `motion.div`s** with `ring-2` and motion-bound `opacity` (planner's Discretion-bound choice over the `useMotionTemplate` boxShadow alternative).
- **D-05**: `SWIPE_OVERLAY_INPUT_PX` 100 → **80**; ring opacity ramps linearly 0→1 across 0..80px.
- **D-07**: Ring + drag gated by existing `isFront && !reducedMotion`.
- **D-08**: Threshold/velocity/fly-off retune values are exact: 140/750/80/0.28.
- **D-09**: Delete legacy `SWIPE_SPRING` constant; `transitions.springSnap` (240/28/1.1) at `motion.ts:24` already wired.
- **D-12 / D-13**: Yes button = filled emerald Heart (`fill="currentColor"`); no button = outline Heart in `text-foreground-muted`; **no destructive-red anywhere on the no button**.
- **D-14**: Remove `X` import from lucide-react. Only `Heart` and `UtensilsCrossed` remain.
- **D-16**: `onVote` plumbing byte-identical — voting state invariant #2 holds.
- **D-17 / D-18**: `onTap` on the outer card → `router.push('/recipes/[id]')` with `panRef` gate. `panRef.current = true` in `onPanStart`, deferred reset to `false` in `onPanEnd`.
- **D-19**: Thumb buttons are **sibling-level** to the card in `ShortlistDeck.tsx:183-186`; their clicks structurally cannot reach the card's `onTap`. No `stopPropagation` needed.
- **D-20**: Back-button behavior is **zero-new-code** — the parent `HomeDecide` unvoted-filter naturally keeps the same recipe on top.
- **D-21**: No tap-feedback before navigation. iOS Safari native page-transition is the feedback.
- **D-23 / D-24**: **One atomic plan, one commit.** Deliberate deviation from Phase 22's "1 req → 1 plan" pattern.
- **D-25**: Within-plan order locked: tokens → ring → Heart → tap-to-detail → JSDoc → REQUIREMENTS rewrite.
- **D-26..D-28**: Verification = grep gates + manual UI smoke + real-device `prefers-reduced-motion` pass. No new Playwright specs. No `gsd-verifier` (`workflow.verifier: false`).

### Claude's Discretion

CONTEXT.md `<decisions>` §"Claude's Discretion":

1. Ring implementation pattern — two stacked `motion.div`s **vs** single `motion.div` with `useMotionTemplate` boxShadow.
2. `border-foreground-muted/40` **vs** `border-border` on the no-side Heart button.
3. Exact `panRef.current = false` deferral mechanism — `setTimeout(0)` vs `requestAnimationFrame` vs microtask.
4. JSDoc-update inlining style in `swipe-tokens.ts`.

This research provides concrete evidence to resolve items 1 and 3 (below); items 2 and 4 remain visual-judgment calls for the planner.

### Deferred Ideas (OUT OF SCOPE)

Verbatim from CONTEXT.md `<deferred>`:

- Faint bg-tint underneath the ring
- Playwright spec for tap-to-detail
- Visual snapshot tests for ring at three drag distances
- Card snap-zone visual indicators
- "Love" tier above yes (would break voting invariant #2)
- Per-direction haptic feedback (`navigator.vibrate` no-op on iOS Safari standalone)
- `?card=<id>` URL-state preservation for back-restoration
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DECK-01 | OUI/NON overlays replaced by drag-distance-driven ring (reinterpreted per D-01 from "background tint") | framer-motion v12.38.0 `useTransform` already wired; ring implementation pattern verified — caveat with `overflow-hidden` clipping documented below |
| DECK-02 | Threshold/velocity/fly-off retune + reuse `transitions.springSnap` | All four `swipe-tokens.ts` consts have a single importer (`ShortlistCard.tsx:24-31`); `transitions.springSnap` already used at L223; legacy `SWIPE_SPRING` grep-confirmed unused |
| DECK-03 | Filled emerald Heart / outline neutral Heart on thumb buttons | lucide-react v1.14.0 `Heart` is a single `<path>` (`heart.mjs:11-18`); the `Icon` wrapper spreads `...rest` AFTER `defaultAttributes` (`Icon.mjs:38`), so `fill="currentColor"` overrides the default `fill: "none"` cleanly |
| DECK-04 | Tap-to-detail via `onTap` + `panRef` disambiguation | framer-motion press feature internally filters tap during active drag (`press.mjs:14-16` + `motion-dom/.../press/index.mjs:14-16`); pan only "starts" after 3px (`PanSession.mjs:68`); `useRouter` from `next/navigation` is the App Router pattern (12 existing call sites) |
</phase_requirements>

## Approach Summary

The CONTEXT.md / UI-SPEC.md approach is **implementable as written** against framer-motion v12.38.0, lucide-react v1.14.0, and Next.js 16.2.4. All four reqs are local to `ShortlistCard.tsx` + `swipe-tokens.ts` and ride on already-wired primitives:

- `yesOpacity` / `noOpacity` `useTransform` hooks at `ShortlistCard.tsx:99-108` already drive opacity from drag distance — the ring just rebinds the same motion values to a different consumer.
- `transitions.springSnap` at `motion.ts:24` (240/28/1.1) is already imported (L32) and used (L223) — DECK-02 needs zero motion.ts change.
- `useRouter` from `next/navigation` is used at 12 sites across the codebase — DECK-04 inherits the established import path.
- `lucide-react`'s `Heart` is a single `<path>` element; passing `fill="currentColor"` produces a fully filled emerald heart (verified by source inspection).
- framer-motion's `press` feature **already filters tap during active drag** via `isDragActive()` (`press.mjs:14`), so the `panRef` pattern in D-18 is **belt-and-suspenders** rather than load-bearing. We recommend keeping it as defensive code anyway (see W-02 below).

**Primary recommendation:** Implement exactly as CONTEXT.md / UI-SPEC.md prescribe. The single substantive sharp edge is the **ring + `overflow-hidden` interaction** (W-05) — the planner must place the ring-bearing `motion.div`s in a way that the card's `overflow-hidden` doesn't clip the ring shadow.

## Per-Watch-Item Findings

### W-01: framer-motion v10/v11/v12 API for `onTap` + `onPanStart`/`onPanEnd` disambiguation

**Verdict:** API surface is **unchanged through v12.38.0**. `onTap`, `onPanStart`, `onPanEnd` are still the canonical handler names. They coexist on the same `motion.div` without name conflict.

**Evidence:**
- `framer-motion/dist/es/gestures/press.mjs:12` — `const eventName = ("onTap" + (lifecycle === "End" ? "" : lifecycle));` — confirms `onTap`, `onTapStart`, `onTapCancel` are the prop names framer-motion looks up on `node.props` in v12.
- `framer-motion/dist/es/gestures/pan/PanSession.mjs:74-79` — the PanSession internally calls `handlers.onStart` / `handlers.onMove` / `handlers.onEnd`; these map to the `onPanStart` / `onPan` / `onPanEnd` motion-component props via VisualElementDragControls' wiring.
- `framer-motion/dist/types/index.d.ts:1337` — public API example `onTap={() => cycleX()}` confirms the documented usage.
- Official docs: motion.dev/docs/react-gestures — `onTap` ("primary pointer presses down and releases on the same component") and pan handlers are documented as separate gesture systems on the same component.

**`onTap` vs `onClick` on touch devices:** `onTap` is **strictly preferable** to `onClick` for this case. Reasons:
- `onTap` filters out secondary pointers (right-click, multitouch) — `isPrimaryPointer(event)` check at `motion-dom/.../press/index.mjs:14`.
- `onTap` integrates with framer-motion's `isDragActive()` global state — see W-02.
- iOS Safari fires synthetic `click` events ~300ms after touchend on some interactions; `onTap` uses `pointerup` directly so it has no synthetic-click delay.

**Confidence:** HIGH. Source-verified.

### W-02: `panRef.current = false` reset timing — `setTimeout(0)` vs `rAF` vs microtask

**Verdict:** framer-motion v12 **already disambiguates tap from drag internally** via a global `isDragging` state. The `panRef` pattern in D-18 is defensive, not load-bearing. Recommend `setTimeout(0)` for the reset; it is the safest primitive across browsers.

**Evidence — framer-motion's built-in disambiguation:**
- `motion-dom/dist/es/gestures/press/index.mjs:14-16` — `isValidPressEvent` returns `false` when `isDragActive()` is true. The press-end callback (`onPointerEnd`, L50) checks this and returns early if invalid → the press End/success callback never fires → `onTap` is not invoked.
- `motion-dom/dist/es/gestures/drag/state/is-active.mjs` — `isDragActive()` reads a global `isDragging` flag.
- `motion-dom/dist/es/gestures/drag/state/set-active.mjs:5-12` — `isDragging[axis]` is set `true` when drag starts and `false` when drag's `openDragLock()` cleanup runs.
- `framer-motion/.../drag/VisualElementDragControls.mjs:163-176` — `stop()` calls `cancel()` FIRST (which calls `openDragLock()` → sets `isDragging.x/y = false`), THEN `frame.postRender(() => onDragEnd(...))`. So by the time `onDragEnd` (and similarly the pan-end-derived `onPanEnd`) fires, `isDragActive()` already returns `false`.
- `framer-motion/.../gestures/press.mjs:15` — `onTap` itself is scheduled via `frame.postRender(() => callback(event, extractEventInfo(event)))`.

**Why CONTEXT.md still calls for `panRef`:** Two genuine reasons remain:
1. **Pan threshold edge case.** Pan only "starts" (and fires `onPanStart`) after 3 pixels of movement (`PanSession.mjs:68` — `distance2D >= this.distanceThreshold`, default 3). A sub-3px drag never sets `isDragging` true at all. So a true tap (with <3px move) will correctly fire `onTap` without any pan handler running, and `panRef` stays `false`. Good.
2. **Frame ordering uncertainty.** Both `onDragEnd` and `onTap` are scheduled via `frame.postRender`. While the source shows `cancel()` runs synchronously before the `onDragEnd` postRender call, the global `isDragging` flag is only consulted at **press-pointerup time** (L56), not at press-callback-postRender time. The press feature decides "this is a valid tap" at pointerup. If drag started AFTER pointerdown but BEFORE pointerup, the pointerup-time `isDragActive()` check returns `true` → press cancels itself. This is correct framer behavior.

The `panRef` is **belt-and-suspenders** for a hypothetical iOS Safari frame-ordering pathology that field reports have flagged historically. No GitHub issue confirms this in v12.38.0 specifically [ASSUMED — could not verify against a specific v12 issue].

**Recommended primitive — `setTimeout(0)`:**
- `requestAnimationFrame` defers to next paint — the iOS Safari WKWebView throttles rAF aggressively in some PWA configs (background tab, low-power mode), making the deferral non-deterministic.
- `queueMicrotask` runs BEFORE the next paint, often within the same task; on iOS Safari the synthetic tap (if it happens) may also run in the same task → microtask defers too little.
- `setTimeout(0)` defers to the next macrotask. iOS Safari reliably schedules the synthetic-tap (if any) within the same macrotask as `onPanEnd`. By the time the setTimeout callback runs, all same-task events have fired.

The planner should still note this as an iOS-Safari-specific behavior and require an iPhone smoke test (per D-28).

**Confidence:** HIGH on the framer-motion internal disambiguation; MEDIUM on the iOS Safari frame-ordering pathology (no v12-specific confirmed bug, but the defensive code is cheap).

### W-03: Next.js 16 App Router `useRouter` from `next/navigation` inside client-component `onTap`

**Verdict:** Works exactly as written. `useRouter` from `next/navigation` returning a router with `router.push('/recipes/[id]')` is the canonical Next.js 16 App Router pattern.

**Evidence:**
- `next/dist/docs/01-app/03-api-reference/04-functions/use-router.md:13-23` — the canonical example uses `'use client'`, `import { useRouter } from 'next/navigation'`, and `router.push('/dashboard')` inside an `onClick` handler. Functionally identical to using it inside a framer-motion `onTap` handler.
- `next/dist/docs/01-app/03-api-reference/04-functions/use-router.md:44` — full signature: `router.push(href: string, { scroll: boolean, transitionTypes: string[] })`. The second arg is optional; `router.push('/recipes/${id}')` is valid.
- The pattern is already used 12 times in this codebase. Sample: `frontend/components/CookingLogFinalize.tsx:16`, `frontend/app/recipes/[id]/page.tsx:13`, `frontend/components/VoiceCaptureTab.tsx:21`. Zero migration concerns.

**Path verified:** `frontend/app/recipes/[id]/page.tsx` exists (`12.6K`). `router.push('/recipes/' + recipe.id)` will navigate to the existing fully-styled detail surface.

**Confidence:** HIGH. Source-verified against installed Next.js 16.2.4 docs.

### W-04: lucide-react `<Heart fill="currentColor" />` support

**Verdict:** Fully supported. v1.14.0's `Icon` wrapper spreads `...rest` AFTER the default attributes, so `fill="currentColor"` correctly overrides the default `fill: "none"`.

**Evidence:**
- `lucide-react@1.14.0` is the installed version (`frontend/node_modules/lucide-react/package.json`).
- `lucide-react/dist/esm/icons/heart.mjs:11-18` — `Heart` is built from a single `<path>` element with the canonical heart-shape `d` attribute. A single path with a filled `fill` will render as a filled heart shape.
- `lucide-react/dist/esm/defaultAttributes.mjs:13-14` — defaults: `fill: "none", stroke: "currentColor"` (stroke-only outline).
- `lucide-react/dist/esm/Icon.mjs:27-38` — the SVG element receives `{...defaultAttributes, ..., ...rest}`. `rest` comes from the icon's caller (`<Heart fill="currentColor" />`) and overrides the default `fill: "none"`. Result: `<svg fill="currentColor" stroke="currentColor" ...><path d="..."/></svg>` — a fully filled heart with the matching stroke.
- The recommended D-12 code `<Heart size={24} fill="currentColor" className="text-[var(--color-valide-foreground)]" />` works because `currentColor` resolves to the `text-*` color (emerald) on the parent. Both stroke and fill become emerald.

**Caveat for the outline (D-13):** `<Heart size={24} className="text-foreground-muted" />` (no `fill` prop) keeps the default `fill: "none"` → only the stroke renders, producing the outline. This is the documented behavior.

**Confidence:** HIGH. Source-verified.

### W-05: Ring opacity via framer-motion `useTransform` + Tailwind `ring-2` — clipping risk

**Verdict:** **This is the one substantive sharp edge.** Tailwind's `ring-*` utility is implemented as a `box-shadow` (per Tailwind docs). The current outer card div has `overflow-hidden` (`ShortlistCard.tsx:231`). If the ring-bearing `motion.div` is placed as a **child of the overflow-hidden card**, the ring shadow extends 2px outside the child's border-box and **gets clipped by the parent's overflow:hidden**.

**Evidence:**
- `ShortlistCard.tsx:231` — outer card class chain `"!absolute !inset-0 paper-grain bg-card border border-border rounded-2xl shadow-card-hover overflow-hidden flex flex-col touch-pan-y"` contains `overflow-hidden`.
- Tailwind CSS docs ([VERIFIED via WebFetch — tailwindcss.com/docs/box-shadow]): `ring-*` utility generates `--tw-ring-shadow: 0 0 0 <N>px;` and applies as `box-shadow`. Box shadows are clipped by parent `overflow:hidden`.
- The current OUI/NON overlays at L282-296 are positioned `absolute top-6 left-6` INSIDE the photo div (L238) which is also `overflow-hidden rounded-t-2xl`. They work because they're TEXT inside the box, not a ring extending OUTSIDE the box.

**Three viable resolution patterns (planner picks based on visual fidelity):**

**Pattern A — Inner offset ring (recommended; least disruption).** Place two stacked `motion.div`s with `absolute inset-0 rounded-2xl ring-2 ring-inset` inside the card. Use `ring-inset` to draw the ring on the INSIDE of the child's border-box (`box-shadow: inset 0 0 0 2px <color>`). Inset shadow is NOT clipped by parent overflow because it draws inward. Visual result: a 2px emerald/destructive ring drawn just inside the rounded-2xl corner. Reads correctly against the cream card.

```tsx
{isFront && !reducedMotion && (
  <>
    <motion.div
      aria-hidden
      style={{ opacity: yesOpacity }}
      className="absolute inset-0 rounded-2xl ring-2 ring-inset ring-[var(--color-valide-foreground)] pointer-events-none"
    />
    <motion.div
      aria-hidden
      style={{ opacity: noOpacity }}
      className="absolute inset-0 rounded-2xl ring-2 ring-inset ring-destructive pointer-events-none"
    />
  </>
)}
```

**Pattern B — `outline` instead of `ring`.** CSS `outline` is NOT clipped by parent `overflow:hidden`. Tailwind v4 exposes `outline-2 outline-[var(--color-valide-foreground)]`. Visual difference: outline draws OUTSIDE the border-box (so a 2px outline on an `inset-0` child sits 2px beyond the card edge). Reads as a "halo" rather than a "ring on the card." May feel too aggressive per D-03 ("no halo gap").

**Pattern C — `useMotionTemplate` boxShadow on the card itself.** Animate the outer card's `boxShadow` style directly:
```tsx
const yesShadow = useMotionTemplate`0 0 0 2px rgba(16, 185, 129, ${yesOpacity})`;
```
Combine with the existing `shadow-card-hover`. This avoids the clipping issue entirely (shadow drawn on the card, not on a clipped child). Two downsides: (1) it merges with the existing two-layer paper-grain shadow tokens — needs careful template composition to preserve both; (2) destructive + yes need a single boxShadow string that interpolates between them (more complex template).

**Recommendation:** **Pattern A (`ring-inset`)**. Cleanest visual match for D-03 ("crisp; matches the rounded-2xl card corners cleanly"; "no halo gap"). Zero risk of clipping. Zero touch to the outer card's existing shadow chain. The planner's Claude's Discretion §1 should resolve to Pattern A (`ring-inset` with two stacked motion.divs).

**Side note on rendering:** A `motion.div` with a static `ring-2 ring-inset ring-[var(--color-valide-foreground)]` class and `style={{ opacity: yesOpacity }}` will fade the ENTIRE child element (including the inset ring) cleanly. Tailwind v4's CSS variable in `ring-[var(...)]` is fully supported.

**Confidence:** HIGH on the clipping diagnosis; HIGH on Pattern A as the right resolution.

### W-06: AnimatePresence `mode="wait"` + new `onTap` handler — interference risk

**Verdict:** **No interference.** Adding `onTap` to the outer card's `motion.div` is orthogonal to AnimatePresence's exit-animation lifecycle.

**Evidence:**
- `ShortlistDeck.tsx:170-181` wraps only the front card in `<AnimatePresence mode="wait">`. The peek cards are siblings outside the AnimatePresence boundary.
- `onTap` triggers `router.push()`, which navigates away from the deck page. The deck unmounts as a whole; AnimatePresence's exit-on-key-change behavior doesn't apply to unmount-on-navigate.
- A tap that doesn't navigate (e.g., during a `panRef.current === true` window) is a no-op — no state changes, no key changes, no exit triggered.
- A swipe still triggers the existing `handleVote` → `onVoteApplied` → `committedDirection` set → key-change → AnimatePresence exit. Same code path as before this phase.

**Subtle: navigation timing.** When the user taps and `router.push` fires, Next.js 16 will start a client-side transition. The deck component unmounts as part of the route transition; AnimatePresence's exit animation **does not play** because the navigation tear-down is faster than the AnimatePresence exit cycle. This is correct (per D-21, "iOS Safari native page-transition IS the feedback"); no fly-off should play on tap-to-detail.

**Confidence:** HIGH.

### W-07: `prefers-reduced-motion` correctness — ring opacity transform under reduced motion

**Verdict:** Correct as written in CONTEXT.md. The ring must be **conditionally MOUNTED** (not just opacity-zeroed) to avoid the `useTransform` motion value still being live when reduced-motion is on.

**Evidence:**
- `ShortlistCard.tsx:99-108` — `yesOpacity` / `noOpacity` are called UNCONDITIONALLY on every render (hooks must be unconditional per React rules). They observe the `x` motion value.
- Under reduced motion: `dragEnabled = false` (L118) → no drag → `x` stays at 0 → `yesOpacity` and `noOpacity` resolve to 0 permanently.
- Even if the ring-bearing motion.divs are mounted under reduced motion, their `opacity` would be 0 → invisible. Functionally correct.
- HOWEVER, the current OUI/NON pattern at L280 — `{isFront && !reducedMotion && (<>...</>)}` — **conditionally mounts** the overlay block. Best practice and the documented intent of D-07. Replicating this guard for the ring divs is the correct pattern:

```tsx
{isFront && !reducedMotion && (
  <>
    <motion.div style={{ opacity: yesOpacity }} className="..." />
    <motion.div style={{ opacity: noOpacity }} className="..." />
  </>
)}
```

- `usePrefersReducedMotion()` at L74-76 uses `useSyncExternalStore` and live-subscribes to the `(prefers-reduced-motion: reduce)` media query. The guard re-evaluates if the user toggles the OS setting at runtime — already correct.

**Edge case verified:** The global CSS rule at `globals.css:491-498` zeroes `animation-duration` and `transition-duration` under reduced motion. This does NOT affect framer-motion's `useTransform` (which writes inline style, not via CSS animations/transitions). Conditional mounting is therefore the correct gate, not CSS.

**Confidence:** HIGH.

### W-08: D-09 cleanup — `SWIPE_SPRING` importer grep verification

**Verdict:** Safe to delete. **Zero importers anywhere in the frontend codebase.**

**Evidence:**
- `grep -rn "SWIPE_SPRING" frontend/ --include="*.ts" --include="*.tsx"` returns exactly **one match**: `frontend/lib/swipe-tokens.ts:21` (the definition itself). Zero importers.
- `grep -rn "swipe-tokens" frontend/` returns two matches: the file itself (L21 SWIPE_SPRING decl) and `frontend/components/ShortlistCard.tsx:31` (the only file importing from `@/lib/swipe-tokens`).
- The import block at `ShortlistCard.tsx:24-31` does NOT include `SWIPE_SPRING`. It imports `SWIPE_FLY_OFFSCREEN_FACTOR`, `SWIPE_FLYOFF_DURATION_S`, `SWIPE_OVERLAY_INPUT_PX`, `SWIPE_ROTATE_RANGE_DEG`, `SWIPE_THRESHOLD_PX`, `SWIPE_VELOCITY_PX_S` — six tokens, no spring.

**Conclusion:** D-09 deletion is grep-safe. The plan's grep gate `grep -rn "SWIPE_SPRING" frontend/` returning zero after deletion is a clean signal.

**Confidence:** HIGH.

## Implementation Order

The CONTEXT.md D-25 sequence is **correct** and need not be revised. Affirming:

1. **`swipe-tokens.ts` constants + delete legacy `SWIPE_SPRING`** (D-08, D-09). Smallest-surface change first; no dependents.
2. **`ShortlistCard.tsx` ring overlays replacing OUI/NON block** (D-01..D-07). Apply Pattern A from W-05 — two stacked `motion.div`s with `ring-inset` inside the existing `isFront && !reducedMotion` guard.
3. **`ShortlistCard.tsx` Heart icon swap + remove `X` import + neutralize no-side chrome** (D-12..D-16). Self-contained in `ShortlistThumbButtons` (L347-381).
4. **`ShortlistCard.tsx` add `panRef` + `onTap` router push** (D-17..D-22). Touches the outer `motion.div` props (L206-223); no interaction with steps 2 or 3.
5. **Update `swipe-tokens.ts` top-of-file JSDoc** (D-11). Trivial.
6. **Update REQUIREMENTS.md DECK-01 success criterion wording** (D-01). One-line edit.

Step ordering matters for code-review readability, not for correctness. Steps 2, 3, 4 are mutually independent and could be done in any order, but the locked sequence makes the diff readable per concern.

## Sharp Edges / Pitfalls

| # | Sharp edge | Mitigation |
|---|------------|-----------|
| SE-1 | **`ring-2` on a child of an `overflow-hidden` parent gets clipped** (W-05). Pattern A in CONTEXT.md §Claude's Discretion §1 would fail visually if implemented without `ring-inset`. | Use `ring-inset` (CSS `box-shadow: inset 0 0 0 2px <color>`). Inset shadow is not affected by parent overflow. Resolves Claude's Discretion §1 to a specific recipe. |
| SE-2 | `panRef.current = false` reset timing on iOS Safari (W-02). Field-reported pathology where `onTap` may fire after `onPanEnd` despite framer-motion's internal `isDragActive()` filtering. | Use `setTimeout(0)` (not `rAF`, not microtask). Source analysis confirms framer-motion already filters; the `panRef` is belt-and-suspenders for a hypothetical iOS-Safari-specific race. Requires real-device iPhone smoke test per D-28. |
| SE-3 | `<Heart fill="currentColor" />` requires the `text-*` color to be set; without it the `currentColor` falls back to the inherited foreground color. | D-12 already specifies `className="text-[var(--color-valide-foreground)]"` alongside `fill="currentColor"`. No action — verified correct. |
| SE-4 | `useTransform` motion values must be created unconditionally (hook rules). Cannot wrap `useTransform` itself in `if (reducedMotion)`. | Already the case in current code (`yesOpacity`/`noOpacity` are created unconditionally at L99-108). The conditional mount of the consuming `motion.div`s is the correct gate. |
| SE-5 | The destination route `/recipes/[id]/page.tsx` exists and is fully translated. No route-not-found risk. | Verified: `frontend/app/recipes/[id]/page.tsx` exists (12.6K). |
| SE-6 | Tailwind v4 `ring-[var(...)]` arbitrary value syntax must use a CSS var token. The token must resolve to a valid color. `--color-valide-foreground` is a hex string (`#10B981`) — works directly in `ring-[var(--color-valide-foreground)]`. | No action. Verified via `globals.css:201` (light) and `:276` (dark). Both modes resolve to a hex string. |

**Newly surfaced (not in CONTEXT.md):** SE-1 is the one true gotcha that needs the planner to pick `ring-inset` over a naive `ring-2` placement. All others are confirmations of CONTEXT.md correctness.

## Verification Approach

The D-26 / D-27 / D-28 verification approach is **sound and complete** for a polish phase. Affirming:

### Grep Gates (D-26) — all four are correctly specified

1. `grep -n "OUI\|NON" frontend/components/ShortlistCard.tsx` → 0 ✓
2. `grep -n "lucide-react" frontend/components/ShortlistCard.tsx | grep -E " X[ ,}]"` → 0 ✓
   - **Note for planner:** Simpler alternative is `grep -E "^import.*\{[^}]*\bX\b[^}]*\}" frontend/components/ShortlistCard.tsx` — matches the destructured `X` in any position within the lucide-react import braces. Either grep works.
3. `grep -n "SWIPE_THRESHOLD_PX = 140\|SWIPE_VELOCITY_PX_S = 750\|SWIPE_OVERLAY_INPUT_PX = 80\|SWIPE_FLYOFF_DURATION_S = 0.28" frontend/lib/swipe-tokens.ts` → 4 ✓
4. `grep -rn "SWIPE_SPRING" frontend/` → 0 ✓ (currently 1; should be 0 after deletion)

### Manual UI Smoke (D-27) — comprehensive

Covers all 4 reqs: drag-feedback ring (DECK-01), threshold/spring (DECK-02), Heart icons (DECK-03), tap-to-detail with iOS back-gesture (DECK-04). The 7-step checklist exercises each path including the partner-vote dot and the disabled state. No additions needed.

### Real-Device `prefers-reduced-motion` (D-28) — covers all surfaces

5 assertions cover the 5 motion paths: drag, ring, vote, tap-to-detail, fly-off. All 5 are correctly classified as motion (gated) or functional (always works).

### Suggested additions for the manual smoke (optional)

- **Sub-3px tap.** Verify a small finger jitter (<3px) still navigates correctly. This exercises framer-motion's pan-threshold disambiguation (W-02 evidence).
- **Tap while a vote POST is in flight.** If the user taps the card body during the `submittingFor !== null` window, navigation should still occur (the card body's `onTap` is not gated by `submittingFor` — only the thumb buttons are). Confirm this matches the intended UX (no objection in CONTEXT.md, but worth verifying once on device).
- **Partner realtime vote during /recipes/[id] visit.** Cited in D-20 as "correct behavior" — operator should verify once that the deck advances correctly on return if partner voted during the round-trip.

These are nice-to-have, not blocking. The grep+smoke+reduced-motion triad is adequate per CONTEXT.md's polish-phase discipline.

**Confidence:** HIGH. Verification gates as written will catch the implementable failure modes.

## Project Constraints (from CLAUDE.md)

Affirming compliance:

| Constraint | Phase 23 status |
|-----------|----------------|
| Invariant #2 — Voting state computed, not stored | **Held**. DECK-03 only changes icon glyphs/colors on thumb buttons; `onVote(value)` plumbing byte-identical (D-16). |
| Invariant #6 — French-only via `next-intl` | **Held**. Phase removes hardcoded strings (OUI/NON); adds zero new strings. Destination `/recipes/[id]` already translated. |
| Invariant #8 — HttpOnly cookie auth | **Not applicable.** Phase makes no API calls. Tap-to-detail is a client-side route push; auth cookie travels naturally. |
| Path alias `@/*` → `frontend/` | **Held**. Imports use `@/lib/swipe-tokens`, `@/lib/motion`, `@/components/ui/button`. |
| ESLint flat config (no Prettier) | **Held**. No formatter change. |
| Frontend AGENTS.md (Next.js 16 breaking changes) | **Verified.** `useRouter` from `next/navigation` is the App Router import path; `router.push(href)` API confirmed against installed `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`. 12 existing call sites in the codebase. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Field-reported iOS Safari "tap-after-drag" pathology in framer-motion v12.38.0 exists | W-02 | Low. The `panRef` pattern is cheap belt-and-suspenders; if the pathology doesn't exist, the code still works. If it does exist, we're protected. |
| A2 | `setTimeout(0)` reliably defers past iOS Safari's same-task event batching | W-02 | Low-medium. If `setTimeout(0)` is insufficient, the planner can fall back to `requestAnimationFrame` after iPhone smoke test. The D-28 device test catches this. |

**All other claims in this research are sourced** (`[VERIFIED: <source>]` or `[CITED: <docs>]`) from package source code, official documentation, or direct codebase grep.

## Sources

### Primary (HIGH confidence)

- `frontend/node_modules/framer-motion@12.38.0/dist/es/gestures/press.mjs` — `onTap` lifecycle, `frame.postRender` deferral, `isDragActive` filter
- `frontend/node_modules/framer-motion@12.38.0/dist/es/gestures/pan/PanSession.mjs` — pan distance threshold (3px), onPanEnd lifecycle
- `frontend/node_modules/framer-motion@12.38.0/dist/es/gestures/drag/VisualElementDragControls.mjs` — drag stop()/cancel() lifecycle, openDragLock ordering
- `frontend/node_modules/motion-dom/dist/es/gestures/press/index.mjs` — `press()` low-level implementation
- `frontend/node_modules/motion-dom/dist/es/gestures/drag/state/{is-active,set-active}.mjs` — global `isDragging` state
- `frontend/node_modules/lucide-react@1.14.0/dist/esm/{icons/heart.mjs,Icon.mjs,defaultAttributes.mjs}` — Heart icon source + Icon wrapper + default attrs
- `frontend/node_modules/next@16.2.4/dist/docs/01-app/03-api-reference/04-functions/use-router.md` — `useRouter` from `next/navigation` API
- `frontend/app/globals.css:201, 276` — `--color-valide-foreground` token light/dark values
- `frontend/components/ShortlistCard.tsx` — current implementation (lines cited inline above)
- `frontend/components/ShortlistDeck.tsx` — wrapper plumbing
- `frontend/lib/swipe-tokens.ts` — current constants + legacy SWIPE_SPRING

### Secondary (MEDIUM confidence)

- WebFetch tailwindcss.com/docs/box-shadow — `ring-*` utility generates `box-shadow`; affected by parent `overflow:hidden`
- WebFetch motion.dev/docs/react-gestures — official tap and pan handler documentation
- `frontend/CLAUDE.md` → `frontend/AGENTS.md` — Next.js 16 breaking-changes note (consulted local docs accordingly)

### Tertiary (LOW confidence)

- WebSearch [BUG] onTapCancel issues #993 / #310 (framer/motion) — historical iOS Safari gesture pathology; not verified for v12.38.0 specifically

## Metadata

**Confidence breakdown:**

- API correctness (framer-motion v12, Next 16, lucide v1.14): **HIGH** — source-verified against installed `node_modules/`
- Disambiguation correctness (`panRef` + `setTimeout(0)`): **HIGH** on framer-motion internal filtering; **MEDIUM** on the iOS-Safari-specific pathology motivating the `panRef` belt-and-suspenders
- Ring + overflow-hidden clipping (W-05): **HIGH** — Tailwind docs + CSS spec
- Reduced-motion correctness: **HIGH** — same pattern as current OUI/NON block
- Implementation order: **HIGH** — already correct in CONTEXT.md
- Verification approach: **HIGH** — grep gates surveyed + smoke checklist complete

**Research date:** 2026-05-12
**Valid until:** 2026-06-11 (30 days; stable polish-phase research on locked v12 / v16 / v1.14 versions)
