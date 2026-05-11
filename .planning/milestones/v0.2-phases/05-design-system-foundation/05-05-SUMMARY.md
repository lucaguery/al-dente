---
phase: 05-design-system-foundation
plan: 05
subsystem: ui
tags: [shadcn-primitives, paper-grain, warm-shadows, ease-craft, terracotta, design-system, in-place-retheme]

requires:
  - phase: 05-design-system-foundation
    plan: 01
    provides: "globals.css token surface — paper-grain utility, shadow-card / shadow-card-hover / shadow-nav warm shadows, --ease-craft + --duration-fast + --duration-normal motion tokens, terracotta --primary, warm-cream popover/card backgrounds, warm-tinted --border / --input"
  - phase: 05-design-system-foundation
    plan: 03
    provides: "@theme inline font tokens with one-phase aliases (--font-heading -> --font-display, --font-sans -> --font-body) so existing font-heading references in Card/Dialog/Sheet/AlertDialog Title elements continue to resolve to Fraunces"
  - phase: 05-design-system-foundation
    plan: 04
    provides: "frontend/lib/motion.ts framer-motion presets — not consumed by any of the 15 primitives in their current form (none use framer-motion); reserved for downstream phase consumers"

provides:
  - "10 re-themed shadcn primitives in frontend/components/ui/* (Card, Dialog, Sheet, AlertDialog, Select, Button, Input, Textarea, Tabs, Badge): paper-grain on every card-like surface, shadow-card / shadow-card-hover replacing shadow-lg / ring-1 ring-foreground/10, bg-foreground/15 warm overlays replacing bg-black/10 cool overlays, transition-colors duration-fast ease-craft replacing transition-all / transition-colors-without-duration, h-10/h-11 default sizes raised on Button/Input/SelectTrigger, terracotta after:bg-primary tab indicator"
  - "5 verified token-driven primitives (Skeleton, Sonner, Label, ScrollArea, Separator): unmodified — confirmed to consume new Plan 01 tokens automatically (warm-taupe bg-muted, warm-tinted bg-border, var(--popover) toast bg, body-inherited font); sonner correctly excluded from paper-grain per UI-SPEC chrome-not-card rule"
  - "All 15 primitives retain their data-slot attributes (radix contract preserved), all exports unchanged (no breaking renames), no new variants added (UI-SPEC §Out of Scope honored)"

affects:
  - "05-06 (styleguide route — will render every re-themed primitive variant for visual verification)"
  - "06-decide-polish, 07-capture-polish, 08-cooking-polish, 09-realtime-polish (every screen consumes Card / Button / Dialog / Sheet / Input etc. and inherits the Slow Food artisanal identity through these primitives)"
  - "Phase 6 alias-removal sweep (must replace font-heading -> font-display in card.tsx:41, dialog.tsx:133, sheet.tsx:117, alert-dialog.tsx:126 — same files as Plan 03 logged)"

tech-stack:
  added: []
  patterns:
    - "In-place primitive re-theme via single-line className edits — no wrapper components, no CVA variant explosion"
    - "Surface-vs-chrome distinction: paper-grain applied to card-like surfaces (Card, DialogContent, SheetContent, AlertDialogContent, SelectContent) and explicitly excluded from chrome (Button, Input, Sonner, Badge)"
    - "Targeted transition narrowing: transition-all -> transition-colors duration-fast ease-craft on interactive primitives so transform-based hover/active effects (active:translate-y-px on Button) snap instantly while color hovers ease through the Slow Food curve"
    - "Two-pass migration on font-heading utility — Plans 03 + 05 deliberately keep font-heading via @theme inline alias so primitive references in Card/Dialog/Sheet/AlertDialog Title elements continue to render until Phase 6 audit task sweeps them to font-display"

key-files:
  created: []
  modified:
    - "frontend/components/ui/card.tsx"
    - "frontend/components/ui/dialog.tsx"
    - "frontend/components/ui/sheet.tsx"
    - "frontend/components/ui/alert-dialog.tsx"
    - "frontend/components/ui/select.tsx"
    - "frontend/components/ui/button.tsx"
    - "frontend/components/ui/input.tsx"
    - "frontend/components/ui/textarea.tsx"
    - "frontend/components/ui/tabs.tsx"
    - "frontend/components/ui/badge.tsx"

key-decisions:
  - "Implemented UI-SPEC §Component Inventory hints verbatim — every per-primitive single-line edit transcribed exactly from the 15-row table at lines 492-516. Rationale: the spec was prescriptive; downstream Plan 06 (styleguide) and Phases 6-9 (screen polish) all inherit these primitives unchanged, so any local deviation would propagate."
  - "Five token-driven primitives left untouched (Skeleton, Sonner, Label, ScrollArea, Separator) per UI-SPEC 'verify only' rows. Verified inline that bg-muted / bg-border / var(--popover) / no-font-override patterns are already present and resolve to Plan 01's new warm-taupe / warm-border / warm-cream values automatically. Task 3 produced an empty commit to track verification completion in the git log."
  - "Did NOT raise Button default to h-12 even though Phase 4 D-08 sets a 48px tap-target floor. Per UI-SPEC §Component Inventory hint for button.tsx: 'component sites that need 48px tap targets continue to declare h-12 explicitly per Phase 4 D-08 floor' — this is a per-consumer Phase 6+ contract, not a Phase 5 default override. Default h-10 = 40px is the new internal scale."
  - "Did NOT change the Sheet `transition duration-200 ease-in-out` opener. UI-SPEC §Component Inventory hint for sheet.tsx: 'transitions use the tw-animate-css preset — duration is locked there, leave.' Only the static shadow + paper-grain + overlay class strings were edited."
  - "Did NOT change the Dialog `duration-100` value. UI-SPEC: 'transitions already use duration-100 — leave (sheet/dialog use the tw-animate-css preset under the hood)'."
  - "Used `border border-border` (not `border-border` shorthand) on Card / DialogContent / AlertDialogContent / SelectContent. Tailwind v4 semantics: `border-border` alone sets only border-color, not border-width. The plan's explicit `border border-border` form sets both width-1 + color from --border."
  - "Kept `font-heading` references in Card/Dialog/Sheet/AlertDialog Title elements unchanged (4 occurrences total: card.tsx:41, dialog.tsx:133, sheet.tsx:117, alert-dialog.tsx:126). Plan 03's `--font-heading: var(--font-display)` alias resolves them to Fraunces. Phase 6 audit task will sweep them to `font-display` — out of scope for this plan."
  - "Task 3 committed as empty commit (--allow-empty). Rationale: the GSD per-task commit protocol requires 'After each task completes, commit immediately.' Task 3's done criteria are met by inline grep verification (5 files pass acceptance criteria with no edits) — an empty commit is the appropriate way to record task completion in the git log when the task contract is verify-only."

patterns-established:
  - "Pattern: per-primitive re-theme manifest — keep className strings as the single re-theme surface; prefix paper-grain at the head of the surface class string; place shadow-card / shadow-card-hover after the bg-popover token; consolidate duration-fast ease-craft directly after transition-colors so the cascade of utilities reads left-to-right as 'property -> duration -> easing.'"
  - "Pattern: surface-primitive contract: every card-like surface declares (1) bg-popover or bg-card, (2) text-popover-foreground or text-card-foreground, (3) paper-grain, (4) shadow-card (or shadow-card-hover for elevated/floating surfaces), (5) border border-border. Five tokens inline = the entire warm-paper aesthetic without extra wrappers."
  - "Pattern: interactive-primitive contract: every focusable form/control primitive declares transition-colors duration-fast ease-craft on its base class (no transition-all). Transform effects (active:translate-y-px) snap instantly while color hovers ease — matches UI-SPEC §Motion 'one curve, two durations, sparing decorative use.'"

requirements-completed: [DESIGN-07]

duration: 5min
completed: 2026-05-08
---

# Phase 05 Plan 05: Component re-theme (15 shadcn primitives) Summary

**Re-themed 10 shadcn primitives in `frontend/components/ui/*` (Card, Dialog, Sheet, AlertDialog, Select, Button, Input, Textarea, Tabs, Badge) per UI-SPEC §Component Inventory verbatim — paper-grain on every card-like surface, warm shadows replacing cool ring-1 / shadow-lg, bg-foreground/15 overlays replacing bg-black/10, transition-colors duration-fast ease-craft on interactive primitives, raised default heights, terracotta tab indicator. Verified 5 token-driven primitives (Skeleton, Sonner, Label, ScrollArea, Separator) inherit new tokens automatically with no edits. Closes DESIGN-07.**

## Performance

- **Duration:** ~5 min
- **Tasks:** 3 (10 files modified, 5 verified)
- **Files modified:** 10 (all in `frontend/components/ui/`)
- **Files verified-only (no changes):** 5 (Skeleton, Sonner, Label, ScrollArea, Separator)

## Per-Primitive Change Log

### Task 1 — Surface primitives (paper-grain + warm shadows + warm overlays)

#### `frontend/components/ui/card.tsx` (line 15)
- **Before:** `"group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10 ..."`
- **After:** `"paper-grain group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground border border-border ..."`
- **Diff:** prefixed `paper-grain`; replaced `ring-1 ring-foreground/10` with `border border-border`.
- **CardTitle (line 41):** `font-heading` retained — alias-resolved to Fraunces via Plan 03.

#### `frontend/components/ui/dialog.tsx` (lines 42, 64)
- **DialogOverlay (line 42):** `bg-black/10` -> `bg-foreground/15` (warm overlay tone).
- **DialogContent (line 64):** prefixed `paper-grain`; replaced `ring-1 ring-foreground/10` with `shadow-card border border-border`.
- **DialogTitle (line 133):** `font-heading` retained.

#### `frontend/components/ui/sheet.tsx` (lines 40, 65)
- **SheetOverlay (line 40):** `bg-black/10` -> `bg-foreground/15`.
- **SheetContent (line 65):** prefixed `paper-grain`; replaced `shadow-lg` with `shadow-card-hover` (stronger warm shadow for floating sheet surface).
- **SheetTitle (line 117):** `font-heading` retained.

#### `frontend/components/ui/alert-dialog.tsx` (lines 39, 61)
- **AlertDialogOverlay (line 39):** `bg-black/10` -> `bg-foreground/15`.
- **AlertDialogContent (line 61):** prefixed `paper-grain`; replaced `ring-1 ring-foreground/10` with `shadow-card border border-border`.
- **AlertDialogTitle (line 126):** `font-heading` retained.

#### `frontend/components/ui/select.tsx` (lines 47, 72)
- **SelectTrigger (line 47):** `data-[size=default]:h-8` -> `data-[size=default]:h-11` (matches Input scale shift); added `duration-fast ease-craft` to existing `transition-colors`.
- **SelectContent (line 72):** prefixed `paper-grain`; replaced `shadow-md ring-1 ring-foreground/10` with `shadow-card border border-border`.

### Task 2 — Interactive primitives (motion + scale shift + terracotta indicator)

#### `frontend/components/ui/button.tsx` (lines 8, 24-25, 28)
- **cva base (line 8):** `transition-all` -> `transition-colors duration-fast ease-craft`.
- **`default` size (line 24-25):** `h-8` -> `h-10` (40px).
- **`lg` size (line 28):** `h-9` -> `h-11` (44px).
- **Other sizes (xs, sm, icon, icon-xs, icon-sm, icon-lg):** unchanged.

#### `frontend/components/ui/input.tsx` (line 11)
- **className:** `h-8` -> `h-11` (44px); `transition-colors` -> `transition-colors duration-fast ease-craft`.
- The existing `border border-input` automatically picks up the new warm-tinted `--input` from Plan 01.

#### `frontend/components/ui/textarea.tsx` (line 10)
- **className:** `transition-colors` -> `transition-colors duration-fast ease-craft`.
- `min-h-16` retained per UI-SPEC.

#### `frontend/components/ui/tabs.tsx` (lines 66, 69)
- **TabsTrigger base (line 66):** `transition-all` -> `transition-colors duration-fast ease-craft`.
- **TabsTrigger after-pseudo (line 69):** `after:bg-foreground` -> `after:bg-primary` (terracotta active indicator per UI-SPEC).

#### `frontend/components/ui/badge.tsx` (line 8)
- **cva base:** `transition-all` -> `transition-colors duration-fast ease-craft`.
- All variants already token-driven; no color changes.
- `rounded-4xl` retained per UI-SPEC.

### Task 3 — Token-driven primitives (verify only, no edits)

| File | Verified | Outcome |
|------|----------|---------|
| `frontend/components/ui/skeleton.tsx` | `bg-muted` + `animate-pulse`; no hardcoded `bg-zinc-*` / `bg-gray-*` / `bg-slate-*` | PASS — `bg-muted` resolves to warm-taupe `--muted` from Plan 01 automatically; skeletons read as fading kraft paper. |
| `frontend/components/ui/sonner.tsx` | `--normal-bg: var(--popover)`, `--normal-text: var(--popover-foreground)`, `--normal-border: var(--border)`, `--border-radius: var(--radius)`; no `paper-grain` | PASS — toast chrome correctly excluded from grain per UI-SPEC ("chrome, not card"). All four CSS variables resolve to new warm tokens. |
| `frontend/components/ui/label.tsx` | No `font-*` family override (regex check) | PASS — Label inherits `font-family: var(--font-body)` from `body` per Plan 03. |
| `frontend/components/ui/scroll-area.tsx` | ScrollAreaThumb has `bg-border` (line 49) | PASS — warm-tinted `--border` from Plan 01 resolves automatically. |
| `frontend/components/ui/separator.tsx` | Separator has `bg-border` (line 20) | PASS — warm-tinted `--border` resolves automatically. |

## Plan-Level Verification (all pass)

- `grep -rn "paper-grain" frontend/components/ui/` returns **5 hits** (Card, DialogContent, SheetContent, AlertDialogContent, SelectContent) — meets threshold.
- `grep -rn "duration-fast" frontend/components/ui/` returns **6 hits** (Button cva base, Input, Textarea, Tabs base, Badge cva base, SelectTrigger) — meets threshold.
- `grep -rn "after:bg-foreground" frontend/components/ui/tabs.tsx` returns **0 hits** — replaced by `after:bg-primary`.
- `grep -rn "bg-black/10" frontend/components/ui/` returns **0 hits** — fully replaced by `bg-foreground/15` (warm overlay).
- `grep -rn "shadow-lg" frontend/components/ui/sheet.tsx` returns **0 hits** — replaced by `shadow-card-hover`.
- `grep -rn "ring-1 ring-foreground/10" frontend/components/ui/` returns **0 hits** — replaced by `border border-border` on every surface primitive.
- `grep -F "font-heading" frontend/components/ui/{card,dialog,sheet,alert-dialog}.tsx` returns **4 hits** (one per Title element) — alias-resolved per Plan 03; Phase 6 sweep target.
- All 15 files retain `data-slot=` attributes — radix contract preserved.
- All 15 files retain their original `export { ... }` lines — no breaking renames.
- `git diff --name-only cf1ddaf..HEAD` returns exactly the 10 files listed in the plan's `files_modified` (plus none of the 5 verify-only files) — scope honored.

`cd frontend && npm run build` and `cd frontend && npm run lint` not runnable in this parallel-execution worktree (no `node_modules` symlinked); per the parallel-execution contract, build verification is owned by the orchestrator post-merge gate.

## font-heading Alias Bridge — Confirmed Holding

UI-SPEC §Typography "font-heading alias one-phase migration" requires `--font-heading: var(--font-display)` to keep four primitive Title-element references rendering through Phase 5. Verified after edits:

| File | Line | Reference |
|------|------|-----------|
| `frontend/components/ui/card.tsx` | 41 | `"font-heading text-base leading-snug font-medium ..."` |
| `frontend/components/ui/dialog.tsx` | 133 | `"font-heading text-base leading-none font-medium"` |
| `frontend/components/ui/sheet.tsx` | 117 | `"font-heading text-base font-medium text-foreground"` |
| `frontend/components/ui/alert-dialog.tsx` | 126 | `"font-heading text-base font-medium ..."` |

These four occurrences are the **complete Phase 6 alias-removal sweep target list** for the primitives directory. After Phase 6 sweeps `font-heading -> font-display` on these four lines (and any consumers in `frontend/components/` outside `ui/`), the Plan 03 alias `--font-heading: var(--font-display)` can be deleted from `globals.css @theme inline`.

## Task Commits

Each task committed atomically with `--no-verify` (parallel execution mode):

1. **Task 1: Re-theme surface primitives (Card, Dialog, Sheet, AlertDialog, Select)** — `b75a021` (feat)
2. **Task 2: Re-theme interactive primitives (Button, Input, Textarea, Tabs, Badge)** — `7152d60` (feat)
3. **Task 3: Verify token-driven primitives (Skeleton, Sonner, Label, ScrollArea, Separator)** — `076a753` (chore, empty commit per verify-only contract)

## Files Created/Modified

### Modified (10)
- `frontend/components/ui/card.tsx`
- `frontend/components/ui/dialog.tsx`
- `frontend/components/ui/sheet.tsx`
- `frontend/components/ui/alert-dialog.tsx`
- `frontend/components/ui/select.tsx`
- `frontend/components/ui/button.tsx`
- `frontend/components/ui/input.tsx`
- `frontend/components/ui/textarea.tsx`
- `frontend/components/ui/tabs.tsx`
- `frontend/components/ui/badge.tsx`

### Verified, no edits (5)
- `frontend/components/ui/skeleton.tsx`
- `frontend/components/ui/sonner.tsx`
- `frontend/components/ui/label.tsx`
- `frontend/components/ui/scroll-area.tsx`
- `frontend/components/ui/separator.tsx`

### Created (1, planning artifact)
- `.planning/phases/05-design-system-foundation/05-05-SUMMARY.md` (this file)

## Decisions Made

See frontmatter `key-decisions` field. Notable points:

- **Implemented UI-SPEC §Component Inventory verbatim** — no local deviations from the per-primitive 15-row hint table. Downstream Plan 06 (styleguide) and Phases 6-9 (screen polish) inherit these primitives unchanged.
- **5 verify-only primitives left untouched** with inline grep verification documented per UI-SPEC "no structural change" / "verify only" rows.
- **Did NOT raise Button default to h-12** despite Phase 4 D-08's 48px tap-target floor — UI-SPEC explicitly delegates 48px to per-consumer Phase 6+ overrides; the primitive default raised to h-10 (40px) per scale shift.
- **Did NOT change Sheet's `transition duration-200 ease-in-out` or Dialog's `duration-100`** — UI-SPEC explicitly says these tw-animate-css preset transitions are locked.
- **Used `border border-border` not `border-border` shorthand** — Tailwind v4 semantics: `border-border` alone sets only color; the explicit form sets width + color.
- **Task 3 committed as empty commit** — verify-only contract met by inline grep checks; empty commit records task completion in git log without modifying files.

## Deviations from Plan

None — plan executed exactly as written. All UI-SPEC §Component Inventory hints lifted verbatim; all acceptance criteria pass; scope constraint honored (only the 10 files listed in `files_modified` were modified, plus an empty commit on Task 3); no scope creep into consumers (`CookingBanner.tsx`, `RecipeCard.tsx`, etc.) which are Phases 6-9 territory.

## Auto-Fixed Issues

None — no Rule 1/2/3 deviations triggered. The plan was prescriptive enough (UI-SPEC §Component Inventory provides exact per-primitive hints) that no inline bug fixes or critical-functionality additions were required.

## Authentication Gates

None — no auth surfaces touched.

## Issues Encountered

- **Build verification not runnable in worktree:** `cd frontend && npm run build` and `cd frontend && npm run lint` fail with `sh: next: command not found` because the worktree has no `frontend/node_modules` (the main checkout's `node_modules` is not symlinked). Per the parallel-execution instructions in the spawn prompt, build/lint verification is owned by the orchestrator post-merge gate, not this agent. Manual checks (positive grep counts match thresholds; negative grep checks all return 0 hits; export lines unchanged; data-slot attributes preserved) substitute.
- **Initial worktree base mismatch:** the worktree was created at `a0db5ad309d972cb0db5fa39db68fbc48ca2e44d` but the spawn prompt specified `cf1ddaf5b2102a71d0466eca6e603acda0b959bd` as the expected base (which already includes Plans 01, 02, 03, 04). Resolved by `git reset --soft cf1ddaf` followed by `git checkout cf1ddaf -- .` to align the working tree with the expected base. Verified the five Plan 01-04 outputs are present (`oklch(0.595 0.135 35)` x3, `--ease-craft` x2, `paper-grain` x8 in globals.css; `Fraunces` in layout.tsx; `easeCraft` x3 in motion.ts) before starting any edits.

## User Setup Required

None — pure className edits on existing JSX, no external service or environment configuration needed.

## Known Stubs

None — every primitive's className edit produces immediate, fully-wired styling. No placeholders, no "coming soon" text, no empty data sources.

## Next Phase Readiness

- **Wave 4 sibling (Plan 06 styleguide route):** unblocked — every re-themed primitive is ready to render with new tokens. The styleguide page will demonstrate paper-grain on Cards/Dialogs/Sheets/AlertDialogs/Selects, terracotta active state on Tabs, ease-craft transitions on Buttons/Inputs/Textareas, warm shadows on every card-like surface.
- **Phase 6 alias-removal sweep:** unblocked — the four `font-heading` references in `card.tsx:41` / `dialog.tsx:133` / `sheet.tsx:117` / `alert-dialog.tsx:126` are the complete primitives-directory target list (plus any consumer-directory references Plan 03 left for the same sweep). After replacement, the `--font-heading: var(--font-display)` alias in `globals.css @theme inline` can be deleted.
- **Phases 6-9 (screen polish):** unblocked — every screen that consumes Card / Button / Dialog / Sheet / Input / Select / Tabs etc. automatically inherits the Slow Food artisanal identity through these re-themed primitives without per-screen work. Phase 4 D-08 48px-tap-target overrides (`h-12` on touch-critical buttons/inputs) continue to be a per-consumer concern.
- **No blockers** for any downstream plan.

## Self-Check

Verified before completion:

- **Files:**
  - `frontend/components/ui/card.tsx` — modified (paper-grain + border border-border present, ring-1 ring-foreground/10 absent).
  - `frontend/components/ui/dialog.tsx` — modified (paper-grain + bg-foreground/15 + shadow-card present, bg-black/10 absent).
  - `frontend/components/ui/sheet.tsx` — modified (paper-grain + shadow-card-hover + bg-foreground/15 present, shadow-lg absent).
  - `frontend/components/ui/alert-dialog.tsx` — modified (paper-grain + bg-foreground/15 + shadow-card present).
  - `frontend/components/ui/select.tsx` — modified (paper-grain + duration-fast ease-craft + data-[size=default]:h-11 present).
  - `frontend/components/ui/button.tsx` — modified (transition-colors duration-fast ease-craft + h-10 default + h-11 lg present, transition-all on base absent).
  - `frontend/components/ui/input.tsx` — modified (h-11 + transition-colors duration-fast ease-craft present, h-8 absent).
  - `frontend/components/ui/textarea.tsx` — modified (transition-colors duration-fast ease-craft present).
  - `frontend/components/ui/tabs.tsx` — modified (transition-colors duration-fast ease-craft + after:bg-primary present, after:bg-foreground absent).
  - `frontend/components/ui/badge.tsx` — modified (transition-colors duration-fast ease-craft present, transition-all on base absent).
  - `frontend/components/ui/skeleton.tsx` — verified, unmodified.
  - `frontend/components/ui/sonner.tsx` — verified, unmodified.
  - `frontend/components/ui/label.tsx` — verified, unmodified.
  - `frontend/components/ui/scroll-area.tsx` — verified, unmodified.
  - `frontend/components/ui/separator.tsx` — verified, unmodified.
  - `.planning/phases/05-design-system-foundation/05-05-SUMMARY.md` — created by this Write.
- **Commits:**
  - `b75a021` — FOUND in `git log cf1ddaf..HEAD` (Task 1 surface primitives).
  - `7152d60` — FOUND in `git log cf1ddaf..HEAD` (Task 2 interactive primitives).
  - `076a753` — FOUND in `git log cf1ddaf..HEAD` (Task 3 verify, empty commit).
- **Plan-level grep checks:** all pass (paper-grain count = 5, duration-fast count = 6, after:bg-foreground count = 0, bg-black/10 count = 0, shadow-lg in sheet = 0, ring-1 ring-foreground/10 count = 0).
- **Scope constraint:** `git diff --name-only cf1ddaf..HEAD` returns exactly the 10 files listed in `files_modified` — no scope creep into consumers or planner-owned files.
- **Exports preserved:** all 15 files retain their original `export { ... }` lines — no breaking renames.
- **Radix contract preserved:** all 15 files retain `data-slot="..."` attributes verified by grep.

## Self-Check: PASSED

---
*Phase: 05-design-system-foundation*
*Plan: 05*
*Completed: 2026-05-08*
