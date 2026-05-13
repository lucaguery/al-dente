---
phase: 23
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/lib/swipe-tokens.ts
  - frontend/components/ShortlistCard.tsx
  - .planning/REQUIREMENTS.md
autonomous: true
requirements: [DECK-01, DECK-02, DECK-03, DECK-04]
tags: [ui, framer-motion, swipe-deck, polish, accessibility, nextjs-app-router]

must_haves:
  truths:
    - "Dragging a shortlist card shows a drag-distance-driven border-ring fade-in (emerald for yes, destructive for no) instead of OUI/NON text overlays"
    - "A casual ~50 px drift snaps the card back cleanly; a deliberate ~140 px drag commits the swipe; a fast flick at ≥750 px/s also commits"
    - "The thumb-button row shows a filled emerald Heart for yes and an outline neutral Heart for no — no thumbs-up/thumbs-down icons and no destructive-red on the no button"
    - "Tapping (not dragging) the front card opens /recipes/[id] detail; iOS back returns to the same front card; thumb-button taps vote without navigating"
    - "All four behaviors above honour prefers-reduced-motion: no ring, no drag motion, no fly-off; functional voting and tap-to-detail still work"
  artifacts:
    - path: "frontend/lib/swipe-tokens.ts"
      provides: "Retuned swipe constants (140/750/80/0.28) + legacy SWIPE_SPRING removed + Phase 23 JSDoc"
      contains: "SWIPE_THRESHOLD_PX = 140"
    - path: "frontend/components/ShortlistCard.tsx"
      provides: "Ring overlays replace OUI/NON, filled/outline Heart thumb buttons, panRef + onTap tap-to-detail"
      contains: "ring-2 ring-inset ring-[var(--color-valide-foreground)]"
    - path: ".planning/REQUIREMENTS.md"
      provides: "DECK-01 success criterion rewritten to match ring-based design (D-01)"
      contains: "border-ring fade-in"
  key_links:
    - from: "frontend/components/ShortlistCard.tsx"
      to: "frontend/lib/swipe-tokens.ts"
      via: "import of SWIPE_THRESHOLD_PX, SWIPE_VELOCITY_PX_S, SWIPE_OVERLAY_INPUT_PX, SWIPE_FLYOFF_DURATION_S (no SWIPE_SPRING)"
      pattern: "from \"@/lib/swipe-tokens\""
    - from: "frontend/components/ShortlistCard.tsx (outer motion.div onTap)"
      to: "/recipes/[id] route"
      via: "useRouter().push from next/navigation, gated by !panRef.current && isFront"
      pattern: "router\\.push\\(`/recipes/\\$\\{recipe\\.id\\}`\\)"
    - from: "frontend/components/ShortlistCard.tsx (yesOpacity/noOpacity useTransform)"
      to: "Ring opacity (two stacked motion.divs with ring-inset)"
      via: "style={{ opacity: yesOpacity }} / style={{ opacity: noOpacity }} on inset-0 ring-2 ring-inset siblings"
      pattern: "ring-inset ring-\\[var\\(--color-valide-foreground\\)\\]"
---

<objective>
Phase 23 — Deck polish. Ship all four DECK-01..DECK-04 requirements in ONE atomic plan, ONE commit (per D-23): retune swipe thresholds, replace OUI/NON text overlays with a subtle drag-distance-driven border-ring fade-in, swap thumb-button icons to filled/outline Hearts, and add tap-to-detail navigation. All changes are local to `ShortlistCard.tsx` + `swipe-tokens.ts`; `ShortlistDeck.tsx` is untouched. Reduced-motion path stays correct end-to-end.

Purpose: Make the swipe deck feel deliberate and immersive. The current 100 px / 500 px-s thresholds commit too readily on casual drifts; OUI/NON text overlays are heavy; the no-side `<X />` icon reads as "rejected" instead of "unloved"; cards have no tap affordance for opening detail. After this phase the deck feels like a "card on a counter" — slightly-overshooting spring snap, ring feedback during drag, single-glyph Heart language for both votes, and a native tap-to-detail gesture that uses iOS Safari's own page transition as feedback.

Output: One atomic commit modifying `frontend/lib/swipe-tokens.ts`, `frontend/components/ShortlistCard.tsx`, and `.planning/REQUIREMENTS.md` (DECK-01 wording rewrite per D-01).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/23-deck-polish/23-CONTEXT.md
@.planning/phases/23-deck-polish/23-UI-SPEC.md
@.planning/phases/23-deck-polish/23-RESEARCH.md
@CLAUDE.md
@frontend/AGENTS.md
@frontend/components/ShortlistCard.tsx
@frontend/components/ShortlistDeck.tsx
@frontend/lib/swipe-tokens.ts
@frontend/lib/motion.ts
</context>

<interfaces>
<!-- Key types and primitives the executor needs. Extracted from codebase. No exploration required. -->

From `frontend/lib/motion.ts:24` (already imported at ShortlistCard.tsx:32, used at L223 — no change needed):
```typescript
export const transitions = {
  // ...
  springSnap: { type: "spring", stiffness: 240, damping: 28, mass: 1.1 } satisfies Transition,
} as const;
```

From `frontend/lib/swipe-tokens.ts` (current state — six exported constants; SWIPE_SPRING is unused and gets deleted):
```typescript
export const SWIPE_THRESHOLD_PX = 100;            // → 140
export const SWIPE_VELOCITY_PX_S = 500;            // → 750
export const SWIPE_FLY_OFFSCREEN_FACTOR = 1.4;     // unchanged
export const SWIPE_ROTATE_RANGE_DEG = 15;          // unchanged
export const SWIPE_OVERLAY_INPUT_PX = 100;         // → 80 (semantic shifts to "ring opacity ramp")
export const SWIPE_SPRING = { type: "spring", stiffness: 400, damping: 40 }; // DELETE — zero importers
export const SWIPE_FLYOFF_DURATION_S = 0.2;        // → 0.28
```

From `frontend/components/ShortlistCard.tsx` (current state — load-bearing):
- L19 import: `import { Heart, X, UtensilsCrossed } from "lucide-react";` — remove `X`, keep `Heart` and `UtensilsCrossed`.
- L24-31 import: six swipe-tokens constants, NO `SWIPE_SPRING` (confirms grep-safe deletion).
- L74-76 `usePrefersReducedMotion()` — `useSyncExternalStore` pattern; live-subscribes to `(prefers-reduced-motion: reduce)`.
- L92-108 motion values: `x = useMotionValue(0)`, `rotate`, `yesOpacity = useTransform(x, [0, SWIPE_OVERLAY_INPUT_PX], [0, 1])`, `noOpacity = useTransform(x, [-SWIPE_OVERLAY_INPUT_PX, 0], [1, 0])`. Hooks are unconditional — must remain unconditional.
- L110-116 `handleDragEnd` — reads `SWIPE_THRESHOLD_PX` and `SWIPE_VELOCITY_PX_S` from constants; no structural change.
- L118 `const dragEnabled = isFront && !reducedMotion;` — gates drag and reduced-motion path.
- L206-235 outer `motion.div` — single mount point for ring overlays (siblings/children) and new `onTap` + `onPanStart`/`onPanEnd` props.
- L231 outer class chain: `... overflow-hidden ...` — THIS is the clipping risk (SE-1 in RESEARCH.md W-05). Required mitigation: use `ring-inset` (not `ring-`) on the new ring motion.divs.
- L280-296 `{isFront && !reducedMotion && (<>...</>)}` block containing OUI/NON `motion.div`s — DELETE entirely; replace with ring divs (Pattern A from RESEARCH.md W-05).
- L324-338 partner-vote dot footer — `absolute` status display, NOT a button. Taps inherit the card's onTap (no stopPropagation). Do not touch.
- L347-381 `ShortlistThumbButtons` component (exported separately, mounted as a SIBLING of the card by `ShortlistDeck.tsx:183`). Modify icon glyphs/colors here.
- L364-377 thumb-button class chains — see Visual Contract table below for exact swaps.

From `frontend/components/ShortlistDeck.tsx:183-186` — `ShortlistThumbButtons` is rendered OUTSIDE the AnimatePresence/card stack (sibling level), guaranteeing thumb clicks NEVER reach the card's `onTap` (D-19 — structural). No edits to this file.

From `frontend/app/globals.css`:
- `--color-valide-foreground` at L201 (light, `#10B981` emerald) / L276 (dark, `#6EE7B7` emerald-300) — used for yes-ring AND filled Heart.
- `--color-valide-border` at L203 (light) / L278 (dark) — yes-button border, UNCHANGED.
- `--destructive` at L161 (light) / L245 (dark) — no-ring stroke ONLY (removed from no-button chrome).
- `--foreground-muted` at L182 (light) / L264 (dark) — no-side Heart icon color + neutral hover.
- `--border` at L162 (light) / L246 (dark) — no-side button border replacement (or bump to `border-foreground-muted/40` if contrast at h-14 is too low).

From `frontend/node_modules/lucide-react@1.14.0` (verified via RESEARCH.md W-04):
- `<Heart fill="currentColor" />` produces a fully-filled heart (Icon wrapper spreads `...rest` AFTER defaults).
- `<Heart />` with no `fill` prop keeps `fill: "none"` default → outline only.

From `frontend/node_modules/next@16.2.4/dist/docs/01-app/03-api-reference/04-functions/use-router.md` (verified via RESEARCH.md W-03):
- Canonical pattern: `'use client'` + `import { useRouter } from 'next/navigation'` + `const router = useRouter()` + `router.push('/recipes/...')`.
- Path alias `@/*` per CLAUDE.md §Conventions.

Reduced-motion guard pattern (existing, replicate verbatim for the ring): `{isFront && !reducedMotion && (<>...</>)}` (the deleted OUI/NON block at L280 used this — RESEARCH.md W-07 confirms conditional MOUNT is the correct gate, not opacity: 0).
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Retune swipe-tokens.ts constants and delete legacy SWIPE_SPRING (D-08, D-09, D-11, D-25 step 1+5)</name>
  <files>frontend/lib/swipe-tokens.ts</files>
  <read_first>
    - frontend/lib/swipe-tokens.ts (full file — 29 lines; the file being modified)
    - .planning/phases/23-deck-polish/23-CONTEXT.md §"DECK-02 — Threshold + spring tuning" (D-08..D-11) and §"Plan slicing & verification" (D-25)
    - .planning/phases/23-deck-polish/23-UI-SPEC.md §"Swipe commit thresholds (DECK-02)" table
    - .planning/phases/23-deck-polish/23-RESEARCH.md §"W-08: D-09 cleanup" (grep-safe deletion confirmation)
  </read_first>
  <action>
    Rewrite `frontend/lib/swipe-tokens.ts` in full to the new state below. ALL four numeric constants MUST take the new values verbatim (140, 750, 80, 0.28). The legacy `SWIPE_SPRING` block MUST be deleted entirely (zero importers — grep-verified in RESEARCH.md W-08). Update the top-of-file JSDoc to credit Phase 23 for the retune so future readers don't try to revert to Phase 3 numbers thinking they're canonical (D-11). Also update the `SWIPE_OVERLAY_INPUT_PX` JSDoc to reflect its new semantic role ("ring opacity ramp," not "OUI/NON overlay opacity") per D-05.

    Final file contents (replace the entire file with exactly this — preserve trailing newline):

    ```typescript
    // Phase 3 swipe-deck motion thresholds.
    // Retuned in Phase 23 (deck polish, 2026-05-12) — see 23-CONTEXT.md §"DECK-02".
    // Imported by ShortlistCard.tsx; do NOT pick alternative numbers without an UI-SPEC update.

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
     *  Phase 23: lowered 100 → 80 so a casual ~50px drift produces ~62% ring
     *  opacity (visible "you're trying something" affordance) well before
     *  the 140px commit threshold fires. */
    export const SWIPE_OVERLAY_INPUT_PX = 80;

    /** Fly-off animation duration in seconds. */
    export const SWIPE_FLYOFF_DURATION_S = 0.28;
    ```

    Specifically:
    - Line "SWIPE_THRESHOLD_PX = 100" becomes "SWIPE_THRESHOLD_PX = 140".
    - Line "SWIPE_VELOCITY_PX_S = 500" becomes "SWIPE_VELOCITY_PX_S = 750".
    - Line "SWIPE_OVERLAY_INPUT_PX = 100" becomes "SWIPE_OVERLAY_INPUT_PX = 80".
    - Line "SWIPE_FLYOFF_DURATION_S = 0.2" becomes "SWIPE_FLYOFF_DURATION_S = 0.28".
    - The entire block `export const SWIPE_SPRING = { ... };` (currently lines 20-25 plus the JSDoc at L20) is DELETED. No trailing whitespace.
    - SWIPE_FLY_OFFSCREEN_FACTOR (1.4) and SWIPE_ROTATE_RANGE_DEG (15) are UNCHANGED in value.

    Do NOT touch `frontend/lib/motion.ts`. `transitions.springSnap` (240/28/1.1) is already wired at `ShortlistCard.tsx:223` per D-09 — there is no spring constant to add or move into swipe-tokens.ts.
  </action>
  <verify>
    <automated>cd frontend && grep -n "SWIPE_THRESHOLD_PX = 140\|SWIPE_VELOCITY_PX_S = 750\|SWIPE_OVERLAY_INPUT_PX = 80\|SWIPE_FLYOFF_DURATION_S = 0.28" lib/swipe-tokens.ts | wc -l | tr -d ' '</automated>
  </verify>
  <acceptance_criteria>
    - `cd frontend && grep -c "SWIPE_THRESHOLD_PX = 140" lib/swipe-tokens.ts` returns `1`.
    - `cd frontend && grep -c "SWIPE_VELOCITY_PX_S = 750" lib/swipe-tokens.ts` returns `1`.
    - `cd frontend && grep -c "SWIPE_OVERLAY_INPUT_PX = 80" lib/swipe-tokens.ts` returns `1`.
    - `cd frontend && grep -c "SWIPE_FLYOFF_DURATION_S = 0.28" lib/swipe-tokens.ts` returns `1`.
    - `cd frontend && grep -rn "SWIPE_SPRING" .` returns ZERO matches (the legacy constant is gone and there are still no importers — verified pre-change in RESEARCH.md W-08).
    - `cd frontend && grep -n "Phase 23" lib/swipe-tokens.ts` returns at least 1 match (top-of-file JSDoc credits the retune).
    - `cd frontend && npx tsc --noEmit -p tsconfig.json` exits 0 (no broken imports — there shouldn't be any since SWIPE_SPRING was unused).
  </acceptance_criteria>
  <done>
    `frontend/lib/swipe-tokens.ts` exports exactly six constants (SWIPE_THRESHOLD_PX=140, SWIPE_VELOCITY_PX_S=750, SWIPE_FLY_OFFSCREEN_FACTOR=1.4, SWIPE_ROTATE_RANGE_DEG=15, SWIPE_OVERLAY_INPUT_PX=80, SWIPE_FLYOFF_DURATION_S=0.28). No SWIPE_SPRING. JSDoc references Phase 23. TypeScript compiles cleanly.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Replace OUI/NON overlays with two stacked ring-inset motion.divs in ShortlistCard.tsx (D-01..D-07, D-25 step 2)</name>
  <files>frontend/components/ShortlistCard.tsx</files>
  <read_first>
    - frontend/components/ShortlistCard.tsx (full file — 382 lines; the file being modified)
    - .planning/phases/23-deck-polish/23-CONTEXT.md §"DECK-01 — Drag-tint redesign (ring, not bg)" (D-01..D-07)
    - .planning/phases/23-deck-polish/23-UI-SPEC.md §"Drag-feedback ring (DECK-01)"
    - .planning/phases/23-deck-polish/23-RESEARCH.md §"W-05: Ring opacity via framer-motion useTransform + Tailwind ring-2 — clipping risk" (SE-1; the load-bearing reason to use `ring-inset` not `ring-2`)
    - .planning/phases/23-deck-polish/23-RESEARCH.md §"W-07: prefers-reduced-motion correctness" (conditional MOUNT pattern)
    - frontend/app/globals.css lines 161, 201, 203, 276 (token resolution for `--color-valide-foreground` and `--destructive`)
  </read_first>
  <action>
    Delete the OUI/NON overlay block at lines 280-296 (the entire `{isFront && !reducedMotion && (<>...<motion.div>OUI</motion.div><motion.div>NON</motion.div></>)}` JSX) and replace it with two stacked `motion.div`s that render `ring-2 ring-inset` rings driven by the existing `yesOpacity` / `noOpacity` motion values.

    CRITICAL — use `ring-inset` NOT plain `ring-2`. The outer card div has `overflow-hidden` at L231, so a plain `ring-2` (which Tailwind implements as box-shadow extending OUTSIDE the border-box) gets clipped. `ring-inset` compiles to `box-shadow: inset 0 0 0 2px <color>` which draws INWARD and is unaffected by parent overflow. This is the SE-1 mitigation from RESEARCH.md W-05.

    The replacement JSX MUST be placed at the SAME location as the deleted block — INSIDE the photo region `<div className="relative aspect-[4/3] bg-surface-muted rounded-t-2xl overflow-hidden">` is WRONG; the rings must be siblings of the photo region INSIDE the outer card motion.div so they overlay the entire card body. Place the new block AFTER the closing `</div>` of the photo region (currently line 298) but BEFORE the body `<div className="flex-1 flex flex-col gap-3 p-5">` (currently line 301). Actually — re-reading: the current OUI/NON block is INSIDE the photo region at L280-296, but the ring needs to overlay the WHOLE card. Place the new ring block as a sibling of the photo `<div>` and the body `<div>`, immediately AFTER `</div>` that closes the photo region (i.e. after current line 298) — at the same nesting level as the photo and body, inside the outer `<motion.div>`.

    Concretely, the structure inside the outer `<motion.div>` should become:
    ```tsx
    <motion.div className={...}>
      <div className="relative aspect-[4/3] ... overflow-hidden">
        {/* photo region — no OUI/NON inside anymore */}
        {photoSrc ? <img ... /> : <div>...<UtensilsCrossed/></div>}
      </div>

      {/* NEW: drag-feedback rings (DECK-01) — gated by isFront && !reducedMotion */}
      {isFront && !reducedMotion && (
        <>
          <motion.div
            aria-hidden
            style={{ opacity: yesOpacity }}
            className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-[var(--color-valide-foreground)]"
          />
          <motion.div
            aria-hidden
            style={{ opacity: noOpacity }}
            className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-destructive"
          />
        </>
      )}

      <div className="flex-1 flex flex-col gap-3 p-5">
        {/* body — unchanged */}
      </div>

      <div className="absolute bottom-3 right-3 ...">
        {/* partner-vote footer — unchanged */}
      </div>
    </motion.div>
    ```

    Rationale for each className token (do NOT change these):
    - `pointer-events-none` — the ring is decorative; taps must pass through to the card's outer `onTap` (Task 4).
    - `absolute inset-0` — fill the entire card bounds (matches `rounded-2xl` corners on the outer container).
    - `rounded-2xl` — match the outer card's corner radius so the ring follows the curve.
    - `ring-2` — 2px stroke per D-03 (no `ring-offset`, no halo gap).
    - `ring-inset` — SE-1 mitigation: draws the ring INWARD so `overflow-hidden` on the outer card doesn't clip it.
    - `ring-[var(--color-valide-foreground)]` (yes) — emerald token from globals.css L201/L276 per D-02. Tailwind v4 supports the `ring-[var(...)]` arbitrary value syntax (RESEARCH.md SE-6 confirms).
    - `ring-destructive` (no) — Tailwind utility resolving to `--destructive` token from globals.css L161/L245 per D-02. (If `ring-destructive` is not in the tailwind config's `--ring-color-*` palette, fall back to `ring-[var(--destructive)]` — both render identical CSS; the bracketed form is the safer drop-in.)
    - `style={{ opacity: yesOpacity }}` / `style={{ opacity: noOpacity }}` — drives ring opacity from the EXISTING `useTransform` hooks at L99-108. No new motion values. Linear ramp 0→1 across 0..80px (per D-06, no easing function).

    The guard `{isFront && !reducedMotion && (<>...</>)}` is the SAME guard the OUI/NON block currently uses at L280 — conditional MOUNT (not opacity: 0). Under reduced motion the rings are not in the DOM at all, which is the correct gate (RESEARCH.md W-07).

    Do NOT modify the `yesOpacity` / `noOpacity` `useTransform` hooks at L99-108. They stay byte-identical. They observe `x` (which only moves when `dragEnabled` is true) and resolve to 0 under reduced motion automatically — but we still conditionally mount the consuming `motion.div`s for cleanliness.

    Do NOT modify the outer card className chain at L230-235. The `overflow-hidden` stays — it's what `ring-inset` accommodates.

    Do NOT remove `UtensilsCrossed` from the lucide-react import (it's still used for the photo placeholder at L271).
  </action>
  <verify>
    <automated>cd frontend && grep -n "OUI\|NON" components/ShortlistCard.tsx | wc -l | tr -d ' '</automated>
  </verify>
  <acceptance_criteria>
    - `cd frontend && grep -c "OUI" components/ShortlistCard.tsx` returns `0`.
    - `cd frontend && grep -c "NON" components/ShortlistCard.tsx` returns `0` (literal `NON` — false-positive check: the file may contain the substring inside identifiers like "no-overlay"; the goal is zero textual `OUI` / `NON` user-facing strings. If the grep above returns >0, inspect — none of the existing identifiers contain bare `NON` or `OUI`).
    - `cd frontend && grep -c "ring-inset ring-\[var(--color-valide-foreground)\]" components/ShortlistCard.tsx` returns `1`.
    - `cd frontend && grep -cE "ring-inset ring-(destructive|\[var\(--destructive\)\])" components/ShortlistCard.tsx` returns `1`.
    - `cd frontend && grep -c "style={{ opacity: yesOpacity }}" components/ShortlistCard.tsx` returns `1` (the yes-ring; the OUI overlay's identical style line has been removed).
    - `cd frontend && grep -c "style={{ opacity: noOpacity }}" components/ShortlistCard.tsx` returns `1` (the no-ring).
    - `cd frontend && grep -c "pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset" components/ShortlistCard.tsx` returns `2` (one yes ring, one no ring).
    - The `useTransform(x, [0, SWIPE_OVERLAY_INPUT_PX], [0, 1])` and `useTransform(x, [-SWIPE_OVERLAY_INPUT_PX, 0], [1, 0])` hooks at L99-108 are unchanged: `cd frontend && grep -c "useTransform" components/ShortlistCard.tsx` returns `3` (rotate + yesOpacity + noOpacity, same as before).
    - `cd frontend && npx tsc --noEmit -p tsconfig.json` exits 0.
    - `cd frontend && npx eslint components/ShortlistCard.tsx` exits 0.
  </acceptance_criteria>
  <done>
    OUI/NON text overlays are gone. Two ring-inset motion.divs sit inside the outer card, gated by `isFront && !reducedMotion`, with opacity driven by the existing yesOpacity/noOpacity transforms. Card's `overflow-hidden` does not clip the rings (inset shadow). TypeScript and ESLint pass.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Swap thumb-button icons to filled/outline Heart, remove X import, neutralize no-side chrome (D-12..D-16, D-25 step 3)</name>
  <files>frontend/components/ShortlistCard.tsx</files>
  <read_first>
    - frontend/components/ShortlistCard.tsx (full file)
    - .planning/phases/23-deck-polish/23-CONTEXT.md §"DECK-03 — Heart icon language" (D-12..D-16)
    - .planning/phases/23-deck-polish/23-UI-SPEC.md §"Thumb buttons (DECK-03)" table
    - .planning/phases/23-deck-polish/23-RESEARCH.md §"W-04: lucide-react <Heart fill='currentColor' /> support"
    - .planning/REQUIREMENTS.md §DECK-03 (milestone-locked decision: emerald filled / neutral outline; existing aria-labels preserved verbatim)
  </read_first>
  <action>
    Three sub-edits in `frontend/components/ShortlistCard.tsx`:

    SUB-EDIT 3A — Remove `X` from the lucide-react import at line 19.
    Current line 19: `import { Heart, X, UtensilsCrossed } from "lucide-react";`
    New line 19:     `import { Heart, UtensilsCrossed } from "lucide-react";`
    (Drop the `X,` token; preserve `Heart` and `UtensilsCrossed`.)

    SUB-EDIT 3B — Rewrite the NO-SIDE button at lines 357-367 (the FIRST `<Button>` inside `ShortlistThumbButtons`, which calls `onVote("no")`). Replace the X icon with an outline Heart; neutralize the destructive-red chrome entirely (D-13 — "no destructive-red anywhere on the no button").

    Current block (lines 357-367):
    ```tsx
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={disabled}
      onClick={() => onVote("no")}
      aria-label={t("vote_no_aria")}
      className="h-14 w-14 rounded-full border-2 border-destructive/50 hover:bg-destructive/10 active:scale-95 transition-transform"
    >
      <X size={24} className="text-destructive" />
    </Button>
    ```

    Replace with:
    ```tsx
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={disabled}
      onClick={() => onVote("no")}
      aria-label={t("vote_no_aria")}
      className="h-14 w-14 rounded-full border-2 border-border hover:bg-foreground-muted/10 active:scale-95 transition-transform"
    >
      <Heart size={24} className="text-foreground-muted" />
    </Button>
    ```

    Specifically:
    - `border-destructive/50` → `border-border` (use the default `--border` token from globals.css L162. If after the manual smoke pass the border disappears against the warm-cream surface at h-14 size, the next-pass operator can bump to `border-foreground-muted/40` per CONTEXT.md §Claude's Discretion bullet 2 — but ship `border-border` first.).
    - `hover:bg-destructive/10` → `hover:bg-foreground-muted/10`.
    - `<X size={24} className="text-destructive" />` → `<Heart size={24} className="text-foreground-muted" />` (NO `fill` prop — keeps lucide-react's default `fill: "none"` → outline only per RESEARCH.md W-04).
    - All other props (type, variant, size, disabled, onClick, aria-label, h-14, w-14, rounded-full, border-2, active:scale-95, transition-transform) are UNCHANGED.

    SUB-EDIT 3C — Rewrite the YES-SIDE button at lines 368-378 (the SECOND `<Button>`, which calls `onVote("yes")`). Change ONLY the icon's `fill` attribute — the surrounding chrome stays.

    Current icon line (currently line 377):
    ```tsx
    <Heart size={24} className="text-[var(--color-valide-foreground)]" />
    ```

    Replace with:
    ```tsx
    <Heart size={24} fill="currentColor" className="text-[var(--color-valide-foreground)]" />
    ```

    The `fill="currentColor"` makes lucide-react render a fully-FILLED heart (RESEARCH.md W-04: Icon wrapper spreads `...rest` after defaults, overriding `fill: "none"`). `currentColor` resolves to the `text-[var(--color-valide-foreground)]` emerald value on the parent → fully filled emerald heart with matching stroke.

    Do NOT change the yes-button's surrounding `<Button>` className: `h-14 w-14 rounded-full border-2 border-[var(--color-valide-border)] hover:bg-[color-mix(in_srgb,var(--color-valide-foreground)_10%,transparent)] active:scale-95 transition-transform` is preserved verbatim.

    Do NOT touch the `onVote("no")` or `onVote("yes")` callbacks, the `disabled` plumbing, or the surrounding `<div className="flex items-center justify-center gap-12">` wrapper. The vote state machine (architecture invariant #2 — voting state is computed, not stored) is structurally untouched.
  </action>
  <verify>
    <automated>cd frontend && grep -n "from \"lucide-react\"" components/ShortlistCard.tsx | grep -E "\\bX\\b" | wc -l | tr -d ' '</automated>
  </verify>
  <acceptance_criteria>
    - `cd frontend && grep -n "from \"lucide-react\"" components/ShortlistCard.tsx` shows exactly ONE line: `import { Heart, UtensilsCrossed } from "lucide-react";` — no `X`.
    - `cd frontend && grep -cE "from \"lucide-react\".*\\bX\\b" components/ShortlistCard.tsx` returns `0` (no `X` in the lucide import).
    - `cd frontend && grep -c "<X " components/ShortlistCard.tsx` returns `0` (no `<X` JSX elements remain).
    - `cd frontend && grep -c "fill=\"currentColor\"" components/ShortlistCard.tsx` returns `1` (only the yes-side filled Heart uses it).
    - `cd frontend && grep -c "Heart size={24} fill=\"currentColor\" className=\"text-\\[var(--color-valide-foreground)\\]\" />" components/ShortlistCard.tsx` returns `1`.
    - `cd frontend && grep -c "Heart size={24} className=\"text-foreground-muted\" />" components/ShortlistCard.tsx` returns `1`.
    - `cd frontend && grep -c "border-destructive/50\|hover:bg-destructive/10\|text-destructive" components/ShortlistCard.tsx` returns `0` (all three destructive-red chrome classes on the no-button are gone).
    - `cd frontend && grep -c "border-border hover:bg-foreground-muted/10" components/ShortlistCard.tsx` returns `1` (new no-button chrome).
    - The no-button still has `onClick={() => onVote("no")}`: `cd frontend && grep -c "onClick={() => onVote(\"no\")}" components/ShortlistCard.tsx` returns `1`.
    - The yes-button still has `onClick={() => onVote("yes")}`: `cd frontend && grep -c "onClick={() => onVote(\"yes\")}" components/ShortlistCard.tsx` returns `1`.
    - Aria labels preserved: `cd frontend && grep -c "t(\"vote_no_aria\")\|t(\"vote_yes_aria\")" components/ShortlistCard.tsx` returns `2`.
    - `cd frontend && npx tsc --noEmit -p tsconfig.json` exits 0.
    - `cd frontend && npx eslint components/ShortlistCard.tsx` exits 0.
  </acceptance_criteria>
  <done>
    Yes button shows a filled emerald Heart (`fill="currentColor"` + `text-[var(--color-valide-foreground)]`). No button shows an outline Heart in `text-foreground-muted` with neutral border (`border-border`) and neutral hover (`hover:bg-foreground-muted/10`). Zero destructive-red on the no button. `X` icon is no longer imported. Aria labels preserved verbatim. `onVote` plumbing byte-identical → architecture invariant #2 holds.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Add panRef + onTap tap-to-detail navigation on the outer card motion.div (D-17..D-22, D-25 step 4)</name>
  <files>frontend/components/ShortlistCard.tsx</files>
  <read_first>
    - frontend/components/ShortlistCard.tsx (full file, especially L78-90 component signature, L92-118 motion-value setup, L206-235 outer motion.div)
    - .planning/phases/23-deck-polish/23-CONTEXT.md §"DECK-04 — Tap-to-detail" (D-17..D-22)
    - .planning/phases/23-deck-polish/23-UI-SPEC.md §"Tap-to-detail (DECK-04)" table
    - .planning/phases/23-deck-polish/23-RESEARCH.md §"W-01: framer-motion v10/v11/v12 API for onTap + onPanStart/onPanEnd disambiguation"
    - .planning/phases/23-deck-polish/23-RESEARCH.md §"W-02: panRef.current = false reset timing — setTimeout(0) vs rAF vs microtask" (RECOMMENDED: setTimeout(0); SE-2 mitigation)
    - .planning/phases/23-deck-polish/23-RESEARCH.md §"W-03: Next.js 16 App Router useRouter from next/navigation"
    - .planning/phases/23-deck-polish/23-RESEARCH.md §"W-06: AnimatePresence mode='wait' + new onTap handler — interference risk" (no interference)
    - frontend/AGENTS.md (Next.js 16 has breaking changes; useRouter from next/navigation is the App Router pattern, verified against installed docs in RESEARCH.md W-03)
  </read_first>
  <action>
    Four sub-edits in `frontend/components/ShortlistCard.tsx`:

    SUB-EDIT 4A — Add the `useRef` import from React and `useRouter` from `next/navigation`.

    Current line 12: `import { useEffect, useState, useSyncExternalStore } from "react";`
    New line 12:     `import { useEffect, useRef, useState, useSyncExternalStore } from "react";`

    Add a new import line immediately after line 20 (`import { useTranslations } from "next-intl";`):
    ```typescript
    import { useRouter } from "next/navigation";
    ```

    (Keep alphabetical-ish ordering — placing it adjacent to other Next-ecosystem imports. Path verified: 12 existing call sites in the codebase, per RESEARCH.md W-03.)

    SUB-EDIT 4B — Inside the `ShortlistCard` component body, near the top (after `const reducedMotion = usePrefersReducedMotion();` at current line 90), add the router and panRef:

    ```typescript
    const router = useRouter();
    const panRef = useRef(false);
    ```

    These hooks must be called UNCONDITIONALLY on every render (React rules) — they go in the same hook-list region as the other top-of-component hooks.

    SUB-EDIT 4C — Add three new handlers and wire them onto the outer `motion.div`.

    Add three handler functions inside the `ShortlistCard` component body, near `handleDragEnd` (around current line 110-116):

    ```typescript
    function handlePanStart() {
      panRef.current = true;
    }

    function handlePanEnd() {
      // Defer the reset to the next macrotask so any synthetic tap event that
      // iOS Safari may fire after onPanEnd (within the same task) still sees
      // panRef.current === true and bails. setTimeout(0) is the recommended
      // primitive (RESEARCH.md §W-02 / SE-2): rAF is throttled in some PWA
      // configs, queueMicrotask runs before the synthetic tap. Real-device
      // iPhone smoke is required per D-28.
      setTimeout(() => {
        panRef.current = false;
      }, 0);
    }

    function handleTap() {
      // Belt-and-suspenders: framer-motion v12 already filters tap during
      // active drag via isDragActive() (RESEARCH.md §W-02), but the panRef
      // covers a hypothetical iOS Safari frame-ordering pathology. isFront
      // is checked defensively though peek cards are pointer-events-none.
      if (panRef.current) return;
      if (!isFront) return;
      router.push(`/recipes/${recipe.id}`);
    }
    ```

    Then wire all three onto the outer `motion.div` (currently at lines 206-235). Add three new props alongside the existing ones (insert them after `onDragEnd={dragEnabled ? handleDragEnd : undefined}` at L218):

    ```tsx
    onPanStart={handlePanStart}
    onPanEnd={handlePanEnd}
    onTap={handleTap}
    ```

    Important: these handlers are wired UNCONDITIONALLY (not gated by `dragEnabled`). The `panRef` is harmless when drag is disabled (it just stays `false`). The `onTap` is the FUNCTIONAL path that must work under reduced motion too (per D-28 — "tap-to-detail still works (it's a functional path, not a motion path)"). Gating any of them by `dragEnabled` would break reduced-motion tap-to-detail.

    The new `onTap` does NOT need `stopPropagation` from the thumb-button clicks — they're rendered as siblings in `ShortlistDeck.tsx:183-186`, OUTSIDE the card's outer motion.div (D-19, structurally guaranteed).

    SUB-EDIT 4D — Verify the partner-vote dot footer at lines 324-338 (`<div className="absolute bottom-3 right-3 ...">`) is NOT modified. It's a status display; taps on it inherit the card's onTap and trigger navigation. This is the intended behavior per D-17.

    Do NOT add `whileTap`, `active:scale`, or any visual tap feedback (D-21: "iOS Safari native page-transition IS the feedback"; no loading state, no brightness pulse).

    Do NOT modify `handleDragEnd`, the `useTransform` hooks, the `dragEnabled` calculation, the `motionExit` / `motionInitial` / `motionAnimate` blocks, or any other existing logic. All four DECK-04 plumbing points (panRef, useRouter, three handlers, three new motion.div props) are PURELY ADDITIVE except for the `useRef` import addition at line 12.
  </action>
  <verify>
    <automated>cd frontend && grep -c "useRouter\|panRef\|router.push(\`/recipes/" components/ShortlistCard.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `cd frontend && grep -c "import { useRouter } from \"next/navigation\";" components/ShortlistCard.tsx` returns `1`.
    - `cd frontend && grep -c "useRef" components/ShortlistCard.tsx` returns at least `2` (one in import, one in `useRef(false)` call).
    - `cd frontend && grep -c "const router = useRouter();" components/ShortlistCard.tsx` returns `1`.
    - `cd frontend && grep -c "const panRef = useRef(false);" components/ShortlistCard.tsx` returns `1`.
    - `cd frontend && grep -c "function handlePanStart()" components/ShortlistCard.tsx` returns `1`.
    - `cd frontend && grep -c "function handlePanEnd()" components/ShortlistCard.tsx` returns `1`.
    - `cd frontend && grep -c "function handleTap()" components/ShortlistCard.tsx` returns `1`.
    - `cd frontend && grep -c "panRef.current = true" components/ShortlistCard.tsx` returns `1`.
    - `cd frontend && grep -c "panRef.current = false" components/ShortlistCard.tsx` returns `1` (inside setTimeout).
    - `cd frontend && grep -c "setTimeout" components/ShortlistCard.tsx` returns `1`.
    - `cd frontend && grep -c "router.push(\`/recipes/\${recipe.id}\`)" components/ShortlistCard.tsx` returns `1`.
    - `cd frontend && grep -c "onPanStart={handlePanStart}" components/ShortlistCard.tsx` returns `1`.
    - `cd frontend && grep -c "onPanEnd={handlePanEnd}" components/ShortlistCard.tsx` returns `1`.
    - `cd frontend && grep -c "onTap={handleTap}" components/ShortlistCard.tsx` returns `1`.
    - `cd frontend && grep -c "whileTap" components/ShortlistCard.tsx` returns `1` (the existing `whileTap={dragEnabled ? { cursor: \"grabbing\" } : undefined}` at L219 — no NEW whileTap added).
    - `cd frontend && grep -c "active:scale" components/ShortlistCard.tsx` returns `2` (the two existing thumb-buttons; no NEW active:scale on the outer card).
    - `cd frontend && npx tsc --noEmit -p tsconfig.json` exits 0.
    - `cd frontend && npx eslint components/ShortlistCard.tsx` exits 0.
    - `cd frontend && npx next build --no-lint 2>&1 | head -20` does not error on `useRouter` / `next/navigation` import resolution. (If the full build is too slow for this gate, an equivalent check is the tsc + eslint pair above.)
  </acceptance_criteria>
  <done>
    ShortlistCard imports `useRouter` from `next/navigation` and `useRef` from React. The component holds a `panRef = useRef(false)` and a `router = useRouter()`. The outer motion.div has `onPanStart`, `onPanEnd`, `onTap` handlers wired unconditionally. `onPanStart` sets panRef true; `onPanEnd` defers reset via `setTimeout(0)`; `onTap` bails if `panRef.current` or `!isFront`, otherwise calls `router.push(\`/recipes/${recipe.id}\`)`. No visual tap feedback (native page transition is the feedback). Thumb buttons are unaffected (sibling level in ShortlistDeck). Reduced-motion path: drag disabled, no ring, no fly-off — but tap-to-detail still works (functional path).
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Rewrite DECK-01 success criterion in REQUIREMENTS.md to match the ring-based design (D-01, D-25 step 6)</name>
  <files>.planning/REQUIREMENTS.md</files>
  <read_first>
    - .planning/REQUIREMENTS.md (lines 30 — the DECK-01 line)
    - .planning/phases/23-deck-polish/23-CONTEXT.md §"D-01: Deviation from REQUIREMENTS.md DECK-01 wording" (this rewrite is a DELIVERABLE per the planning context, not optional)
    - .planning/phases/23-deck-polish/23-UI-SPEC.md §"Tokens used" footnote re `--color-valide-tint` ("NOT used in this phase")
  </read_first>
  <action>
    Rewrite the DECK-01 success criterion line in `.planning/REQUIREMENTS.md` to replace the "full-card background tint" wording with the "border-ring fade-in" wording that matches what was actually shipped. This is a DELIVERABLE per D-01 — the REQ wording must not be left stale after the design pivot.

    Current line 30 (verbatim):
    ```
    - [ ] **DECK-01**: OUI/NON text overlays on the suggest card are replaced by a subtle full-card background tint driven by drag distance — `--color-valide-tint` for "yes" direction, `bg-destructive/15` for "no" direction; `prefers-reduced-motion` path unchanged; `ShortlistCard.tsx:277-296` overlay block deleted. (gh#14)
    ```

    Replace with:
    ```
    - [ ] **DECK-01**: OUI/NON text overlays on the suggest card are replaced by a subtle drag-distance-driven border-ring fade-in — emerald-tinted `ring-2 ring-inset ring-[var(--color-valide-foreground)]` for "yes" direction, destructive-tinted `ring-2 ring-inset ring-destructive` for "no" direction; opacity ramps linearly 0→1 across 0..`SWIPE_OVERLAY_INPUT_PX` (80px); `prefers-reduced-motion` path conditionally unmounts the rings; `ShortlistCard.tsx:280-296` overlay block deleted. (Deviation from original "full-card tint" wording locked in 23-CONTEXT.md D-01 — ring reads subtler/more deliberate; `--color-valide-tint` is NOT used in this phase.) (gh#14)
    ```

    Key changes:
    - "full-card background tint" → "border-ring fade-in".
    - "`--color-valide-tint` for 'yes' direction, `bg-destructive/15` for 'no' direction" → "emerald-tinted `ring-2 ring-inset ring-[var(--color-valide-foreground)]` for 'yes' direction, destructive-tinted `ring-2 ring-inset ring-destructive` for 'no' direction".
    - Add the 80px ramp specification (`SWIPE_OVERLAY_INPUT_PX`) and the conditional-unmount note for reduced motion.
    - Add the trailing rationale parenthetical pointing to D-01 and noting `--color-valide-tint` is not used.
    - Keep the `(gh#14)` citation at the end.
    - Keep the `- [ ]` checkbox prefix (the requirement is still open until execution completes).

    Do NOT touch any other line in REQUIREMENTS.md — DECK-02, DECK-03, DECK-04 wording is fine as-is and matches the implementation.
  </action>
  <verify>
    <automated>grep -c "border-ring fade-in" .planning/REQUIREMENTS.md</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "full-card background tint" .planning/REQUIREMENTS.md` returns `0` (old wording removed).
    - `grep -c "color-valide-tint" .planning/REQUIREMENTS.md` returns at most `1` (only in the new parenthetical noting it's NOT used; not in the criterion itself).
    - `grep -c "bg-destructive/15" .planning/REQUIREMENTS.md` returns `0` (old wording removed).
    - `grep -c "border-ring fade-in" .planning/REQUIREMENTS.md` returns `1`.
    - `grep -c "ring-2 ring-inset ring-\[var(--color-valide-foreground)\]" .planning/REQUIREMENTS.md` returns `1`.
    - `grep -c "ring-2 ring-inset ring-destructive" .planning/REQUIREMENTS.md` returns `1`.
    - `grep -c "SWIPE_OVERLAY_INPUT_PX" .planning/REQUIREMENTS.md` returns at least `1`.
    - `grep -c "(gh#14)" .planning/REQUIREMENTS.md` returns `1` (citation preserved).
    - `grep -c "DECK-01" .planning/REQUIREMENTS.md` returns at least `2` (one in the requirement, one in the traceability table at line 74).
    - The traceability table (line ~74 `**Phase 23 — Deck polish** — Maps: DECK-01, DECK-02, DECK-03, DECK-04`) is unchanged.
  </acceptance_criteria>
  <done>
    REQUIREMENTS.md DECK-01 line accurately describes the ring-based design shipped in this phase. The deviation is documented inline with a backreference to D-01 in 23-CONTEXT.md. `--color-valide-tint` is noted as NOT used in this phase (preventing future code-review from flagging its absence as drift). Other requirements (DECK-02..04) unchanged.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → existing /recipes/[id] route | Client-side route push via `router.push()`. The destination route already enforces HttpOnly cookie auth (CLAUDE.md invariant #8) via the existing Next.js rewrites in `frontend/proxy.ts`. No new boundary introduced. |
| User pointer events → framer-motion handlers | All gesture handlers (drag, tap, pan) are client-side and operate on existing DOM events. No serialization, no IPC. No new boundary. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-23-01 | Spoofing | n/a | accept | Phase introduces no new authentication, identity, or session surface. Existing HttpOnly cookie flow (invariant #8) untouched. |
| T-23-02 | Tampering | n/a | accept | No new mutation endpoint, no new user input parsing, no new data persistence. Vote plumbing (`onVote("yes"/"no")` → backend POST `/votes`) is byte-identical pre/post phase (D-16). |
| T-23-03 | Repudiation | n/a | accept | Vote audit trail is unchanged — same `services/voting.compute_vote_state` derivation from the unchanged `votes` table. |
| T-23-04 | Information Disclosure | router.push to /recipes/[id] | accept | The detail route already exists and is fully translated/secured (Phase 8 + Phase 22 v0.5 QW-03). Tap-to-detail navigates to an already-authorized surface; no new data exposed. |
| T-23-05 | Denial of Service | framer-motion gesture handlers | accept | Rapid swipes still gated by `submittingFor !== null` on the deck (ShortlistDeck.tsx:185) — only one POST in flight at a time. Tap-to-detail is a client-side push (no network call); rapid tapping just navigates repeatedly to the same route. |
| T-23-06 | Elevation of Privilege | n/a | accept | No new authorization check, no new role, no new permission gate introduced. |

**Summary:** This is a cosmetic UI polish phase on an existing client-side component. No new attack surface introduced — no new auth, API surface, user input parsing, or data persistence. All STRIDE categories receive an `accept` disposition with the rationale that the relevant subsystems are byte-identical pre/post phase (vote plumbing, route auth, mutation endpoints). The phase verification (D-26 grep gates) structurally enforces that the changes are scoped to the four files declared in `files_modified`. No high-severity threats; no `mitigate` dispositions required.
</threat_model>

<verification>
## Phase 23 Verification — grep gates + manual UI smoke + real-device reduced-motion pass

Per D-26 / D-27 / D-28. No new Playwright specs. No `gsd-verifier` (`workflow.verifier: false` per D-29).

### Grep gates (must all pass after Task 1-5 complete)

```bash
# 1. OUI / NON overlay text fully removed
grep -n "OUI\|NON" frontend/components/ShortlistCard.tsx
# Expected: zero matches

# 2. X icon import removed from lucide-react import
grep -n "from \"lucide-react\"" frontend/components/ShortlistCard.tsx
# Expected: one line `import { Heart, UtensilsCrossed } from "lucide-react";` — no X

# 3. swipe-tokens.ts retuned to new values
grep -n "SWIPE_THRESHOLD_PX = 140\|SWIPE_VELOCITY_PX_S = 750\|SWIPE_OVERLAY_INPUT_PX = 80\|SWIPE_FLYOFF_DURATION_S = 0.28" frontend/lib/swipe-tokens.ts
# Expected: 4 matches

# 4. Legacy SWIPE_SPRING fully removed (no importers anywhere; grep-verified safe in RESEARCH.md W-08)
grep -rn "SWIPE_SPRING" frontend/
# Expected: zero matches

# 5. Ring-inset rings present
grep -c "pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset" frontend/components/ShortlistCard.tsx
# Expected: 2 (one yes ring, one no ring)

# 6. Tap-to-detail wiring present
grep -c "import { useRouter } from \"next/navigation\";\|const router = useRouter();\|const panRef = useRef(false);\|router.push(\`/recipes/\${recipe.id}\`)" frontend/components/ShortlistCard.tsx
# Expected: 4

# 7. REQUIREMENTS.md DECK-01 rewritten
grep -c "border-ring fade-in\|full-card background tint" .planning/REQUIREMENTS.md
# Expected: 1 (only the new "border-ring fade-in" wording; the old "full-card background tint" is gone)
```

### Build / lint gates

```bash
cd frontend && npx tsc --noEmit -p tsconfig.json   # Expected: exit 0
cd frontend && npx eslint components/ShortlistCard.tsx lib/swipe-tokens.ts   # Expected: exit 0
cd frontend && npx next build --webpack   # Expected: clean build (deploy gate — Vercel runs this on push to main)
```

### Manual UI smoke (operator runs on seeded fixture — D-27)

Run `cd backend && uv run seed && cd ../frontend && npm run dev`, open the seeded household's deck:

1. **Casual drift right ~50px** → emerald ring visible at ~62% opacity → release → snap-back smoothly (no commit). Card should NOT fly off.
2. **Casual drift right ~80px** → emerald ring at full opacity → release → snap-back. Still no commit (threshold is 140px).
3. **Deliberate drag right ~140px** → emerald ring full → release → fly-off right (0.28s), vote yes posted, deck advances.
4. **Deliberate drag left ~140px** → destructive ring full → release → fly-off left (0.28s), vote no posted, deck advances.
5. **Fast flick right (~50px but velocity ≥750 px/s)** → fly-off right, vote yes posted (velocity gate commits).
6. **Tap front card body** → `/recipes/[id]` opens → iOS Safari back gesture → same front card visible on top.
7. **Tap filled-Heart (yes) button** → vote yes posted, fly-off right, NO navigation.
8. **Tap outline-Heart (no) button** → vote no posted, fly-off left, NO navigation.
9. **Sub-3px tap** (small finger jitter) → still navigates correctly (framer-motion pan-threshold is 3px; sub-3px taps never set `panRef.current = true`).

### Real-device prefers-reduced-motion (D-28)

iOS Settings → Accessibility → Motion → Reduce Motion ON. Verify on the seeded fixture:

- Front card drag disabled (no movement).
- No ring visible during attempted drag (conditional mount unmounts the ring divs).
- Both thumb buttons still vote correctly.
- Tap-to-detail still works (functional path, NOT gated by `dragEnabled`).
- Fly-off animation does not play (`motionExit === undefined` under reduced motion, existing L188 logic).

### Real-device verifications (Phase 23-specific, iOS Safari)

- **Tap-after-pan disambiguation.** Drag the front card 30px right and release without committing. Within the same gesture loop, tap the now-snapped-back card. The tap should EITHER navigate (if iOS Safari does not fire a synthetic tap after onPanEnd) OR bail (if it does — panRef + setTimeout(0) protects). Both outcomes are correct under D-22; the SE-2 mitigation specifically prevents the "navigation fires during snap-back" pathology.
- **Tap during vote-in-flight.** Tap the card body while `submittingFor !== null` (immediately after voting via a thumb button). Navigation SHOULD still fire — card body's onTap is not gated by submittingFor. Confirm UX matches intent (no CONTEXT.md objection).
- **Partner realtime vote during /recipes/[id] visit.** Have the partner vote via realtime while local user is on the detail page. Local user presses back → deck may advance to the next card (correct behavior per D-20, not a regression).
</verification>

<success_criteria>
The phase is complete when:

1. All four grep gates from §Verification pass (zero `OUI`/`NON`, zero `SWIPE_SPRING`, 4 retuned constants, 2 ring-inset rings, 1 useRouter import, 1 panRef, 1 router.push).
2. `cd frontend && npx tsc --noEmit && npx eslint components/ShortlistCard.tsx lib/swipe-tokens.ts && npx next build --webpack` exits 0 cleanly.
3. Manual UI smoke (9 steps) passes on the seeded fixture in a standard browser.
4. Real-device reduced-motion pass (5 assertions) passes on a physical iPhone with iOS Settings → Accessibility → Motion → Reduce Motion ON.
5. Real-device iOS Safari smoke (3 additional verifications: tap-after-pan, tap-during-vote, partner-realtime-during-detail) passes.
6. `.planning/REQUIREMENTS.md` DECK-01 wording reflects the ring-based design (no stale "full-card background tint" string).
7. All five tasks merged in ONE atomic commit (per D-23). Commit message format: `feat(23-01): deck polish — ring overlays + threshold retune + Heart icons + tap-to-detail`.
</success_criteria>

<output>
After completion, create `.planning/phases/23-deck-polish/23-01-deck-polish-SUMMARY.md` documenting:

- All 4 DECK requirements closed (DECK-01..04) — link each to its task in this plan.
- Token deltas: `SWIPE_THRESHOLD_PX` 100→140, `SWIPE_VELOCITY_PX_S` 500→750, `SWIPE_OVERLAY_INPUT_PX` 100→80, `SWIPE_FLYOFF_DURATION_S` 0.2→0.28; legacy `SWIPE_SPRING` deleted.
- Files modified: 3 (`frontend/lib/swipe-tokens.ts`, `frontend/components/ShortlistCard.tsx`, `.planning/REQUIREMENTS.md`).
- Single atomic commit per D-23 — note the deliberate deviation from Phase 22's "1 req → 1 plan" pattern with rationale.
- Verification: grep gates passed / manual UI smoke / real-device reduced-motion pass — note operator name and device tested.
- Deferred items (none new — CONTEXT.md `<deferred>` block remains the canonical list).
- GitHub issues closed: gh#14, gh#16, gh#17, gh#18.
- Provides for future phases: tap-to-detail pattern (panRef + setTimeout(0) + onTap + isFront guard) reusable in any other framer-motion + Next.js App Router gesture surface; ring-inset technique reusable for any overlay-style feedback inside an overflow-hidden container; Phase 23 verification template (grep + manual UI smoke + real-device reduced-motion pass) inherited by future "deck-feel polish" phases.
</output>
