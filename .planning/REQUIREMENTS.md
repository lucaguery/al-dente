# Requirements: Al Dente v0.5 — Mixed Sweep

**Defined:** 2026-05-12
**Core Value:** Eliminate the daily "on mange quoi ?" debate via a shared library, async voting, and voice/photo capture — installable PWA on both iPhones with no App Store, no $99/year, no native build.
**Milestone Goal:** Close ~10 open GitHub issues across three coherent themes — quick wins, swipe-deck polish, and recipe identity — in a single tight sweep that pays down post-audit backlog without expanding scope.
**Inputs:** `.planning/notes/v0.5-shape-mixed-sweep.md` (`/gsd-explore` output 2026-05-12) · GitHub Issues #10, #11, #12, #13, #14, #15, #16, #17, #18, #21, #22

**Locked milestone decisions** (anchored in PROJECT.md `Current Milestone: v0.5`):

- **#10 silent overwrite** — LLM title rewrite replaces user input in place via `BackgroundTask`; title remains editable on detail page.
- **#10 failure mode** — on `rewrite_title()` failure, keep user title and set `promotion_error` for retry (mirrors v0.4 Phase 16 failed-state handling; invariant #5 preserved).
- **#17 icon direction** — filled Heart / outline Heart; emerald (`--color-valide-foreground`) for filled, neutral for outline. Existing labels (`J'aime cette recette` / `Pas envie ce soir`) kept.
- **Invariant #1 shift** — quick/full-form move from sync `structured`-on-return to async `BackgroundTask` rewrite when Phase 24 ships #10. `CLAUDE.md` invariant #1 updates in the same plan.
- **Out of scope** — #20 (unified capture) defers to v0.6; #19 (Accueil spinner flash) already shipped via `fast-19` (commit `7a1f39c`, gh#19 closed).

---

## v0.5 Requirements

12 requirements across 3 categories. Each maps to one roadmap phase (populated during roadmap creation). Source citations in parentheses anchor each REQ to its GitHub issue.

### QW — Quick wins (mechanical, low-coupling)

- [ ] **QW-01**: Geist Mono font is no longer loaded — `Geist_Mono` import + `--font-mono` declaration removed; the single call site (invite-code display in `frontend/app/onboarding/join/page.tsx:276`) renders via the system monospace stack or `tabular-nums` body font with letter-spacing intact; `grep -rn "font-mono\|--font-mono" frontend/` returns zero matches. One fewer font request on every page load. (gh#13)
- [ ] **QW-02**: User sees the deployed app version at the bottom of Settings — a `VersionFooter` component renders `v{NEXT_PUBLIC_APP_VERSION} · {NEXT_PUBLIC_GIT_SHA} · {NEXT_PUBLIC_VERCEL_ENV}` so the running build is identifiable per device. Build-time `next.config.ts` exposes `npm_package_version`, `VERCEL_GIT_COMMIT_SHA` (sliced to 7 chars), and `VERCEL_ENV`. (gh#15)
- [ ] **QW-03**: Recipe tags (cuisine, mood, protein) display French labels on the suggest deck card, recipe detail page, and inbox — call sites at `ShortlistCard.tsx:307-310` and `app/recipes/[id]/page.tsx:256,259-261,264` route through the existing `useEnumLabels()` hook (no new infrastructure; locked-vocabulary invariant unchanged). (gh#21)

### DECK — Swipe deck polish (shares `swipe-tokens.ts`; sequenced internally)

- [ ] **DECK-01**: OUI/NON text overlays on the suggest card are replaced by a subtle drag-distance-driven border-ring fade-in (emerald-tinted ring for yes, destructive-tinted ring for no) — `ring-2 ring-inset ring-[var(--color-valide-foreground)]` for "yes" direction, `ring-2 ring-inset ring-destructive` for "no" direction, opacity bound to the existing `yesOpacity`/`noOpacity` `useTransform` hooks (linear 0..1 across 0..`SWIPE_OVERLAY_INPUT_PX = 80px`); `prefers-reduced-motion` path unchanged; `ShortlistCard.tsx:277-296` overlay block deleted. Phase 23 deviates from the original "full-card background tint" wording (D-01); `--color-valide-tint` is NOT used. (gh#14)
- [ ] **DECK-02**: Swipe gesture commits only on a deliberate motion — `SWIPE_THRESHOLD_PX` raised 100 → 140, `SWIPE_VELOCITY_PX_S` raised 500 → 750, `SWIPE_OVERLAY_INPUT_PX` matched to the new threshold; snap-back spring replaced with `MOTION.springSnap` (stiffness 240, damping 28, mass 1.1) for a slightly-overshooting "lively" feel; fly-off duration raised 0.2s → 0.28s. Casual 50px drift snaps back; 150px deliberate drag commits cleanly; flick gate still works. Manual `prefers-reduced-motion` device pass at phase close. (gh#18)
- [ ] **DECK-03**: Like/dislike thumb buttons on the swipe deck use filled Heart (yes) and outline Heart (no) — `ShortlistCard.tsx:355-376` `ShortlistThumbButtons` swaps `<X />` for outline `<Heart />`; emerald `--color-valide-foreground` for filled, neutral foreground for outline; existing aria-labels and the `submittingFor` disabled-state pattern kept verbatim; vote state machine untouched (architecture invariant #2 holds). (gh#17)
- [ ] **DECK-04**: User taps a suggest card to open `/recipes/[id]` detail and the browser back button returns to the deck with the same card on top — tap-vs-swipe disambiguation via a `panRef` set in `onPanStart` / cleared in `onPanEnd` and consulted in `onTap`; thumb-button taps still call `onVote` without navigating; deck position survives the round-trip via the existing local-state pattern (or URL state if needed). Verified on iOS Safari PWA. (gh#16)

### RID — Recipe identity (serial; shares `services/llm.py` / `_apply_extracted`)

- [ ] **RID-01**: BrandIcon component exists at `frontend/components/BrandIcon.tsx` and ships on the onboarding welcome screen + the shortlist/inbox/recipes empty states — single SVG source extracted from the existing `app/icon.tsx` pasta-strand markup (viewBox `0 0 160 160`, two paths, `currentColor` stroke). Unblocks RID-05 fallback. (gh#11)
- [ ] **RID-02**: Recipes acquire three new optional fields — `cook_time_minutes INTEGER`, `difficulty TEXT` (CHECK constraint: `easy` / `medium` / `hard`), `description TEXT` — via Alembic migration; `Difficulty` enum locked in both `backend/app/models/enums.py` and `frontend/lib/enums.ts` (locked-vocabulary invariant); Pydantic schemas + `RecipeForm.tsx` inputs + `/recipes/[id]` metadata block all expose the new fields; voice/photo extraction prompts ask Gemini for the new fields and `_apply_extracted` writes them. No regression on existing capture surfaces. (gh#22 Part A)
- [ ] **RID-03**: User sees a completeness scorecard on `/recipes/[id]` for incomplete recipes — new `CompletenessCard` component renders above the body when `computeCompleteness(recipe).percent < 100`, showing the percent, a progress bar, and chip-links to the edit page (each chip carries a `?focus=<field.key>` param the edit page consumes to scroll/focus the matching input). 11 fields, equal weight (per gh#22 default). Hidden entirely at 100% — no nagging. (gh#22 Part B)
- [ ] **RID-04**: Every recipe acquires an LLM-rewritten "catchy" French title regardless of capture surface — new `services/llm.rewrite_title()` helper using the prompt from gh#10; quick + full-form move to async `BackgroundTask` shape (`status='draft'` → rewrite → `status='structured'` + `recipe.promoted` broadcast); voice/photo prompts inherit the same phrasing in their existing single Gemini call (no extra round-trip). On rewrite failure: user title preserved + `promotion_error` set (retry-endpoint compatible). `source_capture` JSONB preserves the original user title (invariant #5). `CLAUDE.md` invariant #1 wording updates in the same plan. (gh#10)
- [ ] **RID-05**: Recipe list rows (inbox + recipes) render a small per-recipe LLM-generated SVG illustration as a ~40×40 leading slot — new `recipes.illustration_svg TEXT` column (Alembic migration); new `services/llm.generate_recipe_illustration()` helper called from the BackgroundTask promotion pipeline alongside title rewrite; server-side SVG sanitizer (allowlist `<svg>` + `<path>` only; reject `<script>`, `<foreignObject>`, `<text>`, `<image>`, `<use>`, `<a>`, `<style>`, `on*=` attrs, `style=` attrs) with unit tests; fallback to `BrandIcon` (RID-01) when missing or failed. Static SVG only — no animation in v1. Detail / shortlist placements deferred to a future ticket. (gh#12)

---

## Future Requirements

Deferred from v0.5 by explicit decision; revisited in v0.6 or later.

- **gh#20 — Unified capture surface** — Needs its own `/gsd-explore` UX cycle. Currently `needs-info`. Re-scoped during v0.6 milestone discussion.

---

## Out of Scope

<!-- Explicit cuts. Reasons attached to prevent re-adding. -->

- **gh#19 (Accueil spinner flash)** — Already shipped out-of-band via `/gsd-fast` (`fast-19`, commit `7a1f39c`, 2026-05-12). gh#19 closed before v0.5 opened. Mentioned here for completeness only.
- **#10 url-surface title rewrite** — URL extraction remains `# TODO(productize)` at `recipes.py:481-490` (URL-01 backlog). gh#10 explicitly cuts the url surface from its scope.
- **#12 regenerate-on-demand UI** — "Re-roll this illustration" is a nice-to-have explicitly deferred in gh#12.
- **#12 detail / shortlist illustration placements** — gh#12 ships the inbox + recipes list placements only; detail/shortlist placements are separate tickets if wanted.
- **#12 SVG animation** — Static SVG only for v1.
- **#17 "love" tier above "yes"** — Would touch voting invariant #2. Explicitly out per gh#17 triage.
- **#22 score weighting** — Equal weight across the 11 completeness fields; weighted scoring deferred until usage data exists.
- **#22 inbox-row completeness ring** — Deferred to v2.
- **#22 backfill migration** — Existing recipes will show low scores after RID-02 ships — that's the intended nudge per gh#22.

---

## Traceability

Filled by roadmapper during phase mapping. Each phase below must list its REQ-IDs and each REQ-ID must appear in exactly one phase.

- **Phase 22 — Quick wins** — Maps: QW-01, QW-02, QW-03
- **Phase 23 — Deck polish** — Maps: DECK-01, DECK-02, DECK-03, DECK-04
- **Phase 24 — Recipe identity** — Maps: RID-01, RID-02, RID-03, RID-04, RID-05

**Coverage:** 12 of 12 requirements mapped (100%). No orphans.

---

*Last updated: 2026-05-12 — v0.5 milestone opened. 12 requirements / 3 categories / 3 phases / sourced from 11 GitHub issues. Phase 24 serial order is load-bearing — RID-01 (BrandIcon) → RID-02 (data model) → RID-03 (scorecard UI) → RID-04 (title rewrite; invariant #1 shift) → RID-05 (SVG illustration; depends on BrandIcon fallback + new pipeline shape).*
