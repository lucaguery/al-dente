"""Phase 18-01 regression tests for backend.app.routers.households — IDM-01/03.

Three contracts under test:

1. ``test_patch_me_rename_happy_path`` — PATCH /households/me with a valid new
   name returns 200 + the updated MemberPublic shape, and the DB row reflects
   the new name. Validates D-18-01..04 end-to-end except the broadcast (which
   is asserted indirectly: the response status itself proves the await completed
   without raising, and ``broadcast_to_household`` swallows per-socket errors).

2. ``test_patch_me_rename_409_when_duplicate`` — attempting to rename the
   caller to another member's existing name returns 409 with
   ``detail="name already taken"`` (D-18-02). The caller's own row is excluded
   from the uniqueness check, so a no-op rename to one's current name is 200
   not 409 (asserted in the happy-path test by checking idempotency would be
   redundant here; the discriminator is "OTHER member's name").

3. ``test_join_returns_422_when_household_full`` — IDM-03 (D-18-09/10): seed
   the household up to ``len(MEMBER_COLORS)`` (5) members, attempt a 6th join,
   expect 422 with ``code=HOUSEHOLD_FULL`` and ``max_members=5``. The seed
   household starts with 2 members so we insert 3 more in the rolled-back
   transaction.

Uses Phase 15 conftest fixtures (``db_session``, ``client``) and the seeded
Bearer token convention from ``test_cooking_logs.py``. Per-test rolled-back
transaction means all inserts are undone at teardown — safe to mutate counts.
"""

from __future__ import annotations

import os
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.colors import MEMBER_COLORS
from app.models.household import Household
from app.models.member import Member

SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")
AUTH_HEADERS = {"Authorization": f"Bearer {SEED_TOKEN}"}


def _seeded_member(db: Session) -> Member:
    """Resolve the seeded test member (auth_token == SEED_TOKEN).

    Mirrors the helper in test_recipes.py — points the operator at
    ``uv run seed`` if the row is missing.
    """
    m = db.scalar(select(Member).where(Member.auth_token == SEED_TOKEN).limit(1))
    assert m is not None, (
        f"seed Postgres has no member with auth_token={SEED_TOKEN!r} — run `uv run seed`?"
    )
    return m


def test_patch_me_rename_happy_path(
    client: TestClient,
    db_session: Session,
) -> None:
    """D-18-01 — PATCH /households/me with a fresh name returns 200 + the
    updated MemberPublic. The DB row reflects the new name on a follow-up read.

    A UUID-suffixed name keeps the assertion robust against any prior test
    state that may have lingered in the seed (the rolled-back transaction
    undoes our change at teardown, but parallel runs could still race).
    """
    caller = _seeded_member(db_session)
    original_name = caller.name
    new_name = f"Renamed-{uuid.uuid4().hex[:8]}"

    resp = client.patch(
        "/households/me",
        headers=AUTH_HEADERS,
        json={"name": new_name},
    )
    assert resp.status_code == 200, resp.text

    body = resp.json()
    # MemberPublic shape: id, name, color_hex, joined_at (no auth_token).
    assert body["name"] == new_name
    assert body["color_hex"] == caller.color_hex
    assert "auth_token" not in body
    assert body["id"] == str(caller.id)

    # Verify the DB row was persisted (the endpoint commits before broadcasting).
    db_session.expire_all()
    row = db_session.scalar(select(Member).where(Member.id == caller.id))
    assert row is not None
    assert row.name == new_name, row.name

    # Restore original name in-session so test ordering doesn't leak state
    # if the rollback semantics ever change. Rollback at fixture teardown
    # still handles the canonical cleanup.
    row.name = original_name
    db_session.commit()


def test_patch_me_rename_409_when_duplicate(
    client: TestClient,
    db_session: Session,
) -> None:
    """D-18-02 — renaming to another member's existing name returns 409.

    Inserts a second member with a known name in the rolled-back transaction,
    then attempts to rename the seeded caller to that exact string.
    """
    caller = _seeded_member(db_session)

    # Pick an unused color from the palette so the insert doesn't trip the
    # color uniqueness constraint applied by the join path. (The Member ORM
    # itself has no per-household color uniqueness — only the API enforces it
    # — so this is belt-and-braces.)
    used_colors = set(
        db_session.scalars(
            select(Member.color_hex).where(Member.household_id == caller.household_id)
        ).all()
    )
    free_color = next(c for c in MEMBER_COLORS if c not in used_colors)

    target_name = f"Collide-{uuid.uuid4().hex[:8]}"
    other = Member(
        household_id=caller.household_id,
        name=target_name,
        color_hex=free_color,
        auth_token=f"test-token-collide-{uuid.uuid4().hex[:8]}",
    )
    db_session.add(other)
    db_session.commit()

    resp = client.patch(
        "/households/me",
        headers=AUTH_HEADERS,
        json={"name": target_name},
    )
    assert resp.status_code == 409, resp.text
    assert resp.json()["detail"] == "name already taken"

    # The caller's row must NOT have been mutated.
    db_session.expire_all()
    row = db_session.scalar(select(Member).where(Member.id == caller.id))
    assert row is not None
    assert row.name != target_name


def test_join_returns_422_when_household_full(
    client: TestClient,
    db_session: Session,
) -> None:
    """IDM-03 (D-18-09/10) — POST /households/join against a 5-member household
    returns 422 with ``code=HOUSEHOLD_FULL`` and ``max_members=5``.

    The seeded household starts with 2 members. We insert 3 more (one per
    remaining palette color) so member_count == len(MEMBER_COLORS), then
    attempt a 6th join with a distinct name. The capacity gate runs BEFORE
    color uniqueness (D-18-10), so even if we picked an already-used color
    we'd get the 422 — but we re-use the first color to make the test
    deterministic regardless of palette ordering.
    """
    caller = _seeded_member(db_session)
    household = db_session.get(Household, caller.household_id)
    assert household is not None

    used_colors = set(
        db_session.scalars(
            select(Member.color_hex).where(Member.household_id == household.id)
        ).all()
    )
    remaining_colors = [c for c in MEMBER_COLORS if c not in used_colors]
    # Top up to exactly len(MEMBER_COLORS) members.
    for idx, color in enumerate(remaining_colors):
        filler = Member(
            household_id=household.id,
            name=f"Filler-{idx}-{uuid.uuid4().hex[:6]}",
            color_hex=color,
            auth_token=f"test-token-filler-{idx}-{uuid.uuid4().hex[:8]}",
        )
        db_session.add(filler)
    db_session.commit()

    # Sanity: household is now full.
    count = db_session.scalar(select(Member.id).where(Member.household_id == household.id))
    full_count = len(
        db_session.scalars(select(Member.id).where(Member.household_id == household.id)).all()
    )
    assert full_count == len(MEMBER_COLORS), full_count

    # 6th-member attempt — name unique so we don't trip the idempotent-rejoin
    # short-circuit (which would 201 instead of 422).
    sixth_name = f"Sixth-{uuid.uuid4().hex[:6]}"
    resp = client.post(
        "/households/join",
        json={
            "invite_code": household.invite_code,
            "member_name": sixth_name,
            # Re-use the seeded caller's color — capacity gate runs first so
            # this won't 409. Pydantic palette validation also passes since
            # caller.color_hex is in MEMBER_COLORS by construction.
            "color_hex": caller.color_hex,
        },
    )
    assert resp.status_code == 422, resp.text
    detail = resp.json()["detail"]
    # FastAPI's HTTPException(detail=dict) puts the dict at response["detail"].
    assert isinstance(detail, dict), detail
    assert detail["code"] == "HOUSEHOLD_FULL"
    assert detail["max_members"] == len(MEMBER_COLORS)
    assert detail["detail"] == "household full"
