# Deferred items — Phase 04 polish-w4

Out-of-scope discoveries during plan execution. Logged here per gsd
SCOPE BOUNDARY rule (only auto-fix issues directly caused by the
current task's changes).

## From 04-02 execution (2026-05-07)

### `frontend/components/ColdStartChip.tsx` — pre-existing lint error

- **Rule:** `react-hooks/set-state-in-effect`
- **Line:** 22:7 — `setDismissed(window.sessionStorage.getItem(...))`
- **File status at run time:** unmodified by 04-02
- **Last touched by:** commit `474b3f7` (Plan 04-03 lint cleanup)
- **Disposition:** Out of scope for 04-02. Pre-existing. Suggested
  follow-up: hoist the sessionStorage read into `useState`'s
  initializer (lazy init pattern) or guard with a one-shot ref.

### `frontend/components/HomeDecide.tsx` — pre-existing lint warning

- **Rule:** `@typescript-eslint/no-unused-vars`
- **Line:** 31:8 — `Phase3CookingStartedEvent` defined but never used
- **File status at run time:** unmodified by 04-02
- **Disposition:** Out of scope for 04-02. Pre-existing. Suggested
  follow-up: remove the unused type or `// eslint-disable-next-line`
  with a "kept for future ws frame" justification if intentional.
