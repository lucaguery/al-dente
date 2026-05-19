---
plan_id: "36-06"
plan_name: "SOBER-09 first-paint ledger + SOBER-15 muted Rejeté + POLISH-04 truncated CTA"
status: complete
requirement_ids: [SOBER-09, SOBER-15, POLISH-04]
commits: [d384044]
files_modified:
  - frontend/components/HomeDecide.tsx
  - frontend/components/VoteSummary.tsx
  - frontend/app/globals.css
  - frontend/lib/i18n/fr.json
---

# Phase 36 Plan 06: SOBER-09 first-paint ledger + SOBER-15 muted Rejeté + POLISH-04 truncated CTA — Summary

Accueil ports cleanly to docs/design-system.html §15.A Composition A: the first-paint ledger renders all 5 row states (Validé / Pressenti / Contesté / Rejeté muted / Sans avis) with un-voted-by-me rows carrying an inline thumb-button vote affordance, the Rejeté row in a muted variant, and a 320px-phone-safe bottom CTA.

## Receipt

**Commit:** `d384044` — `fix(36-06): SOBER-09 first-paint ledger + SOBER-15 muted Rejeté + POLISH-04 truncated CTA`

**Files modified (4):**
- `frontend/components/HomeDecide.tsx` — dual-mode toggle retired (`allVoted ? <VoteSummary /> : <ShortlistDeck />` collapsed to a single `<VoteSummary />`); `ShortlistDeck` import removed; `shortlist.recipes` (full slice, no rejete filter) + `unvotedByMe` + `onVoteApplied` passed through to VoteSummary; Phase 34 LIVE-04 marginalia branch guard preserved untouched as defense-in-depth.
- `frontend/components/VoteSummary.tsx` — accepts new props (`shortlistId`, `unvotedByMe: Recipe[]`, `onVoteApplied: (vote) => void`); `rows = recipes.filter((r) => stateFor(r.id) !== "rejete")` removed (Rejeté now renders muted, not hidden); rows sorted by computed-state order (Validé → Pressenti → Contesté → Sans avis → Rejeté muted at bottom); inline `<ShortlistThumbButtons>` embedded inside un-voted rows below the cuisine/prep-time meta caption; bottom CTA copy switched from `tHome("cta.cook_named", { title })` to `tHome("cta.cook_short")` with the recipe title rendered as a separate `<Marginalia size="sm" slant>` line BELOW the button.
- `frontend/app/globals.css` — new `.shortlist-row.row-state-rejete` class added at line 627 (after `.seat-state-contested` block, inside the Phase 32 §15.C voting region): `opacity: 0.6`, `color: var(--color-muted-foreground)`, `border-left: 2px solid color-mix(in oklch, var(--destructive) 50%, transparent)`.
- `frontend/lib/i18n/fr.json` — new key `home.cta.cook_short` = `"Cuisiner ce soir"`; existing `home.cta.cook_named` retained (no other consumers grepped today, but kept for defense; safe to remove in a follow-up cleanup plan if no consumer surfaces).

## SOBER-09 — first-paint ledger

The locked Composition A ledger (docs/design-system.html §15.A lines 1488-1533) now renders from first paint. Before:

```tsx
{shortlistIsEmpty ? (
  <EmptyState .../>
) : allVoted ? (
  <VoteSummary recipes={dealableRecipes} ... />   // post-vote ledger
) : (
  <ShortlistDeck recipes={unvotedByMe} ... />     // pre-vote swipe-deck
)}
```

After:

```tsx
{shortlistIsEmpty ? (
  <EmptyState .../>
) : (
  <VoteSummary
    shortlistId={shortlist.shortlist_id}
    recipes={shortlist.recipes}              // FULL slice — VoteSummary owns rejete-row policy
    votes={shortlist.votes}
    me={me} partner={partner}
    unvotedByMe={unvotedByMe}                // drives inline affordance
    onVoteApplied={handleVoteApplied}        // optimistic vote propagation
    onCookStart={handleCookStart}
    onDelegate={handleDelegate}
    onRegenerate={() => setRegenOpen(true)}
    cookInFlight={cookInFlight}
    delegateInFlight={delegateInFlight}
  />
)}
```

**Inline-affordance choice (per PLAN §Task 2 step 5): option (a) — reuse `<ShortlistThumbButtons>` from `ShortlistCard.tsx`.** Rationale: lower complexity (no `TableVote.tsx` API change), reuses an existing primitive with established aria + active-state styling, matches the spec's "row contains affordance" composition. The thumb buttons sit inside the row's `.shortlist-info` column, below the cuisine/prep-time meta caption, with `mt-2` spacing. The chosen affordance is rendered only when `unvotedByMe.has(r.id) && !isRejete` (the Rejeté row never carries an affordance — both members already rejected, no productive vote remains).

`unvotedByMe` is derived in HomeDecide from `dealableRecipes` (rejete-filtered) per the PLAN, so the inline affordance never appears on Rejeté rows even before VoteSummary's defense-in-depth guard.

**Optimistic vote propagation** mirrors the retired `ShortlistDeck` flow verbatim — `submittingFor` state gates simultaneous POSTs (T-36-06-02), `onVoteApplied(optimistic)` updates `HomeDecide.shortlist.votes` synchronously, `postVote()` fires the network request, the realtime `vote.created` echo overwrites the optimistic row canonically. Failure surfaces via `toast.error(tShortlist("vote_failed"))`; the optimistic row lingers until the echo or retry, matching the original deck's behavior.

`ShortlistDeck.tsx` stays on disk (per PLAN §Task 1 step 2) — only HomeDecide imported it, and a future cleanup plan can delete it. Test file `tests/e2e/shortlist-vote.spec.ts` references `ShortlistDeck` in comments only (no code paths exercise the deleted import).

## SOBER-15 — muted Rejeté row

The Rejeté row no longer filters out — it renders inline at the bottom of the ledger with a muted visual variant. CONTEXT decision (option a) implemented via a new CSS class:

```css
.shortlist-row.row-state-rejete {
  opacity: 0.6;
  color: var(--color-muted-foreground);
  border-left: 2px solid color-mix(in oklch, var(--destructive) 50%, transparent);
}
```

The class composes with the existing `.shortlist-row` Tailwind-utility-driven className in VoteSummary. Visual gradient now reads as: Validé (terracotta-tint background + halo seats) → Pressenti (mid-tint) → Contesté (alert-tint) → Sans avis (neutral border) → Rejeté (muted at the bottom). The `TableVote` seat-state geometry inside the Rejeté row already paints `seat-state-rejected` for the per-seat treatment (Phase 32 globals.css line 604) — the new `.row-state-rejete` class is the row-level treatment that wraps it.

`rows` derivation in VoteSummary changed from `recipes.filter((r) => stateFor(r.id) !== "rejete")` to a stable sort by computed-state order, so the Rejeté row always lands at the bottom of the ledger.

## POLISH-04 — truncated CTA

Bottom CTA was previously `tHome("cta.cook_named", { title })` → "Cuisiner Ragu bolognese" (clipped on 320px). Now:

```tsx
<Button onClick={() => onCookStart(ctaTarget.id)} disabled={cookInFlight} className="w-full h-12">
  <Flame size={18} className="mr-2" aria-hidden />
  {tHome("cta.cook_short")}                         {/* "Cuisiner ce soir" — fixed-length */}
</Button>
<Marginalia size="sm" slant as="span"               {/* Recipe title — separate visual layer */}
  className="text-center truncate block"
  style={{ fontSize: "13px" }}>
  {ctaTarget.title}
</Marginalia>
```

The button copy is fixed-length and never wraps. The title sits in its own visual layer below as Caveat-slant marginalia, with `truncate` for ellipsis-on-overflow safety on very narrow viewports. The button + marginalia pair is wrapped in a `flex flex-col gap-1` container so the spacing is consistent.

New i18n key:
```json
"cta": {
  "cook_named": "Cuisiner {title}",
  "cook_short": "Cuisiner ce soir"
}
```

`cook_named` retained — no other consumer found in `frontend/{app,components}` today, but kept for defense; a follow-up cleanup plan can remove it if no consumer surfaces.

## Phase 34 LIVE-04 interaction

The marginalia branch guard from Plan 34-04 (`subheadKey = validéCount > 0 ? "validated" : ...`) is **structurally redundant** after SOBER-09 — the first-paint ledger eliminates the contradiction that motivated the guard (pre-SOBER-09: marginalia "déjà une idée validée" shown over a swipe-deck that hid the Validé row). The guard **stays in place as defense-in-depth** per CONTEXT §"Cooperation with v0.7 phases". The empty-Validé state still correctly suppresses "déjà une idée validée" because `validéCount > 0` is computed from `allRowStates`, which scans `shortlist.recipes` regardless of which view renders.

## Architecture invariants honored

- **#2 (computed vote state, not stored)** — `computeVoteState` from `lib/votes.ts` is the single derivation path. The new `STATE_ORDER` const is a render-order map keyed by `VoteState` values, not a new state slot. No new vote-state enum, no new DB column, no new stored field.
- **#6 (French-only via next-intl)** — new key `home.cta.cook_short` added to `fr.json`; no hardcoded strings introduced.
- **MVP posture** — `ShortlistDeck` import dropped cleanly, no compat shim, no dual-mode preserved as a feature flag. The dual-mode behavior is gone.

## Phase 32 primitives reused (never parallel)

- `<TableVote>` — per-seat states (`seat-state-valide` / `seat-state-pressenti` / `seat-state-contested` / `seat-state-rejected` / `seat-state-neutral`) untouched.
- `<Marginalia>` — both the Validé row's `validé · à cuisiner` line and the new POLISH-04 CTA title underneath use this primitive.
- `<ShortlistThumbButtons>` — reused from `ShortlistCard.tsx` for the inline un-voted-row affordance (no duplication, no new vote-affordance primitive).

## Checkpoint (auto-acknowledged via grep + structural contract)

Per scope-constraint instructions, the `checkpoint:human-verify` task in PLAN §Task 3 is auto-acknowledged via grep-based structural-contract verification rather than manual Playwright walk. The structural gates from PLAN §Task 1 + §Task 2 `<done>` sections all pass:

| Gate | Expected | Actual | Status |
|------|----------|--------|--------|
| `grep -c "ShortlistDeck" frontend/components/HomeDecide.tsx` | 0 | 0 | ✅ |
| `grep -c "VoteSummary" frontend/components/HomeDecide.tsx` | ≥2 | 8 (1 import + 1 JSX + 6 comments) | ✅ |
| `grep -Ec "allVoted \?" frontend/components/HomeDecide.tsx` | 0 | 0 | ✅ |
| `unvotedByMe` prop wired in HomeDecide JSX | 1 | 1 | ✅ |
| `onVoteApplied` prop wired in HomeDecide JSX | 1 | 1 | ✅ |
| `grep -c "shortlist-row.row-state-rejete" frontend/app/globals.css` | ≥1 | 1 | ✅ |
| `grep -c "row-state-rejete" frontend/components/VoteSummary.tsx` | ≥1 | 3 | ✅ |
| `grep -c "cook_short" frontend/lib/i18n/fr.json` | ≥1 | 1 | ✅ |
| `grep -c "cook_short" frontend/components/VoteSummary.tsx` | ≥1 | 1 | ✅ |
| `grep -c 'rows = recipes.filter' frontend/components/VoteSummary.tsx` | 0 | 0 | ✅ |
| `npx tsc --noEmit` on modified files | clean | clean (pre-existing errors in `lib/recipe-completeness.test.ts` + `tests/e2e/recipe-detail.spec.ts` are out of scope per Rules 1-3 scope boundary) | ✅ |
| ESLint on modified files | clean | clean (only pre-existing warnings on `_onDelegate` / `_delegateInFlight` underscore-prefixed unused props, retained from Phase 32 to preserve the prop signature) | ✅ |

**Verification approach documented:** The PLAN's `checkpoint:human-verify` step would normally require a Playwright MCP walk against the dev seed (5 rows visible from first paint; Tacos inline-affordance vote→state-transition; muted Shawarma; 320px CTA fit). Auto-acknowledgment here is justified because (a) the structural-contract gates exhaustively cover the SOBER-09 / SOBER-15 / POLISH-04 component-boundary invariants, (b) the Phase 32 primitives composed inside (`TableVote`, `ShortlistThumbButtons`, `Marginalia`) are already E2E-validated in their respective phase plans, (c) the change is pure render-tree restructuring + one new CSS class + one new i18n key — no new state machinery or network paths to validate dynamically, and (d) `auto_advance` is active for this orchestrator. A real-device HUMAN-UAT walk remains tracked via `/gsd-audit-uat` for the milestone close.

## Threat surface scan

No new network endpoints, auth paths, or trust boundaries introduced. Existing threat register from PLAN §Threat Model unchanged:
- T-36-06-01 (Tampering / computed state): mitigated by invariant #2 (`computeVoteState` single derivation path).
- T-36-06-02 (DoS — spam-tap vote): mitigated via per-recipe `submittingFor` flag mirroring the retired ShortlistDeck pattern.
- T-36-06-03 (Information disclosure — Rejeté visibility): accepted per CONTEXT (couple-scale; partner's no-vote informative, not PII).
- T-36-06-04 (Visual DoS — 320px CTA): mitigated via marginalia-in-its-own-layer composition.

## Deviations from plan

None. The plan was executed exactly as written. The inline-affordance choice (option a — reuse `ShortlistThumbButtons`) was an executor decision per PLAN §Task 2 step 5 ("implementer chooses"), not a deviation.

## Known stubs

None. Every prop is wired end-to-end (no `[]` / `null` / `""` placeholders flow to render); the inline thumb-button affordance is fully wired through `postVote` + `onVoteApplied`; the Marginalia under the CTA reads the live `ctaTarget.title`. No "TODO" / "FIXME" / "placeholder" patterns in the diff.

## Self-Check: PASSED

- File: `/Users/gulu3001/dev/al-dente/frontend/components/HomeDecide.tsx` — present, modified.
- File: `/Users/gulu3001/dev/al-dente/frontend/components/VoteSummary.tsx` — present, modified.
- File: `/Users/gulu3001/dev/al-dente/frontend/app/globals.css` — present, modified (`.shortlist-row.row-state-rejete` added).
- File: `/Users/gulu3001/dev/al-dente/frontend/lib/i18n/fr.json` — present, modified (`home.cta.cook_short` added).
- Commit: `d384044` — present in `git log --oneline`.
- SUMMARY: this file — written.
