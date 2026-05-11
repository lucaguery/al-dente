# Requirements: Al Dente v0.4 — Audit Remediation & Identity Polish

**Defined:** 2026-05-11
**Core Value:** Eliminate the daily "on mange quoi ?" debate via a shared library, async voting, and voice/photo capture — installable PWA on both iPhones with no App Store, no $99/year, no native build.
**Milestone Goal:** Close the highest-impact correctness violations and UI gaps surfaced by the v0.3 audit corpus, advancing the "feels Al Dente" verdict distribution without adding new product capabilities.
**Inputs:** `.planning/v0.3/ASSESSMENT.md` (27 ranked findings) · `UI-AUDIT.md` (14 surfaces, mean 20.21/24) · `WALKTHROUGH.md` (1,276 lines, ~64 findings) · `ui-reviews/*-UI-REVIEW.md` (14 per-surface scorecards) · GitHub Issues #1–#8

---

## v0.4 Requirements

24 requirements across 8 categories. Each maps to one roadmap phase (populated during roadmap creation). Source citations in parentheses anchor each REQ to its ASSESSMENT entry or backlog item.

### INV — Architecture invariant fixes (Tier 1)

- [ ] **INV-01**: User sees the architecturally-correct 5-state vote chip (Validé / Pressenti / Contesté / Rejeté / Sans avis) regardless of household size — `MEMBER_COUNT=2` hardcode removed from frontend (`HomeDecide.tsx:52`, `VoteSummary.tsx:83`) and backend (`compute_vote_state` no longer defaults `member_count=2`). Architecture invariant #2 holds. (ASSESSMENT B-3, Issue #4)
- [ ] **INV-02**: User can re-tap `Finaliser` on the same `cooking_log` without `cook_count` doubling — `recipes.cook_count` and `last_cooked_at` honor the same-tx idempotency contract documented at `cooking_logs.py:136-160`. Architecture invariant #3 holds. (ASSESSMENT B-4, Issue #5)

### CAP — Capture pipeline correctness

- [ ] **CAP-01**: Capture pipeline acquires a `failed` terminal state — `recipes.status` adds a `failed` enum value via Alembic migration; the BackgroundTask promotion path writes `failed` (with error context in `promotion_error`) when Gemini extraction returns garbage or when the URL extraction stub no-ops. Architecture invariant #1 (5 capture surfaces, one shape) extended cleanly. (ASSESSMENT C-4 backend)
- [ ] **CAP-02**: User sees a recovery affordance on failed drafts in `/inbox` — the card title swaps `(extraction en cours…)` for a `failed`-state label with French copy explaining the failure mode plus inline `Réessayer` / `Supprimer` actions. (ASSESSMENT C-4 frontend)
- [ ] **CAP-03**: Ingredient parser at `RecipeForm.tsx:98-100` correctly round-trips French shopping-list patterns (`4 tomates`, `1 oignon rouge`, `500 g de farine`) so the recipe-detail `Ingrédients` list reads cleanly with no `4 tomates 4 tomates` duplication. (ASSESSMENT B-2, Issue #2)

### HIST — History feature restoration

- [ ] **HIST-01**: User opens `/cooking-logs` and sees their household's recent cooking-log entries — backend exposes `GET /api/cooking-logs?days=N` returning entries with author + recipe metadata. (ASSESSMENT B-10 / CL-01 backlog)
- [ ] **HIST-02**: User taps a cooking-log card and reads the full notes + photo + rating on `/cooking-logs/[id]` — the Next.js detail route ships with paper-grain Card chrome consistent with the v0.2 Phase 8 cooking-log design system. (ASSESSMENT B-5, Issue #6)

### IDM — Identity management

- [ ] **IDM-01**: `PATCH /api/households/me` route ships, accepting a JSON body with a member name update (validated against length + uniqueness within the household). (ASSESSMENT B-7 backend, Issue #8)
- [ ] **IDM-02**: User can rename themselves from Settings — Membre Card gains an inline edit affordance that calls PATCH and broadcasts the update via `services/realtime.broadcast_to_household` so the partner's surfaces re-render. (ASSESSMENT B-7 frontend)
- [ ] **IDM-03**: Backend enforces household capacity — `POST /api/households/join` returns 422 with a structured error code when the `MEMBER_COLORS` palette is fully claimed. (ASSESSMENT B-6 backend, Issue #7)
- [ ] **IDM-04**: Onboarding join surface displays a household-full terminal copy (Fraunces italic, paper-grain Card, French body explaining capacity) when the swatch palette is exhausted — instead of leaving the joining user with a silently-disabled submit button. (ASSESSMENT B-6 frontend)

### VAL — Validation surface fixes

- [ ] **VAL-01**: Photo source bottom sheet renders fully within the 390×844 iPhone-shape viewport — root cause fixed in `components/ui/sheet.tsx:64` so `paper-grain` no longer overrides Tailwind `fixed`; the `capture-photo.spec.ts` "photo upload sheet is reachable" Playwright spec removes its `test.fixme` marker. (ASSESSMENT B-1, Issue #1)
- [ ] **VAL-02**: Settings ships a push-recovery Card surface — user who tapped `Pas maintenant` on the PushPermissionBanner can re-summon and re-enable notifications from `/settings` without clearing session storage. (ASSESSMENT B-13 part 1)
- [ ] **VAL-03**: Admin-test push fire endpoint ships (`POST /api/push/test`) and is reachable from `/styleguide` in development so operators can verify delivery without triggering a real product event (16:00 household-tz cron / partner cooking-started broadcast). (ASSESSMENT B-13 part 2)
- [ ] **VAL-04**: End-to-end push delivery round-trip is verified on both household iPhones via the new admin-test endpoint — closes the P-12-Pu-05 operator deferral with a documented observation in `.planning/v0.4/`. (ASSESSMENT B-13 part 3)

### TOK — Token-completeness

- [ ] **TOK-01**: Emerald palette is semantic-token-routed — `--color-valide-foreground`, `--color-cooking-foreground` (and any sibling tokens the 5 audit-cited surfaces need) exist in `globals.css`; `ShortlistCard.tsx:256-258`, `VoteSummary.tsx:60`, `CookingLogFinalize.tsx`, and `CookingBanner.tsx:25-28` all read through the tokens instead of `text-emerald-{500,700}` literals. (ASSESSMENT C-1 part 1)
- [ ] **TOK-02**: Member colors are semantic-token-routed — `--color-member-{rose,amber,emerald,sky,violet}-{bg,foreground}` exist in `globals.css`; `MEMBER_COLORS` (`frontend/lib/colors.ts`) and `<MemberDot>` reach for the tokens instead of raw hex literals. (ASSESSMENT C-1 part 2)
- [ ] **TOK-03**: `/styleguide` page surfaces the new emerald + member-color tokens visually with their swatch + foreground sample, so the design-system gate can confirm the migration end-to-end. No token-name aliasing — clean rename. (ASSESSMENT C-1 part 3)

### P6 — Pillar 6 deficit pass

- [ ] **P6-01**: At least **3** ⚠ Mixed surfaces from the v0.3 UI-AUDIT corpus flip to ✅ Feels Al Dente under the same 6-pillar rubric — surface picks driven by per-surface `ui-reviews/*-UI-REVIEW.md` Pillar 6 dock notes. (ASSESSMENT cross-cutting bullet 7-8, UI-AUDIT.md Pillar 6 deficit)
- [ ] **P6-02**: Post-milestone mini-rescore documents the verdict shifts and the cumulative-mean delta against the v0.3 20.21/24 baseline in `.planning/v0.4/UI-RESCORE.md` (or equivalent). (ASSESSMENT calibration notes; verdict shifts depend on multi-finding bundles)

### FIX — Orthogonal v0.2.2 backlog roll-in

- [ ] **FIX-01**: Cooking-log active-cook filter is timezone-correct — `cooking_logs.py:72-78,118-126` compares household-tz date to UTC DB date correctly; late-evening cooks no longer fall through across the UTC offset window. `cooking-log-create-finalize.spec.ts` removes its `test.fixme` marker. (v0.2.2 backlog TZ-01)
- [ ] **FIX-02**: `uv run seed` is cross-day idempotent — re-running the seed across calendar days is a no-op (no duplicate-key errors at `cli/seed.py:369,405`); the `docker compose down -v` workaround is no longer required for daily re-seeds. (v0.2.2 backlog SEED-01)
- [ ] **FIX-03**: All user-facing strings route through `next-intl` — invariant #6 holds at the code layer; hardcoded `Historique` / `Voir les cuissons récentes` in `settings/page.tsx:175-183` and HomeDecide partner-waiting strings move into the i18n table. (v0.2.2 backlog POLISH-01; ASSESSMENT C-8)
- [ ] **FIX-04**: Settings invite-code Card gains a Copy button — `navigator.clipboard.writeText` with a French toast (`Code copié`) confirming success. (v0.2.2 backlog POLISH-02; v0.2 Phase 9 deferral)

---

## v2 Requirements (deferred to future release)

Acknowledged but not in v0.4 scope.

### Tier 3 ASSESSMENT findings (17 entries, deferred)

- **V2-T3-CLUSTER**: 17 Tier 3 ASSESSMENT entries — `cooking.finalized` 7th broadcast event docstring rot (B-12), no-debounce-on-submit cluster (C-2), validation-error UX cluster (C-3), shadcn-default icons cluster (C-6), audit-time WALKTHROUGH-vs-live-code deltas (B-21), and 12 additional Tier 3 nits. Tracked in `.planning/v0.3/ASSESSMENT.md` §Tier 3.

### Remaining ⚠ Mixed surfaces

- **V2-P6-REM**: The ⚠ Mixed surfaces NOT flipped by P6-01 stay in the polish backlog; the post-v0.4 mini-rescore documents the residual.

### Productize-deferred capabilities

- **V2-URL-01**: URL extraction (`recipes.py:481-490`) — stays `# TODO(productize)`. v0.4's C-4 failed-state work surfaces the deferred stub with a recovery affordance but does not resolve extraction itself.
- **V2-PUSH-PROD**: Production push delivery hardening beyond the v0.4 round-trip verification (retry queue, subscription expiration handling, multi-device pruning).
- **V2-ALBUM-01/02/03**: Shared cooking-log photo gallery — cut from v0.1 per `04-CONTEXT.md`.
- **V2-AUTH-01**: Supabase Auth magic-link migration — removes invite-code fragility, generalizes from couple-scale.
- **V2-MODEL-01**: Per-member ratings — richer preference signal at non-couple scale.

### Behavioral validation gate

- **V2-DOGFOOD**: ≥ 2 weeks of daily use by both members (the v0.1 definition-of-done) — completion is orthogonal to v0.4 phases.

---

## Out of Scope

Explicitly excluded from v0.4. Documented to prevent scope creep.

| Feature / direction | Reason |
|---|---|
| New product capabilities (album, magic-link auth, per-member ratings, mid-cook timer) | v0.4 is remediation-only — the milestone framing excludes net-new features. Moves to v2. |
| Cross-browser audit (Safari iOS, Chrome Android, tablet, desktop) | v0.4 stays bounded to the 390×844 isMobile/hasTouch Chromium viewport per the v0.2.1 Phase 10 testing baseline. Cross-browser would need a separate audit milestone. |
| N>5 household capacity expansion | v0.4 fixes the capacity-ceiling AFFORDANCE (IDM-03/04) but does NOT expand the `MEMBER_COLORS` palette beyond 5. Multi-tenant cleanliness is preserved for productize-later. |
| URL extraction implementation (URL-01) | Stays `# TODO(productize)`. C-4 surfaces the deferred stub via the new `failed` terminal state instead of resolving it. |
| Tier 3 cluster sweeps (token aliasing depth, doc rot, observability gaps, shadcn-default-icon replacement) | Deferred to v2 per the Tight scope decision. v0.4 targets the load-bearing Tier 1 + Tier 2 + cluster C-1 only. |
| Token-completeness beyond emerald + member colors | v0.4 closes the two C-1-named gaps; other secondary palette completeness work (terracotta foreground-tints, neutrals, shadow tokens) is out of scope. |
| Brand redesign / new identity moments | The Slow Food design system locked in v0.2 Phase 5 stays. v0.4 sharpens what exists; no new identity primitives. |
| Phase 13 6-pillar rubric revision | The rubric stays as v0.3 calibrated it. P6-02 re-scores under the SAME rubric for comparability. |

---

## Traceability

Empty initially; populated during roadmap creation. Each requirement maps to exactly one phase.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INV-01 | TBD | Pending |
| INV-02 | TBD | Pending |
| CAP-01 | TBD | Pending |
| CAP-02 | TBD | Pending |
| CAP-03 | TBD | Pending |
| HIST-01 | TBD | Pending |
| HIST-02 | TBD | Pending |
| IDM-01 | TBD | Pending |
| IDM-02 | TBD | Pending |
| IDM-03 | TBD | Pending |
| IDM-04 | TBD | Pending |
| VAL-01 | TBD | Pending |
| VAL-02 | TBD | Pending |
| VAL-03 | TBD | Pending |
| VAL-04 | TBD | Pending |
| TOK-01 | TBD | Pending |
| TOK-02 | TBD | Pending |
| TOK-03 | TBD | Pending |
| P6-01 | TBD | Pending |
| P6-02 | TBD | Pending |
| FIX-01 | TBD | Pending |
| FIX-02 | TBD | Pending |
| FIX-03 | TBD | Pending |
| FIX-04 | TBD | Pending |

**Coverage:**
- v0.4 requirements: **24** total
- Mapped to phases: 0 (pending roadmap creation)
- Unmapped: 24 ⚠️ (expected — populated by roadmapper)

---

*Requirements defined: 2026-05-11*
*Last updated: 2026-05-11 — initial v0.4 definition consuming v0.3 ASSESSMENT.md*
