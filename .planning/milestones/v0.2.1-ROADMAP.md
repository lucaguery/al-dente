# Roadmap: Al Dente

## Completed Milestones

- **v0.1** ✅ (2026-05-05 → 2026-05-08) — Full PWA shipped: infra, onboarding, recipe library, LLM capture, daily shortlist, voting, cooking-log finalization, Web Push, realtime sync. 5 phases, 31 plans, 49 requirements. → [Archive](.planning/milestones/v0.1-ROADMAP.md)
- **v0.2** ✅ (2026-05-08) — Polish: Slow Food artisanal identity. Re-themed every surface (capture / decide / cook / onboarding) onto the Phase 5 design system (terracotta + warm-cream + Fraunces italic + paper-grain). Closed 5 W4 UI-REVIEW gaps inline (CAPTURE-11, DECIDE-05, COOK-07/08/11/12) plus the Phase 5 themeColor deferral. NEW PWA identity via Next.js 16 `app/icon.tsx`. UI audit average 22.4/24 across 5 phases (best 23/24). 5 phases, 26 plans, 31 requirements. → [Archive](.planning/milestones/v0.2-ROADMAP.md)

## Current Milestone

**v0.2.1 — E2E test infrastructure** (started 2026-05-08)

Patch milestone: one-command synthetic seed + committed Playwright suite covering every shipped screen and action. Single phase to keep scope tight; deferred v0.2 polish items (i18n sweep on partner-waiting strings, Copy button per `.planning/milestones/v0.2-MILESTONE-AUDIT.md`) intentionally NOT folded — fold via `/gsd-add-phase` later if scope warrants.

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 10 | E2E test infrastructure & synthetic seed | 7/7 | Complete    | 2026-05-08 |

### Phase 10 — E2E test infrastructure & synthetic seed

**Goal:** Make the shipped v0.1 / v0.2 PWA testable end-to-end on a fresh checkout via a one-command synthetic seed and a committed Playwright suite.

**Requirements (4):** TEST-01 (Python seed CLI) · TEST-02 (Playwright suite) · TEST-03 (bootstrap runbook + scripts) · TEST-04 (invite-code happy-path spec)

**Success criteria:**
1. ≤ 5 commands from a clean clone produce a green Playwright report.
2. Re-running `uv run seed` does not double-insert recipes, votes, or cooking logs (idempotency proven).
3. Seeded household renders shortlist / vote chips / recipe detail / cooking log with realistic non-empty data covering all 5 computed vote states and at least 3 cooking-log ratings.
4. A regression introduced into a hot path (e.g. `frontend/components/ShortlistDeck.tsx` or `backend/app/routers/votes.py`) is caught by the suite.

**Canonical refs:**
- `SPEC.md` (root) — locked vocabularies, voting state machine, capture pipeline, auth scheme
- `.planning/PROJECT.md` — Current Milestone v0.2.1 section + key decisions
- `.planning/milestones/v0.2-REQUIREMENTS.md` — what shipped; defines screens that must be covered
- `.planning/milestones/v0.2-MILESTONE-AUDIT.md` — deferred items (POLISH-01/02) explicitly out of scope here
- `frontend/lib/enums.ts` + backend `Enum` classes (TBD path — discuss-phase will scout) — drift between these is the bug category to avoid; seed must import the Python enums

**Non-goals (explicit):**
- No product-code refactors during this phase
- No new product features
- No tests against Railway / Vercel / Supabase prod (local-only)
- No spec coverage for voice / photo / url capture if not wired (mark `test.fixme` + TODO)
- No CI integration, visual-regression, cross-browser, or perf testing in v0.2.1

## Next Steps

Once v0.2.1 ships:
- **Behavioral validation gate** per `SPEC.md`: ≥ 2 weeks of daily use by both household members.
- **v0.2.2 (optional)** — close remaining deferred items from `.planning/milestones/v0.2-MILESTONE-AUDIT.md` (POLISH-01 i18n sweep, POLISH-02 Copy button).
- **v1.0 — productize:** extract decisions for multi-household, OAuth, mobile-app shells, etc.
- **v0.3 — first new feature direction** (TBD via `/gsd-new-milestone` discovery).
