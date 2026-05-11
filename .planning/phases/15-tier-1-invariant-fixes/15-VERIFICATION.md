---
phase: 15-tier-1-invariant-fixes
verified: 2026-05-11T00:00:00Z
status: passed
score: 8/8 must-haves verified
overrides_applied: 0
requirements_verified:
  - INV-01
  - INV-02
roadmap_success_criteria:
  - id: SC1
    text: "No MEMBER_COUNT=2 hardcode remains in HomeDecide.tsx:52, VoteSummary.tsx:83, or services/voting.compute_vote_state"
    status: verified
  - id: SC2
    text: "Double-tap Finaliser increments cook_count exactly once; last_cooked_at stable; observable on recipe-detail surface AND DB-readable"
    status: verified
  - id: SC3
    text: "Architecture invariants #2 (voting state computed) and #3 (same-tx denormalized) hold under audit-revisit"
    status: verified
caveats:
  - text: "Race test in backend/tests/test_cooking_logs.py does not produce a red baseline against pre-fix code because the db_session fixture serializes both concurrent PUTs at Python session level. Catches structural regressions of the atomic-UPDATE-with-rowcount gate but not the original timing window."
    documented_in: "15-02-SUMMARY.md §Notes on red-baseline check"
    classification: known-limitation
    impact: "Test is a structural canary, not a true race simulation. Production-grade multi-connection fixture is INFRA-deferred per executor Rule 1 auto-fix."
  - text: "vote-state-n-members.spec.ts covers 3 of 5 vote states (valide, pressenti, conteste). sans_avis is unreachable post API-driven deck collapse; rejete is filtered from VoteSummary per D-06."
    documented_in: "15-CONTEXT.md D-15-10 and 15-03-SUMMARY.md"
    classification: seed-bounded
    impact: "Structural verification surface for memberCount==2 is locked. True N≠2 regression awaits an INFRA-backlog N≥3 seed. Drift detector at lib/votes.ts:78-95 covers remaining branches at bundle time."
  - text: "cooking-log-create-finalize.spec.ts remains test.fixme — Phase 17 (FIX-01) closes TZ-01 and lifts the marker. Double-tap assertion is wired but dormant in Phase 15."
    documented_in: "15-CONTEXT.md D-15-09 and 15-04-SUMMARY.md"
    classification: phase-deferred
    impact: "INV-02 contract is defended at backend unit-test layer (test_finalize_idempotent_concurrent). E2E mirror activates in Phase 17 with zero additional authoring."
human_verification: []
---

# Phase 15: Tier 1 Invariant Fixes Verification Report

**Phase Goal:** User sees architecturally-correct vote state and cook counts regardless of household size or finalize-tap rhythm — the two v0.3 Tier 1 audit findings are closed.

**Verified:** 2026-05-11
**Status:** PASSED
**Re-verification:** No — initial verification.
**Requirement IDs:** INV-01, INV-02

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | No `MEMBER_COUNT=2` hardcode remains in HomeDecide.tsx, VoteSummary.tsx, or services/voting.compute_vote_state (SC1) | VERIFIED | `grep -rn MEMBER_COUNT frontend/components/` → 0 matches; only mention is a comment in `vote-state-n-members.spec.ts:9` describing the removed hardcode. `grep "member_count: int = 2" backend/app/services/voting.py` → 0 matches. Function signature at voting.py:35-38 is `member_count: int` with no default. |
| 2 | Frontend reads live member count from `useSession()` in both consumer components | VERIFIED | `HomeDecide.tsx:167` threads `session?.members.length ?? 0` into the drift detector; `HomeDecide.tsx:430` threads `session.members.length` into the dealable filter (narrowed after the `!session \|\| !me` guard at line 339). `VoteSummary.tsx:97-98` consumes `useSession()` directly. |
| 3 | VoteSummary `memberCount?: number` prop and default `= 2` removed | VERIFIED | `VoteSummaryProps` (lines 31-41) has no `memberCount` field. Destructure at lines 78-88 omits it. Local `memberCount` is now `session?.members.length ?? 0` (the D-15-03 null-session short-circuit). |
| 4 | Backend compute_vote_state forces every caller to pass member_count | VERIFIED | `voting.py:37` reads `member_count: int,` (no default). Both production call sites pass explicitly: `routers/votes.py:87` and `routers/shortlist.py:179`. `from app.main import app` imports cleanly post-edit, proving no hidden caller relied on the default. |
| 5 | finalize_cooking_log uses atomic UPDATE-with-rowcount gate; Python check-then-act is gone (SC2 mechanism) | VERIFIED | `cooking_logs.py:188-201` issues `update(CookingLog).where(CookingLog.id == log_id, CookingLog.rating.is_(None)).values(...).returning(CookingLog.id)` and gates on `len(returned_ids) == 1`. The pre-edit `is_first_finalize = log_row.rating is None` Python check is gone (the only remaining mention is at line 150 inside the docstring describing what was replaced). |
| 6 | Same-tx denormalized recipe update (cook_count + last_cooked_at + last_cooked_photo_path) is inside `if is_first_finalize:` branch only — invariant #3 holds under double-tap (SC2 observable, SC3) | VERIFIED | `cooking_logs.py:203-217` — the `update(Recipe).where(Recipe.id == log_row.recipe_id).values(last_cooked_at=..., last_cooked_photo_path=..., cook_count=Recipe.cook_count + 1)` is unconditionally gated by `if is_first_finalize:`. Followed by `db.commit()` and `db.refresh(log_row)` (Pitfall 1 mitigation). The duplicate-tap branch at 246 commits the empty transaction and re-reads canonical state with no cook_count++ side effect. |
| 7 | Realtime broadcast contract (invariant #4) preserved across both branches | VERIFIED | First-finalize path (lines 227-240): `recipe.updated` + `cooking.finalized` (both). Duplicate-tap path (lines 256-264): `cooking.finalized` only (idempotent per D-15-05, clients tolerate redelivery). `recipe.updated` does NOT broadcast on duplicate-tap because the recipe didn't change. |
| 8 | Regression tests + canary spec exist and pass collection (SC3) | VERIFIED | `backend/tests/test_cooking_logs.py` collects 3 tests via `uv run pytest --collect-only`: `test_finalize_idempotent_concurrent`, `test_finalize_first_time_increments_cook_count`, `test_finalize_cross_household_returns_404`. `frontend/tests/e2e/vote-state-n-members.spec.ts` exists at 121 lines, NO `test.fixme` marker (regression canary is active). `cooking-log-create-finalize.spec.ts` extended with the INV-02 double-tap PUT block at lines 112-141 (gated by TZ-01 fixme per D-15-09). |

**Score:** 8/8 truths verified

### Required Artifacts (per PLAN frontmatters)

| Artifact | Expected | Status | Details |
|---------|---------|--------|---------|
| `backend/pyproject.toml` | pytest config + dev dep group | VERIFIED | Contains `[tool.pytest.ini_options]` at line 36 and `[dependency-groups]` at line 41. pytest 9.0.3 + pytest-asyncio 1.3.0 resolved. |
| `backend/tests/__init__.py` | package marker (0 bytes) | VERIFIED | Exists as 0-byte file. |
| `backend/tests/conftest.py` | db_session + client fixtures | VERIFIED | 72 lines. `db_session` (connection-scoped tx + rollback) at lines 38-52. `client` (TestClient with `app.dependency_overrides[get_db]` and `finally`-clear at line 71). Uses `DATABASE_URL_TEST` env override; default targets aldente_test on :5433. |
| `backend/app/routers/cooking_logs.py` | atomic UPDATE rewrite + rowcount gate | VERIFIED | Lines 140-265 are the rewritten `finalize_cooking_log`. SELECT-first 404 guard at 163-170 (T-04-01-03 preserved). Atomic UPDATE at 188-200 with `rating.is_(None)` guard. Same-tx recipe update inside `if is_first_finalize:` at 203-217. Duplicate-tap branch at 243-264 with idempotent broadcast. Other functions (start_cooking, get_active_cooking_log, upload_cooking_log_photo_endpoint, cooking_log_signed_photo_url) unchanged in shape. |
| `backend/app/services/voting.py` | member_count default removed | VERIFIED | Lines 35-46. Signature `member_count: int,` (no default). Docstring updated to reference Phase 15 / INV-01. Branch-order body (lines 51-60) byte-identical to pre-edit (the 5 if statements that mirror frontend/lib/votes.ts). |
| `backend/tests/test_cooking_logs.py` | 3 tests including race regression | VERIFIED | 205 lines (exceeds 80-line floor). All 3 tests present and collectable; uses `httpx.AsyncClient(transport=ASGITransport(app=app))` + `asyncio.gather` per Pattern 3. SEED_TOKEN environment override matches Playwright config. |
| `frontend/components/HomeDecide.tsx` | MEMBER_COUNT removed; session.members.length threaded | VERIFIED | No `MEMBER_COUNT` constant or references. Two call sites use the live count: line 167 (`session?.members.length ?? 0` in drift detector) and line 430 (`session.members.length` post-narrowing). VoteSummary call site at 473-484 omits the prop. Render guards (line 339 `!session \|\| !me`, line 355 `!partner`) preserved. |
| `frontend/components/VoteSummary.tsx` | memberCount prop removed; useSession() consumed | VERIFIED | `useSession` imported at line 17. `VoteSummaryProps` (31-41) has no memberCount. Destructure (78-88) has no memberCount. Body at 97-98 derives `memberCount` from session. useMemo dep array (line 113) preserves correctness. |
| `frontend/tests/e2e/vote-state-n-members.spec.ts` | regression canary (≥50 lines, not fixme'd) | VERIFIED | 121 lines. No `test.fixme` marker. Uses `seed-helpers.ts` exports (`SHORTLIST_RECIPES`, `VOTE_STATE_LABELS`). API-driven setup collapses deck to summary; asserts 3 reachable states + rejete absence. |
| `frontend/tests/e2e/cooking-log-create-finalize.spec.ts` | double-tap block appended; stays test.fixme | VERIFIED | `test.fixme` marker at line 33 preserved. eslint-disable comment at line 32 preserved. INV-02 double-tap idempotency block appended at lines 112-141 (second `request.put` + `expect.poll` asserting `cook_count === startCookCount + 1`, NOT +2). Header (lines 1-30) preserved with one added sentence (line 28-30) documenting Phase 15's contribution. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `cooking_logs.py:finalize_cooking_log` | Postgres row-level UPDATE locking | `update(CookingLog).where(CookingLog.rating.is_(None)).values(...).returning(CookingLog.id)` | WIRED | Pattern verified at lines 188-200. Three `rating.is_(None)` occurrences in file: line 83 (start_cooking 409 guard), 128 (get_active_cooking_log), and 192 (new atomic UPDATE). |
| `backend/tests/test_cooking_logs.py` | `app.main:app` | `httpx.AsyncClient(transport=ASGITransport(app=app))` | WIRED | Imported at line 21, used in all 3 tests (lines 131, 165, 194). `app_with_db_override` fixture (95-111) wires `app.dependency_overrides[get_db]` with finally-clear. |
| `HomeDecide.tsx` | `useSession()` | `session.members.length` passed into `computeVoteState` | WIRED | `useSession` imported at line 26; used at line 58. Drift detector call at 167; dealable filter at 430. |
| `VoteSummary.tsx` | `SessionProvider` | `import { useSession }` | WIRED | Import at line 17; call at line 97. `memberCount` derived at line 98 flows into `computeVoteState` at line 105. |
| `vote-state-n-members.spec.ts` | `/api/shortlists/today` + vote POST | API-driven setup + chip text assertion | WIRED | shortlist GET at line 54; vote POST at lines 66-70; chip-text assertions at 81-119. |
| `cooking-log-create-finalize.spec.ts` | `/api/recipes/{id}` cook_count | `expect.poll()` against recipe row | WIRED | Second `request.put` at line 124-126; re-poll asserting `.toBe(startCookCount + 1)` at line 131-141. |
| `conftest.py` db_session | Postgres on :5433 | `DATABASE_URL_TEST` env with default | WIRED | Line 27-30 reads env with default `postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `VoteSummary.tsx` rows | `memberCount` | `useSession()` → `session.members` (server-resolved from GET /api/households/me) | Yes — SessionProvider hydrates from the cookie session | FLOWING |
| `HomeDecide.tsx` dealable filter | `session.members.length` | same SessionProvider | Yes | FLOWING |
| `cooking_logs.py:finalize` cook_count | `Recipe.cook_count + 1` SQL expr | Postgres `recipes` row | Yes — SQLAlchemy `update().values()` parameter-bound | FLOWING |
| `test_cooking_logs.py` | `recipe.cook_count` post-PUT | `db_session.get(Recipe, recipe_id)` after `expire_all()` | Yes — real DB read post-rollback | FLOWING (within test transaction; rolled back at teardown) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Pytest collection succeeds (Plan 15-01 scaffold) | `uv run pytest --collect-only tests/test_cooking_logs.py` | "3 tests collected in 0.01s" | PASS |
| Backend imports cleanly (compute_vote_state default removal didn't break callers) | `grep -rn "compute_vote_state(" backend/app/` | All 3 call sites pass member_count explicitly | PASS |
| Frontend `lib/votes.ts` drift detector intact | `grep -n "drift\|throw new Error" frontend/lib/votes.ts` | 5 throw-on-drift checks at lines 84-88 | PASS |
| Realtime broadcast contract preserved | `grep -n "broadcast_to_household" backend/app/routers/cooking_logs.py` | 4 occurrences (start_cooking; first-finalize recipe.updated + cooking.finalized; duplicate-tap cooking.finalized) | PASS |
| `MEMBER_COUNT` fully eradicated from frontend production code | `grep -rn "MEMBER_COUNT" frontend --include="*.tsx" --include="*.ts"` | Only match is a comment in canary test (line 9) referring to the removed hardcode | PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| INV-01 | 15-02 (backend), 15-03 (frontend) | User sees architecturally-correct 5-state vote chip regardless of household size — MEMBER_COUNT=2 hardcode removed from frontend; backend compute_vote_state no longer defaults member_count=2. Architecture invariant #2 holds. | SATISFIED | Backend: `voting.py:37` has no default. Frontend: `HomeDecide.tsx` + `VoteSummary.tsx` thread live `session.members.length`. Drift detector at `lib/votes.ts:78-95` enforces parity with the Python mirror. Regression canary `vote-state-n-members.spec.ts` locks chip→state mapping for the 3 seed-reachable states. |
| INV-02 | 15-01 (scaffold), 15-02 (atomic UPDATE), 15-04 (E2E mirror) | User can re-tap Finaliser without cook_count doubling — recipes.cook_count and last_cooked_at honor same-tx idempotency. Architecture invariant #3 holds. | SATISFIED | Backend: `cooking_logs.py:188-264` implements atomic UPDATE-with-rowcount-gate; cook_count++ gated by `if is_first_finalize:`. Test: `test_finalize_idempotent_concurrent` collects and (per 15-02-SUMMARY) passed 3/3 on initial run. E2E: double-tap PUT block landed in `cooking-log-create-finalize.spec.ts` (test.fixme'd until Phase 17 closes TZ-01 per D-15-09). |

**Orphaned check:** REQUIREMENTS.md maps only INV-01 and INV-02 to Phase 15. No additional IDs are expected. No orphans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `cooking_logs.py` | 150 | Mention of `is_first_finalize = log_row.rating is None` (in docstring) | Info | Intentional reference inside docstring explaining the pre-edit pattern that was replaced. NOT a regression. |
| `vote-state-n-members.spec.ts` | 9 | Mention of `MEMBER_COUNT=2` in comment | Info | Intentional reference inside test header comment describing the removed hardcode. NOT a regression. |
| `test_cooking_logs.py` race fixture | n/a | Single-session override serializes Python concurrency | Warning (acknowledged) | Already documented in 15-02-SUMMARY.md — race test does not produce a red baseline against pre-fix code. Catches structural regressions, not the original timing window. Multi-connection fixture is INFRA-deferred. Per executor Rule 1 auto-fix; acceptable per the phase-15-specific known caveat list. |

No blocker anti-patterns. No TODO/FIXME/PLACEHOLDER in production code paths. No stub returns (`return null`, `return []`, `return {}` with no DB query) in the modified code.

### Architecture Invariant Audit (SC3)

| Invariant | Test | Status |
|-----------|------|--------|
| #2 (voting state computed, not stored) | `voting.py` only computes; `votes` table has no `state` column; both call sites pass live member_count | HOLDS |
| #3 (denormalized fields same-tx) | `update(Recipe).values(last_cooked_at, last_cooked_photo_path, cook_count)` runs before `db.commit()` inside `if is_first_finalize:`. Test `test_finalize_idempotent_concurrent` asserts `cook_count == start + 1` post-double-PUT. | HOLDS |
| #4 (realtime broadcast contract) | First-finalize: `recipe.updated` + `cooking.finalized`. Duplicate-tap: `cooking.finalized` only (idempotent per D-15-05). | HOLDS |

No new contracts introduced; no existing contracts relaxed. SC3 satisfied.

### Human Verification Required

None. All 8 truths verified programmatically via grep, AST inspection, pytest collection, and cross-file wiring checks. The 3 phase-specific caveats (race fixture limitation, 3-of-5 seed coverage, TZ-01-gated E2E) are explicitly acknowledged in the planning corpus and do NOT block the SC1/SC2/SC3 outcomes.

### Gaps Summary

No gaps. The phase achieves its three success criteria:

- **SC1** — MEMBER_COUNT=2 hardcode fully removed from all three named sites (HomeDecide.tsx, VoteSummary.tsx, services/voting.compute_vote_state).
- **SC2** — Atomic UPDATE-with-rowcount-gate closes the cook_count race at the DB layer; the `if is_first_finalize:` branch preserves invariant #3; duplicate-tap path is idempotent and re-reads canonical state without cook_count++. Observable on recipe-detail surface via the existing GET /api/recipes/{id} surface (unchanged). DB-readable via `recipe.cook_count` and `recipe.last_cooked_at`.
- **SC3** — Architecture invariants #2, #3, and #4 all hold post-edit. Branch-order parity locked by `lib/votes.ts` drift detector and the byte-identical body of `compute_vote_state`. Broadcast contract preserved with documented divergence on the duplicate-tap path (no `recipe.updated` because recipe didn't change).

The phase ships with three intentional, documented caveats (race fixture limitation; 3-of-5 state coverage; TZ-01-gated E2E) — all already absorbed into the planning corpus and called out as deferred work for INFRA backlog (multi-connection fixture, N≥3 seed) or for Phase 17 (TZ-01 fixme removal).

---

*Verified: 2026-05-11*
*Verifier: Claude (gsd-verifier)*
