# Roadmap: Al Dente

## Completed Milestones

- **v0.1** ✅ (2026-05-05 → 2026-05-08) — Full PWA shipped: infra, onboarding, recipe library, LLM capture, daily shortlist, voting, cooking-log finalization, Web Push, realtime sync. 5 phases, 31 plans, 49 requirements. → [Archive](.planning/milestones/v0.1-ROADMAP.md)
- **v0.2** ✅ (2026-05-08) — Polish: Slow Food artisanal identity. Re-themed every surface (capture / decide / cook / onboarding) onto the Phase 5 design system (terracotta + warm-cream + Fraunces italic + paper-grain). Closed 5 W4 UI-REVIEW gaps inline (CAPTURE-11, DECIDE-05, COOK-07/08/11/12) plus the Phase 5 themeColor deferral. NEW PWA identity via Next.js 16 `app/icon.tsx`. UI audit average 22.4/24 across 5 phases (best 23/24). 5 phases, 26 plans, 31 requirements. → [Archive](.planning/milestones/v0.2-ROADMAP.md)
- **v0.2.1** ✅ (2026-05-08 → 2026-05-09) — E2E test infrastructure: one-command synthetic seed (`uv run seed` — 1 household + 2 members + 21 recipes + 3 cooking logs + 7 votes covering all 5 computed states, idempotent via uuid5+merge) + committed Playwright suite (14 specs across `seeded` and `fresh` projects, iPhone-shape Chromium viewport with `toBeInViewport()` on critical surfaces) + 4-command bootstrap runbook (`TESTING.md`). 1 phase, 7 plans, 4 requirements. → [Archive](.planning/milestones/v0.2.1-ROADMAP.md)
- **v0.3** ✅ (2026-05-09 → 2026-05-11) — Audit & Uniqueness Foundation. Audit-only milestone — zero new product features, zero product-code drift. 4 milestone-level artifacts in `.planning/v0.3/`: `RUNBOOK.md` (prod synthetic ops at `https://al-dente-pink.vercel.app`, code `DEMO01`), `WALKTHROUGH.md` (1,276 lines, ~64 severity-tagged findings across 14 surfaces, 8 GitHub issues filed #1-#8), `UI-AUDIT.md` (14 surface scores, mean 20.21/24, 5✅/9⚠/0❌), `ASSESSMENT.md` (510 lines, 27 ranked findings across 3 tiers ordered by impact on "feels Al Dente", anti-prescription gate enforced structurally via `check-assessment.sh`). 4 phases, 16 plans, 16 requirements. → [Archive](.planning/milestones/v0.3-ROADMAP.md)

## Current Milestone

**v0.4 — Audit Remediation & Identity Polish** (scoped 2026-05-11). Tight scope, 7 phases, 24 requirements. Consumes `.planning/v0.3/ASSESSMENT.md` (27 ranked findings), `UI-AUDIT.md`, `WALKTHROUGH.md`, and GitHub Issues #1–#8 as canonical inputs. Phase numbering continues — starts at Phase 15.

**Goal:** Close the highest-impact correctness violations and UI gaps surfaced by the v0.3 audit corpus, advancing the "feels Al Dente" verdict distribution without adding new product capabilities. In aggregate: 2 Tier 1 ASSESSMENT findings closed (B-3, B-4), 4 Tier 2 clusters closed (C-4+B-2 capture, B-5+B-10 history, B-6+B-7 identity-mgmt, B-1+B-13 validation), C-1 token gap closed via semantic CSS variables, ≥3 ⚠ Mixed surfaces flipped to ✅ Feels Al Dente under the same 6-pillar rubric, and 4 v0.2.2 backlog items cleared (TZ-01, SEED-01, POLISH-01, POLISH-02).

## Phases

- [x] **Phase 15: Tier 1 invariant fixes** — Vote chip computes for all household sizes; `cook_count` honors same-tx idempotency. (completed 2026-05-11)
- [ ] **Phase 16: Capture pipeline correctness** — Failed terminal state + recovery affordance; French ingredient parser round-trips cleanly.
- [ ] **Phase 17: History feature restoration** — Cooking-log list + detail routes live; timezone filter correct.
- [ ] **Phase 18: Identity management** — Member rename + household-capacity copy + invite-code Copy button.
- [ ] **Phase 19: Validation surface fixes** — Sheet-01 + Push three-gap closed; seed cross-day idempotent.
- [ ] **Phase 20: Token-completeness sweep** — Emerald + member colors semantic-routed; `next-intl` drift closed.
- [ ] **Phase 21: Pillar 6 deficit pass + rescore** — ≥3 surfaces flip ⚠→✅ under the v0.3 rubric; verdict shifts documented.

## Phase Details

### Phase 15: Tier 1 invariant fixes
**Goal**: User sees architecturally-correct vote state and cook counts regardless of household size or finalize-tap rhythm — the two v0.3 Tier 1 audit findings are closed.
**Depends on**: Nothing (foundation correctness phase — goes first)
**Requirements**: INV-01, INV-02
**Success Criteria** (what must be TRUE):
  1. In a household with N members (N≥2), the vote chip on `HomeDecide` / `VoteSummary` renders the correct one of {Validé / Pressenti / Contesté / Rejeté / Sans avis} per the actual member count — no `MEMBER_COUNT=2` hardcode remains in `HomeDecide.tsx:52`, `VoteSummary.tsx:83`, or `services/voting.compute_vote_state`.
  2. A user can tap `Finaliser` twice on the same `cooking_log` and the recipe's `cook_count` increments exactly once (and `last_cooked_at` stays stable) — observable on the recipe-detail surface and verifiable via DB read.
  3. Architecture invariants #2 (voting state computed) and #3 (same-tx denormalized) hold under audit-revisit: neither invariant introduces nor relaxes a contract.
**Plans**: 4 plans
- [x] 15-01-PLAN.md — pytest scaffolding (pyproject.toml + tests/conftest.py)
- [x] 15-02-PLAN.md — backend atomic UPDATE rewrite of finalize_cooking_log + first Python tests (INV-01 backend, INV-02)
- [x] 15-03-PLAN.md — frontend MEMBER_COUNT removal (HomeDecide, VoteSummary) + 5-state regression canary spec (INV-01 frontend)
- [x] 15-04-PLAN.md — extend cooking-log-create-finalize.spec.ts with double-tap idempotency assertion (stays test.fixme until Phase 17 closes TZ-01)
**Key risks / threat-model flags**:
  - Touches shared modules (`services/voting`, `cooking_logs.py`) that later phases (17, 18) also touch — landing first minimizes merge churn.
  - Architecture invariants #2 + #3 are load-bearing per `CLAUDE.md`. Any plan reviewer must verify the invariant contract is preserved, not just the bug fix.

### Phase 16: Capture pipeline correctness
**Goal**: Users recover from failed captures without abandoning the draft, and French shopping-list ingredient lines round-trip correctly through capture → promotion → detail page.
**Depends on**: Phase 15 (clean correctness baseline)
**Requirements**: CAP-01, CAP-02, CAP-03
**Success Criteria** (what must be TRUE):
  1. When Gemini extraction returns garbage on a voice/photo capture, the draft transitions to a `failed` terminal state (with error context in `promotion_error`) instead of staying stuck at `(extraction en cours…)`.
  2. A user opening `/inbox` on a `failed` draft sees a French failed-state label explaining the failure mode, plus inline `Réessayer` and `Supprimer` actions at a 48px tap target.
  3. A user entering ingredient lines like `4 tomates`, `1 oignon rouge`, `500 g de farine` in `RecipeForm` sees them on the recipe-detail `Ingrédients` list verbatim — no `4 tomates 4 tomates` duplication.
  4. The capture pipeline still honors architecture invariant #1: all 5 surfaces (`quick`, full-form, `voice`, `photo`, `url`) return a `draft`, all promotion runs server-side in a FastAPI `BackgroundTask`, and the terminal state set is now `{structured, failed}` instead of just `{structured}`.
**Plans**: TBD
**UI hint**: yes
**Key risks / threat-model flags**:
  - Extending invariant #1 (5 capture surfaces, one shape) with a third terminal state — Alembic migration + enum update across `frontend/lib/enums.ts` AND `backend/app/models/enums.py` (locked vocabulary per `CLAUDE.md`). Drift between the two is a bug category.
  - URL-01 explicitly NOT in scope — the URL extraction stub stays `# TODO(productize)`; CAP-01 surfaces the deferred stub via the new `failed` state, it does not resolve extraction.

### Phase 17: History feature restoration
**Goal**: The cooking-log history loop is reachable end-to-end — list, detail, and the late-evening UTC offset edge case all work as a user expects.
**Depends on**: Phase 15 (`cooking_logs.py` correctness baseline)
**Requirements**: HIST-01, HIST-02, FIX-01
**Success Criteria** (what must be TRUE):
  1. A user opening `/cooking-logs` sees their household's recent cooking-log entries (author + recipe + date + rating + photo thumbnail) for the past N days — `GET /api/cooking-logs?days=N` returns data, not an empty list.
  2. A user tapping a cooking-log card on `/cooking-logs` lands on `/cooking-logs/[id]` and reads the full notes + photo + rating in paper-grain Card chrome consistent with the v0.2 Phase 8 cooking-log design system.
  3. A user finalizing a cooking-log at 22:00 household-tz on day D sees the entry filed under day D (not D-1 or D+1) regardless of the UTC offset window — the timezone filter in `cooking_logs.py:72-78,118-126` compares household-tz date to UTC DB date correctly.
  4. The `cooking-log-create-finalize.spec.ts` Playwright spec removes its `test.fixme` marker and passes under the seeded project.
**Plans**: TBD
**UI hint**: yes
**Key risks / threat-model flags**:
  - All three reqs touch `cooking_logs.py` router — atomic-bundle discipline keeps merge surface coherent.
  - HIST-01's new GET endpoint may broadcast nothing (read-only), but any mutation paths touched (e.g. notes edit on detail) must broadcast via `services/realtime.broadcast_to_household` per invariant #4.

### Phase 18: Identity management
**Goal**: Both household members can manage their identity (rename themselves, copy the invite code) and prospective new members hit clear capacity copy instead of a silently-disabled join button.
**Depends on**: Phase 15 (correctness baseline) — independent of Phases 16, 17
**Requirements**: IDM-01, IDM-02, IDM-03, IDM-04, FIX-04
**Success Criteria** (what must be TRUE):
  1. A user opens Settings, taps an inline edit affordance on their Membre Card, types a new name, submits, and sees the rename reflected on Settings — and on the partner's surfaces — within the realtime sync window (~200ms).
  2. A 6th user attempting to join a household whose 5-member `MEMBER_COLORS` palette is exhausted sees a French Fraunces-italic paper-grain Card explaining the household is full, instead of a silently-disabled submit button. The backend returns 422 with a structured error code.
  3. A user opens Settings, taps a Copy button on the invite-code Card, and sees a French `Code copié` toast confirming `navigator.clipboard.writeText` succeeded.
  4. `PATCH /api/households/me` enforces name length + uniqueness within the household, and the mutation broadcasts via `services/realtime.broadcast_to_household` (invariant #4).
**Plans**: TBD
**UI hint**: yes
**Key risks / threat-model flags**:
  - PATCH /households/me is a new mutation route — must broadcast per invariant #4. Phase 18 plans must call out the broadcast event name explicitly so downstream realtime consumers stay in sync.
  - N>5 capacity expansion explicitly NOT in scope — IDM-03/04 fixes the affordance for the 5-slot ceiling, not the ceiling itself.
  - Settings surface is shared with FIX-04 (Copy button) — atomic-bundle keeps both edits on one commit-shape.

### Phase 19: Validation surface fixes
**Goal**: The two v0.3-audit validation gaps close — bottom sheets stay within viewport on iPhone, and Web Push delivery is operator-verifiable end-to-end. The seed CLI is also cross-day idempotent so the daily re-seed workflow stops requiring `docker compose down -v`.
**Depends on**: Phase 15 (correctness baseline) — independent of Phases 16, 17, 18
**Requirements**: VAL-01, VAL-02, VAL-03, VAL-04, FIX-02
**Success Criteria** (what must be TRUE):
  1. The PhotoUploader source bottom sheet (and any sibling Sheet consumers — VoiceModifySheet, RegenerateSheet) renders fully within the 390×844 iPhone-shape viewport — `paper-grain` no longer overrides Tailwind `fixed` in `components/ui/sheet.tsx:64`. The `capture-photo.spec.ts` `test.fixme` marker is removed and the spec passes under `toBeInViewport()`.
  2. A user who tapped `Pas maintenant` on the PushPermissionBanner can re-summon and re-enable Web Push notifications from a Settings recovery Card — without needing to clear session storage.
  3. An operator can fire a test push via `POST /api/push/test` (reachable from `/styleguide` in development) and verify delivery on both household iPhones without triggering a real product event (16:00 cron / partner cooking-started broadcast).
  4. The P-12-Pu-05 operator deferral is closed: a documented push delivery round-trip observation lands in `.planning/v0.4/` confirming end-to-end Web Push works on both iPhones via the new admin-test endpoint.
  5. Re-running `uv run seed` across calendar days is a no-op — no duplicate-key errors at `cli/seed.py:369,405`; `docker compose down -v` is no longer required for daily re-seeds.
**Plans**: TBD
**UI hint**: yes
**Key risks / threat-model flags**:
  - VAL-01 is a CSS source-order fix with no API change — but Sheet-01 has been the gating block on `capture-photo.spec.ts` since v0.2.1 Phase 10. Verification gate must confirm the `test.fixme` removal, not just the visual fix.
  - VAL-03's new `POST /api/push/test` is a new mutation route, but it does NOT broadcast via realtime by design (admin-test, not product event). Plan must call this out explicitly to avoid review confusion.
  - FIX-02 is backend-only infra — pairs with the backend-flavor VAL-03 endpoint work to keep this phase's commit-shape coherent.

### Phase 20: Token-completeness sweep
**Goal**: The C-1 token-completeness gap from the v0.3 UI-AUDIT closes — emerald palette and member-color hex literals route through semantic CSS variables. The `next-intl` invariant #6 code-layer break also closes. `/styleguide` becomes the single acceptance gate for both.
**Depends on**: Phase 15 (correctness baseline). Independent of Phases 16-19 but must precede Phase 21 (Pillar 6 polish consumes the new tokens).
**Requirements**: TOK-01, TOK-02, TOK-03, FIX-03
**Success Criteria** (what must be TRUE):
  1. `--color-valide-foreground` and `--color-cooking-foreground` (plus any sibling tokens the 5 audit-cited surfaces need) exist in `globals.css`; `ShortlistCard.tsx:256-258`, `VoteSummary.tsx:60`, `CookingLogFinalize.tsx`, and `CookingBanner.tsx:25-28` all read through the tokens instead of `text-emerald-{500,700}` literals.
  2. `--color-member-{rose,amber,emerald,sky,violet}-{bg,foreground}` exist in `globals.css`; `MEMBER_COLORS` (`frontend/lib/colors.ts`) and `<MemberDot>` reach for the tokens instead of raw hex literals.
  3. `/styleguide` surfaces the new emerald + member-color tokens visually with their swatch + foreground sample — design-system gate confirms the migration end-to-end with no token-name aliasing.
  4. Every user-facing string routes through `next-intl` — hardcoded `Historique` / `Voir les cuissons récentes` in `settings/page.tsx:175-183` and HomeDecide partner-waiting strings move into the i18n table. Invariant #6 (French-only via `next-intl`) holds at the code layer.
**Plans**: TBD
**UI hint**: yes
**Key risks / threat-model flags**:
  - UI-direction work (TOK-*) deliberately scoped separately from backend correctness phases — different code-review surfaces, different reviewers' lens.
  - Token-completeness beyond emerald + member colors is explicitly out of scope (terracotta foreground-tints, neutrals, shadow tokens stay in v2 backlog).
  - FIX-03 (POLISH-01 i18n drift) pairs with TOK because both share the `/styleguide` acceptance gate territory and both are code-layer-only fixes with no backend mutation.

### Phase 21: Pillar 6 deficit pass + rescore
**Goal**: The v0.3 UI-AUDIT Pillar 6 (Experience Design) deficit narrows — at least 3 ⚠ Mixed surfaces flip to ✅ Feels Al Dente under the SAME 6-pillar rubric, and the cumulative-mean delta against the 20.21/24 v0.3 baseline is documented for milestone audit closure.
**Depends on**: Phase 20 (consumes the new semantic tokens — surface polish reads through `--color-valide-foreground`, `--color-member-*`, etc.)
**Requirements**: P6-01, P6-02
**Success Criteria** (what must be TRUE):
  1. Re-scoring at least 3 of the 9 v0.3 ⚠ Mixed surfaces against the v0.3 UI-AUDIT 6-pillar rubric produces ✅ Feels Al Dente verdicts — surface picks driven by per-surface `ui-reviews/*-UI-REVIEW.md` Pillar 6 dock notes.
  2. `.planning/v0.4/UI-RESCORE.md` (or equivalent) documents the verdict shifts (per-surface old → new) and the cumulative-mean delta against the v0.3 20.21/24 baseline, under the SAME rubric.
  3. Architecture invariants from `CLAUDE.md` hold under the polish pass — no invariant introduced or relaxed by surface re-themes. (Phase 6-pillar rubric stays unchanged from v0.3 calibration for comparability.)
**Plans**: TBD
**UI hint**: yes
**Key risks / threat-model flags**:
  - Phase 13 6-pillar rubric revision is explicitly out of scope — P6-02 re-scores under the SAME rubric for comparability.
  - Brand redesign / new identity primitives are explicitly out of scope — the Slow Food design system locked in v0.2 Phase 5 stays. Phase 21 sharpens what exists.
  - P6-01 surface picks are NOT prescribed by the roadmap — the per-surface `ui-reviews/` files are the working spec. Plan phase will pick the surfaces with the highest leverage given Tight discipline.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 15. Tier 1 invariant fixes | 4/4 | Complete    | 2026-05-11 |
| 16. Capture pipeline correctness | 0/0 | Not started | - |
| 17. History feature restoration | 0/0 | Not started | - |
| 18. Identity management | 0/0 | Not started | - |
| 19. Validation surface fixes | 0/0 | Not started | - |
| 20. Token-completeness sweep | 0/0 | Not started | - |
| 21. Pillar 6 deficit pass + rescore | 0/0 | Not started | - |

## Next Steps

- **v0.4 Phase 15** — Run `/gsd-discuss-phase 15` or `/gsd-plan-phase 15` to start the milestone.
- **Behavioral validation gate** per `SPEC.md`: ≥ 2 weeks of daily use by both household members. Still the v0.1 definition of done; orthogonal to v0.4 phases.

---
*Last updated: 2026-05-11 — Phase 15 planned (4 plans). Wave 0: 15-01 (pytest scaffold). Wave 1: 15-02 (backend atomic UPDATE + tests), 15-03 (frontend MEMBER_COUNT removal + canary spec), 15-04 (E2E double-tap assertion, gated by TZ-01).*
