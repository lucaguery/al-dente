---
phase: quick-260520-dip
plan: "01"
subsystem: backend/tests
tags: [test-fix, xfail-resolution, llm-fixtures, session-lifecycle]
dependency_graph:
  requires: [39-02]
  provides: [D-39-05-CAT-B, D-39-05-CAT-C]
  affects: [backend/tests/test_llm_thread.py, backend/tests/test_question_endpoints.py, backend/app/services/llm_fixtures.py]
tech_stack:
  added: []
  patterns: [duck-typed-session-adapter, sentinel-prefix-fixture-branch]
key_files:
  created: []
  modified:
    - backend/tests/test_llm_thread.py
    - backend/tests/test_question_endpoints.py
    - backend/app/services/llm_fixtures.py
decisions:
  - "Category B: no-op-close wrapper (duck-typed _NoCloseWrapper) over db_session; avoids restructuring process_thread_turn or the test body"
  - "Category C: cook_time_minutes=None chosen as the missing field for the partial fixture (stepper input type — eligible per D-10/D-11; orthogonal to mood/seasonality which vary in other tests)"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-05-20"
---

# Phase quick-260520-dip Plan 01: Fix 2 D-39-05 xfails Summary

**One-liner:** Removed 2 D-39-05 xfails by fixing `process_thread_turn` session-lifecycle interference with a no-op-close duck-typed wrapper, and extending `canned_thread_extract` with a `__TEST_FORCE_NEW_HASH__` sentinel that returns a partial extract (cook_time_minutes=None) so the defer-cleared question-emission branch is reachable.

## Result

| Metric | Before (39-02 baseline) | After (this task) |
|--------|------------------------|-------------------|
| Tests passed | 540 | **542** |
| Tests xfailed | 3 (2 D-39-05 + 1 migration 0006) | **1** (migration 0006 only) |
| Tests failed | 0 | **0** |
| Tests skipped | 3 | **3** |
| Repo line coverage | 85.08% | **85.47%** |
| Rules-files gate | PASS (4/4 at 100%) | **PASS (4/4 at 100%)** |

## D-39-05 Fix Shapes

### Category B — `test_process_thread_turn_failure_records_on_turn_payload`

**Root cause:** `process_thread_turn` in `app/services/llm.py` opens a session via `SessionLocal()` and unconditionally calls `db.close()` in a `finally` block. When the test monkeypatches `llm_module.SessionLocal` to return the test's `db_session`, the `finally: db.close()` closes that test session mid-test. The subsequent `db_session.expire_all()` + `db_session.scalar(select(...))` calls after `await process_thread_turn(...)` then operate on a closed session, raising `DetachedInstanceError`.

**Fix shape — no-op-close duck-typed wrapper (Plan A):**

A `_NoCloseWrapper` class is defined inline in the test body:
- `close()` is an explicit no-op method — keeps the test session alive past the `finally` block.
- `__getattr__` delegates every other attribute access to the real `db_session` — `commit()`, `scalar()`, `flush()`, etc. all route to the underlying session as before.
- Does NOT subclass `Session` — pure duck-typed adapter, no SQLAlchemy internals touched.
- `monkeypatch.setattr(llm_module, "SessionLocal", lambda: _NoCloseWrapper())` — only this one call site is changed.

The 3 other `SessionLocal` monkeypatches in `test_llm_thread.py` (lines 1037, 1128, 1164) use the original `lambda: db_session` and are left unchanged — those tests do not call `expire_all()` + re-select after the `process_thread_turn` await, so they are not affected by the close.

**Commit:** `6a9c541` — `test: fix Category B — process_thread_turn_failure session lifecycle (D-39-05)`

### Category C — `test_defer_suppresses_question_in_run_thread_llm`

**Root cause:** `canned_thread_extract` (the test-mode LLM fixture) fills ALL fields of `GeminiExtractedRecipe`. After `_apply_extracted` runs, `compute_completeness(recipe)` returns `missing == []` because every field is set. The `for field in missing:` loop in `_run_thread_llm` iterates zero times → `chosen_field` stays `None` → no question turn is emitted. The defer test's Step 5 (assert `len(question_turns_after) >= 1` after clearing deferral) was structurally unreachable.

The test body already inserts a trigger turn with sentinel text `"__TEST_FORCE_NEW_HASH__ ajoute du parmesan"` but the fixture had no branch to consume it.

**Fix shape — sentinel branch in `canned_thread_extract` returning partial extract:**

In `backend/app/services/llm_fixtures.py`:
- Added constant `_FORCE_NEW_HASH_PREFIX = "__TEST_FORCE_NEW_HASH__"` (mirrors the established `_FORCE_FAIL_PREFIX` D-16-13 pattern).
- `canned_thread_extract` now scans text/voice turns for this prefix (force-fail check still runs first — force-fail wins if both sentinels appear in different turns).
- When the sentinel is matched, returns a second `GeminiExtractedRecipe` shape with:
  - `cook_time_minutes=None` — `compute_completeness` detects this as a missing field; `INPUT_TYPE_MAP["cook_time_minutes"] == "stepper"` (non-None), so it is eligible per D-10/D-11.
  - `summary_body` set to a distinct French string `"J'ai mis à jour la recette avec les nouveaux ingrédients (test)."` — ensures `_extraction_hash` differs from the default branch so the idempotency check in `_run_thread_llm` does NOT short-circuit the second call.
  - All other fields identical to the default risotto shape — no other test regresses.

In `backend/tests/test_question_endpoints.py`: removed the `@pytest.mark.xfail` decorator. No body changes — the sentinel was already in the test body.

**Commit:** `6b377e6` — `test: fix Category C — llm_fixtures emits question turn for defer test (D-39-05)`

## Regression Check

All LLM-touching test files were run after each fix:

| File | Tests | Result |
|------|-------|--------|
| `tests/test_llm_thread.py` | 47 | PASS (all green after Cat B fix) |
| `tests/test_question_endpoints.py` | 22 | PASS (all green after Cat C fix) |
| `tests/test_llm_thread_kinds.py` | 5 | PASS |
| `tests/test_turns.py` | 12 | PASS |
| **Combined run (4 files)** | **86** | **86 passed, 0 failed** |

The `__TEST_FORCE_NEW_HASH__` sentinel was confirmed to exist nowhere else in the suite via grep before writing the fixture branch — no unintended activation risk.

## Verification Numbers

From full-suite run after both commits:

```
542 passed, 3 skipped, 1 xfailed, 291 warnings in 30.48s
Total coverage: 85.47%  (Required: 85.0% — PASSED)
```

Remaining xfail (only 1):
```
XFAIL tests/migrations/test_migration_safety.py::test_migration_upgrade_then_downgrade_runs_clean[0006-0005]
       — Postgres does not support ALTER TYPE recipe_status DROP VALUE;
         documented intentional asymmetric migration (Phase 16 D-16-02).
```

Rules-files gate (`scripts/check_rules_files_coverage.py coverage.json`):
```
OK: app/services/voting.py at 100.0%
OK: app/services/algorithm.py at 100.0%
OK: app/services/shortlist.py at 100.0%
OK: app/auth.py at 100.0%
PASS: 4/4 rules files at 100%
Exit code: 0
```

## Threat Flags

None. Changes are test-mode only:
- `_NoCloseWrapper` is defined inside a test function body — never imported by production code.
- `_FORCE_NEW_HASH_PREFIX` sentinel branch in `canned_thread_extract` is guarded by `settings.environment == "test"` at the `_run_thread_llm` call site; production never reaches `canned_thread_extract`.

## Self-Check

| Must-have | Status |
|-----------|--------|
| `test_process_thread_turn_failure_records_on_turn_payload` PASSES in isolation | PASS |
| `test_process_thread_turn_failure_records_on_turn_payload` PASSES in full-suite | PASS |
| `test_defer_suppresses_question_in_run_thread_llm` PASSES in isolation | PASS |
| `test_defer_suppresses_question_in_run_thread_llm` PASSES in full-suite | PASS |
| All LLM-touching tests green — no fixture regression | PASS (86/86 in combined run) |
| Full suite: 0 failed; xfailed count == 1 (migration 0006 only) | PASS |
| Repo line coverage >= 85.0% | PASS (85.47%) |
| `scripts/check_rules_files_coverage.py` exits 0 | PASS |
| 2 atomic task commits | PASS (6a9c541, 6b377e6) |
| No file outside the 3 listed in `files_modified` modified | PASS |
| No push to origin/main | PASS |
| SUMMARY.md exists with concrete before/after numbers | PASS |

## Self-Check: PASSED
