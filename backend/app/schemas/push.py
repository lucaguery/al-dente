"""Push subscription request schema.

Wire shape mirrors PushSubscription.toJSON() output from the browser:
{
  "endpoint": "https://...",
  "keys": { "p256dh": "...", "auth": "..." },
  "expirationTime": null | number
}
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionRequest(BaseModel):
    """Body of POST /push/subscribe. Matches browser PushSubscription.toJSON()."""

    endpoint: str = Field(..., min_length=10, max_length=2048)
    keys: PushSubscriptionKeys
    expirationTime: Optional[int] = None  # browser API uses camelCase here


class PushSubscribeResponse(BaseModel):
    ok: bool = True
