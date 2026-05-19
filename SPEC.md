---
status: historical
last_verified: 2026-05-19
superseded_by: docs/adr/0002-httponly-cookie-auth.md
audience: developer
---

# Al Dente — MVP Spec v0.1 (PWA + Python)

A shared recipe + decision app for couples, built as a Progressive Web App with a Python backend. Same product as the deck, different infrastructure — chosen for skill-fit (Python AI engineer) and zero-cost distribution.

Output of `/grill-me` session on 2026-05-05, with stack pivot 2026-05-05.

> **Doc status — historical, with two superseded sections.** This is the v0.1 scoping artifact. The architecture invariants and data model below remain accurate; the auth section (§ Onboarding, L309+) is superseded by [ADR-0002](docs/adr/0002-httponly-cookie-auth.md) and the build plan (§ Build plan, L389+) is historical. Live state lives in `.planning/STATE.md` and current milestones in `.planning/MILESTONES.md`.

---

## North Star

> Eliminate the daily "on mange quoi ?" debate via a shared library + async voting + voice/photo capture, deployable as an installable PWA on both iPhones with no App Store, no $99/year, no native build.

**Audience:** just us (Luca + partner), built clean enough to productize later as a real product (with native iOS app wrapper if/when warranted).

**Definition of v0.1 done:** both members use the app daily for ≥ 2 weeks at end of W4. Behavioral test, not feature checklist.

**Explicitly cut from the deck:** iOS share extension (PWAs cannot register as iOS share targets). Replaced by an in-app "Paste URL" field — 2 extra taps vs the deck's "one-click share."

---

## Stack

### Frontend (PWA)
- **Next.js 16.2.4** (App Router, React Server Components) — note: this is post-15 with breaking changes; consult `node_modules/next/dist/docs/` rather than relying on training data
- **React 19.2.4**
- **TypeScript 5**
- **Tailwind CSS v4** (via `@tailwindcss/postcss`; no `tailwind.config.ts` by default) + **shadcn/ui** (paste-in components, no opaque library)
- **`next-pwa`** plugin for service worker + manifest (~5 lines of config)
- **`framer-motion`** for swipe-deck voting UX
- **Web Speech API** for voice capture (on-device transcription, French supported)
- **`<input type="file" capture="environment">`** for camera capture

### Backend (Python)
- **FastAPI** + **Pydantic** for typed request/response
- **SQLAlchemy 2.0** + **Alembic** for ORM + migrations
- **`google-generativeai`** Python SDK for Gemini 2.5 Flash
- **`apscheduler`** for daily shortlist generation cron job
- **WebSockets** via FastAPI native support, OR Supabase Realtime subscriptions

### Infrastructure
- **Supabase** — Postgres database + file storage + (optionally) Realtime
- **Vercel** — frontend hosting (free tier, auto-deploy from GitHub)
- **Railway** (or Fly.io / Render) — backend hosting (~$5/mo or free credit)
- **GitHub** — single monorepo with `frontend/` and `backend/` folders

### Distribution
- Both phones: open URL in Safari → Share → "Add to Home Screen" → installed.
- Updates: `git push` → auto-deploy → next page load gets new version.
- **No App Store, no TestFlight, no Apple Developer Program ($0/year).**

### Localization
- French only in v0.1
- All strings via `next-intl` from day 1 (productize-clean tax)

---

## Data model (Postgres)

```sql
-- Households + Members
CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE,                  -- regenerable 6-char code
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color_hex TEXT NOT NULL,                  -- for vote attribution + log "who cooked"
    auth_token TEXT NOT NULL UNIQUE,          -- JWT or opaque session token
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recipes (the canonical entity)
CREATE TYPE recipe_status AS ENUM ('draft', 'structured', 'verified');

CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    created_by_member_id UUID NOT NULL REFERENCES members(id),
    status recipe_status NOT NULL DEFAULT 'draft',
    title TEXT NOT NULL,
    source_capture JSONB NOT NULL,            -- { type: 'voice'|'photo'|'url'|'manual', payload: ... }
    photo_paths TEXT[] DEFAULT '{}',          -- Supabase storage paths, ≤ 4
    ingredients JSONB,                        -- [{ name, quantity, unit }, ...]
    steps JSONB,                              -- ordered list of strings
    prep_time_minutes INTEGER,
    servings INTEGER,
    cuisine TEXT CHECK (cuisine IS NULL OR cuisine IN
        ('italian','french','asian','mediterranean','middleEastern',
         'indian','mexican','northAfrican','american','other')),
    mood TEXT[] DEFAULT '{}',                 -- subset of mood enum
    main_protein TEXT CHECK (main_protein IS NULL OR main_protein IN
        ('poultry','redMeat','fish','seafood','egg','legume','none')),
    seasonality TEXT[] DEFAULT '{spring,summer,autumn,winter}',
    tags TEXT[] DEFAULT '{}',
    last_cooked_at TIMESTAMPTZ,               -- denormalized
    cook_count INTEGER NOT NULL DEFAULT 0,    -- denormalized
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipes_household_status ON recipes(household_id, status);
CREATE INDEX idx_recipes_last_cooked ON recipes(household_id, last_cooked_at DESC NULLS LAST);

-- Cooking logs (append-only)
CREATE TYPE log_rating AS ENUM ('loved', 'liked', 'disliked');

CREATE TABLE cooking_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    cooked_by_member_id UUID NOT NULL REFERENCES members(id),
    cooked_at TIMESTAMPTZ NOT NULL,           -- start time, immutable
    photo_paths TEXT[] DEFAULT '{}',          -- ≤ 4
    rating log_rating,
    notes TEXT
);

CREATE INDEX idx_logs_household_time ON cooking_logs(household_id, cooked_at DESC);
CREATE INDEX idx_logs_recipe ON cooking_logs(recipe_id);

-- Shortlists + votes
CREATE TABLE daily_shortlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    generation INTEGER NOT NULL DEFAULT 1,
    recipe_ids UUID[] NOT NULL,               -- ranked, ≤ 5
    filters JSONB,                            -- nil unless user customized regenerate
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (household_id, date, generation)
);

CREATE TYPE vote_value AS ENUM ('yes', 'no');

CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shortlist_id UUID NOT NULL REFERENCES daily_shortlists(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id),
    member_id UUID NOT NULL REFERENCES members(id),
    vote vote_value NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_votes_shortlist ON votes(shortlist_id);
```

### Locked vocabularies (Pydantic / TypeScript enums)

```python
class Season(str, Enum):
    spring = "spring"; summer = "summer"; autumn = "autumn"; winter = "winter"

class Cuisine(str, Enum):
    italian = "italian"; french = "french"; asian = "asian"
    mediterranean = "mediterranean"; middle_eastern = "middleEastern"
    indian = "indian"; mexican = "mexican"; north_african = "northAfrican"
    american = "american"; other = "other"

class Mood(str, Enum):
    comfort = "comfort"; light = "light"; quick = "quick"
    celebratory = "celebratory"; adventurous = "adventurous"

class Protein(str, Enum):
    poultry = "poultry"; red_meat = "redMeat"; fish = "fish"
    seafood = "seafood"; egg = "egg"; legume = "legume"; none = "none"
```

---

## Capture pipeline

Five surfaces, all hit `POST /recipes/<surface>` and return a `draft` recipe immediately. Background promotion happens server-side.

| Surface | Endpoint | Save state | Promotion |
|---|---|---|---|
| Quick manual (title + optional photo) | `POST /recipes/quick` | `draft` | background Gemini (sparse) |
| Full manual (form filled) | `POST /recipes` (full payload) | `structured` | none — human did it |
| Voice (transcript from Web Speech API) | `POST /recipes/voice` | `draft` | background Gemini |
| Photo (multipart, ≤ 4 images) | `POST /recipes/photo` | `draft` | background Gemini multimodal |
| Paste URL (replaces iOS share extension) | `POST /recipes/url` | `draft` | none |

**Promotion model:** the backend kicks off a `BackgroundTask` (FastAPI's built-in) after creating the draft. Single source of truth — no device-vs-device race. WebSocket broadcast to all connected clients in the household when status flips to `structured`.

```python
@router.post("/recipes/voice")
async def voice_capture(
    transcript: str,
    background_tasks: BackgroundTasks,
    member: Member = Depends(current_member),
):
    recipe = create_draft(member, source=VoiceSource(transcript=transcript))
    background_tasks.add_task(promote_recipe, recipe.id, transcript)
    await broadcast_to_household(member.household_id, "recipe.created", recipe)
    return recipe
```

**Drafts inbox:** `GET /recipes?status=draft`. Top-level tab in PWA: "À compléter (N)".

**Voice modification (option A):** `POST /recipes/{id}/voice-modify` with the new transcript. Backend calls Gemini with the original recipe + voice instruction, returns the modified recipe. Frontend opens the edit form pre-filled with new values; user reviews + saves.

**Voice notes on cooking log (option C):** dictation icon on the log finalization screen uses Web Speech API directly into the `notes` text field. No backend special-casing.

---

## Algorithm (Python service)

`services/algorithm.py` — pure function over a recipe list and context:

```python
def score_recipe(
    recipe: Recipe,
    context: ShortlistContext,
) -> float | None:
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
        score += 1.0  # seasonalityMatch

    days = recipe.days_since_cooked()  # None → 999
    score += 1.5 * min(days / 14.0, 1.0)  # recencyScore

    if context.filters and context.filters.required_moods:
        overlap = len(set(recipe.mood) & set(context.filters.required_moods))
        score += 0.8 * (overlap / len(context.filters.required_moods))

    if recipe.cuisine in context.recent_cuisines:
        score -= 0.5
    if recipe.main_protein in context.recent_proteins:
        score -= 0.5

    score += random.uniform(0, 0.2)  # jitter
    return score


def select_top5_with_diversity(ranked: list[tuple[Recipe, float]]) -> list[Recipe]:
    picks, used_cuisines, used_proteins = [], set(), set()
    # Pass 1: highest-score that adds diversity
    for recipe, _ in ranked:
        if len(picks) >= 5: break
        c, p = recipe.cuisine or "other", recipe.main_protein or "none"
        if c not in used_cuisines and p not in used_proteins:
            picks.append(recipe); used_cuisines.add(c); used_proteins.add(p)
    # Pass 2: top up
    for recipe, _ in ranked:
        if len(picks) >= 5: break
        if recipe not in picks:
            picks.append(recipe)
    return picks
```

**Cold-start (corpus-size-aware):**
- `< 10` recipes: skip diversification, light recency, return what exists; UI shows banner "Ajoute plus de recettes pour de meilleures suggestions"
- `10–29`: soft diversification (only as tie-breaker)
- `30+`: full diversification

**Daily generation:** APScheduler cron at configurable time (default 16:00 household tz) creates `DailyShortlist`. Manual regenerate via `POST /shortlists/regenerate` with optional filters.

---

## Voting (asymmetric, no hard deadline)

State machine computed from votes that exist for `(shortlist_id, recipe_id)`:

| State | Condition | UI |
|---|---|---|
| 🟢 Validé | both members `yes` | Top of screen; CTA "Je commence à cuisiner" |
| 🟡 Pressenti | one `yes`, partner not voted | Cookable as-is; absent partner's name shown |
| 🔴 Contesté | one `yes`, one `no` | Visible; surfaces conflict |
| ⚫ Rejeté | both `no` | Hidden in main view |
| ⬜ Sans avis | neither voted | Normal shortlist card |

**Veto window closes** when first `CookingLog` created for the day. After that, partner can append `.no` votes (signal for v0.2 weighting) but cannot un-cook.

**"Tu décides" button:** `POST /shortlists/{id}/delegate` appends 5 yes votes for the requesting member. Any partner yes becomes Validé.

**Realtime updates:** when a vote is cast, broadcast `vote.created` event over WebSocket to all clients in the household. Both phones see the state machine update within ~200ms.

---

## Cooking log

- Created at "Je commence à cuisiner" tap → `POST /recipes/{id}/cook`. `cooked_at = now()`, immutable.
- "En train de cuisiner" banner on home until finalized (or skipped).
- Finalization (anytime, optional): `PUT /cooking-logs/{id}` with photo paths, rating, notes. Includes 🎙️ voice dictation into notes.
- Backend updates denormalized `recipes.last_cooked_at = max(...)` and `recipes.cook_count += 1` in the same transaction.

**Shared Album:** `GET /album?limit=50` returns all `cooking_logs` with photos, ordered by date. PWA renders as masonry grid.

---

## Onboarding (3 screens, one-time)

> **Superseded by [ADR-0002](docs/adr/0002-httponly-cookie-auth.md) (HttpOnly cookie auth).** This section reflects the original v0.1 invite-code Bearer-token scheme. The production scheme is HttpOnly cookie via Next.js same-origin rewrites — see invariant 8 in `CLAUDE.md`. The invite-code flow itself (Create / Join via 6-char code) is unchanged; only the token storage + transmission mechanism is different.

**Approach: invite-code, not OAuth.** Simpler than Supabase Auth for v0.1, generalizes to magic-link OAuth in productize-later (the `auth_token` column abstracts the source).

```
Screen 1 — Welcome
   "Al Dente"
   [Créer un foyer]   [Rejoindre un foyer]

Screen 2A — Create
   Foyer name + your name + your color (5 swatches, one shown disabled when joining)
   → POST /households
   → Server returns { household_id, member_id, auth_token, invite_code }
   → Frontend stores auth_token in localStorage
   → Show share sheet: "Invite ta partenaire avec le code: ABC123"

Screen 2B — Join
   Enter invite code + your name + your color
   → POST /households/join
   → Same response shape; auth_token stored
```

`auth_token` is a long random opaque string stored on the member row. Each request sends `Authorization: Bearer <token>`. No password, no email verification, no OAuth dance. Productize-later: replace with Supabase Auth + magic links; the `auth_token` column accepts any auth source.

---

## Project structure

```
al-dente/
├── frontend/                       # Next.js PWA → Vercel
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # home: shortlist + recent + drafts count
│   │   ├── recipes/
│   │   │   ├── page.tsx             # list with search + filter
│   │   │   ├── [id]/page.tsx        # detail + edit
│   │   │   ├── new/page.tsx         # quick + full manual
│   │   ├── capture/{voice,photo,url}/page.tsx
│   │   ├── inbox/page.tsx           # drafts to tidy
│   │   ├── shortlist/page.tsx       # today's voting + state
│   │   ├── album/page.tsx           # cooking log photos
│   │   ├── onboarding/page.tsx      # welcome + create/join
│   │   └── api/                     # Next.js API routes (proxy to FastAPI if needed)
│   ├── components/ui/               # shadcn components
│   ├── lib/
│   │   ├── api.ts                   # fetch wrapper with auth_token
│   │   ├── ws.ts                    # WebSocket client
│   │   ├── enums.ts                 # mirrors Python enums
│   │   └── i18n/fr.json
│   ├── public/
│   │   ├── manifest.json            # PWA manifest
│   │   └── icons/{192,512}.png
│   ├── next.config.ts               # next-pwa config
│   └── package.json
│
├── backend/                        # FastAPI → Railway
│   ├── app/
│   │   ├── main.py                  # FastAPI() + middleware + WS
│   │   ├── routers/{households,recipes,cooking,shortlist,ws}.py
│   │   ├── services/
│   │   │   ├── llm.py               # Gemini calls (extract, modify)
│   │   │   ├── algorithm.py         # scoring + diversification
│   │   │   ├── shortlist.py         # daily generation + APScheduler job
│   │   │   └── realtime.py          # WS broadcast helper
│   │   ├── models/                  # SQLAlchemy
│   │   ├── schemas/                 # Pydantic
│   │   ├── auth.py                  # bearer token middleware
│   │   └── db.py                    # SQLAlchemy engine + session
│   ├── alembic/                     # migrations
│   ├── tests/
│   ├── pyproject.toml
│   └── Dockerfile
│
├── SPEC.md                         # this file
└── README.md
```

---

## Build plan

> **Historical.** This four-wave plan is the v0.1 scoping artifact. It shipped in 7 days (2026-05-05 → 2026-05-08), not the projected 23–30 weekends. Subsequent milestones (v0.2 through v0.7.1) live in `.planning/MILESTONES.md`; current state in `.planning/STATE.md`.

| Wave | Effort | Scope | Dogfood gate |
|---|---|---|---|
| **W1 Foundations** | ~70h, 7-9 weekends | Repo + Vercel + Railway + Supabase wiring; Postgres schema + Alembic; bearer-token auth; household onboarding (create + join via code); manual entry (full + quick); recipe list + detail + search; empty drafts inbox; WebSocket realtime sync; PWA install works; JSON export | 2 weeks of solo manual use. Stop here if not used. |
| **W2 LLM capture** | ~70h, 7-9 weekends | LLM service (Gemini Python SDK) + structured output; voice capture (Web Speech API → backend); photo capture (multipart → Gemini multimodal); paste-URL surface; voice modification (option A); voice notes (Web Speech into notes field); background promotion via FastAPI BackgroundTasks | 2 weeks with capture flows. Track inbox tidy-up rate. |
| **W3 Decide** | ~50h, 5-7 weekends | Algorithm scoring (Python); APScheduler daily shortlist generation; voting state machine (computed from votes table); shortlist UI with swipe deck (`framer-motion`); "Tu décides" delegation; "Je commence" → CookingLog; daily push notifications via Web Push | 2 weeks with daily shortlists. Did we stop discussing IRL? |
| **W4 Polish** | ~40h, 4-5 weekends | Cooking log finalization (photo, rating, notes); shared Album masonry grid; per-recipe history; offline mode tuning (service worker cache strategies); accessibility pass; error toasts; productize-later TODO list documented | End of v0.1: behavioral validation. |

**Total: ~230h, 23-30 weekends, 5-7 months at one weekend per week.**

### First concrete action: deploy the skeleton + ping test

Before any feature UI:

1. Create GitHub repo, scaffold `frontend/` (Next.js) and `backend/` (FastAPI minimal).
2. Wire Vercel → frontend repo. Wire Railway → backend repo. Wire Supabase Postgres.
3. Deploy a "ping" endpoint: `POST /pings` (saves a row), `GET /pings` (lists), `WS /ws` (broadcasts new pings).
4. Frontend: 2-button page — "Add ping" / "List pings", subscribed to WS.
5. Visit `al-dente.vercel.app` on **both phones** in Safari, install to home screen.
6. Tap "Add ping" on phone A → phone B's list updates within ~500ms via WebSocket.

If this works, the entire infrastructure is validated. If not, you have ~4 likely culprits (Supabase connection, CORS, WebSocket on Railway, PWA install) — each with a specific fix.

---

## Risks budgeted

- **iOS Safari PWA quirks** (e.g., aggressive cache, occasional service worker bugs) — first-week test should expose these. Fall back to no-cache-for-API if it bites.
- **Web Speech API French quality** — tested in browser before W2 starts. If unusable, fallback: send audio file to Gemini (multimodal supports audio) and skip Web Speech API.
- **Gemini French prompt fragility** (~1.5x W2 effort budgeted) — keep raw inputs (transcript / photo blob) forever in `source_capture` for re-extraction with improved prompts.
- **WebSocket reliability on Railway free tier** — Railway sometimes restarts free instances; clients need reconnect-with-backoff. Use a known WS client lib (e.g., `reconnecting-websocket`).
- **Supabase free tier limits** (500 MB DB, 1 GB storage) — couple-scale for years. Monitor at W4. Productize-later: upgrade or self-host.
- **Motivation drop at week 10-14** — W1 dogfood gate is the antidote.

---

## Productize-later TODOs

> **Scoped to v0.1.** Newer productize-later items live as `# TODO(productize)` comments in code (Python) / `// TODO(productize)` (TS) and in `.planning/PROJECT.md` §Out of Scope.

Mark inline as `# TODO(productize)`:

- Replace invite-code auth with Supabase Auth (magic link) when expanding beyond friends-and-family
- Per-member ratings (split single `rating` into `recipe_log_ratings` table)
- Owner-leaves-household disaster recovery (currently: JSON export only)
- English + additional locales (next-intl already wired, just add files)
- Custom illustrations + app icon (hire a designer)
- Real-time co-swipe voting (if user testing wants it)
- Native iOS wrapper via Capacitor or native rewrite (if PWA polish becomes a complaint)
- Partner preference modeling (when corpus is large enough)
- Time-of-day awareness (lunch vs dinner)
- Wildcard slot in shortlist for serendipity
- Permanent edit diff UI (option B from voice modification)
- Push notification provider beyond Web Push (e.g., for richer notifications)

---

## Out of scope for v0.1 (explicitly cut, not productize-later)

- iOS Share extension (impossible in PWA; replaced by Paste URL)
- Mid-cook timer / step-by-step UI
- Shopping list integration
- Native iOS / Android apps
- 5-star rating granularity (3-value enum locked)
- Avatars (color attribution only)
- Collaborative filtering / preference learning
- Real-time co-swipe voting (async voting handles real life)
- Login via OAuth providers (invite-code is enough for v0.1)
