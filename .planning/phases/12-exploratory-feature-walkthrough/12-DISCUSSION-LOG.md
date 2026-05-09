# Phase 12: Exploratory Feature Walkthrough — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 12-exploratory-feature-walkthrough
**Areas discussed:** Severity rubric + issue protocol, Exploration depth & stopping rule, Live AI-API cost handling, Realtime sync coverage

---

## Severity rubric + issue protocol

### Q1: What clears the bar for `blocker` severity (→ mandatory GitHub issue)?

| Option | Description | Selected |
|--------|-------------|----------|
| Strict: crashes + data loss only | Only crashes, 500s, data loss, or 'cannot complete the core flow.' Everything else with workaround = friction. | |
| Standard: above + broken core feature | Crashes/data loss AND any shipped surface where the primary intended action is non-functional even via workaround. | ✓ |
| Permissive: above + visible-on-load defects | Standard plus first-load defects that erode trust. | |

**User's choice:** Standard.
**Notes:** Locked into D-01.

### Q2: What separates `friction` from `nit`?

| Option | Description | Selected |
|--------|-------------|----------|
| Friction = UX delay/confusion; nit = cosmetic only | UX cost (time/attention/confidence) vs purely visual polish. | ✓ |
| Friction = repeat-encounter pain; nit = first-encounter only | 50th-use pain vs fades-with-familiarity. | |
| Friction = blocks 'feels Al Dente'; nit = neutral polish | Anti-brand vs neutral polish — frames severity around v0.3 question. | |

**User's choice:** UX delay/confusion vs cosmetic.
**Notes:** Locked into D-02.

### Q3: GitHub issue template + labels for blocker findings?

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: title + repro steps + WALKTHROUGH link, label `audit:walkthrough` | Single label, simple template, mirrors v0.2.1 [#1] shape. | ✓ |
| Standard: above + severity label + surface label | More labels = more triage power; more setup overhead. | |
| Lean: title + WALKTHROUGH link only, no labels | Minimum viable; harder to filter later. | |

**User's choice:** Minimal.
**Notes:** Locked into D-03 + D-05 (cross-link mechanism).

### Q4: How should friction/nit findings be structured in WALKTHROUGH.md?

| Option | Description | Selected |
|--------|-------------|----------|
| Same template as blockers (repro / expected / actual) | Uniform shape across severities; Phase 14 ranks uniformly. | ✓ |
| Compact: one-line description + screenshot ref | Saves writing time; loses repro fidelity. | |
| Hybrid: blockers full / friction short / nit bullet | Pragmatic but inconsistent format. | |

**User's choice:** Same template.
**Notes:** Locked into D-04.

---

## Exploration depth & stopping rule

### Q1: What governs 'we explored this surface enough'?

| Option | Description | Selected |
|--------|-------------|----------|
| Probe-count: golden + N weird-state probes per surface | 1 golden + ≥3 weird-state probes; predictable scope. | ✓ |
| Time-box: ~15min per surface, hard cap | Bounded duration; same time per rich and thin surfaces. | |
| Satisfaction-based: explore until 'I've seen enough' | Most flexible; hardest to make reproducible. | |

**User's choice:** Probe-count.
**Notes:** Locked into D-07.

### Q2: What kinds of weird-state probes should be emphasized? (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| Garbage / boundary inputs | Empty, long strings, special chars, French diacritics, paste blocks. | ✓ |
| Racing / rapid actions | Double-tap, submit-then-back, tab-flip mid-loading. | ✓ |
| Network / connectivity edge cases | Offline toggle, slow-3G, WS drop, kill-and-reopen. | ✓ |
| Invalid state / weird arrival paths | Bad UUIDs, force-refresh mid-cook, deep-link out of order. | ✓ |

**User's choice:** All four.
**Notes:** Locked into D-08.

### Q3: How to handle state drift between probes within a surface?

| Option | Description | Selected |
|--------|-------------|----------|
| Accept drift; document state at start of each probe | Reflects natural user state evolution. | ✓ |
| Reseed before each surface (not each probe) | ~13 reseeds; cheap with idempotent CLI. | |
| Reseed only when state genuinely blocks a probe | Pragmatic but introduces variability into 'starting state.' | |

**User's choice:** Accept drift.
**Notes:** Locked into D-09. Phase 11 teardown→refresh CLI on hand as escape hatch.

### Q4: What's the rough time budget for the whole phase?

| Option | Description | Selected |
|--------|-------------|----------|
| Half-day (~4h): one focused session | Single-session end-to-end; depth shallower on rich surfaces. | ✓ |
| Full day (~6-8h): one session, deeper per surface | Most likely to land all 4 success criteria in one go. | |
| Multi-session, 2-3 days, soak-test friendly | Catches overnight stale-state bugs; slowest. | |

**User's choice:** Half-day.
**Notes:** Locked into D-10. Probe-count rule (D-07) governs depth; 4h is soft constraint.

---

## Live AI-API cost handling

### Q1: How should the walkthrough cover the AI-touching surfaces (voice / photo / url / voice-modify)?

| Option | Description | Selected |
|--------|-------------|----------|
| Full live coverage; spend is fine | ~$0.50 worst-case; tests what users experience. | ✓ |
| Sample-then-probe-offline | 1 live golden + offline-equivalent probes. | |
| Skip AI-side; audit UI + integration glue only | Cheapest; misses prompt round-trip layer. | |

**User's choice:** Full live coverage.
**Notes:** Locked into D-12.

### Q2: Voice + photo + URL inputs — fresh-per-probe or canned reusable set?

| Option | Description | Selected |
|--------|-------------|----------|
| Canned reusable set, committed to phase artifacts | Reproducible, isolates Gemini non-determinism. | ✓ |
| Fresh per probe; let the auditor improvise | More authentically exploratory; less reproducible. | |
| Hybrid: 1 canned golden + improvised edge probes | Reproducibility on baseline; freshness on edges. | |

**User's choice:** Canned reusable set.
**Notes:** Locked into D-13. Committed under `.planning/v0.3/walkthrough-inputs/`.

### Q3: URL capture is on the backlog as broken (URL-01). How should the walkthrough handle it?

| Option | Description | Selected |
|--------|-------------|----------|
| Probe normally; document as a finding (already known-blocker) | Cross-link URL-01 backlog instead of new issue. | ✓ |
| Skip URL surface; note 'covered by URL-01 backlog' | Saves time; misses NEW URL-related issues. | |
| Probe only the surface, not the extraction outcome | Catches frontend issues without adding noise. | |

**User's choice:** Probe normally + document as finding.
**Notes:** Locked into D-14. Triggered the broader D-06 backlog dedupe rule.

---

## Realtime sync coverage

### Q1: How should realtime sync be probed?

| Option | Description | Selected |
|--------|-------------|----------|
| Two Playwright MCP browser contexts in one session | Member #3 + member #4 in same session via `browser_tabs`. | ✓ |
| Playwright + your iPhone live | High fidelity; requires you live-active during audit. | |
| Stub it: connection-only verification | Misses actual user value of realtime. | |

**User's choice:** Two Playwright MCP browser contexts.
**Notes:** Locked into D-15. Member #4 persists in synthetic household post-phase.

### Q2: Which realtime events need explicit cross-client probes? (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| recipe.created + recipe.promoted | Capture loop; drafts inbox slide-up. | ✓ (via 'all of the above') |
| vote.created + vote state transitions | Decide loop; 5 computed states recompute on receiver. | ✓ (via 'all of the above') |
| cooking_log.* (created / finalized) | Cooking banner appears for partner, disappears on finalize. | ✓ (via 'all of the above') |
| All of the above (full sync coverage) | ~6 events × 1 probe each. Reasonable in 4h budget. | ✓ |

**User's choice:** All of the above.
**Notes:** Locked into D-16. ~6-7 cross-client probes total.

### Q3: Realtime probe latency / reconnect behavior — how aggressively?

| Option | Description | Selected |
|--------|-------------|----------|
| Observation-only: fire and verify it arrives within a few seconds | Qualitative arrival check; one reconnect probe. | ✓ |
| Add timing budget: assert events arrive < 1s | More signal for Phase 14; more rigor. | |
| Stress: rapid-fire and out-of-order arrivals | Catches dropped/ordering bugs; expensive per event. | |

**User's choice:** Observation-only.
**Notes:** Locked into D-17. Stress probes deferred (see Deferred Ideas).

---

## Claude's Discretion

The auditor / planner / executor decides without re-asking:

- Exact file structure under `.planning/v0.3/walkthrough-inputs/` (subdirs vs flat).
- `.gitkeep` placeholders for `walkthrough-screenshots/`.
- Two-context realtime invocation patterns (single session vs sequential MCP calls).
- Surfacing Gemini call counts in WALKTHROUGH (per-section vs phase-level summary).
- GitHub issue filing tooling (recommended: `gh issue create`).
- Order of weird-state probes within a surface.
- Header level for surfaces in WALKTHROUGH.md (recommend level-2).

## Deferred Ideas

- Realtime latency / timing assertions (D-17 chose observation-only).
- Stress / rapid-fire realtime probes.
- Per-surface GitHub issue labels.
- Multi-session walkthrough.
- Cross-browser audit (out of scope per REQUIREMENTS.md).
- Closing v0.2.2 backlog during walkthrough (out of scope per executor scope creep guard).
- Push notification load/timing testing.
- Phase 14 ranking algorithm.
