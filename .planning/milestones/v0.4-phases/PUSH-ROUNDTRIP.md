---
status: pending
phase: 19-validation-surface-fixes
requirement: VAL-04
closes: P-12-Pu-05 (v0.3 operator deferral)
created: 2026-05-11
updated: 2026-05-11
---

# Web Push round-trip observation

This document closes the **P-12-Pu-05** operator deferral from v0.3 Phase 12. It captures the end-to-end Web Push delivery observation on both household iPhones via the new `POST /api/push/test` admin endpoint (shipped in Phase 19 Plan 19-03 and surfaced in `/styleguide` via Plan 19-04).

## Test procedure

1. Start the dev stack:
   - Backend: `cd backend && docker compose up -d && uv run uvicorn app.main:app --port 8000 --no-access-log &`
   - Frontend: `cd frontend && npm run dev`
2. On each iPhone (already PWA-installed), open the app and confirm the user is signed in (or run `uv run seed` first if testing under the seeded household).
3. On each iPhone, accept the Web Push permission prompt (via `PushPermissionBanner` if it appears, or via the Settings Notifications Card from Plan 19-05).
4. Open `https://<dev-tunnel>/styleguide` on the development device.
5. Tap **"Tester le Web Push"**.
6. Observe the OS notification arriving on each iPhone's lock screen / notification center.

## Expected outcome

- The admin endpoint returns `{ "fired_to": N, "delivery_failures": 0 }` where `N` is the number of active subscriptions across both iPhones.
- Both iPhones receive a push notification with title **"Test al dente"** and body **"Notification de test depuis /styleguide"** within a few seconds.

## Evidence

### Operator: Luca (iPhone A — primary)

[pending: operator]

- iPhone model / iOS version: `_______`
- Date/time of test: `_______`
- Notification observed: `[ ] yes / [ ] no`
- Latency from tap to lock-screen notification: `____ seconds`
- Screenshot reference: `_______`

### Operator: Partner (iPhone B)

[pending: operator]

- iPhone model / iOS version: `_______`
- Date/time of test: `_______`
- Notification observed: `[ ] yes / [ ] no`
- Latency from tap to lock-screen notification: `____ seconds`
- Screenshot reference: `_______`

### Backend response

[pending: operator]

```json
{ "fired_to": _, "delivery_failures": _ }
```

## Outcome

- [ ] **PASS** — Both iPhones received the test push. P-12-Pu-05 closed.
- [ ] **PARTIAL** — Only one iPhone received the push. Investigation notes below.
- [ ] **FAIL** — Neither iPhone received the push. Root cause investigation below.

## Notes

[pending: operator]

---

*Template authored 2026-05-11 — fill in once dev stack + both iPhones are available. Per D-19-12/D-19-13, this document is the operator-deferred closure of P-12-Pu-05 and surfaces in HUMAN-UAT until completed.*
