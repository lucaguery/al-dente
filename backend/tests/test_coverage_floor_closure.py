"""Small targeted tests that push repo line+branch coverage over 85.00%.

Phase 39 close: after xfail markers + migration tests landed, the rounded-display
85.0% repo coverage was actually 84.99% which tripped fail_under=85. This file
covers the cheapest remaining gaps (1-2 statements / branches each) to push
solidly over the floor.

Out of scope: anything that requires app/ source modification.
"""
from __future__ import annotations

import asyncio
from uuid import uuid4

import pytest

from app.services.completeness import is_conflict
from app.services.realtime import RealtimeRegistry


def testis_conflict_unknown_field_returns_false():
    """Covers completeness.py:197 — the defensive return-False on unrecognized field."""
    assert is_conflict("nonexistent_field", "anything", "different") is False


class _FakeWebSocket:
    """Minimal stub for register/unregister — no real WebSocket needed."""

    def __init__(self) -> None:
        self.closed = False

    async def send_json(self, payload: dict) -> None:  # pragma: no cover - unused
        pass


def test_realtime_unregister_keeps_channel_when_other_peers_remain():
    """Covers realtime.py:60->62 branch — channel stays in _channels when peers > 0 after discard."""
    registry = RealtimeRegistry()
    household_id = uuid4()
    ws_a = _FakeWebSocket()
    ws_b = _FakeWebSocket()

    async def scenario() -> None:
        await registry.register(household_id, ws_a)  # type: ignore[arg-type]
        await registry.register(household_id, ws_b)  # type: ignore[arg-type]
        await registry.unregister(household_id, ws_a)  # type: ignore[arg-type]
        # Channel must still exist (ws_b is still connected) — exercises the
        # `if not self._channels[household_id]` FALSE branch (60->62).
        assert household_id in registry._channels  # noqa: SLF001 — direct introspect
        assert registry._channels[household_id] == {ws_b}  # noqa: SLF001

    asyncio.run(scenario())
