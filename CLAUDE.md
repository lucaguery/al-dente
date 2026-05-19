# CLAUDE.md

Guidance for Claude Code working in this repo. Keep this file short — it's loaded into every turn.

## Source of truth

- **`.planning/PROJECT.md`** — current state, milestone goals, requirements, key decisions. **Read first.** Refreshed via `/gsd-transition`.
- **`.planning/STATE.md`** — live position: current milestone, phase, plan, progress.
- **`SPEC.md`** — historical v0.1 spec: data model, capture pipeline, scoring algorithm, voting state machine, original 4-wave build plan. Status banners flag superseded sections inline. Read before designing new features. The auth section is superseded by [ADR-0002](docs/adr/0002-httponly-cookie-auth.md); see invariant 8 below.
- **`CONTEXT.md`** — locked domain vocabulary (capture / turn / thread / advisory / semantic vs manual editing). Read before naming new concepts.
- **`docs/adr/`** — architectural decision records (Why / Considered alternatives / Consequences). Read when designing in a load-bearing surface; new decisions get their own ADR.
- **`backend/CLAUDE.md`** — backend-specific rules (ORM/migration conventions, `uv` workflow, Gemini SDK correction, Railway migration deploy contract). Load when working in `backend/`.
- **`frontend/CLAUDE.md`** — frontend-specific rules (Next.js 16 breaking changes, lint/formatter authority, path alias, webpack build flag, E2E test posture). Load when working in `frontend/`.
- **`.planning/CLAUDE.md`** — GSD workflow enforcement. Load when working in `.planning/` or running GSD commands.
- **`docs/design-system.html`** — living design system reference (Sober Kitchen). Locked tokens (terracotta sober + Cormorant + Caveat), patine cards, table-à-manger voting, marginalia register, brand-mark loader, plus locked screens for Accueil / Bibliothèque / Recette with porting checklist. Open in browser before designing new UI; do not duplicate its decisions in ad-hoc CSS.
- **`RUNBOOK.md`** — operator runbook for the prod-synthetic seed (refresh / verify / teardown).
- **`TESTING.md`** — local E2E bootstrap (4-command synthetic seed) + D-12 regression canary procedure.

## Repo layout

Monorepo, two independently deployable apps, shared Supabase Postgres:

- `frontend/` — Next.js 16 App Router PWA → Vercel.
- `backend/` — FastAPI in `app/`: routers (`households`, `auth_session`, `recipes`, `exports`, `photos`, `shortlist`, `votes`, `cooking_logs`, `push`, `ws`), SQLAlchemy 2.0 models in `app/models/`, Pydantic schemas in `app/schemas/`, business logic in `app/services/` (`llm`, `algorithm`, `shortlist`, `realtime`, `voting`, `storage`, `push`, `invite_codes`), Alembic migrations in `alembic/versions/`. → Railway.
- `.planning/` — GSD workflow artifacts (PROJECT.md, STATE.md, ROADMAP.md, milestones/, phases/, intel/).

## MVP phase posture

The project is in MVP. **No backward-compatibility shims for breaking schema or API changes.** Do clean rewrites: drop old column / endpoint / type, add new shape, rewrite callers in the same change. Don't propose "stub" or "both-paths-live" variants. Single Alembic migration + single commit is fine. This rule expires when the project leaves MVP (look for an explicit decision in `.planning/PROJECT.md`).

## Architecture invariants

Cross-cutting rules that are easy to break by editing one file in isolation:

1. **Five capture surfaces, one shape.** `quick`, full-form, `voice`, `photo`, `url` all `POST /recipes/<surface>`, all return a `draft` immediately, all promotion runs **server-side** in a FastAPI `BackgroundTask` (quick and full-form moved from sync `structured`-on-return to BackgroundTask-based rewrite in v0.5 RID-04 — see `.planning/phases/24-recipe-identity/`). Never promote drafts client-side. WebSocket broadcasts when status flips to `structured`.
2. **Voting state is computed, not stored.** The 5 states (Validé / Pressenti / Contesté / Rejeté / Sans avis) derive from rows in `votes` for `(shortlist_id, recipe_id)` via `services/voting.compute_vote_state`. Don't add a `state` column. The veto window closes on first `CookingLog` for the day.
3. **Denormalized fields on `recipes`.** `last_cooked_at` and `cook_count` update in the same DB transaction as the `cooking_logs` insert. Don't compute on read.
4. **Realtime contract.** All household-affecting mutations broadcast via `services/realtime.broadcast_to_household` (`recipe.created`, `recipe.promoted`, `recipe.updated`, `turn.created`, `turn.updated`, `vote.created`, `cooking_log.*`, …). New mutations that should sync between phones must broadcast too. `turn.created` fires from the thread endpoints in `routers/recipes.py` at POST time; `turn.updated` fires from `services/llm.extract_and_process_url_turn` when the BackgroundTask backfills `extracted_html_path` (D-29 — never re-broadcast `turn.created` for the same turn).
5. **Raw inputs kept forever.** `recipes.source_capture` JSONB stores original transcript / URL / photo paths so prompts can be re-run with a better model later. Don't discard.
6. **French-only via `next-intl`, day one.** All user-facing strings go through `next-intl`. Hardcoded strings are productize-later debt — avoid.
7. **Single uvicorn worker.** APScheduler runs in-process (one cron job per household at 16:00 household-tz, registered in the `app/main.py` lifespan). Multiple workers would create N duplicate jobs. See `.planning/phases/03-decide-w3/03-RESEARCH.md` Pitfall 1.
8. **HttpOnly cookie auth, not Bearer header.** Phase 01.1 migrated from `localStorage` Bearer tokens (the SPEC.md scheme) to the same-origin `aldente_auth` HttpOnly cookie (iOS Safari evicts `localStorage` on PWA force-quit). API calls flow through Next.js rewrites in `frontend/proxy.ts` so the cookie is same-origin in production. CORS in `backend/app/main.py` allows credentials for cross-origin local dev only.

## Locked vocabularies

`Season`, `Cuisine`, `Mood`, `Protein`, `Difficulty` (Phase 24 RID-02), recipe `status`, vote `value` — defined in **both** `frontend/lib/enums.ts` and the Python `Enum` classes in `backend/app/models/enums.py`. **Drift between the two is a bug category.** Update both in the same change. The v0.2.1 seed script imports the Python enums directly to avoid duplicating values.

## Productize-later TODOs

`# TODO(productize)` (Python) / `// TODO(productize)` (TS) marks features explicitly cut from the current milestone but on the productize roadmap. Distinguish from plain `# TODO` (intra-version work). See `.planning/PROJECT.md` §Out of Scope for committed cuts.

## Deployment

- **Push to `main` is the only deploy path.** Both apps auto-deploy in ~60s. **Never run `vercel --prod` or manual Railway deploys.**
- Hosting: Vercel (frontend, free) + Railway (backend, ~$5/mo) + Supabase (Postgres + Storage, free). Couple-scale workload assumed throughout.

## Doc lifecycle

Who/what updates which doc. Hand-editing a doc inside a tool-managed region wastes work — the refresh will clobber it.

- This file's `<!-- GSD:* -->` blocks — auto-refreshed by `/gsd-docs-update`. Edit source files in `.planning/codebase/*` and `.planning/PROJECT.md` instead, then re-run.
- `.planning/PROJECT.md` — `/gsd-new-milestone` at scoping, `/gsd-complete-milestone` at close.
- `.planning/STATE.md` — `/gsd-*` commands at phase / plan transitions.
- `.planning/MILESTONES.md` (source-of-truth for milestone history) + `.planning/ROADMAP.md` (rolled-up index) — updated at milestone close.
- `CONTEXT.md` — `/grill-with-docs` when a domain term gets pinned.
- `docs/adr/*` — `/grill-with-docs` or manual when a decision lands. YAML front-matter `status: accepted | superseded | historical | draft`.
- `SPEC.md` — historical (v0.1 spec). Inline supersede banners point at ADRs; not rewritten in place.
- `.planning/codebase/*` — refreshed by `/gsd-map-codebase`. Each file carries a `Snapshot: <date>` line.
- `graphify-out/` — refreshed by `graphify update .` after code changes (AST-only, no API cost).
- `README.md`, `RUNBOOK.md`, `TESTING.md` — manual; YAML front-matter `last_verified` field.

Run `scripts/docs-audit` anytime to see a freshness table (every T1/T4/T5 doc with its `last_verified` / `Snapshot` age). Exits nonzero if any doc is ≥ 60 days stale — wire into CI if you want a hard gate.

<!-- GSD:project-start source:PROJECT.md -->

## Project

**Al Dente**

A shared recipe + decision app for couples, built as an installable PWA with a Python backend. Audience is "just us" (Luca + partner) — clean enough to productize later, built first to eliminate the daily "on mange quoi ?" debate in our own household.

**Core Value:** Eliminate the daily "on mange quoi ?" debate via a shared library, async voting, and voice/photo capture — installable on both iPhones with no App Store, no $99/year, no native build.

### Constraints

- **Tech stack**: Next.js 16.2.4 + React 19.2.4 + TypeScript 5 + Tailwind v4 + shadcn/ui + `next-pwa` + `framer-motion` (frontend); FastAPI + Pydantic + SQLAlchemy 2.0 + Alembic + `google-generativeai` (Gemini 2.5 Flash) + APScheduler (backend); Supabase Postgres + Storage. Pinned in SPEC.md §Stack.
- **Distribution**: PWA only — installed via Safari → Add to Home Screen. $0/year.
- **Hosting**: Vercel (frontend, free tier) + Railway (backend, ~$5/mo) + Supabase (Postgres + Storage, free tier).
- **Localization**: French only. All strings via `next-intl` — hardcoded strings are productize-later debt.
- **Audience**: Single household (Luca + partner). Multi-tenant cleanliness preserved for productize-later.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript 5.x — all frontend source (`frontend/`)
- Python 3.12 — all backend source (`backend/`)
- CSS (Tailwind v4 utility classes) — `frontend/app/globals.css`, component files

## Runtime

- Node.js 20+ (declared via `@types/node: ^20` in `frontend/package.json`)
- Python 3.12 (enforced in `backend/pyproject.toml`: `requires-python = ">=3.12"`)
- `ZoneInfo` stdlib used for household timezone scheduling
- `npm` — frontend (`frontend/package.json`, lockfile present)
- `uv` — backend (`backend/pyproject.toml`, `backend/uv.lock` present; `hatchling` build backend)

## Frameworks

- Next.js 16.2.4 — App Router, PWA shell, API rewrites proxy to Railway backend (`frontend/proxy.ts`)
- React 19.2.4 — UI rendering
- Tailwind CSS v4 — utility-first styling (PostCSS plugin: `@tailwindcss/postcss ^4`)
- FastAPI `>=0.136.1` (standard extras) — HTTP + WebSocket API (`backend/app/main.py`)
- SQLAlchemy 2.0 typed style — ORM (`backend/app/models/`)
- Alembic `>=1.13` — database migrations (`backend/alembic/versions/`)
- Pydantic v2 + pydantic-settings v2 — schema validation and settings (`backend/app/config.py`, `backend/app/schemas/`)
- Uvicorn `>=0.46.0` (standard extras) — ASGI server, **single worker** (invariant — APScheduler is in-process)
- Playwright `^1.59.1` — E2E tests (`frontend/tests/e2e/`, config at `frontend/playwright.config.ts`)
- pytest `>=8.0` + pytest-asyncio `>=0.24` — backend unit/integration tests (`backend/tests/`)
- `next build --webpack` — intentional webpack build (not Turbopack); set in `frontend/package.json` scripts
- ESLint 9 flat config — lint authority (no Prettier); config at `frontend/eslint.config.mjs`

## Key Dependencies

- `next-intl ^4.11.0` — French-only i18n; all user-facing strings route through this (`frontend/`)
- `framer-motion ^12.38.0` — animations throughout UI
- `@ducanh2912/next-pwa ^10.2.9` — PWA manifest + service worker
- `partysocket ^1.1.18` — WebSocket client for realtime household sync (`frontend/components/RealtimeProvider.tsx`)
- `sonner ^2.0.7` — toast notifications
- `next-themes ^0.4.6` — theme support
- Radix UI suite (`@radix-ui/react-dialog ^1.1.15`, `@radix-ui/react-select ^2.2.6`, `@radix-ui/react-tabs ^1.1.13`, `@radix-ui/react-alert-dialog ^1.1.15`, `@radix-ui/react-label ^2.1.8`, `@radix-ui/react-scroll-area ^1.2.10`, `@radix-ui/react-separator ^1.1.8`, `@radix-ui/react-slot ^1.2.4`)
- `radix-ui ^1.4.3` — umbrella Radix package
- `shadcn ^4.6.0` — component scaffolding CLI
- `class-variance-authority ^0.7.1`, `clsx ^2.1.1`, `tailwind-merge ^3.5.0` — variant/class utilities
- `lucide-react ^1.14.0` — icons
- `tw-animate-css ^1.4.0` — animation utilities
- `google-genai >=1.75` — Gemini LLM SDK; unified SDK (NOT legacy `google-generativeai`); imports as `from google import genai`; primary use in `backend/app/services/llm.py` (59 KB)
- `supabase >=2.0` — Supabase Python client for Storage bucket access (`backend/app/services/storage.py`)
- `psycopg2-binary >=2.9.12` — PostgreSQL driver
- `apscheduler >=3.11` — in-process `AsyncIOScheduler`; registers per-household 16:00 shortlist cron job in `backend/app/main.py` lifespan
- `pywebpush >=2.3` + `py-vapid >=1.9` — Web Push VAPID fan-out (`backend/app/services/push.py`)
- `trafilatura >=2.0.0` + `lxml >=6.1.0` — HTML extraction for URL-capture recipes (`backend/app/services/llm.py`)
- `httpx >=0.28.1` — async HTTP client
- `python-multipart >=0.0.27` — multipart form / file upload support (photo capture)
- `graphifyy >=0.8.13` — knowledge graph tooling (dev only)
- `pytest >=8.0` + `pytest-asyncio >=0.24` — test runner

## Configuration

- `pydantic-settings` `BaseSettings` reads from `.env` at startup
- Required: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`
- Web Push VAPID: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`
- Optional: `DATABASE_URL_TEST` (test-mode override), `CORS_ALLOWED_ORIGINS`, `ENVIRONMENT`
- Test-mode override: when `ENVIRONMENT=test` and `DATABASE_URL_TEST` is set, `settings.database_url` is overwritten in-place at import time (covers both `db.py` and `alembic/env.py`)
- Standard Next.js `.env.local` / `.env` pattern
- API calls proxy through `frontend/proxy.ts` (Next.js rewrites) to keep `aldente_auth` HttpOnly cookie same-origin
- Frontend: `next build --webpack` (Turbopack explicitly excluded)
- Backend: Railway runs `alembic upgrade head` before uvicorn restart on each deploy

## Platform Requirements

- Node 20+
- Python 3.12 via `uv`
- Supabase project (Postgres + Storage bucket `recipe-photos`)
- Docker Compose for isolated test environment (`docker-compose.test.yml`)
- Frontend: Vercel (free tier) — auto-deploys on push to `main`
- Backend: Railway (~$5/mo) — single uvicorn worker required (multi-worker would duplicate APScheduler jobs); auto-deploys on push to `main`
- Database + Storage: Supabase (free tier)
- Deploy path: push to `main` only — never run `vercel --prod` or manual Railway CLI deploys

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- Frontend components: PascalCase `.tsx` (e.g., `PhotoUploader.tsx`, `HomeDecide.tsx`, `BrandIcon.tsx`)
- Frontend utilities/hooks: camelCase `.ts` (e.g., `useSignedPhotoUrl.ts`, `cooking.ts`, `api.ts`)
- Backend models: PascalCase `.py` (e.g., `recipe.py`, `cooking_log.py`, `household.py`)
- Backend routers: snake_case `.py` (e.g., `auth_session.py`, `cooking_logs.py`, `recipes.py`)
- Backend services: snake_case `.py` (e.g., `llm.py`, `voting.py`, `storage.py`, `shortlist.py`)
- Test files: `test_*.py` (backend) and `*.spec.ts` (frontend Playwright)
- Frontend: camelCase (e.g., `useSignedPhotoUrl`, `clearLegacyLocalStorage`, `getSignedPhotoUrl`)
- Backend: snake_case (e.g., `compute_vote_state`, `acquire_position_lock`, `upload_recipe_photo`, `promote_draft`)
- Private/internal functions prefixed with underscore: `_process_thread_turn`, `_record_failure`, `_guard_environment`, `_apply_put_pinning`
- Frontend: camelCase (e.g., `recipeId`, `authToken`, `cookingLogId`, `src`)
- Backend: snake_case (e.g., `promotion_error`, `manually_edited_fields`, `source_capture`, `photo_paths`)
- Constants: UPPERCASE_SNAKE_CASE (e.g., `MAX_PHOTOS = 4`, `SEED_TOKEN`, `API_BASE`, `MAX_BYTES`)
- Frontend: PascalCase (e.g., `RecipeResponse`, `Season`, `TurnKind`, `AnswerField`)
- Backend SQLAlchemy models: PascalCase (e.g., `Recipe`, `Member`, `Vote`, `CookingLog`)
- Backend Enums: PascalCase (e.g., `RecipeStatus`, `TurnSender`, `VoteState`, `Cuisine`)
- Python type unions/literals: lowercase native types (e.g., `str | None`, `list[str]`)

## Code Style

- ESLint flat config (`frontend/eslint.config.mjs`) is the sole authority for style enforcement
- Extends `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- NO Prettier — ESLint handles formatting exclusively
- Run `npm run lint` to check (no automatic fix via `--fix`)
- TypeScript strict mode enforced throughout
- Next.js 16.2.4 with breaking changes documented in `frontend/CLAUDE.md`
- Indentation: 2 spaces (Next.js default)
- Python 3.12 via `uv` package manager
- No explicit formatter configured; follow existing code patterns (snake_case functions/variables, PascalCase classes)
- Type hints required throughout (SQLAlchemy 2.0 mapped-column style with `Mapped[T]`)
- Pydantic v2 for schema validation
- Async/await used for FastAPI endpoint handlers and BackgroundTask work
- Frontend: ESLint only (`frontend/eslint.config.mjs`) — NOT Prettier
- Backend: No linter configured; style via convention and code review

## Import Organization

- `@/*` resolves to `frontend/` root (defined in `frontend/tsconfig.json`)
- Used throughout for absolute imports: `@/lib/api`, `@/components/ui/button`, `@/lib/hooks/useSignedPhotoUrl`
- Never use relative imports (`../../../`) — use `@/` instead

## Error Handling

- Errors thrown by `api()` utility (`lib/api.ts`) are caught by consumers
- 401 responses trigger automatic session clear (`DELETE /api/auth/session`) + redirect to `/onboarding/welcome`
- Network errors result in `Error` with descriptive message (e.g., `"unauthorized"`, `"404 Not Found"`)
- Components may use try/catch around async operations and surface errors via `toast()` from `sonner`
- Silent fallbacks used when appropriate (e.g., `useSignedPhotoUrl` falls back to placeholder SVG on fetch failure)
- Errors raised as `HTTPException(status_code=..., detail=...)` with appropriate status codes
- Database errors surface as 500 (unrecoverable) or 400 (validation/constraint violations)
- Cross-household reads return 404 (not 403) to avoid leaking record existence (invariant #4)
- All endpoints list expected exceptions in module docstrings (see `backend/app/routers/recipes.py` top of file)
- Logging via module-level logger: `log = logging.getLogger(__name__)`

## Logging

- Module-level logger: `log = logging.getLogger(__name__)` at top of each service/router
- Log business-logic outcomes and errors: status transitions, major decision points
- Log at WARNING or ERROR when exceptions occur; DEBUG for state details
- Log at INFO for major operations (seed startup, migration stages, scheduler job execution)
- Guard long-running operations with timing/state info (BackgroundTasks, scheduler runs)
- No PII in logs (UUIDs may be logged, but never auth tokens or email addresses)
- Example: `log.error(f"Failed to promote recipe {recipe_id}: {str(e)}")`
- Console errors/warnings arise from third-party libraries (Web Speech API stubs, animation warnings)
- Per TESTING.md Pitfall 10: no spec asserts on `consoleErrors` — expected noise is acceptable
- Use `toast()` from `sonner` for user-facing error/success messages, not `console.error()` or `console.log()`
- `console.log()` acceptable for debugging during development; remove before committing

## Comments

- Non-obvious business logic tied to invariants or constraints (e.g., "Order matters — must be identical to the frontend mirror at frontend/lib/votes.ts")
- Architectural invariant enforcement (e.g., "Architecture invariant #2: voting state is COMPUTED from rows, never stored")
- Workarounds and known limitations (e.g., "Phase 30 BUG-01 — per-tile component so each slot can call useSignedPhotoUrl independently")
- Phase-specific decisions or deferred work (e.g., "Phase 28 DETAIL-05 owns the write path")
- References to external decision documents: "Plan 16-03 Task 1", "SPEC.md §Voting", "CLAUDE.md Architecture invariant #3", "CONTEXT.md D-12"
- Tricky algorithmic logic (e.g., vote state machine branch order)
- Frontend components: rarely used; type signatures and prop interfaces are sufficient
- Frontend hooks: include brief docstring explaining contract (see `useSignedPhotoUrl.ts` for example)
- Backend services: used for functions with complex behavior or architectural significance
- Backend models: docstrings on classes explaining constraints and column defaults

## Function Design

- Frontend: destructured object props over positional arguments (React convention). Example: `function PhotoUploader({ recipeId, paths, onChange }: Props)`
- Backend: positional arguments for required params, keyword-only for optional (`*, optional_param=None`)
- Dependency injection used in FastAPI routes via `Depends()` (e.g., `current_member: Member = Depends(current_member)`, `db: Session = Depends(get_db)`)
- Functions return data, not side effects
- Async functions (backend BackgroundTasks) return `None` after completing side effects
- Error cases: raise exceptions (HTTPException for API routes, standard exceptions for services)
- Polling/retry logic: return computed state (e.g., `VoteState` enum value, not a boolean)
- Frontend hooks return objects with clear contracts (e.g., `{ src: string | null; onError: () => void }`)

## Module Design

- Components export a single React component (default or named): `export default function PhotoUploader(props) { ... }`
- Utilities export named functions and types: `export function api<T>(...) { ... }`, `export type Season = ...`
- Hooks export single hook (default): `export function useSignedPhotoUrl(...) { ... }`
- Services export helper functions and classes: `def compute_vote_state(...)`, `class VoteState(enum.Enum)`
- Routers export a single `router: APIRouter` instance with prefix (e.g., `router = APIRouter(prefix="/recipes", tags=["recipes"])`)
- Models define SQLAlchemy table classes with `__tablename__` and mapped columns

## Locked Vocabularies

- Frontend: `frontend/lib/enums.ts`
- Backend: `backend/app/models/enums.py`
- `Season` (spring, summer, autumn, winter)
- `Cuisine` (italian, french, asian, mediterranean, middleEastern, indian, mexican, northAfrican, american, other)
- `Mood` (comfort, light, quick, celebratory, adventurous)
- `Protein` (poultry, redMeat, fish, seafood, egg, legume, none)
- `Difficulty` (easy, medium, hard) — Phase 24 RID-02
- `TurnSender` (user, system) — Phase 25 THREAD-01
- `TurnKind` (text, voice, photo, url, answer, proposal_accepted, proposal_dismissed, summary, question, advisory) — Phase 25+
- `AnswerField` (13 pinnable recipe fields) — Phase 28 DETAIL-05
- String values are identical in both files (e.g., `"italian"` not `"Italian"`)
- Python uses snake_case for Python attribute names but string values match camelCase where needed (e.g., `middle_eastern = "middleEastern"`)
- When adding a new locked vocabulary, update BOTH files in the same commit

## Architecture Invariant Enforcement

## Enum Mirroring Pattern

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

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

- **Cross-household isolation:** Every query filters by `member.household_id` (derived from auth token / cookie)
- **Async server-side promotion:** Recipe capture (voice/photo/url) returns `draft` immediately; BackgroundTask runs Gemini promotion in the background
- **Realtime sync via WebSocket:** All household-affecting mutations broadcast via `services/realtime.broadcast_to_household`
- **Computed voting state:** No `state` column stored; state (Validé/Pressenti/Contesté/Rejeté/Sans avis) derived on read from `votes` table rows
- **Denormalized timestamps:** `recipes.last_cooked_at` and `recipes.cook_count` updated atomically with `cooking_logs` insert (invariant #3)
- **Raw inputs preserved forever:** `recipe_turns` table stores original transcript/URL/photo_paths; enables re-promotion with better LLM model
- **Single uvicorn worker:** APScheduler runs in-process (one cron per household); multiple workers would duplicate jobs

## Layers

- **Purpose:** Mobile-optimized decision + capture interface for two household members
- **Location:** `frontend/`
- **Contains:** 
- **Depends on:** Backend HTTP endpoints, WebSocket `/ws` for realtime sync
- **Used by:** Two household members on iPhones (Safari → Add to Home Screen PWA installation)
- **Purpose:** HTTP/WebSocket adapter; request validation; auth gate; response serialization
- **Location:** `backend/app/routers/`
- **Contains:** 
- **Depends on:** Database, services
- **Used by:** Frontend via HTTP + WebSocket
- **Purpose:** Domain logic; orchestration; external API calls; state computation
- **Location:** `backend/app/services/`
- **Contains:**
- **Depends on:** Database, Gemini SDK, httpx
- **Used by:** Routers (via BackgroundTasks), cron jobs
- **Purpose:** Postgres interaction; query building; transaction management
- **Location:** `backend/app/models/`, `backend/app/schemas/`
- **Contains:**
- **Depends on:** Postgres (Supabase)
- **Used by:** Services and routers
- **Purpose:** Canonical store for all application state
- **Location:** Supabase (managed Postgres); migrations in `backend/alembic/versions/`
- **Contains:** 
- **Constraints:** Foreign keys (cascade delete on household), unique invite_code, unique (shortlist_id, recipe_id, member_id) on votes

## Data Flow

### Recipe Capture → Promotion → Broadcast

### Daily Shortlist Generation

### Voting Flow

### Cooking Initiated

### Authentication (Cookie-First)

- **Frontend:** React Context (SessionProvider, RealtimeProvider) holds singleton auth + WebSocket client; useSyncExternalStore prevents double-subscribe
- **Backend:** Postgres is single source of truth; no in-memory cache
- **WebSocket:** In-process RealtimeRegistry (Dict[household_id → Set[WebSocket]]); single-worker assumption

## Key Abstractions

- **Purpose:** Isolation boundary for two members and their shared recipe library
- **Examples:** `models/household.py`, `routers/households.py`
- **Pattern:** Every query filters by `WHERE household_id = :hh_id` derived from `member.household_id`; cross-household leaks prevented by 404 on detail not found (no 403)
- **Purpose:** Track capture fidelity; control shortlist eligibility; signal errors
- **Enum:** `draft` → `structured` → `verified` (future), or `draft` → `failed` (on LLM error)
- **Pattern:** Only `structured` or `verified` recipes appear in shortlist candidate pool (hard filter in algorithm.py); frontend filters by status when displaying library
- **Purpose:** Preserve original input verbatim (transcript, URL, photo_paths, structured answers); enable re-promotion with new model; conversation history thread
- **Examples:** `models/recipe_turn.py`, `routers/recipes.py` (POST /recipes/{id}/turns)
- **Pattern:** First user turn (position=0) stores immutable capture payload; LLM turns (position≥1) store extracted/processed output; structured answers (answer fields) store user confirmations
- **Purpose:** Single source of truth is rows in `votes` table; no dual-write corruption risk
- **Pattern:** `compute_vote_state(votes_for_recipe, member_count)` queries votes and returns enum (Validé=both yes, Pressenti=one yes one no, Contesté/Rejeté/Sans avis)
- **Rationale:** Voting state depends on household size and member positions; derivation avoids out-of-sync state
- **Purpose:** Enable efficient "last cooked" sorting without subquery or window function
- **Pattern:** `recipes.last_cooked_at` and `recipes.cook_count` updated in same transaction as `cooking_logs` INSERT
- **Constraint:** Must be atomic; never update one without the other (invariant #3)
- **Purpose:** Store original user input (transcript, URL, photo paths, manually entered values) so Gemini prompt can be re-run later
- **Examples:** `{ type: 'voice', payload: { transcript: '...' } }`, `{ type: 'url', payload: { url: '...' } }`
- **Pattern:** Never discard raw input; production-ready productize-later path includes LLM prompt versioning

## Entry Points

- **Location:** `frontend/app/page.tsx` (Home / Shortlist tab)
- **Triggers:** User opens app URL in Safari or taps home-screen PWA icon
- **Responsibilities:** 
- **Location:** `backend/app/main.py` (FastAPI app instantiation)
- **Triggers:** Frontend HTTP requests + WebSocket upgrades
- **Responsibilities:**
- **Location:** `frontend/components/RecipeForm.tsx` (manual entry), `frontend/components/RecipeThread/Composer.tsx` (thread bubbles)
- **Triggers:** User submits form, voice input, photo upload, or URL paste
- **API Contract:** POST /recipes (blank draft), then POST /recipes/{id}/turns (conversational turns), then POST /recipes/{id}/promote (coalescing trigger)
- **Responsible For:**
- **Location:** `backend/app/routers/ws.py` (WebSocket route handler)
- **Triggers:** Browser opens WebSocket to `wss://api.aldente.app/ws` or direct Railway URL
- **Responsibilities:**
- **Location:** `backend/app/services/shortlist.generate_daily_shortlist`
- **Triggers:** 16:00 per-household timezone (registered in main.py lifespan)
- **Responsibilities:**

## Architectural Constraints

- **Threading:** Single uvicorn worker (APScheduler runs in-process; multiple workers → duplicate cron jobs)
- **Global state:** Module-level `scheduler` singleton in `main.py`; RealtimeRegistry singleton in `services/realtime.py`; clientSingleton in `frontend/components/RealtimeProvider.tsx`
- **Circular imports:** Auth module (`app.auth`) imports Member model lazily in `current_member` function to avoid circular dependency during Alembic initialization
- **Cross-origin WebSocket:** Frontend tries direct Railway URL first (Vercel function timeout workaround), falls back to same-origin Vercel rewrite
- **Async I/O:** Backend uses sync engine (psycopg2) + sync SQLAlchemy; no asyncio overhead justified for couple-scale workload
- **Single-process scheduler:** APScheduler in-process; productize-later: switch to external APScheduler daemon or Celery for multi-worker scaling

## Error Handling

- **LLM promotion failure:** Exceptions caught in BackgroundTask; recorded on recipe.promotion_error field; frontend shows error badge; no broadcast
- **WebSocket dead socket:** Unregistered immediately; broadcast continues for remaining peers (no raise-on-failure)
- **Auth failure:** 401 Unauthorized on missing/invalid token; frontend redirects to onboarding
- **Cross-household access:** 404 Not Found (not 403 Forbidden) to avoid leaking existence
- **Database constraint violations:** 400 Bad Request (e.g., recipe not in shortlist), 409 Conflict (e.g., color taken on join), 422 Unprocessable Entity (household_full)
- **Startup failures:** Logged as warnings; continue (scheduler may fail to register cron; bucket may not exist; both are productize-later)

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->
