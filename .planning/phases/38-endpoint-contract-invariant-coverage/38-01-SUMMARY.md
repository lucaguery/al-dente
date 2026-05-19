---
phase: 38-endpoint-contract-invariant-coverage
plan: "01"
subsystem: backend-tests
tags: [pytest, test-isolation, savepoint, seed-idempotency, conftest, prerequisite]
dependency_graph:
  requires: [37-01, 37-02, 37-03]
  provides: [green-test-turns, savepoint-fixture, coverage-baseline-38]
  affects: [backend/tests/conftest.py, backend/tests/test_seed_idempotency.py]
tech_stack:
  added: []
  patterns: [savepoint-nested-transaction, after_transaction_end-event, run_test_seed-idempotent-restore]
key_files:
  created: []
  modified:
    - backend/tests/conftest.py
    - backend/tests/test_seed_idempotency.py
decisions:
  - "Option A (SAVEPOINT in conftest.py) chosen: begin_nested() + after_transaction_end event listener reopens SAVEPOINT after each inner commit; outer transaction rolls back at teardown"
  - "Second root cause found: test_seed_idempotency.py _cleanup_around_test teardown deletes seeded member via raw SessionLocal, must re-seed after cleanup (run_test_seed() added to teardown)"
  - "2 pre-existing failures (Category B + C from 37-01-SUMMARY) remain; they fail in isolation and are out of scope for this plan"
metrics:
  duration: "~20 minutes"
  completed: "2026-05-20"
  tasks_completed: 3
  files_modified: 2
---

# Phase 38 Plan 01: test_turns.py Isolation Fix Summary

**One-liner:** SAVEPOINT wrapper in conftest.py + run_test_seed() re-seed in test_seed_idempotency teardown fixes all 14 test_turns.py isolation failures; coverage rises from 64.5% to 68.6%.

## Result

| Metric | Before (baseline post-37) | After (Plan 38-01) |
|--------|---------------------------|--------------------|
| Tests passed | 288 | 302 |
| Tests failed | 16 | 2 |
| Errors | 0 | 0 |
| test_turns.py passed | 0 (in full suite) | 15 (all) |
| test_turns.py failed | 14 | 0 |
| Line coverage (TOTAL) | 64.5% | 68.6% |

**Note on the 2 remaining failures:** These are the pre-existing Category B and C bugs documented in `37-01-SUMMARY.md`. They fail in isolation (`pytest tests/test_llm_thread.py::test_process_thread_turn_failure_records_on_turn_payload` and `pytest tests/test_question_endpoints.py::test_defer_suppresses_question_in_run_thread_llm` each fail alone). They are not caused by this plan's changes and are explicitly out of scope per D-38-07.

## Fix Shape Decision

**Option A chosen (SAVEPOINT in conftest.py).** The plan allowed Option A (SAVEPOINT) or Option B (flush rewrite). Option A requires ~50 lines of conftest change and zero test_turns.py edits, while Option B would require ~14 surgical edits across test_turns.py. Option A was chosen for smaller diff and separation of concerns.

### Two Root Causes Fixed

The 37-01-SUMMARY documented Category A as "db_session.commit() inside tests commits the outer transaction". Investigation revealed there were actually two distinct root causes:

**Root Cause 1: db_session.commit() escaping outer transaction** (Category A from 37-01-SUMMARY)

Tests in `test_turns.py` call `db_session.commit()` after arranging test state (e.g. flushing a recipe + turn). The `db_session` fixture wraps a connection-level transaction. When `commit()` is called, it commits that outer connection-level transaction, making the `teardown rollback()` a no-op. Subsequent tests get a fresh fixture with a new connection-level transaction — but without the SAVEPOINT protection, any commit in the current session escalated to the outer level.

**Fix:** Added `begin_nested()` SAVEPOINT after the outer transaction. Registered `after_transaction_end` event listener that reopens a fresh SAVEPOINT whenever the inner one ends (due to `commit()` or rollback from HTTP error handling). The outer transaction is NEVER committed — it rolls back at teardown.

**Root Cause 2: test_seed_idempotency.py teardown deleting committed seed data**

`test_seed_idempotency.py` has an `autouse=True` fixture `_cleanup_around_test` that calls `_cleanup()` before and after each test. `_cleanup()` uses `SessionLocal()` (the production app session, not the test transaction) and issues DELETE statements that permanently remove the seeded household/member rows committed by `_seeded_database` at session scope.

Since `test_seed_idempotency.py` runs alphabetically before `test_turns.py`, the teardown `_cleanup()` deleted the seeded member before any `test_turns.py` test ran, causing all `_seeded_member(db_session)` calls to fail with "seed Postgres has no member with auth_token='test-token-luca'".

**Fix:** Added `run_test_seed()` call after `_cleanup()` in the teardown path to restore seed data. `run_test_seed()` uses `db.merge()` which is idempotent — it re-inserts the household/member rows using stable UUIDs.

## Implementation Detail: SAVEPOINT Pattern

```python
# In db_session fixture (conftest.py):
connection = _engine.connect()
transaction = connection.begin()       # outer tx — NEVER committed
session = _TestSessionLocal(bind=connection)
nested = connection.begin_nested()      # first SAVEPOINT

@event.listens_for(session, "after_transaction_end")
def _reopen_savepoint(session, transaction):
    nonlocal nested
    if not connection.closed and connection.in_transaction():
        nested = connection.begin_nested()   # reopen after each commit

yield session
# teardown:
session.close()
transaction.rollback()    # rolls back EVERYTHING, including inner commits
connection.close()
```

SQLAlchemy 2.0 + psycopg2 verified. Reference:
https://docs.sqlalchemy.org/en/20/orm/session_transaction.html
§joining-a-session-into-an-external-transaction-such-as-for-test-suites

### SAWarnings: "nested transaction already deassociated"

The fix produces `SAWarning: nested transaction already deassociated from connection` on some test_turns.py tests. These occur when the HTTP router's `db.commit()` inside a request handler consumes the current SAVEPOINT before the test body's `db_session.commit()` runs. The event listener reopens a fresh SAVEPOINT, but SQLAlchemy warns that the previous nested transaction was already ended.

These warnings indicate correct behavior — the SAVEPOINT is being consumed and reopened as designed. They do NOT indicate failures.

## No source file under backend/app/ modified

`git diff HEAD~1..HEAD -- backend/app/` returns empty. D-38-07 enforcement: VERIFIED.

## Coverage Baseline for Plan 38-04

Repo line coverage after this plan: **68.6%** (up from 64.5%).

The 14 previously-failing test_turns.py tests now contribute coverage to:
- `app/routers/recipes.py` (turns endpoints)
- `app/services/thread.py`
- `app/services/llm.py` (url turn extraction path)

## Follow-up TODOs (out of scope for Plan 38-01)

1. **Category B (test_llm_thread.py::test_process_thread_turn_failure_records_on_turn_payload):** The monkeypatch approach for `SessionLocal` is incompatible with the async LLM service's session lifecycle — session closes/detaches during execution, then `expire_all()` fails. Needs a real session with explicit cleanup (not the connection-scoped rollback fixture).

2. **Category C (test_question_endpoints.py::test_defer_suppresses_question_in_run_thread_llm):** LLM stub behavior mismatch — the canned stub used in test mode doesn't emit question turns in all scenarios the test expects. Review `llm_fixtures.py` canned response to ensure it produces question turns for the test scenario's recipe context.

3. **SAWarnings cleanup:** The "nested transaction already deassociated" warnings are functional but noisy. A future improvement could restructure the tests that make HTTP requests then call `db_session.commit()` to use `db_session.flush()` instead (the commit is only needed because the BackgroundTask's `SessionLocal` monkeypatch needs to see the rows — but flush is sufficient for that).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Second root cause: test_seed_idempotency.py teardown deletes seed data**
- **Found during:** Task 1 (diagnosis)
- **Issue:** Plan described only one root cause (db_session.commit() escaping outer tx). Investigation revealed a second cause: `test_seed_idempotency.py::_cleanup_around_test` teardown uses `SessionLocal()` + DELETE to permanently remove seeded member rows, causing all downstream `_seeded_member()` lookups to fail.
- **Fix:** Added `run_test_seed()` call at end of `_cleanup_around_test` teardown to restore seed data. One import line + one function call added.
- **Files modified:** `backend/tests/test_seed_idempotency.py`
- **Commit:** `cd4d074`

**2. [Deviation from scope] test_seed_idempotency.py modified (not listed in scope_fence)**
- The plan's scope_fence lists only `test_turns.py` and `conftest.py`. Modifying `test_seed_idempotency.py` is a Rule 3 auto-fix for a blocking issue: the 14 test_turns.py failures cannot be fixed without also fixing the teardown that deletes seed data.
- `test_seed_idempotency.py` is a test file, not `backend/app/` source — it does not violate D-38-07.

## Known Stubs

None — this plan modifies only test fixtures and test scaffolding. No UI-rendering components or data-source stubs introduced.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- `backend/tests/conftest.py` contains `begin_nested()` and `after_transaction_end` event listener ✓
- `backend/tests/test_seed_idempotency.py` teardown calls `run_test_seed()` ✓
- `git diff HEAD~1..HEAD -- backend/app/` is empty (no source files touched) ✓
- Commit `cd4d074` exists in git log ✓
- Full suite: 302 passed / 2 failed (2 pre-existing Category B+C, fail in isolation) ✓
- test_turns.py: 15 passed / 0 failed ✓
- Repo coverage: 68.6% ≥ 64.5% baseline ✓
