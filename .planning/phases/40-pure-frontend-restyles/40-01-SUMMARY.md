---
phase: 40
plan: 01
subsystem: backend+frontend
tags: [profil, stats-endpoint, la-grille]
requires: []
provides:
  - GET /households/{id}/stats
  - HouseholdStats Pydantic schema
  - La Grille Profil page composition
affects:
  - backend/app/routers/households.py
  - backend/app/schemas/household.py
  - frontend/app/settings/page.tsx
tech_stack:
  added: []
  patterns:
    - "Stats endpoint joins Vote → Member to derive household scope (Vote has no direct household_id)"
    - "CookingLog finalization marker is `rating IS NOT NULL` (no `finalized_at` column exists)"
key_files:
  created:
    - backend/tests/test_household_stats.py
    - frontend/tests/e2e/profil-la-grille.spec.ts
  modified:
    - backend/app/schemas/household.py
    - backend/app/routers/households.py
    - frontend/lib/i18n/fr.json
    - frontend/app/settings/page.tsx
key_decisions:
  - "Use `Vote → Member → household_id` join (Vote has no household_id column per models/vote.py)"
  - "Use `CookingLog.rating.isnot(None)` as finalization marker (no finalized_at column — confirmed via COOK-02 docstring)"
requirements_completed:
  - PROF-01
duration: "~25 min"
completed: 2026-05-21
---

# Phase 40 Plan 01: Stats Endpoint + Profil Page Rewrite Summary

Added `GET /households/{id}/stats` endpoint with 4-test pytest contract and fully rewrote `/settings` to the La Grille literal-sketch composition (hero + identity + partner block + stats block + 5 numbered hairline rows, zero Card components).

## What was built

**Backend:**
- `HouseholdStats` Pydantic schema (`backend/app/schemas/household.py`): three `int` fields (`recipes_count`, `cooking_logs_count`, `votes_count`).
- `GET /households/{household_id}/stats` route (`backend/app/routers/households.py`): authenticated, invariant #4 cross-household 404, filtered counts per D-05.
- `backend/tests/test_household_stats.py` (221 lines, 4 tests): happy path with delta assertions, 401 missing-auth, 404 cross-household, schema-shape exactness check.

**Frontend:**
- `frontend/app/settings/page.tsx` complete rewrite (281 insertions / 318 deletions): hero word "Profil", identity line `maison · CODE · depuis YYYY.MM`, partner block (me + partners with `MemberDot`), stats block (3-column hairline-bordered grid), 5 numbered hairline rows (`01 Notifications`, `02 Foyer`, `03 Membre`, `04 Exporter les données`, `05 Déconnexion`). All Card components removed. All handlers (push toggle, rename, export, disconnect) preserved via inline expansions.
- `frontend/lib/i18n/fr.json`: added 14 keys under `settings.*` (`hero`, `identity_format`, `stats.*`, `rows.*`).
- `frontend/tests/e2e/profil-la-grille.spec.ts` (58 lines, 6 tests): hero word, Card-free, no "Heure du décide", 5 numbered rows, stats block labels, identity-line invite code.

## Deviations from Plan

**[Rule 1 — bug] Plan referenced `CookingLog.finalized_at` field — does not exist**
- Found during: Task 2 (route handler logic).
- Issue: Plan's D-05 said `cooking_logs_count: SELECT count(*) FROM cooking_logs WHERE household_id = :hh AND finalized_at IS NOT NULL`. The actual `CookingLog` model has no `finalized_at` column.
- Fix: Used `CookingLog.rating.isnot(None)` instead — this is the canonical COOK-02 "is this a real cook" proxy documented in `backend/app/routers/cooking_logs.py` line 11. Same semantics (in-progress logs have rating=NULL; PUT /cooking-logs/{id} sets rating during finalization).
- Files modified: `backend/app/routers/households.py`, `backend/tests/test_household_stats.py` (the happy-path test seeds `rating=LogRating.loved` for the finalized log and `rating=None` for the in-progress one).
- Verification: 4-test contract passes; happy-path test seeds the explicit pattern and asserts the delta.
- Commit hash: 2347616 (schema) + Task 2 commit.

**[Rule 2 — missing critical fact] Plan flagged `Vote.household_id` possibly missing — confirmed missing, used Member join**
- Found during: Task 2 (route handler).
- Issue: Plan Task 2 instructed "If `Vote` does not have a direct `household_id` column … adjust the query to join through `Member`". Verified via `backend/app/models/vote.py` — `Vote` has only `shortlist_id`, `recipe_id`, `member_id`, `vote`, `created_at`. No `household_id`.
- Fix: `db.scalar(select(func.count(Vote.id)).join(Member, Vote.member_id == Member.id).where(Member.household_id == household_id))`.
- Verification: 4-test contract passes; happy-path delta assertion confirms +3 votes count correctly.

**Total deviations:** 2 auto-fixed (1 bug, 1 missing-critical). **Impact:** Zero — both pre-flagged in the plan's `<read_first>` block and CONTEXT.md research. The fix shape was anticipated by the planner.

## Verification

- ✓ `cd backend && uv run pytest tests/test_household_stats.py -x` — 4 passed.
- ✓ `cd frontend && npm run lint` — clean (0 errors, 0 warnings).
- ✓ `grep -E "<Card|from.*\"card\"" frontend/app/settings/page.tsx | wc -l` — 0.
- ✓ `grep -F "Heure du décide" frontend/app/settings/page.tsx | wc -l` — 0.
- ✓ `grep -F "Fraunces" frontend/app/settings/page.tsx | wc -l` — 0.
- ✓ `grep -F "Sober Kitchen" frontend/app/settings/page.tsx | wc -l` — 0.
- ✓ TypeScript: no errors in touched files (pre-existing errors in unrelated `lib/recipe-completeness.test.ts` are out of scope per Rule 5).
- E2E spec exists; running against synthetic seed deferred to phase-level verification.

## Issues Encountered

None — both deviations were anticipated by the planner via the `<read_first>` directive in Task 2 and CONTEXT.md research notes.

## Self-Check: PASSED

Ready for Plan 40-02.
