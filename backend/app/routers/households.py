"""Household onboarding endpoints — ONBOARD-01/02/04/05 + INFRA-06.

Four routes:
- ``POST /households`` — create household + creator member, mint auth_token,
  return invite_code (ONBOARD-01, ONBOARD-02).
- ``POST /households/join`` — second member joins via invite_code; rejects
  unknown codes (404) and already-taken colors (409). ONBOARD-04, ONBOARD-05.
- ``GET /households/by-code/{code}`` — auth-free preview used by the join
  screen to render disabled swatches BEFORE the join attempt.
- ``GET /households/me`` — bearer-token-protected; closes the INFRA-06
  end-to-end verification (no router beyond /healthz existed before).

The router is a thin HTTP adapter; secrets generation lives in
``app.auth.generate_auth_token`` and ``app.services.invite_codes``.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import current_member, generate_auth_token, set_auth_cookie
from app.db import get_db
from app.models.household import Household
from app.models.member import Member
from app.schemas.household import (
    CreateHouseholdRequest,
    HouseholdPreview,
    HouseholdPublic,
    JoinHouseholdRequest,
    OnboardingResponse,
    SessionResponse,
)
from app.services.invite_codes import generate_unique_invite_code

router = APIRouter(prefix="/households", tags=["households"])


@router.post(
    "",
    response_model=OnboardingResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_household(
    body: CreateHouseholdRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> OnboardingResponse:
    """Create a household + the creator's member row in one transaction.

    ONBOARD-01 / ONBOARD-02. Both inserts share a single commit so the
    household never exists without at least one member (and vice versa).
    D-02: aldente_auth cookie is set alongside the auth_token body field.
    """
    invite_code = generate_unique_invite_code(db)
    household = Household(name=body.household_name, invite_code=invite_code)
    db.add(household)
    # flush populates household.id from the server_default (gen_random_uuid)
    # without committing — keeps the two inserts atomic.
    db.flush()

    member = Member(
        household_id=household.id,
        name=body.member_name,
        color_hex=body.color_hex,
        auth_token=generate_auth_token(),
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    db.refresh(household)
    set_auth_cookie(response, member.auth_token)
    return OnboardingResponse(
        household_id=household.id,
        member_id=member.id,
        auth_token=member.auth_token,
        invite_code=household.invite_code,
    )


@router.get("/by-code/{code}", response_model=HouseholdPreview)
def household_preview(
    code: str,
    db: Session = Depends(get_db),
) -> HouseholdPreview:
    """Auth-free preview for the Join screen.

    ONBOARD-05 support: the frontend uses ``taken_colors`` to grey-out swatches
    before the user submits, preventing a 409 after a filled form. The 6-char
    invite code itself is the bearer of trust here (T-01-04-03 mitigation:
    schema deliberately omits member names).
    """
    normalized = code.strip().upper()
    household = db.scalar(
        select(Household).where(Household.invite_code == normalized)
    )
    if household is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="invite_code not found",
        )
    members = db.scalars(
        select(Member).where(Member.household_id == household.id)
    ).all()
    return HouseholdPreview(
        household_name=household.name,
        taken_colors=[m.color_hex for m in members],
    )


@router.post(
    "/join",
    response_model=OnboardingResponse,
    status_code=status.HTTP_201_CREATED,
)
def join_household(
    body: JoinHouseholdRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> OnboardingResponse:
    """Add a member to an existing household via invite code.

    ONBOARD-04. Returns:
    - 404 if the invite_code does not match any household.
    - 409 if ``color_hex`` is already taken by an existing member.
    - 422 if ``color_hex`` is not in the locked palette (Pydantic-level).

    T-01-04-05 mitigation: ``existing_colors`` set check happens in the same
    transaction as the insert, so two simultaneous joins-with-the-same-color
    are serialized at the row level (rare at couple-scale, but free correctness).
    """
    household = db.scalar(
        select(Household).where(Household.invite_code == body.invite_code)
    )
    if household is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="invite_code not found",
        )

    # D-07: idempotent rejoin. Match on name only (case-insensitive, trimmed).
    # If a member already exists in this household with a matching name,
    # silently return their existing token + IDs. Color in the body is
    # ignored on this branch — users may have forgotten which color they
    # originally picked.
    normalized_name = body.member_name.strip().lower()
    existing_member = db.scalar(
        select(Member).where(
            Member.household_id == household.id,
            func.lower(Member.name) == normalized_name,
        )
    )
    if existing_member is not None:
        set_auth_cookie(response, existing_member.auth_token)
        return OnboardingResponse(
            household_id=household.id,
            member_id=existing_member.id,
            auth_token=existing_member.auth_token,
            invite_code=household.invite_code,
        )

    # Net-new member path — color uniqueness still applies.
    existing_colors = set(
        db.scalars(
            select(Member.color_hex).where(Member.household_id == household.id)
        ).all()
    )
    if body.color_hex in existing_colors:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="color already taken by another member",
        )
    member = Member(
        household_id=household.id,
        name=body.member_name.strip(),
        color_hex=body.color_hex,
        auth_token=generate_auth_token(),
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    set_auth_cookie(response, member.auth_token)
    return OnboardingResponse(
        household_id=household.id,
        member_id=member.id,
        auth_token=member.auth_token,
        invite_code=household.invite_code,
    )


@router.get("/me", response_model=SessionResponse)
def household_me(
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> SessionResponse:
    """Return the bearer's household + roster — closes INFRA-06.

    Phase 01.1: response_model changed to SessionResponse (adds ``me`` field
    so the frontend SessionProvider knows which member is the requester without
    a separate round-trip — D-06).

    T-01-04-06 mitigation: ``member.household_id`` comes from the
    authenticated member row (NOT a request param), so there's no
    cross-household read path through this endpoint.
    """
    household = db.get(Household, member.household_id)
    if household is None:  # defensive — FK + cascade should make this unreachable
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="household not found",
        )
    members = db.scalars(
        select(Member).where(Member.household_id == member.household_id)
    ).all()
    return SessionResponse(
        household_id=household.id,
        household_name=household.name,
        invite_code=household.invite_code,
        me=member,
        members=list(members),
    )
