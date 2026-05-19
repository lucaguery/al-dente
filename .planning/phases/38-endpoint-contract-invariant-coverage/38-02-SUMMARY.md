---
phase: 38-endpoint-contract-invariant-coverage
plan: "02"
subsystem: backend-tests
tags: [pytest, router-contracts, data-routers, 404-cross-household, 401-auth, coverage]
dependency_graph:
  requires: [38-01]
  provides: [router-contracts-data, 404-not-403-locked, coverage-baseline-38-02]
  affects:
    - backend/tests/test_households_contract.py
    - backend/tests/test_recipes_contract.py
    - backend/tests/test_cooking_logs_contract.py
    - backend/tests/test_votes_contract.py
    - backend/tests/test_shortlist_contract.py
tech_stack:
  added: []
  patterns: [4-test-router-contract, 404-not-403-enforcement, savepoint-flush-cross-household]
key_files:
  created:
    - backend/tests/test_households_contract.py
    - backend/tests/test_recipes_contract.py
    - backend/tests/test_cooking_logs_contract.py
    - backend/tests/test_votes_contract.py
    - backend/tests/test_shortlist_contract.py
  modified: []
decisions:
  - "households 404 test uses GET /households/by-code/{unknown-code} (not /me) — the /me endpoint is self-scoped by auth token so cross-household probing is not possible through it"
  - "recipes Group B uses POST /recipes (blank-draft) as capture endpoint — POST /recipes/quick was deleted in Phase 27 CAPTURE-03"
  - "votes 422 slot replaced by 400 — the router uses HTTPException(400) for recipe-not-in-shortlist (per plan interfaces block documenting this exception)"
  - "per-test cross-household isolation uses db_session.flush() (NOT commit) inside tests — 38-01 SAVEPOINT contract keeps rows inside the outer rollback envelope"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-20"
  tasks_completed: 3
  files_modified: 5
---

# Phase 38 Plan 02: Data-Router Contract Tests Summary

**One-liner:** 5 new contract test files (28 tests) lock the happy/401/404-cross-household/validation contract for all 5 data routers; votes reaches 100% line coverage; repo rises from 68.6% to 70.5%.

## Result

| Metric | Before (post-38-01) | After (Plan 38-02) |
|--------|---------------------|--------------------|
| Tests passed | 302 | 330 |
| Tests failed | 2 | 2 (same pre-existing B+C) |
| New contract test files | 0 | 5 |
| New tests added | 0 | 28 |
| Repo line coverage (TOTAL) | 68.6% | 70.5% |

## Per-Router Coverage Delta

| Router | Before (without new tests) | After (with new tests) | Delta |
|--------|---------------------------|------------------------|-------|
| `app/routers/households.py` | 52.2% | 63.3% | +11.1pp |
| `app/routers/recipes.py` | 63.8% | 68.3% | +4.5pp |
| `app/routers/cooking_logs.py` | 66.3% | 66.3% | 0pp (paths already covered by existing tests) |
| `app/routers/votes.py` | 48.6% | **100.0%** | +51.4pp |
| `app/routers/shortlist.py` | 37.8% | 59.5% | +21.7pp |

## REQ-IDs Closed

| REQ-ID | Router | Contract File |
|--------|--------|---------------|
| ROUT-01 | `routers/households.py` | `test_households_contract.py` |
| ROUT-03 | `routers/recipes.py` | `test_recipes_contract.py` |
| ROUT-06 | `routers/shortlist.py` | `test_shortlist_contract.py` |
| ROUT-07 | `routers/votes.py` | `test_votes_contract.py` |
| ROUT-08 | `routers/cooking_logs.py` | `test_cooking_logs_contract.py` |

## D-38-02 Cross-Household 404 Enforcement

Each contract file contains at least one assertion that `response.status_code == 404`
for the cross-household test case. The assertion lines (verified by grep):

| File | Cross-household assert line |
|------|-----------------------------|
| `test_households_contract.py` | `assert resp.status_code == 404, resp.text` |
| `test_cooking_logs_contract.py` | `assert resp.status_code == 404, resp.text` |
| `test_votes_contract.py` | `assert resp.status_code == 404, resp.text` |
| `test_recipes_contract.py` | `assert resp.status_code == 404, resp.text` (×3, one per class) |
| `test_shortlist_contract.py` | `assert resp.status_code == 404, resp.text` |

Each cross-household test inserts a foreign Household + Member + resource via
`db_session.flush()` (NOT `commit()`) inside the test body — the 38-01 SAVEPOINT
wrapper guarantees these rows roll back at teardown.

## Test File Structure

### test_households_contract.py — 4 tests (ROUT-01)
- `test_households_happy_path` — GET /households/me → 200 + SessionResponse shape
- `test_households_401_missing_auth` — GET /households/me (no auth) → 401
- `test_households_404_cross_household` — GET /households/by-code/{unknown} → 404
- `test_households_422_validation` — POST /households/join (missing fields) → 422

### test_cooking_logs_contract.py — 4 tests (ROUT-08)
- `test_cooking_logs_happy_path` — GET /cooking-logs/active → 200 (null or log)
- `test_cooking_logs_401_missing_auth` — GET /cooking-logs/active (no auth) → 401
- `test_cooking_logs_404_cross_household` — GET /cooking-logs/{foreign_id} → 404
- `test_cooking_logs_422_validation` — GET /cooking-logs/{bad-uuid} → 422

### test_votes_contract.py — 4 tests (ROUT-07)
- `test_votes_happy_path` — POST /shortlists/{id}/recipes/{id}/vote → 201 + VoteResponse
- `test_votes_401_missing_auth` — same with no auth → 401
- `test_votes_404_cross_household` — POST vote on foreign shortlist → 404
- `test_votes_400_recipe_not_in_shortlist` — POST vote with recipe not in shortlist → 400

Note: The votes router uses `HTTPException(400)` for the recipe-not-in-shortlist
validation case (per `routers/votes.py:50`), not 422. The plan's `<interfaces>` block
explicitly documented this: `raise HTTPException(400, "recipe not in this shortlist")`.

### test_recipes_contract.py — 12 tests (ROUT-03, 3 method groups × 4 cases)
- `TestRecipesReadContract` (GET /recipes/{id}): happy/401/404-cross-household/422-bad-uuid
- `TestRecipesCaptureContract` (POST /recipes + /turns): happy-201/401/404-non-existent/422-missing-kind
- `TestRecipesEditContract` (PUT /recipes/{id}): happy/401/404-cross-household/422-out-of-range-field

Note: POST /recipes/quick was deleted in Phase 27 CAPTURE-03. Group B tests the
current capture entry point (POST /recipes blank-draft create) as documented in
`routers/recipes.py` module docstring and CONTEXT.md D-12.

### test_shortlist_contract.py — 4 tests (ROUT-06)
- `test_shortlist_happy_path` — GET /shortlists/today → 200 (null or ShortlistResponse)
- `test_shortlist_401_missing_auth` — GET /shortlists/today (no auth) → 401
- `test_shortlist_404_cross_household` — POST /shortlists/{foreign_id}/delegate → 404
- `test_shortlist_422_validation` — POST /shortlists/{bad-uuid}/delegate → 422

## No Source Files Modified

`git diff --stat a78daafa..HEAD -- backend/app/` is empty. D-38-07 enforcement: VERIFIED.

## Follow-up TODOs (surfaced during implementation, out of scope for Plan 38-02)

1. **cooking_logs.py coverage plateau at 66.3%:** The remaining uncovered lines are in
   `upload_cooking_log_photo_endpoint` (lines 437-488) and `cooking_log_signed_photo_url`
   (lines 503-514). These require multipart file upload and Supabase Storage stubs.
   Plan 38-03 (infra routers) includes `photos.py` and may introduce the upload test
   harness needed; Plan 38-04 can add gap-closure tests if COV-01 (≥85%) requires them.

2. **recipes.py remaining gaps (31.7% uncovered):** Large router — the uncovered paths
   include: voice-modify (lines 445-472, requires Gemini stub), retry-promotion (needs
   failed recipe fixture), photo turns (multipart), question trigger/defer (well-covered
   by existing test_question_endpoints.py). Plan 38-04 will add targeted invariant tests.

3. **shortlist.py regenerate path (lines 106-125):** `POST /shortlists/regenerate` is
   not covered by the 4-test contract (the endpoint calls `generate_daily_shortlist`
   which needs a non-empty corpus with at least one `structured` recipe). The shortlist
   unit tests in `test_shortlist_unit.py` cover the service-level behavior. A targeted
   integration test in Plan 38-04 can close this gap.

4. **2 pre-existing failures remain:** `test_llm_thread.py::test_process_thread_turn_failure_records_on_turn_payload`
   and `test_question_endpoints.py::test_defer_suppresses_question_in_run_thread_llm`
   are Category B and C bugs documented in 38-01-SUMMARY §Follow-up TODOs. They are
   out of scope for this plan (D-38-07).

## Known Stubs

None — this plan creates only test files. No UI-rendering components or data-source
stubs introduced.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes
introduced. Test files only.

## Self-Check: PASSED

- `backend/tests/test_households_contract.py` exists and contains 4 test functions ✓
- `backend/tests/test_cooking_logs_contract.py` exists and contains 4 test functions ✓
- `backend/tests/test_votes_contract.py` exists and contains 4 test functions ✓
- `backend/tests/test_recipes_contract.py` exists and contains 12 test functions (3 classes × 4) ✓
- `backend/tests/test_shortlist_contract.py` exists and contains 4 test functions ✓
- All 28 new tests pass (330 total pass vs 302 baseline) ✓
- 2 pre-existing failures unchanged (Category B+C, out of scope) ✓
- Each cross-household test asserts `status_code == 404` (grep confirms) ✓
- `git diff --stat a78daafa..HEAD -- backend/app/` is empty (no source files touched) ✓
- Repo coverage: 70.5% ≥ 68.6% baseline ✓
- Commits `b891913` (Task 1) and `ceb1801` (Task 2) exist in git log ✓
