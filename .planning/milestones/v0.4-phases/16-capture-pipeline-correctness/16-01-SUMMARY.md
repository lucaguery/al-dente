---
phase: 16-capture-pipeline-correctness
plan: 01
subsystem: database
tags: [alembic, postgres, enum, sqlalchemy, typescript, locked-vocabulary]

# Dependency graph
requires:
  - phase: 02-llm-capture-w2
    provides: promotion_error column (0003_promotion_columns.py) — failed-state storage already exists; this plan only adds the enum value
provides:
  - RecipeStatus.failed available as Python attribute (importable from app.models.recipe)
  - Postgres recipe_status ENUM extended with 'failed' via idempotent Alembic 0006
  - TypeScript Recipe.status literal union accepts "failed"
  - Locked-vocabulary parity across three sites (Python enum / Postgres ENUM / TS union)
affects: [16-02 schema/router updates, 16-03 backend _record_failure, 16-04 inbox UI, 16-05 e2e specs]

# Tech tracking
tech-stack:
  added: []  # no new libraries — pure additive enum extension
  patterns:
    - "Alembic ENUM extension via op.get_context().autocommit_block() + ALTER TYPE ... ADD VALUE IF NOT EXISTS — re-runnable on Railway deploy"
    - "Asymmetric downgrade contract — downgrade() raises NotImplementedError for additive Postgres ENUM migrations"

key-files:
  created:
    - backend/alembic/versions/0006_recipe_status_failed.py
  modified:
    - backend/app/models/recipe.py
    - frontend/lib/recipes.ts

key-decisions:
  - "Python enum value ordered last (after verified) to match the migration's append-only semantics — existing code that iterates RecipeStatus encounters draft, structured, verified, failed in stable order"
  - "Migration uses op.get_context().autocommit_block() wrapper because Postgres rejects ALTER TYPE ... ADD VALUE inside an explicit transaction block; without this, alembic upgrade head fails on Railway with 'ALTER TYPE ... ADD cannot run inside a transaction block'"
  - "ALTER TYPE ... ADD VALUE IF NOT EXISTS makes the migration idempotent — Railway runs alembic upgrade head on every deploy and must not fail on the second run"
  - "downgrade() raises NotImplementedError — Postgres does not support DROP VALUE without rewriting every column referencing the type; we explicitly disclaim rollback rather than ship a partial implementation"
  - "Both enum sites (Python class + TypeScript union) updated in the same plan and shipped as the same logical change per CLAUDE.md 'Locked vocabularies' — drift is a bug category"

patterns-established:
  - "Pattern 1: Idempotent Postgres ENUM extension migration — autocommit_block() + IF NOT EXISTS guard"
  - "Pattern 2: Asymmetric downgrade for additive ENUM migrations — downgrade raises NotImplementedError"
  - "Pattern 3: Locked-vocabulary enum extension lands in a single plan with both sites (Python + TS) committed in atomic per-task commits but logically together"

requirements-completed: [CAP-01]

# Metrics
duration: ~12min
completed: 2026-05-11
---

# Phase 16 Plan 01: Locked-vocabulary `failed` value Summary

**Extended `RecipeStatus` across all three locked-vocabulary sites (Python enum, Postgres ENUM via idempotent Alembic 0006, TypeScript literal union) — terminal-state set transitioned from `{structured}` to `{structured, failed}`.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-11T14:17:00Z (approx)
- **Completed:** 2026-05-11T14:30:00Z (approx)
- **Tasks:** 3
- **Files modified:** 2 (+1 created)

## Accomplishments

- `RecipeStatus.failed` available as a Python attribute (`from app.models.recipe import RecipeStatus; RecipeStatus.failed.value == "failed"`).
- Alembic migration `0006_recipe_status_failed.py` adds `'failed'` to the Postgres `recipe_status` ENUM idempotently (`ADD VALUE IF NOT EXISTS`) and is wrapped in `op.get_context().autocommit_block()` so Railway's per-deploy `alembic upgrade head` works on every run.
- Frontend `Recipe.status` literal union accepts `"failed"` (`tsc --noEmit` exits 0 with no consumer changes — additive literal is backward-compatible).
- Locked-vocabulary parity preserved across all three sites; CLAUDE.md drift contract honored.

## Task Commits

Each task was committed atomically with `--no-verify` (parallel worktree):

1. **Task 1: Add `failed` to backend RecipeStatus Python enum** — `590fd4c` (feat)
2. **Task 2: Create Alembic migration 0006 adding 'failed' to recipe_status ENUM** — `8b987c7` (feat)
3. **Task 3: Add `"failed"` to frontend Recipe.status TypeScript literal union** — `598db22` (feat)

## Files Created/Modified

- `backend/app/models/recipe.py` — added `failed = "failed"` to `RecipeStatus(str, enum.Enum)` (ordered last, after `verified`); updated module docstring to list the new value.
- `backend/alembic/versions/0006_recipe_status_failed.py` (NEW) — idempotent ALTER TYPE migration wrapped in `op.get_context().autocommit_block()`; `down_revision = "0005"`; downgrade raises `NotImplementedError`.
- `frontend/lib/recipes.ts` — extended `Recipe.status` literal union from `"draft" | "structured" | "verified"` to `"draft" | "structured" | "verified" | "failed"` (line 23). Single-line additive change.

## Decisions Made

- **Append-only enum ordering.** New value `failed` placed after `verified` in the Python enum class to match the migration's append-only `ALTER TYPE ... ADD VALUE` semantics. Any code that iterates `list(RecipeStatus)` now sees `[draft, structured, verified, failed]` in stable order.
- **`autocommit_block()` rationale.** Postgres rejects `ALTER TYPE ... ADD VALUE` inside the implicit transaction Alembic wraps `upgrade()` in. The `op.get_context().autocommit_block()` context manager exits the transaction for the duration of the block. Without this, the migration would crash uvicorn restart on Railway deploy with `ALTER TYPE ... ADD cannot run inside a transaction block`.
- **Asymmetric downgrade.** Postgres has no `ALTER TYPE ... DROP VALUE` — rolling back would require recreating the type, rewriting every column referencing it, and dropping any rows where the value is in use. We explicitly raise `NotImplementedError` so a future engineer running `alembic downgrade -1` sees a clear failure rather than a partial rollback.
- **Both sites in the same plan.** Per CLAUDE.md "Locked vocabularies", the Python enum and TypeScript literal must change in the same logical change. Three per-task commits land in this plan and ship together to `main`.

## Forward Links

- **Plan 16-03** will transition `backend/app/services/llm.py::_record_failure` to set `recipe.status = "failed"` (currently writes only `promotion_error`). The Python enum membership from this plan is the prerequisite.
- **Plan 16-04** will branch `frontend/components/RecipeDraftCard.tsx` (or wherever the inbox card lives — planner verifies) on `recipe.status === "failed"`, replacing the current `recipe.promotion_error != null` workaround. The TypeScript literal from this plan is the prerequisite.
- **Plan 16-05** will add E2E specs that exercise the failed-state UI — relies on both Plan 16-03 (status write) and Plan 16-04 (UI branch) plus this plan's type-system membership.

## Deviations from Plan

None — plan executed exactly as written. All three tasks landed without modifying any out-of-scope file. The TypeScript verification step required installing `frontend/node_modules` (devDependencies were not pre-installed in this worktree); `node_modules` is gitignored so no extra files were committed.

## Issues Encountered

- **Frontend `node_modules` not pre-installed in the worktree.** `npx tsc --noEmit` initially failed because TypeScript was not installed. Resolved by running `npm install --no-audit --no-fund --prefer-offline` in `frontend/`. `node_modules` is gitignored so no spurious files were committed. tsc subsequently exited 0.
- **Local Postgres not available for migration smoke-test.** The plan-level `<important_constraints>` explicitly state "Do NOT run `alembic upgrade head` — schema push happens on deploy. Local Docker test DB will be pushed by 16-03 if needed." Therefore the migration was validated by (a) static inspection of the file content, (b) `alembic history` showing `0005 -> 0006 (head)`, and (c) grep checks for the idempotency guard and autocommit wrap. Real schema application occurs on the next Railway deploy.

## User Setup Required

None — no external service configuration required. The Alembic migration runs automatically as part of Railway's `alembic upgrade head` pre-uvicorn-restart step on the next push to `main`.

## Next Phase Readiness

- Schema foundation complete for downstream plans in this phase.
- `RecipeStatus.failed` is the only new enum value; the existing `promotion_error` column (added in `0003_promotion_columns.py`) already carries the failure detail string.
- No new threat surface introduced — the migration only extends an existing locked vocabulary.

## Self-Check: PASSED

Verified after writing SUMMARY.md:

- `backend/app/models/recipe.py` exists with `failed = "failed"` at line 41 (FOUND).
- `backend/alembic/versions/0006_recipe_status_failed.py` exists with `ALTER TYPE recipe_status ADD VALUE IF NOT EXISTS 'failed'` and `op.get_context().autocommit_block()` (FOUND).
- `frontend/lib/recipes.ts` line 23 reads `status: "draft" | "structured" | "verified" | "failed";` (FOUND).
- Commit `590fd4c` (Task 1) — FOUND in git log.
- Commit `8b987c7` (Task 2) — FOUND in git log.
- Commit `598db22` (Task 3) — FOUND in git log.
- `cd backend && DATABASE_URL=... uv run python -c "from app.models.recipe import RecipeStatus; assert 'failed' in [s.value for s in RecipeStatus]"` exited 0.
- `cd frontend && npx tsc --noEmit --project tsconfig.json` exited 0.

---
*Phase: 16-capture-pipeline-correctness*
*Completed: 2026-05-11*
