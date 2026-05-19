# Codebase Structure

**Analysis Date:** 2026-05-19

Snapshot: 2026-05-19

## Directory Layout

```
al-dente/                    # Monorepo root
├── .claude/                 # Claude AI configuration
│   └── settings.json        # Claude IDE settings
├── .github/                 # GitHub configuration (CI/CD setup)
├── .planning/               # GSD workflow artifacts
│   ├── codebase/            # Analysis documents (ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, etc.)
│   ├── PROJECT.md           # Live project state (current milestone, constraints)
│   ├── STATE.md             # Current phase and progress
│   ├── config.json          # GSD orchestrator config
│   └── phases/              # Per-phase GSD artifacts (plan.md, summary.md, intel/)
├── docs/                    # Documentation
│   ├── design-system.html   # Living Sober Kitchen design system (locked tokens + screens)
│   └── adr/                 # Architecture Decision Records
├── backend/                 # FastAPI application (Python 3.12, Railway deploy)
│   ├── alembic/             # Database migrations (SQLAlchemy 2.0)
│   │   ├── env.py           # Alembic configuration
│   │   ├── script.py.mako   # Migration template
│   │   └── versions/        # Migration files (0001.py, 0002.py, …)
│   ├── app/                 # Application package
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI app + lifespan (scheduler, storage bootstrap)
│   │   ├── auth.py          # Cookie/Bearer dual-mode authentication
│   │   ├── db.py            # SQLAlchemy engine, SessionLocal factory
│   │   ├── config.py        # Settings from environment
│   │   ├── colors.py        # MEMBER_COLORS palette
│   │   ├── models/          # SQLAlchemy ORM classes
│   │   │   ├── __init__.py  # Imports all models (for Alembic autogenerate)
│   │   │   ├── base.py      # Base (declarative), TimestampMixin
│   │   │   ├── household.py, member.py, recipe.py, recipe_turn.py
│   │   │   ├── vote.py, cooking_log.py, daily_shortlist.py
│   │   │   ├── push_subscription.py
│   │   │   └── enums.py     # Locked vocabularies
│   │   ├── schemas/         # Pydantic v2 request/response models
│   │   │   ├── household.py, member.py, recipe.py, recipe_turn.py
│   │   │   ├── vote.py, cooking_log.py, shortlist.py, push.py
│   │   │   └── __init__.py
│   │   ├── routers/         # FastAPI APIRouter instances
│   │   │   ├── households.py    # POST / (create), POST /join, GET /me, PATCH /me
│   │   │   ├── recipes.py       # CRUD, thread turns, promotion
│   │   │   ├── votes.py         # Cast vote on shortlist recipe
│   │   │   ├── cooking_logs.py  # Start cooking, active session
│   │   │   ├── shortlist.py     # GET /today, POST /regenerate
│   │   │   ├── ws.py            # WebSocket /ws endpoint
│   │   │   ├── auth_session.py  # Login, logout, session refresh
│   │   │   ├── photos.py        # Photo upload
│   │   │   ├── exports.py       # Export endpoints
│   │   │   ├── push.py          # Push subscription
│   │   │   └── __init__.py
│   │   ├── services/        # Business logic (no HTTP, no ORM exports)
│   │   │   ├── llm.py           # Gemini 2.5 Flash promotion
│   │   │   ├── algorithm.py     # Pure scoring (no DB)
│   │   │   ├── shortlist.py     # Daily cron task
│   │   │   ├── voting.py        # compute_vote_state
│   │   │   ├── realtime.py      # WebSocket broadcast registry
│   │   │   ├── invite_codes.py  # Code generation/validation
│   │   │   ├── storage.py       # Supabase Storage upload
│   │   │   ├── push.py          # Web Push API
│   │   │   ├── svg_sanitizer.py # XSS mitigation
│   │   │   ├── thread.py        # URL extraction (SSRF defense)
│   │   │   ├── completeness.py  # Field completion calc
│   │   │   ├── llm_fixtures.py  # Test fixtures
│   │   │   └── __init__.py
│   │   └── cli/             # CLI commands
│   │       ├── seed.py      # `uv run seed` — test data population
│   │       └── __init__.py
│   ├── tests/               # Python unit tests (pytest)
│   │   ├── conftest.py      # Fixtures (db_session, app, client)
│   │   ├── test_*.py        # Test files per module
│   │   └── .pytest_cache/   # pytest cache (not committed)
│   ├── pyproject.toml       # uv project config + dependencies
│   ├── uv.lock              # Dependency lockfile
│   ├── alembic.ini          # Alembic configuration
│   ├── .env.example         # Template (no secrets)
│   ├── .python-version      # Python 3.12
│   ├── Dockerfile           # Railway deployment image
│   ├── CLAUDE.md            # Backend-specific rules
│   ├── main.py              # Entry point (dev)
│   └── README.md
│
├── frontend/                # Next.js PWA (React 19, Vercel deploy)
│   ├── app/                 # App Router pages (file-based routing)
│   │   ├── layout.tsx       # Root layout (fonts, providers, metadata)
│   │   ├── page.tsx         # Home / Shortlist view
│   │   ├── globals.css      # Global Tailwind directives
│   │   ├── icon.tsx, apple-icon.tsx, favicon.ico
│   │   ├── onboarding/      # /onboarding/* (pre-auth flows)
│   │   │   ├── layout.tsx, welcome/, create/, share-code/, join/
│   │   │   └── page.tsx
│   │   ├── recipes/         # /recipes/* (library)
│   │   │   ├── page.tsx, [id]/, [id]/edit/, new/
│   │   │   └── ...
│   │   ├── cooking-logs/    # /cooking-logs/* (history)
│   │   │   ├── page.tsx, [id]/, [id]/finalize/
│   │   │   └── ...
│   │   ├── settings/        # /settings (config)
│   │   │   └── page.tsx
│   │   └── ws-config/       # /ws-config (route handler)
│   │       └── route.ts
│   ├── components/          # Reusable React components
│   │   ├── BottomNav.tsx, SessionProvider.tsx, RealtimeProvider.tsx
│   │   ├── LocaleProvider.tsx, OnboardingGuard.tsx
│   │   ├── HomeDecide.tsx, ShortlistCard.tsx, VoteSummary.tsx
│   │   ├── CookingBanner.tsx, RecipeForm.tsx, PhotoUploader.tsx
│   │   ├── VoiceInput.tsx, SearchInput.tsx, RecipeCard.tsx
│   │   ├── RecipeThread/    # Thread UI (Phase 26+)
│   │   │   ├── index.tsx, Bubble.tsx, Composer.tsx
│   │   │   ├── VoiceSheet.tsx, UrlSheet.tsx, PhotoMenu.tsx
│   │   │   ├── SystemBubble.tsx, PinLabel.tsx
│   │   │   └── types.ts
│   │   ├── ui/              # shadcn/ui components
│   │   │   ├── button.tsx, card.tsx, dialog.tsx, input.tsx
│   │   │   ├── label.tsx, select.tsx, alert-dialog.tsx
│   │   │   ├── scroll-area.tsx, badge.tsx
│   │   │   └── ...
│   │   └── [other domain components: RecipeIllustration, CompletenessCard, etc.]
│   ├── lib/                 # Utilities and helpers (no components)
│   │   ├── api.ts           # Fetch wrapper (credentials: include)
│   │   ├── ws.ts            # WebSocket client (partysocket reconnect)
│   │   ├── auth.ts, recipes.ts, votes.ts, shortlist.ts
│   │   ├── cooking.ts, households.ts, colors.ts
│   │   ├── enums.ts         # Locked vocabularies
│   │   ├── enum-labels.ts   # i18n mapping for enums
│   │   ├── datetime.ts, format-field.ts, utils.ts
│   │   ├── motion.ts, swipe-tokens.ts, push.ts
│   │   ├── recipe-completeness.ts, recipe-completeness.test.ts
│   │   ├── hooks/           # Custom React hooks
│   │   │   ├── useDelayedFlag.ts, useSignedPhotoUrl.ts
│   │   │   └── ...
│   │   ├── i18n/            # Internationalization
│   │   │   └── fr.json      # French translations
│   │   └── onboarding-guard.tsx
│   ├── public/              # Static assets
│   │   ├── manifest.json    # PWA metadata
│   │   ├── demo-fixtures/   # Fallback SVG illustrations
│   │   │   ├── default.svg, italian.svg, french.svg
│   │   │   └── ... (one per cuisine)
│   │   └── textures/        # Background patterns
│   ├── tests/               # Playwright E2E tests
│   │   └── e2e/             # Test specs
│   │       ├── onboarding.spec.ts, capture.spec.ts
│   │       ├── voting.spec.ts, cooking.spec.ts
│   │       └── ...
│   ├── worker/              # Service Worker (PWA)
│   │   └── sw.ts            # next-pwa service worker
│   ├── scripts/             # Build/dev scripts
│   │   └── ... (generated by next-pwa, Vercel)
│   ├── next.config.ts       # Next.js config (webpack, next-pwa)
│   ├── tsconfig.json        # TypeScript strict mode, @/* alias
│   ├── eslint.config.mjs    # ESLint flat config (formatter authority)
│   ├── playwright.config.ts # E2E test config
│   ├── package.json         # npm dependencies + scripts
│   ├── package-lock.json    # npm lockfile
│   ├── i18n.ts              # next-intl config
│   ├── proxy.ts             # Next.js rewrites (→ backend)
│   ├── CLAUDE.md            # Frontend-specific rules
│   ├── components.json      # shadcn/ui config
│   ├── postcss.config.mjs   # Tailwind v4 PostCSS
│   └── README.md
│
├── scripts/                 # Repo-level utilities (optional)
├── SPEC.md                  # MVP specification (locked data model)
├── CLAUDE.md                # Main instructions (invariants, vocab, deploy)
├── CONTEXT.md               # Definitions, acronyms, phase context
├── TESTING.md               # Testing strategy
├── RUNBOOK.md               # Operational guide
├── README.md                # Minimal overview
└── .gitignore               # Excludes node_modules, .env, .next, etc.
```

## Directory Purposes

**`backend/app/models/`:**
- SQLAlchemy ORM classes (one class per table)
- Import in `models/__init__.py` for Alembic autogenerate
- Never imported by other packages directly (import `models/` package only)

**`backend/app/schemas/`:**
- Pydantic v2 request/response validators
- Symmetrical with routers (each router has matching schema file)
- Never imported by services; services work with ORM classes

**`backend/app/routers/`:**
- FastAPI APIRouter instances (thin HTTP adapters)
- Mounted in `main.py`
- Call services, return schemas; do not contain business logic

**`backend/app/services/`:**
- Pure business logic (no FastAPI, no SQLAlchemy models exported)
- Open fresh `SessionLocal()` if needed (avoid session use-after-close)
- Example: `services/algorithm.py` (pure functions, no DB access)

**`backend/alembic/versions/`:**
- Ordered migration snapshots (0001.py, 0002.py, …)
- Never edited after commit
- Generated via `alembic revision --autogenerate -m "message"`

**`frontend/app/`:**
- Next.js App Router pages (directory = URL segment)
- Each `page.tsx` is a route handler
- `layout.tsx` wraps all children in a segment

**`frontend/components/`:**
- Reusable UI components (no routing)
- Domain-specific at root (RecipeForm, ShortlistCard)
- Complex UX grouped in subdirectory (RecipeThread/)

**`frontend/lib/`:**
- Utilities, types, helpers (no React components)
- API client, WebSocket client, type definitions
- Hooks in `hooks/` subdirectory

**`.planning/codebase/`:**
- GSD analysis documents (this file, ARCHITECTURE.md, CONVENTIONS.md, etc.)
- Generated by `/gsd-map-codebase` agent
- Consumed by `/gsd-plan-phase` and `/gsd-execute-phase`

## Key File Locations

**Entry Points:**
- Backend: `backend/app/main.py` (FastAPI app + lifespan)
- Frontend: `frontend/app/layout.tsx` (root) → `frontend/app/page.tsx` (home)

**Configuration:**
- Backend: `backend/app/config.py` (settings from env)
- Frontend: `frontend/next.config.ts` (Next.js config), `frontend/proxy.ts` (API rewrites)

**Authentication:**
- Backend: `backend/app/auth.py` (cookie/Bearer logic, set_auth_cookie)
- Frontend: `frontend/components/SessionProvider.tsx` (auth context)

**Data Models:**
- Backend ORM: `backend/app/models/` (SQLAlchemy)
- Backend validation: `backend/app/schemas/` (Pydantic)
- Frontend types: `frontend/lib/recipes.ts`, `frontend/lib/votes.ts`, etc.

**Business Logic:**
- Recipe promotion: `backend/app/services/llm.py`
- Voting state: `backend/app/services/voting.py`
- Shortlist generation: `backend/app/services/shortlist.py`
- Scoring algorithm: `backend/app/services/algorithm.py`

**Realtime:**
- Backend: `backend/app/services/realtime.py` (RealtimeRegistry)
- Backend router: `backend/app/routers/ws.py` (WebSocket handler)
- Frontend: `frontend/components/RealtimeProvider.tsx`, `frontend/lib/ws.ts`

**Testing:**
- Backend: `backend/tests/` (pytest)
- Frontend: `frontend/tests/e2e/` (Playwright)
- Seed: `backend/app/cli/seed.py` (`uv run seed`)

**Documentation:**
- `SPEC.md` — Locked data model + capture pipeline
- `CLAUDE.md` — Architecture invariants + deployment rules
- `CONTEXT.md` — Phase definitions, design decisions
- `TESTING.md` — Test strategy (E2E, unit, integration)
- `docs/design-system.html` — UI tokens + locked screens
- `docs/adr/` — Architecture decision records

## Naming Conventions

**Files:**
- **Python modules:** `snake_case.py` (PEP 8)
- **React components:** `PascalCase.tsx`
- **Utilities (TS):** `camelCase.ts`
- **Pages (TS):** `page.tsx`, `layout.tsx` (Next.js convention)
- **Directories:** `lowercase`, plural for collections (`models/`, `components/`, `services/`)

**Functions:**
- **Python:** `snake_case`, `async def` for async
- **TypeScript:** `camelCase` (functions), `PascalCase` (React components, types, enums)
- **Hooks:** `useNoun` pattern (e.g., `useDelayedFlag`, `useSignedPhotoUrl`)

**Variables:**
- **Python:** `snake_case`
- **TypeScript:** `camelCase` (const/let), `PascalCase` (types/enums)

**Types:**
- **Python enums:** `PascalCase` (e.g., `RecipeStatus`, `VoteValue`)
- **TypeScript types:** `PascalCase` (e.g., `Recipe`, `SessionData`)
- **Pydantic models:** suffix `Request`/`Response` (e.g., `RecipeCreateRequest`, `RecipeResponse`)

**Database:**
- **Tables:** `lowercase_plural` (e.g., `recipes`, `members`)
- **Columns:** `snake_case`
- **Enums (SQL):** lowercase (e.g., `recipe_status`, `vote_value`)
- **Indexes:** `idx_<table>_<columns>`

**Routes:**
- **URL paths:** kebab-case (e.g., `/recipes/[id]/edit`, `/cooking-logs`)
- **Query params:** `camelCase`

**Environment Variables:**
- **Format:** `UPPERCASE_SNAKE_CASE` (e.g., `DATABASE_URL`, `GEMINI_API_KEY`)

## Where to Add New Code

### New Feature (e.g., Recipe Export as PDF)

**Backend:**
1. Extend model or create new: `backend/app/models/export.py` (if new table)
2. Add schema: `backend/app/schemas/export.py`
3. Add router or extend: `backend/app/routers/exports.py` (already exists)
4. Add service: `backend/app/services/export.py` (if complex logic)
5. Add tests: `backend/tests/test_exports.py`
6. Create migration (if schema changed): `alembic revision --autogenerate -m "add export table"`

**Frontend:**
1. Add component: `frontend/components/ExportButton.tsx`
2. Add lib utility (if needed): `frontend/lib/exports.ts`
3. Add i18n: `frontend/lib/i18n/fr.json` (namespace: `export.*`)
4. Add route (if new page): `frontend/app/exports/page.tsx`
5. Add E2E test: `frontend/tests/e2e/exports.spec.ts`
6. Update nav if needed: `frontend/components/BottomNav.tsx`

### New Component/Module

**Backend Service:**
- Location: `backend/app/services/<feature>.py`
- Pattern: Pure functions, no ORM models exported
- Example: `backend/app/services/voting.py` → imported by `routers/votes.py`

**Frontend Component:**
- Location: `frontend/components/<Feature>.tsx` (or `frontend/components/<FeatureName>/index.tsx` for complex)
- Pattern: Default or named export; Tailwind classes only (no inline styles)
- Example: `frontend/components/ShortlistCard.tsx` → used by HomeDecide

**Frontend Hook:**
- Location: `frontend/lib/hooks/use<Name>.ts`
- Pattern: Custom hook; return state + methods
- Example: `frontend/lib/hooks/useDelayedFlag.ts`

### Utilities (Shared Helpers)

**Backend:**
- Location: `backend/app/services/` (business logic) or `backend/app/` module
- Example: `backend/app/colors.py` (MEMBER_COLORS)

**Frontend:**
- Location: `frontend/lib/<feature>.ts`
- Pattern: Functions + types; no side effects
- Example: `frontend/lib/recipes.ts` (Recipe type + helpers)

## Special Directories

**`backend/alembic/`:**
- Purpose: Database migrations
- Generated: Yes (via `alembic revision --autogenerate`)
- Committed: Yes (all .py files)

**`backend/tests/`:**
- Purpose: Python unit tests
- Generated: No
- Committed: Yes

**`frontend/.next/`:**
- Purpose: Next.js build output
- Generated: Yes (dev server or `npm run build`)
- Committed: No

**`frontend/node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (via `npm install`)
- Committed: No; use `package-lock.json` instead

**`.planning/phases/`:**
- Purpose: GSD per-phase artifacts
- Generated: Yes
- Committed: Yes (audit trail)

## Path Aliases

**Backend:**
- No aliases (direct: `from app.models import Recipe`)

**Frontend:**
- `@/*` → `frontend/` (e.g., `import { Recipe } from '@/lib/recipes'` → `frontend/lib/recipes.ts`)

## Monorepo Integration

**Dependency flow:**
- Frontend depends on backend API (HTTP + WebSocket)
- Backend depends on Supabase Postgres + Gemini API
- Backend does NOT depend on frontend

**Deployment:**
- Frontend: Vercel (auto-deploy on push)
- Backend: Railway (auto-deploy on push)
- Database: Supabase (managed; migrations pre-deploy)

**Environment:**
- `backend/.env` and `frontend/.env.local` (never committed; local overrides)
- `backend/.env.example` and `frontend/.env.example` (committed; templates)

---

*Structure analysis: 2026-05-19*
