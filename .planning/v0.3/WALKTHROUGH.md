# v0.3 Phase 12 — Exploratory Feature Walkthrough

**Auditor:** Claude (Playwright MCP) — member #3 (`DEMO01`)
**Realtime co-auditor:** member #4 (`DEMO01`, joined for the realtime section)
**Target environment:** `https://al-dente-pink.vercel.app` (prod Vercel) → prod Supabase, `[SYNTHETIC] Démo Al Dente` household
**Session date:** 2026-05-09
**Session length:** in progress
**Gemini call total:** running tally (per-section breakdown below)
**Auditor session:** joined as `Auditor` via `DEMO01` at 17:13 UTC; member #4 of `[SYNTHETIC] Démo Al Dente` (3 seeded members already present — Luca, demo-A, demo-B). The plan's "member #3" framing assumed only 2 seeded — corrected here for accuracy. Scope-isolation invariant still holds: auditor is the only role used for probes.

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

**Starting state:** post-Phase-11 baseline (21 recipes, 7 votes, 3 cooking_logs); auditor is member #4 (joined fresh via DEMO01 — household had 3 seeded members; the plan's "member #3" is a doc drift). Inbox starts empty for the auditor's view.

**Surface contract observed:** tab labels are `Rapide` / `Complète` / `Voix` / `Photo` / `URL` (plan/CLAUDE.md docs say "Quick" — drift, English vs French). Submit button is `Ajouter` (plan guessed "Créer"/"Valider" — drift). Draft badge is just `Brouillon` (plan/spec referenced `Brouillon en attente d'analyse` — drift; promotion never runs for Quick because Quick is non-AI).

**Golden path:** Navigate to `/recipes/new` → "Rapide" tab pre-selected → type "Tarte aux poireaux" → click "Ajouter". `POST /api/recipes/quick` → `201` → redirect to `/inbox` → toast `Recette enregistrée` → draft card visible with `Brouillon` badge. Tab badge "À compléter" increments. **No `recipe.promoted` event** observed (Quick doesn't enqueue Gemini promotion per RESEARCH §Surface 1).

**Probes:**

### nit P-12-Q01: tab/button copy drifted from documentation
**Severity:** nit
**Surface:** Capture — Quick
**Probe kind:** invalid-state (documentation alignment)
**Starting state:** fresh `/recipes/new`.
**Repro:**
1. Compare snapshot tab labels to `CLAUDE.md` Locked vocabularies §"Tab labels: Quick/Complète/...".
2. Submit button is `Ajouter`; plan/spec referenced `Créer`/`Valider`.
**Expected:** documentation matches shipped strings.
**Actual:** tab "Rapide" (not "Quick"), button "Ajouter" (not "Créer"). Draft badge is bare `Brouillon`, not `Brouillon en attente d'analyse`.
**Screenshot:** none (textual finding).
**Issue:** documentation drift — surfaces in §Capture — Quick of WALKTHROUGH; Plan 05 will roll into a single "vocabulary audit" finding rather than per-surface filings.

### friction P-12-Q02: 5KB title rejected with misleading "Connexion impossible" toast
**Severity:** friction
**Surface:** Capture — Quick
**Probe kind:** boundary (oversized payload)
**Starting state:** fresh `/recipes/new`, `Rapide` tab.
**Repro:**
1. `document.querySelector('input[placeholder="Carbonara express"]').value = "<5014-char string of 'Tarte flambée éèàâç 🍝 ' repeated>"` via React-friendly setter + `input` event.
2. Click `Ajouter`.
**Expected:** either field-level validation ("Titre trop long, max N caractères") OR backend accepts and truncates; clear actionable copy either way.
**Actual:** `POST /api/recipes/quick` → `422 Unprocessable Entity`. Toast: `Connexion impossible. Réessaie dans un instant.` — generic network-failure copy treats validation errors as connectivity errors. User has no signal that the title is the cause.
**Screenshot:** `walkthrough-screenshots/capture-quick-5kb-title.png`
**Issue:** new finding (Plan 05 to file).

### friction P-12-Q03: double-tap creates duplicate drafts (no client debounce, no idempotency token)
**Severity:** friction
**Surface:** Capture — Quick
**Probe kind:** racing
**Starting state:** fresh `/recipes/new`, `Rapide` tab, title "Quiche lorraine racing" entered.
**Repro:**
1. In a single synchronous JS task, call `submitButton.click(); submitButton.click()` (mimics fast double-tap on iPhone before React can disable).
2. Check `/inbox`.
**Expected:** one draft (button disables on submit, OR `Idempotency-Key` header dedupes server-side).
**Actual:** `POST /api/recipes/quick` fires **twice**, both return `201` with **distinct UUIDs** (`09222aac-fe91-4da5-9102-26d50ea966fc` + `a3548580-6b64-4a66-8737-abd785c7a187`). Inbox shows two identical `Brouillon` cards. User must manually delete one.
**Screenshot:** `walkthrough-screenshots/capture-quick-double-tap.png`
**Issue:** new finding (Plan 05 to file). Likely affects all 5 capture surfaces — the `Ajouter` button does not enter a pending/disabled state during the in-flight POST.

### nit P-12-Q04: empty-title behavior is correct (button disabled) — recorded for completeness
**Severity:** nit
**Surface:** Capture — Quick
**Probe kind:** garbage (empty input)
**Starting state:** fresh `/recipes/new`, `Rapide` tab, no input.
**Repro:** observe button state with empty title.
**Expected:** disabled or validation message.
**Actual:** `Ajouter` button is `disabled` until non-empty title — correct UX. No backend round-trip occurs. **Pass-style finding** (recorded so future audits can confirm regression-free).
**Screenshot:** `walkthrough-screenshots/capture-quick-empty-title.png`
**Issue:** none.

**Gemini calls in this section:** 0 (Quick capture is non-AI per RESEARCH §Surface 1; confirmed live — no `recipe.promoted` WS event observed and draft stays at `Brouillon` until manually completed).

---

## Capture — Full

**Starting state:** after Capture — Quick probes; auditor's inbox has 3 drafts (1 Tarte aux poireaux + 2 duplicate `Quiche lorraine racing` from probe Q-3). Synthetic household otherwise unchanged from Phase-11 baseline.

**Surface contract observed:** form fields rendered: Titre (input), Ingrédients (textarea, one-per-line, placeholder example "200 g de pâtes\\n2 œufs\\n80 g de pancetta"), Étapes (textarea), Temps de prép. (number), Personnes (number), Cuisine (combobox), Ambiance (5 toggle buttons: Réconfortante / Légère / Rapide / Festive / Aventureuse), Protéine principale (combobox), Saisons (4 toggle buttons), Tags (textarea), Photos (button — disabled). Submit button: `Enregistrer la recette` (disabled until Title is non-empty — only Title is hard-required client-side).

**Golden path:** Navigate to `/recipes/new` → click "Complète" tab → fill Title="Salade niçoise auditeur", 7 ingredients (one-per-line), 5 steps, prep=20, persons=4, season=Été → submit. `POST /api/recipes` → recipe created with `status="structured"` immediately (NOT a draft) → redirected to `/recipes/{uuid}` detail page → toast `Recette enregistrée`. Inbox count does NOT increment (Full bypasses the inbox flow that Quick uses — they exit on different pages).

**Asymmetry note:** Full produces `status='structured'` directly; Quick produces `status='draft'`. Documenting because invariant #1 says "all 5 capture surfaces … return a draft immediately, all promotion runs server-side" — but Full skips the draft state entirely. The invariant text is slightly stale; Full's input is already structured-form, so there's no promotion to do. Worth a copy refresh in `CLAUDE.md`.

**Probes:**

### blocker P-12-F01: ingredient parser produces duplicate-rendered tokens for "<int> <noun>" patterns
**Severity:** blocker
**Surface:** Capture — Full (likely propagates to Voice/Photo/URL via the same parser)
**Probe kind:** garbage (realistic French recipe input that exposes parser fragility)
**Starting state:** golden-path Salade niçoise submission with ingredient line `4 tomates`.
**Repro:**
1. POST `/api/recipes` with `ingredients_raw_text` containing the exact line `4 tomates`.
2. GET `/api/recipes/{id}` → inspect `ingredients[]`.
**Expected:** `{name: "tomates", quantity: 4, unit: null}` (or `unit: "pcs"`); rendered as `4 tomates` once.
**Actual:** `{name: "4 tomates", quantity: 4, unit: "tomates"}` — both the tokenized fields AND the original string preserved as `name`. Frontend renders as `{quantity} {unit} {name}` → `4 tomates 4 tomates`. Same parser also misclassifies `1 oignon rouge` as `{name: "rouge", quantity: 1, unit: "oignon"}` (treats noun head as unit). All Capture — Full submissions with simple "<int> <noun>" lines are affected. **User-visible quality issue.**
**Screenshot:** `walkthrough-screenshots/capture-full-ingredient-duplication.png`
**Issue:** new finding (Plan 05 to file). Severity = **blocker** because the recipe view's `Ingrédients` list — the primary readable artifact — is corrupted on a common French shopping-list pattern. (D-01: "primary intended action non-functional even via workaround" — the user can't easily edit out the duplication without re-entering the entire recipe.)
**Recipe sample:** `131ce526-6bbc-4a9e-8a34-0ad0760e3bb4` (synthetic household).

### friction P-12-F02: title-only Full submit creates orphan `structured` recipe with null ingredients/steps
**Severity:** friction
**Surface:** Capture — Full
**Probe kind:** garbage (minimal payload)
**Starting state:** fresh `/recipes/new`, "Complète" tab, only Title="Title only test" filled.
**Repro:**
1. Submit Full form with title only, no ingredients, no steps, no metadata.
**Expected:** either backend rejects (4xx) OR frontend marks the recipe as `draft` (consistent with Quick's behavior) so the user is nudged to complete it.
**Actual:** `POST /api/recipes` → `200`/`201` → recipe created with `status='structured'`, `ingredients=null`, `steps=null` → redirected to recipe detail page that renders an empty body ("Dernière fois : Jamais cuisinée · Cuisinée 0 fois" only). The recipe is now eligible for shortlist scoring with no ingredients to score against. Asymmetric vs Quick (which would put the same payload in `/inbox` as `Brouillon`).
**Screenshot:** `walkthrough-screenshots/capture-full-title-only.png`
**Issue:** new finding (Plan 05 to file). Likely related to algorithm/`services/algorithm.py` shortlist eligibility — investigate whether null-ingredients recipes silently affect scoring.
**Recipe sample:** `e80a248c-1184-498d-a5d5-d0816d971aa0`.

### nit P-12-F03: 200-line ingredients accepted intact (pass-style probe)
**Severity:** nit
**Surface:** Capture — Full
**Probe kind:** boundary (oversized payload)
**Starting state:** fresh `/recipes/new`, "Complète" tab, 200 unique ingredient lines `<i>g ingrédient n°<i> avec accent éàç` for i=1..200.
**Repro:**
1. Set `textarea[ingredients]` value programmatically + dispatch React `input` event.
2. Submit.
**Expected:** either truncation with warning, or full preservation; no crash.
**Actual:** `POST /api/recipes` succeeds, GET round-trip returns all 200 ingredients with correct quantity/unit/name parsing, `status='structured'`. No truncation, no error. Mobile detail-page layout was not load-tested — likely renders all 200 in a long list (acceptable). **Pass-style finding.**
**Screenshot:** `walkthrough-screenshots/capture-full-200-ingredients.png`
**Issue:** none.
**Recipe sample:** `dfdab18f-3d6b-428a-9b4e-a971906b32b6`.

### friction P-12-F04: query-string state ignored — `?tab=full&prefilled=...` doesn't deep-link
**Severity:** friction
**Surface:** Capture — Full (and the whole `/recipes/new` route)
**Probe kind:** invalid-state (deep-link assumptions)
**Starting state:** navigate via `mcp__playwright__browser_navigate` to `/recipes/new?tab=full&prefilled=%7B%22title%22%3A%3Cscript%3Ealert%281%29%3C%2Fscript%3E%7D&garbage=☠`.
**Repro:**
1. Open the URL above.
**Expected:** `?tab=full` switches to Complète tab; `?prefilled=` either pre-populates form, sanitizes garbage, or is ignored cleanly.
**Actual:** "Rapide" tab stays selected (query param ignored). Title input is empty (prefilled ignored — and notably the embedded `<script>` payload was NEVER executed — security pass: Next.js URL handling escapes correctly). Functionally clean but means external links / share-flow can't deep-link to a specific tab. Low priority; flag for Phase 14 or later product polish.
**Screenshot:** `walkthrough-screenshots/capture-full-prefilled-bad-json.png`
**Issue:** new finding (Plan 05 to file as friction).

**Gemini calls in this section:** 0 (Full capture is non-AI per RESEARCH §Surface 2; confirmed live — no AI requests in network log for any of the 4 probes; recipe `status` jumps to `structured` synchronously on POST).

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
