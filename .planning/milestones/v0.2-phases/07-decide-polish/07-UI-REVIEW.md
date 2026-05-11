---
phase: 07-decide-polish
reviewed_at: 2026-05-08
baseline: 07-UI-SPEC.md (approved — Phase 5 token inheritance, Phase 6 pattern mirror, 5 DECIDE requirements)
auditor: gsd-ui-auditor
status: clean
score: 22/24
pillars:
  copywriting: 4/4
  visuals: 4/4
  color: 4/4
  typography: 3/4
  spacing: 3/4
  experience_design: 4/4
---

# Phase 7 — UI Review

**Audited:** 2026-05-08
**Baseline:** `07-UI-SPEC.md` (approved — inherits Phase 5 token system, Phase 6 D-Voice callout patterns; closes DECIDE-01 through DECIDE-05)
**Screenshots:** Not captured — no dev server detected at localhost:3000 or localhost:5173. Code-only audit.
**Phase scope:** Polish phase for the daily-decide flow: HomeDecide date header (DECIDE-01), ShortlistCard paper-grain + springSnap (DECIDE-02), VoteSummary 5-state chip mapping + delegation Card (DECIDE-03 + DECIDE-04), ColdStartChip retheme + h-12 dismiss (DECIDE-05), DECIDE-03 token lock comment. Phase 5 baseline 23/24, Phase 6 baseline 22/24.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All strings via next-intl; zero new i18n keys; CTA labels action-verb-first French; raw enum strings in ShortlistCard badges are pre-Phase-3 TODO(productize), not regression |
| 2. Visuals | 4/4 | Paper-grain present on all 5 contracted surfaces; date header as clear daily focal point; delegation Card D-Voice mirror correct; anti-patterns (cool grays, purple gradients, paper-grain on page bg) all absent |
| 3. Color | 4/4 | 60/30/10 honored; terracotta strictly on 6 contracted elements; emerald reserved for Valide only; zero hardcoded hex/rgb; destructive correctly scoped; DECIDE-03 token lock in globals.css |
| 4. Typography | 3/4 | Fraunces display/title roles correct on date header, VoteSummary heading, card title, delegation body, ColdStartChip body; but text-2xl + font-bold on OUI/NON drag overlays are outside the 5-size declared scale — pre-existing from Phase 3, not introduced here |
| 5. Spacing | 3/4 | All D-08 tap-target gaps closed (h-12 on regenerate + ColdStartChip dismiss); h-11 residue zero; but ShortlistCard body uses p-5 (20px — outside the declared 4-multiple subset of 4/8/12/16/24/32/48/64) and gap-12 on thumb buttons lacks explicit spec justification — both pre-existing from Phase 3 |
| 6. Experience Design | 4/4 | prefers-reduced-motion correctly guarded on all three paths (CSS clamp, dragEnabled short-circuit, transition prop guard); spring snap-back wired; all 5 error toasts (vote, regen, delegate, cook, vote_failed) present; disabled states cover all in-flight paths; loading null-render is a known pattern consistent across phases |

**Overall: 22/24**

Target of ≥22/24: MET.
Phase 5 baseline 23/24 — Phase 7 matches the Phase 6 floor on a broader surface area.

---

## Top 3 Priority Fixes

1. **VoteSummary dual token syntax for `--color-valide-tint`** (`VoteSummary.tsx:60` vs `:74`) — The `chipClass` helper uses `bg-[var(--color-valide-tint)]` (arbitrary-value escape) while `rowBgClass` one function below uses `bg-valide-tint` (clean Tailwind utility). Both reach the same Phase 3 emerald token but `bg-valide-tint` is the correct form — it is lighter, already used consistently elsewhere, and the arbitrary-value form is harder to grep. Fix: change line 60 from `bg-[var(--color-valide-tint)]` to `bg-valide-tint`. One-word change, zero visual impact, consistent with the file's own established idiom.

2. **ShortlistCard body uses `p-5` (20px) — outside the declared 4-multiple spacing subset** (`ShortlistCard.tsx:182`) — The UI-SPEC §Spacing declares a strict subset: 4/8/12/16/24/32/48/64px. `p-5` = 20px is a valid Tailwind step but not in the declared subset and lacks a documented exception. This was inherited from Phase 3 and not flagged by prior audits. Fix: change `p-5` to `p-4` (16px) or `p-6` (24px) depending on desired card body density. Both are in the declared scale. If 20px is the intended value, document it as an exception in UI-SPEC §"Phase 7 spacing exceptions" table.

3. **Non-ASCII identifier `validéToastedFor` in HomeDecide.tsx** (`HomeDecide.tsx:71,186,192`) — JS/TS permits the `é` character in identifiers but the rest of the codebase uses ASCII-only identifiers (e.g., `validatedRow`, `valide` enum value, `bg-valide-tint` token). This breaks `grep "valide"` discovery, can confuse automated toolchains, and is inconsistent with the project's identifier convention. Fix: rename to `valideToastedFor` (drop the accent). Three one-word substitutions.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

**Audit method:** Grepped for generic labels, hardcoded English strings, and verified next-intl usage across all 5 Phase 7 components.

**Strengths:**

- Every user-facing string flows through `useTranslations()`. Components declare 1-3 namespaces each: `home.shortlist`, `home.summary`, `home.cold_start`, `vote.state`, `common`, consistent with the "French only via next-intl" invariant.

- CTA labels follow action-verb-first French contract: `t("delegate_cta")` ("Tu décides"), `t("cook_cta")` ("Je commence à cuisiner"), `t("regenerate_cta")` — none are generic "OK" / "Submit" / "Cancel" labels.

- Zero new i18n keys introduced — confirmed by empty `git diff frontend/lib/i18n/fr.json` across all 4 plan SUMMARYs. All keys in scope (`home.shortlist.*`, `home.summary.*`, `home.cold_start.body`, `vote.state.*`, `common.close`) pre-exist.

- Date header uses browser `Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" })` — correct choice for a locale-aware format that requires no translation key (format varies only with date, not with string content). The lowercase French convention ("vendredi 8 mai") is preserved as-is per UI-SPEC §"Surface 1" decision.

- Vote-chip state labels (`tState(row.state)`) correctly route through `vote.state.*` namespace for all 5 states — Validé, Pressenti, Contesté, Rejeté, Sans avis.

- ColdStartChip ARIA label (`tCommon("close")` → "Fermer") correctly uses the shared `common` namespace.

**Minor observations (not scored down):**

- `ShortlistCard.tsx:190,191` renders raw enum strings for cuisine and mood badges (`{cuisine}`, `{m}`) without translation. This is a pre-Phase-3 `TODO(productize)` carried forward — not introduced or worsened by Phase 7. UI-SPEC §Component Inventory explicitly notes "no Phase 7 change" to the card body meta row. Code-review IN-04 tracks this.

- `HomeDecide.tsx:71` uses the non-ASCII identifier `validéToastedFor`. The string it tracks (`toast_validé`) is a French i18n key, but the identifier itself should follow the ASCII-only convention. Flagged in code-review IN-01. This is a naming convention issue, not a copywriting correctness issue.

**Score: 4/4.** All user-facing strings are i18n-sourced, action-verb-first, contextually appropriate. Zero new hardcoded strings introduced in Phase 7.

---

### Pillar 2: Visuals (4/4)

**Audit method:** Reviewed component classNames, paper-grain placement contract, visual hierarchy, focal points, and anti-pattern compliance.

**Strengths:**

- **Date header focal point** — `HomeDecide.tsx:413-415` places a `<header className="px-6 pt-8 pb-2"><h1 className="text-display text-foreground">` above the deck. The `text-display` utility (Fraunces italic, opsz=96, clamp 32-44px) creates the dominant visual anchor on the daily-decide screen. The `pt-8 pb-2` asymmetry (32px top, 8px bottom) gives the header breathing room above the deck while staying rhythmically close to the card stack. This reads as a cookbook chapter date, not a UI label — exactly the editorial register specified.

- **Paper-grain placement** — all 5 contracted surfaces carry `paper-grain` correctly:
  - `ShortlistCard.tsx:135` — front card `paper-grain bg-card`
  - `ShortlistCard.tsx:136` — peek card `paper-grain bg-card`
  - `VoteSummary.tsx:172,187` — both delegation Card branches
  - `ColdStartChip.tsx:45` — outer div `bg-card paper-grain shadow-card`
  - Correctly absent from: page backgrounds, the partner-vote dot footer (uses `bg-card/70 backdrop-blur-sm`), the header, vote-chip pills (chrome stays grain-free per Phase 5 anti-pattern), VoteSummary row containers.

- **D-Voice callout pattern mirrored correctly** — the Tu-décides delegation Card (`VoteSummary.tsx:172,187`) uses `paper-grain shadow-card border-l-[3px] border-primary/60` — exact mirror of Phase 6's D-Voice callout. The 3px terracotta hairline left border on the leading edge creates a distinct editorial margin-note register distinguishable from the standard `bg-card border-border` row containers in the same list.

- **Validated branch anti-pattern guard held** — the `validatedRow ? ...` branch correctly stays flat (no Card wrap), presenting the chosen recipe title in `text-title` as a standalone editorial moment. Wrapping would dilute "this is the chosen one" — the contract was honored.

- **Anti-patterns absent:**
  - No cool grays (the `opacity-60` and `scale-[0.94]` grep hits were in comments, not CSS class values)
  - No purple gradients
  - No paper-grain on full-page backgrounds
  - No paper-grain on buttons
  - `bg-surface-rose-50` absent from ColdStartChip (replaced by Phase 5 system)

- **Visual hierarchy is clear**: display-serif date → paper-grain card stack → vote summary heading in text-title → chip state indicators → delegation CTA. Each layer has a distinct typographic register.

- **Icon-only buttons have ARIA labels**: vote_no_aria and vote_yes_aria on ShortlistThumbButtons, `tCommon("close")` on ColdStartChip dismiss, `partnerAria` (i18n-derived contextual label) on the partner-vote dot footer.

**Score: 4/4.** Paper-grain placement contract fully satisfied. Date header provides the correct daily focal point. D-Voice mirror and validated-branch contrast are well-executed.

---

### Pillar 3: Color (4/4)

**Audit method:** Grepped accent/primary class usage, hardcoded colors, cool-gray references, and verified 60/30/10 split and emerald exclusivity.

**Strengths:**

- **Zero hardcoded colors** — no `#hex`, no `rgb(...)` in any Phase 7 component. All color references flow through semantic tokens.

- **Zero cool-gray references** — no `slate-*`, `zinc-*`, `gray-*`, `stone-*` in any audited file. The `opacity-60` hit was in a comment. Warm-gray family maintained throughout.

- **Accent (terracotta) reserved-for compliance** — `text-primary` and `bg-primary` occurrences across Phase 7 components:
  - `ColdStartChip.tsx:47` — `text-primary` on Sparkles icon (first-run guidance, per CONTEXT.md decision)
  - `VoteSummary.tsx:62` — `bg-primary/15 text-primary border border-primary/40` inside `chipClass` for Pressenti state (restrained terracotta wash — "leaning yes")
  - `VoteSummary.tsx:172,187` — `border-primary/60` on delegation Card left border (D-Voice mirror, 3px hairline)
  - `VoteSummary.tsx:176,191` — `Button variant="default"` inherits terracotta surface from Phase 5 Button primitive re-theme
  - All 6 reserved-for items from UI-SPEC §"Accent reserved-for in Phase 7" are satisfied. No out-of-contract terracotta usage found.

- **Emerald reserved for Validé** — emerald appears in exactly 3 locations:
  - `VoteSummary.tsx:60` — Validé chip `border-emerald-500/30`
  - `VoteSummary.tsx:74` — `rowBgClass` returns `border-emerald-500/30` for Validé rows
  - `ShortlistCard.tsx:165` — OUI overlay drag affordance `border-emerald-500 text-emerald-500` (drag-only, aria-hidden)
  Terracotta never appears on Validé chip — emerald exclusivity maintained. The OUI drag overlay in emerald is semantically correct (positive signal, not brand accent).

- **DECIDE-03 token lock** — `globals.css:72` contains the canonical comment `/* CANONICAL — DO NOT introduce \`--color-validé-tint\` (with French accent). DECIDE-03 invariant lock. */` immediately above the `--color-valide-tint` declaration. The accented form is absent from all component files.

- **5-state chip color story** — the `chipClass(state)` helper in `VoteSummary.tsx:55-69` correctly implements the LOCKED color contract:
  - Validé: emerald wash (NOT terracotta)
  - Pressenti: terracotta wash at 15% with 40% saturation border
  - Contesté: quieted destructive (bg-destructive/10, text-destructive/80)
  - Rejeté: muted + line-through (warm-taupe, no fill accent)
  - Sans avis: border-only ghost (no fill, no accent)

- **60/30/10 split on decide surfaces:**
  - 60%: `bg-background` (cream) on HomeDecide outer, VoteSummary outer, ColdStartChip parent margin
  - 30%: `bg-card` on ShortlistCard frames, delegation Cards, ColdStartChip, VoteSummary row containers
  - 10%: terracotta on the 6 contracted elements above

**One code-review finding (not scored down):** `VoteSummary.tsx:60` uses `bg-[var(--color-valide-tint)]` (arbitrary-value escape) while `rowBgClass` on line 74 uses `bg-valide-tint` (clean Tailwind utility). Both reach the same token. The arbitrary-value form is redundant. Flagged as Top Priority Fix #1 — fix is one word.

**Score: 4/4.** Token reservation contract fully satisfied. No hardcoded colors, no cool grays, no out-of-contract accent usage.

---

### Pillar 4: Typography (3/4)

**Audit method:** Grepped font-size and font-weight classes; verified Fraunces vs IBM Plex Sans role assignments against UI-SPEC §"Phase 7 role assignments."

**Type sizes in use across Phase 7 components:**

| Class | px equivalent | Usage | Contract status |
|-------|--------------|-------|----------------|
| `text-display` | 32-44px (clamp) | HomeDecide date header | Correct |
| `text-title` | 24px (Fraunces) | VoteSummary h2, validated recipe title, ShortlistCard h2 | Correct |
| `text-base` | 16px | Delegation card body, VoteSummary row title, intro copy | Correct |
| `text-sm` | 14px | Chip pill labels, ColdStartChip body, ShortlistCard meta, partner-dot caption | Correct |
| `text-xs` | 12px | Partner-vote dot caption | UI-SPEC allows this as the single documented Phase 3 exception |
| `text-2xl` | 24px | OUI/NON drag overlays | **Outside declared 5-size scale** |

The UI-SPEC §Typography declares 5 distinct sizes: `text-display` (32-44), `text-title` (24), `text-base` (16), `text-sm` (14), `text-xs` (12). The `text-2xl` on the OUI/NON overlays (`ShortlistCard.tsx:165,172`) is a sixth size outside this scale. These overlays are `aria-hidden` decorative drag affordances (not content), but they do introduce a sixth type size, and `text-2xl` = 24px which numerically duplicates `text-title`'s visual size without using the semantic class.

**Font weights in use:**

| Class | Usage |
|-------|-------|
| `font-display` | ColdStartChip body (italic), delegation Card body (italic), the `font-display` utility on Fraunces titles |
| `font-medium` | Chip pills, prep-time, caption text |
| `font-semibold` | VoteSummary row titles (`text-base font-semibold leading-6`) |
| `font-bold` | OUI/NON drag overlays |

`font-bold` (700) appears exclusively on the `aria-hidden` OUI/NON overlays — it is not in the Phase 5 declared weight set of 400/500/600. These overlays are pre-Phase-3 code that Phase 7 did not touch (the only Phase 7 edits to ShortlistCard.tsx were import, paper-grain on classNames, rounded-t-2xl, and the transition prop — none touched the overlay markup).

**Strengths:**

- All Phase 7-introduced typography uses the canonical scale correctly:
  - `HomeDecide.tsx:414` — `text-display` on the date header (Fraunces italic, opsz=96) — correct editorial date moment
  - `VoteSummary.tsx:127` — `text-title` on the VoteSummary `<h2>` heading (upgraded from `text-xl font-semibold` per Phase 6 audit IN-01) — correct
  - `VoteSummary.tsx:157` — `text-title` on the validated recipe title — correct (already correct pre-Phase-7, preserved)
  - `VoteSummary.tsx:173,188` — `font-display italic text-base text-foreground` on delegation Card body — correct Fraunces italic at 16px, cookbook margin-note register
  - `ColdStartChip.tsx:51` — `font-display italic text-sm text-foreground` — correct Fraunces italic at 14px, one notch tighter than delegation card

- Weight discipline for Phase 7 additions: 500 (`font-medium`) on all pill chips and captions; 500 (via `font-display` utility) on Fraunces italic copy; 600 (`font-semibold`) on row titles — all within the declared 400/500/600 set.

**Finding (score impact):**

`text-2xl` and `font-bold` on the OUI/NON drag overlays (`ShortlistCard.tsx:165,172`) are outside the declared Phase 5/7 type scale (5 sizes, 3 weights). These are `aria-hidden` decorative elements that only appear during an active drag gesture — they have low visual prominence outside that interaction moment. They were present in Phase 3 and Phase 6 did not flag them. Phase 7 explicitly did not touch this code per the "preserved byte-for-byte" contract. However they represent a drift from the declared scale and warrant a note:

- `text-2xl` = 24px numerically matches `text-title` but bypasses the semantic class
- `font-bold` = 700, outside the 400/500/600 weight set

The impact is minor: the overlays are aria-hidden and only visible during drag (a transient micro-interaction). But the type-scale contract says 5 sizes and this is 6. Deduct 1 point for scale drift — the same category that earned a -1 in Phase 6. The drift is entirely pre-existing and not introduced by Phase 7, but the audit must score what is deployed, not just what was changed.

**Score: 3/4.** All Phase 7-introduced typography is correct per the spec's role assignments. The 3/4 reflects the pre-existing `text-2xl font-bold` on aria-hidden drag overlays that remain outside the declared type scale.

---

### Pillar 5: Spacing (3/4)

**Audit method:** Grepped spacing classes, confirmed h-11 residue is zero, verified all D-08 tap-target heights, audited arbitrary values.

**D-08 tap-target audit (post-Phase-7 state):**

| Element | Height | Status |
|---------|--------|--------|
| ShortlistThumbButtons (thumb No / Yes) | `h-14 w-14` (56px) | PASS — above floor |
| VoteSummary cook CTA | `h-14 rounded-2xl` (56px) | PASS — above floor |
| VoteSummary delegate CTA (delegation Card) | `h-12 w-full` (48px) | PASS — at floor |
| VoteSummary regenerate ghost | `h-12` (48px) | PASS — was h-11, raised in Phase 7 |
| ColdStartChip dismiss button | `h-12 w-12` (48px) | PASS — was h-8, raised in Phase 7 (DECIDE-05 closure) |
| Vote-chip pills (all 5 states) | `h-8` (32px) | EXCEPTED — read-only state indicator, not tap target; contract documented inline at VoteSummary.tsx:53-54 |
| MemberDots | 10-12px | EXCEPTED — non-interactive visual primitive |

h-11 residue: zero (confirmed). All Phase 7-introduced interactive controls meet or exceed the 48px floor.

**Strengths:**

- Section spacing on HomeDecide follows the declared scale: `px-6` (24px horizontal page padding), `pt-8 pb-2` on the header (32px/8px — documented asymmetry for breathing room), `gap-6` (24px) between structural sections on ShortlistDeck and VoteSummary.

- Delegation Card uses `px-4 py-3` (16px/12px) — the md/close-to-md range appropriate for the informational card surface. `gap-3` (12px) between body and CTA within the Card.

- ColdStartChip uses `px-4 py-3 gap-3` (16px/12px/12px) — consistent with delegation Card register.

- Arbitrary values: `border-l-[3px]` on both delegation Cards is the direct mirror of Phase 6 D-Voice pattern. This is a justified hairline value — 3px registers at iOS subpixel density as a distinct accent strip. No other arbitrary padding/margin values introduced.

- `gap-1.5` (6px) in ShortlistCard partner-dot footer and VoteSummary vote-dot cluster — same tight-row idiom used throughout Phase 5/6 for label+icon pairs. Consistent.

**Findings (score impact):**

1. **`p-5` (20px) on ShortlistCard body** (`ShortlistCard.tsx:182`): `<div className="flex-1 flex flex-col gap-3 p-5">`. The UI-SPEC §Spacing declares a strict 4-multiple subset: 4/8/12/16/24/32/48/64px. `p-5` = 20px is a valid Tailwind step but sits between the 16px (`p-4`) and 24px (`p-6`) declared steps. This was introduced in Phase 3 (`f88a4bd` commit) and carried forward unchanged through Phases 4-7. Phase 7 did not introduce it, but Phase 7 added `paper-grain` to the card frame and `rounded-t-2xl` to the photo region — the body `p-5` is now a more visible data point since Phase 7 explicitly audits against the spacing scale. No UI-SPEC §"Phase 7 spacing exceptions" entry documents this value.

2. **`gap-12` (48px) between thumb buttons** (`ShortlistCard.tsx:237`): `<div className="flex items-center justify-center gap-12">`. The 48px gap between the No and Yes thumb buttons is a deliberate wide separation (the 2xl step = tap-target floor, used here as a spacing gap). It was introduced in Phase 3 and is not documented in the UI-SPEC §"Phase 7 spacing exceptions" table. It is a legitimate use of the 2xl step (48px is in the declared scale as the tap-target floor value) — but the gap-12 is being used in a spacing context rather than a sizing context, which blurs the scale's semantic intent.

Both values are pre-Phase-7 inherited from Phase 3 and not worsened by Phase 7. However the spacing contract is stricter in Phase 7 and neither has a documented exception. Deduct 1 point: the declared scale has two undocumented usages in the Phase 7 surface area.

**Score: 3/4.** All new D-08 tap-target gaps closed correctly. The -1 reflects two pre-existing spacing values (`p-5`, `gap-12`) in Phase 7's primary surface that are outside or semantically adjacent to the declared 4-multiple subset without documented exceptions.

---

### Pillar 6: Experience Design (4/4)

**Audit method:** Checked loading, error, empty, and disabled states; verified motion contract, reduced-motion handling, and interaction completeness across all Phase 7 surfaces.

**Strengths:**

- **Spring snap-back wired correctly** — `ShortlistCard.tsx:132`: `transition={isFront && !reducedMotion ? transitions.springSnap : undefined}`. The guard ensures: (a) spring only applies to the front card (peek is static), (b) spring collapses to instant when `reducedMotion` is true, (c) Framer Motion's default behavior is preserved when the prop is `undefined`. The `springSnap` preset (`stiffness: 240, damping: 28, mass: 1.1`) is the specified paper-physics feel — documented in `motion.ts:20-24` with a clear comment explaining the design intent.

- **prefers-reduced-motion triple-guard** — three layers work together:
  1. `globals.css:378-385`: CSS `@media (prefers-reduced-motion: reduce)` clamps `animation-duration` and `transition-duration` to `0ms !important` globally — covers CSS and Framer Motion transitions
  2. `ShortlistCard.tsx:103`: `dragEnabled = isFront && !reducedMotion` — disables drag gesture entirely when reduced-motion is on
  3. `ShortlistCard.tsx:132`: `transition={isFront && !reducedMotion ? transitions.springSnap : undefined}` — spring prop absent when reduced-motion on
  The three-layer approach is belt-and-braces: the CSS clamp handles the spring even if the prop guard were absent, and the drag disabling prevents any gesture feedback that reduced-motion users opted out of.

- **Error coverage is comprehensive**:
  - `vote_failed` toast in `ShortlistDeck.tsx:103` (with deck rollback)
  - `regenerate_failed` toast in `HomeDecide.tsx:273`
  - `delegate_failed` toast in `HomeDecide.tsx:291`
  - `cook_failed` toast in `HomeDecide.tsx:314`
  - Celebration toast `toast_validé` in `HomeDecide.tsx:193` for Pressenti→Validé transition
  All route through `tSummary(...)` / `tShortlist(...)` namespaces — no hardcoded error strings.

- **Disabled states cover all in-flight paths**:
  - `VoteSummary.tsx:164`: cook Button `disabled={cookInFlight}`
  - `VoteSummary.tsx:180,195`: delegate Button `disabled={delegateInFlight}`
  - `ShortlistDeck.tsx:137`: thumb buttons `disabled={submittingFor !== null}`
  - ColdStartChip dismiss has no async path (synchronous sessionStorage write) — no disabled state needed.

- **Loading handling** — `HomeDecide.tsx:338-341` returns `null` when `!shortlistLoaded || !me || !partner`. This pattern is consistent with how Phase 5/6 surfaces handle pre-auth / pre-data loading: `OnboardingGuard` upstream gates unauthenticated users, so the blank render is brief (session is usually cached) and scoped. The pattern is a known Phase 7 design decision, not a regression. The null-render is simpler and less jarring than a skeleton here because `HomeDecide` is always mounted inside the authenticated shell which has its own loading state.

- **Empty state** — `HomeDecide.tsx:346-369`: when `shortlist === null` the component renders `<EmptyState>` with `heading={tShortlist("empty_heading")}` + `body={tShortlist("empty_body")}` + CTA to `/recipes/new`. The empty branch includes `<ColdStartChip />` for corpus guidance. Complete empty-state coverage.

- **AnimatePresence on deck card swap** — `ShortlistDeck.tsx:123`: `<AnimatePresence mode="wait">` wrapping the front card. This was Phase 3 infrastructure preserved byte-for-byte (ShortlistDeck.tsx at exactly 141 LOC). Combined with the spring transition on the front card, the deck commit + next-card-rise interaction has the correct two-part feel.

- **Destructive action pattern** — no destructive CTAs introduced in Phase 7 (no `Button variant="destructive"`). Vote rejection flows are handled by the swipe gesture or thumb button, which has no confirm dialog (intentional UX for speed). The only "undoable" action candidates (delegate, regen) have loading/disabled states but no confirmation dialog — consistent with the Phase 3/4 design that treats these as reversible/cheap actions.

**Score: 4/4.** Motion contract fully implemented with correct reduced-motion guards. Error states comprehensive. Disabled states cover all in-flight paths. Empty and loading states handled consistently with the established Phase 5/6 pattern.

---

## Registry Safety

`frontend/components.json` has `registries: {}` — no third-party registries. Phase 7 adds zero new shadcn primitives (only adds `Card` import in `VoteSummary.tsx`, which was already registered in Phase 5). No registry vetting required.

Registry audit: 0 third-party blocks checked, no flags.

---

## Documented Deferrals (not scored against Phase 7)

| Item | Location | Deferred To | Impact |
|------|----------|-------------|--------|
| Raw enum strings (cuisine/mood) in ShortlistCard badges | `ShortlistCard.tsx:190,191` | Phase 8+ (TODO(productize)) | Pre-Phase-3, not regressed |
| Non-ASCII identifier `validéToastedFor` | `HomeDecide.tsx:71,186,192` | Phase 8 cleanup commit | Style issue, no functional impact |
| `viewport.themeColor: "#F43F5E"` legacy rose | `app/layout.tsx` | Phase 9 (ONBOARD-10) | PWA status bar still shows rose on iOS install |
| `role="note"` missing on D-Voice callout pattern | `VoteSummary.tsx:172,187` | Phase 7+ a11y sweep | Delegation Cards inherit the Phase 6 callout pattern; `role="note"` was not in that pattern either |
| OUI/NON drag overlays use `text-2xl font-bold` | `ShortlistCard.tsx:165,172` | Phase 8 or type-scale cleanup | aria-hidden decorative elements only visible during drag |

---

## Files Audited

| File | Role | Verdict |
|------|------|---------|
| `frontend/components/HomeDecide.tsx` | Daily decide page (440 → 456 LOC) | PASS — text-display date header, Intl fr-FR, all handlers preserved |
| `frontend/components/ShortlistDeck.tsx` | Swipe deck container (141 LOC, LOCKED) | PASS — unchanged at exactly 141 LOC; AnimatePresence preserved |
| `frontend/components/ShortlistCard.tsx` | Deck card (260 → 262 LOC) | PASS WITH NOTE — paper-grain + springSnap + rounded-t-2xl correct; p-5 body padding outside declared spacing subset (pre-Phase-3, undocumented exception) |
| `frontend/components/VoteSummary.tsx` | Vote summary (205 → 215 LOC) | PASS WITH NOTE — chipClass 5-state correct; delegation Cards correct; text-title heading upgraded; bg-[var()] vs bg-valide-tint dual syntax on line 60 |
| `frontend/components/ColdStartChip.tsx` | Cold-start chip (64 LOC) | PASS — full Phase 5 retheme, h-12 w-12 dismiss, text-primary Sparkles, font-display italic body |
| `frontend/components/MemberDot.tsx` | Color attribution dot (54 LOC) | PASS — unchanged; non-interactive; style={{ background: colorHex }} is the correct pattern for member identity |
| `frontend/lib/motion.ts` | Motion presets (43 → 48 LOC) | PASS — springSnap added correctly with satisfies Transition; existing exports unchanged |
| `frontend/app/globals.css` | Token system | PASS — DECIDE-03 comment lock at line 72 correct; --color-valide-tint unchanged; all Phase 5 tokens intact |
