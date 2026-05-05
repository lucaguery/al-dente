# Al Dente

## What This Is

A shared recipe + decision app for couples, built as an installable PWA with a Python backend. v0.1 audience is "just us" (Luca + partner) — clean enough to productize later, but built first to eliminate the daily "on mange quoi ?" debate in our own household.

## Core Value

Eliminate the daily "on mange quoi ?" debate via a shared library, async voting, and voice/photo capture — installable on both iPhones with no App Store, no $99/year, no native build.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — W1/pre-skeleton state. Validation gate is behavioral: ≥ 2 weeks daily use by both members at end of W4.)

### Active

<!-- Current scope. Building toward v0.1. Atomic REQ-IDs live in REQUIREMENTS.md. -->

- [ ] Both phones install the PWA from Safari and round-trip a "ping" event via WebSocket (W1 first concrete action — the deploy skeleton gate)
- [ ] One household with two members, invite-code onboarding, bearer-token auth
- [ ] Recipe library with manual entry (full + quick), list/search, detail view, drafts inbox
- [ ] LLM-assisted capture (voice via Web Speech, photo via Gemini multimodal, paste-URL) with background draft → structured promotion
- [ ] Daily shortlist of ≤ 5 recipes via scoring algorithm with seasonality, recency, diversification
- [ ] Asymmetric voting computed from votes table (Validé / Pressenti / Contesté / Rejeté / Sans avis), "Tu décides" delegation, veto window closes on first cooking log
- [ ] "Je commence à cuisiner" → CookingLog (immutable cooked_at), finalize with photos + 3-value rating + voice notes
- [ ] Shared Album masonry view of cooking-log photos
- [ ] Realtime sync of recipes and votes across both phones via WebSocket
- [ ] French-only localization via `next-intl` from day 1

### Out of Scope

<!-- Explicit v0.1 cuts from SPEC.md §"Out of scope for v0.1". -->

- iOS Share extension — impossible in a PWA; replaced by an in-app Paste URL surface (2 extra taps)
- Mid-cook timer / step-by-step cooking UI — not where the daily-debate value lives
- Shopping list integration — adjacent product, separate v0.2 conversation
- Native iOS / Android apps — kills $0/year distribution; PWA is the whole point
- 5-star rating granularity — locked to `loved` / `liked` / `disliked` enum (decision-relevant signal only)
- Avatars — colour attribution only; simpler ship, fewer assets
- Collaborative filtering / preference learning — corpus is too small at couple-scale to be useful
- Real-time co-swipe voting — async voting matches actual usage rhythm
- OAuth login — invite-code is sufficient; `auth_token` column generalizes to magic-link later

## Context

- **Repo state on init (2026-05-05):** W1 / pre-skeleton. `frontend/` is a fresh `create-next-app` scaffold, `backend/` is a `print("Hello from backend!")` stub with no FastAPI/SQLAlchemy/Gemini wiring. `SPEC.md` is the locked v0.1 spec from a `/grill-me` session; `.planning/codebase/` was populated by `/gsd-map-codebase`.
- **Source of truth:** `SPEC.md` at the repo root. All locked vocabularies, the data model, the capture pipeline, the scoring algorithm, the voting state machine, the auth scheme, and the wave-based build plan live there. Read it before designing any feature.
- **Behavioral done definition:** ≥ 2 weeks of daily use by both members at end of W4. Not a feature checklist. Each wave has its own dogfood gate before moving on.
- **Distribution model:** Both phones install via Safari → Share → Add to Home Screen. Updates ship via `git push` → Vercel/Railway auto-deploy → next page load. No App Store, no TestFlight, no Apple Developer Program.
- **Productize-later mindset:** Built clean enough to fork into a real product later. Productize-only debt is marked inline as `# TODO(productize)` (or `// TODO(productize)`); intra-v0.1 work is plain `# TODO`.
- **Risks noted in SPEC.md §Risks budgeted:** iOS Safari PWA cache quirks, Web Speech French quality, Gemini French prompt fragility (~1.5× W2 effort budgeted), WebSocket reliability on Railway free tier, Supabase free-tier limits, motivation drop at week 10–14 (W1 dogfood gate is the antidote).

## Constraints

- **Tech stack**: Next.js 16.2.4 (App Router) + React 19.2.4 + TypeScript 5 + Tailwind v4 + shadcn/ui + `next-pwa` + `framer-motion` + Web Speech API on the frontend; FastAPI + Pydantic + SQLAlchemy 2.0 + Alembic + `google-generativeai` (Gemini 2.5 Flash) + APScheduler + native FastAPI WebSockets on the backend; Supabase Postgres + Storage + (optionally) Realtime — pinned in SPEC.md §Stack and `frontend/package.json`. **Note:** Next.js 16+ has breaking changes that may not be in training data; consult `frontend/node_modules/next/dist/docs/` for current APIs.
- **Distribution**: PWA only — installed via Safari → Add to Home Screen. $0/year, no App Store, no TestFlight, no Apple Developer Program.
- **Hosting**: Vercel (frontend, free tier) + Railway or Fly.io / Render (backend, ~$5/mo) + Supabase (Postgres + Storage, free tier). Couple-scale workload assumed throughout.
- **Localization**: French only in v0.1. All user-facing strings go through `next-intl` from day 1 — hardcoded strings are productize-later debt to avoid.
- **Audience**: Single household (Luca + partner). Multi-tenant cleanliness preserved (households + members tables exist) but never exercised at scale in v0.1.
- **Effort budget**: ~230 hours, 23–30 weekends, 5–7 months at one weekend per week.
- **Skill-fit**: Python AI-engineer drives the backend choice; PWA chosen over native to skip an iOS toolchain we don't have.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PWA + `next-pwa` over native iOS | $0/year, no App Store friction, single codebase; trade is iOS share extension impossibility (replaced by Paste URL) | — Pending |
| Python (FastAPI) backend over Node | Leverages Luca's AI-engineer skill stack; Gemini Python SDK is the reference implementation | — Pending |
| Invite-code auth over OAuth | Simpler than Supabase Auth for v0.1; `auth_token` column abstracts the source so productize-later magic-link drops in | — Pending |
| Server-side `BackgroundTask` draft → structured promotion | Single source of truth, no device-vs-device race; WebSocket broadcasts when status flips | — Pending |
| Voting state computed, not stored | 5 states derived from rows in `votes`; no `state` column to drift from votes | — Pending |
| Denormalized `last_cooked_at` + `cook_count` on `recipes` | Read-time perf; updated in the same transaction as `cooking_logs` insert | — Pending |
| Raw inputs kept forever in `source_capture` JSONB | Re-prompt with improved Gemini prompts later without losing the original transcript / URL / photo paths | — Pending |
| French-only + `next-intl` wired from day 1 | Productize-clean tax now is cheaper than retrofitting i18n later | — Pending |
| 3-value rating enum (`loved` / `liked` / `disliked`) | Decision-relevant signal only; 5-star granularity is noise at couple scale | — Pending |
| Web Speech API on-device transcription | Zero backend audio cost, French supported; fallback path documented (send audio to Gemini multimodal) if quality fails | — Pending |
| 4 waves with dogfood gates between each | Behavioral validation beats feature-completeness; W1 install-and-ping is the antidote to motivation drop at week 10–14 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-05 after initialization*
