---
phase: 15
plan: 02
subsystem: backend
tags: [race-condition, atomic-update, sqlalchemy, pytest, regression-test, invariant-2, invariant-3]
requirements: [INV-01, INV-02]
dependency_graph:
  requires:
    - backend/tests/conftest.py (Plan 15-01 — db_session + client fixtures)
    - backend/app/db.py (sync Session + get_db)
    - backend/app/services/realtime.broadcast_to_household
    - aldente_test Postgres on :5433 (Phase 10 infra, seeded via `uv run seed`)
  provides:
    - atomic-UPDATE-with-rowcount-gate finalize_cooking_log (race-safe under concurrent PUTs)
    - compute_vote_state(votes, member_count: int) — no default, INV-01 backend half closed
    - backend/tests/test_cooking_logs.py — first Python regression test in repo
  affects:
    - backend/app/routers/cooking_logs.py
    - backend/app/services/voting.py
    - backend/tests/test_cooking_logs.py
tech_stack:
  added: []
  patterns:
    - "SQLAlchemy 2.0 update().where().returning() + len(rows) == 1 first-finalize gate"
    - "Postgres row-level UPDATE locking as the serialization primitive (no SELECT FOR UPDATE, no advisory lock)"
    - "httpx.AsyncClient(transport=ASGITransport(app=app)) + asyncio.gather for concurrent in-process race simulation"
    - "Bearer header (SEED_TOKEN env override) as test-auth shortcut — same path as Playwright seeded project"
key_files:
  created:
    - backend/tests/test_cooking_logs.py
  modified:
    - backend/app/routers/cooking_logs.py
    - backend/app/services/voting.py
decisions:
  - "ChunkedIteratorResult.all() + len()==1 over .rowcount — SQLAlchemy returns ChunkedIteratorResult (not CursorResult) for update().returning() against ORM entities, and that type has no .rowcount attribute. Semantically equivalent: exactly one returned row == first-finalize."
  - "SELECT-first existence check (Pattern 1 Option A from 15-RESEARCH) — preserves T-04-01-03 cross-household 404 contract; rowcount=0 then unambiguously means 'already finalized'."
  - "Duplicate-tap path broadcasts cooking.finalized (idempotent — invariant #4 redelivery contract) but skips recipe.updated (recipe didn't change on this branch)."
  - "member_count=2 default removed — both production call sites (routers/votes.py:87, routers/shortlist.py:179) already pass live func.count(Member.id); the default served only to mask misuse in any N≠2 household (B-3 root)."
metrics:
  duration_seconds: 1140
  tasks_completed: 3
  files_created: 1
  files_modified: 2
  completed: "2026-05-11T12:45:00Z"
---

# Phase 15 Plan 02: Backend race-safety + INV-01 default removal Summary

Closed ASSESSMENT finding B-4 (cook_count race, architecture invariant #3) by rewriting `finalize_cooking_log` from a Python check-then-act (`is_first_finalize = log_row.rating is None`) to a Postgres `UPDATE … WHERE rating IS NULL RETURNING id` with a result-row-count gate; closed the backend half of INV-01 by removing the `member_count: int = 2` default from `services/voting.compute_vote_state` so every caller is forced to pass the live household count (B-3 root cause). Landed the first Python regression test in the repo — `backend/tests/test_cooking_logs.py` with three tests against the Plan 15-01 scaffold (race regression, happy-path canary, cross-household 404).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rewrite finalize_cooking_log to atomic UPDATE with rowcount gate | `e1fb945` | `backend/app/routers/cooking_logs.py` |
| 2 | Remove member_count=2 default from services/voting.compute_vote_state | `0516c46` | `backend/app/services/voting.py` |
| 3 | Add backend/tests/test_cooking_logs.py with test_finalize_idempotent_concurrent | `08d2bdd` | `backend/app/routers/cooking_logs.py`, `backend/tests/test_cooking_logs.py` |

## Diff Summary — backend/app/routers/cooking_logs.py

The `finalize_cooking_log` function (the section from line 140 through ~line 260) was rewritten in place. Other functions (`start_cooking`, `get_active_cooking_log`, `upload_cooking_log_photo_endpoint`, `cooking_log_signed_photo_url`) and the module-level constants / imports / router declaration are byte-identical to pre-edit.

Line-count delta: ~80 insertions, ~45 deletions (verified via `git diff --stat` at commit time). The function is ~25 lines longer because the duplicate-tap branch is now explicit (Step 4b re-reads the canonical persisted state and emits the idempotent broadcast).

Shape changes:

- **Step 1 (unchanged)** — cross-household 404 SELECT-first.
- **Step 2 (unchanged)** — defense-in-depth photo_paths subset check (T-04-01-01).
- **Step 3 (NEW)** — atomic `update(CookingLog).where(...rating.is_(None)).values(...).returning(CookingLog.id)`; the result is consumed via `.all()` and `is_first_finalize = len(returned_ids) == 1`.
- **Step 4a (first-finalize branch)** — same-tx denormalized recipe update (`Recipe.cook_count + 1`, `last_cooked_at`, `last_cooked_photo_path`) inside `if is_first_finalize:`. Followed by `db.refresh(log_row)` (Pitfall 1 — the atomic UPDATE bypassed the ORM cache).
- **Step 5a (first-finalize broadcasts)** — both `recipe.updated` and `cooking.finalized`.
- **Step 4b (duplicate-tap branch)** — `db.commit()` to close the empty transaction, re-read the canonical persisted log row.
- **Step 5b (duplicate-tap broadcast)** — only `cooking.finalized` (idempotent per invariant #4); no `recipe.updated`.

## Diff Summary — backend/app/services/voting.py

One-line signature change + docstring rewrite. Before:

```python
def compute_vote_state(
    votes: Iterable[Vote],
    member_count: int = 2,
) -> VoteState:
```

After:

```python
def compute_vote_state(
    votes: Iterable[Vote],
    member_count: int,
) -> VoteState:
```

The 5-branch body (`if yes_count == member_count: return VoteState.valide ...`) is byte-identical post-edit — branch order is locked vocabulary mirrored on `frontend/lib/votes.ts`.

Both production call sites already pass `member_count` positionally:

- `backend/app/routers/votes.py:87` — `compute_vote_state(votes_for_recipe, member_count)`
- `backend/app/routers/shortlist.py:179` — same

No call site relied on the default. `uv run python -c "from app.main import app; print('OK')"` exits 0 post-edit, proving no hidden caller broke.

## Test Output

```
$ cd backend && uv run pytest tests/test_cooking_logs.py -v
============================= test session starts ==============================
platform darwin -- Python 3.12.12, pytest-9.0.3, pluggy-1.6.0
configfile: pyproject.toml
plugins: asyncio-1.3.0, anyio-4.13.0
asyncio: mode=Mode.AUTO

tests/test_cooking_logs.py::test_finalize_idempotent_concurrent PASSED   [ 33%]
tests/test_cooking_logs.py::test_finalize_first_time_increments_cook_count PASSED [ 66%]
tests/test_cooking_logs.py::test_finalize_cross_household_returns_404 PASSED [100%]

============================== 3 passed in 0.19s ===============================
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `result.rowcount` returns `AttributeError` on `update().returning()` against an ORM-mapped entity**

- **Found during:** Task 3 (running `uv run pytest tests/test_cooking_logs.py` for the first time)
- **Issue:** The plan's Task 1 reference shape used `result = db.execute(update(CookingLog)...returning(CookingLog.id))` followed by `is_first_finalize = result.rowcount == 1`. The 15-RESEARCH §Pattern 1 reference cites `Result.rowcount` semantics from the SQLAlchemy 2.0 Core docs, which apply to plain `CursorResult` returned for non-RETURNING UPDATEs. When `.returning(...)` is added against an ORM-mapped class, the session.execute path returns a `ChunkedIteratorResult` (iterator-based row fetcher) which has **no** `.rowcount` attribute — every test failed with `AttributeError: 'ChunkedIteratorResult' object has no attribute 'rowcount'`.
- **Fix:** Consume the returned rows via `.all()` and gate on the row-count: `returned_ids = db.execute(...).all(); is_first_finalize = len(returned_ids) == 1`. Semantically equivalent — RETURNING emits one row per row affected, so exactly one row in the iterator means exactly one row was updated.
- **Files modified:** `backend/app/routers/cooking_logs.py`
- **Commit:** Folded into Task 3's commit (`08d2bdd`) since the fix was discovered while running the new test and the test verifies the fix.

This shifts the acceptance criterion "`grep -n 'result.rowcount == 1' backend/app/routers/cooking_logs.py` returns exactly 1 match" — post-fix it returns 0 matches. The semantic acceptance criterion ("first-finalize-vs-duplicate-tap gating works") is preserved and tested by `test_finalize_idempotent_concurrent`. The grep-form criterion was a literal interpretation of the RESEARCH reference shape; the executable test (which the plan also requires) is the load-bearing check.

### Notes on red-baseline check

An ad-hoc red-baseline simulation was attempted: monkey-patch `finalize_cooking_log` back to the pre-fix Python check-then-act and re-run `test_finalize_idempotent_concurrent` against the buggy code. The patched code printed `start_cook_count=0 after=1` — the bug did NOT reproduce under this test fixture.

**Why:** The `app_with_db_override` fixture serves the **same** `db_session` to both concurrent PUTs (the override returns the test's rolled-back session). SQLAlchemy's `Session` is not thread-safe and serializes work at the Python level — both PUTs see each other's pending writes in-process before any Postgres-level concurrency can occur. In production, every request gets its own session from `SessionLocal()` and runs against an independent psycopg2 connection — that's where the race window actually exists.

**Implication for the test's value:** The race regression test does not catch the original race under fixture serialization. It does catch (a) any regression that breaks the atomic UPDATE's `WHERE rating IS NULL` guard, (b) any future edit that double-fires `Recipe.cook_count + 1` on the duplicate-tap path, and (c) any regression to the cross-household 404 path. The DB-layer correctness of the atomic UPDATE is the load-bearing assertion; production-grade race simulation would require either a multi-connection fixture or a pgcrypto-style timing harness — both out of scope for this phase.

Documenting here so a future executor doesn't restage the test fixture under the assumption that "the race test fails red against the old code." It doesn't, under the simple single-session override. The plan's "(red-baseline check recommended but optional)" wording covered this — the test still functions as a regression canary against the structural shape of the fix.

## Threat Flags

None — the rewrite reduces threat surface (closes T-15-02-01 via Postgres row-level UPDATE locking; preserves T-04-01-03 cross-household 404 via the SELECT-first ordering verified by `test_finalize_cross_household_returns_404`; preserves T-04-01-01 photo_paths subset check at Step 2; preserves the T-04-01-06 cook_count non-inflation contract via the explicit `if is_first_finalize:` gate around the increment).

## Self-Check

Files claimed created:
- `backend/tests/test_cooking_logs.py` — FOUND (7.0K, 3 tests)

Files claimed modified:
- `backend/app/routers/cooking_logs.py` — FOUND (atomic UPDATE in place, old check-then-act gone)
- `backend/app/services/voting.py` — FOUND (no `member_count: int = 2`, signature is `member_count: int`)

Commits claimed:
- `e1fb945` — FOUND on `main` (`fix(15-02): atomic UPDATE-with-rowcount gate in finalize_cooking_log (B-4)`)
- `0516c46` — FOUND on `main` (`refactor(15-02): remove member_count=2 default from compute_vote_state (INV-01 backend half)`)
- `08d2bdd` — FOUND on `main` (`test(15-02): add B-4 race regression test + fix RETURNING rowcount accessor`)

Acceptance grep checks re-run before writing this summary:
- `grep -nE "^[[:space:]]*is_first_finalize = log_row\.rating is None" backend/app/routers/cooking_logs.py` → 0 matches (the old code is gone; the only occurrence is inside the new function's docstring describing what was replaced) — PASS
- `grep -c "rating.is_(None)" backend/app/routers/cooking_logs.py` → 3 matches (start_cooking line 83, get_active_cooking_log line 128, finalize_cooking_log line 192) — PASS
- `grep -c "member_count: int = 2" backend/app/services/voting.py` → 0 matches — PASS
- `cd backend && uv run python -c "from app.main import app; print('OK')"` → exits 0 — PASS
- `cd backend && uv run pytest tests/test_cooking_logs.py -q` → `3 passed in 0.19s` — PASS

## Self-Check: PASSED

## Hand-off Note

Plan 15-03 (frontend half of INV-01) was already shipped at commits 24406b3 + 24d55ec (vote-state 5-chip canary + MEMBER_COUNT removal). This plan (15-02) closes the **backend** half of INV-01 plus the entirety of INV-02. With both halves landed, architecture invariant #2 (voting state computed via the live member count, not a "2" fallback) holds end-to-end, and architecture invariant #3 (same-tx denormalized fields without race) holds under concurrent PUTs.

Future phases that touch `finalize_cooking_log` must preserve:

1. The SELECT-first cross-household 404 ordering (Step 1 must run before the atomic UPDATE).
2. The `if is_first_finalize:` gate around the `Recipe.cook_count + 1` UPDATE.
3. The duplicate-tap broadcast pattern (`cooking.finalized` only, NO `recipe.updated`).
4. The `db.refresh(log_row)` after the atomic UPDATE on the first-finalize branch (Pitfall 1 — ORM cache is stale because the UPDATE went around the session).

The regression test `test_finalize_idempotent_concurrent` catches structural regressions of (2) and the cross-household test catches regressions of (1). Visual production-race verification (the "two phones simultaneously tap Finaliser") remains a manual UAT step — encoded as a Playwright `seeded` spec is Phase 17's territory (via the TZ-01 unfixme).
