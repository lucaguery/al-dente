"""WebSocket endpoint /ws?token=<auth_token>.

Flow: accept the handshake first, then validate the token. On missing/invalid
token, send a Close frame with code 1008 (policy violation per RFC 6455).
Calling ``close()`` before ``accept()`` while the socket is in CONNECTING state
is undefined behavior in Starlette — the close frame may be silently dropped
depending on Starlette version. The RFC 6455-compliant flow is: complete the
handshake, then send a Close frame so the client's ``websockets`` library
raises ``ConnectionClosedError(1008)`` deterministically.

Channel keying: ``member.household_id`` (server-trusted, derived from the
token's Member row — never a client-supplied query param). REALTIME-01.

Per CONTEXT.md "Claude's Discretion" — single-process Dict[household_id, Set]
registry in services/realtime.py. NO external pub/sub in v0.1.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select

from app.auth import AUTH_COOKIE_NAME
from app.db import SessionLocal
from app.services.realtime import registry

log = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str | None = Query(default=None),
) -> None:
    # Lazy import to mirror app.auth.current_member's pattern (avoid circular
    # imports during alembic env setup, which loads app.models via app.db
    # before this module would otherwise be imported).
    from app.models.member import Member  # noqa: PLC0415

    # Accept FIRST, then close with 1008 on bad token. T-01-05-01 mitigation.
    await websocket.accept()

    # Cookie wins over ?token= per D-05. Starlette exposes the upgrade
    # request's cookies on websocket.cookies (a dict[str, str]).
    cookie_token = websocket.cookies.get(AUTH_COOKIE_NAME)
    if cookie_token:
        token = cookie_token

    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Synchronous DB lookup is fine here — couple-scale traffic, one query
    # per connect. We open a session directly rather than using
    # ``Depends(get_db)`` because FastAPI's WebSocket dependency injection
    # has known limitations and this is a one-shot read.
    with SessionLocal() as db:
        member = db.scalar(select(Member).where(Member.auth_token == token))
    if member is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    household_id = member.household_id

    # Register only AFTER auth passes — defense-in-depth (T-01-05-02). The
    # channel key is the server-trusted household_id, never a client param.
    await registry.register(household_id, websocket)

    try:
        # Keep the socket open. Clients send no messages in v0.1 (broadcasts
        # are server→client only). receive_text() blocks until the client
        # disconnects, at which point we drop into the except branch.
        while True:
            # If a client sends a frame we silently discard it. Future
            # presence/typing indicators would consume this channel.
            await websocket.receive_text()
    except WebSocketDisconnect:
        log.info("ws.disconnect household=%s member=%s", household_id, member.id)
    except Exception as exc:  # noqa: BLE001
        log.warning(
            "ws.error household=%s member=%s err=%s",
            household_id,
            member.id,
            exc,
        )
    finally:
        await registry.unregister(household_id, websocket)
