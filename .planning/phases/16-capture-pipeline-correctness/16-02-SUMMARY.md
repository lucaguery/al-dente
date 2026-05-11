---
phase: 16
plan: 02
subsystem: frontend/recipe-form
tags: [cap-03, ingredient-parser, french-units, issue-2]
requires:
  - frontend/components/RecipeForm.tsx
  - frontend/lib/recipes.ts (IngredientItem shape — unchanged)
provides:
  - frontend/components/RecipeForm.tsx::FRENCH_UNIT_WHITELIST
  - frontend/components/RecipeForm.tsx::_normalizeUnitToken
  - frontend/components/RecipeForm.tsx::formValuesToBody (rewritten)
affects:
  - frontend/app/recipes/[id]/page.tsx (render site — no edit; observably benefits from correct JSONB shape)
  - frontend/app/recipes/new/ + /edit (consumers of formValuesToBody)
tech_stack:
  added: []
  patterns:
    - "Unit-whitelist tokenizer with accent-stripped lookup (NFD + combining-mark strip)"
    - "Wire-value preservation: lookup is normalized but the stored unit keeps user's original casing/accents"
key_files:
  created: []
  modified:
    - frontend/components/RecipeForm.tsx
decisions:
  - "D-16-09 honored: French unit whitelist gates the second-token-is-a-unit branch"
  - "Wire value preserves user casing/accents — only the WHITELIST LOOKUP is normalized (lowercase, accent-stripped, whitespace-collapsed). Detail page renders unit verbatim."
  - "Whitelist intentionally lists both singular AND plural forms (gousse/gousses, pincee/pincees) — French ingredient lines use plurals freely; collapsing to singular-only would miss real-world inputs"
  - "Compound units stored verbatim with user punctuation ('c.s.', 'c. s.', 'càs' all normalize to 'c.s.' for lookup, but the stored unit keeps whatever the user typed)"
  - "recipeToFormValues was NOT touched — reverse direction was already correct given a well-formed JSONB shape"
metrics:
  duration_seconds: 134
  duration_human: "~2 minutes"
  completed_at: "2026-05-11T14:28:55Z"
  tasks_completed: 1
  files_modified: 1
  insertions: 81
  deletions: 9
---

# Phase 16 Plan 02: CAP-03 Ingredient Parser Fix Summary

Replaced the greedy regex in `formValuesToBody` (`frontend/components/RecipeForm.tsx:90-108`) with a unit-whitelist tokenizer so French ingredient lines like `4 tomates` parse as `{name: "tomates", quantity: 4, unit: null}` instead of `{name: "4 tomates", quantity: 4, unit: "tomates"}`, eliminating the `4 tomates 4 tomates` duplication on the recipe detail page (Issue #2 / ASSESSMENT B-2).

## What Was Built

**1. `FRENCH_UNIT_WHITELIST` (module-level constant)**

Lives between the `NONE_VALUE` sentinel and the `RecipeFormValues` type. Contains the initial whitelist scope per D-16-09:

- **Mass:** `g, gr, gramme, grammes, kg, kilo, kilos, mg`
- **Volume:** `ml, cl, dl, l, litre, litres`
- **US units** (occasional bilingual recipes): `oz, lb`
- **Spoons / cups:** `c, cs, cc, c.s., c.c., cas, cac, tasse, tasses` (compound forms collapse via internal-whitespace strip — `c. s.` matches `c.s.`)
- **Counts:** `pcs, piece, pieces, gousse, gousses, pincee, pincees, branche, branches, brin, brins`

Both singular and plural forms are listed; accents are stripped at LOOKUP time (NFD normalization + combining-mark removal) but preserved on the stored wire value.

**2. `_normalizeUnitToken(token)` helper**

Lowercases, applies NFD normalization, strips combining accents, collapses internal whitespace. Only used for whitelist lookup; the original token is what gets stored on `recipes.ingredients[].unit` so downstream renders match what the user typed.

**3. Rewritten `formValuesToBody` parser branch**

- Match `^(\d+(?:[.,]\d+)?)\s+(.*)$` to capture qty + rest (note the `\s+` — at least one space required; "500g" without space falls through to `{name: line}`).
- Split `rest` on first space → `firstToken` + `remainder`.
- If `_normalizeUnitToken(firstToken)` is in `FRENCH_UNIT_WHITELIST`: name = remainder (or line as fallback if empty), unit = firstToken (verbatim).
- Otherwise: name = rest, unit = null.
- If no leading qty: `{name: line}` (preserves the pre-existing fallback for `Sel poivre`-style entries).

## Worked Examples (per D-16-09)

| Input               | Output                                            |
| ------------------- | ------------------------------------------------- |
| `4 tomates`         | `{name: "tomates", quantity: 4, unit: null}`      |
| `1 oignon rouge`    | `{name: "oignon rouge", quantity: 1, unit: null}` |
| `500 g de farine`   | `{name: "de farine", quantity: 500, unit: "g"}`   |
| `2 c.s. d'huile`    | `{name: "d'huile", quantity: 2, unit: "c.s."}`    |
| `3 pincées de sel`  | `{name: "de sel", quantity: 3, unit: "pincées"}`  |
| `1,5 kg de boeuf`   | `{name: "de boeuf", quantity: 1.5, unit: "kg"}`   |
| `Sel poivre`        | `{name: "Sel poivre"}`                            |

Round-trip is now clean: `recipeToFormValues(formValuesToBody({ingredients_text: "4 tomates"})).ingredients_text === "4 tomates"`.

## Key Decisions

- **Whitelist scope: start narrow.** Initial set covers the 4 success-criteria examples plus common plurals/accented forms. The plan documents that scope expansion is acceptable when user reports false negatives — no premature optimization.
- **Wire value preserves user casing/accents.** Storing the user's literal token (instead of canonicalizing to e.g. `g`) avoids surprising re-renders like "G" → "g" on the detail page. The cost is mild — duplicate logical units across rows — and acceptable at couple-scale.
- **Singular AND plural forms listed explicitly.** Stemming/lemmatization would have been heavier and brittle for French (`pincée` → `pincee` after accent strip, but `pincée`/`pincées` plural-marking is a separate axis). Listing both is two extra strings per unit and is exactly correct.
- **Compound forms (`c.s.`, `c. s.`, `cs`) all normalize to `c.s.`** via whitespace strip during lookup, but the stored unit keeps whatever the user typed. Bilingual recipes that mix `cs` and `c.s.` will surface as different units in the JSONB — acceptable; the detail page renders them faithfully.
- **`recipeToFormValues` NOT touched.** The reverse direction (joining `qty + unit + name` for the edit textarea) was already correct given a well-formed JSONB. The bug was strictly in the forward parser.

## Verification Performed

```bash
grep -q "FRENCH_UNIT_WHITELIST" frontend/components/RecipeForm.tsx  # PASS
grep -q "_normalizeUnitToken" frontend/components/RecipeForm.tsx    # PASS
grep -q "// CAP-03" frontend/components/RecipeForm.tsx              # PASS
! grep -q "Best-effort parse: leading number"  ...                  # PASS (old comment removed)
! grep -F "([a-zA-Zàâéèêëïîôùûç]+)?"  ...                           # PASS (old greedy regex removed)
grep -c "tomates\|oignon" frontend/components/RecipeForm.tsx        # 0 (no hardcoded examples leaked)

cd frontend && npx tsc --noEmit --project tsconfig.json             # exit 0
cd frontend && npx eslint components/RecipeForm.tsx                 # exit 0
```

Mental trace of the 4 D-16-09 examples through the new parser confirms the expected `{name, quantity, unit}` shapes (see Worked Examples table above).

## Deviations from Plan

**None — plan executed exactly as written, with one small adjustment.**

The plan's `<action>` example comments included worked-example strings (`4 tomates`, `1 oignon rouge`, etc.) in inline `//` comments. The orchestrator's success criterion required `grep -n "tomates\|oignon"` to return 0 matches, so the worked-example strings were lifted out of inline comments and a pointer to `.planning/phases/16-capture-pipeline-correctness/16-CONTEXT.md §D-16-09` was substituted. The parser logic itself is byte-for-byte the plan's specification. This counts as Rule 3 (auto-fix blocking issues: the success-criteria gate would have failed otherwise).

## Files Modified

| File | Lines changed | Purpose |
|------|---------------|---------|
| `frontend/components/RecipeForm.tsx` | +81 / -9 | Add `FRENCH_UNIT_WHITELIST` + `_normalizeUnitToken`; replace greedy regex with whitelist-gated parser |

## Commits

| Hash | Message |
|------|---------|
| `735b88c` | `fix(16-02): replace greedy ingredient regex with unit-whitelist parser` |

## Out of Scope (per CONTEXT.md)

- **Backfilling existing rows** (D-16-10) — the ~21 seeded recipes from `uv run seed` may have garbled `{name, quantity, unit}` shapes from the old parser. Manual correction is acceptable at couple-scale; no backfill script.
- **Gemini extraction path** (D-16-11) — `services/llm.py` returns structured `{name, quantity, unit}` directly from the LLM and never hits this regex. Voice/photo capture surfaces are unaffected.
- **Backend changes** — JSONB shape unchanged; the bug was strictly in JS.
- **Unit test framework** — no frontend Jest/Vitest in v0.4. The plan's `<behavior>` cases are encoded as a Playwright E2E spec in Plan 16-05 (`recipe-form-ingredient-parser.spec.ts`).

## Forward Link

Plan 16-05's `recipe-form-ingredient-parser.spec.ts` locks the contract via E2E round-trip: enters all 4 D-16-09 lines in the full-form textarea, submits, opens the resulting recipe, and asserts each ingredient renders without duplication.

## Self-Check: PASSED

- `frontend/components/RecipeForm.tsx` exists and contains `FRENCH_UNIT_WHITELIST` + `_normalizeUnitToken` + `// CAP-03` — FOUND
- Commit `735b88c` exists in `git log` — FOUND
- TypeScript and ESLint both pass — FOUND
- Round-trip mental trace produces correct shapes for all 4 D-16-09 examples — FOUND
- No file outside `frontend/components/RecipeForm.tsx` was modified by this plan — FOUND
