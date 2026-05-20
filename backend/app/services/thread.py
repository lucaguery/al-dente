"""Phase 26 — recipe conversation thread concurrency + security helpers.

Provides:

* `acquire_position_lock(recipe_id)` — per-recipe async lock for serializing
  the `max(position)+1` read and turn insert in the POST /turns endpoint.
  Honors invariant #7 (single uvicorn worker) — when Railway scales out, swap
  the body to `pg_advisory_xact_lock(hashtext(recipe_id::text))`. See D-18.

* `_is_safe_url(url)` — SSRF defense. Rejects RFC1918 / loopback / link-local
  IPs and known cloud metadata endpoints before httpx fetch. See RESEARCH
  §Area 5 / Risk R-9.

# TODO(productize): D-18 — swap WeakValueDictionary lock to
# pg_advisory_xact_lock(hashtext(recipe_id::text)) when Railway scales beyond
# one container. No API change needed.
"""

from __future__ import annotations

import asyncio
import ipaddress
import logging
import weakref
from urllib.parse import urlparse
from uuid import UUID

log = logging.getLogger(__name__)


# Phase 26 D-18 — per-recipe asyncio.Lock registry.
# WeakValueDictionary auto-cleans entries once no live reference holds the
# lock (RESEARCH §Area 3 verified WeakValueDictionary cleanup is deterministic
# under CPython refcounting). Local-var `lock` in the caller keeps it alive
# for the duration of the `async with` block; once that block exits and the
# function returns, the weak entry drops.
_position_locks: weakref.WeakValueDictionary[UUID, asyncio.Lock] = weakref.WeakValueDictionary()


async def acquire_position_lock(recipe_id: UUID) -> asyncio.Lock:
    """Return a per-recipe async lock for serializing position reads + inserts.

    Usage::

        lock = await acquire_position_lock(recipe_id)
        async with lock:
            # read max(position) + 1, insert turn

    Under invariant #7 (single uvicorn worker), this is sufficient to keep
    `(recipe_id, position)` collisions out of the DB unique-constraint path.
    The DB UNIQUE(recipe_id, position) constraint remains the backstop for
    any race that slips through (e.g., process restart mid-handler).
    """
    lock = _position_locks.get(recipe_id)
    if lock is None:
        lock = asyncio.Lock()
        _position_locks[recipe_id] = lock
    return lock


# Phase 26 — SSRF defense. Cheap (15-line) helper called before httpx.get()
# on the URL-turn extraction path (services/llm.extract_and_process_url_turn).
# Blocks RFC1918 + loopback + link-local IPs and known cloud metadata FQDNs.
# Reference: RESEARCH §Area 5, Risk R-9.
def _is_safe_url(url: str | None) -> bool:
    """Return True if `url` is safe to fetch; False otherwise.

    Blocks:
      * Loopback (127.0.0.0/8, ::1)
      * RFC1918 private ranges (10/8, 172.16/12, 192.168/16)
      * Link-local (169.254.0.0/16, including AWS/Railway metadata 169.254.169.254)
      * Unspecified (0.0.0.0, ::)
      * Multicast
      * Hostname literals 'localhost' / 'ip6-localhost' / 'metadata.google.internal'
      * Anything that fails to parse (empty, malformed, missing host)

    DNS rebinding (hostname resolves to private IP at fetch time) is NOT
    defended against — requires async DNS pre-resolution which is overkill
    at couple-scale. # TODO(productize): add DNS pre-resolve if user sentiment shifts.
    """
    if not url:
        return False
    try:
        parsed = urlparse(url)
    except Exception:  # noqa: BLE001
        return False
    if parsed.scheme not in ("http", "https"):
        return False
    host = parsed.hostname
    if not host:
        return False
    # IP literal path
    try:
        ip = ipaddress.ip_address(host)
        if (
            ip.is_loopback
            or ip.is_private
            or ip.is_link_local
            or ip.is_unspecified
            or ip.is_multicast
        ):
            return False
        return True
    except ValueError:
        # Hostname — block explicit metadata FQDNs by literal match.
        lower = host.lower()
        if lower in ("localhost", "ip6-localhost", "ip6-loopback"):
            return False
        if lower in ("metadata.google.internal", "169.254.169.254"):
            return False
        return True
