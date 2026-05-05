# TODO(productize): D-01 — entire file deleted by plan 01-12 (dogfood-cleanup)
# after the round-trip gate passes on both phones. Keep minimal.
"""Pydantic schemas for the throwaway ping round-trip endpoint."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PingCreateRequest(BaseModel):
    """Body for ``POST /pings``. Only the optional note travels client → server;
    household and sender are derived from the bearer token (T-01-05-03)."""

    note: str | None = Field(default=None, max_length=120)


class PingResponse(BaseModel):
    """Wire shape for the ``POST /pings`` 201 body and ``GET /pings`` rows.

    The same shape is the ``payload`` of the ``ping.created`` WebSocket frame
    fanned out by ``services.realtime.broadcast_to_household`` (REALTIME-02).
    """

    id: UUID
    household_id: UUID
    sent_by_member_id: UUID
    note: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
