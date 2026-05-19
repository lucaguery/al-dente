# External Integrations

**Analysis Date:** 2026-05-19
Snapshot: 2026-05-19

## APIs & External Services

**AI / LLM:**
- Google Gemini — recipe extraction, structuring, rewriting across all five capture surfaces (quick, full-form, voice, photo, URL)
  - SDK: `google-genai >=1.75` (`backend/app/services/llm.py`)
  - Import: `from google import genai` (NOT the legacy `google-generativeai` package)
  - Auth: `GEMINI_API_KEY` env var (loaded in `backend/app/config.py`)
  - Usage: all promotion `BackgroundTask` paths; largest service file at 59 KB

## Data Storage

**Databases:**
- Supabase Postgres — primary relational store for all app data
  - Connection: `DATABASE_URL` env var (psycopg2-binary driver)
  - Client: SQLAlchemy 2.0 ORM (`backend/app/models/`), Alembic migrations (`backend/alembic/versions/`)
  - Test override: `DATABASE_URL_TEST` env var (set when `ENVIRONMENT=test`)

**File Storage:**
- Supabase Storage — photo uploads; bucket name `recipe-photos`
  - Client: `supabase >=2.0` Python SDK (`backend/app/services/storage.py`)
  - Auth: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env vars
  - Upload path: backend-mediated only (no presigned PUT URLs to frontend); service-role key never in frontend bundle
  - Path pattern: `{household_id}/{recipe_id}/{uuid4}.{ext}`
  - Signed URL TTL: 86400s (24 h) — covers overnight PWA suspend
  - Size cap: 8 MiB hard limit enforced in router before storage write
  - Fallback in test env: Storage not configured; `useSignedPhotoUrl` falls back to `/demo-fixtures/{cuisine}.svg`

**Caching:**
- None — no Redis or in-memory cache layer

## Authentication & Identity

**Auth Approach:**
- HttpOnly cookie `aldente_auth` — set by FastAPI, read server-side; NOT Bearer tokens in `localStorage`
  - Rationale: iOS Safari evicts `localStorage` on PWA force-quit
  - Implementation: `backend/app/routers/auth_session.py`; cookie flows through Next.js API rewrites (`frontend/proxy.ts`) so it is same-origin in production

**Invite Codes:**
- Household join via invite codes — `backend/app/services/invite_codes.py`; no third-party identity provider

## Realtime & WebSockets

**WebSocket (backend):**
- FastAPI native WebSocket router — `backend/app/routers/ws.py`
- Broadcast helper: `backend/app/services/realtime.broadcast_to_household` — all household-affecting mutations call this
- Events: `recipe.created`, `recipe.promoted`, `recipe.updated`, `turn.created`, `turn.updated`, `vote.created`, `cooking_log.*`, etc.

**WebSocket (frontend):**
- `partysocket ^1.1.18` client — `frontend/components/RealtimeProvider.tsx`
- WS URL resolved via `frontend/app/ws-config/route.ts`

## Web Push Notifications

**Provider:** Browser Push API (standard W3C); VAPID self-signed
- Backend library: `pywebpush >=2.3` + `py-vapid >=1.9` (`backend/app/services/push.py`)
- Auth: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` env vars
- Fan-out: per-household broadcast; stale subscriptions (HTTP 404/410) auto-deleted
- Frontend subscription management: `frontend/app/settings/page.tsx`
- Push router: `backend/app/routers/push.py`

## Monitoring & Observability

**Error Tracking:**
- None detected — no Sentry, Datadog, or equivalent SDK present

**Logs:**
- Python `logging` stdlib throughout backend (`log = logging.getLogger(__name__)` pattern)
- Frontend: console only

## CI/CD & Deployment

**Frontend Hosting:**
- Vercel (free tier)
- Trigger: push to `main` branch auto-deploys (~60s)
- Never use: `vercel --prod` or manual Vercel CLI

**Backend Hosting:**
- Railway (~$5/mo)
- Trigger: push to `main` branch auto-deploys (~60s)
- Pre-start hook: `alembic upgrade head` runs before uvicorn restart on each deploy
- Single uvicorn worker required — APScheduler runs in-process (multi-worker would create duplicate cron jobs)
- Never use: manual Railway CLI deploys

**CI Pipeline:**
- None detected — no GitHub Actions, CircleCI, or equivalent configured

## Scheduled Jobs

**APScheduler (in-process):**
- `AsyncIOScheduler` singleton — `backend/app/main.py` (module-level, started in lifespan)
- One `CronTrigger` per household at 16:00 household timezone — generates daily shortlist (`backend/app/services/shortlist.py`)
- New households created post-startup must call `scheduler.add_job(...)` from their POST handler

## Environment Configuration

**Required backend env vars:**
- `DATABASE_URL` — Supabase Postgres connection string
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key (backend only, never frontend)
- `GEMINI_API_KEY` — Google Gemini API key
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` — Web Push VAPID credentials

**Optional backend env vars:**
- `DATABASE_URL_TEST` — test DB override (used when `ENVIRONMENT=test`)
- `CORS_ALLOWED_ORIGINS` — comma-separated origins (default: `http://localhost:3000`)
- `ENVIRONMENT` — `development` / `test` / `production`

**Secrets location:**
- Backend `.env` file (gitignored); loaded by `pydantic-settings` in `backend/app/config.py`
- Service-role key lives only in backend environment — never shipped in any frontend bundle

## Webhooks & Callbacks

**Incoming:**
- None detected — no Stripe, Twilio, or other inbound webhook endpoints

**Outgoing:**
- Web Push to browser endpoints (VAPID) via `backend/app/services/push.py`
- Gemini API calls (outbound HTTP) via `backend/app/services/llm.py`

---

*Integration audit: 2026-05-19*
