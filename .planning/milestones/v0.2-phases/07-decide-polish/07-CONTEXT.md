# Phase 7: Decide polish - Context

**Gathered:** 2026-05-08
**Status:** Ready for UI-SPEC + planning
**Mode:** Smart discuss (autonomous) — 2 grey areas, all defaults accepted

<domain>
## Phase Boundary

Re-theme the daily decision flow into the Slow Food artisanal design system established in Phase 5 + extended in Phase 6. Surfaces in scope:

- **Shortlist screen** — daily home (`HomeDecide.tsx`) with date header + member badges
- **Swipe deck** (`ShortlistDeck.tsx`) — Framer Motion swipe interactions, card snap-back physics, prefers-reduced-motion respect
- **ShortlistCard** — recipe display inside the deck (photo + meta + vote chips)
- **Vote chips** — 5 *computed* states (Validé / Pressenti / Contesté / Rejeté / Sans avis) presented in `VoteSummary.tsx`
- **"Tu décides" delegation surface** — promote partner-decision affordance
- **ColdStartChip** — corpus < 10 recipes empty state (closes DECIDE-05 W4 tap-target gap)
- **DECIDE-03 token housekeeping** — verify `--color-valide-tint` (no accent) is the only canonical name and lock it via comment

This phase consumes Phase 5 outputs + Phase 6 patterns (paper-grain Card + Fraunces italic callout). It does NOT change vote computation, scoring algorithm, shortlist generation, realtime spine, or veto logic — only their visual rendering.

**Out of scope:**
- Capture surfaces (Phase 6, complete)
- Recipe detail / library / cooking-log surfaces (Phase 8)
- Onboarding / settings / BottomNav / PWA identity (Phase 9)
- Vote-state computation logic (locked in v0.1)
- Adding member avatars (cut from v0.1; productize-later)
- Adding manual vote-state override UI (out of scope)

</domain>

<decisions>
## Implementation Decisions

### Vote Chips (5 computed states)

- **Color mapping**:
  - `Validé` → emerald-tint (`--color-valide-tint`) — reserved for "decided winner"
  - `Pressenti` → terracotta/40 wash — "leaning yes" uses the milestone accent
  - `Contesté` → muted destructive (`--destructive`/60) — active dispute, but quieted
  - `Rejeté` → muted-foreground neutral — "off the table"
  - `Sans avis` → border-only ghost (`border border-border bg-transparent`) — pending/unknown
- **Typography & shape**: Pill (`rounded-full`), `text-sm font-medium`, IBM Plex Sans, `h-8` (read-only state indicators on a card — these are NOT tap targets, they are state badges; D-08 floor doesn't apply)
- **NO change to state computation logic** — `compute_vote_state` is locked from v0.1 and not part of Phase 7 scope

### Swipe Deck Physics (paper-physics translation)

- **Framer Motion transition**: `{ type: "spring", stiffness: 240, damping: 28, mass: 1.1 }` for card snap-back / settle. Slightly higher mass than the default reads as "card on a counter" rather than "rubber band".
- **No decorative bounce** — overshoot factor minimal (the spring naturally damps without an explicit bounce parameter)
- **`prefers-reduced-motion`**: existing global rule in `globals.css` clamps all animations to 0ms — Phase 7 makes NO per-component override. Verified inheritance only.
- **No structural rewrite of `ShortlistDeck.tsx`** — only the transition prop on the active card changes. Swipe gesture, card-stack indexing, vote-on-swipe wiring all preserved byte-for-byte.

### "Tu décides" Delegation Surface

- **Visual**: Promote the trigger from a stock Button to a paper-grain Card with a 3px terracotta-60 left border (mirroring the Phase 6 D-Voice callout pattern), Fraunces italic copy at `text-base` ("Confie le choix à ton/ta partenaire."), terracotta CTA at `h-12`.
- **i18n**: REUSE existing `home.delegate.*` keys — no new strings.
- **Behavioral lock**: tapping the Card retains the existing handler that posts the delegation vote. Phase 7 only changes the wrapper, not the action.

### Daily Shortlist Screen (HomeDecide)

- **Header**: Fraunces display title above the deck (`text-display`, italic for the date so "vendredi 8 mai" reads as editorial). Paper-grain Card surface for the date row only. Member badges (Member1/Member2 colored dots from `MemberDot.tsx`) preserved unchanged.
- **Section spacing**: `gap-6` (24px) between header / deck / vote summary — inherits Phase 5 spacing scale.
- **Background**: stays on `bg-background` (cream); paper-grain on Cards only, never on the page background (Phase 5 invariant).

### ShortlistCard (recipe display in deck)

- **Frame**: paper-grain Card (Phase 5 utility), warm shadow (`shadow-card`), `rounded-xl`.
- **Photo treatment**: `aspect-[4/3] object-cover rounded-t-xl` (top corners only, so the bottom of the photo meets the card surface flush — reads as "photo printed onto the recipe card").
- **Meta layout below photo**: title in `text-title` (Fraunces 24px), cuisine + time + protein chips below in IBM Plex Sans `text-sm`.
- **Vote chip strip**: at the bottom of the card, horizontal flex row with Phase 7 5-state chips per member.
- **No structural rewrite** — same props, same data flow.

### ColdStartChip (DECIDE-05 W4 closure)

- **Surface**: replace `bg-surface-rose-50` (legacy alias from v0.1) with `bg-card paper-grain shadow-card` — same Phase 5 system as the rest of v0.2.
- **Copy**: Fraunces italic `text-sm` body to match the D-Voice callout register from Phase 6.
- **Dismiss button tap target**: bump from `h-8 w-8` (32px) to `h-12 w-12` (48px). Closes DECIDE-05 W4 D-08 floor gap inline.
- **Sparkles icon**: keep, restyle to `text-primary` (terracotta) so the chip reads as "first-run guidance, not error".
- **Keep existing**: `useSyncExternalStore` dismiss machinery, sessionStorage gate, dispatch event.

### DECIDE-03 Token Reconciliation Closure

- **Status before Phase 7**: grep on SPEC.md, frontend source, frontend CSS for `validé-tint` (with French accent) — confirmed **zero hits**. Phase 5 housekeeping already harmonized to `--color-valide-tint` everywhere.
- **Phase 7 deliverable**: a one-line CSS comment at the `--color-valide-tint` definition in `globals.css` declaring the canonical name and forbidding the accented form. Prevents accidental re-introduction.
- **No grep regression check is added as a CI gate** — that's tooling debt out of scope; the comment is the cheapest invariant lock.

### Claude's Discretion
- Exact damping curve numbers for the spring transition — start at `240/28/1.1` and tune by 5–10% if iPhone swipe feels too tight or too floaty. Document final values in SUMMARY.md.
- Exact terracotta-tint values for the "Pressenti" wash and the delegation card left border (within Phase 5 token range).
- Whether to factor the delegation Card into a shared `DelegationCallout.tsx` component or inline it in `HomeDecide.tsx` — judgment call based on reuse potential.
- Whether to extract a shared `VoteChip` component from `VoteSummary.tsx` or keep the chip render inline in the same file — trade-off between locality and reuse.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets (post-Phase-5/6)
- `frontend/lib/motion.ts` — `fadeIn`, `slideUp`, `pressFeedback`, `swipe` Framer Motion presets backed by CSS tokens. Phase 7 may add a `springSnap` preset (mass 1.1) for the deck card.
- `frontend/components/ui/card.tsx` — paper-grain'd Card primitive (Phase 5).
- `frontend/components/MemberDot.tsx` — color attribution dot (existing).
- `frontend/components/ShortlistDeck.tsx` (141 LOC) — swipe deck.
- `frontend/components/ShortlistCard.tsx` (260 LOC) — recipe display in deck.
- `frontend/components/VoteSummary.tsx` (205 LOC) — vote chip strip.
- `frontend/components/HomeDecide.tsx` (440 LOC) — shortlist home page.
- `frontend/components/ColdStartChip.tsx` (64 LOC) — empty-state chip.
- Phase 6 patterns to mirror: D-Voice callout (paper-grain Card + Fraunces italic + terracotta-60 left border) — apply to the delegation surface and the ColdStartChip.

### Established Patterns
- 5-state vote computation lives in backend (`compute_vote_state`); frontend renders the enum value through `VoteSummary.tsx`.
- Swipe deck uses Framer Motion `motion.div` with `drag="x"` + `dragConstraints` + `onDragEnd` to detect swipe direction.
- `useSyncExternalStore` for cross-tab session-storage gates (ColdStartChip pattern).
- `prefers-reduced-motion` global clamp in `globals.css` (Phase 5).

### Integration Points
- `frontend/components/HomeDecide.tsx` — shortlist home (440 LOC; header retheme + delegation Card + section spacing)
- `frontend/components/ShortlistDeck.tsx` — swipe deck (141 LOC; spring transition prop only, no structural change)
- `frontend/components/ShortlistCard.tsx` — card visual (260 LOC; paper-grain frame + rounded-t photo + chip strip)
- `frontend/components/VoteSummary.tsx` — vote chips (205 LOC; 5-state color/typography mapping; possibly extract `VoteChip` subcomponent)
- `frontend/components/ColdStartChip.tsx` — empty state (64 LOC; full retheme + h-12 dismiss)
- `frontend/app/globals.css` — add canonical-name comment at `--color-valide-tint`
- `frontend/lib/motion.ts` — possibly add `springSnap` preset

### Constraints from Prior Phases / Project
- Phase 5 token names locked. Phase 6 patterns established (paper-grain Card + Fraunces italic + terracotta-60 left border).
- French only via `next-intl`. No new keys.
- iOS Safari 17+ PWA standalone is the rendering target.
- Solo dev, ~1 weekend budget per polish phase.
- D-08 raised tap target from 44 → 48px in W4. ColdStartChip dismiss must clear 48px.
- v0.1 token names must NOT break (DESIGN-03 inheritance).

</code_context>

<specifics>
## Specific Ideas

- **Vote chip per-state class shape** (suggested):
  - Validé: `bg-[var(--color-valide-tint)] text-foreground`
  - Pressenti: `bg-primary/15 text-primary border border-primary/40`
  - Contesté: `bg-destructive/10 text-destructive/80 border border-destructive/30`
  - Rejeté: `bg-muted text-muted-foreground line-through`
  - Sans avis: `bg-transparent text-muted-foreground border border-border`
- **Spring snap example** (Framer Motion on the active deck card):
  ```tsx
  transition={{ type: "spring", stiffness: 240, damping: 28, mass: 1.1 }}
  ```
- **Delegation card** mirrors Phase 6 D-Voice pattern:
  ```tsx
  <Card className="paper-grain shadow-card border-l-[3px] border-primary/60 p-4">
    <p className="font-display italic text-base">{t("delegate_copy")}</p>
    <Button className="h-12 w-full mt-3">{t("delegate_cta")}</Button>
  </Card>
  ```

</specifics>

<deferred>
## Deferred Ideas

- Member avatars / per-member illustrations — productize-later (out of v0.1 scope, confirmed in PROJECT.md cuts list)
- Manual vote-state override UI — vote states are computed; explicit override is not in v0.2
- Real-time co-swipe voting — async by design; not on roadmap
- Replacing `MemberDot` color attribution with avatars — V2-UX-02 backlog
- Per-state animations on chip transitions (e.g., "Pressenti" → "Validé" celebration) — Phase 7 keeps Phase 5/6 motion budget; decoration deferred
- Adding a CI grep gate to forbid `validé-tint` (accented) — tooling debt out of scope; CSS comment is the cheap invariant lock

</deferred>
