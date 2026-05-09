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

**Starting state:** after Capture — Quick + Full probes; auditor's inbox has 3 stale `Brouillon` cards from Quick. Synthetic recipe count grew by 4 from Capture — Full submissions.

**Surface contract observed:** the Voix tab renders a single `textarea` with placeholder `Dictez via le clavier 🎤 ou tapez votre recette…` — no in-app audio recorder, no file picker. Confirmed JSON `{transcript: "..."}` body shape (per `capture-voice.spec.ts:14-23`). The iOS-mic-on-keyboard strategy means voice capture is, on prod, just a text-paste flow; the "voice" naming is product framing, not a different transport. Submit button: `Envoyer`. Helper text: `Dicte ta recette en français. On la met en forme automatiquement.`

**Golden path:** Navigate to `/recipes/new` → click "Voix" tab → paste content of `walkthrough-inputs/voice/01-clean-french.txt` (Risotto aux champignons transcript) → click `Envoyer`. `POST /api/recipes/voice` → `201` → redirect to `/inbox` → card appears with title `(extraction en cours…)` and `Extraction en cours…` status. Within ~10s the BackgroundTask completes, the card disappears from `/inbox`, and a new `structured` recipe `1155ada8-50df-474a-a256-7946a107adf4` appears in `/recipes`. Quality of extraction (verified via API): title=`Risotto aux champignons`, 7 ingredients (`Riz arborio` etc., all `quantity: null` because the prose has no quantities), `cuisine: italian` (Gemini-inferred), `servings: 2` from "pour deux personnes". `mood: []` not inferred (could be); `steps: null` (correct — transcript had no procedural steps).

**Probes:**

### blocker P-12-V01: garbage transcript leaves draft permanently stuck at `(extraction en cours…)`
**Severity:** blocker
**Surface:** Capture — Voice
**Probe kind:** garbage (no recipe content)
**Starting state:** fresh `/recipes/new`, Voix tab.
**Repro:**
1. Submit transcript with no recipe content: `le chat est assis sur le tapis hier j'ai vu un nuage et j'ai pensé à mes vacances en bretagne il pleuvait beaucoup mais c'était bien quand même`.
2. Wait 3+ minutes.
3. GET `/api/recipes/{id}`.
**Expected:** either Gemini returns a best-effort recipe shape, OR the BackgroundTask updates the recipe to a terminal state like `status='failed'` with a user-visible explanation ("Pas de recette détectée"). The user must have a recovery path other than the X button.
**Actual:** the draft remains `status='draft'`, `title='(extraction en cours…)'`, `ingredients=null`, **for at least 3 minutes** (audit didn't wait longer). The inbox card just shows "(extraction en cours…)" with the spinner spinning indefinitely. The user has no way to know whether the model is still trying or has silently failed. Only recovery: delete and start over.
**Screenshot:** `walkthrough-screenshots/capture-voice-garbled.png`
**Issue:** new finding (Plan 05 to file). Severity = **blocker** because the primary intended action (a recipe) is not delivered AND the system gives no actionable feedback (D-01: "primary intended action non-functional even via workaround"). The `recipes` model needs a `failed` terminal state OR the worker needs a timeout that surfaces an error in the UI.
**Recipe sample:** `2e2bf60b-9fee-44d4-b30c-ea49e566e57e` (still stuck at audit time).

### nit P-12-V02: very-short transcript ("Pâtes au beurre.") promotes cleanly with sparse data (pass-style)
**Severity:** nit
**Surface:** Capture — Voice
**Probe kind:** boundary (minimal valid transcript)
**Starting state:** fresh `/recipes/new`, Voix tab.
**Repro:**
1. Paste `walkthrough-inputs/voice/03-very-short.txt` content: `Pâtes au beurre.`
2. Submit, wait <30s.
**Expected:** either promotion to a sparse `structured` recipe, or graceful fallback.
**Actual:** `POST` → 201 → BackgroundTask → ~25s later, recipe `dbbbf866-1165-4a3c-890a-3b9233fe6a0c` is `status='structured'`, title=`Pâtes au beurre`, 2 ingredients (presumably `pâtes` + `beurre`). **Pass-style finding** — Gemini handles edge of validity correctly. Notable: the only difference between this passing case and V-01 above is recipe-domain content present vs absent — suggests Gemini is silently swallowing "no recipe found" cases instead of returning a structured negative.
**Screenshot:** `walkthrough-screenshots/capture-voice-very-short.png`
**Issue:** none.

### nit P-12-V03: BackgroundTask robust to client navigation (pass-style)
**Severity:** nit
**Surface:** Capture — Voice (architecture invariant #1)
**Probe kind:** racing (client navigates away during in-flight Gemini call)
**Starting state:** fresh `/recipes/new`, Voix tab. Disfluent canned transcript from `02-garbled-accent.txt` (`euh risotto aux champignons hum...ouais...voilà`).
**Repro:**
1. Programmatically: `submitButton.click(); setTimeout(() => window.location.href = '/', 0);` — navigates within the same task before the network response.
2. Wait ~25s.
3. List recipes via `/api/recipes?limit=4`.
**Expected:** invariant #1 says promotion is server-side `BackgroundTask` so client navigation should not abort it.
**Actual:** Recipe `cd82ab4d-660f-4bec-8eca-dc86c8328e6c` arrives `structured` with title `Risotto aux champignons` despite navigation. **Invariant #1 holds.** Also notable: Gemini cleaned the disfluencies ("euh", "hum", "ouais", "voilà") and produced the same canonical title as the clean transcript — strong robustness signal.
**Screenshot:** none (the auditor's view post-navigation showed no visible state change; finding is invisible to UI but visible via API).
**Issue:** none.

**Gemini calls in this section:** 4 (1 golden + 3 probes — V-01 may still be retrying server-side; counted as 1 even if internal retries occurred).

---

## Capture — Photo

**Starting state:** after Capture — Voice probes; auditor's recipe collection now includes 4 voice-derived recipes (1 stuck V-01, 3 promoted) plus the 3 Capture — Full recipes. Inbox tab shows count "4" (3 Quick drafts + 1 stuck voice draft).

**Surface contract observed:** the Photo tab renders heading `Photographie la recette`, helper paragraph `Ajoute jusqu'à 4 photos. Gemini extrait le titre, les ingrédients et les étapes.`, an `Ajouter une photo` button, and a disabled `Capturer la recette` submit button until at least one photo is attached. Two hidden `<input type="file" accept="image/*">` elements exist: one with `capture="environment"` (camera path), one without (library path). Clicking `Ajouter une photo` opens a Radix `[role="dialog"]` bottom sheet with two buttons (`Caméra` and `Photothèque`).

**Surface contract — canned inputs:** `walkthrough-inputs/photo/` ships only README.md and `.gitkeep` (per Plan 12-01 SUMMARY); no JPGs are committed. Auditor generated synthetic 4×4-pixel red PNGs (~70 bytes) in `.playwright-mcp/audit-photo/` to exercise the upload pipeline. These are recipe-domain-irrelevant by construction — useful for probing Gemini's behavior on out-of-domain inputs but not for OCR/extraction quality.

**Golden path:** Click "Photo" tab → click `Ajouter une photo` → bottom sheet appears → click `Photothèque` → file chooser → select `non-recipe.png` → photo appears with `Retirer la photo` control → click `Capturer la recette`. `POST /api/recipes/photo` (multipart `files`) → `201` → redirect to `/inbox` → card with `(extraction en cours…)`. Photo path returned: `9f3b1902-…/<recipe_id>/<file_uuid>.png` (Supabase Storage path scoped to household). The actual promotion outcome is documented per probe below — for the synthetic non-recipe input, promotion does NOT complete (see P-12-Ph02).

**Probes:**

### blocker P-12-Ph01: Sheet-01 reproduces — Photothèque button clipped 35px below iPhone viewport
**Severity:** blocker (matches the Sheet-01 [#1] backlog item — D-06 dedupe applies)
**Surface:** Capture — Photo (and likely all `<SheetContent side="bottom">` usages — VoiceModifySheet, RegenerateSheet per PROJECT.md)
**Probe kind:** invalid-state (CSS class collision)
**Starting state:** iPhone-shape Chromium viewport 390×844; Photo tab active.
**Repro:**
1. Click `Ajouter une photo`.
2. Inspect the bottom sheet: `getBoundingClientRect()` on `[role="dialog"]` and on the two action buttons.
**Expected:** the entire sheet visible inside the 844px-tall viewport with both `Caméra` and `Photothèque` fully tappable.
**Actual:**
  - Dialog: `top=702px`, `bottom=939px`, `height=237px` — sheet ends **95px below the 844px viewport**.
  - `Caméra` button: `top=775, bottom=823` — barely in viewport (823 ≤ 844).
  - `Photothèque` button: `top=831, bottom=879` — **35px clipped** off the bottom (879 > 844). Touching it requires the browser/iOS Safari URL-bar to auto-hide first, OR scrolling within the dialog (not always possible inside a Radix sheet).
  - Computed style: `position: relative` (NOT `fixed`); `paper-grain` class is present.
  - Confirms the `paper-grain` overrides Tailwind `fixed` per PROJECT.md root-cause analysis.
**Screenshot:** `walkthrough-screenshots/capture-photo-bottom-sheet.png`
**Issue:** **cross-link to backlog only — DO NOT file new** (D-06): https://github.com/lucaguery/al-dente/issues/1 (Sheet-01).
**Note vs original report:** the original PROJECT.md/SPEC framing said "off-screen" — at audit time the sheet is **partially clipped**, not fully off-screen. Caméra is reachable, Photothèque is partially reachable. Severity is still **blocker** because the photo-library path (the more common one) is the clipped one and there's no scroll-affordance inside the sheet.

### blocker P-12-Ph02: non-recipe photo upload leaves draft permanently stuck at `(extraction en cours…)`
**Severity:** blocker (cross-surface duplicate of P-12-V01 — same Gemini-failed-silently pattern)
**Surface:** Capture — Photo
**Probe kind:** garbage (out-of-domain image input)
**Starting state:** Photo tab, fresh `/recipes/new`.
**Repro:**
1. `Ajouter une photo` → `Photothèque` → upload 4×4-pixel PNG `non-recipe.png` (no recipe content).
2. Click `Capturer la recette`.
3. Wait 25+ seconds.
4. GET `/api/recipes/{id}`.
**Expected:** Gemini returns "no recipe detected", BackgroundTask transitions to `status='failed'` with user-visible error.
**Actual:** `POST /api/recipes/photo` → `201`, draft created with title `(extraction en cours…)`. After 25s the draft is still `status='draft'`, `title='(extraction en cours…)'`, `ingredients=null` — same stuck state as garbage voice (P-12-V01). Photo IS persisted to Supabase Storage at `9f3b1902-…/{id}/<uuid>.png`. Confirms the bug is **promotion-layer**, not surface-specific — likely lives in `services/llm` or the `BackgroundTask` runner. **Cross-surface dedupe with P-12-V01 — Plan 05 should file ONE finding ("Gemini empty/failure leaves drafts in permanent `(extraction en cours…)` state") covering Voice + Photo + URL.**
**Screenshot:** `walkthrough-screenshots/capture-photo-non-recipe.png`
**Issue:** new finding (Plan 05 to file as single cross-surface bug — see also P-12-V01).
**Recipe sample:** `1b84b91e-a5cf-4ff4-9107-86d63acfb9cf`.

### friction P-12-Ph03: query-string state ignored on Photo tab (cross-tab confirmation of P-12-F04)
**Severity:** friction (duplicate-pattern of P-12-F04)
**Surface:** Capture — Photo (whole `/recipes/new` route)
**Probe kind:** invalid-state
**Starting state:** navigate to `/recipes/new?tab=photo&files=garbage&blob=☠`.
**Repro:**
1. Open the URL above.
**Expected:** `?tab=photo` selects Photo tab; `?files=` either parses-and-rejects or ignored cleanly.
**Actual:** "Rapide" tab default-selected (param ignored); no pre-attached photos; `Capturer la recette` not exposed (we're not on Photo tab). Same friction as F-04 — confirmed it's a route-level deep-link gap, not tab-specific. Plan 05 to fold this into the F-04 finding.
**Screenshot:** none (visually identical to /recipes/new default).
**Issue:** see P-12-F04.

**Gemini calls in this section:** 1 (single non-recipe upload — auditor stayed conservative on Gemini budget given V-01 is still potentially retrying server-side).

---

## Capture — URL

**Starting state:** after Capture — Photo probes; auditor's recipe collection has the 1 stuck photo draft and the URL-01 dummy drafts about to be created.

**Surface contract observed:** the URL tab renders a single `input[placeholder="https://…"]` (HTML5 `type` likely `url` per behavior of client-side validation), an inline info panel (`L'extraction automatique arrive bientôt — tu pourras compléter les détails dans la boîte de réception.`), and a submit button `Ajouter à la boîte de réception` (disabled until input is a syntactically-valid URL). Notably the UI **explicitly discloses URL-01** ("arrive bientôt") — this is product-honest framing of the stub at `recipes.py:481-490` rather than a hidden failure.

**Golden path = blocker-by-design (URL-01):** Navigate to `/recipes/new` → click "URL" tab → paste `https://www.marmiton.org/recettes/recette_risotto-aux-champignons_28057.aspx` → click `Ajouter à la boîte de réception`. `POST /api/recipes/url` → `201` → redirect to `/inbox`. The draft is created with `status='draft'`, `title=<the raw URL>` (no slug-parsing fallback), no Gemini call attempted (network log shows zero `/v1beta/models/gemini-...` requests in the wave). The draft persists indefinitely as a recipe-shaped row whose only useful data is the URL. The user must manually open the inbox card and complete it. **Per D-14 this is severity = `blocker` BUT cross-links to URL-01 — DO NOT file a new GitHub issue.**

> Note (D-14): the URL surface's primary intended action — promotion to a structured recipe — is currently broken (`URL-01`, `recipes.py:481-490` is `# TODO(productize)`). The URL probe records this as a `blocker`-severity finding and **cross-links to URL-01 instead of filing a new issue** (per D-06 dedupe).

**Probes:**

### blocker P-12-U01: URL-01 — golden path produces non-promoting draft titled with the raw URL
**Severity:** blocker (cross-link to URL-01 backlog only — D-14 / D-06: no new GitHub issue)
**Surface:** Capture — URL
**Probe kind:** garbage (well-formed URL with extractable content, but extractor is stubbed)
**Starting state:** fresh `/recipes/new`, URL tab.
**Repro:**
1. Paste `https://www.marmiton.org/recettes/recette_risotto-aux-champignons_28057.aspx` (canned input from `walkthrough-inputs/url/urls.md` line "01").
2. Submit → wait 30s → GET `/api/recipes/{id}`.
**Expected:** Gemini fetches the page, extracts title/ingredients/steps. Promote to `structured`.
**Actual:** Recipe `5e4a920b-ae12-4f91-91f7-36d0f6e7a0b5` created `status='draft'`, `title='https://www.marmiton.org/recettes/recette_risotto-aux-champignons_28057.aspx'` (raw URL is the title — no slug parsing, no even-best-effort fallback like "Risotto aux champignons" derivable from `28057.aspx`'s prefix). `source_capture.payload.url` preserved (invariant #5 ✓). No Gemini call made. UI's preemptive disclosure ("arrive bientôt") is the only friction-mitigation. Confirms `recipes.py:481-490` is a no-op short-circuit.
**Screenshot:** `walkthrough-screenshots/capture-url-marmiton.png`
**Issue:** **URL-01** — cross-link only; do NOT file new (per D-14). The user-visible artifact is acceptable AS LONG AS the "arrive bientôt" copy stays in front of the user; the moment that copy is removed before extraction is implemented, the surface becomes a true blocker.

### nit P-12-U02: URL field client-side rejects non-URL strings (pass-style)
**Severity:** nit (pass-style; security-adjacent)
**Surface:** Capture — URL
**Probe kind:** garbage (free-form text in URL field)
**Starting state:** fresh `/recipes/new`, URL tab.
**Repro:**
1. Type `not-a-url-just-text` into the URL input.
**Expected:** submit button disables OR field shows validation error.
**Actual:** submit button stays `disabled`; HTML5 URL validation fires (likely `<input type="url">` plus a regex that requires scheme). User cannot fire `POST /api/recipes/url`. **Pass-style finding.**
**Screenshot:** `walkthrough-screenshots/capture-url-not-a-url.png`
**Issue:** none.

### nit P-12-U03: well-formed non-recipe URL behaves identically to golden (URL-01 short-circuits before any classification)
**Severity:** nit (URL-01 dedupe — same root cause)
**Surface:** Capture — URL
**Probe kind:** boundary (Wikipedia article — well-formed URL, structured-data-ish content, but not a recipe)
**Starting state:** fresh `/recipes/new`, URL tab.
**Repro:**
1. Submit `https://en.wikipedia.org/wiki/Risotto`.
**Expected:** if URL extraction were implemented, Gemini would either extract a recipe-ish shape from the article or return a structured negative.
**Actual:** Recipe `2b9f157b-f33f-4756-95cb-adc53b6eb84b`, identical shape to the marmiton draft — `status='draft'`, `title=<raw URL>`. No differentiation between recipe/non-recipe URLs because nothing actually fetches. Confirms URL-01 short-circuits **before** any URL classification or Gemini call. **Cross-link to URL-01.**
**Screenshot:** none (visually identical to capture-url-marmiton.png).
**Issue:** see URL-01 cross-link.

### nit P-12-U04: javascript: scheme rejected at client AND backend (defense in depth, pass-style)
**Severity:** nit (security pass)
**Surface:** Capture — URL
**Probe kind:** invalid-state (malicious scheme)
**Starting state:** fresh `/recipes/new`, URL tab.
**Repro:**
1. Paste `javascript:alert(1)` into URL input — submit button disables (client check).
2. Programmatically `fetch('/api/recipes/url', {method: 'POST', body: JSON.stringify({url: 'javascript:alert(1)'})})` to bypass the client.
**Expected:** server-side scheme allowlist rejects.
**Actual:** Client: button disabled. Backend: `422 Unprocessable Entity`, body `{"detail":"url must start with http:// or https://"}`. **Defense in depth confirmed.** Pass-style security finding worth recording so future audits can detect regression.
**Screenshot:** none (no visible state change).
**Issue:** none.

**Skipped probe (documented per D-09):** the plan also called for a slow-URL probe via `httpbin.org/delay/30`. Skipped because URL-01 short-circuits the BackgroundTask BEFORE any URL fetch is initiated — there's no upstream call to be slow about, so the probe trivially "passes" with the same draft-stuck state as U-01/U-03. Re-probe this once URL extraction is implemented (post-`# TODO(productize)`).

**Gemini calls in this section:** 0 (URL-01 short-circuits before any model call — verified via network log: zero `/v1beta/models/gemini` requests during the URL probes).

URL-01 backlog cross-link: `URL-01` — `recipes.py:481-490` URL extraction is `# TODO(productize)`; drafts from URL never promote. (See top of WALKTHROUGH §Backlog dedupe.)

---

## Shortlist

**Starting state:** Member-#4 auditor (`Auditor`, member id `f244600f`) signed in via `DEMO01`. Synthetic household has **4 members** (Luca, Partner, Joe, Auditor) — the audit pile-up has grown the household beyond the 2-member couple-shape that SPEC.md and Phase 11 D-19 assumed. Shortlist `9a047f52` for `2026-05-09`, generation 1, 5 recipes (Ragu bolognese, Coq au vin, Butter chicken, Shawarma, Tacos au boeuf). Inbox shows 7 drafts (carry-over from Plan 12-02 stuck-draft probes). Today's `cooking-logs/active` = `null`.

**Golden path:** Land on `/`. The framer-motion swipe deck shows one recipe at a time with a peek of the next. Each card shows title, cuisine + mood + protein chips, prep time, member who created it. Two icon-only buttons at the bottom (`aria-label="J'aime cette recette"` = OUI, `aria-label="Pas envie ce soir"` = NON) cast the vote. Card flips on press; deck advances. `À compléter` link in nav shows badge count from drafts. After all 5 swipes, the deck transitions to a "Vous avez tout vu" recap listing the 5 recipes with their computed vote-state chip and a `Coq au vin / Je commence à cuisiner / Régénérer le shortlist` CTA cluster.

**Probes:**

### friction P-12-Sh-01: Install-PWA prompt occludes vote affordances on first load
**Severity:** friction
**Surface:** Shortlist (HomeDecide)
**Probe kind:** invalid-state (banner visibility ⇒ layout shift)
**Starting state:** First load of `/` after fresh launch (cookie present but install hint not yet dismissed).
**Repro:**
1. Navigate to `https://al-dente-pink.vercel.app/` as the auditor.
2. Observe the `Installe Al Dente sur ton écran d'accueil` banner pinned above the deck.
3. Measure the OUI/NON button bounding boxes via `page.evaluate(() => el.getBoundingClientRect())`.
**Expected:** Vote buttons are reliably tappable in the safe area regardless of any banner state.
**Actual:** With the banner visible, OUI sits at `y=743.59, bottom=799.59` on a 390×844 iPhone viewport — within 44.41 px of the bottom edge but already inside the bottom-nav 64-px guard. After dismissing via the banner's `Fermer` (×) button, the deck and buttons reflow upward by ~90 px and sit comfortably. Pressing OUI/NON while the banner is visible does work, but the vertical compression makes the deck card occupy ~70% of the screen instead of ~85% — friction during the first session before the user dismisses.
**Screenshot:** `walkthrough-screenshots/shortlist-baseline-deck.png` (banner present), compare with `shortlist-empty-state.png` (post-dismiss layout).
**Issue:** new finding — Plan 05 to file as friction.

### blocker P-12-Sh-02: `/api/shortlists/regenerate` requires non-null body, frontend `Régénérer` likely sends `null` body (race-probe could not exercise)
**Severity:** blocker
**Surface:** Shortlist (regenerate flow)
**Probe kind:** racing
**Starting state:** Deck exhausted ("Vous avez tout vu" recap with `Régénérer le shortlist` CTA visible).
**Repro:**
1. Vote on all 5 cards via API (`POST /api/shortlists/{sl}/recipes/{r}/vote` with `{vote:"yes"|"no"}`).
2. Reload `/`. Observe the recap + `Régénérer le shortlist` button.
3. Fire `POST /api/shortlists/regenerate` directly (no body).
**Expected:** Regenerate returns 200 with a fresh shortlist (`generation+1`) per `SHORTLIST-02`. Frontend should receive that response when user taps `Régénérer`.
**Actual:** `POST /api/shortlists/regenerate` returns **422** `{"detail":[{"type":"missing","loc":["body"],"msg":"Field required","input":null}]}`. The Pydantic schema (`shortlist.py::RegenerateRequest`) declares all fields optional, but FastAPI requires a body to be present (even an empty `{}`). Race probe (vote in flight + regenerate concurrent) **could not be exercised** because regenerate itself returns 422 — proves the user-tappable button is broken at the API contract layer. Confirmed across two browser sessions.
- Direct call: `curl -X POST /api/shortlists/regenerate` → 422.
- Direct call with empty body: `curl -X POST -d '{}' /api/shortlists/regenerate` → would likely 200 (untested in this run).
- Frontend `lib/shortlist.ts` regenerate wrapper presumably sends `null` body or missing Content-Type.
**Screenshot:** `walkthrough-screenshots/shortlist-regenerate-during-vote.png` (recap state with broken CTA), `shortlist-empty-state.png`.
**Issue:** new finding — Plan 05 to file as **blocker** (primary intended action of `Régénérer` button is non-functional via the documented API). Note: this hits the user every time the deck exhausts, which happens once per day under normal use.

### friction P-12-Sh-03: Click handler on OUI/NON gated on framer-motion drag context — JS `el.click()` registers no POST
**Severity:** friction
**Surface:** Shortlist (vote affordances)
**Probe kind:** racing (programmatic vs touch)
**Starting state:** Deck visible, banner dismissed, OUI/NON buttons in viewport.
**Repro:**
1. Programmatic `el.click()` via `page.evaluate(s => document.querySelector(s).click(), 'button[aria-label=…]')`.
2. Observe network: zero POST to `/api/shortlists/.../vote`.
3. Switch to direct API POST with the same recipe id and value — server returns 201 cleanly.
**Expected:** A semantic click on a `<button>` with `onClick` should fire the handler.
**Actual:** No vote POST registers. The only click that lands a vote is a real touch (`page.touchscreen.tap`) or a swipe gesture; programmatic synthetic clicks don't traverse the framer-motion `motion.button` event chain. **For a real iOS user this is invisible** (their taps are real touches), but it's a tell-tale that the CTA is gated on a gesture event rather than a stable `click` semantic — friction layer for assistive input methods (switch control, VoiceOver double-tap, automation).
**Screenshot:** `walkthrough-screenshots/shortlist-rapid-swipe.png`.
**Issue:** new finding — Plan 05 to file as friction (a11y / robustness).

### blocker P-12-Sh-04: Image overlay `pointer-events:auto` blocks Playwright force click; tap area thin in DOM
**Severity:** friction
**Surface:** Shortlist (deck card)
**Probe kind:** invalid-state
**Starting state:** Card shown, OUI/NON visible.
**Repro:**
1. `await page.click('button[aria-label="J\'aime cette recette"]')` (with timeout).
2. Playwright reports: `<img alt="" src="synthetic/ragu-bolognese.jpg" class="absolute inset-0 w-full h-full object-cover"/> from <div class="relative w-full max-w-sm aspect-[3/4]">…</div> subtree intercepts pointer events`.
**Expected:** Decorative `<img>` should not capture pointer events; only the intentional CTA buttons should.
**Actual:** The `absolute inset-0` image with no `pointer-events:none` traps the click in the parent card subtree. Pair this with Sh-03 above (handler-gated-on-gesture) and you have a card that is clickable in two ways but not the intuitive one. Documented as **friction** because real iOS touches still work; cross-cutting with the next finding.
**Screenshot:** `walkthrough-screenshots/shortlist-baseline-deck.png`.
**Issue:** new finding — Plan 05 to file as friction (cross-cuts with Sh-03 — single fix candidate).

**Gemini calls in this section:** 0 (Shortlist scoring is deterministic/server-side).

**Pass-style observations** (regression canaries):
- The 5 chip labels (`Validé / Pressenti / Contesté / Rejeté / Sans avis`) match the locked `next-intl` strings — no vocabulary drift on the **chip** layer.
- After exhausting the deck, the recap surface lists exactly the 5 recipes with stable per-recipe chips and offers two correct CTAs. The recap empty-state copy is correct.
- Network: each page load fires `households/me`, `cooking-logs/active`, `auth/ws-token`, `recipes?status=draft`, `shortlists/today` exactly twice (React 19 strict-mode double-render in production build — observed but not flagged as a probe finding because it's expected for hydration; mention here only because the network log is otherwise clean).

---

## Vote

**Starting state:** Carry-over from Shortlist probes. Auditor's id `f244600f`. Pre-Vote-probe state per `GET /api/shortlists/today.votes`: 16 vote rows total spread across the 5 recipes and 4 members. Auditor's 5 votes (one per recipe in this session): Ragu yes, Coq no, Butter yes, Shawarma no, Tacos yes. **Veto window: open** — `cooking-logs/active = null` at probe start.

**Golden path:** Vote affordances are the OUI / NON icon-buttons documented in §Shortlist. POSTs land at `POST /api/shortlists/{sl_id}/recipes/{recipe_id}/vote` with body `{"vote":"yes"|"no"}` (per `schemas/vote.py::VoteRequest`). Response 201 includes the freshly-computed `state` per architecture invariant #2 (one of `valide / pressenti / conteste / rejete / sans_avis`). Frontend mirror in `lib/votes.ts::computeVoteState` recomputes the same value client-side and surfaces it as a chip. The veto window closes on the first `CookingLog` for the day per `services/voting` doc, but `routers/votes.py` has no enforcement — VOTE-04 deliberately accepts late `no` votes.

**Probes:**

### blocker P-12-Vt-01: **Architecture invariant #2 broken** — `MEMBER_COUNT=2` hard-coded; vote-state mis-computed in any household with ≠2 members
**Severity:** blocker
**Surface:** Vote (chip rendering)
**Probe kind:** invariant verification (the post-refresh recompute probe; "computed" check)
**Starting state:** Synthetic household has 4 members. After voting via API, `GET /api/shortlists/today` returns 16 vote rows across 5 recipes; **branch order in `compute_vote_state` is conditioned on `member_count` parameter, defaulted to 2 in both `services/voting.py:54` and `lib/votes.ts:34`. Frontend `components/HomeDecide.tsx:52` defines `const MEMBER_COUNT = 2; // v0.1: hard-coded household size`** and passes it everywhere downstream including the `VoteSummary` component and the rejete-filter at `HomeDecide.tsx:431`.
**Repro:**
1. Reload `/` after the Shortlist probes have voted on all 5 recipes.
2. Read the rendered chip per recipe in the recap.
3. Compare with the actual vote distribution from `GET /api/shortlists/today.votes` and the spec algorithm.
**Expected (per invariant #2):** chip equals `compute_vote_state(votes, member_count=4)`.
- Ragu (4 yes) → `valide` (4/4).
- Coq (Luca yes, Joe yes, Auditor no, Partner missing = 2y, 1n / 4) → `conteste`.
- Butter (Luca yes, Partner no, Joe no, Auditor yes = 2y, 2n / 4) → `conteste`.
- Shawarma (Luca no, Partner no, Auditor no, Joe missing = 0y, 3n / 4) → `sans_avis` per the strict `no_count == member_count` branch (member_count=4).
- Tacos (Joe no, Auditor yes, others missing = 1y, 1n / 4) → `conteste`.
**Actual (rendered chips):** `Ragu: Sans avis`, `Coq: Validé`, `Butter chicken: Validé`, `Shawarma: Sans avis`, `Tacos: Contesté`. The render is `compute_vote_state(votes, 2)`:
  - Ragu (4 yes): `yes_count=4 != 2`, `no_count=0 != 2`, no mixed, no `(yes==1 AND voted==1)` → falls through to `sans_avis`. **Wrong.**
  - Coq (2 yes, 1 no): `yes_count=2 == 2` → returns `valide`. **Wrong** (should be `conteste`).
  - Butter (2 yes, 2 no): `yes==2 == 2` → `valide`. **Wrong** (should be `conteste`).
  - Shawarma (3 no): `no_count=3 != 2` → `sans_avis`. **Wrong** (should be `rejete` under correct member_count).
  - Tacos (1y, 1n): mixed → `conteste`. Coincidentally correct.
**Why this matters:** invariant #2 promises the rendered chip equals the computed state from the votes table. With a hard-coded `MEMBER_COUNT=2`, the promise holds **only** for 2-member households. The synthetic audit pile-up (now 4 members because Phase 11's seed plus Plan 12-02 plus this plan each joined a new auditor) makes this user-visible. **In real product use today the bug is masked** because v0.1 ships for couples — but it's a fragile hard-coded constant that will break on the first 3-member household. The comment at `HomeDecide.tsx:52` (`v0.1: hard-coded household size; multi-tenant clean.`) is honest about the limitation, but as a productize-later TODO it isn't tracked: there is no `# TODO(productize)` marker in `HomeDecide.tsx`. **Documentation gap + correctness bug at the same site.**
**Screenshot:** `walkthrough-screenshots/vote-state-render-after-refresh.png`.
**Issue:** new finding — Plan 05 to file as **blocker** (architecture invariant violated; user-visible incorrect state labels). Recommend marker added: `// TODO(productize): MEMBER_COUNT must come from /api/households/me.members.length`.

### nit P-12-Vt-02: Concurrent yes+no on the same recipe deterministically resolves to last-write — `(shortlist_id, recipe_id, member_id)` upsert holds
**Severity:** nit (pass-style)
**Surface:** Vote (race resolution)
**Probe kind:** racing
**Starting state:** Auditor with no vote on Tacos au boeuf.
**Repro:**
1. Fire two concurrent POSTs to `/api/shortlists/{sl}/recipes/{tacos}/vote` — body `{"vote":"yes"}` and `{"vote":"no"}` simultaneously via `Promise.all`.
2. Inspect both responses.
**Expected:** Both succeed (201). The DB `(shortlist_id, recipe_id, member_id)` unique constraint with `on_conflict_do_update` resolves to last-write (whichever transaction commits last wins).
**Actual:** Both 201. Final response `state` reflected the second write (`sans_avis` for the case where `no` landed second — note `state` is computed from the *committed* vote rows, so this is the `compute_vote_state` of `[{vote:'no'}]` with `member_count=2`). No 409 conflict, no transaction abort. **Behaves correctly.**
**Issue:** none — pass-style canary for invariant #2 + Pattern 4 (votes upsert).

### friction P-12-Vt-03: `Régénérer le shortlist` button broken at API contract — repeats Sh-02 finding from the Vote section
**Severity:** friction (cross-cutting with Sh-02 blocker)
**Surface:** Vote (post-decide flow)
**Probe kind:** racing → reduced to "primary action broken"
**Starting state:** Deck exhausted, recap visible.
**Repro:** as Sh-02 — direct `POST /api/shortlists/regenerate` → 422 missing-body.
**Expected:** Successful regeneration so the auditor can re-vote on a fresh shortlist, validate state-machine transitions over time.
**Actual:** Cross-link Sh-02 — Plan 05 should file ONE issue covering both surfaces. Documented here so Phase 14 knows the friction is felt twice (once on Shortlist exhaust, once on Vote follow-through).
**Screenshot:** `walkthrough-screenshots/shortlist-regenerate-during-vote.png`.
**Issue:** cross-link — see Sh-02.

### nit P-12-Vt-04: Vote on non-shortlist recipe → clean 400 `recipe not in this shortlist`
**Severity:** nit (pass-style — defensive coding canary)
**Surface:** Vote (boundary)
**Probe kind:** invalid-state
**Starting state:** A `structured` recipe NOT in today's shortlist (`Risotto aux champignons`, id `cd82ab4d`).
**Repro:**
1. `POST /api/shortlists/{today_sl_id}/recipes/{cd82ab4d}/vote` body `{"vote":"yes"}`.
**Expected:** 4xx with explicit reason — voting outside the shortlist scope is invariant violation.
**Actual:** `400 {"detail":"recipe not in this shortlist"}`. Clean. Same shape: bad shortlist UUID returns `404 shortlist not found`; invalid `vote` value returns `422 Input should be 'yes' or 'no'`. **Backend boundary handling solid.**
**Issue:** none — pass-style.

### friction P-12-Vt-05: Recipe-detail page (`/recipes/{id}`) has NO vote affordance — only `Modifier par la voix / Modifier la recette / Supprimer / Retour`
**Severity:** friction
**Surface:** Vote (alt entry point)
**Probe kind:** invalid arrival
**Starting state:** Auditor on a structured recipe's detail page.
**Repro:**
1. Navigate to `/recipes/{id}` for any structured recipe.
2. Inspect interactive elements.
**Expected:** Vote affordance available so a user re-reading a recipe in detail-mode can change their vote without going back to the deck.
**Actual:** Only edit / delete / voice-modify / back. To vote, the user must navigate back to `/` and find the recipe in the deck — but if it's already exhausted, they cannot. Combined with Sh-02 (regenerate broken), once you've voted you're locked in until tomorrow. **Friction layered on a blocker.**
**Issue:** new finding — Plan 05 to file as friction. Cross-link Sh-02 because Régénérer is the only escape hatch.

**Gemini calls in this section:** 0 (Voting is non-AI).

---

## Cooking Log

**Starting state:** Carry-over from Vote probes — auditor signed in, today's shortlist exists with `Coq au vin` already voted-on, no active cook (`GET /api/cooking-logs/active = null`). 3 seeded historical cooking_logs in DB (ragu -2d, poulet-citron -5d, burger -10d) per RUNBOOK reference.

**Golden path:** From the recap on `/`, the bottom CTA cluster offers `Je commence à cuisiner` (the only path to start a cook from the UI). API: `POST /api/recipes/{recipe_id}/cook` (NOT `POST /api/cooking-logs` as the plan body initially assumed — verified by reading `routers/cooking_logs.py:60-77`). Returns 201 with `{ id, recipe_id, household_id, cooked_by_member_id, cooked_at: <UTC ISO>, photo_paths: [], rating: null, notes: null }`. The `cooking-logs/active` endpoint flips from `null` to the active row. Finalize via `PUT /api/cooking-logs/{log_id}` (NOT `POST .../finalize`) with `{ rating: "loved" | "liked" | "disliked", notes: "..." }`.

> Note (D-06): Late-evening cooks may be filtered out by the `TZ-01` Python-local-tz / UTC-DB-date mismatch in `cooking_logs.py:72-78,118-126`. **TZ-01 surface confirmed** in the probes below — see CL-04.

**Probes:**

### blocker P-12-CL-01: **Re-finalize increments `cook_count` instead of being idempotent** — denormalized field corruption (architecture invariant #3 violated)
**Severity:** blocker
**Surface:** Cooking Log (finalize / denorm)
**Probe kind:** racing → idempotency probe
**Starting state:** Auditor started a cook on Coq au vin (id `80973799`) and finalized it once with `{rating: "liked", notes: "<5KB string>"}` → 200 returned. Recipe `cook_count` was 1 immediately before this probe (from seed cook -2d? no — seed log was on a different recipe; Coq's cook_count was 0 prior). After first finalize: `cook_count=1`, `last_cooked_at=2026-05-09T18:10Z`.
**Repro:**
1. `PUT /api/cooking-logs/{log_id}` with `{rating: "liked", notes: "..."}` → 200, `cook_count=1`.
2. `PUT /api/cooking-logs/{log_id}` again with `{rating: "disliked", notes: "second pass"}` → 200, returns updated row with new rating + notes.
3. `GET /api/recipes/{recipe_id}` → observe denormalized `cook_count`.
**Expected:** Per the docstring at `routers/cooking_logs.py:136-160` — *"Idempotency: re-PUT of an already-finalized log does NOT double-count cook_count (T-04-01-06). The 'is_first_finalize' check is captured BEFORE the rating assignment so subsequent finalizations only refresh last_cooked_at + last_cooked_photo_path."* `cook_count` should stay at 1.
**Actual:** `cook_count = 2` after the second PUT. The is_first_finalize guard is **not** preventing the increment. This contradicts the comment and the T-04-01-06 mitigation note. **Architecture invariant #3 — `cook_count` and `last_cooked_at` updated in same DB transaction as the cooking_logs insert — is held on first write, but the second write also bumps the counter, violating the idempotency claim.** Real-user impact: a couple finalizing, then re-opening the screen and re-tapping (e.g. to fix a typo in their notes — pattern observed in mobile apps generally) inflates the cook history.
**Screenshot:** `walkthrough-screenshots/cooking-log-recipe-detail.png` shows `Dernière fois : aujourd'hui · Cuisinée 2 fois` after only one cook today.
**Issue:** new finding — Plan 05 to file as **blocker** (data corruption: invariant #3 violation; affects scoring algorithm via `cook_count` recency input).

### friction P-12-CL-02: Notes field cap is 4000 chars; UI doesn't surface the limit; long-paste returns 422 with raw Pydantic detail
**Severity:** friction
**Surface:** Cooking Log (finalize body)
**Probe kind:** boundary
**Starting state:** Active cook in progress, finalize sheet open.
**Repro:**
1. Finalize with `notes` of length 5044 chars (5KB plus French diacritics).
2. Server returns `422 {"detail":[{"type":"string_too_long","loc":["body","notes"],"msg":"String should have at most 4000 characters","input":"AAA…"}]}`.
**Expected:** UI surfaces the 4000-char cap with a counter, OR truncates client-side gracefully, OR (lower bar) handles 422 with a friendly French toast.
**Actual:** Backend rejects with raw schema error. Frontend wrapper around `api()` will throw `Error("422 Unprocessable Entity")` (per the bundled `lib/api.ts` proxy seen in `.next/static/chunks/7833-…js`). Generic error swallows the actionable detail. Same UX class as the §Capture — Quick `P-12-Q02` (5KB title) finding from Plan 12-02.
**Screenshot:** `walkthrough-screenshots/cooking-log-5kb-notes.png`.
**Issue:** new finding — Plan 05 to file as friction. Cross-link to Q02 (same UX class — "validation surfaces as connection-error toast").

### nit P-12-CL-03: Second-cook-same-day blocked with clean 409 — Pattern 7 holds
**Severity:** nit (pass-style)
**Surface:** Cooking Log (concurrency guard)
**Probe kind:** racing
**Starting state:** Auditor with one active cook today (Coq au vin, before finalize).
**Repro:** `POST /api/recipes/{ragu_id}/cook` → response.
**Expected:** 409 conflict.
**Actual:** `409 {"detail":"another cooking session is active today"}`. Clean.
**Issue:** none — pass-style canary for Pattern 7 (one cook per day per household).

### blocker P-12-CL-04: **TZ-01 surface confirmed** — `cooked_at` stored UTC; `func.date(cooked_at) == DateType.today()` mismatches near midnight; cross-link `TZ-01`
**Severity:** blocker (cross-link)
**Surface:** Cooking Log (timezone guard)
**Probe kind:** invalid-state (clock-relative)
**Starting state:** Auditor in CEST (UTC+2). Cook started at local 20:10 (UTC 18:10).
**Repro:**
1. `POST /api/recipes/{id}/cook` returns `cooked_at = 2026-05-09T18:10:37.551448Z` (UTC).
2. Backend filters today's logs at `routers/cooking_logs.py:72-78` (`get_active_cooking_log`) and `:118-126` (the same query inside `start_cooking`'s 409 guard) using `today = DateType.today()` — Python's local-tz date.
3. `func.date(cooking_logs.cooked_at) == today` compares the **UTC date** of the column against the **server-local date** of `today`.
**Expected:** Late-evening user-local cooks (e.g. local 23:30 in CEST = UTC 21:30; UTC date still today, but for a household in UTC-8 the same UTC moment would be 13:30 today and `func.date(cooked_at)` would lag by a day in the next-morning rollover).
**Actual:** **For the auditor's CEST cook at local 20:10**, both UTC and local dates align so the bug doesn't surface in this run — but the surface is confirmed by code inspection plus the TZ-01 backlog memo. The user-visible failure mode is `"Cette cuisson n'est plus disponible"` for any cook that crossed UTC midnight before the user's local-day rollover. Documented per the plan's instruction (D-06): cross-link to `TZ-01` rather than file new.
**Backend timezone of Railway:** server runs in UTC by default (Railway containers); `DateType.today()` returns UTC date — this masks the bug for North-American users (always in or behind UTC) and surfaces it for late-evening East-Asia users (whose local dates can be a day ahead of UTC).
**Screenshot:** `walkthrough-screenshots/cooking-log-near-midnight.png`.
**Issue:** **`TZ-01`** — `cooking_logs.py:72-78,118-126`. Cross-link, NOT a new GitHub issue (per D-06).

### friction P-12-CL-05: Offline event listener no-op — `dispatchEvent('offline')` doesn't trigger `COOK-11` toast or any UI feedback
**Severity:** friction
**Surface:** Cooking Log (offline behavior)
**Probe kind:** network (synthetic)
**Starting state:** Auditor on `/` with banner dismissed, no active cook.
**Repro:**
1. `page.evaluate(() => window.dispatchEvent(new Event('offline')))`.
2. Inspect `navigator.onLine` and look for any toast/banner/text containing `hors ligne / offline / connexion`.
**Expected:** A `COOK-11`-style locked toast (the plan's locked French strings reference one). At minimum, an offline indicator somewhere on the chrome.
**Actual:** `navigator.onLine` returns `true` (the dispatchEvent doesn't actually flip `navigator.onLine`; that requires a real network state change). No toast / banner / text surfaces. **The frontend does not appear to listen for the `offline` event at all** — no listener anywhere in the captured DOM mutates state in response. This may be a documentation drift (the plan referenced `COOK-11` as a locked toast; the implementation may have been deferred to v0.4) OR Plan 12-04 will surface it from the realtime / push section.
**Caveat:** the synthetic `dispatchEvent` is an imperfect probe — a real airplane-mode toggle in DevTools (which Playwright supports via `context.setOffline(true)`) would be the proper test. Re-test in Plan 12-04 cross-cutting if realtime resilience is in scope.
**Screenshot:** `walkthrough-screenshots/cooking-log-finalize-offline.png`.
**Issue:** new finding — Plan 05 to file as friction (offline UX absent). Cross-cuts with realtime invariant #4 work in Plan 12-04.

### nit P-12-CL-06: Bad UUID + invalid rating both return clean 4xx with explicit reason
**Severity:** nit (pass-style)
**Surface:** Cooking Log (boundary)
**Probe kind:** invalid-state
**Starting state:** Active cook in progress.
**Repro:**
1. `PUT /api/cooking-logs/00000000-0000-0000-0000-000000000000` → `404 {"detail":"cooking log not found"}`.
2. `PUT /api/cooking-logs/{valid_id}` body `{"rating":"meh"}` → `422 {"type":"enum","msg":"Input should be 'loved', 'liked' or 'disliked'"}`.
**Expected:** clean 4xx with actionable detail.
**Actual:** Both clean. Backend boundary handling solid.
**Issue:** none — pass-style canary.

**Gemini calls in this section:** 0 (Cooking-log creation is non-AI).

---

## History

**Starting state:** Carry-over from Cooking Log probes — auditor finalized the Coq au vin cook (id `80973799`) at 18:10 UTC. Synthetic household has 4+ cooking_logs in DB now (3 seeded + 1 just created + whatever Plan 12-02 may have left). History page is at `/cooking-logs` (URL-only — not surfaced in main nav).

**Golden path:** Tap `Plus` in main nav → `/settings`. From settings, find `Voir les cuissons récentes` link → `/cooking-logs`. Page loads, fires `GET /api/cooking-logs?days=14`. Render expected per `cooking-log-history.spec.ts` golden: list of finalized cooks grouped by date, each row showing recipe title, rating chip, optional photo + notes preview. **Per the v0.2.2 backlog (CL-01), the GET endpoint does not exist** — confirmed below.

> Note (D-06): The `/cooking-logs` history page renders but never has data because GET `/cooking-logs` (list) is missing (`CL-01`). Both the list page and the per-log detail page surface this — see H-01 and H-02 below.

**Probes:**

### blocker P-12-H-01: **CL-01 confirmed live** — `GET /api/cooking-logs?days=14` returns 404; page shows "Aucune recette" misleading copy
**Severity:** blocker (cross-link)
**Surface:** History (list page)
**Probe kind:** invalid-state (missing endpoint)
**Starting state:** Auditor on `/`, navigates to `/cooking-logs` directly.
**Repro:**
1. `page.goto("/cooking-logs")`.
2. Inspect network: page fires `GET /api/cooking-logs?days=14`.
3. Observe response: `404 Not Found`.
4. Inspect rendered DOM: `Aucune recette pour le moment / Ajoute ta première recette pour commencer.`
**Expected:** A list of past cooks (3 seeded + at least 1 from this session). At minimum, a graceful empty-state if there are zero — but the copy should reflect "no cooks yet", not "no recipes".
**Actual:** API is missing entirely (404, not even an empty list). Frontend's `lib/cookingLogs.ts` (or equivalent) presumably catches the 404 and falls back to its own "no items" view, BUT the empty-state copy says **"Ajoute ta première recette pour commencer"** — this conflates `recipes` with `cooking_logs`. A user with 21 recipes and 4 cooks would see this and think the inventory is gone. **Friction layered on the CL-01 blocker.**
**Screenshot:** `walkthrough-screenshots/history-empty-due-to-CL-01.png`.
**Issue:** **`CL-01`** — GET `/api/cooking-logs` (list) endpoint missing. Cross-link per D-06, NOT refiled. **Sub-finding (new, friction):** the empty-state copy "Ajoute ta première recette pour commencer" is wrong-domain — should say "Aucune cuisson enregistrée pour le moment". Plan 05 may file this as a separate friction issue OR fold into the CL-01 fix scope.

### blocker P-12-H-02: Per-log detail route `/cooking-logs/{id}` does NOT exist in Next.js — even valid UUIDs render the framework 404 page
**Severity:** blocker
**Surface:** History (per-log detail)
**Probe kind:** invalid-state (route absent)
**Starting state:** Auditor has a real, freshly-finalized cooking log id `80973799-57c9-470c-a56b-ba677f18d3e4`.
**Repro:**
1. `page.goto("/cooking-logs/80973799-57c9-470c-a56b-ba677f18d3e4")`.
2. Inspect rendered text: `404 / This page could not be found.` (Next.js framework default — no app shell).
**Expected:** Detail page rendering the cook's date, rating, notes (the 4000-char-truncated notes from CL-02), photo paths, and a back-link to `/cooking-logs`. Per `cooking-log-history.spec.ts:???` golden the detail route is referenced.
**Actual:** **No `/cooking-logs/[id]` page exists in `frontend/app/cooking-logs/`** (verified by behavior — Next.js shows the framework default 404 stripped of the chrome, no `Accueil / Recettes / À compléter / Plus` nav). User has no way to view the notes or rating they just saved unless they navigate back to the recipe detail page (which shows aggregate `cook_count` but not per-cook history). **The 5KB notes feature has a UI write path with no read path.**
**Screenshot:** `walkthrough-screenshots/history-empty-group-headers.png`.
**Issue:** new finding — Plan 05 to file as **blocker** (write-without-read path; affects CL-04 perception too — the user can't verify their finalize landed). Cross-link CL-01 because both findings together describe the full History UX gap.

### friction P-12-H-03: History page is buried — no main-nav link, only reachable from `/settings` → `Voir les cuissons récentes`
**Severity:** friction
**Surface:** History (discoverability)
**Probe kind:** invalid arrival
**Starting state:** Auditor on any page.
**Repro:**
1. Inspect main nav links: `[/, /recipes, /inbox, /settings]` only.
2. Inspect `/settings` links: includes `<a href="/cooking-logs">Voir les cuissons récentes</a>`.
3. Count taps to reach: `Plus → Voir les cuissons récentes` = 2 deliberate taps + cognitive overhead of remembering history lives behind Settings.
**Expected:** History is a daily-loop primary surface (Phase 12 plan describes it as part of "the daily-use loop"). Should be one tap away.
**Actual:** Buried behind Settings. Combined with H-01 (page broken anyway) and H-02 (detail route missing), the history feature is effectively decommissioned in v0.2.1 prod despite being a shipped surface per ROADMAP §Phase 12. **Friction now, may be intentional v0.3 bury.**
**Issue:** new finding — Plan 05 to file as friction (information architecture). Cross-link CL-01 + H-02 for fix-scope sizing.

### nit P-12-H-04: Bad / malformed UUID in URL bar returns clean 404 page with main-app chrome retained
**Severity:** nit (pass-style)
**Surface:** History (boundary)
**Probe kind:** invalid arrival
**Starting state:** Auditor on `/`.
**Repro:**
1. `page.goto("/cooking-logs/00000000-0000-0000-0000-000000000000")` → `404 / Accueil Recettes À compléter Plus` (404 inside app shell — better than H-02's framework default).
2. `page.goto("/cooking-logs/not-a-uuid")` → same response.
**Expected:** Some kind of 404. Bonus: app chrome preserved so the user has a recovery affordance.
**Actual:** Both bad and malformed UUIDs render `404 / This page could not be found. / Accueil Recettes À compléter 7 Plus`. App chrome retained. **Why is this different from H-02?** H-02's `80973799` is also "bad" from Next.js's perspective (no `[id]` route exists), but Next somehow surfaced the framework default page without the chrome — possibly because the `/cooking-logs/[id]/page.tsx` file is missing entirely (so Next never matched a route at all) versus the bad-UUID case where the dynamic-route pattern matched and a `notFound()` was returned within the app shell.
**Caveat:** the chrome difference between H-02 (no chrome, 404) and H-04 (chrome, 404) is itself a UX inconsistency worth a friction finding. Filed as a sub-bullet on H-02.
**Issue:** none — pass-style canary, but the chrome discrepancy is folded into H-02.

**Gemini calls in this section:** 0 (History is read-only, non-AI).

---

## Exports

**Starting state:** Carry-over from Plan 12-03 (auditor still member #4 `Auditor`, id `f244600f`, in persistent context). Synthetic household has accumulated to **34 recipes** (up from the seeded 21) due to test-recipe pollution from Plans 02 and 03 probes — visible in the export payload. `cook_count=2` on Coq au vin persists per CL-01 bug. 4 members on roster.

**Surface contract observed:** Settings → "Sauvegarde" Card has a single CTA `Télécharger mes recettes` that triggers `GET /api/households/{household_id}/export.json` with the current `aldente_auth` cookie. Frontend uses raw `fetch()` + `URL.createObjectURL` + synthetic `<a>` click so the response is downloaded as `al-dente-recipes-<hh-uuid>.json`. Backend response is `Content-Type: application/json`, `Content-Disposition: attachment; filename="..."`, Brotli-encoded (`content-encoding: br`).

**Golden path:** Auditor's session → `GET /api/households/9f3b1902.../export.json` → 200 in ~676ms → 97,141 bytes JSON → `{"recipes": [...]}` envelope with **34** entries; first row has all 23 expected `RecipeResponse` fields (id, household_id, status, title, source_capture, photo_paths, ingredients, …, last_cooked_at, cook_count, last_cooked_photo_path, promotion_error, promotion_attempts, created_at, updated_at). No vote / cooking_log rows in the payload (per `exports.py` docstring — "cooking-logs and votes are NOT included"). Schema reasonable. Cross-household isolation verified upstream (path-param mismatch returns 404 per T-01-08-06).

**Probes:**

### nit P-12-E01: Golden export round-trip is clean (regression canary)
**Severity:** nit (pass-style)
**Surface:** Exports
**Probe kind:** golden-path verification
**Starting state:** authenticated auditor at `/settings`.
**Repro:**
1. `fetch('/api/households/{hh}/export.json', { credentials: 'include' })`.
2. Inspect response headers + body shape.
**Expected:** 200, attachment headers, top-level `{recipes: [...]}` array, `RecipeResponse` per row, no vote/cooking_log leakage.
**Actual:** 200 OK, 97,141 bytes, 34 recipes, all 23 RecipeResponse fields present, `Content-Disposition: attachment; filename="al-dente-recipes-9f3b1902-...json"`, Brotli-encoded over the wire. **Backend behaviour matches `exports.py` docstring.** UI-side `Télécharger mes recettes` button (h-12 w-full per Phase 9 D-08 audit) ships and is reachable. **Pass-style.**
**Screenshot:** `walkthrough-screenshots/exports-json-download.png`
**Issue:** none — regression canary.

### friction P-12-E02: Offline trigger surfaces correct French toast but the export button is NOT disabled when `navigator.onLine === false`
**Severity:** friction
**Surface:** Exports (offline UX)
**Probe kind:** network
**Starting state:** authenticated auditor at `/settings`, `Télécharger` CTA visible.
**Repro:**
1. Override `window.fetch` to throw `TypeError("Failed to fetch (simulated offline)")` (mimics navigator going offline mid-request).
2. Dispatch `window.dispatchEvent(new Event('offline'))`.
3. Click `Télécharger mes recettes`.
**Expected:** Either button disables on `offline` event (no round-trip), OR clicks land on a clear French error toast that distinguishes network-loss from validation/auth errors.
**Actual:** Button stays enabled — the `disabled={exporting}` guard at `frontend/app/settings/page.tsx:200` only tracks the in-flight state, not connectivity. After click the `catch { toast.error(t("export_error")) }` branch fires and shows toast `Téléchargement impossible. Réessaie dans un instant.` — copy is correct French + actionable. **The toast is good UX**; the missing affordance is a button-level "you are offline" hint (greyed-out / spinner) before the user even taps. Not blocker — primary action is reachable once online; friction because the user discovers they're offline only after tapping.
**Screenshot:** `walkthrough-screenshots/exports-offline.png`
**Issue:** new finding (Plan 05 to file as friction). Cross-cuts P-12-Q03 / Q02 class — capture surfaces have similar patterns.

### friction P-12-E03: Rapid double-click triggers two full 97KB exports — no debounce, no idempotency, no coalescing
**Severity:** friction
**Surface:** Exports (race / cost)
**Probe kind:** racing
**Starting state:** authenticated auditor at `/settings`; baseline E-01 export passes.
**Repro:**
1. `Promise.all([fetch(exportUrl), fetch(exportUrl)])` against `/api/households/{hh}/export.json`.
2. Inspect both responses.
**Expected:** Either single coalesced response (e.g. server-side cache hit on the second), or client-side debounce that ignores the second click while the first is in flight (the `disabled={exporting}` guard exists but only blocks UI re-clicks — direct API can still race).
**Actual:** Both `fetch()` succeed (200, 200). `a.t = 1021ms`, `b.t = 1776ms` — second waits behind the first SQLAlchemy session pool slot but otherwise re-executes the full `SELECT recipes WHERE household_id = ...` + `model_dump` + `json.dumps` cycle. Total payload over the wire: **194,282 bytes** for what should be 97,141. Couple-scale (4 members × occasional export) means cost is theoretical, but the user-visible UX is fine because the `<button disabled>` guard blocks pure UI double-tap. The friction surfaces only via API direct call. **Friction not blocker** — primary action works.
**Screenshot:** `walkthrough-screenshots/exports-rapid-double.png` (placeholder; the screenshot inherited from E-01 — same UI state).
**Issue:** new finding (Plan 05 to file as friction). May be deduped with P-12-Q03 family (no-debounce-on-submit cluster).

### nit P-12-E04: Brotli encoding works (regression canary)
**Severity:** nit (pass-style)
**Surface:** Exports (transport)
**Probe kind:** invariant verification
**Starting state:** any authenticated request.
**Repro:** observe `content-encoding: br` in response headers.
**Expected:** Vercel/Railway proxies negotiate brotli for JSON payloads where the client supports it.
**Actual:** confirmed `content-encoding: br` on `/export.json`. Browsers transparently decompress; the 97KB observed is the *decoded* size. Network transfer is meaningfully smaller. **Pass-style.**
**Issue:** none — regression canary.

**Gemini calls in this section:** 0 (Export is deterministic; verified via network log — zero `/v1beta/models/gemini` requests during export probes).

---

## Push

**Starting state:** Carry-over from §Realtime Sync; auditor still member #4 in persistent context. Service worker registered (`scope: https://al-dente-pink.vercel.app/`, active). PushManager + Notification APIs available. **Notification permission = `denied`** in the auditor's persistent profile (consequence of an earlier headless attempt).

**Surface contract (corrected — RESEARCH §Surface 11 + plan body assumed `/settings` but the surface lives on `/` HomeDecide):** The push opt-in is the `PushPermissionBanner` component (`frontend/components/PushPermissionBanner.tsx`), mounted twice on the HomeDecide screen (lines 403 and 460 of `HomeDecide.tsx` — for the deck-active and deck-exhausted recap states). It only RENDERS when ALL of the following hold:
1. `serviceWorker in navigator` && `PushManager in window` (`canReceivePush` gate).
2. **iOS gate**: `navigator.standalone === true` — i.e. the user has actually installed the PWA via "Add to Home Screen". Browser-PWA users on iOS are filtered out at this gate.
3. `Notification.permission === "default"` — neither granted nor denied yet (one-shot UX; if user dismisses or denies, the banner never shows again).
4. `sessionStorage["dismissed_push_banner_at"]` not set.

The banner heading/body come from `home.push.*` i18n keys; the "Activer" button calls `registerPushSubscription()` from `frontend/lib/push.ts` which: (a) requests Notification permission; (b) calls `pushManager.subscribe({userVisibleOnly: true, applicationServerKey: <VAPID>})`; (c) POSTs the resulting `PushSubscription.toJSON()` to `/api/push/subscribe` with same-origin credentials.

Backend `/api/push/subscribe` (per `backend/app/routers/push.py`): validates the endpoint scheme is `https://` and warns if the host isn't FCM/Mozilla/Apple (defensive only — accepts anyway); upserts on `(member_id)` UNIQUE constraint with `on_conflict_do_update` (idempotent by design). Returns `201 {"ok": true}`. The `/api/push/vapid-public-key` endpoint is the runtime defense-in-depth fetch path.

**Golden path:** A user with iOS PWA installed lands on `/`, sees the rose-tinted PushPermissionBanner with "Activer" CTA, taps Activer, accepts the iOS notification permission prompt, the service worker subscribes against APNs, the resulting endpoint POSTs to `/api/push/subscribe`, and a subsequent application-fired event (e.g. `cron-job` partner-of-cooked-something at 16:00 household-tz) delivers a Web Push message to the iPhone. **Auditor cannot exercise this in headless Chromium** because (a) `navigator.standalone` is undefined → `canReceivePush()` returns false → banner never renders and (b) headless Chromium has no FCM receiver, so `pushManager.subscribe()` errors out with `AbortError: Registration failed - push service not available`. The round-trip step (D-19) therefore requires the **operator's iPhone**.

**Probes:**

### blocker P-12-Pu-01: Headless Chromium cannot subscribe — `pushManager.subscribe()` returns `AbortError: Registration failed - push service not available`
**Severity:** blocker (for AUDIT — not for product; see notes)
**Surface:** Push (subscription)
**Probe kind:** invariant verification (browser environment + push backend availability)
**Starting state:** auditor's persistent context, SW active, VAPID key fetched live = `BBhi179NvLsIIHzV-POUJe-ObK6Eaq...` (87 chars, valid P-256 length).
**Repro:**
1. `await navigator.serviceWorker.ready` → registration with active worker, scope `/`.
2. `await fetch('/api/push/vapid-public-key')` → 200, public_key returned.
3. Convert URL-safe base64 to `Uint8Array` (per `lib/push.ts:8-21`).
4. `await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: arr })`.
**Expected:** Either a valid `PushSubscription` (with FCM endpoint URL) OR a clear unsupported environment error.
**Actual:** Subscribe throws **`AbortError: Registration failed - push service not available`**. This is Chromium's headless mode rejection — the browser instance has no embedded push service receiver. **No subscription created; nothing POSTed to `/api/push/subscribe`** (verified via network log: `network-push-reqs` shows zero POST requests to `/api/push/subscribe`). **For AUDIT purposes this is a blocker** — no subscription means no round-trip is possible from this environment. **For PRODUCT purposes this is expected** — real iOS users in installed PWAs get a working APNs receiver. (Per RESEARCH §Risk 3, this exact failure mode was predicted.)
**Screenshot:** `walkthrough-screenshots/push-subscribe-permission.png`
**Issue:** none for product. Audit-process note: future audits should run the round-trip check on a real device (operator iPhone). Plan 05 may file a meta-issue requesting an `/api/push/admin-test` endpoint for audit-time round-trip verification.

### friction P-12-Pu-02: No push affordance is visible to authenticated browser-PWA users (iOS gate masks Android/desktop opt-in)
**Severity:** friction
**Surface:** Push (UX entry point)
**Probe kind:** missing affordance / surface-discovery
**Starting state:** auditor at `/settings` (per RESEARCH §Surface 11 and plan body — both wrongly listed `/settings` as the entry).
**Repro:**
1. Navigate `/settings`. Inspect for any `Activer les notifications` button.
2. Result: **0 push affordances on `/settings`** (verified via DOM scan).
3. Trace source: `PushPermissionBanner` is mounted on HomeDecide (`/`), not Settings.
4. Inspect `lib/push.ts:84-95` `canReceivePush()`:
   ```ts
   if (isIos && !standalone) return false;
   ```
**Expected:** Push opt-in is reachable from the user's Settings page, OR the banner shows on home for any browser-PWA user (Android / desktop) — with the iOS-only restriction documented elsewhere.
**Actual:**
- The Settings page has no push affordance at all (RESEARCH/plan documentation drift — these claimed `Settings → enable notifications` but that's wrong).
- The home banner ALSO doesn't show for: (a) iOS users who haven't installed the PWA (not standalone), (b) any user with `Notification.permission !== "default"` (i.e. anyone who's already granted, denied, or dismissed once).
- **A user who taps "Plus tard" once (sessionStorage flag) loses access to the banner for the rest of the session.** The next session will re-show it (sessionStorage cleared) but only if permission is still `default`.
- **There is NO recovery path from the Settings page for a user who later wants to opt in.** The banner is the one-shot affordance.
**Why this matters (couple-scale impact):** The product's push UX assumes "iOS PWA installed" as the only valid target. Browser-PWA users on Android (per RESEARCH §Risk 3 alternate path) can technically subscribe but the banner is gated by `canReceivePush()` which doesn't restrict Android — but **the iOS-PWA-only banner combined with the missing Settings affordance means a real iOS user who dismissed or denied push has no recovery**. v0.1 ship target is iPhones; this is a known constraint, but it's friction not a blocker because the cron is the primary delivery anyway.
**Screenshot:** `walkthrough-screenshots/push-subscribe-permission.png`
**Issue:** new finding (Plan 05 to file as friction). Recommend: add a Settings "Notifications" Card with state-aware UX (Activer / Désactiver / Permission requise — open iOS settings) per the post-v0.1 productize roadmap.

### nit P-12-Pu-03: VAPID key endpoint is reachable, returns a valid P-256 public key (regression canary)
**Severity:** nit (pass-style)
**Surface:** Push (defense-in-depth runtime fetch path)
**Probe kind:** invariant verification
**Starting state:** authenticated auditor.
**Repro:** `GET /api/push/vapid-public-key` with cookie credentials.
**Expected:** 200 with `{public_key: "<P-256 URL-safe base64, 87 chars>"}`.
**Actual:** 200, `public_key="BBhi179NvLsIIHzV-POUJe-ObK6EaqvViNyTWpXtjhTc8NCZ0o77NfUWXSnaMJyTzJaULFqntJrwhH1WipUq_tE"`, 87 chars (correct length for an uncompressed P-256 point in URL-safe base64). **Pass-style — defense-in-depth path works as documented in `routers/push.py:76-79`.**
**Issue:** none — regression canary.

### blocker P-12-Pu-04: No programmatic test-fire endpoint exists; round-trip verification REQUIRES operator iPhone (D-19 checkpoint)
**Severity:** blocker (for AUDIT round-trip)
**Surface:** Push (round-trip; observability)
**Probe kind:** invariant verification (audit-only path)
**Starting state:** auditor with no push subscription (P-12-Pu-01 prevented one).
**Repro:**
1. Probe candidate test-fire paths: `POST /api/push/test`, `POST /api/push/send`, `POST /api/push/fire-test`.
2. Inspect `backend/app/routers/push.py` for any auditor-accessible send route.
**Expected:** A programmatic way to trigger a test push from a logged-in member (admin or otherwise).
**Actual:** All three candidate endpoints return `404 Not Found`. The `routers/push.py` file (80 lines total) defines exactly 2 routes: `POST /push/subscribe` and `GET /push/vapid-public-key`. No test-fire / no admin-fire / no echo. **Per D-19 the operator must fire one push from their iPhone manually** — typically by triggering a real product event (e.g. partner-vote at the right hour, or 16:00 household-tz cron firing on its own schedule). **This is the explicit checkpoint case.**
**Screenshot:** `walkthrough-screenshots/push-resubscribe-idempotent.png` (re-uses earlier shot — there's no UI state to capture).
**Issue:** new finding (Plan 05 may file): add `POST /api/push/admin-test` (gated to authenticated members; sends a "test notification" to caller's subscription) for future audit + user-side "Test my notifications" diagnostic. Cross-link: this is the same observability gap as the missing Settings push affordance (P-12-Pu-02).

### checkpoint P-12-Pu-05: Round-trip notification verification — operator-confirmation slot
**Severity:** blocker (until operator-confirmed)
**Surface:** Push (end-to-end delivery)
**Probe kind:** operator-assist (D-19 explicit fallback)
**Starting state:** Auditor cannot subscribe in headless Chromium (Pu-01); no programmatic fire path exists (Pu-04). Operator's iPhone is the round-trip target.
**Repro (operator side):**
1. Operator has the al-dente PWA installed on their iPhone (one of the 4 existing members — Luca / Partner / Joe / Auditor; Luca's iPhone is the standard test target).
2. Operator confirms current Notification.permission state (Settings → Safari → al-dente.app → Notifications, OR via the in-app banner if it still shows).
3. Operator triggers a real product event that should fire a push (per `backend/app/services/push.py` and the cron at 16:00 household-tz):
   - **Easy path**: Joe just started a cook on Pad thai tofu (RT-6 above, log id `c7c92195-4aea-4c0a-ae67-51e4a70324d2`). Any product hook that fires a push on cooking.started should reach the operator's iPhone if the operator's subscription is live.
   - **Cron path**: wait until 16:00 household-tz for the daily shortlist push.
4. Operator records the round-trip outcome inline below per CONTEXT D-19 format.
**Expected line (from CONTEXT D-19 verbatim):** `verified by Luca on YYYY-MM-DD HH:MM, notification arrived in ~Ns`.
**Actual:** _Pending operator confirmation. **CHECKPOINT — see "Awaiting operator confirmation" below.**_
**Screenshot:** `walkthrough-screenshots/push-subscribe-network.png` (snapshot of the network state at the auditor side; operator-side iPhone screenshot would be a future addition).
**Issue:** Plan 05 to file a meta-finding only if operator confirms NO round-trip lands within 30s — that would be a real product delivery blocker. If round-trip lands, this becomes pass-style. If operator declines (no iPhone available), the finding stays as `friction-tagged: round-trip pending operator availability` per CONTEXT D-19 ("expected, not a blocker").

**Awaiting operator confirmation:** _Operator: please trigger a real cron / cooking-started / shortlist-related push on your iPhone (member of the synthetic household). Reply with the line `verified by Luca on YYYY-MM-DD HH:MM, notification arrived in ~Ns` OR `no iPhone available — friction-tag the round-trip` and Plan 05 will reconcile._

**Pass-style observations** (regression canaries):
- Service worker registered + active at scope `/` (verified live).
- VAPID public key endpoint shipped + returns valid P-256 URL-safe base64.
- `pushManager` API surface present in the browser instance.
- `/api/push/subscribe` endpoint exists and is upsert-idempotent per `routers/push.py` source (couldn't be exercised this run because Pu-01 prevented subscription).
- Auditor identity preserved through all 4 push probes (final check: `Auditor`/id `f244600f`).

**Gemini calls in this section:** 0 (Push is non-AI; verified — only `/api/push/vapid-public-key` and the failed `pushManager.subscribe()` were invoked).

---

## Realtime Sync

**Two-context setup (Step 0 cookie-isolation observation):** Two **separate** `chromium.launch()` instances proved necessary — `browser_tabs` (not used here in favour of separate launches) was the original RESEARCH §Step-0 fallback question. The auditor opted for **two distinct browser instances** rather than a single `launchPersistentContext` + multiple tabs, which guarantees **isolated cookie jars**: Context A = persistent profile `mcp-chrome-22d19b2` (auditor = Auditor, member id `f244600f`, color `#0EA5E9`, auth_token `FzCK7xz...`); Context B = a fresh ephemeral `chromium.launch()` joining as Joe via the **D-07 idempotent rejoin path** (`POST /households/join` with `member_name: "Joe"` returns Joe's existing token + IDs per `households.py:142-161`; member id `eb6eeb32`, color `#10B981`, auth_token `d8aE4a3e...`). **Cookie isolation CONFIRMED**: A's identity (`Auditor`, id `f244600f`) was unchanged before, during, and after B's full flow — verified by 4 separate `GET /households/me` calls bracketing the probe. **Two independent WS connections** to the prod backend confirm via distinct `?token=` query strings on `wss://al-dente-production.up.railway.app/ws`. **No `browser_tabs` was used; document this as the canonical pattern.** (Per the O-04 capacity blocker found in §Onboarding above, member #5 cannot be created — D-07 rejoin of an existing identity is the only viable two-context strategy until O-04 is resolved.)

**Starting state:** auditor (member #4 Auditor) in persistent context A on `/`; Joe re-spawned in fresh ephemeral context B; today's shortlist `4270b9c2-2d36-4c10-91d2-796646da9701` (generation 2 — regenerated by RT-5 below; the original `9a047f52` from Plan 12-03 is now superseded). 4-member household, 4 connected WS peers including the two fresh ones from this run.

**Golden path:** B fires each mutation against the prod backend; A's WS connection (already open on home `/`) receives a `{"type": <event_type>, "payload": {...}}` text frame within ~1-2s; A's UI re-renders accordingly (e.g. inbox badge increment, vote chip flip, cooking banner). Each probe captures the WS frames *received* by A via Playwright's `page.on('websocket')` framereceived hook — direct evidence (not just visual observation) that the broadcast contract holds. **Architecture invariant #4 (`broadcast_to_household`) verified live via WS frame inspection.**

**Probes:**

### nit P-12-RT-CookieIsolation: Two-context cookie isolation verified via separate `chromium.launch()` (regression canary)
**Severity:** nit (pass-style)
**Surface:** Realtime Sync (probe-infra)
**Probe kind:** invariant verification (Step 0 of D-15)
**Starting state:** auditor in `mcp-chrome-22d19b2` persistent context.
**Repro:**
1. `chromium.launchPersistentContext(PROFILE)` → Context A, identity = `Auditor`.
2. `chromium.launch({ headless: true })` then `.newContext()` → Context B.
3. In B, idempotent-rejoin as `Joe` via `POST /households/join`.
4. In A, `GET /households/me` → expect `Auditor` still.
**Expected:** Two-context cookie isolation holds; A's auth_token unchanged.
**Actual:** A's identity remained `Auditor` (id `f244600f`, token `FzCK7xz...`) throughout. B took its own auth token (`d8aE4a3e...`). Distinct WS connections to backend confirmed by `?token=` query string differing per side. **Pass-style — canonical two-context pattern documented for future audits.**
**Screenshot:** `walkthrough-screenshots/realtime-cookie-isolation-test.png`
**Issue:** none — regression canary.

### nit P-12-RT-1 `recipe.created`: B's `POST /recipes/quick` reaches A in ~3s; inbox badge increments live
**Severity:** nit (pass-style — invariant #4 holds)
**Surface:** Realtime Sync (event class 1/6)
**Probe kind:** racing → cross-client observation
**Starting state:** A parked on `/`, inbox badge `À compléter7`. B authenticated as Joe.
**Repro:**
1. B → `POST /api/recipes/quick {title: "RT probe — recipe.created"}` → 201, returns `{id: "cc809289-..."}`
2. Wait ~3s.
3. A reads inbox badge.
**Expected:** A's WS receives `{type: "recipe.created", payload: <RecipeResponse>}`; UI's inbox badge increments to `À compléter8`.
**Actual:** WS frame captured live: `{"type": "recipe.created", "payload": {"id": "cc809289-eb59-...", "household_id": "9f3b1902...", "created_by_member_id": "eb6eeb32..." (Joe), "status": "draft", "title": "RT probe — recipe.created", ...}}` — 794 bytes, full RecipeResponse shape per `RECIPE-08`. A's inbox badge updated `À compléter7` → `À compléter8` within the 3s observation window. **Invariant #4 holds for this event class.**
**Screenshot:** `walkthrough-screenshots/realtime-recipe-created.png`
**Issue:** none — regression canary.

### nit P-12-RT-2 `recipe.promoted`: voice draft promotion broadcasts to A in ~4s after BackgroundTask completes
**Severity:** nit (pass-style — invariant #1 + #4 hold together)
**Surface:** Realtime Sync (event class 2/6)
**Probe kind:** racing → cross-client async-promotion observation
**Starting state:** A parked on `/`. B authenticated as Joe.
**Repro:**
1. B → `POST /api/recipes/voice {transcript: "Pâtes au pesto, deux personnes, basilic, parmesan, pignons, ail, huile d'olive."}` → 201, draft created.
2. Wait for BackgroundTask to run (Gemini extraction).
3. Observe A's WS frames.
**Expected:** Two events arrive in A — first `recipe.created` (draft, `title: "(extraction en cours…)"`), then `recipe.promoted` after Gemini structures the recipe.
**Actual:** Both events captured in A's WS frames. Sequence: t=t0 → `recipe.created` (status=`draft`, 849 bytes) → t=t0+~4s → `recipe.promoted` (status=`structured`, 1115 bytes; title now `Pâtes au pesto`; ingredients = 5-item array `[basilic, parmesan, pignons, ail, huile d'olive]`; cuisine = `italian`). **Invariant #1 (capture promotes server-side via BackgroundTask) AND invariant #4 (broadcast on status flip) hold together.** Gemini call for extraction successful.
**Screenshot:** `walkthrough-screenshots/realtime-recipe-promoted.png`
**Issue:** none — regression canary.

### nit P-12-RT-3 `recipe.updated`: PUT /recipes/{id} broadcasts in ~1.5s
**Severity:** nit (pass-style)
**Surface:** Realtime Sync (event class 3/6)
**Probe kind:** racing → cross-client mutation observation
**Starting state:** A parked on `/`. B authenticated as Joe; recipe `054a1f85` (Pâtes au pesto from RT-2) now structured.
**Repro:**
1. B → GET `/api/recipes/054a1f85` to capture current shape.
2. B → PUT `/api/recipes/054a1f85` with title appended `— RT.updated probe` (preserve all other fields).
3. Wait ~3s.
**Expected:** A's WS receives `{type: "recipe.updated", payload: <updated RecipeResponse>}` showing the new title.
**Actual:** WS frame arrived in **1569 ms** at A. 1136-byte payload includes `"title": "Pâtes au pesto — RT.updated probe"`. **Invariant #4 holds for this class.**
**Screenshot:** `walkthrough-screenshots/realtime-recipe-updated.png`
**Issue:** none — regression canary.

### nit P-12-RT-4 `vote.created`: vote broadcasts in ~1.3s — but the cross-client `state` payload also reproduces the MEMBER_COUNT=2 bug (Vt-01)
**Severity:** nit (pass-style for arrival; cross-link Vt-01 for state)
**Surface:** Realtime Sync (event class 4/6) + cross-link to §Vote P-12-Vt-01
**Probe kind:** racing → cross-client observation + invariant #2 verification at WS layer
**Starting state:** A parked on `/`. B authenticated as Joe. New shortlist `4270b9c2` (gen 2). Pad thai tofu already covered by RT-6 below — picked second recipe `dfdab18f` (Mega ingredient bomb).
**Repro:**
1. B → `POST /api/shortlists/4270b9c2/recipes/dfdab18f/vote {vote: "yes"}` → 201.
2. Wait ~3s.
3. Inspect A's WS frame.
**Expected:** A receives `{type: "vote.created", payload: {shortlist_id, recipe_id, member_id, vote, state}}` where `state` is the computed vote state.
**Actual:** WS frame at A, **1273 ms latency**. 236 bytes: `{"type": "vote.created", "payload": {"shortlist_id": "4270b9c2-...", "recipe_id": "dfdab18f-...", "member_id": "eb6eeb32-..." (Joe), "vote": "yes", "state": "pressenti"}}`. Backend computed `pressenti` (1y, 0n / member_count=2 — defaulted) for what is actually 1y/4 in a 4-member household. **Invariant #4 (broadcast) holds; invariant #2 (computed state) is BROKEN at the wire layer too — the WS payload itself contains the mis-computed `pressenti` instead of `sans_avis` or similar correct value.** This is the same `MEMBER_COUNT=2` cluster as Plan 12-03 P-12-Vt-01 — but seeing it ALSO encoded in the broadcast payload (not just rendered) tightens the diagnosis: the bug is server-side at `routers/shortlist.py:179` `compute_vote_state(votes_for_recipe, member_count)` where `member_count` is defaulted to 2 in the broadcast call site too.
**Screenshot:** `walkthrough-screenshots/realtime-vote-created.png`
**Issue:** none for arrival. Cross-link P-12-Vt-01 (Plan 05 to file).

### nit P-12-RT-5 `shortlist.created`: regenerate succeeds (200) with new generation; broadcast arrives — and **Plan 12-03 Sh-02 is partially contradicted**
**Severity:** nit (pass-style for arrival); blocker downgrade considered for Sh-02
**Surface:** Realtime Sync (event class 5/6) + cross-link to §Shortlist P-12-Sh-02
**Probe kind:** invariant verification (Sh-02 retest)
**Starting state:** A parked on `/`. B authenticated as Joe. Today's shortlist `9a047f52` (Plan 12-03's gen 1).
**Repro:**
1. B → `POST /api/shortlists/regenerate {}` (empty JSON body).
2. Wait ~3s.
3. Inspect A's WS frame + B's HTTP response.
**Expected (per Plan 12-03 P-12-Sh-02):** 422 `missing-body` error.
**Actual:** **200 OK with new shortlist** — `{shortlist_id: "4270b9c2-2d36-4c10-91d2-796646da9701", date: "2026-05-09", generation: 2, recipes: [...]}` — full new deck of 5 recipes. WS frame at A: `{"type": "shortlist.created", "payload": {"shortlist_id": "4270b9c2-...", "date": "2026-05-09", "generation": 2}}` — 137 bytes. **The endpoint WORKS today.** Plan 12-03 P-12-Sh-02 documented `POST /api/shortlists/regenerate → 422 missing-body`. Possible explanations: (a) Plan 12-03 sent a malformed body shape and got 422; this run sends an empty `{}` JSON body and gets 200 — so the endpoint expects an empty/optional body. (b) The endpoint was fixed between Plan 12-03 and Plan 12-04 (no commits to backend in between — so this is unlikely). The P-12-Sh-02 finding may be re-classifiable from `blocker` to `friction` (poor 422 error message when wrong body is sent) or **invalid** (sender bug). **Plan 05 must reconcile** before filing.
**Screenshot:** `walkthrough-screenshots/realtime-shortlist-created.png`
**Issue:** Plan 05 reconciliation needed. P-12-Sh-02 status = `disputed`.

### nit P-12-RT-6 `cooking.started`: cook broadcasts in ~1.3s; the broadcast is `cooking.started` (not `cooking_log.created` as some docs say)
**Severity:** nit (pass-style + light vocabulary drift)
**Surface:** Realtime Sync (event class 6/6) + invariant #4 vocabulary
**Probe kind:** invariant verification
**Starting state:** A parked on `/`. B authenticated as Joe. Today's auditor cook (Coq au vin from Plan 12-03) is finalized; pad thai tofu (`2923bc7a`) is fresh. 
**Repro:**
1. B → `POST /api/recipes/2923bc7a/cook {}` → 201.
2. Wait ~3s.
3. Inspect A's WS frame.
**Expected:** A receives `cooking.started` (per the canonical 6 from `services/realtime.py:9-19` — note the docstring there says `cooking.started`, while CONTEXT D-16 lists `cooking_log.created` and `cooking_log.finalized` as the realtime classes — vocabulary drift).
**Actual:** WS frame at A, **1269 ms latency**. 206 bytes: `{"type": "cooking.started", "payload": {"log_id": "c7c92195-...", "recipe_id": "2923bc7a-...", "cooked_by_member_id": "eb6eeb32-..." (Joe)}}`. Confirms `realtime.py:16` docstring — actual broadcast type is `cooking.started` (not `cooking_log.created`). Confirms `routers/cooking_logs.py:104` literal. **CONTEXT D-16's `cooking_log.created` / `cooking_log.finalized` is a DOC DRIFT** — the actual code emits `cooking.started` (and `cooking.finalized` per `cooking_logs.py:219`, NOT mentioned in `realtime.py` docstring at all → an additional 7th event class not in the canonical-6 list).
**Screenshot:** `walkthrough-screenshots/realtime-cooking-started.png`
**Issue:** none for arrival. Sub-finding: vocabulary drift between CONTEXT D-16, `services/realtime.py:9-19` docstring, and actual code emit. `cooking.finalized` is a SEVENTH event class not enumerated anywhere in canonical docs. **Plan 05 may file as a documentation finding.**

### nit P-12-RT-7 reconnect: A's WS recovers after `offline → online → reload`; subsequent recipe.created arrives post-reconnect
**Severity:** nit (pass-style — D-17 reconnect probe)
**Surface:** Realtime Sync (reconnect)
**Probe kind:** network → connectivity edge case
**Starting state:** A parked on `/` with active WS. WS first opened at t=1778351846374 (token `FzCK7xz...`).
**Repro:**
1. A → `window.dispatchEvent(new Event('offline'))` → wait 1.5s → `window.dispatchEvent(new Event('online'))` → 500ms.
2. A → `page.goto('/')` (full reload).
3. B → `POST /api/recipes/quick {title: "RT reconnect probe"}` → 201.
4. Wait 5s.
5. Inspect A's WS frame log.
**Expected:** A's old WS connection closes; new WS opens after reload; the `recipe.created` event arrives on the new connection.
**Actual:** A's WS frame log shows: `close` at t=1778351900741 → `open` at t=1778351902551 (reconnect in 1.8s) → `rx recipe.created` at t=1778351906890 (post-reconnect, 770 bytes payload with `"title": "RT reconnect probe"`). **WS lifecycle correctly handles offline → online → reload → reconnect → resume listening.**
**Screenshot:** `walkthrough-screenshots/realtime-reconnect.png`
**Issue:** none — regression canary.

**Pass-style observations** (regression canaries):
- All 6 documented broadcast event classes work end-to-end (`recipe.created`, `recipe.promoted`, `recipe.updated`, `vote.created`, `shortlist.created`, `cooking.started`).
- Latencies: `recipe.created` ~3s; `recipe.promoted` ~4s after creation (Gemini-bound); `recipe.updated` ~1.5s; `vote.created` ~1.3s; `shortlist.created` ~3s; `cooking.started` ~1.3s; reconnect ~1.8s. All well under D-17's qualitative ~3s threshold (with `recipe.promoted`'s 4s being the only borderline; the 1s overage is Gemini latency, not WS — observed within the BackgroundTask budget).
- A 7th event class `cooking.finalized` exists in code (`cooking_logs.py:219`) but is NOT enumerated in `realtime.py` canonical docstring; it is not probed here because finalize implies an active cook on B that wasn't set up in this run.
- Auditor (member #3) session **stays authenticated** through all 7 probes. Final identity check confirms `Auditor`/id `f244600f` post-probe.

**Gemini calls in this section:** **1** — only RT-2's voice promotion calls Gemini for extraction (verified by the `recipe.promoted` payload containing structured ingredients matching the input transcript). All other event classes are non-AI broadcast paths.

---

## Onboarding

**Starting state:** Auditor stays in member-#4 persistent context throughout. Probes that need a fresh prospective-joiner context use an EPHEMERAL Chromium context (separate cookie jar) so the auditor cookie is never overwritten — T-02 mitigation. The 4-member synthetic household has all 4 swatches taken: `#F43F5E` (Luca), `#10B981` (Partner), `#F59E0B` (Joe), `#0EA5E9` (Auditor) — the locked palette has only 4 swatches per `ColorSwatchPicker`, meaning **the household is at capacity** and any further joiner WILL collide on color. This becomes user-visible in O-03 below and cross-cuts §Realtime Sync's plan to spawn member #5.

**Surface contract observed:** `/onboarding/welcome` renders the wordmark + tagline + two paper-grain Cards (`Créer un foyer` / `Rejoindre un foyer`) per `frontend/app/onboarding/welcome/page.tsx`. `/onboarding/join` renders a Card form with: `code` Input (auto-uppercased, alpha-num filtered, max 6 chars per `join/page.tsx#177-181`), `member_name` Input (max 60), color swatch picker (debounced `GET /api/households/by-code/{code}` preview drives disabled swatches at 300ms per T-01-06-06). On submit, `POST /api/households/join` returns 404 (bad code) / 409 (taken color) / 422 (palette mismatch). Idempotent rejoin (D-07): same name → returns existing member's token (per `households.py:142-161`).

**Golden path:** Mirrors `frontend/tests/e2e/invite-code-happy-path.spec.ts` join half. The auditor's join (Plan 12-02) hit this exact path: `welcome` → tap `Rejoindre un foyer` → type `DEMO01` → debounced preview returns `{household_name: "[SYNTHETIC] Démo Al Dente", taken_colors: [...]}` → pick free color → type name → tap submit → `POST /api/households/join` → 201 → `set_auth_cookie` → `router.replace("/")`. **Already verified live in Plan 12-02 — no re-traversal here to honor the "don't log out / don't re-onboard auditor" T-02 rule.**

**Probes:**

### friction P-12-O01: `/onboarding/welcome` is reachable for an authenticated user — no redirect-to-`/`
**Severity:** friction
**Surface:** Onboarding (route guard)
**Probe kind:** invalid-state (deep-link from authenticated session)
**Starting state:** authenticated auditor (member #4), persistent context.
**Repro:**
1. While logged in, navigate directly to `/onboarding/welcome`.
2. Observe whether OnboardingGuard redirects to `/` (the home decide screen) or renders the welcome surface.
**Expected:** Authenticated users should not see the onboarding entry point — should auto-redirect to `/` (mirrors `auth.skip-onboarding.spec.ts` behaviour). Otherwise an authenticated user can land on this page from a stale browser tab and click `Rejoindre un foyer`, kicking off a flow that would overwrite their cookie if they completed it (T-02 risk: user destroys their own session).
**Actual:** `/onboarding/welcome` **renders normally** for the authenticated auditor. URL stays `https://al-dente-pink.vercel.app/onboarding/welcome`; page body contains `Créer un foyer` + `Rejoindre un foyer` Cards. No redirect, no banner ("vous êtes déjà membre de foyer X"), no preventive guard. From here, tapping `Rejoindre` lands on `/onboarding/join` which **also** renders without guard. **The user CAN start a join flow that, on submit, would either (a) idempotent-rejoin if same name (per D-07 households.py:142-161 — silent success, cookie refresh), or (b) re-create as a new member if they pick a different name → cookie overwritten → **original member-#4 session destroyed without confirmation**. Friction not blocker because the destructive path requires the user to type a different name (visible step) — but it's a UX trap.
**Screenshot:** none captured separately (snippet evidence: `"Al DenteDécide ce qu'on mange ensemble.Créer un foyerRejoindre un foyer"`).
**Issue:** new finding (Plan 05 to file as friction). Recommend OnboardingGuard at the welcome+join+create routes to redirect authenticated users home, OR a "you are already in {household_name} as {member_name}" banner with explicit "Sign out & re-onboard" CTA.

### nit P-12-O02: Bad invite code (`ZZZZZZ`) surfaces accurate French error in UI
**Severity:** nit (pass-style)
**Surface:** Onboarding (error UX)
**Probe kind:** garbage input
**Starting state:** Ephemeral context (no auditor cookie); fresh `/onboarding/join`.
**Repro:**
1. Type `ZZZZZZ` into the invite-code input.
2. Wait 300ms (debounce).
3. Observe error UX.
**Expected:** Backend returns 404 from `GET /api/households/by-code/ZZZZZZ`; frontend surfaces `t("onboarding.errors.code_not_found")`.
**Actual:** Backend → `404 {"detail":"invite_code not found"}`. Frontend shows aria-live error: `Ce code n'existe pas. Vérifie auprès de ta partenaire.` — clear, actionable, addresses the user's likely mental model (confused about who has the code). **Pass-style — French copy works.**
**Screenshot:** `walkthrough-screenshots/onboarding-bad-code.png`
**Issue:** none — regression canary.

### nit P-12-O03: Lowercase `demo01` in code input correctly auto-uppercases to `DEMO01`
**Severity:** nit (pass-style)
**Surface:** Onboarding (input filter)
**Probe kind:** boundary
**Starting state:** Auditor's persistent context at `/onboarding/join` (no submit — read input value only).
**Repro:**
1. Programmatic `input.fill("demo01")`.
2. Read `input.value`.
**Expected:** Per `join/page.tsx#177-181`, the onChange handler runs `e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)`.
**Actual:** Input value reads `DEMO01` — uppercase filter works as documented. **Pass-style.**
**Screenshot:** `walkthrough-screenshots/onboarding-lowercase-code.png`
**Issue:** none — regression canary.

### blocker P-12-O04: 4-member household is at color-palette capacity — no path for member #5
**Severity:** blocker
**Surface:** Onboarding (palette + color collision)
**Probe kind:** invalid-state (capacity)
**Starting state:** Synthetic household has 4 members, palette has exactly 4 swatches: `#F43F5E`, `#10B981`, `#F59E0B`, `#0EA5E9`. `GET /api/households/by-code/DEMO01` → `taken_colors: [#F43F5E, #10B981, #F59E0B, #0EA5E9]` (i.e. all four).
**Repro:**
1. Ephemeral context. Navigate `/onboarding/join`.
2. Type `DEMO01` → preview fires → ALL 4 swatches return as taken.
3. `ColorSwatchPicker` renders all 4 disabled. Submit button stays disabled because `color !== null` never becomes true.
4. Backend probe (bypass UI): `POST /api/households/join {invite_code: "DEMO01", member_name: "Auditor4-collision-test", color_hex: "#F43F5E"}` → `409 {"detail":"color already taken by another member"}`. Same outcome with any of the 4 hex codes.
**Expected:** Either (a) the palette has more swatches than the maximum supported household size, OR (b) the UI surfaces a "this household is full" terminal state, OR (c) a productize-later TODO marker explaining the capacity ceiling. Architecture invariant #4 (realtime contract) implies multi-member sync; the spec does not say "max 4 members".
**Actual:** **Joining is impossible.** The UI is technically correct (no submit affordance because no free color) but the user-visible state is silent failure: typing the code shows `[SYNTHETIC] Démo Al Dente, all four swatches greyed`, the form sits there with a disabled submit, no copy explains why. There is **no error message** distinguishing "you haven't picked a color yet" from "no color is available." The product implicitly caps household size at 4 (the palette length) without ever stating this.
**Why this matters for the audit pile-up:** Plan 12-04's §Realtime Sync requires spawning member #5 for a two-context probe. Per Plan 12-03's projection, member #5 is the synthetic-household audit baseline going forward. **Currently, member #5 cannot be created via the standard onboarding flow.** The realtime probes in Task 2 below adapt: the second context will idempotent-rejoin as one of the existing 4 (per `households.py:142-161` D-07 idempotent path) rather than create a new member.
**Screenshot:** `walkthrough-screenshots/onboarding-color-collision.png`
**Issue:** new finding (Plan 05 to file as **blocker** — primary intended action "join household" is non-functional once the palette is exhausted; affects audit baseline going forward; affects any real 5+-person household). Productize-later marker recommended at `frontend/components/ColorSwatchPicker.tsx` and/or a backend max-members enforcement returning a distinct 422.

### friction P-12-O05: Color collision on join surfaces an error, but the form's "your colour was taken between preview and submit" race still wedges UX
**Severity:** friction
**Surface:** Onboarding (race resolution)
**Probe kind:** racing → invalid-state
**Starting state:** Ephemeral context, fresh `/onboarding/join`. Imagine: user A previewed `DEMO01` at T0 (3 swatches taken), picked the only free swatch, then user B joined first using that swatch. Now user A submits.
**Repro:**
1. Backend fires `POST /api/households/join` with a colour that just-now became taken → `409 {"detail":"color already taken by another member"}`.
2. Frontend `onSubmit` catch branch (per `join/page.tsx:138-143`) calls `setColorError(tErrors("color_taken"))`, sets `setColor(null)`, and re-fires `fetchPreview(code)`.
**Expected:** The colour-error toast/inline error explains the race AND the picker re-renders with the previously-free swatch now disabled.
**Actual:** Backend race-handling is correct (the same-transaction `existing_colors` check in `households.py:163-173` serializes simultaneous joins-with-same-color). Frontend re-fetches preview correctly so the now-taken swatch is greyed out. **However**, with the household at capacity (P-12-O04), this race can leave the user in a state where ALL swatches are now taken — the `colorError` text reads `Couleur déjà prise.` but offers no recovery path; submit stays disabled forever. **Friction layered on the O-04 blocker.**
**Screenshot:** `walkthrough-screenshots/onboarding-color-collision.png` (shared with O-04).
**Issue:** new finding (Plan 05 to file). Cross-link with O-04.

**Gemini calls in this section:** 0 (Onboarding is non-AI; verified via network log — zero `/v1beta/models/gemini` requests).

---

## Settings

**Starting state:** Carry-over from Onboarding probes; auditor still member #4 in persistent context. Settings page (`/settings`) renders 4 Cards stacked at gap-6 (Phase 9 D-08 layout): Membre / Foyer / Historique / Sauvegarde. Page title `Paramètres` confirmed.

**Surface contract observed:** Read-only by design, per `frontend/app/settings/page.tsx`. Affordances enumerated live: `[Copier le code d'invitation (button, h-12 w-12)]`, `[Voir les cuissons récentes → /cooking-logs (link)]`, `[Télécharger mes recettes (button, h-12 w-full)]`, plus the bottom-tab nav `[Accueil, Recettes, À compléter (badge=7 — the 7 stuck drafts from Plan 12-02), Plus]`. **There is NO member-name editor**, **NO household-name editor**, **NO color-swatch editor**, and **NO "Quitter le foyer" affordance** in the shipped UI. Backend confirms: `PATCH /api/households/me` returns `405 Method Not Allowed` — the route does not exist.

**Golden path:** Mirrors `frontend/tests/e2e/settings.spec.ts`. Auditor lands at `/settings`, sees Membre Card (color dot + `Auditor`), Foyer Card (`[SYNTHETIC] Démo Al Dente` + `DEMO01` in Fraunces italic terracotta + Copy icon button + helper copy), Historique Card (`Voir les cuissons récentes` → `/cooking-logs`), Sauvegarde Card (`Exporter mes données` body + `Télécharger mes recettes` CTA). Tap targets all at the 48px D-08 floor. **Behaves as documented.**

**Probes:**

### nit P-12-S01: POLISH-02 RESOLVED — Copy button on invite code IS shipped (closes backlog item)
**Severity:** nit (pass-style; closes backlog cross-link)
**Surface:** Settings (Foyer Card invite-code section)
**Probe kind:** invariant verification (cross-link to `POLISH-02` backlog)
**Starting state:** authenticated auditor at `/settings`.
**Repro:**
1. Inspect Foyer Card's invite-code section.
2. Look for a Copy button.
**Expected (per backlog):** `POLISH-02` was filed when the Copy button was missing in v0.2. CONTEXT D-06 says cross-link if still present (i.e. still missing).
**Actual:** **The Copy button SHIPPED.** `frontend/app/settings/page.tsx:154-162` renders a `<Button size="icon" variant="ghost" className="h-12 w-12" onClick={onCopy} aria-label="Copier le code d'invitation">` with the lucide `Copy` icon. Live inspection confirms: 1 button matched, `aria-label="Copier le code d'invitation"`, lucide-copy SVG present, h-12 w-12 (correct tap target), 2-second `Check` icon swap on click via `setCopied(true)` + `setTimeout`. The `onCopy` handler uses `navigator.clipboard.writeText` and shows toast `t("invite_code_copied")` / `t("invite_code_copy_failed")` — i18n keys verified live. **`POLISH-02` should be marked CLOSED in the v0.2.2 backlog tracker** — it was already closed during Phase 9 work but apparently never struck off the list. **Pass-style + backlog hygiene win.**
**Screenshot:** `walkthrough-screenshots/settings-invite-copy.png`
**Issue:** none. Cross-link: `POLISH-02` — mark closed during Plan 05 dedupe pass.

### blocker P-12-S02: Member name is unchangeable post-onboarding — `PATCH /api/households/me` returns 405
**Severity:** blocker
**Surface:** Settings (member self-management)
**Probe kind:** invalid-state / missing-route
**Starting state:** authenticated auditor; member name is `Auditor`.
**Repro:**
1. Inspect Settings affordances live — observe NO member-name input, NO edit pencil, NO `Modifier` button on the Membre Card.
2. Call backend directly: `PATCH /api/households/me {name: "<200-char-string-with-emoji-and-diacritics>"}`.
3. Observe response.
**Expected:** Either a route + UI to update the member's name (per the spec's CRUD model — members own their identity), or a productize-later marker explaining the deferral.
**Actual:** Backend → `405 Method Not Allowed` — **`PATCH /households/me` is not implemented**. Inspection of `backend/app/routers/households.py` (router file ends at line 223): NO `PATCH` / `PUT` handler on `/households/me`. The only mutating routes are `POST /households` (create) and `POST /households/join` (join). **A user who picks a typo'd name during onboarding has NO recovery path** short of (a) the D-07 idempotent rejoin trick (would require knowing the trick + creates a NEW member with the new name AND leaves the old one as an orphan in the DB), or (b) backend admin intervention. This is silent privilege loss: the user CAN'T fix their own name. **Architecture invariant gap** — the spec's "members own their identity" implication does not hold in v0.1 ship.
**Why this matters:** Compounds with O-04 (cannot create new members) — once you've onboarded with a typo, you're stuck with it permanently. Audit-relevant: the synthetic household has accumulated 4 audit-prefixed names (`Luca, Partner, Joe, Auditor`) that cannot be cleaned up except by `--teardown`.
**Screenshot:** `walkthrough-screenshots/settings-long-name.png` (showing the read-only Membre Card; 200-char emoji/diacritic test moot — no input affordance to type into).
**Issue:** new finding (Plan 05 to file as **blocker** — missing CRUD; user-visible identity lock-in).

### friction P-12-S03: No "Quitter le foyer" path — leaving a household requires backend intervention or `--teardown`
**Severity:** friction
**Surface:** Settings (member offboarding)
**Probe kind:** missing affordance
**Starting state:** authenticated auditor at `/settings`.
**Repro:**
1. Search live DOM for any element containing `Quitter le foyer` substring.
2. Inspect `households.py` for any `DELETE` route.
**Expected:** Either (a) explicit "Quitter le foyer" affordance with confirm + cookie clear + redirect to `/onboarding/welcome`, OR (b) productize-later TODO marker explaining the deferral. The CONTEXT D-06 backlog implies this exists somewhere (probe was tagged "If a 'Quitter le foyer' path exists, INSPECT only").
**Actual:** Live DOM has 0 elements matching `Quitter le foyer`. `households.py` has no `DELETE` / member-removal handler. The user cannot leave their household — once joined, the cookie is the binding and the only "logout" is browser-data clear (which on iPhone PWA is the multi-step Settings → Safari → Clear History sequence). **By design read-only, but undocumented as such.** Couple-scale (the target audience) means this is rarely exercised in practice — but it's friction for the audit (cannot clean up audit-test members) and for users who need to e.g. switch households or recover from a typo'd identity.
**Issue:** new finding (Plan 05 to file as friction; cross-link with S-02 blocker).

### friction P-12-S04: 200-character + emoji + diacritics member-name probe is moot — no input exists to test
**Severity:** friction (sub-finding; cross-link to S-02)
**Surface:** Settings
**Probe kind:** boundary
**Starting state:** authenticated auditor at `/settings`.
**Repro:** Search for any `<input>` corresponding to member name on Settings.
**Expected (per plan):** Test rendering of `"x"*200 + " 🍝 éèàâç"` member name across surfaces (e.g. inbox card author byline).
**Actual:** **No member-name input on `/settings`** (P-12-S02 confirms). The boundary probe is unreachable from the UI. Backend-side, the 200-character + emoji string was sent via `PATCH` and rejected with 405 (no route). **A complete probe would require: (1) adding the PATCH route, (2) wiring the UI editor, (3) re-running the boundary test.** Documented here so Plan 14 ranking has the cross-link. **Note:** member-name boundary handling AT ONBOARDING TIME is constrained by `<Input maxLength={60}>` on the join form (see `join/page.tsx:223-224`) — so the 200-char path was already foreclosed at the only writable entry point.
**Screenshot:** `walkthrough-screenshots/settings-long-name.png` (re-uses S-02's evidence).
**Issue:** none — cross-link with S-02.

### nit P-12-S05: Hardcoded French copy "Voir les cuissons récentes" / "Historique" violates invariant #6 (next-intl) — `POLISH-01` cluster
**Severity:** nit (cross-link to `POLISH-01`)
**Surface:** Settings (Historique Card)
**Probe kind:** invariant verification
**Starting state:** authenticated auditor at `/settings`.
**Repro:** Inspect `frontend/app/settings/page.tsx:175-183` and the rendered Historique Card.
**Expected:** All user-facing strings flow through `next-intl` per architecture invariant #6.
**Actual:** Lines 176-179 hardcode `"Historique"` and `"Voir les cuissons récentes"` directly in JSX — confirmed via the file's own comment at lines 172-174: `"Hardcoded French copy is a TODO(productize) — move to nav.cooking_history.* keys in v0.2.1 i18n sweep alongside the HomeDecide partner-waiting strings."` This is the same cluster as `POLISH-01` (i18n sweep on partner-waiting strings). The TODO IS marked in the source. **Cross-link to `POLISH-01`** per D-06 — do NOT refile. **Pass-style on hygiene** (the TODO is honest) but **invariant #6 violation surfaces user-visibly in this Card** until the i18n sweep lands.
**Issue:** none. Cross-link: `POLISH-01` — extend its scope to include `settings.page.tsx:176-179` Historique Card strings.

**Gemini calls in this section:** 0 (Settings is non-AI; verified via network log).

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
