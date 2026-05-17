---
phase: 30-live-bug-sweep
plan: "01"
subsystem: frontend-photo-urls
tags: [bug-fix, signed-url, pwa, photo, hook, refactor]
dependency_graph:
  requires: []
  provides: [useSignedPhotoUrl, raised-ttl-constants]
  affects: [RecipeCard, ShortlistCard, PhotoUploader, recipe-detail-page]
tech_stack:
  added: [frontend/lib/hooks/useSignedPhotoUrl.ts]
  patterns: [per-mount-retry-ref, sub-component-per-hook-call]
key_files:
  created:
    - frontend/lib/hooks/useSignedPhotoUrl.ts
  modified:
    - backend/app/services/storage.py
    - frontend/lib/recipes.ts
    - frontend/components/RecipeCard.tsx
    - frontend/components/ShortlistCard.tsx
    - frontend/components/PhotoUploader.tsx
    - frontend/app/recipes/[id]/page.tsx
decisions:
  - "D-01: SIGNED_URL_TTL_SECONDS raised to 86400 (24h) to cover overnight PWA suspend"
  - "D-02: PHOTO_URL_CACHE_TTL_MS raised to 82_800_000 (23h) — 1h safety margin under backend TTL"
  - "D-03: Single useSignedPhotoUrl hook as source of truth across all four photo surfaces"
  - "D-04: Per-mount useRef(false) retry budget — exactly one self-heal attempt per <img> mount"
  - "D-05: Silent swap — no skeleton/spinner during self-heal"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-18"
  tasks_completed: 3
  files_modified: 7
---

# Phase 30 Plan 01: Signed-URL self-heal for iPhone PWA backgrounding (BUG-01) Summary

**One-liner:** Raised signed-URL TTL to 24h/23h pair and extracted a shared `useSignedPhotoUrl` hook with one-shot `<img onError>` self-heal across all four photo surfaces.

## What Was Built

Closed BUG-01 (gh#23): recipe photos now survive an overnight iPhone PWA suspend → morning open without manual refresh.

**Root cause:** Backend signed URLs expired after 5 minutes; frontend cache TTL of 4 minutes meant URLs rotated frequently but the `onError` path had no recovery — it only applied the dev fixture fallback, not a refetch.

**Fix (three parts):**

1. **TTL raise** — Backend `SIGNED_URL_TTL_SECONDS` lifted from `60*5` to `86400` (24h). Frontend `PHOTO_URL_CACHE_TTL_MS` lifted from `4*60*1000` to `82_800_000` (23h). 1-hour safety margin means a cached URL never out-survives its signature.

2. **New shared hook** — `frontend/lib/hooks/useSignedPhotoUrl.ts` exports `useSignedPhotoUrl(recipeId, path) => { src, onError }`. On first `<img onError>`: invalidates the cache entry, refetches exactly once (per-mount `useRef(false)` budget), swaps `src` silently. If the second URL also errors, the hook stops and the component's existing placeholder path wins.

3. **Four-surface refactor** — RecipeCard, ShortlistCard, PhotoUploader, and `/recipes/[id]/page.tsx` all replaced their inline `useState + useEffect + getSignedPhotoUrl` blocks with the hook. Net code reduction (~154 lines deleted, ~135 added). Dev 3-stage fallback (cuisine fixture → default.svg) remains in consumer components, gated on `process.env.NODE_ENV !== "production"` exactly as before.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| 24h backend TTL | Covers full sleep cycle (9pm lock → 8am open). Within Supabase 7-day cap. |
| 23h frontend cache TTL | 1-hour safety margin — cached URL never out-survives its signature. |
| Per-mount `useRef` retry budget | Cache entry NOT flagged as "tried" so a remount gets a fresh budget; other components don't inherit back-off. |
| Cooking-log photo branch left inline | Phase 30 scope is recipe photos only. FilledPhotoTile and RecipeCard both keep the cooking-log `useEffect` inline as documented. |
| `FilledPhotoTile` sub-component in PhotoUploader | Hook is single-path; a sub-component per slot is the idiomatic React pattern for a hook called in a loop. |
| `RecipePhotoImg` sub-component in detail page | Same rationale; also eliminates `photoUrls` state array and `refreshPhotoUrls` imperative callback — the hook refetches reactively when `recipe.photo_paths` changes via WS. |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: TTL raise | `4917799` | fix(30-01): raise signed-URL TTL to 24h backend / 23h frontend |
| Task 2: Hook creation | `8e2c6d9` | feat(30-01): add useSignedPhotoUrl hook with one-shot self-heal |
| Task 3: Wire four surfaces | `8d5af82` | fix(30-01): wire useSignedPhotoUrl into all four photo surfaces |

## Deviations from Plan

None — plan executed exactly as written.

The cooking-log inline fetch retention in `RecipeCard` and `FilledPhotoTile` is explicitly in-scope per the plan's boundary note: "the cooking-log path stays in the component" and "cooking-log photos keep the existing per-tile fetch (out of scope)."

## Verification

**Automated checks passed:**
- `grep -n "SIGNED_URL_TTL_SECONDS = 86400"` — 1 match in storage.py
- `grep -n "PHOTO_URL_CACHE_TTL_MS = 82_800_000"` — 1 match in recipes.ts
- No stale `60 * 5` or `4 * 60 * 1000` literals remain
- All four surfaces import from `@/lib/hooks/useSignedPhotoUrl`
- No direct `getSignedPhotoUrl` imports in consumer components
- `process.env.NODE_ENV !== "production"` guard retained in RecipeCard and ShortlistCard
- `process.env.NODE_ENV === "production"` guard retained in `onError` handlers
- `photoUrls` / `refreshPhotoUrls` fully removed from `/recipes/[id]/page.tsx`
- TypeScript `--noEmit` passes cleanly
- `next build --webpack` completes (verified from main repo with installed node_modules)

**UAT (manual — post-deploy):**
- iPhone PWA: lock screen 10 min → unlock → photos visible without manual refresh
- Network tab: each card fires exactly one `/api/recipes/{id}/photo-url` per fresh mount, reuses cached URL for ~23h

## Known Stubs

None — all photo surfaces fully wired to the hook with production self-heal active.

## Threat Flags

No new network endpoints, auth paths, or schema changes introduced. T-30-01-03 mitigation (loop prevention via `retriedRef`) implemented as designed. T-30-01-04 mitigation (dev fallback gating) preserved in all consumer `onError` handlers.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `frontend/lib/hooks/useSignedPhotoUrl.ts` | FOUND |
| `.planning/phases/30-live-bug-sweep/30-01-SUMMARY.md` | FOUND |
| Commit `4917799` (TTL raise) | FOUND |
| Commit `8e2c6d9` (hook creation) | FOUND |
| Commit `8d5af82` (four surfaces wired) | FOUND |
