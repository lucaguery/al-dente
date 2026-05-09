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
