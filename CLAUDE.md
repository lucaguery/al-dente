# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Source of truth

**`SPEC.md` at the repo root is the primary specification** — it is the output of a `/grill-me` session and contains the locked data model, capture pipeline, scoring algorithm, voting state machine, auth scheme, and 4-wave build plan. Read it before designing any feature. The "Definition of v0.1 done" is *behavioral* (≥2 weeks of daily use by both household members at end of W4), not a feature checklist.

The repo is in **W1 / pre-skeleton** state: frontend is a fresh `create-next-app` scaffold, backend is a stub (`print("Hello from backend!")`) with no FastAPI/SQLAlchemy/Gemini wiring yet. SPEC.md's "First concrete action: deploy the skeleton + ping test" (Vercel + Railway + Supabase + WebSocket round-trip on both phones) is the gate before any feature work.

## Repo layout

Monorepo with two independently deployable apps:

- `frontend/` — Next.js PWA → Vercel
- `backend/` — FastAPI → Railway (not yet scaffolded)
- Shared Postgres on Supabase

Frontend and backend share **locked vocabularies** (enums for Season, Cuisine, Mood, Protein) defined in SPEC.md §"Locked vocabularies". When adding values, update **both** `frontend/lib/enums.ts` and the Python `Enum` classes in the same change — drift between the two is a category of bug to avoid.

## Frontend (`frontend/`)

### Stack

Versions are pinned in SPEC.md §Stack and `frontend/package.json` (authoritative). The frontend has its own `frontend/CLAUDE.md` → `frontend/AGENTS.md` with a critical warning: **this Next.js may have breaking changes that aren't in your training data** — consult `frontend/node_modules/next/dist/docs/` for current APIs before writing frontend code, and heed deprecation notices.

### Commands (run from `frontend/`)

| Task | Command |
|---|---|
| Dev server | `npm run dev` (http://localhost:3000) |
| Production build | `npm run build` |
| Start production | `npm start` |
| Lint | `npm run lint` |

No test runner is configured yet. Path alias `@/*` → `frontend/*` is set in `tsconfig.json`.

## Backend (`backend/`)

Currently a **stub**: `pyproject.toml` has no dependencies, `main.py` is a hello-world. `.python-version` pins Python 3.12 and the project uses **`uv`** (uv-style pyproject). No tests, no migrations, no FastAPI app yet.

Per SPEC.md the backend will provide:

- FastAPI app at `app/main.py` with routers `households`, `recipes`, `cooking`, `shortlist`, `ws`
- Bearer-token auth via `Authorization: Bearer <auth_token>` (invite-code-derived, see SPEC.md §Onboarding) — no OAuth in v0.1
- SQLAlchemy 2.0 models + Alembic migrations against Supabase Postgres
- `services/llm.py` (Gemini 2.5 Flash via `google-generativeai`), `services/algorithm.py` (pure scoring), `services/shortlist.py` (APScheduler daily job), `services/realtime.py` (WS broadcast)
- FastAPI `BackgroundTasks` for the **draft → structured promotion** pipeline (see SPEC.md §Capture pipeline)

When wiring this up, follow the staging in SPEC.md's W1–W4 build plan rather than implementing the full surface area at once.

## Architecture invariants worth knowing

These cross multiple files and are easy to get wrong:

1. **Five capture surfaces, one shape**: `quick`, full-form, `voice`, `photo`, `url` all `POST /recipes/<surface>`, all return a `draft` immediately, all promotion happens **server-side** in a `BackgroundTask`. The server is the single source of truth — never promote drafts client-side. WebSocket broadcasts when status flips to `structured`.

2. **Voting state is computed, not stored**: The 5 states (Validé / Pressenti / Contesté / Rejeté / Sans avis) are derived from rows in `votes` for a given `(shortlist_id, recipe_id)`. Don't add a `state` column. The veto window closes on first `CookingLog` for the day.

3. **Denormalized fields on `recipes`**: `last_cooked_at` and `cook_count` are updated in the same DB transaction as `cooking_logs` insertion. Don't compute on read.

4. **Realtime contract**: Both clients in a household receive `recipe.created`, `recipe.promoted`, and `vote.created` events. Any new mutation that should sync between phones must broadcast via the realtime helper.

5. **Raw inputs are kept forever**: `source_capture` JSONB on `recipes` stores the original transcript / URL / photo paths so prompts can be re-run later. Don't discard.

6. **Localization from day one**: French only in v0.1, but all user-facing strings go through `next-intl` from the start. Hardcoded strings are productize-later debt — avoid.

## Productize-later TODOs

Mark inline as `# TODO(productize)` (or `// TODO(productize)`) for things explicitly cut from v0.1 but on the roadmap (see SPEC.md §"Productize-later TODOs"). Distinguish from `# TODO` (intra-v0.1 work).

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Al Dente**

A shared recipe + decision app for couples, built as an installable PWA with a Python backend. v0.1 audience is "just us" (Luca + partner) — clean enough to productize later, but built first to eliminate the daily "on mange quoi ?" debate in our own household.

**Core Value:** Eliminate the daily "on mange quoi ?" debate via a shared library, async voting, and voice/photo capture — installable on both iPhones with no App Store, no $99/year, no native build.

### Constraints

- **Tech stack**: Next.js 16.2.4 (App Router) + React 19.2.4 + TypeScript 5 + Tailwind v4 + shadcn/ui + `next-pwa` + `framer-motion` + Web Speech API on the frontend; FastAPI + Pydantic + SQLAlchemy 2.0 + Alembic + `google-generativeai` (Gemini 2.5 Flash) + APScheduler + native FastAPI WebSockets on the backend; Supabase Postgres + Storage + (optionally) Realtime — pinned in SPEC.md §Stack and `frontend/package.json`. **Note:** Next.js 16+ has breaking changes that may not be in training data; consult `frontend/node_modules/next/dist/docs/` for current APIs.
- **Distribution**: PWA only — installed via Safari → Add to Home Screen. $0/year, no App Store, no TestFlight, no Apple Developer Program.
- **Hosting**: Vercel (frontend, free tier) + Railway or Fly.io / Render (backend, ~$5/mo) + Supabase (Postgres + Storage, free tier). Couple-scale workload assumed throughout.
- **Localization**: French only in v0.1. All user-facing strings go through `next-intl` from day 1 — hardcoded strings are productize-later debt to avoid.
- **Audience**: Single household (Luca + partner). Multi-tenant cleanliness preserved (households + members tables exist) but never exercised at scale in v0.1.
- **Effort budget**: ~230 hours, 23–30 weekends, 5–7 months at one weekend per week.
- **Skill-fit**: Python AI-engineer drives the backend choice; PWA chosen over native to skip an iOS toolchain we don't have.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- **TypeScript 5.x** — Frontend (React/Next.js components, type-safe development)
- **Python 3.12** — Backend (FastAPI, SQLAlchemy, Gemini SDK integration)
- **JavaScript (ESNext)** — PostCSS config, ESLint config
## Runtime
- Node.js (version pinned via `.nvmrc` or inferred from Next.js 16.2.4 compatibility — check `.nvmrc` at deploy)
- Python 3.12 (pinned in `backend/.python-version`)
- **npm** (frontend) — lockfile present at `frontend/package-lock.json` (224.6 KB)
- **uv** (backend) — specified in SPEC.md, no lock file yet (fresh stub state)
## Frameworks
- **Next.js 16.2.4** (`frontend/package.json`) — App Router, React Server Components
- **React 19.2.4** (`frontend/package.json`) — UI framework
- **FastAPI** (intended, not yet in `backend/pyproject.toml`) — Web framework for Python backend
- **Tailwind CSS v4** via `@tailwindcss/postcss` — Utility-first CSS
- **shadcn/ui** (intended, paste-in components, no node_modules dependency) — Accessible component library
- **ESLint 9.x** (`frontend/package.json`) — Linting
- **TypeScript 5.x** (`frontend/package.json`, with `@types/node`, `@types/react`, `@types/react-dom`)
- **next-pwa** (intended, ~5 lines of config in `frontend/next.config.ts`) — Service worker + manifest for PWA install
- **Web Speech API** (native browser API, French-capable) — Voice capture on-device transcription
- **WebSockets** (native FastAPI + optional Supabase Realtime) — Real-time voting/recipe updates
- **Framer Motion** (intended) — Swipe-deck voting UX animation
- **google-generativeai** (Python SDK, intended, not yet in `backend/pyproject.toml`) — Gemini 2.5 Flash for LLM capture pipeline
- **next-intl** (intended) — Internationalization framework (French only in v0.1)
## Key Dependencies
- `next@16.2.4` — Web framework
- `react@19.2.4` — UI library
- `react-dom@19.2.4` — DOM rendering
- `@tailwindcss/postcss@^4` — CSS framework
- `tailwindcss@^4` — Tailwind CSS core
- `@types/node@^20`, `@types/react@^19`, `@types/react-dom@^19` — Type definitions
- `typescript@^5` — Type checking
- `eslint@^9` — Linting
- `eslint-config-next@16.2.4` — Next.js ESLint plugin
- `framer-motion` — Animation library for swipe deck
- `next-pwa` — PWA plugin for service workers
- `next-intl` — i18n framework (French messages)
- `shadcn/ui` — Paste-in components (no lock-file dependency)
- `fastapi` — Web framework
- `pydantic` — Data validation
- `sqlalchemy>=2.0` — ORM
- `alembic` — Database migrations
- `google-generativeai` — Gemini SDK
- `apscheduler` — Cron jobs (daily shortlist generation)
- `psycopg2-binary` or async driver — Postgres connection (Supabase)
- Optionally: `websockets` (if not using native FastAPI) or Supabase Realtime SDK
- `reconnecting-websocket` (likely, for Railway free-tier reliability) — Reconnect logic for WebSocket
## Configuration Files
- `frontend/package.json` — npm manifest with Next.js 16.2.4 pinned
- `frontend/package-lock.json` — Dependency lock (npm)
- `frontend/tsconfig.json` — TypeScript compiler options (strict mode, bundler resolution, path alias `@/*`)
- `frontend/next.config.ts` — Next.js configuration (minimal, ready for next-pwa plugin)
- `frontend/postcss.config.mjs` — PostCSS plugins (Tailwind v4)
- `frontend/eslint.config.mjs` — ESLint flat config (extends Next.js core-web-vitals + typescript)
- `frontend/.gitignore` — Git ignore rules
- `.next-env.d.ts` — Next.js generated type definitions
- `backend/pyproject.toml` — uv-style Python project manifest (currently empty dependencies, requires Python >=3.12)
- `backend/.python-version` — Python version pinned to 3.12
- No Dockerfile present yet (intended per SPEC.md for Railway deployment)
- No `.nvmrc` found (infer Node.js version from Next.js 16.2.4 compatibility or docs)
## Environment Configuration
- No `.env` or `.env.local` currently committed
- Intended: `NEXT_PUBLIC_API_BASE` (FastAPI backend URL)
- Intended: `NEXT_PUBLIC_WS_BASE` (WebSocket server URL for realtime)
- No `.env` currently committed
- Intended: `DATABASE_URL` (Supabase Postgres connection string)
- Intended: `GEMINI_API_KEY` (Google AI Studio API key)
- Intended: `SUPABASE_URL` (Supabase instance URL)
- Intended: `SUPABASE_KEY` (Supabase anon key, if using Realtime)
## Platform Requirements
- **macOS / Linux / Windows** with Node.js 18+ (inferred from Next.js 16.2.4)
- **Python 3.12** (explicit `backend/.python-version`)
- **uv** package manager (per CLAUDE.md and SPEC.md)
- **Vercel** — Frontend hosting (Next.js native, auto-deploy from GitHub)
- **Railway** (or Fly.io / Render) — Backend hosting (Python FastAPI container, ~$5/mo or free tier)
- **Supabase** — Postgres database + file storage + optional Realtime (free tier: 500 MB DB, 1 GB storage)
## Browser & Mobile
- **Safari on iOS 14+** — PWA install via "Add to Home Screen"
- **Chrome/Safari on Android** — PWA install support
- **Web Speech API** must support French transcription (noted as W2 risk in SPEC.md)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Overview
## Frontend Conventions (Next.js 16.2.4)
### Naming Patterns
- React components: PascalCase (e.g., `layout.tsx`, `page.tsx`)
- App Router files: use Next.js reserved names (`layout.tsx`, `page.tsx`, `error.tsx`, `not-found.tsx`)
- Non-component modules: camelCase (e.g., `utils.ts`, `helpers.ts`)
- Path alias `@/*` maps to `frontend/` root (defined in `frontend/tsconfig.json` line 22)
- React components: PascalCase function names
- Utility/helper functions: camelCase (e.g., `parseIngredients`, `formatDate`)
- Event handlers: `on` prefix (e.g., `onClick`, `onChange`)
- Standard variables: camelCase
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`, `DEFAULT_TIMEOUT`)
- React state: camelCase with `set` prefix for setState (e.g., `const [isOpen, setIsOpen]`)
- PascalCase (e.g., `interface RecipeProps`, `type VoteState`)
- Import types with `type` keyword: `import type { Metadata } from "next"` (see `frontend/app/layout.tsx` line 1)
### Code Style
- ESLint runs via `npm run lint` (frontend/package.json line 9)
- No explicit Prettier config; ESLint is authority for formatting
- Indentation: 2 spaces (per Next.js default)
- Semicolons: required (ESLint enforces)
- Quotes: double quotes for strings (ESLint preset default)
- ESLint config: `frontend/eslint.config.mjs` (flat config format, ESLint 9+)
- Extends: `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- Ignored paths: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- No custom rules added; relies on Next.js recommended presets
### Import Organization
- `@/*` resolves to `frontend/` root (enables `import { Button } from "@/components/Button"`)
### TypeScript Settings
- `strict: true` — all strict checks active
- `noEmit: true` — TypeScript checks only, no emit
- `esModuleInterop: true` — CommonJS/ES6 interop
- `isolatedModules: true` — each file independently compilable
- `jsx: "react-jsx"` — uses React 19 new JSX transform (no `import React` needed)
### Styling
- PostCSS config: `frontend/postcss.config.mjs`
- No `tailwind.config.ts` by default (Tailwind v4 uses defaults)
- Applied as `className` attribute on JSX elements (e.g., `frontend/app/page.tsx` lines 5-30)
- Tailwind used for layout, spacing, colors, typography
### Localization
- **Status:** Not yet integrated into scaffold (plan only)
- **Requirement:** All user-facing strings must go through `next-intl` from first feature implementation
- **French only in v0.1:** Avoid hardcoded English strings — treat as productize-later debt
- **Inline marker:** `// TODO(productize)` for out-of-v0.1 features; `// TODO` for v0.1 work
## Backend Conventions (Python 3.12, uv)
### File/Module Naming
- Project uses `uv`-style `pyproject.toml` (not setuptools config)
- Main app: `app/main.py`
- Routers: `app/routers/` (households, recipes, cooking, shortlist, ws)
- Services: `services/` (llm.py, algorithm.py, shortlist.py, realtime.py)
- Models: `app/models.py` (SQLAlchemy 2.0)
- Migrations: `alembic/` (Alembic for schema)
### Naming Patterns (To Be Implemented)
### Code Style (To Be Implemented)
- Example pattern (from SPEC.md §Backend):
## Shared Vocabulary (Frontend ↔ Backend)
- Season, Cuisine, Mood, Protein — defined in both `frontend/lib/enums.ts` and Python Enum classes
- **Critical:** Keep both in sync on every change (drift is a bug category)
- Status quo: Not yet implemented; will be added in W1 feature work
## Comments and Documentation
- Explain *why*, not *what* (code is self-documenting for *what*)
- Non-obvious business logic (e.g., voting state computation, shortlist ranking)
- Workarounds and known limitations
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- **Decoupled frontend and backend:** `frontend/` → Vercel PWA (Next.js), `backend/` → Railway FastAPI server
- **Shared Postgres database:** Supabase-hosted, accessed by both apps
- **Single source of truth for data:** Backend owns all mutations; frontend is read + vote interface
- **Async server-side promotion pipeline:** Recipe capture returns draft immediately; background job promotes to structured (see Capture pipeline below)
- **Realtime sync via WebSocket:** Recipe and vote mutations broadcast to connected household members
## Layers
- **Purpose:** Mobile-optimized vote interface + recipe capture surfaces
- **Location:** `frontend/`
- **Contains:** React Server Components (App Router), Tailwind styling, PWA manifest, Web Speech API integration, camera capture
- **Depends on:** Backend API endpoints (`POST /recipes/*`, `GET /shortlist`), WebSocket stream for real-time updates
- **Used by:** Two household members on iPhones (Safari→Add to Home Screen installation)
- **Purpose:** Recipe lifecycle management, voting state computation, LLM integration, shortlist generation
- **Location:** `backend/` (not yet wired; only stub in `main.py`)
- **Contains:** FastAPI routers (`households`, `recipes`, `cooking`, `shortlist`, `ws`), SQLAlchemy models, Gemini LLM service, APScheduler daily job, realtime broadcast helper
- **Depends on:** Supabase Postgres (via SQLAlchemy ORM + Alembic migrations), Gemini 2.5 Flash API, database transaction isolation
- **Used by:** Frontend via HTTP + WebSocket; internal services (daily shortlist cron)
- **Purpose:** Canonical store for households, members, recipes, votes, cooking logs, daily shortlists
- **Location:** Supabase (managed service; migrations live in `backend/`)
- **Contains:** 8 tables + 3 PostgreSQL enums (see SPEC.md §Data model)
- **Schema constraints:** Foreign keys, unique invite codes, recipe status states, vote enums
- **Denormalized fields:** `recipes.last_cooked_at`, `recipes.cook_count` updated in same transaction as `cooking_logs` insert
## Data Flow
- **Frontend:** React state for current page (shortlist, voting, recipe detail), polling/WebSocket subscription for realtime updates
- **Backend:** Postgres as single source of truth; no in-memory cache (simplicity for v0.1)
- **Authentication:** Bearer token (invite-code-derived, stored in `members.auth_token`); validated on every request via `Depends(current_member)`
## Key Abstractions
- Purpose: Isolation boundary for two members and their shared recipe library
- Examples: `households` table, `members.household_id` foreign key
- Pattern: All queries filtered by `household_id` to prevent cross-household data leaks
- `draft` → `structured` → `verified` (future: user-driven verification)
- Purpose: Track capture fidelity; avoid promoting partial data
- Pattern: Mutations update status; frontend filters by status on display
- Purpose: Preserve original input so LLM prompts can be re-run or audited
- Stored as `{ type: 'voice'|'photo'|'url'|'manual', payload: {...} }` in `recipes.source_capture`
- Pattern: Never discard raw input; allow recipe re-promotion on LLM model upgrade
- Purpose: Single source of truth is rows in `votes` table; no computed column
- Pattern: `compute_vote_state(shortlist_id, recipe_id)` queries votes and returns enum (Validé/Pressenti/Contesté/Rejeté/Sans avis)
- Rationale: Voting state depends on household size + member positions; derivation is cleaner than dual-write
## Entry Points
- **Location:** `frontend/app/page.tsx`
- **Triggers:** User opens app URL or taps home-screen icon
- **Responsibilities:** Render root layout + navigation frame; mount shortlist or recipe detail screens
- **Location:** `backend/app/main.py` (not yet created; will contain FastAPI app instantiation)
- **Triggers:** Frontend HTTP requests (`POST /recipes/voice`, `GET /shortlist`, etc.) + external WebSocket connections
- **Responsibilities:** Route requests to routers (`households`, `recipes`, `cooking`, `shortlist`, `ws`); validate auth token; execute service logic
- **Location:** `backend/services/shortlist.py` (APScheduler job, not yet wired)
- **Triggers:** Midnight UTC (or configurable TZ per household)
- **Responsibilities:** Fetch recipes for household, run scoring algorithm, upsert `daily_shortlists` row, broadcast event
## Error Handling
- **Missing auth:** `401 Unauthorized` (invalid or expired token)
- **Household mismatch:** `403 Forbidden` (member token doesn't belong to household in request path)
- **LLM failure:** Backend logs error, keeps recipe in `draft` status, frontend shows "Retrying..." UI; user can manually fill form to promote to `structured`
- **Database conflict:** `409 Conflict` on unique constraint (e.g., duplicate invite code); frontend prompts user to regenerate
- **Validation error:** `422 Unprocessable Entity` (Pydantic validation failure); frontend displays validation message
## Cross-Cutting Concerns
- Pattern: Backend logs all LLM calls (prompt + tokens used), database transaction markers, WebSocket connect/disconnect events
- Rationale: Understand model drift and debug realtime sync issues
- Frontend: React hook form validation before `POST`
- Backend: Pydantic models (`recipes.VoiceSourceRequest`, `votes.VoteRequest`, etc.) validate all inputs; database triggers enforce enum constraints
- Invite-code-based: User creates household, receives unique 6-char code, shares with partner
- Partner uses code to join → backend generates unique `auth_token` and returns it
- Token stored in device secure storage (Safari → Web Storage or local filesystem for PWA)
- All requests include `Authorization: Bearer <token>` header; middleware validates + loads `member` object
- French only in v0.1
- All strings via `next-intl` from day one (config not yet in place; scaffold structure only)
- Backend returns enums + structured data; frontend renders translated labels client-side
## Intended (per SPEC.md, not yet implemented)
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
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
