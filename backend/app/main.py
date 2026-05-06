"""FastAPI application root.

Routers (households, pings, ws, recipes) are mounted below. The pings + ws
pairing wires the SPEC.md "first concrete action" round-trip gate; pings.py
gets deleted in plan 01-12 once the gate passes on both phones (D-01), but
the WebSocket spine and ``services/realtime.broadcast_to_household`` outlive
it — every later mutation router (recipes in W1, capture promotion in W2,
votes in W3) reuses the same fan-out.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth_session, exports, households, pings, recipes, ws

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
    """Unauthenticated liveness probe used by Railway and the W1 ping gate."""
    return {"status": "ok"}


# Routers — order is presentational, not load-bearing.
# 01-04 households; 01-05 pings + ws; 01-08 recipes + exports; pings.router gets
# removed in 01-12 per D-01 once the W1 round-trip gate passes on both phones.
app.include_router(households.router)
app.include_router(pings.router)
app.include_router(ws.router)
app.include_router(auth_session.router)
app.include_router(recipes.router)  # 01-08
app.include_router(exports.router)  # 01-08
