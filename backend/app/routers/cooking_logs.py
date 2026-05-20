"""Cooking-logs router — POST /recipes/{id}/cook + GET /cooking-logs/active +
PUT /cooking-logs/{id} (finalize, COOK-03 + COOK-05) +
POST /cooking-logs/{id}/photos + GET /cooking-logs/{id}/photo-url (Phase 4).

COOK-01: "Je commence à cuisiner" creates an immutable CookingLog with
cooked_at = now(). Phase 4's finalization PUT adds photos, rating, notes
and performs the same-tx denormalized update of recipes.last_cooked_at +
cook_count + last_cooked_photo_path (architecture invariant #3, COOK-05).

COOK-02: GET /cooking-logs/active returns the unfinalized log for today's
household (rating IS NULL proxy per A5 in 03-RESEARCH.md), or null. Used
by the home banner.

FIX-01 / TZ-01 (Phase 17): the COOK-01 409 guard and COOK-02 active
lookup compute "today" in the household's IANA timezone via
_household_today_in_tz(), and compare against `cooked_at AT TIME ZONE
household.timezone` via _cooked_at_in_tz_date(). Late-evening cooks no
longer fall through across the UTC offset window.

COOK-03 + COOK-05: PUT /cooking-logs/{id} accepts {photo_paths, rating,
notes}, finalizes the log, and in the SAME DB TRANSACTION updates the
parent recipe's last_cooked_at, cook_count (only on first finalization),
and last_cooked_photo_path. Broadcasts both `cooking.finalized` and
`recipe.updated` so the partner phone refreshes immediately.

Phase 17 / HIST-01 + HIST-02: GET /cooking-logs?days=N returns the
household's finalized logs from the last N days (sorted cooked_at
DESC). GET /cooking-logs/{log_id} returns a single household-scoped
log (404 not 403 on cross-household per T-04-01-03). Both are
read-only — no realtime broadcast (invariant #4 unaffected).

Phase 4 photos: POST /cooking-logs/{id}/photos mirrors the recipe-photos
endpoint (magic-byte sniff, 8 MiB cap, server-side path under
cooking-logs/{household_id}/{log_id}/), and GET /cooking-logs/{id}/photo-url
mints short-lived signed URLs scoped to the log.

Per Pattern 7: 409 Conflict if an unfinalized log already exists today.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from datetime import date as DateType
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.auth import current_member
from app.db import get_db
from app.models.cooking_log import CookingLog
from app.models.household import Household
from app.models.member import Member
from app.models.recipe import Recipe
from app.schemas.cooking_log import CookingLogFinalizeRequest, CookingLogResponse
from app.schemas.recipe import RecipeResponse
from app.services.realtime import broadcast_to_household
from app.services.storage import (
    MAX_BYTES,
    SIGNED_URL_TTL_SECONDS,
    create_signed_photo_url,
    upload_cooking_log_photo,
)

# SPEC.md: photo_paths ≤ 4 — mirror the recipe rule for cooking-log photos.
MAX_PHOTOS_PER_COOKING_LOG = 4

logger = logging.getLogger(__name__)


def _household_today_in_tz(household: Household) -> DateType:
    """Return today's date in household.timezone.

    FIX-01 / TZ-01 (per D-17-08): the active-cook filter must compare
    household-tz date to `cooked_at AT TIME ZONE household.timezone` —
    not Python's local-tz date to UTC. Late-evening cooks at 22:00
    Europe/Paris previously fell through because cooked_at stored UTC
    was already the next UTC day while the filter used local-tz today.

    Defensive fallback: invalid IANA timezone names (legacy 'PST',
    typos) emit a warning log and default to UTC — D-17 Claude's
    Discretion: "default to UTC fallback with a warn log".
    """
    try:
        tz = ZoneInfo(household.timezone)
    except ZoneInfoNotFoundError:
        logger.warning(
            "household_invalid_timezone household_id=%s timezone=%r fallback=UTC",
            household.id,
            household.timezone,
        )
        tz = ZoneInfo("UTC")
    return datetime.now(tz).date()


def _cooked_at_in_tz_date(household: Household):
    """SQL expression: date(cooked_at AT TIME ZONE household.timezone).

    `func.timezone(tz, ts)` shifts a timestamptz to a NAIVE timestamp in
    the named zone — `func.date(...)` then extracts the calendar date in
    that zone. Mirrors `_household_today_in_tz` so the Python "today"
    and the SQL "log's cooked-day" use the SAME tz.

    Bad-tz fallback is consistent with the Python helper: if the
    household timezone is invalid we fall back to 'UTC' here too so the
    filter at least functions instead of raising at query time.
    """
    tz_name = household.timezone
    try:
        ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        tz_name = "UTC"
    return func.date(func.timezone(tz_name, CookingLog.cooked_at))


# Two prefixes — POST is /recipes/{id}/cook (lives under /recipes for
# discoverability), GET is /cooking-logs/active. Use one router with no
# prefix and explicit paths.
router = APIRouter(tags=["cooking_logs"])


@router.post(
    "/recipes/{recipe_id}/cook",
    response_model=CookingLogResponse,
    status_code=201,
)
async def start_cooking(
    recipe_id: UUID,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    """COOK-01: start a cooking session. Immutable insert; rating/notes/
    photos are added by Phase 4's finalization PUT.
    """
    recipe = db.get(Recipe, recipe_id)
    if recipe is None or recipe.household_id != member.household_id:
        raise HTTPException(404, "recipe not found")

    # 409 if an unfinalized session exists today for this household.
    # FIX-01 / TZ-01 (D-17-08, D-17-09): "today" is the household's
    # IANA-timezone calendar day, compared against the log's `cooked_at AT TIME
    # ZONE household.timezone` date. Late-evening cooks no longer fall through.
    household = db.get(Household, member.household_id)
    if household is None:
        # current_member guarantees household_id refers to a real row, but
        # defensive guard: 404 rather than 500 if the row was deleted between
        # auth and this read.
        raise HTTPException(404, "household not found")
    today = _household_today_in_tz(household)
    existing = db.scalar(
        select(CookingLog).where(
            CookingLog.household_id == member.household_id,
            _cooked_at_in_tz_date(household) == today,
            CookingLog.rating.is_(None),
        )
    )
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="another cooking session is active today",
        )

    log_row = CookingLog(
        recipe_id=recipe_id,
        household_id=member.household_id,
        cooked_by_member_id=member.id,
        cooked_at=datetime.now(UTC),
    )
    db.add(log_row)
    db.commit()
    db.refresh(log_row)

    await broadcast_to_household(
        member.household_id,
        "cooking.started",
        {
            "log_id": str(log_row.id),
            "recipe_id": str(recipe_id),
            "cooked_by_member_id": str(member.id),
        },
    )
    return CookingLogResponse.model_validate(log_row)


@router.get(
    "/cooking-logs/active",
    response_model=CookingLogResponse | None,
)
def get_active_cooking_log(
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    """COOK-02: today's unfinalized cooking log for the household, or null.

    FIX-01 / TZ-01: "today" is the household's IANA-timezone calendar day; the
    SQL comparison shifts `cooked_at` into the same zone before extracting the
    date (D-17-09 — both callsites share the same TZ boundary).
    """
    household = db.get(Household, member.household_id)
    if household is None:
        return None
    today = _household_today_in_tz(household)
    log_row = db.scalar(
        select(CookingLog).where(
            CookingLog.household_id == member.household_id,
            _cooked_at_in_tz_date(household) == today,
            CookingLog.rating.is_(None),
        )
    )
    if log_row is None:
        return None
    return CookingLogResponse.model_validate(log_row)


@router.get(
    "/cooking-logs",
    response_model=list[CookingLogResponse],
)
def list_cooking_logs(
    days: int = Query(default=30, ge=1, le=365),
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    """HIST-01 — household's finalized cooking logs from the last `days`.

    Per D-17-01: filter by household_id == member.household_id,
    cooked_at >= now() - interval `days` days, rating IS NOT NULL
    (finalized only; the unfinalized `today` log surfaces via the
    dedicated /cooking-logs/active endpoint). Sort: cooked_at DESC.

    Per D-17-02: reuse CookingLogResponse — no eager-loaded recipe
    join. Frontend resolves recipe titles via its existing recipe
    fetch (couple-scale workload, ~30 logs max per page).

    Per D-17-03 + D-17-10: read-only — no realtime broadcast
    (invariant #4 unaffected). The relative `days` window is not
    timezone-sensitive (it's a duration, not a calendar boundary), so
    this endpoint does NOT use _household_today_in_tz / FIX-01's
    machinery.
    """
    cutoff = datetime.now(UTC) - timedelta(days=days)
    rows = db.scalars(
        select(CookingLog)
        .where(
            CookingLog.household_id == member.household_id,
            CookingLog.cooked_at >= cutoff,
            CookingLog.rating.is_not(None),
        )
        .order_by(CookingLog.cooked_at.desc())
    ).all()
    return [CookingLogResponse.model_validate(r) for r in rows]


@router.put(
    "/cooking-logs/{log_id}",
    response_model=CookingLogResponse,
)
async def finalize_cooking_log(
    log_id: UUID,
    body: CookingLogFinalizeRequest,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    """COOK-03 + COOK-05: finalize a cooking log and denormalize the parent
    recipe in the SAME DB TRANSACTION (architecture invariant #3).

    Phase 15 (INV-02 / B-4): atomic UPDATE-with-rowcount-gate replaces the
    Python check-then-act `is_first_finalize = log_row.rating is None`. Two
    concurrent PUTs can no longer both observe rating=NULL and both fire
    `cook_count + 1`; Postgres row-level UPDATE locking serializes the
    contenders, and rowcount=0 on the loser cleanly returns the canonical
    persisted state.

    Same household-scoped 404 policy as photos.py — cross-household reads do
    not leak existence (T-04-01-03). We do a SELECT-first existence check so
    rowcount=0 means unambiguously "already finalized" (not "wrong
    household") — Option A from 15-RESEARCH §Pattern 1.
    """
    # Step 1: cross-household 404 guard (T-04-01-03). MUST precede the atomic
    # UPDATE so rowcount=0 unambiguously means "already finalized".
    log_row = db.scalar(
        select(CookingLog).where(
            CookingLog.id == log_id,
            CookingLog.household_id == member.household_id,
        )
    )
    if log_row is None:
        raise HTTPException(404, "cooking log not found")

    # Step 2: defense-in-depth photo_paths subset check (T-04-01-01).
    persisted = set(log_row.photo_paths or [])
    proposed = list(body.photo_paths)
    for p in proposed:
        if p not in persisted:
            raise HTTPException(
                status_code=422,
                detail="photo_paths must be a subset of paths uploaded to this log",
            )

    # Step 3: atomic guard — UPDATE only if rating IS NULL. One returned row
    # means this PUT was the first finalize; zero rows means another
    # concurrent request (or this client's retry) won the race.
    # NOTE: with `.returning(...)`, SQLAlchemy gives back a CursorResult-like
    # object whose `.rowcount` is implementation-dependent for RETURNING
    # statements — consume the result rows and count them directly.
    returned_ids = db.execute(
        update(CookingLog)
        .where(
            CookingLog.id == log_id,
            CookingLog.rating.is_(None),
        )
        .values(
            rating=body.rating,
            photo_paths=proposed,
            notes=body.notes,
        )
        .returning(CookingLog.id)
    ).all()
    is_first_finalize = len(returned_ids) == 1

    if is_first_finalize:
        # Step 4a: same-tx denormalized recipe update (invariant #3).
        # last_cooked_at uses log_row.cooked_at (stable across re-finalize
        # because cooked_at is set at POST /cooking-logs/start and never
        # mutates — D-15-06).
        new_photo_path = proposed[0] if proposed else None
        db.execute(
            update(Recipe)
            .where(Recipe.id == log_row.recipe_id)
            .values(
                last_cooked_at=log_row.cooked_at,
                last_cooked_photo_path=new_photo_path,
                cook_count=Recipe.cook_count + 1,
            )
        )
        db.commit()
        # Refresh the ORM-cached log_row — the atomic UPDATE bypassed the
        # session cache so rating/notes/photo_paths in memory are stale
        # (15-RESEARCH §Pitfall 1).
        db.refresh(log_row)

        # Step 5a: both broadcasts on first-finalize path (invariant #4).
        recipe = db.get(Recipe, log_row.recipe_id)
        if recipe is not None:
            await broadcast_to_household(
                member.household_id,
                "recipe.updated",
                RecipeResponse.model_validate(recipe).model_dump(mode="json"),
            )
        await broadcast_to_household(
            member.household_id,
            "cooking.finalized",
            {
                "log_id": str(log_row.id),
                "recipe_id": str(log_row.recipe_id),
                "rating": log_row.rating,
            },
        )
        return CookingLogResponse.model_validate(log_row)

    # Step 4b: duplicate-tap path (rowcount == 0). Close the empty transaction
    # and re-read the canonical persisted state. The cross-household SELECT
    # at Step 1 already proved the log exists for this household.
    db.commit()
    log_row = db.scalar(
        select(CookingLog).where(
            CookingLog.id == log_id,
            CookingLog.household_id == member.household_id,
        )
    )

    # Step 5b: idempotent broadcast — clients tolerate redelivery per
    # invariant #4 (D-15-05). NOT recipe.updated (recipe didn't change).
    await broadcast_to_household(
        member.household_id,
        "cooking.finalized",
        {
            "log_id": str(log_row.id),
            "recipe_id": str(log_row.recipe_id),
            "rating": log_row.rating,
        },
    )
    return CookingLogResponse.model_validate(log_row)


@router.get(
    "/cooking-logs/{log_id}",
    response_model=CookingLogResponse,
)
def get_cooking_log(
    log_id: UUID,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    """HIST-02 — single household-scoped cooking log for the detail page.

    T-04-01-03: cross-household reads return 404 (never 403) — same
    pattern as photos.py and the existing PUT/POST endpoints in this
    module. Returns finalized OR unfinalized logs (the detail page
    may be reached from the active-cook banner before finalize, in
    addition to the history list after).
    """
    log_row = db.scalar(
        select(CookingLog).where(
            CookingLog.id == log_id,
            CookingLog.household_id == member.household_id,
        )
    )
    if log_row is None:
        raise HTTPException(404, "cooking log not found")
    return CookingLogResponse.model_validate(log_row)


@router.post(
    "/cooking-logs/{log_id}/photos",
    response_model=CookingLogResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_cooking_log_photo_endpoint(
    log_id: UUID,
    file: UploadFile = File(...),
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> CookingLogResponse:
    """Append a photo to a cooking log.

    Mirrors the threat model of backend/app/routers/photos.py:
      - 404 (not 403) on cross-household / unknown id (T-04-01-03)
      - magic-byte MIME sniff (T-04-01-04)
      - server-side path layout cooking-logs/{household_id}/{log_id}/{uuid}.{ext}
      - 8 MiB hard cap with `read(MAX_BYTES + 1)` overflow detection (T-04-01-05)

    No `recipe.updated` broadcast per upload — finalization (PUT) is the
    canonical sync point. Mid-finalization photos stream silently.
    """
    log_row = db.scalar(
        select(CookingLog).where(
            CookingLog.id == log_id,
            CookingLog.household_id == member.household_id,
        )
    )
    if log_row is None:
        raise HTTPException(404, "cooking log not found")

    current_paths = list(log_row.photo_paths or [])
    if len(current_paths) >= MAX_PHOTOS_PER_COOKING_LOG:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="photo limit reached",
        )

    content = await file.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"file exceeds {MAX_BYTES} bytes",
        )
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="empty upload")

    try:
        path = upload_cooking_log_photo(
            household_id=member.household_id,
            log_id=log_row.id,
            content=content,
        )
    except ValueError as exc:
        if str(exc) == "oversize":
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="oversize",
            ) from exc
        if str(exc) == "unsupported":
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="unsupported media",
            ) from exc
        raise

    # Reassign list (not in-place append) so SQLAlchemy detects the ARRAY change.
    log_row.photo_paths = current_paths + [path]
    db.commit()
    db.refresh(log_row)

    return CookingLogResponse.model_validate(log_row)


@router.get("/cooking-logs/{log_id}/photo-url")
def cooking_log_signed_photo_url(
    log_id: UUID,
    path: str = Query(..., min_length=1, max_length=300),
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> dict:
    """Mirror of GET /recipes/{id}/photo-url scoped to a cooking log.

    T-04-01-02 mitigation: validate that ``path`` is in ``log_row.photo_paths``
    so a member cannot mint signed URLs for arbitrary bucket objects.
    """
    log_row = db.scalar(
        select(CookingLog).where(
            CookingLog.id == log_id,
            CookingLog.household_id == member.household_id,
        )
    )
    if log_row is None:
        raise HTTPException(404, "cooking log not found")
    if path not in (log_row.photo_paths or []):
        raise HTTPException(404, "path not on cooking log")
    url = create_signed_photo_url(path)
    return {"url": url, "expires_in": SIGNED_URL_TTL_SECONDS}
