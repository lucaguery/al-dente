# Architecture

**Analysis Date:** 2026-05-19

Snapshot: 2026-05-19

## System Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│             Frontend (PWA on Vercel)                            │
│  `frontend/app/`, React 19 + Next.js 16 App Router             │
│  - Pages: onboarding, home, recipes, cooking-logs, settings     │
│  - Capture/voting UI via shadcn/ui + Tailwind v4 + framer      │
└────────────────────────┬────────────────────────────────────────┘
         │ HTTP (API calls via frontend/proxy.ts rewrites)
         │ WebSocket (long-lived subscription to /ws via partysocket)
         │
┌────────▼─────────────────────────────────────────────────────────┐
│          Backend (FastAPI on Railway)                            │
│  `backend/app/`, Python 3.12 + SQLAlchemy 2.0                   │
│                                                                  │
│  ┌──────────────────┬──────────────────┬──────────────────┐    │
│  │   Routers        │   Services       │   Models         │    │
│  ├──────────────────┼──────────────────┼──────────────────┤    │
│  │ households       │ llm.py           │ household.py     │    │
│  │ recipes          │ algorithm.py     │ member.py        │    │
│  │ votes            │ shortlist.py     │ recipe.py        │    │
│  │ cooking_logs     │ voting.py        │ recipe_turn.py   │    │
│  │ shortlist        │ realtime.py      │ vote.py          │    │
│  │ ws               │ invite_codes.py  │ cooking_log.py   │    │
│  │ auth_session     │ storage.py       │ daily_shortlist  │    │
│  │ push             │                  │                  │    │
│  └──────────────────┴──────────────────┴──────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Core Infrastructure                                      │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ - main.py: FastAPI app + lifespan (APScheduler + cron)  │  │
│  │ - auth.py: cookie/Bearer dual-mode auth + set_auth_cookie │  │
│  │ - db.py: SQLAlchemy engine + SessionLocal factory         │  │
│  │ - config.py: settings from env vars (DATABASE_URL, etc)   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────┬─────────────────────────────────────────────────────────┘
         │
┌────────▼─────────────────────────────────────────────────────────┐
│             Database (Postgres on Supabase)                      │
│  `backend/alembic/versions/` — migrations (SQLAlchemy 2.0)      │
│  - Canonical store: households, members, recipes, votes,         │
│    cooking_logs, daily_shortlists, recipe_turns, push_subscr...  │
│  - Locked enums: recipe_status, vote_value, log_rating           │
└──────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **Households** | Tenant isolation; onboarding create/join; invite codes | `routers/households.py`, `models/household.py` |
| **Members** | Per-household identity; color assignment; auth_token generation | `models/member.py`, `routers/auth_session.py` |
| **Recipes** | Library CRUD; capture surfaces (now thread-based); status lifecycle | `routers/recipes.py`, `models/recipe.py`, `schemas/recipe.py` |
| **Recipe Turns** | Conversation history (text/voice/photo/url/answers); preserved raw inputs | `models/recipe_turn.py`, `schemas/recipe_turn.py` |
| **LLM Service** | Gemini 2.5 Flash promotion; structured extraction; thread processing | `services/llm.py` |
| **Votes** | Per-recipe yes/no voting on daily shortlist; computed vote state | `routers/votes.py`, `services/voting.py` |
| **Daily Shortlist** | Nightly cron job (16:00 household tz) scores recipes via algorithm | `routers/shortlist.py`, `services/shortlist.py`, `services/algorithm.py` |
| **Cooking Logs** | Session tracking; last_cooked_at denormalization; cook_count bump | `routers/cooking_logs.py`, `models/cooking_log.py` |
| **WebSocket Spine** | Household-scoped broadcast registry; realtime event distribution | `routers/ws.py`, `services/realtime.py` |
| **Auth** | Cookie-first + Bearer fallback; token generation; session mgmt | `auth.py`, `routers/auth_session.py` |
| **Frontend (PWA)** | Responsive UI; recipe capture (thread composer); voting deck; cooking banner | `frontend/app/`, `components/` |
| **Realtime (Frontend)** | Singleton WS client; reconnect logic (250ms→5s exp backoff); event subscription | `components/RealtimeProvider.tsx`, `lib/ws.ts` |

## Pattern Overview

**Overall:** Monorepo (frontend + backend) with shared Postgres database; **backend owns all mutations**, frontend is read + vote interface.

**Key Characteristics:**
- **Cross-household isolation:** Every query filters by `member.household_id` (derived from auth token / cookie)
- **Async server-side promotion:** Recipe capture (voice/photo/url) returns `draft` immediately; BackgroundTask runs Gemini promotion in the background
- **Realtime sync via WebSocket:** All household-affecting mutations broadcast via `services/realtime.broadcast_to_household`
- **Computed voting state:** No `state` column stored; state (Validé/Pressenti/Contesté/Rejeté/Sans avis) derived on read from `votes` table rows
- **Denormalized timestamps:** `recipes.last_cooked_at` and `recipes.cook_count` updated atomically with `cooking_logs` insert (invariant #3)
- **Raw inputs preserved forever:** `recipe_turns` table stores original transcript/URL/photo_paths; enables re-promotion with better LLM model
- **Single uvicorn worker:** APScheduler runs in-process (one cron per household); multiple workers would duplicate jobs

## Layers

**Frontend (PWA):**
- **Purpose:** Mobile-optimized decision + capture interface for two household members
- **Location:** `frontend/`
- **Contains:** 
  - App Router pages: `app/onboarding/`, `app/recipes/`, `app/cooking-logs/`, `app/settings/`
  - React components: `components/HomeDecide.tsx` (voting deck), `RecipeForm.tsx` (capture), `RecipeThread/` (thread UI)
  - shadcn/ui: `components/ui/` (button, card, dialog, select, etc.)
  - Utilities: `lib/api.ts` (fetch wrapper), `lib/ws.ts` (WebSocket client), `lib/recipes.ts` (types)
  - i18n: `next-intl` + `lib/i18n/fr.json`
- **Depends on:** Backend HTTP endpoints, WebSocket `/ws` for realtime sync
- **Used by:** Two household members on iPhones (Safari → Add to Home Screen PWA installation)

**Backend API Layer (FastAPI):**
- **Purpose:** HTTP/WebSocket adapter; request validation; auth gate; response serialization
- **Location:** `backend/app/routers/`
- **Contains:** 
  - `households.py`: onboarding POST/join, GET /me (session introspection)
  - `recipes.py`: CRUD; thread-based capture (POST blank draft, POST turns)
  - `votes.py`: cast vote (upsert + recompute state)
  - `cooking_logs.py`: start cooking, active session lookup
  - `shortlist.py`: GET today, POST regenerate
  - `ws.py`: WebSocket upgrade + auth + frame fan-out
  - `auth_session.py`: login, logout, cookie refresh
  - `push.py`: push subscription register
- **Depends on:** Database, services
- **Used by:** Frontend via HTTP + WebSocket

**Backend Services Layer (Business Logic):**
- **Purpose:** Domain logic; orchestration; external API calls; state computation
- **Location:** `backend/app/services/`
- **Contains:**
  - `llm.py`: Gemini 2.5 Flash calls (extraction, multimodal, voice modification, thread processing)
  - `algorithm.py`: Pure scoring function (no DB access); diversification for top 5
  - `shortlist.py`: Nightly cron logic; generate_daily_shortlist task
  - `voting.py`: compute_vote_state (derives final state from vote rows)
  - `realtime.py`: RealtimeRegistry (in-process household-scoped broadcast)
  - `invite_codes.py`: Generate/validate 6-char codes
  - `storage.py`: Supabase Storage upload (photo_paths, extracted_html_path)
  - `push.py`: Web Push API subscription handling
- **Depends on:** Database, Gemini SDK, httpx
- **Used by:** Routers (via BackgroundTasks), cron jobs

**Data Layer (SQLAlchemy 2.0 ORM):**
- **Purpose:** Postgres interaction; query building; transaction management
- **Location:** `backend/app/models/`, `backend/app/schemas/`
- **Contains:**
  - Models (ORM classes): `household.py`, `member.py`, `recipe.py`, `recipe_turn.py`, `vote.py`, `cooking_log.py`, `daily_shortlist.py`, `push_subscription.py`
  - Schemas (Pydantic v2): Input/output shapes for every router (validation + serialization)
  - Enums: `models/enums.py` (locked vocabularies: Cuisine, Mood, Protein, Season, Difficulty)
- **Depends on:** Postgres (Supabase)
- **Used by:** Services and routers

**Postgres Database (Supabase):**
- **Purpose:** Canonical store for all application state
- **Location:** Supabase (managed Postgres); migrations in `backend/alembic/versions/`
- **Contains:** 
  - Tables: households, members, recipes, recipe_turns, votes, daily_shortlists, cooking_logs, push_subscriptions
  - Enums: recipe_status, vote_value, log_rating
  - Indexes: (household_id, status), (household_id, last_cooked_at), (shortlist_id), (recipe_id)
- **Constraints:** Foreign keys (cascade delete on household), unique invite_code, unique (shortlist_id, recipe_id, member_id) on votes

## Data Flow

### Recipe Capture → Promotion → Broadcast

1. **Frontend user initiates:** `POST /recipes` (blank draft) or `POST /recipes/{id}/turns` (conversation turn)
   - File: `frontend/components/RecipeForm.tsx`, `frontend/components/RecipeThread/Composer.tsx`
2. **Backend creates:** Recipe row with status `draft` (or turns appended to existing draft)
   - File: `backend/app/routers/recipes.py` (POST /recipes, POST /recipes/{id}/turns)
   - Returns immediately; frontend gets optimistic UI
3. **Backend queues BackgroundTask:** `promote_draft(recipe_id)` via `BackgroundTasks.add_task`
   - File: `backend/app/routers/recipes.py` (lines ~150-170)
4. **LLM Service runs:** Opens fresh `SessionLocal()`; reads recipe_turns[0]; calls Gemini via `services/llm.promote_draft`
   - File: `backend/app/services/llm.py` (promote_draft, extract_from_*, process_thread_turn)
   - Parses structured output; populates title, ingredients, steps, cuisine, mood, prep_time_minutes, etc.
5. **Database update:** Recipe status → `structured` (on success) or `failed` (on error)
   - File: `backend/app/services/llm.py` (_apply_success_promotion, _record_failure)
6. **WebSocket broadcast:** On success, emits `recipe.promoted` frame to all connected household members
   - File: `backend/app/services/realtime.broadcast_to_household("recipe.promoted", {...})`
   - Line: ~65 in services/llm.py
7. **Frontend receives:** React Context listener in `RealtimeProvider.tsx` updates local state
   - File: `frontend/components/RealtimeProvider.tsx`, `frontend/lib/ws.ts`
   - Recipe list re-renders, showing promoted fields (ingredients, steps, cuisine, mood, etc.)

### Daily Shortlist Generation

1. **APScheduler cron fires:** 16:00 per-household timezone
   - File: `backend/app/main.py` (lifespan: registered in line ~71-78)
2. **Shortlist service runs:** `generate_daily_shortlist(household_id)`
   - File: `backend/app/services/shortlist.generate_daily_shortlist`
3. **Fetch recipe pool:** All recipes with status `structured` or `verified` for the household
4. **Build scoring context:** Current season, recent cuisines/proteins (last 14 days from cooking_logs)
5. **Score + diversify:** Call `services/algorithm.score_recipe` and `select_top5_with_diversity`
   - File: `backend/app/services/algorithm.py`
6. **Insert DailyShortlist row:** Ranked recipe_ids (≤5), filters (nil unless regenerate)
7. **Broadcast `shortlist.created`:** WebSocket event to all household members
   - File: `backend/app/services/realtime.broadcast_to_household("shortlist.created", {...})`
8. **Frontend subscribes:** `RealtimeProvider` listener; state update triggers re-render
   - Vote summary, shortlist cards shown on Home tab

### Voting Flow

1. **Frontend user votes:** `POST /shortlists/{shortlist_id}/recipes/{recipe_id}/vote` (yes/no)
   - File: `frontend/components/ShortlistCard.tsx` (vote button click)
2. **Backend upserts:** PostgreSQL `INSERT ... ON CONFLICT DO UPDATE` on (shortlist_id, recipe_id, member_id)
   - File: `backend/app/routers/votes.py` (lines ~55-69)
3. **Recompute state:** Query all votes for (shortlist, recipe); call `compute_vote_state`
   - File: `backend/app/services/voting.compute_vote_state` (derives Validé/Pressenti/Contesté/Rejeté/Sans avis)
4. **Broadcast `vote.created`:** WebSocket frame with updated state
5. **Frontend updates:** Table-à-manger voting summary (state badges) refresh in real-time
   - File: `frontend/components/VoteSummary.tsx`

### Cooking Initiated

1. **Frontend user taps "Je cuisine":** `POST /cooking_logs` (start cooking)
   - File: `frontend/components/CookingBanner.tsx`
2. **Backend creates:** CookingLog row; atomically updates `recipes.last_cooked_at` + `recipes.cook_count`
   - File: `backend/app/routers/cooking_logs.py` (POST route)
3. **Broadcast `cooking.started`:** WebSocket event to all members
4. **Frontend syncs:** Cooking banner appears; veto window closed (vote affordance disabled)
   - File: `frontend/components/CookingBanner.tsx`

### Authentication (Cookie-First)

1. **User onboards:** `POST /households` or `POST /households/join`
   - Returns `auth_token` (opaque base64url); backend sets `aldente_auth` HttpOnly cookie
   - File: `backend/app/routers/households.py` (create_household, join_household)
2. **Subsequent requests:** Browser auto-attaches `aldente_auth` cookie (same-origin)
   - File: `backend/app/auth.py` (_extract_token: cookie wins over Bearer header)
3. **WebSocket upgrade:** Same cookie auto-attached to WS upgrade request
   - File: `frontend/lib/ws.ts` (buildWsUrl: no explicit token parameter needed)
4. **Logout:** `DELETE /api/auth/session` clears cookie server-side; frontend redirects to onboarding
   - File: `backend/app/routers/auth_session.py` (DELETE /logout)

**State Management:**
- **Frontend:** React Context (SessionProvider, RealtimeProvider) holds singleton auth + WebSocket client; useSyncExternalStore prevents double-subscribe
- **Backend:** Postgres is single source of truth; no in-memory cache
- **WebSocket:** In-process RealtimeRegistry (Dict[household_id → Set[WebSocket]]); single-worker assumption

## Key Abstractions

**Household:**
- **Purpose:** Isolation boundary for two members and their shared recipe library
- **Examples:** `models/household.py`, `routers/households.py`
- **Pattern:** Every query filters by `WHERE household_id = :hh_id` derived from `member.household_id`; cross-household leaks prevented by 404 on detail not found (no 403)

**Recipe Lifecycle (Status Enum):**
- **Purpose:** Track capture fidelity; control shortlist eligibility; signal errors
- **Enum:** `draft` → `structured` → `verified` (future), or `draft` → `failed` (on LLM error)
- **Pattern:** Only `structured` or `verified` recipes appear in shortlist candidate pool (hard filter in algorithm.py); frontend filters by status when displaying library

**Recipe Turns (Phase 25+):**
- **Purpose:** Preserve original input verbatim (transcript, URL, photo_paths, structured answers); enable re-promotion with new model; conversation history thread
- **Examples:** `models/recipe_turn.py`, `routers/recipes.py` (POST /recipes/{id}/turns)
- **Pattern:** First user turn (position=0) stores immutable capture payload; LLM turns (position≥1) store extracted/processed output; structured answers (answer fields) store user confirmations

**Vote Derivation (Never Stored):**
- **Purpose:** Single source of truth is rows in `votes` table; no dual-write corruption risk
- **Pattern:** `compute_vote_state(votes_for_recipe, member_count)` queries votes and returns enum (Validé=both yes, Pressenti=one yes one no, Contesté/Rejeté/Sans avis)
- **Rationale:** Voting state depends on household size and member positions; derivation avoids out-of-sync state

**Denormalized Timestamps:**
- **Purpose:** Enable efficient "last cooked" sorting without subquery or window function
- **Pattern:** `recipes.last_cooked_at` and `recipes.cook_count` updated in same transaction as `cooking_logs` INSERT
- **Constraint:** Must be atomic; never update one without the other (invariant #3)

**Source Capture JSONB:**
- **Purpose:** Store original user input (transcript, URL, photo paths, manually entered values) so Gemini prompt can be re-run later
- **Examples:** `{ type: 'voice', payload: { transcript: '...' } }`, `{ type: 'url', payload: { url: '...' } }`
- **Pattern:** Never discard raw input; production-ready productize-later path includes LLM prompt versioning

## Entry Points

**Frontend PWA (Next.js):**
- **Location:** `frontend/app/page.tsx` (Home / Shortlist tab)
- **Triggers:** User opens app URL in Safari or taps home-screen PWA icon
- **Responsibilities:** 
  - Render root layout with fonts, theme colors, viewport config, safe-area insets
  - Mount RealtimeProvider + SessionProvider (singleton WebSocket + auth context)
  - Mount OnboardingGuard (redirects to /onboarding if !authenticated)
  - Render page content within BottomNav (tabbed navigation: Home, Recipes, Cooking, Settings)

**Backend API Root (FastAPI):**
- **Location:** `backend/app/main.py` (FastAPI app instantiation)
- **Triggers:** Frontend HTTP requests + WebSocket upgrades
- **Responsibilities:**
  - Register routers (households, recipes, votes, cooking_logs, shortlist, ws, etc.)
  - CORS middleware (allow_origins, allow_credentials for cross-origin cookie)
  - Lifespan: APScheduler startup (register cron jobs), Supabase Storage bucket ensure_exists
  - Health check: GET /healthz (unauthenticated, used by Railway)

**Recipe Capture Entry (Multi-Surface):**
- **Location:** `frontend/components/RecipeForm.tsx` (manual entry), `frontend/components/RecipeThread/Composer.tsx` (thread bubbles)
- **Triggers:** User submits form, voice input, photo upload, or URL paste
- **API Contract:** POST /recipes (blank draft), then POST /recipes/{id}/turns (conversational turns), then POST /recipes/{id}/promote (coalescing trigger)
- **Responsible For:**
  - Create draft with status `draft`
  - Append turns (user voice/text/photo/url)
  - Queue Gemini promotion BackgroundTask
  - Broadcast realtime updates

**WebSocket Spine (Realtime Sync):**
- **Location:** `backend/app/routers/ws.py` (WebSocket route handler)
- **Triggers:** Browser opens WebSocket to `wss://api.aldente.app/ws` or direct Railway URL
- **Responsibilities:**
  - Extract member_id from auth cookie/token
  - Register WebSocket in RealtimeRegistry[household_id]
  - Fan-out all mutation broadcasts to connected peers
  - Unregister on close

**Daily Shortlist Cron (APScheduler):**
- **Location:** `backend/app/services/shortlist.generate_daily_shortlist`
- **Triggers:** 16:00 per-household timezone (registered in main.py lifespan)
- **Responsibilities:**
  - Score all structured/verified recipes
  - Select top 5 with diversity
  - Insert DailyShortlist row
  - Broadcast `shortlist.created` event

## Architectural Constraints

- **Threading:** Single uvicorn worker (APScheduler runs in-process; multiple workers → duplicate cron jobs)
- **Global state:** Module-level `scheduler` singleton in `main.py`; RealtimeRegistry singleton in `services/realtime.py`; clientSingleton in `frontend/components/RealtimeProvider.tsx`
- **Circular imports:** Auth module (`app.auth`) imports Member model lazily in `current_member` function to avoid circular dependency during Alembic initialization
- **Cross-origin WebSocket:** Frontend tries direct Railway URL first (Vercel function timeout workaround), falls back to same-origin Vercel rewrite
- **Async I/O:** Backend uses sync engine (psycopg2) + sync SQLAlchemy; no asyncio overhead justified for couple-scale workload
- **Single-process scheduler:** APScheduler in-process; productize-later: switch to external APScheduler daemon or Celery for multi-worker scaling

## Error Handling

**Strategy:** Fail-safe with logging; never crash the process.

**Patterns:**
- **LLM promotion failure:** Exceptions caught in BackgroundTask; recorded on recipe.promotion_error field; frontend shows error badge; no broadcast
- **WebSocket dead socket:** Unregistered immediately; broadcast continues for remaining peers (no raise-on-failure)
- **Auth failure:** 401 Unauthorized on missing/invalid token; frontend redirects to onboarding
- **Cross-household access:** 404 Not Found (not 403 Forbidden) to avoid leaking existence
- **Database constraint violations:** 400 Bad Request (e.g., recipe not in shortlist), 409 Conflict (e.g., color taken on join), 422 Unprocessable Entity (household_full)
- **Startup failures:** Logged as warnings; continue (scheduler may fail to register cron; bucket may not exist; both are productize-later)

## Cross-Cutting Concerns

**Logging:** Python stdlib logging + FastAPI uvicorn handler; no structured logging in v0.1 (productize-later)

**Validation:** Pydantic v2 models in `schemas/` validate all inputs; FastAPI returns 422 on schema mismatch

**Authentication:** Dual-mode (cookie-first, Bearer fallback); validated on every request via `Depends(current_member)` FastAPI dependency

**Realtime Sync:** WebSocket broadcast contract (D-05, D-29) locked in phase plans; frame format `{ type: <event_type>, payload: {...} }` immutable

**CORS:** Explicit allowlist (no wildcard); credentials=True for local dev cross-origin (Vercel rewrite makes production same-origin)

**Transactions:** SQLAlchemy autocommit=False; routers explicitly call db.commit(); BackgroundTasks open fresh SessionLocal() to avoid use-after-close

---

*Architecture analysis: 2026-05-19*
