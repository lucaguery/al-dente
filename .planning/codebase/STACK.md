# Technology Stack

**Analysis Date:** 2026-05-19
Snapshot: 2026-05-19

## Languages

**Primary:**
- TypeScript 5.x — all frontend source (`frontend/`)
- Python 3.12 — all backend source (`backend/`)

**Secondary:**
- CSS (Tailwind v4 utility classes) — `frontend/app/globals.css`, component files

## Runtime

**Frontend Environment:**
- Node.js 20+ (declared via `@types/node: ^20` in `frontend/package.json`)

**Backend Environment:**
- Python 3.12 (enforced in `backend/pyproject.toml`: `requires-python = ">=3.12"`)
- `ZoneInfo` stdlib used for household timezone scheduling

**Package Managers:**
- `npm` — frontend (`frontend/package.json`, lockfile present)
- `uv` — backend (`backend/pyproject.toml`, `backend/uv.lock` present; `hatchling` build backend)

## Frameworks

**Core Frontend:**
- Next.js 16.2.4 — App Router, PWA shell, API rewrites proxy to Railway backend (`frontend/proxy.ts`)
- React 19.2.4 — UI rendering
- Tailwind CSS v4 — utility-first styling (PostCSS plugin: `@tailwindcss/postcss ^4`)

**Core Backend:**
- FastAPI `>=0.136.1` (standard extras) — HTTP + WebSocket API (`backend/app/main.py`)
- SQLAlchemy 2.0 typed style — ORM (`backend/app/models/`)
- Alembic `>=1.13` — database migrations (`backend/alembic/versions/`)
- Pydantic v2 + pydantic-settings v2 — schema validation and settings (`backend/app/config.py`, `backend/app/schemas/`)
- Uvicorn `>=0.46.0` (standard extras) — ASGI server, **single worker** (invariant — APScheduler is in-process)

**Testing:**
- Playwright `^1.59.1` — E2E tests (`frontend/tests/e2e/`, config at `frontend/playwright.config.ts`)
- pytest `>=8.0` + pytest-asyncio `>=0.24` — backend unit/integration tests (`backend/tests/`)

**Build / Dev:**
- `next build --webpack` — intentional webpack build (not Turbopack); set in `frontend/package.json` scripts
- ESLint 9 flat config — lint authority (no Prettier); config at `frontend/eslint.config.mjs`

## Key Dependencies

**Frontend — Critical:**
- `next-intl ^4.11.0` — French-only i18n; all user-facing strings route through this (`frontend/`)
- `framer-motion ^12.38.0` — animations throughout UI
- `@ducanh2912/next-pwa ^10.2.9` — PWA manifest + service worker
- `partysocket ^1.1.18` — WebSocket client for realtime household sync (`frontend/components/RealtimeProvider.tsx`)
- `sonner ^2.0.7` — toast notifications
- `next-themes ^0.4.6` — theme support

**Frontend — UI Primitives:**
- Radix UI suite (`@radix-ui/react-dialog ^1.1.15`, `@radix-ui/react-select ^2.2.6`, `@radix-ui/react-tabs ^1.1.13`, `@radix-ui/react-alert-dialog ^1.1.15`, `@radix-ui/react-label ^2.1.8`, `@radix-ui/react-scroll-area ^1.2.10`, `@radix-ui/react-separator ^1.1.8`, `@radix-ui/react-slot ^1.2.4`)
- `radix-ui ^1.4.3` — umbrella Radix package
- `shadcn ^4.6.0` — component scaffolding CLI
- `class-variance-authority ^0.7.1`, `clsx ^2.1.1`, `tailwind-merge ^3.5.0` — variant/class utilities
- `lucide-react ^1.14.0` — icons
- `tw-animate-css ^1.4.0` — animation utilities

**Backend — Critical:**
- `google-genai >=1.75` — Gemini LLM SDK; unified SDK (NOT legacy `google-generativeai`); imports as `from google import genai`; primary use in `backend/app/services/llm.py` (59 KB)
- `supabase >=2.0` — Supabase Python client for Storage bucket access (`backend/app/services/storage.py`)
- `psycopg2-binary >=2.9.12` — PostgreSQL driver
- `apscheduler >=3.11` — in-process `AsyncIOScheduler`; registers per-household 16:00 shortlist cron job in `backend/app/main.py` lifespan
- `pywebpush >=2.3` + `py-vapid >=1.9` — Web Push VAPID fan-out (`backend/app/services/push.py`)
- `trafilatura >=2.0.0` + `lxml >=6.1.0` — HTML extraction for URL-capture recipes (`backend/app/services/llm.py`)
- `httpx >=0.28.1` — async HTTP client
- `python-multipart >=0.0.27` — multipart form / file upload support (photo capture)

**Backend — Dev Only:**
- `graphifyy >=0.8.13` — knowledge graph tooling (dev only)
- `pytest >=8.0` + `pytest-asyncio >=0.24` — test runner

## Configuration

**Backend Environment (`backend/app/config.py`):**
- `pydantic-settings` `BaseSettings` reads from `.env` at startup
- Required: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`
- Web Push VAPID: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`
- Optional: `DATABASE_URL_TEST` (test-mode override), `CORS_ALLOWED_ORIGINS`, `ENVIRONMENT`
- Test-mode override: when `ENVIRONMENT=test` and `DATABASE_URL_TEST` is set, `settings.database_url` is overwritten in-place at import time (covers both `db.py` and `alembic/env.py`)

**Frontend Environment:**
- Standard Next.js `.env.local` / `.env` pattern
- API calls proxy through `frontend/proxy.ts` (Next.js rewrites) to keep `aldente_auth` HttpOnly cookie same-origin

**Build:**
- Frontend: `next build --webpack` (Turbopack explicitly excluded)
- Backend: Railway runs `alembic upgrade head` before uvicorn restart on each deploy

## Platform Requirements

**Development:**
- Node 20+
- Python 3.12 via `uv`
- Supabase project (Postgres + Storage bucket `recipe-photos`)
- Docker Compose for isolated test environment (`docker-compose.test.yml`)

**Production:**
- Frontend: Vercel (free tier) — auto-deploys on push to `main`
- Backend: Railway (~$5/mo) — single uvicorn worker required (multi-worker would duplicate APScheduler jobs); auto-deploys on push to `main`
- Database + Storage: Supabase (free tier)
- Deploy path: push to `main` only — never run `vercel --prod` or manual Railway CLI deploys

---

*Stack analysis: 2026-05-19*
