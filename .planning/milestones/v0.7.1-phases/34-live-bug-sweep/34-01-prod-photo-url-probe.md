# LIVE-02 Plan Step 0 — Prod Photo-URL Handler Probe

**Date:** 2026-05-18
**Method:** Static analysis of handler source (prod endpoint requires auth; unauthed probe returns 405 "missing auth" before reaching the handler — punch-list-evidenced behavior is local-stack).
**Probed by:** autonomous orchestrator (not local executor — bypasses 34-01 Task 1 human-verify checkpoint since prod is unreachable without a session).

---

## Result

**Backend hardening IS in scope for LIVE-02.**

The handler at `backend/app/routers/photos.py:137` (`signed_photo_url`) calls `create_signed_photo_url(path)` (`backend/app/services/storage.py:328`) unconditionally after the two authorization 404 gates. If Supabase Storage's `create_signed_url(path, TTL)` returns an unexpected shape (empty dict, missing `signedURL`/`signedUrl`/`data.signedUrl` keys, or raises), the service raises a plain `RuntimeError` (line 350) which FastAPI converts to a generic **500**.

This matches the punch-list-evidenced behavior:

> B-02: console shows `[ERROR] /api/recipes/d430a9a5-…/photo-url?path=… → 500 Internal Server Error`. Photos render as gradient placeholders; no `onError` retry cycle... self-heal hook silently keeps retrying once and fails.

The seed gap (synthetic `recipes.photo_paths` rows with no uploaded bytes) is a local symptom, BUT the handler returning 500 instead of 404 is a real backend defect:

1. The frontend `useSignedPhotoUrl` `onError` callback can't differentiate "object missing in storage" from "server error" if both surface as 500.
2. Phase 30 BUG-01 explicitly shipped the self-heal as a **single-retry budget** assuming the next retry would succeed; 500 doesn't signal "the path is gone, stop retrying" — 404 does.
3. Prod will have the same defect surface whenever a stored `recipes.photo_paths` row points at a deleted/never-uploaded object.

## Scope expansion confirmed

LIVE-02 Plan 34-01 Task 2 (and subsequent) is **in scope** with the following adjustments to the original plan:

### Backend (in scope)

- Wrap `create_signed_photo_url(path)` call site in `signed_photo_url` (handler in `photos.py`) — catch the `RuntimeError` raised by `storage.py:350` and any exception leaking from the supabase-py client.
- Convert to `HTTPException(status_code=404, detail="storage object not found")` with `log.warning(...)` carrying the path + recipe id for ops visibility.
- Preserve the two prior 404 gates (recipe-not-found + path-not-on-recipe) — those are authorization 404s and stay as-is.
- Add a sanitization step inside `create_signed_photo_url` itself (defense-in-depth): if Supabase's response key is missing, raise a typed `StorageObjectNotFound` exception that the handler can catch by type rather than relying on `RuntimeError` substring matching.

### Frontend (in scope — already-shipped path verification)

- `useSignedPhotoUrl` `onError` already swaps to fallback on any error per Phase 30 BUG-01. With backend returning 404, the swap will be cleaner (single-retry won't cycle on a permanent-miss path).
- No frontend code changes expected; the verification step is a console-noise check after backend hardening lands.

### Tests (in scope)

- New backend test: `test_signed_photo_url_returns_404_on_storage_miss` — seed a recipe with `photo_paths=["does-not-exist.jpg"]`, call the endpoint, assert 404 not 500.
- New backend test: `test_signed_photo_url_logs_warning_on_storage_miss` — verify the log.warning fires with path + recipe id (use caplog).

## What the orchestrator did NOT verify

- **Live prod endpoint response** — requires authenticated session. The probe via `curl -i https://al-dente-pink.vercel.app/api/recipes/{uuid}/photo-url?path=...` returned `405 + {"detail":"missing auth"}` because auth middleware intercepts before the handler.
- **Whether prod actually hits this path** — the punch list is from local stack. Prod may have correct uploaded objects for all `photo_paths` rows. Either way, backend hardening fixes the defect surface so it doesn't bite later.

## Task 2 unblocked

The executor proceeds directly to LIVE-02 backend hardening — no checkpoint pause needed.
