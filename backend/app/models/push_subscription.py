"""PushSubscription model — one Web Push subscription per member.

Stored as JSONB matching the wire shape returned by browser
PushSubscription.toJSON() — { endpoint, keys: { p256dh, auth }, expirationTime? }.
UNIQUE(member_id) lets POST /push/subscribe upsert on re-subscription.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID as PyUUID

from sqlalchemy import DateTime, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    member_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("members.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    subscription: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    __table_args__ = (Index("idx_push_subs_member", "member_id"),)
