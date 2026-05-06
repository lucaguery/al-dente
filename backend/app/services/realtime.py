"""Household-scoped WebSocket broadcast registry.

Single-process design (per CONTEXT.md "Claude's Discretion" — "NO external
pub/sub"). Acceptable for v0.1 where Railway runs one container; if Railway
scales out, this needs Redis pub-sub or Supabase Realtime — productize-later.

REALTIME-02 contract — every mutation that must sync between phones routes
through ``broadcast_to_household(household_id, event_type, payload)``. The
v0.1 event types are (CLAUDE.md "Architecture invariants" #4):

    * ``recipe.created``   — routers/recipes.py (W1, plan 01-08)
    * ``recipe.promoted``  — capture-pipeline BackgroundTask (W2)
    * ``vote.created``     — votes router (W3)

Frame shape on the wire (must match frontend ws.ts byte-for-byte; see plan
01-07): ``{"type": "<event_type>", "payload": {...}}`` JSON-encoded text frame.
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
    """In-process ``Dict[household_id, Set[WebSocket]]`` registry.

    Channel keying on ``member.household_id`` (REALTIME-01) gives cross-household
    isolation by construction — a socket only ever receives frames broadcast
    against its own household_id (T-01-05-02 mitigation).
    """

    def __init__(self) -> None:
        self._channels: DefaultDict[UUID, Set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def register(self, household_id: UUID, ws: WebSocket) -> None:
        async with self._lock:
            self._channels[household_id].add(ws)
            peers = len(self._channels[household_id])
        log.info("ws.register household=%s peers=%d", household_id, peers)

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

        Per-socket send failures unregister the socket and continue — this
        method MUST NEVER raise (T-01-05-05 mitigation: dead sockets get
        cleaned out so the registry doesn't accumulate ghosts).
        """
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
                log.warning(
                    "ws.send failed household=%s err=%s", household_id, exc
                )
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
