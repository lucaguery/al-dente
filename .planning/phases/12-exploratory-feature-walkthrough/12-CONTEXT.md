# Phase 12: Exploratory Feature Walkthrough — Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 12 drives the prod synthetic household (`[SYNTHETIC] Démo Al Dente`, invite code `DEMO01`, seeded by Phase 11) via Playwright MCP — like a curious human, not a scripted test runner — across every shipped surface, surfacing bugs and UX friction that the existing 14 e2e specs (golden-paths in the *test* env) cannot catch. Output: `.planning/v0.3/WALKTHROUGH.md` with severity-tagged findings; blockers also filed as GitHub issues under `lucaguery/al-dente`. Friction and nit findings stay in `WALKTHROUGH.md` as input to Phase 14 synthesis.

**Auditor identity:** Playwright MCP joins as member #3 via `DEMO01` (per Phase 11 D-19). For realtime sync, a second Playwright browser context joins as member #4.

**Not in this phase:**
- **No fixes to product code** (audit-only milestone; per `feedback_executor_scope_creep`). If a probe surfaces a bug, the auditor records it and stops — does not fix.
- No new committed Playwright spec files (this phase is agent-driven via `mcp__playwright__*`, not test-suite-driven; existing `frontend/tests/e2e/` specs stay untouched).
- No design fixes, scoring, or originality verdicts (those are Phase 13).
- No synthesis or ranking of findings (that is Phase 14).
- No closing of v0.2.2 backlog (Sheet-01 [#1], TZ-01, URL-01, CL-01, SEED-01) — the audit may *re-discover* these but won't re-file new issues for them.
- No cross-browser / cross-device coverage — locked to iPhone-shape Chromium (390×844, isMobile, hasTouch) per v0.2.1 Phase 10 viewport.

</domain>

<decisions>
## Implementation Decisions

### Severity rubric (governs all findings; locked upfront for Phase 14 ranking consistency)

- **D-01: Blocker bar = standard.** A `blocker` finding is one of: (a) crash / 500 / data loss or corruption, OR (b) shipped surface where the **primary intended action** is non-functional **even via workaround** (e.g. URL capture promotion silently fails, photo upload sheet renders off-screen, cooking-log finalize button does nothing). Workaround-able defects — even visible-on-load ones — stay friction.
- **D-02: Friction vs nit cutoff.** `friction` = anything that costs the user time, attention, or confidence (unclear empty states, missing feedback after an action, unnecessary taps, surprising state transitions). `nit` = purely visual or copy-level polish that doesn't affect comprehension or task flow.
- **D-03: GitHub issue protocol — minimal.** Each `blocker` finding gets one issue under `lucaguery/al-dente` with: (1) one-line title, (2) body containing `## Repro` / `## Expected` / `## Actual` / `## WALKTHROUGH link`, (3) single label `audit:walkthrough`. No per-surface labels, no severity labels (severity is implicit: only blockers get issues). Mirrors the v0.2.1 Sheet-01 issue ([#1](https://github.com/lucaguery/al-dente/issues/1)) shape.
- **D-04: Uniform finding template across all severities.** Every entry in `WALKTHROUGH.md` (blocker, friction, nit) uses the same shape: title, severity tag, repro steps, expected, actual, optional screenshot ref. Pro: Phase 14 ranks uniformly without re-tagging; future v0.4 fixes get actionable repro for friction/nit too. Con: more writing per finding — accept the cost.
- **D-05: Cross-link mechanism.** Each `blocker` entry in `WALKTHROUGH.md` ends with a line `Issue: <github-url>`; each filed issue's body ends with a permalink to the `WALKTHROUGH.md` anchor (use `git rev-parse HEAD` at filing time so the link is stable). Bidirectional navigation, deterministic.
- **D-06: Backlog dedupe on filing.** Before filing a new issue, the auditor checks the v0.2.2 backlog list (Sheet-01 / TZ-01 / URL-01 / CL-01 / SEED-01-local + POLISH-01/02 — see `PROJECT.md` §"Surfaced for follow-up"). If a finding matches a known backlog item, the WALKTHROUGH entry cross-links to the backlog ID instead of filing a new GitHub issue. The audit may upgrade severity in the WALKTHROUGH narrative (e.g. "URL-01 is more user-visible than originally tagged") — Phase 14 picks that up.

### Exploration depth & stopping rule

- **D-07: Probe-count governs stop.** Each surface gets at minimum: 1 golden-path traversal + ≥3 deliberate weird-state probes. After the 3rd weird-state probe, the auditor stops unless an interesting thread is open. Probe-count is the rule; the time budget is the soft constraint, not a hard cap.
- **D-08: All four probe kinds in scope, drawn from for each surface as appropriate:**
  1. **Garbage / boundary inputs** — empty submissions, very long strings, special chars + emoji, 5KB paste blocks, French diacritics, leading/trailing whitespace, pure numbers in name fields.
  2. **Racing / rapid actions** — double-tap submit, submit-then-back, navigate-mid-loading, flip tabs while a request is in flight, vote-then-immediately-vote-again. Catches optimistic-update races and idempotency.
  3. **Network / connectivity edge cases** — DevTools `offline` toggle, slow-3G throttle, drop WS mid-flow, kill-and-reopen with stale state. Tests reconnect logic, offline messaging, cookie/session resilience.
  4. **Invalid state / weird arrival paths** — `/recipes/<bad-uuid>`, force-refresh mid-cook, deep-link into a screen needing prior state, hit endpoints in unintended order. Tests routing and boundary handling.
- **D-09: State drift is accepted.** Probes within a surface accumulate state (votes, cooking logs, drafts). Each probe documents its assumed-starting-state inline ("starting from: 21 recipes, 7 votes, 3 cooking_logs"). The auditor only invokes the Phase 11 teardown→refresh CLI if state genuinely blocks a probe (e.g. all shortlist recipes voted-out and need to test 'Sans avis').
- **D-10: Time budget is half-day (~4h) single focused session.** The probe-count rule (D-07) governs depth; the 4h budget is the soft expectation. Rich surfaces (capture-voice, shortlist-vote) can borrow time from thin ones (settings, exports). If the rule overshoots the budget, the rule wins.
- **D-11: Surface order = same as ROADMAP §Phase 12 success criterion 1.** Run in the order: 5 capture surfaces (quick → full → voice → photo → url) → shortlist → vote → cooking log → history → exports → push → realtime sync → onboarding → settings. Captures the natural product flow first, leaves cross-cutting concerns (push, realtime, onboarding when re-joining as member #4, settings) for the back half.

### Live AI-API cost handling (voice / photo / url / voice-modify all hit Gemini live in prod)

- **D-12: Full live coverage.** Each AI-touching probe hits Gemini 2.5 Flash for real, exactly as a user would. Worst-case spend ≈ $0.50 across the phase (~30-50 calls). The audit's job is to test what users experience; stubbing changes the layer being tested. Each AI surface section in WALKTHROUGH records its Gemini call count for transparency.
- **D-13: Canned reusable input set, committed.** Pre-record / pre-select inputs are committed under `.planning/v0.3/walkthrough-inputs/` so probes are reproducible. Minimum coverage:
  - **voice/** — 2-3 audio clips: clean recipe dictation in French, garbled / accented speech, very short utterance.
  - **photo/** — 2-3 images: clean cookbook page, dimly-lit handwritten note, non-recipe image (e.g. landscape) for negative test.
  - **url/** — 2-3 URLs: clean recipe site (e.g. marmiton.org), paywalled site, non-recipe URL (e.g. wikipedia article).
  - **voice-modify/** — 1-2 modification audio clips ("rajoute des champignons", "remplace le bœuf par du poulet").

  Same input twice ≈ same Gemini response (Gemini is non-deterministic but inputs being fixed isolates that variable).
- **D-14: URL surface is probed normally; URL-01 is documented but not re-filed.** URL extraction is `# TODO(productize)` (per `recipes.py:481-490`) so drafts created from URL never promote. The auditor probes the surface end-to-end, records this as a `blocker`-severity finding in `WALKTHROUGH.md` §url, and **cross-links to the existing URL-01 backlog notation instead of filing a new GitHub issue** (per D-06 dedupe rule). Lets Phase 14 confirm the user-visible severity without bloating the issue tracker.

### Realtime sync coverage (architecture invariant #4)

- **D-15: Two Playwright MCP browser contexts in one session.** Spin up two browser contexts via `mcp__playwright__browser_tabs`. Context A = member #3 (auditor, persistent across the whole phase). Context B = member #4 (join via `DEMO01` at the start of the realtime section). Fire mutations in B, observe in A (and vice versa for at least one direction-flipped probe). Member #4 persists in the synthetic household post-phase — idempotent re-seed leaves them, harmless.
- **D-16: All event classes get explicit cross-client probes.** The 6 broadcast event classes from `services/realtime.py`: `recipe.created`, `recipe.promoted`, `vote.created` + state transitions, `cooking_log.created`, `cooking_log.finalized`, plus reconnect behavior. Each class gets ≥1 mutation-pair probe. Total ≈ 6-7 cross-client probes for the realtime section.
- **D-17: Observation-only depth.** Mutation on B → expect event on A within ~3s, qualitative ("arrived" / "didn't arrive"). No timing assertions, no latency budgets. One reconnect probe: drop A's WS via DevTools, reload, verify recovery. Per-event timing is out of scope; if Phase 14 finds latency mattered to user perception, it becomes a friction finding from observation alone.

### Operational decisions

- **D-18: Screenshots committed under `.planning/v0.3/walkthrough-screenshots/`** — captured via `mcp__playwright__browser_take_screenshot` and referenced from `WALKTHROUGH.md` findings where visual evidence helps. Filename convention: `<surface>-<probe-slug>.png`. Same directory pattern Phase 13 will use for `ui-reviews/screenshots/` (kept separate so audit-doc audiences are clean).
- **D-19: Push notifications testing depth = subscription + 1 fired notification.** Verify the service worker subscribes (real `pushManager.subscribe()` against the prod backend — no stub at this layer); fire one test notification via the existing send mechanism (or operator-triggered if the auditor lacks credentials); verify it arrives. If the auditor cannot trigger a send programmatically, document and request operator assistance for one round-trip.
- **D-20: WALKTHROUGH.md drafted incrementally during exploration, not at the end.** The auditor writes findings into the doc as probes complete (one section per surface, even if only "no issues found"). Reduces context loss. Final pass at end of session: rerun severity tags against rubric, dedupe against backlog (D-06), cross-link issues (D-05).

### Claude's Discretion

The following are implementation details the planner / executor decides without re-asking:

- Exact file structure under `.planning/v0.3/walkthrough-inputs/` (subdirs vs flat, naming convention for clips).
- Whether to commit `.gitkeep` placeholders for `walkthrough-screenshots/` before screenshots exist.
- Exact Playwright MCP invocation patterns for two-context realtime probes (single session vs sequential).
- How to surface Gemini call counts in WALKTHROUGH (per-section sub-bullet vs phase-level summary).
- Exact GitHub issue filing tooling (`gh issue create` from the runbook, or inline curl). Recommend `gh issue create`.
- Order of weird-state probes within a surface (depends on what the golden path leaves natural).
- Whether `WALKTHROUGH.md` uses level-2 or level-3 headers per surface (recommend level-2 for navigability).

### Folded Todos

None — `gsd-tools todo match-phase 12` returned 0 matches.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source of truth & milestone scope
- `.planning/REQUIREMENTS.md` §"WALK — Exploratory Feature Walkthrough" — WALK-01..04 acceptance criteria (authoritative).
- `.planning/ROADMAP.md` §"Phase 12" — goal, success criteria, surface list, out-of-scope.
- `.planning/PROJECT.md` — Current Milestone v0.3 section + "Surfaced for follow-up" v0.2.2 backlog list (D-06 dedupe input).
- `SPEC.md` (repo root) — locked vocabularies, voting state machine, capture pipeline (informs probe design).
- `CLAUDE.md` (repo root) — Architecture invariants 1-8 (especially #4 realtime contract for D-15/D-16, #1 capture surfaces all return draft + async promotion, #2 voting state computed).

### Prior-phase context (Phase 11 — directly consumed)
- `.planning/phases/11-production-synthetic-household/11-CONTEXT.md` — D-19 (auditor joins as member #3 via `DEMO01`), D-05 (synthetic household label), D-14 (`DEMO01` invite code), D-20 (21 recipes have photos).
- `RUNBOOK.md` (repo root) — refresh + teardown commands the auditor invokes if state breaks (D-09).

### Walkthrough infrastructure
- `frontend/playwright.config.ts` — iPhone-shape Chromium viewport (390×844, isMobile, hasTouch). Phase 12 uses `mcp__playwright__*` tools, not this config directly, but the agent must mirror the same viewport for consistency with the e2e suite.
- `frontend/tests/e2e/` — 14 existing scripted specs (NOT extended in this phase). Useful as a reference for what the *golden* paths look like — Phase 12's job is to deviate from them.
- `frontend/tests/e2e/globalSetup.fresh.ts` — invite-code happy-path setup (the auditor's join flow uses the same surface but with `DEMO01`).

### Backend code touched by realtime / capture probes
- `backend/app/services/realtime.py` — `broadcast_to_household` and the 6 event classes for D-16.
- `backend/app/routers/recipes.py` — capture endpoints (5 surfaces). Lines 481-490 are the URL-01 `# TODO(productize)` site (D-14).
- `backend/app/routers/cooking_logs.py` — lines 72-78, 118-126 are the TZ-01 timezone bug site; if a probe re-discovers it, cross-link instead of refile (D-06).
- `backend/app/services/storage.py` — Supabase Storage. Sheet-01 [#1] lives in `frontend/components/ui/sheet.tsx:64` (frontend) but the photo upload flow round-trips here.
- `backend/app/cli/seed.py` — `--prod-synthetic` and `--teardown` modes (Phase 11). Auditor invokes these only as escape hatch (D-09).

### v0.2.2 backlog (D-06 dedupe inputs)
- `Sheet-01` ([#1](https://github.com/lucaguery/al-dente/issues/1)) — bottom sheet off-screen on iPhone viewport.
- `TZ-01` — `cooking_logs.py:72-78,118-126` timezone bug.
- `URL-01` — `recipes.py:481-490` URL extraction is `# TODO(productize)`.
- `CL-01` — GET /cooking-logs (list) endpoint missing.
- `SEED-01` (local) — local seed cross-day idempotency hole; closed in prod by Phase 11 D-10/D-11.
- `POLISH-01 / POLISH-02` — i18n sweep on partner-waiting strings + Copy button on invite code (carried from v0.2).

### Anti-pattern guards
- Memory: `feedback_executor_scope_creep.md` — gsd-executor previously modified files outside plan scope. Phase 12's plan MUST pass this CONTEXT.md to the executor with a hard constraint: **NO product-code changes**. The phase produces only `WALKTHROUGH.md`, GitHub issues, screenshots, and walkthrough-input artifacts.
- Memory: `feedback_no_manual_vercel_deploy.md` — push to `main` is the only deploy path. Phase 12 doesn't deploy; this guard is informational (audit work doesn't ship).

### New artifacts Phase 12 will create
- `.planning/v0.3/WALKTHROUGH.md` — primary deliverable.
- `.planning/v0.3/walkthrough-inputs/voice/*.{m4a,wav}` — canned voice clips (D-13).
- `.planning/v0.3/walkthrough-inputs/photo/*.jpg` — canned photos (D-13).
- `.planning/v0.3/walkthrough-inputs/url/*.txt` or `.md` — canned URLs (D-13).
- `.planning/v0.3/walkthrough-inputs/voice-modify/*.{m4a,wav}` — canned voice-modify clips (D-13).
- `.planning/v0.3/walkthrough-screenshots/<surface>-<probe>.png` — screenshots referenced from findings (D-18).
- GitHub issues under `lucaguery/al-dente` with label `audit:walkthrough` for blockers (D-03).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Playwright MCP tools (`mcp__playwright__*`)** — full browser control via the agent. `browser_navigate`, `browser_click`, `browser_type`, `browser_fill_form`, `browser_snapshot`, `browser_take_screenshot`, `browser_tabs` (multi-context), `browser_network_requests`, `browser_console_messages`, `browser_evaluate`. This is the entire engine of the walkthrough — no spec files committed.
- **Phase 11 prod synthetic household** — `[SYNTHETIC] Démo Al Dente` with invite code `DEMO01`, 2 seeded members (Luca, Partner), 21 recipes with committed photos, 3 cooking logs, 7 votes covering all 5 computed states. Already deployed to prod Supabase.
- **Phase 11 teardown→refresh CLI** — `uv run seed --prod-synthetic --teardown` then refresh. Idempotent. Used as escape hatch when state drift blocks a probe (D-09).
- **Existing e2e specs in `frontend/tests/e2e/`** — 14 specs covering golden paths in the test env. Reference material for what the golden traversal looks like; Phase 12 explicitly deviates from these.
- **`gh` CLI** — used for filing issues (D-03, D-05).
- **iPhone-shape Chromium viewport** — 390×844 + isMobile + hasTouch + Chromium-only (per Phase 10 D-01). Phase 12 must mirror this in MCP browser context for consistency.

### Established Patterns
- **All capture surfaces return a draft immediately + async promotion** (invariant #1) — every probe of a capture surface should observe the draft → structured transition (or failure) and check the inbox.
- **Voting state is computed, not stored** (invariant #2) — vote-state probes verify rendering by recomputing from current votes, not by inspecting any column.
- **Realtime broadcast spine** (invariant #4) — `services/realtime.broadcast_to_household` is the single integration point for D-15/D-16 cross-client probes.
- **HttpOnly cookie auth via same-origin Next.js rewrites** (invariant #8) — auditor sessions persist across MCP browser context lifetime; no Bearer token juggling.
- **Slow Food design tokens** (v0.2 Phase 5) — paper-grain backgrounds, terracotta primary, Fraunces italic display. Phase 13 audits these; Phase 12 just notices when they break (e.g. light/dark mismatch, broken paper-grain on a new surface).

### Integration Points
- **Auditor join flow** — `DEMO01` → onboarding "Rejoindre un foyer existant" → pick member name → become member #3.
- **Realtime second-context join** — same flow, becomes member #4 (idempotent on re-seed; persistent across phases unless explicitly torn down).
- **GitHub issue tracker** — `lucaguery/al-dente`, label `audit:walkthrough`, filed via `gh issue create`.
- **WALKTHROUGH.md location** — `.planning/v0.3/`, sibling to Phase 11's `RUNBOOK.md` stub.

</code_context>

<specifics>
## Specific Ideas

- The 4-h time budget (D-10) maps roughly to 18min/surface average across 13 surfaces — but rich surfaces (capture-voice, shortlist-vote, cooking log finalize, realtime sync) deserve more, and thin ones (settings, exports) less. The probe-count rule (D-07) absorbs this variability; the auditor doesn't watch the clock.
- Each `WALKTHROUGH.md` section should open with a one-line "starting state" note (D-09), then list the golden-path traversal (one paragraph, demonstrably exercised), then the weird-state probes (numbered, each with its full uniform template per D-04).
- The two-context realtime probe (D-15) works best if context A stays parked on the home screen / decide screen while context B fires mutations — the home screen is where most realtime events visibly land (drafts inbox, shortlist updates, cooking banner). Document this configuration explicitly in the realtime section.
- Per D-14, the URL-01 finding in `WALKTHROUGH.md` should be written as if the auditor doesn't know about the backlog — describe the user-visible failure first, then the cross-link footer. This makes the WALKTHROUGH self-contained for Phase 14 ranking.
- D-19 push verification: if the operator's iPhone is the only practical "send target" (the auditor lacks dev backend credentials to fire a push directly), the section documents this and Luca confirms inline ("verified by Luca on 2026-05-09 13:42, notification arrived in ~2s").
- Phase 12 runs against **prod** Supabase. Every probe that mutates writes to prod rows in the synthetic household scope only — the Phase 11 D-06 scope guard does NOT apply here (the seed enforces that during seeding; Phase 12 mutations are normal product API calls scoped by the auditor's session). Implication: if the auditor accidentally probes outside the synthetic household (e.g. logs out of member #3 and into a real account during exploration), they'd be exercising real-user data. **Don't log out** — stay scoped.

</specifics>

<deferred>
## Deferred Ideas

These came up during analysis or discussion but belong outside this phase:

- **Latency / timing assertions for realtime events** — D-17 chose observation-only. If Phase 14 surfaces "events feel slow," the v0.4 milestone can scope a perf phase that adds timing budgets. Not in this audit.
- **Stress / rapid-fire realtime probes** — considered for D-17 but rejected at this scope. Could surface dropped-message bugs but expensive per event class. Revisit if observation-only finds anything suspicious.
- **Per-surface GitHub issue labels** — considered for D-03. Lean now; if `audit:walkthrough` filter becomes too coarse during v0.4 triage, add `surface:*` labels retroactively.
- **Multi-session walkthrough** — considered for D-10. Would catch overnight-cron / next-day stale-state bugs but adds calendar time. If the half-day session leaves something worth observing-over-time, Phase 14 can flag it as input.
- **Cross-browser audit (Safari iOS, Chrome Android, Firefox)** — explicitly out of scope per `REQUIREMENTS.md` Out of Scope. Locked to iPhone-shape Chromium.
- **Closing v0.2.2 backlog issues during the walkthrough** — explicitly out of scope per `feedback_executor_scope_creep`. The audit may re-discover them but won't fix.
- **Push notification load/timing testing** — D-19 covers subscription + 1 fired notification. Anything beyond is a separate observability phase.
- **Closing the Phase 14 ranking algorithm** — Phase 12's job is to surface findings; ranking by "feels Al Dente" impact is Phase 14.

### Reviewed Todos (not folded)
None — `gsd-tools todo match-phase 12` returned 0 matches.

</deferred>

---

*Phase: 12-exploratory-feature-walkthrough*
*Context gathered: 2026-05-09*
