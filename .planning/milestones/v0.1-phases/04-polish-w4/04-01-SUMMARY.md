---
phase: 04-polish-w4
plan: 01
subsystem: backend/cooking-logs
tags:
  - backend
  - api
  - cooking-log
  - finalize
  - storage
  - migration
  - realtime
dependency-graph:
  requires:
    - 03-02 (cooking_logs router skeleton — POST /recipes/{id}/cook + GET /cooking-logs/active)
    - 01-08 (Recipe model + RecipeResponse + last_cooked_at + cook_count denormalization)
    - 01-09 (services/storage.py upload_recipe_photo + create_signed_photo_url)
    - 01-09 (services/realtime.broadcast_to_household)
  provides:
    - PUT /cooking-logs/{id} (COOK-03, COOK-05) — finalize log + same-tx recipe denorm
    - POST /cooking-logs/{id}/photos — multipart upload to cooking-logs/ prefix
    - GET /cooking-logs/{id}/photo-url — 5-min signed URL scoped to log
    - recipes.last_cooked_photo_path column (D-05 living image)
    - CookingLogFinalizeRequest, CookingLogResponse.photo_paths, RecipeResponse.last_cooked_photo_path
    - WS broadcasts: `cooking.finalized`, `recipe.updated` (on finalization)
  affects:
    - Phase 4 plan 02 (frontend finalize page) — unblocked by these endpoints
    - Existing recipe.updated subscribers (RecipeDetailPage, RecipeCard) — refresh on cooking finalization
tech-stack:
  added: []
  patterns:
    - "FastAPI multipart upload with magic-byte MIME sniff (mirrors photos.py)"
    - "SQLAlchemy same-transaction denormalization via update(...).values(...) before single db.commit()"
    - "Server-side path generation cooking-logs/{household_id}/{log_id}/{uuid}.{ext}"
    - "Idempotency guard (is_first_finalize captured BEFORE rating mutation) to prevent cook_count inflation"
    - "Cross-household 404 (not 403) policy mirrored from photos.py"
key-files:
  created:
    - backend/alembic/versions/0005_last_cooked_photo_path.py
  modified:
    - backend/app/models/recipe.py
    - backend/app/schemas/cooking_log.py
    - backend/app/schemas/recipe.py
    - backend/app/routers/cooking_logs.py
    - backend/app/services/storage.py
decisions:
  - "Same Supabase bucket (recipe-photos) for cooking-log photos under cooking-logs/ prefix — couple-scale, no retention policy split needed in v0.1"
  - "No `recipe.updated` broadcast on per-photo upload — finalization PUT is the canonical sync point; mid-cook photos stream silently"
  - "Idempotent re-finalize: cook_count only increments on first finalize (rating IS NULL → SET); subsequent PUTs refresh last_cooked_at and last_cooked_photo_path only"
  - "`last_cooked_photo_path` re-derived from photo_paths[0] on every finalize so it matches the user's first-photo selection"
metrics:
  duration: "~6 minutes"
  completed: "2026-05-07"
---

# Phase 04 Plan 01: Cooking-Log Finalization Backend Summary

Backend foundation for COOK-03 (finalize cooking log) + COOK-05 (same-transaction recipe denormalization) shipped: a new `recipes.last_cooked_photo_path` column, a PUT endpoint that finalizes logs while atomically updating denormalized recipe fields, a multipart photo-upload endpoint mirroring the recipe-photos pattern, and a signed-URL endpoint scoped to cooking logs. Two WebSocket broadcasts fire on finalize so the partner phone refreshes the cooking banner and the recipe-card living image with no new client wiring.

## What Shipped

### 1. Migration 0005 — `recipes.last_cooked_photo_path`

**File:** `backend/alembic/versions/0005_last_cooked_photo_path.py`
**Commit:** `0065946` (pre-existing from earlier session)

Nullable `TEXT` column on `recipes`. NULL semantics: never cooked OR most recent log had no photos. Set in the same DB transaction as `last_cooked_at` + `cook_count` by PUT /cooking-logs/{id} (architecture invariant #3, COOK-05).

Model mirror in `backend/app/models/recipe.py`:

```python
last_cooked_photo_path: Mapped[str | None] = mapped_column(Text, nullable=True)
```

### 2. PUT /cooking-logs/{log_id} — finalize log + same-tx recipe denorm

**Files:** `backend/app/routers/cooking_logs.py`, `backend/app/schemas/cooking_log.py`, `backend/app/schemas/recipe.py`
**Commit:** `ad609fc`
**Auth:** `Depends(current_member)` (cookie auth, no Bearer)

**Request body** (`CookingLogFinalizeRequest`):

```json
{
  "photo_paths": ["cooking-logs/{household_id}/{log_id}/{uuid}.jpg"],
  "rating": "loved",
  "notes": "Trop salé."
}
```

`rating` is required (Pydantic 422s on missing/null — `LogRating` enum: `loved | liked | disliked`). `photo_paths` max 4. `notes` max 4000 chars.

**Behavior:**

1. 404 (not 403) on unknown id or cross-household.
2. Validates each `proposed` path is already in `log_row.photo_paths` (T-04-01-01 — defense-in-depth against binding other logs' storage objects).
3. `is_first_finalize = log_row.rating is None` captured BEFORE rating mutation.
4. Sets `log_row.{photo_paths,rating,notes}`, then in the SAME session/transaction:
   - `update(Recipe).where(id=log.recipe_id).values(last_cooked_at=..., last_cooked_photo_path=...)`
   - On first finalize only: `cook_count = Recipe.cook_count + 1`
5. Single `db.commit()` — both rows update or neither (architecture invariant #3).
6. Broadcasts:
   - `recipe.updated` with full `RecipeResponse` payload — RecipeDetailPage / RecipeCard living image refresh.
   - `cooking.finalized` with `{log_id, recipe_id, rating}` — partner's CookingBanner closes.

`RecipeResponse` gains `last_cooked_photo_path: Optional[str] = None` so frontend can pick the photo source.

### 3. POST /cooking-logs/{log_id}/photos + GET /cooking-logs/{log_id}/photo-url

**Files:** `backend/app/routers/cooking_logs.py`, `backend/app/services/storage.py`
**Commit:** `e675f80`
**Auth:** `Depends(current_member)`

**`upload_cooking_log_photo` helper** (`services/storage.py`):

- Same `recipe-photos` bucket — couple-scale, no retention split.
- Path layout: `cooking-logs/{household_id}/{log_id}/{uuid}.{ext}` (different prefix from recipe photos so they don't collide).
- Magic-byte MIME sniff (JPEG, PNG, WebP, HEIC/HEIF, AVIF) — `Content-Type` header ignored (T-04-01-04).
- 8 MiB cap (`MAX_BYTES`); raises `ValueError("oversize")` / `ValueError("unsupported")`.

**POST endpoint:**

- Multipart `file` field, `MAX_PHOTOS_PER_COOKING_LOG = 4` (mirrors recipe rule), 404 on cross-household, 413 on oversize, 415 on unsupported, 400 on empty body, 409 on photo limit.
- Reassigns `photo_paths` (not in-place append) so SQLAlchemy detects the ARRAY change.
- Returns updated `CookingLogResponse` with `photo_paths` list.
- **No broadcast per upload** — finalization PUT is the canonical sync point.

**GET endpoint:**

- Validates `path in log_row.photo_paths` (T-04-01-02) before minting a 5-minute signed URL — prevents URL minting for arbitrary bucket objects.
- Returns `{ "url": "...", "expires_in": 300 }`.

## Sample curl Commands (local dev)

Assumes the cookie session is already established; substitute IDs and a JPEG path.

```bash
# Start a cooking session (existing endpoint — context only)
curl -b cookies.txt -X POST http://localhost:8000/recipes/$RECIPE_ID/cook | jq

# Upload a photo to the active log
curl -b cookies.txt -X POST http://localhost:8000/cooking-logs/$LOG_ID/photos \
  -F "file=@./test.jpg" | jq

# Mint a signed URL for the photo
curl -b cookies.txt "http://localhost:8000/cooking-logs/$LOG_ID/photo-url?path=$STORAGE_PATH" | jq

# Finalize the log + denormalize the parent recipe
curl -b cookies.txt -X PUT http://localhost:8000/cooking-logs/$LOG_ID \
  -H "Content-Type: application/json" \
  -d "{\"photo_paths\": [\"$STORAGE_PATH\"], \"rating\": \"loved\", \"notes\": \"Trop salé.\"}" | jq

# Verify denormalized fields landed on the recipe
curl -b cookies.txt http://localhost:8000/recipes/$RECIPE_ID | jq '{cook_count, last_cooked_at, last_cooked_photo_path}'

# Re-PUT — cook_count must STAY at 1 (idempotency guard)
curl -b cookies.txt -X PUT http://localhost:8000/cooking-logs/$LOG_ID \
  -H "Content-Type: application/json" \
  -d "{\"photo_paths\": [\"$STORAGE_PATH\"], \"rating\": \"liked\", \"notes\": \"Update\"}" | jq
```

## Threat Mitigations Applied

| Threat ID | Mitigation site |
|-----------|-----------------|
| T-04-01-01 (Tampering — cross-log path injection) | `for p in proposed: if p not in persisted: raise 422` in PUT handler |
| T-04-01-02 (InfoDisclosure — arbitrary signed URLs) | `if path not in log_row.photo_paths: raise 404` in GET /photo-url |
| T-04-01-03 (InfoDisclosure — cross-household existence probe) | All endpoints scope by `household_id == member.household_id`; 404 (never 403) |
| T-04-01-04 (Tampering — MIME spoofing) | `detect_mime_and_ext` magic-byte sniff in `upload_cooking_log_photo` |
| T-04-01-05 (DoS — oversize upload) | `MAX_BYTES + 1` read with 413 short-circuit |
| T-04-01-06 (Repudiation — cook_count inflation on re-PUT) | `is_first_finalize = log_row.rating is None` captured BEFORE assignment |
| T-04-01-07 (Spoofing — unauthenticated finalize) | `Depends(current_member)` on every endpoint |
| T-04-01-08 (Elevation — invalid rating) | Pydantic `LogRating` enum on `CookingLogFinalizeRequest` |

## Deviations from Plan

None — plan executed exactly as written. The two-step refactor flagged in Task 2's action block (capturing `is_first_finalize` BEFORE rating assignment) was applied directly without the intermediate `NotImplementedError` placeholder.

**Atomic commit split note:** Task 1 was already committed pre-session (commit `0065946`). Tasks 2 and 3 were each committed atomically (`ad609fc` and `e675f80`) after splitting the originally-bundled single edit so each commit corresponds to one plan task. No code changed between those commits beyond what each task specifies.

## TODO(productize) Items Found

None added in this plan. Existing markers preserved:

- `backend/app/services/storage.py:6` — D-02 presigned-PUT switch (Phase 1 marker, unchanged)
- `backend/app/services/storage.py:177` — Same D-02 marker added to the new `upload_cooking_log_photo` helper for symmetry
- `backend/app/schemas/recipe.py:177` — CAPTURE-03 deferred URL fetch (unchanged)

## Verification Run

```text
$ DATABASE_URL=... uv run alembic heads
0005 (head)

$ DATABASE_URL=... uv run python -c "<import + endpoint check>"
FULL VERIFICATION PASSED
endpoints: [
  ('/cooking-logs/active', 'GET'),
  ('/cooking-logs/{log_id}', 'PUT'),
  ('/cooking-logs/{log_id}/photo-url', 'GET'),
  ('/cooking-logs/{log_id}/photos', 'POST'),
  ('/recipes/{recipe_id}/cook', 'POST'),
]
```

Pydantic schema fields verified:
- `RecipeResponse.last_cooked_photo_path` present
- `CookingLogResponse.photo_paths` present
- `CookingLogFinalizeRequest.rating` is required (Pydantic 422s on omission)

`upload_cooking_log_photo` import succeeds.

## Authentication Gates

None encountered. All endpoints use the existing `current_member` cookie-auth dependency.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | `0065946` | `feat(04-01): add recipes.last_cooked_photo_path migration + model` (pre-existing) |
| 2 | `ad609fc` | `feat(04-01): PUT /cooking-logs/{id} finalize with same-tx recipe denorm` |
| 3 | `e675f80` | `feat(04-01): POST /cooking-logs/{id}/photos + signed-URL endpoint` |

## Self-Check: PASSED

- File `backend/alembic/versions/0005_last_cooked_photo_path.py` exists.
- File `backend/app/models/recipe.py` modified (last_cooked_photo_path added).
- File `backend/app/schemas/cooking_log.py` modified (CookingLogFinalizeRequest added, photo_paths added).
- File `backend/app/schemas/recipe.py` modified (last_cooked_photo_path added).
- File `backend/app/routers/cooking_logs.py` modified (PUT, POST /photos, GET /photo-url added).
- File `backend/app/services/storage.py` modified (upload_cooking_log_photo added).
- Commit `0065946` exists.
- Commit `ad609fc` exists.
- Commit `e675f80` exists.
- All required endpoints registered: PUT /cooking-logs/{log_id}, POST /cooking-logs/{log_id}/photos, GET /cooking-logs/{log_id}/photo-url.
- Migration head is `0005`.
