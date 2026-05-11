# Phase 1: Foundations (W1) - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the **functional skeleton** of Al Dente:

- **Infrastructure round-trip:** Vercel (frontend) + Railway (backend) + Supabase (Postgres + Storage) wired end-to-end, with a `POST /pings` → DB insert → WebSocket broadcast → other phone updates loop validated on both phones via Safari → Add to Home Screen. This is SPEC.md's "First concrete action" gate.
- **Onboarding & auth:** Household creation + invite-code join, opaque bearer-token auth, 3-screen flow.
- **Manual recipe library:** Full-form + quick-add CRUD, list with ILIKE search, detail page, edit, drafts inbox tab, ≤4 photos per recipe stored in Supabase Storage, JSON export of the household library.
- **Realtime baseline:** Household-scoped WebSocket channel, broadcasts `recipe.created` / `recipe.promoted` / `vote.created`, reconnect-with-backoff on the client. Phase 1 only emits `recipe.created`; Phases 2 and 3 layer the other event types onto the same scaffolding.
- **PWA install:** Manifest + 192/512 icons + service-worker app-shell cache, installable on iOS Safari, all user-facing strings via `next-intl` French message files.

**Dogfood gate:** ≥ 2 weeks of solo manual use after deployment. If both members aren't reaching for the app, stop here.

**Not in this phase (deferred):** LLM capture (W2), shortlist algorithm + voting state machine + Push notifications + cooking-log creation (W3), cooking-log finalization + Album + offline tuning (W4).

</domain>

<decisions>
## Implementation Decisions

### Ping test lifecycle

- **D-01:** Delete the `/pings` endpoint, the `pings` table, and the corresponding Alembic migration *as soon as the round-trip gate passes on both phones*. The endpoint is throwaway scaffolding — its only purpose is proving the Vercel → Railway → Supabase → WebSocket loop works end-to-end before any feature wiring depends on that loop. No health-probe carryover; if observability becomes a need later, that's a productize-later decision.

### Photo upload pipeline

- **D-02:** Photos travel through the FastAPI backend as multipart form-data (`POST /recipes/{id}/photos`), backend streams to Supabase Storage, returns the storage path, recipe row's `photo_paths` array is appended in the same request handler.
  - Reasoning: at couple-scale (~10 photos/week in v0.1) Railway free-tier egress is not a constraint; one auth flow is simpler to debug; no Supabase keys leak into the browser bundle; no orphaned-blob race from a missed "confirm upload" step.
  - Revisit trigger: if Railway egress shows up in metrics during W2 (when CAPTURE-02 multimodal photo capture lands) or W4 (when COOK-03/Album finalization adds another photo channel), switch to presigned Supabase URLs. **`# TODO(productize)`** marker on the upload handler.

### Recipe search

- **D-03:** `RECIPE-03` text search runs as `WHERE title ILIKE :q OR ingredients::text ILIKE :q` against Postgres, with `:q` formatted as `%query%`.
  - Reasoning: corpus is bounded at couple-scale (likely <500 recipes for v0.1's lifetime); ILIKE on <500 rows is microseconds even without an index; zero migration overhead; no French-dictionary configuration. Exact-substring only — "raviolis" won't match "ravioli", but the user accepts that for v0.1.
  - Revisit trigger: if the household ever asks "why doesn't my search work?" twice, switch to `pg_trgm` + GIN with the `%` operator (one migration, ~20 lines of code, fuzzy matches and accent insensitivity for free). FTS with `tsvector` is productize-later.

### Color palette for member attribution

- **D-04:** Five member-color swatches use **Tailwind CSS v4's default 500-shade palette**:
  - `rose-500` — `#F43F5E`
  - `amber-500` — `#F59E0B`
  - `emerald-500` — `#10B981`
  - `sky-500` — `#0EA5E9`
  - `violet-500` — `#8B5CF6`
  - Reasoning: distinguishable when adjacent (vote dots on a card), WCAG-AA contrast against both white and dark surfaces (PWA respects iOS dark mode by default), Tailwind utility classes work out of the box (`bg-rose-500`, `text-rose-500`, etc.), no custom hex tokens needed.
  - Storage: `members.color_hex` stores the resolved hex value (per SPEC.md schema). Onboarding picker references the 5 hex constants from a shared `frontend/lib/colors.ts` (mirror in `backend/app/colors.py` for validation in `POST /households/join`).
  - Revisit trigger: a designer-led visual pass is in PROJECT.md's productize-later list; placeholder set ships now.

### Claude's Discretion

The following implementation specifics are not user-facing decisions and should be made by the planner / executor without re-asking the user:

- **Frontend folder structure:** `frontend/app/` for routes, `frontend/components/` for shadcn components + composed UI, `frontend/lib/` for `api.ts` (fetch wrapper with bearer token), `ws.ts` (reconnecting WebSocket client), `enums.ts` (mirror of Python enums), `colors.ts` (the 5 member colors), `i18n/fr.json` (French message catalog).
- **Backend folder structure:** Per SPEC.md §"Project structure" — `backend/app/main.py`, `backend/app/routers/{households,recipes,ws}.py` for W1 (cooking, shortlist routers come later), `backend/app/services/realtime.py` (WS broadcast helper), `backend/app/auth.py` (bearer middleware), `backend/app/db.py` (SQLAlchemy engine + session), `backend/app/models/` (SQLAlchemy ORM classes split by entity), `backend/app/schemas/` (Pydantic request/response separately from ORM models), `backend/alembic/` for migrations.
- **Migration granularity:** Single Alembic baseline migration for the full SPEC.md §"Data model" schema (households, members, recipes, cooking_logs, daily_shortlists, votes, plus the three enums). Minus `pings` after D-01 cleanup. One migration is fine because v0.1 has zero deployed users to coordinate around.
- **Auth-token format:** Opaque cryptographically-random URL-safe base64 string, 32 bytes (43 chars after base64 encoding). Generated server-side via `secrets.token_urlsafe(32)`. Stored as `auth_token TEXT UNIQUE` per SPEC.md schema. No rotation in v0.1 (productize-later).
- **Invite-code format:** 6 uppercase alphanumeric characters, regenerable, unique per household per SPEC.md schema. Generated server-side; collision-retry on insert.
- **CORS:** Explicit allowlist of the Vercel production domain + `localhost:3000` for local dev. No `*` wildcard.
- **WebSocket auth:** `wss://.../ws?token=<auth_token>` with token validated on connect; reject if missing or invalid. Channel keyed on `member.household_id` so broadcast helpers can route by household.
- **Reconnect-with-backoff:** Use `partysocket` or hand-rolled exponential backoff (250ms → 500 → 1s → 2s → 5s, cap at 5s, infinite retries). Either is fine; planner picks.
- **Local dev DB:** Hit Supabase from day 1 — couple-scale free-tier headroom is enormous, avoids Docker complexity, matches the deployed environment exactly. Each developer (just Luca for v0.1) gets their own Supabase project for development; production project is separate.
- **Onboarding routing:** Three routes (`app/onboarding/welcome/page.tsx`, `app/onboarding/create/page.tsx`, `app/onboarding/join/page.tsx`) with state passed via search params, not React Context. Simpler back-button behavior on iOS.
- **Drafts inbox UI placement:** Bottom-nav tab labelled "À compléter (N)" — the N badge is the count of `status='draft'` recipes for the household, fetched on tab load. Tab is always visible (even when N=0) so users notice when something lands there.
- **JSON export shape:** Single `recipes.json` blob — array of recipe objects matching the Pydantic recipe schema, including `source_capture` and `photo_paths` (paths only, not the photo bytes). Cooking-logs and votes are not in scope for Phase 1's export. Triggered by `GET /households/{id}/export.json` returning `Content-Disposition: attachment`.
- **Service worker cache strategy in W1:** `next-pwa` defaults — precache the app shell + static assets; runtime-cache API responses with NetworkFirst, 30s timeout. Tune in W4. PWA install must work on iOS Safari before W1 closes.
- **Branching strategy:** Work directly on `main` with Vercel + Railway auto-deploy. Vercel preview deploys on PR branches are nice-to-have but not required for v0.1. Branching strategy in `.planning/config.json` is set to `none`.
- **Test setup in W1:** No automated tests in W1 (per `.planning/codebase/STRUCTURE.md` §"Testing" — "No test files present (not configured yet; W1 milestone does not require tests)"). The dogfood gate is the test. Productize-later: scaffold vitest (frontend) + pytest (backend) when capture pipelines arrive in W2.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner, executor) MUST read these before producing PLAN.md or writing code.**

### Specification (single source of truth)

- `SPEC.md` (repo root) — locked v0.1 specification from `/grill-me`. Contains the data model (§"Data model (Postgres)"), capture pipeline contract (§"Capture pipeline"), auth scheme (§"Onboarding"), realtime contract (§"Voting"), build plan (§"Build plan"), risks (§"Risks budgeted"), and explicit out-of-scope (§"Out of scope for v0.1"). The "First concrete action: deploy the skeleton + ping test" subsection of §"Build plan" is the W1 entry point.

### Project context

- `.planning/PROJECT.md` — Core Value, constraints, Key Decisions table (PWA + invite-code + computed voting state + denormalized fields + raw input retention + French-only-via-next-intl).
- `.planning/REQUIREMENTS.md` — 26 atomic Phase-1 REQ-IDs (`INFRA-01..06`, `ONBOARD-01..06`, `RECIPE-01..08`, `REALTIME-01..03`, `PWA-01/02/04`).
- `.planning/ROADMAP.md` §"Phase 1: Foundations (W1)" — phase goal, success criteria (5 observable behaviors), dependency notes.

### Codebase map (existing brownfield analysis from `/gsd-map-codebase`)

- `.planning/codebase/STACK.md` — current frontend dependencies (Next.js 16.2.4 / React 19.2.4 / Tailwind v4 / TS 5 / ESLint 9 — `frontend/package.json` is authoritative for versions); intended backend dependencies (FastAPI / SQLAlchemy 2.0 / google-generativeai / apscheduler) not yet pinned in `backend/pyproject.toml`.
- `.planning/codebase/STRUCTURE.md` — current directory layout, naming conventions, Phase 1 scaffolding checklist (§"Scaffolding Checklist").
- `.planning/codebase/ARCHITECTURE.md` — intended layered architecture, data flow, key abstractions (household isolation, recipe status states, source_capture preservation, computed voting state).
- `.planning/codebase/INTEGRATIONS.md` — Supabase Postgres connection, Supabase Storage buckets, intended env vars (`DATABASE_URL`, `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_WS_BASE`, etc.), and the §"Skeleton Deployment Checklist" that mirrors SPEC.md's first-concrete-action gate.
- `.planning/codebase/CONVENTIONS.md` — TypeScript strict mode, Tailwind v4 default config, path alias `@/*`, French i18n requirement.
- `.planning/codebase/CONCERNS.md` §"Enum Drift Between Frontend and Backend", §"Next.js Breaking Changes Not in Training Data", §"Backend Framework Not Yet Wired", §"Localization Debt if Not Wired from Day One" — pre-flight risks for Phase 1.

### Repo-level instructions

- `CLAUDE.md` (repo root) — SPEC.md as source of truth, repo layout, locked-vocabulary sync rule (`frontend/lib/enums.ts` ↔ Python `Enum` classes — drift is a category of bug to avoid), 6 architecture invariants worth knowing, productize-later TODO marker convention.
- `frontend/CLAUDE.md` → `frontend/AGENTS.md` — **Next.js 16.2.4 may have breaking changes that aren't in your training data; consult `frontend/node_modules/next/dist/docs/` for current APIs before writing frontend code.** Honor deprecation notices.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **Tailwind CSS v4 + PostCSS** — `frontend/postcss.config.mjs` already wired, no `tailwind.config.ts` needed (v4 defaults). Color palette D-04 maps to existing `bg-rose-500` / `bg-amber-500` / etc. utilities directly.
- **TypeScript strict mode + path alias** — `frontend/tsconfig.json` has `strict: true` and `@/*` → `frontend/*`. New `lib/`, `components/`, `app/onboarding/` etc. use `@/lib/api`, `@/components/RecipeCard` imports.
- **Next.js App Router scaffold** — `frontend/app/layout.tsx` + `frontend/app/page.tsx` already present; new routes follow App Router conventions (`page.tsx` per route, `layout.tsx` for shared shells).
- **ESLint flat config** — `frontend/eslint.config.mjs` extends `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`. New code lints automatically on `npm run lint`.
- **Python 3.12 + uv** — `backend/.python-version` pins, `backend/pyproject.toml` is uv-style. `uv add fastapi sqlalchemy alembic psycopg2-binary python-multipart pydantic-settings` etc. is the path to add deps.

### Established Patterns

- **Monorepo layout:** `frontend/` and `backend/` are independent deployable units; no shared `package.json` at root. Vercel deploys `frontend/`; Railway deploys `backend/`. CLAUDE.md documents this.
- **Locked-vocabulary sync:** `frontend/lib/enums.ts` (TypeScript) and `backend/app/models/enums.py` (Python `Enum`) MUST move together. Per CLAUDE.md: "drift between the two is a category of bug to avoid." Phase 1 introduces `Season`, `Cuisine`, `Mood`, `Protein` from SPEC.md §"Locked vocabularies".
- **Productize-later marker:** `# TODO(productize)` (Python) or `// TODO(productize)` (TS) for explicit v0.1 cuts that have a roadmap home. Distinguish from plain `# TODO` (intra-v0.1 work).
- **Documentation co-location:** `frontend/CLAUDE.md` delegates to `frontend/AGENTS.md` (the canonical place for frontend-specific warnings — Next.js 16 breaking changes).

### Integration Points

- **Vercel ↔ Railway boundary:** All FE→BE traffic goes through `process.env.NEXT_PUBLIC_API_BASE` (HTTPS) and `process.env.NEXT_PUBLIC_WS_BASE` (WSS). CORS allowlist on the FastAPI side must include the Vercel production domain.
- **Browser ↔ Supabase Storage:** v0.1 browsers never talk to Supabase directly (D-02). All photo bytes route through the backend.
- **Frontend ↔ localStorage:** `auth_token` lives in `localStorage` per SPEC.md §"Onboarding". Read on app boot, attached as `Authorization: Bearer <token>` to every `fetch` and the WebSocket query string.
- **Backend ↔ Supabase Postgres:** Single `DATABASE_URL` env var, SQLAlchemy 2.0 async engine. Alembic config at `backend/alembic/alembic.ini`.
- **Backend ↔ Supabase Storage:** Service-role key on the backend only. Bucket layout: `recipe-photos/{household_id}/{recipe_id}/{uuid}.jpg`.
- **WebSocket channel keying:** Server-side dict `Dict[household_id, Set[WebSocket]]` in `services/realtime.py` for broadcast routing. No external pub/sub in v0.1.

</code_context>

<specifics>
## Specific Ideas

- **PWA installable on iOS Safari is non-negotiable for the gate.** The W1 dogfood test happens by opening `al-dente.vercel.app` in Safari on both phones, tapping Share → Add to Home Screen, and exchanging pings. If Safari refuses to install, the gate fails — investigate manifest, icon sizes, or service-worker scope before declaring W1 done.
- **Both phones must round-trip the ping within ~500ms** per SPEC.md §"First concrete action" step 6. INFRA-05 measures this. If WebSocket on Railway free tier flakes (per SPEC.md §"Risks budgeted"), the reconnect-with-backoff client behavior (REALTIME-03) is the mitigation, not "fall back to polling."
- **All visible strings in French via `next-intl`.** No `<h1>Welcome</h1>` in JSX. Even placeholder strings in W1 scaffolding go through `t('home.title')` with `frontend/lib/i18n/fr.json` as the single message catalog. Per CONCERNS.md §"Localization Debt if Not Wired from Day One": retrofitting i18n later is tedious; pay the tax now.

</specifics>

<deferred>
## Deferred Ideas

These came up during analysis but are explicitly *not* part of Phase 1. Captured here so they don't get re-discovered later or accidentally pulled into scope.

### Deferred to later phases / productize-later

- **Trigram or FTS search** — D-03 picks ILIKE; revisit if accents become a complaint. Productize-later candidate.
- **Presigned Supabase upload URLs** — D-02 picks multipart-through-backend; revisit at W2/W4 if Railway egress shows up in metrics.
- **Auth-token rotation / refresh** — Long-lived opaque tokens are fine for v0.1's "just us" audience. Productize-later when Supabase Auth magic-link replaces invite-code (per PROJECT.md V2-AUTH-01).
- **Designer pass on the color palette** — D-04's Tailwind 500s are a tasteful placeholder. PROJECT.md V2-UX-02 ("Custom illustrations + app icon") is the home for a real designer engagement.
- **Vercel preview deploys** — branching strategy = `none` for v0.1; revisit if Luca and partner ever co-edit code.
- **Test scaffolding (vitest + pytest)** — W2 is the natural moment when capture pipelines start having branching logic worth testing.
- **Web Push notification subscription UI** — `PWA-03` is mapped to Phase 3 because the shortlist is born in W3. Phase 1 just lays the manifest + service-worker groundwork that the W3 push-subscription flow will hook into.
- **Service worker cache tuning** — Phase 4 owns this. Phase 1 ships `next-pwa` defaults.

### Out of Phase 1 scope (these belong to other phases or never)

- Voting state machine (W3) / cooking-log finalization (W4) / Album (W4) / LLM capture (W2) — explicitly mapped elsewhere in ROADMAP.md.
- Five capture surfaces beyond `quick` and full-form (`voice` / `photo` / `url` / `voice-modify`) — Phase 2.
- Real-time co-swipe voting / OAuth login / native iOS app / shopping-list integration — out-of-scope per PROJECT.md.

</deferred>

---

*Phase: 01-foundations-w1*
*Context gathered: 2026-05-05*
