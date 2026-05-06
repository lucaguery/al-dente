"""FastAPI application root.

Routers (households, ws, recipes) are mounted below. The WebSocket spine and
``services/realtime.broadcast_to_household`` are the household-sync chokepoint
used by every later mutation router (recipes in W1, capture promotion in W2,
votes in W3).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth_session, exports, households, photos, recipes, ws

app = FastAPI(title="Al Dente API", version="0.1.0")

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
app.include_router(households.router)
app.include_router(ws.router)
app.include_router(auth_session.router)
app.include_router(recipes.router)  # 01-08
app.include_router(exports.router)  # 01-08
app.include_router(photos.router)  # 01-09 — POST /recipes/{id}/photos
