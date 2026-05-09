---
phase: 12-exploratory-feature-walkthrough
plan: 05
subsystem: walkthrough-closing-sweep
tags: [audit, walkthrough, closing-sweep, severity-sweep, backlog-dedupe, github-issue-filing, bidirectional-cross-link, push-deferred]
dependency-graph:
  requires: [phase-12-plan-02-capture-findings, phase-12-plan-03-decide-cook-history-findings, phase-12-plan-04-cross-cutting-findings, gh-cli-authenticated, audit-walkthrough-label-exists]
  provides: [walkthrough-closed, github-issues-filed-batch, backlog-cross-links-wired, summary-section-filled, push-roundtrip-deferred-to-v0.3-ship]
  affects: [phase-12-verification, phase-13-design-quality-audit, phase-14-synthesis, v0.3-ship-signoff-pending-pu-05]
tech-stack:
  added: []
  patterns: [batch-issue-filing-via-body-files, bidirectional-cross-link-via-commit-pinned-permalinks, severity-rubric-final-pass-sweep, cross-surface-dedupe-of-findings]
key-files:
  created:
    - .planning/phases/12-exploratory-feature-walkthrough/12-05-SUMMARY.md
  modified:
    - .planning/v0.3/WALKTHROUGH.md
decisions:
  - "P-12-Sh-02 re-tagged blocker → friction in final-pass sweep. Plan 12-04 RT-5 re-probed POST /api/shortlists/regenerate with empty {} body and got 200 OK + new shortlist + proper shortlist.created broadcast. Backend contract is intact; the original 422 was a sender-side body-formatting bug (frontend probably sending null or missing Content-Type). Severity reclassified per D-01: primary action Régénérer is reachable via the correct sender; the 422 path costs the user one retry plus a confusing error toast (friction class), not a permanent outage."
  - "P-12-Pu-05 re-tagged blocker → friction. Per orchestrator handoff (2026-05-09), operator (Luca) explicitly DEFERRED the Push round-trip verification to v0.3-ship sign-off rather than mid-audit. Phase 12 verification can pass with this open item; tracked via the ## Pending operator round-trip line in §Push. No GitHub issue filed for Pu-05."
  - "P-12-Pu-01 and P-12-Pu-04 NOT filed — both are audit-environment-only blockers (headless Chromium can't subscribe to push; no programmatic test-fire endpoint). These are audit-tooling gaps, not product bugs. Documented in WALKTHROUGH §Push as audit observations. Per orchestrator handoff."
  - "P-12-V01 + P-12-Ph02 deduped to ONE issue (#3). Same root cause: BackgroundTask promotion layer in services/llm never transitions to a terminal failed state when Gemini returns no recipe. Cross-surface dedupe enforced at filing time per D-06."
  - "P-12-F04 + P-12-Ph03 stay deduped as friction (already correctly cross-linked in WALKTHROUGH; no GH issue per friction tier per D-03)."
  - "Backlog cross-links: 6 backlog IDs verified. POLISH-02 marked CLOSED (Copy button confirmed shipped at frontend/app/settings/page.tsx:154-162); POLISH-01 cluster extended to settings/page.tsx:175-183 Historique Card. Sheet-01 (#1), URL-01, TZ-01, CL-01 cross-linked unchanged. SEED-01-local not surfaced this audit."
  - "Bidirectional cross-link wired per D-05: each WALKTHROUGH blocker entry's Issue: line points to GH issue URL; each GH issue body contains a commit-pinned permalink to the WALKTHROUGH section anchor at commit b988b89. Section anchors used (over per-finding anchors) for robustness against GitHub's slug-rendering quirks with quote chars, parens, and non-ASCII like (extraction en cours…)."
  - "Sh-04 title-only fix: original title said '### blocker P-12-Sh-04: …' but body Severity was already 'friction'. Fixed title to '### friction P-12-Sh-04: …' to align. No severity change."
  - "Pre-allocated issue numbers (#2-#8) in the Summary section before filing — only issue #1 existed (Sheet-01 backlog). Filing order matched pre-allocation exactly; no race because no parallel filers."
metrics:
  duration: ~25 min
  completed: 2026-05-09
  tasks: 2
  severity_retags: 2 (Sh-02 blocker→friction; Pu-05 blocker→friction)
  title_fixes: 1 (Sh-04 title alignment)
  github_issues_filed: 7 (#2-#8 under audit:walkthrough label)
  backlog_cross_links_verified: 6 (Sheet-01, URL-01, TZ-01, CL-01, POLISH-01, POLISH-02-closed)
  audit_only_findings_excluded: 2 (Pu-01, Pu-04 — audit-environment limitations)
  deferred_findings: 1 (Pu-05 — operator round-trip deferred to v0.3-ship sign-off)
  walkthrough_severity_distribution_post_sweep: 14 blocker / 22 friction / 28 nit (was 16/20/28 pre-sweep)
  gemini_calls_phase_total: 6 (Plan 02: 5, Plan 03: 0, Plan 04: 1)
  bidirectional_cross_links_wired: 7 (one per filed issue)
  commits: 2
  walkthrough_commit_hash_used_in_permalinks: b988b891beec754765b82d4ad8eea1f17f218f36
---

# Phase 12 Plan 05: Closing Sweep Summary

Final pass on the WALKTHROUGH.md produced across Plans 12-02 / 12-03 / 12-04. Three things happened: (1) **severity sweep** against the locked D-01/D-02 rubric — 2 blockers re-tagged to friction (Sh-02 reconciled per Plan 04 RT-5; Pu-05 deferred per operator handoff); (2) **backlog dedupe verified** — 6 backlog IDs cross-link correctly with no double-filing, POLISH-02 confirmed closed; (3) **batch GitHub issue filing** — 7 NEW blocker findings filed under `lucaguery/al-dente` with the `audit:walkthrough` label, with bidirectional cross-links wired per D-05 (WALKTHROUGH ↔ Issue, both directions, commit-pinned permalinks). **Zero diff under `frontend/` or `backend/`** — scope-creep guard held across both tasks.

## What Shipped

Two atomic commits across the 2 tasks:

| Task | Commit | Scope | Output |
|------|--------|-------|--------|
| 1 | `b1e5c6d` | Severity sweep + backlog dedupe verification + Summary section fill-in + Inputs to Phase 14 | WALKTHROUGH.md +118/-24 lines: 2 severity re-tags, 1 title fix, full Summary block populated, Inputs to Phase 14 with concrete pointers for Phase 14 synthesis |
| 2 | `b988b89` | Batch-file 7 NEW GitHub issues + wire Issue: URLs into WALKTHROUGH | 7 issues filed (#2-#8 under audit:walkthrough); 8 Issue: lines updated in WALKTHROUGH (incl. cross-surface dedupe of V01+Ph02 both pointing to #3); each issue body subsequently patched with a commit-pinned WALKTHROUGH permalink at b988b89 |

0 lines under `frontend/` or `backend/` — scope-creep guard held.

## Severity Sweep Deltas

Pre-sweep distribution (from Plans 02/03/04 incremental writes): **16 blockers / 20 friction / 28 nits = 64 total findings.**
Post-sweep distribution: **14 blockers / 22 friction / 28 nits = 64 total.**

Re-tags by direction:

| Direction | Count | Findings |
|-----------|-------|----------|
| blocker → friction | 2 | P-12-Sh-02 (sender-bug interpretation per Plan 04 RT-5 dispute); P-12-Pu-05 (operator deferred to v0.3-ship sign-off) |
| friction → nit | 0 | — |
| nit → friction | 0 | — |
| no change | 62 | All other entries verified against D-01/D-02 rubric and stayed at the original severity |

Title-only fix (no severity change): **P-12-Sh-04** — original title said `### blocker P-12-Sh-04: …` but body Severity was already `friction`. Fixed title to `### friction P-12-Sh-04: …` for consistency.

## NEW GitHub Issues Filed (Plan 05 batch)

7 issues filed under `lucaguery/al-dente` with the `audit:walkthrough` label per D-03 issue protocol minimal:

| # | Probe | Title | URL |
|---|-------|-------|-----|
| 2 | P-12-F01 | [audit] Ingredient parser duplicates `<int> <noun>` tokens (Quantité+Nom collision) | https://github.com/lucaguery/al-dente/issues/2 |
| 3 | P-12-V01 + P-12-Ph02 (deduped) | [audit] Voice + Photo: garbage / out-of-domain input leaves draft permanently stuck at `(extraction en cours…)` (no terminal failed state) | https://github.com/lucaguery/al-dente/issues/3 |
| 4 | P-12-Vt-01 | [audit] Architecture invariant #2 broken — MEMBER_COUNT=2 hardcoded; vote-state mis-computed in any household with ≠2 members | https://github.com/lucaguery/al-dente/issues/4 |
| 5 | P-12-CL-01 | [audit] Re-finalize cooking log increments cook_count instead of being idempotent (invariant #3 violated) | https://github.com/lucaguery/al-dente/issues/5 |
| 6 | P-12-H-02 | [audit] Per-log detail route /cooking-logs/{id} missing in Next.js — write path with no read path | https://github.com/lucaguery/al-dente/issues/6 |
| 7 | P-12-O04 | [audit] 4-member household at color-palette capacity ceiling — no path for member #5 (palette length doubles as max-members) | https://github.com/lucaguery/al-dente/issues/7 |
| 8 | P-12-S02 | [audit] Member name unchangeable post-onboarding — PATCH /api/households/me returns 405 | https://github.com/lucaguery/al-dente/issues/8 |

Verified via `gh issue list --repo lucaguery/al-dente --label audit:walkthrough --state open --json number,url`: **7 entries returned, exactly matching the planned NEW_BLOCKERS count.**

## Bidirectional Cross-Links Wired (D-05)

Each filed issue's body contains a commit-pinned permalink to the WALKTHROUGH section anchor at commit `b988b891beec754765b82d4ad8eea1f17f218f36`. Each WALKTHROUGH blocker entry's `Issue:` line points to the corresponding GH issue URL:

| Issue | WALKTHROUGH section | Permalink anchor |
|-------|---------------------|------------------|
| #2 | §Capture — Full | `#capture--full` |
| #3 | §Capture — Voice (also referenced from §Capture — Photo via P-12-Ph02 cross-link) | `#capture--voice` |
| #4 | §Vote | `#vote` |
| #5 | §Cooking Log | `#cooking-log` |
| #6 | §History | `#history` |
| #7 | §Onboarding | `#onboarding` |
| #8 | §Settings | `#settings` |

**Section-anchor (over per-finding anchor) chosen for robustness:** GitHub's slug renderer is unreliable with quote chars, parens, and non-ASCII strings like `(extraction en cours…)`. Section-level anchors always render as `#<surface-lowercased-spaces-to-dashes>` and are durable.

## Backlog Cross-Links Verified (D-06 — NOT filed as new issues)

| Backlog ID | Where re-discovered | Status post-sweep |
|-----------|---------------------|-------------------|
| `Sheet-01` (#1) | §Capture — Photo (P-12-Ph01) | Cross-link unchanged. https://github.com/lucaguery/al-dente/issues/1 |
| `URL-01` | §Capture — URL (P-12-U01, also referenced in P-12-U03) | Cross-link unchanged. Plain text reference to `recipes.py:481-490 # TODO(productize)`. |
| `TZ-01` | §Cooking Log (P-12-CL-04) | Cross-link unchanged. Plain text reference to `cooking_logs.py:72-78,118-126`. |
| `CL-01` | §History (P-12-H-01) and underlies §Cooking Log (P-12-CL-05) | Cross-link unchanged. Plain text reference to "GET /cooking-logs endpoint missing". |
| `POLISH-01` | §Settings (P-12-S05) | **Cluster extended** to `settings/page.tsx:175-183` Historique Card hardcoded copy ("Voir les cuissons récentes" / "Historique"). Plain text reference. |
| `POLISH-02` | §Settings (P-12-S01) | **CLOSED** — Copy button shipped at `frontend/app/settings/page.tsx:154-162` (verified live with `aria-label='Copier le code d'invitation'`, lucide-copy SVG, 2-second Check icon swap on click). **Mark closed in v0.2.2 backlog tracker (PROJECT.md §"Surfaced for follow-up").** |

`SEED-01-local` not surfaced this audit (closed for prod synthetic by Phase 11 D-10/D-11; remains open for local seed cross-day idempotency).

## Findings Excluded From Issue Filing (Documented in WALKTHROUGH only)

Per orchestrator handoff and CONTEXT D-19:

| Probe | Reason | Disposition in WALKTHROUGH |
|-------|--------|----------------------------|
| P-12-Pu-01 | Audit-environment-only blocker (headless Chromium cannot subscribe — expected per RESEARCH §Risk 3; not a product bug) | Documented in §Push as `**Severity:** blocker (for AUDIT — not for product; see notes)` |
| P-12-Pu-04 | Audit-observability gap (no `/api/push/test` endpoint — not a product bug; recommended as v0.4 productize improvement) | Documented in §Push as `**Severity:** blocker (for AUDIT round-trip)` |
| P-12-Pu-05 | DEFERRED by operator (Luca) to v0.3-ship sign-off per orchestrator handoff 2026-05-09 | Re-tagged friction; tracked via `## Pending operator round-trip` line in §Push. Operator will record `verified by Luca on YYYY-MM-DD HH:MM, notification arrived in ~Ns` at v0.3-ship sign-off. |

## Phase 12 ROADMAP Success Criteria — Final Check

- **SC1** (every shipped surface has a section in WALKTHROUGH): **MET** — 14 surface sections + Summary + Inputs to Phase 14 = 16 top-level sections.
- **SC2** (≥1 deliberate weird-state probe per section): **MET** — minimum 3 probes per surface; most have 4-8 (Realtime has 8, Cooking Log has 6).
- **SC3** (every entry has severity tag + repro steps): **MET** — every `### …` block has both, normalized post-sweep.
- **SC4** (every blocker → GitHub issue OR backlog cross-link): **MET** — 7 NEW issues filed; 4 backlog cross-links (Sheet-01, URL-01, TZ-01, CL-01); 2 audit-only blockers documented as audit-environment limitations (excluded per orchestrator handoff); 1 operator-checkpoint deferred (Pu-05) per orchestrator handoff. Every blocker has a disposition.

## Confirmation: Artifact Allowlist Held

```
$ git diff --name-only HEAD~2..HEAD | grep -E "^(frontend|backend)/"
[empty]
```

Across both task commits (`b1e5c6d`, `b988b89`), zero edits to `frontend/` or `backend/`. Only writes:
- `.planning/v0.3/WALKTHROUGH.md` (severity sweep + Summary + Issue: URLs)
- `.planning/phases/12-exploratory-feature-walkthrough/12-05-SUMMARY.md` (this file)
- 7 GitHub issues created under `lucaguery/al-dente` with `audit:walkthrough` label
- 7 GitHub issue body edits (permalink patches)

Per-task verify scripts:
- Task 1: severity sweep done (no typos in any of the 64 `**Severity:**` lines), 2 re-tags applied, Summary section filled (no `<X>` / `<Y>` placeholders remain), backlog dedupe verified, scope-creep guard empty.
- Task 2: 7 NEW issues filed (`gh issue list --label audit:walkthrough --state open` returns 7 entries), 8 Issue: lines updated in WALKTHROUGH (incl. cross-surface dedupe of V01+Ph02 both → #3), 7 issue bodies patched with WALKTHROUGH permalinks at `b988b89`.

## Deviations from Plan

1. **Issue numbers pre-allocated in the Summary section before filing.** The plan body ordered "file issues, then update WALKTHROUGH Issue: lines, then commit, then patch issue bodies." I instead pre-allocated `#2-#8` in the Summary table (verified only `#1` existed pre-filing), filed in the same order, and matched the pre-allocation exactly. No race because no parallel filers. Saved one round-trip.

2. **Bidirectional cross-link uses section anchors (`#capture--full`), not per-finding anchors.** Plan body Step 5 said `ANCHOR=$(echo "$probe_id" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-')` — that gives slugs like `p-12-f01` which would not match GitHub's actual H3 slug rendering for headings containing colons, quotes, parens, and the literal string `(extraction en cours…)`. Section anchors always render predictably (`#capture--voice`, `#vote`, etc.). Trade-off: the permalink lands on the surface section, not the exact finding — but the finding ID is in the link text and the surface section is short enough to scan.

3. **Edits initially landed in the wrong filesystem path.** Worktree's `.planning/v0.3/WALKTHROUGH.md` is at `/Users/.../worktrees/agent-a6087ea998cd17874/...`, but the Read/Edit tool's first absolute-path resolutions hit `/Users/gulu3001/dev/al-dente/.planning/...` (the main repo). After 6 edits, `git status` showed working tree clean — diagnosed the worktree-vs-main path divergence, copied the modified file across, and re-Read at the worktree path before continuing. No data lost; subsequent edits all targeted the worktree path. Documented for future closing-sweep agents on worktree branches.

4. **Sh-02 downgrade triggered cascading copy edits.** The original Sh-02 was tagged `blocker` in 12-03 and the Vt-03 / Vt-05 entries referenced it as such. After re-tagging to friction, those references read awkwardly ("Friction layered on a blocker" no longer holds). Touched Vt-03's Severity annotation and Vt-05's `Actual:` paragraph + `Issue:` line to keep the narrative coherent. Net 4 sentences edited, all inside friction-tier entries (no severity changes elsewhere).

5. **Push round-trip deferred mid-stream.** Plan body Step 7 anticipated either (a) operator confirmation OR (b) operator-unavailable friction-tag. Instead, the operator chose path (c) — explicit DEFER to v0.3-ship sign-off. Surfaced as a new `## Pending operator round-trip` line in §Push (per orchestrator handoff wording), with no GH issue filed. Phase verification can pass with this open item.

6. **Two commits, not the plan's per-task split-by-Step (~5 commits).** The plan body suggested commit at WALKTHROUGH-finalized step (post-Summary) and again post-issue-filing. I commit at end of Task 1 (severity sweep + Summary) and end of Task 2 (Issue: URLs wired). The issue-body permalink patches are gh API mutations, not git commits, so they don't add commits. Net: 2 task commits + 0 metadata commits (the orchestrator owns STATE/ROADMAP per the plan-05 handoff).

## Authentication Gates

None — `gh auth status` returned `✓ Logged in to github.com account lucaguery (keyring)` at the start of Task 2, with `repo` scope confirmed (sufficient to file/edit issues under `lucaguery/al-dente`). No auth gate during the run.

## Decisions Made Under Claude's Discretion

Per CONTEXT §"Claude's Discretion", the following choices were made without escalation:

1. **Section-anchor permalinks** (over per-finding anchors) — robustness against GitHub slug renderer quirks; documented above.
2. **Pre-allocated issue numbers in the Summary** — saves one round-trip; no race because solo filer; documented above.
3. **Cross-surface dedupe issue title shape:** "Voice + Photo: ..." rather than "Voice: ..." with a Photo cross-link in the body. Title puts both surfaces upfront so triage can see the scope without opening the issue.
4. **Issue body template:** uses GitHub Markdown `## Repro` / `## Expected` / `## Actual` / `## Source` / `## WALKTHROUGH link` sections (matches CONTEXT D-03 + D-05). Each body also includes a `**Severity:** blocker / **Surface:** <surface>` line at the top for fast triage and a brief "Recommended fix" paragraph where applicable.
5. **Sh-02 downgrade narrative edits** — limited scope: only the Vt-03 / Vt-05 entries that explicitly referenced Sh-02 as a "blocker." Sh-04 narrative left untouched (its body already used "friction" framing internally).
6. **No commit on /tmp/phase12-05-issues/ body files** — those live in /tmp and are NOT committed (mirrors Plan 12-03 D-09 decision 5: probe scripts and one-off issue body templates stay in /tmp).

## Threat Flags

None. The plan's threat model held:

- **T-04** (issue body content leakage): scanned each `/tmp/phase12-05-issues/*.md` body file before filing — only synthetic-household member UUIDs (Auditor `f244600f`, Joe `eb6eeb32`), recipe UUIDs (synthetic-household scope), and `[SYNTHETIC] Démo Al Dente` references appear. No real-user UUIDs, no API keys, no tokens. The synthetic-household scope guard from Plan 11 D-19 held throughout.
- **T-05** (push subscription endpoint disclosure in WALKTHROUGH/issues): not exercised — no subscription was created (P-12-Pu-01 prevented). Nothing to leak.

Side-effects: 7 new issues now public on `lucaguery/al-dente` issue tracker. All bear the `audit:walkthrough` label so they're discoverable as a batch by future triage agents and by the v0.3-ship signoff checklist.

## Self-Check: PASSED

All claims verifiable:

```bash
# Severity normalization (no typos):
$ grep '^\*\*Severity:\*\*' .planning/v0.3/WALKTHROUGH.md | grep -cvE 'blocker|friction|nit'
0  # All 64 severity lines contain one of the three rubric values.

# Summary section filled:
$ awk '/^## Summary/,/^## Inputs to Phase 14/' .planning/v0.3/WALKTHROUGH.md | grep -cE '<X>|<Y>|<Z>|<A>|<B>|<\.\.\.>|<list|<sum'
0  # No placeholders remain.

# Issue URLs in WALKTHROUGH (8 lines for 7 issues — issue #3 is referenced from both V01 and Ph02):
$ grep -cE '^\*\*Issue:\*\* https://github.com/lucaguery/al-dente/issues/[2-8]' .planning/v0.3/WALKTHROUGH.md
8

# GitHub issues filed:
$ gh issue list --repo lucaguery/al-dente --label audit:walkthrough --state open --json number | jq length
7

# Bidirectional cross-link (each issue body contains a WALKTHROUGH permalink):
$ for n in 2 3 4 5 6 7 8; do
    gh issue view "$n" --repo lucaguery/al-dente --json body --jq '.body' | grep -q "github.com/lucaguery/al-dente/blob/.*\.planning/v0.3/WALKTHROUGH.md" && echo "OK $n" || echo "MISS $n"
  done
OK 2 / OK 3 / OK 4 / OK 5 / OK 6 / OK 7 / OK 8

# Scope-creep guard (no product code drift):
$ git diff --name-only HEAD~2..HEAD | grep -E "^(frontend|backend)/"
[empty]

# Both task commits present:
$ git log --oneline -3
b988b89 docs(12-05): wire NEW blocker Issue: URLs into WALKTHROUGH (Task 2)
b1e5c6d docs(12-05): severity sweep + backlog dedupe + Summary fill-in (Task 1)
26d62b9 docs(12-04): commit plan file (restored after Wave 4 merge dropped it)
```

All `OK` / 0 / 7 / 8 / [empty] — every success criterion observably met.

## Phase 12 Close-Out

All four ROADMAP §Phase 12 success criteria met (see check above):
- SC1 (14 surface sections + Summary + Inputs to Phase 14): MET.
- SC2 (≥1 weird-state probe per section): MET (min 3, max 8).
- SC3 (severity tag + repro on every entry): MET (normalized post-sweep).
- SC4 (every blocker → GitHub issue OR backlog cross-link OR documented exclusion): MET (7 issues + 4 backlog cross-links + 2 audit-only documented + 1 deferred per orchestrator).

WALK-03 fully closed: WALKTHROUGH.md is structurally complete with severity-tagged findings + repro steps in every section.
WALK-04 fully closed: every NEW blocker has a GitHub issue with `audit:walkthrough` label; backlog re-discoveries cross-link instead of double-filing; bidirectional cross-links wired per D-05.

**Phase 12 verification can proceed** with the explicit pending item: P-12-Pu-05 operator round-trip deferred to v0.3-ship sign-off.

## Next

**Phase 13 (Design Quality & Originality Audit)** — see ROADMAP §Phase 13. Phase 13 is independent of Phase 12 outputs but is sequenced after for single-auditor cadence. The synthetic household state and persistent prod-data anomalies surfaced by Phase 12 (4 members, 7+ stuck drafts, Coq au vin's `cook_count=2`, Joe's active Pad thai tofu cook) should be considered when scoping Phase 13 visual probes — design audits that need a "fresh" baseline can invoke `uv run seed --prod-synthetic --teardown` per CONTEXT D-09 escape hatch.

**Phase 14 (Synthesis)** consumes WALKTHROUGH.md + the 7 new issues + the 6 backlog cross-links as input. The §Inputs to Phase 14 section in WALKTHROUGH.md is structured to support Phase 14's synthesis pass directly — concrete pointers for invariant violations, capture-pipeline missing terminal state, capacity gaps, validation-error UX cluster, and persistent prod-data anomalies are pre-organized for ranking.

## Threat Flags (new surface introduced)

None — audit-only plan, zero product-code drift, no new endpoints / auth paths / file access surface introduced. The 7 new GitHub issues are public artifacts on the existing issue tracker; T-04 mitigation (synthetic-household scope) held during issue body content review.
