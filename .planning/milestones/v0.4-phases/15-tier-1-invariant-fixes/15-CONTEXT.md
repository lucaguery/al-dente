# Phase 15: Tier 1 invariant fixes - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning
**Mode:** Auto (--auto) — Claude picked recommended defaults across grey areas

<domain>
## Phase Boundary

Close the two v0.3 Tier 1 audit findings:

1. **B-3 (Issue #4, invariant #2 break):** Frontend `MEMBER_COUNT = 2` hardcode at `HomeDecide.tsx:52, 168, 431, 480` + `VoteSummary.tsx:83` causes the 5-state vote chip to compute incorrectly in any household with N ≠ 2 members. Backend `services/voting.compute_vote_state` already parametrizes via `member_count` and the call site at `voting.py:12` already queries `func.count(Member.id)` — so backend is already correct, the leak is entirely on the frontend.
2. **B-4 (Issue #5, invariant #3 break):** Tapping `Finaliser` twice on the same `CookingLog` should leave `recipe.cook_count` incremented exactly once and `recipe.last_cooked_at` stable. Current code at `cooking_logs.py:180` (`is_first_finalize = log_row.rating is None`) is logically idempotent but is a check-then-act race — two concurrent PUTs can both observe `rating=None` and both fire `cook_count + 1`.

Out of scope for Phase 15: any non-Tier-1 audit findings (those are Phases 16-21).

</domain>

<decisions>
## Implementation Decisions

### Bug 1: Frontend member count source

- **D-15-01:** **Member count is read from `session.members.length`** (already available via `useSession()` in both `HomeDecide.tsx` and `VoteSummary.tsx`). No new prop drilling, no new server fetch. The constant `MEMBER_COUNT = 2` at `HomeDecide.tsx:52` is removed; the comment "v0.1: hard-coded household size; multi-tenant clean" is also removed because we now honor invariant #2.
- **D-15-02:** `VoteSummary.tsx:35-83` — the `memberCount?: number` prop with default `2` is removed; component reads from `useSession()` directly (matches the existing `useSession` import in HomeDecide). Removes "default that masks the bug" pattern.
- **D-15-03:** If `session` is null (loading/logged-out edge case), the vote-chip computation short-circuits to `sans_avis` rather than computing against `0` members — this matches the existing "Card render before session resolves" empty state in HomeDecide.

### Bug 2: Cook-count idempotency mechanism

- **D-15-04:** **Atomic guard via `UPDATE recipes SET cook_count = cook_count + 1, ... WHERE id = :rid AND ... AND (no_first_finalize_marker)` patterned through `cooking_logs.rating IS NULL`.** Replace the Python check-then-act with a DB-side conditional: `UPDATE cooking_logs SET rating=:r, photo_paths=:p, notes=:n WHERE id=:id AND rating IS NULL RETURNING id` — if the rowcount is 1, this PUT was the first finalize and we then atomically run the `Recipe.cook_count + 1` update in the same transaction; if rowcount is 0, another request already finalized and we re-read the log to return the canonical persisted state (no second increment).
- **D-15-05:** Both updates stay in the **same DB transaction** (architecture invariant #3). The `recipe.updated` and `cooking.finalized` WebSocket broadcasts stay attached to the successful-first-finalize path. On the duplicate-tap path, we still broadcast `cooking.finalized` (idempotent — clients tolerate redelivery; matches realtime contract invariant #4) but do NOT broadcast `recipe.updated` (recipe didn't change).
- **D-15-06:** `last_cooked_at` keeps its current source (`log_row.cooked_at`, the cooking-start timestamp). Because `cooked_at` is set on POST `/cooking-logs/start` and never changes thereafter, the second finalize's `last_cooked_at = log_row.cooked_at` value is identical to the first — the success-criterion "last_cooked_at stays stable" is already satisfied by the existing data flow. We do NOT re-execute the `UPDATE recipes SET last_cooked_at = ...` on the duplicate-tap path; the atomic guard above gates that too.
- **D-15-07:** No new column, no new lock table, no SELECT FOR UPDATE. The chosen pattern leans on Postgres's row-level locking guarantee at UPDATE time (rows with `rating IS NULL` get locked; the second concurrent request sees zero rows match and returns rowcount=0).

### Test coverage

- **D-15-08:** Backend: add `tests/test_cooking_logs.py::test_finalize_idempotent_concurrent` — fires 2 concurrent PUTs against the same `cooking_log` and asserts that `recipe.cook_count` increments by exactly 1, that both responses return identical bodies, and that exactly one `cooking.finalized` broadcast carries first-finalize semantics. (No Python test runner exists yet per CLAUDE.md — this is the kickoff Python test; planner will scaffold `pytest` with `uv run pytest`.)
- **D-15-09:** Frontend e2e: extend existing `cooking-log-create-finalize.spec.ts` (currently `test.fixme` for TZ-01) with a double-Finaliser-tap assertion — verifies recipe-detail surface shows `cook_count = 1` after two taps. TZ-01 fix is Phase 17 — this spec moves out of `test.fixme` in Phase 17, not Phase 15.
- **D-15-10:** Frontend e2e: add `vote-state-n-members.spec.ts` to the `seeded` project — verifies the 5-state vote chip computes correctly with the current seed (2 members, all 5 states). This is the regression-canary for B-3; doesn't fully cover N≠2 (we don't have a 3-member seed) but establishes the structural verification surface.

### Claude's Discretion

- Pytest configuration (`pyproject.toml [tool.pytest.ini_options]`, conftest.py, fixture for FastAPI TestClient + isolated DB transaction) — researcher + planner pick the minimal idiomatic shape.
- Exact ordering of the `is_first_finalize` rowcount return-shape (e.g., `RETURNING id, rating, ...` vs separate SELECT) — planner picks the simplest SQLAlchemy 2.0 expression that returns rowcount.
- Whether to add a small comment at `services/voting.compute_vote_state` re-asserting the parametrized-member-count contract (now load-bearing across both server and client mirror) — planner decides.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & invariants
- `CLAUDE.md` §Architecture invariants — invariant #2 (voting state computed) and invariant #3 (same-tx denormalized fields) — both load-bearing for this phase.
- `SPEC.md` §Voting — the 5-state machine definition (Validé / Pressenti / Contesté / Rejeté / Sans avis); branch order on `compute_vote_state` mirrors this.

### Audit corpus (the source of these bugs)
- `.planning/v0.3/ASSESSMENT.md` §Tier 1 — entries B-3 (MEMBER_COUNT hardcode, invariant #2) and B-4 (cook_count re-finalize idempotency, invariant #3).
- `.planning/v0.3/WALKTHROUGH.md` §Architecture-invariant violations cluster — original observations during the walkthrough audit.
- GitHub Issue #4 (MEMBER_COUNT) and Issue #5 (cook_count) — closed-by labels apply when shipping this phase.

### Code sites to modify
- Frontend (Bug 1): `frontend/components/HomeDecide.tsx:52, 168, 431, 480`; `frontend/components/VoteSummary.tsx:35, 83, 98, 106`; `frontend/lib/votes.ts` (mirror of `compute_vote_state` — verify branch-order parity still holds after the prop removal).
- Backend (Bug 2): `backend/app/routers/cooking_logs.py:140-227` (finalize_cooking_log endpoint, currently lines 180-203 hold the check-then-act window).
- Backend (Bug 1 — verification only, no change expected): `backend/app/services/voting.py:35-58`.

### Prior phase context (carried forward — not re-decided)
- Phase 7 §"5 computed vote states" — locked color story (emerald=Validé, terracotta=Pressenti, muted destructive=Contesté, neutral=Rejeté, ghost=Sans avis). UI does not change in Phase 15 — only the count fed into `computeVoteState`.
- Phase 8 §"Same-tx denormalized fields" — established the cook-count / last-cooked-at pattern this phase is now hardening against races.
- Phase 10 (v0.2.1) — Playwright suite shape, `seeded` vs `fresh` projects, iPhone-shape viewport. Phase 15's e2e additions land in the same shape.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useSession()` hook (`frontend/components/SessionProvider.tsx`) returns `{ status, session, refresh }` with `session.members: Member[]`. Already imported in `HomeDecide.tsx`; `VoteSummary.tsx` does not yet import it but the pattern is established.
- `computeVoteState(votes, memberCount)` mirror (`frontend/lib/votes.ts`) and `compute_vote_state(votes, member_count=2)` (`backend/app/services/voting.py`) — already accept member count as parameter. No signature change required.
- SQLAlchemy 2.0 `update().returning()` + `.rowcount` are the idiomatic atomic-guard primitives — backend already uses `update(Recipe).where(...).values(...)` patterns at lines 199-203.

### Established Patterns
- **Same-DB-tx denormalization** (invariant #3): cooking_logs.py:199-204 already commits the recipe update inside the same transaction as the log finalize. Atomic guard slots in cleanly.
- **WebSocket broadcast on mutation** (invariant #4): `broadcast_to_household` is the only authorized broadcast surface. Both `recipe.updated` and `cooking.finalized` already flow through it.
- **TestClient pattern for FastAPI** — no Python tests exist yet, but `app/main.py` exposes the app factory pattern compatible with `from fastapi.testclient import TestClient`.

### Integration Points
- `RealtimeProvider` consumes `cooking.finalized` via DOM CustomEvent bridge — no client change needed because the event shape doesn't change.
- Recipe-detail page (`frontend/app/recipes/[id]/page.tsx`) reads `cook_count` and `last_cooked_at` from the recipe record — no client change needed because the new atomic guard preserves the same persisted shape.

</code_context>

<specifics>
## Specific Ideas

- The user's framing in `.planning/v0.3/ASSESSMENT.md` is explicit: these are "architecture invariant breaks", not feature gaps. The fix must preserve the invariant contract (server-derived equals client-derived; same-tx denormalization) — not just patch the symptom.
- Phase 15 lands first because Phases 16 (capture pipeline) and 17 (history feature) both touch shared modules (`cooking_logs.py`, `services/voting.py`-adjacent code) — landing this clean baseline minimizes merge churn for the rest of the milestone.

</specifics>

<deferred>
## Deferred Ideas

- **N≥3 member household seed** — would let us write a true N-member regression test for B-3. Not in v0.4 scope (no new product capability, the seed is per-household and the production household is 2 members). Could become an INFRA backlog item.
- **Generalized optimistic-concurrency token on `CookingLog`** — would harden every PUT on the log surface, not just finalize. Out of scope for Phase 15 (would touch the broader log lifecycle). If a similar race surfaces on POST `/cooking-logs/{id}/photos`, file it as a new v0.4.x backlog item.
- **Frontend `MEMBER_COLORS` raw hex literals** — surfaced by C-1 in the audit and is the subject of Phase 20 (Token-completeness sweep), NOT Phase 15. Phase 15 does not touch color tokens.

</deferred>

---

*Phase: 15-tier-1-invariant-fixes*
*Context gathered: 2026-05-11*
