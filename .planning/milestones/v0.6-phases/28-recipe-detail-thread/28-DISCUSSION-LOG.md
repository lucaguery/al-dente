# Phase 28: Recipe-detail thread - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 28-recipe-detail-thread
**Areas discussed:** Pin signal design + placement (DETAIL-04), DETAIL-05 PUT mechanism, Question turn answer UX (DETAIL-02), Advisory + summary CTA flow (DETAIL-03), In-flight + failure UX, i18n key scope

---

## Pin signal design + placement (DETAIL-04)

### Visual treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Caveat marginalia label « épinglé » | Handwritten font, primary/terracotta tint, small text next to label — cookbook margin annotation. Sober Kitchen marginalia register. | ✓ |
| Pin/Lock icon next to label | Small Pin or Lock lucide icon (12-14px) before/after the field label. Muted-foreground tint. | |
| Left border accent on the field | Like the ingredients list's terracotta-30 left margin-rule — 2px primary/30 left border. | |

**User's choice:** Caveat marginalia label « épinglé »
**Notes:** Brand-locked affordance for "annotation by the user, not the system."

### Where signal renders

| Option | Description | Selected |
|--------|-------------|----------|
| Detail page text + edit page form (both) | Same source of truth — recipes.manually_edited_fields — rendered in two surfaces. | ✓ |
| Edit page form only | Pin lives where the user edits. Detail page stays clean. | |
| Detail page only | Detail is the recipe's home; edit is transient. | |

**User's choice:** Both surfaces.

### Coverage

| Option | Description | Selected |
|--------|-------------|----------|
| All 13 AnswerField keys | Backend whitelist, includes tags + description. Skip render where no surface exists. | ✓ |
| Only 11 FieldKey (visible) fields | Limit to fields in recipe-completeness.ts. | |

**User's choice:** All 13 AnswerField keys.

### Pinned + advisory pending

| Option | Description | Selected |
|--------|-------------|----------|
| No special escalation | Bubble is the alert; pin says "protected." Two signals would compete. | |
| Escalate to « conflit » in destructive amber Caveat | Different tint + lexeme when a pinned field has an open advisory. Tap routes to bubble. | ✓ |

**User's choice:** Escalate to « conflit ».
**Notes:** Collapses 'pinned' + 'pending advisory' into one visible signal — user doesn't cross-reference form vs thread.

---

## DETAIL-05 PUT mechanism

### Detection mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Server-side diff (compare body to current row) | Backend compares each AnswerField key in PUT body to current DB value; pin if differs. | ✓ |
| Always-pin every key in body (exclude_unset) | Any field present in PUT body gets pinned regardless of value change. | |
| Frontend declares explicit fields_to_pin array | Schema field; frontend tracks dirty inputs. | |

**User's choice:** Server-side diff.
**Notes:** Frontend stays dumb; policy lives in one place.

### Same-value re-saves

| Option | Description | Selected |
|--------|-------------|----------|
| No-op — same value means no pin change | Re-typing the same string isn't intent to override LLM. | ✓ |
| Always pin if field is in body | Force-confirms; treats save as canonical-value gesture. | |

**User's choice:** No-op.

### Unpin paths beyond proposal_accepted

| Option | Description | Selected |
|--------|-------------|----------|
| No — only proposal_accepted unpins | Once pinned, stays pinned; clearing to blank keeps the pin with empty value. | |
| Clearing a field to blank unpins it | Treat clear as "I'm releasing this back to the LLM." | ✓ |

**User's choice:** Clearing unpins.
**Notes:** Deliberate ergonomic asymmetry. Predicate per field type (string trim, number `== null`, list `length === 0`) mirrors `isFieldFilled` in `recipe-completeness.ts`.

### Eligible fields

| Option | Description | Selected |
|--------|-------------|----------|
| Only the 13 AnswerField keys | Drift-proof; ONE list of pinnable fields. | ✓ |
| Every RecipeUpdate field that's writable | Includes status. Roughly same set but no explicit AnswerField gate. | |

**User's choice:** Only the 13 AnswerField keys.

---

## Question turn answer UX (DETAIL-02)

### Chip selection mode

| Option | Description | Selected |
|--------|-------------|----------|
| Inferred from field type (cuisine/difficulty/main_protein single; mood/seasonality multi) | Frontend reads question.payload.field and chooses. | |
| Explicit `multi: bool` in question payload | LLM emits multi explicitly. Frontend reads literally. | ✓ |

**User's choice:** Explicit `multi: bool`.
**Notes:** Phase 29 contract decision; Phase 28 consumes. Defensively defaults to false if absent.

### Stepper config

| Option | Description | Selected |
|--------|-------------|----------|
| Step 5min / initial = current value or 0; servings step 1 / initial = current or 1 | Anchored on existing value. | |
| Step 1 everywhere / initial = 0 | Slower entry but more granular. | |
| Step 5 for time / step 1 for servings / initial = 0 | Build from blank; clearer "I am answering" gesture. | ✓ |

**User's choice:** Step 5 time / step 1 servings / initial 0.
**Notes:** Servings UI floors at 1 (backend constraint `1 ≤ v ≤ 99`); Valider disabled until ≥ 1.

### Post-tap UX (commit pattern)

| Option | Description | Selected |
|--------|-------------|----------|
| Single-select chip fires immediately; multi + stepper need Valider | Differentiated commit gestures. | |
| Everything requires Valider (uniform) | Safer; less misfire; +1 tap on single chips. | ✓ |
| Everything fires immediately | Fastest; multi-select would need N round-trips. | |

**User's choice:** Uniform Valider.
**Notes:** Cooking gesture — set the dial, then press cook.

### Optimistic UI

| Option | Description | Selected |
|--------|-------------|----------|
| Optimistic with rollback | Field updates immediately; rollback on POST failure. | ✓ |
| Pessimistic — wait for POST 201 + WS | Safer but slower; feels laggy. | |

**User's choice:** Optimistic with rollback.

---

## Advisory + summary CTA flow (DETAIL-03)

### Advisory bubble fate after resolution

| Option | Description | Selected |
|--------|-------------|----------|
| Stays byte-identical — resolution shows as new turn below | Honors ADR-0001 append-only. Zero extra client state. | |
| Advisory CTAs gray out + add 'résolu' chip | Client-side lookup; advisory persists with disabled CTAs. | |
| Advisory bubble collapses to one-line muted summary | Cleaner scroll history; loses original CTA context. | ✓ |

**User's choice:** Collapse to one-line muted summary.
**Notes:** Visual deviation from ADR-0001 append-only — data still append-only; render treats settled advisories differently. Client-side memo on `turns[]`.

### Optimistic UI on advisory CTAs

| Option | Description | Selected |
|--------|-------------|----------|
| Optimistic with rollback (mirror answer turns) | Consistent rhythm. | ✓ |
| Pessimistic — wait for POST + WS | Safer; less consistent. | |

**User's choice:** Optimistic with rollback.

### Phase 27 summary CTA stubs

| Option | Description | Selected |
|--------|-------------|----------|
| Defer to Phase 29 — stubs stay visual-only | Summary contract is Phase 29's deliverable. | ✓ |
| Delete the stubs in Phase 28 | Question turns ARE the 'compléter' surface. | |
| Wire in Phase 28 — scroll to first question / hide question turns | More work; possibly fights LLM-03 contract. | |

**User's choice:** Defer to Phase 29.

---

## In-flight + failure UX

### Detail page pin marginalia layout (no labels)

| Option | Description | Selected |
|--------|-------------|----------|
| Section-level marginalia in left gutter (cookbook-style) | Per-section Caveat label when any field in that section is pinned. | ✓ |
| Per-badge / per-line micro-label | More granular but visually busy. | |
| Single 'voir détails' at top of page | Aggregate Caveat link; loses 'glance' affordance. | |

**User's choice:** Section-level left-gutter marginalia.

### In-flight POST window

| Option | Description | Selected |
|--------|-------------|----------|
| Quiet — no spinner; toast only on failure | Trust the network; local state already reflects new value. | |
| Subtle 'syncing' marker on touched element | Small spinner / opacity dip during in-flight; disappears on 201. | ✓ |

**User's choice:** Subtle syncing marker.

### Failure recovery

| Option | Description | Selected |
|--------|-------------|----------|
| toast.error + auto-revert + user re-taps | Single pattern across thread mutations. | ✓ |
| Toast with explicit 'Réessayer' button | More guided; bookkeeping for failed payload. | |

**User's choice:** Toast + revert + re-tap.

### i18n key namespace

| Option | Description | Selected |
|--------|-------------|----------|
| New keys under `recipes.thread.*` + `recipes.pin.*` (split) | Pin labels render on form rows (cross-cutting); thread keys for chat. | ✓ |
| All under `recipes.thread.*` (single namespace) | Simpler structure; slight semantic mismatch. | |

**User's choice:** Split namespace.

---

## Claude's Discretion

- Marginalia exact placement (gutter overlay vs grid template areas)
- Marginalia size / weight / exact tint values (UI-SPEC locks)
- Section-to-AnswerField mapping (e.g., `pin-sections.ts` constant)
- Question-bubble vertical rhythm with Valider + wrapped chips
- Resolution-summary copy direction (literal vs French rhythm)
- Cookbook-marginalia React composition pattern (component wrapper vs CSS)
- Memoization strategy for advisory-resolution lookups
- PUT pinning helper name + location (`_apply_put_pinning` inline vs `services/pinning.py`)
- Backend AnswerField mirror file location (`enums.ts` vs `answer-fields.ts`)
- Backend / frontend test surface scope

## Deferred Ideas

- Phase 27 summary_complete / summary_later stubs — Phase 29 wires
- Per-member turn attribution — productize-later
- Push notifications for advisories — productize-later
- "Retry" button inside failure toast — out of scope for v0.6
- Pin signal entrance/exit motion — post-MVP
- Marginalia on `RecipeCard` thumbnails — list view stays clean
- Configurable pin policy — MVP uses always-diff-pins
- Backend-driven advisory resolution detection (denormalized index) — couple-scale doesn't need
- Reordering / editing past turns — append-only per ADR-0001
- Multi-recipe pin history projection — post-v0.6
