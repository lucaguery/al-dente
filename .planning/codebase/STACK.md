# Technology Stack

**Analysis Date:** 2026-05-05

## Languages

**Primary:**
- **TypeScript 5.x** — Frontend (React/Next.js components, type-safe development)
- **Python 3.12** — Backend (FastAPI, SQLAlchemy, Gemini SDK integration)

**Secondary:**
- **JavaScript (ESNext)** — PostCSS config, ESLint config

## Runtime

**Environment:**
- Node.js (version pinned via `.nvmrc` or inferred from Next.js 16.2.4 compatibility — check `.nvmrc` at deploy)
- Python 3.12 (pinned in `backend/.python-version`)

**Package Manager:**
- **npm** (frontend) — lockfile present at `frontend/package-lock.json` (224.6 KB)
- **uv** (backend) — specified in SPEC.md, no lock file yet (fresh stub state)

## Frameworks

**Core:**
- **Next.js 16.2.4** (`frontend/package.json`) — App Router, React Server Components
  - Breaking changes from Next.js 15; consult `node_modules/next/dist/docs/` for current APIs
  - Config file: `frontend/next.config.ts` (currently minimal)
- **React 19.2.4** (`frontend/package.json`) — UI framework
- **FastAPI** (intended, not yet in `backend/pyproject.toml`) — Web framework for Python backend

**Styling & UI:**
- **Tailwind CSS v4** via `@tailwindcss/postcss` — Utility-first CSS
  - Config: `frontend/postcss.config.mjs` (uses Tailwind v4 PostCSS plugin)
  - No `tailwind.config.ts` by default in Tailwind v4
- **shadcn/ui** (intended, paste-in components, no node_modules dependency) — Accessible component library

**Build & Development:**
- **ESLint 9.x** (`frontend/package.json`) — Linting
  - Config: `frontend/eslint.config.mjs` (flat config format)
  - Extends: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- **TypeScript 5.x** (`frontend/package.json`, with `@types/node`, `@types/react`, `@types/react-dom`)

**Realtime & PWA:**
- **next-pwa** (intended, ~5 lines of config in `frontend/next.config.ts`) — Service worker + manifest for PWA install
- **Web Speech API** (native browser API, French-capable) — Voice capture on-device transcription
- **WebSockets** (native FastAPI + optional Supabase Realtime) — Real-time voting/recipe updates

**Capture & Processing:**
- **Framer Motion** (intended) — Swipe-deck voting UX animation
- **google-generativeai** (Python SDK, intended, not yet in `backend/pyproject.toml`) — Gemini 2.5 Flash for LLM capture pipeline
- **next-intl** (intended) — Internationalization framework (French only in v0.1)

## Key Dependencies

**Frontend (currently installed):**
- `next@16.2.4` — Web framework
- `react@19.2.4` — UI library
- `react-dom@19.2.4` — DOM rendering
- `@tailwindcss/postcss@^4` — CSS framework
- `tailwindcss@^4` — Tailwind CSS core
- `@types/node@^20`, `@types/react@^19`, `@types/react-dom@^19` — Type definitions
- `typescript@^5` — Type checking
- `eslint@^9` — Linting
- `eslint-config-next@16.2.4` — Next.js ESLint plugin

**Frontend (intended, not yet installed):**
- `framer-motion` — Animation library for swipe deck
- `next-pwa` — PWA plugin for service workers
- `next-intl` — i18n framework (French messages)
- `shadcn/ui` — Paste-in components (no lock-file dependency)

**Backend (not yet installed, per SPEC.md):**
- `fastapi` — Web framework
- `pydantic` — Data validation
- `sqlalchemy>=2.0` — ORM
- `alembic` — Database migrations
- `google-generativeai` — Gemini SDK
- `apscheduler` — Cron jobs (daily shortlist generation)
- `psycopg2-binary` or async driver — Postgres connection (Supabase)
- Optionally: `websockets` (if not using native FastAPI) or Supabase Realtime SDK

**Critical Infrastructure Packages (intended):**
- `reconnecting-websocket` (likely, for Railway free-tier reliability) — Reconnect logic for WebSocket

## Configuration Files

**Frontend:**
- `frontend/package.json` — npm manifest with Next.js 16.2.4 pinned
- `frontend/package-lock.json` — Dependency lock (npm)
- `frontend/tsconfig.json` — TypeScript compiler options (strict mode, bundler resolution, path alias `@/*`)
- `frontend/next.config.ts` — Next.js configuration (minimal, ready for next-pwa plugin)
- `frontend/postcss.config.mjs` — PostCSS plugins (Tailwind v4)
- `frontend/eslint.config.mjs` — ESLint flat config (extends Next.js core-web-vitals + typescript)
- `frontend/.gitignore` — Git ignore rules
- `.next-env.d.ts` — Next.js generated type definitions

**Backend:**
- `backend/pyproject.toml` — uv-style Python project manifest (currently empty dependencies, requires Python >=3.12)
- `backend/.python-version` — Python version pinned to 3.12
- No Dockerfile present yet (intended per SPEC.md for Railway deployment)

**Root:**
- No `.nvmrc` found (infer Node.js version from Next.js 16.2.4 compatibility or docs)

## Environment Configuration

**Frontend:**
- No `.env` or `.env.local` currently committed
- Intended: `NEXT_PUBLIC_API_BASE` (FastAPI backend URL)
- Intended: `NEXT_PUBLIC_WS_BASE` (WebSocket server URL for realtime)

**Backend:**
- No `.env` currently committed
- Intended: `DATABASE_URL` (Supabase Postgres connection string)
- Intended: `GEMINI_API_KEY` (Google AI Studio API key)
- Intended: `SUPABASE_URL` (Supabase instance URL)
- Intended: `SUPABASE_KEY` (Supabase anon key, if using Realtime)

## Platform Requirements

**Development:**
- **macOS / Linux / Windows** with Node.js 18+ (inferred from Next.js 16.2.4)
- **Python 3.12** (explicit `backend/.python-version`)
- **uv** package manager (per CLAUDE.md and SPEC.md)

**Production:**
- **Vercel** — Frontend hosting (Next.js native, auto-deploy from GitHub)
- **Railway** (or Fly.io / Render) — Backend hosting (Python FastAPI container, ~$5/mo or free tier)
- **Supabase** — Postgres database + file storage + optional Realtime (free tier: 500 MB DB, 1 GB storage)

## Browser & Mobile

**Minimum Target:**
- **Safari on iOS 14+** — PWA install via "Add to Home Screen"
- **Chrome/Safari on Android** — PWA install support
- **Web Speech API** must support French transcription (noted as W2 risk in SPEC.md)

---

*Stack analysis: 2026-05-05*
*State: Pre-skeleton (W1). Backend dependencies not yet installed; frontend scaffold complete.*
