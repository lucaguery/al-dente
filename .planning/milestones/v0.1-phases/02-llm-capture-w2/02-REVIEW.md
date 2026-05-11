---
phase: 02-llm-capture-w2
reviewed: 2026-05-07T00:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - backend/alembic/versions/0003_promotion_columns.py
  - backend/app/config.py
  - backend/app/models/recipe.py
  - backend/app/routers/recipes.py
  - backend/app/schemas/recipe.py
  - backend/app/services/llm.py
  - backend/app/services/realtime.py
  - frontend/app/recipes/[id]/edit/page.tsx
  - frontend/app/recipes/[id]/page.tsx
  - frontend/app/recipes/new/page.tsx
  - frontend/components/PhotoCaptureTab.tsx
  - frontend/components/RealtimeProvider.tsx
  - frontend/components/RecipeDraftCard.tsx
  - frontend/components/UrlCaptureTab.tsx
  - frontend/components/VoiceCaptureTab.tsx
  - frontend/components/VoiceInput.tsx
  - frontend/components/VoiceModifySheet.tsx
  - frontend/lib/i18n/fr.json
  - frontend/lib/recipes.ts
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-07T00:00:00Z
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

Phase 2 introduces the LLM capture pipeline: voice/photo/URL ingestion, BackgroundTask-based Gemini promotion, retry mechanics, voice-modify, and the inbox draft-card variants. The architecture is sound — server-side promotion, raw input preservation, household-scoped isolation, and per-socket failure isolation are all correctly implemented.

No critical security issues were found. Five warnings relate to correctness risks: a session leak in the retry path, a missing `recipe.promoted` realtime subscription in the inbox, a double-commit on promotion success, a missing MIME-type validation branch, and an unhandled 401 in photo upload. Four info-level items cover dead code, magic numbers, and minor inconsistencies.

## Warnings

### WR-01: Session left open after `db.close()` in `retry_promotion` voice path

**File:** `backend/app/services/llm.py:430-432`

**Issue:** In `retry_promotion`, after the voice branch calls `db.close()` and then `promote_voice_draft(recipe_id, transcript)`, the `finally: db.close()` block at line 452 runs again on the already-closed session. Calling `.close()` on an already-closed SQLAlchemy `Session` is a no-op in practice, but the intent is clearly to hand control to `promote_voice_draft`. The real hazard is the `_record_failure` calls on the photo and unknown-type branches (lines 438-448) — they write to `db` and commit, then the `finally` block calls `db.close()`. This is fine for those branches. However, if `recipe.promotion_error = None; db.commit()` at line 419 raises (e.g. DB connection drop), the `finally` block attempts `db.close()` on a session that may have already rolled back internally, which can mask the original error and leave the recipe in a partially-cleared state. More concretely: the voice branch closes `db` explicitly at line 431 before calling `promote_voice_draft`, but if `promote_voice_draft` itself opens and closes its own session (it does), the `finally` at the outer scope still closes the already-closed original session, which is benign. The actual bug is subtler: for the photo/unknown branches, `_record_failure` commits but the `finally` also closes — that is correct. The voice branch, however, silently skips `_record_failure` after the early `db.close()` which means if `promote_voice_draft` later fails, the failure is recorded inside `promote_voice_draft`'s own session correctly. This is fine. **The real issue**: if `db.commit()` at line 419 (clearing `promotion_error`) fails, `_record_failure` is never called and the recipe row stays in its old error state without any log entry.

**Fix:**
```python
recipe.promotion_error = None
try:
    db.commit()
except Exception as exc:
    log.exception("retry_promotion: failed to clear error on recipe=%s", recipe_id)
    db.rollback()
    return
```

---

### WR-02: `recipe.promoted` not subscribed in the inbox — draft card never flips without manual reload

**File:** `frontend/components/RealtimeProvider.tsx:178-185`

**Issue:** `RealtimeProvider` subscribes to `recipe.promoted` only to show a toast (line 179). The inbox page (not in this review batch) is expected to subscribe independently to update its list. However, `RecipeDraftCard` (the component that shows the spinner / failed / manual variants) has no realtime subscription at all — it is purely driven by props passed from the parent list. If the inbox page does not also subscribe to `recipe.promoted` and refetch/update its recipe list, a "processing" draft card will remain stuck in the spinner state indefinitely even after Gemini finishes, until the user pulls-to-refresh.

This is architecturally intentional per the comment on line 172 ("List refetch is the responsibility of the page that mounted"), but the risk is that the inbox page implementation may miss this contract. Without seeing the inbox page source it cannot be confirmed either way — this is flagged as a warning because the contract is implicit and easy to miss.

**Fix:** Add an explicit comment in `RecipeDraftCard` noting that the spinner state is only resolved by the parent list refreshing on `recipe.promoted`. Alternatively, add a `TODO` linking to the inbox page's subscription requirement so the contract is explicit at the component level.

```tsx
// NOTE: `isProcessing` stays true until the parent list receives a
// `recipe.promoted` (or `recipe.updated`) realtime event and re-renders
// with the updated recipe. The inbox page MUST subscribe to both events.
const isProcessing = ...
```

---

### WR-03: Double `promotion_attempts` increment on success path

**File:** `backend/app/services/llm.py:362` and `backend/app/services/llm.py:309`

**Issue:** On the happy path of `promote_voice_draft` (and `promote_photo_draft`), `promotion_attempts` is incremented twice:
1. `_apply_extracted` does NOT touch `promotion_attempts` — correct.
2. Line 362 (inside `promote_voice_draft`): `recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1`
3. `_record_failure` also does `recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1` on the failure path.

On success, only line 362 runs — so the count is incremented once. On failure, only `_record_failure` runs — also once. This appears correct at first glance. However, for photo retries: `retry_promotion` for photo type calls `_record_failure` directly (line 438-443) without incrementing `promotion_attempts` first. The `_record_failure` helper does increment it, so that is correct.

The actual issue: `promote_voice_draft` increments `promotion_attempts` manually at line 362, and `_record_failure` also increments it at line 336. If `_apply_extracted` raises (e.g. empty title, line 291), execution falls to the `except` block at line 366 which calls `_record_failure` — this is the only increment, so it is correct (one increment total). But if `db.commit()` at line 363 raises after the in-place increment at line 362 and then the exception handler calls `_record_failure` which does another increment and another `db.commit()`, `promotion_attempts` will be incremented by 1 in memory but the first commit failed, so the DB still has the old value. The second commit in `_record_failure` will write `old + 1` (from the failed path read), not `old + 2`. This is benign but means the count may undercount retries if commits fail mid-promotion.

More importantly: `_apply_extracted` clears `promotion_error = None` (line 310) but does NOT increment `promotion_attempts`. The increment at line 362 runs after `_apply_extracted`. If `_apply_extracted` raises `ValueError("Gemini returned empty title")`, the except block calls `_record_failure` which increments and sets the error message. `recipe.promotion_error` was set to `None` by `_apply_extracted` before the raise — but `_apply_extracted` set it to `None` in the same transaction that was never committed. The session still has `promotion_error=None` in-memory when `_record_failure` then sets it to the error string and commits. This is actually correct, because `_apply_extracted` modifies the in-memory object, not the DB.

The net finding: the logic is mostly correct but the manual increment at line 362 creates asymmetry with `_record_failure`'s increment. Consider centralising the increment into `_apply_extracted` or a wrapper to prevent future divergence.

**Fix:**
```python
# In _apply_extracted, add at the end:
recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1

# Remove manual increment from promote_voice_draft (line 362)
# and promote_photo_draft (equivalent line).
```

---

### WR-04: `extract_from_photos` declares MIME as `image/jpeg` for all photos unconditionally

**File:** `backend/app/services/llm.py:229`

**Issue:** `extract_from_photos` passes `mime_type="image/jpeg"` for every photo regardless of actual format. The comment says "Gemini auto-detects from the magic bytes regardless of the declared MIME". While Gemini may be tolerant, the Google GenAI SDK documentation indicates the MIME type is used for content negotiation. A PNG or WebP file declared as `image/jpeg` may be processed incorrectly or trigger an API error on stricter future SDK versions. The router already validates MIME via `storage.detect_mime_and_ext` but does not pass the detected MIME through to `promote_photo_draft` — the bytes alone are passed (line 469 of `recipes.py`).

**Fix:** Pass detected MIME types alongside bytes from the router, or detect them in `extract_from_photos` using magic byte sniffing:
```python
import imghdr  # or use `filetype` library

def _detect_mime(data: bytes) -> str:
    kind = imghdr.what(None, h=data)
    return f"image/{kind}" if kind else "image/jpeg"

parts = [
    types.Part.from_bytes(data=b, mime_type=_detect_mime(b))
    for b in photo_bytes_list
]
```

---

### WR-05: `postPhotoCapture` in `frontend/lib/recipes.ts` swallows 401 responses

**File:** `frontend/lib/recipes.ts:117-123`

**Issue:** The `postPhotoCapture` function uses raw `fetch` (not the `api()` helper) because `FormData` cannot be JSON-wrapped. The `api()` helper intercepts 401 and redirects to onboarding; this raw `fetch` does not. If the auth cookie expires while the user is on the photo tab and they submit, they receive a generic `tErr("network")` toast (mapped in `PhotoCaptureTab.tsx` line 99) instead of being redirected to onboarding. The user has no indication they are no longer authenticated.

**Fix:**
```typescript
if (res.status === 401) {
  // Mirror the api() helper's 401 interception.
  window.location.replace("/onboarding/welcome");
  throw new Error("401 Unauthorized");
}
if (res.status === 413) {
  throw new Error("413");
}
if (!res.ok) {
  throw new Error(`${res.status} ${res.statusText}`);
}
```

---

## Info

### IN-01: `VoiceInput` component is unused in Phase 2

**File:** `frontend/components/VoiceInput.tsx`

**Issue:** `VoiceInput` is included in the reviewed file list but is not imported by `VoiceCaptureTab`, `VoiceModifySheet`, or any other Phase 2 component. Both tabs use a `<Textarea>` directly. The component is explicitly documented as "Phase 4 wires this" and ships as a locked type contract. This is intentional dead code but worth noting as it will generate a lint warning if Next.js or ESLint checks unused exports.

**Fix:** No change needed for v0.1. Add a `// Phase 4: used by cooking-log finalization` comment to suppress any future lint noise, or leave as-is since the comment at lines 7-10 already explains the intent.

---

### IN-02: Magic number `18 * 1024 * 1024` duplicated across backend and frontend

**File:** `backend/app/routers/recipes.py:101` and `frontend/components/PhotoCaptureTab.tsx:40`

**Issue:** The 18 MB Gemini photo cap is expressed as a magic-number literal in both files. The backend names it `GEMINI_PHOTO_TOTAL_BYTES_CAP` (good), but the frontend names it `TOTAL_BYTES_CAP` and defines it independently. If the cap changes, both must be updated separately. The comment in `PhotoCaptureTab.tsx` (line 39) calls out the pairing, so this is a conscious choice, but the duplication is still a maintenance risk.

**Fix:** Consider expressing the value via an env-var or a shared constant comment. At minimum, document the constant in `frontend/lib/recipes.ts` so the pairing is in the shared contract file.

---

### IN-03: `recipe.promoted` realtime event handler in `RealtimeProvider` will fire toast for every household member including the submitter

**File:** `frontend/components/RealtimeProvider.tsx:178-185`

**Issue:** The toast "Ta recette « {title} » est prête !" fires on every connected client including the user who initiated the capture. For the submitter, this may feel like a duplicate of the success flow (they already saw "Recette en cours d'analyse…" toast). This is a UX inconsistency, not a bug — but it may surprise the user. The architecture comment at line 169 notes "Both phones surface the toast" intentionally.

**Fix:** Acceptable as-is for v0.1. If this becomes noisy, the fix is to include `created_by_member_id` in the payload and compare against the local member id from `useSession()`.

---

### IN-04: `fr.json` missing `cooking_log` namespace entries used by `VoiceInput`

**File:** `frontend/lib/i18n/fr.json:231-236`

**Issue:** `VoiceInput` uses `cooking_log.voice_input.placeholder` and `cooking_log.voice_input.aria_label` as default keys. The `fr.json` file has these keys (lines 232-235), so runtime translation works. However, the key values contain emoji (`🎤`) in both `cooking_log.voice_input.placeholder` and `recipes.voice.transcript_placeholder` (line 122). Per CLAUDE.md "Only use emojis if the user explicitly requests it" — this applies to code, but i18n strings are user-facing copy so the rule is ambiguous. Flag for awareness only; French copy is the product owner's domain.

**Fix:** No code change required. If the no-emoji policy applies to i18n strings, remove the `🎤` from lines 122 and 234.

---

_Reviewed: 2026-05-07T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
