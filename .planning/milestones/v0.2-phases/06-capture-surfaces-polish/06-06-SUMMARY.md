---
phase: 06-capture-surfaces-polish
plan: 06
subsystem: capture-surfaces
tags: [polish, capture, url, tap-target, design-system]
requirements: [CAPTURE-12]
dependency_graph:
  requires:
    - Phase 5 design system foundation (Button primitive re-theme; h-12 className override resolves to 48px tap-target floor)
  provides:
    - URL capture submit button at the 48px tap-target floor (D-08 / WCAG 2.5.5 minimum)
    - Closure of CAPTURE-12 in Phase 6 capture-surfaces polish
  affects:
    - frontend/components/UrlCaptureTab.tsx
tech_stack:
  added: []
  patterns:
    - "Phase 5 token inheritance via className override on shadcn primitives"
    - "h-12 w-full as the 48px tap-target idiom across capture surfaces"
key_files:
  created: []
  modified:
    - frontend/components/UrlCaptureTab.tsx
decisions:
  - "Single-line surgical change (h-11 -> h-12); no structural rework, no new i18n keys, no new primitives"
  - "Helper card kept at bg-muted/60 (warm-taupe wash via Phase 5 tokens) — paper-grain explicitly NOT applied (informational chrome, not recipe content)"
  - "URL input kept at font-mono text-sm (W4 convention — URLs are code-like)"
  - "Inline error kept at text-sm text-destructive mt-1 (Phase 5 destructive token = quieted-warm red)"
metrics:
  duration_minutes: ~3
  tasks_completed: 1
  files_modified: 1
  files_created: 0
  loc_changed: 1
  commits: 1
  completed_date: 2026-05-08
---

# Phase 06 Plan 06: URL submit h-12 Summary

**One-liner:** Raised the URL capture submit button from `h-11 w-full` to `h-12 w-full` so it meets the 48px tap-target floor — single-line surgical change closing CAPTURE-12 with zero structural rework.

## What Shipped

Phase 6 Plan 06 was the smallest plan in the capture-surfaces-polish phase. The URL tab was already mostly Phase-5-token-correct — Phase 5 primitives (Button, Input, Label) flow through automatically via inheritance, and the existing helper card (`bg-muted/60`) and inline error (`text-destructive`) already render the warm-taupe + quieted-warm-red Phase 5 tokens. The only Phase 6 polish required was bumping the submit button class from `h-11` to `h-12` to align with the 48px tap-target floor used across the rest of the capture surfaces.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Raise URL tab submit button from h-11 to h-12 | b42aa83 | frontend/components/UrlCaptureTab.tsx |

## Diff

One file, one line:

```diff
@@ -87,7 +87,7 @@
       <Button
         type="button"
-        className="h-11 w-full"
+        className="h-12 w-full"
         onClick={handleSubmit}
         disabled={!isValid || submitting}
       >
```

## Verification Evidence

Grep confirmation against `frontend/components/UrlCaptureTab.tsx`:

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| `h-12 w-full` on submit Button | 1 hit | 1 hit (line 90) | PASS |
| `h-11` residue | 0 hits | 0 hits | PASS |
| `font-mono text-sm` on URL input | 1 hit | 1 hit (line 71) | PASS |
| `bg-muted/60 p-3 text-sm text-muted-foreground` on helper card | 1 hit | 1 hit (line 83) | PASS |
| `text-sm text-destructive mt-1` on inline error | 1 hit | 1 hit (line 79) | PASS |
| `npm run lint` (frontend) | passes | passes (2 pre-existing warnings in `public/worker-*.js` build artifact, unrelated, out of scope) | PASS |

## Done Criteria

- [x] CAPTURE-12 closed: URL submit button at `h-12 w-full`
- [x] No `h-11` remaining in `UrlCaptureTab.tsx`
- [x] URL input keeps `font-mono text-sm`
- [x] Helper card keeps `flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground`
- [x] Inline error keeps `text-sm text-destructive mt-1`
- [x] No new i18n keys
- [x] Business logic (validation, `handleSubmit`, `postUrlCapture` call, redirect to `/inbox`) byte-for-byte unchanged
- [x] `npm run lint` passes (pre-existing service-worker warnings out of scope)

## Decisions Made

- **No paper-grain on the helper card.** UI-SPEC §"Surface 7" explicitly reserves paper-grain for `Card`-style containers that represent recipe content (kitchen-counter cards). The URL helper card is informational chrome — adding paper-grain would compete with the v0.5 capture-surface paper-grain semantics. Decision held.
- **No structural rework.** UI-SPEC §"Component Inventory" row 5 lists the URL surface as a single-line bump. Resisted any temptation to also restyle the helper info row, the input borders, or the error treatment — Phase 5 tokens already do the right thing on all three.
- **No new i18n keys.** All copy (`recipes.url.field_label`, `field_placeholder`, `helper`, `invalid`, `submit`, `submitted_toast`, `common.sending`) is already in `frontend/lib/i18n/fr.json`.
- **No business-logic changes.** `useState` (value/touched/submitting), `useMemo` URL validation (`new URL` + http/https scheme check, T-02-04-03 mitigation), `handleSubmit` invocation of `postUrlCapture(value.trim())`, and the toast/redirect path are byte-for-byte preserved.

## Anti-patterns Resisted

| Anti-pattern | Why resisted |
|--------------|--------------|
| Add paper-grain to helper card | Reserved for recipe-content cards (UI-SPEC §"Paper-Grain placement") |
| Change `font-mono text-sm` on URL input | URLs are code-like — mono is the W4 convention |
| Change `bg-muted/60` to `bg-card` or other token | `bg-muted/60` IS the warm-taupe wash under Phase 5 tokens |
| Add an icon to the submit button | UI-SPEC §"Copywriting register" — text-only, action verb first ("Ajouter à la boîte de réception") |
| Add new i18n keys | All keys exist; no copy change needed |
| Change `inputMode="url"`, `autoCapitalize="off"`, `autoCorrect="off"` | iOS keyboard hints, intentional |
| Change client-side `new URL()` validation | T-02-04-03 mitigation; backend re-validates with stricter rules; Phase 6 does not touch validation |

## Deviations from Plan

None — plan executed exactly as written. The plan was specified as a single surgical class-name swap; the actual change was the same single surgical class-name swap. No Rule 1 / Rule 2 / Rule 3 fix-ups were needed.

## Threat Flags

None. The submit path is unchanged — `postUrlCapture(value.trim())` still hits backend `POST /api/recipes/url` with the same client-side `new URL()` + http/https scheme validation (T-02-04-03 mitigation) and inherits backend re-validation. T-06-06-01 (XSS) and T-06-06-02 (URL injection) dispositions from the plan's threat register hold without modification — React JSX auto-escaping and unchanged validation layers.

## Notes

This plan illustrates the Phase 5 dividend: when the design-system foundation correctly re-themes shadcn primitives and consolidates tokens, screen-level polish degenerates into one-line className bumps. The URL surface required zero new code, zero new keys, zero new primitives, and one character changed in one file. This is the floor — every other Phase 6 plan (quick-add, full-form, voice, photo, drafts inbox) has more visual surface to polish, but should preferably degenerate toward this same shape: surgical alignment to Phase 5 tokens rather than from-scratch rebuilds.

## Self-Check: PASSED

- File `frontend/components/UrlCaptureTab.tsx` exists and contains `className="h-12 w-full"` on the submit Button at line 90.
- File contains zero `h-11` references.
- Commit `b42aa83` exists in git log.
- Commit modified exactly 1 file with +1 / -1 LOC delta.
