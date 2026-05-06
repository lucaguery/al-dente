"""Backend service modules — domain helpers separate from the router layer.

Pure-ish functions that operate on a SQLAlchemy session, kept out of routers so
they can be unit-tested without HTTP plumbing. Each service encapsulates one
cross-cutting concern:

- ``invite_codes`` — 6-char uppercase alphanumeric generator with collision-retry
  (plan 01-04). Used by ``routers/households.py`` when creating a household.
- ``realtime`` — household-scoped WebSocket broadcast registry. Every mutation
  router that should sync between phones imports ``broadcast_to_household`` from
  here. The full v0.1 realtime contract per CLAUDE.md "Architecture invariants"
  #4 routes through this single chokepoint:

    * ``recipe.created``  — emitted by routers/recipes.py (plan 01-08, W1)
    * ``recipe.promoted`` — emitted after draft → structured promotion in W2
    * ``vote.created``    — emitted by the votes router in W3
"""
