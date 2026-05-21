---
phase: 40
plan: 05
subsystem: frontend
tags: [cooking-logs, drift-fix, la-grille]
requires: []
provides:
  - Cooking-log detail page with La Grille tokens only
affects:
  - frontend/app/cooking-logs/[id]/page.tsx
tech_stack:
  added: []
  patterns:
    - "Valide-tint token reserved exclusively for the validated voting state and the strongest cooking-log signal (loved)"
key_files:
  modified:
    - frontend/app/cooking-logs/[id]/page.tsx
key_decisions:
  - "Loved chip and validated voting state share the same valide-tint + terracotta language — strongest cooking-log signal aligns visually with strongest voting signal"
  - "Liked chip moves to neutral bg-card to free the valide-tint token for the exclusive validated semantics"
  - "Absolute-date header was already using Geist 500 (no italic) at the JSX level; comment header was the only Fraunces reference and is now rewritten to cite ADR-0004"
requirements_completed:
  - DRIFT-01
duration: "~5 min"
completed: 2026-05-21
---

# Phase 40 Plan 05: Cooking-Logs DRIFT-01 Token Sweep Summary

Surgical token sweep on `frontend/app/cooking-logs/[id]/page.tsx`: replaced the three rating-chip class strings (D-10, D-11, D-12), dropped the Fraunces / cookbook-chapter-opener comment annotations (D-13), and rewrote the file-header comment to cite ADR-0004 + Phase 40 CONTEXT.md (D-14).

## What was built

- `frontend/app/cooking-logs/[id]/page.tsx`:
  - Header comment block (lines 3-23) rewritten from the Phase 17 / HIST-02 / Fraunces / Sober Kitchen note to a 7-line La Grille header citing ADR-0004 + Phase 40 CONTEXT.md (D-10–D-14).
  - Loved chip class: `bg-surface-rose-100 text-primary border border-primary/40` → `bg-[var(--color-valide-tint)] text-primary border border-primary` (D-10).
  - Liked chip class: `bg-[var(--color-valide-tint)] text-foreground border border-[var(--color-valide-border-faint)]` → `bg-card border border-border text-foreground` (D-11).
  - Disliked chip class: unchanged — already La Grille-compliant (D-12).
  - `formatAbsoluteFr` JSDoc rewritten to drop "cookbook-chapter-opener gesture per D-17-05" — now cites Phase 40 D-13.
  - Net: 11 insertions, 24 deletions (the verbose pre-Phase-40 comment block shrank).

## Deviations from Plan

**[Rule 1 — no-op] D-13 Fraunces italic on date header was already removed at the JSX level**
- Found during: Task 3 (date-header italic removal).
- Issue: Plan said the date header used Fraunces italic. Inspection of line 149 showed the `<h1>` was already `text-2xl text-foreground` + inline `fontWeight: 500`. No `italic` class, no `font-fraunces` class. The Fraunces register was only documented in the comment header — the JSX was already clean.
- Fix: No JSX change needed; the comment-header rewrite (Task 4) absorbed all Fraunces references.
- Files modified: Only the comment block at lines 3-23 and the JSDoc at lines 42-44.

**Total deviations:** 1 (pre-existing partial cleanup). **Impact:** None — Task 3 verification still passes (`grep "Fraunces" | wc -l` returns 0).

## Verification

- ✓ `cd frontend && npm run lint` — clean.
- ✓ `grep -E "Fraunces|bg-surface-rose-100|cookbook-chapter-opener|Sober Kitchen|Phase 17|HIST-02|D-17-05|Cormorant|Caveat|paper-grain|font-fraunces" frontend/app/cooking-logs/\[id\]/page.tsx | wc -l` — 0.
- ✓ `grep -F 'bg-[var(--color-valide-tint)] text-primary border border-primary' frontend/app/cooking-logs/\[id\]/page.tsx | wc -l` — 1.
- ✓ `grep -F 'bg-card border border-border text-foreground' frontend/app/cooking-logs/\[id\]/page.tsx | wc -l` — 1.
- ✓ `grep -F 'var(--color-valide-border-faint)' frontend/app/cooking-logs/\[id\]/page.tsx | wc -l` — 0 (legacy faint-border token gone).

## Issues Encountered

None.

## Self-Check: PASSED

Plan 40-05 complete. Phase 40 ready for verification.
