---
phase: 01-foundations-w1
plan: 01
subsystem: infra
tags: [enums, typescript, python, locked-vocabulary, member-colors, shared-types]

# Dependency graph
requires: []
provides:
  - Season / Cuisine / Mood / Protein wire-format string enums (TS const objects + Python str-Enums)
  - MEMBER_COLORS palette (5 Tailwind-v4 500-shade hex slots) and isValidMemberColor / is_valid_member_color guards
  - Importable Python package skeletons at backend/app/ and backend/app/models/
affects:
  - 01-02-frontend-scaffold (consumes frontend/lib/enums.ts, frontend/lib/colors.ts)
  - 01-03-backend-scaffold (consumes backend/app/models/enums.py, backend/app/colors.py)
  - 01-04-onboarding-backend (validates member.color_hex via is_valid_member_color)
  - 01-06-onboarding-frontend (renders MEMBER_COLORS swatch picker)
  - 01-08-recipes-backend (uses Cuisine/Mood/Protein/Season enums in recipe schema)
  - 01-10-recipes-frontend-read (renders enum labels via next-intl keys)
  - 01-11-recipes-frontend-write (presents enum dropdowns from TS const)
  - All Phase 2/3/4 plans that reference recipe vocabulary

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Const-object + indexed-type pattern for TS string enums (TS-strict friendly, tree-shakable, no `enum` keyword)"
    - "Python str-Enum with deliberate name vs value asymmetry where wire format is camelCase (middle_eastern = \"middleEastern\")"

key-files:
  created:
    - frontend/lib/enums.ts
    - frontend/lib/colors.ts
    - backend/app/__init__.py
    - backend/app/models/__init__.py
    - backend/app/models/enums.py
    - backend/app/colors.py
  modified: []

key-decisions:
  - "Use const-object + typeof keyof pattern for TS enums (avoids TS `enum` runtime baggage; values are inlined string literals)"
  - "Python member name uses snake_case (middle_eastern, red_meat, north_african, none) but the wire-format value is camelCase to match TypeScript identifiers — value is the contract, name is internal"
  - "MEMBER_COLORS shape diverges intentionally between sides: TS exports rich objects (slot/name/hex/tw classes) for UI rendering; Python exports a flat list of hex strings since the backend only needs validation, not Tailwind class names"

patterns-established:
  - "Locked-vocabulary co-location: every shared enum must exist on BOTH sides in the same change. Header comment in each file explicitly cross-references the mirror and cites CLAUDE.md drift-is-a-bug rule."
  - "Wire-format truth lives in SPEC.md §Locked vocabularies; both files cite the source"

requirements-completed: [INFRA-03, RECIPE-01, RECIPE-02, ONBOARD-04, ONBOARD-05]

# Metrics
duration: 3min
completed: 2026-05-05
---

# Phase 1 Plan 1: Shared Vocab Summary

**Locked Season/Cuisine/Mood/Protein enums and 5-slot Tailwind-500 member-color palette mirrored verbatim across `frontend/lib/` (TS const-object pattern) and `backend/app/` (Python str-Enum), with guard functions for member-color validation.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-05T11:59:14Z
- **Completed:** 2026-05-05T12:01:24Z
- **Tasks:** 2
- **Files modified:** 6 created, 0 modified

## Accomplishments

- Established the single source of truth for the 4 locked vocabularies (Season, Cuisine, Mood, Protein) referenced by SPEC.md §"Locked vocabularies" — 26 wire-format strings present identically on both sides.
- Established the 5-slot member-color palette per D-04 (CONTEXT.md) — identical hex set on both sides: `#F43F5E #F59E0B #10B981 #0EA5E9 #8B5CF6`.
- Bootstrapped `backend/app/` and `backend/app/models/` as importable Python packages so plan 01-03 can extend them without re-creating the skeleton.
- Cross-language smoke-test passing: Python asserts `Cuisine.middle_eastern.value == "middleEastern"`, `Protein.red_meat.value == "redMeat"`, `is_valid_member_color("#F43F5E")` true, bogus hex false; TS strict compile clean.

## Task Commits

Each task was committed atomically (per plan, no TDD):

1. **Task 1: Frontend enums + colors** — `f5333dd` (feat)
   - `frontend/lib/enums.ts`, `frontend/lib/colors.ts`
2. **Task 2: Backend enums + colors (mirror of TS)** — `f29dfdb` (feat)
   - `backend/app/__init__.py`, `backend/app/models/__init__.py`, `backend/app/models/enums.py`, `backend/app/colors.py`

_Note: plan metadata commit will be added by the orchestrator after the wave completes._

## Files Created/Modified

- `frontend/lib/enums.ts` — `Season`, `Cuisine`, `Mood`, `Protein` exported as `as const` object literals plus indexed types. 26 wire-format string values matching SPEC.md verbatim.
- `frontend/lib/colors.ts` — `MEMBER_COLORS` (5-element readonly tuple of `{ slot, name, hex, tw }` objects), `MemberColorHex` literal-union type derived from the tuple, `isValidMemberColor` type-guard function.
- `backend/app/__init__.py` — empty marker so `backend/app` is an importable package.
- `backend/app/models/__init__.py` — empty marker so `backend/app/models` is an importable package.
- `backend/app/models/enums.py` — `Season`, `Cuisine`, `Mood`, `Protein` as Python `str`-`Enum` subclasses. Member name `middle_eastern` -> value `"middleEastern"` (and analogously for `red_meat`, `north_african`).
- `backend/app/colors.py` — `MEMBER_COLORS: list[str]` (5 hex codes only) and `is_valid_member_color(hex_value: str) -> bool` guard.

## Decisions Made

- **TS const-object pattern over TS `enum` keyword.** Avoids the runtime overhead of TS native `enum` (which emits a reverse-mapping object) and keeps the values as plain string literals at runtime. Matches the standard recommendation for TS-strict code consuming wire-format enums. Matches the `as const` pattern shown in the plan.
- **MEMBER_COLORS shape divergence between sides.** Frontend needs Tailwind class names (`tw: "rose-500"`) and human-readable slot names for the onboarding swatch picker; backend only validates incoming hex strings (`POST /households/join` checks `members.color_hex`). Encoding both shapes from one canonical source is overkill at couple-scale; the plan-specified shape divergence is honored. Both sides agree on the **canonical fact** (the 5 hex strings, in order) — that's the only invariant that matters.
- **Member name vs wire-format value asymmetry preserved.** SPEC.md's Python enum source already chose `middle_eastern = "middleEastern"`. Honored verbatim — the wire format is the contract, Python's snake_case naming is just a stylistic accommodation.

## Deviations from Plan

The plan's Task 1 `<verify>` block includes `cd frontend && npx tsc --noEmit` and Task 2's includes a `python -c "..."` smoke-test that imports from `backend/app/...`. In this isolated worktree, neither `frontend/package.json` nor `backend/pyproject.toml` is present (those scaffolds are tracked outside this branch and are owned by sibling plans 01-02 and 01-03 respectively).

### [Rule 3 - Blocking] Substituted equivalent verifications

- **Found during:** Task 1 verification step
- **Issue:** Worktree does not include `frontend/` Next.js scaffold or `backend/` uv project, so `cd frontend && npx tsc --noEmit` and `cd backend && python -c "..."` cannot run as written.
- **Fix:** (a) Ran `tsc --strict --noEmit` against `frontend/lib/enums.ts` and `frontend/lib/colors.ts` directly using the parent worktree's pinned `typescript` binary at `/Users/gulu3001/dev/al-dente/frontend/node_modules/.bin/tsc` with explicit flags (`--target ES2022 --moduleResolution bundler --module preserve --skipLibCheck`) — passed clean. (b) Ran the Python smoke-test from inside `backend/` using the system `python3`, with the assertions copy-pasted from the plan plus extra asserts on `Cuisine.north_african`, `Season.spring`, `Mood.celebratory`, and bogus-hex rejection — output `OK`.
- **Files modified:** None (verification-only; smoke-test is ephemeral).
- **Verification:** TS strict compile clean; Python smoke-test prints `OK`; `grep` confirms all 26 wire-format strings present on both sides; `grep -oE '#[0-9A-F]{6}'` confirms hex parity.
- **Committed in:** N/A (verification adjustment, not a code change)

---

**Total deviations:** 1 auto-fixed (1 blocking — verification environment substitution)
**Impact on plan:** None on the artifacts; only on the harness used to verify them. Once plans 01-02 and 01-03 finish scaffolding `frontend/` and `backend/` and the wave merges, the original plan-specified verifications will work as written.

## Issues Encountered

- The `__pycache__` directories appeared in `git status` after the smoke-test ran. Did **not** commit them and did **not** add a `.gitignore` for them — that's plan 01-03's scope (backend scaffold establishes the canonical `.gitignore`). Logged here for awareness; not a deferred item.

## Threat Flags

None — this plan only writes static constants. T-01-01-01 (Tampering / enum drift) was the only register entry and was mitigated by the cross-language smoke-test (26-string parity check + hex-set parity check), as planned.

## User Setup Required

None — pure code constants, no environment variables, no external services.

## Next Phase Readiness

- Plans 01-02 (frontend-scaffold) and 01-03 (backend-scaffold) can import these files immediately. Suggested imports:
  - Frontend: `import { Cuisine, type Cuisine } from "@/lib/enums"; import { MEMBER_COLORS } from "@/lib/colors";`
  - Backend: `from app.models.enums import Season, Cuisine, Mood, Protein` and `from app.colors import MEMBER_COLORS, is_valid_member_color`
- Plan 01-04 (onboarding-backend) gets `is_valid_member_color()` ready for `POST /households/join` body validation.
- Plan 01-06 (onboarding-frontend) gets `MEMBER_COLORS` ready for the 5-swatch picker on Welcome/Join screens.
- No blockers. No outstanding deferred-items from this plan.

## Self-Check: PASSED

Verified before declaring complete:

- `frontend/lib/enums.ts` — FOUND
- `frontend/lib/colors.ts` — FOUND
- `backend/app/__init__.py` — FOUND
- `backend/app/models/__init__.py` — FOUND
- `backend/app/models/enums.py` — FOUND
- `backend/app/colors.py` — FOUND
- Commit `f5333dd` — FOUND in `git log`
- Commit `f29dfdb` — FOUND in `git log`
- TS strict compile — clean
- Python smoke-test — `OK`
- Wire-format parity — 26 strings on both sides, identical
- Hex parity — `#F43F5E #F59E0B #10B981 #0EA5E9 #8B5CF6` on both sides

---
*Phase: 01-foundations-w1*
*Completed: 2026-05-05*
