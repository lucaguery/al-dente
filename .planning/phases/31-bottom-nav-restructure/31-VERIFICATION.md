---
phase: 31
phase_name: Bottom nav restructure
status: human_needed
verified_at: 2026-05-18
plans_complete: 1/1
must_haves_score: 4/4
auto_gates: passed
human_verification: required
---

# Phase 31: Bottom nav restructure — Verification Report

## Goal restatement

Users can reach the recipe capture flow in one tap from any authenticated screen via a visually elevated central « Ajouter » button — the bottom nav's intent is unambiguous.

## Automated gates

All grep, type, and lint gates pass.

| # | Gate | Source | Result |
|---|------|--------|--------|
| G1 | `variant: "tab"` AND `variant: "central-cta"` both present in `frontend/components/BottomNav.tsx` (ROADMAP #4, D-14) | grep | ✓ PASS — types at L25/L34; TABS entries L43-46; type narrowing at L63/L80/L105 |
| G2 | `usePathname()` is the active-matching source (D-09) | grep | ✓ PASS — `import { usePathname, ... }` at L4; `const pathname = usePathname()` at L51 |
| G3 | `useSelectedLayoutSegment()` retained **only** for onboarding hide gate (D-10) | grep | ✓ PASS — `segment?.startsWith("onboarding")` at L57 |
| G4 | i18n keys: `nav.profile = "Profil"`, `nav.add = "Ajouter"`; `nav.settings` (under nav) gone (D-15, D-16) | grep | ✓ PASS — fr.json has home/recipes/profile/add under `nav`; the iOS Settings namespace at top level is correct (unrelated to nav label) |
| G5 | `<main>` padding bumped to `pb-[calc(5rem+env(safe-area-inset-bottom))]` (D-07) | grep | ✓ PASS — `app/layout.tsx:68` |
| G6 | Nav band height bumped to `min-h-[4.5rem]` (D-05) | grep | ✓ PASS — `BottomNav.tsx:75` |
| G7 | No stale `pb-[calc(4rem` anywhere in `frontend/` (clean rewrite per MVP posture) | grep | ✓ PASS — 0 hits |
| G8 | `aria-current="page"` set on active link in BOTH variant branches (ROADMAP #2) | grep | ✓ PASS — L89 (CTA branch) + L111 (flat-tab branch) |
| G9 | `Plus` icon imported from `lucide-react`; used with `aria-hidden` on the glyph (D-16, D-17) | grep | ✓ PASS — L6 import; L96 usage |
| G10 | No stale `t("settings")` callers post-rename | grep | ✓ PASS — 0 hits across `frontend/` |
| G11 | `pb-[env(safe-area-inset-bottom)]` preserved on the nav element (ROADMAP #3) | grep | ✓ PASS — L75 |
| G12 | TypeScript: no new errors in Phase 31 files (`BottomNav.tsx`, `layout.tsx`, `fr.json`) | `npx tsc --noEmit` | ✓ PASS — 0 errors in touched files; pre-existing 2 errors in `tests/e2e/recipe-detail.spec.ts` + `lib/recipe-completeness.test.ts` are unrelated to this phase |
| G13 | ESLint: clean on `BottomNav.tsx` and `app/layout.tsx` | `npx eslint` | ✓ PASS — "No issues found" |

## Must-haves (4/4 from ROADMAP Phase 31 success criteria)

### M1 — Filled primary circle with white `+` and `Ajouter` label, visibly elevated above flat sibling tabs

**Status:** ✓ Code review confirms.
**Verified by:** Discriminated-union `Tab` type (`variant: "central-cta"`), `<Plus>` glyph from lucide-react, `bg-primary` always-filled circle at 56 px (`w-14 h-14`), `text-primary-foreground` for the glyph, label "Ajouter" below the circle via `t("add")`, nav band raised to `min-h-[4.5rem]`. The 5-slot mockup language ("four flat sibling tabs") was the eventual target; Phase 31 ships the 4-slot variant per CONTEXT D-01 (3 flats + 1 CTA), with « Suggérer » deferred to gh#26.

### M2 — `aria-current="page"` set on the central CTA on the capture entry route + keyboard/SR reachable

**Status:** ✓ Code confirms.
**Verified by:** G8 (aria-current="page" on both variants when `active === true`); landmark `<nav aria-label="Navigation principale">`; native `<Link>` elements participate in keyboard Tab order; `Plus` glyph is `aria-hidden` so the accessible name comes from the visible `Ajouter` label (no name collision).
**Human spot-check recommended:** see HUMAN-UAT item H1.

### M3 — Drafts-tab badge + safe-area inset + `/onboarding/*` hiding all preserved

**Status:** ✓ Code confirms.
**Verified by:**
- Drafts-tab badge: **none exists** — Phase 27 D-11 removed the drafts route + tab + badge. CONTEXT D-18 documents this REQ clause as resolved. No regression possible.
- Safe-area inset: G11 (preserved on nav element).
- Onboarding hide: G3 (`segment?.startsWith("onboarding")` gate kept).
**Human spot-check recommended:** see HUMAN-UAT item H2 (safe-area math on real iPhone).

### M4 — Per-tab variant discriminator grep gate passes

**Status:** ✓ G1 PASS.

## Requirements coverage

| REQ-ID | Phase plan | Status |
|--------|------------|--------|
| NAV-01 | 31-01 | ✓ Covered — plan frontmatter `requirements_addressed: [NAV-01]` |

1/1 phase requirements addressed by plans. No orphans.

## Architecture invariants check

| # | Invariant | Status |
|---|-----------|--------|
| 6 | French-only via `next-intl`, day one | ✓ All new labels (`Ajouter`, `Profil`) routed through `useTranslations("nav")` + `fr.json`. No hardcoded user-facing strings introduced. |
| MVP | Clean rewrites, no back-compat shims | ✓ `nav.settings` deleted in the same change that added `nav.profile`; no parallel keys. Old `pb-[calc(4rem...)]` deleted, not feature-flagged. |

## Code review summary (cross-reference)

Per `31-REVIEW.md`: 0 Critical, 0 Warning, 2 Info findings. Both Info findings (IN-01 `CentralCTA.pathname` duplicates `href` for predicate uniformity; IN-02 hardcoded `aria-label="Navigation principale"` flagged by its own `TODO(productize)`) are acknowledged and explicitly out of scope — no action required.

## Human verification required (HUMAN-UAT)

Three items need eyes on a real device. These can be deferred — the code is correct; only the perceptual checks remain.

### H1 — Visual elevation reads as primary affordance on real screen
**Expected:** On an iPhone (or any iOS Safari at the PWA viewport), the central « Ajouter » circle reads as the loudest, most-tappable element on the bottom nav. The 56 px vs 40 px ratio + filled terracotta vs no-fill siblings should make this obvious without instruction.
**How to check:** Open the deployed PWA at any authenticated screen. The CTA should pop. If it looks "same as the others, just colored", the spec is in spirit failing even though the code is correct.

### H2 — Safe-area math correct at 5rem nav band on iPhone X+
**Expected:** No clipping of the CTA's label against the home-indicator area. No overlap between the nav and the last row of content on `/recipes`, `/`, `/settings`, or `/recipes/[id]`. The 5rem + safe-area-inset additive padding should leave a clean gap.
**How to check:** Scroll to the bottom of each authenticated screen on a notched iPhone PWA. Confirm the last item is fully visible above the nav and the CTA label is not pushed into the home-indicator area.

### H3 — Screen-reader reachability and landmark navigation
**Expected:** VoiceOver (iOS) or TalkBack should announce the nav as "Navigation principale". Swiping through tabs should reach all 4 slots (Accueil / Recettes / Ajouter / Profil) in left-to-right order. The Ajouter button should announce "Ajouter, bouton" (or equivalent French SR phrasing). When on `/recipes/new`, VoiceOver should announce "page actuelle" on the CTA.
**How to check:** Enable VoiceOver, swipe right through the nav from a non-capture route, then navigate to `/recipes/new` and re-traverse the nav.

## Verdict

- **Automated verification:** ✓ PASSED — all 13 gates, 4/4 must-haves, 1/1 REQ covered, both invariants intact.
- **Code review:** ✓ Clean — 0 Critical / 0 Warning.
- **Cross-phase regression:** ✓ No new TypeScript errors; ESLint clean on touched files.
- **Status:** `human_needed` — the 3 HUMAN-UAT items above require real-device sanity checks before the phase can be declared "feels Al Dente." The code is verifiably correct; only perceptual confirmation remains.

The phase is mergeable as-is; the HUMAN-UAT items will surface via `/gsd-audit-uat` and can be resolved at the user's next opportunity to grab an iPhone.
