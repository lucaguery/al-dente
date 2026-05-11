# Phase 14: Synthesis & Handoff — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `14-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 14-synthesis-handoff
**Areas discussed:** Finding unit + ranking method, Impact-on-Al-Dente scoring, Anti-prescription enforcement (SYNTH-02), Document structure + handoff depth

---

## Gray area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Finding unit + ranking method | Atomic unit (per-finding ~70 / per-cluster+blocker ~25-35 / per-surface ~14) AND ordering structure | ✓ |
| Impact-on-Al-Dente scoring | How to operationalize the rank function (composite dimensions / verdict-shift / Pillar-6 / editorial) | ✓ |
| Anti-prescription enforcement (SYNTH-02) | Schema-enforced template / observational voice / pre-commit grep gate / layered | ✓ |
| Document structure + handoff depth | Section layout + thickness of "Inputs to next /gsd-new-milestone cycle" section | ✓ |

**User's choice:** All 4 areas selected (multiSelect).

---

## Finding unit + ranking method

### Q1: What's the atomic unit of an entry in the ranked findings list?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-cluster + per-blocker (~25-35) | Collapse recurring patterns into single cluster-entries with surface citations; keep architecture-invariant violations and unique blockers as standalone entries | ✓ |
| Per-finding (~70) | Each WALKTHROUGH severity-tagged finding + each UI-AUDIT cross-cutting observation gets its own ranked entry | |
| Per-surface (~14) | One ranked entry per surface, each absorbing all that surface's findings | |
| Mixed: clusters + per-surface index | Cross-cutting clusters as ranked entries (~5-8) at the top, then a per-surface index (~14) | |

**User's choice:** Per-cluster + per-blocker (~25-35)
**Notes:** Aligns with UI-AUDIT.md's pre-clustering work; avoids re-exploding the ~13 cross-cutting observations into ~70 individual findings.

### Q2: How are the ~25-35 cluster+blocker entries ordered?

| Option | Description | Selected |
|--------|-------------|----------|
| Tiered (3 impact bands) | Group entries into Tier 1 / Tier 2 / Tier 3 by impact band; ordered-but-not-strict-1..N within tier | ✓ |
| Single linear 1..N | Strict ranked list 1 through ~30 | |
| Hybrid: top-7 + tiered tail | Top 5-7 strictly ranked; remaining ~20-25 in Tier 2 / Tier 3 bands | |
| Cluster-first (synthesis-style) | Clusters lead as primary section; standalone blockers in secondary section | |

**User's choice:** Tiered (3 impact bands)
**Notes:** Avoids over-claiming precision in the ranking that the heterogeneous entry types (cluster vs single blocker vs nit) cannot defend.

---

## Impact-on-Al-Dente scoring

### Q1: How is "impact on feels Al Dente" operationalized for ranking?

| Option | Description | Selected |
|--------|-------------|----------|
| Composite dimensions (3-axis) | Each entry scored on (i) breaks identity signature, (ii) breaks invariant user-visibly, (iii) friction at primary tap-path; each 0-2; total 0-6 | ✓ |
| Verdict-shift heuristic | Rank by whether addressing the finding flips a Mixed ⚠ surface to Feels Al Dente ✅ | |
| Pillar-6-uplift | Rank by how much addressing the finding lifts Pillar 6 (Experience Design) scores | |
| Composite + verdict-shift annotation | 3-axis composite as primary; verdict-flipping flag as annotation on Tier 1 | |

**User's choice:** Composite dimensions (3-axis)
**Notes:** Matches Phase 13 D-02's hybrid evidence discipline (token compliance + editorial cohesion); auditable to v0.4 reader.

### Q2: Should the 3-axis scoring rubric appear in ASSESSMENT.md, or stay internal?

| Option | Description | Selected |
|--------|-------------|----------|
| Exposed: rubric + per-entry scores | "Ranking method" section explains 3 axes; each entry shows axis breakdown like (i:2 / ii:2 / iii:1, total 5) | ✓ |
| Exposed rubric, totals only | Rubric explained; each entry shows total only without per-axis breakdown | |
| Internal only | Rubric used internally; entries appear in tier-order without scores | |

**User's choice:** Exposed: rubric + per-entry scores
**Notes:** Maximally auditable; v0.4 reader can challenge a rank by pointing at a specific axis.

---

## Anti-prescription enforcement (SYNTH-02)

### Q1: Which guardrails enforce SYNTH-02's "descriptive, not prescriptive" constraint? (multiSelect)

| Option | Description | Selected |
|--------|-------------|----------|
| Schema-enforced finding template | Fixed-field template; prescriptive fields (Recommendation/Fix/Action/Proposed Phase) explicitly forbidden | ✓ |
| Observational voice convention | Passive-observational tone documented as writing rule | ✓ |
| Pre-commit grep gate | Automated grep check before commit; non-zero match blocks commit | ✓ |
| All three layered | Schema + voice + grep gate combined | ✓ |

**User's choice:** All 4 selected — interpreted as: layer all three guardrails (schema + voice + grep gate).
**Notes:** SYNTH-02's success criterion explicitly calls out grep-verifiability ("independently verifiable by grep for phase numbers and roadmap-shaped headings"); the three layers catch different failure modes (schema → structure, voice → prose, grep → escapees).

### Q2: What pattern set does the pre-commit grep gate block?

| Option | Description | Selected |
|--------|-------------|----------|
| Forward-only: v0.4 + roadmap verbs | Block v0.4, prescriptive verbs (should/recommend/propose/must X), TODO/action-item, future-phase numbers (Phase 15+); allow past-phase citations | ✓ |
| Strict: any "phase N" reference | Block all "Phase \d+" references regardless of past/future | |
| Minimal: only v0.4 + "should" | Block only v0.4 and "should"; trust schema + voice for the rest | |

**User's choice:** Forward-only: v0.4 + roadmap verbs
**Notes:** Maximally permissive on legitimate citation, strict on forward prescription. Past-phase citations (Phase 11/12/13) are descriptive references to source artifacts.

---

## Document structure + handoff depth

### Q1: What section layout does ASSESSMENT.md use?

| Option | Description | Selected |
|--------|-------------|----------|
| Standard 4-section | (1) Exec summary, (2) Ranking method, (3) Ranked findings (3 tiers), (4) Inputs to next milestone | ✓ |
| 5-section with explicit clusters section | (1) Exec summary, (2) Ranking method, (3) Clusters, (4) Standalone blockers, (5) Inputs | |
| Lean 3-section | (1) Exec summary + ranking method, (2) Ranked findings, (3) Inputs | |
| Headline-first | (1) Headline (top 3-5), (2) Ranking method, (3) Full ranked findings, (4) Inputs | |

**User's choice:** Standard 4-section
**Notes:** Matches the milestone narrative; cross-cutting clusters embedded inside Tier 1 ranked entries (since clusters ARE entries per D-01); avoids 5-section split that would lose the unified cross-tier ranking signal.

### Q2: How thick is the closing "Inputs to next /gsd-new-milestone cycle" section (SYNTH-03)?

| Option | Description | Selected |
|--------|-------------|----------|
| Artifacts + framing questions + non-prescriptions | Three subsections: source artifacts; open framing questions for v0.4; explicit list of what ASSESSMENT.md does NOT do | ✓ |
| Artifacts + framing questions | Source artifacts + framing questions; skip explicit non-prescriptions | |
| Artifacts only (minimal) | Just paths + one-liners to source artifacts | |
| Artifacts + non-prescriptions | Source artifacts + explicit non-prescriptions; skip framing questions | |

**User's choice:** Artifacts + framing questions + non-prescriptions
**Notes:** Strongest handoff; makes the SYNTH-02 boundary visible to v0.4 readers; framing questions match SYNTH-03's "names the inputs but stops short of dictating outputs" wording.

---

## Final check

### Q: Any gray areas remaining?

| Option | Description | Selected |
|--------|-------------|----------|
| I'm ready for context | The 10 decisions captured are sufficient | ✓ |
| Explore more gray areas | Still ambiguities to lock (plan split, backlog reconciliation, screenshot inclusion, language) | |

**User's choice:** I'm ready for context

---

## Claude's Discretion

The following are implementation details captured in CONTEXT.md §"Claude's Discretion" — planner / executor decides without re-asking:

- Exact wording of executive summary paragraphs
- Exact wording of the framing questions in D-10 (b) — 3 examples are illustrative, not mandatory
- Whether to include a short "Calibration notes" subsection inside Section 1 or Section 2
- Plan split fine-tuning (1 vs 2 plans)
- Implementation of the grep gate (inline in plan body vs separate `.sh` script)
- Exact tier-1 vs tier-2 vs tier-3 entry counts (~25-35 total but per-tier split open)
- Whether to add inline anchor links from per-surface citations to UI-REVIEW.md headings
- Tie-breaker behavior when two entries have identical (i,ii,iii)
- Whether to include a one-paragraph "Limits of this assessment" note in Section 1

## Deferred Ideas

Captured in CONTEXT.md §"Deferred Ideas":

- Per-surface re-scoring (Phase 14 inherits Phase 13 verdicts as-is)
- Effort estimation per finding (out of scope per SYNTH-02)
- Prioritization-for-action ranking (tier reflects impact, not implementation order)
- Filing new GitHub issues for net-new findings (no Phase 14 issue filing)
- Updating v0.2.2 backlog in PROJECT.md (POLISH-02 closure cited but not edited)
- Cross-browser audit synthesis (corpus is iPhone-shape Chromium only)
- N>5 capacity behavior (Issue #7 ceiling at N=5; not extrapolated)
- Behavioral validation gate cross-link (orthogonal to v0.3)
- MEMBER_COLORS reconciliation between WALKTHROUGH (4 swatches) and live code (5)
- Tier 1 hard cap (calibration, not enforcement)
