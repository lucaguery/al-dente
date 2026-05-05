"""Alembic migration environment.

Uses synchronous psycopg2 driver. DATABASE_URL is read from app.config.settings
(pydantic-settings loads .env or real env vars) — alembic.ini's sqlalchemy.url
is left blank intentionally so migrations cannot be run against the wrong URL
by accident.
"""

from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config import settings
from app.db import Base

# Make sure every model is imported so its table is attached to Base.metadata.
import app.models  # noqa: F401  — side-effect import for Alembic autogenerate

# Alembic Config object provides access to alembic.ini values.
config = context.config

# Inject DATABASE_URL from app settings.
config.set_main_option("sqlalchemy.url", settings.database_url)

# Configure Python logging from alembic.ini.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Tells Alembic about every table managed by SQLAlchemy.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Emit SQL to stdout without an Engine — used by ``alembic upgrade --sql``."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations with a live DB connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        future=True,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
