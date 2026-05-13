---
phase: 27
plan: "02"
subsystem: frontend/components/RecipeThread
tags: [chat-ui, capture, realtime, i18n, framer-motion, shadcn]
dependency_graph:
  requires:
    - frontend/lib/enums.ts (TurnKind / TurnSender)
    - frontend/lib/motion.ts (variants, transitions)
    - frontend/components/ui/sheet.tsx
    - frontend/components/ui/button.tsx
    - frontend/components/ui/textarea.tsx
    - frontend/components/ui/input.tsx
    - frontend/components/ui/card.tsx
    - frontend/lib/i18n/fr.json (recipes.thread.* namespace added by this plan)
  provides:
    - frontend/components/RecipeThread/index.tsx — RecipeThread orchestrator (capture + detail modes)
    - frontend/components/RecipeThread/types.ts — PendingBubble, PersistedTurn, RecipeThreadProps, ComposerProps
    - frontend/components/RecipeThread/Bubble.tsx — user turn renderer
    - frontend/components/RecipeThread/SystemBubble.tsx — system turn renderer (visual stubs)
    - frontend/components/RecipeThread/Composer.tsx — 3-slot composer with D-04 morph
    - frontend/components/RecipeThread/VoiceSheet.tsx — D-Voice textarea sheet
    - frontend/components/RecipeThread/UrlSheet.tsx — URL validation sheet
    - frontend/components/RecipeThread/PhotoMenu.tsx — camera/library/url menu
  affects:
    - Plan 27-03 (mounts RecipeThread on /recipes/new in capture mode)
    - Plan 27-05 (mounts RecipeThread on /recipes/[id] in detail mode)
    - Phase 28 (wires question chip/stepper handlers + advisory CTAs in the stub buttons)
tech_stack:
  added: []
  patterns:
    - Discriminated union on `mode` prop for capture/detail split (CAPTURE-04)
    - AnimatePresence popLayout for bubble append/dismiss animations
    - D-Voice textarea pattern (no MediaRecorder — iOS PWA constraint)
    - new URL(v).protocol http/https validation (mirrors UrlCaptureTab)
    - Hidden file inputs with capture="environment" for iOS back-camera
key_files:
  created:
    - frontend/components/RecipeThread/types.ts (104 lines)
    - frontend/components/RecipeThread/index.tsx (351 lines)
    - frontend/components/RecipeThread/Bubble.tsx (264 lines)
    - frontend/components/RecipeThread/SystemBubble.tsx (220 lines)
    - frontend/components/RecipeThread/Composer.tsx (162 lines)
    - frontend/components/RecipeThread/VoiceSheet.tsx (88 lines)
    - frontend/components/RecipeThread/UrlSheet.tsx (94 lines)
    - frontend/components/RecipeThread/PhotoMenu.tsx (121 lines)
  modified:
    - frontend/lib/i18n/fr.json (added recipes.thread.* namespace — 40 keys)
decisions:
  - "JSX.Element replaced with React.JSX.Element — React 19 removed the global JSX namespace (Rule 1 auto-fix)"
  - "Bubble.tsx refactored to narrow directly on props.bubble.kind / props.turn.kind rather than extracting kind to a variable — TypeScript discriminated union narrowing requires the property access to be on the same expression as the type guard (Rule 1 auto-fix)"
metrics:
  duration: "~45 minutes"
  completed: "2026-05-13"
  tasks: 3
  files_created: 8
  files_modified: 1
  i18n_keys_added: 40
---

# Phase 27 Plan 02: RecipeThread Component Directory Summary

**One-liner:** Props-driven chat thread component with capture/detail mode discriminated union, user bubble kinds (text/voice/photo/url), system bubble visual stubs (summary/question/advisory), D-04 mic↔send morph composer, D-Voice textarea sheet, and 40 French i18n keys under `recipes.thread.*`.

---

## Component Directory Structure

| File | Lines | Role |
|------|-------|------|
| `types.ts` | 104 | PendingBubble discriminated union + RecipeThreadProps + ComposerProps |
| `index.tsx` | 351 | Orchestrator: chat-body / save-bar / thread-meta / manual-link, layout switching on `mode` |
| `Bubble.tsx` | 264 | User turn renderer (text/voice/photo/url/answer kinds + pending X dismiss) |
| `SystemBubble.tsx` | 220 | System turn renderer (summary/question/advisory — VISUAL STUBS, no onClick) |
| `Composer.tsx` | 162 | 3-slot composer: [+] [textarea] [mic-or-send] with D-04 AnimatePresence morph |
| `VoiceSheet.tsx` | 88 | D-Voice bottom sheet (paper-grain card + autoFocus textarea, no MediaRecorder) |
| `UrlSheet.tsx` | 94 | URL input sheet with `new URL(v).protocol` http/https validation |
| `PhotoMenu.tsx` | 121 | Camera / library / URL bottom-sheet menu with hidden file inputs |

**Total: 1,404 lines across 8 new files + 40 i18n keys added to fr.json.**

---

## Props Discriminated Union Shape

The `RecipeThreadProps` type is a discriminated union on `mode`:

**Capture mode** (`mode="capture"`, `recipeId=null`):
- Receives: `pendingBubbles`, `photoTotalBytes`, `saving`, callbacks: `onAddPendingBubble`, `onDismissPendingBubble`, `onSave`
- Shows: save-bar (when `pendingBubbles.length >= 1`), empty-state hint, pending bubble list
- Hides: thread-meta strip, manual-edit link

**Detail mode** (`mode="detail"`, `recipeId=string`):
- Receives: `turns`, `title`, `recipeStatus`, callbacks: `onPostTextTurn`, `onPostVoiceTurn`, `onPostUrlTurn`, `onPostPhotoTurn`, `onManualEditLinkClick`
- Shows: thread-meta strip (state pill + title), extraction-in-progress row when `recipeStatus === "draft"`, manual-edit link
- Hides: save-bar

The `?: never` markers on cross-mode fields keep the discriminator tight so Phase 28 callback additions cannot accidentally leak between modes.

---

## STUB Inventory (Phase 28 wires these)

| Component | Stub element | Phase 28 target |
|-----------|-------------|-----------------|
| `SystemBubble` | `question` chip `<button>` elements | Phase 28 DETAIL-02 — wire `onClick` → POST `kind='answer'` |
| `SystemBubble` | `question` stepper `+`/`−` buttons (rendered `disabled`) | Phase 28 DETAIL-02 — wire `onClick` + value state |
| `SystemBubble` | `question` text `<input>` (rendered `disabled`) | Phase 28 DETAIL-02 — wire `onChange` + submit |
| `SystemBubble` | `summary` primary CTA « Oui, compléter » | Phase 28 — wire `onClick` for chip-driven completion |
| `SystemBubble` | `summary` ghost CTA « Plus tard » | Phase 28 — wire `onClick` |
| `SystemBubble` | `advisory` primary CTA « Mettre à jour » | Phase 28 DETAIL-03 — wire `onClick` → POST `proposal_accepted` |
| `SystemBubble` | `advisory` ghost CTA « Ignorer la suggestion » | Phase 28 DETAIL-03 — wire `onClick` → POST `proposal_dismissed` |

All stub buttons have no `onClick` handler in Phase 27 — the JSX structure is the Phase 28 attachment point. Comments in the file reference the exact Phase 28 task (DETAIL-02, DETAIL-03).

---

## i18n Keys Added

**40 keys** added under `recipes.thread.*` in `frontend/lib/i18n/fr.json`. Covers:

- Composer placeholders (capture + detail modes)
- Save bar CTA + count badge
- Extraction-in-progress row + draft title placeholder
- Manual-edit anchor link
- + menu items (camera, library, URL)
- VoiceSheet (title, D-Voice helper, placeholder, add/restart)
- UrlSheet (title, placeholder, add, invalid error)
- Bubble dismiss aria-label + bubble count plural
- System bubble headers (summary, advisory)
- Advisory / summary CTA labels (stubs)
- Progress chips (capture + question)
- State pill labels (structured, draft, failed)
- Discard confirmation + CTA
- Photo cap exceeded toast
- Network error toast
- Empty capture hint
- Mic / send aria-labels

---

## Files Touched

**Created (8):**
- `frontend/components/RecipeThread/types.ts`
- `frontend/components/RecipeThread/index.tsx`
- `frontend/components/RecipeThread/Bubble.tsx`
- `frontend/components/RecipeThread/SystemBubble.tsx`
- `frontend/components/RecipeThread/Composer.tsx`
- `frontend/components/RecipeThread/VoiceSheet.tsx`
- `frontend/components/RecipeThread/UrlSheet.tsx`
- `frontend/components/RecipeThread/PhotoMenu.tsx`

**Modified (1):**
- `frontend/lib/i18n/fr.json` — added `recipes.thread` namespace with 40 keys

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] React 19 JSX namespace**
- **Found during:** Task 2 TypeScript check
- **Issue:** `JSX.Element` return type caused `TS2503 Cannot find namespace 'JSX'` — React 19 removed the global JSX namespace; components must use `React.JSX.Element`
- **Fix:** Added `import type React from "react"` and changed return types to `React.JSX.Element | null` in `Bubble.tsx` and `SystemBubble.tsx`
- **Files modified:** `Bubble.tsx`, `SystemBubble.tsx`
- **Commits:** `0534892`

**2. [Rule 1 - Bug] TypeScript discriminated union narrowing in Bubble.tsx**
- **Found during:** Task 2 TypeScript check
- **Issue:** `TS2339 Property 'text' does not exist on type 'PendingBubble'` — extracting `kind` to a separate variable loses TypeScript's discriminated union narrowing on `props.bubble`
- **Fix:** Refactored `Bubble` to narrow directly on `props.bubble.kind` / `props.turn.kind` within each branch, using a `PendingBubbleContent` sub-component to eliminate code duplication
- **Files modified:** `Bubble.tsx`
- **Commits:** `0534892`

---

## Known Stubs

These stubs are intentional per CONTEXT.md D-14 and the plan's explicit scope boundary. They are not data-flow stubs (no empty arrays/objects returned to UI) — they are interactive stub buttons that render correctly but have no `onClick` handler.

| Location | Stub type | Phase to resolve |
|----------|-----------|-----------------|
| `SystemBubble.tsx` L76-83 | summary CTAs (no onClick) | Phase 28 |
| `SystemBubble.tsx` L104-113 | question chip buttons (no onClick) | Phase 28 DETAIL-02 |
| `SystemBubble.tsx` L117-141 | question stepper +/− (disabled) | Phase 28 DETAIL-02 |
| `SystemBubble.tsx` L143-151 | question text input (disabled) | Phase 28 DETAIL-02 |
| `SystemBubble.tsx` L184-192 | advisory CTAs (no onClick) | Phase 28 DETAIL-03 |

---

## Self-Check: PASSED

All 8 component files exist at `frontend/components/RecipeThread/`. All 4 commits verified in git log. SUMMARY.md created at `.planning/phases/27-conversational-capture-screen/27-02-SUMMARY.md`.
