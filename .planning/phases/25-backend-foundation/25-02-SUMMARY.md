---
phase: "25"
plan: "02"
subsystem: backend
tags: [recipe-turns, llm-service, capture-pipeline, promotion, seed, tests]
dependency_graph:
  requires: [25-01]
  provides: [promote_draft, initial_turn_kind, download_recipe_photo, recipe_turns_seed]
  affects: [routers/recipes.py, services/llm.py, services/storage.py, schemas/recipe.py, cli/seed.py, tests]
tech_stack:
  added: []
  patterns:
    - ON CONFLICT DO UPDATE for idempotent turn upserts (UNIQUE recipe_id+position)
    - Subquery batch-load to avoid N+1 on GET /recipes list (initial_turn_kind)
    - BackgroundTask opens own SessionLocal (Pitfall 3 from RESEARCH.md)
    - Photo bytes flow: router uploads to Storage → paths in turn payload → BackgroundTask downloads
key_files:
  created: []
  modified:
    - backend/app/services/llm.py
    - backend/app/services/storage.py
    - backend/app/routers/recipes.py
    - backend/app/schemas/recipe.py
    - backend/app/cli/seed.py
    - backend/tests/test_recipes.py
    - backend/tests/test_cooking_logs_history.py
    - backend/app/services/llm_fixtures.py
decisions:
  - "promote_draft dispatches on turn.kind (text/voice/photo/url) — single entry point for all five capture surfaces"
  - "Photo bytes uploaded to Storage in the router (D-08), paths stored in both recipe.photo_paths AND turn payload; BackgroundTask uses download_recipe_photo to re-fetch for extraction"
  - "ON CONFLICT DO UPDATE on UNIQUE(recipe_id, position) instead of PK-based db.merge — migration backfilled turns with random UUIDs so PK-based upsert would always INSERT and violate the unique constraint"
  - "Subquery JOIN approach for list_recipes initial_turn_kind avoids N+1 without changing the ORM model"
  - "_merge_synthetic bypassed for RecipeTurn inserts (no household_id attribute — assertion incompatible)"
metrics:
  duration: "~3 hours (including worktree reset + migration fix)"
  completed: "2026-05-13T11:09:52Z"
  tasks_completed: 3
  files_modified: 8
---

# Phase 25 Plan 02: recipe_turns Cutover — Backend Foundation Summary

Collapsed all `source_capture` reads and four per-surface `promote_*_draft` functions into the `recipe_turns` shape and a single `promote_draft(recipe_id)` entry point. All five POST capture handlers now insert a position=0 user turn instead of writing `source_capture`. Photos are uploaded to Storage in the router (D-08), paths go into both `recipe.photo_paths` and the turn payload so the BackgroundTask can download them for re-extraction. `initial_turn_kind` is exposed on `RecipeResponse` (synthesized from the first user turn). `uv run seed` inserts turn rows idempotently. All 20 backend tests pass.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Collapse promote_*_draft → promote_draft + download_recipe_photo | d230e3d | services/llm.py, services/storage.py |
| 2 | Rewrite 5 POST handlers + expose initial_turn_kind | 08c52a5 | routers/recipes.py, schemas/recipe.py |
| 3 | Rewrite seed + fix tests + clean stale docstrings | cff5565 | cli/seed.py, tests/test_recipes.py, tests/test_cooking_logs_history.py, llm_fixtures.py, llm.py |

## Verification

```
$ grep -rn "source_capture" backend/app/ backend/tests/ --include="*.py"
(no output — 0 matches)

$ grep -rn "promote_voice_draft\|promote_photo_draft\|promote_quick_draft\|promote_full_draft" backend/ --include="*.py"
(no output — 0 matches)

$ uv run pytest tests/ -q --tb=short
20 passed, 1 warning in 8.16s
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree base was stale (b7b343f, not 2a1e8cbf)**
- Found during: Pre-execution setup
- Issue: Worktree was branched from the wrong base commit, missing the Wave 1 recipe_turns migration
- Fix: `git fetch origin && git reset --hard 2a1e8cbf`
- Files modified: n/a (git operation)

**2. [Rule 3 - Blocking] Test DB missing migration 0009**
- Found during: Task 1 test run
- Issue: `column "manually_edited_fields" of relation "recipes" does not exist`
- Fix: `DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test uv run alembic upgrade head`
- Files modified: n/a (migration operation)

**3. [Rule 1 - Bug] Seed failing with UniqueViolation on recipe_turns**
- Found during: Task 3 seed run
- Issue: Wave 1 migration backfilled turns using `gen_random_uuid()` PKs. Seed's `db.merge(RecipeTurn(id=uuid5_id, ...))` tried to INSERT (PK mismatch), hitting UNIQUE(recipe_id, position) constraint
- Fix: Switched to `pg_insert(RecipeTurn).values(...).on_conflict_do_update(index_elements=["recipe_id", "position"], set_={...})` — upserts on the unique constraint instead of PK
- Files modified: backend/app/cli/seed.py
- Commit: cff5565

**4. [Rule 1 - Bug] _merge_synthetic rejects RecipeTurn**
- Found during: Task 3 seed run (prod-synthetic block)
- Issue: `_assert_synthetic_household` checks for `household_id` attribute; RecipeTurn has no such column
- Fix: Used `db.execute(pg_insert(RecipeTurn)...)` directly for RecipeTurn rows in the prod-synthetic block
- Files modified: backend/app/cli/seed.py
- Commit: cff5565

**5. [Rule 2 - Docstring cleanup] Stale promote_*_draft references in comments**
- Found during: Final grep gate
- Issue: Comments/docstrings in llm.py, llm_fixtures.py, test_recipes.py still named the deleted functions
- Fix: Updated all four occurrences to reference `promote_draft`
- Files modified: llm.py, llm_fixtures.py, tests/test_recipes.py
- Commit: cff5565

## Known Stubs

None — all five capture surfaces fully wired to `promote_draft` with real dispatch logic. URL branch intentionally stamps `status='structured'` without Gemini extraction (CAPTURE-03 explicit deferral to Phase 26 TURN-04, documented in `UrlCaptureRequest` docstring).

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries introduced. The photo bytes flow (router → Storage → BackgroundTask download) was already covered by the existing photo upload threat surface.

## Self-Check: PASSED

- `backend/app/services/llm.py` — exists, contains `promote_draft`
- `backend/app/services/storage.py` — exists, contains `download_recipe_photo`
- `backend/app/schemas/recipe.py` — exists, contains `initial_turn_kind`
- `backend/app/cli/seed.py` — exists, uses ON CONFLICT DO UPDATE for RecipeTurn
- `backend/tests/test_recipes.py` — exists, inserts RecipeTurn fixtures
- `backend/tests/test_cooking_logs_history.py` — exists, inserts RecipeTurn fixture
- Commits d230e3d, 08c52a5, cff5565 — all present in `git log --oneline`
- `uv run pytest tests/ -q` — 20 passed
