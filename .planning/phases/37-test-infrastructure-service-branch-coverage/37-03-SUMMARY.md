---
phase: 37-test-infrastructure-service-branch-coverage
plan: "03"
subsystem: backend-testing
tags: [pytest, coverage, algorithm, shortlist, llm, gemini-monkeypatch, serv-02, serv-03, serv-04, cov-03, cov-04]
dependency_graph:
  requires: [37-01, 37-02]
  provides: [COV-03, COV-04, SERV-02, SERV-03, SERV-04]
  affects: [backend/tests/test_algorithm_unit.py, backend/tests/test_shortlist_unit.py, backend/tests/test_llm_thread_kinds.py]
tech_stack:
  added: []
  patterns:
    - SimpleNamespace stand-ins for pure-function unit tests (ORM models require session for instrumentation)
    - AsyncMock for broadcast_to_household + SessionLocal redirect for async service tests
    - datetime module-level monkeypatch for _current_season() determinism
    - Test-mode Gemini bypass (ENVIRONMENT=test → canned_thread_extract) + belt-and-suspenders _gemini monkeypatch
key_files:
  created:
    - backend/tests/test_algorithm_unit.py
    - backend/tests/test_shortlist_unit.py
    - backend/tests/test_llm_thread_kinds.py
  modified: []
decisions:
  - "Used SimpleNamespace stand-ins (not SQLAlchemy Recipe instances) for score_recipe tests — Recipe.__new__(Recipe) does not initialize instrumentation state, causing AttributeError on attribute assignment. days_since_cooked() stubbed via lambda on the namespace."
  - "Shortlist tests use freshly-created isolated households (not the seeded household) to avoid UNIQUE (household_id, date, generation) constraint collisions across test runs. The seeded household has committed shortlist rows that persist between runs."
  - "LLM TurnKind tests rely on ENVIRONMENT=test short-circuit in _run_thread_llm (uses canned_thread_extract) — no need to monkeypatch _run_thread_llm directly. Belt-and-suspenders: _gemini() also monkeypatched to MagicMock."
  - "Photo kind TurnKind test monkeypatches storage_module.download_recipe_photo to return canned JPEG bytes b'\\xff\\xd8\\xff' — no Supabase bucket access in CI."
  - "own_session close() path (shortlist.py line 184) covered via monkeypatching SessionLocal + tracking db.close() calls on the session."
metrics:
  duration: "~25 minutes"
  completed: "2026-05-19"
---

# Phase 37 Plan 03: Algorithm + Shortlist + LLM TurnKind Coverage Summary

Drive `app/services/algorithm.py` and `app/services/shortlist.py` to 100% line coverage, and add a per-TurnKind sweep for `app/services/llm.py` thread processing with the Gemini SDK monkeypatched.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Cover algorithm.py to 100% via pure-function unit tests | fad32f0 | backend/tests/test_algorithm_unit.py (+453 lines) |
| 2 | Cover shortlist.py to 100% via async generate_daily_shortlist tests | a8ab34b + 3f63f73 | backend/tests/test_shortlist_unit.py (+486 lines) |
| 3 | TurnKind sweep through process_thread_turn with Gemini monkeypatched | f163372 | backend/tests/test_llm_thread_kinds.py (+201 lines) |
| 4 | Combined coverage assertion + full-suite green run | (verification) | — |

## Per-File Coverage Deltas (Plan 37-03)

| File | Baseline (pre-37-03) | Post-37-03 | Delta |
|------|---------------------|------------|-------|
| `app/services/algorithm.py` | 17.6% (60 missing) | **100.0%** | +82.4pp |
| `app/services/shortlist.py` | 22.0% (48 missing) | **100.0%** | +78.0pp |
| `app/services/llm.py` | 13.4% (baseline) | 65.7% (full suite) | +52.3pp (SERV-04 scope only) |

## Phase-Final 4-Rules-File Table (Plans 37-02 + 37-03)

Combined run: `pytest tests/test_voting_unit.py tests/test_auth_unit.py tests/test_algorithm_unit.py tests/test_shortlist_unit.py --cov=app.services.voting --cov=app.services.algorithm --cov=app.services.shortlist --cov=app.auth --cov-report=term-missing`

```
Name                        Stmts   Miss Branch BrPart   Cover   Missing
------------------------------------------------------------------------
app/auth.py                    30      0     10      0  100.0%
app/services/algorithm.py      81      0     38      0  100.0%
app/services/shortlist.py      66      0     16      0  100.0%
app/services/voting.py         23      0      8      0  100.0%
------------------------------------------------------------------------
TOTAL                         200      0     72      0  100.0%
======================= 107 passed, 2 warnings in 0.86s ========================
```

All 4 rules files at 100% with empty Missing column. COV-02..05 demonstrably closed.

## Repo-Wide Coverage Delta

| Milestone | TOTAL line coverage | Test count (passed) |
|-----------|--------------------|--------------------|
| Baseline (quick-260519-uxn) | 35.9% | ~63 passing (96 blocked) |
| Post-Plan 37-01 | ~59.5% (approx) | 221 passed, 16 failed |
| Post-Plan 37-02 | 59.5% | 221 passed, 16 failed |
| **Post-Plan 37-03** | **64.5%** | **288 passed, 16 failed** |

Full-suite command: `pytest --cov=app --cov-report=term-missing`

```
TOTAL                              2622    798    722     67  64.5%
================== 16 failed, 288 passed, 3 warnings in 4.86s ==================
```

The 16 pre-existing failures are test-ordering bugs present before this phase — not in 37-03 scope. No new failures introduced.

## LLM TurnKind Sweep (SERV-04)

All 5 user-emitted `TurnKind` values covered by `test_llm_thread_kinds.py`:

| TurnKind | Payload | Result |
|----------|---------|--------|
| `text` | `{"text": "risotto aux champignons"}` | PASS — summary + broadcasts |
| `voice` | `{"transcript": "version légère ..."}` | PASS — summary + broadcasts |
| `photo` | `{"photo_paths": ["path/photo_test.jpg"]}` | PASS — storage monkeypatched |
| `url` | `{"url": "https://example.com/recette"}` | PASS — summary + broadcasts |
| `answer` | `{"field": "cuisine", "value": "italian"}` | PASS — summary + broadcasts |

Gemini SDK not invoked: `ENVIRONMENT=test` triggers `canned_thread_extract` in `_run_thread_llm`; `_gemini()` also monkeypatched to `MagicMock` as belt-and-suspenders. `GEMINI_API_KEY=stub` would surface any missed bypass as a `RuntimeError`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SimpleNamespace required for algorithm pure-function tests**
- **Found during:** Task 1
- **Issue:** `Recipe.__new__(Recipe)` does not initialize SQLAlchemy instrumentation (`_sa_instance_state`), causing `AttributeError` on any attribute assignment. The plan interface doc suggested detached Recipe instances would work.
- **Fix:** Used `types.SimpleNamespace` stand-ins for all `score_recipe` / `select_*` tests. `days_since_cooked()` stubbed via `lambda: int` on the namespace. No DB required for pure-function tests.
- **Files modified:** `backend/tests/test_algorithm_unit.py`
- **Commit:** fad32f0

**2. [Rule 1 - Bug] CookingLog field is `cooked_by_member_id`, not `member_id`**
- **Found during:** Task 2
- **Issue:** Plan interface doc's code example used `member_id=member.id` for `CookingLog` construction. The actual model column is `cooked_by_member_id`.
- **Fix:** Corrected all CookingLog instantiations in `test_shortlist_unit.py`.
- **Files modified:** `backend/tests/test_shortlist_unit.py`
- **Commit:** a8ab34b

**3. [Rule 1 - Bug] Seeded-household full-corpus test caused UNIQUE constraint collisions**
- **Found during:** Task 4 full-suite run
- **Issue:** `test_full_corpus_seeded_household_returns_up_to_5` used the seeded household with `generation=99`. `generate_daily_shortlist` commits rows to the test DB (session-scoped seed data is not rolled back). Re-running the full suite caused `UniqueViolation` on `(household_id, date, generation)`.
- **Fix:** Replaced the seeded-household test with a fresh isolated 8-recipe household created inside the per-test `db_session` transaction, which rolls back at teardown. Test renamed `test_full_corpus_large_pool_returns_up_to_5`.
- **Files modified:** `backend/tests/test_shortlist_unit.py`
- **Commit:** 3f63f73

## Requirements Closed

| REQ-ID | Requirement | Closed by |
|--------|-------------|-----------|
| COV-03 | `app/services/algorithm.py` → 100% line coverage | Plan 37-03 Task 1 |
| COV-04 | `app/services/shortlist.py` → 100% line coverage | Plan 37-03 Task 2 |
| SERV-02 | Every weight/penalty/cold-start branch in `score_recipe` + `select_*` | Plan 37-03 Task 1 |
| SERV-03 | `generate_daily_shortlist` empty/partial/full/idempotent corpus cases | Plan 37-03 Task 2 |
| SERV-04 | LLM thread processing × 5 user-emitted TurnKinds with Gemini monkeypatched | Plan 37-03 Task 3 |

Phase-level requirements also closed via Plans 37-01 + 37-02:

| REQ-ID | Requirement | Closed by |
|--------|-------------|-----------|
| COV-06 | Unblock 96 previously-failing tests | Plan 37-01 |
| COV-07 | Relocate `svg_sanitizer_test.py` to `tests/` | Plan 37-01 |
| COV-02 | `app/services/voting.py` → 100% line coverage | Plan 37-02 |
| COV-05 | `app/auth.py` → 100% line coverage | Plan 37-02 |
| SERV-01 | All 5 VoteState values × member_count ∈ {1,2} | Plan 37-02 |

## Known Stubs

None — all test files exercise real code paths via the existing test-mode canned-extract infrastructure.

## Threat Flags

None — only `backend/tests/` files created. No new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check: PASSED

Files created:
- [x] `backend/tests/test_algorithm_unit.py` — FOUND
- [x] `backend/tests/test_shortlist_unit.py` — FOUND
- [x] `backend/tests/test_llm_thread_kinds.py` — FOUND

Commits verified:
- [x] fad32f0 — algorithm unit tests
- [x] a8ab34b — shortlist unit tests (initial)
- [x] f163372 — LLM TurnKind sweep
- [x] 3f63f73 — shortlist isolation fix

Coverage acceptance:
- [x] `app/services/algorithm.py`: 100.0% (Missing column empty)
- [x] `app/services/shortlist.py`: 100.0% (Missing column empty)
- [x] All 4 rules files in one combined run: 100.0%
- [x] Full suite: 64.5% TOTAL, 288 passed, 16 pre-existing failures (no regressions)
