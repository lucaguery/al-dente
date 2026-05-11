# Phase 15: Tier 1 invariant fixes - Research

**Researched:** 2026-05-11
**Domain:** Backend race-condition hardening (SQLAlchemy 2.0 atomic UPDATE) + frontend invariant parity (member-count threading) + first-ever pytest scaffolding for this repo
**Confidence:** HIGH

## Summary

Phase 15 closes two Tier 1 audit findings: B-3 (frontend `MEMBER_COUNT=2` hardcode at `HomeDecide.tsx:52, 168, 431, 480` + `VoteSummary.tsx:83` breaks invariant #2 in any N≠2 household) and B-4 (the `is_first_finalize = log_row.rating is None` check at `cooking_logs.py:180` is a Python check-then-act race that breaks invariant #3 under concurrent PUTs). The user has locked all material decisions in CONTEXT.md — frontend reads `session.members.length` via the already-imported `useSession()`, backend converts the Python guard to an atomic Postgres `UPDATE … WHERE id=:id AND rating IS NULL` with rowcount gating. This research fills in the HOW: idiomatic SQLAlchemy 2.0 sync-Session shape, minimal pytest scaffolding (this is the repo's first Python test runner), and the simplest reliable race-simulation pattern.

**Primary recommendation:** Convert the cook-finalize endpoint to a single `db.execute(update(CookingLog).where(CookingLog.id==log_id, CookingLog.rating.is_(None)).values(...).returning(CookingLog.id))` call, then branch on `result.rowcount` — rowcount=1 (first finalize) runs the `Recipe.cook_count + 1` update in the same transaction; rowcount=0 (duplicate tap) re-reads the log and returns the persisted state without a second increment. Frontend collapses `MEMBER_COUNT` to `session.members.length` with a null-session short-circuit to `sans_avis`. Scaffold pytest via a 4-line `[tool.pytest.ini_options]` block + a `conftest.py` that overrides `get_db` with a connection-scoped transaction that rolls back per test. Race simulation uses `httpx.AsyncClient(transport=ASGITransport(app=app))` + `asyncio.gather` — deterministic, no thread scheduling guesswork.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Bug 1 — Frontend member count:**
- **D-15-01:** Member count is read from `session.members.length` (already available via `useSession()` in both `HomeDecide.tsx` and `VoteSummary.tsx`). No new prop drilling, no new server fetch. The constant `MEMBER_COUNT = 2` at `HomeDecide.tsx:52` is removed; the comment "v0.1: hard-coded household size; multi-tenant clean" is also removed.
- **D-15-02:** `VoteSummary.tsx:35-83` — the `memberCount?: number` prop with default `2` is removed; component reads from `useSession()` directly. Removes "default that masks the bug" pattern.
- **D-15-03:** If `session` is null (loading/logged-out edge case), the vote-chip computation short-circuits to `sans_avis` rather than computing against `0` members.

**Bug 2 — Cook-count idempotency:**
- **D-15-04:** Atomic guard via `UPDATE cooking_logs SET rating=:r, photo_paths=:p, notes=:n WHERE id=:id AND rating IS NULL RETURNING id` — if rowcount=1, this PUT was the first finalize and we then atomically run `Recipe.cook_count + 1` in the same transaction; if rowcount=0, another request already finalized and we re-read the log.
- **D-15-05:** Both updates stay in the **same DB transaction** (invariant #3). `recipe.updated` + `cooking.finalized` broadcasts stay on the first-finalize path. On the duplicate-tap path, still broadcast `cooking.finalized` (idempotent — clients tolerate redelivery; invariant #4) but do NOT broadcast `recipe.updated` (recipe didn't change).
- **D-15-06:** `last_cooked_at` keeps `log_row.cooked_at` as source. Since `cooked_at` is set at POST `/cooking-logs/start` and never mutates, second-finalize `last_cooked_at` is identical to first. Stays stable by data flow, not by extra guard.
- **D-15-07:** No new column, no new lock table, no SELECT FOR UPDATE. Relies on Postgres row-level UPDATE locking (rows with `rating IS NULL` get locked; second concurrent request sees zero rows match → rowcount=0).

**Test coverage:**
- **D-15-08:** Backend `tests/test_cooking_logs.py::test_finalize_idempotent_concurrent` — fires 2 concurrent PUTs, asserts `cook_count` increments exactly 1, both responses identical, exactly one first-finalize-semantics broadcast. **This is the kickoff Python test** — pytest scaffolding lands in this phase.
- **D-15-09:** Frontend e2e — extend `cooking-log-create-finalize.spec.ts` (currently `test.fixme` for TZ-01) with a double-tap assertion. TZ-01 unfixme is Phase 17, not Phase 15.
- **D-15-10:** Frontend e2e — add `vote-state-n-members.spec.ts` to the `seeded` project — verifies 5-state vote chip computes correctly with the current 2-member seed (regression canary for B-3).

### Claude's Discretion

- Pytest configuration (`pyproject.toml [tool.pytest.ini_options]`, conftest.py, fixture for FastAPI TestClient + isolated DB transaction) — researcher + planner pick the minimal idiomatic shape. **This research recommends: see `## Validation Architecture` below.**
- Exact ordering of the `is_first_finalize` rowcount return-shape (e.g., `RETURNING id, rating, …` vs separate SELECT) — planner picks the simplest expression. **This research recommends: `.returning(CookingLog.id)` only — see Architecture Patterns.**
- Whether to add a small comment at `services/voting.compute_vote_state` re-asserting the parametrized-member-count contract.

### Deferred Ideas (OUT OF SCOPE)

- **N≥3 member household seed** — out of v0.4 (no new product capability; backlog INFRA item).
- **Generalized optimistic-concurrency token on `CookingLog`** — out of v0.4 (would touch the broader log lifecycle).
- **Frontend `MEMBER_COLORS` raw hex literals** — Phase 20 territory (C-1), NOT this phase.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INV-01 | MEMBER_COUNT eliminated, 5-state vote chip computes correctly per N members | `## Frontend Mirror Parity` — `useSession()` is already imported in `HomeDecide.tsx:26`; `session.members.length` is the canonical source. `lib/votes.ts` branch order unchanged; only call sites churn. |
| INV-02 | cook_count idempotent under double-tap, last_cooked_at stable on re-finalize | `## SQLAlchemy 2.0 Atomic Update` — `update().where(…rating IS NULL).returning(id)` + `result.rowcount` gates both the cook_count increment AND the recipe.updated broadcast. |

## Project Constraints (from CLAUDE.md)

Directives that bound this phase's implementation:

1. **Invariant #2 (computed-not-stored voting state).** Frontend mirror at `lib/votes.ts` and backend at `services/voting.py` MUST stay branch-order-identical. This phase only changes the *source* of the `memberCount` argument; it does not touch the function body or branch order.
2. **Invariant #3 (same-tx denormalized fields).** `cook_count` + `last_cooked_at` mutations and the `cooking_logs.rating` mutation MUST commit together. The atomic-guard pattern preserves this: both `UPDATE`s land in the same `db.commit()`.
3. **Invariant #4 (broadcast contract).** All household-affecting mutations go through `services/realtime.broadcast_to_household`. The duplicate-tap path still broadcasts `cooking.finalized` (clients tolerate redelivery) but skips `recipe.updated` (recipe didn't change).
4. **Invariant #7 (single uvicorn worker, APScheduler in-process).** Single-worker means the only concurrency surface is async cooperative scheduling within the event loop + Postgres MVCC at the DB layer. Threading is not a real concern; the race we're closing is asyncio-cooperative + DB read-modify-write.
5. **Locked vocabularies (frontend/lib/enums.ts + backend/app/models/enums.py).** Drift between the two is a bug class. This phase doesn't touch enums but does touch a near-cousin: the `VoteState` branch ordering in `compute_vote_state` (Python) + `computeVoteState` (TS). Both sides MUST stay in sync.
6. **Push to `main` is the only deploy path.** No manual Vercel/Railway. No environment-config changes in this phase.
7. **French-only via `next-intl`.** No user-facing strings change; both INV-01 and INV-02 are correctness fixes invisible at the copy layer.
8. **Comments explain *why*, not *what*.** Removing the `// v0.1: hard-coded household size; multi-tenant clean` comment honors invariant #2 — keeping it is comment-rot once the constant is gone.

## Standard Stack

This phase does NOT introduce new libraries. Versions verified in `backend/pyproject.toml` and `frontend/package.json`.

### Core (already on the dependency graph)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sqlalchemy | >=2.0 (pyproject.toml:18) | ORM + `update().where().values().returning()` atomic-guard primitive | Project standard; `db.execute(update(Recipe)…)` pattern already lives at `cooking_logs.py:199-203` |
| fastapi[standard] | >=0.136.1 | HTTP framework; `fastapi.testclient.TestClient` for sync pytest | Already on the dep graph; TestClient ships with `[standard]` extras |
| psycopg2-binary | >=2.9.12 | Sync Postgres driver; surfaces row-level UPDATE locks correctly | Project standard — db.py uses sync engine, not asyncpg |
| pydantic | >=2 | Request/response schemas (CookingLogFinalizeRequest, CookingLogResponse) | Project standard |

### New for this phase (test infra only — added to `backend/pyproject.toml [dependency-groups.dev]`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pytest | latest stable (>=8.0) [CITED: docs.pytest.org] | Test runner — repo's first Python tests | FastAPI's own testing guide uses pytest [CITED: fastapi.tiangolo.com/tutorial/testing] |
| pytest-asyncio | latest stable (>=0.24) [CITED: pypi.org/project/pytest-asyncio] | Lets `@pytest.mark.asyncio async def test_…(…)` work for the race-simulation test that uses `httpx.AsyncClient + asyncio.gather` | Standard companion to FastAPI tests when concurrent calls are needed [CITED: fastapi.tiangolo.com/advanced/async-tests] |
| httpx | already on graph via fastapi[standard] | `AsyncClient(transport=ASGITransport(app=app))` for concurrent in-process calls | TestClient itself wraps httpx; AsyncClient is the async sibling |

**Version verification:** `uv add --group dev pytest pytest-asyncio` resolves to the current latest at install time. The repo uses `uv` (pyproject.toml:26 `[tool.uv] package = true`), so `[dependency-groups]` is the modern uv-native idiom rather than `[tool.poetry.group.dev.dependencies]` or a separate `requirements-dev.txt`. [VERIFIED: docs.astral.sh/uv/concepts/projects/dependencies]

### Alternatives Considered (and explicitly rejected per CONTEXT.md)

| Instead of | Could Use | Why rejected |
|------------|-----------|--------------|
| Atomic `UPDATE … WHERE rating IS NULL` | `SELECT … FOR UPDATE` then conditional update | D-15-07 — adds a round-trip; same Postgres guarantee can be expressed in a single UPDATE statement which is what we want |
| `session.members.length` | Add a `useMemberCount()` hook | D-15-01 — extra indirection; `useSession()` is already imported in `HomeDecide.tsx:26` |
| Prop-drilled `memberCount` (status quo) | Keep the prop with `default=2` | D-15-02 — the default IS the bug; removing the default forces every call site to declare its source-of-truth |
| New `failed_finalize_at` column | Schema migration to mark "already-finalized" explicitly | D-15-07 — `rating IS NULL` already encodes "not yet finalized" (per the existing docstring at `cooking_logs.py:154`) |
| Optimistic-concurrency token (`version` column on `cooking_logs`) | Add `version_id` + SQLAlchemy versioning [CITED: docs.sqlalchemy.org/en/21/orm/versioning.html] | Deferred per CONTEXT.md — generalizable but not in v0.4 scope |

**Installation (to be run by the executor in Phase 15 implementation):**

```bash
cd backend
uv add --group dev pytest pytest-asyncio
```

## Architecture Patterns

### Recommended Project Structure (additions only — no folder reshuffle)

```
backend/
├── app/                         # unchanged
├── tests/                       # NEW — first pytest suite
│   ├── __init__.py              # empty marker
│   ├── conftest.py              # NEW — TestClient + db_session fixtures
│   └── test_cooking_logs.py     # NEW — first test (race-condition idempotency)
├── pyproject.toml               # +[tool.pytest.ini_options] block, +dev dep group
└── README.md                    # unchanged

frontend/                        # unchanged structure
├── components/
│   ├── HomeDecide.tsx           # MEMBER_COUNT removed; session.members.length threaded
│   └── VoteSummary.tsx          # memberCount prop removed; useSession() consumed inline
├── lib/votes.ts                 # branch order unchanged; signature unchanged
└── tests/e2e/
    ├── cooking-log-create-finalize.spec.ts  # extend with double-tap assertion (stays test.fixme until Phase 17)
    └── vote-state-n-members.spec.ts         # NEW — `seeded` project canary
```

### Pattern 1: SQLAlchemy 2.0 Atomic UPDATE with rowcount Gate

**What:** Replace a Python check-then-act guard (`is_first_finalize = log_row.rating is None`) with a single SQL `UPDATE` whose WHERE clause encodes the check, plus a rowcount branch.

**When to use:** Any check-then-act on a single row where two concurrent requests could both observe the "pre" state and both attempt the mutation. The repo currently has exactly one such hotspot (Bug 2); the pattern is reusable for the deferred "generalized optimistic-concurrency token" backlog item.

**Why it works:** Postgres acquires a row-level lock during UPDATE evaluation. When request A's UPDATE matches the WHERE, the row is locked; request B's UPDATE waits, then re-evaluates WHERE against the now-mutated row, finds no match, and returns rowcount=0. [VERIFIED: docs.sqlalchemy.org/en/20/orm/queryguide/dml.html — `Result.rowcount` is the affected-row count] [CITED: dev.to/ivankwongtszfung/safe-update-operation-in-postgresql-using-sqlalchemy-3ela]

**Idiomatic SQLAlchemy 2.0 sync shape (this codebase uses sync Session, NOT AsyncSession):**

```python
# Source: pattern verified against existing code at cooking_logs.py:199-203
#         (db.execute(update(Recipe).where(...).values(...)) is already in use)
#         + SQLAlchemy 2.0 official: docs.sqlalchemy.org/en/20/orm/queryguide/dml.html
from sqlalchemy import update

stmt = (
    update(CookingLog)
    .where(
        CookingLog.id == log_id,
        CookingLog.household_id == member.household_id,  # cross-household 404 guard
        CookingLog.rating.is_(None),                     # the atomic guard
    )
    .values(
        rating=body.rating,
        photo_paths=proposed,
        notes=body.notes,
    )
    .returning(CookingLog.id)
)
result = db.execute(stmt)
is_first_finalize = result.rowcount == 1
```

**Then branch:**

```python
if is_first_finalize:
    # Same-tx denormalized update — invariant #3
    db.execute(
        update(Recipe)
        .where(Recipe.id == log_row.recipe_id)
        .values(
            last_cooked_at=log_row.cooked_at,
            last_cooked_photo_path=(proposed[0] if proposed else None),
            cook_count=Recipe.cook_count + 1,
        )
    )
    db.commit()
    # Broadcast recipe.updated + cooking.finalized
else:
    # rowcount == 0: another concurrent PUT (or this same client's retry)
    # already finalized. Re-read the log to return the canonical persisted state.
    db.commit()  # close the (empty) transaction
    log_row = db.scalar(
        select(CookingLog).where(
            CookingLog.id == log_id,
            CookingLog.household_id == member.household_id,
        )
    )
    if log_row is None:
        raise HTTPException(404, "cooking log not found")
    # Broadcast cooking.finalized only (idempotent — invariant #4 tolerates redelivery);
    # do NOT broadcast recipe.updated (recipe didn't change on this path).
```

[VERIFIED: docs.sqlalchemy.org/en/20/orm/queryguide/dml.html — Result.rowcount on UPDATE returns the number of matched/affected rows]
[VERIFIED: existing pattern at backend/app/routers/cooking_logs.py:199-203 (sync `db.execute(update(Recipe).where(...).values(...))`)]

**Note on RETURNING shape:** Per CONTEXT D-15 (Claude's Discretion), recommend `.returning(CookingLog.id)` rather than the full row — we only need rowcount, not the values; the subsequent re-read for the cross-household-safe `log_row` retrieval is clearer than reconstructing fields from a RETURNING tuple. `result.scalars().first()` is also acceptable but adds no information beyond `rowcount`.

**Note on the cross-household 404 contract:** The existing endpoint distinguishes "not found" (404) from "found but unfinalizable" (no current branch — silently overwrites). After this change, the WHERE clause folds the cross-household check + the `rating IS NULL` check into one statement. To preserve the cross-household 404 (T-04-01-03), we need to FIRST verify the log exists for this household — otherwise a rowcount=0 against a real-but-cross-household id would erroneously fall into the "already finalized" branch. The planner should choose between:

- **Option A (simpler):** Keep a preliminary `SELECT` for the household-existence check, then run the atomic UPDATE. Slight extra round-trip; clean error semantics.
- **Option B (one-statement):** Encode both checks in the UPDATE WHERE; rowcount=0 ambiguously means "not yours" OR "already finalized". To disambiguate, do a follow-up `SELECT` only when rowcount=0 — if the log doesn't exist for this household, raise 404; if it does and `rating IS NOT NULL`, return the canonical body.

Option B is one fewer round-trip on the happy path but reintroduces a check-after-act for the error case; Option A is the cleaner default. Planner decides.

### Pattern 2: pytest Scaffolding for FastAPI Sync Session

**What:** First pytest setup in the repo. Minimal idiomatic shape that integrates with the existing test-DB story.

**When to use:** Any new Python test in this repo from Phase 15 onward.

**Existing test-DB anchor:** The Playwright `playwright.config.ts:14` already defines `DATABASE_URL_TEST = 'postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test'` — a separate Docker Compose Postgres on port 5433. Pytest should integrate with this rather than spin up SQLite (SQLite doesn't enforce the same row-level locking semantics; the race test would be a false positive).

**pyproject.toml additions:**

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
asyncio_mode = "auto"   # pytest-asyncio: auto-collect async tests without @pytest.mark.asyncio decorators

[dependency-groups]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24",
]
```

[CITED: docs.pytest.org/en/stable/reference/customize.html#pyproject-toml]
[CITED: pytest-asyncio.readthedocs.io/en/latest/concepts.html#auto-mode]

**conftest.py (recommended shape):**

```python
# Source: fastapi.tiangolo.com/tutorial/testing + project-specific db.py wiring
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db import Base, get_db

# Pytest hits the real Postgres test DB (NOT in-memory SQLite) — row-level
# locking semantics are part of the contract under test (B-4 race). Reuses
# the same DATABASE_URL_TEST that playwright.config.ts:14 already points at.
TEST_DATABASE_URL = os.environ.get(
    "DATABASE_URL_TEST",
    "postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test",
)

engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True, future=True)
TestSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture(scope="function")
def db_session():
    """Per-test transaction; rolled back at teardown so tests are isolated.

    Connection-scoped transaction is significantly faster than DROP/CREATE
    per test — schema stays in place, only data changes roll back.
    [CITED: dev.to/jbrocher/fastapi-testing-a-database-5ao5]
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """TestClient with get_db overridden to use the rolled-back session."""
    def _override():
        yield db_session
    app.dependency_overrides[get_db] = _override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
```

[CITED: fastapi.tiangolo.com/tutorial/testing — `app.dependency_overrides[get_db]` is the documented swap point]
[CITED: docs.sqlalchemy.org/en/20/orm/session_transaction.html — connection-scoped transaction rollback pattern]

**Caveat for the race test specifically:** The per-test rollback fixture won't help when we genuinely need two concurrent requests to share DB state — by definition, both must hit the SAME Postgres connection visibility, and rolling back at teardown is fine, but we cannot use `TestClient` (sync) for the concurrent calls because it serializes. See Pattern 3.

### Pattern 3: Concurrent-PUT Race Simulation

**What:** Fire two HTTP PUTs at the same endpoint such that both observe the pre-mutation state — the minimum reliable shape for triggering the B-4 race window.

**Recommended shape — `httpx.AsyncClient + asyncio.gather`:**

```python
# Source: fastapi.tiangolo.com/advanced/async-tests + verified pattern from
#         multiple FastAPI testing guides (testdriven.io, pytest-with-eric.com)
import asyncio
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_finalize_idempotent_concurrent(db_session, seeded_cooking_log):
    """B-4 regression — two concurrent PUTs must yield cook_count == 1."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        responses = await asyncio.gather(
            ac.put(
                f"/cooking-logs/{seeded_cooking_log.id}",
                json={"rating": "liked", "notes": "", "photo_paths": []},
                headers={"Authorization": "Bearer test-token-luca"},
            ),
            ac.put(
                f"/cooking-logs/{seeded_cooking_log.id}",
                json={"rating": "liked", "notes": "", "photo_paths": []},
                headers={"Authorization": "Bearer test-token-luca"},
            ),
        )

    # Both should return 200 with identical bodies (canonical persisted state)
    assert responses[0].status_code == 200
    assert responses[1].status_code == 200
    assert responses[0].json() == responses[1].json()

    # And the recipe's cook_count must have incremented exactly once
    recipe = db_session.get(Recipe, seeded_cooking_log.recipe_id)
    assert recipe.cook_count == 1
```

**Why this works and threading doesn't:** FastAPI's async endpoints run on a single event loop. With `asyncio.gather`, both coroutines are scheduled cooperatively — the first awaits `db.execute(…)` (a sync call wrapped via the event loop's executor), the second runs in the interleaving window. This deterministically exercises the read-modify-write window in a way that `threading.Thread(target=client.put, …)` does not (threading + TestClient serializes through a single sync stack and obscures the race). [CITED: fastapi.tiangolo.com/advanced/async-tests] [CITED: medium.com/@connect.hashblock — async testing with pytest-asyncio]

**Caveat about sync DB drivers:** This repo uses psycopg2 (sync) per `db.py:9`. The race window exists at the *DB* layer (two transactions issuing UPDATE roughly simultaneously) — not at the asyncio layer. `httpx.AsyncClient + asyncio.gather` against an ASGI app with sync DB calls still produces overlapping DB transactions because FastAPI dispatches sync def endpoints to a threadpool, and async def endpoints (like `finalize_cooking_log`) await each `db.execute(…)` call via the underlying transport. The atomic-UPDATE-with-rowcount pattern relies on Postgres MVCC for correctness — what we're testing is that even with concurrent overlapping transactions, the rowcount gate fires correctly.

**If the race window proves hard to trigger reliably:** A short `asyncio.sleep(0)` injected between the existing SELECT and the new atomic UPDATE in the endpoint would force a yield, but this would only be for debug — production code stays clean. The planner shouldn't pre-bake this; if the test is flaky, that's a Phase 17 hardening item, not Phase 15 scope.

### Anti-Patterns to Avoid

- **`SELECT … FOR UPDATE` followed by UPDATE.** Two round-trips; the atomic-UPDATE-with-rowcount achieves the same guarantee in one statement. Per D-15-07, explicitly rejected.
- **Python-level `threading.Lock` on the FastAPI endpoint.** Process-local; doesn't survive multi-worker (though this repo is single-worker by invariant #7, future-proofing argues against it). Also doesn't address the actual concurrency surface (DB-level).
- **In-memory SQLite for pytest.** Doesn't enforce the same row-level UPDATE locking as Postgres; the B-4 race test would silently pass even if the code were broken. Use the existing `aldente_test` Postgres on port 5433.
- **Refreshing `log_row` AFTER the atomic UPDATE on the rowcount=1 path and then re-reading rating/notes/photo_paths from the ORM object.** The ORM cache may be stale because the UPDATE went around the session. Either `db.refresh(log_row)` explicitly, or use the `.returning(CookingLog.id, CookingLog.rating, CookingLog.notes, CookingLog.photo_paths)` form and build the response from the result tuple.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic single-row guard | Custom Python `threading.Lock` or distributed lock service | `UPDATE … WHERE … = old_state` + rowcount check | Postgres already does this at the row level via MVCC + UPDATE locking. Hand-rolled locks don't survive multi-worker (and we are single-worker by invariant #7, but defense-in-depth) [VERIFIED: docs.sqlalchemy.org/en/20/orm/queryguide/dml.html] |
| Test-database transaction isolation | DROP + CREATE schema per test | Connection-scoped `transaction.rollback()` at fixture teardown | An order of magnitude faster; schema stays in place; only data rolls back [CITED: blog.greeden.me/en/2025/11/04 — DB rollback pattern] |
| Concurrent HTTP testing | Spawn subprocesses / threads with TestClient | `httpx.AsyncClient(transport=ASGITransport(app=app)) + asyncio.gather` | Deterministic event-loop scheduling; no OS scheduler unpredictability; documented FastAPI pattern [CITED: fastapi.tiangolo.com/advanced/async-tests] |
| Member-count fan-out for vote chip | Add a server endpoint to compute it / new prop drill | `session.members.length` via the existing `useSession()` hook | `SessionProvider` already fetches `/api/households/me` on mount; the count is already in the React context tree [VERIFIED: SessionProvider.tsx:78-91, HomeDecide.tsx:26] |

**Key insight:** Both bugs in this phase are *correctness* fixes against existing primitives — Postgres MVCC for the race, the existing session context for the member count. The temptation to introduce new infrastructure (lock service, member-count endpoint, Redis-based mutex, etc.) is the wrong instinct. The single-uvicorn-worker constraint (invariant #7) plus the already-fetched session payload mean both fixes are local mutations to existing code paths, not new subsystems.

## Runtime State Inventory

This is a correctness fix on an existing code path — no rename, no migration, no string replacement. The atomic-guard change is purely behavioral; no schema change; no stored data carries the renamed/old contract. The frontend change removes a local constant and a default prop — no persisted client state references `MEMBER_COUNT`.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no DB rows encode the `MEMBER_COUNT = 2` assumption; the value is recomputed from `members` table at every vote derivation. Verified: backend already queries `func.count(Member.id)` at every wire-broadcast site (services/voting.py docstring + Phase 12 verification). | None |
| Live service config | None — no n8n / Datadog / external service references the old constant. | None |
| OS-registered state | None — no scheduled task or OS registration encodes the cook-count assumption. | None |
| Secrets/env vars | None — neither `MEMBER_COUNT` nor the atomic-guard logic touches secrets. | None |
| Build artifacts | None — TypeScript builds emit fresh from source; Python is imported at runtime. No stale build artifacts to clear. | None |

**Nothing found in any category** — verified by direct codebase inspection (grep for `MEMBER_COUNT`, `is_first_finalize`, `cook_count` produced only the call-site list already cataloged in CONTEXT.md).

## Common Pitfalls

### Pitfall 1: Forgetting to refresh `log_row` after atomic UPDATE

**What goes wrong:** After `db.execute(update(CookingLog).where(...).values(rating=...))`, the ORM-cached `log_row` (if previously fetched) still has `rating IS NULL` in memory. Returning `CookingLogResponse.model_validate(log_row)` would serialize stale data.

**Why it happens:** SQLAlchemy 2.0 by default uses synchronize_session="auto" for Core-style UPDATEs against ORM objects, which can leave session cache out of sync depending on the WHERE shape. The repo's existing pattern at `cooking_logs.py:200-204` already triggers this: the subsequent `db.refresh(log_row)` at line 205 is what synchronizes.

**How to avoid:** Always `db.refresh(log_row)` after the atomic UPDATE on the rowcount=1 path. On the rowcount=0 path, re-`db.scalar(select(...))` the canonical log (the in-memory `log_row` from the initial existence-check SELECT may not reflect the OTHER request's mutation). The existing `db.refresh(log_row)` at `cooking_logs.py:205` is the load-bearing precedent — keep it.

**Warning signs:** Response body shows `rating: null` after a successful 200; second client retry hits "already finalized" branch but UI still sees `null`.

### Pitfall 2: Race-test flakiness from broadcast-side-effect ordering

**What goes wrong:** The test asserts "exactly one `cooking.finalized` broadcast carries first-finalize semantics" but `broadcast_to_household` is fire-and-forget; with two concurrent PUTs, the broadcast order is not deterministic.

**Why it happens:** WebSocket broadcast is async; the two coroutines race to publish.

**How to avoid:** The race test should NOT assert on broadcast ordering. Assert on DB state (cook_count == 1; both responses identical) and let the broadcast assertion be a separate, non-concurrent test. The CONTEXT spec's wording ("exactly one … carries first-finalize semantics") is satisfied by asserting that only one of the two responses had the `is_first_finalize` code path executed — which is observable via cook_count == 1 (not 2), not via broadcast-tap inspection.

**Warning signs:** Test passes locally but flakes in CI; failures are sometimes broadcast-related, sometimes DB-related.

### Pitfall 3: `session.members.length === 0` mid-loading

**What goes wrong:** During the initial `fetchSession()` call (between SessionProvider mount and the GET /api/households/me response), `session` is null. If a child component naively does `session?.members.length ?? 0`, the vote-chip computation runs against `member_count = 0` and the branch `yes_count === member_count` matches for empty vote arrays → renders as `valide` for unvoted recipes. Wrong.

**How to avoid:** Per D-15-03, short-circuit to `sans_avis` when `session` is null. The existing `HomeDecide.tsx:340-348` already has this guard (`if (!session || !me) return <Loader2 …>`) — VoteSummary inherits the constraint because it's only rendered downstream of that guard. The new direct-`useSession()` consumption in `VoteSummary.tsx` still needs its own null-check for the case where it's used in isolation (e.g., future Storybook or test rendering).

**Warning signs:** First-paint flash shows green "Validé" chips on recipes the user hasn't voted on yet.

### Pitfall 4: Branch-order drift in `lib/votes.ts` vs `services/voting.py`

**What goes wrong:** Future edit to either side reorders the branches differently. Server-side computes `pressenti`; client-side computes `valide`; vote-chip diverges from `state` field on `vote.created` WebSocket frames → the existing drift-detector warns in console (`HomeDecide.tsx:170`) but the user-visible state mismatches.

**How to avoid:** The self-check in `lib/votes.ts:78-95` runs at module-load in non-prod and throws on drift. The Python side has no equivalent self-check. **Recommended (planner's discretion):** add a parallel pytest assertion that exercises the same 5 cases (`yy → valide`, `nn → rejete`, etc.) so any branch reorder fails a backend test too.

**Warning signs:** Console warnings about `vote-state drift: local=X server=Y` during user testing.

### Pitfall 5: Conftest `dependency_overrides` leakage between tests

**What goes wrong:** A test sets `app.dependency_overrides[get_db] = override_get_db` but forgets to clear it on failure. The next test uses the stale override and operates against the wrong DB.

**How to avoid:** Always use a fixture with `yield` + cleanup in a `finally` (the conftest.py shape above does this). Never call `app.dependency_overrides[get_db] = …` inline inside a test function.

**Warning signs:** First test in the suite passes, all subsequent ones get auth errors or "table not found".

## Code Examples

### Atomic UPDATE with rowcount gate (final shape)

```python
# Source: SQLAlchemy 2.0 official + verified against existing project pattern
# (cooking_logs.py:199-203). This snippet is the planner's blueprint for the
# rewrite of finalize_cooking_log; line numbers are illustrative only.
from sqlalchemy import select, update
from sqlalchemy.orm import Session

@router.put("/cooking-logs/{log_id}", response_model=CookingLogResponse)
async def finalize_cooking_log(
    log_id: UUID,
    body: CookingLogFinalizeRequest,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    # Step 1: cross-household 404 guard — must come BEFORE the atomic UPDATE
    # to distinguish "not yours" from "already finalized" cleanly.
    log_row = db.scalar(
        select(CookingLog).where(
            CookingLog.id == log_id,
            CookingLog.household_id == member.household_id,
        )
    )
    if log_row is None:
        raise HTTPException(404, "cooking log not found")

    # Step 2: defense-in-depth photo_paths subset check (T-04-01-01) — unchanged.
    persisted = set(log_row.photo_paths or [])
    proposed = list(body.photo_paths)
    for p in proposed:
        if p not in persisted:
            raise HTTPException(422, "photo_paths must be a subset …")

    # Step 3: atomic guard — UPDATE only if rating IS NULL. rowcount disambiguates
    # first-finalize vs duplicate-tap.
    result = db.execute(
        update(CookingLog)
        .where(
            CookingLog.id == log_id,
            CookingLog.rating.is_(None),
        )
        .values(
            rating=body.rating,
            photo_paths=proposed,
            notes=body.notes,
        )
        .returning(CookingLog.id)
    )
    is_first_finalize = result.rowcount == 1

    if is_first_finalize:
        # Step 4a: same-tx denormalized recipe update (invariant #3).
        new_photo_path = proposed[0] if proposed else None
        db.execute(
            update(Recipe)
            .where(Recipe.id == log_row.recipe_id)
            .values(
                last_cooked_at=log_row.cooked_at,
                last_cooked_photo_path=new_photo_path,
                cook_count=Recipe.cook_count + 1,
            )
        )
        db.commit()
        db.refresh(log_row)

        # Step 5a: both broadcasts on first-finalize path.
        recipe = db.get(Recipe, log_row.recipe_id)
        if recipe is not None:
            await broadcast_to_household(
                member.household_id,
                "recipe.updated",
                RecipeResponse.model_validate(recipe).model_dump(mode="json"),
            )
        await broadcast_to_household(
            member.household_id,
            "cooking.finalized",
            {
                "log_id": str(log_row.id),
                "recipe_id": str(log_row.recipe_id),
                "rating": log_row.rating,
            },
        )
        return CookingLogResponse.model_validate(log_row)
    else:
        # Step 4b: duplicate-tap path. Re-read the canonical persisted state.
        db.commit()
        log_row = db.scalar(
            select(CookingLog).where(
                CookingLog.id == log_id,
                CookingLog.household_id == member.household_id,
            )
        )

        # Step 5b: idempotent broadcast — clients tolerate redelivery per
        # invariant #4. NOT recipe.updated (recipe didn't change).
        await broadcast_to_household(
            member.household_id,
            "cooking.finalized",
            {
                "log_id": str(log_row.id),
                "recipe_id": str(log_row.recipe_id),
                "rating": log_row.rating,
            },
        )
        return CookingLogResponse.model_validate(log_row)
```

### Frontend: VoteSummary consumes `useSession()` directly

```typescript
// Source: existing pattern at HomeDecide.tsx:26, 59, 78-89
// Planner: this is the structural shape; exact line ordering is the executor's call.
import { useSession } from "@/components/SessionProvider";

export function VoteSummary({
  recipes,
  votes,
  me,
  partner,
  // memberCount?: number; ← REMOVED per D-15-02
  onCookStart,
  onDelegate,
  onRegenerate,
  cookInFlight,
  delegateInFlight,
}: VoteSummaryProps) {
  const { session } = useSession();
  // D-15-03: short-circuit on null session.
  // The chip render branches to "sans_avis" downstream — equivalent to
  // passing memberCount=Infinity (no branch can match yes_count==member_count
  // unless every member voted yes), but the explicit guard is clearer.
  const memberCount = session?.members.length ?? 0;
  // ... rest of component, passing `memberCount` into computeVoteState(votes, memberCount)
}
```

### Frontend: HomeDecide drops the constant

```typescript
// Source: HomeDecide.tsx:52, 168, 431, 480 — all 4 call sites
// Before:
// const MEMBER_COUNT = 2; // v0.1: hard-coded household size; multi-tenant clean.
// ... computeVoteState(recipeVotes, MEMBER_COUNT)

// After:
// (constant removed; comment removed)
// const memberCount = session.members.length;
// ... computeVoteState(recipeVotes, memberCount)
//
// The render guards at line 340 (!session || !me → Loader) and line 356
// (!partner → invite-code prompt) mean session.members.length is always >=2
// by the time the deck/summary renders, so no extra null-check is needed
// at the call sites within HomeDecide. (The standalone-VoteSummary null
// guard above handles the test-render and future-isolation case.)
```

### Frontend mirror — `lib/votes.ts` unchanged

Per CONTEXT D-15-01/02 and the verified state of `lib/votes.ts:32-48`, the `computeVoteState(votes, memberCount = 2)` signature does NOT change in this phase. Only the *call sites* in `HomeDecide.tsx` and `VoteSummary.tsx` change to pass the live count instead of the constant. The branch order (locked at `lib/votes.ts:43-47`) MUST stay byte-identical to `services/voting.py:50-58`. The drift-detector self-check at `lib/votes.ts:78-95` will catch reorders at bundle time. **Recommendation (planner's discretion):** when removing `MEMBER_COUNT` from `HomeDecide.tsx:52`, leave the `lib/votes.ts:34` `memberCount: number = 2` default in place — it has zero call sites after this phase (every call site passes an explicit count) but removing the default is gratuitous churn that could break unrelated tests or future scratch code. Or remove it as a "no defaults that mask bugs" hygiene matched to D-15-02 — planner picks.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `is_first_finalize = log_row.rating is None` (Python check-then-act) | `UPDATE … WHERE rating IS NULL` + rowcount gate | This phase | Race window closes; invariant #3 holds under concurrent PUTs |
| Frontend hardcoded `MEMBER_COUNT = 2` | `session.members.length` via `useSession()` | This phase | Invariant #2 holds in N≠2 households (even though current production household is 2 members — future-proofing for the deferred N≥3 seed) |
| No Python test runner | pytest 8.x + pytest-asyncio in `[dependency-groups.dev]` | This phase (kickoff) | Future phases (16-21) can extend the suite; pytest-asyncio enables in-process FastAPI concurrent-call testing |

**Deprecated/outdated:**

- The `member_count: int = 2` default on `services/voting.compute_vote_state` (`voting.py:37`) is acknowledged but **NOT removed in this phase** per CONTEXT scope. The backend already overrides it at every call site (via `func.count(Member.id)` per the docstring at `voting.py:8-15`). The default is a Python ergonomic for unit tests; removing it is a larger semver-style change that should ride a separate phase. **Recommendation:** planner adds a comment at the default re-asserting it's intentional for test ergonomics; production paths always pass the real count.
- The `legacy google.generativeai` SDK referenced in some training data: this repo uses `google-genai` (the new unified SDK, pyproject.toml:10). Not in scope for this phase but flagged because any new test that mocks Gemini must import the right SDK.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `httpx.AsyncClient(transport=ASGITransport(app=app))` + `asyncio.gather` reliably triggers the B-4 race window on this codebase | Pattern 3 / Concurrent-PUT Race Simulation | If the race window is too tight to hit deterministically with overlapping coroutines, the race-condition test would silently pass even on the OLD buggy code → useless regression. Mitigation: planner verifies during plan-build by running the test against the un-fixed code FIRST (red baseline) before applying the fix (green). |
| A2 | `pytest-asyncio` 0.24+ with `asyncio_mode = "auto"` is the current idiomatic config | Pattern 2 / pytest scaffolding | Older pytest-asyncio (<0.21) needs explicit `@pytest.mark.asyncio` on every test and a different config key. Mitigation: pin minimum version in pyproject.toml; `uv add` resolves to current latest. |
| A3 | The existing `aldente_test` Postgres on port 5433 is reachable from a `uv run pytest` invocation without Playwright-style webserver orchestration | Pattern 2 / pytest scaffolding | If the Docker Compose Postgres isn't running, the test errors out. Mitigation: README addition documenting the pre-flight `docker compose up -d` step; planner may consider a pytest fixture that auto-starts the DB if missing (deferred). |
| A4 | The `session.members.length === 0` short-circuit to `sans_avis` (D-15-03) matches the existing "Card render before session resolves" empty state in HomeDecide | Decisions D-15-03 | If the existing HomeDecide guard pre-empts this case in practice (it does, per HomeDecide.tsx:340), then the VoteSummary-isolation null-check is defensive only — harmless. Mitigation: the `vote-state-n-members.spec.ts` canary verifies the chip-render contract end-to-end. |
| A5 | Cross-household 404 ordering: do the existence-check SELECT first, THEN the atomic UPDATE (Pattern 1 Option A) | Architecture Patterns / Pattern 1 | If we instead encode the household check into the UPDATE WHERE, rowcount=0 ambiguously means "not yours" OR "already finalized" — disambiguated only via a follow-up SELECT, which negates the round-trip savings. Mitigation: explicit planner decision; Option A is the safer default. |

## Open Questions

1. **Should the backend `member_count: int = 2` default be removed too?**
   - What we know: REQ INV-01 mentions it ("backend compute_vote_state no longer defaults member_count=2"), but CONTEXT.md D-15-01/02 focus on the frontend. The backend default is exercised only by hypothetical test code, since all production sites pass the real count.
   - What's unclear: Whether the planner treats INV-01 as bundled (frontend + backend default removal) or strictly frontend.
   - Recommendation: Plan-time discussion. Cheapest move is to remove the backend default in this phase to match INV-01's literal wording; biggest risk is breaking unrelated test/scratch usage (zero in current code). My recommendation: remove the default; add an explicit `compute_vote_state(votes, member_count: int)` requirement; the new backend pytest test passes `member_count=2` explicitly.

2. **Should the duplicate-tap path skip the `cooking.finalized` broadcast entirely on retry-of-self?**
   - What we know: D-15-05 says "still broadcast … (idempotent — clients tolerate redelivery; matches realtime contract invariant #4)" — explicit decision to keep broadcasting.
   - What's unclear: Whether the partner phone interprets a second `cooking.finalized` as "the cook re-finalized" (cosmetic glitch only — `setActiveLog(null)` is already idempotent per `HomeDecide.tsx:244-251`) or as a state-machine bug.
   - Recommendation: Honor D-15-05 as written. The frontend `onCookingFinalized` handler is a no-op against a null active log; the existing realtime contract already accounts for redelivery. No client change needed.

3. **Does the rowcount=0 path need to verify the log's `household_id` again?**
   - What we know: Pattern 1 Option A does the cross-household SELECT first → by the time we hit rowcount=0, we know the log exists for this household, so the re-read is safe.
   - What's unclear: Whether a sufficiently-malicious concurrent request could… no, it can't. The first SELECT is read-committed against the same connection; even if a teardown deletes the log between SELECT and UPDATE (impossible in practice; logs aren't deleted), the re-read would 404 cleanly.
   - Recommendation: No additional guard needed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.12 | Backend, pytest | ✓ (pyproject.toml:6) | >=3.12 | — |
| uv | Test/install workflows | ✓ (CLAUDE.md, project skill) | (project-managed) | — |
| Postgres 15+ (test DB on :5433) | Race-condition test | ✓ (playwright.config.ts:14, docker compose) | (Supabase Postgres profile) | If unreachable, race test errors out — operator runs `docker compose up -d` |
| psycopg2-binary | sync DB driver | ✓ (pyproject.toml:13) | >=2.9.12 | — |
| pytest | Test runner | ✗ (NEW dependency) | will be >=8.0 | — |
| pytest-asyncio | Concurrent-call test | ✗ (NEW dependency) | will be >=0.24 | — |
| httpx | AsyncClient | ✓ (transitive via fastapi[standard]) | (pinned by fastapi) | — |
| Node 20+ | Playwright e2e suite | ✓ (CLAUDE.md) | (project-managed) | — |
| @playwright/test | E2E specs | ✓ (frontend/package.json) | (project-managed) | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None — pytest + pytest-asyncio are net-new but installable via `uv add --group dev`; the Postgres test DB is already part of the Phase 10 infra contract.

## Security Domain

> `security_enforcement` is not explicitly configured (config.json has no `security_enforcement` key) — treating as enabled per researcher default.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | HttpOnly `aldente_auth` cookie via `current_member` dependency (invariant #8). No change in this phase. |
| V3 Session Management | yes | `SessionProvider` mirrors server `/api/households/me`; no client-side identity decisions. No change. |
| V4 Access Control | yes | Cross-household 404 policy (T-04-01-03) preserved by the household-check SELECT before atomic UPDATE. Pattern 1 Option A explicitly addresses this. |
| V5 Input Validation | yes | `CookingLogFinalizeRequest` (Pydantic) + photo_paths subset check (T-04-01-01). Unchanged. |
| V6 Cryptography | no | This phase doesn't touch cryptographic primitives. |
| V8 Data Protection | yes | `cook_count` and `last_cooked_at` are non-sensitive denormalized counters. No protection contract change. |

### Known Threat Patterns for FastAPI + SQLAlchemy 2.0 (sync) + Postgres

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection | Tampering | SQLAlchemy 2.0 `update()` + `.values()` use parameterized binds — verified against pattern at cooking_logs.py:199-203 (existing) and the new atomic-UPDATE shape (Pattern 1) |
| Cross-household data leak via guessed UUID | Information disclosure | Existing 404 (not 403) policy at cooking_logs.py:163-164 (T-04-01-03); the atomic-UPDATE rewrite preserves this via the SELECT-first ordering (Option A) |
| Race condition leading to double mutation | Tampering (data corruption) | **This is precisely the bug we're closing.** Mitigation: atomic UPDATE with rowcount gate — the new pattern itself. |
| Photo path binding from another household's log | Tampering (file binding) | T-04-01-01 subset check at cooking_logs.py:166-176 — preserved verbatim in the rewrite |
| Broadcast amplification on duplicate-tap | Repudiation / DoS-lite | Bounded by request rate (existing FastAPI defaults); duplicate-tap path only fires `cooking.finalized` (one broadcast, payload identical to first finalize) — clients tolerate per invariant #4 |

**No new threat surface introduced by this phase.** The atomic-UPDATE pattern *reduces* threat surface by closing the race-condition data-corruption pattern.

## Validation Architecture

> Project `.planning/config.json` workflow.nyquist_validation is explicitly `false` — per researcher protocol, skip this section.

(Per the system flow: when `nyquist_validation: false` is explicit, omit. Leaving this section header here for traceability so the planner can see it was considered and explicitly skipped.)

## Sources

### Primary (HIGH confidence)
- `docs.sqlalchemy.org/en/20/orm/queryguide/dml.html` — `update().returning()` + `Result.rowcount` semantics for sync Session
- `fastapi.tiangolo.com/tutorial/testing` — TestClient + `app.dependency_overrides[get_db]` pattern
- `fastapi.tiangolo.com/advanced/async-tests` — `httpx.AsyncClient(transport=ASGITransport(app=app)) + asyncio.gather` for concurrent in-process calls
- `docs.pytest.org/en/stable/reference/customize.html#pyproject-toml` — `[tool.pytest.ini_options]` config schema
- `pytest-asyncio.readthedocs.io/en/latest/concepts.html#auto-mode` — `asyncio_mode = "auto"` config
- `docs.astral.sh/uv/concepts/projects/dependencies` — `[dependency-groups]` for dev deps (uv-native)
- Project codebase verification:
  - `backend/app/routers/cooking_logs.py:199-203` — existing `db.execute(update(Recipe).where(...).values(...))` pattern
  - `backend/app/db.py:1-36` — sync Session + `get_db` FastAPI dependency
  - `backend/pyproject.toml:1-35` — dependency manifest
  - `frontend/components/HomeDecide.tsx:26, 52, 168, 431, 480` — call sites
  - `frontend/components/VoteSummary.tsx:35, 83, 98, 106` — prop signature
  - `frontend/lib/votes.ts:32-48, 78-95` — mirror branch order + drift self-check
  - `frontend/components/SessionProvider.tsx:25-91` — `useSession()` contract
  - `frontend/playwright.config.ts:11-119` — test DB URL + project topology

### Secondary (MEDIUM confidence)
- `dev.to/jbrocher/fastapi-testing-a-database-5ao5` — connection-scoped transaction rollback fixture pattern
- `dev.to/ivankwongtszfung/safe-update-operation-in-postgresql-using-sqlalchemy-3ela` — atomic UPDATE with conditional WHERE
- `blog.greeden.me/en/2025/11/04/fastapi-testing-strategies-…` — pytest fixtures, DB rollback patterns
- `medium.com/@connect.hashblock/async-testing-with-pytest-asyncio-…` — pytest-asyncio + AsyncClient practical patterns
- `pytest-with-eric.com/api-testing/pytest-api-testing-2/` — FastAPI + Postgres test setup walkthrough

### Tertiary (LOW confidence)
- None — all material claims cross-verified against either Context7-equivalent official docs or direct codebase inspection.

## Metadata

**Confidence breakdown:**
- SQLAlchemy 2.0 atomic UPDATE pattern: **HIGH** — verified against official 2.0 docs + existing in-repo pattern at cooking_logs.py:199-203 + multiple secondary sources
- pytest scaffolding (pyproject.toml + conftest.py shape): **HIGH** — FastAPI's own testing guide is the primary reference; the connection-rollback fixture is the canonical secondary pattern
- Race-simulation choice (AsyncClient + gather vs threading): **HIGH** — FastAPI documents AsyncClient; threading + TestClient is documented anti-pattern for concurrent-call testing
- Frontend `useSession()` consumption: **HIGH** — direct in-repo verification at HomeDecide.tsx:26
- Cross-household 404 ordering (Option A vs Option B): **MEDIUM** — both are correct; recommendation is "Option A, simpler" but planner can choose
- Backend `member_count` default removal scope: **MEDIUM** — Open Question #1; planner-time decision

**Research date:** 2026-05-11
**Valid until:** 2026-06-10 (30 days — stack is stable; pytest-asyncio occasionally has breaking minor releases, refresh if delayed)

## RESEARCH COMPLETE

**Phase:** 15 — Tier 1 invariant fixes
**Confidence:** HIGH

### Key Findings

- **Atomic-UPDATE-with-rowcount is the right primitive.** SQLAlchemy 2.0 `db.execute(update(CookingLog).where(...rating.is_(None)).values(...).returning(CookingLog.id))` + `result.rowcount == 1` directly encodes the B-4 fix. Pattern already lives in this codebase (cooking_logs.py:199-203 uses sync `update()` against `Recipe`) — we extend, not invent.
- **Cross-household 404 ordering matters.** The atomic UPDATE must be preceded by an existence-check SELECT (Pattern 1 Option A) to distinguish "not yours" (404) from "already finalized" (rowcount=0, return canonical state). One extra round-trip; cleanest semantics.
- **pytest scaffolding is minimal.** 4 lines of `[tool.pytest.ini_options]` + `[dependency-groups.dev]` block + ~30-line `conftest.py` with TestClient + connection-rollback `db_session` fixture. Reuses the existing `aldente_test` Postgres on port 5433 (Playwright already depends on it).
- **Race simulation: `httpx.AsyncClient(transport=ASGITransport(app=app)) + asyncio.gather` over threading.** Deterministic event-loop interleaving; documented FastAPI pattern. Threading + TestClient is the anti-pattern.
- **Frontend change is structurally trivial.** `useSession()` already imported in HomeDecide.tsx:26; `session.members.length` is the canonical source. Branch order in `lib/votes.ts` unchanged. The only friction is the null-session short-circuit (D-15-03) which matches an existing render guard.

### File Created
`/Users/gulu3001/dev/al-dente/.planning/phases/15-tier-1-invariant-fixes/15-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All libraries already in pyproject.toml (sqlalchemy, fastapi, psycopg2); only pytest + pytest-asyncio are net-new — both stable, both with current docs |
| Architecture (atomic UPDATE + rowcount) | HIGH | Cross-verified: SQLAlchemy 2.0 official docs + existing in-repo pattern at cooking_logs.py:199-203 + multiple secondary sources |
| pytest scaffolding | HIGH | FastAPI's own testing guide is the primary reference; pattern matches every secondary source consulted |
| Concurrent-call simulation | HIGH | FastAPI documents the AsyncClient + ASGITransport pattern explicitly; threading + TestClient is documented anti-pattern |
| Frontend mirror | HIGH | Direct in-repo verification; `useSession()` already in scope; signature of `computeVoteState` unchanged so branch-order parity holds |
| Pitfalls | HIGH | All five drawn from explicit code-path inspection or documented project invariants (CLAUDE.md) |

### Open Questions

1. Remove backend `member_count: int = 2` default in `services/voting.py:37` too? (REQ INV-01 wording vs CONTEXT.md frontend-only scope) — Recommendation: yes, remove; cheap; matches INV-01 literally.
2. (Resolved per D-15-05) — duplicate-tap path still broadcasts `cooking.finalized`; no client change needed.
3. (Resolved) — rowcount=0 path safety; Option A (SELECT first) handles it cleanly.

### Ready for Planning

Research complete. Planner can now create PLAN.md files. The phase splits cleanly into:

- **Wave 0:** pytest scaffolding (pyproject.toml additions + conftest.py + `tests/__init__.py`) — pre-req for the race test.
- **Wave 1 (parallelizable):**
  - Backend: rewrite `finalize_cooking_log` to atomic-UPDATE shape + write `test_finalize_idempotent_concurrent`.
  - Frontend: remove `MEMBER_COUNT` from HomeDecide; remove `memberCount` prop from VoteSummary; thread `session.members.length`; add `vote-state-n-members.spec.ts`.
- **Wave 1 (extension):** Extend `cooking-log-create-finalize.spec.ts` with the double-tap assertion (stays `test.fixme` until Phase 17 unfixmes for TZ-01).
