"""HTTP and WebSocket routers.

Each router module exposes a ``router`` ``APIRouter`` instance that gets mounted
in ``app.main``. Routers are thin HTTP adapters — domain logic lives in
``services/`` and ``models/``. Per SPEC.md §"Project structure":

    * ``households``    — onboarding (create/join) + ``GET /households/me`` (plan 01-04)
    * ``ws``            — WebSocket spine ``/ws?token=<auth_token>`` (plan 01-05)
    * ``recipes``       — recipe CRUD + capture surfaces (plan 01-08)
    * ``shortlist``     — daily voting list (plan 03-02)
    * ``votes``         — cast vote on shortlist recipe (plan 03-02)
    * ``cooking_logs``  — start cooking + active session lookup (plan 03-02)
"""

from app.routers import cooking_logs, push, shortlist, votes  # noqa: F401
