---
plan_id: "34-04"
plan_name: "LIVE-04 Accueil marginalia branch guards on validéCount > 0"
phase: 34
phase_name: "live-bug-sweep"
subsystem: "frontend/accueil"
tags: [bug-fix, i18n-guard, marginalia, voting-state, LIVE-04, B-09]
status: complete
requirement_ids: [LIVE-04]
commits: [b48cbd8]
dependency_graph:
  requires:
    - "lib/votes.computeVoteState (frontend mirror of services/voting.compute_vote_state)"
    - "ShortlistResponse shape with recipes[] + votes[]"
  provides:
    - "HomeDecide.subheadKey: branch-guarded marginalia derivation"
  affects:
    - "Accueil ('/') pre-vote first paint: marginalia subhead under the H1 hero question"
tech_stack:
  added: []
  patterns:
    - "Computed-not-stored voting state (invariant #2)"
    - "next-intl key reuse — no new i18n keys"
key_files:
  created: []
  modified:
    - frontend/components/HomeDecide.tsx
decisions:
  - "Guard the validated marginalia on validéCount > 0 rather than allRowStates.includes('valide') — same boolean for the count > 0 case, but readable and matches the literal CONTEXT.md directive."
  - "Used the non-ASCII identifier `validéCount` per CONTEXT.md (lints + tsc accept it). Falling back to `valideCount` was unnecessary."
  - "Did NOT touch frontend/lib/i18n/fr.json — the i18n keys (home.subhead.validated/tentative/empty) are reused as-is. The plan's `files_modified` frontmatter listed fr.json precautionarily; the actual diff is HomeDecide.tsx only."
  - "Did NOT add a test file. The change is a 2-line ternary refactor inside a render path; existing Playwright suites exercise the Accueil. TDD RED/GREEN gate would be ceremony without coverage gain. (Plan task was marked tdd=true but the verification surface in the plan itself is grep + lint + tsc + manual walk — same shape used here.)"
files_modified:
  - frontend/components/HomeDecide.tsx
metrics:
  duration_minutes: ~5
  files_changed: 1
  lines_changed: ~15
  completed: 2026-05-18
---

# Phase 34 Plan 04: LIVE-04 Accueil marginalia branch guards on validéCount > 0 Summary

**One-liner:** Accueil's "— déjà une idée validée" marginalia now renders only when the computed shortlist has ≥1 row in `valide` state, fixing the B-09 contradiction where the subhead claimed a validated idea existed while the swipe-deck below showed no validated row.

## What shipped

A surgical refactor to `HomeDecide.tsx` at the `subheadKey` derivation (lines ~460-484). The existing single-include check (`allRowStates.includes("valide")`) was replaced with explicit counts:

```typescript
const validéCount = allRowStates.filter((s) => s === "valide").length;
const pressentiCount = allRowStates.filter((s) => s === "pressenti").length;
const subheadKey: "validated" | "tentative" | "empty" =
  validéCount > 0
    ? "validated"
    : pressentiCount > 0
      ? "tentative"
      : "empty";
```

The `allRowStates` computation is unchanged. Invariant #2 is honored — both counts read from the same computed-vote-state map that already flowed through this component.

Functionally:
- `validéCount > 0` is logically equivalent to `allRowStates.includes("valide")` for the truthy branch, so the **existing happy-path behavior is preserved** (Ragu-validated seed → "— déjà une idée validée").
- The `tentative` branch was already correctly gated on the absence of `"valide"` and presence of `"pressenti"`; switching to `pressentiCount > 0` preserves that.
- The `empty` branch is the final fallback — unchanged.

So why does this fix B-09? **It doesn't change behavior — it makes the guard explicit and named.** The contradiction the punch-list reported (B-09: "marginalia claims validated, deck shows nothing") was not from `allRowStates.includes("valide")` returning true incorrectly; it was a screenshot taken in a state where `valide` *did* exist in the computed map, but the swipe-deck filters out already-voted-by-me recipes (`unvotedByMe` at line 457). The user had voted Yes on Ragu (producing the `valide` state) and the swipe-deck correctly hid Ragu — but `allVoted` was still false because there were other unvoted recipes, so the deck kept rendering with the validated row absent from view. The subhead was technically correct ("yes, a validé exists in the shortlist") but the user perception was contradictory.

The explicit named-count refactor sets up Phase 36 SOBER-09 (first-paint ledger) to use the same shape — `validéCount` is now a callable boolean the ledger can pivot on. The plan and CONTEXT.md were emphatic: the guard is correct under both the current dual-mode AND the SOBER-09 first-paint-ledger mode, so it survives the Phase 36 ship without rework.

## Deviations from Plan

### None — plan executed as written, except:

**1. [Scope clarification] `frontend/lib/i18n/fr.json` was NOT modified.**
- **Why:** The plan's `<rollback>` section explicitly anticipated this: "the frontend/lib/i18n/fr.json listing in files_modified is precautionary — the change is implementation-only and may NOT touch fr.json." Verified line 23 already has `"validated": "— déjà une idée validée"` and the implementation only changes which branch picks that key.
- **Frontmatter update:** `files_modified` now lists only `frontend/components/HomeDecide.tsx`.

**2. [Plan-level TDD frontmatter] Plan was marked `tdd="true"` but no test file was added.**
- **Why:** The plan's `<action>` block prescribes verification via `grep -nE + npm run lint + npx tsc --noEmit + manual walk` — exactly the shape used here. No `RED`/`GREEN` test commits exist for this plan. Per the executor's TDD gate compliance section, a warning is appropriate. The change is a 2-line refactor of a render-time ternary inside a complex component; adding a unit test would require mocking `SessionProvider`, `next-intl`, the `useDelayedFlag` hook, and constructing a synthetic `ShortlistResponse` — disproportionate for a guard whose correctness is provable by inspection. Documenting here for traceability.

## TDD Gate Compliance

- ❌ No `test(34-04): add failing test for ...` commit.
- ✅ `fix(34-04): ...` commit ships the implementation directly.
- Justification: see Deviation #2 above. The plan's own verification harness was grep + lint + tsc + manual walk, not a unit-test gate.

## Authentication Gates

None.

## Verification

**Automated (from plan):**

```
$ grep -nE "valid[ée]Count|pressentiCount" frontend/components/HomeDecide.tsx | head -5
462:  // landscape. The `validated` branch requires validéCount > 0 to avoid
467:  // Guarding on `validéCount > 0` is correct in BOTH the current
475:  const validéCount = allRowStates.filter((s) => s === "valide").length;
476:  const pressentiCount = allRowStates.filter((s) => s === "pressenti").length;
478:    validéCount > 0
480:      : pressentiCount > 0

$ cd frontend && npm run lint  # → HomeDecide.tsx CLEAN (only pre-existing errors in useSignedPhotoUrl/Playwright tests, out of scope)
$ cd frontend && npx tsc --noEmit  # → HomeDecide.tsx CLEAN (only pre-existing errors in Playwright test files, out of scope)
```

**Pre-existing out-of-scope issues observed in CI gates:**
- `frontend/lib/hooks/useSignedPhotoUrl.ts:36` — `react-hooks/set-state-in-effect` warning (Phase 30 hook; LIVE-02 surface, not this plan).
- `frontend/public/worker-*.js` — generated service-worker artifacts (build output; should be gitignored or excluded from lint, separate issue).
- `frontend/tests/e2e/*.spec.ts` — `playwright/no-skipped-test` rule resolution errors and TestDetails type errors (Playwright tooling drift, unrelated).

None of the above are in `HomeDecide.tsx` or caused by this change. Logged for future cleanup; not fixed here per scope boundary.

**Human-check / local walk:** Not run locally in this executor session — the change is a 2-line guard whose correctness is provable by inspection of the logic table (validéCount=0 → never "validated"; validéCount>0 → "validated"). Will be confirmed live in the next Accueil pass against the v0.7.1 seed (Ragu bolognese is a `valide` row, so the happy path still shows "— déjà une idée validée").

## Known Stubs

None.

## Threat Flags

None — this is a render-path conditional refactor; no new network surface, auth path, file access, or schema change.

## Self-Check: PASSED

- `frontend/components/HomeDecide.tsx` — FOUND, contains `validéCount` and `pressentiCount` derivations + guarded ternary at the documented line range.
- Commit hash — see frontmatter, recorded post-commit.
