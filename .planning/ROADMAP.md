# Roadmap: Al Dente

## Overview

Al Dente ships in four waves, each gated by behavioral dogfood (≥ 2 weeks of real daily use) rather than feature checklists. **W1 Foundations** stands up the deploy-and-ping skeleton (Vercel + Railway + Supabase + WebSocket) plus household onboarding and the manual recipe library — the moment both phones round-trip an event, infrastructure is validated. **W2 LLM capture** layers voice / photo / paste-URL surfaces onto the existing recipe table, with server-side `BackgroundTask` promotion via Gemini 2.5 Flash. **W3 Decide** introduces the daily shortlist algorithm, the asymmetric voting state machine, and the "Je commence à cuisiner" cooking flow that closes the veto window. **W4 Polish** finalizes the cooking log (photos, rating, voice notes), ships the shared Album, and tunes offline behavior. The full v0.1 definition of done is behavioral: both household members using the app daily for ≥ 2 weeks at end of W4.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (e.g. 2.1): Urgent insertions (marked with INSERTED)

The four phases mirror SPEC.md's W1–W4 build plan. Phase boundaries are dogfood gates, not feature buckets.

- [ ] **Phase 1: Foundations (W1)** — Deploy-and-ping skeleton, household onboarding, manual recipe library, realtime sync, PWA install
- [ ] **Phase 2: LLM Capture (W2)** — Voice / photo / paste-URL surfaces with background draft → structured promotion via Gemini
- [ ] **Phase 3: Decide (W3)** — Daily shortlist algorithm, asymmetric voting state machine, "Je commence à cuisiner" flow, daily push
- [ ] **Phase 4: Polish (W4)** — Cooking-log finalization, recipe-card living image (last cooking-log photo), Phase-3 lint cleanup, mobile a11y pass. Album cut to v2.

## Phase Details

### Phase 1: Foundations (W1)
**Goal**: Both phones install the PWA and round-trip a "ping" event end-to-end via Vercel + Railway + Supabase + WebSockets, plus household onboarding (create + join via invite code), bearer-token auth, and manual recipe library (full + quick entry, list/search, detail, drafts inbox, JSON export). Dogfood gate: 2 weeks of solo manual use; stop here if not used.
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, ONBOARD-01, ONBOARD-02, ONBOARD-03, ONBOARD-04, ONBOARD-05, ONBOARD-06, RECIPE-01, RECIPE-02, RECIPE-03, RECIPE-04, RECIPE-05, RECIPE-06, RECIPE-07, RECIPE-08, REALTIME-01, REALTIME-02, REALTIME-03, PWA-01, PWA-02, PWA-04
**Success Criteria** (what must be TRUE):
  1. Luca and partner each install the PWA on their iPhones via Safari → Add to Home Screen, launch fullscreen, and see each other's pings appear within ~500ms over WebSocket
  2. User creates a household with name + member name + color, receives a 6-character invite code, partner enters that code and joins; both members appear in the member list with their chosen colors
  3. User creates 10 recipes via a mix of full form and quick-add; the list view supports text search across title and ingredients; both phones see the same recipe library, and the "À compléter (N)" drafts tab shows quick-add entries
  4. User edits a recipe, attaches up to 4 photos to a recipe (stored in Supabase Storage), and exports the household's full recipe library as a JSON file
  5. Any request without a valid `Authorization: Bearer <auth_token>` is rejected with HTTP 401, and the WebSocket client reconnects automatically after a Railway restart
**Plans**: 12 plans
- [x] 01-01-shared-vocab-PLAN.md — Locked vocabularies + 5 member-colors mirrored on both sides
- [x] 01-02-frontend-scaffold-PLAN.md — Next.js PWA shell on Vercel: next-pwa + next-intl + shadcn primitives + manifest
- [x] 01-03-backend-scaffold-PLAN.md — FastAPI + SQLAlchemy 2.0 + Alembic baseline migration deployed to Railway
- [x] 01-04-onboarding-backend-PLAN.md — Households router (create/join/preview/me) + invite-code generator + INFRA-06 close
- [x] 01-05-realtime-and-ping-backend-PLAN.md — services/realtime broadcast spine + WS endpoint + throwaway pings router
- [x] 01-06-onboarding-frontend-PLAN.md — 3-screen onboarding flow with disabled-color-swatch preview
- [ ] 01-07-ping-frontend-and-ws-client-PLAN.md — partysocket WS client + ping panel + W1 dogfood gate
- [ ] 01-08-recipes-backend-PLAN.md — Manual recipe CRUD with ILIKE search, drafts filter, JSON export
- [ ] 01-09-photo-upload-backend-PLAN.md — Multipart photo upload to Supabase Storage with magic-byte MIME sniff
- [ ] 01-10-recipes-frontend-read-PLAN.md — Recipe list, search, detail, drafts inbox, settings/export + signed-URL helper
- [ ] 01-11-recipes-frontend-write-PLAN.md — Recipe new (Rapide+Complète) + edit + PhotoUploader UI
- [ ] 01-12-dogfood-cleanup-PLAN.md — D-01 ping cleanup gated on the round-trip gate passing
**UI hint**: yes

### Phase 01.1: cookie-auth-and-recovery (INSERTED)

**Goal:** [Urgent work - to be planned]
**Requirements**: TBD
**Depends on:** Phase 1
**Plans:** 6/5 plans complete

Plans:
- [x] TBD (run /gsd-plan-phase 01.1 to break down) (completed 2026-05-06)

### Phase 2: LLM Capture (W2)
**Goal**: Voice (Web Speech → backend → Gemini), photo (multipart → Gemini multimodal), and paste-URL surfaces all create drafts that promote to `status='structured'` via FastAPI `BackgroundTask`, with WebSocket `recipe.promoted` broadcast on status flip. Voice modification of existing recipes (option A) and voice notes on cooking log (option C) are wired. Raw inputs persist in `source_capture` JSONB forever. Dogfood gate: 2 weeks with capture flows; track inbox tidy-up rate.
**Depends on**: Phase 1 (recipes table, WebSocket scaffolding, BackgroundTask infrastructure, drafts inbox UI must exist before LLM capture can target them)
**Requirements**: CAPTURE-01, CAPTURE-02, CAPTURE-03, CAPTURE-04, CAPTURE-05, CAPTURE-06, CAPTURE-07
**Success Criteria** (what must be TRUE):
  1. User dictates a French recipe by voice on their phone; within ~10 seconds the draft is promoted to `structured` and both phones receive a `recipe.promoted` WebSocket event and see the structured fields (title, ingredients, steps, cuisine, mood, protein)
  2. User uploads 1–4 photos of a paper recipe via `POST /recipes/photo`; Gemini multimodal extracts ingredients and steps; the user reviews the result in the edit form and saves
  3. User pastes a recipe URL; a draft appears in the "À compléter (N)" inbox with the original URL preserved in `source_capture`
  4. User says "remplace les oignons par des échalotes" against an existing recipe via `POST /recipes/{id}/voice-modify`; the edit form opens pre-filled with the modification, and the user can review and save
  5. Every captured recipe (voice / photo / URL / quick / full) carries its raw input in `source_capture` JSONB so future re-prompting is possible without losing the original transcript or photo paths
**Plans**: TBD
**UI hint**: yes

### Phase 3: Decide (W3)
**Goal**: Algorithm scoring as a pure function (`services/algorithm.py`), APScheduler daily shortlist generation at 16:00 household-tz, voting state machine computed from the `votes` table (5 states: Validé / Pressenti / Contesté / Rejeté / Sans avis), shortlist UI with `framer-motion` swipe deck, "Tu décides" delegation, "Je commence à cuisiner" → `CookingLog` creation that closes the veto window, and daily Web Push notifications to both phones. Dogfood gate: 2 weeks with daily shortlists; "did we stop discussing IRL?"
**Depends on**: Phase 2 (the shortlist algorithm operates over `status='structured'` recipes; until LLM capture makes capture practical the corpus is too small to exercise scoring + diversification meaningfully)
**Requirements**: SHORTLIST-01, SHORTLIST-02, SHORTLIST-03, SHORTLIST-04, SHORTLIST-05, VOTE-01, VOTE-02, VOTE-03, VOTE-04, VOTE-05, COOK-01, COOK-02, PWA-03
**Success Criteria** (what must be TRUE):
  1. At 16:00 household-tz, both phones receive a Web Push notification and the household sees a fresh shortlist of ≤ 5 recipes; the user can manually regenerate with optional filters (cuisine, max prep time, exclude protein, required moods)
  2. Both members vote yes/no on shortlist cards via the framer-motion swipe deck; each recipe's state (Validé / Pressenti / Contesté / Rejeté / Sans avis) updates in real-time on the partner's phone within ~200ms via `vote.created` events
  3. User taps "Tu décides" and 5 yes votes are appended for them; any partner yes immediately becomes Validé
  4. User taps "Je commence à cuisiner" on a Validé or Pressenti recipe; an immutable `CookingLog` is created with `cooked_at = now()`, an "En train de cuisiner" banner appears on home, and later partner `no` votes cannot un-cook
  5. Cold-start tuning behaves correctly: at < 10 recipes the UI shows the "Ajoute plus de recettes" banner and skips diversification; at 30+ recipes the shortlist exhibits distinct cuisines and proteins
**Plans**: TBD
**UI hint**: yes

### Phase 4: Polish (W4)
**Goal**: Cooking-log finalization (photo upload ≤ 4, 3-value rating `loved`/`liked`/`disliked`, notes dictated via the OS keyboard mic — in-app Web Speech disabled per Phase 2 D-Voice iOS PWA standalone breakage), denormalized `last_cooked_at` + `cook_count` + `last_cooked_photo_path` updates in the same transaction as the log finalization (architecture invariant #3, COOK-05), the recipe-card living image (D-05 — recipe cards display the most recent cooking-log photo as their primary thumbnail), Phase-3 deferred lint cleanup (D-09), and a mobile-first accessibility pass (D-08: contrast, 48px tap targets, focus rings). Album / shared masonry grid (ALBUM-01/02/03) is CUT from v0.1 per 04-CONTEXT.md (commit c7ee1f0) — deferred to productize-later. Final dogfood gate: ≥ 2 weeks daily use by both members at end of W4 — the v0.1 definition of done.
**Depends on**: Phase 3 (CookingLog finalization extends Phase 3's COOK-01 / COOK-02 minimal flow)
**Requirements**: COOK-03, COOK-04, COOK-05
**Success Criteria** (what must be TRUE):
  1. After cooking, the user finalizes the log with up to 4 photos, dictates notes via the iOS keyboard mic into the notes textarea, and picks a `loved`/`liked`/`disliked` rating; the entry persists and the home banner clears
  2. Recipe cards in the recipe library show the most recent cooking-log photo as their primary thumbnail (D-05 living image), falling back to the static recipe photo if no cooking has occurred
  3. On log finalization, `recipes.last_cooked_at`, `recipes.cook_count`, and `recipes.last_cooked_photo_path` are updated in the same DB transaction as the cooking-log update; the recipe detail page reflects the new values immediately
  4. The user opens the app in airplane mode and the cached app shell renders with no network; reconnect resumes WebSocket sync without manual reload
  5. Behavioral validation: both household members have used the app daily for ≥ 2 weeks at end of W4 (the v0.1 definition of done)
**Plans**: 4 plans
- [ ] 04-01-PLAN.md — Backend cooking-log finalization (PUT /cooking-logs/{id} + POST photos endpoint + same-tx denormalized recipe update)
- [ ] 04-02-PLAN.md — Frontend cooking-log finalization page (RatingPicker + CookingLogFinalize) and recipe-card living image
- [ ] 04-03-PLAN.md — Phase-3 lint cleanup + Album scope reconciliation + COOK-04/CAPTURE-07 voice-notes wording reconciliation (this plan)
- [ ] 04-04-PLAN.md — UAT gate: a11y polish verification + airplane-mode shell test (checkpoint)
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4. Decimal phases (e.g. 2.1) may be inserted between integers if urgent fixes are required during dogfooding.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundations (W1) | 0/12 | Not started | - |
| 2. LLM Capture (W2) | 0/TBD | Not started | - |
| 3. Decide (W3) | 0/TBD | Not started | - |
| 4. Polish (W4) | 0/TBD | Not started | - |

## Coverage Summary

**v1 REQ-IDs enumerated in REQUIREMENTS.md:** 49 (INFRA: 6, ONBOARD: 6, RECIPE: 8, CAPTURE: 7, SHORTLIST: 5, VOTE: 5, COOK: 5, REALTIME: 3, PWA: 4). ALBUM × 3 cut to v2 per 04-CONTEXT.md (commit c7ee1f0).
**Mapped to phases:** 49
**Unmapped:** 0 ✓
**Cut from v1 (deferred to productize-later):** 3 (ALBUM-01, ALBUM-02, ALBUM-03 → V2-ALBUM-01/02/03 in REQUIREMENTS.md)

**Per-phase mapping:**
- Phase 1 — Foundations: 26 REQ-IDs (INFRA × 6, ONBOARD × 6, RECIPE × 8, REALTIME × 3, PWA-01/02/04)
- Phase 2 — LLM Capture: 7 REQ-IDs (CAPTURE × 7)
- Phase 3 — Decide: 13 REQ-IDs (SHORTLIST × 5, VOTE × 5, COOK-01, COOK-02, PWA-03)
- Phase 4 — Polish: 3 REQ-IDs (COOK-03/04/05). ALBUM × 3 cut to v2 per 04-CONTEXT.md (commit c7ee1f0).

**Note on REQ-ID count history:** REQUIREMENTS.md's coverage block originally stated "46 total" (stale — under-counted). 2026-05-05 enumeration corrected it to 52. 2026-05-07 album cut (this plan, 04-03) reduces v1 scope to 49: 52 historical − 3 ALBUM cuts. The 3 cut REQ-IDs migrate to the v2 section as V2-ALBUM-01/02/03 (rename only — same acceptance text), so the audit trail is preserved.

**Dependency notes:**
- REALTIME-01..03 sit in Phase 1 (not Phase 3) because the W1 ping-test gate requires household-scoped WebSocket subscribe + broadcast + reconnect-with-backoff working end-to-end before any feature ships. CAPTURE-04 (the `recipe.promoted` event added in W2) extends this existing contract.
- PWA-03 (Web Push for daily shortlist) sits in Phase 3 because the shortlist itself is born in W3; pushing notifications before there's anything to push would be pure scaffolding.
- COOK-01 and COOK-02 ("Je commence" + "En train de cuisiner" banner) sit in Phase 3 because they are the trigger that closes the veto window — the voting state machine is incomplete without them. COOK-03/04/05 (finalization with photos / voice notes / denormalized updates) sit in Phase 4 alongside the Album they feed.
