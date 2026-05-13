# CLAUDE.md

Guidance for Claude Code working in this repo. Keep this file short — it's loaded into every turn.

## Source of truth

- **`.planning/PROJECT.md`** — current state, milestone goals, requirements, key decisions. **Read first.** Refreshed via `/gsd-transition`.
- **`.planning/STATE.md`** — live position: current milestone, phase, plan, progress.
- **`SPEC.md`** — locked data model, capture pipeline, scoring algorithm, voting state machine, auth scheme, original 4-wave build plan. Read before designing new features. Note: the auth scheme there has been superseded — see invariant 8 below.
- **`frontend/AGENTS.md`** — Next.js 16 has breaking changes that may not be in your training data. Consult `frontend/node_modules/next/dist/docs/` before writing frontend code.
- **`docs/design-system.html`** — living design system reference (Sober Kitchen). Locked tokens (terracotta sober + Cormorant + Caveat), patine cards, table-à-manger voting, marginalia register, brand-mark loader, plus locked screens for Accueil / Bibliothèque / Recette with porting checklist. Open in browser before designing new UI; do not duplicate its decisions in ad-hoc CSS.

## Repo layout

Monorepo, two independently deployable apps, shared Supabase Postgres:

- `frontend/` — Next.js 16 App Router PWA → Vercel.
- `backend/` — FastAPI in `app/`: routers (`households`, `auth_session`, `recipes`, `exports`, `photos`, `shortlist`, `votes`, `cooking_logs`, `push`, `ws`), SQLAlchemy 2.0 models in `app/models/`, Pydantic schemas in `app/schemas/`, business logic in `app/services/` (`llm`, `algorithm`, `shortlist`, `realtime`, `voting`, `storage`, `push`, `invite_codes`), Alembic migrations in `alembic/versions/`. → Railway.
- `.planning/` — GSD workflow artifacts (PROJECT.md, STATE.md, ROADMAP.md, milestones/, phases/, intel/).

## Current state

v0.5 (Mixed Sweep) shipped 2026-05-13. **No active milestone** — see `.planning/PROJECT.md` for next-milestone scoping and `.planning/STATE.md` for live position. Treat any "not yet wired" / "intended" / "stub" language in older planning notes as historical.

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
- Railway runs `alembic upgrade head` before uvicorn restart on each deploy.
- Hosting: Vercel (frontend, free) + Railway (backend, ~$5/mo) + Supabase (Postgres + Storage, free). Couple-scale workload assumed throughout.

## Tests

`@playwright/test` is wired; specs in `frontend/tests/e2e/`, config in `frontend/playwright.config.ts`. **v0.2.1 Phase 10 is the milestone expanding this** — committed full-screen coverage plus an idempotent backend seed (`uv run seed`). No Python test runner yet.

## Gemini SDK

Uses **`google-genai`** (the new unified Google AI SDK), not the legacy `google-generativeai`. Imports look like `from google import genai`. If your training data references `google.generativeai`, that's the wrong SDK for this repo.

<!-- GSD:project-start source:PROJECT.md -->
## Project

See `.planning/PROJECT.md` — the live source for project description, constraints, current milestone, and key decisions. This block is intentionally slim so GSD's doc-update tooling can refresh it. Don't expand inline.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

Authoritative versions live in `frontend/package.json` and `backend/pyproject.toml`. Highlights: Next.js 16.2.4 + React 19.2.4 + Tailwind v4 + shadcn/ui + framer-motion + next-pwa + next-intl on the frontend; FastAPI + SQLAlchemy 2.0 + Alembic + google-genai + APScheduler + pywebpush on the backend; Python 3.12 via `uv`; Node 20+.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

- **Frontend:** ESLint flat config (`frontend/eslint.config.mjs`) is the formatter authority — no Prettier. TypeScript strict. Path alias `@/*` → `frontend/`. Build is `next build --webpack` intentionally (not Turbopack).
- **Backend:** `uv`-managed Python 3.12. SQLAlchemy 2.0 typed style. Pydantic v2. APScheduler in-process (single worker — invariant 7).
- **Comments:** Explain *why*, not *what*. Document non-obvious business logic, workarounds, and known limitations only.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

See **Architecture invariants** above for the load-bearing rules. High-level: backend owns all mutations; frontend is a vote/capture interface; capture promotion is async server-side via `BackgroundTask`; realtime sync is FastAPI WebSocket broadcast (`services/realtime.py`); auth is HttpOnly cookie via same-origin Next.js rewrites. Full data model + capture pipeline in `SPEC.md`.
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
