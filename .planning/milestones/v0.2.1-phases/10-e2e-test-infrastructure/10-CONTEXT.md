# Phase 10: E2E test infrastructure & synthetic seed — Context

**Gathered:** 2026-05-08 (auto mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 10 makes the shipped v0.1 / v0.2 PWA testable end-to-end on a fresh checkout via:

1. An idempotent backend Python seed CLI (`uv run seed`) that creates one household + one member
   with a fixed env-overridable `auth_token`, plus 20+ recipes spanning the locked enums, with
   non-empty `cooking_logs` and `votes` so derived state (vote-state computation,
   `recipes.last_cooked_at`, `recipes.cook_count`) renders populated.
2. A committed `@playwright/test` suite under `frontend/tests/e2e/` covering every shipped
   screen and user action against a real local Postgres (no DB mocking).
3. A bootstrap runbook + npm/uv scripts that take a fresh checkout to a green Playwright run
   in ≤ 5 commands.
4. One invite-code happy-path spec that exercises `/onboarding/create` → invite code →
   `/onboarding/join` end-to-end **without** the seeded auth shortcut.

**Not in this phase:** product-code refactors (`feedback_executor_scope_creep`); new product
features; production-hosting tests (Railway / Vercel / Supabase prod); CI integration; visual
regression / screenshot testing; cross-browser coverage; performance / load testing; deferred
v0.2 polish items POLISH-01 (i18n sweep on partner-waiting strings) and POLISH-02 (Copy
button) — these are listed in `.planning/milestones/v0.2-MILESTONE-AUDIT.md` and intentionally
NOT folded.

</domain>

<decisions>
## Implementation Decisions

### Auth shortcut for Playwright

- **D-01:** Specs that need a logged-in member set `Authorization: Bearer ${PLAYWRIGHT_AUTH_TOKEN}`
  via `playwright.config.ts` → `use.extraHTTPHeaders`. The backend's `auth.py` already accepts
  Bearer as a fallback for local-dev / curl per 01.1 D-03; this preserves prod/test parity (no
  cookie attribute hacks). Specs that target the real cookie flow (TEST-04) run in a second
  Playwright project with no `extraHTTPHeaders`. `PLAYWRIGHT_AUTH_TOKEN` MUST equal the seed's
  `SEED_AUTH_TOKEN` (single env var preferred — see D-09).

### Test database isolation

- **D-02:** A new `docker-compose.test.yml` at repo root brings up a Postgres 16 service on
  `localhost:5433` with database `aldente_test`. `DATABASE_URL_TEST` defaults to
  `postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test`. The dev DB on Supabase
  is NEVER touched by tests. `backend/app/config.py` resolves the active URL by reading
  `DATABASE_URL_TEST` when `ENVIRONMENT=test`, otherwise `DATABASE_URL` (one-line guard, no
  refactor of existing settings shape).

- **D-03:** Schema is provisioned via the existing alembic migration set
  (`backend/alembic/versions/0001_baseline.py` … `0005_last_cooked_photo_path.py`) — no test-only
  schema drift. Reset between full runs is `alembic downgrade base && alembic upgrade head` OR
  the docker volume is recreated (`docker compose down -v`); seed handles per-run idempotency
  (D-08).

### External-service handling (Gemini)

- **D-04:** `backend/app/services/llm.py` gets a guarded fast-path: when
  `settings.environment == "test"`, the public extraction functions return a deterministic
  canned `GeminiExtractedRecipe` instantly (no API call). This keeps the draft → structured
  promotion BackgroundTask path tested end-to-end without burning Gemini quota or adding flake
  from real LLM latency. The fixture lives next to the stub (e.g.
  `services/llm_fixtures.py`) so reviewers see canonical input/output side-by-side. Database is
  NEVER mocked — only Gemini is.

### Test execution model

- **D-05:** Playwright runs serially (`workers: 1`) with two projects:
  1. **`seeded`** — uses Bearer header from D-01, runs against the seeded household; covers
     capture (all 5 surfaces), drafts inbox, daily shortlist (vote-yes / vote-no / Tu décides),
     recipe detail, cooking-log create + finalize, recipe library list/search, settings (display
     invite code).
  2. **`fresh`** — no auth header; runs ONLY the TEST-04 invite-code spec; depends on a
     `globalSetup` step that truncates `households`, `members`, `recipes`, `votes`,
     `cooking_logs`, `daily_shortlists` BEFORE its specs run, then re-seeds (or skips reseed —
     planner decides) AFTER its specs run.

  Couple-scale workload + single-machine target makes parallelism's flake budget cost more than
  it saves.

### Realtime / WebSocket coverage

- **D-06:** WS broadcast outcomes (`recipe.created`, `recipe.promoted`, `vote.created`,
  `cooking.created`, `cooking.finalized`, `recipe.deleted`) are NOT asserted in v0.2.1 specs.
  HTTP-driven user-visible outcomes (DOM text, navigation, toast) are sufficient regression
  coverage for this milestone. Where a spec would naturally need realtime to observe a side
  effect (e.g. partner badge update without manual reload), use `test.fixme` with a TODO citing
  this decision. Realtime regression coverage is its own follow-up phase.

### Capture surface coverage depth

- **D-07:** All 5 capture surfaces are covered (no `test.fixme` for un-wired surfaces — every
  surface IS wired backend-side per `backend/app/routers/recipes.py`). With the LLM stub from
  D-04 making promotion deterministic:
  - **quick:** `POST /recipes/quick` → assert drafts inbox row visible.
  - **full:** `POST /recipes` → assert recipe present in library with structured fields.
  - **voice:** `POST /recipes/voice` with fake transcript → assert draft → assert stub-driven
    promotion lands as `structured`. Web Speech API itself is NOT invoked in headless Chromium
    (per SPEC.md: in-app Web Speech is dead on iOS PWA standalone anyway; OS-keyboard-mic is
    the production UX).
  - **photo:** `POST /recipes/photo` via Playwright `setInputFiles()` with a static fixture
    image at `frontend/tests/e2e/fixtures/risotto.jpg` → assert stub-driven promotion.
  - **url:** `POST /recipes/url` with a deterministic test URL (the stub does NOT hit the
    network — it returns canned data based on `settings.environment == "test"`). No real
    fetch, no flake.

### Bootstrap runbook shape

- **D-08:** 4-command bootstrap documented in a new `TESTING.md` at repo root:
  1. `docker compose -f docker-compose.test.yml up -d`
  2. `cd backend && uv sync && uv run alembic upgrade head && uv run seed`
  3. `cd frontend && npm ci && npx playwright install --with-deps chromium`
  4. `cd frontend && npm run test:e2e`

  `playwright.config.ts` orchestrates the runtime via `webServer` entries (uvicorn on
  `:8000` with `ENVIRONMENT=test` and the test DATABASE_URL; next dev on `:3000` proxying
  `/api/*` to the local backend per 01.1 D-01). `seed` is a console-script entry under
  `[project.scripts]` in `backend/pyproject.toml`. `npm run test:e2e` is added to
  `frontend/package.json` scripts.

### Seed idempotency mechanism

- **D-09:** Seed uses `uuid.uuid5(NAMESPACE_DNS, "aldente.test.<entity>.<key>")` for stable IDs
  across runs and machines. Insertion uses `Session.merge()` (or upsert via `INSERT ... ON
  CONFLICT DO UPDATE` for tables where merge is awkward). Re-running `uv run seed` is a no-op
  for already-present rows; field updates land if seed values change. Composite-key tables
  (`votes(shortlist_id, recipe_id, member_id)`) use the same uuid5 strategy on the `id` PK plus
  unique-key conflict resolution. **TRUNCATE + INSERT is explicitly NOT used** — it would break
  the "re-running mid-test" success criterion.

- **D-10:** Seed env vars (defaults match production-shaped values):
  - `SEED_AUTH_TOKEN` (default: `test-token-luca`) — fixed `auth_token` for the seeded member.
  - `PLAYWRIGHT_AUTH_TOKEN` — duplicates `SEED_AUTH_TOKEN`; consumed by `playwright.config.ts`.
    Documented as a single source: `.env.test.example` exports `SEED_AUTH_TOKEN`, and
    `playwright.config.ts` reads `process.env.SEED_AUTH_TOKEN` directly (drop the duplicate var
    name) — single source of truth. Planner picks the final var name, but DO NOT have two
    different values in two different files.

### Spec coverage matrix (TEST-02)

- **D-11:** Specs to ship under `frontend/tests/e2e/`:
  - `auth.skip-onboarding.spec.ts` — sanity-check that Bearer header bypasses onboarding guard.
  - `capture-quick.spec.ts` — D-07 quick.
  - `capture-full.spec.ts` — D-07 full.
  - `capture-voice.spec.ts` — D-07 voice.
  - `capture-photo.spec.ts` — D-07 photo.
  - `capture-url.spec.ts` — D-07 url.
  - `drafts-inbox.spec.ts` — appears, dismissable, links to recipe detail.
  - `shortlist-vote.spec.ts` — vote-yes / vote-no / "Tu décides" each transition the chip into
    the expected vote-state color (Validé / Pressenti / Contesté / Rejeté / Sans avis).
  - `recipe-detail.spec.ts` — paper-grain hero + ingredient list + numbered instructions render.
  - `cooking-log-create-finalize.spec.ts` — start cook → finalize with rating + notes;
    `recipes.last_cooked_at` and `cook_count` updated.
  - `cooking-log-history.spec.ts` — `/cooking-logs` history view groups by date.
  - `recipe-library.spec.ts` — list + search.
  - `settings.spec.ts` — invite code + member name + household name visible (read-only per 01.1).
  - `invite-code-happy-path.spec.ts` — TEST-04, runs in `fresh` Playwright project.

  Each spec asserts at least one user-visible outcome (DOM text, navigation, toast) — not just
  absence of errors.

### Regression-test hot-path canary (success criterion 4)

- **D-12:** The plan must include a manual verification step where a small intentional bug is
  introduced into either `frontend/components/ShortlistDeck.tsx` (e.g. invert the vote-yes /
  vote-no callback wiring) OR `backend/app/routers/votes.py` (e.g. flip the `score_delta`
  sign), the suite is run, and at least one spec fails. The bug is then reverted. This proves
  the suite has real regression-catching power; it is NOT shipped (revert before commit). The
  planner captures this as the phase's verification gate.

### Claude's Discretion

The following are implementation details the planner / executor should decide WITHOUT
re-asking the user:

- Exact Postgres image tag in `docker-compose.test.yml` (recommend `postgres:16-alpine`).
- Whether `npm run test:e2e` chains `playwright install` automatically or expects a separate
  install step (recommend: separate, keeps the bootstrap explicit at 4 commands).
- Whether `docker compose down -v` is run as `npm run test:e2e:reset` or just documented.
- Exact directory for the LLM stub fixtures (e.g. `backend/app/services/llm_fixtures.py` vs
  inline constants in `llm.py`).
- Where to put `globalSetup` for the `fresh` Playwright project (e.g.
  `frontend/tests/e2e/globalSetup.fresh.ts`).
- Whether to log Playwright HAR / trace on failure (recommend: yes, locally; tests run on
  laptop only).
- Whether to add an `npm run test:e2e:ui` headed mode for debugging (recommend: yes).

### Folded Todos

None — the cross-reference yielded no matches relevant to TEST-01..04.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source of truth & milestone scope
- `SPEC.md` (repo root) — locked vocabularies (Season / Cuisine / Mood / Protein), voting state
  machine (Validé / Pressenti / Contesté / Rejeté / Sans avis), capture pipeline (5 surfaces,
  one shape, server-side BackgroundTask promotion), auth scheme (invite-code → opaque
  `auth_token`), data model.
- `.planning/PROJECT.md` — Current Milestone v0.2.1 section + Key Decisions table.
- `.planning/REQUIREMENTS.md` — TEST-01 / TEST-02 / TEST-03 / TEST-04 acceptance criteria
  (authoritative — every detail in this CONTEXT.md derives from REQUIREMENTS.md, NOT the
  reverse).
- `.planning/ROADMAP.md` §"Phase 10" — non-goals list (no product-code refactors, no new
  features, local-only, no CI integration in v0.2.1, no visual regression, Chromium-only).
- `.planning/milestones/v0.2-MILESTONE-AUDIT.md` — POLISH-01 / POLISH-02 are deferred and NOT
  folded into v0.2.1.

### Auth + cookie behavior (D-01)
- `.planning/phases/01.1-cookie-auth-and-recovery/01.1-CONTEXT.md` — D-03 (Bearer header
  fallback explicitly preserved for local dev / curl); D-02 (cookie attribute lock); D-04
  (api.ts simplification); D-05 (WebSocket auth via cookie or `?token=` query string).
- `backend/app/auth.py` — `current_member()` dual-mode (Cookie wins, Bearer header falls back);
  `AUTH_COOKIE_NAME = "aldente_auth"`; `AUTH_COOKIE_MAX_AGE = 7776000`.

### Capture pipeline (D-07)
- `backend/app/routers/recipes.py` — POST /recipes (full), /recipes/quick, /recipes/voice,
  /recipes/photo, /recipes/url, /recipes/{id}/voice-modify, /recipes/{id}/retry-promotion.
  Confirms ALL 5 surfaces are wired backend-side — no `test.fixme` for un-wired surfaces.
- `backend/app/services/llm.py` — Gemini integration; D-04 stub guard added here.
- `backend/app/services/realtime.py` — `broadcast_to_household()` chokepoint for
  `recipe.created` / `recipe.promoted` events (relevant to D-06 deferral).

### Vote state computation (success criterion 4)
- `backend/app/routers/votes.py` — vote-state computation; one of two regression-test canary
  targets per D-12.
- `backend/app/services/voting.py` — supporting computation logic.
- `frontend/components/ShortlistDeck.tsx` — second canary target per D-12.

### Vocabulary mirror (TEST-01 anti-pattern: enum drift)
- `backend/app/models/enums.py` — Python `Enum` classes (Season / Cuisine / Mood / Protein)
  the seed MUST import directly. NO duplicated literal values in seed code.
- `frontend/lib/enums.ts` — TypeScript mirror; values must equal the Python `.value` strings.

### Schema set (D-03)
- `backend/alembic/versions/0001_baseline.py` — initial schema.
- `backend/alembic/versions/0002_drop_pings.py`
- `backend/alembic/versions/0003_promotion_columns.py`
- `backend/alembic/versions/0004_phase3_tables.py`
- `backend/alembic/versions/0005_last_cooked_photo_path.py`
- `backend/alembic/env.py` — migration env config (must read the same `DATABASE_URL` switching
  logic added in D-02).

### Anti-pattern guards
- Memory: `feedback_no_manual_vercel_deploy.md` — no manual Vercel/Railway deploys; push to
  `main` only. Phase 10 must NOT touch deploy commands.
- Memory: `feedback_executor_scope_creep.md` — gsd-executor previously modified files outside
  plan scope. The plan for Phase 10 MUST pass this CONTEXT.md (and the eventual SUMMARY.md) to
  the executor with a hard scope constraint: tests + seed + scripts ONLY, no product-code
  refactors. If the suite surfaces a real bug, the executor flags it and stops — does not fix.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`@playwright/test ^1.59.1`** is already in `frontend/package.json` devDependencies — no new
  dependency to add for TEST-02. Just need `playwright.config.ts` + the `tests/e2e/` tree
  + the `npm run test:e2e` script.
- **`backend/app/auth.py`** already supports Bearer-header fallback (D-03 from 01.1) — the
  test auth shortcut needs ZERO new auth code.
- **`backend/app/models/enums.py`** is a single-file Enum module — direct import in the seed is
  trivial.
- **`backend/alembic/`** is fully configured with 5 migrations — `alembic upgrade head` against
  `DATABASE_URL_TEST` provisions the schema for free.
- **`frontend/tests/e2e/`** already exists (empty dir from milestone init) — drop specs in.

### Established Patterns
- **Backend uses `pydantic-settings` + `Settings` class** at `backend/app/config.py` reading
  from env. Adding a `database_url_test: str = ""` field + an `effective_database_url`
  property (or a one-line guard in `db.py`) is the lowest-impact way to wire D-02.
- **Same-tx denormalization** for `recipes.last_cooked_at` / `cook_count` is invariant #3 from
  CLAUDE.md — the seed must replicate this when inserting `cooking_logs` (insert log + update
  recipe in the same `db.commit()`).
- **Voting state is computed, NEVER stored** (invariant #2). The seed inserts rows in the
  `votes` table to drive each of the 5 computed states; no `state` column to write.
- **`source_capture` JSONB is preserved** (invariant #5) — seed populates this for voice / url
  recipes with realistic transcripts / URLs so the regression test against the LLM stub flow
  has realistic shape.
- **next-intl French-only** (CLAUDE.md + invariant #6) — Playwright DOM-text assertions match
  the French strings (Validé / Pressenti / Contesté / Rejeté / Sans avis), not English. No
  hardcoded English strings creep in via test fixtures.

### Integration Points
- `playwright.config.ts` (NEW) → `frontend/playwright.config.ts`.
- `frontend/tests/e2e/` → already empty dir, ready for spec files.
- `frontend/tests/e2e/fixtures/` (NEW) → static images, canned URLs, helpers.
- `backend/app/cli/seed.py` (NEW) → seed entry point. Console-script in
  `backend/pyproject.toml` `[project.scripts]`.
- `backend/app/config.py` → add `database_url_test` + `environment == "test"` switch.
- `backend/app/services/llm.py` → add `settings.environment == "test"` guard returning canned
  data.
- `docker-compose.test.yml` (NEW) → repo root, test Postgres only.
- `TESTING.md` (NEW) → repo root, the 4-command runbook.
- `.env.test.example` (NEW) → repo root, the env vars Playwright + uvicorn need.

</code_context>

<specifics>
## Specific Ideas

- The "introduce-a-bug-and-revert" canary in D-12 should target one frontend file AND one
  backend file (or run twice — once each) so the suite proves it covers both layers.
- TESTING.md should open with the 4 commands (copy-pasteable block) and put rationale below
  the fold — same shape as the SPEC.md "First concrete action" gate.
- Playwright HTML report (`npx playwright show-report`) should be the default output so a
  clean run looks visually green — matches the success criterion phrasing "sees Playwright
  report all green specs."

</specifics>

<deferred>
## Deferred Ideas

These came up implicitly during analysis but belong outside this phase:

- **Realtime regression coverage** (D-06) — covering the WebSocket spine + DOM CustomEvent
  bridge with playwright. Adds non-determinism worth its own phase.
- **CI integration** (out-of-scope per ROADMAP.md non-goals) — wiring `npm run test:e2e` into
  GitHub Actions; can be a follow-up phase once the suite is proven green locally.
- **Visual regression / screenshot testing** (out-of-scope per non-goals) — UI audit remains
  the job of `/gsd-ui-review`.
- **Cross-browser coverage** (Firefox / WebKit) — Chromium-only for v0.2.1.
- **Performance / load testing** — its own discipline.
- **POLISH-01** (i18n sweep on partner-waiting strings) and **POLISH-02** (Copy-to-clipboard
  on partner-waiting Card invite code) — listed in
  `.planning/milestones/v0.2-MILESTONE-AUDIT.md`. Fold via `/gsd-add-phase` into v0.2.1 (or a
  future v0.2.2) if scope warrants.

### Reviewed Todos (not folded)
None — todo cross-reference yielded no matches.

</deferred>

---

*Phase: 10-e2e-test-infrastructure*
*Context gathered: 2026-05-08 (auto mode — recommended defaults applied for all 8 gray areas;
see 10-DISCUSSION-LOG.md for the audit trail)*
