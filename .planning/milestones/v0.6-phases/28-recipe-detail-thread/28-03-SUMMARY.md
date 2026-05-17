---
phase: 28
plan: "03"
subsystem: frontend
tags: [recipe-thread, interactivity, optimistic-ui, answer-turns, advisory, detail-mode]
depends_on: [28-01, 28-02]
provides: [DETAIL-02, DETAIL-03]
affects: [frontend/components/RecipeThread, frontend/app/recipes/[id]]

dependency_graph:
  requires:
    - 28-01: RecipeResponse.manually_edited_fields + _apply_put_pinning backend
    - 28-02: ANSWER_FIELDS locked vocab + PinLabel + i18n keys (answer_valider, action_failed, advisory_resolved, stepper_unit_*)
  provides:
    - DETAIL-02: question bubble chip/stepper/text inputs wired; Valider POSTs answer turn with optimistic state
    - DETAIL-03: advisory accept/dismiss wired; resolution-collapse rendering; optimistic proposed_value apply
  affects:
    - frontend/components/RecipeThread/types.ts — AnswerTurnSubmission type + extended detail-mode union
    - frontend/components/RecipeThread/index.tsx — advisoryResolutions memo + null-render guard + prop pass-through
    - frontend/components/RecipeThread/SystemBubble.tsx — full handler wiring replacing Phase 27 visual stubs
    - frontend/app/recipes/[id]/page.tsx — 3 new handlers + 4 new props on RecipeThread mount

tech_stack:
  added: []
  patterns:
    - optimistic-UI with prevRecipe snapshot + setRecipe revert on POST failure
    - per-bubble useState(committing) to prevent double-tap without shared postingTurn guard
    - QuestionBubble inner component extraction to avoid useState-in-conditional (React hooks rules)
    - useMemo advisoryResolutions map over turns[] for O(1) advisory collapse lookup

key_files:
  created: []
  modified:
    - frontend/components/RecipeThread/types.ts
    - frontend/components/RecipeThread/index.tsx
    - frontend/components/RecipeThread/SystemBubble.tsx
    - frontend/app/recipes/[id]/page.tsx

decisions:
  - QuestionBubble extracted as inner component: React hooks rules forbid useState in a conditional branch. The question kind needed both `committing` (shared outer) and `selected` (per-question, different initial value per inputType). Extracting to QuestionBubble lets useState run unconditionally at the top of a real component boundary.
  - advisoryResolutions dependency array uses conditional second element `props.mode === "detail" ? props.turns : null`: capture mode never has turns; this prevents spurious recomputation. eslint-disable comment added inline.
  - handlePostProposalDismissed does not optimistically update recipe or manually_edited_fields: D-18 specifies dismiss is a pure no-op on the recipe row. The advisory bubble collapse happens when the WS turn.created event lands and the advisoryResolutions memo picks up the new dismissed entry.
  - Build verification limited to `npx tsc --noEmit` (zero errors): the worktree has no local node_modules, so `next build` fails on module resolution for @ducanh2912/next-pwa — a pre-existing environment constraint confirmed by running build in the main repo (which succeeds).

metrics:
  duration: "~35 minutes"
  completed: "2026-05-17"
  tasks_completed: 3
  files_modified: 4
---

# Phase 28 Plan 03: Recipe-Detail Thread Interactivity Summary

Wire the interactive layer of the recipe-detail thread: chip/stepper/text answer handlers, advisory accept/dismiss handlers, the advisory-resolution memo, and optimistic UI plumbing. Closes DETAIL-02 + DETAIL-03.

## What Was Built

### Task 1 — RecipeThreadProps extension + advisoryResolutions memo (commit `208487c`)

**`frontend/components/RecipeThread/types.ts`**

Added `AnswerTurnSubmission` exported type:
```typescript
export type AnswerTurnSubmission = {
  in_reply_to_turn_id: string;
  field: AnswerField;
  value: unknown;
};
```

Extended the detail-mode union with 4 new fields:
- `manuallyEditedFields: string[]` — pin set passed read-only to thread
- `onPostAnswerTurn: (submission: AnswerTurnSubmission) => Promise<void>`
- `onPostProposalAccepted: (advisoryTurnId: string) => Promise<void>`
- `onPostProposalDismissed: (advisoryTurnId: string) => Promise<void>`

Added matching `?: never` markers to capture-mode branch to keep the discriminated union tight.

**`frontend/components/RecipeThread/index.tsx`**

Added `advisoryResolutions` useMemo before the render loop:
```typescript
const advisoryResolutions = useMemo(() => {
  const map = new Map<string, "accepted" | "dismissed">();
  if (props.mode !== "detail") return map;
  for (const turn of props.turns) {
    if (turn.kind === "proposal_accepted" || turn.kind === "proposal_dismissed") {
      const refId = turn.payload?.in_reply_to_turn_id as string | undefined;
      if (refId && !map.has(refId)) {
        map.set(refId, turn.kind === "proposal_accepted" ? "accepted" : "dismissed");
      }
    }
  }
  return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [props.mode, props.mode === "detail" ? props.turns : null]);
```

Dependency array note: the second element is conditional (`props.mode === "detail" ? props.turns : null`) so capture mode does not trigger recomputation. ESLint exhaustive-deps is suppressed inline with a comment.

Added null-render guard for resolution turns in the render loop — `proposal_accepted` and `proposal_dismissed` turns render as `null` (D-19: they are state-change markers, not visible bubbles).

Extended `<SystemBubble>` with `resolution`, `onPostAnswerTurn`, `onPostProposalAccepted`, `onPostProposalDismissed` props.

### Task 2 — SystemBubble wiring (commit `2fbc215`)

**`frontend/components/RecipeThread/SystemBubble.tsx`**

Full rewrite replacing Phase 27 visual stubs with wired handlers.

**Question branch** — extracted to `QuestionBubble` inner component (React hooks rules: `useState` cannot be in a conditional branch):
- `selected` state initialized per inputType: `0` for stepper, `[]` for multi-chip, `""` for text, `null` for single-chip
- `isValiderDisabled`: blocks commit when `committing`, when chip has no selection, when servings stepper < 1
- `handleValider`: calls `onPostAnswerTurn({ in_reply_to_turn_id: turn.id, field, value: selected })` with `setCommitting(true/false)` guard
- Chips show selected/unselected Tailwind classes; multi-chip toggles array membership
- Stepper uses `stepperStep` (1 for servings, 5 for time fields) with floor at 0
- Valider button: `w-full h-9 rounded-[10px] bg-primary` (UI-SPEC §Layout §3 locked CSS) + `Loader2` spinner when committing

**Advisory branch**:
- `resolution` prop check: when set, renders collapsed one-line `<div className="self-start px-3 py-1 text-[13px] text-muted-foreground italic">` using `tThread("advisory_resolved", { field, from, to, status })`
- `handleAccept`: calls `onPostProposalAccepted(turn.id)` with `setCommitting` guard
- `handleDismiss`: calls `onPostProposalDismissed(turn.id)` with `setCommitting` guard
- "Mettre à jour" button shows `Loader2` spinner when committing; "Ignorer" stays text (does not optimistically update)

**i18n keys consumed** (actual Phase 27 keys observed in fr.json):
- Question header: `promptLabel` passed directly as `SysHead` label (Phase 27 pattern — the prompt text IS the header)
- Advisory header: `t("sys_advisory_head")` = "Information : champ modifié manuellement"
- Valider CTA: `t("answer_valider")` = "Valider"
- Advisory accept: `t("advisory_accept")` = "Mettre à jour"
- Advisory dismiss: `t("advisory_dismiss")` = "Ignorer la suggestion"
- Collapsed resolved: `t("advisory_resolved")` ICU = "{field} : {from} → {to} ({status})"
- Stepper units: `t("stepper_unit_minutes")` = "min", `t("stepper_unit_servings")` plural ICU

**Summary branch**: CTAs remain visual stubs — deferred to Phase 29 per CONTEXT.md ("summary_complete/summary_later — DEFERRED").

### Task 3 — page.tsx handlers (commit `9e87433`)

**`frontend/app/recipes/[id]/page.tsx`**

Three new `useCallback` handlers added after `handlePostPhotoTurn`:

**`handlePostAnswerTurn(submission: AnswerTurnSubmission)`** — deps: `[id, recipe, tThread]`
1. Snapshots `prevRecipe`
2. Optimistically sets `recipe[submission.field] = submission.value` and adds field to `manually_edited_fields` (deduped + sorted via `Array.from(new Set([...]))`
3. POSTs `{ kind: "answer", payload: { in_reply_to_turn_id, field, value } }` to `/api/recipes/${id}/turns`
4. On failure: `setRecipe(prevRecipe)` + `toast.error(tThread("action_failed"))` + `throw err` (lets SystemBubble release `committing` state)

**`handlePostProposalAccepted(advisoryTurnId: string)`** — deps: `[id, recipe, turns, tThread]`
1. Finds advisory turn in `turns[]` by id
2. Reads `payload.field` + `payload.proposed_value`
3. Snapshots `prevRecipe`
4. Optimistically applies `proposed_value` and removes field from `manually_edited_fields`
5. POSTs `{ kind: "proposal_accepted", payload: { in_reply_to_turn_id: advisoryTurnId } }`
6. On failure: `setRecipe(prevRecipe)` + `toast.error(tThread("action_failed"))` + `throw err`

**`handlePostProposalDismissed(advisoryTurnId: string)`** — deps: `[id, tThread]`
1. POSTs `{ kind: "proposal_dismissed", payload: { in_reply_to_turn_id: advisoryTurnId } }`
2. No local state change (D-18)
3. On failure: `toast.error(tThread("action_failed"))` + `throw err`

`<RecipeThread>` mount extended with 4 new props:
- `manuallyEditedFields={recipe.manually_edited_fields ?? []}`
- `onPostAnswerTurn={handlePostAnswerTurn}`
- `onPostProposalAccepted={handlePostProposalAccepted}`
- `onPostProposalDismissed={handlePostProposalDismissed}`

## Deviations from Plan

### Auto-applied design decision: QuestionBubble inner component

**Found during:** Task 2, action step 4

**Issue:** The plan's Task 2 action text placed `const [selected, setSelected] = useState<unknown>(...)` directly inside the `kind === "question"` conditional branch of `SystemBubble`. React's rules of hooks forbid calling hooks inside conditionals — this would cause a runtime error ("Rendered more hooks than during the previous render").

**Fix:** Extracted the entire question rendering into a `QuestionBubble` inner component (defined after `SystemBubble` in the same file). `SystemBubble` renders `<QuestionBubble ... />` for the question branch. `committing` / `setCommitting` are passed as props so the outer component's shared state is still used. `selected` is a local state of `QuestionBubble`.

**Files modified:** `frontend/components/RecipeThread/SystemBubble.tsx`

**Commit:** `2fbc215`

### Build verification scope

**Found during:** Task 3 verification

**Issue:** `next build --webpack` in the worktree fails with `Cannot find module '@ducanh2912/next-pwa'` — the worktree has no local `node_modules` and the main repo's `node_modules` path cannot resolve relative module requires from the worktree path. This is a pre-existing worktree environment constraint, not caused by any change in this plan.

**Confirmed:** Running `next build --webpack` in `/Users/gulu3001/dev/al-dente/frontend` (main repo) succeeds cleanly with all pages built. TypeScript (`npx tsc --noEmit`) exits 0 from the worktree, confirming code correctness.

## Known Stubs

- `summary_complete` / `summary_later` buttons in `SystemBubble.tsx` remain visual stubs without `onClick` — deferred to Phase 29 per CONTEXT.md out-of-scope declaration.

## Threat Flags

None — all changes are frontend-only event handlers and UI state. No new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

All files exist:
- `frontend/components/RecipeThread/types.ts` — FOUND
- `frontend/components/RecipeThread/index.tsx` — FOUND
- `frontend/components/RecipeThread/SystemBubble.tsx` — FOUND
- `frontend/app/recipes/[id]/page.tsx` — FOUND
- `.planning/phases/28-recipe-detail-thread/28-03-SUMMARY.md` — FOUND

All commits exist:
- `208487c` feat(28-03): extend RecipeThreadProps + advisoryResolutions memo — FOUND
- `2fbc215` feat(28-03): wire SystemBubble chip/stepper/text + Valider + advisory CTAs — FOUND
- `9e87433` feat(28-03): add optimistic-state handlers for answer + proposal_accepted + proposal_dismissed — FOUND
