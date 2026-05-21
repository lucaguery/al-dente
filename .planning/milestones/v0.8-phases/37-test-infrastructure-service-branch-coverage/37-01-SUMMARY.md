---
phase: 37-test-infrastructure-service-branch-coverage
plan: "01"
subsystem: backend-tests
tags: [pytest, fixtures, test-infrastructure, coverage, svg-sanitizer]
dependency_graph:
  requires: []
  provides: [autouse-seed-fixture, svg-sanitizer-test-relocated, coverage-baseline-v2]
  affects: [backend/tests/conftest.py, backend/tests/test_svg_sanitizer.py]
tech_stack:
  added: []
  patterns: [autouse-session-scoped-fixture, git-mv-history-preservation]
key_files:
  created: [backend/tests/test_svg_sanitizer.py]
  modified: [backend/tests/conftest.py, backend/app/services/svg_sanitizer_test.py (deleted via git mv)]
decisions:
  - "D-37-01: autouse session-scoped _seeded_database fixture calls _guard_environment() then run_test_seed() via lazy import — not main() to avoid argv re-parsing"
  - "D-37-02: git mv preserves history for svg_sanitizer_test.py relocation"
  - "Rule 3 deviation: forward-ported pytest-cov from main (commit 4e24da6) which the worktree was missing due to branch point predating the quick-plan commit"
metrics:
  duration: "~9 minutes"
  completed: "2026-05-19"
  tasks_completed: 3
  files_modified: 4
---

# Phase 37 Plan 01: Test Infrastructure + Seed Fixture Summary

**One-liner:** Autouse session-scoped seed fixture unblocks 113 previously-failing tests; svg_sanitizer_test.py relocated from app/services/ to tests/ removing 77 phantom source statements from coverage.

## Result

| Metric | Before (baseline) | After (Plan 37-01) |
|--------|-------------------|--------------------|
| Tests passed | 63 | 176 |
| Tests failed | 96 | 16 |
| Errors | 2 | 0 |
| Total collected | 161 | 192 |
| Line coverage (TOTAL) | 35.9% | 58.6% |
| Branch coverage (TOTAL) | 6.8% (49/722) | ~58.6% (70 branch-partial) |
| Statements measured | 2699 | 2622 (-77, svg_sanitizer_test.py gone) |

Note: Total collected grew from 161 to 192 because the relocated `test_svg_sanitizer.py` is now discovered by pytest (31 tests that were previously invisible to the test runner — they lived under `app/services/` which is not in `testpaths`).

## Rules Files — Before vs After

| File | Before % | Before Stmts | Before Missing | After % | After Stmts | After Missing |
|------|----------|--------------|----------------|---------|-------------|---------------|
| app/services/voting.py | 35.5% | 23 | 12 | 35.5% | 23 | 12 |
| app/services/algorithm.py | 17.6% | 81 | 60 | 17.6% | 81 | 60 |
| app/services/shortlist.py | 22.0% | 66 | 48 | 22.0% | 66 | 48 |
| app/auth.py | 82.5% | 30 | 4 | 82.5% | 30 | 4 |

Rules files are unchanged — as expected. Plan 37-01 was infrastructure-only; Plans 37-02 and 37-03 will drive these to 100%.

## Coverage Delta Highlights

Notable files that jumped significantly due to previously-failing tests now running:

| File | Before % | After % | Delta |
|------|----------|---------|-------|
| app/services/llm.py | 13.4% | 65.4% | +52.0 pp |
| app/services/svg_sanitizer.py | 14.4% | 91.3% | +76.9 pp |
| app/routers/recipes.py | 15.4% | 48.0% | +32.6 pp |
| app/routers/cooking_logs.py | 21.5% | 66.3% | +44.8 pp |
| app/services/thread.py | — | 87.0% | new measurement |
| app/main.py | 75.9% | 85.2% | +9.3 pp |
| app/services/svg_sanitizer_test.py | 0.0% (77 stmts) | **GONE** | file relocated |

## svg_sanitizer_test.py Relocation Confirmed

- `backend/app/services/svg_sanitizer_test.py` — **does not exist** (verified: `test ! -f` returns 0)
- `backend/tests/test_svg_sanitizer.py` — **exists and passes** (31/31 tests pass at new location)
- `git log --follow backend/tests/test_svg_sanitizer.py` shows commits `7198658`, `ae66afe`, `9b92d9a` (history preserved via `git mv`)
- Coverage table for the full run does NOT contain `app/services/svg_sanitizer_test.py` row (confirmed from `--cov-report=term-missing` output)

## Autouse Fixture Shape (D-37-01)

Added to `backend/tests/conftest.py` after existing fixtures:

```python
@pytest.fixture(scope="session", autouse=True)
def _seeded_database() -> Generator[None, None, None]:
    from app.cli.seed import _guard_environment, run_test_seed
    try:
        _guard_environment()
        run_test_seed()
    except SystemExit as exc:
        pytest.fail(...)
    except Exception as exc:
        pytest.fail(...)
    yield
```

Existing `db_session` and `client` fixtures are unmodified (scope_fence enforced).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Forward-ported pytest-cov from main**
- **Found during:** Task 3 verification
- **Issue:** The worktree branched from `5437ca0` which predates commit `4e24da6` (quick-260519-uxn) that added `pytest-cov>=5.0` to `backend/pyproject.toml`. Running `pytest --cov=app` raised `unrecognized arguments` error.
- **Fix:** Applied the same `pyproject.toml` and `.gitignore` changes from `4e24da6` into the worktree, then ran `uv sync --dev`. No source files touched.
- **Files modified:** `backend/pyproject.toml`, `backend/.gitignore`, `backend/uv.lock`
- **Commit:** `770b1fd`

## Remaining Failures (16) — Pre-existing Bugs, Not Plan 37-01 Regressions

Per scope_fence and Task 3 acceptance criteria, these are documented as follow-up TODOs. No source files were patched.

### Category A: db_session.commit() ordering bug (14 tests in test_turns.py)

**Root cause:** Several tests in `test_turns.py` call `db_session.commit()` inside the test body (e.g. line 107). The `db_session` fixture wraps a connection-level transaction that is rolled back at teardown. Calling `.commit()` inside a test commits the outer transaction, closing it. Subsequent tests receive a `db_session` whose connection no longer has the connection-scoped transaction the fixture expects — so `_seeded_member(db_session)` cannot find the seeded member.

**Evidence:** All 15 turns tests pass when run in isolation (`pytest tests/test_turns.py`). They fail only when preceded by tests that left `db_session` in a committed state.

**Affected tests:** All `test_turns.py` tests that call `_seeded_member(db_session)` after a prior test committed the session.

**Follow-up TODO:** Fix `test_turns.py` to use `db_session.flush()` instead of `db_session.commit()` where the test only needs writes visible within the same connection, OR restructure to use `db.begin_nested()` (SAVEPOINT) for in-test isolation.

### Category B: Pre-existing DetachedInstanceError (1 test)

**Test:** `test_llm_thread.py::test_process_thread_turn_failure_records_on_turn_payload`
**Root cause:** Test monkeypatches `SessionLocal` to return `db_session`, but `process_thread_turn` (an async function) closes/detaches the session during execution. The test then tries to `expire_all()` and reload attributes from a detached instance.
**Fails:** In isolation too (confirmed with `pytest tests/test_llm_thread.py::test_process_thread_turn_failure_records_on_turn_payload`).
**Follow-up TODO:** The monkeypatch approach for `SessionLocal` is incompatible with the async LLM service's session lifecycle. Needs a different isolation strategy (e.g. a real session with explicit cleanup, not the connection-scoped rollback fixture).

### Category C: Pre-existing LLM question emission failure (1 test)

**Test:** `test_question_endpoints.py::test_defer_suppresses_question_in_run_thread_llm`
**Root cause:** Test asserts that `_run_thread_llm` emits a question turn after deferral is cleared, but `len(question_turns_after) == 0`. This is an LLM stub behavior mismatch — the canned stub used in test mode doesn't emit question turns in all scenarios the test expects.
**Fails:** In isolation too (confirmed).
**Follow-up TODO:** Review `llm_fixtures.py` canned response to ensure it produces question turns for the test scenario's recipe context.

## Known Stubs

None — this plan adds only fixtures and relocates a test file. No UI-rendering components or data-source stubs introduced.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- `backend/tests/conftest.py` exists and contains `scope="session", autouse=True` ✓
- `backend/tests/test_svg_sanitizer.py` exists ✓
- `backend/app/services/svg_sanitizer_test.py` does not exist ✓
- Commits `3fa62dc`, `7198658`, `770b1fd` exist in git log ✓
- Coverage table shows `app/services/svg_sanitizer_test.py` is absent ✓
- 176 tests pass (up from 63); 16 remaining failures are pre-existing bugs documented above ✓
