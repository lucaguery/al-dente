# Al Dente

## What This Is

A shared recipe + decision app for couples, built as an installable PWA with a Python backend. Audience is "just us" (Luca + partner) — clean enough to productize later, built first to eliminate the daily "on mange quoi ?" debate in our own household.

## Core Value

Eliminate the daily "on mange quoi ?" debate via a shared library, async voting, and voice/photo capture — installable on both iPhones with no App Store, no $99/year, no native build.

## Current State

**v0.1 shipped** — 2026-05-08.

Both household members have a fully working app installed on their iPhones. The app covers the full loop from recipe discovery to cooking finalization: capture recipes (voice / photo / URL / manual), let the algorithm propose a daily shortlist, vote asynchronously, start cooking, and log the result with a photo and rating. WebSocket sync keeps both phones in sync within ~200ms.

**v0.2 Phase 5 shipped** — 2026-05-08. Slow Food artisanal token system (terracotta primary at h≈35°, warm-cream + warm-taupe + ink neutrals, two-layer warm-brown shadows, paper-grain texture anchor on card surfaces, motion language with one curve / two durations), Fraunces + IBM Plex Sans typography pairing with French diacritic verification on iOS Safari, 10 shadcn primitives re-themed in place, dev-only `/styleguide` acceptance gate. Visual smoke test approved; UI audit 23/24 (above 22/24 target). Foundation ready for Phases 6–9 to consume.

**v0.2 Phase 6 shipped** — 2026-05-08. Capture surfaces polished: 5-tab capture entry (Quick / Full / Voice / Photo / URL) and the drafts inbox now consume the Phase 5 design system (paper-grain on Card surfaces, terracotta accents, Fraunces display + IBM Plex Sans body). PhotoUploader CAPTURE-11 W4 tap-target gap closed (sheet `Caméra` / `Photothèque` at h-12, X-overlay 28px chrome + 48px hit-pad). D-Voice deviation now anchored by a persistent paper-grain Card with Fraunces italic headline. Drafts inbox uses framer-motion `AnimatePresence` for `recipe.created` slideUp + `recipe.promoted` Badge cross-fade. Phase 5 deferrals closed (font-heading → font-display sweep, alias removal in globals.css, transitions import in /styleguide). Code review: 0 critical / 0 warning remaining (all 3 warnings auto-fixed). UI audit 22/24 (meets target).

**v0.2 Phase 7 shipped** — 2026-05-08. Decide flow polished: HomeDecide gets a Fraunces-italic display-serif date header (locale-aware via `Intl.DateTimeFormat('fr-FR')`); ShortlistCard now reads as "photo printed onto a recipe card" via paper-grain frame + `rounded-t-2xl` photo + warm shadows; framer-motion `springSnap` (240/28/1.1) gives the swipe deck a paper-physics feel without rewriting the gesture; the 5 computed vote states (Validé / Pressenti / Contesté / Rejeté / Sans avis) now have a locked color story (emerald reserved for Validé, terracotta for "leaning yes", muted destructive for active dispute, neutral for off-the-table, ghost border for pending); the "Tu décides" delegation surface and the ColdStartChip body now mirror the Phase 6 D-Voice callout pattern. DECIDE-05 W4 ColdStartChip dismiss raised to h-12. DECIDE-03 token reconciliation closed via 1-line invariant-lock comment at `--color-valide-tint`. Code review: 0 critical / 0 warning. UI audit 22/24 (matches target). ShortlistDeck.tsx unchanged at 141 LOC (no structural rewrite).

**v0.2 Phase 8 shipped** — 2026-05-08. Cook-time loop polished: recipe detail screen now has a full-bleed hero photo + paper-grain backdrop-blur title strip ("cookbook chapter-opener" gesture); ingredient list carries a terracotta-30 left margin-rule (cookbook gesture); instruction steps are numbered in Fraunces italic; recipe library is a 2-column paper-grain card grid with paper-grain SearchInput at h-12; CookingBanner re-themed to paper-grain Card with `bg-primary/8` wash and `<Button asChild>` Finaliser at h-12 (closes COOK-07 W4); RatingPicker has 100ms ease-craft press feedback (closes COOK-08 W4); CookingLogFinalize routes the recipe subhead through a new ICU key (closes COOK-12) and falls back to a locked offline toast on `navigator.onLine === false` (closes COOK-11). NEW `/cooking-logs` history view + NEW CookingLogCard component shipped (COOK-10) with date-grouped Fraunces italic section headers. TWO new i18n keys added (`cooking_log.finalize.offline`, `cooking_log.finalize.recipe_subhead`) — first non-zero key additions in v0.2 polish, both explicit deliverables. Code review: 0 critical / 0 warning remaining (1 warning auto-fixed). UI audit 23/24 (matches Phase 5 baseline — best polish-phase score).

**v0.2 Phase 9 shipped** — 2026-05-08. Onboarding + identity polished — final v0.2 phase: the 4 onboarding screens (welcome / create / share-code / join) now read as paper-grain Cards with Fraunces display titles + h-12 sticky CTAs; Settings reorganized into 3 paper-grain sections (Membre / Foyer / Sauvegarde) with the same Fraunces italic terracotta invite-code display as the share-code screen (byte-identical class string — first-touch ↔ re-find consistency); BottomNav now shows terracotta `bg-primary/8` rounded-pill active wash and a Pressenti-style inbox badge (Phase 7 chipClass mirror), with all cool-grays purged. NEW `frontend/app/icon.tsx` + `frontend/app/apple-icon.tsx` use Next.js 16 `ImageResponse` to render a simple wheat-stem food-symbol on terracotta `#C8553D` — no commissioned art, no `sharp` dependency. Phase 5 themeColor deferral fully closed: zero `#F43F5E` remains anywhere in `frontend/app/`, `components/`, or `public/`. Two UAT-driven fixes shipped during validation: SearchInput dropped its `paper-grain` wrapper (root cause: `globals.css .paper-grain > * { position: relative }` was overriding absolute icon positioning), and HomeDecide replaced its blank-on-load `return null` with a partner-waiting Card that re-shows the invite code + `Actualiser` button. Code review: 0 critical / 0 warning remaining (1 warning auto-fixed). UI audit 22/24 (meets target).

**v0.2.1 shipped** — 2026-05-09. E2E test infrastructure: idempotent `uv run seed` CLI populates 1 household + 2 members + 21 recipes + 3 cooking logs + 7 votes covering all 5 computed states (uuid5 + Session.merge upsert; T-10-01 hard-refusal guard against non-test envs). Committed Playwright suite under `frontend/tests/e2e/`: 14 specs across `seeded` (Bearer + storageState cookie) and `fresh` (cookie-only) projects, iPhone-shape Chromium viewport (390×844, isMobile, hasTouch) with `toBeInViewport()` on critical interactive surfaces. 4-command bootstrap runbook (`TESTING.md`). D-12 regression canary verified end-to-end (1-line `HTTPException(500)` injected into `recipes.py:get_recipe` → `recipe-detail.spec.ts` correctly failed → reverted → suite green). 5 documented `test.fixme` markers point at real product gaps surfaced (timezone bug in `cooking_logs.py:72`, URL extraction TODO, missing GET /cooking-logs list, seed cross-day idempotency, sheet-positioning [#1](https://github.com/lucaguery/al-dente/issues/1)). 1 phase, 7 plans, 4 requirements (TEST-01..04).

**v0.3 Phase 12 shipped** — 2026-05-09. Exploratory feature walkthrough audit completed. 5 plans, 20 commits, ~100 probes against the prod synthetic household at `https://al-dente-pink.vercel.app` via Playwright MCP, 45+ screenshots, **zero product-code drift**. Phase produced `.planning/v0.3/WALKTHROUGH.md` (1,276 lines, 14 surfaces × ≥3 weird-state probes per D-08, 64 severity-tagged finding entries). Closing sweep filed **7 new GitHub issues** (#2–#8) under `audit:walkthrough` label covering blockers like the ingredient parser `<int> <noun>` duplication (#2), the cross-surface `(extraction en cours…)` stuck-draft on Gemini failure (#3), the architecture-invariant-#2 break from `MEMBER_COUNT=2` hardcoded across 3 files (#4), `cook_count` re-finalize idempotency bug (#5), missing `/cooking-logs/{id}` detail route (#6), 4-member household color-palette ceiling (#7), and `PATCH /api/households/me` 405 (#8). 4 backlog cross-links re-confirmed live without refiling: Sheet-01 (#1), URL-01, TZ-01, CL-01. POLISH-02 (Copy button on invite code) closed. P-12-Pu-05 (Push round-trip operator confirmation) deferred to v0.3-ship sign-off per explicit user decision. Verified passed (4/4 must-haves) by gsd-verifier.

**Behavioral validation gate:** ≥ 2 weeks of daily use by both members (the v0.1 definition of done per SPEC.md). This is the next observable milestone before broader scope decisions.

**Infrastructure:** Next.js 16 PWA on Vercel + FastAPI on Railway + Supabase Postgres + Storage. Auto-deploy on push to `main`. Free-tier hosting throughout.

## Requirements

### Validated

All 49 v0.1 requirements shipped and confirmed through human UAT on physical devices (iPhones). See `.planning/milestones/v0.1-REQUIREMENTS.md` for the full archive.

**By category:**
- INFRA × 6 — Vercel + Railway + Supabase deployed end-to-end, PWA install on both phones
- ONBOARD × 6 — Household create/join, invite code, HttpOnly cookie auth (Phase 01.1)
- RECIPE × 8 — Full + quick entry, list/search, detail, edit, photos, drafts inbox, JSON export
- CAPTURE × 7 — Voice / photo / URL / voice-modify via Gemini 2.5 Flash + OS-keyboard-mic notes
- SHORTLIST × 5 — APScheduler cron + scoring algorithm + framer-motion swipe deck + manual regenerate
- VOTE × 5 — 5-state computed voting + "Tu décides" delegation + veto window
- COOK × 5 — CookingLog creation + finalize (photos + rating + notes) + same-tx denormalized updates
- REALTIME × 3 — WebSocket broadcast spine + DOM CustomEvent bridge + exponential reconnect
- PWA × 4 — Manifest + service worker + Web Push + next-intl French localization

### Validated (v0.2.1 — shipped 2026-05-09)

- ✅ **TEST-01**: Idempotent `uv run seed` CLI — 1 household + 2 members + 21 recipes + 3 cooking logs + 7 votes covering all 5 computed states (Validé / Pressenti / Contesté / Rejeté / Sans avis). Verified end-to-end on a clean Postgres volume.
- ✅ **TEST-02**: 14 Playwright specs under `frontend/tests/e2e/` (13 `seeded` + 1 `fresh`). 5 documented `test.fixme` markers point at real product gaps surfaced during runtime verification — none block the phase.
- ✅ **TEST-03**: 4-command bootstrap runbook in `TESTING.md` (docker compose → uv sync+seed → npm install+playwright install → npm run test:e2e). Wall clock ~36s after one-time install.
- ✅ **TEST-04**: Invite-code happy-path spec runs under the `fresh` project (no Bearer header — real cookie flow). globalSetup truncates 6 tables; teardown re-seeds.

### Validated (v0.2 — shipped 2026-05-08)

- ✅ **All 31 v0.2 requirements validated** across Phases 5–9 (DESIGN × 8, CAPTURE × 6, DECIDE × 5, COOK × 7, ONBOARD × 5). Average UI audit 22.4 / 24. Per-phase summaries preserved in `.planning/milestones/v0.2-ROADMAP.md` and the per-phase SUMMARY files. Demonstrable satisfaction of the four design principles (Design Quality, Originality, Craft, Functionality) on every screen. Pending: ≥ 2-week daily-use validation gate.

### Active

v0.3 — Audit & Uniqueness Foundation. See **Current Milestone** section below for goal, target features, and constraints. Specific REQ-IDs added to this section after `/gsd-new-milestone` finishes the requirements pass.

### Surfaced for follow-up (v0.2.2 backlog)

Real product issues surfaced by Phase 10 runtime verification — not fixed inline per `feedback_executor_scope_creep`:

- **Sheet-01** ([#1](https://github.com/lucaguery/al-dente/issues/1)): bottom sheets render off-screen on iPhone-sized viewports because `paper-grain` overrides Tailwind `fixed` in `components/ui/sheet.tsx:64`. Affects PhotoUploader source picker, VoiceModifySheet, RegenerateSheet. `capture-photo.spec.ts` "photo upload sheet is reachable" is `test.fixme` until this lands.
- **TZ-01**: Active-cook filter in `cooking_logs.py:72-78,118-126` compares Python local-tz date to UTC DB date. Late-evening cooks fall through across UTC offset window. `cooking-log-create-finalize.spec.ts` is `test.fixme`.
- **URL-01**: URL extraction is `# TODO(productize)` at `recipes.py:481-490`. Drafts created from URL never promote. `capture-url.spec.ts` promotion assertion is `test.fixme`.
- **CL-01**: GET /cooking-logs (list) endpoint missing — the `/cooking-logs` history page renders but never has data. `cooking-log-history.spec.ts` titles assertion is `test.fixme`.
- **SEED-01**: Seed cross-day idempotency hole at `cli/seed.py:369,405`. Workaround: `docker compose down -v` between days.
- **POLISH-01 / POLISH-02** (carried from v0.2): i18n sweep on partner-waiting strings + Copy button on invite code. See `.planning/milestones/v0.2-MILESTONE-AUDIT.md`.

### Out of Scope

<!-- Explicit v0.1 cuts from SPEC.md §"Out of scope for v0.1". Reasons attached to prevent re-adding. -->

- iOS Share extension — impossible in a PWA; replaced by in-app Paste URL surface
- Album (shared masonry photo grid) — cut from v0.1 per `04-CONTEXT.md` (c7ee1f0); not useful enough at couple-scale in v0.1
- Mid-cook timer / step-by-step cooking UI — not where the daily-debate value lives
- Shopping list integration — adjacent product, separate v0.2 conversation
- Native iOS / Android apps — kills $0/year distribution; PWA is the whole point
- 5-star rating granularity — locked to `loved`/`liked`/`disliked` (decision-relevant signal only)
- Avatars — color attribution only; simpler ship, fewer assets to design
- Collaborative filtering / preference learning — corpus too small at couple-scale
- Real-time co-swipe voting — async voting matches actual usage rhythm
- OAuth login — invite-code sufficient; `auth_token` column generalizes to magic-link later
- In-app Web Speech for voice notes — broken on iOS PWA standalone; OS-keyboard-mic affordance documented

## Context

- **v0.1 shipped (2026-05-08):** Full 4-wave build complete. 5 phases (including urgent Phase 01.1 cookie-auth fix), 31 plans, 49 requirements. Phase 01.1 was inserted after Phase 1 when dual-phone testing revealed iOS Safari evicts `localStorage` on PWA force-quit — migrated to same-origin HttpOnly cookies via Next.js rewrite proxy.
- **Source of truth:** `SPEC.md` at the repo root. All locked vocabularies, the data model, the capture pipeline, the scoring algorithm, the voting state machine, the auth scheme, and the wave-based build plan live there.
- **Behavioral done definition:** ≥ 2 weeks of daily use by both members at end of W4. Dogfood gate is the next milestone gate before v0.2 planning begins.
- **Distribution model:** Both phones install via Safari → Share → Add to Home Screen. Updates ship via `git push` → Vercel/Railway auto-deploy → next page load. No App Store, no TestFlight, no Apple Developer Program.
- **Productize-later mindset:** Built clean enough to fork into a real product later. Productize-only debt marked inline as `// TODO(productize)`; intra-version work is plain `// TODO`.
- **Key risks still open:** iOS Safari PWA cache quirks (mitigated by cookie auth); Gemini French prompt fragility (budgeted at ~1.5× W2 effort; appears stable in testing); WebSocket reliability on Railway free tier (exponential backoff in place); motivation drop at week 10–14 (W1 dogfood gate was the antidote — passed).

## Constraints

- **Tech stack**: Next.js 16.2.4 + React 19.2.4 + TypeScript 5 + Tailwind v4 + shadcn/ui + `next-pwa` + `framer-motion` (frontend); FastAPI + Pydantic + SQLAlchemy 2.0 + Alembic + `google-generativeai` (Gemini 2.5 Flash) + APScheduler (backend); Supabase Postgres + Storage. Pinned in SPEC.md §Stack.
- **Distribution**: PWA only — installed via Safari → Add to Home Screen. $0/year.
- **Hosting**: Vercel (frontend, free tier) + Railway (backend, ~$5/mo) + Supabase (Postgres + Storage, free tier).
- **Localization**: French only. All strings via `next-intl` — hardcoded strings are productize-later debt.
- **Audience**: Single household (Luca + partner). Multi-tenant cleanliness preserved for productize-later.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PWA + `next-pwa` over native iOS | $0/year, no App Store friction | ✅ Validated — works on both iPhones |
| Python (FastAPI) backend over Node | Gemini Python SDK is reference impl | ✅ Validated — smooth integration |
| Invite-code auth over OAuth | Simpler for v0.1; `auth_token` generalizes | ✅ Validated — sufficient for 2-person household |
| Same-origin HttpOnly cookie auth (Phase 01.1) | iOS Safari evicts `localStorage` on force-quit | ✅ Validated — eliminates onboarding repeat on reconnect |
| Server-side `BackgroundTask` promotion | Single source of truth, no race | ✅ Validated — no device-vs-device conflicts |
| Voting state computed, not stored | No `state` column to drift from votes | ✅ Validated — derivation clean, no sync bugs |
| Denormalized `last_cooked_at` + `cook_count` | Same-tx update; read-time perf | ✅ Validated — architecture invariant held |
| Raw inputs in `source_capture` JSONB | Re-prompt with better model later | ✅ Validated — transcripts preserved |
| OS-keyboard-mic for voice notes | In-app Web Speech dead on iOS PWA standalone | ✅ Validated — helper copy directs users to keyboard mic |
| Album cut to v2 | Not useful enough at couple-scale in v0.1 | ✅ Validated — no perceived gap in dogfood |
| 3-value rating (`loved`/`liked`/`disliked`) | Decision-relevant signal only | ✅ Validated — sufficient for shortlist weighting |
| 4 waves with dogfood gates between each | Behavioral validation beats feature-completeness | ✅ Validated — W1 gate kept motivation high |
| DOM CustomEvent bridge for WS → React | Decouples RealtimeProvider from page state | ✅ Validated — clean pattern, used for 6 event types |
| Fraunces + IBM Plex Sans typography (v0.2 Phase 5) | Slow Food editorial feel; both on Google Fonts; latin+latin-ext subsets clear iOS Safari French diacritic gate | ✅ Validated — visual smoke test approved, UI audit 23/24 |
| Token preservation via aliases (v0.2 Phase 5) | DESIGN-03: keep all v0.1 token names so component churn stays at zero during the migration | ✅ Validated — 10 primitives re-themed via in-place className edits, no API breakage |
| Bearer-header auth shortcut + storageState cookie for tests (v0.2.1 Phase 10 D-01) | Backend `auth.py` already accepts Bearer as a fallback for local dev; cookie additionally needed because the WS upgrade only reads the cookie / `?token=` (Authorization header is ignored on WS) — without the cookie, ws.ts:113 fires DELETE+redirect, racing every page.goto assertion to onboarding | ✅ Validated — 14/14 specs pass at iPhone-shape Chromium viewport |
| Docker Postgres on `:5433/aldente_test` for tests (v0.2.1 D-02) | Dev hits Supabase remote; tests need a hermetic local DB with a clean teardown story. Docker for tests is the carve-out from "no Docker Postgres for dev" | ✅ Validated — `docker compose down -v` is the canonical reset; T-10-01 hard-refusal guard prevents seed from targeting non-test DB |
| Env-flag stub for Gemini + Supabase Storage (v0.2.1 D-04) | The no-mock-DB rule is about the database; external paid APIs need stubs to avoid cost + flake. `if settings.environment == "test":` short-circuits at the service boundary | ✅ Validated — capture-voice / capture-photo specs run end-to-end with deterministic canned data |
| uuid5 + Session.merge upsert seed (v0.2.1 D-09) | Idempotency is in the success criteria; TRUNCATE+INSERT breaks "re-running mid-test." uuid5 is deterministic across runs and machines | ✅ Validated — same household / member / shortlist UUIDs across re-runs, no duplicate-key errors on second invocation within the same day. Cross-day hole surfaced (SEED-01) — workaround documented |
| iPhone-shape Chromium viewport for tests (v0.2.1 post-ship) | The PWA ships to two iPhones; testing at desktop-sized viewports masks mobile-only layout bugs (e.g. Sheet-01 [#1](https://github.com/lucaguery/al-dente/issues/1)). 390×844 + isMobile + hasTouch + Chromium catches them while staying under the cross-browser non-goal | ✅ Validated — surfaced the Sheet-01 bug via Playwright MCP, then encoded `toBeInViewport()` assertion that catches future regressions |

## Current Milestone: v0.3 Audit & Uniqueness Foundation

**Goal:** Produce a grounded, evidence-backed assessment of Al Dente's current UX and design quality against a real production environment, so v0.4 can target what genuinely makes the app unique.

**Target features:**
- **Production-accessible synthetic household** — extend `uv run seed` to run idempotently against prod Supabase, producing a single permanent labeled household ("[SYNTHETIC] Démo Al Dente" or similar) with a stable invite code returned. User can inspect the synthetic env from their own phone alongside the automated audit.
- **Exploratory feature walkthrough** — Playwright MCP agent navigates the app like a human against the synthetic env: every shipped surface (5 capture flows, shortlist, voting, cooking log, exports, push, realtime sync, onboarding). Output: bug list + UX friction notes. Mode is exploratory (improvised inputs surfacing surprises), not scripted golden paths.
- **Design quality & originality audit** — Playwright MCP-driven visual exploration on the synthetic env, layered with `/gsd-ui-review`'s retroactive 6-pillar audit. Scope: every screen the synthetic household reaches. Output: per-surface scored UI-REVIEW + a "feels generic vs. feels Al Dente" judgment per surface.
- **Synthesis** — single ranked-findings assessment document. **Not** a v0.4 roadmap proposal — clean separation between "what we found" and "what we should do about it" (v0.4 milestone planning is a separate `/gsd-new-milestone` cycle).

**Key context / constraints:**
- Zero new product features in v0.3. Audit only.
- Synthetic seed in prod must not contaminate real user data — household labeling + isolation are load-bearing constraints.
- Builds directly on v0.2.1 Phase 10 infrastructure (idempotent local seed, Playwright wired in `frontend/tests/e2e/`, iPhone-shape Chromium viewport, `toBeInViewport()` assertions).
- Phase numbering continues from v0.2.1 — this milestone starts at **Phase 11**.

## Future Milestones (deferred)

Candidates from v0.1 v2 backlog, NOT in v0.2 scope:

- **V2-ALBUM-01/02/03** — Shared cooking-log photo gallery (cut from v0.1)
- **V2-AUTH-01** — Supabase Auth magic-link migration (removes invite-code fragility)
- **V2-MODEL-01** — Per-member ratings (richer preference signal)
- **V2-UX-02** — Custom illustrations + app icon (polish for sharing)

## Evolution

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-09 — v0.3 (Audit & Uniqueness Foundation) milestone scoped. Goal: grounded assessment of current UX + design quality on a real production environment to inform v0.4. Audit-only, no new product features. Phase numbering continues at Phase 11. Requirements + roadmap to follow within this `/gsd-new-milestone` cycle.*
