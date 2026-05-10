# Phase 14: Synthesis & Handoff — Research

**Researched:** 2026-05-10
**Domain:** Synthesis writing — combining 64-finding walkthrough corpus + 14-surface design audit into a single tiered ranked-findings document with grep-enforced anti-prescription discipline
**Confidence:** HIGH (all input artifacts read; rubric and schema fully locked in CONTEXT.md; no library/code research applicable)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01: Atomic unit = per-cluster + per-blocker, ~25-35 ranked entries.** Cross-cutting clusters (the 13 already identified in `UI-AUDIT.md` "Cross-cutting observations" section + any net-new clusters surfaced by combining WALK + AUDIT) collapse into single ranked entries with surface citations. Architecture-invariant violations and unique blockers (Sheet-01 #1, ingredient parser #2, stuck-extraction #3, MEMBER_COUNT=2 #4, cook_count idempotency #5, missing detail route #6, capacity ceiling #7, PATCH 405 #8) appear as standalone entries. Total target range: 25-35 entries.
- **D-02: Ordering = 3 tiers by impact band, ordered-but-not-strict-1..N within tier.** Tier 1 (total ≥4 per D-03), Tier 2 (total 2-3), Tier 3 (total 0-1). Within tier, entries ordered by total score then axis-i breaking-identity-signature as tie-breaker.
- **D-03: Composite 3-axis scoring rubric.** Each entry scored on three orthogonal axes, each 0-2, total 0-6:
  - **Axis (i) — Identity-signature impact (0-2):** Does the entry compromise an Al Dente identity-bearing element? 2 = breaks identity signature directly (Fraunces display moments / terracotta primary at h≈35° / paper-grain Card chassis / two-layer warm-brown shadows / framer-motion swipe-deck physics / Slow Food editorial copy register). 1 = degrades peripherally. 0 = no identity impact.
  - **Axis (ii) — Invariant-violation visible to user (0-2):** Does the entry expose architecture invariant breaking at user-visible layer? 2 = invariant breaks user-visibly. 1 = invariant breaks at code layer but masked from user. 0 = no invariant impact.
  - **Axis (iii) — Friction at primary tap-path (0-2):** 2 = primary tap-path gated/blocked/produces wrong result. 1 = primary tap-path completes but with friction. 0 = no primary-path impact.
  - **Tier mapping:** Total ≥4 → Tier 1; total 2-3 → Tier 2; total 0-1 → Tier 3. Ties broken by axis (i), then (ii), then (iii).
- **D-04: Rubric + per-entry scores fully exposed in the doc.** ASSESSMENT.md opens with "Ranking method" section explaining 3 axes, scale, tier mapping. Each entry shows axis breakdown inline: `(i:2 / ii:2 / iii:1, total 5)`.
- **D-05: Schema-enforced finding template.** Allowed fields: `Title` / `Tier` / `Impact axes` / `Observed` / `Where` / `Pattern` (clusters) / `Why this impacts feels-Al-Dente` / `Sources`. **FORBIDDEN fields:** `Recommendation`, `Fix`, `Action`, `Proposed Phase`, `Effort`, `Priority`, `Next Step`, `TODO`, `When to address`, `v0.4 plan`.
- **D-06: Observational voice convention.** Passive-observational ("X is observed at Y", "this surfaces N times across surfaces") instead of active-prescriptive ("we should fix X").
- **D-07: Pre-commit grep gate.** Automated check before commit; non-zero match → blocked. Implementation: single shell command (planner decides script vs inline).
- **D-08: Grep pattern set = forward-only.** Blocked: `v0\.4`, `should (fix|add|build|implement|do|consider|address|tackle|prioritize)`, `recommend(ed|s)?`, `propose(d|s)?`, `suggest(ed|s)?`, `must (fix|build|add|implement|do|address|prioritize)`, `next milestone (should|will|must|needs to)`, `TODO`, `action (item|step|plan)`, `next step`, `(roadmap|plan).{0,20}(for|of) v0`, `phase (1[5-9]|[2-9][0-9])`. **Past-phase citations explicitly allowed:** `Phase 11`, `Phase 12`, `Phase 13`.
- **D-09: Standard 4-section layout.** (1) Executive summary; (2) Ranking method; (3) Ranked findings (~25-35 entries grouped into 3 tiers); (4) Inputs to next /gsd-new-milestone cycle.
- **D-10: Handoff section depth = artifacts + framing questions + explicit non-prescriptions.**

### Claude's Discretion

- Exact wording of executive summary paragraphs (D-09 §1) — 2-3 paragraphs with "How to read" subsection.
- Exact wording of framing questions in D-10 (b) — 3-5 questions; the 3 examples are illustrative, not mandatory.
- Whether to include a short "Calibration notes" subsection inside Section 1 or Section 2 (recommend Section 1).
- Plan split fine-tuning (1 vs 2 plans).
- Implementation of grep gate (inline vs separate `.sh` script) — recommend separate script at `.planning/v0.3/check-assessment.sh`.
- Exact tier-1 vs tier-2 vs tier-3 entry counts — recommend Tier 1 ~5-8, Tier 2 ~10-15, Tier 3 ~10-15.
- Whether to add inline links from per-surface citations to UI-REVIEW.md headings (recommend yes).
- Tie-breaker behavior when two entries have identical (i,ii,iii) — recommend total → axis-i → axis-ii → arbitrary.
- Whether to include "Limits of this assessment" note in Section 1 (recommend yes).

### Deferred Ideas (OUT OF SCOPE)

- Per-surface re-scoring (verdicts inherited from Phase 13 as-is).
- Effort estimation per finding (explicit SYNTH-02 boundary).
- Prioritization-for-action ranking (tier ordering = "feels Al Dente" impact, NOT implementation order).
- Filing new GitHub issues for net-new findings (Phase 14 explicitly does NOT file).
- Updating the v0.2.2 backlog in PROJECT.md (record delta as Tier 3 entry; do not modify).
- Cross-browser audit synthesis (iPhone-shape Chromium only — record in "Limits").
- N>5 capacity behavior (Issue #7 ceiling at N=5; not extrapolated).
- Behavioral validation gate cross-link (orthogonal to v0.3 audit).
- MEMBER_COLORS palette extension to N=5 reconciliation (record delta, do not fix).
- Tier 1 hard cap (calibration is auditor's discretion; not enforced).

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SYNTH-01 | A single `ASSESSMENT.md` document combines WALK findings + AUDIT scores into a ranked findings list, ordered by impact on the "feels Al Dente" question. | The Candidate Cluster Taxonomy (§1) + Candidate Standalone Blockers (§2) below total ~30 entries with proposed (i,ii,iii) scores per D-03; each entry has source-artifact citations using the format established in Phase 12/13. |
| SYNTH-02 | The assessment is descriptive, not prescriptive — surfaces opportunities and tradeoffs but does **not** propose v0.4 phases (clean separation between assessment and roadmap). | The grep-gate pattern set is locked in CONTEXT D-08; this research enumerates 0 prescriptive findings and uses observational voice throughout. The Anti-Prescription Compliance Checklist (§7) maps each pattern to verification. |
| SYNTH-03 | The assessment explicitly states what the next `/gsd-new-milestone` cycle should consume — i.e., names the inputs but stops short of dictating outputs. | The "Inputs to next milestone" Draft Structure (§5) lists artifacts + 5 candidate framing questions in inquiry form (not constraint form) + 5 explicit non-prescriptions, calibrated to D-10's contract. |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Architecture invariants 1-8** are load-bearing for axis (ii) impact scoring. Specifically:
  - Invariant #1 (single-shape capture pipeline; promotion server-side via BackgroundTask) — relevant to capture-pipeline missing-terminal-state cluster.
  - Invariant #2 (voting state computed not stored; `compute_vote_state` derives from `votes` rows) — broken at user-visible layer by Issue #4 (MEMBER_COUNT=2 hardcoded).
  - Invariant #3 (denormalized `last_cooked_at` + `cook_count` update in same DB transaction as `cooking_logs` insert) — broken at user-visible layer by Issue #5 (re-finalize doubles `cook_count`).
  - Invariant #4 (realtime broadcast for all household-affecting mutations) — UPHELD at WS-frame level (RT-1..RT-7); doc-vs-code drift on `cooking.finalized` 7th event class is code-layer only.
  - Invariant #6 (next-intl French-only) — partial drift in `settings/page.tsx:175-183` (POLISH-01 cluster).
  - Invariant #7 (single uvicorn worker; APScheduler in-process) — not exercised by audit.
  - Invariant #8 (HttpOnly cookie auth) — UPHELD across all 14 surfaces.
- **Audit-only milestone discipline** (`feedback_executor_scope_creep` memory) — Phase 14 produces only `.planning/v0.3/ASSESSMENT.md`. No product code edits. The grep gate (D-07/D-08) is the structural enforcement.
- **`feedback_no_manual_vercel_deploy`** — Phase 14 doesn't deploy; informational only.
- **Locked vocabularies enforcement** — `Validé / Pressenti / Contesté / Rejeté / Sans avis` chip labels and 5-state vote enum are checked by the audit (chip-vocabulary-stable pass-style finding in `shortlist-UI-REVIEW.md`); ASSESSMENT.md must not introduce vocabulary drift in citation prose.

## Summary

Phase 14 is a synthesis-writing phase: the auditor reads `WALKTHROUGH.md` (1,276 lines, ~64 severity-tagged findings) + `UI-AUDIT.md` (Phase 13 milestone aggregator, 14 surface verdicts + 13 cross-cutting observations) + 14 per-surface UI-REVIEW files + 8 GitHub issues, then produces a single `.planning/v0.3/ASSESSMENT.md` with a tiered ranked findings list ordered by impact on "feels Al Dente" — descriptive, not prescriptive. No code touched, no probing, no new issues, no v0.4 phase shapes.

The research deliverable below provides the planner with the synthesis-ready scaffolding: a candidate cluster taxonomy of ~9 clusters drawn from UI-AUDIT.md's 13 cross-cutting observations refined and combined with WALKTHROUGH §"Inputs to Phase 14" themes; a candidate standalone-blocker list of ~21 entries spanning the 8 GitHub issues + backlog cross-links + non-issue-filed blockers + observability/doc-rot patterns; candidate (i,ii,iii) impact scores per CONTEXT D-03 with brief evidence citations; suggested tier assignments using the score-based mapping; a draft "Inputs to next milestone" section structure calibrated to D-10's contract; and explicit tension-surfaces requiring planner decisions (5 conflicts where input artifacts disagree).

**Primary recommendation:** The cluster taxonomy and standalone-blocker enumeration produces ~30 candidate entries — within the D-01 target range of 25-35 — with a candidate Tier-1 count of 7 entries (within the recommended 5-8 band per Claude's Discretion), which is below the >10 recalibration trigger flagged in CONTEXT specifics. The Plan can proceed as a single plan if context budget allows, or split into a 2-plan shape (Plan 1: identify clusters + score draft Tiers 1-3; Plan 2: ranking method + handoff section + grep-gate verification + commit).

## Standard Stack

Not applicable. Phase 14 produces a single Markdown document; it touches no application code. The "stack" for this phase is:

| Tool | Purpose | Notes |
|------|---------|-------|
| Markdown editor | Drafting `ASSESSMENT.md` | Same conventions as `WALKTHROUGH.md` / `UI-AUDIT.md` (already in `.planning/v0.3/`) |
| `grep` (POSIX or `ripgrep`) | Pre-commit anti-prescription gate (D-07) | Single-command invocation; planner chooses script vs inline |
| `git` | Commit ASSESSMENT.md + optional check-assessment.sh | Audit-milestone discipline: `.planning/` files only |

**Installation:** None — all tools already present in the repo's working environment.

**Version verification:** Not applicable to a synthesis-writing phase.

## Architecture Patterns

### Document Structure (the output shape locked in D-09)

```
ASSESSMENT.md (target ~5K-10K words)
├── Section 1: Executive summary (2-3 paragraphs + "How to read" subsection + optional "Calibration notes" + optional "Limits of this assessment")
├── Section 2: Ranking method (3-axis rubric exposed; ~1-2 paragraphs + reference table)
├── Section 3: Ranked findings (~25-35 entries grouped into 3 tiers)
│   ├── Tier 1 (~5-8 entries; total impact score ≥4)
│   ├── Tier 2 (~10-15 entries; total 2-3)
│   └── Tier 3 (~10-15 entries; total 0-1)
└── Section 4: Inputs to next /gsd-new-milestone cycle (D-10 a/b/c)
    ├── (a) Source artifacts list
    ├── (b) Open framing questions (3-5 inquiries, NOT constraints)
    └── (c) Explicit non-prescriptions
```

### Pattern: Schema-enforced finding template (D-05)

**What:** Each ranked entry uses a fixed-field markdown shape with allowed fields ONLY.

**When to use:** Every entry in Section 3.

**Example:**
```markdown
### Emerald-Tailwind-literal cluster across 5 surfaces

- **Tier:** 2
- **Impact axes:** (i:1 / ii:0 / iii:0, total 1)
- **Observed:** Five surfaces reach for Tailwind palette literals (`text-emerald-500`, `text-emerald-700`, `border-emerald-500/50`, `MEMBER_COLORS` raw hex) where custom CSS variables (`--color-valide-foreground`, `--color-cooking-foreground`, `--color-member-{rose,amber,emerald,sky,violet}-{bg,foreground}`) would close the system. The hex-literal pattern surfaces consistently across the validé chip vocabulary AND the member-identity surfaces.
- **Where:** `frontend/components/ShortlistCard.tsx:256-258` (OUI thumb), `frontend/components/VoteSummary.tsx:60` (validé chip border), `frontend/app/cooking-logs/page.tsx` (ChefHat icon), `frontend/components/CookingBanner.tsx` (ChefHat icon), `frontend/lib/colors.ts:1-7` (MEMBER_COLORS hex literals).
- **Pattern:** 5 surfaces — shortlist OUI thumb / vote validé chip border / cooking-log ChefHat / realtime cooking-banner ChefHat / onboarding MEMBER_COLORS palette.
- **Why this impacts feels-Al-Dente:** Token-completeness is part of Phase 13's "feels Al Dente" hybrid definition (D-02: token compliance + editorial cohesion). The literal pattern compromises token-compliance peripherally — `globals.css` documents emerald (h≈145) as intentional Slow Food, but the implementation does not yet expose it as a semantic token. Identity-signature impact is peripheral (axis i:1) because the rendered colors ARE Slow Food; the system gap is internal.
- **Sources:** UI-AUDIT.md "Cross-cutting observations" bullet 1; ui-reviews/shortlist-UI-REVIEW.md Pillar 3; ui-reviews/vote-UI-REVIEW.md Pillar 3; ui-reviews/cooking-log-UI-REVIEW.md Pillar 3; ui-reviews/realtime-UI-REVIEW.md Pillar 3; ui-reviews/onboarding-UI-REVIEW.md Pillar 3.
```

### Pattern: Citation format (inherited from Phase 12 D-04 and Phase 13 D-12)

**What:** Bidirectional anchor cites — no quote excerpts, deterministic, mirrors prior-phase conventions.

**Templates:**
- `WALKTHROUGH.md §<surface> <finding-id>` — e.g., `WALKTHROUGH.md §Capture-Full P-12-F01`
- `UI-AUDIT.md §<surface>` — for per-surface abstracts
- `UI-AUDIT.md "Cross-cutting observations" bullet N` — for cluster sources
- `ui-reviews/<surface>-UI-REVIEW.md Pillar N` — for pillar-specific findings
- `Issue #N` — for GitHub issues

### Anti-Patterns to Avoid

- **Active-prescriptive voice** ("we should fix X", "v0.4 must address Y", "the team needs to …"). Caught by D-08 grep gate.
- **Forbidden schema fields** (`Recommendation`, `Fix`, `Action`, `Proposed Phase`, `Effort`, `Priority`, `Next Step`, `TODO`, `When to address`, `v0.4 plan`). Caught by D-05 template enforcement.
- **Forward phase numbers ≥15** in any heading or body text. Caught by D-08 regex `phase (1[5-9]|[2-9][0-9])`.
- **Quote-excerpt citations** that drift if WALKTHROUGH is later edited (Phase 13 D-12 explicitly forbids; mirror).
- **Re-scoring surfaces** when synthesis surfaces a tension. Per "Deferred Ideas," the auditor records this as a ranked entry (axis-i impact) rather than rescoring.
- **Filing new GitHub issues for net-new patterns.** Phase 14 explicitly cites; v0.4 decides whether to file.
- **Conflating tier-ordering with implementation-order** in the executive summary. The doc surfaces the distinction explicitly per D-10 (c) ("Tier ordering reflects impact on 'feels Al Dente', not implementation priority").

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cluster taxonomy from raw findings | Custom NLP/clustering logic over WALKTHROUGH text | The 13 pre-clustered patterns in UI-AUDIT.md "Cross-cutting observations" + the 9 candidate themes in WALKTHROUGH §"Inputs to Phase 14" | Phase 13 already did the clustering work; Phase 14 refines, doesn't re-cluster. Hand-rolling would re-derive the same patterns at 10× the context cost. |
| Severity-to-impact mapping | Custom translation table from `blocker`/`friction`/`nit` to (i,ii,iii) | The 3-axis rubric defined in CONTEXT D-03 grounds in Phase 13 D-02's hybrid definition + invariant-violation evidence + WALKTHROUGH probe-kind taxonomy directly | The rubric is the synthesis equivalent of Phase 13's "editorial cohesion" — designed for this synthesis. A new mapping would re-invent. |
| Citation anchor format | New `[finding-id](path#anchor)` markdown link generator | The plain-text deterministic anchor format from Phase 12 D-04 + Phase 13 D-12 | Bidirectional navigation via grep is the established convention; markdown links break when documents are renamed or anchors restructure. |
| Anti-prescription enforcement | Inline manual review of each entry | The grep-gate pattern set in D-08 (single shell command, non-bypassable, runs pre-commit) | Manual review drifts under fatigue; grep is structural. The pattern set is calibrated to past-phase citations (allows Phase 11/12/13; blocks ≥15). |
| Tier boundary calibration | Manual case-by-case judgment per entry | The score-based mapping in D-03 (≥4 → Tier 1; 2-3 → Tier 2; 0-1 → Tier 3) with axis-i tie-breaker | The rubric handles boundary cases consistently; manual judgment drifts across the 25-35 entries. |
| Effort estimation | Inline `Effort: <hours>` annotations on entries | NOTHING — explicitly out of scope per D-05 forbidden fields and "Deferred Ideas" | Effort estimation is v0.4 territory; mixing it in conflates assessment with roadmap. |
| Priority ordering | Re-ranking entries by implementation priority | NOTHING — tier ordering is "feels Al Dente" impact, not priority. D-10 (c) makes the distinction explicit. | Conflating axes of judgment is the failure mode the SYNTH-02 boundary prevents. |

**Key insight:** Phase 13 already produced the dimensional analysis (6-pillar scores per surface, verdict per surface, 13 cross-cutting observations). Phase 12 already produced the probe-level evidence (~64 findings with severity tags + reproduction steps + source-artifact paths + cross-links). The synthesis layer's job is reorganization and impact-ranking — not derivation. Building any new analytic layer beyond the rubric in CONTEXT D-03 reproduces work already done.

## Candidate Cluster Taxonomy (refined from UI-AUDIT cross-cutting observations + WALKTHROUGH "Inputs to Phase 14")

> **Source basis:** UI-AUDIT.md lists 13 cross-cutting observations (lines 113-128). WALKTHROUGH.md "Inputs to Phase 14" §1-9 (lines 1240-1268) lists 9 candidate themes. The 9 candidate clusters below are the consolidated set the planner refines into ASSESSMENT.md Section 3 cluster entries. Per D-01, a cluster requires ≥3 surfaces sharing the pattern.

### C-1: Token-completeness gap — Tailwind-palette-literal cluster
- **Surfaces affected (5):** shortlist (OUI thumb `text-emerald-500`); vote (validé chip border `border-emerald-500/50`); cooking-log (ChefHat `text-emerald-700`); realtime (cooking-banner ChefHat `text-emerald-700`); onboarding (`MEMBER_COLORS` raw hex literals at `frontend/lib/colors.ts:1-7`).
- **Recurrence pattern:** Custom CSS variables would close the system; literal palette references where `--color-valide-foreground` / `--color-valide-border` / `--color-cooking-foreground` / `--color-member-{rose,amber,emerald,sky,violet}-{bg,foreground}` semantic tokens would replace them.
- **Candidate score:** **(i:1 / ii:0 / iii:0, total 1) → Tier 3.** Identity-signature impact peripheral (the rendered colors ARE Slow Food; the system gap is internal/structural). Zero invariant impact. Zero primary-path friction.
- **Sources:** UI-AUDIT.md "Cross-cutting observations" bullet 1; ui-reviews/{shortlist,vote,cooking-log,realtime,onboarding}-UI-REVIEW.md Pillar 3.

### C-2: No-debounce-on-submit cluster
- **Surfaces affected (4):** capture-quick (P-12-Q03 double-tap creates 2 drafts); capture-full (propagated from Quick); capture-photo (Sheet-01-adjacent submit handler); exports (P-12-E03 rapid double-fetch produces 2× 97KB exports).
- **Recurrence pattern:** `setSubmitting(true)` not synchronously visible to fast double-tap before React batches re-render; `disabled={submitting}` UI guard only blocks second click after first call resolves; direct API races bypass UI guard entirely.
- **Candidate score:** **(i:0 / ii:0 / iii:1, total 1) → Tier 3.** No identity impact. No invariant impact (no architecture invariant covers idempotency at the form-submit layer). Primary tap-path completes but with friction (second tap creates unintended duplicate state).
- **Sources:** UI-AUDIT.md "Cross-cutting observations" bullet 10; WALKTHROUGH.md §Capture-Quick P-12-Q03; §Capture-Full (cross-link); §Exports P-12-E03; ui-reviews/{capture-quick,capture-full,capture-photo,exports}-UI-REVIEW.md Pillar 6.

### C-3: Validation-error UX uniformly weak
- **Surfaces affected (3):** capture-quick (P-12-Q02 5KB title rejected with `Connexion impossible` toast — 422 surfaces as connectivity error); cooking-log (P-12-CL-02 4000-char notes cap with raw Pydantic error swallowed by generic 422 toast); exports (P-12-E02 button stays clickable when `navigator.onLine === false`; only post-click toast).
- **Recurrence pattern:** Backend returns 422 with raw Pydantic detail; frontend toasts say `Connexion impossible. Réessaie dans un instant.` or no toast at all. The mono-cause `toast.error` pattern surfaces in 3 distinct error classes (validation, network, auth) but only the connectivity copy is shown.
- **Candidate score:** **(i:0 / ii:0 / iii:1, total 1) → Tier 3.** No identity impact. No invariant impact. Friction at primary tap-path (user retries with confused mental model — "did I lose my connection?" — when the actual issue is a length cap).
- **Sources:** WALKTHROUGH.md §Capture-Quick P-12-Q02; §Cooking-Log P-12-CL-02; §Exports P-12-E02; ui-reviews/capture-quick-UI-REVIEW.md Pillar 6; ui-reviews/cooking-log-UI-REVIEW.md Pillar 6.

### C-4: Capture-pipeline missing terminal state (Gemini-failed-silently)
- **Surfaces affected (3):** capture-voice (P-12-V01 garbage transcript stuck `(extraction en cours…)` 3+ minutes, no recovery); capture-photo (P-12-Ph02 non-recipe photo stuck same state); capture-url (P-12-U01 raw URL drafts never promote per URL-01 backlog — same observable behavior, different root cause).
- **Recurrence pattern:** `recipes` model lacks a `failed` status; Gemini extraction failures (or stub no-op for URL) leave drafts permanently in `(extraction en cours…)` with no user-actionable recovery beyond delete-and-retry. Single-fix-multi-surface impact at the promotion layer (`services/llm` or BackgroundTask runner).
- **Candidate score:** **(i:0 / ii:1 / iii:2, total 3) → Tier 2.** No identity impact. Invariant #1 (capture promotes server-side via BackgroundTask) holds at the code layer but the missing terminal state means the user sees an indefinitely-spinning UI — invariant break peripheral / code-layer-but-UI-visible (axis ii:1). Primary tap-path produces wrong result for 3 capture surfaces (axis iii:2).
- **Sources:** WALKTHROUGH.md "Inputs to Phase 14" bullet 2; §Capture-Voice P-12-V01; §Capture-Photo P-12-Ph02; §Capture-URL P-12-U01; ui-reviews/{capture-voice,capture-photo,capture-url}-UI-REVIEW.md Pillar 6; Issue #3 (Voice/Photo cross-surface dedupe).

### C-5: Validation-error UX cluster cross-surface (capture + cooking-log + exports) [NET-NEW from WALK+AUDIT combination]
- **Surfaces affected (5+):** capture-quick (P-12-Q02), capture-full (P-12-F01-adjacent), cooking-log (P-12-CL-02), exports (P-12-E02), onboarding (P-12-O05 color collision race surfaces a 409 with no recovery copy when household at-capacity).
- **Recurrence pattern:** Per WALKTHROUGH "Inputs to Phase 14" bullet 5, validation-error UX is "uniformly weak across capture + cooking-log + exports." UI-AUDIT.md doesn't enumerate this as a distinct cluster but C-3 above is the visible-2026-05-09 subset. The expanded cluster combines C-3 with onboarding's race-409 missing-copy state.
- **Candidate score:** **(i:0 / ii:0 / iii:1, total 1) → Tier 3.** Effectively a superset of C-3; the planner may decide to (a) merge C-3 and C-5 into one cluster entry, or (b) keep C-3 as the "frontend toast cluster" and C-5 as the "missing-recovery-copy cluster" with the onboarding race specifically. **Tension surface** — see §6 below.
- **Sources:** WALKTHROUGH.md "Inputs to Phase 14" bullet 5; cross-references to C-3 sources + WALKTHROUGH.md §Onboarding P-12-O05.

### C-6: shadcn-default icons survived re-themeing
- **Surfaces affected (4):** exports (`Download`); push (`Bell`); cooking-log (`ChefHat`); realtime (`ChefHat` cooking-banner mirror).
- **Recurrence pattern:** lucide icons themed via `text-primary` / `text-foreground-muted` color tokens but not customized for the Al Dente vocabulary; off-the-shelf glyphs carry through.
- **Candidate score:** **(i:1 / ii:0 / iii:0, total 1) → Tier 3.** Identity-signature impact peripheral — these surfaces score Pillar 2 -1 each but the chrome rescues them from pure boilerplate. Zero invariant. Zero primary-path friction.
- **Sources:** UI-AUDIT.md "Cross-cutting observations" bullet 6; ui-reviews/{exports,push,cooking-log,realtime}-UI-REVIEW.md Pillar 2.

### C-7: Architecture-invariant violation cluster (user-visible)
- **Surfaces affected (5):** vote (Issue #4 MEMBER_COUNT=2 broken at chip + WS layer); cooking-log (Issue #5 cook_count doubled); history (CL-01 + Issue #6 surface decommissioned); settings (Issue #8 implication of "members own their identity"); realtime (`cooking.finalized` 7th broadcast event missing from canonical docstring — code-layer doc rot).
- **Recurrence pattern:** Per UI-AUDIT.md cross-cutting bullet 9: "the audit value of v0.3 is consistently surfacing correctness issues that the original implementation guarded conceptually but did not enforce at the spine." Phase 13's verdict-driving observation: 5 invariant breaks at user-visible layer.
- **Note:** This is an **umbrella observation, NOT a cluster ranked entry.** The 5 individual invariant violations each become standalone Tier-1/Tier-2 entries (B-3, B-4, B-5, B-7, B-12 below). The cluster as a whole appears in the Executive Summary as "the audit's load-bearing finding-axis" but does NOT collapse into one ranked entry — that would lose the per-invariant resolution the planner needs.
- **Sources:** UI-AUDIT.md "Cross-cutting observations" bullet 9; cross-references to B-3..B-12 below.

### C-8: i18n drift (next-intl invariant #6)
- **Surfaces affected (3):** settings (P-12-S05 hardcoded `"Historique"` + `"Voir les cuissons récentes"` at `page.tsx:175-183`); HomeDecide partner-waiting strings (cross-link to PROJECT.md backlog POLISH-01); cooking-log offline toast (P-12-CL-05 — `COOK-11` locked toast not surfacing — possible documentation drift, exact i18n key gap unconfirmed).
- **Recurrence pattern:** POLISH-01 backlog item; hardcoded French strings refuse to flow through next-intl; honest TODOs in source but user-visible drift remains until i18n sweep lands.
- **Candidate score:** **(i:0 / ii:1 / iii:0, total 1) → Tier 3.** No identity impact (the strings ARE in French — the invariant is structural, not visual). Invariant #6 broken at code layer but masked from user (axis ii:1). Zero primary-path friction (the user-visible artifact is correct).
- **Sources:** UI-AUDIT.md "Cross-cutting observations" bullet 11; PROJECT.md "Surfaced for follow-up" POLISH-01; WALKTHROUGH.md §Settings P-12-S05.

### C-9: Pillar 6 (Experience Design) deficit — corpus-level pattern [Phase-13-explicit umbrella observation]
- **Surfaces affected (14 of 14):** Per UI-AUDIT.md cross-cutting bullet 5: "**0 of 14 surfaces score 4/4 on Experience Design.**" Score distribution: 0/4 (push), 1/4 (capture-photo, capture-url, vote, cooking-log, history, exports), 2/4 (capture-quick, capture-full, capture-voice, shortlist, realtime, onboarding, settings).
- **Recurrence pattern:** Phase 13 D-13 docking discipline (WALKTHROUGH-evidence-pulls-scores-down) consistently docked Pillar 6 across the corpus; 0 surfaces hit 4/4. The gap is the milestone-level finding that whole-phase v0.2 scoring (22.4/24 average) didn't isolate — v0.3's audit value is exactly this Pillar 6 deficit.
- **Note:** This is an **executive-summary-level observation, NOT a cluster ranked entry.** Per CONTEXT.md "Verdict distribution as fixed input": Phase 14 inherits Phase 13's verdict count (5✅/9⚠/0❌) and does NOT re-score. The corpus-level Pillar 6 deficit drives the Executive Summary's "axis (ii) and axis (iii) drive Tier 1" observation but does not appear as a single ranked entry.
- **Sources:** UI-AUDIT.md "Cross-cutting observations" bullet 5; UI-AUDIT.md "Calibration notes" §1-2.

## Candidate Standalone Blocker Entries

> **Coverage:** 8 GitHub issues + 4 backlog cross-links + 8 non-issue-filed blockers / friction-stacking patterns / observability gaps.

### B-1: Sheet-01 — `paper-grain` overrides Tailwind `fixed` on bottom sheets (Issue #1 / Sheet-01 backlog)
- **Surface:** capture-photo (Photothèque button 35px-clipped past 844px viewport).
- **Candidate score:** **(i:0 / ii:0 / iii:2, total 2) → Tier 2.** No identity impact (the photo grid affordance underneath is genuinely earned per ui-reviews/capture-photo Pillar 2). No invariant impact. Primary tap-path is gated — Photothèque button requires Safari URL-bar auto-hide to reach (axis iii:2).
- **Sources:** WALKTHROUGH.md §Capture-Photo P-12-Ph01; ui-reviews/capture-photo-UI-REVIEW.md Pillar 6; Issue #1; PROJECT.md "Surfaced for follow-up" Sheet-01.

### B-2: Ingredient parser corrupts `<int> <noun>` lines (Issue #2)
- **Surface:** capture-full; likely propagates to capture-voice / capture-photo / capture-url via the same parser.
- **Candidate score:** **(i:1 / ii:0 / iii:2, total 3) → Tier 2.** Identity impact peripheral — the recipe view's `Ingrédients` list is the primary readable artifact and corruption "X X X X" undermines the editorial polish (axis i:1). No specific architecture invariant covers parser correctness. Primary tap-path produces wrong result on a common French shopping-list pattern (axis iii:2).
- **Sources:** WALKTHROUGH.md §Capture-Full P-12-F01; ui-reviews/capture-full-UI-REVIEW.md; Issue #2.

### B-3: Architecture invariant #2 broken — `MEMBER_COUNT=2` hardcoded; vote-state mis-computed in ≠2-member households (Issue #4)
- **Surface:** vote (chip rendering); realtime (RT-4 confirmed at WS frame layer too).
- **Candidate score:** **(i:2 / ii:2 / iii:1, total 5) → Tier 1.** Identity impact direct — the 5-state chip pill is "one of the most visually-distinctive Slow Food artifacts in the app" per ui-reviews/vote-UI-REVIEW.md and the chips are *semantically wrong* in 4-member households (axis i:2). Invariant #2 broken at user-visible layer (axis ii:2). Primary tap-path completes but produces wrong displayed state (axis iii:1).
- **Sources:** WALKTHROUGH.md §Vote P-12-Vt-01; §Realtime P-12-RT-4; ui-reviews/vote-UI-REVIEW.md Pillar 6; Issue #4.

### B-4: Cooking log re-finalize doubles `cook_count` — invariant #3 violated (Issue #5)
- **Surface:** cooking-log; affects scoring algorithm via `cook_count` recency input.
- **Candidate score:** **(i:0 / ii:2 / iii:2, total 4) → Tier 1.** No direct identity-signature impact. Invariant #3 (denormalized fields update in same DB transaction) broken at user-visible layer — `Dernière fois : aujourd'hui · Cuisinée 2 fois` after one cook (axis ii:2). Data corruption surfaces in primary-path display (axis iii:2).
- **Sources:** WALKTHROUGH.md §Cooking-Log P-12-CL-01; ui-reviews/cooking-log-UI-REVIEW.md Pillar 6; Issue #5.

### B-5: Per-log detail route `/cooking-logs/{id}` missing in Next.js (Issue #6)
- **Surface:** history (per-log detail).
- **Candidate score:** **(i:0 / ii:1 / iii:2, total 3) → Tier 2.** No direct identity impact. Invariant break peripheral — the route absence isn't a documented invariant but is implicit in "members own their identity / write paths have read paths" (axis ii:1). Primary tap-path produces wrong result — write path with no read path; framework default 404 stripped of app shell (axis iii:2).
- **Sources:** WALKTHROUGH.md §History P-12-H-02; ui-reviews/history-UI-REVIEW.md Pillar 6; Issue #6.

### B-6: 5-member household at color-palette capacity ceiling — silent failure (Issue #7) **[audit-time delta: 4→5 swatches]**
- **Surface:** onboarding (palette + color collision).
- **Candidate score:** **(i:1 / ii:0 / iii:2, total 3) → Tier 2.** Identity impact peripheral — onboarding's color picker uses `<Lock>` icon overlay on taken swatches (genuine "system says no" affordance per ui-reviews/onboarding Pillar 2), but the silent terminal state when all 5 swatches taken refuses the editorial-care identity (axis i:1). Primary intended action "join household" is non-functional once palette exhausted (axis iii:2).
- **Sources:** WALKTHROUGH.md §Onboarding P-12-O04; ui-reviews/onboarding-UI-REVIEW.md Pillar 6; Issue #7. **Tension: WALKTHROUGH stated 4 swatches; live code shows 5.** Phase 14 cites the actual count (5) per UI-AUDIT cross-cutting bullet 12.

### B-7: `PATCH /api/households/me` returns 405 — member name unchangeable post-onboarding (Issue #8)
- **Surface:** settings (member self-management).
- **Candidate score:** **(i:0 / ii:1 / iii:2, total 3) → Tier 2.** No direct identity-signature impact. "Members own their identity" is implicit-not-documented invariant (axis ii:1). Primary intended action "edit my member name" is gated by missing route (axis iii:2). Compounds with B-6 — typo'd name during onboarding has no recovery path.
- **Sources:** WALKTHROUGH.md §Settings P-12-S02; ui-reviews/settings-UI-REVIEW.md Pillar 6; Issue #8.

### B-8: TZ-01 — `func.date(cooked_at) == DateType.today()` UTC vs local-tz mismatch (TZ-01 backlog cross-link)
- **Surface:** cooking-log (active filter); realtime (locus 3 visibility cross-link).
- **Candidate score:** **(i:0 / ii:0 / iii:1, total 1) → Tier 3.** No identity impact. No documented invariant violated (timezone handling not in the 8 invariants). Primary tap-path completes but `Cette cuisson n'est plus disponible` surfaces for users in TZs ahead of UTC near local midnight (axis iii:1). Score may upgrade to Tier 2 if Phase 14 weights "cross-surface impact" — see §6 tension.
- **Sources:** WALKTHROUGH.md §Cooking-Log P-12-CL-04; UI-AUDIT.md cross-cutting bullet 9; PROJECT.md "Surfaced for follow-up" TZ-01.

### B-9: URL-01 — URL extraction is `# TODO(productize)`; drafts never promote (URL-01 backlog cross-link)
- **Surface:** capture-url.
- **Candidate score:** **(i:0 / ii:0 / iii:1, total 1) → Tier 3.** No identity impact (the surface's helper copy `arrive bientôt` is editorial-honest). No invariant. Primary intended action "structure a URL" doesn't deliver but the surface ships the limitation transparently — friction-class because the helper copy mitigates (axis iii:1). The UI-AUDIT.md §capture-url abstract notes: "the moment that copy is dropped the surface becomes a true blocker."
- **Sources:** WALKTHROUGH.md §Capture-URL P-12-U01; ui-reviews/capture-url-UI-REVIEW.md Pillar 6; PROJECT.md "Surfaced for follow-up" URL-01.

### B-10: CL-01 — `GET /api/cooking-logs?days=14` endpoint missing; history page renders empty (CL-01 backlog cross-link)
- **Surface:** history (list page).
- **Candidate score:** **(i:0 / ii:1 / iii:2, total 3) → Tier 2.** No direct identity impact. Implicit invariant break — write paths have read paths (axis ii:1). Primary tap-path produces wrong result — page shows `Aucune recette / Ajoute ta première recette pour commencer` (wrong-domain copy: conflates recipes with cooking_logs) for valid-data state (axis iii:2). Combined with B-5 (Issue #6 missing detail route), the history feature is "effectively decommissioned."
- **Sources:** WALKTHROUGH.md §History P-12-H-01; ui-reviews/history-UI-REVIEW.md Pillar 6; PROJECT.md "Surfaced for follow-up" CL-01.

### B-11: History feature buried + decommissioned (cross-cutting friction)
- **Surface:** history (information architecture + content combined: B-5 + B-10 + P-12-H-03 buried-nav).
- **Candidate score:** **(i:0 / ii:0 / iii:1, total 1) → Tier 3.** No identity impact. No documented invariant. Friction at primary-path because the history feature ships, has no main-nav link, and renders empty for valid data — but ranks below B-5 + B-10 individually because this is the IA-only finding stripped of the route + endpoint (axis iii:1). **Possible merge candidate** with B-5 + B-10 — see §6 tension.
- **Sources:** WALKTHROUGH.md §History P-12-H-03.

### B-12: `cooking.finalized` 7th broadcast event missing from `services/realtime.py:9-19` canonical docstring (doc rot)
- **Surface:** realtime (documentation vs code drift).
- **Candidate score:** **(i:0 / ii:1 / iii:0, total 1) → Tier 3.** No identity impact. Invariant #4 break at code layer but masked from user — the broadcast IS emitted; only the canonical docstring is missing the enumeration (axis ii:1). Zero primary-path friction. Per UI-AUDIT.md cross-cutting bullet 9.
- **Sources:** WALKTHROUGH.md §Realtime P-12-RT-6 sub-finding; ui-reviews/realtime-UI-REVIEW.md Pillar 6.

### B-13: Push UX three-gap cluster — Settings recovery + admin-test + round-trip
- **Surface:** push (P-12-Pu-02 friction + Pu-04 audit-only blocker + Pu-05 deferred).
- **Candidate score:** **(i:0 / ii:0 / iii:2, total 2) → Tier 2.** No identity impact (the PushPermissionBanner is a "genuinely warm Slow Food micro-surface" per ui-reviews/push-UI-REVIEW.md). No invariant. Primary tap-path is structurally gated — banner is one-shot affordance, dismiss-once = lost-rest-of-session, no Settings recovery path (axis iii:2). **Note:** This entry could legitimately be 3 separate ranked entries (Pu-02, Pu-04, Pu-05) — see §6 tension on whether to keep as cluster or split.
- **Sources:** WALKTHROUGH.md §Push P-12-Pu-02 / Pu-04 / Pu-05; UI-AUDIT.md §push; WALKTHROUGH.md "Inputs to Phase 14" bullet 6; ui-reviews/push-UI-REVIEW.md Pillar 6.

### B-14: capture-quick title-only Full submit creates orphan `structured` recipe with null ingredients (P-12-F02)
- **Surface:** capture-full.
- **Candidate score:** **(i:0 / ii:0 / iii:1, total 1) → Tier 3.** No identity. No invariant. Friction at primary-path — null-ingredients recipes silently affect shortlist scoring (axis iii:1; could upgrade if scoring impact judged user-visible).
- **Sources:** WALKTHROUGH.md §Capture-Full P-12-F02.

### B-15: Install-PWA banner occludes vote affordances on first load (P-12-Sh-01)
- **Surface:** shortlist.
- **Candidate score:** **(i:0 / ii:0 / iii:1, total 1) → Tier 3.** No identity. No invariant. Friction at primary-path — only first-session, only before banner dismissed (axis iii:1).
- **Sources:** WALKTHROUGH.md §Shortlist P-12-Sh-01; ui-reviews/shortlist-UI-REVIEW.md Pillar 6.

### B-16: Decorative `<img>` traps pointer events on shortlist deck card (P-12-Sh-04 + P-12-Sh-03 a11y)
- **Surface:** shortlist.
- **Candidate score:** **(i:0 / ii:0 / iii:0, total 0) → Tier 3.** No identity. No invariant. Real iOS touches still work; surfaces only via assistive input methods (switch control, VoiceOver double-tap, automation) (axis iii:0; could upgrade to 1 if a11y impact judged user-visible — see §6 tension).
- **Sources:** WALKTHROUGH.md §Shortlist P-12-Sh-03 + P-12-Sh-04; ui-reviews/shortlist-UI-REVIEW.md Pillar 6.

### B-17: `/onboarding/welcome` reachable for authenticated user — no redirect-to-`/` guard (P-12-O01)
- **Surface:** onboarding.
- **Candidate score:** **(i:0 / ii:0 / iii:1, total 1) → Tier 3.** No identity. No documented invariant. Friction at primary-path — destructive re-onboarding flow possible if user picks different name; visible step mitigates (axis iii:1).
- **Sources:** WALKTHROUGH.md §Onboarding P-12-O01; ui-reviews/onboarding-UI-REVIEW.md Pillar 6.

### B-18: Recipe-detail page has no vote affordance (P-12-Vt-05)
- **Surface:** vote (alt entry point).
- **Candidate score:** **(i:0 / ii:0 / iii:1, total 1) → Tier 3.** No identity. No invariant. Friction at primary-path — re-reading a recipe in detail-mode requires returning to deck; if exhausted, locked until tomorrow (axis iii:1).
- **Sources:** WALKTHROUGH.md §Vote P-12-Vt-05.

### B-19: No "Quitter le foyer" path — leaving requires backend intervention (P-12-S03)
- **Surface:** settings (member offboarding).
- **Candidate score:** **(i:0 / ii:0 / iii:1, total 1) → Tier 3.** No identity. No invariant. Friction at primary-path — couple-scale rarely exercises this, but cookie-only logout (multi-step iPhone Safari clear-history) is the only path (axis iii:1).
- **Sources:** WALKTHROUGH.md §Settings P-12-S03.

### B-20: tab/button copy drift from documentation (P-12-Q01)
- **Surface:** capture-quick (cluster — affects all 5 capture surfaces).
- **Candidate score:** **(i:0 / ii:0 / iii:0, total 0) → Tier 3.** No identity (the rendered French strings ARE Slow Food register). No invariant. No primary-path friction (the strings work, only documentation drifts — `Rapide` not `Quick`, `Ajouter` not `Créer`/`Valider`, `Brouillon` not `Brouillon en attente d'analyse`).
- **Sources:** WALKTHROUGH.md §Capture-Quick P-12-Q01.

### B-21: POLISH-02 backlog hygiene — Copy button shipped; backlog still lists open
- **Surface:** settings (P-12-S01 + onboarding share-code source review).
- **Candidate score:** **(i:0 / ii:0 / iii:0, total 0) → Tier 3.** No impact on any axis. Pure backlog-hygiene observation: `frontend/app/settings/page.tsx:154-162` has the Copy button; `frontend/app/onboarding/share-code/page.tsx` has it too; PROJECT.md "Surfaced for follow-up" still lists POLISH-02 open. Phase 14 records the delta as a Tier 3 entry (per CONTEXT.md "Backlog reconciliation").
- **Sources:** WALKTHROUGH.md §Settings P-12-S01; UI-AUDIT.md "Cross-cutting observations" bullet 12; PROJECT.md "Surfaced for follow-up (v0.2.2 backlog)".

## Tier-Tally Projection

| Tier | Score band | Candidate count (cluster + standalone) | Recommended band (Claude's Discretion) | Status |
|------|-----------|----------------------------------------|----------------------------------------|--------|
| Tier 1 | total ≥4 | **2** (B-3, B-4) | 5-8 | Below recommended (no recalibration concern — recalibration trigger is >10) |
| Tier 2 | total 2-3 | **8** (C-4, B-1, B-2, B-5, B-6, B-7, B-10, B-13) | 10-15 | Slightly below recommended |
| Tier 3 | total 0-1 | **20** (C-1, C-2, C-3, C-5, C-6, C-8, B-8, B-9, B-11, B-12, B-14, B-15, B-16, B-17, B-18, B-19, B-20, B-21 + 2 wiggle from §6 tensions) | 10-15 | Above recommended |
| **Total** | | **30 candidates** | 25-35 (D-01 target) | **Within target range** ✓ |

**Calibration observations:**
- The candidate Tier 1 count is **2**, well below the >10 recalibration trigger flagged in CONTEXT specifics. Per CONTEXT specifics ("If the auditor finds themselves placing >10 entries in Tier 1, the rubric thresholds need recalibration upward, not relaxation"), no recalibration is signaled. Whether 2 entries in Tier 1 is "too few" — i.e., whether the rubric thresholds need recalibration *downward* — is an explicit auditor judgment the planner should expose.
- The shape (heavy Tier 3, light Tier 1) is consistent with Phase 13's milestone-level pattern: **0 ❌ verdicts, 5 ✅, 9 ⚠** — the design system is robust at the rendering layer, the structural correctness gaps concentrate at specific architecture-invariant break sites.
- The (i,ii,iii) profile of Tier 1 entries is **axis-ii heavy** (B-3 i:2/ii:2/iii:1; B-4 i:0/ii:2/iii:2): both are architecture-invariant violations with primary-path-friction or chip-semantics-wrong consequences. **The Executive Summary observation: "axis (ii) invariant-violation drives Tier 1; axis (i) identity-signature impact concentrated in Tier 2 token-completeness clusters"** — this matches the corpus pattern.

## Net-New Patterns From WALK + AUDIT Combination

These are patterns visible only by combining both inputs. The planner refines/decides whether each becomes a distinct ranked entry or merges:

### N-1: Validation-error UX cluster as superset (C-3 vs C-5)
- **Visible only via combination:** WALKTHROUGH.md "Inputs to Phase 14" bullet 5 lists "validation-error UX uniformly weak across capture + cooking-log + exports" (3 surfaces visible there). UI-AUDIT.md cross-cutting bullets list two related but distinct patterns: shadcn-default Sonner toast as sole failure surface (bullet 6) + capture-quick `Connexion impossible` mismatch (per surface abstract). The synthesis question: do these collapse into ONE cluster (C-3 + C-5 merged → 5+ surfaces including onboarding race-409) or remain TWO (C-3 = "wrong-domain toast copy", C-5 = "missing recovery copy")?
- **Decision the planner exposes:** Recommend ONE merged cluster ("validation-error UX cluster") with all 5+ surfaces cited, score (i:0 / ii:0 / iii:1, total 1) → Tier 3. Rationale: D-01's cluster bar (≥3 surfaces) is met by either reading; the merged form gives v0.4 a single coordinated-fix scope.

### N-2: Writes-without-reads pattern (history feature decommissioning)
- **Visible only via combination:** WALKTHROUGH.md surfaces CL-01 (GET endpoint missing) + Issue #6 (detail route missing) + P-12-H-03 (buried in IA) as 3 separate findings. UI-AUDIT.md §history calls history "the most decommissioned surface in the audit" (Phase 13 D-15-flagged outlier at 18/24). The synthesis question: do B-10 + B-5 + B-11 collapse into ONE entry ("history feature decommissioning"), or remain THREE distinct entries?
- **Decision the planner exposes:** Recommend keeping THREE distinct entries (B-5, B-10, B-11) per D-01's "per-blocker" granularity preference. Each has independent fix scope. The umbrella "history feature decommissioning" appears in the Executive Summary observation, not as a fourth ranked entry.

### N-3: 5-member capacity ceiling propagates beyond onboarding (B-6 → B-7 + audit baseline)
- **Visible only via combination:** WALKTHROUGH.md §Onboarding P-12-O04 + §Settings P-12-S02 + §Realtime "two-context cookie isolation" preamble all reference the same household-CRUD ceiling. UI-AUDIT.md §settings notes B-7 "compounds with O-04 — once you've onboarded with a typo, you're stuck with it permanently." The synthesis question: does this become a "household-CRUD-readonly cluster" entry distinct from B-6 and B-7?
- **Decision the planner exposes:** Recommend NO additional cluster entry — B-6 (Issue #7) and B-7 (Issue #8) are individually scored and both Tier 2. The compounding observation appears in B-7's `Why this impacts feels-Al-Dente` field as a citation back to B-6, not as a third entry. Adding a cluster would double-count.

### N-4: Persistent prod-data anomalies (audit-corpus-only)
- **Visible only via combination:** WALKTHROUGH.md "Inputs to Phase 14" bullet 9 lists 4 anomalies: Coq au vin's `cook_count=2` (B-4 exposure); 7+ stuck drafts in inbox (C-4 cluster cumulative); Joe's active cook on Pad thai tofu unfinalized; auditor + Joe persist as members #3 and #4. UI-AUDIT.md doesn't enumerate these (Phase 13 read the live state with these anomalies present). The synthesis question: are these ranked entries or "Limits of this assessment" notes?
- **Decision the planner exposes:** Recommend "Limits of this assessment" notes in Section 1 — these are audit-corpus state, not product findings. Adding ranked entries for synthetic-household drift would conflate audit-process with product-quality.

### N-5: Verdict-driving correlation (Phase 13 finding extending into synthesis observation)
- **Visible only via combination:** UI-AUDIT.md cross-cutting bullets 7-8 surface two strong patterns: (a) "✅ verdicts correlate with editorial discipline + system cohesion, NOT absence of bugs" (5 of 5 ✅ surfaces ALSO have Pillar 6 ≤ 2/4); (b) "identity signatures earn ✅ disproportionately." WALKTHROUGH.md doesn't surface this (Phase 12 doesn't score). The synthesis question: where does this observation land in ASSESSMENT.md?
- **Decision the planner exposes:** Recommend Executive Summary §1 paragraph 2 — this is the milestone-level conclusion that carries forward to v0.4 inquiry without prescribing direction. Phrased observationally: "The ✅ verdict correlates with editorial discipline and identity-signature presence; it does NOT correlate with absence of Pillar 6 friction. Verdict-shifts in future audits depend on multi-finding bundles, not single-blocker resolution."

## Tension Surfaces Requiring Planner Decisions

These are conflicts or ambiguities where input artifacts disagree or the rubric leaves room for interpretation. The planner addresses each before plan execution:

### T-1: MEMBER_COLORS audit-time delta (4 vs 5 swatches)
- **Conflict:** WALKTHROUGH.md §Onboarding O-04 states "the locked palette has only 4 swatches per `ColorSwatchPicker`." UI-AUDIT.md cross-cutting bullet 12 reconciles: "live `frontend/lib/colors.ts` (read 2026-05-10) shows 5 swatches: rose / amber / emerald / sky / violet."
- **Planner decision:** Cite the actual count (5) per UI-AUDIT.md reconciliation. Record the WALKTHROUGH-vs-live-code delta as a Tier 3 entry (B-21-adjacent — backlog hygiene). Issue #7 text reconciliation is deferred (CONTEXT.md "Deferred Ideas").
- **CONTEXT cross-link:** "MEMBER_COLORS audit-time delta" decision in 14-CONTEXT.md.

### T-2: P-12-Sh-02 severity reconciliation
- **Conflict:** WALKTHROUGH.md §Shortlist P-12-Sh-02 was originally tagged `blocker`, then re-tagged `friction` in the Plan 12-05 closing sweep after Plan 12-04 RT-5 reproduced the regenerate endpoint with `{}` body and got `200 OK`. The post-sweep WALKTHROUGH retains the friction tag.
- **Planner decision:** Inherit the post-sweep tag (friction). The synthesis cites WALKTHROUGH's final state. The reconciliation history itself is not a ranked entry — it's audit-process metadata in Section 1's "Calibration notes" if at all.

### T-3: Push three-gap — cluster vs three standalone entries (B-13)
- **Conflict:** WALKTHROUGH.md "Inputs to Phase 14" bullet 6 frames Push UX as "three distinct gaps" (Pu-02 friction + Pu-04 audit-only-blocker + Pu-05 deferred). UI-AUDIT.md §push describes them as three structural frictions stacking. The synthesis question: one cluster entry or three standalone?
- **Planner decision:** Recommend ONE cluster entry (B-13 above) per D-01's cluster preference. Pu-04 is audit-environment-only (per WALKTHROUGH closing sweep "2 audit-environment-only blockers ... NOT product bugs"); Pu-05 is operator-deferred to v0.3-ship sign-off (re-tagged friction in sweep). Folding all three under one entry cited as "Push UX three-gap" preserves the WALKTHROUGH framing without giving Pu-04 + Pu-05 misleading individual ranks.

### T-4: TZ-01 score band (Tier 3 vs Tier 2)
- **Conflict:** B-8 candidate score is (i:0 / ii:0 / iii:1, total 1) → Tier 3. WALKTHROUGH.md "Inputs to Phase 14" bullet 7 explicitly flags Phase 14 should "consider whether to upgrade severity given the `Cette cuisson n'est plus disponible` user-visible copy" + cross-surface impact (cooking-log + realtime locus 3).
- **Planner decision:** Two valid readings. (a) Strict rubric: axis (iii) is 1 (friction-class because masked for North-American users in/behind UTC). (b) Cross-surface upgrade: axis (iii) bumps to 2 because the failure mode crosses 3 surfaces (cooking-log, realtime, history-implicit). Recommend **(a) strict** → Tier 3, since axis (iii) measures friction at primary-path of the surface where the entry is anchored (cooking-log here), not cross-surface footprint. Cross-surface impact is captured by surface-citation breadth in `Where`/`Sources` fields, not by axis bumping.

### T-5: B-16 (decorative `<img>` traps pointer events) score band — Tier 3 score 0 vs score 1
- **Conflict:** Real iOS touches work; a11y/automation-only friction. Axis (iii) judgment: 0 (no real-user impact) or 1 (a11y is real-user impact for assistive-tech users)?
- **Planner decision:** Recommend **axis (iii):1** → total 1 → Tier 3. The auditor's discipline per CONTEXT D-03 is user-visible-friction, and assistive-tech users ARE users. Score stays Tier 3 either way.

### T-6: Push subscribe headless-Chromium blocker (P-12-Pu-01) — include or exclude?
- **Conflict:** WALKTHROUGH.md §Push P-12-Pu-01 is tagged `blocker (for AUDIT — not for product)`. The closing sweep §"Audit-environment-only blockers" excludes it from filed issues. The synthesis question: does this become a Tier 3 ranked entry (audit-process observation) or stays out of the ranking entirely?
- **Planner decision:** Recommend **stays out of the ranking** — these are audit-environment observations, not product findings. They land in Section 1 "Limits of this assessment" alongside Phase 13's D-16 partial-reach annotation and the iPhone-shape-Chromium-only viewport scope.

### T-7: Tier 1 size — 2 candidates vs recommended 5-8
- **Conflict:** Candidate count (2: B-3 + B-4) is below the recommended 5-8 band per Claude's Discretion. The recalibration trigger (>10) is not met, but the auditor faces a judgment: does the rubric need recalibration *downward* to surface more entries into Tier 1?
- **Planner decision:** Two paths. (a) Accept 2 entries — defensible given "axis (ii) invariant-violation drives Tier 1" pattern, and the Tier 1 boundary at total ≥4 is explicit. (b) Recalibrate to total ≥3 — would promote B-2, B-5, B-6, B-7, B-10, C-4 (all currently total 3) into Tier 1, swelling to 8. **Recommend path (a)** — keep the locked rubric as-is. The 2-entry Tier 1 IS the milestone-level finding ("the v0.3 audit surfaces exactly 2 user-visible architecture-invariant violations as the load-bearing impact entries"). Auditing this back to 8 entries dilutes the signal.

## "Inputs to Next /gsd-new-milestone Cycle" — Draft Section Structure

Per CONTEXT.md D-10 contract: artifacts + framing questions + explicit non-prescriptions.

### (a) Source artifacts (paths v0.4 milestone-discovery consumes)

```markdown
- `.planning/v0.3/WALKTHROUGH.md` — Phase 12 exploratory-feature output (1,276 lines, ~64 severity-tagged findings across 14 surfaces; 7 GitHub issues cross-linked; 4 backlog cross-links).
- `.planning/v0.3/UI-AUDIT.md` — Phase 13 milestone aggregator (14 surface verdicts at 5✅/9⚠/0❌; mean 20.21/24; 13 cross-cutting observations; calibration notes).
- `.planning/v0.3/ui-reviews/` — 14 per-surface 6-pillar UI-REVIEWs with verdict + boilerplate/earned table + WALKTHROUGH cross-link footers.
- `.planning/v0.3/walkthrough-screenshots/` (51 PNGs) + `.planning/v0.3/ui-reviews/screenshots/` (27 PNGs) — visual evidence committed in git.
- GitHub issues `lucaguery/al-dente` `audit:walkthrough` label: #1 (Sheet-01 sheet positioning), #2 (ingredient parser), #3 (Voice/Photo stuck-extraction cross-surface dedupe), #4 (MEMBER_COUNT=2 hardcoded), #5 (cook_count idempotency), #6 (missing detail route), #7 (5-member capacity ceiling), #8 (PATCH 405).
- `.planning/REQUIREMENTS.md` (v0.3) and `.planning/PROJECT.md` "Surfaced for follow-up (v0.2.2 backlog)" — orthogonal backlog state at v0.3 ship.
```

### (b) Open framing questions (3-5 inquiries; NOT constraints)

> **Voice discipline check:** Each question phrased as "How does v0.4 weigh X?" or "Should X be Y or Z?" — inquiry form. Phrased as "v0.4 should weigh X carefully" would FAIL the D-08 grep gate's `should` pattern. Each question cites the assessment input that surfaces the inquiry.

```markdown
1. **How does v0.4 weigh remediation depth vs. new capability development?** (cites the impact distribution: 2 Tier-1 architecture-invariant violations + 8 Tier-2 entries spanning capacity, capture-pipeline, history-feature, and validation surfaces — without ordering them against new-capability work.)

2. **Should architecture-invariant violations (axis ii ≥1) be addressed coordinated (single phase) or independently (per-invariant phases)?** (cites the cluster taxonomy + 5-surface invariant-violation footprint per UI-AUDIT.md cross-cutting bullet 9 — without dictating bundle shape.)

3. **How does v0.4 weigh fixing structural correctness (axis ii) vs. closing identity-signature gaps (axis i)?** (cites the axis distribution: Tier 1 axis-ii-heavy; Tier 2 axis-i-heavy on token-completeness clusters — without ordering the axes.)

4. **Should the cluster entries with cross-surface footprint be addressed per-cluster or per-surface?** (cites C-1 emerald-literal across 5 surfaces, C-2 no-debounce across 4 surfaces, C-4 capture-pipeline across 3 surfaces — without dictating phase shape.)

5. **What does the audit corpus's iPhone-shape-Chromium-only scope imply for v0.4 audit budget?** (cites the "Limits of this assessment" — without proposing a cross-browser audit phase.)
```

### (c) Explicit non-prescriptions (D-10 c)

> **Voice discipline check:** Each line phrased as "ASSESSMENT.md does not X" — present-tense observational. Phrased as "v0.4 should not X" would BE prescriptive (constraint on v0.4). The non-prescription frame is about THIS document's scope, not about v0.4's choices.

```markdown
- ASSESSMENT.md does not order remediation.
- ASSESSMENT.md does not estimate effort.
- ASSESSMENT.md does not propose phase shapes, plan shapes, or v0.4 requirements.
- ASSESSMENT.md does not assert that addressing a Tier 1 finding will flip a surface verdict from ⚠ to ✅ — verdict shifts depend on multi-finding bundles and v0.4 implementation choices.
- Tier ordering reflects impact on "feels Al Dente", not implementation priority — these are not the same axis.
```

## Anti-Prescription Compliance Checklist

The grep gate (D-07/D-08) is the structural enforcement. This section enumerates the patterns the planner verifies the executor's draft passes:

| Pattern (D-08) | Permitted exceptions | Verification command |
|----------------|---------------------|---------------------|
| `v0\.4` (case-insensitive) | None | `grep -in 'v0\.4' .planning/v0.3/ASSESSMENT.md` → must return 0 matches |
| `should (fix\|add\|build\|implement\|do\|consider\|address\|tackle\|prioritize)` | None | `grep -in 'should \(fix\|add\|build\|implement\|do\|consider\|address\|tackle\|prioritize\)' …` |
| `recommend(ed\|s)?` / `propose(d\|s)?` / `suggest(ed\|s)?` (as verbs of action toward future work) | Citations of past-phase decisions ("Phase 13 D-02 recommends X") permitted only if quoted in prose context | `grep -in '\<\(recommend\|propose\|suggest\)\(ed\|s\)\?\>' …` then manual review |
| `must (fix\|build\|add\|implement\|do\|address\|prioritize)` | None | `grep -in 'must \(fix\|build\|add\|implement\|do\|address\|prioritize\)' …` |
| `next milestone (should\|will\|must\|needs to)` | None | `grep -in 'next milestone \(should\|will\|must\|needs to\)' …` |
| `TODO` / `action (item\|step\|plan)` / `next step` | None | `grep -in 'TODO\|action \(item\|step\|plan\)\|next step' …` |
| `(roadmap\|plan).{0,20}(for\|of) v0` | None (D-08 explicit) | `grep -inE '(roadmap\|plan).{0,20}(for\|of) v0' …` |
| `phase (1[5-9]\|[2-9][0-9])` (forward phase numbers) | None (D-08 explicit; past phases 11/12/13/14 permitted) | `grep -inE 'phase (1[5-9]\|[2-9][0-9])' …` |

**Composite gate (single-command, planner's discretion to wrap as `.sh` script):**
```bash
grep -inE 'v0\.4|should (fix|add|build|implement|do|consider|address|tackle|prioritize)|\<(recommend|propose|suggest)(ed|s)?\>|must (fix|build|add|implement|do|address|prioritize)|next milestone (should|will|must|needs to)|TODO|action (item|step|plan)|next step|(roadmap|plan).{0,20}(for|of) v0|phase (1[5-9]|[2-9][0-9])' .planning/v0.3/ASSESSMENT.md && exit 1 || exit 0
```

A non-zero match exits 1 (commit blocked); zero matches exits 0 (commit proceeds). Per CONTEXT specifics: "the grep gate should run twice during execution — once as a draft check (after the auditor finishes drafting Sections 1-3) to catch slip; once before the commit (D-07 contract). Same script invocation, both times."

## Common Pitfalls

### Pitfall 1: Slipping into prescriptive voice mid-paragraph
- **What goes wrong:** The auditor writes 25-35 entries observationally, then in the closing paragraph of the Executive Summary slips into "the milestone surfaces opportunities for v0.4 to address" or "v0.4 should weigh remediation depth carefully."
- **Why it happens:** Synthesis writing has natural gravitational pull toward "and so, …" conclusions. The reader (Claude or human) wants to give the document forward direction.
- **How to avoid:** Section 1's "How to read" subsection front-loads the discipline. The grep gate runs twice (draft + pre-commit per CONTEXT specifics). The schema (D-05) forbids `Recommendation`/`Action`/`Next Step`/`v0.4 plan` in entries.
- **Warning signs:** Any sentence starting with "v0.4", "the team", "we", "the next milestone"; any imperative verb directed at future work; any "should"/"must"/"recommend"/"propose"/"suggest" outside a citation of past-phase decisions.

### Pitfall 2: Scoring inflation under the "this matters" pressure
- **What goes wrong:** The auditor finds themselves placing >10 entries in Tier 1, OR finds themselves weighting axis (iii) at 2 for entries where primary-path completes-with-friction-only.
- **Why it happens:** Each entry feels important when read individually; the rubric exists to enforce dimensional discipline.
- **How to avoid:** The candidate scoring in §1-2 above is intentionally conservative (Tier 1 = 2 candidates). The rubric anchor: axis (iii):2 = "primary tap-path is gated, blocked, or produces wrong result"; axis (iii):1 = "primary tap-path completes but with friction." If the user CAN complete the action AND get the right outcome, axis (iii) is at most 1.
- **Warning signs:** Tier 1 count >10 (CONTEXT recalibration trigger); Tier 1 count >8 (above Claude's Discretion recommended band); axis-(iii) score of 2 on entries where the user-visible artifact is "correct but with extra step" (that's friction, not blocked).

### Pitfall 3: Conflating cluster severity with cluster footprint
- **What goes wrong:** A 5-surface cluster (e.g., C-1 emerald-literal) feels "more important" than a single-surface blocker (e.g., B-1 Sheet-01) because of the surface count. The auditor weighs surface count instead of (i,ii,iii) impact.
- **Why it happens:** Surface count is a salient, observable number; impact axes require dimensional reasoning.
- **How to avoid:** The rubric in D-03 doesn't include a footprint axis. Surface count appears in `Pattern` field for clusters but does NOT enter the score calculation. C-1 (i:1/ii:0/iii:0, total 1) is Tier 3 despite 5 surfaces; B-1 (i:0/ii:0/iii:2, total 2) is Tier 2 despite 1 surface. The axes measure user-visible impact, not breadth.
- **Warning signs:** Cluster entries scored Tier 1 or 2 on the basis of surface count; cluster entries with axis (iii):0 promoted into Tier 2.

### Pitfall 4: Re-scoring surfaces during synthesis
- **What goes wrong:** Reading a UI-REVIEW that scored 21/24 with verdict ✅, the synthesis surfaces a Tier 1 entry that "obviously" should re-flip the verdict to ⚠. The auditor edits the per-surface verdict.
- **Why it happens:** Phase 13's verdicts feel inherited; Phase 14's findings feel new.
- **How to avoid:** CONTEXT.md "Verdict distribution as fixed input": Phase 13's 5✅/9⚠/0❌ is inherited as-is. If synthesis surfaces a tension where a verdict warrants reconsideration, the auditor records this as a ranked entry (axis i impact) rather than a rescore.
- **Warning signs:** Edits to `.planning/v0.3/ui-reviews/<surface>-UI-REVIEW.md` files during Phase 14; UI-AUDIT.md table-cell changes during Phase 14.

### Pitfall 5: Filing new GitHub issues for net-new patterns
- **What goes wrong:** N-1 surfaces a "validation-error UX cluster" not previously enumerated. The auditor files a new issue under `audit:walkthrough` to track it.
- **Why it happens:** The 8 issues filed in Plan 12-05 set a precedent; "more findings" feels like "more issues."
- **How to avoid:** CONTEXT.md "Not in this phase": "No new GitHub issues — issue-filing was Phase 12's mechanism for blockers (#1-#8 already filed); Phase 14 cites these but does not file new ones." Mirror the Phase 13 D-domain.
- **Warning signs:** New issues appear at `lucaguery/al-dente` with `audit:walkthrough` label after 2026-05-10; ASSESSMENT.md citations include `Issue #9+`.

### Pitfall 6: Fixing the WALKTHROUGH-vs-live-code MEMBER_COLORS delta during Phase 14
- **What goes wrong:** Auditor sees the 4-vs-5 swatch reconciliation and edits WALKTHROUGH.md to say 5, OR opens an issue to update the WALKTHROUGH text.
- **Why it happens:** The discrepancy feels like cleanup work.
- **How to avoid:** Per CONTEXT.md "MEMBER_COLORS audit-time delta": Phase 14 records this as a Tier 3 entry; does not modify WALKTHROUGH.md. Issue #7 text reconciliation is deferred to v0.4 or backlog hygiene.
- **Warning signs:** Diffs to `.planning/v0.3/WALKTHROUGH.md` during Phase 14 plans; new issues to update existing #7 wording.

## Code Examples

Not applicable. Phase 14 produces Markdown only. The closest analog to "code examples" — the schema-enforced finding template — is shown above under "Architecture Patterns / Pattern: Schema-enforced finding template."

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Audit findings filed as one mixed list with implicit ordering | Tiered ranked list with exposed 3-axis rubric (D-03 + D-04) | Phase 14 (this phase) | A v0.4 reader can challenge a rank by pointing at a specific axis score; ordering is auditable. |
| Anti-prescription enforced by writing convention only | Schema (D-05) + voice convention (D-06) + grep gate (D-07/D-08) — three layers | Phase 14 | Structural enforcement; non-bypassable; runs pre-commit. |
| Forward references to "v2" / "next milestone" in audit prose | Forward-only grep blocking with past-phase citation allowance (D-08 anchors `phase (1[5-9]|[2-9][0-9])`) | Phase 14 | Phase 11/12/13 citations explicitly permitted; v0.4 / phase-15+ blocked. |
| Per-finding GitHub issue filing for every blocker | Past-phase issues cited (#1-#8); Phase 14 files no new issues | Phase 14 (mirrors Phase 13 D-domain) | Issue stream stays scoped to Phase 12's filings; v0.4 decides whether to file based on assessment. |

**Deprecated/outdated for this phase:**
- The `severity (blocker/friction/nit)` taxonomy is inherited as Phase 12 metadata but does NOT drive Phase 14's tier assignment. Tier comes from (i,ii,iii) score per D-03; severity tags are visible in `Sources` field citations only.
- The Phase 13 `5✅/9⚠/0❌` verdict distribution is inherited as fixed input (per CONTEXT.md "Verdict distribution as fixed input"); Phase 14 does not re-score surfaces.

## Assumptions Log

> All claims in this research either cite the source artifact directly (CONTEXT.md, WALKTHROUGH.md, UI-AUDIT.md, ui-reviews/, REQUIREMENTS.md, ROADMAP.md, PROJECT.md, CLAUDE.md) or are derived by applying the locked CONTEXT D-03 rubric to those source claims. No claims are tagged `[ASSUMED]`.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | — | — | — |

**Empty by design:** All scoring derivations apply the locked D-03 rubric to evidence cited from WALKTHROUGH.md / UI-AUDIT.md / ui-reviews/ / GitHub issues. The rubric itself is locked in CONTEXT.md (user-confirmed). Tension surfaces in §6 explicitly flag where the rubric leaves room for planner judgment — these are not assumptions, they are surfaced decision points.

## Open Questions (RESOLVED)

1. **Plan split: 1 plan vs 2 plans?**
   - What we know: CONTEXT.md "Operational decisions" recommends single plan but allows 2 plans if context budget warrants. ASSESSMENT.md target: ~5K-10K words; ~25-35 entries × ~150-300 words each.
   - What's unclear: Whether the executor's context budget can sustain the full ~10K-word draft + grep-gate verification + commit in one plan session.
   - RESOLVED: Default to **single plan** (synthesize → grep-gate → commit) per CONTEXT.md preference. If the planner's sizing assessment suggests overflow risk, split into Plan 1 (cluster identification + Tiers 1/2/3 draft of Section 3) and Plan 2 (Sections 1, 2, 4 + grep-gate + commit). Either shape is acceptable per CONTEXT.

2. **Should the grep gate live in a script or inline?**
   - What we know: CONTEXT.md "Claude's Discretion" recommends separate script at `.planning/v0.3/check-assessment.sh` so v0.4 readers can re-run it as evidence the doc passes the gate.
   - What's unclear: Whether the planner judges the script as sufficient documentation or whether inline-in-plan-body has discoverability advantages.
   - RESOLVED: Script at `.planning/v0.3/check-assessment.sh` per CONTEXT.md recommendation. Plan body invokes the script twice (draft + pre-commit per CONTEXT specifics).

3. **Tier 1 size: 2 entries vs recalibrate downward?**
   - What we know: Candidate count is 2 (B-3, B-4). Recommended band is 5-8 (Claude's Discretion). Recalibration trigger is >10 (specifics: "If the auditor finds themselves placing >10 entries in Tier 1, the rubric thresholds need recalibration upward, not relaxation").
   - What's unclear: Whether 2 entries is "the milestone-level finding" (load-bearing signal) or "rubric needs recalibration downward."
   - RESOLVED: Accept 2 entries (T-7 path a). Defensible given Phase 13's pattern (0 ❌ verdicts → design system robust at rendering layer; correctness gaps concentrate at specific invariant-break sites). Surface this as the Executive Summary's load-bearing observation: "axis (ii) invariant-violation drives Tier 1; axis (i) identity-signature impact concentrated in Tier 2 token-completeness clusters."

4. **N-1 cluster merge (validation-error UX C-3 + C-5)?**
   - What we know: WALKTHROUGH "Inputs to Phase 14" bullet 5 lists 3-surface cluster; UI-AUDIT.md splits into 2 patterns (toast cluster + Sonner-as-sole-failure-surface).
   - What's unclear: One merged cluster (5+ surfaces) vs two distinct clusters.
   - RESOLVED: ONE merged cluster per N-1 decision. Reduces entry count by 1; preserves cluster bar (≥3 surfaces).

5. **B-13 Push three-gap: cluster vs three entries?**
   - What we know: T-3 above. WALKTHROUGH "Inputs to Phase 14" bullet 6 frames as three; UI-AUDIT.md §push describes as three frictions stacking.
   - What's unclear: Whether keeping as cluster preserves WALKTHROUGH framing or loses per-gap resolution.
   - RESOLVED: ONE cluster entry (B-13). Pu-04 is audit-environment-only; Pu-05 is operator-deferred. Folding all three under "Push UX three-gap" gives v0.4 a single coordinated handle without inflating Tier 2.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `grep` (POSIX) | D-07 pre-commit gate | ✓ | macOS BSD grep / GNU grep | `ripgrep` if BSD grep regex variants conflict |
| `git` | Commit ASSESSMENT.md (+ optional check-assessment.sh) | ✓ | 2.x | — |
| Markdown editor (VS Code / vim / etc.) | Drafting | ✓ | — | — |
| Source artifacts on disk | Reading inputs | ✓ | All present at `.planning/v0.3/` | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None — `grep` regex syntax is the only minor variation; `ripgrep` is universally compatible if BSD grep produces unexpected results on the D-08 alternation pattern.

## Validation Architecture

> Phase 14 produces a single Markdown document. The "validation" mechanism is the D-07 grep gate, not a test framework. Per `.planning/config.json`-equivalent context — there is no `nyquist_validation` directive applicable; the validation here is doc-shape, not behavior.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None — markdown + grep gate (D-07) |
| Config file | None — grep pattern set inlined in plan body or `.planning/v0.3/check-assessment.sh` |
| Quick run command | `bash .planning/v0.3/check-assessment.sh` (or inline grep) |
| Full suite command | Same as quick run — single-invocation gate |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SYNTH-01 | ASSESSMENT.md exists with ranked findings citing source artifacts | manual + grep | `test -f .planning/v0.3/ASSESSMENT.md && grep -c '^### ' .planning/v0.3/ASSESSMENT.md` (expect 25-35 matches) | Created in this phase |
| SYNTH-02 | Demonstrably descriptive (no proposed phases / prescriptive language) | grep | `bash .planning/v0.3/check-assessment.sh` (expect exit 0) | Created in this phase |
| SYNTH-03 | Closes with explicit "Inputs to next /gsd-new-milestone cycle" section | grep | `grep -c '^## Inputs to next /gsd-new-milestone cycle' .planning/v0.3/ASSESSMENT.md` (expect 1) | Created in this phase |

### Sampling Rate
- **Per task commit:** `bash .planning/v0.3/check-assessment.sh`
- **Per wave merge:** Same command (single doc, no waves)
- **Phase gate:** Grep gate exits 0 + SYNTH-01/02/03 success criteria verified before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `.planning/v0.3/check-assessment.sh` — implements D-07/D-08 grep gate (planner's discretion: inline vs script)
- [ ] `.planning/v0.3/ASSESSMENT.md` — the synthesis output itself

*(No framework install needed — `grep` is universal.)*

## Security Domain

Not applicable. Phase 14 produces a Markdown document containing no secrets, no auth flow descriptions, no input from untrusted sources. The grep gate runs locally on the auditor's machine pre-commit. No ASVS categories apply.

## Sources

### Primary (HIGH confidence)
- `.planning/phases/14-synthesis-handoff/14-CONTEXT.md` — D-01 through D-10 + Specifics + Deferred Ideas + Operational decisions. The locked decision set this research builds on.
- `.planning/REQUIREMENTS.md` §SYNTH — SYNTH-01/02/03 acceptance criteria.
- `.planning/ROADMAP.md` §"Phase 14: Synthesis & Handoff" — goal + success criteria 1/2/3 + out-of-scope clause.
- `.planning/v0.3/WALKTHROUGH.md` (1,276 lines) — primary input artifact; ~64 severity-tagged findings; closing sweep tier deltas; "Inputs to Phase 14" pre-clustering.
- `.planning/v0.3/UI-AUDIT.md` (146 lines) — primary input artifact; 14-row aggregator; 13 cross-cutting observations; calibration notes; verdict distribution.
- `.planning/v0.3/ui-reviews/onboarding-UI-REVIEW.md` (read in full) — axis-(i) identity-signature scoring evidence for B-6 + C-1.
- `.planning/v0.3/ui-reviews/shortlist-UI-REVIEW.md` (read in full) — axis-(i) scoring evidence for C-1 + B-15 + B-16.
- `.planning/v0.3/ui-reviews/{capture-voice,settings,realtime}-UI-REVIEW.md` (selectively grepped for verdict + identity-signature claims) — axis-(i) corroboration.
- `.planning/phases/13-design-quality-originality-audit/13-CONTEXT.md` — Phase 13 D-01/D-02/D-04/D-13/D-14/D-15/D-16 decisions inherited as fixed input.
- `CLAUDE.md` (repo root) — Architecture invariants 1-8; audit-only milestone discipline (`feedback_executor_scope_creep`).
- `PROJECT.md` — "Surfaced for follow-up (v0.2.2 backlog)" section (Sheet-01, TZ-01, URL-01, CL-01, SEED-01, POLISH-01/02).

### Secondary (MEDIUM confidence)
- `.planning/phases/12-exploratory-feature-walkthrough/12-CONTEXT.md` (selectively read) — D-04 finding template + D-05 issue-vs-backlog rule. Inherited shape.

### Tertiary (LOW confidence)
- None — no claim in this research is sourced solely from web search or unverified material.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — N/A; the phase produces Markdown only.
- Architecture / document structure: HIGH — D-09 locked layout; D-05 schema locked.
- Cluster taxonomy: HIGH — clusters refined from UI-AUDIT.md "Cross-cutting observations" (13 pre-identified) + WALKTHROUGH "Inputs to Phase 14" (9 pre-identified). All 9 candidate clusters have ≥3-surface footprint per D-01.
- Standalone-blocker enumeration: HIGH — directly derived from 8 GitHub issues + 4 backlog cross-links + non-issue-filed WALKTHROUGH blockers/frictions/nits.
- Candidate (i,ii,iii) scores: MEDIUM — applies the locked D-03 rubric to evidence; specific axis-2-vs-1 boundaries require auditor judgment in execution. T-1 through T-7 surface explicit decision points.
- Tier-tally projection: HIGH — direct application of D-03 score-mapping to candidate scores.
- Net-new patterns: MEDIUM — N-1 through N-5 are pattern hypotheses surfaced by combining inputs; planner decides whether each becomes a ranked entry.
- Anti-prescription compliance checklist: HIGH — D-08 grep pattern set is locked; the verification commands derive directly.
- Pitfalls: HIGH — drawn from CONTEXT.md specifics + Phase 12/13 D-domain conventions + the `feedback_executor_scope_creep` memory.

**Research date:** 2026-05-10
**Valid until:** 2026-06-10 (30 days — input artifacts are stable; CONTEXT.md is locked; rubric is locked. The only mutability risk is if v0.2.2 backlog work lands during Phase 14 execution and reconciles a cited cross-link — see Pitfall 6.)

---

*Phase: 14-synthesis-handoff*
*Research completed: 2026-05-10*
