"""FastAPI application root.

Routers (households, ws, recipes) are mounted below. The WebSocket spine and
``services/realtime.broadcast_to_household`` are the household-sync chokepoint
used by every later mutation router (recipes in W1, capture promotion in W2,
votes in W3).

Phase 3: lifespan registers an AsyncIOScheduler with one cron job per
household at 16:00 household-tz (CronTrigger + ZoneInfo). MUST run with a
single uvicorn worker — APScheduler is in-process. Per
.planning/phases/03-decide-w3/03-RESEARCH.md Pitfall 1: do NOT add
--workers > 1 (would create N duplicate jobs).
"""

import logging
from contextlib import asynccontextmanager
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.routers import (
    auth_session,
    cooking_logs,
    exports,
    households,
    photos,
    push,
    recipes,
    shortlist,
    votes,
    ws,
)

log = logging.getLogger(__name__)

# Module-level scheduler singleton — survives lifespan restarts. Started in
# lifespan, shut down on yield exit. Per Pitfall 1: must run single-worker.
scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Phase 3: start scheduler and register one cron per existing household
    # at 16:00 household-tz. New households created post-startup must call
    # `scheduler.add_job(...)` from their POST /households handler — out of
    # scope for v0.1 (households are created once at onboarding).
    from app.models.household import Household
    from app.services.shortlist import generate_daily_shortlist

    scheduler.start()
    try:
        with SessionLocal() as db:
            for hh in db.scalars(select(Household)).all():
                tz_name = hh.timezone or "Europe/Paris"
                try:
                    tz = ZoneInfo(tz_name)
                except Exception:  # noqa: BLE001 — fall back on bad tz
                    log.warning(
                        "household=%s bad timezone=%r — falling back to Europe/Paris",
                        hh.id,
                        tz_name,
                    )
                    tz = ZoneInfo("Europe/Paris")
                scheduler.add_job(
                    generate_daily_shortlist,
                    CronTrigger(hour=16, minute=0, timezone=tz),
                    args=[hh.id],
                    id=f"shortlist_{hh.id}",
                    replace_existing=True,
                    misfire_grace_time=3600,
                )
    except Exception as exc:  # noqa: BLE001 — startup must succeed
        log.warning("scheduler bootstrap failed err=%s", exc)

    # Phase 26 D-26 — provision recipe-urls bucket once at startup (idempotent).
    # RESEARCH §Area 9: chose startup helper over Alembic SQL to avoid
    # storage.buckets permission ambiguity on non-superuser Supabase connections.
    from app.services import storage as storage_service

    try:
        storage_service.ensure_url_bucket_exists()
    except Exception as exc:  # noqa: BLE001 — startup must succeed
        log.warning("recipe-urls bucket bootstrap failed err=%s", exc)

    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="Al Dente API", version="0.1.0", lifespan=lifespan)

# T-01-03-03 mitigation: explicit allowlist; no "*" wildcard.
# allow_credentials=True so the aldente_auth cookie can travel cross-origin in local dev
# (frontend on :3000 → backend on :8000). Production uses Vercel rewrites so calls are
# same-origin and credentials are same-origin by definition.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    """Unauthenticated liveness probe used by Railway."""
    return {"status": "ok"}


# Routers — order is presentational, not load-bearing.
# 01-04 households; 01-05 ws; 01-08 recipes + exports; 01-09 photos; 01-12 removed pings (D-01).
# 03-02 shortlist + votes + cooking_logs.
app.include_router(households.router)
app.include_router(ws.router)
app.include_router(auth_session.router)
app.include_router(recipes.router)  # 01-08
app.include_router(exports.router)  # 01-08
app.include_router(photos.router)  # 01-09 — POST /recipes/{id}/photos
app.include_router(shortlist.router)  # 03-02 — GET today / POST regenerate / POST delegate
app.include_router(votes.router)  # 03-02 — POST cast vote
app.include_router(cooking_logs.router)  # 03-02 — POST cook / GET active
app.include_router(push.router)  # 03-05 — POST /push/subscribe + GET /push/vapid-public-key
