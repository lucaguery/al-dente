---
phase: 41-navigation-surgery-first-backend-touch
plan: 01
subsystem: backend
tags: [undo, votes, realtime, invariants]
requires: [Vote, Member, DailyShortlist, CookingLog, broadcast_to_household, compute_vote_state]
provides: [DELETE /votes/{vote_id}, vote.deleted event, vote_id on VoteResponse + vote.created broadcast]
affects: [routers/votes.py, schemas/vote.py, services/realtime.py, app/main.py, tests/test_votes_contract.py, tests/test_architecture_invariants.py]
tech_stack:
  added: []
  patterns: [DELETE-with-id-route, monkeypatched-broadcast-capture, no-state-column-regression]
key_files:
  created: []
  modified:
    - backend/app/routers/votes.py
    - backend/app/schemas/vote.py
    - backend/app/services/realtime.py
    - backend/app/main.py
    - backend/tests/test_votes_contract.py
    - backend/tests/test_architecture_invariants.py
key_decisions:
  - "Second sibling router (votes_router with prefix /votes) instead of nesting under the existing /shortlists router — keeps the URL shape RESTful (`DELETE /votes/{id}`) and avoids forcing callers to remember shortlist+recipe context they no longer need at undo time"
  - "Same 404 on both 'vote does not exist' and 'vote belongs to another household' — invariant #2 record-existence non-leak (T-41-01)"
  - "Veto-window guard derives from `func.date(CookingLog.cooked_at) == shortlist.date` because the actual CookingLog model uses `cooked_at: datetime` (the plan's <interfaces> block referenced a `shortlist_date` column that does not exist; same date-based gate, just from the columns that are really there)"
  - "Hard delete (no soft-delete flag, no state column) — invariant #2 says state is COMPUTED from row existence, full stop. compute_vote_state naturally re-derives on next read"
  - "Snapshot the broadcast payload BEFORE the delete so FKs are still resolvable"
requirements_completed: [UNDO-01]
duration: ~15 min
completed: 2026-05-21
---

# Phase 41 Plan 01: DELETE /votes/{vote_id} Backend Slice Summary

Add the backend half of the deck-undo feature (UNDO-01) — a new
`DELETE /votes/{vote_id}` endpoint with a 5-test contract + 1 broadcast-shape
test, the `vote_id` field surfaced on `POST` response + `vote.created`
broadcast, and a new `vote.deleted` realtime event. Frontend plan 41-04
will consume this contract.

**Duration:** ~15 min · **Tasks:** 4/4 · **Files:** 6 modified · **Commits:** 4

| Task | Status | Commit |
|------|--------|--------|
| 1. Extend VoteResponse + cast_vote to return vote_id | green | `42c259b` |
| 2. Add DELETE /votes/{vote_id} handler + vote.deleted event | green | `a08bb89` |
| 3. 6 new DELETE tests in test_votes_contract.py | green | `4b6969b` |
| 4. No-state-column regression on votes + recipes | green | `634b02a` |

## What Was Built

### `backend/app/routers/votes.py`
- New module-level `votes_router = APIRouter(prefix="/votes", tags=["votes"])`
  registered in `app/main.py` via `app.include_router(votes.votes_router)`.
- New `delete_vote(vote_id, member, db)` handler. Returns 204 on success,
  404 on missing-or-cross-household (same status — invariant #2 record-
  existence non-leak), 409 with detail `"veto_window_closed"` when any
  `CookingLog` exists for `(member.household_id, shortlist.date)`.
- Existing `cast_vote` handler now re-queries the persisted Vote row after
  the upsert and injects `vote_id=str(vote_row.id)` into both the response
  payload and the `vote.created` broadcast payload.

### `backend/app/schemas/vote.py`
- `VoteResponse` gains a required `vote_id: UUID` field. No optional fallback
  (project CLAUDE.md MVP no-shim posture — the single existing consumer
  `frontend/lib/votes.ts` updates in lockstep in Plan 41-04).

### `backend/app/services/realtime.py`
- Docstring event enumeration now lists `vote.deleted` with the full payload
  schema `{vote_id, shortlist_id, recipe_id, member_id, shortlist_date}`.
- `vote.created` entry annotated to call out the new `vote_id` field.

### `backend/tests/test_votes_contract.py`
- Six new test functions:
  - `test_delete_vote_happy_path` — POST then DELETE; row gone; broadcast
    fired with all 5 keys.
  - `test_delete_vote_401_missing_auth` — DELETE with no auth → 401.
  - `test_delete_vote_404_cross_household` — foreign-household DELETE
    returns 404 (NOT 403); no household/member-id leak in body; the foreign
    vote still exists post-refusal.
  - `test_delete_vote_404_not_found` — random UUID → 404.
  - `test_delete_vote_409_veto_window_closed` — CookingLog for today's
    shortlist date → 409 with detail `veto_window_closed` literal; vote
    row still exists (guard fires before delete); no `vote.deleted`
    broadcast emitted.
  - `test_delete_vote_broadcast_shape` — broadcast payload key set is
    exactly `{vote_id, shortlist_id, recipe_id, member_id, shortlist_date}`;
    all values are JSON-serializable strings; `shortlist_date` is
    ISO-8601 `YYYY-MM-DD`.
- Helper `_post_vote_for_seeded_member` factors out the POST-then-capture-
  vote_id step and asserts the POST response carries `vote_id` (cross-
  check on Task 1 from inside the test suite).

### `backend/tests/test_architecture_invariants.py`
- New `test_delete_does_not_introduce_state_column` that asserts NEITHER
  `votes` NOR `recipes` grew a `state` column. The existing single-
  purpose `test_invariant_02_votes_table_has_no_state_column` stays as-is.

## Verification

```
$ cd backend && set -a && source ../.env.test.example && set +a && \
  uv run pytest tests/test_votes_contract.py -v
================================== 10 passed in 0.49s ==================================

$ uv run pytest tests/test_architecture_invariants.py -v
================================== 17 passed in 0.41s ==================================

$ uv run pytest -q --no-header
============== 553 passed, 3 skipped, 1 xfailed, 298 warnings in 21.48s ===============
```

```
$ uv run python -c "from app.schemas.vote import VoteResponse; print('vote_id' in VoteResponse.model_fields)"
True

$ uv run python -c "from app.routers.votes import votes_router; print([(r.path, list(r.methods)) for r in votes_router.routes])"
[('/votes/{vote_id}', ['DELETE'])]
```

## Deviations from Plan

**[Rule 1 — Missing critical] test file names didn't exist as the plan specified.**
Plan referenced `backend/tests/test_router_votes.py` and `backend/tests/test_invariants.py`.
Actual files in this repo are `tests/test_votes_contract.py` and `tests/test_architecture_invariants.py`.
Both extended in place; no new files created. Verified `find backend/tests -name 'test_router_votes*' -o -name 'test_invariants*'` returns nothing pre- or post-change.

**[Rule 1 — Missing critical] CookingLog uses `cooked_at: datetime`, not `shortlist_date: date`.**
The plan's `<interfaces>` block stated `CookingLog.shortlist_date: date` but the actual model has `cooked_at: datetime` only. The veto-window guard now casts cooked_at to a date in SQL (`func.date(CookingLog.cooked_at) == shortlist.date`) so the same "any cooking happened on that day" semantics are preserved using the columns that actually exist. No model change.

**[Rule 1 — Missing critical] DailyShortlist column is `date`, not `shortlist_date`.**
Same source — the `<interfaces>` block named `shortlist_date` but the column is `date`. The handler resolves `shortlist_date = shortlist.date` so the broadcast payload schema (`shortlist_date: "YYYY-MM-DD"`) remains exactly as Plan 41-01 D-09 specified.

**Total deviations:** 3 auto-fixed (all Rule 1 — planner referenced names that don't exist in this codebase; semantics preserved by using the columns/files that do exist).

**Impact:** Zero functional impact. The DELETE contract, the 404-not-403 behavior, the 409 veto-window guard, the `vote.deleted` broadcast schema, and the no-state-column regression all behave exactly as designed. The only thing that changed is which files / column names hold the code.

## Authentication Gates

None.

## Next Phase Readiness

**Plan 41-04 unblocked.** The Wave-2 frontend deck-undo plan can now call
`DELETE /api/votes/{vote_id}` and rely on:

1. POST response carries `vote_id` (stored locally for later undo)
2. DELETE returns 204 on success, 409 with `detail = "veto_window_closed"` on
   defense-in-depth race
3. `vote.deleted` broadcast updates partner clients via RealtimeProvider

## Self-Check: PASSED

- All 4 tasks completed and individually committed
- All 10 tests in `test_votes_contract.py` pass (4 original POST + 6 new DELETE)
- All 17 tests in `test_architecture_invariants.py` pass (including the new no-state-column regression)
- Full backend suite: 553 passed, 3 skipped, 1 xfailed — no regression
- `app.main` imports clean; DELETE route registered at `/votes/{vote_id}`
- `VoteResponse.model_fields` includes `vote_id`
- No new Alembic migration (no DB schema change — invariant #2 holds)
- `compute_vote_state` untouched (`services/voting.py` git status empty)
