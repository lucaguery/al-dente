---
quick_id: 260518-kba
slug: ui-walkthrough-punch-list
date: 2026-05-18
status: in_progress
description: Playwright MCP walkthrough of al-dente — observation-only punch list (bugs / UI polish / design-system drift)
---

# Quick Task — UI Walkthrough Punch List

## Goal

Walk through the al-dente app via Playwright MCP and produce a single
categorized punch-list document. **Observation only — do not modify any
source files in this pass.**

## Locked decisions (from AskUserQuestion 2026-05-18)

| Question | Choice |
| --- | --- |
| Target environment | Local dev (`npm run dev` + uvicorn in test mode) |
| Auth path | Test household from `uv run seed` (cookie `aldente_auth=test-token-luca`) |
| Execution shape | Subagent (general-purpose) — keep Playwright snapshots out of main context |
| Coverage scope | All primary surfaces — locked screens + 5 capture surfaces + voting + cooking log + settings |

## Output

`.planning/quick/260518-kba-ui-walkthrough-punch-list/PUNCH-LIST.md` with
three sections:

1. **Bugs / Broken behavior** — anything that doesn't work or returns an
   error. Severity (P0/P1/P2/P3), reproduction steps, expected vs actual.
2. **UI Polish** — spacing, alignment, motion, microcopy, empty states.
   Each item references the screen and the specific element.
3. **Design-system drift** — deviations from `docs/design-system.html`
   (Sober Kitchen tokens: terracotta sober, Cormorant + Caveat, patine
   cards, table-à-manger voting, marginalia register, brand-mark loader,
   locked Accueil/Bibliothèque/Recette screens).

## Constraints

- **No edits to source files** — observation only.
- All evidence is a Playwright accessibility snapshot or screenshot;
  no claims without snapshot evidence.
- Surfaces walked must include: Accueil (landing/home), Bibliothèque (recipe
  library), Recette detail, all 5 capture entry points (`quick`, full-form,
  `voice`, `photo`, `url`), voting / table-à-manger view, cooking-log
  create + history, settings/profile.

## Sequencing

1. Test postgres up (docker compose), alembic upgrade head, backend (test
   mode) + frontend dev servers running in background.
2. `uv run seed` populates the fixtures (household TEST01, 21 recipes, …).
3. Spawn `general-purpose` subagent with explicit allow-list of
   `mcp__playwright__*` tools + Read; produces `PUNCH-LIST.md` and returns a
   short summary.
4. Main context reads `PUNCH-LIST.md`, writes `SUMMARY.md`, updates
   `.planning/STATE.md` Quick Tasks Completed table, atomic commit.

## Risks / known unknowns

- WebSocket reconnect / realtime drift won't be exercised in a single-user
  walkthrough — flag for follow-up.
- Photo capture surface requires file upload; subagent must use
  `browser_file_upload` against `backend/app/cli/synthetic_photos/`.
- Voice capture surface depends on `MediaRecorder` — Playwright will likely
  surface the unsupported-codec fallback, which is fine to document.
