"""Cooking-log schemas — Phase 3 (active log) + Phase 4 (finalization)."""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.cooking_log import LogRating


class CookingLogResponse(BaseModel):
    """Wire shape for COOK-01 (start) + COOK-02 (active) + COOK-03 (finalized)."""

    id: UUID
    recipe_id: UUID
    household_id: UUID
    cooked_by_member_id: UUID
    cooked_at: datetime
    photo_paths: list[str] = Field(default_factory=list)
    rating: Optional[LogRating] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class CookingLogFinalizeRequest(BaseModel):
    """Body for PUT /cooking-logs/{id}.

    ``rating`` is REQUIRED — D-03 in 04-CONTEXT.md states the Finaliser button
    is disabled until a rating is selected. Backend mirrors that gate so a
    rogue client cannot create unfinalized logs that look finalized.

    ``photo_paths`` MUST contain only paths previously returned by
    ``POST /cooking-logs/{id}/photos`` for this same log (validated server-side
    by intersecting with the persisted photo_paths from prior uploads).
    """

    photo_paths: list[str] = Field(default_factory=list, max_length=4)
    rating: LogRating  # required — Pydantic 422s on missing/null
    notes: Optional[str] = Field(default=None, max_length=4000)
