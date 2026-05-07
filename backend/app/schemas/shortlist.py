"""Phase 3 shortlist + regenerate request/response schemas.

Wire shapes consumed by frontend lib/shortlist.ts (Plan 03).
"""
from __future__ import annotations

from datetime import date as DateType
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.recipe import RecipeResponse


class RegenerateRequest(BaseModel):
    """Optional filters for POST /shortlists/regenerate (SHORTLIST-02).

    Wire shape mirrors services/algorithm.py::ShortlistFilters. All fields
    nullable/optional — empty body regenerates with no filters.
    """

    cuisine: Optional[str] = None
    max_prep_time: Optional[int] = Field(default=None, ge=1, le=999)
    exclude_protein: Optional[str] = None
    required_moods: list[str] = Field(default_factory=list)


class ShortlistVote(BaseModel):
    """One row from the votes table for the current shortlist."""

    shortlist_id: UUID
    recipe_id: UUID
    member_id: UUID
    vote: str  # "yes" | "no"


class ShortlistResponse(BaseModel):
    """GET /shortlists/today and POST /shortlists/regenerate response.

    Frontend (Plan 03) computes the 5 vote-states client-side from `votes`
    using the lib/votes.ts mirror of services/voting.py — same logic,
    identical branch order.
    """

    shortlist_id: UUID
    date: DateType
    generation: int
    recipes: list[RecipeResponse]
    votes: list[ShortlistVote]

    model_config = {"from_attributes": True}
