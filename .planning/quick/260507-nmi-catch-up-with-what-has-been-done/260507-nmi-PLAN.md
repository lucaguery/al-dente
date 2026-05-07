---
quick_id: 260507-nmi
description: "catch up with what has been done"
date: "2026-05-07"
mode: retroactive
status: complete
commit: 826cc9e
---

# Quick Task 260507-nmi: Catch Up With What Has Been Done

**Context:** These fixes were made directly during a live iPhone UAT session for Phase 3
(decide-w3), outside the normal GSD workflow. This artifact retroactively captures the
work so STATE.md stays coherent and future sessions have accurate history.

## Tasks

### Task 1 — Fix inbox reactivity + draft coexistence after LLM promotion

**Root cause:** `inbox/page.tsx` subscribed to `recipe.created` and `recipe.updated`
but not `recipe.promoted`. When the LLM background task promoted a draft to
`structured`, the draft stayed in the UI cache until next page reload.

**Files:**
- `frontend/app/inbox/page.tsx` — added `recipe.promoted` handler (drops promoted
  recipe from drafts list immediately) and `recipe.deleted` handler

### Task 2 — Add recipe hard-delete

**Files:**
- `backend/app/routers/recipes.py` — `DELETE /recipes/{id}` endpoint; manually
  deletes FK-constrained rows (votes → cooking_logs → recipe), broadcasts
  `recipe.deleted` to both phones
- `frontend/lib/recipes.ts` — added `deleteRecipe()` helper
- `frontend/components/RecipeDraftCard.tsx` — trash icon button for non-processing
  drafts (manual + failed states)
- `frontend/app/recipes/[id]/page.tsx` — trash icon in header, `window.confirm()`,
  navigate to `/recipes` after deletion; handles `recipe.deleted` realtime event
  (partner deletes while you're viewing)
- `frontend/app/recipes/page.tsx` — `recipe.deleted` realtime handler removes item
  from list
- `frontend/lib/i18n/fr.json` — `delete_recipe`, `delete_draft`, `delete_confirm`,
  `delete_success`, `delete_aria` keys

### Task 3 — Fix push notification error handling + VAPID key setup

**Root cause:** `PushPermissionBanner` showed the same toast for all non-denied
failures. Most likely cause on fresh deploy: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` not set
on Vercel → `missing_key` returned → confusing "partiellement activées" toast shown.

**Files:**
- `frontend/components/PushPermissionBanner.tsx` — `missing_key` now hides banner
  silently (not actionable by user); `post_failed` shows its own message;
  `subscribe_failed` unchanged
- `frontend/lib/i18n/fr.json` — added `home.push.post_failed` key

**Env vars set (outside git):**
- Vercel: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (production)
- Railway: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`
