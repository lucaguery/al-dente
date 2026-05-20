"""Migration safety tests — MIG-01 + MIG-02.

Asserts that every Alembic revision in backend/alembic/versions/ can:
1. ``alembic upgrade <revision>`` against a clean throwaway Postgres DB
2. ``alembic downgrade <down_revision_or_base>`` immediately after

Protects the Railway deploy contract documented in backend/CLAUDE.md:
Railway runs ``alembic upgrade head`` before each uvicorn restart. A broken
``upgrade()`` or ``downgrade()`` is invisible until a prod rollback is needed
— this test suite makes it a CI failure the instant a broken migration lands.

Design (D-39-02):
- Each parametrized case receives a fresh ``throwaway_database_url`` fixture
  (function-scoped) from backend/tests/migrations/conftest.py.
- Alembic is invoked as a subprocess with ENVIRONMENT=test and
  DATABASE_URL_TEST pointing at the throwaway DB so pydantic-settings picks
  up the right URL at import time inside the subprocess.
- Per-test DB isolation means each migration is tested against a fully clean
  schema rather than whatever the previous test left behind.

Parametrization:
- At module collection time, glob MIGRATIONS_DIR/*.py and load revision
  metadata via importlib.  The parametrize list has one entry per .py file,
  sorted by filename.  Adding a new migration file is picked up automatically
  without touching this test.

Known non-downgradeable revisions:
- ``0006``: Postgres does not support ``ALTER TYPE ... DROP VALUE``.  The
  migration's ``downgrade()`` intentionally raises ``NotImplementedError``
  as documented in the migration docstring (Phase 16 D-16-02).  Upgrade is
  still verified; the downgrade case is marked ``xfail`` so CI passes but the
  test exists in the suite for future awareness.
"""

from __future__ import annotations

import importlib.util
import os
import subprocess
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Known non-downgradeable revisions (intentional, documented asymmetry)
# ---------------------------------------------------------------------------

# Postgres does not support ALTER TYPE ... DROP VALUE.  These revisions raise
# NotImplementedError in their downgrade() as documented in the migration
# file itself.  We xfail the downgrade step so CI stays green while the test
# still exists in the suite for auditing purposes.
#
# Format: {revision_id: "reason for non-downgradability"}
_KNOWN_NON_DOWNGRADEABLE: dict[str, str] = {
    "0006": (
        "Postgres does not support ALTER TYPE recipe_status DROP VALUE; "
        "documented intentional asymmetric migration (Phase 16 D-16-02)."
    ),
}

# ---------------------------------------------------------------------------
# Module-level constants
# ---------------------------------------------------------------------------

# backend/alembic/versions/ — resolved from this file's location.
# __file__ is backend/tests/migrations/test_migration_safety.py
# parents[0] = backend/tests/migrations/
# parents[1] = backend/tests/
# parents[2] = backend/
BACKEND_DIR = Path(__file__).resolve().parents[2]
MIGRATIONS_DIR = BACKEND_DIR / "alembic" / "versions"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _load_revision_metadata(path: Path) -> tuple[str, str | None]:
    """Dynamically load *path* as a module and return (revision, down_revision).

    Raises ``pytest.fail`` if either attribute is absent so the error surfaces
    clearly at collection time rather than as an AttributeError at runtime.
    """
    spec = importlib.util.spec_from_file_location(path.stem, path)
    if spec is None or spec.loader is None:
        pytest.fail(f"Could not create spec for migration file: {path}")

    module = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(module)  # type: ignore[union-attr]
    except Exception as exc:
        pytest.fail(f"Failed to import migration module {path.name}: {exc}")

    if not hasattr(module, "revision"):
        pytest.fail(f"Migration {path.name} missing 'revision' attribute")
    if not hasattr(module, "down_revision"):
        pytest.fail(f"Migration {path.name} missing 'down_revision' attribute")

    return (module.revision, module.down_revision)


def _discover_migrations() -> list[tuple[str, str | None]]:
    """Glob MIGRATIONS_DIR, load each file, return sorted list of
    ``(revision, down_revision)`` tuples.

    Asserts the discovered count is >= 11 (the number audited at Phase 39
    planning time — 2026-05-20).  If a migration is deleted this assertion
    trips, forcing a conscious update to the floor.  New migrations raise the
    count automatically.
    """
    paths = sorted(MIGRATIONS_DIR.glob("*.py"))
    result = [_load_revision_metadata(p) for p in paths]

    # Defensive floor — if the audit count changes, update this comment and
    # the number below.  Currently: 0001..0012 skipping 0010 = 11 files.
    assert len(result) >= 11, (
        f"Expected >= 11 migrations in {MIGRATIONS_DIR}, found {len(result)}. "
        "If migrations were intentionally removed, update the floor in "
        "backend/tests/migrations/test_migration_safety.py."
    )

    return result


# Build the parametrize list once at collection time.
_MIGRATION_PARAMS: list[tuple[str, str | None]] = _discover_migrations()


# ---------------------------------------------------------------------------
# Parametrized test
# ---------------------------------------------------------------------------


def _ids(val: str | None) -> str:
    """Human-readable pytest ID for the parametrize values."""
    return val if isinstance(val, str) else "base"


@pytest.mark.parametrize("revision,down_revision", _MIGRATION_PARAMS, ids=_ids)
def test_migration_upgrade_then_downgrade_runs_clean(
    revision: str,
    down_revision: str | None,
    throwaway_database_url: str,
) -> None:
    """Upgrade to *revision* then downgrade to *down_revision* (or ``base``).

    Each step is a fresh ``uv run alembic …`` subprocess against the
    throwaway DB provided by the fixture.  Both must exit 0.

    Failure output includes the full stderr from the failing alembic command
    so CI logs are actionable without re-running locally.

    Note: ``alembic upgrade <revision>`` on a clean empty DB causes alembic
    to walk the full chain from ``base`` up to *revision*.  This exercises
    every migration that precedes *revision* in the chain — a natural
    integration test of the full upgrade path up to that revision, not just
    the single-step increment.

    Revisions listed in ``_KNOWN_NON_DOWNGRADEABLE`` have their downgrade
    step marked ``xfail`` so CI stays green while the test still appears in
    the suite for auditing.  Upgrade is always verified unconditionally.
    """
    env = {
        **os.environ,
        "ENVIRONMENT": "test",
        "DATABASE_URL": throwaway_database_url,  # required by pydantic-settings
        "DATABASE_URL_TEST": throwaway_database_url,  # D-02 override path
    }

    # --- Upgrade step (always required, never xfail) ------------------------
    upgrade_result = subprocess.run(
        ["uv", "run", "alembic", "upgrade", revision],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
    )
    if upgrade_result.returncode != 0:
        pytest.fail(
            f"alembic upgrade {revision!r} failed (returncode="
            f"{upgrade_result.returncode}):\n"
            f"--- stdout ---\n{upgrade_result.stdout}\n"
            f"--- stderr ---\n{upgrade_result.stderr}"
        )

    # --- Downgrade step (xfail for known non-downgradeable revisions) -------
    target = down_revision if down_revision is not None else "base"

    if revision in _KNOWN_NON_DOWNGRADEABLE:
        pytest.xfail(_KNOWN_NON_DOWNGRADEABLE[revision])

    downgrade_result = subprocess.run(
        ["uv", "run", "alembic", "downgrade", target],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
    )
    if downgrade_result.returncode != 0:
        pytest.fail(
            f"alembic downgrade {revision!r} → {target!r} failed (returncode="
            f"{downgrade_result.returncode}):\n"
            f"--- stdout ---\n{downgrade_result.stdout}\n"
            f"--- stderr ---\n{downgrade_result.stderr}"
        )
