# Components · La Grille Soft warmth

Building blocks. Full live samples in
[sources/002-refresh-direction-explorations/index.html](../sources/002-refresh-direction-explorations/index.html)
tab Composants. CSS patterns extracted below.

## Buttons

### Primary CTA — ink filled, accent on hover
```css
.cta {
  width: 100%;
  background: var(--ink);
  color: var(--bg);
  border: 0;
  border-radius: 8px;
  padding: 15px 18px;
  font: 500 14px 'Geist', sans-serif;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: background 200ms var(--ease);
  display: flex; align-items: center; justify-content: space-between;
}
.cta:hover { background: var(--accent); }
.cta .right { font-family: 'Geist Mono', monospace; font-size: 11px; opacity: 0.6; }
```

The CTA stays dark ink (not accent). Hover transitions ink → terracotta. This
is the *only* moment where accent becomes a fill colour anywhere in the system.

### Ghost / secondary
```css
.btn-ghost {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--border-strong);
  border-radius: 9px;
  padding: 14px 18px;
  font: 500 14px 'Geist', sans-serif;
}
.btn-ghost:hover { color: var(--ink); border-color: var(--ink); }
```

### Round icon action (deck deck-action / composer)
```css
.deck-action {
  width: 48px; height: 48px;
  border: 1.5px solid var(--border-strong);
  background: var(--bg);
  border-radius: 9999px;
  color: var(--muted);
}
.deck-action.yes { border-color: var(--accent); color: var(--accent); }
.deck-action.yes:hover { background: var(--accent); color: var(--bg); }
```

## Inputs

### Search field
```css
.search {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  background: var(--bg);
  border: 1px solid var(--border-strong);
  border-radius: 9px;
}
.search input {
  border: 0; background: transparent; outline: none;
  font: 13px 'Geist', sans-serif;
  letter-spacing: -0.005em;
}
.search input::placeholder { color: var(--faint); }
.search svg { width: 14px; height: 14px; color: var(--muted); }
```

### Composer (thread input)
Pill-shaped input + 4 capture icons inline:
```css
.composer-row {
  display: grid; grid-template-columns: 1fr auto;
  gap: 10px; align-items: center;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 9999px;
  padding: 6px 6px 6px 14px;
}
.composer-icons .ic {
  width: 28px; height: 28px;
  border-radius: 9999px;
  color: var(--muted);
}
.composer-icons .ic:hover { background: var(--chip); color: var(--ink); }
.composer-icons .send { background: var(--ink); color: var(--bg); }
.composer-icons .send:hover { background: var(--accent); }
```

## Chips & pills

```css
/* Mono crumb (Accueil top of stack) */
.stat        { font: 11px 'Geist Mono', monospace; background: var(--chip); color: var(--muted); padding: 2px 9px; border-radius: 999px; }
.stat.v      { background: var(--valide-chip); color: var(--valide-chip-fg); }

/* Filter pill (Recettes) */
.filter      { font: 10.5px 'Geist Mono', monospace; background: transparent; color: var(--muted); border: 1px solid var(--border-strong); padding: 4px 10px; border-radius: 999px; }
.filter.on   { background: var(--ink); color: var(--bg); border-color: var(--ink); }

/* List-row tag (Recettes list view) */
.tag         { font: 10px 'Geist Mono', monospace; background: var(--chip); color: var(--muted); padding: 2px 8px; border-radius: 999px; }
.tag.v       { background: var(--valide-chip); color: var(--valide-chip-fg); }
```

The valide-chip token (`#F5E5DD` bg + `#82371F` fg) is the **most reused state
token in the system**. It appears on:
- Validé pills on Accueil
- Active nav-tab background
- "Vous" pill on Profil
- Validé tag on Recettes list
- Pinned answer bubble background on Thread

It is the visual grammar for "ici, l'app est dans un état terracotta-signified".

## Bottom navigation — compact icon-only

```css
.nav {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  margin: 10px -22px 0;
  padding: 8px 14px 16px;
  background: var(--bg);
  border-top: 1px solid var(--border);
}
.nav-tab {
  display: flex; align-items: center; justify-content: center;
  height: 36px;
  border-radius: 10px;
  color: var(--muted);
  cursor: pointer;
  transition: all 200ms var(--ease);
}
.nav-tab:hover  { color: var(--ink); background: var(--chip); }
.nav-tab.active { background: var(--valide-chip); color: var(--accent); }
.nav-tab svg    { width: 20px; height: 20px; stroke-width: 1.6; }
```

Icons (Lucide):
- Accueil: `house`
- Recettes: `library-big` (3-volume — signals "collection")
- Ajouter: `plus`
- Profil: `users-round` (two heads — signals "household")

**Production accessibility**: each `.nav-tab` MUST have `aria-label="Accueil"`
etc. Without visible labels, VoiceOver reads only "image".

## Table-à-manger — 5 vote states

```html
<div class="scene">
  <div class="plate"></div>
  <div class="seat n luca"></div>
  <div class="seat s partner"></div>
</div>
```

```css
.scene { position: relative; width: 40px; height: 40px; }
.scene .plate {
  position: absolute; inset: 9px;
  border: 1px solid var(--border-strong);
  border-radius: 50%;
}
.scene .seat {
  position: absolute; width: 11px; height: 11px;
  border-radius: 50%;
  border: 2px solid var(--bg);
}
.scene .seat.n { top: 0; left: 50%; transform: translateX(-50%); }
.scene .seat.s { bottom: 0; left: 50%; transform: translateX(-50%); }

/* States */
.scene .seat.luca       { background: var(--ink); }
.scene .seat.partner    { background: var(--muted); }
.scene .seat.neutral    { background: var(--bg); border: 1.5px solid var(--border-strong); }
.scene .seat.conteste   { background: var(--ink); position: relative; }
.scene .seat.conteste::after {
  content: ""; position: absolute; left: -2px; right: -2px; top: 50%;
  height: 1.5px; background: var(--accent);
  transform: translateY(-50%);
}

/* Validé row override — both seats accent, plate accent ring */
.row.valide .scene .plate                        { border-color: var(--accent); }
.row.valide .scene .seat.luca,
.row.valide .scene .seat.partner                 { background: var(--accent); }
```

5 derivable states (computed from `services/voting.compute_vote_state`):
- **Validé** — both seats accent on accent-ring plate
- **Pressenti** — one ink, one neutral hollow
- **Contesté** — one ink, one ink with terracotta bar
- **Rejeté** — both ink with terracotta bars
- **Sans avis** — both neutral hollow

The bar across the conteste seat is `var(--accent)` not red. The bar IS the
"vote contre" semantic — saturated terracotta against ink reads "negative
position" without introducing a destructive red.

## Cards

### Shortlist row (Accueil)
3-column grid: index / name+meta / scene. Hover lift via background change + small
margin shift. Validé row: full-bleed `var(--valide-chip)` background + accent
dot after name.

### Library row (Recettes list)
3-column grid: index / name+meta / tag. Validé row gets the `tag.v` (terracotta
chip).

### Library card (Recettes grid)
Photo placeholder + name + meta. Validé card border + check badge on photo.

### Deck card (Tinder)
The *only* component with a soft drop shadow. 270×360 frame, radius 18, soft
ambient `0 2px 8px / 0 12px 28px`. Stack of 3 visible (active + 2 behind with
scale/opacity).

## Thread bubbles

```css
.turn        { display: flex; flex-direction: column; max-width: 84%; }
.turn.u      { align-self: flex-end; align-items: flex-end; }
.turn.s      { align-self: flex-start; align-items: flex-start; }
.turn .kind  { font: 9.5px 'Geist Mono', monospace; color: var(--faint); margin-bottom: 4px; }
.bub         { padding: 9px 13px; border-radius: 14px; font: 12.5px 'Geist', sans-serif; line-height: 1.45; }

.turn.u .bub          { background: var(--ink); color: var(--bg); border-bottom-right-radius: 4px; }
.turn.s .bub          { background: var(--hover); color: var(--ink); border: 1px solid var(--border); border-bottom-left-radius: 4px; }
.turn.s.advisory .bub { border-left: 2px solid var(--accent); padding-left: 11px; }
.turn.u.answer .bub   { background: var(--valide-chip); color: var(--valide-chip-fg); border: 0; }
.turn.u.answer .pinned { font: 9px 'Geist Mono', monospace; color: var(--accent-deep); margin-top: 3px; text-transform: uppercase; letter-spacing: 0.04em; }
```

Why ink bubbles (not coloured) for user turns: terracotta is reserved for state,
not "identity". Ink-black gives maximum contrast on light surface and reads
"your voice is present" without consuming a state colour.

## What to avoid

- ❌ Patine-style ledger cards (`.ledger-card` with dot grid + dog-ear + stamp).
  Dropped. Replace with flat row + hairline.
- ❌ Paper-grain texture overlay on cards/dialogs. Dropped.
- ❌ Cormorant Garamond display headlines. Dropped.
- ❌ Caveat handwriting marginalia. Dropped — replaced by Geist Mono meta.
- ❌ Warm-brown two-layer shadows. Dropped — hairline borders only.
- ❌ Coloured bubble backgrounds for non-state things. Use ink-black for user
  turns; reserve accent for state.
- ❌ Bigger heroes "for impact". Modern sober is small-and-confident, not big.
- ❌ Spring-overshoot motion curves. Single ease for the whole system.
