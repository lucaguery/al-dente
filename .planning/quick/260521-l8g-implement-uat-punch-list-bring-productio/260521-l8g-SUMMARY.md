---
phase: quick-260521-l8g
plan: 01
type: execute
tags: [ui, frontend, la-grille, adr-0004, uat-punch-list]
requirements_closed:
  - B-01
  - B-02
  - B-03
  - D-01
  - D-02
  - D-03
  - D-04
  - D-06
  - P-01
  - P-02
  - P-03
  - P-04
commits:
  - hash: f9c50c3
    task: 1
    type: fix
    scope: backend/seed
    landed_by: prior executor
  - hash: feb2315
    task: 2
    type: feat
    scope: frontend/library
    landed_by: continuation executor
  - hash: e2f5a5b
    task: 3
    type: fix
    scope: frontend/recipe-detail
    landed_by: continuation executor
  - hash: bdde754
    task: 4
    type: feat
    scope: frontend/accueil
    landed_by: continuation executor
  - hash: d792072
    task: 5
    type: fix
    scope: frontend/ui
    landed_by: continuation executor
metrics:
  total_tasks: 5
  completed_tasks: 5
  files_touched: 11
  base_commit: f9c50c3
---

# Quick 260521-l8g: UAT Punch-List — Bring Production to La Grille Spec — Summary

Closed all 12 actionable UAT punch-list findings from
`.planning/quick/260521-uat-living-system-cross-check/PUNCH-LIST.md` to bring
production in line with the La Grille · Soft warmth sketches (ADR-0004). Five
atomic commits — one per task, each independently revertable.

## Commits (in order)

- `f9c50c3` — `fix(seed): drop photoless photo_paths + Poulet au citron cuisine (PUNCH-LIST B-03, D-06)` (prior executor)
- `feb2315` — `feat(library): drop Patine view (ADR-0004 wave 5 cleanup; PUNCH-LIST D-01)`
- `e2f5a5b` — `fix(recipe-detail): drop terracotta margin-rule + replace dashed marginalia connector (PUNCH-LIST D-02, P-04)`
- `bdde754` — `feat(accueil): collapse member avatars to ink+muted on ledger + deck identity (ADR-0004; PUNCH-LIST D-03, D-04)`
- `d792072` — `fix(ui): safe-area parity + central CTA shadow + heart-off no-vote + Fermer dialog label (PUNCH-LIST B-01, B-02, P-01, P-02, P-03)`

## Task 1 — Backend seed fixes (D-06 + B-03)

**Status:** Landed by prior executor.
**Commit:** `f9c50c3`
**Files:** `backend/app/cli/seed.py`
**Findings closed:** B-03 (zero photo-url 404s on Bibliothèque mount), D-06 (Poulet au citron cuisine = french).

Prior executor's deviation note observed that `groupByPatina` lives in
`frontend/lib/recipes.ts` (outside the plan's `files_modified`) and chose
to leave it as an exported orphan rather than expand scope. That decision
is preserved in this continuation.

## Task 2 — Bibliothèque view cleanup (D-01)

**Status:** Landed.
**Commit:** `feb2315`
**Files touched:**

- `frontend/components/LibraryViewSwitch.tsx` — `LibraryView = "grid" | "list"`; dropped `Layers` icon import + the `patina` VIEWS entry.
- `frontend/app/recipes/page.tsx` — removed `PatinaSection` + `PatinaView` sub-components, dropped the `view === "patina"` render branch, dropped the `tPatina` hook and the `groupByPatina` import. Coerces stale `localStorage["aldente.library.view"]` reads — anything other than `"list"` defaults to `"grid"` (the single mandated MVP backcompat shim).
- `frontend/lib/i18n/fr.json` — deleted `home.library.patina_section` subtree (heritage, habitudes, essai, empty) and the `home.library.view.patina` aria leaf. Sibling keys preserved.

**Findings closed:** D-01.

**Deviations:**

- Plan's `files_modified` listed `frontend/messages/fr.json`; actual path is `frontend/lib/i18n/fr.json` (Next.js convention via `next-intl` lib import). Treated as a typo in the plan; the previous executor's note flagged this too. Documented at commit message level.
- `groupByPatina` + `cookCountToPatina` + `PatinaLevel` remain exported in `lib/recipes.ts`; `PatinaLevel` is still imported as type by `RecipeCard.tsx` (with the `_patina` prefix indicating it's intentionally unused). Per the hard constraint: left as exported orphans. Future cleanup can remove them in a follow-up if neither is reintroduced.

**Verification:**

- `npx tsc --noEmit` returns no errors in modified files (pre-existing errors in test files are out of scope per deviation rule SCOPE BOUNDARY).
- `npm run lint` passes for the cumulative changeset (verified after Task 5).

## Task 3 — Recipe detail polish (D-02 + P-04)

**Status:** Landed.
**Commit:** `e2f5a5b`
**Files touched:**

- `frontend/app/recipes/[id]/page.tsx`:
  - **D-02:** Dropped the 3px terracotta-30 `borderLeft` + 12px `paddingLeft` from the Ingrédients `<section>` (lines ~836–851 in the source). The Sober Kitchen cookbook-page margin-rule is retired per ADR-0004 — the numbered Mono indices carry enough structural pressure.
  - **P-04:** Dropped the 1px dashed-horizontal `borderTop` continuation line between non-first step rows. Inter-step separation now relies on the numbered Mono index + a 4px gap.
  - **P-04 (marginal note):** Step-1 cooking-log marginalia (the « Excellent ce soir. » note rendered conditionally on `recipeLog?.notes`) switched from `1px dotted color-mix(...primary 25%, transparent)` left border + 16px padding-left to `1px solid color-mix(in oklab, var(--foreground) 30%, transparent)` left border + 12px padding-left per `.claude/skills/sketch-findings-al-dente/references/components.md` §Data lists.

**Findings closed:** D-02, P-04.

**Deviations:** None.

**Verification:**

- `grep -n "oklch(0.54\\|border-l-\\[3px\\|border-l-3\\|borderLeft.*primary\\|dashed" frontend/app/recipes/[id]/page.tsx` returns only the PUNCH-LIST history comments referencing the dropped pattern.
- tsc clean on the file.

## Task 4 — Accueil member-color collapse (D-03 + D-04)

**Status:** Landed.
**Commit:** `bdde754`
**Files touched:**

- `frontend/components/MemberDot.tsx` — new `variant?: "slot" | "accueil-collapse"` + `position?: "first" | "second"` props. Default `slot` variant unchanged; `accueil-collapse` maps `position="first"` → `var(--foreground)` ink and `position="second"` → `var(--muted-foreground)` muted, both with `var(--background)` foreground glyph color.
- `frontend/components/TableVote.tsx` — new `variant?: "slot" | "accueil-collapse"` prop (alongside existing `size`). When `accueil-collapse`, seat 0 (`me`) renders `var(--foreground)` ink and seat 1 (partner) renders `var(--muted-foreground)` muted; productize-later seats 2/3 fall back to the 5-slot palette. The L/P initial glyphs are preserved (rendered via `memberInitial(member)`).
- `frontend/components/VoteSummary.tsx` — the per-row `<TableVote>` instance now passes `variant="accueil-collapse"` so the Accueil ledger rows render ink+muted seats. Default `variant="slot"` is preserved everywhere else (Settings, cooking-log history, the swipe-deck table scene — none of which were touched).
- `frontend/components/ShortlistCard.tsx` — the pre-vote deck identity dot (`partnerVote === "yes"` branch around line 461) now passes `variant="accueil-collapse" position="first"` to `<MemberDot>` so it renders `var(--foreground)` ink (D-04). The "no" and "unvoted" sub-states are unchanged (they already used neutral tokens).

**Findings closed:** D-03, D-04.

**Deviations:**

- The plan listed `files_modified: HomeDecide.tsx, ShortlistCard.tsx, ShortlistDeck.tsx, MemberDot.tsx` but the canonical render path for ledger row avatars is `VoteSummary.tsx → TableVote.tsx` (the table-à-manger primitive), and neither was listed. Per the plan's escape clause ("do the equivalent inline-style override at that call site"), and per Rule 3 (auto-fix blocking issues — the must_have can't be delivered otherwise), `TableVote.tsx` and `VoteSummary.tsx` were also touched. Documented in the commit message.
- `HomeDecide.tsx` and `ShortlistDeck.tsx` (both in `files_modified`) did not need direct edits: HomeDecide's ledger composition flows through VoteSummary (which now passes the variant), and ShortlistDeck composes ShortlistCard (already updated). HomeDecide's "main padding parity" must_have artifact is Task 5's B-01 territory and was solved via `app/layout.tsx` (see Task 5).

**Verification:**

- tsc clean on all 4 modified files.
- The default `variant="slot"` codepath is unchanged on all non-Accueil surfaces.

## Task 5 — Safe-area + BottomNav + dialog polish (B-01 + B-02 + P-01 + P-02 + P-03)

**Status:** Landed.
**Commit:** `d792072`
**Files touched:**

- `frontend/app/layout.tsx` — shared `<main>` pb bumped from `pb-[calc(5rem+env(safe-area-inset-bottom))]` to `pb-[calc(5rem+0.75rem+env(safe-area-inset-bottom))]`. Adds 12px clearance for the central « + » `-translate-y-3` nub on top of the existing 80px nav band + device safe-area. Single edit covers Accueil deck + Accueil ledger + /recipes Liste, closing **B-01 and B-02 together**.
- `frontend/components/BottomNav.tsx` — central « + » span gains `shadow-[0px_8px_24px_-8px_rgba(20,17,13,0.18)]`. Elevation grammar is now translate + soft drop-shadow per ADR-0004 §Shadows (the deck card is the canonical shadow exception; the central CTA shares the "above the surface" metaphor and is allowed the same shadow). The active-state terracotta ring is preserved as a separate affordance. **P-02.**
- `frontend/components/ShortlistCard.tsx` — `ShortlistThumbButtons` "no" button switches from `<Heart>` to `<HeartOff>` (slashed-heart glyph). Binary affordance now reads unambiguously instead of two-identical-hearts. Aria-label unchanged. **P-03.**
- `frontend/components/ui/dialog.tsx` — `DialogContent` close button gains `aria-label="Fermer"` and the `sr-only` text changes from « Close » to « Fermer ». `DialogFooter`'s `showCloseButton` outline-Button copy also flips « Close » → « Fermer ». Inline literal (not via `useTranslations`) to keep the shadcn primitive server-component-safe; matches the existing `common.close = "Fermer"` key in fr.json. **P-01.**

**Findings closed:** B-01, B-02, P-01, P-02, P-03.

**Deviations:**

- The plan's `files_modified` for Task 5 listed `frontend/components/HomeDecide.tsx` and `frontend/components/RecipeThread/Composer.tsx` but neither needed edits. The safe-area pb fix's correct scope is the shared layout per the plan's own "do NOT duplicate per-page" rule — adding `frontend/app/layout.tsx` is the minimal correct edit. HomeDecide.tsx ledger branch + Composer.tsx capture sheet both inherit the new clearance through the shared `<main>`.
- `frontend/app/layout.tsx` is therefore added to the de-facto files_modified for this task. Documented in commit message.
- The Radix Dialog primitive change in `ui/dialog.tsx` propagates to both Capture sheet and URL-paste dialog consumers without per-consumer overrides (Radix lets the primitive own the close button copy).

**Verification:**

- tsc clean on all 4 modified files.
- `npm run lint` (full ESLint on the whole frontend tree, per hard constraint #10) passes after the cumulative Task 2–5 changeset — no warnings, no errors.

## Cumulative Verification

- `git log --oneline f9c50c3^..HEAD` lists exactly 5 commits, one per task, in declared order. Each commit hash matches `git rev-parse HEAD` at the moment of landing (no phantom hashes — verified after every commit per the prior-incident-prevention hard constraint).
- `npm run lint` exits 0 with no output for warnings or errors on the cumulative Task 2–5 changeset.
- `npx tsc --noEmit` errors are limited to pre-existing test-file issues (`tests/e2e/recipe-detail.spec.ts`, `tests/e2e/recipes-promote.spec.ts`, etc.) that are unrelated to this changeset. SCOPE BOUNDARY rule applies — logged in Deferred Issues below.

## Deferred Issues (Out of Scope)

These pre-existing issues surfaced in `npx tsc --noEmit` but were NOT touched
by this quick task. SCOPE BOUNDARY rule: do not auto-fix issues outside the
current task's direct changes. Surface them here for a future quick or phase.

- `frontend/tests/e2e/recipe-detail.spec.ts` — `TestDetails` constraint mismatch on Playwright `test.extend`. Pre-existing.
- `frontend/tests/e2e/recipes-promote.spec.ts` (~10 instances) — readonly fixture arrays not assignable to mutable `Recipe` shape. Pre-existing fixture typing drift.

## Notes for Future Walkers

- `groupByPatina`, `cookCountToPatina`, and `PatinaLevel` remain exported in
  `frontend/lib/recipes.ts`. Only `PatinaLevel` is still imported (as type,
  unused, by `RecipeCard.tsx` via the `_patina` prefix). A future cleanup
  can remove all three if no consumer reintroduces them — but per MVP no-
  backcompat scope-discipline, this quick task chose to leave them rather
  than expand outside `files_modified`.
- The `MemberDot` + `TableVote` `variant="accueil-collapse"` codepath is the
  forward-consistent escape hatch for the ADR-0004 §Member colors collapse.
  When the 3+ member household productize-later milestone lands, expanding
  the variant to handle seats 2/3 with distinct slot tokens is straightforward
  (the `else` branches in both files already fall back to the existing
  `--color-member-{slot}` palette).
- `frontend/app/layout.tsx` is now the single source of truth for bottom
  safe-area + nav-clearance + CTA-nub padding. Any future bottom-elevation
  change (e.g. raising the CTA from 12px to 16px) should bump the `0.75rem`
  literal in that one file, not per-page.

## Self-Check: PASSED

- All 5 commit hashes verified via `git log --oneline` and `git rev-parse HEAD` immediately after each commit.
- All 12 in-scope findings (B-01, B-02, B-03, D-01, D-02, D-03, D-04, D-06, P-01, P-02, P-03, P-04) closed in the commits listed above.
- `npm run lint` exit code 0 on the final cumulative changeset.
- Per the prior-incident-prevention constraint (Executor phantom commit): every commit hash above is the actual git SHA returned by `git rev-parse HEAD` at landing — not fabricated.
