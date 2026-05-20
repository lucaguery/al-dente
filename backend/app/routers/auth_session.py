"""Session router — cookie-auth helpers.

* DELETE /auth/session — clears the aldente_auth cookie (unauthenticated, idempotent).
* GET  /auth/ws-token  — returns the caller's auth token so the frontend can
  open a WebSocket directly to Railway without routing through Vercel's proxy.
  Requires a valid cookie (same-origin fetch from the PWA).
"""

from fastapi import APIRouter, Depends, Response, status

from app.auth import clear_auth_cookie, current_member
from app.models.member import Member

router = APIRouter(prefix="/auth", tags=["auth"])


@router.delete("/session", status_code=status.HTTP_200_OK)
def delete_session(response: Response) -> dict[str, bool]:
    """Clear the aldente_auth cookie. Idempotent — always returns 200."""
    clear_auth_cookie(response)
    return {"ok": True}


@router.get("/ws-token", status_code=status.HTTP_200_OK)
def get_ws_token(member: Member = Depends(current_member)) -> dict[str, str]:
    """Return the caller's auth token for direct-to-Railway WebSocket auth.

    The aldente_auth cookie is HttpOnly so JS can't read it.  The frontend
    calls this endpoint (same-origin, cookie travels automatically) to get a
    token it can append as ``?token=`` on a wss://railway… URL, bypassing the
    Vercel-proxy hop that drops long-lived WS connections.
    """
    return {"token": member.auth_token}
