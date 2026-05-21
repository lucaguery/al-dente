# Screens & Layouts · 10 canonical screens

Sketch 002 validates the visual register across 10 screens. All share the
same chrome grammar: **top bar → hero → list/content → CTA → bottom nav**.

Live reference: [sources/002-refresh-direction-explorations/index.html](../sources/002-refresh-direction-explorations/index.html)
tab **Écrans**.

## Shared chrome grammar

Every screen has:
1. **Top bar** (`.top`) — 11px Geist Mono brand on left, 11px Geist Mono date
   on right, hairline border-bottom
2. **Hero** (`.hero`) — 24px Geist 500, -0.03em tracking, single line in most
   cases
3. **Sub / crumbs** — Geist Mono crumb chips (mono micro register) or italic
   accent tagline for variety
4. **List/grid** — flex column, hairline dividers between rows, numbered
   indices as keystone visual
5. **CTA** (`.cta`) — ink-filled button at bottom, hover → terracotta
6. **Bottom nav** (`.nav`) — compact icon-only, active pill terracotta-tint

Exceptions are deliberate and reduce to two:
- **Splash** — no bottom nav (first launch, account not yet created)
- **Onboarding** — no bottom nav (same reason)

## Section 1 — Flow principal (4 screens, 2×2 grid)

### Accueil — daily decide
- Date in top bar
- Hero: "On mange quoi ?"
- Crumbs: `1 validé · 3 à voter · 4 propositions`
- 4 shortlist rows (numbered 01-04), each: index / name + meta / table-à-manger scene
- Validé row gets full-bleed `var(--valide-chip)` background + accent dot after
  name + accent index
- CTA: "Cuisiner — Risotto au safran ↵"
- Bottom nav: Accueil active

The canonical screen. **All other screens defer to this for tone.**

### Recettes (list)
- Hero: "Recettes"
- Meta: "42 recettes · triées par dernière fois"
- Search input (Geist 13px placeholder)
- Filter pill row (`tout · printemps · italien · vite · réconfort`) — `.on`
  is ink-filled
- Numbered list (01-07+) of recipe rows, each: index / name + meta / state tag

### Ajouter — capture surface picker
- Hero: "Nouvelle recette"
- Sub: "5 méthodes · choisis-en une"
- 5 capture options as bordered cards (ix / name + helper / arrow icon):
  01 Rapide / 02 Formulaire / 03 Voix / 04 Photo / 05 Lien

### Profil
- Hero: "Profil"
- ID line: "maison · MGRY-13 · depuis 2026.03"
- 2 member rows (avatar / name + role / "vous" pill on current user)
- Stats card (3 columns): `42 recettes · 18 cuisinées · 127 votes`
- Numbered settings list (01-05): Notifications / Heure du décide / Inviter /
  Exporter / Déconnexion

## Section 2 — Écrans détails (3 screens, 1×3 grid)

### Recette · structurée (cookbook view)
- Back arrow + breadcrumb in top bar instead of brand
- Photo placeholder (gradient cream + lucide `utensils`)
- Recipe title 22px Geist 500
- Meta line: "35 min · 2 personnes · dernière fois il y a 12 j"
- Tag chips: `réconfort · facile · printemps`
- Sections with mono labels: `INGRÉDIENTS 5` then `ÉTAPES 4`
- Numbered ingredient rows (qty in mono + name in body)
- Numbered step rows (just body text)
- CTA: "Marquer comme cuisinée"

### Recette · thread (conversation)
- Back arrow + crumb "Risotto · thread"
- Title block: name + sub "conversation · depuis le 9 mai"
- Thread bubbles (see [components.md](components.md) for grammar):
  user voice (ink bubble, kind label "voix · timestamp") →
  system question (paper bubble) →
  user answer (terracotta-tint bubble with pinned label) →
  system advisory (paper bubble with accent left bar)
- Composer pill at bottom with 4 capture icons + send

### Shortlist · deck (Tinder vote)
- Header: "Sélection du soir" + counter `3 à voter · 1 déjà validé`
- Card stack: 3 visible cards layered (active + 2 behind with scale/opacity)
- Active card: photo + name + meta + tags + voter footer ("L vote en cours · M attend")
- Action row: 3 round buttons — X / undo / heart (heart in accent)

## Section 3 — Variantes & flux (4 screens, 2×2 grid)

### Splash / loading
- No bottom nav, no chrome
- Logo 128px centred, pulse on centre dot
- Wordmark "Al Dente." 34px Geist 600
- Tagline muted
- 3-dot loader at bottom
- Version mono "v0.2 · 2026"

### Cooking session
- Close button (×) + crumb "démarrée à 19:18 · 14 min" + pin "étape 03/04"
- Recipe title 22px
- Timing line: "14 min écoulées · 21 min restantes" (elapsed in accent)
- Progress bar: 4 segments (2 done in accent, 1 animated, 1 empty)
- Step card on white surface: label "étape 03 sur 04" + step body + ingredient reference
- 2 cook-controls: ghost prev / next step
- CTA: "Terminé · marquer cuisinée"

### Onboarding · welcome
- Version line at top "v0.2 · printemps 2026"
- Wordmark hero 44px centred
- Tagline italic-style accent: "On mange quoi *ce soir* ?"
- Sub: "Une app pour deux. Pour décider ensemble, sans se relancer toute la soirée."
- Two CTAs stacked: primary ink "Créer notre foyer" / ghost "Rejoindre avec un code"
- Footer mono: "cuisine partagée · 0 frais · 0 pub"

### Recettes · grid view
- Same top + hero + meta + search + filters as list view
- 2-column grid of `.gcard`s
- Each card: photo placeholder + name + meta
- Validé card: accent border + check badge on photo

## Composition patterns

### The numbered index keystone
Every list in the system uses numbered indices in Geist Mono. This is the
**signature move** of La Grille — without it, lists become generic "modern
sans on white". The index visually separates "this is structured data" from
"this is prose".

```html
<div class="row">
  <span class="ix">01</span>
  <div>
    <div class="name">Risotto au safran</div>
    <div class="meta">italien · 35min · validé</div>
  </div>
  <div class="scene">...</div>
</div>
```

### The validé row treatment
The validé row gets:
1. Full-bleed `var(--valide-chip)` background — extends beyond the row's own padding
2. Accent index colour (replacing default muted)
3. Accent dot after the recipe name (small `::after`)
4. Accent meta colour (replacing default muted)
5. Accent ring on the plate inside the scene
6. Both seats in the scene become accent

That's 6 reinforcing signals for "consensus reached on this row". Reading any
single one tells you the state; all together it's unmistakable.

### Vertical density rhythm
- Hero → first row: 22-26px
- Row → row: 13-14px padding-y, 1px hairline border-top
- Last row → CTA: `margin-top: auto` pushes CTA to bottom
- CTA → bottom nav: 10-14px

This creates a tight-but-breathing rhythm — denser than Apple Notes,
looser than Linear. The numbered indices and consistent vertical padding
create the visual grid feel without an actual gridded background.

### Why heroes are small
Per [tokens.md](tokens.md) — modern sober uses *less* type pressure. A 24px
hero on a 320px-wide phone takes ~7.5% of horizontal real estate; the
previous 38px Cormorant took ~12%. That 4.5% returned to the page makes the
content below the hero feel more important relative to the question header.

## What to avoid

- ❌ Big hero typography "for impact" — drives the register back toward
  "publication"
- ❌ Photo-heavy layouts — Al Dente works with placeholders by default; photos
  are productize-later. The list-view IS the canonical Recettes; the grid is
  optional alt mode.
- ❌ Custom backgrounds per screen — all screens share `var(--bg)`. The
  surface IS the brand calm.
- ❌ Bottom nav with text labels — defeats the compact icon-only decision
- ❌ Putting accent colours on non-state elements
