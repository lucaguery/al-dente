# Phase 4: Polish (W4) - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 delivers the **cooking-log finalization layer and v0.1 polish**:

1. **Cooking-log finalization (COOK-03/04/05):** `PUT /cooking-logs/{id}` accepts photos (≤ 4), a required 3-value rating (`loved`/`liked`/`disliked`), and free-text notes (editable via Web Speech). COOK-05: `recipes.last_cooked_at`, `recipes.cook_count`, and a new `recipes.last_cooked_photo_path` are all updated in the **same DB transaction** as the cooking-log finalization. Photo upload mirrors the existing recipe photo pattern via a new `POST /cooking-logs/{id}/photos` endpoint backed by `services/storage.py`.

2. **Recipe card living image:** After a cooking log is finalized with at least one photo, the recipe card in the list and detail view shows the most recent cooking-log photo as its primary image. This is the key Phase 4 UX improvement — recipes become a living record of cooked meals, not just a static form.

3. **Mobile polish pass:** Contrast ratios, touch target sizes (≥ 48px), visible focus rings on interactive elements. Fix deferred Phase 3 lint errors (`ShortlistCard.tsx:50` setState-in-effect, `HomeDecide.tsx` warnings). Productize-later TODO sweep is opportunistic (noted while touching files, not a dedicated plan).

4. **Offline — app shell only:** Service worker precaches static shell (HTML/JS/CSS/icons) so the app opens instantly. API routes show loading/error states without network. No stale-while-revalidate API caching.

**Dogfood gate:** ≥ 2 weeks of daily use by both household members. The v0.1 definition of done.

**Not in this phase:** Album/ALBUM-01/02/03 (cut — not useful for MVP; deferred to productize-later), per-member ratings (V2-MODEL-01), any new capture surfaces, shopping list, native wrappers. BottomNav stays unchanged (Home / Recipes / Inbox / Settings).

</domain>

<decisions>
## Implementation Decisions

### Finalization screen UX

- **D-03:** The finalization screen at `frontend/app/cooking-logs/[id]/finalize/page.tsx` is a **single-scroll page**: photos at top (using `PhotoUploader` adapted for cooking-log context) → 3-value rating picker → notes field with mic button (Web Speech, same as voice capture). Rating is **required** — the "Finaliser" button is disabled until a rating is selected.

- **D-04:** After tapping "Finaliser" (successful `PUT /cooking-logs/{id}`), the app **navigates back to Home** (`router.push("/")`). The "En train de cuisiner" banner disappears on next Home load (active log is now finalized/rating set).

- **D-05:** The **recipe card shows the last cooking-log photo** as its primary image. Implementation: add `last_cooked_photo_path TEXT` to the `recipes` table (new Alembic migration). This field is set in the same DB transaction as `last_cooked_at` and `cook_count` during finalization. GET /recipes responses include this field; frontend uses it in `RecipeCard` as the primary image when present, falling back to `photo_paths[0]` (the static recipe photo).

### Cooking-log photo upload

- **D-06:** Finalization uses a **new `POST /cooking-logs/{id}/photos` endpoint** that mirrors `POST /recipes/{id}/photos`. The `PhotoUploader` component is adapted to accept a `cookingLogId` prop (alongside existing `recipeId`) or a refactored generic `entityPath` prop — planner decides the cleanest abstraction. Photos land in Supabase Storage under a `cooking-logs/` prefix.

### Offline

- **D-07:** Offline support is **app shell only**. `next-pwa` precaches static assets (HTML, JS, CSS, icons/manifest). No runtime caching of API responses. Without network, the app opens to the cached shell, then shows loading/error states for data. This matches PWA-02 acceptance criteria.

### Polish scope

- **D-08:** Accessibility pass is **mobile-first visual polish only** — focus on: contrast ratios (WCAG AA for text), touch targets ≥ 48px for all tap targets, visible focus rings on interactive elements. No VoiceOver/screen-reader audit in v0.1.

- **D-09:** **Fix deferred Phase 3 lint errors** as part of Phase 4 work: `frontend/components/ShortlistCard.tsx:50` (react-hooks/set-state-in-effect — rewrite to `useSyncExternalStore`, same pattern as `PushPermissionBanner.tsx`), `frontend/components/HomeDecide.tsx` lint warnings (unused eslint-disable, unused `_e` variable).

- **D-10:** **Productize-later TODO sweep is opportunistic** — no dedicated plan. As executors touch files, they audit `// TODO(productize)` comments and note any in their SUMMARY.md. No separate catalog document.

### Claude's Discretion

The following are implementation-level choices the planner/executor should decide:

- **Finalization `PUT` schema:** `{ photo_paths: string[], rating: "loved"|"liked"|"disliked", notes: string | null }`. All three fields in one call; backend validates rating is present before accepting.
- **Alembic migration for `last_cooked_photo_path`:** single-column addition to `recipes`, nullable TEXT, no default needed (null = never cooked with photo).
- **`PhotoUploader` adaptation:** Either add a `cookingLogId?: string` optional prop (alongside existing `recipeId`) and branch the upload URL, or extract a shared `PhotoUploaderBase` component. Planner picks the lower-complexity path.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Specification

- `SPEC.md` §"Cooking log" — COOK-03/04/05 finalization requirements, `last_cooked_at`/`cook_count` same-transaction requirement
- `SPEC.md` §"Data model" — `cooking_logs` table schema (`photo_paths TEXT[]`, `rating log_rating`, `notes TEXT`), `recipes` table denormalized fields
- `SPEC.md` §"Build plan" W4 row — effort ~40h, dogfood gate definition

### Requirements

- `.planning/REQUIREMENTS.md` §"Cooking Log (COOK)"  — COOK-03/04/05 atomic acceptance criteria (Phase 4 scope)
- `.planning/REQUIREMENTS.md` §"PWA & Localization (PWA)" — PWA-02 (service worker app shell)
- `.planning/ROADMAP.md` §"Phase 4: Polish (W4)" — phase goal, 5 success criteria

### Prior phase context

- `.planning/phases/03-decide-w3/03-CONTEXT.md` — D-08 (Sonner toast pattern), CookingBanner location and behavior, finalize stub status
- `.planning/phases/01-foundations-w1/01-CONTEXT.md` — D-02 (photo upload pipeline through backend → Supabase Storage), established `PhotoUploader.tsx` pattern
- `.planning/phases/01.1-cookie-auth-and-recovery/01.1-CONTEXT.md` — D-01 (Next.js rewrite proxy), D-03 (dual-mode cookie+Bearer). All new endpoints via `/api/...` path.
- `.planning/phases/03-decide-w3/deferred-items.md` — Phase 3 deferred lint errors: ShortlistCard setState-in-effect, HomeDecide warnings

### Existing models and endpoints

- `backend/app/models/cooking_log.py` — `CookingLog` ORM: `photo_paths TEXT[]`, `rating LogRating|None`, `notes Text|None`. `rating IS NULL` = unfinalized.
- `backend/app/routers/cooking_logs.py` — `POST /recipes/{id}/cook` (COOK-01), `GET /cooking-logs/active` (COOK-02). Phase 4 adds `PUT /cooking-logs/{id}` and `POST /cooking-logs/{id}/photos`.
- `backend/app/models/recipe.py` — `last_cooked_at`, `cook_count` denormalized fields (Phase 4 adds `last_cooked_photo_path`)
- `backend/app/services/storage.py` — existing Supabase Storage upload helper; reuse for cooking-log photos

### Existing frontend components

- `frontend/components/PhotoUploader.tsx` — reusable photo upload widget; adapt for cooking-log context (new `POST /cooking-logs/{id}/photos` endpoint)
- `frontend/components/BottomNav.tsx` — 4-tab nav; **no change** to tabs (Home / Recipes / Inbox / Settings stays as-is)
- `frontend/app/cooking-logs/[id]/finalize/page.tsx` — stub (EmptyState); replace with full finalization UI

### Repo-level instructions

- `CLAUDE.md` (repo root) — architecture invariant #3: denormalized fields updated in same transaction as `cooking_logs` insert; invariant #4: realtime contract (any mutation that syncs needs broadcast — `cooking.started` already exists; Phase 4 may add `cooking.finalized` event)
- `frontend/AGENTS.md` — Next.js 16.2.4 breaking changes; consult `frontend/node_modules/next/dist/docs/` before writing frontend code

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`PhotoUploader.tsx`** — full upload widget (camera + library picker, 4-photo limit, Supabase signed URLs, progress state). Adapt for cooking-log photos by branching the upload URL based on a new `cookingLogId` prop or extracted base component.
- **`CookingBanner.tsx`** — currently links to `/cooking-logs/${logId}/finalize`. Phase 4 fills that page; banner behavior unchanged.
- **`services/storage.py`** — backend Supabase Storage helper; reuse with a `cooking-logs/` prefix for log photos.
- **`broadcast_to_household`** — may want a `cooking.finalized` event after `PUT /cooking-logs/{id}` so the partner's Home sees the banner disappear. Planner decides if this broadcast is needed.
- **`frontend/components/EmptyState.tsx`** — already imported in the finalize stub; keep for the empty/loading states within the new finalization page if needed.

### Established Patterns

- **Denormalized same-tx update (COOK-05):** Pattern already exists in the cooking_log insert — Phase 4 extends it to also set `last_cooked_photo_path` during finalization. Single `db.execute(update(Recipe).where(...).values(...))` before `db.commit()`.
- **Cookie auth:** `Depends(current_member)` on all new endpoints. No Bearer fallback.
- **French strings via next-intl:** All new copy in `frontend/lib/i18n/fr.json`. Keys for finalization screen, rating picker labels.
- **Sonner toasts:** `toast.success()` on finalization, `toast.error()` on upload failure — established in Phase 2.
- **`useSyncExternalStore` for external subscriptions:** `PushPermissionBanner.tsx` is the reference implementation for the ShortlistCard lint fix.
- **`api<T>("/api/...")` with `credentials: "include"`:** All new API calls use this pattern from `lib/api.ts`.

### Integration Points

- `backend/app/routers/cooking_logs.py` — add `PUT /cooking-logs/{id}` and `POST /cooking-logs/{id}/photos`
- `backend/migrations/` — new Alembic migration: `ALTER TABLE recipes ADD COLUMN last_cooked_photo_path TEXT`

</code_context>

<specifics>
## Specific Ideas

- **Recipe card as living record:** The most important Phase 4 UX improvement is that recipe cards show the last cooking-log photo. This is the "oh wow" moment — you scroll your recipe list and see your own food photos. The planner should make this a first-plan deliverable, not a late addition.
- **Rating picker UX:** Three large tappable cards (❤️ Adoré / 👍 Bien / 😐 Passable) rather than a dropdown or radio buttons — full-width tap targets, mobile-friendly, visually clear. Selected state gets a colored border/tint.
- **Voice notes on finalize:** Same mic button pattern as voice capture (Phase 2) — tap to start, tap to stop, transcript flows into the notes textarea. No separate "recording" page, just in-place capture.

</specifics>

<deferred>
## Deferred Ideas

- **Album (ALBUM-01/02/03)** — shared masonry photo grid cut from MVP. Not useful enough at couple-scale to justify the build cost. Productize-later if dogfood reveals demand.
- **`cooking.finalized` WebSocket broadcast** — so the partner's "En train de cuisiner" banner disappears in real-time. Not in requirements but trivial to add; planner can include it.
- **Per-recipe cooking history timeline** — "you've cooked this 4 times, loved it 3 times." Productize-later.
- **Wildcard shortlist slot** — SPEC.md productize-later; not in v0.1.

</deferred>

---

*Phase: 04-polish-w4*
*Context gathered: 2026-05-07*
