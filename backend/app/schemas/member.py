"""Pydantic schemas for the ``Member`` aggregate.

Two shapes:
- ``MemberPublic`` — surfaced inside ``HouseholdPublic.members`` (no auth_token).
- ``MemberWithToken`` — currently unused but reserved for surfaces that need
  to echo a freshly-minted token alongside the member metadata. The
  onboarding response uses ``OnboardingResponse`` instead (a flatter shape
  that mirrors SPEC.md §"Onboarding" verbatim).
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class MemberPublic(BaseModel):
    """Public-facing member shape — never exposes ``auth_token``."""

    id: UUID
    name: str
    color_hex: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class MemberWithToken(MemberPublic):
    """Returned exactly once on create/join (the auth_token is the secret)."""

    auth_token: str
