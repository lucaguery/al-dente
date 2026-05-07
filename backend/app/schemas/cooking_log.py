"""Phase 3 cooking-log schema. Phase 4 extends with photos/rating/notes."""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class CookingLogResponse(BaseModel):
    """Wire shape for COOK-01 + COOK-02. Phase 4 will add photo_paths,
    rating, notes once finalization ships.
    """

    id: UUID
    recipe_id: UUID
    household_id: UUID
    cooked_by_member_id: UUID
    cooked_at: datetime
    rating: Optional[str] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}
