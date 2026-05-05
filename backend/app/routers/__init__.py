"""HTTP and WebSocket routers.

Each router module exposes a ``router`` ``APIRouter`` instance that gets mounted
in ``app.main``. Routers are thin HTTP adapters — domain logic lives in
``services/`` and ``models/``. Per SPEC.md §"Project structure":

    * ``households`` — onboarding (create/join) + ``GET /households/me`` (plan 01-04)
    * ``ws``         — WebSocket spine ``/ws?token=<auth_token>`` (plan 01-05)
    * ``pings``      — throwaway round-trip endpoint (plan 01-05; deleted in 01-12)
    * ``recipes``    — recipe CRUD + capture surfaces (plan 01-08)
"""
