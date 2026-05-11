# Phase 12: Exploratory Feature Walkthrough — Research

**Researched:** 2026-05-09
**Domain:** Agent-driven exploratory testing methodology over Playwright MCP against a live PWA
**Confidence:** HIGH (methodology, tooling, scope) / MEDIUM (Gemini live-call quirks, push end-to-end) / LOW (none material)

> Research is intentionally **methodology-heavy, not code-heavy**. Phase 12 produces no product code. The deliverable is `WALKTHROUGH.md` + GitHub issues + screenshots + canned input artifacts. Everything below is in service of that.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Severity rubric (governs all findings; locked upfront for Phase 14 ranking consistency):**
- **D-01: Blocker bar = standard.** A `blocker` finding is one of: (a) crash / 500 / data loss or corruption, OR (b) shipped surface where the **primary intended action** is non-functional **even via workaround**. Workaround-able defects — even visible-on-load ones — stay friction.
- **D-02: Friction vs nit cutoff.** `friction` = anything that costs the user time, attention, or confidence (unclear empty states, missing feedback after an action, unnecessary taps, surprising state transitions). `nit` = purely visual or copy-level polish that doesn't affect comprehension or task flow.
- **D-03: GitHub issue protocol — minimal.** Each `blocker` finding gets one issue under `lucaguery/al-dente` with: (1) one-line title, (2) body containing `## Repro` / `## Expected` / `## Actual` / `## WALKTHROUGH link`, (3) single label `audit:walkthrough`. No per-surface labels, no severity labels.
- **D-04: Uniform finding template across all severities.** Every entry in `WALKTHROUGH.md` (blocker, friction, nit) uses the same shape: title, severity tag, repro steps, expected, actual, optional screenshot ref.
- **D-05: Cross-link mechanism.** Each `blocker` entry in `WALKTHROUGH.md` ends with `Issue: <github-url>`; each filed issue body ends with a permalink to the `WALKTHROUGH.md` anchor (use `git rev-parse HEAD` at filing time).
- **D-06: Backlog dedupe on filing.** Before filing a new issue, check the v0.2.2 backlog (Sheet-01 / TZ-01 / URL-01 / CL-01 / SEED-01-local + POLISH-01/02). If a finding matches a known backlog item, the WALKTHROUGH entry cross-links to the backlog ID instead of filing a new issue.

**Exploration depth & stopping rule:**
- **D-07: Probe-count governs stop.** Each surface = 1 golden-path traversal + ≥3 deliberate weird-state probes. Stop after the 3rd unless a thread is open.
- **D-08: All four probe kinds in scope:** garbage/boundary inputs · racing/rapid actions · network/connectivity · invalid state/weird arrival paths.
- **D-09: State drift accepted.** Each probe documents its assumed-starting-state inline. Invoke the Phase 11 teardown→refresh CLI only when state genuinely blocks a probe.
- **D-10: Time budget = half-day (~4h) single focused session.** Probe-count rule wins over time budget if they conflict.
- **D-11: Surface order = ROADMAP §Phase 12 success criterion 1.** Captures (quick → full → voice → photo → url) → shortlist → vote → cooking log → history → exports → push → realtime sync → onboarding → settings.

**Live AI-API cost handling:**
- **D-12: Full live coverage.** Each AI-touching probe hits Gemini 2.5 Flash for real. Worst-case ≈ $0.50 across the phase. Each AI surface section records its Gemini call count.
- **D-13: Canned reusable input set, committed** under `.planning/v0.3/walkthrough-inputs/` — voice (2-3 clips), photo (2-3 images), url (2-3 URLs), voice-modify (1-2 clips).
- **D-14: URL surface probed normally; URL-01 documented but not re-filed.** Cross-link to the existing URL-01 backlog notation.

**Realtime sync coverage (architecture invariant #4):**
- **D-15: Two Playwright MCP browser contexts in one session.** Context A = member #3 (auditor, persistent). Context B = member #4 (joins via `DEMO01` at start of realtime section). Member #4 persists post-phase — idempotent re-seed leaves them, harmless.
- **D-16: All event classes get explicit cross-client probes.** The 6 broadcast classes from `services/realtime.py` (`recipe.created`, `recipe.promoted`, `recipe.updated`, `vote.created`, `shortlist.created`, `cooking.started`) each get ≥1 mutation-pair probe. ≈ 6-7 cross-client probes total.
- **D-17: Observation-only depth.** Mutation on B → expect event on A within ~3s, qualitative ("arrived"/"didn't arrive"). One reconnect probe: drop A's WS via DevTools, reload, verify recovery.

**Operational decisions:**
- **D-18: Screenshots committed under `.planning/v0.3/walkthrough-screenshots/`** via `mcp__playwright__browser_take_screenshot`. Filename: `<surface>-<probe-slug>.png`.
- **D-19: Push notifications testing depth = subscription + 1 fired notification.** Real `pushManager.subscribe()` against prod backend; fire one test notification (programmatic or operator-triggered).
- **D-20: WALKTHROUGH.md drafted incrementally during exploration**, not at the end. Final pass: rerun severity tags, dedupe against backlog, cross-link issues.

### Claude's Discretion

- Exact file structure under `.planning/v0.3/walkthrough-inputs/` (subdirs vs flat, naming).
- Whether to commit `.gitkeep` placeholders for `walkthrough-screenshots/` before screenshots exist.
- Exact Playwright MCP invocation patterns for two-context realtime probes (single session vs sequential).
- How to surface Gemini call counts (per-section sub-bullet vs phase-level summary).
- Exact GitHub issue filing tooling (recommend `gh issue create`).
- Order of weird-state probes within a surface.
- Whether `WALKTHROUGH.md` uses level-2 or level-3 headers per surface (recommend level-2).

### Deferred Ideas (OUT OF SCOPE)

- Latency / timing assertions for realtime events (D-17 chose observation-only).
- Stress / rapid-fire realtime probes.
- Per-surface GitHub issue labels.
- Multi-session walkthrough (overnight cron / next-day stale state).
- Cross-browser audit (Safari iOS, Chrome Android, Firefox).
- Closing v0.2.2 backlog issues during the walkthrough.
- Push notification load/timing testing beyond D-19's "subscription + 1 fired".
- Closing the Phase 14 ranking algorithm.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WALK-01 | Walkthrough exercises every shipped surface against the prod synthetic env: 5 captures + shortlist + vote + cooking log + history + exports + push + realtime sync + onboarding + settings (13 surfaces). | §3 Per-surface probe playbook covers all 13 surfaces. §10 maps each surface to its existing e2e spec for golden-path reference. |
| WALK-02 | Walkthrough is exploratory — improvised inputs, unusual paths, weird states. | §3 + §4 + §5 — every surface gets ≥3 weird-state probes drawn from the 4 D-08 kinds; canned inputs designed to exercise edges (paywalled URLs, dim photos, garbled speech). |
| WALK-03 | `WALKTHROUGH.md` with severity-tagged findings + repro steps. | §7 provides a copy-pasteable WALKTHROUGH.md skeleton with the uniform finding template. |
| WALK-04 | Blockers filed as GitHub issues; friction/nit retained as Phase 14 input. | §6 specifies the exact `gh issue create` invocation, body template, and bidirectional cross-link mechanic from D-05. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

These are repo-wide directives that constrain even an audit phase:

1. **Architecture invariant #1** (capture pipeline) — every capture surface returns a draft immediately; promotion runs server-side in a `BackgroundTask`. **Probes for capture surfaces MUST observe the draft → structured (or failed) transition** as a separate step, not assume synchronous promotion.
2. **Architecture invariant #2** (voting state computed) — vote-state probes verify the **rendered** state (Validé / Pressenti / Contesté / Rejeté / Sans avis), never inspect a `state` column.
3. **Architecture invariant #4** (realtime contract) — all 6 broadcast event classes are listed in `services/realtime.py` and locked. D-15/D-16 maps to these exactly.
4. **Architecture invariant #6** (French-only via `next-intl`) — probes that observe UI text MUST use the French strings (e.g. `Validé`, `Rejoindre un foyer existant`, `Caméra` / `Photothèque`). The existing e2e specs encode the verbatim French labels — reuse them as selector inputs.
5. **Architecture invariant #8** (HttpOnly cookie auth via Next.js rewrites) — both browser contexts (member #3 + member #4) authenticate via the cookie set by the join flow. **The auditor MUST NOT log out** of member #3 mid-session (per CONTEXT §specifics: "stay scoped").
6. **GSD Workflow Enforcement** — phase 12 plans must NOT modify product code. Per `feedback_executor_scope_creep`, plans MUST pass CONTEXT.md verbatim to executor with hard-constraint: WALKTHROUGH.md / walkthrough-inputs/ / walkthrough-screenshots/ / GitHub issues only.
7. **Push to `main` is the only deploy path** (`feedback_no_manual_vercel_deploy`) — Phase 12 doesn't deploy. Informational only.
8. **next-genai SDK** — irrelevant for this phase (no code touches Gemini); the walkthrough hits the running prod app, which already uses the right SDK.

## Summary

Phase 12 is structurally an audit operation: an autonomous agent (Claude in the executor seat, driving Playwright MCP browser tools) explores the live `[SYNTHETIC] Démo Al Dente` household across 13 surfaces, recording findings into `WALKTHROUGH.md` and filing blocker-severity issues against `lucaguery/al-dente`. Every major design choice (severity rubric, probe count, canned-input strategy, two-context realtime mechanism, issue protocol) is **locked in CONTEXT.md** — the planner's job is to translate D-01..D-20 into 4-6 task-shaped plans the executor can run end-to-end without re-asking.

The methodological insight from researching the existing 14 e2e specs is that they form a **golden-path inventory by surface** — `capture-voice.spec.ts` tells you what the success path of voice capture looks like, `shortlist-vote.spec.ts` exercises the 5 vote states from the seeded household, `invite-code-happy-path.spec.ts` is literally the two-context happy path Phase 12 deviates from for D-15/D-16 realtime probes. Reading those specs first gives the executor the verbatim French i18n strings, the actual API field names (`files` not `photos`; `/cooking-logs/{id}` not `/cooking_logs/{id}`), and the exact selectors. Phase 12's job is to deviate from those known-good paths and document where the deviations break.

The hardest probe class is the realtime two-context section (D-15/D-16). Research conclusion: **Playwright MCP supports the multi-context pattern via `browser_tabs` (multiple pages in one context, one cookie jar) but for the realtime probe we need TWO independent cookie jars (one per member)**. The pattern is: navigate context A through the join flow as member #3 (or rely on the persistent cookie if already joined), then open a new tab/context, drive the join flow again as member #4 with a different name, then mutate in B and observe in A. The existing `invite-code-happy-path.spec.ts` is the literal blueprint for this — it spawns two `BrowserContext`s with distinct cookie jars and joins them to the same household via the same flow. The Phase 12 plan should reference that file as canon.

**Primary recommendation:** Plan structure should be **5 plans**: (1) Bootstrap + canned-input artifacts, (2) Capture surfaces probe pass (5 surfaces), (3) Decide-cook-history probe pass (4 surfaces), (4) Cross-cutting probe pass (exports, push, realtime sync, onboarding, settings — 4-5 surfaces, with realtime sync the heaviest), (5) Final pass: severity sweep, backlog dedupe, GitHub issue filing, cross-link insertion. The executor runs each plan as one wave; each plan's acceptance gate is "WALKTHROUGH.md §<surface> non-empty AND ≥3 weird-state probes documented".

## Standard Stack

> **Phase 12 produces no product code.** This section catalogues the **tooling** the auditor invokes — Playwright MCP browser tools, `gh` CLI, the existing seed CLI — not new dependencies.

### Core (auditor's hands)

| Tool | Version | Purpose | Source |
|------|---------|---------|--------|
| `mcp__playwright__*` | bundled in Claude Code | Drive browser, fire probes, capture screenshots, manage tabs/contexts | `[VERIFIED: Claude Code MCP server inventory]` |
| `gh` CLI | latest stable | File GitHub issues against `lucaguery/al-dente` | `[CITED: cli.github.com — gh issue create reference]` |
| `git` | repo's pinned | Capture commit hash for permalink anchors (D-05) | `[VERIFIED: standard]` |
| `uv run seed` | extended in Phase 11 | Refresh / teardown synthetic household when state drift blocks a probe | `[VERIFIED: shipped Phase 11; see RUNBOOK.md]` |

### Supporting (artifact preparation)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| Voice recorder (operator's iPhone Voice Memos, or `sox` / `ffmpeg`) | Capture canned voice clips for `walkthrough-inputs/voice/` | Once, pre-walkthrough |
| Image search / photography | Source canned photos for `walkthrough-inputs/photo/` | Once, pre-walkthrough |
| Plain text editor | Author the canned URL list at `walkthrough-inputs/url/` | Once, pre-walkthrough |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `mcp__playwright__*` agent control | Author scripted `frontend/tests/e2e/*.spec.ts` files | CONTEXT explicitly excludes (D-15/D-16 commentary): "no new committed Playwright spec files". Spec files force determinism that defeats exploratory probing. |
| `gh issue create` | Inline `curl` against GitHub API | `gh` is already in the toolchain (used by `feedback_executor_scope_creep` issue #1 era); `curl` adds token-handling complexity. CONTEXT D-03 references `gh`. |
| Live Gemini calls | Stub Gemini in dev mode | D-12 explicitly chose live: "stubbing changes the layer being tested." Worst-case spend ~$0.50. |

**Installation:** No new packages. The toolchain is the operator's existing `gh` + `git` + Claude Code's built-in MCP servers.

**Version verification:** Playwright MCP server is bundled with Claude Code; version is whatever the running Claude Code session has. `gh --version` and `git --version` are the operator's responsibility — both required to be present per RUNBOOK.md.

## Architecture Patterns

### Recommended Artifact Structure

```
.planning/v0.3/
├── WALKTHROUGH.md                       # Primary deliverable (D-20 written incrementally)
├── walkthrough-inputs/                  # Canned reusable inputs (D-13)
│   ├── voice/
│   │   ├── 01-clean-french.m4a          # Clean French dictation, 8-12s
│   │   ├── 02-garbled-accent.m4a        # Heavily-accented or noisy speech
│   │   └── 03-very-short.m4a            # 2-3s utterance (boundary input)
│   ├── photo/
│   │   ├── 01-clean-cookbook.jpg        # Well-lit, top-down cookbook page
│   │   ├── 02-dim-handwritten.jpg       # Dimly-lit handwritten note
│   │   └── 03-non-recipe-landscape.jpg  # Negative test: a beach photo
│   ├── url/
│   │   └── urls.md                      # 3 URLs with annotations (clean / paywall / non-recipe)
│   └── voice-modify/
│       ├── 01-add-ingredient.m4a        # "rajoute des champignons"
│       └── 02-substitute.m4a            # "remplace le bœuf par du poulet"
└── walkthrough-screenshots/             # PNGs, one per documented finding (D-18)
    ├── capture-voice-garbled-input.png
    ├── shortlist-rapid-double-vote.png
    └── …                                # <surface>-<probe-slug>.png
```

Recommend: subdirs (one per AI surface) — flat would interleave audio/image/text and obscure the input/surface mapping. **Discretionary** per CONTEXT, but this layout matches D-13's enumeration verbatim.

### Pattern 1: Probe Lifecycle (uniform across all 13 surfaces)

For each surface, the executor runs this loop:

1. **Note starting state** (D-09). One-liner: "starting from: 21 recipes, 7 votes, 3 cooking_logs (post-Phase-11 baseline)" or "starting from: previous probe left 3 drafts in inbox".
2. **Run golden-path traversal**. One paragraph in WALKTHROUGH.md describing what the auditor did and what they expected. Reference the existing e2e spec by filename (e.g. "mirrors `frontend/tests/e2e/capture-voice.spec.ts` golden path with the canned `01-clean-french.m4a` input").
3. **Run ≥3 weird-state probes**, each drawn from D-08 categories. Document each probe with the uniform finding template (D-04).
4. **Decide stop**: stop after probe 3 unless a thread is open (D-07). If a probe surfaces a blocker, immediately file the GitHub issue (§6 mechanic) and continue — don't stop the surface to file.
5. **Mark section complete**: every section non-empty (find findings or "no issues found").

**Source:** Distilled from CONTEXT D-07/D-08/D-09/D-20.

### Pattern 2: Two-Context Realtime Probe (D-15/D-16)

The realtime section deviates from the per-surface pattern because it inherently needs two browser contexts. The pattern (verified against `invite-code-happy-path.spec.ts:42-163`):

```
# 1. Context A is the auditor's primary context, member #3, already authenticated
#    (joined earlier via DEMO01).
# 2. Spin up Context B via mcp__playwright__browser_tabs (or use a separate
#    incognito-like context if browser_tabs shares cookies — see §5).
# 3. In B, run the join flow with DEMO01 + new member name "Auditor B".
#    Backend issues a new aldente_auth cookie scoped to B's cookie jar.
# 4. Park A on home screen (HomeDecide — drafts inbox + shortlist visible).
# 5. In B, fire each of the 6 mutations one at a time:
#      - POST /recipes/quick (recipe.created → drafts inbox in A)
#      - canned voice clip POST → recipe.promoted (drafts inbox cross-fade in A)
#      - PUT /recipes/{id} (recipe.updated → drafts inbox in A)
#      - vote on shortlist (vote.created → vote chip update in A)
#      - regenerate shortlist (shortlist.created → swipe deck refresh in A)
#      - start cook (cooking.started → cooking banner in A)
# 6. After each mutation, screenshot A to capture the event landing (or not).
# 7. One reconnect probe (D-17): drop A's WS via DevTools (or
#    mcp__playwright__browser_evaluate to call window.dispatchEvent for offline),
#    reload, fire mutation in B, verify A recovers and receives.
```

**Source:** `frontend/tests/e2e/invite-code-happy-path.spec.ts:38-163` (literal two-context blueprint); `backend/app/services/realtime.py:1-100` (the 6 event classes).

### Pattern 3: Finding-to-Issue Cross-link (D-05)

The cross-link is bidirectional and uses a stable git permalink. The mechanic:

1. While drafting a blocker finding in WALKTHROUGH.md, give the section an explicit anchor: `### Blocker B-XX: <one-line title>`. Markdown auto-anchors will produce `#blocker-b-xx-<slug>`.
2. Stage WALKTHROUGH.md (don't commit yet).
3. File the GitHub issue. Body includes a placeholder `## WALKTHROUGH link` (filled in step 5).
4. Commit WALKTHROUGH.md. Capture the commit hash: `git rev-parse HEAD`.
5. Edit the issue body via `gh issue edit <number> --body-file -` to insert the permalink: `https://github.com/lucaguery/al-dente/blob/<commit>/.planning/v0.3/WALKTHROUGH.md#blocker-b-xx-<slug>`.
6. Append `Issue: <issue-url>` to the WALKTHROUGH finding entry. Commit again (small follow-up commit is acceptable; alternative is to delay the WALKTHROUGH commit until the issue is filed and just commit once with both directions wired).

**Recommendation for the planner:** in the final-pass plan, the executor batch-files all blocker issues at once, captures the WALKTHROUGH commit hash AFTER all issues are filed, and inserts both directions in a single follow-up commit. Cleaner history.

### Anti-Patterns to Avoid

- **Don't log out of member #3 mid-walkthrough.** Per CONTEXT §specifics: "if the auditor accidentally probes outside the synthetic household … they'd be exercising real-user data. **Don't log out** — stay scoped." The auditor's cookie persists for the full session.
- **Don't fix bugs.** Per `feedback_executor_scope_creep` — if a probe surfaces a real product bug, the auditor records it (and files the issue if blocker) and **stops on that surface, moves on**. Never opens an editor on `frontend/` or `backend/`.
- **Don't write Playwright spec files.** Per CONTEXT §domain: "No new committed Playwright spec files (this phase is agent-driven via `mcp__playwright__*`, not test-suite-driven)". The probes are agent-driven and ephemeral; the artifacts are the WALKTHROUGH and screenshots, not test code.
- **Don't synthesize / rank findings during Phase 12.** That's Phase 14's job. Phase 12 surfaces; Phase 14 ranks.
- **Don't seek cross-browser bugs.** Locked to iPhone-shape Chromium 390×844 (per `frontend/playwright.config.ts:75-89` + REQUIREMENTS Out of Scope).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser automation harness | A custom Node script that drives Chrome via CDP | `mcp__playwright__*` MCP tools | The MCP server already manages browser lifecycle, screenshots, multi-tab. Custom harness reinvents the wheel and fights the agent loop. |
| Issue filing helper script | A Python wrapper that POSTs to GitHub API | `gh issue create` from the executor | `gh` is the canonical CLI, handles auth via the operator's existing token, supports labels and body via `--body-file -`. |
| WALKTHROUGH-to-issue cross-link automation | A post-commit hook that rewrites issue bodies | Manual `gh issue edit` after the WALKTHROUGH commit hash is known | Bespoke automation for a one-shot phase is overkill. The bidirectional cross-link is ~10 lines of executor steps in the final-pass plan. |
| Canned-input recording rig | Audio-generation library or TTS pipeline | Operator records 3-5 short clips on iPhone Voice Memos, saves as `.m4a`, commits | The clips are ~2 minutes of total audio across the entire phase. TTS introduces a different distribution than real human speech (the layer being tested). |
| Realtime probe detector | Custom WS sniffer that counts inbound frames | Visual observation in Context A + screenshot evidence | D-17 is observation-only ("arrived"/"didn't arrive"). Sniffing adds tooling complexity without changing the qualitative answer. |
| Severity classification automation | NLP-based classifier on finding text | Human (auditor) judgment per D-01/D-02 | Severity is a **judgment**, not a measurable property. Automating it loses the very thing Phase 12 brings. |

**Key insight:** Phase 12's value is **agent-driven exploration with human judgment captured in markdown**. Anything that automates judgment moves outside the phase's purpose. The tooling exists only to drive the browser and file artifacts.

## Tooling: Playwright MCP Surface Area

> This is the **single most important section** for the planner. The executor needs to know exactly which `mcp__playwright__*` calls map to each probe behavior.

### Core navigation & interaction

| Tool | Purpose | Phase 12 Usage |
|------|---------|----------------|
| `mcp__playwright__browser_navigate` | URL navigation | Visit each surface (`/`, `/recipes/new`, `/cooking-logs`, `/settings`, etc.) |
| `mcp__playwright__browser_resize` | Set viewport size | Set 390×844 at session start (mirror `frontend/playwright.config.ts:87`) |
| `mcp__playwright__browser_click` | Click element | Tap buttons, swipe initiator, vote thumbs |
| `mcp__playwright__browser_type` | Type into input | Fill text inputs (recipe title, notes, invite code) |
| `mcp__playwright__browser_fill_form` | Multi-field form fill | Onboarding create form, full-recipe form |
| `mcp__playwright__browser_press_key` | Key press | Submit on Enter, paste shortcuts |
| `mcp__playwright__browser_select_option` | Dropdown selection | Cuisine / Mood / Season selectors on full-form capture |
| `mcp__playwright__browser_hover` | Hover element | Reveal tooltips (low-yield on mobile-shape but available) |

### Inspection (probe outputs)

| Tool | Purpose | Phase 12 Usage |
|------|---------|----------------|
| `mcp__playwright__browser_snapshot` | DOM accessibility tree | Verify expected elements rendered after probe; the auditor's primary "did the right thing render?" call |
| `mcp__playwright__browser_take_screenshot` | PNG capture | One per finding (D-18); commit to `walkthrough-screenshots/<surface>-<probe>.png` |
| `mcp__playwright__browser_console_messages` | Console errors/warnings | Catch frontend exceptions during probes; CRITICAL for invariant-state probes |
| `mcp__playwright__browser_network_requests` | Network log | Verify backend POSTs fire, observe response codes (4xx/5xx surfaces blockers) |

### Probe-specific tools

| Tool | Purpose | Phase 12 Usage |
|------|---------|----------------|
| `mcp__playwright__browser_file_upload` | Set files on a file input | Upload canned photos for capture-photo + voice clips for capture-voice (note: voice surface may need `<input type="file" accept="audio/*">` not real mic) |
| `mcp__playwright__browser_tabs` | Open/switch/close tabs | TWO-CONTEXT realtime probe (D-15) — see §5 caveat about cookie-jar sharing |
| `mcp__playwright__browser_evaluate` | Run arbitrary JS in page | Force `window.dispatchEvent(new Event('offline'))`, drop the WS via internal closure, query `localStorage`, mutate `document.cookie` (read-only for HttpOnly), trigger SW lifecycle events |
| `mcp__playwright__browser_handle_dialog` | Accept/dismiss `alert`/`confirm`/`prompt` | App-internal — unlikely in this PWA but available |
| `mcp__playwright__browser_wait_for` | Wait for text or element | Wait for `recipe.created` event landing in drafts inbox after cross-context mutation |

### What Playwright MCP CAN'T do (vs raw Playwright)

These are constraints the planner must encode so the executor doesn't write impossible probes:

1. **No Playwright `request` API** (the headless HTTP client used by the existing e2e specs at `capture-voice.spec.ts:14` etc.). MCP only exposes browser-driving primitives. Workaround: use `browser_evaluate` to fire `fetch()` from the page context, or just use the UI.
2. **No direct context creation** — `browser_tabs` opens a new tab in the **same browser context** by default, sharing cookies. For TWO INDEPENDENT cookie jars (member #3 vs member #4), the auditor likely needs to manage the second member's join in the same context (cookie gets overwritten on member #4's join, then back to member #3's by re-entering DEMO01) OR rely on the **fact that the second tab in `browser_tabs` runs the same cookie jar — meaning sequential mutations rather than truly concurrent two-context observation**. This is the gnarliest constraint of the phase. **Mitigation:** the realtime probes can run as "navigate B, fire mutation, navigate back to A's tab, observe DOM updated by WS broadcast". The cookie identity matters only for the **member who fired the mutation** (server scopes broadcast by household, not member); both A and B are members of the same household, so the broadcast reaches both regardless of which tab is active. WS connections are per-tab — context A's WS stays connected even when the tab is backgrounded.
3. **No `BrowserContext.cookies()` API** (used in `invite-code-happy-path.spec.ts:78-84` to verify HttpOnly cookie was set). Workaround: use `browser_network_requests` to observe the `Set-Cookie` response header on the join POST.
4. **No native dialog suppression / network throttling at protocol level.** For "slow 3G" probes (D-08 kind 3), the executor uses `browser_evaluate` to inject `await new Promise(r => setTimeout(r, ...))` shims into `window.fetch`, OR documents that throttling was simulated via DevTools UI clicks (less reliable) OR omits the throttle and tests offline only.
5. **No mic permission grant.** The capture-voice surface in production uses iOS keyboard dictation (CAPTURE-04, see `capture-voice.spec.ts:11`); the page submits a transcript as JSON. Phase 12 probes the **transcript-submission** path, not Web Speech. The "voice clip" canned inputs are for the **photo-of-recipe-from-voice** flow's Gemini side — confirm the actual surface shape early in the walkthrough by reading the page, not assuming.
6. **No Service Worker direct control.** For push-notification probes (D-19), the executor verifies subscription via `browser_evaluate(() => navigator.serviceWorker.ready.then(r => r.pushManager.getSubscription()))` and observes the side effects, but cannot programmatically simulate FCM/APNs delivery. Operator-triggered round-trip is the documented fallback (D-19).

### Tool-call cheat sheet per probe kind (D-08)

| D-08 kind | Primary MCP tools | Concrete tactic |
|-----------|-------------------|-----------------|
| 1. Garbage / boundary inputs | `browser_type` + `browser_click` | Paste 5KB of text into recipe title, type pure emoji `🍝🍝🍝`, leave required field empty + submit, type leading whitespace + diacritics |
| 2. Racing / rapid actions | `browser_click` ×2 fast, `browser_navigate` mid-flow | Double-click submit, `browser_navigate('/')` while a `BackgroundTask` is mid-promotion, switch tabs and back via `browser_tabs` |
| 3. Network / connectivity | `browser_evaluate` to dispatch `offline` event, `browser_evaluate` to override `fetch` | `browser_evaluate(() => window.dispatchEvent(new Event('offline')))`, `browser_evaluate(() => { const orig = window.fetch; window.fetch = (...a) => new Promise(r => setTimeout(() => r(orig(...a)), 5000)); })` for slow-3G simulation |
| 4. Invalid state / weird arrivals | `browser_navigate` with bad routes | `browser_navigate('/recipes/00000000-0000-0000-0000-000000000000')`, `browser_navigate('/cooking-logs/<bad-uuid>/finalize')`, deep-link into `/onboarding/share-code?code=ZZZZZZ` |

## Per-Surface Probe Playbook

> The planner uses this as templates; the executor adapts when the surface's actual shape (read live during exploration) differs. Each surface lists its **golden-path reference** (existing e2e spec) and **3 sample weird-state probes** drawn across D-08 kinds. The executor runs ≥3 per D-07 — they may pick from these or improvise additional probes.

### Surface 1: Capture — Quick (`/recipes/new` → "Quick" tab)

- **Golden-path reference:** `frontend/tests/e2e/capture-quick.spec.ts`
- **Endpoint:** `POST /api/recipes/quick`
- **Probes:**
  1. **(Garbage)** Submit empty title — observe error state vs. silent acceptance vs. server-side 422.
  2. **(Boundary)** Title = 5KB of random French text + emoji + diacritics. Does the draft promote? Does the inbox render the over-long title?
  3. **(Racing)** Double-tap submit. Two drafts created? Idempotency token?
- **Acceptance check:** invariant #1 — draft returns immediately, then `recipe.promoted` event lands in the inbox via WS.

### Surface 2: Capture — Full (`/recipes/new` → "Complète" tab)

- **Golden-path reference:** `frontend/tests/e2e/capture-full.spec.ts`
- **Endpoint:** `POST /api/recipes` (full payload)
- **Probes:**
  1. **(Garbage)** Skip required fields → observe validation. Mix of locked-vocab values (Cuisine = `italian`) with free-text fields filled with garbage.
  2. **(Boundary)** Ingredients list = 200 lines. Renders? Submits? Promoted shape preserves all 200?
  3. **(Invalid arrival)** Navigate directly to `/recipes/new?tab=full&prefilled=<bad-json>` — does the form crash, ignore, or sanitize?

### Surface 3: Capture — Voice (`/recipes/new` → "Voix" tab)

- **Golden-path reference:** `frontend/tests/e2e/capture-voice.spec.ts` (note: this spec posts a transcript JSON, NOT a voice file — confirm the actual prod surface shape during exploration)
- **Endpoint:** `POST /api/recipes/voice` with `{ transcript: "..." }`
- **Canned inputs:** `walkthrough-inputs/voice/01-clean-french.m4a`, `02-garbled-accent.m4a`, `03-very-short.m4a` — but **the upload mechanic in production is OS keyboard dictation that types into a textarea** (CAPTURE-04), so canned inputs may need to be **transcripts** (text), not audio. Confirm during the walkthrough; if production accepts audio uploads on this surface, use the .m4a clips; if it only accepts transcripts, use textual transcripts of those clips committed alongside (e.g. `01-clean-french.txt`).
- **Probes:**
  1. **(Garbage)** Submit transcript with 0 recognizable recipe content (e.g. "the cat sat on the mat in French"). Does Gemini return a structured recipe anyway? What does it look like?
  2. **(Boundary)** Submit very short transcript (5 words). Promotion succeeds with sparse data? Or fails gracefully?
  3. **(Racing)** Submit two transcripts back-to-back within 200ms. Both promote? Order preserved in inbox?
- **Gemini call accounting:** ~3 calls. Note in WALKTHROUGH §capture-voice.

### Surface 4: Capture — Photo (`/recipes/new` → "Photo" tab)

- **Golden-path reference:** `frontend/tests/e2e/capture-photo.spec.ts`
- **Endpoint:** `POST /api/recipes/photo` with `multipart/form-data` field name `files` (NOT `photos` — see spec line 43)
- **Canned inputs:** `walkthrough-inputs/photo/01-clean-cookbook.jpg`, `02-dim-handwritten.jpg`, `03-non-recipe-landscape.jpg`
- **Probes:**
  1. **(Garbage)** Upload `03-non-recipe-landscape.jpg` (a beach photo). Does Gemini extract a "recipe"? Hallucinate? Refuse?
  2. **(Boundary)** Upload `02-dim-handwritten.jpg` — OCR edge. Promotion succeeds? Title makes sense?
  3. **(Invalid state — known blocker)** Tap "Ajouter une photo" — does the bottom sheet render onscreen? **This is Sheet-01 [#1].** Per D-06, do NOT file a new issue; cross-link to existing #1.
- **Gemini call accounting:** ~3 calls.

### Surface 5: Capture — URL (`/recipes/new` → "URL" tab)

- **Golden-path reference:** `frontend/tests/e2e/capture-url.spec.ts`
- **Endpoint:** `POST /api/recipes/url` with `{ url: "..." }`
- **Canned inputs:** `walkthrough-inputs/url/urls.md` listing 3 URLs (clean recipe site / paywalled site / non-recipe wikipedia article)
- **Probes:**
  1. **(Golden-then-boundary)** Submit clean URL (e.g. https://www.marmiton.org/recettes/recette_risotto-aux-champignons_28057.aspx). Promotion succeeds? **Per URL-01 backlog this is `# TODO(productize)` and never promotes.** Document as blocker per D-14, cross-link to URL-01, do NOT file new issue.
  2. **(Garbage)** Submit `not-a-url-just-text`. 422? Silent failure?
  3. **(Network)** Submit URL to a deliberately-slow site (e.g. `http://httpbin.org/delay/30`). Does the BackgroundTask hang, time out, or give up?
- **Gemini call accounting:** ~3 calls (may not all hit Gemini if URL-01 short-circuits).
- **WALKTHROUGH cross-link:** "See `.planning/PROJECT.md` §Surfaced for follow-up — URL-01."

### Surface 6: Shortlist (`/` HomeDecide swipe deck)

- **Golden-path reference:** `frontend/tests/e2e/shortlist-vote.spec.ts`
- **Probes:**
  1. **(Boundary)** Swipe rapidly through all 5 cards (synthetic env has 5 in shortlist). Does the deck end-state render correctly? Does the regenerate prompt appear?
  2. **(Racing)** Tap "Régénérer" while a vote is in flight. Both succeed? Stale shortlist briefly visible?
  3. **(Invalid arrival)** Navigate to `/` after the auditor has voted on every card. Does HomeDecide render the empty / completed state? `Sans avis` recipes filter rule?

### Surface 7: Vote (chip transitions on shortlist cards)

- **Golden-path reference:** `frontend/tests/e2e/shortlist-vote.spec.ts:76-120` (the live-vote spec)
- **Probes:**
  1. **(Racing)** Vote yes, then immediately vote no on the same card before the first response lands. Final state? Optimistic-update race?
  2. **(Invariant probe)** After voting, refresh — the **computed** state must match (invariant #2). Validé / Pressenti / Contesté / Rejeté / Sans avis label correct?
  3. **(Boundary — veto window)** Per SPEC.md: veto window closes on first `CookingLog` for the day. Try to vote no after a cook has been finalized. Does the UI prevent the vote? Does the backend 4xx?

### Surface 8: Cooking Log Create + Finalize (`/recipes/<id>` → "Cuisiner" + `/cooking-logs/<id>/finalize`)

- **Golden-path reference:** `frontend/tests/e2e/cooking-log-create-finalize.spec.ts`
- **Probes:**
  1. **(Known blocker — TZ-01)** Start a cook close to local midnight (or simulate by changing system clock). Does finalize page render or show "Cette cuisson n'est plus disponible"? **Cross-link to TZ-01 backlog**, no new issue.
  2. **(Boundary)** Finalize with notes = 5KB of text. Stored? Rendered correctly on the recipe detail card later?
  3. **(Racing)** Tap "Finaliser" while offline (`browser_evaluate` to dispatch `offline` event). Does the locked offline toast (COOK-11) fire? After regaining connectivity, does the queued finalize replay?

### Surface 9: History (`/cooking-logs`)

- **Golden-path reference:** `frontend/tests/e2e/cooking-log-history.spec.ts`
- **Probes:**
  1. **(Known blocker — CL-01)** Visit `/cooking-logs` — backend GET /cooking-logs (list) endpoint is missing per CL-01 backlog; page renders empty even with 3 seeded cooking_logs. **Cross-link to CL-01 backlog**, no new issue.
  2. **(Friction)** Group-by-date headers — does an empty group render? What about a future-dated cook (TZ-01 again)?
  3. **(Invalid arrival)** Deep-link `/cooking-logs/<bad-uuid>` directly. 404 page or crash?

### Surface 10: Exports (Settings → JSON export)

- **Golden-path reference:** None (no e2e spec). Refer to `backend/app/routers/exports.py`.
- **Probes:**
  1. **(Golden)** Trigger JSON export, observe download. File contains synthetic household data? Schema reasonable?
  2. **(Network)** Trigger export while offline. Error state clear?
  3. **(Boundary)** Trigger export twice rapidly. Two files? Single coalesced?
- **Note:** Playwright MCP file-download interception is limited. Document the download URL via `browser_network_requests` and inspect the response body as text/JSON.

### Surface 11: Push (Settings → enable notifications)

- **Golden-path reference:** None (no e2e spec; relies on real `pushManager.subscribe()`).
- **Probes (per D-19, depth = subscribe + 1 fired):**
  1. **(Golden)** Tap "Activer les notifications" → grant permission → observe `pushManager.subscribe()` POSTs subscription to `/api/push/subscribe`. Use `browser_network_requests` to verify.
  2. **(Send round-trip)** Use the existing send mechanism (or operator-triggered `gh issue` if no programmatic path) to fire one notification. Observe arrival.
  3. **(Boundary)** Re-tap "Activer" when already subscribed. Idempotent? Duplicate subscription rows in DB?
- **Note (D-19):** If the auditor cannot programmatically trigger a send, document and ask the operator to fire one round-trip from their iPhone. The operator confirms inline ("verified by Luca on 2026-05-09 13:42, notification arrived in ~2s"). This is **expected**, not a blocker.

### Surface 12: Realtime Sync (cross-tab, member #3 ↔ member #4)

- **Golden-path reference:** `frontend/tests/e2e/invite-code-happy-path.spec.ts` (two-context blueprint).
- **Source of event classes:** `backend/app/services/realtime.py:9-19` (the 6 broadcast classes — `recipe.created`, `recipe.promoted`, `recipe.updated`, `vote.created`, `shortlist.created`, `cooking.started`).
- **Probes (D-16 mandates ≥1 per event class + 1 reconnect):**
  1. **`recipe.created`** — In B, POST a quick capture. Observe drafts inbox in A receive the new draft via WS (slideUp animation).
  2. **`recipe.promoted`** — In B, POST a voice transcript. Observe drafts inbox in A: draft slides in, then Badge cross-fades to `structured`.
  3. **`recipe.updated`** — In B, PUT a recipe. Observe A's view of that recipe (or the inbox card) updating.
  4. **`vote.created`** — In B, vote yes on a shortlist card. Observe A's vote chip flipping.
  5. **`shortlist.created`** — In B, regenerate shortlist. Observe A's swipe deck refreshing.
  6. **`cooking.started`** — In B, start a cook on a recipe. Observe A's cooking banner appearing.
  7. **Reconnect (D-17)** — In A, drop the WS via `browser_evaluate` (e.g. close it via accessing the internal `ws.ts` ref, or simulate via `dispatchEvent('offline')` then `online`). Reload A. Fire a mutation in B. A receives the event.
- **Tab management:** Use `browser_tabs` to open Tab B. Switch between tabs with `browser_tabs(action: 'select', index: ...)`. Note that **cookies are shared across tabs in one context** (per §2 caveat) — the auditor's cookie is for member #3, but tab B can re-onboard via DEMO01 with a different name (which OVERWRITES the cookie to member #4). The simplest pattern: do all of B's mutations first as member #4 (cookie = #4 token), then re-enter DEMO01 in tab A with member #3 name **NO — this destroys A's session**. Instead: keep member #3 logged in throughout in tab A, do member #4 join in tab B, and let the cookie write happen in tab B's tab-scoped context if MCP isolates per-tab — **VERIFY THIS DURING THE WALKTHROUGH**. If it doesn't isolate per tab, the practical fallback is: open two separate Claude Code MCP browser sessions sequentially, one as member #3, one as member #4, and assert events landed by reading Network/WebSocket frames in each session. Document the actual isolation behavior in the WALKTHROUGH §realtime.

### Surface 13: Onboarding (`/onboarding/welcome` → join via DEMO01)

- **Golden-path reference:** `frontend/tests/e2e/invite-code-happy-path.spec.ts` (use the join half).
- **Probes:**
  1. **(Garbage)** Submit invite code = "ZZZZZZ" (correct shape, doesn't exist). Error state? Friction-grade UX?
  2. **(Boundary)** Submit invite code in lowercase `demo01` — does the input uppercase/filter (per `join/page.tsx#177-181`)?
  3. **(Invalid state)** Try to join with a duplicate color (member #3 has rose). Backend returns 409 (per `households.py#171`). Frontend surfaces what?

### Surface 14 (= 13th by CONTEXT count): Settings (`/settings`)

- **Golden-path reference:** `frontend/tests/e2e/settings.spec.ts`
- **Probes:**
  1. **(Boundary)** Change member name to 200 chars + emoji + diacritics. Render correctly across all surfaces afterwards?
  2. **(Invalid state)** Try to leave the household via the "Quitter le foyer" path (if exposed). What state remains? Re-onboarding required?
  3. **(Friction)** Inspect the invite-code section — does it have a Copy button? **POLISH-02 backlog** — cross-link if present, raise as friction if not.

## Canned Input Artifact Specs (D-13)

### Voice clips (`walkthrough-inputs/voice/`)

> **Confirm the actual surface shape first.** `capture-voice.spec.ts` shows production accepts a JSON `{transcript: "..."}` payload (not audio). If the prod /recipes/voice surface only accepts transcripts, commit `.txt` files instead of `.m4a`. If it accepts audio, commit both audio and the corresponding transcripts. Source: `backend/app/routers/recipes.py` voice endpoint (read live).

| File | Format | Duration | Content | Purpose |
|------|--------|----------|---------|---------|
| `01-clean-french.m4a` | m4a (AAC, 64-128kbps mono) | 8-12s | Clear French dictation: "Risotto aux champignons, pour deux personnes, riz arborio, parmesan, bouillon de légumes, oignon, vin blanc." | Golden path; baseline Gemini accuracy |
| `02-garbled-accent.m4a` | m4a | 10-15s | Same recipe but with heavy regional accent OR background noise (kitchen sounds + speech) | Edge: how does Gemini handle low-SNR input? |
| `03-very-short.m4a` | m4a | 2-3s | "Pâtes au beurre." | Boundary: minimal information; does promotion produce a sparse but valid recipe? |
| `01-clean-french.txt` etc. | text fallback | n/a | Verbatim transcripts | Fallback if prod surface only accepts text |

**Recommendation on format:** m4a (AAC) is iOS Voice Memos default, plays in any browser, ≤100KB for 10s @ 64kbps. WebM is also fine. Avoid WAV (uncompressed → 1MB+).

**Recommendation on length:** 8-12s is the sweet spot for Gemini 2.5 Flash. Sub-5s clips risk under-extraction; >30s clips risk hitting Vercel proxy timeouts (typically ~10-30s default for serverless functions; verify against the prod deploy). `[ASSUMED]` — Vercel's exact proxy timeout for the al-dente backend route depends on Railway forwarding, not Vercel function limits, since the backend is on Railway. Real ceiling is more likely Gemini's response latency (~3-8s for short audio) — well under any practical timeout.

**French-language verification:** All clips MUST be French (project is French-only via next-intl, invariant #6). `[CITED: CLAUDE.md invariant 6]`

### Photo images (`walkthrough-inputs/photo/`)

| File | Dimensions | Quality | Content | Purpose |
|------|-----------|---------|---------|---------|
| `01-clean-cookbook.jpg` | 1024×1280 (≤200KB) | JPEG 80% | Well-lit, top-down photo of a cookbook page in French (or a printed recipe card) | Golden path; Gemini OCR baseline |
| `02-dim-handwritten.jpg` | 1024×1280 (≤200KB) | JPEG 75% | Dimly-lit handwritten recipe (notebook page, low contrast) | Edge: handwriting + low light |
| `03-non-recipe-landscape.jpg` | 1024×768 (≤150KB) | JPEG 80% | A landscape (beach, mountain — anything non-food) | Negative test: how does Gemini fail when input is irrelevant? |

**Recommendation on dimensions:** Match the iPhone camera roll roughly (4:3 aspect, 1024px long edge) — covers the realistic upload size. 200KB ceiling avoids upload-latency confounds.

**Recommendation on JPEG quality:** 75-85% is the iPhone camera default. Lower quality is itself an interesting probe (Gemini OCR robustness).

**Source:** Use Unsplash CC0 / Pexels (same source pattern as Phase 11's 21 committed photos per CONTEXT D-20). Or operator captures originals on iPhone — even simpler, no licensing question.

### URL list (`walkthrough-inputs/url/urls.md`)

A single markdown file is enough; no need for one file per URL. Recommended content:

```markdown
# Phase 12 walkthrough — canned URL inputs

## 01 — Clean recipe site (golden path)
https://www.marmiton.org/recettes/recette_risotto-aux-champignons_28057.aspx

Expected: clean recipe extraction, structured promotion. Notes: marmiton.org
is the de-facto French recipe site; should be Gemini-friendly.

## 02 — Paywalled site (negative test)
https://www.lemonde.fr/cuisine/article/<some-paywalled-recipe>.html

Expected: Gemini can't see the body; promotion may produce a stub or fail
gracefully. NOTE: avoid filing a blocker for paywall behavior — that's an
external-content limitation, not a product bug.

## 03 — Non-recipe URL (boundary)
https://en.wikipedia.org/wiki/Risotto

Expected: Wikipedia article, not a recipe — Gemini may extract structured
fields anyway from the description. Document what happens.
```

**Recommendation:** Pick the actual paywalled URL during input authoring (URLs change). Document the date checked.

### Voice-modify clips (`walkthrough-inputs/voice-modify/`)

| File | Format | Duration | Content | Purpose |
|------|--------|----------|---------|---------|
| `01-add-ingredient.m4a` | m4a | 3-5s | "Rajoute des champignons et de la crème." | Modification flow: append ingredients |
| `02-substitute.m4a` | m4a | 3-5s | "Remplace le bœuf par du poulet." | Modification flow: substitution |

**Use:** Apply each modification to one of the 21 seeded recipes in the synthetic household via the voice-modify surface. Observe the resulting modified recipe.

## Realtime Sync Two-Context Invocation Pattern (D-15/D-16)

### The mechanic — recommended sequence

The cookie-jar caveat (§2 of "What MCP can't do") is the single biggest unknown. Below is the recommended sequence, with the **key verification step** the executor MUST do early:

```
Step 0 — verify cookie isolation behavior in MCP:
  - mcp__playwright__browser_navigate('https://<prod-domain>/onboarding/welcome')
  - Run join flow as member #4 with DEMO01.
  - mcp__playwright__browser_tabs(action: 'new')  → Tab 2 opens
  - mcp__playwright__browser_navigate('https://<prod-domain>/')  in Tab 2
  - Are we authenticated as member #4 in Tab 2? (yes = shared cookie jar)
  - If shared, run the realtime probe as: stay logged in as member #4 in Tab 2;
    in Tab 1, the existing member #3 cookie is still in the jar (it was
    overwritten by the join — so member #3 is GONE).
  - If NOT shared (per-tab isolation), run the canonical pattern below.
  - Document the verified behavior in WALKTHROUGH.md §realtime.

Recommended canonical pattern (works regardless of isolation behavior):
  - Use TWO sequential MCP browser sessions, not two tabs.
  - Session 1: member #3 (auditor) — drives observation. Park on home screen.
  - Session 2: member #4 — drives mutations.
  - Both authenticated to the same household via DEMO01 with different names.
  - For each event class (D-16):
      1. Take screenshot of A's home screen as baseline.
      2. In B, fire the mutation (POST recipe, vote, etc.).
      3. Wait ~3s in A's session.
      4. Take screenshot of A's home screen.
      5. Diff visually OR snapshot DOM via mcp__playwright__browser_snapshot
         and confirm the expected element appeared (e.g. new draft card).
      6. Record outcome in WALKTHROUGH.

Reconnect probe (D-17):
  - In A, mcp__playwright__browser_evaluate(() => {
      // Brutalist: navigate to an internal-only ws-debug URL if exposed,
      // or use offline event:
      window.dispatchEvent(new Event('offline'));
    })
  - Wait 2s.
  - mcp__playwright__browser_evaluate(() => {
      window.dispatchEvent(new Event('online'));
    })
  - Reload A: mcp__playwright__browser_navigate('/').
  - In B, fire a recipe.created mutation.
  - Verify A receives via screenshot + DOM snapshot.
```

### Why two sessions is the safer fallback

- The two-tab approach risks cookie overwrite (tab 2's join overwrites tab 1's cookie). Even if MCP isolates cookies per-tab, the WS reconnect logic in `frontend/lib/ws.ts` reads the cookie at connection time — if the cookie has been swapped, A's WS may reconnect as member #4, breaking the test premise.
- Two sequential MCP sessions are clean: each has its own browser process, its own cookie jar, its own WS connection. The downside is the auditor must context-switch between sessions, but the realtime section is bounded (~30 minutes of probes).
- If `mcp__playwright__browser_tabs` does provide per-tab cookie isolation in the version Claude Code ships, the executor can use it and skip the two-session dance. The verification step (Step 0 above) settles this in 5 minutes.

### What to capture in `WALKTHROUGH.md §realtime`

- One-paragraph preamble noting the cookie-isolation behavior observed.
- Numbered probe entries (one per event class, 6 total + 1 reconnect = 7).
- Each probe: starting state · mutation in B · expected event in A (≤3s) · actual outcome · screenshot reference.
- Final notes: any event class that didn't arrive, ordering oddities, reconnect time observed.

## GitHub Issue Filing Template (D-03 / D-05)

### `gh issue create` invocation

```bash
gh issue create \
  --repo lucaguery/al-dente \
  --title "Capture-photo: bottom sheet renders off-screen on iPhone viewport" \
  --label "audit:walkthrough" \
  --body-file - <<'EOF'
## Repro

1. Open `https://<prod-domain>/recipes/new` on an iPhone-shape viewport (390×844, isMobile).
2. Tap the "Photo" tab.
3. Tap "Ajouter une photo".

## Expected

The bottom sheet appears pinned to the viewport bottom; both `Caméra` and `Photothèque` buttons are visible without scrolling.

## Actual

The sheet renders in document flow (top: 702px) — both buttons are off-screen below the viewport. User cannot reach the file-source buttons.

## WALKTHROUGH link

<filled-in-after-WALKTHROUGH-commit — see D-05 mechanic>
EOF
```

**Notes:**
- `--repo` MUST be `lucaguery/al-dente` (CONTEXT canonical refs).
- `--label "audit:walkthrough"` — single label per D-03. **The label must exist on the repo.** Plan should include a one-time `gh label create audit:walkthrough --repo lucaguery/al-dente --color "FBCA04" --description "Phase 12 walkthrough findings"` invocation in the bootstrap plan (idempotent: `--force` if it already exists, OR a check via `gh label list` first).
- Title: one line, ≤80 chars, `<surface>: <one-line summary>`.
- Body via `--body-file -` heredoc — preserves multi-line markdown, avoids quoting hell.
- The `## WALKTHROUGH link` placeholder is filled in via `gh issue edit <number> --body-file -` AFTER the WALKTHROUGH commit hash is known (D-05 mechanic).

### Body template (canonical)

```markdown
## Repro

1. <step 1 — concrete action with selectors / inputs>
2. <step 2>
3. <step 3>

## Expected

<one paragraph or bullet list of expected behavior>

## Actual

<one paragraph or bullet list of observed behavior; include any error messages or stack-trace snippets verbatim>

## WALKTHROUGH link

https://github.com/lucaguery/al-dente/blob/<commit-hash>/.planning/v0.3/WALKTHROUGH.md#<anchor>
```

This shape mirrors v0.2.1 [#1](https://github.com/lucaguery/al-dente/issues/1) per CONTEXT D-03.

### Filing in batch (final-pass plan)

Execute as a small bash script in the executor's last plan:

```bash
# After all blockers are documented in WALKTHROUGH.md, file each one in turn.
# Each loop iteration: gh issue create → capture issue URL → append to a
# local mapping file → continue.

declare -A ISSUES
for blocker in B-01 B-02 B-03; do
  TITLE=$(awk "/### Blocker $blocker:/{getline; print; exit}" WALKTHROUGH.md | sed 's/^[[:space:]]*//')
  BODY=$(./extract_blocker_body.sh "$blocker")  # tiny helper script
  URL=$(gh issue create --repo lucaguery/al-dente \
    --title "$TITLE" \
    --label "audit:walkthrough" \
    --body "$BODY" 2>/dev/null | tail -1)
  ISSUES[$blocker]=$URL
done

# Commit WALKTHROUGH.md with placeholder issue URLs replaced by real ones.
# Capture the new commit hash, then patch each issue body with the
# .../blob/<commit>/.planning/v0.3/WALKTHROUGH.md#<anchor> permalink.
```

The planner can decide if a helper script is overkill (recommendation: keep it inline in the plan's Action steps; ~10 lines of bash).

## WALKTHROUGH.md Skeleton

> Copy-pasteable template. The executor fills section bodies as they probe (D-20). Section headers are level-2 (recommended in CONTEXT discretion).

```markdown
# v0.3 Phase 12 — Exploratory Feature Walkthrough

**Auditor:** Claude (Playwright MCP) — member #3 (`DEMO01`)
**Realtime co-auditor:** member #4 (`DEMO01`, joined for the realtime section)
**Target environment:** prod Supabase, `[SYNTHETIC] Démo Al Dente` household
**Session date:** YYYY-MM-DD
**Session length:** ~Xh
**Gemini call total:** ~XX (per-section breakdown below)

## How to read this document

Each section corresponds to one of 13 shipped surfaces (per ROADMAP §Phase 12 success criterion 1). Each surface has:

- A one-paragraph **golden-path note** describing what the auditor exercised first.
- A **starting-state** preamble for each probe (per CONTEXT D-09).
- ≥3 **weird-state probes** (per D-07), each documented with the uniform finding template (D-04):

  ```
  ### <severity-tag> <P-XX>: <one-line title>
  **Severity:** blocker | friction | nit
  **Surface:** <surface name>
  **Probe kind:** garbage | racing | network | invalid-state
  **Starting state:** <one-liner>
  **Repro:**
  1. <step>
  2. <step>
  **Expected:** <one paragraph>
  **Actual:** <one paragraph>
  **Screenshot:** `walkthrough-screenshots/<surface>-<probe-slug>.png` (optional)
  **Issue:** <github-url> (blockers only — D-05)
  ```

- A **Gemini call count** at the bottom of each AI-touching section.

Severity rubric (locked in CONTEXT D-01/D-02):
- **blocker** — crash / 500 / data loss, OR primary intended action non-functional even via workaround. Files a GitHub issue.
- **friction** — costs the user time, attention, or confidence. Stays in this doc as Phase 14 input.
- **nit** — visual or copy polish. Stays in this doc as Phase 14 input.

## Backlog dedupe (D-06)

Findings that match a known v0.2.2 backlog item are documented but DO NOT generate new GitHub issues. Cross-links use the backlog ID:

- `Sheet-01` ([#1](https://github.com/lucaguery/al-dente/issues/1)) — bottom sheet off-screen
- `TZ-01` — cooking-log timezone bug
- `URL-01` — URL extraction stub
- `CL-01` — GET /cooking-logs missing
- `SEED-01-local` — local seed cross-day idempotency
- `POLISH-01` / `POLISH-02` — i18n + Copy button

---

## Capture — Quick

**Starting state:** post-Phase-11 baseline (21 recipes, 7 votes, 3 cooking_logs).
**Golden path:** mirrored `frontend/tests/e2e/capture-quick.spec.ts` — submit a one-line title via the Quick tab, observed draft return, watched promotion to `structured` via WS.

### <severity> <P-01-01>: <title>
…

### <severity> <P-01-02>: <title>
…

### <severity> <P-01-03>: <title>
…

**Gemini calls in this section:** 0 (Quick capture is non-AI).

---

## Capture — Full
…

## Capture — Voice
…

## Capture — Photo
…

## Capture — URL
…

## Shortlist
…

## Vote
…

## Cooking Log
…

## History
…

## Exports
…

## Push
…

## Realtime Sync

**Two-context setup:** <documented cookie-isolation behavior — see §5 of 12-RESEARCH.md>

### <severity> <P-12-01>: recipe.created cross-client
…

### <severity> <P-12-02>: recipe.promoted cross-client
…

(6 event-class probes + 1 reconnect = 7 entries)

---

## Onboarding
…

## Settings
…

---

## Summary

**Findings by severity:**
- Blockers: X (Y filed as new issues, Z cross-linked to backlog)
- Friction: A
- Nits: B

**Gemini calls total:** ~XX (per-section breakdown above).

**Surfaces with no issues found:** <list>

## Inputs to Phase 14

This document, together with `walkthrough-screenshots/` and the filed GitHub issues, is the input set Phase 14 (`/gsd-new-milestone` synthesis) consumes.
```

## Validation Architecture: Explicitly N/A

**Two compounding reasons this section is N/A:**

1. **`workflow.nyquist_validation` is `false`** in `.planning/config.json` (verified: `"nyquist_validation": false`). The framework is disabled at the project level.
2. **Phase 12 has no testable code.** The deliverable is a markdown report (`WALKTHROUGH.md`), input artifacts, and screenshots. There is no source code to validate via tests. The "validation" of Phase 12 is whether the **4 ROADMAP success criteria** are observably met in the produced WALKTHROUGH.md:
   - SC1: Section per surface, 13 surfaces, every section non-empty.
   - SC2: Each section includes ≥1 improvised input / weird-state probe.
   - SC3: Every finding has a severity tag + repro steps.
   - SC4: Every blocker has a corresponding GitHub issue + cross-link.

These are checkable by **the verifier agent** (`/gsd-verify-work` in the GSD pipeline) reading WALKTHROUGH.md and the linked GitHub issues — not by automated tests. Plan-level acceptance criteria (Wave gates) should encode these checks as verifier-readable assertions.

**No Wave 0 test infrastructure needed.** No new test files. No new test framework. Confirmed.

## Risks & Pitfalls

### Risk 1: Gemini timeout in prod (medium, mitigatable)

**What goes wrong:** A canned voice clip or photo upload triggers a Gemini call that hangs longer than the deploy proxy timeout, leaving the draft stuck at `status='draft'` indefinitely.
**Why it happens:** Gemini 2.5 Flash latency varies; the BackgroundTask doesn't have a hard ceiling; Vercel proxies + Railway forwarding may have implicit timeouts. `[ASSUMED]` — exact timeout values weren't verified in this research session.
**How to avoid:** Keep canned audio clips ≤15s (well within Gemini's typical fast path of 3-8s). Document any draft that takes >30s to promote as a friction or blocker finding, NOT as "the test is stuck" — it's user-visible behavior.
**Warning signs:** Draft status doesn't flip to `structured` after 30s; the inbox card stays in the loading state.

### Risk 2: Cookie-isolation surprises in `browser_tabs` (high, fully mitigatable)

**What goes wrong:** The two-context realtime probe relies on independent cookie jars; Playwright MCP's `browser_tabs` may share cookies across tabs. Member #4's join overwrites member #3's cookie, breaking the observation premise.
**Why it happens:** `BrowserContext.cookies()` from raw Playwright is per-context; MCP's `browser_tabs` opens new tabs in the **existing** context (same cookie jar).
**How to avoid:** Run the verification step (§5 Step 0) early in the realtime section. If cookies are shared, fall back to two sequential MCP sessions (one per member). Document the observed behavior in WALKTHROUGH §realtime preamble.
**Warning signs:** After member #4 joins in Tab 2, Tab 1's `/api/auth/me` returns member #4's identity instead of member #3.

### Risk 3: Push notifications without an FCM/APNs receiver (medium, expected)

**What goes wrong:** The agent's headless Chromium has no Apple Push Notification Service / Firebase Cloud Messaging receiver. The `pushManager.subscribe()` call may fail or succeed-but-never-deliver.
**Why it happens:** PWAs running in headless Chromium typically can't fully complete the push subscription handshake the way a real iPhone PWA can. The endpoint is FCM-issued; without an FCM project the agent might not receive deliveries.
**How to avoid:** Per D-19, document the subscription side (verifying `pushManager.getSubscription()` returns a non-null subscription, that the backend `/api/push/subscribe` POST happened) and ask the operator to fire one round-trip from their iPhone (which is already member #1 in the synthetic household — wait, member #1 is the seeded "Luca" with no auth token; the operator's actual person joining via DEMO01 becomes member #5 if member #3 + #4 are auditor contexts. Plan should clarify who fires the test push). Operator confirms inline.
**Warning signs:** `getSubscription()` returns null after permission grant; the backend never sees the POST.

### Risk 4: Service worker stale-cache for screenshots (low, easy)

**What goes wrong:** PWA service worker caches the home screen; A's reload after a B-side mutation shows cached state, missing the live update.
**Why it happens:** `next-pwa` ships an SW that caches static + some dynamic routes.
**How to avoid:** Always `mcp__playwright__browser_navigate` with cache-busting (`?_t=<timestamp>`), or use `browser_evaluate(() => location.reload(true))` for a hard reload before every observation step.
**Warning signs:** Two probe outcomes look identical even when they should differ.

### Risk 5: Member #4 inflates the synthetic household size (low, by design)

**What goes wrong:** Phase 11 SEED-05 baseline says "exactly 2 members". After the realtime probes, member #4 (auditor B) persists. A subsequent re-seed run leaves them in place.
**Why it happens:** Per CONTEXT D-19 / D-15, this is intentional. The seed only `db.merge()`s the 2 deterministic members; never deletes additional members.
**How to avoid:** Document in WALKTHROUGH §realtime preamble: "After this section, the household has 4 members until the next teardown — by design." If the operator wants to fully reset, they run the Phase 11 teardown→refresh.
**Warning signs:** None — this is expected. Auditor's own member persists too (#3).

### Risk 6: State drift mid-section (medium, has escape hatch)

**What goes wrong:** Probes accumulate state — votes, cooking logs, drafts — until a probe genuinely can't run (e.g. all 5 shortlist recipes have been voted out, can't test "Sans avis" anymore).
**Why it happens:** Per D-09, state drift is accepted; the audit deliberately doesn't reset between probes.
**How to avoid:** Use the Phase 11 escape hatch: `uv run seed --prod-synthetic --teardown && uv run seed --prod-synthetic`. Document the reset in WALKTHROUGH inline ("Reset to baseline at probe 7-3 because all shortlist recipes had been voted on").
**Warning signs:** A planned probe is impossible to execute in current state.

### Risk 7: Executor scope creep — modifying product code (high, well-known)

**What goes wrong:** During a probe, executor sees a tempting fix and edits `frontend/components/...` or `backend/app/...`.
**Why it happens:** Documented in `feedback_executor_scope_creep.md` — gsd-executor previously modified files outside plan scope.
**How to avoid:**
- Plan MUST pass CONTEXT.md verbatim to executor with **explicit hard-constraint** in plan body: "NO product-code edits. Only writes allowed are to `.planning/v0.3/WALKTHROUGH.md`, `.planning/v0.3/walkthrough-inputs/**`, `.planning/v0.3/walkthrough-screenshots/**`, and `gh issue create` invocations."
- Plan MUST pass the **prior plan's SUMMARY.md** so executor sees historical scope decisions (per memory `executor_scope_creep`).
- Verifier agent's success criteria check should grep the diff for changes to `frontend/` or `backend/` and reject if any are non-zero.
**Warning signs:** Diff shows changes to files outside the allowlist. Verifier should reject.

### Risk 8: Live Gemini cost overrun (very low)

**What goes wrong:** Gemini calls exceed the budgeted ~$0.50.
**Why it happens:** Recursive failures: a probe re-hits Gemini repeatedly, or a canned input triggers Gemini retries.
**How to avoid:** D-12's accounting (per-section call count) makes this observable; if the section gets to 10 calls, stop.
**Warning signs:** Per-section call count exceeds 5.

## Mapping to Existing E2E Specs

The 14 specs in `frontend/tests/e2e/` define the **golden paths** for each surface. Phase 12 deviates from them. Map:

| Surface (Phase 12) | Golden-path spec | Notes |
|--------------------|------------------|-------|
| Capture — Quick | `capture-quick.spec.ts` | Simple POST /recipes/quick + draft round-trip |
| Capture — Full | `capture-full.spec.ts` | POST /recipes with full payload |
| Capture — Voice | `capture-voice.spec.ts` | Posts JSON `{transcript: "..."}`; canned LLM stub flips to `structured` |
| Capture — Photo | `capture-photo.spec.ts` | Multipart `files=` (NOT `photos=`); Sheet-01 fixme present |
| Capture — URL | `capture-url.spec.ts` | URL-01 fixme present (extraction stubbed) |
| Drafts inbox (cross-cutting view) | `drafts-inbox.spec.ts` | Verifies `recipe.created` event lands in inbox via WS |
| Shortlist + Vote | `shortlist-vote.spec.ts` | The D-12 canary; covers the 5 vote states |
| Cooking Log (create + finalize) | `cooking-log-create-finalize.spec.ts` | TZ-01 fixme present |
| History | `cooking-log-history.spec.ts` | CL-01 fixme present |
| Onboarding (join via invite code) | `invite-code-happy-path.spec.ts` | The two-context blueprint for D-15/D-16 realtime |
| Recipe library | `recipe-library.spec.ts` | List / search — implicitly part of the "history" / general navigation surface |
| Recipe detail | `recipe-detail.spec.ts` | Single recipe view |
| Settings | `settings.spec.ts` | Member name / household / signout |
| Auth (skip onboarding) | `auth.skip-onboarding.spec.ts` | Cookie-auth → no onboarding redirect |

**Specs NOT mapped to a Phase 12 surface (informational):**
- `diag.spec.ts` — diagnostic, not user-flow.
- `w1-gate.spec.ts` — old W1 milestone gate; not part of the v0.3 surface inventory.

**Surfaces with NO existing spec:**
- **Exports** — no `exports.spec.ts`. Refer to `backend/app/routers/exports.py`.
- **Push** — no `push.spec.ts`. Refer to `backend/app/routers/push.py`.
- **Realtime sync** — partially covered by `drafts-inbox.spec.ts` (single-context WS observation) and `invite-code-happy-path.spec.ts` (two-context join blueprint), but no end-to-end multi-event spec exists. Phase 12 fills this gap qualitatively.

**Source:** Direct read of `/Users/gulu3001/dev/al-dente/frontend/tests/e2e/` — `[VERIFIED: ls + read of representative specs]`.

## Code Examples

### Example: Bootstrap MCP browser session (executor's first action per surface)

```text
# Set viewport to iPhone-shape (mirrors playwright.config.ts:87)
mcp__playwright__browser_resize(width: 390, height: 844)

# Navigate to the prod synthetic env
mcp__playwright__browser_navigate(url: "https://<prod-domain>/")

# Capture initial DOM snapshot for debugging
mcp__playwright__browser_snapshot()
```

**Source:** Distilled from CONTEXT §code_context + `frontend/playwright.config.ts:74-89` `[VERIFIED]`.

### Example: Probe with screenshot evidence

```text
# Surface: capture-photo, probe: dim handwritten input
mcp__playwright__browser_navigate(url: "https://<prod-domain>/recipes/new")
mcp__playwright__browser_click(element: "Photo tab")  # role=tab name="Photo"
mcp__playwright__browser_click(element: "Ajouter une photo")
mcp__playwright__browser_file_upload(paths: [".planning/v0.3/walkthrough-inputs/photo/02-dim-handwritten.jpg"])

# Observe draft return + promotion
mcp__playwright__browser_wait_for(text: "Brouillon en attente d'analyse", time: 5)

# Screenshot the result
mcp__playwright__browser_take_screenshot(filename: "capture-photo-dim-handwritten.png")
# Then: copy to .planning/v0.3/walkthrough-screenshots/ via Write or shell mv
```

### Example: Network-throttle probe via `browser_evaluate`

```text
# Inject a 5s delay shim into window.fetch
mcp__playwright__browser_evaluate(function: """
() => {
  const orig = window.fetch;
  window.fetch = (...args) => new Promise(resolve => {
    setTimeout(() => resolve(orig(...args)), 5000);
  });
}
""")

# Now do the action; observe whether the UI shows a loading state, optimistic update, or hangs
mcp__playwright__browser_click(element: "Submit recipe button")
mcp__playwright__browser_take_screenshot(filename: "capture-quick-slow-network.png")

# Reset (recommended)
mcp__playwright__browser_navigate(url: "https://<prod-domain>/")  # reload clears the override
```

## State of the Art

| Old approach | Current approach | When changed | Impact |
|--------------|------------------|--------------|--------|
| Scripted-spec golden-path E2E (Phase 10) | Agent-driven exploratory probes via Playwright MCP (Phase 12) | This phase | Catches surprises that determinism hides; cost is the lack of replay automation — that's why findings get committed to WALKTHROUGH.md verbatim |
| Manual UAT on iPhone with no record | MCP-driven session producing screenshots + WALKTHROUGH | This phase | Reproducible, reviewable, comparable across milestones |
| Stub Gemini in tests (Phase 10 D-04) | Live Gemini calls (Phase 12 D-12) | This phase | Tests the actual user experience, not the stub layer; ~$0.50 budgeted |

**Deprecated/outdated for Phase 12 (do NOT use):**
- Adding new spec files to `frontend/tests/e2e/` — explicitly excluded by CONTEXT §domain.
- Re-running Phase 11's seed in CI — explicitly out of scope (Phase 11 D-25 informally; operator-only).

## Assumptions Log

> Claims tagged `[ASSUMED]` in this research that may need user confirmation before plan execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vercel/Railway proxy timeout is implicit and unlikely to bite Gemini calls under 15s | §Canned Input Specs (voice durations) | Long voice clips might hang; medium-impact (a probe stalls but is observable) |
| A2 | `mcp__playwright__browser_tabs` shares cookies across tabs in one context | §5 Realtime Two-Context Pattern | High-impact if wrong; mitigation is the fallback to two sequential sessions, which works regardless |
| A3 | Headless Chromium can complete `pushManager.subscribe()` against the prod backend | §Surface 11 Push | High-impact; mitigation is operator-triggered round-trip per D-19 |
| A4 | The `audit:walkthrough` GitHub label doesn't yet exist on the repo (one-time create needed) | §6 Issue filing | Low-impact; planner's bootstrap step creates it idempotently |
| A5 | The capture-voice prod surface accepts JSON transcripts (not raw audio) — same as `capture-voice.spec.ts` | §Surface 3 capture-voice | Medium-impact; canned input format may need to be `.txt` not `.m4a` (verify during walkthrough) |
| A6 | The `gh` CLI is installed and authenticated against `lucaguery/al-dente` | §6 Issue filing | High-impact; mitigation is a pre-flight check in the bootstrap plan (`gh auth status`) |
| A7 | Member #4's persistent presence (per D-19) does not break the seed's idempotency banner counts | §Risk 5 | Low-impact; banner shows "members removed: 2 or 3" per RUNBOOK.md (verified). The seed only merges the 2 baseline members — additional members are ignored by the merge, kept as-is |

## Open Questions (RESOLVED)

> Each question below is **deliberately deferred to execution time** with an explicit in-plan resolution mechanism. The questions are not blocking for planning — they are blocking for the specific probe they govern, and each probe owns its own resolution step.

1. **RESOLVED — Where's the prod URL pinned?** Resolved by Plan 02 Task 1 Step 0 (executor reads Vercel dashboard / `frontend/vercel.json` / homepage redirect at execute-time, OR asks operator at the bootstrap checkpoint). Likely format: `https://al-dente-<something>.vercel.app/` OR custom domain. Probe blocks until URL pinned, so any guess that breaks the audit is caught immediately.

2. **RESOLVED — Does Playwright MCP `browser_tabs` provide cookie isolation across tabs?** Resolved by Plan 04 Task 2 Step 0 (verification probe before the realtime section runs). If tabs share cookies (likely), the executor falls back to two sequential MCP sessions per the documented fallback in §Realtime "Realtime two-context invocation pattern" — each session runs against a clean cookie jar. Either branch produces a valid two-context realtime probe.

3. **RESOLVED — Does the prod `/api/recipes/voice` endpoint accept multipart audio or only JSON transcripts?** Resolved by Plan 02 Task 2 Step 1 (executor reads `backend/app/routers/recipes.py` voice handler before probing — read-only, no edits — and selects the matching canned input). Plan 01 commits `.txt` transcripts as the safer fallback (matches `capture-voice.spec.ts:14-23` JSON shape); `.m4a` clips can be added later if multipart proves supported.

## Environment Availability

> Phase 12 has external dependencies (browser tooling, GitHub CLI, prod env). Audit:

| Dependency | Required by | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Playwright MCP server | All probes | ✓ (bundled in Claude Code) | session-pinned | — |
| `gh` CLI | Blocker filing (D-03) | ✓ (operator's machine) | check `gh --version` | manual filing via web UI (degrades velocity) |
| `git` | Cross-link permalinks (D-05) | ✓ | repo's pinned | — |
| `uv run seed` (extended Phase 11) | Refresh / teardown escape hatch | ✓ (shipped Phase 11) | latest | — |
| Prod Supabase connectivity | All probes | ✓ (live env) | n/a | — |
| Live Gemini API key (server-side) | AI surface probes | ✓ (configured in prod Railway) | — | If quota exhausted: switch to stubbed fallback (would invalidate D-12 — major scope hit) |
| `audit:walkthrough` GitHub label | D-03 issue filing | ✗ (likely doesn't exist yet) | — | Bootstrap plan creates idempotently via `gh label create` |
| iPhone for operator-triggered push round-trip | D-19 push verify | ✓ (operator's device) | iOS latest | Operator unavailable: document subscription only, mark push round-trip as "pending operator verification" |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**
- `audit:walkthrough` label — bootstrap plan creates it.

## Sources

### Primary (HIGH confidence)
- `/Users/gulu3001/dev/al-dente/.planning/phases/12-exploratory-feature-walkthrough/12-CONTEXT.md` — D-01..D-20 + canonical refs, complete.
- `/Users/gulu3001/dev/al-dente/.planning/REQUIREMENTS.md` §"WALK — Exploratory Feature Walkthrough" — WALK-01..04 verbatim.
- `/Users/gulu3001/dev/al-dente/.planning/ROADMAP.md` §"Phase 12" — goal, success criteria, out-of-scope.
- `/Users/gulu3001/dev/al-dente/.planning/PROJECT.md` — current milestone v0.3 + "Surfaced for follow-up" backlog list.
- `/Users/gulu3001/dev/al-dente/.planning/phases/11-production-synthetic-household/11-CONTEXT.md` — D-19 auditor as member #3, D-14 invite code DEMO01, D-20 21 photos.
- `/Users/gulu3001/dev/al-dente/RUNBOOK.md` — refresh/teardown commands, iPhone join flow, idempotency proof, by-design behavior.
- `/Users/gulu3001/dev/al-dente/CLAUDE.md` — architecture invariants 1-8 (esp. #1, #2, #4, #6, #8).
- `/Users/gulu3001/dev/al-dente/backend/app/services/realtime.py` — 6 broadcast event classes (the D-16 inventory).
- `/Users/gulu3001/dev/al-dente/frontend/playwright.config.ts` — iPhone-shape Chromium viewport spec (390×844 + isMobile + hasTouch).
- `/Users/gulu3001/dev/al-dente/frontend/tests/e2e/invite-code-happy-path.spec.ts` — two-context blueprint for D-15/D-16.
- `/Users/gulu3001/dev/al-dente/frontend/tests/e2e/capture-*.spec.ts`, `shortlist-vote.spec.ts`, `cooking-log-create-finalize.spec.ts` — surface-specific golden paths.
- `/Users/gulu3001/dev/al-dente/.planning/config.json` — `nyquist_validation: false` confirmed.

### Secondary (MEDIUM confidence)
- `gh issue create` documentation — `[CITED: cli.github.com/manual/gh_issue_create]`.
- v0.2.1 [#1](https://github.com/lucaguery/al-dente/issues/1) — referenced as the issue-shape canon (per CONTEXT D-03). Not opened in this research session; CONTEXT's transcription is trusted.

### Tertiary (LOW confidence)
- Gemini 2.5 Flash audio latency assumption (~3-8s for short clips) — `[ASSUMED]`. No live verification in this session.
- Vercel/Railway proxy timeout behavior — `[ASSUMED]`. No live verification.
- Playwright MCP `browser_tabs` cookie-jar isolation — `[ASSUMED]` shared. The plan's verification step confirms.

## Metadata

**Confidence breakdown:**
- Phase shape & methodology: **HIGH** — CONTEXT.md is exhaustive and locked.
- Tooling (`mcp__playwright__*` surface area): **HIGH** — directly verified against the running Claude Code session's tool inventory.
- Per-surface probe playbook: **HIGH** — anchored to existing e2e specs which encode the actual prod surface shapes.
- Canned input artifact specs: **MEDIUM** — formats and durations are best-practice recommendations; Gemini's exact tolerance for low-quality inputs is empirical.
- Realtime two-context pattern: **MEDIUM** — the cookie-isolation behavior of `browser_tabs` is unverified in this research session; the fallback (two sequential sessions) is robust.
- GitHub issue filing: **HIGH** — `gh issue create` is well-documented; the cross-link mechanic is straightforward markdown + git.
- WALKTHROUGH.md skeleton: **HIGH** — derived directly from D-04 uniform template + D-09 starting-state preamble + D-20 incremental writing.
- Risks: **HIGH** — mitigations are well-scoped.

**Research date:** 2026-05-09
**Valid until:** 2026-06-09 (~30 days; project is mid-flight, surface shapes may drift)

## RESEARCH COMPLETE

**Phase:** 12 - Exploratory Feature Walkthrough
**Confidence:** HIGH (methodology, tooling, scope) / MEDIUM (live-API quirks, push round-trip, realtime cookie isolation)

### Key findings

1. **Phase 12 produces zero product code** — research is methodology-heavy. The deliverable is `.planning/v0.3/WALKTHROUGH.md` + canned inputs + screenshots + GitHub issues for blockers. The plans MUST encode this scope as a hard constraint to defeat `feedback_executor_scope_creep`.
2. **All major design decisions are locked in CONTEXT D-01..D-20.** The planner's job is to translate these into 4-6 wave-shaped plans, not to re-design.
3. **The two-context realtime probe is the gnarliest piece.** The recommended approach is **two sequential MCP sessions** (clean cookie isolation guaranteed) with `browser_tabs`-based isolation as a possible optimization once verified. Step 0 of the realtime section confirms which approach is needed.
4. **The 14 existing e2e specs encode the golden paths per surface.** Phase 12 deviates from them; the planner should reference each spec by filename in its corresponding probe plan so the executor knows the verbatim French strings, API endpoints, and selectors.
5. **Three known blockers (Sheet-01, TZ-01, URL-01, CL-01) will be re-discovered during the walkthrough** — per D-06 they're cross-linked to the backlog, NOT re-filed. The planner should embed this dedupe rule explicitly in each affected surface's plan.

### Confidence assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard "stack" (tooling) | HIGH | All tools in-hand or operator-known |
| Architecture / methodology | HIGH | CONTEXT.md is exhaustive, locked, internally consistent |
| Per-surface probe templates | HIGH | Anchored to verified e2e specs |
| Canned input formats | MEDIUM | Best-practice recommendations; needs minor in-flight adjustment if voice surface differs from spec assumption |
| Realtime two-context mechanics | MEDIUM | Fallback path is robust regardless of cookie-isolation behavior |
| Push round-trip end-to-end | MEDIUM | Documented dependency on operator's iPhone if agent can't trigger send |

### Open questions

1. Prod URL exact value (planner finds via Vercel dashboard or operator confirmation).
2. `mcp__playwright__browser_tabs` cookie-isolation behavior (resolved by Step 0 of realtime probe section).
3. Voice surface's actual upload contract (JSON transcript vs multipart audio) — read `backend/app/routers/recipes.py` voice handler at section start.

### Ready for planning

Research complete. Recommend the planner produce **5 plans**:
1. **Bootstrap + canned-input artifacts** — create label, commit voice/photo/url/voice-modify inputs, verify `gh auth`, set up viewport.
2. **Capture surfaces probe pass** — 5 surfaces (quick / full / voice / photo / url), each with golden + ≥3 probes.
3. **Decide-cook-history probe pass** — shortlist / vote / cooking log / history (4 surfaces).
4. **Cross-cutting probe pass** — exports / push / realtime sync / onboarding / settings (5 surfaces, with realtime sync the heaviest).
5. **Final pass** — severity sweep, backlog dedupe, batch issue filing, WALKTHROUGH.md commit + bidirectional cross-link insertion.

Each plan's acceptance gate: WALKTHROUGH.md sections non-empty, ≥3 weird-state probes per surface, no edits outside the artifact allowlist (`.planning/v0.3/WALKTHROUGH.md`, `.planning/v0.3/walkthrough-inputs/**`, `.planning/v0.3/walkthrough-screenshots/**`).
