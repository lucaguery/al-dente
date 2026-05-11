# Phase 15 — Plan 03 Summary

**Plan:** 15-03 — Frontend `MEMBER_COUNT` removal + 5-state regression canary
**Status:** COMPLETE
**Date:** 2026-05-11
**Tasks:** 3/3

## What shipped

### Task 1 — `frontend/components/HomeDecide.tsx`
Commit `feb96f2` — `fix(15-03): drop MEMBER_COUNT hardcode from HomeDecide (INV-01)`

- Removed `const MEMBER_COUNT = 2; // v0.1: hard-coded household size; multi-tenant clean.` from line 52.
- 3 call sites now thread `session?.members.length ?? 0`:
  - Drift detector inside `onVoteCreated` (was line 168) — uses `session?.members.length ?? 0`.
  - Deal-able filter `dealableRecipes` (was line 431) — uses `session.members.length` (narrowed after the `!session || !me` render guard).
  - `<VoteSummary>` call site (was line 480) — `memberCount` prop **removed entirely** because VoteSummary now consumes `useSession()` directly (Task 2).
- Render guards at lines 340-348 (`!session || !me`) and 356-381 (`!partner`) preserved byte-identical.
- `useSession` import at line 26 preserved byte-identical.

### Task 2 — `frontend/components/VoteSummary.tsx`
Commit `57cf2d9` — `fix(15-03): consume useSession() in VoteSummary; drop memberCount prop (INV-01)`

- Added `import { useSession } from "@/components/SessionProvider";` at line 17.
- Removed `memberCount?: number;` from `VoteSummaryProps` (was line 35).
- Removed `memberCount = 2,` from the destructure (was line 83).
- Component body now reads `const { session } = useSession(); const memberCount = session?.members.length ?? 0;` (lines 97-98).
- `useMemo` dep array (line 113) unchanged — `memberCount` is now a local binding from session, so `[recipes, votes, me.id, partner.id, memberCount]` continues to work.
- D-15-03 short-circuit: when `session` is null (loading), `memberCount = 0`. Defense-in-depth — HomeDecide's upstream `!session || !me` render guard precludes VoteSummary mounting with session=null in production.
- Chip class strings (`chipClass`, `rowBgClass`) untouched — color tokens are Phase 20.

### Task 3 — `frontend/tests/e2e/vote-state-n-members.spec.ts`
Commit `24406b3` — `test(15-03): add INV-01 vote-state 5-chip regression canary (seeded project)`

Seeded-project Playwright spec asserting the 5-state vote chip renders the correct French label:
- **valide** — `Ragu bolognese` (both yes) ✓
- **pressenti** — `Coq au vin` (luca yes, partner none) ✓
- **conteste** — `Butter chicken` (luca yes, partner no) ✓
- **rejete** — `Shawarma` — asserts absence (filtered from VoteSummary per D-06)
- **sans_avis** — not reachable post API-driven collapse (Luca votes all)

API-driven setup: POSTs a single `yes` vote on `Tacos au boeuf` (the seed's sans-avis recipe) to collapse the deck to VoteSummary, where chips for non-rejete states are visible at once. 3-of-5 reachable state coverage is the seed-bounded subset per D-15-10. The drift detector at `lib/votes.ts:78-95` covers the structural correctness of the remaining two branches at module load.

Spec uses the existing `fixtures/seed-helpers.ts` constants `SHORTLIST_RECIPES` + `VOTE_STATE_LABELS` — no new helpers introduced.

## Decision coverage

| Decision | Covered by |
|----------|------------|
| D-15-01 (frontend reads `session.members.length`) | Tasks 1 + 2 |
| D-15-02 (VoteSummary `memberCount` prop removed) | Task 2 |
| D-15-03 (null-session short-circuit to `sans_avis`) | Task 2 (`?? 0` short-circuit) |
| D-15-10 (vote-state-n-members canary) | Task 3 |

## Invariant compliance

- **Invariant #2 (voting state computed):** preserved. `lib/votes.ts` is byte-identical (verified — not in `git diff`). `compute_vote_state` signature unchanged on both sides; only the *source* of `memberCount` changes.
- Drift detector self-check at `lib/votes.ts:78-95` continues to enforce branch-order parity with the Python mirror.

## Forward links

- **Plan 15-02** rewrites `cooking_logs.finalize_cooking_log` to atomic UPDATE — this plan is independent of that change (frontend only).
- **Plan 15-04** lands the cook_count double-tap E2E assertion (stays `test.fixme` until Phase 17 closes TZ-01).
- **Phase 20** owns the chip color-token migration (`text-emerald-*` literals → semantic CSS vars). This plan deliberately did NOT touch `chipClass` / `rowBgClass`.

## Deviations from plan

- **Task 3 author-handoff:** The plan's task body included a placeholder spec illustrating the structure with notes for the executor to cross-check `seed.py`. The committed spec resolves those placeholders against the actual seed (`Ragu bolognese`, `Coq au vin`, `Butter chicken`, `Shawarma`, `Tacos au boeuf`) and uses the existing `fixtures/seed-helpers.ts` constants instead of inline string literals — a cleaner factoring than the plan suggested. No semantic deviation.
- **Plan 15-03 background-agent stall:** The original background executor agent committed Tasks 1 and 2 successfully but did not proceed past Task 3 / SUMMARY within ~40 min. The orchestrator took over inline to commit Task 3 (the spec was already complete on disk as an untracked file) and author this SUMMARY.md.

## Verification

- `grep -n "MEMBER_COUNT" frontend/components/HomeDecide.tsx` → 0 matches ✓
- `grep -c "session.members.length\|session?.members.length" frontend/components/HomeDecide.tsx` → ≥ 2 ✓
- `grep -n "memberCount?: number" frontend/components/VoteSummary.tsx` → 0 matches ✓
- `grep -c "useSession" frontend/components/VoteSummary.tsx` → 2 (import + call) ✓
- `frontend/lib/votes.ts` unchanged (`git diff` clean) ✓
- Playwright spec exists at expected path, no `test.fixme` marker ✓
- Full lint + typecheck + actual spec run will be re-verified by phase-level verification (`gsd-verifier`).
