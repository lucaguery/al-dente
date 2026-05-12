---
phase: 260512-lif
plan: 01
subsystem: frontend
tags: [ui, typography, spacing, tokens, tailwind-v4, followup]
requires:
  - frontend/app/globals.css @theme tokens (--spacing-page-x, --spacing-section-y, --spacing-bottom-safe) — added in 260512-l0l
  - frontend/app/globals.css @layer utilities .text-page-header — added in 260512-l0l
provides:
  - Page-chrome rhythm extended into the 5 capture/summary components left out of 260512-l0l
  - Sticky-header register parity on the onboarding pages (create + join — share-code skipped per audit)
affects:
  - frontend/components/VoiceCaptureTab.tsx
  - frontend/components/PhotoCaptureTab.tsx
  - frontend/components/UrlCaptureTab.tsx
  - frontend/components/VoteSummary.tsx
  - frontend/components/CookingLogFinalize.tsx
  - frontend/app/onboarding/create/page.tsx
  - frontend/app/onboarding/join/page.tsx
key-files:
  modified:
    - frontend/components/VoiceCaptureTab.tsx
    - frontend/components/PhotoCaptureTab.tsx
    - frontend/components/UrlCaptureTab.tsx
    - frontend/components/VoteSummary.tsx
    - frontend/components/CookingLogFinalize.tsx
    - frontend/app/onboarding/create/page.tsx
    - frontend/app/onboarding/join/page.tsx
decisions:
  - "share-code/page.tsx skipped — verification grep found 0 `text-base font-semibold` matches (no sticky <header> in this file; hero <h1> already uses .text-display)."
  - "`pb-32` literals kept in the 3 capture-tab wrappers — sticky-CTA-bar clearance (productize-later per 260512-l0l decisions; out of scope here)."
  - "`gap-4` (loading-pulse density) and `gap-8` (sparse finalize layout) kept literal in CookingLogFinalize — no matching token in the 260512-l0l vocabulary."
  - "`font-semibold` dropped on the converted onboarding spans — `.text-page-header` already locks `font-weight: 500 / font-style: italic`."
metrics:
  duration: 7m
  completed: 2026-05-12
requirements:
  - QUICK-260512-lif
---

# Quick-260512-lif: Harmonize capture-tab + summary components Summary

One-line delta: capture tabs (`Voice / Photo / Url`), vote summary (both branches), cooking-log finalize (both branches), and the onboarding create + join sticky-header titles now share the **same** `--spacing-page-x` / `--spacing-bottom-safe` / `--spacing-section-y` / `.text-page-header` chrome as the 14-file baseline from 260512-l0l.

## Files Touched

**7 files, 10 lines changed across 2 atomic commits.** Pure className refactor — no `next-intl` strings touched, no logic, no colors, no dependencies.

| File | Lines edited | Branches |
|------|--------------|----------|
| `frontend/components/VoiceCaptureTab.tsx` | 65 | capture page-chrome wrapper |
| `frontend/components/PhotoCaptureTab.tsx` | 114 | capture page-chrome wrapper |
| `frontend/components/UrlCaptureTab.tsx` | 62 | capture page-chrome wrapper |
| `frontend/components/VoteSummary.tsx` | 138, 167 | loading-empty + main |
| `frontend/components/CookingLogFinalize.tsx` | 114, 138 | loading shell + main |
| `frontend/app/onboarding/create/page.tsx` | 86 | sticky-header span |
| `frontend/app/onboarding/join/page.tsx` | 200, 239 | HOUSEHOLD_FULL + happy-path sticky-header spans |

**Not touched (explicit constraints):**
- `frontend/app/globals.css` — tokens already exist from 260512-l0l (REFERENCE ONLY).
- `frontend/components/RegenerateSheet.tsx` — Sheet body, not page chrome (explicitly out of scope).
- `frontend/app/onboarding/share-code/page.tsx` — no sticky `<header>` exists; hero `<h1>` already uses `.text-display`. Verified via `grep -n "text-base font-semibold" share-code/page.tsx` → 0 hits. **Plan's grep-gated skip rule honored.**

## Before / After grep stats

### Outliers closed (Task 1 scope — 5 components)

```
# Page-chrome wrappers still on the old `px-6 pt-6 pb-{24|32}` shape:
$ grep -nE 'px-6 pt-6 pb-(24|32)' frontend/components/{VoiceCaptureTab,PhotoCaptureTab,UrlCaptureTab,VoteSummary,CookingLogFinalize}.tsx
# BEFORE: 7 hits (1+1+1+2+2)
# AFTER:  0 hits  ✓
```

### Outliers closed (Task 2 scope — 3 onboarding pages)

```
# Sticky-header spans still on `text-base font-semibold`:
$ grep -n "text-base font-semibold" frontend/app/onboarding/{create,join,share-code}/page.tsx
# BEFORE: 3 hits (create:1 + join:2 + share-code:0)
# AFTER:  0 hits  ✓
```

### Token adoption climbed

```
$ grep -cE 'px-\(--spacing-page-x\)|pb-\(--spacing-bottom-safe\)|gap-\(--spacing-section-y\)|text-page-header' \
    frontend/components/VoiceCaptureTab.tsx \
    frontend/components/PhotoCaptureTab.tsx \
    frontend/components/UrlCaptureTab.tsx \
    frontend/components/VoteSummary.tsx \
    frontend/components/CookingLogFinalize.tsx \
    frontend/app/onboarding/create/page.tsx \
    frontend/app/onboarding/join/page.tsx \
    frontend/app/onboarding/share-code/page.tsx
# Line counts per file (matching lines, not token count):
#   VoiceCaptureTab.tsx          1
#   PhotoCaptureTab.tsx          1
#   UrlCaptureTab.tsx            1
#   VoteSummary.tsx              2
#   CookingLogFinalize.tsx       2
#   onboarding/create/page.tsx   4 (1 new + 3 pre-existing from 260512-l0l)
#   onboarding/join/page.tsx     8 (2 new + 6 pre-existing from 260512-l0l)
#   onboarding/share-code/page.tsx 2 (pre-existing from 260512-l0l, unchanged)
# Total matching lines: 21 — well above the ≥18 success bar.
```

### Onboarding sticky-header register parity

```
$ grep -rn "text-page-header" frontend/app/onboarding/
# onboarding/join/page.tsx:200:          <span className="text-page-header">{t("title")}</span>
# onboarding/join/page.tsx:239:        <span className="text-page-header">{t("title")}</span>
# onboarding/create/page.tsx:86:        <span className="text-page-header">{t("title")}</span>
# Exactly 3 hits — matches plan audit (create:1 + join:2 + share-code:0).
```

## Build verification

```
$ cd frontend && npm run build
✓ Compiled successfully in 3.7s
✓ Finished TypeScript in 9.1s
✓ Generating static pages using 7 workers (17/17)
```

Zero TypeScript errors, zero ESLint warnings introduced. The `Error: ENVIRONMENT_FALLBACK` line in the build tail is unrelated runtime info during static page collection (RAILWAY_URL not set in local build) — pre-existing, not caused by this plan.

## Commits

| Hash | Message |
|------|---------|
| `34b8829` | refactor(260512-lif-01): apply page-rhythm tokens to 5 capture/summary components |
| `665f613` | refactor(260512-lif-02): lift onboarding sticky-header spans to .text-page-header |

## Deviations from Plan

**None.** Plan executed exactly as written.

- Plan's pre-audit was accurate to the byte on all 10 target lines (5 components × 1-2 lines + 3 onboarding spans).
- Plan's grep-gated share-code skip rule fired correctly (0 matches → skipped, no diff).
- Pre-existing tokens in `globals.css` resolved cleanly via Tailwind v4 arbitrary-value syntax — no token redefinition needed.
- `pb-32` / `gap-4` / `gap-8` literal-keeps held — those are deliberately distinct rhythms (sticky-CTA clearance / loading-pulse density / sparse-section density) and have no canonical token in the 260512-l0l vocabulary.

## Deferred concerns (carried forward, not new)

- **Sticky-CTA-bar clearance token.** `pb-32` still literal in VoiceCaptureTab / PhotoCaptureTab / UrlCaptureTab / RecipeForm — productize-later candidate (`--spacing-sticky-cta-y`). Same disposition as 260512-l0l.
- **RegenerateSheet.tsx disposition.** Sheet body context (`px-6 py-6` inside the Sheet wrapper) is intentionally NOT page chrome. If we ever introduce a `--spacing-sheet-x` / `-sheet-y` vocabulary, that's where it would land. Deferred.
- **PhotoCaptureTab line 116 `<h2 className="text-xl font-semibold">`.** Inside the empty-state Card body, NOT page chrome. Same Card-internal boundary 260512-l0l locked. Out of scope here, will be picked up if a future plan converts Card-internal headings to a dedicated register.

## Out-of-scope findings

**None.** No additional inconsistencies discovered outside the plan's 8 listed files. The scope-lock held cleanly.

## Self-check

- `git diff --name-only 34b8829^..HEAD` lists exactly 7 files: the 5 plan components + 2 onboarding pages (create + join). share-code, RegenerateSheet.tsx, and globals.css NOT in the diff. ✓
- `34b8829` (Task 1) and `665f613` (Task 2) both present in `git log --oneline -3`. ✓
- `frontend/components/RegenerateSheet.tsx`: NOT modified — verified via `git diff --name-only 34b8829^..HEAD | grep RegenerateSheet` → empty. ✓
- `frontend/app/globals.css`: NOT modified — verified via `git diff --name-only 34b8829^..HEAD | grep globals.css` → empty. ✓
- `cd frontend && npm run build` → "Compiled successfully" with 0 new errors / 0 new warnings. ✓

## Self-Check: PASSED
