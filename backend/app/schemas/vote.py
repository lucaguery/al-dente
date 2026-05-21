"""Phase 3 vote request/response schemas.

Critical: `member_id` is NEVER accepted from the request body — always
derived server-side from `Depends(current_member)`. T-03-02-04 mitigation.
"""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class VoteRequest(BaseModel):
    """POST /shortlists/{shortlist_id}/recipes/{recipe_id}/vote body."""

    vote: Literal["yes", "no"]


class VoteResponse(BaseModel):
    """Mirrors the broadcast payload — frontend uses this shape unchanged
    for both HTTP response and `vote.created` WS event handling.

    Phase 41 (UNDO-01): `vote_id` added — the frontend stores this on a
    successful POST so it can later call DELETE /votes/{vote_id} for undo.
    Per CLAUDE.md architecture invariant #2, voting state stays computed
    (no `state` column); the undo flow is a row delete, not a state flip.
    """

    vote_id: UUID
    shortlist_id: UUID
    recipe_id: UUID
    member_id: UUID
    vote: str
    state: str  # one of valide / pressenti / conteste / rejete / sans_avis

    model_config = {"from_attributes": True}
