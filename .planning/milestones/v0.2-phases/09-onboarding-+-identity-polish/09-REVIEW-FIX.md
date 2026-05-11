---
phase: 09-onboarding-+-identity-polish
fixed_at: 2026-05-08T19:45:00Z
review_path: .planning/phases/09-onboarding-+-identity-polish/09-REVIEW.md
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 9: Code Review Fix Report

**Fixed at:** 2026-05-08T19:45:00Z
**Source review:** .planning/phases/09-onboarding-+-identity-polish/09-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 1 (Critical + Warning)
- Fixed: 1
- Skipped: 0

## Fixed Issues

### WR-01: BottomNav `<nav>` aria-label is incorrect (`Accueil` instead of a navigation label)

**Files modified:** `frontend/components/BottomNav.tsx`
**Commit:** `54667eb`
**Applied fix:** Replaced `aria-label={t("home")}` (which rendered as "Accueil", the Home tab string) on the `<nav>` landmark element with a hardcoded French label `aria-label="Navigation principale"`. Added a `TODO(productize)` marker noting that this should migrate to a dedicated `nav.aria_label` i18n key in a future phase once new key additions are permitted.

**Rationale for hardcoded interim:**
- Phase 9 invariant: ZERO new i18n keys allowed. Adding a `nav.aria_label` key would violate this constraint.
- Reusing an existing key was not viable: no existing key in `frontend/lib/i18n/fr.json` semantically describes a navigation landmark (existing `nav.*` keys are tab labels: `home`, `recipes`, `drafts`, `more`).
- The current value (`"Accueil"`) was actively misleading to assistive tech, announcing "Accueil — navigation" on every page including non-Home pages.
- App is French-only in v0.1, so a hardcoded French string is functionally equivalent to a translated key for the current audience.
- Pattern is consistent with the recommendation in REVIEW.md Option A (`aria-label="Navigation principale"` + TODO marker).

**Verification:**
- Tier 1: Re-read BottomNav.tsx lines 79-87, confirmed `aria-label="Navigation principale"` is present with TODO comment, `<nav>` element structure intact, className unchanged.
- Tier 2: `npx tsc --noEmit` from `frontend/` completed without errors.

---

_Fixed: 2026-05-08T19:45:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
