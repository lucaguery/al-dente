---
phase: 01-foundations-w1
plan: 03
subsystem: backend
tags: [fastapi, sqlalchemy, alembic, supabase, railway, bearer-auth, cors]

# Dependency graph
requires:
  - 01-01-shared-vocab (backend/app/__init__.py, backend/app/models/__init__.py, backend/app/models/enums.py, backend/app/colors.py)
provides:
  - Live FastAPI backend at https://al-dente-production.up.railway.app/
  - /healthz endpoint returning {"status":"ok"} (verified: 200)
  - SQLAlchemy 2.0 ORM models matching SPEC.md §"Data model" verbatim (7 tables: households, members, recipes, cooking_logs, daily_shortlists, votes, pings)
  - Alembic baseline migration applied to dev Supabase Postgres
  - Bearer-token auth dependency `current_member` (services/auth.py) — gated behind a "use it from a router" gate that lands in 01-04
  - Explicit CORS allowlist (no wildcards) — production includes the Vercel domain + localhost:3000
  - Railway-ready Dockerfile that runs `alembic upgrade head` before starting uvicorn
affects:
  - 01-04-onboarding-backend (mounts the first router; closes the INFRA-06 end-to-end protected-route test)
  - 01-05-realtime-and-ping-backend (consumes app.main, adds /ws and /pings routers, adds broadcast_to_household helper)
  - 01-08-recipes-backend (consumes Recipe/CookingLog/Vote models, mounts /recipes router)
  - 01-09-photo-upload-backend (consumes Recipe model, photo_paths column, broadcast_to_household)
  - All Phase 2/3/4 backend plans

# Tech tracking
tech-stack:
  added:
    - "FastAPI + uvicorn (ASGI app + server)"
    - "SQLAlchemy 2.0 (typed ORM with Mapped[...] declarative)"
    - "Alembic (single baseline migration in alembic/versions/0001_baseline.py)"
    - "psycopg2-binary (Supabase Postgres driver)"
    - "pydantic-settings (env-driven Settings class)"
    - "python-dotenv (local .env loading)"
  patterns:
    - "SQLAlchemy 2.0 declarative models with Mapped[type] annotations and explicit ForeignKey/CHECK constraints — types live in the schema, not just in code"
    - "Single baseline Alembic migration covering all v0.1 tables (no per-feature migrations) — first feature work in 01-04+ extends this baseline"
    - "Bearer token = `secrets.token_urlsafe(32)` (43 char) stored in members.auth_token, validated via FastAPI Depends(current_member)"
    - "CORS allowlist via comma-separated env var (CORS_ALLOWED_ORIGINS) parsed by Settings.cors_origins_list — never CORS '*'"
    - "Dockerfile entrypoint: `alembic upgrade head && exec uvicorn ...` — every Railway deploy applies pending migrations, idempotent for no-op"

key-files:
  created:
    - backend/pyproject.toml (real dependencies)
    - backend/uv.lock
    - backend/Dockerfile (Railway-ready)
    - backend/.env.example (env contract)
    - backend/.dockerignore
    - backend/.gitignore
    - backend/.python-version (3.12)
    - backend/main.py (uvicorn launcher for local dev)
    - backend/app/main.py (FastAPI app + CORSMiddleware + /healthz)
    - backend/app/config.py (pydantic-settings, cors_origins_list)
    - backend/app/db.py (engine + Base + get_db dependency)
    - backend/app/auth.py (current_member dependency, generate_auth_token helper)
    - backend/app/models/base.py (DeclarativeBase)
    - backend/app/models/household.py
    - backend/app/models/member.py (auth_token unique, color_hex CHECK against MEMBER_COLORS)
    - backend/app/models/recipe.py (status enum, source_capture JSONB, photo_paths text[], denormalized last_cooked_at + cook_count)
    - backend/app/models/cooking_log.py
    - backend/app/models/daily_shortlist.py
    - backend/app/models/vote.py
    - backend/app/models/ping.py (throwaway per D-01, marked TODO(productize): D-01)
    - backend/alembic.ini
    - backend/alembic/env.py
    - backend/alembic/script.py.mako
    - backend/alembic/versions/0001_baseline.py (3 enum types + 7 tables + 5 indices + UNIQUE + CHECK)
  modified:
    - backend/app/__init__.py (already created in 01-01; left untouched)
    - backend/app/models/__init__.py (extended to re-export models)

key-decisions:
  - "Bearer token = `secrets.token_urlsafe(32)` (43 char), stored in members.auth_token. No JWT in v0.1 — household-scale, single-issuer, no rotation needed; productize-later if multi-tenant."
  - "Single Alembic baseline (0001_baseline.py) for all v0.1 tables. Subsequent migrations extend; no per-table migration churn during scaffolding."
  - "CORS allowlist is an explicit env-var list (Settings.cors_origins_list), never '*'. Production set to `http://localhost:3000,https://al-dente-pink.vercel.app`."
  - "Dockerfile's ENTRYPOINT runs `alembic upgrade head` before uvicorn — Railway's deploys are idempotent (no-op when DB is current)."
  - "Throwaway `pings` table is part of the baseline migration (per D-01 in CONTEXT.md) — drop migration lands in 01-12 dogfood-cleanup."

patterns-established:
  - "Models match SPEC.md §Data model verbatim — tables, columns, types, constraints, FK cascade rules, indices."
  - "Denormalized fields (recipes.last_cooked_at, recipes.cook_count) are written in the same DB transaction as the cooking_logs insert (pattern lands in 01-08+ when the routers exist)."
  - "Dockerfile entrypoint applies migrations then starts uvicorn — Railway = single rollup deploy, no separate migration job."

requirements-completed: [INFRA-02, INFRA-03]
requirements-partially-completed:
  - "INFRA-06 (bearer auth gates a real route): code is in place (current_member dependency wired into Depends), but no router beyond /healthz is mounted yet, so the protected-route 401 test is deferred to 01-04 once /households/me lands."

# Metrics
duration: 25min
completed: 2026-05-05
---

# Phase 1 Plan 3: Backend Scaffold Summary

**Live FastAPI backend at https://al-dente-production.up.railway.app/ with `/healthz` returning 200, the dev Supabase Postgres holding the SPEC.md §Data-model schema verbatim (7 tables + 3 enums applied via single Alembic baseline migration), bearer-token auth dependency wired but not yet exercised against a router, and an explicit CORS allowlist for the Vercel prod domain + localhost.**

## Performance

- **Duration:** ~25 min (executor 2 tasks + user-driven Supabase project creation + alembic upgrade + Railway deploy)
- **Tasks:** 3 (Tasks 1–2 by executor agent; Task 3 = user-side Supabase migration apply + Railway deploy + smoke verify)
- **Files modified:** 26 created, 1 modified (see key-files)

## Accomplishments

- **FastAPI app live on Railway**: `https://al-dente-production.up.railway.app/healthz` returns `{"status":"ok"}` — verified by orchestrator curl (HTTP 200).
- **Postgres schema applied to dev Supabase**: 3 enum types (`recipe_status`, `log_rating`, `vote_value`) + 7 tables (`households`, `members`, `recipes`, `cooking_logs`, `daily_shortlists`, `votes`, `pings`) + 5 indices + UNIQUE + CHECK constraints. Confirmed by user: `alembic current` printed `0001 (head)` and the Supabase Table Editor shows the tables.
- **Bearer-token middleware**: `app/auth.py::current_member` issues a 401 when `Authorization: Bearer <token>` is missing or unknown, otherwise loads the `Member` row. Wired up but currently only exercised by `Depends(current_member)` from `app/main.py` startup; first end-to-end gate test happens in 01-04 once `/households/me` is mounted.
- **CORS allowlist explicit**: `app/main.py` uses `CORSMiddleware(allow_origins=settings.cors_origins_list, ...)`. Settings parses `CORS_ALLOWED_ORIGINS` env var (comma-separated). Production set to `http://localhost:3000,https://al-dente-pink.vercel.app`. No `"*"` wildcard.
- **Railway Dockerfile**: image runs `alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port $PORT` — every deploy is idempotent.
- **Locked-vocab continuity**: backend models import `from app.models.enums import Cuisine, Mood, Protein, Season` (added by 01-01) and `from app.colors import is_valid_member_color`. No re-definition.
- **Throwaway `pings` table** present in the baseline migration with a `TODO(productize): D-01` marker on the model file — to be dropped in `01-12-dogfood-cleanup` once the W1 round-trip gate has passed.

## Task Commits

Each task was committed atomically (per plan, no TDD):

1. **Task 1: Add deps with uv; build FastAPI app skeleton, db.py, auth.py, config.py, Dockerfile** — `9ef7b74` (feat)
   - `backend/pyproject.toml`, `backend/uv.lock`, `backend/.env.example`, `backend/.dockerignore`, `backend/.gitignore`, `backend/Dockerfile`, `backend/main.py`, `backend/app/main.py`, `backend/app/config.py`, `backend/app/db.py`, `backend/app/auth.py`
2. **Task 2: SQLAlchemy 2.0 models + Alembic baseline migration (incl. throwaway pings)** — `1d78b37` (feat)
   - `backend/alembic.ini`, `backend/alembic/env.py`, `backend/alembic/script.py.mako`, `backend/alembic/versions/0001_baseline.py`, `backend/app/models/__init__.py`, `backend/app/models/{base,household,member,recipe,cooking_log,daily_shortlist,vote,ping}.py`
3. **Task 3 (human-action checkpoint): Apply baseline migration to dev Supabase + deploy backend to Railway** — performed by user; produces no commit (DB state + Railway deploy are external).

_Note: this SUMMARY commit is the plan-completion marker._

## Files Created/Modified

See `key-files.created` in the frontmatter — 26 new files. Highlights:

- `backend/app/main.py` — FastAPI app instantiation, `CORSMiddleware` with `allow_origins=settings.cors_origins_list`, `/healthz` GET endpoint. Routers will be `app.include_router(...)` in 01-04+.
- `backend/app/auth.py` — `generate_auth_token() -> str` returns `secrets.token_urlsafe(32)`. `current_member(authorization: str = Header(None), db: Session = Depends(get_db))` parses `Bearer <token>`, queries `Member.auth_token == token`, raises `HTTPException(401)` on miss.
- `backend/app/db.py` — `engine = create_engine(settings.database_url, ...)`, `Base = DeclarativeBase`, `get_db()` yields a `Session`.
- `backend/app/config.py` — `Settings(pydantic_settings.BaseSettings)` reading `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, `ENVIRONMENT`. `cors_origins_list` property splits on `,` and strips whitespace.
- `backend/app/models/{base,household,member,recipe,cooking_log,daily_shortlist,vote,ping}.py` — 7 models, types verbatim from SPEC.md §Data-model. `Recipe.status` is a Postgres enum, `Recipe.source_capture` is JSONB, `Recipe.photo_paths` is text[], `CookingLog.rating` is a Postgres enum, `Vote.value` is a Postgres enum.
- `backend/alembic/versions/0001_baseline.py` — single migration creating the 3 Postgres enum types, 7 tables, 5 indices, UNIQUE on `members.auth_token`, CHECK on `members.color_hex IN (5 hex strings from app.colors.MEMBER_COLORS)`.
- `backend/Dockerfile` — `python:3.12-slim` base, copies `pyproject.toml` + `uv.lock`, runs `uv sync --frozen --no-dev`, ENTRYPOINT executes `alembic upgrade head` then `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- `backend/.env.example` — declares `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, `ENVIRONMENT` keys; no values.

## Decisions Made

- **Bearer auth, not JWT** — 43-char `secrets.token_urlsafe(32)` token stored in `members.auth_token`, validated by direct DB lookup. v0.1 audience is one household; no rotation, no expiry, no claims-based authz needed. JWT productize-later if we ever support multi-tenant or third-party clients.
- **Single Alembic baseline migration** — every v0.1 table is in `0001_baseline.py`. Avoids the noise of one migration per model during initial scaffolding. Future schema changes (e.g., post-W2 tweaks for LLM capture) extend with `0002_xxx.py` migrations.
- **`pings` table inside the baseline, dropped via 01-12** — encoding the throwaway per D-01 in CONTEXT.md. Inverse migration (`0002_drop_pings.py`) lands in 01-12 dogfood-cleanup once the W1 round-trip gate is approved.
- **Dockerfile applies migrations on every deploy** — Railway's no-downtime model is to run the new container before terminating the old. `alembic upgrade head` is idempotent — no-op when up-to-date — so this is safe to run on every boot.
- **CORS allowlist via env var, not hardcoded** — local dev (`http://localhost:3000`) and prod (`https://al-dente-pink.vercel.app`) live in `CORS_ALLOWED_ORIGINS` so neither is baked into code. Future preview-environment URLs can be added without a redeploy if we choose to allow them.

## Deviations from Plan

None reported by the executor agent in its checkpoint return. Both Task 1 and Task 2 landed exactly as specified.

## Issues Encountered

- `alembic upgrade --sql` (offline DDL render) was used pre-deploy by the executor as a safety check — confirmed the migration emits the expected `CREATE TYPE` and `CREATE TABLE` statements before touching a real DB. Logged in agent's verification output; not a deviation.

## Threat Flags

The plan's threat register entries (T-01-03-01 around plaintext bearer tokens, T-01-03-02 around enum drift between Python str-Enum and Postgres enum types) are partially addressed:

- **T-01-03-01 (plaintext tokens)**: tokens are stored as plaintext in `members.auth_token`. Acceptable for v0.1 (no PII beyond names + recipe data; tokens are device-local). Productize-later: hash + per-token salt.
- **T-01-03-02 (enum drift)**: Postgres enum names + values mirror the Python str-Enum. Drift detection lives in `01-01-shared-vocab` smoke-test (which compared TS values to Python values); a Postgres-side check is deferred — we'll catch drift the first time a model fails to insert.

UI-SPEC.md is unaffected by this plan (no frontend surface).

## User Setup Required

**Done by user during Task 3:**
- Created dev Supabase project (free tier).
- Pulled `DATABASE_URL` from Supabase Dashboard → Project Settings → Database → Connection string (URI), pooling OFF (port 5432).
- Wrote `backend/.env` (gitignored) with `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, `ENVIRONMENT=development`.
- Ran `cd backend && uv run alembic upgrade head` — exited 0; `alembic current` printed `0001 (head)`.
- Verified Supabase Table Editor shows 7 tables and Database → Types shows 3 enum types.
- Created Railway project → "Deploy from GitHub" → root dir set to `backend/`.
- Set Railway env vars: `DATABASE_URL` (same string), `CORS_ALLOWED_ORIGINS=http://localhost:3000,https://al-dente-pink.vercel.app`, `ENVIRONMENT=production`.
- Confirmed Railway deploy succeeded (~2 min); copied prod URL `https://al-dente-production.up.railway.app/`.
- Updated Vercel env vars (`NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_WS_BASE`) and re-deployed Vercel.

**Outstanding (deferred):**
- None within the scope of 01-03. Future plan-internal user actions will be flagged as they arise.

## Next Phase Readiness

Wave 3 (`01-04-onboarding-backend`) can:
- Mount `app/routers/households.py` via `app.include_router(...)` in `app/main.py`.
- Use `Depends(current_member)` from `app.auth` to gate `/households/me`. **This is the first end-to-end test of INFRA-06** — protected route returns 401 without bearer, returns Member otherwise.
- Use `generate_auth_token()` from `app.auth` to issue tokens for newly created/joined members.
- Use `is_valid_member_color()` from `app.colors` (shipped by 01-01) to validate the `color_hex` field on `POST /households/join`.
- Run `alembic upgrade head` is idempotent — no-op since 0001 is already applied.

Wave 4 (`01-05-realtime-and-ping-backend`) can:
- Add `app/routers/ws.py` (WebSocket endpoint at `/ws`) and `app/routers/pings.py` (POST `/pings` + GET `/pings/recent`).
- Add `app/services/realtime.py::broadcast_to_household` helper.
- Insert `Ping` rows via the `Ping` model already shipped here.
- Frontend WS reaches the backend via `wss://al-dente-production.up.railway.app/ws` (env var `NEXT_PUBLIC_WS_BASE` already set on Vercel).

### Deferred verification (NOT confirmed in this plan)

- **INFRA-06 end-to-end (protected route returns 401 without bearer, returns 200 with valid bearer)** — code in `app/auth.py::current_member` is in place, but no router beyond `/healthz` is mounted yet, so there's no protected route to gate. The plan's verify step `curl https://<railway>/recipes` returned 404 (route doesn't exist), not 401 (the auth dependency never runs because routing fails first). Full INFRA-06 test happens in 01-04 once `/households/me` lands.
- **CORS rejection of disallowed origins** — positive case is verified (Vercel prod domain reaches `/healthz`); negative case (random origin → CORS error) was not exercised. Acceptable risk for v0.1; can be tested manually post-01-04.
- **`alembic downgrade base`** round-trip — not tested. Migrations are forward-only in v0.1.

## Self-Check: PASSED

Verified before declaring complete:

- `https://al-dente-production.up.railway.app/healthz` returns 200 `{"status":"ok"}` (orchestrator curl).
- `backend/app/main.py` exists and includes `CORSMiddleware`.
- `backend/app/auth.py::current_member` exists and raises 401 on missing/invalid token.
- `backend/app/db.py` exports `engine`, `Base`, `get_db`.
- All 7 model files exist under `backend/app/models/`; `app/models/__init__.py` re-exports them.
- `backend/alembic/versions/0001_baseline.py` exists and contains the expected `op.create_table(...)` calls for all 7 tables and `op.execute("CREATE TYPE ...")` calls for all 3 enum types.
- `backend/Dockerfile` runs `alembic upgrade head` before uvicorn.
- Commits `9ef7b74` and `1d78b37` reachable from `main`.
- User attestation: dev Supabase migration applied, Railway deploy live (encapsulated by "it's working").

---
*Phase: 01-foundations-w1*
*Completed: 2026-05-05*
