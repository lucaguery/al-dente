---
phase: 36
fixed_at: 2026-05-18T18:32:00Z
review_path: .planning/phases/36-sober-kitchen-finish-polish/36-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 36: Code Review Fix Report

**Fixed at:** 2026-05-18T18:32:00Z
**Source review:** `.planning/phases/36-sober-kitchen-finish-polish/36-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (warnings only — 6 info findings explicitly out of scope)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: Inline `borderColor` style overrides SOBER-15 muted-destructive border-left

**Files modified:** `frontend/components/VoteSummary.tsx`
**Commit:** `9f74a2c`
**Applied fix:** Option (a) — branched the `rowStyle` ternary on `isRejete`. The Rejeté branch now sets only `background: "var(--card)"` and omits `borderColor` entirely, letting the SOBER-15 `.shortlist-row.row-state-rejete` rule in `globals.css` own `border-left-color` (the muted destructive tint via `color-mix(in oklch, var(--destructive) 50%, transparent)`). The Validé and "everything-else" branches are unchanged. Added an explanatory comment above the ternary documenting the specificity contract so future edits don't re-introduce the inline override.

### WR-02: `ShortlistDeck.tsx` is orphaned dead code (~190 LOC)

**Files modified:** `frontend/components/ShortlistDeck.tsx` (deleted)
**Commit:** `6713237`
**Applied fix:** `git rm frontend/components/ShortlistDeck.tsx` (189 lines removed). Pre-delete: `grep -rn "import.*ShortlistDeck" frontend/` returned zero matches. Post-delete: `npx tsc --noEmit` clean (no broken imports surfaced). Comment-only references in `ShortlistCard.tsx:50,166`, `VoteSummary.tsx:64,110,154`, and `tests/e2e/shortlist-vote.spec.ts:9,130` left in place — they are historical provenance notes describing the optimistic-vote pattern that VoteSummary inherited from ShortlistDeck. The comments document lineage, not dead wiring; updating them is documentation churn not required for the MVP no-shim cut.

---

_Fixed: 2026-05-18T18:32:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
