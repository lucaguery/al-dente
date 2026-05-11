---
phase: 01-foundations-w1
plan: 10
subsystem: ui
tags: [recipe-library, search-debounce, signed-urls, drafts-inbox, json-export, realtime, cookie-auth]

# Dependency graph
requires:
  - phase: 01-foundations-w1
    provides: "Recipe HTTP API (POST/GET/PUT) + WS recipe.created / recipe.updated (01-08); Photo upload + private bucket (01-09); useRealtime + reconnect (01-07); BottomNav scaffold + EmptyState (01-02)"
  - phase: 01.1-cookie-auth-and-recovery
    provides: "SessionProvider + useSession (cookie-auth identity); /api/* Vercel rewrite to Railway (01.1-03); api() with credentials:include (01.1-04)"
provides:
  - "GET /recipes/{id}/photo-url?path=... — 5-minute signed URL with path-on-recipe authorization (T-01-10-01)"
  - "frontend/lib/recipes.ts — Recipe type + getSignedPhotoUrl helper"
  - "frontend/components/RecipeCard, RecipeDraftCard, SearchInput — list-row variants + 300ms debounced search input"
  - "/recipes — searchable library list (debounced ILIKE, EmptyState variants for empty / no-results)"
  - "/recipes/[id] — detail with photo gallery, full-page 404 branch, realtime-updated"
  - "/inbox — drafts inbox (?status=draft) with realtime add/replace/remove"
  - "/settings — extends 01.1-06 with RECIPE-08 JSON export button"
  - "BottomNav — live drafts (N) badge driven by recipe.created/updated realtime"
affects: [01-11-recipes-frontend-write, W2-capture-pipeline, W3-cooking-log-photos]

# Tech tracking
tech-stack:
  added: []  # No new deps; reuses next-intl, partysocket, supabase-py
  patterns:
    - "5-minute signed URL with path-on-recipe authorization (private Supabase bucket reads)"
    - "Debounced search via onChange (not useEffect-on-value) — React 19 set-state-in-effect compliant"
    - "Realtime list reactivity: subscribe to recipe.created (prepend, dedup) + recipe.updated (in-place replace) — silent partner-side notifications per UI-SPEC §13"
    - "Drafts inbox status-flip: recipe.updated payload.status flip away from draft REMOVES the row"
    - "Drafts badge via realtime refetch (no polling): every recipe.created/updated event re-runs GET /api/recipes?status=draft"
    - "Export uses raw fetch + credentials:include for the Blob+Content-Disposition response (api<T>() can't return Blob)"
    - "Cookie-auth alignment: all calls use /api/* prefix (Vercel rewrite); no Bearer / localStorage reads"

key-files:
  created:
    - frontend/lib/recipes.ts
    - frontend/components/RecipeCard.tsx
    - frontend/components/RecipeDraftCard.tsx
    - frontend/components/SearchInput.tsx
    - frontend/app/recipes/page.tsx
    - frontend/app/recipes/[id]/page.tsx
    - frontend/app/inbox/page.tsx
  modified:
    - backend/app/services/storage.py (+ create_signed_photo_url, SIGNED_URL_TTL_SECONDS)
    - backend/app/routers/photos.py (+ GET /{recipe_id}/photo-url)
    - frontend/lib/i18n/fr.json (+ recipes.*, inbox.*, settings.export_*)
    - frontend/components/BottomNav.tsx (live drafts (N) badge via realtime)
    - frontend/app/settings/page.tsx (+ RECIPE-08 export section)

key-decisions:
  - "Signed-URL TTL locked at 5 minutes (300 s). FE re-fetches on each detail-page mount and on every `recipe.updated` realtime frame. Productize-later: bump if iOS Safari's image cache evicts URLs faster than the TTL while users dwell on a recipe page."
  - "Path-on-recipe authorization (T-01-10-01): backend's signed_photo_url checks `path in recipe.photo_paths` before minting. 404 (not 403) on miss — same shape as missing-recipe — so existence cannot be probed."
  - "Realtime subscription scope: /recipes lists ALL statuses (RECIPE-03), /inbox filters by status='draft' (RECIPE-06). The same `recipe.updated` payload drives both: /recipes does in-place replace; /inbox removes-if-not-draft, replaces-if-still-draft."
  - "BottomNav drafts badge sources via re-fetch (not local count tracking) so it stays consistent with the canonical server state; cheap because we only re-fetch on WS events (no polling)."
  - "Export via raw `fetch()` not `api<T>()` because we need the streamed Blob and Content-Disposition response. credentials:include attaches the aldente_auth cookie automatically (cookie-auth alignment)."
  - "Photos rendered via plain `<img>` (with eslint-disable-next-line) rather than `next/image` — signed URLs change every 5 min so Next's image-optimization cache layer is more cost than benefit; productize-later: custom loader if image perf shows up in metrics."

patterns-established:
  - "Recipe library read-side architecture: useRealtime() subscriptions inside useEffect, return offEvent() in cleanup. 01-11 (recipes-frontend-write) mirrors this for the new/edit flows."
  - "Empty-state vs no-results-state split: parent owns the query state, EmptyState component receives different heading/body/cta based on whether the list is empty because of (a) zero recipes, or (b) a non-matching search."
  - "Photo URL refresh on partner-side update: the detail page re-runs getSignedPhotoUrl for every path on every `recipe.updated` event. URLs are stable for 5 min so this is wasteful only on rapid edits — accepted at couple-scale."

requirements-completed: [RECIPE-03, RECIPE-04, RECIPE-06, RECIPE-08]

# Metrics
duration: ~30min
completed: 2026-05-06
---

# Phase 1 Plan 10: Recipes Frontend (Read Side) Summary

**Recipe library read-side: searchable list with 300ms debounce + ILIKE backend, detail page with private-bucket signed URLs (5-min TTL, path-on-recipe authorized), drafts inbox tab with live `(N)` badge driven by realtime, settings JSON export button — all wired with cookie-auth (no Bearer/localStorage), all copy via next-intl.**

## Performance

- **Duration:** ~30 minutes
- **Tasks:** 2 of 3 executed by agent (Task 3 is checkpoint:human-verify, auto-approved per `workflow.auto_advance=true`)
- **Files modified:** 12 (8 created, 4 modified)
- **Commits:** 2 atomic feat() commits, both `--no-verify` (parallel-executor protocol)

## Accomplishments

### Backend
- `GET /api/recipes/{id}/photo-url?path=...` mints a 5-minute signed URL for a single bucket-relative photo path. Authorization layer: (a) recipe must be in member's household, (b) `path in recipe.photo_paths`. Both checks return 404 (not 403) on miss — same response as a nonexistent recipe — so cross-household / cross-recipe existence cannot be probed (T-01-10-01 / T-01-10-02 mitigations).
- `create_signed_photo_url(path)` helper in `services/storage.py` normalizes the supabase-py response across SDK versions (`signedURL` / `signedUrl` / `data.signedUrl` keys all handled). 5-minute `SIGNED_URL_TTL_SECONDS` constant exported for the route to echo back.

### Frontend
- **Recipe list (`/recipes`)** — sticky header with title + Plus CTA; debounced search bar (300 ms); list of `<RecipeCard>` with photo thumbnail (signed URL) + cuisine badge + relative-last-cooked. Empty state and no-results state are distinct (different copy + icon). Realtime: `recipe.created` prepends with id-dedup; `recipe.updated` in-place replaces.
- **Recipe detail (`/recipes/[id]`)** — sticky header with back chevron + edit pencil; horizontal photo gallery (snap-x, h-64 w-64) when photos exist, "Pas encore de photo" placeholder otherwise. 28 px display title, meta-chip row (cuisine / mood / protein / prep / servings), Ingredients/Steps sections rendered only when populated, footer with relative last-cooked + ICU-pluralized cook count. Full-page 404 branch (NOT a toast) when the recipe doesn't exist.
- **Drafts inbox (`/inbox`)** — `?status=draft` query; `<RecipeDraftCard>` with `Brouillon` badge; tap routes to `/recipes/{id}/edit`. Realtime: `recipe.created` prepends only when payload.status === "draft"; `recipe.updated` removes the row if status flipped away from draft, replaces in place if still draft.
- **Settings JSON export (`/settings`)** — extends the 01.1-06 read-only settings screen with a third block: "Exporter mes données" + Download button. Uses raw `fetch()` (not `api<T>()`) so it can stream the Blob and trigger the `<a download>` flow. Auth via the same-origin `aldente_auth` cookie (`credentials: "include"`).
- **BottomNav drafts badge** — re-fetches `GET /api/recipes?status=draft&limit=200` on mount AND on every `recipe.created` / `recipe.updated` realtime frame. Badge `(N)` shown when N≥1 AND the user is authenticated; hidden when N=0 OR loading/unauthenticated.

## Task Commits

1. **Task 1 — backend signed-URL helper + recipe types/i18n/components** — `64c853d` (feat)
2. **Task 2 — 4 pages + BottomNav drafts badge wiring** — `f0a27c5` (feat)
3. **Task 3 — two-phone smoke checkpoint** — auto-approved (`workflow.auto_advance=true`); on-device verification deferred to the wave-end deploy + dogfood gate.

**Plan metadata:** _pending_ — orchestrator owns final-commit (per parallel-executor protocol, STATE.md / ROADMAP.md / SUMMARY-doc commit happens after all wave-8 agents complete).

## Files Created/Modified

### Created
- `frontend/lib/recipes.ts` — `Recipe`, `IngredientItem`, `Member` types + `getSignedPhotoUrl(recipeId, path)` helper.
- `frontend/components/RecipeCard.tsx` — UI-SPEC §6 list-row (16 × 16 photo, title, cuisine badge, last-cooked).
- `frontend/components/RecipeDraftCard.tsx` — UI-SPEC §9 drafts row (Brouillon badge, routes to /edit).
- `frontend/components/SearchInput.tsx` — 300 ms debounced search (driven via onChange, not useEffect-on-value); X clear button + Loader2 spinner.
- `frontend/app/recipes/page.tsx` — list page.
- `frontend/app/recipes/[id]/page.tsx` — detail page (with full-page 404 branch).
- `frontend/app/inbox/page.tsx` — drafts inbox.

### Modified
- `backend/app/services/storage.py` — added `SIGNED_URL_TTL_SECONDS = 300` and `create_signed_photo_url(path)`.
- `backend/app/routers/photos.py` — added `GET /{recipe_id}/photo-url` route with path-on-recipe authorization (T-01-10-01 mitigation).
- `frontend/lib/i18n/fr.json` — added `recipes.*`, `inbox.*`, and `settings.export_*` namespaces. Existing `settings.*` keys from 01.1-06 preserved.
- `frontend/components/BottomNav.tsx` — replaced static `badge: 0` with realtime-driven re-fetch of `?status=draft`; gated badge display on `status === "authenticated"`.
- `frontend/app/settings/page.tsx` — added export section + `onExport` handler (raw fetch + Blob + `<a download>`).

## Decisions Made

- **Signed-URL TTL = 5 minutes (300 s)** — locked. FE re-fetches per detail-page mount and per `recipe.updated` event. Long enough to scroll-and-read; short enough that a leaked URL doesn't have value past closing the tab. Revisit if Image cache eviction patterns on iOS Safari force a longer dwell.
- **Path-on-recipe authorization** — T-01-10-01 mitigation. Without it, any household member could mint signed URLs for arbitrary objects in the bucket simply by guessing UUIDs. The check `path in recipe.photo_paths` makes the only legitimate paths the ones the backend itself wrote.
- **`/recipes` lists ALL statuses; `/inbox` filters to drafts** — RECIPE-03 spec is "household's recipes (paginated)" with no status filter; the drafts surface is its own tab (RECIPE-06). A draft therefore appears in BOTH `/recipes` (in chronological position) and `/inbox` (in the dedicated tab) until the user finishes filling it.
- **BottomNav drafts badge fetches via /api, not WS frame counts** — the realtime payload is the canonical recipe shape, but updating the count from WS would require local bookkeeping (track which IDs are drafts; flip on status change). Re-fetching `?status=draft&limit=200` on every WS event is O(1 round-trip) at couple-scale and matches the server-truth invariant.
- **Cookie-auth migration** — the original plan referenced `localStorage.getItem("auth_token")` for the export `<a download>` flow. Phase 01.1 cookie-auth had since landed (`SessionProvider` is the identity source; auth is the same-origin `aldente_auth` HttpOnly cookie). Used `useSession().session.household_id` for the path and `credentials: "include"` for the auth attach. Documented under Deviations.
- **Photos rendered via plain `<img>`** — with `// eslint-disable-next-line @next/next/no-img-element`. Signed URLs change every 5 min, so Next's image optimization cache layer adds cost without benefit at this TTL. Productize-later: a custom loader if image performance regresses.
- **API path prefix `/api/...`** — matches the cookie-auth Vercel rewrite (`next.config.ts` rewrites `/api/:path*` → `${RAILWAY}/:path*`). The older `/pings` / `/households/me` calls in `PingPanel` and `SessionProvider` predate this convention; new code should use `/api/...` for both production correctness and local-dev compatibility.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Original plan referenced legacy localStorage Bearer auth for export download**
- **Found during:** Task 2, while writing `onExport` in `frontend/app/settings/page.tsx`
- **Issue:** Plan example used `localStorage.getItem("auth_token")` and `Authorization: Bearer ${token}` headers. Phase 01.1 cookie-auth had already landed: localStorage no longer holds the auth token (it's in the HttpOnly `aldente_auth` cookie), and `lib/api.ts` was updated to use `credentials: "include"` exclusively.
- **Fix:** Replaced with `useSession().session.household_id` for the household path-param and `fetch(..., { credentials: "include" })` for the auth attach. Path uses the `/api/...` prefix so the Vercel rewrite forwards to Railway with the cookie attached same-origin.
- **Files modified:** `frontend/app/settings/page.tsx`
- **Commit:** `f0a27c5`

**2. [Rule 1 — Bug] React 19 `react-hooks/set-state-in-effect` lint failure on three components**
- **Found during:** Task 2 verification (running `npm run lint`)
- **Issue:** `setSrc(null)` (RecipeCard), `setPending(true)` (SearchInput), `setDraftCount(0)` (BottomNav) were called synchronously inside `useEffect` bodies — a React 19 anti-pattern that causes cascading renders and is now lint-error-level.
- **Fix:**
  - `RecipeCard`: removed redundant `setSrc(null)` (initial state is already null; effect short-circuits when no photo).
  - `SearchInput`: rewired so the debounce is driven from the `onChange` handler (not a useEffect on `value`); a single mount-effect kicks off the initial empty-query fetch via `setTimeout(0)` and never sets state synchronously.
  - `BottomNav`: removed the early-return `setDraftCount(0)` and gated badge display on `status === "authenticated"` in the render path.
- **Files modified:** `frontend/components/RecipeCard.tsx`, `frontend/components/SearchInput.tsx`, `frontend/components/BottomNav.tsx`
- **Commit:** `f0a27c5`

**3. [Rule 3 — Blocker] Worktree had no `node_modules`, blocking lint/build**
- **Found during:** Task 1 / Task 2 verification
- **Issue:** Git worktrees don't share `node_modules`; this worktree's frontend dir was bare. `npm run lint` (eslint) and `npm run build` both failed with `command not found` / `Cannot find package 'eslint'`.
- **Fix:** Symlinked `frontend/node_modules → /Users/gulu3001/dev/al-dente/frontend/node_modules` (the main repo's installed modules). The symlink lives under `/node_modules` which is gitignored, so it doesn't ship in any commit. After the link, `tsc --noEmit`, `npm run lint`, and `npm run build` all pass clean.
- **Files modified:** none (symlink only)
- **Commit:** —

**4. [Rule 1 — Bug] Worktree base mismatch (rebase to wave-7 head)**
- **Found during:** the `<worktree_branch_check>` step at executor start
- **Issue:** The worktree's HEAD pointed to `26001b25` (the old MVP-spec commit) instead of the wave-8 base `a3a02bc` (post-01-09 SUMMARY). Without rebasing, the plan's `@.planning/phases/01-foundations-w1/01-09-SUMMARY.md` reference, `backend/app/routers/photos.py`, etc. would all 404.
- **Fix:** `git reset --soft a3a02bc...; git checkout HEAD -- .` to align both index and working tree without losing committed work (there were no committed changes to lose on the worktree branch).
- **Files modified:** none — this just placed the working tree at the correct base.
- **Commit:** —

## Task 3 Auto-Approval

`workflow.auto_advance=true` per `.planning/config.json`. The two-phone smoke described in Task 3 (seed via curl, verify list/search/detail/inbox/badge/realtime/export across both iPhones) cannot be executed by the parallel-executor agent — it requires Vercel + Railway redeploy and dogfood time. Logged as `Auto-approved: recipe library read-side` and continued. Two-phone validation lands at the wave-end checkpoint via the orchestrator's deploy + dogfood pass.

## Issues Encountered

- **Worktree had no `node_modules`** — see Deviation #3. Symlinked from main repo. Could not run `npm install` directly because that would mutate the locked dependency state across the entire worktree harness. Symlinking is the safe orchestration-friendly fix.
- **`tsc --noEmit` ran via `npx` resolved cross-tree** — the first `npx tsc --noEmit` invocation reported "TypeScript compilation completed" because `npx` walked up to the main repo's tsc binary, but TypeScript without local node_modules emits "Cannot find module 'react'" etc. for the actual files. Caught when explicitly invoking `/Users/gulu3001/dev/al-dente/frontend/node_modules/.bin/tsc`. After the symlink, `tsc --noEmit` runs cleanly against the worktree's tsconfig with the linked modules.
- **Pre-existing tests/e2e and `playwright.config.ts` errors** — out of scope for this plan; unrelated to my changes; logged but not fixed.

## Threat Model Outcome

All `high`-severity threats from the plan's STRIDE register are mitigated and verified by code review:

| Threat ID | Disposition | Where mitigated |
|-----------|-------------|-----------------|
| T-01-10-01 (path-injection signed-URL leak) | mitigate | `backend/app/routers/photos.py::signed_photo_url` checks `path in recipe.photo_paths`; 404 on miss |
| T-01-10-02 (cross-household export) | mitigate | Inherited from 01-08 `exports.py` — path-param household_id MUST equal member.household_id; 404 otherwise |
| T-01-10-03 (signed URL too long-lived) | mitigate | TTL = 300 s (`SIGNED_URL_TTL_SECONDS`) |
| T-01-10-04 (XSS via recipe title) | mitigate | React renders strings as text nodes; no `dangerouslySetInnerHTML` introduced |
| T-01-10-05 (search query referrer leak) | accept | Default Next.js referrer-policy strict-origin-when-cross-origin; documented as accepted |
| T-01-10-06 (search debounce race) | mitigate | Last-write-wins on `Promise` resolution; productize-later: AbortController |
| T-01-10-07 (fake `recipe.created` WS frame) | mitigate-by-design | Only the backend produces frames; channel keying enforced server-side (T-01-05-02) |

## Threat Flags

None — this plan introduced no new trust boundaries beyond those declared in the `<threat_model>`.

## Realtime Patterns Recap (for 01-11)

Plan 01-11 (recipes-frontend-write) should mirror these patterns for the new/edit flows:

- **List add/replace** (`/recipes`): subscribe to `recipe.created` → prepend with id-dedup; subscribe to `recipe.updated` → in-place map-replace.
- **Drafts list with status-filter** (`/inbox`): subscribe to `recipe.created` → prepend ONLY when payload.status === "draft"; subscribe to `recipe.updated` → if status not draft, REMOVE; if still draft, in-place replace or insert.
- **Detail page in-sync** (`/recipes/[id]`): subscribe to `recipe.updated` → if `payload.id === id`, replace local state and re-fetch all signed URLs for `payload.photo_paths`.
- **BottomNav badge**: re-fetch `GET /api/recipes?status=draft&limit=200` on every `recipe.created` and `recipe.updated` event; gate display on authenticated session.

After 01-11 lands the create/edit/photo-upload UI, the same WS event vocabulary (`recipe.created` on POST, `recipe.updated` on PUT) flows through these handlers untouched — partner-side new/edit/upload appear silently.

## iOS Safari Export Behavior

The export flow uses `<a download="al-dente-recipes-{household_id}.json">` triggered via `URL.createObjectURL(blob)` after a `fetch()` with `credentials: "include"`. Two-phone smoke is deferred to wave-end dogfood, but the expected behavior on iOS Safari (per UI-SPEC §11 footnote) is one of:

1. **Standalone PWA mode**: file downloads to the iOS Files app via the standard share sheet.
2. **iOS Safari tab**: the JSON opens in a new tab (default for `<a download>` on iOS Safari with no recognized handler).

Both are acceptable for v0.1. Productize-later: an explicit "Save to Files" hint banner if Luca finds the in-tab fallback confusing.

## Next Phase Readiness

- **For 01-11 (recipes-frontend-write)**: 4 components and 4 routes are stable; the `/recipes/[id]/edit` route is the next surface and currently 404s (intentional — covered by the plan's <objective>). 01-11 can land the edit route + the new-recipe form + the PhotoUploader + the chained `POST /recipes/quick → POST /recipes/{id}/photos` flow without touching any of the read-side files.
- **For W2 capture pipeline**: the `recipe.promoted` event type (when LLM lands) needs an additional handler; for now `recipe.updated` is the only mutation event the FE listens to. Adding `recipe.promoted` is a 5-line change in two places (recipes list page + detail page) — same shape, different name.

## Self-Check: PASSED

Ran on 2026-05-06:
- All 12 created/modified files: FOUND
- Both task commits (`64c853d`, `f0a27c5`): FOUND in `git log --all`
- Backend syntax: `ast.parse()` clean; `from app.routers.photos import router` lists both `/recipes/{recipe_id}/photos POST` and `/recipes/{recipe_id}/photo-url GET`
- Frontend `npx tsc --noEmit`: clean (zero errors in plan-touched files)
- Frontend `npm run lint`: 0 errors / 1 warning (the warning is pre-existing in `lib/ws.ts` — out of scope)
- Frontend `npm run build`: succeeds; `/recipes`, `/recipes/[id]` (ƒ), `/inbox`, `/settings` all listed in route table
- Verify-grep checks (14 patterns): all present
- No hardcoded French strings outside `t("...")` calls in `app/recipes`, `app/inbox`, `app/settings`, `components/BottomNav.tsx`

---
*Phase: 01-foundations-w1*
*Plan: 10 — recipes-frontend-read*
*Completed: 2026-05-06*
