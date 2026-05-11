---
phase: 17-history-feature-restoration
plan: 01
subsystem: api
tags: [FIX-01, HIST-01, HIST-02, TZ-01, backend, cooking-log, timezone, household-tz, list-endpoint, fastapi, zoneinfo, pytest]

# Dependency graph
requires:
  - phase: 03-decide-w3
    provides: household.timezone column (Phase 3 APScheduler cron)
  - phase: 04-polish-w4
    provides: cooking_logs router structure (COOK-01/02/03/05) + photos.py 404-not-403 contract
  - phase: 15-tier-1-invariant-fixes
    provides: pytest conftest (db_session + client fixtures, port-5433 connection-scoped tx) + atomic UPDATE finalize gate (untouched)
provides:
  - GET /cooking-logs?days=N (HIST-01) — finalized history list, household-scoped, days clamped 1..365, sort cooked_at DESC
  - GET /cooking-logs/{log_id} (HIST-02) — single-row detail read, 404 not 403 cross-household
  - Household-tz-aware "today" boundary in start_cooking + get_active_cooking_log (FIX-01 / TZ-01)
  - _household_today_in_tz + _cooked_at_in_tz_date helpers reusable by future tz-sensitive callsites
  - 10-test pytest regression suite at backend/tests/test_cooking_logs_history.py
affects: [17-02-frontend-cooking-logs-list-detail, 17-03-spec-fixme-removal, future-tz-sensitive-endpoints]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Household-tz boundary via zoneinfo.ZoneInfo with UTC fallback on ZoneInfoNotFoundError + warn log"
    - "SQL date extraction in named tz via func.date(func.timezone(tz_name, column))"
    - "Read-only list/detail endpoints with no broadcast (invariant #4 preserved)"
    - "_FrozenDatetime test double: __getattr__ delegation to stdlib datetime + .now() returning a fixed value, patched via unittest.mock.patch on the importing module's namespace"

key-files:
  created:
    - backend/tests/test_cooking_logs_history.py
  modified:
    - backend/app/routers/cooking_logs.py

key-decisions:
  - "Module-level _household_today_in_tz + _cooked_at_in_tz_date helpers (not inlined) — both TZ-01 callsites share one boundary (D-17-09)"
  - "Invalid IANA timezones fall back to UTC with a warn log instead of raising — keeps the endpoint up while the operator repairs the row"
  - "List endpoint uses cooked_at >= now() - timedelta(days=N), no household-tz needed (relative window, not calendar boundary — D-17-10)"
  - "List excludes unfinalized logs (rating IS NOT NULL); detail allows unfinalized — banner-driven detail page can still load mid-cook"
  - "Detail endpoint placed AFTER finalize_cooking_log (PUT) and AFTER /cooking-logs/active route registration, so FastAPI matcher resolves /cooking-logs/active to the literal-segment route"

patterns-established:
  - "tz-aware boundary helpers: a Python-side (_household_today_in_tz returning DateType) + SQL-side (_cooked_at_in_tz_date returning a func expression) pair using the SAME tz fallback"
  - "_FrozenDatetime patching for time-boundary tests — patch app.routers.MODULE.datetime, not stdlib datetime, so only the module under test sees the frozen clock"
  - "Test helper _drain_active_logs to keep per-test unfinalized-log assertions deterministic across pytest's connection-scoped tx fixture"

requirements-completed: [FIX-01, HIST-01]

# Metrics
duration: 8min
completed: 2026-05-11
---

# Phase 17 Plan 01: Backend reads + TZ-01 fix Summary

**GET /cooking-logs list + GET /cooking-logs/{log_id} detail land in the FastAPI router, and the active-cook 409 + lookup now compute "today" in household.timezone via zoneinfo so the 22:00 Europe/Paris cook stops falling through the UTC offset.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-11T15:48:51Z
- **Completed:** 2026-05-11T15:56:36Z
- **Tasks:** 3 / 3
- **Files modified:** 2 (1 modified + 1 created)

## Accomplishments

- **HIST-01 list endpoint** (`GET /cooking-logs?days=N`): household-scoped, `rating IS NOT NULL`, `cooked_at >= now() - N days`, sorted `cooked_at DESC`, `days` clamped 1..365 (default 30). Reuses `CookingLogResponse` — no eager-loaded recipe data (D-17-02).
- **HIST-02 detail endpoint** (`GET /cooking-logs/{log_id}`): single-row read, household-scoped 404 (never 403) per T-04-01-03, returns finalized OR unfinalized so the banner-driven detail entry still works mid-cook.
- **FIX-01 / TZ-01:** Replaced `DateType.today()` (Python local-tz) at `start_cooking` and `get_active_cooking_log` with `_household_today_in_tz(household)` (Python date in household IANA tz) compared against `_cooked_at_in_tz_date(household)` (`func.date(func.timezone(tz_name, CookingLog.cooked_at))`). Both callsites share the same helper pair (D-17-09).
- **Defensive tz fallback:** Invalid IANA names (legacy `'PST'`, typos) emit `household_invalid_timezone` warning and fall back to UTC so the endpoint doesn't 500 with `ZoneInfoNotFoundError` (D-17 Claude's Discretion).
- **10-test pytest regression** (`backend/tests/test_cooking_logs_history.py`): list shape, days-window filter, unfinalized exclusion, Query clamp, cross-household isolation, detail happy-path, detail 404, TZ boundary same-day vs next-day, invalid-tz fallback, start_cooking 409 boundary.

## Task Commits

Each task was committed atomically (`--no-verify` per orchestrator):

1. **Task 1: Household-tz helper + TZ-01 callsite rewrite** — `81d5561` (fix)
2. **Task 2: GET /cooking-logs list + GET /cooking-logs/{log_id} detail** — `e965abf` (feat)
3. **Task 3: Backend regression test suite (10 tests)** — `57ae986` (test)

## Files Created/Modified

- `backend/app/routers/cooking_logs.py` — Added `_household_today_in_tz` + `_cooked_at_in_tz_date` helpers; rewrote `start_cooking` + `get_active_cooking_log` to use them; added `list_cooking_logs` (GET `/cooking-logs`) and `get_cooking_log` (GET `/cooking-logs/{log_id}`); imports `logging`, `timedelta`, `ZoneInfo`, `ZoneInfoNotFoundError`, `Household`.
- `backend/tests/test_cooking_logs_history.py` — NEW. 10 tests covering HIST-01 list, HIST-02 detail, FIX-01 TZ boundary, defensive invalid-tz fallback, and the symmetric `start_cooking` 409 boundary. Uses Phase 15's `db_session` + `client` fixtures and a `_FrozenDatetime` test double for the boundary tests.

## Decisions Made

- **Module-level `timedelta` import** rather than inline `from datetime import timedelta` inside `list_cooking_logs` (cleaner; matches the style of `datetime`/`timezone` imports already at the top).
- **`db_session.commit()` after `household.timezone` mutation in TZ tests** rather than a flush-only path — the Phase 15 conftest's connection-scoped transaction pattern rolls these back at teardown (verified empirically: `commit()` against the session bound to an outer-tx connection releases a savepoint rather than committing the outer).
- **`caplog.at_level(logging.WARNING, logger="app.routers.cooking_logs")`** in the invalid-tz test to ensure the propagated warning is captured even with custom logging config.
- **`_drain_active_logs` helper** factored from the duplicated drain block in the plan's TZ tests — same shape Phase 15 used in its setup.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Removed transient unused `timedelta` import**
- **Found during:** Task 1 (`uv run ruff check` flagged `timedelta` as unused — it was added in the Task 1 import block per the plan but not used until Task 2).
- **Issue:** Strict ruff config blocks unused imports → would fail Task 1's `ruff check app/routers/cooking_logs.py` done-criteria.
- **Fix:** Removed `timedelta` from the import line during Task 1, then re-added it at the start of Task 2 when the list endpoint actually consumes it.
- **Files modified:** `backend/app/routers/cooking_logs.py`
- **Verification:** `uv run ruff check app/routers/cooking_logs.py` → All checks passed.
- **Committed in:** `81d5561` (Task 1) + `e965abf` (Task 2 — re-added).

**2. [Rule 2 — Missing critical] Test cross-household recipe fixture required `created_by_member_id`**
- **Found during:** Task 3 design (verifying the Recipe model NOT NULL fields before running the cross-household isolation test).
- **Issue:** The plan's stub `Recipe(id=..., household_id=..., title=..., status=..., source_capture=...)` omits the NOT NULL `created_by_member_id` column → would fail integrity check at flush.
- **Fix:** Added `created_by_member_id=other_m.id` plus explicit defaults for the other NOT NULL columns (`photo_paths`, `mood`, `seasonality`, `tags`) so the test inserts a valid row.
- **Files modified:** `backend/tests/test_cooking_logs_history.py`
- **Verification:** `uv run pytest tests/test_cooking_logs_history.py::test_list_cross_household_isolated -q` → passes.
- **Committed in:** `57ae986` (Task 3).

**3. [Rule 3 — Blocking] `color="rose"` in the plan's Member fixture is not the schema field name**
- **Found during:** Task 3 design (reading `backend/app/models/member.py`).
- **Issue:** Plan example uses `color="rose"` but the Member model has `color_hex: str` (a Tailwind 500 hex from `app.colors.MEMBER_COLORS`). `"rose"` is also not a valid value.
- **Fix:** Used `color_hex=MEMBER_COLORS[0]` (the first valid hex from the shared module — drift between this and `frontend/lib/colors.ts` is already a bug class per CLAUDE.md).
- **Files modified:** `backend/tests/test_cooking_logs_history.py`
- **Verification:** `test_list_cross_household_isolated` flush passes.
- **Committed in:** `57ae986` (Task 3).

---

**Total deviations:** 3 auto-fixed (1 blocking ruff-warn, 1 missing critical FK, 1 blocking column-name typo)
**Impact on plan:** All three are mechanical adjustments to the plan's reference snippets to match the live SQLAlchemy model. No scope creep, no business-logic changes.

## Issues Encountered

- **Worktree HEAD was stale.** On entry the worktree pointed at `4dfb7bb` (a v0.2.1 branch checkpoint missing Phase 13-17). Per the `<worktree_branch_check>` directive I reset to the required base `4a06088` (the Phase 17 begin commit). After reset the planning files in `.planning/phases/17-history-feature-restoration/` became visible and the codebase matched the plan's expected line numbers.
- **`.env` autoload would have hit production.** The backend `Settings` requires `DATABASE_URL`. The main repo's `.env` file points at production Supabase, which is forbidden for tests. Avoided this by setting `DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test` explicitly on every test invocation (matches the conftest default).

## User Setup Required

None — backend-only change. No new env vars, no migrations (we use the existing `household.timezone` column from Phase 3), no external service config. Next plans (17-02 frontend, 17-03 spec-fixme removal) build on these endpoints.

## Next Phase Readiness

- Plan 17-02 (frontend list + detail pages) can consume `GET /cooking-logs?days=N` and `GET /cooking-logs/{log_id}` directly via `frontend/lib/cooking.ts`.
- Plan 17-03 (E2E test.fixme removal) — Phase 15's `cooking-log-create-finalize.spec.ts` is unblocked: the active-cook lookup now resolves consistently across the 22:00 Paris boundary, so the double-tap assertion is no longer flaky.
- Realtime contract (invariant #4) untouched: both new GETs are read-only with no `broadcast_to_household` call. No frontend WebSocket handlers need updating.
- Phase 15's atomic-UPDATE finalize gate (`finalize_cooking_log` Step 3) is byte-identical — out-of-scope per Task 1 §action.6 and verified by `tests/test_cooking_logs.py` still passing (3 tests green).

## Self-Check: PASSED

- `backend/app/routers/cooking_logs.py` exists and was modified (Tasks 1 + 2).
- `backend/tests/test_cooking_logs_history.py` exists (Task 3).
- Commit `81d5561` present in `git log --oneline 4a06088..HEAD`.
- Commit `e965abf` present in `git log --oneline 4a06088..HEAD`.
- Commit `57ae986` present in `git log --oneline 4a06088..HEAD`.
- `grep -n "DateType.today()" backend/app/routers/cooking_logs.py` → 0 matches.
- `grep -nE "ZoneInfo|zoneinfo" backend/app/routers/cooking_logs.py` → 8 matches.
- `@router.get("/cooking-logs")` → 1 match (list endpoint).
- `@router.get("/cooking-logs/{log_id}")` → 1 match (detail endpoint).
- `_household_today_in_tz` → 6 references (def + 2 callsites + 3 docstring/comment mentions).
- 10 `def test_*` in `tests/test_cooking_logs_history.py`.
- `uv run pytest tests/test_cooking_logs_history.py -q` → 10 passed.
- `uv run pytest tests/test_cooking_logs.py -q` → 3 passed (Phase 15 unaffected).
- `uv run pytest tests/ -q` → 15 passed (full suite, including Phase 16 recipe tests).
- `uv run ruff check app/routers/cooking_logs.py tests/test_cooking_logs_history.py` → All checks passed.
- `uv run python -c "from app.main import app; print('OK')"` → OK.

---
*Phase: 17-history-feature-restoration*
*Completed: 2026-05-11*
