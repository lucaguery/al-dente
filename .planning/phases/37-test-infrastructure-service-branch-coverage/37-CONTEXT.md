# Phase 37 — Test Infrastructure + Service Branch Coverage — Context

**Gathered:** 2026-05-19
**Status:** Ready for planning (no discuss-phase needed — decisions pre-locked at milestone scaffold time)

<domain>

## Phase Boundary

Phase 37 of v0.8 (Backend Coverage Until Done). Closes 10 of 33 milestone requirements.

**Requirements in scope:** COV-02, COV-03, COV-04, COV-05, COV-06, COV-07, SERV-01, SERV-02, SERV-03, SERV-04

**Goal:** Unblock 96 currently-failing tests, fix the misplaced `svg_sanitizer_test.py`, and drive the 4 named rules files to 100% line coverage.

**Out of phase scope:** invariant regression tests (Phase 38 INV-01..08), router contract tests (Phase 38 ROUT-01..10), the ≥85% repo floor (Phase 38 COV-01), migration safety (Phase 39 MIG-*), GitHub Actions CI gate (Phase 39 CI-*).

</domain>

<decisions>

## Implementation Decisions

### D-37-01: Seed-fixture mechanism (COV-06)

**Locked:** Option (a) — autouse session-scoped seed fixture in `backend/tests/conftest.py`.

**Why:** The existing `app.cli.seed:main` entry point is idempotent. Per-test transaction rollback (`backend/tests/conftest.py:38-52`) already provides data isolation between tests. Running seed once per session unblocks all 96 currently-failing tests without touching them. Rewriting them (option b) was ~96 × N-edits of mechanical work for the same outcome.

**Implementation shape:**
- New `@pytest.fixture(scope="session", autouse=True)` named `_seeded_database`.
- Calls `app.cli.seed:main` (or the underlying Python seed function — preferred, avoids re-parsing argv) at session start.
- Idempotency: the seed CLI is already idempotent per `RUNBOOK.md` + `TESTING.md`. The fixture runs it once; downstream tests start from the seeded state.
- Does NOT modify the existing per-test `db_session` fixture (the connection-scoped txn rollback contract is preserved).
- The seed runs BEFORE any per-test transaction begins, so seeded rows are committed to the test DB; per-test inserts roll back individually.

**Edge case:** If the seed fixture errors (e.g. DB not migrated), the fixture must surface a clear error that points to `TESTING.md` Quick Start. No silent skip.

### D-37-02: svg_sanitizer_test relocation (COV-07)

**Locked:** Move `backend/app/services/svg_sanitizer_test.py` → `backend/tests/test_svg_sanitizer.py`. Use `git mv` to preserve history. Update any imports inside the file from relative-to-`app.services` form to absolute `app.services.svg_sanitizer` form. Verify it runs at the new location.

**Why:** The file is a test, not source. It contributes 77 uncovered statements to the baseline (0% × 77 stmts ≈ 3 percentage points repo-wide lifted by the move alone).

### D-37-03: Plan split (3 plans)

**Locked:**

- **Plan 37-01: Test infrastructure** — autouse seed fixture + svg_sanitizer_test relocation + verify the 96 unblock. Closes COV-06, COV-07. **Files touched:** `backend/tests/conftest.py`, `backend/app/services/svg_sanitizer_test.py` (deleted), `backend/tests/test_svg_sanitizer.py` (created via `git mv`). **Acceptance:** `pytest` exits 0 with all 161 tests passing (96 previously-failing + 63 previously-passing + 2 errors resolved).

- **Plan 37-02: services/voting + auth → 100%** — easier rules files first. Closes COV-02, COV-05, SERV-01. **Files touched:** `backend/tests/test_voting_unit.py` (created), `backend/tests/test_auth_unit.py` (created OR extends existing test file if one exists). **Acceptance:** `pytest --cov=app/services/voting --cov=app/auth --cov-fail-under=100` exits 0.

- **Plan 37-03: services/shortlist + services/algorithm + LLM TurnKind sweep** — harder rules files + LLM coverage. Closes COV-03, COV-04, SERV-02, SERV-03, SERV-04. **Files touched:** `backend/tests/test_shortlist_unit.py` (created), `backend/tests/test_algorithm_unit.py` (created), `backend/tests/test_llm_thread_kinds.py` (created). **Acceptance:** `pytest --cov=app/services/shortlist --cov=app/services/algorithm --cov-fail-under=100` exits 0; LLM tests cover all 7 `TurnKind` values with Gemini SDK monkeypatched.

**Why this split:** Plan 37-01 is the unblock prereq (no point writing rules-file tests if 96 unrelated tests are red). Plan 37-02 is easier targets (voting/auth) for fast feedback before tackling algorithm/shortlist/LLM in Plan 37-03.

### D-37-04: Gemini SDK monkeypatch shape (SERV-04)

**Locked:** Per `backend/CLAUDE.md`, the project uses the unified Google AI SDK: `from google import genai`. The legacy `google-generativeai` package is NOT in the deps. SERV-04 tests must monkeypatch `app.services.llm`'s import of `genai.Client` / `genai.GenerativeModel` (or whatever the new SDK exposes — to be verified during plan-phase by the planner reading `app/services/llm.py`).

**Why:** A monkeypatched canned response is the only way to test thread-processing branches deterministically without hitting the live Gemini API (cost, flakiness, secret-rotation).

### D-37-05: Coverage assertion mechanism

**Locked:** Each plan's verification step runs `pytest --cov=app --cov-report=term-missing` and reports concrete coverage deltas in the plan SUMMARY. **No `fail_under` thresholds added in this phase** — those are Phase 39's CI-02 job. Phase 37 just demonstrates the numbers are met; phase 38 demonstrates the repo total reaches 85%; phase 39 wires the thresholds into pyproject.toml + CI.

**Why:** Adding `fail_under` here would force commits in phase 38 and 39 to satisfy thresholds before all routers are tested. Keeping thresholds out until phase 39 lets the numerator catch up before the gate trips.

### Claude's Discretion

- Exact internal structure of unit-test files (parametrize vs separate test functions, fixture composition) — planner picks per its own readability heuristic.
- Whether `test_auth_unit.py` is a new file or extends an existing `test_auth.py` (depends on what exists at planning time — planner reads first).
- Whether SERV-04 LLM tests live in one file with classes-per-TurnKind or one file per kind — planner picks.

</decisions>

<specifics>

## Specific References

- **Baseline numbers (from quick-260519-uxn SUMMARY):** repo 35.9% line / 6.8% branch; voting 35.5% (12 lines), auth 82.5% (4 lines), shortlist 22.0% (48 lines), algorithm 17.6% (60 lines). The 4 missing lines in auth are likely cookie-parsing fallback + error branches — small grep target.
- **Test infra:** `backend/tests/conftest.py:38-52` — connection-scoped txn rollback. `backend/tests/conftest.py:55-71` — TestClient with `get_db` override. These do not change.
- **Existing test patterns:** `backend/tests/test_*.py` — 13 files including `test_completeness.py` (already 100% covers schemas), `test_llm_thread.py` (47.8K — large file with existing LLM tests; SERV-04 should extend rather than duplicate). Planner must read this file to see what's already covered before adding new LLM tests.
- **Seed entry point:** `backend/app/cli/seed.py` — the CLI's `main()`. Per `RUNBOOK.md` and `TESTING.md`, it's idempotent and hard-refuses non-test DBs (T-10-05 mitigation).
- **TurnKind values to cover:** per `frontend/lib/enums.ts` + `backend/app/models/enums.py`: `text`, `voice`, `photo`, `url`, `answer`, `proposal_accepted`, `proposal_dismissed`, `summary`, `question`, `advisory`. The first 5 are user-emitted; the last 5 are system-emitted (SERV-04 should test the user-emitted ones primarily, plus the system-emission paths in `services/llm`).

</specifics>

<canonical_refs>

## Canonical References

- `.planning/REQUIREMENTS.md` — REQ-IDs and acceptance criteria.
- `.planning/ROADMAP.md` — phase boundaries and success criteria.
- `.planning/quick/260519-uxn-add-pytest-cov-to-backend-run-baseline-c/260519-uxn-SUMMARY.md` — baseline coverage numbers and per-file gap analysis.
- `CLAUDE.md` (root) — 8 architecture invariants (Phase 38 will write regression tests for these; Phase 37 only sets up the coverage measurement infrastructure those tests will live in).
- `backend/CLAUDE.md` — Gemini SDK guidance (D-37-04 anchor).
- `TESTING.md` — local E2E bootstrap + env contract.
- `RUNBOOK.md` — seed idempotency contract.

</canonical_refs>

<scope_fence>

## Scope Fence (per memory feedback_executor_scope_creep)

**Plan 37-01 may modify ONLY:**
- `backend/tests/conftest.py` (add fixture; do not touch existing fixtures)
- `backend/app/services/svg_sanitizer_test.py` (delete via git mv)
- `backend/tests/test_svg_sanitizer.py` (create via git mv; minor import adjustments allowed)

**Plan 37-02 may modify ONLY:**
- `backend/tests/test_voting_unit.py` (new file)
- `backend/tests/test_auth_unit.py` (new file) OR additions to existing `backend/tests/test_auth.py` if it exists (planner verifies)

**Plan 37-03 may modify ONLY:**
- `backend/tests/test_shortlist_unit.py` (new file)
- `backend/tests/test_algorithm_unit.py` (new file)
- `backend/tests/test_llm_thread_kinds.py` (new file) OR additions to existing `backend/tests/test_llm_thread.py`

**Forbidden in all 3 plans:**
- Modifying `app/services/voting.py`, `app/services/algorithm.py`, `app/services/shortlist.py`, `app/services/llm.py`, `app/auth.py` (or any source file) — this phase is test-only. If a test reveals a bug, file it as a follow-up; do not patch source in-flight.
- Adding `fail_under` to `backend/pyproject.toml` (Phase 39's job per D-37-05).
- Touching CI workflows (Phase 39's job).
- Touching frontend code (Playwright suite stays as-is per TESTING.md).
- Modifying the existing `db_session` / `client` fixtures in `conftest.py:38-71`.

</scope_fence>
