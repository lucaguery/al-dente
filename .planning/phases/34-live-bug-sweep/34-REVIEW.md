---
phase_id: 34
phase_name: Live-bug sweep
review_date: 2026-05-18
depth: standard
files_reviewed: 9
status: findings_found
critical_count: 0
warning_count: 2
info_count: 6
---

# Phase 34: Code Review Report

**Reviewed:** 2026-05-18
**Depth:** standard
**Status:** findings_found (no blockers; 2 warnings + 6 info)

## Summary

Phase 34 ships a tight, well-commented bug-sweep across five front-end surfaces and one backend hardening change. The implementations match the documented decisions in `34-CONTEXT.md` and the per-task SUMMARYs. Every load-bearing decision is annotated inline with the phase + LIVE-* tag, which is excellent for future archaeology.

Two findings are non-blocking but worth fixing in a follow-up:

1. **LIVE-06 is incomplete relative to its own stated invariant.** `app/page.tsx` is correctly stripped, but `frontend/components/CookingLogFinalize.tsx` still contains three nested `<main>` elements that double-wrap the layout's landmark. The LIVE-06 plan locked in "one `<main>` per document, owned by the layout" — the sweep missed a sibling.
2. **`create_signed_photo_url` can raise `AttributeError` on an unexpected SDK response shape** (e.g., a bare string URL), which would bypass `StorageObjectNotFound` and still surface as 500. Low probability but the whole point of LIVE-02 was eliminating the 500-on-recoverable-shape class.

Backend test coverage for the 404 path is clean. JSON / i18n key wiring is correct (no shadowing between `cooking_log` singular and `cooking_logs` plural). All architecture invariants verified (computed vote state, French-only via next-intl, single uvicorn process model, HttpOnly cookie auth).

## Warnings

### WR-01: LIVE-06 invariant not fully enforced — three nested `<main>` survive in `CookingLogFinalize.tsx`

**File:** `frontend/components/CookingLogFinalize.tsx:114,124,138`
**Issue:** Phase 34 LIVE-06 explicitly states "WCAG 1.3.1 compliance — one `<main>` landmark per document, owned by the layout" and strips the inner `<main>` from `app/page.tsx`. However, `CookingLogFinalize.tsx` (rendered under `/cooking-logs/[id]/finalize` and `/cooking-logs/[id]`, both of which mount under `app/layout.tsx`'s `<main>`) still renders three `<main>` elements (loading, gone, and main render branches). Same WCAG violation as the one LIVE-06 fixed; just on a different page. The bug-sweep didn't complete its own pattern. Punch-list grep ran on the right pattern but stopped at the first hit.

**Fix:**
```tsx
// All three occurrences — swap `<main>` for `<div>`. The layout owns the landmark.

// Line 114
<div className="flex flex-col flex-1 px-(--spacing-page-x) pt-6 pb-(--spacing-bottom-safe) gap-4">
  …
</div>

// Line 124
<div className="flex flex-col flex-1">
  <EmptyState … />
</div>

// Line 138
<div className="flex flex-col flex-1 px-(--spacing-page-x) pt-6 pb-(--spacing-bottom-safe) gap-8">
  <header …>
  …
</div>
```

A repo-wide grep `grep -rn "<main\b" frontend/app frontend/components` flags only these three remaining sites after the fix.

### WR-02: `create_signed_photo_url` will raise `AttributeError` on non-dict SDK response, bypassing `StorageObjectNotFound`

**File:** `backend/app/services/storage.py:399-411`
**Issue:** The fallback code path assumes `result` is a dict-or-None:
```python
if isinstance(result, dict) and result.get("error") is not None:
    raise StorageObjectNotFound(path)

url = (
    (result or {}).get("signedURL")
    or (result or {}).get("signedUrl")
    or ((result or {}).get("data") or {}).get("signedUrl")
)
```
If a future supabase-py minor version returns a bare URL string (or any non-dict truthy value), `(result or {})` evaluates to `result` (the string), then `.get(...)` raises `AttributeError`. That `AttributeError` falls outside the `except Exception` block (the try only wraps `create_signed_url(...)`), and propagates as a generic FastAPI 500. The whole point of LIVE-02 (per `34-01-prod-photo-url-probe.md`) was eliminating this exact 500-on-recoverable-shape failure mode. The `_looks_like_missing_object` heuristic is appropriately defensive against SDK drift; the response-shape normalization should match that defensiveness.

**Fix:**
```python
# Normalize: if result is not None and not a dict (e.g., bare URL string),
# the SDK happy-path is just `result` itself.
if isinstance(result, str) and result:
    return result

if not isinstance(result, dict):
    # Anything else (None, list, unexpected type) — treat as missing so the
    # router maps to 404 rather than 500.
    raise StorageObjectNotFound(path)

if result.get("error") is not None:
    raise StorageObjectNotFound(path)

url = (
    result.get("signedURL")
    or result.get("signedUrl")
    or (result.get("data") or {}).get("signedUrl")
)
if not url:
    raise StorageObjectNotFound(path)
return url
```

Belt-and-suspenders: catches the bare-string variant AND prevents any future non-dict response from minting a 500.

## Info

### IN-01: Hardcoded French string violates invariant #6 (next-intl day one)

**File:** `frontend/app/cooking-logs/page.tsx:105`
**Issue:** `"Recette supprimée"` is a hardcoded literal — should be `next-intl`. Pre-existing in this file (not introduced by LIVE-01) but the file was touched, so it's in scope. Invariant #6 says "All user-facing strings go through next-intl. Hardcoded strings are productize-later debt — avoid."
**Fix:** Add `cooking_logs.deleted_recipe_fallback: "Recette supprimée"` to `fr.json` and read via `tEmpty("deleted_recipe_fallback")` (or move into a dedicated `cooking_logs.list.*` namespace). Alternatively, mark with `// TODO(productize)` if the team prefers to batch i18n cleanup.

### IN-02: Generic catch in cooking-logs fetch still hides real failure modes from prod users

**File:** `frontend/app/cooking-logs/page.tsx:108-117`
**Issue:** The LIVE-01 fix correctly removes the `limit=500` 422 trigger, but the underlying `try { Promise.all([...]) } catch { setLogs([]) }` pattern still maps any future failure to the empty-state. The `process.env.NODE_ENV !== "production"` console.error helps dev-time visibility, but in production a 401 expiry or 500 still silently renders "Aucun repas cuisiné cette semaine." The same root-cause class that LIVE-01 fixed could recur.
**Fix:** Either (a) split the two fetches so a recipes-list failure degrades gracefully while still showing the cooking logs, or (b) distinguish "empty result" from "fetch failed" in state and surface a toast/retry affordance on the latter. Not blocking — punch-list-verified working on seeded data — but the same trap is set for the next regression.

### IN-03: Inconsistent `members.length` fallback style in `HomeDecide.tsx`

**File:** `frontend/components/HomeDecide.tsx:178,449,473`
**Issue:** Three call sites pass `session.members.length` to `computeVoteState` with different fallback shapes:
- Line 178: `session?.members.length ?? 0` (drift-detection canary)
- Line 449: `session.members.length` (rejete filter)
- Line 473: `session.members.length ?? 2` (LIVE-04 validéCount)

At line 473 `session` is guaranteed non-null (gated upstream at line 350), so `?? 2` is dead — `members.length` always returns a number, and `?? ` only triggers on null/undefined (0 passes through). The fallback gives misleading intent ("default to 2-person household") that the runtime never honors. Pick one style:
**Fix:** Use `session.members.length` everywhere `session` is guaranteed (lines 449 + 473) and drop the `?? 2`. The default-2 logic lives inside `computeVoteState` itself (line 34 of `lib/votes.ts`).

### IN-04: Redundant `.slice()` call after `.filter()` in Settings

**File:** `frontend/app/settings/page.tsx:67-69`
**Issue:** `session.members.filter(...).slice().sort(...)` — `filter` already returns a fresh mutable Array, so the `slice()` is a no-op. Probably copy-pasted as a defensive pattern from `ReadonlyArray.sort()` calls where the source is readonly. Harmless but signals confusion about the intermediate type.
**Fix:**
```tsx
return session.members
  .filter((m) => m.id !== session.me.id)
  .sort((a, b) => a.id.localeCompare(b.id));
```

### IN-05: Non-ASCII identifier in i18n key (`toast_validé`)

**File:** `frontend/lib/i18n/fr.json:42` (also `HomeDecide.tsx:204`)
**Issue:** The translation key itself uses a non-ASCII character (`é`). Pre-existing — not introduced by Phase 34 — but worth noting. Most tooling handles it fine (next-intl, JSON, JS); some editor / lint configurations don't. The variable `validéToastedFor` (line 77 of HomeDecide) similarly uses `é` in an identifier.
**Fix (optional):** Rename to `toast_validated` (key) / `validatedToastedFor` (variable) in a future cleanup pass. Don't churn this phase.

### IN-06: `members` typed `ReadonlyArray` but `.filter()` result used inconsistently

**File:** `frontend/app/settings/page.tsx:64-70`, `frontend/components/HomeDecide.tsx:95`
**Issue:** `session.members` is `ReadonlyArray<SessionMember>` (per `SessionProvider.tsx:36`). Settings calls `.filter().slice().sort()` — the `.slice()` is a defensive guard against `.sort()` mutating a readonly source (it wouldn't, because `.filter()` already returns a mutable copy). HomeDecide uses `.find()` directly which is safe. The mental model "I have a readonly array, must defensively copy before mutating" is correct in spirit; the application here is just unnecessary. Tied to IN-04.

---

## Verified clean

- **LIVE-02 backend hardening**: `StorageObjectNotFound` typed exception correctly caught at the router; `_looks_like_missing_object` heuristic covers SDK code/status/message shapes (good defense-in-depth against minor SDK bumps); 404 returns + `log.warning` carries recipe id + path (matches punch-list contract).
- **LIVE-02 backend tests**: Both new pytest cases assert the contract precisely (`storage object not found` detail string + exactly one warn record carrying recipe id + path).
- **LIVE-01 frontend**: `limit=200` matches the backend's `Query(default=50, ge=1, le=200)` ceiling; new `cooking_logs.*` i18n keys correctly wired (`useTranslations("cooking_logs")` scope + `empty_heading`/`empty_body` resolution).
- **LIVE-03 settings**: `partners` correctly derived from `session.members.filter((m) => m.id !== session.me.id)`; no race (session.me/members render-gated by `status === "authenticated"`); Card chrome mirrors the Toi block; solo-household maps to empty render via `.map`.
- **LIVE-04 HomeDecide marginalia**: `validéCount` correctly derived from `computeVoteState` over ALL shortlist.recipes (not the dealable subset — important — `rejete` recipes excluded from the deck but still counted toward "is there a validé in this shortlist?"); guard at line 478 (`validéCount > 0`) prevents the contradiction; invariant #2 (computed not stored) verified.
- **LIVE-05 version bump**: `package.json` correctly bumped 0.1.0 → 0.7.1; matches milestone.
- **LIVE-06 main strip (app/page.tsx)**: `<main>` correctly replaced with `<div>` at line 42; no aria-* attributes were on the original `<main>` that needed preserving (only `className`). Layout's `<main>` at `app/layout.tsx:75` owns the landmark.
- **i18n**: `cooking_logs` (plural, new) and `cooking_log` (singular, existing) coexist cleanly at the top-level of fr.json — no shadowing, no duplicate keys. JSON validates.
- **Invariants**: #2 (vote state computed) honored in HomeDecide LIVE-04 guard; #6 (next-intl) honored for new strings (one pre-existing literal flagged at IN-01); #7 (single uvicorn worker — no module-level state introduced in storage.py / photos.py changes); #8 (HttpOnly cookie auth — all new fetches in cooking-logs/settings flow through `@/lib/api` or existing `fetch` with `credentials: "include"`).
- **MVP posture**: No compat shims. The schema is unchanged; the API contract change (500 → 404 on missing storage object) is a clean tighten, not a both-paths-live straddle.

---

_Reviewed: 2026-05-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
