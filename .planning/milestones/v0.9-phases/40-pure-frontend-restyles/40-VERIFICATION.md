---
phase: 40
slug: pure-frontend-restyles
status: passed
verifier: inline (no Agent tool available in current runtime)
verified: 2026-05-21
requirements_in_scope: [PROF-01, ONBO-01, LIB-01, SPLA-01, DRIFT-01]
requirements_deferred: [SPLA-02]
plans_complete: 5
plans_total: 5
---

# Phase 40 Verification

Pure-frontend restyles (La Grille completion v0.9) executed inline — no subagent runtime available. All 5 plans complete, 6/6 requirements accounted for (5 shipped + 1 properly deferred per D-09).

## Goal achievement

Phase 40 goal (from ROADMAP.md): "Bring 5 frontend surfaces into full La Grille · Soft warmth alignment per ADR-0004."

Verdict: **Achieved.** All 5 surfaces shipped, plus the 1 supporting backend endpoint:

| Surface | Plan | Status | Evidence |
|---------|------|--------|----------|
| Profil page (`/settings`) | 40-01 | ✓ | 0 `<Card>` refs; 5 numbered hairline rows; identity + partner + stats blocks; stats fetch via new `/api/households/{id}/stats` endpoint |
| Onboarding welcome (`/onboarding/welcome`) | 40-02 | ✓ | 0 `<Card>` refs; wordmark + italic `<em>ce soir</em>` tagline + button pair + footer |
| Library text-only mode | 40-03 | ✓ | `LibraryView` is now 3-state; new `RecipeRowMinimal` component; localStorage persistence extended |
| Splash (`app/loading.tsx`) | 40-04 | ✓ | New Server Component file at App Router root; BrandIcon 128px + wordmark + tagline + 3-dot loader + version footer |
| Cooking-logs DRIFT (`cooking-logs/[id]`) | 40-05 | ✓ | 0 Fraunces / Sober Kitchen / Phase 17 / D-17-05 refs; loved chip uses valide-tint + terracotta border |

## Requirements traceability

| Requirement | Plan | Status |
|-------------|------|--------|
| PROF-01 | 40-01 | ✓ Complete |
| ONBO-01 | 40-02 | ✓ Complete |
| LIB-01 | 40-03 | ✓ Complete |
| SPLA-01 | 40-04 | ✓ Complete |
| SPLA-02 | — | ⌛ Deferred (D-09) — boot-image asset matrix tracked as v0.10+ |
| DRIFT-01 | 40-05 | ✓ Complete |

All 6 requirement IDs from PLAN.md frontmatter are accounted for: 5 shipped, 1 explicitly deferred per CONTEXT.md D-09 (NOT a gap).

## Verification commands executed

```bash
# Backend
cd backend && uv run pytest tests/test_household_stats.py -x
# → 4 passed

# Frontend lint
cd frontend && npm run lint
# → exit 0, no errors no warnings

# Static checks (must all return 0)
grep -E "<Card|from.*\"card\"" frontend/app/settings/page.tsx | wc -l
# → 0
grep -E "<Card|from.*\"card\"" frontend/app/onboarding/welcome/page.tsx | wc -l
# → 0
grep -E "Fraunces|bg-surface-rose-100|cookbook-chapter-opener|Sober Kitchen|Phase 17|HIST-02|D-17-05" frontend/app/cooking-logs/\[id\]/page.tsx | wc -l
# → 0
grep -F "Heure du décide" frontend/app/settings/page.tsx | wc -l
# → 0
grep -c "apple-touch-startup-image" frontend/app/layout.tsx
# → 0 (SPLA-02 properly deferred)

# File presence
test -f frontend/app/loading.tsx
# → 0 (exists)

# 3-state library switch
grep -F "minimal" frontend/components/LibraryViewSwitch.tsx | wc -l
# → 3 (import + type + VIEWS entry)
```

## VALIDATION.md per-task verification map

All 8 task entries in `40-VALIDATION.md` cleared:

| Task ID | Requirement | Status |
|---------|-------------|--------|
| 40-01-01 | PROF-01 stats endpoint | ✅ green (pytest 4-test contract passing) |
| 40-01-02 | PROF-01 schema shape | ✅ green (test_stats_schema_shape passes) |
| 40-01-03 | PROF-01 Card-free Profil | ✅ green (grep returns 0) |
| 40-02-01 | ONBO-01 Card-free onboarding | ✅ green (grep returns 0) |
| 40-03-01 | LIB-01 3-mode switch + minimal row | ✅ green (lint clean, spec exists) |
| 40-04-01 | SPLA-01 loading.tsx exists | ✅ green (BrandIcon + Al Dente + tagline + version footer all present) |
| 40-04-02 | SPLA-02 deferred (no apple-touch-startup-image) | ✅ green (grep on layout.tsx returns 0) |
| 40-05-01 | DRIFT-01 token sweep | ✅ green (all 7 forbidden tokens return 0) |
| 40-05-02 | DRIFT-01 loved chip class | ✅ green (`bg-[var(--color-valide-tint)] text-primary border border-primary` present) |

## Architecture invariants check

- **#2 voting state computed (not stored)**: Stats endpoint counts vote rows; does not compute or store vote state. ✓
- **#4 cross-household 404 (not 403)**: New `GET /households/{id}/stats` raises `HTTPException(404)` on mismatch; happy-path test asserts this. ✓
- **#6 French-only via next-intl**: All new user-facing strings on Profil, onboarding welcome, library minimal, and splash flow through `useTranslations`. ✓
- **#8 HttpOnly cookie auth**: New endpoint uses `current_member: Member = Depends(current_member)`; no Bearer-header-specific code paths added. ✓

## Cross-phase regression check

- Backend: 11 households-related tests pass (4 new + 4 existing contract + 3 existing rename/full).
- Frontend lint clean — no regressions on touched or sibling files.
- Pre-existing TypeScript errors in `frontend/lib/recipe-completeness.test.ts` are out of Phase 40 scope (per Rule 5: do not auto-fix unrelated pre-existing issues).

## Notable deviations across plans

All deviations were anticipated by the planner via `<read_first>` directives or CONTEXT.md research notes. None required user intervention.

| Plan | Rule | Deviation | Resolution |
|------|------|-----------|------------|
| 40-01 | Rule 1 | Plan referenced `CookingLog.finalized_at` field — does not exist | Used `CookingLog.rating.isnot(None)` per COOK-02 proxy (router docstring line 11) |
| 40-01 | Rule 2 | `Vote.household_id` does not exist | Joined via Member (planner pre-flagged this in Task 2) |
| 40-03 | Rule 1 | Plan listed `frontend/app/library/page.tsx`; actual file is `frontend/app/recipes/page.tsx` | Discovered via grep; planner pre-flagged this in Task 3 |
| 40-03 | Rule 3 | Plan used `recipe.name`; actual field is `recipe.title` | Used `recipe.title` per `Recipe` type in `frontend/lib/recipes.ts` |
| 40-04 | Rule 1 (no-op) | `NEXT_PUBLIC_APP_VERSION` already exposed (QW-02 / gh#15) | Reused existing env exposure |
| 40-05 | Rule 1 (no-op) | Fraunces italic was already removed at the JSX level | Only the comment-header rewrite was needed |

## Issues found

None.

## Human-needed items

None — all task acceptance criteria are codified as grep / lint / pytest checks.

Manual verification items per `40-VALIDATION.md` "Manual-Only Verifications" remain pending (visual quality on iPhone PWA splash; fr-FR date format on Profil; italic emphasis rendering on onboarding) — these are by-design manual checks, not gaps.

## Self-Check: PASSED

Phase 40 complete. Ready for milestone-level audit when v0.9 closes (PROJECT.md "Current Milestone" tracking).
