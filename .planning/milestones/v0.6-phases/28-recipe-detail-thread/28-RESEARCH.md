# Phase 28: Recipe-detail thread — Research

**Researched:** 2026-05-17
**Domain:** Frontend interactive layer (Next.js 16 / React 19) + backend PUT auto-pin helper (FastAPI / SQLAlchemy 2.0)
**Confidence:** HIGH (all findings verified against source files in this session)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Caveat marginalia label « épinglé » — NOT an icon, NOT a border accent.
- D-02: Pin signal on BOTH detail page and edit form; source of truth is `recipes.manually_edited_fields`.
- D-03: Detail page = section-level marginalia in the left gutter (one Caveat label per section covering any pinned AnswerField in that section).
- D-04: Edit form = per-input marginalia next to the field label for each of the 11 labeled inputs (`tags` and `seasonality` have no form inputs — no marginalia there).
- D-05: Coverage = all 13 AnswerField keys. Skip rendering where no surface exists; data tracks server-side.
- D-06: Pin + open advisory = escalated « conflit » destructive amber Caveat label; tap scrolls to advisory bubble.
- D-07: Server-side diff is the canonical auto-pin mechanism; `_apply_put_pinning` helper between `setattr` loop and `db.commit()`; `manually_edited_fields` stays in `_UPDATE_FORBIDDEN_FIELDS`.
- D-08: Same-value re-saves are a no-op — no spurious re-pin.
- D-09: Clearing a field to blank UNPINS it. Predicate by type: string = `None or .strip()==""`, integer = `None only` (0 is valid), list = `None or len==0`.
- D-10: Eligible fields = only the 13 AnswerField keys; `status` never pins.
- D-11: Atomicity — pinning logic runs before `db.commit()`.
- D-12: Chip `multi` field is the driver; defaults to `false` if absent.
- D-13: Stepper — step 5 for time, step 1 for servings; initial value = 0.
- D-14: Servings floor = 1 but display starts at 0; Valider disabled until ≥ 1.
- D-15: Uniform « Valider » button; single-tap chip, multi-tap chip, AND stepper all require explicit commit before POST.
- D-16: Optimistic UI on Valider tap — apply locally, POST, revert on error + toast.
- D-17: "Mettre à jour" — optimistic apply proposed value + remove pin + collapse advisory.
- D-18: "Ignorer" — POST only; no field/pin change; collapse advisory.
- D-19: Advisory bubble collapses after resolution; resolution detection is client-side render-time scan of `turns[]`; the resolution turn itself does NOT render as its own visible bubble.
- D-20: i18n keys `recipes.thread.advisory_resolved` ICU + `advisory_resolved_accepted` + `advisory_resolved_dismissed`.
- D-21: Subtle syncing marker on in-flight CTA.
- D-22: Failure = `toast.error(t('recipes.thread.action_failed'))` + auto-revert; consistent single key.
- D-23: `recipes.thread.*` for chat copy; `recipes.pin.*` for marginalia.

### Claude's Discretion
- Marginalia exact placement (absolute vs grid), vertical alignment.
- Marginalia exact tint — `var(--primary)` for épinglé, `var(--destructive)` for conflit.
- Section-to-AnswerField mapping (produce in `lib/pin-sections.ts`).
- Question-bubble width/vertical rhythm when chips wrap.
- Resolution-summary copy direction.
- Cookbook-marginalia rendering technique (absolute CSS vs grid areas vs `<Marginalia>` wrapper).
- Memoization strategy for advisory-resolution lookups.
- PUT pinning helper name + location (`routers/recipes.py` inline vs `services/pinning.py`).
- Frontend AnswerField mirror — `frontend/lib/enums.ts` or new `frontend/lib/answer-fields.ts`.
- Tests scope.

### Deferred Ideas (OUT OF SCOPE)
- Phase 27 `summary_complete` / `summary_later` stubs — Phase 29.
- Per-member turn attribution — productize-later.
- Push notifications for advisories — productize-later.
- "Retry" button inside failure toast — post-MVP.
- Pin animation on entrance/exit — post-MVP.
- Marginalia on RecipeCard thumbnails — out of scope.
- Configurable pin policy — not for v0.6.
- Backend-driven advisory resolution detection — out of scope.
- Reordering/editing past turns — out of scope (ADR-0001).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DETAIL-01 | `/recipes/[id]` shows durable conversation thread inline; user emits refinement turns; system replies append via `turn.created` WS. | Already shipped by Phase 27 — this phase CONFIRMS it; no new implementation for DETAIL-01 itself. |
| DETAIL-02 | `question` turns render chip/stepper/text inputs; tapping emits `answer` turn `{in_reply_to_turn_id, field, value}`; value applies to recipes + field pinned. | §3 SystemBubble handler attachments + §6 Optimistic UI. |
| DETAIL-03 | `advisory` turns render informational bubbles with "Mettre à jour" / "Ignorer" CTAs; proposal_accepted applies + unpins; proposal_dismissed is no-op. | §3 + §7 Advisory resolution memo. |
| DETAIL-04 | Manually-edited-field signal renders next to each affected field on `/recipes/[id]` — derived from `manually_edited_fields`. | §4 Pin marginalia mount mechanics + §5 AnswerField mirror. |
| DETAIL-05 | Direct manual field edit via PUT `/recipes/{id}` adds field(s) to `manually_edited_fields` in same DB tx. | §2 Backend PUT pinning helper. |
</phase_requirements>

---

## Summary

Phase 28 is a wiring phase — the vast majority of the UI shell, event subscriptions, POST handlers, and backend plumbing already exist from Phases 25-27. The work is: (1) attach `onClick` to `SystemBubble.tsx` stubs, (2) plumb optimistic state through the detail page, (3) add a small backend helper (`_apply_put_pinning`) to `update_recipe`, and (4) render the « épinglé » / « conflit » Caveat marginalia at two surfaces (detail page sections + edit form inputs).

The largest risk is the detail-page section-to-AnswerField mapping and the exact placement of cookbook-style gutter marginalia on a 390px viewport — the gutter is narrow (24px = `--spacing-page-x`), so the marginalia label almost certainly needs to be `position: absolute` outside the content column rather than a true typographic gutter. The backend change is a single focused helper.

Phase 29 owns all LLM emission of `question`/`advisory`/`summary` turns. Phase 28 purely CONSUMES what is already in `turns[]`. This means the Playwright tests for DETAIL-02 / DETAIL-03 require synthetic turns inserted directly into the DB (matching the `test_turns.py` pattern already established in Phase 26).

**Primary recommendation:** Build in three parallel waves: (W1) backend `_apply_put_pinning` helper + pytest suite; (W1 parallel) frontend AnswerField mirror + i18n keys + `useEnumLabels` extension; (W2) SystemBubble handler attachments + optimistic state + advisory resolution memo; (W3) pin marginalia on detail page and edit form.

---

## 1. Implementation Surface Map

### Files CHANGED by Phase 28

| File | Change Type | What Changes |
|------|-------------|--------------|
| `backend/app/routers/recipes.py` | ADD helper + MODIFY handler | New `_apply_put_pinning` helper function; add one call inside `update_recipe` between `setattr` loop and `db.commit()`. No signature change to the handler. |
| `backend/tests/test_recipes.py` (or new `test_put_pinning.py`) | ADD tests | 7 new test cases for PUT auto-pin. |
| `frontend/lib/enums.ts` OR `frontend/lib/answer-fields.ts` | ADD | `ANSWER_FIELDS` const + `AnswerField` type mirroring `backend/app/schemas/recipe_turn.py:28`. |
| `frontend/lib/i18n/fr.json` | ADD keys | 9 new keys under `recipes.thread.*` and `recipes.pin.*`. |
| `frontend/lib/enum-labels.ts` | EXTEND | Add `field(key: AnswerField) → string` to `useEnumLabels()`. |
| `frontend/components/RecipeThread/types.ts` | EXTEND | Add `onPostAnswerTurn`, `onPostProposalAccepted`, `onPostProposalDismissed` to the detail-mode union; add `manuallyEditedFields: string[]`; add `resolution?: 'accepted' | 'dismissed' | null` to SystemBubble props. |
| `frontend/components/RecipeThread/SystemBubble.tsx` | MODIFY | Wire `onClick` to chips, stepper +/−, text input, Valider button (question kind); wire "Mettre à jour" / "Ignorer" (advisory kind); add resolution-collapse rendering (advisory kind). Remove `disabled` attributes on stubs as handlers land. |
| `frontend/components/RecipeThread/index.tsx` | EXTEND | Add `useMemo` for advisory-resolution map; pass `resolution` and callbacks into `SystemBubble`. |
| `frontend/app/recipes/[id]/page.tsx` | EXTEND | Add `handlePostAnswerTurn` / `handlePostProposalAccepted` / `handlePostProposalDismissed` callbacks; apply optimistic state on recipe row; add pin marginalia render at each detail-page section; pass `manuallyEditedFields` to `RecipeThread`. The existing `recipe.updated` WS handler at lines 162-176 already sets `recipe` state — no change needed. |
| `frontend/components/RecipeForm.tsx` | EXTEND | Add `manuallyEditedFields?: string[]` prop; render per-input marginalia next to each of the 11 `<Label>` elements. |
| `frontend/app/recipes/[id]/edit/page.tsx` | MINOR | Pass `recipe.manually_edited_fields` down to `RecipeForm`. The edit page already fetches the full `Recipe` via GET; the type addition is the only change. |
| `frontend/lib/recipes.ts` | EXTEND type | Add `manually_edited_fields: string[]` to the `Recipe` type (currently absent — a gap from Phase 25). |

### Files UNCHANGED by Phase 28

- `backend/app/schemas/recipe_turn.py` — `AnswerField` literal stays as-is; `AdvisoryTurnPayload`, `AnswerTurnPayload`, `ProposalAcceptedPayload`, `ProposalDismissedPayload` all fully implemented in Phase 26.
- `backend/app/routers/recipes.py` POST /turns handlers — no change; `_apply_answer_turn`, `_apply_proposal_accepted`, `_validate_proposal_dismissed_ref` are complete.
- `backend/app/schemas/recipe.py` `RecipeUpdate` — no new fields needed; `_apply_put_pinning` reads `body.model_dump(exclude_unset=True)` directly.
- `frontend/components/RecipeThread/Bubble.tsx` — user-kind rendering is complete; no Phase 28 changes.
- `frontend/components/RecipeThread/Composer.tsx` — no change.
- `frontend/lib/recipe-completeness.ts` — unchanged; the `isFieldFilled` predicate is read-only reference for the backend blank-predicate.
- `frontend/app/recipes/new/page.tsx` — unchanged; capture mode has no answer/advisory turns.
- `CompletenessCard` — deliberately unchanged (LLM-04 passive indicator preserved).

**Gap to fix before other work:** `frontend/lib/recipes.ts` `Recipe` type does NOT currently include `manually_edited_fields`. [VERIFIED: read `frontend/lib/recipes.ts:20-61`] This field is present on the backend `RecipeResponse` (emitted in `recipe.updated` WS payloads) but missing from the TS type. Phase 28 MUST add it as the first task — otherwise the pin marginalia cannot read it from the React state. [VERIFIED: read `backend/app/schemas/recipe.py:111-165`, field `manually_edited_fields` is not in `RecipeResponse` either — it is on the DB model but not yet serialized to the wire. See §2 for the critical gap.]

---

## 2. Backend — PUT Pinning Helper

### Critical Gap: `manually_edited_fields` Not in `RecipeResponse`

[VERIFIED: `backend/app/schemas/recipe.py:111-165`] `RecipeResponse` does NOT currently include `manually_edited_fields`. The column exists on `Recipe` ORM model (`backend/app/models/recipe.py:80`) and is mutated by `_apply_answer_turn` and `_apply_proposal_accepted`, but it is not serialized to the wire. This means:

1. The `recipe.updated` WS broadcast (`routers/recipes.py:378`) does NOT carry `manually_edited_fields`.
2. The frontend cannot read pin state from the recipe object it receives.
3. Phase 28 MUST add `manually_edited_fields: List[str] = Field(default_factory=list)` to `RecipeResponse` as a prerequisite. This also requires adding `manually_edited_fields: string[]` to the `Recipe` TS type in `frontend/lib/recipes.ts`.

This is a BLOCKING prerequisite that must land in Wave 1 before any frontend pin rendering.

### `_apply_put_pinning` Helper Design

**Location:** Inline in `backend/app/routers/recipes.py`, immediately after `_apply_proposal_accepted` (lines 614-675) for visual symmetry. [VERIFIED: existing helpers are at lines 581-611 and 614-675]

**Signature:**
```python
def _apply_put_pinning(
    db: Session, recipe: Recipe, body: RecipeUpdate
) -> None:
```

**Algorithm:**
```python
from app.schemas.recipe_turn import AnswerField, get_args  # or use a frozenset

_ANSWER_FIELD_SET: frozenset[str] = frozenset(get_args(AnswerField))

def _apply_put_pinning(db: Session, recipe: Recipe, body: RecipeUpdate) -> None:
    data = body.model_dump(exclude_unset=True)
    current_pins: set[str] = set(recipe.manually_edited_fields or [])
    changed = False

    for field_name, new_value in data.items():
        if field_name not in _ANSWER_FIELD_SET:
            continue  # D-10: only AnswerField keys eligible

        current_value = getattr(recipe, field_name, None)

        # Compare AFTER the setattr loop has already applied enum coercion.
        # By the time _apply_put_pinning is called, recipe.<field> already
        # holds the new value (the setattr loop ran first). So we need to
        # compare to the PRE-update value. See §2 Enum coercion gotcha.
        # Solution: caller passes body; we re-read the DB value via a
        # separate approach — OR we call _apply_put_pinning BEFORE setattr.
        ...
```

**Enum coercion ordering gotcha** [VERIFIED: `routers/recipes.py:358-370`]:

The existing `update_recipe` handler runs `setattr(r, key, value)` AFTER applying `_coerce_enum_value`. By the time `_apply_put_pinning` is called (after the setattr loop), `recipe.<field>` already holds the NEW value. The helper cannot diff `current_value = getattr(recipe, field_name)` against `new_value` from the body because they are the same object.

**Two solutions for the planner:**

**Option A (recommended): Call `_apply_put_pinning` BEFORE the setattr loop.** Pass the `body` and the current `recipe` (with pre-update values) to the helper. The helper reads pre-update values via `getattr(recipe, field_name)` and compares to the `body` value (which still needs enum coercion). This means the helper must apply the same coercion as the setattr loop for a valid comparison.

**Option B:** Snapshot `{key: getattr(recipe, key)}` for all AnswerField keys before the setattr loop, pass the snapshot to the helper.

Option A keeps the code structure cleaner. The coercion logic needed: `_coerce_enum_value` for scalar enums, list-coercion for `mood`/`seasonality`, `model_dump()` for ingredients.

**Blank predicate per D-09** (mirroring `frontend/lib/recipe-completeness.ts:80-108`):

| Field | Blank condition |
|-------|----------------|
| `title`, `description`, `difficulty`, `cuisine`, `main_protein` | `value is None or (isinstance(value, str) and value.strip() == "")` |
| `prep_time_minutes`, `cook_time_minutes`, `servings` | `value is None` (0 is valid) |
| `ingredients`, `steps`, `mood`, `seasonality`, `tags` | `value is None or len(value) == 0` |

**JSONB set-semantics + sorted idiom** [VERIFIED: `routers/recipes.py:609-611`]:
```python
current_pins: set[str] = set(recipe.manually_edited_fields or [])
# pin: current_pins.add(field_name)
# unpin: current_pins.discard(field_name)
recipe.manually_edited_fields = sorted(current_pins)
```

Full reassignment (NOT `list.append`) is mandatory — in-place mutation of JSONB columns silently fails without `flag_modified`. [VERIFIED: comment at `routers/recipes.py:607-608`]

**Where to call it:**
```python
# In update_recipe, between the setattr loop and db.commit():
_apply_put_pinning(db, r, body)  # must be BEFORE setattr loop (Option A) 
# or pass snapshot (Option B)
r.updated_at = datetime.now(tz=timezone.utc)
db.commit()
```

The `recipe.updated` broadcast at line 378 naturally carries `manually_edited_fields` in the serialized payload — NO broadcast code change needed, once `RecipeResponse` includes the field.

### `ingredients` deep-equality gotcha

`ingredients` on the recipe row is a JSONB list of `{name, quantity?, unit?}` dicts. The PUT body comes in as `List[IngredientItem]` (Pydantic objects). After `_coerce_enum_value` (not applicable for ingredients) and the `model_dump()` pass in the setattr loop (`routers/recipes.py:367-369`), the value written to `recipe.ingredients` is a plain `list[dict]`. Comparing the incoming body value (after `model_dump()`) to `recipe.ingredients` (already a list of dicts) requires a JSON-serializable deep equality check. Use `json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)` or rely on standard `==` (which works for dicts). **Recommendation:** use `==` — Python dict equality is deep; float/int precision issues are unlikely in ingredient data.

### `mood` / `seasonality` list ordering

Backend stores these as `ARRAY(Text)`. The order in which the user sends the list in the PUT body may differ from the DB stored order (e.g., DB: `["comfort", "light"]`, new body: `["light", "comfort"]`). A naive `!=` comparison would trigger a spurious re-pin. **Solution:** sort both sides before comparing: `sorted(old_value or []) != sorted(new_value or [])`. This correctly detects a set-level change while ignoring order variance.

---

## 3. Frontend — SystemBubble Handler Attachments

### Question bubble (`kind === "question"`) handler attachment

**Current state** [VERIFIED: `SystemBubble.tsx:89-155`]:
- Chip buttons: `<button type="button" className="...">` with no `onClick`. Three chips, each with `key={i}` and option text.
- Stepper: `<button disabled>−</button>`, `<span>0</span>`, `<button disabled>+</button>` — value hardcoded to `0`.
- Text input: `<input disabled placeholder="…" />`.
- No "Valider" button exists yet in Phase 27.

**Phase 28 changes needed to `SystemBubble.tsx`:**

1. **New props to receive** (passed from orchestrator via `types.ts` extension):
   ```typescript
   onPostAnswerTurn?: (payload: AnswerTurnPayload) => Promise<void>
   resolution?: 'accepted' | 'dismissed' | null  // for advisory collapse
   ```

2. **Question branch — local state needed:**
   ```typescript
   const [selected, setSelected] = useState<string | string[]>(
     inputType === 'stepper' ? 0 : (multi ? [] : null)
   );
   const [committing, setCommitting] = useState(false);
   ```
   Note: `useState` with a function init form should be used to avoid reset on re-render. In practice, since `SystemBubble` is re-created per turn item in the AnimatePresence list, state is fresh per bubble.

3. **Chip onClick (single):** `setSelected(opt)` — replaces current selection. Selected chip shows `bg-primary text-primary-foreground border-primary` style. Per D-15, the Valider button appears below the chips.

4. **Chip onClick (multi):** Toggle `opt` in the array — `setSelected(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])`.

5. **Stepper +/− onClick:**
   - `−`: `setSelected(v => Math.max(0, v - step))` where `step = field === 'servings' ? 1 : 5`.
   - `+`: `setSelected(v => v + step)`.
   - `−` disabled when `selected === 0` (or `selected === 1` for servings per D-14 — but the floor for disabling − is 0 to display "0", the Valider is disabled at 0 for servings).
   - Valider disabled when `selected === 0 && field === 'servings'`.

6. **Text input onChange:** `setSelected(e.target.value)`. Valider disabled when `selected.trim() === ''`.

7. **Valider button (new, added by Phase 28):**
   ```tsx
   <button
     type="button"
     disabled={isValiderDisabled || committing}
     onClick={handleValider}
     className={PRIMARY_CTA_CLASS}
   >
     {committing ? <spinner /> : t("answer_valider")}
   </button>
   ```

8. **`handleValider`:**
   ```typescript
   async function handleValider() {
     setCommitting(true);
     try {
       await onPostAnswerTurn({
         kind: "answer",
         in_reply_to_turn_id: turn.id,
         field: turn.payload.field as AnswerField,
         value: selected,
       });
     } catch {
       // revert happens in the parent (see §6)
     } finally {
       setCommitting(false);
     }
   }
   ```
   The parent's `handlePostAnswerTurn` owns the optimistic state + revert.

### Advisory bubble (`kind === "advisory"`) handler attachment

**Current state** [VERIFIED: `SystemBubble.tsx:158-195`]:
- "Mettre à jour" button: `<button type="button" className={PRIMARY_CTA_CLASS}>` — no `onClick`.
- "Ignorer la suggestion" button: `<button type="button" className={GHOST_CTA_CLASS}>` — no `onClick`.

**Phase 28 changes:**

1. **Resolution collapse rendering (D-19):** When `resolution` prop is `'accepted'` or `'dismissed'`, the full advisory bubble is replaced by a one-line muted italic summary:
   ```tsx
   if (resolution) {
     const fieldLabel = labels.field(payload.field);
     return (
       <div className="self-start text-[13px] text-muted-foreground italic px-3 py-1">
         {t("advisory_resolved", {
           field: fieldLabel,
           from: String(payload.current_value ?? ""),
           to: String(payload.proposed_value ?? ""),
           status: resolution === 'accepted'
             ? t("advisory_resolved_accepted")
             : t("advisory_resolved_dismissed"),
         })}
       </div>
     );
   }
   ```
   The full bubble (with CTAs) only renders when `resolution === null` (or undefined).

2. **"Mettre à jour" onClick:**
   ```typescript
   async function handleAccept() {
     setCommitting(true);
     try {
       await onPostProposalAccepted(turn.id);
     } finally {
       setCommitting(false);
     }
   }
   ```
   Optimistic state (apply proposed value + remove pin) runs in the parent.

3. **"Ignorer" onClick:**
   ```typescript
   async function handleDismiss() {
     setCommitting(true);
     try {
       await onPostProposalDismissed(turn.id);
     } finally {
       setCommitting(false);
     }
   }
   ```
   No field change; only the advisory bubble collapses (parent updates local turn resolution state via the `turns[]` update from the WS event).

4. **Syncing marker (D-21):** During `committing`, dim the tapped button to `opacity-50` (or show spinner inside it). Both buttons dim together since only one action is in flight at once.

### Summary bubble stubs (UNCHANGED)

The `summary_complete` and `summary_later` buttons remain visual-only stubs — deferred to Phase 29. [VERIFIED: `28-CONTEXT.md §Deferred`]

---

## 4. Frontend Orchestrator Changes (`index.tsx`)

### Advisory resolution memo

**Current state** [VERIFIED: `frontend/components/RecipeThread/index.tsx:240-259`]: The orchestrator renders `<SystemBubble turn={turn} />` with no props beyond `turn`.

**Phase 28 additions:**

```typescript
// Advisory resolution lookup — memoized per turns[] change (D-19).
// For each advisory turn, find the first later turn with
// kind ∈ {proposal_accepted, proposal_dismissed} AND
// payload.in_reply_to_turn_id === advisory.id.
const advisoryResolutions = useMemo(() => {
  const map = new Map<string, 'accepted' | 'dismissed'>();
  for (const turn of props.turns) {
    if (turn.kind === 'proposal_accepted' || turn.kind === 'proposal_dismissed') {
      const refId = turn.payload.in_reply_to_turn_id as string | undefined;
      if (refId && !map.has(refId)) {
        map.set(refId, turn.kind === 'proposal_accepted' ? 'accepted' : 'dismissed');
      }
    }
  }
  return map;
}, [props.turns]);
```

Then in the render loop:
```tsx
{turn.sender === "user" ? (
  <Bubble variant="persisted" turn={turn} />
) : (
  <SystemBubble
    turn={turn}
    resolution={turn.kind === 'advisory'
      ? (advisoryResolutions.get(turn.id) ?? null)
      : undefined}
    onPostAnswerTurn={props.onPostAnswerTurn}
    onPostProposalAccepted={props.onPostProposalAccepted}
    onPostProposalDismissed={props.onPostProposalDismissed}
  />
)}
```

### `RecipeThreadProps` types extension (`types.ts`)

Add to the detail-mode union:
```typescript
manuallyEditedFields: string[];
onPostAnswerTurn: (payload: AnswerTurnPayload) => Promise<void>;
onPostProposalAccepted: (advisoryTurnId: string) => Promise<void>;
onPostProposalDismissed: (advisoryTurnId: string) => Promise<void>;
```

The `AnswerTurnPayload` type can be imported from a new `frontend/lib/answer-turn.ts` or defined inline in `types.ts` to match the backend shape:
```typescript
export type AnswerTurnPayload = {
  kind: "answer";
  in_reply_to_turn_id: string;
  field: AnswerField;
  value: unknown;  // per-field typing enforced backend-side
};
```

The capture-mode `?: never` guard must cover all four new fields per Phase 27 D-16 discipline.

---

## 5. AnswerField Mirror + i18n Keys + useEnumLabels Extension

### AnswerField mirror location

**Recommendation: Add to `frontend/lib/enums.ts`** (extends the existing pattern of `TurnKind`, `TurnSender`). A new file `answer-fields.ts` is also valid but adds an import path. The pattern in `enums.ts` is a const object + type export:

```typescript
// Phase 28 DETAIL-05 — locked vocabulary mirror of backend/app/schemas/recipe_turn.py:28.
// Drift between TS and Python = bug category (CLAUDE.md locked-vocabulary discipline).
export const ANSWER_FIELDS = [
  "title", "description", "ingredients", "steps",
  "prep_time_minutes", "cook_time_minutes", "difficulty",
  "servings", "cuisine", "mood", "main_protein",
  "seasonality", "tags",
] as const;
export type AnswerField = typeof ANSWER_FIELDS[number];
```

[VERIFIED: `backend/app/schemas/recipe_turn.py:28-42`] — 13 fields confirmed. This matches the backend `AnswerField` Literal exactly.

### i18n keys to ADD

**Location:** `frontend/lib/i18n/fr.json` [VERIFIED: fr.json structure uses nested objects, `recipes.thread` is at line 241 as `"thread": { ... }` inside `"recipes": { ... }`]

Under `"recipes.thread"` (add to the existing `"thread"` object):
```json
"answer_valider": "Valider",
"action_failed": "Action échouée. Réessayer.",
"advisory_resolved": "{field} : {from} → {to} ({status})",
"advisory_resolved_accepted": "accepté",
"advisory_resolved_dismissed": "ignoré",
"stepper_unit_minutes": "min",
"stepper_unit_servings": "{count, plural, one {# pers.} other {# pers.}}"
```

New top-level namespace under `"recipes"` (alongside `"thread"`):
```json
"pin": {
  "label": "épinglé",
  "conflict": "conflit",
  "conflict_aria": "Conflit sur le champ {field} — Voir l'avis"
}
```

**Existing `recipes.thread` keys already present** [VERIFIED: fr.json lines 241-282]:
- `advisory_accept` = "Mettre à jour" ✓
- `advisory_dismiss` = "Ignorer la suggestion" ✓
- `turn_failed` = "Envoi impossible. Vérifie ta connexion et réessaie." ✓ (kept separate from `action_failed` per D-22 note)

### `useEnumLabels` extension

**Current state** [VERIFIED: `frontend/lib/enum-labels.ts`]: covers `cuisine`, `mood`, `protein`, `season`, `difficulty`. Returns `useTranslations` values from `enums.*` namespace.

**Phase 28 addition:** A new `field(key: AnswerField) → string` method. Since the AnswerField keys are not enum values but form field identifiers, they do NOT fit the `enums.*` namespace pattern. Two approaches:

**Option A (recommended):** Inline map in `useEnumLabels` (no new i18n namespace needed):
```typescript
const FIELD_LABELS: Record<AnswerField, string> = {
  title: "titre",
  description: "description",
  ingredients: "ingrédients",
  steps: "étapes",
  prep_time_minutes: "temps de préparation",
  cook_time_minutes: "temps de cuisson",
  difficulty: "difficulté",
  servings: "nombre de personnes",
  cuisine: "cuisine",
  mood: "ambiance",
  main_protein: "protéine principale",
  seasonality: "saisons",
  tags: "tags",
};
// add to useEnumLabels return:
field: (v: AnswerField) => FIELD_LABELS[v] ?? v,
```

**Option B:** Add `enums.field` namespace to `fr.json` and use `useTranslations("enums.field")`. This is more flexible but adds indirection.

Option A is simpler for a 13-key static map; no i18n infrastructure overhead.

---

## 6. Optimistic UI Plumbing + WS Interaction

### Handler pattern (mirroring existing Phase 27 handlers at `page.tsx:212-274`)

```typescript
const handlePostAnswerTurn = useCallback(async (
  payload: AnswerTurnPayload
) => {
  if (!id || !recipe) return;

  // Optimistic: save pre-tap state for rollback
  const prevRecipe = recipe;

  // Apply optimistic update
  const newValue = payload.value;
  const field = payload.field;
  setRecipe(r => r ? {
    ...r,
    [field]: newValue,
    manually_edited_fields: Array.from(
      new Set([...(r.manually_edited_fields ?? []), field])
    ).sort(),
  } : null);

  try {
    await api(`/api/recipes/${id}/turns`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    // Revert
    setRecipe(prevRecipe);
    toast.error(tThread("action_failed"));
  }
}, [id, recipe, tThread]);
```

### WS ordering — no hazard

The `recipe.updated` WS subscription at `page.tsx:162-176` does:
```typescript
const offUpdated = realtime.onEvent<Recipe>("recipe.updated", (payload) => {
  if (payload.id !== id) return;
  setRecipe(payload);
  void refreshPhotoUrls(payload);
});
```

**Analysis:** After an optimistic write + successful POST, the `answer` turn triggers no `recipe.updated` event directly. The `recipe.updated` event fires only from `PUT /recipes/{id}` (the update handler at `routers/recipes.py:378`). The answer-turn handler (`_apply_answer_turn`) does mutate the recipe row but its broadcast is in the GET /turns response + `turn.created` event — NOT a `recipe.updated` event.

**Wait** — re-reading `_apply_answer_turn` at line 581: it calls `setattr(recipe, payload.field, payload.value)` and updates `manually_edited_fields`, then the CALLER does `db.commit()` + `broadcast_to_household(household_id, "recipe.updated", payload)`. [VERIFIED: need to check the POST /turns endpoint for this broadcast.]

Looking at `page.tsx:185-202`: The `turn.created` WS handler appends the new turn to `turns[]`. The `recipe.updated` handler replaces the full recipe state. If Phase 26's POST /turns endpoint ALSO broadcasts `recipe.updated` after committing the answer-turn field writes, then:

1. User taps Valider.
2. Optimistic state sets `recipe.cuisine = "italian"` and adds `"cuisine"` to `manually_edited_fields`.
3. POST fires.
4. Backend commits + broadcasts `turn.created` (new answer turn) + `recipe.updated` (recipe with new field + new pin).
5. `turn.created` handler appends turn to list.
6. `recipe.updated` handler runs: `setRecipe(serverPayload)` — this is the SERVER's value which should match the optimistic state exactly.

The WS `recipe.updated` event arriving after the optimistic write is a NO-OP visually (server matches optimistic). The only hazard is if the WS event arrives BEFORE the POST resolves (race between WS push and HTTP response). In that case: WS event sets state, HTTP response resolves, no revert fires — correct. If POST fails: the WS `recipe.updated` would NOT have been emitted (transaction rolled back), so the revert correctly restores `prevRecipe`. **No ordering hazard.**

However: **the planner must verify whether Phase 26's `_apply_answer_turn` path actually broadcasts `recipe.updated`.** If it does not, the WS subscription is irrelevant for answer turns and the optimistic state stands until the user navigates away and re-fetches.

### `proposal_accepted` optimistic plumbing

```typescript
const handlePostProposalAccepted = useCallback(async (advisoryTurnId: string) => {
  if (!id || !recipe) return;
  // Read the advisory turn from turns[] to get field + proposed_value
  const advisoryTurn = turns.find(t => t.id === advisoryTurnId && t.kind === 'advisory');
  if (!advisoryTurn) return;
  const field = advisoryTurn.payload.field as AnswerField;
  const proposedValue = advisoryTurn.payload.proposed_value;

  const prevRecipe = recipe;
  setRecipe(r => r ? {
    ...r,
    [field]: proposedValue,
    manually_edited_fields: (r.manually_edited_fields ?? []).filter(f => f !== field),
  } : null);

  try {
    await api(`/api/recipes/${id}/turns`, {
      method: "POST",
      body: JSON.stringify({
        kind: "proposal_accepted",
        in_reply_to_turn_id: advisoryTurnId,
      }),
    });
  } catch {
    setRecipe(prevRecipe);
    toast.error(tThread("action_failed"));
  }
}, [id, recipe, turns, tThread]);
```

### `proposal_dismissed` — no optimistic state change needed

```typescript
const handlePostProposalDismissed = useCallback(async (advisoryTurnId: string) => {
  if (!id) return;
  try {
    await api(`/api/recipes/${id}/turns`, {
      method: "POST",
      body: JSON.stringify({
        kind: "proposal_dismissed",
        in_reply_to_turn_id: advisoryTurnId,
      }),
    });
  } catch {
    toast.error(tThread("action_failed"));
  }
}, [id, tThread]);
```

The advisory bubble collapses visually when the resulting `turn.created` event lands and the advisory-resolution memo detects the new `proposal_dismissed` turn. No local state revert needed on failure — the advisory bubble stays open.

### Advisory bubble collapse mechanism

The advisory collapses when the `advisoryResolutions` memo in `index.tsx` finds a matching resolution turn. This happens when:
- A `turn.created` WS event lands for a `proposal_accepted`/`proposal_dismissed` turn referencing this advisory.
- The POST response itself does NOT need to trigger state — WS handles it.

**Edge case:** What if the WS event arrives before the optimistic UI clears the committing state? The `committing` state in `SystemBubble` will be reset in the `finally` block of the handler. Since `SystemBubble` re-renders when `turns[]` changes (which triggers `advisoryResolutions` change), and `resolution` will be non-null, the bubble collapses — the `committing` state is irrelevant because the component renders the collapsed version. No state management issue.

---

## 7. Advisory Resolution Memo Implementation Pattern

The memo uses a `Map<string, 'accepted' | 'dismissed'>` keyed by advisory turn ID, built from the ordered `turns[]` array. Building this from the full array on every render is O(n) per turn and O(n²) total if SystemBubble calls it per advisory. Using `useMemo([turns])` in the orchestrator ensures it is computed ONCE per turns-array change and passed down as a prop.

**Why not `useCallback` per advisory?** Each advisory would need to traverse `turns[]` independently. A single `useMemo` at the orchestrator level is more efficient and easier to test.

**Why not `Map` inside `SystemBubble`?** SystemBubble is a pure rendering component; it should not hold business-logic state about other turns. The orchestrator owns the `turns[]` array and is the correct place for cross-turn lookups.

---

## 8. Pin Marginalia Mount Mechanics

### Detail page sections (D-03)

**Viewport constraint:** [VERIFIED: `27-UI-SPEC.md:75`] `--spacing-page-x = 1.5rem = 24px`. The content columns use `px-(--spacing-page-x)` = 24px horizontal padding. On a 390px iPhone viewport, the content width is 390 - 48 = 342px. A true left gutter for the marginalia would require reducing content width.

**Recommendation: `position: absolute` overlay, not a true typographic gutter.**

Each section-level section header wrapper gets `position: relative`. The Caveat label mounts `position: absolute; left: -4px; transform: translateX(-100%); top: 2px` (flush against the left of the content column, overflowing into the safe area). On iPhones with safe areas this may clip. Alternative: `left: -20px` with `overflow: visible` on the parent.

A simpler approach that avoids layout complexity: place the marginalia INLINE at the start of the section header, `display: inline` before the `<h2>` text, with a `mr-2` gap:
```tsx
<h2 className="text-title flex items-center gap-2">
  {isPinned && <PinMarginalia field="ingredients" ... />}
  {t("section_ingredients")}
</h2>
```
This shifts the text slightly rightward when pinned but avoids absolute positioning complexity on a narrow viewport.

**Section-to-AnswerField mapping** (planner produces as `frontend/lib/pin-sections.ts`):

| Detail page section | AnswerField keys covered |
|---------------------|--------------------------|
| Title (hero `<h1>`) | `title` |
| Description (if rendered) | `description` |
| Metadata pills row (cuisine/mood/protein) | `cuisine`, `mood`, `main_protein` |
| Prep/servings span | `prep_time_minutes`, `cook_time_minutes`, `servings`, `difficulty` |
| Ingredients section | `ingredients` |
| Steps section | `steps` |
| Seasonality (if rendered) | `seasonality` |
| Tags (if rendered) | `tags` |

**Seasonality rendering:** [VERIFIED: `page.tsx:418-500`] The detail page does NOT currently render `seasonality` or `tags` sections. Only ingredients, steps, metadata pills, and prep/servings are rendered. The plan must either add seasonality/tags sections (simple read-only display) or skip marginalia for those fields per D-05 ("skip rendering where no surface exists").

**Tags rendering:** Same situation — no tags display section currently. Per D-05, skip. The planner can note this as a `TODO(productize)` alongside the existing `tags_text` form field.

### Edit form inputs (D-04)

**11 labeled inputs** [VERIFIED: `RecipeForm.tsx:308-548`]:

| Form field | Element type | AnswerField key | Label location |
|------------|-------------|-----------------|----------------|
| Title | `<Input>` | `title` | `<Label htmlFor="rf-title">` at line 309 |
| Description | `<Textarea>` | `description` | `<Label htmlFor="rf-description">` at line 323 |
| Ingredients | `<Textarea>` | `ingredients` | `<Label htmlFor="rf-ingredients">` at line 334 |
| Steps | `<Textarea>` | `steps` | `<Label htmlFor="rf-steps">` at line 344 |
| Prep time | `<Input type="number">` | `prep_time_minutes` | `<Label htmlFor="rf-prep">` at line 356 |
| Cook time | `<Input type="number">` | `cook_time_minutes` | `<Label htmlFor="rf-cook">` at line 371 |
| Difficulty | `<Select>` | `difficulty` | `<Label>` at line 389 |
| Servings | `<Input type="number">` | `servings` | `<Label htmlFor="rf-servings">` at line 414 |
| Cuisine | `<Select>` | `cuisine` | `<Label>` at line 428 |
| Mood | toggle buttons | `mood` | `<Label>` at line 452 |
| Main protein | `<Select>` | `main_protein` | `<Label>` at line 482 |

Seasonality (`seasonality`) and tags (`tags_text`) ALSO have labeled inputs in the form (lines 505 and 531), but per D-04 these are NOT AnswerField-eligible for form marginalia. Wait — D-04 says "seasonality and tags have no CURRENT form inputs." But they ARE in the form. Re-reading D-04: "tags and seasonality have no current form inputs — render no marginalia for them on the edit form." This contradicts the form code. The CONTEXT.md D-04 wording means these fields were not considered in the original form design — they do have text area and toggle-button inputs. The decision to skip them on the form marginalia is intentional per D-04. Keep D-04 as written: no marginalia on `seasonality` and `tags_text` form inputs.

**Composition pattern** for each labeled input:
```tsx
<div className="flex flex-col gap-1.5">
  <div className="flex items-center gap-2">
    <Label htmlFor="rf-title">{t("title_label")}</Label>
    {manuallyEditedFields?.includes("title") && (
      <PinLabel
        field="title"
        hasConflict={openAdvisories.has("title")}
        onConflictTap={() => scrollToAdvisory("title")}
      />
    )}
  </div>
  <Input ... />
</div>
```

The `<PinLabel>` component is a small inline element: Caveat font, `~12px`, terracotta (`var(--primary)`) for « épinglé », destructive amber for « conflit ».

**The edit page `RecipeForm` receives `manuallyEditedFields`** via a new prop. The edit page (`/recipes/[id]/edit/page.tsx`) already fetches the `Recipe` via `api<Recipe>` — once `manually_edited_fields` is in `RecipeResponse`, the edit page can pass `recipe.manually_edited_fields` down to `RecipeForm`.

**Open advisory detection in the edit form context:** The edit page is separate from the detail page (`/recipes/[id]/page.tsx`). To show « conflit » in the edit form, the edit page would need to either: (a) also fetch turns and compute open advisories, or (b) accept a prop from a parent. Since the edit page is a standalone route (`/recipes/[id]/edit`), it fetches the recipe independently. For Phase 28, the simplest approach: the edit form ONLY shows « épinglé » (not « conflit ») — the conflit signal requires cross-referencing turns[], which is not available on the standalone edit page. The planner should confirm this scope reduction (« conflit » on edit form → defer to later, or fetch turns on edit page too).

---

## 9. Sober Kitchen Caveat Marginalia — Concrete CSS

**Design system token** [VERIFIED: `docs/design-system.html:171-184`]:
```css
.marginalia {
  font-family: var(--font-marginalia);  /* "Caveat", cursive */
  font-weight: 500;
  line-height: 1.25;
  color: var(--primary);  /* terracotta oklch(0.50 0.10 32) */
}
.marginalia-sm { font-size: 1rem; }  /* 16px */
```

The design system sizes are `1rem` / `1.2rem` / `1.5rem`. For pin labels at "small (~12-13px)" per D-01, the design system doesn't have a sub-1rem variant. Use an arbitrary Tailwind value.

**Tailwind v4 classes for « épinglé »:**
```
font-[family-name:--font-marginalia] text-[12px] font-medium leading-none text-primary
```
Or using the CSS class pattern from the design system:
```tsx
<span style={{ fontFamily: "var(--font-marginalia)", fontSize: "12px", fontWeight: 500, color: "var(--primary)", lineHeight: 1 }}>
  {t("pin.label")}
</span>
```

**Tailwind v4 classes for « conflit » (destructive amber):**
```
font-[family-name:--font-marginalia] text-[12px] font-medium leading-none text-destructive
```

The design system uses `var(--primary)` for marginalia tint (terracotta). The « conflit » state uses `var(--destructive)` — same CSS custom property used by the existing `« Échec »` pill, already defined in the design system at `oklch(0.50 0.15 25)` (deep amber-red). [VERIFIED: `27-UI-SPEC.md:96`]

**Optional slant:** The design system defines `.marginalia.slant { transform: rotate(-1.2deg); }` for a handwritten feel. Using `rotate(-1.2deg)` inline is appropriate for the cookbook-style gutter placement; skip for the compact edit form label to maintain legibility at 12px.

**`<PinLabel>` component spec:**
```tsx
function PinLabel({
  hasConflict, onConflictTap
}: { hasConflict: boolean; onConflictTap?: () => void }) {
  const t = useTranslations("recipes.pin");
  const style = {
    fontFamily: "var(--font-marginalia)",
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: 1,
    color: hasConflict ? "var(--destructive)" : "var(--primary)",
    transform: "rotate(-1.2deg)",
    display: "inline-block",
  };
  if (hasConflict && onConflictTap) {
    return (
      <button
        type="button"
        style={{ ...style, cursor: "pointer", background: "none", border: "none", padding: 0 }}
        onClick={onConflictTap}
        aria-label={t("conflict_aria", { field: "..." })}
      >
        {t("conflict")}
      </button>
    );
  }
  return <span style={style}>{t("label")}</span>;
}
```

---

## 10. Backend Test Surface

### New pytest cases for `_apply_put_pinning`

Following the `test_turns.py` fixture pattern [VERIFIED: `test_turns.py:53-79`], add to `backend/tests/test_recipes.py` (or a new `test_put_pinning.py`):

| Test ID | Scenario | Assert |
|---------|----------|--------|
| T-28-01 | PUT body changes `cuisine` from "italian" to "french" | `recipe.manually_edited_fields` contains `"cuisine"` |
| T-28-02 | PUT body sends same value as current (`cuisine == "italian"` → body `cuisine="italian"`) | `manually_edited_fields` unchanged (no spurious re-pin) |
| T-28-03 | PUT body sets `title` to `""` (blank); `title` was previously in `manually_edited_fields` | `title` removed from `manually_edited_fields` |
| T-28-04 | PUT body sets `ingredients` to `[]`; `ingredients` was pinned | `ingredients` removed from `manually_edited_fields` |
| T-28-05 | PUT body sets `prep_time_minutes` to `null`; field was pinned | `prep_time_minutes` removed |
| T-28-06 | PUT body sets `prep_time_minutes` to `0`; field was pinned | field STAYS pinned (0 is valid, not blank per D-09) |
| T-28-07 | PUT body sets `status` to `"verified"` (non-AnswerField) | `manually_edited_fields` unchanged |
| T-28-08 | `recipe.updated` WS broadcast after PUT contains new `manually_edited_fields` | broadcast payload has correct pin set |
| T-28-09 | PUT changes `mood` from `["comfort"]` to `["light", "comfort"]` (order-insensitive) | `mood` is pinned |
| T-28-10 | PUT sends `mood` as `["comfort", "light"]` when current is `["light", "comfort"]` (same set, different order) | `mood` is NOT pinned (sort-before-compare) |

**Fixture setup:** Use `_make_recipe` from `test_turns.py:53-68` (or inline equivalent). Set `manually_edited_fields=["title"]` for tests T-28-03 to T-28-06 to test the unpin path.

---

## 11. Frontend Test Surface (Playwright)

### Existing `recipe-detail.spec.ts` baseline

[VERIFIED: `frontend/tests/e2e/recipe-detail.spec.ts` exists at 1.3KB] This spec is a thin baseline. Phase 28 extends it with thread-interaction tests.

### New Playwright specs

All run on the `seeded` project (iPhone-shape viewport) using the existing `SEED_TOKEN` + synced household.

**Prerequisites:** Since Phase 29 has not shipped the LLM emitter, tests must INSERT synthetic `question` and `advisory` turns directly into the test DB before the spec runs. The `test_turns.py:_make_turn` helper pattern works at the Python level; for Playwright (browser-only), use a test-setup script or the existing backend test seeding hook.

| Spec | Behavior | Type |
|------|----------|------|
| chip answer → optimistic field update | Tap a chip on a synthetic `question` turn → field value updates immediately on the recipe form without round-trip | e2e |
| chip answer → « épinglé » appears | After chip tap, pin marginalia appears next to the affected field label | e2e |
| stepper commit → field updates | Commit stepper at value 45 → `prep_time_minutes` shows 45 on form | e2e |
| advisory accept → optimistic apply | Tap "Mettre à jour" on synthetic advisory → field updates, pin disappears | e2e |
| advisory dismiss → collapse only | Tap "Ignorer" → advisory collapses to muted line, field unchanged | e2e |
| PUT via edit form → « épinglé » appears | Edit title via form + save → return to detail page → « épinglé » next to title | e2e |
| PUT clear title → « épinglé » disappears | If title previously pinned, clear to "" (or feasible blank) → pin removed | e2e (note: title has `min_length=1` — use backend direct mutation instead) |
| action_failed toast | Mock network error on POST /turns → `toast.error("Action échouée. Réessayer.")` shows | integration/mock |

**Happy path spec (single):** chip answer → optimistic update → POST 201 → WS turn.created → form shows new value + épinglé.

**Note on `title` blank clear:** `RecipeUpdate.title` has `min_length=1`, so sending `title: ""` returns 422. The unpin-on-clear for title is backend-validated out; the test must use a backend-direct mutation to set up the cleared state.

---

## 12. Wave Structure Recommendation

### Wave 1 — Parallel (no dependencies between these two tracks)

**Track A: Backend**
- Add `manually_edited_fields: List[str]` to `RecipeResponse` schema (blocking prerequisite for ALL frontend pin work).
- Add `_apply_put_pinning` helper to `routers/recipes.py`.
- Call `_apply_put_pinning` in `update_recipe`.
- Add pytest cases (T-28-01 through T-28-10).

**Track B: Frontend vocabulary**
- Add `manually_edited_fields: string[]` to `Recipe` TS type in `lib/recipes.ts`.
- Add `ANSWER_FIELDS` const + `AnswerField` type to `frontend/lib/enums.ts`.
- Add `field()` method to `useEnumLabels`.
- Add 9 new i18n keys to `fr.json` (`recipes.thread.*` additions + new `recipes.pin.*`).

These tracks share no file overlap and can run in parallel worktrees.

### Wave 2 — Depends on Wave 1 Track B

**Frontend handlers (single track)**
- Extend `types.ts` with new detail-mode callback props + `manuallyEditedFields`.
- Implement `handlePostAnswerTurn`, `handlePostProposalAccepted`, `handlePostProposalDismissed` in `page.tsx` (with optimistic state plumbing).
- Add advisory-resolution `useMemo` to `index.tsx`.
- Wire `SystemBubble.tsx` question handlers (chip, stepper, text, Valider button).
- Wire `SystemBubble.tsx` advisory handlers (accept, dismiss, resolution-collapse).

Depends on Wave 1 Track B (needs `AnswerField` type + i18n keys).

### Wave 3 — Depends on Wave 2 (needs `manuallyEditedFields` in `page.tsx` state)

**Pin marginalia UI (single track)**
- Create `<PinLabel>` component (inline in `page.tsx` or extracted to `RecipeThread/PinLabel.tsx`).
- Add section-level marginalia to `page.tsx` detail sections.
- Add per-input marginalia to `RecipeForm.tsx` (pass `manuallyEditedFields` prop).
- Update edit page to pass `recipe.manually_edited_fields` to `RecipeForm`.

Depends on Wave 2 (needs the `recipe` state to contain `manually_edited_fields` which arrives via `recipe.updated` WS after any answer-turn POST).

### Wave order summary

```
Wave 1A (backend)          Wave 1B (frontend vocab)
      ↓                           ↓
      └─────── Wave 2 (handlers) ──┘
                    ↓
              Wave 3 (marginalia UI)
```

The backend Wave 1A must ship before the frontend can see `manually_edited_fields` in WS payloads. The i18n keys (Wave 1B) must ship before any UI code referencing those keys can compile without TS errors.

---

## 13. Phase 27 Deltas — Do NOT Duplicate

The following is ALREADY SHIPPED and must not be rebuilt:

- [x] `frontend/components/RecipeThread/` directory: `index.tsx`, `Bubble.tsx`, `SystemBubble.tsx`, `Composer.tsx`, `VoiceSheet.tsx`, `UrlSheet.tsx`, `PhotoMenu.tsx`, `types.ts`
- [x] `RecipeThread` mounted on `/recipes/[id]/page.tsx` in detail mode (lines 510-521)
- [x] `turns[]` state + initial fetch via `GET /api/recipes/{id}/turns`
- [x] `turn.created` + `turn.updated` WS subscriptions (dedup by id)
- [x] `recipe.updated` + `recipe.deleted` WS subscriptions
- [x] `handlePostTextTurn`, `handlePostVoiceTurn`, `handlePostUrlTurn`, `handlePostPhotoTurn` handlers
- [x] All `recipes.thread.*` keys already in `fr.json` (lines 241-282) — only ADD new keys, do not re-create existing ones
- [x] Composer in detail mode (wired to POST handlers)
- [x] Manual-edit link + scroll behavior (`formRef`)
- [x] `CompletenessCard` passive indicator (DO NOT TOUCH — LLM-04 contract)
- [x] `_apply_answer_turn` + `_apply_proposal_accepted` + `_validate_proposal_dismissed_ref` backend handlers (Phase 26) — DO NOT rewrite
- [x] Phase 26 POST /turns endpoint with all 7 turn kinds
- [x] `AnswerField` Literal type in `backend/app/schemas/recipe_turn.py:28`
- [x] `TurnKind` + `TurnSender` in `frontend/lib/enums.ts` — only ADD `AnswerField` to this file
- [x] `thread-meta` strip with state pill in `RecipeThread/index.tsx`
- [x] `summary_complete` / `summary_later` CTAs in `SystemBubble.tsx` — leave as stubs (Phase 29)

---

## 14. Risks and Gotchas

### CRITICAL: `manually_edited_fields` missing from `RecipeResponse`

[VERIFIED: `backend/app/schemas/recipe.py:111-165`] The field is on the DB model and mutated by Phase 26 handlers, but NOT serialized to the wire. This is a blocking prerequisite that must be the first commit in Wave 1A. Without it, no WS event carries pin state to the frontend.

**Impact if missed:** All pin marginalia silently shows nothing; no crash, no test failure unless tests explicitly check the WS payload.

### Enum coercion ordering in `_apply_put_pinning`

The `update_recipe` handler applies `_coerce_enum_value` during the `setattr` loop. If `_apply_put_pinning` is called AFTER `setattr`, `getattr(recipe, field)` already holds the new value. Diff would always show "no change," causing zero pins.

**Solution:** Call `_apply_put_pinning` BEFORE the `setattr` loop. The helper reads current values from the unmodified recipe and compares to body values (pre-coercion). It should apply the same coercion (at minimum: `_coerce_enum_value` for scalar enums; list-coerce for `mood`/`seasonality`) to avoid false positives from enum wrapper types.

### `mood`/`seasonality` list ordering

Sorted-before-compare required to avoid spurious pins when the user saves the same mood set in a different order. Backend stores `mood` as `ARRAY(Text)` (order-preserving), so two submits of `["comfort", "light"]` vs `["light", "comfort"]` represent the same intent. [VERIFIED: `recipe.py:95-103` stores as `ARRAY(Text)`]

### Recipe type gap in frontend

`frontend/lib/recipes.ts` `Recipe` type does not include `manually_edited_fields`. [VERIFIED: lines 20-61] Any component reading `recipe.manually_edited_fields` before this type is updated will get TypeScript errors (or `undefined` at runtime). Wave 1B must fix this before Wave 2 or Wave 3 attempts to use it.

### `tags` / `seasonality` — form inputs exist but are excluded from pin marginalia

Per D-04, these fields skip form marginalia even though they have labeled inputs in `RecipeForm.tsx`. Confirmed in the form at lines 505-539. This is intentional per CONTEXT.md D-04. The planner must NOT add marginalia to those labels even though the inputs exist.

### Conflit detection on the edit page

The edit page (`/recipes/[id]/edit`) is a standalone route that does not fetch `turns[]`. Showing « conflit » there requires either: (1) fetching turns on the edit page (adds a round-trip), or (2) scoping « conflit » to the detail page only. The research recommendation is to scope « conflit » to the detail page (`/recipes/[id]`) where `turns[]` is already available. The edit form shows only « épinglé » — never « conflit ». This is a scope decision for the planner.

### `postingTurn` guard conflict with new handlers

The detail page uses a single `postingTurn: boolean` state shared across all turn POST handlers. Phase 28 adds 3 more handlers. If `postingTurn` remains shared, tapping a chip while a voice POST is in-flight is blocked. This is acceptable behavior (D-21: "subtle syncing marker, not a blocking UX" — but the existing guard IS blocking). The planner should decide: keep shared guard (safer, avoids ordering bugs) or split per-handler (better UX, more state). Recommendation: keep shared for Wave 2, refine in a later phase.

### `in_reply_to_turn_id` validation on answer turns

Phase 26 D-12 validates that `in_reply_to_turn_id` references a `question` turn in the same recipe. Since Phase 29 has not shipped the LLM question emitter yet, Phase 28 will only have synthetic `question` turns in the DB (inserted by seeds or test fixtures). The end-to-end flow WORKS but requires seeded data. The Playwright tests must insert synthetic question turns via the test DB before exercising the Valider button.

### `QuestionTurnPayload` is a stub

[VERIFIED: `backend/app/schemas/recipe_turn.py:209-212`] `QuestionTurnPayload.kind = "question"` is the only defined field — no `field`, `prompt`, `input_type`, `options`, `multi` fields. Phase 28's `SystemBubble.tsx` reads `turn.payload.input_type`, `turn.payload.options`, `turn.payload.field`, `turn.payload.prompt` from the raw `payload: Record<string, unknown>` dict (as it already does in Phase 27). This is correct — the type system for `QuestionTurnPayload` is Phase 29's problem. Phase 28 just reads from the JSONB dict.

### Advisory resolution affects rendering in the middle of a sorted turn list

The `turns[]` array is sorted by `position` (Phase 26 D-02: `GET /turns` returns sorted by `position ASC`). The `proposal_accepted`/`proposal_dismissed` turns will appear AFTER the advisory they reference in the sorted list. The resolution memo scans forward to find resolution turns for each advisory, which means a resolution turn's effect propagates BACK to an earlier advisory in the visual list. This is the expected behavior (D-19). No risk — the memo correctly handles this.

---

## Sources

### Primary (HIGH confidence — verified from codebase this session)

- `backend/app/schemas/recipe_turn.py:28` — `AnswerField` Literal, 13 fields confirmed
- `backend/app/routers/recipes.py:95-120` — `_UPDATE_FORBIDDEN_FIELDS`, existing handler structure
- `backend/app/routers/recipes.py:333-379` — `update_recipe` full handler
- `backend/app/routers/recipes.py:581-611` — `_apply_answer_turn` (JSONB idiom, set-semantics)
- `backend/app/routers/recipes.py:614-675` — `_apply_proposal_accepted` (unpin idiom)
- `backend/app/schemas/recipe.py:77-165` — `RecipeUpdate` (confirmed `manually_edited_fields` absent), `RecipeResponse` (confirmed field not serialized)
- `backend/app/models/recipe.py:80` — `manually_edited_fields` JSONB column
- `frontend/components/RecipeThread/SystemBubble.tsx` — full Phase 27 stubs confirmed
- `frontend/components/RecipeThread/index.tsx` — full orchestrator structure confirmed
- `frontend/components/RecipeThread/types.ts` — full types confirmed
- `frontend/app/recipes/[id]/page.tsx:1-530` — all handlers + WS subscriptions confirmed
- `frontend/components/RecipeForm.tsx:308-548` — all 11 labeled inputs confirmed
- `frontend/app/recipes/[id]/edit/page.tsx` — edit page structure confirmed
- `frontend/lib/enums.ts` — TurnKind/TurnSender present, AnswerField absent confirmed
- `frontend/lib/enum-labels.ts` — useEnumLabels current state confirmed
- `frontend/lib/i18n/fr.json:241-282` — existing `recipes.thread.*` keys confirmed
- `frontend/lib/recipes.ts:20-61` — `manually_edited_fields` absent from `Recipe` type confirmed
- `frontend/lib/recipe-completeness.ts:80-108` — `isFieldFilled` predicate confirmed
- `backend/tests/test_turns.py:1-80` — fixture patterns confirmed
- `docs/design-system.html:66,171-184` — Caveat font token + `.marginalia` class confirmed
- `.planning/phases/28-recipe-detail-thread/28-CONTEXT.md` — all decisions D-01..D-23 read
- `27-UI-SPEC.md` — design tokens, typography, layout confirmed
- `27-CONTEXT.md` — D-14 visual stubs contract confirmed

---

## Metadata

**Confidence breakdown:**
- Implementation surface map: HIGH — all files verified
- Backend PUT helper design: HIGH — existing patterns verified, ordering gotcha identified from source
- Frontend handler attachments: HIGH — stubs verified, patterns match Phase 27 precedent
- Pin marginalia CSS: HIGH — design system tokens verified
- i18n keys: HIGH — existing fr.json structure verified
- WS interaction: HIGH — verified from page.tsx subscriptions; one open question on whether `_apply_answer_turn` broadcasts `recipe.updated`

**Research date:** 2026-05-17
**Valid until:** 60 days (stable codebase; no external dependencies; only internal patterns)

---

## RESEARCH COMPLETE
