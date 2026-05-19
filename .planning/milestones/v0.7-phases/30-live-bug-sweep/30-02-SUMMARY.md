---
phase: 30-live-bug-sweep
plan: "02"
subsystem: backend
tags: [bug-fix, svg-sanitizer, alembic, security, tests]
dependency_graph:
  requires: []
  provides: [BUG-02-fix, svg-sanitizer-ns0-free, migration-0012]
  affects: [backend/app/services/svg_sanitizer.py, backend/app/services/svg_sanitizer_test.py, backend/alembic/versions/0012_resanitize_illustration_svg.py]
tech_stack:
  added: []
  patterns: [ET.register_namespace module-level binding, belt-and-suspenders regex strip, idempotent Alembic data migration]
key_files:
  created:
    - backend/alembic/versions/0012_resanitize_illustration_svg.py
  modified:
    - backend/app/services/svg_sanitizer.py
    - backend/app/services/svg_sanitizer_test.py
decisions:
  - "D-06/D-07: Two-layer sanitizer fix — ET.register_namespace('', SVG_NS) at module level (primary) + re.sub(r'\\bns\\d+:') on serialized output (belt-and-suspenders)"
  - "D-09: Data migration re-runs stored payloads through current sanitize_recipe_svg — not a hand-rolled strip — preserving D-33 allowlist contract end-to-end"
  - "D-10: Alembic data migration (not a script) runs once on Railway deploy via alembic upgrade head; idempotent WHERE prevents re-processing clean rows"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-17"
  tasks: 3
  files: 3
---

# Phase 30 Plan 02: SVG Sanitizer ns0 Fix (BUG-02) Summary

**One-liner:** Two-layer ET namespace fix (`register_namespace` + regex strip) makes sanitizer emit browser-renderable `<svg>` markup; Alembic migration 0012 heals all existing `ns0:`-poisoned rows on next Railway deploy; 31 sanitizer tests green.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Two-layer SVG sanitizer fix — register_namespace + regex strip | 2aac641 | backend/app/services/svg_sanitizer.py |
| 2 | New sanitizer tests asserting no ns0 prefix + bare svg root + parametrized nsN absence | ae66afe | backend/app/services/svg_sanitizer_test.py |
| 3 | Alembic data migration 0012 — re-sanitize existing illustration_svg rows | 5d65d98 | backend/alembic/versions/0012_resanitize_illustration_svg.py |

## What Was Built

**BUG-02 root cause:** `xml.etree.ElementTree` invents a synthetic `ns0:` prefix when round-tripping a default-namespace SVG document (`<svg xmlns="http://www.w3.org/2000/svg">`). The output is valid XML but browsers cannot render it as inline SVG — so every per-recipe illustration on `RecipeCard` + `RecipeDraftCard` rendered as an empty muted square.

**Fix (Task 1):**
- **Layer 1 (primary):** `ET.register_namespace("", "http://www.w3.org/2000/svg")` at module level binds the empty prefix to the SVG namespace URI so `ET.tostring` emits `<svg xmlns="…">` instead of `<ns0:svg xmlns:ns0="…">`.
- **Layer 2 (belt-and-suspenders):** `re.sub(r"\bns\d+:", "", serialized)` strips any residual `nsN:` prefixes on the serialized output — survives future ET API drift. A second `re.sub` removes any dangling `xmlns:nsN="…"` declarations.
- All 28 existing security tests still pass — D-33 reject-and-fallback, D-34 normalization, full XSS allowlist contract unchanged.

**Tests (Task 2):**
- `test_serialized_svg_has_no_ns0_prefix` — pins the primary contract
- `test_serialized_svg_root_is_bare_svg` — asserts `startswith('<svg')`
- `test_serialized_svg_has_no_nsN_prefix` — regex asserts no `nsN:` for any N
- Stale comment ("ET may emit namespace-prefixed tags") removed from `test_accepts_clean_line_art_svg`; assertion strengthened from `assert 'path' in result` to `assert result.startswith('<svg')` + `assert '<path' in result`
- Total: **31 sanitizer tests green**

**Migration (Task 3):**
- `0012_resanitize_illustration_svg.py` chains from `0011`
- Idempotent WHERE: `illustration_svg LIKE '%ns0:%'` — no-op on already-clean DB
- Re-runs each candidate row through current `sanitize_recipe_svg` (D-09 contract)
- NULL rows that the sanitizer rejects (D-37 BrandIcon fallback — graceful degradation)
- Applied on dev: 1 candidate row healed, 0 nulled
- Will run automatically on next push to `main` via Railway's `alembic upgrade head` startup step

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The migration touches existing `illustration_svg` column data only (re-sanitizing stored payloads through the current allowlist). The regex-strip layer runs on post-allowlist-walk serialized output — it cannot introduce new tags or attributes. D-38 trust boundary intact.

## Known Stubs

None.

## Self-Check: PASSED

- `backend/app/services/svg_sanitizer.py` — FOUND (modified)
- `backend/app/services/svg_sanitizer_test.py` — FOUND (modified)
- `backend/alembic/versions/0012_resanitize_illustration_svg.py` — FOUND (created)
- commit 2aac641 — FOUND (fix: two-layer sanitizer fix)
- commit ae66afe — FOUND (test: new ns0 contract tests)
- commit 5d65d98 — FOUND (chore: migration 0012)
- `uv run pytest app/services/svg_sanitizer_test.py -q` — 31 passed
- `uv run alembic current` — 0012 (head)
- `uv run alembic heads` — 0012 (head)
