"""Re-export ``Base`` from ``app.db`` plus shared mixins.

Importing ``Base`` from here keeps model files dependency-light (a model file
imports ``app.models.base.Base``, not ``app.db.Base``), even though Base lives
in db.py for engine-coupling reasons.
"""

from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

__all__ = ["Base", "TimestampMixin"]


class TimestampMixin:
    """Provides a ``created_at`` column with server-side default ``now()``."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
