"""4-test endpoint contract for routers/auth_session.py — closes ROUT-02.

The auth_session router has two endpoints with special semantics:
  * DELETE /auth/session — unauthenticated, idempotent, always returns 200.
  * GET    /auth/ws-token — requires valid cookie OR Bearer auth; returns
    {"token": member.auth_token} for use in WebSocket ?token= query param.

Tests (adapted from the standard 4-test shape to session-router semantics):
  1. delete_session_unauthenticated_returns_200 — DELETE without any auth
     headers returns 200 {"ok": True}. Called twice to assert idempotency.
  2. ws_token_with_bearer_returns_token — GET /auth/ws-token with valid
     Bearer header returns 200 and the token matches SEED_TOKEN.
  3. ws_token_without_auth_returns_401 — GET /auth/ws-token with no auth
     headers returns 401.
  4. ws_token_with_malformed_bearer_returns_401 — GET /auth/ws-token with
     "NotBearer xyz" prefix returns 401 (auth-shape boundary / validation).

Note: auth_session has no household-scoped resource lookup so there is no
cross-household 404 case. The 4-test contract is adapted accordingly per
Plan 38-03 "ROUT-02 auth_session" locked description.
"""

from __future__ import annotations

import os

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")
AUTH_HEADERS = {"Authorization": f"Bearer {SEED_TOKEN}"}


def test_delete_session_unauthenticated_returns_200(
    client: TestClient, db_session: Session
) -> None:
    """ROUT-02 — DELETE /auth/session requires no auth and always returns 200.

    Idempotency: called twice; both must return 200 {"ok": True}.
    The endpoint clears the aldente_auth HttpOnly cookie without querying any
    member row, so an unauthenticated call must succeed.
    """
    resp = client.delete("/auth/session")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"ok": True}

    # Idempotent — second call is also 200.
    resp2 = client.delete("/auth/session")
    assert resp2.status_code == 200, resp2.text
    assert resp2.json() == {"ok": True}


def test_ws_token_with_bearer_returns_token(client: TestClient, db_session: Session) -> None:
    """ROUT-02 — GET /auth/ws-token with valid Bearer returns 200 + token.

    The returned token MUST match the seed member's auth_token (SEED_TOKEN),
    since the seeded member is the bearer's identity.
    """
    resp = client.get("/auth/ws-token", headers=AUTH_HEADERS)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "token" in body, body
    assert body["token"] == SEED_TOKEN, (
        f"Expected ws-token to match SEED_TOKEN={SEED_TOKEN!r}, got {body['token']!r}"
    )


def test_ws_token_without_auth_returns_401(client: TestClient, db_session: Session) -> None:
    """ROUT-02 — GET /auth/ws-token with no Authorization header returns 401.

    current_member dependency raises 401 on missing credentials.
    """
    resp = client.get("/auth/ws-token")
    assert resp.status_code == 401, resp.text


def test_ws_token_with_malformed_bearer_returns_401(
    client: TestClient, db_session: Session
) -> None:
    """ROUT-02 — GET /auth/ws-token with malformed Bearer prefix returns 401.

    'NotBearer xyz' is not a recognized auth scheme; current_member must
    reject it as an auth-shape boundary / validation case.
    """
    resp = client.get(
        "/auth/ws-token",
        headers={"Authorization": "NotBearer xyz"},
    )
    assert resp.status_code == 401, resp.text
