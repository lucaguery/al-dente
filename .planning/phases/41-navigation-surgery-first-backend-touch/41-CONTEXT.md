# Phase 41: Navigation Surgery + First Backend Touch - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Three surface changes, two backend touches:

1. **Recipe thread → dedicated route** (THRD-01, THRD-02): split `app/recipes/[id]/page.tsx` so the thread stops rendering inline at the bottom; new `app/recipes/[id]/thread/page.tsx`; structured view shows a "N tours" pin in `det-top` that routes to /thread.
2. **Nouvelle Recette chooser → route-level** (PICK-01, PICK-02): `/recipes/new` becomes a numbered 5-option picker; `RecipeThread mode="capture"` moves to `/recipes/new/[surface]` pre-seeded with the chosen surface.
3. **Shortlist deck → undo button** (UNDO-01, UNDO-02, UNDO-03): `ShortlistThumbButtons` grows from 2 to 3 (X / RotateCcw / Heart); new backend `DELETE /votes/{vote_id}` endpoint; veto-window guard preempts undo when the day's cooking has begun.

Invariant #2 (voting state computed from rows, not stored) is preserved via DELETE semantics — undo deletes the row, `compute_vote_state` naturally recomputes. Invariant #4 (realtime broadcast) extends with a new `vote.deleted` event.

</domain>

<decisions>
## Implementation Decisions

### PICK-01 / PICK-02 — Picker UX

- **D-01:** **Stateless picker.** `/recipes/new` always creates a fresh draft on tap. No "Resume in-flight draft" surface; users who bailed mid-capture re-enter via the picker like any other capture.
- **D-02:** **"Note rapide" bypasses the thread entirely.** It is a name-only modal (single Geist text input + "Enregistrer" button) that POSTs `/recipes` with `{name}` and redirects to `/recipes/{id}` (the structured view). NO `RecipeThread` mount. Rationale: sketch's `01 Note rapide` "juste le nom, à compléter plus tard" hint maps to a 1-field interaction, not a conversational thread.
- **D-03:** Other 4 surfaces (Formulaire / Voix / Photo / Lien) route into `/recipes/new/[surface]` and mount `<RecipeThread mode="capture" />` with the composer pre-seeded:
  - `form` — composer focused on text input
  - `voice` — `<button data-pressed="true">` on the mic toggle from mount (begins recording immediately on iOS Web Speech permission grant)
  - `photo` — file picker triggered programmatically on mount (one tap → camera roll)
  - `url` — composer's URL input focused on mount, paste-ready
- **D-04:** D-09 + D-11 in-thread unification is **PRESERVED**. The route-level chooser is upstream of the thread; once you're in `/recipes/new/[surface]` there are no tabs inside the thread itself. The chooser is a one-tap UI; users who switch their mind mid-capture must back out + reselect.

### UNDO-02 — Button placement

- **D-05:** **3 buttons always visible.** Layout never shifts mid-vote. `ShortlistThumbButtons` renders X / RotateCcw / Heart in a stable horizontal bar. The middle button (`RotateCcw`) is enabled iff there's a vote from the current member on the front card AND the veto window is open.
- **D-06:** Disabled state uses the existing muted-button pattern (`opacity-40 cursor-not-allowed pointer-events-none` on the inner button while the wrapper handles tooltip).

### UNDO-01 — Backend shape

- **D-07:** **`DELETE /votes/{vote_id}`** (RESTful path keyed by vote primary key). Frontend POST response (and the existing `vote.created` broadcast payload) must include `vote_id` so the client can hold it for later DELETE.
- **D-08:** Backend implementation:
  - Auth: existing `current_member` dependency (same as POST).
  - 404 returned (not 403) on cross-household / not-found vote (invariant #1 — no record-existence leak).
  - 409 Conflict returned if any `cooking_logs` row exists for `(member.household_id, shortlist.shortlist_date)` — veto window is closed.
  - On success: row deleted; broadcast emitted.
- **D-09:** **Broadcast event:** `vote.deleted` with payload `{vote_id, shortlist_id, recipe_id, member_id, shortlist_date}`. Receiving clients remove the row from their local `votes[]` cache; the `useVotes` hook's `compute_vote_state` then recomputes naturally on next render.
- **D-10:** **Endpoint adheres to v0.8 Phase 38 4-test contract**: happy / 401 / 404-cross-household / validation. Plus a 5th invariant-regression test: "DELETE refused when veto window closed" — uses the same `D-38-03` break-observe-revert pattern as v0.8 invariant tests.

### UNDO-03 — Veto-window error UX

- **D-11:** **Preemptive tooltip on disabled button.** Frontend computes "veto window closed" locally from the existing `cooking_logs` data already loaded for the Accueil page (`useCookingLogs` or equivalent). The undo button shows disabled state immediately; the user never taps and gets a refusal.
- **D-12:** **Backend 409 is defense-in-depth.** Should never fire in normal flow because the button is disabled. If it fires (race condition: partner marked cuisiné between page load and undo tap), surface a sonner toast `"Vote verrouillé — décision déjà cuisinée"` and refetch the cooking-log state so the deck card UI catches up. Add a ``vote_locked_after_cook"` test that simulates this race.
- **D-13:** Tooltip copy (next-intl key `shortlist.undo.locked`): `"Vote verrouillé · décision déjà cuisinée"`. Uses `·` middle-dot separator (NBSP-prefixed per project sweep).

### THRD-01 / THRD-02 — Thread route

- **D-14:** `app/recipes/[id]/thread/page.tsx` mounts `<RecipeThread mode="detail" />` (the existing mode used by the bottom-of-structured-view thread today, with a thin top-bar wrapper). The component contract is unchanged; only the surface that hosts it changes.
- **D-15:** "N tours" pin in `det-top` counts **all** `recipe_turns` (user + system turns inclusive). Source: `recipe.turns_count` if the model has a denormalized counter, else `recipes/{id}/turns` length cached in the existing `useRecipeThread` hook. Planner picks based on what the model currently exposes. The number tracks `vote.created`-style realtime broadcasts: `turn.created` already exists per invariant #4, so the counter reactively updates without polling.
- **D-16:** Tap target for the pin is the entire `det-top` `pin` slot (~40-48px hit area). Routes via `Link` to `/recipes/[id]/thread` — full route, not in-page modal. Standard back-arrow on the thread view returns to `/recipes/[id]` (via `router.back()` or explicit Link to the structured view — planner picks).
- **D-17:** **The structured view stops rendering `RecipeThread` inline.** This is a hard deletion of the existing thread-meta strip + RecipeThread embed at the bottom of `[id]/page.tsx`. Pure rip-out — no shim, no conditional render based on flag.

### Claude's Discretion

- **PICK-01 route shape**: `/recipes/new/[surface]` with `surface ∈ {form, voice, photo, url}` — exact param naming planner-discretion. Could also be `/recipes/new?surface=...` (query param) — planner picks based on what plays better with Next 16 App Router conventions.
- **Note rapide POST endpoint**: existing `POST /recipes` accepts blank drafts already. The Note rapide modal just submits with `{name}` and no turns. Planner verifies and confirms.
- **THRD back-arrow target**: `router.back()` vs explicit `<Link href="/recipes/[id]">`. The latter is more deterministic for unusual nav histories (e.g., entered thread via shared URL); planner picks but lean explicit.
- **UNDO-02 active-state secondary signal**: D-06 says muted disabled. Whether to add a subtle ring/pulse on the active undo button after a vote lands is up to the planner — the sketch doesn't show one, but the action is invisible until tap if there's no signal. Optional polish.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architectural authority
- `CLAUDE.md` architecture invariants — **#1** (5 surfaces, server-side promotion via BackgroundTask), **#2** (voting state computed, not stored — `DELETE` preserves), **#4** (realtime contract — new `vote.deleted` event extends), **#5** (raw inputs preserved in `recipe_turns` — thread is the durable store; route split must not break this)
- `docs/adr/0001-recipe-conversation-thread.md` — recipe_turns model + thread semantics
- `docs/adr/0004-modern-sober-refresh.md` — La Grille visual register (this phase doesn't restyle, but new components use the locked tokens)

### Phase scope + lock
- `.planning/REQUIREMENTS.md` §v1 Requirements — THRD-01, THRD-02, PICK-01, PICK-02, UNDO-01, UNDO-02, UNDO-03
- `.planning/PROJECT.md` §Current Milestone — v0.9 locked decisions table

### Sketch
- `.claude/skills/sketch-findings-al-dente/sources/002-refresh-direction-explorations/index.html`:
  - Lines **1714-1755**: Nouvelle Recette picker (sketch §Ajouter)
  - Lines **1866-1916**: Recette thread dedicated view (sketch §Recette thread)
  - Lines **1965-1969**: Shortlist deck 3-button action bar (sketch §Shortlist deck)
- `.claude/skills/sketch-findings-al-dente/references/components.md` — 5-state ShortlistThumbButtons spec; chip styles

### Existing implementations to read before touching
- `frontend/app/recipes/new/page.tsx` — current capture entry (mounts `<RecipeThread mode="capture" />` directly); becomes the picker. Comments cite D-09 + D-11 explicitly — annotate the new picker route with the same lineage.
- `frontend/app/recipes/[id]/page.tsx` — current structured view (renders RecipeThread inline at bottom); thread mount gets hard-deleted; "N tours" pin added to `det-top`.
- `frontend/components/RecipeThread/` — existing thread component. `mode="detail"` is the existing read mode; reuse on the new `/thread` route. `mode="capture"` is the existing capture mode; reuse on `/recipes/new/[surface]`.
- `frontend/components/ShortlistDeck.tsx` + `ShortlistCard.tsx` — current 2-button thumb action bar; ShortlistThumbButtons grows by 1 button.
- `frontend/lib/votes.ts` — `postVote()` POSTs to `/votes` and returns `ShortlistVote`. Add `deleteVote(vote_id)` for the DELETE.
- `backend/app/routers/votes.py` — current POST endpoint; gains DELETE. Existing pattern from POST applies (auth, cross-household 404, broadcast).
- `backend/app/services/realtime.py` — `broadcast_to_household` existing helper; add the `vote.deleted` event type to the WebSocket message schema.
- `backend/app/services/voting.py` — `compute_vote_state` returns enum without touching DB; deletion of a vote row naturally flows through.
- `backend/app/models/vote.py` — Vote model; `id` is the vote primary key the new DELETE path uses.

### Test posture (v0.8 4-test contract continues)
- `backend/tests/test_router_votes.py` (exists for POST) — extends with 4 DELETE tests: happy / 401 / 404-cross-household / validation. Plus 1 invariant-regression test for the veto-window 409 (mirrors D-38-03 pattern). Plus 1 broadcast-shape test.
- `frontend/tests/e2e/` — Phase 41 adds: `recipe-thread-route.spec.ts` (THRD-01/02), `nouvelle-recette-chooser.spec.ts` (PICK-01/02), `deck-undo.spec.ts` (UNDO-01/02/03 including the disabled tooltip path).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`<RecipeThread mode="detail" | "capture">`** — already exists; both modes shipped. Just changes which surface hosts each mode.
- **`useVotes`, `useCookingLogs` hooks** — provide the data the undo button needs to compute its disabled state. `useCookingLogs(shortlist_date)` returns the day's cooking logs; if any exist, veto window is closed.
- **`compute_vote_state` (backend)** — returns enum from rows; DELETE just removes a row and the next compute returns the correct new state. No change to compute_vote_state.
- **`broadcast_to_household`** — existing realtime helper; add a new event type alongside the existing `vote.created` / `vote.updated`.
- **`ShortlistCard` partner-vote indicator** — already shows partner's vote state; survives the DELETE flow because the receiving client updates its `votes[]` cache from the broadcast.

### Established Patterns
- **5-test contract for new endpoints** (v0.8 D-38-03): happy / 401 / 404-cross-household-NOT-403 / validation / invariant-regression. New DELETE follows this.
- **HttpOnly cookie auth** (invariant #8) — DELETE travels through the same `aldente_auth` cookie path; new endpoint uses `Depends(current_member)`.
- **next-intl for all user-facing strings** (invariant #6) — new tooltip + picker labels + thread back-arrow aria-label all flow through `frontend/lib/i18n/fr.json`.
- **Hard-delete on rewrites per MVP no-shim posture** — D-17 says delete the inline thread render outright. No conditional flag; the structured view IS the structured view post-Phase-41.
- **Architecture invariant #2 enforcement test** lives in `backend/tests/test_invariants.py` (added v0.8 Phase 38). DELETE must NOT introduce a `state` column; the existing invariant test should continue to pass.

### Integration Points
- `app/recipes/new/page.tsx` — becomes the picker (full rewrite). 5 numbered options + 1 stateless POST modal for Note rapide.
- `app/recipes/new/[surface]/page.tsx` — NEW dynamic route. Mounts the existing capture thread pre-seeded for the surface. The component code at `app/recipes/new/page.tsx` for the thread mount moves here; surface comes from `useParams()`.
- `app/recipes/[id]/thread/page.tsx` — NEW route. Mounts `<RecipeThread mode="detail" />` + thin top-bar (back arrow + "Risotto · thread" crumb + "N tours" pin). ~50 LOC file.
- `app/recipes/[id]/page.tsx` — REMOVE the inline RecipeThread mount + thread-meta strip from the bottom. ADD "N tours" pin to `det-top` slot.
- `components/ShortlistDeck.tsx` — pass `voteHistory.length > 0 && vetoWindowOpen` to ShortlistThumbButtons as `canUndo`.
- `components/ShortlistCard.tsx` — `ShortlistThumbButtons` signature gains `canUndo: boolean` + `onUndo: () => void` + `lockedTooltip?: string`. Renders 3 buttons.
- `lib/votes.ts` — `deleteVote(voteId: string): Promise<void>` new function calling `DELETE /api/votes/{vote_id}`.
- `backend/app/routers/votes.py` — `delete_vote(vote_id, ...)` route handler. Reuses cross-household-isolation pattern from existing POST.

</code_context>

<specifics>
## Specific Ideas

- **Picker layout** (matches sketch §Ajouter literally):
  ```
  Nouvelle recette
  5 méthodes · choisis-en une

  01  Note rapide       juste le nom, à compléter plus tard      ⚡
  02  Formulaire        tous les détails à la main               🖋
  03  Voix              dicte, on transcrit                       🎙
  04  Photo             photographie un plat, on lit              📷
  05  Lien              colle une URL, on extrait                 🔗
  ```
  (Lucide icons via existing icon imports.)

- **Note rapide modal** copy:
  - Title: `Note rapide`
  - Single input placeholder: `Nom de la recette…`
  - CTA: `Enregistrer ·` (Geist Mono `·` Enter key glyph at the right)
  - Returns to `/recipes/{new_id}` (structured view) on success.

- **Thread route top-bar** (matches sketch §Recette thread):
  - Back arrow (Lucide `arrow-left`) routing to `/recipes/[id]`
  - Crumb: `{recipe.name} · thread` (truncate name at ~20 chars)
  - Right slot: `N tours` Geist Mono pin (no link — purely informational on thread view)

- **Structured view "N tours" pin** (the entry point to /thread):
  - Geist Mono `N tours` chip in `det-top` right slot
  - Tap target: full slot (h-12 inside det-top)
  - Routes to `/recipes/[id]/thread`
  - aria-label: `Voir la conversation · N tours`

- **`vote.deleted` broadcast schema** (extending `services/realtime.py`):
  ```python
  {
    "event": "vote.deleted",
    "household_id": "<uuid>",
    "vote_id": "<uuid>",
    "shortlist_id": "<uuid>",
    "recipe_id": "<uuid>",
    "member_id": "<uuid>",
    "shortlist_date": "2026-05-21"
  }
  ```

- **5-test contract for DELETE /votes/{id}** (backend):
  1. `test_delete_vote_happy_path` — POST then DELETE; row gone; broadcast emitted.
  2. `test_delete_vote_401_missing_auth` — DELETE with no cookie → 401.
  3. `test_delete_vote_404_cross_household` — Member A creates vote; Member B (different household) DELETEs by ID → 404 (NOT 403, invariant #1).
  4. `test_delete_vote_404_not_found` — DELETE non-existent ID → 404.
  5. `test_delete_vote_409_veto_window_closed` — POST vote; insert a finalized cooking_log; DELETE → 409 with localized error code `veto_window_closed`.
  Plus invariant-regression: `test_delete_does_not_introduce_state_column` — reads `recipes` + `votes` schema, asserts no `state` column was added.

</specifics>

<deferred>
## Deferred Ideas

- **PICK draft resume UX** — Considered (D-01 chose stateless). If users frequently bail mid-capture and resume later, a future polish could add a "Brouillons" surface on Profil or a "Reprendre brouillon" row at the top of the picker. Tracked as v0.10+ candidate.
- **Multi-step undo (rewind beyond most recent vote)** — Sketch shows single undo affordance; multi-step rewind invites veto-window edge cases. Not in v0.9.
- **`recipes.turns_count` denormalized counter** — Per D-15, planner picks between live `recipe_turns.length` and a denorm column. If perf surfaces, the denorm column ships as v0.10 polish.
- **Picker route-level deep-link** (`/recipes/new?surface=voice` from external share / Siri shortcut) — Possible future productize hook. Not in v0.9.
- **Undo-history scrubber** — A timeline showing all votes cast today with the ability to step back through them. Differs from the sketch's single-undo button. Future v0.10+ consideration.
- **Per-surface contextual tip on entry** ("Astuce : parle clairement à voix neutre" on /voice entry) — Onboarding-style nudges. Out of scope; productize-later.

</deferred>

---

*Phase: 41-navigation-surgery-first-backend-touch*
*Context gathered: 2026-05-21*
