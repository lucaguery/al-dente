---
phase: 02
plan: 04
subsystem: frontend-capture-tabs
tags: [frontend, capture, tabs, ui, w2]
requires:
  - 02-02 (backend capture endpoints: /api/recipes/voice|photo|url)
  - 02-03 (frontend foundations: postVoiceCapture, postPhotoCapture, postUrlCapture, recipes.voice|photo|url i18n keys)
provides:
  - 5-tab /recipes/new capture surface (Rapide / Complète / Voix / Photo / URL)
  - VoiceCaptureTab — textarea-only voice capture (no Web Speech API)
  - PhotoCaptureTab — photo-as-recipe-source with 4-photo + 18 MB caps
  - UrlCaptureTab — URL paste with client-side scheme validation
affects:
  - frontend/app/recipes/new/page.tsx (extended from 2 → 5 tabs)
tech-stack:
  added: []
  patterns:
    - "useMemo + useEffect cleanup for object-URL lifecycle (React 19 set-state-in-effect compliance)"
    - "Sheet-driven Camera/Photothèque file picker (mirrors PhotoUploader)"
    - "Client-side validation as cost-amplification gate before backend round-trip"
key-files:
  created:
    - frontend/components/VoiceCaptureTab.tsx
    - frontend/components/UrlCaptureTab.tsx
    - frontend/components/PhotoCaptureTab.tsx
  modified:
    - frontend/app/recipes/new/page.tsx
decisions:
  - "Voix tab is TEXTAREA-ONLY (D-Voice) — Web Speech API explicitly avoided per Phase 2 critical decision (broken in iOS PWA standalone)"
  - "PhotoCaptureTab does NOT reuse PhotoUploader.tsx — that component requires a recipeId for signed-URL refresh; here the photo IS the recipe source so we hold File[] locally and post the bundle"
  - "router.replace('/inbox') (not '/recipes') on success for all three new surfaces — user needs to see the spinner card while Gemini extraction runs in BackgroundTask"
  - "Object URLs derived via useMemo (not useState+useEffect) to satisfy React 19's react-hooks/set-state-in-effect lint rule"
metrics:
  duration: ~30min
  completed_date: 2026-05-07
  files_created: 3
  files_modified: 1
  total_lines_added: 277
---

# Phase 02 Plan 04: 5-tab capture page Summary

Wired three new capture surfaces (Voix / Photo / URL) onto the existing `/recipes/new` page, keeping the locked tab order Rapide → Complète → Voix → Photo → URL. The Voix tab is intentionally a textarea — there is no Web Speech API anywhere — because Phase 2 research confirmed iOS PWA standalone mode silently breaks `SpeechRecognition` after Add-to-Home-Screen.

## Tab order and value strings

The five `<TabsTrigger>` entries in `frontend/app/recipes/new/page.tsx` render in this exact JSX order:

| # | `value`  | Label source                       | French label             |
|---|----------|------------------------------------|--------------------------|
| 1 | `quick`  | `recipes.new.tab_quick`            | Rapide                   |
| 2 | `full`   | `recipes.new.tab_full`             | Complète                 |
| 3 | `voice`  | `recipes.voice.tab_label`          | Voix                     |
| 4 | `photo`  | `recipes.photo.tab_label`          | Photo                    |
| 5 | `url`    | `recipes.url.tab_label`            | URL                      |

The default active tab remains `quick` (preserves Phase 1 behavior). `TabsList` got `overflow-x-auto scrollbar-none flex` + `min-w-[64px]` per trigger to handle the iPhone SE 375pt-class screen (UI-SPEC §Spacing exceptions).

## Voice tab — Web Speech API decision honored

`frontend/components/VoiceCaptureTab.tsx` (104 lines):

- **Surface:** `<Textarea>` with placeholder `recipes.voice.transcript_placeholder` ("Dictez via le clavier 🎤 ou tapez votre recette…"), `aria-label` from `transcript_aria`, plus a button row with `Recommencer` (variant ghost, clears local state) and `Envoyer` (variant default, posts).
- **Submit path:** `postVoiceCapture(trimmed)` from `@/lib/recipes` → toast.success(`submitted_toast`) → `router.replace("/inbox")`.
- **Empty submit guard:** trimmed transcript empty → toast.error with `empty_transcript`.
- **Error path:** any failure → toast.error with `onboarding.errors.network` + `setSubmitting(false)`.
- **Forbidden symbols verified absent:** `SpeechRecognition`, `webkitSpeechRecognition`, `MediaRecorder`, `audio/webm`, `navigator.mediaDevices` — none of these strings appear in the file (verified via grep). The iOS keyboard mic affordance is OS-level and works on any text field with zero JS, which is the whole reason for this decision.

## Photo tab — divergence from PhotoUploader

`frontend/components/PhotoCaptureTab.tsx` (236 lines):

- **Why a separate component:** `PhotoUploader.tsx` (Plan 01-11) is parameterized by `recipeId` and refreshes signed URLs via `getSignedPhotoUrl(recipeId, path)`. The photo capture surface has no recipeId yet — the photo IS the recipe source. Files live in local `File[]` state and are POSTed as a bundle to `/api/recipes/photo` via `postPhotoCapture(files)`.
- **2x2 grid:** filled tile (24x24 with `<img>` + X overlay) / add tile (Plus icon, opens Sheet) / locked tile (invisible spacer for grid stability) — matches `PhotoUploader` slot construction.
- **Sheet picker:** `Camera` button (file input with `accept="image/*"` + `capture="environment"`) and `Photothèque` button (file input without `capture`).
- **Caps enforced client-side:**
  - `MAX_PHOTOS = 4` → toast.error with `photo_uploader.error_limit` if exceeded.
  - `TOTAL_BYTES_CAP = 18 * 1024 * 1024` → toast.error with `recipes.photo.error_size_total` if cumulative-after-add exceeds (matches backend `GEMINI_PHOTO_TOTAL_BYTES_CAP`).
- **Backend 413 handling:** `postPhotoCapture` throws `Error("413")` on backend rejection; we map that to `recipes.photo.error_size_total` (same toast as the client-side cap) so the user sees a single coherent error.
- **Object URL lifecycle (T-02-04-01):** previews derived via `useMemo` from `files`; cleanup `useEffect` revokes each URL when files change or component unmounts. We initially used `useState + useEffect` to set previews but React 19's `react-hooks/set-state-in-effect` lint rule rejects that — switched to the useMemo pattern.

## URL tab — paste-and-validate

`frontend/components/UrlCaptureTab.tsx` (105 lines):

- **Validation:** `useMemo` runs `new URL(value)` inside try/catch and accepts only `http:` / `https:` schemes. Inline error `recipes.url.invalid` shows after `onBlur` on the input, so the error doesn't flash mid-typing.
- **Helper notice:** `<Info size={16} />` icon + `t("helper")` rendered verbatim per the plan ("L'extraction automatique arrive bientôt — tu pourras compléter les détails dans la boîte de réception."). Sets correct user expectation: no Gemini scrape in v0.1.
- **Submit:** `postUrlCapture(value.trim())` → toast.success → `router.replace("/inbox")`.
- **T-02-04-03 mitigation:** client validates scheme; backend re-validates with stricter rules and returns 422 if anything slips through.

## router.replace("/inbox") choice

All three new surfaces route to `/inbox` (NOT `/recipes` and NOT `/recipes/{id}`) on successful POST because:

1. The backend returns a `draft` immediately and queues Gemini extraction in a `BackgroundTask`.
2. `/inbox` is where Plan 05's `RecipeDraftCard` will render the "extraction en cours…" spinner card and flip to `structured` via the `recipe.promoted` WebSocket event.
3. Routing to `/recipes/{id}` would land the user on a sparse draft view; they'd then have to navigate back. `/inbox` is the correct staging surface for the spin-up window.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] React 19 set-state-in-effect lint error in PhotoCaptureTab**
- **Found during:** Task 2
- **Issue:** Initial implementation used `useState<string[]>` for `previews` plus a `useEffect` that called `setPreviews(...)` and revoked URLs on cleanup. React 19's `react-hooks/set-state-in-effect` lint rule fails on `setPreviews` inside the effect.
- **Fix:** Replaced the state with `useMemo(() => files.map(URL.createObjectURL), [files])` and kept a separate cleanup `useEffect` that revokes each URL when `previews` changes or component unmounts. Same lifecycle, no setState in effect.
- **Files modified:** `frontend/components/PhotoCaptureTab.tsx`
- **Commit:** `0df8410`

No other deviations — Rapide and Complète tabs were not touched (D-02 honored). All user-facing strings come from `useTranslations` (PWA-04). No Web Speech API symbols anywhere.

## Threat Surface Scan

No new trust-boundary surface beyond what's documented in the plan's `<threat_model>`. The three POST paths (`/api/recipes/voice`, `/api/recipes/photo`, `/api/recipes/url`) were created by Plan 02 and re-used here via Plan 03's typed helpers; they all use `credentials: "include"` and the Vercel rewrite, matching Phase 01.1 cookie auth.

## Self-Check: PASSED

Files exist:
- FOUND: `frontend/components/VoiceCaptureTab.tsx` (104 lines, exceeds 60-line minimum)
- FOUND: `frontend/components/UrlCaptureTab.tsx` (105 lines, exceeds 50-line minimum)
- FOUND: `frontend/components/PhotoCaptureTab.tsx` (236 lines, exceeds 80-line minimum)
- FOUND: `frontend/app/recipes/new/page.tsx` (245 lines, was 219)

Commits exist (verified via `git log --oneline 32c96342..HEAD`):
- FOUND: `c588975` — feat(02-04): add VoiceCaptureTab and UrlCaptureTab components
- FOUND: `0df8410` — feat(02-04): add PhotoCaptureTab with 4-photo + 18 MB caps
- FOUND: `1db43bd` — feat(02-04): extend /recipes/new to 5 tabs in locked order

Verification gates:
- `npx tsc --noEmit` exits 0
- `npm run lint` exits 0
- `npm run build` succeeds (all 13 routes prerendered)
- `grep -c '<TabsTrigger' app/recipes/new/page.tsx` = 5
- `grep -c '<TabsContent' app/recipes/new/page.tsx` = 5
- No forbidden symbols (`SpeechRecognition` / `webkitSpeechRecognition` / `MediaRecorder` / `audio/webm` / `navigator.mediaDevices`) in any of the four files
