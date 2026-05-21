# Requirements — v0.9 La Grille Completion

**Milestone goal:** Close the 8 unimplemented sketch screens from sketch 002 + the `cooking-logs/[id]/page.tsx` token drift, bringing production into full alignment with [ADR-0004](../docs/adr/0004-modern-sober-refresh.md) La Grille · Soft warmth.

**Source artifacts:**
- Sketch: `.claude/skills/sketch-findings-al-dente/sources/002-refresh-direction-explorations/index.html`
- ADR: `docs/adr/0004-modern-sober-refresh.md`
- Token surface: `frontend/app/globals.css`

---

## v1 Requirements

### PROF — Profil page (Phase 40)

- [ ] **PROF-01**: `/settings` page renders with hero "Profil", numbered hairline rows (`01`–`05`: Notifications / Heure du décide / Inviter quelqu'un / Exporter les données / Déconnexion), and a stats block (recettes / cuisinées / votes) — **no Card components anywhere** on the page. Matches sketch lines 1765-1809.

### ONBO — Onboarding welcome (Phase 40)

- [ ] **ONBO-01**: `/onboarding/welcome` renders as wordmark-centric composition (centered `Al Dente.` wordmark + dot, italic-emphasis tagline "On mange quoi *ce soir* ?", sub-tagline "Une app pour deux. Pour décider ensemble, sans se relancer toute la soirée.", primary filled-dark button + ghost hairline button pair, footer line "cuisine partagée · 0 frais · 0 pub") — **no Card components**. Matches sketch lines 2060-2076.

### LIB — Library text-only view (Phase 40)

- [ ] **LIB-01**: `LibraryViewSwitch` gains a third mode beyond grid-with-photo and row-with-thumb: pure numbered text rows (`ix` + name + meta + tag pill, no photo column). View choice persists in `localStorage`. Matches sketch lines 1687-1693.

### SPLA — Splash screen (Phase 40)

- [ ] **SPLA-01**: `app/loading.tsx` renders the La Grille splash composition (table-à-manger logo SVG, `Al Dente.` wordmark, "On mange quoi ce soir ?" tagline, 3-dot loader, `v0.9 · 2026` version footer) on Next.js navigation loads. Matches sketch lines 1989-2013.
- [ ] **SPLA-02**: iOS PWA boot ships an `apple-touch-startup-image` referencing a static splash asset that matches the SPLA-01 composition; verified on iPhone "Add to Home Screen" launch.

### DRIFT — Cooking-logs token drift fix (Phase 40)

- [ ] **DRIFT-01**: `app/cooking-logs/[id]/page.tsx` no longer references Fraunces italic typography, `bg-surface-rose-100`, or `bg-[var(--color-valide-tint)]`. All visual tokens come from the La Grille set in `frontend/app/globals.css`. File header comments updated to reflect La Grille register.

### THRD — Recipe thread dedicated view (Phase 41)

- [ ] **THRD-01**: `app/recipes/[id]/thread/page.tsx` exists as a dedicated route rendering the conversation thread for a recipe. The structured `[id]/page.tsx` view stops rendering `<RecipeThread>` inline at the bottom.
- [ ] **THRD-02**: The structured recipe view's `det-top` displays a "N tours" pin (where N is `recipe_turns.length`) that, when tapped, routes to `/recipes/[id]/thread`. The thread view's `det-top` shows a back-arrow that returns to the structured view.

### PICK — Nouvelle Recette chooser (Phase 41)

- [ ] **PICK-01**: `/recipes/new` renders a route-level picker with 5 numbered options (`01` Note rapide → quick, `02` Formulaire → form, `03` Voix → voice, `04` Photo → photo, `05` Lien → url), each tapping into `/recipes/new/[surface]`. Matches sketch lines 1714-1755.
- [ ] **PICK-02**: `/recipes/new/[surface]` mounts `<RecipeThread mode="capture" />` with the composer pre-seeded for the chosen surface (mic toggle armed for `voice`, photo picker open for `photo`, URL input focused for `url`, blank for `quick`/`form`). The in-thread D-09 + D-11 unification (no tabs *inside* the thread) is preserved.

### UNDO — Deck card undo (Phase 41)

- [ ] **UNDO-01**: `DELETE /votes/{id}` endpoint added to `backend/app/routers/votes.py` — same auth, same household-isolation as POST `/votes`. Deleting a row triggers `vote.deleted` broadcast on the household WebSocket spine; receiving clients recompute vote state via existing `compute_vote_state` (invariant #2 preserved).
- [ ] **UNDO-02**: `ShortlistThumbButtons` grows from 2 to 3 buttons (X / RotateCcw / Heart). The middle button is undo, only enabled when the front card has a vote row from the current member. Tapping it calls `DELETE /votes/{id}` and animates the card back to "unvoted" state.
- [ ] **UNDO-03**: Undo is **refused** if any `CookingLog` exists for `(shortlist_id, date)` — the veto window has closed. Surfaced inline via tooltip "vote verrouillé — décision déjà cuisinée"; button shows disabled state. Backend `DELETE /votes/{id}` returns 409 Conflict in this case.

### STEP — Structured cooking steps (Phase 42)

- [ ] **STEP-01**: Alembic migration adds `recipes.steps JSONB NULL` column (array of `{text: string, ingredient_refs: string[]}`). Upgrade is non-destructive; downgrade drops the column cleanly.
- [ ] **STEP-02**: Gemini prompt-schema in `backend/app/services/llm.py` updated to extract structured `steps` (with `ingredient_refs` cross-referencing `ingredients`). New captures produce `steps`-populated recipes.
- [ ] **STEP-03**: Existing recipes (where `steps IS NULL`) get lazy backfill on first visit to `/cooking-logs/[id]/active` — server re-runs the Gemini structured-steps extraction using the first user turn (position 0) of `recipe_turns` as input, persists `steps`, broadcasts `recipe.updated`.

### ACTV — Active cooking session (Phase 42)

- [ ] **ACTV-01**: `app/cooking-logs/[id]/active/page.tsx` route exists, renders for a cooking-log row whose `finalized_at IS NULL`. Composition matches sketch lines 2015-2058: `det-top` with X close + "démarrée à HH:MM · N min" crumb + "étape N/M" pin; cook title + timing strip + progress segments (M segments, current colored, prior filled, future hollow); current step text + ingredient ref line (rendered from `steps[i].ingredient_refs`).
- [ ] **ACTV-02**: Prev/next step buttons advance the local "current step" index (no server roundtrip per step — UI-state only, no `cooking_step_index` column). Reaching the last step reveals the "Terminé · marquer cuisinée" CTA.
- [ ] **ACTV-03**: "Terminé · marquer cuisinée" CTA wires to the existing `/cooking-logs/[id]/finalize` route — no new finalization API. Routes the user to `/cooking-logs/[id]/finalize` to capture rating + notes + photo as today.

---

## Future Requirements

Carried forward from v0.8 close — none new at v0.9 scaffold time.

---

## Out of Scope

Explicit exclusions for v0.9, with reasoning:

| Item | Reason |
|---|---|
| Backend endpoints beyond `DELETE /votes/{id}` + `recipes.steps` migration + Gemini prompt update | Milestone scope is UI completion + minimum backend support; broader backend work would expand scope past sketch coverage |
| Productize-later i18n work (new `next-intl` keys for English/other locales) | French-only per CLAUDE.md architecture invariant #6; no productize-later push in v0.9 |
| Design-system token additions beyond La Grille tokens already in `frontend/app/globals.css` | The hand-drawn signature seed (`.planning/seeds/handdrawn-signature-anchor.md`) remains parked; La Grille deliberately rejects hand-drawn elements |
| Hands-free cooking session controls (voice "next step", screen-stays-awake) | Sketch shows tap-to-advance UX; voice + wake-lock would expand scope into AI/permission territory |
| Cooking-step images per step | Sketch shows text + ingredient ref only; per-step images would require Gemini schema extension + storage capacity decisions |
| Recipe-thread permalink / shareable URLs | Thread is per-household; sharing semantics need product design first |
| Multi-undo / undo history beyond single most-recent vote | Sketch shows single undo affordance; multi-step rewind invites veto-window edge cases |
| Library-list "filter chips" v0.7.1 P-03 deferral | Different concern (filtering, not La Grille completion); reconsider at v0.10 |

---

## Traceability

To be filled by `gsd-roadmapper` during Step 10.

| REQ-ID | Phase | Plan | Status |
|--------|-------|------|--------|
| PROF-01 | 40 | TBD | Not started |
| ONBO-01 | 40 | TBD | Not started |
| LIB-01 | 40 | TBD | Not started |
| SPLA-01 | 40 | TBD | Not started |
| SPLA-02 | 40 | TBD | Not started |
| DRIFT-01 | 40 | TBD | Not started |
| THRD-01 | 41 | TBD | Not started |
| THRD-02 | 41 | TBD | Not started |
| PICK-01 | 41 | TBD | Not started |
| PICK-02 | 41 | TBD | Not started |
| UNDO-01 | 41 | TBD | Not started |
| UNDO-02 | 41 | TBD | Not started |
| UNDO-03 | 41 | TBD | Not started |
| STEP-01 | 42 | TBD | Not started |
| STEP-02 | 42 | TBD | Not started |
| STEP-03 | 42 | TBD | Not started |
| ACTV-01 | 42 | TBD | Not started |
| ACTV-02 | 42 | TBD | Not started |
| ACTV-03 | 42 | TBD | Not started |

**Total: 19 requirements** mapped across 3 phases (Phase 40: 6, Phase 41: 7, Phase 42: 6).
