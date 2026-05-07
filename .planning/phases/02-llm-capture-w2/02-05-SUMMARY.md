---
phase: 02
plan: 05
subsystem: frontend
tags: [frontend, draft-card, voice-modify, voice-input, capture-04, capture-05, capture-07]
requires:
  - 02-02 (postRetryPromotion + postVoiceModify endpoints)
  - 02-03 (Phase 2 i18n strings + typed API helpers)
  - 02-01 (promotion_error / promotion_attempts model columns)
provides:
  - 3-variant RecipeDraftCard (manual / processing / failed)
  - VoiceModifySheet bottom-sheet (textarea-only)
  - sessionStorage prefill bridge between voice-modify and edit form
  - Generic VoiceInput wrapper for Phase 4 cooking-log notes (CAPTURE-07)
affects:
  - frontend/components/RecipeDraftCard.tsx (rewritten)
  - frontend/lib/recipes.ts (Recipe type extended)
  - backend/app/schemas/recipe.py (RecipeResponse extended defensively)
  - frontend/app/recipes/[id]/page.tsx (mic button + sheet mount)
  - frontend/app/recipes/[id]/edit/page.tsx (sessionStorage prefill consumption)
tech-stack:
  added:
    - sonner (already installed) — toast on retry-promotion network failure
  patterns:
    - sessionStorage as ephemeral one-shot state bridge between two routes
    - Variant selection via boolean derivations from server fields (no extra column)
    - Reset-on-close via the Sheet's onOpenChange callback (avoids cascading-render lint)
key-files:
  created:
    - frontend/components/VoiceModifySheet.tsx
    - frontend/components/VoiceInput.tsx
  modified:
    - frontend/components/RecipeDraftCard.tsx
    - frontend/lib/recipes.ts
    - backend/app/schemas/recipe.py
    - frontend/app/recipes/[id]/page.tsx
    - frontend/app/recipes/[id]/edit/page.tsx
decisions:
  - Use root next-intl translator + dotted keys in VoiceInput so callers can pass any namespace key
  - Reset textarea on close via onOpenChange wrapper, not useEffect (lint rule react-hooks/set-state-in-effect)
  - Defensively add promotion_error / promotion_attempts to backend RecipeResponse (Plan 02-01 owned the columns; this plan needs them on the wire)
metrics:
  duration: ~50min
  completed: 2026-05-07
  tasks: 3
  commits: 3
  files_changed: 7
requirements:
  - CAPTURE-04
  - CAPTURE-05
  - CAPTURE-07
---

# Phase 2 Plan 05: Draft Card Variants, Voice-Modify Sheet, and CAPTURE-07 Framework Summary

Closed the Phase 2 frontend loop: RecipeDraftCard now picks a manual / processing / failed variant from the recipe's status + promotion telemetry; the recipe detail page has a Mic icon that opens a bottom sheet whose textarea body becomes a Gemini voice-modify prompt; the resulting `GeminiExtractedRecipe` is bridged through sessionStorage into a pre-filled edit form. A generic VoiceInput wrapper ships as the CAPTURE-07 framework for Phase 4 cooking-log notes — entirely textarea-based, NO Web Speech API anywhere in the plan.

## What Was Built

### Task 1 — RecipeDraftCard 3-variant rewrite (commit `7e2455f`)

The drafts inbox row now branches on three boolean derivations:

```ts
const captureType = recipe.source_capture?.type;
const isProcessing =
  recipe.status === "draft" &&
  recipe.promotion_error == null &&
  captureType !== "manual" &&
  captureType !== "url";
const isFailed = recipe.promotion_error != null;
const isManual = !isProcessing && !isFailed;
```

| Variant     | Trigger                                                                  | Render                                                                              |
| ----------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Manual      | Quick-add (`source_capture.type === "manual"`) OR URL drafts             | `<Badge variant="secondary">Brouillon</Badge>` inside `<Link>` to `/edit`           |
| Processing  | `status === "draft"` AND `promotion_error == null` AND voice/photo source | `<Loader2 spin />` + "Extraction en cours…" inside `<div>` (NOT `<Link>`) — non-tappable |
| Failed      | `promotion_error != null`                                                 | `<Badge variant="destructive">Échec</Badge>` + Réessayer ghost button                |

URL drafts (CAPTURE-03) intentionally render as `manual` — they are user-completed, not Gemini-promoted, so they belong in the inbox as completable brouillons.

The Réessayer button uses `event.preventDefault()` + `event.stopPropagation()` so its click doesn't bubble to the parent `<Link>`. After `postRetryPromotion(recipe.id)` resolves, the `retrying` state stays `true` — the row will swap to the processing variant on the next refetch / websocket frame, which is the correct visual.

Recipe wire model and backend RecipeResponse both gained:

```ts
promotion_error?: string | null;
promotion_attempts?: number;
```

### Task 2 — VoiceModifySheet + recipe-detail trigger + edit prefill (commit `36b36e8`)

`VoiceModifySheet.tsx` (new, 120 lines):

- Bottom-sheet (Radix Sheet `side="bottom"`) with a single `<Textarea>` body.
- NO Web Speech API. iOS keyboard mic is the dictation mechanism (works in any text field, even in PWA standalone mode).
- Submit → `postVoiceModify(recipeId, transcript.trim())` → `sessionStorage.setItem("voice-modify-prefill", JSON.stringify(result))` → close sheet → `router.push(\`/recipes/${recipeId}/edit\`)`.
- Reset textarea on close via wrapped `handleOpenChange` callback (avoids `react-hooks/set-state-in-effect` lint rule that fires on the more-obvious `useEffect([open])` form).

Recipe detail page (`app/recipes/[id]/page.tsx`):

- Adds Mic icon button between the back button and the edit pencil (right-side button group with `gap-1`).
- New state: `voiceModifyOpen` + setter.
- VoiceModifySheet mounted as a sibling of `<section>` so the textarea state survives across opens.

Edit page (`app/recipes/[id]/edit/page.tsx`):

- New `readPrefill()` helper: guards on `typeof window`, reads `sessionStorage.getItem("voice-modify-prefill")`, **immediately removes** the entry, then attempts `JSON.parse` inside try/catch (T-02-05-01: corrupt or forged JSON falls back to no prefill).
- Recipe-load `useEffect` calls `readPrefill()` once at the top, then merges:
  ```ts
  const merged = prefill
    ? { ...r, ...prefill, mood: prefill.mood ?? r.mood, seasonality: prefill.seasonality ?? r.seasonality }
    : r;
  setInitial(recipeToFormValues(merged));
  ```
  The mood/seasonality null-coalescing preserves Gemini's intent: an explicit empty array from prefill survives, but `null`/`undefined` falls back to the recipe's value.

Refresh ⇒ no re-application of the prefill (one-shot consumption — D-11 explicit: no diff UI in v0.1).

### Task 3 — VoiceInput generic textarea wrapper (commit `6db3882`)

`VoiceInput.tsx` (new, 54 lines):

```tsx
<VoiceInput
  value={notes}
  onChange={setNotes}
  placeholderKey="cooking_log.voice_input.placeholder"  // default
  ariaLabelKey="cooking_log.voice_input.aria_label"      // default
  rows={4}
/>
```

- Defaults point at the cooking-log namespace; Phase 4 can drop it in with zero props beyond `value`/`onChange`.
- Uses **root next-intl translator** + dotted-key resolution rather than splitting namespace + leaf at runtime. This keeps the component a pure passthrough and lets callers reuse it for any "user dictates or types" surface (e.g. `recipes.voice.transcript_placeholder`).
- The component file is framework-only — Phase 2 does not mount it anywhere; Phase 4 wires it into the cooking-log finalize screen for CAPTURE-07.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Lint] react-hooks/set-state-in-effect on VoiceModifySheet open-reset**

- **Found during:** Task 2, after first lint pass
- **Issue:** `useEffect(() => { if (!open) { setTranscript(""); setSubmitting(false); } }, [open])` triggered the new `react-hooks/set-state-in-effect` rule (cascading renders).
- **Fix:** Replaced with an `handleOpenChange` callback wrapping the parent `onOpenChange`. State reset now runs synchronously when the Sheet's `onOpenChange(false)` fires, with no useEffect.
- **Files modified:** `frontend/components/VoiceModifySheet.tsx`
- **Commit:** `36b36e8`

### Plan-driven divergences

- The plan offered two equivalent forms for VoiceInput's i18n key resolution: a `useTranslationKey` helper that splits namespace + leaf, OR a root-translator `t(dottedKey)` form. I chose the latter (simpler, no helper hook, no per-call namespace splitting). Both pass the documented contract.
- Plan suggested `setRetrying(false)` after a successful retry-promotion was unnecessary because the websocket frame would update the row. Implemented as written: success path leaves `retrying=true` so the button stays disabled until refetch.

## Auth Gates

None. Task 2 calls `/api/recipes/{id}/voice-modify` and `/api/recipes/{id}/retry-promotion` via the existing typed helpers; both inherit cookie-auth from `lib/api.ts`. No new auth scheme touched.

## Known Stubs

None. Every component file in this plan is wired to a real endpoint or a real consumer (VoiceInput's consumer is Phase 4, but the type contract is locked and exported, so Phase 4 can import without modification).

## sessionStorage Contract (for downstream consumers)

| Key                     | Type                       | Lifetime                       | Producer                | Consumer                    |
| ----------------------- | -------------------------- | ------------------------------ | ----------------------- | --------------------------- |
| `voice-modify-prefill`  | JSON-serialized `GeminiExtractedRecipe` | Set on submit, cleared on `/edit` mount | `VoiceModifySheet.tsx`  | `app/recipes/[id]/edit/page.tsx` |

Shape:

```ts
export type GeminiExtractedRecipe = {
  title: string;
  ingredients?: { name: string; quantity?: number | null; unit?: string | null }[] | null;
  steps?: string[] | null;
  prep_time_minutes?: number | null;
  servings?: number | null;
  cuisine?: string | null;
  mood: string[];
  main_protein?: string | null;
  seasonality: string[];
};
```

## VoiceInput Prop Contract (for Phase 4)

```ts
type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholderKey?: string;   // default "cooking_log.voice_input.placeholder"
  ariaLabelKey?: string;     // default "cooking_log.voice_input.aria_label"
  className?: string;
  disabled?: boolean;
  rows?: number;             // default 4
};
```

Phase 4's cooking-log finalize screen imports `{ VoiceInput }` from `@/components/VoiceInput` and binds it to the notes field. No Phase 2-side change required.

## Verification

- `npx tsc --noEmit` — clean
- `npm run lint` — clean (one fix-up landed mid-task; see Deviations)
- `npm run build` — clean (pages build, env warning is the unset RAILWAY_URL fallback, unrelated)
- `grep -r "SpeechRecognition\|webkitSpeechRecognition\|MediaRecorder\|navigator.mediaDevices" frontend --exclude-dir=node_modules --exclude-dir=.next` — zero matches
- All acceptance-criteria greps pass for all 3 tasks

## Self-Check: PASSED

- frontend/components/RecipeDraftCard.tsx — exists, modified
- frontend/components/VoiceModifySheet.tsx — exists, created
- frontend/components/VoiceInput.tsx — exists, created
- frontend/app/recipes/[id]/page.tsx — exists, modified
- frontend/app/recipes/[id]/edit/page.tsx — exists, modified
- frontend/lib/recipes.ts — exists, Recipe type extended
- backend/app/schemas/recipe.py — exists, RecipeResponse extended

Commits in scope:

- `7e2455f` feat(02-05): extend RecipeDraftCard with processing + failed variants
- `36b36e8` feat(02-05): voice-modify sheet + recipe-detail trigger + edit prefill
- `6db3882` feat(02-05): generic VoiceInput textarea wrapper for CAPTURE-07
