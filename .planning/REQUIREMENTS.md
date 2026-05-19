# Milestone v0.8 Requirements — Backend Coverage Until Done

**Status:** Roadmap created 2026-05-19 · Phase 37 defining scope
**Goal:** Backend test suite catches any regression to a documented architectural invariant, endpoint contract, or business-logic state machine. Line coverage is a sanity floor, not the target.
**Baseline (quick-260519-uxn):** 35.9% line / 6.8% branch · 4 rules files at 17.6% / 22.0% / 35.5% / 82.5%

This file lists requirements. Phase mapping is filled by `gsd-roadmapper` into the Traceability section below.

---

## Active Requirements

### Coverage Infrastructure (COV × 7)

Plumbing that makes the rest measurable. Lands first; everything else depends on it.

- [x] **COV-01**: Repo-wide line coverage reaches ≥ 85%, asserted via `[tool.coverage.report].fail_under` in `backend/pyproject.toml` and enforced in CI.
- [ ] **COV-02**: `app/services/voting.py` reaches 100% line coverage, asserted via per-file `fail_under = 100`.
- [ ] **COV-03**: `app/services/algorithm.py` reaches 100% line coverage, asserted via per-file `fail_under = 100`.
- [ ] **COV-04**: `app/services/shortlist.py` reaches 100% line coverage, asserted via per-file `fail_under = 100`.
- [ ] **COV-05**: `app/auth.py` reaches 100% line coverage, asserted via per-file `fail_under = 100`.
- [ ] **COV-06**: The 96 currently-failing tests (all blocked on missing seed `test-token-luca`) run green. Mechanism TBD during Phase 37 discuss-phase: either (a) autouse session-scoped seed fixture, or (b) rewrite tests to insert their own data.
- [ ] **COV-07**: `app/services/svg_sanitizer_test.py` is relocated to `backend/tests/test_svg_sanitizer.py` so coverage measures it as a test, not as untested source.

### Architectural Invariant Regressions (INV × 8)

One named regression test per CLAUDE.md architecture invariant. Each test fails if the invariant is violated.

- [x] **INV-01**: Regression test asserts all five capture surfaces (`quick`, full-form, `voice`, `photo`, `url`) dispatch through `promote_draft(recipe_id)`. (Invariant #1)
- [x] **INV-02**: Regression test asserts the `votes` table has no `state` column; vote state is computed via `services/voting.compute_vote_state` from rows. (Invariant #2)
- [x] **INV-03**: Regression test asserts `recipes.last_cooked_at` and `recipes.cook_count` update atomically with `cooking_logs` insert (same DB transaction). (Invariant #3)
- [x] **INV-04**: Regression test asserts every household-mutation endpoint broadcasts via `services/realtime.broadcast_to_household` (`recipe.created`, `recipe.promoted`, `recipe.updated`, `turn.created`, `turn.updated`, `vote.created`, `cooking_log.*`). (Invariant #4)
- [x] **INV-05**: Regression test asserts the first user turn (position 0) of each recipe preserves capture payload verbatim and is immutable; `recipes.source_capture` column no longer exists. (Invariant #5)
- [x] **INV-06**: Regression test asserts APScheduler runs in-process at module level and registers exactly one shortlist job per household at lifespan startup (single-worker assumption). (Invariant #7)
- [x] **INV-07**: Regression test asserts auth via the `aldente_auth` HttpOnly cookie wins over (and is mutually exclusive with) the Bearer-header fallback used only in cross-origin local dev. (Invariant #8)
- [x] **INV-08**: Regression test asserts every `HTTPException(detail=...)` user-visible string is wrapped in or sourced from a French translation key (or is a recognized internal code), not raw English. (Invariant #6 — backend side)

### Endpoint Contract Coverage (ROUT × 10)

Each router gets a 4-test contract: happy path, 401 on missing/invalid auth, 404 on cross-household access (NOT 403 — invariant), validation failure case.

- [ ] **ROUT-01**: `routers/households` — 4-test contract.
- [x] **ROUT-02**: `routers/auth_session` — 4-test contract (401/404 cases adapted to session endpoints).
- [ ] **ROUT-03**: `routers/recipes` — 4-test contract per HTTP method group (GET, POST capture, PUT, DELETE).
- [x] **ROUT-04**: `routers/exports` — 4-test contract.
- [x] **ROUT-05**: `routers/photos` — 4-test contract (includes signed-URL retrieval + multipart upload).
- [ ] **ROUT-06**: `routers/shortlist` — 4-test contract.
- [ ] **ROUT-07**: `routers/votes` — 4-test contract.
- [ ] **ROUT-08**: `routers/cooking_logs` — 4-test contract.
- [x] **ROUT-09**: `routers/push` — 4-test contract.
- [x] **ROUT-10**: `routers/ws` — adapted WebSocket contract: handshake auth happy path, 401 close on missing/invalid auth, 404 close on cross-household subscribe, malformed-frame validation.

### Service Branch Coverage (SERV × 4)

Targeted unit tests of state machines and scoring branches. Each requirement drives one rules file (or the LLM thread processor) toward 100%.

- [ ] **SERV-01**: `services/voting.compute_vote_state` is tested for all 5 vote states (Validé / Pressenti / Contesté / Rejeté / Sans avis) across household sizes 1 and 2.
- [ ] **SERV-02**: `services/algorithm` scoring is tested for every weight and penalty branch (cuisine match, last-cooked recency, mood alignment, season alignment, protein rotation, difficulty fit).
- [ ] **SERV-03**: `services/shortlist.generate_daily_shortlist` is tested for empty candidate pool, partial pool (< target size), full pool (> target size), and idempotent re-run (same generation timestamp produces same set).
- [ ] **SERV-04**: `services/llm` thread-processing is tested with each `TurnKind` (`text`, `voice`, `photo`, `url`, `answer`, `proposal_accepted`, `proposal_dismissed`); Gemini SDK monkeypatched to canned responses; covers extraction-hash idempotency + advisory emission on manual-edit conflict.

### Migration Safety (MIG × 2)

- [ ] **MIG-01**: `backend/tests/migrations/conftest.py` provides a throwaway-DB fixture (create + drop a dedicated test DB per test) — separate from the connection-scoped txn rollback fixture used by `tests/conftest.py`.
- [ ] **MIG-02**: One parameterized test per file in `backend/alembic/versions/*.py` asserts `alembic upgrade <rev>` followed by `alembic downgrade <prev>` runs without error on a clean DB.

### CI Gate (CI × 2)

- [ ] **CI-01**: `.github/workflows/backend-tests.yml` runs on every PR: spins up Postgres 16 service container on 5433, applies migrations, runs seed, runs `pytest --cov`, uploads coverage HTML as artifact.
- [ ] **CI-02**: CI fails the PR if `coverage report --fail-under=85` fails OR any of the 4 rules files drops below per-file `fail_under = 100`. An intentional 1-line revert in a draft PR demonstrates a red build.

---

## Out of Scope (explicit cuts for this milestone)

- **Frontend test coverage.** Playwright suite in `frontend/tests/e2e/` stays as-is per `TESTING.md`. Frontend unit/component coverage is productize-later.
- **Trivial type tests.** No tests for SQLAlchemy column definitions, Pydantic schema field validators, or DI wiring with no behavior — covered implicitly by other tests OR by mypy at boundaries.
- **Performance / load testing.** Couple-scale workload; orthogonal to correctness floor.
- **Productize-later items.** `# TODO(productize)` markers are out — those features land when the project leaves MVP.
- **UI-REVIEW / UI-AUDIT regeneration.** Visual-quality audits are owned by `/gsd-ui-review`, not this milestone.
- **End-to-end Gemini API calls.** Tests monkeypatch the Gemini SDK — no real network requests in CI.
- **Realtime WebSocket sync correctness across multiple clients.** INV-04 asserts the broadcast call is made; multi-client convergence tests are productize-later (would need test harness coordination).

---

## Traceability

| REQ-ID | Phase | Plan(s) | Status |
|--------|-------|---------|--------|
| COV-01 | Phase 38 | TBD | Pending |
| COV-02 | Phase 37 | TBD | Pending |
| COV-03 | Phase 37 | TBD | Pending |
| COV-04 | Phase 37 | TBD | Pending |
| COV-05 | Phase 37 | TBD | Pending |
| COV-06 | Phase 37 | TBD | Pending |
| COV-07 | Phase 37 | TBD | Pending |
| INV-01 | Phase 38 | TBD | Pending |
| INV-02 | Phase 38 | TBD | Pending |
| INV-03 | Phase 38 | TBD | Pending |
| INV-04 | Phase 38 | TBD | Pending |
| INV-05 | Phase 38 | TBD | Pending |
| INV-06 | Phase 38 | TBD | Pending |
| INV-07 | Phase 38 | TBD | Pending |
| INV-08 | Phase 38 | TBD | Pending |
| ROUT-01 | Phase 38 | TBD | Pending |
| ROUT-02 | Phase 38 | TBD | Pending |
| ROUT-03 | Phase 38 | TBD | Pending |
| ROUT-04 | Phase 38 | TBD | Pending |
| ROUT-05 | Phase 38 | TBD | Pending |
| ROUT-06 | Phase 38 | TBD | Pending |
| ROUT-07 | Phase 38 | TBD | Pending |
| ROUT-08 | Phase 38 | TBD | Pending |
| ROUT-09 | Phase 38 | TBD | Pending |
| ROUT-10 | Phase 38 | TBD | Pending |
| SERV-01 | Phase 37 | TBD | Pending |
| SERV-02 | Phase 37 | TBD | Pending |
| SERV-03 | Phase 37 | TBD | Pending |
| SERV-04 | Phase 37 | TBD | Pending |
| MIG-01 | Phase 39 | TBD | Pending |
| MIG-02 | Phase 39 | TBD | Pending |
| CI-01 | Phase 39 | TBD | Pending |
| CI-02 | Phase 39 | TBD | Pending |

---

*Total: 33 requirements across 6 categories. Anchored on baseline 35.9% line / 6.8% branch (quick-260519-uxn, 2026-05-19). Roadmap: Phase 37 (COV-02..07 + SERV-01..04) → Phase 38 (ROUT-01..10 + INV-01..08 + COV-01) → Phase 39 (MIG-01..02 + CI-01..02).*
