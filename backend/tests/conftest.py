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
"""
from __future__ import annotations

import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
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
    """
    connection = _engine.connect()
    transaction = connection.begin()
    session = _TestSessionLocal(bind=connection)
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
