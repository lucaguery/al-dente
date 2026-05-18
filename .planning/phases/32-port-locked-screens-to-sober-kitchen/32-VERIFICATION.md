---
phase: 32-port-locked-screens-to-sober-kitchen
verified: 2026-05-18T14:30:00Z
status: human_needed
score: 6/6
overrides_applied: 0
post_verify_fix:
  - commit: "1872d2b"
    message: "fix(32): restore Wave 1 globals.css + layout.tsx (reverted by 32-02 worktree base drift)"
    closes_gaps: ["truth-1 (sober tokens)", "truth-2 (utility CSS)", "truth-3 (Caveat font)"]
    verified_post_fix:
      - "grep --primary in globals.css now returns oklch(0.50 0.10 32) (sober value present)"
      - "grep -c 'Caveat' layout.tsx returns 2 (font imported + variable mounted)"
      - "grep -c 'marginalia|ledger-card|table-scene|loader-brand' globals.css returns 23 (utility classes restored)"
      - "Next.js webpack build passes 15/15 routes"
human_verification:
  - test: "Accueil, Bibliothèque, and Recette — Détail match the locked-screen reference in docs/design-system.html — side-by-side visual pass on a real iPhone"
    expected: "Layout, type scale, spacing, and identity tokens (terracotta sober palette, patine cards, table-à-manger scene, Caveat marginalia) all match the locked reference screens"
    why_human: "Visual fidelity requires a physical iPhone PWA screenshot compared to the HTML spec — cannot be verified by grep or static analysis"

  - test: "Patine treatment on recipe cards — freshly captured recipe (0 cooks) shows lightest patine; frequently cooked recipe (>10 cooks) shows heaviest patine"
    expected: "cookCountToPatina(0) → patina=0 renders un-aged card; cookCountToPatina(11) → patina=3 renders darkest patine treatment (dogear, amber grain, darker border)"
    why_human: "CSS calc() on --patina inline style requires visual confirmation that the patine overlay renders correctly at each tier"

  - test: "iOS PWA Caveat §15.D gate — Marginalia text actually renders in Caveat handwriting (not generic cursive fallback) once PWA is installed"
    expected: "PinLabel labels, Accueil subhead, Recette identity subhead all render in recognizable Caveat script"
    why_human: "next/font/google self-hosts at build time; iOS Safari PWA fallback behavior requires on-device verification"

  - test: "Table-à-manger scene visual distinctness — all five computed states (Validé / Pressenti / Contesté / Rejeté / Sans avis) are visually distinct within the scene"
    expected: "seat-state-valide (green halo), seat-state-pressenti (terracotta ring inset), seat-state-neutral (faded/grayscale), seat-state-rejected (pushed outward + grayscale), seat-state-contested (strike-through bar)"
    why_human: "CSS class visual distinctness requires browser rendering — particularly seat-state-contested::after strike position and the directional push on seat-state-rejected"
---

# Phase 32: Port Locked Screens to Sober Kitchen — Verification Report

**Phase Goal:** Every screen a user touches daily renders with the locked Sober Kitchen identity — terracotta tokens, patine recipe cards, the table-à-manger voting scene, Caveat marginalia, and the brand-mark loader — replacing all ad-hoc CSS the system supersedes.
**Verified:** 2026-05-18T14:00:00Z (initial); 2026-05-18T14:30:00Z (post-fix)
**Status:** human_needed (automated gaps closed by commit `1872d2b`; iOS PWA visual gates remain)
**Re-verification:** Post-fix re-grep confirmed all three reverted-file gaps closed.

## Post-Verifier Fix (commit 1872d2b)

The verifier's gaps 1-3 (all rooted in the same worktree-revert root cause) were closed by `git checkout b6a98ef -- frontend/app/globals.css frontend/app/layout.tsx`. Re-grep confirms:

- `grep "oklch(0.50 0.10 32)" frontend/app/globals.css` returns the sober `--primary` value
- `grep -c "Caveat" frontend/app/layout.tsx` returns `2` (Caveat import + `${caveat.variable}` on `<html>`)
- `grep -c "marginalia\|ledger-card\|table-scene\|loader-brand" frontend/app/globals.css` returns `23`
- `frontend/.next` webpack build: 15/15 routes compile clean

All 6 automated truths now pass. The 4 `human_verification` items below remain as standard iOS PWA visual gates (the §15.D Caveat-load-on-standalone check + side-by-side composition match against `docs/design-system.html`).

## Root Cause of Original Gaps

A worktree merge commit (`e864fd0`, "restore plan artifacts wiped by worktree merge") inadvertently reverted the working-tree state of `frontend/app/globals.css` and `frontend/app/layout.tsx` back to their pre-32-01 values. The commit was intended to restore planning artifacts (PLAN.md, SUMMARY.md, CONTEXT.md files) that were wiped during a worktree merge, but it also reset these two source files to their pre-phase state.

The consequences cascade: the three REVERTED files (`globals.css` and `layout.tsx`) are the **foundation** that all four phases build on. The four primitive components (Marginalia, LedgerCard, TableVote, BrandLoader) were committed BEFORE the revert in a separate worktree branch and survived as TSX files — but their CSS backing classes, the sober token palette they consume, and the Caveat font they require are all absent from the current HEAD.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | globals.css :root carries the sober OKLCH token palette (§15.A) | FAILED | `grep -c "oklch(0.50 0.10 32)" globals.css` = 0; `--primary` still `oklch(0.595 0.135 35)`; all 14 token swaps absent |
| 2 | New CSS utility classes (.marginalia/.ledger-card/.table-scene/.loader-brand + @keyframes drawLoop) exist in globals.css | FAILED | All grep counts return 0; worktree revert removed the 177-line new @layer utilities block |
| 3 | Caveat font registered in layout.tsx; --font-marginalia available on \<html\> | FAILED | `grep -c "Caveat" layout.tsx` = 0; layout.tsx reverted to pre-32-01; themeColor still #C8553D |
| 4 | Spinner sweep complete: zero animate-spin / Loader2 / Spinner outside BrandLoader.tsx | VERIFIED | `grep -rn "animate-spin" frontend/` (excluding BrandLoader) = 0; `grep -rn "Loader2"` = 0; BrandLoader adopted at 26 call-sites |
| 5 | SOBER-06 invariant #2 intact: no state column in backend votes/shortlist models | VERIFIED | `grep -rn "state.*column\|vote_state" backend/app/models/` = 0 matches |
| 6 | Screen compositions (Accueil A / Bibliothèque 3-view / Recette A) render the Sober Kitchen structure | VERIFIED (partial) | HomeDecide.tsx has Accueil A header; VoteSummary.tsx has TableVote; recipes/page.tsx has 3-view switcher; recipes/[id]/page.tsx has sticky topbar + hero bleed. VISUAL MATCH requires human gate — see human_verification section. |

**Automated Score:** 4/6 truths automated-verifiable (truths 4 and 5 verified; truths 1, 2, 3 failed; truth 6 partial)

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `frontend/app/globals.css` — sober OKLCH tokens | REVERTED | Has old unsober values; all §15.A swaps absent |
| `frontend/app/globals.css` — utility class libraries | REVERTED | .marginalia/.ledger-card/.table-scene/.loader-brand all absent |
| `frontend/app/layout.tsx` — Caveat registration | REVERTED | No Caveat import; old themeColor #C8553D still present |
| `frontend/components/Marginalia.tsx` | VERIFIED | File exists (49 lines), correct implementation, exports Marginalia + MarginaliaProps |
| `frontend/components/BrandLoader.tsx` | VERIFIED | File exists (44 lines), composes BrandIcon, uses .loader-brand CSS class |
| `frontend/components/LedgerCard.tsx` | VERIFIED | File exists (62 lines), inline --patina style, dogear SVG at patina≥3 |
| `frontend/components/TableVote.tsx` | VERIFIED | File exists (136 lines), uses computeVoteState, 5 seat-state classes |
| `frontend/lib/recipes.ts` — cookCountToPatina + groupByPatina | VERIFIED | Both exported; thresholds 0→0, 1-2→1, 3-10→2, >10→3 confirmed |
| `frontend/components/LibraryViewSwitch.tsx` | VERIFIED | File exists (controlled segmented radiogroup) |
| `frontend/components/RecipeRow.tsx` | VERIFIED | File exists (horizontal LedgerCard row for list view) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `layout.tsx` | `globals.css :root` | `caveat.variable` on `<html>` className resolves `--font-marginalia` | NOT_WIRED | Caveat not in layout.tsx; caveat.variable absent from `<html>` className |
| `Marginalia.tsx` | `globals.css` | `.marginalia` CSS class | BROKEN | Component emits correct class name but CSS rule is absent from globals.css |
| `LedgerCard.tsx` | `globals.css` | `.ledger-card` + `--patina` CSS var | BROKEN | Component sets --patina inline style; CSS calc() rules that consume it are absent |
| `TableVote.tsx` | `globals.css` | `.table-scene` + `.seat-state-*` classes | BROKEN | Component emits correct class names; CSS rules absent — no visual rendering |
| `BrandLoader.tsx` | `globals.css` | `.loader-brand` + `@keyframes drawLoop` | BROKEN | Component emits .loader-brand; CSS class and keyframe absent — no animation |
| `TableVote.tsx` | `frontend/lib/votes.ts` | `computeVoteState` | WIRED | Correct import; per-seat state derivation implemented |
| `HomeDecide.tsx` | `VoteSummary.tsx` | `<VoteSummary ...>` with TableVote inside | WIRED | Accueil A composition complete |
| `RecipeCard.tsx` | `LedgerCard.tsx` | `<LedgerCard patina={resolvedPatina}>` | WIRED | RecipeCard wraps body in LedgerCard; CSS classes absent means no visual treatment |
| `sonner.tsx` | `BrandLoader.tsx` | `icons.loading` prop | WIRED | Toaster loading icon = `<BrandLoader size="sm" />` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `HomeDecide.tsx` subhead | `subheadKey` derived from `allRowStates` | `computeVoteState` on live `shortlist.votes` | Yes | FLOWING |
| `VoteSummary.tsx` | `recipeVotes` (per-recipe votes) | Filtered from `shortlist.votes` | Yes | FLOWING |
| `recipes/page.tsx` patina grouping | `grouped` from `groupByPatina(recipes)` | Live API recipe list via `recipesCache` | Yes | FLOWING |
| `RecipeCard.tsx` patina level | `cookCountToPatina(recipe.cook_count)` | Real `cook_count` field on recipe | Yes | FLOWING |
| `recipes/[id]/page.tsx` step-1 marginalia | `recipeLog?.notes` | `fetchCookingLogs(365)` → find-first by recipe_id | Yes (conditional — null when no log with notes) | FLOWING |
| `recipes/[id]/page.tsx` identity subhead | `recipe.cook_count` | Real field from recipe fetch | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| No animate-spin outside BrandLoader | `grep -rn "animate-spin" frontend/ \| grep -v BrandLoader` | 0 matches | PASS |
| No Loader2/Loader2Icon remaining | `grep -rn "Loader2\b\|Loader2Icon" frontend/` | 0 matches | PASS |
| state column absent in backend models | `grep -rn "state.*column\|vote_state" backend/app/models/` | 0 matches | PASS |
| cookCountToPatina thresholds correct | `grep -A12 "cookCountToPatina" lib/recipes.ts` | 0→0, 1-2→1, 3-10→2, >10→3 confirmed | PASS |
| Sober primary token in globals.css | `grep -c "oklch(0.50 0.10 32)" globals.css` | 0 | FAIL |
| .ledger-card CSS class in globals.css | `grep -c ".ledger-card" globals.css` | 0 | FAIL |
| Caveat in layout.tsx | `grep -c "Caveat" layout.tsx` | 0 | FAIL |

### Requirements Coverage

| Requirement | Plans | Description | Status | Evidence |
|-------------|-------|-------------|--------|----------|
| SOBER-01 | 32-01 | Sober tokens in globals.css + Caveat registration + utility CSS classes | BLOCKED | globals.css and layout.tsx reverted by e864fd0 |
| SOBER-02 | 32-03 | Accueil screen port to Sober Kitchen locked layout | VERIFIED | HomeDecide.tsx has Accueil A composition; visual gate is human |
| SOBER-03 | 32-04 | Bibliothèque 3-view port | VERIFIED | recipes/page.tsx has grid/list/patina views with LibraryViewSwitch |
| SOBER-04 | 32-05 | Recette — Détail port | VERIFIED | recipes/[id]/page.tsx has sticky topbar + hero bleed + Sober Kitchen body block |
| SOBER-05 | 32-04 | Patine treatment on recipe cards | VERIFIED (code) | cookCountToPatina + LedgerCard wiring correct; CSS backing absent means no visual treatment (linked to SOBER-01 gap) |
| SOBER-06 | 32-05 | Table-à-manger voting scene; invariant #2 intact | VERIFIED | TableVote.tsx present; computeVoteState used; no state column added; visual gate is human |
| SOBER-07 | 32-02 | Marginalia register — Caveat across locked screens | BLOCKED | Marginalia.tsx component exists and is wired, but CSS backing (.marginalia classes) and Caveat font registration are absent |
| SOBER-08 | 32-02 | Brand-mark loader replaces all spinners | VERIFIED | animate-spin = 0; Loader2 = 0; BrandLoader at 26 call-sites; CSS backing (.loader-brand + drawLoop) absent from globals.css (linked to SOBER-01) |

**Note on SOBER-07 and SOBER-08:** The REQUIREMENTS.md shows these as `[ ]` (unchecked) — this matches the verification finding. Plans 32-02 claimed them complete, but they depend on SOBER-01 (globals.css foundation) which was reverted.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/app/globals.css` | 153 | `--primary: oklch(0.595 0.135 35)` — old unsober value | BLOCKER | All terracotta token consumers render the pre-sober (more saturated) primary; .text-display still italic |
| `frontend/app/globals.css` | 214-223 | Old member-bg hexes (#F43F5E etc.) | BLOCKER | TableVote seat backgrounds use old saturated member colors |
| `frontend/app/layout.tsx` | 40 | `themeColor: "#C8553D"` — old value | Warning | iOS PWA chrome color shows old terracotta |
| `frontend/components/RecipeThread/index.tsx` | 346 | `boxShadow: "0 2px 6px oklch(0.595 0.135 35 / 0.25)"` — ad-hoc old oklch literal | Warning | Criterion 1 violation: ad-hoc oklch literal duplicates the (old) primary token value directly |

### Human Verification Required

#### 1. Sober Kitchen Visual Match — Three Locked Screens on iPhone

**Test:** After the SOBER-01 gap is closed (globals.css and layout.tsx restored), install the PWA on a real iPhone and open the three daily-use screens side-by-side with `docs/design-system.html` in a browser tab. Compare: Accueil (table-à-manger shortlist, date header, Caveat slant subhead), Bibliothèque (grid default view, patine cards), Recette — Détail (sticky topbar, 16:10 hero bleed, Caveat identity subhead, terracotta ingredient quantities).
**Expected:** Layout, type scale, spacing, and color treatment match the locked reference screens within visual tolerance; no layout breakage on iPhone-shaped viewport.
**Why human:** Visual fidelity requires physical iPhone rendering — responsive layout and font rendering cannot be verified by static analysis.

#### 2. Patine Treatment Tier Verification

**Test:** Open Bibliothèque grid view, find a recipe with 0 cooks (essai tier) and one with 10+ cooks (héritage tier). Compare card appearance.
**Expected:** 0-cook card shows the lightest patine (clean card surface, no dogear); 10+-cook card shows heaviest patine (warm amber tone, grain texture, dogear corner fold).
**Why human:** CSS calc() on --patina inline style produces subtle overlays that require visual inspection to confirm correct rendering across tiers.

#### 3. iOS PWA Caveat §15.D Gate

**Test:** After globals.css and layout.tsx are restored, build and deploy. On an iOS device with the PWA installed, navigate to a recipe detail page and observe the identity subhead, any PinLabel labels, and the Accueil subhead.
**Expected:** All Marginalia/PinLabel text renders in recognizable Caveat handwriting script (not generic cursive).
**Why human:** next/font/google self-hosts Caveat at build time; the font may render differently between local dev and the deployed PWA on iOS Safari.

#### 4. Table-à-Manger Five State Visual Distinctness

**Test:** Navigate to a shortlist with recipes in varied vote states. Observe the TableVote scene in each row.
**Expected:** Five states are visually distinguishable: Validé (green halo seats), Pressenti (terracotta ring), Contesté (one green + one strike-through), Rejeté (both pushed outward, grayscale), Sans avis (both faded, grayscale).
**Why human:** CSS class visual distinctness — particularly the `seat-state-contested::after` strike-through bar and the directional translateX/Y push for rejected seats — requires browser rendering to confirm.

### Gaps Summary

**Root cause: Worktree merge revert.** Commit `e864fd0` ("restore plan artifacts wiped by worktree merge") reset `frontend/app/globals.css` and `frontend/app/layout.tsx` to their pre-32-01 state. This commit was intended only to restore `.planning/` directory artifacts (PLAN.md/SUMMARY.md files) but also reset the two source files.

**Three gaps block the phase goal:**

1. **SOBER-01 Token Foundation (globals.css tokens)** — The 14 §15.A OKLCH/hex token swaps, 3 new `:root` tokens (--font-marginalia, --patina, --duration-slow), member-bg desaturation, shadow halving, and .text-display italic removal are absent.

2. **SOBER-01 CSS Utility Library (globals.css classes)** — The 177-line new `@layer utilities` block with 27 CSS classes across 4 primitive libraries (.marginalia, .ledger-card, .table-scene, .loader-brand), plus @keyframes drawLoop, is absent.

3. **SOBER-01 Font Registration (layout.tsx)** — Caveat import, const definition, and caveat.variable on `<html>` are absent.

**What this means in practice:** The four Sober Kitchen primitive components (Marginalia, LedgerCard, TableVote, BrandLoader) exist as TSX files and are correctly wired into the screen compositions — but they have NO visual treatment at runtime because their CSS backing classes don't exist. The app renders:
- Marginalia text in generic cursive (not Caveat)
- LedgerCard children on an unstyled div (no patine overlays, no grain, no border treatment)
- TableVote as unstyled spans floating without the round-table plate visual
- BrandLoader as a static SVG (no stroke-dasharray animation, no drawLoop)

**Fix is mechanical:** Re-apply the content from commits `dd7e97b` (token swaps), `af9ed2b` (Caveat), and `6a5df5c` (utility classes) to the current working tree. These commits are still in git history — the content can be cherry-picked or the files replaced from those commits. No new design decisions are needed.

---

_Verified: 2026-05-18T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
