---
phase: 08-cook-polish
plan: 01
subsystem: cooking-log finalize / i18n
tags: [i18n, next-intl, cook-polish, w4-closure, COOK-11, COOK-12]
requires:
  - frontend/lib/i18n/fr.json (existing cooking_log.finalize block)
  - frontend/components/CookingLogFinalize.tsx (existing useTranslations + offline guard structure)
  - next-intl ICU interpolation (existing pattern in repo)
provides:
  - cooking_log.finalize.offline value: "Hors ligne. Réessaie une fois connecté." (locked W4 closure copy, COOK-11)
  - cooking_log.finalize.recipe_subhead ICU key: "« {title} »" (NEW, COOK-12)
  - CookingLogFinalize.tsx subhead now routed through next-intl
affects:
  - frontend/lib/i18n/fr.json
  - frontend/components/CookingLogFinalize.tsx
tech-stack:
  added: []
  patterns:
    - next-intl ICU interpolation t("key", { var: value }) for runtime substitution into a curly-brace placeholder
key-files:
  created: []
  modified:
    - frontend/lib/i18n/fr.json
    - frontend/components/CookingLogFinalize.tsx
decisions:
  - Use ASCII spaces (not NBSP) inside the « » guillemets to match the UI-SPEC §"Copywriting Contract" authoritative patch and the plan's `grep -nF` acceptance criteria. The plan's prose mentions NBSP but the locked-bytes patch in 08-UI-SPEC.md line 731 uses regular spaces.
  - Did NOT modify the offline guard at lines 83-86 of CookingLogFinalize.tsx — the existing call site `toast.error(t("offline"))` was already structurally correct; only the i18n key value needed updating per the plan and 08-UI-SPEC §Surface 8.
metrics:
  duration: ~5 minutes
  tasks: 2
  files: 2
  commits: 2
  completed: 2026-05-08
---

# Phase 08 Plan 01: COOK-11 + COOK-12 i18n closure Summary

**One-liner:** Closes the two W4 i18n gaps on the cooking-log finalize page by updating one key value (offline) and adding one new ICU key (recipe_subhead) in fr.json, then routing the hardcoded subhead template literal at line 142 of CookingLogFinalize.tsx through `t("recipe_subhead", { title })`.

## Scope

Two micro-changes scoped to a single React component + the French message catalog:

1. **fr.json:** Replace the existing `cooking_log.finalize.offline` value `"Hors ligne. Reconnecte-toi et réessaie."` with the locked W4 closure copy `"Hors ligne. Réessaie une fois connecté."`, and insert a NEW key `cooking_log.finalize.recipe_subhead` with ICU value `"« {title} »"` immediately after the offline key.
2. **CookingLogFinalize.tsx:** Replace the hardcoded template literal `« {state.recipe.title} »` at line 142 with `{t("recipe_subhead", { title: state.recipe.title })}`. The `t` function was already in scope from the `useTranslations("cooking_log.finalize")` hook at line 43.

## Implementation Notes

- The existing offline guard at CookingLogFinalize.tsx lines 83-86 (`if (!navigator.onLine) { toast.error(t("offline")); return; }`) was preserved verbatim — COOK-11 was a value-only change in fr.json, not a code change.
- next-intl's ICU interpolation substitutes `{title}` with `state.recipe.title` at render time, producing the same visual output (`« Recipe Title »`) as the previous template literal — but now the entire user-facing string routes through the message catalog, restoring next-intl conformance on the finalize surface.
- The `recipe_subhead` key was inserted between `offline` and `save_failed` (line 333 of fr.json) to keep the related-key cluster grouped; no other key reordered.
- ASCII spaces were used inside the « » guillemets per the UI-SPEC's authoritative patch (08-UI-SPEC.md line 731) and the plan's `grep -nF` acceptance criteria. The plan prose mentions NBSP, but the byte-level patch in the UI-SPEC and verification greps use regular spaces.

## Verification

### Acceptance criteria (Task 1 — fr.json)

```
$ grep -cF '"offline": "Hors ligne. Réessaie une fois connecté."' frontend/lib/i18n/fr.json
1
$ grep -cF '"recipe_subhead": "« {title} »"' frontend/lib/i18n/fr.json
1
$ grep -cF '"offline": "Hors ligne. Reconnecte-toi et réessaie."' frontend/lib/i18n/fr.json
0
$ node -e "JSON.parse(require('fs').readFileSync('frontend/lib/i18n/fr.json','utf8'))"
(exit 0 — JSON valid)
```

### Acceptance criteria (Task 2 — CookingLogFinalize.tsx)

```
$ grep -cF 't("recipe_subhead", { title: state.recipe.title })' frontend/components/CookingLogFinalize.tsx
1
$ grep -cE '« \{state\.recipe\.title\} »|« \$\{state\.recipe\.title\}' frontend/components/CookingLogFinalize.tsx
0
$ grep -cF 'navigator.onLine' frontend/components/CookingLogFinalize.tsx
1
$ grep -cF 't("offline")' frontend/components/CookingLogFinalize.tsx
1
$ grep -cF 'export function CookingLogFinalize' frontend/components/CookingLogFinalize.tsx
1
```

### TypeScript + ESLint

```
$ cd frontend && npx tsc --noEmit
(no errors on CookingLogFinalize.tsx)

$ cd frontend && npm run lint
(no errors on CookingLogFinalize.tsx)
```

### Plan-level success criteria

- [x] COOK-11 closed: fr.json `cooking_log.finalize.offline` value matches the locked W4 closure copy verbatim; existing `navigator.onLine` guard at lines 83-86 of CookingLogFinalize.tsx untouched.
- [x] COOK-12 closed: fr.json contains NEW `cooking_log.finalize.recipe_subhead` key with exact ICU value `« {title} »`; CookingLogFinalize.tsx line 142 routes through `t("recipe_subhead", { title: state.recipe.title })`.
- [x] next-intl conformance restored on the finalize surface — every user-facing string routes through fr.json.
- [x] No other key in fr.json modified; no other line in CookingLogFinalize.tsx modified.
- [x] No regressions: existing structural / typography / spacing on the finalize page preserved verbatim.

### Orchestrator success criteria

- [x] All tasks executed (2/2)
- [x] Each task committed with --no-verify (e79d5f6, b57aa2d)
- [x] SUMMARY.md at .planning/phases/08-cook-polish/08-01-SUMMARY.md
- [x] grep `recipe_subhead` in fr.json returns 1 hit (line 333)
- [x] grep `Hors ligne. Réessaie une fois connecté` in fr.json returns 1 hit (line 332)
- [x] grep `t("recipe_subhead"` in CookingLogFinalize.tsx returns 1 hit (line 142)

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | fr.json — locked offline copy + new recipe_subhead ICU key | `e79d5f6` |
| 2 | CookingLogFinalize.tsx — route subhead through t("recipe_subhead", { title }) | `b57aa2d` |

## Deviations from Plan

None — plan executed exactly as written.

The plan's prose at one point mentioned NBSPs inside the guillemets, but the UI-SPEC §"Copywriting Contract" authoritative patch (08-UI-SPEC.md line 731) and the plan's own `grep -nF` acceptance criteria both use regular ASCII spaces. The implementation followed the byte-level authoritative source (regular spaces). This is a documentation-internal disambiguation, not a deviation from intended behavior.

## Authentication Gates

None.

## Self-Check: PASSED

- [x] frontend/lib/i18n/fr.json modified (line 332: offline value updated; line 333: recipe_subhead key inserted)
- [x] frontend/components/CookingLogFinalize.tsx modified (line 142: t("recipe_subhead", { title: state.recipe.title }))
- [x] Commit e79d5f6 found in git log
- [x] Commit b57aa2d found in git log
- [x] All grep success criteria pass
- [x] JSON valid (Node.JSON.parse)
- [x] tsc + lint pass on touched file
