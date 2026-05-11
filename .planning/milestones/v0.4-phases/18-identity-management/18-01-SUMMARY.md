---
phase: 18-identity-management
plan: 18-01
subsystem: backend/auth+households
tags: [identity, rename, capacity, broadcast, idm-01, idm-03]
requires:
  - "@backend/app/auth.py::current_member"
  - "@backend/app/services/realtime.py::broadcast_to_household"
  - "@backend/app/colors.py::MEMBER_COLORS"
provides:
  - "@backend/app/routers/households.py::rename_me  # PATCH /households/me"
  - "@backend/app/routers/households.py::join_household  # 422 HOUSEHOLD_FULL gate"
  - "@backend/app/schemas/member.py::MemberRenameRequest"
affects:
  - frontend/lib/households.ts  # IDM-02 will call PATCH /households/me
  - frontend/app/onboarding/join/page.tsx  # IDM-04 will handle 422 HOUSEHOLD_FULL
tech-stack:
  added: []
  patterns: [pydantic-v2-str-strip-whitespace, fastapi-httpexception-dict-detail, post-commit-broadcast]
key-files:
  created:
    - backend/tests/test_households.py
  modified:
    - backend/app/schemas/member.py
    - backend/app/routers/households.py
decisions:
  - D-18-01..04 applied verbatim (rename endpoint shape, uniqueness exclusion, post-commit broadcast)
  - D-18-09..11 applied verbatim (capacity gate before color check, structured 422 body)
  - D-18-17 applied (3 pytest cases: happy path, 409 dup, 422 capacity)
metrics:
  duration: ~25min
  completed: 2026-05-11
---

# Phase 18 Plan 01: Backend rename + capacity gate — Summary

Backend half of IDM-01 (`PATCH /households/me` member rename) and IDM-03 (`POST /households/join` 422 `HOUSEHOLD_FULL` when palette is exhausted), with pytest coverage. No frontend touches — those land in subsequent plans (18-02 for IDM-02 inline edit, 18-03 for IDM-04 capacity Card).

## What shipped

### `PATCH /households/me` — IDM-01 (backend/app/routers/households.py:253)

Member-scoped via `current_member` dependency. Body: `MemberRenameRequest(name: str)` with `min_length=1`, `max_length=40`, `str_strip_whitespace=True` (Pydantic v2 ConfigDict, runs BEFORE length validation so all-whitespace fails the min-1 check). Returns `MemberPublic` (omits `auth_token`).

Uniqueness check: `SELECT 1 FROM members WHERE household_id=:hh AND name=:new_name AND id != :me_id` — excluding self so a no-op rename to the current name is a 200 (idempotent), not a 409.

Broadcasts `member.updated` with `{id, name, color_hex}` payload via `broadcast_to_household` **after** `db.commit()` (invariant #4 — never broadcast a state the DB later rolls back). The endpoint is `async` so the `await broadcast_to_household(...)` runs in the same event loop as the websocket fanout; `broadcast_to_household` swallows per-socket failures so this never raises.

### `POST /households/join` capacity gate — IDM-03 (backend/app/routers/households.py:178)

Added a pre-check between the 404-on-unknown-code branch and the 409-on-color-collision branch:

```python
member_count = db.scalar(
    select(func.count(Member.id)).where(Member.household_id == household.id)
)
if member_count is not None and member_count >= len(MEMBER_COLORS):
    raise HTTPException(
        status_code=422,
        detail={"detail": "household full", "code": "HOUSEHOLD_FULL", "max_members": 5},
    )
```

Order matters: capacity is the broader denial (the user can't pick a different color out of it), so it runs first per D-18-10. The idempotent-rejoin short-circuit (existing member by name) still runs BEFORE capacity — a returning member of a full household can still re-auth.

### `MemberRenameRequest` schema — backend/app/schemas/member.py:39

```python
class MemberRenameRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=40)
```

Pydantic v2 `str_strip_whitespace=True` is the canonical pattern (CONTEXT.md §code_context "Established Patterns"). Stripping happens before length validation so `"   "` correctly fails as 0 chars.

### Tests — backend/tests/test_households.py (NEW, 3 cases)

| Test                                            | Asserts                                                              |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| `test_patch_me_rename_happy_path`               | 200, MemberPublic shape, no `auth_token` leak, DB row persisted      |
| `test_patch_me_rename_409_when_duplicate`       | 409, `detail="name already taken"`, caller row unchanged             |
| `test_join_returns_422_when_household_full`     | 422, `detail={code: "HOUSEHOLD_FULL", max_members: 5, detail: "..."}` |

All three use Phase 15 conftest fixtures (`db_session`, `client`) with per-test rolled-back transaction — member inserts (filler rows, collision row) are undone at teardown.

## Verification

- `cd backend && DATABASE_URL=... DATABASE_URL_TEST=... GEMINI_API_KEY=dummy uv run pytest tests/test_households.py -q --tb=short` → **3 passed**
- Full suite: `uv run pytest -q` → **18 passed** (15 prior + 3 new, no regressions)
- App-import smoke: `uv run python -c "from app.main import app; print('OK')"` → **OK**

Grep checks (success criteria):

```
@router.patch("/me", response_model=MemberPublic)         households.py:253  ✓
"code": "HOUSEHOLD_FULL"                                  households.py:186  ✓
"member.updated"                                          households.py:296  ✓
class MemberRenameRequest(BaseModel)                      member.py:39       ✓
backend/tests/test_households.py exists, 3 test_ defs                        ✓
```

## Deviations from Plan

None — the plan's `<important_constraints>` block specified the exact shape, and decisions D-18-01..04, D-18-09..11, D-18-17 were applied verbatim. Two minor implementation choices worth noting (not deviations, but design-time decisions inside the plan envelope):

1. **Uniqueness check excludes self.** D-18-02 wrote `id != :me_id` as a literal clause. I kept it — without that exclusion, a no-op rename to the current name would 409 (a UX papercut). The test `test_patch_me_rename_409_when_duplicate` explicitly targets ANOTHER member's name to discriminate.
2. **Capacity check runs after idempotent-rejoin.** D-18-10 specifies "BEFORE the color uniqueness check at line 169 — capacity is the broader gate". I read this as "before the *new-member-path* checks" — the idempotent-rejoin branch returns 201 without consuming a slot (the member already exists), so gating it on capacity would be a regression for returning members of a full household. The capacity check sits between the rejoin branch and the color-collision check, matching the spirit of D-18-10.

## Known Stubs

None. Both endpoints are fully wired (DB read → mutation → commit → broadcast → response). The frontend side (`renameMe` in `frontend/lib/households.ts`, inline-edit UI, 422 capacity Card) is explicitly out of scope for 18-01 — those land in 18-02 and 18-03.

## Self-Check

- `backend/app/schemas/member.py` — FOUND
- `backend/app/routers/households.py` — FOUND
- `backend/tests/test_households.py` — FOUND
- Commit `d2ec3fb` (Task 1) — FOUND
- Commit `981c82b` (Task 2) — FOUND
- Commit `c14d09b` (Task 3) — FOUND
- All 8 success criteria from the plan prompt — PASS

## Self-Check: PASSED

## Commits

| Hash      | Task | Summary                                                        |
| --------- | ---- | -------------------------------------------------------------- |
| `d2ec3fb` | 1    | feat(18-01): add MemberRenameRequest schema                    |
| `981c82b` | 2    | feat(18-01): PATCH /households/me + capacity 422 on /join      |
| `c14d09b` | 3    | test(18-01): pytest coverage for PATCH /me + capacity 422      |
