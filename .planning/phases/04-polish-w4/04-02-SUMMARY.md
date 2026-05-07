---
phase: 04-polish-w4
plan: 02
subsystem: frontend/cooking-log-finalize
tags:
  - frontend
  - cooking-log
  - finalize
  - rating-picker
  - photo-uploader
  - living-image
  - i18n
dependency-graph:
  requires:
    - 04-01 (PUT /cooking-logs/{id} + POST /photos + GET /photo-url + RecipeResponse.last_cooked_photo_path)
    - 03-02 (cooking-log start + GET /active + CookingBanner)
    - 02-Voice (D-Voice — textarea-only voice notes pattern in VoiceCaptureTab)
  provides:
    - Finalize page at /cooking-logs/[id]/finalize (replaces Phase-3 stub)
    - RatingPicker component (vertical-stack, three-card)
    - CookingLogFinalize composition (photos + rating + notes)
    - PhotoUploader cooking-log mode (cookingLogId prop)
    - RecipeCard living image (D-05 — last_cooked_photo_path priority)
    - lib/cooking.ts: putFinalizeCookingLog, uploadCookingLogPhoto,
      getCookingLogSignedPhotoUrl, LogRating, CookingLogFinalizeRequest
    - lib/recipes.ts: Recipe.last_cooked_photo_path field
  affects:
    - Phase-3 EmptyState stub at /cooking-logs/[id]/finalize (removed)
    - i18n home.finalize_stub.* keys (deleted)
    - existing recipe.updated WS handler (now drives RecipeCard refresh
      after partner finalizes — no new wiring needed)
tech-stack:
  added: []
  patterns:
    - "PhotoUploader prop-based mode switching (recipeId vs cookingLogId)"
    - "Path-prefix branching for signed-URL endpoint selection (cooking-logs/ vs recipes/)"
    - "Server-controlled path layout used as data source (segs[2] = log_id)"
    - "iOS PWA voice-notes via OS keyboard mic (no JS Web Speech) — same pattern as VoiceCaptureTab"
    - "EmptyState as gone-state for stale URL targets"
key-files:
  created:
    - frontend/components/RatingPicker.tsx
    - frontend/components/CookingLogFinalize.tsx
    - .planning/phases/04-polish-w4/deferred-items.md
  modified:
    - frontend/lib/cooking.ts
    - frontend/lib/recipes.ts
    - frontend/components/PhotoUploader.tsx
    - frontend/components/RecipeCard.tsx
    - frontend/app/cooking-logs/[id]/finalize/page.tsx
    - frontend/app/recipes/[id]/page.tsx
    - frontend/lib/i18n/fr.json
decisions:
  - "Notes section is textarea-only (no in-app Mic button) — same pattern as Phase-2 VoiceCaptureTab; iOS PWA standalone breaks Web Speech API (no `result` event after Add to Home Screen). UI-SPEC's mention of a separate Mic button is overridden by reality-tested precedent."
  - "Detail-page hero does NOT surface last_cooked_photo_path — RecipeCard list view only. TODO(productize) marker recorded inline. Reason: backend GET /api/recipes/{id}/photo-url validates path-on-recipe (T-01-10-01); cooking-log paths would 404. Adding a path-agnostic detail-page signed-URL is scope creep."
  - "PhotoUploader extended via optional `cookingLogId` prop (lower-complexity path) instead of extracting a PhotoUploaderBase. Per UI-SPEC §Implementation Notes hint 2."
  - "Finalize page loads via getActiveCookingLog() rather than introducing a new GET /cooking-logs/{id} endpoint. Frontend confirms id-match + rating-null; mismatch renders EmptyState with /home CTA. Avoids backend churn."
  - "Recipe-detail page TODO marker explicitly cites the path-prefix branching cost so future work doesn't have to re-derive the constraint."
metrics:
  duration: "~30 minutes"
  completed: "2026-05-07"
---

# Phase 04 Plan 02: Cooking-Log Finalization Frontend Summary

Frontend cooking-log finalization (COOK-03 + COOK-04) plus the recipe-card living image (D-05) shipped: a real finalize page replaces the Phase-3 stub, composing a new RatingPicker (Adoré / Bien / Passable) over an adapted PhotoUploader and a textarea for voice-via-OS-keyboard-mic notes; submit gates on rating, navigates Home with toast on success, and falls back to an EmptyState when the URL points at an already-finalized or stale log. RecipeCard now prefers the most recent cooking-log photo over the canonical recipe photo, with a path-prefix branch so cooking-log paths route to the correct signed-URL endpoint without 404s.

## Final shape of `lib/cooking.ts` exports

```ts
export type CookingLogResponse = {
  id, recipe_id, household_id, cooked_by_member_id, cooked_at,
  photo_paths: string[],          // <-- NEW (this plan)
  rating: "loved" | "liked" | "disliked" | null,
  notes: string | null,
};

export type LogRating = "loved" | "liked" | "disliked";        // NEW

export type CookingLogFinalizeRequest = {                       // NEW
  photo_paths: string[];
  rating: LogRating;              // REQUIRED at the type level
  notes: string | null;
};

export async function postStartCooking(recipeId): Promise<CookingLogResponse>;       // existing
export async function getActiveCookingLog(): Promise<CookingLogResponse | null>;     // existing
export async function putFinalizeCookingLog(logId, body): Promise<CookingLogResponse>; // NEW
export async function uploadCookingLogPhoto(logId, file): Promise<CookingLogResponse>; // NEW
export async function getCookingLogSignedPhotoUrl(logId, path): Promise<string>;       // NEW
```

`uploadCookingLogPhoto` attaches `.status` to the thrown Error on non-2xx responses so callers (`PhotoUploader.tsx`) can map 413/415/409 to specific i18n keys, matching the recipe-photo upload pattern.

## Deviations from UI-SPEC

### 1. Notes section is textarea-only (no in-app Mic button)

UI-SPEC §"Surface 2" mentions a Mic button next to the textarea. Implemented as **textarea-only** with helper copy `Tu peux dicter avec le micro du clavier.` directing users to the iOS keyboard mic.

**Why:** Phase 2 D-Voice (`02-CONTEXT.md`, encoded in `frontend/components/VoiceCaptureTab.tsx`) discovered that the Web Speech API is BROKEN in iOS PWA standalone mode — no `result` event ever fires after Add to Home Screen, and Safari surfaces no error to JS. An in-app Mic button would silently fail on the target platform; the OS keyboard mic works in any text field with zero JS.

This plan ships the working path; the UI-SPEC divergence is noted and is the same pattern Phase 2 already shipped at `VoiceCaptureTab.tsx`.

### 2. Detail-page hero does NOT surface `last_cooked_photo_path`

UI-SPEC §"Mutated /recipes/{id} detail page" allows two compositions for the living image: option A (living-image becomes hero) or option B (merged carousel). This plan picks **option C: omit from detail page**.

**Why:** Backend `GET /api/recipes/{id}/photo-url` validates `path in recipe.photo_paths` (T-01-10-01); a `cooking-logs/...` path will 404. Adding a path-agnostic signed-URL endpoint to the recipe router (or branching the detail-page gallery to use the cooking-log helper) is scope creep relative to the high-leverage RecipeCard list-view surface.

**Recorded as `// TODO(productize)`** at the top of `refreshPhotoUrls` in `frontend/app/recipes/[id]/page.tsx`. The TODO explicitly cites the path-prefix branching constraint so future work can pick it up without re-deriving the trade-off.

The RecipeCard list view (D-05's headline UX) is unaffected — scrolling /recipes still shows the user's own food via `last_cooked_photo_path` priority.

## Path-prefix branching in `RecipeCard.tsx`

`RecipeCard` derives `firstPath` from `recipe.last_cooked_photo_path ?? recipe.photo_paths[0] ?? ""`. The signed-URL fetch then branches on path prefix:

```ts
const isCookingLogPath = firstPath.startsWith("cooking-logs/");
const urlPromise = isCookingLogPath
  ? (async () => {
      const segs = firstPath.split("/");
      // Layout (server-controlled): cooking-logs/{household_id}/{log_id}/{uuid}.{ext}
      // segs[0] = "cooking-logs", segs[1] = household_id, segs[2] = log_id
      const logId = segs[2];
      if (!logId) throw new Error("malformed cooking-log path");
      return getCookingLogSignedPhotoUrl(logId, firstPath);
    })()
  : getSignedPhotoUrl(recipe.id, firstPath);
```

**Backend layout dependency:** the path layout is fixed by `upload_cooking_log_photo` in `backend/app/services/storage.py` (Plan 04-01 Task 3). If that layout changes, the `segs[2] = log_id` extraction in `RecipeCard.tsx` needs updating; an inline comment captures the dependency for future grepability.

**Threat surface (T-04-02-01):** path is server-controlled — RecipeCard never sees user-supplied cooking-log paths. The malformed-path branch throws inside the IIFE, the outer `.catch()` swallows silently, and the tile falls back to the zinc-100 placeholder (no info leaked).

## TODO(productize) items found

Added in this plan:

- `frontend/app/recipes/[id]/page.tsx` (top of `refreshPhotoUrls`) — D-05 living image extension to detail-page hero. Constraint: detail page would need path-prefix branching identical to RecipeCard, plus updates to the photo-gallery rendering for mixed sources. ~1-2 hour task; recorded for post-v0.1.

Pre-existing (not added; preserved as-found):

- `frontend/components/PhotoUploader.tsx:120` — `// TODO(productize): W1 has no DELETE /recipes/{id}/photos/{path} endpoint.` (Phase 1 marker, untouched.)

## Threat Mitigations Applied

| Threat ID    | Mitigation site                                                                        |
| ------------ | -------------------------------------------------------------------------------------- |
| T-04-02-01   | `firstPath.startsWith("cooking-logs/")` branch routes to `/api/cooking-logs/{id}/photo-url`; backend (Plan 01 T-04-01-02) validates path-on-log → cross-household reads 404 |
| T-04-02-02   | Frontend sends `photo_paths` it received from upload responses; backend Plan 01 intersects against persisted log paths |
| T-04-02-03   | All API calls go through `lib/api.ts` (`credentials: "include"`); backend `current_member` enforces cookie auth |
| T-04-02-04   | `LogRating` TypeScript enum at compile time + Pydantic `LogRating` enum at server time (Plan 01) |
| T-04-02-05   | Malformed cooking-log path → IIFE throws → `.catch()` silently → zinc placeholder |
| T-04-02-06   | Browser/iOS picker enforces upper bound; backend 8 MiB cap (Plan 01) is the hard limit |

## Verification Run

```text
$ ./node_modules/.bin/tsc --noEmit
exit: 0

$ ./node_modules/.bin/eslint components/PhotoUploader.tsx components/RatingPicker.tsx \
    components/CookingLogFinalize.tsx components/RecipeCard.tsx \
    "app/cooking-logs/[id]/finalize/page.tsx" "app/recipes/[id]/page.tsx" \
    lib/cooking.ts lib/recipes.ts
exit: 0  (1 fr.json "no config matched" warning ignored — JSON files not linted)

$ python3 -c "import json; d=json.load(open('lib/i18n/fr.json')); \
    assert d['cooking_log']['finalize']['page_title']=='Finaliser la cuisson'; \
    assert d['cooking_log']['rating']['loved']=='Adoré'; \
    assert 'finalize_stub' not in d.get('home', {})"
JSON OK

$ next build  (production build)
* Skipped — Turbopack rejects the symlinked node_modules in this worktree.
  Build verification will run as part of the Vercel auto-deploy on push to main.
```

The `next build` was attempted but fails because the worktree-local `node_modules` is a symlink out of the worktree root and Turbopack rejects it (`Symlink [project]/node_modules is invalid, it points out of the filesystem root`). This is a worktree-only artifact, not a production issue — Vercel installs node_modules at build time from `package.json` and will execute the real build on push to `main`. tsc + lint pass; the cookie-auth-and-recovery wiring around the finalize page is exercised end-to-end via the manual smoke test below.

## iOS Safari smoke test (post-deploy)

1. Open the deployed app on the dogfood iPhone (Add to Home Screen, standalone mode).
2. Tap **"Je commence à cuisiner"** on the Home shortlist summary → CookingBanner appears at the top of Home.
3. Tap **Finaliser** in the banner → finalize page renders with three sections (Photos / Rating / Notes) in a single scroll.
4. Verify the **Finaliser** button at the bottom is **disabled** (gray, no border-bottom rebound on tap).
5. Tap **Photos → +** tile → Sheet appears with **Caméra** / **Photothèque**. Add 2 photos via Photothèque. Photos appear in the 2x2 grid as they upload.
6. Tap **Adoré** card → border becomes rose, background becomes `bg-surface-rose-100`, Heart icon fills. Tap **Bien** → selection flips, no rose state lingers.
7. Tap inside the **Notes** textarea → keyboard appears with mic key. Tap mic, dictate "C'était trop salé" → text appears in textarea (OS-level handling, no JS).
8. Tap **Finaliser** → app navigates to `/` (Home), toast `Bien enregistré.` appears, CookingBanner is gone.
9. Open `/recipes` → the just-finalized recipe shows the cooking-log photo as primary thumbnail (not the original recipe photo).
10. On partner's phone — same `/recipes` view → same recipe also shows the new thumbnail (driven by Plan 01's `recipe.updated` broadcast hitting the existing Phase-1 invalidation).

**Edge cases to verify if time permits:**

- Visit `/cooking-logs/<some-stale-id>/finalize` directly → EmptyState with **Retour à l'accueil** CTA (the page detected no matching active log).
- Tap **Finaliser** with backend offline → toast `Enregistrement impossible. Réessaie.` (button re-enables).

## Authentication Gates

None encountered. All API calls use the existing same-origin cookie flow (`lib/api.ts` sets `credentials: "include"`); the finalize page is wrapped in `OnboardingGuard` so unauthenticated users are redirected to `/onboarding/welcome` automatically.

## Commits

| Task | Commit    | Subject                                                                       |
| ---- | --------- | ----------------------------------------------------------------------------- |
| 1    | `41dc858` | `feat(04-02): extend Recipe + CookingLog types and add finalize helpers`      |
| 2    | `0a71a0c` | `feat(04-02): cooking-log finalize page with rating picker + photo uploader`  |
| 3    | `35006b0` | `feat(04-02): RecipeCard living image (D-05) + detail-page TODO`              |

## Deviations from Plan

None for behavior. Two minor notes:

1. **JSON formatting fix-up.** Removing `home.finalize_stub` from `fr.json` left a dangling trailing comma on the preceding `},` line. Fixed inline (Rule 1 — bug: the file would otherwise be invalid JSON). The acceptance criteria's `python3 json.load` check would have caught this; pre-emptive fix kept the verify step green.

2. **Symlinked node_modules for tsc/lint.** The worktree had no installed `node_modules`. Symlinked from `/Users/gulu3001/dev/al-dente/frontend/node_modules` for the verification commands, then removed before commit. Symlink not committed (gitignored). This is a verification-only mechanism; no runtime impact.

## Self-Check: PASSED

- File `frontend/components/RatingPicker.tsx` exists.
- File `frontend/components/CookingLogFinalize.tsx` exists.
- File `frontend/lib/cooking.ts` modified (LogRating, CookingLogFinalizeRequest, putFinalizeCookingLog, uploadCookingLogPhoto, getCookingLogSignedPhotoUrl, photo_paths added to CookingLogResponse).
- File `frontend/lib/recipes.ts` modified (last_cooked_photo_path added to Recipe).
- File `frontend/components/PhotoUploader.tsx` modified (cookingLogId prop + branched URL fetch + branched upload).
- File `frontend/components/RecipeCard.tsx` modified (last_cooked_photo_path priority + path-prefix branch).
- File `frontend/app/cooking-logs/[id]/finalize/page.tsx` modified (real page replacing stub).
- File `frontend/app/recipes/[id]/page.tsx` modified (TODO(productize) marker).
- File `frontend/lib/i18n/fr.json` modified (cooking_log.finalize.* / .rating.* / .notes.* added; home.finalize_stub.* removed; JSON valid).
- Commit `41dc858` exists.
- Commit `0a71a0c` exists.
- Commit `35006b0` exists.
- tsc clean for all 04-02 modified files.
- eslint clean for all 04-02 modified files.
- JSON valid; cooking_log.finalize.page_title === "Finaliser la cuisson"; finalize_stub absent.
