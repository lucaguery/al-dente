"""Household onboarding endpoints — ONBOARD-01/02/04/05 + INFRA-06 + IDM-01/03.

Five routes:
- ``POST /households`` — create household + creator member, mint auth_token,
  return invite_code (ONBOARD-01, ONBOARD-02).
- ``POST /households/join`` — second member joins via invite_code; rejects
  unknown codes (404), full households (422 HOUSEHOLD_FULL, IDM-03), and
  already-taken colors (409). ONBOARD-04, ONBOARD-05.
- ``GET /households/by-code/{code}`` — auth-free preview used by the join
  screen to render disabled swatches BEFORE the join attempt.
- ``GET /households/me`` — bearer-token-protected; closes the INFRA-06
  end-to-end verification (no router beyond /healthz existed before).
- ``PATCH /households/me`` — IDM-01 member rename. Member-scoped, enforces
  per-household name uniqueness, broadcasts ``member.updated`` (invariant #4).

The router is a thin HTTP adapter; secrets generation lives in
``app.auth.generate_auth_token`` and ``app.services.invite_codes``.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import current_member, generate_auth_token, set_auth_cookie
from app.colors import MEMBER_COLORS
from app.db import get_db
from app.models.cooking_log import CookingLog
from app.models.household import Household
from app.models.member import Member
from app.models.recipe import Recipe, RecipeStatus
from app.models.vote import Vote
from app.schemas.household import (
    CreateHouseholdRequest,
    HouseholdPreview,
    HouseholdStats,
    JoinHouseholdRequest,
    OnboardingResponse,
    SessionResponse,
)
from app.schemas.member import MemberPublic, MemberRenameRequest
from app.services.invite_codes import generate_unique_invite_code
from app.services.realtime import broadcast_to_household

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
    household = db.scalar(select(Household).where(Household.invite_code == normalized))
    if household is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="invite_code not found",
        )
    members = db.scalars(select(Member).where(Member.household_id == household.id)).all()
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

    ONBOARD-04 + IDM-03. Returns:
    - 404 if the invite_code does not match any household.
    - 422 with ``code=HOUSEHOLD_FULL`` if the household already has
      ``len(MEMBER_COLORS)`` (5) members (IDM-03, D-18-09/10). This gate
      runs BEFORE color uniqueness — capacity is the broader denial.
    - 409 if ``color_hex`` is already taken by an existing member.
    - 422 if ``color_hex`` is not in the locked palette (Pydantic-level).

    T-01-04-05 mitigation: ``existing_colors`` set check happens in the same
    transaction as the insert, so two simultaneous joins-with-the-same-color
    are serialized at the row level (rare at couple-scale, but free correctness).
    """
    household = db.scalar(select(Household).where(Household.invite_code == body.invite_code))
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

    # IDM-03 (D-18-09/10): capacity gate runs BEFORE the color check so a
    # 6th-member attempt gets the structured HOUSEHOLD_FULL error regardless
    # of which color they picked. The 422 status keeps the join surface's
    # error-handler shape consistent with Pydantic palette validation, but
    # the ``code`` discriminator lets the frontend pivot to the terminal
    # "Foyer complet" Card per D-18-12.
    member_count = db.scalar(
        select(func.count(Member.id)).where(Member.household_id == household.id)
    )
    if member_count is not None and member_count >= len(MEMBER_COLORS):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "detail": "household full",
                "code": "HOUSEHOLD_FULL",
                "max_members": len(MEMBER_COLORS),
            },
        )

    # Net-new member path — color uniqueness still applies.
    existing_colors = set(
        db.scalars(select(Member.color_hex).where(Member.household_id == household.id)).all()
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
    members = db.scalars(select(Member).where(Member.household_id == member.household_id)).all()
    return SessionResponse(
        household_id=household.id,
        household_name=household.name,
        invite_code=household.invite_code,
        me=member,
        members=list(members),
    )


@router.patch("/me", response_model=MemberPublic)
async def rename_me(
    body: MemberRenameRequest,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> MemberPublic:
    """Rename the authenticated member — IDM-01 (D-18-01..04).

    Member-scoped (``current_member``). Enforces per-household name uniqueness
    excluding the caller's own row (D-18-02) so a no-op rename to the current
    name is a valid 200 (idempotent). Broadcasts ``member.updated`` AFTER commit
    per invariant #4 so partner phones reconcile via RealtimeProvider (D-18-03).

    Pydantic strips whitespace + bounds 1..40 before this handler runs
    (MemberRenameRequest in app/schemas/member.py), so an empty / 41-char body
    short-circuits to 422 at validation.
    """
    new_name = body.name  # already stripped by Pydantic str_strip_whitespace
    # D-18-02: exclude the caller's own id so renaming to current name is a no-op
    # rather than a self-collision 409.
    dup = db.scalar(
        select(Member.id).where(
            Member.household_id == member.household_id,
            Member.name == new_name,
            Member.id != member.id,
        )
    )
    if dup is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="name already taken",
        )

    member.name = new_name
    db.add(member)
    db.commit()
    db.refresh(member)

    # D-18-03 / invariant #4: broadcast AFTER commit so subscribers never see
    # a state that the DB later rolls back. ``broadcast_to_household`` swallows
    # per-socket failures (services/realtime.py) so this await never raises.
    await broadcast_to_household(
        member.household_id,
        "member.updated",
        {
            "id": str(member.id),
            "name": member.name,
            "color_hex": member.color_hex,
        },
    )
    return MemberPublic.model_validate(member)


@router.get("/{household_id}/stats", response_model=HouseholdStats)
def household_stats(
    household_id: UUID,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> HouseholdStats:
    """Return three all-time household counts for the Profil stats block.

    Phase 40 PROF-01 (D-04, D-05). Filtered counts so the surface only shows
    "real" library activity:

    - ``recipes_count``: structured recipes only (drafts excluded — they live
      in the capture pipeline, not the library).
    - ``cooking_logs_count``: finalized sessions only. The canonical "is this
      a real cook" signal is ``rating IS NOT NULL`` (the COOK-02 finalization
      proxy from 03-RESEARCH §A5 — the schema has no ``finalized_at`` column;
      the rating PUT marks completion via PUT /cooking-logs/{id}).
    - ``votes_count``: all-time, no filtering. Votes have no "void" state, so
      every row counts. The ``Vote`` model has no direct ``household_id``
      column — join through ``Member`` to derive it.

    Invariant #4 enforcement: cross-household requests return 404 (not 403)
    so the endpoint never leaks the existence of foreign household IDs.
    """
    if member.household_id != household_id:
        # Invariant #4 — never 403: 404 keeps "your household? someone else's?"
        # indistinguishable from "nonexistent UUID".
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="household not found",
        )

    recipes_count = db.scalar(
        select(func.count(Recipe.id)).where(
            Recipe.household_id == household_id,
            Recipe.status == RecipeStatus.structured,
        )
    )
    cooking_logs_count = db.scalar(
        select(func.count(CookingLog.id)).where(
            CookingLog.household_id == household_id,
            CookingLog.rating.isnot(None),
        )
    )
    # Vote has no household_id column — join via Member to derive household scope.
    votes_count = db.scalar(
        select(func.count(Vote.id))
        .join(Member, Vote.member_id == Member.id)
        .where(Member.household_id == household_id)
    )
    return HouseholdStats(
        recipes_count=recipes_count or 0,
        cooking_logs_count=cooking_logs_count or 0,
        votes_count=votes_count or 0,
    )
