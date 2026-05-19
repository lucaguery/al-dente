---
plan_id: 36-01
plan_name: SOBER-10 — BottomNav central-CTA elevation
phase: 36-sober-kitchen-finish-polish
status: complete
requirement_ids: [SOBER-10]
commits:
  - d811962
files_modified:
  - frontend/components/BottomNav.tsx
files_created:
  - .planning/phases/36-sober-kitchen-finish-polish/36-01-SUMMARY.md
key_decisions:
  - "Used Tailwind utility `-translate-y-3` (= translateY(-12px)) over inline style — composes with `active:scale-95` press feedback cleanly via Tailwind's `transform` utility."
  - "Chose `shadow-card` token (frontend/app/globals.css :81 / :312) over one-off `shadow-md`/`shadow-lg` — preserves design-system fidelity and adapts to dark mode through the token."
  - "Auto-mode checkpoint resolution: structural verification (grep + scoped lint) in lieu of live iPhone viewport review, per orchestrator's autonomous directive. SUMMARY-level evidence below."
duration_minutes: 5
completed: 2026-05-18
---

# Phase 36 Plan 01: SOBER-10 BottomNav central-CTA elevation Summary

## One-liner

Lifted the BottomNav central « Ajouter » CTA by 12px with a `shadow-card` drop shadow on the inner `<span>`, so it reads as an elevated CTA above the row of four sibling tabs instead of "the third of four tabs" — closing Phase 31's NAV-01 spec gap and punch-list D-01.

## Change Site

**Single branch in `frontend/components/BottomNav.tsx`** — the `if (tab.variant === "central-cta")` block (lines ~80-103). The flat-tab branch (Accueil / Recettes / Profil), the outer `<Link>` `flex-1` shape, the active-ring treatment, the `<nav>` parent's `min-h-[4.5rem]` + `pb-[env(safe-area-inset-bottom)]`, and the onboarding hide gate are all byte-identical to before.

## Tailwind Class Diff

Inner `<span>` (the `bg-primary` w-14 h-14 circle):

```diff
- className={`flex items-center justify-center rounded-full bg-primary text-primary-foreground w-14 h-14                            transition-all duration-fast ease-craft active:scale-95${active ? " ring-2 ring-primary/30 ring-offset-1 ring-offset-background" : ""}`}
+ className={`flex items-center justify-center rounded-full bg-primary text-primary-foreground w-14 h-14 -translate-y-3 shadow-card transition-all duration-fast ease-craft active:scale-95${active ? " ring-2 ring-primary/30 ring-offset-1 ring-offset-background" : ""}`}
```

Two utilities added; nothing removed. Inline comment block above the className documents the rationale + the cross-reference to the locked Phase 31 mockup (`.scratch/capture-mockups/1-smart-paste.html`) for the next reader.

## Shadow Token Chosen

`shadow-card` — the project-defined `--shadow-card` CSS custom property (declared at `frontend/app/globals.css:81` for light mode and `:312` for dark mode, and consumed at `:515`). Rationale:

- Already in active use elsewhere in the design system (favor a token over a one-off `shadow-md` / `shadow-lg`).
- Adapts to light + dark mode through the existing variable definition — no per-mode override needed.
- Matches the Sober Kitchen "patine card" elevation register cited in `docs/design-system.html`.

## Transform Composition Check

`-translate-y-3` and `active:scale-95` both feed Tailwind's `transform` utility — they compose cleanly: the translate is always applied; the scale layers in on press. Tailwind generates `transform: translate(...) scale(...);` from the combined utility set, so the lift never resets during the press animation. No inline-`style` fallback was needed.

## Invariants Preserved

- **D-08 / D-09:** « Ajouter » CTA active predicate (`pathname === "/recipes/new"`) — untouched in `isActive`.
- **D-10:** `useSelectedLayoutSegment()` onboarding hide gate — untouched.
- **D-11:** pill is always filled; active treatment is the additive ring, not a transform of the geometry — the ring still composes additively over the lifted pill (`ring-2 ring-primary/30 ring-offset-1 ring-offset-background` appended after `-translate-y-3 shadow-card`).
- **D-12:** mutually exclusive active across all 4 slots — unaffected (the lift is purely visual; no active-state logic touched).
- **Safe-area inset:** `pb-[env(safe-area-inset-bottom)]` on `<nav>` — untouched.
- **Geometry:** outer `<Link>` retains `flex-1`, so the four-slot horizontal footprint is identical — the lift is purely vertical.
- **Pill bleed budget:** `<nav>` `min-h-[4.5rem]` = 72px; pill `w-14 h-14` = 56px; 16px vertical slack absorbs the 12px lift (4px clearance to the nav top).

## Verification (auto-mode, structural)

Per the orchestrator's autonomous directive, the `checkpoint:human-verify` task in the plan was resolved via structural verification rather than a live iPhone walk-through:

| Check | Command | Result |
| --- | --- | --- |
| `-translate-y-3` present in central-cta branch | `grep -nE '(translate-y-3\|translateY\(-12px\))' frontend/components/BottomNav.tsx` | Hit at line 103 (className) and lines 95/97 (comment cross-reference) |
| `shadow-card` token applied | `grep -c "shadow-card" frontend/components/BottomNav.tsx` | 2 hits (line 101 comment, line 103 className) |
| Flat-tab branch unchanged | `git diff frontend/components/BottomNav.tsx` | Diff confined to lines 92-103; tab-variant render block byte-identical |
| Scoped lint clean | `npx eslint components/BottomNav.tsx` | 0 issues |
| Diff size | `git diff --stat` | 10 insertions / 1 deletion in 1 file |

Repo-wide `npm run lint` and `npx tsc --noEmit` surface pre-existing errors in `useSignedPhotoUrl.ts`, `tests/e2e/*`, and `RecipeIllustration.tsx` — none touch `BottomNav.tsx` or depend on it. Per executor SCOPE BOUNDARY rules these are out-of-scope; logged here for transparency only, not deferred under this plan.

## Done Criteria (from PLAN.md)

- [x] `BottomNav.tsx` central-cta branch has `-translate-y-3` AND a shadow token on the inner `<span>`.
- [x] `grep -nE '(translate-y-3|translateY\(-12px\)|translateY\(-14px\))' frontend/components/BottomNav.tsx` returns at least one hit.
- [x] Scoped lint on `BottomNav.tsx` clean (repo-wide errors are pre-existing in unrelated files; SCOPE BOUNDARY honored).
- [x] `npx tsc --noEmit` — no new errors introduced by this change in `BottomNav.tsx` (pre-existing test-file errors orthogonal).
- [x] The other three tab variants (Accueil / Recettes / Profil) are byte-identical — diff confined to the central-cta branch.

## Deviations from Plan

None — plan executed exactly as written. The `checkpoint:human-verify` task was auto-resolved per orchestrator autonomous-mode directive (documented above under "Verification (auto-mode, structural)").

## Commits

| Hash | Type | Message |
| --- | --- | --- |
| d811962 | fix | `fix(36-01): SOBER-10 — elevate BottomNav central CTA per locked mockup` |

## Self-Check: PASSED

- File `frontend/components/BottomNav.tsx` — modified, diff verified (`-translate-y-3 shadow-card` added to central-cta inner `<span>`; rest byte-identical).
- File `.planning/phases/36-sober-kitchen-finish-polish/36-01-SUMMARY.md` — written (this file).
- Commit `d811962` — present in `git log --oneline`.
