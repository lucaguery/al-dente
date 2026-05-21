# Phase 39 — Migration Safety + CI Gate — Context

**Gathered:** 2026-05-20
**Status:** Ready for planning (decisions pre-locked)

<domain>

## Phase Boundary

Final phase of v0.8. Closes 4 of 33 milestone requirements — and the user's session-level /goal hook.

**Requirements in scope:** MIG-01, MIG-02, CI-01, CI-02.

**Goal:** Every Alembic migration runs upgrade + downgrade clean on a throwaway test DB. GitHub Actions runs the full test+coverage suite on every PR and blocks merge if floors regress.

**Out of phase scope:** Anything not migration / CI related. The 4 rules files are at 100%, all 10 routers have contracts, all 8 invariants have regression tests, repo coverage at 85.0% — Phase 38 sealed the test surface; Phase 39 just enforces it on PRs going forward.

**Starting state (post-Phase 38):**
- Repo coverage: 85.0% line
- Tests: 521 pass / 2 fail (the 2 are pre-existing Category B+C — fail in isolation; see 37-01-SUMMARY)
- 4 rules files at 100% line + 100% branch coverage
- 11 Alembic migrations in `backend/alembic/versions/` to test for upgrade+downgrade safety
- No backend CI workflow exists yet (`.github/workflows/` has only Claude-related workflows)

</domain>

<decisions>

## Implementation Decisions

### D-39-01: Plan split (2 plans)

**Locked:**

- **Plan 39-01: Migration safety** — closes MIG-01 + MIG-02. New `backend/tests/migrations/conftest.py` with a throwaway-DB fixture (creates + drops a dedicated test DB per parametrized migration). New `backend/tests/migrations/test_migration_safety.py` parametrized over all `backend/alembic/versions/*.py` files; each test asserts `alembic upgrade <rev>` followed by `alembic downgrade <prev>` runs without error.

- **Plan 39-02: CI gate** — closes CI-01 + CI-02. Adds `fail_under = 85` to `[tool.coverage.report]` in `backend/pyproject.toml`. Adds per-file `fail_under` for the 4 rules files (mechanism: separate coverage step that asserts each file's % via parsed `--cov-report=json`, since `pyproject.toml` doesn't support per-file `fail_under` natively). Creates `.github/workflows/backend-tests.yml` with Postgres 16 service container, `alembic upgrade head`, seed, `pytest --cov`, coverage JSON artifact upload, and the per-file gate script. Verifies via an intentional 1-line revert in a draft PR (manual gate-validation step).

### D-39-02: Migration test throwaway-DB pattern

**Locked:**

- Per-test fixture creates a new Postgres database named `aldente_test_mig_<test_id>` (UUID-suffixed) on the same container as the main test DB (port 5433).
- Fixture cleans up by dropping the DB at teardown.
- Migrations run via `alembic` CLI subprocesses with `ENVIRONMENT=test` + `DATABASE_URL_TEST` pointing at the throwaway DB.
- Does NOT reuse the connection-scoped txn rollback from `backend/tests/conftest.py` — migration tests need a clean schema baseline, not data isolation within an existing schema.
- Skip the autouse seed (set `pytest.mark.no_autouse_seed` or move migration tests under `backend/tests/migrations/` with its own conftest that overrides the autouse).

### D-39-03: Per-file fail_under mechanism (CI-02)

**Locked:**

- `[tool.coverage.report].fail_under = 85` in `backend/pyproject.toml` handles the repo-wide gate natively.
- Per-file `fail_under = 100` for the 4 rules files: add a tiny `scripts/check_rules_files_coverage.py` (or shell oneliner using `jq` against `coverage.json`) that reads the JSON report and asserts each of the 4 files has `summary.percent_covered == 100`. Wire as a CI step after `pytest --cov`. If any of the 4 drops below 100, CI fails.
- This avoids needing the `pytest-cov` plugin's experimental per-file thresholds which require a specific config shape.

### D-39-04: GitHub Actions workflow shape

**Locked:**

- Name: `backend-tests`
- Trigger: `pull_request` on paths affecting `backend/**` OR push to `main` (defensive — coverage history baseline)
- Job runs on `ubuntu-latest`
- Services: `postgres:16-alpine` with health check, mapping 5432 → 5433 to match local convention OR using the default 5432 if cleaner (planner picks)
- Steps: checkout, install uv, `uv sync`, `set -a; source .env.test.example; set +a` (or inline env), `alembic upgrade head`, `uv run seed`, `uv run pytest --cov=app --cov-report=term --cov-report=json:coverage.json`, per-file gate script, upload `coverage.json` as artifact
- Does NOT trigger any deploy (Railway / Vercel) — pure CI gate per memory `feedback_no_manual_vercel_deploy.md`

### D-39-05: 2 pre-existing test failures handling

**Locked:** The 2 remaining test failures (Category B+C from 37-01-SUMMARY) fail in isolation — they're not test-ordering issues but real test-design problems. Two options:

(a) Investigate + fix as part of Plan 39-02 (CI gate would otherwise red-line on first run).
(b) Mark them `pytest.mark.xfail(strict=False, reason="known issue, tracked in ...")` so CI passes but the test exists.

Planner picks during planning based on cost-of-fix vs cost-of-marking. If fix is < 30 min: do it. Otherwise xfail with explicit tracking comment.

### D-39-06: Branching for CI workflow PR

**Locked:** Plan 39-02 creates the CI workflow file. Per project convention (`feedback_no_manual_vercel_deploy.md`: push to `main` is the only deploy), the workflow ships via the same milestone-close PR. The "intentional 1-line revert in a draft PR" gate-validation step happens AFTER the workflow lands on main — it's a smoke test, not a pre-merge requirement.

### Claude's Discretion

- Whether migration tests share a single throwaway DB across the parameterized run (cheap) or get per-revision DBs (clean). Planner picks per pytest fixture composability.
- Inline env vs `.env.test.example` source in the GHA workflow — planner picks per readability.
- One CI workflow file or split (backend-tests.yml + backend-coverage-gate.yml) — planner picks.

</decisions>

<specifics>

## Specific References

- **11 Alembic migrations** in `backend/alembic/versions/` (per pre-Phase-37 audit: 0001..0012 skipping 0010). Plan 39-01 parameterizes over the actual list at test time.
- **`backend/alembic/env.py`** — uses `DATABASE_URL` from settings. Throwaway-DB fixture must override.
- **`backend/app/config.py`** — when `ENVIRONMENT=test`, `database_url` is overwritten by `DATABASE_URL_TEST`. Migration tests set both.
- **`backend/app/cli/seed.py`** — autouse seed in main conftest; migration tests should NOT auto-seed (clean DB only).
- **Existing CI workflows in `.github/workflows/`:** `claude-code-review.yml`, `claude.yml`. New `backend-tests.yml` is independent of these.
- **`backend/pyproject.toml`** — current `[tool.coverage.run]` + `[tool.coverage.report]` sections (from quick-260519-uxn) need `fail_under = 85` added to `[tool.coverage.report]`.
- **Memory `feedback_no_manual_vercel_deploy.md`:** CI runs in GHA only — never trigger Railway or Vercel deploys.

</specifics>

<canonical_refs>

## Canonical References

- `.planning/REQUIREMENTS.md` — MIG-01/02 + CI-01/02 acceptance criteria.
- `.planning/ROADMAP.md` — Phase 39 boundaries.
- `.planning/phases/37-test-infrastructure-service-branch-coverage/37-01-SUMMARY.md` — Category B+C failure description (D-39-05 input).
- `.planning/phases/38-endpoint-contract-invariant-coverage/38-04-SUMMARY.md` — final repo coverage 85.0% (D-39-03 anchor).
- `backend/CLAUDE.md` — Railway deploy via `alembic upgrade head` on push (don't break this contract).
- `TESTING.md` — local test bootstrap (CI workflow mirrors the local steps).

</canonical_refs>

<scope_fence>

## Scope Fence

**Plan 39-01 may modify ONLY:**
- `backend/tests/migrations/__init__.py` (new — empty)
- `backend/tests/migrations/conftest.py` (new — throwaway-DB fixture)
- `backend/tests/migrations/test_migration_safety.py` (new — parameterized upgrade+downgrade)

**Plan 39-02 may modify ONLY:**
- `backend/pyproject.toml` (add `fail_under = 85` to `[tool.coverage.report]`)
- `scripts/check_rules_files_coverage.py` (new) OR an inline bash check in the workflow
- `.github/workflows/backend-tests.yml` (new)
- The 2 pre-existing failing test files IF D-39-05 picks "fix" (`backend/tests/test_llm_thread.py`, `backend/tests/test_question_endpoints.py`) OR `pytest.mark.xfail` additions on the same 2 files

**Forbidden in both plans:**
- Modifying any source under `backend/app/` (still test-only phase).
- Modifying frontend code, other CI workflows, Railway/Vercel config, or `.planning/` files (orchestrator handles docs commit).
- Triggering any Railway or Vercel deploy from CI.

</scope_fence>
