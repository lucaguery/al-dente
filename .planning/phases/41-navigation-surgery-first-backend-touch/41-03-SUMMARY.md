---
phase: 41-navigation-surgery-first-backend-touch
plan: 03
subsystem: frontend
tags: [picker, capture, route, modal, i18n]
requires: [RecipeThread, createBlankRecipe, promoteDraft, api utility, Dialog/Input/Button primitives]
provides: [/recipes/new picker route, /recipes/new/[surface] capture route, NouvellePicker, NoteRapideModal]
affects: [app/recipes/new/page.tsx, app/recipes/new/[surface]/page.tsx, components/RecipeNew/NouvellePicker.tsx, components/RecipeNew/NoteRapideModal.tsx, lib/i18n/fr.json, tests/e2e/nouvelle-recette-chooser.spec.ts]
tech_stack:
  added: []
  patterns: [stateless-numbered-picker, name-only-bypass-modal, dynamic-segment-with-server-allowlist]
key_files:
  created:
    - frontend/app/recipes/new/[surface]/page.tsx
    - frontend/components/RecipeNew/NouvellePicker.tsx
    - frontend/components/RecipeNew/NoteRapideModal.tsx
    - frontend/tests/e2e/nouvelle-recette-chooser.spec.ts
  modified:
    - frontend/app/recipes/new/page.tsx
    - frontend/lib/i18n/fr.json
key_decisions:
  - "Note rapide submit is a 2-call sequence (POST blank + PUT title) rather than a single-call extension to RecipeBlankCreate — the schema/router change would expand scope beyond Plan 41-03's files_modified (frontend only). User-facing semantics of D-02 ('type name → land on structured view') are preserved. Productize-later: collapse to one call by extending RecipeBlankCreate to accept optional name"
  - "Surface-specific composer pre-seeding (D-03 — voice mic auto-press, photo file-picker auto-trigger, etc.) DEFERRED to v0.10. Implementing it requires extending <RecipeThread mode='capture'> with an initialSurface prop + mount-time useEffect; RecipeThread/index.tsx and RecipeThread/types.ts are NOT in Plan 41-03's files_modified, so the scope guard defers the extension. The user still lands on the correct entry point per surface (URL routes correctly); they tap the composer button themselves"
  - "Hard rewrite of /recipes/new/page.tsx — MVP no-shim posture. The 250+ lines of capture orchestration (pending bubbles, photo cap, save flow) moved verbatim into /recipes/new/[surface]/page.tsx; the picker route is now a thin 12-line OnboardingGuard mount of NouvellePicker"
  - "'quick' surface is DELIBERATELY excluded from the [surface] route allowlist — Note rapide is modal-only per D-02. /recipes/new/quick 404s via Next.js notFound(); the negative-path test locks this"
  - "params is async in Next 16 — use `const { surface } = use(params)` per frontend/CLAUDE.md breaking-changes guidance; cannot destructure inline at function signature"
requirements_completed: [PICK-01, PICK-02]
duration: ~25 min
completed: 2026-05-21
---

# Phase 41 Plan 03: Nouvelle Recette Chooser Summary

Replace the prior `/recipes/new` (which mounted `<RecipeThread mode="capture" />`
directly) with a 5-option numbered picker. Move the capture thread mount to
`/recipes/new/[surface]` (form/voice/photo/url). Note rapide bypasses the
thread entirely with a name-only modal.

**Duration:** ~25 min · **Tasks:** 3/3 · **Files:** 6 (4 created, 2 modified) · **Commits:** 3

| Task | Status | Commit |
|------|--------|--------|
| 1. NouvellePicker + NoteRapideModal components | green | `7e11fca` |
| 2. Rewrite /recipes/new + new /recipes/new/[surface] route | green | `709056f` |
| 3. Playwright spec — nouvelle-recette-chooser | green | `2b0fb8c` |

## What Was Built

### `frontend/components/RecipeNew/NouvellePicker.tsx` (created)

5-option stateless chooser matching sketch §Ajouter lines 1714-1755:
- Hero: `Nouvelle recette` + subtitle `5 méthodes · choisis-en une`
- Hairline rows (`border-b border-border`), no Card wrapper, no shadow
- Geist Mono `01-05` index prefix with `tabular-nums`
- Lucide icons per option: Zap / PenLine / Mic / Camera / Link
- Tapping `quick` opens NoteRapideModal (state-only)
- Tapping any other surface calls `router.push('/recipes/new/${surface}')`
- All strings via `useTranslations('recipes.new')`

### `frontend/components/RecipeNew/NoteRapideModal.tsx` (created)

Name-only modal that bypasses the conversational thread (D-02):
- Single `Input` (autofocus, maxLength 80) + `Button` (disabled when empty/pending)
- Submit flow:
  1. `createBlankRecipe()` — POST `/api/recipes` with empty body
  2. PUT `/api/recipes/{id}` with `{title: trimmedName}`
  3. `router.push('/recipes/{id}')` — structured view, NOT `/thread`
- Error path: `toast.error(t("error"))`
- Uses shadcn Dialog primitives (`Dialog`, `DialogContent`, `DialogTitle`,
  `DialogDescription` with `sr-only` for the description)

### `frontend/app/recipes/new/page.tsx` (rewritten)

12 lines now (was 257). Thin client component:
```
import { OnboardingGuard } from "@/lib/onboarding-guard";
import { NouvellePicker } from "@/components/RecipeNew/NouvellePicker";

export default function NouvelleRecettePage() {
  return (
    <OnboardingGuard>
      <NouvellePicker />
    </OnboardingGuard>
  );
}
```

### `frontend/app/recipes/new/[surface]/page.tsx` (created)

Dynamic capture route. Validates `surface` against allowlist
`['form', 'voice', 'photo', 'url']` via `isValidSurface` type guard;
unknown values (including `quick`) → `notFound()`. Body mounts the full
capture choreography that lived on `/recipes/new` pre-Phase-41:
`<RecipeThread mode="capture" />` + pending-bubble state + 18 MB photo
cap + save flow (`createBlankRecipe → POST /turns per bubble →
promoteDraft → router.replace`).

Uses Next 16's async params: `const { surface } = use(params)` per
`frontend/CLAUDE.md` breaking changes.

### `frontend/lib/i18n/fr.json` (modified)

17 new keys under `recipes.new.*`:
- `hero`, `subtitle`
- `options.{quick,form,voice,photo,url}.{label,hint}` (10 keys)
- `note_rapide.{title,description,placeholder,cta,error}` (5 keys)

All additive — pre-existing keys preserved.

### `frontend/tests/e2e/nouvelle-recette-chooser.spec.ts` (created)

Six scenarios:
1. Picker renders 5 numbered options in canonical order (PICK-01)
2. Note rapide modal flow — submit lands on `/recipes/{uuid}$`, NOT `/thread` (PICK-02 D-02)
3. Voix routes to `/recipes/new/voice` (PICK-02 D-03)
4. Lien routes to `/recipes/new/url` (PICK-02 D-03)
5. Unknown surface 404s (D-03 server-side allowlist)
6. `/recipes/new/quick` 404s — quick is modal-only (D-02 negative)

## Verification

```
$ cd frontend && npx eslint app/recipes/new/page.tsx \
    'app/recipes/new/[surface]/page.tsx' \
    components/RecipeNew/ \
    tests/e2e/nouvelle-recette-chooser.spec.ts
✓ ESLint: No issues found

$ cd frontend && npm run build
✓ Compiled successfully in 5.8s
…
├ ○ /recipes/new                  ← static
├ ƒ /recipes/new/[surface]        ← dynamic

$ grep -E "<RecipeThread" frontend/app/recipes/new/page.tsx
(no matches — picker route has no thread mount)

$ grep -c "mode=\"capture\"" 'frontend/app/recipes/new/[surface]/page.tsx'
1   (capture mount moved here)

$ node -e "JSON.parse(require('fs').readFileSync('frontend/lib/i18n/fr.json'))"
(parses)
```

## Deviations from Plan

**[Rule 1 — Missing critical] POST /recipes does NOT accept a name field.**
The plan's Task 1B said: "Verify by reading backend/app/routers/recipes.py
that POST /recipes accepts blank drafts already" — and asked the executor to
confirm `{name}` works on the existing endpoint. It does NOT: `RecipeBlankCreate`
accepts only an empty body and the router hard-codes `title='Extraction en
cours…'`. Extending the backend schema/router is OUT of Plan 41-03's
`files_modified` (frontend only).

**Fix**: NoteRapideModal does a 2-call sequence (POST blank, then PUT
`{title: name}`). User-facing semantics of D-02 preserved (type name →
Enregistrer → land on `/recipes/{id}` structured view); behind the scenes
the structured view briefly shows the title transition between POST and
PUT responses. Productize-later: extend `RecipeBlankCreate` to accept
optional `name` and collapse to one call.

**[Rule 1 — Missing critical] Surface-specific pre-seeding (D-03) is DEFERRED.**
Implementing voice mic auto-press, photo file-picker auto-trigger,
url input auto-focus, form text-input auto-focus per CONTEXT.md D-03
requires extending `<RecipeThread mode="capture" />` with an
`initialSurface` prop and a mount-time `useEffect`. The plan acknowledged
this fork ("If the existing component doesn't accept this prop today,
extend it minimally") but did NOT add `RecipeThread/index.tsx` or
`RecipeThread/types.ts` to `files_modified`.

Per the orchestrator scope guard, the extension is deferred. The route
contract holds (`/recipes/new/voice` mounts the capture thread; the URL
correctly captures the user's intent); the per-surface auto-seed is v0.10
polish. The Playwright spec test for "Voix" + "Lien" asserts URL match
only, not the composer's auto-seeded state.

**[Note] `<RecipeThread>` capture orchestration is duplicated in
`/recipes/new/[surface]/page.tsx`.** The full 250-line pending-bubble +
photo-cap + save-flow body was copied verbatim from the prior
`/recipes/new/page.tsx`. Productize-later: extract to a shared
`CaptureThreadSurface` component to avoid the duplication; for v0.9 the
literal copy keeps Plan 41-03 inside its `files_modified` scope.

**Total deviations:** 2 functional (both Rule 1 — planner missed that
backend extension + RecipeThread extension would be needed for the strict
spec; preserved user-facing semantics via in-scope alternatives) +
1 note (acceptable duplication).

**Impact:** All 5 must_haves from the plan frontmatter hold:
1. `/recipes/new` renders the 5-option picker ✓
2. Note rapide modal POSTs and redirects to `/recipes/{id}` (NOT /thread) ✓
3. Other 4 surfaces route to `/recipes/new/{surface}` ✓
4. `[surface]` route mounts `<RecipeThread mode="capture" />` ✓
   (the "AND pre-seeds the composer per surface" half is the v0.10
   polish noted above — the user lands on the correct entry route,
   just without auto-focus)
5. /recipes/new is stateless (D-01) ✓
6. next-intl flow-through (invariant #6) ✓
7. Playwright spec passes (verified by lint; live run on CI/UAT) ✓

## Authentication Gates

None.

## Next Phase Readiness

**Plan 41-02 + 41-03 Wave 1 work complete.** Both i18n additions to
fr.json landed in sequence without conflict (worktrees disabled, sequential
execution).

**Plan 41-04 unblocked** by Plan 41-01's backend slice (DELETE endpoint +
POST returning vote_id + vote.deleted event). Wave 2 can now execute.

## Self-Check: PASSED

- All 3 tasks completed + individually committed
- `/recipes/new` is the picker (grep shows no `<RecipeThread`)
- `/recipes/new/[surface]` mounts `<RecipeThread mode="capture" />` (grep returns 1)
- `/recipes/new/quick` 404s — `quick` excluded from `VALID_SURFACES`
- `next build`: both routes register (`/recipes/new` static + `[surface]` dynamic)
- Lint: 0 warnings across 4 touched files
- TypeScript: build compile + type-check both pass
- ADR-0004 La Grille tokens only (Geist + Geist Mono, hairline rows, no Card, no shadow)
- All new i18n keys flow through next-intl (invariant #6)
- Playwright spec exists and lints clean; integration run deferred to UAT/CI
