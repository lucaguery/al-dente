---
quick_id: 260507-nmi
status: complete
commit: 826cc9e
date: "2026-05-07"
self_check: PASSED
---

# Summary: 260507-nmi — catch up with what has been done

All three tasks shipped in commit `826cc9e`, pushed to `main`. Vercel and Railway
auto-deployed.

## What Was Done

### Task 1 — Inbox reactivity ✓
Added `recipe.promoted` onEvent handler in `inbox/page.tsx`. When the LLM background
task completes and broadcasts `recipe.promoted`, the draft is now immediately removed
from the local drafts list on both phones — no page reload required. Also added
`recipe.deleted` handler so a deleted recipe disappears from the inbox in real time.

### Task 2 — Recipe hard-delete ✓
- Backend: `DELETE /recipes/{id}` deletes in FK order (votes → cooking_logs → recipe),
  returns 204, broadcasts `recipe.deleted`
- Frontend: trash icon in draft card (non-processing states) and recipe detail header;
  `window.confirm()` gate before deletion; navigates to `/recipes` after success
- Realtime: all three list views (`/inbox`, `/recipes`, `/recipes/[id]`) handle
  `recipe.deleted` events to remove items without polling

### Task 3 — Push VAPID + error handling ✓
- Generated VAPID key pair via `py_vapid`
- Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` on Vercel production via CLI
- Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` on Railway via CLI
- `PushPermissionBanner` now silently hides when `missing_key` (not actionable by
  user), shows distinct message for `post_failed` vs `subscribe_failed`

## Self-Check

- All changes compile cleanly (`npm run build` in frontend — TypeScript passed)
- Commit `826cc9e` pushed to main; both platforms deployed
- No new TypeScript errors introduced

## Notes for Future Sessions

- Push notifications require physical device re-test: force-close + reopen PWA after
  deploy to get new service worker, then tap "Activer les notifications"
- The hard-delete is intentionally destructive (no soft-delete/recycle bin) — consistent
  with v0.1 couple-scale simplicity. Mark as `// TODO(productize)` if soft-delete is
  needed later
- WR-01 through WR-04 from 03-REVIEW.md remain open (deferred to next UAT round)
