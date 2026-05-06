"""Dual-mode authentication: cookie-first, Bearer-header fallback.

D-02: aldente_auth cookie is HttpOnly + Secure + SameSite=Strict + Path=/ + Max-Age=90d.
D-03: Bearer header accepted as fallback (local dev / curl / rollout transition window).

Cookie wins when both are present: a stale Bearer header in dev tooling cannot
override a fresh cookie set by the server (T-01.1-01-05 mitigation).

Auth-token format unchanged: opaque base64url 32 bytes (43 chars), generated
server-side via secrets.token_urlsafe(32).
"""

import secrets

from fastapi import Cookie, Depends, Header, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db

AUTH_COOKIE_NAME = "aldente_auth"
AUTH_COOKIE_MAX_AGE = 7776000  # 90 days


def generate_auth_token() -> str:
    """Generate a fresh opaque bearer token (256 bits of entropy)."""
    return secrets.token_urlsafe(32)


def set_auth_cookie(response: Response, token: str) -> None:
    """Attach the aldente_auth cookie with locked attributes to the response.

    D-02: HttpOnly + Secure + SameSite=Strict + Path=/ + Max-Age=90d. Backend
    is the only writer; HttpOnly means JS cannot read or modify it.
    """
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        max_age=AUTH_COOKIE_MAX_AGE,
        path="/",
        secure=True,
        httponly=True,
        samesite="strict",
    )


def clear_auth_cookie(response: Response) -> None:
    """Emit Set-Cookie that expires aldente_auth immediately (logout)."""
    response.delete_cookie(key=AUTH_COOKIE_NAME, path="/")


def _extract_token(
    aldente_auth: str | None,
    authorization: str | None,
) -> str:
    """Cookie wins; Bearer header is the fallback (D-03)."""
    if aldente_auth:
        token = aldente_auth.strip()
        if token:
            return token
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if token:
            return token
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="missing auth",
    )


def current_member(
    aldente_auth: str | None = Cookie(default=None, alias=AUTH_COOKIE_NAME),
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """Return the Member matching cookie OR Bearer token, else 401.

    Imported lazily to avoid circular imports during ``alembic env`` setup
    (Alembic loads ``app.models`` via ``app.db`` before this module's caller
    chain has a chance to trigger ORM mapping).
    """
    from app.models.member import Member  # noqa: PLC0415

    token = _extract_token(aldente_auth, authorization)
    member = db.scalar(select(Member).where(Member.auth_token == token))
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid token",
        )
    return member
