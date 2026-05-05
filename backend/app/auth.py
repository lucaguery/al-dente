"""Bearer-token authentication.

INFRA-06: any request without a valid Bearer token to a protected route returns 401.
Auth-token format per CONTEXT.md "Claude's Discretion": opaque base64url, 32 bytes
(43 chars after encoding), generated server-side via ``secrets.token_urlsafe(32)``.
"""

import secrets

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db


def generate_auth_token() -> str:
    """Generate a fresh opaque bearer token (256 bits of entropy)."""
    return secrets.token_urlsafe(32)


def _extract_bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing bearer token",
        )
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="empty bearer token",
        )
    return token


def current_member(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """Return the ``Member`` matching the request's Bearer token, or raise 401.

    Imported lazily to avoid circular imports during ``alembic env`` setup
    (Alembic loads ``app.models`` via ``app.db`` before this module's caller
    chain has a chance to trigger ORM mapping).
    """
    from app.models.member import Member  # noqa: PLC0415 — lazy import is intentional

    token = _extract_bearer(authorization)
    member = db.scalar(select(Member).where(Member.auth_token == token))
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid token",
        )
    return member
