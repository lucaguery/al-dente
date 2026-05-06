---
phase: 01-foundations-w1
plan: 08
subsystem: api
tags: [fastapi, sqlalchemy, pydantic, recipes, websocket-broadcast, ilike-search]

# Dependency graph
requires:
  - phase: 01-foundations-w1
    provides: Recipe ORM model + RecipeStatus enum (01-03 backend-scaffold)
  - phase: 01-foundations-w1
    provides: Cuisine/Mood/Protein/Season locked-vocab enums (01-01 shared-vocab)
  - phase: 01-foundations-w1
    provides: current_member auth dependency (01-04 onboarding-backend)
  - phase: 01-foundations-w1
    provides: broadcast_to_household helper + recipe.created event slot (01-05 realtime-and-ping-backend)
provides:
  - "POST /recipes (full-form, status='structured', source_capture set)"
  - "POST /recipes/quick (title-only, status='draft')"
  - "GET /recipes (?q ILIKE on title + ingredients::text per D-03; ?status filter; limit/offset)"
  - "GET /recipes/{id} (404 on cross-household — no existence leak)"
  - "PUT /recipes/{id} (patch, source_capture preserved per invariant 5)"
  - "GET /households/{id}/export.json (RECIPE-08, JSON attachment)"
  - "WS event vocabulary extended: recipe.created (POST + POST /quick), recipe.updated (PUT)"
affects: [01-09-photo-upload-backend, 01-10-recipe-library-frontend, 02-llm-capture, 03-decide]

# Tech tracking
tech-stack:
  added: []  # Re-uses fastapi/sqlalchemy/pydantic from 01-03; no new deps.
  patterns:
    - "Single response shape (RecipeResponse) for HTTP reads + WS broadcast payloads — frontend has one parser"
    - "Defense-in-depth on PUT: schema lacks invariant fields AND handler blocklist-strips them"
    - "Cross-household isolation: 404 (not 403) on detail/export to avoid existence leak (T-01-08-04)"
    - "ILIKE search via parameterized cast(JSONB, Text).ilike(:pattern) — no pg_trgm in v0.1"

key-files:
  created:
    - backend/app/schemas/recipe.py
    - backend/app/routers/recipes.py
    - backend/app/routers/exports.py
  modified:
    - backend/app/main.py

key-decisions:
  - "Locked WS event vocabulary for recipes: recipe.created on POST + POST /quick, recipe.updated on PUT. recipe.updated is a NEW event type beyond REALTIME-02's original list (created/promoted/vote.created); rationale is CLAUDE.md invariant 4 — any household-syncing mutation must broadcast. Future planners (W2 recipe.promoted, W3 vote.created) treat the four-event set as authoritative."
  - "DELETE /recipes/{id} is intentionally absent in W1 — productize-later per UI-SPEC's destructive-confirmations table."
  - "PUT may set status (e.g. draft → structured) in W1 because the user's 'I finished filling the draft' gesture is the only promotion path until W2's BackgroundTask. Documented as accepted residual T-01-08-08; revisit at W2."
  - "Status filter via Query alias='status' (not 'status_filter' on the wire) so the URL stays clean."

patterns-established:
  - "Router pattern: every read/write filters by member.household_id BEFORE returning rows. Queries on bare-id (no household scope) are forbidden — review-flag for future routers."
  - "Update pattern: model_dump(exclude_unset=True) + per-field enum coercion + blocklist for invariant fields. Reusable as cooking-log/votes update arrives in W3."
  - "Export pattern: same RecipeResponse shape, wrapped in {recipes: [...]}, attachment header. Future export.json variants (cooking-log export, vote-history export) follow the same envelope."

requirements-completed: [RECIPE-01, RECIPE-02, RECIPE-03, RECIPE-04, RECIPE-05, RECIPE-06, RECIPE-08, REALTIME-02]

# Metrics
duration: 6min
completed: 2026-05-06
---

# Phase 01-foundations-w1 Plan 08: Recipes Backend Summary

**Manual recipe library API: full-form + quick-add CRUD with cross-household isolation, ILIKE search per D-03, WS broadcasts on every mutation, and JSON export for disaster recovery.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-06T12:13:33Z
- **Completed:** 2026-05-06T12:19:32Z
- **Tasks:** 3
- **Files modified:** 4 (3 created, 1 edited)

## Accomplishments

- Seven endpoints live: POST /recipes, POST /recipes/quick, GET /recipes (search + status filter + pagination), GET /recipes/{id}, PUT /recipes/{id}, GET /households/{id}/export.json — plus the existing healthz/auth/ping/ws.
- WS event vocabulary extended with `recipe.created` and `recipe.updated`. Frame shape (`{type, payload}`) and payload (RecipeResponse JSON) are byte-identical to HTTP responses, so 01-10 has a single parser.
- CLAUDE.md invariants 4 and 5 enforced in code: every mutation broadcasts via `broadcast_to_household`; `source_capture` set at create time and never overwritten by PUT (defense-in-depth via both Pydantic schema absence and handler blocklist).
- Cross-household isolation verified live: a member of household B cannot list, read, edit, or export household A's recipes. Detail endpoint returns 404 (not 403) to prevent existence leaks (T-01-08-04).

## Task Commits

Each task was committed atomically:

1. **Task 1: Recipe Pydantic schemas with locked-vocab validation** — `f842870` (feat)
2. **Task 2: recipes router (POST full + quick, GET list with ILIKE/status filter, GET by id, PUT) with realtime broadcasts and household isolation** — `ed2120b` (feat)
3. **Task 3: exports.py (RECIPE-08 JSON export) + main.py mounts + end-to-end smoke test** — `8fb7600` (feat)

**Plan metadata:** _Pending_ (orchestrator commits SUMMARY at wave-end)

## Files Created/Modified

- `backend/app/schemas/recipe.py` (created, 150 lines) — `IngredientItem`, `RecipeFullCreate`, `RecipeQuickCreate`, `RecipeUpdate`, `RecipeResponse`. Wire-format vocabulary validated via `app.models.enums`. `RecipeUpdate` deliberately has no `source_capture` field (invariant 5).
- `backend/app/routers/recipes.py` (created, 285 lines) — five endpoints. Every query filters by `member.household_id`. PUT handler blocklists `source_capture`/`photo_paths`/`cook_count`/`last_cooked_at`/identity columns even if seen in input. Both POST handlers and PUT broadcast via `broadcast_to_household`.
- `backend/app/routers/exports.py` (created, 60 lines) — `GET /households/{id}/export.json`. Path-param vs bearer mismatch returns 404 (T-01-08-06). Uses the same `RecipeResponse` shape as the API for the embedded recipes array.
- `backend/app/main.py` (modified, +2 mount lines + 1 import update) — `app.include_router(recipes.router)` and `app.include_router(exports.router)`.

## Decisions Made

- **`recipe.updated` event type added.** REALTIME-02 originally named `recipe.created` / `recipe.promoted` / `vote.created`. Without `recipe.updated`, an edit on Phone A would silently desync Phone B's cached row until next refresh. This is a SUPERSET of REALTIME-02, not a substitution. The locked v0.1 event vocabulary is now: `recipe.created` (W1), `recipe.updated` (W1, this plan), `recipe.promoted` (W2 BackgroundTask), `vote.created` (W3). The W1-only `ping.created` event will be deleted in plan 01-12.
- **No DELETE endpoint in W1.** UI-SPEC's destructive-confirmations table marks "Supprimer cette recette" as a v0.2 affordance; adding it without the matching UI surface would be scope creep.
- **PUT may set `status`.** In W1 there is no LLM promotion pipeline, so the user's "I finished filling the quick-added draft" gesture is the only promotion path. Accepted residual T-01-08-08; W2's BackgroundTask path will gate this server-side.
- **Status filter exposed as query param `status` (alias).** The handler arg is `status_filter` to avoid colliding with the imported `status` module from FastAPI; the wire format stays clean.

## Deviations from Plan

None — plan executed exactly as written. The plan author front-loaded `_UPDATE_FORBIDDEN_FIELDS` design and `recipe.updated` rationale; smoke transcript came together first try.

## Issues Encountered

- **Worktree missing `backend/.env`.** Fresh worktree had no `.env`; copied from main repo's `backend/.env` to run the live smoke test against dev Supabase, then deleted before commit so secrets do not land in git. Smoke data (2 households + 2 recipes) was cleaned via raw SQL after the run.

## Smoke-test Transcript

Live against dev Supabase on `http://localhost:8108`. **All 17 assertions passed** (14 from the plan + 3 bonus):

| # | Step | Result |
|---|------|--------|
| 1 | `GET /recipes` without auth → 401 | OK |
| 2 | `POST /recipes/quick {title}` → status="draft", source_capture.type="manual" | OK |
| 3 | `POST /recipes` (full) → status="structured", cuisine="italian" | OK |
| 4 | `GET /recipes` returns 2 rows | OK |
| 5 | `GET /recipes?status=draft` returns 1 row | OK |
| 6 | `GET /recipes?q=oeuf` (ingredient ILIKE) → Carbonara | OK |
| 7 | `GET /recipes?q=Past` (title ILIKE) → Pasta vite faite | OK |
| 8 | `GET /recipes/{id}` returns full shape | OK |
| 9 | `GET /recipes/{unknown-uuid}` → 404 | OK |
| 10 | `PUT /recipes/{id} {title, servings}` — source_capture.payload.title still "Carbonara" (preserved) | OK |
| 11 | Cross-household isolation — list empty, detail 404 for other household's recipe | OK |
| 12 | `GET /households/{id}/export.json` — Content-Disposition: attachment; body has 2 recipes | OK |
| 13 | Cross-household export → 404 | OK |
| 14 | `PUT {source_capture: HACKED, title}` — source_capture.payload.title still original | OK |
| 15 | bonus: `POST /recipes {cuisine: "klingon"}` → 422 | OK |
| 16 | bonus: `GET /recipes?status=archived` → 422 | OK |
| 17 | bonus: `PUT {status: "structured"}` on draft → status promoted | OK |

## Locked WS Event Vocabulary (post-this-plan)

| Event type        | Emitted from                                | Plan    | Status             |
|-------------------|---------------------------------------------|---------|--------------------|
| `ping.created`    | `routers/pings.py POST /pings`              | 01-05   | W1-only, deleted in 01-12 |
| `recipe.created`  | `routers/recipes.py POST /recipes` + `/quick` | 01-08   | live               |
| `recipe.updated`  | `routers/recipes.py PUT /recipes/{id}`      | 01-08   | live (NEW vs REALTIME-02) |
| `recipe.promoted` | `services/llm.py` BackgroundTask            | W2      | reserved           |
| `vote.created`    | `routers/votes.py POST /votes`              | W3      | reserved           |

The frontend WS client (plan 01-07) already parses `{type, payload}` frames generically; plan 01-10 (recipe library frontend) subscribes to BOTH `recipe.created` and `recipe.updated` to keep its cached recipe list fresh.

## Threat Register Coverage

All `high`-severity threats from the plan's `<threat_model>` are mitigated and verified live:

- **T-01-08-01** (cross-household read/edit) — every query filters `Recipe.household_id == member.household_id`; smoke 11 verifies.
- **T-01-08-02** (source_capture overwrite via PUT) — `RecipeUpdate` schema has no field; handler blocklist; smoke 14 verifies.
- **T-01-08-06** (cross-household export) — path-param check + query filter; smoke 13 verifies.
- **T-01-08-09** (cook_count/last_cooked_at tampering) — `RecipeUpdate` has no fields; handler blocklist.

`medium`/`low` threats also addressed: enum validation (smoke 15), 404 vs 403 (smoke 9 vs 11), parameterized ILIKE (smoke 6/7), `limit ≤ 200` cap.

## Threat Flags

None — this plan introduced no new trust boundaries beyond those declared in the `<threat_model>`. The export endpoint added a new path under `/households/{id}/...`, but it is gated by the same `current_member` dependency and household-id check as the rest of the API.

## User Setup Required

None — no external service configuration needed. The endpoints reuse existing Supabase Postgres connection, existing CORS allowlist, and existing auth (Bearer header / aldente_auth cookie).

## Next Phase Readiness

- **01-09 (photo upload backend)** can land in parallel: it adds `POST /recipes/{id}/photos` to `app/routers/photos.py` (or extends recipes.py — to be decided in that plan), reads photo paths off the existing `Recipe.photo_paths` ARRAY column, and broadcasts `recipe.updated` (already in our vocab) when paths change.
- **01-10 (recipe library frontend)** has a stable contract:
  - HTTP: 7 endpoints, all returning the `RecipeResponse` JSON shape.
  - WS: `recipe.created` + `recipe.updated` events, payload is identical `RecipeResponse` JSON.
  - Drafts inbox count: `GET /recipes?status=draft` is the source of truth for the bottom-nav `À compléter (N)` badge (RECIPE-06).
- **W2 capture pipeline**: when LLM promotion lands, the BackgroundTask flips `recipes.status` from `draft` to `structured` and emits `recipe.promoted` (NOT `recipe.updated`) so the frontend can distinguish auto-promotion from user-edit. Source_capture remains untouched (invariant 5).

## Self-Check: PASSED

- `backend/app/schemas/recipe.py` — FOUND
- `backend/app/routers/recipes.py` — FOUND
- `backend/app/routers/exports.py` — FOUND
- `backend/app/main.py` (recipes + exports mounted) — VERIFIED via `grep`
- Commits `f842870`, `ed2120b`, `8fb7600` — present in `git log`
- Live smoke transcript (17/17) — captured above; smoke data cleaned

---
*Phase: 01-foundations-w1*
*Plan: 08 — recipes-backend*
*Completed: 2026-05-06*
