---
phase: 01-foundations-w1
reviewed: 2026-05-06T19:22:00+02:00
depth: quick
files_reviewed: 52
files_reviewed_list:
  - backend/app/auth.py
  - backend/app/config.py
  - backend/app/db.py
  - backend/app/main.py
  - backend/app/models/__init__.py
  - backend/app/models/base.py
  - backend/app/models/cooking_log.py
  - backend/app/models/daily_shortlist.py
  - backend/app/models/enums.py
  - backend/app/models/household.py
  - backend/app/models/member.py
  - backend/app/models/recipe.py
  - backend/app/models/vote.py
  - backend/app/routers/__init__.py
  - backend/app/routers/exports.py
  - backend/app/routers/photos.py
  - backend/app/routers/recipes.py
  - backend/app/schemas/recipe.py
  - backend/app/services/__init__.py
  - backend/app/services/realtime.py
  - backend/app/services/storage.py
  - backend/alembic/versions/0001_baseline.py
  - backend/alembic/versions/0002_drop_pings.py
  - backend/app/colors.py
  - frontend/lib/api.ts
  - frontend/lib/auth.ts
  - frontend/lib/ws.ts
  - frontend/lib/recipes.ts
  - frontend/lib/enums.ts
  - frontend/lib/enum-labels.ts
  - frontend/lib/onboarding-guard.tsx
  - frontend/components/BottomNav.tsx
  - frontend/components/ColorSwatchPicker.tsx
  - frontend/components/PhotoUploader.tsx
  - frontend/components/RecipeCard.tsx
  - frontend/components/RecipeDraftCard.tsx
  - frontend/components/RecipeForm.tsx
  - frontend/components/SearchInput.tsx
  - frontend/components/RealtimeProvider.tsx
  - frontend/app/page.tsx
  - frontend/app/layout.tsx
  - frontend/app/onboarding/create/page.tsx
  - frontend/app/onboarding/join/page.tsx
  - frontend/app/onboarding/welcome/page.tsx
  - frontend/app/onboarding/share-code/page.tsx
  - frontend/app/recipes/page.tsx
  - frontend/app/recipes/[id]/page.tsx
  - frontend/app/recipes/new/page.tsx
  - frontend/app/recipes/[id]/edit/page.tsx
  - frontend/app/inbox/page.tsx
  - frontend/app/settings/page.tsx
  - frontend/next.config.ts
  - frontend/lib/i18n/fr.json
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-05-06T19:22:00+02:00
**Depth:** quick
**Files Reviewed:** 52
**Status:** issues_found

## Summary

W1 foundations codebase. Backend: FastAPI + SQLAlchemy 2.0, cookie-based auth, recipe CRUD, Supabase Storage photo upload, WebSocket realtime. Frontend: Next.js 16 App Router, cookie-auth fetch wrapper, recipe library + onboarding pages.

Security posture is solid overall — CORS allowlist, HttpOnly cookie, household-scoped DB queries, magic-byte MIME validation, server-generated storage paths. One critical issue: the `clear_auth_cookie` in `auth.py` omits cookie attributes, leaving the delete ineffective in production. Four warnings covering a DB session leak in async endpoints, an unguarded DB commit on Supabase upload failure, a photo-removal UX bug (local state desync), and the Supabase singleton holding a stale client after config changes. Three info items (debug `console.warn` calls, a `void res` dead variable, and a missing `limit` on the inbox API call).

---

## Critical Issues

### CR-01: `clear_auth_cookie` delete will not clear the cookie in production

**File:** `backend/app/auth.py:49`

**Issue:** `response.delete_cookie(key=AUTH_COOKIE_NAME, path="/")` does not pass `secure=True`, `httponly=True`, or `samesite="strict"`. Per RFC 6265, a `Set-Cookie: ...; Max-Age=0` header only deletes a cookie when the attributes (at minimum `Path` and `Domain`) match the original Set-Cookie exactly. Starlette's `delete_cookie` does not mirror the original attributes — it defaults to `secure=False`. On a browser that stored the cookie with `Secure`, sending a delete without `Secure` is a different cookie key in some browsers (notably Chrome ≥ 80 SameSite=None enforcement), meaning logout will silently fail to clear the session cookie.

**Fix:**
```python
def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=AUTH_COOKIE_NAME,
        path="/",
        secure=True,
        httponly=True,
        samesite="strict",
    )
```

---

## Warnings

### WR-01: DB session not closed on upload failure in async photo endpoint

**File:** `backend/app/routers/photos.py:57-134`

**Issue:** `upload_photo` is an `async def` endpoint but uses a synchronous `Session` from `get_db`. `get_db` yields a session and closes it in `finally`. However, `upload_recipe_photo` (step 4) calls `_supabase().storage.from_(BUCKET).upload(...)` which is a blocking network call executed inside the async event loop, blocking the entire thread/event-loop for the duration of the upload. This is not a correctness bug per se at couple-scale, but the more immediate issue is that if `upload_recipe_photo` raises any exception *other than* `ValueError` (e.g., the `Exception` re-raise on line 133 of `storage.py`), the `db.commit()` on line 126 is skipped correctly — but the `db.refresh(recipe)` and broadcast are also skipped, which is the right behavior. The real risk: if `db.commit()` on line 126 succeeds but `db.refresh(recipe)` raises (e.g., connection drop), the exception propagates, FastAPI returns 500, but the photo path IS already committed to the DB. The broadcast at line 131 is then never sent, leaving the partner's UI stale. This is an accepted coupling but worth noting as a latent inconsistency.

**Fix:** Wrap commit+refresh+broadcast atomically or use a `try/except` that explicitly handles post-commit failure gracefully:
```python
recipe.photo_paths = current_paths + [path]
db.commit()
db.refresh(recipe)
# If broadcast fails (non-critical), log and continue rather than 500-ing.
try:
    await broadcast_to_household(member.household_id, "recipe.updated", payload)
except Exception:
    log.warning("broadcast failed after photo upload")
return RecipeResponse.model_validate(recipe)
```

### WR-02: Photo removal in `PhotoUploader` only updates local state — no backend DELETE call

**File:** `frontend/components/PhotoUploader.tsx:119-139`

**Issue:** `removePhoto` filters the path from local React state and calls `onChange(next)`, but `RecipeForm` never PUTs the updated `photo_paths` back to the backend (because `photo_paths` is deliberately absent from `RecipeUpdate` schema and `_UPDATE_FORBIDDEN_FIELDS`). The in-progress TODO comment acknowledges this (`T-01-11-02`), but the consequence is that after `removePhoto`, if the user *does not* submit the form, the local state reverts on the next mount (the path is still in `recipes.photo_paths` from the server). More critically, if the user taps "Remove", then taps the undo toast, then submits the form, the undo-restored path IS in `v.photo_paths` but the form PUT body doesn't include `photo_paths` — the visual state and server state diverge. The undo action restores a path in client state that the server still has, but the form's submit path (`onSubmit` → `api PUT`) doesn't persist it either way. This is internally consistent as a known gap but the undo toast creates a false impression of reversibility.

**Fix (v0.1 scope):** Disable the undo toast until the DELETE endpoint exists, or replace it with a simpler "Photo retirée" toast without an undo action:
```tsx
toast(t("removed_toast"), { duration: 3000 });  // no action
```

### WR-03: `create_quick` stores `source_capture` with `body.model_dump()` (not `mode="json"`)

**File:** `backend/app/routers/recipes.py:161`

**Issue:** `create_full` uses `body.model_dump(mode="json")` (line 117) which serializes enum values to their string representations. `create_quick` uses `body.model_dump()` (no `mode="json"`) which returns Python objects. For `RecipeQuickCreate`, the only field is `title: str`, so today this is harmless. But it is an inconsistency that will silently store Python `Enum` objects (not JSON-safe strings) if `RecipeQuickCreate` ever gains enum fields, causing a Pydantic `JSONB` serialization error at commit time.

**Fix:**
```python
source_capture={"type": "manual", "payload": body.model_dump(mode="json")},
```

### WR-04: Supabase client singleton is never reset on config change

**File:** `backend/app/services/storage.py:61-80`

**Issue:** `_client` is a module-level singleton initialized lazily on first call to `_supabase()`. Once set, it is never invalidated. In a Railway deployment this is fine (one process lifetime). However, the `settings` object reads from the environment at import time — if `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing at startup and a test or hot-reload sets them later, the `if _client is None` guard is already False because an earlier `RuntimeError` path left `_client` as `None` and the next call retries correctly. The real risk: if `create_client` is called with stale/empty credentials and somehow returns a non-None client object without raising (a supabase-py version change), the singleton holds a broken client for the process lifetime. Low probability but the sentinel value `_client: Client | None = None` combined with no invalidation path means a misconfigured deploy silently serves broken uploads after any successful call.

**Fix:** Assert credentials at app startup (e.g., in a FastAPI `lifespan` event) rather than deferring to first use, so Railway fails the healthcheck before any user traffic hits the upload path.

---

## Info

### IN-01: `void res` dead variable in onboarding join page

**File:** `frontend/app/onboarding/join/page.tsx:122`

**Issue:** `void res;` is a deliberate no-op to suppress "unused variable" lint. The comment says "res fields available for forward compat" but the field is never used. This is dead code that adds noise.

**Fix:** Destructure only what is needed, or remove the `const res =` binding entirely:
```typescript
await api<JoinResponse>("/api/households/join", { ... });
await refresh();
```

### IN-02: `console.warn` calls in production WebSocket client

**File:** `frontend/lib/ws.ts:82, 128, 131`

**Issue:** Three `console.warn(...)` calls will appear in production Safari console. Acceptable for v0.1 debugging but worth noting for productize-later.

**Fix:** Gate behind `process.env.NODE_ENV !== "production"` or replace with a structured logger when available.

### IN-03: BottomNav drafts badge fetches up to 200 items to count them

**File:** `frontend/components/BottomNav.tsx:56`

**Issue:** `api<Recipe[]>("/api/recipes?status=draft&limit=200")` fetches full recipe objects just to get `.length` for the badge count. At couple-scale this is harmless, but a `GET /recipes/count?status=draft` endpoint or a `HEAD` response with `X-Total-Count` would be more efficient.

**Fix (productize-later):** Note this pattern. At couple-scale (expected < 20 drafts), `limit=200` is safe. No immediate action needed.

---

_Reviewed: 2026-05-06T19:22:00+02:00_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick_
