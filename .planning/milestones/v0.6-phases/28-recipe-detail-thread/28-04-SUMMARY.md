---
phase: 28
plan: 04
subsystem: frontend
requirements: [DETAIL-04, DETAIL-05]
tags: [pin-marginalia, recipe-detail, edit-form, playwright, caveat]
dependency_graph:
  requires: [28-01, 28-02, 28-03]
  provides: [pin-visibility-detail-page, pin-visibility-edit-form, e2e-pin-specs]
  affects: [frontend/app/recipes/[id]/page.tsx, frontend/components/RecipeForm.tsx, frontend/app/recipes/[id]/edit/page.tsx, frontend/tests/e2e/recipe-detail.spec.ts]
tech_stack:
  added: []
  patterns: [gutter-absolute-pin, inline-label-pin, open-advisory-memo, data-advisory-id-scroll]
key_files:
  created: []
  modified:
    - frontend/app/recipes/[id]/page.tsx
    - frontend/components/RecipeThread/SystemBubble.tsx
    - frontend/components/RecipeForm.tsx
    - frontend/app/recipes/[id]/edit/page.tsx
    - frontend/tests/e2e/recipe-detail.spec.ts
decisions:
  - "prep_servings section PinLabel wraps the metaSpan inline span (not a standalone h2) since prep/servings renders as a muted text span inside the metadata pill row, not as a separate section header"
  - "edit page stores manuallyEditedFields as separate useState rather than re-reading from initial form values to keep the pin set stable after form value edits"
metrics:
  duration: "5 minutes"
  completed: "2026-05-17T12:21:00Z"
  tasks_completed: 3
  files_modified: 5
---

# Phase 28 Plan 04: Pin Marginalia Mount — Detail Page + Edit Form Summary

**One-liner:** Section-level « épinglé »/« conflit » Caveat gutter pins on `/recipes/[id]` and per-input inline pins on `/recipes/[id]/edit` form, with Playwright e2e specs locking the behavior.

## What Was Built

### Task 1: Detail page section-level PinLabel + scroll-to-advisory (commit `a632994`)

**Sections that received PinLabel mounts:**
| Section | `renderSectionPin` call | DOM element wrapped |
|---------|------------------------|---------------------|
| `title` (photo hero) | `renderSectionPin("title")` | `<div className="relative overflow-visible">` wrapping `<h1>` inside photo overlay |
| `title` (no-photo Card) | `renderSectionPin("title")` | `<div className="relative overflow-visible">` wrapping `<h1>` inside Card |
| `metadata` | `renderSectionPin("metadata")` | Pill row `<div>` gets `relative overflow-visible` added; PinLabel is first child |
| `prep_servings` | `renderSectionPin("prep_servings")` | `<span className="relative overflow-visible ...">` wrapping the metaSpan text |
| `ingredients` | `renderSectionPin("ingredients")` | `<div className="relative overflow-visible">` wrapping `<h2>` |
| `steps` | `renderSectionPin("steps")` | `<div className="relative overflow-visible">` wrapping `<h2>` |

**Sections deferred per D-05** (no current render site on detail page): `description`, `seasonality`, `tags`

**Open-advisory memo:** `openAdvisoryByField` — `Map<AnswerField, advisoryTurnId>` built from `turns[]` by identifying unresolved advisory turns (no later `proposal_accepted`/`proposal_dismissed` referencing them).

**Scroll mechanism:** `scrollToAdvisory(advisoryTurnId)` uses `document.querySelector('[data-advisory-id="..."]')` — no prop-drilling through RecipeThread. `data-advisory-id={turn.id}` added to BOTH advisory branches in `SystemBubble.tsx` (open advisory div + collapsed resolution div).

**CSS gutter positioning** (UI-SPEC §Spacing locked): `position: absolute; left: -4px; transform: translateX(-100%); top: 2px`

### Task 2: RecipeForm per-input PinLabel + edit page wiring (commit `96ac3db`)

**RecipeForm changes:**
- New prop: `manuallyEditedFields?: string[]`
- `pinSet = manuallyEditedFields ?? []`
- `renderInlinePin(field: AnswerField)` helper — renders `<PinLabel field={field} hasConflict={false} gutter={false} />` when field is in pinSet

**11 AnswerField labels wrapped with flex row + `renderInlinePin`:**
`title`, `description`, `ingredients`, `steps`, `prep_time_minutes`, `cook_time_minutes`, `difficulty`, `servings`, `cuisine`, `mood`, `main_protein`

**Excluded per CONTEXT.md D-04** (no marginalia ever): `seasonality`, `tags`

**Edit form invariant:** `hasConflict={false}` is HARDCODED in `renderInlinePin` — the edit form never fetches turns, so conflit escalation is detail-page-only per UI-SPEC §Layout §2.

**Edit page (`/recipes/[id]/edit/page.tsx`):** Added `manuallyEditedFields` state, populated from `r.manually_edited_fields ?? []` after GET, passed as prop to `<RecipeForm manuallyEditedFields={manuallyEditedFields} />`.

### Task 3: Playwright e2e specs (commit `fa6ebf2`)

**5 active specs + 1 skipped:**

| # | Description | Status |
|---|-------------|--------|
| 1 | « épinglé » appears on detail page after PUT diff-pin (cuisine) | Active |
| 2 | « épinglé » appears on edit form after PUT diff-pin | Active |
| 3 | Seasonality + tags labels never render épinglé per D-04 | Active |
| 4 | Same-value PUT does not pin (API-level assertion for description) | Active |
| 5 | Clearing mood to [] unpins the field | Active |
| 6 | « conflit » escalation (Phase 29 LLM-02 dependency) | **Skipped** |

**Note for Phase 29:** Unskip spec 6 when LLM-02 ships advisory emission — the frontend infrastructure (`openAdvisoryByField`, `scrollToAdvisory`, `data-advisory-id`) is fully wired.

## Decisions Made

1. **`prep_servings` mount point:** The plan described wrapping the `metaSpan` inline span rather than a standalone `<h2>` because prep/servings metadata renders as a muted text fragment inside the metadata pill row, not as a separate section header. This correctly implements D-05 — "surface when render site exists."

2. **Edit page stores `manuallyEditedFields` as separate `useState`:** This keeps the pin set stable after the user edits form field values (the `initial` form values are converted by `recipeToFormValues` and don't track pins). The pin set is read once from the API response and is not mutated by form edits.

3. **`document.querySelector` for advisory scroll target:** No prop-drilling through `RecipeThread` — the `data-advisory-id` attribute on `SystemBubble` is the scroll anchor. Threat T-28-09 accepted per plan (attacker with DevTools already has full client control; handler only calls `scrollIntoView`, no state mutation).

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

None — no new trust boundaries introduced beyond those described in the plan's threat model (T-28-09, T-28-10, T-28-11 all covered in plan).

## Self-Check: PASSED

All files verified:
- FOUND: `frontend/app/recipes/[id]/page.tsx`
- FOUND: `frontend/components/RecipeThread/SystemBubble.tsx`
- FOUND: `frontend/components/RecipeForm.tsx`
- FOUND: `frontend/app/recipes/[id]/edit/page.tsx`
- FOUND: `frontend/tests/e2e/recipe-detail.spec.ts`
- FOUND: `.planning/phases/28-recipe-detail-thread/28-04-SUMMARY.md`

All commits verified:
- `a632994` feat(28-04): detail page PinLabel + scroll-to-advisory
- `96ac3db` feat(28-04): RecipeForm per-input PinLabel + edit page wiring
- `fa6ebf2` test(28-04): Playwright e2e specs
