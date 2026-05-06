---
phase: 01-foundations-w1
plan: 11
subsystem: ui
tags: [recipe-write, photo-uploader, multi-step-quick-add, draft-promotion, cookie-auth, i18n-enums]

# Dependency graph
requires:
  - phase: 01-foundations-w1
    provides: "POST /api/recipes (full), POST /api/recipes/quick, PUT /api/recipes/{id} with status flip (01-08); POST /api/recipes/{id}/photos multipart (01-09); GET /api/recipes/{id}/photo-url helper + Recipe type (01-10); BottomNav scaffold + Tabs/Sheet/Select shadcn primitives (01-02); next-intl + sonner + RealtimeProvider (01-06/01-07)"
  - phase: 01.1-cookie-auth-and-recovery
    provides: "api() with credentials:include + /api/* Vercel rewrite to Railway (01.1-03/01.1-04); SessionProvider + OnboardingGuard (01.1-05)"
provides:
  - "frontend/components/PhotoUploader.tsx — 2x2 grid, 96x96 slots, Plus → Sheet (Caméra/Photothèque), X overlay with 5s undo toast, 4-photo cap, server-side multipart upload via /api/recipes/{id}/photos"
  - "frontend/components/RecipeForm.tsx — shared full-form for new + edit (title, ingredients, steps, prep_time, servings, cuisine Select, mood multi-toggle, protein Select, seasonality multi-toggle, tags, photos); recipeToFormValues + formValuesToBody serialization helpers"
  - "frontend/lib/enum-labels.ts — useEnumLabels() helper translating wire-format enum values to French labels via enums.* fr.json namespace, with try/catch fallback to raw value for forward compatibility"
  - "frontend/lib/i18n/fr.json — new top-level enums.{cuisine,mood,protein,season} block (44 keys), recipes.new.* (24 keys), recipes.edit.* (3 keys), photo_uploader.* (10 keys)"
  - "/recipes/new — Tabs (Rapide / Complète); Rapide = title + optional photo → 2-step POST flow (recipe-quick + photos) → /inbox; Complète = full RecipeForm → POST /api/recipes → /recipes/[id]"
  - "/recipes/[id]/edit — pre-filled RecipeForm via GET /api/recipes/{id}; PUT body promotes draft → structured when title + ingredients populated (W1 promotion path; W2 BackgroundTask layers Gemini extraction on top)"
affects: [01-12-dogfood-cleanup, W2-capture-pipeline (LLM-promotion overlays the same status column)]

# Tech tracking
tech-stack:
  added: []  # No new deps; reuses radix-ui Tabs/Sheet/Select, next-intl, sonner
  patterns:
    - "Two-step quick-add (POST /api/recipes/quick → optional POST /api/recipes/{id}/photos): durable artifact is the draft; soft toast `saved_without_photo` when step 2 fails after step 1 succeeds"
    - "Cookie-auth multipart upload: fetch() with FormData body and credentials:'include' (api() helper can't carry FormData because it default-sets Content-Type:application/json)"
    - "Promote-draft-on-edit: PUT body includes `status:'structured'` when origStatus==='draft' AND body.title+ingredients populated; no separate /promote endpoint in W1"
    - "Sentinel select value (`__none__`) for null cuisine/protein because Radix Select rejects empty-string item values; translated back to undefined at submit time"
    - "PhotoUploader local-form-state removal: X button drops path from form's photo_paths only (no DELETE endpoint exists yet); 5s undo toast restores; productize-later: actual server-side cleanup of orphaned bytes"
    - "RecipeForm `withChrome` prop: false from /recipes/new full tab (page owns header); true from /recipes/[id]/edit (form owns header)"

key-files:
  created:
    - frontend/components/PhotoUploader.tsx
    - frontend/components/RecipeForm.tsx
    - frontend/lib/enum-labels.ts
    - frontend/app/recipes/new/page.tsx
    - frontend/app/recipes/[id]/edit/page.tsx
  modified:
    - frontend/lib/i18n/fr.json (+ enums.*, recipes.new.*, recipes.edit.*, photo_uploader.*)

key-decisions:
  - "Quick-add → /inbox → /edit UX seam (one extra tap to attach a photo to a quick-add): plan documents this as known. The simpler picker on /recipes/new (Rapide tab) does NOT use the rich PhotoUploader because PhotoUploader requires a recipe id (post-save) for its multipart endpoint. The seam disappears in W2 when LLM capture surfaces (voice/photo/url) handle their own pre-save photo flow. Re-evaluate before W2 ships."
  - "X-on-photo orphans bytes in Supabase Storage (T-01-11-02 ACCEPTED): backend has no DELETE /recipes/{id}/photos/{path} in W1. The X button removes the path from local form state only — next PUT save commits photo_paths without it, leaving the bytes unreferenced. Productize-later cleanup task: scheduled job to drop objects whose paths are no longer in any recipe row. Plan W4 when storage-tier limits become real."
  - "Promote-draft-on-edit logic lives client-side: edit page checks origStatus + form body, sends `status:'structured'` in same PUT. Threat T-01-08-08 (client-driven status flip) accepted in 01-08-PLAN; W2's BackgroundTask path overlays the same column with Gemini-extracted fields, so this client path is forward-compatible."
  - "Bearer/localStorage drift fix: plan-as-written used `localStorage.getItem('auth_token')` and `/recipes/...` paths. The codebase migrated to HttpOnly cookie auth + `/api/...` Vercel rewrites in Phase 01.1; both PhotoUploader fetch and quick-add photo fetch use `credentials:'include'` on `/api/...` paths. Documented as Rule 1 deviation."
  - "RecipeForm sticky CTA sits at `bottom-16` (above the 64px BottomNav) with `z-30`; BottomNav is `z-40`, so the form's CTA visibly sits above the nav strip but does NOT cover it. Edit form needs the BottomNav escape hatch; new-form Rapide tab inherits the same stack."

patterns-established:
  - "Multi-tab modal-pattern route: `/recipes/new` uses Tabs as the page's root state; each TabsContent is its own self-contained form (Rapide is inline; Complète delegates to RecipeForm). Future capture surfaces (voice/photo/url in W2) will follow the same pattern as additional Tabs."
  - "Form serialization split: `RecipeFormValues` (string-based, what the UI binds to) ↔ `RecipeBody` (typed, what the server expects). `recipeToFormValues` reverses this for edit pre-fill. The split lets the UI keep best-effort ingredient parsing (regex on quantity+unit+name) without bleeding into the wire shape."
  - "Sentinel select-value pattern (`__none__`): reusable for any future shadcn Select that needs a 'none' option, since Radix rejects empty strings as item values."

requirements-completed: [RECIPE-01, RECIPE-02, RECIPE-05, RECIPE-07]

# Metrics
duration: ~25min
completed: 2026-05-06
---

# Phase 1 Plan 11: Recipes Frontend (Write Side) Summary

**Recipe library write-side: `/recipes/new` Rapide+Complète tabs, `/recipes/[id]/edit` with status-flip promotion, `PhotoUploader` (4-photo cap, Caméra/Photothèque sheet, undo-on-remove) — all on cookie-auth `/api/*` rewrite paths, all copy via next-intl + a new `enums.*` namespace that translates wire-format enum values to French labels.**

## Performance

- **Duration:** ~25 minutes
- **Tasks:** 2 of 3 executed by agent (Task 3 is checkpoint:human-verify, auto-approved per `workflow.auto_advance=true`)
- **Files modified:** 6 (5 created, 1 modified)

## What Was Built

### Task 1 — Components + i18n (commit `83b2693`)

- `frontend/lib/i18n/fr.json` extended with:
  - `enums.cuisine` (10 keys), `enums.mood` (5), `enums.protein` (7), `enums.season` (4) — wire-format → French label mapping
  - `recipes.new.*` (24 keys: tab labels, field labels/placeholders, submit verbs, toast copy)
  - `recipes.edit.*` (title, submit, saved_toast)
  - `photo_uploader.*` (10 keys: add/remove/sheet labels, error states per UI-SPEC §"Error states")
- `frontend/lib/enum-labels.ts` — `useEnumLabels()` hook returning `cuisine|mood|protein|season` translators with try/catch fallback to raw value (forward-compat for new enum values added before fr.json)
- `frontend/components/PhotoUploader.tsx` — UI-SPEC §10 grid (`grid grid-cols-2 gap-3`, 96x96 slots, Plus on next empty slot, locked-empty after cap), Sheet with `Caméra` (`capture="environment"`) + `Photothèque` (regular `accept="image/*"`), X overlay with 5s undo via sonner action
- `frontend/components/RecipeForm.tsx` — shared full-form: title, ingredients textarea (one-per-line with regex parser → `{name,quantity,unit}`), steps textarea, prep_time / servings number inputs, cuisine Select, mood multi-toggle, protein Select, seasonality multi-toggle (defaults to all 4), tags textarea, PhotoUploader. Sticky bottom CTA at `bottom-16` to clear BottomNav

### Task 2 — Pages (commit `59775f3`)

- `frontend/app/recipes/new/page.tsx` — Tabs (Rapide / Complète) with shared header. Rapide tab: `<Input>` for title + native `<input type="file" accept="image/*">` for photo (the rich PhotoUploader needs a recipe id). `submitQuick` is a 2-stage progress (`title` → `photo`) with separate spinner copy per stage; soft `saved_without_photo` toast if step 2 fails after step 1 succeeds. Routes to `/inbox` on success. Complète tab: `<RecipeForm withChrome={false}>` since the page owns the header chrome; submitFull POSTs `/api/recipes` and routes to `/recipes/[id]`.
- `frontend/app/recipes/[id]/edit/page.tsx` — fetches recipe via `api<Recipe>('/api/recipes/{id}')`, pre-fills via `recipeToFormValues`, captures `origStatus`. `onSubmit` builds the PUT body and adds `status: "structured"` when `origStatus === "draft"` AND `body.title.trim()` AND `body.ingredients?.length > 0` — the W1 promotion path.

### Task 3 — Auto-approved (auto_advance=true)

- ⚡ Auto-approved per `workflow.auto_advance=true`. The 14-step manual smoke (creating 10 recipes, photo upload, edit promotion, cross-phone sync, 401 redirect) will be exercised by the user during the dogfood gate that 01-11 opens.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's hardcoded `localStorage.getItem("auth_token")` Bearer auth replaced with cookie-auth + Vercel `/api/*` rewrite**

- **Found during:** Task 1 (PhotoUploader) and Task 2 (quick-add photo upload)
- **Issue:** The 01-11 plan was drafted before Phase 01.1 migrated auth from localStorage Bearer tokens to HttpOnly same-origin cookies (Vercel rewrite + backend Set-Cookie). Plan-as-written would have:
  - Read a Bearer token from `localStorage.getItem("auth_token")` (a key that no longer exists post 01.1-04)
  - POSTed to `/recipes/{id}/photos` (a path that no longer resolves on Vercel after the `/api/*` rewrite was introduced in 01.1-03)
- **Fix:** Both fetch sites (PhotoUploader.uploadFile and submitQuick step 2) use `credentials: "include"` against `/api/recipes/{id}/photos`. The browser auto-attaches `aldente_auth` to same-origin requests and Vercel rewrites to Railway. JSON calls go through the existing `api()` helper which already does both correctly.
- **Files modified:** `frontend/components/PhotoUploader.tsx`, `frontend/app/recipes/new/page.tsx`
- **Commit:** `83b2693`, `59775f3`

**2. [Rule 1 - Lint] PhotoUploader: setState-in-effect cascade**

- **Found during:** Task 1 lint
- **Issue:** ESLint `react-hooks/set-state-in-effect` rejected `setUrls({})` early-return inside the URL refresh effect (same rule that 01-10 RecipeCard explicitly works around).
- **Fix:** Removed the early `setUrls({})`; the render loop already gates filled tiles on `urls[path]` (renders zinc placeholder when missing), so we don't need to clear state — the tiles naturally fall through to placeholder while paths refetch.
- **Files modified:** `frontend/components/PhotoUploader.tsx`
- **Commit:** `83b2693` (folded into the same Task 1 commit since the fix was in the same file)

**3. [Rule 3 - Blocking] Sentinel value for `<SelectItem>` "none" option**

- **Found during:** Task 1 build
- **Issue:** Plan's `<SelectItem value="">{t("cuisine_none")}</SelectItem>` would crash at runtime — Radix Select reserves empty-string for the placeholder slot and rejects empty-string item values.
- **Fix:** Introduced a `NONE_VALUE = "__none__"` sentinel; the form translates `__none__ ↔ ""` at the bind boundary. Both cuisine and main_protein selects use this pattern.
- **Files modified:** `frontend/components/RecipeForm.tsx`
- **Commit:** `83b2693`

### Auth Gates

None encountered. All endpoints (POST /api/recipes, POST /api/recipes/quick, PUT /api/recipes/{id}, POST /api/recipes/{id}/photos, GET /api/recipes/{id}, GET /api/recipes/{id}/photo-url) are bearer-protected via the cookie middleware shipped in 01-04 + 01.1; the OnboardingGuard wrapper around both pages redirects unauthenticated users to /onboarding/welcome before any API call fires.

## Output Notes (per plan §output)

- **Quick-add → /inbox → /edit UX seam:** A user who wants to attach a photo via the Rapide tab can do so in step 2 of `submitQuick` (the simpler native `<input type="file">` picker). The richer PhotoUploader (with the Caméra/Photothèque Sheet + 4-slot grid) is gated to post-save flows because it needs a recipe id for its multipart endpoint. **Re-evaluate before W2** — the W2 LLM capture surfaces (voice/photo/url) will own their own pre-save flows, which may make the Rapide-tab photo path redundant entirely.
- **Productize-later: orphaned photo bytes** — when a user taps the X on a thumbnail and lets the 5s undo expire, the path is dropped from form state and the next PUT save persists `photo_paths` without it. The actual bytes stay in `recipe-photos/{household_id}/{recipe_id}/{uuid}.{ext}`. Mark as W4 cleanup task: scheduled job to drop objects whose paths are no longer referenced from any recipe row. Acceptable W1 leak per T-01-11-02 (no security impact, only storage).
- **Promote-draft-on-edit:** Lives client-side via the same PUT (`status:"structured"` in the body when origStatus was `draft` and the form has title + ingredients). No separate `/promote` endpoint exists in W1. **W2's BackgroundTask path overlays the same `status` column with Gemini-extracted fields** — so a draft created via voice/photo capture in W2 will hit `structured` automatically when extraction succeeds, while a manually-edited draft will hit `structured` via this client path. Same column, two writers, both forward-compatible.
- **Phase 1 dogfood gate open:** RECIPE-01, RECIPE-02, RECIPE-05, RECIPE-07 (UI side) all in. Combined with the prior plan completions (01-01 through 01-10), all 5 Phase 1 success criteria are now technically achievable from inside the PWA without curl. Plan 01-12 (D-01 cleanup, ping code removal) is gated on the user typing "approved — gate passed" at the end of plan 01-07 — that approval has been recorded; 01-12 can proceed when scheduled. **Luca's signal: start using the app daily for 2 weeks before Phase 2 dispatches.**

## Verification

- ✅ tsc --noEmit passes (no type errors introduced)
- ✅ npm run lint passes (only pre-existing `_legacy` warning in `frontend/lib/ws.ts`, out of scope)
- ✅ npm run build passes — both `/recipes/new` (static) and `/recipes/[id]/edit` (dynamic) appear in route table
- ✅ All grep predicates from the plan's `<verify>` blocks pass (one regex predicate uses an old single-line `<input>` pattern; the file has the same content split across multiple JSX prop lines — confirmed via `grep -n 'type="file"' app/recipes/new/page.tsx`)
- ✅ Cross-checked with `recipes.ts` `getSignedPhotoUrl` to confirm signed-URL helper path matches PhotoUploader's per-path render
- ⚡ Task 3 (manual 14-step smoke on both phones) auto-approved per `workflow.auto_advance=true`; the dogfood gate this plan opens IS the smoke test, exercised over weeks rather than minutes

## Self-Check: PASSED

- FOUND: frontend/components/PhotoUploader.tsx
- FOUND: frontend/components/RecipeForm.tsx
- FOUND: frontend/lib/enum-labels.ts
- FOUND: frontend/app/recipes/new/page.tsx
- FOUND: frontend/app/recipes/[id]/edit/page.tsx
- FOUND: 83b2693 (Task 1 — components + i18n)
- FOUND: 59775f3 (Task 2 — /recipes/new + /recipes/[id]/edit pages)
