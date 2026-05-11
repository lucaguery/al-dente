"""Pydantic schemas for the ``Member`` aggregate.

Three shapes:
- ``MemberPublic`` — surfaced inside ``HouseholdPublic.members`` (no auth_token).
- ``MemberWithToken`` — currently unused but reserved for surfaces that need
  to echo a freshly-minted token alongside the member metadata. The
  onboarding response uses ``OnboardingResponse`` instead (a flatter shape
  that mirrors SPEC.md §"Onboarding" verbatim).
- ``MemberRenameRequest`` — IDM-01 PATCH /households/me body. Bounded to 40 chars
  (D-18-01) with whitespace stripped before validation runs so the length
  check is on the post-trim string.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


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


class MemberRenameRequest(BaseModel):
    """PATCH /api/households/me body — IDM-01 (D-18-01).

    ``str_strip_whitespace=True`` (Pydantic v2 pattern per CONTEXT.md §code_context)
    runs BEFORE min/max validation, so a name of all whitespace correctly
    fails with the 1-char min rather than slipping through.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=40)
