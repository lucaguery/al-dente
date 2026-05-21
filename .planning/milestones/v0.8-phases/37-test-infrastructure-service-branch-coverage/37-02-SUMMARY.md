---
phase: 37-test-infrastructure-service-branch-coverage
plan: "02"
subsystem: backend-tests
tags: [pytest, unit-tests, voting, auth, coverage-100, SERV-01, COV-02, COV-05]
dependency_graph:
  requires: [37-01]
  provides: [voting-100pct-coverage, auth-100pct-coverage, SERV-01-closed]
  affects: [backend/tests/test_voting_unit.py, backend/tests/test_auth_unit.py]
tech_stack:
  added: []
  patterns: [parametrized-pure-function-tests, fastapi-testclient-integration, SimpleNamespace-vote-standin]
key_files:
  created:
    - backend/tests/test_voting_unit.py
    - backend/tests/test_auth_unit.py
  modified: []
decisions:
  - "D-37-02-01: Used types.SimpleNamespace(vote='yes'|'no') as Vote stand-ins — pure-function test, no DB round-trip"
  - "D-37-02-02: Used GET /auth/ws-token as the integration route for current_member — returns 200+token on auth OK, 401 on failure"
  - "D-37-02-03: --cov= argument must use dot-notation (app.services.voting) not slash-notation (app/services/voting) to collect coverage correctly"
  - "D-37-02-04: Starlette DeprecationWarning for per-request cookies= is informational only; tests pass and cookie behavior is correct"
metrics:
  duration: "~18 minutes"
  completed: "2026-05-19"
  tasks_completed: 3
  files_modified: 2
---

# Phase 37 Plan 02: voting + auth → 100% Coverage Summary

**One-liner:** Parametrized pure-function tests drive voting.py and auth.py from 35.5%/82.5% to 100% each, closing COV-02, COV-05, and SERV-01 (all 5 VoteState values × member_count ∈ {1, 2}).

## Result

| Metric | Before (post-37-01) | After (Plan 37-02) |
|--------|---------------------|--------------------|
| Tests passed | 176 | 221 |
| Tests failed | 16 | 16 (same pre-existing failures) |
| Total collected | 192 | 237 |
| Line coverage (TOTAL) | 58.6% | 59.5% |
| app/services/voting.py | 35.5% | **100.0%** |
| app/auth.py | 82.5% | **100.0%** |

## Coverage Delta — Target Files

| File | Before % | Before Stmts | Before Miss | After % | After Stmts | After Miss |
|------|----------|--------------|-------------|---------|-------------|------------|
| app/services/voting.py | 35.5% | 23 | 12 | **100.0%** | 23 | 0 |
| app/auth.py | 82.5% | 30 | 4 | **100.0%** | 30 | 0 |

Branch coverage for both files is also 100% (8/8 branches for voting, 10/10 for auth).

## Requirements Closed

| REQ-ID | Description | Status |
|--------|-------------|--------|
| COV-02 | `app/services/voting.py` at 100% line coverage | CLOSED |
| COV-05 | `app/auth.py` at 100% line coverage | CLOSED |
| SERV-01 | `compute_vote_state` exercised for all 5 VoteState values × member_count ∈ {1, 2} | CLOSED |

## Test Files Created

### backend/tests/test_voting_unit.py (14 tests)

- **Parametrized matrix:** 9 cases covering all 5 `VoteState` values × member_count ∈ {1, 2}
- **Branch ORDER guards:** 3 standalone tests that pin valide/conteste/rejete/pressenti ordering (CLAUDE.md invariant #2 — branch order must be identical to `frontend/lib/votes.ts`)
- **Enum string-value drift detector:** asserts locked string literals (`"valide"`, `"pressenti"`, `"conteste"`, `"rejete"`, `"sans_avis"`) match frontend mirror
- **SERV-01 completeness gate:** fails if a new `VoteState` is added to the enum without a corresponding test case
- **No DB round-trip:** `SimpleNamespace(vote="yes"|"no")` stand-ins expose the only `.vote` attribute the pure function reads

### backend/tests/test_auth_unit.py (31 tests)

**Layer 1 — Pure-function tests (no DB):**
- `generate_auth_token`: returns 43-char string, unique, URL-safe chars only
- `set_auth_cookie`: `HttpOnly`, `Secure`, `SameSite=strict`, `Max-Age=7776000`, `Path=/`
- `clear_auth_cookie`: expires cookie via `Max-Age=0` + `Expires` directive
- `_extract_token`: cookie-only, Bearer-only, lowercase `bearer` accepted, cookie-wins-over-Bearer (invariant #8), whitespace-only cookie → 401, non-`Bearer` prefix → 401, Bearer with empty token → 401, both None → 401

**Layer 2 — Integration tests via TestClient + seeded DB:**
- `current_member` cookie happy path → 200
- `current_member` Bearer happy path → 200
- Cookie wins when both present (invalid Bearer) → 200 (invariant #8 pin)
- Unknown token → 401 `"invalid token"`
- No auth → 401 `"missing auth"`
- Partner member token → 200

## Verification Commands Run

### Combined-file coverage (both files at 100%):
```
uv run pytest tests/test_voting_unit.py tests/test_auth_unit.py \
  --cov=app.services.voting --cov=app.auth --cov-report=term-missing
```
Result: 45 passed, 0 failed. Both files 100.0%, Missing column empty.

### Full-suite run (no regression):
```
uv run pytest --cov=app --cov-report=term-missing
```
Result: 221 passed, 16 failed (same pre-existing failures as post-37-01), 3 warnings.
Exit code: 1 (due to pre-existing failures — same count as after Plan 37-01).

## Deviations from Plan

### Auto-noted Issues (no source modified)

**1. [D-37-02-03] --cov= slash vs dot notation**
- **Found during:** Task 1 verification
- **Issue:** The PLAN.md verify commands used `--cov=app/services/voting` (slash notation). This produced `CoverageWarning: Module app/services/voting was never imported` and no data collected.
- **Fix:** Used `--cov=app.services.voting` (dot notation) which correctly tracks the module. The pyproject.toml `[tool.coverage.run]` `source = ["app"]` uses the package name form — dot notation in `--cov=` is consistent.
- **Files modified:** None (just ran the correct command form)

**2. [D-37-02-04] Starlette per-request cookies DeprecationWarning**
- **Found during:** Task 2 integration tests
- **Issue:** `TestClient.get(..., cookies={...})` emits `DeprecationWarning: Setting per-request cookies=<...> is being deprecated` from starlette 0.46+.
- **Fix:** None applied — the warning is informational, tests pass, and the behavior being tested (cookie-wins-over-Bearer) works correctly. Per scope_fence, source files are not modifiable. The test could be restructured to use client-level cookies instead, but that would complicate the isolation between test cases.
- **Deferred:** If the warning escalates to an error in a future starlette release, restructure `TestCurrentMemberIntegration` tests to set `client.cookies[AUTH_COOKIE_NAME] = SEED_TOKEN` before each cookie-auth test call and clear afterward.

**3. [Context] 37-01 commits cherry-picked into worktree**
- **Found during:** Plan start
- **Issue:** The worktree branch (`worktree-agent-a6416e9286381de0e`) was branched from `5437ca0` (main HEAD), which predates the 37-01 commits (`3fa62dc`, `7198658`, `770b1fd`). Those commits were orphaned (not on any branch).
- **Fix:** Cherry-picked `e8e30f0`, `3fa62dc`, `7198658`, `770b1fd` onto the worktree branch before starting 37-02 work. Also cherry-picked the phase-dir docs commit (`e8e30f0`) to get the planning files into the worktree.
- **Impact:** None on test correctness. The `_seeded_database` autouse fixture and pytest-cov were correctly in place before 37-02 tests ran.

## Pre-existing Failures (16) — Unchanged from Plan 37-01

The 16 failures documented in `37-01-SUMMARY.md` are still present and unchanged. No new tests caused regressions:

- 14 × `test_turns.py` — `db_session.commit()` ordering bug (tests pass in isolation)
- 1 × `test_llm_thread.py::test_process_thread_turn_failure_records_on_turn_payload` — DetachedInstanceError
- 1 × `test_question_endpoints.py::test_defer_suppresses_question_in_run_thread_llm` — LLM stub mismatch

## Known Stubs

None — this plan adds only test files. No UI-rendering components or data-source stubs introduced.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- `backend/tests/test_voting_unit.py` exists ✓
- `backend/tests/test_auth_unit.py` exists ✓
- Commit `eb62f39` exists (voting tests) ✓
- Commit `9617b90` exists (auth tests) ✓
- `app/services/voting.py` reports 100.0% (23 stmts, 0 missing, 8 branches) ✓
- `app/auth.py` reports 100.0% (30 stmts, 0 missing, 10 branches) ✓
- Full suite: 221 passed, 16 failed (same pre-existing failures) ✓
- No source files under `backend/app/` modified ✓
- No `fail_under` threshold added to `backend/pyproject.toml` ✓
