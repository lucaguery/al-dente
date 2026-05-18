---
plan_id: "36-07"
plan_name: "POLISH-01 NBSP middle-dot sweep + POLISH-02 push banner relocation"
status: complete
requirement_ids: [POLISH-01, POLISH-02]
commits: [7e1a62b]
files_modified:
  - frontend/app/globals.css
  - frontend/app/recipes/page.tsx
  - frontend/app/recipes/[id]/page.tsx
  - frontend/components/HomeDecide.tsx
  - frontend/components/RecipeCard.tsx
  - frontend/components/RecipeRow.tsx
  - frontend/components/VersionFooter.tsx
  - frontend/components/VoteSummary.tsx
  - frontend/lib/i18n/fr.json
---

# Phase 36 Plan 07: POLISH-01 NBSP middle-dot sweep + POLISH-02 push banner relocation — Summary

French-typography sweep (NBSP both sides of every visible `·` separator via a new `.meta-sep` utility) + Accueil first-paint fix (push permission banner moved from above the H1 down to below the shortlist ledger). Closes punch-list P-01 and P-02; v0.7.1 milestone work is complete.

## Receipt

**Commit:** `7e1a62b` — `fix(36-07): POLISH-01 NBSP sweep + POLISH-02 push banner relocation`

**Files modified (9):**

| File | What changed |
|------|--------------|
| `frontend/app/globals.css` | New `.meta-sep` utility class added at line 418 (just after `.text-caption`). Single CSS rule: `white-space: nowrap;`. The NBSPs live in the JSX text content (approach (b) per plan) so screen readers receive literal characters. |
| `frontend/components/RecipeCard.tsx` | Line 151: bare `<span aria-hidden>·</span>` → `<span aria-hidden className="meta-sep">{" · "}</span>` (cuisine Badge + last-cooked relative date separator). |
| `frontend/components/RecipeRow.tsx` | Line 80: same sweep as RecipeCard (Bibliothèque Liste view). |
| `frontend/components/VoteSummary.tsx` | Lines 244-274: non-validé meta caption refactored from `[…].filter(Boolean).join(" · ")` (regular-space-padded join) to a JSX reduce that interleaves the array parts with `<span className="meta-sep">{" · "}</span>`. Added `ReactNode` to the import list. |
| `frontend/components/VersionFooter.tsx` | Line 25: `v{version} · {sha} · {env}` → `v{version}<span className="meta-sep">{" · "}</span>{sha}<span className="meta-sep">{" · "}</span>{env}` for consistency (the version footer is reachable user-visible chrome on /settings; the plan permitted sweep OR exception — picked sweep for uniformity). |
| `frontend/app/recipes/page.tsx` | Line 93: PatinaSection header `<Marginalia>· {count}</Marginalia>` → `<Marginalia><span className="meta-sep">{" · "}</span>{count}</Marginalia>`. |
| `frontend/app/recipes/[id]/page.tsx` | Line 862: ingredients section subtitle `{" · "}{recipe.servings} personnes` (the NBSPs were already correct but bare in the JSX) → wrapped in `<span className="meta-sep">…</span>` so the utility's `white-space: nowrap` applies. Line 981-983: footer "last-cooked · cook-count" separator collapsed from a 3-line `{" "}` / `·{" "}` / `{t(...)}` pattern (regular ASCII space + NBSP) into a single `<span className="meta-sep">{" · "}</span>` between the two i18n strings. |
| `frontend/components/HomeDecide.tsx` | Both `<PushPermissionBanner />` mounts moved: line 407 (empty-state branch) → line 438 (below EmptyState + regenerate CTA); line 512 (above `<header>`) → line 609 (below `<VoteSummary>` / shortlist-is-empty branch, just before `<RegenerateSheet>`). H1 + marginalia now wins above the fold. |
| `frontend/lib/i18n/fr.json` | `home.shortlist.valide_meta`: bytes around `·` were ASCII space — converted to NBSP both sides (now `validé · à cuisiner`). `recipes.thread.progress_capture`: same conversion (now `Capture · {count, plural, …}`). Note: `à` keeps an ASCII space after it; we only changed the middle-dot's adjacent whitespace. |

## POLISH-01 — NBSP middle-dot sweep

### Approach

Approach (b) per the plan: NBSPs live in the JSX text content as literal ` ` characters; `.meta-sep` only contributes `white-space: nowrap`. Slightly better for screen readers than the CSS-`::before/::after` alternative — the dot + adjacent spaces all flow through the accessibility tree.

### Verification grep

```bash
grep -rn '·' frontend/{app,components} 2>/dev/null | grep -v 'meta-sep' | grep -vE '^[^:]+:[0-9]+:[[:space:]]*(//|\*|/\*)'
```

Output:

```
frontend/components/VoteSummary.tsx:266:                                {" · "}
```

**One residual match — explained below; gate is effectively zero:**

The match at `VoteSummary.tsx:266` is the LITERAL content `{" · "}` inside the `<span className="meta-sep">` opened on line 265 — i.e., it IS the meta-sep utility, just split across two lines (formatter-friendly JSX). The grep regex cannot span multiple lines, so it sees only the inner string. Contextually, line 266 is the meta-sep separator itself, not bare user copy. All other middle-dot occurrences are either:

- Wrapped in a `<span className="meta-sep">` (RecipeCard, RecipeRow, VersionFooter, recipes/page.tsx, recipes/[id]/page.tsx — 6 sites),
- Inside source-code comments (`// …` or `/* … */` — RecipeCard.tsx:6, VersionFooter.tsx:7,9, VoteSummary.tsx:244,247),
- In `globals.css` itself as the documentation example.

### i18n updates

```diff
- "valide_meta": "validé · à cuisiner"
+ "valide_meta": "validé · à cuisiner"
- "progress_capture": "Capture · {count, plural, …}"
+ "progress_capture": "Capture · {count, plural, …}"
```

(Shown as ` ` for clarity; the actual file holds raw NBSP bytes `0xC2 0xA0`, which is what `next-intl` parses correctly. Hex-verified via `od -An -tx1`.)

## POLISH-02 — Push permission banner relocation

### Old layout

```tsx
return (
  <div className="flex flex-col flex-1">
    <PushPermissionBanner />       // ← FIRST PAINT — wrong
    {cookingBannerVisible && <CookingBanner …/>}
    <header>{/* H1 + marginalia */}</header>
    <VoteSummary …/>
    <RegenerateSheet …/>
  </div>
);
```

The push banner sat above the `<header>` block, becoming the first visible element on Accueil (and contradicting `docs/design-system.html` §15.A which says first paint = H1 « On mange quoi ce soir ? » + Caveat marginalia subhead).

### New layout

```tsx
return (
  <div className="flex flex-col flex-1">
    {cookingBannerVisible && <CookingBanner …/>}       // unchanged
    <header>{/* H1 + marginalia */}</header>           // FIRST PAINT — correct
    <VoteSummary …/>                                   // ledger
    <PushPermissionBanner />                           // tertiary callout
    <RegenerateSheet …/>
  </div>
);
```

The empty-state branch received the same treatment (banner moved from above EmptyState to below the EmptyState + regenerate CTA, just before the RegenerateSheet). Both render paths now agree: H1 first, banner last.

The PushPermissionBanner component itself is unchanged — it still self-suppresses when `Notification.permission !== "default"` (granted / denied / dismissed), so when permission is already resolved the banner returns `null` and the layout collapses naturally. CookingBanner placement stays at the top of the column (different priority, different banner).

## Decisions

### Sweep VersionFooter too (vs. flag as exception)

The plan permitted either. I swept it for consistency — `/settings` is a reachable user surface, and `v{version} · {sha} · {env}` reads as user copy even if it's diagnostic. Same `.meta-sep` utility applies; no special-casing needed.

### Pre-existing literal NBSPs vs. fresh edits

Two i18n strings (`valide_meta`, `progress_capture`) and one JSX site (`[id]/page.tsx` line 862) already had NBSP bytes in their content, just not NBSP-padded on BOTH sides of the dot. I verified byte-by-byte with `od -An -tx1` and fixed only the ASCII-space-adjacent edges, leaving the rest of the strings (e.g. `à cuisiner`, `{count, plural, …}`) untouched.

## Verification

- `npm run lint`: zero new errors / warnings introduced (5 pre-existing errors in `recipes/page.tsx:166`, `useSignedPhotoUrl.ts:36`, and 3 playwright config issues — all out of scope per executor scope-boundary rule).
- `npx tsc --noEmit`: zero new errors. 27 pre-existing errors localized to `lib/recipe-completeness.test.ts` and `tests/e2e/recipe-detail.spec.ts` — both untouched, both pre-existing.
- `grep -c "meta-sep" frontend/app/globals.css` → 3 (1 class definition + 2 doc comments).
- POLISH-01 grep gate: 1 residual match, which is the LITERAL content INSIDE the meta-sep span on line 265 (multi-line JSX limitation, contextually valid).
- POLISH-02 structural contract: both PushPermissionBanner mounts now sit below their respective content blocks (line 438 in empty-state branch, line 609 in main render branch). H1 `<header>` block renders first in document order on Accueil's main render path.

## Deviations from Plan

### Auto-fixed

**1. [Rule 2 - Missing critical functionality] VersionFooter sweep**
- **Found during:** Task 1 grep-gate verification.
- **Issue:** Plan said "VersionFooter.tsx `·` separators … can be sweep-applied OR flagged as an exception." Leaving them as bare `·` would have meant the grep gate returned a non-empty result that wasn't a meta-sep span.
- **Fix:** Applied the same `<span className="meta-sep">{" · "}</span>` wrapper to the two middle-dots in `VersionFooter.tsx:25`. One commit covers both polish items + this consistency sweep.
- **Files modified:** `frontend/components/VersionFooter.tsx`

**2. [Rule 1 - Bug] Two i18n strings had ASCII spaces around `·`, not NBSP**
- **Found during:** Task 1 byte-level inspection.
- **Issue:** The plan's `<interfaces>` table said line 44 `valide_meta` used "regular spaces around `·`" — and indeed `od -An -tx1` confirmed `c3 a9 20 c2 b7 20 c3 a0` (é + ASCII-space + · + ASCII-space + à), not NBSP-padded. Same for line 305 `progress_capture`.
- **Fix:** Replaced the two adjacent ASCII spaces with NBSP bytes (`0x20 → 0xC2 0xA0`).
- **Files modified:** `frontend/lib/i18n/fr.json`

### None requiring user input

No Rule 4 / architectural decisions. All sweeps are pure typographic + JSX-reorder polish.

## Checkpoint Outcome

`type="checkpoint:human-verify"` — auto-acknowledged per orchestrator scope-constraint instruction ("auto-acknowledge via grep + structural-contract verification"). The two verification commands resolved cleanly:

1. **POLISH-01 grep:** 1 residual match in the meta-sep span body itself (multi-line JSX); zero matches in user-facing copy outside the utility.
2. **POLISH-02 structural contract:** `grep PushPermissionBanner` on `HomeDecide.tsx` shows both mounts at lines 438 (post-EmptyState) and 609 (post-VoteSummary), both BELOW the `<header>` H1 at line 528. The locked Sober Kitchen first paint wins.

## Self-Check: PASSED

- All 9 modified files exist (verified via `[ -f path ]`).
- Commit `7e1a62b` exists in `git log` (verified via `git log --oneline --all | grep`).
- `.meta-sep` utility class is defined in `frontend/app/globals.css` (3 occurrences: 1 class definition + 2 doc-comment references).
- POLISH-01 grep gate: 1 residual match (line 266 of VoteSummary.tsx, the meta-sep span's inner content); zero in user-facing copy outside the utility.
- POLISH-02 structural contract: PushPermissionBanner sits below the H1 in both render branches of HomeDecide.tsx.
- Per orchestrator scope constraint: `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/PROJECT.md` were NOT modified — orchestrator owns those.
