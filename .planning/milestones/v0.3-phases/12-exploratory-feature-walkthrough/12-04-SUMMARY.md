---
phase: 12-exploratory-feature-walkthrough
plan: 04
subsystem: cross-cutting-probe-pass
tags: [audit, walkthrough, exports, push, realtime, onboarding, settings, invariant-4, invariant-2-cross-link, capacity-blocker, cookie-isolation]
dependency-graph:
  requires: [phase-12-plan-03-decide-cook-history, prod-vercel-deploy, prod-supabase-synthetic-household, persistent-mcp-chrome-profile, gemini-2.5-flash-live]
  provides: [exports-findings, push-findings, realtime-findings, onboarding-findings, settings-findings, ws-frame-evidence, two-context-cookie-isolation-canonical-pattern, polish-02-resolved-confirmation]
  affects: [12-05-issue-sweep, post-v0.3-productize-roadmap]
tech-stack:
  added: []
  patterns: [two-chromium-launch-cookie-isolation, ws-framereceived-direct-evidence, idempotent-rejoin-as-second-context, vapid-key-runtime-fetch-defense-in-depth]
key-files:
  created:
    - .planning/v0.3/walkthrough-screenshots/exports-json-download.png
    - .planning/v0.3/walkthrough-screenshots/exports-offline.png
    - .planning/v0.3/walkthrough-screenshots/exports-rapid-double.png
    - .planning/v0.3/walkthrough-screenshots/onboarding-bad-code.png
    - .planning/v0.3/walkthrough-screenshots/onboarding-color-collision.png
    - .planning/v0.3/walkthrough-screenshots/onboarding-lowercase-code.png
    - .planning/v0.3/walkthrough-screenshots/settings-invite-copy.png
    - .planning/v0.3/walkthrough-screenshots/settings-long-name.png
    - .planning/v0.3/walkthrough-screenshots/realtime-cookie-isolation-test.png
    - .planning/v0.3/walkthrough-screenshots/realtime-recipe-created.png
    - .planning/v0.3/walkthrough-screenshots/realtime-recipe-promoted.png
    - .planning/v0.3/walkthrough-screenshots/realtime-recipe-updated.png
    - .planning/v0.3/walkthrough-screenshots/realtime-vote-created.png
    - .planning/v0.3/walkthrough-screenshots/realtime-shortlist-created.png
    - .planning/v0.3/walkthrough-screenshots/realtime-cooking-started.png
    - .planning/v0.3/walkthrough-screenshots/realtime-reconnect.png
    - .planning/v0.3/walkthrough-screenshots/push-subscribe-permission.png
    - .planning/v0.3/walkthrough-screenshots/push-subscribe-network.png
    - .planning/v0.3/walkthrough-screenshots/push-resubscribe-idempotent.png
  modified:
    - .planning/v0.3/WALKTHROUGH.md
decisions:
  - "Two independent `chromium.launch()` instances (not `browser_tabs`) chosen as the canonical two-context pattern. Cookie isolation CONFIRMED: distinct auth_tokens visible in WS query strings. The auditor's persistent profile (Auditor) and an ephemeral browser launching as Joe via D-07 idempotent-rejoin gave full cross-client observation without any chance of cookie cross-contamination."
  - "Joining as member #5 is impossible (P-12-O04 NEW BLOCKER): the 4-member synthetic household has all 4 ColorSwatchPicker swatches taken; the palette length doubles as the implicit max-members ceiling. Two-context realtime probe adapted by D-07 idempotent-rejoin into the 4 existing identities. Plan-12-03 SUMMARY's projection of 'second context becomes member #5' is now disproven; the audit baseline going forward is 4 members, not 5."
  - "POLISH-02 (Copy button on invite code) is RESOLVED — verified live at frontend/app/settings/page.tsx:154-162 with aria-label='Copier le code d'invitation', lucide-copy SVG, 2-second Check icon swap on click. The backlog item should be marked closed in PROJECT.md / STATE.md by Plan 05."
  - "POLISH-01 cluster extends to settings/page.tsx:175-183 Historique Card hardcoded French copy ('Historique', 'Voir les cuissons récentes'). The TODO is honest at lines 172-174 in source. Cross-link, do NOT refile."
  - "P-12-Sh-02 (Plan 12-03's Régénérer 422 finding) is partially CONTRADICTED by Plan 12-04 RT-5: regenerate with empty `{}` body returned 200 with new shortlist (generation 2) and proper `shortlist.created` broadcast. Plan 12-03's 422 may have been a malformed-body sender bug, not a backend-contract bug. Plan 05 must reconcile: Sh-02 may downgrade to friction (poor 422 error message) or invalid (sender bug)."
  - "Architecture invariant #4 (realtime broadcast contract) is now WS-frame-verified: Playwright's page.on('websocket') framereceived hook captured all 6 documented event types arriving at A within ~1.3s–4s of B's mutation. Direct wire evidence, not just visual observation. Latencies all within D-17's qualitative ~3s threshold (recipe.promoted's 4s borderline because of Gemini extraction time, not WS layer)."
  - "A SEVENTH event class `cooking.finalized` exists in `routers/cooking_logs.py:219` but is NOT enumerated in `services/realtime.py:9-19` canonical docstring. Documentation-vs-code drift. Plan 05 may file as a doc finding — extend the docstring or remove the orphan emit."
  - "VS realtime scope: a 4th member identity 'Joe' (member id eb6eeb32-419b-4b95-b654-595409935aa4, color #10B981) was used for context B. Per CONTEXT D-15 'Member #4 may persist post-phase' — Joe persists; harmless. New side-effect rows in the synthetic household from this run: 3 fresh recipes (cc809289 quick, 054a1f85 voice→Pâtes au pesto promoted, dbc2741e quick reconnect-probe), 1 PUT update on Pâtes au pesto, 1 vote (Joe yes on dfdab18f Mega ingredient bomb), 1 regenerated shortlist (4270b9c2 generation 2), 1 active cook (c7c92195 on 2923bc7a Pad thai tofu — NOT yet finalized). All within synthetic scope per design."
  - "Auditor identity preserved through all 3 tasks (final check: Auditor id f244600f-da8c-4995-adbb-4e2362ece0fe). T-02 mitigation held."
  - "Push round-trip (D-19) is the explicit operator-checkpoint case. Headless Chromium throws AbortError 'push service not available' on pushManager.subscribe() per RESEARCH §Risk 3 prediction. No /api/push/test endpoint exists. Operator iPhone is the round-trip target; CHECKPOINT surfaced inline in WALKTHROUGH §Push P-12-Pu-05."
metrics:
  duration: ~21 min (probe development + execution + walkthrough writing)
  completed: 2026-05-09
  tasks: 3
  probes_run: 27 (Exp:4 + Onb:5 + Set:5 + Realtime:8 + Push:5)
  probes_blocker: 4 (O-04 capacity, S-02 PATCH-405, Pu-01 audit-only-blocker, Pu-04 audit-observability)
  probes_friction: 6 (E-02 offline, E-03 rapid-double, O-01 welcome-while-authed, O-05 race-after-capacity, S-03 quitter-missing, Pu-02 settings-missing-affordance)
  probes_nit: 12 (E-01, E-04, O-02, O-03, S-01-POLISH-02-resolved, S-04-cross-link, S-05-POLISH-01-cluster, RT-isolation-canary, RT-1, RT-2, RT-3, RT-7-reconnect)
  probes_pass_style: 8 (RT-3 to RT-7 all confirm invariant #4 holds; Pu-03 vapid-key)
  probes_checkpoint: 1 (Pu-05 round-trip awaiting operator)
  screenshots_committed: 19
  gemini_calls_actual: 1 (RT-2 voice promotion only)
  commits: 3
---

# Phase 12 Plan 04: Cross-Cutting Probe Pass Summary

Probed the 5 cross-cutting surfaces (Exports / Push / Realtime Sync / Onboarding / Settings) of the prod-deployed `https://al-dente-pink.vercel.app` against the `[SYNTHETIC] Démo Al Dente` synthetic household via Playwright persistent context (auditor's mcp-chrome-22d19b2 profile inherited from Plans 12-02/03; member id `f244600f` named `Auditor`) plus a fresh ephemeral browser instance for the Realtime Sync two-context probe (member id `eb6eeb32` named `Joe`, idempotent-rejoined via D-07). Auditor session ran for ~21 minutes, fired 27 probes (5 golden-path-style traversals + 22 deliberate weird-state / cross-client probes), produced 19 screenshots, and captured direct WS frame evidence for all 6 broadcast event classes. **Zero diff under `frontend/` or `backend/`** — scope-creep guard held across all 3 tasks.

## What Shipped

Three atomic commits across the 3 tasks:

| Task | Commit | Surfaces | Probes | Headline finding |
|------|--------|----------|--------|------------------|
| 1 | `4e292ab` | Exports + Onboarding + Settings | 4 + 5 + 5 = 14 | **POLISH-02 resolved**; **P-12-O04 BLOCKER** capacity ceiling; **P-12-S02 BLOCKER** PATCH-405 |
| 2 | `ed063ae` | Realtime Sync | 8 | **All 6 event classes verified at WS-frame layer**; **Sh-02 disputed**; cookie isolation pattern documented |
| 3 | `628bf92` | Push | 5 | **D-19 checkpoint** surfaced for operator round-trip |

19 screenshots created, WALKTHROUGH.md modified once per task. 0 lines under `frontend/` or `backend/`.

## Per-surface Probe Count + Severity Breakdown

| Surface | Probes | Blocker | Friction | Nit (pass-style) | Notes |
|---------|--------|---------|----------|------------------|-------|
| Exports     | 4 | 0 | 2 (E-02 offline, E-03 rapid-double) | 2 (E-01, E-04 brotli) | Golden round-trip clean (97KB, 34 recipes); offline UX clear; rapid-double doubles work |
| Push        | 5 | 2 (Pu-01 audit-only, Pu-04 audit-obs) | 1 (Pu-02 missing-Settings-affordance) | 1 (Pu-03 vapid) + 1 checkpoint (Pu-05 round-trip) | Headless cannot subscribe; no test-fire route; round-trip awaits operator |
| Realtime Sync | 8 | 0 | 0 | 8 (cookie-isolation canary + 6 event classes + 1 reconnect — all pass-style invariant #4 verifications; RT-4 cross-links Vt-01) | All 6 broadcast events arrive at A in ~1.3s–4s; reconnect in ~1.8s; **invariant #4 verified at WS-frame layer** |
| Onboarding  | 5 | 1 (O-04 capacity ceiling) | 2 (O-01 welcome-while-authed, O-05 race-after-capacity) | 2 (O-02 bad-code-error, O-03 lowercase-uppercase) | 4-member household at palette capacity → no member #5 |
| Settings    | 5 | 1 (S-02 PATCH-405) | 1 (S-03 quitter-missing) | 3 (S-01 POLISH-02-resolved, S-04 cross-link, S-05 POLISH-01-cluster) | Read-only by design but undocumented; POLISH-02 SHIPPED |

**Probes run: 27 total** (well over the plan minimum of 5 surfaces × 3 probes = 15; realtime alone has 8 vs the 7-minimum from D-16).

## Total Gemini Calls

**1 call** (RT-2 voice promotion only — verified via the `recipe.promoted` payload arriving at A with structured ingredients matching the input transcript). Per-section breakdown captured in WALKTHROUGH.md.

The phase-level Gemini budget: Plan 02 used 5, Plan 03 used 0, Plan 04 used 1 → **6 cumulative across phase**, well under D-12's worst-case ~$0.50 / ~30-50-call ceiling.

## NEW Blocker / Friction Findings (for Plan 05 to file as new GitHub issues)

> Plan 05 must consolidate cross-cuts BEFORE filing. Several findings cross-link to prior-plan findings or each other.

| Finding ID | Severity | Surface(s) | Title | WALKTHROUGH anchor |
|------------|----------|-------------|-------|---------------------|
| **P-12-O04** | **blocker** | Onboarding (palette + capacity) | 4-member synthetic household is at color-palette capacity; no path for member #5; UI silently disables submit | §Onboarding |
| **P-12-S02** | **blocker** | Settings (member CRUD) | `PATCH /api/households/me` returns 405 — member name unchangeable post-onboarding; no recovery from typo'd identity | §Settings |
| **P-12-Pu-01** | blocker (audit-only) | Push (subscription in headless) | Headless Chromium throws `AbortError: Registration failed` on `pushManager.subscribe()`; expected for product, blocks audit | §Push |
| **P-12-Pu-04** | blocker (audit observability) | Push (test-fire route) | No `/api/push/test` endpoint; round-trip verification requires operator | §Push |
| **P-12-E02** | friction | Exports (offline UX) | Button stays enabled when navigator.onLine===false; clear toast on click but no proactive disable | §Exports |
| **P-12-E03** | friction | Exports (race / cost) | Rapid double-click fires two full 97KB exports — no debounce/coalesce on direct API; same class as P-12-Q03 cluster | §Exports |
| **P-12-O01** | friction | Onboarding (route guard) | `/onboarding/welcome` reachable for authenticated users; no OnboardingGuard redirect; can destroy session via different-name re-onboard | §Onboarding |
| **P-12-O05** | friction | Onboarding (race after O-04) | Color-collision re-fetch leaves user stuck once palette exhausts mid-flow; cross-link O-04 | §Onboarding |
| **P-12-S03** | friction | Settings (offboarding) | No "Quitter le foyer" path; cookie is the only binding | §Settings |
| **P-12-S04** | friction (sub-finding) | Settings (boundary moot) | 200-char member name probe unreachable — no input affordance; cross-link S-02 | §Settings |
| **P-12-Pu-02** | friction | Push (UX entry point) | No push affordance on Settings; banner is one-shot + iOS-PWA-only via `canReceivePush()` gate; no recovery for denied/dismissed users | §Push |
| **P-12-Pu-05** | checkpoint | Push (round-trip; D-19) | Operator-confirmation slot for round-trip notification | §Push |

**12 NEW findings** (4 blocker — 2 product-blocker / 2 audit-only; 7 friction; 1 checkpoint).

## Backlog Cross-Links Made (NO new GitHub issues filed)

| Backlog ID | Where it surfaced | Cross-link evidence |
|-----------|-------------------|----------------------|
| `POLISH-02` | §Settings P-12-S01 | Live verification at `frontend/app/settings/page.tsx:154-162`. Copy button SHIPPED. **Mark CLOSED in v0.2.2 backlog tracker.** |
| `POLISH-01` | §Settings P-12-S05 | Cluster extension: hardcoded French copy at `settings/page.tsx:175-183` Historique Card. Source TODO at lines 172-174 honest. |
| `P-12-Vt-01` (Plan 12-03) | §Realtime Sync RT-4 | Vote.created broadcast carries `state="pressenti"` at MEMBER_COUNT=2 default for 1y/0n/4-members. Bug visible at WS-frame wire layer too. |
| `P-12-Sh-02` (Plan 12-03) | §Realtime Sync RT-5 | **DISPUTED.** This run got 200 OK with new generation; Plan 05 to reconcile. |

Cross-link ratio: **4 cross-links / 12 likely-new findings** = 33% of findings deduped against backlog or prior-plan findings. Plan 12-03's projections were highly accurate (4-member context predicted; member-#5 plan adjusted to D-07 rejoin).

## Pass-Style Findings (regression canaries)

These are recorded so future audits can detect regression:

- **E-01**: golden 200 OK 97KB JSON 34 recipes attachment headers correct.
- **E-04**: brotli encoding negotiated for export.
- **O-02**: bad-code error UX is clear French.
- **O-03**: lowercase auto-uppercases per `join/page.tsx:177-181`.
- **RT-CookieIsolation**: two `chromium.launch()` instances = isolated cookie jars (canonical pattern).
- **RT-1**: `recipe.created` broadcast at ~3s; inbox badge increments live.
- **RT-2**: `recipe.created` + `recipe.promoted` both arrive (4s incl. Gemini); invariants #1 + #4 hold together.
- **RT-3**: `recipe.updated` at 1.5s.
- **RT-4** (arrival only): `vote.created` at 1.3s.
- **RT-5** (arrival only): `shortlist.created` at ~3s; full new deck.
- **RT-6**: `cooking.started` at 1.3s; canonical event name confirmed.
- **RT-7**: WS reconnect after `offline → online → reload` in ~1.8s; subsequent event delivered.
- **Pu-03**: VAPID key endpoint shipped + valid 87-char P-256 URL-safe base64.

## Cookie-Isolation Observation (one sentence per CONTEXT)

Two independent `chromium.launch()` instances (NOT `browser_tabs`) provide isolated cookie jars: A's auditor cookie remains intact across B's idempotent-rejoin, with each side maintaining a distinct WS connection visible by differing `?token=` query strings — **canonical two-context pattern documented for future audits**.

## Push Round-Trip Outcome

**PENDING — operator-confirmation slot in §Push P-12-Pu-05.** Headless Chromium cannot subscribe (`AbortError: push service not available`) per RESEARCH §Risk 3 prediction; no programmatic test-fire path exists at `/api/push/{test,send,fire-test}`. Operator must trigger a real product event from their iPhone (member of the synthetic household) and reply with `verified by Luca on YYYY-MM-DD HH:MM, notification arrived in ~Ns` OR `no iPhone available — friction-tag the round-trip` per CONTEXT D-19 verbatim format.

## Carry-Forward State for Plan 05

- **Auditor identity:** member #4 `Auditor`, id `f244600f`, color `#0EA5E9`. Persistent profile `mcp-chrome-22d19b2`. Still authenticated — final check confirmed.
- **Joe identity (used for Realtime context B):** member id `eb6eeb32-419b-4b95-b654-595409935aa4`, color `#10B981`. Persists per CONTEXT D-15 (idempotent re-seed leaves them, harmless).
- **Synthetic household roster:** still 4 members (Luca, Partner, Joe, Auditor). Capacity: at-ceiling (P-12-O04).
- **New side-effect rows added by Plan 04** (all within synthetic scope):
  - 3 recipes: `cc809289` (RT-1 quick), `054a1f85` (RT-2 voice → Pâtes au pesto, structured + later updated), `dbc2741e` (RT-7 reconnect quick).
  - 1 PUT update on `054a1f85`.
  - 1 vote: Joe `yes` on `dfdab18f` (Mega ingredient bomb) on shortlist `4270b9c2`.
  - 1 regenerated shortlist: `4270b9c2-2d36-4c10-91d2-796646da9701` generation 2 (supersedes `9a047f52` from Plan 12-03).
  - 1 active cook (NOT yet finalized): `c7c92195` on `2923bc7a` (Pad thai tofu) by Joe.
- **Persistent prod-data anomalies that Phase 14 may want to ingest as observability signals:**
  - Coq au vin's inflated `cook_count=2` from Plan 12-03 P-12-CL-01.
  - 7+ stuck drafts in inbox (Plan 12-02 V-01 / Ph-02 cluster) plus more added today.
  - Joe's active cook on Pad thai tofu (will accumulate as a "live" cook in the household until finalized or torn down).

## Confirmation: Artifact Allowlist Held

```
$ git diff --name-only HEAD~3..HEAD | grep -E "^(frontend|backend)/"
[empty]
```

Across all 3 task commits (`4e292ab`, task 2's commit, `628bf92`), zero edits to `frontend/` or `backend/`. Only writes:
- `.planning/v0.3/WALKTHROUGH.md` (one edit per task = 3 edits total)
- `.planning/v0.3/walkthrough-screenshots/*.png` (19 new files)

Per-task verify scripts all returned `OK`:
- Task 1: `EXP=4 ONB=5 SET=5 SHOTS=8 LEAK=''` (target: ≥3, ≥3, ≥3, ≥6, empty)
- Task 2: `RT_SEV=8 RT_EVENTS=23 RT_RECON=8 SHOTS=8 LEAK=''` (target: ≥7, ≥6, ≥1, ≥6, empty)
- Task 3: `PUSH_SEV=5 PUSH_OPERATOR=22 SHOTS=3 LEAK=''` (target: ≥3, ≥1, ≥2, empty)
- Plan-level: `EXP=4 PUSH=5 RT=8 ONB=5 SET=5 RT_EVENTS=23 RT_RECON=8 SHOTS_NEW=19 LEAK=''` → **PLAN OK**.

## Deviations from Plan

1. **Two-context strategy adapted around the O-04 capacity blocker.** Plan body assumed "second context joins via DEMO01 → becomes member #5." Reality: 4-member household at palette capacity → cannot create member #5. Switched to D-07 idempotent-rejoin as `Joe` (existing member) in a fresh ephemeral `chromium.launch()`, which preserves the cookie-isolation invariant (separate browser instance = separate cookie jar) without requiring a 5th identity. Documented as both a finding (P-12-O04 blocker) and a probe-infrastructure decision.
2. **Two `chromium.launch()` instances chosen over `browser_tabs`.** Plan body / RESEARCH Step 0 was a verification-then-decide. Decision: separate-launch is the safer pattern (per-instance cookie jar guaranteed by the Playwright protocol), no risk of accidental cookie-jar sharing. Documented as the canonical two-context pattern.
3. **Push surface lives on `/` HomeDecide, NOT `/settings`.** Both RESEARCH §Surface 11 ("Settings → enable notifications") and the plan body Action ("Navigate to ${PROD_URL}/settings, find the 'Activer les notifications' CTA") were wrong. The actual mount is `PushPermissionBanner` at `HomeDecide.tsx:403,460`. Doc drift documented in P-12-Pu-02.
4. **Three commits not five.** The plan structured Tasks 1/2/3 as one commit each. Task 2 had a supplemental probe re-run (RT-3, RT-4, RT-6 with body-parsing fixes) that was rolled into the same Task-2 commit rather than committed separately. Same for the RT-4 standalone re-run.
5. **Settings surface contract drift from `frontend/tests/e2e/settings.spec.ts` reference.** The plan body said "Mirror `settings.spec.ts`. Inspect: member name field, member dot, color, invite code section, signout button." Live: NO member name field, NO color editor, NO signout button (consequence of S-02 / S-03 missing routes). Documented in §Settings.
6. **POLISH-02 cross-link mechanism inverted.** Plan body said "If Copy button is missing → cross-link POLISH-02." Live: Copy button IS present → cross-link as RESOLVED (CLOSED). Same outcome (cross-link, not refile), but the diagnosis flipped.
7. **Plan-12-03 P-12-Sh-02 PARTIALLY CONTRADICTED.** Plan 04 RT-5 fired regenerate with `{}` body and got 200 OK + new shortlist. Plan 12-03 found 422 missing-body. Plan 05 must reconcile — likely a sender-bug interpretation rather than a backend-contract bug.

## Authentication Gates

None — auditor stayed in the persistent member-#4 session for the entire plan (T-02 mitigation held). No "Quitter le foyer" or logout buttons clicked (and per S-03 finding, none exist anyway). No re-auth needed. The Realtime two-context probe spawned a fresh ephemeral cookie jar for B without touching A's persistent cookie.

## Decisions Made Under Claude's Discretion

1. **Direct Playwright via Node.js over `mcp__playwright__*` tools.** Mirroring Plan 12-03's "API-direct probe mode" deviation (its decision 1). Probe scripts live in `/tmp/audit-12-04/` and are NOT committed (per Plan 12-03 D-09 decision 5). Same outcome shape: WALKTHROUGH evidence + screenshots + WS-frame JSON in /tmp.
2. **WS-frame capture via `page.on('websocket')` framereceived hook.** Stronger evidence than visual observation per CONTEXT D-17 ("observation-only depth"); D-17 doesn't forbid WS-frame inspection — it just doesn't require it. The WS-frame evidence was decisive for RT-4 (state computation visible at wire layer) and RT-5 (regenerate dispute against Sh-02).
3. **5 task probes for Settings / Onboarding / Push (above the ≥3 minimum).** Each surface had a productive thread that justified extra probes per D-07 ("stop after 3rd unless thread open"). Settings's POLISH-02 cross-link + S-02 PATCH-405 were both worth recording as separate probes. Onboarding's O-04 capacity blocker spawned the related O-05 race finding.
4. **Push: 4 auditor-side probes + 1 checkpoint.** D-19 explicitly says "If the auditor cannot trigger a send programmatically, document and request operator assistance." This run did exactly that — 4 probes documenting the audit-environment limitations, 1 explicit checkpoint slot for operator confirmation.
5. **Pad thai tofu cook (RT-6) NOT finalized.** Plan body Action did not require finalization. Leaving it active means: (a) `cooking-logs/active` will return non-null for the household for the rest of today UTC; (b) if Plan 05 or anyone else tries to `POST /recipes/{id}/cook` today, they'll hit the `409 another cooking session is active today` Pattern 7 from Plan 12-03 CL-03. Acceptable per CONTEXT D-09 ("state drift accepted").
6. **No 12-04-PLAN.md commit.** The plan file was untracked in main and the worktree branch base reset removed it; the auditor copied it back from the main worktree to read it but did not commit it (the worktree merger / Plan 05 will handle the plan-file commit).

## Threat Flags

None. The plan's threat model held:
- **T-02** (member #3 cookie escape): not breached. Auditor stayed scoped to `[SYNTHETIC] Démo Al Dente`. The two-context Realtime probe spawned a separate cookie jar via fresh `chromium.launch()`; the auditor cookie was never overwritten (verified by 4 separate `GET /households/me` calls bracketing Task 2).
- **T-05** (push subscription endpoint disclosure): not exercised — no subscription was created (P-12-Pu-01 prevented). The disposition `accept` in the plan's threat register is moot for this run.

Side-effect prod data anomaly: 1 active cooking_log on Pad thai tofu (Joe's, NOT yet finalized). Within synthetic scope per design — will persist until finalized or torn down.

## Self-Check: PASSED


All 19 created screenshots exist on disk. All 3 task commits (`4e292ab`, task 2, `628bf92`) are present in `git log --oneline -5`. WALKTHROUGH.md has 5 fully-populated cross-cutting sections (verified via per-section `awk` + `grep -c '^\*\*Severity:\*\*'` ≥3 per section, ≥7 for Realtime). `git diff --name-only HEAD~3..HEAD | grep -E "^(frontend|backend)/"` empty.

Verified files-exist:

```
$ for f in exports-json-download exports-offline exports-rapid-double onboarding-bad-code onboarding-color-collision onboarding-lowercase-code settings-invite-copy settings-long-name realtime-cookie-isolation-test realtime-recipe-created realtime-recipe-promoted realtime-recipe-updated realtime-vote-created realtime-shortlist-created realtime-cooking-started realtime-reconnect push-subscribe-permission push-subscribe-network push-resubscribe-idempotent; do [ -f ".planning/v0.3/walkthrough-screenshots/$f.png" ] && echo "FOUND: $f.png" || echo "MISSING: $f.png"; done
[19× FOUND, 0 MISSING]
```

## Next

**Plan 12-05 (Wave 5 / final pass):** severity sweep, backlog dedupe (POLISH-02 mark CLOSED, POLISH-01 cluster extend, Sh-02 reconcile, Vt-01 cross-link tightened with WS-frame evidence), GitHub issue filing (likely 4-5 NEW issues + cross-links to ~3 backlog items), bidirectional cross-link insertion per D-05, PUSH ROUND-TRIP OPERATOR CONFIRMATION (or friction-tag if operator unavailable), final WALKTHROUGH commit. Plan 14 (synthesis) consumes the WALKTHROUGH.md as input — Plan 12-04's `cookie-isolation` finding becomes a structural insight worth surfacing for v0.4 multi-device test infrastructure.

Wave-4 partial-execution gate: `--wave 4` was specified, so phase verification is intentionally **skipped** until Plan 12-05 also completes. Roadmap progress will reflect 4/5 plans done after this commit.

## Threat Flags (new surface introduced)

None — audit-only plan, zero product-code drift, no new endpoints / auth paths / file access surface introduced.
