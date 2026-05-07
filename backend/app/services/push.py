"""Web Push fan-out — STUB in Plan 02.

Plan 05 replaces this with the real pywebpush + VAPID fan-out and the
410/404 subscription cleanup. The signature is locked here so
generate_daily_shortlist can call it unconditionally.
"""
from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

log = logging.getLogger(__name__)


def send_push_to_household(
    household_id: UUID,
    payload: dict[str, Any],
    db: Session,
) -> None:
    """No-op stub — Plan 05 wires real fan-out.

    Logs at INFO so we can see when the cron tries to push during the
    Plan 02 → Plan 05 gap. Once Plan 05 lands, replace the body with the
    pywebpush loop from 03-RESEARCH.md Pattern 9.
    """
    log.info(
        "push.stub household=%s payload_keys=%s",
        household_id,
        list(payload.keys()),
    )
