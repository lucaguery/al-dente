---
phase_id: 36-sober-kitchen-finish-polish
phase_name: Sober Kitchen finish + polish (v0.7.1)
review_date: 2026-05-18T18:23:26Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - backend/app/cli/seed.py
  - docs/design-system.html
  - frontend/app/globals.css
  - frontend/app/recipes/[id]/page.tsx
  - frontend/app/recipes/page.tsx
  - frontend/components/BottomNav.tsx
  - frontend/components/HomeDecide.tsx
  - frontend/components/RecipeCard.tsx
  - frontend/components/RecipeRow.tsx
  - frontend/components/VersionFooter.tsx
  - frontend/components/VoteSummary.tsx
  - frontend/lib/i18n/fr.json
  - frontend/lib/recipes.ts
status: issues_found
findings:
  critical: 0
  warning: 2
  info: 6
  total: 8
---

# Phase 36: Code Review Report

**Reviewed:** 2026-05-18T18:23:26Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Phase 36 (v0.7.1 Sober Kitchen finish + polish) closes 12 requirements across SOBER-09..16 and POLISH-01..04. The biggest surface — SOBER-09 first-paint ledger — is structurally sound: invariant #2 (`computeVoteState` as canonical state derivation) is preserved, the dual-mode swipe-deck-then-ledger toggle is retired in `HomeDecide.tsx`, and the Phase 34 LIVE-04 marginalia branch guard correctly stays in place as defense-in-depth. POLISH-01 NBSP sweep delivered the `.meta-sep` utility cleanly with the documented one-line residual in `VoteSummary.tsx:266` (multi-line JSX limitation — contextually valid). POLISH-02 push-banner relocation is applied to both render branches. SOBER-14 seed bump is idempotent (direct assignment after the cooking-log denorm loop on a slug not in `log_specs`).

Two **WARNING** findings: (1) `VoteSummary.tsx`'s inline `borderColor: "var(--border)"` on the row container overrides the SOBER-15 `.row-state-rejete` rule's `border-left` color (specificity loss — destructive-tint border-left never renders); (2) the retired `ShortlistDeck.tsx` component file is no longer imported anywhere in the source tree but the file itself remains on disk — dead code with a substantial blast radius (the entire swipe-deck composition lives there). Six **INFO** items cover minor smells (unused props, redundant cast, divergence from the design-system mockup's CTA-label translateY, an orphan `cook_named` i18n key, a documented but user-visible cook_count/last_cooked asymmetry from SOBER-14, and a defensive `?? 2` on `Array.length` that can't be nullish).

No CRITICAL findings. No security regressions. No invariant violations.

## Warnings

### WR-01: Inline `borderColor` style overrides SOBER-15 muted-destructive border-left

**File:** `frontend/components/VoteSummary.tsx:194-202`
**Issue:** The row container applies an inline `style={rowStyle}` whose non-validé branch sets `borderColor: "var(--border)"`. Inline-style property declarations always win over external stylesheet rules regardless of specificity. The new SOBER-15 CSS rule in `globals.css:636-640`:

```css
.shortlist-row.row-state-rejete {
  opacity: 0.6;
  color: var(--color-muted-foreground);
  border-left: 2px solid color-mix(in oklch, var(--destructive) 50%, transparent);
}
```

sets `border-left-color` via the `border-left` shorthand. The inline `borderColor` (longhand for all four `border-{side}-color`) overrides `border-left-color`, leaving a 2px solid `var(--border)`-colored left edge instead of the intended destructive tint. The opacity dim still applies; the color signal does not.

CONTEXT.md §SOBER-15 specifies "thin destructive-border-left rule" as a load-bearing visual signal of the muted Rejeté state (Decision rationale: "Validé tint → Pressenti mid-tint → Contesté alert-tint → Rejeté muted-tint → Sans avis neutral-border"). The destructive tint is the disambiguator between "Sans avis neutral" and "Rejeté muted"; losing it collapses the bottom of the visual gradient.

**Fix:** Either branch the inline style on `isRejete` (skip `borderColor` for rejete rows), or move the rejete row's `border-left` to `border-left-width` + `!important` for color, or split the row's border styling fully into CSS classes (preferred). Smallest patch:

```tsx
const rowStyle: CSSProperties = isValide
  ? {
      background: "var(--valide-tint)",
      borderColor: "var(--color-valide-border-faint)",
    }
  : isRejete
    ? { background: "var(--card)" } // let .row-state-rejete own borders
    : {
        background: "var(--card)",
        borderColor: "var(--border)",
      };
```

### WR-02: `ShortlistDeck.tsx` is orphaned dead code (~190 LOC)

**File:** `frontend/components/ShortlistDeck.tsx` (entire file)
**Issue:** Plan 36-06 retired the dual-mode swipe-deck-then-ledger toggle in `HomeDecide.tsx` and removed the `ShortlistDeck` import (verified via `grep -rln "import.*ShortlistDeck"` returning zero matches in `frontend/app` and `frontend/components`). The component file itself was not deleted. The only references to `ShortlistDeck` in the source tree are:

- `ShortlistDeck.tsx` itself (file body — ~190 LOC)
- `ShortlistCard.tsx:50, 166` (comments)
- `VoteSummary.tsx` (comments only)
- `tests/e2e/shortlist-vote.spec.ts:9, 130` (comments)

The 36-06 SUMMARY explicitly states "the `ShortlistDeck` import removed" but does not document deletion of the file. This contradicts the project's MVP-posture rule in `CLAUDE.md` ("No backward-compatibility shims for breaking schema or API changes. Do clean rewrites: drop old column / endpoint / type, add new shape, rewrite callers in the same change.").

The file imports `framer-motion`, `sonner`, `next-intl`, `ShortlistCard`, `lib/votes`, `lib/recipes` — if any of those modules' APIs evolves, `ShortlistDeck.tsx` will silently break or drag along a stale dependency. Worse, the file's `postVote` import wires it into the network layer; a future grep for "callers of postVote" will surface a phantom caller.

**Fix:** Delete `frontend/components/ShortlistDeck.tsx`. Update the residual comment references in `ShortlistCard.tsx:50, 166` and `tests/e2e/shortlist-vote.spec.ts:9, 130` to reference `VoteSummary.tsx` (the current consumer of the optimistic-vote flow) or drop the historical context. Single follow-up commit.

## Info

### IN-01: Unused `onDelegate` + `delegateInFlight` props on `VoteSummary`

**File:** `frontend/components/VoteSummary.tsx:96-99`
**Issue:** `VoteSummary` accepts `onDelegate` and `delegateInFlight` as required-shape props and destructures them as `_onDelegate` / `_delegateInFlight` (underscore convention for "intentionally unused"). `HomeDecide.tsx:598-601` passes both. The component renders no « Tu décides » CTA — the new ledger composition drops the delegate affordance from the bottom area. Wiring is alive but does nothing.

**Fix:** Either remove the props from `VoteSummaryProps` and stop passing them from `HomeDecide`, or restore the delegate CTA per `home.summary.delegate_cta` i18n key (which is still in `fr.json:55`). Choose one — current state is dead-wiring.

### IN-02: Stale `home.cta.cook_named` i18n key

**File:** `frontend/lib/i18n/fr.json:28`
**Issue:** `home.cta.cook_named` (`"Cuisiner {title}"`) was replaced by `home.cta.cook_short` in Plan 36-06. The new key is consumed at `VoteSummary.tsx:309`; the old key has no live consumers (verified — only stale `.next` build cache contains references). 36-06 SUMMARY: "existing `home.cta.cook_named` retained ... safe to remove in a follow-up cleanup plan if no consumer surfaces."

**Fix:** Remove `cook_named` from `fr.json:28` in a follow-up; MVP posture forbids retaining unused i18n keys.

### IN-03: Defensive `?? 2` on `Array.length` is unreachable

**File:** `frontend/components/HomeDecide.tsx:481`
**Issue:** `computeVoteState(recipeVotes, session.members.length ?? 2)`. `Array.prototype.length` is always a non-null `number` — the nullish-coalescing operator's right operand can never be evaluated. Compare with line 461 which calls the same function with `session.members.length` (no fallback) — inconsistent. Adds noise.

**Fix:** Drop `?? 2`; rely on `session.members.length` directly (or, if a real fallback for `members === undefined` is wanted, defend before reading `.length`).

### IN-04: Unnecessary `as ShortlistVote[]` cast

**File:** `frontend/components/VoteSummary.tsx:184`
**Issue:** `const recipeVotes = votes.filter(...) as ShortlistVote[]`. `votes` is already typed `ShortlistVote[]` via `VoteSummaryProps`; `.filter()` preserves the element type. The cast is a no-op.

**Fix:** Drop ` as ShortlistVote[]`.

### IN-05: BottomNav CTA label does not match design-system translateY spec

**File:** `frontend/components/BottomNav.tsx:103, 107`
**Issue:** `docs/design-system.html:580-587` declares the central-CTA mockup with `.cta-pill { transform: translateY(-12px); }` AND `.cta-label { transform: translateY(-8px); }`. The implementation lifts only the inner pill `<span>` (`-translate-y-3` ≡ -12px); the label `<span>{t("add")}</span>` at line 107 has no transform. This leaves the label parked at the original baseline and increases the gap between pill and label by ~12px vs. the documented mockup.

This is the divergence the SOBER-16 design-system update introduced — `bottom-nav-cta .cta-label { transform: translateY(-8px); }` exists in the doc but has no implementation counterpart. The design-system mockup and the shipped UI now disagree on label position.

**Fix:** Either lift the label too (e.g. add `<span className={`${active ? "text-primary" : "text-foreground-muted"} -translate-y-2`}>`) or drop `.cta-label { transform: translateY(-8px); }` from `docs/design-system.html:587` to re-align the source-of-truth.

### IN-06: SOBER-14 seed bump produces a documented but user-visible asymmetry

**File:** `backend/app/cli/seed.py:582-588`
**Issue:** `risotto-champignons.cook_count = 12` is set after the cooking-log denorm loop, but `last_cooked_at` is left `None`. On the dev seed, this recipe renders with patina-3 (dogear visible) AND the subhead `"Jamais cuisinée"` (`recipes.never_cooked` per `recipes/[id]/page.tsx:780` and `RecipeCard.tsx:155`). 36-04 SUMMARY: "the card subhead reads 'Jamais cuisinée' but cookCountToPatina(12) = 3 still drives the dogear ... a future follow-up can set `now - timedelta(days=30)` if the subhead reads awkwardly."

This is documented as intentional but is a contradiction in the dev UX — a recipe that is "Héritage" (cooked many times) but "Jamais cuisinée" (never cooked). The seed-only scope makes this a low-priority cosmetic issue; it does NOT affect prod-synthetic seed (Plan 36-04 explicitly out-of-scope).

**Fix:** Set `_dogear_recipe.last_cooked_at = now - timedelta(days=30)` to remove the contradiction (single-line addition, idempotent on re-run because `now` recomputes).

## Verification Summary

- **SOBER-09 first-paint ledger (HomeDecide.tsx):** `computeVoteState` called twice (lines 461, 481) for canonical state derivation per invariant #2. Phase 34 LIVE-04 marginalia branch guard preserved at lines 478-491. `unvotedByMe` derived from `dealableRecipes` (rejete-stripped) and excludes already-voted recipes via `myVotes` set lookup. No client-side promotion. PASS.
- **SOBER-15 muted Rejeté:** `.row-state-rejete` CSS rule cleanly composes with `.shortlist-row` (compound selector requires both classes — defense-in-depth). The `isRejete` className composition reads cleanly. Inline-style border override is the issue (WR-01). PARTIAL.
- **SOBER-10 BottomNav elevation:** `-translate-y-3 shadow-card` applied ONLY inside the `variant === "central-cta"` branch (lines 80-111); flat-tab branch (lines 116-140) byte-identical to pre-Phase-36. PASS (with IN-05 label-position note).
- **SOBER-11 Patine empty-bucket:** `<PatinaSection>` renders unconditionally for all three buckets with `recipes.length === 0` branch swapping to `<Marginalia size="sm" slant>{emptyLabel}</Marginalia>`. New `home.library.patina_section.empty` key resolved via `useTranslations("home.library.patina_section")`. PASS.
- **POLISH-01 NBSP sweep:** Documented one-line residual at `VoteSummary.tsx:266` is the `{" · "}` literal text inside the meta-sep span opened on line 265 (multi-line JSX limitation, contextually valid — confirmed by direct file read). PASS.
- **POLISH-02 push banner:** Mounted below the shortlist in both branches (empty-state branch at line 438, main render at line 609); first paint now H1 + marginalia. PASS.
- **POLISH-03 all-text-pills:** All four meta pills in `recipes/[id]/page.tsx:803-816` render bare `<span className="badge">` (no leading `<Clock>` / `<Timer>` / `<Flame>` icons). PASS.
- **POLISH-04 truncated CTA:** Fixed-length « Cuisiner ce soir » CTA + Caveat-slant title underneath (`VoteSummary.tsx:300-320`). 320px-safe. PASS.
- **SOBER-14 seed bump idempotency:** `_dogear_recipe.cook_count = 12` is direct assignment after `db.merge()`, placed AFTER the cooking-log denorm loop on a slug not in `log_specs` (ragu/poulet-citron/burger-classique). Re-runs converge on cook_count=12. PASS (with IN-06 cosmetic note).
- **Invariant #2 (voting computed, not stored):** No `state` column added; all state computed via `computeVoteState`. PASS.
- **Invariant #6 (next-intl):** All new user copy routed through `useTranslations`. PASS.
- **i18n key shadowing:** `home.cta.cook_short` and `home.library.patina_section.empty` are new, distinct keys; no shadowing of existing keys (verified). PASS.

---

_Reviewed: 2026-05-18T18:23:26Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
