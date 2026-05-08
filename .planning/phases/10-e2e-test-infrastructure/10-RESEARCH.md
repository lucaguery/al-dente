# Phase 10: E2E test infrastructure & synthetic seed — Research

**Researched:** 2026-05-08
**Domain:** Local-only E2E test infra (Playwright + FastAPI orchestration + idempotent Postgres seed)
**Confidence:** HIGH (every implementation decision is verified against current codebase + official Playwright/uv/SQLAlchemy docs; the 12 locked decisions in CONTEXT.md are the spec)

## Summary

Phase 10 is **plumbing, not product code.** CONTEXT.md already locks every architectural decision (D-01..D-12); this research answers "how do I IMPLEMENT these decisions correctly given the actual repo state in 2026-05-08."

Three things flipped between the stale `.planning/codebase/TESTING.md` (2026-05-05) and now:

1. **The backend is real.** FastAPI + SQLAlchemy 2.0 + 5 alembic migrations + every router from CONTEXT.md exists. `backend/app/auth.py` already accepts Bearer fallback (D-03 from 01.1) — D-01's Bearer header path lights up with zero new auth code. `backend/app/services/llm.py` is full Gemini 2.5 Flash with `extract_from_transcript` / `extract_from_photos` / `apply_voice_modification` — D-04's `settings.environment == "test"` guard plugs into a known shape. `backend/app/cli/` does NOT exist yet — seed entry is greenfield.
2. **`@playwright/test ^1.59.1` is already installed.** Zero new npm dep. `frontend/tests/e2e/` is an empty directory waiting for spec files. `frontend/playwright.config.ts` does NOT exist yet.
3. **Chromium-on-localhost accepts `Secure` cookies** (verified — chromestatus.com locked this in years ago). The `aldente_auth` HttpOnly+Secure+SameSite=Strict cookie set by `set_auth_cookie()` works against `http://localhost:3000` without any backend cookie-attribute hack. TEST-04's invite-code spec runs cleanly on plain HTTP.

**Primary recommendation:** Implement the 4-command bootstrap in CONTEXT.md D-08 verbatim. Do not invent alternatives. The `webServer: [...]` array in `playwright.config.ts` is the single orchestration chokepoint — uvicorn (with `ENVIRONMENT=test` + `DATABASE_URL=$DATABASE_URL_TEST`) and `npm run dev` both spawn from there. Two `projects` (`seeded` with extraHTTPHeaders Bearer, `fresh` with no headers + a setup-project dependency that truncates) live in the same config. Hard-constrain the executor to: `frontend/playwright.config.ts`, `frontend/tests/e2e/**`, `backend/app/cli/seed.py`, `backend/app/cli/__init__.py`, `backend/app/services/llm_fixtures.py`, `docker-compose.test.yml`, `TESTING.md`, `.env.test.example`, plus 3 surgical product-code edits (`backend/app/config.py`, `backend/app/db.py`, `backend/app/services/llm.py`) and 1 nav/script edit (`backend/pyproject.toml`, `frontend/package.json`).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01 .. D-12)

**D-01 — Auth shortcut (Bearer header):** Specs that need a logged-in member set `Authorization: Bearer ${PLAYWRIGHT_AUTH_TOKEN}` via `playwright.config.ts` → `use.extraHTTPHeaders`. Backend's `auth.py` already accepts Bearer as a fallback for local-dev / curl per 01.1 D-03. Specs targeting the real cookie flow (TEST-04) run in a second Playwright project with no `extraHTTPHeaders`. `PLAYWRIGHT_AUTH_TOKEN` MUST equal the seed's `SEED_AUTH_TOKEN` (single env var preferred — see D-10).

**D-02 — Test database isolation:** `docker-compose.test.yml` at repo root brings up Postgres 16 on `localhost:5433` with database `aldente_test`. `DATABASE_URL_TEST` defaults to `postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test`. Dev DB on Supabase is NEVER touched by tests. `backend/app/config.py` resolves the active URL by reading `DATABASE_URL_TEST` when `ENVIRONMENT=test`, otherwise `DATABASE_URL` (one-line guard, no refactor of existing settings shape).

**D-03 — Schema provisioning:** Schema is provisioned via the existing alembic migration set (`0001_baseline.py` … `0005_last_cooked_photo_path.py`) — no test-only schema drift. Reset between full runs is `alembic downgrade base && alembic upgrade head` OR docker volume recreated (`docker compose down -v`); seed handles per-run idempotency (D-09).

**D-04 — Gemini handling (env-flag stub):** `backend/app/services/llm.py` gets a guarded fast-path: when `settings.environment == "test"`, the public extraction functions return a deterministic canned `GeminiExtractedRecipe` instantly (no API call). Fixture lives next to the stub (e.g. `services/llm_fixtures.py`) so reviewers see canonical input/output side-by-side. Database is NEVER mocked — only Gemini is.

**D-05 — Test execution model:** Playwright runs serially (`workers: 1`) with two projects: (1) `seeded` — Bearer header, runs against seeded household, covers all surfaces; (2) `fresh` — no auth header, runs ONLY TEST-04, depends on a `globalSetup` step that truncates `households`, `members`, `recipes`, `votes`, `cooking_logs`, `daily_shortlists` BEFORE its specs run, then re-seeds (or skips reseed — planner decides) AFTER its specs run.

**D-06 — Realtime / WS coverage:** WS broadcast outcomes are NOT asserted in v0.2.1 specs. HTTP-driven user-visible outcomes (DOM text, navigation, toast) are sufficient regression coverage. Where a spec would naturally need realtime to observe a side effect, use `test.fixme` with a TODO citing this decision.

**D-07 — Capture surface coverage:** All 5 capture surfaces are covered (no `test.fixme` for un-wired surfaces — every surface IS wired backend-side per `backend/app/routers/recipes.py`). With the LLM stub from D-04 making promotion deterministic: quick / full / voice / photo / url all asserted.

**D-08 — Bootstrap runbook (4 commands in `TESTING.md`):**
1. `docker compose -f docker-compose.test.yml up -d`
2. `cd backend && uv sync && uv run alembic upgrade head && uv run seed`
3. `cd frontend && npm ci && npx playwright install --with-deps chromium`
4. `cd frontend && npm run test:e2e`

**D-09 — Seed idempotency:** `uuid.uuid5(NAMESPACE_DNS, "aldente.test.<entity>.<key>")` for stable IDs. Insertion via `Session.merge()` (or `INSERT ... ON CONFLICT DO UPDATE` for tables where merge is awkward). Re-running `uv run seed` is a no-op for already-present rows; field updates land if seed values change. Composite-key tables (`votes`) use the same uuid5 strategy on the `id` PK plus unique-key conflict resolution. **TRUNCATE + INSERT is explicitly NOT used.**

**D-10 — Env vars:** `SEED_AUTH_TOKEN` (default: `test-token-luca`) — fixed `auth_token` for the seeded member. `playwright.config.ts` reads `process.env.SEED_AUTH_TOKEN` directly (drop the duplicate var name). Single source of truth in `.env.test.example`.

**D-11 — Spec coverage matrix:** 14 specs to ship — see CONTEXT.md D-11 for the verbatim list. Each spec asserts at least one user-visible outcome (DOM text, navigation, toast).

**D-12 — Regression-test canary:** Plan must include manual verification: introduce a small bug into `frontend/components/ShortlistDeck.tsx` OR `backend/app/routers/votes.py`, run the suite, at least one spec fails, revert. Bug is NOT shipped.

### Claude's Discretion (CONTEXT.md)

- Exact Postgres image tag (recommend `postgres:16-alpine`).
- Whether `npm run test:e2e` chains `playwright install` (recommend: separate, keeps bootstrap explicit at 4 commands).
- Whether `docker compose down -v` is `npm run test:e2e:reset` or just documented.
- Exact directory for LLM stub fixtures (e.g. `backend/app/services/llm_fixtures.py` vs inline constants).
- Where to put `globalSetup` for `fresh` project (e.g. `frontend/tests/e2e/globalSetup.fresh.ts`).
- Whether to log Playwright HAR / trace on failure (recommend: yes, locally).
- Whether to add `npm run test:e2e:ui` headed mode (recommend: yes).

### Deferred Ideas (OUT OF SCOPE — DO NOT IMPLEMENT)

- Realtime regression coverage (D-06 deferred to its own phase)
- CI integration (`.github/workflows/*` — NOT in v0.2.1)
- Visual regression / screenshot testing
- Cross-browser coverage (Firefox / WebKit)
- Performance / load testing
- POLISH-01 (i18n sweep on partner-waiting strings)
- POLISH-02 (Copy-to-clipboard on partner-waiting Card invite code)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | Backend Python seed CLI — `uv run seed`, idempotent, 1 household + 1 member with `auth_token` overridable via `SEED_AUTH_TOKEN`, 20+ recipes spanning locked vocabularies, ≥3 cooking_logs (one per rating), votes covering all 5 computed states. MUST import Python Enums directly. | Stack §"Seed CLI implementation"; Don't Hand-Roll §"uuid5 stable IDs + Session.merge() upsert"; Code Examples §"Seed entry shape"; Pitfalls §"Composite-key upsert for votes table" |
| TEST-02 | Committed Playwright suite under `frontend/tests/e2e/` covering every shipped screen + action. 14 specs per CONTEXT D-11. Bearer-header injection via config. Each spec asserts ≥1 user-visible outcome. | Stack §"Playwright config"; Architecture §"Two-project pattern"; Code Examples §"playwright.config.ts skeleton"; Pitfalls §"Next.js cold-start timeout", §"Test-id strategy" |
| TEST-03 | Bootstrap runbook + scripts so fresh checkout reaches green run in ≤ 5 commands. `npm run test:e2e` script. `seed` console-script entry in `backend/pyproject.toml`. `.env.test.example`. | Stack §"`[project.scripts]` for uv"; Architecture §"4-command runbook"; Code Examples §"pyproject.toml entry", §"npm scripts" |
| TEST-04 | Invite-code happy-path spec — `/onboarding/create` → invite code → `/onboarding/join` end-to-end **without** seeded auth shortcut. Validates cookie flow. Runs in `fresh` project against truncated DB. | Stack §"Cookie on localhost"; Pitfalls §"Chromium accepts Secure cookies on localhost (no hack needed)"; Code Examples §"globalSetup truncate + reseed" |
</phase_requirements>

## Project Constraints (from CLAUDE.md + AGENTS.md)

These are enforced repo-wide. Plans MUST honor every one:

- **No manual deploys** (memory: `feedback_no_manual_vercel_deploy`) — push-to-`main` is the only deploy path. Phase 10 must NOT add `vercel --prod` / `railway up` invocations or CI workflows.
- **Executor scope creep is a known failure mode** (memory: `feedback_executor_scope_creep`) — gsd-executor previously modified files outside plan scope. Plans MUST hard-constrain the file set. Tests + seed + scripts ONLY, plus 3 surgical backend edits (config.py, db.py, services/llm.py) and 2 nav edits (pyproject.toml, package.json). NO product-code refactors. If suite surfaces a real bug, surface it (don't fix inline).
- **5 capture surfaces / one shape** (CLAUDE.md invariant #1) — server is the single source of truth for promotion. Specs assert HTTP-driven user-visible outcomes; do NOT promote drafts client-side.
- **Voting state computed, not stored** (CLAUDE.md invariant #2) — seed inserts rows in `votes`; no `state` column to write. Computed via `app.services.voting.compute_vote_state` (server) and `frontend/lib/votes.ts#computeVoteState` (client mirror).
- **Denormalized `last_cooked_at` + `cook_count`** (CLAUDE.md invariant #3) — seed updates these in the same `db.commit()` as `cooking_logs` insert. Match the production transaction shape.
- **Realtime contract** (CLAUDE.md invariant #4) — broadcast on every household-syncing mutation. Seed mutates DB directly (no broadcast needed); specs do not assert WS frames per D-06.
- **Raw inputs preserved** (CLAUDE.md invariant #5) — seed populates `source_capture` JSONB for voice / url recipes with realistic transcripts / URLs.
- **next-intl French only** (CLAUDE.md invariant #6) — Playwright DOM-text assertions match French strings (`Validé` / `Pressenti` / `Contesté` / `Rejeté` / `Sans avis` from `frontend/lib/i18n/fr.json` lines 92-96). No hardcoded English strings creep in via test fixtures.
- **Vocabulary mirror anti-drift** (CLAUDE.md §"Shared Vocabulary") — seed MUST `from app.models.enums import Season, Cuisine, Mood, Protein` and use `.value` to get wire strings. NO duplicated literal lists.
- **Next.js 16 may have breaking changes** (frontend/AGENTS.md) — Phase 10 doesn't touch Next.js APIs except `npm run dev` invocation. Safe.
- **GSD workflow enforcement** (CLAUDE.md §"GSD Workflow Enforcement") — Phase 10 MUST flow through `/gsd-execute-phase`. No direct edits.

## Standard Stack

### Already-installed (zero new deps)
| Library | Version | Purpose | Confirmed |
|---------|---------|---------|-----------|
| `@playwright/test` | `^1.59.1` | Test runner + browser driver | [VERIFIED: `frontend/package.json` line 38; `npm view @playwright/test version` returns 1.59.1] |
| `psycopg2-binary` | `>=2.9.12` | Postgres driver for sync engine | [VERIFIED: `backend/pyproject.toml` line 11 — works on Apple Silicon in 2026] |
| `pydantic-settings` | `>=2` | Env var settings loading (used by `app.config.Settings`) | [VERIFIED: `backend/pyproject.toml` line 13] |
| `sqlalchemy` | `>=2.0` | ORM with `Session.merge()` + `Insert.on_conflict_do_update()` | [VERIFIED: `backend/pyproject.toml` line 15] |
| `alembic` | `>=1.13` | Migration runner — provisions schema for the test DB | [VERIFIED: `backend/pyproject.toml` line 8] |
| `uv` | `0.10.2` | Python package manager + console-script runner | [VERIFIED: `uv --version` on the host] |
| Docker | `27.3.1` + Compose `v2.30.3` | Postgres 16 container | [VERIFIED: `docker --version` on the host] |
| Node.js | `24.3.0` | Frontend runtime + Playwright host | [VERIFIED: `node --version` on the host] |

### New runtime artifacts (configuration / data, not packages)
| Artifact | Where | Purpose |
|----------|-------|---------|
| `docker-compose.test.yml` | repo root | Postgres 16-alpine on `:5433` with database `aldente_test`. Volume named `aldente_test_pg_data` so `docker compose down -v` resets cleanly. |
| `.env.test.example` | repo root | Documents `DATABASE_URL_TEST`, `SEED_AUTH_TOKEN`, `ENVIRONMENT=test`, `NEXT_PUBLIC_API_BASE` (empty for same-origin via Next rewrites, OR `http://localhost:8000` for direct backend in test mode). |
| `TESTING.md` | repo root | 4-command runbook (CONTEXT D-08) at top, rationale below. |
| `frontend/playwright.config.ts` | new | `webServer: [...]` orchestrating uvicorn + Next.js dev. Two `projects`. |
| `frontend/tests/e2e/*.spec.ts` | 14 files | CONTEXT D-11 spec matrix. |
| `frontend/tests/e2e/fixtures/risotto.jpg` | new | Static JPEG for `setInputFiles()` in capture-photo spec. |
| `frontend/tests/e2e/globalSetup.fresh.ts` | new | Truncates 6 tables before TEST-04 runs. |
| `backend/app/cli/__init__.py` | new | Package marker. |
| `backend/app/cli/seed.py` | new | Idempotent seed CLI. `main()` is the entry point. |
| `backend/app/services/llm_fixtures.py` | new | Canned `GeminiExtractedRecipe` returned in test mode. |

### Surgical product-code edits (3 files, narrow scope)
| File | Change | Why |
|------|--------|-----|
| `backend/app/config.py` | Add `database_url_test: str = ""` field. Add `effective_database_url` property OR inline-resolve in `db.py` (planner picks one — both are one-liners). | D-02 needs `ENVIRONMENT=test` to switch URL. |
| `backend/app/db.py` | Replace `settings.database_url` with the resolved URL (1-line change). | D-02. |
| `backend/app/services/llm.py` | Add `if settings.environment == "test": return _CANNED_RESPONSE` guard at top of `extract_from_transcript`, `extract_from_photos`, `apply_voice_modification`. Import the canned response from `app.services.llm_fixtures`. | D-04. |

### Tooling adjustments (2 files, navigation only)
| File | Change | Why |
|------|--------|-----|
| `backend/pyproject.toml` | Add `[project.scripts]` table with `seed = "app.cli.seed:main"`. | TEST-03 / D-08. |
| `frontend/package.json` | Add `"test:e2e": "playwright test"` script. Optional: `"test:e2e:ui": "playwright test --ui"`, `"test:e2e:reset": "docker compose -f ../docker-compose.test.yml down -v"`. | TEST-03 / D-08. |

### Alternatives Considered (rejected — DO NOT use)
| Instead of | Could Use | Why rejected |
|------------|-----------|--------------|
| `Session.merge()` for upserts | `INSERT ... ON CONFLICT DO UPDATE` everywhere | Verbose for simple PK tables; merge is idiomatic SQLAlchemy 2.0. Use ON CONFLICT only for the votes composite-uniqueness path. |
| Docker Postgres on `:5433` | Sqlite in-memory | Schema uses Postgres-specific types (UUID, JSONB, ARRAY, ENUM, `gen_random_uuid()`). Sqlite cannot run our migrations. |
| Mocking the database | Use real Postgres | CONTEXT explicit: "Database is NEVER mocked — only Gemini is." |
| Real Gemini calls in tests | Env-flag stub | Cost + flake. CONTEXT D-04 lock. |
| Per-test truncate | Per-run idempotency via uuid5 | CONTEXT D-09 lock — re-running mid-test must succeed. |
| `globalSetup` config option | Project-with-dependency pattern | Playwright recommends project dependencies over `globalSetup` since they integrate with HTML report + traces + fixtures. CONTEXT D-05 mentions `globalSetup` loosely; planner should implement as a dependency project. |

**Version verification:**
- `@playwright/test`: `1.59.1` confirmed via `npm view @playwright/test version` (2026-05-08).
- `uv`: `0.10.2` confirmed via `uv --version` (2026-05-08).
- Postgres image: `postgres:16-alpine` is the recommended pin (Postgres 16 is the LTS line through 2028; alpine ≈ 240 MB).

## Architecture Patterns

### Two-process orchestration via `webServer: [...]` array

Playwright 1.59 supports an array of `webServer` entries, each spawned in parallel before tests start. Each waits for its `url` health check before specs proceed. This is the canonical pattern for FastAPI + Next.js dual-server tests.

**Pattern:**
```typescript
// frontend/playwright.config.ts (skeleton — see Code Examples for full file)
webServer: [
  {
    // Backend: uvicorn with ENVIRONMENT=test so config.py picks DATABASE_URL_TEST,
    // and so services/llm.py returns canned data instead of calling Gemini.
    command: 'cd ../backend && uv run uvicorn app.main:app --port 8000',
    url: 'http://localhost:8000/healthz',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ENVIRONMENT: 'test',
      DATABASE_URL: process.env.DATABASE_URL_TEST!,
      // GEMINI_API_KEY intentionally unset — the test guard short-circuits before
      // the lazy client ever instantiates.
    },
    name: 'backend',
  },
  {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    timeout: 180_000,  // Next.js 16 cold-start can exceed 60s on first compile.
    reuseExistingServer: !process.env.CI,
    name: 'frontend',
  },
],
```

[CITED: https://playwright.dev/docs/test-webserver — "Multiple Web Servers" section]

### Two-project pattern (`seeded` + `fresh`)

Per CONTEXT D-05, the suite has two execution modes that share a single config. Playwright's project system handles this cleanly. `fresh` depends on a `setup` project that handles truncation before `fresh` specs run; teardown re-seeds.

**Pattern:**
```typescript
projects: [
  {
    name: 'fresh-setup',
    testMatch: /globalSetup\.fresh\.ts/,
    teardown: 'fresh-teardown',
  },
  {
    name: 'fresh-teardown',
    testMatch: /globalTeardown\.fresh\.ts/,
  },
  {
    name: 'seeded',
    testMatch: /.*\.spec\.ts/,
    testIgnore: /invite-code-happy-path\.spec\.ts/,
    use: {
      baseURL: 'http://localhost:3000',
      extraHTTPHeaders: {
        // D-01: Bearer fallback path. Backend's auth.py accepts this verbatim.
        Authorization: `Bearer ${process.env.SEED_AUTH_TOKEN ?? 'test-token-luca'}`,
      },
      trace: 'retain-on-failure',
    },
  },
  {
    name: 'fresh',
    testMatch: /invite-code-happy-path\.spec\.ts/,
    dependencies: ['fresh-setup'],
    use: {
      baseURL: 'http://localhost:3000',
      // No extraHTTPHeaders — TEST-04 exercises the real onboarding cookie flow.
      trace: 'retain-on-failure',
    },
  },
],
```

[CITED: https://playwright.dev/docs/test-global-setup-teardown — "Project dependencies are the recommended approach"]
[CITED: https://playwright.dev/docs/test-projects — `dependencies` + `teardown` semantics]

**Why a setup project, not `globalSetup`:** Playwright's docs explicitly recommend project dependencies over the older `globalSetup` config option because dependent setup tests show in the HTML report, support traces, and can use fixtures. CONTEXT D-05 says "globalSetup" loosely; implement as a dependency project for the cleaner DX.

### `extraHTTPHeaders` applies to ALL requests including `page.goto`

[VERIFIED: https://playwright.dev/docs/api/class-testoptions — "An object containing additional HTTP headers to be sent with every request. Defaults to none."]

This means the `Authorization: Bearer ...` header from D-01 is attached to every navigation in the `seeded` project, satisfying `current_member()` on every page that calls a backend endpoint. The `fresh` project has no header, so navigation to `/` redirects to `/onboarding/welcome` via the existing `SessionProvider` 401 → redirect flow.

### Recommended file tree

```
.                                       # repo root
├── docker-compose.test.yml             # NEW
├── .env.test.example                   # NEW
├── TESTING.md                          # NEW
├── backend/
│   ├── pyproject.toml                  # EDIT: add [project.scripts] seed entry
│   ├── app/
│   │   ├── config.py                   # EDIT: + database_url_test field
│   │   ├── db.py                       # EDIT: 1-line URL switch
│   │   ├── cli/                        # NEW package
│   │   │   ├── __init__.py
│   │   │   └── seed.py                 # NEW: main() = idempotent seed
│   │   └── services/
│   │       ├── llm.py                  # EDIT: + env-flag guard at 3 funcs
│   │       └── llm_fixtures.py         # NEW: canned GeminiExtractedRecipe
│   └── alembic/                        # UNCHANGED — existing 5 migrations run as-is
└── frontend/
    ├── package.json                    # EDIT: + test:e2e scripts
    ├── playwright.config.ts            # NEW
    └── tests/
        └── e2e/                        # already empty
            ├── auth.skip-onboarding.spec.ts
            ├── capture-quick.spec.ts
            ├── capture-full.spec.ts
            ├── capture-voice.spec.ts
            ├── capture-photo.spec.ts
            ├── capture-url.spec.ts
            ├── drafts-inbox.spec.ts
            ├── shortlist-vote.spec.ts
            ├── recipe-detail.spec.ts
            ├── cooking-log-create-finalize.spec.ts
            ├── cooking-log-history.spec.ts
            ├── recipe-library.spec.ts
            ├── settings.spec.ts
            ├── invite-code-happy-path.spec.ts
            ├── globalSetup.fresh.ts
            ├── globalTeardown.fresh.ts
            └── fixtures/
                └── risotto.jpg          # NEW: small static JPEG
```

### Anti-Patterns to Avoid

- **DO NOT mock the database.** CONTEXT explicit. Real Postgres via Docker is the lock. The point is to catch ORM-level + migration-level regressions.
- **DO NOT TRUNCATE + INSERT in seed.** CONTEXT D-09 explicit: "TRUNCATE + INSERT is explicitly NOT used — it would break the 're-running mid-test' success criterion." Use `Session.merge()` / `ON CONFLICT DO UPDATE`.
- **DO NOT add a `state` column to `votes`** (CLAUDE.md invariant #2). Vote state is computed.
- **DO NOT broadcast WS frames from the seed.** Seed mutates DB directly without going through the API; specs do not assert WS per D-06.
- **DO NOT add Web Speech API mocking.** Voice spec posts a transcript directly to `POST /recipes/voice` (a JSON body, not browser audio). Per CAPTURE-04 in v0.2 (and `recipes.py` `voice_capture` docstring), the production frontend uses iOS keyboard dictation into a `<textarea>` — Web Speech API is NOT invoked.
- **DO NOT touch product UI to add `data-testid`.** Use existing `aria-label` strings (verified present on critical interactions: `ShortlistCard.tsx#244` `vote_no_aria` and `#255` `vote_yes_aria`; `BottomNav.tsx#85` `Navigation principale`; `RatingPicker.tsx#64` `aria-pressed`) plus French DOM text. If a single missing label blocks a spec, that's a real product-code accessibility gap — surface it (do not fix inline; per `feedback_executor_scope_creep`).
- **DO NOT enable Playwright `ignoreHTTPSErrors`.** All test traffic is plain HTTP `http://localhost:3000` and `http://localhost:8000`. The flag has no effect and adds noise.
- **DO NOT spawn the backend with `--reload`.** Default uvicorn is fine. Reload watcher races with Playwright's port-readiness check.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Idempotent insert with stable IDs | UUID4 + "check-then-insert" | `uuid.uuid5(NAMESPACE_DNS, key)` + `Session.merge()` | uuid4 makes seed non-deterministic across runs; merge is the SQLAlchemy 2.0 idiom for upsert with PK already known. |
| Composite-key upsert (`votes`) | `merge()` with synthetic PK | `pg_insert(Vote).on_conflict_do_update(index_elements=['shortlist_id','recipe_id','member_id'])` | Same pattern already used by `backend/app/routers/votes.py#35-67` — copy verbatim. The unique constraint is migration `0004_phase3_tables.py`. |
| Two servers ready before tests | Bash spawn + `wait-on` | Playwright `webServer: [...]` array | Native to Playwright; handles graceful shutdown + log prefixing + reuse-existing-server. |
| Truncate-before-test-run | Custom Python TRUNCATE script invoked from npm | A Playwright setup project (`globalSetup.fresh.ts`) using `pg` Node.js client OR a tiny `uv run python -c "..."` invocation | Setup projects integrate with the HTML report; truncation is one TRUNCATE statement against 6 tables. |
| Custom test DB driver | new SQLAlchemy engine config in test | `ENVIRONMENT=test` + same `db.py` engine factory | Reuses `pool_pre_ping=True` and the existing import-time engine creation. |
| Mocking Gemini at HTTP level | `responses` / `pytest-vcr` | One-line `if settings.environment == "test": return _CANNED` | Stub lives at the function boundary that tests already use — zero indirection. |
| Custom file fixture path resolution | `__dirname`-style juggling | Playwright resolves relative paths against the spec file. `await page.locator(...).setInputFiles('fixtures/risotto.jpg')` works directly. | Playwright's docs guarantee this. |
| Force French locale in tests | `localeName` config | Already locked: `next-intl` is French-only; no locale negotiation. | App is French-only in v0.1. |

**Key insight:** Every "build it yourself" temptation here is solved by code that already exists in the repo (auth fallback, vote upsert pattern) or by Playwright/SQLAlchemy idioms. The seed and the config are the only NEW abstractions; both are tightly bounded.

## Common Pitfalls

### Pitfall 1: Next.js 16 cold-start exceeds default `webServer` timeout
**What goes wrong:** Default `webServer.timeout` is 60s. Next.js 16 first compile on a clean checkout can be 90-180s (App Router + RSC + tailwind v4 first build).
**Why it happens:** `npm run dev` triggers compilation lazily on first request; Playwright probes `http://localhost:3000` immediately and times out before the Next bundler finishes.
**How to avoid:** Set `timeout: 180_000` for the frontend webServer entry. Set `timeout: 120_000` for the backend (uvicorn boots in <5s but `alembic upgrade head` may have run before — give headroom).
**Warning signs:** "Timed out waiting 60000ms for the http://localhost:3000" in CI/local first run.

### Pitfall 2: `ENVIRONMENT=test` env not propagated to BackgroundTasks
**What goes wrong:** `services/llm.py` `promote_voice_draft` reads `settings.environment`. `Settings()` is module-level — instantiated once at import. The first import of `app.config` locks `ENVIRONMENT`. If uvicorn is spawned without `ENVIRONMENT=test` env, the BackgroundTask still hits real Gemini.
**Why it happens:** `Settings()` is singleton. Forgot to pass `env={ENVIRONMENT: 'test', ...}` in `playwright.config.ts` `webServer.env`.
**How to avoid:** Verify `webServer.env.ENVIRONMENT === 'test'`. Defensive: in seed CLI, refuse to run if `settings.environment != "test"` AND DATABASE_URL doesn't contain `aldente_test` (see Threat Model T-10-01).
**Warning signs:** Tests intermittently fail with "GEMINI_API_KEY not set" or hit Gemini quota.

### Pitfall 3: APScheduler shortlist job fires during test runs
**What goes wrong:** `backend/app/main.py` lifespan starts an `AsyncIOScheduler` with a per-household `CronTrigger(hour=16, minute=0)`. If a Playwright run straddles 16:00 household-tz, the scheduled job fires mid-test, mutates the daily_shortlists table, and breaks the deterministic seed.
**Why it happens:** Lifespan unconditional. Was scoped for prod.
**How to avoid:** Two options — (a) wrap `scheduler.start()` in `if settings.environment != "test":` (1-line product-code edit, scope-creep risk); (b) accept the risk because the seed only inserts ONE shortlist for the seeded household at a fixed past date — APScheduler firing creates a new generation row that doesn't conflict. **Recommend (b)** for v0.2.1 to keep the patch minimal; document in TESTING.md as a known timing edge case.
**Warning signs:** A spec passes 99% of the time but fails near 16:00 Europe/Paris.

### Pitfall 4: Cookie `Secure` attribute on http://localhost (TEST-04)
**What goes wrong:** Backend's `set_auth_cookie()` always sets `secure=True`. On HTTP (non-localhost), Chromium drops the cookie. Concern: does the same happen on `http://localhost`?
**Resolution:** **No — Chromium accepts Secure cookies on http://localhost.** [VERIFIED: https://chromestatus.com/feature/6269417340010496 — "Treat http://localhost as a secure context" + secondary confirmation https://medium.com/swlh/how-the-new-chrome-80-cookie-rule-samesite-none-secure-affects-web-development-c06380220ced]. WebKit historically had inconsistencies but we're Chromium-only per non-goals. **No backend cookie-attribute hack needed for TEST-04.**
**Warning signs:** TEST-04 fails to reach a logged-in state — the cookie was set in the response but not echoed back. (If this happens, check Playwright's `context.cookies()` output; if Set-Cookie arrived but cookie isn't in storage, escalate — but in 2026 with Chromium 130+ this should NOT happen on localhost.)

### Pitfall 5: `Session.merge()` doesn't persist defaults set at column-level
**What goes wrong:** `Recipe.status` has `server_default=text("'draft'::recipe_status")`. If seed creates a Recipe via `merge(Recipe(id=..., title=..., source_capture=...))` without setting `status`, merge issues an UPDATE that sets `status = NULL`, violating NOT NULL.
**Why it happens:** `merge()` copies the in-memory state onto the located row. In-memory state has `status=None` because Python doesn't read server_default. UPDATE clobbers the existing value.
**How to avoid:** Always set every NOT NULL column explicitly in the seed. The seed isn't relying on `server_default` since it owns the values. Explicit > implicit here.
**Warning signs:** `IntegrityError: null value in column "status" violates not-null constraint` on the second run.

### Pitfall 6: Alembic env.py reads the OLD setting name
**What goes wrong:** `backend/alembic/env.py` line 26: `config.set_main_option("sqlalchemy.url", settings.database_url)`. After D-02's edit, when `ENVIRONMENT=test` is set, `settings.database_url` should resolve to the test URL. If the resolution lives in a property `effective_database_url` but env.py still reads `.database_url`, alembic provisions the WRONG database.
**Why it happens:** Two fields, two access paths.
**How to avoid:** Two viable shapes — (a) Keep `settings.database_url: str` and overwrite it post-init in `config.py` when `environment == "test"` (cleanest — env.py and db.py both read `.database_url` and Just Work); (b) Add `effective_database_url` property and update both env.py and db.py to use it. **Recommend (a)** — single field, single access path, D-02's "one-line guard" satisfied.
**Warning signs:** `psycopg2.OperationalError: connection to server at "<supabase host>"` during `uv run alembic upgrade head` in test mode (it tried to migrate prod).

### Pitfall 7: `setInputFiles()` path resolution
**What goes wrong:** Test uses `await fileInput.setInputFiles('risotto.jpg')`. Playwright searches relative to the test working directory (where playwright.config.ts lives), NOT the spec file. Fixture not found.
**How to avoid:** Use `path.join(__dirname, 'fixtures', 'risotto.jpg')` OR `path.resolve('tests/e2e/fixtures/risotto.jpg')`. Most robust: import `path` and `fileURLToPath`, resolve from `import.meta.url`.
**Warning signs:** `ENOENT: no such file or directory, open '...risotto.jpg'`.

### Pitfall 8: Photo capture spec hits Supabase Storage
**What goes wrong:** `POST /recipes/photo` calls `upload_recipe_photo()` which calls `_supabase()` which raises `RuntimeError` if `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` aren't set. In test mode without those env vars, the photo upload fails BEFORE the Gemini stub gets a chance to short-circuit.
**Why it happens:** `services/storage.py#69` requires Supabase config; the Gemini guard from D-04 only short-circuits the LLM call, not the storage upload that precedes it.
**How to avoid:** Add a parallel env-flag guard to `services/storage.py#upload_recipe_photo`: when `settings.environment == "test"`, skip Supabase upload and return a deterministic fake path (e.g. `f"test/{household_id}/{recipe_id}/{uuid4()}.jpg"`). **This is a 4th surgical product-code edit.** Planner should weigh this carefully — it's narrowly scoped, but it's still product-code. Alternative: set fake Supabase env vars in `webServer.env` so client construction succeeds, but the actual upload network call fails. The first option is cleaner.
**Warning signs:** capture-photo spec hangs or fails with "Supabase URL / service-role key not configured".

### Pitfall 9: Composite-key upsert on `votes`
**What goes wrong:** Seed wants to insert votes covering all 5 vote states. `votes` has unique `(shortlist_id, recipe_id, member_id)` per migration 0004. `Session.merge(Vote(id=uuid5(...), ...))` works on PK collision but if seed regenerates the uuid5 from a key that includes `(shortlist, recipe, member)`, AND the row exists with a different PK (e.g. created via the API mid-test), merge inserts a duplicate.
**How to avoid:** Use the same `pg_insert(...).on_conflict_do_update(index_elements=['shortlist_id','recipe_id','member_id'], set_={...})` pattern verified in `backend/app/routers/votes.py#55-67`. Copy verbatim.
**Warning signs:** `IntegrityError: duplicate key value violates unique constraint "uq_votes_..."` on second seed run.

### Pitfall 10: Web Speech API + framer-motion noise
**What goes wrong:** Web Speech API isn't supported in headless Chromium; framer-motion may log animation warnings. These create console noise that's tempting to fail tests on.
**How to avoid:** Do NOT add `page.on('console', ...)` failure listeners. Production code already routes around Web Speech API per CAPTURE-04 (transcript posted as plain text). Animation warnings are non-fatal. Accept noisy logs.
**Warning signs:** Spec fails on `expect(consoleErrors).toEqual([])`-style assertions. Don't write such assertions.

## Code Examples

### `backend/pyproject.toml` — `[project.scripts]` entry

```toml
# Existing [project] block stays unchanged.
[project]
name = "backend"
version = "0.1.0"
# ... (existing fields)
dependencies = [
    "alembic>=1.13",
    # ... (existing deps unchanged)
]

# NEW — registers `seed` as a uv-runnable console script.
# Source: https://docs.astral.sh/uv/concepts/projects/config/#command-line-interfaces
[project.scripts]
seed = "app.cli.seed:main"
```

After `uv sync`, the command `uv run seed` resolves to `app.cli.seed.main()`. [VERIFIED: uv 0.10.2 docs §"Command-line interfaces"]

### `backend/app/config.py` — D-02 one-line URL switch

```python
"""Application settings loaded from environment.

Per .planning/phases/01-foundations-w1/01-CONTEXT.md "Claude's Discretion":
- CORS = explicit allowlist (no wildcard)
- Local dev hits Supabase directly (no Docker Postgres)
- Service-role key lives only in backend env (D-02)

Phase 10 (D-02): when ENVIRONMENT=test, prefer DATABASE_URL_TEST so test runs
never touch the dev/prod Supabase database.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    database_url_test: str = ""  # NEW — D-02
    cors_allowed_origins: str = "http://localhost:3000"
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    environment: str = "development"
    gemini_api_key: str = ""
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_email: str = ""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]


settings = Settings()  # type: ignore[call-arg]

# D-02 — switch URL in-place when in test mode. db.py and alembic/env.py both
# read settings.database_url, so this single overwrite covers both paths
# (Pitfall 6 mitigation).
if settings.environment == "test" and settings.database_url_test:
    settings.database_url = settings.database_url_test
```

### `backend/app/services/llm.py` — D-04 env-flag guard

Add at the top of the three public extraction functions (lines 192, 214, 246 in current llm.py):

```python
def extract_from_transcript(transcript: str) -> GeminiExtractedRecipe:
    # D-04 — deterministic test mode: skip Gemini, return canned data.
    if settings.environment == "test":
        from app.services.llm_fixtures import canned_voice_recipe
        return canned_voice_recipe(transcript)
    # ... existing impl unchanged ...
```

```python
def extract_from_photos(photo_bytes_list: list[bytes]) -> GeminiExtractedRecipe:
    if settings.environment == "test":
        from app.services.llm_fixtures import canned_photo_recipe
        return canned_photo_recipe(len(photo_bytes_list))
    # ... existing impl unchanged ...
```

```python
def apply_voice_modification(recipe_json: dict[str, Any], transcript: str) -> GeminiExtractedRecipe:
    if settings.environment == "test":
        from app.services.llm_fixtures import canned_modified_recipe
        return canned_modified_recipe(recipe_json, transcript)
    # ... existing impl unchanged ...
```

### `backend/app/services/llm_fixtures.py` — canned responses

```python
"""Phase 10 D-04 — canned GeminiExtractedRecipe values for test mode.

These shapes match what real Gemini returns for a French dictation; they're
the same vocabulary literals the production code uses (mirror of enums).

Architecture invariant #5 (raw inputs preserved) means callers still record
the transcript / photo paths in source_capture; only the LLM extraction
result is canned.
"""

from typing import Any

from app.services.llm import (
    GeminiExtractedRecipe,
    GeminiIngredient,
)


def canned_voice_recipe(transcript: str) -> GeminiExtractedRecipe:
    """Deterministic 'risotto' shape; ignores transcript content.

    The transcript is preserved in source_capture by the caller; we don't
    need to vary the output by transcript for v0.2.1 specs.
    """
    return GeminiExtractedRecipe(
        title="Risotto aux champignons (test)",
        ingredients=[
            GeminiIngredient(name="riz arborio", quantity=300.0, unit="g"),
            GeminiIngredient(name="champignons", quantity=400.0, unit="g"),
            GeminiIngredient(name="bouillon de légumes", quantity=1.0, unit="L"),
            GeminiIngredient(name="parmesan", quantity=50.0, unit="g"),
        ],
        steps=[
            "Faire revenir l'oignon dans le beurre.",
            "Ajouter le riz et nacrer.",
            "Mouiller au bouillon louche par louche.",
            "Incorporer les champignons et le parmesan.",
        ],
        prep_time_minutes=35,
        servings=2,
        cuisine="italian",
        mood=["comfort"],
        main_protein="none",
        seasonality=["autumn", "winter"],
    )


def canned_photo_recipe(photo_count: int) -> GeminiExtractedRecipe:
    """Deterministic 'tarte tatin' shape for photo capture spec."""
    return GeminiExtractedRecipe(
        title="Tarte Tatin (test)",
        ingredients=[
            GeminiIngredient(name="pommes", quantity=6.0, unit=None),
            GeminiIngredient(name="sucre", quantity=150.0, unit="g"),
            GeminiIngredient(name="beurre", quantity=80.0, unit="g"),
            GeminiIngredient(name="pâte feuilletée", quantity=1.0, unit=None),
        ],
        steps=[
            "Caraméliser le sucre avec le beurre.",
            "Disposer les pommes.",
            "Couvrir de pâte feuilletée.",
            "Cuire 30 minutes à 200°C.",
        ],
        prep_time_minutes=60,
        servings=6,
        cuisine="french",
        mood=["celebratory", "comfort"],
        main_protein="none",
        seasonality=["autumn"],
    )


def canned_modified_recipe(
    recipe_json: dict[str, Any], transcript: str
) -> GeminiExtractedRecipe:
    """Echo the input recipe but mark prep_time_minutes as +10 to simulate a modification."""
    return GeminiExtractedRecipe(
        title=recipe_json.get("title", "Recette modifiée (test)"),
        ingredients=[
            GeminiIngredient(**i) for i in (recipe_json.get("ingredients") or [])
        ] or None,
        steps=recipe_json.get("steps"),
        prep_time_minutes=(recipe_json.get("prep_time_minutes") or 30) + 10,
        servings=recipe_json.get("servings"),
        cuisine=recipe_json.get("cuisine"),
        mood=recipe_json.get("mood") or [],
        main_protein=recipe_json.get("main_protein"),
        seasonality=recipe_json.get("seasonality") or [],
    )
```

### `backend/app/cli/seed.py` — idempotent seed (skeleton)

```python
"""Phase 10 TEST-01 — idempotent backend seed CLI.

`uv run seed` populates the test database with:
- 1 household with a fixed invite_code
- 1 member with a fixed auth_token (env-overridable via SEED_AUTH_TOKEN)
- 20+ recipes spanning Season × Cuisine × Mood × Protein
- ≥3 cooking_logs covering 'loved' / 'liked' / 'disliked' (architecture invariant #3:
  same-tx update of recipes.last_cooked_at + cook_count)
- 1 daily_shortlist
- votes covering all 5 computed states (Validé / Pressenti / Contesté / Rejeté / Sans avis)

Idempotency strategy (D-09):
- Stable UUIDs via uuid.uuid5(NAMESPACE_DNS, "aldente.test.<entity>.<key>")
- Session.merge() for single-PK tables
- pg_insert(...).on_conflict_do_update(...) for votes (composite uniqueness)

Threat model (T-10-01):
- Hard-refuses to run if settings.environment != "test"
- Hard-refuses to run if 'aldente_test' not in settings.database_url

Anti-drift (TEST-01 explicit): imports Enum classes directly from
app.models.enums — no duplicated literal values.
"""
from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import settings
from app.db import SessionLocal
from app.models.cooking_log import CookingLog, LogRating
from app.models.daily_shortlist import DailyShortlist
from app.models.enums import Cuisine, Mood, Protein, Season  # NO duplicates!
from app.models.household import Household
from app.models.member import Member
from app.models.recipe import Recipe
from app.models.vote import Vote, VoteValue

NAMESPACE = uuid.NAMESPACE_DNS


def _id(*parts: str) -> uuid.UUID:
    """Stable id from a dotted key. Same input → same UUID across runs/machines."""
    return uuid.uuid5(NAMESPACE, "aldente.test." + ".".join(parts))


def _guard_environment() -> None:
    """Refuse to run unless we're certain we're targeting the test DB."""
    if settings.environment != "test":
        sys.exit(
            f"REFUSING to seed: ENVIRONMENT={settings.environment!r}, expected 'test'."
        )
    if "aldente_test" not in settings.database_url:
        sys.exit(
            f"REFUSING to seed: database_url does not contain 'aldente_test'. "
            f"Got: {settings.database_url!r}"
        )


def main() -> None:
    _guard_environment()
    auth_token = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")

    with SessionLocal() as db:
        # 1. Household
        household = db.merge(Household(
            id=_id("household", "luca"),
            name="Foyer Test",
            invite_code="TEST01",
            timezone="Europe/Paris",
        ))

        # 2. Member (creator)
        member_luca = db.merge(Member(
            id=_id("member", "luca"),
            household_id=household.id,
            name="Luca",
            color_hex="#F43F5E",
            auth_token=auth_token,
        ))

        # Optional second member for partner-vote scenarios.
        member_partner = db.merge(Member(
            id=_id("member", "partner"),
            household_id=household.id,
            name="Partner",
            color_hex="#10B981",
            auth_token="test-token-partner",
        ))

        # 3. 20+ recipes spanning the locked vocabularies (use Cuisine.italian.value, etc).
        # ... (planner builds the explicit list in the plan)

        # 4. cooking_logs — one per rating, with same-tx update of recipes.last_cooked_at + cook_count.
        # ... (per architecture invariant #3)

        # 5. daily_shortlist row covering today.
        # ... use _id("shortlist", today_iso) for stable id

        # 6. votes covering all 5 computed states. For composite-key upsert:
        # for (recipe_id, member_id, vote) in vote_specs:
        #     stmt = pg_insert(Vote).values(
        #         id=_id("vote", str(recipe_id), str(member_id)),
        #         shortlist_id=shortlist.id, recipe_id=recipe_id,
        #         member_id=member_id, vote=vote,
        #     ).on_conflict_do_update(
        #         index_elements=["shortlist_id", "recipe_id", "member_id"],
        #         set_={"vote": vote},
        #     )
        #     db.execute(stmt)

        db.commit()
        print(f"seed: ok household={household.id} member={member_luca.id}")


if __name__ == "__main__":
    main()
```

### `frontend/playwright.config.ts` — full skeleton

```typescript
// Phase 10 TEST-02 / TEST-03 / TEST-04 — orchestrates uvicorn (test mode)
// + Next.js dev + the two-project Playwright suite.
// Source: https://playwright.dev/docs/test-webserver (multiple servers)
//         https://playwright.dev/docs/test-projects (project dependencies)
import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SEED_AUTH_TOKEN = process.env.SEED_AUTH_TOKEN ?? 'test-token-luca';
const DATABASE_URL_TEST =
  process.env.DATABASE_URL_TEST ??
  'postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test';

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,                   // D-05: serial, single-machine target
  fullyParallel: false,
  forbidOnly: !!process.env.CI, // local-only milestone, but harmless
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // TEST-04 setup project: truncates the 6 tables BEFORE the fresh spec runs.
    {
      name: 'fresh-setup',
      testMatch: /globalSetup\.fresh\.ts$/,
      teardown: 'fresh-teardown',
    },
    {
      name: 'fresh-teardown',
      testMatch: /globalTeardown\.fresh\.ts$/,
    },

    // Bulk: every spec EXCEPT the invite-code happy-path runs with Bearer auth.
    {
      name: 'seeded',
      testMatch: /.*\.spec\.ts$/,
      testIgnore: /invite-code-happy-path\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: {
          Authorization: `Bearer ${SEED_AUTH_TOKEN}`,
        },
      },
    },

    // TEST-04: the only spec that exercises the real cookie flow.
    {
      name: 'fresh',
      testMatch: /invite-code-happy-path\.spec\.ts$/,
      dependencies: ['fresh-setup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      // Backend in test mode:
      // - ENVIRONMENT=test makes config.py switch to DATABASE_URL_TEST
      //   AND makes services/llm.py return canned responses (D-04).
      command: 'cd ../backend && uv run uvicorn app.main:app --port 8000 --no-access-log',
      url: 'http://localhost:8000/healthz',
      timeout: 120_000,                      // Pitfall 1
      reuseExistingServer: !process.env.CI,
      env: {
        ENVIRONMENT: 'test',
        DATABASE_URL: DATABASE_URL_TEST,     // db.py + alembic/env.py both read settings.database_url
        DATABASE_URL_TEST,
        // Intentionally no GEMINI_API_KEY — the env-flag guard short-circuits before lazy client init.
        // Intentionally no SUPABASE_* — see Pitfall 8 (planner decides storage stub strategy).
      },
      stdout: 'pipe',
      stderr: 'pipe',
      name: 'backend',
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      timeout: 180_000,                      // Pitfall 1: Next.js 16 cold-start
      reuseExistingServer: !process.env.CI,
      env: {
        // 01.1 D-04: api.ts uses '' in prod (same-origin via Vercel rewrite); in test
        // we point at the test backend directly. Confirm with frontend/lib/api.ts.
        NEXT_PUBLIC_API_BASE: 'http://localhost:8000',
      },
      stdout: 'pipe',
      stderr: 'pipe',
      name: 'frontend',
    },
  ],
});
```

### `frontend/tests/e2e/globalSetup.fresh.ts` — truncate via psql or pg client

Two implementations exist; both are valid. The simpler is to call backend Python via spawn:

```typescript
import { test as setup } from '@playwright/test';
import { execSync } from 'child_process';

setup('truncate test DB for invite-code spec', async () => {
  // 6 tables per CONTEXT D-05. CASCADE handles FKs.
  execSync(
    `cd ../backend && uv run python -c "
from sqlalchemy import text
from app.db import SessionLocal
with SessionLocal() as db:
    db.execute(text('TRUNCATE households, members, recipes, votes, cooking_logs, daily_shortlists CASCADE'))
    db.commit()
"`,
    { stdio: 'inherit' },
  );
});
```

`globalTeardown.fresh.ts`: re-invokes `uv run seed` so the next `seeded` run has data again. (Or skip — CONTEXT D-05 says "planner decides".)

### `frontend/package.json` — script additions

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "eslint",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:reset": "docker compose -f ../docker-compose.test.yml down -v"
  }
}
```

### `docker-compose.test.yml` — Postgres 16-alpine on :5433

```yaml
# Phase 10 D-02 — test-only Postgres, isolated from dev/prod Supabase.
# Volume name and port (5433, NOT 5432) explicitly NOT colliding with any
# dev Postgres a developer might have running locally.
services:
  postgres-test:
    image: postgres:16-alpine
    container_name: aldente-postgres-test
    ports:
      - "5433:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: aldente_test
    volumes:
      - aldente_test_pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d aldente_test"]
      interval: 2s
      timeout: 3s
      retries: 20

volumes:
  aldente_test_pg_data:
```

### `.env.test.example` — single source of truth

```bash
# Phase 10 D-02 / D-10 — copy to .env.test (NEVER commit .env.test).
# These variables are consumed by:
#   - playwright.config.ts (DATABASE_URL_TEST, SEED_AUTH_TOKEN)
#   - uvicorn webServer entry (ENVIRONMENT, DATABASE_URL via webServer.env)
#   - backend/app/cli/seed.py (SEED_AUTH_TOKEN)
ENVIRONMENT=test
DATABASE_URL_TEST=postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test
SEED_AUTH_TOKEN=test-token-luca
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

### Selector strategy per critical component

Verified by grepping the current frontend (no `data-testid` exists today):

| Component | Element | Reliable selector | Source |
|-----------|---------|-------------------|--------|
| `ShortlistCard` thumb-no | button | `getByRole('button', { name: t('vote_no_aria') })` | `ShortlistCard.tsx#244` |
| `ShortlistCard` thumb-yes | button | `getByRole('button', { name: t('vote_yes_aria') })` | `ShortlistCard.tsx#255` |
| `ShortlistCard` partner dot | element | `getByLabel(partnerAria)` | `ShortlistCard.tsx#207` |
| `BottomNav` | nav | `getByRole('navigation', { name: 'Navigation principale' })` | `BottomNav.tsx#85` |
| `RatingPicker` selected | toggleable | `getByRole(..., { pressed: true })` | `RatingPicker.tsx#64` |
| `CookingLogFinalize` Notes section | textarea | `getByLabel(/Notes/)` (aria-labelledby) | `CookingLogFinalize.tsx#187` |
| Vote-state chips | text | `getByText('Validé')` / `Pressenti` / `Contesté` / `Rejeté` / `Sans avis` | `frontend/lib/i18n/fr.json#92-96` |
| Drafts inbox link | nav tab | `getByRole('link', { name: /Drafts/ }).getByText(/^\d+$/)` (badge) | `BottomNav.tsx#94-127` |

**For components without aria-labels (`HomeDecide`, `RecipeCard`, `RecipeDraftCard`):** use French DOM text from `frontend/lib/i18n/fr.json` plus `getByRole('article')` / `getByRole('heading')`. If a single spec absolutely needs an unambiguous handle and there's no good text/role, the planner records that as a Phase-10 follow-up TODO, NOT a v0.2.1 product-code edit.

## State of the Art

| Old approach | Current approach | When changed | Impact |
|--------------|------------------|--------------|--------|
| Pre-1.59 `globalSetup` config | Project dependencies (`projects: [{ name: 'setup', ... }, { dependencies: ['setup'] }]`) | Playwright 1.30+ (project deps) | Use project deps for HTML report integration + traces. CONTEXT D-05 mentions both terms; we implement as a setup project. |
| Single `webServer` entry + manual orchestration | `webServer: [...]` array | Playwright 1.31+ | Native dual-server orchestration; no `wait-on` / `concurrently` needed. |
| `localStorage` `auth_token` | `aldente_auth` HttpOnly cookie + Bearer fallback | Phase 01.1 (this milestone's predecessor) | TEST-04 exercises cookie path; D-01 specs use Bearer fallback — both paths still active. |
| Next.js Pages Router | App Router (RSC) | Next.js 13.4+ | TEST-02 specs assert against App Router routes (`app/recipes/page.tsx`, etc.). Layout-as-component changes nothing for E2E selectors. |
| Tailwind v3 `tailwind.config.ts` | Tailwind v4 `@tailwindcss/postcss` (no config file) | Tailwind v4 | Irrelevant for E2E except: class names work as before. |
| `google-generativeai` SDK (legacy, deprecated 2025-08-31) | `google-genai` unified SDK | 2025 | `services/llm.py` already migrated. D-04 stub plugs in below the SDK boundary. |

**Deprecated / outdated to avoid:**
- `await page.waitForTimeout(N)` — flake-prone; prefer `expect(...).toBeVisible()` with auto-retry.
- `page.evaluate(() => localStorage.setItem('auth_token', '...'))` — no longer relevant (cookie auth) and contradicts D-01.
- `tests/e2e/setup.ts` invoked via deprecated `globalSetup` field — use a setup project instead.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `@playwright/test ^1.59.1` (Chromium only — non-goal: cross-browser) |
| Config file | `frontend/playwright.config.ts` (NEW) |
| Quick run command | `npm run test:e2e` (from `frontend/`) |
| Full suite command | Same — `npm run test:e2e` runs all 14 specs across both projects (~3-5 minutes locally) |
| Sub-suite | `npm run test:e2e -- --project=seeded` or `--project=fresh` |
| Debug mode | `npm run test:e2e:ui` (Playwright UI mode) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test type | Automated command | Spec file |
|--------|----------|-----------|-------------------|-----------|
| TEST-01 | Seed produces 1 household + 1 member + 20 recipes + 3 cooking_logs + 5 vote-state coverage | Smoke (idempotency) | `cd backend && uv run seed && uv run seed` (assert no error, no duplicate) | n/a — verified in pre-test by `uv run seed` |
| TEST-01 | Seeded data renders | E2E | `npm run test:e2e -- --project=seeded` | `auth.skip-onboarding.spec.ts` |
| TEST-02 quick | `POST /recipes/quick` → drafts inbox row | E2E | `npm run test:e2e -- capture-quick` | `capture-quick.spec.ts` |
| TEST-02 full | `POST /recipes` → library row | E2E | `npm run test:e2e -- capture-full` | `capture-full.spec.ts` |
| TEST-02 voice | `POST /recipes/voice` → draft → stub-promote → structured | E2E | `npm run test:e2e -- capture-voice` | `capture-voice.spec.ts` |
| TEST-02 photo | `POST /recipes/photo` w/ `setInputFiles` → draft → stub-promote | E2E | `npm run test:e2e -- capture-photo` | `capture-photo.spec.ts` |
| TEST-02 url | `POST /recipes/url` → draft visible | E2E | `npm run test:e2e -- capture-url` | `capture-url.spec.ts` |
| TEST-02 drafts | Drafts inbox renders, dismissable, links to detail | E2E | `npm run test:e2e -- drafts-inbox` | `drafts-inbox.spec.ts` |
| TEST-02 vote | yes / no / Tu décides each transition chip color | E2E | `npm run test:e2e -- shortlist-vote` | `shortlist-vote.spec.ts` |
| TEST-02 detail | Hero + ingredients + steps render | E2E | `npm run test:e2e -- recipe-detail` | `recipe-detail.spec.ts` |
| TEST-02 cook | start → finalize → `last_cooked_at` + `cook_count` updated | E2E | `npm run test:e2e -- cooking-log-create-finalize` | `cooking-log-create-finalize.spec.ts` |
| TEST-02 cook history | `/cooking-logs` groups by date | E2E | `npm run test:e2e -- cooking-log-history` | `cooking-log-history.spec.ts` |
| TEST-02 library | List + search | E2E | `npm run test:e2e -- recipe-library` | `recipe-library.spec.ts` |
| TEST-02 settings | Invite code + name + household visible | E2E | `npm run test:e2e -- settings` | `settings.spec.ts` |
| TEST-03 bootstrap | 4 commands → green run | Manual (executed once at phase verification) | Follow `TESTING.md` from a clean checkout | n/a |
| TEST-04 invite-code | `/onboarding/create` → `/onboarding/join` end-to-end via cookie | E2E (fresh project) | `npm run test:e2e -- --project=fresh` | `invite-code-happy-path.spec.ts` |
| D-12 canary | Inject bug into ShortlistDeck OR votes.py → at least one spec fails → revert | Manual (phase verification gate) | `git stash` of inverted callback / score sign + full suite run | n/a |

### Sampling Rate
- **Per task commit:** No automated commit-level test required (Phase 10 builds the harness; doesn't run it on every commit).
- **Per wave merge:** `npm run test:e2e` green before merging the wave.
- **Phase gate:** Full suite green + D-12 canary verification (intentional-bug-and-revert) before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `docker-compose.test.yml` — provisions Postgres 16 on :5433
- [ ] `.env.test.example` — env contract
- [ ] `backend/app/cli/__init__.py` — package marker
- [ ] `backend/app/cli/seed.py` — main()
- [ ] `backend/app/services/llm_fixtures.py` — canned responses
- [ ] `frontend/playwright.config.ts` — webServer + projects + extraHTTPHeaders
- [ ] `frontend/tests/e2e/globalSetup.fresh.ts` — TRUNCATE 6 tables
- [ ] `frontend/tests/e2e/globalTeardown.fresh.ts` — re-seed (or skip)
- [ ] `frontend/tests/e2e/fixtures/risotto.jpg` — small JPEG (create with `printf` or imagemagick: `convert -size 64x64 xc:wheat tests/e2e/fixtures/risotto.jpg`)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Bearer token (existing) + cookie (existing); seed token MUST be confined to test environment |
| V3 Session Management | yes | TEST-04 exercises real cookie session creation; no new session code |
| V4 Access Control | partial | Seed bypasses the API and writes directly to DB; threat is environment-confusion, not access escalation |
| V5 Input Validation | n/a | Test infrastructure doesn't process untrusted input |
| V6 Cryptography | n/a | Existing `secrets.token_urlsafe(32)` handles tokens; seed uses fixed token only in test env |

### Known Threat Patterns for Test Infrastructure

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| **T-10-01:** Seed targets prod DB | Tampering | Seed CLI checks `settings.environment == "test"` AND `"aldente_test" in settings.database_url`; refuses with explicit error if either fails. (See `_guard_environment()` in seed.py code example.) |
| **T-10-02:** `.env.test` accidentally committed | Information Disclosure | `.gitignore` already covers `.env*` patterns; only `.env.test.example` (no secrets) is committed. Verify `.gitignore` line for `.env.test` before commit. |
| **T-10-03:** Seed `auth_token=test-token-luca` deployed to prod | Tampering / Spoofing | Seeded token is a known fixed value; if a seeded test DB ever became prod, anyone with the value could auth as Luca. Mitigation (already enforced): the seed REFUSES to run unless ENVIRONMENT=test AND database_url contains `aldente_test`. Belt-and-braces: `.env.test.example` documents the token explicitly so reviewers see the test scope; production deploy paths (Railway → Supabase) cannot pick up `SEED_AUTH_TOKEN` because they don't reference it. |
| **T-10-04:** LLM stub leaks into prod | Tampering | The `if settings.environment == "test"` guard in `services/llm.py` is the same `Settings` instance prod uses — `environment="development"` (default) takes the real Gemini path. No test-mode bleed. |
| **T-10-05:** Test DB Postgres exposed on host network | Information Disclosure | `docker-compose.test.yml` binds `5433:5432` only on `127.0.0.1` by default; document this in TESTING.md. Consumer machines firewall `:5433`. |
| **T-10-06:** Photo capture spec hits real Supabase | Information Disclosure | See Pitfall 8: planner adds env-flag guard to `services/storage.py#upload_recipe_photo` OR sets fake Supabase env vars. Either way: NO real Supabase write from test runs. |

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker Engine | `docker-compose.test.yml` for Postgres test instance | yes | `27.3.1` | — |
| Docker Compose | Same | yes | `v2.30.3-desktop.1` | — |
| Node.js | Frontend dev server + Playwright | yes | `v24.3.0` | — |
| `npm` | Frontend deps | yes | (bundled with Node 24) | — |
| `uv` | Backend deps + console-script runner | yes | `0.10.2` | — |
| Python 3.12 | Backend interpreter | (managed by uv) | 3.12 (per `.python-version`) | — |
| Playwright Chromium | Browser binaries | install via `npx playwright install --with-deps chromium` (one-time) | latest matching 1.59.1 | — |
| `psql` CLI | Optional debug | NO | — | Not required — Postgres-in-Docker doesn't need a host psql |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

All required tooling is present. The 4-command bootstrap from CONTEXT D-08 is executable today on the dev machine.

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | `services/storage.py#upload_recipe_photo` raises in test mode without Supabase env vars (blocking the photo capture spec) | Pitfalls §8 | If wrong: capture-photo spec fails opaquely. Mitigation already documented (planner adds env-flag guard OR sets fake env vars). [ASSUMED — based on reading `_supabase()` raise; not run end-to-end yet.] |
| A2 | APScheduler shortlist cron firing at 16:00 Europe/Paris during a test run does NOT corrupt the seeded daily_shortlist row | Pitfalls §3 | If wrong: a spec fails near 16:00. Mitigation: TESTING.md notes the edge case; planner can opt to gate `scheduler.start()` on env (4th surgical edit). [ASSUMED — based on reading lifespan logic; APScheduler creates new generation rows that don't conflict with the seed's generation=1.] |
| A3 | `next-intl` config does NOT lock locale to a header that Playwright would have to spoof | Selector strategy | If wrong: French strings don't render → text-based selectors miss. Mitigation: app is hardcoded French in v0.1 per `frontend/lib/i18n/fr.json` (single locale); no negotiation. [ASSUMED — based on `frontend/lib/i18n/fr.json` being the only locale file and CLAUDE.md "French only in v0.1".] |
| A4 | `Session.merge()` works correctly for `Recipe` despite the `recipe_status` enum + check constraints | Pitfalls §5 | If wrong: NOT NULL violations on second seed. Mitigation: explicitly set every NOT NULL column in seed. [ASSUMED — but Pitfall 5 documents the workaround.] |
| A5 | Playwright 1.59.1 supports `webServer.env` to scope environment variables per server | Architecture §webServer | If wrong: backend env leaks to frontend or vice versa. Verified via Playwright docs but not load-tested. [CITED: https://playwright.dev/docs/test-webserver — `env` field documented.] |
| A6 | The phase does NOT need to add `data-testid` to product code — aria-labels + French DOM text are sufficient | Selector strategy | If wrong: a spec is unwritable without product-code edits. Mitigation: planner records as Phase-10 follow-up TODO if found mid-execute. [VERIFIED — grep shows aria-labels on the load-bearing interactions.] |

If A1 or A2 turns out to be wrong during execution, the planner has documented escape hatches (4th surgical edit OR scheduler env gate). Neither breaks the milestone.

## Open Questions

1. **Should `globalTeardown.fresh.ts` re-seed?**
   - What we know: CONTEXT D-05 says "or skips reseed — planner decides".
   - What's unclear: If the next test run is `seeded`, the seed needs to be present.
   - Recommendation: **Yes, re-seed in teardown.** Symmetry with setup; keeps the `seeded` project's preconditions intact regardless of project ordering.

2. **Should `npm run test:e2e:reset` chain into `docker compose up` + `seed`?**
   - What we know: CONTEXT "Claude's Discretion" leaves this open.
   - Recommendation: Keep the reset script narrow (`docker compose down -v`). Document the full reset cycle in `TESTING.md`. Cluttered npm scripts are harder to debug than a 4-line runbook.

3. **Storage stub: env-flag guard or fake Supabase env vars?**
   - What we know: Pitfall 8 — `services/storage.py` raises without Supabase env. The capture-photo spec needs the recipe row + `photo_paths` populated; it does NOT need the bytes to actually land in object storage.
   - Recommendation: **Add a 4th surgical product-code edit** — `if settings.environment == "test": return f"test/{household_id}/{recipe_id}/{uuid4()}.{ext}"` at the top of `upload_recipe_photo` and `upload_cooking_log_photo`. Keeps the test flow deterministic without polluting real Supabase. This is a narrowly scoped, line-level edit that mirrors the D-04 pattern. Surface explicitly in the plan to keep executor scope honest.

4. **Should `GET /recipes/{id}/photos/{path}/signed-url` (signed URL endpoint) work in test mode?**
   - What we know: It's a Supabase passthrough. Specs that load recipe detail with photos may hit it.
   - Recommendation: For v0.2.1 specs, the seed creates recipes WITHOUT photos (`photo_paths=[]`) for the bulk of the 20+ recipes. ONE seeded recipe can have synthetic `photo_paths` if a spec needs it; that spec should not assert image rendering — only DOM presence of the photo wrapper. Document this in the seed and recipe-detail spec.

5. **CORS for the Bearer-header path in test mode?**
   - What we know: `allow_origins=settings.cors_origins_list` defaults to `http://localhost:3000` (D-02 in 01.1 / Phase 1). In Playwright tests, frontend on `:3000` calls backend on `:8000` — same as local dev. No new CORS config needed.
   - Recommendation: No change. Already covered.

## Sources

### Primary (HIGH confidence)
- [Playwright `webServer` array form (multiple servers)](https://playwright.dev/docs/test-webserver)
- [Playwright projects + dependencies + teardown](https://playwright.dev/docs/test-projects)
- [Playwright global setup/teardown vs project deps (recommended)](https://playwright.dev/docs/test-global-setup-teardown)
- [Playwright TestOptions — `extraHTTPHeaders` applies to "every request"](https://playwright.dev/docs/api/class-testoptions)
- [uv `[project.scripts]` console-script support](https://docs.astral.sh/uv/concepts/projects/config/)
- [Chromium treats http://localhost as secure context](https://chromestatus.com/feature/6269417340010496)
- `backend/app/auth.py` (Bearer fallback at line 67-68 — D-03 from 01.1)
- `backend/app/services/llm.py` (D-04 guard target; functions at lines 192, 214, 246)
- `backend/app/routers/votes.py` (composite-key upsert pattern at lines 55-67)
- `backend/app/models/enums.py` (TEST-01 anti-drift import target)
- `backend/alembic/env.py` (line 26: reads `settings.database_url` — D-02 redirect target)
- `frontend/lib/i18n/fr.json` (lines 92-96: vote state French strings — selector strategy)
- `frontend/lib/votes.ts` (frontend mirror of `compute_vote_state`)
- `frontend/components/ShortlistCard.tsx` (lines 244, 255: aria-labels on vote buttons)
- `frontend/components/BottomNav.tsx` (line 85: nav landmark)

### Secondary (MEDIUM confidence)
- [SQLAlchemy 2.0 `Session.merge()` — primary-key collision semantics](https://docs.sqlalchemy.org/en/20/orm/session_state_management.html)
- [DEV.to — bypassing Secure cookie limitation in WebKit (NOT Chromium) for localhost Playwright](https://dev.to/mupin/bypassing-secure-cookie-limitation-in-webkit-for-localhost-playwright-testing-3o18) — confirms Chromium does NOT have this issue
- [Allan Simon blog: Alembic with environment variables](https://allan-simon.github.io/blog/posts/python-alembic-with-environment-variables/)

### Tertiary (LOW confidence — flagged for execution-time validation)
- None. All claims either verified against current codebase, current Playwright docs, or current uv docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package version verified against the registry/repo at 2026-05-08.
- Architecture: HIGH — Playwright `webServer` array + project dependencies are stable, well-documented APIs.
- Pitfalls: HIGH for items 1, 4, 5, 6, 9 (verified against codebase). MEDIUM for 2, 3, 8 (depend on runtime behavior — documented mitigations cover them).
- Selector strategy: HIGH — verified by grepping `frontend/components/`.
- Threat model: HIGH for T-10-01 .. T-10-04 (mitigations are concrete code). MEDIUM for T-10-05/06 (operational guidance).

**Research date:** 2026-05-08
**Valid until:** 2026-06-07 (30 days — Playwright 1.x APIs are stable; Chromium localhost-Secure behavior locked since 2020; uv 0.10.x stable)

**Open scope-creep flags for the planner:**
1. The 4th surgical edit (`services/storage.py` test-mode guard) is RECOMMENDED but worth raising in the plan explicitly — `feedback_executor_scope_creep` makes scope drift risky.
2. The APScheduler env-gate (Pitfall 3 / Assumption A2) is NOT recommended in v0.2.1 — accept the timing risk and document.
3. The D-12 canary verification is a manual gate — the plan must include explicit instructions (which file, which line, expected failing spec) so the executor doesn't have to invent the test.
