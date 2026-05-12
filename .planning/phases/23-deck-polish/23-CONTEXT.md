# Phase 23: Deck polish — Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Four cosmetic/UX polish drops on the existing swipe deck, all sharing `ShortlistCard.tsx` / `ShortlistDeck.tsx` / `swipe-tokens.ts`:

1. **DECK-01** — Replace OUI/NON text overlays with a subtle drag-distance-driven border-ring glow on the front card.
2. **DECK-02** — Raise commit thresholds + retune snap-back spring + lengthen fly-off so casual drift snaps back and deliberate motion commits cleanly.
3. **DECK-03** — Swap the thumb-button icons from `<Heart>` outline (yes) / `<X>` (no) to a filled-Heart (yes) / outline-Heart (no) language; remove the red entirely from "no."
4. **DECK-04** — Tap on the front card opens `/recipes/[id]` detail; iOS back returns to the same deck position; thumb-button taps still vote without navigating.

All four ship as **one atomic plan + one commit** to keep the user-visible "feels deliberate and immersive" beat coherent. Reduced-motion path stays correct end-to-end.

Out of scope (deferred): card snap-zones / drag-anchor indicators; a "love" tier above yes; per-direction haptic feedback; visual snapshot tests; Playwright spec coverage of the deck.

</domain>

<decisions>
## Implementation Decisions

### DECK-01 — Drag-tint redesign (ring, not bg)

- **D-01:** **Deviation from REQUIREMENTS.md DECK-01 wording.** The REQ specifies "full-card background tint" using `--color-valide-tint` and `bg-destructive/15`; we are instead implementing a **border-ring glow** (`ring-2`) with no background-color shift. Rationale: ring reads subtler/more deliberate; a tinted card surface feels heavy at couple-scale. The plan MUST rewrite DECK-01's success criterion to match — replace "a full-card color tint" with "a subtle drag-distance-driven border-ring fade-in (emerald-tinted ring for yes, destructive-tinted ring for no)" before execution.
- **D-02:** Yes-side ring color = `--color-valide-foreground` (#10B981 emerald). No-side ring color = `--destructive`. Token reuse: same emerald that powers the filled Heart (DECK-03) and the Validé state across the app (consistent color story); destructive matches the existing thumb-button border palette. **`--color-valide-tint` is NOT used in this phase** — note this so future code-review doesn't flag it as drift.
- **D-03:** Stroke = `ring-2` (Tailwind 2px), no `ring-offset`. Crisp; matches the rounded-2xl card corners cleanly. No "halo gap."
- **D-04:** Delete the `motion.div` block at `ShortlistCard.tsx:280-296` containing the OUI/NON labels in full. Replace with **two stacked `motion.div`s** (or a single conditional one) attached to the outer card whose `style.boxShadow` or `className`-driven `ring` opacity is driven by the existing `yesOpacity` / `noOpacity` `useTransform` hooks (L99-108). Planner picks between (a) two absolute-positioned divs that render `ring-2 ring-[var(--color-valide-foreground)]` with `opacity` motion-bound, or (b) animating `boxShadow` directly via `useMotionTemplate`. Pattern (a) is cleaner for this codebase.
- **D-05:** `SWIPE_OVERLAY_INPUT_PX` lowered **100 → 80** in `swipe-tokens.ts:18`. Rationale: ring hits full opacity at ~80px, well before the 140px commit threshold (D-08). Forgiving / feedback-rich: a 50px casual drift produces ~62% ring opacity, which is the intended "you're trying something" affordance without yet committing. Update the JSDoc comment to reflect the new semantic ("Drag input range mapped to full opacity for yes/no ring feedback").
- **D-06:** Opacity ramp curve = **linear** (the existing `useTransform(x, [0, SWIPE_OVERLAY_INPUT_PX], [0, 1])` shape). Don't introduce an easing function on this transform — the spring physics on the card itself provides the "feel," the ring is just a feedback indicator.
- **D-07:** Reduced-motion path: ring is gated by the same `isFront && !reducedMotion` guard that gates the current OUI/NON block (L280). Under reduced motion: no ring, no drag at all (`dragEnabled = isFront && !reducedMotion` already at L118). Functional voting via thumb-button taps is unaffected.

### DECK-02 — Threshold + spring tuning

- **D-08:** Token updates in `frontend/lib/swipe-tokens.ts`:
  - `SWIPE_THRESHOLD_PX`: 100 → **140**
  - `SWIPE_VELOCITY_PX_S`: 500 → **750**
  - `SWIPE_OVERLAY_INPUT_PX`: 100 → **80** (see D-05; semantic now "ring opacity ramp," not "OUI/NON overlay opacity")
  - `SWIPE_FLYOFF_DURATION_S`: 0.2 → **0.28**
- **D-09:** Snap-back spring is **already** `transitions.springSnap` (240 / 28 / 1.1) from `frontend/lib/motion.ts:24` — that's the Phase 7 paper-physics curve and it's already wired in `ShortlistCard.tsx:223`. **No `swipe-tokens.ts` SWIPE_SPRING change needed** — the legacy `SWIPE_SPRING` constant (400/40 with no mass) at `swipe-tokens.ts:20-25` is no longer imported. Delete it as part of this plan's cleanup (grep confirms no other importers).
- **D-10:** No change to `SWIPE_ROTATE_RANGE_DEG` (15°) or `SWIPE_FLY_OFFSCREEN_FACTOR` (1.4). Both already feel right.
- **D-11:** Update the file's top-of-file JSDoc comment at `swipe-tokens.ts:1-2` — currently references "Phase 3 swipe-deck motion thresholds (locked by 03-UI-SPEC.md §Design System)." Add a one-liner crediting Phase 23 for the retune so future readers don't try to revert to 03 numbers thinking they're canonical.

### DECK-03 — Heart icon language

- **D-12:** Yes button: `<Heart size={24} fill="currentColor" className="text-[var(--color-valide-foreground)]" />`. Stroke and fill share the emerald color → a fully filled emerald heart. The surrounding circle keeps its existing `border-[var(--color-valide-border)]` (`ShortlistCard.tsx:375`) and `hover:bg-[color-mix(...)]` styling — no chrome change on the yes side beyond the icon fill.
- **D-13:** No button: replace `<X size={24} className="text-destructive" />` with `<Heart size={24} className="text-foreground-muted" />` (no `fill` prop → outline by default in lucide-react). The surrounding circle changes from `border-destructive/50` to `border-border` (or `border-foreground-muted/40` — planner picks based on contrast at h-14 size). Hover state changes from `hover:bg-destructive/10` to `hover:bg-foreground-muted/10` (or similar neutral). **No destructive-red anywhere on the no button.** Reads as "unloved" not "rejected" — softer, matches the milestone-decision wording.
- **D-14:** Remove `X` from the lucide-react import at `ShortlistCard.tsx:19`. After this phase only `Heart` and `UtensilsCrossed` remain imported from lucide-react in this file. Grep gate: `grep -n "from \"lucide-react\"" frontend/components/ShortlistCard.tsx` must show no `X,` token.
- **D-15:** Button structure unchanged otherwise: same shadcn `Button` (variant="outline", size="icon"), same h-14 w-14 rounded-full, same `active:scale-95 transition-transform`, same `disabled={submittingFor !== null}` plumbing from `ShortlistDeck.tsx:185`. Same `t("vote_yes_aria")` / `t("vote_no_aria")` translation keys (existing labels `J'aime cette recette` / `Pas envie ce soir` per milestone decision).
- **D-16:** **Architecture invariant #2 holds** (voting state is computed from `votes` table rows, not stored). DECK-03 only changes icon glyphs/colors on the thumb buttons. The `onVote(value)` call and the entire `ShortlistDeck.handleVote` plumbing are byte-identical.

### DECK-04 — Tap-to-detail

- **D-17:** Tap target = **entire front card** (outer `motion.div` at `ShortlistCard.tsx:206`). Single `onTap` handler on the outer container. Partner-vote dot footer (absolute-positioned at L324-338) is a status display, not a button — taps on it inherit the navigation. No `stopPropagation` needed anywhere.
- **D-18:** Pan-vs-tap disambiguation (REQ-mandated pattern, kept verbatim):
  - Add a `panRef = useRef(false)` in `ShortlistCard`.
  - `onPanStart`: `panRef.current = true`.
  - `onPanEnd`: schedule `panRef.current = false` on the next tick (e.g. `setTimeout(0)` or `requestAnimationFrame`) so the synthetic tap event that fires after a drag-release still sees `panRef.current === true` and bails. Without the deferral, framer-motion sometimes fires `onTap` immediately after `onPanEnd` on iOS Safari.
  - `onTap`: `if (!panRef.current && isFront) router.push(`/recipes/${recipe.id}`)`. Use `useRouter` from `next/navigation` (App Router).
- **D-19:** Thumb-button taps from `ShortlistThumbButtons` are completely separate components rendered OUTSIDE the card's outer `motion.div` (sibling level in `ShortlistDeck.tsx:183-186`). Their clicks NEVER reach the card's `onTap`. No code change needed to keep "thumb-button taps still vote without navigating" working — it's structurally guaranteed.
- **D-20:** Back-button behavior = **filter-stays-on-top (zero new code)**. `ShortlistDeck` reads `current = remaining[0]` where `remaining` is the parent `HomeDecide`'s unvoted-filter slice of recipes. If the user tapped a card and pressed back without voting, the same recipe is still unvoted → still on top of the filter → still `remaining[0]`. REQ-04 success criterion satisfied trivially. No `?card=` URL param, no recipeId restoration plumbing. If the user voted via realtime-broadcast partner activity during the detail visit, the deck may have advanced — that's the correct behavior (the partner's vote changed the shortlist state) and not a regression to defend against.
- **D-21:** **No visual feedback on tap before navigation** — `router.push` fires immediately. iOS Safari's native page-transition animation IS the feedback. No `active:scale`, no `whileTap` brightness pulse, no loading state. Native feel; least new code.
- **D-22:** **Peek cards are non-interactive.** They're already `pointer-events-none` (L233-234) so they don't receive taps. `isFront && !panRef.current` guard in `onTap` is therefore belt-and-suspenders — but keep both checks defensively, since `pointer-events-none` only blocks the peek cards, not the front-when-mid-drag case.

### Plan slicing & verification

- **D-23:** **Single plan, single atomic commit.** All 4 reqs (DECK-01..04) ship together as `23-01-deck-polish-PLAN.md`. Rationale: (a) all four reqs touch the same two files (`ShortlistCard.tsx`, `swipe-tokens.ts`) — atomic revert is cleaner than 3-4 ordered commits; (b) the user-visible beat is "the deck feels different now" — splitting commits would deploy an in-between visual state to prod which has no UX value; (c) the phase is small enough that single-plan complexity stays manageable. Deviates from the Phase 22 "1 req → 1 plan" pattern intentionally — that pattern is for INDEPENDENT reqs; DECK reqs are tightly coupled cosmetic changes.
- **D-24:** **No worktree parallelism.** Single plan = single executor pass.
- **D-25:** Plan-internal ordering (within the one plan):
  1. `swipe-tokens.ts` constants + delete legacy `SWIPE_SPRING` (D-08, D-09)
  2. `ShortlistCard.tsx` ring overlays replacing OUI/NON block (D-01..D-07)
  3. `ShortlistCard.tsx` Heart icon swap + remove `X` import + neutralize no-side chrome (D-12..D-16)
  4. `ShortlistCard.tsx` add `panRef` + `onTap` router push (D-17..D-22)
  5. Update `swipe-tokens.ts` top-of-file JSDoc (D-11)
  6. Update REQUIREMENTS.md DECK-01 success criterion wording (D-01)
  Step ordering matters for code review readability, not for correctness.
- **D-26:** Verification: **grep gates + manual UI smoke + real-device reduced-motion pass**. No new Playwright specs (preserves Phase 22 "polish phases don't expand the test surface" discipline). Grep gates:
  - `grep -n "OUI\|NON" frontend/components/ShortlistCard.tsx` → zero matches
  - `grep -n "^import.*X[, ]\|^import.*[, ]X[, ]\| X " frontend/components/ShortlistCard.tsx | grep "lucide-react"` → zero (the `X` icon import removed)
  - `grep -n "SWIPE_THRESHOLD_PX = 140\|SWIPE_VELOCITY_PX_S = 750\|SWIPE_OVERLAY_INPUT_PX = 80\|SWIPE_FLYOFF_DURATION_S = 0.28" frontend/lib/swipe-tokens.ts` → 4 matches
  - `grep -n "SWIPE_SPRING" frontend/` → zero (the legacy constant deleted, no importers)
- **D-27:** Manual UI smoke checklist (operator runs on seeded fixture):
  - Drag front card right ~80px → emerald ring visible at full opacity; release → snap back smoothly (no commit).
  - Drag front card right ~50px → emerald ring visible at ~62% opacity; release → snap back.
  - Drag front card right ~140px → emerald ring full opacity; release → fly-off right, vote yes posted, deck advances.
  - Drag front card left ~140px → destructive ring full opacity; release → fly-off left, vote no posted, deck advances.
  - Tap front card body → `/recipes/[id]` opens; iOS back gesture → same front card visible.
  - Tap filled-Heart thumb button → vote yes posted, fly-off right, no navigation.
  - Tap outline-Heart thumb button → vote no posted, fly-off left, no navigation.
- **D-28:** **Real-device `prefers-reduced-motion` pass at phase close** (operator toggles iOS Settings → Accessibility → Motion → Reduce Motion):
  - Front card drag is disabled (no movement).
  - Both thumb buttons still vote correctly.
  - No ring animation (gated by `!reducedMotion`).
  - Tap-to-detail still works (it's a functional path, not a motion path).
  - Fly-off animation does not play (`motionExit === undefined` under reduced motion already, per existing L188).
- **D-29:** No `gsd-verifier` run — `workflow.verifier: false` (set in Phase 22). The D-26/D-27/D-28 checklists serve as the goal-achievement gate. Same discipline as v0.5 Phase 22.

### Claude's Discretion

- Exact ring implementation pattern: two stacked `motion.div`s (one for yes-ring, one for no-ring, each absolutely-positioned with `ring-2` and `opacity` motion-bound) **vs** one `motion.div` whose `boxShadow` is interpolated via `useMotionTemplate`. The first is more idiomatic for this codebase; planner picks based on which renders cleanest at the rounded-2xl corner radius.
- Exact `border-foreground-muted/40` vs `border-border` opacity on the no-side Heart button — depends on visual contrast at h-14 size against the warm-cream surface. Try `border-border` first; bump if it disappears.
- Exact deferral mechanism for `panRef.current = false` reset — `setTimeout(0)` vs `requestAnimationFrame` vs `microtask`. Empirically check which one prevents the iOS Safari "tap-after-drag" double-fire. Plan should note this is iOS-Safari-specific and require an iPhone smoke test.
- Whether to inline the JSDoc updates in `swipe-tokens.ts` or split them — minor stylistic call.

### Folded Todos

None — no separate `todo match-phase` run for this phase. v0.5 milestone explicitly maps DECK-01..04 from the `audit:walkthrough` GitHub issues #14/#16/#17/#18; no orphan todos surfaced during prior phases.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture invariants (CLAUDE.md)
- `CLAUDE.md` §"Architecture invariants" #2 — Voting state is computed, not stored. DECK-03 changes icon glyphs only; the `onVote(value)` and 5-state derivation in `services/voting.compute_vote_state` are untouched. Invariant holds.
- `CLAUDE.md` §"Architecture invariants" #6 — French-only via `next-intl`. DECK-04 navigation pushes to `/recipes/[id]`; the detail page already routes all strings through `useTranslations` (Phase 8). No new strings added in this phase.
- `CLAUDE.md` §"Conventions > Frontend" — Path alias `@/*` → `frontend/`. Use `@/lib/swipe-tokens`, `@/lib/motion`, `@/components/ui/button` consistently.

### v0.5 milestone artifacts
- `.planning/PROJECT.md` §"Current Milestone: v0.5" — milestone-locked decision row "#17 icon direction = Filled Heart / outline Heart; emerald for filled, neutral for outline."
- `.planning/REQUIREMENTS.md` §"DECK — Swipe deck polish" — canonical req text for DECK-01..04 (locks call-site paths, token names, threshold/velocity numbers). **Note:** DECK-01 success criterion will be rewritten by the plan per D-01.
- `.planning/ROADMAP.md` §"Phase 23: Deck polish" — goal statement + 5 success criteria (incl. mandatory reduced-motion device pass).
- `.planning/notes/v0.5-shape-mixed-sweep.md` — original `/gsd-explore` output identifying #14+#18 as the paired swipe-tokens.ts cluster.
- `.planning/phases/22-quick-wins/22-CONTEXT.md` §"Plan slicing & ordering" — Phase 22 "1 req → 1 plan" pattern (DEVIATED FROM in this phase per D-23; documented why).

### Files to modify (single-plan target set)
- `frontend/components/ShortlistCard.tsx` — DELETE L280-296 (OUI/NON overlays); REPLACE with ring-based motion divs (D-04); MODIFY L19 lucide import (remove `X`, keep `Heart`, `UtensilsCrossed`); MODIFY L347-381 `ShortlistThumbButtons` (filled Heart yes / outline Heart no, neutralize no-side chrome); ADD `panRef` + `onTap` handler on outer motion.div (D-17, D-18).
- `frontend/lib/swipe-tokens.ts` — UPDATE 4 constant values (D-08); DELETE legacy `SWIPE_SPRING` block at L20-25 (D-09); UPDATE JSDoc at L1-2, L17-18 (D-11).
- `frontend/components/ShortlistDeck.tsx` — **No direct edits expected.** The `committedDirection` plumbing, `handleVote`, `submittingFor` gating, `AnimatePresence mode="wait"`, peek-card structure all stay. If the planner needs to pass a router instance through props (vs calling `useRouter` inside ShortlistCard), this file may get a trivial pass-through; otherwise unchanged.
- `.planning/REQUIREMENTS.md` — REWRITE DECK-01 success criterion wording per D-01 (one-line change inside the existing checkbox bullet).

### Files for context (read, don't modify)
- `frontend/lib/motion.ts:24` — `transitions.springSnap` (240/28/1.1) — already imported and used at `ShortlistCard.tsx:223`; D-09 confirms no change needed here.
- `frontend/app/globals.css:201` — `--color-valide-foreground` = `#10B981` emerald (yes-ring + filled Heart).
- `frontend/app/globals.css:203` — `--color-valide-border` = emerald-500/50 (yes-button border, kept as-is).
- `frontend/app/globals.css` — `--destructive` (no-ring color; kept as-is for ring, REMOVED from no-button per D-13).
- `frontend/components/HomeDecide.tsx:539` — call site for `<ShortlistDeck onVoteApplied={...} />`; confirms ShortlistDeck props are stable in this phase.
- `frontend/app/recipes/[id]/page.tsx` — destination of the DECK-04 tap-to-detail navigation; already exists and is fully styled (Phase 8 / Phase 22 v0.5 QW-03).

### GitHub issues being closed
- gh#14 — DECK-01 (OUI/NON → tint, reinterpreted as ring per D-01)
- gh#18 — DECK-02 (swipe thresholds + spring)
- gh#17 — DECK-03 (Heart icons; milestone-locked filled/outline)
- gh#16 — DECK-04 (tap-to-detail)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`transitions.springSnap`** at `frontend/lib/motion.ts:24` — the Phase 7 paper-physics curve (stiffness 240, damping 28, mass 1.1). Already imported in `ShortlistCard.tsx:32` and applied at `transition={isFront && !reducedMotion ? transitions.springSnap : undefined}` (L223). **DECK-02 reuses this directly.** The legacy `SWIPE_SPRING` constant in `swipe-tokens.ts:20-25` (400/40, no mass) is unused and gets deleted.
- **`yesOpacity` / `noOpacity` `useTransform` hooks** at `ShortlistCard.tsx:99-108` — already wired to drive opacity from drag distance. DECK-01's ring just re-uses these on a different consumer (ring-bearing div instead of OUI/NON text div).
- **`committedDirection` plumbing** at `ShortlistDeck.tsx:81-82,124,179` and `ShortlistCard.tsx:51,182-203` — already disambiguates "swipe fly-off" vs "thumb-tap fly-off." DECK-04's tap-to-detail can hook into the same lifecycle without re-engineering.
- **`useEnumLabels` import** at `ShortlistCard.tsx:33,89` — Phase 22 QW-03 added this; no changes needed.
- **`useRouter` from `next/navigation`** — App Router pattern already used elsewhere in the app (e.g. onboarding flows); use this for DECK-04's `router.push`.

### Established Patterns
- **Reduced-motion via `useSyncExternalStore`** — `usePrefersReducedMotion()` at L74-76 subscribes to `(prefers-reduced-motion: reduce)`. Already correct. DECK-01's ring honors this via the existing `isFront && !reducedMotion` guard; DECK-04's tap-to-detail is a functional path (not a motion path) and is NOT gated by reduced motion.
- **`shortlist-card-{id}-title` accessibility ID + `aria-labelledby`** — kept as-is. Card remains `role="article"` (L207) — taps on an article element navigating to detail is a known A11y pattern (think a list of article previews).
- **`!absolute !inset-0`** class override — defeats `.paper-grain { position: relative }` from globals.css. Critical; do not touch.
- **Optimistic vote handling in `ShortlistDeck.handleVote`** — vote pre-applies via `onVoteApplied`, then awaits POST, rolls back via toast on failure. DECK-04 navigation does NOT interfere with this — taps don't vote, only swipes and thumb-button clicks do.
- **Phase 22 verification style** — grep gates + manual smoke + (this phase) real-device reduced-motion pass. No new Playwright specs.

### Integration Points
- **`ShortlistCard.tsx` outer `motion.div`** at L206 — single mount point for the new `onTap` (DECK-04) and `onPanStart`/`onPanEnd` (DECK-04 disambiguation). Also the ring-mount (DECK-01) attaches as a sibling/child here.
- **`swipe-tokens.ts`** — single source of truth for the 4 retuned numbers (DECK-02). No other consumers anywhere in the codebase (verified by D-09 grep on legacy SWIPE_SPRING).
- **`ShortlistThumbButtons`** (same file, L347-381) — single mount point for the Heart icon swap (DECK-03). The component is consumed exactly once at `ShortlistDeck.tsx:183`.
- **`/recipes/[id]` route** — destination for tap-to-detail; pre-existing, fully styled.

### Creative Options Constrained Out
- Could have added a "snap zone" visual indicator (a faint line at the 140px threshold). Not in this phase — adds new affordance, REQ doesn't ask for it.
- Could have added haptic feedback on commit via `navigator.vibrate(10)`. Not in this phase — iOS Safari standalone doesn't support Vibration API; would be a no-op on the only target device. Could revisit on the productize roadmap.
- Could have added a `?card=<id>` URL state for DECK-04 back-restoration. D-20 explicitly rejects this — the unvoted-filter already gives correct behavior for free.

</code_context>

<specifics>
## Specific Ideas

- **Ring, not background tint.** The user picked the subtler design (D-01) over the literal REQ wording. The plan rewrites DECK-01's success criterion to match the new design before execution — don't leave the REQ stale.
- **"Unloved" not "rejected" on the no-side.** D-13 strips destructive-red from the entire no-button (icon + border + hover). Reads softer; matches the "single-glyph language" milestone wording.
- **`SWIPE_OVERLAY_INPUT_PX = 80` is the deliberate "forgiving feedback" call.** A 50px casual drift produces ~62% ring opacity — visible enough that the user knows the deck registered the touch, light enough that they understand they haven't committed yet. Tuning later by ±10-20px is fair game if device feel disagrees.
- **One atomic commit (D-23) deviates from Phase 22's "1 req → 1 plan" deliberately.** Phase 22's reqs were independent quick wins; Phase 23's are tightly-coupled deck-feel changes. Splitting would deploy in-between visual states to prod. The deviation is documented; planner should NOT re-evaluate.
- **Phase 23 sets the verification template for "deck-feel polish phases."** Future phases that retune deck motion / icons / overlays inherit: grep gates + manual UI smoke + real-device reduced-motion pass.

</specifics>

<deferred>
## Deferred Ideas

- **Faint bg-tint underneath the ring** — surfaced and rejected in the Area 1 deviation discussion. User picked ring-only. If the ring feels too subtle on device after Phase 23 ships, a follow-up phase could layer a `--color-valide-tint/30` wash; not committed.
- **Playwright spec for tap-to-detail (DECK-04)** — surfaced in Area 4. Deferred per D-26 to preserve Phase 22's "no new specs" discipline. Could be filed against the v0.2.1 e2e suite as a v2 backlog item if the manual smoke surfaces a regression.
- **Visual snapshot tests for the ring at three drag distances** — surfaced in Area 4. Maximum regression coverage; high setup cost. Deferred — snapshot tooling not yet wired in this repo.
- **Card snap-zone visual indicators** — surfaced in Area 4 brainstorming. A faint vertical line at the 140px commit threshold. Adds new affordance; not in scope.
- **"Love" tier above yes** — surfaced in Area 3 (Heart icon discussion). Would break voting invariant #2 (5 computed states); explicitly out per gh#17 triage in REQUIREMENTS.md.
- **Per-direction haptic feedback on commit** — surfaced in Area 4 brainstorming. iOS Safari standalone doesn't support `navigator.vibrate`; no-op on the target device. Could revisit on productize roadmap.
- **`?card=<id>` URL-state preservation for tap-to-detail back-navigation** — surfaced in Area 2 (D-20). Unnecessary because the unvoted-filter already provides correct behavior. Filed if the partner-vote-during-detail edge case ever surfaces as a UX regression.

### Reviewed Todos (not folded)
None — no separate todo cross-reference run for this phase.

</deferred>

---

*Phase: 23-deck-polish*
*Context gathered: 2026-05-12*
