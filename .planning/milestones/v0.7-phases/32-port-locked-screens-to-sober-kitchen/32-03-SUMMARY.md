---
phase: 32-port-locked-screens-to-sober-kitchen
plan: 03
subsystem: ui
tags: [design-system, accueil, screen-port, marginalia, table-vote, sober-kitchen]

# Dependency graph
requires: ["32-01", "32-02"]
provides:
  - "HomeDecide.tsx ported to Sober Kitchen Accueil A composition (header date row + H1 28px upright + Caveat slant subhead + shortlist stack with TableVote per row + sticky CTA)"
  - "VoteSummary.tsx redesigned in place: TableVote ts-56 per row, valide-tint rows, Caveat valide_meta, sticky Flame CTA"
  - "4 new fr.json keys: home.subhead.validated/tentative/empty + home.shortlist.valide_meta + home.cta.cook_named"
  - "State-derived subhead from aggregate vote states across all shortlist recipes (D-13)"
  - "A6 visual verification site: conteste rows show yes-voter seat-state-valide + no-voter seat-state-contested (per 32-02 resolution)"
affects:
  - 32-04-bibliotheque-port
  - 32-05-recette-port

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Accueil A header: flex justify-between page-label (var(--font-display) 500 20px) + text-caption date right"
    - "H1 override: text-display + inline style fontSize:28px fontStyle:normal (per UI-SPEC §4 + doc mock)"
    - "State-derived subhead: allRowStates.includes('valide') -> validated; includes('pressenti') -> tentative; else empty"
    - "VoteSummary Choice 1 (redesign in place): props interface preserved; onDelegate/delegateInFlight retained but unused in new design"
    - "Sticky CTA pattern: flex flex-col flex-1 + mt-auto on CTA container anchors to phone-content bottom"
    - "Valide row: inline CSS var(--valide-tint) + var(--color-valide-border-faint); Marginalia size=sm as=span color=var(--color-valide-emphasis)"
    - "Non-valide meta: cuisine + prep_time_minutes joined with ' · ' as text-caption 12px"

key-files:
  created: []
  modified:
    - "frontend/components/HomeDecide.tsx"
    - "frontend/components/VoteSummary.tsx"
    - "frontend/lib/i18n/fr.json"

key-decisions:
  - "VoteSummary redesigned in place (Choice 1) — single consumer (HomeDecide); keeps props interface stable; cleaner HomeDecide render"
  - "hero_question key reused for H1 (existing 'On mange quoi ce soir ?') — no new home.heading key needed"
  - "tNav('home') used for 'Accueil' page label — reuses nav.home key rather than duplicating"
  - "onDelegate / delegateInFlight props retained in VoteSummary interface though unused in Sober Kitchen design — future cleanup plan may remove them"
  - "Subhead scans ALL shortlist.recipes (not just dealableRecipes) to reflect full vote landscape including rejete rows"
  - "Non-valide meta line uses prep_time_minutes (correct field name per Recipe type — not time_minutes)"
  - "pre-existing Loader2 comment in HomeDecide.tsx line 80 is a regex false positive for the Loader2[^I] gate — same as showSpinner false positive documented in 32-02"

requirements-completed: [SOBER-02]

# Metrics
duration: 6min
completed: 2026-05-18
---

# Phase 32 Plan 03: Accueil A Port Summary

**HomeDecide ported to Sober Kitchen Accueil A composition with TableVote per shortlist row, state-derived Caveat slant subhead, valide-tint row treatment, and sticky Flame CTA; VoteSummary redesigned in place; 5 new fr.json keys**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-18T10:15:33Z
- **Completed:** 2026-05-18T10:21:51Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

### Task 1: i18n keys (fr.json)

Added 5 new keys under the `home` namespace:
- `home.subhead.validated` → `"— déjà une idée validée"` (D-13 / UI-SPEC §6.1)
- `home.subhead.tentative` → `"— une piste, à confirmer"` (D-13)
- `home.subhead.empty` → `"— personne ne s'est encore prononcé"` (D-13)
- `home.shortlist.valide_meta` → `"validé · à cuisiner"` (UI-SPEC §9.1)
- `home.cta.cook_named` → `"Cuisiner {title}"` (UI-SPEC §9.1 CTA)

The existing `home.hero_question` key (`"On mange quoi ce soir ?"`) was reused for the H1 — no duplication needed. The `nav.home` key (`"Accueil"`) was reused for the page label.

### Task 2: HomeDecide.tsx — Accueil A header composition

**New imports:** `Marginalia` + `tSubhead` + `tHome` + `tNav` translations.

**Header block replaced** with 3-layer Accueil A composition:
1. `<div flex justify-between>` — `<span>Accueil</span>` (Cormorant 500 20px via var(--font-display)) left + `<small className="text-caption capitalize">{formattedDate}</small>` right
2. `<h1 className="text-display mt-4" style={{ fontSize:"28px", fontStyle:"normal" }}>` — `{tHome("hero_question")}` = "On mange quoi ce soir ?"
3. `<Marginalia size="sm" slant className="mt-[-4px]">` — `{subheadText}` derived from `tSubhead(subheadKey)`

**State-derived subhead logic** (D-13):
```tsx
const allRowStates = shortlist.recipes.map(r => computeVoteState(...));
const subheadKey = allRowStates.includes("valide") ? "validated"
  : allRowStates.includes("pressenti") ? "tentative" : "empty";
const subheadText = tSubhead(subheadKey);
```

**ShortlistDeck**: unchanged — import preserved at line 22, render preserved at line 571. D-06 lock confirmed by `git diff frontend/components/ShortlistDeck.tsx = 0`.

### Task 2: VoteSummary.tsx — in-place redesign (Choice 1)

Replaced the Phase 3 chip-based summary with the Sober Kitchen Accueil shortlist stack:

**Each row:**
- `<TableVote votes={recipeVotes} members={[me, partner]} myMemberId={me.id} size="ts-56" />`
- Cormorant 17px h4 title (fontStyle: normal)
- If `isValide`: `<Marginalia size="sm" as="span" style={{ color: "var(--color-valide-emphasis)" }}>` with `valide_meta` key
- Else: `<span className="text-caption" style={{ fontSize: "12px" }}>` with `cuisine · prep_time_minutes min`
- isValide rows: `style={{ background: "var(--valide-tint)", borderColor: "var(--color-valide-border-faint)" }}`

**Sticky bottom CTA** (mt-auto):
- If ctaTarget (first valide, fallback first pressenti): `<Button>` with `<Flame>` icon + `tHome("cta.cook_named", { title: ctaTarget.title })`
- Else: outline regenerate button

**Props interface preserved:** `onDelegate` / `delegateInFlight` retained as `_onDelegate` / `_delegateInFlight` (underscore prefix indicates intentionally unused in this design revision).

## Task Commits

1. **Task 1: Add 5 new home.subhead.* + home.shortlist.valide_meta + home.cta.cook_named i18n keys** - `d8f67da` (feat)
2. **Task 2: Port HomeDecide to Accueil A composition + redesign VoteSummary** - `7b4032b` (feat)

## Files Created/Modified

- `frontend/lib/i18n/fr.json` — MODIFIED: +10 lines (5 new keys under home namespace)
- `frontend/components/HomeDecide.tsx` — MODIFIED: header replaced; tSubhead/tHome/tNav imports; subheadText derivation; Marginalia import
- `frontend/components/VoteSummary.tsx` — MODIFIED: full redesign (187 lines added, 215 removed) — TableVote + Marginalia + Flame CTA

## Decisions Made

1. **Choice 1 (redesign VoteSummary in place):** VoteSummary has one code consumer (HomeDecide). Redesigning in place keeps HomeDecide's JSX clean — it still renders `<VoteSummary ... />` with the same props. No inline explosion.

2. **Reuse existing i18n keys:** `home.hero_question` = "On mange quoi ce soir ?" already existed; `nav.home` = "Accueil" already existed. No duplicate keys added.

3. **Subhead scans all recipes** (not just dealableRecipes) so that a rejete row's partner vote still influences the subhead register (edge case: if all non-rejete rows are sans_avis but one rejete row had a pressenti vote before the no came in, we correctly show "empty" rather than "tentative").

4. **Non-valide meta uses `prep_time_minutes`** — the Recipe type field is `prep_time_minutes` not `time_minutes`. Would have caused a TypeScript error.

## A6 Visual Verification (Conteste per-seat)

The Accueil A composition is the first integration site for the `conteste` per-seat rendering from 32-02. As resolved in 32-02 (UI-SPEC §7.2 + doc mock line 1515):
- Yes-voter seat → `seat-state-valide` (green halo)
- No-voter seat → `seat-state-contested` (strike-through bar)

The TableVote primitive implements this in `seatStateClass()`. The 32-03 integration site will visually expose this when a shortlist row enters the `conteste` state. **Manual visual gate deferred to the human verification checkpoint per plan §Verification step 3.**

## ShortlistDeck Unchanged (D-06 Confirmation)

`git diff frontend/components/ShortlistDeck.tsx` returns 0 bytes. The swipe deck render at HomeDecide line 571 is structurally identical to the pre-32-03 state.

## Visual Side-by-Side Comparison Status

Manual comparison to `docs/design-system.html` #accueil on iPhone-shaped viewport is a human verification gate (plan §Verification step 6). Automated build verification passed; visual gate deferred to human checkpoint.

## Grep Gates

```
# animate-spin outside BrandLoader.tsx (wave-2 regression):
grep -rn "animate-spin" frontend/ | grep -v BrandLoader.tsx | wc -l
0  ← PASS

# broadcast_to_household count (invariant #4 — unchanged):
grep -rn "broadcast_to_household" backend/app/ | wc -l
56  ← PASS (baseline from pre-plan; no new events added)

# state column guard (invariant #2):
grep -rn "state.*column|vote_state.*Mapped" backend/app/models/ | wc -l
0  ← PASS

# TypeScript errors in plan files:
npx tsc --noEmit | grep "HomeDecide\|VoteSummary" | wc -l
0  ← PASS

# Next.js build: 15/15 pages generated
node_modules/.bin/next build --webpack → ✓ Compiled successfully
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Recipe type field is `prep_time_minutes` not `time_minutes`**
- **Found during:** Task 2 — writing VoteSummary's non-valide meta line
- **Issue:** Plan snippet used `r.time_minutes` but the Recipe type in `lib/recipes.ts` defines `prep_time_minutes?: number | null`; using the wrong field would cause TypeScript error + silent undefined
- **Fix:** Used `r.prep_time_minutes` (correct field)
- **Files modified:** `frontend/components/VoteSummary.tsx`
- **Commit:** 7b4032b

**2. [Rule 1 - Bug] `tHome("nav.home")` would fail — `nav.home` is not under the `home` namespace**
- **Found during:** Task 2 — writing the header date row
- **Issue:** Plan snippet suggested `tHome("nav.home")` but `tHome = useTranslations("home")` resolves keys under `home.*`; the key `nav.home` is at `fr.json` root under `nav`, not `home`
- **Fix:** Added `const tNav = useTranslations("nav")` and used `tNav("home")` for the "Accueil" page label
- **Files modified:** `frontend/components/HomeDecide.tsx`
- **Commit:** 7b4032b

## Known Stubs

None — all data flows are wired:
- Subhead derives from real vote state computed by `computeVoteState` on live `shortlist.votes`
- TableVote receives real `recipeVotes` filtered from `shortlist.votes` per recipe
- Valide meta text is from i18n key (static, intentional)
- CTA title interpolates real `ctaTarget.title` from shortlist data
- Non-valide meta derives from `r.cuisine` and `r.prep_time_minutes` from recipe data

## Threat Flags

None — this plan renders user-authored recipe titles and member names as React text children only. All threat dispositions T-32-03-01..04 accepted per plan threat model. No new network endpoints, no auth paths, no schema changes, no `dangerouslySetInnerHTML`.

## Self-Check: PASSED

- FOUND: frontend/lib/i18n/fr.json (modified)
- FOUND: frontend/components/HomeDecide.tsx (modified)
- FOUND: frontend/components/VoteSummary.tsx (modified)
- FOUND: d8f67da (Task 1 commit)
- FOUND: 7b4032b (Task 2 commit)
- CONFIRMED: home.subhead.validated = "— déjà une idée validée" ✓
- CONFIRMED: home.subhead.tentative = "— une piste, à confirmer" ✓
- CONFIRMED: home.subhead.empty = "— personne ne s'est encore prononcé" ✓
- CONFIRMED: home.shortlist.valide_meta = "validé · à cuisiner" ✓
- CONFIRMED: home.cta.cook_named = "Cuisiner {title}" ✓
- CONFIRMED: animate-spin gate = 0 ✓
- CONFIRMED: TypeScript errors in plan files = 0 ✓
- CONFIRMED: Next.js build = 15/15 pages generated ✓
- CONFIRMED: ShortlistDeck.tsx diff = 0 bytes ✓
- CONFIRMED: broadcast_to_household count = 56 (unchanged) ✓
- CONFIRMED: state column guard = 0 ✓

---
*Phase: 32-port-locked-screens-to-sober-kitchen*
*Completed: 2026-05-18*
