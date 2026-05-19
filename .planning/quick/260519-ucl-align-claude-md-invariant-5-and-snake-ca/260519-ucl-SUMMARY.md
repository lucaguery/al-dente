---
phase: quick-260519-ucl
plan: 01
subsystem: docs
tags: [claude-md, adr-0001, invariant-5, graphify]
requires:
  - docs/adr/0001-recipe-conversation-thread.md
  - backend/alembic/versions/0009_add_recipe_turns_and_drop_source_capture.py
provides:
  - "CLAUDE.md Invariant 5 aligned with ADR-0001 (`recipe_turns` named as durable raw-input store; inline ADR link; explicit migration-0009 drop note)"
  - "CLAUDE.md snake_case naming example references a live column (`extracted_html_path`) instead of the dropped `source_capture` column"
affects:
  - CLAUDE.md
tech-stack:
  added: []
  patterns:
    - "Documentation drift caught by graphify knowledge-graph `surprising connection` query (semantic-similarity edge between Invariant 5 and `recipe_turns` despite no literal token overlap surfaced the stale text)"
key-files:
  created: []
  modified:
    - CLAUDE.md
decisions:
  - "Treat graphify `surprising connection` findings as a doc-drift signal channel: when the graph reports a high-semantic-similarity edge with no explicit citation between two regions of the codebase that should be referencing each other, that's evidence the file Claude reads on every turn has fallen behind the canonical source (here: ADR-0001 + CONTEXT.md + migration 0009)."
  - "Resolve drift by adding the explicit inline ADR link in the live doc (CLAUDE.md), which on next `graphify update .` promotes the currently-INFERRED Invariant5 ↔ `recipe_turns` edges to EXTRACTED — closes the loop without re-running discovery."
metrics:
  duration_seconds: 42
  completed: 2026-05-19T19:55:44Z
  tasks_completed: 1
  files_modified: 1
  commits: 1
---

# Quick 260519-ucl: Align CLAUDE.md Invariant 5 + snake_case example with ADR-0001 Summary

**One-liner:** Closed CLAUDE.md ↔ ADR-0001 drift surfaced by a graphify `surprising connection`: rewrote Invariant 5 to name `recipe_turns` as the durable raw-input store with an inline ADR-0001 link + migration-0009 drop note, and swapped a dead `source_capture` token in the snake_case example for the live `extracted_html_path` column.

## What Shipped

A single commit on `main` (`d85ecd9`) modifying only `CLAUDE.md`, 2 hunks, 4 lines changed (2+/2-):

1. **Hunk 1 — Invariant 5 rewrite (line 39).** Old text claimed `recipes.source_capture` JSONB was the live storage mechanism for original transcripts / URLs / photo paths. New text points at the `recipe_turns` table with an inline `[ADR-0001](docs/adr/0001-recipe-conversation-thread.md)` link, explains that the first user turn (position 0) preserves the capture payload verbatim, and explicitly records that the legacy `recipes.source_capture` JSONB column was dropped in Alembic migration `0009` (Phase 25 THREAD-01). Closes with a forward-pointing rule: don't reintroduce per-recipe blob fields for raw inputs — thread turns are the durable store.
2. **Hunk 2 — snake_case example (line 193).** Replaced the dead `source_capture` token in the backend-attributes example list with `extracted_html_path`, which is a live column already referenced in Invariant 4.

## Verification

All six plan-level checks plus the task's automated verify block passed against the new HEAD:

| # | Check | Result |
|---|-------|--------|
| 1 | `git log -1 --oneline` shows new `docs(claude-md):` commit | PASS (`d85ecd9 docs(claude-md): align Invariant 5 + snake_case example with ADR-0001`) |
| 2 | `git diff HEAD~1 HEAD --stat` reports exactly `CLAUDE.md | 4 ++--` | PASS (1 file changed, 2 insertions, 2 deletions) |
| 3 | `grep -c "source_capture" CLAUDE.md` returns `1` | PASS (sole match is the legacy-dropped phrase on line 39) |
| 4 | `grep -c "recipe_turns" CLAUDE.md` returns `>= 1` | PASS (2 matches: Invariant 5 + the Pattern Overview "Raw inputs preserved forever" bullet) |
| 5 | `grep -c "ADR-0001" CLAUDE.md` returns `>= 1` | PASS (1 match, inline link on line 39) |
| 6 | `git status` shows clean working tree for `CLAUDE.md` | PASS (working tree clean for tracked files) |
| Task-level automated verify | `recipe_turns` ∧ `ADR-0001` ∧ `extracted_html_path` all present in the diff; only `CLAUDE.md` modified | PASS |

## Deviations from Plan

None — plan executed exactly as written. The two edits were already staged in the working tree on entry; the executor's role was diff verification + consistency check + atomic commit. Used the `git commit -F <message-file>` fallback path (explicitly authorized by the plan's Task 1 step 4) instead of `gsd-sdk query commit` because the multi-line body with bullets is more reliably preserved through a tempfile than through argv quoting. Tempfile cleaned up after commit.

## Commits

| Hash | Subject | Files |
|------|---------|-------|
| `d85ecd9` | docs(claude-md): align Invariant 5 + snake_case example with ADR-0001 | CLAUDE.md |

## Self-Check: PASSED

- File `CLAUDE.md` exists and shows the new Invariant 5 text on line 39 + the new snake_case example on line 193 (verified via `grep -n` for `ADR-0001` and `extracted_html_path`).
- Commit `d85ecd9` exists on `main` (verified via `git rev-parse d85ecd9` and `git log -1 --stat`).
- ADR target `docs/adr/0001-recipe-conversation-thread.md` exists on disk.
- Working tree for `CLAUDE.md` is clean post-commit (only untracked path is the `.planning/quick/260519-ucl-…/` directory containing the plan + this summary, expected).

## Out of Scope (Orchestrator)

- Running `graphify update .` to refresh `graphify-out/graph.json` so the new explicit ADR-0001 reference promotes the currently-INFERRED Invariant5 ↔ `recipe_turns` edges to EXTRACTED.
- Updating `.planning/STATE.md` Quick Tasks Completed row.
- Committing PLAN.md / SUMMARY.md / STATE.md (separate docs commit by the orchestrator).
