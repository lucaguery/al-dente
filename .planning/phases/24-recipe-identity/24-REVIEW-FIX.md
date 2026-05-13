---
phase: 24-recipe-identity
fixed_at: 2026-05-13T00:00:00Z
review_path: .planning/phases/24-recipe-identity/24-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 24: Code Review Fix Report

**Fixed at:** 2026-05-13
**Source review:** .planning/phases/24-recipe-identity/24-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (WR-01, WR-02, WR-03 — Critical+Warning scope)
- Fixed: 3
- Skipped: 0

## Fixed Issues

### WR-01: `retry_promotion` double `db.close()` in voice and manual branches

**Files modified:** `backend/app/services/llm.py`
**Commit:** 135fb58
**Applied fix:** Removed the two inline `db.close()` calls before `promote_voice_draft(...)` and `promote_full_draft(...)` in `retry_promotion`. The `finally: db.close()` block on line 744 is now the single close path for all branches, consistent with the photo branch. Updated comments to clarify that each promote function opens its own `SessionLocal`.

---

### WR-02: `run_prod_synthetic_seed` missing Phase 24 columns on Recipe constructor

**Files modified:** `backend/app/cli/seed.py`
**Commit:** e95e197
**Applied fix:** Added `cook_time_minutes`, `difficulty`, `description`, and `illustration_svg` to the `Recipe(...)` constructor in `run_prod_synthetic_seed`, using `spec.get(...)` for each — identical to the pattern already used in the dev seed path (lines 484–489). The DEMO01 household now receives completeness scores and illustrations for the three specs that define `illustration_svg`.

---

### WR-03: `promote_quick_draft` / `promote_full_draft` reading `recipe.title` instead of stable `source_capture.payload.title`

**Files modified:** `backend/app/services/llm.py`
**Commit:** f9a53c3
**Applied fix:** Both `promote_quick_draft` and `promote_full_draft` now derive `original_title` from `(recipe.source_capture or {}).get("payload", {}).get("title") or recipe.title` before passing it to `rewrite_title`. This reads invariant-5's stable copy of the user's original submission, making the rewrite deterministic regardless of concurrent PUT timing. The fallback to `recipe.title` handles quick captures with minimal `source_capture` data.

---

_Fixed: 2026-05-13_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
