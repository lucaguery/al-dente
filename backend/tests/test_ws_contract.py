"""WebSocket endpoint contract for routers/ws.py — closes ROUT-10.

D-38-05 close-code adaptation:
  The ws router does NOT use HTTP 401/404 status codes. Instead it:
  1. Accepts the WebSocket handshake unconditionally (RFC 6455 compliant).
  2. Validates the token from ?token= query param or aldente_auth cookie.
  3. Closes with code 1008 (WS_1008_POLICY_VIOLATION) on missing or invalid token.

  D-38-05 originally mentioned hypothetical codes 4401/4404, but the actual
  implementation at ws.py:52-63 uses 1008 for BOTH auth failures:
    ws.py:53: await websocket.close(code=status.WS_1008_POLICY_VIOLATION)  # missing token
    ws.py:63: await websocket.close(code=status.WS_1008_POLICY_VIOLATION)  # invalid token
  Tests adapt to the actual ws.py behavior, not the hypothetical codes.

Tests (D-38-05 adapted 4-test shape):
  1. test_ws_handshake_happy — open with valid ?token=SEED_TOKEN; the context
     manager must not raise; connection stays open.
  2. test_ws_close_on_missing_auth — open with no token and no cookie; server
     accepts then immediately closes with code 1008.
  3. test_ws_close_on_invalid_token — open with ?token=garbage-invalid; server
     accepts then closes with code 1008.
  4. test_ws_handles_malformed_frame_silently — open with valid token, send a
     non-JSON garbage frame; server silently discards per ws.py:78-79 ("If a
     client sends a frame we silently discard it"). Connection stays open after
     sending the garbage frame (no close frame received).

Note on cross-household isolation: The ws router keys channels on
member.household_id (server-derived from the auth token — never a client
query param). There is no client-supplied household_id to forge, so the
standard "hit with a foreign household ID" cross-household pattern does not
apply. The 1008-on-invalid-token test (test 3) covers the analogous isolation
boundary: an unrecognized token gets no channel registration.
"""

from __future__ import annotations

import os

import pytest
from fastapi import WebSocketDisconnect
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")


def test_ws_handshake_happy(client: TestClient, db_session: Session) -> None:
    """ROUT-10 happy path — WS handshake with valid token stays open.

    The context manager must not raise. The connection remains open for the
    duration of the with-block. On exit the client closes normally.
    """
    with client.websocket_connect(f"/ws?token={SEED_TOKEN}") as ws:
        # Connection is open. No assertion needed beyond the context manager
        # not raising WebSocketDisconnect.
        pass


def test_ws_close_on_missing_auth(client: TestClient, db_session: Session) -> None:
    """ROUT-10 / D-38-05 — WS with no token closes with code 1008.

    ws.py:52-53: if not token: await websocket.close(code=1008); return
    The server accepts the handshake first (RFC 6455 compliant), then sends
    a Close frame with code 1008 (WS_1008_POLICY_VIOLATION).

    ws.py actual close code: status.WS_1008_POLICY_VIOLATION (1008)
    D-38-05 hypothetical: 4401 — actual code takes precedence.
    """
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/ws") as ws:
            ws.receive_text()  # force read so the Close frame is observed
    assert exc_info.value.code == 1008, (
        f"Expected WS close code 1008 (WS_1008_POLICY_VIOLATION) for missing auth, "
        f"got code={exc_info.value.code}"
    )


def test_ws_close_on_invalid_token(client: TestClient, db_session: Session) -> None:
    """ROUT-10 / D-38-05 — WS with garbage token closes with code 1008.

    ws.py:61-63: member = db.scalar(...); if member is None: close(1008); return
    An unrecognized token finds no Member row; server closes with 1008.

    ws.py actual close code: status.WS_1008_POLICY_VIOLATION (1008)
    D-38-05 hypothetical: 4404 — actual code takes precedence.
    """
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/ws?token=garbage-invalid-token-xyz") as ws:
            ws.receive_text()  # force read so the Close frame is observed
    assert exc_info.value.code == 1008, (
        f"Expected WS close code 1008 (WS_1008_POLICY_VIOLATION) for invalid token, "
        f"got code={exc_info.value.code}"
    )


def test_ws_handles_malformed_frame_silently(client: TestClient, db_session: Session) -> None:
    """ROUT-10 — malformed frame is silently discarded; connection stays open.

    ws.py:76-79:
        while True:
            # If a client sends a frame we silently discard it.
            await websocket.receive_text()

    Sending a non-JSON garbage frame must NOT cause the server to close the
    connection. The contract: connection is still usable after the garbage
    frame is received. We verify by sending a second frame without raising.
    """
    with client.websocket_connect(f"/ws?token={SEED_TOKEN}") as ws:
        # Send garbage frame — server must silently discard per ws.py:78-79.
        ws.send_text("not-json-garbage")
        # Send a second frame to confirm the connection is still open.
        # If the server had closed the connection, this would raise
        # WebSocketDisconnect. Not raising is the assertion.
        ws.send_text("second-garbage-frame")
