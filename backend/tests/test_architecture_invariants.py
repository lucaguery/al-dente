"""Architecture-invariant regression tests — Phase 38 Plan 04.

One test per CLAUDE.md architecture invariant. Each test:
- Documents the CLAUDE.md invariant # and REQ-ID it pins (in docstring).
- Uses introspection or integration spy patterns to assert the invariant.
- Fails with an explicit message naming the invariant when violated.

INV-XX → CLAUDE.md invariant mapping:
    INV-01 → CLAUDE.md #1  (5 capture surfaces → promote_draft via BackgroundTask)
    INV-02 → CLAUDE.md #2  (votes table has no `state` column)
    INV-03 → CLAUDE.md #3  (last_cooked_at/cook_count updated atomically)
    INV-04 → CLAUDE.md #4  (household mutations broadcast via broadcast_to_household)
    INV-05 → CLAUDE.md #5  (first user turn position=0 immutable; source_capture absent)
    INV-06 → CLAUDE.md #7  (APScheduler in-process, single-worker, one job per household)
    INV-07 → CLAUDE.md #8  (HttpOnly cookie wins over Bearer-header fallback)
    INV-08 → CLAUDE.md #6  (HTTPException details are internal codes, not raw English prose)

D-38-03: break-observe-revert ritual completed for all 8. Evidence in 38-04-SUMMARY.md.
"""
from __future__ import annotations

import ast
import re
import textwrap
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Shared constants (mirror test_auth_unit.py)
# ---------------------------------------------------------------------------
SEED_TOKEN = "test-token-luca"
SEED_TOKEN_PARTNER = "test-token-partner"
AUTH_COOKIE_NAME = "aldente_auth"

# ---------------------------------------------------------------------------
# Helper: repo root
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).parent.parent  # backend/


# ===========================================================================
# INV-01 — CLAUDE.md #1
# ===========================================================================

def test_invariant_01_promote_endpoint_schedules_promote_draft(client: TestClient, db_session):
    """INV-01: POST /recipes/{id}/promote schedules promote_draft as a BackgroundTask.

    CLAUDE.md invariant #1: all five capture surfaces dispatch through
    promote_draft server-side. Phase 27 collapsed the five old capture
    endpoints into a conversational flow; the single explicit promote trigger
    (POST /recipes/{id}/promote) MUST call background_tasks.add_task(promote_draft, ...).

    We test the POST /recipes/{id}/promote endpoint — the canonical single
    coalescing trigger — by asserting it:
      a) returns 202 (queued), and
      b) actually enqueues promote_draft (verified via patching).

    The retry-promotion endpoint (POST /recipes/{id}/retry-promotion) also
    enqueues promote_draft via retry_promotion; that is intentionally covered
    by the same invariant (both paths eventually call promote_draft).
    """
    # 1. Create a blank recipe
    r = client.post(
        "/recipes",
        json={},
        cookies={AUTH_COOKIE_NAME: SEED_TOKEN},
    )
    assert r.status_code == 201, f"INV-01: blank recipe creation failed: {r.text}"
    recipe_id = r.json()["id"]

    # 2. Add a position-0 user turn so promote doesn't 422
    # TurnPayload is a discriminated union on `kind`; TextTurnPayload is flat: {kind, text}
    r2 = client.post(
        f"/recipes/{recipe_id}/turns",
        json={"kind": "text", "text": "Spaghetti carbonara"},
        cookies={AUTH_COOKIE_NAME: SEED_TOKEN},
    )
    assert r2.status_code == 201, f"INV-01: turn creation failed: {r2.text}"

    # 3. Call /promote and verify promote_draft is enqueued
    # TestClient runs BackgroundTasks synchronously before returning the response,
    # so mock_promote_draft.called will be True if add_task(promote_draft, ...) ran.
    with patch("app.routers.recipes.promote_draft") as mock_promote_draft:
        r3 = client.post(
            f"/recipes/{recipe_id}/promote",
            cookies={AUTH_COOKIE_NAME: SEED_TOKEN},
        )
        assert r3.status_code == 202, (
            f"INV-01 violated — POST /recipes/{{id}}/promote returned {r3.status_code}; "
            "expected 202 (queued). CLAUDE.md invariant #1."
        )
        assert r3.json()["queued"] is True, (
            "INV-01 violated — promote endpoint returned queued=False. CLAUDE.md invariant #1."
        )
        # BackgroundTasks executes after the response in TestClient — verify promote_draft was called.
        # The router passes a UUID object (not string), so check call_count not args equality.
        assert mock_promote_draft.called, (
            "INV-01 violated — promote_draft was never called by the BackgroundTask after "
            "POST /recipes/{id}/promote. CLAUDE.md invariant #1."
        )
        assert mock_promote_draft.call_count == 1, (
            f"INV-01 violated — promote_draft called {mock_promote_draft.call_count} times "
            "but expected exactly 1. CLAUDE.md invariant #1."
        )


def test_invariant_01_promote_source_code_dispatches_promote_draft():
    """INV-01 (static): promote endpoint source calls background_tasks.add_task(promote_draft).

    Supplements the integration test with a static AST check so the invariant
    is guarded against pure-refactor regressions (e.g. renaming the task).
    """
    router_path = REPO_ROOT / "app" / "routers" / "recipes.py"
    source = router_path.read_text()

    # Must import promote_draft
    assert "from app.services.llm import" in source and "promote_draft" in source, (
        "INV-01 violated — promote_draft is not imported in routers/recipes.py. "
        "CLAUDE.md invariant #1."
    )

    # Must contain background_tasks.add_task(promote_draft, ...)
    assert "background_tasks.add_task(promote_draft," in source or \
           "background_tasks.add_task(promote_draft ," in source, (
        "INV-01 violated — routers/recipes.py does not call "
        "background_tasks.add_task(promote_draft, ...). CLAUDE.md invariant #1."
    )


# ===========================================================================
# INV-02 — CLAUDE.md #2
# ===========================================================================

def test_invariant_02_votes_table_has_no_state_column():
    """INV-02: The `votes` table has no `state` column.

    CLAUDE.md invariant #2: voting state (Validé/Pressenti/Contesté/Rejeté/
    Sans avis) is COMPUTED from rows in `votes` via
    services/voting.compute_vote_state. Storing state as a column would
    introduce dual-write corruption risk.

    Assertion: Vote.__table__.columns does not include a column named 'state'.
    """
    from app.models.vote import Vote

    column_names = {col.name for col in Vote.__table__.columns}
    assert "state" not in column_names, (
        f"INV-02 violated — the `votes` table has a `state` column: {column_names}. "
        "Voting state must be COMPUTED, never stored. CLAUDE.md invariant #2."
    )

    # Also verify compute_vote_state exists in services/voting.py
    from app.services import voting
    assert hasattr(voting, "compute_vote_state"), (
        "INV-02 violated — services/voting.compute_vote_state is missing. "
        "CLAUDE.md invariant #2."
    )


# ===========================================================================
# INV-03 — CLAUDE.md #3
# ===========================================================================

def test_invariant_03_cooking_log_atomically_updates_last_cooked_at(client: TestClient, db_session):
    """INV-03: Finalizing a CookingLog updates last_cooked_at and cook_count atomically.

    CLAUDE.md invariant #3: `recipes.last_cooked_at` and `recipes.cook_count`
    update in the SAME DB transaction as the `cooking_logs` finalize (PUT).
    This test verifies:
      a) After PUT /cooking-logs/{id}, both last_cooked_at and cook_count changed.
      b) The update is visible in the same session immediately after commit.
    """
    from sqlalchemy import select
    from app.models.recipe import Recipe
    from app.models.cooking_log import CookingLog

    # Get a seeded structured recipe for the test household
    recipe = db_session.scalar(
        select(Recipe).where(
            Recipe.status == "structured",
            Recipe.household_id.is_not(None),
        )
    )
    assert recipe is not None, "INV-03: no structured recipe found in seed data"
    original_cook_count = recipe.cook_count or 0
    recipe_id = str(recipe.id)

    # POST /recipes/{id}/cook — start a cooking session
    r_start = client.post(
        f"/recipes/{recipe_id}/cook",
        cookies={AUTH_COOKIE_NAME: SEED_TOKEN},
    )
    # May 409 if another active log exists today; in that case get the active log
    if r_start.status_code == 409:
        r_active = client.get(
            "/cooking-logs/active",
            cookies={AUTH_COOKIE_NAME: SEED_TOKEN},
        )
        log_id = r_active.json()["id"]
    else:
        assert r_start.status_code == 201, f"INV-03: start_cooking failed: {r_start.text}"
        log_id = r_start.json()["id"]

    # PUT /cooking-logs/{id} — finalize (rating is LogRating enum: loved/liked/disliked)
    r_finalize = client.put(
        f"/cooking-logs/{log_id}",
        json={"rating": "liked", "photo_paths": [], "notes": "INV-03 test"},
        cookies={AUTH_COOKIE_NAME: SEED_TOKEN},
    )
    assert r_finalize.status_code == 200, (
        f"INV-03: finalize failed: {r_finalize.text}"
    )

    # Verify last_cooked_at and cook_count were updated
    db_session.expire_all()
    recipe_after = db_session.scalar(
        select(Recipe).where(Recipe.id == recipe.id)
    )
    assert recipe_after.last_cooked_at is not None, (
        "INV-03 violated — last_cooked_at was not set after cooking log finalization. "
        "CLAUDE.md invariant #3: last_cooked_at MUST update atomically with cooking_logs."
    )
    assert (recipe_after.cook_count or 0) >= original_cook_count + 1, (
        f"INV-03 violated — cook_count ({recipe_after.cook_count}) did not increment "
        f"from {original_cook_count} after finalization. "
        "CLAUDE.md invariant #3: cook_count MUST update atomically with cooking_logs."
    )


def test_invariant_03_same_transaction_source_code():
    """INV-03 (static/AST): finalize_cooking_log updates Recipe in the same transaction.

    Verifies that routers/cooking_logs.py contains ACTIVE (non-commented) code
    that assigns both last_cooked_at and cook_count in the Recipe UPDATE call.
    Uses line-by-line filtering to exclude comment lines.
    """
    router_path = REPO_ROOT / "app" / "routers" / "cooking_logs.py"
    source = router_path.read_text()

    # The invariant comment is embedded in the source
    assert "invariant #3" in source, (
        "INV-03 violated — the 'invariant #3' marker comment is missing from "
        "routers/cooking_logs.py. CLAUDE.md invariant #3."
    )

    # Filter to non-comment, non-blank lines only
    active_lines = [
        line for line in source.splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    active_source = "\n".join(active_lines)

    # Both last_cooked_at and cook_count must be in ACTIVE (non-comment) code
    assert "last_cooked_at=log_row.cooked_at" in active_source, (
        "INV-03 violated — last_cooked_at=log_row.cooked_at is absent from active "
        "(non-commented) code in routers/cooking_logs.py. CLAUDE.md invariant #3."
    )
    assert "cook_count=Recipe.cook_count + 1" in active_source, (
        "INV-03 violated — cook_count increment missing from finalize_cooking_log. "
        "CLAUDE.md invariant #3."
    )


# ===========================================================================
# INV-04 — CLAUDE.md #4
# ===========================================================================

def test_invariant_04_household_mutations_broadcast(client: TestClient, db_session):
    """INV-04: Household-affecting mutations broadcast via broadcast_to_household.

    CLAUDE.md invariant #4: all household-syncing mutations must broadcast via
    `services/realtime.broadcast_to_household`. Tests POST /recipes (blank create)
    as the representative mutation — it broadcasts `recipe.created`.
    """
    captured_calls = []

    async def _spy(household_id, event_type, payload):
        captured_calls.append((household_id, event_type, payload))

    # Monkeypatch at BOTH the module-level export and the named import in recipes router
    with patch("app.services.realtime.broadcast_to_household", side_effect=_spy), \
         patch("app.routers.recipes.broadcast_to_household", side_effect=_spy):

        r = client.post(
            "/recipes",
            json={},
            cookies={AUTH_COOKIE_NAME: SEED_TOKEN},
        )
        assert r.status_code == 201, f"INV-04: recipe creation failed: {r.text}"

    recipe_id = r.json()["id"]
    broadcast_event_types = [et for _, et, _ in captured_calls]

    assert len(captured_calls) >= 1, (
        "INV-04 violated — broadcast_to_household was never called after POST /recipes "
        f"(recipe_id={recipe_id}). CLAUDE.md invariant #4: every household-affecting "
        "mutation MUST broadcast."
    )
    assert "recipe.created" in broadcast_event_types, (
        f"INV-04 violated — expected 'recipe.created' broadcast, got: {broadcast_event_types}. "
        "CLAUDE.md invariant #4."
    )


def test_invariant_04_cooking_started_broadcast(client: TestClient, db_session):
    """INV-04 (cooking.started): POST /recipes/{id}/cook broadcasts cooking.started."""
    from sqlalchemy import select
    from app.models.recipe import Recipe

    recipe = db_session.scalar(
        select(Recipe).where(Recipe.status == "structured")
    )
    assert recipe is not None, "INV-04: no structured recipe in seed"
    recipe_id = str(recipe.id)

    captured_calls = []

    async def _spy(household_id, event_type, payload):
        captured_calls.append((household_id, event_type, payload))

    with patch("app.services.realtime.broadcast_to_household", side_effect=_spy), \
         patch("app.routers.cooking_logs.broadcast_to_household", side_effect=_spy):

        r = client.post(
            f"/recipes/{recipe_id}/cook",
            cookies={AUTH_COOKIE_NAME: SEED_TOKEN},
        )
        # 201 on first cook today, 409 if already active
        assert r.status_code in (201, 409), (
            f"INV-04: unexpected status {r.status_code}: {r.text}"
        )

    if r.status_code == 201:
        broadcast_event_types = [et for _, et, _ in captured_calls]
        assert "cooking.started" in broadcast_event_types, (
            f"INV-04 violated — expected 'cooking.started' broadcast, got: {broadcast_event_types}. "
            "CLAUDE.md invariant #4."
        )


# ===========================================================================
# INV-05 — CLAUDE.md #5
# ===========================================================================

def test_invariant_05_source_capture_column_absent():
    """INV-05: Recipe model has no `source_capture` column.

    CLAUDE.md invariant #5: raw inputs kept forever in `recipe_turns`.
    The legacy `recipes.source_capture` JSONB column was dropped in Alembic
    migration 0009 (Phase 25 THREAD-01). It must not be reintroduced.
    """
    from app.models.recipe import Recipe

    column_names = {col.name for col in Recipe.__table__.columns}
    assert "source_capture" not in column_names, (
        f"INV-05 violated — Recipe table has a 'source_capture' column: {column_names}. "
        "Per CLAUDE.md invariant #5, raw inputs live in recipe_turns (position=0 turn), "
        "never in a per-recipe blob field."
    )


def test_invariant_05_first_user_turn_position_zero(client: TestClient, db_session):
    """INV-05: The first user turn has position=0 and preserves the capture payload.

    CLAUDE.md invariant #5: the first user turn (position 0, sender='user')
    stores the original capture payload verbatim so prompts can be re-run.
    """
    from sqlalchemy import select
    from app.models.recipe_turn import RecipeTurn

    # Create a new blank recipe and post a first user turn
    r_create = client.post(
        "/recipes",
        json={},
        cookies={AUTH_COOKIE_NAME: SEED_TOKEN},
    )
    assert r_create.status_code == 201
    recipe_id = r_create.json()["id"]

    payload_text = "Spaghetti Bolognaise avec pancetta"
    # TurnPayload is discriminated on `kind`; TextTurnPayload is {kind, text} (flat)
    r_turn = client.post(
        f"/recipes/{recipe_id}/turns",
        json={"kind": "text", "text": payload_text},
        cookies={AUTH_COOKIE_NAME: SEED_TOKEN},
    )
    assert r_turn.status_code == 201, f"INV-05: turn creation failed: {r_turn.text}"

    # Verify the turn was stored with position=0 and payload verbatim
    db_session.expire_all()
    import uuid
    turn = db_session.scalar(
        select(RecipeTurn).where(
            RecipeTurn.recipe_id == uuid.UUID(recipe_id),
            RecipeTurn.sender == "user",
            RecipeTurn.position == 0,
        )
    )
    assert turn is not None, (
        "INV-05 violated — no RecipeTurn with position=0 and sender='user' found "
        f"for recipe {recipe_id}. CLAUDE.md invariant #5."
    )
    # The router strips `kind` from payload before persisting: payload = {text: "..."}
    assert turn.payload.get("text") == payload_text, (
        f"INV-05 violated — position-0 turn payload {turn.payload!r} does not "
        f"preserve original capture text '{payload_text}'. CLAUDE.md invariant #5."
    )


def test_invariant_05_no_position_zero_update_api():
    """INV-05 (static): no API endpoint exposes PATCH/PUT on individual turns.

    CLAUDE.md invariant #5: turns are append-only (immutable). The router must
    not expose an endpoint that allows modifying an existing turn by its ID.
    """
    router_path = REPO_ROOT / "app" / "routers" / "recipes.py"
    source = router_path.read_text()

    # There should be no PUT or PATCH on /recipes/{id}/turns/{turn_id}
    # (a route that would allow editing an individual turn)
    has_turn_update = re.search(
        r'@router\.(put|patch)\s*\(\s*["\']/{recipe_id}/turns/\{',
        source,
    )
    assert has_turn_update is None, (
        "INV-05 violated — routers/recipes.py exposes a PUT/PATCH on individual turns "
        f"(found: {has_turn_update.group() if has_turn_update else ''}). "
        "Turns are append-only per CLAUDE.md invariant #5."
    )


# ===========================================================================
# INV-06 — CLAUDE.md #7
# ===========================================================================

def test_invariant_06_apscheduler_in_process_singleton():
    """INV-06: APScheduler is the module-level singleton in app.main.

    CLAUDE.md invariant #7: APScheduler runs in-process (single worker).
    The `scheduler` object must be the module-level AsyncIOScheduler singleton,
    not re-instantiated per request or worker.

    This test verifies:
      a) `app.main.scheduler` is an AsyncIOScheduler instance.
      b) It is the same object on repeated imports (singleton, not factory).
    """
    from app.main import scheduler as sched_a
    from app.main import scheduler as sched_b
    from apscheduler.schedulers.asyncio import AsyncIOScheduler

    assert isinstance(sched_a, AsyncIOScheduler), (
        "INV-06 violated — app.main.scheduler is not an AsyncIOScheduler instance. "
        "CLAUDE.md invariant #7."
    )
    assert sched_a is sched_b, (
        "INV-06 violated — app.main.scheduler is not a singleton (two imports yielded "
        "different objects). CLAUDE.md invariant #7: APScheduler must be module-level."
    )


def test_invariant_06_scheduler_job_id_pattern():
    """INV-06 (static): scheduler jobs are registered with id=f'shortlist_{hh.id}'.

    CLAUDE.md invariant #7: one cron job per household registered at startup.
    Verify the job-id pattern in main.py source matches 'shortlist_{hh.id}'.
    """
    main_path = REPO_ROOT / "app" / "main.py"
    source = main_path.read_text()

    assert "shortlist_{hh.id}" in source, (
        "INV-06 violated — app/main.py does not register scheduler jobs with "
        "id=f'shortlist_{hh.id}' pattern. CLAUDE.md invariant #7: one job per household."
    )
    assert "replace_existing=True" in source, (
        "INV-06 violated — scheduler.add_job does not set replace_existing=True. "
        "Without this, re-running lifespan would create duplicate jobs. CLAUDE.md invariant #7."
    )


def test_invariant_06_single_worker_documented():
    """INV-06 (docs): single-worker constraint documented in main.py.

    CLAUDE.md invariant #7: MUST run with a single uvicorn worker.
    The main.py module docstring must reference this constraint.
    """
    main_path = REPO_ROOT / "app" / "main.py"
    source = main_path.read_text()

    assert "single" in source.lower() and "worker" in source.lower(), (
        "INV-06 violated — app/main.py does not document the single-worker requirement. "
        "CLAUDE.md invariant #7: APScheduler is in-process; multiple workers would "
        "create N duplicate jobs."
    )


# ===========================================================================
# INV-07 — CLAUDE.md #8
# ===========================================================================

def test_invariant_07_cookie_wins_over_bearer(client: TestClient, db_session):
    """INV-07: The aldente_auth HttpOnly cookie wins over Bearer-header fallback.

    CLAUDE.md invariant #8: cookie-first auth (D-02, D-03). When BOTH a valid
    cookie AND a Bearer header are present, the server uses the cookie's identity,
    NOT the Bearer header's identity.

    Test:
    - Luca's cookie = SEED_TOKEN → identifies as Luca.
    - Partner's token in Bearer → would identify as Partner if Bearer won.
    - GET /auth/ws-token must return SEED_TOKEN (Luca's token, from cookie).
    """
    # Verify both tokens exist (seed sanity)
    r_luca = client.get(
        "/auth/ws-token",
        cookies={AUTH_COOKIE_NAME: SEED_TOKEN},
    )
    assert r_luca.status_code == 200, f"INV-07: Luca's cookie auth failed: {r_luca.text}"
    assert r_luca.json()["token"] == SEED_TOKEN

    r_partner = client.get(
        "/auth/ws-token",
        headers={"Authorization": f"Bearer {SEED_TOKEN_PARTNER}"},
    )
    assert r_partner.status_code == 200, f"INV-07: Partner Bearer auth failed: {r_partner.text}"
    assert r_partner.json()["token"] == SEED_TOKEN_PARTNER

    # Now send BOTH: cookie = Luca, Bearer = Partner. Cookie must win.
    r_both = client.get(
        "/auth/ws-token",
        cookies={AUTH_COOKIE_NAME: SEED_TOKEN},
        headers={"Authorization": f"Bearer {SEED_TOKEN_PARTNER}"},
    )
    assert r_both.status_code == 200, (
        f"INV-07: request with both cookie and Bearer returned {r_both.status_code}. "
        f"Body: {r_both.text}"
    )
    returned_token = r_both.json()["token"]
    assert returned_token == SEED_TOKEN, (
        f"INV-07 violated — response token '{returned_token}' does not match Luca's "
        f"cookie token '{SEED_TOKEN}'. The Bearer header won instead of the cookie. "
        "CLAUDE.md invariant #8: aldente_auth cookie MUST win over Bearer-header."
    )


def test_invariant_07_extract_token_cookie_first_source():
    """INV-07 (static): _extract_token checks cookie before Bearer header.

    CLAUDE.md invariant #8: cookie wins. Verify _extract_token in auth.py
    checks `aldente_auth` before Authorization.
    """
    auth_path = REPO_ROOT / "app" / "auth.py"
    source = auth_path.read_text()

    # Locate the _extract_token function and verify cookie is checked first
    assert "_extract_token" in source, (
        "INV-07 violated — _extract_token function missing from app/auth.py. "
        "CLAUDE.md invariant #8."
    )
    # The cookie check (aldente_auth) must appear before the bearer check
    cookie_pos = source.find("if aldente_auth")
    bearer_pos = source.find('lower().startswith("bearer ')
    assert cookie_pos != -1, (
        "INV-07 violated — cookie check missing from _extract_token. "
        "CLAUDE.md invariant #8."
    )
    assert bearer_pos != -1, (
        "INV-07 violated — bearer check missing from _extract_token. "
        "CLAUDE.md invariant #8."
    )
    assert cookie_pos < bearer_pos, (
        "INV-07 violated — Bearer check appears BEFORE cookie check in _extract_token. "
        "Cookie must win. CLAUDE.md invariant #8."
    )


# ===========================================================================
# INV-08 — CLAUDE.md #6
# ===========================================================================

# Locked pattern: HTTPException details are short internal codes (not French strings).
# These are translated to French by the frontend via next-intl.
# The convention: lowercase, typically 2-5 words, no capital-letter English sentences.
# A "raw English sentence" is multi-word, starts with a capital letter, and contains
# no underscores — e.g. "An error occurred while processing your request."

# Regex for a clearly-raw-English prose sentence: Capital + 10+ chars + spaces + no underscore
_RAW_ENGLISH_PROSE_RE = re.compile(
    r"^[A-Z][a-z]+(?: [a-z]+){3,}(?:\.)?$"  # "Something went wrong here."
)

# Allow list: known legitimate multi-word lowercase codes used in routers
_ALLOWED_MULTI_WORD_CODES = {
    "recipe not found",
    "shortlist not found",
    "cooking log not found",
    "household not found",
    "invite_code not found",
    "recipe has no initial user turn; post a /turns request first",
    "color already taken by another member",
    "another cooking session is active today",
    "endpoint must be https://",
    "household full",
    "name already taken",
    "photo_paths must be a subset of paths uploaded to this log",
    "recipe not in this shortlist",
    "path not on cooking log",
    "invalid token",
    "missing auth",
}


def _is_acceptable_detail(detail) -> bool:
    """Return True if the HTTPException detail follows the internal-code convention.

    Acceptable:
      - dict (e.g. {"detail": "household full", "code": "HOUSEHOLD_FULL"})
      - short lowercase string (≤ 80 chars, no capital-letter opening)
      - known multi-word codes in _ALLOWED_MULTI_WORD_CODES
      - strings with underscores (snake_case codes)

    NOT acceptable:
      - Multi-sentence English prose starting with a capital letter
        (e.g. "An unexpected error occurred while processing your request.")
    """
    if isinstance(detail, dict):
        return True  # dict form always acceptable
    if not isinstance(detail, str):
        return True  # non-string details (rare) are acceptable
    detail_str = detail.strip()
    # Allow if it matches the known code set
    if detail_str in _ALLOWED_MULTI_WORD_CODES:
        return True
    # Allow short strings (≤ 80 chars) that start lowercase or with digits
    if len(detail_str) <= 80 and (detail_str[0].islower() or detail_str[0].isdigit()):
        return True
    # Allow strings containing underscores (snake_case codes / format strings)
    if "_" in detail_str:
        return True
    # Allow strings with numbers (e.g. "file exceeds 8388609 bytes")
    if any(c.isdigit() for c in detail_str):
        return True
    # Reject raw English prose: starts with capital, multiple lowercase words, no underscore
    if _RAW_ENGLISH_PROSE_RE.match(detail_str):
        return False
    # Default: allow (conservative — only reject clear prose sentences)
    return True


def test_invariant_08_httpexception_details_are_internal_codes():
    """INV-08: All HTTPException detail strings are internal codes, not raw English prose.

    CLAUDE.md invariant #6: French-only via next-intl, day one. Backend
    HTTPException details are INTERNAL CODES that the frontend translates.
    They must NOT be raw English prose sentences starting with a capital letter
    (e.g. "An error occurred while processing your request.").

    The locked convention (confirmed by reading all 10 routers in 38-CONTEXT.md):
    details are short, lowercase, snake_case-ish strings the frontend maps to
    French via next-intl. Dict forms with a `code` key are also acceptable.

    This test statically walks routers/*.py and extracts all string literals
    passed as `detail=` arguments to HTTPException, then asserts each is
    consistent with the internal-code convention.
    """
    routers_dir = REPO_ROOT / "app" / "routers"
    router_files = list(routers_dir.glob("*.py"))
    assert len(router_files) > 0, "INV-08: no router files found"

    violations: list[str] = []

    for router_file in sorted(router_files):
        source = router_file.read_text()
        try:
            tree = ast.parse(source, filename=str(router_file))
        except SyntaxError:
            continue  # skip files with syntax errors (shouldn't happen)

        for node in ast.walk(tree):
            # Find HTTPException(... detail=...) calls
            if not isinstance(node, ast.Call):
                continue
            func = node.func
            func_name = ""
            if isinstance(func, ast.Name):
                func_name = func.id
            elif isinstance(func, ast.Attribute):
                func_name = func.attr
            if func_name != "HTTPException":
                continue

            # Extract the `detail` keyword argument
            for kw in node.keywords:
                if kw.arg != "detail":
                    continue
                detail_val = kw.value

                if isinstance(detail_val, ast.Constant):
                    detail = detail_val.value
                elif isinstance(detail_val, ast.Dict):
                    # dict detail — always acceptable
                    continue
                elif isinstance(detail_val, ast.JoinedStr):
                    # f-string — extract the constant prefix for heuristic check
                    # f-strings with variables are acceptable (e.g. "file exceeds {N} bytes")
                    continue
                else:
                    continue

                if not _is_acceptable_detail(detail):
                    violations.append(
                        f"{router_file.name}: HTTPException(detail={detail!r})"
                    )

    assert not violations, (
        "INV-08 violated — raw English prose found in HTTPException details. "
        "CLAUDE.md invariant #6: details must be internal codes the frontend "
        "translates via next-intl, not raw English sentences.\n"
        "Violations:\n" + "\n".join(f"  - {v}" for v in violations)
    )
