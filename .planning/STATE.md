# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-05)

**Core value:** Eliminate the daily "on mange quoi ?" debate via a shared library, async voting, and voice/photo capture — installable PWA on both iPhones with no App Store, no $99/year, no native build.
**Current focus:** Phase 1 — Foundations (W1)

## Current Position

Phase: 1 of 4 (Foundations — W1)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-05-05 — Roadmap created from SPEC.md W1–W4 build plan

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundations (W1) | 0/TBD | — | — |
| 2. LLM Capture (W2) | 0/TBD | — | — |
| 3. Decide (W3) | 0/TBD | — | — |
| 4. Polish (W4) | 0/TBD | — | — |

**Recent Trend:**
- Last 5 plans: —
- Trend: — (no execution yet)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- PWA + `next-pwa` over native iOS (zero-cost distribution; iOS share extension cut for paste-URL)
- Python (FastAPI) backend over Node (skill-fit + Gemini Python SDK is reference impl)
- Server-side `BackgroundTask` draft → structured promotion (single source of truth, no device-vs-device race)
- Voting state computed from `votes` rows (no `state` column to drift)
- 4 waves with dogfood gates between each (behavioral validation beats feature-completeness; W1 install-and-ping is the antidote to motivation drop at week 10–14)

### Pending Todos

None yet.

### Blockers/Concerns

- **W1 ping-test gate is mandatory before feature work:** SPEC.md "First concrete action" requires Vercel + Railway + Supabase + WebSocket round-trip on both phones before any feature UI ships. Plan 1 of Phase 1 should target this.
- **Next.js 16+ training-data drift:** Frontend may have breaking changes not in Claude's training data; consult `frontend/node_modules/next/dist/docs/` before writing frontend code (per CLAUDE.md).
- **REQ-ID tally discrepancy:** REQUIREMENTS.md states "46 total" but enumeration yields 52. Roadmap maps all 52; REQUIREMENTS.md tally was refreshed during this run.

## Session Continuity

Last session: 2026-05-05
Stopped at: Roadmap and state initialized; Phase 1 ready for `/gsd-plan-phase 1`
Resume file: None
