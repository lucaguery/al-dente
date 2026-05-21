---
phase: 39-migration-safety-ci-gate
plan: "01"
subsystem: backend/tests/migrations
tags: [alembic, migration-safety, throwaway-db, pytest-fixture, mig-01, mig-02]

dependency_graph:
  requires:
    - "38-04: Phase 38 sealed test surface (85.0% coverage, 521/2 baseline)"
    - "backend/alembic/versions/: 11 migration files (0001..0012 skipping 0010)"
  provides:
    - "backend/tests/migrations/__init__.py: package marker"
    - "backend/tests/migrations/conftest.py: throwaway_database_url fixture + _seeded_database override"
    - "backend/tests/migrations/test_migration_safety.py: 11 parametrized upgrade+downgrade cases"
  affects:
    - "Railway deploy contract: alembic upgrade head verified not to silently rot"

tech_stack:
  added: []
  patterns:
    - "Throwaway-DB pattern: per-test CREATE/DROP of aldente_test_mig_<uuid> via psycopg2 AUTOCOMMIT"
    - "Alembic subprocess invocation with ENVIRONMENT=test + DATABASE_URL_TEST override"
    - "Nearest-conftest autouse override for _seeded_database session fixture"
    - "_KNOWN_NON_DOWNGRADEABLE registry for intentional asymmetric migrations"

key_files:
  created:
    - backend/tests/migrations/__init__.py
    - backend/tests/migrations/conftest.py
    - backend/tests/migrations/test_migration_safety.py
  modified: []

decisions:
  - "xfail 0006 downgrade: Postgres ALTER TYPE ... DROP VALUE is unsupported; migration intentionally raises NotImplementedError (Phase 16 D-16-02). Upgrade is still verified unconditionally."
  - "DATABASE_URL required alongside DATABASE_URL_TEST in subprocess env because pydantic-settings validates it at import time before the D-02 override fires."
  - "pytest.xfail() called imperatively inside the test body (after upgrade passes) rather than via marker, so upgrade is always exercised and only the downgrade step is skipped."

metrics:
  duration: "~20 minutes"
  completed: "2026-05-20"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 39 Plan 01: Migration Safety Summary

Throwaway-DB fixture + parametrized upgrade/downgrade test covering all 11 Alembic revisions. Closes MIG-01 + MIG-02.

## What Was Built

Three new files under `backend/tests/migrations/`:

| File | Purpose |
|------|---------|
| `__init__.py` | Empty package marker — pytest discovers sibling conftest |
| `conftest.py` | `throwaway_database_url` fixture (CREATE/DROP per test) + `_seeded_database` no-op override |
| `test_migration_safety.py` | 11 parametrized cases: `alembic upgrade <rev>` then `alembic downgrade <prev|base>` |

## Migration Test Results

All 11 migrations in `backend/alembic/versions/` were tested:

| # | File | Revision | Down-revision | Upgrade | Downgrade |
|---|------|----------|---------------|---------|-----------|
| 1 | 0001_baseline.py | 0001 | None (base) | PASS | PASS |
| 2 | 0002_drop_pings.py | 0002 | 0001 | PASS | PASS |
| 3 | 0003_promotion_columns.py | 0003 | 0002 | PASS | PASS |
| 4 | 0004_phase3_tables.py | 0004 | 0003 | PASS | PASS |
| 5 | 0005_last_cooked_photo_path.py | 0005 | 0004 | PASS | PASS |
| 6 | 0006_recipe_status_failed.py | 0006 | 0005 | PASS | XFAIL* |
| 7 | 0007_add_recipe_difficulty_cook_time_description.py | 0007 | 0006 | PASS | PASS |
| 8 | 0008_add_recipe_illustration_svg.py | 0008 | 0007 | PASS | PASS |
| 9 | 0009_add_recipe_turns_and_drop_source_capture.py | 0009 | 0008 | PASS | PASS |
| 10 | 0011_add_questions_deferred_until.py | 0011 | 0009 | PASS | PASS |
| 11 | 0012_resanitize_illustration_svg.py | 0012 | 0011 | PASS | PASS |

**pytest result: 10 passed, 1 xfailed — exits 0**

*`0006` XFAIL: Postgres does not support `ALTER TYPE ... DROP VALUE`. The migration's `downgrade()` intentionally raises `NotImplementedError` (documented in `0006_recipe_status_failed.py` docstring, Phase 16 D-16-02). The upgrade step is verified unconditionally — only the downgrade is xfailed. This asymmetric migration follows a well-established Postgres precedent and is tracked in `_KNOWN_NON_DOWNGRADEABLE` in the test file.

## Verification Evidence

### 1. All 11 parametrized cases collected and run

```
collected 11 items
tests/migrations/test_migration_safety.py::...test_migration_upgrade_then_downgrade_runs_clean[0001-base] PASSED
tests/migrations/test_migration_safety.py::...test_migration_upgrade_then_downgrade_runs_clean[0002-0001] PASSED
...
tests/migrations/test_migration_safety.py::...test_migration_upgrade_then_downgrade_runs_clean[0006-0005] XFAIL
...
tests/migrations/test_migration_safety.py::...test_migration_upgrade_then_downgrade_runs_clean[0012-0011] PASSED
======================== 10 passed, 1 xfailed in 17.90s ========================
```

### 2. No throwaway databases leaked

```
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -l | grep aldente_test_mig_ | wc -l
0
```

### 3. Parent test suite unaffected (verified against main repo)

```
cd backend && uv run pytest tests/ --ignore=tests/migrations -q 2>&1 | tail -3
2 failed, 521 passed, 3 skipped, 291 warnings in 6.25s
```
The 521 pass / 2 fail baseline is preserved. The 2 pre-existing failures are Category B+C from Phase 37 (tracked in 37-01-SUMMARY), unrelated to this plan.

### 4. Scope fence: only 3 in-scope files changed

```
git diff --stat HEAD~2 HEAD
backend/tests/migrations/__init__.py              |   0
backend/tests/migrations/conftest.py              | 143 +++++++++++++++
backend/tests/migrations/test_migration_safety.py | 208 ++++++++++++++++++++++
3 files changed, 351 insertions(+)
```

Zero changes under `backend/app/`. Zero changes to `backend/tests/conftest.py`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migration 0006 has intentional non-downgradeable downgrade**

- **Found during:** Task 2 — first run of the full migration test suite
- **Issue:** `alembic downgrade 0006 → 0005` exits 1 with `NotImplementedError` because Postgres does not support `ALTER TYPE ... DROP VALUE`. The migration's own docstring documents this as intentional (asymmetric migration pattern).
- **Fix:** Added `_KNOWN_NON_DOWNGRADEABLE` dict to `test_migration_safety.py`. When the revision being tested is in this registry, `pytest.xfail()` is called imperatively after the upgrade step succeeds — so upgrade is always verified and only the downgrade is marked xfail. New non-downgradeable migrations get an entry in `_KNOWN_NON_DOWNGRADEABLE` rather than requiring test file restructuring.
- **Files modified:** `backend/tests/migrations/test_migration_safety.py`
- **Commit:** `95f31e3`

**2. [Rule 3 - Blocking] DATABASE_URL required in subprocess env alongside DATABASE_URL_TEST**

- **Found during:** Task 2 — initial implementation
- **Issue:** `app/config.py` pydantic-settings validates `database_url` as required at import time. The subprocess needs `DATABASE_URL` set (even if `DATABASE_URL_TEST` overrides it) or Settings construction fails with `ValidationError: database_url Field required`.
- **Fix:** Subprocess env includes both `DATABASE_URL=<throwaway_url>` and `DATABASE_URL_TEST=<throwaway_url>`. This is consistent with how pydantic-settings + D-02 override interact (the `database_url_test` swap in `config.py` fires after construction, so `database_url` must be present).
- **Files modified:** `backend/tests/migrations/test_migration_safety.py`
- **Commit:** `95f31e3`

## Requirements Closed

- **MIG-01:** `backend/tests/migrations/conftest.py` provides throwaway-DB fixture, isolated from the connection-scoped txn-rollback fixture in `backend/tests/conftest.py`. Parent autouse seed bypassed for migration tests.
- **MIG-02:** One parametrized test per file in `backend/alembic/versions/*.py` asserts `alembic upgrade <rev>` then `alembic downgrade <prev>` exits 0. Currently 11 tests; new migrations picked up automatically by the glob.

## Self-Check

Files exist:
- `backend/tests/migrations/__init__.py` — FOUND
- `backend/tests/migrations/conftest.py` — FOUND
- `backend/tests/migrations/test_migration_safety.py` — FOUND

Commits exist:
- `c39b367` test(39-01): add migrations test package + throwaway-DB conftest — FOUND
- `95f31e3` feat(39-01): parametrized upgrade+downgrade migration safety test — FOUND

## Self-Check: PASSED
