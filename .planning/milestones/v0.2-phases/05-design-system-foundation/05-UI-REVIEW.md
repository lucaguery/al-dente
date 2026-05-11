---
phase: 5
slug: design-system-foundation
reviewed_at: 2026-05-08
baseline: 05-UI-SPEC.md (approved)
auditor: gsd-ui-auditor
status: clean
score: 23/24
pillars:
  copywriting: 4/4
  visuals: 4/4
  color: 4/4
  typography: 4/4
  spacing: 4/4
  experience_design: 3/4
---

# Phase 5 — UI Review

**Audited:** 2026-05-08
**Baseline:** `05-UI-SPEC.md` (approved — Slow Food artisanal, Fraunces + IBM Plex Sans, terracotta + cream + warm-gray)
**Screenshots:** Not captured — no dev server detected at localhost:3000, 5173, or 8080. Code-only audit. Visual smoke test was completed and approved by user during Plan 06 (Task 2); no re-litigation of that approval.
**Phase scope:** Foundation only — token system (`globals.css`), typography (`layout.tsx`), motion preset module (`lib/motion.ts`), paper-grain SVG asset, 15 re-themed shadcn primitives, and `/styleguide` dev-only acceptance gate. No production user-facing screens introduced.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All UI-SPEC sample copy present verbatim; French diacritics (`À`, `é`, `è`, `ç`, `«»`, `œ`) throughout; styleguide-bypass of next-intl correctly bounded and annotated |
| 2. Visuals | 4/4 | Paper-grain on all 5 surface primitives, warm two-layer shadows, clear display/title/body/caption hierarchy, dark-mode toggle present, all 10 styleguide sections rendered |
| 3. Color | 4/4 | Terracotta OKLCH verified on-disk; rose hue completely absent; accent reserved-for list honored; badge `default` uses `bg-primary` per UI-SPEC "no color changes" instruction |
| 4. Typography | 4/4 | Fraunces + IBM Plex Sans registered with `latin-ext`, `opsz` axis, `display: swap`; exactly 4 type-scale classes with correct values; 3 weights (400/500/600) each with locked purpose; zero `Playfair_Display` / standalone `Geist` remnants |
| 5. Spacing | 4/4 | 4-multiple spacing throughout; `max-w-2xl mx-auto px-6 pt-12 pb-24 gap-12` per spec; `gap-12` between sections; single legitimate arbitrary value (`h-[200px]` on ScrollArea demo) |
| 6. Experience Design | 3/4 | Skeleton (3 sizes), disabled states (Button/Input/Textarea), destructive AlertDialog, toast variants all demonstrated; `aria-label` on icon-only buttons; production gate (`notFound()`) present; `TODO(milestone-close)` marker present; viewport `themeColor: "#F43F5E"` still legacy rose (documented deferred to Phase 9) |

**Overall: 23/24**

Target of ≥22/24 from UI-SPEC §Acceptance Criteria: MET.
Phase 4 baseline of 20/24: EXCEEDED by 3 points.

---

## Top 3 Priority Fixes

1. **viewport.themeColor still `#F43F5E` (legacy rose) in `layout.tsx:46`** — Any user who installs the PWA on iOS Safari will see the rose accent color in the status bar / splash, contradicting the terracotta identity that now governs every surface. Impact: minor visual inconsistency on install; no runtime breakage. Fix: change to `themeColor: "oklch(0.595 0.135 35)"` or the approximate hex `"#C45A3F"`. **Documented deferred to Phase 9 (ONBOARD-10)** — do not score against Phase 5.

2. **`font-heading` alias still active in 4 Title elements** — `card.tsx:41`, `dialog.tsx:133`, `sheet.tsx:117`, `alert-dialog.tsx:126` use `font-heading` (the deprecated alias) rather than `font-display`. The alias resolves correctly to Fraunces via `--font-heading: var(--font-display)` in `@theme inline`, so there is no visual defect. However the DEPRECATED comment marks this as a Phase 6 sweep task. Fix: replace `font-heading` with `font-display` in those four lines and remove the alias from `globals.css`. **Documented deferred to Phase 6.**

3. **Paper-grain anti-pattern demo applies `paper-grain` to a `<Button>` element** — `styleguide/page.tsx:289` renders `<Button className="paper-grain ...">NOT applied here (button surface)</Button>` to demonstrate the anti-pattern. The intent is correct documentation, but the label ("NOT applied here") is slightly confusing — it is applied here, on purpose, to show what it looks like when applied incorrectly. The `button.tsx` primitive itself has no `paper-grain`, which is correct. Recommendation: change the label to "Counter-example: paper-grain INCORRECTLY on a button" to match the UI-SPEC's "counter-example" language. Low priority — dev-only route, removed at v0.2 close.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

**What was audited:** The `/styleguide` route is the only new consumer of copy introduced by Phase 5. Production app strings in `frontend/lib/i18n/fr.json` were not changed this phase, consistent with the UI-SPEC §Copywriting Contract ("Phase 5 introduces NO new user-facing copy").

**Strengths:**

- All five UI-SPEC §Copywriting Contract samples appear verbatim in `page.tsx`:
  - Display: `« Al Dente. À la maison. »` (line 150, 186) — tests `À`, `é`, `«»`
  - Title: `« Tagliatelles aux cèpes »` (line 187, 257, 375) — tests `è`
  - Body: `« On laisse mijoter à feu doux pendant trois quarts d'heure. C'est la patience qui fait le goût — pas l'effort. »` (lines 188-191) — tests `î`, `'` apostrophe, French hyphenation
  - Caption: `« Cuit le 7 mai »` (line 192)
  - Label: `Catégorie` (lines 193, 345)

- Additional diacritic-rich copy throughout: `Échalotes`, `Crème fraîche épaisse`, `Beurre demi-sel`, `Huile d'olive vierge extra`, `Œufs fermiers`, `Piment d'Espelette` in the ScrollArea list — excellent breadth of diacritic coverage for Latin-extended rendering stress-testing.

- AlertDialog uses `Supprimer cet élément ?` / `Cette action est définitive.` / `Annuler` — exactly the placeholder copy specified in UI-SPEC §Copywriting Contract §Empty/error/destructive states.

- The `// TODO(milestone-close)` marker at `page.tsx:3` plus a comment on line 152 ("Dev-only. Marked for milestone-close removal.") correctly document the next-intl bypass exemption as bounded by the v0.2 milestone close.

- No generic "Submit", "OK", "Cancel", "Save", "Click Here" strings found in any of the 15 re-themed primitives or the styleguide page.

**No deficiencies.** Score: 4/4.

---

### Pillar 2: Visuals (4/4)

**What was audited:** Visual hierarchy on the `/styleguide` route, paper-grain texture contract, dark-mode demonstration, section completeness.

**Strengths:**

- Clear three-level visual hierarchy on the styleguide page:
  - `<h1 class="text-display">` (Fraunces italic, clamp 32–44px, weight 500) — page wordmark
  - `<h2 class="text-title">` (Fraunces upright, 24px, weight 500) — 10 section headings
  - Body copy via `.text-body` / `.text-caption` — IBM Plex Sans at 16px / 13px

- All 10 sections from UI-SPEC §Styleguide Route Layout are present:
  Tokens/Color, Tokens/Typography, Tokens/Shadows, Tokens/Motion, Texture/Paper-grain, Primitives/Buttons, Primitives/Form controls, Primitives/Surfaces, Primitives/Feedback, Primitives/Navigation+structure.

- Paper-grain confirmed on all 5 surface primitives per UI-SPEC §Paper-Grain application contract:
  - `card.tsx:15` — `paper-grain` prefix on base Card div
  - `dialog.tsx:64` — `paper-grain` on DialogContent
  - `sheet.tsx:65` — `paper-grain` on SheetContent
  - `alert-dialog.tsx:61` — `paper-grain` on AlertDialogContent
  - `select.tsx:72` — `paper-grain` on SelectContent
  - Correctly absent from Button, Skeleton, Sonner, Input, Textarea, Badge, Label, ScrollArea, Separator

- Dark-mode toggle functional at `page.tsx:140-144` via `document.documentElement.classList.toggle("dark")`. Additionally, the Color section renders a `.dark` scoped preview row (line 176) showing the dark palette without requiring a full theme toggle — useful for side-by-side comparison.

- Icon-only Buttons in the Buttons section all have `aria-label` (lines 320, 323, 326, 329), satisfying the "icon-only buttons paired with aria-labels" visual/accessibility contract.

- Warm two-layer shadows demonstrated in the Shadows section with an interactive `hover:shadow-card-hover` Card (line 207) and a labelled `shadow-nav` hairline.

- Motion demos: `pressFeedback` variant (`whileTap="pressed"`) on "Appuyer" button (lines 230-237); `slideUp` variant toggled via "Afficher/Masquer" (lines 243-264). Both use the correct `variants` import from `@/lib/motion`.

**One observation (not scored down):** The Color section's dark-mode preview wraps light-mode swatches inside a `.dark` container, which means the swatches render with dark-mode CSS values by CSS cascade — this is correct and demonstrates the palette inversion. However a reader examining the code may not immediately understand the double-inversion intent. A brief label above the dark-mode block ("values from `.dark` block:") would add clarity. This is minor documentation polish, not a scoring defect.

Score: 4/4.

---

### Pillar 3: Color (4/4)

**What was audited:** OKLCH token values on disk, anti-pattern compliance (no rose, no slate), 60/30/10 split, accent reserved-for list.

**Strengths:**

- Terracotta primary confirmed on-disk: `oklch(0.595 0.135 35)` appears 3 times in `globals.css` (`:root --primary`, `--ring`, `--sidebar-ring`). Dark equivalent `oklch(0.70 0.13 35)` confirmed in `.dark` block.

- Rose hue (`0.246 16.5` / `0.19 16.5` / `h=16.5°`) returns 0 grep hits in `globals.css`. Phase 1's rose primary is fully replaced.

- Cool shadow (`rgba(15, 15, 20, *)`) returns 0 hits. Warm-brown two-layer shadows (`rgba(74, 56, 40, *)`) confirmed.

- Slate/zinc family returns 0 hits in `frontend/components/ui/`. No `bg-slate-*`, `text-slate-*`, `bg-zinc-*`, `text-zinc-*` classes present.

- No hardcoded `oklch(`, `rgba(`, or `#[hex]` values in any of the 15 primitive files. All color references are via semantic Tailwind token utilities (`bg-primary`, `text-foreground`, `border-border`, etc.).

- `--color-validé-tint` accented form correctly absent (per DESIGN-03 DECIDE-03 housekeeping); `--color-valide-tint` (no accent) is the canonical name in `globals.css` and in all component files.

- 60/30/10 split implemented and documented in styleguide Color section:
  - 60%: `--background` cream (6 swatch demo)
  - 30%: `--secondary` warm-taupe
  - 10%: `--primary` terracotta, `--surface-rose-100` faint terracotta wash

- Accent reserved-for list compliance:
  - Badge `default` variant uses `bg-primary` — permitted by UI-SPEC §Component Inventory which explicitly states "no color changes (variants already token-driven)" for badge.tsx
  - Tabs `after:bg-primary` for active-tab indicator — matches UI-SPEC §Component Inventory hint
  - No terracotta on body text, helper copy, secondary chrome, or decorative borders found

- Known deferred: `viewport.themeColor: "#F43F5E"` at `layout.tsx:46` — legacy rose in PWA manifest. Documented in VERIFICATION.md as Phase 9 (ONBOARD-10) target. The comment at `globals.css:64` also references `#F43F5E` in a historical note about the pre-Phase-5 token — this is inside a CSS comment and has no rendering impact.

Score: 4/4.

---

### Pillar 4: Typography (4/4)

**What was audited:** Font registration in `layout.tsx`, `@theme inline` font tokens, type-scale utility classes in `globals.css`, weight discipline.

**Strengths:**

- Font registration exact per UI-SPEC §Typography "Font registration" code block:
  - `Fraunces({ variable: "--font-display", subsets: ["latin", "latin-ext"], axes: ["opsz"], style: ["normal", "italic"], display: "swap" })`
  - `IBM_Plex_Sans({ variable: "--font-body", subsets: ["latin", "latin-ext"], weight: ["300", "400", "500", "600"], style: ["normal", "italic"], display: "swap" })`
  - `Geist_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" })`
  - `Playfair_Display` and standalone `Geist` imports absent (0 hits in `layout.tsx`)

- `latin-ext` on both Fraunces and IBM Plex Sans satisfies the French diacritic constraint (ensures `œ`, long-tail accents render without glyph substitution on iOS Safari)

- Exactly 4 type-scale classes in `@layer utilities` with values verbatim from UI-SPEC §Typography type-scale table:
  - `.text-display`: Fraunces, `clamp(2rem, 6vw, 2.75rem)`, lh 1.05, wt 500, italic, `font-variation-settings: "opsz" 96`, ls -0.02em
  - `.text-title`: Fraunces, 1.5rem, lh 1.2, wt 500, upright, `font-variation-settings: "opsz" 36`, ls -0.015em
  - `.text-body`: IBM Plex Sans, 1rem, lh 1.55, wt 400, ls -0.005em
  - `.text-caption`: IBM Plex Sans, 0.8125rem, lh 1.45, wt 400, ls 0, `color: var(--foreground-muted)` for warm-gray helper copy

- Weight discipline holds:
  - 400 (IBM Plex Sans body default) — running text only
  - 500 (Fraunces display/title) — editorial hierarchy only
  - 600 (reserved for CTAs, locked-rating labels, vote-chip pills) — not independently introduced in Phase 5; reserved for consumer phases

- One-phase alias pattern correct: `--font-heading: var(--font-display)` and `--font-sans: var(--font-body)` in `@theme inline` with explicit `/* DEPRECATED — Phase 6 sweeps */` comment. Ensures `font-heading` Tailwind utility still resolves to Fraunces through Phase 6.

- `body { font-family: var(--font-body), ... }` in `@layer base` correctly sets IBM Plex Sans as the global body face. Label, ScrollArea, Separator inherit this automatically.

- Styleguide uses only `.text-display`, `.text-title`, `.text-body`, `.text-caption`, and `font-medium` (on caption metadata labels) — no arbitrary `text-[Npx]` sizes used.

- No raw `text-xs/sm/base/lg/xl/2xl/3xl/4xl/5xl` Tailwind font-size utilities found in the styleguide page (only the semantic `.text-*` scale classes are used), demonstrating system discipline.

Score: 4/4.

---

### Pillar 5: Spacing (4/4)

**What was audited:** Spacing classes in `globals.css`, `layout.tsx`, and the `/styleguide` route against the UI-SPEC §Spacing Scale.

**Strengths:**

- Page-level layout matches UI-SPEC §Styleguide Route Layout exactly:
  `<main className="mx-auto flex max-w-2xl flex-col gap-12 px-6 pt-12 pb-24">` — `max-w-2xl`, `px-6` (24px horizontal padding), `pt-12` (48px top), `pb-24` (96px bottom), `gap-12` (48px between sections)

- `gap-12` (48px) between the 10 sections is the spec-mandated "whitespace > border headings" approach.

- Internal section spacing uses the spec's 4-multiple subset:
  - `gap-6` (24px) — section-level paragraph/card groupings
  - `gap-4` (16px) — form-field gaps
  - `gap-3` (12px) — between related inline elements (tabs, buttons row)
  - `gap-2` (8px) — compact label/input pairings
  - `gap-1` (4px) — icon-level gaps

- `p-3`, `p-4`, `p-6` padding on cards and ScrollArea — all multiples of 4.

- Exactly one arbitrary spacing value found: `h-[200px]` on the ScrollArea demo container (`page.tsx:551`). This is a reasonable fixed-height demo constraint (the spec calls for "ScrollArea with overflow content" without prescribing a specific height). Not a pattern; scoped to a single dev-only demo element.

- `px-6 pb-24` inherited from the styleguide's `<main>` is consistent with the Phase 1 / Phase 4 page shell convention (`px-6` horizontal padding, `pb-24` bottom-nav clearance).

Score: 4/4.

---

### Pillar 6: Experience Design (3/4)

**What was audited:** State coverage on the `/styleguide` route (loading, error, disabled, destructive confirmation), accessibility foundations in re-themed primitives, production gate, and documented deferrals.

**Strengths:**

- Skeleton demonstrated in 3 sizes — line (`h-4 w-32`), block (`h-20 w-full`), avatar circle (`h-10 w-10 rounded-full`). `bg-muted` resolves to warm-taupe kraft-paper color from Plan 01.

- Disabled states demonstrated for Button, Input, and Textarea — all three use shadcn's native `disabled:opacity-50` and `disabled:pointer-events-none` which correctly sets `aria-disabled` at the browser level.

- `aria-invalid="true"` demonstrated on Button, Input, and Textarea. The `aria-invalid` styling (destructive ring) is confirmed in all three primitives.

- Destructive AlertDialog pattern (`Supprimer cet élément ?` / `Cette action est définitive.` / `Annuler` / `Supprimer`) matches the UI-SPEC §Copywriting Contract placeholder and is a correct two-button confirmation pattern.

- Toast variants all 5 demonstrated: `toast()`, `toast.success`, `toast.info`, `toast.warning`, `toast.error` — confirms Sonner's warm-token configuration.

- Production gate (`process.env.NODE_ENV === "production"` → `notFound()`) confirmed at `page.tsx:133-135`. The route returns 404 in production builds.

- `prefers-reduced-motion: reduce` block in `globals.css` (lines 365-371) clamps all `animation-duration` and `transition-duration` to 0ms `!important` — covers all Tailwind utility-driven motion. The styleguide motion section includes a correct prose pointer to the OS-level kill-switch (`page.tsx:265-269`).

- `useReducedMotion()` per-consumer contract documented in UI-SPEC §Motion and noted in Plan 04 SUMMARY — Phase 7 swipe-deck is the implementation site.

- Icon-only buttons all have `aria-label` attributes (lines 320-329). Section headings use correct `h1`/`h2` hierarchy.

**Finding (score impact — deferred, not a Phase 5 gap):**

- `viewport.themeColor: "#F43F5E"` at `layout.tsx:46` — this is a legacy rose value in the PWA viewport declaration. Users who install Al Dente via "Add to Home Screen" on Safari iOS will see a rose-colored browser chrome / status bar background, contradicting the terracotta identity that Phase 5 establishes. This is explicitly documented in VERIFICATION.md as a deferred item (Phase 9, ONBOARD-10). Per audit context instructions, this is NOT scored against Phase 5. It is noted here for Phase 9 to close.

**Minor observation (no score impact):** The dark-mode toggle in the styleguide (`toggleDark`) mutates `document.documentElement.classList` directly. When React re-renders (e.g., after opening a Dialog), this class may be retained or dropped depending on hydration behavior. This is a dev-only tool in a dev-only route — no production impact. The `[darkMode, setDarkMode]` state tracks the toggle correctly for the button label.

Score: 3/4 — the -1 reflects the documented deferred themeColor gap. Since the gap is phase-planned and has a concrete Phase 9 owner, this does not block Phase 6 consumption. The styleguide's UX coverage for its scope (primitives showcase, no production flows) is otherwise complete.

---

## Registry Safety

`frontend/components.json` has `"registries": {}` — no third-party registries. Phase 5 adds zero new shadcn primitives (re-themes existing 15 in place). No registry vetting required.

Registry audit: 0 third-party blocks checked, no flags.

---

## Documented Deferrals (not scored against Phase 5)

Per audit context and VERIFICATION.md:

| Item | Location | Deferred To | Impact |
|------|----------|-------------|--------|
| `viewport.themeColor: "#F43F5E"` | `layout.tsx:46` | Phase 9 (ONBOARD-10) | PWA status bar still shows rose on iOS install |
| `font-heading` in 4 Title elements | `card.tsx:41`, `dialog.tsx:133`, `sheet.tsx:117`, `alert-dialog.tsx:126` | Phase 6 alias-removal sweep | Renders correctly via alias; cosmetic debt only |
| SheetContent `transition duration-200 ease-in-out` | `sheet.tsx:65` | Phase 6 (or retain — tw-animate-css preset lock) | Intentional per UI-SPEC §Component Inventory |
| `transitions` not imported in styleguide (only `variants`) | `page.tsx:14` | Phase 6 cosmetic sweep | Motion demos function via variant-embedded transitions |

---

## Files Audited

| File | Role | Verdict |
|------|------|---------|
| `frontend/app/globals.css` | Token system — OKLCH colors, shadows, motion tokens, paper-grain utility | PASS — all UI-SPEC values on-disk verbatim |
| `frontend/app/layout.tsx` | Font registration — Fraunces + IBM Plex Sans + Geist Mono | PASS — exact UI-SPEC registrations; themeColor deferred to Phase 9 |
| `frontend/lib/motion.ts` | Framer Motion preset module — easeCraft, durations, transitions, variants | PASS — numeric lockstep with CSS tokens confirmed |
| `frontend/public/textures/paper-grain.svg` | Texture asset — 240×240 fractalNoise, warm-brown tint | PASS — 454 bytes, all 9 required attributes confirmed |
| `frontend/app/styleguide/page.tsx` | Dev-only acceptance gate | PASS — all 10 sections, production gate, milestone-close marker |
| `frontend/components/ui/card.tsx` | Surface primitive | PASS — paper-grain, border-border, font-heading alias |
| `frontend/components/ui/dialog.tsx` | Surface primitive | PASS — paper-grain, shadow-card, bg-foreground/15 |
| `frontend/components/ui/sheet.tsx` | Surface primitive | PASS — paper-grain, shadow-card-hover, bg-foreground/15 |
| `frontend/components/ui/alert-dialog.tsx` | Surface primitive | PASS — paper-grain, shadow-card, bg-foreground/15 |
| `frontend/components/ui/select.tsx` | Surface primitive | PASS — paper-grain, shadow-card, duration-fast ease-craft |
| `frontend/components/ui/button.tsx` | Interactive primitive | PASS — transition-colors duration-fast ease-craft, h-10 default, h-11 lg |
| `frontend/components/ui/input.tsx` | Interactive primitive | PASS — h-11, transition-colors duration-fast ease-craft |
| `frontend/components/ui/textarea.tsx` | Interactive primitive | PASS — transition-colors duration-fast ease-craft, min-h-16 |
| `frontend/components/ui/tabs.tsx` | Interactive primitive | PASS — duration-fast ease-craft, after:bg-primary |
| `frontend/components/ui/badge.tsx` | Interactive primitive | PASS — transition-colors duration-fast ease-craft, rounded-4xl retained |
| `frontend/components/ui/skeleton.tsx` | Token-driven (verify only) | PASS — bg-muted resolves to warm-taupe automatically |
| `frontend/components/ui/sonner.tsx` | Token-driven (verify only) | PASS — all 4 CSS vars point to warm tokens; no paper-grain (correct per spec) |
| `frontend/components/ui/label.tsx` | Token-driven (verify only) | PASS — inherits var(--font-body) from body element |
| `frontend/components/ui/scroll-area.tsx` | Token-driven (verify only) | PASS — bg-border resolves to warm-tinted border |
| `frontend/components/ui/separator.tsx` | Token-driven (verify only) | PASS — bg-border warm-tinted |
| `.planning/phases/05-design-system-foundation/05-UI-SPEC.md` | Design contract | Reference |
| `.planning/phases/05-design-system-foundation/05-VERIFICATION.md` | 8/8 must-haves verified | Reference |
| `.planning/notes/v0.2-design-direction.md` | Anti-patterns committed | Reference |
| `.planning/phases/04-polish-w4/04-UI-REVIEW.md` | W4 baseline 20/24 | Reference |
