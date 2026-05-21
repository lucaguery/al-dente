---
phase: 38-endpoint-contract-invariant-coverage
plan: "03"
subsystem: backend-tests
tags: [pytest, router-contracts, infra-routers, websocket, close-codes, auth-session, photos, push, exports]
dependency_graph:
  requires: [38-02]
  provides: [router-contracts-infra, ws-close-code-locked, coverage-baseline-38-03]
  affects:
    - backend/tests/test_auth_session_contract.py
    - backend/tests/test_exports_contract.py
    - backend/tests/test_photos_contract.py
    - backend/tests/test_push_contract.py
    - backend/tests/test_ws_contract.py
tech_stack:
  added: []
  patterns: [ws-close-code-assertion, multipart-upload-stub, storage-monkeypatch, broadcast-asyncmock]
key_files:
  created:
    - backend/tests/test_auth_session_contract.py
    - backend/tests/test_exports_contract.py
    - backend/tests/test_photos_contract.py
    - backend/tests/test_push_contract.py
    - backend/tests/test_ws_contract.py
  modified: []
decisions:
  - "D-38-05 adaptation: ws.py actually uses code 1008 (WS_1008_POLICY_VIOLATION) for both missing-token and invalid-token paths (ws.py:53,63) — not hypothetical 4401/4404; tests assert code==1008"
  - "push cross-household substitution: POST /push/subscribe has no household-scoped resource ID; substituted with GET /push/vapid-public-key 401 gate; documented in test module docstring"
  - "photos validation slot uses monkeypatched upload_recipe_photo raising ValueError('unsupported') → 415; avoids Supabase storage dependency in contract tests"
  - "ws malformed-frame test sends two frames and asserts no disconnect — verifies ws.py:78-79 silent-discard contract without app-state inspection"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-20"
  tasks_completed: 3
  files_modified: 5
---

# Phase 38 Plan 03: Infra-Router Contract Tests Summary

**One-liner:** 5 new contract test files (20 tests) lock the adapted happy/401/404/validation contracts for all 5 infra routers; WS close-code 1008 pinned; repo rises from 70.5% to 73.1%.

## Result

| Metric | Before (post-38-02) | After (Plan 38-03) |
|--------|---------------------|--------------------|
| Tests passed | 330 | 350 |
| Tests failed | 2 | 2 (same pre-existing B+C) |
| New contract test files | 0 | 5 |
| New tests added | 0 | 20 |
| Repo line coverage (TOTAL) | 70.5% | 73.1% |

## Per-Router Coverage Delta

| Router | Before (without 38-03 tests) | After (with 38-03 tests) | Delta |
|--------|------------------------------|--------------------------|-------|
| `app/routers/auth_session.py` | 81.8% | **100.0%** | +18.2pp |
| `app/routers/exports.py` | 60.9% | **100.0%** | +39.1pp |
| `app/routers/photos.py` | 41.7% | 79.2% | +37.5pp |
| `app/routers/push.py` | 61.5% | 92.3% | +30.8pp |
| `app/routers/ws.py` | 27.5% | 90.0% | +62.5pp |

## REQ-IDs Closed

| REQ-ID | Router | Contract File |
|--------|--------|---------------|
| ROUT-02 | `routers/auth_session.py` | `test_auth_session_contract.py` |
| ROUT-04 | `routers/exports.py` | `test_exports_contract.py` |
| ROUT-05 | `routers/photos.py` | `test_photos_contract.py` |
| ROUT-09 | `routers/push.py` | `test_push_contract.py` |
| ROUT-10 | `routers/ws.py` | `test_ws_contract.py` |

## D-38-05 Adaptation: WS Close Code

D-38-05 (38-CONTEXT.md) originally mentioned hypothetical codes 4401/4404 for auth failures.
The actual `routers/ws.py` implementation uses `status.WS_1008_POLICY_VIOLATION` (code 1008)
for BOTH missing-token and invalid-token paths (ws.py:53,63):

```
ws.py:52-53: if not token: await websocket.close(code=1008); return
ws.py:61-63: if member is None: await websocket.close(code=1008); return
```

Tests adapt to the actual code. Both `test_ws_close_on_missing_auth` and
`test_ws_close_on_invalid_token` assert `exc_info.value.code == 1008`.
The adaptation is documented in `test_ws_contract.py` module docstring.

## D-38-02 Cross-Household 404 Enforcement

| File | Cross-household assert |
|------|------------------------|
| `test_exports_contract.py` | `assert resp.status_code == 404, resp.text` — foreign Household via flush() |
| `test_photos_contract.py` | `assert resp.status_code == 404, resp.text` — foreign Household+Member+Recipe via flush() |
| `test_push_contract.py` | Substituted (see below) — no household-scoped resource ID in push router |
| `test_auth_session_contract.py` | Not applicable — session router has no household-scoped lookup |
| `test_ws_contract.py` | Not applicable — ws.py keys on server-derived household_id (never a client param) |

## Test File Structure

### test_auth_session_contract.py — 4 tests (ROUT-02)
- `test_delete_session_unauthenticated_returns_200` — DELETE /auth/session, no auth → 200 {"ok": True}; called twice (idempotency)
- `test_ws_token_with_bearer_returns_token` — GET /auth/ws-token Bearer → 200, token matches SEED_TOKEN
- `test_ws_token_without_auth_returns_401` — GET /auth/ws-token, no auth → 401
- `test_ws_token_with_malformed_bearer_returns_401` — GET /auth/ws-token "NotBearer xyz" → 401

Note: auth_session has no household-scoped resource lookup; there is no cross-household 404 path.
The 4-test contract is adapted to session-router semantics per the locked Plan 38-03 description.

### test_exports_contract.py — 4 tests (ROUT-04)
- `test_exports_happy_path` — GET /households/{hh_id}/export.json → 200, Content-Disposition: attachment, {"recipes": [...]}
- `test_exports_401_missing_auth` — same, no auth → 401
- `test_exports_404_cross_household` — foreign household_id (foreign Household via flush()) → 404 (D-38-02)
- `test_exports_422_validation` — malformed non-UUID path param → 422

### test_photos_contract.py — 4 tests (ROUT-05)
- `test_photos_happy_path` — POST /recipes/{id}/photos (JPEG, upload monkeypatched) → 201 + photo_paths updated
- `test_photos_401_missing_auth` — same, no auth → 401
- `test_photos_404_cross_household` — recipe in foreign Household (Household+Member+Recipe via flush()) → 404 (D-38-02)
- `test_photos_415_unsupported_media` — upload_recipe_photo raises ValueError("unsupported") → 415

Storage stubbing: `upload_recipe_photo` and `broadcast_to_household` are monkeypatched in
the happy-path test to avoid Supabase bucket and realtime dependencies.

### test_push_contract.py — 4 tests (ROUT-09)
- `test_push_happy_path` — POST /push/subscribe valid https+FCM endpoint → 201 {"ok": True}
- `test_push_401_missing_auth` — same, no auth → 401
- `test_push_vapid_public_key_401_missing_auth` — cross-household substitution: GET /push/vapid-public-key, no auth → 401 (see substitution note)
- `test_push_400_endpoint_must_be_https` — POST /push/subscribe with http:// endpoint → 400 "endpoint must be https://"

**Cross-household substitution:** POST /push/subscribe takes no household-scoped resource ID.
The endpoint subscribes the authenticated member by auth token, so there is no path or body
parameter to forge a foreign household ID. The 4th "cross-household" slot substitutes a
secondary auth-gate test (GET /push/vapid-public-key 401), verifying all push endpoints
enforce the auth gate. Substitution documented in the module docstring.

### test_ws_contract.py — 4 tests (ROUT-10)
- `test_ws_handshake_happy` — /ws?token=SEED_TOKEN, context manager does not raise
- `test_ws_close_on_missing_auth` — /ws no token → WebSocketDisconnect(code=1008)
- `test_ws_close_on_invalid_token` — /ws?token=garbage → WebSocketDisconnect(code=1008)
- `test_ws_handles_malformed_frame_silently` — valid token, send two garbage frames, no disconnect (ws.py:78-79 silent-discard)

## Combined app.routers Coverage Snapshot (Plan 38-04 Baseline)

| Router | Coverage |
|--------|----------|
| `app/routers/__init__.py` | 100.0% |
| `app/routers/auth_session.py` | 100.0% |
| `app/routers/cooking_logs.py` | 66.3% |
| `app/routers/exports.py` | 100.0% |
| `app/routers/households.py` | 63.3% |
| `app/routers/photos.py` | 79.2% |
| `app/routers/push.py` | 92.3% |
| `app/routers/recipes.py` | 68.3% |
| `app/routers/shortlist.py` | 59.5% |
| `app/routers/votes.py` | 100.0% |
| `app/routers/ws.py` | 90.0% |
| **TOTAL (routers)** | **71.7%** |

## No Source Files Modified

`git diff --stat main -- backend/app/` is empty. D-38-07 enforcement: VERIFIED.

## Follow-up TODOs

1. **photos.py remaining gaps (20.8% uncovered):** Lines 88, 97, 102, 115, 124 are
   the photo-cap-reached (409), oversize (413), empty-upload (400), and oversize-in-storage
   paths. Line 174/180/201 are in `signed_photo_url` (path-not-on-recipe 404, storage-miss
   warn, url response). The B-02 tests in `test_photos.py` cover the storage-miss path;
   the remaining gaps can be closed in Plan 38-04 if COV-01 (≥85%) requires it.

2. **push.py: push service coverage (35.9%):** `app/services/push.py` has very low
   coverage — the `send_test_to_member` function and its webpush fan-out are covered only
   by `test_push_test_endpoint.py` (which monkeypatches webpush). The actual HTTP delivery
   paths, 404/410 cleanup, and WebPushException handling branches are unreachable without
   a live push endpoint. These are structural gaps not addressable in a test-only phase
   without an external service stub. Surfaced as Plan 38-04 deferred item.

3. **ws.py remaining 3 lines (10% uncovered):**
   - Line 50: `cookie_token` assignment branch (cookie auth path not exercised by
     contract tests — ws.py:48-50 checks `websocket.cookies.get(AUTH_COOKIE_NAME)`)
   - Lines 82-83: the `except Exception` branch in the ws loop (non-disconnect error
     during receive_text). These are difficult to trigger in TestClient without
     injecting a low-level error. Plan 38-04 can add a targeted test if needed.

4. **2 pre-existing failures remain:**
   `test_llm_thread.py::test_process_thread_turn_failure_records_on_turn_payload`
   and `test_question_endpoints.py::test_defer_suppresses_question_in_run_thread_llm`
   are Category B and C bugs documented in 38-01-SUMMARY §Follow-up TODOs. Out of
   scope per D-38-07.

## Known Stubs

None — this plan creates only test files. No UI-rendering components or data-source
stubs introduced.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes
introduced. Test files only.

## Self-Check: PASSED

- `backend/tests/test_auth_session_contract.py` exists and contains 4 test functions ✓
- `backend/tests/test_exports_contract.py` exists and contains 4 test functions ✓
- `backend/tests/test_photos_contract.py` exists and contains 4 test functions ✓
- `backend/tests/test_push_contract.py` exists and contains 4 test functions ✓
- `backend/tests/test_ws_contract.py` exists and contains 4 test functions ✓
- All 20 new tests pass (350 total pass vs 330 baseline) ✓
- 2 pre-existing failures unchanged (Category B+C, out of scope) ✓
- WS tests assert `code == 1008` (actual ws.py close code, not hypothetical 4401/4404) ✓
- Cross-household tests assert `status_code == 404` where applicable (exports, photos) ✓
- Push cross-household substitution documented in module docstring ✓
- `git diff --stat main -- backend/app/` is empty (no source files touched) ✓
- Repo coverage: 73.1% ≥ 70.5% baseline ✓
- Commits `9a0d0e3` (Task 1) and `0bbe502` (Task 2) exist in git log ✓
