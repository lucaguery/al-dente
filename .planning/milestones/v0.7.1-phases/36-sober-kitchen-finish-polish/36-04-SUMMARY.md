---
phase: 36-sober-kitchen-finish-polish
plan: 04
subsystem: backend-seed
tags: [SOBER-14, seed, dogear, patina, cook_count, idempotency]
requirements: [SOBER-14]
dependency_graph:
  requires:
    - frontend/components/LedgerCard.tsx (Phase 32 — dogear SVG primitive, renders when patina >= 3)
    - frontend/lib/recipes.ts cookCountToPatina (Phase 32 SOBER-05 — cook_count > 10 → patina 3)
    - backend/app/cli/seed.py recipes_by_slug + cooking-log denorm loop
  provides:
    - One seed recipe (`risotto-champignons`, "Risotto aux champignons") with cook_count = 12
    - Observable dogear render on the dev seed at /recipes Grille view
    - Héritage-bucket population for Plan 36-02's Patine view (combined gate exercises non-empty Héritage)
  affects:
    - backend/app/cli/seed.py (run_test_seed only — prod-synthetic seed not bumped per scope)
tech_stack:
  added: []
  patterns:
    - "Post-denorm-loop direct field assignment for idempotent demo-data bumps"
    - "Slug-selection discipline: bumped recipe NOT in cooking-log set, so COUNT recompute never clobbers"
key_files:
  created: []
  modified:
    - backend/app/cli/seed.py
decisions:
  - "Bumped slug: `risotto-champignons` (title 'Risotto aux champignons'). Visually recognizable in Grille view; NOT in log_specs (ragu/poulet-citron/burger-classique) so the COUNT recompute in the denorm loop cannot clobber the bump."
  - "Bump value = 12 (per CONTEXT). cookCountToPatina(12) = 3 → patina-3 → LedgerCard.dogear renders by default (showDogear = dogear ?? patina >= 3, line 34 of LedgerCard.tsx)."
  - "Bump placed AFTER the cooking-log denorm loop (line ~565) so the COUNT-from-rows recompute in the loop cannot overwrite the assignment. The denorm loop only touches the 3 logged recipes; risotto-champignons is untouched by the loop regardless of placement, but the post-loop position is defense-in-depth."
  - "last_cooked_at left None — the card subhead reads 'Jamais cuisinée' but cookCountToPatina(12) = 3 still drives the dogear + Héritage placement. Documented in the inline comment as a known cosmetic asymmetry; a future follow-up can set `now - timedelta(days=30)` if the subhead reads awkwardly."
  - "Frontend changes = ZERO. The Dogear primitive already shipped inside LedgerCard.tsx (Phase 32 §15.B) — this plan only seeds data and verifies the render gate. The user's original objective text mentioned a new `Dogear.tsx` component, but the PLAN.md frontmatter `files_modified: [backend/app/cli/seed.py]` correctly scoped the work to seed-only."
  - "prod-synthetic seed (run_prod_synthetic_seed) NOT bumped — SOBER-14 acceptance targets the dev seed (`uv run seed`) explicitly. The DEMO01 prod-synthetic household is orthogonal scope."
  - "Checkpoint auto-acknowledged via grep + render-tree verification per executor scope constraint (no live browser walk for this plan)."
metrics:
  duration_minutes: 4
  tasks_completed: 1
  files_modified: 1
  completed_date: 2026-05-18
---

# Phase 36 Plan 04: SOBER-14 Dogear seed cook_count bump — Summary

One-liner: `backend/app/cli/seed.py` `run_test_seed` now bumps `risotto-champignons` to `cook_count = 12` after the cooking-log denorm loop — `cookCountToPatina(12) = 3` flips the recipe into the Héritage tier, which makes `LedgerCard`'s already-shipped `.dogear` SVG render on its Grille-view card and places it in the Patine view's Héritage section.

## What shipped

### `backend/app/cli/seed.py`

A 24-line block was added immediately after the cooking-log denorm loop (between section 4 and section 5 — between line 564 and the daily-shortlist comment at line 566), labeled `---- 4b. SOBER-14 dogear-demo bump ----`:

```python
_DOGEAR_DEMO_SLUG = "risotto-champignons"
_dogear_recipe = recipes_by_slug.get(_DOGEAR_DEMO_SLUG)
if _dogear_recipe is not None:
    _dogear_recipe.cook_count = 12
```

with an explanatory header block documenting:
- WHY this slug (NOT in log_specs, so COUNT recompute cannot clobber)
- WHY 12 (cookCountToPatina maps `>10 → 3`)
- WHY post-loop (defense-in-depth against the denorm)
- WHY last_cooked_at stays None (cosmetic asymmetry, documented)
- Idempotency contract (direct assignment, not increment)

No other files modified. No new cooking-log rows added. No frontend changes — the dogear render gate (`patina >= 3`) already lives in `LedgerCard.tsx:34` with the SVG primitive in lines 42-55.

## Verification

### Done-criteria greps

| Check | Command | Expected | Actual |
|-------|---------|----------|--------|
| Bump literal present | `grep -nE 'cook_count\s*=\s*12' backend/app/cli/seed.py` | ≥ 1 match | 2 matches (line 579 comment + line 588 assignment) |
| SOBER-14 trace present | `grep -nE 'SOBER-14\|dogear-demo' backend/app/cli/seed.py` | ≥ 1 match | 2 matches (line 566 section header + line 567 comment) |
| Slug constant declared | `grep -n '_DOGEAR_DEMO_SLUG' backend/app/cli/seed.py` | 1 match | line 585 |
| Seed module imports | `cd backend && uv run python -c "from app.cli.seed import run_test_seed; print('seed importable')"` | "seed importable" | "seed importable" (confirmed) |

### Idempotency reasoning

Runtime double-run not exercised — local environment has no `aldente_test` Postgres database; the local `.env` `DATABASE_URL` points at the prod Supabase URL, and the seed correctly refuses to run there (verified: `REFUSING to seed: database_url does not contain 'aldente_test'`).

Static idempotency guarantees:

1. **Direct assignment**, not increment: `_dogear_recipe.cook_count = 12`. Re-runs converge on `12` (not `13`, not `24`).
2. **No new cooking-log rows added** — the bump only touches the already-merged `Recipe.cook_count` column on an existing row.
3. **No clobber from the denorm loop** — `risotto-champignons` is NOT in `log_specs` (`[ragu-bolognese, poulet-citron, burger-classique]`, line 535), so the loop's `recipe.cook_count = int(log_count)` recompute never touches this row regardless of placement order.
4. **Post-loop placement is defense-in-depth** — even if a future change added `risotto-champignons` to `log_specs`, the post-loop assignment would still win.
5. **Defensive `.get()`** — if the slug were renamed or removed, the seed no-ops the bump rather than crashing.

The first three guarantees rest on byte-for-byte source inspection, not runtime behavior; the absence of an `aldente_test` DB does not weaken them.

### Checkpoint outcome

The plan declared a `checkpoint:human-verify` task ("dogear renders on exactly one card after `uv run seed`; bump survives re-seeding"). Per the orchestrator's executor scope constraint, this checkpoint was auto-acknowledged via grep + render-tree verification rather than a live browser walk:

- Grep verified `cook_count = 12` on `risotto-champignons` is present in the post-denorm-loop position.
- Render-tree verification: `LedgerCard.tsx:34` (`showDogear = dogear ?? patina >= 3`) + `lib/recipes.ts:245-250` (`cookCountToPatina(12) === 3`) — both confirmed from the existing Phase 32 codebase. The render gate is mechanical from data.
- Combined with Plan 36-02 (SOBER-11 unconditional Patine sections), the bumped recipe will appear in the Héritage section's count chip on the dev seed.

A live human verification will land naturally on next `/gsd-audit-uat` walk against a refreshed test seed.

## Deviations from Plan

**Commit boundary scope-bleed (documented, not a behavior bug).** My seed.py edit was staged via `git add backend/app/cli/seed.py` while the concurrent 36-02 executor was finishing its commit. The 36-02 executor's commit (`0147bcf fix(36-02): SOBER-11 — Patine view renders empty-bucket section headers`) **inadvertently included the SOBER-14 seed change** in its diff, because the staging area was shared between the two parallel executors (the orchestrator's worktree posture for this run was main-repo, not per-executor worktrees).

- **Outcome:** SOBER-14 functional deliverable is committed to `main` and visible on disk — the seed bump works exactly as scoped.
- **Mis-labeling:** the commit message says `fix(36-02)` and lists SOBER-11 changes, but the diff also carries the SOBER-14 seed bump (`backend/app/cli/seed.py | 24 +++++++++++++++`).
- **Why not rewrite history:** The user's "no destructive git" rule and the explicit scope-creep memory rule both forbid force-rewinding a published commit — concurrent agents and the user's own work could land on `main` between the read and the rewind. Documenting the boundary here is the correct trade.
- **Traceability fix:** future grep-by-commit-message for SOBER-14 will miss `0147bcf`. The remediation is this SUMMARY plus the REQUIREMENTS.md traceability table — both name the commit.

No other deviations. The seed-only scope was respected; no frontend files touched; no new cooking-log rows added; no architectural changes.

## Threat surface scan

No new trust boundaries. The bump is gated by the existing `_guard_environment` refusal (T-10-01 — refuses non-test envs, refuses URLs without `aldente_test`). The prod-synthetic seed path (`run_prod_synthetic_seed`) is intentionally NOT bumped — DEMO01 keeps its `cook_count = 0` baseline. No new auth surface, no new external input, no new schema.

T-36-04-02 (denorm-contract carve-out, planned disposition `accept`): honored — the bump bypasses invariant #3 intentionally (no real cooking-log row to anchor against). The inline comment documents this carve-out as seed-demo-only.

## Known stubs

None. The bump is a real `cook_count = 12` assignment on a real Recipe row; the dogear render against it is the intended terminal state for SOBER-14 acceptance.

## Self-Check: PASSED

Files modified (verified on disk):
- FOUND: backend/app/cli/seed.py (`grep -nE 'SOBER-14|cook_count = 12'` returns 4 matches at lines 566, 579, 585, 588)
- FOUND: .planning/phases/36-sober-kitchen-finish-polish/36-04-SUMMARY.md (this file)

Commit (verified in git log via `git log -- backend/app/cli/seed.py`):
- FOUND: 0147bcf — carries the SOBER-14 seed-bump diff (mis-labeled as 36-02 due to the concurrent-staging scope-bleed described under "Deviations from Plan"). Diff for `backend/app/cli/seed.py` in `0147bcf` matches the 24-line SOBER-14 block byte-for-byte.

No new commit was created for this plan because the deliverable was already committed under `0147bcf` before this executor reached its commit step.
