---
phase: 02
plan: 03
subsystem: frontend-foundations
tags: [frontend, realtime, i18n, api-helpers]
requirements_completed:
  - CAPTURE-04
dependency_graph:
  requires:
    - "frontend/lib/api.ts (api() wrapper, Phase 01.1 D-01 rewrite path)"
    - "frontend/lib/ws.ts (RealtimeClient interface, onEvent signature)"
    - "frontend/components/SessionProvider (auth status gate)"
  provides:
    - "frontend/lib/i18n/fr.json — Phase 2 user-facing strings (voice, photo, url, promotion, voice_modify, cooking_log.voice_input, common.sending)"
    - "frontend/lib/recipes.ts — five typed POST helpers + GeminiExtractedRecipe type"
    - "frontend/components/RealtimeProvider — recipe.promoted toast handler (CAPTURE-04 / D-08)"
  affects:
    - "Plan 02-04 (voice/photo/url surfaces) imports postVoiceCapture/postPhotoCapture/postUrlCapture and useTranslations('recipes.voice'|'recipes.photo'|'recipes.url')"
    - "Plan 02-05 (drafts inbox + voice-modify) imports postVoiceModify/postRetryPromotion and useTranslations('recipes.promotion'|'recipes.voice_modify')"
tech-stack:
  added: []
  patterns:
    - "i18n keys colocated by feature surface under recipes.*"
    - "API helpers always hit /api/* rewrite path (Phase 01.1 D-01); FormData uses raw fetch with credentials: include"
    - "RealtimeProvider owns toast surface; page-level components own list refetch"
key-files:
  created: []
  modified:
    - "frontend/lib/i18n/fr.json"
    - "frontend/lib/recipes.ts"
    - "frontend/components/RealtimeProvider.tsx"
decisions:
  - "Reused recipes.voice.empty_transcript for empty-textarea-on-submit case instead of adding recipes.voice.unsupported / permission_denied (textarea-only revised approach — no SpeechRecognition to fail)"
  - "API_BASE module-level constant for raw fetch (FormData) inside lib/recipes.ts mirrors the pattern in lib/api.ts; reused by postPhotoCapture only"
  - "RealtimeProvider's recipe.promoted effect placed AFTER the reconnect-toast effect, BEFORE the JSX return — own subscription lifecycle, no shared refs with reconnect logic"
metrics:
  duration_seconds: 209
  tasks_completed: 3
  files_modified: 3
  completed_date: "2026-05-07"
---

# Phase 02 Plan 03: Frontend Foundations (i18n + API helpers + recipe.promoted) Summary

Plan owns the shared seam every Phase 2 UI plan imports from: i18n strings, typed API helpers for the five capture endpoints, and the `recipe.promoted` realtime handler that surfaces the promotion toast (D-08). Plans 04 and 05 can now run in parallel without conflicting on `fr.json`.

## What Shipped

### Task 1 — fr.json i18n keys (commit `be10b64`)

Added the following keys, all verbatim from UI-SPEC §"Copywriting Contract":

| UI surface | i18n key | Verbatim French |
|------------|----------|-----------------|
| Common in-flight POST UI | `common.sending` | `Envoi…` |
| Voice tab | `recipes.voice.tab_label` | `Voix` |
| Voice tab | `recipes.voice.idle_helper` | `Dicte ta recette en français. On la met en forme automatiquement.` |
| Voice tab | `recipes.voice.idle_label` | `Appuie pour parler` |
| Voice tab | `recipes.voice.recording_label` | `Appuie pour arrêter` |
| Voice tab | `recipes.voice.send` | `Envoyer` |
| Voice tab | `recipes.voice.restart` | `Recommencer` |
| Voice tab | `recipes.voice.transcript_placeholder` | `Dictez via le clavier 🎤 ou tapez votre recette…` |
| Voice tab | `recipes.voice.transcript_aria` | `Transcription de la recette` |
| Voice tab | `recipes.voice.submitted_toast` | `Recette en cours d'analyse…` |
| Voice tab | `recipes.voice.empty_transcript` | `Aucune parole détectée. Réessaie.` |
| Photo tab | `recipes.photo.tab_label` | `Photo` |
| Photo tab | `recipes.photo.empty_heading` | `Photographie la recette` |
| Photo tab | `recipes.photo.empty_body` | `Ajoute jusqu'à 4 photos. Gemini extrait le titre, les ingrédients et les étapes.` |
| Photo tab | `recipes.photo.capture` | `Capturer la recette` |
| Photo tab | `recipes.photo.submitted_toast` | `Photos envoyées. Extraction en cours…` |
| Photo tab | `recipes.photo.error_size_total` | `Photos trop volumineuses. Limite Gemini : 18 Mo cumulés.` |
| URL tab | `recipes.url.tab_label` | `URL` |
| URL tab | `recipes.url.field_label` | `URL de la recette` |
| URL tab | `recipes.url.field_placeholder` | `https://…` |
| URL tab | `recipes.url.helper` | `L'extraction automatique arrive bientôt — tu pourras compléter les détails dans la boîte de réception.` (D-03 verbatim) |
| URL tab | `recipes.url.submit` | `Ajouter à la boîte de réception` |
| URL tab | `recipes.url.submitted_toast` | `URL ajoutée à la boîte de réception.` |
| URL tab | `recipes.url.invalid` | `URL invalide. Vérifie le format (https://…).` |
| Promotion | `recipes.promotion.in_flight` | `Extraction en cours…` |
| Promotion | `recipes.promotion.failed_badge` | `Échec` |
| Promotion | `recipes.promotion.retry` | `Réessayer` |
| Promotion | `recipes.promotion.retry_aria` | `Réessayer l'extraction` |
| Promotion | `recipes.promotion.success_toast` | `Ta recette « {title} » est prête !` (D-08 verbatim) |
| Voice modify | `recipes.voice_modify.trigger_aria` | `Modifier par la voix` |
| Voice modify | `recipes.voice_modify.sheet_title` | `Modifier par la voix` |
| Voice modify | `recipes.voice_modify.sheet_description` | `Tape ou dicte une modification (ex. « remplace les oignons par des échalotes »).` |
| Voice modify | `recipes.voice_modify.send` | `Envoyer la modification` |
| Voice modify | `recipes.voice_modify.restart` | `Recommencer` |
| Voice modify | `recipes.voice_modify.submitting` | `Modification…` |
| Voice modify | `recipes.voice_modify.failed` | `Modification impossible. Réessaie.` |
| Cooking log voice | `cooking_log.voice_input.aria_label` | `Dicter une note` |
| Cooking log voice | `cooking_log.voice_input.placeholder` | `Dictez via le clavier 🎤 ou tapez votre note…` |

OMITTED per Plan 03 critical decision (textarea-only revised approach):
- `recipes.voice.unsupported` — no `SpeechRecognition` to fail
- `recipes.voice.permission_denied` — no microphone permission gate
- Reuse `recipes.voice.empty_transcript` for the empty-textarea-on-submit case

All previously existing namespaces (`common`, `nav`, `home`, `install`, `realtime`, `enums`, `recipes.{tab_title,…,edit,new}`, `photo_uploader`, `inbox`, `settings`, `onboarding`) preserved verbatim.

### Task 2 — Typed API helpers in `frontend/lib/recipes.ts` (commit `7adc6bb`)

Five new helpers + one new wire type. All exports preserved:

```typescript
// New type
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

// Helpers
export async function postVoiceCapture(transcript: string): Promise<Recipe>
export async function postPhotoCapture(files: File[]): Promise<Recipe>
export async function postUrlCapture(url: string): Promise<Recipe>
export async function postVoiceModify(recipeId: string, transcript: string): Promise<GeminiExtractedRecipe>
export async function postRetryPromotion(recipeId: string): Promise<{ recipe_id: string; queued: boolean }>
```

Endpoint paths (all use the `/api/*` rewrite path, Phase 01.1 D-01):
- `POST /api/recipes/voice` (JSON `{transcript}`)
- `POST /api/recipes/photo` (multipart, field name `files` — plural, matches backend)
- `POST /api/recipes/url` (JSON `{url}`)
- `POST /api/recipes/{id}/voice-modify` (JSON `{transcript}`)
- `POST /api/recipes/{id}/retry-promotion` (no body)

`postPhotoCapture` uses raw `fetch()` (not the `api()` wrapper) because the wrapper sets `Content-Type: application/json` by default and we need the browser to set the multipart boundary. Throws `Error("413")` for size-limit responses so callers can map to `recipes.photo.error_size_total` toast. Other helpers use `api<T>()` which auto-attaches `credentials: "include"` for the `aldente_auth` HttpOnly cookie.

Existing exports (`IngredientItem`, `Recipe`, `Member`, `getSignedPhotoUrl`) untouched. Total exports: 10 (4 existing + 5 helpers + 1 type — verified via `grep -c '^export'`).

### Task 3 — `recipe.promoted` handler in `RealtimeProvider.tsx` (commit `e07b253`)

New `useEffect` at lines **167–185** of `frontend/components/RealtimeProvider.tsx`. Subscribes to `recipe.promoted` and fires a Sonner success toast via the i18n key `recipes.promotion.success_toast` interpolated with `{title}` from the payload.

Important properties for plans 04/05 to verify their own subscriptions don't conflict:
- Effect dependency array: `[client, tPromotion]` — re-subscribes if either changes.
- Cleanup: returns the unsubscribe handle from `client.onEvent`.
- The existing reconnect-toast effect (lines 120–163) is NOT modified; it uses `lostSinceRef`/`toastIdRef` and remains independent.
- NO forced navigation (D-08 explicit) — `grep router.push` over the file returns no matches.
- NO list refetch — page-level components on `/inbox` and `/recipes` own that responsibility via their own `onEvent` subscriptions (Plans 04/05).

New imports added at the top: `import type { Recipe } from "@/lib/recipes";`. New translations hook colocated with existing one: `const tPromotion = useTranslations("recipes.promotion");`.

Threat consideration: Sonner renders interpolated strings as text content (no `dangerouslySetInnerHTML`); React escapes by default. The `title` was server-side validated against the `GeminiExtractedRecipe.title: str` Pydantic schema (Plan 01) before storage. (T-02-03-01 mitigated.)

## Deviations from Plan

None — plan executed exactly as written.

The plan's acceptance criteria for Task 3 contained a self-corrected note ("rule is the opposite — `grep -q 'router.push' ... MUST return 1, confirming we did NOT add forced navigation"). I interpreted this as the actual intent (no `router.push` should appear in the file) and verified via `! grep -q 'router.push'` returning 0 (i.e. not found). This is a reading-of-intent, not a code change.

## Verification

- `python3 -c "import json; json.load(open('frontend/lib/i18n/fr.json'))"` — exits 0
- `cd frontend && npx tsc --noEmit -p tsconfig.json` — exits 0
- `cd frontend && npm run lint` — exits 0 (no new errors)
- All Task 1/2/3 acceptance-criteria greps return 0 (verified inline during execution)
- 10 exports in `frontend/lib/recipes.ts` (was 4, +5 helpers +1 type)
- `recipe.promoted` appears at exactly two locations in `RealtimeProvider.tsx` (one comment, one `onEvent` call)
- No `webkitSpeechRecognition` or `SpeechRecognition` reference introduced (textarea-only critical decision honored)

## Authentication Gates

None — purely additive frontend work. No auth-bound endpoints invoked at build time.

## Known Stubs

None — all helpers return real types and the toast handler wires real i18n. No mocked or empty data introduced.

## Self-Check: PASSED

Created files exist:
- `.planning/phases/02-llm-capture-w2/02-03-SUMMARY.md` — written by this Write call

Modified files exist:
- `frontend/lib/i18n/fr.json` — verified (commit `be10b64`)
- `frontend/lib/recipes.ts` — verified (commit `7adc6bb`)
- `frontend/components/RealtimeProvider.tsx` — verified (commit `e07b253`)

Commits exist on this branch:
- `be10b64` — feat(02-03): add Phase 2 i18n strings to fr.json
- `7adc6bb` — feat(02-03): add typed Phase 2 capture API helpers
- `e07b253` — feat(02-03): handle recipe.promoted in RealtimeProvider
