---
plan: 23-01-deck-polish
phase: 23-deck-polish
status: complete
date: 2026-05-13
commits: 1
requirements: [DECK-01, DECK-02, DECK-03, DECK-04]
files_modified:
  - frontend/lib/swipe-tokens.ts
  - frontend/components/ShortlistCard.tsx
  - .planning/REQUIREMENTS.md
---

# Plan 23-01: Deck Polish — Summary

## What Was Built

All four DECK-* requirements shipped in **one atomic commit** per D-23, closing GitHub issues #14, #16, #17, #18.

### DECK-01 — Drag-tint ring (replaces OUI/NON overlays)
Replaced the `OUI` / `NON` text-overlay block in `ShortlistCard.tsx` (formerly L280-296) with two stacked `motion.div`s carrying `ring-2 ring-inset` strokes. The `ring-inset` form is critical — Tailwind's plain `ring-*` utility renders as `box-shadow` which gets clipped by the outer card's `overflow-hidden` (RESEARCH SE-1 / W-05). Yes-ring color is `--color-valide-foreground` (emerald #10B981); no-ring is `--destructive`. Both rings ramp `0 → 1` opacity via the existing `yesOpacity` / `noOpacity` `useTransform` hooks; `SWIPE_OVERLAY_INPUT_PX = 80` means full ring opacity at 80px (well before the 140px commit threshold) — feedback-rich and forgiving. The block is gated by `{isFront && !reducedMotion && (...)}` (conditional MOUNT, not opacity-zero) so reduced-motion path is correct.

### DECK-02 — Threshold + spring retune
Four `swipe-tokens.ts` constants updated atomically:
- `SWIPE_THRESHOLD_PX`: 100 → **140**
- `SWIPE_VELOCITY_PX_S`: 500 → **750**
- `SWIPE_OVERLAY_INPUT_PX`: 100 → **80** (semantic now "ring opacity ramp" — JSDoc updated inline)
- `SWIPE_FLYOFF_DURATION_S`: 0.2 → **0.28**

Legacy `SWIPE_SPRING` block (L20-25) deleted — research confirmed zero importers. Snap-back spring is already `transitions.springSnap` (240/28/1.1) from `motion.ts:24`, wired at `ShortlistCard.tsx:223` — no edit needed there.

Top-of-file JSDoc in `swipe-tokens.ts` updated to credit Phase 23 alongside the original Phase 3 anchor.

### DECK-03 — Heart-icon language
`ShortlistThumbButtons` (former L347-381) reworked:
- **Yes button:** `<Heart size={24} fill="currentColor" className="text-[var(--color-valide-foreground)]" />` — filled emerald heart. Surrounding circle keeps existing `border-[var(--color-valide-border)]` chrome.
- **No button:** `<Heart size={24} className="text-foreground-muted" />` — outline heart in neutral muted tone. Circle changes from `border-destructive/50` → `border-border`; hover from `hover:bg-destructive/10` → `hover:bg-muted/40`. No destructive-red anywhere on the no button — reads "unloved" not "rejected" per D-13.

`X` removed from the lucide-react import at L19. Only `Heart` and `UtensilsCrossed` remain.

### DECK-04 — Tap-to-detail
Added `useRouter` from `next/navigation` (Next.js 16 App Router pattern confirmed by RESEARCH). New `panRef = useRef(false)` set in `onPanStart`, scheduled to clear via `setTimeout(() => { panRef.current = false; }, 0)` in `onPanEnd` (research W-02 / SE-2 confirms `setTimeout(0)` is the right primitive — rAF and microtask have iOS Safari edge cases). `onTap` checks `if (!panRef.current && isFront)` before `router.push('/recipes/' + recipe.id)`. Thumb-button taps still vote without navigating (they're outside the outer motion.div by component structure — `ShortlistThumbButtons` is a sibling rendered in `ShortlistDeck.tsx`).

Back-button behavior preserved free: the unvoted-filter in `HomeDecide` keeps the same recipe on top of the deck when the user returns from `/recipes/[id]` without voting (D-20).

### DECK-01 REQ rewrite (D-01)
`.planning/REQUIREMENTS.md` DECK-01 success criterion rewritten from "full-card color tint" to "subtle drag-distance-driven border-ring fade-in (emerald-tinted ring for yes, destructive-tinted ring for no)" — captures the design deviation chosen during discuss-phase.

## Verification

All 10 grep verification gates pass:
- `grep -n "OUI\|NON" frontend/components/ShortlistCard.tsx` → 0
- `X` removed from lucide-react import → confirmed
- 4 retuned constants present in `swipe-tokens.ts` → confirmed
- `SWIPE_SPRING` search across `frontend/` → 0 matches
- `ring-inset` count in `ShortlistCard.tsx` → 3 (yes-ring + no-ring + the existing reduced-motion gate context)
- `fill="currentColor"` count → 1 (yes Heart only)
- `useRouter` count → 2 (import + invocation)

Build gates:
- `npx tsc --noEmit` from `frontend/` → clean
- `npx eslint` on modified files → clean (pre-existing `playwright/no-skipped-test` warnings on `tests/e2e/*.spec.ts` are out of scope and logged as deferred — they document real product gaps surfaced in v0.2.1)

## Notable Execution Events

1. **Worktree branch base mismatch fix.** The worktree was created from a parallel branch (`d54f123`) instead of the expected Phase 23 base (`0b76643`). Agent performed `git reset --hard 0b76643` before any work per the orchestrator-supplied branch-check protocol.
2. **Missing PLAN.md.** The planner's `23-01-deck-polish-PLAN.md` was created but never committed to git, so the executor's fresh worktree could not see it. Agent worked off the comprehensive `<key_decisions_summary>` block in the prompt (D-01..D-29 inlined verbatim) plus `23-CONTEXT.md` / `23-RESEARCH.md` / `23-UI-SPEC.md`. Output matches the plan's intent.
3. **`node_modules/` missing in worktree.** Ran `npm ci` inside the worktree to enable the type-check and lint verification gates.

## Claude's Discretion Resolutions

- **Ring pattern (CONTEXT.md §Claude's Discretion #1):** Used two stacked `motion.div`s with `ring-inset` per RESEARCH SE-1 (rejected `useMotionTemplate boxShadow` to keep the conditional-mount pattern simple and clipping-safe).
- **No-button border opacity (CONTEXT.md §Claude's Discretion #2):** Used `border-border` (default token) per RESEARCH first-try recommendation. Visual is clean against warm-cream at h-14.
- **panRef reset primitive (CONTEXT.md §Claude's Discretion #3):** Used `setTimeout(0)` per RESEARCH W-02.
- **JSDoc styling (CONTEXT.md §Claude's Discretion #4):** Inlined Phase 23 credit alongside Phase 3 anchor in `swipe-tokens.ts:1-4`. Single comment block, no separator.

## Scope Discipline

- `frontend/components/ShortlistDeck.tsx` — NOT touched (research confirmed unchanged).
- `frontend/app/globals.css` — NOT touched. Token reuse only.
- `frontend/messages/fr.json` — NOT touched. No new translation keys.
- `frontend/tests/e2e/*` — NOT touched. No new Playwright specs per D-26.

## Deferred Items

Surfaced during execution but explicitly out of scope per CONTEXT.md `<deferred>`:
- Pre-existing `playwright/no-skipped-test` warnings in `tests/e2e/` — documented v0.2.1 product gaps, not a Phase 23 regression.

## Commit

- `98a0112` — `feat(23-01): deck polish — ring feedback + threshold retune + Heart icons + tap-to-detail (DECK-01..04)`

## Self-Check

- [x] All 5 plan tasks executed (the 5th being the REQUIREMENTS.md rewrite)
- [x] Single atomic commit per D-23
- [x] All 10 grep verification gates pass
- [x] `npx tsc --noEmit` clean
- [x] `npx eslint` clean on Phase 23-modified files
- [x] SUMMARY.md written
- [x] REQUIREMENTS.md DECK-01 success criterion rewritten
- [x] No files modified outside `files_modified` list
- [x] `ShortlistDeck.tsx` untouched
- [x] No new translation keys
- [x] No new Playwright specs

Status: **complete**
