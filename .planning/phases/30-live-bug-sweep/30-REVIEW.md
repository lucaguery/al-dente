---
phase: 30-live-bug-sweep
reviewed: 2026-05-17T22:27:39Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - backend/app/services/storage.py
  - backend/app/services/svg_sanitizer.py
  - backend/app/services/svg_sanitizer_test.py
  - backend/alembic/versions/0012_resanitize_illustration_svg.py
  - frontend/lib/recipes.ts
  - frontend/lib/hooks/useSignedPhotoUrl.ts
  - frontend/components/RecipeCard.tsx
  - frontend/components/ShortlistCard.tsx
  - frontend/components/PhotoUploader.tsx
  - frontend/app/recipes/[id]/page.tsx
findings:
  critical: 0
  warning: 2
  info: 5
  total: 7
status: issues_found
---

# Phase 30: Code Review Report

**Reviewed:** 2026-05-17T22:27:39Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 30 ships two production bug fixes:

- **BUG-01 (signed photo URLs self-heal):** TTL bumped from 5m to 24h server-side (1h client safety margin → 23h cache), new `useSignedPhotoUrl` hook centralizes fetch+cache+one-shot retry, four surfaces refactored (RecipeCard, ShortlistCard, PhotoUploader, /recipes/[id]/page.tsx).
- **BUG-02 (SVG sanitizer `ns0:` prefix fix):** `ET.register_namespace("", URI)` at module import + belt-and-suspenders regex strip, plus Alembic 0012 data migration to heal already-stored rows.

Overall the changes are well-scoped, well-commented (D-XX references throughout), and align with the existing architecture invariants. Sanitizer security posture is preserved: D-33 reject-and-fallback intact, allowlist walk runs **before** the regex post-processing on already-validated tree output, and D-38 trust boundary is honored. The hook design (per-mount retry budget, silent swap) matches D-04/D-05 contract.

Two warnings flagged below. The first is a real race between unmount and the in-flight `onError` refetch (no `alive` guard on the retry promise). The second is a fragile contract in `PhotoUploader` where the hook receives an empty-string `recipeId`. Both are recoverable and non-security-relevant. Five info-level items document smaller polish opportunities and edge cases.

No security regressions detected. No backward-compat shims (per MVP posture). Invariant 4 (realtime) and Invariant 8 (HttpOnly cookie auth) preserved.

## Warnings

### WR-01: `useSignedPhotoUrl` retry path lacks `alive` guard — setSrc after unmount

**File:** `frontend/lib/hooks/useSignedPhotoUrl.ts:58-74`
**Issue:** The initial fetch in the effect uses a closure-captured `alive` flag to ignore late-arriving promises after unmount (lines 40, 44, 51). The `onError` callback's refetch (line 66-67) has no such guard. If an `<img>` errors and triggers `hook.onError()`, then the consumer unmounts (e.g. user navigates away from /recipes during the silent retry), the resolved promise still calls `setSrc(url)` on an unmounted component. React 19 will warn ("Can't perform a React state update on an unmounted component") and the URL is dropped. No data loss or security impact, but it's the same hazard pattern the effect explicitly guards against — the retry path should match.

**Fix:**
```ts
const onError = useCallback(() => {
  if (!path) return;
  if (retriedRef.current) return;
  retriedRef.current = true;
  // Mirror the effect's alive guard for the retry promise.
  let alive = true;
  // (No cleanup hook to flip this from useCallback; instead track in a ref.)
  // Cleaner: use an AbortController stored on a ref and abort() in the
  // effect's cleanup. Sketch:
  const ctrl = abortRef.current = new AbortController();
  invalidateSignedPhotoUrl(recipeId, path);
  getSignedPhotoUrl(recipeId, path)
    .then((url) => {
      if (!ctrl.signal.aborted) setSrc(url);
    })
    .catch(() => {});
}, [recipeId, path]);

// And in the effect cleanup: abortRef.current?.abort();
```

A lighter-weight fix that matches the existing pattern: hoist an `aliveRef = useRef(true)`, flip it in the effect cleanup, and gate the retry's `setSrc` on `aliveRef.current`. The current code is functionally OK in practice (React tolerates the call), but flagging because the same hazard is explicitly handled four lines up.

---

### WR-02: `PhotoUploader.FilledPhotoTile` passes empty-string `recipeId` to hook when only `cookingLogId` is set

**File:** `frontend/components/PhotoUploader.tsx:70`
**Issue:** `useSignedPhotoUrl(recipeId ?? "", cookingLogId ? null : path)`. When the uploader is in cooking-log mode (`recipeId === null`, `cookingLogId !== null`), the hook receives `("", null)`. The hook short-circuits on `!path` (line 35) so no network call is made today — but the empty string is also fed into `photoUrlCacheKey` if anyone ever loosens the path-null check. The cache key `"::"` (empty recipeId + empty path) could collide across all such recipes. The contract is also misleading: the hook expects a real recipe id.

**Fix:** Branch the hook call so we don't pass a sentinel:
```ts
// At top of FilledPhotoTile — only call the hook for the recipe-photo branch.
const recipePhotoHook = useSignedPhotoUrl(
  cookingLogId ? "" : (recipeId ?? ""),  // hook is no-op when path is null
  cookingLogId ? null : path,
);
```

The cleaner approach is to introduce a second sub-component (e.g. `RecipePhotoTile` and `CookingLogPhotoTile`) so each branch only calls the hook it needs — Rules-of-Hooks-safe and removes the dead `recipeId ?? ""` argument. The current code is defensible (the hook's null-path guard saves it), but reviewer-confusing.

## Info

### IN-01: Alembic 0012 idempotent WHERE is brittle to future ET prefix drift

**File:** `backend/alembic/versions/0012_resanitize_illustration_svg.py:55-62`
**Issue:** The migration filters rows by `illustration_svg LIKE '%ns0:%'`. The sanitizer's belt-and-suspenders regex (`svg_sanitizer.py:179`) strips `\bns\d+:` to defend against future ET API drift producing `ns1:`/`ns2:`/etc. If that drift ever happens during the Phase 24 era (pre-fix), the stored rows would have prefixes other than `ns0:` and this migration would miss them. The risk is theoretical — Python 3.12's ET deterministically emits `ns0` for the first registered-but-unrecognized URI — but the comment in svg_sanitizer.py line 175 acknowledges the possibility.

**Fix:** Loosen the filter to match the sanitizer's regex:
```python
"... AND illustration_svg ~ 'ns[0-9]+:'"
```
Or simply `LIKE '% ns%:%'` if Postgres regex is unavailable in the bind. Low priority — current code handles 100% of observed prod data.

---

### IN-02: Alembic 0012 — positional row access instead of named

**File:** `backend/alembic/versions/0012_resanitize_illustration_svg.py:70`
**Issue:** `recipe_id, raw_svg = row[0], row[1]` works but `row.id, row.illustration_svg` (RowMapping access via `bind.execute(...).mappings().all()`) is more idiomatic and survives column-order changes in a future SELECT rewrite. Pure style nit.

**Fix:**
```python
rows = bind.execute(
    sa.text(
        "SELECT id, illustration_svg FROM recipes "
        "WHERE illustration_svg IS NOT NULL "
        "AND illustration_svg LIKE '%ns0:%'"
    )
).mappings().all()
# ...
recipe_id, raw_svg = row["id"], row["illustration_svg"]
```

---

### IN-03: `RecipeCard` cooking-log branch has no production fallback when signed-URL fetch fails

**File:** `frontend/components/RecipeCard.tsx:73-77`
**Issue:** The cooking-log path's `.catch` only sets `setCookingLogSrc(devFallbackUrl)` when `devFallbackUrl` is truthy (dev only). In production (`devFallbackUrl === null`), a failed cooking-log URL fetch leaves `cookingLogSrc` as null and the card falls through to the `BrandIcon` placeholder. That's acceptable behavior but inconsistent with the recipe-photo branch which uses the hook's one-shot self-heal. Pre-existing; out of scope per the inline comment ("Phase 30 scope = recipe photos only"). Flagging only as a follow-up candidate.

**Fix:** Future phase — extend `useSignedPhotoUrl` (or write a sibling hook) to accept a URL fetcher injected by the consumer, so the cooking-log branch gets the same self-heal contract. Not for Phase 30.

---

### IN-04: `getSignedPhotoUrl` cache has no upper-bound size

**File:** `frontend/lib/recipes.ts:111`
**Issue:** `photoUrlCache` is an unbounded `Map<string, ...>`. At couple-scale (a few hundred recipes max) this is fine — entries are ~150 bytes (key ~100 chars, value object ~50 bytes). At ~1000 recipes that's ~150 KB resident in the tab. Productize-later concern only; flagged here so it's not forgotten when the library scales.

**Fix:** Productize-later: add a max-size cap (LRU) or wire entries to expire on `recipe.deleted` realtime events. Not required for Phase 30.

---

### IN-05: SVG sanitizer regex strip runs even when no `nsN:` exists — minor waste

**File:** `backend/app/services/svg_sanitizer.py:179-183`
**Issue:** Both `re.sub` calls run unconditionally on every serialization, even though the typical post-`register_namespace` output has no `nsN:` prefix at all. Two regex scans over ≤4096 bytes is negligible (microseconds), but you could short-circuit:

**Fix:**
```python
if "ns" in serialized:  # cheap pre-check
    serialized = re.sub(r"\bns\d+:", "", serialized)
    serialized = re.sub(r'\s+xmlns:ns\d+="[^"]*"', "", serialized)
```
Pure micro-optimization; document only.

---

_Reviewed: 2026-05-17T22:27:39Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
