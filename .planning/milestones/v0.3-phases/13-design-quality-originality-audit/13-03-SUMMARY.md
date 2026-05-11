---
phase: 13-design-quality-originality-audit
plan: 03
subsystem: ui
tags: [audit, ui, visual, design, exports, push, realtime, onboarding, settings]

requires:
  - phase: 12-exploratory-feature-walkthrough
    provides: WALKTHROUGH.md §Exports/Push/Realtime/Onboarding/Settings sections (24 probes total — exports E01-E04, push Pu01-Pu05, realtime RT-CookieIsolation+RT-1..RT-7, onboarding O01-O05, settings S01-S05)
  - phase: 13-01
    provides: rubric calibration from 5 capture surfaces (mean 20.6/24); confirms emerald-Tailwind-literal pattern as a recurring token-completeness gap; D-16 Partially reached precedent
  - phase: 13-02
    provides: rubric calibration from 4 decide+cook surfaces (mean 19.75/24); recurring emerald-literal pattern at 4-surface scope; multi-screen-in-one-file pattern via cooking-log
provides:
  - 5 per-surface UI-REVIEW.md files (exports, push, realtime, onboarding, settings)
  - 9 PNG screenshots committed under .planning/v0.3/ui-reviews/screenshots/
  - **CLOSES the 14-surface scoring set** (5 capture + 4 decide+cook + 5 cross-cutting = 14, matching CONTEXT D-05 + WALKTHROUGH §-headers exactly)
  - Audit-time delta on WALKTHROUGH §O-04 (palette has 5 swatches not 4 — blocker stands at higher N)
  - POLISH-02 RESOLVED confirmation at both `/onboarding/share-code` AND `/settings` Card 2
  - Live re-confirmation of P-12-Pu-02 (no Settings recovery for opt-out push users), P-12-S02 [#8] (PATCH 405), P-12-S05 (hardcoded Historique strings)
  - Cross-link establishment: emerald-Tailwind-literal pattern (Plan 13-02) + MEMBER_COLORS hex literals (Plan 13-03) form a single coordinated v0.4 token-completeness fix scope
affects: [13-04-aggregator, 14-synthesis-and-handoff]

tech-stack:
  added: []  # audit-only
  patterns:
    - 6-pillar rubric per CONTEXT D-06 (manual scoring, no per-surface agent spawn)
    - D-13 score-docking on user-impact-per-pillar
    - D-16 "Partially reached" applied to push (OS notification UI not auditable as frontend surface)
    - D-05 multi-screen-per-file applied to onboarding (4 screens in ONE UI-REVIEW)
    - Cross-cut documentation: settings-UI-REVIEW.md cross-links exports-UI-REVIEW.md to avoid Phase 14 double-counting

key-files:
  created:
    - .planning/v0.3/ui-reviews/exports-UI-REVIEW.md
    - .planning/v0.3/ui-reviews/push-UI-REVIEW.md
    - .planning/v0.3/ui-reviews/realtime-UI-REVIEW.md
    - .planning/v0.3/ui-reviews/onboarding-UI-REVIEW.md
    - .planning/v0.3/ui-reviews/settings-UI-REVIEW.md
    - .planning/v0.3/ui-reviews/screenshots/exports-canonical.png
    - .planning/v0.3/ui-reviews/screenshots/push-banner-canonical.png
    - .planning/v0.3/ui-reviews/screenshots/realtime-home-loci.png
    - .planning/v0.3/ui-reviews/screenshots/realtime-inbox-drafts.png
    - .planning/v0.3/ui-reviews/screenshots/onboarding-welcome.png
    - .planning/v0.3/ui-reviews/screenshots/onboarding-create.png
    - .planning/v0.3/ui-reviews/screenshots/onboarding-join.png
    - .planning/v0.3/ui-reviews/screenshots/onboarding-share-code.png
    - .planning/v0.3/ui-reviews/screenshots/settings-canonical.png

key-decisions:
  - "push verdict = Mixed ⚠ with Pillar 6 = 0/4 despite clean visible artifact. Reasoning: three structural frictions stack (P-12-Pu-02 no Settings recovery + P-12-Pu-04 no admin-test fire + P-12-Pu-05 deferred round-trip) and the visible banner is fine — Pillar 6 separates visible quality from user-impact-over-time, and the latter scores zero independently. Calibration test for D-13 docking discipline."
  - "realtime verdict = Feels Al Dente ✅ as cross-cutting surface despite emerald-Tailwind-literal recurrence on the cooking-banner ChefHat. Reasoning: the structural realtime UX (event arriving + system re-rendering across 3 visual loci) is too cohesive to dock to ⚠ on a token-completeness paper cut; the dock applies as Pillar 3 -1 not as a verdict change."
  - "settings verdict = Feels Al Dente ✅ on a typically utility-shaped surface. Reasoning: the 4-Card stack refuses the boilerplate Settings list pattern, the Foyer Card carries the load-bearing identity signature (Fraunces italic terracotta wide-tracking invite-code byte-for-byte mirror of share-code), and the field-label-as-section-title discipline refuses to invent H2 chrome. The structural blocker (S-02 [#8] member-name unchangeable) is a Pillar 6 dock target, not a verdict killer per CONTEXT D-01."
  - "onboarding share-code captured by source review + cross-link to /settings Card 2 rather than navigation. Reasoning: T-02 forbids logout / re-onboarding the auditor; share-code redirects without ?code= query param; the equivalent identity-display surface is reachable on /settings (mirrored byte-for-byte per Phase 9 D-08), making the design verifiable without violating the auditor session."
  - "Audit-time delta documented inline rather than re-filing [#7]. Reasoning: WALKTHROUGH §O-04 stated palette has 4 swatches; live frontend/lib/colors.ts shows 5 — the blocker stands at higher N (5-member capacity ceiling instead of 4) but the underlying terminal-state UX gap is unchanged. Phase 14 reconciliation point."

patterns-established:
  - "D-16 Partially reached notation applied to push (OS notification UI not a frontend surface; in-app banner reached, end-to-end delivery deferred per P-12-Pu-05)"
  - "Cross-cutting surface pattern (realtime): standard 6-pillar skeleton + Locus 1/2/3 sub-sections under Detailed Findings — same shape as multi-screen-per-file (onboarding) for aggregator readability"
  - "Screenshot reuse across plans: Plan 13-03 realtime-UI-REVIEW.md cross-references shortlist-canonical.png from Plan 13-02 for the cooking-banner locus when active cook absent on audit day; refuses synthetic-screenshot pollution"
  - "Cross-link discipline for shared surfaces: settings-UI-REVIEW.md explicitly notes that Sauvegarde Card is scored separately in exports-UI-REVIEW.md so Phase 14 doesn't double-count"

requirements-completed: [AUDIT-01, AUDIT-02, AUDIT-03]

duration: ~2h
completed: 2026-05-10
---

# Phase 13 Plan 03 Summary

**5 per-surface 6-pillar UI reviews of cross-cutting + thinner surfaces (exports, push, realtime, onboarding, settings) — closes the 14-surface scoring set; 5 of 14 surfaces earn ✅ verdict; emerald-literal + MEMBER_COLORS-literal patterns identified as coordinated v0.4 fix scope.**

## Score table (Plan 13-03 only)

| Surface | Verdict | Score | Pillar 6 dock driver |
|---------|---------|-------|----------------------|
| exports | Mixed ⚠ | 19/24 | P-12-E02 offline button + P-12-E03 double-fetch + iOS-tab-not-download annotation (3 frictions stack) |
| push | Mixed ⚠ | 19/24 | P-12-Pu-02 no Settings recovery + P-12-Pu-04 no admin-test fire + P-12-Pu-05 deferred round-trip (3 frictions → Pillar 6 = 0/4) |
| realtime | Feels Al Dente ✅ | 21/24 | TZ-01 timezone bug + cooking.finalized doc drift (Pillar 6 -2; cross-cutting surface) |
| onboarding | Feels Al Dente ✅ | 21/24 | P-12-O01 missing route guard + P-12-O04 capacity ceiling (Pillar 6 -2) |
| settings | Feels Al Dente ✅ | 21/24 | P-12-S02 [#8] PATCH 405 + P-12-S03 no Quitter le foyer (Pillar 6 -2) |

**Mean (Plan 13-03 only):** 20.2/24 across 5 surfaces.

## Milestone scoring set summary (all 14 surfaces — Plans 13-01 + 13-02 + 13-03)

| Surface | Verdict | Score | Plan |
|---------|---------|-------|------|
| capture-voice | Feels Al Dente ✅ | 22/24 | 13-01 |
| capture-quick | Mixed ⚠ | 21/24 | 13-01 |
| capture-url | Mixed ⚠ | 21/24 | 13-01 |
| shortlist | Feels Al Dente ✅ | 21/24 | 13-02 |
| realtime | Feels Al Dente ✅ | 21/24 | 13-03 |
| onboarding | Feels Al Dente ✅ | 21/24 | 13-03 |
| settings | Feels Al Dente ✅ | 21/24 | 13-03 |
| capture-photo | Mixed ⚠ | 20/24 | 13-01 |
| vote | Mixed ⚠ | 20/24 | 13-02 |
| cooking-log | Mixed ⚠ | 20/24 | 13-02 |
| capture-full | Mixed ⚠ | 19/24 | 13-01 |
| exports | Mixed ⚠ | 19/24 | 13-03 |
| push | Mixed ⚠ | 19/24 | 13-03 |
| history | Mixed ⚠ | 18/24 | 13-02 |

**Verdict distribution (14 surfaces):**

- Feels Al Dente ✅: **5** (capture-voice, shortlist, realtime, onboarding, settings)
- Mixed ⚠: **9** (capture-quick, capture-url, capture-photo, vote, cooking-log, capture-full, exports, push, history)
- Feels Generic ❌: **0**

**Cumulative mean (all 14 surfaces):** **20.21/24**

**Lowest:** history 18/24 ⚠ (P-12-H-01 CL-01 + P-12-H-02 [#6] + P-12-H-03 — surface effectively decommissioned by missing GET endpoint + missing detail route)

**Highest:** capture-voice 22/24 ✅ (Plan 13-01 — sole surface to score above 21; the gestural-listening UI + waveform-aware transcript display)

**Partially reached per D-16:** **2 surfaces** — push (OS notification UI not a frontend surface; round-trip operator-deferred), history (page renders empty for valid data per CL-01 missing GET endpoint).

## Cross-cutting findings (input to Plan 13-04 + Phase 14)

- **Emerald-Tailwind-literal pattern recurs at 5 surfaces** (shortlist OUI button, vote validé chip border, cooking-log ChefHat icon, realtime cooking-banner ChefHat, *and* now MEMBER_COLORS hex literals from `frontend/lib/colors.ts`). Single coordinated v0.4 token-completeness fix scope: introduce `--color-valide-foreground` / `--color-valide-border` / `--color-cooking-foreground` + `--color-member-{rose,amber,emerald,sky,violet}-{bg,foreground}` semantic tokens; refactor 5+ JSX call sites to consume.
- **POLISH-02 RESOLVED** confirmed at 2 surfaces (`/onboarding/share-code` source + `/settings` Card 2 live snapshot). v0.2.2 backlog item should be marked closed; Phase 14 cross-cutting observations should reconcile.
- **No-debounce-on-submit cluster** spans capture surfaces (P-12-Q03 family from Plan 13-01) and exports (P-12-E03 from this plan). Phase 14 may dedupe these into one cross-cutting friction observation.
- **iOS-Safari PWA edge cases ship as code comments rather than user hints**: exports `page.tsx:92-94` documents "may open in new tab" but no in-UI affordance. Push relies on iOS-PWA-only gate that silently filters non-installed iOS users. Pattern: production-grade engineering knowledge captured at the source level but not surfaced to the user.
- **next-intl invariant #6 violation cluster** (POLISH-01): hardcoded French strings in HomeDecide partner-waiting (per PROJECT.md backlog) + settings Historique Card (`page.tsx:176-179`). Single coordinated v0.2.1 i18n sweep scope.
- **Architecture-invariant violations visible in audit** at 5 surfaces: vote chip semantics broken (#2 — Plan 13-02 [#4]), cooking-log re-finalize doubles cook_count (#3 — Plan 13-02 [#5]), history surface decommissioned (Plan 13-02 CL-01 + [#6]), member-name unchangeable (Plan 13-03 [#8] — implication of "members own their identity"), realtime cooking.finalized 7th broadcast event missing from canonical docs (#4 spine documentation rot). The audit value of v0.3 is consistently surfacing correctness issues that the original implementation guarded conceptually but did not enforce.

## Accomplishments

- realtime, onboarding, settings each earn the ✅ verdict — confirms that surfaces with structural backend issues can still ship clean visible artifacts (the verdict criteria reward editorial discipline + token compliance + system cohesion, NOT absence of bugs)
- D-16 Partially reached precedent extended from history (Plan 13-02) to push (this plan) — the rubric handles "the OS chrome / external system isn't a frontend surface" cleanly without docking innocently
- Audit-time delta on O-04 surfaced a discrepancy between Phase 12 WALKTHROUGH and live code — confirms the live re-audit pattern Plan 13-02 established (where H-02 chrome detail differed) catches real drift
- Single-token-set fix scope across 5 surfaces (emerald + MEMBER_COLORS literals) crystallized as the load-bearing input to v0.4 design-system follow-up
- POLISH-02 backlog reconciliation discovery — TWO live surfaces confirm the Copy button shipped during Phase 9 work but never struck off the list

## Task Commits

1. **Task 1: Score 3 cross-cutting surfaces (exports + push + realtime)** — `43e55d4` (feat)
2. **Task 2: Score 2 surfaces (onboarding + settings) — closes 14-surface scoring set** — `7d6ca68` (feat)

## Files Created/Modified

- 5 UI-REVIEW.md files at `.planning/v0.3/ui-reviews/{exports,push,realtime,onboarding,settings}-UI-REVIEW.md`
- 9 PNGs at `.planning/v0.3/ui-reviews/screenshots/`:
  - `exports-canonical.png`, `push-banner-canonical.png`
  - `realtime-home-loci.png`, `realtime-inbox-drafts.png` (locus 3 cross-references `shortlist-canonical.png` from Plan 13-02)
  - `onboarding-welcome.png`, `onboarding-create.png`, `onboarding-join.png`, `onboarding-share-code.png`
  - `settings-canonical.png`
- Plus this 13-03-SUMMARY.md

## Deviations from Plan

- **Onboarding share-code screenshot deviation** (acceptable per plan body Option A/B clause): direct navigation to `/onboarding/share-code` triggered the `useEffect` redirect (route guards on missing `?code=` query param). Rather than violating T-02 (logout / re-onboarding the auditor) or attempting Option B (fresh ephemeral context — would not have helped because the share-code page only renders after a fresh CREATE flow with the code in the URL), I documented the share-code visual via source review (`frontend/app/onboarding/share-code/page.tsx`) and cross-linked the equivalent identity-display surface on `/settings` Card 2 (mirrored byte-for-byte per Phase 9 D-08). The captured `onboarding-share-code.png` documents the redirect behavior — itself a positive finding (share-code self-protects via route guard, distinguishing it from welcome/create/join which do NOT — P-12-O01 friction).
- **Realtime locus 3 (cooking banner) audit-day inactive**: no active cook in the synthetic household at Plan 13-03 audit time (likely TZ-01 adjacent, the same backend filter compromises the home-page cooking banner mount). Documented inline; cross-linked to Plan 13-02's `shortlist-canonical.png` which captured locus 3 in its live state. Refuses synthetic-data manipulation to force the state.

## Issues Encountered

- **Audit-time delta on WALKTHROUGH §O-04 palette count**: Phase 12 WALKTHROUGH stated "the locked palette has only 4 swatches per ColorSwatchPicker" — live `frontend/lib/colors.ts` (read 2026-05-10) shows 5 swatches: rose / amber / emerald / sky / violet. Either the WALKTHROUGH miscounted, or `MEMBER_COLORS` was extended between Phase 12 (2026-05-09) and Phase 13 (2026-05-10) — git blame would confirm. The blocker stands (capacity ceiling exists at N=5 instead of N=4); [#7] text should be reconciled in Phase 14 cross-cutting observations.
- **POLISH-02 already resolved**: discovered at 2 surfaces during Plan 13-03 audit (`/onboarding/share-code` source + `/settings` Card 2 live snapshot). v0.2.2 backlog item appears to have shipped during Phase 9 work without backlog hygiene update. Not a Plan 13-03 deviation — a Phase 14 reconciliation finding.

## User Setup Required

None - audit-only plan; no external service configuration changes; no product code modified.

## Next Phase Readiness

- **Plan 13-04 (UI-AUDIT.md milestone aggregator)** is unblocked. All 14 per-surface UI-REVIEW.md files exist; aggregator reads cleanly with consistent 6-pillar table format.
- **Phase 14 (Synthesis & Handoff)** has both load-bearing inputs ready: (a) WALKTHROUGH.md (probe-level findings) + (b) UI-AUDIT.md (will be produced by Plan 13-04 from the 14 per-surface files). The two coordinated v0.4 fix scopes (emerald + MEMBER_COLORS token-completeness; POLISH-01 i18n sweep) plus the architecture-invariant violation cluster are the load-bearing themes for ASSESSMENT.md ranking.
- **Hard constraint honored:** `git status frontend/ backend/` clean across both task commits. No product code modified.
- **Score calibration stable:** Plan 13-03 mean (20.2/24) tracks closely to cumulative mean (20.21/24); D-13 docking discipline produced consistent 1-2 pillar dock per WALKTHROUGH-blocker, 1 pillar dock per friction across all 5 surfaces.

---
*Phase: 13-design-quality-originality-audit*
*Plan: 03*
*Completed: 2026-05-10*
