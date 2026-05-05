---
phase: 01-foundations-w1
plan: 04
plan_number: 4
slug: onboarding-backend
type: execute
wave: 3
depends_on: [backend-scaffold, shared-vocab]
files_modified:
  - backend/app/main.py
  - backend/app/routers/__init__.py
  - backend/app/routers/households.py
  - backend/app/schemas/__init__.py
  - backend/app/schemas/household.py
  - backend/app/schemas/member.py
  - backend/app/services/__init__.py
  - backend/app/services/invite_codes.py
autonomous: true
requirements: [ONBOARD-01, ONBOARD-02, ONBOARD-04, ONBOARD-05, INFRA-06]
must_haves:
  truths:
    - "POST /households creates a household + creator member, returns {household_id, member_id, auth_token, invite_code}"
    - "POST /households/join with a valid invite code + name + color creates a second member, returns the same shape"
    - "GET /households/me returns the household + member list (with each member's color_hex) for the bearer-token holder"
    - "Joining with a color already taken by an existing member returns HTTP 409 (UI side disables the swatch via GET /households/by-code/{code} preview)"
    - "Any protected route called without a Bearer header returns HTTP 401 (closes INFRA-06 verification loop)"
    - "Joining with an unknown invite code returns HTTP 404"
  artifacts:
    - path: "backend/app/routers/households.py"
      provides: "POST /households, POST /households/join, GET /households/me, GET /households/by-code/{code}"
    - path: "backend/app/services/invite_codes.py"
      provides: "generate_invite_code() returns 6-char uppercase alphanumeric; collision-retry helper"
    - path: "backend/app/schemas/household.py"
      provides: "Pydantic CreateHouseholdRequest, JoinHouseholdRequest, HouseholdResponse, OnboardingResponse"
  key_links:
    - from: "backend/app/routers/households.py"
      to: "backend/app/auth.py"
      via: "Depends(current_member) on /households/me"
      pattern: "Depends\\(current_member\\)"
    - from: "backend/app/routers/households.py"
      to: "backend/app/colors.py"
      via: "is_valid_member_color() rejects non-palette colors"
      pattern: "is_valid_member_color"
    - from: "backend/app/main.py"
      to: "backend/app/routers/households.py"
      via: "app.include_router(households.router)"
      pattern: "include_router.*households"
---

<objective>
Wire the household onboarding API: create a household + creator member in one transaction, generate a 6-character uppercase alphanumeric invite code with collision-retry, accept join requests with a code + name + color, reject unknown codes (404) and taken-colors (409), and expose `GET /households/me` so the frontend can render the member list. This plan also closes the end-to-end INFRA-06 verification by giving the bearer-token middleware a real protected route to gate.

Purpose: ONBOARD-01, ONBOARD-02, ONBOARD-04, ONBOARD-05 (server side); INFRA-06 (real protected route to test against).
Output: A backend that can be exercised with `curl` to create a foyer, copy the invite code, join from a second client, and read back the household member list — all behind bearer auth.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundations-w1/01-CONTEXT.md
@.planning/phases/01-foundations-w1/01-UI-SPEC.md
@SPEC.md
@CLAUDE.md
@backend/app/main.py
@backend/app/auth.py
@backend/app/db.py
@backend/app/colors.py
@backend/app/models/household.py
@backend/app/models/member.py
</context>

<interfaces>
From 01-03 backend-scaffold:
- `app.db.Base`, `app.db.get_db` — SQLAlchemy session dependency.
- `app.auth.current_member(authorization, db)` — FastAPI dependency that loads the Member or raises 401.
- `app.auth.generate_auth_token()` — returns 43-char URL-safe base64 string.
- `app.models.Household(id, name, invite_code, created_at)`.
- `app.models.Member(id, household_id, name, color_hex, auth_token, joined_at)`.
- `app.colors.MEMBER_COLORS: list[str]` (5 hex strings) and `is_valid_member_color(hex)`.

From SPEC.md §"Onboarding":
- POST /households response shape: `{ household_id, member_id, auth_token, invite_code }`.
- POST /households/join response shape: same (different invite_code echoed back from server).
- Bearer token stored client-side in localStorage.

UI-SPEC.md §"Onboarding — Join" preview hint: "ColorSwatchPicker shows the foyer-creator's color as disabled (Lock icon, opacity-40)" — frontend needs `GET /households/by-code/{code}` returning the existing member colors for the join screen to render disabled swatches BEFORE the join request itself (prevents users from filling out a form that 409s).
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Pydantic schemas + invite-code service + households router</name>
  <files>backend/app/routers/__init__.py, backend/app/routers/households.py, backend/app/schemas/__init__.py, backend/app/schemas/household.py, backend/app/schemas/member.py, backend/app/services/__init__.py, backend/app/services/invite_codes.py</files>
  <read_first>
    - SPEC.md §"Onboarding" (response shape, bearer-token contract)
    - .planning/phases/01-foundations-w1/01-CONTEXT.md §"Claude's Discretion" — invite-code format (6 uppercase alphanumeric, regenerable, unique, server-side, collision-retry on insert); auth-token format (already implemented in 01-03)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Onboarding — Join" (hint about disabled-swatch preview)
    - backend/app/auth.py (use `generate_auth_token()` and `current_member`)
    - backend/app/colors.py (use `is_valid_member_color()`)
    - backend/app/models/household.py and backend/app/models/member.py (column types — esp. that `households.invite_code` is `TEXT UNIQUE`)
    - For SQLAlchemy 2.0 session patterns + FastAPI APIRouter idioms with Depends, query Context7 (`mcp__context7__`) using exact installed versions before writing the router. If unavailable, read `backend/.venv/lib/python3.12/site-packages/fastapi/routing.py` for the `APIRouter` API surface.
  </read_first>
  <action>
    Create empty `__init__.py` files: `backend/app/routers/__init__.py`, `backend/app/schemas/__init__.py`, `backend/app/services/__init__.py`.

    **`backend/app/services/invite_codes.py`** — invite-code generator with collision-retry:
    ```python
    import secrets
    import string
    from sqlalchemy import select
    from sqlalchemy.orm import Session
    from app.models.household import Household

    INVITE_CODE_ALPHABET = string.ascii_uppercase + string.digits  # 36 chars
    INVITE_CODE_LENGTH = 6  # per CONTEXT.md "Invite-code format"

    def _make_code() -> str:
        # secrets.choice for cryptographic randomness — invite codes are
        # public-facing and must resist guessing within the bounded keyspace
        # (36^6 = 2.18 billion). Per ONBOARD-04 brute-force threat (T-01-04-02).
        return "".join(secrets.choice(INVITE_CODE_ALPHABET) for _ in range(INVITE_CODE_LENGTH))

    def generate_unique_invite_code(db: Session, *, max_attempts: int = 10) -> str:
        """Returns a 6-char uppercase alphanumeric code that does not collide
        with any existing households.invite_code. Retries up to `max_attempts`
        times before raising RuntimeError (which the route handler should map
        to a 503 — but at couple-scale collisions are astronomically rare)."""
        for _ in range(max_attempts):
            code = _make_code()
            existing = db.scalar(select(Household.id).where(Household.invite_code == code))
            if existing is None:
                return code
        raise RuntimeError("invite-code collision retries exhausted")
    ```

    **`backend/app/schemas/member.py`** — shared Pydantic types:
    ```python
    from datetime import datetime
    from uuid import UUID
    from pydantic import BaseModel, Field

    class MemberPublic(BaseModel):
        # Public-facing member shape (no auth_token).
        id: UUID
        name: str
        color_hex: str
        joined_at: datetime

        model_config = {"from_attributes": True}

    class MemberWithToken(MemberPublic):
        # Returned exactly once on create/join (the auth_token is the secret).
        auth_token: str
    ```

    **`backend/app/schemas/household.py`** — request/response models:
    ```python
    from typing import List
    from uuid import UUID
    from pydantic import BaseModel, Field, field_validator
    from app.colors import is_valid_member_color
    from app.schemas.member import MemberPublic

    NAME_MIN = 1
    NAME_MAX = 60

    class CreateHouseholdRequest(BaseModel):
        household_name: str = Field(min_length=NAME_MIN, max_length=NAME_MAX)
        member_name: str = Field(min_length=NAME_MIN, max_length=NAME_MAX)
        color_hex: str

        @field_validator("color_hex")
        @classmethod
        def _validate_color(cls, v: str) -> str:
            if not is_valid_member_color(v):
                raise ValueError("color_hex not in member palette")
            return v

    class JoinHouseholdRequest(BaseModel):
        invite_code: str = Field(min_length=6, max_length=6)
        member_name: str = Field(min_length=NAME_MIN, max_length=NAME_MAX)
        color_hex: str

        @field_validator("invite_code")
        @classmethod
        def _normalize_code(cls, v: str) -> str:
            v = v.strip().upper()
            if not v.isalnum() or len(v) != 6:
                raise ValueError("invite_code must be 6 uppercase alphanumeric characters")
            return v

        @field_validator("color_hex")
        @classmethod
        def _validate_color(cls, v: str) -> str:
            if not is_valid_member_color(v):
                raise ValueError("color_hex not in member palette")
            return v

    class HouseholdPublic(BaseModel):
        id: UUID
        name: str
        invite_code: str  # OK to expose to current members; surface is auth-protected.
        members: List[MemberPublic]

        model_config = {"from_attributes": True}

    class OnboardingResponse(BaseModel):
        # Returned once on POST /households and POST /households/join.
        household_id: UUID
        member_id: UUID
        auth_token: str
        invite_code: str

    class HouseholdPreview(BaseModel):
        # Returned by GET /households/by-code/{code}; used by Join screen to
        # disable already-taken color swatches BEFORE the join attempt.
        # Auth-free by design (the invite code itself is the bearer of trust).
        household_name: str
        taken_colors: List[str]
    ```

    **`backend/app/routers/households.py`** — the router:
    ```python
    from uuid import UUID
    from fastapi import APIRouter, Depends, HTTPException, status
    from sqlalchemy import select
    from sqlalchemy.orm import Session

    from app.auth import current_member, generate_auth_token
    from app.db import get_db
    from app.models.household import Household
    from app.models.member import Member
    from app.schemas.household import (
        CreateHouseholdRequest,
        JoinHouseholdRequest,
        OnboardingResponse,
        HouseholdPublic,
        HouseholdPreview,
    )
    from app.services.invite_codes import generate_unique_invite_code

    router = APIRouter(prefix="/households", tags=["households"])


    @router.post("", response_model=OnboardingResponse, status_code=status.HTTP_201_CREATED)
    def create_household(
        body: CreateHouseholdRequest,
        db: Session = Depends(get_db),
    ) -> OnboardingResponse:
        # ONBOARD-01 / ONBOARD-02: create household + creator in one transaction.
        invite_code = generate_unique_invite_code(db)
        household = Household(name=body.household_name, invite_code=invite_code)
        db.add(household)
        db.flush()  # populate household.id without committing

        member = Member(
            household_id=household.id,
            name=body.member_name,
            color_hex=body.color_hex,
            auth_token=generate_auth_token(),
        )
        db.add(member)
        db.commit()
        db.refresh(member)
        return OnboardingResponse(
            household_id=household.id,
            member_id=member.id,
            auth_token=member.auth_token,
            invite_code=household.invite_code,
        )


    @router.get("/by-code/{code}", response_model=HouseholdPreview)
    def household_preview(
        code: str,
        db: Session = Depends(get_db),
    ) -> HouseholdPreview:
        # ONBOARD-05 support: lets the join screen render the creator's color
        # as a disabled swatch BEFORE submission. Returns 404 on unknown code.
        # Surface is auth-free; the 6-char code IS the credential here.
        normalized = code.strip().upper()
        household = db.scalar(select(Household).where(Household.invite_code == normalized))
        if household is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="invite_code not found")
        members = db.scalars(select(Member).where(Member.household_id == household.id)).all()
        return HouseholdPreview(
            household_name=household.name,
            taken_colors=[m.color_hex for m in members],
        )


    @router.post("/join", response_model=OnboardingResponse, status_code=status.HTTP_201_CREATED)
    def join_household(
        body: JoinHouseholdRequest,
        db: Session = Depends(get_db),
    ) -> OnboardingResponse:
        # ONBOARD-04: lookup by invite_code, validate color is not already taken
        # (ONBOARD-05 server-side enforcement), create member.
        household = db.scalar(select(Household).where(Household.invite_code == body.invite_code))
        if household is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="invite_code not found")
        existing_colors = set(
            db.scalars(select(Member.color_hex).where(Member.household_id == household.id)).all()
        )
        if body.color_hex in existing_colors:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="color already taken by another member",
            )
        member = Member(
            household_id=household.id,
            name=body.member_name,
            color_hex=body.color_hex,
            auth_token=generate_auth_token(),
        )
        db.add(member)
        db.commit()
        db.refresh(member)
        return OnboardingResponse(
            household_id=household.id,
            member_id=member.id,
            auth_token=member.auth_token,
            invite_code=household.invite_code,
        )


    @router.get("/me", response_model=HouseholdPublic)
    def household_me(
        member: Member = Depends(current_member),
        db: Session = Depends(get_db),
    ) -> HouseholdPublic:
        # Protected route: closes the INFRA-06 verification loop (without
        # Bearer → 401, with Bearer → 200 + household + member list).
        household = db.get(Household, member.household_id)
        members = db.scalars(select(Member).where(Member.household_id == member.household_id)).all()
        return HouseholdPublic(
            id=household.id,
            name=household.name,
            invite_code=household.invite_code,
            members=[m for m in members],
        )
    ```
  </action>
  <verify>
    <automated>cd backend && test -f app/routers/households.py && test -f app/schemas/household.py && test -f app/schemas/member.py && test -f app/services/invite_codes.py && grep -q "generate_unique_invite_code" app/services/invite_codes.py && grep -q "secrets.choice" app/services/invite_codes.py && grep -q "Depends(current_member)" app/routers/households.py && grep -q "is_valid_member_color" app/schemas/household.py && grep -q "color already taken" app/routers/households.py && grep -q "invite_code not found" app/routers/households.py && uv run python -c "from app.routers.households import router; from app.services.invite_codes import _make_code, generate_unique_invite_code; codes = {_make_code() for _ in range(50)}; assert all(len(c) == 6 and c.isalnum() and c.isupper() for c in codes), codes; assert len(codes) == 50, 'low entropy'; print('OK', len(codes))"</automated>
  </verify>
  <done>Router file exists; schemas validate color_hex against MEMBER_COLORS; invite-code generator is alnum-uppercase-6, cryptographically random, and the 50-sample uniqueness smoke test passes.</done>
</task>

<task type="auto">
  <name>Task 2: Mount router in main.py and run end-to-end CRUD smoke test against dev Supabase</name>
  <files>backend/app/main.py</files>
  <read_first>
    - backend/app/main.py (existing; add include_router line — do NOT replace the file)
    - .planning/phases/01-foundations-w1/01-03-SUMMARY.md (Railway URL + dev Supabase migration applied)
    - SPEC.md §"Onboarding" (request/response shapes used in the smoke-test curl)
  </read_first>
  <action>
    1. **Edit `backend/app/main.py`** — add `from app.routers import households` near other imports and `app.include_router(households.router)` after the CORS middleware setup. Do NOT touch CORS, do NOT remove `/healthz`.

    2. **Run the smoke-test sequence** locally against dev Supabase (the executor must have `backend/.env` with `DATABASE_URL` per 01-03 Task 3 part A). Start uvicorn in a background process: `cd backend && uv run uvicorn app.main:app --port 8001 &` (port 8001 to avoid collision with any prod-targeting runner; remember to kill the bg process after).

    Then execute the smoke flow with `curl` and capture exit codes:

    ```bash
    BASE=http://localhost:8001

    # 1. Unauthenticated GET on protected route → 401
    test "$(curl -s -o /dev/null -w '%{http_code}' $BASE/households/me)" = "401"

    # 2. Create household
    CREATE=$(curl -sS -X POST $BASE/households \
      -H "Content-Type: application/json" \
      -d '{"household_name":"Smoke Foyer","member_name":"Luca","color_hex":"#F43F5E"}')
    HID=$(printf '%s' "$CREATE" | python -c 'import sys,json;print(json.load(sys.stdin)["household_id"])')
    TOKEN_A=$(printf '%s' "$CREATE" | python -c 'import sys,json;print(json.load(sys.stdin)["auth_token"])')
    CODE=$(printf '%s' "$CREATE" | python -c 'import sys,json;print(json.load(sys.stdin)["invite_code"])')
    test ${#CODE} = "6"
    test ${#TOKEN_A} -ge "40"

    # 3. Authenticated GET /households/me → 200 with member list
    ME=$(curl -sS -H "Authorization: Bearer $TOKEN_A" $BASE/households/me)
    printf '%s' "$ME" | grep -q '"name":"Smoke Foyer"'
    printf '%s' "$ME" | grep -q '"color_hex":"#F43F5E"'

    # 4. Bad token → 401
    test "$(curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer bogus' $BASE/households/me)" = "401"

    # 5. Preview unknown code → 404
    test "$(curl -s -o /dev/null -w '%{http_code}' $BASE/households/by-code/ZZZZZZ)" = "404"

    # 6. Preview known code → 200 with creator's color marked taken
    PREVIEW=$(curl -sS $BASE/households/by-code/$CODE)
    printf '%s' "$PREVIEW" | grep -q '"#F43F5E"'

    # 7. Join with same color → 409
    test "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/households/join \
      -H 'Content-Type: application/json' \
      -d "{\"invite_code\":\"$CODE\",\"member_name\":\"Partner\",\"color_hex\":\"#F43F5E\"}")" = "409"

    # 8. Join with available color → 201 + new auth_token
    JOIN=$(curl -sS -X POST $BASE/households/join \
      -H 'Content-Type: application/json' \
      -d "{\"invite_code\":\"$CODE\",\"member_name\":\"Partner\",\"color_hex\":\"#10B981\"}")
    TOKEN_B=$(printf '%s' "$JOIN" | python -c 'import sys,json;print(json.load(sys.stdin)["auth_token"])')
    test "$TOKEN_A" != "$TOKEN_B"

    # 9. Both members visible to each other
    ME2=$(curl -sS -H "Authorization: Bearer $TOKEN_B" $BASE/households/me)
    printf '%s' "$ME2" | grep -q '"#F43F5E"'
    printf '%s' "$ME2" | grep -q '"#10B981"'

    # 10. Join with non-palette color → 422 (Pydantic validator)
    test "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/households/join \
      -H 'Content-Type: application/json' \
      -d "{\"invite_code\":\"$CODE\",\"member_name\":\"X\",\"color_hex\":\"#000000\"}")" = "422"
    ```

    3. After the smoke test passes, **clean up the smoke data** in dev Supabase: `DELETE FROM members WHERE name IN ('Luca','Partner') AND household_id IN (SELECT id FROM households WHERE name='Smoke Foyer'); DELETE FROM households WHERE name='Smoke Foyer';` (run via `psql $DATABASE_URL -c '...'` or a one-line `uv run python` script). This avoids polluting the dev DB with smoke-test rows that later phases might mistake for real data.

    4. **Push to main** so Railway picks up the new router (the running smoke test was local; production also needs the change). Verify Railway redeploys cleanly (check `curl https://<railway>/healthz` returns 200 within 60s of push, then `curl -X POST https://<railway>/households -H 'Content-Type: application/json' -d '{"household_name":"X","member_name":"Y","color_hex":"#F43F5E"}'` returns 201). Clean up the prod-side smoke row too.
  </action>
  <verify>
    <automated>grep -q "from app.routers import households" backend/app/main.py && grep -q "app.include_router(households.router)" backend/app/main.py && cd backend && uv run python -c "from fastapi.testclient import TestClient; from app.main import app; c = TestClient(app); r = c.get('/households/me'); assert r.status_code == 401, r.status_code; r2 = c.get('/households/by-code/ZZZZZZ'); assert r2.status_code == 404, r2.status_code; print('OK', r.status_code, r2.status_code)"</automated>
  </verify>
  <done>main.py mounts households router; FastAPI TestClient confirms unauth → 401 and unknown invite-code → 404 without needing the live DB (the route exists and routing works); the curl smoke test against dev Supabase passed all 10 steps; smoke data cleaned up; Railway redeploy verified.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → POST /households | Unauthenticated; anyone can create a household (acceptable: bounded by Supabase row count, no PII) |
| browser → POST /households/join | Unauthenticated; anyone can join IF they know a 6-char code |
| browser → GET /households/by-code/{code} | Unauthenticated; reveals only `household_name` and color list — no member names |
| browser → GET /households/me | Bearer-token-authenticated; returns full household + member roster |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-01-04-01 | Spoofing | request without Bearer reaches `/households/me` | high | mitigate | `Depends(current_member)` raises 401 (Task 1, verified by Task 2 curl step 1 + TestClient verify). Closes the INFRA-06 end-to-end verification that 01-03 could only assert at code level. |
| T-01-04-02 | Spoofing | invite-code brute force enumerates households | high | mitigate | 36^6 = 2.18B keyspace × `secrets.choice` randomness; 404 on unknown code is uniform (no timing leak from `db.scalar`). Rate limiting deferred (productize-later) — Railway free tier provides natural backpressure at couple-scale. Documented as accepted residual risk; revisit at productize. |
| T-01-04-03 | Information Disclosure | `/households/by-code/{code}` leaks member names | medium | mitigate | Schema returns only `household_name` + `taken_colors`, never names or auth tokens (Task 1 schema definition). |
| T-01-04-04 | Tampering | join with arbitrary color hex bypasses palette | medium | mitigate | Pydantic `field_validator` calls `is_valid_member_color()` (Task 1, verified by Task 2 curl step 10 → 422). |
| T-01-04-05 | Tampering | join with already-taken color creates duplicate | medium | mitigate | Server checks `existing_colors` set before insert; returns 409 (Task 1, verified by Task 2 curl step 7). |
| T-01-04-06 | Elevation of Privilege | bearer of household A reads household B `/me` | high | mitigate | `current_member` returns the Member; route reads `member.household_id` (NOT a request param) — no path for cross-household read in this endpoint. |
| T-01-04-07 | Repudiation | no audit log of household creation | low | accept | FastAPI default access log captures POST + status; productize-later for structured event log. |
| T-01-04-08 | Denial of Service | infinite loop on invite-code collision | low | mitigate | `max_attempts=10` then `RuntimeError` (Task 1) — at 36^6 keyspace, hitting 10 collisions before a unique requires ~10^59 existing households. Defensive cap is for safety, not necessity. |

`high` items (01, 02, 06) are all addressed in this plan or its predecessor.
</threat_model>

<verification>
Manual:
- Run the 10-step curl smoke test from Task 2 (covers ONBOARD-01/02/04/05 + INFRA-06 end-to-end).
- Confirm Railway prod accepts the same flow (one round-trip with the prod URL).
- `curl -i -H 'Authorization: Bearer ' <railway>/households/me` (empty token) returns 401.

Coverage map:
- ONBOARD-01 ✓ POST /households body shape (household_name + member_name + color_hex from 5-swatch palette).
- ONBOARD-02 ✓ Server returns `{ household_id, member_id, auth_token, invite_code }` exactly.
- ONBOARD-04 ✓ POST /households/join validates code, name, color, returns same shape.
- ONBOARD-05 ✓ Server-side: 409 on duplicate color. Frontend-side: GET /households/by-code/{code} provides the preview so the swatch renders disabled BEFORE submit (UI in 01-06).
- INFRA-06 ✓ /households/me returns 401 without Bearer; 200 with valid Bearer.
</verification>

<success_criteria>
ONBOARD-01, ONBOARD-02, ONBOARD-04, ONBOARD-05 (server-side), INFRA-06 — all verified by the 10-step curl smoke test passing against dev Supabase, plus the smoke-data cleanup completed.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundations-w1/01-04-SUMMARY.md` documenting:
- The 4 endpoints implemented and their exact request/response shapes (so 01-06 onboarding-frontend can stub against them).
- Smoke-test transcript (the 10 curl assertions) for the next planner-checker to grep.
- Note that `/households/me` is the canonical INFRA-06 verification probe.
</output>
