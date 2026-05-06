"""FastAPI application root.

Routers (households, ws, recipes) are mounted below. The WebSocket spine and
``services/realtime.broadcast_to_household`` are the household-sync chokepoint
used by every later mutation router (recipes in W1, capture promotion in W2,
votes in W3).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import households, ws

app = FastAPI(title="Al Dente API", version="0.1.0")

# T-01-03-03 mitigation: explicit allowlist; no "*" wildcard.
# allow_credentials=False because we use Authorization: Bearer header, not cookies.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    """Unauthenticated liveness probe used by Railway."""
    return {"status": "ok"}


# Routers — order is presentational, not load-bearing.
# 01-04 households; 01-05 ws; 01-08 recipes (later).
app.include_router(households.router)
app.include_router(ws.router)
