# Architecture

**Analysis Date:** 2026-05-05

**Current State:** W1 / pre-skeleton. Frontend is a fresh `create-next-app` scaffold. Backend is a Python stub with no FastAPI wiring. Only the deployment structure and basic configuration are in place; application logic is not yet implemented.

## Pattern Overview

**Overall:** Monorepo with two independently deployable applications

**Key Characteristics:**
- **Decoupled frontend and backend:** `frontend/` → Vercel PWA (Next.js), `backend/` → Railway FastAPI server
- **Shared Postgres database:** Supabase-hosted, accessed by both apps
- **Single source of truth for data:** Backend owns all mutations; frontend is read + vote interface
- **Async server-side promotion pipeline:** Recipe capture returns draft immediately; background job promotes to structured (see Capture pipeline below)
- **Realtime sync via WebSocket:** Recipe and vote mutations broadcast to connected household members

## Layers

**Frontend (PWA):**
- **Purpose:** Mobile-optimized vote interface + recipe capture surfaces
- **Location:** `frontend/`
- **Contains:** React Server Components (App Router), Tailwind styling, PWA manifest, Web Speech API integration, camera capture
- **Depends on:** Backend API endpoints (`POST /recipes/*`, `GET /shortlist`), WebSocket stream for real-time updates
- **Used by:** Two household members on iPhones (Safari→Add to Home Screen installation)

**Backend (API + Services):**
- **Purpose:** Recipe lifecycle management, voting state computation, LLM integration, shortlist generation
- **Location:** `backend/` (not yet wired; only stub in `main.py`)
- **Contains:** FastAPI routers (`households`, `recipes`, `cooking`, `shortlist`, `ws`), SQLAlchemy models, Gemini LLM service, APScheduler daily job, realtime broadcast helper
- **Depends on:** Supabase Postgres (via SQLAlchemy ORM + Alembic migrations), Gemini 2.5 Flash API, database transaction isolation
- **Used by:** Frontend via HTTP + WebSocket; internal services (daily shortlist cron)

**Database (Postgres on Supabase):**
- **Purpose:** Canonical store for households, members, recipes, votes, cooking logs, daily shortlists
- **Location:** Supabase (managed service; migrations live in `backend/`)
- **Contains:** 8 tables + 3 PostgreSQL enums (see SPEC.md §Data model)
- **Schema constraints:** Foreign keys, unique invite codes, recipe status states, vote enums
- **Denormalized fields:** `recipes.last_cooked_at`, `recipes.cook_count` updated in same transaction as `cooking_logs` insert

## Data Flow

**Recipe Capture (Five Surfaces):**

1. Frontend user calls `POST /recipes/<surface>` (one of: `quick`, full-form, `voice`, `photo`, `url`) with raw capture data
2. Backend creates a `Recipe` row with status `draft` and `source_capture` JSONB (immutable snapshot of input)
3. Backend returns draft immediately to unblock UI
4. Backend adds `BackgroundTask` to promote draft → `structured` (for voice/photo surfaces) or `structured` immediately (for full manual form)
5. Promotion runs Gemini 2.5 Flash with structured output parsing → populates `title`, `ingredients`, `steps`, `cuisine`, `mood`, `main_protein`, `prep_time_minutes`, `servings`
6. On promotion success, backend broadcasts `recipe.created` event over WebSocket to all connected members in household
7. Frontend receives event and refreshes recipe list

**Daily Shortlist + Voting:**

1. APScheduler runs at midnight (per household) to compute top 5 recipes via scoring algorithm (`services/algorithm.py`)
2. Backend inserts row in `daily_shortlists` with ranked `recipe_ids`
3. Both members see shortlist in "Today's Candidates" screen
4. Each member casts `POST /votes` (yes/no) for each recipe
5. Each vote inserts row in `votes` table; broadcasted to household
6. Vote state (Validé/Pressenti/Contesté/Rejeté/Sans avis) is *computed on read* from vote rows, not stored
7. Veto window closes on first `POST /cooking_logs` for the day (CookingLog insert updates `recipes.last_cooked_at` and `recipes.cook_count`)

**State Management:**

- **Frontend:** React state for current page (shortlist, voting, recipe detail), polling/WebSocket subscription for realtime updates
- **Backend:** Postgres as single source of truth; no in-memory cache (simplicity for v0.1)
- **Authentication:** Bearer token (invite-code-derived, stored in `members.auth_token`); validated on every request via `Depends(current_member)`

## Key Abstractions

**Household:**
- Purpose: Isolation boundary for two members and their shared recipe library
- Examples: `households` table, `members.household_id` foreign key
- Pattern: All queries filtered by `household_id` to prevent cross-household data leaks

**Recipe Lifecycle (Status Enum):**
- `draft` → `structured` → `verified` (future: user-driven verification)
- Purpose: Track capture fidelity; avoid promoting partial data
- Pattern: Mutations update status; frontend filters by status on display

**Source Capture (JSONB):**
- Purpose: Preserve original input so LLM prompts can be re-run or audited
- Stored as `{ type: 'voice'|'photo'|'url'|'manual', payload: {...} }` in `recipes.source_capture`
- Pattern: Never discard raw input; allow recipe re-promotion on LLM model upgrade

**Vote Derivation:**
- Purpose: Single source of truth is rows in `votes` table; no computed column
- Pattern: `compute_vote_state(shortlist_id, recipe_id)` queries votes and returns enum (Validé/Pressenti/Contesté/Rejeté/Sans avis)
- Rationale: Voting state depends on household size + member positions; derivation is cleaner than dual-write

## Entry Points

**Frontend PWA:**
- **Location:** `frontend/app/page.tsx`
- **Triggers:** User opens app URL or taps home-screen icon
- **Responsibilities:** Render root layout + navigation frame; mount shortlist or recipe detail screens

**Backend HTTP:**
- **Location:** `backend/app/main.py` (not yet created; will contain FastAPI app instantiation)
- **Triggers:** Frontend HTTP requests (`POST /recipes/voice`, `GET /shortlist`, etc.) + external WebSocket connections
- **Responsibilities:** Route requests to routers (`households`, `recipes`, `cooking`, `shortlist`, `ws`); validate auth token; execute service logic

**Daily Shortlist Cron:**
- **Location:** `backend/services/shortlist.py` (APScheduler job, not yet wired)
- **Triggers:** Midnight UTC (or configurable TZ per household)
- **Responsibilities:** Fetch recipes for household, run scoring algorithm, upsert `daily_shortlists` row, broadcast event

## Error Handling

**Strategy:** Explicit error responses; frontend shows user-friendly fallback UI

**Patterns:**
- **Missing auth:** `401 Unauthorized` (invalid or expired token)
- **Household mismatch:** `403 Forbidden` (member token doesn't belong to household in request path)
- **LLM failure:** Backend logs error, keeps recipe in `draft` status, frontend shows "Retrying..." UI; user can manually fill form to promote to `structured`
- **Database conflict:** `409 Conflict` on unique constraint (e.g., duplicate invite code); frontend prompts user to regenerate
- **Validation error:** `422 Unprocessable Entity` (Pydantic validation failure); frontend displays validation message

## Cross-Cutting Concerns

**Logging:**
- Pattern: Backend logs all LLM calls (prompt + tokens used), database transaction markers, WebSocket connect/disconnect events
- Rationale: Understand model drift and debug realtime sync issues

**Validation:**
- Frontend: React hook form validation before `POST`
- Backend: Pydantic models (`recipes.VoiceSourceRequest`, `votes.VoteRequest`, etc.) validate all inputs; database triggers enforce enum constraints

**Authentication:**
- Invite-code-based: User creates household, receives unique 6-char code, shares with partner
- Partner uses code to join → backend generates unique `auth_token` and returns it
- Token stored in device secure storage (Safari → Web Storage or local filesystem for PWA)
- All requests include `Authorization: Bearer <token>` header; middleware validates + loads `member` object

**Localization:**
- French only in v0.1
- All strings via `next-intl` from day one (config not yet in place; scaffold structure only)
- Backend returns enums + structured data; frontend renders translated labels client-side

---

## Intended (per SPEC.md, not yet implemented)

SPEC.md describes the following components that are **not currently wired into code**:

- **FastAPI app** with routers for `households`, `recipes`, `cooking`, `shortlist`, `ws`
- **SQLAlchemy models** + **Alembic migrations** (schema exists in SPEC.md but no migration files)
- **Pydantic request/response types** for recipe capture surfaces
- **`google-generativeai` integration** (`services/llm.py`) for structured data extraction
- **Scoring algorithm** (`services/algorithm.py`) for recipe ranking
- **APScheduler cron job** (`services/shortlist.py`) for daily shortlist generation
- **WebSocket broadcast helper** (`services/realtime.py`) for household sync
- **next-intl configuration** on frontend
- **next-pwa plugin** for service worker + manifest
- **Framer Motion** for voting swipe-deck UX

These are the high-priority scaffolding tasks for W1 gate (skeleton deployment + ping test on Vercel + Railway + Supabase + WebSocket round-trip).

*Architecture analysis: 2026-05-05*
