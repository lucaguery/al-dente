---
phase: 07-decide-polish
plan: 01
subsystem: frontend
tags: [decide, polish, retheme, tap-target, token-lock]
requires:
  - Phase 5 token system (bg-card, paper-grain, shadow-card, text-primary, font-display)
  - Phase 5 Button primitive at @/components/ui/button
provides:
  - DECIDE-03 invariant lock comment at frontend/app/globals.css:72
  - DECIDE-05 rethemed ColdStartChip with h-12 dismiss (closes W4 D-08 inline)
affects:
  - frontend/components/ColdStartChip.tsx (rendered by HomeDecide when corpus < 10 recipes)
tech-stack:
  added: []
  patterns:
    - "Fraunces italic body register at 14px on paper-grain card surface (mirrors Phase 6 D-Voice callout one notch tighter)"
    - "Terracotta Sparkles for first-run guidance (not error / not muted)"
    - "1-line CSS comment as invariant lock (no CI gate, no new alias — pure documentation)"
key-files:
  created: []
  modified:
    - frontend/app/globals.css
    - frontend/components/ColdStartChip.tsx
decisions:
  - "Comment as invariant lock instead of CI gate — matches CONTEXT.md decision rejecting tooling debt for a 1-token problem"
  - "Defer optional AnimatePresence fade-out — UI-SPEC marks it cosmetic-not-strict; fr.json + framer-motion overhead kept out unless real-device smoke shows the instant-disappear is jarring"
  - "Preserve all behavioral logic byte-for-byte — visual retheme only; useSyncExternalStore + sessionStorage + dispatch event + ARIA label untouched"
metrics:
  duration: ~10 minutes
  completed: 2026-05-08
  commits: 2
  files_changed: 2
  lines_added: 5
  lines_removed: 4
---

# Phase 7 Plan 1: DECIDE-03 token comment lock + DECIDE-05 ColdStartChip retheme Summary

**One-liner:** Inserted DECIDE-03 canonical-name comment lock above `--color-valide-tint` in globals.css, then rethemed ColdStartChip to Phase 5 paper-grain card surface with terracotta Sparkles, Fraunces-italic 14px body, and h-12 (48px) dismiss button — closing the W4 D-08 tap-target gap inline.

## What shipped

### DECIDE-03 — token reconciliation comment lock (Task 1)

**File:** `frontend/app/globals.css`
**Edit:** +1 line at line 72, immediately above the `--color-valide-tint` declaration.

**Exact line inserted:**
```css
  /* CANONICAL — DO NOT introduce `--color-validé-tint` (with French accent). DECIDE-03 invariant lock. */
```

**Result (lines 71–73):**
```css
     with the primary CTA. Per 03-UI-SPEC.md §"Phase 3 token additions". */
  /* CANONICAL — DO NOT introduce `--color-validé-tint` (with French accent). DECIDE-03 invariant lock. */
  --color-valide-tint: var(--valide-tint);
```

**Diff:** `+1 / -0`. No code change. No new alias. No CI gate (CONTEXT.md explicitly rejected tooling debt). The comment IS the deliverable. Future executors grepping for `DECIDE-03 invariant lock` or `DO NOT introduce` will hit this site before they read the declaration.

**Commit:** `e80d7a7` — `chore(07-01): DECIDE-03 invariant lock comment in globals.css`

### DECIDE-05 — ColdStartChip retheme + h-12 dismiss (Task 2)

**File:** `frontend/components/ColdStartChip.tsx`
**Edit:** 5 surgical changes inside the JSX return. All behavioral logic preserved byte-for-byte.

| # | Element                | Before                                                                                              | After                                                                                                       |
| - | ---------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1 | Outer `<div>` className | `mx-6 mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-rose-50 border border-border`    | `mx-6 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-card paper-grain shadow-card border border-border` |
| 2 | Sparkles className     | `text-foreground-muted`                                                                             | `text-primary`                                                                                              |
| 3 | Body `<p>` className   | `text-sm font-medium leading-5 flex-1`                                                              | `font-display italic text-sm text-foreground flex-1`                                                        |
| 4 | Dismiss Button className | `h-8 w-8`                                                                                          | `h-12 w-12`                                                                                                 |
| 5 | Everything else        | (same)                                                                                              | (preserved verbatim)                                                                                        |

**Why each change:**
- **gap-3 + px-4 py-3** balance the larger touch chrome and give the paper-grain texture room to read.
- **bg-card paper-grain shadow-card** replaces the legacy v0.1 `bg-surface-rose-50` alias with the Phase 5 system (warm-cream card + paper-grain anchor + warm two-layer shadow).
- **text-primary** on Sparkles makes the chip read as "first-run guidance, not error" (CONTEXT.md decision; terracotta from Phase 5 palette).
- **font-display italic text-sm text-foreground** matches the Phase 6 D-Voice callout register at 14px — Fraunces italic on paper-grain.
- **h-12 w-12** raises the dismiss button from 32px to 48px — DECIDE-05 W4 D-08 tap-target floor closure.

**Preserved (byte-for-byte):**
- `"use client"` directive
- Phase 3 comment block (lines 3–5)
- All imports (`useSyncExternalStore`, `Sparkles, X`, `useTranslations`, `Button`)
- `STORAGE_KEY = "dismissed_cold_start_chip"` constant
- `DISMISS_EVENT = "aldente:chip-dismissed"` constant
- `subscribe(cb)` / `getSnapshot()` helpers
- `useTranslations("home.cold_start")` + `useTranslations("common")` calls — ZERO new i18n keys
- `useSyncExternalStore(subscribe, getSnapshot, () => false)` call
- `handleDismiss()` body (sessionStorage write + dispatchEvent)
- `if (dismissed) return null;` early return
- `<X size={16} />` inside the dismiss button (icon size unchanged; only the button hit area grows)
- ARIA label `aria-label={tCommon("close")}`

**Commit:** `03f0b55` — `feat(07-01): DECIDE-05 ColdStartChip retheme + h-12 dismiss`

## Verification

### Phase 7 grep queries (UI-SPEC §"Verification queries")

| Query                                                                  | Expected | Actual                |
| ---------------------------------------------------------------------- | -------- | --------------------- |
| `grep -c "h-12 w-12" frontend/components/ColdStartChip.tsx`            | ≥ 1      | **1** PASS            |
| `grep -c "h-8 w-8" frontend/components/ColdStartChip.tsx`              | 0        | **0** PASS            |
| `grep -c "bg-surface-rose-50" frontend/components/ColdStartChip.tsx`   | 0        | **0** PASS            |
| `grep -c "paper-grain" frontend/components/ColdStartChip.tsx`          | ≥ 1      | **1** PASS            |
| `grep -c "shadow-card" frontend/components/ColdStartChip.tsx`          | ≥ 1      | **1** PASS            |
| `grep -c "text-primary" frontend/components/ColdStartChip.tsx`         | ≥ 1      | **1** PASS            |
| `grep -c "font-display italic" frontend/components/ColdStartChip.tsx`  | ≥ 1      | **1** PASS            |
| `grep -c "DECIDE-03 invariant lock" frontend/app/globals.css`          | ≥ 1      | **1** PASS            |
| `grep -c "DO NOT introduce" frontend/app/globals.css`                  | ≥ 1      | **1** PASS            |
| `git diff frontend/lib/i18n/fr.json` (zero changes)                    | empty    | **empty** PASS        |
| Machinery preserved (STORAGE_KEY/DISMISS_EVENT/useSyncExternalStore/handleDismiss/aria-label lines) | ≥ 5 | **12** PASS |

### STRIDE verification (T-07-01-03 mitigation)

`grep -c "dangerouslySetInnerHTML" frontend/components/ColdStartChip.tsx` → **0** PASS. React's default JSX text-node escaping handles `{t("body")}` safely.

### Build / type-check

- `npx tsc --noEmit` → **PASS** (exit 0).
- `npm run lint` → **n/a** in this worktree environment (`eslint` binary not present in `node_modules/.bin/`). Note: this is a worktree-local environment issue (npm install state), not a code issue. CI on main runs lint normally; the diff is purely className-string edits inside JSX with zero new symbols / imports / types, so the eslint surface for this change is empty.

### Diff summary

```
frontend/app/globals.css           | +1 / -0
frontend/components/ColdStartChip.tsx | +4 / -4
```

Total: 2 files, 5 insertions, 4 deletions across 2 commits.

## Deviations from Plan

None — plan executed exactly as written.

The optional `AnimatePresence` fade-out wrap (UI-SPEC §Motion entry "ColdStartChip dismiss") was **not** added per the plan's explicit instruction ("DO NOT implement this in Task 2"). Reason cited in plan: cosmetic refinement only, defers framer-motion + variants imports until real-device smoke shows instant-disappear feels jarring.

## Threat Flags

None. Phase 7 introduces zero new HTTP routes, zero new data inputs, zero new auth surfaces. STRIDE register T-07-01-01 through T-07-01-04 (in PLAN frontmatter) all hold post-execution.

## Self-Check: PASSED

**Files modified (verified on disk):**
- `frontend/app/globals.css` → FOUND (line 72 contains `DECIDE-03 invariant lock`)
- `frontend/components/ColdStartChip.tsx` → FOUND (line 56 contains `h-12 w-12`)

**Commits (verified in git log):**
- `e80d7a7` → FOUND (`chore(07-01): DECIDE-03 invariant lock comment in globals.css`)
- `03f0b55` → FOUND (`feat(07-01): DECIDE-05 ColdStartChip retheme + h-12 dismiss`)

**Acceptance criteria from PLAN:**
- [x] `--color-valide-tint` declaration unchanged at line 73 (was 72)
- [x] Comment text matches verbatim (incl. backticks around accented form, "DECIDE-03 invariant lock" anchor)
- [x] +1 line in globals.css (Task 1)
- [x] +4 / -4 lines in ColdStartChip.tsx (Task 2 — JSX className strings only)
- [x] All preserved invariants intact (machinery, hook, ARIA label, i18n key, early return)
- [x] Zero new i18n keys (fr.json clean)
- [x] STRIDE mitigation: no `dangerouslySetInnerHTML`
- [x] TypeScript compiles cleanly

All success criteria from the plan satisfied.
