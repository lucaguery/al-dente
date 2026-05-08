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

**Behavioral validation gate:** ≥ 2 weeks of daily use by both members (the v0.1 definition of done per SPEC.md). This is the next observable milestone before v0.2 planning begins.

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

### Active (v0.2.1 — E2E test infrastructure)

*(Defined via `/gsd-new-milestone` 2026-05-08. Patch milestone scoped to one phase. Full REQ-IDs in `.planning/REQUIREMENTS.md`. v0.2 requirements archived at `.planning/milestones/v0.2-REQUIREMENTS.md`.)*

- [ ] **TEST-01**: Backend Python seed script — idempotent `uv run seed` CLI creates one household, one member with a fixed env-overridable `auth_token`, and 20+ recipes spread across the locked enums (Season / Cuisine / Mood / Protein) with cooking_logs + votes so derived state (vote-state computation, `recipes.last_cooked_at`, `recipes.cook_count`) renders non-empty. Imports the Python `Enum` classes directly — no duplicated values.
- [ ] **TEST-02**: Committed Playwright suite (`@playwright/test`) under `frontend/tests/` covering each screen and each user action: capture (quick / full only — voice / photo / url marked `test.fixme` if not wired), voting, shortlist, recipe detail, cooking log finalize. Specs read the test `auth_token` from env to skip onboarding.
- [ ] **TEST-03**: Bootstrap runbook + `npm` / `uv` scripts — fresh checkout reaches a green Playwright run in ≤ 5 commands (seed → start backend → start frontend → run Playwright).
- [ ] **TEST-04**: Invite-code happy-path spec — one Playwright spec exercises `/onboarding/create` → invite code → `/onboarding/join` end-to-end without using the seeded auth shortcut, validating the join flow stays green.

**Out of scope (v0.2.1):** product-code refactors, new product features, voice / photo / url capture if not wired (mark `test.fixme`), production hosting (Railway / Vercel / Supabase prod). Local-only.

### Validated (v0.2 — shipped 2026-05-08)

- ✅ **All 31 v0.2 requirements validated** across Phases 5–9 (DESIGN × 8, CAPTURE × 6, DECIDE × 5, COOK × 7, ONBOARD × 5). Average UI audit 22.4 / 24. Per-phase summaries preserved in `.planning/milestones/v0.2-ROADMAP.md` and the per-phase SUMMARY files. Demonstrable satisfaction of the four design principles (Design Quality, Originality, Craft, Functionality) on every screen. Pending: ≥ 2-week daily-use validation gate.

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

## Current Milestone: v0.2.1 — E2E test infrastructure

**Goal:** Make the shipped v0.1 / v0.2 PWA testable end-to-end on a fresh checkout: a one-command synthetic seed and a committed Playwright suite that exercises every screen and action.

**Why now:** v0.2 closed without a regression net. Manual UAT on physical iPhones is the only safety we have, and rebuilding household state by hand to test a single flow is slow enough that I avoid it — which means regressions slip in. This milestone fixes that for the rest of v0.2.x and v1.0 work.

**Target features (one phase):**

- **Phase 10 — E2E test infrastructure & synthetic seed**
  - Idempotent backend seed via `uv run seed` (1 household + 1 member with fixed `auth_token` + 20+ recipes spanning the locked enums + cooking_logs + votes for derived state)
  - Committed `@playwright/test` suite under `frontend/tests/` covering capture (wired surfaces), voting, shortlist, recipe detail, cooking log
  - Bootstrap runbook + npm / uv scripts so a fresh checkout reaches a green run in ≤ 5 commands
  - One invite-code happy-path spec that does NOT use the seeded auth shortcut

**Anti-patterns (committed for this milestone):**

No product-code refactors during this phase · No new product features · No tests against Railway / Vercel / Supabase prod (local-only) · No drift between `frontend/lib/enums.ts` and the Python `Enum` classes — seed imports the Python enums, never duplicates values · No mocking the database — tests hit a real Postgres seeded by the same migrations product code uses

**Key constraints:**

- Local-only. `DATABASE_URL_TEST` separate from dev DB.
- Push to `main` is the only deploy path — never run `vercel --prod` or manual Railway deploys.
- Voice / photo / url capture surfaces that aren't wired yet → mark spec `test.fixme` with TODO and move on. Surface real bugs to me before fixing.
- Executor scope creep is a known failure mode (see `.planning/STATE.md` accumulated context). Pass prior CONTEXT.md and SUMMARY.md to the executor; tests + seed + scripts only unless a real bug is surfaced and approved.
- Solo dev, ~1 weekend/week budget — single-phase milestone, ship and move on.

**Success criteria (behavioral):**

- A teammate (or future-me on a fresh laptop) runs ≤ 5 commands from a clean clone and sees Playwright report all green specs.
- The seeded household renders the shortlist, vote chips, recipe detail, and cooking log with realistic data (no empty states masking bugs).
- Re-running `uv run seed` does not double-insert recipes, votes, or cooking logs (idempotency proven by re-running mid-test).
- A regression introduced into `frontend/components/ShortlistDeck.tsx` or `backend/app/routers/votes.py` is caught by the suite, not by manual UAT.

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
*Last updated: 2026-05-08 — v0.2.1 milestone started: E2E test infrastructure (single phase — Phase 10). Goal is a one-command synthetic seed plus a committed Playwright suite covering every shipped screen. v0.2 polish complete (5 phases, 22.4/24 average UI audit) and now in Validated. v0.2 deferred items (i18n sweep on partner-waiting strings, Copy button on partner-waiting Card per `.planning/milestones/v0.2-MILESTONE-AUDIT.md`) intentionally NOT folded into v0.2.1 yet — fold via `/gsd-add-phase` if/when scope warrants.*
