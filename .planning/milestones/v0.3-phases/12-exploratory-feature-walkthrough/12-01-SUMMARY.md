---
phase: 12-exploratory-feature-walkthrough
plan: 01
subsystem: audit-infrastructure
tags: [audit, walkthrough, scaffold, github-label, canned-inputs]
dependency-graph:
  requires: [phase-11-prod-synthetic-household, github-cli-authenticated]
  provides: [walkthrough-skeleton, canned-inputs-d13, audit-walkthrough-label]
  affects: [12-02-capture-probes, 12-03-decide-cook-probes, 12-04-cross-cutting-probes, 12-05-issue-sweep]
tech-stack:
  added: []
  patterns: [markdown-skeleton-fill-incrementally, gh-label-idempotent-create]
key-files:
  created:
    - .planning/v0.3/WALKTHROUGH.md
    - .planning/v0.3/walkthrough-inputs/voice/01-clean-french.txt
    - .planning/v0.3/walkthrough-inputs/voice/02-garbled-accent.txt
    - .planning/v0.3/walkthrough-inputs/voice/03-very-short.txt
    - .planning/v0.3/walkthrough-inputs/voice-modify/01-add-ingredient.txt
    - .planning/v0.3/walkthrough-inputs/voice-modify/02-substitute.txt
    - .planning/v0.3/walkthrough-inputs/url/urls.md
    - .planning/v0.3/walkthrough-inputs/photo/README.md
    - .planning/v0.3/walkthrough-inputs/voice/.gitkeep
    - .planning/v0.3/walkthrough-inputs/photo/.gitkeep
    - .planning/v0.3/walkthrough-inputs/url/.gitkeep
    - .planning/v0.3/walkthrough-inputs/voice-modify/.gitkeep
    - .planning/v0.3/walkthrough-screenshots/.gitkeep
  modified: []
decisions:
  - "Voice inputs committed as .txt transcripts (not .m4a) per RESEARCH §Canned Input Artifact Specs Q3-resolved: prod /recipes/voice surface accepts JSON {transcript: ...} per capture-voice.spec.ts:14-23. Audio fallback can be dropped in by the operator in-flight if Plan 02's live read of the prod voice handler shows multipart-audio support."
  - "Photo JPGs deferred to Plan 02 — committed README.md describes the 3 expected files instead. Lets Plan 02 either commit operator-captured originals OR probe with live ad-hoc images, with the section explicitly noting which probe used which input."
  - "14 ##-headers in WALKTHROUGH.md (not 13). CONTEXT D-11 / ROADMAP success criterion 1 lists 13 in narrative order, but RESEARCH §Per-Surface Probe Playbook enumerates 14 (Settings is the canonical 14th surface). Used 14 to ensure WALK-01 coverage across all shipped surfaces."
  - "URL list copy phrasing chose to mention URL-01 inline as a hint to Plan 02 (per D-14). Keeps the input file self-explanatory if read in isolation."
metrics:
  duration: ~12 min
  completed: 2026-05-09
  tasks: 3
  files-created: 13
  commits: 3
---

# Phase 12 Plan 01: Audit Infrastructure Bootstrap Summary

Scaffolded the Phase 12 audit infrastructure — empty `WALKTHROUGH.md` with all 14 surface section headers, severity rubric (D-01/D-02), uniform finding template (D-04), and backlog dedupe block (D-06); committed canned reusable inputs (D-13) under `.planning/v0.3/walkthrough-inputs/{voice,photo,url,voice-modify}/`; created the `audit:walkthrough` GitHub label idempotently on `lucaguery/al-dente`; verified `gh auth status` so Plan 05 can batch issue creation without re-prompting for auth.

## What Shipped

Three atomic commits across the 3 tasks:

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `f7ebfc5` | `chore(12-01)`: scaffold v0.3 walkthrough directories + audit:walkthrough label |
| 2 | `ead4a6f` | `docs(12-01)`: commit canned walkthrough inputs (voice / url / photo manifest) |
| 3 | `d89381f` | `docs(12-01)`: scaffold WALKTHROUGH.md skeleton (14 surfaces + rubric + dedupe) |

13 files created, 0 files modified, 0 lines under `frontend/` or `backend/`.

## Verification Captured

### `gh auth status` (Task 1)

```
github.com
  ✓ Logged in to github.com account lucaguery (keyring)
  - Active account: true
  - Git operations protocol: ssh
  - Token: gho_************************************
  - Token scopes: 'admin:public_key', 'gist', 'read:org', 'repo', 'workflow'
```

Authenticated as **`lucaguery`** with **`repo`** scope. Sufficient for Plan 05 issue creation.

### `gh repo view lucaguery/al-dente` (Task 1)

```json
{"name":"al-dente","owner":{"id":"MDQ6VXNlcjI5MzM3MTgx","login":"lucaguery"}}
```

Repo reachable.

### `audit:walkthrough` label (Task 1)

Pre-task: missing. Created via `gh label create audit:walkthrough --repo lucaguery/al-dente --color "FBCA04" --description "Phase 12 walkthrough findings"`. Post-task: present (verified by `gh label list ... | jq -r '.[].name' | grep -qx 'audit:walkthrough'`).

### WALKTHROUGH.md surface-header sanity check (Task 3)

- **`grep -c '^## ' .planning/v0.3/WALKTHROUGH.md` → 19** (target: ≥16). Breakdown: 1 "How to read this document" + 1 Severity rubric + 1 Backlog dedupe + 14 surface sections + 1 Summary + 1 Inputs to Phase 14 = 19.
- **`wc -l .planning/v0.3/WALKTHROUGH.md` → 233** (target: ≥80).
- **All 14 exact surface headers grep-found:** Capture — Quick / Full / Voice / Photo / URL, Shortlist, Vote, Cooking Log, History, Exports, Push, Realtime Sync, Onboarding, Settings.
- **All 6 backlog IDs grep-found:** Sheet-01, TZ-01, URL-01, CL-01, SEED-01-local, POLISH-01.
- **Auditor identity recorded:** `DEMO01` mentioned 2× (member #3 auditor + member #4 realtime co-auditor).
- **Uniform template present:** `**Severity:** blocker | friction | nit` line in "How to read this document".

### Artifact allowlist (all tasks)

`git diff --name-only HEAD~3..HEAD | grep -E "^(frontend|backend)/"` → empty. **Scope guard held end-to-end across all 3 tasks.**

## Deviations from Plan

None — plan executed exactly as written.

The plan's acceptance criterion #6 in Task 2 ("All 3 voice transcripts ... contain at least one French word matching `[éèàâîôûç]`") was scoped specifically to `voice/*.txt` (3 files), all of which pass. The `voice-modify/02-substitute.txt` content ("Remplace le bœuf par du poulet.") uses `œ` (a different French character not in the regex set) — out of scope for the criterion as written, kept as-is per the plan's verbatim content spec.

## Authentication Gates

None — `gh auth status` was already authenticated as `lucaguery` with `repo` scope at task start. No human intervention required.

## Decisions Made Under Claude's Discretion

Per CONTEXT §"Claude's Discretion", the following choices were made without escalation:

1. **Transcript-only voice inputs (no .m4a).** RESEARCH §Canned Input Artifact Specs (Open Questions resolved Q3) confirmed the prod voice surface accepts JSON `{transcript: "..."}` via `capture-voice.spec.ts:14-23`. Committing only `.txt` keeps the input set tight and reproducible. If Plan 02's live read of the voice handler reveals multipart-audio support, the operator can drop `.m4a` clips alongside in a follow-up — explicitly out of scope for Plan 01.
2. **Photo JPGs deferred to Plan 02.** Committed `walkthrough-inputs/photo/README.md` (manifest of 3 expected files) instead of placeholder JPGs. Plan 02 chooses live-capture vs operator-supplied per probe.
3. **14 ##-headers (not 13) in WALKTHROUGH.md.** ROADMAP/CONTEXT D-11 narrative lists 13 surfaces; RESEARCH §Per-Surface Probe Playbook lists 14. Used 14 to ensure WALK-01 coverage of every shipped surface (Settings is the canonical 14th).
4. **URL list inline note about URL-01.** The `urls.md` file mentions the URL-01 backlog cross-link inline so it is self-explanatory if read in isolation. Saves the Plan 02 executor a context-load step.
5. **Per-surface preambles cite D-06 cross-link rules.** WALKTHROUGH.md sections for URL / Cooking Log / History / Settings include explicit notes pointing at known backlog IDs so the Plan 02-04 executor can immediately cross-link rather than refile.

## Next

**Plan 12-02 (Wave 2):** Capture surfaces probe pass — 5 surfaces (quick / full / voice / photo / url), each with golden-path traversal + ≥3 weird-state probes per D-07. Consumes the canned inputs committed in this plan and writes findings into the `## Capture — *` sections of WALKTHROUGH.md. ~10-15 Gemini 2.5 Flash calls expected (D-12 live coverage).

## Self-Check: PASSED

All 13 created files exist on disk. All 3 task commits (`f7ebfc5`, `ead4a6f`, `d89381f`) are present in `git log --oneline -5`. `audit:walkthrough` label confirmed live on `lucaguery/al-dente`. `git diff --name-only HEAD~3..HEAD | grep -E "^(frontend|backend)/"` empty.

## Threat Flags

None. The plan's threat model (T-01 accepted, T-03 mitigated by url-list scrub-grep) was held end-to-end:

- **T-01** (DEMO01 invite-code disclosure): unchanged — DEMO01 is already public in `RUNBOOK.md` per Phase 11 D-15, not re-leaked.
- **T-03** (URL-list query-string secrets): mitigation held — `grep -E '\?(api_key|token|key|secret|password)=' urls.md` returned empty before commit.

No new security-relevant surface introduced (artifact-only plan, zero product-code drift).
