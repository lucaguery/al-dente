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

## Milestone: v0.5 — Mixed Sweep

**Shipped:** 2026-05-13
**Phases:** 3 (22–24) | **Plans:** 9 | **Timeline:** 2026-05-12 → 2026-05-13 (~10 hours wall-clock, 2 calendar days)

### What Was Built

- **Quick wins (Phase 22, 3 plans in parallel via worktree-isolated executors):** Geist Mono font dependency dropped entirely (one fewer font request per page load); per-device build-stamp `VersionFooter` (`v{version} · {sha} · {env}`) on /settings via build-time env re-export in `next.config.ts`; `useEnumLabels()` wired into `ShortlistCard` + recipe detail page for cuisine/mood/protein French labels.
- **Deck polish (Phase 23, 4 requirements in one atomic commit per D-23):** `ring-2 ring-inset` color-tinted strokes replace OUI/NON drag overlays (REQUIREMENTS.md DECK-01 wording rewritten in-commit per D-01 — Tailwind's plain `ring-*` is clipped by `overflow-hidden`); swipe thresholds + spring retuned; thumb buttons swap to filled (emerald) / outline (neutral) Heart icons; tap-to-detail via `useRouter` + `panRef = useRef(false)` discrimination (`setTimeout(0)` clear per W-02 iOS Safari research).
- **Recipe identity (Phase 24, 5 plans across 2 waves):** new `BrandIcon` extracted from `app/icon.tsx` pasta-strand SVG with `currentColor` stroke + `ComponentType` structural typing, mounted on welcome + 3 empty states (PWA Edge twin preserved per D-09); Alembic 0007 adds 3 new optional recipe fields (`cook_time_minutes`, `difficulty TEXT+CHECK`, `description`) with `Difficulty` enum locked on both Python and TypeScript sides; pure `computeCompleteness()` helper (11 fields equal weight, 23 Node 24 `--experimental-strip-types` unit tests) + `CompletenessCard.tsx` with Suspense-wrapped `?focus=` edit-page navigation; **invariant #1 formally shifted** — `rewrite_title()` BackgroundTask moves quick + full-form from sync `structured`-on-return to async `draft → BackgroundTask → structured`, with `CLAUDE.md` invariant #1 updated in the same atomic commit (`5e6a2ff`); Alembic 0008 + stdlib `xml.etree.ElementTree` allowlist sanitizer (28 unit tests passing, reject-and-fallback per D-33, 4 KB pre-parse cap) + `RecipeIllustration` component using `dangerouslySetInnerHTML` (trust boundary justified by server-side validation) with `BrandIcon` fallback.
- **Closed 12 GitHub issues** (#10, #11, #12, #13, #14, #15, #16, #17, #18, #21, #22 Part A + Part B) across three coherent themes.

### What Worked

- **Single-atomic-commit-per-phase as an explicit option (Phase 23 D-23).** When 4 requirements share files (`ShortlistCard.tsx` + `swipe-tokens.ts`), shipping them as one commit beats artificially fragmenting them into 4 plans. Tradeoff acknowledged: the commit is larger, but cross-req coherence and merge-churn avoidance dominate at couple-scale.
- **Wave 1 parallel / Wave 2 serial pattern (Phase 24).** Pure-frontend (RID-01) and pure-backend (RID-02) ran in parallel via worktree-isolated executors (zero shared files); the 3 wave-2 plans all touched `services/llm.py` / `_apply_extracted` and ran serially to avoid merge churn. The dependency analysis is mechanical (shared-file detection) and ships in CONTEXT.md.
- **Invariant-shift-in-same-commit discipline (RID-04 D-30).** `rewrite_title()` and the `CLAUDE.md` invariant #1 update shipped in commit `5e6a2ff` together. Future readers can't be confused about when the shift happened — git blame is authoritative.
- **Mid-phase REQ rewrites for discovered constraints (DECK-01 D-01, RID-01 D-08).** When research surfaced that the literal requirement wording was infeasible (`overflow-hidden` clipping plain `ring-*`) or unnecessarily narrow (`EmptyState.icon: LucideIcon` blocking BrandIcon), the requirement text was rewritten in the same commit as the code. Traceability stays clean.
- **Stdlib over dependency for the SVG sanitizer (RID-05 D-33).** `xml.etree.ElementTree` (Python 3.12 ET is XXE-safe by default) over lxml (absent from `pyproject.toml`) or defusedxml (redundant). Smaller surface area, no new dep, 28 unit tests pin the allowlist.
- **`/gsd-code-review-fix` two-iteration loop.** Iteration 1 surfaced 3 warnings + 3 info findings. Iteration 2 applied all 3 Info fixes atomically (IN-01 onSubmit signature alignment, IN-02 defensive viewBox strip, IN-03 canned-fixture field completion). Warnings consciously deferred at couple-scale rather than auto-applied.

### What Was Inefficient

- **Plan 24-04 worktree collateral damage.** During the Wave 1 merge, the RID-02 backend files (SQLAlchemy columns, Pydantic schemas, enums, migration 0007) were dropped from the worktree base after their merge into the trunk. Plan 24-04 had to restore them inline as a Rule-3 blocker before its primary work — visible as commit `e758abe` "restore Alembic migration 0007." Cost: ~1 extra commit + executor diagnostic time. Mitigation: Wave 2 setup should verify worktree base contains Wave 1 outputs before spawning.
- **Plan 24-04 transient Gemini-API failure on first executor pass.** A retry was required; root cause was a network-layer hiccup, not a plan bug. Mitigation: BackgroundTask retry semantics could absorb this at runtime, but the planner doesn't.
- **DECK-01 design deviation surfaced mid-execution, not in research.** Phase 23's RESEARCH.md correctly identified the SWIPE_OVERLAY_INPUT_PX retune (SE-1), but the "full-card background tint won't work" was discovered in-code when the first attempt clipped under `overflow-hidden`. A pre-research grep for `overflow-hidden` against the target tree could have surfaced this earlier.
- **MILESTONES.md auto-extraction still noisy.** Same issue surfaced in v0.3 retro — the SUMMARY.md frontmatter doesn't expose a clean `one_liner` field that `gsd-tools frontmatter` can pluck, so the auto-extract grabs "One-liner:" labels as bullet text. v0.5 milestone closure did a manual rewrite pass for the accomplishments block.
- **REQUIREMENTS.md DECK-01 wording out of sync with success criteria for one commit.** The DECK-01 success criterion in the milestone roadmap still says "full-card color tint" in one place — caught and reconciled during milestone archive, but the roadmap-vs-REQUIREMENTS asymmetry is a recurring cleanup tax.

### Patterns Established

- **Shared-file dependency analysis as the gating heuristic for wave-vs-serial.** "These plans touch `services/llm.py` → serialize them" is a mechanical, file-grep-driven decision. Pattern generalizes: any time multiple plans converge on a single module, serialize unless the changes are truly orthogonal (e.g., adding a new helper vs editing an existing one).
- **PWA Edge-runtime twin preservation (D-09).** When a component lives in two runtimes (here: `BrandIcon` for React + `app/icon.tsx` for Next.js Edge ImageResponse), the canonical move is to extract the path data once and duplicate the wrapper — not to refactor one into the other. Edge ImageResponse can't import React component files.
- **Locked-vocabulary expansion ritual.** Adding `Difficulty` enum required updates to 4 spots: `backend/app/models/enums.py` (str Enum), `frontend/lib/enums.ts` (TS literal union), `Postgres CHECK constraint` (via Alembic), `frontend/lib/enum-labels.ts` (translation). The CLAUDE.md "drift between the two is a bug category" invariant is now load-bearing — future enum adds should reference this 4-spot checklist.
- **Async-pipeline-shape parity across capture surfaces.** All 5 capture surfaces (`quick`, full-form, `voice`, `photo`, `url`) now share the same `draft → BackgroundTask → structured` shape after v0.5. Invariant #1 in `CLAUDE.md` describes a single pipeline contract, not 5 special cases. Future capture surfaces inherit the contract automatically.
- **Trust-boundary code comment for `dangerouslySetInnerHTML` (RID-05 D-38).** Component prose explains *why* the inner HTML is safe (server-side allowlist sanitizer, 28 unit tests, reject-and-fallback only) instead of just suppressing the lint warning. Future React contributors can audit the trust assumption without reading the entire commit history.

### Key Lessons

- **Invariant shifts are commit-scope decisions, not documentation tasks.** Writing the CLAUDE.md invariant #1 update in the same atomic commit as `rewrite_title()` shipped is the canonical way to ensure documentation and code stay synchronized at the point of change. Splitting the doc update into a follow-up commit invites drift.
- **Couple-scale review judgment scales differently than enterprise.** WR-01 (idempotent `db.close()`), WR-02 (seed gaps on 18/21 recipes), WR-03 (BackgroundTask edit-race) are all real warnings. At enterprise scale, all three would be Critical. At couple-scale, all three are acknowledged-and-deferred with documented reasoning. The `code_review_depth: "standard"` mode + post-review judgment call is the right shape here.
- **REQUIREMENTS.md should be edited in the same commit as code that contradicts it.** Two examples in v0.5: DECK-01 ring-vs-tint (commit `98a0112`), RID-05 detail-vs-list placement (deferred to future ticket). The commit is the natural integration point — anything later is drift.
- **`dangerouslySetInnerHTML` is acceptable when the trust boundary is structurally enforced.** Static analysis can't see the sanitizer; humans can read the comment. The RID-05 sanitizer + 28-test allowlist + reject-and-fallback shape make the boundary auditable.

### Cost Observations

- **Model mix:** Opus-heavy throughout (init JSON: discuss/research/plan/executor all on Opus; verifier + plan-checker on Sonnet — but `workflow.verifier: false` for v0.5).
- **Sessions:** Multiple sessions over 2 days; one long auto-chain session for Phase 22, one for Phase 23, one for Phase 24 across waves 1 and 2.
- **Notable:** Plan 24-04 worktree collateral cost ~10 minutes of executor diagnostic time + 1 extra commit. The transient Gemini-API failure on Plan 24-04's first pass added a retry round-trip. Both were absorbed inline by the executor without escalation.

## Cross-Milestone Trends

| Milestone | Phases | Plans | LOC delta | Code-prod drift | Tests added | UI audit |
|-----------|--------|-------|-----------|-----------------|-------------|----------|
| v0.1 | 5 | 31 | +70,950 | 283 files | 0 | 22.4/24 (v0.2 baseline) |
| v0.2 | 5 | 26 | (subset of v0.1) | 26 plans | 0 | 22.4/24 mean (best 23/24) |
| v0.2.1 | 1 | 7 | +9,431 | 56 files | 14 specs | n/a |
| v0.3 | 4 | 16 | +19,075 | 0 (audit-only) | 0 | 20.21/24 mean (5✅/9⚠/0❌) |
| v0.4 | 7 | 27 | ~+27K | ~140 commits | pytest scaffold + 4 new e2e | 21.71/24 mean (11✅/3⚠/0❌, +1.50) |
| **v0.5** | **3** | **9** | **+13,491 / −142** | **75 files / 84 commits** | **28 SVG sanitizer unit + 23 completeness unit** | **n/a (no re-score this milestone)** |

**Trends observed:**

- Milestone scope continues to oscillate (5 → 5 → 1 → 4 → 7 → 3 phases). v0.5's 3-phase tightness is the most concentrated post-v0.2.1 — matches the "tight sweep" framing from `/gsd-explore`.
- v0.5 is the FIRST milestone where Python unit tests (SVG sanitizer, 28 cases) landed as load-bearing for security verification. Combined with the 23 TypeScript completeness unit tests under Node 24 `--experimental-strip-types`, this is also the first milestone running unit tests in TWO languages without adopting a test runner framework (vitest/jest absent).
- **Architecture invariant #1 has formally shifted** at v0.5 RID-04. This is the first invariant shift across the project — all prior milestones preserved the original 8 invariants verbatim. Future invariant shifts should follow the same pattern: code + `CLAUDE.md` in the same atomic commit.
- The `code_review_depth: "standard"` default + post-review judgment-call workflow has produced consistent "0 critical / few warnings / few info" rhythms across phases. Couple-scale calibration is settling.
- Worktree-isolated executor pattern is now standard for parallel wave execution (Phase 22's 3 plans, Phase 24's wave 1). Wave-1-to-wave-2 base-sync remains the recurring failure mode (Plan 24-04 needed RID-02 backend restoration).
