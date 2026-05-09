# Phase 10: E2E test infrastructure — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 10-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-08
**Phase:** 10-e2e-test-infrastructure
**Mode:** `--auto` (Claude auto-selected the recommended default for every gray area)
**Areas discussed:** Auth shortcut · Test DB isolation · Gemini handling · Test execution model
· Realtime coverage · Capture spec depth · Bootstrap shape · Seed idempotency

---

## A. Auth shortcut for Playwright

| Option | Description | Selected |
|--------|-------------|----------|
| Bearer header via `extraHTTPHeaders` | `Authorization: Bearer ${SEED_AUTH_TOKEN}` set globally in `playwright.config.ts`. Aligns with 01.1 D-03 ("Bearer header fallback for local dev / curl"). No Secure-cookie hack needed on localhost. | ✓ |
| Cookie injection via `context.addCookies` | Inject `aldente_auth` cookie. Requires `Secure: false` on localhost — diverges from production attribute lock (HttpOnly + Secure + SameSite=Strict). | |
| `storageState` JSON file | Pre-record an authenticated browser state. Adds a hidden artifact to repo and breaks if the cookie format changes. | |

**User's choice (auto):** Bearer header.
**Notes:** Direct alignment with `.planning/phases/01.1-cookie-auth-and-recovery/01.1-CONTEXT.md` D-03. TEST-04 spec runs WITHOUT the header so the real cookie flow is exercised end-to-end.

---

## B. Test database isolation

| Option | Description | Selected |
|--------|-------------|----------|
| Local Postgres via `docker-compose.test.yml` | Postgres 16 service on `:5433`, dedicated `aldente_test` DB. Hermetic, fast teardown via `docker compose down -v`. | ✓ |
| Separate Supabase free-tier project | Free, but adds remote-network flake to local tests + costs an org slot. | |
| Schema-namespacing on the existing Supabase dev DB | Risks polluting the dev DB if a TRUNCATE escapes scope. Conflicts with no-mocking-DB safety story. | |
| In-memory SQLite | Schema mismatch with Postgres-only features (`UUID`, `JSONB`, enum types). Defeats the no-mock-DB rule. | |

**User's choice (auto):** Local Postgres via Docker Compose.
**Notes:** Dev hits Supabase remote per `.planning/phases/01-foundations-w1/01-CONTEXT.md` ("no Docker Postgres for dev"). Tests get their own isolated lane; one extra `docker compose up` counts as one bootstrap command.

---

## C. External-service handling (Gemini)

| Option | Description | Selected |
|--------|-------------|----------|
| Env-flag-swapped `services/llm.py` stub | When `settings.environment == "test"`, return canned `GeminiExtractedRecipe`. Exercises full draft→structured pipeline deterministically. | ✓ |
| Real Gemini calls | Slow, costs quota, flaky on rate limits. | |
| Skip promotion verification (assert draft only) | Misses the BackgroundTask / `recipe.promoted` path entirely. Weaker regression coverage. | |
| HTTP-level mocking (e.g. `nock`-equivalent) | Adds a mocking library and intercepts at the wrong layer. Easier to drift than a service-boundary stub. | |

**User's choice (auto):** Env-flag-swapped stub at the service boundary.
**Notes:** Database is NEVER mocked (per requirement). Gemini is an external paid API — stubbing it preserves determinism without violating the no-DB-mock rule.

---

## D. Test execution model

| Option | Description | Selected |
|--------|-------------|----------|
| `workers: 1` (serial) + two Playwright projects (`seeded`, `fresh`) | Serial execution against a shared seeded household. TEST-04 isolated in a `fresh` project that truncates first. No write contention. | ✓ |
| Parallel workers + per-test reseed | Adds setup cost on every test; race conditions on shared rows. | |
| Parallel workers + transaction-rollback per test | Requires `BEGIN` / `ROLLBACK` injection that doesn't compose with the FastAPI dep-injection session lifecycle. High risk. | |

**User's choice (auto):** Serial with two projects.
**Notes:** Couple-scale workload, single-machine target. Flake budget cost of parallelism > time saved.

---

## E. Realtime / WebSocket coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Skip WS assertions in v0.2.1 | HTTP-driven user-visible outcomes are sufficient regression coverage for this milestone. Mark realtime side-effects as `test.fixme` with TODO. | ✓ |
| Full WS connection assertions | High flake potential from 200ms broadcast latency + reconnect logic + DOM CustomEvent bridge. | |
| Hybrid (assert one realtime side-effect) | Adds the WS infrastructure cost without the full coverage benefit. | |

**User's choice (auto):** Skip WS assertions; mark `test.fixme` where natural.
**Notes:** Realtime regression coverage is its own follow-up phase (captured in deferred ideas).

---

## F. Capture surface coverage depth

| Option | Description | Selected |
|--------|-------------|----------|
| Cover all 5 surfaces with the LLM stub from C | quick + full + voice + photo + url all run end-to-end (draft + promotion). No `test.fixme` for un-wired surfaces — every surface IS wired backend-side. | ✓ |
| Cover quick + full only; `test.fixme` voice/photo/url | The original REQUIREMENTS.md wording allows this but underestimates wiring (verified in 10-CONTEXT.md). | |
| Cover all 5 with real Gemini | Conflicts with C; adds quota cost + flake. | |

**User's choice (auto):** All 5 surfaces with the LLM stub.
**Notes:** `backend/app/routers/recipes.py` confirms /quick, /full, /voice, /photo, /url are all live POST endpoints. No `test.fixme` markers for un-wired surfaces.

---

## G. Bootstrap runbook shape

| Option | Description | Selected |
|--------|-------------|----------|
| 4-command bootstrap in repo-root TESTING.md | docker compose · uv setup+seed · npm install+playwright install · npm run test:e2e. Playwright `webServer` orchestrates uvicorn + next dev. | ✓ |
| 5-command explicit (each step its own command) | Looser, harder to keep ≤5 if anything is added later. | |
| Single composed `npm run setup-and-test` script | Hides the steps; harder for a fresh contributor to debug a partial failure. | |
| Makefile | Adds a build tool not currently in the repo. | |

**User's choice (auto):** 4-command bootstrap with `webServer` orchestration.
**Notes:** `seed` becomes a console-script entry in `backend/pyproject.toml`; `npm run test:e2e` is added to `frontend/package.json`.

---

## H. Seed idempotency mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Stable `uuid5` IDs + `Session.merge()` upsert | Deterministic across runs; re-run is a no-op. Preserves "re-running mid-test" success criterion. | ✓ |
| `TRUNCATE` + `INSERT` | Breaks in-flight FK references during mid-test re-run. | |
| Random UUIDs + `INSERT ... ON CONFLICT DO NOTHING` | Loses idempotency on subsequent runs (rows accumulate). | |
| Manual `id` collision check (SELECT-then-INSERT) | Race-prone; verbose. | |

**User's choice (auto):** Stable `uuid5` + `Session.merge()`.
**Notes:** uuid5 namespace strategy: `uuid.uuid5(NAMESPACE_DNS, "aldente.test.<entity>.<key>")`. Composite-key tables use the same uuid5 strategy on the PK plus unique-key conflict resolution.

---

## Claude's Discretion

The following implementation details were marked as planner/executor-decision in 10-CONTEXT.md — no user input requested:

- Exact Postgres image tag in `docker-compose.test.yml` (recommend `postgres:16-alpine`).
- Whether `npm run test:e2e` chains `playwright install` automatically (recommend separate).
- Exact directory for the LLM stub fixtures.
- Where to put `globalSetup` for the `fresh` Playwright project.
- Whether to log Playwright HAR / trace on failure.
- Whether to add an `npm run test:e2e:ui` headed-mode script.

## Deferred Ideas

Captured in 10-CONTEXT.md `<deferred>` section. Summary:

- Realtime regression coverage (its own follow-up phase)
- CI integration (GitHub Actions hookup, follow-up phase)
- Visual regression / screenshot testing (out of scope; `/gsd-ui-review` owns this)
- Cross-browser coverage (Firefox / WebKit) — Chromium-only for v0.2.1
- Performance / load testing
- POLISH-01 (i18n sweep on partner-waiting strings) — fold via `/gsd-add-phase` if needed
- POLISH-02 (Copy-to-clipboard button) — fold via `/gsd-add-phase` if needed
