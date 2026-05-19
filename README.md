---
status: accepted
last_verified: 2026-05-19
audience: developer
---

# Al Dente

A shared recipe + decision app for couples, built as an installable PWA with a Python backend. Audience is "just us" (Luca + partner) — clean enough to productize later, built first to eliminate the daily *"on mange quoi ?"* debate in our own household.

## Core value

Eliminate the daily *"on mange quoi ?"* debate via a shared library, async voting, and voice/photo capture — installable on both iPhones with no App Store, no $99/year, no native build.

## Status

MVP. Self-hosted by author + partner. Not for redistribution. v0.7.1 Sober Kitchen Finish shipped 2026-05-18 — current live position in [`.planning/STATE.md`](.planning/STATE.md).

## Stack

Frontend: Next.js 16 (App Router, PWA), React 19, Tailwind v4, `next-intl`, `framer-motion`, deployed to Vercel. Backend: FastAPI + SQLAlchemy 2.0 + Alembic + APScheduler + Google `google-genai` (Gemini) + Web Push (`pywebpush`), Python 3.12 via `uv`, deployed to Railway. Data: Supabase Postgres + Storage. See [`.planning/codebase/STACK.md`](.planning/codebase/STACK.md) for authoritative versions.

## Dev quickstart

```bash
# one-time per shell — load the test env contract
set -a; source .env.test.example; set +a

# (1) test Postgres on :5433
docker compose -f docker-compose.test.yml up -d

# (2) backend deps + schema + seed
(cd backend && uv sync && uv run alembic upgrade head && uv run seed)

# (3) frontend deps + Chromium
(cd frontend && npm ci && npx playwright install --with-deps chromium)

# (4) run the suite
(cd frontend && npm run test:e2e)
```

Requires Docker, Node 24+, and `uv` already on `$PATH`. Full bootstrap + D-12 regression canary in [`TESTING.md`](TESTING.md); production-synthetic seed operations in [`RUNBOOK.md`](RUNBOOK.md).

## Architecture invariants

Eight load-bearing rules that are easy to break by editing one file in isolation (five capture surfaces converge on one promotion contract, voting state is computed not stored, realtime mutations broadcast via a single channel, HttpOnly cookie auth, …). See [`CLAUDE.md` §Architecture invariants](CLAUDE.md#architecture-invariants) for the full list.

## Docs map

| Tier | Files | Purpose |
|---|---|---|
| **Claude context** | [`CLAUDE.md`](CLAUDE.md), [`backend/CLAUDE.md`](backend/CLAUDE.md), [`frontend/CLAUDE.md`](frontend/CLAUDE.md), [`.planning/CLAUDE.md`](.planning/CLAUDE.md) | Loaded into every Claude turn — invariants + scoped rules |
| **Reference** | [`SPEC.md`](SPEC.md), [`CONTEXT.md`](CONTEXT.md), [`docs/adr/`](docs/adr/), [`docs/design-system.html`](docs/design-system.html) | v0.1 spec (historical), domain vocabulary, decision records, design tokens |
| **Planning** | [`.planning/PROJECT.md`](.planning/PROJECT.md), [`.planning/STATE.md`](.planning/STATE.md), [`.planning/MILESTONES.md`](.planning/MILESTONES.md), [`.planning/ROADMAP.md`](.planning/ROADMAP.md) | Live state + milestone history + decisions |
| **Operator** | [`RUNBOOK.md`](RUNBOOK.md), [`TESTING.md`](TESTING.md) | Prod-synthetic seed ops + local E2E bootstrap |
| **Intel (auto)** | [`.planning/codebase/`](.planning/codebase/), `graphify-out/` | Refreshed via `/gsd-map-codebase` and `graphify update .` |

## License

Private — Luca + partner only. Not for redistribution.
