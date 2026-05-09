# UI Review — Capture / Photo

**Audited:** 2026-05-09
**Auditor:** Claude (Phase 13, manual scoring per CONTEXT.md D-06)
**Synthetic env:** [SYNTHETIC] Démo Al Dente @ https://al-dente-pink.vercel.app
**Viewport:** iPhone-shape Chromium 390×844 (isMobile, hasTouch)
**Reach status:** Reached. Sheet-01 [#1] reproduced live (Photothèque button at y=831-879, viewport ends at y=844 → 35px clipped). Photo upload not exercised in this audit (Phase 12 already documented the stuck-extraction state per P-12-Ph02).

## Originality Verdict

**Verdict:** Mixed ⚠

Static visuals + token compliance pass — the 2×2 photo grid with a `paper-grain` dashed-border `+` add-tile is a deliberately on-brand affordance, the heading copy is imperative-French ("Photographie la recette"), and the helper line says exactly what Gemini will do without bragging. But the surface has *two* simultaneous blockers in flight ([Issue #1](https://github.com/lucaguery/al-dente/issues/1) + [Issue #3](https://github.com/lucaguery/al-dente/issues/3)) and the dynamic state of opening the bottom sheet visually breaks (sheet ends 95px past the viewport because `paper-grain`'s `position: relative` overrides Tailwind's `fixed`). Verdict stays Mixed because *intent* is Al Dente while *execution* regresses to broken on the load-bearing tap path.

| Boilerplate elements | Earned elements |
|----------------------|-----------------|
| Default Radix `Sheet` / `SheetContent side="bottom"` primitive — used unmodified, and the unmodified version is what loses to `paper-grain`'s `position: relative` (`frontend/components/PhotoCaptureTab.tsx:152-212`) | `paper-grain h-24 w-24 rounded-lg border-2 border-dashed border-primary/30` `+` add-tile — Slow Food token + dashed-terracotta border reads as "place a photo here, scrapbook-style" (`PhotoCaptureTab.tsx:154-161`) |
| Generic `bg-foreground/80 text-background` round X-on-corner remove control — same shape every photo grid ships (`PhotoCaptureTab.tsx:139-146`) | 2×2 fixed grid with `locked` placeholder slots (`PhotoCaptureTab.tsx:107-111`) — keeps the visual rhythm even with 0/1/2 photos, refuses the boilerplate "list grows downward" pattern |
| Stock lucide icons (`Camera`, `ImageIcon`, `Plus`, `X`, `Loader2`) — themed but not customized | Helper paragraph `Ajoute jusqu'à 4 photos. Gemini extrait le titre, les ingrédients et les étapes.` — concrete promise of Gemini's contract, refuses the generic "Upload a photo" template (i18n: `recipes.photo.empty_body`) |

## 6-Pillar Score: 20/24

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| Copywriting | 4/4 | `Photographie la recette` (imperative + French specific verb), `Capturer la recette` (CTA matches the photo metaphor), `Caméra` / `Photothèque` (clean French nouns), helper paragraph names Gemini's exact contract. Full next-intl. |
| Visuals | 3/4 | Photo grid affordance is genuinely earned ✓. DOCKED -1 because the bottom-sheet visually fails on the iPhone viewport — sheet ends 95px past the 844px viewport, Photothèque button 35px clipped. (See WALKTHROUGH.md §Capture — Photo — P-12-Ph01) [[Issue #1](https://github.com/lucaguery/al-dente/issues/1)] |
| Color | 4/4 | Terracotta primary on submit + `border-primary/30` dashed accent on add tile + `bg-foreground/80 text-background` X button — semantic only, no raw colors. |
| Typography | 4/4 | `text-xl font-semibold` heading + `text-sm text-muted-foreground` body — 2 sizes, 1 weight, well within thresholds. |
| Spacing | 4/4 | Tailwind scale: `gap-6 / gap-3 / gap-2 / gap-1.5`, fixed `h-24 w-24` photo tiles, `before:-inset-2.5` hit-target expansion on the X button (canonical accessibility ergonomic). |
| Experience Design | 1/4 | DOCKED HARD — TWO simultaneous blockers. (a) Sheet-01 [#1]: Photothèque button clipped 35px past viewport on iPhone-shape; primary tap path requires Safari URL-bar auto-hide or vertical scrolling inside the dialog. (b) [Issue #3] cross-surface: non-recipe photo upload leaves draft permanently `(extraction en cours…)` — same Gemini-failed-silently pattern as Voice's P-12-V01. (See WALKTHROUGH.md §Capture — Photo — P-12-Ph01, P-12-Ph02) |

## Detailed Findings

### Pillar 6: Experience Design (1/4)

- **Sheet-01 [#1] reproduces live** — Live measurements at 390×844: dialog at `top=702 bottom=939 height=237` ends 95px past viewport. Caméra button `top=775 bottom=823` (in viewport). Photothèque button `top=831 bottom=879` (35px clipped). Computed `position: relative` despite `fixed` token in className — `paper-grain` declares `position: relative` and wins by source order. Photothèque is the higher-frequency tap path (camera-roll vs camera capture). Tap requires Safari URL-bar auto-hide first OR vertical scrolling inside the dialog (Radix doesn't always surface the latter). Per Phase 12 D-06: cross-link to backlog only, do NOT file a new issue. (See WALKTHROUGH.md §Capture — Photo — P-12-Ph01) [[Issue #1](https://github.com/lucaguery/al-dente/issues/1)]
- **Non-recipe photo upload — promotion-layer stuck-state** — uploading a 4×4 PNG (or any non-recipe image) produces `status='draft'` with `title='(extraction en cours…)'` indefinitely. No `failed` terminal state, no UI escalation. Cross-surface dupe of P-12-V01 — ONE issue covers Voice + Photo + (likely) URL once URL extraction lands. (See WALKTHROUGH.md §Capture — Photo — P-12-Ph02) [[Issue #3](https://github.com/lucaguery/al-dente/issues/3)]
- **Submit-debounce gap likely propagates** — same React-batching race as P-12-Q03/F03/V03; `setSubmitting(true)` (`PhotoCaptureTab.tsx:90`) is not synchronously visible to a fast double-tap.
- **18 MB total cap is well-handled** — `TOTAL_BYTES_CAP = 18 * 1024 * 1024` (`PhotoCaptureTab.tsx:40`) matches the backend `GEMINI_PHOTO_TOTAL_BYTES_CAP` (Plan 02 Task 2). Client-side `addFile` rejects with `t("error_size_total")`; server is the authoritative gate (T-02-04-02 mitigation). Pillar 6 *positive* on cost-amplification mitigation.
- **Object URL cleanup** — `useEffect` cleanup at `PhotoCaptureTab.tsx:63-69` revokes blob URLs on unmount + on file changes (T-02-04-01 mitigation). Pillar 6 *positive* on memory hygiene.

### Pillar 1: Copywriting (4/4)

- All strings via `useTranslations("recipes.photo")` + `useTranslations("photo_uploader")` + `useTranslations("common")` + `useTranslations("onboarding.errors")` (`PhotoCaptureTab.tsx:44-47`). Invariant #6 honored.
- Heading `Photographie la recette` (`recipes.photo.empty_heading`) — imperative, single-verb, French-specific (the verb `photographier` carries the "deliberate act" reading better than English `take a photo`).
- Helper paragraph `Ajoute jusqu'à 4 photos. Gemini extrait le titre, les ingrédients et les étapes.` (`recipes.photo.empty_body`) — concrete contract; user knows the floor (4-photo cap) and the ceiling (Gemini extracts these three things).
- Sheet labels `Caméra` / `Photothèque` — both clean French nouns, `Photothèque` chosen over the boilerplate `Galerie` / `Bibliothèque`.
- Submit `Capturer la recette` — verb-noun pair that fits the photo metaphor.

### Pillar 2: Visuals (3/4)

- 2×2 fixed grid is the right shape for a 4-photo cap surface; `slots` array (`PhotoCaptureTab.tsx:107-111`) keeps grid stable as photos accumulate (filled → add → locked).
- Add tile uses `paper-grain h-24 w-24 rounded-lg border-2 border-dashed border-primary/30` (`PhotoCaptureTab.tsx:158`) — composed Slow Food token, dashed terracotta border reads as "scrapbook spot for a photo". Earned visual.
- X-on-corner remove control with `before:-inset-2.5` hit-target expansion (`PhotoCaptureTab.tsx:139-146`) — accessible, standard.
- DOCKED -1 because the dynamic bottom-sheet state visually fails on iPhone-shape viewport (Sheet-01). The static surface scores 4/4 on visuals; the 35-px-clipped sheet is the deduction.

### Pillar 3: Color (4/4)

- Terracotta primary appears on (a) submit CTA, (b) `border-primary/30` dashed border on add tile. Two-instance accent, both load-bearing.
- `bg-foreground/80 text-background` for the X button — inverted-mode accent for the destructive control. Semantic only.
- `bg-muted` placeholder for missing previews (`PhotoCaptureTab.tsx:137`). Semantic only.
- Zero raw `#hex` / `rgb()` literals.

### Pillar 4: Typography (4/4)

- `text-xl font-semibold` (heading), `text-sm text-muted-foreground` (body) — 2 sizes, 1 explicit weight; within thresholds.
- IBM Plex Sans body throughout; Fraunces italic absent (correct — no display moments needed for a photo grid).

### Pillar 5: Spacing (4/4)

- Tailwind scale: `gap-6 / gap-3 / gap-2 / gap-1.5`, page `px-6 pt-6 pb-32`, photo tiles `h-24 w-24`, X button `h-7 w-7` with `before:-inset-2.5` hit-target — canonical scale + ergonomic accessibility expansion.
- `border-2` and `border-l-[3px]` are the only non-scale border thicknesses anywhere in the file — both load-bearing (dashed accent + cookbook annotation).

## Screenshots

- `./screenshots/capture-photo-canonical.png` — Photo tab default state: heading `Photographie la recette`, helper paragraph, single `+` add tile, disabled `Capturer la recette` CTA. Static visual reads as Al Dente.
- `./screenshots/capture-photo-sheet-clipped.png` — Sheet-01 reproduced. Bottom sheet open with `Caméra` and `Photothèque` buttons; the bottom of the dialog (and the `Close` button at y=923-951) extend below the 844px viewport. Photothèque button is the load-bearing tap target and it is 35px clipped.

## WALKTHROUGH cross-links (context inherited per D-11)

- WALKTHROUGH.md §Capture — Photo: 3 probes (P-12-Ph01..Ph03). P-12-Ph01 cross-links to [Issue #1](https://github.com/lucaguery/al-dente/issues/1) (Sheet-01) — DO NOT file new per D-06. P-12-Ph02 cross-links to [Issue #3](https://github.com/lucaguery/al-dente/issues/3) (cross-surface stuck-state — covers Voice + Photo). P-12-Ph03 is a duplicate of P-12-F04 (deep-link `?tab=photo` ignored, friction).
- 1 Gemini call observed (single non-recipe upload — auditor stayed conservative on Gemini budget given V-01 still potentially retrying server-side).
- Live re-measurement during Phase 13 confirms the Phase 12 measurements: dialog `top=702 bottom=939`, Photothèque `bottom=879` past `viewport=844`. The numbers haven't drifted; the bug is stable, awaiting [#1].
