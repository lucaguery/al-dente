# Phase 14: Synthesis & Handoff — Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 14 produces a single `ASSESSMENT.md` at `.planning/v0.3/ASSESSMENT.md` that combines `WALKTHROUGH.md` (Phase 12) + `UI-AUDIT.md` (Phase 13) + the 14 per-surface UI-REVIEW files + the 8 GitHub issues filed under `audit:walkthrough` (#1 Sheet-01 + #2-#8) into a tiered ranked findings list ordered by impact on the "feels Al Dente" question. The document is descriptive — it surfaces opportunities and tradeoffs but does NOT propose v0.4 phases, name v0.4 plans, or shape v0.4 roadmap. It closes with an explicit "Inputs to next /gsd-new-milestone cycle" section that names the artifacts and findings the v0.4 milestone-discovery should consume — naming inputs without dictating outputs.

**Auditor identity:** the same Claude session that wrote UI-AUDIT.md (Phase 13). No re-onboarding, no re-probing of the synthetic env, no Playwright MCP browser context needed. Phase 14 is read-only over the prior milestone artifacts.

**Not in this phase:**
- **No product code changes whatsoever** (audit-only milestone; per `feedback_executor_scope_creep`). Phase 14 produces only `.planning/v0.3/ASSESSMENT.md`.
- **No new GitHub issues** — issue-filing was Phase 12's mechanism for blockers (#1-#8 already filed); Phase 14 cites these but does not file new ones (mirrors Phase 13 D-domain).
- **No new probing of the synthetic env** — Phase 12 (WALKTHROUGH) and Phase 13 (UI-AUDIT) already exhausted the auditor's budget for live observation. If the synthesis surfaces a question about a surface, the auditor cites the gap rather than re-probing.
- **No re-scoring of the 14 surfaces** — Phase 13's 6-pillar scores and verdicts are inherited as-is. Synthesis ranks findings, not surfaces.
- **No proposed v0.4 phases, plans, requirements, or remediation actions** (SYNTH-02 — independently grep-verifiable per success criterion 2).
- **No effort estimation, no prioritization-for-action, no "what to fix first"** — these would be prescriptive shapes. Tier ordering reflects "feels Al Dente" impact, not implementation order.
- **No screenshot generation** — ASSESSMENT.md may link to existing screenshots in `walkthrough-screenshots/` and `ui-reviews/screenshots/` but does not capture new ones.

</domain>

<decisions>
## Implementation Decisions

### Finding unit & ranking method (SYNTH-01)

- **D-01: Atomic unit = per-cluster + per-blocker, ~25-35 ranked entries.** Cross-cutting clusters (the 13 already identified in `UI-AUDIT.md` "Cross-cutting observations" section + any net-new clusters surfaced by combining WALK + AUDIT) collapse into single ranked entries with surface citations: e.g., the emerald-Tailwind-literal cluster (5 surfaces → 1 entry), no-debounce-on-submit cluster (4 surfaces → 1 entry), shadcn-default icons cluster, validation-error-UX cluster. Architecture-invariant violations and unique blockers (Sheet-01 #1, ingredient parser #2, stuck-extraction #3, MEMBER_COUNT=2 #4, cook_count idempotency #5, missing detail route #6, capacity ceiling #7, PATCH 405 #8) appear as standalone entries. Total target range: 25-35 entries. Pro: best signal-to-noise; pro: matches `UI-AUDIT.md`'s pre-clustering work; pro: avoids the ~70-entry per-finding explosion that would make the ranking head feel cluttered.
- **D-02: Ordering = 3 tiers by impact band, ordered-but-not-strict-1..N within tier.** Group entries into Tier 1 (highest "feels Al Dente" impact — total impact score ≥4 per D-03), Tier 2 (mid-impact — total 2-3), Tier 3 (low-impact — total 0-1). Within tier, entries are ordered by total score (and then by axis-i breaking-identity-signature as tie-breaker), but the doc does not over-claim 1-vs-2 precision. Pro: tiers communicate the load-bearing signal v0.4 needs without forcing fine-grained ordering decisions that cannot be defended; pro: matches the calibration of impact judgment given the heterogeneous entry types (cluster vs single blocker vs nit).

### Impact rubric (the "feels Al Dente" operationalization)

- **D-03: Composite 3-axis scoring rubric.** Each entry scored on three orthogonal axes, each 0-2, total 0-6:
  - **Axis (i) — Identity-signature impact (0-2):** Does the entry compromise an Al Dente identity-bearing element? 2 = breaks an identity signature directly (Fraunces display moments / terracotta primary at h≈35° / paper-grain Card chassis / two-layer warm-brown shadows / framer-motion swipe-deck physics / Slow Food editorial copy register). 1 = degrades an identity-bearing element peripherally (e.g., emerald-Tailwind-literal undermines token-completeness without breaking the visual moment). 0 = no impact on identity surfaces.
  - **Axis (ii) — Invariant-violation visible to user (0-2):** Does the entry expose an architecture invariant (CLAUDE.md §invariants 1-8) breaking at the user-visible layer? 2 = invariant breaks user-visibly (e.g., #4 MEMBER_COUNT=2 hardcoded — vote chip semantics WRONG in non-2-member households; #5 cook_count doubled — invariant #3 violated; #6 missing detail route — surface unreachable; CL-01 GET endpoint missing — history empty). 1 = invariant breaks at code layer but masked from user (e.g., `cooking.finalized` 7th broadcast event missing from `services/realtime.py:9-19` canonical docstring — doc-vs-code drift, no user effect). 0 = no invariant impact.
  - **Axis (iii) — Friction at primary tap-path (0-2):** Does the entry friction the surface's primary user action (capture submit / vote tap / cooking-log finalize / onboarding share-code copy)? 2 = primary tap-path is gated, blocked, or produces wrong result (e.g., Sheet-01 photo-source button clipped 35px past viewport; #2 ingredient parser corrupts `<int> <noun>` in capture-full submission). 1 = primary tap-path completes but with friction (e.g., no-debounce-on-submit double-fires request; 422 surfaces as generic "Connexion impossible" toast). 0 = no primary-path impact (secondary surfaces, doc rot, observability gaps).
  - **Tier mapping:** Total ≥4 → Tier 1; total 2-3 → Tier 2; total 0-1 → Tier 3. Ties within tier broken by axis (i) (identity-signature impact takes precedence), then axis (ii), then axis (iii).
- **D-04: Rubric + per-entry scores fully exposed in the doc.** ASSESSMENT.md opens with a "Ranking method" section (right after the executive summary) explaining the 3 axes, scoring scale, and tier mapping. Each ranked entry shows its axis breakdown inline: `(i:2 / ii:2 / iii:1, total 5)` next to the entry title. Pro: maximally auditable to a v0.4 reader; pro: a v0.4 reader can challenge a rank by pointing at a specific axis score; pro: matches Phase 13 D-02's hybrid evidence discipline ("token compliance + editorial cohesion" — both observable, both measurable).

### Anti-prescription enforcement (SYNTH-02)

- **D-05: Schema-enforced finding template.** Each ranked entry uses a fixed-field template with allowed fields ONLY:
  - `Title` — short, descriptive, observational (e.g., "Emerald-Tailwind-literal cluster across 5 surfaces", NOT "Fix emerald-literal pattern")
  - `Tier` — 1 / 2 / 3
  - `Impact axes` — `(i:N / ii:N / iii:N, total N)` per D-03
  - `Observed` — descriptive prose; what the auditor saw (cites WALKTHROUGH/UI-AUDIT/UI-REVIEW/Issue)
  - `Where` — file path(s) + line range(s) where the pattern manifests; surface citations for clusters
  - `Pattern` (clusters only) — recurrence count + surface list; e.g., "5 surfaces — shortlist OUI thumb / vote validé chip border / cooking-log ChefHat / realtime cooking-banner ChefHat / onboarding MEMBER_COLORS"
  - `Why this impacts feels-Al-Dente` — one-paragraph link from observation to rubric axes (NOT a remediation path)
  - `Sources` — bullet list of source artifact citations (e.g., `WALKTHROUGH.md §Capture-Full P-12-F01`, `UI-AUDIT.md §capture-full`, `Issue #2`, `ui-reviews/capture-full-UI-REVIEW.md Pillar 6`)
  - **FORBIDDEN fields:** `Recommendation`, `Fix`, `Action`, `Proposed Phase`, `Effort`, `Priority`, `Next Step`, `TODO`, `When to address`, `v0.4 plan`. Schema enforces structure; structure enforces descriptiveness.
- **D-06: Observational voice convention.** Writing convention applied throughout the doc: passive-observational tone ("X is observed at Y", "this surfaces N times across surfaces", "the surface ships a CTA whose contract is …", "the rendered result is …") instead of active-prescriptive ("we should fix X", "v0.4 must address Y", "the team needs to …"). Subjects are observations and patterns, not actors. Documented here as a writing rule the auditor self-applies during drafting; reinforced by D-05's schema and D-07's grep gate.
- **D-07: Pre-commit grep gate.** Automated check before the ASSESSMENT.md commit lands. Plan executor runs the grep before invoking the commit; non-zero match → commit blocked with the offending lines printed. Matches SYNTH-02's literal grep-verifiability spec ("independently verifiable by grep for phase numbers and roadmap-shaped headings"); non-bypassable. Implementation as a single shell command the executor invokes; planner decides whether it lives in a script (e.g., `.planning/v0.3/check-assessment.sh`) or inline in the plan body.
- **D-08: Grep pattern set = forward-only.** The blocked patterns are:
  - `v0\.4` (case-insensitive, any context)
  - Prescriptive verbs in any direction: `should (fix|add|build|implement|do|consider|address|tackle|prioritize)`
  - `recommend(ed|s)?`, `propose(d|s)?`, `suggest(ed|s)?` (when used as verbs of action toward future work)
  - `must (fix|build|add|implement|do|address|prioritize)`
  - `next milestone (should|will|must|needs to)`
  - `TODO`, `action (item|step|plan)`, `next step`
  - `(roadmap|plan).{0,20}(for|of) v0`
  - `phase (1[5-9]|[2-9][0-9])` — future phase numbers (Phase 15+)
  - **Past-phase citations explicitly allowed:** `Phase 11`, `Phase 12`, `Phase 13` — these are descriptive references to source artifacts, not roadmap shapes. The grep regex anchors `phase` to digits ≥15 to permit citation-of-source while blocking forward-construction. Caveat: `phase 14` itself is permitted (this is the writing phase) but would be unusual in the doc.

### Document structure (the output shape)

- **D-09: Standard 4-section layout for ASSESSMENT.md.** Sections in order:
  1. **Executive summary** — 2-3 paragraphs. Milestone-level conclusion: how many surfaces, mean score, verdict distribution (5✅/9⚠/0❌), mean impact-axis profile across the corpus, the load-bearing finding-axes (e.g., "axis (ii) invariant-violation drives Tier 1; axis (i) identity-signature impact concentrated in Tier 2 token-completeness clusters"). Includes a "How to read this document" subsection that explains the descriptive-not-prescriptive boundary up front (so a v0.4 reader does not over-interpret).
  2. **Ranking method** — the 3-axis rubric exposed (D-04). Axes defined; scoring scale; tier mapping; tie-breaker rule. ~1-2 paragraphs + a short reference table.
  3. **Ranked findings** — ~25-35 entries (D-01) grouped into 3 tiers (D-02). Each entry uses the D-05 schema template. Tier 1 is the load-bearing signal v0.4 reads first; Tier 3 surfaces nits, doc rot, audit-time deltas (e.g., the WALKTHROUGH-vs-live-code MEMBER_COLORS palette delta from 4→5 swatches).
  4. **Inputs to next /gsd-new-milestone cycle** — SYNTH-03 (D-10).
- **D-10: Handoff section depth = artifacts + framing questions + explicit non-prescriptions.** Section 4 has three subsections:
  - **(a) Source artifacts** — paths to consume:
    - `.planning/v0.3/WALKTHROUGH.md` — Phase 12 exploratory-feature output, ~64 severity-tagged findings across 14 surfaces (with a one-line descriptor).
    - `.planning/v0.3/UI-AUDIT.md` — Phase 13 milestone aggregator, 14 surface verdicts + 13 cross-cutting observations (with a one-line descriptor).
    - `.planning/v0.3/ui-reviews/` (14 files) — per-surface 6-pillar UI-REVIEWs, ~48 supporting screenshots.
    - `.planning/v0.3/walkthrough-screenshots/` + `.planning/v0.3/ui-reviews/screenshots/` — visual evidence committed in git.
    - GitHub issues `lucaguery/al-dente` `audit:walkthrough` label: `#1` (Sheet-01), `#2` (ingredient parser), `#3` (stuck extraction), `#4` (MEMBER_COUNT=2), `#5` (cook_count idempotency), `#6` (missing detail route), `#7` (capacity ceiling), `#8` (PATCH 405).
    - `.planning/REQUIREMENTS.md` (v0.3) and `.planning/PROJECT.md` "Surfaced for follow-up (v0.2.2 backlog)" — orthogonal backlog state at v0.3 ship.
  - **(b) Open framing questions** — 3-5 questions v0.4 should reckon with WITHOUT prescribing answers. Examples (writer's discretion to refine):
    - "How does v0.4 weigh remediation depth vs. new capability development?" (does not answer; cites the impact distribution as input.)
    - "Should clusters be addressed coordinated (single phase) or independently (per-cluster phases)?" (does not answer; cites the cluster taxonomy as input.)
    - "How does v0.4 weigh fixing architecture-invariant violations vs. closing identity-signature gaps?" (does not answer; cites the axis (i) vs axis (ii) distribution.)
    - Questions are phrased as inquiries v0.4 must answer, not as constraints v0.4 must respect.
  - **(c) Explicit non-prescriptions** — bullet list of what ASSESSMENT.md does NOT do, written in present-tense voice:
    - "ASSESSMENT.md does not order remediation."
    - "ASSESSMENT.md does not estimate effort."
    - "ASSESSMENT.md does not propose phase shapes, plan shapes, or v0.4 requirements."
    - "ASSESSMENT.md does not assert that addressing a Tier 1 finding will flip a surface verdict from ⚠ to ✅ — verdict shifts depend on multi-finding bundles and v0.4 implementation choices."
    - "Tier ordering reflects impact on 'feels Al Dente', not implementation priority — these are not the same axis."
  - Pro: makes the SYNTH-02 boundary visible to v0.4 readers; pro: gives v0.4 genuine handles without prescribing; pro: framing questions match SYNTH-03's "names the inputs but stops short of dictating outputs" wording.

### Operational decisions

- **Plan split:** Recommended single plan (synthesize → grep-gate → commit), but planner may split into 2 plans if context budget warrants (Plan 1: cluster identification + draft Tiers 1/2/3; Plan 2: ranking method section + handoff section + grep-gate verification + commit). Planner decides based on a sizing assessment of the ~25-35 entries × ~150-300 words each = ~5K-10K-word doc. Either shape is acceptable.
- **Cluster identification process:** The auditor's first task in writing the doc is identifying the cluster set. UI-AUDIT.md "Cross-cutting observations" already names ~13 clusters; the auditor reviews these and combines/splits as needed for the rank target (~5-10 cluster entries vs ~15-25 standalone entries within ~25-35 total). The auditor MAY surface net-new clusters that arise from combining WALK + AUDIT views (a cluster pattern visible only across both inputs), but the bar is high: a cluster is justified only if ≥3 surfaces share the pattern.
- **Citation format:** Each entry's `Sources` field cites artifacts using the format already established in Phase 12/13: `WALKTHROUGH.md §<surface> <finding-id>` (e.g., `WALKTHROUGH.md §Capture-Full P-12-F01`); `UI-AUDIT.md §<surface>` for per-surface abstracts; `UI-AUDIT.md "Cross-cutting observations" bullet N` for cluster sources; `ui-reviews/<surface>-UI-REVIEW.md Pillar N` for pillar-specific findings; `Issue #N` for GitHub issues. No quote excerpts — bidirectional navigation, deterministic, mirrors Phase 13 D-12.
- **Verdict distribution as fixed input:** Phase 13's verdict count (5✅/9⚠/0❌) is inherited as-is. Phase 14 references but does NOT re-score surfaces. If Phase 14's synthesis surfaces a tension where a surface's verdict might warrant reconsideration, the auditor records this as an entry in the ranked findings (axis (i) impact) rather than as a rescore.
- **Backlog reconciliation:** The audit re-confirmed POLISH-02 closed (Copy button shipped at both `/onboarding/share-code` and `/settings`); the WALKTHROUGH §Settings P-12-S01 entry already notes this. Phase 14 cites this finding to flag backlog hygiene as a Tier 3 entry — the v0.2.2 backlog still lists POLISH-02 as open in `PROJECT.md`, descriptive note only. NO instruction to update the backlog (that would be prescription).
- **MEMBER_COLORS audit-time delta:** UI-AUDIT.md notes a 4→5 swatch discrepancy between WALKTHROUGH (which stated 4) and live `frontend/lib/colors.ts` (which has 5). Phase 14 records this as a Tier 3 entry (axis-i:0 / ii:0 / iii:0; pure observability/doc-rot finding). The capacity-ceiling Issue #7 stands at N=5; ASSESSMENT.md cites the actual count.
- **D-16 partial-reach surfaces (push, history):** Phase 13 marked these "Partially reached." Phase 14 inherits the partial-reach annotation; ASSESSMENT.md notes that 2 of 14 surfaces have constrained observability and that ranking entries for those surfaces should be read with this caveat (descriptive note, not a remediation hint).

### Claude's Discretion

The following are implementation details the planner / executor decides without re-asking:

- Exact wording of executive summary paragraphs (D-09 §1) — recommend 2-3 paragraphs, milestone-level, with the "how to read" subsection appearing as a fenced box or short subsection.
- Exact wording of the framing questions in D-10 (b) — recommend 3-5 questions; the auditor refines based on what the synthesis actually surfaces. The 3 examples in D-10 are illustrative, not mandatory.
- Whether to include a short "Calibration notes" subsection inside Section 1 or Section 2 (recommend Section 1 — milestone framing belongs in the executive summary; UI-AUDIT.md's calibration notes section is the source).
- Plan split fine-tuning (1 vs 2 plans) — see Operational decisions above.
- Implementation of the grep gate (inline in plan body vs separate `.sh` script) — recommend separate script at `.planning/v0.3/check-assessment.sh` so v0.4 readers can re-run it as evidence the doc passes the gate.
- Exact tier-1 vs tier-2 vs tier-3 entry counts — D-01 says ~25-35 total but doesn't fix the per-tier split. Recommend Tier 1 ~5-8 entries, Tier 2 ~10-15 entries, Tier 3 ~10-15 entries; auditor calibrates against actual scoring.
- Whether to add inline links from per-surface citations to the actual UI-REVIEW.md headings (recommend yes — markdown anchor links to specific Pillar headings).
- Tie-breaker behavior when two entries have identical (i,ii,iii) — recommend total-score-then-axis-i-then-axis-ii-then-arbitrary; auditor's discretion within tier.
- Whether to include a one-paragraph "Limits of this assessment" note in Section 1 (recommend yes — covers D-16 partial-reach + couple-scale audit corpus + iPhone-shape-Chromium-only viewport).

### Folded Todos

None — `gsd-tools todo match-phase 14` returned 0 matches.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source of truth & milestone scope
- `.planning/REQUIREMENTS.md` §"SYNTH — Synthesis & Handoff" — SYNTH-01..03 acceptance criteria (authoritative).
- `.planning/ROADMAP.md` §"Phase 14: Synthesis & Handoff" — goal, success criteria 1/2/3 (especially #2's "independently verifiable by grep for phase numbers and roadmap-shaped headings"), out-of-scope clause (no v0.4 phase planning).
- `.planning/PROJECT.md` — Current Milestone v0.3 framing + "Surfaced for follow-up (v0.2.2 backlog)" section (orthogonal backlog state at v0.3 ship).
- `CLAUDE.md` (repo root) — Architecture invariants 1-8 (used by D-03 axis (ii) impact scoring; especially #2 voting state computed, #3 denorm same-tx, #4 realtime broadcast, #6 next-intl French-only, #8 cookie auth).
- `SPEC.md` (repo root) — locked vocabularies (used to spot-check copy fidelity in citations to Pillar 1 findings).

### Inputs to the synthesis (the load-bearing read set)
- `.planning/v0.3/WALKTHROUGH.md` — 1,276 lines, 14 surfaces, ~64 severity-tagged findings, severity rubric (blocker/friction/nit), GitHub issue cross-links #1-#8. Closing section "Inputs to Phase 14" pre-clusters 9 candidate themes (architecture-invariant violations / capture-pipeline missing terminal state / capacity & CRUD gaps / history feature decommissioned / validation-error UX cluster / push UX three-gap / TZ-01 cross-link / audit-environment infrastructure / persistent prod-data anomalies). Phase 14 incorporates these but is not bound by their groupings.
- `.planning/v0.3/UI-AUDIT.md` — Phase 13 milestone aggregator. Contains: (a) one-row-per-surface table (verdict + 6-pillar score + pillar lows + top finding); (b) per-surface abstracts (~2-3 paragraphs each); (c) 13 cross-cutting observations clustered by pattern; (d) calibration notes (v0.2 anchor 22.4/24 vs v0.3 mean 20.21/24). The cross-cutting observations are the seed cluster set Phase 14 refines.
- `.planning/v0.3/ui-reviews/<surface>-UI-REVIEW.md` (14 files) — per-surface 6-pillar UI-REVIEWs with verdict + boilerplate/earned table + pillar findings + WALKTHROUGH cross-link footer. Phase 14 cites these for axis-(i) identity-signature scoring on individual entries.
- `.planning/v0.3/walkthrough-screenshots/` (~48 PNGs) + `.planning/v0.3/ui-reviews/screenshots/` (~40-60 PNGs) — visual evidence committed in git. Phase 14 may link but does not capture new screenshots.
- GitHub issues `lucaguery/al-dente` `audit:walkthrough` label — #1 (Sheet-01 photo-source clipped), #2 (ingredient parser corrupts `<int> <noun>`), #3 (stuck extraction on Gemini failure), #4 (MEMBER_COUNT=2 hardcoded), #5 (cook_count idempotency), #6 (missing `/cooking-logs/{id}` route), #7 (5-member capacity ceiling), #8 (`PATCH /api/households/me` 405). Phase 14 cites by issue number.

### Prior-phase context (decisions inherited)
- `.planning/phases/13-design-quality-originality-audit/13-CONTEXT.md` — Phase 13 decisions, especially:
  - D-01 verdict shape (✅/⚠/❌ enum) — Phase 14 references but does not redefine.
  - D-02 "feels Al Dente" hybrid definition (token compliance + editorial cohesion) — Phase 14's axis (i) scoring grounds in this definition.
  - D-13 WALKTHROUGH-evidence-pulls-scores-down — established the bridge between WALK findings and pillar scores; Phase 14's axis-(iii) primary-path-friction scoring builds on this.
  - D-14 UI-AUDIT.md aggregator structure — the input shape Phase 14 reads.
  - D-15 score calibration anchors (v0.2 22.4/24 baseline) — Phase 14's executive summary cites.
- `.planning/phases/12-exploratory-feature-walkthrough/12-CONTEXT.md` — Phase 12 decisions, especially:
  - D-04 finding template (severity / surface / repro / cross-link / impact) — Phase 14's D-05 schema template inherits the descriptive shape.
  - D-05 issue-vs-backlog filing rule — Phase 14 inherits "no new issues" stance.
  - D-08 weird-state probe density — irrelevant to Phase 14 (no probing).
- `.planning/phases/11-production-synthetic-household/11-CONTEXT.md` — synthetic env schema, invite code (`DEMO01`), member identities. Phase 14 doesn't access the env directly but cites the synthetic identity in the doc.

### Anti-pattern guards (load-bearing for SYNTH-02)
- Memory: `feedback_executor_scope_creep.md` — gsd-executor previously modified files outside plan scope. Phase 14's plans MUST pass this CONTEXT.md to the executor with a hard constraint: **only `.planning/v0.3/ASSESSMENT.md` is created/modified; no product code; no other planning files modified except STATE.md via the post-plan tooling**. The grep gate (D-07/D-08) is the structural enforcement; the schema (D-05) is the structural prevention.
- Memory: `feedback_no_manual_vercel_deploy.md` — push to `main` is the only deploy path. Phase 14 doesn't deploy; this guard is informational (audit work doesn't ship).

### Backlog & follow-up state
- `.planning/PROJECT.md` "Surfaced for follow-up (v0.2.2 backlog)" — Sheet-01 (#1), TZ-01, URL-01, CL-01, SEED-01 (local), POLISH-01, POLISH-02. Phase 14 cites where the audit confirms / closes / extends a backlog entry (descriptive only, not as instruction to update the backlog).

### New artifacts Phase 14 will create
- `.planning/v0.3/ASSESSMENT.md` — single output (target ~5K-10K words; ~25-35 ranked entries across 3 tiers).
- (Optional, planner's discretion) `.planning/v0.3/check-assessment.sh` — pre-commit grep gate script implementing D-07/D-08.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **No code reuse** — Phase 14 is read-only over `.planning/` artifacts. No frontend or backend code is read or modified.
- **Phase 12/13 finding-template conventions** — D-05 schema inherits the descriptive shape established in Phase 12 D-04 (severity / surface / repro / cross-link). Phase 14's template adds Tier and Impact-axes fields specific to the synthesis ranking.
- **Phase 12/13 citation conventions** — `WALKTHROUGH.md §<surface> <finding-id>` and `UI-AUDIT.md §<surface>` patterns already in active use; Phase 14 reuses verbatim.
- **UI-AUDIT.md Cross-cutting observations** — 13 already-clustered patterns (token-completeness gap; typography/spacing/copy strong axes; Pillar 6 deficit; shadcn-default survivors; verdict-driving patterns; architecture-invariant violations cluster; no-debounce-on-submit cluster; i18n drift; POLISH-02 resolution; MEMBER_COLORS audit-time delta; D-16 partial-reach). These are the seed cluster set Phase 14 refines (D-01).

### Established Patterns
- **Audit milestone discipline** (Phase 12/13 pattern, `feedback_executor_scope_creep`) — audit work writes only `.planning/` artifacts. Never touches `frontend/`, `backend/`, or product code. Phase 14 inherits unchanged.
- **Source-citation per finding** (Phase 12 D-04, Phase 13 D-12) — bidirectional navigation between artifacts via deterministic anchor cites (`WALKTHROUGH.md §<surface> <finding-id>`, `UI-AUDIT.md §<surface>`, `Issue #N`). Phase 14's D-05 schema requires this in every entry's `Sources` field.
- **Descriptive-not-prescriptive voice** (Phase 12 D-domain, Phase 13 D-domain) — both prior phases were already audit-only and observational. Phase 14 layers schema (D-05) + voice (D-06) + grep gate (D-07/D-08) on top to make this auditable rather than implicit.

### Integration Points
- **`.planning/v0.3/` directory** — sibling to `WALKTHROUGH.md` / `UI-AUDIT.md` / `RUNBOOK.md` / `ui-reviews/` / `walkthrough-screenshots/`. ASSESSMENT.md becomes the 4th milestone-level doc in this directory.
- **GitHub issues `audit:walkthrough` label** — read-only reference. Phase 14 cites by issue number; does not file or modify issues.
- **`.planning/STATE.md`** — updated by the post-plan tooling (state record-session) after the phase plan is written. Phase 14's plans do not modify STATE.md directly.

</code_context>

<specifics>
## Specific Ideas

- **The 3-axis rubric mirrors Phase 13's D-02 hybrid evidence discipline.** Phase 13 D-02 defined "feels Al Dente" as token compliance + editorial cohesion — both observable, both measurable, neither vibes-only. Phase 14's axis (i) (identity-signature) is the synthesis equivalent of Phase 13's "editorial cohesion" half; axis (ii) (invariant-violation visible) and axis (iii) (primary-path friction) extend the observability to architecture and user-impact dimensions that Phase 13's score-per-surface couldn't isolate. The rubric is grounded in Phase 13's contract, not invented from scratch.
- **D-08's grep pattern set is calibrated to past-phase citations.** Phase 14 will legitimately cite "Phase 11", "Phase 12", "Phase 13" as source artifacts (e.g., "per Phase 13 D-02, the verdict definition is..."). These are descriptive references to documented decisions, not roadmap shapes. The regex's `phase (1[5-9]|[2-9][0-9])` clause anchors blocking to digits ≥15 — past phases are permitted, future phases are blocked. This is calibrated to v0.3 specifically; if v0.5+ wants to apply this gate, the regex needs updating.
- **The "Inputs to next /gsd-new-milestone cycle" framing questions are inquiries, not constraints.** The 3 examples in D-10 (b) are illustrative — the auditor refines based on what the synthesis actually surfaces. The bar is: each question must be phrased as something v0.4 must answer (an inquiry), not as something v0.4 must respect (a constraint). "How does v0.4 weigh remediation depth vs. new capability?" passes; "v0.4 should weigh remediation depth carefully" fails (and would be caught by the grep gate's `should` pattern). The phrasing discipline is the difference between "naming inputs" (allowed) and "dictating outputs" (forbidden).
- **The "Limits of this assessment" note in Section 1 is the descriptive equivalent of Phase 13's D-16 "Partially reached" annotation.** Phase 13 honestly recorded which surfaces had constrained observability (push: OS-rendered notification UI not auditable as frontend surface; history: page renders empty for valid data). Phase 14 inherits this and extends to the corpus level: "This assessment audits a 14-surface, 64-finding corpus on iPhone-shape Chromium against a couple-scale (4-member) synthetic household. Cross-browser quirks, Android-only push paths, and N>5 capacity behavior are out of scope." The doc is honest about what it does NOT cover, in present-tense observational voice.
- **Tier 1 should be small.** The recommended split (Tier 1 ~5-8 entries) keeps the load-bearing signal v0.4 reads first under the cognitive limit for "things that genuinely matter most." If the auditor finds themselves placing >10 entries in Tier 1, the rubric thresholds (D-03) need recalibration upward, not relaxation.
- **The grep gate should run twice during execution.** Once as a draft check (after the auditor finishes drafting Sections 1-3) to catch slip; once before the commit (D-07 contract). The first pass is cheap correction; the second is the structural enforcement. Same script invocation, both times.

</specifics>

<deferred>
## Deferred Ideas

These came up during analysis or discussion but belong outside this phase:

- **Per-surface re-scoring** — if Phase 14's synthesis surfaces a tension where a surface's Phase 13 verdict warrants reconsideration, the auditor records this as a Tier 1/2 ranked entry (axis-i impact) rather than rescoring the surface. Re-scoring would conflict with Phase 13 D-04 ("Verdict at top of each UI-REVIEW") and the "no re-probing" Phase 14 boundary.
- **Effort estimation per finding** — explicitly out of scope per SYNTH-02. v0.4 milestone planning estimates effort; Phase 14 names impact-on-feels-Al-Dente only.
- **Prioritization-for-action ranking** — the tier ordering reflects "feels Al Dente" impact, NOT implementation order. v0.4 may legitimately address a Tier 2 cluster before a Tier 1 standalone if implementation cost / coordination considerations point that way. The doc must not conflate the two axes.
- **Filing new GitHub issues for net-new findings** — Phase 14 explicitly does NOT file issues. If the synthesis genuinely surfaces a net-new pattern that warrants an issue (e.g., "Phase 14 found: X pattern not in WALKTHROUGH or UI-AUDIT"), the auditor records it as a ranked entry citing its surfacing-during-synthesis but does not file. v0.4 decides whether to file.
- **Updating the v0.2.2 backlog in PROJECT.md** — POLISH-02 confirmed closed during Phase 13 audit but still listed as open in PROJECT.md "Surfaced for follow-up." Phase 14 cites this as a Tier 3 backlog-hygiene entry but does NOT modify PROJECT.md (that would be prescription disguised as cleanup; v0.4 or `/gsd-complete-milestone` handles it).
- **Cross-browser audit synthesis** — the input corpus is iPhone-shape Chromium only. Phase 14's "Limits of this assessment" note records this scope; v0.4 may expand the audit corpus to Safari iOS and beyond (which would generate net-new inputs to a future synthesis).
- **N>5 capacity behavior** — Issue #7 capacity ceiling is at N=5; behavior beyond N=5 was not exercised. Phase 14 cites the ceiling but does not extrapolate.
- **Behavioral validation gate cross-link** — SPEC.md's ≥2-week-daily-use gate is orthogonal to v0.3 audit work. Phase 14 doesn't address it; v0.1 ship-readiness is its own milestone.
- **MEMBER_COLORS palette extension to N=5 reconciliation** — the audit-time delta (WALKTHROUGH said 4 swatches, live code shows 5) is recorded as a Tier 3 finding. Whether to update WALKTHROUGH.md to reconcile is an editorial decision deferred to v0.4 or backlog hygiene. Phase 14 records the delta, doesn't fix it.
- **Tier 1 hard cap** — if the rubric scoring produces >10 Tier 1 entries, recalibrating the threshold (e.g., requiring total ≥5 instead of ≥4) is auditor's discretion within the scoring discipline. Hard cap is not enforced; calibration is.

### Reviewed Todos (not folded)
None — `gsd-tools todo match-phase 14` returned 0 matches.

</deferred>

---

*Phase: 14-synthesis-handoff*
*Context gathered: 2026-05-10*
