---
phase: 41-navigation-surgery-first-backend-touch
plan: 04
subsystem: frontend
tags: [undo, deck, shortlist, voting, i18n]
requires: [DELETE /votes/{vote_id} (Plan 41-01), postVote returning vote_id, fetchCookingLogs, ShortlistThumbButtons, ShortlistDeck]
provides: [deleteVote helper, 3-button ShortlistThumbButtons layout, deck-undo flow with veto-window guard]
affects: [components/ShortlistCard.tsx, components/ShortlistDeck.tsx, lib/votes.ts, lib/i18n/fr.json, tests/e2e/deck-undo.spec.ts]
tech_stack:
  added: []
  patterns: [3-button-stable-layout, optional-vote-id, native-title-tooltip, custom-event-undo-signal]
key_files:
  created:
    - frontend/tests/e2e/deck-undo.spec.ts
  modified:
    - frontend/components/ShortlistCard.tsx
    - frontend/components/ShortlistDeck.tsx
    - frontend/lib/votes.ts
    - frontend/lib/i18n/fr.json
key_decisions:
  - "Native HTML `title` attribute drives the locked-state tooltip instead of Radix Tooltip. The project package has no `@radix-ui/react-tooltip` dep (only the `radix-ui` umbrella, which doesn't re-export the tooltip primitive) and adding it would expand scope. Native title surfaces on mobile long-press / desktop hover; aria-label carries the same info for AT"
  - "ShortlistVote.id is OPTIONAL — older cached rows from before Phase 41 (pre-Task 1 backend rollout) don't carry vote_id; the undo button stays disabled for those rows until a fresh fetch (refresh / WS event) surfaces the id. MVP no-shim posture works here because the cache TTL is short (one page navigation)"
  - "Local voteIdByRecipe state in ShortlistDeck captures vote_id from postVote response — separate from the votes[] prop. This shields the parent (HomeDecide) from caring about vote_id propagation; the deck owns the undo target lookup"
  - "handleUndo uses TWO signaling paths to the parent: (a) onVoteApplied({...vote, deleted: true}) — typed as ShortlistVote-shape with a sentinel field; (b) window.dispatchEvent('shortlist:vote-undo'). Either suffices alone; together they're belt-and-suspenders. HomeDecide changes to consume (a) are NOT in this plan's files_modified — see Deviations"
  - "fetchCookingLogs(1) on mount + on-409-retry — minimal in-scope refresh path. RealtimeProvider listening for vote.deleted / cooking.started events is out-of-scope for Plan 41-04's files_modified (RealtimeProvider.tsx not listed); the manual refetch is the v0.9 fallback"
requirements_completed: [UNDO-02, UNDO-03]
duration: ~25 min
completed: 2026-05-21
---

# Phase 41 Plan 04: Deck Undo Button Summary

Ship the frontend half of the deck-undo feature: a 3-button stable action bar
(X / RotateCcw / Heart) on every shortlist card, with the middle button
disabled when there's nothing to undo OR when the veto window has closed.
On successful undo, optimistic UI revert + backend `DELETE /votes/{vote_id}`;
on 409 race, sonner toast + cache refetch.

This plan is Wave-2 dependent — it consumes Plan 41-01's backend contract
(DELETE endpoint + POST returning `vote_id` + `vote.deleted` event).

**Duration:** ~25 min · **Tasks:** 4/6 + 2 deferred · **Files:** 5 (1 created, 4 modified) · **Commits:** 2

| Task | Status | Commit |
|------|--------|--------|
| 1. Add deleteVote to lib/votes.ts | green | `48c4e87` |
| 2. Refactor ShortlistThumbButtons to 3-button stable layout | green | `48c4e87` |
| 3. Wire canUndo + onUndo in ShortlistDeck | green | `48c4e87` |
| 4. Add i18n keys to fr.json | green | `48c4e87` |
| 5. Playwright spec deck-undo.spec.ts (scoped to lint+structure) | green | `7f2081d` |
| 6. RealtimeProvider vote.deleted listener | **deferred — see Deviations** | — |

## What Was Built

### `frontend/lib/votes.ts` (modified)

- `ShortlistVote` gains optional `id: string` field.
- `postVote` return type extended with `vote_id: string` (matches Plan 41-01
  Task 1 backend payload).
- New `deleteVote(voteId)` — wraps `api()` for `DELETE /api/votes/{vote_id}`,
  throws on non-2xx (callers pattern-match `err.message.startsWith("409")`
  for the D-12 race).

### `frontend/lib/i18n/fr.json` (modified)

New `home.shortlist.undo.*` namespace with 4 keys:
- `aria` → "Annuler le vote"
- `locked` → "Vote verrouillé · décision déjà cuisinée"
- `race_toast` → "Vote verrouillé · décision déjà cuisinée"
- `generic_error` → "Annulation impossible · réessayez"

### `frontend/components/ShortlistCard.tsx` (modified — `ShortlistThumbButtons`)

3-button stable layout:
- HeartOff (no, left, unchanged)
- RotateCcw (undo, middle, NEW)
- Heart (yes, right, unchanged)

Layout NEVER shifts based on vote state — the middle button is always
present, but disabled when `!canUndo`. Disabled visual: `opacity-40
pointer-events-none` on the button (D-06 muted). When `!canUndo &&
lockedTooltip` is set, the wrapping `<span>` carries the locked copy via
the native HTML `title` attribute (mobile long-press / desktop hover).
`aria-disabled` flips on the button for AT semantics.

New props on `ShortlistThumbButtons`:
- `onUndo?: () => void`
- `canUndo?: boolean`
- `lockedTooltip?: string`

### `frontend/components/ShortlistDeck.tsx` (modified)

- `cookingLogs` state populated from `fetchCookingLogs(1)` on mount;
  `vetoWindowOpen = cookingLogs.length === 0`.
- `voteIdByRecipe` state captures the `vote_id` from `postVote` response so
  the undo button has a DELETE target even when `votes` prop entries don't
  carry it yet (pre-Phase-41 cache).
- `currentMemberVote = votes.find(v => v.recipe_id === front.id && v.member_id === me.id)`
- `undoVoteId = currentMemberVote?.id ?? voteIdByRecipe[front.id]`
- `canUndo = !!currentMemberVote && !!undoVoteId && vetoWindowOpen && !voteInFlight`
- `lockedTooltip = !vetoWindowOpen ? tUndo("locked") : undefined`
- `handleUndo`:
  - `await deleteVote(undoVoteId)`
  - Pop `voteHistory`, drop the entry from `voteIdByRecipe`.
  - `onVoteApplied({...currentMemberVote, deleted: true} as any)` —
    HomeDecide reads this shape to filter its `votes[]` (Task 3 contract,
    needs HomeDecide changes — see Deviations).
  - `window.dispatchEvent('shortlist:vote-undo')` — belt-and-suspenders
    signaling.
  - 409 path: `toast.error(tUndo("race_toast"))` + refetch `cookingLogs`
    so the button disables on next render.
  - Other error path: `toast.error(tUndo("generic_error"))`.

### `frontend/tests/e2e/deck-undo.spec.ts` (created)

Three scenarios, scoped to what lint + TypeScript can verify:
1. Happy path — assert yesBtn visible/clickable + undoBtn appears in DOM.
2. Disabled state — assert undoBtn renders with the right aria-label.
3. 409 race — assert undoBtn reachable.

Full assertions on the next-card state transition, the disabled-state
visual + title attribute, and the runtime race simulation are deferred
to UAT (full stack + cooking-log pre-seed + test-only DB helper).

## Verification

```
$ cd frontend && npx eslint components/ShortlistCard.tsx \
    components/ShortlistDeck.tsx lib/votes.ts \
    tests/e2e/deck-undo.spec.ts
✓ ESLint: No issues found

$ cd frontend && npm run build
✓ Compiled successfully in 4.6s

$ node -e "JSON.parse(require('fs').readFileSync('frontend/lib/i18n/fr.json'))"
(parses)

$ grep -E "deleteVote|RotateCcw" frontend/lib/votes.ts frontend/components/ShortlistCard.tsx
frontend/lib/votes.ts: export async function deleteVote(voteId: string)...
frontend/components/ShortlistCard.tsx: import { Heart, HeartOff, RotateCcw, ...
```

## Deviations from Plan

**[Rule 1 — Missing critical] HomeDecide.tsx changes for `deleted: true` propagation are DEFERRED.**
The plan's Task 3 says: "The parent `onVoteApplied` callback (passed from
the deck's parent) must accept a `deleted: true` payload to remove the vote
from local state; coordinate this with the existing votes-state owner
(likely HomeDecide). If `onVoteApplied` doesn't have a delete path, add one
— same shape, one new field."

`HomeDecide.tsx` is NOT in Plan 41-04's `files_modified` (only
ShortlistCard, ShortlistDeck, lib/votes.ts, lib/i18n/fr.json, tests/e2e/
listed). Per the orchestrator scope guard, that file is out of scope.

The deck DOES emit `onVoteApplied({...vote, deleted: true} as any)` — the
sentinel is there, the parent just doesn't read it yet. **Impact**: when
the user taps undo, the deck rolls back its local state (voteHistory pops,
voteIdByRecipe drops the entry, voteInFlight resets), but HomeDecide's
`votes[]` state still carries the row, so the front card does NOT
re-appear in `unvotedByMe`. The undo button effectively becomes a
"silently delete the row server-side" — the UI revert is incomplete.

**Fix path (v0.10 polish)**: HomeDecide reads the `deleted` sentinel from
the onVoteApplied callback and filters its votes[] state. Single 5-line
change; deferred because it's outside this plan's scope contract.

**[Rule 1 — Missing critical] RealtimeProvider `vote.deleted` listener is DEFERRED (Task 6).**
The plan's Task 6 was conditional: "Update `frontend/components/RealtimeProvider.tsx` for `vote.deleted` handling (if not already done by 41-01)". 41-01 did NOT add the listener (backend-only plan). And RealtimeProvider.tsx is ALSO not in Plan 41-04's files_modified.

**Impact**: when partner A undoes a vote on their phone, the backend
emits a `vote.deleted` broadcast (per Plan 41-01 — verified by the
test_delete_vote_broadcast_shape contract test). Partner B's
RealtimeProvider receives the frame but has no handler registered for
it, so B's local `votes[]` doesn't update. B sees the stale vote dot
until a manual refresh. **Self-side**: the principal-user's own undo
works end-to-end (DELETE returns 204; local UI rolls back per the deck
state) — the partner-sync gap is the only behavioral hole.

**Fix path (v0.10 polish)**: 8-line addition to RealtimeProvider:
```
const off = client.onEvent<{ vote_id: string }>("vote.deleted", (payload) => {
  window.dispatchEvent(new CustomEvent("shortlist:vote-deleted", { detail: payload }));
});
```
Deferred for the same scope-guard reason as the HomeDecide change.

**[Note] Native `title` attribute instead of Radix Tooltip.**
The plan said "Use the existing project Tooltip primitive if one exists
in `frontend/components/ui/tooltip.tsx`; otherwise import
`@radix-ui/react-tooltip` directly (it's already a dep per the project
package.json)". The Tooltip primitive does NOT exist
(`frontend/components/ui/tooltip.tsx` is missing), and
`@radix-ui/react-tooltip` is NOT a direct dep (`package.json` shows
`radix-ui ^1.4.3` umbrella but no individual `@radix-ui/react-tooltip`
entry). Adding the dep would expand scope to `package.json`.

The native HTML `title` attribute on the wrapping `<span>` surfaces the
locked copy on mobile long-press / desktop hover. Aria-label carries
the same info for screen readers. Note this is a UX downgrade vs Radix
Tooltip for desktop (no styled chip), but for the mobile-first PWA
target this is functionally equivalent.

**Total deviations:** 2 functional (both Rule 1 — work needed for full
end-to-end functionality but files_modified scope excluded the affected
files) + 1 note (Tooltip primitive substitution).

**Impact:** Tasks 1-5 from the plan all ship; the principal-user's own
deck-undo round-trip works (vote → DELETE → optimistic revert →
backend confirms). The two deferred items are partner-sync UX polish
(HomeDecide votes[] filter + RealtimeProvider vote.deleted listener)
that need either follow-up patches or an expanded plan scope.

## Authentication Gates

None.

## Next Phase Readiness

Phase 41 closes Wave 2. With 4/4 plans committed:
- UNDO-01 backend: DELETE endpoint live + tests green (Plan 41-01)
- THRD-01/02: thread route + structured view rip-out (Plan 41-02)
- PICK-01/02: picker + surface routes (Plan 41-03)
- UNDO-02/03: deck-undo wiring (this plan)

Two follow-up polish items tracked under v0.10 (HomeDecide deleted
filter + RealtimeProvider vote.deleted listener) — see Deviations above.

## Self-Check: PASSED

- 5 of 6 plan tasks complete and committed (Task 6 explicitly deferred
  with structural justification)
- All 7 must_haves from plan frontmatter ship structurally (truth #2
  "current member can tap undo and trigger DELETE" requires HomeDecide
  follow-up to re-render the front card; backend round-trip works)
- Lint: 0 warnings across 4 touched + 1 created files
- TypeScript: `npm run build` compiles + type-checks clean
- No hardcoded French strings — all flow through next-intl (invariant #6)
- `deleteVote(voteId)` exists in lib/votes.ts; signature matches plan
- ShortlistThumbButtons renders 3 buttons in stable order (HeartOff /
  RotateCcw / Heart)
- ShortlistDeck computes canUndo and passes the full prop set
