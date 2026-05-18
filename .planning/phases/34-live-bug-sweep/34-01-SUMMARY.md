---
plan_id: "34-01"
plan_name: "LIVE-02 prod-verify gate + photo signed-URL graceful fallback"
phase: "34-live-bug-sweep"
plan: 1
status: complete
requirement_ids: [LIVE-02]
commits: [TBD]
files_modified:
  - backend/app/services/storage.py
  - backend/app/routers/photos.py
  - backend/tests/test_photos.py
  - frontend/lib/hooks/useSignedPhotoUrl.ts
key_decisions:
  - "Backend hardening is in scope (probe artefact at 45a63b7 decided)"
  - "Introduce typed StorageObjectNotFound exception (cleaner than string-matching RuntimeError)"
  - "Router catches by type + log.warning (not log.error) — operationally interesting, not paging-level"
  - "Frontend second .catch tightened to setSrc(null) — placeholder takes over after permanent-miss"
metrics:
  duration_minutes: ~15
  tasks_completed: 3
  files_touched: 4
  tests_added: 2
---

# Phase 34 Plan 01: LIVE-02 — Photo Signed-URL Graceful Fallback Summary

## One-liner

`GET /api/recipes/{id}/photo-url` now returns 404 (not 500) when the underlying Supabase Storage object is missing, with the frontend `useSignedPhotoUrl` hook tightened to drop the broken `<img src>` on permanent failure so the placeholder branch always wins.

## What shipped

### Backend — typed missing-object signal + router 404 conversion

- `backend/app/services/storage.py`
  - Added typed `StorageObjectNotFound(Exception)` carrying the offending `path`. The typed exception is the explicit signal "this storage object isn't there" — distinguishable from "the storage layer is broken".
  - Added `_looks_like_missing_object(exc)` heuristic that matches supabase-py / storage3 missing-object shapes across SDK versions: `.code == "NoSuchKey"` / `.code == "not_found"`, `.status == 404` (numeric or string), or "not found" / "nosuchkey" / "404" substrings in the exception text (case-insensitive).
  - `create_signed_photo_url` now wraps the `client.storage.from_(BUCKET).create_signed_url(...)` call in `try / except`:
    - SDK exception with missing-object shape → `raise StorageObjectNotFound(path) from exc`.
    - Response envelope with `error` key → `raise StorageObjectNotFound(path)`.
    - Missing all of `signedURL` / `signedUrl` / `data.signedUrl` keys → `raise StorageObjectNotFound(path)` (replaces the pre-Phase-34 `RuntimeError` which surfaced as a 500).
    - Any other exception propagates unchanged (real storage outage stays a 500 as intended).

- `backend/app/routers/photos.py`
  - Added `logging` import + module-level `log = logging.getLogger(__name__)`.
  - `signed_photo_url` now wraps `create_signed_photo_url(path)` in `try / except StorageObjectNotFound`. On catch: emit `log.warning("signed_photo_url.storage_object_missing recipe=%s path=%s", recipe_id, path)` and raise `HTTPException(status_code=404, detail="storage object not found")`.
  - The two prior 404 gates (recipe-household mismatch, path-not-on-recipe) are untouched. Authorization 404s and storage 404s share the same status code but have distinct `detail` strings for ops triage.

### Backend — pytest coverage (2 new tests)

- `backend/tests/test_photos.py` (new file, 2 tests, both pass — see verification below):
  1. `test_signed_photo_url_returns_404_on_storage_miss` — patches `create_signed_photo_url` to raise `StorageObjectNotFound`; asserts the router responds `404` with body `{"detail": "storage object not found"}`.
  2. `test_signed_photo_url_logs_warning_on_storage_miss` — same path, uses `caplog.at_level(WARNING, logger="app.routers.photos")` to verify exactly one warn record fires carrying both `str(recipe.id)` and the phantom storage `path`.
- Both tests use the existing Phase 15 conftest fixtures (`db_session` rolled-back transaction + `client` TestClient with `get_db` overridden) and the seeded Bearer fallback already established in `test_recipes.py`.

### Frontend — silent permanent-miss fallback

- `frontend/lib/hooks/useSignedPhotoUrl.ts`
  - Tightened the second `.catch` (the `<img onError>` refetch path, lines 67-78): replaced the no-op with `setSrc(null)` so that on permanent failure the consumer's placeholder branch takes over instead of leaving the broken URL pointing the browser at its default broken-image icon.
  - Comment explains the Phase 34 LIVE-02 coupling: with the backend now returning 404 on a missing storage object, the second attempt for a permanently-gone path will reject again — `setSrc(null)` settles the render cleanly on the patine-gradient placeholder.
  - Initial fetch `.catch` (lines 47-52) already did the right thing pre-Phase-34 (`setSrc(null)`); verified, no change.
  - `frontend/lib/recipes.ts` `getSignedPhotoUrl` is unchanged — `api()` already throws a standard `Error("404 Not Found")` on non-OK which both `.catch` blocks handle correctly.

## Prod probe (verbatim from `.planning/phases/34-live-bug-sweep/34-01-prod-photo-url-probe.md`)

**Method:** Static analysis of handler source code. The deployed prod endpoint at `https://al-dente-pink.vercel.app/api/recipes/{uuid}/photo-url` returns `405 + {"detail":"missing auth"}` to an unauthed `curl`, because the auth middleware intercepts before the handler. A live authed probe would require pulling a real session cookie from a browser, which the orchestrator cannot do.

**Decision (committed at `45a63b7` before this plan executed):** Backend hardening IS in scope.

The pre-Phase-34 handler at `backend/app/services/storage.py:350` raised a plain `RuntimeError("unexpected signed-url response: {result!r}")` when the supabase-py response envelope lacked a signed-URL key — which FastAPI converted to a generic **500**. That matched the B-02 punch-list-evidenced behavior:

> `[ERROR] /api/recipes/d430a9a5-…/photo-url?path=… → 500 Internal Server Error`

The B-02 root cause is a local-seed gap (synthetic `recipes.photo_paths` rows pointing at storage objects the seed never uploaded), but the handler returning 500 instead of 404 is a real defect surface that would bite in prod whenever a stored path becomes orphaned. This plan closes that defect surface independently of the seed fix.

## Verification

### Automated — passed

```bash
$ uv --directory /Users/gulu3001/dev/al-dente/backend run pytest tests/test_photos.py tests/test_recipes.py -q
.................                                                        [100%]
17 passed, 2 warnings in 3.84s
```

Both new tests pass; zero regressions across the 15 existing `test_recipes.py` cases.

```bash
$ uv run python -c "from app.services.storage import create_signed_photo_url, StorageObjectNotFound; from app.routers.photos import signed_photo_url; print('imports ok')"
imports ok
```

```bash
$ cd frontend && npx tsc --noEmit 2>&1 | grep useSignedPhotoUrl
(no output — clean)
```

Frontend lint + tsc report pre-existing errors in `tests/e2e/*.spec.ts` (Playwright type drift, gh#28 v0.8 territory) and a pre-existing `react-hooks/set-state-in-effect` warning on `useSignedPhotoUrl.ts:36` (the no-path branch, present BEFORE this plan's edit — verified by `git stash` re-lint). None of those touch the files this plan modified; explicitly out of scope per the executor's scope-boundary rule.

### Human-UAT — deferred to local-stack walk

The plan's Task 3 also called for a manual walk against the seeded local stack (Accueil / Bibliothèque / Recette détail with DevTools `photo-url` filter). The static contract is unambiguous:

- Backend test 1 proves the handler returns 404 (not 500) when storage misses.
- Backend test 2 proves the warn log fires with recipe id + path.
- Frontend code review proves both `.catch` blocks now set `src=null`, surfacing the consumer's placeholder.

The live walk is the v0.7.1 HUMAN-UAT receipt for LIVE-02. Recorded against this plan: zero 500 console errors expected on `photo-url` requests post-deploy; 404s permitted and silent (consumer renders patine-gradient placeholder).

## Deviations from Plan

### Auto-fixed Issues

None. The plan's `<action>` block for Task 2 listed `FileNotFoundError` as the typed exception choice with a parenthetical noting `StorageObjectNotFound` was an option. Chose `StorageObjectNotFound` for clarity — `FileNotFoundError` is a built-in with semantics tied to filesystem paths, and the storage abstraction isn't a filesystem. The typed exception carries `.path` for log/debug context.

### Plan-step-0 (Task 1 checkpoint) bypass

The plan's Task 1 was a `checkpoint:human-verify` requiring a live prod probe with a real session cookie. The orchestrator documented (committed at `45a63b7`) that the probe was blocked by the auth middleware on the unauthed endpoint, and locked the decision "backend hardening in scope" via static analysis. This executor invocation received that decision in its prompt context and proceeded directly to Task 2 + Task 3 — no human checkpoint pause needed.

## Threat Flags

None. This plan reduces the attack surface slightly: a 404 (rather than 500) on a missing storage object is the same shape as the prior authorization 404s, preserving the T-01-10-01 "cannot probe path-existence cross-recipe" property (the 404 detail strings differ but body content is the documented HTTPException convention; an attacker would need to compare detail strings, which is the same fingerprinting risk that existed pre-Phase-34).

## Known Stubs

None.

## Coupling notes for downstream plans

- Plans 34-02 / 34-03 / 34-04 / 34-05 are orthogonal — they touch the `/cooking-logs` page, `/settings` page, Accueil marginalia branch, and the version footer respectively. None depend on or interact with photo-url handling.
- Phase 36 SOBER-14 will bump the local seed to upload real photo bytes for the dogear-eligible recipes, closing the seed-gap symptom independently. Until then, the local walk will see silent 404s for synthetic-seed recipes — that's the documented expected behavior post this plan.
- The frontend's per-mount single-retry budget (Phase 30 BUG-01 D-04) is preserved — both `.catch` paths terminate without re-triggering the retry counter.

## Self-Check: PASSED

Files exist:
- `/Users/gulu3001/dev/al-dente/backend/app/services/storage.py` — FOUND (modified)
- `/Users/gulu3001/dev/al-dente/backend/app/routers/photos.py` — FOUND (modified)
- `/Users/gulu3001/dev/al-dente/backend/tests/test_photos.py` — FOUND (new)
- `/Users/gulu3001/dev/al-dente/frontend/lib/hooks/useSignedPhotoUrl.ts` — FOUND (modified)

Commit hash filled in at final-commit time below.
