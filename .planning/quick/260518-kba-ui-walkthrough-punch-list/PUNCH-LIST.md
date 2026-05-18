---
walkthrough_date: 2026-05-18
viewport: 390x844 (iPhone)
auth: test-token-luca (Luca, household TEST01)
environment: local dev (next dev + uvicorn) against test seed
screens_covered: [Accueil(pre-vote), Accueil(ledger-after-vote), Bibliothèque(Grille/Liste/Patine/search-empty), Recette(detail), Capture(thread+add-menu), Capture(URL extraction round-trip), Recette(post-URL), CookingLogs(empty), Settings, BottomNav]
total_findings: 17
---

# UI Walkthrough Punch List — 2026-05-18

## Summary

The Sober Kitchen tokens (Cormorant + Caveat + terracotta) are visibly in place and the conversational capture thread + URL extraction round-trip works end-to-end. The two systemic problems are: (1) **raw enum keys leak in many user-facing places** despite the v0.5 QW-03 `useEnumLabels()` fix (Bibliothèque cards, post-vote Accueil ledger rows, the "Voilà ce que j'ai compris" advisory bubble even renders Python `dict` reprs); (2) **the Sober Kitchen port (gh#29) is partial** — the locked Composition A Accueil ledger only renders after the first vote, the central « Ajouter » CTA is a primary-tinted pill but NOT visibly elevated above its siblings per the Phase 31 / gh#25 spec, and the Bibliothèque "Patine" view renders nothing. One real blocker: `/cooking-logs` shows the wrong empty state while the API returns 3 logs.

## Section 1 — Bugs / Broken behavior

### B-01 — `/cooking-logs` shows empty state while API returns 3 logs
- **Severity:** P1
- **Screen:** `/cooking-logs`
- **Repro:**
  1. Authenticated as Luca, household TEST01 (seed loaded with 3 cooking logs).
  2. Settings → "Voir les cuissons récentes" (or navigate `/cooking-logs`).
- **Expected:** 3 cooking-log cards (loved Ragu / liked Poulet citron / disliked Burger) grouped by date with Fraunces italic section headers per v0.2 Phase 8.
- **Actual:** `EmptyState` rendered with copy "Aucune recette pour le moment / Ajoute ta première recette pour commencer." The copy itself is also wrong — it says "recette" (recipes) on a cooking-log page.
- **Evidence:** `.scratch/walkthrough/F1-cooking-logs.png`; `GET /api/cooking-logs` returns `[{...rating:"loved"...}, {...rating:"liked"...}, {...rating:"disliked"...}]` (verified via `browser_evaluate fetch`).
- **Suspected cause:** Page fetches but probably maps the response into `recipes` state slot rather than `cooking_logs`; or fetch route mismatch (page expects `/api/cooking-logs/list` etc). EmptyState component is also miswired (cooking-log empty state should use cooking-log copy keys).

### B-02 — Photo signed-URL returns 500 (Phase 30 BUG-01 surface)
- **Severity:** P1
- **Screen:** Accueil ShortlistCard (Tacos), Bibliothèque (~4 cards), Recette detail (Ragu bolognese).
- **Repro:** Navigate to `/`. Console shows `[ERROR] http://localhost:3000/api/recipes/d430a9a5-…/photo-url?path=… → 500 Internal Server Error`.
- **Expected:** 200 with signed URL (24h TTL per Phase 30 D-01 SIGNED_URL_TTL_SECONDS = 86400).
- **Actual:** 500. Photos render as gradient placeholders; no `onError` retry cycle in the local seed because the backing object likely does not exist in Storage. Self-heal hook silently keeps retrying once and fails (per design — D-04 single-retry budget).
- **Evidence:** `.scratch/walkthrough/A1-accueil-home.png` (no hero photo), Recette detail screenshot, console messages captured in walkthrough/A1.
- **Suspected cause:** Local Supabase mock / dev Storage adapter not returning a signed URL for the synthetic seed (paths exist in `recipes.photo_paths` but bytes were never uploaded). Likely a seed-side gap, not a runtime bug — but the user-visible response is a 500, not a 404 + visible "no photo" handled gracefully. **Worth verifying** whether prod is affected by the underlying handler returning 500 vs 404 for missing storage objects.

### B-03 — Advisory "Voilà ce que j'ai compris" leaks raw enum keys + Python dict reprs
- **Severity:** P1
- **Screen:** Recette detail thread, on URL-captured recipe (`/recipes/{newId}` after URL save).
- **Repro:**
  1. From `/recipes/new`, click + → "Coller un lien" → paste `https://www.marmiton.org/recettes/recette_pates-a-la-carbonara_19115.aspx` → "Ajouter le lien" → "Enregistrer 1 note".
  2. Detail page renders the summary bubble with extracted fields.
- **Expected:** All field labels and values translated to French, ingredients rendered as "300 g riz arborio" (matching the structured Ingredients section above), enums shown via `useEnumLabels` (Italienne / Réconfortante / Moyen / etc.).
- **Actual:** The summary bubble shows:
  - `ingrédients: {'name': 'riz arborio', 'quantity': 300.0, 'unit': 'g'}, {'name': 'champignons', 'quantity': 400.0, 'unit': 'g'}, …` — **Python dict repr leaked to UI**.
  - `difficulté: medium` (should be "Moyen")
  - `cuisine: italian` (should be "Italienne")
  - `ambiance: comfort` (should be "Réconfortante")
  - `protéine: none` (the enum value "none" itself shouldn't surface to the user — should be hidden or "Aucune")
  - `saison: autumn, winter` (should be "Automne, Hiver")
  - `préparation: 35` (no unit — should be "35 min")
- **Evidence:** `.scratch/walkthrough/D3-capture-url-result.png`; snapshot at /recipes/b7b1a40b-… shows refs e189–e200.
- **Suspected cause:** `SystemBubble.tsx` summary branch is rendering the raw `extracted` payload via `JSON.stringify`/`Object.entries` rather than threading each field through `useEnumLabels` + the existing units formatter. The `ingredients` line in particular suggests Python `str(dict)` came through the API (backend should serialize as JSON, frontend should format).

### B-04 — Raw enum key "indian / mexican / french / asian / mediterranean / middleEastern / northAfrican / american / other" leaks across Bibliothèque cards
- **Severity:** P1
- **Screen:** `/recipes` (Grille view), all 21 cards.
- **Repro:** Navigate to `/recipes`. Read the subhead under each card title.
- **Expected:** French labels per `useEnumLabels().cuisine(...)` — "Italienne · avant-hier", "Indienne · Jamais cuisinée", etc.
- **Actual:** "italian · avant-hier", "indian · Jamais cuisinée", "middleEastern · Jamais cuisinée", "northAfrican · Jamais cuisinée". Day-relative ("avant-hier", "il y a 5 jours") is correctly French — enum is not.
- **Evidence:** `.scratch/walkthrough/B1-bibliotheque-grid.png` (full page); snapshot shows refs e108/e116/e124 etc.
- **Suspected cause:** `RecipeCard.tsx` (or wrapping component) reads `recipe.cuisine` directly. The fix shipped in v0.5 Phase 22 QW-03 explicitly wrapped `ShortlistCard.tsx` + `recipes/[id]/page.tsx` only, leaving the library row untouched (the v0.5 SUMMARY notes "Inbox D-14 no-op confirmed (drafts inbox renders no cuisine/mood/protein today)" — but the library card DOES, and was missed).

### B-05 — Same enum-leak on post-vote Accueil ledger meta rows
- **Severity:** P1
- **Screen:** `/` (Accueil, after voting on the first shortlist card).
- **Repro:** Vote « J'aime cette recette » on Tacos → Accueil transitions to the locked ledger view → read meta line under each row.
- **Expected:** "Française · 120 min", "Indienne · 50 min", "Mexicaine · 25 min".
- **Actual:** "french · 120 min", "indian · 50 min", "mexican · 25 min" (the Validé row, "Ragu bolognese", correctly shows "validé · à cuisiner" because that's a literal string from i18n — only the non-Validé rows leak the enum).
- **Evidence:** `.scratch/walkthrough/A2-accueil-after-vote-ledger.png`; snapshot e91/e99/e107.
- **Suspected cause:** Same as B-04 (HomeDecide / ShortlistRow component bypasses `useEnumLabels`). The Phase 22 QW-03 fix did not cover the post-vote ledger composition that landed in (presumably) the v0.7 Sober Kitchen port.

### B-06 — Bibliothèque "Patine" view renders blank
- **Severity:** P2
- **Screen:** `/recipes` after clicking the Patine view-switch radio.
- **Repro:** `/recipes` → click view-switch button "Patine" (`<i data-lucide="layers">`).
- **Expected:** Per design-system §15 Bibliothèque View C — sections "Héritage / Habitudes / À l'essai" grouped by `cook_count` patine bucket, each with a header + chip count + sized cards.
- **Actual:** The grid disappears; the snapshot shows just an empty `generic [ref=e498]` container. No section dividers, no cards, no empty-state copy.
- **Evidence:** `.scratch/walkthrough/B3-bibliotheque-patina.png` (only the page header + view-switcher visible). Snapshot at 2026-05-18T12-47-49.
- **Suspected cause:** `LibraryViewSwitch.tsx` switches state but `recipes/page.tsx` only renders the `patina` panel content if a non-empty grouping is built; possibly the seed's `cook_count` distribution doesn't match any of the patine bucket thresholds (one recipe has cook_count=1, the rest are 0). Either bucket boundaries are wrong or the empty-bucket fallback is missing.

### B-07 — Member list missing in Settings (only Luca visible)
- **Severity:** P2
- **Screen:** `/settings`
- **Repro:** Navigate to `/settings` while authenticated. The "Foyer" section lists only the household name + invite code + Toi (Luca).
- **Expected:** Per `.planning/PROJECT.md` v0.5 → v0.7 invariants there are 2 seed members (Luca + Partner); both should appear, with at least the partner's name, member dot color, and last-active hint per Phase 9 onboarding-identity spec.
- **Actual:** Only `Toi → Luca` block visible. No "Partenaire" / member-2 block. Partner does show up correctly on the Accueil voting card ("Partner: pas encore voté") and in vote scenes ("P" seat), so the data exists.
- **Evidence:** `.scratch/walkthrough/G1-settings.png` (full page).
- **Suspected cause:** Settings page fetches `me` but not `household.members[]`, or filters by `member.id === me.id`.

### B-08 — Version footer shows hardcoded v0.1.0 / development
- **Severity:** P3
- **Screen:** `/settings` footer line.
- **Repro:** `/settings` → scroll to bottom → "v0.1.0 · dev · development".
- **Expected:** v0.7.x (current milestone) — per Phase 22 QW-02 the version is re-exported from `npm_package_version`. The "dev" sha and "development" env are fine in local; the `0.1.0` is stale.
- **Actual:** `0.1.0` literal. `frontend/package.json` has not been bumped since v0.1 ship.
- **Suspected cause:** `package.json` version field wasn't bumped through the v0.2/0.3/0.5/0.6/0.7 milestones (the version footer reads `npm_package_version` correctly — the fix is upstream).

### B-09 — Pre-vote Accueil hero contradicts its marginalia
- **Severity:** P2
- **Screen:** `/` (Accueil, fresh load with un-voted shortlist).
- **Repro:** Clear votes / fresh seed → land on `/`.
- **Actual:** H1 "On mange quoi ce soir ?" + marginalia "— déjà une idée validée" is rendered, but the screen below shows the swipe-deck card for Tacos (the ONLY un-voted recipe) and no ledger of the actually-validated Ragu bolognese row. The marginalia "déjà une idée validée" is misleading — there IS a validé (Ragu) but the user can't see it from the pre-vote home state.
- **Expected:** Either show the ledger Composition A from §15 (with the Validé row pinned + un-voted rows surfaced for voting), OR change the marginalia copy when zero validé exists.
- **Evidence:** `.scratch/walkthrough/A1-accueil-home.png` shows the swipe-deck; `A2-accueil-after-vote-ledger.png` shows the ledger AFTER vote (where Ragu bolognese appears as Validé).
- **Suspected cause:** Phase 7 swipe-deck and Sober Kitchen Composition A ledger are still toggled by `unvotedCount > 0`. Marginalia copy is computed unconditionally from the shortlist's overall state, not from the currently-displayed view.

### B-10 — Nested `<main>` element (a11y)
- **Severity:** P3
- **Screen:** `/` (Accueil).
- **Repro:** Inspect the Accueil DOM; the snapshot shows `main [ref=e2] > main [ref=e3]` nested.
- **Expected:** One `<main>` element per WCAG 1.3.1 / landmark uniqueness.
- **Actual:** Outer layout-level `<main>` wrapping an inner page-level `<main>`. Screen readers will report two main landmarks.
- **Evidence:** Snapshot at 2026-05-18T12:46:25.
- **Suspected cause:** Likely `app/layout.tsx` has a `<main>` wrapper AND `app/page.tsx`'s `HomeDecide` component also wraps with `<main>`.

## Section 2 — UI Polish

### P-01 — "Ingrédients· 6 personnes" missing space before middle-dot
- **Screen + element:** Recette detail, h2 in Ingredients section.
- **Observation:** Heading text concatenates as `Ingrédients· 6 personnes` (no space before `·`). Visible on every recipe (e.g. Ragu detail, Risotto-test detail).
- **Suggestion:** Insert a NBSP before the middle-dot, or use the established `<span class="meta-sep"> · </span>` pattern. French typography wants ` · ` (NBSP both sides).
- **Effort:** XS

### P-02 — `<main>` x2 collision + push notification banner stacks on top of Accueil hero
- **Screen + element:** `/` (top of Accueil), big "Active les notifications" card pushed above the H1.
- **Observation:** First impression of the home screen is a notification opt-in, not "On mange quoi ce soir ?". Locked Accueil §15 starts with the H1 + marginalia, with permission asks elsewhere (or sheet).
- **Suggestion:** Move the push-permission banner under the shortlist rows, or behind a Réglages CTA. Current placement defeats the locked "shortlist au centre" hierarchy.
- **Effort:** S

### P-03 — Bibliothèque sort/filter chips missing
- **Screen + element:** `/recipes` between search input and grid.
- **Observation:** Walkthrough brief expected "Filter chips for Season / Cuisine / Mood / Protein" (the locked vocabularies). Page only shows the view-switcher (Grille/Liste/Patine) + search box. No facet chips.
- **Suggestion:** Per locked-vocabulary discipline, even minimal cuisine/season filters would let users navigate 21 recipes. Confirm whether this is intentional v0.7 scope or pending.
- **Effort:** M

### P-04 — Recette detail meta-row mixes lucide-stroke icons with text labels
- **Screen + element:** Recette detail meta row ("90 min" + "Italienne" + "Réconfortante").
- **Observation:** Only "90 min" carries a leading clock icon; "Italienne" + "Réconfortante" + "Moyen" are plain pills with no icon. Heterogeneous.
- **Suggestion:** Either pull `Clock` off "min" and let all three be text pills (cleaner), or pair every pill with a tiny lucide stroke icon (utensils for cuisine, etc.).
- **Effort:** XS

### P-05 — Step marginalia "Excellent ce soir." overflows the step-row container without visible gutter offset
- **Screen + element:** Recette detail, step 1.
- **Observation:** The post-cook note from the seeded `cooking_log.notes` field is rendered as a paragraph inside the step row but without the Caveat slant + gutter visual the design system §13 marginalia spec calls for. It looks like a regular caption.
- **Suggestion:** Apply `.marginalia.slant` and a small left/right gutter inset so the note reads as handwriting against the printed step.
- **Effort:** S

### P-06 — Pre-vote Accueil card has heavy thumb-button area; Composition A doesn't have OUI/NON buttons
- **Screen + element:** `/` pre-vote, bottom CTA row.
- **Observation:** The Phase 7 ShortlistDeck thumb-buttons ("Pas envie ce soir" + "J'aime cette recette") are still mounted even though Composition A from §15 voting is supposed to happen via the table-à-manger scene (tap seat to vote). Two voting affordances coexist.
- **Suggestion:** Decide whether the swipe-deck-with-thumbs flow is replaced by table-à-manger scene taps; either remove thumb buttons in favor of seat-tap voting, or accept that they're complementary and document.
- **Effort:** M

### P-07 — "Cuisiner Ragu bolognese" CTA on the ledger view repeats the title; tight on narrow phones
- **Screen + element:** `/` post-vote, bottom CTA.
- **Observation:** Full button copy is "Cuisiner Ragu bolognese" — long titles will wrap or get clipped on 320px-wide phones.
- **Suggestion:** Either truncate with `…` after ~22 chars, or use "Cuisiner ce soir" with the title in marginalia underneath.
- **Effort:** XS

## Section 3 — Design-system drift (vs docs/design-system.html)

### D-01 — BottomNav central CTA not visibly elevated above siblings (Phase 31 gh#25)
- **Locked spec:** `frontend/.scratch/capture-mockups/1-smart-paste.html` + Phase 31 mandate: *"filled primary circle with `+` glyph, visibly elevated above the four flat sibling tabs."*
- **As implemented:** `<a href="/recipes/new">` contains a `w-14 h-14 rounded-full bg-primary` circle, but the link container itself is `flex-1` with the same 76px height as Accueil / Recettes / Profil — no negative top-margin, no `translate-y`, no extra shadow. The pill sits flush with the rest of the nav row.
- **Delta:** The CTA reads as "third tab with terracotta pill" rather than "elevated CTA above the row" — a couple-of-pixels lift + box-shadow would deliver the locked mockup's visual hierarchy.
- **Suggested fix:** `transform: translateY(-12px)` on the inner `<span>` and a soft drop shadow; or place the CTA in its own absolutely-positioned slot above the nav. Phase 31 commit `62b4e96` looks like it added the pill but stopped short of the lift.

### D-02 — BottomNav has 4 tabs not 5; "Réception" / Drafts inbox cut without doc update
- **Locked spec:** design-system.html §15 (Accueil + Bibliothèque + Recette locked screens) shows a 4-tab BottomNav: Accueil · Recettes · Réception · Réglages.
- **As implemented:** Accueil · Recettes · Ajouter · Profil. "Réception" dropped, "Profil" renamed from "Réglages", central CTA inserted. **Net 4 tabs, not 5** — the walkthrough brief expected 5 ("Home, Library, central +, Vote/Cook, Profile").
- **Delta:** Phase 27 removed `/inbox` (Réception) because the conversation thread replaces drafts. The design-system.html mockup still references it. Either update the design-system to drop Réception or accept the divergence and document.
- **Suggested fix:** Update `docs/design-system.html` §15 to show the post-Phase-27 4-tab + central CTA layout, and remove "Réception" from §15.A's Accueil mockup.

### D-03 — Accueil Composition A (vertical ledger of shortlist rows) only renders post-vote
- **Locked spec:** design-system.html §15.A Accueil mockup: vertical stack of shortlist rows (Validé highlighted with `--valide-tint` background + halo seats; Pressenti / Contesté / Sans-avis as plain rows), CTA pinned to bottom pointing to first validé.
- **As implemented:** Pre-vote shows the v0.2 Phase 7 swipe-deck (one card at a time, thumb buttons). Only AFTER the user votes on the first un-voted card does the ledger view render. The Validé Ragu bolognese row is invisible until the user has acted.
- **Delta:** The locked spec is a 4-row ledger from first render. The current implementation is "swipe-deck first, ledger only when no un-voted cards remain."
- **Suggested fix:** Either port HomeDecide to render Composition A from first paint (with the un-voted card embedded as a special row), or update §15.A to acknowledge the dual-mode behaviour. The current dual-mode is arguably a more functional flow (voting is the primary task) but it's not what the spec says.

### D-04 — Post-vote Accueil ledger drops the 5th row (Rejeté) — only 4 rows render
- **Locked spec:** §15.A mockup shows 4 rows but the system enumerates 5 states (Validé / Pressenti / Contesté / Rejeté / Sans avis). With the seed's votes, Shawarma is the Rejeté row and should appear.
- **As implemented:** After voting, the ledger shows Ragu (Validé) / Coq (Pressenti) / Butter chicken (Contesté) / Tacos (Pressenti). **Shawarma (Rejeté) is missing.**
- **Delta:** Either Rejeté rows are filtered out of the Accueil ledger (intentional?) or there's a bug skipping them.
- **Suggested fix:** Confirm intent. If Rejeté should hide on Accueil to reduce noise, document in §15.A. If it should appear muted, add the muted-row treatment.

### D-05 — Recette detail body composition does not match §15.C "cookbook page A"
- **Locked spec:** §15.C Recette A — photo hero (full-bleed), title strip with backdrop-blur, terracotta-30 left margin-rule on ingredients (cookbook gesture), Fraunces-italic numbered steps, marginalia register woven through.
- **As implemented:** With no hero photo loading (B-02), the page reads as a flat scroll of title → pill row → ingredient list → numbered steps. No left margin-rule on the ingredient list, no backdrop-blur title strip (because no photo).
- **Delta:** Even discounting the broken photo, the cookbook gestures (margin-rule, blur strip, numbered-italic) are not clearly present. The Caveat marginalia on step 1 (B-05 P-05) renders as a plain caption.
- **Suggested fix:** Verify the §15.C gestures landed in the Sober Kitchen port (Phase 32 ?). The base structure is right; the editorial flourishes are flat.

### D-06 — Table-à-manger seats render as alphabetical generics, not the locked seat geometry
- **Locked spec:** §11 table-à-manger + §15.A Accueil rows — each shortlist row has a `.table-scene` with a `.table-plate` and `.table-seat` north/south, each with a state class (`seat-state-valide` halo emerald, `seat-state-pressenti`, `seat-state-contested`, `seat-state-neutral`).
- **As implemented:** Snapshot of the ledger shows `<img alt="Vote: valide">` containing two `<generic>` elements labeled "Luca: yes" / "Partner: yes" with text "L" / "P". No "table-plate" element, no halo / seat-state geometry visible in the accessibility tree.
- **Delta:** Without visiting via a non-accessibility-tree renderer it's hard to be sure the locked seat geometry is there. The accessibility tree's flat generics suggest either the seats are styled circles without semantic role, or the table-plate is absent.
- **Suggested fix:** Spot-check on a real iPhone or via DOM inspector to confirm the seat halo + plate geometry shipped. The current rendering reads as "two avatars in a card" rather than "two seats at a table."

### D-07 — Bibliothèque cards missing `dogear` corner-fold detail on highly-patined recipes
- **Locked spec:** §15.B Bibliothèque View A — recipes with high `--patina` (e.g. Risotto safran, cooked 34 times) carry a `.dogear` SVG corner fold (paper-corner-turned-down).
- **As implemented:** Snapshot of `/recipes` Grille shows none of the cards with a dogear. Even "Ragu bolognese" (`cook_count: 1` in the seed) wouldn't qualify, but the seed has at least one recipe (`Risotto aux champignons` at index 1) eligible.
- **Delta:** Either `cook_count → patina` mapping is too conservative (all seed recipes fall below the dogear threshold), or the `.dogear` component shipped without consumers.
- **Suggested fix:** Confirm the threshold (probably `patina ≥ 2`); seed at least one recipe at `cook_count = 10+` so the dogear actually renders against the seed in dev.

### D-08 — Patine view shows no section dividers / counts because all rows live in one or two buckets
- **Locked spec:** §15.B View C — three sections "Héritage <count>" / "Habitudes <count>" / "À l'essai <count>" with dotted dividers.
- **As implemented:** Patine view is blank (B-06). Even if the data weren't blank, the seed's cook_count distribution probably puts ~20 recipes in "À l'essai" and 1 in another bucket — visually meaningless.
- **Delta:** Same root as D-07. Seed needs distribution; view needs a fallback so a single-bucket dataset still shows the section header + count rather than an empty container.
- **Suggested fix:** Render section headers + "(0)" counts even for empty buckets in dev; bump seed cook_count distribution to populate at least one row per bucket.

## Appendix: Coverage map

| Screen | Snapshot | Screenshot | Errors |
| --- | --- | --- | --- |
| Accueil (pre-vote, swipe-deck) | yes | A1-accueil-home.png | 2× 500 (photo-url) |
| Accueil (post-vote, ledger) | yes | A2-accueil-after-vote-ledger.png | 2× 500 (photo-url) |
| Bibliothèque (Grille) | yes | B1-bibliotheque-grid.png | 0 |
| Bibliothèque (Liste) | yes | B2-bibliotheque-list.png | 15× 500 (photo-url cascade) |
| Bibliothèque (Patine) | yes | B3-bibliotheque-patina.png | 15× 500 |
| Bibliothèque (search empty) | yes | B4-bibliotheque-empty.png | 0 |
| Recette detail (Ragu) | yes | C1-recette-detail.png | 2× 500 |
| Capture thread (empty) | yes | D0-capture-thread.png | 0 |
| Capture add-menu sheet | yes | D1-capture-add-menu.png | 0 (2 warnings) |
| Capture URL staged | yes | D2-capture-url-staged.png | 0 |
| Recette (post-URL save, summary bubble) | yes | D3-capture-url-result.png | 0 |
| Voting (post-vote ledger) | yes | A2 | 2× 500 |
| Cooking-logs list | yes | F1-cooking-logs.png | 1× (page-init noise) |
| Settings | yes | G1-settings.png | 0 |
| BottomNav (every screen) | yes (inline) | all of the above | n/a |

Not walked (out of brief / not implementable without bigger setup): Quick capture (no separate "quick" surface anymore — Phase 27 collapsed to one thread); Form capture (`/recipes/[id]/edit` not visited, deferred); Voice (Playwright `MediaRecorder` not viable, documented); Photo upload (`browser_file_upload` requires the photo file-chooser to be open via the "Choisir dans la photothèque" sheet button — sheet was opened, upload trigger not exercised); Profile / push subscriptions (push opt-in seen on Accueil — not exercised because the activation requires a real push endpoint).

## Appendix: Tooling notes (for a future uat-tester agent)

1. **Cookie set works first try** with `document.cookie = "aldente_auth=test-token-luca; path=/; SameSite=Lax"` followed by a re-navigation. No SameSite/HttpOnly drama in local dev — the seed-config docs are accurate.
2. **`/api/shortlist/today` is 404 — the actual route is `/api/shortlists/today` (plural).** Useful to know when probing the API from the page console.
3. **Side-effect of `browser_evaluate` with an inline promise:** the first probe (`/api/shortlist/today` 404) caused the page to navigate to `/recipes` as a side-effect, possibly because of an error boundary that fell back. Wrap fetches in `async () => {…}` and rely on explicit await.
4. **`mcp__playwright__browser_evaluate` truncates promise returns when you don't await internally.** Use `async () => { const r = await fetch(...); return { status, body }; }`.
5. **Snapshot at `depth: 5` is the sweet spot** for the ledger view — `depth: 3` collapses table-à-manger seat detail.
6. **Voice + Photo upload need a small fixture harness** — neither surface trivially exercises via Playwright. A future agent would benefit from: (a) a deterministic MediaRecorder polyfill stubbed in `frontend/playwright.config.ts` for the seeded project; (b) `browser_file_upload` triggered by clicking "Choisir dans la photothèque" then resolving the file-chooser.
7. **The walkthrough brief was written pre-Phase-27.** Five capture surfaces no longer exist — there's one conversational thread plus the « Ajouter » sheet with three options (Prendre une photo / Choisir dans la photothèque / Coller un lien). A future agent's checklist should reflect this collapse.
8. **The seed gives the same shortlist every day** (it's deterministic — seed CLI fixes the date), so the post-vote ledger is reproducible. The pre-vote state must be re-seeded between runs (`uv run seed` is idempotent — re-running re-inserts the un-voted Tacos vote scenario).
9. **`browser_console_messages` returns only since-last-navigation by default** — use `all: true` to capture the full walk's errors.
10. **The `useSignedPhotoUrl` self-heal hook silently retries once and falls back.** Errors surface as `Failed to load resource: 500` in the console but the UI doesn't show a broken-image icon. Good for the user, harder to debug — a future agent should diff the console for 5xx-photo-url before/after, or add a dev-only fallback badge.
