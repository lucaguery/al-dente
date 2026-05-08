# Requirements: Al Dente — v0.2.1 (E2E test infrastructure)

**Defined:** 2026-05-08
**Core Value:** Eliminate the daily "on mange quoi ?" debate via a shared library, async voting, and voice/photo capture — installable PWA on both iPhones with no App Store, no $99/year, no native build.
**Milestone goal:** Make the shipped v0.1 / v0.2 PWA testable end-to-end on a fresh checkout — one-command synthetic seed plus committed Playwright coverage of every screen and action.
**Why now:** v0.2 closed without a regression net. Manual UAT on physical iPhones is the only safety we have, and rebuilding household state by hand is slow enough that I avoid it — which means regressions slip in.
**Source of scope decisions:** Locked with user before routing (committed Playwright suite + Python `uv run seed`).
**Prior milestone requirements:** archived at `.planning/milestones/v0.2-REQUIREMENTS.md` (31 reqs, all validated).

## v0.2.1 Requirements

### TEST — End-to-end test infrastructure

- [ ] **TEST-01**: Backend Python seed script — invoked via `uv run seed` (proper CLI entry point in `backend/pyproject.toml`). Idempotent (re-running does NOT double-insert). Creates one household, one member with a fixed env-overridable `auth_token` (default `test-token-luca`, override via `SEED_AUTH_TOKEN`), and 20+ recipes spread across the locked vocabularies (Season × Cuisine × Mood × Protein) so vote / shortlist / library views render with realistic variety. Includes a non-empty `cooking_logs` table with at least 3 finalized entries (different ratings — `loved` / `liked` / `disliked`) and a non-empty `votes` table covering each of the 5 computed states (Validé / Pressenti / Contesté / Rejeté / Sans avis) so derived state on `recipes.last_cooked_at` and `recipes.cook_count` is populated and the vote-state computation has data to test. MUST import the Python `Enum` classes (Season / Cuisine / Mood / Protein) directly from the backend models — no duplicated values (drift-with-`frontend/lib/enums.ts` is the explicit anti-pattern).

- [ ] **TEST-02**: Committed Playwright suite under `frontend/tests/` using `@playwright/test`. Cover each shipped screen and each user action: capture (quick + full at minimum; voice / photo / url marked `test.fixme` if not wired and a TODO recorded), drafts inbox, daily shortlist (swipe deck — at least vote-yes, vote-no, "Tu décides"), recipe detail, cooking-log create + finalize (rating + notes), recipe library list/search, settings (display invite code). Specs read the seeded `auth_token` from env (`PLAYWRIGHT_AUTH_TOKEN`) and inject it as the same-origin HttpOnly cookie that production uses, skipping onboarding for all specs except the one in TEST-04. Each spec asserts at least one user-visible outcome (DOM text, toast, navigation), not just absence of errors.

- [ ] **TEST-03**: Bootstrap runbook + `npm` / `uv` scripts so a fresh checkout reaches a green Playwright run in ≤ 5 commands. Documented in either `README.md` (root or `frontend/`) or a new `TESTING.md`. Commands are real and copy-pasteable (`uv sync && uv run alembic upgrade head && uv run seed && cd frontend && npm install && npm run test:e2e` is the upper-bound sketch — the actual sequence may be shorter via composed scripts). Includes a `npm run test:e2e` script in `frontend/package.json` and a `seed` console-script entry in `backend/pyproject.toml`. Includes a `.env.test.example` (or equivalent) showing the required env vars (`DATABASE_URL_TEST`, `SEED_AUTH_TOKEN`, `PLAYWRIGHT_AUTH_TOKEN`, `NEXT_PUBLIC_API_BASE`).

- [ ] **TEST-04**: Invite-code happy-path Playwright spec — one spec exercises `/onboarding/create` → invite code → `/onboarding/join` end-to-end without using the seeded auth shortcut. Validates that the join flow stays green when the cookie is fresh and that the second member lands in the household authenticated. This is the only spec that mutates onboarding state during the test run; runs in isolation from the seeded data (uses a separate or freshly truncated test DB scope).

## Future Requirements (deferred — NOT in v0.2.1 scope)

These are deferred v0.2 polish items captured in `.planning/milestones/v0.2-MILESTONE-AUDIT.md`. They are intentionally NOT folded into v0.2.1 to keep the milestone tight. Fold via `/gsd-add-phase` into v0.2.1 (or a future v0.2.2) when bandwidth allows.

- **POLISH-01** — i18n sweep on partner-waiting strings (HomeDecide partner-waiting Card and adjacent surfaces still have a few hardcoded strings)
- **POLISH-02** — Copy-to-clipboard button on the partner-waiting Card invite code (currently displays code but no one-tap copy)

### V2 — Backlog (post-v0.2.x, ongoing)

- **V2-ALBUM-01/02/03** — Shared cooking-log photo gallery (cut from v0.1)
- **V2-AUTH-01** — Supabase Auth magic-link migration (removes invite-code fragility)
- **V2-MODEL-01** — Per-member ratings (richer preference signal)
- **V2-UX-02** — Custom illustrations (seed: `.planning/seeds/handdrawn-signature-anchor.md`)

## Out of Scope

Explicitly excluded for v0.2.1. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Product-code refactors during the test phase | This milestone is test infrastructure; refactors live in their own phase. If a real bug surfaces while writing tests, surface it (don't fix inline) and capture it as a follow-up. |
| New product features | v0.2.1 is QA infra only; no functional additions. |
| Voice / photo / url capture spec coverage if surfaces aren't wired | Marked `test.fixme` with TODO in the spec. Don't block on building missing endpoints. |
| Tests against production hosting (Railway / Vercel / Supabase prod) | Local-only — tests use `DATABASE_URL_TEST` against local Postgres or a Supabase branch. Never hits the prod DB. |
| Mocking the database | Seed populates a real Postgres via the same SQLAlchemy + Alembic schema product code uses. Mocked tests pass against fictional schemas (memory: feedback_no_manual_vercel_deploy is unrelated, but the same family of "test divergence" risk applies). |
| CI integration (GitHub Actions, Vercel CI checks) | This milestone delivers the local suite. CI hookup can be a follow-up (small) phase once the suite is proven green locally. |
| Visual-regression / screenshot testing | Out of scope. Playwright assertions only. UI audits remain the job of `/gsd-ui-review`. |
| Cross-browser coverage (Firefox, Safari) | Chromium-only for v0.2.1 — matches the audience (iOS Safari, but Playwright Chromium is sufficient for behavioral regression). Real-device Safari validation stays manual. |
| Performance / load testing | Functional E2E only. Performance budget is its own discipline. |

## Traceability

Filled when ROADMAP.md / phase plans are written.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEST-01 | Phase 10 | Pending |
| TEST-02 | Phase 10 | Pending |
| TEST-03 | Phase 10 | Pending |
| TEST-04 | Phase 10 | Pending |

**Coverage:**
- v0.2.1 requirements: 4 total
- Mapped to phases: 4 ✓
- Unmapped: 0
- Duplicates: 0

**Per-phase counts:**
- Phase 10 (E2E test infrastructure & synthetic seed): 4 requirements (TEST × 4)

---
*Requirements defined: 2026-05-08*
*Last updated: 2026-05-08 — v0.2.1 milestone scoped to a single phase (Phase 10). All 4 TEST requirements mapped 1-to-1 to Phase 10. v0.2 requirements archived at `.planning/milestones/v0.2-REQUIREMENTS.md`.*
