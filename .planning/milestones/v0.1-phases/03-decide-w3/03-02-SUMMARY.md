---
phase: 03
plan: 02
subsystem: backend
tags: [backend, routers, scheduler, websocket, voting, shortlist, cooking, w3]
requires:
  - 03-01 (compute_vote_state, ShortlistContext, ShortlistFilters, score_recipe, select_top_n_with_cold_start, PushSubscription model, Household.timezone column)
  - apscheduler>=3.11
  - pywebpush>=2.3 (used in Plan 05; signature locked here via stub)
provides:
  - "GET /shortlists/today"
  - "POST /shortlists/regenerate"
  - "POST /shortlists/{shortlist_id}/delegate"
  - "POST /shortlists/{shortlist_id}/recipes/{recipe_id}/vote"
  - "POST /recipes/{recipe_id}/cook"
  - "GET /cooking-logs/active"
  - "services.shortlist.generate_daily_shortlist (cron + regenerate callable)"
  - "services.push.send_push_to_household (stub; Plan 05 wires real fan-out)"
  - "AsyncIOScheduler with one CronTrigger(hour=16) per household at startup"
  - "WebSocket events: vote.created, shortlist.created, cooking.started"
affects:
  - backend/app/main.py (lifespan + scheduler + 3 router includes)
  - backend/app/services/realtime.py (docstring only — adds 3 new event types)
  - backend/app/routers/__init__.py (re-exports for new routers)
  - backend/app/schemas/__init__.py (re-exports for new schemas)
tech-stack:
  added:
    - "AsyncIOScheduler module-level singleton, started in FastAPI lifespan"
    - "CronTrigger + zoneinfo.ZoneInfo (NOT pytz — Pitfall 2)"
    - "pg_insert(...).on_conflict_do_update(...) for vote upsert"
    - "func.coalesce(func.max(generation), 0) + 1 for regenerate generation increment"
  patterns:
    - "Cookie-first auth on every endpoint via Depends(current_member)"
    - "Cross-household entity → 404 (existence-leak prevention, T-01-08-04)"
    - "Vote state computed (not stored) — services/voting.compute_vote_state"
    - "Server-side broadcast on every mutation (vote.created / cooking.started / shortlist.created)"
    - "Empty-corpus guard returns None → caller decides 404 vs silent skip (Pitfall 8)"
key-files:
  created:
    - backend/app/services/shortlist.py
    - backend/app/services/push.py
    - backend/app/schemas/shortlist.py
    - backend/app/schemas/vote.py
    - backend/app/schemas/cooking_log.py
    - backend/app/routers/shortlist.py
    - backend/app/routers/votes.py
    - backend/app/routers/cooking_logs.py
  modified:
    - backend/app/main.py
    - backend/app/services/realtime.py
    - backend/app/routers/__init__.py
    - backend/app/schemas/__init__.py
decisions:
  - "Stubbed services/push.send_push_to_household so generate_daily_shortlist can call it unconditionally; Plan 05 replaces the body without touching call sites"
  - "Delegation fans out 5 individual vote.created broadcasts (Pattern 6) so the existing frontend handler stays uniform"
  - "Veto window NOT enforced via vote rejection (Pitfall 4) — the endpoint always succeeds; UI affordance is the gate"
  - "POST cooking_logs returns 409 on a same-day unfinalized session (Pattern 7); rating IS NULL is the proxy for unfinalized (A5)"
  - "Lifespan tolerates bad timezone column with Europe/Paris fallback + warn-log (does NOT fail startup)"
metrics:
  duration_seconds: 343
  tasks_completed: 2
  files_created: 8
  files_modified: 4
  completed_date: "2026-05-07"
---

# Phase 3 Plan 2: Phase 3 Backend (Shortlist + Votes + Cooking Logs) Summary

**One-liner:** FastAPI routers + APScheduler lifespan that turn the Plan 01 algorithm/voting primitives into the asymmetric voting state machine over WebSocket — six new HTTP endpoints, three new realtime events, and a 16:00-household-tz cron that persists a daily shortlist and broadcasts `shortlist.created`.

## Route Table

| Method | Path                                                              | Auth                       | Body                                            | 2xx                              | Error                                                                                  | Broadcast              |
| ------ | ----------------------------------------------------------------- | -------------------------- | ----------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------- | ---------------------- |
| GET    | `/shortlists/today`                                               | `Depends(current_member)`  | —                                               | `200 ShortlistResponse \| null`  | 401 missing/invalid token                                                              | —                      |
| POST   | `/shortlists/regenerate`                                          | `Depends(current_member)`  | `RegenerateRequest` (cuisine/max_prep/etc)      | `200 ShortlistResponse`          | 401; 404 empty corpus or no matches                                                    | `shortlist.created`    |
| POST   | `/shortlists/{shortlist_id}/delegate`                             | `Depends(current_member)`  | —                                               | `200 ShortlistResponse`          | 401; 404 cross-household                                                               | `vote.created` x5      |
| POST   | `/shortlists/{shortlist_id}/recipes/{recipe_id}/vote`             | `Depends(current_member)`  | `{ vote: "yes" \| "no" }`                       | `201 VoteResponse`               | 401; 404 cross-household; 400 recipe not in shortlist                                  | `vote.created`         |
| POST   | `/recipes/{recipe_id}/cook`                                       | `Depends(current_member)`  | —                                               | `201 CookingLogResponse`         | 401; 404 cross-household; 409 active session today                                     | `cooking.started`      |
| GET    | `/cooking-logs/active`                                            | `Depends(current_member)`  | —                                               | `200 CookingLogResponse \| null` | 401                                                                                    | —                      |

All endpoints use cookie-first auth (HttpOnly `aldente_auth`). Cross-household entities return 404 (not 403) to prevent existence leak — T-01-08-04 mitigation pattern from Plan 01-08.

## Lifespan Wiring (`backend/app/main.py`)

- Module-level `scheduler = AsyncIOScheduler()` (single-process; v0.1 acceptable per CONTEXT.md "no external pub/sub").
- `lifespan(app)` starts the scheduler, iterates `select(Household)`, and registers one job per household:
  - `CronTrigger(hour=16, minute=0, timezone=ZoneInfo(hh.timezone or "Europe/Paris"))`
  - `id=f"shortlist_{hh.id}"`, `replace_existing=True`, `misfire_grace_time=3600` (Railway free-tier restart resilience).
  - Bad timezone column → log warning, fall back to `Europe/Paris`, do NOT crash startup.
  - Bootstrap exceptions are caught and logged so a single bad household can't take down the API.
- `scheduler.shutdown(wait=False)` on yield exit.

**Pitfall 1 (Single Worker):** documented in module docstring — `--workers > 1` would create N duplicate jobs. Railway runs one worker; production must NOT change this without first migrating to an external scheduler.

**Pitfall 2 (zoneinfo):** verified via `grep -cE 'pytz' app/main.py app/services/shortlist.py` → 0. Uses `from zoneinfo import ZoneInfo`.

## Vote Upsert Pattern (`backend/app/routers/votes.py`)

```python
stmt = (
    pg_insert(Vote)
    .values(shortlist_id=..., recipe_id=..., member_id=member.id, vote=body.vote)
    .on_conflict_do_update(
        index_elements=["shortlist_id", "recipe_id", "member_id"],
        set_={"vote": body.vote, "created_at": func.now()},
    )
)
db.execute(stmt); db.commit()
```

UNIQUE constraint `(shortlist_id, recipe_id, member_id)` was added by Plan 01's migration 0004. The upsert flips a previous `no` to `yes` (or vice versa) atomically — no read/check/write race. After commit, all votes for the (shortlist, recipe) pair are recomputed via `compute_vote_state(votes, member_count)` and the `vote.created` broadcast carries the resulting state enum.

`member_id` is **never** accepted from the request body — `VoteRequest` schema only declares `vote: Literal["yes","no"]`, T-03-02-04 mitigation. Pydantic v2's default `extra="ignore"` silently drops any client-sent `member_id`.

## Delegation Fan-Out (`POST /shortlists/{id}/delegate`)

Per Pattern 6 from 03-RESEARCH.md, the "Tu décides" handler:
1. Bulk inserts 5 rows via `pg_insert(Vote).values(rows).on_conflict_do_update(...)` — flips any existing `no` votes from this member to `yes`.
2. Iterates the 5 recipe IDs and broadcasts one `vote.created` per recipe with the freshly-computed state.
3. Returns the serialized `ShortlistResponse` (including all updated votes).

Frontend's existing `vote.created` handler stays uniform — no special "delegation" event type to handle.

## Cooking Log (`POST /recipes/{id}/cook`)

- Validates recipe ownership (404 cross-household).
- 409 if a same-day unfinalized session exists for the household (`func.date(cooked_at) == today AND rating IS NULL`).
- Inserts `CookingLog(cooked_at=datetime.now(timezone.utc))` — immutable per SPEC.md.
- Broadcasts `cooking.started` with `{ log_id, recipe_id, cooked_by_member_id }`.
- Phase 4 will add the finalization PUT (photos/rating/notes) and the same-tx denormalized update of `recipes.last_cooked_at + cook_count` (architecture invariant #3).

## Realtime Event Vocabulary (post 03-02)

| Event                  | Source                          | Payload                                                                  |
| ---------------------- | ------------------------------- | ------------------------------------------------------------------------ |
| `recipe.created`       | routers/recipes.py (W1)         | RecipeResponse                                                           |
| `recipe.promoted`      | services/llm.py BackgroundTask  | RecipeResponse (status flips draft→structured)                           |
| `recipe.updated`       | routers/recipes.py PUT          | RecipeResponse                                                           |
| `vote.created`         | routers/votes.py + delegation   | `{ shortlist_id, recipe_id, member_id, vote, state }`                    |
| `shortlist.created`    | services/shortlist.py           | `{ shortlist_id, date, generation }`                                     |
| `cooking.started`      | routers/cooking_logs.py         | `{ log_id, recipe_id, cooked_by_member_id }`                             |

`backend/app/services/realtime.py` module docstring updated to enumerate all 6 event types.

## Empty-Corpus Behavior (Pitfall 8)

`generate_daily_shortlist` returns `None` (not an empty row) in two cases:
1. Zero structured/verified recipes for the household.
2. Filters reject all recipes.

Cron path: silently skips — log INFO line, no DB row, no broadcast, no push.
Regenerate path: caller (router) translates `None` → `HTTPException(404, "empty corpus or no recipes match filters")` so the frontend can show a toast.

## Push Stub (`backend/app/services/push.py`)

`send_push_to_household(household_id, payload, db)` is a no-op INFO-log stub. Signature locked. Plan 05 replaces the body with the pywebpush + VAPID fan-out + 410/404 subscription cleanup loop from 03-RESEARCH.md Pattern 9. No call sites need to change.

## Threat Model Mitigations Applied

| Threat ID   | Mitigation in code                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| T-03-02-01  | `VoteRequest` schema: `vote: Literal["yes","no"]` only — `member_id` never accepted                          |
| T-03-02-02  | Idempotent upsert via ON CONFLICT DO UPDATE — replays are no-ops                                            |
| T-03-02-03  | All endpoints check `entity.household_id == member.household_id` and return 404 (existence leak guard)      |
| T-03-02-06  | Scheduler is in-process; no HTTP entrypoint; manual regenerate goes through authenticated POST              |
| T-03-02-09  | Pitfall 1 documented in main.py module docstring (single-worker requirement)                                |
| T-03-02-10  | Pitfall 4 — votes are NEVER rejected on backend; UI banner closes the affordance                            |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

```
$ uv run python -c "from app.main import app, scheduler; ..."
lifespan wired: True
scheduler: AsyncIOScheduler

$ uv run python -c "...assert routes ..."
routes OK     # all 6 Phase 3 routes mounted

$ uv run python -c "from app.services.shortlist import generate_daily_shortlist; ..."
async OK

$ grep -E "vote\.created|shortlist\.created|cooking\.started" backend/app/services/realtime.py | wc -l
3            # 3 new event types in docstring

$ grep -cE 'pytz' backend/app/main.py backend/app/services/shortlist.py
0            # Pitfall 2: uses zoneinfo, NOT pytz
```

## Self-Check: PASSED

- All created files exist and are committed.
- All modified files committed.
- Both task commits present: f05e4ee (Task 1: services + lifespan + realtime docstring), 2652695 (Task 2: schemas + routers).
- All 6 Phase 3 endpoints mount cleanly on app boot.
- `generate_daily_shortlist` is async (verified with `inspect.iscoroutinefunction`).
- Lifespan wired with AsyncIOScheduler; no pytz imports anywhere.
- `realtime.py` docstring enumerates all 6 v0.1 event types.
