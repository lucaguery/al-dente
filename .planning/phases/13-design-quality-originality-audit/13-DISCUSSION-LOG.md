# Phase 13: Design Quality & Originality Audit — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 13-design-quality-originality-audit
**Areas discussed:** Originality verdict, Audit unit & mechanism, Screenshot density per surface, WALKTHROUGH cross-link policy

---

## Originality verdict

### Q1: What shape should the originality verdict take per surface?

| Option | Description | Selected |
|--------|-------------|----------|
| Verdict tag + boilerplate/earned columns | Tag {Al Dente ✅ / Mixed ⚠ / Generic ❌} + 2-column table of concrete elements with file:line refs | ✓ |
| 1-5 originality score + paragraph | Numeric score + narrative paragraph | |
| Free-form paragraph only | One narrative paragraph per surface | |

**User's choice:** Verdict tag + boilerplate/earned columns.
**Notes:** Forces concrete elements; scannable in UI-AUDIT.md aggregator; matches AUDIT-02's literal "specific element" wording.

### Q2: How should "feels Al Dente" be defined — against what reference?

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 5 design system as the explicit anchor | Token compliance (paper-grain, terracotta h≈35°, Fraunces, IBM Plex, two-layer shadows, motion language) | |
| Emergent / vibes-based | Whatever reads as cohesive with the Slow Food editorial spirit | |
| Hybrid: token compliance + editorial cohesion | BOTH (a) tokens correctly applied AND (b) reads as intentional in the Slow Food register | ✓ |

**User's choice:** Hybrid.
**Notes:** Most rigorous bar — prevents both mechanical token-checking AND vibes-only judgments. Mixed = (a) but not (b); Generic = fail (a) regardless of (b).

### Q3: Minimum requirement for boilerplate/earned columns per surface?

| Option | Description | Selected |
|--------|-------------|----------|
| ≥1 boilerplate + ≥1 earned (per AUDIT-02 minimum) | Floor matches requirement; "None observed" allowed with one-line justification | ✓ |
| Exactly 2 of each — forces depth | 2 boilerplate + 2 earned, mandatory | |
| ≥1 of each, no upper bound, ranked | Min 1 of each, list as many as observed in priority order | |

**User's choice:** ≥1 + ≥1 with "None observed" escape.
**Notes:** Doesn't force manufactured findings on uniformly-strong or uniformly-weak surfaces.

### Q4: Where does the verdict tag sit relative to the 6-pillar score in each per-surface UI-REVIEW?

| Option | Description | Selected |
|--------|-------------|----------|
| Top — verdict drives the doc | Verdict opens; pillar score defends it | ✓ |
| Bottom — score drives the doc | Classic /gsd-ui-review structure; verdict synthesizes at end | |
| Side-by-side — paired header table | 2-row header with both | |

**User's choice:** Top.
**Notes:** Verdict is the milestone-defining question for v0.3; pillar score is its defense.

---

## Audit unit & mechanism

### Q1: What's the audit unit — 14 WALKTHROUGH surfaces, or N individual screens?

| Option | Description | Selected |
|--------|-------------|----------|
| 14 surfaces (mirror WALKTHROUGH) | One UI-REVIEW per WALKTHROUGH surface; multi-screen surfaces covered inside one file | ✓ |
| N individual screens | One UI-REVIEW per actual rendered screen (~20+ files) | |
| Hybrid — one per surface, but rich surfaces split | 14 default + ~2-3 splits for materially-different states | |

**User's choice:** 14 surfaces.
**Notes:** Trivial 1:1 cross-link to Phase 12; matches AUDIT-04's "one row per surface listed in WALK-01."

### Q2: How is each per-surface UI-REVIEW produced operationally?

| Option | Description | Selected |
|--------|-------------|----------|
| Manual scoring by Claude using gsd-ui-auditor rubric (no agent spawn) | Claude (executor context) navigates via Playwright MCP, applies rubric directly | ✓ |
| Spawn gsd-ui-auditor subagent per surface | 14 agent spawns | |
| Invoke /gsd-ui-review skill 14 times | Re-use existing tooling | |

**User's choice:** Manual scoring (no agent spawn).
**Notes:** Matches Phase 12's Claude-as-auditor pattern; preserves cross-surface coherence; avoids 14 expensive context spawns.

### Q3: How should the 14 surfaces be sequenced across plans?

| Option | Description | Selected |
|--------|-------------|----------|
| Same order as Phase 12 (capture → … → settings) across multiple plans | Mirror WALKTHROUGH order, split across ~4 plans | ✓ |
| Group by 'expected high-effort' first | Calibrate rubric on richest surfaces first | |
| Group by similarity (form-heavy / visual-heavy / flow-heavy) | Apply rubric uniformly within a plan | |

**User's choice:** Phase 12 order across multiple plans.
**Notes:** Preserves natural product flow; easy cross-link to Phase 12 sections; recommended split: Plan 1 = 5 capture; Plan 2 = shortlist+vote+cooking-log+history; Plan 3 = exports+push+realtime+onboarding+settings; Plan 4 = UI-AUDIT.md aggregator.

---

## Screenshot density per surface

### Q1: What's the screenshot density per surface?

| Option | Description | Selected |
|--------|-------------|----------|
| Canonical view only (1 screenshot per surface) | Floor at AUDIT-03's "≥1" | |
| Canonical + key state variants (2-4 per surface) | Capture + 1-3 state variants where visual differs meaningfully | ✓ |
| Component-level capture | Each component on a surface separately | |

**User's choice:** Canonical + key state variants.
**Notes:** Matches Phase 12's ~3-4-per-surface density (~48 PNGs total); catches state-coverage issues for Pillar 6. Auditor decides per surface.

### Q2: Where do screenshots live and how are they referenced?

| Option | Description | Selected |
|--------|-------------|----------|
| .planning/v0.3/ui-reviews/screenshots/<surface>-<state>.png — flat dir | Single shared dir; <surface-slug>-<state-slug>.png convention | ✓ |
| .planning/v0.3/ui-reviews/<surface>/screenshots/*.png — per-surface subdirs | Self-contained per surface | |
| Co-located: same dir as UI-REVIEW files | Both .md and .png mixed in one dir | |

**User's choice:** Flat dir.
**Notes:** Mirrors Phase 12's flat `walkthrough-screenshots/` convention; easy to grep/list/audit completeness.

### Q3: Should screenshots be committed (vs gitignored)?

| Option | Description | Selected |
|--------|-------------|----------|
| Commit — PNGs in git (override gsd-ui-auditor's default .gitignore) | Phase 12 precedent; AUDIT-03 literal text says "committed" | ✓ |
| Gitignore — keep PNGs local only | Honor agent's default | |

**User's choice:** Commit.
**Notes:** Phase 12 already committed ~48 PNGs without a .gitignore in `walkthrough-screenshots/`. Phase 13 follows the same precedent.

---

## WALKTHROUGH cross-link policy

### Q1: How should Phase 13 relate to existing WALKTHROUGH findings?

| Option | Description | Selected |
|--------|-------------|----------|
| Read first, score independently, cross-link inline when relevant | Inherit context from WALKTHROUGH §<surface> before scoring; cite when overlap | ✓ |
| Read first, treat WALKTHROUGH-covered issues as out-of-scope | Don't re-score what WALKTHROUGH covered | |
| Don't read WALKTHROUGH — score blind | No Phase 12 context; consult only at Phase 14 | |

**User's choice:** Read first, score independently, cross-link inline.
**Notes:** Zero duplicated probing + independent scoring + Phase 14 sees both views.

### Q2: When a WALKTHROUGH finding overlaps a pillar score, how should the cross-link be formatted?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline cite with anchor link | `(See WALKTHROUGH.md §<surface> — <finding-id>)` footnote | ✓ |
| Quote excerpt + cite | 1-2 sentence quote + cite | |
| Sidebar 'WALKTHROUGH context' section per surface | Dedicated section listing all WALKTHROUGH findings per surface | |

**User's choice:** Inline cite.
**Notes:** Mirrors Phase 12 D-05 bidirectional pattern; deterministic; no quote-drift risk.

### Q3: Should pillar scores be docked when WALKTHROUGH already filed an issue under that surface?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — WALKTHROUGH blockers/friction count against the relevant pillar | Pillar grep-method = upper bound; WALKTHROUGH evidence pulls down when warranted | ✓ |
| No — WALKTHROUGH is orthogonal; pillar scores are pure visual quality | Surface can score 24/24 while broken | |
| Conditional — only Pillar 6 absorbs WALKTHROUGH impact; Pillars 1-5 stay pure | Pillar 6 = state coverage / interaction quality | |

**User's choice:** Yes — count against the relevant pillar.
**Notes:** Pillar scores reflect user-visible reality; Phase 14 ranking grounded in both visual quality AND user impact.

---

## Claude's Discretion

Areas explicitly noted as planner/executor judgment in CONTEXT.md:
- Screenshot filename slug conventions for state variants
- Per-surface state variant selection (D-08 says 2-4; auditor picks)
- WALKTHROUGH context inheritance verbosity
- Pillar finding ordering within UI-REVIEW
- UI-AUDIT.md cross-cutting observations format (bullets vs prose)
- `.gitignore` mechanism for screenshots/ override
- Plan split fine-tuning around 4-plan recommendation

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` section:
- Component-level visual audit (over-engineering for couple-scale)
- Re-running gsd-ui-review on v0.2 Phases 5-9 (historical scores frozen)
- Filing GitHub issues for visual findings (Phase 13 doesn't file; Phase 14 may)
- Cross-browser audit (out of scope per REQUIREMENTS.md)
- Originality scoring beyond {Al Dente / Mixed / Generic} enum
- Auditing /styleguide as a surface (consulted but not scored)
- Closing v0.2.2 backlog issues during audit (out of scope)
- Component / token rework based on findings (v0.4 territory)
