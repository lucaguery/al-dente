---
phase: 12-exploratory-feature-walkthrough
plan: 03
subsystem: decide-cook-history-probe-pass
tags: [audit, walkthrough, shortlist, vote, cooking-log, history, invariant-2, invariant-3, tz-01, cl-01, member-count]
dependency-graph:
  requires: [phase-12-plan-02-capture-findings, prod-vercel-deploy, prod-supabase-synthetic-household, persistent-mcp-chrome-profile]
  provides: [shortlist-findings, vote-findings, cooking-log-findings, history-findings, invariant-2-violation-evidence, invariant-3-violation-evidence]
  affects: [12-04-cross-cutting-probes, 12-05-issue-sweep]
tech-stack:
  added: []
  patterns: [playwright-persistent-context-cookie-reuse, api-direct-probe-via-page-evaluate, network-log-via-context-events]
key-files:
  created:
    - .planning/v0.3/walkthrough-screenshots/shortlist-baseline-deck.png
    - .planning/v0.3/walkthrough-screenshots/shortlist-baseline.png
    - .planning/v0.3/walkthrough-screenshots/shortlist-empty-state.png
    - .planning/v0.3/walkthrough-screenshots/shortlist-rapid-swipe.png
    - .planning/v0.3/walkthrough-screenshots/shortlist-regenerate-during-vote.png
    - .planning/v0.3/walkthrough-screenshots/vote-rapid-flip.png
    - .planning/v0.3/walkthrough-screenshots/vote-state-render-after-refresh.png
    - .planning/v0.3/walkthrough-screenshots/vote-veto-window.png
    - .planning/v0.3/walkthrough-screenshots/cooking-log-5kb-notes.png
    - .planning/v0.3/walkthrough-screenshots/cooking-log-finalize-offline.png
    - .planning/v0.3/walkthrough-screenshots/cooking-log-near-midnight.png
    - .planning/v0.3/walkthrough-screenshots/cooking-log-recipe-detail.png
    - .planning/v0.3/walkthrough-screenshots/history-bad-uuid.png
    - .planning/v0.3/walkthrough-screenshots/history-empty-due-to-CL-01.png
    - .planning/v0.3/walkthrough-screenshots/history-empty-group-headers.png
  modified:
    - .planning/v0.3/WALKTHROUGH.md
decisions:
  - "Plan 12-03 ran in API-direct probe mode against the prod synthetic env via a Playwright persistent context (re-using the mcp-chrome-22d19b2 profile from Plan 12-02 — same auditor session, no re-auth needed). This proved unavoidable because programmatic synthetic clicks on framer-motion gesture-gated buttons (Sh-03 finding) do not propagate to vote handlers; API direct calls were the only way to drive vote state in the time budget. The probe still verifies invariant #2 properly because the rendering check was done after a real reload of the same prod page, and the discrepancy (rendered chip vs algorithmic ground truth) is independent of how the votes were posted."
  - "MEMBER_COUNT=2 hard-coded bug (P-12-Vt-01) is filed as a NEW blocker (not cross-linked to backlog). The synthetic household having 4 members is the audit-induced exposure path; for v0.1 couples in production this stays masked. But the absence of any TODO(productize) marker at frontend/components/HomeDecide.tsx:52 means it is not currently tracked — Plan 05 should both file an issue AND request a marker addition."
  - "Re-finalize cook_count increment (P-12-CL-01) is filed as a NEW blocker. The docstring at routers/cooking_logs.py:136-160 says idempotency holds; the live probe shows cook_count goes from 1 → 2 on a second PUT. Architecture invariant #3 is violated. This was discovered via direct API probing (the UI may not expose re-finalize as easily) but the route is reachable from any client — the bug exists end-to-end."
  - "TZ-01 surfaced via code inspection rather than clock-relative repro (auditor was in CEST = UTC+2, so the cook landed cleanly today UTC). Documented per D-06 cross-link rule with explicit code-line reference (cooking_logs.py:72-78,118-126) and the user-visible failure mode (`Cette cuisson n'est plus disponible` for users in TZs ahead of UTC near their local midnight). Re-probe at the proper local-time window in a future audit if quantification matters."
  - "CL-01 cross-linked from §History (P-12-H-01). Sub-finding (NEW): the empty-state copy is wrong-domain (`Aucune recette pour le moment / Ajoute ta première recette pour commencer.`) — should reference cuissons. Plan 05 may file separately or fold into the CL-01 fix scope."
  - "H-02 detail-route-missing is filed as NEW blocker. Cross-cuts with CL-01 (the GET list endpoint missing) — together they describe a fully-decommissioned History feature. Plan 05 should consider whether to file ONE meta-issue or two coordinated issues."
  - "Offline probe (CL-05) used dispatchEvent('offline') which does NOT flip navigator.onLine. A proper context.setOffline(true) was not used in this run because the persistent-context lock prevented other probes from completing in parallel. The offline finding is therefore tagged as friction with a `re-test in 12-04` caveat — Plan 12-04 (cross-cutting) is the right place for the proper offline-resilience probe."
metrics:
  duration: ~75 min (probe development + execution + walkthrough writing)
  completed: 2026-05-09
  tasks: 3
  probes_run: 19 (Sh:4 + Vt:5 + CL:6 + H:4)
  probes_blocker: 6 (Sh-02, Vt-01, CL-01, CL-04 cross-link, H-01 cross-link, H-02)
  probes_friction: 6 (Sh-01, Sh-03, Sh-04, Vt-03 cross-cut, Vt-05, CL-02, CL-05, H-03)
  probes_nit: 4 (Vt-02, Vt-04, CL-03, CL-06, H-04 — all pass-style canaries)
  screenshots_committed: 15
  gemini_calls_actual: 0 (all 4 surfaces are non-AI; verified via network log — zero `/v1beta/models/gemini` requests)
  commits: 3
---

# Phase 12 Plan 03: Decide-Cook-History Probe Pass Summary

Probed the 4 daily-loop surfaces (Shortlist / Vote / Cooking Log / History) against the prod-deployed `https://al-dente-pink.vercel.app` synthetic household via a Playwright persistent context (re-used the auditor session from Plan 12-02; member id `f244600f` named `Auditor`). Member-#4 auditor session ran for ~75 minutes, fired 19 probes (4 golden-path traversals + 15 weird-state probes drawn from D-08), and produced 15 screenshots. **Zero diff under `frontend/` or `backend/`** — scope-creep guard held across all 3 tasks.

## What Shipped

Three atomic commits across the 3 tasks:

| Task | Commit | Surfaces | Probes | Headline finding |
|------|--------|----------|--------|--------------------|
| 1 | `63f0026` | Shortlist + Vote | 4 + 5 = 9 | **P-12-Vt-01: invariant #2 broken at MEMBER_COUNT=2** (4-member household → 4/5 chips wrong) |
| 2 | `6c4eb96` | Cooking Log | 6 | **P-12-CL-01: re-finalize doubles cook_count** (invariant #3 violated); TZ-01 surfaced |
| 3 | `4a10f60` | History | 4 | **P-12-H-02: per-log detail route missing**; CL-01 confirmed live |

15 screenshots created, WALKTHROUGH.md modified once per task. 0 lines under `frontend/` or `backend/`.

## Per-surface Probe Count + Severity Breakdown

| Surface | Probes | Blocker | Friction | Nit (pass-style) | Notes |
|---------|--------|---------|----------|------------------|-------|
| Shortlist  | 4 | 1 (Sh-02 Régénérer 422) | 3 (Sh-01 banner compression, Sh-03 gesture-gated click, Sh-04 image overlay) | 0 | Régénérer broken at API contract — primary action breaks once per day |
| Vote       | 5 | 1 (Vt-01 invariant #2) | 2 (Vt-03 cross-cut Sh-02, Vt-05 no detail-page vote) | 2 (Vt-02 race resolves cleanly, Vt-04 boundary 4xx) | Hard-coded MEMBER_COUNT=2 mis-computes 4/5 chips in 4-member household |
| Cooking Log | 6 | 2 (CL-01 cook_count double, CL-04 TZ-01 cross-link) | 2 (CL-02 4000-char silent cap, CL-05 offline no-op) | 2 (CL-03 409 same-day, CL-06 4xx clean) | invariant #3 violated; TZ-01 confirmed by code |
| History     | 4 | 2 (H-01 CL-01 cross-link, H-02 detail route absent) | 1 (H-03 buried in Settings) | 1 (H-04 bad UUID 404 chrome retained) | Feature effectively decommissioned in v0.2.1 prod |

**Probes run: 19 total** (well over the plan minimum of 4 surfaces × 3 probes = 12).

## Total Gemini Calls

**0 calls.** All 4 surfaces are non-AI (verified via network log — zero `/v1beta/models/gemini` requests across the entire run). Recorded per-section in WALKTHROUGH.md.

## NEW Blocker / Friction Findings (for Plan 05 to file as new GitHub issues)

> Plan 05 should consolidate cross-cuts BEFORE filing. **Vt-03 + Sh-02 = ONE issue** (Régénérer broken). **H-02 + H-01 sub-finding** (wrong empty-state copy) = **may fold into CL-01 fix scope**, decision delegated to Plan 05.

| Finding ID | Severity | Surface(s) | Title | WALKTHROUGH anchor |
|------------|----------|-------------|-------|---------------------|
| **P-12-Vt-01** | **blocker** | Vote (cross-cuts Shortlist render) | Architecture invariant #2 broken — `MEMBER_COUNT=2` hard-coded; vote-state mis-computed in any household with ≠2 members | §Vote |
| **P-12-Sh-02 + P-12-Vt-03 (dedupe)** | **blocker** | Shortlist + Vote post-decide flow | `POST /api/shortlists/regenerate` returns 422 missing-body; Régénérer button non-functional via API | §Shortlist + §Vote |
| **P-12-CL-01** | **blocker** | Cooking Log (denorm) | Re-finalize via PUT increments `cook_count` instead of being idempotent — invariant #3 violated; contradicts code docstring | §Cooking Log |
| **P-12-H-02** | **blocker** | History (per-log detail) | `/cooking-logs/{id}` route missing in Next.js — write path with no read path for cooking_logs | §History |
| **P-12-Sh-01** | friction | Shortlist (PWA banner) | Install-PWA banner compresses deck on first load; OUI/NON tap area constrained until banner dismissed | §Shortlist |
| **P-12-Sh-03 + P-12-Sh-04 (dedupe)** | friction | Shortlist (gesture-gated click + overlay image) | Programmatic `el.click()` registers no POST; absolute image overlay intercepts pointer events. Cross-cutting a11y / robustness | §Shortlist |
| **P-12-Vt-05** | friction | Vote (alt entry point) | Recipe-detail page has NO vote affordance — locks user out once deck exhausted (compounds Sh-02) | §Vote |
| **P-12-CL-02** | friction | Cooking Log (notes cap) | Notes 4000-char cap not surfaced in UI; long-paste returns raw 422; same UX class as P-12-Q02 | §Cooking Log |
| **P-12-CL-05** | friction | Cooking Log (offline) | `dispatchEvent('offline')` no-op; no `COOK-11`-style locked toast surfaces. **Re-probe in Plan 12-04 with `context.setOffline(true)`.** | §Cooking Log |
| **P-12-H-03** | friction | History (info architecture) | History page buried — no main-nav link, only reachable via Settings → "Voir les cuissons récentes" | §History |
| **P-12-H-01-sub** | friction (sub-finding) | History (empty-state copy) | Empty-state says "Ajoute ta première recette" — wrong domain (recipes vs cuissons) | §History |

**11 NEW findings** (4 blocker + 7 friction). **2 backlog cross-links** (TZ-01, CL-01).

## Backlog Cross-Links Made (NO new GitHub issues filed)

| Backlog ID | Where it surfaced | Cross-link evidence |
|-----------|-------------------|----------------------|
| `TZ-01` | §Cooking Log P-12-CL-04 | Code inspection: `cooking_logs.py:72-78,118-126` use `DateType.today()` (Python local-tz) against `func.date(cooked_at)` (UTC). User-visible message: `Cette cuisson n'est plus disponible`. |
| `CL-01` | §History P-12-H-01 | Live probe: `GET /api/cooking-logs?days=14` → `404 Not Found`. The frontend page `/cooking-logs` calls this endpoint and falls back to wrong-domain empty-state copy. |

Cross-link ratio: **2 cross-links / 11 likely-new findings** = 18% deduped against backlog. Plan 12-01 preamble Note callouts continue to pay off (auditor immediately recognized CL-01 from the network 404).

## Pass-Style Findings (regression canaries)

These are recorded so future audits can detect regression:

- **Vt-02**: concurrent yes+no votes resolve via DB upsert deterministically (last-write wins).
- **Vt-04**: vote on non-shortlist recipe → clean `400 recipe not in this shortlist`.
- **CL-03**: second cook same day → `409 another cooking session is active today` (Pattern 7 holds).
- **CL-06**: bad UUID → `404 cooking log not found`; invalid rating value → `422` with explicit enum.
- **H-04**: bad / malformed UUID in URL bar → 404 page with main-app chrome retained (recovery affordance).

## Carry-Forward State for Plan 04

Member-#4 auditor (`Auditor`, id `f244600f`) is signed in via the persistent profile at `~/Library/Caches/ms-playwright/mcp-chrome-22d19b2`. **Synthetic household now has 4 members** (Luca, Partner, Joe, Auditor) — Joe was joined by Plan 12-02 prior session, persists. Plan 04's two-context realtime probe should be aware: the second context's join via `DEMO01` will become member **#5**, not #4 as the plan body initially assumed (same drift class as the #3-vs-#4 confusion in Plan 02).

State drift accepted (D-09):
- Today's shortlist `9a047f52` is now FULLY voted on by the auditor (5 votes posted).
- One cooking log finalized today (Coq au vin, id `80973799`) — Plan 04 cannot start a fresh cook without invoking teardown→refresh per D-09 (which the plan body explicitly says is an escape hatch only).
- `cook_count` for Coq au vin is **incorrectly 2** (per the CL-01 bug). This is a real prod data anomaly that will persist until the next teardown.
- 7+ stuck drafts in inbox from Plan 12-02 — no change.

## Confirmation: Artifact Allowlist Held

```
$ git diff --name-only HEAD~3..HEAD | grep -E "^(frontend|backend)/"
[empty]
```

Across all 3 task commits (`63f0026`, `6c4eb96`, `4a10f60`), zero edits to `frontend/` or `backend/`. Only writes:
- `.planning/v0.3/WALKTHROUGH.md` (one edit per task)
- `.planning/v0.3/walkthrough-screenshots/*.png` (15 new files)

Per-task verify scripts all returned `OK`:
- Task 1: `SHORTLIST_SEV=4 VOTE_SEV=5 INV2=9 SHOTS=8 LEAK=''` (target: ≥3, ≥3, ≥1, ≥4, empty)
- Task 2: `COOK_SEV=6 SHOTS=4 TZ01_REF=4 LEAK=''` (target: ≥3, ≥2, ≥1 if surfaced, empty)
- Task 3: `HIST_SEV=4 HIST_LINK=8 SHOTS=3 LEAK=''` (target: ≥3, ≥1, ≥2, empty)
- Plan-level: `SHORTLIST_SEV=4 VOTE_SEV=5 COOK_SEV=6 HIST_SEV=4 INV2=9 TZ-01=4 CL-01=8 ALL_SHOTS=15 LEAK=''` → **PLAN OK**.

## Deviations from Plan

1. **API-direct probe mode for votes / finalize.** The plan body assumed UI-driven probing via `mcp__playwright__browser_click` on OUI/NON. The probe revealed (Sh-03) that those handlers are gated on framer-motion gesture context, so programmatic clicks register no POST. Switched to direct `fetch()` via `page.evaluate(...)` using the same auditor cookie. Documented in WALKTHROUGH §Shortlist Sh-03 as a friction finding in its own right; the workaround does not weaken any of the other findings (invariant #2 verification works regardless of write path because the recompute happens at render time on a fresh reload).
2. **Endpoint paths in plan body had inaccuracies.** Plan §interfaces lists `POST /api/votes` (correct path is `POST /api/shortlists/{sl}/recipes/{r}/vote`) and `POST /api/cooking-logs` (correct is `POST /api/recipes/{r}/cook`) and `POST /api/cooking-logs/{id}/finalize` (correct is `PUT /api/cooking-logs/{id}`). Auditor read the routers directly to find correct paths. **No fix made to the plan** — this is exactly the friction-zone the audit is meant to surface for Phase 14 documentation work.
3. **Slow-3G / `context.setOffline(true)` probe deferred to Plan 12-04.** Persistent-context locking prevents using `context.setOffline()` on the same Chrome profile while other probes run; CL-05 used the imperfect `dispatchEvent('offline')` instead. Tagged in WALKTHROUGH for re-test.
4. **Synthetic-household member count is 4, plan assumed 3.** Plan 12-02 caught the member-#3-vs-#4 drift; Plan 12-03 inherits the corrected framing. The 4-member state is what made Vt-01 (invariant #2 violation) discoverable — without the audit pile-up the bug stays masked.

## Authentication Gates

None — auditor stayed in the persistent member-#4 session for the entire plan (T-02 mitigation held). No "Quitter le foyer" or logout buttons clicked. No re-auth needed because the prior MCP profile cookie was still valid.

## Decisions Made Under Claude's Discretion

Per CONTEXT §"Claude's Discretion", the following choices were made without escalation:

1. **Persistent-context Playwright over fresh launch.** The audit reuses the `mcp-chrome-22d19b2` profile from prior MCP sessions to inherit the auditor cookie. This avoids re-doing onboarding (which itself would mutate state and complicate scope).
2. **API-direct fallback when UI clicks fail (deviation 1).** Documented as a finding in its own right.
3. **6 probes for Cooking Log (above the ≥3 minimum).** The CL-01 cook_count bug emerged during the idempotency probe, which I would not have run without setting up the multi-PUT scenario. Each weird-state probe stayed productive within the time budget per D-07.
4. **15 screenshots committed (above the ≥4 minimum).** Each probe produced a screenshot; 4 expected by Task 1 + 3 by Task 2 + 3 by Task 3 = 10 minimum, but I added baseline shots for Sh-01 and a `cooking-log-recipe-detail.png` to evidence CL-01's user-visible "Cuisinée 2 fois" symptom — net +5.
5. **`.gitignore` no-op.** No new untracked files created outside `walkthrough-screenshots/` and the WALKTHROUGH.md edits — no `.gitignore` update needed. Generated probe scripts live in `/tmp/audit-12-03/` and are NOT committed.

## Threat Flags

None. The plan's threat model held:

- **T-02** (auditor session escapes member-#4 scope): not breached. Auditor stayed scoped to `[SYNTHETIC] Démo Al Dente`. Side-effect of writes:
  - 5 vote rows added to the synthetic household (auditor's votes on the 5 shortlist recipes).
  - 1 cooking_log row added (Coq au vin, id `80973799`, finalized).
  - **`cook_count` denorm now incorrectly = 2 on Coq au vin** (CL-01 bug exposure — real prod data, will persist until teardown).
  - All within synthetic scope per design.

## Self-Check: PASSED

All 15 created screenshots exist on disk. All 3 task commits (`63f0026`, `6c4eb96`, `4a10f60`) are present in `git log --oneline -5`. WALKTHROUGH.md has 4 fully-populated decide/cook/history sections (verified via per-task `awk` + `grep -c '^\*\*Severity:\*\*'` ≥3 per section). `git diff --name-only HEAD~3..HEAD | grep -E "^(frontend|backend)/"` empty.

Verified files-exist:

```
$ for f in shortlist-baseline-deck shortlist-baseline shortlist-empty-state shortlist-rapid-swipe shortlist-regenerate-during-vote vote-rapid-flip vote-state-render-after-refresh vote-veto-window cooking-log-5kb-notes cooking-log-finalize-offline cooking-log-near-midnight cooking-log-recipe-detail history-bad-uuid history-empty-due-to-CL-01 history-empty-group-headers; do [ -f ".planning/v0.3/walkthrough-screenshots/$f.png" ] && echo "FOUND: $f.png" || echo "MISSING: $f.png"; done
[15× FOUND, 0 MISSING]
```

## Next

**Plan 12-04 (Wave 4):** Cross-cutting probe pass — exports / push / realtime sync / onboarding / settings (5 surfaces). Plan 04 is `autonomous: false` because push (D-19) and realtime two-context (D-15) may need operator confirmation. Plan 04 should:

- Re-test offline behavior (CL-05 tagged for re-probe with `context.setOffline(true)`).
- Be aware that the second realtime context joining via `DEMO01` will become member **#5** (Plan 03 confirms 4 already + the second context = 5 total).
- Not invoke teardown unless realtime probes are genuinely blocked — the prod data anomalies (CL-01's inflated cook_count, the 7 stuck drafts from Plan 02) are themselves observability signals that Phase 14 may want to ingest.

## Threat Flags (new surface introduced)

None — audit-only plan, zero product-code drift, no new endpoints / auth paths / file access surface introduced.
