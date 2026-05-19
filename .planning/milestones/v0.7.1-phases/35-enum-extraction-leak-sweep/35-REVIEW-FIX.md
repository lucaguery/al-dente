---
phase: 35
fixed_at: 2026-05-18T17:35:00Z
review_path: .planning/phases/35-enum-extraction-leak-sweep/35-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 35: Code Review Fix Report

**Fixed at:** 2026-05-18T17:35:00Z
**Source review:** .planning/phases/35-enum-extraction-leak-sweep/35-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (WR-01, WR-02, WR-03; WR-04 explicitly out of scope per orchestrator instruction)
- Fixed: 3
- Skipped: 0

## Fixed Issues

### WR-01: Dual-layer back-compat shim contradicts MVP no-shim posture

**Files modified:** `backend/app/schemas/recipe_turn.py`, `frontend/components/RecipeThread/SystemBubble.tsx`, `frontend/lib/format-field.ts`
**Commit:** 31c18a4
**Applied fix:** Added `TODO(productize)` markers per CLAUDE.md "Productize-later TODOs" convention at all three sites of the dual-layer shim (backend `_coerce_legacy_chips` validator, frontend `typeof chip === "string"` branch in SystemBubble, frontend `_legacy` short-circuit in format-field.ts). Each marker references the v0.8 follow-up phase where the shim can be ripped out once in-flight pre-Phase-35 summary turns have regenerated.

### WR-02: `formatFieldChip` empty-list display ambiguity

**Files modified:** `backend/app/services/llm.py`, `frontend/lib/format-field.ts`
**Commit:** 0784506
**Applied fix:** Two-layer:
1. Backend (`llm.py:932-944` chip-emission loop) — converted comprehension to explicit loop, skipping `ChipPayload` emission when `extracted_map[field]` is an empty list. Cleared-list fields (mood/seasonality/tags moving to `[]`) no longer surface as ambiguous "label : " chips.
2. Frontend (`format-field.ts` `mood`, `seasonality`, `tags` cases) — defense-in-depth: empty-array branch returns `{label, display: "—"}` (em-dash) instead of empty `.join` result. Catches manual-edit paths bypassing the backend filter.

### WR-03: Grep gate false-positive class for JSX attribute wire values

**Files modified:** `scripts/check-enum-leak.sh`
**Commit:** 441354c
**Applied fix:** Added a fifth post-filter pass: `grep -v -E '<[A-Za-z][^>]*[[:space:]][a-z][a-zA-Z]*=["'"'"']('"$TOKENS"')["'"'"']'`. Requires both a JSX opening-tag context (`<TagName`) AND an `attr="TOKEN"` pattern, so `const x = "italian"` (a real leak) is still caught while `<SelectItem value="italian">` (legitimate wire value) is allowed.

**Verification matrix (all 3 cases pass):**
- Current phase tip: exit 0 (gate clean)
- Adversarial `<p>italian</p>` (JSX text leak): exit 1 (caught)
- Adversarial `dataFoo: "italian"` (quoted non-JSX leak): exit 1 (caught)
- Allowed `<SelectItem value="italian">` (JSX attribute wire value): exit 0 (allowed)

## Skipped Issues

None — all in-scope findings were fixed.

---

_Fixed: 2026-05-18T17:35:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
