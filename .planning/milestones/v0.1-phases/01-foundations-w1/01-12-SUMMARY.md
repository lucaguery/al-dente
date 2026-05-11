---
phase: 01-foundations-w1
plan: 12
plan_number: 12
slug: dogfood-cleanup
subsystem: cleanup
tags: [d-01, cleanup, migration, realtime]
dependency_graph:
  requires:
    - 01-07-ping-frontend-and-ws-client (gate signal)
    - 01-05-realtime-and-ping-backend (the surface being removed)
    - 01-08-recipes-frontend-write (proves recipe broadcast still works)
  provides:
    - phase-1-complete-marker (entry to the 2-week dogfood gate)
    - clean-surface-area (no D-01 markers in source)
  affects:
    - backend/app/main.py (router list shrinks)
    - backend/alembic head (0001 → 0002)
    - frontend/app/page.tsx (no PingPanel mount)
    - dev + prod Supabase (pings table dropped — pending user action)
tech-stack:
  added:
    - alembic migration 0002 (drop_pings)
  patterns:
    - "Throwaway scaffolding lifecycle: introduced behind D-01 marker, deleted in same phase once dogfood gate passes"
    - "Forward-only DROP migration with stub recreate downgrade (no data restore in v0.1)"
key-files:
  created:
    - backend/alembic/versions/0002_drop_pings.py
  modified:
    - backend/app/main.py
    - backend/app/models/__init__.py
    - backend/app/routers/__init__.py
    - backend/app/services/__init__.py
    - backend/app/services/realtime.py
    - frontend/app/page.tsx
    - frontend/lib/i18n/fr.json
    - frontend/lib/ws.ts
  deleted:
    - backend/app/routers/pings.py
    - backend/app/schemas/ping.py
    - backend/app/models/ping.py
    - frontend/components/PingPanel.tsx
decisions:
  - "Apply 0002 with op.drop_table only (no DROP CASCADE) — nothing depends on pings, per the model docstring's 'DO NOT add foreign keys POINTING AT this table' rule"
  - "downgrade() is a best-effort recreate stub — rows are not restored. v0.1 has no users producing pings worth preserving and no migration policy that requires round-trip data fidelity"
  - "0001_baseline.py is NOT touched — left as historical record. The pings CREATE TABLE in baseline is balanced by the new DROP in 0002, keeping the migration log linear"
  - "Migration application to dev/prod Supabase + git push to main are deferred to user (parallel-executor scope is code changes only; user owns deploys per CLAUDE.md)"
metrics:
  duration_minutes: 4
  completed_date: 2026-05-06
---

# Phase 01 Plan 12: Dogfood Cleanup Summary

**One-liner:** D-01 honored — the entire ping surface (backend route + Pydantic schema + SQLAlchemy model + frontend PingPanel + i18n keys) is removed; alembic 0002 drops the table; the realtime spine that fanned out `ping.created` survives untouched and is now ready to carry `recipe.created`, `recipe.promoted`, and `vote.created` end-to-end.

## What Stayed vs What Went

### STAYED (the realtime spine, reused by every later mutation)

- `backend/app/services/realtime.py` — `broadcast_to_household()` plus the in-process `RealtimeRegistry` keyed on `household_id`
- `backend/app/routers/ws.py` — `/ws?token=<auth_token>` WebSocket endpoint with auth-then-register flow
- `frontend/lib/ws.ts` — partysocket reconnecting client (250ms → 5s exponential cadence, maxRetries=Infinity, 1008-on-bad-token wipe)
- `frontend/components/RealtimeProvider.tsx` — React provider exposing `useRealtime()` with toast bookkeeping
- The `realtime.reconnect_lost` i18n string (reused by future `recipe.promoted` / `vote.created` toasts)

### WENT (the throwaway D-01 scaffolding)

- `backend/app/routers/pings.py` (POST/GET /pings, ping.created broadcast call site)
- `backend/app/schemas/ping.py` (PingCreateRequest, PingResponse)
- `backend/app/models/ping.py` (SQLAlchemy `Ping` ORM model)
- `frontend/components/PingPanel.tsx` (W1 dogfood-gate UI)
- The `<PingPanel />` mount + `memberId` reader in `frontend/app/page.tsx`
- The `ping.*` i18n block in `frontend/lib/i18n/fr.json`
- `from app.models.ping import Ping` + `"Ping"` in `app/models/__init__.py`'s `__all__`
- `pings` from the `from app.routers import …` line + `app.include_router(pings.router)` in `app/main.py`
- Stale comments referring to `ping.created` in `services/__init__.py`, `services/realtime.py`, `routers/__init__.py`
- A `// TODO(productize): D-01` marker on `app/page.tsx`

## Verification Performed in Worktree

- `grep -RIn "ping"` across `frontend/app|components|lib` (`*.ts|*.tsx|*.json`) and `backend/app` (`*.py`) — no source-level references remain (only innocent substrings: `mapping`, `typing`, `pool_pre_ping`, `bookkeeping`)
- Strict grep for `PingPanel|/pings|ping_panel|ping.created` (frontend) and `from app.models.ping|from app.routers.pings|from app.schemas.ping|app.include_router(pings|class Ping(` (backend) — both empty
- `from app.db import Base; import app.models` + assert — table set is exactly `[cooking_logs, daily_shortlists, households, members, recipes, votes]` (6 tables, no `pings`)
- FastAPI `TestClient` smoke — `GET /pings` and `POST /pings` both return 404; `GET /healthz` returns 200
- `0002_drop_pings.py` Python module loads; `revision == "0002"`, `down_revision == "0001"`, both `upgrade` and `downgrade` are callable
- `alembic/versions/` contains exactly the two expected files: `0001_baseline.py` and `0002_drop_pings.py`
- JSON validity check on `frontend/lib/i18n/fr.json` after the `ping` block removal

## Deviations from Plan

### Rule 3 — Auto-fix blocking issues

**1. [Rule 3 — Blocking] Worktree base lacks recipes/exports/photos routers**

- **Found during:** Task 3
- **Issue:** Plan instructed the imports line in `app/main.py` to change from `from app.routers import households, pings, ws, recipes, exports, photos` → `from app.routers import households, ws, recipes, exports, photos`. But the worktree's actual base only has `households`, `pings`, `ws` routers (recipes/exports/photos are wave-10 dependencies created by sibling worktree agents that have not landed in `main` yet).
- **Fix:** Edited `main.py` to `from app.routers import households, ws` (preserving only what exists), removed the `pings.router` include. The plan's success criterion (`! grep -q "pings" app/main.py`) holds. When recipes/exports/photos land via the orchestrator merge of sibling worktrees, those imports get added by their respective plans, not this one.
- **Files modified:** `backend/app/main.py`
- **Commit:** 639b084

**2. [Rule 3 — Blocking] Frontend `lib/ws.ts` had a stale comment `(01-05 realtime-and-ping-backend)`**

- **Found during:** Task 2 final grep
- **Issue:** The success criterion "no file in backend/ or frontend/ contains the string 'ping' except in this plan's downgrade migration body" failed because of this leftover plan-name reference in a comment.
- **Fix:** Edited the comment to read `(01-05 realtime backend)`.
- **Files modified:** `frontend/lib/ws.ts`
- **Commit:** 89b3019

### Rule 2 — Auto-add missing critical functionality

**3. [Rule 2 — Cleanup completeness] Stale `ping.created` mentions in services + routers `__init__.py` docstrings**

- **Found during:** Task 3 backend grep
- **Issue:** `app/services/__init__.py`, `app/services/realtime.py`, and `app/routers/__init__.py` each had docstring lines referencing `ping.created` / `pings` router as part of the realtime contract narrative. Per success criterion "no file in backend/ contains the string 'ping' except in this plan's downgrade migration body and any historical SUMMARY documents", these had to go.
- **Fix:** Stripped only the ping-specific lines; kept the wider docstrings intact (they still describe `recipe.created`, `recipe.promoted`, `vote.created`).
- **Files modified:** `backend/app/services/__init__.py`, `backend/app/services/realtime.py`, `backend/app/routers/__init__.py`
- **Commit:** 639b084

## Deferred Items (User-Owned Follow-ups)

The plan describes two operations that are out of parallel-executor scope:

1. **Apply 0002 to dev Supabase locally** — `cd backend && uv run alembic upgrade head` then verify `pings` is gone in the Supabase dashboard. This requires `DATABASE_URL` pointing at the user's dev Supabase project, which the executor does not have.
2. **Push to `main` to trigger Railway auto-deploy** — Railway's Dockerfile runs `alembic upgrade head` on container start, applying 0002 to prod Supabase. This is owned by the orchestrator (which merges all wave-10 worktrees) and the user (who pushes); not the parallel executor.

After the user runs (1) or merges the worktree and the deploy completes, prod Supabase should also report no `pings` table.

## Phase 1 Dogfood Gate Marker

**Phase 1 complete — entering 2-week dogfood. Phase 2 planning blocked until ≥ 2 weeks of daily use observed (per SPEC.md W1 dogfood gate).**

The "Definition of v0.1 done" is behavioral, not a feature checklist. With this plan committed:

- The W1 round-trip gate has been validated and the validation surface has been retired.
- All five Phase 1 success criteria (PWA install, household + invite, recipe write + read, realtime fan-out, French i18n) are wired into the surviving code.
- The realtime spine is in production shape and ready for W2's draft → structured promotion broadcast.

## Pointer for the next planner-checker

The Phase 1 success-criteria coverage map across the 12 plans in this phase lives at:

- `.planning/phases/01-foundations-w1/01-CONTEXT.md` (the original phase context)
- `.planning/phases/01-foundations-w1/01-{01..11}-SUMMARY.md` (per-plan summaries)
- `.planning/REQUIREMENTS.md` (the REQ-IDs each plan ticked off)

W2 planning should not start until the user reports ≥ 2 weeks of daily use by both household members.

## Threat Flags

None — this plan only removes surface area; it adds no new endpoints, auth paths, file access, or trust-boundary schema changes. The 0002 migration is a `DROP TABLE pings` + a stub recreate in `downgrade`; both are within the same trust boundary as 0001.

## Self-Check: PASSED

Verifications performed:

- `[ -f backend/alembic/versions/0002_drop_pings.py ]` → FOUND
- `[ ! -f backend/app/routers/pings.py ]` → confirmed deleted
- `[ ! -f backend/app/schemas/ping.py ]` → confirmed deleted
- `[ ! -f backend/app/models/ping.py ]` → confirmed deleted
- `[ ! -f frontend/components/PingPanel.tsx ]` → confirmed deleted
- `git log --oneline | grep 89b3019` → FOUND (Task 2)
- `git log --oneline | grep 639b084` → FOUND (Task 3)
- `grep -RIn "PingPanel|/pings|ping_panel|ping.created"` (frontend) → empty
- `grep -RIn "from app.models.ping|from app.routers.pings|from app.schemas.ping|app.include_router(pings|class Ping("` (backend) → empty
- SQLAlchemy `Base.metadata.tables` does not contain `pings`
- FastAPI app routes `/pings` GET + POST both return 404; `/healthz` returns 200
