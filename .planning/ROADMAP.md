# Roadmap: Al Dente

## Completed Milestones

- **v0.1** ✅ (2026-05-05 → 2026-05-08) — Full PWA shipped: infra, onboarding, recipe library, LLM capture, daily shortlist, voting, cooking-log finalization, Web Push, realtime sync. 5 phases, 31 plans, 49 requirements. → [Archive](.planning/milestones/v0.1-ROADMAP.md)
- **v0.2** ✅ (2026-05-08) — Polish: Slow Food artisanal identity. Re-themed every surface (capture / decide / cook / onboarding) onto the Phase 5 design system (terracotta + warm-cream + Fraunces italic + paper-grain). Closed 5 W4 UI-REVIEW gaps inline (CAPTURE-11, DECIDE-05, COOK-07/08/11/12) plus the Phase 5 themeColor deferral. NEW PWA identity via Next.js 16 `app/icon.tsx`. UI audit average 22.4/24 across 5 phases (best 23/24). 5 phases, 26 plans, 31 requirements. → [Archive](.planning/milestones/v0.2-ROADMAP.md)
- **v0.2.1** ✅ (2026-05-08 → 2026-05-09) — E2E test infrastructure: one-command synthetic seed (`uv run seed` — 1 household + 2 members + 21 recipes + 3 cooking logs + 7 votes covering all 5 computed states, idempotent via uuid5+merge) + committed Playwright suite (14 specs across `seeded` and `fresh` projects, iPhone-shape Chromium viewport with `toBeInViewport()` on critical surfaces) + 4-command bootstrap runbook (`TESTING.md`). 1 phase, 7 plans, 4 requirements. → [Archive](.planning/milestones/v0.2.1-ROADMAP.md)

## Current Milestone

**v0.3 — Audit & Uniqueness Foundation** (started 2026-05-09)

Audit-only milestone. Produce a grounded, evidence-backed assessment of Al Dente's current UX and design quality on a real production environment so that v0.4 can target what genuinely makes the app unique. Zero new product features. Builds directly on v0.2.1 Phase 10 infrastructure (idempotent seed, Playwright wired, iPhone-shape Chromium viewport, `toBeInViewport()` assertions). Phase numbering continues at **Phase 11**.

**Granularity:** coarse — 4 phases, 1:1 with the 4 v0.3 requirement categories (SEED / WALK / AUDIT / SYNTH).

## Phases

**Phase Numbering:**
- Integer phases (11, 12, 13, 14): Planned milestone work
- Decimal phases (e.g., 11.1): Reserved for urgent insertions (none planned)

- [x] **Phase 11: Production Synthetic Household** — Extend `uv run seed` to run safely & idempotently against prod Supabase, producing one labeled synthetic household the operator can join from their phone. (completed 2026-05-09)
- [x] **Phase 12: Exploratory Feature Walkthrough** — Playwright MCP exploratory walkthrough across every shipped surface against the prod synthetic env; structured findings doc + GitHub issues for blockers. (completed 2026-05-09)
- [ ] **Phase 13: Design Quality & Originality Audit** — Per-surface 6-pillar `/gsd-ui-review` scoring + "feels generic vs feels Al Dente" originality verdict, anchored by Playwright MCP screenshots.
- [ ] **Phase 14: Synthesis & Handoff** — Single ranked-findings `ASSESSMENT.md` combining WALK + AUDIT outputs. Descriptive only — does NOT propose v0.4 phases.

## Phase Details

### Phase 11: Production Synthetic Household
**Goal**: Operator can run the seed CLI against prod Supabase and create/refresh a clearly-labeled synthetic household — same shape as the local seed (2 members + 21 recipes + 3 cooking logs + 7 votes covering all 5 computed states) — without touching real user data, with idempotent re-runs and a documented refresh / teardown path.
**Depends on**: Nothing (first phase of v0.3; consumes existing `uv run seed` infrastructure from v0.2.1 Phase 10).
**Requirements**: SEED-01, SEED-02, SEED-03, SEED-04, SEED-05
**Success Criteria** (what must be TRUE):
  1. Operator runs the seed CLI against prod Supabase with the explicit opt-in flag/env var and the CLI exits 0 after creating or updating exactly one synthetic household labeled per the chosen convention (e.g. "[SYNTHETIC] Démo Al Dente"), with no rows written outside that household scope.
  2. Re-running the same command on the same day, the next day, and a week later produces zero duplicate rows (recipes, votes, cooking_logs all converge), zero duplicate-key errors, the same household UUID, and the same invite code on every run — proving idempotency closes the v0.2.2 SEED-01 cross-day hole *for the prod synthetic specifically*.
  3. The CLI prints the synthetic household's invite code to stdout in a copy-pasteable form so the operator can join the synthetic env from their own phone.
  4. The seed refuses to run against prod unless an explicit opt-in flag or env var is set (mirrors the v0.2.1 T-10-01 hard-refusal guard pattern), and a runbook committed under `.planning/v0.3/` documents the refresh and teardown procedure.
  5. After the seed runs, the synthetic household contains exactly 2 members + 21 recipes + 3 cooking logs + 7 votes, with the votes producing all 5 computed states (Validé / Pressenti / Contesté / Rejeté / Sans avis) — verifiable by joining from the operator's iPhone.
**Plans**: 5 plans
  - [x] 11-01-PLAN.md — Foundation: argparse mode dispatch + prod-environment guard + D-04 symmetric refusal + synthetic-namespace helpers (uuid5, advisory-lock key, scope-assertion wrapper) + storage scope helpers (`synthetic/` prefix, idempotent upload, prefix-scoped teardown).
  - [x] 11-02-PLAN.md — Implement `run_prod_synthetic_seed`: advisory lock, household + 2 members + 21 recipes (with `photo_paths` populated), 3 cooking_logs (D-10 sliding dates), shortlist (D-11 sliding key), 7 votes producing all 5 states (D-12), post-seed COUNT-diff banner (D-13/15).
  - [x] 11-03-PLAN.md — Curate, resize, and commit 21 properly-licensed JPGs at `backend/app/cli/synthetic_photos/<slug>.jpg` + license-attribution README. Operator checkpoint for photo selection; structural validation for filenames + magic bytes + sizes.
  - [x] 11-04-PLAN.md — Implement `run_teardown`: advisory lock + 6 FK-ordered DELETEs (votes -> cooking_logs -> daily_shortlists -> recipes -> members -> households) + scope-guarded `synthetic/` Storage prefix delete + per-table removal banner.
  - [x] 11-05-PLAN.md — Operator runbook: `RUNBOOK.md` at repo root (TL;DR / Pre-flight / Banner shapes / Troubleshooting / iPhone join / By-design / Reference) + `.planning/v0.3/RUNBOOK.md` stub satisfying ROADMAP §Phase 11 success criterion 4.

**Threat model (load-bearing — surface in `/gsd-discuss-phase 11`):** This phase writes to the production database. Failure modes include (a) running against prod without intending to, (b) labeling that doesn't visibly distinguish the synthetic household from real users, (c) seed code paths that touch rows outside the synthetic household scope, (d) idempotency bugs that leave orphaned rows on re-run, (e) leaking the synthetic invite code to a real-user pathway. The hard-refusal guard, the household label, and the test-DB-only seed code path must all be reviewed under threat-model framing during planning. Treat this phase's threat-model gate seriously — it is the only phase in v0.3 with non-trivial risk.

**Out of scope:** No multi-tenant fixtures, no real-user seed data, no synthetic households beyond the single labeled one (per `REQUIREMENTS.md` Out of Scope).

### Phase 12: Exploratory Feature Walkthrough
**Goal**: Auditor (Playwright MCP) navigates the prod synthetic env like a curious human across every shipped surface, surfacing bugs and UX friction that scripted golden paths miss. Output: a structured `WALKTHROUGH.md` with severity-tagged findings; blocker findings filed as GitHub issues; friction/nit findings retained as input for Phase 14 synthesis.
**Depends on**: Phase 11 (synthetic env must exist before it can be explored).
**Requirements**: WALK-01, WALK-02, WALK-03, WALK-04
**Success Criteria** (what must be TRUE):
  1. `WALKTHROUGH.md` exists at `.planning/v0.3/WALKTHROUGH.md` with one section per shipped surface — the 5 capture surfaces (quick / full / voice / photo / url), shortlist, vote, cooking log, history, exports, push, realtime sync, onboarding, settings — and every section is non-empty (either findings or an explicit "no issues found" note).
  2. The walkthrough is demonstrably exploratory rather than scripted: each section includes at least one improvised input, unusual path, or weird-state probe (not just the golden path), with the probe documented so the approach is reproducible.
  3. Every finding in `WALKTHROUGH.md` carries a severity tag (`blocker` / `friction` / `nit`) and reproduction steps where applicable.
  4. Every `blocker`-severity finding has a corresponding GitHub issue filed under `lucaguery/al-dente` with reproduction steps; `WALKTHROUGH.md` links each blocker entry to its issue URL. Friction and nit findings remain in `WALKTHROUGH.md` as input to Phase 14.

**Out of scope:** No fixes. Findings are surfaced, not repaired — blockers go to GitHub issues, friction/nit stay in `WALKTHROUGH.md`. Repair is v0.4 territory or separate v0.2.2 work. (Per `feedback_executor_scope_creep` — this phase explicitly does not modify product code.)

**Plans**: TBD

### Phase 13: Design Quality & Originality Audit
**Goal**: Every screen reachable from the prod synthetic household is scored under the existing `/gsd-ui-review` 6-pillar rubric and given a "feels generic vs feels Al Dente" originality verdict, anchored by Playwright MCP screenshots committed alongside the audit doc.
**Depends on**: Phase 11 (synthetic env must exist). Phase 13 is sequenced after Phase 12 for simplicity (single auditor cadence) but does not consume Phase 12 outputs — both phases independently consume the synthetic env from Phase 11.
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04
**Success Criteria** (what must be TRUE):
  1. Every screen reachable from the synthetic household has a per-surface UI-REVIEW file under `.planning/v0.3/ui-reviews/` containing a complete `/gsd-ui-review` 6-pillar score and concrete justifications.
  2. Each per-surface UI-REVIEW carries a "feels generic vs feels Al Dente" originality verdict with at least one specific element flagged as boilerplate AND at least one specific element flagged as earned (or an explicit note when one direction is empty), so the verdict is grounded in observable detail rather than vibes.
  3. Each scored surface has at least one Playwright MCP screenshot committed under `.planning/v0.3/ui-reviews/` and linked from its UI-REVIEW file as visual evidence.
  4. A milestone-level `UI-AUDIT.md` exists at `.planning/v0.3/UI-AUDIT.md` aggregating per-surface 6-pillar scores and originality verdicts into a single readable summary, with one row per surface listed in WALK-01.
**Plans**: 4 plans
  - [x] 13-01-PLAN.md — Score 5 capture surfaces (capture-quick, capture-full, capture-voice, capture-photo, capture-url) — calibration heaviest UI density first per CONTEXT D-07.
  - [x] 13-02-PLAN.md — Score 4 decide+cook surfaces (shortlist, vote, cooking-log, history) with D-16 partial-reach notation for history (CL-01 missing endpoint).
  - [x] 13-03-PLAN.md — Score 5 cross-cutting + thinner surfaces (exports, push, realtime, onboarding, settings) — closes the 14-surface set per AUDIT-04.
  - [ ] 13-04-PLAN.md — Aggregate 14 per-surface UI-REVIEWs into `.planning/v0.3/UI-AUDIT.md` (milestone-level aggregator per CONTEXT D-14).
**UI hint**: yes

**Out of scope:** No design fixes, no token-system rework, no component rewrites. The audit produces scores and verdicts only — design responses are v0.4 territory.

### Phase 14: Synthesis & Handoff
**Goal**: Combine WALK findings + AUDIT scores into a single `ASSESSMENT.md` ranked by impact on the "feels Al Dente" question. The document is descriptive — it surfaces opportunities and tradeoffs but does NOT propose v0.4 phases, preserving clean separation between assessment and roadmap.
**Depends on**: Phase 12 (WALK) AND Phase 13 (AUDIT) — synthesis combines both outputs.
**Requirements**: SYNTH-01, SYNTH-02, SYNTH-03
**Success Criteria** (what must be TRUE):
  1. `ASSESSMENT.md` exists at `.planning/v0.3/ASSESSMENT.md` with a single ranked findings list that combines `WALKTHROUGH.md` entries and `UI-AUDIT.md` entries, ordered by impact on the "feels Al Dente" question, with each ranked finding citing its source artifact (`WALKTHROUGH.md` section or per-surface UI-REVIEW path).
  2. The document is demonstrably descriptive rather than prescriptive: it does NOT contain proposed v0.4 phases, named v0.4 plans, or a v0.4 roadmap. A reviewer can read the whole document and find no instruction of the form "v0.4 should build X." (This is independently verifiable by grep for phase numbers and roadmap-shaped headings.)
  3. `ASSESSMENT.md` closes with an explicit "Inputs to next `/gsd-new-milestone` cycle" section that names the artifacts and findings the v0.4 milestone-discovery should consume — naming inputs without dictating outputs.

**Out of scope:** v0.4 phase planning, v0.4 requirement definition, prescriptive recommendations. v0.4 scoping is a separate `/gsd-new-milestone` cycle that consumes (but is not authored by) `ASSESSMENT.md`.

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 11 → 12 → 13 → 14. Phase 13 may run in parallel with Phase 12 in principle (both consume the Phase 11 synthetic env independently) but is sequenced after 12 for simplicity unless planning surfaces a strong reason to parallelize.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 11. Production Synthetic Household | 5/5 | Complete    | 2026-05-09 |
| 12. Exploratory Feature Walkthrough | 5/5 | Complete    | 2026-05-09 |
| 13. Design Quality & Originality Audit | 3/4 | In Progress|  |
| 14. Synthesis & Handoff | 0/TBD | Not started | - |

## Next Steps

Once v0.3 ships:
- **v0.4** — first feature direction *informed by* `ASSESSMENT.md`. Scoped via a fresh `/gsd-new-milestone` cycle that consumes `ASSESSMENT.md` as input but is not authored by it.
- **v0.2.2 (optional, parallel-safe)** — close the 5 product issues from v0.2.1 Phase 10's runtime verification + v0.2 deferred polish. Independent of v0.3.
- **Behavioral validation gate** per `SPEC.md`: ≥ 2 weeks of daily use by both household members. Still the v0.1 definition of done; orthogonal to v0.3 audit work.

---
*Last updated: 2026-05-09 — v0.3 milestone scoped (4 phases, 16 requirements, 1:1 category-to-phase mapping). Phase numbering continues from v0.2.1 at Phase 11.*
