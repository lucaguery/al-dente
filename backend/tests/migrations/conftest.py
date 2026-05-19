"""Migration test conftest — D-39-02 throwaway-DB pattern.

Each migration test gets a freshly created Postgres database named
``aldente_test_mig_<uuid_hex[:12]>`` on the same container as the main test
DB (port 5433).  Alembic is invoked as a subprocess with ENVIRONMENT=test
and DATABASE_URL_TEST pointing at the throwaway DB so pydantic-settings
picks up the correct URL at import time inside the subprocess.

This subpackage does NOT reuse the connection-scoped txn-rollback fixture
(``db_session``) from ``backend/tests/conftest.py``.  Migration tests need a
clean schema baseline — not data isolation within an existing schema.

The ``_seeded_database`` override (session-scoped, autouse=True) prevents the
parent autouse seed fixture (if one exists in ``backend/tests/conftest.py``)
from running for any test discovered under this subpackage.  The closest-
conftest rule in pytest guarantees this override wins for the migrations
package.

See: .planning/phases/39-migration-safety-ci-gate/39-CONTEXT.md D-39-02
"""
from __future__ import annotations

import logging
import os
import uuid
from urllib.parse import urlparse, urlunparse

import psycopg2
import pytest
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

log = logging.getLogger(__name__)

# Mirror the parent conftest default so both resolve to the same container.
_BASE_DB_URL = os.environ.get(
    "DATABASE_URL_TEST",
    "postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test",
)


def _maintenance_dsn(base_url: str) -> dict[str, str | int]:
    """Parse the base URL and return psycopg2.connect kwargs for the
    maintenance DB (``postgres``), NOT the named test DB.

    Returns a dict suitable for ``psycopg2.connect(**kwargs)``.
    """
    parsed = urlparse(base_url)
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5433,
        "user": parsed.username or "postgres",
        "password": parsed.password or "postgres",
        "dbname": "postgres",  # maintenance DB — always available
    }


def _build_throwaway_url(base_url: str, db_name: str) -> str:
    """Replace the database name in *base_url* with *db_name*."""
    parsed = urlparse(base_url)
    # urlunparse expects a 6-tuple; path segment is "/<dbname>"
    new_parsed = parsed._replace(path=f"/{db_name}")
    return urlunparse(new_parsed)


# ---------------------------------------------------------------------------
# Autouse seed override — disables the parent session-scoped autouse seed
# for all tests in this subpackage.  The fixture name MUST match the parent
# fixture exactly so pytest's nearest-conftest resolution picks this one.
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session", autouse=True)
def _seeded_database():
    """Override the parent autouse seed — migration tests need clean DBs, no seed."""
    yield


# ---------------------------------------------------------------------------
# Throwaway-DB fixture — one fresh database per parametrized migration test.
# ---------------------------------------------------------------------------


@pytest.fixture(scope="function")
def throwaway_database_url():
    """Create a throwaway Postgres DB, yield its SQLAlchemy URL, then drop it.

    Database name format: ``aldente_test_mig_<uuid_hex[:12]>`` — short suffix
    keeps Postgres's 63-byte identifier limit safe (total ~24 chars).

    Both CREATE and DROP run with AUTOCOMMIT isolation so they are not wrapped
    in a transaction (Postgres requires that for DDL on databases).

    DROP uses ``WITH (FORCE)`` to evict any leftover connections from a
    crashed test so teardown never leaks databases.
    """
    db_name = f"aldente_test_mig_{uuid.uuid4().hex[:12]}"
    dsn = _maintenance_dsn(_BASE_DB_URL)
    conn = None

    # --- setup ---------------------------------------------------------------
    try:
        conn = psycopg2.connect(**dsn)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        with conn.cursor() as cur:
            cur.execute(f"CREATE DATABASE {db_name}")
        log.debug("Created throwaway database: %s", db_name)
    except psycopg2.Error as exc:
        if conn is not None:
            conn.close()
        pytest.fail(
            f"Could not create throwaway DB '{db_name}' on "
            f"{dsn['host']}:{dsn['port']}. "
            f"Is the test container running? See TESTING.md §'Local test bootstrap'. "
            f"Original error: {exc}"
        )
    finally:
        if conn is not None:
            conn.close()

    throwaway_url = _build_throwaway_url(_BASE_DB_URL, db_name)

    # --- yield to test body --------------------------------------------------
    try:
        yield throwaway_url
    finally:
        # --- teardown --------------------------------------------------------
        drop_conn = None
        try:
            drop_conn = psycopg2.connect(**dsn)
            drop_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            with drop_conn.cursor() as cur:
                cur.execute(f"DROP DATABASE IF EXISTS {db_name} WITH (FORCE)")
            log.debug("Dropped throwaway database: %s", db_name)
        except psycopg2.Error as exc:
            # Log a warning but do NOT mask the test failure.
            log.warning(
                "Teardown failed — could not drop throwaway DB '%s': %s",
                db_name,
                exc,
            )
        finally:
            if drop_conn is not None:
                drop_conn.close()
