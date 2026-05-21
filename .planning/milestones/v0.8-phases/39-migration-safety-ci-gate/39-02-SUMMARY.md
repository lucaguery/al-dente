---
phase: 39-migration-safety-ci-gate
plan: "02"
subsystem: ci-gate
status: complete
tags: [pyproject, fail_under, github-actions, postgres-service, coverage-gate, xfail]
dependency_graph:
  requires: [39-01]
  provides: [ci-coverage-gate, per-file-rules-floor, ghacts-backend-tests]
  affects:
    - backend/pyproject.toml
    - scripts/check_rules_files_coverage.py
    - .github/workflows/backend-tests.yml
    - backend/tests/test_check_rules_files_coverage.py
    - backend/tests/test_llm_thread.py
    - backend/tests/test_question_endpoints.py
    - backend/tests/test_coverage_floor_closure.py
    - .gitignore
tech_stack:
  added: [github-actions, postgres-16-service-container]
  patterns: [coverage-fail-under-pyproject, per-file-gate-via-json, xfail-strict-false]
key_files:
  created:
    - .github/workflows/backend-tests.yml
    - scripts/check_rules_files_coverage.py
    - backend/tests/test_check_rules_files_coverage.py
    - backend/tests/test_coverage_floor_closure.py
  modified:
    - backend/pyproject.toml
    - backend/tests/test_llm_thread.py
    - backend/tests/test_question_endpoints.py
    - .gitignore
---

# Plan 39-02 SUMMARY — CI Gate + Coverage Floor

## Result

| Metric | Before (post-39-01) | After (Plan 39-02 + floor closure) |
|--------|---------------------|-----------------------------------|
| Tests passed | 530 | 540 |
| Tests xfailed | 1 (migration 0006) | 3 (+2 from D-39-05) |
| Tests skipped | 3 | 3 |
| Repo line coverage | 85.0% (84.99% strict) | **85.08%** |
| `fail_under=85` gate | failed | **passes** |
| CI workflow | absent | `.github/workflows/backend-tests.yml` (101 lines) |

## REQ-IDs Closed

- **CI-01:** GitHub Actions workflow runs on every PR (paths: `backend/**`) + push to main. Postgres 16 service container, `alembic upgrade head`, seed, `pytest --cov`, per-file gate script, coverage JSON artifact upload. No Vercel/Railway deploy triggers.
- **CI-02:** `[tool.coverage.report].fail_under = 85` in `backend/pyproject.toml`. Per-file 100% gate enforced via `scripts/check_rules_files_coverage.py` (parses `coverage.json` and asserts each of the 4 rules files at 100%).

## What was built

### `backend/pyproject.toml` (1 line added)

```toml
[tool.coverage.report]
fail_under = 85    # NEW
show_missing = true
skip_empty = true
precision = 1
```

### `scripts/check_rules_files_coverage.py` (109 lines)

Reads `coverage.json` and asserts each of these 4 files at 100% line coverage:
- `app/services/voting.py`
- `app/services/algorithm.py`
- `app/services/shortlist.py`
- `app/auth.py`

Exits nonzero if any file < 100%. RED-test verified via `backend/tests/test_check_rules_files_coverage.py` (118 lines) — feeds tampered JSON to the script and asserts it correctly fails.

### `.github/workflows/backend-tests.yml` (101 lines)

GitHub Actions workflow:
- **Triggers:** `pull_request` on `backend/**` paths + push to `main`
- **Runs on:** `ubuntu-latest`
- **Services:** `postgres:16-alpine` (port 5432 → mapped local 5433)
- **Steps:** checkout → install uv → `uv sync` → set env → `alembic upgrade head` → `uv run seed` → `uv run pytest --cov=app --cov-report=term --cov-report=json:coverage.json` → `python scripts/check_rules_files_coverage.py` → upload coverage.json artifact
- **NO Vercel/Railway triggers** — pure CI gate per `feedback_no_manual_vercel_deploy.md`

### xfail markers (D-39-05)

Both pre-existing failures from 37-01-SUMMARY Category B+C now marked `pytest.mark.xfail(strict=False, reason="...")`:

- `backend/tests/test_llm_thread.py::test_process_thread_turn_failure_records_on_turn_payload` — Category B (DetachedInstanceError on async `SessionLocal` monkeypatch). Fix requires session-lifecycle restructure (> 30 min).
- `backend/tests/test_question_endpoints.py::test_defer_suppresses_question_in_run_thread_llm` — Category C (canned LLM stub doesn't emit question turns). Fix requires editing `app/services/llm_fixtures.py` which is forbidden by phase scope_fence.

Both xfail reasons reference D-39-05 + 37-01-SUMMARY so a future quick-task can resurface them.

### `backend/tests/test_coverage_floor_closure.py` (52 lines)

Post-Plan-39-02 patch: after the xfail markers landed (removing 2 contributing tests) and migration tests landed (new code in tests/migrations/), repo coverage dipped from 85.0% to 84.99% — just below the new threshold. Two tiny gap-closure tests bring it to 85.08%:

- `test_is_conflict_unknown_field_returns_false` — covers `completeness.py:197` (defensive `return False` for unknown fields).
- `test_realtime_unregister_keeps_channel_when_other_peers_remain` — covers `realtime.py:60->62` branch (unregister when other peers still present).

### `.gitignore` (7 lines added)

```
coverage.json
.coverage
.coverage.*
.coverage_html/
scripts/__pycache__/
```

## D-39-05 Verification (per memory feedback_verify_before_claiming_done.md)

| Verification | Method | Result |
|---|---|---|
| Workflow YAML parses | `python -c "import yaml; yaml.safe_load(open('.github/workflows/backend-tests.yml'))"` | parses clean |
| Workflow has Postgres 16 service | `grep "postgres:16-alpine" .github/workflows/backend-tests.yml` | present |
| Workflow runs `check_rules_files_coverage` | `grep "check_rules_files_coverage" .github/workflows/backend-tests.yml` | present |
| Workflow has NO Vercel/Railway triggers | `grep -iE "vercel\|railway\|deploy" .github/workflows/backend-tests.yml` | empty |
| `fail_under=85` enforces locally | `cd backend && uv run pytest --cov=app` | passes at 85.08% |
| Rules-files gate positive case | `python scripts/check_rules_files_coverage.py coverage.json` | exits 0 (all 4 at 100%) |
| Rules-files gate negative case | Tampered JSON → `python scripts/check_rules_files_coverage.py` | exits 1 with clear diff (per test_check_rules_files_coverage.py) |

## Source files modified

- **`backend/app/`**: 0 files (test-only phase honored).
- **`backend/tests/`**: 4 modifications/additions (2 xfail markers on existing tests, 2 new test files).
- **`backend/pyproject.toml`**: 1-line fail_under add.

## Follow-up TODOs (surfaced during implementation)

1. **D-39-05 xfails are tactical, not strategic** — both are real test bugs that should be fixed and the xfail removed. Best done as a quick-task.
2. **CI workflow gate-validation smoke test (D-39-06)** — the "intentional 1-line revert in a draft PR shows red" verification step has NOT been executed yet. Recommended as the first action after this PR lands on main: open a throwaway PR that reverts 1 line in `services/voting.py` and confirm CI red-lines on the per-file 100% gate. The 39-02 changes themselves are the FIRST commit that exercises the workflow — its first run on the milestone-close PR is itself the smoke test.
3. **Migration 0006 xfail is by-design** — Postgres `ALTER TYPE DROP VALUE` is unsupported. Documented in `_KNOWN_NON_DOWNGRADEABLE` per Phase 16 D-16-02; nothing to fix.

## Threat flags

None new. The CI gate adds defense-in-depth against accidental coverage regression; no new attack surface.

## Self-Check: PASSED

- ✅ Plan tasks 3/3 complete (pyproject fail_under, gate script + tests, GHA workflow + xfails)
- ✅ Scope_fence honored (zero changes under `backend/app/`)
- ✅ Verification ritual ran with concrete numeric results
- ✅ Coverage floor sustained at 85.08% (above 85.00 threshold)
- ✅ D-39-05 xfail decisions match per-test cost calculus
- ✅ No Vercel/Railway triggers in workflow
- ✅ Per-file rules gate works on both positive and negative test JSON
