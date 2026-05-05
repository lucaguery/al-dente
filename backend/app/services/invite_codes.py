"""Invite-code generator with collision-retry.

Per CONTEXT.md "Claude's Discretion" — Invite-code format:
- 6 characters, uppercase alphanumeric (36-char alphabet → 36^6 = 2.18B keyspace)
- Generated server-side, unique per household, regenerable
- Collision-retry on insert (defensive cap of 10 attempts; at couple-scale,
  reaching 10 collisions before a unique code requires ~10^59 existing rows)

T-01-04-02 mitigation: ``secrets.choice`` provides cryptographic randomness
so invite codes resist brute-force enumeration within the bounded keyspace.
"""

from __future__ import annotations

import secrets
import string

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.household import Household

INVITE_CODE_ALPHABET = string.ascii_uppercase + string.digits  # 36 chars
INVITE_CODE_LENGTH = 6


def _make_code() -> str:
    """Return a fresh random 6-char uppercase alphanumeric code."""
    return "".join(
        secrets.choice(INVITE_CODE_ALPHABET) for _ in range(INVITE_CODE_LENGTH)
    )


def generate_unique_invite_code(db: Session, *, max_attempts: int = 10) -> str:
    """Return a 6-char uppercase alphanumeric code that does not collide with
    any existing ``households.invite_code``.

    Retries up to ``max_attempts`` times before raising ``RuntimeError``. The
    ``db.scalar`` lookup uses the unique index on ``households.invite_code``
    so the existence check is O(log n) at worst.
    """
    for _ in range(max_attempts):
        code = _make_code()
        existing = db.scalar(
            select(Household.id).where(Household.invite_code == code)
        )
        if existing is None:
            return code
    raise RuntimeError("invite-code collision retries exhausted")
