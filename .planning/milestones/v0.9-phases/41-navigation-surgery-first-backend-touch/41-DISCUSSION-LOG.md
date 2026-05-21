# Phase 41: Navigation Surgery + First Backend Touch - Discussion Log

> **Audit trail only.** Decisions captured in 41-CONTEXT.md.

**Date:** 2026-05-21
**Phase:** 41-navigation-surgery-first-backend-touch
**Areas discussed:** PICK picker UX, UNDO button placement, UNDO backend shape, UNDO veto-window 409 UX

---

## PICK-01 picker behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Stateless picker; 'Note rapide' bypasses the thread | Each tap creates a fresh draft. 'Note rapide' = name-only modal, no thread. Other 4 enter thread pre-seeded. Closest to sketch. | ✓ |
| Picker resumes in-flight drafts; all 5 use thread | Existing drafts surface a 'Reprendre' row. All 5 enter thread (Note rapide = thread + empty composer + save shortcut). | |
| Stateless picker; all 5 use thread | Each tap fresh. Note rapide = thread with focused text + save shortcut. No draft-resume UI. | |

**User's choice:** Stateless picker; 'Note rapide' bypasses the thread (name-only modal).
**Notes:** Sketch hint "juste le nom, à compléter plus tard" maps cleanly to a single-field modal interaction. Other 4 surfaces (Formulaire/Voix/Photo/Lien) route into `/recipes/new/[surface]` with the composer pre-seeded. D-09 + D-11 in-thread unification stands.

---

## UNDO-02 button placement

| Option | Description | Selected |
|--------|-------------|----------|
| Always 3 buttons; middle disabled when no vote | Stable layout. Middle button muted + reduced opacity when nothing to undo. Consistent muscle memory. | ✓ |
| 2 buttons → 3 buttons after vote (layout reshuffle) | Layout changes mid-vote. More dynamic but risks confusing tap targets. | |
| 3 buttons always; Geist Mono micro-label when active | Hybrid — stable layout + active-state secondary signal. | |

**User's choice:** Always 3 buttons; middle disabled when no vote.
**Notes:** Stability over dynamism. Muted disabled state with tooltip explains why it can't be tapped.

---

## UNDO-01 backend shape

| Option | Description | Selected |
|--------|-------------|----------|
| DELETE /votes/{vote_id} + broadcast {vote_id, shortlist_id, recipe_id, member_id} | Client sends vote UUID. Backend looks up + deletes. RESTful; matches POST shape. | ✓ |
| DELETE /votes by tuple + broadcast {shortlist_id, recipe_id, member_id} | Client sends `(shortlist_id, recipe_id)`; member_id from auth. Less REST-pure but matches voting domain. | |
| DELETE /shortlists/{sid}/recipes/{rid}/votes/me | Nested path; most expressive URL. Heavier route structure. | |

**User's choice:** `DELETE /votes/{vote_id}` + broadcast with all 4 fields.
**Notes:** Aligns with POST /votes (which already returns the row with `vote_id`). Broadcast includes shortlist/recipe/member so receivers can update local state without lookup.

---

## UNDO-03 veto-window 409 UX

| Option | Description | Selected |
|--------|-------------|----------|
| Tooltip on disabled button (preemptive, before tap) | Frontend computes 'veto window closed' locally. Button disabled + tooltip. Backend 409 is defense-in-depth. | ✓ |
| Toast on 409 response (reactive, after tap) | Button always tappable; 409 → sonner toast. Simpler frontend; user gets refused after tap. | |
| Both — preemptive disable + 409 toast as safety net | Belt-and-suspenders; protects against race conditions (multi-device). | |

**User's choice:** Preemptive tooltip on disabled button.
**Notes:** Best UX (no surprise). Backend 409 still implemented as defense-in-depth — if a race condition fires (partner cooks between page load and undo tap), surface a sonner toast that prompts a refetch. Tooltip copy: "Vote verrouillé · décision déjà cuisinée".

---

## Claude's Discretion

- **PICK-01 route shape**: `/recipes/new/[surface]` vs `?surface=` query param — planner picks based on Next 16 App Router conventions.
- **Note rapide POST endpoint**: existing `POST /recipes` accepts blank drafts; planner verifies and confirms the contract.
- **THRD back-arrow target**: `router.back()` vs explicit `<Link>` — planner picks (lean explicit).
- **UNDO-02 active-state secondary signal**: Optional ring/pulse on active undo button after a vote — sketch doesn't show one, planner-discretion polish.

## Deferred Ideas

- **PICK draft resume UX** — v0.10+ if frequent bail-and-resume surfaces in real use.
- **Multi-step undo / rewind beyond most-recent vote** — Out of scope; veto-window edge cases multiply with depth.
- **`recipes.turns_count` denormalized counter** — Planner picks between live count and denorm column based on perf measurement.
- **Picker route-level deep-link** (`?surface=voice` from external) — productize-later.
- **Undo-history scrubber** — Future v0.10+ consideration.
- **Per-surface contextual tip on entry** — Productize-later onboarding work.
