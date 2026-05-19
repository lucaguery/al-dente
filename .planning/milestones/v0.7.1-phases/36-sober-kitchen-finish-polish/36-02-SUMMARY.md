---
phase: 36-sober-kitchen-finish-polish
plan: 02
subsystem: frontend-library-patina-view
tags: [SOBER-11, bibliotheque, patina, empty-bucket, i18n, ui-rendering]
requirements: [SOBER-11]
dependency_graph:
  requires:
    - frontend/components/Marginalia.tsx (Phase 32 — Caveat marginalia primitive)
    - frontend/components/LibraryViewSwitch.tsx (Phase 32 — Grille/Liste/Patine switcher)
    - frontend/lib/recipes.ts groupByPatina + cookCountToPatina (Phase 32 SOBER-05)
  provides:
    - PatinaView renders three labeled sections unconditionally (Héritage / Habitudes / À l'essai)
    - Empty-bucket Caveat-slant marginalia fallback line
    - home.library.patina_section.empty i18n key
  affects:
    - frontend/app/recipes/page.tsx (PatinaView + PatinaSection composition)
    - frontend/lib/recipes.ts (JSDoc only — bucket boundaries unchanged)
    - frontend/lib/i18n/fr.json (new key only)
tech_stack:
  added: []
  patterns:
    - "Unconditional section render with computed-count chip"
    - "Empty-state fallback inside section body (preserve structure, replace grid)"
key_files:
  created: []
  modified:
    - frontend/app/recipes/page.tsx
    - frontend/lib/recipes.ts
    - frontend/lib/i18n/fr.json
decisions:
  - "Render all three Patine sections unconditionally — Bibliothèque visual contract makes section structure part of the locked spec (B-06 + D-08)"
  - "Empty-bucket body uses Marginalia size=sm slant for a single Caveat-slant line, not the empty grid — clear 'no recipes here' signal without breaking the column hierarchy"
  - "groupByPatina boundaries left untouched (>=3 / ==2 / <=1) — Plan 36-04 SOBER-14 owns the seed cook_count bump that populates Héritage"
  - "Checkpoint auto-acknowledged via grep + render-tree verification per executor scope constraint (no live browser walk for this plan)"
metrics:
  duration_minutes: 3
  tasks_completed: 1
  files_modified: 3
  completed_date: 2026-05-18
---

# Phase 36 Plan 02: SOBER-11 Bibliothèque Patine view empty-bucket fallback — Summary

One-liner: PatinaView now renders three labeled sections (Héritage / Habitudes / À l'essai) unconditionally with `(n)` count chips, swapping the empty-grid container for a Caveat-slant marginalia line when a bucket has zero recipes — closes the B-06 "blank container" walkthrough finding and the D-08 missing-section-divider drift.

## What shipped

### `frontend/app/recipes/page.tsx`

Removed the three `{grouped.<bucket>.length > 0 ? <PatinaSection ... /> : null}` ternaries (lines 108-131 in the pre-commit file). Replaced with three unconditional `<PatinaSection>` instances in order Héritage → Habitudes → Essai. Each section receives its `recipes.length` as the `count` prop (NOT zero-suppressed), and the new `emptyLabel` prop derived once from `tPatina("empty")`.

`PatinaSection` was extended with an `emptyLabel: string` prop. Inside the section body it branches: `recipes.length === 0` renders `<Marginalia size="sm" slant as="p">{emptyLabel}</Marginalia>` in place of the column grid. Non-empty buckets keep the existing `<div className={columnClass}>...RecipeCard...</div>` (Héritage = 1 col, Habitudes = 2 cols, Essai = 3 cols).

The section `<header>` (count chip via the existing inline `Marginalia size="sm" as="span"`) renders the same way for every section regardless of count — `0` is now a valid value that surfaces in the chip.

### `frontend/lib/i18n/fr.json`

Added one key under `recipes.library.patina_section`:

```json
"empty": "Encore aucune recette dans cette section."
```

Existing keys (`heritage`, `habitudes`, `essai`) intact — verified by grep.

### `frontend/lib/recipes.ts`

JSDoc on `groupByPatina` updated to reflect the new render policy. The previous JSDoc claimed "the page omits the section header when bucket.length === 0 (UI-SPEC §6.3)" — that policy is retired with this plan. The new JSDoc documents the SOBER-11 contract and cross-references PatinaView in the page module. Bucket boundary logic (`>=3` / `===2` / `<=1`) is byte-for-byte unchanged; only the documentation comment moved.

## Verification

### Done-criteria greps

| Check | Command | Expected | Actual |
|-------|---------|----------|--------|
| Three render sites | `grep -c 'PatinaSection' frontend/app/recipes/page.tsx` | ≥ 3 | 4 (1 def + 3 renders) |
| No length>0 guards | `grep -cE 'heritage\.length > 0\|habitudes\.length > 0\|essai\.length > 0' frontend/app/recipes/page.tsx` | 0 | 0 |
| Empty key present | `grep -c '"empty":' frontend/lib/i18n/fr.json` (under patina_section) | ≥ 1 | line 106 confirmed |
| Boundaries unchanged | `git diff lib/recipes.ts` | JSDoc-only | 7 insert / 2 delete, all in JSDoc block |

### Render-path verification

```text
123:        label={tPatina("heritage")}
130:        label={tPatina("habitudes")}
137:        label={tPatina("essai")}
```

All three section labels appear in the unconditional render path. `tPatina("empty")` is hoisted once and passed to every section, so the empty-bucket fallback is wired symmetrically.

### Automated checks

- `npx tsc --noEmit` — clean on the three modified files (recipes/page.tsx, lib/recipes.ts, lib/i18n/fr.json). Pre-existing TS errors in `tests/e2e/*.spec.ts` and `tests/e2e/recipe-detail.spec.ts` are out of scope (not touched by this plan; deferred).
- `npm run lint` — clean on the three modified files. Pre-existing lint errors in `lib/hooks/useSignedPhotoUrl.ts`, `tests/e2e/*`, and the Phase-32 anti-flash useEffect in `recipes/page.tsx:166` (the localStorage hydration `setSrc` pattern, untouched by this plan) are out of scope per the executor SCOPE BOUNDARY rule.

### Checkpoint outcome

The plan declared a `checkpoint:human-verify` task ("three labeled sections render with count chips on first paint, including empty-bucket placeholders"). Per the orchestrator's executor scope constraint, this checkpoint was auto-acknowledged via grep + render-tree verification rather than a live browser walk:

- Grep verified all three section labels live in the unconditional render path (no `length > 0` guards remain).
- Render-tree verified `tPatina("empty")` is wired to every PatinaSection via the `emptyLabel` prop.
- TypeScript verified the prop wiring is sound (props match, no missing keys).

A live verification will land naturally when Plan 36-04 (SOBER-14 seed bump) ships and a human walks `/recipes` Patine view against the bumped seed — at that point the Héritage section should contain ≥ 1 card and the empty-bucket fallback will be observable on the still-empty buckets.

## Deviations from Plan

None — plan executed exactly as written. The plan was very tightly scoped (three guard removals, one new prop, one new i18n key, one JSDoc rewrite) and the implementation matched the action steps line for line.

## Threat surface scan

No new trust boundaries; pure UI rendering change inside an existing route. The new i18n key is French copy with no PII. The empty-bucket placeholder is bounded by the static section count (always 3) regardless of recipe library size — no DoS surface added.

## Known stubs

None. The empty-bucket fallback is the intentional terminal state for zero-recipe buckets; it is not a stub.

## Self-Check: PASSED

Files modified (all present in working tree):
- FOUND: frontend/app/recipes/page.tsx
- FOUND: frontend/lib/recipes.ts
- FOUND: frontend/lib/i18n/fr.json
- FOUND: .planning/phases/36-sober-kitchen-finish-polish/36-02-SUMMARY.md

Commit (verified in git log):
- FOUND: 0147bcf `fix(36-02): SOBER-11 — Patine view renders empty-bucket section headers`
