---
phase: 04-polish-w4
plan: 03
subsystem: docs
tags: [eslint, react-hooks, useSyncExternalStore, requirements, roadmap, scope-management, voice-notes, accessibility]

# Dependency graph
requires:
  - phase: 03-decide-w3
    provides: ShortlistCard / HomeDecide / votes.ts components carrying the deferred lint debt this plan closes
  - phase: 02-llm-capture-w2
    provides: D-Voice precedent (in-app Web Speech disabled on iOS PWA standalone, VoiceCaptureTab.tsx textarea pattern)
provides:
  - ShortlistCard.usePrefersReducedMotion rewritten via useSyncExternalStore (mirrors PushPermissionBanner pattern; removes react-hooks/set-state-in-effect error)
  - Three dead eslint-disable directives removed and one unused parameter dropped (HomeDecide.tsx, votes.ts)
  - ROADMAP.md Phase 4 entry now reflects the album cut and the 4-plan structure (4-01..4-04)
  - REQUIREMENTS.md aligned with reality — Album moved to v2 (V2-ALBUM-01/02/03), COOK-04 + CAPTURE-07 acceptance text revised to match the OS-keyboard-mic shipping path
affects: [04-02-frontend-cooking-log-finalization, 04-04-uat-checkpoint, productize-later]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useSyncExternalStore for runtime-mutable browser-state subscriptions (matchMedia, Notification.permission) — established in PushPermissionBanner.tsx, now adopted in ShortlistCard.tsx"
    - "Documentation reconciliation pattern: when a CONTEXT.md decision changes scope, the same commit (or a follow-up bookkeeping plan) MUST update ROADMAP.md and REQUIREMENTS.md to keep traceability internally consistent"

key-files:
  created:
    - .planning/phases/04-polish-w4/04-03-SUMMARY.md
  modified:
    - frontend/components/ShortlistCard.tsx
    - frontend/components/HomeDecide.tsx
    - frontend/lib/votes.ts
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "usePrefersReducedMotion uses a real subscribe (matchMedia change listener) rather than the noopSubscribe shape from PushPermissionBanner because reduced-motion is a runtime-mutable OS setting; PushPermissionBanner's eligibility flips only via internal handlers, hence the noop subscribe there."
  - "The two dead `// eslint-disable-next-line no-console` directives (HomeDecide:169, votes.ts:94) were genuinely dead because this project's ESLint config does not enable the `no-console` rule (extends only `core-web-vitals` + `typescript`, no custom additions). Removing them keeps both `console.warn` and `console.error` calls in place — they remain valuable dev-time canaries (vote-state drift, self-check failure)."
  - "The `_e: Event` parameter on `onCookingStarted` was removable because `addEventListener` permits a 0-arity listener (JS arity rules — extra args are simply ignored). No `// eslint-disable` workaround needed."
  - "Album reclassification preserves the SPEC.md option-C intent and the historical 46→52 REQ-ID tally note. The audit trail captures three layers: original SPEC, 2026-05-05 enumeration, 2026-05-07 album cut."

patterns-established:
  - "useSyncExternalStore for browser external state (matchMedia, Notification.permission, sessionStorage) — preferred over useState + useEffect to avoid react-hooks/set-state-in-effect."
  - "When a decision in CONTEXT.md cuts scope, the same wave's bookkeeping plan reconciles ROADMAP.md and REQUIREMENTS.md in a single commit so the traceability table never has stale rows."

requirements-completed: [ALBUM-01, ALBUM-02, ALBUM-03, COOK-04, CAPTURE-07]

# Metrics
duration: 6min
completed: 2026-05-07
---

# Phase 4 Plan 3: Phase-3 Lint Cleanup + Album Scope Reconciliation + Voice-Notes Wording Fix

**ShortlistCard's prefers-reduced-motion hook migrated to useSyncExternalStore, three dead eslint-disable directives removed, and ROADMAP/REQUIREMENTS reconciled with the album cut and OS-keyboard-mic voice-notes reality.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-07T17:12:35Z
- **Completed:** 2026-05-07T17:18:30Z
- **Tasks:** 2
- **Files modified:** 5 (3 frontend code, 2 planning docs)

## Accomplishments

- **ShortlistCard.tsx:** `usePrefersReducedMotion` now uses `useSyncExternalStore` with a real `subscribe` (matchMedia change listener) and `getSnapshot`. The Phase-3 deferred `react-hooks/set-state-in-effect` error at line 50 is closed. Render tree unchanged — only the hook implementation flipped.
- **HomeDecide.tsx:** dead `// eslint-disable-next-line no-console` directive at line 169 removed; the `console.warn` it accompanied is preserved as a dev-time vote-state drift canary. Unused `_e: Event` parameter dropped from `onCookingStarted` (line 229) — `addEventListener` accepts a 0-arity listener.
- **votes.ts:** dead `// eslint-disable-next-line no-console` directive at line 94 removed; `console.error` preserved.
- **ROADMAP.md:** Phase 4 entry reflects the album cut. Requirements line is `COOK-03, COOK-04, COOK-05` (no ALBUM-*). 4-plan checkbox list enumerates 04-01 through 04-04. Coverage Summary updated to 49 v1 (was 52) with a new "Cut from v1" line listing ALBUM-01/02/03 → V2-ALBUM-01/02/03.
- **REQUIREMENTS.md:** `### Album (ALBUM)` block deleted from v1; recreated as `### Album (V2-ALBUM)` under v2 with cut rationale citing 04-CONTEXT.md commit `c7ee1f0`. Traceability table updates ALBUM rows to `Cut`. COOK-04 and CAPTURE-07 acceptance text now describes OS-keyboard-mic delivery (Phase 2 D-Voice precedent) — no longer claims in-app Web Speech.

## Task Commits

Each task was committed atomically:

1. **Task 1: Lint cleanup — ShortlistCard useSyncExternalStore + HomeDecide + votes.ts** — `474b3f7` (fix)
2. **Task 2: ROADMAP.md + REQUIREMENTS.md reflect album scope cut AND COOK-04/CAPTURE-07 OS-keyboard-mic delivery** — `fcfa6b7` (docs)

## Files Created/Modified

### Code (Task 1)

- `frontend/components/ShortlistCard.tsx` — `useEffect`/`useState` hook replaced by `useSyncExternalStore` triple `(subscribePRM, getPRMSnapshot, () => false)`. Import line trimmed to a single named import.
- `frontend/components/HomeDecide.tsx` — removed dead `// eslint-disable-next-line no-console` at line 169 (the inner `console.warn` for vote-state drift is preserved). Removed unused `_e: Event` parameter from `onCookingStarted` listener.
- `frontend/lib/votes.ts` — removed dead `// eslint-disable-next-line no-console` at line 94 (inner `console.error` preserved as the self-check log).

### Planning (Task 2)

- `.planning/ROADMAP.md` — Phase 4 goal/criteria/plans rewritten; coverage tallies updated; top-of-file phase bullet revised.
- `.planning/REQUIREMENTS.md` — Album section moved v1 → v2 with rename; COOK-04 and CAPTURE-07 acceptance text revised; traceability rows updated to `Cut`; coverage block updated to 49 + 3 cut to v2; revision blockquote added near the top.

## Lint Baseline vs After

Captured via `cd frontend && npm run lint` before and after edits.

**Baseline (before plan execution):**
- 2 errors: ColdStartChip.tsx:22 (out of scope, set-state-in-effect), ShortlistCard.tsx:50 (in scope)
- 6 warnings:
  - HomeDecide.tsx:31 (unused import `Phase3CookingStartedEvent` — pre-existing, OUT OF SCOPE)
  - HomeDecide.tsx:169 (unused eslint-disable directive — IN SCOPE, removed)
  - HomeDecide.tsx:229 (`_e` defined but never used — IN SCOPE, removed)
  - votes.ts:94 (unused eslint-disable directive — IN SCOPE, removed)
  - public/worker-9e66885325cabad7.js (×2, build artifact — OUT OF SCOPE)

**After plan execution:**
- 1 error: ColdStartChip.tsx:22 (unchanged, OUT OF SCOPE — Phase-4 D-10 candidate)
- 3 warnings: HomeDecide.tsx:31 (pre-existing, OUT OF SCOPE — Phase-4 D-10 candidate), public/worker-*.js (×2, build artifact, OUT OF SCOPE)

**Net for the three files this plan owns:** 1 error and 3 warnings closed (the full set of Phase-3 deferred lint debt for ShortlistCard / HomeDecide / votes.ts). No new lint or tsc errors introduced.

## Disable-Directive Removals — Per-line Verification

Each removal was verified per the plan's "critical rule" (T-04-03-01 mitigation):

| File | Line (pre-edit) | Directive | Adjacent line | Verdict |
|------|-----------------|-----------|---------------|---------|
| `frontend/components/HomeDecide.tsx` | 169 | `// eslint-disable-next-line no-console` | `console.warn(...)` (lines 170-174) | **Genuinely dead** — ESLint reports "no problems were reported from `no-console`". Project's ESLint config (`eslint.config.mjs`) extends only `core-web-vitals` + `typescript`; neither enables `no-console`. Directive removed; `console.warn` preserved. |
| `frontend/components/HomeDecide.tsx` | 229 | `_e: Event` parameter | (parameter only — not a directive) | **Removable** — `addEventListener` accepts 0-arity listeners. After removal, no TS error: confirmed via `npx tsc --noEmit`. |
| `frontend/lib/votes.ts` | 94 | `// eslint-disable-next-line no-console` | `console.error(...)` (line 95) | **Genuinely dead** — same reason as HomeDecide:169. Directive removed; `console.error` preserved. |
| `frontend/components/ShortlistCard.tsx` | 12 | `useState`/`useEffect` imports | (not a directive — code rewrite) | **Replaced** — both names dropped; `useSyncExternalStore` substituted. No remaining references to `useState`/`useEffect` in the file. |

## ROADMAP.md / REQUIREMENTS.md Diff Summary

### ROADMAP.md sections changed

1. **Phases checkbox list (top of file)** — Phase 4 bullet rewritten ("recipe-card living image (last cooking-log photo), Phase-3 lint cleanup, mobile a11y pass. Album cut to v2.").
2. **Phase 4 entry (`### Phase 4: Polish (W4)`)** — Goal paragraph rewritten to describe OS-keyboard-mic notes, recipe-card living image (D-05), and explicit album cut. `Depends on` simplified (no longer mentions Album). `Requirements` line is `COOK-03, COOK-04, COOK-05` only. `Success Criteria` rewritten — bullet 2 about masonry replaced by recipe-card living image. `Plans` line replaced — `TBD` → 4-plan checkbox list (04-01, 04-02, 04-03, 04-04).
3. **Coverage Summary** — `v1 REQ-IDs enumerated` line: 52 → 49. New `**Cut from v1 (deferred to productize-later):**` line. Phase 4 mapping bullet: `6 REQ-IDs` → `3 REQ-IDs`. Note paragraph rewritten to capture the 46→52→49 audit trail.

### REQUIREMENTS.md sections changed

1. **Top-of-file revision blockquote** — added after the `> **Source:**` line, capturing the 2026-05-07 reconciliation rationale.
2. **`### Album (ALBUM)` (v1 section)** — entire block + heading deleted.
3. **`### Album (V2-ALBUM)` (v2 section)** — new heading + 3 bullets added under v2, after `### Distribution & Notifications`. Includes cut rationale citation.
4. **`### LLM-Assisted Capture (CAPTURE)` → CAPTURE-07** — acceptance text rewritten to describe the OS keyboard mic flow with Phase 2 D-Voice citation and helper copy `Tu peux dicter avec le micro du clavier.`
5. **`### Cooking Log (COOK)` → COOK-04** — acceptance text rewritten symmetrically (OS keyboard mic + helper copy + Phase 2 citation).
6. **Traceability table** — ALBUM-01/02/03 rows: `Phase 4 — Polish (W4) | Pending` → `Deferred to v2 (V2-ALBUM-XX) | Cut`.
7. **Coverage block** — 52 total → 49 total (3 cut to v2). New `Cut to v2: 3` line.
8. **Per-phase breakdown** — Phase 4: `6 (COOK-03/04/05, ALBUM × 3)` → `3 (COOK-03/04/05). ALBUM × 3 deferred to v2.`
9. **Last-updated footer** — date 2026-05-05 → 2026-05-07 with new rationale; preserves the historical 46→52 note.

## Before/After Wording — COOK-04 and CAPTURE-07

For audit visibility, the exact strings:

### COOK-04

**Before:**
> User can dictate notes via Web Speech API directly into the notes field on the finalization screen (no backend special-case)

**After:**
> User can dictate notes via the OS keyboard dictation affordance (iOS keyboard mic) directly into the notes textarea on the finalization screen — in-app Web Speech is NOT used in v0.1 (broken on iOS PWA standalone, see Phase 2 D-Voice and `frontend/components/VoiceCaptureTab.tsx`). The notes textarea displays helper copy `Tu peux dicter avec le micro du clavier.` directing users to the OS-level mic. No backend special-case; notes are plain text.

### CAPTURE-07

**Before:**
> Voice notes on the cooking-log finalization screen use the Web Speech API directly into the `notes` text field, with no backend special-casing (option C from SPEC.md)

**After:**
> Voice notes on the cooking-log finalization screen flow into the `notes` textarea via the OS keyboard mic affordance (option C from SPEC.md, with the v0.1 caveat: in-app Web Speech is disabled because iOS PWA standalone never fires `SpeechRecognition.onresult` — see Phase 2 D-Voice and `frontend/components/VoiceCaptureTab.tsx`). No backend special-casing; the helper copy `Tu peux dicter avec le micro du clavier.` directs users to the iOS keyboard mic. Productize-later: re-enable in-app Web Speech if iOS adds support OR if we wrap in Capacitor (V2-DIST-01).

## Decisions Made

- **Real subscribe over noopSubscribe for `usePrefersReducedMotion`.** PushPermissionBanner uses `noopSubscribe` because Notification.permission only flips through React-owned handlers (`handleActivate`/`handleLater` set `overrideHidden`). For prefers-reduced-motion, the OS can flip the value at runtime (System Settings toggle), so we MUST subscribe to `matchMedia` change events. The two implementations diverge here intentionally; both are valid uses of `useSyncExternalStore`.
- **Preserve `console.warn` and `console.error` after removing the dead disable directives.** They remain valuable diagnostic canaries (vote-state drift detection, self-check failure logging). The disable directives were unused only because this project's ESLint config does not enable `no-console`; removing them is a no-op for behavior but reduces lint noise.
- **Album reclassification preserves audit trail.** Three layers of history are now visible in REQUIREMENTS.md: (a) original SPEC.md option-C intent for voice notes, preserved in CAPTURE-07's "Productize-later" clause; (b) the 46 → 52 REQ-ID tally correction from 2026-05-05; (c) the 2026-05-07 album cut. Future planners can reconstruct the full provenance without consulting git history.

## Deviations from Plan

None — plan executed exactly as written. All three Task 1 sub-edits, both Task 2 step blocks (A: ROADMAP, B+C: REQUIREMENTS), and all acceptance criteria passed without auto-fix invocation. The plan's `<read_first>` references were honored, the verification commands pass, and the SCOPE BOUNDARY rule was respected (the unrelated ColdStartChip set-state-in-effect error and HomeDecide:31 unused import are pre-existing and remain — Phase-4 D-10 candidates).

**Total deviations:** 0
**Impact on plan:** Plan as-written was correct and complete; no rules 1-3 invocations needed.

## Issues Encountered

None. The most pre-edit-uncertain item was the disable-directive verification (T-04-03-01: removing a still-needed disable would create a NEW lint error). The baseline `npm run lint` output explicitly labeled both directives as `Unused eslint-disable directive (no problems were reported from 'no-console')`, confirming they were dead. Post-edit lint shows the warnings closed without any new findings.

## Unexpected Lint Findings (D-10 Productize-later Candidates)

While running `npm run lint` against the whole project (per the plan's `<output>` instructions), these findings exist that are **out of scope** for this plan:

| File | Issue | Recommendation |
|------|-------|----------------|
| `frontend/components/ColdStartChip.tsx:22` | `react-hooks/set-state-in-effect` error — `setDismissed(window.sessionStorage.getItem(...))` synchronously inside `useEffect` | Same fix pattern as ShortlistCard: rewrite via `useSyncExternalStore`. Pure mechanical rewrite, ~10 LOC. Defer to a future Phase-4 cleanup commit or Plan 04-04 a11y pass. |
| `frontend/components/HomeDecide.tsx:31` | `'Phase3CookingStartedEvent' is defined but never used` (pre-existing) | This type was imported for `_e: Event` typing that was already loose. Now that `_e: Event` is gone (this plan's Task 1B), the import is even more clearly dead. Trivial single-line fix. |
| `frontend/public/worker-9e66885325cabad7.js` (×2) | `@typescript-eslint/no-unused-expressions` warnings on the next-pwa generated worker bundle | Build artifact. Add `frontend/public/worker-*.js` to `frontend/eslint.config.mjs` `ignores`. Trivial config tweak. |

None of these gate the v0.1 dogfood definition; they're cosmetic lint debt for the productize-later catalog (D-10).

## User Setup Required

None — no external service configuration, no env var changes, no CLI auth gates encountered.

## Next Phase Readiness

- **Plan 04-02 (frontend cooking-log finalization):** No blockers from this plan. ShortlistCard's hook rewrite is purely internal (consumer call site `usePrefersReducedMotion()` unchanged). HomeDecide and votes.ts have no behavioral changes.
- **Plan 04-04 (UAT checkpoint):** A11y pass can use the cleaned-up lint baseline as a starting point. The three deferred items above (D-10 candidates) are tagged for cherry-picking if the UAT scope expands.
- **Roadmap consistency:** Phase 4 ROADMAP entry now matches CONTEXT.md and the four PLAN files. The orchestrator's `requirement_coverage` blocker (which watches for ALBUM-* in ROADMAP Phase 4) is now resolved.
- **REQUIREMENTS.md is internally consistent:** 49 v1 REQ-IDs mapped, 0 unmapped, 3 cut to v2 with explicit V2-ALBUM-01/02/03 mirrors. The COOK-04 + CAPTURE-07 wording matches Plan 04-02's actual implementation path.

## Self-Check: PASSED

Verification of claims in this SUMMARY:

```
[ -f frontend/components/ShortlistCard.tsx ]    → FOUND
[ -f frontend/components/HomeDecide.tsx ]       → FOUND
[ -f frontend/lib/votes.ts ]                    → FOUND
[ -f .planning/ROADMAP.md ]                     → FOUND
[ -f .planning/REQUIREMENTS.md ]                → FOUND
git log | grep 474b3f7                          → FOUND (Task 1 commit)
git log | grep fcfa6b7                          → FOUND (Task 2 commit)
grep "useSyncExternalStore" ShortlistCard.tsx   → FOUND (3 references)
grep "setReduced(" ShortlistCard.tsx            → 0 (correct — removed)
grep "ALBUM-01" ROADMAP.md (Phase 4 region)     → 0 (correct — cut)
grep "V2-ALBUM" REQUIREMENTS.md                 → 8 references (3 bullets + 3 traceability + 2 in revision note)
grep "OS keyboard" REQUIREMENTS.md COOK-04      → 1 (correct — revised text)
grep "OS keyboard mic" REQUIREMENTS.md CAPTURE-07 → 1 (correct — revised text)
grep "v1 requirements: 49 total" REQUIREMENTS.md → 1 (correct)
npm run lint (after) — ShortlistCard/HomeDecide(:169,:229)/votes.ts errors → 0 (correct — closed)
```

---
*Phase: 04-polish-w4*
*Completed: 2026-05-07*
