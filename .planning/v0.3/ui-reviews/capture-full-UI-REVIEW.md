# UI Review — Capture / Complète

**Audited:** 2026-05-09
**Auditor:** Claude (Phase 13, manual scoring per CONTEXT.md D-06)
**Synthetic env:** [SYNTHETIC] Démo Al Dente @ https://al-dente-pink.vercel.app
**Viewport:** iPhone-shape Chromium 390×844 (isMobile, hasTouch)
**Reach status:** Reached.

## Originality Verdict

**Verdict:** Mixed ⚠

Visual + token compliance is excellent — the form respects the Slow Food palette, uses semantic enum→FR-label translation everywhere, and renders the Mood/Saisons selectors as on/off chip buttons rather than the boilerplate multi-select dropdowns most form starters ship. Editorial cohesion is partial: standard Tailwind/shadcn primitives carry the form structurally without much per-pillar customization, and the *outcome* of submission carries a load-bearing parser bug (P-12-F01: `4 tomates` → `4 tomates 4 tomates` on render) that downstream-docks Pillar 6 hard.

| Boilerplate elements | Earned elements |
|----------------------|-----------------|
| Plain shadcn `Input`/`Textarea`/`Select` primitives — themed but not differentiated (`frontend/components/RecipeForm.tsx:189-265`) | Mood + Saisons rendered as toggle chip buttons (`variant={on ? "default" : "outline"}`) instead of multi-select dropdowns — touch-first, single-tap, Slow Food's "tag your mood" reading (`RecipeForm.tsx:269-291, 316-338`) |
| Generic two-column `grid grid-cols-2 gap-4` for Prep/Servings — same shape every form library produces (`RecipeForm.tsx:218-245`) | Enum→FR translation via `useEnumLabels()` (`RecipeForm.tsx:159, 287, 308, 334`) — every shipped string flows through next-intl, no hardcoded English fallthrough |
| Reused sticky-bottom CTA pattern verbatim from Quick — same bg/blur/border construction (`RecipeForm.tsx:360-377`) | `NONE_VALUE` sentinel pattern (`RecipeForm.tsx:32`) — works around Radix Select's empty-string rejection without leaking the workaround into the wire format; ergonomic care, not boilerplate |

## 6-Pillar Score: 19/24

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| Copywriting | 3/4 | Full next-intl + FR-only ✓; ingredient placeholder is concrete (`200 g de pâtes\n2 œufs\n80 g de pancetta`); "Personnes" / "Temps de prép." are functional not delightful; submit verb `Enregistrer la recette` is solid (better than Quick's `Ajouter`). |
| Visuals | 4/4 | Toggle-chip rendering for Mood/Saisons gives the form a tactile, touch-first feel; clear visual rhythm of label-then-control rows; aria-labeled chrome. |
| Color | 4/4 | Single terracotta accent on submit + on `default`-variant chips when toggled on; rest is `outline`/border/muted-foreground. No raw colors. |
| Typography | 4/4 | 2 sizes (`text-base` header, default body); `font-semibold` on header only — within thresholds. |
| Spacing | 4/4 | `gap-6` between rows, `gap-1.5` label↔control, `gap-2` chip wrap, `gap-4` two-column grid — fully canonical Tailwind scale. |
| Experience Design | 0… wait — 2/4 | Loading spinner + disabled state on submit ✓ (`RecipeForm.tsx:362-374`). DOCKED hard: ingredient parser corrupts `<int> <noun>` lines (P-12-F01, blocker, [Issue #2]); title-only Full submit creates a `structured` recipe with null ingredients (P-12-F02, friction); same submit-debounce gap as Quick (P-12-Q03 likely propagates); `?tab=full&prefilled=…` deep-link ignored (P-12-F04). |

## Detailed Findings

### Pillar 6: Experience Design (2/4)

- **Ingredient parser duplicates `<int> <noun>` lines** — the regex at `RecipeForm.tsx:98-100` greedily binds `tomates` as the unit on `4 tomates`; the fallback at line 104 (`name: m[3] || line`) returns the entire input line when `m[3]` is empty, so `4 tomates` round-trips as `{quantity: 4, unit: "tomates", name: "4 tomates"}` and renders as `4 tomates 4 tomates` on the detail page. Same parser misclassifies `1 oignon rouge` as `{name: "rouge", quantity: 1, unit: "oignon"}`. Blocker per WALKTHROUGH D-01: primary intended action (capture a clean recipe) is non-functional via workaround on common French shopping-list patterns. (See WALKTHROUGH.md §Capture — Full — P-12-F01) [[Issue #2](https://github.com/lucaguery/al-dente/issues/2)]
- **Title-only submit produces orphan `structured` recipe** — `disabled={!v.title.trim() || submitting}` (`RecipeForm.tsx:364`) is the only client-side gate. Submitting with title only (no ingredients/steps) produces `status='structured'`, eligible for shortlist scoring with nothing to score against. Asymmetric vs Quick (which would produce `Brouillon`). Friction. (See WALKTHROUGH.md §Capture — Full — P-12-F02)
- **Submit-debounce gap likely propagates from Quick** — `setSubmitting(true)` in `handleSubmit` (`RecipeForm.tsx:178`) is not synchronously visible to a fast double-tap before React batches the re-render. Same root cause as P-12-Q03; the form's `disabled={!v.title.trim() || submitting}` only blocks the second click after the first call resolves the state update. (See WALKTHROUGH.md §Capture — Quick — P-12-Q03 for the propagation pattern.)
- **Deep-link `?tab=full&prefilled=…` ignored** — `frontend/app/recipes/new/page.tsx:53` initializes `tab` to literal `"quick"` with no URL-state read. The TODO at line 52 explicitly captures this as productize-later. Means the synthetic env can't be used for share-flow tests of pre-filled recipes. Friction. (See WALKTHROUGH.md §Capture — Full — P-12-F04)
- **No error boundary** — handleSubmit catches via `try/finally` (`RecipeForm.tsx:177-184`) but does NOT surface errors to the user; an `onSubmit` rejection silently flips submitting back to `false` without a toast (the page-level wrapper at `app/recipes/new/page.tsx:127` does emit `tErr("network")`, but only for `submitFull`'s api() call, not for any pre-submit RecipeForm validation).

### Pillar 1: Copywriting (3/4)

- All strings go through `useTranslations("recipes.new")` and `useEnumLabels()` (`RecipeForm.tsx:157-159`) — invariant #6 honored.
- Ingredient placeholder `200 g de pâtes\n2 œufs\n80 g de pancetta` is concrete, French-natural, and signals the format. ✓
- `Cuisine` / `Mood` / `Protéine principale` / `Saisons` are functional — adequate, not delightful. The "none" placeholder reuses `cuisine_none` for Protein too (`RecipeForm.tsx:255, 302`), which is a small key-overload but the rendered text reads correctly.
- Submit `Enregistrer la recette` is more grounded than Quick's `Ajouter` — gives the user a clearer mental "this commits to the library" beat.

### Pillar 2: Visuals (4/4)

- Toggle-chip rendering for Mood + Saisons creates a tactile differentiator vs typical multi-select form fields — touch surface fits iPhone thumbs.
- Vertical rhythm is consistent: every row is `<Label>` over control, `gap-1.5`. The 2-col grid for Prep/Servings is the only break, and it's intentional ergonomic compaction.
- Sticky bottom submit shares construction with Quick — visual consistency reinforces the "you are inside a capture flow" reading.

### Pillar 3: Color (4/4)

- Single terracotta accent appears on (a) submit CTA, (b) chips when toggled on. All other surfaces are border/outline/muted.
- Zero hardcoded color literals in `RecipeForm.tsx`. The component file imports zero color tokens directly — relies entirely on shadcn semantic classes.

### Pillar 4: Typography (4/4)

- Sizes: `text-base font-semibold` (sticky header), default body for everything else. Far below the ≤4 sizes ceiling.
- Weights: `font-semibold` on header only — at the ≤2 weights ceiling without exceeding.

### Pillar 5: Spacing (4/4)

- `gap-6` (rows) / `gap-4` (grid) / `gap-2` (chip wrap) / `gap-1.5` (label↔control) — three-tier hierarchy from "section" → "subsection" → "control" reads well visually.
- `pb-32` clears the sticky CTA + bottom nav. No `[Npx]` arbitrary values.

## Screenshots

- `./screenshots/capture-full-canonical.png` — top of `Complète` tab: Title input (autofocused), Ingrédients textarea with concrete French placeholder, Étapes textarea below.
- `./screenshots/capture-full-mid-form.png` — scrolled to mid-form: Cuisine select, Ambiance toggle chips (`Réconfortante / Légère / Rapide / Festive / Aventureuse`), Protéine select, Saisons toggle chips visible.
- `./screenshots/capture-full-bottom.png` — bottom of form: Tags textarea, Photos uploader, sticky `Enregistrer la recette` CTA above bottom nav.

## WALKTHROUGH cross-links (context inherited per D-11)

- WALKTHROUGH.md §Capture — Full: 4 probes (P-12-F01..F04). P-12-F01 is a [filed blocker](https://github.com/lucaguery/al-dente/issues/2) — the parser bug — and is the dominant Pillar 6 dock. P-12-F02 (title-only orphan) is friction; P-12-F03 (200-ingredient pass-style) is a Pillar 6 *positive*; P-12-F04 (deep-link ignored) is recorded as a productize-later TODO at `frontend/app/recipes/new/page.tsx:52`.
- 0 Gemini calls observed for Full — confirms Full is non-AI (input is already structured). Asymmetry note from WALKTHROUGH: Full produces `status='structured'` directly, Quick produces `status='draft'`; invariant #1's "all 5 capture surfaces … return a draft immediately" text is slightly stale for Full.
