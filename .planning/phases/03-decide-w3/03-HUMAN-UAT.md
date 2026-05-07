---
status: partial
phase: 03-decide-w3
source: [03-VERIFICATION.md]
started: 2026-05-07T00:00:00Z
updated: 2026-05-07T00:00:00Z
---

## Current Test

[awaiting human testing — requires physical iOS devices]

## Tests

### 1. Web Push end-to-end delivery
expected: Tap "Activer les notifications" in HomeDecide, /push/subscribe returns 201, trigger shortlist at 16:00 household-tz (or manual regen), notification delivers to both iPhones
result: [pending]

### 2. Framer-motion swipe deck on iPhone
expected: Drag gesture physics work (snap-back when release too early, fly-off when threshold crossed), yes/no overlay opacity ramps correctly, prefers-reduced-motion disables drag (thumb buttons only)
result: [pending]

### 3. Pressenti→Validé celebration toast on partner's phone
expected: When partner's second "yes" vote creates a Validé state, member A sees a celebration toast exactly once per recipe per session
result: [pending]

### 4. Notification tap → app focus on iOS
expected: Tapping push notification opens/focuses the installed PWA (Safari home-screen icon behavior)
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
