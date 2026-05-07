# Phase 3: Decide (W3) — Research

**Researched:** 2026-05-07
**Domain:** Daily-shortlist generation cron + asymmetric voting state machine + framer-motion swipe deck + VAPID Web Push
**Confidence:** HIGH (every external dependency verified against npm registry, PyPI, and live docs; one MEDIUM-confidence area: framer-motion v12 / `motion/react` vs the older `framer-motion` import)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Shortlist navigation**
- **D-01:** The Home tab BECOMES today's shortlist. Current hero + CTA in `frontend/app/page.tsx` is replaced by the swipe deck. Tab label can stay "Accueil" or become "Aujourd'hui" — planner decides. 4-tab BottomNav unchanged. No 5th tab.
- **D-02:** No-shortlist empty state: _"Ton shortlist du jour n'est pas encore prêt."_ + "Ajouter une recette" button. If corpus < 10 recipes, also show cold-start banner: _"Ajoute plus de recettes pour de meilleures suggestions."_

**Swipe deck UX**
- **D-03:** Vote via swipe gesture OR thumb buttons — both inputs cast same yes/no. Swipe right = yes, swipe left = no. Two thumb buttons (❌ / ❤️) below the front card.
- **D-04:** One card at a time with a peek at next card (scaled, faded, ~12-16px below, opacity ~0.6).
- **D-05:** "Tout vu" summary state after all cards swiped — recipe names + computed vote state + member dots; "Tu décides" prominent if nothing Validé/Pressenti; "Je commence à cuisiner" if Validé exists.

**Rejeté handling**
- **D-06:** Rejeté recipes never appear in deck — skipped entirely. Not visible anywhere in main shortlist view. SPEC §Voting "Hidden in main view." No collapsed section.
- **D-07:** Each card shows: title, cuisine, mood tags, prep time, primary photo. Bottom-right: partner's vote dot (green = yes, red = no, grey = unvoted). Own vote shown only after swipe.

**"En train de cuisiner" banner (COOK-02)**
- **D-08:** Persistent banner at top of Home when CookingLog exists for today and not finalized. Shows recipe name + "Finaliser" button (Phase 4 builds finalization screen) + "Passer" (dismisses banner for session, log itself never deleted).

**Web Push (PWA-03)**
- **D-09:** Permission requested INLINE on first shortlist event (not onboarding). Banner: _"Activer les notifications pour savoir quand ton shortlist du jour est prêt ?"_ with "Activer" / "Pas maintenant" buttons.
- **D-10:** Notification: title `Al Dente`, body `Ton shortlist du jour est prêt !`, on tap → opens PWA to Home. No recipe titles in body.
- **D-11:** Backend handles VAPID + storage:
  - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` Railway env vars
  - `POST /push/subscribe` accepts PushSubscription JSON, stores per-member row in `push_subscriptions` table
  - APScheduler job calls `pywebpush` to fan out after shortlist row is created
  - New Alembic migration: `push_subscriptions (id, member_id FK UNIQUE, subscription JSONB, created_at)`

**"Tu décides" delegation**
- **D-12:** Per SPEC: `POST /shortlists/{id}/delegate` appends 5 yes votes for requesting member. Visible in "Tout vu" summary AND on cards (placement at planner discretion).

### Claude's Discretion

- Shortlist router: `backend/app/routers/shortlist.py` (GET today, POST regenerate, POST delegate). Votes router: `backend/app/routers/votes.py`. Both use `Depends(current_member)` cookie auth.
- Vote deduplication: upsert on `(shortlist_id, recipe_id, member_id)` OR insert-and-latest-wins. Planner picks the simpler approach.
- `GET /shortlists/today` returns `{ shortlist_id, date, recipes: [...], votes: [...] }`. Frontend computes 5 states client-side using same logic as backend.
- APScheduler setup: `AsyncIOScheduler` in `backend/app/main.py` startup event (or **lifespan — preferred**). Job: `generate_daily_shortlist(household_id)` per active household. Timezone stored on `households` table or defaulted to Europe/Paris.
- Household timezone: Default Europe/Paris in v0.1. Planner adds `timezone TEXT NOT NULL DEFAULT 'Europe/Paris'` column if not present, or uses default.
- framer-motion swipe: `motion.div` with `drag="x"` + `dragConstraints`, threshold ±80px (or ±100-150 — planner can tune).
- `push_subscriptions` schema: `id UUID PK, member_id UUID FK UNIQUE, subscription JSONB NOT NULL, created_at TIMESTAMPTZ`. UNIQUE(member_id) enables upsert.
- Alembic migrations Phase 3: (1) `push_subscriptions`; (2) optional `households.timezone` column.
- Service worker push handler: existing `next-pwa` SW needs a `push` event listener calling `showNotification()`. Add via `customWorker` entry per `@ducanh2912/next-pwa` API.

### Deferred Ideas (OUT OF SCOPE)

- "Rejeté" accessible view (Settings/History) — Phase 4 candidate
- Cooking-log finalization UI — Phase 4 (Phase 3 only creates the log; "Finaliser" navigates to a stub)
- Per-recipe vote history across shortlists — Phase 4 / productize-later
- Wildcard slot in shortlist — productize-later
- Time-of-day awareness (lunch vs dinner) — productize-later
- Push notification customization (recipe spoiler in body) — productize-later
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SHORTLIST-01 | Daily shortlist of ≤5 recipes generated automatically at 16:00 household-tz via APScheduler | §"Standard Stack" → APScheduler 3.11.2 + zoneinfo; §"Architecture Patterns" → Pattern 3 (FastAPI lifespan + AsyncIOScheduler) |
| SHORTLIST-02 | Manual regenerate with optional filters (cuisine, max_prep_time, exclude_protein, required_moods) via `POST /shortlists/regenerate` | §"Architecture Patterns" → Pattern 4 (regenerate endpoint shape); existing `daily_shortlists.filters` JSONB column |
| SHORTLIST-03 | Hard filters → soft scoring (seasonality + recency + mood overlap − recent-cuisine/protein penalty + 0–0.2 jitter) | §"Code Examples" → `score_recipe` direct from SPEC.md §Algorithm; §"Architecture Patterns" → Pattern 1 (pure-function algorithm) |
| SHORTLIST-04 | `select_top5_with_diversity` distinct cuisines/proteins; cold-start `<10` / `10-29` / `30+` | §"Code Examples" → `select_top5_with_diversity`; §"Don't Hand-Roll" → "diversification — copy SPEC.md verbatim, do not improvise" |
| SHORTLIST-05 | Today's shortlist as swipe deck (`framer-motion`) showing both members' votes per card | §"Standard Stack" → framer-motion 12.x via `motion/react`; §"Architecture Patterns" → Pattern 2 (Tinder-style stacked-card deck) |
| VOTE-01 | Cast yes/no per shortlist recipe; vote stored in `votes` keyed on `(shortlist_id, recipe_id, member_id)` | Existing `Vote` ORM (`backend/app/models/vote.py`); §"Architecture Patterns" → Pattern 5 (vote upsert via `on_conflict_do_update`) |
| VOTE-02 | State computed from votes — Validé / Pressenti / Contesté / Rejeté / Sans avis. No `state` column. | §"Code Examples" → `compute_vote_state` reference impl; CLAUDE.md invariant #2 |
| VOTE-03 | "Tu décides" appends 5 yes votes via `POST /shortlists/{id}/delegate` | §"Architecture Patterns" → Pattern 6 (delegation as bulk insert) |
| VOTE-04 | Veto window closes when first CookingLog created — later `no` votes accepted but cannot un-cook | §"Code Examples" → veto-window check; §"Common Pitfalls" → Pitfall 4 (do NOT block votes, just don't act on them) |
| VOTE-05 | Clients receive `vote.created` WebSocket events within ~200ms | Existing `broadcast_to_household` in `services/realtime.py` (already documents `vote.created` as W3 contract) |
| COOK-01 | "Je commence à cuisiner" → `POST /recipes/{id}/cook` creates immutable CookingLog with `cooked_at = now()` | Existing `CookingLog` ORM; §"Architecture Patterns" → Pattern 7 (immutable insert, no UPDATE path in W3) |
| COOK-02 | "En train de cuisiner" banner on Home until log finalized or skipped | §"Architecture Patterns" → Pattern 8 (today's-cooking-log query) |
| PWA-03 | Daily-shortlist Web Push fires on both phones | §"Standard Stack" → pywebpush 2.3.0 + py-vapid; §"Architecture Patterns" → Pattern 9 (push fan-out + 410 cleanup); §"Common Pitfalls" → Pitfall 6 (iOS PWA-only requirement) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

The repo-root CLAUDE.md and frontend/AGENTS.md impose hard rules planning must respect:

1. **SPEC.md is source of truth.** Algorithm, voting state machine, capture pipeline are SPEC-locked. Phase 3 implements SPEC.md §Algorithm and §Voting verbatim — research must NOT propose alternatives.
2. **No manual deploys.** Push to `main`; Vercel + Railway auto-deploy. Planner must NOT include `vercel --prod` or `railway up` steps.
3. **Voting state is computed, not stored** (architecture invariant #2). No `state` column on votes. Reflected in §"Don't Hand-Roll".
4. **Denormalized fields update in same transaction as cooking_logs insert** (architecture invariant #3): `recipes.last_cooked_at` and `recipes.cook_count`. Phase 3 owns COOK-01/02 only — COOK-05 (denormalized update) is Phase 4. Phase 3 creates the CookingLog row but **does not** mutate the recipe; Phase 4 takes ownership.
5. **Realtime contract** (architecture invariant #4): `vote.created` MUST broadcast via `broadcast_to_household`. Already documented in existing `services/realtime.py` module docstring.
6. **Raw inputs preserved** (architecture invariant #5): N/A for Phase 3 (votes/shortlists have no raw-input concern).
7. **Localization from day one** (architecture invariant #6): all new UI copy goes through `next-intl` French messages. No hardcoded strings.
8. **Next.js 16+ training-data drift:** `frontend/AGENTS.md` mandates consulting `frontend/node_modules/next/dist/docs/` before writing frontend code. Research recommendations for routes/server-components must be cross-checked against in-tree docs at planning time.
9. **Shared vocabulary drift** (CLAUDE.md "Shared Vocabulary"): Cuisine / Mood / Protein / Season enums in `frontend/lib/enums.ts` ↔ `backend/app/models/enums.py`. The algorithm's recent-cuisine penalty references these — planner must use the existing enum values (`italian`, `french`, `asian`, …, `redMeat`, `northAfrican`, `middleEastern`) verbatim. Note the camelCase variants for multi-word values.

## Summary

Phase 3 is the **decision layer** of Al Dente. The user constraints, locked vocabularies, and SPEC.md leave very little to decide — almost every requirement maps to a published, well-trodden pattern, and the existing W1/W2 code already stubs the integration points (`broadcast_to_household` documents `vote.created`, the `Vote` / `DailyShortlist` / `CookingLog` ORMs are migrated, the cookie-auth + same-origin-rewrite flow is proven). The work is mostly assembly, with five concrete external dependencies to add.

Three areas need active research and recommendation:

1. **framer-motion swipe deck.** The package was renamed from `framer-motion` to `motion` in late 2024 (motion v12+). For React 19 / Next 16, the recommended import is `motion/react`. The Tinder-deck pattern is canonical: `motion.div` + `drag="x"` + `useMotionValue` for x + `useTransform` for rotation/opacity + `onDragEnd` threshold check on `info.offset.x` and `info.velocity.x`. Two stacked cards visible at a time (front + peek behind).
2. **APScheduler in FastAPI lifespan.** The current modern pattern is `asynccontextmanager` lifespan (NOT the deprecated `@app.on_event("startup")`). `AsyncIOScheduler` instantiated at module level, started in lifespan, shut down on yield exit. Per-household cron jobs registered after a DB query for active households. Use `zoneinfo.ZoneInfo("Europe/Paris")` (Python 3.9+ stdlib) — NOT pytz. Multi-worker pitfall: must run with `uvicorn --workers 1` (Railway free tier already does).
3. **VAPID Web Push (pywebpush).** PyPI 2.3.0 (released 2025). One-call `webpush(subscription_info, data, vapid_private_key, vapid_claims)`. iOS Safari 16.4+ supports Web Push, but **only for installed PWAs** (not in-Safari). EU restriction (iOS 17.4+) was reverted by Apple in March 2024 — France PWA push works as of 2026.

**Primary recommendation:** Plan Phase 3 in five vertical slices (algorithm, scheduler+push, votes router, cooking-log POST, frontend swipe deck) so each slice can land independently and the dogfood gate ("did we stop discussing IRL?") can be evaluated incrementally.

## Standard Stack

### Core (must add)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `framer-motion` (or `motion`) | 12.38.0 [VERIFIED: `npm view framer-motion version` 2026-05-07] | Swipe-deck drag gestures, rotation/opacity transforms, AnimatePresence card transitions | The de-facto React animation library; Tinder-style swipe is the canonical use-case for `drag="x"` + `useMotionValue` + `useTransform`; SPEC.md and CONTEXT.md both name it [VERIFIED: `frontend/package.json` does NOT yet have it installed] |
| `apscheduler` | 3.11.2 [VERIFIED: `pip index versions apscheduler` 2026-05-07] | Daily shortlist cron at 16:00 household-tz | SPEC.md §Stack names it; the only mature pure-Python in-process scheduler with cron + timezone support; AsyncIOScheduler is FastAPI-native [CITED: apscheduler.readthedocs.io] |
| `pywebpush` | 2.3.0 [VERIFIED: `pip index versions pywebpush` 2026-05-07] | Encrypted Web Push delivery to iOS / Android browsers via VAPID | Only mature Python Web Push library; maintained by `web-push-libs` org [CITED: github.com/web-push-libs/pywebpush] |
| `py-vapid` | 1.9.4 [VERIFIED: `pip index versions py-vapid` 2026-05-07] | One-time VAPID keypair generation CLI (`vapid --gen`) and key encoding | Pulled in transitively by pywebpush, but the CLI is what generates the production keypair [CITED: pypi.org/project/py-vapid] |

### Supporting (already present)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `partysocket` | 1.1.18 [VERIFIED: `frontend/package.json`] | Reconnecting WebSocket client | Already wired in `frontend/lib/ws.ts`; just add a `vote.created` handler to the existing `RealtimeProvider`. Do NOT introduce a second WS lib. |
| `@ducanh2912/next-pwa` | 10.2.9 [VERIFIED: `frontend/package.json`] | Service worker bundling + workbox runtime caching | Already configured in `next.config.ts`. Phase 3 EXTENDS it via the `customWorker` entry-point ([CITED: ducanh-next-pwa.vercel.app/docs/next-pwa/custom-worker]). |
| `next-intl` | 4.11.0 [VERIFIED: `frontend/package.json`] | All user-facing French strings | Add new keys to `frontend/lib/i18n/fr.json` for shortlist / vote / push / cooking-log copy. CLAUDE.md mandates this. |
| `sonner` | 2.0.7 [VERIFIED: `frontend/package.json`] | Toast notifications | Use sparingly for vote-state transitions (e.g., "Validé !") — D-08 from Phase 2 established the pattern. |
| `zoneinfo` (stdlib) | Python 3.12 builtin [VERIFIED: `python3 -c "import zoneinfo"`] | Household timezone resolution for APScheduler | Prefer over pytz: stdlib, no extra dep, IANA-correct, matches what `frontend/i18n.ts` already uses (`Europe/Paris`). pytz is legacy. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `framer-motion` (`motion`) | `react-spring`, `react-use-gesture`, hand-rolled `pointerdown`/`pointermove` | Lower maintenance velocity, smaller community, no Tinder-deck reference impl. SPEC.md and CONTEXT.md both lock framer-motion. |
| `pywebpush` (Web Push) | OneSignal, Firebase FCM, vendor PaaS | Vendor lock-in + monthly cost. Web Push is the W3C standard and works on iOS 16.4+. CONTEXT.md D-11 locks pywebpush. |
| `apscheduler` AsyncIOScheduler | Celery beat, RQ-scheduler, system cron + Railway cron | Celery/RQ require Redis (extra service). System cron requires container-level config — not portable. APScheduler runs in-process — perfect for couple-scale single-tenant Railway free-tier workload. |
| `zoneinfo` | `pytz` | pytz has historical bugs with `localize()` semantics around DST, and APScheduler's own docs ([CITED: github.com/agronholm/apscheduler/issues/599]) report a pytz 4.1 regression with AsyncIOScheduler. zoneinfo is the modern stdlib choice (PEP 615). |
| Server-side state computation | Client-only state computation | Both compute the same thing; spec says state is derived. Recommendation: **compute identically on both** — backend includes computed `state` in `vote.created` payload (per CONTEXT.md "Established Patterns") AND `GET /shortlists/today` includes raw votes so frontend can recompute on stale data. Belt-and-suspenders, no drift risk because logic is one shared function. |

**Installation:**

```bash
# Frontend (run in frontend/)
npm install framer-motion@^12

# Backend (run in backend/)
uv add apscheduler pywebpush py-vapid
```

**Version verification (2026-05-07):**
- `framer-motion@12.38.0` — verified via `npm view framer-motion version`. Note: the package was renamed to `motion` in late 2024; both `framer-motion` and `motion` ship the same v12 build [CITED: npmjs.com/package/framer-motion]. Recommendation: install `framer-motion@^12` to keep the import path stable (`import { motion } from "framer-motion"`); this is what the Tinder-deck examples use and it minimizes diff against any future Phase 3 reference code.
- `apscheduler@3.11.2` — verified via `pip index versions apscheduler`.
- `pywebpush@2.3.0` — verified via `pip index versions pywebpush`. **Note:** pywebpush requires `cryptography` and `http_ece`, which it pulls in automatically.
- `py-vapid@1.9.4` — verified via `pip index versions py-vapid`. Used only at deploy time for keypair generation.

## Architecture Patterns

### Recommended Project Structure

```
backend/app/
├── main.py                     # MUTATE: add lifespan(app) wiring AsyncIOScheduler + new routers
├── routers/
│   ├── shortlist.py            # NEW — GET /shortlists/today, POST /shortlists/regenerate, POST /shortlists/{id}/delegate
│   ├── votes.py                # NEW — POST /shortlists/{id}/recipes/{recipe_id}/vote
│   ├── cooking_logs.py         # NEW — POST /recipes/{id}/cook (Phase 4 will add PUT /cooking-logs/{id})
│   └── push.py                 # NEW — POST /push/subscribe, optional GET /push/vapid-public-key
├── services/
│   ├── algorithm.py            # NEW — pure scoring + select_top5_with_diversity, NO DB access
│   ├── shortlist.py            # NEW — generate_daily_shortlist(household_id, db) — wraps algorithm.py + DB upsert + broadcast + push fan-out
│   ├── voting.py               # NEW — compute_vote_state(rows: list[Vote], member_count: int) -> VoteState (pure)
│   └── push.py                 # NEW — send_push_to_household(household_id) — pywebpush fan-out + 404/410 cleanup
├── schemas/
│   ├── shortlist.py            # NEW — RegenerateRequest, ShortlistResponse with embedded votes + computed states
│   ├── vote.py                 # NEW — VoteRequest, VoteResponse with state
│   ├── cooking_log.py          # NEW — CookingLogResponse (Phase 4 extends with photos/rating/notes)
│   └── push.py                 # NEW — PushSubscriptionRequest (matches PushSubscription.toJSON() wire shape)
└── models/
    └── push_subscription.py    # NEW ORM — PushSubscription (id, member_id FK UNIQUE, subscription JSONB, created_at)

backend/alembic/versions/
├── 0004_push_subscriptions.py  # NEW — adds push_subscriptions table
└── 0005_household_timezone.py  # NEW (optional — only if SPEC.md timezone column missing) — adds households.timezone

frontend/
├── app/
│   ├── page.tsx                # MUTATE — replace hero/CTAs with <ShortlistDeck /> wrapped in <OnboardingGuard>
│   └── (no new routes)
├── components/
│   ├── ShortlistDeck.tsx       # NEW — top-level deck: empty state | swipe stack | "Tout vu" summary
│   ├── ShortlistCard.tsx       # NEW — single draggable card with rotation/opacity overlays + partner-vote dot
│   ├── VoteSummary.tsx         # NEW — "Tout vu" view with computed states + member dots + Tu-décides + Je-commence CTAs
│   ├── CookingBanner.tsx       # NEW — "En train de cuisiner" persistent banner (Finaliser / Passer)
│   ├── PushPermissionBanner.tsx # NEW — D-09 inline banner on first shortlist
│   └── RealtimeProvider.tsx    # MUTATE — add `vote.created` handler that updates shortlist state
├── lib/
│   ├── shortlist.ts            # NEW — fetchTodayShortlist(), regenerateShortlist(filters), delegateShortlist(id)
│   ├── votes.ts                # NEW — postVote(shortlistId, recipeId, value), computeVoteState() (mirrors backend)
│   ├── cooking.ts              # NEW — postCookingStart(recipeId), getActiveCookingLog()
│   └── push.ts                 # NEW — registerPushSubscription(), urlBase64ToUint8Array() helper
└── worker/
    └── index.ts                # NEW — custom worker entry: 'push' + 'notificationclick' listeners (added to next.config.ts)
```

### Pattern 1: Pure-function algorithm (no DB access)

**What:** `services/algorithm.py` exports `score_recipe(recipe, context) -> float | None` and `select_top5_with_diversity(ranked) -> list[Recipe]`. Both are deterministic except for the 0–0.2 jitter, take ORM rows in / return ORM rows out, and have ZERO `db.query(...)` calls.

**When to use:** Pattern repeats throughout Phase 3 — `compute_vote_state` is also a pure function (`list[Vote] -> VoteState`). Pure functions are unit-testable without a DB fixture and unambiguously verifiable against SPEC.md pseudocode.

**Example (from SPEC.md §Algorithm, paste verbatim):**

```python
# Source: SPEC.md §"Algorithm (Python service)"
import random
from dataclasses import dataclass

@dataclass
class ShortlistContext:
    current_season: str                # "spring" | "summer" | "autumn" | "winter"
    recent_cuisines: set[str]          # cuisines cooked in last N days
    recent_proteins: set[str]
    filters: "ShortlistFilters | None" # None for daily cron; set on POST /regenerate

def score_recipe(recipe, context: ShortlistContext) -> float | None:
    # Hard filters
    if recipe.status not in ("structured", "verified"):
        return None
    if context.filters:
        if context.filters.cuisine and recipe.cuisine != context.filters.cuisine:
            return None
        if context.filters.max_prep_time and (recipe.prep_time_minutes or 999) > context.filters.max_prep_time:
            return None
        if context.filters.exclude_protein and recipe.main_protein == context.filters.exclude_protein:
            return None
        if context.filters.required_moods and not (set(recipe.mood) & set(context.filters.required_moods)):
            return None

    # Soft scoring
    score = 0.0
    if context.current_season in (recipe.seasonality or []):
        score += 1.0
    days = recipe.days_since_cooked()  # property on Recipe — None → 999
    score += 1.5 * min(days / 14.0, 1.0)
    if context.filters and context.filters.required_moods:
        overlap = len(set(recipe.mood) & set(context.filters.required_moods))
        score += 0.8 * (overlap / len(context.filters.required_moods))
    if recipe.cuisine in context.recent_cuisines:
        score -= 0.5
    if recipe.main_protein in context.recent_proteins:
        score -= 0.5
    score += random.uniform(0, 0.2)
    return score
```

**Cold-start branching (driven by corpus size at call site, not in `score_recipe`):**

```python
def select_top_n_with_cold_start(
    candidates: list[tuple[Recipe, float]],
    corpus_size: int,
) -> list[Recipe]:
    if corpus_size < 10:
        return [r for r, _ in candidates[:5]]                    # no diversification, no banner-suppression
    if corpus_size < 30:
        return select_top5_soft_diversity(candidates)            # tie-break diversity only
    return select_top5_with_diversity(candidates)                # full SPEC.md algorithm
```

### Pattern 2: Tinder-style stacked-card swipe deck (framer-motion)

**What:** Front card is `motion.div` with `drag="x"`. Behind it, the next card renders in normal DOM flow with `transform: scale(0.94) translateY(12px)` + `opacity: 0.6`. Three motion values: `x` (drag position), `rotate` (mapped from `x` via `useTransform`), and `opacity` overlays for ❤️ / ✗ icons.

**When to use:** Exactly the home-tab swipe deck for D-04. NOT for the "Tout vu" summary (no drag there).

**Example (synthesized from CITED sources [motion.dev/tutorials/react-card-stack], [dev.to/lansolo99/a-tinder-like-card-game-with-framer-motion-35i5], [geeksforgeeks.org Tinder card swipe], all 2026):**

```tsx
"use client";
// Source: motion.dev/tutorials/react-card-stack + dev.to/lansolo99 (consolidated)
import { useState } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence, type PanInfo } from "framer-motion";

const SWIPE_THRESHOLD = 100; // px; over this → fly off-screen
const SWIPE_VELOCITY = 500;  // px/s; flick threshold even without offset

export function ShortlistCard({
  recipe,
  onVote,
}: {
  recipe: Recipe;
  onVote: (value: "yes" | "no") => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const yesOpacity = useTransform(x, [0, 100], [0, 1]);
  const noOpacity = useTransform(x, [-100, 0], [1, 0]);

  function handleDragEnd(_: PointerEvent, info: PanInfo) {
    const swiped =
      Math.abs(info.offset.x) > SWIPE_THRESHOLD ||
      Math.abs(info.velocity.x) > SWIPE_VELOCITY;
    if (!swiped) return; // snap back via dragSnapToOrigin
    onVote(info.offset.x > 0 ? "yes" : "no");
  }

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragSnapToOrigin
      dragElastic={0.6}
      style={{ x, rotate }}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
      className="absolute inset-0 rounded-3xl bg-card shadow-card touch-pan-y"
    >
      {/* recipe content (title, photo, cuisine, mood, prep_time) */}
      {/* overlay heart */}
      <motion.div style={{ opacity: yesOpacity }} className="absolute top-6 left-6 text-emerald-500 text-6xl">❤️</motion.div>
      <motion.div style={{ opacity: noOpacity }} className="absolute top-6 right-6 text-rose-500 text-6xl">✗</motion.div>
      {/* partner vote dot */}
    </motion.div>
  );
}
```

**Stacking pattern:**

```tsx
// Source: motion.dev/examples/react/card-stack — pseudocode for stack
<div className="relative h-[28rem] w-full">
  {/* peek behind */}
  {nextRecipe && (
    <div className="absolute inset-0 rounded-3xl bg-card scale-[0.94] translate-y-3 opacity-60" />
  )}
  <AnimatePresence>
    {currentRecipe && (
      <ShortlistCard key={currentRecipe.id} recipe={currentRecipe} onVote={handleVote} />
    )}
  </AnimatePresence>
</div>
```

**Notes for the planner:**
- `dragSnapToOrigin` makes the card return to center when not swiped past threshold — replaces the manual `animate({ x: 0 })` call seen in older tutorials.
- `touch-pan-y` on the card lets the user vertical-scroll the page (otherwise the drag swallows all touches).
- iOS Safari fires pointerevents reliably; verify in PWA standalone mode that drag works. Web Speech API had iOS PWA standalone-mode issues (Phase 2 bug); drag does NOT have similar issues per CITED sources.

### Pattern 3: FastAPI lifespan + AsyncIOScheduler

**What:** Use `@asynccontextmanager` lifespan on the FastAPI app to start/stop a module-level `AsyncIOScheduler`. Register one cron job per active household at startup.

**When to use:** SHORTLIST-01 daily generation. NOT for request-triggered work (`POST /shortlists/regenerate` runs synchronously in the request handler — no scheduler involvement).

**Example:**

```python
# Source: nashruddinamin.com/blog/running-scheduled-jobs-in-fastapi (CITED)
# + apscheduler.readthedocs.io/en/3.x/userguide.html (CITED)
from contextlib import asynccontextmanager
from zoneinfo import ZoneInfo
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from sqlalchemy import select

scheduler = AsyncIOScheduler()  # module-level singleton

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start scheduler
    scheduler.start()
    # Register one cron per active household at 16:00 in their tz
    from app.db import SessionLocal
    from app.models.household import Household
    from app.services.shortlist import generate_daily_shortlist
    with SessionLocal() as db:
        for hh in db.scalars(select(Household)).all():
            tz = ZoneInfo(hh.timezone or "Europe/Paris")
            scheduler.add_job(
                generate_daily_shortlist,
                CronTrigger(hour=16, minute=0, timezone=tz),
                args=[hh.id],
                id=f"shortlist_{hh.id}",
                replace_existing=True,
                misfire_grace_time=3600,  # if Railway just restarted, still fire within 1h
            )
    yield
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan)
```

**Multi-worker pitfall — MUST single-worker:**
Railway's `Procfile` / start command runs `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (no `--workers`). Default is 1 worker. **Do NOT add `--workers N`** — APScheduler runs in each worker independently and would create N duplicate jobs [CITED: github.com/fastapi/fastapi/discussions/9143]. For couple-scale Railway free-tier, single worker is correct anyway.

**Job re-registration on new household creation:**
When a new household is created (Phase 1 path, but rarely after v0.1 ships), the scheduler must be told. Options:
1. Reload the lifespan (impossible mid-run).
2. After `POST /households` succeeds, call `scheduler.add_job(...)` directly from the handler. **Recommended.**

### Pattern 4: Manual regenerate endpoint shape

**What:** `POST /shortlists/regenerate` accepts optional filters in the body, runs `generate_daily_shortlist(household_id, filters=body.filters)`, returns the new `DailyShortlist` with embedded recipes.

**Implementation:**

```python
# Source: SPEC.md §Algorithm + existing daily_shortlists.filters JSONB column
@router.post("/regenerate", response_model=ShortlistResponse)
async def regenerate(
    body: RegenerateRequest,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    today = date.today()
    # Find existing generation count
    last_gen = db.scalar(
        select(func.coalesce(func.max(DailyShortlist.generation), 0))
        .where(DailyShortlist.household_id == member.household_id, DailyShortlist.date == today)
    )
    shortlist = generate_daily_shortlist(
        member.household_id,
        db=db,
        filters=body.model_dump() if body else None,
        generation=last_gen + 1,
    )
    return shortlist
```

**Note:** unique constraint `(household_id, date, generation)` on `daily_shortlists` already exists (verified `backend/app/models/daily_shortlist.py`) — incrementing `generation` is mandatory for regenerate.

### Pattern 5: Vote upsert with `on_conflict_do_update`

**What:** Re-voting on the same `(shortlist_id, recipe_id, member_id)` triple updates the `vote` column in place. Uses PostgreSQL-specific `INSERT … ON CONFLICT … DO UPDATE`.

**Why:** CONTEXT.md "Claude's Discretion" leaves the choice to planner: "upsert OR latest-wins." Upsert is **simpler** because it produces one row per triple (clean votes table, no historical clutter, `compute_vote_state` doesn't need ORDER BY DESC LIMIT 1).

**Recommendation:** Use upsert. Add a unique constraint `(shortlist_id, recipe_id, member_id)` in a new migration (the existing `votes` table only has `idx_votes_shortlist`).

```python
# Source: docs.sqlalchemy.org/en/20/dialects/postgresql.html#insert-on-conflict-upsert (CITED)
from sqlalchemy.dialects.postgresql import insert as pg_insert

stmt = (
    pg_insert(Vote)
    .values(
        shortlist_id=shortlist_id,
        recipe_id=recipe_id,
        member_id=member.id,
        vote=value,
    )
    .on_conflict_do_update(
        index_elements=["shortlist_id", "recipe_id", "member_id"],
        set_={"vote": value, "created_at": func.now()},
    )
    .returning(Vote)
)
row = db.execute(stmt).scalar_one()
db.commit()
```

**Migration must add:** `UNIQUE (shortlist_id, recipe_id, member_id)` on `votes` (or it's an index — either works for `index_elements`).

### Pattern 6: Delegation as bulk insert

**What:** "Tu décides" appends `yes` for all 5 recipes in one transaction. SPEC.md says "appends 5 yes votes for the requesting member." Existing partner votes are untouched. Already-yes votes are no-ops via `on_conflict_do_nothing`.

```python
@router.post("/{shortlist_id}/delegate", response_model=ShortlistResponse)
async def delegate(
    shortlist_id: UUID,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    shortlist = db.get(DailyShortlist, shortlist_id)
    if not shortlist or shortlist.household_id != member.household_id:
        raise HTTPException(404, "shortlist not found")
    # Bulk insert yes for every recipe in shortlist.recipe_ids
    rows = [
        {"shortlist_id": shortlist_id, "recipe_id": rid, "member_id": member.id, "vote": "yes"}
        for rid in shortlist.recipe_ids
    ]
    stmt = (
        pg_insert(Vote)
        .values(rows)
        .on_conflict_do_update(
            index_elements=["shortlist_id", "recipe_id", "member_id"],
            set_={"vote": "yes"},  # if existing was 'no', flips to yes
        )
    )
    db.execute(stmt)
    db.commit()
    # Broadcast a single bulk event OR five vote.created — use bulk for efficiency
    await broadcast_to_household(member.household_id, "vote.delegated", {"shortlist_id": shortlist_id, "member_id": member.id})
    return _serialize_shortlist(shortlist, db)
```

**WS event choice:** Either fan out 5 `vote.created` events OR introduce a new `vote.delegated` event type. Recommendation: emit **5 individual `vote.created` events** so the frontend's existing `vote.created` handler handles both single votes and delegation uniformly. Adds 5 frames per delegate action — negligible.

### Pattern 7: Immutable cooking-log insert (W3 scope only)

**What:** `POST /recipes/{id}/cook` creates a `CookingLog` with `cooked_at = now()`, `photo_paths = []`, `rating = NULL`, `notes = NULL`. Returns 201 with the new log. **NO update to `recipes.last_cooked_at` / `cook_count` in W3** — that is COOK-05 in Phase 4.

**Why split:** Phase 3 owns COOK-01 + COOK-02 only. Phase 4 owns COOK-03/04/05 (finalize + denormalize). The log row itself is immutable for `cooked_at`; the finalization PATCH (Phase 4) only mutates `photo_paths`, `rating`, `notes` — and at that point Phase 4 ALSO updates the denormalized fields in the same transaction (architecture invariant #3).

**Defensive check:** Enforce one log per (household, calendar-day) at the application level (the schema allows multiple — this is intentional for couples cooking different things, but the "En train de cuisiner" UI assumes one active session). Recommend: 409 Conflict if an unfinalized log already exists today for the household.

```python
@router.post("/{recipe_id}/cook", status_code=201, response_model=CookingLogResponse)
async def start_cooking(
    recipe_id: UUID,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    recipe = db.get(Recipe, recipe_id)
    if not recipe or recipe.household_id != member.household_id:
        raise HTTPException(404, "recipe not found")
    # 409 if active cooking session exists today
    today = date.today()
    existing = db.scalar(
        select(CookingLog).where(
            CookingLog.household_id == member.household_id,
            func.date(CookingLog.cooked_at) == today,
            CookingLog.rating.is_(None),  # not finalized
        )
    )
    if existing:
        raise HTTPException(409, "another cooking session is active today")
    log = CookingLog(
        recipe_id=recipe_id,
        household_id=member.household_id,
        cooked_by_member_id=member.id,
        cooked_at=datetime.now(timezone.utc),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    await broadcast_to_household(member.household_id, "cooking.started", {"log_id": str(log.id), "recipe_id": str(recipe_id)})
    return log
```

**New WS event:** `cooking.started` should be added to the documented event vocabulary in `services/realtime.py` module docstring (the existing list mentions `recipe.created`, `recipe.promoted`, `recipe.updated`, `vote.created` — Phase 3 adds `vote.created` actually IS in the list, plus `cooking.started`).

### Pattern 8: Today's-cooking-log query (banner trigger)

**What:** `GET /cooking-logs/active` returns the unfinalized log for today's household, or 204 No Content. Frontend Home polls this on mount + listens for `cooking.started` WS event.

```python
@router.get("/active", response_model=CookingLogResponse | None)
def get_active_log(
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    today = date.today()
    log = db.scalar(
        select(CookingLog).where(
            CookingLog.household_id == member.household_id,
            func.date(CookingLog.cooked_at) == today,
            CookingLog.rating.is_(None),
        )
    )
    return log  # FastAPI returns 200 with `null` if None — frontend null-checks
```

### Pattern 9: VAPID Web Push fan-out + 410 cleanup

**What:** `services/push.py` exports `send_push_to_household(household_id, payload)`. Iterates subscriptions for the household, calls `pywebpush.webpush(...)`, on `WebPushException` with status 404 or 410 deletes the subscription row (the user uninstalled / unsubscribed).

```python
# Source: github.com/web-push-libs/pywebpush README + medium.com/@kaushalsinh73 FastAPI+VAPID guide (CITED)
import json
from pywebpush import webpush, WebPushException
from app.config import settings
from app.models.push_subscription import PushSubscription
from app.models.member import Member

def send_push_to_household(household_id: UUID, payload: dict, db: Session) -> None:
    subs = db.scalars(
        select(PushSubscription).join(Member).where(Member.household_id == household_id)
    ).all()
    for sub in subs:
        try:
            webpush(
                subscription_info=sub.subscription,
                data=json.dumps(payload),
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": f"mailto:{settings.vapid_email}"},
            )
        except WebPushException as ex:
            status_code = ex.response.status_code if ex.response is not None else None
            if status_code in (404, 410):
                # Subscription expired or unsubscribed — delete row
                db.delete(sub)
            else:
                # 4xx/5xx that's not gone-permanently — log and continue, don't raise
                log.warning("push send failed member=%s status=%s err=%s", sub.member_id, status_code, ex)
    db.commit()
```

**Critical:** the loop must NOT raise on per-subscription failure. One bad subscription cannot block the others.

**VAPID keypair generation (one-time, document in README):**

```bash
# Source: pypi.org/project/py-vapid (CITED)
pip install py-vapid
vapid --gen
# Outputs private_key.pem + public_key.pem
# Convert public key to URL-safe base64 for browser applicationServerKey:
vapid --applicationServerKey
# Store in Railway env vars:
#   VAPID_PRIVATE_KEY = <contents of private_key.pem>
#   VAPID_PUBLIC_KEY  = <urlsafe base64 from --applicationServerKey>
#   VAPID_EMAIL       = luca.guery@gmail.com
```

**Frontend subscription flow:**

```typescript
// Source: medium.com/@ameerezae Web Push Next.js guide (CITED)
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function registerPushSubscription(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  });
  await api("/api/push/subscribe", { method: "POST", body: JSON.stringify(sub.toJSON()) });
}
```

### Pattern 10: Vote-state computation (pure)

**What:** `compute_vote_state(votes_for_recipe: list[Vote], member_count: int) -> VoteState`. Takes only the votes for ONE recipe (not the whole table) and the number of household members (always 2 in v0.1, but parametrize for future).

**Reference impl (mirror this on frontend in `lib/votes.ts`):**

```python
# Source: SPEC.md §Voting state machine (verbatim)
from enum import Enum

class VoteState(str, Enum):
    valide = "valide"           # both yes
    pressenti = "pressenti"     # one yes, partner unvoted
    conteste = "conteste"       # one yes, one no
    rejete = "rejete"           # both no
    sans_avis = "sans_avis"     # neither voted

def compute_vote_state(votes: list[Vote], member_count: int = 2) -> VoteState:
    yes_count = sum(1 for v in votes if v.vote == "yes")
    no_count = sum(1 for v in votes if v.vote == "no")
    voted = yes_count + no_count
    if yes_count == member_count:
        return VoteState.valide
    if no_count == member_count:
        return VoteState.rejete
    if yes_count >= 1 and no_count >= 1:
        return VoteState.conteste
    if yes_count == 1 and voted == 1:
        return VoteState.pressenti
    return VoteState.sans_avis
```

**Mirror in TypeScript** — `lib/votes.ts` exports the same function with identical branch order so frontend computed state is identical to backend's. Drift between them is the bug class to avoid (CLAUDE.md "Shared Vocabulary" applies to logic too, not just enums).

### Pattern 11: Custom service worker for `push` event

**What:** Add `worker/index.ts` to handle `push` and `notificationclick`. Configure `@ducanh2912/next-pwa` to bundle it via `customWorkerSrc`.

**`worker/index.ts`:**

```typescript
// Source: medium.com/@ameerezae + ducanh-next-pwa.vercel.app/docs/next-pwa/custom-worker (CITED)
declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event: PushEvent) => {
  const data = event.data?.json() ?? { title: "Al Dente", body: "Ton shortlist du jour est prêt !" };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/192.png",
      badge: "/icons/192.png",
      data: { url: data.url ?? "/" },
    })
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | null)?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if (c.url === self.registration.scope + url.replace(/^\//, "") && "focus" in c) {
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
```

**`next.config.ts` change:**

```typescript
// MUTATE: add customWorkerSrc to existing withPWAInit call
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: { skipWaiting: true, clientsClaim: true },
  customWorkerSrc: "worker",       // NEW — dir under frontend/ root containing index.ts
  customWorkerDest: "public",       // NEW — bundle to public/worker-*.js
});
```

**Verification:** After build, `frontend/public/worker-<hash>.js` exists. The main `sw.js` imports it via `importScripts(...)`. iOS PWA standalone mode receives the push when Apple's APNs delivers it.

### Anti-Patterns to Avoid

- **Storing computed `state` on `votes`.** Architecture invariant #2. Any column called `state` on votes is wrong.
- **Letting the scheduler manage household timezone via pytz.** Use `zoneinfo`. pytz has DST-edge bugs and a known APScheduler incompatibility [CITED: github.com/agronholm/apscheduler/issues/599].
- **Running uvicorn with `--workers > 1`.** APScheduler will fire jobs N times. Railway's default is 1, do not override.
- **Dropping rejected subscriptions only on 410 Gone.** 404 Not Found also indicates the subscription is dead. Both must trigger row deletion.
- **Implementing the algorithm differently from SPEC.md pseudocode.** "Improving" the scoring is out of scope — the dogfood gate evaluates the SPEC algorithm. If it feels wrong after 2 weeks, that's a Phase 5 / productize-later finding, not a Phase 3 deviation.
- **Hand-rolling drag gestures with raw `pointermove`.** `framer-motion`'s `drag="x"` is purpose-built. Hand-rolling means re-implementing momentum, snap, elastic, constraints, all of which it gives free.
- **Calling `Notification.requestPermission()` on page mount.** D-09 mandates inline-on-first-shortlist. The browser permission UX is degraded if the prompt fires before the user understands the value.
- **Updating `last_cooked_at` / `cook_count` in Phase 3.** Architecture invariant #3 requires those updates in the same tx as the FINALIZE PATCH (Phase 4 COOK-05). Phase 3 only inserts the CookingLog.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag/swipe physics | Raw pointer event handlers + manual transform/spring math | `framer-motion`'s `drag` + `useMotionValue` + `useTransform` | Spring physics, momentum, threshold detection, elastic, constraints all included. Re-implementing is weeks of polish. |
| Cron + timezone scheduling | Custom `asyncio.sleep` loop with `datetime.now(tz)` polling | `APScheduler.AsyncIOScheduler` with `CronTrigger` | DST handling, missed-fire grace times, multi-job coordination, graceful shutdown all included. |
| Web Push encryption (ECDH + AES128GCM) | Hand-rolled with `cryptography` lib | `pywebpush.webpush()` | The encryption spec is RFC 8188 + RFC 8291 — non-trivial. Bugs leak push body or break delivery silently. |
| VAPID keypair generation | OpenSSL invocations + base64 encoding | `vapid --gen` CLI from `py-vapid` | Outputs all four formats (PEM private, DER public, URL-safe base64) correctly. |
| Postgres upsert | `SELECT … then INSERT or UPDATE` two-query pattern | `pg_insert(...).on_conflict_do_update(...)` | Atomic, race-free, and `RETURNING` lets you get the row back in one round-trip. |
| Vote state machine | `if-elif` chain on yes/no counts re-coded in 3 places | One pure function `compute_vote_state(votes, member_count)` shared by backend + frontend (identical impl) | Drift between server-derived and client-derived state is a UX bug class. One function with shared test fixtures eliminates it. |
| Reconnecting WebSocket client | Custom `onclose → setTimeout → new WebSocket` loop | `partysocket` (already installed) | Exponential backoff, jitter, correctness around abort/race already battle-tested. |
| Service worker boilerplate | Hand-written `sw.js` from scratch | `@ducanh2912/next-pwa` + custom worker entry | Workbox runtime caching, app-shell precache, asset versioning all auto-generated. Phase 3 only adds 2 event listeners on top. |

**Key insight:** Phase 3's deltas are SMALL — most of the heavy lifting is in published libraries. The risk is that the planner under-estimates how much polish framer-motion gives you for free and re-implements basic drag physics.

## Runtime State Inventory

> Phase 3 is greenfield additive — adds new tables + new endpoints. Two minor items have runtime state implications:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `daily_shortlists`, `votes`, `cooking_logs` tables already exist (verified `backend/app/models/`). The new `push_subscriptions` table is greenfield. NO existing data to migrate. | None for existing tables. New `push_subscriptions` table added by migration 0004. |
| Live service config | None — Railway / Vercel deployment config unchanged (auto-deploy on push to main). VAPID env vars must be set in Railway Project Settings: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`. Vercel needs `NEXT_PUBLIC_VAPID_PUBLIC_KEY` set to the same public key. | One-time: Luca runs `vapid --gen`, sets 3 Railway env vars + 1 Vercel env var. |
| OS-registered state | None — APScheduler runs in-process inside the Railway container; no system-cron or systemd registration. Container restart re-registers all jobs via lifespan. | None. |
| Secrets/env vars | New: `VAPID_PUBLIC_KEY` (public, OK in Vercel `NEXT_PUBLIC_*`), `VAPID_PRIVATE_KEY` (Railway only — NEVER ship to browser), `VAPID_EMAIL` (Railway only). Existing: `DATABASE_URL`, `SUPABASE_*`, `GEMINI_API_KEY`, `RAILWAY_URL` already configured. | Document VAPID env vars in `.planning/SETUP.md` or root `README.md`. |
| Build artifacts | `frontend/public/sw.js` and `frontend/public/workbox-*.js` are regenerated on every Vercel build. After Phase 3, `frontend/public/worker-*.js` will also exist (custom worker bundle). | None — auto-rebuilt on push. |

**Nothing found in category for OS-registered state and live service config that would block — verified by inspecting `backend/app/main.py` (no system cron), `frontend/next.config.ts` (no external service hooks), and Railway deployment model documented in CLAUDE.md.**

## Common Pitfalls

### Pitfall 1: APScheduler running with multiple workers

**What goes wrong:** Each uvicorn worker instantiates its own scheduler → each shortlist generates N times, each push sent N times.
**Why it happens:** Default uvicorn is 1 worker, but Railway / Render docs sometimes suggest scaling. Anyone reading "Production FastAPI" guides will find `--workers 4` recommendations.
**How to avoid:** Lock the start command in `Procfile` / `railway.toml` to a single worker. Add a comment: `# DO NOT add --workers — APScheduler is in-process`.
**Warning signs:** Two phones each get 2-4 push notifications at 16:00. Database has duplicate `daily_shortlists` rows for the same date (caught by the `UNIQUE(household_id, date, generation)` constraint — second worker's insert raises `IntegrityError`, which would surface in logs).

### Pitfall 2: pytz vs zoneinfo timezone mismatch

**What goes wrong:** Cron fires at the wrong UTC offset around DST changes.
**Why it happens:** pytz uses an older "localize after construction" pattern that's incompatible with how APScheduler computes next-fire times. [CITED: github.com/agronholm/apscheduler/issues/599 — pytz 4.1 + AsyncIOScheduler regression].
**How to avoid:** Use stdlib `zoneinfo.ZoneInfo("Europe/Paris")` (Python 3.9+). Pass it directly to `CronTrigger(timezone=zoneinfo.ZoneInfo("..."))`.
**Warning signs:** Shortlist fires at 17:00 instead of 16:00 in summer / 15:00 in winter, or vice versa.

### Pitfall 3: framer-motion v11 vs v12 import path

**What goes wrong:** Following an old (pre-2025) tutorial, `import { motion } from "framer-motion"` works but advanced features like `useMotionValueEvent` may not be in older versions.
**Why it happens:** The package was renamed from `framer-motion` to `motion` in late 2024. Both names point to v12+ today. Tutorials are mixed.
**How to avoid:** Install `framer-motion@^12.x` explicitly. Stick to `import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion"`. Don't mix `motion/react` and `framer-motion` imports in the same project.
**Warning signs:** TypeScript error "Cannot find module 'framer-motion'" → install. Or unexpected runtime error in `useMotionValueEvent` → check version.

### Pitfall 4: Veto window enforcement

**What goes wrong:** Implementing veto window as a backend reject (return 409 if cooking log exists today) breaks SPEC's intent — SPEC says "later `no` votes are accepted (signal for v0.2 weighting) but cannot un-cook."
**Why it happens:** "Veto window closes" is naturally read as "block votes."
**How to avoid:** Accept all votes always. The veto window only affects the UI's "this recipe is still rejectable" affordance and (in Phase 4) the cooking log finalization can't be reversed. The vote insert itself is unconditional. SPEC: votes are signal for v0.2 weighting.
**Warning signs:** Tests like "Vote rejected after cooking starts" — there's no such test. Vote endpoint never returns 409 for veto window.

### Pitfall 5: Service worker push event in dev mode

**What goes wrong:** `next-pwa` is `disable: process.env.NODE_ENV === "development"` (verified in current `next.config.ts`). Custom worker doesn't bundle in dev → `push` event listener doesn't run → manual testing impossible.
**Why it happens:** Necessary for HMR sanity. But it bites Phase 3 testing.
**How to avoid:** Either (a) test push only via Vercel preview deploys, or (b) temporarily flip `disable: false` for local push testing. Document this in the plan's UAT section. **Do not** unconditionally enable the SW in dev — HMR vs SW conflicts are a known pain point.
**Warning signs:** Browser console "ServiceWorker registered" but no push handler listed in DevTools → Application → Service Workers.

### Pitfall 6: iOS push only works in installed PWA

**What goes wrong:** Test push from Safari tab → no notification, even with permission granted.
**Why it happens:** iOS 16.4+ supports Web Push **only for PWAs added to Home Screen**, not in-Safari [CITED: developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers].
**How to avoid:** Document in the in-app banner: "Pour activer les notifications, ajoute Al Dente à ton écran d'accueil d'abord." Detect non-installed state (`navigator.standalone === false` on iOS) and gate the permission prompt accordingly.
**Warning signs:** "Permission granted" but `pushManager.subscribe()` succeeds yet no notifications arrive. Most common cause: tested from Safari tab, not from installed PWA.

### Pitfall 7: WebSocket session staleness during reconnect storm

**What goes wrong:** Frontend reconnects, but in-memory shortlist state is stale. User votes locally, sees state flip back when next `vote.created` event arrives.
**Why it happens:** `partysocket` reconnects with backoff (already in `lib/ws.ts`) but missed events during disconnect aren't replayed.
**How to avoid:** On `partysocket` "open" event, refetch `GET /shortlists/today` to resync. The Phase 1 plan likely already does this for recipe list — extend to shortlist.
**Warning signs:** Vote dot shows on screen but disappears 5 seconds later. Test by airplane-mode toggling during voting.

### Pitfall 8: Empty shortlist (corpus too small)

**What goes wrong:** New household, < 5 structured recipes. Cron generates an empty `daily_shortlists.recipe_ids = []` row, push notification fires for an empty deck.
**Why it happens:** No "minimum recipes" guard.
**How to avoid:** In `generate_daily_shortlist`, if `len(candidates) == 0`, **do not insert a row** and **do not send push**. Frontend's empty-state (D-02) handles "no shortlist exists today" — better than a push for an empty deck.
**Warning signs:** Notification fires, user opens, deck is empty.

## Code Examples

Verified patterns from official sources:

### Frontend: shortlist API client

```typescript
// Source: existing pattern in frontend/lib/recipes.ts (CITED)
import { api } from "@/lib/api";
import type { Recipe } from "@/lib/recipes";

export type VoteValue = "yes" | "no";
export type VoteState = "valide" | "pressenti" | "conteste" | "rejete" | "sans_avis";

export type ShortlistVote = {
  shortlist_id: string;
  recipe_id: string;
  member_id: string;
  vote: VoteValue;
};

export type ShortlistResponse = {
  shortlist_id: string;
  date: string;          // YYYY-MM-DD
  generation: number;
  recipes: Recipe[];     // ordered as in recipe_ids
  votes: ShortlistVote[];
};

export async function fetchTodayShortlist(): Promise<ShortlistResponse | null> {
  // Returns 200 with shortlist OR 204 No Content if no shortlist exists yet
  return api<ShortlistResponse | null>("/api/shortlists/today");
}

export async function regenerateShortlist(filters?: ShortlistFilters): Promise<ShortlistResponse> {
  return api<ShortlistResponse>("/api/shortlists/regenerate", {
    method: "POST",
    body: JSON.stringify(filters ?? {}),
  });
}

export async function postVote(
  shortlistId: string,
  recipeId: string,
  vote: VoteValue,
): Promise<ShortlistVote> {
  return api<ShortlistVote>(
    `/api/shortlists/${shortlistId}/recipes/${recipeId}/vote`,
    { method: "POST", body: JSON.stringify({ vote }) },
  );
}

export async function delegateShortlist(shortlistId: string): Promise<ShortlistResponse> {
  return api<ShortlistResponse>(`/api/shortlists/${shortlistId}/delegate`, { method: "POST" });
}
```

### Backend: APScheduler job entry

```python
# Source: combining nashruddinamin lifespan pattern + SPEC.md §Algorithm + existing services/realtime.py
from datetime import date
from uuid import UUID
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models.recipe import Recipe
from app.models.daily_shortlist import DailyShortlist
from app.services.algorithm import score_recipe, select_top_n_with_cold_start, ShortlistContext
from app.services.realtime import broadcast_to_household
from app.services.push import send_push_to_household

async def generate_daily_shortlist(
    household_id: UUID,
    db: Session | None = None,
    filters: dict | None = None,
    generation: int = 1,
) -> DailyShortlist | None:
    """Daily cron entry-point. Idempotent on (household_id, today, generation)."""
    own_session = db is None
    db = db or SessionLocal()
    try:
        candidates = db.scalars(
            select(Recipe).where(
                Recipe.household_id == household_id,
                Recipe.status.in_(("structured", "verified")),
            )
        ).all()
        if not candidates:
            return None  # Pitfall 8 — don't insert empty row, don't push
        context = ShortlistContext(
            current_season=current_season_for(household_id, db),
            recent_cuisines=recent_cuisines_for(household_id, db, days=14),
            recent_proteins=recent_proteins_for(household_id, db, days=14),
            filters=filters,
        )
        scored = [(r, score_recipe(r, context)) for r in candidates]
        scored = [(r, s) for r, s in scored if s is not None]
        scored.sort(key=lambda t: t[1], reverse=True)
        picks = select_top_n_with_cold_start(scored, len(candidates))
        if not picks:
            return None
        shortlist = DailyShortlist(
            household_id=household_id,
            date=date.today(),
            generation=generation,
            recipe_ids=[r.id for r in picks],
            filters=filters,
        )
        db.add(shortlist)
        db.commit()
        db.refresh(shortlist)
        # Broadcast + push (best-effort; do not raise on push failure)
        await broadcast_to_household(
            household_id, "shortlist.created",
            {"shortlist_id": str(shortlist.id), "date": shortlist.date.isoformat()},
        )
        send_push_to_household(
            household_id,
            {"title": "Al Dente", "body": "Ton shortlist du jour est prêt !", "url": "/"},
            db=db,
        )
        return shortlist
    finally:
        if own_session:
            db.close()
```

### Backend: vote endpoint with broadcast

```python
# Source: pattern lifted from existing routers/recipes.py + SPEC §Voting
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.services.voting import compute_vote_state

@router.post(
    "/shortlists/{shortlist_id}/recipes/{recipe_id}/vote",
    response_model=VoteResponse,
    status_code=201,
)
async def cast_vote(
    shortlist_id: UUID,
    recipe_id: UUID,
    body: VoteRequest,  # { vote: "yes" | "no" }
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    shortlist = db.get(DailyShortlist, shortlist_id)
    if not shortlist or shortlist.household_id != member.household_id:
        raise HTTPException(404, "shortlist not found")
    if recipe_id not in shortlist.recipe_ids:
        raise HTTPException(400, "recipe not in this shortlist")

    stmt = (
        pg_insert(Vote)
        .values(
            shortlist_id=shortlist_id,
            recipe_id=recipe_id,
            member_id=member.id,
            vote=body.vote,
        )
        .on_conflict_do_update(
            index_elements=["shortlist_id", "recipe_id", "member_id"],
            set_={"vote": body.vote, "created_at": func.now()},
        )
        .returning(Vote)
    )
    vote_row = db.execute(stmt).scalar_one()
    db.commit()

    # Recompute state from all votes for this (shortlist, recipe)
    votes_for_recipe = db.scalars(
        select(Vote).where(Vote.shortlist_id == shortlist_id, Vote.recipe_id == recipe_id)
    ).all()
    member_count = db.scalar(
        select(func.count(Member.id)).where(Member.household_id == member.household_id)
    )
    state = compute_vote_state(votes_for_recipe, member_count)

    payload = {
        "shortlist_id": str(shortlist_id),
        "recipe_id": str(recipe_id),
        "member_id": str(member.id),
        "vote": body.vote,
        "state": state.value,
    }
    await broadcast_to_household(member.household_id, "vote.created", payload)
    return payload
```

### Frontend: ShortlistDeck component skeleton

```tsx
"use client";
// Source: existing OnboardingGuard + RealtimeProvider pattern (CITED frontend/app/page.tsx, RealtimeProvider.tsx)
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtime } from "@/components/RealtimeProvider";
import { fetchTodayShortlist, postVote, type ShortlistResponse, type ShortlistVote } from "@/lib/shortlist";
import { ShortlistCard } from "@/components/ShortlistCard";
import { VoteSummary } from "@/components/VoteSummary";

export function ShortlistDeck() {
  const [shortlist, setShortlist] = useState<ShortlistResponse | null>(null);
  const [index, setIndex] = useState(0);
  const realtime = useRealtime();

  useEffect(() => { fetchTodayShortlist().then(setShortlist); }, []);

  // Subscribe to vote.created — partner's votes update live
  useEffect(() => {
    if (!realtime) return;
    return realtime.onEvent<ShortlistVote & { state: string }>("vote.created", (payload) => {
      setShortlist((s) => s && updateVotes(s, payload));
    });
  }, [realtime]);

  if (shortlist === null) return <ShortlistEmptyState />;
  const remaining = shortlist.recipes.slice(index);
  if (remaining.length === 0) return <VoteSummary shortlist={shortlist} />;

  const [current, next] = remaining;
  async function handleVote(value: "yes" | "no") {
    await postVote(shortlist.shortlist_id, current.id, value);
    setIndex((i) => i + 1);
  }

  return (
    <div className="relative h-[28rem] w-full max-w-sm mx-auto">
      {next && (
        <div className="absolute inset-0 rounded-3xl bg-card scale-[0.94] translate-y-3 opacity-60" />
      )}
      <AnimatePresence>
        <ShortlistCard key={current.id} recipe={current} onVote={handleVote} shortlist={shortlist} />
      </AnimatePresence>
    </div>
  );
}
```

### Migration: push_subscriptions table

```python
# Source: existing alembic pattern from 0003_promotion_columns.py
"""push_subscriptions

Revision ID: 0004
Revises: 0003
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0004"
down_revision = "0003"

def upgrade() -> None:
    op.create_table(
        "push_subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("member_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("subscription", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_push_subs_member", "push_subscriptions", ["member_id"])

def downgrade() -> None:
    op.drop_index("idx_push_subs_member", table_name="push_subscriptions")
    op.drop_table("push_subscriptions")
```

### Migration: votes unique constraint (for upsert)

```python
"""votes_uniqueness

Revision ID: 0005
Revises: 0004
"""
from alembic import op

revision = "0005"
down_revision = "0004"

def upgrade() -> None:
    op.create_unique_constraint(
        "uq_votes_shortlist_recipe_member",
        "votes",
        ["shortlist_id", "recipe_id", "member_id"],
    )

def downgrade() -> None:
    op.drop_constraint("uq_votes_shortlist_recipe_member", "votes", type_="unique")
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@app.on_event("startup")` for FastAPI startup hooks | `lifespan` async context manager | Deprecated in FastAPI 0.93 (early 2023); mandatory for new code | All scheduler init must use `lifespan(app)` — search results dated 2023+ confirm [CITED: nashruddinamin 2024] |
| `pytz.timezone("Europe/Paris")` | `zoneinfo.ZoneInfo("Europe/Paris")` (PEP 615, Python 3.9+) | Python 3.9 (2020); pytz now legacy | Use stdlib; pytz has known APScheduler interop bug [CITED: github.com/agronholm/apscheduler/issues/599] |
| `framer-motion` import | `motion` package, `import { motion } from "motion/react"` | 2024-Q4 rebrand; both names work for v12 | For minimal diff, install `framer-motion@^12` and keep the old import path. New projects can use `motion`. Both ship same code [CITED: motion.dev/docs/react-upgrade-guide] |
| OneSignal / Firebase for browser push | Native Web Push + VAPID + pywebpush | iOS 16.4 (March 2023) added Apple's APNs bridge → all major browsers now support W3C Web Push directly | No vendor SDK needed; pywebpush + py-vapid is sufficient. iOS works on installed PWAs only [CITED: developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers] |
| Hand-rolled `INSERT ... SELECT 1 EXISTS` upsert pattern | `pg_insert(...).on_conflict_do_update(...)` | SQLAlchemy 1.4+ (2021); 2.0 idiomatic | Atomic, race-free, returns row in one round-trip [CITED: docs.sqlalchemy.org/en/20/dialects/postgresql.html] |

**Deprecated/outdated:**
- **`pytz`** — legacy. Use stdlib `zoneinfo`.
- **`@app.on_event("startup")` / `@app.on_event("shutdown")`** — deprecated. Use `lifespan`.
- **OneSignal / Firebase Cloud Messaging for browser push** — vendor lock-in. Native Web Push works on all targets.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.12 | Backend (APScheduler, pywebpush) | ✓ | 3.12 [VERIFIED: backend/.python-version] | — |
| Node.js | Frontend (framer-motion install) | ✓ | Inferred from existing Next.js 16.2.4 build success | — |
| `uv` | Backend dependency add | ✓ [VERIFIED: backend/pyproject.toml uses uv-style format] | — | `pip install` if needed |
| `npm` | Frontend dependency add | ✓ [VERIFIED: frontend/package-lock.json present] | — | — |
| PostgreSQL 14+ (for `gen_random_uuid()`, `JSONB`, `ON CONFLICT DO UPDATE`) | All tables, all upserts | ✓ [VERIFIED: existing migrations using these features in production] | Supabase Postgres | — |
| `vapid` CLI | One-time keypair generation (deploy step, not runtime) | ✗ | — | Install on Luca's machine via `pip install py-vapid`; alternative: any online VAPID keypair generator (vapidkeys.com) — but local generation preferred for private-key handling |
| Railway env vars | VAPID keys, `RAILWAY_URL`, `DATABASE_URL`, `GEMINI_API_KEY` | Existing vars set; VAPID 3 new vars must be added | — | — |
| Vercel env vars | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` must be added | Existing `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_WS_BASE`, `RAILWAY_URL` already set | — | — |
| iOS 16.4+ on test phones | Web Push delivery target | Likely ✓ (95%+ iPhones globally per CITED [magicbell.com PWA iOS guide]); **must be verified on Luca's + partner's actual phones** | — | If on iOS < 16.4: feature degrades to in-app only — no push, but everything else works. Document in plan. |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** `vapid` CLI (one-time only, easily installed via pip).

**Action items for plan:**
1. Add Phase 3 setup task: install `framer-motion@^12` (frontend) + `apscheduler`, `pywebpush`, `py-vapid` (backend).
2. Add deploy task: generate VAPID keypair, set Railway + Vercel env vars (one-time).
3. Verify iOS version on Luca's + partner's test phones before push notification work.

## Security Domain

> Security enforcement default is enabled. Below are the ASVS / STRIDE-applicable concerns for Phase 3.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing cookie-first / Bearer-fallback `Depends(current_member)` — every new Phase 3 endpoint MUST use it [VERIFIED: `backend/app/auth.py`] |
| V3 Session Management | yes | Existing 90-day HttpOnly cookie unchanged for Phase 3 |
| V4 Access Control | yes | Every `shortlist_id`, `recipe_id`, `cooking_log_id` query MUST filter by `household_id == member.household_id`. 404 (not 403) on cross-household to avoid existence-leak (T-01-08-04 mitigation already documented in `recipes.py`) |
| V5 Input Validation | yes | Pydantic v2 schemas (`schemas/shortlist.py`, `schemas/vote.py`, `schemas/cooking_log.py`, `schemas/push.py`) for every request body. Enums constrain `vote` to `yes`/`no`. Filters constrained to known cuisine/protein/mood values |
| V6 Cryptography | yes | VAPID uses ECDSA P-256 + AES128GCM — never hand-rolled, always via `pywebpush`/`py-vapid`. VAPID private key must NEVER ship to the browser (no `NEXT_PUBLIC_*` prefix) |
| V8 Data Protection | yes | Push subscription endpoint URLs are user-data; store as JSONB but treat as PII. Don't log full subscription URLs (token-grade secret per RFC 8030) |
| V13 API & Web Service | yes | All POST endpoints require valid auth; CORS allowlist already restricted in `config.py`. Rate-limiting on POST /shortlists/regenerate is recommended (one user could spam regenerate in a tight loop — productize-later) |

### Known Threat Patterns for Phase 3 stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-household vote/shortlist access | I (Information disclosure) / E (Elevation of privilege) | Every query filters by `household_id`; 404 on miss; documented as T-01-08-04 in existing recipes.py |
| Vote replay / forgery | T (Tampering) / R (Repudiation) | `member_id` derived server-side from auth (NEVER trust client `member_id` field); upsert idempotency means replay = no-op |
| Push subscription endpoint leak | I (Information disclosure) | Don't log full subscription endpoints; treat the JSONB as secret |
| Push notification spoofing (someone else sends to your endpoint) | T (Tampering) | VAPID claim signature — `pywebpush` does this automatically; receiving browser verifies the JWT |
| VAPID private key exfiltration | I / T | Railway env var only; never `NEXT_PUBLIC_*`; rotate by generating new keypair if leaked (re-subscribes invalidate old) |
| APScheduler unauthenticated trigger | E | Job runs server-side only; no HTTP entrypoint exists. Manual regenerate goes through authenticated `POST /shortlists/regenerate` |
| Algorithm DoS via large recipe corpus | D (Denial of service) | Couple-scale workload (max ~200 recipes / household for years per SPEC.md "Risks budgeted"). Algorithm is O(N) — non-issue for v0.1. Document as "watch at 1k+ recipes" |
| Web Push as XSS vector via `notificationclick` | E | Service worker `notificationclick` handler validates `data.url` is a same-origin path (starts with `/`). Never `openWindow(arbitrary_url)` |

**Specific Phase 3 security rules for the planner:**

1. **VAPID private key NEVER in `NEXT_PUBLIC_*` env vars.** Backend-only. Frontend uses public key only.
2. **`POST /push/subscribe` must verify** the subscription's `endpoint` is a valid Push service URL (https only, known providers like `fcm.googleapis.com`, `updates.push.services.mozilla.com`, `web.push.apple.com`). Not strictly required for security, but a sanity check.
3. **Vote endpoint must reject `member_id` from request body.** Always derive from `current_member`. Pydantic schema for `VoteRequest` should NOT include `member_id` field at all.
4. **Cooking-log start must enforce same-household.** `recipe.household_id == member.household_id`, 404 on miss.
5. **Service worker `notificationclick` URL whitelist.** Only same-origin paths. Reject external URLs.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Two members per household in v0.1 (member_count = 2 for vote-state computation) | Pattern 10 (vote state) | Vote-state branches are 2-member-specific; if a 3rd member is added, "Validé = both yes" becomes ambiguous. Mitigation: parametrize `member_count`. PROJECT.md confirms "Audience: Single household (Luca + partner)" so this is HIGH-confidence assumed not a problem. |
| A2 | iOS 16.4+ on Luca's and partner's phones | Environment Availability + Pitfall 6 | Push notifications won't work on older iOS. Verify before shipping. Failure mode: degrade gracefully — in-app updates still work via WS. |
| A3 | Railway free tier runs 1 container worker | Pattern 3 (lifespan + scheduler) | If Railway scales out (multi-container), each replica fires its own scheduler → duplicate pushes. Mitigation: stay on free tier OR add a coordination lock (productize-later). |
| A4 | `households.timezone` column doesn't exist yet | CONTEXT.md "Claude's Discretion" + Migration plan | Planner must check current schema. If exists, no migration needed. If not, add migration 0005 (or 0006 after votes-unique). Verifiable trivially: `\d households` in Supabase or check `backend/app/models/household.py`. **Verified by reading `backend/app/models/household.py` 2026-05-07: NO `timezone` column exists. Migration required.** |
| A5 | "Active cooking session" defined as `cooking_logs.rating IS NULL` (i.e., not finalized) | Pattern 7 + Pattern 8 | The model has no `is_active` flag. Using `rating IS NULL` is a proxy. If a user starts cooking, finalizes without rating, this proxy is wrong. Phase 4 owns finalization — recommend Phase 4 always set rating on finalize. Document in PR for Phase 4. |
| A6 | `framer-motion` v12 import path remains `"framer-motion"` (not `"motion/react"`) for backward compat | Pitfall 3 | If the npm package alias breaks, imports break. Workaround: install both names or alias in tsconfig. Risk is low — Motion team committed to backward compat per [CITED: motion.dev/docs/react-upgrade-guide]. |
| A7 | Web Push works in EU as of 2026 (Apple reverted iOS 17.4 EU restriction) | Pitfall 6 + Summary | If Apple re-restricts, push silently fails on French iPhones. Mitigation: in-app realtime (already works) covers the gap. Verify on actual phones. |
| A8 | `recipes.days_since_cooked()` is a Python property/method on the Recipe ORM | Pattern 1 (algorithm) | Currently NOT defined on `backend/app/models/recipe.py` (verified). The planner must add it as a `@property` returning `(now - last_cooked_at).days` if `last_cooked_at` else 999. Trivial — flag for plan. |

**If this table is empty:** N/A — there are 8 explicit assumptions. Most are LOW risk.

## Open Questions

1. **Should "Tu décides" appending votes count as 5 individual `vote.created` events or 1 `vote.delegated` event?**
   - What we know: SPEC says "appends 5 yes votes" and CONTEXT.md leaves it to planner.
   - What's unclear: WS event design.
   - Recommendation: 5 individual `vote.created` events (Pattern 6). Frontend handler stays uniform. Bandwidth cost is negligible.

2. **Should `POST /shortlists/today` regenerate idempotently if today already has a shortlist?**
   - What we know: Cron is idempotent because of unique constraint on `(household_id, date, generation=1)`. Manual regenerate increments generation.
   - What's unclear: What if cron failed / didn't fire and frontend hits `GET /shortlists/today` at 12:00? Should it generate on-demand?
   - Recommendation: `GET /shortlists/today` returns 204 if no row exists. Frontend shows empty state per D-02. Cron is the only path that auto-generates. Manual generation requires explicit user action via `POST /regenerate`. This avoids "background generate on first GET" race conditions.

3. **What happens to a shortlist when a member of the household is deleted?**
   - What we know: Phase 1 cascade `households.id ON DELETE CASCADE` on `daily_shortlists`. Member deletion is not in v0.1 scope (no UI for "leave household").
   - What's unclear: Member is never deleted in v0.1, so the question is moot. Productize-later.

4. **Does the algorithm handle a household with members in different time zones?**
   - What we know: SPEC.md says "configurable time (default 16:00 household tz)". Households have a single timezone.
   - What's unclear: When the Australian partner of a French resident gets the push at 16:00 Paris but it's 02:00 Sydney.
   - Recommendation: v0.1 single timezone per household. Couple-scale assumption. If push is annoying for one member, they can disable notifications. Document as known limitation.

5. **Should the cold-start banner be dismissible permanently or per-session?**
   - What we know: CONTEXT.md "Specifics" → "Dismissible per session via localStorage flag."
   - What's unclear: Cleared on dismiss → re-appears next time. Acceptable nag rate?
   - Recommendation: Per-session via `sessionStorage` (clears on PWA cold-start). Permanent dismiss is annoying when the user IS adding more recipes — they want to see it appear and disappear naturally as the corpus grows.

## Sources

### Primary (HIGH confidence)

- **SPEC.md §"Algorithm (Python service)"** — pseudocode for `score_recipe`, `select_top5_with_diversity`, cold-start tuning [VERIFIED: read 2026-05-07]
- **SPEC.md §"Voting (asymmetric, no hard deadline)"** — 5-state machine table, veto window, Tu décides [VERIFIED: read 2026-05-07]
- **SPEC.md §"Cooking log"** — POST /recipes/{id}/cook, immutable cooked_at, denormalization [VERIFIED: read 2026-05-07]
- **CLAUDE.md (repo root)** — architecture invariants #2 (state computed), #3 (denormalized), #4 (realtime contract) [VERIFIED: read 2026-05-07]
- **`.planning/phases/03-decide-w3/03-CONTEXT.md`** — D-01 through D-12 user decisions [VERIFIED: read 2026-05-07]
- **`backend/app/models/{vote,daily_shortlist,cooking_log,recipe}.py`** — existing ORM definitions [VERIFIED: read 2026-05-07]
- **`backend/app/services/realtime.py`** — `broadcast_to_household` signature, documented event vocabulary [VERIFIED: read 2026-05-07]
- **`backend/app/auth.py`** — cookie-first auth pattern for new endpoints [VERIFIED: read 2026-05-07]
- **`frontend/components/RealtimeProvider.tsx`** — `client.onEvent("vote.created", ...)` pattern [VERIFIED: read 2026-05-07]
- **`frontend/lib/api.ts`** + **`frontend/lib/recipes.ts`** — API client conventions [VERIFIED: read 2026-05-07]
- **`frontend/next.config.ts`** — existing `@ducanh2912/next-pwa` integration to extend [VERIFIED: read 2026-05-07]
- **npm registry** — `framer-motion@12.38.0` [VERIFIED: `npm view framer-motion version` 2026-05-07]
- **PyPI** — `apscheduler@3.11.2`, `pywebpush@2.3.0`, `py-vapid@1.9.4` [VERIFIED: `pip index versions` 2026-05-07]

### Secondary (MEDIUM confidence — official docs but not directly verified for this exact use case)

- [Motion library docs](https://motion.dev/docs/react-gestures) — drag gesture API [CITED]
- [Motion card stack tutorial](https://motion.dev/tutorials/react-card-stack) — referenced pattern [CITED]
- [Motion upgrade guide](https://motion.dev/docs/react-upgrade-guide) — framer-motion → motion rebrand [CITED]
- [pywebpush README on GitHub](https://github.com/web-push-libs/pywebpush) — webpush() API + VAPID claims [CITED via gh API + WebFetch 2026-05-07]
- [APScheduler User Guide](https://apscheduler.readthedocs.io/en/3.x/userguide.html) — AsyncIOScheduler [CITED]
- [Apple Web Push docs](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers) — iOS 16.4+ requirements [CITED]
- [@ducanh2912/next-pwa custom worker docs](https://ducanh-next-pwa.vercel.app/docs/next-pwa/custom-worker) — `customWorkerSrc` option [CITED]
- [SQLAlchemy 2.0 PostgreSQL dialect docs — INSERT ON CONFLICT](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#insert-on-conflict-upsert) [CITED]
- [APScheduler issue #599 — pytz incompatibility](https://github.com/agronholm/apscheduler/issues/599) [CITED]

### Tertiary (LOWER confidence — community blog posts cross-verified against primary)

- [GeeksforGeeks Tinder card swipe with framer-motion](https://www.geeksforgeeks.org/reactjs/how-to-create-tinder-card-swipe-gesture-using-react-and-framer-motion/) — 150px threshold pattern [CITED]
- [DEV Community — Tinder-like card game with framer-motion (lansolo99)](https://dev.to/lansolo99/a-tinder-like-card-game-with-framer-motion-35i5) — `dragSnapToOrigin` pattern [CITED]
- [Medium — FastAPI + Web Push (VAPID) (kaushalsinh73)](https://medium.com/@kaushalsinh73/fastapi-web-push-vapid-real-time-notifications-without-vendor-lock-in-43540ec855f6) — fan-out pattern [CITED, content was not fully accessible via WebFetch]
- [Medium — Web Push in Next.js (ameerezae)](https://medium.com/@ameerezae/implementing-web-push-notifications-in-next-js-a-complete-guide-e21acd89492d) — service worker push handler [CITED]
- [Nashruddinamin blog — Running Scheduled Jobs in FastAPI](https://www.nashruddinamin.com/blog/running-scheduled-jobs-in-fastapi) — lifespan pattern [CITED]
- [magicbell.com — PWA iOS Limitations 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — iOS 16.4+ install-only [CITED]

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every package verified live (npm/PyPI registry calls 2026-05-07); SPEC.md and CONTEXT.md lock most choices
- Architecture patterns: **HIGH** — 9 patterns are direct extensions of existing W1/W2 code (auth, broadcast_to_household, RealtimeProvider, partysocket); 2 patterns (lifespan+APScheduler, custom service worker) verified against multiple 2026-current sources
- Pitfalls: **HIGH** — every pitfall has a CITED source identifying the failure mode (pytz/APScheduler regression, iOS PWA-only push, multi-worker scheduler, framer-motion rebrand)
- Algorithm + voting state: **HIGH** — copied verbatim from SPEC.md, no interpretation
- iOS / EU push status: **MEDIUM** — verified via 2026 sources but Apple's policy can shift; mitigated by graceful fallback to in-app realtime

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (30 days — stable libraries; iOS push policy is the most volatile axis)
