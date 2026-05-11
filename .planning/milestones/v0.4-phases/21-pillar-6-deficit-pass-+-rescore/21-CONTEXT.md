# Phase 21: Pillar 6 deficit pass + rescore - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning
**Mode:** Auto (--auto)

<domain>
## Phase Boundary

Re-score the v0.3 UI-AUDIT's 9 Mixed surfaces under the SAME 6-pillar rubric, after Phases 15-20 closed most of the Pillar 6 deficit drivers. Document the verdict shifts + cumulative-mean delta in `.planning/v0.4/UI-RESCORE.md`. Target: ≥3 surfaces flip from ⚠ Mixed to ✅ Feels Al Dente.

**Key observation:** the Pillar 6 deficit in v0.3 was driven by SPECIFIC BUGS — not by missing identity work. Phases 15-20 fixed them:

| Surface | v0.3 verdict | Pillar 6 driver (now closed) | Closure plan |
|---------|--------------|------------------------------|--------------|
| vote | Mixed ⚠ 20/24 | MEMBER_COUNT=2 hardcode (INV-01) | Phase 15 |
| cooking-log | Mixed ⚠ 20/24 | cook_count re-finalize doubling (INV-02) | Phase 15 |
| capture-full | Mixed ⚠ 19/24 | ingredient parser duplication (CAP-03) | Phase 16 |
| capture-voice | (Al Dente ✅ 22/24 BUT Pillar 6 = 2/4) | stuck `(extraction en cours…)` (CAP-01) | Phase 16 |
| capture-photo | Mixed ⚠ 20/24 | Sheet-01 viewport bug (VAL-01) | Phase 19 |
| history | Mixed ⚠ 18/24 | missing GET endpoint + detail route (HIST-01/02) | Phase 17 |
| push | Mixed ⚠ 19/24 | no recovery + no admin-test (VAL-02/03) | Phase 19 |
| capture-quick | Mixed ⚠ 21/24 | 422-as-network-loss copy + no debounce (P-12-Q02/03) | NOT directly closed |
| capture-url | Mixed ⚠ 21/24 | URL-01 # TODO(productize) | EXPLICITLY out of scope per PROJECT.md |
| exports | Mixed ⚠ 19/24 | offline button + double-fetch race | NOT directly closed |

**6 of the 9 Mixed surfaces** had their Pillar 6 drivers explicitly closed by Phases 15-20. Re-scoring those alone should hit the ≥3 flip target easily.

Out of scope: 6-pillar rubric revision (P6-02 explicitly says SAME rubric); brand redesign; the 3 surfaces whose drivers are NOT closed (capture-quick, capture-url, exports — they stay Mixed for v0.4 ship).

</domain>

<decisions>
## Implementation Decisions

### P6-01: Re-score the closed-driver surfaces

- **D-21-01:** Re-score these 6 surfaces under the SAME `/gsd-ui-review` 6-pillar rubric:
  - **vote** (INV-01 closed) — expected: Pillar 6 → 3/4 (chip now computes correctly for N members; one minor friction remains around partner-vote dot positioning to keep below 4/4).
  - **cooking-log** (INV-02 closed) — expected: Pillar 6 → 3/4 (double-tap idempotent now).
  - **capture-full** (CAP-03 closed) — expected: Pillar 6 → 3/4 (ingredient round-trip clean; submit-debounce gap remains, so keep below 4/4).
  - **capture-photo** (VAL-01 closed) — expected: Pillar 6 → 3/4 (sheet within viewport; visuals back to 4/4 since the offset bug no longer compromises chrome).
  - **history** (HIST-01/02 closed) — expected: Pillar 6 → 3/4 (full list + detail loop reachable end-to-end).
  - **push** (VAL-02/03 closed) — expected: Pillar 6 → 3/4 (settings recovery + admin test reachable; round-trip still HUMAN-UAT-pending so we're conservative).
- **D-21-02:** Expected verdict shifts under the same rubric:
  - vote: Mixed 20/24 → Al Dente 22/24 (Pillar 6 +1, Pillar 3 +1 since emerald literal fixed in Phase 20)
  - cooking-log: Mixed 20/24 → Al Dente 22/24 (Pillar 6 +1, Pillar 3 +1)
  - capture-full: Mixed 19/24 → Al Dente 22/24 (Pillar 6 +1, Pillar 1 +1 since parser fix unblocks the copy, Pillar 3 +1 if any emerald present)
  - capture-photo: Mixed 20/24 → Al Dente 22/24 (Pillar 6 +2, Pillar 2 +1)
  - history: Mixed 18/24 → Al Dente 22/24 (Pillar 6 +2, Pillar 2 +1, Pillar 1 +1)
  - push: Mixed 19/24 → Al Dente 22/24 (Pillar 6 +3)
- **D-21-03:** Conservative target: at least 4 of these 6 surfaces flip (one or two may need a micro-polish tweak to cross the threshold). Exceeds the ≥3 ROADMAP target by buffer.

### P6-02: Document the deltas in UI-RESCORE.md

- **D-21-04:** Create `.planning/v0.4/UI-RESCORE.md` consolidating:
  - Per-surface old-vs-new score table (verdict shift, pillar breakdown, primary driver).
  - Cumulative-mean delta vs the 20.21/24 v0.3 baseline. With 6 surfaces flipping +2-4 points, expected new cumulative mean: ~21.5-22/24 (+1.3 to +1.8 over baseline).
  - Per-surface rescoring evidence — citation of the Phase 15-20 SUMMARY that closed the driver.
- **D-21-05:** Update each affected per-surface `ui-reviews/*-UI-REVIEW.md` Pillar 6 dock notes — leave the v0.3 historical notes intact, append a Phase 21 dated update noting the driver closure and the new score.

### Pillar 6 micro-polish (if needed)

- **D-21-06:** If a target surface doesn't legitimately cross to Al Dente even after the driver closure, the executor agent is authorized to make ONE targeted micro-polish edit (motion timing tweak, copy tone, empty-state copy, etc.). Limit: ≤20 lines per surface. No new components.
- **D-21-07:** No brand redesign, no new identity primitives, no new tokens (Phase 20 closes that work).

### Test coverage

- **D-21-08:** No new tests (rescoring is a documentation activity). Existing test suites are the regression guards.

</decisions>

<canonical_refs>
## Canonical References

- `CLAUDE.md` §"Architecture invariants" — none introduced or relaxed.
- `.planning/v0.3/UI-AUDIT.md` — the canonical baseline (cumulative mean 20.21/24 across 14 surfaces).
- `.planning/v0.3/ui-reviews/*-UI-REVIEW.md` — 14 per-surface files. Phase 21 appends Phase-21-dated update sections.
- `.planning/v0.3/ASSESSMENT.md` — the synthesis doc anchoring the original Pillar 6 deficit observation.
- Phase 15-20 SUMMARY.md files — the closure evidence cited in UI-RESCORE.md.
- `/gsd-ui-review` rubric — the 6-pillar scoring rubric (Copywriting / Visuals / Color / Typography / Spacing / Experience Design, each 0-4). SAME rubric, not revised (P6-02 explicit).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- 14 existing per-surface UI-REVIEW files. Append-only updates, no new files needed.
- Phase 20's `/styleguide` Phase 20 tokens section is the design-system acceptance gate referenced by the rescoring.

### Established Patterns
- v0.3 Phase 13's rescoring discipline: per-surface markdown with frontmatter (status / verdict / pillar scores) + a body section per pillar with evidence.
- Cumulative mean reported as `N/24` to one decimal place.

### Integration Points
- Phase 21 is the milestone capstone — its UI-RESCORE.md feeds the milestone audit (lifecycle step 5a).

</code_context>

<specifics>
## Specific Ideas

- The rescoring honesty principle: if a flip is borderline (3.5/4 on Pillar 6, etc.), keep the surface at Mixed rather than over-claiming. The ROADMAP target is ≥3 surfaces — generous buffer from 6 candidates.
- HUMAN-UAT items (Phase 16/17/18/19 deferred) explicitly noted as caveats per surface — rescoring works against current code shape, not against unfilled UAT.

</specifics>

<deferred>
## Deferred Ideas

- capture-quick: P-12-Q02 (toast copy reads 422 as network loss) + P-12-Q03 (no submit debounce) — these were never opened as v0.4 reqs. v2 polish.
- capture-url: URL-01 stays `# TODO(productize)`. Surface remains Mixed for v0.4 ship.
- exports: P-12-E02/E03 not on the v0.4 docket.
- 6-pillar rubric revision (4.5 / 0.5 increments, new pillar weights, etc.) — v2.

</deferred>

---

*Phase: 21-pillar-6-deficit-pass-+-rescore*
*Context gathered: 2026-05-11*
