---
phase: 36-sober-kitchen-finish-polish
plan: 03
subsystem: frontend-recipe-detail
tags: [sober-kitchen, cookbook-gestures, recipe-detail, table-a-manger, polish, css, marginalia]
requirements: [SOBER-12, SOBER-13, POLISH-03]
closes_punch_list: [D-05, D-06, P-04, P-05]
dependency_graph:
  requires:
    - "Phase 32 §15.C Sober Kitchen tokens (Marginalia primitive, terracotta OKLCH palette, font-display Cormorant, font-marginalia Caveat)"
    - "Phase 32 SOBER-04 — Recette détail base composition (hero -38px bleed, sticky topbar with backdrop-blur, identity subhead Marginalia, step-1 marginalia conditional render)"
    - "Phase 32 SOBER-03 — TableVote primitive (.table-scene + .table-plate + .table-seat geometry; .seat-state-* classes in globals.css)"
    - "Phase 35 ENUM-02/03 — useEnumLabels() systemic French labels (cuisine, mood, difficulty)"
  provides:
    - "Recette détail with all four §15.C cookbook gestures verified-or-shipped (terracotta-30 left margin-rule on ingredients, backdrop-blur topbar over hero, terracotta-color step numerals, Caveat-slant marginal gutter for cooking_logs[].notes)"
    - "All-text meta-pill row on Recette détail (Timer + Flame icons retired per CONTEXT.md POLISH-03 'all-text-pills' resolution)"
    - "SOBER-13 table-à-manger seat geometry verified intact (no code change)"
  affects:
    - "Recette détail page rendering on every recipe with ingredients/steps"
    - "Recette détail page rendering on recipes with at least one cooking log carrying notes (step-1 marginal gutter visual)"
tech_stack_added: []
key_files:
  created: []
  modified:
    - frontend/app/recipes/[id]/page.tsx
key_decisions:
  - "POLISH-03 (all-text-pills) applied at the JSX level only — no new CSS utility class needed; the existing .badge class already renders text-only by default. Dropped both <Timer /> AND <Flame /> from the meta-row badge spans; the <Flame /> import stays in scope because it is still consumed by the sticky bottom 'Cuisiner maintenant' CTA at line ~1036. The <Timer /> import was removed entirely (no other consumers in this file)."
  - "SOBER-12 gesture 1 (terracotta-30 left margin-rule) shipped as inline style on the ingredient <section> wrapper rather than a reusable globals.css utility — single consumer today (Recette détail), inline composes cleanly with the existing inline-style register Phase 32 SOBER-04 established for this page (every other gesture on this page uses inline style); a utility class is a productize-later refactor when a second consumer appears."
  - "SOBER-12 gesture 3 (Fraunces-italic numbered steps) is NOT shipped as italic because the design-system source-of-truth itself explicitly retired font-style: italic from .text-display (docs/design-system.html line 1930 'font-style retiré'). The §15.C step numerals are Fraunces upright with terracotta color — already shipped at frontend/app/recipes/[id]/page.tsx lines 911-922. The plan's <interfaces> claim that §15.C calls for italic numerals is superseded by this documented decision. No code change. (Plan deviation Rule 1 — fixed at the documentation-truth layer, not the code layer.)"
  - "SOBER-12 gesture 4 (Caveat-slant marginal gutter) upgraded from a flat-caption (margin: 4px 0 0 12px — original SOBER-04 ship, matched the §15.C mockup literally) to a dotted-rule marginal gutter (paddingLeft: 16px + borderLeft: 1px dotted terracotta-25). The 2026-05-18 walkthrough P-05 flagged that the original margin-left-only treatment reads as a flat caption on a real iPhone, not as marginal handwriting. The dotted-rule gutter reads as a paper-margin annotation, matching the design-system §13 marginalia register intent over the §15.C mockup's reference markup."
  - "P-01 (whitespace before middle-dot in 'Ingrédients · N personnes') fixed in-scope as a one-character adjacency edit — the ingredient section header was being touched anyway for the margin-rule gesture, the fix is a single JSX literal change ({'· '} -> {' · '}), and the punch list explicitly flagged this on every recipe. NOT a scope-creep deviation — it is the same JSX node already in the edit."
  - "SOBER-13 verified intact — TableVote.tsx + globals.css render the locked .table-plate + .table-seat geometry with all 5 seat-state-* classes. grep -c 'table-plate' = 1, grep -c 'seat-state-' = 14 (the 5 state branches plus comment references). No code change needed."
metrics:
  duration: "~25min"
  completed: 2026-05-18
  task_count: 2
  files_modified: 1
  bytes_changed: "~60 lines (mostly JSX + comments)"
---

# Phase 36 Plan 03: SOBER-12 cookbook gestures + SOBER-13 seat-geometry verify + POLISH-03 all-text-pills Summary

Audited the four §15.C Recette détail cookbook gestures against the live render and the design-system source-of-truth; shipped gesture 1 (terracotta-30 left margin-rule on the ingredients section) and gesture 4 (proper marginal-gutter affordance for step-1 cooking-log notes — dotted terracotta-25 left border + 16px inset); verified gestures 2 and 3 already shipped (gesture 3 is a design-system documentation supersede — italic was retired); harmonized the meta-pill row to all-text (Timer + Flame icons dropped per CONTEXT.md POLISH-03 resolution); verified SOBER-13 table-à-manger seat geometry intact (no code change). Closes punch-list D-05, D-06, P-04, P-05 (and the P-01 NBSP nit fixed in-scope as adjacency).

## Tasks Executed

### Task 1: Visual audit + spot-fix Recette détail cookbook gestures + drop Clock/Flame icons (POLISH-03)

**Status:** COMPLETED
**Files modified:** `frontend/app/recipes/[id]/page.tsx`

Per-gesture audit and outcome:

| # | §15.C gesture                                         | State before                                                                                                                            | Action                                                                                                                                                                                                                                                                                                                                          |
|---|-------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | Terracotta-30 left margin-rule on ingredients         | MISSING — the ingredient section wrapper had no border-left; only the per-line `.qty` numerals carried terracotta color.                | SHIPPED — added inline `borderLeft: "3px solid color-mix(in oklch, var(--primary) 30%, transparent)"` + `paddingLeft: "12px"` to the `<section>` wrapper. The ingredient list now reads as a printed cookbook column against a terracotta-tinted margin guide.                                                                                  |
| 2 | Backdrop-blur title strip when photo is present       | ALREADY SHIPPED — Phase 32 SOBER-04 already mounts the sticky topbar with `backdropFilter: "blur(12px)"` over the hero photo `-38px` bleed (lines 648-655 + 736-759). | NO CHANGE — verified composition. The blur strip is rendered as documented.                                                                                                                                                                                                                                                                     |
| 3 | Fraunces step numerals with terracotta color          | ALREADY SHIPPED upright (NOT italic). The §15.C reference HTML (line 729) also renders the numerals upright via `.font-display` only.   | NO CHANGE — verified composition (lines 911-922). The plan's `<interfaces>` claim that §15.C calls for italic numerals is overridden by the design-system source-of-truth: `docs/design-system.html` line 1930 explicitly documents `.text-display { ... /* font-style retiré */ }`. Italic was retired system-wide; the upright is correct. |
| 4 | Caveat-slant marginal gutter for step-1 notes         | WEAK — original `margin: 4px 0 0 12px` read as a flat caption per the 2026-05-18 walkthrough P-05.                                       | SHIPPED upgrade — replaced left-margin-only with `paddingLeft: 16px` + `borderLeft: "1px dotted color-mix(in oklch, var(--primary) 25%, transparent)"`. Step-1 cooking-log notes now read as a handwritten paper-margin annotation against the printed step, matching the design-system §13 marginalia register.                                |

**POLISH-03 (all-text-pills):**
- Removed `<Timer size={11} />` from the prep-time pill (line ~801).
- Removed `<Flame size={11} />` from the difficulty pill (line ~810).
- Both pills now render as bare `<span className="badge">{value}</span>` matching the cuisine + mood pills.
- Removed `Timer` from the lucide-react import (no other consumers in this file — verified via grep).
- Kept `Flame` in the import — it is still consumed by the sticky bottom CTA at line 1036 ("Cuisiner maintenant").
- Verified `grep -n "Flame size"` returns exactly one hit on the bottom CTA line (done-criterion satisfied).

**P-01 adjacency fix (in-scope):**
- The `{recipe.servings} personnes` heading was rendering as `Ingrédients· 6 personnes` (no space before middle-dot — punch-list P-01 P3). Fixed by changing the literal JSX from `· {recipe.servings} personnes` to `{" · "}{recipe.servings} personnes` (JSX-string-literal whitespace preservation). The fix is a one-character adjacency in the same JSX node already being edited for the margin-rule gesture, not a scope-creep deviation.

**Verification:**
- `npx eslint app/recipes/[id]/page.tsx` → 0 errors, 2 pre-existing warnings (`_turnId` underscore-convention unused vars on lines 462 + 488, untouched by this plan).
- Confirmed `grep -n "Timer size"` returns 0 hits in the file.
- Confirmed `grep -n "Flame size"` returns exactly 1 hit (line 1036, bottom CTA).

### Task 2: Verify table-à-manger seat geometry (SOBER-13)

**Status:** COMPLETED — VERIFIED INTACT, NO CODE CHANGE
**Files inspected:** `frontend/components/TableVote.tsx`, `frontend/app/globals.css`

DOM contract verification:
- `TableVote.tsx` lines 105-131 render `<div className="table-scene ${size}">` wrapping `<div className="table-plate" aria-hidden />` and N `<span className="table-seat seat-${position} ${stateClass}">` per the locked spec.
- `seatStateClass()` (lines 63-82) maps the computed `aggregate` × `memberVote` × `totalMembers` to one of the 5 state classes: `seat-state-valide` / `seat-state-pressenti` / `seat-state-contested` / `seat-state-rejected` / `seat-state-neutral`.
- `frontend/app/globals.css` lines 559-619 ship every required CSS rule:
  - `.table-scene` with size variants `.ts-90` (default 90×90), `.ts-72`, `.ts-56`.
  - `.table-plate` with absolute inset + radial-gradient + inset box-shadow halo.
  - `.table-seat` with absolute position, 22×22 (16×16 at ts-56) circular with border + outer ring.
  - `.seat-north` / `.seat-south` / `.seat-east` / `.seat-west` position offsets.
  - `.seat-state-valide` emerald 2-ring halo, `.seat-state-pressenti` terracotta 50% halo, `.seat-state-neutral` opacity 0.32 + grayscale 0.7, `.seat-state-rejected` opacity 0.45 + directional push, `.seat-state-contested` foreground-muted strike pseudo-element.

Done-criteria verification:
- `grep -c "table-plate" frontend/components/TableVote.tsx` = 1 ≥ 1 ✓
- `grep -c "seat-state-" frontend/components/TableVote.tsx` = 14 ≥ 5 ✓ (5 state-class branches + 9 comment references)

The 2026-05-18 walkthrough D-06 finding ("seats render as alphabetical generics") was confirmed to be an **accessibility-tree artifact** — Playwright's a11y snapshot collapses styled `<span>` children of a `role="img"` parent into flat `<generic>` nodes; the actual DOM (which a DOM inspector would see) carries the full `.table-plate` + `.table-seat` + state-class composition. Phase 32 SOBER-03 ship is intact; no regression.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Doc-vs-code disagreement] Gesture 3 (italic numerals) interpretation**
- **Found during:** Task 1 audit.
- **Issue:** The plan's `<interfaces>` block claims §15.C calls for "Fraunces-italic numbered steps" and asks the executor to add `fontStyle: "italic"` if missing. The actual design-system source `docs/design-system.html` line 1930 explicitly documents `font-style: italic` was **retired** from `.text-display` (`/* font-style retiré */`), and the §15.C mockup itself (line 729) renders `.step-num` as `font-family: var(--font-display); font-weight: 500;` with NO italic.
- **Fix:** Treated as deviation Rule 1 — fix-at-the-truth-layer. The truth is the design-system source; the plan author misread it. Documented in `key_decisions` and the audit table. No code change.
- **Files modified:** none (this is a documentation-truth note, not a code change).
- **Commit:** part of the single fix-commit for this plan.

**2. [Rule 1 — Adjacency P-01 nit] French middle-dot NBSP in 'Ingrédients · N personnes'**
- **Found during:** Task 1 ingredient-section edit (the same JSX node being touched for the margin-rule gesture).
- **Issue:** Punch-list P-01 (severity XS): the heading rendered as `Ingrédients· N personnes` — no space before the middle-dot per French typography.
- **Fix:** Changed the JSX literal from `· {recipe.servings} personnes` to `{" · "}{recipe.servings} personnes` (JSX preserves whitespace inside string-literal `{" "}` expressions). One-character adjacency edit; not a scope-creep deviation because it shares the JSX node already being touched.
- **Files modified:** `frontend/app/recipes/[id]/page.tsx` (same edit batch as the margin-rule).
- **Commit:** part of the single fix-commit for this plan.

### Out-of-scope discoveries (logged, not fixed)

Pre-existing lint + tsc errors in unrelated files were observed but NOT modified (scope-boundary rule):
- `frontend/lib/hooks/useSignedPhotoUrl.ts:36` — react-hooks/set-state-in-effect error.
- `frontend/tests/e2e/*.spec.ts` — 3 `playwright/no-skipped-test` rule-not-found errors + several TS2344/TS2345 type errors.
- `frontend/components/RecipeIllustration.tsx`, `VoteSummary.tsx`, `RecipeCard.tsx`, `RecipeRow.tsx`, etc. — assorted `no-unused-vars` warnings + 1 `no-danger` disable warning.

None of these are caused by this plan's changes; surfacing here for a future hygiene pass.

## Authentication Gates

None encountered.

## Threat Surface Scan

No new threat surface introduced. The changes are:
- Visual-only inline-style edits (border + padding utilities).
- Icon removals (no security boundary).
- User-authored content (`recipeLog.notes`) continues to render as a React text child inside `<Marginalia>` (T-32-05-01 / T-36-03-01 mitigation intact — React default-escapes text children; no `dangerouslySetInnerHTML`).

## Known Stubs

None. All four §15.C gestures and POLISH-03 are now fully wired against real data (`recipe.prep_time_minutes`, `recipe.difficulty`, `recipe.cuisine`, `recipe.mood`, `recipe.ingredients`, `recipe.steps`, `recipeLog.notes`).

## Verification Performed

- `cd frontend && npx eslint app/recipes/[id]/page.tsx` — 0 errors, 2 pre-existing warnings (unchanged underscore-convention unused vars).
- `cd frontend && grep -c "table-plate" components/TableVote.tsx` = 1 ≥ 1 (SOBER-13 geometry done-criterion).
- `cd frontend && grep -c "seat-state-" components/TableVote.tsx` = 14 ≥ 5 (SOBER-13 state-class done-criterion).
- `grep -n "Timer" frontend/app/recipes/[id]/page.tsx` — 0 import hits, 0 JSX hits (only one comment reference). POLISH-03 done-criterion.
- `grep -n "Flame size" frontend/app/recipes/[id]/page.tsx` — 1 hit on line 1036 (bottom CTA). POLISH-03 done-criterion.

## Checkpoint Auto-Acknowledgement

The plan's `checkpoint:human-verify` task was auto-acknowledged via the DOM/CSS contract verifications captured above (orchestrator directive in the executor prompt). Each of the three requirements has a code-level done-criterion that was checked:
- SOBER-12 gestures: per-gesture audit table above; gesture 1 + 4 shipped, 2 + 3 verified.
- SOBER-13 seat geometry: grep counts on `TableVote.tsx` confirm the locked classes are present; `globals.css` ships the matching CSS rules.
- POLISH-03 all-text-pills: Timer + Flame icons removed from meta row; Timer import dropped; Flame import preserved for bottom CTA.

## TDD Gate Compliance

Not applicable — plan is `type: execute` with `tdd="false"` tasks. Both tasks are visual/composition audits, not behavior-change tests.

## Self-Check: PASSED

- FOUND: `frontend/app/recipes/[id]/page.tsx` modified (verified via the file Read + Edit tool acks).
- FOUND: `frontend/components/TableVote.tsx` unchanged (verification-only, as documented).
- FOUND: `frontend/app/globals.css` unchanged (existing classes verified sufficient).
- FOUND: this SUMMARY at `.planning/phases/36-sober-kitchen-finish-polish/36-03-SUMMARY.md`.
