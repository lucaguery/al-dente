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

**v0.5 Phase 22 shipped** — 2026-05-12. Three independent polish drops closing `audit:walkthrough`-era issues #13/#15/#21. **QW-01** (gh#13): `Geist_Mono` font import + `geistMono` className mount removed from `app/layout.tsx`; `--font-mono` self-reference removed from `globals.css`; the two `font-mono` call sites (invite-code input on `/onboarding/join` + URL input on `UrlCaptureTab`) swapped to `tabular-nums` — letter-spacing + IBM Plex Sans's tabular-nums variant carry the "code" signal without a second font request. D-18 grep gate passes: zero `font-mono|--font-mono|Geist_Mono` across `frontend/{app,components,lib}`. **QW-02** (gh#15): NEW `frontend/components/VersionFooter.tsx` client component renders a centered `v{version} · {sha} · {env}` muted line at the bottom of `/settings` (U+00B7 middle-dot separators, always-visible env label, plain-text SHA — no GitHub link coupling per D-09); `frontend/next.config.ts` gained an `env: {}` block re-exporting `npm_package_version` → `NEXT_PUBLIC_APP_VERSION`, `VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev"` → `NEXT_PUBLIC_GIT_SHA`, and `VERCEL_ENV ?? "development"` → `NEXT_PUBLIC_VERCEL_ENV` (build-time only; full SHA never reaches the client bundle). `aria-label="Version de l'application"` added for screen-reader accessibility. **QW-03** (gh#21): `ShortlistCard.tsx` and `recipes/[id]/page.tsx` now wrap their cuisine/mood/protein renders with the existing `useEnumLabels()` hook (`frontend/lib/enum-labels.ts`, the canonical translator — not modified per D-13), so raw enum keys like `mediterranean` / `italian` / `beef` no longer leak to the user. Inbox `D-14` no-op confirmed (drafts inbox renders no cuisine/mood/protein today); `recipe.season` `D-15` grep returned zero matches. 3 plans / 3 wave-1 parallel executor agents / 12 atomic commits via worktree isolation. Code review: 0 critical / 0 warning / 3 info (all expected — hardcoded `aria-label` accepted per D-06, no-op `tabular-nums` on URL field intentional per D-02, `npm_package_version` fallback already in place). Phase verifier skipped per `workflow.verifier: false` — D-18 grep gates serve as the goal-achievement check. v0.5 Active progress: 1/3 phases complete.

**v0.5 Phase 23 shipped** — 2026-05-13. Four DECK-* requirements landed in **one atomic commit** per D-23, closing `audit:walkthrough`-era issues #14/#16/#17/#18. **DECK-01** (gh#14): OUI/NON text overlays at `ShortlistCard.tsx:280-296` replaced by **two stacked `motion.div`s with `ring-2 ring-inset` strokes** — yes-ring `--color-valide-foreground` (emerald), no-ring `--destructive`, opacity driven by the existing `yesOpacity`/`noOpacity` `useTransform` hooks; **deliberate design deviation** from REQUIREMENTS.md DECK-01's literal "full-card background tint" wording (rewritten in same commit per D-01). `ring-inset` chosen (not plain `ring-*`) because Tailwind's `ring-*` utility renders as `box-shadow` and gets clipped by the outer card's `overflow-hidden` (RESEARCH SE-1). Conditional MOUNT under `{isFront && !reducedMotion && (...)}` — not opacity-zero — so reduced-motion path skips `useTransform` updates entirely. **DECK-02** (gh#18): four `swipe-tokens.ts` constants retuned — `SWIPE_THRESHOLD_PX` 100→**140**, `SWIPE_VELOCITY_PX_S` 500→**750**, `SWIPE_OVERLAY_INPUT_PX` 100→**80** (ring full at ~80px, well before commit), `SWIPE_FLYOFF_DURATION_S` 0.2→**0.28**. Legacy `SWIPE_SPRING` constant deleted (grep-confirmed zero importers). Snap-back already uses `transitions.springSnap` (240/28/1.1) from Phase 7 — no change there. **DECK-03** (gh#17): `ShortlistThumbButtons` icons swap to filled/outline Hearts — yes button `<Heart fill="currentColor" />` in emerald, no button `<Heart />` outline in `text-foreground-muted` with `border-border` (destructive-red removed entirely; reads "unloved" not "rejected"). `X` removed from lucide-react import at L19. **DECK-04** (gh#16): `useRouter` from `next/navigation` + `panRef = useRef(false)` pattern — `onPanStart` sets true; `onPanEnd` does `setTimeout(() => { panRef.current = false }, 0)` (RESEARCH W-02: `setTimeout(0)` is the right primitive — rAF and microtask have iOS Safari edge cases); `onTap` checks `!panRef.current && isFront` before `router.push(\`/recipes/${recipe.id}\`)`. Thumb-button taps still vote (structurally separate component, no propagation). Back-button preserved free via the unvoted-filter (no `?card=` URL state needed). 1 plan / 1 wave-1 executor / 1 atomic commit (`98a0112` + post-hoc summary/REQ housekeeping commits). Code review: 0 critical / 0 warning / 3 info (all optional nits: noOpacity symmetric form, ring DOM order vs partner-vote footer, flyX render-cost). Phase verifier skipped per `workflow.verifier: false` — D-26 grep gates serve as the goal-achievement check. v0.5 Active progress: 2/3 phases complete (Phase 24 Recipe identity remains).

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

### Validated (v0.4 — shipped 2026-05-11)

- ✅ **All 24 v0.4 requirements validated** across Phases 15–21 (INV × 2, CAP × 3, HIST × 2, IDM × 4, VAL × 4, TOK × 3, FIX × 4, P6 × 2). Closed both v0.3 Tier 1 invariant breaks (B-3 MEMBER_COUNT hardcode broken invariant #2 + B-4 cook_count re-finalize broken invariant #3), 4 Tier 2 correctness clusters (capture pipeline failed-state recovery + ingredient parser; history list + detail + TZ-01 timezone fix; identity rename + capacity 422 + Copy button; Sheet-01 + Push admin endpoint + Notifications recovery Card), the C-1 token-completeness gap (15 new semantic CSS variables — 5 emerald-replacement + 10 member-color — consumed by 7 audit-cited surfaces and surfaced in `/styleguide`), the FIX-03 invariant #6 next-intl drift, and the entire v0.2.2 backlog (TZ-01, SEED-01, POLISH-01/02). Produced `.planning/v0.4/UI-RESCORE.md` (cumulative-mean delta +1.50 vs v0.3 baseline under SAME 6-pillar rubric; verdict distribution shifted from 5✅/9⚠/0❌ to 11✅/3⚠/0❌; 6 surfaces flipped Mixed → Al Dente: vote, cooking-log, capture-full, capture-photo, history, push) and `.planning/v0.4/PUSH-ROUNDTRIP.md` (template closing the P-12-Pu-05 operator deferral, pending iPhone fill-in). 7 phases, 27 plans, ~140 commits. **15 HUMAN-UAT items** remain across phases 16/17/18/19/21 — operator runtime validation (Playwright suites against live dev stack, Web Push round-trip on both iPhones, manual UX exercise of failed-state inbox + 4-state Notifications Card).

### Active

**v0.5 — Mixed Sweep** (3 phases, ~10 GitHub issues). Closes a coherent cluster of `audit:walkthrough`-era issues + post-v0.4 polish across three themes: quick wins (#13/#15/#21), swipe-deck polish (#14/#18/#17/#16), and recipe identity (#11/#22/#10/#12). Locked decisions: #10 LLM title rewrite is **silent overwrite** with `promotion_error` fallback on rewrite failure (shifts invariant #1 — quick/full-form become async); #17 thumb-button direction is **filled Heart / outline Heart** (emerald for filled, neutral for empty). Out of scope: #20 (defers to v0.6 — needs its own `/gsd-explore`).

**Progress:** 1/3 phases complete. Phase 22 (Quick wins: QW-01/02/03 → gh#13/#15/#21) shipped 2026-05-12 — see Current State. Phase 23 (Deck polish) and Phase 24 (Recipe identity) remain.

### Surfaced for follow-up (deferred to v2 or future milestone)

- **Sheet visual identity polish** — paper-grain was removed from Sheet to fix Sheet-01; could be reintroduced on an inner wrapper that doesn't break Radix positioning. Phase 21 Pillar 6 candidate for a future milestone.
- **URL extraction (URL-01)** — `# TODO(productize)` at `recipes.py:481-490`. v0.4 surfaced the deferred stub via the new `failed` terminal state (Phase 16) but did not resolve extraction. capture-url surface stays ⚠ Mixed.
- **capture-quick polish** — P-12-Q02 (422-as-network-loss copy) + P-12-Q03 (no submit debounce). Not opened as v0.4 reqs; deferred.
- **exports surface** — P-12-E02 offline button + P-12-E03 double-fetch race. Not on v0.4 docket; deferred.
- **N>5 capacity expansion** — Phase 18 fixed the affordance for the 5-slot ceiling; raising the ceiling itself (6-color extension, design-system review) is v2 backlog.

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

## Current Milestone: v0.5 Mixed Sweep

**Goal:** Close ~10 open GitHub issues across three coherent themes — quick wins, swipe-deck polish, and recipe identity — into a single tight sweep that pays down post-audit backlog without expanding scope.

**Target features (by theme):**

- **Quick wins** — drop the Geist Mono dependency (#13), surface a build-time version footer (#15), and finish the i18n tags display sweep (#21).
- **Deck polish** — replace OUI/NON drag overlays with tint (#14), tune swipe thresholds + spring (#18), rework like/dislike thumb buttons to filled Heart / outline Heart (#17), and add tap-to-detail on shortlist cards (#16).
- **Recipe identity** — add a BrandIcon component (#11), build the recipe completeness scorecard + 3 new fields including a Difficulty enum (#22), generate LLM "catchy" titles across all capture surfaces (#10), and produce per-recipe SVG illustrations (#12).

**Locked decisions (milestone-level):**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| #10 title-rewrite UX | Silent overwrite | Matches voice/photo flow; title stays editable on detail page. No new confirmation UI to ship. |
| #10 failure mode | Keep user title + `promotion_error` | Mirrors v0.4 Phase 16 failed-state handling. Retry endpoint can re-attempt with better model later (invariant #5 preserved). |
| #17 icon direction | Filled Heart / outline Heart | Single-glyph language; softer than thumbs; emerald for filled (matches Validé color story), neutral for outline. |
| Invariant #1 shift | Quick/full-form become async with #10 | When Phase 24 ships #10, quick + full-form capture move from sync `structured`-on-return to `draft` → `BackgroundTask` rewrite → `structured`. `CLAUDE.md` invariant #1 updates in the same change. |
| #20 (unified capture) | Deferred to v0.6 | Needs its own `/gsd-explore` UX cycle; out of scope for v0.5. |
| #19 (Accueil spinner flash) | Already shipped out-of-band | `fast-19` (commit 7a1f39c, 2026-05-12) closed gh#19 before v0.5 opened. |

**Phase shape (continues numbering from v0.4 — starts at Phase 22):**

- ✅ Phase 22 — Quick wins (#13, #15, #21) — shipped 2026-05-12
- Phase 23 — Deck polish (#14 + #18 paired → #17 → #16)
- Phase 24 — Recipe identity (#11 → #22 → #10 → #12; serial to avoid `_apply_extracted` / `services/llm.py` merge churn)

**Source:** `.planning/notes/v0.5-shape-mixed-sweep.md` (output of `/gsd-explore` 2026-05-12 against 13 open GitHub issues #10–#22).

---

**v0.4 outcome (preserved for reference):** 7 phases / 27 plans / 24 requirements all validated. Closed both Tier 1 invariant breaks (INV-01, INV-02), 4 Tier 2 correctness clusters (capture pipeline, history, identity, validation), the C-1 token-completeness gap (15 new semantic CSS variables), the FIX-03 next-intl drift, and the entire v0.2.2 backlog (TZ-01, SEED-01, POLISH-01/02). Cumulative UI score 20.21/24 → 21.71/24 (+1.50) under the SAME 6-pillar rubric; verdict distribution shifted from 5✅/9⚠/0❌ to 11✅/3⚠/0❌. See `.planning/milestones/v0.4-ROADMAP.md`, `.planning/v0.4/UI-RESCORE.md`, and `.planning/v0.4-MILESTONE-AUDIT.md`.

**Pending operator validation (orthogonal to v0.5):** 15 HUMAN-UAT items across phases 16/17/18/19/21 — Playwright suites need live dev-stack runs, Web Push round-trip on both iPhones needs operator fill of `.planning/v0.4/PUSH-ROUNDTRIP.md`, manual UX exercise of failed-state inbox + 4-state Notifications Card. None blocking deploy; tracked via `/gsd-audit-uat`.

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
*Last updated: 2026-05-13 — v0.5 Phase 23 (Deck polish) shipped. Closed gh#14 (OUI/NON overlays → `ring-2 ring-inset` motion divs; deliberate design deviation from REQUIREMENTS.md DECK-01 wording, rewritten in same commit), gh#16 (tap-to-detail via `useRouter` + `panRef` disambiguation with `setTimeout(0)` reset), gh#17 (filled emerald Heart yes / outline neutral Heart no — destructive-red removed entirely), gh#18 (swipe threshold/velocity/overlay/fly-off constants retuned 140/750/80/0.28s + legacy `SWIPE_SPRING` deleted). 1 plan / 1 atomic commit per D-23. Code review clean (0 critical / 0 warning / 3 info — all optional nits). Verifier skipped per `workflow.verifier: false`; D-26 grep gates serve as goal check. v0.5 Active progress: 2/3 phases complete. Next: Phase 24 (Recipe identity — #11/#22/#10/#12, serial order load-bearing).*
