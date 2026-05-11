---
phase: 15
plan: 01
subsystem: backend
tags: [test-infra, pytest, scaffolding, dev-deps]
requirements: [INV-02]
dependency_graph:
  requires:
    - backend/app/db.py (sync Session + get_db FastAPI dependency)
    - backend/app/main.py (app factory exporting `app`)
    - aldente_test Postgres on :5433 (existing Phase 10 infra)
  provides:
    - backend pytest runner (`uv run pytest`)
    - tests/conftest.py db_session fixture (connection-scoped tx + rollback)
    - tests/conftest.py client fixture (TestClient with get_db override)
  affects:
    - backend/pyproject.toml (+pytest config, +dev dep group)
    - backend/uv.lock (regenerated with pytest + pytest-asyncio)
tech_stack:
  added:
    - pytest 9.0.3
    - pytest-asyncio 1.3.0
  patterns:
    - "uv [dependency-groups].dev for dev-only deps"
    - "pyproject [tool.pytest.ini_options] for pytest config"
    - "connection-scoped transaction + rollback for per-test isolation"
    - "app.dependency_overrides[get_db] with finally-clear (Pitfall 5)"
key_files:
  created:
    - backend/tests/__init__.py
    - backend/tests/conftest.py
  modified:
    - backend/pyproject.toml
    - backend/uv.lock
decisions:
  - "Use the existing aldente_test Postgres on :5433 (not SQLite) — row-level lock semantics are part of the B-4 race contract under test"
  - "Connection-scoped transaction + rollback at teardown over DROP/CREATE per test — faster, schema persists"
  - "Module-level _engine + _TestSessionLocal; function-scoped db_session — isolation comes from scope, not engine"
metrics:
  duration_seconds: 99
  tasks_completed: 2
  files_created: 2
  files_modified: 2
  completed: "2026-05-11T12:21:12Z"
---

# Phase 15 Plan 01: pytest Scaffolding Summary

Scaffolded the first Python test runner in the repo — `uv run pytest` is now wired with pytest 9.0.3 + pytest-asyncio 1.3.0 under `[dependency-groups].dev`, and `backend/tests/conftest.py` exposes `db_session` (connection-scoped transaction + rollback) and `client` (TestClient with `get_db` override and `finally`-clear) fixtures pointing at the existing `aldente_test` Postgres on :5433. Plan 15-02 will author the first test (`test_finalize_idempotent_concurrent`) against this scaffold.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add pytest config and dev dep group to backend/pyproject.toml | `a59036c` | `backend/pyproject.toml`, `backend/uv.lock` |
| 2 | Create backend/tests/__init__.py and conftest.py | `befe2e5` | `backend/tests/__init__.py`, `backend/tests/conftest.py` |

## pyproject.toml Additions

Two blocks appended to `backend/pyproject.toml` (no existing blocks modified):

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
asyncio_mode = "auto"

[dependency-groups]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24",
]
```

- `asyncio_mode = "auto"` lets `async def test_…` collect without a per-test `@pytest.mark.asyncio` decorator — useful for the upcoming `test_finalize_idempotent_concurrent` (Plan 15-02) which uses `httpx.AsyncClient` + `asyncio.gather`.
- `testpaths = ["tests"]` keeps pytest scoped to the new `backend/tests/` folder; no accidental collection from `app/` or elsewhere.

## uv sync Output (versions resolved)

```
Resolved 102 packages in 508ms
Built backend @ file:///Users/gulu3001/dev/al-dente/backend
Installed 5 packages in 32ms
 + iniconfig==2.3.0
 + pluggy==1.6.0
 + pytest==9.0.3
 + pytest-asyncio==1.3.0
```

`pytest>=8.0` resolves to 9.0.3 (current stable); `pytest-asyncio>=0.24` resolves to 1.3.0. Both satisfy the minimum-version pins. Two transitive deps (`iniconfig`, `pluggy`) installed alongside.

## conftest.py Shape

`backend/tests/conftest.py` exposes two function-scoped fixtures:

**`db_session`** — a SQLAlchemy `Session` bound to a connection on which a transaction has been opened. On teardown, the transaction is rolled back and the connection closed. Schema persists between tests (managed by Alembic — already migrated by Phase 10 infra); only data inserted by a test is undone. The module-level `_engine` and `_TestSessionLocal` are created once per process from `DATABASE_URL_TEST` (env override; default `postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test` matches `frontend/playwright.config.ts:14`).

**`client`** — a FastAPI `TestClient` bound to `app.main.app` with `app.dependency_overrides[get_db]` swapping in the per-test `db_session`. The `try / finally` clears the override via `app.dependency_overrides.pop(get_db, None)` even if the test raises mid-body, defending against the leakage pattern documented in 15-RESEARCH Pitfall 5.

The `client` fixture depends on `db_session`, so a test that requests only `client` still inherits per-test transaction isolation.

## Verification

```
$ cd backend && uv run pytest --version
pytest 9.0.3

$ cd backend && uv run pytest --collect-only
============================= test session starts ==============================
platform darwin -- Python 3.12.12, pytest-9.0.3, pluggy-1.6.0
rootdir: /Users/gulu3001/dev/al-dente/backend
configfile: pyproject.toml
testpaths: tests
plugins: asyncio-1.3.0, anyio-4.13.0
asyncio: mode=Mode.AUTO, debug=False, ...
collected 0 items

========================= no tests collected in 0.00s ==========================
```

`configfile: pyproject.toml` and `testpaths: tests` confirm the `[tool.pytest.ini_options]` block is being honored. `asyncio: mode=Mode.AUTO` confirms pytest-asyncio loaded with auto-mode. "collected 0 items" is the expected scaffold outcome — Plan 15-02 owns the first test.

Pytest's `--collect-only` exits with code 5 when zero tests collect (its standard "nothing to do" signal), not 0. The plan's documented verify command pipes through `grep -E "(collected 0 items|no tests ran)"` which converts that to a successful match. The orchestrator's success-criteria explicitly accepts this.

## Deviations from Plan

None — plan executed exactly as written.

The plan's `[tool.pytest.ini_options]` block was appended in the exact shape specified; the `conftest.py` was written verbatim per the plan's `<action>` body; `uv sync --group dev` ran cleanly and updated `uv.lock`. No bugs surfaced, no critical functionality was missing, no architectural changes needed.

## Self-Check

Files claimed created:
- `backend/tests/__init__.py` — FOUND (0 bytes, package marker)
- `backend/tests/conftest.py` — FOUND
- `.planning/phases/15-tier-1-invariant-fixes/15-01-SUMMARY.md` — being written now

Files claimed modified:
- `backend/pyproject.toml` — FOUND (contains `[tool.pytest.ini_options]` at line 36, `[dependency-groups]` at line 41)
- `backend/uv.lock` — FOUND (regenerated; staged with Task 1 commit)

Commits claimed:
- `a59036c` — FOUND on `main` (Task 1, `chore(15-01): add pytest config + dev dep group to backend`)
- `befe2e5` — FOUND on `main` (Task 2, `test(15-01): scaffold backend pytest fixtures (db_session + client)`)

Verification commands re-run before writing this summary:
- `cd backend && uv run pytest --version` — prints `pytest 9.0.3` (PASS)
- `cd backend && uv run pytest --collect-only 2>&1 | grep "collected 0 items"` — matches (PASS)

## Self-Check: PASSED

## Hand-off Note

Plan 15-02 will author the first test (`backend/tests/test_cooking_logs.py::test_finalize_idempotent_concurrent`) against this scaffold. The `db_session` fixture gives it per-test DB isolation; the `client` fixture wraps the FastAPI app; both target the same `aldente_test` Postgres on :5433 that the Playwright suite already depends on. The race test in 15-02 will use `httpx.AsyncClient` + `asyncio.gather` (not `TestClient`) for the concurrent-PUT simulation, but the `db_session` fixture remains the asserting surface for `recipe.cook_count == 1` after the race.
