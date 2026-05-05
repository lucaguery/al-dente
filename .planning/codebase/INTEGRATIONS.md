# External Integrations

**Analysis Date:** 2026-05-05

## Current State

**No external integrations are wired up in code yet.** The codebase is in W1 pre-skeleton state: frontend is a fresh `create-next-app` scaffold, backend is a one-line Python stub (`print("Hello from backend!")`).

Per SPEC.md §"First concrete action: deploy the skeleton + ping test," infrastructure wiring (Vercel, Railway, Supabase connection) is a prerequisite, but no SDK/client code is currently integrated.

---

## Intended Integrations (per SPEC.md, not yet implemented)

### APIs & External Services

**Gemini 2.5 Flash (Google AI):**
- Purpose: LLM-powered recipe extraction from voice transcripts, photos, and URLs; voice modification prompts
- SDK: `google-generativeai` Python package (not yet in `backend/pyproject.toml`)
- Auth: Environment variable `GEMINI_API_KEY` (from Google AI Studio)
- Integration point: `backend/app/services/llm.py` (intended)
- Surfaces:
  - `POST /recipes/voice` → prompt `"Extract recipe from transcript: <transcript>"` → return structured JSON
  - `POST /recipes/photo` → multimodal Gemini call with image blobs → return structured JSON
  - `POST /recipes/url` → (optional) fetch HTML + feed to Gemini, or placeholder for manual paste
  - `POST /recipes/{id}/voice-modify` → prompt with original recipe + new transcript → return modifications

---

### Data Storage

**Supabase Postgres:**
- Connection: Environment variable `DATABASE_URL` (Supabase connection string)
- Client: `psycopg2-binary` or async driver (e.g., `asyncpg`) + SQLAlchemy 2.0
- Schema: Defined in SPEC.md §"Data model (Postgres)" with tables:
  - `households`, `members` (auth + invite codes)
  - `recipes`, `cooking_logs` (append-only logs with denormalized cook counts)
  - `daily_shortlists`, `votes` (voting state machine)
- Migrations: Alembic (`backend/alembic/` directory, not yet scaffolded)

**Supabase File Storage:**
- Purpose: Store recipe photos and cooking log photos (≤ 4 per recipe, ≤ 4 per log)
- Client: Supabase Python SDK or direct HTTP signed URLs
- Bucket: Intended structure TBD (e.g., `recipe-photos/{recipe_id}/*`, `log-photos/{log_id}/*`)
- Integration point: `POST /recipes/photo` multipart upload handler

**Supabase Realtime (optional):**
- Purpose: Real-time WebSocket broadcast for recipe creation, status flips, vote updates
- Alternative: Native FastAPI WebSocket server on `WS /ws`
- SPEC.md notes "WebSockets via FastAPI native support, OR Supabase Realtime subscriptions" — choice deferred to implementation

---

### Authentication & Identity

**Custom Bearer Token Auth (Invite Code Onboarding):**
- Approach: Opaque random strings stored in `members.auth_token` column
- No passwords, no email, no OAuth in v0.1
- Flow:
  - Create household: `POST /households` → server generates 6-char invite code + auth tokens for both members
  - Join household: `POST /households/join` with invite code + name + color → server returns auth token
  - All requests: `Authorization: Bearer <auth_token>` header
- Middleware: `backend/app/auth.py` (intended) — `Depends(current_member)` extracts member from token
- Productize-later: Replace with Supabase Auth (magic links); the `auth_token` column abstracts the source

---

### Realtime & WebSockets

**WebSocket Broadcast (Household Events):**
- Purpose: Sync recipe.created, recipe.promoted, vote.created events between two phones in real time (~200ms SLA)
- Implementation: Native FastAPI WebSocket at `WS /ws` (per SPEC.md code example) OR Supabase Realtime subscriptions
- Broadcast helper: `backend/app/services/realtime.py` (intended)
- Events:
  - `recipe.created` — new recipe added (all members receive)
  - `recipe.promoted` — draft → structured status flip (all members receive)
  - `vote.created` — new vote cast (all members receive; clients update voting state machine)
- Client-side: `frontend/lib/ws.ts` (intended) with reconnect-with-backoff logic
- Risk: Railway free tier may restart instances → need `reconnecting-websocket` npm package for resilience

---

### Monitoring & Observability

**Error Tracking:** Not detected (productize-later consideration)

**Logs:**
- Approach: Standard Python logging + FastAPI middleware (not yet implemented)
- Destination: stdout to Railway logs (no external service)

---

### CI/CD & Deployment

**Hosting:**
- **Frontend:** Vercel (auto-deploy from GitHub on push to main)
  - No custom build script needed (Next.js native)
  - Deploy URL: `al-dente.vercel.app` (per SPEC.md §First concrete action)
- **Backend:** Railway (or Fly.io / Render alternative)
  - Container: Dockerfile (not yet scaffolded in `backend/`)
  - Expected startup: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**CI Pipeline:** None detected (productize-later). Intended: GitHub Actions for linting + type checking on PR

**Repository:** Single GitHub monorepo with `frontend/` and `backend/` folders (not yet created)

---

### Environment Configuration

**Secrets Location:**
- Development: `.env` file (not committed, in `.gitignore`)
- Production (Vercel): Environment variables in Vercel project settings
- Production (Railway): Environment variables in Railway service settings

**Required Environment Variables:**

**Frontend** (set in Vercel project):
- `NEXT_PUBLIC_API_BASE` — FastAPI backend URL (e.g., `https://al-dente-api.railway.app`)
- `NEXT_PUBLIC_WS_BASE` — WebSocket server URL (e.g., `wss://al-dente-api.railway.app/ws`)

**Backend** (set in Railway service):
- `DATABASE_URL` — Supabase Postgres connection string (format: `postgresql://user:password@host/dbname`)
- `GEMINI_API_KEY` — Google AI Studio API key for Gemini calls
- `SUPABASE_URL` — Supabase project URL (if using Realtime, unlikely for v0.1)
- `SUPABASE_KEY` — Supabase anon key (if using Realtime)
- `HOUSEHOLD_SHORTLIST_TIME` — (optional) APScheduler time for daily shortlist generation (default: "16:00")

---

### Webhooks & Callbacks

**Incoming:** None detected (not applicable to v0.1)

**Outgoing:** None detected

**Push Notifications** (intended for W3, not yet integrated):
- Service: Web Push API (native browser support)
- Use case: Daily push notification when shortlist is generated
- Client-side: Service Worker subscription (frontend)
- Backend: Python web-push library (not yet added)

---

## Skeleton Deployment Checklist (per SPEC.md)

**To validate the infrastructure without features:**

1. ✗ GitHub repo created (monorepo with `frontend/` and `backend/`)
2. ✗ Vercel project connected → auto-deploy frontend
3. ✗ Railway project created → backend container
4. ✗ Supabase project created → Postgres + file storage
5. ✗ Backend: minimal FastAPI app with `POST /pings`, `GET /pings`, `WS /ws`
6. ✗ Frontend: 2-button page (Add ping / List pings) subscribed to WebSocket
7. ✗ Both phones: Safari → Install to home screen as PWA
8. ✗ Test: Phone A "Add ping" → Phone B list updates via WS within ~500ms

**If this works, all infrastructure is validated. If not, culprits are:**
- Supabase connection (check `DATABASE_URL`)
- CORS in FastAPI (likely needed for Vercel → Railway cross-origin)
- WebSocket on Railway free tier (needs reconnect-with-backoff)
- PWA service worker cache (may need no-cache for API routes)

---

*Integration audit: 2026-05-05*
*Status: Pre-skeleton. No external services currently wired. All integrations are intended per SPEC.md §Stack and build plan.*
