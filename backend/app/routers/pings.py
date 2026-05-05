# TODO(productize): D-01 — entire file deleted by plan 01-12 (dogfood-cleanup)
# after the round-trip gate passes on both phones.
"""Throwaway ping endpoint.

Proves the Vercel → Railway → Supabase → WebSocket loop end-to-end (SPEC.md
§"First concrete action"). On ``POST /pings`` we insert a Ping row, broadcast
``ping.created`` to every WS in the household, and return 201. ``GET /pings``
returns the household's last 50 rows for verification UI in plan 01-07.

Cross-household isolation is enforced by deriving ``household_id`` from the
bearer-authenticated Member (never a client-supplied parameter — T-01-05-02).
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import current_member
from app.db import get_db
from app.models.member import Member
from app.models.ping import Ping
from app.schemas.ping import PingCreateRequest, PingResponse
from app.services.realtime import broadcast_to_household

router = APIRouter(prefix="/pings", tags=["pings"])


@router.post("", response_model=PingResponse, status_code=status.HTTP_201_CREATED)
async def create_ping(
    body: PingCreateRequest,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> PingResponse:
    """Insert a Ping and fan-out a ``ping.created`` event to the household."""

    ping = Ping(
        household_id=member.household_id,
        sent_by_member_id=member.id,
        note=body.note,
    )
    db.add(ping)
    db.commit()
    db.refresh(ping)

    # REALTIME-02: every connected WS in the household receives this frame.
    # Frame shape ({"type": ..., "payload": ...}) is the contract consumed
    # byte-for-byte by the frontend ws client (plan 01-07).
    await broadcast_to_household(
        member.household_id,
        "ping.created",
        {
            "id": str(ping.id),
            "household_id": str(ping.household_id),
            "sent_by_member_id": str(ping.sent_by_member_id),
            "note": ping.note,
            "created_at": ping.created_at.isoformat(),
        },
    )
    return PingResponse.model_validate(ping)


@router.get("", response_model=List[PingResponse])
def list_pings(
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> List[PingResponse]:
    """Return the household's last 50 pings, newest first."""

    rows = db.scalars(
        select(Ping)
        .where(Ping.household_id == member.household_id)
        .order_by(Ping.created_at.desc())
        .limit(50)
    ).all()
    return [PingResponse.model_validate(r) for r in rows]
