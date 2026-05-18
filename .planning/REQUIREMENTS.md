# Requirements — v0.7.1 Sober Kitchen Finish

**Milestone:** v0.7.1
**Status:** Active (roadmap approved 2026-05-18)
**Source:** `.planning/quick/260518-kba-ui-walkthrough-punch-list/PUNCH-LIST.md` — 25 findings (10 bugs / 7 polish / 8 design-drift) from a Playwright MCP walk against the seeded test stack.
**Goal:** Close the v0.7 contract per the 260518-kba punch list. Finish what v0.7 started — live-bug residuals, the systemic `useEnumLabels` leak surfaced after v0.5 QW-03 shipped, and the Sober Kitchen §15 locked-screen gaps — before any v0.8 feature work breaks the visual baseline.

---

## Locked Decisions (milestone-level)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Milestone shape | **3 phases (34-36)** mirroring v0.2.1 patch-milestone discipline | Tight scope; finishes contract, defers feature work to v0.8 |
| SOBER-09 ledger mode | **First-paint ledger** (Composition A renders with un-voted card embedded as a special row) | User pick 2026-05-18 — port HomeDecide to the locked spec literally; LIVE-04 marginalia branch becomes structurally consistent |
| B-03 fix layer | **Two-layer fix** — backend serializes structured `Ingredient[]`; frontend SystemBubble formats via `useEnumLabels` + units formatter | User pick 2026-05-18 — closes the serialization boundary; future capture surfaces won't leak |
| LIVE-02 prod verification | **Plan step 0 gates the fix** — verify deployed photo-url handler on a known-missing path before touching code | User pick 2026-05-18 — if prod returns 404 scope shrinks to seed gap + UI fallback; if prod 500s, escalates to backend handler hardening |
| Phase 35 grep gate | Mirror v0.5 Phase 22 D-18 pattern — CI-runnable script asserts no raw locked-vocabulary value in `frontend/{app,components}` user-facing copy | Closes the systemic class, not just three instances |
| POLISH-03 icon harmonization | TBD during Phase 36 discuss-phase | Substantive design call; one-pill-style-for-all needs operator input |
| SOBER-15 Rejeté row policy | TBD during Phase 36 discuss-phase | Either render muted Rejeté or document the hide rule in §15.A — user call |

---

## v0.7.1 Requirements

### Phase 34 — Live-bug sweep

- [x] **LIVE-01** — `/cooking-logs` renders the cooking-log cards returned by `GET /api/cooking-logs`. Three cards visible against the seeded stack (loved Ragu / liked Poulet citron / disliked Burger), grouped by date with Fraunces-italic section headers per v0.2 Phase 8. EmptyState copy on the cooking-log page references cooking logs (not "Aucune recette pour le moment"). Acceptance: navigate to `/cooking-logs` while authenticated as Luca against the seed → 3 cards render. (B-01, P1) ✅ Shipped d73baa1 (Plan 34-02).

- [x] **LIVE-02** — Photo signed-URL handler degrades gracefully on missing storage objects. **Plan step 0:** verify the deployed photo-url handler returns 404 (not 500) on a known-missing path. If prod returns 500, scope expands to backend handler hardening; if 404, scope is local-seed gap + UI graceful-fallback only. Either way, end state: handler returns 404, `useSignedPhotoUrl` `onError` swap renders the empty pictogram fallback without console-500 noise. Acceptance: local seed walk shows zero 500 console errors on Accueil / Bibliothèque / Recette détail; prod audit recorded in phase HUMAN-UAT. (B-02, P1) ✅ Shipped cd43b3b (Plan 34-01). Probe result documented at `.planning/phases/34-live-bug-sweep/34-01-prod-photo-url-probe.md` — backend hardening was in scope; `StorageObjectNotFound` typed exception introduced in `storage.py`, handler in `photos.py` catches it → 404 + warn log.

- [x] **LIVE-03** — Settings "Foyer" section renders both Luca and partner blocks. Partner block shows member dot color, name, and last-active hint per Phase 9 onboarding-identity spec. Settings page fetches `household.members[]` (not just `me`); `grep -rn "household.members" frontend/app/settings/` returns the fetch path. Acceptance: `/settings` while authenticated as Luca shows two member blocks (Toi · Luca + Partenaire · {name}). (B-07, P2) ✅ Shipped a53fb28 (Plan 34-03). Extended `useSession().session.members` (existing context — no new hook per CONTEXT decision); added `settings.partner_label` i18n key.

- [x] **LIVE-04** — Pre-vote Accueil marginalia copy branches on `validéCount === 0` so "déjà une idée validée" never appears when no Validé row is visible. **Structurally resolved if SOBER-09 lands first** — the first-paint ledger makes the marginalia naturally consistent with what the screen shows. If Phase 34 ships before Phase 36, ship the branching guard; if Phase 36 ships first, this requirement is closed by SOBER-09 and the verification step asserts the consistency held. Acceptance: fresh-seed Accueil load with no Validé row shows neither "déjà une idée validée" nor any marginalia contradiction. (B-09, P2) ✅ Shipped b48cbd8 (Plan 34-04). `HomeDecide.subheadKey` derives from explicit `validéCount = allRowStates.filter(s => s === "valide").length` and guards "déjà une idée validée" on `validéCount > 0`. Invariant #2 honored (computed from existing vote-state map, never stored).

- [x] **LIVE-05** — `frontend/package.json` `version` field bumped from `0.1.0` to the current milestone (`0.7.1` at milestone open, bumped per phase as semver moves). `VersionFooter` renders the live value via `npm_package_version`. Acceptance: `/settings` footer shows `v0.7.x · {sha} · {env}`. (B-08, P3) ✅ Shipped 2afa5dd (Plan 34-05).

- [x] **LIVE-06** — Accueil DOM contains exactly one `<main>` landmark element. Either `app/layout.tsx` or `app/page.tsx` is rewrapped (not both); screen readers report a single main landmark per WCAG 1.3.1. Acceptance: Playwright snapshot at `/` shows one `main` element in the accessibility tree (not nested). (B-10, P3) ✅ Shipped 2afa5dd (Plan 34-05). Inner `<main>` was at `frontend/app/page.tsx:42` — now a `<div>` with identical classes; layout.tsx:75 is the sole landmark owner.

### Phase 35 — Enum + extraction-leak sweep

- [ ] **ENUM-01** — `SystemBubble.tsx` summary branch renders each extracted field correctly. Two-layer fix:
  - **Backend:** ingredient serialization emits structured `list[Ingredient]` via the existing Pydantic schema, not Python `str(dict)`. Capture a fresh URL recipe end-to-end; assert the advisory bubble payload contains no `{'name':` substring.
  - **Frontend:** each field threads through `useEnumLabels` for enum-typed fields (cuisine, mood, protein, difficulty, season) and via a units formatter for time/quantity fields (prep_time_minutes, cook_time_minutes, servings). Ingredients render as "300 g riz arborio" lines.
  Acceptance: capture marmiton.org/recettes/recette_pates-a-la-carbonara_19115 end-to-end; the « Voilà ce que j'ai compris » bubble shows "Italienne / Réconfortante / Moyen / 35 min" not `italian / comfort / medium / 35`; ingredients render as clean lines not Python `dict` reprs. (B-03, P1 — biggest issue per the punch-list summary)

- [ ] **ENUM-02** — `RecipeCard.tsx` (Bibliothèque grid) renders cuisine/mood/protein via `useEnumLabels`. Subhead reads "Italienne · avant-hier", "Indienne · Jamais cuisinée", etc. — never raw enum keys. Acceptance: walk `/recipes` Grille view across all 21 seeded cards; zero raw-key sightings. (B-04, P1)

- [ ] **ENUM-03** — Post-vote Accueil ledger meta rows render cuisine via `useEnumLabels`. "Française · 120 min" / "Indienne · 50 min" / "Mexicaine · 25 min" — never raw keys. Acceptance: vote on the un-voted card, transition to ledger view, walk the 4-5 rows; zero raw-key sightings. (B-05, P1)

- [ ] **ENUM-04** — Repo-wide grep gate asserts no raw locked-vocabulary value reaches user-facing copy. CI-runnable script (mirrors v0.5 Phase 22 D-18 discipline): grep `frontend/{app,components}` for the union of all locked enum values (`italian|indian|mexican|french|asian|mediterranean|middleEastern|northAfrican|american|comfort|festive|fresh|easy|medium|hard|beef|chicken|fish|pork|none|spring|summer|autumn|winter`) in template literals or visible-text positions, excluding `lib/enums.ts`, `lib/enum-labels.ts`, and `tests/`. Gate must pass on the phase tip. Acceptance: `bash scripts/check-enum-leak.sh` exits 0. (no GitHub issue — gate of last resort against re-leak)

### Phase 36 — Sober Kitchen finish + polish

- [ ] **SOBER-09** — Accueil renders the locked Composition A ledger from first paint (decision locked 2026-05-18 — first-paint mode chosen over dual-mode-with-doc-update). The ledger shows every shortlist row from first render (Validé / Pressenti / Contesté / Rejeté¹ / Sans avis); the un-voted card embeds as a special row with the swipe-deck / table-vote affordance inline. The Validé row is visible immediately if the shortlist has one. Acceptance: fresh-seed Accueil load shows the ledger from first paint with Ragu bolognese as Validé visible AND the un-voted Tacos card embedded as a row — not the swipe-deck-then-ledger toggle. (D-03, locked spec miss)
  ¹ Rejeté row policy resolved via SOBER-15.

- [ ] **SOBER-10** — BottomNav central « Ajouter » CTA visibly elevated above siblings per `.scratch/capture-mockups/1-smart-paste.html` and the Phase 31 NAV-01 spec. `translateY(-12px)` (or equivalent) on the inner `<span>` + soft drop shadow on the pill. Phase 31 commit `62b4e96` shipped the pill; this requirement adds the lift the spec called for. Acceptance: side-by-side visual pass on a real iPhone — the central CTA reads as "elevated CTA above the row" not "third tab with terracotta pill". (D-01, locked spec miss)

- [ ] **SOBER-11** — Bibliothèque "Patine" view renders the three section headers ("Héritage" / "Habitudes" / "À l'essai") with `(n)` counts. Empty-bucket fallback: section headers + `(0)` counts render even for empty buckets so a single-distribution dataset doesn't collapse to a blank container. Combined with SOBER-14's seed bump, the dev seed exercises non-trivial buckets observably. Acceptance: `/recipes` → click Patine view → three section headers visible with counts; at least one recipe lives in "Héritage" given the bumped seed. (B-06 + D-08)

- [ ] **SOBER-12** — Recette détail body matches `docs/design-system.html` §15.C cookbook-page-A gestures: terracotta-30 left margin-rule on the ingredient list; backdrop-blur title strip when a photo is present; Fraunces-italic numbered steps; Caveat-slant marginalia gutter for step asides (e.g. `cooking_log.notes` rendered as handwritten paper-margin notes against the printed step, not as plain captions). Acceptance: walk a recipe with both a photo and a cooking-log note; the four gestures are visibly present. (D-05 + P-05)

- [ ] **SOBER-13** — Table-à-manger seat geometry verified on a real iPhone and any missing pieces shipped. Locked spec: each shortlist row has a `.table-scene` with `.table-plate` + two `.table-seat` (north/south) with state classes (`seat-state-valide` halo emerald, `seat-state-pressenti`, `seat-state-contested`, `seat-state-neutral`). Acceptance: DOM inspector on a vote row shows `table-plate` + state-classed seats; the rendering reads as "two seats at a table" not "two avatars in a card". (D-06)

- [ ] **SOBER-14** — Dogear corner-fold (`.dogear` SVG) renders on highly-patined recipes per `docs/design-system.html` §15.B View A. Threshold tuned (probably `patina >= 2`); seed bumps at least one recipe's `cook_count` to `10+` so the dogear is observable against the dev seed. Acceptance: `/recipes` Grille view shows the dogear corner-fold on the bumped recipe; zero dogears on cook_count-0 recipes. (D-07)

- [ ] **SOBER-15** — Post-vote Accueil ledger Rejeté row policy resolved during discuss-phase. Either (a) render the Rejeté row in a muted state alongside the other four, or (b) document the hide-Rejeté rule in `docs/design-system.html` §15.A. The implementation lands consistent with the documented rule. Acceptance: with the seed's Shawarma in Rejeté state, the post-vote ledger either shows it muted (option a) or §15.A's mockup is annotated with the hide rule (option b). (D-04)

- [ ] **SOBER-16** — `docs/design-system.html` §15 mockup updated to reflect the post-Phase-27 4-tab + central CTA BottomNav layout — "Réception" tab removed from §15.A's Accueil mockup, central CTA added. The design system as documented re-aligns with the design system as built. Acceptance: `docs/design-system.html` §15 search for "Réception" returns zero matches (other than historical context blocks); the BottomNav rendering in §15.A matches `frontend/components/BottomNav.tsx`. (D-02, doc-only)

- [ ] **POLISH-01** — French typography fixed: `Ingrédients · 6 personnes` (and all visible `·` separators) uses NBSP both sides via the established `meta-sep` pattern. Sweep-applied across the codebase. Acceptance: `grep -rn '·' frontend/{app,components} | grep -v meta-sep` returns zero results (or only flagged exceptions). (P-01)

- [ ] **POLISH-02** — Push permission banner positioned below the shortlist hero (or behind a Réglages CTA). Accueil's first paint shows the locked H1 "On mange quoi ce soir ?" + marginalia register, not the notification opt-in. Acceptance: fresh-seed Accueil load with `Notification.permission === 'default'` shows the H1 + marginalia first; the push banner appears further down (or as a Réglages CTA). (P-02)

- [ ] **POLISH-03** — Recette détail meta-pill row icons harmonized. Decision during discuss-phase: either all text pills (drop the Clock icon on `min`) or all leading-icon pills (add icons to cuisine / mood / difficulty). Acceptance: the meta-row is visually homogeneous — one rule applied consistently. (P-04)

- [ ] **POLISH-04** — Post-vote ledger CTA truncates gracefully on narrow phones. "Cuisiner ce soir" copy in the button + recipe title rendered as marginalia underneath (or `…` truncation after ~22 chars). Acceptance: at 320px viewport, the button does not wrap or clip; recipe title still legible underneath. (P-07)

---

## Out of Scope (v0.7.1)

<!-- Explicit cuts. Reasons attached. Routes to backlog or v0.8. -->

- **P-03 — Bibliothèque sort/filter chips for Season / Cuisine / Mood / Protein.** Feature work, not polish. Locked vocabularies make this a natural v0.8 feature; routes to v0.8 backlog. The 21-recipe seed is small enough that absence is not blocking daily use.
- **P-06 — Dual voting affordances (swipe-deck thumbs vs table-à-manger seats coexisting).** Product design call — needs `/grill-with-docs` against the locked design system before route. Routes to backlog with `needs-design` label.
- **gh#28 test coverage expansion.** Already deferred to v0.8 at v0.7 close. The visual contract is still moving in v0.7.1; running tests against it now would re-baseline twice. Stays in v0.8.
- **SW cache tuning + refetch-on-`visibilitychange`.** v0.7 deferred these to "Phase 4 owns cache strategy tuning"; v0.7.1 stays consistent with that carve-out.
- **MediaRecorder + photo-upload Playwright coverage.** The 260518-kba walkthrough flagged the test-tooling gap; addressing it lands in v0.8 with the gh#28 test-coverage milestone (the `uat-tester` agent spec the punch list proposes).
- **`docs/design-system.html` §15.E deferred screens.** The doc itself flags these as out-of-scope for porting.
- **HUMAN-UAT carry-forward from v0.7 (Phase 30 + Phase 32) and prior milestones.** Tracked via `/gsd-audit-uat`. Orthogonal to v0.7.1 scope — physical-device validation runs independently.
- **Push notifications for any of the above.** Orthogonal; v0.7.1 stays on the existing realtime WebSocket spine (invariant #4).

---

## Traceability

_Filled by direct-scaffold 2026-05-18. Each REQ-ID maps to exactly one phase._

| REQ-ID | Phase | Plan(s) |
|--------|-------|---------|
| LIVE-01 | Phase 34 | 34-02 ✅ (d73baa1) |
| LIVE-02 | Phase 34 | TBD (plan-phase) |
| LIVE-03 | Phase 34 | TBD (plan-phase) |
| LIVE-04 | Phase 34 | TBD (plan-phase) |
| LIVE-05 | Phase 34 | TBD (plan-phase) |
| LIVE-06 | Phase 34 | TBD (plan-phase) |
| ENUM-01 | Phase 35 | TBD (plan-phase) |
| ENUM-02 | Phase 35 | TBD (plan-phase) |
| ENUM-03 | Phase 35 | TBD (plan-phase) |
| ENUM-04 | Phase 35 | TBD (plan-phase) |
| SOBER-09 | Phase 36 | TBD (plan-phase) |
| SOBER-10 | Phase 36 | TBD (plan-phase) |
| SOBER-11 | Phase 36 | TBD (plan-phase) |
| SOBER-12 | Phase 36 | TBD (plan-phase) |
| SOBER-13 | Phase 36 | TBD (plan-phase) |
| SOBER-14 | Phase 36 | TBD (plan-phase) |
| SOBER-15 | Phase 36 | TBD (plan-phase) |
| SOBER-16 | Phase 36 | TBD (plan-phase) |
| POLISH-01 | Phase 36 | TBD (plan-phase) |
| POLISH-02 | Phase 36 | TBD (plan-phase) |
| POLISH-03 | Phase 36 | TBD (plan-phase) |
| POLISH-04 | Phase 36 | TBD (plan-phase) |

**Coverage:** 22/22 v0.7.1 requirements mapped. No orphans. Source punch-list findings × 25; in-scope × 22; deferred × 3 (P-03, P-06, push notifications).

---

*Last updated: 2026-05-18 — v0.7.1 REQUIREMENTS.md scaffolded directly from `.planning/quick/260518-kba-ui-walkthrough-punch-list/PUNCH-LIST.md` per Route B (no orchestrator). 3 milestone-level locked decisions captured at scaffold time (SOBER-09 first-paint, B-03 two-layer, LIVE-02 prod-verify-first). Plans written by `/gsd-plan-phase`.*
