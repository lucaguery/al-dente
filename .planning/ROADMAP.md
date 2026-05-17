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

_No active milestone — see `.planning/PROJECT.md` for next-milestone scoping. Start with `/gsd-new-milestone`._

## Progress

| Milestone | Phases | Plans | Status | Completed |
|-----------|--------|-------|--------|-----------|
| v0.1 (W1-W4 + 01.1) | 5 | 31 | ✅ Complete | 2026-05-08 |
| v0.2 (Phases 5-9) | 5 | 26 | ✅ Complete | 2026-05-08 |
| v0.2.1 (Phase 10) | 1 | 7 | ✅ Complete | 2026-05-09 |
| v0.3 (Phases 11-14) | 4 | 16 | ✅ Complete | 2026-05-11 |
| v0.4 (Phases 15-21) | 7 | 27 | ✅ Complete | 2026-05-11 |
| v0.5 (Phases 22-24) | 3 | 9 | ✅ Complete | 2026-05-13 |
| v0.6 (Phases 25-29) | 5 | 22 | ✅ Complete | 2026-05-17 |

**Cumulative:** 7 milestones · 30 phases · 138 plans shipped.

---

*Last updated: 2026-05-17 — v0.6 Conversation Capture milestone archived. ROADMAP.md collapsed to one-liner per shipped milestone; full v0.6 phase detail lives in `.planning/milestones/v0.6-ROADMAP.md`. No active milestone — next step is `/gsd-new-milestone`.*
