---
walkthrough_date: 2026-05-21
viewport: 390x844 (iPhone)
auth: test-token-luca (Luca, household TEST01 « Foyer Test ») + brief test-token-partner for pre-vote deck capture
environment: local dev (frontend :3000 webpack/turbopack dev, backend :8001 ENVIRONMENT=test, postgres :5433) — Phase 27 thread + 5 vote states seeded
living_system: ADR-0004 La Grille · Soft warmth (shipped 2026-05-21, 5 commits — 1989f74 / c421e8d / c50e7b0 / 866e0d6 / f767f16)
cross_check_reference: .planning/sketches/002-refresh-direction-explorations/index.html (Écrans + Composants)
screens_covered: [Splash/logo, Accueil pre-vote deck, Accueil post-vote ledger, Bibliothèque grille, Bibliothèque liste, Bibliothèque patine, Recette detail, Capture empty (table-à-manger logomark), Capture « Ajouter » sheet, Capture URL paste → BackgroundTask promotion, CookingLog history, Settings/Profil, BottomNav (4 tabs + central CTA, active states on Accueil/Recettes/Profil)]
total_findings: 13
findings_bugs: 3
findings_polish: 4
findings_design_drift: 6
---

# UI Walkthrough Punch List — 2026-05-21

## Summary

ADR-0004 La Grille · Soft warmth has landed cleanly at the token and primitive
layer — Geist 24px 500 hero, Geist Mono Mono indices, `#FAFAF7` ground,
`#A8523C` refined terracotta, hairline-only cards, table-à-manger logomark on
splash + capture empty, icon-only nav with `valide-tint` active pill + correct
new icon set (`house` / `library-big` / `plus` / `users-round`). Zero Cormorant,
zero Caveat, zero IBM Plex, zero `paper-grain.svg`, zero `--shadow-card`,
zero `.ledger-card` / `.marginalia` / `--patina` / `--font-marginalia` tokens
or classes survive in the served bundle.

The drift is concentrated in three places: (1) the **Patine view switcher**
on Bibliothèque is still rendered as a third radio (Héritage / Habitudes /
À l'essai sections still populate, even though the ledger-card CLASS is gone)
— a Wave 5 cleanup miss; (2) the **Recipe detail Ingrédients section keeps a
3px terracotta-30 left margin-rule** — Sober Kitchen §15.C cookbook-gesture
residue at the SECTION CSS level; (3) the **Accueil ledger member avatars still
render with vivid rose + emerald** (5-slot model) instead of the ADR-prescribed
ink + muted-gray collapse for the 2-member household scene.

Single most damning evidence pointer: open `.scratch/walkthrough/C1-recette-detail.png`
and you see a clear terracotta vertical rail along the Ingrédients heading and
its rows — the keystone Sober-Kitchen "cookbook ribbon" still wired into a
section. The numbered indices and Mono notes around it are perfect; only the
border-left needs to lose 3px.

Secondary issue: the **« Active les notifications » banner on Accueil overlaps
the fixed BottomNav by 108px** in the post-vote ledger view — the ledger
layout's bottom padding isn't accounting for the 60px nav + safe-area. The
banner becomes uninteractable.

## Section 1 — Bugs / Broken behavior

### B-01 — Notification banner overlapped by fixed BottomNav on Accueil ledger (108px clip)
- **Severity:** P1
- **Screen:** Accueil `/` post-vote ledger composition (`HomeDecide` ledger branch)
- **Repro:**
  1. Auth as Luca (`document.cookie = "aldente_auth=test-token-luca; ..."`)
  2. Navigate to `/` — seed votes give post-vote ledger view
  3. Scroll to bottom (or just look at viewport, banner is below the « Cuisiner ce soir » CTA)
- **Expected:** Banner sits cleanly above the 60px nav with safe-area clearance.
- **Actual:** Banner top=619.89px, bottom=757.89px, height=138px. Nav top=784, bottom=844. Banner overflows the viewport bottom (≈58px clipped) AND the nav fixed at top=784 covers a further 50px of banner content. Net: the « Activer » + « Pas maintenant » row is rendered but the banner body is half-covered, and on the lower scroll position both buttons become covered by nav.
- **Evidence:** `.scratch/walkthrough/A1-accueil-post-vote.png` (visible at y≈760+ the « Pas maintenant » button is half-hidden behind the floating «+» CTA + nav). Programmatic check returned `{ banner.bottom: 757.89, nav.top: 784, overlap: true, overlapPx: 107.89 }` via `browser_evaluate`.
- **Suspected cause:** The `<main>` wrapper uses `pb-[calc(5rem+env(safe-area-inset-bottom))]` (verified on recipe detail) but the **Accueil ledger** main container doesn't apply this. The deck composition does (verified — Partner view shows no overlap). Likely the ledger branch of `HomeDecide.tsx` doesn't share the deck branch's safe-area padding.

### B-02 — Cuisine pill of nav covers list rows on Bibliothèque Liste + Patine views
- **Severity:** P2
- **Screen:** `/recipes` Liste view (`B2-bibliotheque-liste.png`) and Patine view (`B3-bibliotheque-patine.png`)
- **Repro:** open `/recipes`, switch to Liste; the elevated central « + » CTA (translateY -3) sits on top of row 06 « Poulet teriyaki » mid-card.
- **Expected:** Either (a) `<main>` clears the elevated central CTA's effective height (~ 60+12 = 72px) via bottom padding, or (b) list rows scroll under the nav cleanly (which they do — but the elevated nub still occludes the upper-row content because it's not part of the nav rect for padding purposes).
- **Actual:** The « + » nub renders at viewport-bottom translateY -3 above the nav, occluding ~28px of the row beneath, with no scroll-clear margin.
- **Evidence:** `.scratch/walkthrough/B2-bibliotheque-liste.png` (visible cover over row 06) — see also `B3-bibliotheque-patine.png` over the "Ragu bolognese / Poulet au citron / Coq au vin" row.
- **Suspected cause:** Same root as B-01 — the bottom padding accounts for nav height 60px but not for the -12px elevation of the « + » nub (so effective foot = 72px not 60px).

### B-03 — 48× recipe `photo-url` 404s during Bibliothèque load (silent self-heal but loud console)
- **Severity:** P3
- **Screen:** `/recipes` grid + list + patine (any view that mounts `useSignedPhotoUrl` for seeded recipes)
- **Repro:** Authenticated, navigate to `/recipes`. Browser console shows ~10 errors per view switch — 48 errors total across the walk for 5 recipes (Ragu bolognese, Coq au vin, Butter chicken, Shawarma, Tacos au boeuf).
- **Expected:** Either the seed populates photos in Supabase Storage so `photo-url` returns 200, OR the seed doesn't register `photo_paths` for recipes whose photos won't exist. The self-heal fallback in `useSignedPhotoUrl` works (UI shows nice SVG placeholders), but the network errors are noisy and may mask real bugs in CI.
- **Actual:** `GET /api/recipes/{id}/photo-url?path=...` returns 404 for 5 recipes whose `photo_paths` were registered by seed. UI degrades correctly to placeholder.
- **Evidence:** `browser_console_messages({all: true, level: 'error'})` returns 48 entries, all `/api/recipes/{id}/photo-url ... 404`.
- **Suspected cause:** Seed registers `photo_paths` on certain recipes (Ragu bolognese, Coq au vin, Butter chicken, Shawarma, Tacos au boeuf) but the synthetic photo files aren't uploaded to the Supabase `recipe-photos` bucket. Either the seed script should upload, OR it should leave `photo_paths=[]` and rely on the SVG placeholder being the canonical demo state.

## Section 2 — UI Polish

### P-01 — Dialog « Close » button label is in English on French-only app
- **Screen:** Capture « Ajouter » sheet (`/recipes/new` → tap +), and the nested « Coller un lien » dialog inside the sheet
- **Observation:** Snapshot shows `button "Close"` with a generic child reading literally "Close" in both dialogs. Visible to screen readers, hidden visually behind the × icon.
- **Suggestion:** Pass `aria-label="Fermer"` (or set the `sr-only` text via `next-intl` key) on the Radix Dialog close button. Architecture invariant #6 (French-only via `next-intl`) is being bypassed.
- **Effort:** XS

### P-02 — Central « + » CTA elevated by translateY but missing `box-shadow`
- **Screen:** BottomNav across all surfaces
- **Observation:** ADR-0004 §Bottom nav says the central CTA's elevation comes from "negative translateY + box-shadow". Inspection shows `transform: translateY(-3px)` (via Tailwind `-translate-y-3` which is actually -12px, not -3) but `boxShadow: none`. The shape elevates visually because of the negative translate against the off-white surface and the ink-black fill, but it lacks the subtle ambient shadow the spec describes — visually it can look "stuck" rather than "lifted".
- **Suggestion:** Add a soft drop shadow on the `span.bg-foreground.w-14.h-14.-translate-y-3` — e.g. `shadow-[0_4px_12px_-4px_rgba(20,17,13,0.25)]`. Same drop shadow grammar as the deck card (which already has `0px 8px 24px -8px rgba(20,17,13,0.18)`).
- **Effort:** XS

### P-03 — Accueil swipe-deck heart action grammar reads as two identical hearts
- **Screen:** Accueil `/` pre-vote deck (Partner view, `A2-accueil-deck-prevote.png`)
- **Observation:** The two action buttons under the deck card are both heart glyphs — left is an outlined-heart (no vote / dismiss), right is a filled-terracotta heart (yes vote). The aria-labels (« Pas envie ce soir » / « J'aime cette recette ») are clear, but the visual grammar is "two hearts" which doesn't read as "no / yes". Sketch 002 Composants tab shows yes = heart-fill / no = X or empty-circle.
- **Suggestion:** Replace the outlined-heart with a "no" affordance — either an X glyph in muted-foreground inside the circle, or the slashed heart icon (`lucide-heart-off`). The current binary heart-outline + heart-fill is a Tinder convention but doesn't match the table-à-manger semantic of the rest of the system.
- **Effort:** S

### P-04 — Recipe detail step "marginal comment" connector is a faint dotted line — clarity could improve
- **Screen:** Recette detail `/recipes/<id>` (`C1-recette-detail.png`)
- **Observation:** Between Step 01 « Faire revenir. » and Step 02 « Mijoter 1h. » the seed inserted a free-form note « Excellent ce soir. » rendered in muted Geist Mono 11px with a dashed continuation line. This is the new La Grille replacement for the dropped Caveat marginalia (ADR-0004 §Marginalia register), and it works — but the dashed line is hard to read at 11px and the visual reads more like a "broken step" than "side note from a previous cook". Consider a left vertical Mono-thin rule + indent instead of a dashed horizontal connector.
- **Suggestion:** Replace the dashed-horizontal connector between the note and the next step with a left-side `border-l border-faint-ink/30 pl-3` indent — matches the data-list grammar the rest of La Grille uses.
- **Effort:** S

## Section 3 — Design-system drift (vs ADR-0004 La Grille · Soft warmth)

### D-01 — Patine view switcher (Héritage / Habitudes / À l'essai) still exists on Bibliothèque
- **Locked spec:** ADR-0004 §Patine ledger card "Dropped entirely. The `.ledger-card` class (with `--patina` 0-3 scale, dog-ear, dot grid noise, hand-stamp) is removed. The component (`LedgerCard.tsx`) is replaced by flat row + hairline + numbered index — the keystone La Grille move." ADR-0004 §Phase plan wave 5 cleanup: "Remove `--patina`, `--font-marginalia` from `:root`." Sober Kitchen §15.B View C (the Héritage / Habitudes / À l'essai sectioning) is the source of the Patine concept.
- **As implemented:** The radiogroup "Vue de la bibliothèque" on `/recipes` still offers three options: **Grille** / **Liste** / **Patine**. Selecting Patine renders sections with headings `Héritage · 1`, `Habitudes · 0`, `À l'essai · 20` — the legacy "patina age bucket" segmentation from Sober Kitchen lives on as IA even though the ledger-card visual is correctly flattened to white card + hairline.
- **Delta:** The CSS-level cleanup of `--patina` and `.ledger-card` is complete (none survive in the served stylesheet — confirmed via `Array.from(document.styleSheets)...` scan; `document.querySelectorAll('.ledger-card, .paper-grain, [class*="patina"], [class*="ledger"]').length === 0`). But the **information architecture** of the Patine view (the section concept) is a Sober Kitchen survival that the new register does not require. ADR-0004 calls for the view to be replaced wholesale by the flat-row Liste pattern, not co-existing as a third option.
- **Suggested fix:** Either (a) remove the Patine radio entirely so only Grille + Liste remain, OR (b) re-purpose the Patine label as a different filter (e.g. "Récentes") if the heritage/habitudes/à-l'essai concept survives as a productize-later. Given the ADR is unambiguous about the removal, option (a) is the closer fit.
- **Evidence:** `.scratch/walkthrough/B3-bibliotheque-patine.png`. Snapshot showed `radio "Patine"` and headings `Héritage`, `Habitudes`, `À l'essai`.

### D-02 — Recipe detail Ingrédients section keeps a 3px terracotta-30 left margin-rule (Sober Kitchen cookbook gesture)
- **Locked spec:** ADR-0004 §Shadows + §Hero sizing imply ingredients should be a clean numbered-Mono list with hairline border ONLY at the card boundary. ADR-0004 §Tokens drops `--shadow-card` and migrates ALL warm-brown / terracotta-tint surface effects in favour of "hairline border + radius". Sober Kitchen §15.C had a left "margin-rule" in terracotta-30 to evoke the cookbook ribbon — that gesture is not preserved in the new register.
- **As implemented:** `<section>` wrapping the Ingrédients heading + row has `border-left: 3px solid oklch(0.540279 0.118683 35.4269 / 0.3)` — a 30%-alpha terracotta vertical bar. The padding-left is 12px to clear the rule.
- **Delta:** This is the cookbook-ribbon Sober Kitchen residue, applied at the section level. The rest of the recipe-detail surface (hero gradient, meta pills, step rows, summary bubble) is all on-spec for La Grille; this one CSS declaration is the lone holdout from the old register.
- **Suggested fix:** Remove the `border-left: 3px solid oklch(0.54 0.12 35.43 / 0.3)` from the Ingrédients `<section>` style. The numbered Mono indices (`01 500 g boeuf hache`) carry enough structural pressure on their own.
- **Evidence:** `.scratch/walkthrough/C1-recette-detail.png` — visible terracotta vertical bar along the left edge of the Ingrédients block, ~3px wide, ~30% alpha. Verified via `browser_evaluate getComputedStyle(...).borderLeft` returning `"3px solid oklch(0.540279 0.118683 35.4269 / 0.3)"` on the section ancestor of the Ingrédients heading.

### D-03 — Accueil ledger member avatars use vivid rose + emerald instead of ink + muted-gray collapse
- **Locked spec:** ADR-0004 §Member colors: "La Grille's table-à-manger on Accueil collapses display to 2 visible identities (ink for first member, muted for second). The 5-slot model is preserved in tokens for productize-later (3+ member households), but not surfaced in the Soft warmth Accueil scene." Sketch 002 Composants tab + Wave 3 screen refits exemplify this collapse.
- **As implemented:** On the Accueil ledger view, each row's left-side avatar pair shows Luca as a filled circle `rgb(192, 54, 74)` (vivid rose) with "L", and Partner as a filled circle `rgb(13, 138, 100)` (vivid emerald) with "P". Same 5-slot vivid colors used everywhere else in the app — `--color-member-rose-bg` + `--color-member-emerald-bg` per the CSS token dump.
- **Delta:** The Accueil-specific collapse to ink + muted-gray (the spec ADR-0004 was explicit about) is not surfaced. The token mechanism for the collapse is available (`--foreground` for ink, `--muted-foreground` for muted) but the components still bind to the per-member slot variables. Wave 3 screen refit is incomplete here.
- **Suggested fix:** In the Accueil ledger composition only (NOT Settings, NOT cooking logs — those keep distinct identities), override the avatar bg/color from `--color-member-{slot}` to `--foreground` (first member) + `--muted-foreground` (second member). Keep the L/P glyphs.
- **Evidence:** `.scratch/walkthrough/A1-accueil-post-vote.png` — visible rose Luca dot + emerald Partner dot on every row. `browser_evaluate` returned `lucaAvatar: { bg: "rgb(192, 54, 74)" }, partnerAvatar: { bg: "rgb(13, 138, 100)" }`.

### D-04 — Pre-vote deck "Luca" identity pill uses vivid rose, sketch shows ink
- **Locked spec:** Same as D-03 — ADR-0004 §Member colors. Sketch 002 Écrans tab deck card shows the active-voter chip as ink + small terracotta dot, not a rose dot.
- **As implemented:** On the Accueil pre-vote swipe deck (Partner viewing Coq au vin), the bottom-right of the card shows a small rose dot + « Luca » label — indicating Luca has already voted yes. Color is vivid rose `#F43F5E` family.
- **Delta:** Same root cause as D-03 — the slot color leaks into a surface where ADR specifies the collapse.
- **Suggested fix:** Change the "who voted so far" indicator on the deck card to use `--foreground` for the first-voter dot, regardless of slot.
- **Evidence:** `.scratch/walkthrough/A2-accueil-deck-prevote.png` — bottom-right of the deck card, small rose dot + « Luca ».

### D-05 — `docs/design-system.html` not updated to match new register (frontmatter still describes Sober Kitchen as canon)
- **Locked spec:** ADR-0004 §Documents that need updating: "`docs/design-system.html` — superseded by sketch 002 Composants tab. Decision deferred: the sketch HTML can be promoted to replace `design-system.html` *after* wave 5 completes, so the doc stays in sync with code. Until then, a banner at the top of the file points to ADR-0004 + the sketch."
- **As implemented:** Per `CLAUDE.md`: "**`docs/design-system.html` is historical** — it documents the retired Sober Kitchen register (Cormorant + Caveat + paper-grain + patine + warm-brown shadows); do NOT mirror its tokens into new code." So the banner-only deferral is in place at the CLAUDE.md level. But: the **uat-tester agent prompt** at `.claude/agents/uat-tester.md` still references `docs/design-system.html` §15.A / §15.B / §15.C / §11 as the authoritative locked-mockups source, and instructs the agent to verify H1 is Cormorant + marginalia is Caveat. The user flagged this in the brief.
- **Delta:** Cross-document drift — the design-system.html supersede is communicated in CLAUDE.md but not yet reflected in the agent prompt that consumes it. Mid-walk, a less-suspicious agent could falsely flag the absence of Cormorant as a regression.
- **Suggested fix:** Update `.claude/agents/uat-tester.md` to (a) point to ADR-0004 as the design contract instead of design-system.html, (b) replace the H1=Cormorant / marginalia=Caveat assertions with H1=Geist 24px / no Caveat, (c) keep the Phase-27 thread + sheet description and the table-à-manger logomark spec, (d) acknowledge `docs/design-system.html` is historical.
- **Evidence:** Caller called this out explicitly. Verified by reading the agent file head (referenced in the system prompt §required reading list).

### D-06 — Locale "Italienne" wrongly assigned to Poulet au citron (data drift, not UI drift, but worth noting)
- **Locked spec:** Locked vocabularies (frontend `lib/enums.ts` / backend `app/models/enums.py`) — `Cuisine` enum has `italian` and `french` as distinct values; "Poulet au citron" is a French recipe.
- **As implemented:** Bibliothèque Liste view shows « Poulet au citron » with cuisine pill « Italienne ». Confirmed by inspecting the article text node (`"02Poulet au citronItalienne · il y a 5 jours"`).
- **Delta:** Not a register / token / typography drift — this is seed data assigning the wrong cuisine. Surfacing here because the brief asked to verify `useEnumLabels` coverage (cuisine → French label). The label mapping is CORRECT — `italian → "Italienne"`. The seed value is wrong.
- **Suggested fix:** Update the seed fixture for « Poulet au citron » to `cuisine=french` (not `italian`). Out of scope for the UI refit, but worth a Quick.
- **Evidence:** `.scratch/walkthrough/B2-bibliotheque-liste.png` row 02.

## Migration completeness verdict

Score each ADR-0004 wave PASS / PARTIAL / FAIL with one-line justification + most damning evidence pointer.

| Wave | Score | Justification | Most damning evidence |
|---|---|---|---|
| **1 — Token swap in `globals.css`** | **PASS** | All target tokens present at correct hex values; old tokens (`--font-marginalia`, `--patina-*`, warm-brown `--shadow-card`, `--paper-grain-*`) absent. `getComputedStyle(:root)` returns `--background: #fafaf7`, `--card: #fff`, `--foreground: #14110d`, `--primary: #a8523c`, `--valide-tint: #f5e5dd`, `--color-valide-foreground: #82371f`. Geist + Geist Mono loaded via `next/font/google`. Zero Cormorant / Caveat / IBM Plex links in network log. | Token dump in `browser_evaluate` returned exact ADR-0004 hex values. |
| **2 — Shared primitives** | **PASS** | `Card` is white + hairline + no shadow (verified on Bibliothèque grid `border: 1px solid rgb(237, 235, 228), boxShadow: none`); `Button` ink-black ground at 48px 10px radius; `BottomNav` is icon-only 60px with valide-tint active pill (`rgb(245, 229, 221)` bg + `rgb(168, 82, 60)` icon on active tab) and all four `aria-label`s present (`Accueil` / `Recettes` / `Ajouter` / `Profil`); `Input` (search + composer) is hairline. **Risk register #1 (VoiceOver) fully addressed**. | Bottom-nav `browser_evaluate` dump: `links: [{ aria: "Accueil"... }, { aria: "Recettes"... }, { aria: "Ajouter"... }, { aria: "Profil"... }]`. |
| **3 — Screen refits (10 canonical)** | **PARTIAL** | The visual register is correct on every surface walked (hero size, type, hairlines, numbered indices, Mono meta), BUT three Sober Kitchen residues remain: (a) Recipe detail Ingrédients keeps the 3px terracotta-30 left margin-rule [D-02]; (b) Accueil ledger member avatars still vivid rose+emerald instead of ink+muted [D-03]; (c) deck-card identity pill same drift [D-04]. None of these block the register reading, but each is an unambiguous ADR-0004 violation. The Bibliothèque grid + list views, capture thread + sheet, settings, cooking-logs are all on-spec. | `C1-recette-detail.png` terracotta vertical bar on Ingrédients section; `A1-accueil-post-vote.png` rose/emerald avatars. |
| **4 — Logomark + splash + apple-icon** | **PASS** | `/logo.svg` returns the exact 64×64 viewBox + plate-edge + inner-well 0.22-opacity + two seats r=4 + center `#A8523C` dot per ADR-0004 §Logo. `/logo-inverse.svg` and `/logo-favicon.svg` serve 200. `/apple-icon` renders the table-à-manger on cream surface (visible in `.scratch/walkthrough/S2-apple-icon.png`). The capture empty state at `/recipes/new` uses the same logomark as a generous in-app brand-mark. No `<BrandIcon>` Cormorant-draw residue found in the snapshot. | `S2-apple-icon.png` + `curl /logo.svg` showing the exact spec'd geometry; `D1-capture-empty.png` showing the same mark embedded in the empty state. |
| **5 — Cleanup** | **PARTIAL** | CSS-level cleanup is complete (no `.ledger-card` / `.paper-grain` / `.marginalia` rules survive; no `--patina-*` / `--font-marginalia` / `--shadow-card` warm-brown tokens; `/textures/paper-grain.svg` is 404). BUT the **Patine view IA on Bibliothèque** still exposes a third radio button + Héritage/Habitudes/À l'essai sections [D-01] — the conceptual Patine survives the visual Patine's removal. Net: ledger-card class file deletion ≠ Patine view removal; one wasn't enough. | `B3-bibliotheque-patine.png` clearly shows the Patine radio selected + the three sectional headings populating. |

**Aggregate verdict — 3 PASS / 2 PARTIAL / 0 FAIL.** ADR-0004 ships at ~85% completeness against its own spec. The remaining 15% is two cleanup misses (the Patine IA, the section CSS rule) and one wave-3 surface incompleteness (the Accueil member-color collapse). All five must-have cleanups (Cormorant, Caveat, Plex, paper-grain, warm-brown shadows) are 100% gone. The migration is shippable; D-01 + D-02 + D-03 are productize-now follow-ups (XS / XS / S effort).

## Appendix: Coverage map

| Screen | Snapshot | Screenshot | Errors |
| --- | --- | --- | --- |
| Splash / brand-mark (via capture empty + /apple-icon) | yes (D1) | `D1-capture-empty.png`, `S2-apple-icon.png` | 0 |
| Accueil — post-vote ledger (Luca) | yes (A1) | `A1-accueil-post-vote.png` | 2 (recipe photo 404s, silent self-heal) |
| Accueil — pre-vote deck (Partner) | yes (A2) | `A2-accueil-deck-prevote.png` | 0 |
| Bibliothèque — Grille view (default) | yes (B1) | `B1-bibliotheque-grid.png` | 10 (photo 404s) |
| Bibliothèque — Liste view | yes (B2) | `B2-bibliotheque-liste.png` | +10 photo 404s |
| Bibliothèque — Patine view | yes (B3) | `B3-bibliotheque-patine.png` | +10 photo 404s |
| Recette detail (Ragu bolognese, with seed cooking log + marginal note) | yes (C1) | `C1-recette-detail.png` | 2 |
| Capture empty state — table-à-manger logomark | yes (D1) | `D1-capture-empty.png` | 0 |
| Capture « Ajouter » sheet (3 options) | yes (D2) | `D2-capture-sheet.png` | 0 |
| Capture URL paste — URL staged | yes (D2-staged) | `D3-capture-url-staged.png` | 0 |
| Capture URL paste — promoted (BackgroundTask) | yes (D4) | `D4-capture-url-promoted.png` | 0 |
| Cooking log history (3 seeded logs) | yes (F1) | `F1-cooking-logs.png` | 0 |
| Settings / Profil (Luca + Partner, invite TEST01, v0.7.1) | yes (G1) | `G1-settings.png` | 0 |
| BottomNav — active state on Recettes (valide-chip + accent icon) | yes (S1) | `S1-recipes-bottomnav-active.png` | n/a |

## Appendix: Tooling notes

For the next agent invocation:

1. **The uat-tester agent prompt is stale per ADR-0004 (Findings D-05).** Update it
   to reference ADR-0004 + sketch 002 Composants tab as design contract, not
   `docs/design-system.html` §15.*. The H1=Cormorant / marginalia=Caveat
   assertions are inverted: correct values are H1=Geist 24px, no Caveat.

2. **Cookie-based auth (Recipe B) worked first try.** `document.cookie =
   "aldente_auth=test-token-luca; path=/; SameSite=Lax"` then immediate
   re-navigate — pattern is reliable. `test-token-partner` works for the
   pre-vote deck view since Partner hasn't voted yet on most shortlist items.

3. **Bottom-nav central « + » is the third nav-tab (Ajouter), not a separate
   FAB.** The elevated visual comes from `bg-foreground w-14 h-14 -translate-y-3`
   on the inner `<span>` of the Ajouter link, with no box-shadow. The agent
   spec's "negative translateY + box-shadow" is partially satisfied (translate
   only) — see P-02.

4. **`browser_console_messages` with `{all: true}` only shows the LAST
   navigation's level filter** — when polled with `level: 'error'` after
   several navigations, you get the aggregate count but only post-last-nav
   message bodies. Capture errors via `{all: true, level: 'error'}` after EACH
   nav if you want full traceability.

5. **`useSignedPhotoUrl` 404 cascade** is the dominant console-noise source.
   The seed registers `photo_paths` on ~5 recipes but doesn't upload the
   synthetic photos to Supabase Storage. UI self-heal to placeholder works
   (no visible UX problem) but the 48 errors per walk make it hard to spot
   real failures. Consider gating console-error assertions on these specific
   404 URLs.

6. **Backend on :8001 — confirm the proxy route is healthy first.** This walk
   was started against frontend :3000 with `RAILWAY_URL=http://127.0.0.1:8001`
   threaded through. `curl /api/healthz` returned 200; proxy works as
   advertised. The default :8000 was squatted by VS Code Helper — useful
   reminder.

7. **The Patine view is the cleanup miss most likely to confuse a casual
   walk-through** because the cards inside ARE the new flat-row pattern. The
   tell is the radio label "Patine" and the section headings "Héritage /
   Habitudes / À l'essai". Only the view switcher + IA need to go; the
   render path is already on-spec.

8. **The Recipe detail terracotta margin-rule is a single CSS declaration**
   at the `<section>` ancestor of the Ingrédients heading. Detected by walking
   up the DOM from the heading and checking `getComputedStyle().borderLeft`
   at each ancestor. Took 6 levels to find — worth noting that border-left
   inheritance / cascade can hide one-line residues in deeply-nested
   compositions.
