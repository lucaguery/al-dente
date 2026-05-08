---
phase: 10-e2e-test-infrastructure
plan: 01
subsystem: testing
tags: [docker, postgres, pydantic-settings, alembic, gitignore, env]

# Dependency graph
requires: []
provides:
  - Test Postgres container on 127.0.0.1:5433/aldente_test (postgres:16-alpine)
  - .env.test contract documenting ENVIRONMENT, DATABASE_URL_TEST, SEED_AUTH_TOKEN, NEXT_PUBLIC_API_BASE
  - .gitignore guard preventing accidental .env.test commit (with .env.test.example allow-list)
  - In-place override of settings.database_url when ENVIRONMENT=test, so db.py and alembic/env.py both target the test DB without any signature change
affects:
  - 10-02 (uvicorn webServer / playwright config will pass ENVIRONMENT=test + DATABASE_URL_TEST)
  - 10-03 (seed CLI will refuse non-test env and rely on this switch)
  - 10-04..10-07 (every downstream plan that runs the suite depends on the test DB substrate)

# Tech tracking
tech-stack:
  added:
    - postgres:16-alpine (test container only — not added to product runtime)
  patterns:
    - "Single-field, in-place URL switch in config.py post-init: db.py and alembic/env.py read settings.database_url unchanged (Pitfall 6 mitigation)"
    - ".env.test pattern with explicit allow-list for the .example sibling file"

key-files:
  created:
    - docker-compose.test.yml
    - .env.test.example
  modified:
    - .gitignore (added .env.test deny + .env.test.example allow-list)
    - backend/app/config.py (1 new field + 4-line post-init guard)

key-decisions:
  - "Approach (a) from Pitfall 6: keep settings.database_url as the single field, overwrite in place at module init when ENVIRONMENT=test. db.py and alembic/env.py untouched (zero diff verified)."
  - "Host-only port binding 127.0.0.1:5433:5432 (T-10-05 mitigation) — refuses LAN exposure."
  - ".env.test.example carries the full URL value postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test so docker-compose port + env contract are byte-aligned."

patterns-established:
  - "Phase-10 scope discipline: when files_modified includes a file but the action is verify-untouched, the file is in scope only as a scope-creep tripwire — git diff is the gate."
  - "Test-mode env switch via post-init mutation, not a property: keeps the single access-path invariant that downstream files (db.py, alembic/env.py, future services) all rely on."

requirements-completed: [TEST-01, TEST-03]

# Metrics
duration: ~5min
completed: 2026-05-08
---

# Phase 10 Plan 01: E2E Test Substrate Summary

**Test Postgres on :5433/aldente_test plus a single-field in-place URL switch in config.py that flips db.py and alembic/env.py to the test DB when ENVIRONMENT=test — with zero diff to either file.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-08
- **Completed:** 2026-05-08
- **Tasks:** 2 / 2
- **Files modified:** 4 (2 created, 2 patched, 2 verified-untouched)

## Accomplishments

- `docker-compose.test.yml` shipped: `postgres:16-alpine` on `127.0.0.1:5433`, named volume `aldente_test_pg_data`, `pg_isready` healthcheck (2s/3s/20 retries).
- `.env.test.example` shipped with the four contract vars (`ENVIRONMENT=test`, `DATABASE_URL_TEST`, `SEED_AUTH_TOKEN=test-token-luca`, `NEXT_PUBLIC_API_BASE`).
- `.gitignore` patched with explicit deny for `.env.test` / `.env.test.local` plus an allow-list `!.env.test.example`. `git check-ignore` verifies in both directions.
- `backend/app/config.py` patched: new `database_url_test: str = ""` field + a 4-line post-init guard that overwrites `settings.database_url` when `environment == "test"` and the test URL is set. `db.py` and `alembic/env.py` both continue to read `settings.database_url` and pick up the test URL without any change to their own code.

## Task Commits

1. **Task 1: docker-compose.test.yml + .env.test.example + .gitignore guard** — `7c469a5` (chore)
2. **Task 2: ENVIRONMENT=test → DATABASE_URL_TEST switch in config.py** — `2f73bbb` (feat)

## Files Created/Modified

- `docker-compose.test.yml` (NEW) — test Postgres 16-alpine, port 5433, host-only binding.
- `.env.test.example` (NEW) — env-var contract for the test runtime.
- `.gitignore` (MODIFIED) — adds `.env.test`, `.env.test.local` to ignore list, allow-lists `.env.test.example`.
- `backend/app/config.py` (MODIFIED) — `database_url_test` field + post-init in-place override.
- `backend/app/db.py` — INSPECTED, unchanged (verified `git diff` empty).
- `backend/alembic/env.py` — INSPECTED, unchanged (verified `git diff` empty).

## Resolved Test-Mode URL

When `ENVIRONMENT=test` and `DATABASE_URL_TEST=postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test`, `settings.database_url` resolves at module-init time to:

```
postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test
```

Verified by inline Python in Task 2's `<verify>` block:

```
$ ENVIRONMENT=test \
  DATABASE_URL=postgresql+psycopg2://x/y \
  DATABASE_URL_TEST=postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test \
  uv run python -c "from app.config import settings; print(settings.database_url)"
postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test
```

The negative case (`ENVIRONMENT=development`) was also verified: the dev `DATABASE_URL` is preserved, the test override is ignored even when `DATABASE_URL_TEST` is present in the environment.

## Decisions Made

- **Approach (a) from RESEARCH.md Pitfall 6 — single field, in-place overwrite.** The alternative was adding an `effective_database_url` property and changing both `db.py` and `alembic/env.py` to read it. Approach (a) is preferred because it preserves the existing single access-path (`settings.database_url`) every downstream file in the codebase relies on, and it lets `db.py` / `alembic/env.py` pass the `git diff` empty check without any drift risk for future contributors.
- **Pre-existing untracked files left untouched** (`.claude/worktrees/`, `frontend/public/worker-9e66885325cabad7.js`) — they predate this plan's scope. Same for staged-elsewhere modifications to `.planning/STATE.md`, `.planning/config.json`, and `CLAUDE.md` — those are orchestrator territory and I only added the files this plan owns.

## Deviations from Plan

None — plan executed exactly as written. The 6-file scope (2 created, 1 patched gitignore, 1 patched config.py, 2 verify-untouched) was honored. No drive-by edits.

## Issues Encountered

None. The pre-tool-use hook surfaced READ-BEFORE-EDIT reminders for `.gitignore` and `backend/app/config.py` after the edits had already succeeded — both files had been read in the same session's initial batch, so the edits landed cleanly. Confirmed by post-edit Read of `config.py` and the passing acceptance-criteria grep block.

## Threat Model Coverage

| Threat ID | Status | How |
|-----------|--------|-----|
| T-10-02 (`.env.test` secrets in git) | mitigated | `.gitignore` adds explicit deny + allow-list; `git check-ignore` confirms both branches. |
| T-10-05 (LAN-exposed test Postgres) | mitigated | `ports: ["127.0.0.1:5433:5432"]` host-only binding. |
| T-10-06-pre (test runtime hits dev/prod Supabase) | mitigated | `if settings.environment == "test" and settings.database_url_test:` overwrites `database_url` in-place; both db.py and alembic/env.py see the test URL. Verified positive (test mode flips) and negative (dev mode preserves prod URL). |
| T-10-01 (seed targets prod) | downstream — covered in plan 10-03 | This plan delivers the prerequisite (env-flag substrate) only; the seed's hard refusal is plan 10-03's responsibility. |

## Self-Check: PASSED

Verified post-write:
- `docker-compose.test.yml` exists at repo root: FOUND.
- `.env.test.example` exists at repo root: FOUND.
- `.gitignore` contains `.env.test` and `!.env.test.example`: FOUND.
- `backend/app/config.py` contains `database_url_test` field and the post-init guard: FOUND.
- `backend/app/db.py` and `backend/alembic/env.py` `git diff` empty: FOUND (zero diff).
- Commit `7c469a5` exists: FOUND.
- Commit `2f73bbb` exists: FOUND.
- `docker compose -f docker-compose.test.yml config` validates the YAML: PASS.

## Next Plan Readiness

- Plan 10-02 (or whichever next plan creates the Playwright `webServer` orchestration / uvicorn invocation) can pass `ENVIRONMENT=test` + `DATABASE_URL=$DATABASE_URL_TEST` to uvicorn and trust that both runtime queries (db.py) and migrations (alembic/env.py) target the test DB.
- Plan 10-03 (seed CLI) can rely on `settings.database_url` resolving to the test URL when invoked via `ENVIRONMENT=test uv run seed`. The seed's hard-refuse-if-not-test guard (T-10-01) is its own responsibility, layered on top of this substrate.
- The bootstrap runbook step `docker compose -f docker-compose.test.yml up -d` is now an executable command, not a stub.

---
*Phase: 10-e2e-test-infrastructure*
*Plan: 01*
*Completed: 2026-05-08*
