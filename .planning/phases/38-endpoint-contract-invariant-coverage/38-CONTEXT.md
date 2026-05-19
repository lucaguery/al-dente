# Phase 38 — Endpoint Contract + Invariant Coverage — Context

**Gathered:** 2026-05-19
**Status:** Ready for planning (decisions pre-locked at orchestration time)

<domain>

## Phase Boundary

Phase 38 of v0.8 (Backend Coverage Until Done). Closes 19 of 33 milestone requirements (the largest phase).

**Requirements in scope:** ROUT-01..10, INV-01..08, COV-01.

**Goal:** Every router has a 4-test contract (happy/401/404-cross-household/validation). Every CLAUDE.md architecture invariant has ≥1 named regression test. Repo line coverage reaches ≥85%.

**Out of phase scope:** migration safety (Phase 39 MIG-*), CI gate (Phase 39 CI-*). `fail_under` thresholds also wait for Phase 39 (per D-37-05 established in Phase 37).

**Starting state (post-Phase 37):**
- Repo coverage: 64.5% line
- Tests: 288 pass / 16 fail (all 16 are test_turns.py isolation bugs to be fixed by Plan 38-01)
- 4 rules files at 100% (services/voting, services/algorithm, services/shortlist, auth)
- services/llm at 65.7% (Phase 37 SERV-04 sweep brought it from 13.4%)

</domain>

<decisions>

## Implementation Decisions

### D-38-01: Plan split (4 plans)

**Locked:**

- **Plan 38-01: test_turns.py isolation fix** — pre-requisite cleanup. Unblock the 16 failing tests. No new tests; restructure existing tests to honor the per-test rollback contract. Likely uses SAVEPOINT (nested-transaction) pattern in `conftest.py`'s `db_session` so commits-inside-tests roll back at outer fixture teardown. Planner reads `test_turns.py` to confirm root cause + picks fix shape. **Closes no reqs directly; prereq for COV-01.**

- **Plan 38-02: Data-router contract tests (5 routers)** — `households`, `recipes`, `cooking_logs`, `votes`, `shortlist`. 4 tests each (happy / 401 missing-or-invalid-auth / 404 cross-household / validation). One test file per router. **Closes ROUT-01, ROUT-03, ROUT-06, ROUT-07, ROUT-08.**

- **Plan 38-03: Infra-router contract tests (5 routers)** — `auth_session`, `exports`, `photos`, `push`, `ws`. 4 tests each, adapted per router (auth_session has special semantics; ws uses handshake auth + close-code assertions). **Closes ROUT-02, ROUT-04, ROUT-05, ROUT-09, ROUT-10.**

- **Plan 38-04: Architecture invariant regression tests (8 tests) + COV-01 closure** — one named regression test per CLAUDE.md invariant. After tests land, run full coverage and confirm repo total ≥ 85%. If gap remains, add targeted follow-up tests in the same plan to close. **Closes INV-01..08 + COV-01.**

### D-38-02: 404-not-403 enforcement

**Locked:** Every ROUT plan's cross-household-access test must assert `response.status_code == 404` (NOT 403). Per `CLAUDE.md` cross-household isolation pattern: "Cross-household reads return 404 (not 403) to avoid leaking record existence". This is invariant — writing the test wrong (expecting 403) is a common mistake.

### D-38-03: Invariant test failure-mode verification

**Locked:** Each invariant test must demonstrably fail when the invariant is violated. Plan 38-04's verify step instructs the executor to:
1. Run the test (it passes).
2. Apply a 1-line break to the corresponding source (e.g. add a `state` column to votes for INV-02, remove a broadcast call for INV-04).
3. Re-run the test (it MUST fail).
4. Revert the break via `git checkout --`.
5. Capture both pass-on-truth and fail-on-violation outcomes in 38-04-SUMMARY.md.

**Why:** Per CONTEXT D-12 (v0.2.1 testing milestone, recorded in `.planning/v0.3/RUNBOOK.md`) — the suite must demonstrate it catches regressions, not just runs green.

### D-38-04: Invariant #6 (next-intl backend) test shape

**Locked:** Planner reads `app/routers/*.py` first to determine whether HTTPException details are:
- (a) raw French strings (e.g. `detail="Foyer introuvable"`)
- (b) internal error codes routed through frontend translation (e.g. `detail="household_not_found"`)
- (c) a mix

The test asserts the chosen convention is consistent and that no raw English user-visible strings leak through. The test catalogue is sourced by grepping `HTTPException(.*detail=` across `app/routers/`.

### D-38-05: WebSocket router (ROUT-10) test adaptation

**Locked:** The `ws` router doesn't have HTTP 401/404 semantics — it uses WebSocket close codes. Plan 38-03's ws-contract test adapts:
- Happy path: handshake auth succeeds → connection stays open.
- 401-equivalent: handshake with missing/invalid token → connection closes with code 4401 (or similar custom code in `routers/ws.py`).
- 404-cross-household-equivalent: subscribe to a household the auth token doesn't belong to → connection closes with code 4404 (or similar).
- Validation: malformed frame → connection error or close with code 4400.

Planner reads `routers/ws.py` to confirm actual close codes.

### D-38-06: COV-01 closure path

**Locked:** After Plan 38-04 lands the 8 invariant tests, run `pytest --cov=app --cov-report=term-missing` and capture the new repo total. Expected: routers go from ~25% baseline to ~80%+ each via Plans 38-02/03; combined with the 4 rules files at 100% and llm.py at ~75%+, the repo total should land at or above 85%.

If still under 85% after invariant tests, the same plan (38-04) adds targeted follow-up tests on the highest-statement-count gaps (likely additional llm.py paths). **No raising the bar** — 85% is the floor.

### D-38-07: Plan 38-01 source-file allowlist

**Locked:** Plan 38-01 modifies only `backend/tests/test_turns.py` and possibly `backend/tests/conftest.py` (small addition if SAVEPOINT pattern picked). Does NOT touch `backend/app/`. If a real product bug is uncovered during the fix, surface as a follow-up TODO in 38-01-SUMMARY; do not patch.

### Claude's Discretion

- One file per router vs grouped (`test_contracts_data.py`) — planner picks per readability heuristic.
- One file per invariant vs consolidated `test_architecture_invariants.py` — planner picks.
- Internal test structure (parametrize vs separate functions) — planner picks.
- Exact monkeypatch points if routers depend on services that should be stubbed for contract tests — planner picks.

</decisions>

<specifics>

## Specific References

- **Phase 37 SUMMARYs** (`.planning/phases/37-test-infrastructure-service-branch-coverage/37-0{1,2,3}-SUMMARY.md`) — coverage deltas and the 16-failure flag.
- **Existing router unit tests** — search for `test_<router>.py` files in `backend/tests/`. Some routers may have partial test coverage already; the new contract tests should be additive, not redundant.
- **conftest.py:38-71** — existing `db_session` + `client` fixtures. Plan 38-01's SAVEPOINT pattern (if chosen) wraps the existing connection-scoped txn rollback with a nested transaction layer.
- **CLAUDE.md invariants #1-#8** — the source-of-truth list. Each invariant test references the invariant number explicitly in its docstring and test name (e.g. `test_invariant_2_votes_table_has_no_state_column`).
- **conftest.py autouse seed** — Plan 37-01 added `_seeded_database` fixture. Router happy-path tests can lean on the seeded `Foyer Test` household; cross-household tests need to create a second household within the test (or use a second seed already present).
- **Locked auth flow** — `aldente_auth` HttpOnly cookie (per invariant #8). Routes accept Bearer fallback only for cross-origin local dev. Contract tests for `auth_session` (Plan 38-03) exercise both shapes.
- **Realtime broadcasts** — `services/realtime.broadcast_to_household` is the spy point for INV-04. Tests monkeypatch this function and assert call counts/args.

</specifics>

<canonical_refs>

## Canonical References

- `.planning/REQUIREMENTS.md` — REQ-IDs and acceptance criteria.
- `.planning/ROADMAP.md` — phase boundaries and success criteria.
- `.planning/phases/37-test-infrastructure-service-branch-coverage/37-CONTEXT.md` — sibling phase's pre-locked decisions (D-37-01..05).
- `.planning/phases/37-test-infrastructure-service-branch-coverage/37-0{1,2,3}-SUMMARY.md` — direct dependencies for Plan 38-01's chain context.
- `CLAUDE.md` (root) — 8 architecture invariants, cross-household pattern, vocabularies, deploy contract.
- `backend/CLAUDE.md` — Gemini SDK, single-uvicorn-worker reasoning (invariant #7 anchor).
- `.planning/v0.3/RUNBOOK.md` (and CONTEXT D-12) — "the suite must demonstrate it catches regressions" principle behind D-38-03.

</canonical_refs>

<scope_fence>

## Scope Fence (per memory feedback_executor_scope_creep)

**Plan 38-01 may modify ONLY:**
- `backend/tests/test_turns.py` (modified — restructure to honor per-test rollback)
- `backend/tests/conftest.py` (small addition allowed IF SAVEPOINT pattern is picked; existing fixtures untouched)

**Plan 38-02 may modify ONLY:**
- `backend/tests/test_households_contract.py` (new) OR additions to existing test_households.py
- `backend/tests/test_recipes_contract.py` (new) OR additions to existing test_recipes.py
- `backend/tests/test_cooking_logs_contract.py` (new) OR additions to existing test_cooking_logs.py
- `backend/tests/test_votes_contract.py` (new)
- `backend/tests/test_shortlist_contract.py` (new)

**Plan 38-03 may modify ONLY:**
- `backend/tests/test_auth_session_contract.py` (new)
- `backend/tests/test_exports_contract.py` (new)
- `backend/tests/test_photos_contract.py` (new) OR additions to existing test_photos.py
- `backend/tests/test_push_contract.py` (new) OR additions to existing test_push_test_endpoint.py
- `backend/tests/test_ws_contract.py` (new) — WebSocket handshake + close-code assertions

**Plan 38-04 may modify ONLY:**
- `backend/tests/test_architecture_invariants.py` (new) OR `backend/tests/test_invariant_<N>_<slug>.py` × 8 (planner picks)
- Additional follow-up test files if COV-01 (≥85%) requires gap-closure tests after invariants land

**Forbidden in all 4 plans:**
- Modifying any file under `backend/app/` (source code — test-only phase). If a test reveals a bug, file a follow-up TODO; do not patch source.
- Adding `fail_under` to `backend/pyproject.toml` (Phase 39's job).
- Touching CI workflows under `.github/workflows/` (Phase 39).
- Touching frontend code (out of milestone scope).
- Modifying the existing `db_session` and `client` fixtures behavior (Plan 38-01's SAVEPOINT addition wraps, doesn't replace).

</scope_fence>
