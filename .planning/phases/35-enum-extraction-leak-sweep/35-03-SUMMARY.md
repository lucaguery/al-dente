---
plan_id: "35-03"
plan_name: "ENUM-02/03/04 — useEnumLabels at card sites + grep gate"
status: complete
requirement_ids: [ENUM-02, ENUM-03, ENUM-04]
commits: [816e2c3]
files_modified:
  - frontend/components/RecipeCard.tsx
  - frontend/components/RecipeRow.tsx
  - frontend/components/VoteSummary.tsx
  - scripts/check-enum-leak.sh
  - frontend/package.json
phase: 35-enum-extraction-leak-sweep
plan: 03
subsystem: frontend/components + scripts
tags: [enum-translation, useEnumLabels, locked-vocabulary, grep-gate, ci-guard]
dependency_graph:
  requires:
    - "frontend/lib/enum-labels.ts (useEnumLabels canonical translator — Phase 22 QW-03 + Phase 28 DETAIL-02/03/04)"
    - "frontend/lib/i18n/fr.json enums.cuisine namespace (already populated with all 10 cuisine keys)"
  provides:
    - "Bibliothèque Grille + Liste cuisine labels translated (B-04 closed)"
    - "Post-vote Accueil ledger meta caption cuisine labels translated (B-05 closed)"
    - "scripts/check-enum-leak.sh — CI-runnable regression guard for raw locked-vocab in frontend/{app,components} user-facing positions"
    - "npm run enum-leak-check (frontend/package.json)"
  affects:
    - "frontend/components/RecipeCard.tsx (Bibliothèque Grille subhead — line 148)"
    - "frontend/components/RecipeRow.tsx (Bibliothèque Liste row meta — line 77)"
    - "frontend/components/VoteSummary.tsx (non-Validé ledger meta caption — line 162)"
tech_stack:
  added: []
  patterns:
    - "useEnumLabels at every render-site that touches recipe.cuisine / recipe.mood / recipe.main_protein (locked-vocabulary discipline)"
    - "Repo-root scripts/ directory established for cross-cutting CI gates (precedent for future backend-side gates)"
    - "Grep-gate guards string-literal-only scope (quotes + JSX-text) to keep false-positive rate manageable"
key_files:
  created:
    - "scripts/check-enum-leak.sh"
  modified:
    - "frontend/components/RecipeCard.tsx"
    - "frontend/components/RecipeRow.tsx"
    - "frontend/components/VoteSummary.tsx"
    - "frontend/package.json"
decisions:
  - "Grep-gate scope is string-literal-only — runtime variable refs ({recipe.cuisine}) are out of detection scope and rely on code review + the useEnumLabels convention. Trade-off accepted: better precision, limited recall to the 'hardcoded enum string' class."
  - "Token boundary uses [^A-Za-z0-9_-] (non-word + non-hyphen + non-underscore) to exclude Tailwind utilities (font-medium) and identifiers (const fresh = …) — BSD-grep-portable; no PCRE lookbehind required."
  - "Excluded tokens: 'american' / 'other' (cuisine common words), 'light' / 'quick' / 'celebratory' / 'adventurous' (mood common words), 'poultry' / 'redMeat' / 'seafood' / 'egg' / 'legume' / 'none' (protein common/unlikely). Primary leaks (italian, indian, mexican, french, asian, mediterranean, middleEastern, northAfrican, comfort, festive, fresh, easy, medium, hard, beef, chicken, fish, pork, spring, summer, autumn, winter) are caught."
  - "VoteSummary.tsx is the actual ENUM-03 leak site (NOT HomeDecide.tsx as CONTEXT initially indicated). HomeDecide renders VoteSummary; VoteSummary owns the cuisine render. Plan §interfaces flagged this correctly."
  - "POLISH-01 (Phase 36 ' · ' NBSP typography) deliberately NOT touched in this plan — VoteSummary's `.join(' · ')` separator is part of POLISH-01's surface and scope-creep was avoided."
metrics:
  duration_seconds: 357
  duration_human: "~6 minutes"
  completed_date: "2026-05-18"
  task_count: 3
  file_count: 5
  commit_count: 1
---

# Phase 35 Plan 03: ENUM-02/03/04 — useEnumLabels at card sites + grep gate — Summary

## One-liner

Three component-level `useEnumLabels` insertions (RecipeCard, RecipeRow, VoteSummary) close the Bibliothèque + post-vote-ledger raw-enum-key leaks; a new `scripts/check-enum-leak.sh` (npm-script-wired) is the systemic regression guard mirroring v0.5 Phase 22 D-18 discipline.

## What shipped

**ENUM-02 — `frontend/components/RecipeCard.tsx` + `frontend/components/RecipeRow.tsx`**

Added `import { useEnumLabels } from "@/lib/enum-labels"` and `const labels = useEnumLabels();` at the top of each component body. Replaced the raw `{recipe.cuisine}` inside the `<Badge>` element with `{labels.cuisine(recipe.cuisine)}` — the conditional guards (`recipe.cuisine ? … : null`) are preserved so TypeScript narrows the `string | null | undefined` cuisine field to `string` at the call site. The Bibliothèque Grille view (`RecipeCard`) and Liste view (`RecipeRow`) both now render the French label for all 21 seeded recipes (`Italienne · avant-hier`, `Indienne · Jamais cuisinée`, `Moyen-orientale · Jamais cuisinée`, …) instead of the wire-format key.

**ENUM-03 — `frontend/components/VoteSummary.tsx`**

The actual leak site for punch-list B-05 — not `HomeDecide.tsx`. `HomeDecide` composes `VoteSummary`, but `VoteSummary` owns the non-Validé ledger meta render (`r.cuisine` joined with prep-time via `' · '`). Added the same import + `const labels = useEnumLabels();` and replaced `r.cuisine,` with `r.cuisine ? labels.cuisine(r.cuisine) : null,` inside the array passed to `.filter(Boolean).join(' · ')`. The existing `.filter(Boolean)` contract still drops null entries; semantically equivalent to the prior code but with French labels. The Validé row's Caveat marginalia (line 151, `tShortlist("valide_meta")`) is already an i18n literal and was not touched.

**ENUM-04 — `scripts/check-enum-leak.sh` + `frontend/package.json` script entry**

New `scripts/` directory at the repo root. The script greps `frontend/app` + `frontend/components` for string-literal occurrences of the locked-vocab union (22 primary tokens — see Decisions for the exclusion rationale). Match patterns:

1. `"token"` or `'token'` — quoted-string positions
2. `>token<` — JSX text content

The post-filter drops:
- `import` / `from` lines
- Comment-only lines (`//` / `/*` / ` *`)
- TS type-literal positions (`: "italian" |`, `as "italian"`)
- Wire-shape array defaults (`["spring", "summer", "autumn", "winter"]` — these are wire values, not user copy)

Exit 0 on clean tree; exit 1 with offender list + remediation hint on hit. The gate runs as `npm run enum-leak-check` from `frontend/` (resolves to `bash ../scripts/check-enum-leak.sh`) or directly via `bash scripts/check-enum-leak.sh` from the repo root.

## Verification

| Check | Result |
|---|---|
| `grep -nE "labels\.cuisine\(recipe\.cuisine\)" frontend/components/RecipeCard.tsx frontend/components/RecipeRow.tsx` | 2 hits (one per file, on the Badge render line) |
| `grep -nE "labels\.cuisine\(r\.cuisine\)" frontend/components/VoteSummary.tsx` | 1 hit (line 162, non-Validé meta array) |
| `bash scripts/check-enum-leak.sh` (against the phase tip, post-commit) | **EXIT 0** — "OK: no enum-leak detected in frontend/{app,components}" |
| `cd frontend && npm run enum-leak-check` | EXIT 0 — same output |
| `cd frontend && npx eslint components/RecipeCard.tsx components/RecipeRow.tsx components/VoteSummary.tsx` | 0 errors, 2 pre-existing warnings in VoteSummary (`_onDelegate`, `_delegateInFlight` underscore-prefixed unused — intentionally retained per the file's header comment about HomeDecide prop compatibility) |
| `npx tsc --noEmit` on RecipeCard / RecipeRow / VoteSummary | 0 type errors |

### Adversarial smoke test (gate negative case)

Injected three test leaks against the post-commit phase tip:

1. `frontend/components/_test_leak.tsx`: `<p>italian</p>` (JSX text leak) → gate **exit 1**, offender printed.
2. `frontend/components/_test_leak2.tsx`: `<p title="italian">x</p>` (quoted attribute leak) → gate **exit 1**, offender printed.
3. Reverted both files → gate **exit 0**.

Confirms the guard catches both the JSX-text and quoted-string leak classes. Both test files were deleted before commit.

## Deviations from Plan

**None substantive.** Three minor tightenings during execution:

1. **Grep-gate filter refinement (multi-pass).** The first-cut regex (whole-word `\b…\b`) produced ~30 false positives — Tailwind utility classes (`font-medium`, `text-medium`), variable identifiers (`const fresh = …`), and wire-shape array defaults (`["spring", "summer", "autumn", "winter"]`). Tightened in two rounds:
   - Switched word boundary from `\b` (which matches at `-`) to explicit `[^A-Za-z0-9_-]` lookaround → killed Tailwind-class false positives.
   - Restricted matching to string-literal positions (quotes + JSX text) → killed identifier-name false positives.
   - Added a post-filter for typed enum-array defaults → killed the `RecipeForm.tsx` seasonality default.
   Final gate has 0 false positives against the phase tip. Documented the precision/recall trade-off in the script header (string-literal-only scope is the deliberate detection envelope; runtime variable-ref leaks rely on `useEnumLabels` convention + code review).

2. **Plan §interfaces correctly flagged a CONTEXT.md discrepancy.** CONTEXT.md initially named `HomeDecide.tsx` as the ENUM-03 target; the plan investigation correctly redirected to `VoteSummary.tsx:159-166` (which `HomeDecide` composes). I followed the plan, not CONTEXT — no deviation, but worth recording the surface-of-truth chain for the verifier.

3. **Out-of-scope discoveries (not fixed, per Scope Boundary rule):**
   - `frontend/lib/recipe-completeness.test.ts` has 17 pre-existing TS errors (`readonly` array narrowing in test fixtures) and one `TS5097` import-extension error. Unrelated to this plan.
   - `frontend/lib/hooks/useSignedPhotoUrl.ts:36` has a pre-existing `react-hooks/set-state-in-effect` warning.
   - `frontend/tests/e2e/*.spec.ts` has pre-existing `playwright/no-skipped-test` rule-definition errors (plugin not loaded).
   - `frontend/public/worker-*.js` has pre-existing minifier-output lint warnings.
   None block this plan.

## Auth gates encountered

None.

## Known Stubs

None introduced.

## Self-Check

```
[ -f frontend/components/RecipeCard.tsx ] → FOUND
[ -f frontend/components/RecipeRow.tsx ] → FOUND
[ -f frontend/components/VoteSummary.tsx ] → FOUND
[ -f scripts/check-enum-leak.sh ] → FOUND (executable; chmod +x verified)
[ -f frontend/package.json ] → FOUND
git log --oneline | grep 816e2c3 → FOUND (fix(35-03): ENUM-02/03/04 — useEnumLabels at card sites + grep gate)
```

## Self-Check: PASSED

## Threat Flags

None — the three call-site changes consume the existing translator surface (no new endpoints, schema, or trust-boundary crossings); the grep gate is a build-time guard with no runtime effect.
