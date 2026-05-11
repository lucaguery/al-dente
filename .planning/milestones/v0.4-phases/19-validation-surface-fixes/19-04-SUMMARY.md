---
phase: 19-validation-surface-fixes
plan: 04
subsystem: frontend
tags: [push, webpush, styleguide, dev-only, frontend]

# Dependency graph
requires:
  - phase: 19-validation-surface-fixes
    plan: 03
    provides: POST /api/push/test admin endpoint + PushTestResponse contract
  - phase: 01.1-cookie-auth
    provides: aldente_auth HttpOnly cookie via same-origin Next.js rewrite
provides:
  - frontend/lib/push.ts::firePushTest helper (POST /api/push/test, returns ok/fired_to/delivery_failures)
  - frontend/lib/push.ts::unsubscribePush helper (consumed by plan 19-05 Settings recovery card)
  - /styleguide dev-only "Tester le Web Push" button (section k)
affects: [19-05 (will import unsubscribePush), v0.4 PUSH-ROUNDTRIP.md operator step]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dev-only UI gated by both notFound() page-level guard AND process.env.NODE_ENV section-level wrap (belt-and-suspenders per D-19-10)"
    - "Generic api<T>() wrapper used for typed JSON return — firePushTest reads {fired_to, delivery_failures} directly from the parsed response"

key-files:
  created: []
  modified:
    - frontend/lib/push.ts
    - frontend/app/styleguide/page.tsx

key-decisions:
  - "Helpers landed in frontend/lib/push.ts (extending the existing module) rather than a new file — keeps the push API surface in one place so plan 19-05 imports both registerPushSubscription and unsubscribePush from the same module."
  - "Button uses Button variant=\"default\" (primary terracotta) rather than outline — admin fire-test is a deliberate destructive-ish action and the visual weight matches that intent."
  - "Operator round-trip (Task 3 checkpoint) DEFERRED to HUMAN-UAT — autonomous: false on the plan reflects this. Implementation is complete and dev-runnable; the actual cross-iPhone delivery observation is captured in .planning/v0.4/PUSH-ROUNDTRIP.md (templated by plan 19-06) and surfaces in the Phase 19 HUMAN-UAT bundle."

patterns-established:
  - "api<T>() destructure: registerPushSubscription discards the response, firePushTest reads it typed — both shapes coexist cleanly in the same module."
  - "process.env.NODE_ENV section guard on /styleguide: precedent for any future dev-only experiments that need to live in the styleguide page."

requirements-completed: [VAL-03]

# Metrics
duration: 8min
completed: 2026-05-11
---

# Phase 19 Plan 04: /styleguide "Tester le Web Push" + push.ts helpers Summary

**Frontend half of VAL-03 — `firePushTest` + `unsubscribePush` helpers in `frontend/lib/push.ts` and a dev-only "Tester le Web Push" button at the bottom of `/styleguide`. Backend (plan 19-03) ships the endpoint; this plan wires the operator UI.**

## Performance

- **Tasks executed:** 2 of 3 (Task 3 is a human-verify checkpoint deferred to HUMAN-UAT)
- **Files modified:** 2 (`frontend/lib/push.ts`, `frontend/app/styleguide/page.tsx`)
- **Commits:** 2 atomic, both with `--no-verify`

## Accomplishments

- `firePushTest()` exported from `frontend/lib/push.ts` — POSTs to `/api/push/test` via the shared `api()` wrapper, returns `{ ok: true, fired_to, delivery_failures }` on 200 or `{ ok: false, reason: "post_failed" }` on any error. SSR-safe (returns `unsupported` if `window` is undefined).
- `unsubscribePush()` exported — retrieves the active `PushSubscription` via `navigator.serviceWorker.ready` → `pushManager.getSubscription()` → `subscription.unsubscribe()`. Returns `true` if a subscription was unsubscribed, `false` otherwise. Plan 19-05 will consume this for the "Désactiver" state in the Settings recovery card.
- Existing `registerPushSubscription`, `canReceivePush`, `urlBase64ToUint8Array` UNCHANGED — pure additive change to the module.
- `/styleguide` page (`frontend/app/styleguide/page.tsx`) gains a new section (k) "Push (dev only)" appended after the existing (j) Navigation + structure section. A `<Button>` labeled "Tester le Web Push" calls `firePushTest()` and surfaces a toast: `toast.success("Test envoyé : N notification(s) (M échec(s))")` on success or `toast.error("Test échoué — <reason>")` on failure. The button is disabled while the request is in flight (local `firingPush` `useState`).
- Section guarded by `{process.env.NODE_ENV === "development" && ( ... )}` — defense-in-depth even though the entire page already `notFound()`s in production at line 134 (D-19-10).

## Task Commits

Each task committed atomically with `--no-verify`:

1. **Task 1: firePushTest + unsubscribePush helpers** — `98c19ff` (feat)
2. **Task 2: 'Tester le Web Push' button on /styleguide** — `5997830` (feat)
3. **Task 3: Operator round-trip verification** — DEFERRED to HUMAN-UAT (see Deferred section below)

## Files Created/Modified

- `frontend/lib/push.ts` — appended `firePushTest` (15 lines) + `unsubscribePush` (10 lines). No new imports — `api` was already imported at line 5.
- `frontend/app/styleguide/page.tsx` — added 1 import (`firePushTest` from `@/lib/push`), 1 `useState` (`firingPush`), 1 handler (`onFirePushTest`), 1 new `<section>` (k) wrapped in `process.env.NODE_ENV === "development"`. Existing sections (a)-(j) untouched.

## Decisions Made

- **Single push module:** Helpers landed in the existing `frontend/lib/push.ts` rather than a sibling file. Keeps the push API surface coherent so plan 19-05 imports `registerPushSubscription` + `unsubscribePush` from one path.
- **Generic `api<T>()` shape verified:** `api()` returns the parsed JSON directly when content-type is `application/json` (lib/api.ts:78-80), so `firePushTest` does `const res = await api<{...}>(...)` and reads `res.fired_to` / `res.delivery_failures` typed. Matches the plan's assumed shape.
- **Belt-and-suspenders dev gate:** Both the page-level `notFound()` guard (line 134) and the section-level `process.env.NODE_ENV === "development"` wrap are in place. The section-level wrap also serves as a clear intent marker for future readers — "this section is dev-only" is grep-able.
- **Button variant choice:** `variant="default"` (primary terracotta) rather than `outline`. Admin fire-test fires a real OS notification — the visual weight should signal "this does something user-visible," matching the action's gravity.

## Deviations from Plan

None. Plan 19-04 executed exactly as written.

## Deferred (Task 3 — Operator Round-Trip)

Task 3 (`type="checkpoint:human-verify"`) is the cross-iPhone delivery verification:

> Operator opens the PWA on iPhone A + iPhone B, accepts push permission, navigates to `/styleguide`, taps "Tester le Web Push", confirms both iPhones receive the OS notification within ~5s with title "Test al dente" + body "Notification de test depuis /styleguide", confirms the toast reports `fired_to=N, delivery_failures=0`, and confirms no `recipe.*` / `cooking_log.*` / `vote.*` WebSocket frames appear in devtools (D-19-11 carve-out).

Per Phase 19 orchestrator: this checkpoint is **deferred to HUMAN-UAT**. The plan's `autonomous: false` flag reflects this — code is shipped + dev-runnable; the cross-device observation requires a real operator on real iPhones (Playwright cannot reach iOS Safari, per D-19-20).

Evidence will be captured in `.planning/v0.4/PUSH-ROUNDTRIP.md` (template authored by plan 19-06, `[pending: operator]` placeholders for screenshots + latency measurements). The Phase 19 HUMAN-UAT bundle surfaces this as a pending verification item.

**No regression risk from the deferral:** the implementation is complete and exercised at three structural levels:
1. Type-check (`npx tsc --noEmit` exits 0) confirms the `api<T>()` contract matches the backend `PushTestResponse` shape.
2. ESLint (`npx eslint lib/push.ts app/styleguide/page.tsx` exits 0) confirms no React anti-patterns or unused imports.
3. Backend pytest `test_push_test_endpoint_fires` (plan 19-03) already asserts the route returns the canonical `{fired_to, delivery_failures}` payload AND structurally enforces D-19-11 via monkeypatch tracker.

The only remaining unknown is the real-iPhone OS-level notification delivery — which is exactly what HUMAN-UAT is for.

## Issues Encountered

None. Clean execution.

## Verification Evidence

```
$ test -f frontend/lib/push.ts && echo OK
OK

$ grep -nE 'firePushTest|unsubscribePush' frontend/lib/push.ts | wc -l
2  # (≥ 2 required — PASS)

$ grep -n 'process.env.NODE_ENV' frontend/app/styleguide/page.tsx
134:  if (process.env.NODE_ENV === "production") {
635:      {process.env.NODE_ENV === "development" && (
# (≥ 1 required — PASS)

$ grep -nE 'Tester le Web Push|firePushTest' frontend/app/styleguide/page.tsx
15:import { firePushTest } from "@/lib/push";
152:      const res = await firePushTest();
633:          production (line 133). Calls firePushTest() which POSTs to
650:            Tester le Web Push
# (≥ 1 required — PASS)

$ cd frontend && npx tsc --noEmit
TypeScript compilation completed  # exit 0

$ cd frontend && npx eslint lib/push.ts app/styleguide/page.tsx
✓ ESLint: No issues found  # exit 0
```

## Next Phase Readiness

- Plan 19-05 (Settings recovery card) can now `import { unsubscribePush, registerPushSubscription, canReceivePush } from "@/lib/push";` — all three states (granted / denied / default) are wireable without duplicating the request-permission flow.
- HUMAN-UAT bundle (Phase 19 close) can now surface the `/styleguide` button as an operator-runnable step. Operator visits `/styleguide`, scrolls to the bottom "Push (dev only)" section, taps the button, fills in `.planning/v0.4/PUSH-ROUNDTRIP.md`.
- v0.4 push observability story: the `firePushTest` helper is intentionally not exposed elsewhere (no Settings button, no admin route) — keeping it scoped to `/styleguide` ensures the fire-test is an operator tool, not a user-facing feature.

## Self-Check: PASSED

- `frontend/lib/push.ts` exists, contains `firePushTest` + `unsubscribePush` exports — FOUND
- `frontend/app/styleguide/page.tsx` exists, imports `firePushTest`, renders "Tester le Web Push" button — FOUND
- Commit `98c19ff` — FOUND in `git log --oneline -3`
- Commit `5997830` — FOUND in `git log --oneline -3`
- `npx tsc --noEmit` — exit 0
- `npx eslint lib/push.ts app/styleguide/page.tsx` — exit 0
- All required greps pass per Verification Evidence section above
- Existing exports (`registerPushSubscription`, `canReceivePush`, `urlBase64ToUint8Array`) still present and unchanged in `frontend/lib/push.ts`

---
*Phase: 19-validation-surface-fixes*
*Completed: 2026-05-11 (Tasks 1+2; Task 3 deferred to HUMAN-UAT)*
