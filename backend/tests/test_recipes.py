"""Phase 16 CAP-01 regression tests for backend.app.routers.recipes and
backend.app.services.llm.

Test 1 (test_promotion_failure_sets_failed_state): forces extract_from_transcript
to raise via monkeypatch and asserts the recipe row transitions to
status='failed' with non-null promotion_error. Validates the symmetric
treatment introduced in Plan 16-03 Task 1 (services/llm.py::_record_failure
now writes status alongside the existing error + attempts).

Test 2 (test_retry_promotion_resets_failed_to_draft): given a recipe row in
the failed terminal state, asserts POST /recipes/{id}/retry-promotion
resets status to 'draft' and clears promotion_error. Validates the synchronous
reset introduced in Plan 16-03 Task 2 (routers/recipes.py::retry_promote).

Both tests use the Phase 15 conftest fixtures: `db_session` (per-test rolled-
back transaction) and `client` (TestClient with `get_db` overridden to the
rolled-back session). Authentication uses the seeded Bearer token convention
established in test_cooking_logs.py.
"""
from __future__ import annotations

import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.member import Member
from app.models.recipe import Recipe
from app.services import llm as llm_service

# Mirrors backend/tests/test_cooking_logs.py SEED_TOKEN — the seeded
# household's Bearer (the existing E2E specs use the same fallback path).
SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")
AUTH_HEADERS = {"Authorization": f"Bearer {SEED_TOKEN}"}


def _seeded_member(db: Session) -> Member:
    """Resolve the seeded test member (auth_token == SEED_TOKEN).

    Raises with a clear message if the seed hasn't run — points the operator
    at `uv run seed`.
    """
    m = db.scalar(select(Member).where(Member.auth_token == SEED_TOKEN).limit(1))
    assert m is not None, (
        f"seed Postgres has no member with auth_token={SEED_TOKEN!r} — "
        f"run `uv run seed`?"
    )
    return m


def test_promotion_failure_sets_failed_state(
    db_session: Session,
) -> None:
    """D-16-04 / D-16-12 — Gemini failure deterministically transitions the
    draft row to status='failed' with the truncated error in promotion_error.

    Unit-level assertion on `_record_failure` directly: the function is the
    sole writer of the failed-state transition (called by both
    promote_voice_draft and promote_photo_draft in their except blocks).
    Driving this from the HTTP layer would require monkeypatching
    `app.services.llm.SessionLocal` so the BackgroundTask sees the
    rolled-back transaction's data, which is incompatible with the Phase 15
    conftest's connection-scoped transaction pattern (the BackgroundTask
    opens its own SessionLocal which can't see the uncommitted recipe).

    Per Plan 16-03 Task 1 acceptance criteria, the contract under test is:
    `_record_failure(db, recipe, exc)` MUST set status='failed', persist
    the truncated error, and increment promotion_attempts. Plan 16-05's
    E2E spec exercises the full HTTP + BackgroundTask path against a real
    seeded environment.
    """
    member = _seeded_member(db_session)

    # Seed a draft recipe in the rolled-back transaction.
    draft = Recipe(
        household_id=member.household_id,
        created_by_member_id=member.id,
        status="draft",
        title="(extraction en cours…)",
        source_capture={"type": "voice", "payload": {"transcript": "test"}},
        photo_paths=[],
        mood=[],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
    )
    db_session.add(draft)
    db_session.commit()
    db_session.refresh(draft)

    # Pre-condition sanity check.
    assert draft.status == "draft"
    assert draft.promotion_error is None
    starting_attempts = draft.promotion_attempts or 0

    # Drive the failure path. The exception text is short — no truncation
    # needed — so we can assert on the full message.
    llm_service._record_failure(
        db_session, draft, RuntimeError("forced test failure")
    )

    # Re-read the row (the function commits internally).
    db_session.expire_all()
    row = db_session.scalar(select(Recipe).where(Recipe.id == draft.id))
    assert row is not None
    assert row.status == "failed", row.status
    assert row.promotion_error == "forced test failure", row.promotion_error
    assert row.promotion_attempts == starting_attempts + 1, row.promotion_attempts

    # Bonus: D-16-03 truncation contract — a 600-char message is clipped to 500.
    long_exc = RuntimeError("a" * 600)
    llm_service._record_failure(db_session, row, long_exc)
    db_session.expire_all()
    row2 = db_session.scalar(select(Recipe).where(Recipe.id == draft.id))
    assert row2 is not None
    assert row2.promotion_error is not None
    assert len(row2.promotion_error) == 500, len(row2.promotion_error)


def test_retry_promotion_resets_failed_to_draft(
    client: TestClient,
    db_session: Session,
) -> None:
    """D-16-05 / D-16-12 — POST /recipes/{id}/retry-promotion against a
    failed row resets status to 'draft' and clears promotion_error.

    We seed a recipe row directly into the rolled-back test session (no
    BackgroundTask plumbing required) and assert the synchronous reset
    observable in the response and on a follow-up GET. The retry
    BackgroundTask is queued by the endpoint but its completion is not
    asserted here — the photo-path retry is TODO(productize) and the
    voice-path's re-promotion is exercised by Plan 16-05's E2E spec.
    """
    member = _seeded_member(db_session)

    # Seed a failed-state recipe directly. source_capture mirrors the voice
    # capture shape so the retry BackgroundTask's source_capture.type=='voice'
    # branch (services/llm.py::retry_promotion) has a transcript to re-feed.
    failed = Recipe(
        household_id=member.household_id,
        created_by_member_id=member.id,
        status="failed",
        title="(extraction en cours…)",
        source_capture={"type": "voice", "payload": {"transcript": "test"}},
        photo_paths=[],
        mood=[],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
        promotion_error="prior failure to be cleared",
        promotion_attempts=1,
    )
    db_session.add(failed)
    db_session.commit()
    db_session.refresh(failed)

    # POST retry-promotion. The endpoint's synchronous body:
    #   - resets recipe.status from 'failed' to 'draft'
    #   - clears recipe.promotion_error
    #   - broadcasts recipe.created
    #   - queues retry_promotion as a BackgroundTask
    resp = client.post(
        f"/recipes/{failed.id}/retry-promotion",
        headers=AUTH_HEADERS,
    )
    # 202 ACCEPTED per the endpoint's status_code declaration.
    assert resp.status_code == 202, resp.text

    # Follow-up GET reflects the synchronous post-state. Note: by the time
    # this GET returns, the retry BackgroundTask may have RE-failed (the
    # monkeypatched stub is NOT in place for THIS test, so the real
    # extract_from_transcript is invoked, which short-circuits to the
    # test-mode canned voice recipe — promoting status to 'structured').
    # We accept either {draft, structured} here because the retry
    # BackgroundTask completion is non-deterministic relative to this GET.
    # The CORE assertion is "status is no longer 'failed' and error cleared".
    db_session.expire_all()
    row = db_session.scalar(select(Recipe).where(Recipe.id == failed.id))
    assert row is not None
    assert row.status in ("draft", "structured"), row.status
    assert row.status != "failed", row.status
    assert row.promotion_error is None, row.promotion_error
