# Testing — Al Dente

**Goal:** Make the shipped v0.1 / v0.2 PWA testable end-to-end on a fresh checkout via a one-command synthetic seed and a committed Playwright suite. From a clean clone, a green run is **4 commands**.

This document is the entry point for v0.2.1 testing. It is NOT a tutorial — it assumes Docker, Node 24+, and `uv` are already on your `$PATH` (see `.planning/phases/10-e2e-test-infrastructure/10-RESEARCH.md` for the full env-availability matrix). Every command is local-only; `feedback_no_manual_vercel_deploy.md` applies — this milestone never touches Railway, Vercel, or production Supabase.

## Quick start (4 commands)

Run from the repo root after a fresh `git clone`:

```bash
docker compose -f docker-compose.test.yml up -d
(cd backend && uv sync && uv run alembic upgrade head && uv run seed)
(cd frontend && npm ci && npx playwright install --with-deps chromium)
(cd frontend && npm run test:e2e)
```

Total wall-clock on a clean machine: ~3-5 minutes (mostly Playwright Chromium download + Next.js first compile). Subsequent runs reuse the volume + the install: ~60-90 seconds.

The HTML report opens automatically on first failure (and is regenerated under `frontend/playwright-report/` on every run). To open it manually after a green run:

```bash
(cd frontend && npx playwright show-report)
```

## Environment variables

All variables live in `.env.test.example` at the repo root (committed, no secrets). Copy to `.env.test` (git-ignored) if you need to override defaults. The 4 variables and where each is consumed:

| Variable | Default | Consumed by | Purpose |
|----------|---------|-------------|---------|
| `ENVIRONMENT` | `test` | `backend/app/config.py`, `backend/app/services/llm.py`, `backend/app/services/storage.py`, `backend/app/cli/seed.py` | Switches backend into test mode: DB pointer, LLM stub, storage stub, seed guard |
| `DATABASE_URL_TEST` | `postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test` | `backend/app/config.py` (overwrites `database_url` when `ENVIRONMENT=test`) | Test Postgres connection string. **MANDATORY** — the seed CLI HARD-REFUSES to run unless `aldente_test` appears in the resolved URL (T-10-05 mitigation, see plan 10-03) |
| `SEED_AUTH_TOKEN` | `test-token-luca` | `backend/app/cli/seed.py` (sets `Member.auth_token`); `frontend/playwright.config.ts` (injects as Bearer header on the `seeded` Playwright project) | Single source of truth for the test member's auth token. Bearer header bypasses onboarding for all specs except `invite-code-happy-path.spec.ts` (which exercises the real cookie flow under the `fresh` project) |
| `NEXT_PUBLIC_API_BASE` | `http://localhost:8000` | Frontend `npm run dev` (via `playwright.config.ts` webServer.env) | Points the Next.js dev server at the test backend rather than production |

**Setting overrides:** prefer exporting in your shell. Example:

```bash
export SEED_AUTH_TOKEN=my-fresh-token
(cd backend && uv run seed)
(cd frontend && npm run test:e2e)
```

The seed and Playwright both read `process.env.SEED_AUTH_TOKEN`, so the export propagates to both halves of the suite without per-side configuration.

## What the suite covers

Two Playwright projects under `frontend/playwright.config.ts`:

- **`seeded`** (13 specs) — Bearer header auto-injected as `Authorization: Bearer ${SEED_AUTH_TOKEN}`. Runs against the seeded household (`Foyer Test`, invite code `TEST01`, members Luca + Partner). Uses the locked-vocabulary recipe corpus seeded by `uv run seed`.
- **`fresh`** (1 spec) — no auth header. Runs only `invite-code-happy-path.spec.ts` after a `globalSetup.fresh.ts` setup project TRUNCATEs the 6 onboarding tables (households, members, recipes, votes, cooking_logs, daily_shortlists). Re-seeds via `globalTeardown.fresh.ts` so subsequent `seeded` runs see populated data.

### Spec matrix (TEST-02 + TEST-04 coverage)

| Spec | Project | Covers | Notes |
|------|---------|--------|-------|
| `auth.skip-onboarding.spec.ts` | seeded | Bearer-header bypass sanity check | Asserts BottomNav landmark (`Navigation principale`) is visible at `/` |
| `capture-quick.spec.ts` | seeded | TEST-02 quick capture (D-07 quick) | POST /recipes/quick → draft visible in `/inbox` |
| `capture-full.spec.ts` | seeded | TEST-02 full capture (D-07 full) | POST /recipes (structured payload) → row in `/recipes` library |
| `capture-voice.spec.ts` | seeded | TEST-02 voice capture (D-07 voice) | POST /recipes/voice → poll for promotion → asserts canned `Risotto aux champignons (test)` |
| `capture-photo.spec.ts` | seeded | TEST-02 photo capture (D-07 photo) | Multipart with `risotto.jpg` fixture → asserts canned `Tarte Tatin (test)` |
| `capture-url.spec.ts` | seeded | TEST-02 URL capture (D-07 url) | POST /recipes/url with `https://example.test/...` → poll for promotion |
| `drafts-inbox.spec.ts` | seeded | TEST-02 inbox renders + click-through | Inbox row → recipe detail navigation |
| `shortlist-vote.spec.ts` | seeded | TEST-02 daily shortlist (5 vote states) | Asserts ALL FIVE French labels: Validé / Pressenti / Contesté / Rejeté / Sans avis |
| `recipe-detail.spec.ts` | seeded | TEST-02 detail page | Title heading + ingredient list + numbered steps |
| `cooking-log-create-finalize.spec.ts` | seeded | TEST-02 cook flow | Finalize → poll asserts `cook_count++` and `last_cooked_at` flips non-null |
| `cooking-log-history.spec.ts` | seeded | TEST-02 cooking history | `/cooking-logs` lists 3 seeded logs |
| `recipe-library.spec.ts` | seeded | TEST-02 library list + search | ≥5 titles render, `Tarte` search filters to Tarte Tatin |
| `settings.spec.ts` | seeded | TEST-02 settings (read-only) | Invite code `TEST01` + member `Luca` + household `Foyer Test` visible |
| `invite-code-happy-path.spec.ts` | fresh | TEST-04 onboarding cookie flow | Two browser contexts: Alice creates → Bob joins → both auth via real `aldente_auth` cookie |

Total: 14 specs (13 seeded + 1 fresh). Pre-existing specs `diag.spec.ts` and `w1-gate.spec.ts` are excluded by `testIgnore` in `playwright.config.ts` and remain unmodified — they belong to a prior phase and may target a different backend topology.

## Useful commands

```bash
# Full suite
(cd frontend && npm run test:e2e)

# Just the seeded project
(cd frontend && npm run test:e2e -- --project=seeded)

# Just the fresh project (TEST-04)
(cd frontend && npm run test:e2e -- --project=fresh)

# Single spec
(cd frontend && npm run test:e2e -- shortlist-vote)

# UI mode (interactive runner — useful for debugging)
(cd frontend && npm run test:e2e:ui)

# Reset the test DB volume (forces a fresh schema next run)
(cd frontend && npm run test:e2e:reset)
# Then re-run the bootstrap from step 2 onwards.

# Re-run just the seed (idempotent — safe to repeat at any time)
(cd backend && ENVIRONMENT=test DATABASE_URL_TEST=postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test uv run seed)

# Inspect the test DB directly
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d aldente_test
```

## Troubleshooting

### Docker port conflict on 5433
**Symptom:** `docker compose -f docker-compose.test.yml up -d` fails with `bind: address already in use` for port 5433.
**Cause:** A previous `aldente-postgres-test` container, OR another tool is already using 5433.
**Fix:** `docker compose -f docker-compose.test.yml down -v` to clear the stale container + volume. If a non-Docker tool owns 5433, identify it via `lsof -i :5433` and stop it.

### Playwright Chromium install fails or stalls
**Symptom:** `npx playwright install --with-deps chromium` hangs or errors.
**Cause:** Bandwidth-constrained network or missing system deps (Linux only).
**Fix:** Retry the install with `--with-deps` flag (downloads ~150MB). On macOS the `--with-deps` flag is a no-op; on Linux it pulls libs via apt/dnf.

### Next.js dev server cold-start exceeds webServer timeout
**Symptom:** First test run hangs at "waiting for `http://localhost:3000`" then fails with `Timed out waiting 180000ms`.
**Cause:** First Next.js compile on this checkout exceeded 180s. Tailwind v4 + RSC first-build can be very slow on cold caches.
**Fix:** `(cd frontend && npm run dev)` once before running the suite — let the server compile, then Ctrl-C; rerun the suite with `reuseExistingServer: true` (which is the default when `CI` env var is unset, see `playwright.config.ts`).

### APScheduler shortlist job runs at 16:00 Europe/Paris during a test run
**Symptom:** A spec passes 99% of the time but flakes near 16:00 local time.
**Cause:** `backend/app/main.py` lifespan starts a scheduler with `CronTrigger(hour=16, minute=0)` per household. If the test run straddles the trigger time, a new shortlist generation row may appear mid-test.
**Status:** Documented as Pitfall 3 in research. Not patched in v0.2.1 — the seed inserts ONE shortlist per household at a fixed past `generation` value, and the new generation row from the cron does not collide. If you observe consistent flakes near 16:00 local time, schedule your test runs outside that window or contribute the 1-line `if settings.environment != "test":` guard in `app/main.py` (out-of-scope for v0.2.1).

### Console noise from Web Speech API or framer-motion
**Symptom:** Headless Chromium logs warnings about Web Speech API not being available, or framer-motion animation cues.
**Cause:** Web Speech API doesn't exist in headless Chromium. Production frontend posts transcripts as JSON from iOS keyboard dictation (CAPTURE-04) — Web Speech is NOT invoked. Animation warnings are non-fatal.
**Fix:** Ignore. No spec asserts on `consoleErrors` per RESEARCH.md Pitfall 10. If you see a NEW kind of console error, surface it as a follow-up issue (do not patch inline).

### Photo capture spec hits Supabase
**Symptom:** `capture-photo.spec.ts` fails with "Supabase URL / service-role key not configured".
**Cause:** The test-mode storage stub from plan 10-02 (`backend/app/services/storage.py`) didn't apply — `settings.environment != "test"` at storage-call time.
**Fix:** Confirm `ENVIRONMENT=test` is in the `webServer.env` block of `playwright.config.ts` (it should be). Restart the test backend (`Ctrl-C` the playwright run; the next `npm run test:e2e` respawns uvicorn with the right env).

### Seed refuses to run
**Symptom:** `uv run seed` exits with `REFUSING to seed: ENVIRONMENT='development', expected 'test'.` or `REFUSING to seed: database_url does not contain 'aldente_test'`.
**Cause:** Working as intended — T-10-01 mitigation (plan 10-03). The seed will only target a database whose URL literally contains `aldente_test`, AND only when `ENVIRONMENT=test`.
**Fix:** Confirm both env vars are set:

```bash
ENVIRONMENT=test \
DATABASE_URL_TEST=postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test \
(cd backend && uv run seed)
```

## Regression canary verification gate (D-12)

Per CONTEXT D-12 the suite must demonstrate it actually catches regressions in the hot path. The procedure is two revertible 1-line bugs — one in the frontend swipe handler, one in the backend vote upsert — followed by full suite runs that MUST fail. The bugs are then reverted via `git checkout --` before phase close.

**The executor of plan 10-07 RUNS this gate manually as part of Task 2 below and records the results in the SUMMARY. This is a precondition for declaring Phase 10 complete.**

### Procedure A — frontend canary (ShortlistDeck.tsx)

1. Open `frontend/components/ShortlistDeck.tsx`.
2. Find the vote-handler callback that maps swipe direction (or button tap) to a `'yes'` / `'no'` string. Invert the mapping by swapping the two branches (one line).
3. Run: `(cd frontend && npm run test:e2e -- --project=seeded --grep shortlist-vote)`
4. Confirm: at least one assertion in `shortlist-vote.spec.ts` fails (the seeded "Sans avis" recipe transitions to the wrong state, or one of the 5 French labels is missing).
5. Revert: `git checkout -- frontend/components/ShortlistDeck.tsx`
6. Confirm: `git diff frontend/components/ShortlistDeck.tsx` is empty.

### Procedure B — backend canary (votes.py)

1. Open `backend/app/routers/votes.py`.
2. Find the upsert that records the vote (around lines 55-67, the `pg_insert(Vote).values(...)` block). Flip the sign of any score-related delta, OR change the `set_={"vote": body.vote, ...}` so the conflict path writes a stale value (one line).
3. Run: `(cd frontend && npm run test:e2e -- --project=seeded --grep shortlist-vote)` — and optionally `--grep cooking-log` if the change is in score territory.
4. Confirm: at least one assertion fails.
5. Revert: `git checkout -- backend/app/routers/votes.py`
6. Confirm: `git diff backend/app/routers/votes.py` is empty.

### Final gate

After both canaries are reverted:

```bash
git status --short
```

Should show ONLY:

```
?? TESTING.md
?? .planning/phases/10-e2e-test-infrastructure/10-07-SUMMARY.md
```

(Plus any other intentional new files for Phase 10.) NO modifications to product code (`backend/app/**` or `frontend/components/**`) should remain.

## What's NOT covered (deferred — by design)

These are intentionally out of scope for v0.2.1 per CONTEXT.md "Deferred Ideas" and ROADMAP.md non-goals. They are NOT bugs in the suite — they are future scope:

- **Realtime / WebSocket coverage** (CONTEXT D-06): no spec asserts on WS frames (`recipe.created`, `vote.created`, etc.). HTTP-driven user-visible outcomes are the v0.2.1 regression net. Realtime gets its own follow-up phase.
- **CI integration:** `npm run test:e2e` is local-only. GitHub Actions / Vercel CI hookup is a follow-up phase once the suite is proven green locally.
- **Visual regression / screenshot testing:** Out of scope. UI audits remain the job of `/gsd-ui-review`.
- **Cross-browser coverage** (Firefox, WebKit): Chromium-only for v0.2.1. iOS Safari validation stays manual on physical devices.
- **Performance / load testing:** Functional E2E only.
- **POLISH-01** (i18n sweep on partner-waiting strings) and **POLISH-02** (Copy-to-clipboard on partner-waiting Card invite code): listed in `.planning/milestones/v0.2-MILESTONE-AUDIT.md`; fold via `/gsd-add-phase` later if scope warrants.

## Reference

- Phase plans + SUMMARYs: `.planning/phases/10-e2e-test-infrastructure/`
- Requirement IDs: `.planning/REQUIREMENTS.md` (TEST-01..04)
- Source of truth for product behavior: `SPEC.md` (root) — locked vocabularies, voting state machine, capture pipeline, auth scheme
- Architecture invariants: `CLAUDE.md` (root) — invariants 1-6
- Memory: `feedback_executor_scope_creep.md` and `feedback_no_manual_vercel_deploy.md` apply to all test-infra work
