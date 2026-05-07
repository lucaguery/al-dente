---
phase: 260507-hbw
plan: 01
subsystem: frontend
tags:
  - frontend
  - perf
  - ux
  - cache
  - realtime
requirements:
  - QUICK-260507-hbw
dependency_graph:
  requires:
    - frontend/lib/recipes.ts (Recipe type)
    - frontend/lib/api.ts (api helper)
    - frontend/components/RealtimeProvider.tsx (useRealtime hook)
  provides:
    - module-level recipesCache (frontend/app/recipes/page.tsx)
    - module-level draftsCache (frontend/app/inbox/page.tsx)
  affects:
    - /recipes navigation perceived latency
    - /inbox navigation perceived latency
tech_stack:
  added: []
  patterns:
    - "Module-scope `let cache: T | null = null` for stale-while-revalidate across client navigations"
    - "Seed `useState` initial value from cache to avoid first-paint blank state"
    - "Realtime handlers compute next state once and assign to both setState return AND module cache"
key_files:
  created: []
  modified:
    - frontend/app/recipes/page.tsx
    - frontend/app/inbox/page.tsx
decisions:
  - "Cache lives at module scope (not React context / not localStorage) — simplest survival mechanism for client navigations within a session, and naturally per-tab"
  - "Search results never written to cache (only q.trim() === '' branch caches) — avoids polluting full-list view with filtered subset"
  - "Inbox cache writes guarded by `alive` flag — prevents stale unmounted requests from poisoning cache"
  - "Realtime handlers update cache via setState updater pattern — preserves React's snapshot semantics while keeping cache in lock-step"
metrics:
  duration_minutes: 3
  completed_date: 2026-05-07
  task_count: 2
  file_count: 2
---

# Quick 260507-hbw: Module-level stale-while-revalidate cache for /recipes and /inbox Summary

Eliminated the blank → list flash on second-and-later navigations to /recipes and /inbox by introducing module-scope `let cache: T | null = null` variables that survive client-side navigations; `useState` is seeded from cache so the second visit paints instantly while the existing fetch silently revalidates, and realtime mutations update both component state and the underlying cache to keep subsequent navigations fresh.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Add module-level cache to /recipes | `22fc73a` | frontend/app/recipes/page.tsx |
| 2 | Add module-level cache to /inbox | `de7ec38` | frontend/app/inbox/page.tsx |

## What Changed

### `frontend/app/recipes/page.tsx`

- Added `let recipesCache: Recipe[] | null = null;` at module scope, just below `dedupeReplace`.
- `useState` for `recipes` now seeds from `recipesCache ?? []`.
- `useState` for `loading` now seeds from `recipesCache === null` (skips spinner on warm visits).
- `handleSearch` writes `recipesCache = rows` only when `q.trim() === ""` (search results do NOT pollute the unfiltered cache).
- Both realtime handlers (`recipe.created`, `recipe.updated`) compute the next state inside the `setState` updater and mirror it into `recipesCache` so the next navigation sees the latest data without waiting for a refetch.

### `frontend/app/inbox/page.tsx`

- Added `let draftsCache: Recipe[] | null = null;` at module scope, just below `dedupePrepend`.
- `useState` for `drafts` now seeds from `draftsCache ?? []`.
- `useState` for `loading` now seeds from `draftsCache === null`.
- The fetch effect writes `draftsCache = rows` inside the `if (alive)` branch — the `alive` guard prevents a stale unmounted request from poisoning the cache.
- Both realtime handlers update `draftsCache` via the `setState` updater. The `recipe.updated` handler preserves the existing drop-on-status-flip semantics: when a recipe flips out of `draft`, it is removed from both visible state and the cache; when it stays `draft`, it is replaced in place (or inserted if unseen).

## Verification

- `cd frontend && npm run lint` — passes (no new warnings).
- `cd frontend && npx tsc --noEmit` — passes (no errors).
- `cd frontend && npm run build` — passes, exit 0. (Stderr emits a pre-existing `RAILWAY_URL not set` ENVIRONMENT_FALLBACK warning which is unrelated to this change and present on `main`.)

## Manual Smoke (post-deploy)

The plan's "manual smoke" (instant paint on second visit, partner-side mutations syncing to cache, search not polluting cache) cannot be validated in CI — it requires the deployed PWA on two phones. Owner runs after auto-deploy from `main`:

1. Open /recipes → list loads (first visit).
2. Navigate to /inbox → drafts load (first visit).
3. Navigate back to /recipes → list appears INSTANTLY, no blank frame.
4. Navigate back to /inbox → drafts appear INSTANTLY.
5. From partner's phone, create a new recipe → both phones show the new row via realtime; navigate away and back on this phone → row is still there.
6. On /recipes, type a search query → cached list is replaced with search results; clear the query → full list returns.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `let recipesCache: Recipe[] | null = null;` present in `frontend/app/recipes/page.tsx`: FOUND
- `let draftsCache: Recipe[] | null = null;` present in `frontend/app/inbox/page.tsx`: FOUND
- Commit `22fc73a` (recipes cache): FOUND
- Commit `de7ec38` (inbox cache): FOUND
- Lint clean: FOUND
- Typecheck clean: FOUND
- Build green: FOUND
