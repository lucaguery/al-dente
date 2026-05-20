"""Push subscription request schema.

Wire shape mirrors PushSubscription.toJSON() output from the browser:
{
  "endpoint": "https://...",
  "keys": { "p256dh": "...", "auth": "..." },
  "expirationTime": null | number
}
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionRequest(BaseModel):
    """Body of POST /push/subscribe. Matches browser PushSubscription.toJSON()."""

    endpoint: str = Field(..., min_length=10, max_length=2048)
    keys: PushSubscriptionKeys
    expirationTime: int | None = None  # browser API uses camelCase here


class PushSubscribeResponse(BaseModel):
    ok: bool = True


class PushTestResponse(BaseModel):
    """VAL-03 — response from POST /push/test (admin fire-test).

    - fired_to: number of subscriptions pywebpush returned success for.
    - delivery_failures: number of subscriptions that raised WebPushException
      (other than 404/410, which are pruned and counted as 'cleaned' inside
      send_test_to_member, not as delivery failures).
    """

    fired_to: int
    delivery_failures: int
