---
phase: 33-claude-md-split
plan: 01
subsystem: docs
tags: [claude-md, gsd-markers, dx, source-of-truth]

requires:
  - phase: 32-port-locked-screens-to-sober-kitchen
    provides: Stable v0.7 doc baseline (root CLAUDE.md still at pre-split shape; no in-flight conflicts on hand-written sections)
provides:
  - Root CLAUDE.md restructured to ≤ 60 lines of guidance outside `<!-- GSD:* -->` blocks (actual: 34 lines)
  - backend/CLAUDE.md (new) — Gemini SDK correction + Railway alembic deploy contract
  - frontend/CLAUDE.md (new, replaces @AGENTS.md re-export) — Next.js 16 framework-version warning + Playwright Tests posture
  - .planning/CLAUDE.md (new) — GSD workflow enforcement block relocated from root
  - frontend/AGENTS.md deleted (D-12 override of original v0.7 cross-tool decision)
  - 33-VERIFICATION-D04.md (empirical evidence: `gsd-docs-update` cannot refresh GSD-marker blocks at non-root paths)
  - 33-VERIFICATION-GATES.md (all 9 D-13 Layer 2 grep gates green under D-04 FAIL relaxation)
affects: future plan-phase + execute-phase runs (scoped CLAUDE.md auto-loaded by Claude when cwd is under backend/frontend/.planning)

tech-stack:
  added: []
  patterns:
    - Scoped CLAUDE.md files (per-directory) override root for area-specific rules
    - D-04 FAIL fallback codified — GSD-marker blocks stay at root; only hand-written prose moves to scoped files

key-files:
  created:
    - backend/CLAUDE.md
    - frontend/CLAUDE.md
    - .planning/CLAUDE.md
    - .planning/phases/33-claude-md-split/33-VERIFICATION-D04.md
    - .planning/phases/33-claude-md-split/33-VERIFICATION-GATES.md
    - .planning/phases/33-claude-md-split/33-01-SUMMARY.md
  modified:
    - CLAUDE.md (pruned root)
    - .planning/ROADMAP.md (Phase 33 success criterion #3 override)
    - .planning/REQUIREMENTS.md (DX-01 override)
    - .planning/PROJECT.md (v0.7 locked-decisions gh#27 row override)
  deleted:
    - frontend/AGENTS.md (D-12)

key-decisions:
  - D-04 FAIL empirically verified: `gsd-docs-update` (`generate-claude-md` handler) is hard-wired to write the full 6-block GSD template at any target path. Scoped CLAUDE.md files cannot host individual `<!-- GSD:* -->` marker blocks without being clobbered by full-template content on every refresh. Fallback contract activated: root keeps `GSD:stack` (unchanged) and `GSD:conventions` (all 3 bullets); scoped files contain hand-written prose only.
  - D-12 override executed in same commit as scoped-file creation and deletion: `frontend/AGENTS.md` deleted; Next.js 16 warning folded verbatim (including `<!-- BEGIN:nextjs-agent-rules -->` markers) into `frontend/CLAUDE.md`. ROADMAP / REQUIREMENTS / PROJECT pointer text updated to reflect.
  - Source-of-truth pointer text reworded (Rule 1 plan-bug fix) to avoid containing the gate tokens themselves — pointers describe destinations by category ("ORM/migration conventions") rather than by tool name ("SQLAlchemy 2.0 typed style"). The destination files (`backend/CLAUDE.md`, `frontend/CLAUDE.md`) carry the full rule names where they semantically belong.

patterns-established:
  - "Scoped CLAUDE.md split with D-04 FAIL contract: only hand-written sections move out of root; GSD-marker-managed blocks stay where the refresh tool can find them."
  - "Locked-artifact override discipline (D-12): when a plan deviates from a v0.7 locked decision, ROADMAP/REQUIREMENTS/PROJECT all get edited in the SAME commit as the override action, so plan-checker and verifier never run against stale criteria."

requirements-completed: [DX-01]

duration: ~11min
completed: 2026-05-18
---

# Phase 33 Plan 01: CLAUDE.md split Summary

**Root CLAUDE.md pruned to 34 lines of guidance (down from 62 hand-written lines pre-split); backend/frontend/.planning scoped files carry their respective hand-written sections; `frontend/AGENTS.md` deleted; D-04 empirically verified FAIL → GSD-marker blocks stay at root.**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-05-18T13:00Z (worktree spawn)
- **Completed:** 2026-05-18T13:11Z
- **Tasks:** 8 (single atomic commit per MVP posture, not per-task)
- **Files modified:** 8 (3 created scoped + 4 edited + 1 deleted) + 3 verification/summary artifacts

## Accomplishments

- Root `CLAUDE.md`: 114 lines (pre-split) → 90 lines total (post-split); **34 lines** of hand-written guidance outside `<!-- GSD:* -->` blocks (target was ≤ 60, well under).
- Three scoped CLAUDE.md files created (`backend/`, `frontend/`, `.planning/`), each carrying only the content that semantically belongs to its directory.
- D-04 verification gate fired empirically against the actual `gsd-tools generate-claude-md` handler — produced reproducible evidence (commands + output) of the FAIL mode.
- D-12 override executed atomically: ROADMAP success criterion #3, REQUIREMENTS DX-01 entry, and PROJECT v0.7 locked-decisions gh#27 row all updated in the same change as the actual `frontend/AGENTS.md` deletion. Plan-checker and verifier will never run against stale criteria.
- All 9 D-13 Layer 2 grep gates pass under the D-04 FAIL relaxation; verdict recorded.

## Task Commits

This plan ships in a **single atomic commit** per the MVP posture documented in `<parallel_execution>` of the agent prompt and `<success_criteria>` #10 of the plan. The execute-plan.md per-task commit convention is overridden for this plan.

Single commit (Task 8): see commit hash recorded in git log after this SUMMARY is staged. Commit subject: `docs(33): split CLAUDE.md — root keeps invariants; backend/frontend/.planning scoped (DX-01)`.

## Files Created/Modified

### Created

- `backend/CLAUDE.md` — Gemini SDK correction (`google-genai` not `google-generativeai`) + Railway `alembic upgrade head` deploy contract. 11 lines.
- `frontend/CLAUDE.md` — Next.js 16 framework-version warning (folded from `frontend/AGENTS.md` with `<!-- BEGIN:nextjs-agent-rules -->` markers preserved verbatim per code_context option (a)) + Playwright Tests posture. 13 lines. Overwrites the prior one-line `@AGENTS.md` re-export.
- `.planning/CLAUDE.md` — GSD workflow enforcement block relocated from root. 16 lines.
- `.planning/phases/33-claude-md-split/33-VERIFICATION-D04.md` — D-04 empirical-verification artifact with exact commands, source-code citation (`profile-output.cjs::cmdGenerateClaudeMd`), and the FAIL decision.
- `.planning/phases/33-claude-md-split/33-VERIFICATION-GATES.md` — all 9 D-13 Layer 2 gates with raw + containment-variant results, deviations documented.
- `.planning/phases/33-claude-md-split/33-01-SUMMARY.md` — this file.

### Modified

- `CLAUDE.md` (root) — Source-of-truth bullet block rewritten (5 → 7 bullets: dropped `frontend/AGENTS.md` pointer, added scoped-file pointers; reworded to avoid grep-gate substrings); `## Current state` deleted; `## Deployment` second bullet (`alembic upgrade head`) removed; `## Tests` deleted; `## Gemini SDK` deleted; `<!-- GSD:workflow -->` block deleted. `## Architecture invariants` (#1–#8), `## Locked vocabularies`, `## MVP phase posture`, `## Productize-later TODOs`, `## Repo layout`, GSD:project/stack/conventions/architecture/skills/profile blocks all unchanged.
- `.planning/ROADMAP.md` — Phase 33 success criterion #3 replaced "`frontend/AGENTS.md` is untouched" with "`frontend/AGENTS.md` is deleted; its Next.js 16 warning is folded verbatim into `frontend/CLAUDE.md`".
- `.planning/REQUIREMENTS.md` — DX-01 entry replaced "`frontend/AGENTS.md` stays in place (cross-tool — Cursor / Aider read it)" with "`frontend/AGENTS.md` is deleted; its Next.js 16 warning lives in `frontend/CLAUDE.md`".
- `.planning/PROJECT.md` — v0.7 locked-decisions table gh#27 row replaced with "Delete `frontend/AGENTS.md`; fold its Next.js 16 warning into a new `frontend/CLAUDE.md`. Reverses the original cross-tool decision because Claude Code is the only assistant in active use as of v0.7." + matching rationale referencing the "Claude Code is the only AI assistant" reason.

### Deleted

- `frontend/AGENTS.md` — content (4 lines of Next.js 16 framework-version warning) now lives verbatim inside `frontend/CLAUDE.md` between the same `<!-- BEGIN:nextjs-agent-rules -->` markers.

## Decisions Made

- **D-04 verification outcome: FAIL.** The `generate-claude-md` handler (the only refresh path for `<!-- GSD:* -->` marker blocks) is hard-wired to write all 6 GSD template blocks (project / stack / conventions / architecture / skills / workflow) at whatever `--output` path you give it. Pointing it at a non-root file does not refresh a single marker block; it instead instantiates the full root-CLAUDE.md template at that path, then skips the one block it sees as "manually edited." That makes scoped marker blocks unsafe to introduce. The plan's D-04 fallback contract (keep `GSD:stack` and `GSD:conventions` at root unchanged) is the operative path. See `33-VERIFICATION-D04.md` for the command transcript and source-file citation (`bin/lib/profile-output.cjs` lines 947-1104).
- **All 3 conventions bullets stay at root.** Under D-04 FAIL, Task 4 step 6 was skipped and Task 6's fallback content is the natural state — root `<!-- GSD:conventions -->` retains the Frontend + Backend + Comments bullets verbatim.
- **GSD:stack block at root unchanged.** Under D-04 FAIL, Task 4 step 7 was skipped — the single-paragraph highlights stay at root.
- **`<!-- BEGIN:nextjs-agent-rules -->` markers preserved verbatim** in `frontend/CLAUDE.md` per code_context option (a). The H1 from the old `frontend/AGENTS.md` (`# This is NOT the Next.js you know`) was downgraded to H2 so the scoped file has exactly one H1.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan source-of-truth pointer text contained the gate tokens themselves**
- **Found during:** Task 4 (root pruning)
- **Issue:** The plan's `<source_of_truth_pointer_rewrite>` block (lines 130-136 of 33-01-PLAN.md) listed the verbatim destination-file rule names inside the pointer bullets: "SQLAlchemy 2.0 typed style, Alembic conventions, ... `alembic upgrade head` deploy contract" for `backend/CLAUDE.md`; "ESLint-as-formatter, `@/*` alias, `--webpack` build flag, Playwright posture" for `frontend/CLAUDE.md`. A verbatim copy of those pointers into root `CLAUDE.md` would leave the gate tokens at root **outside** any marker block, which directly contradicts Task 7 gate #1 (`grep "SQLAlchemy|alembic upgrade head" CLAUDE.md` → 0 expected) and gate #2 (`grep "@/*|eslint.config.mjs|--webpack|Playwright" CLAUDE.md` → 0 expected outside markers). The plan was internally inconsistent on this point.
- **Fix:** Reworded the two scoped-file pointer bullets to convey the same routing information without using the gate-flagged substrings. The destinations themselves (`backend/CLAUDE.md`, `frontend/CLAUDE.md`) carry the full rule names verbatim where they semantically belong.
- **Files modified:** `CLAUDE.md` lines 10-11.
- **Verification:** Task 7 gate #1 containment variant returns 1 (the legitimate Repo layout reference); gate #2 containment variant returns 0.
- **Committed in:** the single atomic commit at Task 8.

**2. [Rule 1 - Bug] Plan Task 7 Gate #1 conflicts with D-04 FAIL fallback**
- **Found during:** Task 7 (gate execution)
- **Issue:** Task 7 gate #1 specifies "Expected: 0" backend tokens at root. Under D-04 FAIL (the operative branch), both the `<!-- GSD:stack -->` block (single-paragraph stack highlights mentioning `SQLAlchemy`, `Alembic`, `google-genai` on the backend half) and the Backend bullet inside `<!-- GSD:conventions -->` (mentioning `SQLAlchemy 2.0 typed style`) legitimately stay at root. The "Expected: 0" wording matched the D-04 PASS contract but contradicted the D-04 FAIL fallback that Task 6 explicitly authorized.
- **Fix:** Re-interpreted Gate #1 (and Gate #2) via a containment variant: tokens **outside** marker blocks must be zero, while tokens inside marker blocks are tolerated under D-04 FAIL. This is symmetric with Task 6's explicit authorization of the same relaxation for frontend tokens. The verification artifact at `33-VERIFICATION-GATES.md` records both the raw and containment results.
- **Files modified:** none (gate-interpretation deviation only).
- **Verification:** `33-VERIFICATION-GATES.md` records all gate results; final verdict "PASS — all gates green" under the D-04 FAIL relaxation.
- **Committed in:** the single atomic commit at Task 8.

**3. [Rule 1 - Bug] Plan listed pre-rewrite line numbers (114 lines pre-split) that drifted from the actual file's footer**
- **Found during:** Task 4
- **Issue:** Plan mapping table references "GSD:profile block (109-114)"; the actual root `CLAUDE.md` profile-end marker was at line 114 of a 114-line file (no trailing newline difference). Pre-edit verification confirmed the line numbers were accurate within ± 1 line — no fix needed, but the discovery is noted because the plan's verbatim line-range citations are the kind of brittle anchor that breaks if a future GSD doc-update edits the root file between planning and execution.
- **Fix:** None required.
- **Files modified:** none.
- **Verification:** Final `CLAUDE.md` is 90 lines; structural shape matches the plan's "natural shape after split" (line 441).

---

**Total deviations:** 3 auto-fixed (3 × Rule 1 plan-bug fixes; all internal-to-plan inconsistencies that were unambiguously resolvable from the plan's own context).
**Impact on plan:** Zero scope creep. Two of the three deviations were pure gate-interpretation calls; the third (pointer-text rewording) preserved every semantic the plan intended. The D-04 FAIL fallback contract is honored throughout. Root pruning ratio better than target (34 / 60 lines, 43% headroom).

## Issues Encountered

None — D-04 verification ran on the first attempt, all gates passed on first run after the pointer-text rewording, and the `git rm frontend/AGENTS.md` deletion was clean.

## User Setup Required

None — pure documentation restructure, no external services touched.

## Next Phase Readiness

- v0.7 milestone is now ready for `/gsd-complete-milestone` once Phase 33 commit lands and CI is green. ROADMAP.md Phase 33 row should flip from `0/1` → `1/1` after the orchestrator runs `roadmap.update-plan-progress`.
- No follow-up phases blocked by Phase 33. The deferred `gsd-docs-update`-fix-for-arbitrary-CLAUDE.md-paths idea (CONTEXT.md §deferred) is documented but not in scope for v0.7 or v0.8.

## Self-Check: PASSED

Files created (all confirmed `-f` on disk inside the worktree):
- FOUND: backend/CLAUDE.md
- FOUND: frontend/CLAUDE.md
- FOUND: .planning/CLAUDE.md
- FOUND: .planning/phases/33-claude-md-split/33-VERIFICATION-D04.md
- FOUND: .planning/phases/33-claude-md-split/33-VERIFICATION-GATES.md
- FOUND: .planning/phases/33-claude-md-split/33-01-SUMMARY.md

File deleted (confirmed `! -f` and `git status` shows staged `D`):
- DELETED: frontend/AGENTS.md

Files modified (confirmed via grep gates above + final structural read):
- CLAUDE.md (root) — 90 lines, 34 outside marker blocks
- .planning/ROADMAP.md — "is deleted" clause present (Gate #9a PASS)
- .planning/REQUIREMENTS.md — "stays in place" clause removed (Gate #9b PASS)
- .planning/PROJECT.md — "Delete `frontend/AGENTS.md`" clause present (Gate #9c PASS)

The commit hash will be appended after `git commit` lands; the orchestrator's metric-recording step reads it from `git log -1`.

---
*Phase: 33-claude-md-split*
*Completed: 2026-05-18*
