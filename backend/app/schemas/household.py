"""Pydantic schemas for household onboarding endpoints.

Schemas validate against the locked member-color palette (``app.colors``) and
normalize invite codes to uppercase + 6 alphanumeric chars before they reach
the router layer. T-01-04-04 mitigation lives in ``_validate_color`` below.
"""

from __future__ import annotations

from typing import List
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.colors import is_valid_member_color
from app.schemas.member import MemberPublic

# Bounded so a malicious client can't store a multi-MB string in households.name
# or members.name. 60 chars matches typical "household nickname" expectations.
NAME_MIN = 1
NAME_MAX = 60


class CreateHouseholdRequest(BaseModel):
    """POST /households body."""

    household_name: str = Field(min_length=NAME_MIN, max_length=NAME_MAX)
    member_name: str = Field(min_length=NAME_MIN, max_length=NAME_MAX)
    color_hex: str

    @field_validator("color_hex")
    @classmethod
    def _validate_color(cls, v: str) -> str:
        # T-01-04-04: reject non-palette colors at the edge so the router
        # body never sees an arbitrary hex value.
        if not is_valid_member_color(v):
            raise ValueError("color_hex not in member palette")
        return v


class JoinHouseholdRequest(BaseModel):
    """POST /households/join body."""

    invite_code: str = Field(min_length=6, max_length=6)
    member_name: str = Field(min_length=NAME_MIN, max_length=NAME_MAX)
    color_hex: str

    @field_validator("invite_code")
    @classmethod
    def _normalize_code(cls, v: str) -> str:
        # Tolerate lowercase / whitespace from a paste; reject anything that
        # isn't 6 alphanumeric chars after normalization.
        v = v.strip().upper()
        if not v.isalnum() or len(v) != 6:
            raise ValueError("invite_code must be 6 uppercase alphanumeric characters")
        return v

    @field_validator("color_hex")
    @classmethod
    def _validate_color(cls, v: str) -> str:
        if not is_valid_member_color(v):
            raise ValueError("color_hex not in member palette")
        return v


class HouseholdPublic(BaseModel):
    """GET /households/me response shape (legacy — kept for backward compat).

    ``invite_code`` IS exposed here — the surface is bearer-token-protected, so
    only existing members see it (they need it to share with the partner anyway).
    """

    id: UUID
    name: str
    invite_code: str
    members: List[MemberPublic]

    model_config = {"from_attributes": True}


class SessionResponse(BaseModel):
    """GET /households/me response — Phase 01.1 cookie-auth.

    Embeds the requester's own member identity (``me``) so the frontend's
    SessionProvider can render the user's name/color without a second
    round-trip. Mirrors HouseholdPublic but adds ``me``.
    """

    household_id: UUID
    household_name: str
    invite_code: str
    me: MemberPublic
    members: List[MemberPublic]

    model_config = {"from_attributes": True}


class OnboardingResponse(BaseModel):
    """Shared response for POST /households and POST /households/join.

    Shape matches SPEC.md §"Onboarding" verbatim: the frontend stashes the
    auth_token in localStorage and ships it as ``Authorization: Bearer …`` from
    that point on.
    """

    household_id: UUID
    member_id: UUID
    auth_token: str
    invite_code: str


class HouseholdPreview(BaseModel):
    """GET /households/by-code/{code} response.

    Used by the Join screen to disable already-taken color swatches BEFORE
    submission, avoiding a 409 round-trip after the user has filled the form.

    T-01-04-03 mitigation: deliberately omits member names. The 6-char invite
    code is the credential here — leaking only ``household_name`` and the
    set of taken colors is the minimum needed for the swatch-disable UX.
    """

    household_name: str
    taken_colors: List[str]
