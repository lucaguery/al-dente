---
phase: 27
plan: "05"
subsystem: frontend/app/recipes/[id]
tags: [chat-ui, detail-page, realtime, CAPTURE-04, phase-27]
dependency_graph:
  requires:
    - frontend/components/RecipeThread/index.tsx — Plan 27-02 orchestrator (detail mode)
    - frontend/components/RecipeThread/types.ts — PersistedTurn + RecipeStatus
    - frontend/lib/api.ts (api() helper — HttpOnly cookie auth)
    - GET /api/recipes/{id}/turns — Plan 26-03 endpoint
    - POST /api/recipes/{id}/turns — Plan 26-03 JSON endpoint
    - POST /api/recipes/{id}/turns/photo — Plan 26-03 multipart endpoint
    - turn.created + turn.updated WS events — Plan 26-02/26-03
  provides:
    - frontend/app/recipes/[id]/page.tsx — detail page with RecipeThread in detail mode
  affects:
    - ROADMAP Phase 27 Success Criterion 4 (satisfied — consumer side wired end-to-end)
    - Phase 28 (can mount question/advisory handlers in RecipeThread without restructuring)
tech_stack:
  added: []
  patterns:
    - useRef<HTMLDivElement> for manual-edit scrollIntoView target
    - postingTurn guard (boolean flag) for sequential POST serialization
    - alive flag pattern for cleanup of async useEffect fetches
    - turn.created dedup by id + sort by position (defensive against WS vs POST race)
    - FormData + credentials:include for multipart photo turn (mirrors Plan 27-03 pattern)
key_files:
  created: []
  modified:
    - frontend/app/recipes/[id]/page.tsx (full rewrite preserving all existing content, +185 net lines)
decisions:
  - "Form-then-thread layout: RecipeThread mounted BELOW the existing form per D-15 + UI-SPEC §Layout > /recipes/[id]. The thread-meta strip rendered by RecipeThread sits above the chat body (below the form), acting as a visual 'this section is the thread' header."
  - "formRef wraps the hero + form chunk with className='contents' so the div is transparent to flex layout — children render as direct children of the outer <section>."
  - "Hero title remains upright Cormorant Garamond regardless of status (existing behavior, untouched). The thread-meta strip shows italic draft placeholder when status='draft'. Both are intentional — the hero is the recipe header, the thread-meta is the state indicator."
  - "postingTurn flag (T-27-05-02) prevents concurrent refinement POSTs from the same tab. Sequential UI feedback provided by the disabled composer state while posting."
metrics:
  duration: "~20 minutes"
  completed: "2026-05-13"
  tasks: 1
  files_modified: 1
  lines_added: 185
---

# Phase 27 Plan 05: Detail Page Thread Mount Summary

**One-liner:** Additive edit to `/recipes/[id]/page.tsx` wiring RecipeThread in detail mode below the existing form — turns fetched on mount, realtime `turn.created`/`turn.updated` subscription, 4 refinement-turn POST handlers, and manual-edit link scroll target.

---

## What Was Built

### New State Added to `RecipeDetailPage`

| State | Type | Purpose |
|-------|------|---------|
| `turns` | `PersistedTurn[]` | Persisted thread turns from GET /turns + realtime appends |
| `postingTurn` | `boolean` | Spam guard (T-27-05-02) — prevents concurrent POSTs from same tab |
| `formRef` | `useRef<HTMLDivElement>` | Scroll target for the manual-edit link |

### New useEffects (2)

1. **Initial turns fetch** — `GET /api/recipes/${id}/turns` on mount, one-shot with alive flag cleanup. Non-fatal on error (empty thread recoverable).

2. **WS turn subscription** — `turn.created` appends (with dedup by id + position sort); `turn.updated` replaces in place (D-29). Both filtered by `payload.recipe_id === id`.

### New Callbacks (5)

| Callback | Endpoint | Notes |
|----------|----------|-------|
| `handlePostTextTurn(text)` | POST /api/recipes/{id}/turns `{kind:"text",text}` | api() with JSON body |
| `handlePostVoiceTurn(transcript)` | POST /api/recipes/{id}/turns `{kind:"voice",transcript}` | api() with JSON body |
| `handlePostUrlTurn(url)` | POST /api/recipes/{id}/turns `{kind:"url",url}` | api() with JSON body |
| `handlePostPhotoTurn(file)` | POST /api/recipes/{id}/turns/photo | raw fetch + FormData + credentials:include |
| `handleManualEditLinkClick()` | — | `formRef.current?.scrollIntoView(smooth, start)` |

### Form-Ref Wrapper

The existing hero + form chunk is wrapped in `<div ref={formRef} className="contents">`. The `contents` class makes the div transparent to flex layout so children render as direct children of `<section>`. This is the scroll target for the manual-edit link.

### RecipeThread Mount

```tsx
<RecipeThread
  mode="detail"
  recipeId={recipe.id}
  title={recipe.title}
  turns={turns}
  recipeStatus={recipe.status as RecipeStatus}
  onPostTextTurn={handlePostTextTurn}
  onPostVoiceTurn={handlePostVoiceTurn}
  onPostUrlTurn={handlePostUrlTurn}
  onPostPhotoTurn={handlePostPhotoTurn}
  onManualEditLinkClick={handleManualEditLinkClick}
/>
```

Mounted BELOW the form wrapper, BEFORE `<VoiceModifySheet />`.

---

## Form-Unchanged Guarantee (D-15)

The following sections of the existing render are byte-identical to the pre-Phase-27 version:

- `<header>` — sticky h-12 with back, voice-modify, edit, delete icons
- Hero photo (`aspect-[4/3]` full-bleed with paper-grain overlay strip) OR no-photo Card fallback
- `<CompletenessCard recipe={recipe} />` (RID-03)
- Metadata pill row (cuisine / moods / protein / metaSpan)
- Multi-photo carousel (photos 2..N)
- Ingredients `<ul>` with terracotta left border-rule
- Steps `<ol>` with Cormorant italic step numbers
- Footer (last cooked / cook count)
- `<VoiceModifySheet>` mount
- 404 branch (`notFound` guard)
- Loading skeleton branch (`!recipe` guard)

---

## Layout Decision

Chat below the recipe form, per UI-SPEC §"Layout > /recipes/[id]":

```
<section>
  <header />                    // sticky h-12
  <div ref={formRef}>           // form chunk (className="contents")
    hero photo / title card
    CompletenessCard
    metadata pills
    photo carousel
    ingredients
    steps
    footer
  </div>
  <RecipeThread mode="detail" /> // thread-meta + chat-body + manual-link + composer
</section>
<VoiceModifySheet />
```

The thread-meta strip (state pill + title) renders INSIDE RecipeThread above the chat body. It acts as a visual "this section is the thread" header separating the form section from the chat section.

---

## WebSocket Events Subscribed

| Event | Handler |
|-------|---------|
| `turn.created` | Append to `turns` (dedup by id + sort by position) |
| `turn.updated` | Replace in `turns` by id (Phase 26 D-29 — URL extraction landing) |

Both filtered by `payload.recipe_id === id` (T-27-05-01 mitigation — cross-household turns filtered client-side; Phase 26 also scopes broadcast to household).

---

## Known Stubs

None introduced by this plan. The RecipeThread component's visual stubs (question chip buttons, advisory CTAs) are Phase 27-02's documented stubs — unchanged.

Photo-bubble signed-URL resolution in the thread is a known limitation (T-27-05-03, accepted): the thread's `Bubble.tsx` renders a placeholder for photo turns' `resolvedPhotoUrl` when null. Photo refinement turns on existing recipes are rare in Phase 27; the resolver is post-Phase-27 polish.

---

## Threat Surface

No new network endpoints introduced. Two trust boundaries exercised:

| Boundary | Mitigation |
|----------|------------|
| WS frame `turn.created` → `setTurns` | Filter by `payload.recipe_id === id`; dedup by `payload.id` |
| Client → POST /turns (refinement) | `postingTurn` flag prevents concurrent POSTs; backend's asyncio Lock serializes positions |

---

## Files Touched

**Modified (1):**
- `frontend/app/recipes/[id]/page.tsx` — additive edit, existing content untouched

---

## Self-Check: PASSED

- `frontend/app/recipes/[id]/page.tsx` — FOUND
- `import RecipeThread` — 1 match (line 46)
- `<RecipeThread` — 1 match (line 510)
- `mode="detail"` — 1 match (line 511)
- `turn.created` — 2 matches (comment + handler)
- `turn.updated` — 2 matches (comment + handler)
- `/api/recipes/${id}/turns` — 9 matches (initial fetch + 4 POST handlers)
- `/turns/photo` — 1 match (multipart photo POST)
- `credentials: "include"` — 1 match
- `formRef` — 5 matches (declaration, ref attach, scroll handler, JSX, comment)
- `scrollIntoView` — 3 matches (definition + 2 uses)
- `CompletenessCard` — 4 matches (comment + import + JSX + comment)
- `detail_404_heading` and `notFound` — 7 matches total
- `<VoiceModifySheet` — 1 match (line 523)
- Commit `43bce57` — verified in git log
