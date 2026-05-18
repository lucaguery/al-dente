# Roadmap: Al Dente

## Completed Milestones

- **v0.1** ✅ (2026-05-05 → 2026-05-08) — Full PWA shipped: infra, onboarding, recipe library, LLM capture, daily shortlist, voting, cooking-log finalization, Web Push, realtime sync. 5 phases, 31 plans, 49 requirements. → [Archive](.planning/milestones/v0.1-ROADMAP.md)
- **v0.2** ✅ (2026-05-08) — Polish: Slow Food artisanal identity. Re-themed every surface (capture / decide / cook / onboarding) onto the Phase 5 design system (terracotta + warm-cream + Fraunces italic + paper-grain). Closed 5 W4 UI-REVIEW gaps inline (CAPTURE-11, DECIDE-05, COOK-07/08/11/12) plus the Phase 5 themeColor deferral. NEW PWA identity via Next.js 16 `app/icon.tsx`. UI audit average 22.4/24 across 5 phases (best 23/24). 5 phases, 26 plans, 31 requirements. → [Archive](.planning/milestones/v0.2-ROADMAP.md)
- **v0.2.1** ✅ (2026-05-08 → 2026-05-09) — E2E test infrastructure: one-command synthetic seed (`uv run seed` — 1 household + 2 members + 21 recipes + 3 cooking logs + 7 votes covering all 5 computed states, idempotent via uuid5+merge) + committed Playwright suite (14 specs across `seeded` and `fresh` projects, iPhone-shape Chromium viewport with `toBeInViewport()` on critical surfaces) + 4-command bootstrap runbook (`TESTING.md`). 1 phase, 7 plans, 4 requirements. → [Archive](.planning/milestones/v0.2.1-ROADMAP.md)
- **v0.3** ✅ (2026-05-09 → 2026-05-11) — Audit & Uniqueness Foundation. Audit-only milestone — zero new product features, zero product-code drift. 4 milestone-level artifacts in `.planning/v0.3/`: `RUNBOOK.md` (prod synthetic ops at `https://al-dente-pink.vercel.app`, code `DEMO01`), `WALKTHROUGH.md` (1,276 lines, ~64 severity-tagged findings across 14 surfaces, 8 GitHub issues filed #1-#8), `UI-AUDIT.md` (14 surface scores, mean 20.21/24, 5✅/9⚠/0❌), `ASSESSMENT.md` (510 lines, 27 ranked findings across 3 tiers ordered by impact on "feels Al Dente", anti-prescription gate enforced structurally via `check-assessment.sh`). 4 phases, 16 plans, 16 requirements. → [Archive](.planning/milestones/v0.3-ROADMAP.md)
- **v0.4** ✅ (2026-05-11) — Audit Remediation & Identity Polish. Closed both v0.3 Tier 1 invariant breaks (B-3 MEMBER_COUNT + B-4 cook_count idempotency), 4 Tier 2 correctness clusters (capture pipeline, history feature, identity management, validation surfaces), the C-1 token-completeness gap (15 new semantic CSS variables + emerald/member-color migration on 7 audit-cited surfaces), and the v0.2.2 backlog (TZ-01, SEED-01, POLISH-01/02). 6 surfaces flipped ⚠ Mixed → ✅ Feels Al Dente under the SAME 6-pillar rubric; cumulative mean 20.21/24 → 21.71/24 (+1.50). 7 phases, 27 plans, 24 requirements. → [Archive](.planning/milestones/v0.4-ROADMAP.md)
- **v0.5** ✅ (2026-05-12 → 2026-05-13) — Mixed Sweep. Closed 12 GitHub issues (#10/#11/#12/#13/#14/#15/#16/#17/#18/#21/#22 A+B) across three coherent themes — quick wins, swipe-deck polish, and recipe identity. **Invariant #1 has shifted** — quick + full-form captures moved from sync `structured`-on-return to async `BackgroundTask` (CLAUDE.md updated in same commit as `rewrite_title()`). Shipped LLM "catchy" titles across all capture surfaces, `BrandIcon` brand mark + empty-state mounts, 11-field `CompletenessCard` nudge with `?focus=` edit-page navigation, per-recipe SVG illustration pipeline with stdlib `xml.etree.ElementTree` allowlist sanitizer (28 unit tests, reject-and-fallback), ring-stroke drag overlays replacing OUI/NON, swipe threshold + spring retune, filled/outline Heart thumb buttons, tap-to-detail, Geist Mono drop, `VersionFooter` build stamp, French `useEnumLabels()` sweep on shortlist + recipe detail. 3 phases, 9 plans, 12 requirements. → [Archive](.planning/milestones/v0.5-ROADMAP.md)
- **v0.6** ✅ (2026-05-13 → 2026-05-17) — Conversation Capture. Replaced the five tabbed capture surfaces (`quick` / full-form / `voice` / `photo` / `url`) with one durable conversation thread per recipe — `recipe_turns` table added + legacy `source_capture` JSONB dropped in the same Alembic migration (0009); `promote_draft(recipe_id)` consolidates four per-surface promotion functions into one entry point dispatching on first turn's `kind`. Shared `RecipeThread` component mounted on both `/recipes/new` (capture) and `/recipes/[id]` (detail) — CAPTURE-04 one-component-two-mount-points contract honored. Gemini rebuilt around full-thread reads with extraction-hash idempotency; emits `advisory` turns on conflict (option C — manual edit wins) and `question` turns driven by `recipe-completeness.ts`. URL extraction unstubbed behind real SSRF gate. `manually_edited_fields` is on the wire and visible as Caveat marginalia. **Invariant #1 evolved** (all five capture surfaces converge through `promote_draft`); **invariant #5 satisfied by `recipe_turns`** going forward (`source_capture` retired). 5 phases, 22 plans, 23 requirements. → [Archive](.planning/milestones/v0.6-ROADMAP.md)
- **v0.7** ✅ (2026-05-17 → 2026-05-18) — Sober Kitchen + Polish. Cleared the live-bug backlog (BUG-01 photo signed-URL self-heal via `useSignedPhotoUrl` hook + TTL bump; BUG-02 SVG sanitizer `ns0:` namespace fix + Alembic 0012 data migration), shipped the central elevated « Ajouter » CTA in `BottomNav.tsx` with a `variant: "tab" | "central-cta"` discriminator (NAV-01), and ported the three locked screens — Accueil, Bibliothèque, Recette détail — to the Sober Kitchen design system per `docs/design-system.html` §15.A→E. Four React primitives shipped (`Marginalia`, `BrandLoader`, `LedgerCard`, `TableVote`); `globals.css` rebuilt around the Sober OKLCH palette + Caveat marginalia register + brand-mark loader (SOBER-08 grep gate: zero `animate-spin` outside `BrandLoader.tsx`). Root `CLAUDE.md` split into scoped files — backend/frontend/.planning each carry their own rules, `frontend/AGENTS.md` deleted per the D-12 override, root pruned from 114 → 34 lines of guidance (DX-01). 4 phases, 9 plans, 12 requirements. → [Archive](.planning/milestones/v0.7-ROADMAP.md)

## Current Milestone

### v0.7.1 Sober Kitchen Finish (in progress — started 2026-05-18)

**Milestone Goal:** Close the v0.7 contract per the 260518-kba Playwright walkthrough punch list (25 findings: 10 bugs / 7 polish / 8 design-drift). Finish what v0.7 started — live-bug residuals, the systemic `useEnumLabels` leak surfaced after v0.5 QW-03 shipped, and the Sober Kitchen §15 locked-screen gaps — before any v0.8 feature work breaks the visual baseline.

**Source:** `.planning/quick/260518-kba-ui-walkthrough-punch-list/PUNCH-LIST.md` — 25 findings (0 P0 / 5 P1 / 5 P2 / 5 P3 / 7 polish / 8 design-drift). Discovery is complete; this milestone is execution.

**Patch-milestone precedent:** Mirrors v0.2.1's tight shape (3-4 phases, single coherent theme, closes a known contract gap rather than discovers new scope).

## Phases

- [x] **Phase 34: Live-bug sweep** — All 6 LIVE-* requirements shipped: LIVE-01 `/cooking-logs` renders 3 seed cards (root cause: `Promise.all` rejection on `?limit=500` 422 from `/api/recipes`); LIVE-02 backend `StorageObjectNotFound` typed exception → 404 + warn log; LIVE-03 Settings extends `useSession().session.members` to render Partner block; LIVE-04 marginalia branch guards on `validéCount > 0`; LIVE-05 version 0.1.0 → 0.7.1; LIVE-06 inner `<main>` stripped from `app/page.tsx:42`. (5 plans, 5 commits).
- [ ] **Phase 35: Enum + extraction-leak sweep** — One systemic class with one fix per locked vocabulary. `SystemBubble.tsx` summary branch threads each field through `useEnumLabels` and a units formatter; backend serializes ingredients as structured `Ingredient[]` not `str(dict)` (B-03 two-layer fix). `RecipeCard.tsx` (Bibliothèque grid) and post-vote Accueil ledger meta rows consume `useEnumLabels` (B-04, B-05). Repo-wide grep gate ensures no raw locked-vocabulary value reaches user-facing copy.
- [ ] **Phase 36: Sober Kitchen finish + polish** — Closes the §15 locked-screen contract gaps and the polish backlog. Accueil Composition A renders the ledger from first paint with the un-voted card embedded as a special row (SOBER-09); BottomNav central CTA visibly elevated per `.scratch/capture-mockups/1-smart-paste.html` (SOBER-10); Bibliothèque "Patine" view renders sections with empty-bucket fallback (SOBER-11); Recette detail cookbook gestures verified live and missing pieces shipped (SOBER-12); table-à-manger seat geometry verified on iPhone (SOBER-13); dogear renders on highly-patined recipes + seed bumped (SOBER-14); post-vote ledger Rejeté row policy resolved (SOBER-15); `docs/design-system.html` §15 updated to drop "Réception" tab (SOBER-16); plus 4 polish requirements (NBSP middle-dot, push banner placement, meta-pill icon harmonization, long-CTA truncation).

## Phase Details

### Phase 34: Live-bug sweep
**Goal**: High-severity broken behavior surfaced by the 260518-kba walkthrough is silently fixed — `/cooking-logs` renders, photo handler degrades gracefully on missing storage, Settings shows both members, version footer is honest, and the pre-vote Accueil marginalia doesn't contradict the screen below it.
**Depends on**: Nothing (orthogonal fixes; first v0.7.1 phase).
**Requirements**: LIVE-01, LIVE-02, LIVE-03, LIVE-04, LIVE-05, LIVE-06
**Success Criteria** (what must be TRUE):
  1. `/cooking-logs` renders three cooking-log cards from the seed when the API returns three entries; the empty-state copy on the cooking-log page references cooking logs (not "Aucune recette") (B-01).
  2. **Plan step 0:** verify prod's photo-url handler behavior on a known-missing path — if prod returns 404, scope shrinks to local-seed gap + UI graceful-fallback; if prod returns 500, escalates to backend handler hardening. Local seed: handler returns 404 (not 500), `useSignedPhotoUrl` `onError` swap renders the empty pictogram fallback (B-02).
  3. Settings "Foyer" section renders both Luca and the partner block (member dot, name, last-active hint per Phase 9 onboarding-identity spec); `grep -rn "household.members" frontend/app/settings/` confirms the fetch path (B-07).
  4. Pre-vote Accueil marginalia copy branches on `validéCount === 0` so "déjà une idée validée" never renders when no Validé row is visible. **Note:** Phase 36 SOBER-09 ships the ledger-from-first-paint that makes this naturally consistent — if SOBER-09 lands first, LIVE-04 is structurally resolved (B-09).
  5. `frontend/package.json` version bumped to current milestone; VersionFooter reads `npm_package_version` and renders `v0.7.x · {sha} · {env}` (B-08).
  6. Accueil DOM has exactly one `<main>` landmark element; either `app/layout.tsx` or `app/page.tsx` is rewrapped (B-10).
**Plans**: TBD (plan-phase)

### Phase 35: Enum + extraction-leak sweep
**Goal**: No raw locked-vocabulary value (`italian`, `medium`, `comfort`, …) reaches user-facing copy anywhere; no Python `dict` repr leaks into the chat thread. One systemic class closed with one grep gate.
**Depends on**: Nothing (orthogonal to Phase 34 fixes; can run in parallel).
**Requirements**: ENUM-01, ENUM-02, ENUM-03, ENUM-04
**Success Criteria** (what must be TRUE):
  1. `SystemBubble.tsx` summary branch renders each extracted field via `useEnumLabels` for enum-typed fields (cuisine, mood, protein, difficulty, season) and via a units formatter for time/quantity fields. Ingredients render as "300 g riz arborio" string lines from structured data (ENUM-01 frontend).
  2. Backend ingredient serialization emits structured `list[Ingredient]` via Pydantic schema, not Python `str(dict)`. Validated by capturing a fresh URL recipe end-to-end and asserting the advisory bubble payload contains no `{'name':` substring (ENUM-01 backend).
  3. `RecipeCard.tsx` (Bibliothèque grid) and the post-vote Accueil ledger meta rows consume `useEnumLabels` for cuisine/mood/protein renders. Manual walk shows "Italienne · avant-hier" not "italian · avant-hier" (ENUM-02, ENUM-03).
  4. Repo-wide grep gate (mirrors v0.5 Phase 22 D-18 pattern): a CI-runnable script confirms no raw locked-vocabulary value (`italian|indian|mexican|french|asian|mediterranean|middleEastern|northAfrican|american|comfort|festive|fresh|easy|medium|hard|beef|chicken|fish|pork|none|spring|summer|autumn|winter`) appears in `frontend/{app,components}` template literals or visible-text positions outside `lib/enums.ts` and `lib/enum-labels.ts` (ENUM-04).
**Plans**: TBD (plan-phase)

### Phase 36: Sober Kitchen finish + polish
**Goal**: The `docs/design-system.html` §15 locked-screen contract — Accueil Composition A, Bibliothèque Patine, Recette détail cookbook gestures, BottomNav elevation, table-à-manger seat geometry, dogear corner-fold — fully ships as documented; the design system as built ↔ as documented re-aligns; the seven polish findings close.
**Depends on**: Phase 35 (Accueil ledger touches enum-rendered meta rows; sequence to avoid merge conflicts on `HomeDecide.tsx` and `RecipeCard.tsx`).
**Requirements**: SOBER-09, SOBER-10, SOBER-11, SOBER-12, SOBER-13, SOBER-14, SOBER-15, SOBER-16, POLISH-01, POLISH-02, POLISH-03, POLISH-04
**Success Criteria** (what must be TRUE):
  1. Accueil renders the locked Composition A ledger from first paint (not only post-vote). The un-voted card embeds as a special row in the ledger; the Validé row is visible immediately if the shortlist has one (SOBER-09). Phase 34 LIVE-04 marginalia branch is naturally consistent.
  2. BottomNav central « Ajouter » CTA visibly lifts above the four sibling tabs (`translateY(-12px)` or equivalent + drop shadow per `.scratch/capture-mockups/1-smart-paste.html`); Phase 31's pill gets the elevation that completed the spec (SOBER-10).
  3. Bibliothèque "Patine" view renders three section headers ("Héritage" / "Habitudes" / "À l'essai") with `(n)` counts including empty buckets; seed bumps one recipe to `cook_count >= 10` so non-trivial buckets are observable in dev (SOBER-11, SOBER-14).
  4. Recette détail has the terracotta-30 left margin-rule on the ingredient list, the backdrop-blur title strip when a photo is present, Fraunces-italic numbered steps, and Caveat-slant marginalia gutter for step asides (SOBER-12, P-05).
  5. Spot-check on a real iPhone: table-à-manger seat geometry (table-plate + state-classed seat halos) renders; if missing, the locked geometry ships (SOBER-13).
  6. Post-vote Accueil ledger renders all 5 computed states including Rejeté (Shawarma row visible) OR `docs/design-system.html` §15.A documents the hide-Rejeté rule. Decision during discuss-phase (SOBER-15).
  7. `docs/design-system.html` §15 shows the post-Phase-27 4-tab + central CTA BottomNav (no "Réception" tab); doc ↔ implementation re-aligned (SOBER-16).
  8. French typography: `Ingrédients · 6 personnes` and all `·` separators use NBSP both sides via the `meta-sep` pattern; sweep-applied (POLISH-01).
  9. Push permission banner sits below the shortlist hero on Accueil; the locked H1 + marginalia register is the first paint (POLISH-02).
  10. Recette détail meta-pill row icons are homogeneous (all text or all with leading icon); decision during discuss-phase (POLISH-03).
  11. Long post-vote ledger CTA copy truncates gracefully on narrow phones via "Cuisiner ce soir" + marginalia title underneath (POLISH-04).
**Plans**: TBD (plan-phase)
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 34 → 35 → 36 (Phase 35 may run in parallel with Phase 34 if executor capacity allows; Phase 36 should wait for Phase 35 due to shared edits on `HomeDecide.tsx` and `RecipeCard.tsx`).

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 34. Live-bug sweep | v0.7.1 | 5/5 | Plans complete (code review next) | — |
| 35. Enum + extraction-leak sweep | v0.7.1 | 0/0 | Awaiting plan-phase | — |
| 36. Sober Kitchen finish + polish | v0.7.1 | 0/0 | Awaiting plan-phase | — |

## Completed Milestone Progress

| Milestone | Phases | Plans | Status | Completed |
|-----------|--------|-------|--------|-----------|
| v0.1 (W1-W4 + 01.1) | 5 | 31 | ✅ Complete | 2026-05-08 |
| v0.2 (Phases 5-9) | 5 | 26 | ✅ Complete | 2026-05-08 |
| v0.2.1 (Phase 10) | 1 | 7 | ✅ Complete | 2026-05-09 |
| v0.3 (Phases 11-14) | 4 | 16 | ✅ Complete | 2026-05-11 |
| v0.4 (Phases 15-21) | 7 | 27 | ✅ Complete | 2026-05-11 |
| v0.5 (Phases 22-24) | 3 | 9 | ✅ Complete | 2026-05-13 |
| v0.6 (Phases 25-29) | 5 | 22 | ✅ Complete | 2026-05-17 |
| v0.7 (Phases 30-33) | 4 | 9 | ✅ Complete | 2026-05-18 |
| v0.7.1 (Phases 34-36) | 3 | TBD | 🚧 In Progress | — |

**Cumulative:** 8 milestones shipped · 34 phases shipped · 147 plans shipped.

---

*Last updated: 2026-05-18 — v0.7.1 Sober Kitchen Finish milestone scoped from the 260518-kba walkthrough punch list. 3 phases (34-36), 22 requirements mapped (LIVE × 6 + ENUM × 4 + SOBER × 8 + POLISH × 4). Phase numbering continues from v0.7. Granularity: coarse — 3 phases driven by natural punch-list clusters (broken-behavior triage → systemic enum leak → §15 contract completion + polish). No new architecture invariants touched. Discovery via `/quick 260518-kba` already complete; this milestone is execution-only.*
