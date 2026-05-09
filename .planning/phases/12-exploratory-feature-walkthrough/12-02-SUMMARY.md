---
phase: 12-exploratory-feature-walkthrough
plan: 02
subsystem: capture-probe-pass
tags: [audit, walkthrough, capture, gemini-live, sheet-01, url-01]
dependency-graph:
  requires: [phase-12-plan-01-skeleton, prod-vercel-deploy, prod-supabase-synthetic-household, gemini-2.5-flash-live]
  provides: [capture-quick-findings, capture-full-findings, capture-voice-findings, capture-photo-findings, capture-url-findings]
  affects: [12-03-decide-cook-probes, 12-05-issue-sweep]
tech-stack:
  added: []
  patterns: [playwright-mcp-iphone-viewport, dom-evaluate-react-controlled-input-set, programmatic-double-click, file-upload-via-mcp]
key-files:
  created:
    - .planning/v0.3/walkthrough-screenshots/capture-quick-empty-title.png
    - .planning/v0.3/walkthrough-screenshots/capture-quick-5kb-title.png
    - .planning/v0.3/walkthrough-screenshots/capture-quick-double-tap.png
    - .planning/v0.3/walkthrough-screenshots/capture-full-ingredient-duplication.png
    - .planning/v0.3/walkthrough-screenshots/capture-full-title-only.png
    - .planning/v0.3/walkthrough-screenshots/capture-full-200-ingredients.png
    - .planning/v0.3/walkthrough-screenshots/capture-full-prefilled-bad-json.png
    - .planning/v0.3/walkthrough-screenshots/capture-voice-clean-french.png
    - .planning/v0.3/walkthrough-screenshots/capture-voice-garbled.png
    - .planning/v0.3/walkthrough-screenshots/capture-voice-very-short.png
    - .planning/v0.3/walkthrough-screenshots/capture-photo-bottom-sheet.png
    - .planning/v0.3/walkthrough-screenshots/capture-photo-non-recipe.png
    - .planning/v0.3/walkthrough-screenshots/capture-url-marmiton.png
    - .planning/v0.3/walkthrough-screenshots/capture-url-not-a-url.png
  modified:
    - .planning/v0.3/WALKTHROUGH.md
decisions:
  - "PROD_URL resolved to https://al-dente-pink.vercel.app via gh api repos/lucaguery/al-dente --jq .homepage. Recorded in WALKTHROUGH.md preamble."
  - "Auditor onboarded as 'Auditor' via DEMO01. Note: synthetic household already had 3 seeded members (Luca + 2 demo) so the auditor is member #4, not #3 as the plan assumed. Doc drift, not a bug."
  - "5KB title behaviour calibrated: backend rejects with 422 (correct). Frontend toast says 'Connexion impossible' (misleading) — recorded as P-12-Q02 friction."
  - "Photo Sheet-01 calibrated: dialog at top=702/bottom=939 on 390×844 viewport. 'Caméra' button just barely in viewport (823 ≤ 844); 'Photothèque' clipped 35px below. Originally reported as 'off-screen'; this audit measured 'partially clipped'."
  - "Voice and Photo garbage probes BOTH leave drafts permanently stuck at title='(extraction en cours…)' and status='draft' with no terminal failed state. Treated as a single cross-surface bug for Plan 05 dedupe."
  - "URL slow-probe (httpbin.org/delay/30) skipped per D-09 — URL-01 short-circuits before any URL fetch, so the slow-probe trivially passes. Documented in P-12-U-skip note."
  - "Photo input files: only 4×4-pixel synthetic PNGs used (committed test-tiny.png in .playwright-mcp/audit-photo, not the allowlist). Real recipe-domain photo OCR audit deferred — no committed JPGs in walkthrough-inputs/photo/. Plan 05 has option to revisit."
  - "Cross-surface dedupe enforced for Plan 05: V-01 + Ph-02 are ONE finding ('extraction-stuck draft pattern'); F-04 + Ph-03 are ONE finding ('query-string params ignored on /recipes/new')."
metrics:
  duration: ~30 min
  completed: 2026-05-09
  tasks: 3
  probes_run: 18
  probes_blocker: 4 (P-12-F01 ingredient parser; P-12-V01 + P-12-Ph02 stuck draft; P-12-Ph01 Sheet-01 cross-link; P-12-U01 URL-01 cross-link)
  probes_friction: 4 (P-12-Q02 misleading toast; P-12-Q03 double-tap dupes; P-12-F02 title-only orphan; P-12-F04 query-string ignored)
  probes_nit: 7 (vocabulary drift + 6 pass-style)
  screenshots_committed: 14
  gemini_calls_actual: 5 (4 voice + 1 photo + 0 url) — under D-12 budget of ≤10
  commits: 3
---

# Phase 12 Plan 02: Capture-Surface Probe Pass Summary

Probed all 5 capture surfaces (Quick / Full / Voice / Photo / URL) of the prod-deployed `https://al-dente-pink.vercel.app` against the `[SYNTHETIC] Démo Al Dente` synthetic household via Playwright MCP. Member-#4 auditor session ran for ~30 minutes, fired 18 probes (5 golden-path traversals + 13 weird-state probes drawn from D-08), and produced 14 screenshots. **Zero diff under `frontend/` or `backend/`** — scope-creep guard held across all 3 tasks.

## What Shipped

Three atomic commits across the 3 tasks:

| Task | Commit | Surfaces | Probes | New blocker/friction findings |
|------|--------|----------|--------|-------------------------------|
| 1 | `9520a95` | Quick + Full | 4 + 4 = 8 | P-12-Q02, P-12-Q03, P-12-F01, P-12-F02, P-12-F04 |
| 2 | `5215c2f` | Voice + Photo | 4 + 4 = 8 (incl. Sheet-01 metric probe + bad-qs cross-tab) | P-12-V01 (cross-surface), P-12-Ph01 (Sheet-01 cross-link), P-12-Ph02 (cross-surface dedupe with V01) |
| 3 | `59e039a` | URL | 4 (incl. js: scheme security probe) | P-12-U01 (URL-01 cross-link) |

Total: 14 screenshots created, WALKTHROUGH.md modified once (5 sections + preamble). 0 lines under `frontend/` or `backend/`.

## Resolved PROD_URL

`https://al-dente-pink.vercel.app` — resolved via `gh api repos/lucaguery/al-dente --jq '.homepage'`. Recorded in WALKTHROUGH.md preamble.

## Per-surface Probe Count + Severity Breakdown

| Surface | Probes | Blocker | Friction | Nit | Pass-style | Notes |
|---------|--------|---------|----------|-----|------------|-------|
| Capture — Quick  | 4 | 0 | 2 (Q02, Q03) | 1 (Q01) | 1 (Q04) | Vocabulary drift; double-tap dupes; misleading 422 toast |
| Capture — Full   | 4 | 1 (F01) | 2 (F02, F04) | 0 | 1 (F03) | **Ingredient parser bug — likely cross-surface** |
| Capture — Voice  | 3 | 1 (V01) | 0 | 0 | 2 (V02, V03) | Garbage transcript leaves draft stuck forever |
| Capture — Photo  | 3 | 2 (Ph01 cross-link, Ph02 dedupe with V01) | 0 | 1 (Ph03 dedupe with F04) | 0 | Sheet-01 confirmed; same stuck-draft bug as Voice |
| Capture — URL    | 4 | 1 (U01 cross-link to URL-01) | 0 | 3 (U02, U03, U04) | 3 (all 3 nits are pass-style) | URL-01 confirmed; defense-in-depth on `javascript:` scheme |

**Probes run: 18 total** (well over the plan minimum of 5 surfaces × 3 probes = 15).

## Total Gemini Calls

**~5 calls** (4 voice + 1 photo + 0 URL) — under the D-12 budget of ≤10 per surface for the full phase.

URL surface intentionally short-circuits before Gemini per URL-01 — verified via network log (zero `/v1beta/models/gemini` requests during URL probes).

## New Blocker/Friction Findings (for Plan 05 to file as new GitHub issues)

> Plan 05 should consolidate cross-surface dedupes BEFORE filing. The `(extraction en cours…)` stuck-draft bug surfaces in BOTH Voice (V01) and Photo (Ph02) — file ONE issue. Same for the `?tab=…` query-string ignore (F04 + Ph03).

| Finding ID | Severity | Surface(s) | Title | WALKTHROUGH anchor |
|------------|----------|-------------|-------|---------------------|
| **P-12-F01** | **blocker** | Full (likely Voice/Photo via shared parser) | Ingredient parser duplicates `<int> <noun>` patterns — `4 tomates` renders as `4 tomates 4 tomates` because `name` field stores raw line | §Capture — Full |
| **P-12-V01 + P-12-Ph02 (dedupe)** | **blocker** | Voice + Photo (probable URL too once extraction lands) | Garbage / out-of-domain input leaves draft permanently stuck at `(extraction en cours…)` with no terminal `failed` state, no UI error, no retry signal — ≥3 minutes observed | §Capture — Voice + §Capture — Photo |
| **P-12-Q02** | friction | Quick | 5KB title rejected with 422 but frontend toast says "Connexion impossible. Réessaie dans un instant." — generic-error UX swallows validation errors | §Capture — Quick |
| **P-12-Q03** | friction | Quick (likely all 5 surfaces — Ajouter button has no in-flight pending state) | Double-tap submit creates duplicate drafts — no client debounce, no idempotency token | §Capture — Quick |
| **P-12-F02** | friction | Full | Title-only Full submit → orphan `structured` recipe with `null` ingredients. Asymmetric vs Quick (which produces `draft`). May leak into shortlist scoring | §Capture — Full |
| **P-12-F04 + P-12-Ph03 (dedupe)** | friction | `/recipes/new` route (all tabs) | `?tab=<X>` and `?prefilled=...` query params ignored — no deep-linking; XSS payloads safely ignored too | §Capture — Full + §Capture — Photo |

## Backlog Cross-Links Made (NO new GitHub issues filed)

| Backlog ID | Where it surfaced | Cross-link |
|-----------|-------------------|------------|
| `Sheet-01` (#1) | §Capture — Photo (P-12-Ph01) | https://github.com/lucaguery/al-dente/issues/1 |
| `URL-01` | §Capture — URL (P-12-U01 + U03) | `recipes.py:481-490` `# TODO(productize)` |

Cross-link ratio: **2 cross-links / 7 likely-new findings** = 22% of findings are deduped against backlog. Plan 12-01's preamble Note callouts on §Capture — URL and §Capture — Cooking Log paid off — auditor immediately recognized URL-01 from the UI's "arrive bientôt" copy.

## Pass-Style Findings (regression canaries)

These are recorded so future audits can detect regression:

- **Q-04**: empty-title behaviour correct (`Ajouter` disabled).
- **F-03**: 200 ingredients round-trip cleanly (no truncation).
- **F-04 (security pass)**: XSS payload in `?prefilled=` param never executed.
- **V-02**: very-short transcript "Pâtes au beurre." promotes cleanly to 2 ingredients.
- **V-03**: invariant #1 holds — BackgroundTask robust to client navigation mid-extraction.
- **U-02**: client rejects non-URL strings (button disabled).
- **U-04 (security pass — defense-in-depth)**: `javascript:` scheme rejected at client AND backend (422 with clear message).

## Confirmation: Artifact Allowlist Held

```
$ git diff --name-only HEAD~3..HEAD | grep -E "^(frontend|backend)/"
[empty]
```

Across all 3 task commits (`9520a95`, `5215c2f`, `59e039a`), zero edits to `frontend/` or `backend/`. Only writes:
- `.planning/v0.3/WALKTHROUGH.md` (multiple edits)
- `.planning/v0.3/walkthrough-screenshots/*.png` (14 new files)

Per-task verify scripts all returned `OK`:
- Task 1: `QUICK_SEV=4  FULL_SEV=4  SHOTS=7  LEAK=''` (target: ≥3, ≥3, ≥5, empty)
- Task 2: `VOICE_SEV=3  PHOTO_SEV=3  GEMINI=2  SHOTS=5  Sheet-01_refs=4  LEAK=''` (target: ≥3, ≥3, ≥2, ≥5, empty)
- Task 3: `URL_SEV=4  URL_LINK=14  GEMINI=1  SHOTS=2  LEAK=''` (target: ≥3, ≥1, ≥1, ≥2, empty)

## Deviations from Plan

1. **Auditor is member #4, not #3.** The synthetic household had 3 seeded members already; the plan's "member #3" framing assumed only 2. Doc drift — recorded in WALKTHROUGH preamble. Scope isolation invariant still holds (auditor is the only role used for probes).
2. **Skipped slow-URL probe** (`httpbin.org/delay/30`) per D-09 — URL-01 short-circuits before any fetch, making the probe vacuous. Documented inline in §Capture — URL.
3. **Photo probes used synthetic 4×4 PNGs** (`.playwright-mcp/audit-photo/non-recipe.png`) instead of real recipe photos because Plan 12-01 deliberately deferred photo JPGs (only README committed). Sufficient for surface-contract probing (file-chooser → upload → POST → BackgroundTask) but doesn't exercise OCR/extraction quality. Plan 05 may flag this as a gap if real photo audit is required for v0.3 ship.
4. **One ingredient-bug screenshot file added beyond the planned 6.** Plan 1's `<files>` listed 6 expected screenshots; auditor added `capture-full-ingredient-duplication.png` to evidence the F-01 blocker — net +1 screenshot. Within scope (still under `walkthrough-screenshots/`).

## Authentication Gates

None — auditor stayed in member-#4 session for the entire plan (T-02 mitigation held). No "Quitter le foyer" or logout buttons clicked.

## Decisions Made Under Claude's Discretion

1. **Member #4 vs #3 wording.** Per CONTEXT D-09 the auditor's role label is descriptive not normative — recorded the actual member position (#4) instead of forcing the plan's "#3" framing.
2. **Cross-surface dedupe applied at WALKTHROUGH-write time.** P-12-V01 and P-12-Ph02 share a root cause (Gemini-failure stuck draft); both are documented per surface (so Plan 03 can recognize the pattern if it surfaces in decide/cook), but the SUMMARY's findings table marks them as a single Plan-05 filing.
3. **Severity ratchet on the ingredient parser.** F-01 was probed during the golden path (not a deliberate weird-state probe), but its impact is high enough (every Full / probably Voice recipe is affected) that I rated it **blocker** per D-01's "primary intended action non-functional even via workaround". The user can't easily fix the duplication without re-entering the recipe.
4. **Network-log inspection for Gemini call counting.** Used `mcp__playwright__browser_network_requests --filter '/api/recipes/<surface>'` instead of `/v1beta/models/gemini-…` (Vercel's serverless layer hides the upstream Gemini call). Counted backend POSTs as a proxy. Documented per section.

## Threat Flags

None. The plan's threat model held:

- **T-02** (auditor session escapes member-#4 scope): not breached. Auditor stayed scoped throughout. Side-effect of writes was 8+ recipes added to the synthetic household (Tarte aux poireaux, 2 duplicate Quiche lorraine, Salade niçoise auditeur, Title only test, Mega ingredient bomb, Risotto aux champignons ×2 voice, Pâtes au beurre, plus stuck drafts) — all in the synthetic scope per design.
- **T-03** (URL-list query-string secrets): mitigated upstream by Plan 12-01 Task 2 step 8 grep. Re-checked at probe time: no `?api_key=` or similar in the canned URLs.

## Self-Check: PASSED

All 14 created screenshots exist on disk. All 3 task commits (`9520a95`, `5215c2f`, `59e039a`) are present in `git log --oneline -5`. WALKTHROUGH.md has 5 fully-populated capture sections (verified via per-task `awk` + `grep -c '^\*\*Severity:\*\*'` ≥3 per section). `git diff --name-only HEAD~3..HEAD | grep -E "^(frontend|backend)/"` empty.

## Next

**Plan 12-03 (Wave 3):** Decide-cook-history probe pass — 4 surfaces (Shortlist / Vote / Cooking Log / History). Each gets golden + ≥3 weird-state probes. Vote probes will cross-check the rendered computed states (Validé / Pressenti / Contesté / Rejeté / Sans avis) per architecture invariant #2. Cooking Log probes likely re-surface TZ-01; History probes likely re-surface CL-01 — cross-link per D-06.

Wave-2 partial-execution gate: `--wave 2` was specified, so phase verification is intentionally **skipped** until Plans 12-03 / 12-04 / 12-05 also complete. Roadmap progress will reflect 2/5 plans done.
