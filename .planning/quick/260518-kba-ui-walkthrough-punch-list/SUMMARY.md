---
quick_id: 260518-kba
slug: ui-walkthrough-punch-list
date: 2026-05-18
status: complete
description: Playwright MCP walkthrough of al-dente — observation-only punch list (bugs / UI polish / design-system drift)
findings_total: 25
findings_bugs: 10
findings_polish: 7
findings_design_drift: 8
biggest_issue: B-03 — Voilà-ce-que-j'ai-compris bubble leaks raw Python dict repr + raw enum keys to the user on every URL/photo/voice capture
---

# Quick Task Summary

## What was done

Walked all primary surfaces of al-dente in local dev (test postgres + uvicorn
in `ENVIRONMENT=test` + Next.js dev) with the seed fixtures loaded
(`uv run seed`). Drove the app with Playwright MCP through a `general-purpose`
subagent at iPhone viewport (390×844), authenticated as Luca via the
`aldente_auth=test-token-luca` cookie. Produced a categorized
`PUNCH-LIST.md` with screenshot + a11y-snapshot evidence in
`.scratch/walkthrough/`.

## Headline findings

| Category | Count |
| --- | --- |
| Bugs / broken behavior | 10 (0 P0 / 5 P1 / 3 P2 / 2 P3) |
| UI polish | 7 |
| Design-system drift | 8 |

**Single biggest issue:** B-03 — the "Voilà ce que j'ai compris" advisory bubble
that surfaces after every URL / photo / voice capture renders raw enum keys
(`difficulté: medium`, `cuisine: italian`, `protéine: none`) and even a Python
`dict` repr for ingredients (`{'name': 'riz arborio', 'quantity': 300.0,
'unit': 'g'}`). This is the first thing a user sees after capturing — it
breaks the Sober Kitchen register hard.

**Systemic issues:**

1. **Raw enum keys leak across surfaces** — v0.5 Phase 22 QW-03 wrapped
   `ShortlistCard.tsx` + `recipes/[id]/page.tsx` with `useEnumLabels`, but
   `RecipeCard.tsx` (Bibliothèque grid), the post-vote Accueil ledger meta
   rows, and `SystemBubble.tsx`'s summary branch were missed. B-03 / B-04 /
   B-05 are all instances of the same root cause.
2. **Sober Kitchen port (gh#29) is partial** — Composition A ledger only
   renders post-vote (D-03), Bibliothèque Patine view is blank (B-06 + D-08),
   table-à-manger seat geometry not visibly shipped (D-06), BottomNav central
   CTA not visibly elevated above siblings despite Phase 31 (D-01).
3. **Locked `docs/design-system.html` is out of date** — still references
   5-tab BottomNav with "Réception" tab even though Phase 27 collapsed
   drafts into the thread (D-02).

## Out-of-scope but flagged

- B-02 (photo signed-URL 500) is likely a local-seed gap (synthetic photos in
  DB but no bytes in Storage) — **worth verifying prod is unaffected** before
  dismissing.
- Voice + Photo capture paths weren't fully exercised — Playwright
  `MediaRecorder` not viable + file-upload sheet needs a triggered upload
  step. Document in tooling notes for a future `uat-tester` agent.

## Was a `uat-tester` agent worth it?

Yes — this run produced concrete, reusable tooling notes (cookie incantation,
correct API plural routing, `browser_evaluate` async pattern, snapshot depth
sweet spot, MediaRecorder polyfill prerequisite). A dedicated agent that
takes (surface_list, seed_state, auth_cookie) and emits a punch list in this
exact format would slot in cleanly. Recommend creating it after triaging
this run's findings so the agent's spec captures what actually worked.

## Files produced

- `.planning/quick/260518-kba-ui-walkthrough-punch-list/PLAN.md`
- `.planning/quick/260518-kba-ui-walkthrough-punch-list/PUNCH-LIST.md` (245 lines)
- `.planning/quick/260518-kba-ui-walkthrough-punch-list/SUMMARY.md` (this file)
- `.scratch/walkthrough/*.png` (10 screenshots — NOT committed)

## Dev stack state

Left running at user's preference for follow-up exploration:
- `aldente-postgres-test` docker container on `localhost:5433`
- Backend uvicorn (test mode) on `localhost:8000` (background id `bo25nh9wc`)
- Frontend Next.js dev on `localhost:3000` (background id `b3hcnxdjk`)
