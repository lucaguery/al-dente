---
phase: 25-backend-foundation
fixed_at: 2026-05-13T11:55:00Z
review_path: .planning/phases/25-backend-foundation/25-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 25: Code Review Fix Report

**Fixed at:** 2026-05-13T11:55:00Z
**Source review:** .planning/phases/25-backend-foundation/25-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (1 Critical + 5 Warnings; 6 Info findings skipped per fix_scope=critical_warning)
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: `_record_rewrite_failure` is defined but never invoked — title-rewrite failures regress to `status='failed'`

**Files modified:** `backend/app/services/llm.py`
**Commit:** 546f1e5
**Applied fix:** Wrapped the `rewrite_title(...)` call in the text branch of `promote_draft` in a dedicated try/except that delegates to `_record_rewrite_failure(...)` on failure. The recipe is promoted to `status='structured'` (content is complete — only the catchy-title polish failed), the illustration is generated using the original (un-rewritten) title, `promotion_error` carries the truncated exception, and `recipe.promoted` is still broadcast (via `_record_rewrite_failure`'s tail). Restores Phase 24 RID-04 D-26 behavior that regressed during the Phase 25 promote_draft collapse.

### WR-01: `POST /recipes/url` accepts URLs up to 2000 chars but stores them in `recipe.title` — PUT will reject

**Files modified:** `backend/app/routers/recipes.py`
**Commit:** 30cf96c
**Applied fix:** Changed `title=url` to `title=url[:200]` in `create_url`, matching `RecipeUpdate.title`'s `max_length=200`. Subsequent PUTs that re-submit the existing title no longer 422. Full URL remains preserved verbatim in the turn payload (invariant #5 — raw inputs kept forever).

### WR-02: Photo capture leaks Storage objects on partial-upload failure

**Files modified:** `backend/app/routers/recipes.py`
**Commit:** cd65a8d
**Applied fix:** Added a module-level `_cleanup_partial_uploads(paths)` helper that best-effort removes already-uploaded blobs from Supabase Storage via `storage_service._supabase().storage.from_(BUCKET).remove(paths)`. The `create_photo` handler tracks successful upload paths in a list and invokes the helper from both the `ValueError` branch and a new catch-all `Exception` branch before rolling back the DB and re-raising. Cleanup errors are logged with `exc_info=True` but never re-raised so the original upload exception surfaces to the client. Also added `logging` import, a module logger `log`, and an `app.services.storage as storage_service` import.

### WR-03: `voice_modify` HTTPException detail may leak Gemini SDK internals

**Files modified:** `backend/app/routers/recipes.py`
**Commit:** 69e531f
**Applied fix:** Replaced `detail=f"gemini error: {str(exc)[:200]}"` with a generic `detail="gemini extraction failed"` plus `log.exception("voice_modify failed recipe=%s", recipe_id)` so the SDK detail (which can include `?key=AIza…` query strings in some `google-genai` versions) goes to server logs only, never the wire response.

### WR-04: `_to_response` mutates a validated Pydantic model after construction

**Files modified:** `backend/app/routers/recipes.py`
**Commit:** 13b7866
**Applied fix:** Replaced the `resp.initial_turn_kind = initial_turn_kind` post-construction mutation with `return resp.model_copy(update={"initial_turn_kind": initial_turn_kind})`. Makes it explicit that `initial_turn_kind` is synthesized server-side (no source attribute on the ORM object) and avoids the `__setattr__` validation-bypass code smell. Added a docstring note explaining the rationale.

### WR-05: Migration 0009 voice backfill payload allows `transcript=null`, which then fails on retry

**Files modified:** `backend/app/services/llm.py`
**Commit:** d68625a
**Applied fix:** Defended the read/re-promotion path rather than editing the already-applied migration. In `promote_draft`'s voice branch, when `payload.get("transcript")` is NULL/missing/whitespace, fall back to `recipe.title` as a last-resort transcript before raising `ValueError`. This unblocks legacy voice drafts that were `status='draft'` at migration time and would otherwise flip to `status='failed'` on user-initiated retry with no recovery path. The migration body itself is left untouched (it's already applied to prod; rewriting the migration body is moot for existing data, and the MVP-no-shims posture in CLAUDE.md leans toward the defensive read-path fix).

---

_Fixed: 2026-05-13T11:55:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
