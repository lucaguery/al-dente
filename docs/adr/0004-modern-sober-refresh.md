---
status: accepted
date: 2026-05-21
supersedes: "Phase 5 Slow Food / Sober Kitchen visual register (terracotta sober + Cormorant Garamond + Caveat + paper-grain + patine + warm-brown shadows)"
---

# ADR-0004 — Modern Sober refresh (La Grille · Soft warmth) supersedes Sober Kitchen

## Context

The current visual register, locked in Phase 5 and refined through Phase 32 (Sober
Kitchen / Slow Food artisanal), uses Cormorant Garamond display serif + Caveat
handwritten marginalia + IBM Plex Sans body, on warm cream surface with paper-grain
SVG texture, patine ledger cards (with dog-ear, dot-grid noise, hand-stamp), and
warm-brown two-layer shadows. The register was deliberately heritage-coded — "Slow
Food artisanal" — pairing editorial cookbook typography with hand-aged paper.

Partner test on 2026-05-20: the register reads **"old, something for old people"**.
The signal stack — Cormorant 38px italic hero + Caveat marginalia slant + paper-grain
0.12 opacity multiply + ledger-card patina-3 + warm-brown shadows — collectively
codes "heirloom recipe book / grandmother's archive" rather than "daily decision tool".
The information architecture is intact (date → hero question → list → CTA → bottom nav);
the visual *expression* of sobriety is what needs replacing.

Sketch 002 (`.planning/sketches/002-refresh-direction-explorations/`) ran six
iterations:

1. Editorial / Soft / Bold — rejected as derivative ("looks like NYT / Notion / Cash App")
2. Carnet de marché / Brasserie de nuit / Tarot des dîners — rejected as too loud
3. Modern sober — Le Quotidien / La Grille / L'Édition — **La Grille retained**
4. La Grille warmth refinement — Minimal / Soft / Confident — **Soft retained**
5. Compact icon-only bottom nav — applied across 10 screens
6. Logo + splash screen — table-à-manger geometry as logomark

Partner re-test on 2026-05-21: validated.

## Decision

Adopt **La Grille · Soft warmth** as Al Dente's visual register, replacing Sober
Kitchen across `frontend/app/globals.css` and downstream components.

### Tokens

| Group | Token | Old (Sober Kitchen) | New (La Grille · Soft) |
|---|---|---|---|
| Surface bg | `--background` | `oklch(0.975 0.006 75)` warm cream | `#FAFAF7` off-white tiède |
| Surface card | `--card` | `oklch(0.99 0.005 75)` + paper-grain SVG | `#FFFFFF` flat |
| Ink | `--foreground` | `oklch(0.21 0.014 55)` warm umber | `#14110D` warm-black (more contrast) |
| Muted ink | `--muted-foreground` | `oklch(0.50 0.012 55)` | `#6F6B62` warm-leaning gray |
| Faint ink | (new) | — | `#A09A8C` |
| Border | `--border` | `oklch(0.86 0.010 55)` | `#EDEBE4` |
| Border strong | (new) | — | `#D8D4C7` |
| Accent | `--primary` | `oklch(0.50 0.10 32)` ≈ `#C8553D` (production terracotta) | `#A8523C` refined terracotta (cooler + lower chroma) |
| Accent deep | (new) | — | `#8E4330` |
| Validé tint | `--valide-tint` | `oklch(0.91 0.045 35)` wash | `#F5E5DD` solid pill |
| Validé fg | `--color-valide-foreground` | `#A8412E` (ADR-0003) | `#82371F` (deeper for on-tint legibility) |

### Type stack

| Role | Old | New |
|---|---|---|
| Display | Cormorant Garamond 500 italic | **Geist 500** (no italic) |
| Body | IBM Plex Sans 400 | **Geist 400** |
| Marginalia | Caveat 500 slant | — **dropped** |
| Data / indices / meta | (none — no mono stack) | **Geist Mono 400** |

Both Geist and Geist Mono are Google Fonts; load via `next/font/google` to keep
`font-display` swap behaviour in `frontend/app/layout.tsx`.

### Hero sizing

| Surface | Old | New |
|---|---|---|
| `.text-display` (hero) | clamp(2rem, 6vw, 2.75rem) ≈ 32-44px | **24px** Geist 500 -0.03em |
| `.text-title` | 24px Cormorant | **18px** Geist 500 -0.02em |
| `.text-page-header` | 20px Cormorant | **16-18px** Geist 500 |
| `.text-body` | 16px IBM Plex | **13-14px** Geist 400 -0.005em |
| `.text-caption` | 13px IBM Plex | **10.5-11px** Geist Mono 400 |

Modern sober uses *less* type pressure, not more. The 24px hero is the canonical
home-screen "On mange quoi ?" size.

### Shadows

**Dropped entirely.** The old `--shadow-card` two-layer warm-brown (`rgba(74, 56, 40, *)`)
is removed. Cards exist by **hairline border + radius**, not by depth. The only
exception is the deck card (Tinder) which keeps a soft ambient drop shadow because
the card-stack metaphor requires depth perception.

### Texture

**Dropped entirely.** The `.paper-grain` pseudo-element + `/textures/paper-grain.svg`
asset are removed. No noise overlay anywhere.

### Patine ledger card

**Dropped entirely.** The `.ledger-card` class (with `--patina` 0-3 scale, dog-ear,
dot grid noise, hand-stamp) is removed. The component (`LedgerCard.tsx`) is
replaced by flat row + hairline + numbered index — the keystone La Grille move.

### Marginalia register

**Dropped entirely.** The `.marginalia` + `.marginalia.slant` classes and the
`--font-marginalia` (Caveat) variable are removed. Everywhere marginalia was used
(subtitles, "validé · à cuisiner" labels, row metadata), the replacement is
Geist Mono — small, structured, data-like rather than hand-written.

### Logo

**New.** Adopt the table-à-manger geometry as the logomark — a 64×64 SVG with a
plate edge (currentColor stroke 2px), a subtle inner well (omit below 32px), two
seats at north/south (currentColor fill r=4), and a centre accent dot
(`#A8523C` fill r=3.5). The logo *is* the in-app voting scene rendered at brand
scale. Exported to `frontend/public/logo.svg` (primary), `logo-inverse.svg`
(dark backgrounds), and `logo-favicon.svg` (simplified for ≤32px).

The dot in the wordmark "Al Dente**.**" remains as a secondary brand mark. The
centre dot of the logo and the period after "Dente" share the same `#A8523C`
hex — they're the same brand atom, used in two registers (graphic / typographic).

### Bottom navigation

Icon-only, no text labels. Active tab uses the `--valide-chip` background +
accent icon (same grammar as the "validé" pill). New icon set:

| Tab | Old icon | New icon |
|---|---|---|
| Accueil | `home` | `house` |
| Recettes | `book-open` | `library-big` |
| Ajouter | `plus` | `plus` (unchanged) |
| Profil | `user` | `users-round` (two heads — signals "household") |

Heights: 36px tap pill, 20px icon, 10px radius. Total bar height 60px (vs old 68px).
**Production note**: each `.nav-tab` MUST receive `aria-label="Accueil"` etc. — without
visible labels, VoiceOver reads only "image" and the nav becomes unusable to screen
readers.

### Member colors

Production currently keeps 5 named slots (rose / amber / emerald / sky / violet)
in `frontend/lib/colors.ts` + `backend/app/colors.py`. La Grille's table-à-manger
on Accueil collapses display to 2 visible identities (ink for first member, muted
for second). The 5-slot model is preserved in tokens for productize-later (3+ member
households), but not surfaced in the Soft warmth Accueil scene.

## Considered Alternatives

- **Editorial Modern (sketch 002 round 1, variant A)** — Fraunces variable serif +
  Inter + pure white + cinnabar accent + gilt foil for Validé. Rejected as too
  derivative ("looks like NYT Cooking / magazine spread"). Also preserved a serif
  in the hero, which was load-bearing in the "old" reading.

- **Soft Modern (sketch 002 round 1, variant B)** — Geist only + warm off-white +
  sage primary + rounded-2xl cards. Rejected as derivative ("looks like Notion /
  Things / Headspace") and because dropping terracotta DNA lost too much of Al
  Dente's identity.

- **Bold & Tactile (sketch 002 round 1, variant C)** — Inter Tight Heavy + warm
  peach + electric cherry + mint Validé. Rejected as too loud / "fintech".

- **Carnet de marché (sketch 002 round 2)** — brutalist editorial with Bricolage
  Grotesque + JetBrains Mono + yellow highlighter for Validé. Rejected as too
  loud despite being conceptually rich.

- **Brasserie de nuit (sketch 002 round 2)** — dark aubergine + Instrument Serif
  italic + amber neon. Rejected — dark-mode-first was too radical a commitment.

- **Tarot des dîners (sketch 002 round 2)** — parchment + gilt + plum + Spectral
  italic + roman numerals + suit icons. Rejected as too whimsical / "witchy".

- **Le Quotidien (sketch 002 round 3, variant 1)** — Mona Sans + bone-warm
  surface + refined terracotta. Close runner-up to La Grille. Lost because La
  Grille's grid + numbered indices + Geist Mono data-stack felt more *systemically*
  modern (the architecture carries the brand, not the color alone). Le Quotidien
  remained "color-led" which is the same answer Sober Kitchen gave, just refined.

- **L'Édition (sketch 002 round 3, variant 3)** — Geist + Newsreader italic
  + ink-blue accent. Rejected because the italic-serif moments risked re-introducing
  the editorial-cookbook reading that we were escaping from. Also dropped terracotta
  for ink-blue, which lost brand continuity.

- **La Grille · Minimal warmth (sketch 002 round 4, variant A)** — same La Grille
  but kept pure white surface. Rejected as too cold — "studio site" rather than
  "kitchen tool".

- **La Grille · Confident warmth (sketch 002 round 4, variant C)** — bone-cream
  surface + production terracotta `#C8553D`. Rejected because the production
  terracotta still reads as 1970s ceramic-tile (the existing complaint). The
  cooler refined `#A8523C` in variant B is the load-bearing color decision.

## Consequences

### Phase plan (productize via `/gsd-plan-phase`)

Wave-based execution recommended, each wave one atomic commit, no backcompat
(per MVP rule in CLAUDE.md):

| Wave | Scope | Notes |
|---|---|---|
| 1 | Token swap in `frontend/app/globals.css` | Purely visual. Drops `--font-marginalia`, `--patina`, `--shadow-card` warm-brown, `paper-grain` SVG asset. Adds Geist + Geist Mono via `next/font/google`. Surface, ink, accent, border tokens swapped to hex values above. |
| 2 | Shared component refits | `Card`, `Button`, `BottomNav`, `Input` (search + composer). Bottom nav becomes icon-only with aria-labels. Drop `LedgerCard.tsx` entirely (replaced by flat row pattern). |
| 3 | Screen refits | `HomeDecide`, `RecipeForm`, `Bibliothèque` (both list and grid views), `RecipeDetail` (cookbook), `RecipeThread`, `Profil`, `Onboarding`. Apply numbered indices pattern. |
| 4 | Logo integration | Replace `BrandIcon.tsx` (Cormorant brand draw) with `<AlDenteMark>` component reading `/logo.svg`. Update `frontend/app/apple-icon.tsx` + `frontend/app/icon.tsx` to use the cream/ink/accent app-icon variants. Add splash screen (the existing PWA splash currently uses brand-mark loader; replace). PWA manifest icons. |
| 5 | Cleanup | Remove unused: Cormorant Garamond + Caveat + IBM Plex Sans Google Fonts imports (only if no remaining usage). Remove `/textures/paper-grain.svg`. Remove `.marginalia.*` utility classes. Remove `--patina`, `--font-marginalia` from `:root`. |

### Documents that need updating downstream

- `docs/design-system.html` — superseded by sketch 002 Composants tab. Decision deferred:
  the sketch HTML can be promoted to replace `design-system.html` *after* wave 5
  completes, so the doc stays in sync with code. Until then, a banner at the top of
  the file points to ADR-0004 + the sketch.
- `CONTEXT.md` — no vocabulary changes (capture / turn / thread / advisory / table-à-manger
  remain the locked terms). The "marginalia" entry needs a status banner: superseded.
- `SPEC.md` — historical document, gets an inline supersede banner pointing here.
- `frontend/CLAUDE.md` — drop the "lint authority" implication that the design tokens
  are stable; add a pointer to ADR-0004 during the migration window.

### Risk register

- **VoiceOver regression on nav bar** — biggest accessibility risk. Aria-labels must
  be added in wave 2 alongside the icon-only nav, not deferred.
- **Photography composition shift** — La Grille's cool-leaning warm surface
  (`#FAFAF7`) composes differently against food photography than Sober Kitchen's
  warm cream. The `/demo-fixtures/*.svg` placeholders may need re-cropping; real
  photos via Supabase Storage may need warmer-bias post-processing. Defer to a
  photography spike if needed.
- **Member color rendering on Accueil** — current production renders 5 named slots
  (rose/amber/emerald/sky/violet). The Soft warmth Accueil scene shows only 2 (ink
  + muted gray). Productize-later: when household > 2 members, the table-à-manger
  needs a 3+ seat variant — out of scope for this ADR.
- **iOS Add-to-Home-Screen icon shift** — the home-screen icon will visibly change
  for existing PWA installs after wave 4. Communicate in release notes; no rollback
  plan since MVP.

### Things that are NOT changing

- **Information architecture** — date → hero question → 4-row shortlist → CTA →
  bottom nav. Same flow across all 10 screens. Same 4 main tabs (Accueil, Recettes,
  Ajouter, Profil).
- **French copy + locked vocabulary** — no terminology drift.
- **Table-à-manger voting concept** — the 5-state semantics (Validé / Pressenti /
  Contesté / Rejeté / Sans avis) remain computed from `services/voting.compute_vote_state`
  per [ADR-0001 invariant #2](./0001-recipe-conversation-thread.md). Only the visual
  treatment changes.
- **Terracotta DNA** — the brand color survives; it's refined (`#A8523C` cooler +
  lower chroma than the previous `#C8553D`), not replaced.

## Verification

- Sketch 002 lives at `.planning/sketches/002-refresh-direction-explorations/index.html`
  as the canonical visual reference. Two tabs: Écrans (10 phones) + Composants (16
  sections including Logo & brand, Color palette, Type scale, Migration deltas table).
- `themes/grille-warm.css` carries the token definitions, ready to port to
  `frontend/app/globals.css` in wave 1.
- Logo SVG exported to `frontend/public/logo.svg` (primary), `logo-inverse.svg`
  (dark variant), `logo-favicon.svg` (simplified ≤32px). Source viewBox is 64×64.
