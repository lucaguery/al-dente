---
phase: 19-validation-surface-fixes
plan: 02
subsystem: testing
tags: [seed, cli, idempotency, uuid5, pytest, sqlalchemy, postgres]

# Dependency graph
requires:
  - phase: 10-e2e-test-infra
    provides: "Idempotent seed CLI with stable uuid5 keys (`_id` helper) and the `aldente_test` Postgres test DB."
  - phase: 11-prod-synthetic
    provides: "Reference D-10/D-11 pattern — `_id_synth(\"cooking_log\", slug)` and `_id_synth(\"shortlist\", \"today\")` with no date in the key."
provides:
  - "Cross-day idempotent `uv run seed` — re-runs on day D+1 (or D+N) merge in place, never duplicate rows."
  - "`backend/tests/test_seed_idempotency.py::test_seed_cross_day_no_duplicates` — pytest pinning the property without waiting 24h."
affects: [v0.2.2 backlog closure, daily dev loop (no more `docker compose down -v`), Phase 19 wave 1, future seed-touching plans]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stable uuid5 keys for `db.merge()` upserts must NOT include time-varying components (date strings, timestamps). Mirror the prod-synthetic D-10/D-11 pattern: pass only stable slugs/literals to `_id()`."
    - "Pytest of seed CLI: monkeypatch `seed_mod.datetime` (the symbol imported at module top), call `run_test_seed()` twice, assert per-household row counts are flat. Autouse fixture hard-DELETEs the household before+after — the seed commits via its own `SessionLocal()` so the conftest rollback fixture doesn't cover it."

key-files:
  created:
    - backend/tests/test_seed_idempotency.py
  modified:
    - backend/app/cli/seed.py

key-decisions:
  - "Dropped date string from CookingLog UUID at seed.py:459 (D-19-14) and DailyShortlist UUID at seed.py:489 (D-19-15) — the prod-synthetic path already shipped the same fix as D-10/D-11."
  - "Kept `cooked_at = now - timedelta(days=N)` sliding timestamps on the 3 cooking logs. With stable UUIDs, `db.merge()` UPDATEs the column in place — the `last_cooked_at` recency signal the audit specs depend on stays correct."
  - "Kept `DailyShortlist.date = today` — only the UUID is now stable. The date column legitimately tracks today and updates on merge."
  - "Test uses an autouse cleanup fixture (not the conftest db_session rollback) because the seed commits its own transactions outside the rolled-back session. Per-test scope is enforced by hard-DELETEing all 6 tables for the test household before and after each test."
  - "Pinned canonical row counts in the test (21 recipes, 3 logs, 1 shortlist, 7 votes) — also catches seed-corpus regressions where someone accidentally adds/removes a recipe spec or vote spec."

patterns-established:
  - "Pattern 1: seed-CLI idempotency tests — monkeypatch the seed module's `datetime` symbol, call the entrypoint twice with simulated day-rollover, assert per-household row counts converge."
  - "Pattern 2: cleanup fixtures around seed tests — autouse `_cleanup_around_test` that does its own DELETEs, since the seed bypasses conftest's transaction rollback."

requirements-completed: [FIX-02]

# Metrics
duration: 13min
completed: 2026-05-11
---

# Phase 19 Plan 02: Seed cross-day idempotency Summary

**Test-seed `CookingLog` + `DailyShortlist` UUIDs no longer encode the calendar date — `uv run seed` is now idempotent across day boundaries via `db.merge()` on stable uuid5 keys, mirroring the prod-synthetic D-10/D-11 pattern.**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-05-11T16:47:00Z
- **Completed:** 2026-05-11T16:59:55Z
- **Tasks:** 2
- **Files modified:** 1 (`backend/app/cli/seed.py`)
- **Files created:** 1 (`backend/tests/test_seed_idempotency.py`)

## Accomplishments
- Closed v0.2.2 SEED-01 / FIX-02: the last GSD-tracked workflow workaround (`docker compose down -v` to clear seed accumulation) is no longer required.
- `run_test_seed` now matches `run_prod_synthetic_seed` byte-for-byte at the two patched call sites (modulo `_id` vs `_id_synth`).
- New backend pytest pins the cross-day property without waiting 24h — monkeypatches `seed_mod.datetime` to simulate day D and day D+1 back-to-back, asserts row counts identical.
- Test also locks the canonical seed shape: 21 recipes, 3 cooking_logs, 1 shortlist, 7 votes. Future seed corpus drift will trip the assertion.

## Task Commits

Each task was committed atomically with `--no-verify`:

1. **Task 1: Drop date components from test-seed UUIDs** — `a58df15` (fix)
2. **Task 2: Add cross-day idempotency pytest** — `35bc03b` (test)

## Files Created/Modified
- `backend/app/cli/seed.py` — 2 line changes: `id=_id("cooking_log", slug, str(cooked_at.date()))` → `id=_id("cooking_log", slug)` (line 459) and `id=_id("shortlist", today.isoformat())` → `id=_id("shortlist", "today")` (line 489). `run_prod_synthetic_seed` UNCHANGED.
- `backend/tests/test_seed_idempotency.py` (NEW) — pytest with autouse `_cleanup_around_test` fixture + `test_seed_cross_day_no_duplicates` that runs the seed twice across simulated day boundary.

## Decisions Made
- **Mirror prod-synthetic verbatim.** The fix is identical in shape to D-10/D-11 (Phase 11) — same pattern, same comment style, same line geometry. Anyone diffing `run_test_seed` against `run_prod_synthetic_seed` at the cooking-log + shortlist sections will see they now match.
- **Pin canonical row counts in the test.** Plus-N regression catcher: if someone later adds a recipe to `_recipe_specs` or a vote to `vote_specs`, the test fails loud with a clear count delta — cheaper than discovering the regression through downstream test churn.
- **Autouse cleanup, not the rollback fixture.** The seed commits via its own `SessionLocal()`, so the conftest `db_session` rollback can't undo it. Hard DELETEs are the only honest way to scope per-test state.

## Deviations from Plan

None — plan executed exactly as written. The action block specified the byte-for-byte replacements (D-19-14 / D-19-15) and the full test file body; both were applied verbatim.

## Issues Encountered

- The `uv run python -c "from app.cli.seed import ..."` import-smoke check failed initially with `ValidationError: database_url required` — that's the pydantic-settings guard on `app/config.py` requiring `DATABASE_URL` in the environment. Resolved by passing `ENVIRONMENT=test` + `DATABASE_URL=...aldente_test` inline. Not a code bug — same env vars are needed to run the seed itself; CI/local already source these from `.env.test`.

## User Setup Required

None — no external service configuration changed. The test reuses the existing `aldente_test` Postgres on port 5433 that Playwright and the seed CLI already target.

## Next Phase Readiness

- FIX-02 / SEED-01 ready to mark complete in REQUIREMENTS.md (parent orchestrator handles).
- Operator can verify locally with: `ENVIRONMENT=test DATABASE_URL=...aldente_test uv run seed && uv run seed` — printed household / member / shortlist UUIDs match across runs.
- Wave 1 of Phase 19 unblocked for the remaining plans (VAL-01 sheet viewport fix, VAL-02 settings push recovery, VAL-03 admin push test endpoint) — none depend on this plan.

## Threat Flags

None — the fix REDUCES surface (test-seed becomes deterministic across days, removing drift). Prod-synthetic and prod-guard paths are unchanged.

## Self-Check: PASSED

- FOUND: `backend/app/cli/seed.py` (modified) — 2 patched lines verified by grep.
- FOUND: `backend/tests/test_seed_idempotency.py` (created, 161 lines).
- FOUND: commit `a58df15` — fix(19-02): drop date components from test-seed UUIDs.
- FOUND: commit `35bc03b` — test(19-02): add cross-day idempotency pytest.
- Test passes: `tests/test_seed_idempotency.py::test_seed_cross_day_no_duplicates PASSED`.
- App imports cleanly: `from app.main import app; print('OK')` → `OK`.

---
*Phase: 19-validation-surface-fixes*
*Completed: 2026-05-11*
