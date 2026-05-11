---
phase: 7
slug: decide-polish
status: draft
shadcn_initialized: true
preset: radix-nova (inherited; baseColor neutral, iconLibrary lucide, cssVariables true, registries {})
created: 2026-05-08
inherits_from: 05-UI-SPEC.md, 06-UI-SPEC.md
---

# Phase 7 — UI Design Contract

> Polish phase. **Inherits** the entire Phase 5 token system (typography pairing, paper-grain anchor, warm shadow stack, motion language, re-themed shadcn primitives) plus the Phase 6 patterns (paper-grain Card + Fraunces italic callout + terracotta-60 left border, AnimatePresence cadence, h-12 tap-target floor). This UI-SPEC does NOT re-litigate any of those decisions — it specifies how the daily-decide surfaces (HomeDecide, ShortlistDeck, ShortlistCard, VoteSummary, ColdStartChip, "Tu décides" delegation card) consume those tokens, and closes the DECIDE-05 W4 ColdStartChip tap-target gap + DECIDE-03 token-naming reconciliation comment lock.
>
> **Audience reminder:** Two iPhones, "just us" couple, French only via next-intl. Mobile-first at 390pt iPhone 14 baseline, iOS Safari 17+ PWA standalone is the rendering target. The four design principles (Design Quality, Originality, Craft, Functionality) carry forward unchanged.
>
> **Prescriptive, not exploratory.** A competent executor implements Phase 7 from this contract without further design questions. CONTEXT.md decisions are LOCKED — restated here in executable form.

---

## Canonical References

| Reference | Why it matters here |
|-----------|---------------------|
| `.planning/phases/05-design-system-foundation/05-UI-SPEC.md` | **Source of truth for all visual tokens.** Phase 7 inherits §Spacing, §Typography, §Color, §Shadows, §Paper-Grain, §Motion, §Component Inventory verbatim. Any apparent conflict between this document and 05-UI-SPEC resolves in favor of 05-UI-SPEC. |
| `.planning/phases/06-capture-surfaces-polish/06-UI-SPEC.md` | **Pattern source.** D-Voice callout pattern (paper-grain Card + Fraunces italic body + terracotta-60 left border) is reused for the Tu-décides delegation card and the ColdStartChip. AnimatePresence cadence + reduced-motion-via-CSS-clamp inherited. |
| `.planning/phases/06-capture-surfaces-polish/06-UI-REVIEW.md` | Phase 6 audit (22/24). Phase 6 patterns validated; Phase 7 mirrors them. |
| `.planning/phases/07-decide-polish/07-CONTEXT.md` | LOCKED user decisions: 5-state vote-chip color mapping, spring snap stiffness/damping/mass, no structural rewrite of ShortlistDeck, paper-grain ShortlistCard frame + rounded-t photo, ColdStartChip retheme + h-12 dismiss, DECIDE-03 comment lock. |
| `.planning/notes/v0.2-design-direction.md` | Slow Food artisanal direction; anti-patterns committed (no purple gradients, no cool grays, no trattoria, no twee handmade overload). |
| `.planning/phases/04-polish-w4/04-UI-REVIEW.md` | W4 baseline 20/24. **DECIDE-05** (ColdStartChip dismiss `h-8 w-8` → `h-12 w-12`) is the W4 gap closed in this phase. |
| `.planning/REQUIREMENTS.md` (DECIDE-01..05) | The 5 acceptance items this phase must close. Mapped 1:1 to §Acceptance Criteria below. |
| `frontend/app/globals.css` | Phase 5 tokens already migrated. Phase 7 adds **one** comment line at the `--color-valide-tint` definition site (line 72) declaring the canonical name and forbidding the accented form. |
| `frontend/lib/motion.ts` | Phase 7 may add a `springSnap` named transition export (`type: "spring", stiffness: 240, damping: 28, mass: 1.1`) — single addition, named for reuse, no breaking change to existing exports. |
| `frontend/AGENTS.md` | **Next.js 16.2.4 has training-data drift.** Consult `frontend/node_modules/next/dist/docs/` before writing frontend code. |
| `frontend/lib/i18n/fr.json` | French only via next-intl. **No new keys** added by Phase 7 — every string in scope already exists (verified: `home.shortlist.*`, `home.summary.*`, `home.cold_start.body`, `vote.state.*`, `common.close`). |

---

## Design System (inherited from Phase 5 — restated)

| Property | Value | Source |
|----------|-------|--------|
| Tool | **shadcn/ui** | `frontend/components.json` |
| Preset | **radix-nova** with `baseColor: neutral`, `cssVariables: true`, `iconLibrary: lucide`, `registries: {}` | unchanged from Phase 1 |
| Component library | shadcn/ui primitives (Radix UI under the hood); 15 primitives in `components/ui/*` already re-themed in Phase 5 | inherited |
| Icon library | **lucide-react** | inherited (Phase 7 uses `Sparkles`, `X`, `Heart`, `UtensilsCrossed`, `ChefHat`, `RotateCw` — all already imported in current code) |
| Font (display) | **Fraunces** (variable, opsz + wght + ital axes) — `var(--font-display)` | Phase 5 §Typography |
| Font (body) | **IBM Plex Sans** (300/400/500/600 + italic 400) — `var(--font-body)` | Phase 5 §Typography |
| CSS architecture | Tailwind v4 `@theme inline` block in `app/globals.css` | inherited |
| i18n | All strings via `next-intl` from `frontend/lib/i18n/fr.json` | **No new keys in Phase 7** |
| Animation library | framer-motion 12.x via `frontend/lib/motion.ts` presets | inherited; Phase 7 adds `springSnap` named transition |
| Texture asset | `frontend/public/textures/paper-grain.svg` | inherited |
| Tap target floor | **48px** (D-08, raised from 44px in W4) | Phase 4 D-08 + Phase 5 §Spacing |

---

## Spacing Scale

**Inherited from Phase 5 §Spacing unchanged.** Strict 4-multiple subset.

| Token | Value | Usage in Phase 7 |
|-------|-------|------------------|
| xs | 4px | Vote-chip icon gap (none in current chip; reserved) |
| sm | 8px | Vote-chip horizontal padding (`px-2`); compact gaps inside row chrome |
| md | 16px | Card body padding `p-4` on delegation card; ShortlistCard meta-row gap (`gap-4` between groups) |
| lg | 24px | Section gap on HomeDecide between header / deck / vote summary (`gap-6`); page horizontal padding `px-6` |
| xl | 32px | Vertical breathing room above the deck (`pt-8` on tablet-wide screens — preserved Phase 3 idiom) |
| 2xl | 48px | **Tap target floor** (D-08); `h-12` on every interactive button surface, including the ColdStartChip dismiss (W4 gap closure) |
| 3xl | 64px | Bottom-pinned action bar safe-area contribution (inherited from VoteSummary `pb-24`) |

### Phase 7 spacing exceptions

| Exception | Value | Reason |
|---|---|---|
| Vote chip pill | `h-8` (32px), `px-2.5 py-0.5` | **Read-only state indicator, NOT a tap target.** Vote chips in `VoteSummary.tsx` and the per-recipe row are state badges driven by computed vote logic; the user does not tap them to change state. D-08's 48px floor explicitly excludes non-interactive chrome. The `h-8` height is preserved from existing Badge primitive sizing. |
| MemberDot | `12px` (default) / `10px` (in card footer) | Visual primitive; non-interactive; inherited from Phase 3. |
| Partner-vote dot in ShortlistCard footer | `h-2.5 w-2.5` (10px) | Same justification as MemberDot — visual cue, not tappable. |
| ShortlistDeck thumb buttons | `h-14 w-14` (56px) | **Inherited from Phase 3.** Larger than the 48px floor for tactile prominence on the primary swipe alternate path. Preserved unchanged. |
| Delegation card left border accent | `border-l-[3px]` (3px hairline) | Direct mirror of Phase 6 D-Voice pattern. Hairline at 3px registers at iOS subpixel density without competing with the rest of the surface. |
| Shortlist deck card aspect ratio | `aspect-[3/4]` outer, `aspect-[4/3]` photo | Inherited from Phase 3; preserved verbatim. The deck container's 3:4 vertical proportion gives the card a "playing card" feel; the photo's 4:3 landscape preserves food-photography proportions. |
| ColdStartChip outer wrapper | `mx-6 mt-4` (24px horizontal, 16px top) | Inherited from existing component; visual padding to inset from the page edge while sitting above the deck. |

**No other exceptions.** Every other interactive control on Phase 7 surfaces — VoteSummary cook CTA (`h-14`), VoteSummary delegate CTA (`h-14`), VoteSummary regenerate ghost (existing `h-11` **must rise to `h-12`** for D-08 compliance), ColdStartChip dismiss (currently `h-8` **must rise to `h-12`** — DECIDE-05 closure) — meets or exceeds the 48px floor.

### Tap-target audit (post-Phase-7 invariants)

| Surface element | Pre-Phase-7 | Post-Phase-7 (LOCKED) |
|---|---|---|
| ShortlistDeck `ShortlistThumbButtons` | `h-14 w-14` (56px) | unchanged |
| ShortlistCard touch surface | full card area (drag) | unchanged |
| VoteSummary `cook_cta` Button | `h-14 rounded-2xl` | unchanged |
| VoteSummary `delegate_cta` Button | `h-14 rounded-2xl` | unchanged |
| VoteSummary `regenerate_cta` ghost Button | `h-11` ⚠️ (BELOW FLOOR) | **`h-12`** ✓ |
| ColdStartChip dismiss Button | `h-8 w-8` ⚠️ (BELOW FLOOR — W4 D-10 gap) | **`h-12 w-12`** ✓ (DECIDE-05 closure) |
| Delegation card CTA inside Tu-décides Card (NEW; consumed if discretionary extraction lands inline) | n/a | `h-12` ✓ |

The two upward changes (`regenerate_cta` and ColdStartChip dismiss) are non-negotiable. The `regenerate_cta` is currently non-compliant in the existing code; even though it's not explicitly called out in CONTEXT.md, the D-08 floor applies to every interactive control on a Phase 7 surface. The executor must change `frontend/components/VoteSummary.tsx:196` from `h-11` to `h-12`.

---

## Typography (inherited)

**Inherited from Phase 5 §Typography unchanged.** Fraunces + IBM Plex Sans pairing locked. All four utility classes (`text-display`, `text-title`, `text-body`, `text-caption`) carry forward.

### Phase 7 role assignments (decide surfaces)

| Element | Class / family | Reason |
|---|---|---|
| Date header above deck (`HomeDecide` — NEW) | `text-display` (Fraunces italic, weight 500, opsz=96, clamp 32–44px) | **Editorial date moment.** "vendredi 8 mai" reads as a cookbook chapter date, not a UI timestamp. Italic preserved as the editorial signature per Phase 5 §Typography. |
| Page-section heading on the VoteSummary "Vous avez tout vu" view | `text-title` (Fraunces upright, 24px, weight 500, opsz=36) | **Existing implementation uses `text-xl font-semibold leading-7` — Phase 7 upgrades to `text-title`** to match Phase 5 type-scale convergence. The vote-summary heading is the second-most-visible page heading in the daily loop; it deserves the editorial register, not the IBM Plex Sans inbox idiom. (Phase 6 audit IN-01 / Pillar 4 finding informs this upgrade.) |
| ShortlistCard title (recipe name in deck) | `text-title` (Fraunces upright, 24px, weight 500, opsz=36) | **Existing implementation already uses `text-title`** (`ShortlistCard.tsx:183`). Preserved verbatim. |
| ShortlistCard meta row (cuisine + moods badges + prep time) | `text-sm font-medium text-foreground-muted` (IBM Plex Sans 500) | Existing pattern; UI chrome, sans is correct. |
| VoteSummary row title | `text-base font-semibold leading-6` (IBM Plex Sans 600) | List row idiom; preserved unchanged from current code. |
| VoteSummary row state label | `text-sm font-medium leading-5` (IBM Plex Sans 500) | Helper-row idiom; existing. |
| VoteSummary `intro_validated` ("Tu commences ?") | `text-base font-medium text-foreground` (IBM Plex Sans 500) | Preserved unchanged. |
| VoteSummary validated recipe-title display | `text-title` (Fraunces 24px, weight 500, opsz=36) | Editorial moment — the chosen recipe title before the cook CTA. Existing code already uses `text-title`. Preserved. |
| VoteSummary `intro_pressenti` / `intro_none` | `text-sm text-foreground-muted` (IBM Plex Sans 400) | Helper copy under the section heading. Existing. |
| VoteSummary CTA button labels (`cook_cta`, `delegate_cta`, `regenerate_cta`) | Inherited Button primitive (IBM Plex Sans 500) | Existing. |
| **"Tu décides" delegation card body copy** (when rendered as the paper-grain Card variant per CONTEXT.md decision) | `font-display italic text-base text-foreground` (Fraunces italic 500 at 16px) | **Mirrors Phase 6 D-Voice callout pattern.** This is a margin-note register: the delegation copy reads as cookbook editorial, not running UI. Reuses existing key `home.summary.intro_pressenti` ("Ta partenaire n'a pas encore voté. Tu peux déléguer.") OR `home.summary.delegate_helper` ("Je vote oui pour les 5") — see §Surface 3 below. |
| **ColdStartChip body copy** (NEW — DECIDE-05 W4 closure restyle) | `font-display italic text-sm text-foreground` (Fraunces italic 500 at 14px) | **Mirrors Phase 6 D-Voice callout register.** Existing key: `home.cold_start.body` ("Ajoute plus de recettes pour de meilleures suggestions.") The italic Fraunces at 14px is one notch tighter than the delegation card's 16px, fitting the chip's compact horizontal footprint while keeping the editorial register. |
| Vote-chip pill label (5 states) | `text-sm font-medium` (IBM Plex Sans 500) | UI pill idiom; preserved. The chip is a state badge, not editorial. Sans is correct. |
| ShortlistCard partner-vote dot caption (partner name in card footer) | `text-xs font-medium text-foreground-muted` (IBM Plex Sans 500) | Existing. |
| Loading / empty fallback (no shortlist) | `EmptyState` component (uses `text-title` heading internally per Phase 6 retheme) | Inherited Phase 6 EmptyState. No Phase 7 change. |

**Type scale used in Phase 7:** 5 distinct sizes: `text-display` (32–44), `text-title` (24), `text-base` (16), `text-sm` (14), `text-xs` (12). The `text-xs` is the only addition beyond the 4-size Phase 5 ceiling — it is reserved for the partner-vote dot caption inside the ShortlistCard footer, a metadata register that has been in use since Phase 3. **No new sizes added by Phase 7.**

**Weights used in Phase 7:** 400 (running text in delegation card, italic body), 500 (display + title + state labels + CTA labels + chip pills), 600 (row titles, locked usages). Inherited from Phase 5.

---

## Color (inherited)

**Inherited from Phase 5 §Color unchanged.** Terracotta primary on warm cream. All OKLCH values verbatim. The `--color-valide-tint` (h≈145 emerald wash) is preserved unchanged from Phase 3 / Phase 5.

### Phase 7 60/30/10 application on decide surfaces

| Slot | % | Where it appears in Phase 7 |
|---|---|---|
| Dominant (60%) | `--background` (cream) | Page background under HomeDecide; the deck stage's outer container; VoteSummary outer container; ColdStartChip parent margin. |
| Secondary (30%) | `--card`, `--secondary`, `--muted`, `--popover`, `--surface-muted` (warm cream / warm taupe family) | ShortlistCard frame (`bg-card`); peek-card frame; VoteSummary row containers (default `bg-card border-border` for non-Validé rows); ColdStartChip frame (`bg-card paper-grain` — replaces v0.1 legacy `bg-surface-rose-50`); delegation paper-grain Card; ShortlistCard photo-empty placeholder (`bg-surface-muted`); Sheet backdrop. |
| Accent (10%) | `--primary` (terracotta `oklch(0.595 0.135 35)`) and faint wash `--surface-rose-100` | **Reserved-for list below — no other usage.** |

### Accent reserved-for in Phase 7 (LOCKED)

The terracotta accent appears in Phase 7 ONLY on:

1. **Primary CTAs** — every `Button variant="default"` with terracotta surface:
   - VoteSummary `cook_cta` (`h-14 rounded-2xl`, "Je commence à cuisiner")
   - VoteSummary `delegate_cta` (`h-14 rounded-2xl`, "Tu décides")
   - Delegation card CTA (when discretionary `Tu décides` paper-grain card lands inline) — `h-12`, "Tu décides"
2. **Focus rings** — `--ring` (keyboard focus visibility) on every interactive button (regenerate, cook, delegate, ColdStartChip dismiss, deck thumb buttons).
3. **Pressenti vote-chip wash** — `bg-primary/15 text-primary border border-primary/40` (terracotta at 15% wash + 40% border + full saturation foreground). The `Pressenti` chip is the second-strongest signal (one yes vote, one pending) — restrained terracotta wash communicates "leaning yes" without competing with destination CTAs.
4. **Delegation card left-border accent** — 3px terracotta strip on the leading edge of the Tu-décides paper-grain Card (`border-l-[3px] border-primary/60`). Direct mirror of Phase 6 D-Voice pattern.
5. **ColdStartChip Sparkles icon color** — `text-primary` (terracotta). Replaces existing `text-foreground-muted`. Reads as "first-run guidance, not error" per CONTEXT.md decision.
6. **Realtime "Validé" celebration toast** — Sonner toast uses inherited Phase 5 toast styling; no Phase 7 override. The terracotta accent inside the toast is via inherited primary surface only.

**Anti-patterns explicit for Phase 7:**

| Anti-pattern | Why excluded |
|---|---|
| Terracotta on Validé chip | Validé uses **emerald** `--color-valide-tint` (preserved Phase 3 semantic — "consensus reached"). Terracotta would collide with the milestone primary accent and dilute Validé's distinct meaning. |
| Terracotta on regenerate ghost button | Ghost buttons stay neutral; terracotta is reserved for destination CTAs. The regenerate action is a secondary path. |
| Terracotta on ColdStartChip background | ColdStartChip body is `bg-card paper-grain` (warm cream + paper-grain). Terracotta appears only on the Sparkles icon and (transitively) on the dismiss button's focus ring. The chip is informational chrome, not a CTA. |
| Terracotta on member dots | MemberDots use `members.color_hex` (per-member identity); terracotta never appears here. |
| Cool grays anywhere | Phase 5 anti-pattern; warm-gray family only. |
| Purple gradients | Phase 5 anti-pattern. |

### Vote-chip color mapping (DECIDE-03 — LOCKED 5-state contract)

The 5 vote states from `compute_vote_state` (locked v0.1) render as the following pill chips. Implemented in `VoteSummary.tsx` row state column (and any future per-recipe chip strip if extracted).

| State | i18n key | Class string | Reasoning |
|---|---|---|---|
| **Validé** | `vote.state.valide` → "Validé" | `bg-[var(--color-valide-tint)] text-foreground border border-emerald-500/30` | Emerald wash from Phase 3 token — preserved unchanged. The "consensus reached" semantic; never terracotta. |
| **Pressenti** | `vote.state.pressenti` → "Pressenti" | `bg-primary/15 text-primary border border-primary/40` | Terracotta wash at 15% with 40% saturation border — "leaning yes," uses milestone accent without competing with destination CTAs. |
| **Contesté** | `vote.state.conteste` → "Contesté" | `bg-destructive/10 text-destructive/80 border border-destructive/30` | Quieted destructive — active dispute, but warm-family quiet. NOT alarm red. |
| **Rejeté** | `vote.state.rejete` → "Rejeté" | `bg-muted text-muted-foreground line-through` | Warm-taupe muted with line-through type — "off the table." Strikethrough is the visual "crossed off." |
| **Sans avis** | `vote.state.sans_avis` → "Sans avis" | `bg-transparent text-muted-foreground border border-border` | Border-only ghost — "pending/unknown." No fill so it sits flat against the row surface. |

**Pill shape contract (all 5 states):** `inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium h-8` — IBM Plex Sans 500, height 32px, pill (`rounded-full`). The chips are **read-only state indicators** (not tap targets); D-08's 48px floor does not apply per CONTEXT.md decision (locked).

**Implementation guidance — extraction question (Claude's Discretion):**
Phase 7 may extract a shared `VoteChip` subcomponent in `frontend/components/VoteSummary.tsx` (or as a sibling file) that accepts `state: VoteState` and renders the correct class string. **Recommended:** keep the chip render inline at the call site as a `getChipClass(state)` helper function (matching the existing `stateClass(state)` and `rowBgClass(state)` helpers in `VoteSummary.tsx:49-64`). Reason: only one consumer in v0.2 (the row-state column); premature extraction adds indirection without reuse benefit. If a second consumer emerges (e.g. inline chip strip on the ShortlistCard meta row), refactor to a `<VoteChip state={...} />` component at that point — low-cost.

**Locked 1-line approval:** the chip render replaces the existing `<span className={'text-sm font-medium leading-5 ${stateClass(row.state)}'}>{tState(row.state)}</span>` at `VoteSummary.tsx:127-131` with the pill markup above. The class string switches by state via the helper function.

### Destructive — reserved for in Phase 7

`--destructive` only on:
- `Contesté` vote-chip wash + border (via `bg-destructive/10 text-destructive/80 border border-destructive/30`)
- ShortlistCard partner-vote dot when partner voted "no" (`bg-destructive/40` — preserved from Phase 3)
- ShortlistDeck `ShortlistThumbButtons` "no" thumb (`border-destructive/50 text-destructive` — preserved)
- ShortlistCard "NON" overlay during drag (`text-destructive border-destructive`, `aria-hidden`, drag-only — preserved)
- Toast `variant="destructive"` for actual error conditions (`vote_failed`, `regenerate_failed`, `delegate_failed`, `cook_failed`)

**No `Button variant="destructive"` in Phase 7.** No surface introduces a destructive CTA. The vote-chip wash is the strongest destructive surface.

### DECIDE-03 token reconciliation comment lock (NEW — single line addition)

Phase 5 already harmonized `--color-valide-tint` (no accent) as the canonical CSS variable name. **Verified zero hits for the accented form** across `globals.css`, frontend source, and SPEC.md.

Phase 7 deliverable: add a one-line CSS comment at the `--color-valide-tint` definition site in `frontend/app/globals.css:72` declaring the canonical name and forbidding accidental re-introduction of the accented form.

**Exact line content (executor inserts at line 72, immediately above or as a leading comment of the `--color-valide-tint:` declaration):**

```css
  /* CANONICAL — DO NOT introduce `--color-validé-tint` (with French accent). DECIDE-03 invariant lock. */
  --color-valide-tint: var(--valide-tint);
```

**Why a comment, not a CI gate:** A grep-based CI rule was considered and rejected per CONTEXT.md ("tooling debt out of scope"). The comment is the cheapest invariant lock and lives at the only place where the token is defined; any future executor reading the line gets the contract immediately. Total Phase 7 churn for DECIDE-03: **1 line of CSS comment.**

---

## Shadows (inherited)

**Inherited from Phase 5 §Shadows unchanged.** Two-layer warm-brown paper-on-wood shadows. Token names (`shadow-card`, `shadow-card-hover`, `shadow-nav`) work as before.

### Phase 7 shadow application

| Surface | Shadow class |
|---|---|
| ShortlistCard front (active swipe target) | `shadow-card-hover` (existing) — the lifted card on the deck stack reads as raised paper. |
| ShortlistCard peek (behind front) | `shadow-card` (existing) — the deeper layer sits flatter. |
| VoteSummary row container — default state | `border border-border` only (no shadow; rows stack flat in a list). Preserved. |
| VoteSummary row container — Validé state | `bg-valide-tint border-emerald-500/30` (no shadow). Tone-on-tone differentiation, not elevation. Preserved. |
| **ColdStartChip frame** (NEW retheme) | `shadow-card` — replaces existing `bg-surface-rose-50 border border-border`. |
| **"Tu décides" delegation paper-grain Card** (NEW or restyled) | `shadow-card` — paper-on-wood lift. Mirrors Phase 6 D-Voice callout. |
| HomeDecide outer container (page bg) | None (chrome, not card). |
| CookingBanner | inherited (unchanged in Phase 7) |
| PushPermissionBanner | inherited (unchanged in Phase 7) |

---

## Paper-Grain Texture (inherited application contract)

**Inherited from Phase 5 §Paper-Grain.** The `.paper-grain` utility class is wired in Phase 5 on `Card`, `DialogContent`, `SheetContent`, `AlertDialogContent`, `SelectContent`. Phase 6 extended usage to draft cards, D-Voice callout, EmptyState, Plus-tile, quick-add photo-picker wrapper. Phase 7 **extends usage** to ShortlistCard frame, ColdStartChip frame, and the Tu-décides delegation Card.

### Phase 7 paper-grain placement

| Element | Apply `paper-grain`? |
|---|---|
| ShortlistCard frame (`motion.div` outer container, both front and peek) | **Yes** — recipe cards on a kitchen counter; grain reinforces the metaphor on the daily-decide surface. The card already uses `bg-card border border-border rounded-2xl`; add `paper-grain` to both the `isFront` and peek className strings. |
| ShortlistCard photo region (`<div className="relative aspect-[4/3] bg-surface-muted">`) | **No** — photo bytes ARE the surface; grain on top of food photography is dust, not paper. The photo's empty-state placeholder fallback (UtensilsCrossed icon over `bg-surface-muted`) also stays grain-free since it occupies the same bounding box. |
| ShortlistCard body region (below photo, where title + meta render) | **Yes** (inherited from card-level `paper-grain`) — the `paper-grain::before` pseudo on the parent covers the whole card; the photo region clears it via the rounded-t mask (see below). |
| ShortlistCard partner-vote dot footer (absolute-positioned) | **No** — sits as a separate floating chip with its own `bg-card/70 backdrop-blur-sm` background; grain would conflict with the blur. |
| Vote-chip pills (5 states) | **No** — chrome, too small for grain to register; Phase 5 anti-pattern (chrome stays grain-free). |
| **ColdStartChip frame** (NEW retheme) | **Yes** — informational card surface; grain reinforces "this is paper." |
| **"Tu décides" delegation Card** (NEW; whether inlined in HomeDecide or extracted) | **Yes** — direct mirror of Phase 6 D-Voice pattern. |
| HomeDecide page background | **No** — full-page background; Phase 5 anti-pattern. |
| HomeDecide date header (display-text, no card) | **No** — the date renders as standalone display text on the page background, NOT as a card. (If the executor chooses to wrap the date in a paper-grain Card per CONTEXT.md "Daily Shortlist Screen" hint, see Surface 1 below for the conditional contract.) |
| VoteSummary row containers | **No** — the rows currently use `bg-card border border-border` without `paper-grain`. Phase 7 leaves the rows grain-free to keep the chip color story (Validé emerald wash, Pressenti terracotta wash, Contesté destructive wash, Rejeté muted, Sans avis ghost) reading as the primary visual signal on each row. Adding grain here would compete with the chip-color cue. (Anti-pattern call-out below.) |
| VoteSummary outer container | **No** — page chrome. |
| ShortlistDeck thumb buttons | **No** — buttons; Phase 5 anti-pattern. |
| Sticky/PushPermissionBanner / CookingBanner | inherited from existing Phase 3/4 components; no Phase 7 change. |

### Phase 7 paper-grain anti-patterns

| Anti-pattern | Why excluded |
|---|---|
| Paper-grain on VoteSummary row containers | Would compete with the 5-state vote-chip color story. The chip wash IS the row's visual primary. Keep rows grain-free. |
| Paper-grain on ShortlistCard photo region | Photo bytes are the surface. Grain becomes dust. |
| Paper-grain on ColdStartChip dismiss button | Phase 5 anti-pattern (buttons stay grain-free). |
| Paper-grain on the page background under HomeDecide | Phase 5 anti-pattern (full-page bg stays grain-free). |

### ShortlistCard rounded-t photo treatment (NEW per CONTEXT.md)

Per CONTEXT.md §"ShortlistCard": `aspect-[4/3] object-cover rounded-t-xl` so the photo's top corners curve to match the card frame, but the bottom edge of the photo meets the card surface flush. Reads as "photo printed onto the recipe card."

**Implementation hint:** the existing `ShortlistCard.tsx:138` uses `<div className="relative aspect-[4/3] bg-surface-muted">` for the photo region. Wrap the inner `<img>` (and the empty-state UtensilsCrossed div) in the same parent; add `rounded-t-xl overflow-hidden` to the parent so the photo content clips to the top corners while the bottom remains square. The card frame's `rounded-2xl` corners on the outer `motion.div` are independent — the executor must use `rounded-t-2xl` on the photo region's parent div to match (NOT `rounded-t-xl`, which would mismatch the card's `2xl` radius). **The frame is `rounded-2xl`; the photo top corners must use `rounded-t-2xl` to match.** (CONTEXT.md says `rounded-t-xl` — this UI-SPEC supersedes that recommendation to match the existing frame radius. Document the deviation in SUMMARY.md.)

---

## Motion (inherited + 1 addition)

**Inherited from Phase 5 §Motion unchanged.** One curve (`--ease-craft`), two durations (`--duration-fast` 150ms, `--duration-normal` 280ms). Framer Motion presets in `frontend/lib/motion.ts` (`variants`, `transitions`, `easeCraft`, `durations`).

### Phase 7 motion contract

| Surface / interaction | Animation |
|---|---|
| **ShortlistCard front-card snap-back / settle** (the new spring physics for swipe interactions; CONTEXT.md "paper-physics translation") | **Spring transition: `{ type: "spring", stiffness: 240, damping: 28, mass: 1.1 }`.** Slightly higher mass than Framer Motion's default reads as "card on a counter," not rubber band. The spring damps without an explicit bounce parameter — overshoot is minimal. Applied via the `transition` prop on the front `<motion.div>` in `ShortlistCard.tsx:117`. **No structural rewrite of `ShortlistDeck.tsx`.** The change is the addition of the `transition` prop on the active card; everything else (drag gesture, dragConstraints, dragSnapToOrigin, dragElastic, onDragEnd, useMotionValue, useTransform for rotate / yes-no overlay opacity) is preserved byte-for-byte. |
| ShortlistCard peek (behind front) | No transition — static scale + opacity (existing). |
| ShortlistCard YES/NO drag overlays | useTransform on motion-value `x` (existing; no animation change). |
| ShortlistDeck `ShortlistThumbButtons` press feedback | `active:scale-95 transition-transform` (existing) — Phase 7 no change. |
| **AnimatePresence on the deck card swap (front-card commit / next-card-rises)** | Existing `<AnimatePresence mode="wait">` at `ShortlistDeck.tsx:123` is preserved unchanged. The framer-motion default exit fades; combined with the spring transition above on the front card, the gesture reads as "commit the card, next slides into place." |
| HomeDecide section transitions (between deck phase and VoteSummary phase, when `allVoted` flips) | No new animation. The phase swap is a React conditional render — existing CSS transitions on the underlying components handle the soft transition. Phase 7 adds nothing here. |
| Realtime `vote.created` partner echo (state reconciliation) | No animation — React state update only. The vote-chip color shift on the row uses `transition-colors duration-fast ease-craft` (inherited from Phase 5 primitive re-theme); the chip transitions warmly on color change. |
| Realtime `shortlist.created` arrival | Existing toast pattern (Sonner; inherited from Phase 5 sonner re-theme). No Phase 7 motion addition. |
| **ColdStartChip dismiss** | The chip removal is React conditional (`useSyncExternalStore` returns `dismissed=true` → `if (dismissed) return null;` at line 43). Optional: wrap in `AnimatePresence` with `variants.fadeIn` exit at `transitions.fast`. **Recommended:** add the AnimatePresence wrapper for visual continuity (chip fades out over 150ms instead of instant disappear). Implementation: `<AnimatePresence>{!dismissed && <motion.div key="chip" variants={variants.fadeIn} initial="hidden" animate="visible" exit={{ opacity: 0, transition: transitions.fast }}>...</motion.div>}</AnimatePresence>`. Cosmetic refinement; not strictly required. |
| Reduced-motion | `@media (prefers-reduced-motion: reduce)` in `globals.css:377-383` clamps all CSS animations + transitions to 0ms globally. **No per-component `useReducedMotion()` calls in Phase 7** — the existing `usePrefersReducedMotion` hook in `ShortlistCard.tsx:49-63` (which disables drag + rotation + overlays in reduced-motion mode) is preserved verbatim. Framer Motion respects the user's `prefers-reduced-motion` automatically through MotionConfig defaults; the spring transition on front-card snap-back will collapse to instant when the OS-level toggle is on. **Verified inheritance only.** |

### `frontend/lib/motion.ts` — single addition (`springSnap`)

Phase 7 adds **one** named export to the existing `transitions` object so the spring values become reusable and self-documenting:

```ts
// Add inside the existing `transitions` object literal:
export const transitions = {
  fast: { duration: durations.fast, ease: easeCraft } satisfies Transition,
  normal: { duration: durations.normal, ease: easeCraft } satisfies Transition,
  // Phase 7 — paper-physics card snap-back. Slightly higher mass than the
  // Framer Motion default reads as "card on a counter," not "rubber band."
  // The spring damps naturally without an explicit bounce parameter.
  // Per 07-UI-SPEC §Motion + 07-CONTEXT §"Swipe Deck Physics".
  springSnap: { type: "spring", stiffness: 240, damping: 28, mass: 1.1 } satisfies Transition,
} as const;
```

**Consumer:** `ShortlistCard.tsx:117` — add `transition={transitions.springSnap}` to the `<motion.div>` when `isFront` is true. Peek card has no transition prop change (it remains static).

**No new variants added.** The existing `swipeCommit` variant (left/right/rest) is not consumed by ShortlistCard (the card uses `useMotionValue(0)` + `useTransform` directly, not variants). Phase 7 leaves `swipeCommit` available for future deck rewrites but does NOT consume it now — preserves the no-structural-rewrite invariant from CONTEXT.md.

### Animation cadence discipline

Phase 7 introduces only TWO motion changes:
1. `springSnap` transition on the front swipe card (`ShortlistCard.tsx:117`).
2. (Optional) `fadeIn` AnimatePresence on ColdStartChip dismiss for visual continuity.

**No stacked effects.** No simultaneous slide + scale + spring. No staggered children. The cadence is "one motion at a time, deliberate, paper-physical." Subtle over decorative is the rule.

### Spring tuning escape hatch (Claude's Discretion)

CONTEXT.md notes: "start at `240/28/1.1` and tune by 5–10% if iPhone swipe feels too tight or too floaty. Document final values in SUMMARY.md." This UI-SPEC LOCKS the starting values. The executor may adjust within ±10% (i.e. stiffness 216–264, damping 25–31, mass 0.99–1.21) ONLY after dual-iPhone testing validates a specific feel issue. Default: ship 240/28/1.1.

---

## Component Inventory (deltas from Phase 5/6)

Phase 7 introduces **zero new shadcn primitives**. The 15 primitives in `components/ui/*` are already re-themed (Phase 5). Phase 7 modifies application-level components only.

### Application components touched in Phase 7

| File | Change shape |
|------|--------------|
| `frontend/app/globals.css:72` | **Add 1 line of CSS comment** above the `--color-valide-tint` declaration: `/* CANONICAL — DO NOT introduce '--color-validé-tint' (with French accent). DECIDE-03 invariant lock. */`. No other change to globals.css. |
| `frontend/lib/motion.ts` | **Add `springSnap` named transition** to the existing `transitions` object (see §Motion above). 5 lines added; existing exports unchanged. |
| `frontend/components/HomeDecide.tsx` (440 LOC) | **Add display-serif date header** above the deck region. Adopt `text-display` (Fraunces italic) for the date string. Use existing `next-intl` date formatting (or `Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })` if no key exists yet — which is currently the case). The header sits as a standalone block: `<header className="px-6 pt-8 pb-2"><h1 className="text-display text-foreground">{formattedDate}</h1></header>`. **Section gap between header / deck / vote summary / cooking banner**: the existing flat flex-col stays; gaps live on the deck container (`gap-6`) and the page padding (`px-6`). The page background remains `bg-background` (cream); paper-grain stays on Cards only. **"Tu décides" delegation card retreatment** — see §Surface 3 below: when the VoteSummary's `pressentiRow` branch fires (or the all-rejected fallback), the page presents the delegation as a paper-grain Card with a 3px terracotta-60 left border + Fraunces italic copy + terracotta CTA at `h-12`. Implementation choice (Claude's Discretion per CONTEXT.md): inline the markup in `VoteSummary.tsx` (closer to the data) — see VoteSummary entry below. **The cosmetic header addition is the only direct change to HomeDecide.tsx.** Behavioral logic (initial fetch, realtime listeners, vote / regenerate / delegate / cook / banner-skip handlers) preserved byte-for-byte. |
| `frontend/components/ShortlistDeck.tsx` (141 LOC) | **No structural change.** The transition prop change happens in `ShortlistCard.tsx`, not here. The deck container (`flex flex-col flex-1 items-center justify-center px-4 pt-4 pb-8 gap-6`) is preserved verbatim. The `AnimatePresence mode="wait"` wrapping the front card is preserved. |
| `frontend/components/ShortlistCard.tsx` (260 LOC) | (1) **Add `paper-grain` to the front card className** at line 133: `"absolute inset-0 paper-grain bg-card border border-border rounded-2xl shadow-card-hover overflow-hidden flex flex-col touch-pan-y"`. (2) Add `paper-grain` to the peek card className at line 134 similarly. (3) **Add the rounded-t treatment to the photo region**: change line 138 from `<div className="relative aspect-[4/3] bg-surface-muted">` to `<div className="relative aspect-[4/3] bg-surface-muted rounded-t-2xl overflow-hidden">` (see §Paper-Grain ShortlistCard rounded-t photo treatment for reasoning). (4) **Add `transition={transitions.springSnap}` to the front `<motion.div>` `style` peer** (i.e. on the same JSX element at `ShortlistCard.tsx:117-121`, add `transition={transitions.springSnap}` as a sibling prop). Import: `import { transitions } from "@/lib/motion";`. (5) Apply ONLY when `isFront && !reducedMotion` — for the peek card and for reduced-motion mode, leave transition undefined (existing default behavior). The rotation, drag, opacity overlays, partner-dot footer, body content (title + meta), and ShortlistThumbButtons stay as-is. |
| `frontend/components/VoteSummary.tsx` (205 LOC) | (1) **Upgrade row state column from text label to pill chip** — replace `VoteSummary.tsx:127-131` `<span className={'text-sm font-medium leading-5 ${stateClass(row.state)}'}>{tState(row.state)}</span>` with `<span className={chipClass(row.state)}>{tState(row.state)}</span>` where `chipClass(state)` is a new helper function returning the locked 5-state class strings from §Color "Vote-chip color mapping" above. (2) **Replace the existing `stateClass` helper at lines 49-58 with the new `chipClass` helper** — same signature `(state: VoteState) => string`, returns the full pill class string per state. (3) **Upgrade page heading** at line 115 from `<h2 className="text-xl font-semibold leading-7">{t("heading")}</h2>` to `<h2 className="text-title">{t("heading")}</h2>` (Fraunces 24px / opsz=36; Phase 5 type-scale convergence; addresses Phase 6 audit IN-01 finding). (4) **Bump regenerate button** at line 196 from `className="h-11"` to `className="h-12"` (D-08 floor). (5) **Tu décides delegation surface — paper-grain Card variant**: in the `pressentiRow` branch (and the fallback `else` branch) at lines 161-191, **wrap the existing Button in a paper-grain Card with the D-Voice-pattern left border**. Replace the `<><p className="text-sm text-foreground-muted">{t("intro_pressenti")}</p><Button ...>{t("delegate_cta")}</Button></>` fragment with a `<Card className="paper-grain shadow-card border-l-[3px] border-primary/60 px-4 py-3 flex flex-col gap-3"><p className="font-display italic text-base text-foreground">{t("intro_pressenti")}</p><Button type="button" variant="default" className="h-12 w-full" disabled={delegateInFlight} onClick={onDelegate}>{t("delegate_cta")}</Button></Card>`. Same treatment in the all-rejected fallback (`intro_none`). The validated row branch keeps its existing flat layout (no Card wrap) — the validated row IS the destination, not a callout. **Existing i18n keys reused; zero new keys.** (6) The remaining row-by-row map render and the `rowBgClass` helper are preserved unchanged. |
| `frontend/components/ColdStartChip.tsx` (64 LOC) | **Full retheme** (W4 D-08 closure). Replace the existing outer div className at line 45 from `"mx-6 mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-rose-50 border border-border"` with `"mx-6 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-card paper-grain shadow-card border border-border"`. **(1) Replace `bg-surface-rose-50` with `bg-card paper-grain shadow-card`** — replaces the legacy v0.1 alias with the Phase 5 system. Padding rises from `px-3 py-2` to `px-4 py-3` to give the paper-grain texture room to read; gap rises from `gap-2` to `gap-3` to balance the larger touch chrome below. **(2) Restyle Sparkles icon** at line 48 from `className="text-foreground-muted"` to `className="text-primary"` (terracotta — first-run guidance, not error per CONTEXT.md). **(3) Restyle body copy** at line 51 from `<p className="text-sm font-medium leading-5 flex-1">{t("body")}</p>` to `<p className="font-display italic text-sm text-foreground flex-1">{t("body")}</p>` — Fraunces italic at 14px to match Phase 6 D-Voice register and the delegation card register. (4) **Bump dismiss button** at lines 52-61 from `className="h-8 w-8"` to `className="h-12 w-12"` — closes DECIDE-05 W4 D-08 floor gap. (5) Preserve existing `useSyncExternalStore` machinery (lines 12-32), sessionStorage gate, dispatch event, and ARIA label (`tCommon("close")` → "Fermer"). Body copy `home.cold_start.body` → "Ajoute plus de recettes pour de meilleures suggestions." stays unchanged. (6) **Optional**: wrap the chip body in `<AnimatePresence>{!dismissed && <motion.div ...>}</AnimatePresence>` for fade-out continuity on dismiss (`variants.fadeIn` + `transitions.fast` exit). Recommended but not required; cosmetic refinement only. |
| `frontend/components/MemberDot.tsx` (54 LOC) | **No change.** Color attribution dot consumed by Phase 7 surfaces unchanged. |
| `frontend/components/CookingBanner.tsx` | **No change in Phase 7.** Phase 8 closes the COOK-07 retheme (Finaliser `<Button asChild>` + h-12). Phase 7 leaves CookingBanner untouched. |
| `frontend/components/PushPermissionBanner.tsx` | **No change in Phase 7.** |
| `frontend/components/EmptyState.tsx` | **No change in Phase 7.** Phase 6 already re-themed it (paper-grain Card + `text-title` heading + h-12 CTA). HomeDecide's empty-state branch consumes EmptyState unchanged. |
| `frontend/components/RegenerateSheet.tsx` | **No change in Phase 7.** Inherits Phase 5 Sheet re-theme (paper-grain SheetContent, warm shadow, font-display title). |

### "Tu décides" delegation surface — implementation choice (Claude's Discretion)

Per CONTEXT.md: "Whether to factor the delegation Card into a shared `DelegationCallout.tsx` component or inline it in `HomeDecide.tsx` — judgment call based on reuse potential."

**Recommended: inline the markup inside `VoteSummary.tsx`** (in the `pressentiRow` and fallback branches). Reason:
1. Only one consumer in v0.2 (the VoteSummary component, in two adjacent branches).
2. Keeping the markup inline puts it next to the data it reads (`pressentiRow`, `delegateInFlight`, `onDelegate`).
3. If a second consumer emerges (e.g. a partner-side "Validé!" celebration card on Phase 8 cook surfaces), refactor to `<DelegationCallout />` at that point — low cost.
4. Premature extraction adds a file, an import, and a prop interface without reuse benefit.

The markup is small enough (1 Card + 1 paragraph + 1 Button) that inlining keeps the call site readable without bloating it.

### Vote-chip extraction — implementation choice (Claude's Discretion)

Per CONTEXT.md: "Whether to extract a shared `VoteChip` component from `VoteSummary.tsx` or keep the chip render inline in the same file."

**Recommended: keep inline** as a `chipClass(state)` helper function next to the existing `rowBgClass(state)` helper. Same reasoning as delegation surface — only one consumer, keep markup near the data, defer extraction until a second consumer appears.

If a future iteration introduces an inline chip strip on the ShortlistCard meta row (CONTEXT.md mentions "Vote chip strip at the bottom of the card"), the executor must NOT pre-emptively introduce that strip in Phase 7 — CONTEXT.md scopes ShortlistCard changes to "frame, photo treatment, meta layout below photo, vote chip strip at the bottom of the card" as a description of structural intent, but the existing card body at lines 180-200 already renders cuisine + moods + prep-time chips below the photo — that IS the meta layout. The "vote chip strip" wording in CONTEXT.md refers to the existing meta chip strip (badges for cuisine + moods), not a new per-recipe vote-chip strip. **Phase 7 does NOT add a new vote-chip strip on ShortlistCard.** Vote chips remain in VoteSummary only.

---

## Surface-by-Surface Pinning

The exact visual contract per surface. Executors implement these top-down.

### Surface 1 — HomeDecide page (date header + section spacing)

**Location:** `frontend/components/HomeDecide.tsx`

**Layout (top-down, the new structure):**

```
<div className="flex flex-col flex-1">
  <PushPermissionBanner />               {/* existing, untouched */}
  {cookingBannerVisible && activeLog && <CookingBanner ... />}  {/* existing */}
  {showCorpusColdStart && <ColdStartChip />}                    {/* re-themed; see Surface 5 */}

  <header className="px-6 pt-8 pb-2">
    <h1 className="text-display text-foreground">
      {formattedDate}                    {/* e.g., "vendredi 8 mai" */}
    </h1>
  </header>

  {allVoted ? (
    <VoteSummary ... />                  {/* re-themed; see Surface 4 */}
  ) : (
    <ShortlistDeck ... />                 {/* re-themed via ShortlistCard; see Surface 2 */}
  )}

  <RegenerateSheet ... />                {/* existing, untouched */}
</div>
```

**Phase 7 changes:**
1. **Add the `<header>` block** above the deck/summary conditional render. The header sits between the cold-start chip and the deck.
2. **Section spacing**: existing `flex flex-col flex-1` on the outer container is preserved. The new header uses `pt-8 pb-2` (32px top, 8px bottom) to give the date display-text breathing room above the deck. The deck container's existing `pt-4` provides additional separation. The total visual rhythm: chip (`mt-4`) → header (`pt-8 pb-2`) → deck (`pt-4`) → thumb buttons (`pb-8`) → bottom nav.
3. **Date formatting**: use `new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())` to produce "vendredi 8 mai" (no year — too granular for daily-decide; the user already knows the year). Lowercase per French convention. **No new i18n key** — the format is locale-aware via the standard browser `Intl` API. Document the choice as "browser Intl, no i18n key" in SUMMARY.md.
4. **No paper-grain on the header** — the date renders as standalone display text against the page background. CONTEXT.md mentions "paper-grain Card surface for the date row only" as one option; this UI-SPEC chooses **NO Card wrap** because (a) the header is a single line, not a multi-line composition that benefits from elevation, and (b) the page already has multiple cards below (deck card, ColdStartChip, delegation card) — adding a date Card would over-compose the surface. Reads as cookbook-section-divider, not third card.

### Surface 2 — ShortlistDeck + ShortlistCard

**Location:** `frontend/components/ShortlistDeck.tsx` + `frontend/components/ShortlistCard.tsx`

**Layout:** preserved verbatim. The deck stack (peek behind front), drag gesture, dragSnapToOrigin, dragElastic, threshold-based onDragEnd commit, ShortlistThumbButtons row below the deck — all unchanged.

**Phase 7 changes (in ShortlistCard.tsx):**
1. **Front card className** (line 133): add `paper-grain` to the existing class string.
2. **Peek card className** (line 134): add `paper-grain` to the existing class string.
3. **Photo region** (line 138): add `rounded-t-2xl overflow-hidden` so the photo's top corners curve to match the card frame's `rounded-2xl` while the bottom edge sits flush against the card body.
4. **Spring snap-back transition**: add `transition={transitions.springSnap}` to the front `<motion.div>` (apply only when `isFront && !reducedMotion`). Import `transitions` from `@/lib/motion`. The existing `style={{ x, rotate }}` and `whileTap` props remain unchanged.

**Phase 7 changes (in ShortlistDeck.tsx):** **none structural.** The component file is unchanged.

**ShortlistCard body (no structural change):**
- Title: `text-title` (Fraunces 24px) — already correct.
- Meta row: existing Badges + prep-time text — preserved.
- Partner-vote dot footer: existing — preserved.
- Drag overlays (OUI/NON): preserved.

### Surface 3 — VoteSummary (5-state vote chips + Tu-décides delegation card)

**Location:** `frontend/components/VoteSummary.tsx`

**Layout (top-down, post-Phase-7):**

```
<div className="flex flex-col flex-1 px-6 pt-6 pb-24 gap-6">
  <h2 className="text-title">{t("heading")}</h2>          {/* upgraded from text-xl */}

  <div className="flex flex-col gap-3">
    {rows.map((row) => (
      <div className="flex items-center gap-3 px-3 py-3 min-h-14 rounded-xl border ${rowBgClass(row.state)}">
        <div className="flex-1 ...">
          <span className="text-base font-semibold leading-6 line-clamp-1">{row.recipe.title}</span>
          <span className={chipClass(row.state)}>{tState(row.state)}</span>     {/* upgraded to pill chip */}
        </div>
        <div className="flex items-center gap-1.5">
          {dotForVote(row.myVote, me.color_hex)}
          {dotForVote(row.partnerVote, partner.color_hex)}
        </div>
      </div>
    ))}
  </div>

  <div className="flex flex-col gap-3 pt-4">
    {validatedRow ? (
      <>
        <p className="text-base font-medium text-foreground">{t("intro_validated")}</p>
        <p className="text-title line-clamp-1">{validatedRow.recipe.title}</p>
        <Button variant="default" className="h-14 rounded-2xl" disabled={cookInFlight} onClick={() => onCookStart(validatedRow.recipe.id)}>
          <ChefHat size={20} className="mr-2" />
          {t("cook_cta")}
        </Button>
      </>
    ) : pressentiRow ? (
      // NEW: Tu-décides paper-grain Card (mirrors Phase 6 D-Voice pattern)
      <Card className="paper-grain shadow-card border-l-[3px] border-primary/60 px-4 py-3 flex flex-col gap-3">
        <p className="font-display italic text-base text-foreground">{t("intro_pressenti")}</p>
        <Button variant="default" className="h-12 w-full" disabled={delegateInFlight} onClick={onDelegate}>
          {t("delegate_cta")}
        </Button>
      </Card>
    ) : (
      // NEW: same Card pattern for the all-rejected fallback
      <Card className="paper-grain shadow-card border-l-[3px] border-primary/60 px-4 py-3 flex flex-col gap-3">
        <p className="font-display italic text-base text-foreground">{t("intro_none")}</p>
        <Button variant="default" className="h-12 w-full" disabled={delegateInFlight} onClick={onDelegate}>
          {t("delegate_cta")}
        </Button>
      </Card>
    )}

    <Button type="button" variant="ghost" className="h-12" onClick={onRegenerate}>   {/* h-11 → h-12 */}
      <RotateCw size={16} className="mr-2" />
      {t("regenerate_cta")}
    </Button>
  </div>
</div>
```

**Phase 7 changes (verbatim):**
1. Heading at line 115: `text-xl font-semibold leading-7` → `text-title`.
2. Replace `stateClass(state)` helper at lines 49-58 with `chipClass(state)` returning the full 5-state pill class strings from §Color.
3. Replace the row state span at lines 127-131 with `<span className={chipClass(row.state)}>{tState(row.state)}</span>`. The `rowBgClass(state)` helper at lines 60-64 is preserved (drives the row container's `bg-valide-tint` vs `bg-card` differentiation).
4. Wrap the `pressentiRow` branch and the fallback `else` branch in a paper-grain `<Card>` with the D-Voice pattern. Import `Card` from `@/components/ui/card`. Markup as shown above. Existing `intro_pressenti` and `intro_none` keys reused; CTA stays at `h-12 w-full`.
5. Regenerate ghost Button at line 196: `h-11` → `h-12`.
6. Validated branch (`validatedRow ? ...`): preserved verbatim (no Card wrap; the validated row IS the destination).

**Anti-pattern guard:** the validated branch must NOT also wrap in a paper-grain Card. The validated state is a "go" signal — its presentation is a flat editorial composition (intro + Fraunces title + terracotta CTA) on the page surface. Wrapping it would dilute the "this is the chosen one" feeling.

### Surface 4 — ColdStartChip (W4 DECIDE-05 closure + retheme)

**Location:** `frontend/components/ColdStartChip.tsx`

**Layout (post-Phase-7):**

```
<div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-card paper-grain shadow-card border border-border">
  <Sparkles size={16} className="text-primary" aria-hidden />
  <p className="font-display italic text-sm text-foreground flex-1">{t("body")}</p>
  <Button type="button" variant="ghost" size="icon" className="h-12 w-12"
          onClick={handleDismiss} aria-label={tCommon("close")}>
    <X size={16} />
  </Button>
</div>
```

**Phase 7 changes (verbatim — line-by-line in the existing file):**
1. Outer div className (line 45): `"mx-6 mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-rose-50 border border-border"` → `"mx-6 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-card paper-grain shadow-card border border-border"`.
2. Sparkles icon className (line 48): `text-foreground-muted` → `text-primary`.
3. Body p className (line 51): `"text-sm font-medium leading-5 flex-1"` → `"font-display italic text-sm text-foreground flex-1"`.
4. Dismiss Button className (line 56): `"h-8 w-8"` → `"h-12 w-12"` — **closes DECIDE-05 W4 D-08 floor gap.**
5. (Optional) Wrap entire chip in `<AnimatePresence>{!dismissed && <motion.div key="cold-chip" variants={variants.fadeIn} initial="hidden" animate="visible" exit={{ opacity: 0, transition: transitions.fast }}>` for fade-out continuity. If included: import `variants, transitions` from `@/lib/motion` and `AnimatePresence, motion` from `framer-motion`.

**Preserved invariants:**
- `useSyncExternalStore` dismiss machinery (lines 14-26) — unchanged.
- sessionStorage `STORAGE_KEY = "dismissed_cold_start_chip"` — unchanged.
- `DISMISS_EVENT = "aldente:chip-dismissed"` dispatch — unchanged.
- Body copy `home.cold_start.body` ("Ajoute plus de recettes pour de meilleures suggestions.") — unchanged.
- ARIA label `tCommon("close")` — unchanged.
- `if (dismissed) return null;` early return — unchanged.

### Surface 5 — DECIDE-03 token comment lock

**Location:** `frontend/app/globals.css:72`

**Phase 7 change:** add 1 line of CSS comment immediately above the `--color-valide-tint:` declaration:

```css
  /* CANONICAL — DO NOT introduce `--color-validé-tint` (with French accent). DECIDE-03 invariant lock. */
  --color-valide-tint: var(--valide-tint);
```

That is the entirety of the DECIDE-03 deliverable. No new code, no new variables, no aliases. The comment serves as the cheap invariant lock per CONTEXT.md decision.

---

## Copywriting Contract

**Phase 7 introduces NO new user-facing copy.** Every string in scope already exists in `frontend/lib/i18n/fr.json`:

| Element | Key | Copy |
|---|---|---|
| Page heading on VoteSummary | `home.summary.heading` | Vous avez tout vu |
| VoteSummary intro — validated | `home.summary.intro_validated` | Tu commences ? |
| VoteSummary intro — pressenti (Tu-décides delegation card body) | `home.summary.intro_pressenti` | Ta partenaire n'a pas encore voté. Tu peux déléguer. |
| VoteSummary intro — none (Tu-décides fallback card body) | `home.summary.intro_none` | Aucune recette ne fait l'unanimité ce soir. |
| Cook CTA | `home.summary.cook_cta` | Je commence à cuisiner |
| Delegate CTA (Tu-décides primary) | `home.summary.delegate_cta` | Tu décides |
| Delegate helper | `home.summary.delegate_helper` | Je vote oui pour les 5 |
| Regenerate CTA | `home.summary.regenerate_cta` | Régénérer le shortlist |
| Vote-chip Validé | `vote.state.valide` | Validé |
| Vote-chip Pressenti | `vote.state.pressenti` | Pressenti |
| Vote-chip Contesté | `vote.state.conteste` | Contesté |
| Vote-chip Rejeté | `vote.state.rejete` | Rejeté |
| Vote-chip Sans avis | `vote.state.sans_avis` | Sans avis |
| ColdStartChip body | `home.cold_start.body` | Ajoute plus de recettes pour de meilleures suggestions. |
| Dismiss ARIA (ColdStartChip + others) | `common.close` | Fermer |
| ShortlistCard partner-vote ARIA — yes | `home.shortlist.partner_yes_aria` | {name} : oui |
| ShortlistCard partner-vote ARIA — no | `home.shortlist.partner_no_aria` | {name} : non |
| ShortlistCard partner-vote ARIA — unvoted | `home.shortlist.partner_unvoted_aria` | {name} : pas encore voté |
| ShortlistDeck thumb yes ARIA | `home.shortlist.vote_yes_aria` | J'aime cette recette |
| ShortlistDeck thumb no ARIA | `home.shortlist.vote_no_aria` | Pas envie ce soir |
| Vote-failed toast | `home.shortlist.vote_failed` | Vote impossible. Réessaie. |
| Validé celebration toast (partner echo) | `home.shortlist.toast_validé` | Validé : « {title} » |
| Shortlist arrived toast | `home.shortlist.toast_arrived` | Ton shortlist du jour est prêt. |
| Empty shortlist heading | `home.shortlist.empty_heading` | Pas encore de shortlist |
| Empty shortlist body | `home.shortlist.empty_body` | Ton shortlist du jour n'est pas encore prêt. Reviens plus tard ou ajoute des recettes. |
| Empty shortlist CTA | `home.shortlist.empty_cta` | Ajouter une recette |
| Delegate-failed toast | `home.summary.delegate_failed` | Délégation impossible. Réessaie. |
| Regenerate-failed toast | `home.summary.regenerate_failed` | Impossible de régénérer. Réessaie. |
| Cook-failed toast | `home.summary.cook_failed` | Impossible de démarrer la cuisson. Réessaie. |
| Delegated toast | `home.summary.toast_delegated` | Tu décides ! On regarde ce que ta partenaire en pense. |
| Cooking-started toast | `home.summary.toast_cooking_started` | C'est parti ! Bon appétit. |

### Standard contract slots

| Element | Copy |
|---------|------|
| **Primary CTAs (decide loop)** | Cook: `Je commence à cuisiner` · Delegate: `Tu décides` · Regenerate: `Régénérer le shortlist` |
| **Empty state heading (no shortlist)** | `Pas encore de shortlist` |
| **Empty state body (no shortlist)** | `Ton shortlist du jour n'est pas encore prêt. Reviens plus tard ou ajoute des recettes.` |
| **Cold-start chip body** | `Ajoute plus de recettes pour de meilleures suggestions.` |
| **Tu-décides delegation card body (pressenti)** | `Ta partenaire n'a pas encore voté. Tu peux déléguer.` |
| **Tu-décides delegation card body (no consensus)** | `Aucune recette ne fait l'unanimité ce soir.` |
| **Error state — vote failure** | Toast `home.shortlist.vote_failed` — "Vote impossible. Réessaie." |
| **Error state — delegate failure** | Toast `home.summary.delegate_failed` — "Délégation impossible. Réessaie." |
| **Error state — regenerate failure** | Toast `home.summary.regenerate_failed` — "Impossible de régénérer. Réessaie." |
| **Error state — cook-start failure** | Toast `home.summary.cook_failed` — "Impossible de démarrer la cuisson. Réessaie." |
| **Destructive confirmation** | None in Phase 7. The decide flow has no destructive actions; vote rejection is reversible (the partner's vote may flip the state). |
| **Date header (Phase 7 NEW)** | Format via `Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })`; no i18n key (locale-aware browser API output). Example: `vendredi 8 mai`. |

### Copywriting register discipline

- **Tu (informal singular)** throughout — couple-app convention preserved from v0.1.
- **Action verbs first** ("Régénérer", "Ajoute") — clear intent over ambiguous nouns.
- **Editorial moments** in Fraunces italic on the delegation card and ColdStartChip — cookbook margin-note register.
- **No exclamation points** in the daily decide flow except the celebration toast (`toast_delegated`, `toast_cooking_started`) and the partner-echo toast (`toast_validé`) — those are intentional emotional beats.
- **French diacritics rendered correctly** in all strings — Fraunces and IBM Plex Sans both ship full Latin Extended Plus per Phase 5 §Typography. The state names "Validé", "Pressenti", "Contesté", "Rejeté" all carry diacritics and must render crisply (verified via Phase 5 styleguide on iPhone Safari PWA).
- **No new strings.** If a copy gap is identified during execution, raise it as a deviation — do not add silently.

---

## Acceptance Criteria — DECIDE-01 through DECIDE-05

| Req | Closed by |
|---|---|
| **DECIDE-01** Daily shortlist screen re-themed with new tokens | §Surface 1 — display-serif date header (Fraunces italic), section spacing inherited from Phase 5; existing PushPermissionBanner / CookingBanner / ColdStartChip / EmptyState all consume Phase 5 tokens. ShortlistCard frame paper-grain (Surface 2). VoteSummary heading upgrade to `text-title` + Tu-décides delegation card paper-grain (Surface 3). |
| **DECIDE-02** Swipe deck refined with the new motion language (one curve, paper-physics feel) | §Motion + §Component Inventory — `springSnap` transition (`{ type: "spring", stiffness: 240, damping: 28, mass: 1.1 }`) added to `frontend/lib/motion.ts` and consumed by ShortlistCard front `<motion.div>`. **No structural rewrite of ShortlistDeck.tsx.** `prefers-reduced-motion` respected via existing globals.css clamp + existing `usePrefersReducedMotion` hook in ShortlistCard. |
| **DECIDE-03** Vote chip presentation refined for the 5 computed states; `--color-valide-tint` token name reconciled | §Color "Vote-chip color mapping" — locked 5-state pill chips with class strings per state, replaces the existing color-only label in VoteSummary. CSS comment lock at `globals.css:72` declares canonical name. |
| **DECIDE-04** "Tu décides" delegation surface refined with new tokens | §Surface 3 + §Component Inventory — `pressentiRow` and fallback branches in VoteSummary wrap the existing Button in a paper-grain Card with the D-Voice pattern (3px terracotta-60 left border, Fraunces italic body copy at `text-base`, terracotta CTA at `h-12 w-full`). Existing `intro_pressenti` / `intro_none` / `delegate_cta` keys reused. |
| **DECIDE-05** Cold-start / empty-shortlist states polished; ColdStartChip dismiss button raised to h-12 | §Surface 4 — full ColdStartChip retheme (`bg-card paper-grain shadow-card`, Sparkles `text-primary`, body `font-display italic text-sm`, dismiss `h-12 w-12`). Empty-state branch (no shortlist) consumes inherited Phase 6 EmptyState component (paper-grain Card + `text-title` heading + h-12 CTA) — no Phase 7 EmptyState change required. |

### Verification queries (executor smoke checks)

After implementation, these grep queries must pass:

```bash
# 1. ColdStartChip dismiss button at h-12 (W4 closure)
grep -n "h-12 w-12" frontend/components/ColdStartChip.tsx 2>&1
# expected: at least 1 hit on the dismiss button

# 2. ColdStartChip uses bg-card paper-grain (not the legacy bg-surface-rose-50)
grep -n "bg-surface-rose-50" frontend/components/ColdStartChip.tsx 2>&1
# expected: 0 hits
grep -n "paper-grain" frontend/components/ColdStartChip.tsx 2>&1
# expected: at least 1 hit

# 3. ColdStartChip Sparkles icon uses text-primary
grep -n "text-primary" frontend/components/ColdStartChip.tsx 2>&1
# expected: at least 1 hit

# 4. ShortlistCard front + peek both have paper-grain
grep -n "paper-grain" frontend/components/ShortlistCard.tsx 2>&1
# expected: at least 2 hits (one per card variant)

# 5. ShortlistCard photo region has rounded-t treatment
grep -n "rounded-t-2xl\|rounded-t-xl" frontend/components/ShortlistCard.tsx 2>&1
# expected: at least 1 hit

# 6. ShortlistCard imports transitions from motion module
grep -n "transitions.springSnap\|from \"@/lib/motion\"" frontend/components/ShortlistCard.tsx 2>&1
# expected: at least 1 hit on each

# 7. springSnap added to motion.ts
grep -n "springSnap" frontend/lib/motion.ts 2>&1
# expected: at least 1 hit; spring stiffness/damping/mass values present

# 8. VoteSummary regenerate button at h-12 (D-08 closure)
grep -n "h-11\|h-12" frontend/components/VoteSummary.tsx 2>&1
# expected: zero h-11 hits; multiple h-12 + h-14 hits

# 9. VoteSummary heading uses text-title (Phase 5 type-scale convergence)
grep -n "text-title" frontend/components/VoteSummary.tsx 2>&1
# expected: at least 2 hits (heading + validated-recipe-title-display)

# 10. VoteSummary delegation card uses font-display italic + border-primary/60
grep -n "border-l-\[3px\]\|border-primary/60\|font-display italic" frontend/components/VoteSummary.tsx 2>&1
# expected: at least 1 hit on each pattern

# 11. DECIDE-03 comment lock at globals.css:72 area
grep -n "DECIDE-03 invariant lock\|DO NOT introduce" frontend/app/globals.css 2>&1
# expected: at least 1 hit on the comment

# 12. Vote-chip 5-state class strings present
grep -n "bg-\[var(--color-valide-tint)\]\|bg-primary/15\|bg-destructive/10\|line-through\|border-border bg-transparent" frontend/components/VoteSummary.tsx 2>&1
# expected: matches confirming all 5 pill state classes wired

# 13. No ShortlistDeck structural rewrite (line count check)
wc -l frontend/components/ShortlistDeck.tsx 2>&1
# expected: ~141 LOC (matches CONTEXT.md baseline; ±5 LOC tolerance)

# 14. No new i18n keys
git diff frontend/lib/i18n/fr.json 2>&1
# expected: zero changes

# 15. HomeDecide has the date header
grep -n "text-display\|Intl.DateTimeFormat" frontend/components/HomeDecide.tsx 2>&1
# expected: at least 1 hit on each
```

### Real-device smoke test (post-implementation)

On iPhone Safari PWA standalone:
1. **Daily shortlist** (`/`): confirm display-serif date header reads "vendredi 8 mai" (or current date) in Fraunces italic above the deck.
2. **Swipe a card right** → confirm spring snap-back when partial-swipe + release; full-swipe past threshold commits the vote and the next card rises.
3. **Reduced motion** (iOS Settings → Accessibility → Reduce Motion ON) → confirm drag is disabled, rotation/overlays absent, deck advances on thumb-button taps only, springSnap clamps to instant.
4. **All 5 swipes done** → confirm VoteSummary heading reads "Vous avez tout vu" in Fraunces 24px (text-title), 5-state pill chips render in correct colors per state, regenerate button is `h-12` not `h-11`.
5. **Trigger "Tu décides"** (one Pressenti, no Validé): confirm the Tu-décides paper-grain Card with terracotta-60 left border and Fraunces italic copy renders above the regenerate ghost.
6. **Cold-start chip** (corpus < 10 recipes): confirm chip body is paper-grain card with Fraunces italic copy and terracotta Sparkles. Tap the X dismiss button — confirm the 48px hit area is hittable around the visible chrome (the button is `h-12 w-12` with the icon centered).
7. **Realtime partner echo**: with two iPhones, vote yes on phone A → confirm phone B's deck reconciles via the existing realtime listener. Confirm no animation regression on the partner-echo path.
8. **Validé celebration**: when phone A's last vote produces Validé, confirm phone B sees the partner-echo toast with the recipe title rendered through the existing `home.shortlist.toast_validé` key.
9. **Reduced-motion regression check** on the ColdStartChip dismiss: with reduce-motion ON, dismissing the chip should disappear instantly (the optional fadeIn AnimatePresence collapses to instant per the CSS clamp).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | (none — Phase 7 adds zero new primitives; consumes Phase 5 re-themes only) | not required |
| third-party | (none declared) | not applicable |

`frontend/components.json` `registries: {}` confirmed unchanged. No third-party blocks introduced. No vetting required.

---

## Out of Scope (re-stated for executor discipline)

- **Capture surfaces** — Phase 6, complete (CAPTURE-08..13 closed).
- **Recipe detail / library / cooking-log surfaces** — Phase 8 (COOK-06..12).
- **Onboarding / settings / BottomNav / PWA identity** — Phase 9 (ONBOARD-07..11).
- **Vote-state computation logic** — locked v0.1; `compute_vote_state` is not touched.
- **Member avatars / per-member illustrations** — productize-later (V2-UX-02 backlog).
- **Manual vote-state override UI** — out of scope; states are computed, not user-set.
- **Real-time co-swipe voting** — async by design; not on roadmap.
- **CookingBanner Finaliser → `<Button asChild>`** — Phase 8 (COOK-07).
- **CI grep gate to forbid `validé-tint`** — tooling debt out of scope; CSS comment is the lock.
- **Per-state animations on chip transitions** (e.g., "Pressenti" → "Validé" celebration animation on the row) — Phase 7 keeps Phase 5/6 motion budget; decoration deferred.
- **Inline VoteChip strip on ShortlistCard meta row** — Phase 7 does NOT add this; vote chips remain in VoteSummary only. Future iteration only.
- **Structural rewrite of ShortlistDeck.tsx** — explicitly forbidden by CONTEXT.md; Phase 7 changes only the transition prop on the active card via ShortlistCard.tsx.
- **AlertDialog replacement for any browser-native confirm** — N/A; decide flow has no destructive confirmations.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (every string sourced from existing `fr.json`; zero new keys; 5-state vote-chip labels via `vote.state.*`; standard contract slots filled)
- [ ] Dimension 2 Visuals: PASS (paper-grain on ShortlistCard frame + ColdStartChip + delegation Card; rounded-t photo on ShortlistCard; springSnap paper-physics; anti-pattern list explicit; no purple gradients; no cool grays)
- [ ] Dimension 3 Color: PASS (60/30/10 inherited; accent reserved-for list locked to 6 entries; 5-state vote-chip color mapping LOCKED with class strings per state; destructive reserved-for narrowed; DECIDE-03 comment lock at globals.css:72)
- [ ] Dimension 4 Typography: PASS (4–5 sizes inherited; weights inherited; per-element role assignment provided; Tu-décides delegation card uses `font-display italic text-base`; ColdStartChip body uses `font-display italic text-sm`; VoteSummary heading upgraded to `text-title` per Phase 5 type-scale convergence)
- [ ] Dimension 5 Spacing: PASS (4-multiple inherited; tap-target floor 48px enforced on ColdStartChip dismiss + VoteSummary regenerate; vote-chip h-8 documented as read-only state-indicator exception per CONTEXT.md; ShortlistDeck thumb buttons h-14 preserved)
- [ ] Dimension 6 Registry Safety: PASS (no new registries, no new shadcn primitives, no third-party blocks)

**Approval:** pending
