---
phase: 31-bottom-nav-restructure
reviewed: 2026-05-18T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - frontend/components/BottomNav.tsx
  - frontend/app/layout.tsx
  - frontend/lib/i18n/fr.json
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: issues_found
---

# Phase 31: Code Review Report

**Reviewed:** 2026-05-18
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found (Info-only — no blockers)

## Summary

Phase 31's NAV-01 changes are small, focused, and disciplined. The 3-file scope is tight (BottomNav component, root layout padding bump, French i18n keys), and every decision documented in `31-CONTEXT.md` (D-01…D-18) maps cleanly to the implementation:

- **Correctness:** the discriminated-union `Tab` shape (D-13) narrows correctly inside `isActive` and the JSX `if (tab.variant === "central-cta")` branch — TypeScript will catch any future addition of a third variant. Mutual exclusion of active states (D-12) is enforced by the explicit `pathname !== "/recipes/new"` guard in the prefix-match branch, matching the documented load-bearing invariant (D-08 / D-09).
- **Hook usage:** `usePathname()` is correctly chosen over `useSelectedLayoutSegment()` for active-matching (D-09); the segment hook is preserved only for the onboarding hide gate (D-10), and both hooks coexist as designed. The pattern is consistent with Next.js 16 App Router conventions in `frontend/node_modules/next/dist/docs/`.
- **Accessibility:** `aria-current="page"` is applied to both variants on active; the icon-only CTA gets `aria-label={t("add")}` plus a visible label; the wash overlay is `aria-hidden`; the landmark is correctly labelled `Navigation principale` (and the `TODO(productize)` comment explicitly explains why the hardcoded interim is acceptable — it fixes a pre-existing screen-reader bug where the landmark was mislabeled as "Accueil").
- **i18n hygiene:** `nav.settings` → `nav.profile` rename is clean. `BottomNav.tsx` is the sole caller of `useTranslations("nav")` in the frontend (grep confirmed), so no other component breaks. Remaining `Réglages` strings in `fr.json` (`home.push.subscribe_failed`, `settings.notifications.status_denied_explainer`) refer to *iOS Settings*, not the in-app tab — correct copy, not stale references.
- **Security:** no `dangerouslySetInnerHTML`, no untrusted URL handling, no `eval`, no `innerHTML`. All `href` values are static literals.
- **Performance:** `usePathname()` only re-renders on route change (not on every render of the parent tree). The TABS constant is module-scoped so it isn't reallocated per render. No concerns.

The two findings below are minor maintainability nits — not blockers.

## Info

### IN-01: Unused `pathname` field on `CentralCTA`

**File:** `frontend/components/BottomNav.tsx:33-38`
**Issue:** The `CentralCTA` discriminated-union member declares `pathname: string` (line 36) and the only literal sets it to `"/recipes/new"` (line 45, same as `href`). The field is read once inside `isActive` (line 63: `return pathname === tab.pathname`), but since `tab.href === tab.pathname` for the CTA — and that will always be true unless someone introduces a query-string or anchored CTA — the field duplicates `href`. The `FlatTab` variant has a legitimate reason for `pathname` to diverge from `href` (e.g. a prefix-match root), but the CTA does not.

This is intentionally consistent with `FlatTab` (it makes the `isActive` predicate uniform), and the comment on line 36 (`"/recipes/new" — exact match only`) makes the intent clear. Not a defect — flagged only so future maintainers know the duplication is deliberate.

**Fix:** No code change recommended. If a future variant needs to diverge `href` from `pathname` (e.g. a `?capture=quick` query suffix), the current shape supports it cleanly. Optionally tighten the type with a string literal:

```ts
type CentralCTA = {
  variant: "central-cta";
  href: "/recipes/new";
  pathname: "/recipes/new";
  labelKey: "add";
};
```

…but this overconstrains and would force a type bump if the route ever moves. Leave as-is.

### IN-02: Hardcoded landmark `aria-label` flagged by its own TODO

**File:** `frontend/components/BottomNav.tsx:70-74`
**Issue:** `aria-label="Navigation principale"` is a hardcoded French string in a codebase whose architecture invariant #6 mandates `next-intl` for all user-facing copy. The inline `TODO(productize)` (lines 70-73) explicitly acknowledges this and provides the rationale: it's an interim that *fixes* a pre-existing screen-reader bug where the landmark was mislabeled as "Accueil" (the Home tab string). v0.1 is French-only, so the practical i18n risk is zero.

This is well-handled — the `TODO(productize)` marker is exactly the convention CLAUDE.md prescribes for deferred productize work, and several e2e tests already pin the verbatim string (`frontend/tests/e2e/auth.skip-onboarding.spec.ts:18`, `invite-code-happy-path.spec.ts:150`), so adding a new `nav.aria_label` key would require coordinated test updates.

**Fix:** No change in Phase 31. When this is productized:
1. Add `nav.aria_label: "Navigation principale"` to `fr.json` (and any future locale files).
2. Replace `aria-label="Navigation principale"` with `aria-label={t("aria_label")}`.
3. Update the two e2e specs to use the same `t()` source or a shared selector helper.

---

_Reviewed: 2026-05-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
