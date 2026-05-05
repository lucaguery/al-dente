"""Backend service modules.

Each service encapsulates one cross-cutting concern:

- ``realtime`` — household-scoped WebSocket broadcast registry. Every mutation
  router that should sync between phones imports
  ``broadcast_to_household`` from here. The full v0.1 realtime contract per
  CLAUDE.md "Architecture invariants" #4 routes through this single chokepoint:

    * ``recipe.created``  — emitted by routers/recipes.py (plan 01-08, W1)
    * ``recipe.promoted`` — emitted after the draft → structured promotion
      BackgroundTask in W2
    * ``vote.created``    — emitted by the votes router in W3

  Plus the throwaway ``ping.created`` event (D-01) that proves the loop end-to-end
  in W1 before any feature wiring depends on it.
"""
