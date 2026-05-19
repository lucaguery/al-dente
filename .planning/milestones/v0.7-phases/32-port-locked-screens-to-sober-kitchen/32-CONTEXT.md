# Phase 32: Port locked screens to Sober Kitchen - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Execute `docs/design-system.html` §15 ("Mise en code") A→D against today's frontend:

- §15.A — Swap globals.css token *values* (terracotta hue shift, member-color desaturation, shadow halving, radius reduction). Token *names* are preserved.
- §15.B — Register Caveat alongside Cormorant Garamond + IBM Plex Sans (`next/font/google`), add `.marginalia` + sizing utility classes, drop italic from `.text-display`.
- §15.C — Add four new primitives — `<LedgerCard>` (patine card with `--patina: 0|1|2|3`), `<TableVote>` (table-scene seat-state renderer), `<Marginalia>` (Caveat wrapper, sizes sm/md/lg + optional slant), `<BrandLoader>` (drawing-stroke brand-mark animation). Sweep their adoption across the codebase.
- §15.C — Port the three locked screens: Accueil A (`HomeDecide.tsx` — shortlist at center, table-scene per row, CTA at bottom), Bibliothèque A + B + C (`/recipes/page.tsx` — grid default + list editorial + patine grouped, persisted view-switcher), Recette A (`/recipes/[id]/page.tsx` — cookbook page register, hero photo, marginalia identitaire, sticky CTA).
- §15.D — Parallel cleanup: delete `frontend/app/styleguide/page.tsx` (already marked `TODO(milestone-close)`); verify invariants (no schema, no new semantic tokens, no enum drift).

Out of scope:

- §15.E reported screens — Capture (`/recipes/new`) touched only at the primitive level (forced by token-leak + strict spinner sweep). Inbox (`/inbox`) doesn't exist anymore (Phase 27 D-10 removed it); §15.E's "Réception reported" line is stale.
- Bottom-nav structural changes — Phase 31 just landed the 4-slot + central-CTA shape; Phase 32 only swaps token *values* on the nav chrome.
- Adding `state` column to votes (invariant #2 — seat state is computed via `services/voting.compute_vote_state`).
- Schema changes (no new recipe / cooking_log / vote columns).
- Icon swaps on the bottom-nav tabs (deferred — REQUIREMENTS.md §Out of Scope).
- `« Suggérer »` 5th tab (gh#26, backlog).
- Smart Paste capture-screen redesign (out of scope — competes with v0.6 design lock).
- SW cache tuning / refetch-on-visibilitychange (reserved for a cache-strategy phase).
- Edits to `docs/design-system.html` itself (this is a port, not a redesign — discrepancies handled as planning deviations, doc edited only if forced).

</domain>

<decisions>
## Implementation Decisions

### Plan / PR sequencing
- **D-01:** **Faithful §15.C 5-plan ladder.** Plans mirror the design-system doc's PR order: `32-01 Tokens` → `32-02 Primitives + sweeps` → `32-03 Accueil port` → `32-04 Bibliothèque port` → `32-05 Recette port`. Atomic, easy to revert, mirrors the locked merge order. Each plan delivers a buildable + deployable state.
- **D-02:** **Cross-cutting sweeps land in `32-02 Primitives`.** The marginalia register (SOBER-07) and brand-mark loader (SOBER-08) sweeps run inside the primitives plan immediately after introducing `<Marginalia>` and `<BrandLoader>` — single grep gate at 32-02 close. Per-screen plans (32-03/04/05) then *compose* with primitives, they don't sweep.
- **D-03:** **No 32-06 close-out plan.** Verification happens at each plan boundary; the final grep gates (no ad-hoc terracotta literals, no `animate-spin` outside BrandLoader, no `state` column on votes) run as part of plan-checker on 32-02 (sweeps) and 32-04 (Bibliothèque, which touches the most surface).

### Plan-by-plan scope summary
- **D-04 (32-01 Tokens):** Apply §15.A delta to `frontend/app/globals.css` in place (drop the v0.2 Phase 5 terracotta block, replace with sober values). Register Caveat via `next/font/google` in `app/layout.tsx` alongside `cormorantGaramond` / `ibmPlexSans` (exposes `--font-marginalia`). Add `.marginalia` / `.marginalia-sm/md/lg` / `.marginalia.slant` / `.ledger-card` / `.patina-stamp` / `.dogear` / `.table-scene` + seat utilities / `.loader-brand` to `@layer utilities`. Add `--patina: 0` default token. Remove italic from `.text-display`. Delete `frontend/app/styleguide/page.tsx` (§15.D). Touches: 2 files modified + 1 deleted. Renders unchanged-or-slightly-shifted on every screen, no broken state.
- **D-05 (32-02 Primitives + sweeps):** Add `<LedgerCard>` (consumes `--patina` set via inline style or className variant), `<TableVote>` (renders plate + 4 seats + per-seat state class from `computeVoteState` output), `<Marginalia>` (Caveat font, sm/md/lg, optional slant), `<BrandLoader>` (96px default + sm inline variant, brand-mark drawing animation with `prefers-reduced-motion` respect). **Sweep call-sites:** every `Loader2`/`animate-spin` (8 files — `HomeDecide`, `RecipeForm`, `RecipeThread/SystemBubble` × 3 sites, `VoiceModifySheet`, `SearchInput`, `onboarding/create`, `onboarding/join`) → `<BrandLoader>` (sm variant). Sonner `<Toaster>` `Loader2Icon` prop overridden (or per-toast icon). `PinLabel.tsx` retains its current API (Phase 28 lock) but composes `<Marginalia>` internally if straightforward. Grep gates at plan close: `grep -rn "animate-spin\|Spinner\|LoadingSpinner" frontend/` returns 0 outside `BrandLoader.tsx`; `grep -rn "var(--font-marginalia)" frontend/` returns the primitive + every legitimate call-site.
- **D-06 (32-03 Accueil port):** Port `HomeDecide.tsx` to the §15 Accueil A composition: page-header date row, H1 Cormorant 28px upright "On mange quoi ce soir ?", Caveat marginalia slant subhead (data-derived per D-13), shortlist-row stack with `<TableVote>` per row + `--valide-tint` background on validé rows, sticky primary CTA at bottom ("Cuisiner X"). `<ShortlistDeck>` (swipe deck) survives as a separate sub-surface inside HomeDecide — only the shortlist *list* + voting *icons* change to table-scene; the deck's vote-by-swipe remains. Touches: `HomeDecide.tsx` only (plus i18n keys).
- **D-07 (32-04 Bibliothèque port):** Port `/recipes/page.tsx` to the §15 Bibliothèque composition with all three views (D-09). Add `<LibraryViewSwitch>` (segmented control, 3 icons), `<RecipeRow>` (horizontal list-view card), helpers `cookCountToPatina(n)` (D-11) + `groupByPatina(recipes)` (D-12) in `frontend/lib/recipes.ts`. Wrap existing `<RecipeCard>` body in `<LedgerCard>` with `--patina` driven by `cookCountToPatina(recipe.cook_count)`. The dogear element renders only when `patina >= 3` (Héritage). View choice persisted in `localStorage["aldente.library.view"]` (default `grid`). Anti-flash: SSR assumes `grid`, client hydrates with 150ms opacity transition if stored view differs.
- **D-08 (32-05 Recette port):** Port `/recipes/[id]/page.tsx` to the §15 Recette A composition: sticky floating bar (back, menu) over photo, hero 16:10 photo with `-mt-9` bleed-into-bar, body section with title (Cormorant 26px) + Caveat marginalia identitaire (data-derived per D-13), badge row, `<IngredientList>` + `<StepList>` (markup-only, no new primitives), step-level marginalia from `cooking_logs[].step_notes[]` (only if data exists; no fallback), sticky bottom CTA with blur ("Cuisiner maintenant"). The `<PinLabel>` gutter labels (Phase 28) survive on the structured-recipe sections — no change to their contract.

### Bibliothèque view-switcher
- **D-09:** **All 3 views ship in 32-04** — grid (default), list editorial, patine grouped. Matches §15.C PR-04 + ROADMAP success criterion #2 verbatim.
- **D-10:** **Persistence: `localStorage["aldente.library.view"]`** — values `"grid" | "list" | "patina"`, default `"grid"` at first install. Client-only read; SSR pre-renders grid; client swaps panel after hydration with `opacity 0 → 1` over 150ms. No server-side preference (a session-level choice per the doc).

### Patine
- **D-11:** **`cookCountToPatina(n: number): 0 | 1 | 2 | 3` thresholds:** `0 → 0` (À l'essai / jamais), `1-2 → 1` (récent), `3-10 → 2` (Habitudes), `>10 → 3` (Héritage). Lives in `frontend/lib/recipes.ts` alongside existing helpers. Matches doc examples (Risotto 34× → 3, jamais → 0).
- **D-12:** **`groupByPatina(recipes: Recipe[])` returns `{ heritage: Recipe[], habitudes: Recipe[], essai: Recipe[] }`** — used only by the patine view (32-04). Bucket boundaries: `heritage = patina >= 3`, `habitudes = patina === 2`, `essai = patina <= 1` (collapses bands 0 + 1 into the "à l'essai" bucket per the doc's grouping logic). Each section header reads from `home.library.patina_section.{heritage,habitudes,essai}` i18n keys with `count` interpolation.

### Marginalia copy sourcing
- **D-13:** **Hybrid — data-derived where possible, hardcoded i18n fallback otherwise.** Specific rules:
  - **Accueil subhead** (`HomeDecide`): if any shortlist row is `state === "valide"` → `home.subhead.validated` ("— déjà une idée validée"); else if any row is `state === "pressenti"` → `home.subhead.tentative` ("— une piste, à confirmer"); else → `home.subhead.empty` ("— personne ne s'est encore prononcé"). All three keys land in `fr.json` under `home.subhead.*`.
  - **Recette détail subhead** (`/recipes/[id]/page.tsx`): always composed from `recipe.cook_count` — `recipes.detail.subhead.cooked` (`"cuisiné {count} fois"`) when `cook_count > 0`; `recipes.detail.subhead.never` (`"pas encore cuisiné"`) when `cook_count === 0`. The "de chez maman" provenance shown in the doc mock is **aspirational** — no `source`/`provenance` field exists on the Recipe model today, so it's deferred (see Deferred Ideas).
  - **Recette détail step marginalia**: only renders when a step has a backing note. Today's schema has `cooking_logs[].note` (single per-log note) but **no `step_notes[]` array**. So Phase 32 marginalia render condition is *the most recent `cooking_logs[].note` for this recipe*, displayed once below step 1 (or absent if no log/note). Per-step marginalia from `step_notes[]` is deferred (see Deferred Ideas).
  - **Patine view section counts**: data-derived from `groupByPatina` bucket sizes.

### Spinner sweep (SOBER-08)
- **D-14:** **Strict grep gate enforced.** `grep -rn "animate-spin\|Spinner\|LoadingSpinner" frontend/` returns 0 matches outside `BrandLoader.tsx` at plan-checker close of 32-02. Every `Loader2` site becomes `<BrandLoader>` or `<BrandLoader size="sm">` per surface:
  - Inline submit-button spinners (forms) → `<BrandLoader size="sm">` (16-20px equivalent footprint, single-stroke variant).
  - Full-screen / centered loading states → `<BrandLoader>` (default 96px).
  - In-input pending indicators (`SearchInput`) → `<BrandLoader size="sm">`.
  - Sonner `<Toaster>` loading icon → planner picks the substitution mechanism (per-toast `icon` prop override, `Toaster` config `icons.loading`, or a thin wrapper).
- **D-15:** **`BrandLoader` is the single export.** Two size variants (`size="default" | "sm"`) — no `<Spinner>` shim, no `<LoadingSpinner>` re-export. Match the locked CSS keyframe `drawLoop` from `docs/design-system.html` (220 stroke-dash, 3.2s ease-craft cycle, two-path stagger, `prefers-reduced-motion` flat fallback).

### §15.E deferred screens
- **D-16:** **Capture (`/recipes/new`) — primitive-level touches only.** Allowed: token-leak via `globals.css`, `<BrandLoader>` swap inside `SystemBubble.tsx` (3 sites, forced by D-14 strict gate), Caveat font-family changes wherever `var(--font-marginalia)` already applies (transitive). Forbidden: layout changes, new sections, new copy, marginalia-register expansion (e.g., adding `<Marginalia>` to advisory bubbles), changes to RecipeThread composition or props.
- **D-17:** **`/inbox` deletion not required.** Already removed by Phase 27 D-10. §15.E's "Réception" line is stale documentation; Phase 32 does not edit `design-system.html` to remove the staleness (out of scope per phase boundary — doc edits only on forced discrepancy).

### Bottom nav
- **D-18:** **Token-only port on `BottomNav.tsx`.** Phase 31 just landed the 4-slot + variant-discriminator shape. Phase 32 inherits the primary hue shift via `--primary` token; the central CTA's filled-circle visual stays unchanged structurally. No icon swaps (carved out by REQ NAV-01 / 31-CONTEXT.md). Bottom-nav file edits in Phase 32 should be limited to: removing now-redundant ring/shadow tweaks if any visually clash with the softer sober shadows, and verifying the safe-area inset arithmetic still holds after `--shadow-nav` halving.

### Invariant guards (must hold at phase close)
- **D-19:** **Invariant #2 (voting state computed):** `<TableVote>` consumes the output of `computeVoteState(votes, members)` exclusively. No `state` column on `votes` or `daily_shortlist_recipes`. Grep gate: `grep -rn "state.*column\|vote_state.*Mapped" backend/app/models/` returns 0. SOBER-06 success criterion #4 reuses this exact grep.
- **D-20:** **Invariant #4 (realtime contract):** Phase 32 adds zero new `broadcast_to_household` events. Visual port only.
- **D-21:** **Invariant #6 (French-only via next-intl):** every new visible string lands in `fr.json` (`home.subhead.*`, `home.library.patina_section.*`, `recipes.detail.subhead.*`, plus any switch-button `aria-label`s).
- **D-22:** **Locked vocabularies untouched:** `enums.ts` ↔ `enums.py` parity unchanged. Vote `value`, `Season`, `Cuisine`, `Mood`, `Protein`, `Difficulty` — no drift.
- **D-23:** **Validé color invariant (DECIDE-03 — §15.D Vérifier les invariants):** `--color-valide-foreground` stays emerald-h≈145. Don't accidentally desaturate it during the member-color desat sweep.

### Claude's Discretion
- Exact split of `<BrandLoader>` size variants (one component with `size` prop vs. two named exports). Either works; D-15 only locks the name.
- Whether `<LedgerCard>` is a thin styled wrapper around the existing `Card` shadcn primitive or an independent component. Either works as long as `--patina` and `::before` / `::after` overlays compose correctly.
- Exact i18n keys / French phrasing within the `home.subhead.*` / `recipes.detail.subhead.*` namespaces (D-13 locks the *contract*; planner picks the wording, planner can run a brief consistency pass).
- Toaster loading-icon substitution mechanism (D-14 lists three valid paths).
- Whether to compose `<Marginalia>` inside `PinLabel.tsx` (D-05 says "if straightforward"; if it complicates the conflict-button branch, leave PinLabel alone).
- The exact "À l'essai" patine bucket name when patina-1 recipes land in it (the doc shows `essai`; planner confirms naming).
- Whether the Accueil page-header date row uses `formatRelativeFr` (existing) or a new short-form helper. Either works.

### Folded Todos
None — `gsd-tools todo match-phase 32` returned 0 matches.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope (REQUIREMENTS + ROADMAP)
- `.planning/REQUIREMENTS.md` §"Sober Kitchen design-system port" — SOBER-01 through SOBER-08 acceptance text.
- `.planning/REQUIREMENTS.md` §"Out of Scope (v0.7)" — `« Suggérer »` tab, bottom-nav icon swaps, Smart Paste redesign, SW cache tuning, `visibilitychange` refetch, §15.E deferred screens — all explicitly cut.
- `.planning/ROADMAP.md` §"Phase 32: Port locked screens to Sober Kitchen" — 6 success criteria (token-grep gate, three locked screens visual match, patine mapping, voting scene + invariant #2 grep, marginalia register + PinLabel reference, brand-mark loader + spinner-grep gate).
- `.planning/PROJECT.md` §"Current Milestone" — v0.7 scope. §"Key Decisions" — design-system.html as locked contract.

### Design system (the executable contract)
- `docs/design-system.html` §15 ("Mise en code") — A through E. The whole §15 is prescriptive; treat it as a spec, not a reference.
  - §15.A — globals.css `--rm`/`--add` deltas. Direct copy.
  - §15.B — Caveat font load, `.marginalia` utilities, `.text-display` italic removal.
  - §15.C — PR ordering (D-01 mirrors this).
  - §15.D — Cleanup checklist (delete `/styleguide`, verify invariants, iOS PWA Caveat test).
  - §15.E — Deferred screens (Capture / Réception). D-16/D-17 handle.
- `docs/design-system.html` §"Accueil" (id="accueil") — locked Accueil A composition + breakdown.
- `docs/design-system.html` §"Bibliothèque" (id="bibliotheque") — locked A+B+C composition + view-switcher.
- `docs/design-system.html` §"Recette — Détail" (id="recette") — locked Recette A composition + breakdown.
- `docs/design-system.html` `:root` block (lines 21-92) — authoritative token values for the sober palette.
- `docs/design-system.html` PATINE CSS block (lines 186-236) — `.ledger-card`, `::before`/`::after` overlays, `.dogear`, `.patina-stamp` exact CSS.
- `docs/design-system.html` TABLE-À-MANGER block (lines 238-297) — `.table-scene`, `.table-plate`, `.table-seat`, per-state seat classes.
- `docs/design-system.html` LOADER block (lines 299-320) — `.loader-brand` SVG + `drawLoop` keyframes + `prefers-reduced-motion` fallback.

### Architecture invariants (CLAUDE.md)
- `CLAUDE.md` §"Architecture invariants" — invariant #2 (voting state computed, not stored — D-19); invariant #4 (realtime contract — D-20, no new broadcasts); invariant #6 (French-only via `next-intl` — D-21); invariant #8 (HttpOnly cookie auth — no change here, but Phase 32 must not regress).
- `CLAUDE.md` §"Locked vocabularies" — enums.ts ↔ enums.py parity (D-22).
- `CLAUDE.md` §"MVP phase posture" — clean rewrites, no compat shims. Token values swap in place; `/styleguide` deleted in 32-01.
- `CLAUDE.md` §"Conventions" — ESLint flat config formatter authority; `@/*` path alias; `next build --webpack`.
- `frontend/AGENTS.md` — Next.js 16 breaking changes (consult before frontend code).

### Source files (current implementation)
- `frontend/app/globals.css` — 498 lines, terracotta primary already in place from v0.2 Phase 5. D-04 swaps values in §15.A. Add Caveat utilities + patine + table-scene + loader-brand CSS in `@layer utilities`.
- `frontend/app/layout.tsx` — registers `cormorantGaramond` + `ibmPlexSans` via `next/font/google`. D-04 adds `Caveat` alongside, exposes `--font-marginalia`. `<main>` `pb-[calc(5rem+env(safe-area-inset-bottom))]` (set by Phase 31) unchanged.
- `frontend/app/page.tsx` — Accueil entry; renders `<HomeDecide />` inside `OnboardingGuard`. D-06 doesn't touch this file; HomeDecide is the surface.
- `frontend/components/HomeDecide.tsx` — Accueil composition. 20 KB. D-06 ports.
- `frontend/app/recipes/page.tsx` — Bibliothèque. Single grid of `<RecipeCard>`. D-07 adds switcher + 2 new views.
- `frontend/components/RecipeCard.tsx` — grid card. D-07 wraps body in `<LedgerCard>` with `--patina`.
- `frontend/app/recipes/[id]/page.tsx` — Recette détail. D-08 ports. Hosts `<PinLabel gutter>` already.
- `frontend/components/RecipeThread/PinLabel.tsx` — Phase 28 reference for `var(--font-marginalia)` + 600-weight + 12px Caveat. D-05 keeps API; optional internal composition with `<Marginalia>`.
- `frontend/components/RecipeThread/SystemBubble.tsx` — 3 × `Loader2`. D-14 strict sweep replaces with `<BrandLoader size="sm">`.
- `frontend/components/RecipeThread/` — the wider thread directory. D-16 caps Phase 32 touches to SystemBubble's spinners only.
- `frontend/components/BottomNav.tsx` — Phase 31 4-slot + central-CTA shape. D-18 token-only changes here.
- `frontend/components/BrandIcon.tsx` — existing brand mark (two SVG paths, the same shape used in the loader). D-05 / D-15 — `<BrandLoader>` likely composes this SVG with stroke-dasharray animation.
- `frontend/lib/recipes.ts` — D-11 + D-12 add `cookCountToPatina` + `groupByPatina` here.
- `frontend/lib/votes.ts` — `computeVoteState` lives here. D-19 — `<TableVote>` consumes its output.
- `frontend/lib/i18n/fr.json` — D-13 + D-21 — new keys land here.
- `frontend/app/styleguide/page.tsx` — D-04 deletes in 32-01 (§15.D explicit).
- `backend/app/models/recipe.py` — confirm `cook_count` field + `last_cooked_at` exist (they do, Phase 4 D-05). No edits in Phase 32.
- `backend/app/models/vote.py` / `daily_shortlist.py` — D-19 grep gate confirms NO `state` column added.

### Spinner-sweep call-site inventory (current)
- `frontend/components/HomeDecide.tsx` — 2 sites (delayed-flag shortlist load).
- `frontend/components/RecipeForm.tsx` — 1 site (submit button).
- `frontend/components/RecipeThread/SystemBubble.tsx` — 3 sites (LLM processing, advisory, default).
- `frontend/components/VoiceModifySheet.tsx` — 1 site (voice processing).
- `frontend/components/SearchInput.tsx` — 1 site (in-input pending).
- `frontend/app/onboarding/create/page.tsx` — 1 site (submit).
- `frontend/app/onboarding/join/page.tsx` — 2 sites (submit + verify).
- `frontend/components/ui/sonner.tsx` — Sonner's `<Toaster>` `Loader2Icon` (D-14 — substitution mechanism is Claude's discretion at plan time).

Total: ~12 sites across 8 files (excluding Sonner re-export). All swap to `<BrandLoader>` or `<BrandLoader size="sm">`.

### Test references
- `frontend/playwright.config.ts` — iPhone-shape Chromium viewport. Visual ports must not regress `toBeInViewport()` assertions on critical surfaces.
- `frontend/tests/e2e/*` — existing specs. Audit for selectors that depend on the v0.2 terracotta hues or on labels we're not changing. Most should survive the token swap (semantic var unchanged).
- `frontend/tests/e2e/shortlist-vote.spec.ts` — D-19 indirectly tested if it asserts vote-state derivation.

### Lucide / fonts
- `lucide-react` — icon source (used in design-system.html mocks too: `home`, `book-open`, `settings`, `utensils`, `flame`, `wheat`, `leaf`, `cookie`, `timer`, `chevron-left`, `more-horizontal`, `plus`, `search`, `layout-grid`, `list`, `layers`). All already in dependency tree.
- `Caveat` font (Google Fonts) — D-04 registers via `next/font/google`. Weights: 500, 600. Subsets: latin + latin-ext. `display: "swap"`.
- iOS Safari PWA Caveat verification (§15.D) — manual gate at end of 32-02 or 32-05 before sign-off. Fallback `cursive` in the family stack.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `<Card>` (shadcn) in `@/components/ui/card` — `<LedgerCard>` can extend this or replace it for recipe-card mounts. Either path works; the existing usage is small (Card is mounted on the Accueil install-hint banner today).
- `<BrandIcon>` — already shipped (v0.5 RID-01). Two-path SVG matches the design-system loader exactly. `<BrandLoader>` is BrandIcon + stroke-dasharray animation, not a new SVG.
- `<PinLabel>` — Phase 28 reference for Caveat / `--font-marginalia` / 600-weight / 12px. Same font, same color, same spirit. `<Marginalia>` is the more general-purpose primitive.
- `useTranslations("nav")` / `useTranslations("home")` etc. — `next-intl` provider already wired in `app/layout.tsx`. Adding keys is single-file (`fr.json`).
- `formatRelativeFr` (`lib/datetime.ts`) — for "il y a 4 j", "2 sem" etc. captions on grid cards.
- `useEnumLabels` (`lib/enum-labels.ts`) — for badge labels (cuisine, mood, etc.). Already used by `ShortlistCard` / `RecipeCard`.
- `useSignedPhotoUrl` (`lib/hooks/useSignedPhotoUrl`) — BUG-01 / Phase 30 hook for self-healing photo URLs. Library + Recette détail consume it.
- `computeVoteState` (`lib/votes.ts`) — already the canonical state derivation. `<TableVote>` consumes.
- `ShortlistDeck` (`components/ShortlistDeck.tsx`) — swipe-deck inside HomeDecide. Survives the port (D-06); only the list/voting *visual* changes.
- `cooking_logs[].note` (single per-log note, on `CookingLog` model) — feeds the Recette détail step-1 marginalia (D-13). No `step_notes[]` array exists yet.

### Established Patterns
- ESLint flat config + TypeScript strict; path alias `@/*` → `frontend/`.
- `next/font/google` for typography (Cormorant + IBM Plex today; D-04 adds Caveat).
- shadcn primitives sit in `@/components/ui/`; app components in `@/components/`; route components in `@/app/`. New primitives (LedgerCard, TableVote, Marginalia, BrandLoader) belong in `@/components/` (or a `@/components/sober/` sub-folder — planner's call).
- Tailwind v4 with `@theme inline` block in `globals.css` mapping `--color-*` → `--*`. The token-name preservation in §15.A means no Tailwind `@theme` edits.
- `paper-grain` utility class already exists (v0.2). Phase 32's `.ledger-card::after` adds a more textured patine grain over it; check for visual stacking.
- French-only via `next-intl`. Empty key fallback (`{key}` rendered as-is) is the dev-mode catch.
- `OnboardingGuard` wraps every authenticated page entry. No change.

### Integration Points
- `BottomNav` mounts in `app/layout.tsx` (root layout). D-18 — token-only port.
- `HomeDecide` mounts in `app/page.tsx` inside `OnboardingGuard`. D-06 — Accueil A port.
- `RecipesPage` is `app/recipes/page.tsx`. D-07 — Bibliothèque port (switcher + 3 views).
- `RecipeDetailPage` is `app/recipes/[id]/page.tsx`. D-08 — Recette A port.
- `RealtimeProvider` wraps everything; Phase 32 adds zero new event types (D-20).
- `SessionProvider` survives; no auth changes.
- Sonner `<Toaster>` is the global toast surface; substitution mechanism for its loading icon is a 32-02 sub-decision (D-14).

### Pitfalls to avoid
- **Don't regress invariant #2.** Tempting to add a `state` column on `daily_shortlist_recipes` to simplify the `<TableVote>` render — the seat state machine is `computeVoteState`'s job. D-19 grep gate catches.
- **Don't regress validé emerald hue.** §15.D explicitly says "Validé reste émeraude h≈145 — invariant DECIDE-03". When sweeping `--color-member-*` desaturation, leave `--color-valide-foreground` / `--color-valide-emphasis` / `--color-valide-border` / `--color-cooking-foreground` ALONE. D-23 codifies.
- **Don't double-mount Caveat font.** Verify only `app/layout.tsx` loads the font; no per-component `@font-face` or `<link>` injection.
- **Don't lose iOS PWA font reliability.** §15.D — Caveat is a Google web-font; verify it loads in standalone PWA mode. `cursive` fallback in the family stack. Manual gate before sign-off.
- **Don't sweep PinLabel's existing semantics away.** Phase 28 D-04 locks PinLabel's API (field / hasConflict / onConflictTap / gutter). The `<Marginalia>` primitive is *additive*. If composing them internally creates churn, leave PinLabel alone (D-05 "if straightforward").
- **Don't widen Phase 32 to Capture composition changes.** D-16 caps `/recipes/new` touches to spinner swap + token leak. Adding marginalia register to advisory bubbles is a future-phase decision.
- **Don't omit `prefers-reduced-motion` fallback** on `<BrandLoader>` — locked in the design-system CSS (animation: none + stroke-dashoffset: 0). Match exactly.
- **Don't introduce `aldente.library.view` localStorage read on the server.** SSR assumes grid; client hydrates post-mount with the 150ms opacity transition (D-10).
- **Don't run the spinner sweep before primitives exist.** The 32-02 plan order is: introduce `<BrandLoader>` → swap call-sites in the same plan. Avoids a half-state where some spinners are gone and some remain.
- **Don't bloat fr.json with marginalia variants the doc never asked for.** D-13 locks the keys; don't add `home.subhead.partial` / `home.subhead.dispute` etc. unless a future requirement demands.
- **Don't edit `docs/design-system.html`.** It's the contract. If you find an actual contradiction (e.g., a typo in §15.A token names), flag it as a planning deviation and ask the user before editing.
- **Sonner loading-icon substitution may need a peek at `@/components/ui/sonner.tsx`** — planner should not assume it's straightforward; the `<Toaster>` config API may force a per-toast `icon` prop pattern.

</code_context>

<specifics>
## Specific Ideas

- The whole §15 of `docs/design-system.html` is unusually prescriptive — token deltas with `--rm`/`--add` lines, exact 5-PR ordering, exact CSS for `.ledger-card` / `.table-scene` / `.loader-brand`. Treat it as a spec, not a guideline. Discussion focused on **scope edges + data-derived behaviors**, because the visual decisions are already locked.
- The "three departures from sober minimalism" (patine, table-à-manger, marginalia) are the load-bearing identity. The mechanical token swap is the 20% of the work; the four primitives (`<LedgerCard>`, `<TableVote>`, `<Marginalia>`, `<BrandLoader>`) and their swept adoption carry the artisanal 80%.
- Phase 31 *just* landed the bottom-nav structural change (variant discriminator, central CTA, 4-slot). Phase 32 inherits that shape and only swaps token values. The visual elevation Phase 31 designed against today's terracotta hue stays correct against the slightly less-saturated sober terracotta — the CTA is still the loudest element.
- The strict spinner sweep (D-14) is the most aggressive cross-cutting change. The ROADMAP success criterion #6 uses the same grep gate verbatim (`grep -rn "animate-spin\|Spinner\|LoadingSpinner" frontend/` returns 0 outside the loader). Plan 32-02 stands or falls on this grep coming back clean.
- §15.E is partially stale documentation. Inbox (`/inbox`) doesn't exist anymore (Phase 27 D-10). Phase 32 doesn't fix that doc drift — `design-system.html` edits are out of scope (D-17). A future grooming pass can update the doc.
- The "de chez maman" provenance marginalia shown in the Recette détail mock is **aspirational**. There's no `source`/`provenance` field on the Recipe model today. Phase 32 doesn't add one; the Recette détail subhead composes from `cook_count` alone (D-13). Adding a provenance field is a future product decision.

</specifics>

<deferred>
## Deferred Ideas

### From discussion
- **Recipe provenance field** (`source` / `from` / `attribution` — "de chez maman", "de l'oncle Marc", "Internet"). The §15 Recette détail mock shows it, but the Recipe model has no such column. Would be a backend schema add + Phase 24-style RID-* requirement + LLM extraction-time capture from the conversation thread. Future phase; needs product framing first.
- **Per-step marginalia from `cooking_logs[].step_notes[]`** — design-system mock shows two step-level annotations ("jusqu'à ce que ça chante", "on a doublé le safran — meilleur"). CookingLog has a single `note` field, not `step_notes[]`. Phase 32 ships single-note-below-step-1 (D-13). Full per-step needs a schema add (likely `step_notes JSONB[]` on `cooking_logs`) + a UI for capturing notes during the cook timer. Future phase.
- **Stale `design-system.html` §15.E "Réception"** — `/inbox` is gone (Phase 27 D-10). Doc edit deferred to a future grooming pass.
- **Bottom-nav icon swaps** (Home → mockup home glyph; BookOpen → Recettes mockup glyph; Settings → Profil user-circle glyph). Carried forward from 31-CONTEXT.md deferred — explicitly out of scope per REQ NAV-01.
- **« Suggérer » tab** (gh#26, 5th nav slot) — backlog. Carried forward from 31-CONTEXT.md deferred.
- **Bibliothèque view preference as a household setting** — Phase 32 ships per-device `localStorage` (D-10). Server-side household preference is a future enhancement (would need a `member_preferences` table or similar).
- **Marginalia *rotation* on Accueil** — same subhead key every render is fine for v0.7; a rotating "voice" set (e.g., random pick from 3 variants when state is `validated`) is a "feels artisanal" enhancement deferred.
- **Animated patine state transitions** — when a recipe's `cook_count` ticks from 2 → 3 (crossing into `Habitudes` patina-2), the visual could animate. Phase 32 ships the static mapping; animation is a polish enhancement.
- **Patine view section reordering / "À l'essai" → "Nouveautés" relabel** — the doc uses `essai` (À l'essai). Considered but locked to doc verbatim. Future grooming if user evidence suggests confusion.

### Already deferred at the milestone level (REQUIREMENTS.md §Out of Scope — REFERENCE only, not new)
- Test-coverage expansion (gh#28) — v0.8 after visual contract locks.
- « Suggérer » tab (gh#26) — backlog.
- Bottom-nav icon swaps (other 3 tabs) — gh#25 carve-out.
- « Smart Paste » capture redesign — competes with v0.6 design lock.
- SW cache tuning for `/api/recipes/*/photo-url` — reserved for cache-strategy phase.
- Refetch-on-`visibilitychange` — reserved for cache-strategy phase.
- §15.E deferred screens — Capture / Réception. D-16 / D-17 handle.
- Edits to `design-system.html` itself — port, not redesign.
- Push notifications for any port surface — orthogonal.

### Reviewed Todos (not folded)
None — `gsd-tools todo match-phase 32` returned 0 matches.

</deferred>

---

*Phase: 32-port-locked-screens-to-sober-kitchen*
*Context gathered: 2026-05-18*
