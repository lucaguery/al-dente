# v0.3 Phase 12 — Exploratory Feature Walkthrough

**Auditor:** Claude (Playwright MCP) — member #3 (`DEMO01`)
**Realtime co-auditor:** member #4 (`DEMO01`, joined for the realtime section)
**Target environment:** prod Supabase, `[SYNTHETIC] Démo Al Dente` household
**Session date:** YYYY-MM-DD
**Session length:** ~Xh
**Gemini call total:** ~XX (per-section breakdown below)

> **Skeleton status (Plan 12-01):** This file is the empty audit log. Plans 12-02
> through 12-04 fill the section bodies incrementally per D-20; Plan 12-05 does
> the closing sweep (severity re-tag, dedupe against backlog, cross-link issues).
> Inputs live under `walkthrough-inputs/`; screenshots under
> `walkthrough-screenshots/<surface>-<probe-slug>.png`.

## How to read this document

Each section corresponds to one of the 14 shipped surfaces (per ROADMAP §Phase 12 success criterion 1; ROADMAP/CONTEXT D-11 lists 13 in narrative order, with Settings as the 14th canonical surface — RESEARCH §Per-Surface Probe Playbook also enumerates 14). Each surface has:

- A one-paragraph **golden-path note** describing what the auditor exercised first.
- A **starting-state** preamble for each probe (per CONTEXT D-09).
- ≥3 **weird-state probes** (per D-07), each documented with the **uniform finding template** (D-04):

  ```
  ### <severity-tag> <P-XX-NN>: <one-line title>
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

## Severity rubric (D-01 / D-02)

- **blocker** — crash / 500 / data loss, OR primary intended action non-functional even via workaround. Files a GitHub issue under `lucaguery/al-dente` with label `audit:walkthrough` (D-03).
- **friction** — costs the user time, attention, or confidence. Stays in this doc as Phase 14 input.
- **nit** — visual or copy polish. Stays in this doc as Phase 14 input.

## Backlog dedupe (D-06)

Findings that match a known v0.2.2 backlog item are documented but DO NOT generate new GitHub issues. Cross-links use the backlog ID:

- `Sheet-01` (#1, https://github.com/lucaguery/al-dente/issues/1) — bottom sheet off-screen on iPhone viewport
- `TZ-01` — `cooking_logs.py:72-78,118-126` timezone bug (Python local-tz vs UTC DB date)
- `URL-01` — `recipes.py:481-490` URL extraction is `# TODO(productize)`; drafts from URL never promote (D-14)
- `CL-01` — GET /cooking-logs (list) endpoint missing — `/cooking-logs` page renders but never has data
- `SEED-01-local` — local seed cross-day idempotency hole at `cli/seed.py:369,405` (closed for prod synthetic by Phase 11 D-10/D-11)
- `POLISH-01` / `POLISH-02` — i18n sweep on partner-waiting strings + Copy button on invite code

---

## Capture — Quick

**Starting state:** _to be filled in Plan 12-02_
**Golden path:** _to be filled — references `frontend/tests/e2e/capture-quick.spec.ts`_
**Probes:**

**Gemini calls in this section:** 0 (Quick capture is non-AI).

---

## Capture — Full

**Starting state:** _to be filled in Plan 12-02_
**Golden path:** _to be filled — references `frontend/tests/e2e/capture-full.spec.ts`_
**Probes:**

**Gemini calls in this section:** 0 (Full-form capture is non-AI).

---

## Capture — Voice

**Starting state:** _to be filled in Plan 12-02_
**Golden path:** _to be filled — references `frontend/tests/e2e/capture-voice.spec.ts`; canned inputs at `walkthrough-inputs/voice/`_
**Probes:**

**Gemini calls in this section:** ~X (per probe).

---

## Capture — Photo

**Starting state:** _to be filled in Plan 12-02_
**Golden path:** _to be filled — references `frontend/tests/e2e/capture-photo.spec.ts`; canned inputs (if committed) at `walkthrough-inputs/photo/` per `walkthrough-inputs/photo/README.md`_
**Probes:**

**Gemini calls in this section:** ~X (per probe).

---

## Capture — URL

**Starting state:** _to be filled in Plan 12-02_
**Golden path:** _to be filled — references `frontend/tests/e2e/capture-url.spec.ts`; canned inputs at `walkthrough-inputs/url/urls.md`_

> Note (D-14): the URL surface's primary intended action — promotion to a structured recipe — is currently broken (`URL-01`, `recipes.py:481-490` is `# TODO(productize)`). The URL probe records this as a `blocker`-severity finding and **cross-links to URL-01 instead of filing a new issue** (per D-06 dedupe).

**Probes:**

**Gemini calls in this section:** ~X (per probe).

---

## Shortlist

**Starting state:** _to be filled in Plan 12-03_
**Golden path:** _to be filled — references `frontend/tests/e2e/decide-shortlist-deck.spec.ts` and the framer-motion swipe deck (Phase 7 polish)_
**Probes:**

**Gemini calls in this section:** 0 (Shortlist scoring is deterministic/server-side).

---

## Vote

**Starting state:** _to be filled in Plan 12-03_
**Golden path:** _to be filled — exercise all 5 computed states (Validé / Pressenti / Contesté / Rejeté / Sans avis) per invariant #2_
**Probes:**

**Gemini calls in this section:** 0 (Voting is non-AI).

---

## Cooking Log

**Starting state:** _to be filled in Plan 12-03_
**Golden path:** _to be filled — references `frontend/tests/e2e/cooking-log-create-finalize.spec.ts`_

> Note (D-06): Late-evening cooks may be filtered out by the `TZ-01` Python-local-tz / UTC-DB-date mismatch in `cooking_logs.py:72-78,118-126`. If the probe re-discovers it, cross-link `TZ-01` instead of filing a new issue.

**Probes:**

**Gemini calls in this section:** 0 (Cooking-log creation is non-AI).

---

## History

**Starting state:** _to be filled in Plan 12-03_
**Golden path:** _to be filled — references `frontend/tests/e2e/cooking-log-history.spec.ts`_

> Note (D-06): The `/cooking-logs` history page renders but never has data because GET `/cooking-logs` (list) is missing (`CL-01`). The history probe documents the user-visible empty state and cross-links `CL-01`.

**Probes:**

**Gemini calls in this section:** 0 (History is read-only, non-AI).

---

## Exports

**Starting state:** _to be filled in Plan 12-03_
**Golden path:** _to be filled — JSON export per RECIPE-08 (v0.1)_
**Probes:**

**Gemini calls in this section:** 0 (Export is deterministic.)

---

## Push

**Starting state:** _to be filled in Plan 12-04_
**Golden path:** _to be filled — service worker `pushManager.subscribe()` against prod backend (D-19)_

> D-19 depth: subscription verification + 1 fired notification round-trip. If the auditor cannot trigger a send programmatically, the operator (Luca) confirms inline ("verified by Luca on YYYY-MM-DD HH:MM, notification arrived in ~Xs").

**Probes:**

**Gemini calls in this section:** 0 (Push is non-AI.)

---

## Realtime Sync

**Two-context setup:** _to be filled in Plan 12-04 — verify per RESEARCH §"Realtime Sync Two-Context Invocation Pattern"; document observed cookie-isolation behavior (single shared jar vs per-tab) before running probes._

**Starting state:** _to be filled in Plan 12-04_
**Golden path:** _to be filled — member B (#4) fires mutations, member A (#3, parked on home/decide) observes via WS push (≤3s qualitative observation per D-17)_
**Probes:**

> D-16: cover all 6 broadcast event classes from `services/realtime.py` (`recipe.created`, `recipe.promoted`, `vote.created` + state transitions, `cooking_log.created`, `cooking_log.finalized`) plus 1 reconnect probe. Total ≈ 7 cross-client probes.

**Gemini calls in this section:** 0 (Realtime broadcast is non-AI; mutations fired in the realtime section may incidentally hit Gemini via voice/photo/url surfaces — count in those sections, not here).

---

## Onboarding

**Starting state:** _to be filled in Plan 12-04_
**Golden path:** _to be filled — references `frontend/tests/e2e/onboarding-create.spec.ts`, `onboarding-join.spec.ts`, `invite-code-happy-path.spec.ts`. Member #4 join flow already exercised in §Realtime Sync._
**Probes:**

**Gemini calls in this section:** 0 (Onboarding is non-AI.)

---

## Settings

**Starting state:** _to be filled in Plan 12-04_
**Golden path:** _to be filled — references `frontend/tests/e2e/settings.spec.ts`. Phase 9 reorganized into Membre / Foyer / Sauvegarde sections._
**Probes:**

> Note (D-06): Phase 9 polish left `POLISH-01` (i18n sweep on partner-waiting strings) and `POLISH-02` (Copy button on invite code) open. If the probe re-surfaces either, cross-link rather than refile.

**Gemini calls in this section:** 0 (Settings is non-AI.)

---

## Summary

> _Filled in Plan 12-05 closing sweep._

**Findings by severity:**
- Blockers: X (Y filed as new issues, Z cross-linked to backlog)
- Friction: A
- Nits: B

**Gemini calls total:** ~XX (per-section breakdown above).

**Surfaces with no issues found:** _list_

## Inputs to Phase 14

This document, together with `walkthrough-screenshots/` and the GitHub issues filed under `lucaguery/al-dente` with label `audit:walkthrough`, is the input set Phase 14 (`/gsd-new-milestone` synthesis) consumes. Phase 13 (design quality + originality audit) reads this file to avoid double-probing the same surface.
