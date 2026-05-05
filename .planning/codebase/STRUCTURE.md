# Codebase Structure

**Analysis Date:** 2026-05-05

## Directory Layout

```
al-dente/                          # Monorepo root
├── SPEC.md                        # Source of truth: locked data model, capture pipeline, build plan
├── CLAUDE.md                      # Global repo instructions for Claude Code
├── README.md                      # Brief overview
├── .planning/
│   └── codebase/                  # (this directory) GSD analysis documents
├── frontend/                      # Next.js PWA → Vercel
│   ├── app/                       # App Router directory
│   │   ├── layout.tsx             # Root layout, metadata, font setup
│   │   ├── page.tsx               # Home page (scaffold: "edit me" template)
│   │   ├── globals.css            # Tailwind directives + global styles
│   │   └── favicon.ico            # Site icon
│   ├── public/                    # Static assets (SVG logos, manifest)
│   │   ├── next.svg
│   │   ├── vercel.svg
│   │   └── [other assets]
│   ├── node_modules/              # Dependencies (excluded from git)
│   ├── .next/                     # Build output (excluded from git)
│   ├── package.json               # Workspace config + scripts
│   ├── tsconfig.json              # TypeScript compiler options, path aliases
│   ├── next.config.ts             # Next.js config (empty scaffold)
│   ├── postcss.config.mjs          # Tailwind + PostCSS config
│   ├── eslint.config.mjs          # ESLint rules
│   ├── next-env.d.ts              # Auto-generated Next.js types
│   ├── CLAUDE.md                  # Delegated to AGENTS.md
│   ├── AGENTS.md                  # Warning: Next.js 16.2.4 may differ from training data
│   └── README.md                  # CNA scaffold readme
├── backend/                       # FastAPI app → Railway
│   ├── main.py                    # Stub: `print("Hello from backend!")`
│   ├── pyproject.toml             # uv-style project config, Python 3.12, empty deps
│   ├── .python-version            # Python 3.12
│   └── README.md                  # Empty
└── .git/                          # Git history (one commit: "first commit")
```

## Directory Purposes

**`frontend/`** — Next.js Progressive Web App

- **Purpose:** Mobile-first household voting interface, recipe capture UI, shortlist display
- **Contains:** React Server Components, Tailwind styling, Web Speech API integration, PWA config (manifest, service worker)
- **Key files:**
  - `app/page.tsx` — Home page entry point (currently scaffold template)
  - `app/layout.tsx` — Root layout with metadata and font setup
  - `public/` — Static assets served directly
- **Key configs:**
  - `tsconfig.json` — Strict TypeScript, path alias `@/*` → `frontend/*`
  - `next.config.ts` — Next.js configuration (empty, ready for PWA plugin)
  - `postcss.config.mjs` — Tailwind CSS 4 with `@tailwindcss/postcss`
  - `eslint.config.mjs` — ESLint config

**`backend/`** — Python FastAPI server

- **Purpose:** Recipe lifecycle, voting state, LLM integration, daily shortlist generation
- **Contains:** FastAPI app (not yet scaffolded), SQLAlchemy models, Alembic migrations, service modules (`llm`, `algorithm`, `shortlist`, `realtime`)
- **Key file:**
  - `main.py` — Currently a hello-world stub; will contain FastAPI app instantiation and router mounts
- **Key configs:**
  - `pyproject.toml` — uv-style project config, Python 3.12, empty dependencies (ready for FastAPI, SQLAlchemy, google-generativeai, apscheduler)
  - `.python-version` — Python 3.12

**`.planning/codebase/`** — GSD analysis documents

- **Purpose:** Store static analysis (this STRUCTURE.md, ARCHITECTURE.md, etc.) consumed by other `/gsd-*` commands
- **Contains:** ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md
- **Generated:** Yes (by `/gsd-map-codebase` agent)
- **Committed:** Yes

## Key File Locations

**Entry Points:**

- `frontend/app/page.tsx` — Frontend home page; mounts Root layout, renders shortlist or recipe detail screen
- `backend/main.py` — Backend server stub; will instantiate FastAPI app and mount routers

**Configuration:**

- `SPEC.md` — Source of truth for data model, capture surfaces, build plan, locked enums (Season, Cuisine, Mood, Protein)
- `CLAUDE.md` — Repo-level instructions for Claude Code (monorepo layout, vocab drift prevention, architecture invariants)
- `frontend/CLAUDE.md` → `frontend/AGENTS.md` — Warning about Next.js 16.2.4 breaking changes
- `frontend/tsconfig.json` — TypeScript paths, strict mode, App Router support
- `backend/pyproject.toml` — Python dependencies (currently empty; will add FastAPI, SQLAlchemy, google-generativeai, apscheduler)

**Core Logic:**

- `frontend/app/` — All React components (not yet scaffolded beyond home page)
- `backend/` — FastAPI routers (not yet scaffolded; will contain `app/main.py`, `app/routers/`, `services/`)

**Testing:**

- No test files present (not configured yet; W1 milestone does not require tests)

## Naming Conventions

**Files:**

- **React components:** PascalCase, `.tsx` extension (e.g., `ShortlistCard.tsx`)
- **Pages:** lowercase, `.tsx` extension in `app/` directory (e.g., `app/page.tsx`)
- **Utilities:** camelCase, `.ts` extension (e.g., `recipeParser.ts`)
- **Styles:** `globals.css` for global styles, component-scoped CSS modules or Tailwind classes for local styles
- **Python modules:** snake_case, `.py` extension (e.g., `promote_recipe.py`, `llm.py`, `algorithm.py`)

**Directories:**

- **Frontend pages:** `app/` (Next.js App Router convention)
- **Frontend shared code:** TBD (not yet scaffolded; suggest `lib/`, `components/`, `utils/`)
- **Backend routers:** `app/routers/` (per FastAPI convention)
- **Backend services:** `services/` (business logic modules)
- **Backend models:** `models/` (SQLAlchemy ORM classes)

## Where to Add New Code

**New Feature (Recipe Capture Surface):**

- **Frontend UI:** `frontend/app/[feature-name]/` (new page or layout)
- **Frontend submission logic:** `frontend/lib/api.ts` (wrapper for `POST /recipes/<surface>`)
- **Backend router:** `backend/app/routers/recipes.py` (handler for `POST /recipes/<surface>`)
- **Backend service:** `backend/services/llm.py` or `backend/services/algorithm.py` (if LLM or scoring logic needed)
- **Tests:** Not applicable for W1

**New Component or Module:**

- **React component:** `frontend/components/[ComponentName].tsx` (when `components/` directory is created)
- **Python service:** `backend/services/[feature].py` (grouping related business logic)
- **Database model:** `backend/models/[Entity].py` (SQLAlchemy class)

**Utilities:**

- **Frontend shared helpers:** `frontend/lib/` (e.g., `frontend/lib/enums.ts` for locked vocabs, `frontend/lib/api.ts` for HTTP client)
- **Backend shared helpers:** `backend/services/` or `backend/utils/` (for validation, auth, realtime broadcast)

## Special Directories

**`.planning/`:**

- **Purpose:** GSD planning and analysis artifacts (this document lives here)
- **Generated:** Yes (by `/gsd-map-codebase` and `/gsd-plan-phase`)
- **Committed:** Yes, but not shipped in production builds

**`node_modules/` (frontend):**

- **Purpose:** npm dependencies
- **Generated:** Yes (by `npm install`)
- **Committed:** No (in `.gitignore`)

**`.next/` (frontend):**

- **Purpose:** Next.js build output and cache
- **Generated:** Yes (by `npm run build`)
- **Committed:** No (in `.gitignore`)

## Scaffolding Checklist (not yet implemented)

To reach W1 skeleton readiness (ping test gate per SPEC.md), the following directories need to be created:

**Frontend:**
- `frontend/lib/` — enums.ts (Season, Cuisine, Mood, Protein), api.ts (HTTP client), auth.ts (token handling)
- `frontend/components/` — ShortlistCard, RecipeForm, VoteButton, etc.
- `frontend/app/recipe/` — Recipe detail page
- `frontend/app/onboarding/` — Join household via invite code
- `next-intl` configuration in `frontend/` and `app/layout.tsx` (French only in v0.1)
- `next-pwa` plugin in `next.config.ts`

**Backend:**
- `backend/app/` — FastAPI app instantiation, CORS + WebSocket setup
- `backend/app/routers/` — households.py, recipes.py, cooking.py, shortlist.py, ws.py
- `backend/models/` — SQLAlchemy ORM classes (Household, Member, Recipe, CookingLog, DailyShortlist, Vote)
- `backend/services/` — llm.py (Gemini integration), algorithm.py (scoring), shortlist.py (APScheduler), realtime.py (broadcast helper), auth.py (token validation)
- `backend/migrations/` — Alembic initial migration (from SPEC.md schema)
- `backend/` — Create `.env.example` (list env vars, no secrets)

---

*Structure analysis: 2026-05-05*
