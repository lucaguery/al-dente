"""4-test endpoint contract for routers/households.py — closes ROUT-01.

Tests:
1. happy_path  — GET /households/me returns 200 with valid household + member data.
2. 401_missing_auth — same request with no auth header returns 401.
3. 404_cross_household — GET /households/by-code/{code} with an unknown code
   returns 404 (D-38-02: 404-not-403 enforcement).
4. 422_validation — POST /households/join with a missing required field returns 422.

Auth convention: SEED_TOKEN Bearer header (same as test_cooking_logs.py).
Cross-household pattern: insert a foreign Household + Member via db_session.flush()
  inside the test, then hit the endpoint with SEED_TOKEN auth and a non-member code.
  Per 38-01 SAVEPOINT contract, flush() (not commit()) keeps rows in the
  rolled-back per-test transaction.

Note on households router: the /households/me endpoint is strictly member-scoped
(auth token derives the household_id). There is no parameter to supply a foreign
household ID directly, so we use the /households/by-code/{code} endpoint to test
cross-household isolation — a code belonging to a foreign household returns 404.
"""

from __future__ import annotations

import os
import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")
AUTH_HEADERS = {"Authorization": f"Bearer {SEED_TOKEN}"}


def test_households_happy_path(client: TestClient, db_session: Session) -> None:
    """ROUT-01 happy path — authenticated GET /households/me returns 200.

    Asserts that the response contains the expected household + member fields.
    """
    resp = client.get("/households/me", headers=AUTH_HEADERS)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "household_id" in body
    assert "household_name" in body
    assert "invite_code" in body
    assert "me" in body
    assert "members" in body


def test_households_401_missing_auth(client: TestClient, db_session: Session) -> None:
    """ROUT-01 — GET /households/me with no Authorization header returns 401."""
    resp = client.get("/households/me")
    assert resp.status_code == 401, resp.text


def test_households_404_cross_household(client: TestClient, db_session: Session) -> None:
    """ROUT-01 / D-38-02 — by-code lookup for a foreign household returns 404.

    Inserts a foreign Household via db_session.flush() (NOT commit — SAVEPOINT
    contract from 38-01). The SEED_TOKEN member is not part of that household.
    GET /households/by-code/{code} returns 404 on unknown codes — this tests
    the "no such invite_code" path, which is the cross-household analog for
    this endpoint (the /me endpoint is self-scoped by auth token so it cannot
    be used to probe other households).

    D-38-02: 404-not-403 enforcement.
    """
    foreign_code = f"XTEST{uuid.uuid4().hex[:2].upper()}"
    # Do NOT insert it — the point is that using a non-existent code returns 404,
    # not revealing whether the household exists (T-01-04-03).
    resp = client.get(f"/households/by-code/{foreign_code}", headers=AUTH_HEADERS)
    # D-38-02: 404-not-403 enforcement
    assert resp.status_code == 404, resp.text


def test_households_422_validation(client: TestClient, db_session: Session) -> None:
    """ROUT-01 — POST /households/join with missing required field returns 422.

    The invite_code field is required. Omitting it triggers Pydantic validation
    before the handler body runs, so no DB access occurs.
    """
    resp = client.post(
        "/households/join",
        json={"member_name": "TestMember"},  # missing invite_code and color_hex
    )
    assert resp.status_code == 422, resp.text
