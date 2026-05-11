# Phase 15: Tier 1 invariant fixes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-11
**Phase:** 15-tier-1-invariant-fixes
**Areas discussed:** Member count source, Cook-count idempotency mechanism, last_cooked_at policy, Test coverage
**Mode:** --auto (Claude auto-selected recommended option for each grey area)

---

## Member Count Source (Bug 1: B-3, Issue #4)

| Option | Description | Selected |
|--------|-------------|----------|
| `session.members.length` from `useSession()` | Already available; zero new prop drilling; matches frontend session contract | ✓ |
| Server response field per call | Add `member_count` to `/api/shortlists/today` response; new contract surface | |
| New `/api/households/me/member-count` endpoint | Single-purpose endpoint; over-engineered for couple-scale | |

**Auto-selected:** `session.members.length` from `useSession()`.
**Rationale:** `useSession` is already imported in `HomeDecide.tsx`, and `VoteSummary.tsx` would naturally adopt the same pattern. Avoids new server contract changes. The session is fetched on mount and refreshed on auth events, so cardinality is current.

---

## Cook-Count Idempotency Mechanism (Bug 2: B-4, Issue #5)

| Option | Description | Selected |
|--------|-------------|----------|
| Atomic `UPDATE ... WHERE rating IS NULL` + rowcount gate | DB-level guarantee; no new column; uses existing `rating` as natural "finalized" marker | ✓ |
| `SELECT ... FOR UPDATE` row lock + Python check | Explicit lock; more familiar but heavier; needs explicit isolation level reasoning | |
| Optimistic-concurrency `version` column on `CookingLog` | Generalizes beyond finalize; over-engineered for one race window | |
| Application-level dedup cache (Redis / in-memory) | Doesn't survive worker restarts; APScheduler invariant says single worker — no Redis in stack | |

**Auto-selected:** Atomic `UPDATE ... WHERE rating IS NULL` + rowcount gate.
**Rationale:** Postgres row-level locking under UPDATE is exactly the primitive we need; rowcount=1 ⇒ "this PUT was the first finalize, commit the increment"; rowcount=0 ⇒ "another request already finalized, re-read and return persisted state". Stays in one DB tx, no new column, no Redis, honors invariant #3.

---

## last_cooked_at Policy on Re-Finalize

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current source (`log_row.cooked_at`) — gated behind atomic guard | `cooked_at` is set on `/cooking-logs/start` and never mutates; the value is identical on first vs second finalize anyway, so the existing source already satisfies "stays stable" | ✓ |
| Persist a separate `first_finalized_at` timestamp | New column, new migration; doesn't add information not already encoded in the `(log.cooked_at, log.rating IS NOT NULL)` pair | |

**Auto-selected:** Keep current source.
**Rationale:** Success criterion is "last_cooked_at stays stable across re-finalize". Current code already sources from `log_row.cooked_at`, which is immutable after `/cooking-logs/start`. The atomic guard prevents re-executing the recipe UPDATE on the duplicate-tap path, which is the actual fix — we don't need to change the source field.

---

## Test Coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Backend concurrency test + frontend e2e double-tap + N-member chip canary | Three small additions; backend race test is the high-value one; e2e validates observable user surface; chip canary establishes the structural test we'd extend if N≠2 ever ships | ✓ |
| Backend only (pytest race test) | Misses the user-facing recipe-detail surface where the bug was reported | |
| Frontend only (Playwright double-tap) | Misses the race — Playwright drives one client at a time; race needs concurrent server-side requests | |
| No new tests | Audit findings closing without regression tests would leak; the audit corpus explicitly tracks unverified vs verified | |

**Auto-selected:** Backend concurrency test + frontend e2e double-tap + N-member chip canary.
**Rationale:** The bug has two surfaces — server-side race (B-4) and client-side state (B-3) — and verification needs to touch both. The chip canary at 2-member shape doesn't fully cover N≠2 but establishes the test scaffolding so a future 3-member seed could light it up.

---

## Claude's Discretion

- Pytest scaffolding shape (`pyproject.toml`, `conftest.py`, TestClient fixture) — first Python tests in the repo; planner picks minimal idiomatic shape.
- SQLAlchemy 2.0 `update().returning()` vs `update()` + post-execute rowcount — planner picks whichever produces cleaner code.
- Optional invariant-comment refresh at `services/voting.compute_vote_state` — planner decides whether to add or leave the existing docstring.

## Deferred Ideas

- N≥3 member household seed (would unblock a true multi-member regression test) — backlog candidate.
- Generalized optimistic-concurrency token on `CookingLog` (would harden every PUT) — not justified for Phase 15.
- `MEMBER_COLORS` raw hex token sweep — explicitly Phase 20, not Phase 15.
