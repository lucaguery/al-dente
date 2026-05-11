"""Web Push fan-out via pywebpush + VAPID.

Replaces the Plan 02 stub. Wire-format docs and patterns from
.planning/phases/03-decide-w3/03-RESEARCH.md §"Pattern 9".

The function MUST NOT raise on per-subscription failure. One stale
subscription cannot block the others. On 404 / 410 responses (the only
canonical "this endpoint is permanently dead" signals per RFC 8030), the
subscription row is deleted so the next fan-out doesn't keep trying.
"""
from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.member import Member
from app.models.push_subscription import PushSubscription

log = logging.getLogger(__name__)

# Lazy import so the module loads even before pywebpush is installed
# (Plan 01 adds it to pyproject.toml; Plan 05 ships the call sites).
try:
    from pywebpush import WebPushException, webpush  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover — defensive only
    webpush = None  # type: ignore[assignment]
    WebPushException = Exception  # type: ignore[assignment, misc]


def send_push_to_household(
    household_id: UUID,
    payload: dict[str, Any],
    db: Session,
) -> None:
    """Fan out a Web Push to every subscription belonging to a member of
    the given household. Best-effort: per-subscription errors are logged
    and swallowed; 404/410 responses delete the dead subscription row.

    Called by services/shortlist.py::generate_daily_shortlist on every
    successful shortlist generation (cron + regenerate paths).
    """
    if webpush is None:
        log.warning("pywebpush not installed; skipping push fan-out")
        return
    if not settings.vapid_private_key or not settings.vapid_email:
        log.warning(
            "VAPID env vars missing (private_key or email); skipping push"
        )
        return

    subs = list(
        db.scalars(
            select(PushSubscription)
            .join(Member, Member.id == PushSubscription.member_id)
            .where(Member.household_id == household_id)
        ).all()
    )
    if not subs:
        log.info(
            "push.fanout household=%s no subscriptions", household_id
        )
        return

    # Trim payload to canonical shape — service worker expects { title, body, url }.
    wire_payload = {
        "title": str(payload.get("title", "Al Dente"))[:128],
        "body": str(payload.get("body", ""))[:256],
        "url": str(payload.get("url", "/"))[:256],
    }
    body = json.dumps(wire_payload, separators=(",", ":"))

    delivered = 0
    cleaned = 0
    for sub in subs:
        try:
            webpush(
                subscription_info=sub.subscription,
                data=body,
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": f"mailto:{settings.vapid_email}"},
            )
            delivered += 1
        except WebPushException as exc:  # type: ignore[misc]
            status = (
                getattr(exc, "response", None) and exc.response.status_code
            )
            # T-03-05-04 mitigation: never log the full subscription endpoint
            # (token-grade secret per RFC 8030). Log only the row id + status.
            if status in (404, 410):
                db.delete(sub)
                cleaned += 1
                log.info(
                    "push.fanout cleaning sub=%s status=%s",
                    sub.id,
                    status,
                )
            else:
                log.warning(
                    "push.fanout failed sub=%s status=%s",
                    sub.id,
                    status,
                )
        except Exception as exc:  # noqa: BLE001 — never break on push
            log.warning(
                "push.fanout unexpected error sub=%s err=%s",
                sub.id,
                type(exc).__name__,
            )
    if cleaned:
        db.commit()
    log.info(
        "push.fanout household=%s delivered=%d cleaned=%d total=%d",
        household_id,
        delivered,
        cleaned,
        len(subs),
    )


def send_test_to_member(
    member_id: UUID,
    db: Session,
) -> tuple[int, int]:
    """VAL-03 — admin-test push fan-out scoped to a single member.

    Mirrors the wire pattern of send_push_to_household but DOES NOT broadcast
    via services/realtime (D-19-11). Hard-coded French payload per D-19-09.

    Returns (delivered, delivery_failures). 404/410 responses prune the dead
    subscription row (consistent with the fan-out path) and are NOT counted
    as failures.
    """
    if webpush is None:
        log.warning("pywebpush not installed; push.test skipping member=%s", member_id)
        return (0, 0)
    if not settings.vapid_private_key or not settings.vapid_email:
        log.warning("VAPID env vars missing; push.test skipping member=%s", member_id)
        return (0, 0)

    subs = list(
        db.scalars(
            select(PushSubscription).where(PushSubscription.member_id == member_id)
        ).all()
    )
    if not subs:
        log.info("push.test member=%s no subscriptions", member_id)
        return (0, 0)

    # Hard-coded admin-test payload per D-19-09. Non-localized — admin tool.
    wire_payload = {
        "title": "Test al dente",
        "body": "Notification de test depuis /styleguide",
        "url": "/",
    }
    body = json.dumps(wire_payload, separators=(",", ":"))

    delivered = 0
    failures = 0
    cleaned = 0
    for sub in subs:
        try:
            webpush(
                subscription_info=sub.subscription,
                data=body,
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": f"mailto:{settings.vapid_email}"},
            )
            delivered += 1
        except WebPushException as exc:  # type: ignore[misc]
            status = (
                getattr(exc, "response", None) and exc.response.status_code
            )
            if status in (404, 410):
                db.delete(sub)
                cleaned += 1
                log.info("push.test cleaning sub=%s status=%s", sub.id, status)
            else:
                failures += 1
                log.warning("push.test failed sub=%s status=%s", sub.id, status)
        except Exception as exc:  # noqa: BLE001 — never break on push
            failures += 1
            log.warning(
                "push.test unexpected error sub=%s err=%s",
                sub.id,
                type(exc).__name__,
            )
    if cleaned:
        db.commit()
    log.info(
        "push.test member=%s delivered=%d failures=%d cleaned=%d total=%d",
        member_id,
        delivered,
        failures,
        cleaned,
        len(subs),
    )
    return (delivered, failures)
