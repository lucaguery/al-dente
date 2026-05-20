"""4-test endpoint contract for routers/push.py — closes ROUT-09.

The push router has three endpoints:
  POST /push/subscribe          — upsert a Web Push subscription for the caller
  GET  /push/vapid-public-key   — return VAPID public key (requires auth)
  POST /push/test               — admin fire-test (see test_push_test_endpoint.py)

Primary contract endpoint: POST /push/subscribe.

Tests (adapted 4-test shape):
  1. happy_path — POST /push/subscribe with valid https:// endpoint and keys
     returns 201 {"ok": True}.
  2. 401_missing_auth — POST /push/subscribe with no auth headers returns 401.
  3. cross_household_substitution — The push subscribe endpoint takes no
     household-scoped path or body parameter: it subscribes the authenticated
     member, not a resource identified by household ID. There is no
     cross-household 404 path in this router. The substitution test instead
     verifies that GET /push/vapid-public-key (a second authenticated endpoint)
     returns 401 on missing auth, exercising that ALL push endpoints enforce the
     auth gate. This substitution is documented here because there is genuinely
     no cross-household lookup in routers/push.py.
  4. 400_validation_endpoint_must_be_https — POST /push/subscribe with an
     http:// (non-https) endpoint returns 400 with detail "endpoint must be
     https://" (per push.py:54, explicit HTTPException(400, ...)).
     Note: the router uses HTTPException(400), not 422, for this guard.
"""

from __future__ import annotations

import os
import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")
AUTH_HEADERS = {"Authorization": f"Bearer {SEED_TOKEN}"}

# Minimal valid push subscription payload (https + trusted FCM host).
_VALID_SUBSCRIPTION = {
    "endpoint": f"https://fcm.googleapis.com/fcm/send/contract-test-{uuid.uuid4().hex[:8]}",
    "keys": {
        "p256dh": "fake-p256dh-key",
        "auth": "fake-auth-key",
    },
    "expirationTime": None,
}


def test_push_happy_path(client: TestClient, db_session: Session) -> None:
    """ROUT-09 happy path — POST /push/subscribe with valid payload returns 201.

    Uses a unique FCM endpoint URL per test run (uuid suffix) so the upsert
    does not collide with a subscription that might already exist for the
    seeded member from a prior test run that was not rolled back. The
    SAVEPOINT teardown will roll this back regardless.
    """
    resp = client.post(
        "/push/subscribe",
        json=_VALID_SUBSCRIPTION,
        headers=AUTH_HEADERS,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body == {"ok": True}, body


def test_push_401_missing_auth(client: TestClient, db_session: Session) -> None:
    """ROUT-09 — POST /push/subscribe with no Authorization header returns 401."""
    resp = client.post(
        "/push/subscribe",
        json=_VALID_SUBSCRIPTION,
    )
    assert resp.status_code == 401, resp.text


def test_push_vapid_public_key_401_missing_auth(client: TestClient, db_session: Session) -> None:
    """ROUT-09 cross-household substitution — GET /push/vapid-public-key without
    auth returns 401.

    The push subscribe endpoint takes no household-scoped resource ID, so
    there is no cross-household 404 path in this router. The substitution
    instead verifies that the second auth-gated push endpoint (GET
    /push/vapid-public-key) also enforces the 401 gate. Substitution is
    documented in this file's module docstring per Plan 38-03 direction.
    """
    resp = client.get("/push/vapid-public-key")
    assert resp.status_code == 401, resp.text


def test_push_400_endpoint_must_be_https(client: TestClient, db_session: Session) -> None:
    """ROUT-09 validation — POST /push/subscribe with http:// endpoint returns 400.

    push.py:54: raise HTTPException(400, "endpoint must be https://")
    This is an explicit HTTP 400 (not 422) — the router performs the check
    in the handler body, not via Pydantic field validation.
    """
    insecure_payload = {
        "endpoint": "http://insecure.example.com/push/fake-subscription",
        "keys": {
            "p256dh": "fake-p256dh-key",
            "auth": "fake-auth-key",
        },
        "expirationTime": None,
    }
    resp = client.post(
        "/push/subscribe",
        json=insecure_payload,
        headers=AUTH_HEADERS,
    )
    assert resp.status_code == 400, resp.text
    assert resp.json().get("detail") == "endpoint must be https://", resp.json()
