"""VAL-03 — POST /push/test admin endpoint behavior + no-broadcast invariant.

The endpoint is a member-scoped fire-test. Two assertions matter:
  1. It actually invokes pywebpush.webpush once per subscription owned by
     the calling member, with the canonical admin-test payload.
  2. It DOES NOT broadcast via services/realtime — this is the explicit
     carve-out from CLAUDE.md invariant #4 (D-19-11). Admin tool, not
     product event.
"""
from __future__ import annotations

import json
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.household import Household
from app.models.member import Member
from app.models.push_subscription import PushSubscription


@pytest.fixture
def seeded_member_with_subs(db_session: Session):
    """Seed a household + member + the (singleton) push subscription for that
    member.

    Note: push_subscriptions.member_id is UNIQUE (migration 0004 / Plan 01) —
    a member can hold at most ONE subscription. The loop in
    send_test_to_member is shaped for multi-sub safety regardless, and is
    structurally exercised here: 1 subscription -> fired_to == 1.

    Returns the auth_token to drive the request via the aldente_auth cookie.
    The db_session fixture rolls everything back at teardown.
    """
    household = Household(
        id=uuid4(),
        name="Test push household",
        invite_code="PUSH01",
        timezone="Europe/Paris",
    )
    db_session.add(household)
    db_session.flush()
    member = Member(
        id=uuid4(),
        household_id=household.id,
        name="Tester",
        color_hex="#F43F5E",
        auth_token="push-test-token-abc",
    )
    db_session.add(member)
    db_session.flush()
    db_session.add(
        PushSubscription(
            member_id=member.id,
            subscription={
                "endpoint": "https://fcm.googleapis.com/fcm/send/fake-0",
                "keys": {"p256dh": "fake-p256dh", "auth": "fake-auth"},
                "expirationTime": None,
            },
        )
    )
    db_session.flush()
    return {
        "auth_token": member.auth_token,
        "member_id": member.id,
        "sub_count": 1,
    }


def test_push_test_endpoint_fires(
    client: TestClient,
    seeded_member_with_subs: dict,
    monkeypatch: pytest.MonkeyPatch,
):
    """VAL-03 / D-19-08 — endpoint fires pywebpush once per subscription,
    returns {fired_to, delivery_failures}, and does NOT broadcast realtime."""
    webpush_calls: list[dict] = []

    def _fake_webpush(*, subscription_info, data, vapid_private_key, vapid_claims):
        webpush_calls.append(
            {
                "subscription_info": subscription_info,
                "data": data,
                "vapid_claims": vapid_claims,
            }
        )
        return None  # pywebpush returns Response — None passes the no-raise contract

    # Monkeypatch the SYMBOL the service module imported at module top
    # (services/push.py:30: `from pywebpush import WebPushException, webpush`).
    monkeypatch.setattr("app.services.push.webpush", _fake_webpush)

    # Make sure VAPID env is populated so the guard in send_test_to_member
    # doesn't short-circuit to (0, 0). Patch settings to known values.
    monkeypatch.setattr("app.services.push.settings.vapid_private_key", "fake-priv-key")
    monkeypatch.setattr("app.services.push.settings.vapid_email", "test@example.com")

    # No-broadcast invariant — monkeypatch the realtime symbol to a tracker.
    # If the route accidentally imports broadcast_to_household later, this
    # tracker would record the call and fail the assertion below.
    broadcast_calls: list[tuple] = []

    def _track_broadcast(*args, **kwargs):
        broadcast_calls.append((args, kwargs))

    monkeypatch.setattr(
        "app.services.realtime.broadcast_to_household", _track_broadcast
    )

    # Hit the endpoint via the aldente_auth cookie path.
    client.cookies.set("aldente_auth", seeded_member_with_subs["auth_token"])
    res = client.post("/push/test")

    assert res.status_code == 200, res.text
    body = res.json()
    expected_count = seeded_member_with_subs["sub_count"]
    assert body == {"fired_to": expected_count, "delivery_failures": 0}, body

    # webpush invoked once per subscription owned by the calling member.
    assert len(webpush_calls) == expected_count, webpush_calls
    for call in webpush_calls:
        wire = json.loads(call["data"])
        assert wire == {
            "title": "Test al dente",
            "body": "Notification de test depuis /styleguide",
            "url": "/",
        }, wire
        assert call["vapid_claims"] == {"sub": "mailto:test@example.com"}, call

    # No-broadcast invariant — admin test must NOT touch realtime.
    assert broadcast_calls == [], (
        f"VAL-03 / D-19-11 violation: POST /push/test broadcast via realtime "
        f"(should not — admin endpoint). Calls: {broadcast_calls}"
    )
