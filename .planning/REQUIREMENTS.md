# Requirements: Al Dente

**Defined:** 2026-05-05
**Core Value:** Eliminate the daily "on mange quoi ?" debate via a shared library, async voting, and voice/photo capture — installable PWA on both iPhones with no App Store, no $99/year, no native build.

> **Source:** Extracted from `SPEC.md` (output of `/grill-me` 2026-05-05). SPEC.md remains the canonical reference for the data model, capture pipeline, scoring algorithm, voting state machine, and onboarding flow. This file is the atomic, testable view used to drive the roadmap.

## v1 Requirements

Requirements for v0.1. Each maps to exactly one phase in `ROADMAP.md`.

### Infrastructure (INFRA)

> *W1 "first concrete action" — deploy skeleton + ping test. Until INFRA-05 round-trips on both phones, no feature work begins.*

- [ ] **INFRA-01**: Frontend Next.js 16.2.4 PWA deploys to Vercel from `main` (auto-deploy on push)
- [ ] **INFRA-02**: Backend FastAPI app deploys to Railway from `main` (auto-deploy on push)
- [ ] **INFRA-03**: Supabase Postgres database is connected to the backend with at least one table created via Alembic migration
- [ ] **INFRA-04**: Both phones can install the PWA via Safari → Share → Add to Home Screen and launch fullscreen
- [ ] **INFRA-05**: End-to-end "ping" round-trip works — POST /pings → DB insert → WebSocket broadcast → other phone's list updates within ~500ms
- [ ] **INFRA-06**: Bearer-token auth middleware rejects requests without a valid `Authorization: Bearer <auth_token>` with 401

### Onboarding & Auth (ONBOARD)

- [ ] **ONBOARD-01**: User can create a new household with a name, their own member name, and a color picked from 5 swatches (`POST /households`)
- [ ] **ONBOARD-02**: On household creation, server returns `{ household_id, member_id, auth_token, invite_code }`; `auth_token` is stored in `localStorage`
- [ ] **ONBOARD-03**: After creation, user sees a share sheet with the 6-character invite code to send to their partner
- [ ] **ONBOARD-04**: User can join an existing household by entering an invite code, their name, and a color (`POST /households/join`)
- [ ] **ONBOARD-05**: When joining, the color swatch already taken by an existing member is shown disabled
- [ ] **ONBOARD-06**: Onboarding is a 3-screen flow (Welcome → Create-or-Join → Share/Confirm) and runs only on first launch

### Recipe Library — Manual (RECIPE)

- [ ] **RECIPE-01**: User can create a recipe via the full form (title, ingredients, steps, prep_time, servings, cuisine, mood, protein, seasonality, tags) — saved with `status='structured'` immediately
- [ ] **RECIPE-02**: User can quick-add a recipe with title only and an optional photo — saved with `status='draft'`
- [ ] **RECIPE-03**: User can view a paginated list of recipes for their household, with text search across title and ingredients
- [ ] **RECIPE-04**: User can view a recipe detail page showing all fields, photos, `last_cooked_at`, and `cook_count`
- [ ] **RECIPE-05**: User can edit a recipe's fields and save changes (`PUT /recipes/{id}`)
- [ ] **RECIPE-06**: User can view a "Drafts inbox" tab labelled "À compléter (N)" listing all `status='draft'` recipes
- [ ] **RECIPE-07**: User can attach up to 4 photos to a recipe; photos are stored in Supabase Storage and referenced by path in `recipes.photo_paths`
- [ ] **RECIPE-08**: User can export the household's full recipe library as JSON (productize-later disaster-recovery hook in v0.1)

### LLM-Assisted Capture (CAPTURE)

- [ ] **CAPTURE-01**: User can capture a recipe via voice — Web Speech API records a French transcript, `POST /recipes/voice` creates a draft, FastAPI `BackgroundTask` promotes to `structured` via Gemini 2.5 Flash
- [ ] **CAPTURE-02**: User can capture a recipe via 1–4 photos — `POST /recipes/photo` (multipart) creates a draft, `BackgroundTask` runs Gemini multimodal extraction
- [ ] **CAPTURE-03**: User can paste a recipe URL — `POST /recipes/url` stores the URL in `source_capture`; URL fetch + extraction is productize-later (draft is created in v0.1)
- [ ] **CAPTURE-04**: When a draft is promoted to `structured`, all connected clients in the household receive a `recipe.promoted` WebSocket event
- [ ] **CAPTURE-05**: User can voice-modify an existing recipe — `POST /recipes/{id}/voice-modify` returns Gemini-modified fields; the edit form opens pre-filled for review (option A from SPEC.md)
- [ ] **CAPTURE-06**: Raw inputs (transcript / URL / photo paths) are persisted in `source_capture` JSONB on every recipe row, never discarded
- [ ] **CAPTURE-07**: Voice notes on the cooking-log finalization screen use the Web Speech API directly into the `notes` text field, with no backend special-casing (option C from SPEC.md)

### Daily Shortlist (SHORTLIST)

- [ ] **SHORTLIST-01**: A daily shortlist of ≤ 5 recipes is generated automatically at 16:00 household-tz via APScheduler
- [ ] **SHORTLIST-02**: User can manually regenerate the shortlist with optional filters (cuisine, max_prep_time, exclude_protein, required_moods) via `POST /shortlists/regenerate`
- [ ] **SHORTLIST-03**: Scoring runs hard filters first, then soft scoring (seasonality + recency + mood overlap − recent-cuisine/protein penalty + 0–0.2 jitter) per SPEC.md §Algorithm
- [ ] **SHORTLIST-04**: Diversification (`select_top5_with_diversity`) picks distinct cuisines and proteins where possible; cold-start tuning at `<10` / `10–29` / `30+` recipes per SPEC.md
- [ ] **SHORTLIST-05**: User can view today's shortlist as a swipe deck (`framer-motion`) showing both members' votes per card

### Voting (VOTE)

- [ ] **VOTE-01**: User can cast `yes` or `no` on each shortlist recipe; vote stored in `votes` keyed on `(shortlist_id, recipe_id, member_id)`
- [ ] **VOTE-02**: Voting state per recipe is computed from votes — Validé (both yes) / Pressenti (one yes, partner unvoted) / Contesté (one yes, one no) / Rejeté (both no) / Sans avis (neither voted). No `state` column.
- [ ] **VOTE-03**: A "Tu décides" button appends 5 `yes` votes for the requesting member (`POST /shortlists/{id}/delegate`); any partner `yes` becomes Validé
- [ ] **VOTE-04**: Veto window closes when the first `CookingLog` for the day is created — later `no` votes are accepted (signal for v0.2 weighting) but cannot un-cook
- [ ] **VOTE-05**: All clients in the household receive `vote.created` WebSocket events within ~200ms of a vote being cast

### Cooking Log (COOK)

- [ ] **COOK-01**: User can tap "Je commence à cuisiner" on a Validé/Pressenti recipe — `POST /recipes/{id}/cook` creates an immutable `CookingLog` with `cooked_at = now()`
- [ ] **COOK-02**: An "En train de cuisiner" banner shows on home until the log is finalized or skipped
- [ ] **COOK-03**: User can finalize the log later with photos (≤ 4), a 3-value rating (`loved`/`liked`/`disliked`), and free-text notes — `PUT /cooking-logs/{id}`
- [ ] **COOK-04**: User can dictate notes via Web Speech API directly into the notes field on the finalization screen (no backend special-case)
- [ ] **COOK-05**: On log creation, `recipes.last_cooked_at` and `recipes.cook_count` update in the same DB transaction as the `cooking_logs` insert

### Album (ALBUM)

- [ ] **ALBUM-01**: User can view a shared masonry photo grid of all `cooking_logs` with photos, ordered by date desc (`GET /album?limit=50`)
- [ ] **ALBUM-02**: Each album item shows the cook's color, recipe title, rating, and primary photo
- [ ] **ALBUM-03**: User can tap into an album item to view the full cooking log (all photos, notes, rating) and the source recipe

### Realtime (REALTIME)

- [ ] **REALTIME-01**: Both clients subscribe to a household-scoped WebSocket channel after authenticating
- [ ] **REALTIME-02**: WebSocket server broadcasts `recipe.created`, `recipe.promoted`, and `vote.created` events to all connected clients in the household
- [ ] **REALTIME-03**: WebSocket client reconnects with exponential backoff on disconnect (Railway free-tier restart resilience)

### PWA & Localization (PWA)

- [ ] **PWA-01**: Manifest + icons (192 px and 512 px) are registered; "Add to Home Screen" produces a fullscreen installable app
- [ ] **PWA-02**: Service worker via `next-pwa` caches the app shell so the app opens with no network
- [ ] **PWA-03**: Daily-shortlist Web Push notifications fire on both phones (subscription handled at first install)
- [ ] **PWA-04**: All user-facing strings come from `next-intl` French message files; no hardcoded copy in components or routes

## v2 Requirements

Deferred to a future milestone. Tracked here so they don't leak into v1 scope. Source: `SPEC.md §"Productize-later TODOs"`.

### Auth & Identity (V2-AUTH)

- **V2-AUTH-01**: Replace invite-code auth with Supabase Auth (magic link) — `auth_token` column abstracts the source
- **V2-AUTH-02**: Owner-leaves-household disaster recovery (currently: JSON export only)

### Modeling

- **V2-MODEL-01**: Per-member ratings (split single `rating` into a `recipe_log_ratings` table)
- **V2-MODEL-02**: Partner preference modeling once corpus is large enough
- **V2-MODEL-03**: Time-of-day awareness (lunch vs dinner)
- **V2-MODEL-04**: Wildcard slot in shortlist for serendipity

### UX & Locale

- **V2-UX-01**: English + additional locales (`next-intl` already wired, just add files)
- **V2-UX-02**: Custom illustrations + app icon (designer engagement)
- **V2-UX-03**: Real-time co-swipe voting (if user testing wants it)
- **V2-UX-04**: Permanent edit-diff UI for voice modification (option B from SPEC.md)

### Distribution & Notifications

- **V2-DIST-01**: Native iOS wrapper via Capacitor (or native rewrite) if PWA polish becomes a complaint
- **V2-DIST-02**: Push provider beyond Web Push (richer notifications)

## Out of Scope

Explicit v0.1 cuts. Reasons stay attached to prevent re-adding.

| Feature | Reason |
|---------|--------|
| iOS Share extension | Impossible in a PWA; replaced by an in-app Paste URL surface (2 extra taps) |
| Mid-cook timer / step-by-step cooking UI | Not where the daily-debate value lives; adjacent product surface |
| Shopping list integration | Adjacent product, separate v0.2 conversation |
| Native iOS / Android apps | Kills $0/year distribution; PWA is the whole point |
| 5-star rating granularity | Locked to `loved`/`liked`/`disliked` enum — decision-relevant signal only |
| Avatars | Color attribution only; simpler ship, fewer assets to design |
| Collaborative filtering / preference learning | Corpus is too small at couple-scale to be useful |
| Real-time co-swipe voting | Async voting matches actual usage rhythm; productize-later if user testing wants it |
| OAuth providers | Invite-code suffices; magic-link migration is the productize-later path |

## Traceability

Filled by `gsd-roadmapper`. Each v1 REQ-ID maps to exactly one phase.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 — Foundations (W1) | Pending |
| INFRA-02 | Phase 1 — Foundations (W1) | Pending |
| INFRA-03 | Phase 1 — Foundations (W1) | Pending |
| INFRA-04 | Phase 1 — Foundations (W1) | Pending |
| INFRA-05 | Phase 1 — Foundations (W1) | Pending |
| INFRA-06 | Phase 1 — Foundations (W1) | Pending |
| ONBOARD-01 | Phase 1 — Foundations (W1) | Pending |
| ONBOARD-02 | Phase 1 — Foundations (W1) | Pending |
| ONBOARD-03 | Phase 1 — Foundations (W1) | Pending |
| ONBOARD-04 | Phase 1 — Foundations (W1) | Pending |
| ONBOARD-05 | Phase 1 — Foundations (W1) | Pending |
| ONBOARD-06 | Phase 1 — Foundations (W1) | Pending |
| RECIPE-01 | Phase 1 — Foundations (W1) | Pending |
| RECIPE-02 | Phase 1 — Foundations (W1) | Pending |
| RECIPE-03 | Phase 1 — Foundations (W1) | Pending |
| RECIPE-04 | Phase 1 — Foundations (W1) | Pending |
| RECIPE-05 | Phase 1 — Foundations (W1) | Pending |
| RECIPE-06 | Phase 1 — Foundations (W1) | Pending |
| RECIPE-07 | Phase 1 — Foundations (W1) | Pending |
| RECIPE-08 | Phase 1 — Foundations (W1) | Pending |
| CAPTURE-01 | Phase 2 — LLM Capture (W2) | Pending |
| CAPTURE-02 | Phase 2 — LLM Capture (W2) | Pending |
| CAPTURE-03 | Phase 2 — LLM Capture (W2) | Pending |
| CAPTURE-04 | Phase 2 — LLM Capture (W2) | Pending |
| CAPTURE-05 | Phase 2 — LLM Capture (W2) | Pending |
| CAPTURE-06 | Phase 2 — LLM Capture (W2) | Pending |
| CAPTURE-07 | Phase 2 — LLM Capture (W2) | Pending |
| SHORTLIST-01 | Phase 3 — Decide (W3) | Pending |
| SHORTLIST-02 | Phase 3 — Decide (W3) | Pending |
| SHORTLIST-03 | Phase 3 — Decide (W3) | Pending |
| SHORTLIST-04 | Phase 3 — Decide (W3) | Pending |
| SHORTLIST-05 | Phase 3 — Decide (W3) | Pending |
| VOTE-01 | Phase 3 — Decide (W3) | Pending |
| VOTE-02 | Phase 3 — Decide (W3) | Pending |
| VOTE-03 | Phase 3 — Decide (W3) | Pending |
| VOTE-04 | Phase 3 — Decide (W3) | Pending |
| VOTE-05 | Phase 3 — Decide (W3) | Pending |
| COOK-01 | Phase 3 — Decide (W3) | Pending |
| COOK-02 | Phase 3 — Decide (W3) | Pending |
| COOK-03 | Phase 4 — Polish (W4) | Pending |
| COOK-04 | Phase 4 — Polish (W4) | Pending |
| COOK-05 | Phase 4 — Polish (W4) | Pending |
| ALBUM-01 | Phase 4 — Polish (W4) | Pending |
| ALBUM-02 | Phase 4 — Polish (W4) | Pending |
| ALBUM-03 | Phase 4 — Polish (W4) | Pending |
| REALTIME-01 | Phase 1 — Foundations (W1) | Pending |
| REALTIME-02 | Phase 1 — Foundations (W1) | Pending |
| REALTIME-03 | Phase 1 — Foundations (W1) | Pending |
| PWA-01 | Phase 1 — Foundations (W1) | Pending |
| PWA-02 | Phase 1 — Foundations (W1) | Pending |
| PWA-03 | Phase 3 — Decide (W3) | Pending |
| PWA-04 | Phase 1 — Foundations (W1) | Pending |

**Coverage:**
- v1 requirements: 52 total (enumeration of REQ-ID checkboxes above; supersedes the earlier "46" tally which under-counted)
- Mapped to phases: 52
- Unmapped: 0 ✓

**Per-phase breakdown:**
- Phase 1 — Foundations (W1): 26 (INFRA × 6, ONBOARD × 6, RECIPE × 8, REALTIME × 3, PWA-01/02/04)
- Phase 2 — LLM Capture (W2): 7 (CAPTURE × 7)
- Phase 3 — Decide (W3): 13 (SHORTLIST × 5, VOTE × 5, COOK-01, COOK-02, PWA-03)
- Phase 4 — Polish (W4): 6 (COOK-03/04/05, ALBUM × 3)

---
*Requirements defined: 2026-05-05*
*Last updated: 2026-05-05 — traceability filled by `gsd-roadmapper`; tally corrected from 46 → 52*
