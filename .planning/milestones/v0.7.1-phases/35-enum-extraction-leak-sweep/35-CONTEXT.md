# Phase 35: Enum + extraction-leak sweep - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — punch-list evidence + locked B-03 two-layer-fix decision + codebase scout pinpointed the bug at `backend/app/services/llm.py:929-936`

<domain>
## Phase Boundary

No raw locked-vocabulary value (`italian`, `medium`, `comfort`, …) reaches user-facing copy anywhere; no Python `dict` repr leaks into the chat thread. One systemic class closed with one grep gate (CI-runnable).

**Out of phase:** Phase 36's Sober Kitchen §15 contract gaps + polish.

</domain>

<decisions>
## Implementation Decisions

### Locked at milestone scaffold

- **B-03 fix is two-layer:** backend stops emitting `str(dict)` for ingredient lists; frontend formats display via `useEnumLabels` + a new units formatter. Backend serializes structured `chips: list[ChipPayload]` (not pre-formatted display strings); frontend SystemBubble renders each chip via the existing label infrastructure.
- **Phase 35 grep gate** mirrors v0.5 Phase 22 D-18 pattern — CI-runnable script blocks raw locked-vocab in `frontend/{app,components}` user-facing copy.

### B-03 root cause confirmed (codebase scout)

`backend/app/services/llm.py:929-936` builds chips with `str(val)` where `val` can be a list of Ingredient dicts. That produces Python `dict` reprs (`{'name': 'riz arborio', 'quantity': 300.0, 'unit': 'g'}`) in the wire payload. Additionally, raw enum values (`medium`, `comfort`, `italian`) get passed through as the raw key — the frontend's existing `useEnumLabels` is the right surface for translation, but the backend ships the raw value and the frontend's summary branch never threads it.

### ENUM-01 implementation shape (B-03 two-layer)

**Backend (`backend/app/services/llm.py` + `backend/app/schemas/recipe_turn.py`):**

1. Change `SummaryTurnPayload.chips: list[str]` → `chips: list[ChipPayload]` where `ChipPayload = {field: str, value: Any}`.
2. Replace the `chips.append(f"{label}: {val_str}")` loop with structured emission: append `{"field": field, "value": extracted_map[field]}` per changed field. The backend NEVER concatenates a display string; it emits the typed value.
3. Ingredients: stay as `list[dict[str, Any]]` (no `str()` cast) — Pydantic JSON-encodes them as proper JSON objects, not Python dict reprs.
4. Optional: also expose a structured `summary_body_extra: dict | None` if the Gemini-generated `summary_body` text is insufficient — but the body is already a French summary string, not a structured dump, so this is probably unnecessary.
5. **Migration path:** This is a wire-shape change. Existing summary turns in the DB with `chips: list[str]` will still parse via Pydantic's tolerance OR via a `model_validator` that detects the legacy shape and converts. MVP posture: no compat shim — drop legacy turns or normalize at read time. Decision: **frontend handles both shapes during the transition** because the seed always re-generates summary turns on each LLM run, so old `list[str]` chips are short-lived. Frontend renders `string` chips verbatim (existing behavior), `ChipPayload` chips via the new formatter.

**Frontend (`frontend/components/RecipeThread/SystemBubble.tsx` + new `frontend/lib/format-field.ts`):**

1. New `frontend/lib/format-field.ts` exports `formatFieldChip(field: string, value: any): { label: string, display: string }`.
   - `label`: from `useEnumLabels().field(field as AnswerField)` (existing infrastructure)
   - `display`: per-field-type formatting:
     - `cuisine` / `mood` / `main_protein` / `difficulty` → `useEnumLabels().cuisine(value)` etc.
     - `seasonality` → comma-joined `useEnumLabels().season(v)` for each value
     - `prep_time_minutes` / `cook_time_minutes` → `${value} min`
     - `servings` → `${value} personnes` (or via ICU pluralization)
     - `ingredients` → each ingredient as `${quantity} ${unit} ${name}` joined by `, ` (e.g. "300 g riz arborio, 400 g champignons, …")
     - `steps` → length-only summary ("8 étapes")
     - `title` / `description` / `tags` → raw value (already French strings)
2. `SystemBubble.tsx` summary branch:
   - If chip is `string` → render verbatim (back-compat for legacy chips).
   - If chip is `ChipPayload` (`typeof chip === "object" && "field" in chip`) → render `${label}: ${display}` via `formatFieldChip`.

### ENUM-02 / ENUM-03 — `RecipeCard.tsx` + `HomeDecide.tsx` ledger meta rows

- Both surfaces consume `useEnumLabels` directly today, but they pass `recipe.cuisine` / `recipe.mood` / `recipe.main_protein` as raw keys to a renderer that doesn't translate. The fix is to call the corresponding `useEnumLabels()` getter inline at each render site. Mechanical — punch-list confirms exact lines.

### ENUM-04 — Repo-wide grep gate

- New script `scripts/check-enum-leak.sh` (executable bash) at repo root or `frontend/scripts/`.
- Greps `frontend/app` + `frontend/components` (excluding `lib/enums.ts`, `lib/enum-labels.ts`, `tests/`, `*.spec.ts`) for the union of locked enum values.
- Fails the build (exit 1) if any are found in template literals (`` ` ` ``) or JSX text positions.
- Pattern: `grep -rn -E "(italian|indian|mexican|french|asian|mediterranean|middleEastern|northAfrican|american|comfort|festive|fresh|easy|medium|hard|beef|chicken|fish|pork|none|spring|summer|autumn|winter)"` with file-type filters.
- Exclude tests (test data legitimately uses raw values).
- Optional integration: add to `frontend/package.json` `scripts` as `enum-leak-check` and call from a Husky pre-commit hook.

### Claude's Discretion

- Whether to add a backend pytest test for the new `chips: list[ChipPayload]` shape (probably yes — mirrors the existing test_llm_thread.py patterns).
- Whether to introduce a `ChipPayload` discriminated union or a flat `{field, value}` object (executor's call — flat is simpler and the field name is the only discriminator needed).
- Whether to expose `formatFieldChip` as a hook (`useFormatFieldChip`) or a pure function called with `useEnumLabels()` results. Pure function is simpler.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- `frontend/lib/enum-labels.ts:34` — `useEnumLabels()` hook returns `cuisine` / `mood` / `protein` / `season` / `difficulty` / `field` getters. The exact infrastructure ENUM-01..03 consume.
- `frontend/lib/enums.ts` — locked vocabularies (cuisine, mood, protein, season, difficulty); `AnswerField` literal.
- `backend/app/schemas/recipe_turn.py:204` — `SummaryTurnPayload` definition. Mutate `chips` field type here.
- `backend/app/services/llm.py:927-944` — the chip-building loop. Replace `str(val)` with structured emission.
- `frontend/components/RecipeThread/SystemBubble.tsx:74-157` — the summary branch. Add chip-shape branching.
- `frontend/components/RecipeCard.tsx` — ENUM-02 target (Bibliothèque grid cards subhead).
- `frontend/components/HomeDecide.tsx` — ENUM-03 target (post-vote ledger meta rows).

### Established Patterns

- **Locked-vocabulary discipline** (CLAUDE.md): values defined in `frontend/lib/enums.ts` AND `backend/app/models/enums.py`. Drift between the two is a bug category.
- **`useEnumLabels` is the canonical translator** — never invent a parallel translation surface; always extend or consume.
- **MVP posture** — clean wire-shape changes; no compat shims unless the schema migration would break existing rows. Summary turns are short-lived (re-generated each LLM run), so a clean `list[str] → list[ChipPayload]` change is safe.
- **Repo-wide grep gates** are the v0.5 Phase 22 D-18 precedent — exact pattern to follow for ENUM-04.

### Integration Points

- `SummaryTurnPayload` is consumed by both backend (write) and frontend (read via `TurnResponse`). Both sides need the type update.
- `useEnumLabels` is consumed by `RecipeCard`, `ShortlistCard`, `recipes/[id]/page.tsx` already — ENUM-02/03 add `HomeDecide.tsx` + verify `RecipeCard.tsx` consumes for all relevant fields.
- The grep gate (ENUM-04) doesn't have a current owner — new script at `scripts/check-enum-leak.sh` or `frontend/scripts/`.

</code_context>

<specifics>
## Specific Ideas

- **Backend test surface:** add `test_summary_turn_emits_structured_chips` to `backend/tests/test_llm_thread.py` — assert `chips[0]` is a dict with `field` + `value` keys, not a string.
- **Frontend test:** if the new `formatFieldChip` becomes a pure function, a small Vitest/Node-test for it is cheap. But Phase 35 stays light on tests per the gh#28 deferral.
- **i18n keys:** `formatFieldChip` may need new keys for unit suffixes (`min`, `personnes`) — add to `fr.json` under a `units.*` namespace if any are missing. Reuse existing where possible.

</specifics>

<deferred>
## Deferred Ideas

- Pre-commit Husky hook for the ENUM-04 grep gate — adding it to package.json scripts is in scope; wiring Husky is a separate setup task (Phase 36 polish or v0.8).
- A unified `IngredientPayload` Pydantic model for the ingredient list — currently dict-shaped. Phase 35 leaves it as `list[dict]` (already structured in JSON form). Strict typing is a separate refactor.
- Backend French-label translation server-side — the current architecture has frontend doing translation via `useEnumLabels`. Phase 35 preserves that; moving translation server-side would be a Phase 36+ design call.

</deferred>
