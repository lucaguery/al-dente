"""SQLAlchemy 2.0 engine, session factory, and FastAPI dependency.

Sync engine via psycopg2 — couple-scale workload makes async overhead unjustified
for v0.1. Switch to async (asyncpg + AsyncSession) is productize-later if needed.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

# echo=False so psycopg2 connection-string never lands in stdout (T-01-03-09).
engine = create_engine(settings.database_url, pool_pre_ping=True, future=True, echo=False)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    """Declarative base for every ORM model.

    All models import this Base; Alembic's ``target_metadata = Base.metadata``
    therefore sees every table once ``app.models`` is imported in ``alembic/env.py``.
    """

    pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a SQLAlchemy session, closed on response."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
