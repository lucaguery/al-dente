---
phase: 22-quick-wins
reviewed: 2026-05-12T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - frontend/app/globals.css
  - frontend/app/layout.tsx
  - frontend/app/onboarding/join/page.tsx
  - frontend/app/recipes/[id]/page.tsx
  - frontend/app/settings/page.tsx
  - frontend/components/ShortlistCard.tsx
  - frontend/components/UrlCaptureTab.tsx
  - frontend/components/VersionFooter.tsx
  - frontend/next.config.ts
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
status: issues_found
---

# Phase 22: Code Review Report

**Reviewed:** 2026-05-12
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found (3 info items only — no blockers)

## Summary

Phase 22 delivers three small, atomic polish requirements (QW-01 Geist Mono removal, QW-02 VersionFooter, QW-03 French tag labels). The diff from `821577a` is minimal — five surgical patches plus one new ~15-line client component and a 6-line `env` re-export block in `next.config.ts`. All three requirements are correctly executed against their DISCUSS-phase locks:

- **QW-01:** Verified zero `font-mono`, `--font-mono`, or `Geist_Mono` references remain in `frontend/{app,components,lib}`. Both replacement classes (`tabular-nums tracking-[0.3em] uppercase` on the invite-code input and `tabular-nums text-sm` on the URL input) match D-01 / D-02 verbatim. `--font-mono` self-reference removed from `@theme inline` in `globals.css`.
- **QW-02:** `VersionFooter` is a tight pure-render client component with branch-free fallbacks via the `next.config.ts` `env` block. Slice-to-7 truncation of `VERCEL_GIT_COMMIT_SHA` is correct (the full SHA never reaches the bundle, satisfying the build-stamp safety note in `<phase_context>`). Mount point at the bottom of Settings respects the layout (sits outside the Card stack, inside the `pb-(--spacing-bottom-safe)` content wrapper).
- **QW-03:** Both target call sites (`ShortlistCard.tsx:309-313` and `app/recipes/[id]/page.tsx:258,260-264,266`) now route cuisine / mood / protein through `useEnumLabels()`. Hook re-use is correct — no new infrastructure added (D-13 honored). `recipe.season` raw-render grep is clean across `frontend/{app,components}`.

No bugs, no security issues, no quality blockers. Three informational items below are observations worth noting but do not require changes in this phase.

## Info

### IN-01: VersionFooter aria-label is a hardcoded French string (invariant 6 surface)

**File:** `frontend/components/VersionFooter.tsx:24`
**Issue:** The `aria-label="Version de l'application"` is a hardcoded user-facing French string. `CLAUDE.md` invariant 6 ("French-only via `next-intl`, day one — all user-facing strings via `next-intl`") technically applies to ARIA labels as well — they are read by screen readers and are user-facing. This was explicitly approved at DISCUSS-phase (per `<phase_context>`: "VersionFooter aria-label is intentional per discuss-phase D-06") and is the only hardcoded string the file ships, so it is not a blocker — but it does create a small productize-later wart that future "invariant 6 sweep" passes will flag.
**Fix:** Either accept as-is (current path), or route through `next-intl` later:
```tsx
// In app/settings/page.tsx, pass an aria-label translation prop:
<VersionFooter ariaLabel={t("version_aria")} />

// Add to lib/i18n/fr.json under "settings":
"version_aria": "Version de l'application"
```
Defer to invariant-6 sweep phase. No change required now.

### IN-02: `tabular-nums` on URL input has limited typographic effect

**File:** `frontend/components/UrlCaptureTab.tsx:71`
**Issue:** `tabular-nums` (`font-variant-numeric: tabular-nums`) only affects digit glyph widths. URLs are predominantly letters / punctuation, so the visible rendering effect on this input is essentially nil — the class is doing nothing perceptible compared to plain `text-sm`. Per D-02 in `22-CONTEXT.md`, this swap was required so the `font-mono` grep returns zero, which is the actual goal it serves. The class is correct as a "no-op fallback satisfying the grep gate," but it may confuse a future reader who expects it to be load-bearing.
**Fix:** Consider a brief comment so the intent is preserved for future maintainers:
```tsx
// `tabular-nums` is a deliberate no-op fallback here — kept to satisfy the
// "zero font-mono" grep gate (QW-01 D-02). URL chars are mostly letters,
// so the visual change vs. plain `text-sm` is invisible.
className="tabular-nums text-sm"
```
Optional; leaving as-is is also fine.

### IN-03: `process.env.npm_package_version` is read at config-eval time, not at build

**File:** `frontend/next.config.ts:93`
**Issue:** `process.env.npm_package_version` is populated by npm/yarn/pnpm when they spawn a `package.json` script (e.g. `npm run build`). If `next build` is ever invoked directly (e.g. by a CI script that calls `node_modules/.bin/next build` without going through the npm lifecycle, or by certain Vercel build-command overrides), `npm_package_version` will be `undefined` and the footer will render `v0.0.0 · {sha} · production` on production — a confusing diagnostic state. Vercel's default build command (`npm run build`) does populate it, so this is theoretical for the current setup but worth being aware of.
**Fix:** Consider an explicit read from `package.json` as a belt-and-suspenders default:
```ts
// At top of next.config.ts:
import pkg from "./package.json" with { type: "json" };

// Then:
env: {
  NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? pkg.version ?? "0.0.0",
  // ...
}
```
Defer until / unless a CI rewire actually surfaces this — the current `?? "0.0.0"` fallback already prevents a build crash.

---

_Reviewed: 2026-05-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
