---
phase: 09-onboarding-+-identity-polish
reviewed: 2026-05-08T19:30:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - frontend/app/icon.tsx
  - frontend/app/apple-icon.tsx
  - frontend/app/layout.tsx
  - frontend/public/manifest.json
  - frontend/app/onboarding/welcome/page.tsx
  - frontend/app/onboarding/create/page.tsx
  - frontend/app/onboarding/share-code/page.tsx
  - frontend/app/onboarding/join/page.tsx
  - frontend/app/settings/page.tsx
  - frontend/components/BottomNav.tsx
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-05-08T19:30:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 9 (final v0.2 phase — onboarding + identity polish) is in good shape. The retheme is implemented consistently: paper-grain Cards with terracotta-60 left borders match the established Phase 6 D-Voice callout pattern, h-12 tap-target floor is applied across every interactive control, the identity-signature class string (`font-display italic text-3xl tracking-widest text-primary`) appears byte-identical in both `share-code/page.tsx:60` and `settings/page.tsx:145` (cross-plan invariant satisfied), and the new PWA identity files (`icon.tsx`, `apple-icon.tsx`) use the locked-literal terracotta `#C8553D` + cream `#FAF7F2` per the explicit edge-runtime exception in UI-SPEC.

**Invariants verified:**
- `frontend/lib/i18n/fr.json` line count = 353 (zero new i18n keys — confirmed)
- `#F43F5E` is absent from `app/`, `components/`, and `public/` — only remaining occurrence is `lib/colors.ts:4` as the `rose` member-color swatch, which is unrelated to the deferred Phase 5 themeColor (member-attribution colors are a separate semantic from brand chrome)
- All themeColor surfaces (`layout.tsx:46`, `manifest.json:8`, `icon.tsx:18`, `apple-icon.tsx:17`) use `#C8553D` — Phase 5 deferral closed
- Identity-signature string matches in both required surfaces
- `BottomNav.tsx` contains zero `slate`/`zinc` references — cool-gray purge confirmed
- Zero `dangerouslySetInnerHTML` introduced in any reviewed file
- All `useTranslations` namespaces (`onboarding.*`, `settings`, `nav`, `common`) resolve to existing keys in fr.json

One pre-existing accessibility bug surfaced during review (BottomNav `<nav>` aria-label) — flagged as Warning but not a Phase 9 regression (predates this phase per `git log`). Three Info items relate to inherited fragility worth noting for productize-later cleanup.

## Warnings

### WR-01: BottomNav `<nav>` aria-label is incorrect (`Accueil` instead of a navigation label)

**File:** `frontend/components/BottomNav.tsx:81`
**Issue:** The `<nav>` element is labeled `aria-label={t("home")}`, which renders as `"Accueil"` (the Home tab string). Screen readers will announce the navigation landmark as `"Accueil — navigation"`, which (a) duplicates the visible Home tab label, (b) misrepresents the landmark's purpose (this is a *navigation* region, not a single page name), and (c) is meaningless when the user is on a non-Home page (e.g., Settings will still be labeled "Accueil"). This is a pre-existing bug (commit `451bb4f`, predates Phase 9) but is reachable across the entire app surface and is worth fixing alongside the Phase 9 BottomNav retheme since the file was already touched in `23cae29`.

**Fix:** Add a dedicated nav-label key (this would be a +1 i18n key, which violates the Phase 9 "zero new keys" invariant — defer to a follow-up phase OR reuse an existing label). Concrete options:

```tsx
// Option A — defer with explicit todo (zero-key compliant for Phase 9)
<nav
  aria-label="Navigation principale"  // TODO(productize): move to nav.aria_label key
  className="..."
>

// Option B — defer to a Phase 10+ patch with a new key
// In fr.json:  "nav": { ..., "aria_label": "Navigation principale" }
// In BottomNav.tsx:
<nav aria-label={t("aria_label")} className="...">
```

The hardcoded-French interim is acceptable here because (i) the app is French-only in v0.1, (ii) the existing `cooking_log.voice_input.aria_label` key shows the intended pattern for Phase 10+, and (iii) the current value is actively misleading to assistive tech.

## Info

### IN-01: Path duplication between `icon.tsx` and `apple-icon.tsx` is intentional but should be tracked

**File:** `frontend/app/apple-icon.tsx:35-36` (and `icon.tsx:36-38`)
**Issue:** The pasta-strand SVG path data is duplicated verbatim across both files. The comment at `apple-icon.tsx:10-11` explicitly notes "Path data duplicated intentionally — cross-file extraction is OPTIONAL for v0.2 per UI-SPEC line ~393". This is a documented decision but no `TODO(productize)` marker is present, so the debt is invisible to future grep-driven cleanup sweeps.

**Fix:** Add an inline marker so the duplication is greppable:

```tsx
// apple-icon.tsx line ~33
{/* Same pasta-strand geometry as icon.tsx — TODO(productize): extract
    shared SVG path data once a third icon size is added */}
<path d="M 40 80 C 40 50, 70 30, 100 40 S 130 80, 100 100 S 50 110, 40 80 Z" />
```

### IN-02: `settings/page.tsx` API path branching is fragile but pre-existing

**File:** `frontend/app/settings/page.tsx:71-74`
**Issue:** The `apiPath` ternary branches on `API_BASE === ""` to decide whether to prefix `/api/`. This works for the two documented environments (production: `NEXT_PUBLIC_API_BASE=""` + Vercel rewrite; local dev: direct backend URL), but a third configuration (e.g., a staging deploy where the backend lives on a same-origin path *without* a `/api` rewrite) would silently 404. This is not Phase 9 work — the comment cites `Phase 01-foundations-w1 plan 01-10` as origin — and is correctly out of scope here, but worth noting as inherited brittleness.

**Fix:** No action required for Phase 9. For a future cleanup, encode the rewrite contract explicitly rather than inferring from `API_BASE === ""`:

```ts
// next.config.ts owns the /api rewrite; settings/page.tsx should not duplicate the contract
const exportUrl = API_BASE
  ? `${API_BASE}/households/${householdId}/export.json`
  : `/api/households/${householdId}/export.json`;
const res = await fetch(exportUrl, { credentials: "include" });
```

### IN-03: `OnboardingShareCodePage` `onCopy` re-checks `code` after early-return guards already eliminated null

**File:** `frontend/app/onboarding/share-code/page.tsx:37-45`
**Issue:** `if (!code) return;` at line 38 is a defensive belt-and-suspenders check — `ShareCodeInner` already early-returns at line 35 (`if (!code) return null;`) before `onCopy` could ever be reachable as a click handler. The redundant guard is harmless but obscures the actual invariant (code is non-null because the component would have unmounted otherwise).

**Fix:** Either remove the inner guard or annotate why it exists (TypeScript narrowing recovery after the closure capture). The latter is probably more honest:

```tsx
async function onCopy() {
  // Guard repeated for TS narrowing: `code` is non-null at component-render
  // time (early return at line 35), but the closure-captured value still
  // needs the check for the type system.
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    toast.success(t("copied_toast"));
  } catch {
    toast.error(tErrors("network"));
  }
}
```

---

_Reviewed: 2026-05-08T19:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
