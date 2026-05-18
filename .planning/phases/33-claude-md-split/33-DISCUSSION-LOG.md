# Phase 33: CLAUDE.md split - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 33-claude-md-split
**Areas discussed:** GSD auto-managed markers, Borderline sections (Tests, Gemini SDK, Deployment, Current state), AGENTS.md cross-tool symmetry, Verification / no-drop strategy

---

## GSD auto-managed markers

| Option | Description | Selected |
|--------|-------------|----------|
| Mixed: cross-cutting stays at root, scoped moves | Keep `GSD:project`, `GSD:architecture`, `GSD:skills`, `GSD:profile` at root. Split `GSD:stack` and `GSD:conventions` bullets between scoped files. Move `GSD:workflow` to `.planning/CLAUDE.md` per success criterion #4. Planner verifies `gsd-docs-update` can refresh blocks at non-root locations. | ✓ |
| Strip all markers, hand-maintain | Delete every `<!-- GSD:* -->` pair; hand-maintain the scoped files. Rejected: silently keeping content in sync with source files (PROJECT.md / STACK / CONVENTIONS) is small overhead and high value. | |
| Keep all markers at root unchanged | Only move hand-written sections. Rejected: leaves `GSD:conventions` (mixed frontend + backend bullets) as scoped-guidance-at-root and violates success criterion #4 (`GSD:workflow` belongs in `.planning/CLAUDE.md`). | |

**User's choice:** Mixed strategy.
**Notes:** D-04 added as a tooling-verification fallback — if `gsd-docs-update` cannot refresh marker blocks at non-root paths, `GSD:stack` and `GSD:conventions` stay at root and we accept the slight cross-cutting leak. The core success-criterion-driven move (`GSD:workflow` → `.planning/CLAUDE.md`) is unconditional.

---

## Borderline sections — `## Tests`

| Option | Description | Selected |
|--------|-------------|----------|
| `frontend/CLAUDE.md` | Only frontend has runnable tests (`@playwright/test` + v0.2.1 seed); backend has no test runner today. | ✓ |
| Split: frontend gets Playwright, backend gets 'no runner yet' stub | More redundant but agents working in backend learn the gap directly. | |
| Drop entirely — Playwright posture in frontend, nothing elsewhere | Skip mentioning backend gap. | |

**User's choice:** `frontend/CLAUDE.md`.
**Notes:** Captured as D-05.

---

## Borderline sections — `## Gemini SDK`

| Option | Description | Selected |
|--------|-------------|----------|
| `backend/CLAUDE.md` | Only backend imports `from google import genai` in `app/services/llm/`. | ✓ |
| Keep at root as cross-cutting | 'Wrong SDK in training data' trap could bite any agent. Slightly more root cost. | |

**User's choice:** `backend/CLAUDE.md`.
**Notes:** Captured as D-06.

---

## Borderline sections — `## Deployment`

| Option | Description | Selected |
|--------|-------------|----------|
| Split by sentence | Root keeps 'push to main is the only deploy path' + hosting breakdown (cross-cutting). Backend gets `alembic upgrade head before uvicorn restart`. | ✓ |
| Keep entire section at root | Section is small (5 lines); splitting three ways is more bookkeeping than payoff. | |
| Move entire section to `docs/DEPLOYMENT.md` | Reduces root further but introduces a fourth surface, against the spirit of the split. | |

**User's choice:** Split by sentence.
**Notes:** Captured as D-07. D-09 explicitly rejects the `docs/DEPLOYMENT.md` extraction so future planners don't re-litigate.

---

## Borderline sections — `## Current state`

| Option | Description | Selected |
|--------|-------------|----------|
| Drop entirely — STATE.md is the source | Section already stale (says 'v0.5 (Mixed Sweep) shipped' when we're on v0.7). Source-of-truth block already points to `.planning/STATE.md`. | ✓ |
| Replace with one-liner pointer | Keep H2 but body is just 'See .planning/STATE.md'. Slightly redundant with Source-of-truth. | |
| Refresh the line to v0.7 and keep it | Accepts that it'll drift again at next milestone — same maintenance burden as before. | |

**User's choice:** Drop entirely.
**Notes:** Captured as D-08. The drift pattern (v0.5 → v0.6 → v0.7 staleness in this very section) was the deciding evidence.

---

## AGENTS.md cross-tool symmetry

| Option | Description | Selected |
|--------|-------------|----------|
| Frontend-only asymmetry stays | Keep `frontend/AGENTS.md` exactly as today; no `backend/AGENTS.md`, no `.planning/AGENTS.md`. | |
| Drop `frontend/AGENTS.md` — fold content into `frontend/CLAUDE.md` | Claude Code is the only assistant in active use; AGENTS.md is dead weight. Overrides 3 locked artifacts. | ✓ |
| Full symmetry — add `backend/AGENTS.md` + `.planning/AGENTS.md` as pointer stubs | Future-proofs against onboarding another tool. Cost: 2 trivial new files. | |
| Full symmetry — duplicate CLAUDE.md content into AGENTS.md | Most consistent for non-Claude-Code consumers. Cost: doubles content surface, creates drift class. | |

**User's choice:** Drop `frontend/AGENTS.md`; fold content into `frontend/CLAUDE.md`.
**Notes:** User asked "what's the purpose of AGENTS.md if CLAUDE.md exists?" mid-discussion. Explained AGENTS.md is cross-tool (Cursor / Aider / Continue / Cline read it); Claude Code reads both. User confirmed Claude Code is the only AI assistant in active use in this repo → AGENTS.md is dead weight here.

**Follow-up override question:** Deletion contradicts 3 locked artifacts (ROADMAP success criterion #3, REQUIREMENTS DX-01, PROJECT.md v0.7 gh#27 row). User chose **"Proceed — update the locked artifacts as part of Phase 33"** over the keep-AGENTS.md option or the defer-to-v0.8 option. Captured as D-12 with explicit edit list for the planner.

---

## Verification / no-drop strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Grep gates + plan-time mapping checklist | Layer 1: 33-01 plan includes a mapping table (every section → destination, plan-checker reads before approval). Layer 2: grep gates per scoped topic at plan close. Catches duplication and drops. | ✓ |
| Grep gates only (per ROADMAP criterion #5) | Stop at what ROADMAP locks; trust plan author + reviewer to catch drops. Highest risk of silent omission. | |
| Section-hash script + grep gates | Tiny bash script hashes every '## H2' pre-split and verifies each hash appears exactly once post-split. Most rigorous, but adds dead code after the split lands. | |

**User's choice:** Grep gates + plan-time mapping checklist.
**Notes:** Captured as D-13 with concrete grep commands and table-column specification. D-14 rejects the section-hash option to keep dead code out of the repo.

---

## Claude's Discretion

- **D-04 fallback wording.** Planner chooses how `gsd-docs-update` behavioral verification is structured (skill-internals inspection vs behavioral test). The CONTEXT.md captures the outcome (fallback applies or doesn't) but not the test mechanics.
- **`<!-- BEGIN:nextjs-agent-rules -->` markers inside the deleted `frontend/AGENTS.md`.** Planner picks whether to preserve those markers verbatim inside `frontend/CLAUDE.md` (cleanest for future tooling) or strip them (acceptable since AGENTS.md convention is abandoned here). Content preservation is the only hard requirement.
- **Plan count (33-01 only vs 33-01 + 33-02).** Planner picks. CONTEXT.md mentions a 2-plan shape (mapping + locked-artifact edits + scoped-file creation; then root pruning + verification) as a natural fit but doesn't mandate it.
- **Optional ADR-0002.** If the planner thinks D-12's AGENTS.md override deserves an architecture-record artifact, `docs/adr/0002-claude-md-only-no-agents-md.md` is the suggested filename. Optional.

## Deferred Ideas

- `gsd-docs-update` skill fix for arbitrary CLAUDE.md paths (if D-04's verification reveals a hardcoded root-CLAUDE.md assumption).
- `backend/AGENTS.md` / `.planning/AGENTS.md` revival if a future milestone adopts Cursor / Aider / Continue / another non-Claude-Code AI tool in active use.
- Section-hash verification script as a first feature of a future "doc integrity" tooling layer.
- Per-screen / per-feature documentation hierarchy under `docs/` — out of scope for v0.7.
- `docs/DEPLOYMENT.md` extraction if hosting / CI / deploy guidance grows beyond 5 lines.
