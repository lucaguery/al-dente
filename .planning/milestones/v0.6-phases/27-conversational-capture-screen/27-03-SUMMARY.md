---
phase: 27
plan: "03"
subsystem: frontend/app/recipes/new
tags: [capture, chat-ui, demolition, i18n, save-flow, CAPTURE-01, CAPTURE-02, CAPTURE-03]
dependency_graph:
  requires:
    - frontend/lib/recipes.ts (createBlankRecipe + promoteDraft — Plan 27-01)
    - frontend/components/RecipeThread/index.tsx — Plan 27-02 orchestrator
    - frontend/components/RecipeThread/types.ts — PendingBubble discriminated union
    - frontend/lib/api.ts (api() helper — HttpOnly cookie auth)
    - frontend/lib/onboarding-guard.tsx
  provides:
    - frontend/app/recipes/new/page.tsx — rewritten conversational capture entry point
  affects:
    - Plan 27-04 (BottomNav still references /inbox — Plan 27-04 removes it)
    - Plan 27-05 (mounts RecipeThread on /recipes/[id] in detail mode)
tech_stack:
  added: []
  patterns:
    - createBlankRecipe -> for-each-turn-POST -> promoteDraft -> router.replace (D-12 + D-13b)
    - Sequential for-of awaits for deterministic turn ordering (Phase 26 D-18)
    - Multipart fetch with credentials: include for photo turns (Phase 26 D-01 precedent)
    - window.confirm discard guard (UI-SPEC Claude's Discretion resolution)
    - URL.revokeObjectURL on dismiss + useEffect unmount (T-27-03-05)
    - 18 MB / 4-photo cap enforced in addPendingBubble before state update
key_files:
  created: []
  deleted:
    - frontend/components/VoiceCaptureTab.tsx
    - frontend/components/PhotoCaptureTab.tsx
    - frontend/components/UrlCaptureTab.tsx
    - frontend/components/RecipeDraftCard.tsx
    - frontend/app/inbox/page.tsx
  modified:
    - frontend/app/recipes/new/page.tsx (rewritten — 233 lines)
    - frontend/lib/i18n/fr.json (pruned legacy keys, preserved voice_modify + voice.transcript_*)
    - frontend/lib/recipes.ts (restored createBlankRecipe + promoteDraft from Plan 27-01 — worktree base recovery)
decisions:
  - "recipes.new.tab_title kept (value: Nouvelle recette) — only tab_quick/tab_full were pruned"
  - "recipes.voice.transcript_placeholder + transcript_aria kept — VoiceModifySheet.tsx uses them"
  - "recipes.photo and recipes.url blocks emptied (all their keys deleted) — no other consumers post-deletion"
  - "lib/recipes.ts restored from commit 419e730 — worktree was checked out before Wave 1 merge, missing createBlankRecipe + promoteDraft"
metrics:
  duration: "~35 minutes"
  completed: "2026-05-13"
  tasks: 2
  files_created: 0
  files_deleted: 5
  files_modified: 3
  i18n_keys_pruned: 20+
---

# Phase 27 Plan 03: Demolition + Wiring Summary

**One-liner:** Deleted the five legacy tabbed capture surfaces + /inbox route, pruned 20+ obsolete i18n keys, and rewired `/recipes/new` to a 233-line conversational page mounting `<RecipeThread mode="capture" />` with the full 4-step save-flow choreography.

---

## Files Deleted (5 + 1 route)

| File | Reason |
|------|--------|
| `frontend/components/VoiceCaptureTab.tsx` | Internalized into `RecipeThread/VoiceSheet.tsx` (Plan 27-02) |
| `frontend/components/PhotoCaptureTab.tsx` | Internalized into `RecipeThread/PhotoMenu.tsx` (Plan 27-02) |
| `frontend/components/UrlCaptureTab.tsx` | Internalized into `RecipeThread/UrlSheet.tsx` (Plan 27-02) |
| `frontend/components/RecipeDraftCard.tsx` | /inbox route deleted (D-09); card has no more consumers |
| `frontend/app/inbox/page.tsx` | D-09 clean drop — no separate drafts surface in v0.6 |

`frontend/app/inbox/` directory removed (empty after page.tsx deletion).

---

## i18n Keys Pruned

Removed from `frontend/lib/i18n/fr.json`:

| Namespace | Keys deleted |
|-----------|-------------|
| `inbox.*` | `tab_title`, `empty_heading`, `empty_body` (entire block) |
| `nav` | `drafts` |
| `recipes.new` | `tab_quick`, `tab_full` |
| `recipes.voice` | `tab_label`, `idle_helper`, `idle_label`, `recording_label`, `send`, `restart`, `submitted_toast`, `empty_transcript` |
| `recipes.photo` | `tab_label`, `empty_heading`, `empty_body`, `capture`, `submitted_toast`, `error_size_total` |
| `recipes.url` | `tab_label`, `field_label`, `field_placeholder`, `helper`, `submit`, `submitted_toast`, `invalid` |

**Preserved keys (still consumed by detail-page paths):**

- `recipes.voice.transcript_placeholder` — `VoiceModifySheet.tsx` line 84
- `recipes.voice.transcript_aria` — `VoiceModifySheet.tsx` line 83
- `recipes.voice_modify.*` — entire block (detail-page voice-modify path, D-15)
- `recipes.new.tab_title` — used by the rewritten `/recipes/new` page header

---

## /recipes/new/page.tsx — New Shape

**233 lines.** Key sections:

| Section | Description |
|---------|-------------|
| `RecipeNewPage` | `OnboardingGuard` wrapper → `Inner` |
| `Inner` state | `pendingBubbles: PendingBubble[]`, `saving: boolean`, derived `photoTotalBytes`, `photoCount` |
| `addPendingBubble` | 18 MB cap + 4-photo max guard before `setPendingBubbles` |
| `dismissPendingBubble` | `URL.revokeObjectURL` on photo bubble removal |
| `useEffect` cleanup | `URL.revokeObjectURL` on unmount for all photo bubbles |
| `onSave` | 4-step save flow (see below) |
| `onBackArrow` | `window.confirm(t("discard_confirm"))` when ≥1 pending bubble |
| JSX | `<section h-[100dvh]>` + sticky header + `<RecipeThread mode="capture" />` |

---

## Save-Flow Choreography (D-12 + D-13b)

1. `const recipe = await createBlankRecipe()` — POST /api/recipes `{}` → draft row, title "Extraction en cours…"
2. `for (const b of pendingBubbles)` — sequential awaits in entry order:
   - `text` → `api(/api/recipes/{id}/turns, { kind: "text", text: b.text })`
   - `voice` → `api(/api/recipes/{id}/turns, { kind: "voice", transcript: b.transcript })`
   - `url` → `api(/api/recipes/{id}/turns, { kind: "url", url: b.url })`
   - `photo` → `fetch(/api/recipes/{id}/turns/photo, { method: "POST", body: FormData, credentials: "include" })`
3. `await promoteDraft(recipe.id)` — POST /api/recipes/{id}/promote → schedules ONE Gemini BackgroundTask
4. `router.replace(\`/recipes/${recipe.id}\`)` — lands on detail page

On any error: `toast.error(t("turn_failed"))` + `setSaving(false)`. Draft + partial turns intact server-side.

---

## Known Temporary Build State

**BottomNav.tsx** still references `/inbox` href and `nav.drafts` i18n key (line 25). This is Plan 27-04's scope. The build is temporarily broken between this plan's commit and Plan 27-04's commit — both are Wave 2 plans that should land within the same execution wave.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Missing prerequisite] lib/recipes.ts missing createBlankRecipe + promoteDraft**
- **Found during:** Task 2 pre-flight
- **Issue:** The worktree was checked out from a commit before `419e730` (Wave 1 merge). `frontend/lib/recipes.ts` did not contain the `createBlankRecipe` and `promoteDraft` helpers added by Plan 27-01. `git reset --soft` only moved HEAD without updating the working tree.
- **Fix:** `git checkout 419e730 -- frontend/lib/recipes.ts` to restore the correct file content from the target base commit. Included in the Task 2 commit.
- **Files modified:** `frontend/lib/recipes.ts`
- **Commit:** `b4dde6a`

---

## Self-Check: PASSED

Files verified:
- `frontend/app/recipes/new/page.tsx` — FOUND (233 lines)
- `frontend/components/VoiceCaptureTab.tsx` — DELETED (confirmed)
- `frontend/components/PhotoCaptureTab.tsx` — DELETED (confirmed)
- `frontend/components/UrlCaptureTab.tsx` — DELETED (confirmed)
- `frontend/components/RecipeDraftCard.tsx` — DELETED (confirmed)
- `frontend/app/inbox/page.tsx` — DELETED (confirmed)
- `frontend/lib/i18n/fr.json` — JSON valid, all pruned keys absent

Commits verified:
- `f80fec7` — Task 1 (deletions + i18n prune)
- `b4dde6a` — Task 2 (page rewrite + lib/recipes.ts restore)
