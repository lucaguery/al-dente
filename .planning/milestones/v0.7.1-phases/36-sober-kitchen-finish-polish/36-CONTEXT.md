# Phase 36: Sober Kitchen finish + polish - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — design-system §15 reference + locked first-paint-ledger decision + 2 deferred grey areas resolved inline per "no clarifying questions" autonomous rule

<domain>
## Phase Boundary

The `docs/design-system.html` §15 locked-screen contract fully ships as documented; the design system as-built ↔ as-documented re-aligns; the seven polish findings close.

**12 requirements:** SOBER-09..16 (8) + POLISH-01..04 (4)

**Out of phase:** This milestone closes here — Phase 36 is the last v0.7.1 phase. Next is the milestone lifecycle (audit → complete → cleanup).

</domain>

<decisions>
## Implementation Decisions

### Locked at milestone scaffold (REQUIREMENTS.md)

- **SOBER-09 ledger mode = first-paint ledger.** Composition A renders the ledger with the un-voted card embedded as a special row from first paint. Port HomeDecide.tsx to the locked spec literally — the swipe-deck-first-then-ledger toggle is replaced by ledger-from-first-paint with an inline un-voted affordance. This structurally resolves LIVE-04 (the marginalia branch guard Phase 34 shipped becomes redundant once the ledger is always visible, but stays in place as defense-in-depth).
- **POLISH-03 + SOBER-15 were TBD at scaffold time.** Resolved inline below per autonomous "no clarifying questions" durable rule.

### SOBER-15 — Rejeté row policy (resolved: render muted)

**Decision:** Option (a) — render the Rejeté row in a muted state alongside the other four states (Validé / Pressenti / Contesté / Rejeté / Sans avis). Do NOT hide.

**Rationale:**
- Symmetric with the other 4 computed states — the table-à-manger scene shows all 5 seat states already (SOBER-13); the ledger should mirror this.
- Lower blast radius: no filter logic to introduce; the ledger renders every shortlist row by default.
- Natural visual gradient: Validé tint → Pressenti mid-tint → Contesté alert-tint → Rejeté muted-tint → Sans avis neutral-border. The user sees the full daily state at a glance, not a curated subset.
- Avoids forcing a mid-port doc update to `docs/design-system.html` §15.A (which SOBER-16 already touches for a different reason).
- Daily-use UX: knowing the partner rejected something is informative ("we agreed off this") — hiding would erase the consensus signal.

**Visual treatment:** apply Phase 32's existing muted-tint variant if it exists; otherwise add a `.row-state-rejete` class with `--color-muted-foreground` text + 60% opacity + thin destructive-border-left rule. Implementation discretion to the executor.

### POLISH-03 — Meta-pill icon harmonization (resolved: all-text-pills)

**Decision:** All meta-pills on Recette détail are text-only. Drop the leading `Clock` icon on the "90 min" pill.

**Rationale:**
- Sober Kitchen's editorial aesthetic prefers typography over iconography (design-system.html §1 "register" + §15.C cookbook page).
- `min` unit already implies time semantics; the Clock icon is redundant decoration.
- Cleaner visual: pills become uniform "label" shapes — `90 min`, `Italienne`, `Réconfortante`, `Moyen` — no mixed-modal heterogeneity.
- Fewer DOM elements; smaller bundle (one less lucide-react import in the meta row).

**Implementation:** strip the `<Clock />` import + render from the meta-pill component; verify the visual register matches the other three pills.

### MVP posture acknowledged

- Several requirements involve TypeScript / styling rewrites that touch shared components (`HomeDecide.tsx`, `BottomNav.tsx`, `RecipeCard.tsx`). MVP discipline: clean rewrites, no compat shims. The first-paint-ledger port retires the dual-mode swipe-deck behavior cleanly.
- SOBER-14 seed bump (`cook_count >= 10` for one recipe) is a one-shot seed change — no migration since seed re-runs are idempotent.
- SOBER-16 is a docs-only edit to `docs/design-system.html` (not code).

### Cooperation with v0.7 phases

- Phase 30 BUG-01 `useSignedPhotoUrl` hook stays the photo-loading path (no rework).
- Phase 31 NAV-01 BottomNav variant discriminator stays; SOBER-10 only adds the elevation (translateY + drop shadow) on the central-cta variant.
- Phase 32 Sober Kitchen tokens stay in `globals.css`; Phase 36 consumes them in the screens that didn't fully port (SOBER-11 Patine view, SOBER-12 Recette détail cookbook gestures, SOBER-13 table-à-manger seats).
- Phase 35 ChipPayload + grep gate — orthogonal; no interaction expected.

### SOBER-13 — Table-à-manger seat geometry

**Note:** the punch list said the accessibility tree showed flat `<generic>` elements suggesting the seat geometry might not have rendered. This is a **verification** task first; if the geometry IS shipped, SOBER-13 closes without code change. If NOT, the executor implements the locked spec (table-plate + 2 state-classed seats per shortlist row).

### SOBER-12 — Recette détail cookbook gestures

The locked §15.C gestures:
1. Terracotta-30 left margin-rule on ingredients (vertical CSS border-left)
2. Backdrop-blur title strip when photo is present (full-bleed hero overlay)
3. Fraunces-italic numbered steps (counter content + italic + terracotta numeral)
4. Caveat-slant marginalia gutter for step asides (e.g. `cooking_logs[].notes` rendered as handwritten paper-margin notes against the printed step — NOT plain captions)

The executor verifies each gesture's presence; missing pieces ship in the SOBER-12 plan.

### Claude's Discretion

- Whether SOBER-09 (first-paint ledger) is one plan or split into "ledger composition" + "swipe-deck retirement" — executor's call based on shared-file scope (HomeDecide.tsx is the big surface; LedgerCard composition is the pattern to apply).
- Whether to bundle POLISH-01..04 into one plan or split — they're cheap independently; bundling into one polish-sweep plan is fine.
- Plan granularity overall: 5-7 plans recommended (SOBER-09 / SOBER-10 / SOBER-11 / SOBER-12+13 / SOBER-14 / SOBER-15+16 / POLISH-* sweep). Adjust as the executor sees fit.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- `docs/design-system.html` — locked §15 reference. SOBER-* implementations cross-reference this.
- `frontend/components/LedgerCard.tsx` — Phase 32 primitive; SOBER-09 composes this for the first-paint ledger.
- `frontend/components/TableVote.tsx` — Phase 32 primitive; SOBER-13 verifies + extends.
- `frontend/components/Marginalia.tsx` — Phase 32 Caveat marginalia primitive; SOBER-12 step-aside gutter consumes this.
- `frontend/components/BrandLoader.tsx` — Phase 32 brand-mark loader (already shipped in v0.7).
- `frontend/components/BottomNav.tsx` — Phase 31 `variant: "tab" | "central-cta"` discriminator; SOBER-10 only mutates the central-cta variant's styling.
- `frontend/components/HomeDecide.tsx` — SOBER-09 ledger-from-first-paint target; the swipe-deck composition currently gates ledger render on `unvotedCount === 0`.
- `frontend/app/recipes/page.tsx` — SOBER-11 Patine view target; LibraryViewSwitch + RecipeRow composition.
- `frontend/app/recipes/[id]/page.tsx` — SOBER-12 Recette détail target (cookbook gestures).
- `backend/app/cli/seed.py` — SOBER-14 seed cook_count bump target.

### Established Patterns

- Sober Kitchen tokens (terracotta sober OKLCH palette + Cormorant display + Caveat marginalia + paper-grain) — all in `frontend/app/globals.css`. Use the tokens; don't add new colors.
- `useEnumLabels()` is the canonical French label translator (now systemic post-Phase-35).
- Phase 32 primitives (Marginalia, BrandLoader, LedgerCard, TableVote) — reuse, never parallel.
- Computed vote state via `services/voting.compute_vote_state` (invariant #2) — never store, always derive.

### Integration Points

- SOBER-09 ledger touches: HomeDecide.tsx + LedgerCard + (possibly) `frontend/app/page.tsx` (un-voted card embed).
- SOBER-10 BottomNav: `BottomNav.tsx` — central-cta variant only.
- SOBER-11 Patine view: `frontend/app/recipes/page.tsx` + `LibraryViewSwitch.tsx` + new section-divider component (or extend RecipeRow).
- SOBER-12 Recette détail: `frontend/app/recipes/[id]/page.tsx` + Marginalia component for the step-aside gutter.
- SOBER-13 Table-à-manger: `TableVote.tsx` — visual audit + spot-fix.
- SOBER-14 Dogear: probably new `Dogear.tsx` primitive + `RecipeCard.tsx` / `RecipeRow.tsx` consumption; `seed.py` cook_count bump.
- SOBER-15 Rejeté row: `HomeDecide.tsx` / `LedgerCard.tsx` variant for the muted state.
- SOBER-16: `docs/design-system.html` §15 mockup edit (doc-only, no code).
- POLISH-01..04: scattered touches; one sweep plan.

</code_context>

<specifics>
## Specific Ideas

- **SOBER-09 ledger composition reference:** docs/design-system.html §15.A — the un-voted card embeds inline as a special row at its alphabetical/state-derived position, not at the top as a separate hero.
- **SOBER-12 step-aside gutter:** the seed has at least one recipe with `cooking_logs[].notes` populated — verify which recipe carries this so the visual gesture is observable in dev.
- **SOBER-14 seed bump:** bump one recipe to `cook_count = 12` (well above the dogear threshold of ~2) so the dogear is visibly distinct from cook_count=1 cards.
- **POLISH-02 push banner:** currently in `frontend/app/page.tsx` (Accueil top). Move below the shortlist hero or behind a Réglages CTA. Reuse the existing PushSubscriptionBanner component verbatim — only its mount point changes.

</specifics>

<deferred>
## Deferred Ideas

- **Husky pre-commit hook for ENUM-04 grep gate** — explicitly deferred per Phase 35 CONTEXT; stays out of Phase 36.
- **Walking the deferred §15.E screens** — the design system itself flags these as out-of-scope for porting; Phase 36 honors that.
- **Test coverage** — gh#28 test coverage stays in v0.8 per REQUIREMENTS.md out-of-scope list.

</deferred>
