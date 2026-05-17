---
phase: 29-llm-prompt-rework-completeness-wire-up
plan: "01"
subsystem: backend/schema, backend/models, frontend/types
tags: [alembic, sqlalchemy, pydantic, typescript, schema-migration]
dependency_graph:
  requires: []
  provides: [recipes.questions_deferred_until column, RecipeResponse.questions_deferred_until, Recipe.questions_deferred_until]
  affects: [backend/app/services/llm.py (Wave 2 question emission gate), frontend/components/RecipeThread/SystemBubble.tsx (Wave 3 CTA wire-up)]
tech_stack:
  added: []
  patterns: [SQLAlchemy 2.0 Mapped[datetime | None] column, Pydantic Optional[datetime] = None field, TypeScript optional nullable string field]
key_files:
  created:
    - backend/alembic/versions/0011_add_questions_deferred_until.py
  modified:
    - backend/app/models/recipe.py
    - backend/app/schemas/recipe.py
    - frontend/lib/recipes.ts
decisions:
  - "revision 0011 skips 0010 — no Phase 26 migration shipped; chain is 0009 → 0011"
  - "questions_deferred_until placed immediately after last_cooked_at in all three mirror sites for visual grouping"
  - "manually_edited_fields restored from HEAD before adding new field (worktree working-tree was pre-Phase28 state after reset --soft)"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-17"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 4
requirements: [LLM-03]
---

# Phase 29 Plan 01: Schema Foundation — questions_deferred_until Summary

Wave 1 slice 1 of 3: Alembic migration 0011 adds `recipes.questions_deferred_until` (nullable timestamptz), mirrored at the SQLAlchemy ORM level, the Pydantic RecipeResponse, and the frontend Recipe type — wiring the 24h question-deferral gate end-to-end before Wave 2 emits questions.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Alembic migration 0011 + ORM column | `48de40d` | `backend/alembic/versions/0011_add_questions_deferred_until.py`, `backend/app/models/recipe.py` |
| 2 | Mirror on RecipeResponse + frontend Recipe type | `30b2a8c` | `backend/app/schemas/recipe.py`, `frontend/lib/recipes.ts` |

## Verification Results

### Migration Round-Trip

```
INFO [alembic.runtime.migration] Running upgrade 0009 -> 0011, Phase 29 D-21 — add recipes.questions_deferred_until.
INFO [alembic.runtime.migration] Running downgrade 0011 -> 0009, Phase 29 D-21 — add recipes.questions_deferred_until.
INFO [alembic.runtime.migration] Running upgrade 0009 -> 0011, Phase 29 D-21 — add recipes.questions_deferred_until.
ORM check: OK
```

### ORM Mapper

`python -c "from app.models.recipe import Recipe; assert 'questions_deferred_until' in Recipe.__mapper__.columns.keys()"` — exits 0.

### Pydantic Schema

`python -c "from app.schemas.recipe import RecipeResponse; assert 'questions_deferred_until' in RecipeResponse.model_fields; assert RecipeResponse.model_fields['questions_deferred_until'].default is None"` — exits 0.

### TypeScript Compilation

`npx tsc --noEmit -p tsconfig.json` — exits 0, no errors mentioning `questions_deferred_until`.

### Pitfall 5 Audit Gate

`grep -c 'manually_edited_fields' backend/app/schemas/recipe.py` → 4 (≥2 required). Confirms Phase 28 restoration (commit `1953997`) is intact.

## Must-Haves Status

| Truth | Status |
|-------|--------|
| `questions_deferred_until` exists as nullable timestamptz on recipes | PASS — migration 0011 verified |
| `RecipeResponse` exposes `questions_deferred_until` on the wire | PASS — Pydantic field with `Optional[datetime] = None` |
| Frontend `Recipe` type carries `questions_deferred_until?: string | null` | PASS — TypeScript field added |
| Migration reversible — downgrade -1 drops cleanly | PASS — round-trip upgrade/downgrade/upgrade succeeded |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree working tree missing Phase 28 fields after reset --soft**

- **Found during:** Task 2
- **Issue:** The `git reset --soft 34a1970b37c453458455ea6e42743ff7aaa4b340` preserved the worktree working tree in the pre-Phase-28-restoration state. The files `backend/app/schemas/recipe.py` and `frontend/lib/recipes.ts` were missing `manually_edited_fields` (which was restored in commit `1953997` but not reflected in the worktree disk state).
- **Fix:** `git checkout HEAD -- backend/app/schemas/recipe.py frontend/lib/recipes.ts` restored the HEAD versions (which include the Phase 28 restoration) before adding the new `questions_deferred_until` field.
- **Files modified:** `backend/app/schemas/recipe.py`, `frontend/lib/recipes.ts`
- **Commit:** Resolved inline before Task 2 commit (`30b2a8c`)

**2. [Rule 3 - Blocking] Worktree missing .env for alembic DB connection**

- **Found during:** Task 1 verification
- **Issue:** The worktree `.venv` had no `.env` file so `uv run alembic upgrade head` failed with `database_url` validation error.
- **Fix:** Copied `.env` from `backend/` into worktree `backend/` directory.
- **Files modified:** `backend/.env` (untracked, not committed — secrets file)

## Known Stubs

None — this plan adds a column declaration only. The column is populated by `POST /recipes/{id}/questions/defer` (Wave 3, Plan 29-05) and read by the LLM emission gate (Wave 2, Plan 29-02). Both consumers are future plans; the column defaulting to NULL is the correct initial state (NULL = questions allowed per D-21).

## Self-Check: PASSED

- `test -f backend/alembic/versions/0011_add_questions_deferred_until.py` → 0 (found)
- `git log --oneline | grep 48de40d` → found
- `git log --oneline | grep 30b2a8c` → found
- `manually_edited_fields` present in schema at line 155 (Pitfall 5 gate)
