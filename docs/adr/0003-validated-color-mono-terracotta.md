---
status: accepted
date: 2026-05-20
supersedes: "Phase 5 emerald Validé token lock (see .planning/phases/05-*/05-UI-SPEC.md §Color)"
---

# ADR-0003 — Mono-terracotta Validé color (supersedes Phase 5 emerald lock)

## Context

Phase 5 locked emerald h≈145 as the Validé semantic hue across `--color-valide-foreground`,
`--color-valide-emphasis`, `--color-valide-border`, `--color-valide-border-faint`,
`--valide-tint`, and `--color-cooking-foreground`. Phase 23 round-3 sketch work surfaced
that emerald reads as a "traffic light" against the warm Sober Kitchen register (terracotta
primary, cream surface, Cormorant Garamond + Caveat typography). The green hue introduces a
second unrelated hue axis that competes with the established warm terracotta vocabulary.

Sketch 001 (`.planning/sketches/001-shortlist-card-lifecycle/`) ran three alternative
palettes alongside the current emerald baseline and asked which best reads "consensus reached"
inside the Sober Kitchen register. Mono-terracotta won.

## Decision

Migrate all six Validé-semantic tokens to mono-terracotta values:

| Token | Old (emerald) | New (mono-terracotta) |
|---|---|---|
| `--valide-tint` (light) | `oklch(0.93 0.07 145)` | `oklch(0.91 0.045 35)` |
| `--valide-tint` (dark) | `oklch(0.30 0.06 145)` | `oklch(0.30 0.05 35)` |
| `--color-valide-foreground` (light) | `#10B981` | `#A8412E` |
| `--color-valide-emphasis` (light) | `#047857` | `#8B331F` |
| `--color-valide-border` (light) | `#10B98180` | `#A8412E80` |
| `--color-valide-border-faint` (light) | `#10B9814D` | `#A8412E4D` |
| `--color-valide-foreground` (dark) | `#6EE7B7` | `#E9A893` |
| `--color-valide-emphasis` (dark) | `#A7F3D0` | `#F2C7B6` |
| `--color-valide-border` (dark) | `#6EE7B780` | `#E9A89380` |
| `--color-valide-border-faint` (dark) | `#6EE7B74D` | `#E9A8934D` |
| `--color-cooking-foreground` (light) | `#047857` | `#8B331F` |
| `--color-cooking-foreground` (dark) | `#A7F3D0` | `#F2C7B6` |

The member-color tokens (`--color-member-emerald-*`) keep their independent emerald hexes.
They are member-slot identity tokens — not a Validé semantic — and are explicitly exempt from
this migration. The "emerald" slot name is a label for one of the five household member color
slots, not a reference to the Validé voting state.

## Considered Alternatives

- **Keep emerald (Phase 5 lock)** — preserved cross-version stability but kept the
  "traffic light against warm cream" mismatch the sketch round-3 exposed. Emerald h≈145 sits
  outside every other hue axis in the palette (terracotta h≈32–35, cream h≈60–75,
  warm-taupe h≈50), introducing a cool-green intrusion that desynchronises from the Sober
  Kitchen register.

- **Olive sage (kitchen-herb)** — closer to the Sober Kitchen register than emerald but
  introduced a second hue axis (h≈85–100) competing with primary. The brand's terracotta
  primary already occupies the warm saturated role; sage would create an unresolved
  two-accent tension.

- **Patine verdigris (aged copper)** — period-correct for the patine cards register and
  historically associated with copper cooking equipment. However it reads as oxidation /
  decay rather than approval / consensus, which is the opposite of the intended semantic.

- **Mono-terracotta (winner)** — one hue (h≈35), played at different saturations and
  lightness levels. Validé = saturated terracotta; Pressenti = brand primary (same hue,
  mid-weight); Contesté = dusty; Rejeté = paper-tone. The most opinionated read of
  Sober Kitchen and the one that collapses the emerald anomaly without adding new hue axes.

## Consequences

- Phase 5 emerald lock superseded. Future plans referencing "the locked emerald Validé
  token" must redirect here.
- The threshold ring on `ShortlistCard.tsx` (`ring-[var(--color-valide-foreground)]`)
  automatically flows through the new value — no component change needed.
- The thumb-button Heart icon on the deck shifts hue without a code change (it uses
  `text-[var(--color-valide-foreground)]` and `border-[var(--color-valide-border)]`).
- The cooking banner icon hue shifts with `--color-cooking-foreground` (sibling token
  migrated for visual cohesion — both the Validé ring and the cooking banner signal
  "positive outcome" and should read from the same hue family).
- Sketch 001 (`.planning/sketches/001-shortlist-card-lifecycle/`) is the visual reference
  for downstream verification.
- Pressenti / Contesté / Rejeté tokens are NOT introduced here — out of scope; they
  remain at their existing values until a separate decision lands.
