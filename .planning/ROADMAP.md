# Roadmap: Al Dente

## Completed Milestones

- **v0.1** ✅ (2026-05-05 → 2026-05-08) — Full PWA shipped: infra, onboarding, recipe library, LLM capture, daily shortlist, voting, cooking-log finalization, Web Push, realtime sync. 5 phases, 31 plans, 49 requirements. → [Archive](.planning/milestones/v0.1-ROADMAP.md)
- **v0.2** ✅ (2026-05-08) — Polish: Slow Food artisanal identity. Re-themed every surface (capture / decide / cook / onboarding) onto the Phase 5 design system (terracotta + warm-cream + Fraunces italic + paper-grain). Closed 5 W4 UI-REVIEW gaps inline (CAPTURE-11, DECIDE-05, COOK-07/08/11/12) plus the Phase 5 themeColor deferral. NEW PWA identity via Next.js 16 `app/icon.tsx`. UI audit average 22.4/24 across 5 phases (best 23/24). 5 phases, 26 plans, 31 requirements. → [Archive](.planning/milestones/v0.2-ROADMAP.md)
- **v0.2.1** ✅ (2026-05-08 → 2026-05-09) — E2E test infrastructure: one-command synthetic seed (`uv run seed` — 1 household + 2 members + 21 recipes + 3 cooking logs + 7 votes covering all 5 computed states, idempotent via uuid5+merge) + committed Playwright suite (14 specs across `seeded` and `fresh` projects, iPhone-shape Chromium viewport with `toBeInViewport()` on critical surfaces) + 4-command bootstrap runbook (`TESTING.md`). 1 phase, 7 plans, 4 requirements. → [Archive](.planning/milestones/v0.2.1-ROADMAP.md)
- **v0.3** ✅ (2026-05-09 → 2026-05-11) — Audit & Uniqueness Foundation. Audit-only milestone — zero new product features, zero product-code drift. 4 milestone-level artifacts in `.planning/v0.3/`: `RUNBOOK.md` (prod synthetic ops at `https://al-dente-pink.vercel.app`, code `DEMO01`), `WALKTHROUGH.md` (1,276 lines, ~64 severity-tagged findings across 14 surfaces, 8 GitHub issues filed #1-#8), `UI-AUDIT.md` (14 surface scores, mean 20.21/24, 5✅/9⚠/0❌), `ASSESSMENT.md` (510 lines, 27 ranked findings across 3 tiers ordered by impact on "feels Al Dente", anti-prescription gate enforced structurally via `check-assessment.sh`). 4 phases, 16 plans, 16 requirements. → [Archive](.planning/milestones/v0.3-ROADMAP.md)
- **v0.4** ✅ (2026-05-11) — Audit Remediation & Identity Polish. Closed both v0.3 Tier 1 invariant breaks (B-3 MEMBER_COUNT + B-4 cook_count idempotency), 4 Tier 2 correctness clusters (capture pipeline, history feature, identity management, validation surfaces), the C-1 token-completeness gap (15 new semantic CSS variables + emerald/member-color migration on 7 audit-cited surfaces), and the v0.2.2 backlog (TZ-01, SEED-01, POLISH-01/02). 6 surfaces flipped ⚠ Mixed → ✅ Feels Al Dente under the SAME 6-pillar rubric; cumulative mean 20.21/24 → 21.71/24 (+1.50). 7 phases, 27 plans, 24 requirements. → [Archive](.planning/milestones/v0.4-ROADMAP.md)
- **v0.5** ✅ (2026-05-12 → 2026-05-13) — Mixed Sweep. Closed 12 GitHub issues (#10/#11/#12/#13/#14/#15/#16/#17/#18/#21/#22 A+B) across three coherent themes — quick wins, swipe-deck polish, and recipe identity. **Invariant #1 has shifted** — quick + full-form captures moved from sync `structured`-on-return to async `BackgroundTask` (CLAUDE.md updated in same commit as `rewrite_title()`). Shipped LLM "catchy" titles across all capture surfaces, `BrandIcon` brand mark + empty-state mounts, 11-field `CompletenessCard` nudge with `?focus=` edit-page navigation, per-recipe SVG illustration pipeline with stdlib `xml.etree.ElementTree` allowlist sanitizer (28 unit tests, reject-and-fallback), ring-stroke drag overlays replacing OUI/NON, swipe threshold + spring retune, filled/outline Heart thumb buttons, tap-to-detail, Geist Mono drop, `VersionFooter` build stamp, French `useEnumLabels()` sweep on shortlist + recipe detail. 3 phases, 9 plans, 12 requirements. → [Archive](.planning/milestones/v0.5-ROADMAP.md)
- **v0.6** ✅ (2026-05-13 → 2026-05-17) — Conversation Capture. Replaced the five tabbed capture surfaces (`quick` / full-form / `voice` / `photo` / `url`) with one durable conversation thread per recipe — `recipe_turns` table added + legacy `source_capture` JSONB dropped in the same Alembic migration (0009); `promote_draft(recipe_id)` consolidates four per-surface promotion functions into one entry point dispatching on first turn's `kind`. Shared `RecipeThread` component mounted on both `/recipes/new` (capture) and `/recipes/[id]` (detail) — CAPTURE-04 one-component-two-mount-points contract honored. Gemini rebuilt around full-thread reads with extraction-hash idempotency; emits `advisory` turns on conflict (option C — manual edit wins) and `question` turns driven by `recipe-completeness.ts`. URL extraction unstubbed behind real SSRF gate. `manually_edited_fields` is on the wire and visible as Caveat marginalia. **Invariant #1 evolved** (all five capture surfaces converge through `promote_draft`); **invariant #5 satisfied by `recipe_turns`** going forward (`source_capture` retired). 5 phases, 22 plans, 23 requirements. → [Archive](.planning/milestones/v0.6-ROADMAP.md)

## Current Milestone

### v0.7 Sober Kitchen + Polish (in progress — started 2026-05-17)

**Milestone Goal:** Clear the live-bug backlog (gh#23, gh#24), ship the missing central capture entry point (gh#25), port every locked screen to the Sober Kitchen design system per `docs/design-system.html` §15 (gh#29), and shrink root `CLAUDE.md` per-turn context cost by splitting backend/frontend/GSD guidance into scoped files (gh#27).

## Phases

- [x] **Phase 30: Live-bug sweep** — Photo signed URLs self-heal on PWA resume; recipe SVG illustrations render as visible pictograms. (completed 2026-05-17)
- [x] **Phase 31: Bottom nav restructure** — Central elevated « Ajouter » CTA lands in the bottom nav on every authenticated, non-onboarding screen. (completed 2026-05-17)
- [ ] **Phase 32: Port locked screens to Sober Kitchen** — All eight Sober Kitchen design-system §15 items (tokens, three screens, patine cards, voting scene, marginalia, brand-mark loader) are live.
- [ ] **Phase 33: CLAUDE.md split** — Root `CLAUDE.md` shrinks to invariants + locked vocabularies + source-of-truth pointers; backend, frontend, and GSD guidance live in scoped files.

## Phase Details

### Phase 30: Live-bug sweep
**Goal**: Live production bugs that degrade daily use are silently fixed — photos survive a PWA backgrounding and SVG illustrations render as the pictograms they were always meant to be.
**Depends on**: Nothing (first v0.7 phase — orthogonal backend + frontend fixes, no shared dependency).
**Requirements**: BUG-01, BUG-02
**Success Criteria** (what must be TRUE):
  1. On an iPhone PWA: load the household, lock the screen for 10 minutes, unlock — recipe photos render (or self-recover within one visible frame) without a manual refresh. The `onError` handler fires the cache-invalidation + refetch path exactly once and does not loop.
  2. `grep -rn "SIGNED_URL_TTL_SECONDS\|PHOTO_URL_CACHE_TTL_MS" backend/ frontend/` shows the raised TTL values (backend ≥ 3600 s, frontend ≥ 3000000 ms); the dev-only 3-stage fallback remains gated to non-prod.
  3. Capturing a fresh recipe without a photo and navigating to the library card and inbox row shows a visible colored pictogram, not a muted empty square.
  4. `grep -rn "ns0:" backend/app/services/` returns zero matches; the sanitizer unit test asserts no `ns0:` substring and a bare `<svg` root element.
**Plans**: 2 plans
Plans:
- [x] 30-01-PLAN.md — BUG-01: Photo signed-URL self-heal (TTL bump + useSignedPhotoUrl hook + 4-surface refactor)
- [x] 30-02-PLAN.md — BUG-02: SVG sanitizer ns0 fix + Alembic data migration

### Phase 31: Bottom nav restructure
**Goal**: Users can reach the recipe capture flow in one tap from any authenticated screen via a visually elevated central « Ajouter » button — the bottom nav's intent is unambiguous.
**Depends on**: Phase 30 (recommended — land bug fixes before touching nav; no hard code dependency, but avoids a nav re-render during a simultaneous photo-URL fix).
**Requirements**: NAV-01
**Success Criteria** (what must be TRUE):
  1. The bottom nav on every authenticated, non-onboarding screen shows a filled primary circle with a white `+` and an `Ajouter` label that is visibly elevated above its four flat sibling tabs.
  2. The `aria-current="page"` attribute is set on the central CTA when the user is on the capture entry route, and the element is reachable via keyboard Tab order and a screen reader's landmark list.
  3. The drafts-tab badge and safe-area inset remain pixel-correct; `/onboarding/*` routes do not render the bottom nav.
  4. `grep -rn "variant.*tab\|variant.*central-cta" frontend/` confirms the per-tab discriminator (`variant: "tab" | "central-cta"`) is in use — no ad-hoc conditional spread across tab renders.
**Plans**: 1 plan
Plans:
- [x] 31-01-PLAN.md — NAV-01: central elevated « Ajouter » CTA + variant discriminator + nav.profile/nav.add (BottomNav.tsx rewrite, app/layout.tsx pb bump, fr.json key changes)
**UI hint**: yes

### Phase 32: Port locked screens to Sober Kitchen
**Goal**: Every screen a user touches daily renders with the locked Sober Kitchen identity — terracotta tokens, patine recipe cards, the table-à-manger voting scene, Caveat marginalia, and the brand-mark loader — replacing all ad-hoc CSS the system supersedes.
**Depends on**: Phase 31 (the nav variant must be stable before the design-system port touches the same surfaces; avoids merge conflicts on shared layout components). Phase 32 should not start until Phase 31 is merged.
**Requirements**: SOBER-01, SOBER-02, SOBER-03, SOBER-04, SOBER-05, SOBER-06, SOBER-07, SOBER-08
**Success Criteria** (what must be TRUE):
  1. `grep -rn "terracotta\|--color-primary" frontend/{app,components}` confirms no ad-hoc hex/OKLCH literals duplicate the locked token set; all terracotta/type-scale/patine utilities come from `globals.css` per §15.A–B.
  2. Accueil, Bibliothèque, and Recette — Détail each match their locked-screen reference in `docs/design-system.html` — a side-by-side visual pass on a real iPhone confirms layout, type scale, and spacing register (SOBER-02, SOBER-03, SOBER-04).
  3. Every recipe card across all three screens renders the patine treatment (cook-count → patina intensity mapping); a freshly captured recipe (0 cooks) shows the lightest patine and a frequently cooked recipe shows the heaviest (SOBER-05).
  4. The shortlist voting surface renders as the table-à-manger scene; all five computed states (Validé / Pressenti / Contesté / Rejeté / Sans avis) are visually distinct within the scene, and `grep -rn "state.*column\|vote_state" backend/app/models/` confirms no new `state` column was introduced — invariant #2 (voting state computed, not stored) is intact (SOBER-06).
  5. Caveat handwriting is the sole font for manual-edit pin labels, system asides, and register cues across the locked screens; `PinLabel.tsx` is the reference implementation and no parallel annotation component was introduced (SOBER-07).
  6. All slow-path loading states (photo upload, LLM promotion, URL extraction) route through the brand-mark animation, not ad-hoc spinners; `grep -rn "animate-spin\|Spinner\|LoadingSpinner" frontend/` returns zero matches outside the brand-mark loader itself (SOBER-08).
**Plans**: TBD
**UI hint**: yes

### Phase 33: CLAUDE.md split
**Goal**: Root `CLAUDE.md` carries only the cross-cutting rules every Claude session needs — architecture invariants, locked vocabularies, MVP posture, and source-of-truth pointers — while backend, frontend, and GSD guidance live exactly once in scoped files.
**Depends on**: Nothing (pure documentation restructure; no runtime code dependency; safe to execute in parallel with or after any other phase, but natural last because the split is cleaner once v0.7 features are settled).
**Requirements**: DX-01
**Success Criteria** (what must be TRUE):
  1. Root `CLAUDE.md` line count is materially lower than pre-split (target: ≤ 60 lines of guidance, excluding the auto-managed sections); the file contains architecture invariants, locked vocabularies, MVP posture, and source-of-truth pointers — nothing else.
  2. `backend/CLAUDE.md` exists and contains every backend-specific rule that was in root (SQLAlchemy 2.0 typed style, Alembic conventions, `uv` workflow, single-uvicorn-worker reasoning, APScheduler in-process pattern).
  3. `frontend/CLAUDE.md` exists and contains every frontend-specific rule that was in root (Next.js 16 breaking changes, ESLint-as-formatter, `@/*` alias, `--webpack` build flag rationale); `frontend/AGENTS.md` is untouched.
  4. `.planning/CLAUDE.md` exists and contains the GSD workflow enforcement block.
  5. `grep -rn "SQLAlchemy\|alembic\|uvicorn" CLAUDE.md` at repo root returns zero matches (content moved, not duplicated); `grep` across `backend/CLAUDE.md`, `frontend/CLAUDE.md`, `.planning/CLAUDE.md` confirms every moved rule is present in exactly one scoped file.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 30 → 31 → 32 → 33 (Phase 33 has no code dependency and may run last or in parallel with 32 at the user's discretion).

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 30. Live-bug sweep | v0.7 | 2/2 | Complete    | 2026-05-17 |
| 31. Bottom nav restructure | v0.7 | 1/1 | Complete    | 2026-05-18 |
| 32. Port locked screens to Sober Kitchen | v0.7 | 0/? | Not started | - |
| 33. CLAUDE.md split | v0.7 | 0/? | Not started | - |

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
| v0.7 (Phases 30-33) | 4 | TBD | 🚧 In Progress | — |

**Cumulative:** 7 milestones shipped · 30 phases shipped · 138 plans shipped.

---

*Last updated: 2026-05-18 — Phase 31 planned (1 plan, 4 tasks). v0.7 Sober Kitchen + Polish roadmap created 2026-05-17. 4 phases (30-33), 12 requirements mapped (BUG × 2 + NAV × 1 + SOBER × 8 + DX × 1). Phase numbering continues from v0.6. Granularity: coarse — 4 phases driven by natural delivery clusters (bug-fix isolation → nav restructure → design port → DX). Architecture invariants touched: #2 (SOBER-06 voting scene must not introduce a stored state column), #6 (French-only via next-intl preserved across all screen ports).*
