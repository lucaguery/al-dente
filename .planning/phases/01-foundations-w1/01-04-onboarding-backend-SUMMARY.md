---
phase: 01-foundations-w1
plan: 04
subsystem: api
tags: [fastapi, pydantic-v2, sqlalchemy-2, supabase, postgres, bearer-auth, onboarding]

# Dependency graph
requires:
  - phase: 01-foundations-w1
    provides: "01-03 backend-scaffold — FastAPI app with /healthz, current_member dependency, generate_auth_token, SQLAlchemy 2 ORM models (Household + Member), baseline Alembic migration applied to dev Supabase"
  - phase: 01-foundations-w1
    provides: "01-01 shared-vocab — app/colors.py palette + is_valid_member_color (mirror of frontend/lib/colors.ts)"
provides:
  - "POST /households (create household + creator member, returns auth_token + invite_code)"
  - "POST /households/join (second member joins via invite code; 404 unknown / 409 color-taken / 422 non-palette)"
  - "GET /households/by-code/{code} (auth-free preview returning household_name + taken_colors for the Join screen disabled-swatch UX)"
  - "GET /households/me (Bearer-protected; returns household + roster — closes the INFRA-06 verification loop)"
  - "Invite-code service: 6-char uppercase alphanumeric via secrets.choice with collision-retry"
  - "Pydantic schemas package (app.schemas) — separate from ORM (app.models)"
affects: [01-06-onboarding-frontend, 01-07-ping-frontend-and-ws-client, 01-08-recipes-backend]

# Tech tracking
tech-stack:
  added: []  # all deps were already pinned in 01-03 (fastapi, sqlalchemy>=2, pydantic>=2)
  patterns:
    - "Router thin-adapter pattern: HTTP layer in app/routers/, domain helpers in app/services/, Pydantic types in app/schemas/ (separate from app/models/)"
    - "Pydantic field_validator for palette enforcement at the edge (T-01-04-04 mitigation lives one layer outside the router)"
    - "Two inserts in one transaction via db.flush() then db.commit() (household + creator member never split-brain)"
    - "Auth-free preview endpoint that deliberately omits sensitive fields (T-01-04-03: by-code/{code} returns colors but not member names)"

key-files:
  created:
    - "backend/app/routers/__init__.py"
    - "backend/app/routers/households.py"
    - "backend/app/schemas/__init__.py"
    - "backend/app/schemas/household.py"
    - "backend/app/schemas/member.py"
    - "backend/app/services/__init__.py"
    - "backend/app/services/invite_codes.py"
  modified:
    - "backend/app/main.py (added include_router(households.router))"

key-decisions:
  - "Sync SQLAlchemy session pattern (matching 01-03) — async would buy nothing at couple-scale; keep one driver, one mental model."
  - "Invite-code normalization at the Pydantic layer (.strip().upper() in JoinHouseholdRequest) — tolerate paste artifacts, reject anything that isn't 6 alnum chars after normalization."
  - "by-code/{code} preview is unauthenticated by design — the 6-char invite code IS the credential (32^6 = 2.18B keyspace, secrets.choice randomness). Schema deliberately omits member names so a leaked code reveals only household_name + taken_colors."
  - "OnboardingResponse shape echoes SPEC.md §Onboarding verbatim ({household_id, member_id, auth_token, invite_code}) so the frontend in 01-06 can stub against it without re-reading the source."

patterns-established:
  - "Pydantic v2 field_validator + classmethod + ValueError → FastAPI surfaces 422 automatically (no try/except in router code)."
  - "db.flush() to populate server_default UUIDs without committing — keeps two inserts atomic."
  - "current_member dependency reads member.household_id (not a path/query param) — closed-by-construction against the cross-household-read EoP threat (T-01-04-06)."

requirements-completed: [ONBOARD-01, ONBOARD-02, ONBOARD-04, ONBOARD-05, INFRA-06]

# Metrics
duration: 5m 8s
completed: 2026-05-05
---

# Phase 1 Plan 4: Onboarding Backend Summary

**Four-route household onboarding API (`POST /households`, `POST /households/join`, `GET /households/by-code/{code}`, `GET /households/me`) with Pydantic-validated palette enforcement, server-side invite-code generation, and Bearer-token gating that closes INFRA-06's protected-route verification loop.**

## Performance

- **Duration:** 5m 8s
- **Started:** 2026-05-05T17:09:26Z
- **Completed:** 2026-05-05T17:14:34Z
- **Tasks:** 2/2
- **Files modified:** 8 (7 created, 1 modified)

## Accomplishments

- Wired the `/households/*` router exactly as SPEC.md §"Onboarding" describes — same response shape, same status codes, no creative variations to surprise the 01-06 frontend planner.
- Closed the INFRA-06 verification loop end-to-end: `/households/me` now returns 401 without a Bearer header (TestClient + live curl both confirm) and 200 + roster with one. Before this plan, 01-03's `current_member` dependency was correct at code level but had no protected route to gate, so the contract couldn't be exercised.
- Cryptographically-random invite codes via `secrets.choice` with collision-retry — 36^6 = 2.18B keyspace resists brute-force enumeration (T-01-04-02) at the bounded couple-scale workload Railway free tier provides natural backpressure for.
- Auth-free `/by-code/{code}` preview gives the frontend Join screen the data it needs to render disabled swatches BEFORE submission, avoiding a 409 round-trip after a filled form. Deliberately omits member names so a leaked code reveals minimum information (T-01-04-03).
- 10-step curl smoke test (the full ONBOARD-01/02/04/05 + INFRA-06 happy-path + edge cases) passed against dev Supabase; smoke data cleaned up with cascade FK delete.

## Task Commits

Each task was committed atomically (`--no-verify` per parallel-executor protocol):

1. **Task 1: Pydantic schemas + invite-code service + households router** — `5b49e46` (feat)
2. **Task 2: Mount router in main.py + smoke test** — `ecd1085` (feat)

_Plan metadata commit (this SUMMARY) will be the next commit._

## Files Created/Modified

### Created

- `backend/app/routers/__init__.py` — package docstring; routers package exists for future /recipes, /ws, /pings.
- `backend/app/routers/households.py` — 4 endpoints: `POST /households`, `POST /households/join`, `GET /households/by-code/{code}`, `GET /households/me`. Each handler is a thin HTTP adapter; secrets generation lives in `app.auth` and `app.services.invite_codes`.
- `backend/app/schemas/__init__.py` — package docstring; Pydantic schemas live here separately from SQLAlchemy ORM models in `app.models`.
- `backend/app/schemas/household.py` — `CreateHouseholdRequest`, `JoinHouseholdRequest`, `HouseholdPublic`, `OnboardingResponse`, `HouseholdPreview`. Field validators enforce palette + invite-code normalization at the edge.
- `backend/app/schemas/member.py` — `MemberPublic` (no auth_token), `MemberWithToken` (reserved; not used in this plan).
- `backend/app/services/__init__.py` — package docstring.
- `backend/app/services/invite_codes.py` — `generate_unique_invite_code(db)` with collision-retry up to 10 attempts and `RuntimeError` on exhaustion (defensive cap; at 36^6 keyspace, 10 collisions before a unique requires ~10^59 existing households).

### Modified

- `backend/app/main.py` — added `from app.routers import households` and `app.include_router(households.router)` after CORS middleware. Did not touch CORS, did not remove `/healthz`.

## API Reference (for the 01-06 onboarding-frontend planner)

### `POST /households` — Create

**Request body:**
```json
{
  "household_name": "string (1-60)",
  "member_name":    "string (1-60)",
  "color_hex":      "one of MEMBER_COLORS (#F43F5E, #F59E0B, #10B981, #0EA5E9, #8B5CF6)"
}
```

**Response (201):**
```json
{
  "household_id": "UUID",
  "member_id":    "UUID",
  "auth_token":   "43-char base64url string",
  "invite_code":  "6-char uppercase alphanumeric"
}
```

**Errors:** 422 if `color_hex` not in palette; 422 if name lengths out of range.

### `POST /households/join` — Join

**Request body:**
```json
{
  "invite_code": "6-char alphanumeric (lowercase + whitespace tolerated; normalized server-side)",
  "member_name": "string (1-60)",
  "color_hex":   "one of MEMBER_COLORS, must not match an existing member's color"
}
```

**Response (201):** Same shape as `POST /households` (note `invite_code` is echoed back from the existing household, NOT a new one).

**Errors:** 404 unknown invite_code; 409 color already taken; 422 non-palette color or malformed input.

### `GET /households/by-code/{code}` — Preview (auth-free)

**Response (200):**
```json
{
  "household_name": "string",
  "taken_colors":   ["#F43F5E", "#10B981"]
}
```

**Errors:** 404 unknown code.

**Note:** intentionally omits member names. The 6-char code is the credential.

### `GET /households/me` — Roster (Bearer-protected)

**Headers:** `Authorization: Bearer <auth_token>`

**Response (200):**
```json
{
  "id":           "UUID",
  "name":         "household name",
  "invite_code":  "6-char code (visible to existing members so they can re-share)",
  "members": [
    { "id": "UUID", "name": "string", "color_hex": "#F43F5E", "joined_at": "ISO-8601" }
  ]
}
```

**Errors:** 401 missing/empty Bearer; 401 invalid token.

## Smoke Test Transcript

10-step curl flow against `http://localhost:8001` (uvicorn pointed at dev Supabase via the parent worktree's `backend/.env`). All assertions passed; smoke data deleted via cascade.

```
Step 1: GET /households/me (no auth)               → 401  ✓ (INFRA-06)
Step 2: POST /households (Smoke Foyer / Luca)     → 201, code=MMD1PP, token_len=43
Step 3: GET /households/me (Bearer token_a)       → 200, name+color present
Step 4: GET /households/me (Bearer "bogus")       → 401  ✓
Step 5: GET /households/by-code/ZZZZZZ            → 404  ✓
Step 6: GET /households/by-code/MMD1PP            → 200, taken_colors=["#F43F5E"]
Step 7: POST /households/join (same color)        → 409  ✓ (T-01-04-05)
Step 8: POST /households/join (#10B981, Partner)  → 201, token_b ≠ token_a
Step 9: GET /households/me (Bearer token_b)       → 200, both colors present
Step 10: POST /households/join (#000000)          → 422  ✓ (T-01-04-04)
```

Sample auth_token: `MdmVj7rHYEbfGYYhJ5KNUiKh79hnillMP-GaGFaMrJw` (43 chars, base64url, opaque).
Sample invite_code: `MMD1PP` (6 alnum uppercase).

After the test: `DELETE FROM households WHERE name='Smoke Foyer'` — 1 row removed; members cascaded via `ON DELETE CASCADE` FK.

## Decisions Made

- **Smoke target was local uvicorn → dev Supabase**, not Railway prod. Reason: this is a parallel-executor worktree (branch `worktree-agent-a6eca29a0c8ce4531`) and pushing directly to main from an executor would short-circuit the orchestrator's merge contract. The dev Supabase already had baseline migration `0001` applied (per the live-infrastructure context), so local uvicorn against the same DB exercises the production schema. Railway prod will pick up the change after the orchestrator merges this worktree to main (Dockerfile entrypoint runs `alembic upgrade head` on every boot — no manual deploy step).
- **db.flush() before db.commit()** in `create_household` — this lets the server-side `gen_random_uuid()` populate `household.id` before the second insert references it, while keeping both inserts in the same transaction. The alternative (two commits) would risk a household existing without any members.
- **`HouseholdPublic.invite_code` is exposed** to authenticated members. Reasoning: the second member needs to see the code to re-share; gating it would just push the frontend to call `by-code/{code}` for itself, which is silly when the surface is already auth-protected.

## Deviations from Plan

### [Rule 3 — Adapted to parallel-executor context] Did not push to main from this worktree

- **Found during:** Task 2 (smoke test step "Push to main so Railway picks up the new router").
- **Issue:** The plan was written assuming sequential execution, but I'm running as a parallel-executor agent on branch `worktree-agent-a6eca29a0c8ce4531`. Pushing directly to main from here would conflict with the orchestrator's worktree-merge protocol.
- **Fix:** Ran the smoke test against local uvicorn pointed at the same dev Supabase the production deploy uses. Both paths exercise the same routing logic and same baseline migration. The orchestrator owns the main-push step.
- **Files modified:** None (procedural, not code-level).
- **Verification:** All 10 smoke steps passed locally; `curl https://al-dente-production.up.railway.app/healthz` confirms Railway is up and ready to redeploy on merge.
- **Note:** The orchestrator (or a follow-up plan once Railway has redeployed) should re-run steps 1, 2, 3 of the smoke against `https://al-dente-production.up.railway.app/` to confirm the production-side end-to-end loop, then delete the resulting smoke row.

### [Rule 3 — Operational adaptation] Used parent worktree's `backend/.env` for the smoke run

- **Found during:** Task 2 setup.
- **Issue:** This worktree had no `backend/.env`, so uvicorn couldn't resolve `DATABASE_URL`.
- **Fix:** Copied `/Users/gulu3001/dev/al-dente/backend/.env` (gitignored, never committed) into the worktree, ran the smoke test, then deleted the local copy. `.env` is in `backend/.gitignore` so there is no risk of accidental commit.
- **Files modified:** None tracked.

## Threat Flags

None. The threat surface introduced by this plan is fully covered by the plan's `<threat_model>` (T-01-04-01 through T-01-04-08). No new auth paths, file-access patterns, or schema changes outside the planned scope.

## Self-Check: PASSED

- `backend/app/routers/__init__.py` — FOUND
- `backend/app/routers/households.py` — FOUND
- `backend/app/schemas/__init__.py` — FOUND
- `backend/app/schemas/household.py` — FOUND
- `backend/app/schemas/member.py` — FOUND
- `backend/app/services/__init__.py` — FOUND
- `backend/app/services/invite_codes.py` — FOUND
- `backend/app/main.py` — modified (include_router line present)
- Commit `5b49e46` (feat 01-04: schemas + invite codes + router) — FOUND in `git log`
- Commit `ecd1085` (feat 01-04: mount router) — FOUND in `git log`
- 10/10 smoke-test steps passed against dev Supabase (transcript above)
- INFRA-06 verification: 401 without Bearer, 200 with — both confirmed
