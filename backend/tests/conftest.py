"""Pytest fixtures for the backend test suite (kickoff in Phase 15).

The fixtures connect to the same `aldente_test` Postgres on port 5433 that
the Playwright suite uses (frontend/playwright.config.ts:14) — row-level
locking semantics are part of the contract under test (B-4 race), so SQLite
is NOT an option (15-RESEARCH §Pitfall: "In-memory SQLite for pytest").

Per-test isolation uses a connection-scoped transaction that rolls back at
teardown (15-RESEARCH §Pattern 2). Schema stays in place; only data
inserted during the test is undone. The `dependency_overrides` clear in the
client fixture's `finally` defends against leakage between tests
(15-RESEARCH §Pitfall 5).

# 38-01 fix — SAVEPOINT pattern (Option A):
# Tests in test_turns.py call db_session.commit() to make data visible to
# the TestClient's dependency-override session. Without protection, that
# commit pushes through the outer connection-level transaction, turning the
# fixture's teardown rollback() into a no-op and leaking test rows to
# subsequent tests (the 16-failure root cause documented in 37-01-SUMMARY).
#
# Fix: wrap each test in a SAVEPOINT (begin_nested). The after_transaction_end
# event re-opens a fresh nested transaction whenever the inner one ends (i.e.
# when a test calls commit()), so the session always has an active SAVEPOINT.
# The outer transaction is NEVER committed — it rolls back unconditionally at
# teardown, undoing everything including any inner commits. The seeded rows
# (committed at session scope by _seeded_database before any test runs) stay
# visible because they live outside the outer per-test transaction.
# SQLAlchemy 2.0 / psycopg2 verified pattern:
# https://docs.sqlalchemy.org/en/20/orm/session_transaction.html
#   §joining-a-session-into-an-external-transaction-such-as-for-test-suites
"""
from __future__ import annotations

import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.db import get_db
from app.main import app

TEST_DATABASE_URL = os.environ.get(
    "DATABASE_URL_TEST",
    "postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test",
)

_engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True, future=True)
_TestSessionLocal = sessionmaker(
    bind=_engine, autoflush=False, autocommit=False, future=True
)


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Per-test connection-scoped transaction; rolled back at teardown.

    Faster than DROP/CREATE per test — schema persists, only data rolls back.

    38-01 SAVEPOINT wrapper: the outer transaction is never committed.
    When a test calls db_session.commit(), it ends the current SAVEPOINT
    (inner transaction). The after_transaction_end listener immediately
    opens a fresh SAVEPOINT so the session is always nested inside the
    outer transaction. Teardown rolls back the outer transaction, undoing
    all per-test writes regardless of how many commit() calls occurred.
    """
    connection = _engine.connect()
    transaction = connection.begin()
    session = _TestSessionLocal(bind=connection)

    # Open the first SAVEPOINT.
    nested = connection.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def _reopen_savepoint(session: Session, transaction: object) -> None:
        """Re-open a SAVEPOINT after the current nested transaction ends.

        Fires whenever the session's innermost transaction block ends
        (including when a test calls commit()). If the outer connection-level
        transaction is still active, open a fresh SAVEPOINT so subsequent
        DB operations stay inside the rollback-at-teardown envelope.
        """
        nonlocal nested
        if not connection.closed and connection.in_transaction():
            nested = connection.begin_nested()

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """TestClient with `get_db` overridden to use the rolled-back session.

    The `finally` clears the override even if a test raises mid-body —
    prevents leakage between tests (15-RESEARCH §Pitfall 5).
    """

    def _override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture(scope="session", autouse=True)
def _seeded_database() -> Generator[None, None, None]:
    """D-37-01 — autouse session-scoped seed fixture.

    Runs ONCE per pytest session, before any per-test transaction begins, so
    seeded rows are committed to the test DB and visible to all tests. Per-test
    inserts performed via the `db_session` fixture still roll back individually
    (the connection-scoped transaction in `db_session` is unaffected by this
    committed seed data).

    Imports are lazy (inside the fixture body) to avoid triggering pydantic-
    settings / SQLAlchemy initialisation at module-load time when the test env
    vars may not yet be set.

    Calls `_guard_environment()` before `run_test_seed()` so this fixture
    hard-refuses to corrupt a non-test database (T-37-01-01 mitigation).
    Never calls `main()` — that function re-parses sys.argv which pytest
    controls and would misread pytest flags as seed arguments.
    """
    from app.cli.seed import _guard_environment, run_test_seed

    try:
        _guard_environment()
        run_test_seed()
    except SystemExit as exc:
        pytest.fail(
            f"_seeded_database fixture aborted: the seed guard refused to run "
            f"(exit code {exc.code!r}). "
            f"Check that ENVIRONMENT=test and DATABASE_URL_TEST points at "
            f"'aldente_test'. See TESTING.md Quick Start for the 4-command "
            f"bootstrap."
        )
    except Exception as exc:
        pytest.fail(
            f"_seeded_database fixture failed: {exc!r}. "
            f"Ensure the test DB is running (docker compose -f docker-compose.test.yml up -d) "
            f"and migrations are applied (cd backend && uv run alembic upgrade head). "
            f"See TESTING.md Quick Start."
        )
    yield
