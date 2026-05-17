---
phase: 28
plan: 02
subsystem: frontend
tags: [vocabulary, types, i18n, component, pin-marginalia]
dependency_graph:
  requires: []
  provides:
    - ANSWER_FIELDS locked-vocabulary mirror (frontend/lib/enums.ts)
    - Recipe.manually_edited_fields TS type (frontend/lib/recipes.ts)
    - useEnumLabels().field() French AnswerField labels (frontend/lib/enum-labels.ts)
    - 10 new i18n keys in recipes.thread.* + recipes.pin.* (frontend/lib/i18n/fr.json)
    - PIN_SECTIONS coverage map + isSectionPinned + firstPinnedFieldInSection (frontend/lib/pin-sections.ts)
    - PinLabel component épinglé/conflit (frontend/components/RecipeThread/PinLabel.tsx)
  affects:
    - Plan 28-03 (handler attachments consume AnswerField type + i18n keys)
    - Plan 28-04 (marginalia mounts consume PinLabel + isSectionPinned)
tech_stack:
  added: []
  patterns:
    - Locked-vocabulary const-tuple mirroring (ANSWER_FIELDS ↔ backend AnswerField Literal)
    - Static inline Record<AnswerField, string> label map (no i18n overhead for 13-key set)
    - CSSProperties inline style component consuming var(--*) design tokens
key_files:
  created:
    - frontend/lib/pin-sections.ts
    - frontend/components/RecipeThread/PinLabel.tsx
  modified:
    - frontend/lib/recipes.ts
    - frontend/lib/enums.ts
    - frontend/lib/enum-labels.ts
    - frontend/lib/i18n/fr.json
decisions:
  - "ANSWER_FIELDS added to enums.ts (not a new answer-fields.ts) — mirrors TurnKind/TurnSender pattern already established in the file"
  - "ANSWER_FIELD_LABELS inline static map in enum-labels.ts (28-RESEARCH §5 Option A) — no new i18n namespace for a 13-key static set"
  - "PinLabel gutter prop drives rotate(-1.2deg) inline — avoids CSS class addition to globals.css per UI-SPEC §New Token Requests"
  - "fontWeight 600 enforced per UI-SPEC §Typography two-weight system lock (Phase 27 400+600 only)"
metrics:
  duration: "~20 minutes"
  completed: "2026-05-17"
  tasks: 3
  files: 6
requirements: [DETAIL-04]
---

# Phase 28 Plan 02: Frontend Foundation (Vocabulary, Types, PinLabel) Summary

Foundation primitives for Phase 28 pin-marginalia: locked-vocabulary ANSWER_FIELDS mirror, Recipe type extension, French labels, i18n keys, section coverage map, and PinLabel component — all wired, zero behavior yet.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend Recipe TS type + add ANSWER_FIELDS locked-vocabulary mirror | d44a6b3 | frontend/lib/recipes.ts, frontend/lib/enums.ts |
| 2 | Add i18n keys + AnswerField French labels + pin-sections coverage map | 89a3677 | frontend/lib/i18n/fr.json, frontend/lib/enum-labels.ts, frontend/lib/pin-sections.ts |
| 3 | Build PinLabel component (Caveat marginalia for épinglé/conflit) | e855428 | frontend/components/RecipeThread/PinLabel.tsx |

## Deliverables

### ANSWER_FIELDS (frontend/lib/enums.ts)

13 entries byte-mirroring `backend/app/schemas/recipe_turn.py:28` `AnswerField` Literal, in the same order:

```
"title", "description", "ingredients", "steps",
"prep_time_minutes", "cook_time_minutes", "difficulty", "servings",
"cuisine", "mood", "main_protein", "seasonality", "tags"
```

`export type AnswerField = (typeof ANSWER_FIELDS)[number]` — importable wherever AnswerField typing is needed in Plans 03 and 04.

### Recipe.manually_edited_fields (frontend/lib/recipes.ts)

Added `manually_edited_fields: string[]` to the `Recipe` type, placed before `last_cooked_at` to mirror backend `RecipeResponse` ordering. Wire-ready for WS `recipe.updated` payloads once Plan 28-01 adds the field to `RecipeResponse` on the backend.

### i18n keys (frontend/lib/i18n/fr.json)

**7 new keys in `recipes.thread.*`:**

| Key | Value |
|-----|-------|
| `answer_valider` | « Valider » |
| `action_failed` | « Action échouée. Réessayer. » |
| `advisory_resolved` | `{field} : {from} → {to} ({status})` (ICU) |
| `advisory_resolved_accepted` | « accepté » |
| `advisory_resolved_dismissed` | « ignoré » |
| `stepper_unit_minutes` | « min » |
| `stepper_unit_servings` | `{count, plural, one {# pers.} other {# pers.}}` (ICU) |

**3 new keys in `recipes.pin.*` (new namespace):**

| Key | Value |
|-----|-------|
| `label` | « épinglé » |
| `conflict` | « conflit » |
| `conflict_aria` | `Conflit sur le champ {field} — Voir l'avis` (ICU) |

### useEnumLabels().field() (frontend/lib/enum-labels.ts)

Added `ANSWER_FIELD_LABELS: Record<AnswerField, string>` inline static map and a `field: (key: AnswerField): string` method. Returns French field labels: titre, description, ingrédients, étapes, temps de préparation, temps de cuisson, difficulté, nombre de personnes, cuisine, ambiance, protéine principale, saisons, tags.

### pin-sections.ts (frontend/lib/pin-sections.ts)

```
PIN_SECTIONS = {
  title:       ["title"],
  description: ["description"],
  metadata:    ["cuisine", "mood", "main_protein"],
  prep_servings: ["prep_time_minutes", "cook_time_minutes", "servings", "difficulty"],
  ingredients: ["ingredients"],
  steps:       ["steps"],
  seasonality: ["seasonality"],   // forward-compat — section not rendered yet
  tags:        ["tags"],          // forward-compat — section not rendered yet
}
```

Exports `isSectionPinned(section, manuallyEditedFields): boolean` and `firstPinnedFieldInSection(section, manuallyEditedFields): AnswerField | null`.

### PinLabel component (frontend/components/RecipeThread/PinLabel.tsx)

Props: `field: AnswerField`, `hasConflict: boolean`, `onConflictTap?: () => void`, `gutter?: boolean`

- **épinglé state** (`hasConflict=false`): `<span>` in `var(--primary)` terracotta, Caveat 12px weight 600 line-height 1
- **conflit state** (`hasConflict=true`): `<button type="button">` in `var(--destructive)` amber with `aria-label={t("conflict_aria", { field: labels.field(field) })}` and `onConflictTap` handler
- **gutter=true**: adds `transform: rotate(-1.2deg)` (detail-page cookbook slant only)
- **gutter=false** (default): no slant (edit form inline placement)

## Deviations from Plan

None — plan executed exactly as written. UI-SPEC weight 600 honored (not the RESEARCH §9 weight 500 suggestion, which was superseded by the UI-SPEC revision note at the top of 28-UI-SPEC.md).

## Known Stubs

None. This plan is vocabulary/primitives only — no behavior wiring yet. Plans 03 and 04 consume these artifacts.

## Threat Flags

No new network endpoints, auth paths, or schema changes introduced. The `ANSWER_FIELDS` drift risk (T-28-01) is documented in the plan's threat model — a CI grep gate is flagged for the post-v0.6 hygiene pass.

## Self-Check: PASSED

Files exist:
- `frontend/lib/recipes.ts` — contains `manually_edited_fields`
- `frontend/lib/enums.ts` — contains `ANSWER_FIELDS`
- `frontend/lib/enum-labels.ts` — contains `field:`
- `frontend/lib/i18n/fr.json` — contains `épinglé`, JSON valid
- `frontend/lib/pin-sections.ts` — contains `PIN_SECTIONS`
- `frontend/components/RecipeThread/PinLabel.tsx` — contains `PinLabel`

Commits exist:
- d44a6b3 feat(28-02): extend Recipe type + add ANSWER_FIELDS locked-vocabulary mirror
- 89a3677 feat(28-02): i18n keys + AnswerField French labels + pin-sections coverage map
- e855428 feat(28-02): add PinLabel component (Caveat marginalia for épinglé/conflit)

TypeScript: 0 errors. ESLint: 0 errors. JSON: valid.
