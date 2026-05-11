---
phase: 16-capture-pipeline-correctness
plan: 03
subsystem: backend
tags: [fastapi, sqlalchemy, pytest, gemini, background-task, failed-state]

# Dependency graph
requires:
  - phase: 16-capture-pipeline-correctness
    plan: 01
    provides: RecipeStatus.failed Python attribute + Postgres ENUM value 'failed' (migration 0006) — the canonical terminal state this plan writes
provides:
  - "_record_failure now flips recipe.status to 'failed' (was: only wrote promotion_error)"
  - "POST /recipes/{id}/retry-promotion resets failed→draft synchronously, guarded against demoting structured"
  - "GET /recipes?status=failed accepted (regex widened to ^(draft|structured|verified|failed)$)"
  - "backend/tests/test_recipes.py — two CAP-01 regression tests pinning the failed-state contract"
affects: [16-04 inbox UI flips from promotion_error!=null to status==='failed', 16-05 e2e specs exercise the full retry path]

# Tech tracking
tech-stack:
  added: []  # no new libraries — pure additive wiring of the failed-state enum value
  patterns:
    - "Unit-level pytest for code paths that span BackgroundTask boundaries — drive _record_failure directly because the BackgroundTask's own SessionLocal() can't see the conftest's rolled-back transaction"
    - "HTTP-layer pytest with tolerant post-state assertion — accept status ∈ {draft, structured} when the BackgroundTask completion races the assertion"

key-files:
  created:
    - backend/tests/test_recipes.py
  modified:
    - backend/app/services/llm.py
    - backend/app/routers/recipes.py

key-decisions:
  - "Unit-level test for the failure path. The HTTP-driven approach in the original plan would require monkeypatching app.services.llm.SessionLocal because the BackgroundTask opens its own session that can't see the conftest's rolled-back transaction. Unit-level _record_failure assertion still validates Plan 16-03 Task 1's contract (status='failed' + truncated error + incremented attempts) and includes a bonus assertion on the D-16-03 500-char truncation. Plan 16-05's E2E spec exercises the full HTTP+BackgroundTask path against the real seeded environment."
  - "Tolerant post-state assertion for the retry test. The retry BackgroundTask runs the real (non-stubbed) extract_from_transcript in test mode, which short-circuits to the canned voice recipe and promotes to 'structured'. Tightening the assertion to '== draft' would race the BackgroundTask. The CORE user-observable contract from D-16-05 ('no longer failed AND error cleared') is what we pin."
  - "String-literal status writes per existing codebase convention. The plan and existing _apply_extracted at llm.py:324 use string-literal 'structured'/'draft' writes (not RecipeStatus.structured), so _record_failure and retry_promote follow suit with 'failed'/'draft'. No new imports introduced."
  - "Migration 0006 pushed to the local test DB (aldente_test). Plan 16-01's SUMMARY explicitly deferred this step to whoever first needs the enum value in test infrastructure — that's this plan. Production push happens on the next Railway deploy."

patterns-established:
  - "Pattern: symmetric terminal-state writes in BackgroundTask helpers (_apply_extracted writes 'structured', _record_failure now writes 'failed')"
  - "Pattern: guarded synchronous status reset in retry endpoint (if recipe.status == 'failed': recipe.status = 'draft') — defends against curl misuse demoting structured recipes"
  - "Pattern: locked-vocabulary regex widening lives in Query(pattern=...) alongside the surface that consumes the new value"

requirements-completed: [CAP-01]  # backend half — Plan 16-04 lands the FE UI half

# Metrics
duration: ~6min
completed: 2026-05-11
---

# Phase 16 Plan 03: Backend failed-state pipeline Summary

**Closed the asymmetry between `_apply_extracted` (success path writes `status='structured'`) and `_record_failure` (was: only wrote `promotion_error`; now writes `status='failed'` alongside). Widened the list endpoint's status filter to accept `failed`, added a guarded `failed→draft` synchronous reset to the retry endpoint, and pinned both contracts with pytest regression coverage.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-11T14:35:23Z
- **Completed:** 2026-05-11T14:41:00Z (approx)
- **Tasks:** 3
- **Files modified:** 2 (+1 created)

## Accomplishments

- `backend/app/services/llm.py::_record_failure` now writes `recipe.status = "failed"` before persisting the truncated error + incrementing attempts. The asymmetry with `_apply_extracted` (success-path; also writes `status` + clears `promotion_error`) is closed. Both BackgroundTask helpers (`promote_voice_draft`, `promote_photo_draft`) inherit the new behavior because they call `_record_failure` in their `except` blocks — no router-level edits required for the failure transition itself.
- `backend/app/routers/recipes.py::list_recipes` accepts `?status=failed`. The regex `^(draft|structured|verified)$` is widened to `^(draft|structured|verified|failed)$`. The inbox dual-fetch in Plan 16-04 depends on this.
- `backend/app/routers/recipes.py::retry_promote` resets `failed → draft` synchronously, observable on a follow-up GET. The reset is guarded by `if recipe.status == "failed":` so a `structured` recipe cannot be demoted via this endpoint (T-16-03-02 tampering mitigation). Member-scoped + household-scoped 404 contract unchanged.
- `backend/tests/test_recipes.py` (NEW, 183 lines) — two regression tests using the Phase 15 conftest fixtures (`db_session` + `client`) and the `SEED_AUTH_TOKEN` Bearer convention from `test_cooking_logs.py`:
  - `test_promotion_failure_sets_failed_state` (unit-level on `_record_failure` + 500-char truncation bonus)
  - `test_retry_promotion_resets_failed_to_draft` (HTTP-level on the retry endpoint)
- Both tests pass under `uv run pytest tests/test_recipes.py -q`. The existing `test_cooking_logs.py` suite still passes (3/3) — no leakage.
- Architecture invariant #1 holds: five capture surfaces, one shape, all returning a draft, all promotion runs server-side in a BackgroundTask, terminal-state set is now `{structured, failed}`.

## Task Commits

Each task was committed atomically with `--no-verify` (parallel worktree):

1. **Task 1: `_record_failure` flips recipe.status to 'failed'** — `429d396` (feat)
2. **Task 2: widen list filter + reset failed→draft on retry** — `450cc5c` (feat)
3. **Task 3: add CAP-01 regression tests for failed-state pipeline** — `364bbb8` (test)

## Files Created/Modified

- `backend/app/services/llm.py` — `_record_failure` now writes `recipe.status = "failed"` (line 351); docstring updated to reference D-16-04 and the FE branch in Plan 16-04. The 500-char truncation contract (D-16-03 / T-02-01-02) is preserved. `_apply_extracted` is unchanged.
- `backend/app/routers/recipes.py` — two surgical edits:
  - `list_recipes` (line 212): status filter regex widened to `^(draft|structured|verified|failed)$` with a Phase 16 CAP-01 comment.
  - `retry_promote` (lines 569-626): added `if recipe.status == "failed": recipe.status = "draft"` guard before the existing `promotion_error = None` clear. Docstring rewritten to reference D-16-05's idempotency contract.
- `backend/tests/test_recipes.py` (NEW) — 183 lines, two test functions, module docstring documenting why the failure-path test is unit-level rather than HTTP-level (BackgroundTask SessionLocal incompatibility with conftest's rolled-back transaction).

## Decisions Made

- **Unit-level pytest for the failure transition.** The original plan called for driving the failure via `client.post("/recipes/voice", ...)` after monkeypatching `app.services.llm.extract_from_transcript`. In practice, the BackgroundTask body opens its own `SessionLocal()` via `app.db.SessionLocal`, which connects to the test DB but cannot see the conftest fixture's rolled-back transaction — the BackgroundTask logs `promote_voice: recipe ... vanished` and exits without writing. Driving `_record_failure(db_session, recipe, RuntimeError(...))` directly bypasses the BackgroundTask boundary and still pins the contract under test (status='failed' + truncated error + incremented attempts). The HTTP+BackgroundTask integration is covered by Plan 16-05's E2E spec against a real seeded environment.
- **Tolerant post-state assertion in the retry test.** After the synchronous reset, the queued `retry_promotion` BackgroundTask re-invokes `extract_from_transcript`, which in test mode returns the canned 'risotto' recipe and promotes to 'structured'. The original plan acknowledged this race and prescribed `assert row.status in ("draft", "structured")` — kept verbatim. The contract we pin is "no longer 'failed' AND error cleared", matching D-16-05.
- **String-literal status writes.** The existing codebase pattern (`_apply_extracted`, all router-level recipe creation, etc.) writes `recipe.status = "structured"` / `"draft"` as string literals. Following suit with `"failed"` / `"draft"` here avoids introducing a new import (RecipeStatus) and matches the locked-vocabulary contract via the value identity. The Postgres ENUM accepts the string verbatim because migration 0006 already added it.
- **Bonus truncation assertion in test 1.** The plan's `<behavior>` section listed four sub-tests; only #1 (status='failed') and #2 (500-char truncation) are practical to assert at the unit level. Both are included in `test_promotion_failure_sets_failed_state` — the function asserts on a short error message first, then re-uses the same row with a 600-char `RuntimeError` to validate truncation.

## Forward Links

- **Plan 16-04 (already complete in parallel worktree)** switches `RecipeDraftCard.isFailed` from `promotion_error != null` to `status === "failed"` and adds the truncated-error context line + AlertDialog confirm per D-16-06. The frontend now has TWO converging signals (legacy `promotion_error != null` and canonical `status === "failed"`) — both yield the same UI.
- **Plan 16-05** will add e2e specs that exercise the failed-state UI end-to-end (force Gemini to fail via env-flag stub → observe `Extraction échouée` label → tap `Réessayer` → observe state flip back to draft). The unit + HTTP coverage from this plan ensures regressions are caught before reaching the e2e layer.
- **`retry_promotion` photo-path** remains `# TODO(productize)` (services/llm.py:421-464). Voice-path retry is the only fully-functional retry route in v0.4; photo retries record a clear error rather than re-downloading from Supabase Storage. Tracked under the productize roadmap.

## Deviations from Plan

- **[Rule 1 — Adaptation] Unit-level test 1 instead of HTTP-driven.** The plan's prescribed approach (`client.post("/recipes/voice", ...)` + monkeypatch `extract_from_transcript`) fails because the BackgroundTask opens its own `SessionLocal()` that can't see the conftest's rolled-back transaction (the recipe row "vanishes" from the BackgroundTask's perspective). Switched to a unit-level assertion on `_record_failure` directly — same contract, no transactional-isolation incompatibility. Documented in test 1's docstring with a forward reference to Plan 16-05's E2E coverage.
- **[Rule 3 — Blocker fix] Pushed migration 0006 to the local test DB.** The test DB was at alembic version 0005; migration 0006 (delivered by Plan 16-01) was not yet applied. Ran `DATABASE_URL=... uv run alembic upgrade head` against `postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test` to add `'failed'` to the `recipe_status` ENUM. Plan 16-01's SUMMARY explicitly deferred this push to whoever first needs the enum value in test infra — that's this plan. Production / CI push happens on the next Railway deploy (their pre-uvicorn `alembic upgrade head` is idempotent thanks to the `IF NOT EXISTS` guard in 0006).
- **[Rule 1 — Adaptation] Test path corrections.** The plan's listed test paths used `/api/recipes/...` but the FastAPI app mounts the recipes router at `/recipes/...` (no `/api` prefix — confirmed via inspecting `app.routes`). Corrected both test paths to drop the `/api` prefix. The frontend's same-origin `proxy.ts` rewrites `/api/*` to `/*` so production traffic reaches the same endpoints; the FastAPI app itself only sees `/recipes/...`.

## Authentication Gates

None — no auth steps required. All tests run against the seeded `test-token-luca` Bearer in the local test database. The Phase 15 conftest fixtures handle session lifecycle.

## Issues Encountered

- **Worktree base mismatch.** The orchestrator prompt specified `be6afe459855716455c9338b07b81710ecf80846` as the expected merge-base, but that commit does not exist anywhere in the repo. The worktree was checked out at `4dfb7bb` (pre-Phase-16) which lacked the `RecipeStatus.failed` enum needed by this plan. Reset to `3dae27a` (Plan 16-01 SUMMARY) so all 16-01 work is present. The expected base in the prompt appears to be a misconfiguration; no committed work was lost.
- **STATE.md / config.json modified by the orchestrator.** The parent agent left STATE.md and `.planning/config.json` with uncommitted modifications in the worktree. Per the prompt's `Do NOT update STATE.md or ROADMAP.md` constraint, these are NOT committed — left untracked for the orchestrator to handle.
- **rtk-rewritten psql.** Tried `psql -c "SELECT enum_range(...)"` to inspect the test DB; rtk rewrote the command to its own subcommand surface. Fell back to inline SQLAlchemy from `uv run python` to query the enum — same outcome.

## User Setup Required

None — all changes are server-side, the migration is already applied to the test DB locally, and Railway runs `alembic upgrade head` on the next deploy. No external service configuration.

## Threat Flags

None — this plan only widens an existing endpoint's accepted status filter values, adds a guarded synchronous state reset inside the already-scoped retry endpoint, and adds a test file. No new network endpoints, no new auth paths, no new file access patterns, no schema changes at trust boundaries (the schema change landed in Plan 16-01).

## Self-Check: PASSED

Verified after writing SUMMARY.md:

- `backend/app/services/llm.py` line 351 reads `recipe.status = "failed"` (FOUND).
- `backend/app/routers/recipes.py` line 212 reads `pattern="^(draft|structured|verified|failed)$"` (FOUND).
- `backend/app/routers/recipes.py` line 611 reads `if recipe.status == "failed":` (FOUND).
- `backend/tests/test_recipes.py` exists, 183 lines, 2 `def test_*` functions (FOUND).
- Commit `429d396` (Task 1) — FOUND in git log.
- Commit `450cc5c` (Task 2) — FOUND in git log.
- Commit `364bbb8` (Task 3) — FOUND in git log.
- `cd backend && DATABASE_URL_TEST=... uv run pytest tests/test_recipes.py -q --tb=short` exited 0 (2 passed).
- `cd backend && DATABASE_URL_TEST=... uv run pytest tests/test_cooking_logs.py -q` exited 0 (3 passed — no leakage).
- `cd backend && uv run python -c "from app.main import app; print('OK')"` exited 0.

---
*Phase: 16-capture-pipeline-correctness*
*Completed: 2026-05-11*
