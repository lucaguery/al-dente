---
phase: 42-structured-steps-active-cooking-session
plan: 01
status: complete
requirements:
  - STEP-01
commits:
  - 3751fb9
  - e1917b5
  - e035d2e
  - 1a7ef0b
  - b9ae958
---

# Plan 42-01 SUMMARY — recipes.steps NOT NULL foundation

## What was built

The `recipes.steps NOT NULL DEFAULT '[]'::jsonb` foundation (Phase 42 STEP-01 / D-01..D-03).

- Migration `0013_recipes_steps_not_null.py` — ALTERs the existing nullable JSONB column to `NOT NULL` with `server_default '[]'::jsonb`, with a one-shot `UPDATE recipes SET steps = '[]'::jsonb WHERE steps IS NULL` backfill so the constraint succeeds on legacy rows.
- `StepEntry` Pydantic v2 model — `{ text: str (min_length=1), ingredient_refs: list[str] = [] }`.
- `RecipeResponse.steps` — switched from `list[str] | None = None` to `list[StepEntry] = Field(default_factory=list)`. The wire always carries an array; legacy rows surface via the lazy backfill in plan 42-03.
- `RecipeUpdate.steps` — switched to `list[StepEntry] | None = None` (None-means-no-change semantics preserved).
- `Recipe.steps` ORM column — switched from `Mapped[list | None]` nullable to `Mapped[list[dict]]` with `nullable=False`, `server_default=text("'[]'::jsonb")`, `default=list`.
- Two explicit invariant tests in `test_migration_safety.py`:
  - `test_0013_backfills_nulls_and_constrains_not_null` — asserts NULL backfill to `[]`, legacy `list[str]` row untouched, NOT NULL + server_default DDL applied.
  - `test_0013_downgrade_restores_nullable` — asserts `is_nullable='YES'` and no server_default after downgrade to 0012.
- Three new schema tests in `test_recipe_schema_steps.py`:
  - `test_step_entry_requires_text` — text required, ingredient_refs defaults to `[]`, round-trips through `model_dump`.
  - `test_recipe_response_steps_defaults_empty_list` — wire always carries `[]`, never `None`.
  - `test_recipe_response_accepts_step_entry_list` — `list[StepEntry]` round-trips to `[{text, ingredient_refs}]`.

The parametrized chain walker `test_migration_upgrade_then_downgrade_runs_clean` auto-picked up revision 0013 — the Phase 39 migration safety gate now covers it without any further wiring.

## Key files created / modified

- `backend/alembic/versions/0013_recipes_steps_not_null.py` (created)
- `backend/app/models/recipe.py` (modified — line 77 column)
- `backend/app/schemas/recipe.py` (modified — added StepEntry, switched RecipeResponse.steps + RecipeUpdate.steps)
- `backend/tests/migrations/test_migration_safety.py` (modified — added two explicit 0013 tests + helper)
- `backend/tests/test_recipe_schema_steps.py` (created — 3 tests)

## Commits (5 total)

| Hash | Type | Subject |
|---|---|---|
| 3751fb9 | test | RED tests for 0013 migration invariants |
| e1917b5 | feat | migration 0013 — recipes.steps NOT NULL DEFAULT '[]'::jsonb |
| e035d2e | test | RED schema tests for StepEntry + RecipeResponse.steps |
| 1a7ef0b | feat | StepEntry + update RecipeResponse.steps to structured shape |
| b9ae958 | refactor | align Recipe.steps model column with migration 0013 |

## Verification

- `cd backend && ENVIRONMENT=test DATABASE_URL_TEST=... uv run pytest tests/test_recipe_schema_steps.py tests/migrations/test_migration_safety.py -x` → 16 passed, 1 xfail (known-non-downgradeable 0006).
- `grep -E "steps: list\[str\]" backend/app/schemas/recipe.py | wc -l` → `0`.
- `grep -E "steps: Mapped\[list \| None\]" backend/app/models/recipe.py | wc -l` → `0`.
- `grep -c "op.add_column.*steps" backend/alembic/versions/0013_recipes_steps_not_null.py` → `0` (this is the load-bearing R-01 correction — migration is ALTER, not add).

## Deviations from Plan

**[Rule 2 - Missing critical file]** — Plan referenced `backend/tests/migrations/test_migrations.py`; the actual file is `backend/tests/migrations/test_migration_safety.py` (Phase 39 D-39-02 named it that). Added the two new explicit tests to the real file. The parametrized chain walker auto-discovers 0013, so the Phase 39 contract is fully preserved.

**[Rule 2 - Missing critical file]** — Plan did not direct creation of the new schema test file path explicitly (`backend/tests/test_recipe_schema_steps.py`), but listed it in `files_modified`. Created it with the three tests Task 3 specified.

**[Rule 1 - Bug]** — Initial test seed used `members.display_name` and `members.color`; actual columns are `name` and `color_hex`. Fixed in the same commit as migration 0013 (commit e1917b5).

**Total deviations:** 3 auto-fixed (2 missing-file fallbacks + 1 incorrect-column-name bug). **Impact:** none — all five `<acceptance_criteria>` blocks for tasks 1-5 met, all `<verification>` greps return the expected counts.

## Self-Check: PASSED

- All 5 tasks executed with atomic commits
- Migration 0013 lands and chains to 0012 (chain walker passed parametrized 0013 case)
- `StepEntry` is the single Python source of truth for step shape
- `RecipeResponse.steps` is `list[StepEntry]` with default `[]` (never None)
- `Recipe.steps` model column is non-nullable `list[dict]` with server_default `'[]'`
- 5 new tests added (2 migration invariant + 3 schema); 16 passed, 1 xfail (pre-existing)
- No `list[str]` shape remains anywhere for steps
- SUMMARY.md committed atomically with this write
