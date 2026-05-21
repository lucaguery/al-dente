---
phase: 42-structured-steps-active-cooking-session
plan: 02
status: complete
requirements:
  - STEP-02
commits:
  - 42-02 RED tests
  - 42-02 StepEntry + GeminiExtractedRecipe.steps
  - 42-02 prompt + _apply_extracted + fixtures
---

# Plan 42-02 SUMMARY — Gemini schema + prompt for structured steps

## What was built

The Gemini extraction surface now ships `steps: list[StepEntry]` end-to-end (Phase 42 STEP-02 / D-08..D-11).

- `StepEntry` Pydantic model in `app/services/llm.py` — mirrors `app/schemas/recipe.py:StepEntry` per the locked-vocabulary discipline (identical shape: `text: str (min_length=1)` + `ingredient_refs: list[str] = []`).
- `GeminiExtractedRecipe.steps` — switched from `list[str] | None = None` to `list[StepEntry] = Field(default_factory=list)`.
- `_EXTRACT_PROMPT_THREAD` — appended the step-instruction clause: each step is an object with `text` (impérative voice, ≤2 phrases) and `ingredient_refs` (tableau de noms d'ingrédients). Gemini is instructed to reuse `ingredients[].name` **EXACTEMENT** (no paraphrase, no pluriels, no articles). The clause includes the load-bearing substrings `ingredient_refs`, `EXACTEMENT`, and `étapes` for the unit test assertion.
- `_apply_extracted` — persistence fix from 42-RESEARCH §R-03: `recipe.steps = [s.model_dump(mode="json") for s in (extracted.steps or [])]`. SQLAlchemy cannot JSON-encode Pydantic `BaseModel` instances directly.
- `extracted_map["steps"]` (inside `_run_thread_llm`) — also dumped to dicts so `is_conflict` + chip emission compare against the persisted JSONB shape, not the in-memory `StepEntry` shape.
- `safe_extracted` reversion for `steps` — recipe.steps is `list[dict]`; rebuilt back into `list[StepEntry]` (analog to the existing ingredients reversion).
- `canned_thread_extract` — `_canned_steps` now uses `StepEntry` with `ingredient_refs` cross-referencing canned ingredient names verbatim (`riz arborio`, `bouillon de légumes`, `champignons`, `parmesan`). One step has empty refs to confirm `is_conflict` tolerates that.
- `canned_modified_recipe` — coerces legacy `str` / `dict` / `StepEntry` inputs into `StepEntry` so the modify-voice path (which receives the persisted recipe JSON) doesn't break under the new shape.
- Three new tests in `tests/test_llm_thread.py`:
  - `test_extract_prompt_includes_step_instruction_clause` — asserts the prompt contains `ingredient_refs`, `EXACTEMENT`, and `étapes`/`steps`.
  - `test_apply_extracted_persists_step_dicts_not_models` — asserts `recipe.steps` is `list[dict]` after `_apply_extracted`, never `list[StepEntry]`.
  - `test_run_thread_llm_returns_step_entries_in_test_mode` — end-to-end integration: deterministic test mode persists structured StepEntry dicts via the full _run_thread_llm path.

## Key files created / modified

- `backend/app/services/llm.py` (modified — added StepEntry; switched GeminiExtractedRecipe.steps; extended _EXTRACT_PROMPT_THREAD; fixed _apply_extracted serialization; fixed extracted_map + safe_extracted steps handling)
- `backend/app/services/llm_fixtures.py` (modified — added StepEntry import; canned_thread_extract uses StepEntry; canned_modified_recipe coerces legacy shapes)
- `backend/tests/test_llm_thread.py` (modified — appended 3 new tests at end of file)

## Commits

| Hash | Type | Subject |
|---|---|---|
| (this commit chain) | test | RED tests for StepEntry in Gemini schema + _apply_extracted serialization |
| (this commit chain) | feat | add StepEntry to llm.py + switch GeminiExtractedRecipe.steps to structured shape |
| (this commit chain) | feat | extend Gemini prompt + persist steps via model_dump + update fixtures |

## Verification

- `cd backend && ENVIRONMENT=test DATABASE_URL_TEST=... uv run pytest tests/test_llm_thread.py` → **50 passed**.
- Adjacent regression check: `tests/test_recipes.py tests/test_turns.py tests/test_recipe_schema_steps.py` → **33 passed**.
- `grep -E "steps: list\[str\]" backend/app/services/llm.py | wc -l` → `0`.
- `grep -c "class StepEntry" backend/app/services/llm.py` → `1`.
- `grep -c "ingredient_refs" backend/app/services/llm.py` → `4` (model field + 2 docstring refs + prompt clause).
- `grep -E "recipe\.steps = extracted\.steps" backend/app/services/llm.py | wc -l` → `0`.
- `grep -c "EXACTEMENT" backend/app/services/llm.py` → `1`.

## Deviations from Plan

**[Rule 0 — Tighter blast radius]** Plan called for 3 tests committed RED separately and Tasks 2/3/4/5/6 each committed individually. Combined RED into one commit (3 tests at once) and Tasks 3-6 into one GREEN commit because they form an atomic change: prompt + persistence + fixture must land together to keep the suite green. Each commit still passes its acceptance criteria; the chain is still bisectable.

**[Rule 1 — Bug surfaced beyond plan]** Plan didn't anticipate that `extracted_map["steps"]` (inside `_run_thread_llm`) and the `safe_extracted.steps = …` reversion would also break under the new shape. Both were fixed in the same commit because they're load-bearing for the existing thread-LLM tests (`test_advisory_emitted_for_pinned_conflict` and friends). The fix mirrors the established `ingredients` handling pattern in both places.

**Total deviations:** 2 (blast-radius compression + extracted_map/safe_extracted fixes). **Impact:** none — all 50 tests in `test_llm_thread.py` pass; adjacent suites green.

## Self-Check: PASSED

- StepEntry declared in both `app/schemas/recipe.py` (42-01) and `app/services/llm.py` (42-02) with identical shape
- GeminiExtractedRecipe.steps emits `list[StepEntry]` — no legacy `list[str]` shape
- Extraction prompt instructs Gemini to use ingredient names verbatim (EXACTEMENT)
- `_apply_extracted` persists step dicts via `model_dump(mode="json")`
- `llm_fixtures` emit `list[StepEntry]` for deterministic test mode
- 3 new tests added; full thread-LLM suite green (50 passed)
