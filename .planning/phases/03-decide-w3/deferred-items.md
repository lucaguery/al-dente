# Deferred items — Phase 3

## From Plan 03-05 (push notifications)

### Pre-existing lint errors (out of scope)

- `frontend/components/ShortlistCard.tsx:50` — `react-hooks/set-state-in-effect` error.
  Same pattern (setState in `matchMedia` effect) — Plan 03 author wrote this before
  the rule was added. Fix is the same `useSyncExternalStore` rewrite as
  PushPermissionBanner. Defer to a Phase 4 polish plan.

### Pre-existing lint warnings (out of scope)

- `frontend/components/HomeDecide.tsx:169:11` — Unused eslint-disable directive (no-console).
- `frontend/components/HomeDecide.tsx:229:31` — `'_e' is defined but never used`.
- `frontend/lib/votes.ts:94:5` — Unused eslint-disable directive (no-console).

These existed before plan 03-05 and were not modified by Task 2 (HomeDecide only
gained the `<PushPermissionBanner />` import + 2 render-site mounts, no logic change).
