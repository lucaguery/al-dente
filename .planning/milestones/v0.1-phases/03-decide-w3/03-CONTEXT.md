# Phase 3: Decide (W3) - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers the **daily decision layer** of Al Dente:

1. **Algorithm + shortlist generation:** `services/algorithm.py` pure scoring function (hard filters → soft scoring: seasonality + recency + mood overlap − recent-cuisine/protein penalty + jitter), `select_top5_with_diversity`, APScheduler cron at 16:00 household-tz, manual regeneration with filters via `POST /shortlists/regenerate`. Cold-start tuning at <10 / 10–29 / 30+ recipes per SPEC.md.
2. **Shortlist UI:** Home tab BECOMES today's shortlist — framer-motion swipe deck, stacked cards one-at-a-time with next-card peek, swipe left/right + thumb buttons for vote input, "Tout vu" summary state after all cards swiped.
3. **Voting state machine:** `votes` router — `POST /shortlists/{id}/recipes/{recipe_id}/vote` stores yes/no; state (Validé/Pressenti/Contesté/Rejeté/Sans avis) always computed from rows, never stored. `POST /shortlists/{id}/delegate` appends 5 yes votes. `vote.created` WebSocket broadcast within ~200ms.
4. **"Je commence à cuisiner":** `POST /recipes/{id}/cook` creates immutable `CookingLog` (cooked_at = now()), closes veto window. "En train de cuisiner" persistent banner on Home until log is finalized (Phase 4) or skipped.
5. **Web Push notifications:** VAPID backend, `POST /push/subscribe` stores PushSubscription per member, APScheduler triggers push at shortlist generation. Permission requested inline on first shortlist via in-app banner.

**Dogfood gate:** 2 weeks with daily shortlists. Question: "Did we stop discussing IRL what to cook?"

**Not in this phase:** cooking-log finalization (photos/rating/notes — Phase 4), shared Album (Phase 4), URL Gemini extraction (productize-later).

</domain>

<decisions>
## Implementation Decisions

### Shortlist navigation

- **D-01:** The **Home tab becomes today's shortlist.** The current hero + CTA content in `frontend/app/page.tsx` is replaced by the swipe deck. The Home tab label can stay "Accueil" or become "Aujourd'hui" — planner decides. The 4-tab BottomNav structure is unchanged (`/`, `/recipes`, `/inbox`, `/settings`). No 5th tab needed.

- **D-02:** When no shortlist exists for today (before 16:00 on first use, or corpus too small): Home shows an **empty state** — message _"Ton shortlist du jour n'est pas encore prêt."_ + a "Ajouter une recette" button (links to `/recipes/new`). If corpus < 10 recipes, also show the SPEC.md cold-start banner: _"Ajoute plus de recettes pour de meilleures suggestions."_

### Swipe deck UX

- **D-03:** Users vote via **swipe gesture OR thumb buttons** — both inputs cast the same yes/no vote. Swipe right = yes, swipe left = no. Two large thumb buttons (❌ / ❤️ or equivalent) below the front card as the accessible path. Neither method is hidden or secondary.

- **D-04:** Deck shows **one card at a time with a peek** at the card behind it (scaled down, slightly faded). Standard stacked-card pattern. Front card is full-width; next card peeks ~12–16px below, opacity ~0.6.

- **D-05:** After all ≤5 cards have been voted on, the deck transitions to a **"Tout vu"** summary state:
  - Shows all recipe names + their current computed vote state (Validé/Pressenti/Contesté)
  - Shows both members' vote dots per recipe (colored dot = yes, grey = no/unvoted)
  - If nothing is Validé/Pressenti: "Tu décides" button is prominent
  - If a Validé recipe exists: "Je commence à cuisiner" CTA for it

### Rejeté recipes

- **D-06:** Rejeté (both members voted no) recipes **never appear in the swipe deck** — skipped entirely. If both have voted no before you reach a card in the deck, it is excluded from the queue. Rejeté recipes do not appear anywhere in the main shortlist view. This matches SPEC §Voting "Hidden in main view." No collapsed section, no visibility.

- **D-07:** Each shortlist card shows: **recipe title, cuisine, mood tags, prep time, primary photo** (if any). Bottom-right corner: **partner's vote dot** — green = yes, red = no, grey = not yet voted. Your own vote state is shown after you swipe (the card flies off and the result is reflected in the summary). No "before you vote" reveal of your own state on the card.

### "En train de cuisiner" banner (COOK-02)

- **D-08:** When a `CookingLog` exists for today (created via "Je commence à cuisiner") and hasn't been finalized, a **persistent banner** appears at the top of the Home content (above or replacing the shortlist deck area). Banner shows: recipe name being cooked + a "Finaliser" button (navigates to finalization screen — Phase 4 builds this) + a "Passer" (skip/dismiss) button that closes the banner for the session without creating a finalization record. The log itself is never deleted — "Passer" just dismisses the Home banner. Planner decides exact visual placement within the Home page.

### Web Push notifications (PWA-03)

- **D-09:** Push permission is requested **inline on first shortlist event** — not during onboarding, not buried in settings. Flow: when the first shortlist generates (or user manually regenerates for the first time), the frontend shows an in-app banner: _"Activer les notifications pour savoir quand ton shortlist du jour est prêt ?"_ with "Activer" and "Pas maintenant" buttons. Only on "Activer" does the app call `Notification.requestPermission()`. This maximizes grant rate — user has already seen the shortlist and understands the value.

- **D-10:** Notification content:
  - Title: `Al Dente`
  - Body: `Ton shortlist du jour est prêt !`
  - On tap: opens PWA directly to Home (which IS the shortlist)
  - No recipe titles in the notification body (keeps it simple; surprises preserved)

- **D-11:** Backend handles VAPID keys and subscription storage. Implementation:
  - VAPID public/private key pair stored as Railway env vars (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`)
  - New endpoint `POST /push/subscribe` accepts `PushSubscription` JSON (endpoint + keys), stores per-member row in a new `push_subscriptions` table
  - APScheduler shortlist job calls the Web Push library (`pywebpush`) to fan out to all household members after shortlist row is created
  - New Alembic migration for `push_subscriptions (id, member_id FK, subscription JSONB, created_at)`

### "Tu décides" delegation

- **D-12:** Per SPEC.md: `POST /shortlists/{id}/delegate` appends 5 yes votes for the requesting member. This makes every Pressenti recipe instantly Validé (any partner yes). UI: "Tu décides" button visible in the "Tout vu" summary state and also on individual cards (accessible via the card detail or a secondary action). Planner decides exact button placement on cards.

### Claude's Discretion

The following details are not user-facing and should be decided by the planner/executor:

- **Shortlist router shape:** `backend/app/routers/shortlist.py` (GET today's shortlist, POST regenerate, POST delegate). Votes router at `backend/app/routers/votes.py` (POST vote on a recipe in a shortlist). Both use `Depends(current_member)` cookie auth.
- **Vote deduplication:** A member can vote on a (shortlist_id, recipe_id) pair — re-voting updates the existing row (upsert on `(shortlist_id, recipe_id, member_id)` unique constraint) OR inserts a new row and the latest vote wins. Planner picks the simpler approach.
- **`GET /shortlists/today`** response shape: returns `{ shortlist_id, date, recipes: [...], votes: [...] }` where votes are all votes for today's shortlist keyed on recipe_id + member_id. Frontend computes the 5 states client-side using the same logic as the backend.
- **APScheduler setup:** `AsyncIOScheduler` in `backend/app/main.py` startup event (or lifespan). Job: `generate_daily_shortlist(household_id)` per active household. Timezone: stored on the `households` table (or defaulted to Europe/Paris for v0.1 — Luca's household).
- **Household timezone:** Default Europe/Paris in v0.1. `households` table already exists; planner adds a `timezone TEXT NOT NULL DEFAULT 'Europe/Paris'` column if not present, or uses the default without migration if SPEC.md omitted it.
- **framer-motion swipe implementation:** Use `motion.div` with `drag="x"` and `dragConstraints` to detect swipe direction. Snap to the "voted" state on release past a threshold (e.g. ±80px). This is a well-known framer-motion pattern.
- **`push_subscriptions` schema:** `id UUID PK, member_id UUID FK UNIQUE (one sub per member), subscription JSONB NOT NULL, created_at TIMESTAMPTZ`. `UNIQUE(member_id)` allows upsert on re-subscribe.
- **Alembic migrations for Phase 3:** (1) `push_subscriptions` table; (2) `households.timezone` column if needed. Voting and shortlist tables are already in the baseline migration.
- **Service worker push handler:** The existing `next-pwa` service worker needs a `push` event listener that calls `showNotification()`. Add as a custom service worker registration or a `next-pwa` custom worker entry.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Specification

- `SPEC.md` §"Algorithm (Python service)" — full `score_recipe` + `select_top5_with_diversity` pseudocode, cold-start tuning thresholds, daily generation description
- `SPEC.md` §"Voting (asymmetric, no hard deadline)" — 5-state table, veto window definition, "Tu décides" 5-yes-votes, vote.created broadcast
- `SPEC.md` §"Cooking log" — "Je commence à cuisiner" → `POST /recipes/{id}/cook`, "En train de cuisiner" banner, finalization (Phase 4)
- `SPEC.md` §"Build plan" W3 row — effort ~50h, dogfood gate definition

### Requirements

- `.planning/REQUIREMENTS.md` §"Daily Shortlist (SHORTLIST)"  — SHORTLIST-01..05 atomic acceptance criteria
- `.planning/REQUIREMENTS.md` §"Voting (VOTE)" — VOTE-01..05 atomic acceptance criteria
- `.planning/REQUIREMENTS.md` §"Cooking Log (COOK)" — COOK-01, COOK-02 (Phase 3 scope only; COOK-03/04/05 are Phase 4)
- `.planning/REQUIREMENTS.md` §"PWA & Localization (PWA)" — PWA-03 (Web Push)
- `.planning/ROADMAP.md` §"Phase 3: Decide (W3)" — phase goal, 5 success criteria, dependency on Phase 2

### Prior phase context

- `.planning/phases/01-foundations-w1/01-CONTEXT.md` — D-02 (photo pipeline through backend), D-04 (member colors), established patterns for `realtime.py`, `broadcast_to_household`
- `.planning/phases/01.1-cookie-auth-and-recovery/01.1-CONTEXT.md` — D-01 (Next.js rewrite proxy), D-03 (dual-mode cookie+Bearer), D-04 (`credentials: "include"`). All new endpoints reached via `/api/...` path.
- `.planning/phases/02-llm-capture-w2/02-CONTEXT.md` — D-08 (Sonner toast pattern), Realtime event handler pattern, `RecipeCard`/`RecipeDraftCard` component conventions

### Existing models (already migrated)

- `backend/app/models/daily_shortlist.py` — `DailyShortlist` ORM: `household_id`, `date`, `generation`, `recipe_ids UUID[]`, `filters JSONB`, unique on (household_id, date, generation)
- `backend/app/models/vote.py` — `Vote` ORM: `shortlist_id`, `recipe_id`, `member_id`, `vote VoteValue (yes/no)`; `idx_votes_shortlist` index
- `backend/app/models/cooking_log.py` — `CookingLog` ORM: `cooked_at` immutable, `photo_paths`, `rating`, `notes`
- `backend/app/models/recipe.py` — `last_cooked_at`, `cook_count` denormalized fields (updated by Phase 4)

### Existing services / components

- `backend/app/services/realtime.py` — `broadcast_to_household` helper; `vote.created` event type already documented in module docstring
- `frontend/components/RealtimeProvider.tsx` — `client.onEvent(type, cb)` API; Phase 3 adds `vote.created` handler in shortlist page
- `frontend/components/BottomNav.tsx` — 4-tab nav; Home tab (`href="/"`) will display shortlist content
- `frontend/app/page.tsx` — current Home content to be replaced with shortlist deck

### Repo-level instructions

- `CLAUDE.md` (repo root) — architecture invariants: #2 (voting state computed, not stored), #3 (denormalized last_cooked_at/cook_count updated in same tx — Phase 4), #4 (realtime contract: vote.created must broadcast)
- `frontend/AGENTS.md` — Next.js 16.2.4 breaking changes; consult `frontend/node_modules/next/dist/docs/` before writing frontend code

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`RealtimeProvider.tsx`** — `client.onEvent("vote.created", handler)` can be added to the shortlist page; same pattern as `recipe.promoted` handler already in the provider
- **`BottomNav.tsx`** — Home tab is `href="/"`, `segment: null`; shortlist content replaces `page.tsx` body, no nav change needed
- **`RecipeCard.tsx`** — base recipe display component; shortlist card adapts or wraps it with drag/vote gesture overlay
- **`broadcast_to_household`** — docstring already lists `vote.created` as a W3 event; just needs the votes router to call it
- **`lib/api.ts`** — all new shortlist/votes/push endpoints use `api<T>("/api/...")` with `credentials: "include"`
- **Sonner toast** — `toast.success()` / `toast.error()` established pattern; use for vote state transitions if desired

### Established Patterns

- **Cookie auth:** `Depends(current_member)` on every new endpoint; no Bearer-only path for Phase 3 routes
- **BackgroundTask not needed** — shortlist generation is server-side cron (APScheduler), not a request-triggered background job. No BackgroundTask wiring for the algorithm.
- **French strings:** all new UI copy goes through `next-intl` French messages; keys added to `frontend/lib/i18n/fr.json`
- **`broadcast_to_household(household_id, "vote.created", payload)`** — existing call signature; payload should include `{ recipe_id, shortlist_id, member_id, vote, state }` (computed state included for cheap client-side update)

### Integration Points

- `frontend/app/page.tsx` — replace hero + CTA section with `<ShortlistDeck />` component (or inline); keep `OnboardingGuard` wrapper
- `backend/app/main.py` — add APScheduler startup + new routers (`shortlist`, `votes`, `push`)
- `backend/app/services/shortlist.py` (new) — wraps `algorithm.py` + DB upsert + broadcast + push fan-out
- `backend/app/services/algorithm.py` (new) — pure scoring function, no DB access
- Service worker — extend `next-pwa` custom worker for `push` event listener

</code_context>

<specifics>
## Specific Ideas

- Home deck: the pulsing/animated background on the hero section (from current `page.tsx`) can become a subtle animated gradient on the "Validé" state card — green tint to signal "this is the one"
- Swipe gesture visual feedback: while dragging, the card tilts slightly (rotate transform tied to x drag delta) and shows a faint ❤️ (right drag) or ✗ (left drag) overlay, fading in as the drag threshold approaches. Standard framer-motion pattern.
- "Tout vu" summary: each recipe row in the summary shows two colored dots (side by side) — left = your vote color, right = partner vote color. Validé rows have a green background tint.
- VAPID key generation: one-time `vapid keygen` CLI command to generate keys; store in Railway env vars. Document in README or .planning/SETUP.md.
- Cold-start banner: show above the swipe deck as a dismissible info chip, not a blocking modal. Dismissible per session via localStorage flag.

</specifics>

<deferred>
## Deferred Ideas

- **"Rejeté" accessible view** — a Settings or History section showing past-rejected recipes for the current shortlist. Useful if you change your mind. Phase 4 candidate.
- **Cooking log finalization UI** — Phase 4 scope. Phase 3 only creates the log; the "Finaliser" button from the "En train de cuisiner" banner navigates to a stub screen in Phase 3 that Phase 4 will fill.
- **Per-recipe vote history across shortlists** — "how many times did we reject carbonara?" Interesting analytics, firmly Phase 4 or productize-later.
- **Wildcard slot** — SPEC.md productize-later: one random recipe outside scoring. Not in v0.1.
- **Time-of-day awareness** (lunch vs dinner) — productize-later per PROJECT.md.
- **Push notification customization** (e.g. recipe spoiler in body) — productize-later.

</deferred>

---

*Phase: 03-decide-w3*
*Context gathered: 2026-05-07*
