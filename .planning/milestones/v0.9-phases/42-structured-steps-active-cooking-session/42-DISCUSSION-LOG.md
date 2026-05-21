# Phase 42: Structured Steps + Active Cooking Session - Discussion Log

> **Audit trail only.** Decisions captured in 42-CONTEXT.md.

**Date:** 2026-05-21
**Phase:** 42-structured-steps-active-cooking-session
**Areas discussed:** STEP-01 JSONB shape, STEP-03 backfill timing, STEP-02 Gemini schema cross-refs, ACTV-03 finalize wiring

---

## STEP-01 — `recipes.steps` JSONB shape

| Option | Description | Selected |
|--------|-------------|----------|
| JSONB NULL (nullable) | Existing recipes carry `steps = NULL` until backfill. Distinguishes 'never backfilled' from 'backfill returned empty'. | |
| JSONB NOT NULL DEFAULT '[]' | All recipes carry an empty array. Backfill condition is `jsonb_array_length(steps) = 0`. Eager Alembic backfill to '[]'. | ✓ |
| JSONB NOT NULL DEFAULT '[]' + steps_status enum | Two columns: steps + steps_status. Distinguishes 'pending', 'extracted', 'manual_edited'. More expressive. | |

**User's choice:** NOT NULL DEFAULT '[]' — refines PROJECT.md "nullable" lock.
**Notes:** PROJECT.md said "nullable column" at scaffold time; this discuss-time refinement chose NOT NULL with empty-array default. Backfill condition becomes `jsonb_array_length(steps) = 0` instead of `IS NULL`. PROJECT.md update is implicit (decisions refined during discuss; not edited inline; visible in CONTEXT.md D-01).

---

## STEP-03 — Backfill timing

| Option | Description | Selected |
|--------|-------------|----------|
| On first /active visit | User taps 'Commencer cuisine' → BackgroundTask + recipe.updated broadcast. Mirrors invariant #1. | ✓ |
| On promote_draft + on next recipe view | Two triggers; steps appear sooner but burns Gemini on read paths. | |
| Eager migration during Alembic upgrade | One-shot scan during deploy. Slow deploy + risk of Gemini errors blocking. | |

**User's choice:** On first /active visit.
**Notes:** Matches invariant #1 server-side BackgroundTask pattern. Existing capture-promotion code path is the template. Frontend shows BrandLoader until `recipe.updated` broadcast fires.

---

## STEP-02 — Gemini ingredient cross-ref schema

| Option | Description | Selected |
|--------|-------------|----------|
| By ingredient name (string match) | `ingredient_refs: string[]` containing names. Frontend graceful fallback if no match. | ✓ |
| By array index (order_index) | `ingredient_refs: number[]`. Compact; brittle if ingredients reorder. | |
| Inline expansion (no refs) | Step text contains full reference inline. Loses sketch's `utilise: …` strip. | |

**User's choice:** By ingredient name (string match against ingredients[].name).
**Notes:** Tolerates Gemini typos/variation gracefully (fall back to showing the ref text even when no match found). Prompt instructs Gemini to use exact names verbatim. Simpler than index-based; doesn't require stable ordering.

---

## ACTV-03 — Finalize wiring

| Option | Description | Selected |
|--------|-------------|----------|
| Route directly to /cooking-logs/[id]/finalize | CTA → router.push to existing finalize page. Unchanged. | ✓ |
| Inline finalize form on /active | Reveal rating/notes/photo inline at bottom. Doubles /active responsibilities. | |
| Two-step modal on /active | Modal asks 'Cuisinée?' → expand for rating/notes. | |

**User's choice:** Route directly to /cooking-logs/[id]/finalize.
**Notes:** Cleanest separation. Existing finalize page handles rating/notes/photo as today. No new finalization API. Earlier in the session, the step navigator's right action is "Étape suivante"; the CTA only flips to "Terminé" on the last step.

---

## Claude's Discretion

- **Elapsed/remaining time formatting** — Planner picks Intl pattern; sketch shows "14 min écoulées · 21 min restantes". Clamp behavior on overrun (negative? show "+5 min"?) planner-discretion.
- **Step navigator keyboard handling** — Optional polish.
- **Wake-lock API** — Productize-later. v0.10 candidate.
- **`recipe.updated` broadcast for STEP-03** — Verify it fires after `extract_and_persist_steps` commits; add if missing.
- **Backfill endpoint shape** — Most natural is `POST /recipes/{id}/extract-steps` mirroring POST /promote. Planner picks.

## Deferred Ideas

- **Resume cooking position** — UI-state only today (D-13); persistent column if user-research signals need.
- **Step images** — Gemini extension; v0.10+.
- **Wake-lock during /active** — Productize-later polish.
- **Voice-controlled step navigation** — Out of scope.
- **Step timer per step** — v0.10+ candidate.
- **Step skip / scratch** — Productize-later.
- **Multi-recipe parallel cooking** — Out of scope.
- **Eager migration vs lazy backfill** — Revisit if load patterns favor eager. Backend pattern ready for either.
