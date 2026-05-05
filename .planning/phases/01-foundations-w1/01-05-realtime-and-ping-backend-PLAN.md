---
phase: 01-foundations-w1
plan: 05
plan_number: 5
slug: realtime-and-ping-backend
type: execute
wave: 4
depends_on: [onboarding-backend]
files_modified:
  - backend/app/main.py
  - backend/app/routers/ws.py
  - backend/app/routers/pings.py
  - backend/app/services/realtime.py
  - backend/app/schemas/ping.py
autonomous: true
requirements: [INFRA-05, REALTIME-01, REALTIME-02]
must_haves:
  truths:
    - "A WebSocket client at wss://<api>/ws?token=<auth_token> completes the handshake and is then authenticated; on success the socket is registered in a household-scoped channel, on missing/invalid token the server sends a Close frame with code 1008 (policy violation) per RFC 6455"
    - "POST /pings (Bearer) inserts a Ping row, broadcasts a {type:'ping.created', payload:{...}} JSON frame to every WebSocket in the same household, and returns 201"
    - "GET /pings (Bearer) returns the household's last 50 pings ordered by created_at desc"
    - "broadcast_to_household() in services/realtime.py is the single chokepoint every mutation router will call (recipe.created in 01-08; recipe.promoted in W2; vote.created in W3)"
    - "Cross-household isolation: a WS connected with member B's token does NOT receive household A's ping events"
  artifacts:
    - path: "backend/app/services/realtime.py"
      provides: "RealtimeRegistry singleton with register(), unregister(), broadcast_to_household()"
    - path: "backend/app/routers/ws.py"
      provides: "WebSocket endpoint /ws with query-param token auth"
    - path: "backend/app/routers/pings.py"
      provides: "POST /pings, GET /pings (the throwaway round-trip endpoint per D-01)"
    - path: "backend/app/schemas/ping.py"
      provides: "PingCreateRequest, PingResponse Pydantic schemas"
  key_links:
    - from: "backend/app/routers/pings.py"
      to: "backend/app/services/realtime.py"
      via: "await broadcast_to_household(member.household_id, 'ping.created', payload)"
      pattern: "broadcast_to_household"
    - from: "backend/app/routers/ws.py"
      to: "backend/app/services/realtime.py"
      via: "registry.register(household_id, websocket) on connect; unregister on disconnect"
      pattern: "register\\(.*household_id"
    - from: "backend/app/main.py"
      to: "backend/app/routers/ws.py"
      via: "app.include_router(ws.router)"
      pattern: "include_router.*ws"
---

<objective>
Wire the WebSocket realtime spine and the throwaway ping endpoint that proves the Vercel → Railway → Supabase → WebSocket loop works on both phones (the W1 first-concrete-action gate per SPEC.md). All three realtime contract events for v0.1 (`recipe.created`, `recipe.promoted` in W2, `vote.created` in W3) will route through the `broadcast_to_household` helper this plan introduces, so the channel-keying and reconnect contract becomes locked in here, not retrofitted later.

Per CONTEXT.md D-01, the `pings` table + endpoints are deleted in plan 01-11 once the round-trip gate passes on both phones — the `# TODO(productize)` comment already lives on the Ping model from 01-03.

Purpose: INFRA-05 (server side; UI side in 01-07), REALTIME-01 (household-scoped WS channel), REALTIME-02 (broadcast helper for `recipe.created` etc — full contract defined here, exercised by `recipe.created` in 01-08).
Output: A live `wss://<railway>/ws?token=...` that survives a `curl -X POST /pings` round-trip; a `services/realtime.py` helper every later router will import.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundations-w1/01-CONTEXT.md
@.planning/phases/01-foundations-w1/01-UI-SPEC.md
@SPEC.md
@CLAUDE.md
@backend/app/main.py
@backend/app/auth.py
@backend/app/db.py
@backend/app/models/ping.py
@backend/app/models/member.py
</context>

<interfaces>
From 01-03 backend-scaffold:
- `app.models.Ping(id, household_id, sent_by_member_id, note, created_at)` with the `# TODO(productize): D-01` cleanup marker already in place.
- `app.auth.current_member` for HTTP routes; this plan ALSO needs token validation on a WebSocket connect, which does NOT use `Depends(current_member)` (FastAPI's WS path takes the token off the query string).

From 01-04 onboarding-backend:
- `Member` rows exist with `auth_token` populated; `household_id` is the channel-keying axis.

CONTEXT.md locked decisions consumed here:
- "WebSocket auth — `wss://.../ws?token=<auth_token>`, validated on connect. Channel keyed on `member.household_id`. Server-side `Dict[household_id, Set[WebSocket]]` in `services/realtime.py`. NO external pub/sub."
- "Reconnect-with-backoff — Exponential 250ms→500→1s→2s→5s, cap at 5s, infinite retries." (FE side; this plan only ensures server cleanly closes broken sockets so the FE retry logic has something deterministic to react to.)

This plan creates the contract that 01-08 (recipes router) and W2/W3 routers consume:
- `await broadcast_to_household(household_id: UUID, event_type: str, payload: dict) -> None` — fire-and-forget; on per-socket send failure, log + unregister, never raise.
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: services/realtime.py registry + ws.py endpoint with token-on-connect auth</name>
  <files>backend/app/services/realtime.py, backend/app/routers/ws.py</files>
  <read_first>
    - .planning/phases/01-foundations-w1/01-CONTEXT.md §"Claude's Discretion" — WebSocket auth pattern (`?token=<auth_token>`), channel keying on `member.household_id`, single-process `Dict[household_id, Set[WebSocket]]` registry
    - SPEC.md §"Voting" Realtime contract paragraph (event types: `recipe.created`, `recipe.promoted`, `vote.created` — this plan defines the broadcast spine; events are emitted by their respective routers in later plans)
    - CLAUDE.md "Architecture invariants" #4 — every household-syncing mutation MUST broadcast
    - For FastAPI WebSocket patterns (accept, receive_text, await close with code, exception flow), query Context7 (`mcp__context7__`) with the installed FastAPI version. If unavailable, read `backend/.venv/lib/python3.12/site-packages/starlette/websockets.py` for the `WebSocket.accept`, `close(code=...)`, and `state.WebSocketState` API — Starlette is FastAPI's WS layer.
  </read_first>
  <action>
    **`backend/app/services/realtime.py`** — async-safe in-process registry:
    ```python
    """Household-scoped WebSocket broadcast registry.

    Single-process design (per CONTEXT.md "NO external pub/sub"). Acceptable
    for v0.1 where Railway runs one container; if Railway scales out, this
    needs Redis pub-sub or Supabase Realtime — productize-later.
    """
    from __future__ import annotations
    import asyncio
    import json
    import logging
    from collections import defaultdict
    from typing import Any, DefaultDict, Set
    from uuid import UUID

    from fastapi import WebSocket
    from starlette.websockets import WebSocketState

    log = logging.getLogger(__name__)


    class RealtimeRegistry:
        def __init__(self) -> None:
            self._channels: DefaultDict[UUID, Set[WebSocket]] = defaultdict(set)
            self._lock = asyncio.Lock()

        async def register(self, household_id: UUID, ws: WebSocket) -> None:
            async with self._lock:
                self._channels[household_id].add(ws)
            log.info("ws.register household=%s peers=%d", household_id, len(self._channels[household_id]))

        async def unregister(self, household_id: UUID, ws: WebSocket) -> None:
            async with self._lock:
                self._channels[household_id].discard(ws)
                if not self._channels[household_id]:
                    self._channels.pop(household_id, None)
            log.info("ws.unregister household=%s", household_id)

        async def broadcast_to_household(
            self,
            household_id: UUID,
            event_type: str,
            payload: dict[str, Any],
        ) -> None:
            """Fan out one JSON frame to every connected WS in the household.
            Per-socket send failures unregister the socket and continue — never raise."""
            frame = json.dumps({"type": event_type, "payload": payload}, default=str)
            async with self._lock:
                peers = list(self._channels.get(household_id, ()))
            for ws in peers:
                try:
                    if ws.application_state != WebSocketState.CONNECTED:
                        await self.unregister(household_id, ws)
                        continue
                    await ws.send_text(frame)
                except Exception as exc:  # noqa: BLE001 — broad-catch is intentional
                    log.warning("ws.send failed household=%s err=%s", household_id, exc)
                    await self.unregister(household_id, ws)


    # Module-level singleton — imported by routers.
    registry = RealtimeRegistry()


    async def broadcast_to_household(
        household_id: UUID,
        event_type: str,
        payload: dict[str, Any],
    ) -> None:
        """Convenience export so routers don't import the singleton directly."""
        await registry.broadcast_to_household(household_id, event_type, payload)
    ```

    **`backend/app/routers/ws.py`** — WebSocket endpoint with token-on-connect:
    ```python
    """WebSocket endpoint /ws?token=<auth_token>

    Flow: accept the handshake first, then validate the token. On missing/invalid
    token, send a Close frame with code 1008 (policy violation per RFC 6455).
    Calling close() before accept() in Starlette is undefined behavior, so we
    accept-then-close even though it costs one extra round-trip on rejection.
    Channel keyed on member.household_id (REALTIME-01). Per CONTEXT.md, NO
    external pub/sub — single-process Dict registry (services/realtime.py).
    """
    from __future__ import annotations
    import logging
    from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status
    from sqlalchemy import select

    from app.db import SessionLocal
    from app.models.member import Member
    from app.services.realtime import registry

    log = logging.getLogger(__name__)
    router = APIRouter()


    @router.websocket("/ws")
    async def websocket_endpoint(
        websocket: WebSocket,
        token: str | None = Query(default=None),
    ) -> None:
        # Accept FIRST, then close with 1008 on bad token. Calling close() before
        # accept() while the socket is in CONNECTING state is undefined behavior in
        # Starlette (the close frame may not be transmitted depending on version).
        # The RFC 6455-compliant flow is: complete the handshake, then send a Close
        # frame with policy-violation code so the client's `websockets` library
        # raises ConnectionClosedError(1008) deterministically.
        await websocket.accept()

        # 1. Validate token. Close with 1008 on missing/invalid.
        if not token:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Synchronous DB lookup is fine here — couple-scale traffic, one query per connect.
        with SessionLocal() as db:
            member = db.scalar(select(Member).where(Member.auth_token == token))
        if member is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        household_id = member.household_id

        # 2. Register (already accepted above).
        await registry.register(household_id, websocket)

        try:
            # 3. Keep the socket open — clients send no messages in v0.1
            # (broadcasts are server→client only). receive_text() blocks until
            # the client disconnects, at which point we drop into except.
            while True:
                # We don't expect messages, but if a client sends one we
                # silently discard. (Future: client-initiated typing indicators
                # or "I'm voting" presence pings would consume this channel.)
                await websocket.receive_text()
        except WebSocketDisconnect:
            log.info("ws.disconnect household=%s member=%s", household_id, member.id)
        except Exception as exc:  # noqa: BLE001
            log.warning("ws.error household=%s member=%s err=%s", household_id, member.id, exc)
        finally:
            await registry.unregister(household_id, websocket)
    ```

    Three notes on the design:
    - We import `SessionLocal` directly rather than `Depends(get_db)` because FastAPI's WebSocket dependency injection has limitations and the lookup is one-shot — opening a session, doing one read, closing it is the simpler pattern.
    - We `accept()` BEFORE the auth check (and before `register()`). Starlette's `WebSocket.close(code=...)` while the connection is in CONNECTING state is undefined behavior — the close frame may be silently dropped depending on Starlette version. Accepting first guarantees the client receives the 1008 close frame and the `websockets` client raises `ConnectionClosedError(1008)` deterministically. The `application_state == CONNECTED` invariant required by `send_text` is also satisfied.
    - We do NOT call `await registry.register` until AFTER auth passes — an unauthenticated socket should never enter the broadcast set (defense-in-depth even though the channel is keyed on a server-trusted `member.household_id`).
  </action>
  <verify>
    <automated>cd backend && test -f app/services/realtime.py && test -f app/routers/ws.py && grep -q "broadcast_to_household" app/services/realtime.py && grep -q "RealtimeRegistry" app/services/realtime.py && grep -q "asyncio.Lock" app/services/realtime.py && grep -q "WS_1008_POLICY_VIOLATION" app/routers/ws.py && grep -q "registry.register" app/routers/ws.py && grep -q "registry.unregister" app/routers/ws.py && grep -q "auth_token" app/routers/ws.py && uv run python -c "import asyncio; from app.services.realtime import registry, broadcast_to_household; from uuid import uuid4; hh=uuid4(); asyncio.run(broadcast_to_household(hh, 'noop', {'k':1})); print('OK no peers, broadcast did not raise')"</automated>
  </verify>
  <done>Registry and WS router files exist; smoke-test confirms broadcast with zero peers does not raise; token policy-violation close code is referenced; lock-protected channel set is in place.</done>
</task>

<task type="auto">
  <name>Task 2: pings router (POST + GET) and main.py mounts; round-trip smoke test with websockets client</name>
  <files>backend/app/main.py, backend/app/routers/pings.py, backend/app/schemas/ping.py</files>
  <read_first>
    - .planning/phases/01-foundations-w1/01-CONTEXT.md §"Ping test lifecycle" (D-01 — keep this code minimal; it gets deleted in 01-11)
    - SPEC.md §"First concrete action: deploy the skeleton + ping test" (the 6-step gate)
    - backend/app/models/ping.py (the Ping ORM with `# TODO(productize): D-01` marker)
    - For pytest-style WebSocket smoke testing with Starlette's TestClient + the `websocket_connect` context manager, query Context7 (`mcp__context7__`). If unavailable, read `backend/.venv/lib/python3.12/site-packages/starlette/testclient.py`.
  </read_first>
  <action>
    **`backend/app/schemas/ping.py`**:
    ```python
    # TODO(productize): D-01 — entire file deleted by plan 01-11 after round-trip gate.
    from datetime import datetime
    from uuid import UUID
    from pydantic import BaseModel, Field

    class PingCreateRequest(BaseModel):
        note: str | None = Field(default=None, max_length=120)

    class PingResponse(BaseModel):
        id: UUID
        household_id: UUID
        sent_by_member_id: UUID
        note: str | None
        created_at: datetime

        model_config = {"from_attributes": True}
    ```

    **`backend/app/routers/pings.py`**:
    ```python
    # TODO(productize): D-01 — entire file deleted by plan 01-11 after round-trip gate.
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
        ping = Ping(
            household_id=member.household_id,
            sent_by_member_id=member.id,
            note=body.note,
        )
        db.add(ping)
        db.commit()
        db.refresh(ping)
        # REALTIME-02: broadcast to every connected client in the household.
        # The frontend listens for {type:'ping.created'} on the WS and updates the list.
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
        rows = db.scalars(
            select(Ping)
            .where(Ping.household_id == member.household_id)
            .order_by(Ping.created_at.desc())
            .limit(50)
        ).all()
        return [PingResponse.model_validate(r) for r in rows]
    ```

    **Edit `backend/app/main.py`** — add (do NOT remove existing households mount):
    ```python
    from app.routers import households, pings, ws  # ws router uses websocket() not get/post
    app.include_router(households.router)  # already in 01-04
    app.include_router(pings.router)
    app.include_router(ws.router)
    ```
    The `ws.router` uses `@router.websocket("/ws")` so it does NOT need a prefix. After mount, `wss://<railway>/ws?token=...` is the live endpoint.

    **Round-trip smoke test** — run from a fresh shell (executor must have `backend/.env` with `DATABASE_URL`):
    ```bash
    cd backend
    uv run uvicorn app.main:app --port 8001 &
    UVICORN_PID=$!
    sleep 2

    BASE=http://localhost:8001
    WS_BASE=ws://localhost:8001

    # Create two members in a household to get two tokens.
    CREATE=$(curl -sS -X POST $BASE/households -H "Content-Type: application/json" \
      -d '{"household_name":"WS Smoke","member_name":"A","color_hex":"#F43F5E"}')
    TOKEN_A=$(printf '%s' "$CREATE" | python -c 'import sys,json;print(json.load(sys.stdin)["auth_token"])')
    HID=$(printf '%s' "$CREATE" | python -c 'import sys,json;print(json.load(sys.stdin)["household_id"])')
    CODE=$(printf '%s' "$CREATE" | python -c 'import sys,json;print(json.load(sys.stdin)["invite_code"])')
    JOIN=$(curl -sS -X POST $BASE/households/join -H "Content-Type: application/json" \
      -d "{\"invite_code\":\"$CODE\",\"member_name\":\"B\",\"color_hex\":\"#10B981\"}")
    TOKEN_B=$(printf '%s' "$JOIN" | python -c 'import sys,json;print(json.load(sys.stdin)["auth_token"])')

    # WS round-trip: connect as B, POST a ping as A, expect B receives the frame within 1s.
    uv run python - <<PY
    import asyncio, json
    from contextlib import asynccontextmanager
    from websockets.asyncio.client import connect
    import urllib.request, urllib.error
    TOKEN_A = "$TOKEN_A"; TOKEN_B = "$TOKEN_B"
    async def main():
        async with connect(f"$WS_BASE/ws?token={TOKEN_B}") as ws:
            # POST ping as A
            req = urllib.request.Request("$BASE/pings", method="POST",
                data=b'{"note":"hello from A"}',
                headers={"Authorization": f"Bearer {TOKEN_A}", "Content-Type":"application/json"})
            urllib.request.urlopen(req).read()
            # Wait for the broadcast on B's socket
            frame = await asyncio.wait_for(ws.recv(), timeout=2.0)
            data = json.loads(frame)
            assert data["type"] == "ping.created", data
            assert data["payload"]["note"] == "hello from A", data
            print("OK round-trip", data["type"])

        # Negative: bad token closes immediately.
        try:
            async with connect(f"$WS_BASE/ws?token=BOGUS") as bad_ws:
                await bad_ws.recv()
                raise AssertionError("expected close on bad token")
        except Exception as exc:
            assert "1008" in str(exc) or "policy" in str(exc).lower() or "rejected" in str(exc).lower(), exc
            print("OK bad-token close")

    asyncio.run(main())
    PY

    kill $UVICORN_PID || true
    ```
    Add `websockets` to dev deps if not present: `uv add --dev websockets` (the `websockets` library is the standard async client; it's not a runtime dep since FastAPI's server uses Starlette's built-in WS support).

    Clean up the smoke-test rows in dev Supabase: `DELETE FROM pings; DELETE FROM members WHERE household_id IN (SELECT id FROM households WHERE name='WS Smoke'); DELETE FROM households WHERE name='WS Smoke';`

    Push to main; Railway auto-deploys. Manual sanity: from a local terminal, point the same Python script at `wss://<railway>/ws?token=...` and `https://<railway>/pings` to confirm the round-trip works through Railway's proxy (this is the server side of the INFRA-05 gate; the iPhone-Safari side is in 01-07 + the dogfood gate).
  </action>
  <verify>
    <automated>grep -q "from app.routers import households, pings, ws" backend/app/main.py && grep -q "app.include_router(pings.router)" backend/app/main.py && grep -q "app.include_router(ws.router)" backend/app/main.py && test -f backend/app/routers/pings.py && test -f backend/app/schemas/ping.py && grep -q "TODO(productize): D-01" backend/app/routers/pings.py && grep -q "TODO(productize): D-01" backend/app/schemas/ping.py && grep -q "broadcast_to_household" backend/app/routers/pings.py && cd backend && uv run python -c "from fastapi.testclient import TestClient; from app.main import app; c = TestClient(app); r = c.get('/pings'); assert r.status_code == 401, r.status_code; r2 = c.post('/pings', json={'note':'x'}); assert r2.status_code == 401, r2.status_code; print('OK', r.status_code, r2.status_code)"</automated>
  </verify>
  <done>main.py mounts pings + ws routers; TestClient confirms unauth → 401; the WebSocket round-trip Python script printed "OK round-trip ping.created" and "OK bad-token close"; smoke data cleaned; Railway picks up the deploy and the same script targeted at the prod URL works end-to-end.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → wss://<api>/ws | Token-on-connect via query string; missing/invalid → close 1008 |
| browser → POST /pings | Bearer header; rejected without it |
| WS frame → other clients in same household | Server-side fan-out; cross-household isolation enforced by the registry's household_id keying |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-01-05-01 | Spoofing | unauthenticated WS connect | high | mitigate | After the handshake completes (`accept()`), the token is validated (Task 1, ws.py); missing/invalid → `websocket.close(1008)` before any registry mutation. Verified by Task 2 round-trip script "OK bad-token close". The accept-then-close ordering is required because Starlette's close() in CONNECTING state is undefined behavior. |
| T-01-05-02 | Information Disclosure | cross-household WS leak (member of A receives household B's ping) | high | mitigate | `RealtimeRegistry._channels[household_id]` is the only fan-out keying axis; on connect we use `member.household_id` (NOT a client-supplied param). Channel set is `Dict[household_id, Set[WebSocket]]` (Task 1). |
| T-01-05-03 | Tampering | client-supplied household_id on connect query string | n/a | mitigate-by-design | The endpoint takes `?token=` only; `household_id` is derived server-side from the token's Member row. There is no client-supplied household_id input on /ws. |
| T-01-05-04 | Denial of Service | client opens many WS connections, exhausts memory | medium | accept | At couple-scale (2 phones × ≤2 simultaneous = 4 sockets), this is theoretical. No per-token connect limit in v0.1. Productize-later: rate-limit + max-connections-per-token. |
| T-01-05-05 | Tampering | broken socket left in registry consumes memory | low | mitigate | broadcast_to_household() unregisters on send failure (Task 1); `WebSocketDisconnect` finally-block also unregisters (Task 1, ws.py). |
| T-01-05-06 | Repudiation | no audit log of WS connect/disconnect | low | accept | `log.info` on register/unregister is captured in Railway stdout. Productize-later: structured event log. |
| T-01-05-07 | Information Disclosure | ping note field could carry XSS/payload | low | mitigate | Pydantic max_length=120; receiver renders as text (UI in 01-07 sets `textContent`, not innerHTML). The pings table is deleted in 01-11; this surface is gone before W2. |

`high` items (01, 02) both addressed in this plan.
</threat_model>

<verification>
Manual:
- Run the round-trip Python script from Task 2 against `localhost` and against the Railway URL after deploy. Both must print "OK round-trip" and "OK bad-token close".
- Tail Railway logs while running the script and confirm `ws.register household=...` and `ws.unregister household=...` log lines appear.

Coverage map:
- INFRA-05 ✓ Server side: POST /pings + WS broadcast verified end-to-end. (Iphone Safari side: 01-07 plus dogfood gate.)
- REALTIME-01 ✓ Both clients subscribe to a household-scoped channel after authenticating.
- REALTIME-02 ✓ Broadcast helper exists and is exercised by `ping.created`. Same helper will emit `recipe.created` (01-08), `recipe.promoted` (W2), `vote.created` (W3).
</verification>

<success_criteria>
INFRA-05 (server side), REALTIME-01, REALTIME-02 — all verified by the WebSocket round-trip smoke test passing locally and against Railway.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundations-w1/01-05-SUMMARY.md` documenting:
- The exact event-frame shape `{type: string, payload: object}` so 01-07 (FE ws client) and 01-08 (recipes broadcast) match it byte-for-byte.
- The WS auth pattern (`?token=` query param, close-1008-on-bad-token).
- A reminder that 01-11 deletes pings.py, schemas/ping.py, and the Ping model + migration.
</output>
