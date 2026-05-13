---
phase: 25-backend-foundation
reviewed: 2026-05-13T11:26:36Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - backend/alembic/versions/0009_add_recipe_turns_and_drop_source_capture.py
  - backend/app/cli/seed.py
  - backend/app/models/__init__.py
  - backend/app/models/enums.py
  - backend/app/models/recipe.py
  - backend/app/models/recipe_turn.py
  - backend/app/routers/recipes.py
  - backend/app/schemas/recipe.py
  - backend/app/schemas/recipe_turn.py
  - backend/app/services/llm.py
  - backend/app/services/llm_fixtures.py
  - backend/app/services/storage.py
  - backend/tests/test_cooking_logs_history.py
  - backend/tests/test_recipes.py
  - frontend/components/RecipeDraftCard.tsx
  - frontend/components/UrlCaptureTab.tsx
  - frontend/lib/enums.ts
  - frontend/lib/recipe-completeness.ts
  - frontend/lib/recipes.ts
  - frontend/tests/e2e/capture-full.spec.ts
  - frontend/tests/e2e/capture-quick.spec.ts
  - frontend/tests/e2e/capture-url.spec.ts
  - frontend/tests/e2e/capture-voice-failed-recovery.spec.ts
findings:
  critical: 1
  warning: 5
  info: 6
  total: 12
status: issues_found
---

# Phase 25: Code Review Report

**Reviewed:** 2026-05-13T11:26:36Z
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Phase 25 replaces the legacy `recipes.source_capture` JSONB column with a normalized `recipe_turns` table and refactors all five capture surfaces (quick / full-form / voice / photo / url) to write a position=0 user turn server-side before queueing `promote_draft`. The migration (0009) is well-structured with pre-delete of FK children, type-specific INSERT…SELECT backfills, a catch-all fallback, and a sanity-check assertion. The locked vocabularies (`TurnSender`, `TurnKind`) are correctly mirrored between `backend/app/models/enums.py`, `frontend/lib/enums.ts`, the DB CHECK constraint, and Pydantic discriminated-union schemas — no drift.

The cutover is largely clean and consistent with CLAUDE.md invariants (1 — five surfaces, one shape; 5 — raw inputs preserved in turn payloads). One regression of Phase 24 RID-04 D-26 was found: title-rewrite failure in the text branch of `promote_draft` now marks the recipe `status='failed'` instead of leaving it `structured` with a `promotion_error` advisory, because `_record_rewrite_failure` is defined but never called. A few warnings concern the new URL endpoint (title length > 200 chars allowed, partial-upload storage leak retained from pre-Phase-25), and minor consistency / documentation drift in the README/comments.

## Critical Issues

### CR-01: `_record_rewrite_failure` is defined but never invoked — title-rewrite failures regress to `status='failed'`

**File:** `backend/app/services/llm.py:580-597, 482-509`
**Issue:** Phase 24 RID-04 D-26 specifies that a title-rewrite failure for quick/full-form captures must keep the recipe at `status='structured'` (the content is complete; only the polish step failed) and surface the error via `promotion_error` while still broadcasting `recipe.promoted`. The helper `_record_rewrite_failure` (lines 482-509) implements exactly that contract. However, in the Phase 25 collapsed `promote_draft` dispatcher, the text branch calls `rewrite_title(...)` without a dedicated try/except — any exception bubbles to the outer `except Exception: _record_failure(...)` block at line 657-658, which sets `status='failed'`. The function `_record_rewrite_failure` is now dead code, and the user-visible behavior contradicts D-26: a row with a perfectly valid user-typed title is hidden behind the "Extraction échouée" failed-state card with no way to recover beyond delete-and-retry.

**Fix:**
```python
if kind == "text":
    original_title = payload.get("text") or recipe.title
    try:
        new_title = rewrite_title(original_title, {})
    except Exception as exc:  # noqa: BLE001 — RID-04 D-26
        # Title rewrite failed but content is complete — promote anyway,
        # record advisory error. Returns without raising.
        recipe.illustration_svg = _generate_and_sanitize_illustration(
            recipe.title
        )
        recipe.status = "structured"
        recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
        db.commit()
        _record_rewrite_failure(db, recipe, exc)
        return
    recipe.title = new_title
    recipe.illustration_svg = _generate_and_sanitize_illustration(recipe.title)
    recipe.status = "structured"
    recipe.promotion_error = None
    recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
    db.commit()
    db.refresh(recipe)
    _broadcast_promoted(recipe)
```

Alternatively, if D-26 is no longer the desired behavior (Phase 25 implicitly retracted it), delete `_record_rewrite_failure` and update the Phase 24 docs — but the current state (helper exists, never used) is ambiguous code that almost certainly indicates a missed call site.

## Warnings

### WR-01: `POST /recipes/url` accepts URLs up to 2000 chars but stores them in `recipe.title` — PUT will reject

**File:** `backend/app/routers/recipes.py:597-607`, `backend/app/schemas/recipe.py:210, 115`
**Issue:** `UrlCaptureRequest.url` allows `max_length=2_000`. The handler does `recipe.title = url` as a placeholder. The DB column has no length limit (Text), so the insert succeeds. However, `RecipeUpdate.title` enforces `max_length=200` — any subsequent PUT to a URL-capture row whose `url > 200 chars` rejects with 422 even if the user is only editing an unrelated field (because the form likely re-submits the existing title). This is a latent footgun introduced by Phase 25 (the legacy pre-Phase-25 url surface had the same shape, but the cutover is the right moment to fix it).

**Fix:** Either (a) truncate the URL when assigning to title:
```python
recipe = Recipe(
    ...
    title=url[:200],  # title column UI-bounded; full URL preserved in the turn payload
    ...
)
```
or (b) use a more compact placeholder like the URL host:
```python
from urllib.parse import urlparse
host = urlparse(url).netloc or url[:200]
recipe = Recipe(..., title=f"(URL: {host})"[:200], ...)
```
The full URL is preserved in the turn payload either way (invariant 5).

### WR-02: Photo capture leaks Storage objects on partial-upload failure

**File:** `backend/app/routers/recipes.py:526-548`
**Issue:** If `upload_recipe_photo` succeeds for photos 1-3 then raises for photo 4, the try/except calls `db.rollback()` (good — no orphan recipe row) but the 3 successfully-uploaded Storage objects are left behind in Supabase. They have no DB referent (recipe rolled back) and will never be cleaned up — couple-scale this is bounded but it pollutes the bucket and slowly bills against the free tier. Pre-Phase-25 behavior, but the Phase 25 cutover is touching this code path and worth fixing in the same change.

**Fix:** Track uploaded paths in a list; on any exception during the upload loop, iterate and best-effort delete each one before re-raising:
```python
uploaded_paths: list[str] = []
try:
    for content in contents:
        path = upload_recipe_photo(
            household_id=member.household_id,
            recipe_id=recipe.id,
            content=content,
        )
        uploaded_paths.append(path)
except ValueError as exc:
    # Best-effort cleanup of partial uploads.
    for p in uploaded_paths:
        try:
            storage_service._supabase().storage.from_(storage_service.BUCKET).remove([p])
        except Exception:  # noqa: BLE001 — cleanup is best-effort
            log.warning("partial-upload cleanup failed for %s", p)
    db.rollback()
    # ... existing ValueError → HTTPException mapping
paths = uploaded_paths  # use the tracked list
```

### WR-03: `voice_modify` HTTPException detail may leak Gemini SDK internals

**File:** `backend/app/routers/recipes.py:663-667`
**Issue:** `raise HTTPException(... detail=f"gemini error: {str(exc)[:200]}")` echoes the truncated Gemini exception message to the client. The 200-char truncation helps, but `google-genai` errors can include request URLs containing the API key in the form `?key=AIza...` in some SDK versions. The pattern in `_record_failure` (which truncates the message to 500 chars BEFORE writing to the DB but isn't surfaced to the client) is the better template. The detail should be generic; details should go to logs only.

**Fix:**
```python
try:
    extracted = apply_voice_modification(recipe_json, body.transcript)
except Exception as exc:  # noqa: BLE001
    log.exception("voice_modify failed recipe=%s", recipe_id)
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="gemini extraction failed",
    ) from exc
```

### WR-04: `_to_response` mutates a validated Pydantic model after construction

**File:** `backend/app/routers/recipes.py:118-122`
**Issue:**
```python
def _to_response(r: Recipe, initial_turn_kind: str | None = None) -> RecipeResponse:
    resp = RecipeResponse.model_validate(r)
    resp.initial_turn_kind = initial_turn_kind
    return resp
```
This works because Pydantic v2 models are mutable by default, but it bypasses field validation on the mutation (the assignment goes through `__setattr__` which by default re-validates only if `model_config["validate_assignment"]` is set, which it isn't here). It also creates a code smell: `RecipeResponse.initial_turn_kind` defaults to `None` after `model_validate(r)` because the SQLAlchemy `Recipe` ORM object has no such attribute, then is mutated. A reader following the model can be confused about how the field actually gets populated.

**Fix:** Construct the response with the field set explicitly:
```python
def _to_response(r: Recipe, initial_turn_kind: str | None = None) -> RecipeResponse:
    resp = RecipeResponse.model_validate(r)
    return resp.model_copy(update={"initial_turn_kind": initial_turn_kind})
```
`model_copy` makes the intent ("synthesized field, not from the ORM") explicit and preserves immutability semantics.

### WR-05: Migration 0009 voice backfill payload allows `transcript=null`, which then fails on retry

**File:** `backend/alembic/versions/0009_add_recipe_turns_and_drop_source_capture.py:168-183`
**Issue:** Step 4d builds `payload = jsonb_build_object('transcript', jsonb_extract_path_text(source_capture, 'payload', 'transcript'))`. If the legacy `source_capture.payload.transcript` is NULL or missing, the backfilled payload is `{"transcript": null}`. Such a recipe would normally already be `status='structured'` (the original promote already ran). But if a user clicks "Retry" on a pre-Phase-25 voice draft that was in `status='draft'` at migration time, `promote_draft` reaches `if not transcript.strip(): raise ValueError("promote_draft voice: empty transcript")` (`llm.py:601-602`), and `_record_failure` flips status to `failed`. The user can't recover. This is an edge case — most prod rows are `structured` and the cutover-time `draft` count is tiny — but worth handling.

**Fix:** In the backfill, COALESCE to recipes.title as a last-resort transcript so retry can attempt extraction with at least something:
```sql
jsonb_build_object(
    'transcript',
    COALESCE(
        jsonb_extract_path_text(source_capture, 'payload', 'transcript'),
        title
    )
)
```
Or, accepting the trade-off (D-05 cutover principle), document it explicitly and don't fix. The MVP-no-shims posture in CLAUDE.md leans toward the latter — if so, add a comment to step 4d explaining: "Legacy voice drafts with NULL transcript will fail on retry; intentional MVP trade-off."

## Info

### IN-01: Seed UPSERT overwrites the migration-backfilled `kind` of position=0 turns

**File:** `backend/app/cli/seed.py:510-530, 861-881`
**Issue:** Both `run_test_seed` and `run_prod_synthetic_seed` UPSERT a `(position=0, kind='text')` user turn per recipe. The migration 0009 backfill may already have inserted a `(position=0, kind='photo'|'voice'|'url')` user turn for the same recipe id (because Postgres `gen_random_uuid()` produced a different PK than the seed's `uuid5`, the `ON CONFLICT (recipe_id, position) DO UPDATE` matches on the UNIQUE constraint and overwrites `kind` and `payload` to `text`). For the seed corpus this is fine — every seeded recipe is "structured" with a title, no capture-kind metadata is meaningful — but it does mean `initial_turn_kind` returned by the API for seeded recipes will always be `text`, never reflecting the migration-time backfill.

**Fix:** If preserving the migration-backfilled kind matters for seed-driven E2E tests, branch the UPSERT to only UPDATE non-key columns when the existing row's kind is not user-specified. Otherwise document the overwrite intent in a comment ("Seed canonicalizes position=0 to kind='text' — seeded recipes never went through a capture surface").

### IN-02: `canned_modified_recipe` test fixture drops Phase 24 RID-02 fields

**File:** `backend/app/services/llm_fixtures.py:143-159`
**Issue:** The canned modification fixture for `apply_voice_modification` echoes title/ingredients/steps/prep_time/servings/cuisine/mood/main_protein/seasonality but does NOT echo `cook_time_minutes`, `difficulty`, `description`. If a test calls `voice_modify` against a recipe that has those fields set, the canned response NULLs them out. Real Gemini calls would preserve them via the modify prompt ("Conserve les champs non concernés tels quels"). The asymmetry could mask integration bugs in test mode.

**Fix:**
```python
return GeminiExtractedRecipe(
    title=recipe_json.get("title", "Recette modifiée (test)"),
    ...
    cook_time_minutes=recipe_json.get("cook_time_minutes"),
    difficulty=recipe_json.get("difficulty"),
    description=recipe_json.get("description"),
    ...
)
```

### IN-03: `RecipeForCompleteness` re-declares a shape already typed elsewhere

**File:** `frontend/lib/recipe-completeness.ts:18-33`
**Issue:** The comment block explains that `RecipeForCompleteness` was duplicated here because "the HEAD commit on this worktree reverted the type extension" in `recipes.ts`. Looking at `frontend/lib/recipes.ts` (lines 38-44), the Phase 24 RID-02 fields ARE now present on `Recipe` (cook_time_minutes, difficulty, description). The reason for the duplicate type has likely been resolved; this is a stale comment hiding a dead-code aftershock.

**Fix:** Either delete `RecipeForCompleteness` and use `Recipe` directly (with `Pick<Recipe, ...>` if narrowing is desired), or update the comment to explain the current rationale (e.g., "kept narrow to make `computeCompleteness` callable from contexts that don't have a full Recipe").

### IN-04: `_first_turn_kind` filter on `sender='user'` is redundant with current invariant

**File:** `backend/app/routers/recipes.py:103-115`
**Issue:** All write paths in this router insert position=0 with `sender='user'`. The migration backfill also writes position=0 with `sender='user'`. The UNIQUE constraint on (recipe_id, position) guarantees at most one position=0 row. The extra `RecipeTurn.sender == "user"` filter is defensive but currently impossible to violate — if a system turn ever lands at position=0 (Phase 29?), this query would silently return None instead of surfacing the violation.

**Fix:** This is acceptable defense-in-depth; consider adding a brief comment so the next reader knows it's intentional:
```python
# Filter on sender='user' is defensive — current invariant is that
# position=0 is always user-authored, but Phase 29 may emit system turns
# at position=0 for fully-LLM-generated recipes. Returning None then is
# the correct behavior (no user-captured turn = no initial_turn_kind).
```

### IN-05: Empty test-mode JPEG bytes in `download_recipe_photo` may bypass Gemini parsing

**File:** `backend/app/services/storage.py:323-325`
**Issue:** Test-mode returns `b"\xff\xd8\xff\xe0" + b"\x00" * 100` — a 104-byte stub with a valid JPEG SOI marker but no actual image data. `extract_from_photos` in test mode short-circuits to `canned_photo_recipe` and never calls Gemini, so this works. But if test mode is ever partially disabled (e.g., a test wants real Storage + canned LLM), the 104-byte stub will be sent to Gemini and likely error. Low-risk because the test-mode gate is shared.

**Fix:** No change required; the coupling is explicit via `settings.environment == "test"` checks at both layers. Worth a one-line comment that the byte stub is sufficient because the LLM call is also stubbed in the same environment.

### IN-06: `Recipe.title` Text column lacks length cap; PUT validation can blow up on long URL imports

**File:** `backend/app/models/recipe.py:69`
**Issue:** `title: Mapped[str] = mapped_column(Text, nullable=False)` — no DB-level length constraint. The Pydantic schemas (`RecipeFullCreate.title`, `RecipeQuickCreate.title`, `RecipeUpdate.title`) enforce `max_length=200`, but the URL capture path bypasses these schemas (sets `recipe.title = url` directly, see WR-01). The defense-in-depth would be a `CHECK (char_length(title) <= 200)` constraint or a `String(200)` column type, matching the wire contract.

**Fix:** If WR-01 is fixed at the application layer, this is moot. If not, add either:
```python
title: Mapped[str] = mapped_column(String(200), nullable=False)  # DB-enforces the 200-char cap
```
or a CHECK constraint in a follow-up migration. Note: changing column type requires an Alembic migration that may need data migration for any existing rows >200 chars.

---

_Reviewed: 2026-05-13T11:26:36Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
