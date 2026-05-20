"""Regression tests for Phase 17 — HIST-01 + HIST-02 + FIX-01 (TZ-01).

Three concerns, one file (atomic-bundle discipline):

- HIST-01: GET /cooking-logs?days=N — list endpoint shape, filtering,
  days-window clamp, household isolation.
- HIST-02: GET /cooking-logs/{log_id} — single-row read, cross-household
  404.
- FIX-01 / TZ-01: active-cook lookup uses household.timezone for the
  "today" boundary, not Python local-tz date vs UTC DB date.

Per 17-CONTEXT.md D-17-12, the TZ boundary tests create a log at a UTC
moment that's "tomorrow" in household-tz and assert the active-log
lookup correctly identifies it under the household-tz boundary.
"""

from __future__ import annotations

import logging
import os
import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import patch
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.colors import MEMBER_COLORS
from app.models.cooking_log import CookingLog, LogRating
from app.models.household import Household
from app.models.member import Member
from app.models.recipe import Recipe
from app.models.recipe_turn import RecipeTurn

SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")
AUTH_HEADERS = {"Authorization": f"Bearer {SEED_TOKEN}"}


def _seed_actors(db: Session) -> tuple[Member, Household, Recipe]:
    """Resolve the seeded test member + household + a seeded recipe.

    Raises with a clear message if the seed hasn't run — points the operator
    at `uv run seed`.
    """
    member = db.scalar(select(Member).where(Member.auth_token == SEED_TOKEN).limit(1))
    assert member is not None, (
        f"seed has no member with auth_token={SEED_TOKEN!r} — run `uv run seed`"
    )
    household = db.get(Household, member.household_id)
    assert household is not None
    recipe = db.scalar(select(Recipe).where(Recipe.household_id == household.id).limit(1))
    assert recipe is not None
    return member, household, recipe


def _drain_active_logs(db: Session, household_id: uuid.UUID) -> None:
    """Finalize any pre-existing unfinalized log for the household.

    Mirrors the E2E drain loop in cooking-log-create-finalize.spec.ts — keeps
    the per-test unfinalized log unique so the active-cook assertion is
    deterministic.
    """
    drained = db.scalars(
        select(CookingLog).where(
            CookingLog.household_id == household_id,
            CookingLog.rating.is_(None),
        )
    ).all()
    for d in drained:
        d.rating = LogRating.disliked
        d.notes = "drained by test_cooking_logs_history.py setup"
    if drained:
        db.commit()


# ---------------------------------------------------------------------------
# HIST-01 — GET /cooking-logs list
# ---------------------------------------------------------------------------


def test_list_returns_recent_logs(client: TestClient, db_session: Session) -> None:
    member, household, recipe = _seed_actors(db_session)
    resp = client.get("/cooking-logs?days=30", headers=AUTH_HEADERS)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert isinstance(body, list)
    # Seed plants 3 cooking_logs in the synthetic household.
    assert len(body) >= 3
    # All belong to the requesting household + all finalized.
    for row in body:
        assert row["household_id"] == str(household.id)
        assert row["rating"] is not None
    # Sorted DESC.
    timestamps = [row["cooked_at"] for row in body]
    assert timestamps == sorted(timestamps, reverse=True)


def test_list_filters_by_days_window(client: TestClient, db_session: Session) -> None:
    member, household, recipe = _seed_actors(db_session)
    old = CookingLog(
        id=uuid.uuid4(),
        recipe_id=recipe.id,
        household_id=household.id,
        cooked_by_member_id=member.id,
        cooked_at=datetime.now(UTC) - timedelta(days=45),
        photo_paths=[],
        rating=LogRating.liked,
        notes="ancient",
    )
    db_session.add(old)
    db_session.commit()
    inside_30 = client.get("/cooking-logs?days=30", headers=AUTH_HEADERS).json()
    inside_60 = client.get("/cooking-logs?days=60", headers=AUTH_HEADERS).json()
    old_ids_30 = [r["id"] for r in inside_30]
    old_ids_60 = [r["id"] for r in inside_60]
    assert str(old.id) not in old_ids_30
    assert str(old.id) in old_ids_60


def test_list_excludes_unfinalized(client: TestClient, db_session: Session) -> None:
    member, household, recipe = _seed_actors(db_session)
    _drain_active_logs(db_session, household.id)
    unfin = CookingLog(
        id=uuid.uuid4(),
        recipe_id=recipe.id,
        household_id=household.id,
        cooked_by_member_id=member.id,
        cooked_at=datetime.now(UTC),
        photo_paths=[],
        rating=None,
    )
    db_session.add(unfin)
    db_session.commit()
    ids = [r["id"] for r in client.get("/cooking-logs", headers=AUTH_HEADERS).json()]
    assert str(unfin.id) not in ids


def test_list_days_param_clamped(client: TestClient) -> None:
    assert client.get("/cooking-logs?days=0", headers=AUTH_HEADERS).status_code == 422
    assert client.get("/cooking-logs?days=400", headers=AUTH_HEADERS).status_code == 422
    assert client.get("/cooking-logs", headers=AUTH_HEADERS).status_code == 200


def test_list_cross_household_isolated(client: TestClient, db_session: Session) -> None:
    # Build a second household + member + recipe + log so we can assert the
    # filter excludes it from the seeded household's response (T-04-01-03).
    other_h = Household(id=uuid.uuid4(), name="Other", timezone="Europe/Paris")
    db_session.add(other_h)
    db_session.flush()
    other_m = Member(
        id=uuid.uuid4(),
        household_id=other_h.id,
        name="Other Member",
        color_hex=MEMBER_COLORS[0],
        auth_token=f"test-token-other-{uuid.uuid4().hex[:8]}",
    )
    db_session.add(other_m)
    db_session.flush()
    # Recipe NOT NULL fields: household_id, created_by_member_id, status,
    # Copy structure from a seeded recipe to satisfy CHECK constraints on
    # cuisine/main_protein (NULL is allowed).
    seeded = db_session.scalar(select(Recipe).limit(1))
    assert seeded is not None
    other_recipe = Recipe(
        id=uuid.uuid4(),
        household_id=other_h.id,
        created_by_member_id=other_m.id,
        title="Other recipe",
        status=seeded.status,
        photo_paths=[],
        mood=[],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
    )
    db_session.add(other_recipe)
    db_session.flush()  # need other_recipe.id for turn FK
    db_session.add(
        RecipeTurn(
            id=uuid.uuid4(),
            recipe_id=other_recipe.id,
            position=0,
            sender="user",
            kind="text",
            payload={"text": "Other recipe"},
        )
    )
    db_session.flush()
    other_log = CookingLog(
        id=uuid.uuid4(),
        recipe_id=other_recipe.id,
        household_id=other_h.id,
        cooked_by_member_id=other_m.id,
        cooked_at=datetime.now(UTC),
        photo_paths=[],
        rating=LogRating.liked,
    )
    db_session.add(other_log)
    db_session.commit()
    # Requesting member is the seeded household — must NOT see other_log.
    ids = [r["id"] for r in client.get("/cooking-logs?days=365", headers=AUTH_HEADERS).json()]
    assert str(other_log.id) not in ids


# ---------------------------------------------------------------------------
# HIST-02 — GET /cooking-logs/{log_id} detail
# ---------------------------------------------------------------------------


def test_detail_returns_household_scoped_log(client: TestClient, db_session: Session) -> None:
    member, household, _ = _seed_actors(db_session)
    log = db_session.scalar(
        select(CookingLog).where(CookingLog.household_id == household.id).limit(1)
    )
    assert log is not None
    resp = client.get(f"/cooking-logs/{log.id}", headers=AUTH_HEADERS)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["id"] == str(log.id)
    assert body["household_id"] == str(household.id)


def test_detail_cross_household_returns_404(client: TestClient) -> None:
    random_id = uuid.uuid4()
    resp = client.get(f"/cooking-logs/{random_id}", headers=AUTH_HEADERS)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# FIX-01 / TZ-01 — household-tz boundary
# ---------------------------------------------------------------------------


class _FrozenDatetime:
    """Drop-in for `datetime` in app.routers.cooking_logs that returns a
    fixed value from `.now()` but otherwise behaves like stdlib datetime.

    `__getattr__` delegates everything except `now` to the real class so
    `datetime.now`, `datetime(...)` constructors, `datetime.utcnow`, etc all
    keep working transparently during the patched test.
    """

    def __init__(self, frozen: datetime) -> None:
        self._frozen = frozen

    def now(self, tz=None) -> datetime:
        if tz is None:
            # Mirror stdlib `datetime.now()` (no tz arg → naive local time).
            return self._frozen.astimezone().replace(tzinfo=None)
        return self._frozen.astimezone(tz)

    def __getattr__(self, name: str) -> object:
        return getattr(datetime, name)


def test_active_cooking_log_late_evening_household_tz(
    client: TestClient, db_session: Session
) -> None:
    """FIX-01 — household-tz boundary: a 22:30 Paris cook on day D is found
    by /cooking-logs/active when "now" is 23:45 Paris same day, and NOT
    found when "now" is 00:30 Paris next day.

    Without the household-tz fix, both lookups would compare Python local-tz
    date to `func.date(cooked_at)` against UTC — and miss/double-count the
    boundary.
    """
    member, household, recipe = _seed_actors(db_session)
    household.timezone = "Europe/Paris"
    db_session.commit()
    _drain_active_logs(db_session, household.id)

    # Cooked at 22:30 Europe/Paris on day D. UTC stored = day D 20:30 (CEST)
    # or 21:30 (CET). Either way the household-tz date is day D.
    paris = ZoneInfo("Europe/Paris")
    day_d = datetime(2026, 5, 11, 22, 30, tzinfo=paris)
    late_log = CookingLog(
        id=uuid.uuid4(),
        recipe_id=recipe.id,
        household_id=household.id,
        cooked_by_member_id=member.id,
        cooked_at=day_d.astimezone(UTC),
        photo_paths=[],
        rating=None,
    )
    db_session.add(late_log)
    db_session.commit()

    # "Now" is 23:45 Paris same day — household-tz date matches log's date.
    same_day = datetime(2026, 5, 11, 23, 45, tzinfo=paris)
    with patch("app.routers.cooking_logs.datetime", _FrozenDatetime(same_day)):
        resp = client.get("/cooking-logs/active", headers=AUTH_HEADERS)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body is not None
    assert body["id"] == str(late_log.id)

    # "Now" is 00:30 Paris NEXT day — household-tz date no longer matches.
    next_day = datetime(2026, 5, 12, 0, 30, tzinfo=paris)
    with patch("app.routers.cooking_logs.datetime", _FrozenDatetime(next_day)):
        resp = client.get("/cooking-logs/active", headers=AUTH_HEADERS)
    assert resp.status_code == 200, resp.text
    assert resp.json() is None


def test_active_cooking_log_invalid_household_tz_falls_back_to_utc(
    client: TestClient,
    db_session: Session,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """FIX-01 defensive fallback: invalid IANA names warn + fall back to UTC
    instead of crashing the endpoint with ZoneInfoNotFoundError.
    """
    member, household, _ = _seed_actors(db_session)
    household.timezone = "Not/AZone"
    db_session.commit()
    with caplog.at_level(logging.WARNING, logger="app.routers.cooking_logs"):
        resp = client.get("/cooking-logs/active", headers=AUTH_HEADERS)
    assert resp.status_code == 200, resp.text
    assert any("household_invalid_timezone" in r.message for r in caplog.records), [
        r.message for r in caplog.records
    ]


def test_start_cooking_409_uses_household_tz(client: TestClient, db_session: Session) -> None:
    """FIX-01 — the 409 guard in start_cooking shares the same household-tz
    boundary as /cooking-logs/active (D-17-09): same-day conflict, next-day
    free path.
    """
    member, household, recipe = _seed_actors(db_session)
    household.timezone = "Europe/Paris"
    db_session.commit()
    _drain_active_logs(db_session, household.id)

    paris = ZoneInfo("Europe/Paris")
    day_d_late = datetime(2026, 5, 11, 22, 30, tzinfo=paris)
    late_log = CookingLog(
        id=uuid.uuid4(),
        recipe_id=recipe.id,
        household_id=household.id,
        cooked_by_member_id=member.id,
        cooked_at=day_d_late.astimezone(UTC),
        photo_paths=[],
        rating=None,
    )
    db_session.add(late_log)
    db_session.commit()

    # Same household-tz day → 409 (existing unfinalized log "today").
    same_day = datetime(2026, 5, 11, 23, 50, tzinfo=paris)
    with patch("app.routers.cooking_logs.datetime", _FrozenDatetime(same_day)):
        r1 = client.post(f"/recipes/{recipe.id}/cook", headers=AUTH_HEADERS)
    assert r1.status_code == 409, r1.text

    # Next household-tz day → no conflict (the late_log is "yesterday's").
    next_day = datetime(2026, 5, 12, 0, 20, tzinfo=paris)
    with patch("app.routers.cooking_logs.datetime", _FrozenDatetime(next_day)):
        r2 = client.post(f"/recipes/{recipe.id}/cook", headers=AUTH_HEADERS)
    assert r2.status_code == 201, r2.text
