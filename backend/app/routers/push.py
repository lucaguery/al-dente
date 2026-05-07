"""Web Push subscription router.

POST /push/subscribe — accepts a browser PushSubscription.toJSON() shape,
upserts on the (member_id) UNIQUE constraint added in migration 0004 by
Plan 01.

GET /push/vapid-public-key — defense-in-depth runtime fetch for the
public key. Frontend prefers `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY`
(build-time embed); this endpoint is the fallback / verification path.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.auth import current_member
from app.config import settings
from app.db import get_db
from app.models.member import Member
from app.models.push_subscription import PushSubscription
from app.schemas.push import PushSubscribeResponse, PushSubscriptionRequest

log = logging.getLogger(__name__)
router = APIRouter(prefix="/push", tags=["push"])

# Trusted Push service hostnames (T-03-05-02 sanity check). Defensive only;
# the 404/410 cleanup catches truly-dead endpoints regardless.
_TRUSTED_PUSH_HOSTS = (
    "fcm.googleapis.com",
    "updates.push.services.mozilla.com",
    "web.push.apple.com",
)


@router.post("/subscribe", response_model=PushSubscribeResponse, status_code=201)
def subscribe(
    body: PushSubscriptionRequest,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    """Idempotent: upserts on member_id UNIQUE constraint."""
    # T-03-05-02: validate endpoint scheme + host (sanity, not security).
    endpoint = body.endpoint
    if not endpoint.startswith("https://"):
        raise HTTPException(400, "endpoint must be https://")
    if not any(host in endpoint for host in _TRUSTED_PUSH_HOSTS):
        log.warning(
            "push.subscribe unfamiliar endpoint host (still accepting) sub_member=%s",
            member.id,
        )

    # Pydantic v2 model_dump preserves the camelCase expirationTime key the
    # browser uses; webpush() reads the same shape.
    subscription_dict = body.model_dump()

    stmt = (
        pg_insert(PushSubscription)
        .values(member_id=member.id, subscription=subscription_dict)
        .on_conflict_do_update(
            index_elements=["member_id"],
            set_={
                "subscription": subscription_dict,
                "created_at": func.now(),
            },
        )
    )
    db.execute(stmt)
    db.commit()
    return PushSubscribeResponse(ok=True)


@router.get("/vapid-public-key")
def vapid_public_key(_member: Member = Depends(current_member)):
    """Public-key fetch endpoint (defense-in-depth)."""
    return {"public_key": settings.vapid_public_key or ""}
