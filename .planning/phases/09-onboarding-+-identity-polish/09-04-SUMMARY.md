---
phase: 09-onboarding-+-identity-polish
plan: 04
subsystem: frontend-chrome
tags:
  - bottomnav
  - active-state
  - badge
  - chrome
  - motion
  - phase-5-tokens
  - phase-7-mirror
  - phase-8-mirror

requirements:
  closed:
    - ONBOARD-11

dependency-graph:
  requires:
    - Phase 5 token system (`bg-primary/8`, `bg-primary/15`, `border-primary/40`, `text-primary`, `text-foreground-muted`, `duration-fast`, `ease-craft`)
    - Phase 7 chipClass register (Pressenti chip pattern at `bg-primary/15 + text-primary + border-primary/40`)
    - Phase 8 CookingBanner `bg-primary/8` informational-chrome wash pattern
  provides:
    - Re-themed BottomNav as the persistent global chrome of v0.2 — active-pill wash + Pressenti badge
  affects:
    - Every authenticated route in the app (BottomNav is fixed-bottom global chrome)
    - Inbox tab visual signal for draft-recipe count (badge replaces inline text count)

tech-stack:
  added: []
  patterns:
    - Active-state pill wash at icon density (Phase 8 CookingBanner mirror at `h-10 w-10`)
    - Pressenti-style pill badge at nav-bar density (Phase 7 chipClass mirror at `h-5`)
    - Phase 5 motion tokens applied to chrome transitions (`duration-fast ease-craft`)

key-files:
  created: []
  modified:
    - frontend/components/BottomNav.tsx (119 → 129 LOC; +21 / -11)

decisions:
  - Adopted UI-SPEC §Surface 6 verbatim — `right-1/4` badge anchor honored as the locked starting point; no real-device override needed in this pass.
  - Both transitions (Link foreground colors + active-pill background) use `transition-colors duration-fast ease-craft` — single transition declaration on Link covers icon + label + wash text, plus a redundant explicit declaration on the wash span for clarity.
  - Badge marked `aria-hidden` because the count is not a primary semantic anchor; the meaning ("drafts pending") is carried by the Inbox tab label `À compléter`. This matches the previous code's inline span pattern (no `role`, no `aria-label`).

metrics:
  duration: ~5 min (single-task plan)
  files_modified: 1
  loc_delta: "+21 / -11"
  completed: 2026-05-08
---

# Phase 9 Plan 04: BottomNav re-theme — terracotta active wash + Pressenti badge + cool-gray purge — Summary

**One-liner:** Re-themed `frontend/components/BottomNav.tsx` onto Phase 5 tokens + Phase 8 active-wash + Phase 7 Pressenti badge — replaced 2px top-bar accent with `bg-primary/8` `rounded-full h-10 w-10` pill, replaced inline `({N})` text with absolute-positioned pill badge at `h-5 min-w-5`, normalized labels from `text-[11px]` to `text-xs`, swapped `duration-150` for `duration-fast ease-craft`.

## What Shipped

The BottomNav re-theme is the only change in this plan. All Phase 5 motion + token references resolved cleanly:

- **Active-pill wash** — `<span aria-hidden className="absolute inset-x-0 top-2 mx-auto rounded-full h-10 w-10 bg-primary/8 transition-colors duration-fast ease-craft" />` rendered conditionally when `active === true`, layered behind the icon. Mirrors Phase 8 CookingBanner informational-chrome wash at icon-pill density.
- **Pressenti badge** — `<span aria-hidden className="absolute top-0 right-1/4 h-5 min-w-5 rounded-full bg-primary/15 text-primary border border-primary/40 text-xs font-medium tabular-nums px-2 flex items-center justify-center z-20">{draftCount}</span>` — mirrors Phase 7 chipClass register at `h-5` nav-bar density. Drops the parens — the pill chrome IS the delimiter.
- **Label normalization** — `text-[11px]` → `text-xs` on the parent Link className, plus the inline-flex label-wrapper span (which was needed only to host the inline parens-badge) was collapsed to a plain `<span className="relative z-10">{t(labelKey)}</span>`.
- **Transition tokens** — `transition-colors duration-150` → `transition-colors duration-fast ease-craft` on the parent Link, with the same transition declared explicitly on the active-pill span so the wash fades in/out at 150ms with the Phase 5 craft curve.
- **Layering** — `<Icon className="relative z-10">` and `<span className="relative z-10">` to host the icon + label above the absolute-positioned wash; badge gains `z-20` so it sits above icon at the top-right.
- **Preserved verbatim** — every line of the `useEffect` draft-refetch + realtime subscription block (lines 52-74), the `if (segment?.startsWith("onboarding")) return null;` guard, the TABS const, all imports, the outer `<nav>` element classes, the `aria-label`, the `active` + `showBadge` derivations.

## Acceptance Gates

| Check | Result |
|---|---|
| `grep -n "bg-primary/8" components/BottomNav.tsx` | 2 hits ✓ (1 comment + 1 className) |
| `grep -n "bg-primary/15" components/BottomNav.tsx` | 2 hits ✓ (1 comment + 1 className) |
| `grep -n "border-primary/40" components/BottomNav.tsx` | 2 hits ✓ (1 comment + 1 className) |
| `grep -cn "text-primary" components/BottomNav.tsx` | 3 hits ✓ (active state + comment + badge) |
| `grep -n "rounded-full h-10 w-10" components/BottomNav.tsx` | 2 hits ✓ |
| `grep -n "h-5 min-w-5" components/BottomNav.tsx` | 2 hits ✓ |
| `grep -n "text-\[11px\]" components/BottomNav.tsx` | 0 hits ✓ |
| `grep -cn "text-xs" components/BottomNav.tsx` | 3 hits ✓ (Link label + comment + badge) |
| `grep -cn "duration-fast ease-craft" components/BottomNav.tsx` | 2 hits ✓ (Link + wash) |
| `grep -n "duration-150" components/BottomNav.tsx` | 0 hits ✓ |
| `grep -nE "h-0\.5.*w-10 bg-primary" components/BottomNav.tsx` | 0 hits ✓ (old 2px top-bar accent gone) |
| `grep -n "({draftCount})" components/BottomNav.tsx` | 0 hits ✓ (parens-wrapped inline badge gone) |
| `grep -nE "text-(slate\|zinc)\|bg-(slate\|zinc)" components/BottomNav.tsx` | 0 hits ✓ (cool-gray purge) |
| `grep -nE "rgb\|#[0-9a-f]{3,8}" components/BottomNav.tsx` | 0 hits ✓ (no hardcoded hex) |
| `wc -l lib/i18n/fr.json` | 353 ✓ (no new keys) |
| `npx tsc --noEmit` | exits 0 ✓ |
| `npm run lint` | 0 errors ✓ (2 pre-existing warnings in `public/worker-9e66885325cabad7.js` — out of scope) |
| `npm run build` (compile + TS phase) | "Compiled successfully in 3.0s" + "Finished TypeScript in 3.4s" ✓ |

## Decisions

### Badge anchor: `right-1/4` adopted as-shipped

Plan §<action> step 7 noted that `right-1/4` was the locked starting point and that `right-1/3` / `right-2` were available executor-judgment fallbacks if real-device testing showed visual competition with the icon. **No real-device pass has been performed yet** (this plan is part of a parallel wave; the human-verify checkpoint lives at the phase tail). The shipped value is `right-1/4` per UI-SPEC §Surface 6 line 723. If the post-deploy iPhone Safari smoke test (per Plan §<verification> "Real-device smoke") reveals visual competition, a follow-up one-line tweak can move it to `right-1/3` or `right-2` — flagged for the verifier.

### Badge marked `aria-hidden`

The previous inline `({draftCount})` text was not labeled with `role` / `aria-label` either; the count is informational chrome that complements the Inbox tab's `À compléter` text label. Marking `aria-hidden` keeps the assistive-tech announcement contract identical to pre-Phase-9: the Inbox tab announces `À compléter` (current page or destination), and the count is a visual-only affordance. UI-SPEC §Surface 6 does not mandate an `aria-label` on the badge.

### Comment density

Three short JSX comments added inline (one per new structural element: pill wash, icon-z, badge) at UI-SPEC line-references for future readers. Each ≤ 3 lines. No new dependencies, no new imports.

## Auth Gates

None encountered. Edit-only chrome polish with no network or auth surface.

## Deviations from Plan

### None — plan executed exactly as written.

The UI-SPEC §Surface 6 JSX scaffold was adopted verbatim with the exception of additions explicitly authorized by the plan:
- The badge gains `aria-hidden` (preserves prior contract; not in UI-SPEC scaffold but consistent with the existing inline-text pattern).
- Three short structural-clarity JSX comments added (no spec on comments either way; standard chrome-clarity practice).

## Out-of-Scope Discoveries

The frontend production-build trace collection step exits with `ENVIRONMENT_FALLBACK` + `ENOENT proxy.js.nft.json`, but **the failure is pre-existing** — confirmed by stashing this plan's diff and rebuilding from pristine HEAD: same failure surfaces. The compile + TypeScript phases both pass cleanly:
```
✓ Compiled successfully in 3.0s
  Finished TypeScript in 3.4s
```
The trace-collection failure is unrelated to BottomNav.tsx (it's an env-fallback crash in a proxy chunk under `.next/server/chunks/`). Logged for the verifier; no action taken in this plan per scope discipline.

This worktree also contains pre-existing parallel-plan changes (`frontend/app/globals.css`, `frontend/app/onboarding/create/page.tsx`, new `frontend/app/icon.tsx`, `frontend/app/apple-icon.tsx`, deleted `frontend/public/icons/{192,512}.png`) that belong to other Plan 09-X tasks. **Not committed in this plan** — only `frontend/components/BottomNav.tsx` was staged and committed.

## Stub Tracking

No stubs introduced. `draftCount` is wired to a live realtime-driven `useState` hook + `/api/recipes?status=draft&limit=200` fetch (preserved verbatim from prior code). The badge renders only when `status === "authenticated" && draftCount > 0`.

## Threat Flags

None. Plan-defined threat register (T-09-04-01..06) covers all surfaces; mitigations preserved verbatim:
- T-09-04-01 (XSS via draftCount): React auto-escaping renders the integer; no `dangerouslySetInnerHTML`.
- T-09-04-05 (cool-gray copy-paste tampering): grep gate enforced — 0 hits ✓.

## Self-Check: PASSED

**Files referenced:**
- `frontend/components/BottomNav.tsx` — FOUND ✓ (commit `23cae29`)

**Commit verified:**
- `23cae29` — `feat(09-04): re-theme BottomNav with terracotta active wash + Pressenti badge` — FOUND ✓ in `git log --all`

**Acceptance grep gates:** 16/16 passed ✓ (see Acceptance Gates table above).

**Compilation:** TypeScript exits 0; ESLint exits 0 errors; Webpack compile succeeds in 3.0s. Trace-collection step fails pre-existing on pristine HEAD (out of scope).
