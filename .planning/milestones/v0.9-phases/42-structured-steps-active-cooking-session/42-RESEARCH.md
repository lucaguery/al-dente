---
phase: 42
phase_slug: structured-steps-active-cooking-session
researched: 2026-05-21
researcher: inline (sonnet equivalent)
---

# Phase 42 — Research

## Executive summary

CONTEXT.md is detailed and locks 19 decisions. Research uncovered three load-bearing facts that refine — and partially **correct** — those decisions before the planner consumes them.

1. **`recipes.steps` already exists.** It is `Mapped[list | None]` (JSONB, **nullable**) declared in `backend/app/models/recipe.py:77` and currently persists `list[str]` from `GeminiExtractedRecipe.steps: list[str] | None` (`backend/app/services/llm.py:145`). Migration 0013 is therefore an **ALTER**, not an `add_column`, and the inner JSONB shape changes (str → `{text, ingredient_refs}`).
2. **`cooking_logs.cooked_at`, not `started_at`.** CONTEXT.md D-15 calls `cookingLog.started_at`; the SQLAlchemy column is `cooked_at` (`backend/app/models/cooking_log.py:56`) and the TS type uses `cooked_at: string` (`frontend/lib/cooking.ts:7`). Planner must use the existing field.
3. **Migration numbering jumps from 0009 → 0011** (no 0012-skip, but no 0010 either). Latest applied is `0012_resanitize_illustration_svg.py` (`down_revision='0011'`). The new migration is `0013_*` with `down_revision='0012'`.

## Validation Architecture

(Section header retained so step 5.5 can route the Nyquist template if `nyquist_validation_enabled` is honored downstream — this phase's validation dimensions are listed in §Per-requirement validation below.)

### Dimension coverage matrix

| Dim | Name | How this phase validates |
|-----|------|--------------------------|
| 1 | Functional | Per-requirement unit/integration tests (STEP-01..03, ACTV-01..03) |
| 2 | Schema/data | Alembic migration 0013 upgrade+downgrade test (inherits Phase 39 fixture) |
| 3 | API contract | 5-test contract for `POST /recipes/{id}/extract-steps` (4xx + 202 + idempotency) |
| 4 | UI/E2E | Playwright spec `active-cooking-session.spec.ts` (happy path + backfill loading) |
| 5 | Realtime | Backend integration test asserting `recipe.updated` event fires after backfill commit |
| 6 | Cross-process state | Single uvicorn worker — BackgroundTask in same process, no cross-worker race |
| 7 | i18n | All new strings via `next-intl` keys (`cooking.active.*`) — no hardcoded French |
| 8 | Migration safety | 0013 upgrade leaves no NULL `steps` value; downgrade restores nullability |

---

## Existing state of the system (the "before" snapshot)

### Already wired (do not re-create)

| Surface | What exists today | Where |
|---------|-------------------|-------|
| Recipe `steps` column | `Mapped[list \| None]`, JSONB, **nullable** | `backend/app/models/recipe.py:77` |
| Schema `RecipeResponse.steps` | `list[str] \| None = None` | `backend/app/schemas/recipe.py:94, 134` |
| Gemini schema field | `GeminiExtractedRecipe.steps: list[str] \| None = None` | `backend/app/services/llm.py:145` |
| Step persistence | `recipe.steps = extracted.steps` (assignment in `_apply_extracted`) | `backend/app/services/llm.py:397` |
| BackgroundTask pattern reference | `extract_and_process_url_turn()` — `recipe.updated` broadcast after persisting extracted fields | `backend/app/services/llm.py:1191` |
| `recipe.updated` broadcast helper | `broadcast_to_household(household_id, "recipe.updated", payload)` | `backend/app/services/realtime.py:96` |
| Frontend `recipe.updated` subscription | `RealtimeProvider` mutates local cache on event | `frontend/components/RealtimeProvider.tsx` |
| Cooking-log start time | `cooked_at` (TIMESTAMPTZ NOT NULL) — set at "Je commence à cuisiner" tap | `backend/app/models/cooking_log.py:56` |
| TS type | `CookingLogResponse.cooked_at: string` | `frontend/lib/cooking.ts:7` |
| Finalize page | Existing — destination for ACTV-03 CTA | `frontend/app/cooking-logs/[id]/finalize/page.tsx` |
| `[id]/page.tsx` (sibling to active) | Existing — pattern for the new active route | `frontend/app/cooking-logs/[id]/page.tsx` |

### Migration revision chain

```text
0001 → 0002 → 0003 → 0004 → 0005 → 0006 → 0007 → 0008 → 0009 → 0011 → 0012 → [0013 NEW]
```

(0010 was skipped during v0.4 numbering — that gap is intentional and historical. Phase 42's new migration is `0013_*`, `down_revision = "0012"`.)

---

## Refinements to CONTEXT.md decisions (READ FIRST — planner consumes these)

### Refinement R-01: D-01/D-02 migration body is ALTER, not ADD

**CONTEXT.md D-02 says:**
```python
op.add_column('recipes', sa.Column('steps', JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")))
```

**Actual required body:**
```python
def upgrade() -> None:
    # 0013 — convert recipes.steps from nullable list[str] to NOT NULL list[StepEntry] JSONB.
    # Existing data: legacy promoted recipes have list[str] (flat instructions). Per
    # PROJECT.md MVP rule "no backward-compat shims", we backfill NULLs with [] and let
    # the lazy backfill path (STEP-03) re-extract structured steps on first /active visit.
    op.execute("UPDATE recipes SET steps = '[]'::jsonb WHERE steps IS NULL")
    op.alter_column(
        'recipes',
        'steps',
        existing_type=postgresql.JSONB,
        nullable=False,
        server_default=sa.text("'[]'::jsonb"),
    )

def downgrade() -> None:
    op.alter_column(
        'recipes',
        'steps',
        existing_type=postgresql.JSONB,
        nullable=True,
        server_default=None,
    )
```

**Model change:** `steps: Mapped[list[dict]]` (drop `| None`, add `nullable=False, server_default=text("'[]'::jsonb"), default=list`).

**Why this matters:** the planner must NOT generate `op.add_column` — Alembic will fail on first upgrade because the column already exists.

### Refinement R-02: D-15 field name is `cooked_at`

CONTEXT.md D-15 refers to `cookingLog.started_at`. **The actual field is `cooked_at`** (semantically the start time per the model comment line 55, "Immutable start time — set once at 'Je commence à cuisiner' tap"). All consumers — Python services, Pydantic schemas, TypeScript types, Playwright fixtures — already use `cooked_at`. The active session page must read `cookingLog.cooked_at` and compute elapsed minutes from it.

### Refinement R-03: Existing `steps: list[str]` semantics break under STEP-02

CONTEXT.md D-09 sets the new shape to `list[StepEntry]` where `StepEntry = {text: str, ingredient_refs: list[str]}`. CONTEXT.md D-10 says "Pydantic schema sets `steps: list[StepEntry] = []` default so the field is optional in deserialization."

**The actual existing schema is `list[str] | None`** — the new schema must replace `list[str]` with `list[StepEntry]`. There is no MVP-shim path that accepts both (per PROJECT.md "no backward-compat shims" rule). Plans must:

- Update `GeminiExtractedRecipe.steps` type to `list[StepEntry] = Field(default_factory=list)`
- Update `RecipeResponse.steps` and any recipe Pydantic shape to use `StepEntry`
- Update `_apply_extracted` line 397 — `recipe.steps = [s.model_dump() for s in (extracted.steps or [])]` (or equivalent — current `recipe.steps = extracted.steps` won't dump Pydantic models to dicts cleanly)
- Add `StepEntry` Pydantic model in `backend/app/schemas/recipe.py`
- Migration 0013 backfills NULLs to `'[]'` so old-shape `list[str]` data still parses... **but** lazy backfill (STEP-03) is the rewrite path for already-promoted recipes that have legacy flat-string steps. **Plans should explicitly state**: a recipe with legacy `list[str]` steps is treated as "needs re-extraction" on /active visit, identical to a recipe with `steps = []`. The backfill condition is therefore:

```python
needs_backfill = not recipe.steps or not all(
    isinstance(s, dict) and "text" in s and "ingredient_refs" in s
    for s in recipe.steps
)
```

### Refinement R-04: Frontend Recipe type already has steps

`frontend/lib/recipes.ts` likely declares `steps?: string[]` (matching the current backend schema). Plan 42-01 must update the TS type to `steps: StepEntry[]` with `StepEntry = { text: string; ingredient_refs: string[] }`. Add it next to the existing types in `frontend/lib/recipes.ts`. Drop `?` — backend now guarantees an array.

### Refinement R-05: Frontend has no `useCookingLog` hook

CONTEXT.md `<code_context>` line 134 hypothesizes "useCookingLog(id) hook (probably exists)". It does **not** — the existing `frontend/app/cooking-logs/[id]/page.tsx` fetches directly via the API helpers in `frontend/lib/cooking.ts` (`getActiveCookingLog`, `putFinalizeCookingLog`, etc.). The active session route must either (a) follow the same pattern (server component fetch + client component for interaction), or (b) introduce a fresh `useCookingLog(id)` SWR-style hook colocated with the route. **Recommendation (planner discretion per CONTEXT.md):** server component fetch of `cookingLog + recipe` → pass as props to client component. Mirrors the existing `[id]/page.tsx` shape.

---

## Per-requirement validation strategy

### STEP-01 — `recipes.steps` JSONB shape

**Plan:** 42-01 (foundation)

**Validation:**
- **Schema:** Migration 0013 upgrade leaves no NULL `steps`; downgrade restores nullable. Auto-included in `backend/tests/migrations/test_migrations.py` (Phase 39 fixture). Adds explicit assertion: `SELECT COUNT(*) FROM recipes WHERE steps IS NULL = 0`.
- **Model:** `Recipe.steps` typed as `Mapped[list[dict]]`, default `[]`.
- **Pydantic:** `StepEntry` model + `RecipeResponse.steps: list[StepEntry]` (no `Optional`).
- **TDD-eligible:** YES — pure data shape with strict contract. RED test asserts `StepEntry.text` required + `ingredient_refs` defaults to `[]`. GREEN: implement model. REFACTOR: extract to shared schemas if reused.

### STEP-02 — Gemini schema + ingredient cross-refs

**Plan:** 42-02 (depends on 42-01)

**Validation:**
- **Schema:** `GeminiExtractedRecipe.steps: list[StepEntry] = Field(default_factory=list)`.
- **Prompt:** `_EXTRACT_PROMPT_THREAD` extended with the step-instruction clause from CONTEXT.md §Specifics ("Then list the steps to cook the recipe. Each step is an object with `text`... `ingredient_refs`... Use ingredient names verbatim").
- **Unit test:** `backend/tests/test_llm_thread.py` adds a test asserting the prompt sent to Gemini's `generate_content` includes the step-instruction clause. Run by patching `_gemini().models.generate_content` and inspecting `contents=` kwarg.
- **Integration test:** `_run_thread_llm` end-to-end with a canned thread fixture (likely extending `llm_fixtures.canned_thread_extract`) — assert the returned `GeminiExtractedRecipe.steps` has at least one `StepEntry` with non-empty `text` and zero-or-more `ingredient_refs` matching `ingredients[].name`.
- **Backward-compat:** Legacy `list[str]` from old fixtures: forbidden under MVP no-shim rule. Update fixtures in 42-02 to emit the new shape. The unit test that legacy fixtures decoded as `list[str]` MUST flip to expect `list[StepEntry]`. Touched test files listed explicitly in `files_modified`.
- **TDD-eligible:** YES — prompt-schema contract has defined I/O. RED test asserts new clause is in the prompt and decoded shape is `list[StepEntry]`.

### STEP-03 — Lazy backfill endpoint + BackgroundTask

**Plan:** 42-03 (depends on 42-02)

**Validation:**
- **Endpoint shape:** `POST /recipes/{id}/extract-steps` — auth via existing cookie, returns 202 Accepted with `{recipe_id, scheduled: true}` body.
- **Idempotency:** repeated calls when `len(recipe.steps) > 0` AND all entries have the structured shape return 200 with `{recipe_id, scheduled: false, reason: "already_extracted"}` (or planner-picked sentinel — must be documented in plan).
- **Auth/iso:** Cross-household call → 404 (per invariant #4 / CLAUDE.md error-handling rule, not 403 — avoids leak).
- **BackgroundTask:** `services.llm.extract_and_persist_steps(recipe_id, db_session_factory)` — mirrors `extract_and_process_url_turn` shape. Reads turn 0 from `recipe_turns` (invariant #5), calls `_run_thread_llm` (or `_gemini().models.generate_content` directly if cleaner), persists `recipe.steps = [s.model_dump() for s in extracted.steps]` + commits + broadcasts `recipe.updated`.
- **5-test contract:**
  1. `test_extract_steps_unauthorized_returns_401`
  2. `test_extract_steps_cross_household_returns_404`
  3. `test_extract_steps_already_extracted_returns_200_with_skipped`
  4. `test_extract_steps_empty_steps_returns_202_and_schedules_task`
  5. `test_extract_and_persist_steps_persists_and_broadcasts` (uses canned LLM fixture, asserts DB row + broadcast event content)
- **Realtime:** Integration test asserts `broadcast_to_household` is called with event `"recipe.updated"` after the BackgroundTask commits.
- **Invariant #5 regression:** `backend/tests/test_invariants.py` adds an assertion that the turn-0 payload of the backfilled recipe is unchanged after `extract_and_persist_steps` runs (`SELECT payload FROM recipe_turns WHERE recipe_id = :id AND position = 0` is byte-identical before/after).
- **TDD-eligible:** YES — endpoint with 5-test contract is a classic TDD shape. RED tests first → minimal endpoint stub → BackgroundTask implementation → broadcast assertion.

### ACTV-01 — Active session route shell

**Plan:** 42-04 (depends on 42-03 endpoint for backfill trigger)

**Validation:**
- **Route exists:** `frontend/app/cooking-logs/[id]/active/page.tsx` server component fetches `cookingLog + recipe`, hands to client component.
- **det-top:** Renders `BrandIcon` X close + crumb `"démarrée à HH:MM · N min"` + `étape N/M` pin. All strings via `next-intl` (`cooking.active.crumb_started_at`, `cooking.active.step_count_pin`).
- **Progress segments:** `steps.length` flex divs with conditional classes (`bg-terracotta-fill`, `bg-terracotta`, `border bg-transparent`).
- **TDD-eligible:** NO — UI rendering is glue. Falls under `type: execute`.

### ACTV-02 — Step navigator + backfill loading

**Plan:** 42-04 (same plan)

**Validation:**
- **Prev/next buttons** advance/retreat `useState(stepIndex)` — pure client-side, no roundtrip. Disabled state on bounds (no prev at 0; next swaps to finalize CTA at last).
- **Backfill loading:** if `recipe.steps.length === 0` OR steps are legacy shape, fire `POST /recipes/{id}/extract-steps` on mount, render `<BrandLoader label={t('steps_extracting')} />`. When `recipe.updated` broadcast lands (via `RealtimeProvider`), local recipe state updates, render flips to step 1.
- **Loading-state proof:** Playwright spec (42-05) covers this — see plan 42-05.

### ACTV-03 — Finalize CTA wiring

**Plan:** 42-04 (same plan)

**Validation:**
- **CTA appearance:** Only when `stepIndex === steps.length - 1`. Earlier steps show "Étape suivante" right-action.
- **Routing:** `router.push(\`/cooking-logs/${id}/finalize\`)`. Existing finalize page handles rating/notes/photo unchanged.
- **X close:** Routes to `/cooking-logs/${id}` per CONTEXT.md D-19.
- **Playwright happy path:** plan 42-05 covers — start → advance through steps → final step → tap "Terminé · marquer cuisinée" → land on /finalize.

---

## Plan slicing recommendation

| Plan ID | Title | Wave | Depends on | Reqs |
|---------|-------|------|------------|------|
| 42-01 | Migration 0013 + Recipe model + Pydantic StepEntry/RecipeResponse + 0013 migration test | 1 | — | STEP-01 |
| 42-02 | Gemini prompt + STRUCTURED schema extension + unit/integration tests | 1 | — | STEP-02 |
| 42-03 | `POST /recipes/{id}/extract-steps` endpoint + `extract_and_persist_steps` BackgroundTask + 5-test contract + invariant regression | 2 | 42-01, 42-02 | STEP-03 |
| 42-04 | Active session route — server fetch + client step navigator + det-top + progress segments + finalize wiring | 2 | 42-01, 42-03 | ACTV-01, ACTV-02, ACTV-03 |
| 42-05 | Playwright spec `active-cooking-session.spec.ts` — happy path + backfill loading + finalize transition | 3 | 42-04 | (verification of ACTV-01..03) |

**Waves:**
- Wave 1: 42-01 + 42-02 (parallel — both touch backend foundations; 42-01 owns model+migration, 42-02 owns LLM service+prompt; non-overlapping files)
- Wave 2: 42-03 + 42-04 (parallel — 42-03 backend endpoint, 42-04 frontend route; non-overlapping)
- Wave 3: 42-05 (Playwright spec — depends on 42-04 wiring to assert against)

**Why 42-01 and 42-02 are independent:** 42-01 touches `models/recipe.py`, `schemas/recipe.py`, `alembic/versions/0013_*.py`. 42-02 touches `services/llm.py`, `tests/test_llm_thread.py`, `services/llm_fixtures.py`. **However** 42-02's Pydantic `StepEntry` reference depends on `StepEntry` being defined in `schemas/recipe.py` by 42-01. Two options:

- (A) Put `StepEntry` in `schemas/recipe.py` and 42-02 imports from there. 42-01 must land first OR 42-02 imports lazily. Risk: parallel execution may race.
- (B) Define `StepEntry` inline in `services/llm.py` AND in `schemas/recipe.py` (separate Pydantic models with identical shape — locked-vocabulary mirror style, like `Cuisine` in `enums.ts` + `enums.py`). Both plans own their copy. Drift is a bug category (auto-flagged by plan-checker if a future change touches one without the other).

**Recommendation:** **Option B** — mirror the existing locked-vocabulary discipline. Each side owns its definition; the frontend mirror (`frontend/lib/recipes.ts:StepEntry`) makes it a 3-location mirror set. Plan 42-01's `must_haves` and 42-02's `must_haves` both call out the mirror requirement.

---

## Architecture invariant compliance map

| Invariant | How Phase 42 honors it |
|-----------|------------------------|
| **#1** Server-side BackgroundTask promotion | 42-03 endpoint uses `BackgroundTasks.add_task(extract_and_persist_steps, ...)`. NEVER inline Gemini call on request thread. |
| **#3** Denormalized fields atomic | N/A — no denormalized writes touched. |
| **#4** Realtime contract | 42-03 broadcasts `recipe.updated` after committing — same event type already in use, payload extends naturally with new `steps` field. |
| **#5** Raw inputs preserved | 42-03 reads `recipe_turns.payload` for turn-0; never mutates turn-0. Invariant regression test added in `test_invariants.py`. |
| **#6** French-only via next-intl | All new UI strings via `cooking.active.*` keys. Acceptance criteria for 42-04 includes grep assertion that no hardcoded French exists in the new files. |
| **#7** Single uvicorn worker | BackgroundTask runs in-process; no APScheduler involvement. |
| **#8** HttpOnly cookie auth | 42-03 endpoint uses existing `Depends(current_member)`. |

## Known landmines

1. **Migration is `alter_column`, not `add_column`** (R-01). Plan 42-01's task `<action>` must call this out explicitly with the correct Alembic body.
2. **Field name `cooked_at`, not `started_at`** (R-02). Plan 42-04 uses the correct name in elapsed-time computation.
3. **Pydantic schema is a breaking change for `RecipeResponse.steps`** (R-03). All consumers — frontend types, JSON fixtures, snapshot tests if any — must update in the same commit window. The MVP no-shim rule applies.
4. **TS type `frontend/lib/recipes.ts:Recipe.steps`** (R-04). Plan 42-04 owns the TS-side update OR 42-01 owns it (planner picks — recommendation: 42-04 since the TS type is consumed by the frontend, and 42-01 stays backend-only for cleaner blast radius).
5. **`_apply_extracted` line 397** currently assigns `extracted.steps` directly to `recipe.steps`. After STEP-02, `extracted.steps` is `list[StepEntry]` (Pydantic models) and `recipe.steps` is JSONB persisted as `list[dict]`. The assignment must become `recipe.steps = [s.model_dump(mode="json") for s in (extracted.steps or [])]`. Plan 42-02 owns this fix.
6. **Test mode fixtures (`llm_fixtures.canned_thread_extract`)** — likely emit `list[str]` steps today. Update to emit `list[StepEntry]` in 42-02 to keep deterministic test mode passing.
7. **Plan 42-04's loading-state detection** must check both empty (`steps.length === 0`) AND legacy (string entries) shapes — see R-03 backfill condition.

## References

- `CLAUDE.md` §Architecture invariants — invariants #1, #4, #5, #6, #7, #8
- `docs/adr/0001-recipe-conversation-thread.md` — turn-0 immutability
- `docs/adr/0004-modern-sober-refresh.md` — La Grille register; terracotta accent
- `backend/CLAUDE.md` — Gemini SDK is `google-genai`, NOT `google-generativeai`
- `frontend/CLAUDE.md` — Next.js 16 breaking changes, lint authority
- `backend/app/services/llm.py:1191` — `extract_and_process_url_turn` BackgroundTask template
- `backend/app/services/realtime.py:96` — `broadcast_to_household` signature
- `backend/app/models/recipe.py:77` — existing `steps` column declaration
- `backend/app/models/cooking_log.py:56` — `cooked_at` field
- `backend/alembic/versions/0012_resanitize_illustration_svg.py` — latest applied revision (down_revision target)
- `.claude/skills/sketch-findings-al-dente/sources/002-refresh-direction-explorations/index.html` lines 2015-2058 — sketch source

---

## RESEARCH COMPLETE

5 refinements (R-01..R-05) landed, 7 landmines flagged, 5-plan slicing recommended.
