"""Unit tests for app.auth — 100% line-coverage target.

Two layers:
1. Pure-function tests: generate_auth_token, set_auth_cookie, clear_auth_cookie,
   _extract_token — no DB, no TestClient.
2. Integration tests: current_member via TestClient using the seeded Luca
   member (auth_token="test-token-luca") — exercises the DB lookup path.

Invariant #8 (CLAUDE.md): cookie wins over Bearer header when both are present.
Tests pin this contract so a refactor cannot silently flip the ordering.
"""

from __future__ import annotations

import pytest
from fastapi import HTTPException, Response

from app.auth import (
    AUTH_COOKIE_MAX_AGE,
    AUTH_COOKIE_NAME,
    _extract_token,
    clear_auth_cookie,
    generate_auth_token,
    set_auth_cookie,
)

# ---------------------------------------------------------------------------
# Seed-token constants (re-stated per scope_fence — do NOT import from other
# test files)
# ---------------------------------------------------------------------------

SEED_TOKEN = "test-token-luca"
SEED_TOKEN_PARTNER = "test-token-partner"

# Route that exercises current_member → Depends path and returns 200 on auth OK.
# GET /auth/ws-token returns {"token": member.auth_token} on success.
AUTH_ROUTE = "/auth/ws-token"


# ===========================================================================
# Layer 1: Pure-function tests (no DB round-trip)
# ===========================================================================


class TestGenerateAuthToken:
    def test_returns_string(self) -> None:
        token = generate_auth_token()
        assert isinstance(token, str)

    def test_returns_43_chars(self) -> None:
        """URL-safe base64 of 32 bytes = 43 chars (no padding in token_urlsafe)."""
        token = generate_auth_token()
        assert len(token) == 43

    def test_tokens_are_unique(self) -> None:
        """Two calls must not return the same token (entropy sanity check)."""
        t1 = generate_auth_token()
        t2 = generate_auth_token()
        assert t1 != t2

    def test_only_urlsafe_chars(self) -> None:
        """Token must contain only URL-safe base64 characters (A-Z a-z 0-9 - _)."""
        import re

        token = generate_auth_token()
        assert re.fullmatch(r"[A-Za-z0-9_\-]+", token), (
            f"Token contains non-URL-safe character: {token!r}"
        )


class TestSetAuthCookie:
    def test_sets_cookie_with_correct_name_and_value(self) -> None:
        r = Response()
        set_auth_cookie(r, "my-test-token")
        header = r.headers.get("set-cookie", "")
        assert f"{AUTH_COOKIE_NAME}=my-test-token" in header

    def test_sets_httponly(self) -> None:
        r = Response()
        set_auth_cookie(r, "tok")
        assert "httponly" in r.headers.get("set-cookie", "").lower()

    def test_sets_secure(self) -> None:
        r = Response()
        set_auth_cookie(r, "tok")
        assert "secure" in r.headers.get("set-cookie", "").lower()

    def test_sets_samesite_strict(self) -> None:
        r = Response()
        set_auth_cookie(r, "tok")
        assert "samesite=strict" in r.headers.get("set-cookie", "").lower()

    def test_sets_max_age(self) -> None:
        r = Response()
        set_auth_cookie(r, "tok")
        header = r.headers.get("set-cookie", "").lower()
        assert f"max-age={AUTH_COOKIE_MAX_AGE}" in header

    def test_sets_path_root(self) -> None:
        r = Response()
        set_auth_cookie(r, "tok")
        assert "path=/" in r.headers.get("set-cookie", "").lower()

    def test_max_age_constant_is_90_days(self) -> None:
        """AUTH_COOKIE_MAX_AGE must be 7776000 seconds = 90 days (D-02)."""
        assert AUTH_COOKIE_MAX_AGE == 7_776_000


class TestClearAuthCookie:
    def test_sets_cookie_name(self) -> None:
        r = Response()
        clear_auth_cookie(r)
        header = r.headers.get("set-cookie", "")
        assert AUTH_COOKIE_NAME in header

    def test_expires_or_zero_max_age(self) -> None:
        """Cookie must be expired: either Max-Age=0 or Expires in the past."""
        r = Response()
        clear_auth_cookie(r)
        header = r.headers.get("set-cookie", "").lower()
        has_zero_max_age = "max-age=0" in header
        has_expires = "expires=" in header
        assert has_zero_max_age or has_expires, (
            f"clear_auth_cookie did not produce an expiry directive: {header!r}"
        )

    def test_sets_httponly(self) -> None:
        r = Response()
        clear_auth_cookie(r)
        assert "httponly" in r.headers.get("set-cookie", "").lower()

    def test_sets_secure(self) -> None:
        r = Response()
        clear_auth_cookie(r)
        assert "secure" in r.headers.get("set-cookie", "").lower()

    def test_sets_samesite_strict(self) -> None:
        r = Response()
        clear_auth_cookie(r)
        assert "samesite=strict" in r.headers.get("set-cookie", "").lower()

    def test_sets_path_root(self) -> None:
        r = Response()
        clear_auth_cookie(r)
        assert "path=/" in r.headers.get("set-cookie", "").lower()


class TestExtractToken:
    """Tests for _extract_token — the routing logic that resolves auth source."""

    def test_cookie_only_returns_token(self) -> None:
        assert _extract_token("abc", None) == "abc"

    def test_bearer_only_returns_token(self) -> None:
        assert _extract_token(None, "Bearer xyz") == "xyz"

    def test_lowercase_bearer_accepted(self) -> None:
        """Lowercase 'bearer ' prefix is valid per auth.py:.lower().startswith."""
        assert _extract_token(None, "bearer xyz") == "xyz"

    def test_cookie_wins_when_both_present(self) -> None:
        """Invariant #8: cookie takes priority over Bearer header (D-03)."""
        result = _extract_token("cookie-wins", "Bearer header-loses")
        assert result == "cookie-wins"

    def test_whitespace_only_cookie_raises_401(self) -> None:
        """Blank cookie (after strip) must raise 401 'missing auth'."""
        with pytest.raises(HTTPException) as exc_info:
            _extract_token("  ", None)
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "missing auth"

    def test_invalid_authorization_prefix_raises_401(self) -> None:
        """Non-Bearer authorization header must raise 401 'missing auth'."""
        with pytest.raises(HTTPException) as exc_info:
            _extract_token(None, "NotBearer xyz")
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "missing auth"

    def test_bearer_with_whitespace_only_token_raises_401(self) -> None:
        """Bearer header with empty token after split+strip must raise 401."""
        with pytest.raises(HTTPException) as exc_info:
            _extract_token(None, "Bearer  ")
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "missing auth"

    def test_both_none_raises_401(self) -> None:
        """Missing cookie AND missing header must raise 401 'missing auth'."""
        with pytest.raises(HTTPException) as exc_info:
            _extract_token(None, None)
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "missing auth"


# ===========================================================================
# Layer 2: Integration tests via TestClient (exercises current_member + DB)
# Relies on the autouse _seeded_database fixture from conftest.py (D-37-01)
# which seeds member_luca with auth_token="test-token-luca".
# ===========================================================================


class TestCurrentMemberIntegration:
    """Integration tests for current_member via GET /auth/ws-token."""

    def test_cookie_auth_happy_path(self, client) -> None:
        """Valid cookie → 200 with member token in response."""
        resp = client.get(AUTH_ROUTE, cookies={AUTH_COOKIE_NAME: SEED_TOKEN})
        assert resp.status_code == 200
        assert resp.json()["token"] == SEED_TOKEN

    def test_bearer_auth_happy_path(self, client) -> None:
        """Valid Bearer header → 200 with member token in response."""
        resp = client.get(AUTH_ROUTE, headers={"Authorization": f"Bearer {SEED_TOKEN}"})
        assert resp.status_code == 200
        assert resp.json()["token"] == SEED_TOKEN

    def test_cookie_wins_when_both_present(self, client) -> None:
        """Cookie auth + invalid Bearer → 200 (cookie wins per invariant #8)."""
        resp = client.get(
            AUTH_ROUTE,
            cookies={AUTH_COOKIE_NAME: SEED_TOKEN},
            headers={"Authorization": "Bearer not-a-real-token"},
        )
        assert resp.status_code == 200, (
            "Expected 200: cookie should win over the invalid Bearer token. "
            f"Got {resp.status_code}: {resp.text}"
        )

    def test_unknown_token_raises_401_invalid_token(self, client) -> None:
        """Unknown token string → 401 with detail 'invalid token'."""
        resp = client.get(
            AUTH_ROUTE,
            headers={"Authorization": "Bearer not-a-real-token-xyz"},
        )
        assert resp.status_code == 401
        assert resp.json()["detail"] == "invalid token"

    def test_missing_auth_raises_401_missing_auth(self, client) -> None:
        """No cookie, no header → 401 with detail 'missing auth'."""
        resp = client.get(AUTH_ROUTE)
        assert resp.status_code == 401
        assert resp.json()["detail"] == "missing auth"

    def test_partner_bearer_auth_happy_path(self, client) -> None:
        """Second seeded member (partner) also authenticates correctly."""
        resp = client.get(
            AUTH_ROUTE,
            headers={"Authorization": f"Bearer {SEED_TOKEN_PARTNER}"},
        )
        assert resp.status_code == 200
        assert resp.json()["token"] == SEED_TOKEN_PARTNER
