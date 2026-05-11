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

**v0.3 Phase 13 shipped** — 2026-05-10. Design quality & originality audit completed. 4 plans, 14 surfaces scored against `/gsd-ui-review`'s 6-pillar rubric with the new "feels generic vs feels Al Dente" originality verdict (hybrid token-compliance + editorial-cohesion definition per D-02). Per-surface UI-REVIEW files at `.planning/v0.3/ui-reviews/` (14 files), ~48 supporting screenshots, milestone aggregator at `.planning/v0.3/UI-AUDIT.md`. Cumulative mean 20.21/24 across 14 surfaces (~2 below v0.2 anchor of 22.4/24); verdict distribution **5 Feels Al Dente ✅ / 9 Mixed ⚠ / 0 Feels Generic ❌**. Pillar 6 (Experience Design) is the load-bearing gap — 0 of 14 surfaces score 4/4. Surfaced 13 cross-cutting observations including the token-completeness gap (5 surfaces share the Tailwind-palette-literal pattern where custom CSS variables would close the system), uniform strength on typography/spacing/copy, and the architecture-invariant-violations cluster. Zero product-code drift; zero new GitHub issues. Verified passed (4/4 must-haves) by gsd-verifier.

**v0.3 Phase 14 shipped** — 2026-05-11. Synthesis & handoff completed — v0.3 milestone closes. 2 plans, 510-line `.planning/v0.3/ASSESSMENT.md` combining WALKTHROUGH.md + UI-AUDIT.md into a tiered ranked findings list ordered by impact on the "feels Al Dente" question. **27 ranked entries: 2 Tier 1 / 8 Tier 2 / 17 Tier 3** under a locked 3-axis composite rubric (identity-signature impact / invariant-violation visible / primary-path friction; each 0-2; total 0-6). Tier 1 anchored by B-3 (`MEMBER_COUNT=2` hardcoded — architecture invariant #2 broken, Issue #4) and B-4 (`cook_count` re-finalize idempotency — invariant #3 broken, Issue #5). Anti-prescription discipline enforced structurally via `.planning/v0.3/check-assessment.sh` grep gate (D-08 forward-only regex blocks `v0.4`, prescriptive verbs, future phase numbers); doc passes the gate. Closes with explicit "Inputs to next /gsd-new-milestone cycle" section (artifacts + 5 inquiry-form framing questions + 5 explicit non-prescriptions). Zero product-code drift; zero new GitHub issues. Verified passed (3/3 must-haves) by gsd-verifier.

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

### Validated (v0.3 — shipped 2026-05-11)

- ✅ **All 16 v0.3 requirements validated** across Phases 11–14 (SEED × 5, WALK × 4, AUDIT × 4, SYNTH × 3). Audit-only milestone — zero new product features, zero product-code drift. Produced 4 milestone-level artifacts in `.planning/v0.3/`: `RUNBOOK.md` (Phase 11 prod synthetic ops), `WALKTHROUGH.md` (Phase 12 — 1,276 lines, ~64 severity-tagged findings across 14 surfaces), `UI-AUDIT.md` (Phase 13 — 14 surface scores, mean 20.21/24, 5✅/9⚠/0❌, 13 cross-cutting observations), `ASSESSMENT.md` (Phase 14 — 510 lines, 27 ranked findings across 3 tiers ordered by impact on "feels Al Dente"). 8 GitHub issues filed under `audit:walkthrough` label (#1–#8). The `ASSESSMENT.md` Tier 1 finding pair is anchored on architecture-invariant violations: B-3 (`MEMBER_COUNT=2` hardcoded breaking invariant #2 user-visibly in non-2-member households) and B-4 (`cook_count` re-finalize idempotency breaking invariant #3). The synthesis is descriptive-only — no v0.4 phase proposals — enforced by the `.planning/v0.3/check-assessment.sh` grep gate.

### Active

**v0.4 Audit Remediation & Identity Polish** scoped 2026-05-11. Consumes `.planning/v0.3/ASSESSMENT.md` (27 ranked findings), `UI-AUDIT.md`, `WALKTHROUGH.md`, and GitHub Issues #1–#8 as inputs. Targets the highest-impact correctness violations (both Tier 1 architecture-invariant breaks + 4 Tier 2 correctness clusters) and two identity-signature directions (token-completeness sweep + Pillar 6 deficit pass), plus the v0.2.2 orthogonal backlog (TZ-01, SEED-01, POLISH-01/02). Requirements pending — to be authored in the next step of this `/gsd-new-milestone` cycle.

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

## Current Milestone: v0.4 Audit Remediation & Identity Polish

**Goal:** Close the highest-impact correctness violations and UI gaps surfaced by the v0.3 audit corpus, advancing the "feels Al Dente" verdict distribution without adding new product capabilities.

**Target features:**

*Correctness — close architecture-invariant violations + structurally-decommissioned features:*
- **Tier 1 invariant fixes** — eliminate the `MEMBER_COUNT=2` hardcode so the 5-state vote chip computes correctly in non-2-member households (B-3, invariant #2, Issue #4); fix `cook_count` double-increment on re-finalize so the denormalized `cook_count`/`last_cooked_at` columns honor invariant #3 (B-4, Issue #5).
- **Capture pipeline correctness** — add a `failed` terminal state to the `recipes` model + recovery affordance for stuck `(extraction en cours…)` drafts across voice/photo/url (C-4); fix the ingredient parser regex so `<int> <noun>` lines (`4 tomates`, `1 oignon rouge`) round-trip correctly to the recipe-detail page (B-2, Issue #2).
- **History feature restoration** — restore `GET /api/cooking-logs` list endpoint (B-10, CL-01) and add `frontend/app/cooking-logs/[id]/page.tsx` detail route (B-5, Issue #6). The 5KB notes feature ships a write path with no read path today; this closes the loop.
- **Identity management** — add `PATCH /api/households/me` route + Settings UI affordance for member rename (B-7, Issue #8); add household-capacity copy + 422 enforcement on join when the color palette is exhausted (B-6, Issue #7).
- **Validation surfaces** — fix Sheet-01 (`paper-grain` overriding Tailwind `fixed` on Radix Sheet, photo-source 35px off-screen on iPhone, B-1, Issue #1); fix Push UX three-gap cluster — Settings recovery surface after `Pas maintenant` dismiss, admin-test fire endpoint, end-to-end round-trip verification (B-13).

*Identity polish — close the design-system gaps driving the Pillar 6 corpus deficit:*
- **Token-completeness sweep** — replace emerald Tailwind literals (`text-emerald-500`, `border-emerald-500/50`, `text-emerald-700`) across 5 surfaces + `MEMBER_COLORS` raw hex with semantic CSS variables (e.g. `--color-valide-foreground`, `--color-cooking-foreground`, `--color-member-{rose,amber,emerald,sky,violet}-{bg,foreground}`). Observable in `/styleguide` (C-1).
- **Pillar 6 deficit pass** — surface-by-surface experience-design upgrades aiming to flip ≥3 surfaces from ⚠ Mixed to ✅ Feels Al Dente. Working spec: per-surface `ui-reviews/*-UI-REVIEW.md` Pillar 6 dock notes.

*Orthogonal v0.2.2 backlog (rolled in):*
- **TZ-01** — cooking-log active-cook filter uses Python local-tz vs UTC DB date at `cooking_logs.py:72-78,118-126`; late-evening cooks fall through. Fix unblocks the `cooking-log-create-finalize.spec.ts` `test.fixme`.
- **SEED-01** — cross-day idempotency hole at `cli/seed.py:369,405`. Replace the `docker compose down -v` workaround with proper composite-key handling.
- **POLISH-01** — `next-intl` sweep on HomeDecide partner-waiting strings + hardcoded `Historique` / `Voir les cuissons récentes` in `settings/page.tsx:175-183` (invariant #6 code-layer break).
- **POLISH-02** — Copy button on the Settings invite-code Card (Phase 9 deferral; also surfaced in WALKTHROUGH).

**Key context / constraints:**
- Zero new product features. v0.4 is bounded to remediation + polish; new capabilities (album, magic-link auth, per-member ratings) remain v2 backlog.
- Builds on v0.3 audit corpus — `.planning/v0.3/ASSESSMENT.md` (27 ranked findings), `UI-AUDIT.md`, `WALKTHROUGH.md`, and GitHub Issues #1–#8 are the canonical inputs.
- Architecture invariants from `CLAUDE.md` are load-bearing — invariant #1 (5 capture surfaces, one shape) shapes the C-4 failed-state work; invariant #2 (voting state computed) shapes B-3; invariant #3 (same-tx denormalized fields) shapes B-4; invariant #6 (`next-intl` French-only) shapes POLISH-01.
- **URL-01 explicitly NOT in scope** — URL extraction stays `# TODO(productize)`. The C-4 failed-state work surfaces the deferred stub with a recovery affordance instead of resolving the extraction itself.
- Phase numbering continues from v0.3 — this milestone starts at **Phase 15**.
- Tight scope target: ~5-7 phases. Each phase clusters one Tier 1 or Tier 2 finding pair to keep commits atomic and ship-velocity high (the v0.2 single-day shape).
- Behavioral validation gate (≥ 2 weeks daily use by both members from the v0.1 definition-of-done) remains pending — orthogonal to v0.4 phases.

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
*Last updated: 2026-05-11 — v0.4 (Audit Remediation & Identity Polish) milestone scoped. Consumes `.planning/v0.3/ASSESSMENT.md` (27 ranked findings), `UI-AUDIT.md`, `WALKTHROUGH.md`, and GitHub Issues #1–#8 as canonical inputs. Tight scope (~5-7 phases) covering both Tier 1 invariant fixes (B-3 MEMBER_COUNT, B-4 cook_count) + 4 Tier 2 correctness clusters (capture pipeline C-4/B-2, history B-5/B-10, identity-mgmt B-6/B-7, Sheet-01 + Push B-1/B-13) + 2 UI directions (token-completeness C-1 + Pillar 6 deficit pass) + v0.2.2 backlog roll-in (TZ-01, SEED-01, POLISH-01/02). Requirements + roadmap pending in the active `/gsd-new-milestone` cycle. Phase numbering continues — v0.4 starts at Phase 15.*
