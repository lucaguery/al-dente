"""FastAPI application root.

Routers (households, recipes, ping, ws) are mounted by 01-04 / 01-05 / 01-06 / 01-08.
This module owns app construction, CORS, and the unauthenticated /healthz probe.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

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
    """Unauthenticated liveness probe used by Railway and the W1 ping gate."""
    return {"status": "ok"}


# routers wired in subsequent plans (01-04 households, 01-05 ws + ping, 01-08 recipes)
