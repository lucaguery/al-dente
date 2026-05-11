---
phase: 20
plan: 02
subsystem: design-system
tags: [tokens, emerald, audit-remediation, styleguide, tailwind-v4]
requirements: [TOK-03]
status: complete
completed: 2026-05-11
dependency-graph:
  requires:
    - "Plan 20-01: emerald-replacement + member-color tokens shipped in globals.css"
  provides:
    - "7 audit-cited surfaces now token-driven (zero emerald-* Tailwind literals)"
    - "/styleguide Phase 20 tokens section (4 emerald-replacement swatches + 5 member-color chips, with dark-mode preview)"
  affects:
    - "Plan 21 (Pillar 6 polish) — surfaces now respond to dark-mode token swaps automatically"
    - "UI-AUDIT §C-1 (token-completeness gap) — 7/14 surfaces addressed"
tech-stack:
  added: []
  patterns:
    - "Token consumption via `text-[var(--token)]` / `border-[var(--token)]` arbitrary-value Tailwind classes (extends Phase 5 pattern)"
    - "color-mix(in srgb, ...) inline for one-off translucent hover state (verified Tailwind v4 supports `bg-[color-mix(...)]` arbitrary value)"
    - "Styleguide enumerates explicit slot pairs so var() literals appear in source for acceptance-grep targeting"
key-files:
  created: []
  modified:
    - frontend/components/ShortlistCard.tsx
    - frontend/components/VoteSummary.tsx
    - frontend/components/CookingBanner.tsx
    - frontend/components/CookingLogCard.tsx
    - frontend/components/RatingPicker.tsx
    - frontend/app/cooking-logs/page.tsx
    - frontend/app/cooking-logs/[id]/page.tsx
    - frontend/app/styleguide/page.tsx
decisions:
  - "Used color-mix(in srgb, var(--color-valide-foreground) 10%, transparent) for the ShortlistCard heart-button hover (the 10% wash had no pre-baked token in Plan 20-01). Tailwind v4 + Next.js 16 accept this arbitrary-value form (eslint + tsc both clean); no fallback token added."
  - "RatingPicker doc-comment block at the top of the file referenced the old `border-emerald-500 text-emerald-700 dark:text-emerald-300` literals. Updated to reflect the new token expressions; counted as part of the file's token migration (kept the Rule-1 scope-boundary check honest)."
  - "Styleguide member-color data carries explicit `bgVar` + `fgVar` strings per slot (rather than templated `var(--color-member-${slot}-bg)`) so each literal token name appears in source. This matches the acceptance criterion's intent ('≥ 9 matches (4 emerald + 5 member groups)') and keeps the swatch JSX trivial."
metrics:
  tasks: 2
  files-modified: 8
  commits: 2
  duration-seconds: 271
---

# Phase 20 Plan 02: Audit-cited emerald-literal migration + /styleguide swatches Summary

Migrated the 7 audit-cited surfaces (ShortlistCard, VoteSummary, CookingBanner, CookingLogCard, RatingPicker, cooking-logs list + detail) from raw `emerald-{500,700,300}` Tailwind literals to the semantic `--color-valide-*` / `--color-cooking-foreground` tokens shipped by Plan 20-01. Added a new "Phase 20 tokens" section to `/styleguide` rendering 4 round emerald-replacement swatches + 5 rounded-pill member-color chips with a dark-mode preview block. UI-AUDIT §C-1 closes for these 7 surfaces; dark-mode emerald accents now swap centrally via globals.css rather than per-class `dark:text-emerald-300` overrides.

## What Shipped

### Task 1 — 7 audit-cited surfaces

10 inline replacements + 1 stale doc-comment update:

| File | Line | Before | After |
| ---- | ---- | ------ | ----- |
| `ShortlistCard.tsx` | 165 | `border-emerald-500 text-emerald-500` | `border-[var(--color-valide-foreground)] text-[var(--color-valide-foreground)]` |
| `ShortlistCard.tsx` | 256 | `border-emerald-500/50 hover:bg-emerald-500/10` | `border-[var(--color-valide-border)] hover:bg-[color-mix(in_srgb,var(--color-valide-foreground)_10%,transparent)]` |
| `ShortlistCard.tsx` | 258 | `text-emerald-500` | `text-[var(--color-valide-foreground)]` |
| `VoteSummary.tsx` | 60 | `border border-emerald-500/30` | `border border-[var(--color-valide-border-faint)]` |
| `VoteSummary.tsx` | 74 | `border-emerald-500/30` | `border-[var(--color-valide-border-faint)]` |
| `CookingBanner.tsx` | 39 | `text-emerald-700 dark:text-emerald-300` | `text-[var(--color-cooking-foreground)]` |
| `CookingLogCard.tsx` | 58 | `border border-emerald-500/30` | `border border-[var(--color-valide-border-faint)]` |
| `RatingPicker.tsx` | 36 | `border-2 border-emerald-500 text-emerald-700 dark:text-emerald-300` | `border-2 border-[var(--color-valide-foreground)] text-[var(--color-valide-emphasis)]` |
| `RatingPicker.tsx` | 10 (doc) | stale comment listing old literals | rewritten to reflect token expressions (Rule-1: keep docs honest) |
| `cooking-logs/page.tsx` | 225 | `border border-emerald-500/30` | `border border-[var(--color-valide-border-faint)]` |
| `cooking-logs/[id]/page.tsx` | 50 | `border border-emerald-500/30` | `border border-[var(--color-valide-border-faint)]` |

The dark-mode `dark:text-emerald-300` overrides are dropped — the tokens already swap via the `.dark` selector in globals.css (Plan 20-01), so a single token expression suffices.

### Task 2 — /styleguide Phase 20 tokens section

New `(a.1) Phase 20 tokens` section between the existing `(a) Tokens / Color` and `(b) Tokens / Typography` blocks. Renders:

- **Emerald-replacement subgroup** — 4 round 40×40 swatches (`--color-valide-foreground`, `--color-valide-emphasis`, `--color-valide-border`, `--color-cooking-foreground`), each with token name + hex label.
- **Member-color subgroup** — 5 rounded-pill 50×30 chips (rose / amber / emerald / sky / violet), each painting via the slot's `-bg` + `-foreground` token pair so the AA-contrast story (amber's dark fg vs. white-on-other-slots) is visible at a glance.
- **Dark-mode preview block** — mirrors the existing `Tokens / Color > Dark mode preview` pattern by wrapping the same swatches in a `.dark` div so reviewers can compare light + dark in one viewport.

Data sources live in `emeraldReplacementTokens` + `memberColorTokens` consts near `lightSwatches` (lines 113–168), keeping the existing data-driven swatch pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Doc-comment regression] RatingPicker header doc-block referenced removed literals**

- **Found during:** Task 1 grep verification — `grep -c "emerald-"` returned 1 on `RatingPicker.tsx` after the class-string edit.
- **Issue:** Lines 10-12 carried a stale doc-comment listing the old `border-emerald-500 text-emerald-700 dark:text-emerald-300` class strings. The acceptance criterion forbids any `emerald-` substring across the 7 files.
- **Fix:** Rewrote the doc-block to enumerate the new token expressions (`border-[var(--color-valide-foreground)] text-[var(--color-valide-emphasis)]`) and added a one-line note explaining the post-sweep state.
- **Files modified:** `frontend/components/RatingPicker.tsx` (lines 4-13 doc-block).
- **Commit:** `7ffaa74` (combined with the rest of Task 1).
- **Why Rule 1:** Doc-comments are part of the file's contract — if the comment says "the liked class uses `border-emerald-500`", a reader will believe that and look for the literal that no longer exists. Keeping docs honest = correctness.

### Environmental fix (carried over from Plan 20-01)

- The worktree has no `frontend/node_modules`. Temporarily symlinked `frontend/node_modules` → `/Users/gulu3001/dev/al-dente/frontend/node_modules` for `npx tsc --noEmit` + `npx eslint` verification, then removed the symlink before the Task 2 commit. No symlink shipped.

No bugs, no missing critical functionality, no architectural changes.

## Verification

| Check | Required | Got |
| ----- | -------- | --- |
| `grep -c "emerald-"` across the 7 component files | 0 (sum) | 0 (0+0+0+0+0+0+0) |
| `grep -c "color-valide-foreground\|color-valide-emphasis\|color-valide-border\|color-cooking-foreground"` across 7 files | ≥ 8 | **11** (3+2+1+1+2+1+1) |
| `grep -n "Phase 20 tokens\|emerald-replacement\|member-color tokens"` in styleguide | ≥ 1 | **5** |
| `grep -c "color-valide-foreground\|color-cooking-foreground\|color-member-"` in styleguide | ≥ 9 | **12** |
| `cd frontend && npx tsc --noEmit` | exit 0 | **0** |
| `cd frontend && npx eslint <8 files>` | exit 0 | **0** |

## Commits

| Hash | Message | Files |
| ---- | ------- | ----- |
| `7ffaa74` | refactor(20-02): migrate 7 audit-cited surfaces from emerald literals to semantic tokens | 7 (ShortlistCard, VoteSummary, CookingBanner, CookingLogCard, RatingPicker, cooking-logs list + detail) |
| `c0043aa` | feat(20-02): add Phase 20 tokens section to /styleguide | 1 (app/styleguide/page.tsx) |

Both commits used `--no-verify` per orchestrator constraint.

## Known Stubs

None. Every Plan 20-01 emerald-replacement token (`--color-valide-foreground`, `--color-valide-emphasis`, `--color-valide-border`, `--color-valide-border-faint`, `--color-cooking-foreground`) is now consumed by at least one surface. The 14-site audit (UI-AUDIT §C-1) had its 7 emerald-cited surfaces migrated here; the remaining 7 (terracotta-foreground tints, neutral palette) are deferred to v2 design-system backlog per Plan 20-CONTEXT §deferred.

## Threat Flags

None. All changes are render-layer — no new network surface, no auth path, no schema or storage change. The `color-mix()` arbitrary-value falls within the threat-model's mitigate disposition (Tailwind v4 + Next.js 16 + modern Safari support it; the affected surface is a hover state, so a fallback would be visually undetectable).

## Self-Check

- [x] `frontend/components/ShortlistCard.tsx` modified — FOUND
- [x] `frontend/components/VoteSummary.tsx` modified — FOUND
- [x] `frontend/components/CookingBanner.tsx` modified — FOUND
- [x] `frontend/components/CookingLogCard.tsx` modified — FOUND
- [x] `frontend/components/RatingPicker.tsx` modified — FOUND
- [x] `frontend/app/cooking-logs/page.tsx` modified — FOUND
- [x] `frontend/app/cooking-logs/[id]/page.tsx` modified — FOUND
- [x] `frontend/app/styleguide/page.tsx` modified — FOUND
- [x] Commit `7ffaa74` — FOUND
- [x] Commit `c0043aa` — FOUND

## Self-Check: PASSED
