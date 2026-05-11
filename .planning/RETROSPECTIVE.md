# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v0.3 — Audit & Uniqueness Foundation

**Shipped:** 2026-05-11
**Phases:** 4 (11–14) | **Plans:** 16 | **Timeline:** 2026-05-09 → 2026-05-11 (3 days)

### What Was Built

- **Production synthetic household** (`[SYNTHETIC] Démo Al Dente`, invite code `DEMO01`) seeded idempotently against prod Supabase via `uv run seed --prod-synthetic`. Hard-refusal guard prevents accidental prod writes; uuid5 + Session.merge upsert closes the v0.2.2 SEED-01 cross-day idempotency hole *for the prod synthetic specifically*. RUNBOOK.md documents refresh/teardown.
- **WALKTHROUGH.md** — 1,276 lines, 14 surfaces, ~64 severity-tagged findings produced via Playwright MCP exploratory walkthrough. 8 GitHub issues filed (#1-#8) covering architecture-invariant breaks (#4 MEMBER_COUNT=2, #5 cook_count) and structural gaps (#2 ingredient parser, #3 stuck extraction, #6 missing detail route, #7 capacity ceiling, #8 PATCH 405).
- **UI-AUDIT.md** — 14 per-surface UI-REVIEWs scored under the 6-pillar rubric + new "feels generic vs feels Al Dente" originality verdict. Mean 20.21/24 across surfaces, distribution 5✅/9⚠/0❌. 13 cross-cutting observations clustered (token-completeness gap across 5 surfaces; Pillar 6 deficit 0/14 hitting 4/4).
- **ASSESSMENT.md** — 510-line synthesis combining WALK + AUDIT into 27 ranked findings across 3 tiers under a locked 3-axis composite rubric. 2 Tier 1 entries (architecture-invariant violations); 8 Tier 2; 17 Tier 3. Descriptive-only — anti-prescription discipline enforced structurally via `check-assessment.sh` grep gate.

### What Worked

- **Phase 13's "feels Al Dente" hybrid definition (token compliance + editorial cohesion) carried forward into Phase 14's axis-(i) scoring without redefinition.** Decision inheritance across phases prevented drift — Phase 14's planner cited Phase 13 D-02 directly.
- **The grep-gate-as-structural-enforcement pattern (D-07/D-08).** The plan-checker caught a self-defeating bug in iteration 1: Plan 14-01's skeleton text would have triggered its own anti-prescription gate. The gate is concrete (regex codified in RESEARCH.md, runs at known points, blocks commit) — converted SYNTH-02's abstract "descriptive not prescriptive" rule into a mechanical check.
- **Zero product-code drift across the entire milestone.** 19K+ insertions across 180 files, all under `.planning/`. The `feedback_executor_scope_creep` invariant held without exception. The audit-only discipline was real.
- **3-axis composite rubric (identity-signature / invariant-visible / primary-path-friction) operationalized "feels Al Dente" defensibly.** Each entry's rank can be challenged by pointing at a specific axis score — auditable, not vibes-only.
- **Phase 14's research step did the heavy reading.** WALKTHROUGH 131KB + UI-AUDIT 27KB + 14 UI-REVIEW files ≈ 200KB total were synthesized into a candidate cluster taxonomy + impact scores BEFORE planning, so the planner organized the synthesis rather than deriving it.

### What Was Inefficient

- **The chain hit a usage limit mid-Plan-14-02 spawn.** The agent received 0 tool calls before the limit fired; the worktree branch ended at the same commit as main. Required a resume cycle the next day. Cost: ~1 wasted Task spawn round-trip. Mitigation: longer phases / heavy Opus calls should defensively split mid-day or sleep until the budget window.
- **Phase 14's RESEARCH.md spent 76KB on candidate scaffolding** for what is essentially a writing phase. Some of that scaffolding (cluster taxonomy, tier projections) was load-bearing; some (open-question prose) was redundant with CONTEXT.md. Future synthesis phases could prune by ~30%.
- **The MILESTONES.md auto-extracted accomplishments were noisy** — included "One-liner:" labels and unrelated fragments because the SUMMARY.md frontmatter doesn't expose a clean `one_liner` field. Required a manual rewrite pass during milestone closure.
- **Discuss-phase wrote 401 lines (CONTEXT + DISCUSSION-LOG) for a 10-decision phase.** Some of that was conscientious (every decision has a why + how to apply), but the decision-density-per-page is low.
- **REQUIREMENTS.md checkboxes weren't auto-flipped during phase completion.** The CLI's `phase complete` output `requirements_updated: false` — required a manual perl pass during milestone archival to flip `[ ]` → `[x]` and traceability `Pending` → `Complete`.

### Patterns Established

- **Anti-prescription grep gate as a structural enforcement primitive.** Pattern: convert an abstract "don't do X" rule into a regex-blockable gate, run at plan-task level, fail loudly. Generalizes beyond v0.3 — useful any time a phase's deliverable has a discipline-enforced constraint (e.g., "no `any` types," "no mock-DB in integration tests," "no `console.log` in committed code").
- **Audit-only milestone discipline.** v0.3 demonstrated that a phase can ship 19K+ lines of insight without touching one line of product code. Pattern: when the milestone's goal is "understand," not "build," explicitly forbid `frontend/` and `backend/` modifications in the executor prompt and use `files_modified` frontmatter as the contract.
- **Worktree-isolation cleanup.** v0.3 was the first milestone to use `git worktree`-isolated executors. Pattern: capture EXPECTED_BASE before spawn; verify worktree branch base; merge fast-forward; restore orchestrator-owned files (STATE/ROADMAP) from main; unlock + force-remove + delete branch.
- **Tier 1 size as load-bearing signal.** ASSESSMENT.md's 2-entry Tier 1 IS the milestone-level finding — concentrating both top-impact entries on architecture-invariant violations communicates more than 7 evenly-tiered entries would. Pattern: don't pad the top tier to hit a target size; let it reflect what the data says.
- **Plan-checker as self-defeating-loop detector.** Reviewing not just whether instructions are clear, but whether the plan's verify steps would PASS against the actual values the plan tells the executor to produce. The Plan 14-01 skeleton bug (write text that the same plan's gate would block) is exactly this class of failure.

### Key Lessons

- **The plan-checker → planner-revision → plan-checker loop is worth the cost.** Iteration 1 found 1 BLOCKER + 4 WARNINGS in Phase 14's plans. The BLOCKER (skeleton text triggering own gate) would have burned a full executor revision cycle at runtime. The checker spent ~95K tokens; the prevented executor re-run would have been ~150K+. Net positive even excluding correctness benefits.
- **For audit-only phases, RESEARCH.md is the synthesis scaffold, not the synthesis.** The executor still writes the prose; the researcher organizes the inputs. Don't pre-write entry prose in research — that's executor work and burns Opus tokens twice.
- **Past-phase citations need explicit gate allowances.** D-08's forward-only pattern set blocks `phase (1[5-9]|[2-9][0-9])` (15+) but permits Phase 11/12/13 because those are descriptive references to source artifacts. Future projects using this pattern: calibrate the past-phase threshold to your milestone's actual scope.
- **Architecture invariants enforced at the spine, not the wire, leak user-visibly.** Phase 13's audit consistently surfaced invariant violations that the original implementation guarded *conceptually* but did not enforce at the spine (#4 MEMBER_COUNT=2, #5 cook_count, #6 missing route, #8 PATCH 405). The audit value of v0.3 is the gap between conceptual guard and enforced invariant.

### Cost Observations

- **Model mix:** Opus-heavy throughout (discuss / research / plan / executor all on Opus per init JSON). Sonnet on the verifier and plan-checker.
- **Sessions:** 1 long auto-chain session spanning 2 days (interrupted once by usage limit at Plan 14-02 spawn).
- **Notable:** The two-pass plan-checker (~95K tokens for iteration 1+2 combined) caught a runtime-bug-class issue at planning time. The cost-benefit math favored verification heavily.

## Cross-Milestone Trends

| Milestone | Phases | Plans | LOC delta | Code-prod drift | Tests added | UI audit |
|-----------|--------|-------|-----------|-----------------|-------------|----------|
| v0.1 | 5 | 31 | +70,950 | 283 files | 0 | 22.4/24 (v0.2 baseline) |
| v0.2 | 5 | 26 | (subset of v0.1) | 26 plans | 0 | 22.4/24 mean (best 23/24) |
| v0.2.1 | 1 | 7 | +9,431 | 56 files | 14 specs | n/a |
| **v0.3** | **4** | **16** | **+19,075** | **0 (audit-only)** | **0** | **20.21/24 mean (5✅/9⚠/0❌)** |

**Trends observed:**
- Milestone scope is shrinking (5 → 5 → 1 → 4 phases), reflecting the shift from build to validate to extend to audit.
- v0.3 is the FIRST milestone with zero product-code drift. This is by design (audit milestone) but establishes that "milestone = ship code" is not load-bearing.
- The UI audit baseline of 22.4/24 (v0.2 polish) vs v0.3 mean of 20.21/24 across 14 surfaces is a per-surface vs per-phase calibration difference; not a regression. Pillar 6 (Experience Design) is the load-bearing gap for any future quality push.
