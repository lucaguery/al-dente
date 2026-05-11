---
phase: 03
plan: 05
subsystem: web-push
tags: [push, pwa, vapid, service-worker, notifications]
requires:
  - 03-01 (PushSubscription ORM + pywebpush dep)
  - 03-02 (services/shortlist.py already calls send_push_to_household)
  - 03-04 (HomeDecide mount point)
provides:
  - real-pywebpush-fan-out
  - POST-/push/subscribe
  - GET-/push/vapid-public-key
  - custom-service-worker-push-handler
  - inline-push-permission-banner
affects:
  - backend/app/services/push.py (REPLACED — no longer a stub)
  - backend/app/main.py (one new include_router)
  - frontend/components/HomeDecide.tsx (one import + 2 banner mounts)
  - frontend/next.config.ts (2 new options on withPWAInit)
tech-stack:
  added:
    - pywebpush 2.3 (already in pyproject from Plan 01)
    - @ducanh2912/next-pwa customWorker support
  patterns:
    - VAPID-signed Web Push fan-out + 404/410 cleanup
    - sessionStorage-gated permission banner
    - useSyncExternalStore for browser-state reads (Notification.permission, sessionStorage)
key-files:
  created:
    - backend/app/schemas/push.py
    - backend/app/routers/push.py
    - frontend/worker/index.ts
    - frontend/lib/push.ts
    - frontend/components/PushPermissionBanner.tsx
  modified:
    - backend/app/services/push.py (stub replaced with real fan-out)
    - backend/app/schemas/__init__.py (re-exports)
    - backend/app/routers/__init__.py (registers push module)
    - backend/app/main.py (+import push, +include_router)
    - frontend/next.config.ts (+customWorkerSrc, +customWorkerDest)
    - frontend/components/HomeDecide.tsx (banner import + 2 mounts)
decisions:
  - Lazy-import pywebpush in services/push.py so the module loads even if the dep is missing (defensive — pyproject already pins it, but keeps backend bootable on a fresh worktree).
  - send_push_to_household trims payload to {title, body, url} canonical shape (≤128/256/256 chars) before serializing — defends against accidental large payload (Web Push max ~4 KB).
  - Banner logic uses useSyncExternalStore + setOverrideHidden to avoid set-state-in-effect lint while still gating on Notification.permission + sessionStorage.
  - Frontend allocates a fresh ArrayBuffer (not SharedArrayBuffer) for the VAPID public-key Uint8Array so PushManager.subscribe()'s applicationServerKey type-checks under strict TS lib settings.
  - Endpoint logging redacted: only sub.id (UUID, opaque) + status code reach the log; the subscription endpoint URL itself is never logged (T-03-05-04).
metrics:
  duration_seconds: 565
  duration_human: ~9 min
  completed: "2026-05-07T14:09:32Z"
  tasks_completed: 2
  files_changed: 11
  commits: 2
---

# Phase 03 Plan 05: Web-Push delivery (D-09 / D-10 / D-11) Summary

Real pywebpush + VAPID fan-out replaces the Plan 02 stub, plus the custom service worker, subscribe endpoint, and inline permission banner — closing PWA-03 so the 16:00 daily-shortlist cron actually wakes both phones.

## What was built

**Backend (Task 1 — `d37d5d1`):**
- `backend/app/services/push.py` REPLACED with real pywebpush fan-out: iterates `PushSubscription` rows for the household, sends VAPID-signed pushes, deletes rows on 404/410 responses (RFC 8030 dead-endpoint signals). Best-effort: per-sub failures are logged + swallowed.
- `backend/app/routers/push.py` exposes `POST /push/subscribe` (upserts on `(member_id)` UNIQUE) and `GET /push/vapid-public-key` (defense-in-depth runtime fetch).
- `backend/app/schemas/push.py` defines `PushSubscriptionRequest` matching browser `PushSubscription.toJSON()`.
- `backend/app/main.py` wires `app.include_router(push.router)` after cooking_logs.

**Frontend (Task 2 — `37c6a64`):**
- `frontend/worker/index.ts` is the custom service worker entry — handles `push` (calls `showNotification(title, { body, icon, badge, data: { url } })`) and `notificationclick` (focuses existing tab or `openWindow(safeUrl)`; only same-origin paths starting with `/`).
- `frontend/next.config.ts` extended with `customWorkerSrc: "worker"` + `customWorkerDest: "public"`. Main sw.js auto-imports the custom worker via `importScripts`.
- `frontend/lib/push.ts` exposes `registerPushSubscription()`, `urlBase64ToUint8Array()`, `canReceivePush()` (iOS gate: Web Push only works in installed PWAs).
- `frontend/components/PushPermissionBanner.tsx` shows ONLY when permission default + canReceive + not session-dismissed. Uses `useSyncExternalStore` so we don't `setState` inside an effect (lint compliance).
- `frontend/components/HomeDecide.tsx` renders `<PushPermissionBanner />` above `<CookingBanner>` in both render paths (no-shortlist + deck/summary).

## Files changed (11)

| File | Type | Lines |
|------|------|-------|
| `backend/app/schemas/push.py` | created | 30 |
| `backend/app/schemas/__init__.py` | modified | +5 |
| `backend/app/services/push.py` | replaced | 130 (was 34 stub) |
| `backend/app/routers/push.py` | created | 80 |
| `backend/app/routers/__init__.py` | modified | 1 line |
| `backend/app/main.py` | modified | +2 lines |
| `frontend/next.config.ts` | modified | +5 lines |
| `frontend/worker/index.ts` | created | 81 |
| `frontend/lib/push.ts` | created | 96 |
| `frontend/components/PushPermissionBanner.tsx` | created | 110 |
| `frontend/components/HomeDecide.tsx` | modified | +3 lines |

## Verification

All automated acceptance criteria from the plan pass:

```
✓ /push/subscribe + /push/vapid-public-key registered in app.routes
✓ send_push_to_household contains webpush(...) and 404/410 cleanup
✓ db.delete(sub) inside the WebPushException handler
✓ no log.* calls reference sub.endpoint or subscription[...]
✓ Depends(current_member) on both push endpoints
✓ on_conflict_do_update on member_id index
✓ frontend customWorkerSrc + customWorkerDest both set, skipWaiting preserved
✓ worker/index.ts has push + notificationclick listeners + showNotification + startsWith("/") whitelist
✓ lib/push.ts exports the 3 named symbols + reads NEXT_PUBLIC_VAPID_PUBLIC_KEY + has navigator.standalone gate
✓ PushPermissionBanner uses canReceivePush + registerPushSubscription + Notification.permission + sessionStorage
✓ HomeDecide mounts <PushPermissionBanner /> in 2 render paths
✓ TypeScript: no new errors in worker/index.ts, lib/push.ts, PushPermissionBanner.tsx, HomeDecide.tsx
✓ ESLint: no new errors/warnings in our files (pre-existing issues logged in deferred-items.md)
```

## VAPID setup (one-time deploy task — user must do this)

Push delivery is silently no-op'd if VAPID env vars are missing (backend logs a warning, app keeps working). To activate push:

1. **Generate keypair locally** (one-time):
   ```bash
   pip install py-vapid
   vapid --gen
   vapid --applicationServerKey   # prints the URL-safe base64 public key
   ```
   Output: `private_key.pem` + `public_key.pem` in cwd.

2. **Set env vars on Railway (backend)** — Railway → al-dente backend → Variables:
   - `VAPID_PUBLIC_KEY` = the URL-safe base64 string from `vapid --applicationServerKey`
   - `VAPID_PRIVATE_KEY` = the full contents of `private_key.pem` (multi-line PEM)
   - `VAPID_EMAIL` = `luca.guery@gmail.com`

3. **Set env var on Vercel (frontend)** — Vercel → al-dente frontend → Settings → Environment Variables:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = same value as `VAPID_PUBLIC_KEY` above (URL-safe base64; safe to ship in browser bundle by design — public key)

4. **Redeploy both:** `git push` triggers Vercel + Railway. After ~60s both have the new env.

Rotation: regenerate keypair → re-deploy → existing subscriptions silently expire on next push (404/410 → auto-cleaned). Users re-grant via the banner on next Home visit.

## Manual smoke test recipe

After VAPID env vars are set on both Vercel and Railway:

1. **Install the PWA on iPhone:**
   - Open Safari → navigate to https://al-dente.vercel.app (or the production URL)
   - Tap Share → "Add to Home Screen"
   - Open the app from the home-screen icon (must be standalone — `navigator.standalone === true`)

2. **Trigger banner + grant permission:**
   - Open the app → Home tab
   - The "Active les notifications" banner should appear (above the cooking banner area)
   - Tap "Activer" → iOS prompts for Notification permission → grant
   - Toast: "Notifications activées." appears
   - Banner disappears

3. **Trigger an immediate push (no need to wait until 16:00):**
   - In the app, tap "Régénérer le shortlist" (or call `POST /api/shortlists/regenerate` directly)
   - Within ~5 seconds: lock-screen notification appears
     - Title: `Al Dente`
     - Body: `Ton shortlist du jour est prêt !`
   - Tap notification → app focuses (or opens to `/` if backgrounded)

4. **Verify cron path** (next 16:00 household-tz):
   - Wait for the daily cron to fire — both phones should receive the push automatically.
   - Cleanup verification: if a phone is uninstalled, the next cron's 410-from-FCM auto-deletes the dead row (visible via `SELECT count(*) FROM push_subscriptions`).

## Threat surface — mitigations applied

All STRIDE threats from the plan's threat-model are honored in code:

- **T-03-05-01** (VAPID private key exfil): private key only on Railway, never `NEXT_PUBLIC_*`
- **T-03-05-02** (subscribe endpoint tampering): backend validates `https://` scheme + warns on unfamiliar hosts
- **T-03-05-03** (push spoofing): VAPID JWT signing makes spoofing impossible without the private key
- **T-03-05-04** (endpoint logging leak): `services/push.py` only logs `sub.id` (UUID) + status code, never the endpoint URL
- **T-03-05-05** (notificationclick → arbitrary URL): worker enforces `startsWith("/")` whitelist
- **T-03-05-08** (sensitive recipe info in body): cron payload is locked to D-10's static `Ton shortlist du jour est prêt !` — no recipe titles
- **T-03-05-10** (malformed JSON push body): try/catch falls back to defaults
- **T-03-05-11** (iOS without installed PWA): `canReceivePush()` returns false → banner never shows

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript strict-mode rejected `Uint8Array` as `BufferSource`**

- **Found during:** Task 2 verification (`tsc --noEmit`)
- **Issue:** Default `Uint8Array` returns `Uint8Array<ArrayBufferLike>` (potentially SharedArrayBuffer); PushManager.subscribe()'s `applicationServerKey` requires `Uint8Array<ArrayBuffer>` (strictly non-shared).
- **Fix:** Allocate a fresh `new ArrayBuffer(raw.length)` and wrap it as `new Uint8Array(buffer)`; type return as `Uint8Array<ArrayBuffer>`.
- **Files modified:** `frontend/lib/push.ts`
- **Commit:** `37c6a64`

**2. [Rule 1 - Bug] `react-hooks/set-state-in-effect` lint error in PushPermissionBanner**

- **Found during:** Task 2 verification (`npm run lint`)
- **Issue:** The plan-specified `useEffect(() => { ...; setVisible(true) }, [])` pattern violated the `react-hooks/set-state-in-effect` rule that this codebase enforces (added by Next.js 16 ESLint preset).
- **Fix:** Rewrote eligibility-read as `useSyncExternalStore` (the correct hook for reading external mutable state — `Notification.permission`, `sessionStorage`, `navigator.standalone`); added a separate `overrideHidden` state for the user-action dismissal path. Behavior is identical to plan; pattern is lint-compliant.
- **Files modified:** `frontend/components/PushPermissionBanner.tsx`
- **Commit:** `37c6a64`

**3. [Rule 1 - Bug] Unused eslint-disable directive in lib/push.ts**

- **Found during:** Task 2 verification (`npm run lint`)
- **Issue:** Plan-template included `// eslint-disable-next-line no-console` before a `console.error`. The codebase's ESLint config doesn't enable `no-console`, so the disable was flagged as unused.
- **Fix:** Removed the unnecessary directive.
- **Files modified:** `frontend/lib/push.ts`
- **Commit:** `37c6a64`

### Out-of-scope items (logged for later)

See `.planning/phases/03-decide-w3/deferred-items.md` — pre-existing lint errors in `ShortlistCard.tsx` (same `set-state-in-effect` pattern) and warnings in `HomeDecide.tsx` / `lib/votes.ts`. These predate Plan 03-05 and were left untouched per the executor scope-boundary rule.

## Authentication gates

None encountered. The plan's `user_setup` block (VAPID keypair generation + env vars on Railway/Vercel) is a deploy-time human task, not a runtime auth gate during execution.

## Known Stubs

None remaining for push. Plan 02's stub in `services/push.py` is fully replaced.

## Self-Check: PASSED

- ✓ `backend/app/schemas/push.py` — FOUND
- ✓ `backend/app/routers/push.py` — FOUND
- ✓ `frontend/worker/index.ts` — FOUND
- ✓ `frontend/lib/push.ts` — FOUND
- ✓ `frontend/components/PushPermissionBanner.tsx` — FOUND
- ✓ Commit `d37d5d1` — FOUND in `git log`
- ✓ Commit `37c6a64` — FOUND in `git log`
- ✓ Backend verify (`from app.main import app; routes ...`) exits 0
- ✓ Frontend `tsc --noEmit` clean for our files
- ✓ Backend acceptance: 9/9 grep checks pass; Python verify exits 0
- ✓ Frontend acceptance: 18/18 grep checks pass
