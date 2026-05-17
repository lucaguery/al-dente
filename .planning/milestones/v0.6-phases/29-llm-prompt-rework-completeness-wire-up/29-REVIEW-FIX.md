---
phase: 29-llm-prompt-rework-completeness-wire-up
fixed_at: 2026-05-17T16:48:42Z
review_path: .planning/phases/29-llm-prompt-rework-completeness-wire-up/29-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 4
skipped: 1
status: partial
---

# Phase 29: Code Review Fix Report

**Fixed at:** 2026-05-17T16:48:42Z
**Source review:** .planning/phases/29-llm-prompt-rework-completeness-wire-up/29-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (CR-01, WR-01, WR-02, WR-03, WR-04)
- Fixed: 4 (CR-01, WR-01, WR-03, WR-04) — IN-03 fixed together with CR-01 per critical_context directive
- Skipped: 1 (WR-02 — deferred per disposition)

## Fixed Issues

### CR-01 + IN-03: Answer/proposal turn POST body nested payload key — backend 422

**Files modified:** `frontend/app/recipes/[id]/page.tsx`, `frontend/tests/e2e/recipe-detail.spec.ts`
**Commit:** d1672f7
**Applied fix:** Flattened all three handlers in `page.tsx` (`handlePostAnswerTurn`, `handlePostProposalAccepted`, `handlePostProposalDismissed`) from `{ kind, payload: { ... } }` to the flat top-level shape the backend discriminated union expects. Also fixed all three Playwright `request.post` calls in `recipe-detail.spec.ts` (lines 207, 241, 267) that sent `{ kind: 'text', payload: { text: ... } }` — flattened to `{ kind: 'text', text: ... }`. Both fixes share the same root cause and were committed atomically.

### WR-01: Missing `recipe.updated` broadcast after `_apply_extracted` in `_run_thread_llm`

**Files modified:** `backend/app/services/llm.py`
**Commit:** edd5fb1
**Applied fix:** Added `db.refresh(recipe)` plus a `broadcast_to_household(recipe.household_id, "recipe.updated", ...)` call immediately after the `db.commit()` / turn refreshes and before the `turn.created` loop. `RecipeResponse` and `broadcast_to_household` were already imported; no new imports needed. This ensures the partner's phone receives field mutations applied by `_apply_extracted` on every thread LLM run, satisfying architecture invariant #4.

### WR-03: UUID-vs-str de-dup mismatch in `_should_emit_advisory` and `_should_emit_question`

**Files modified:** `backend/app/services/llm.py`
**Commit:** 79e9368
**Applied fix:** Applied defensive `str()` normalization on both sides of the `in_reply_to_turn_id` comparison in both functions. In `_should_emit_advisory`: `ref_id = str((turn.payload or {}).get("in_reply_to_turn_id") or "")` compared against `str(most_recent_advisory.id)`. In `_should_emit_question`: same pattern against `str(most_recent_question.id)`. The `or ""` guard prevents `str(None)` producing `"None"` when the payload key is absent.

### WR-04: Stale-thread race in `trigger_next_question` between thread read and lock acquisition

**Files modified:** `backend/app/routers/recipes.py`
**Commit:** d566827
**Applied fix:** Moved the thread load and the entire field-selection / payload-build logic inside the `async with lock:` block. `compute_completeness(recipe)` (which only reads the recipe row, not the thread) stays outside the lock for efficiency. The thread re-read now happens after `acquire_position_lock`, eliminating the window where a concurrent `_run_thread_llm` BackgroundTask commit could produce a duplicate question turn for the same field.

## Skipped Issues

### WR-02: `asyncio.run()` ordering in `promote_draft` text branch — deferred per disposition

**File:** `backend/app/services/llm.py:1065`
**Reason:** Skipped per critical_context disposition. The current ordering (text branch calls `_broadcast_promoted` before `asyncio.run(_run_thread_llm(...))`) differs from the voice/photo pattern but works correctly today under FastAPI's BackgroundTask thread-pool-executor model (single uvicorn worker — invariant #7). Rewriting the ordering risks regressions across the three promotion branches. The fragility is documented: if uvicorn adopts `run_in_threadpool` with loop reuse, both `asyncio.run()` calls could raise. A comment was added to `_broadcast_promoted` in an earlier phase noting the sync-context-only restriction. No code change applied; marking for human review before any BackgroundTask model change.

---

_Fixed: 2026-05-17T16:48:42Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
