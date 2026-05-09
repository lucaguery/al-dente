# Milestones

## v0.2.1 E2E test infrastructure (Shipped: 2026-05-09)

**Phases completed:** 11 phases, 64 plans, 99 tasks

**Key accomplishments:**

- Locked Season/Cuisine/Mood/Protein enums and 5-slot Tailwind-500 member-color palette mirrored verbatim across `frontend/lib/` (TS const-object pattern) and `backend/app/` (Python str-Enum), with guard functions for member-color validation.
- Replaced the create-next-app boilerplate with a deployed installable PWA shell at https://al-dente-pink.vercel.app/ — next-intl French catalog wired, 15 shadcn/ui primitives committed, manifest + service worker generated, both household iPhones can Add to Home Screen and launch fullscreen with the app shell loading offline on second launch.
- Live FastAPI backend at https://al-dente-production.up.railway.app/ with `/healthz` returning 200, the dev Supabase Postgres holding the SPEC.md §Data-model schema verbatim (7 tables + 3 enums applied via single Alembic baseline migration), bearer-token auth dependency wired but not yet exercised against a router, and an explicit CORS allowlist for the Vercel prod domain + localhost.
- Four-route household onboarding API (`POST /households`, `POST /households/join`, `GET /households/by-code/{code}`, `GET /households/me`) with Pydantic-validated palette enforcement, server-side invite-code generation, and Bearer-token gating that closes INFRA-06's protected-route verification loop.
- Household-scoped WebSocket spine (`/ws?token=...` with 1008-on-bad-token close) plus the `broadcast_to_household` helper every later mutation router will reuse, validated by an in-process round-trip ping test.
- partysocket-backed WebSocket client with locked 250ms→5s exponential reconnect, household-scoped React context, and a throwaway PingPanel UI that closes the W1 dogfood gate (round-trip ping in ~500ms across both phones).
- Manual recipe library API: full-form + quick-add CRUD with cross-household isolation, ILIKE search per D-03, WS broadcasts on every mutation, and JSON export for disaster recovery.
- RECIPE-07 photo upload via FastAPI multipart-through-backend (D-02): magic-byte MIME sniff, 8 MiB cap, 4-photo cap, server-generated UUID path, Supabase Storage write, recipe.updated broadcast — all in one DB tx.
- Recipe library read-side: searchable list with 300ms debounce + ILIKE backend, detail page with private-bucket signed URLs (5-min TTL, path-on-recipe authorized), drafts inbox tab with live `(N)` badge driven by realtime, settings JSON export button — all wired with cookie-auth (no Bearer/localStorage), all copy via next-intl.
- One-liner:
- One-liner:
- One-liner:
- One-liner:
- One-liner:
- One-liner:
- `frontend/app/settings/page.tsx`
- Gemini 2.5 Flash service module with structured-output schema, three pure call functions, and three BackgroundTask bodies wiring fresh SessionLocal + recipe.promoted broadcast — plus Alembic 0003 adding promotion_error / promotion_attempts to recipes.
- One-liner:
- 1. [Rule 3 — Blocking issue] React 19 set-state-in-effect lint error in PhotoCaptureTab
- 1. [Rule 1 — Lint] react-hooks/set-state-in-effect on VoiceModifySheet open-reset
- 1. [Rule 1 — Bug] Migration revision id format
- One-liner:
- 1. [Rule 3 — Blocking] Radix Select forbids empty-string SelectItem values
- 1. [Rule 1 — Bug] Token name `--color-validé-tint` broke Tailwind v4 utility generation
- Backend (Task 1 — `d37d5d1`):
- File:
- ShortlistCard's prefers-reduced-motion hook migrated to useSyncExternalStore, three dead eslint-disable directives removed, and ROADMAP/REQUIREMENTS reconciled with the album cut and OS-keyboard-mic voice-notes reality.
- Status:
- Migrated `frontend/app/globals.css` to terracotta+warm-cream+warm-taupe OKLCH tokens, two-layer warm-brown shadows, motion CSS tokens (`--ease-craft`, `--duration-fast`, `--duration-normal`), and a `.paper-grain` utility class — full v0.1 token-name preservation, zero component churn.
- One-liner:
- Before
- Created `frontend/lib/motion.ts` — the JS half of DESIGN-06. Exports `easeCraft`, `durations`, `transitions`, and `variants` (fadeIn / slideUp / pressFeedback / swipeCommit) per UI-SPEC §Motion verbatim, in numeric lockstep with the CSS motion tokens in globals.css.
- Sweep `font-heading` → `font-display` across 4 shadcn Title primitives, delete the deprecated `--font-heading` / `--font-sans` `@theme` aliases, and stage `transitions` import on the styleguide page so Phase 5 closes with a clean token surface.
- One-liner:
- One-liner:
- One-liner:
- One-liner:
- Edit 1 — `transitions` import
- 5-state vote-chip pill render with LOCKED color story + paper-grain Tu-décides delegation Card mirroring Phase 6 D-Voice pattern, in a single 28-line surgical edit to VoteSummary.tsx (no new files, no new i18n keys, no architectural change).
- One-liner:
- CookingBanner re-themed to a paper-grain Card with a subtle terracotta wash (bg-primary/8) and Finaliser converted from a raw `<Link>` with hand-rolled inline-flex classes to `<Button asChild>` wrapping `<Link>` — both action buttons cleared to the 48px tap-target floor, closing W4 UI-REVIEW gap COOK-07.
- COOK-08 closed: RatingPicker press feedback upgraded from instant transition-all snap to 100ms ease-craft paper-physics depression, paper-grain anchor added to each rating card surface, and helper-line typography folded into the Phase 8 4-size type-scale.
- RecipeCard joins the kitchen-counter card system (paper-grain frame), SearchInput field rises to 48px D-08 floor with terracotta-30 focus ring on a paper-grain wrapper, and the recipe library converts from a flex-stack to a responsive 2-col mobile-first grid (md:3 / lg:4) — closing COOK-09 in 3 surgical edits, ~15 lines total.
- Next.js 16 ImageResponse-driven app icon (terracotta + cream pasta-strand) replaces static PNGs; manifest + viewport migrated to Slow Food terracotta; Phase 5 deferral CLOSED.
- One-liner:
- One-liner:
- One-liner:
- Test Postgres on :5433/aldente_test plus a single-field in-place URL switch in config.py that flips db.py and alembic/env.py to the test DB when ENVIRONMENT=test — with zero diff to either file.
- Three surgical env-flag guards in services/llm.py + two in services/storage.py + a 89-line llm_fixtures.py exporting canned GeminiExtractedRecipe values, so when ENVIRONMENT=test every recipe-capture surface returns deterministic data instantly without invoking Gemini or Supabase Storage.
- `uv run seed` populates the test DB with 1 household + 2 members + 21 recipes + 3 cooking logs + 7 votes producing all 5 computed states; a hard-refusal guard rejects any non-test environment (or wrong DB name); the seed re-runs as a no-op via uuid5 + Session.merge + composite-key ON CONFLICT DO UPDATE.
- Two-server / three-project Playwright orchestration: workers=1, webServer pair (uvicorn ENVIRONMENT=test on :8000 + next dev on :3000), seeded project with Bearer extraHTTPHeaders, fresh project chained off fresh-setup (TRUNCATE 6 tables CASCADE) → fresh-teardown (uv run seed). Plus a 157-byte baseline JPEG fixture, a single-source-of-truth seed-helpers.ts, and the truncate/reseed scripts that gate TEST-04.
- Thirteen Playwright specs land under frontend/tests/e2e/ covering every shipped screen and user action against the seeded test DB. ZERO product-code edits. The shortlist-vote spec asserts all 5 French vote-state labels (Validé / Pressenti / Contesté / Rejeté / Sans avis) verbatim, satisfying D-12 (the regression-test hot-path canary target). Each spec asserts at least one user-visible French DOM string or known seeded value — never an absence-of-error pattern.
- Single Playwright spec under the `fresh` project: Alice creates a household, Bob joins via the invite code, both contexts get distinct HttpOnly+Secure aldente_auth cookies, and Bob lands on HomeDecide with the BottomNav landmark visible. No Bearer header, no SEED_AUTH_TOKEN shortcut — the real cookie flow is the only auth path.
- TESTING.md ships at repo root (205 lines) with the 4-command bootstrap, full env-var contract, 14-spec matrix, 7-entry troubleshooting section, D-12 canary procedure, and explicit "NOT covered" list. The D-12 canary execution gate could NOT be run end-to-end this plan: the seeded shortlist-vote suite fails 3/3 at baseline due to a `/api/`-prefix mismatch in 10-04's harness, not due to the canary candidate files themselves. Both canary candidate files (`frontend/components/ShortlistDeck.tsx` and `backend/app/routers/votes.py`) are verified `git diff --quiet` at plan close — invariant honored.

---

## v0.2 Polish: Slow Food artisanal identity (Shipped: 2026-05-08)

**Phases completed:** 5 phases, 26 plans, 36 tasks

**Key accomplishments:**

- Migrated `frontend/app/globals.css` to terracotta+warm-cream+warm-taupe OKLCH tokens, two-layer warm-brown shadows, motion CSS tokens (`--ease-craft`, `--duration-fast`, `--duration-normal`), and a `.paper-grain` utility class — full v0.1 token-name preservation, zero component churn.
- One-liner:
- Before
- Created `frontend/lib/motion.ts` — the JS half of DESIGN-06. Exports `easeCraft`, `durations`, `transitions`, and `variants` (fadeIn / slideUp / pressFeedback / swipeCommit) per UI-SPEC §Motion verbatim, in numeric lockstep with the CSS motion tokens in globals.css.
- Sweep `font-heading` → `font-display` across 4 shadcn Title primitives, delete the deprecated `--font-heading` / `--font-sans` `@theme` aliases, and stage `transitions` import on the styleguide page so Phase 5 closes with a clean token surface.
- One-liner:
- One-liner:
- One-liner:
- One-liner:
- Edit 1 — `transitions` import
- 5-state vote-chip pill render with LOCKED color story + paper-grain Tu-décides delegation Card mirroring Phase 6 D-Voice pattern, in a single 28-line surgical edit to VoteSummary.tsx (no new files, no new i18n keys, no architectural change).
- One-liner:
- CookingBanner re-themed to a paper-grain Card with a subtle terracotta wash (bg-primary/8) and Finaliser converted from a raw `<Link>` with hand-rolled inline-flex classes to `<Button asChild>` wrapping `<Link>` — both action buttons cleared to the 48px tap-target floor, closing W4 UI-REVIEW gap COOK-07.
- COOK-08 closed: RatingPicker press feedback upgraded from instant transition-all snap to 100ms ease-craft paper-physics depression, paper-grain anchor added to each rating card surface, and helper-line typography folded into the Phase 8 4-size type-scale.
- RecipeCard joins the kitchen-counter card system (paper-grain frame), SearchInput field rises to 48px D-08 floor with terracotta-30 focus ring on a paper-grain wrapper, and the recipe library converts from a flex-stack to a responsive 2-col mobile-first grid (md:3 / lg:4) — closing COOK-09 in 3 surgical edits, ~15 lines total.
- Next.js 16 ImageResponse-driven app icon (terracotta + cream pasta-strand) replaces static PNGs; manifest + viewport migrated to Slow Food terracotta; Phase 5 deferral CLOSED.
- One-liner:
- One-liner:
- One-liner:

---
