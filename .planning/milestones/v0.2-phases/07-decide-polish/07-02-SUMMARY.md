---
phase: 07-decide-polish
plan: 02
subsystem: frontend/decide
tags:
  - motion
  - shortlist
  - paper-grain
  - framer-motion
  - phase-7
dependency_graph:
  requires:
    - "frontend/lib/motion.ts (existing transitions object literal — Phase 5)"
    - "frontend/app/globals.css paper-grain utility (Phase 5)"
    - "frontend/app/globals.css prefers-reduced-motion clamp (Phase 5)"
    - "frontend/components/ShortlistCard.tsx (Phase 3 + Phase 4 baseline, 260 LOC)"
    - "frontend/components/ShortlistDeck.tsx (Phase 4 baseline, 141 LOC — read-only context)"
  provides:
    - "transitions.springSnap named transition (consumable by future Phase 7+ surfaces)"
    - "ShortlistCard with paper-physics snap-back + paper-grain frame on both variants + rounded-t photo frame"
  affects:
    - "Daily decide screen swipe deck visual + tactile motion"
tech_stack:
  added:
    - "Framer Motion spring transition with mass: 1.1 (paper-physics)"
  patterns:
    - "Named transition presets in lib/motion.ts (extends existing fast/normal pattern)"
    - "transition={cond ? preset : undefined} guard for prefers-reduced-motion via inheritance"
    - "paper-grain on Card surfaces only, never on photo regions (Phase 5/6 invariant preserved)"
key_files:
  created: []
  modified:
    - "frontend/lib/motion.ts (43 → 48 LOC, +5 — single new entry inside transitions)"
    - "frontend/components/ShortlistCard.tsx (260 → 262 LOC, +5 -3 net = +2)"
decisions:
  - "rounded-t-2xl (not rounded-t-xl) — matches the card frame's rounded-2xl radius, eliminates the corner step"
  - "Spring values 240 / 28 / 1.1 ship as default — UI-SPEC permits ±10% only after dual-iPhone validation"
  - "paper-grain placed after inset-0 (next to layout, before color) for readability per UI-SPEC examples"
  - "transition prop uses isFront && !reducedMotion guard — peek cards stay static; reduced-motion is belt-and-braces with the globals.css clamp"
  - "transitions import added next to the other @/lib/* type imports — kept import grouping logical"
metrics:
  duration: "Task 1 + Task 2 atomic implementation (~15 min total — surgical edits, no debugging)"
  completed_date: "2026-05-08"
  tasks: 2
  files_modified: 2
  loc_delta: "+10 / -3 net = +7"
  commits: 2
---

# Phase 7 Plan 02: springSnap motion preset + ShortlistCard paper-grain frame Summary

JWT-style motion language extension — `springSnap` named transition added to `frontend/lib/motion.ts`, consumed by the front swipe card in `ShortlistCard.tsx` via a guarded `transition` prop, with paper-grain on both card variants and `rounded-t-2xl` on the photo region. ShortlistDeck.tsx remains byte-for-byte unchanged at 141 LOC.

## Objective Recap

Close DECIDE-02 (swipe deck refined with the new motion language — one curve, paper-physics feel) by:

1. Adding a single `springSnap` named transition to `frontend/lib/motion.ts` (no breaking change to existing exports).
2. Consuming `springSnap` on the front swipe card via `transition={transitions.springSnap}` guarded by `isFront && !reducedMotion`.
3. Adding `paper-grain` to both front and peek card frames.
4. Adding `rounded-t-2xl overflow-hidden` to the photo region parent.

## Implementation

### Task 1 — `transitions.springSnap` in `frontend/lib/motion.ts`

Added inside the existing `transitions` object literal between `normal` and the closing brace. Diff:

```diff
 export const transitions = {
   fast: { duration: durations.fast, ease: easeCraft } satisfies Transition,
   normal: { duration: durations.normal, ease: easeCraft } satisfies Transition,
+  // Phase 7 — paper-physics card snap-back. Slightly higher mass than the
+  // Framer Motion default reads as "card on a counter," not "rubber band."
+  // The spring damps naturally without an explicit bounce parameter.
+  // Per 07-UI-SPEC §Motion + 07-CONTEXT §"Swipe Deck Physics".
+  springSnap: { type: "spring", stiffness: 240, damping: 28, mass: 1.1 } satisfies Transition,
 } as const;
```

- `easeCraft`, `durations`, the existing `fast` / `normal` entries, the `variants` object (including the unused `swipeCommit` keyframe variant) — all preserved verbatim.
- `satisfies Transition` retained on all three transitions; constraint upholds even if framer-motion's `Transition` type drifts in a future minor.

**Commit:** `a994dc2` — `feat(07-02): add springSnap named transition to motion.ts`

### Task 2 — Four surgical edits in `frontend/components/ShortlistCard.tsx`

**Edit 1 — `transitions` import** (placed next to the `@/lib/*` type imports, between `@/lib/swipe-tokens` and `@/lib/recipes`):

```diff
+import { transitions } from "@/lib/motion";
 import type { Recipe } from "@/lib/recipes";
 import type { VoteValue } from "@/lib/votes";
```

**Edit 2 — front card className** (`paper-grain` after `inset-0`):

Before:
```tsx
"absolute inset-0 bg-card border border-border rounded-2xl shadow-card-hover overflow-hidden flex flex-col touch-pan-y"
```

After:
```tsx
"absolute inset-0 paper-grain bg-card border border-border rounded-2xl shadow-card-hover overflow-hidden flex flex-col touch-pan-y"
```

**Edit 3 — peek card className** (`paper-grain` after `inset-0`):

Before:
```tsx
"absolute inset-0 bg-card border border-border rounded-2xl shadow-card overflow-hidden flex flex-col scale-[0.94] translate-y-3 opacity-60 pointer-events-none"
```

After:
```tsx
"absolute inset-0 paper-grain bg-card border border-border rounded-2xl shadow-card overflow-hidden flex flex-col scale-[0.94] translate-y-3 opacity-60 pointer-events-none"
```

**Edit 4 — photo region className** (`rounded-t-2xl overflow-hidden` added):

Before:
```tsx
<div className="relative aspect-[4/3] bg-surface-muted">
```

After:
```tsx
<div className="relative aspect-[4/3] bg-surface-muted rounded-t-2xl overflow-hidden">
```

**Edit 5 — transition prop on front motion.div** (between `whileTap` and `className`):

```diff
       onDragEnd={dragEnabled ? handleDragEnd : undefined}
       whileTap={dragEnabled ? { cursor: "grabbing" } : undefined}
+      transition={isFront && !reducedMotion ? transitions.springSnap : undefined}
       className={
```

**Commit:** `3695bb7` — `feat(07-02): paper-grain frame + springSnap on ShortlistCard`

## Deviations from Plan

### Documented LOCKED supersession (carried from UI-SPEC over CONTEXT.md)

**1. `rounded-t-2xl` supersedes CONTEXT.md `rounded-t-xl`**

- **Source:** CONTEXT.md §ShortlistCard mentions `rounded-t-xl` as the photo treatment. UI-SPEC §"Paper-Grain > ShortlistCard rounded-t photo treatment" locks `rounded-t-2xl` instead.
- **Why:** The card frame uses `rounded-2xl`; `rounded-t-xl` would be one notch smaller (`xl` = `0.75rem`, `2xl` = `1rem`) and produce a visible step at the corner where the photo meets the frame edge. `rounded-t-2xl` matches the frame radius exactly so the photo's top corners curve flush with the card's top corners.
- **Action:** Used `rounded-t-2xl` per the LOCKED choice. Verified `rounded-t-xl` does NOT appear in `ShortlistCard.tsx` (`grep -c "rounded-t-xl" returns 0`).

### Auto-fixed Issues

None — the plan specified the four edits with exact before/after strings, and they applied cleanly. No bugs, no missing critical functionality, no architectural changes required.

## Verification Output

All 5 final verification queries (07-02-PLAN §verification + UI-SPEC §"Verification queries") pass:

```
=== Q4: paper-grain on ShortlistCard.tsx (≥ 2) ===
   135: ? "absolute inset-0 paper-grain bg-card border border-border rounded-2xl ..."
   136: : "absolute inset-0 paper-grain bg-card border border-border rounded-2xl ..."

=== Q5: rounded-t-2xl (≥ 1) and rounded-t-xl (= 0) ===
   140: <div className="relative aspect-[4/3] bg-surface-muted rounded-t-2xl overflow-hidden">
   (no rounded-t-xl matches)

=== Q6: transitions.springSnap + motion import on ShortlistCard.tsx (≥ 1 each) ===
    30: import { transitions } from "@/lib/motion";
   132: transition={isFront && !reducedMotion ? transitions.springSnap : undefined}

=== Q7: springSnap on motion.ts (≥ 1, with stiffness/damping/mass) ===
    24: springSnap: { type: "spring", stiffness: 240, damping: 28, mass: 1.1 } satisfies Transition,

=== Q13: ShortlistDeck.tsx LOC (= 141, ±0 — structural-rewrite prohibition) ===
   141 components/ShortlistDeck.tsx
```

### STRIDE verification (07-02-PLAN §threat_model)

`grep -c "dangerouslySetInnerHTML" frontend/components/ShortlistCard.tsx frontend/lib/motion.ts` returns 0. No new untrusted-content render path introduced; `recipe.title` and `recipe.photo_paths[0]` continue to flow through React's auto-escaping JSX as in v0.1.

### Preserved logic confirmation

Single grep across `usePrefersReducedMotion|useMotionValue|useTransform|handleDragEnd|dragSnapToOrigin|dragElastic` returns 13 occurrences — well above the ≥6 threshold. Specifically preserved byte-for-byte:

- `"use client"` directive (line 1)
- Phase 3 file-header comment (lines 3–10)
- All other imports (motion, useMotionValue, useTransform, PanInfo, lucide icons, useTranslations, Badge, Button, MemberDot, swipe-tokens, Recipe, VoteValue)
- `usePrefersReducedMotion` hook + `subscribePRM` + `getPRMSnapshot` (lines 49–63)
- `useMotionValue(0)` + `useTransform` calls for `x`, `rotate`, `yesOpacity`, `noOpacity` (lines 76–92)
- `handleDragEnd` swipe-threshold logic (lines 94–100)
- `dragEnabled = isFront && !reducedMotion` (line 102)
- `cuisine`, `moods`, `prepTime`, `primaryPhoto` derivations (lines 103–106)
- `partnerAriaKey` / `partnerAria` (lines 108–114)
- All other props on `<motion.div>`: `role`, `aria-labelledby`, `drag`, `dragConstraints`, `dragSnapToOrigin`, `dragElastic`, `style`, `onDragEnd`, `whileTap`
- The body region (title in `text-title` Fraunces 24px, Badges, prep-time text, lines 180–200)
- The partner-vote dot footer (lines 203–217)
- The drag overlays (OUI/NON, lines 159–176) — sit absolute-positioned at `top-6` within the `aspect-[4/3]` photo region, well within bounding box; new `overflow-hidden` on parent does not occlude them during drag
- `ShortlistThumbButtons` standalone export (lines 226–260)

### LOC accounting

| File                             | Pre-Phase-7 LOC | Post-Phase-7 LOC | Δ            |
| -------------------------------- | --------------- | ---------------- | ------------ |
| frontend/lib/motion.ts           | 43              | 48               | +5           |
| frontend/components/ShortlistCard.tsx | 260             | 262              | +2 (1 import + 1 transition prop) |
| frontend/components/ShortlistDeck.tsx | 141             | 141              | **0** (LOCKED) |

## Real-Device Validation

Spring tuning ships at the default `stiffness: 240, damping: 28, mass: 1.1`. UI-SPEC §"Motion > Spring tuning escape hatch" permits ±10% adjustment only after dual-iPhone validation. Real-device validation is deferred to the Phase 7 orchestrator-owned smoke test (post-merge, on the deployed Vercel build). If the snap-back feels too tight or too floaty on either iPhone, the values can be adjusted within the ±10% window in a follow-up commit; otherwise 240/28/1.1 is the final shipping value.

## Authentication Gates

None — both tasks are pure frontend code edits, no auth surfaces touched.

## Self-Check: PASSED

Files verified to exist on disk:

- `/Users/gulu3001/dev/al-dente/.claude/worktrees/agent-a19a84dfeaaf9564e/frontend/lib/motion.ts` — FOUND (48 LOC)
- `/Users/gulu3001/dev/al-dente/.claude/worktrees/agent-a19a84dfeaaf9564e/frontend/components/ShortlistCard.tsx` — FOUND (262 LOC)
- `/Users/gulu3001/dev/al-dente/.claude/worktrees/agent-a19a84dfeaaf9564e/frontend/components/ShortlistDeck.tsx` — FOUND (141 LOC, unchanged)

Commits verified in `git log`:

- `a994dc2` — Task 1 commit FOUND
- `3695bb7` — Task 2 commit FOUND
