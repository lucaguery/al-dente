"""Session router — DELETE /auth/session clears the aldente_auth cookie.

Unauthenticated by design: a stale/invalid cookie should still be clearable.
The frontend calls this on explicit logout and on WS 1008 close.
"""
from fastapi import APIRouter, Response, status

from app.auth import clear_auth_cookie

router = APIRouter(prefix="/auth", tags=["auth"])


@router.delete("/session", status_code=status.HTTP_200_OK)
def delete_session(response: Response) -> dict[str, bool]:
    """Clear the aldente_auth cookie. Idempotent — always returns 200."""
    clear_auth_cookie(response)
    return {"ok": True}
