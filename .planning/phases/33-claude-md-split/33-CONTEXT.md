# Phase 33: CLAUDE.md split - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure documentation restructure. Move backend-specific, frontend-specific, and GSD-workflow guidance out of root `CLAUDE.md` and into scoped `backend/CLAUDE.md`, `frontend/CLAUDE.md`, and `.planning/CLAUDE.md` files so the root file's per-turn context cost shrinks. No runtime code changes.

Pre-split root `CLAUDE.md` is 114 lines / 17 H2 sections (10 hand-written, lines 1-62; 7 GSD auto-managed via `<!-- GSD:NAME-start source:X -->` markers, lines 64-114). Post-split target per ROADMAP success criterion #1: ≤ 60 lines of guidance at root (excluding the auto-managed sections).

**In scope:**

- Edit root `CLAUDE.md` to retain only architecture invariants, locked vocabularies, MVP posture, source-of-truth pointers, and cross-cutting GSD auto-managed blocks.
- Create `backend/CLAUDE.md` with every backend-specific rule moved out of root.
- Create `frontend/CLAUDE.md` with every frontend-specific rule moved out of root, plus the Next.js 16 framework-version warning currently in `frontend/AGENTS.md`.
- Create `.planning/CLAUDE.md` with the GSD workflow enforcement block.
- Delete `frontend/AGENTS.md` (its content folds into `frontend/CLAUDE.md` — see D-12 for the locked-artifact override this requires).
- Edit `ROADMAP.md`, `REQUIREMENTS.md`, and `PROJECT.md` to reflect the AGENTS.md override before the split itself runs (so success criteria don't read stale; see D-12).

**Out of scope:**

- `backend/AGENTS.md` or `.planning/AGENTS.md` creation (D-11 — frontend-only asymmetry was already special-case; collapsing it here, no new asymmetry introduced).
- Edits to `frontend/AGENTS.md`'s actual *content* before deletion (the 4-line warning moves verbatim).
- Runtime code changes. No file in `backend/app/`, `frontend/app/`, or `frontend/lib/` is touched.
- `gsd-docs-update` tooling changes — the planner verifies the existing tool can refresh GSD-marker blocks at non-root paths; tool-fix work is its own future phase if it can't (D-04 fallback).
- Replacing GSD-managed marker blocks with hand-maintained content (D-01 explicitly rejected this option).
- Adding new docs files outside the four committed paths (no `docs/DEPLOYMENT.md` extraction — option explicitly rejected during D-09).
- Per-screen / per-feature documentation. CLAUDE.md is project-wide guidance; design / feature docs live in `docs/`, `SPEC.md`, `docs/design-system.html` (unchanged).

</domain>

<decisions>
## Implementation Decisions

### Split strategy — GSD auto-managed marker blocks
- **D-01: Mixed strategy.** Keep the `<!-- GSD:* -->` markers but route each block to the file where its content semantically belongs:
  - **Stay at root:** `GSD:project` (pointer to PROJECT.md), `GSD:architecture` (cross-cutting summary), `GSD:skills` (cross-cutting skills index), `GSD:profile` (cross-cutting developer profile).
  - **Split bullets between scoped files:** `GSD:conventions` — frontend bullets (ESLint flat config, strict TS, `@/*` alias, `--webpack` build flag) → `frontend/CLAUDE.md`; backend bullets (`uv`-managed Python 3.12, SQLAlchemy 2.0 typed style, Pydantic v2, APScheduler single-worker) → `backend/CLAUDE.md`. The comment convention ("explain *why*, not *what*") stays at root as hand-written prose (not inside a GSD marker, since the marker source is split).
  - **Split or stay (planner verifies):** `GSD:stack` — frontend versions → `frontend/CLAUDE.md`; backend versions → `backend/CLAUDE.md`. If `gsd-docs-update` cannot refresh marker blocks at non-root paths (D-04), keep `GSD:stack` at root unchanged and accept the small cross-cutting leak.
  - **Relocate (mandated by ROADMAP success criterion #4):** `GSD:workflow` → `.planning/CLAUDE.md`.
- **D-02:** Strip-all-markers option (hand-maintain) was rejected — the auto-refresh is small overhead and silently keeps content in sync with `PROJECT.md` / `STACK` source files.
- **D-03:** Keep-all-markers-at-root option was rejected — leaves `GSD:conventions` (mixed frontend + backend) as scoped guidance at root, which violates the spirit of success criterion #1.

### Tooling verification gate
- **D-04: Plan 33-01 verifies `gsd-docs-update` behavior** with the moved markers. Concrete tests: (a) write a `frontend/CLAUDE.md` containing `<!-- GSD:conventions-start source:CONVENTIONS.md -->...<!-- GSD:conventions-end -->`, (b) trigger the refresh path the same way `/gsd-docs-update` does, (c) confirm the block body is regenerated correctly. If the tool only finds markers in root `CLAUDE.md`: fall back to keeping `GSD:conventions` and `GSD:stack` at root unchanged and accept that the convention bullets remain (slightly) at root. This fallback is OK because the *load-bearing* sections (Tests, Gemini SDK, Workflow Enforcement, hand-written conventions context) all still move. Outcome of the verification is captured in 33-01-SUMMARY.md.

### Borderline section assignments
- **D-05:** `## Tests` (root lines 56-58, Playwright posture + v0.2.1 seed) → `frontend/CLAUDE.md`. Only frontend has a runnable test suite; backend's "no Python test runner yet" gap doesn't need to be repeated.
- **D-06:** `## Gemini SDK` (root lines 60-62, "uses `google-genai`, not `google-generativeai`; imports `from google import genai`") → `backend/CLAUDE.md`. Only backend imports the SDK (in `app/services/llm/`).
- **D-07:** `## Deployment` (root lines 50-54) split by sentence:
  - **Root keeps:** "Push to `main` is the only deploy path. Both apps auto-deploy in ~60s. Never run `vercel --prod` or manual Railway deploys." (cross-cutting deploy invariant.)
  - **Root keeps:** "Hosting: Vercel (frontend, free) + Railway (backend, ~$5/mo) + Supabase (Postgres + Storage, free). Couple-scale workload assumed throughout." (cross-cutting orientation.)
  - **Moves to `backend/CLAUDE.md`:** "Railway runs `alembic upgrade head` before uvicorn restart on each deploy." (backend-specific runtime contract.)
- **D-08:** `## Current state` (root lines 21-23, "v0.5 (Mixed Sweep) shipped 2026-05-13. No active milestone") → **deleted entirely**. The "Source of truth" block already points to `.planning/STATE.md`; a static "current state" line in CLAUDE.md goes stale on every milestone shipping (v0.5 → v0.6 → v0.7 drift observed in this very file).
- **D-09:** `docs/DEPLOYMENT.md` extraction was rejected — keeps the split contained to the four mandated files.

### `frontend/CLAUDE.md` structure
- **D-10:** `frontend/CLAUDE.md` absorbs four content sources:
  1. Frontend-specific bullets from the `GSD:conventions` split (per D-01).
  2. Frontend-specific versions from the `GSD:stack` split (per D-01 / D-04).
  3. The `## Tests` Playwright posture (per D-05).
  4. The Next.js 16 framework-version warning currently in `frontend/AGENTS.md` (per D-13).
- The file's natural opening line is the Next.js 16 warning (most surprising, training-data-misaligned content first), followed by Tests, then Conventions, then Stack.

### `backend/CLAUDE.md` structure
- **D-11:** `backend/CLAUDE.md` absorbs three content sources:
  1. Backend-specific bullets from the `GSD:conventions` split (per D-01).
  2. Backend-specific versions from the `GSD:stack` split (per D-01 / D-04).
  3. The `## Gemini SDK` section verbatim (per D-06).
  4. The `alembic upgrade head` deploy sentence (per D-07).
- Reminder: the **single-uvicorn-worker reasoning** and **APScheduler in-process pattern** are already captured at root as architecture invariant #7 — they MUST NOT be duplicated into `backend/CLAUDE.md`. The grep gate at plan close enforces this.

### AGENTS.md cross-tool symmetry — override of locked artifacts
- **D-12: Delete `frontend/AGENTS.md`; fold its Next.js 16 warning into `frontend/CLAUDE.md`.** Claude Code is the only AI assistant used in this repo today (no Cursor / Aider / Continue in active use). The AGENTS.md cross-tool convention is dead weight in this repo. `backend/AGENTS.md` and `.planning/AGENTS.md` are **not** created.
  - **This decision overrides three locked artifacts.** Plan 33-01 MUST include a first-commit task to edit:
    1. `.planning/ROADMAP.md` Phase 33 success criterion #3 — replace "`frontend/AGENTS.md` is untouched" with "`frontend/AGENTS.md` is deleted; its Next.js 16 warning is folded verbatim into `frontend/CLAUDE.md`".
    2. `.planning/REQUIREMENTS.md` DX-01 — remove the clause "`frontend/AGENTS.md` stays in place (cross-tool — Cursor / Aider read it)" and replace with "`frontend/AGENTS.md` is deleted; its Next.js 16 warning lives in `frontend/CLAUDE.md`".
    3. `.planning/PROJECT.md` v0.7 locked-decisions table, gh#27 row — replace "Keep `frontend/AGENTS.md` (cross-tool) **and** add `frontend/CLAUDE.md` referencing it" with "Delete `frontend/AGENTS.md`; fold its Next.js 16 warning into a new `frontend/CLAUDE.md`. Reverses the original cross-tool decision because Claude Code is the only assistant in active use as of v0.7."
  - The locked-artifact edits MUST land in the same commit (or strictly before) the actual file deletion + creation, so plan-checker and verifier don't fail against stale success criteria.

### Verification approach
- **D-13: Grep gates + plan-time mapping checklist.** Two-layer verification:
  - **Layer 1 — Plan-time mapping table.** Plan 33-01 (or a 33-00 mapping plan, planner's discretion) includes a markdown table with one row per pre-split content unit (every H2 section + every bullet inside `GSD:conventions` + every bullet inside `GSD:stack`). Columns: `Source line range` / `Content one-liner` / `Destination file` / `Survives at root?`. Plan-checker reads the table before approving execution.
  - **Layer 2 — Grep gates at plan close.** Verifier runs:
    - `grep -rn "SQLAlchemy\|alembic\|uvicorn\|APScheduler\|google-genai\|google.genai" CLAUDE.md` at repo root → zero matches.
    - `grep -rn "@/\*\|eslint.config.mjs\|--webpack\|Playwright\|next-pwa\|next-intl\b" CLAUDE.md` at repo root → zero matches.
    - `grep -rn "SQLAlchemy\|alembic" frontend/CLAUDE.md` → zero matches.
    - `grep -rn "@/\*\|--webpack\|ESLint" backend/CLAUDE.md` → zero matches.
    - `ls frontend/AGENTS.md` → file not found (per D-12).
    - `wc -l < CLAUDE.md` → counts only the lines outside `<!-- GSD:* -->` blocks; result ≤ 60 of guidance content.
- **D-14:** Section-hash script option was rejected — adds a script for one-shot use that becomes dead code after the split lands.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope sources
- `.planning/ROADMAP.md` — Phase 33 block (goal + success criteria #1-5; criterion #3 will be edited per D-12 as part of Plan 33-01's first commit).
- `.planning/REQUIREMENTS.md` — DX-01 entry (will be edited per D-12).
- `.planning/PROJECT.md` — v0.7 Current Milestone block + Locked-decisions table gh#27 row (will be edited per D-12).
- `.planning/STATE.md` — refreshed 2026-05-18 to mark Phase 33 as the next active phase.

### Pre-split inventory (the file being restructured)
- `CLAUDE.md` (114 lines, 17 H2 sections) — the file Phase 33 mutates.
  - Lines 1-62: hand-written sections (Source of truth, Repo layout, Current state, MVP posture, Architecture invariants, Locked vocabularies, Productize-later TODOs, Deployment, Tests, Gemini SDK).
  - Lines 64-114: 7 GSD auto-managed blocks (Project, Tech Stack, Conventions, Architecture, Project Skills, GSD Workflow Enforcement, Developer Profile).

### Cross-tool / existing scoped docs
- `frontend/AGENTS.md` (5 lines, Next.js 16 framework-version warning) — to be deleted per D-12; content moves to `frontend/CLAUDE.md`.

### Source-of-truth docs that root CLAUDE.md will continue pointing at
- `SPEC.md` — data model, capture pipeline, scoring, voting state machine, original 4-wave plan (auth scheme superseded by invariant #8).
- `docs/design-system.html` — Sober Kitchen design system §15 mise-en-code (the contract Phase 32 just ported to).
- `docs/adr/0001-recipe-conversation-thread.md` — ADR for v0.6 conversation-capture rewrite.

### GSD tooling context
- `gsd-docs-update` skill — refreshes the `<!-- GSD:* -->` blocks. Plan 33-01 must verify it can refresh blocks at non-root paths (per D-04). If `gsd-docs-update` skill files are not directly inspectable, the verification can be a behavioral test (move a marker, run refresh, observe result).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Existing `<!-- GSD:NAME-start source:X -->` marker pattern.** Already used across 7 root-CLAUDE.md blocks. The scoped files will use the same marker shape (same `NAME`, same `source:X` pointer), so `gsd-docs-update` can find them by name regardless of which file they live in (pending D-04 verification).
- **Pre-split `frontend/AGENTS.md` `<!-- BEGIN:nextjs-agent-rules -->` markers.** The content inside those markers is the 4-line Next.js 16 warning. When folding into `frontend/CLAUDE.md` per D-12, the markers can either be (a) preserved verbatim inside the new file (cleanest — future tooling expectations stay intact), or (b) stripped (acceptable since the AGENTS.md convention is being abandoned in this repo). Planner picks; D-12's only hard requirement is content-preservation.

### Established Patterns
- **Hand-written H2 + auto-managed `<!-- GSD:* -->` mixed shape.** This is the file pattern Claude Code recognizes in CLAUDE.md files (`/init` produces the same shape). Scoped files should follow the same shape, not invent new conventions.
- **Phase 32 D-03 precedent: grep gates at plan boundaries, no separate close-out plan.** D-13's Layer 2 follows this pattern — gates run at plan-close, not as a standalone verification plan. If the split is structured as 2 plans (e.g., 33-01 mapping + locked-artifact edits + scoped-file creation; 33-02 root pruning + verification), the gates land at the close of 33-02.
- **`docs/adr/0001-recipe-conversation-thread.md` ADR convention.** If the AGENTS.md override per D-12 needs an architecture-record artifact (so future Claudes don't re-introduce AGENTS.md "for cross-tool support"), the planner may write `docs/adr/0002-claude-md-only-no-agents-md.md`. Optional — milestone-level decision capture in PROJECT.md is the minimum.

### Integration Points
- **GSD `<!-- GSD:project -->`, `<!-- GSD:architecture -->`, `<!-- GSD:skills -->`, `<!-- GSD:profile -->` blocks at root** — refreshed by `gsd-docs-update` from `.planning/PROJECT.md` / `.planning/codebase/ARCHITECTURE.md` / `.planning/codebase/STACK.md` / project-skills filesystem. Unchanged by Phase 33 (per D-01 "stay at root" branch).
- **`gsd-docs-update` skill** — the only consumer of the GSD markers. If it can refresh marker blocks at non-root paths, the split is mechanically clean. If it can't, D-04's fallback applies and `GSD:stack` + `GSD:conventions` markers stay at root (with bullets unsplit). The verification gate is in plan 33-01.

</code_context>

<specifics>
## Specific Ideas

- **Root file's natural shape after split (target):** `# CLAUDE.md` → "Keep short — loaded every turn" preamble → `## Source of truth` (pointer list, including new pointers to `backend/CLAUDE.md`, `frontend/CLAUDE.md`, `.planning/CLAUDE.md`) → `## Repo layout` (orientation) → `## MVP phase posture` → `## Architecture invariants` (the 8 numbered rules — load-bearing) → `## Locked vocabularies` → `## Productize-later TODOs` → `## Deployment` (just push-to-main + hosting line per D-07) → `## Comments` (the one-line "why not what" convention extracted from `GSD:conventions` per D-01) → GSD-managed blocks: `GSD:project`, `GSD:architecture`, `GSD:skills`, `GSD:profile`. Target line count: ≤ 60 lines of guidance excluding GSD blocks.

- **`frontend/CLAUDE.md` natural opening:** Lead with the Next.js 16 framework-version warning (most surprising / training-data-misaligned content first), then Conventions (frontend bullets), then Stack (frontend versions), then Tests (Playwright posture).

- **`backend/CLAUDE.md` natural opening:** Lead with the Gemini SDK correction (most training-data-misaligned: `google-genai` not `google-generativeai`), then Conventions (backend bullets), then Stack (backend versions), then the `alembic upgrade head` deploy line.

- **`.planning/CLAUDE.md` natural shape:** Minimal — just the GSD Workflow Enforcement block (current root lines 96-107). 12 lines including the marker pair.

- **AGENTS.md historical record:** If the planner writes an ADR per D-12 fallback, the title should be `0002-claude-md-only-no-agents-md.md` (continuing the v0.6 ADR-0001 pattern). One paragraph context, one paragraph decision, one paragraph consequences.

</specifics>

<deferred>
## Deferred Ideas

- **`gsd-docs-update` skill fix for arbitrary CLAUDE.md paths.** If D-04's behavioral verification reveals the tool only knows about root `CLAUDE.md`, fixing it to operate on any CLAUDE.md path (e.g., walk up from cwd, or accept an explicit path arg) is its own future phase / quick task — not in v0.7.
- **`backend/AGENTS.md` / `.planning/AGENTS.md` revival.** If a future milestone adopts Cursor / Aider / Continue / another non-Claude-Code AI tool in active use, the cross-tool AGENTS.md convention can be reintroduced. Today's D-12 decision is conditioned on Claude-Code-only usage; explicit revisit gate is "second AI assistant added to active workflow".
- **Section-hash verification script.** D-14 explicitly rejected it as one-shot dead code. If the project later builds a general "doc integrity" tooling layer, that hash script could be the first feature — out of scope for v0.7.
- **Per-screen / per-feature documentation files.** CLAUDE.md is project-wide; if `docs/` grows into a per-screen documentation hierarchy, that's a future docs-organization phase. Phase 33 does not touch `docs/`.
- **`docs/DEPLOYMENT.md` extraction.** D-09 rejected it. If hosting / CI / deploy guidance grows beyond 5 lines, extracting to a dedicated doc becomes worthwhile — for now it stays inline at root.

</deferred>

---

*Phase: 33-claude-md-split*
*Context gathered: 2026-05-18*
