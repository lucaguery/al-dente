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

### Active (v0.2 — Polish: Slow Food artisanal identity)

*(Defined via `/gsd-new-milestone` 2026-05-08. Detailed REQ-IDs in `.planning/REQUIREMENTS.md`.)*

- ✅ **Phase 5 complete** — Re-themed design system foundation: tokens (terracotta + warm-cream + warm-taupe + ink), Fraunces + IBM Plex Sans typography, paper-grain texture anchor, warm two-layer shadows, motion language (`--ease-craft` + 150/280ms durations), 10/15 shadcn primitives re-themed, dev-only `/styleguide` acceptance gate. UI audit 23/24 (DESIGN-01..08 validated)
- ✅ **Phase 6 complete** — All 5 capture surfaces + drafts inbox polished to the Slow Food artisanal system. CAPTURE-11 W4 tap-target gap closed (PhotoUploader sheet h-12 + 48px X-overlay hit-pad). D-Voice persistent callout (paper-grain Card + Fraunces italic headline) reinforces the keyboard-mic deviation. Drafts inbox uses AnimatePresence for `recipe.created` slideUp and `recipe.promoted` Badge cross-fade. Phase 5 font-heading deferrals closed. UI audit 22/24 (CAPTURE-08..13 validated)
- Per-screen polish: voting + shortlist (Phase 7), recipe detail + cooking log (Phase 8), onboarding + settings + identity (Phase 9)
- Close W4 UI-REVIEW gaps inline as part of the polish pass
- Demonstrable satisfaction of four design principles on every screen: Design Quality, Originality, Craft, Functionality

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

## Current Milestone: v0.2 — Polish: Slow Food artisanal identity

**Goal:** Re-theme every screen of Al Dente to deliver a coherent Slow Food artisanal identity (warm, intimate, restrained Italian heritage) that demonstrably satisfies the four design principles: Design Quality, Originality, Craft, Functionality.

**Source of design decisions:** `.planning/notes/v0.2-design-direction.md` — locked output of `/gsd-explore` session (2026-05-08). Every UI-SPEC contract and phase plan must cite this document and resist re-litigating it.

**Target features:**

- Re-themed design system foundation: terracotta accent + cream / ink / warm-gray neutrals replacing rose `#F43F5E` + slate; new display serif replacing Playfair; paper-grain anchor on card surfaces; warm shadows replacing cool box-shadows; tokens consolidated in Tailwind v4 `@theme`
- Re-themed shadcn primitives in `frontend/components/ui/*` (Button, Input, Card, Dialog, Sheet, etc.) — modified in place rather than vanilla shadcn
- Per-screen polish: capture surfaces (quick / full / voice / photo / URL), voting + shortlist (swipe deck, vote chips), recipe detail + cooking log finalize, onboarding + settings
- Close W4 `04-UI-REVIEW.md` gaps inline as part of the polish pass (RatingPicker `transition-transform`, CookingBanner `h-12`, missing offline i18n keys, etc.)

**Anti-patterns (committed in `.planning/notes/v0.2-design-direction.md`):**

No purple gradients on white cards · No unmodified shadcn defaults · No cool grays (slate / zinc) on surfaces · No "lean handmade" overload (paper-grain only, no hand-drawn dividers) · No Geist alone or Geist+Inter pairing · No trattoria theming · No clinical / Vignelli-modernist direction · No themed chrome that fights food photography content

**Key constraints:**

- Polish only — no functional regressions on cookie auth, WebSocket realtime, Gemini capture, scoring, or daily shortlist
- W4 polish baseline scored 20/24 in Phase 4 UI-REVIEW (`04-UI-REVIEW.md`) — current floor, not from-scratch
- Typography pairing decision is open — research gated by the question in `.planning/research/questions.md`, answered when the design-system foundation phase plans
- French-only via `next-intl`; French diacritic rendering on iOS Safari is a hard typography constraint
- Solo dev, ~1 weekend/week budget — phase scoping reflects that
- Push to `main` → auto-deploy to Vercel + Railway; no manual `vercel --prod`

**Success criteria (behavioral):**

- After v0.2 ships, every screen demonstrably satisfies the four design principles
- A retrospective `/gsd-ui-review` on the full app scores ≥ 22/24 across the 6 pillars (raised from W4's 20/24 on Phase-4 surfaces only)
- The design reads as a coherent whole — not "Phase-4-polished + everything-else-stock"

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
*Last updated: 2026-05-08 — v0.2 Phase 6 (Capture surfaces polish) shipped at 22/24 UI score. CAPTURE-08..13 validated; W4 PhotoUploader gap closed. Phases 7–9 (decide / cook / onboarding polish) pending.*
