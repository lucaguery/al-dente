# UI Review — Shortlist

**Audited:** 2026-05-09
**Auditor:** Claude (Phase 13, manual scoring per CONTEXT.md D-06)
**Synthetic env:** [SYNTHETIC] Démo Al Dente @ https://al-dente-pink.vercel.app
**Viewport:** iPhone-shape Chromium 390×844 (isMobile, hasTouch)
**Reach status:** Reached. Live state on audit day: 2 cards on the deck (`Mega ingredient bomb` + `Pad thai tofu`), 1 active cooking-log (`Pad thai tofu`), 9 inbox drafts. Install-PWA prompt + cooking banner + cold-start chip stacked above the deck (P-12-Sh-01 reproducible).

## Originality Verdict

**Verdict:** Feels Al Dente ✅

The framer-motion swipe deck with rotation + OUI/NON overlay opacity is the most distinctive interaction in the entire app — a genuinely earned visual + interaction language that no off-the-shelf list pattern would produce. Token compliance is firm (paper-grain card + shadow-card-hover + custom `--color-valide-tint` + h≈35° terracotta primary), with one minor implementation crack: the OUI affirmative thumb button uses the Tailwind palette literal `text-emerald-500` rather than a semantic token (e.g., `text-positive`), even though `globals.css` documents emerald (h≈145) as part of the Slow Food system. Editorial cohesion is strong — the 5 chip labels (`Validé / Pressenti / Contesté / Rejeté / Sans avis`) match locked next-intl strings, "OUI" / "NON" overlays use bold tracker-spaced typography that lifts the swipe gesture into the UI vocabulary.

| Boilerplate elements | Earned elements |
|----------------------|-----------------|
| Default install-PWA prompt + push prompt + cold-start chip stacking above the deck — three banner-shaped controls in a row, no visual layering or grouping (`frontend/components/HomeDecide.tsx`) | framer-motion swipe deck with rotation + per-direction opacity-revealed `OUI`/`NON` overlays (`frontend/components/ShortlistCard.tsx:117-178`) — drag-to-vote OR tap-to-vote both first-class per 03-UI-SPEC §"Interaction Patterns" |
| Decorative `<img>` with default `pointer-events: auto` overlaying the front card (`ShortlistCard.tsx:144-149`) — boilerplate placement that traps clicks (P-12-Sh-04) | `paper-grain bg-card rounded-2xl shadow-card-hover` front card / `shadow-card scale-[0.94] translate-y-3 opacity-60 pointer-events-none` peek card — physical card-stack metaphor with mass and depth (`ShortlistCard.tsx:133-136`) |
| `text-emerald-500` literal on the OUI thumb button (`ShortlistCard.tsx:256-258`) — Tailwind palette literal where a semantic token (`--color-valide-foreground`?) would close the system | 5-state vote-chip pill class function `chipClass(state)` (`VoteSummary.tsx:55-70`) — per-state `bg-{tint}/text-{role}/border-{accent}` recipe from 07-UI-SPEC §"Color > Vote-chip color mapping". `var(--color-valide-tint)` is a real custom token. |
| Default lucide icons (`Heart`, `X`, `UtensilsCrossed`, `RotateCw`) — themed but not customized | "Vous avez tout vu" recap surface with branching CTA tree per 03-UI-SPEC §Surface 8 (cook / delegate / regenerate, conditional on Validé/Pressenti presence) — refuses the boilerplate "list of voted recipes" template |

## 6-Pillar Score: 21/24

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| Copywriting | 4/4 | OUI/NON overlays + aria-labels (`J'aime cette recette`, `Pas envie ce soir`) read with warmth; recap CTAs (`Je commence à cuisiner`, `Tu décides`, `Régénérer le shortlist`) are situation-named verbs. 5 chip labels match the locked vocabulary canary. Full next-intl. |
| Visuals | 4/4 | Swipe deck rotation + opacity-revealed OUI/NON overlays — earned. Front-vs-peek card differentiation. Photo placeholder uses `UtensilsCrossed` icon at `text-foreground-muted` (a deliberate empty-state visual, not a missing asset). |
| Color | 3/4 | DOCKED -1 — `text-emerald-500` Tailwind palette literal on the OUI button (`ShortlistCard.tsx:256-258`) where a semantic `--color-valide-{role}` token would close the system. `globals.css` documents emerald as intentional but the implementation reaches for the palette literal. |
| Typography | 4/4 | `text-title` (Slow Food display class) for card titles + recap heading; `text-base font-semibold` body; `text-sm` and `text-xs` for chips/footers; `font-display italic text-base` for the pressenti/no-state recap. Within thresholds. |
| Spacing | 4/4 | `gap-3 / gap-2 / gap-12` (the gap-12 separating the OUI/NON thumb buttons gives them a deliberate-tap-zone weight); `h-14 w-14` thumb-button hit targets; rounded `rounded-full / rounded-2xl / rounded-xl` hierarchy from element → card → row. Tailwind scale only. |
| Experience Design | 2/4 | DOCKED. Four frictions stack: P-12-Sh-01 (install banner occludes deck on first load), P-12-Sh-02 (regenerate 422 missing-body — friction class after final-pass re-tag), P-12-Sh-03 (handler gated on framer-motion gesture — a11y/automation), P-12-Sh-04 (decorative `<img>` traps pointer events). |

## Detailed Findings

### Pillar 6: Experience Design (2/4)

- **Install-PWA banner occludes vote affordances on first load** — auditor measured: with banner visible, OUI button at y=743.59 bottom=799.59 on 390×844 (within 44.41px of the bottom edge, but compressed). After dismissing via the banner's × button, the deck reflows ~90px upward and sits comfortably. Friction during the *first* session before the user dismisses. (See WALKTHROUGH.md §Shortlist — P-12-Sh-01)
- **`Régénérer le shortlist` returns 422 missing-body** — `POST /api/shortlists/regenerate` requires a body even though `RegenerateRequest` declares all fields optional; frontend `lib/shortlist.ts` regenerate wrapper sends no body or wrong Content-Type. Friction (re-tagged from blocker after Plan 12-04 RT-5 confirmed `{}` body works). User-visible: one retry path with a confusing error toast. (See WALKTHROUGH.md §Shortlist — P-12-Sh-02)
- **Click handler gated on framer-motion drag context** — `el.click()` programmatic clicks don't traverse the `motion.button` event chain; only real touches or swipe gestures register. Real iOS users won't notice; assistive input methods (switch control, VoiceOver double-tap, automation) will. (See WALKTHROUGH.md §Shortlist — P-12-Sh-03)
- **Decorative photo `<img>` traps pointer events** — `absolute inset-0 w-full h-full object-cover` (`ShortlistCard.tsx:144-149`) lacks `pointer-events: none`; Playwright `force click` reports the img subtree intercepts the click. Compounds with Sh-03. (See WALKTHROUGH.md §Shortlist — P-12-Sh-04)
- **Pass-style: chip vocabulary stable** — 5 chip labels match the locked next-intl strings (`Validé / Pressenti / Contesté / Rejeté / Sans avis`) — regression canary intact (See WALKTHROUGH.md §Shortlist — pass-style observations).

### Pillar 1: Copywriting (4/4)

- aria-labels on the thumb buttons: `J'aime cette recette` / `Pas envie ce soir` (`ShortlistCard.tsx:244, 255`) — warm, conversational, refuse the generic `Yes` / `No`.
- OUI / NON visual overlays during swipe — bold all-caps with `tracking-wider` font weight, the gestural feedback is an editorial choice (not a generic check/cross icon).
- Recap CTAs: `Je commence à cuisiner` (validé branch), `Tu décides` (pressenti / no-state branch), `Régénérer le shortlist` (always). Verbs match the user's mental beat at each branch.
- Recap headline `Vous avez tout vu` (i18n: `home.summary.heading`) — playful French, refuses the generic `Done` / `All voted`.
- Chip vocabulary unchanged from v0.2 lock — no drift between rendered chips and `next-intl` keys.

### Pillar 2: Visuals (4/4)

- **Swipe deck differentiation**: front card = `paper-grain bg-card rounded-2xl shadow-card-hover` with active drag, peek card = same construction + `scale-[0.94] translate-y-3 opacity-60 pointer-events-none`. The peek's translation + scale + opacity create a real card-stack-on-the-counter reading.
- OUI/NON overlays at `top-6 left-6 rotate-[-15deg]` and `top-6 right-6 rotate-[15deg]` — the rotation lifts the overlay into the gestural register; not a "label in the corner".
- Photo placeholder: `UtensilsCrossed` lucide icon at `text-foreground-muted size={48}` centered in `bg-surface-muted` (`ShortlistCard.tsx:140-156`). Real empty-state, not a missing asset.

### Pillar 3: Color (3/4)

- Terracotta primary appears on (a) push/install banner CTAs, (b) ColdStartChip, (c) recap "Je commence à cuisiner" / "Tu décides" CTA, (d) `border-l-[3px] border-primary/60` on the pressenti/no-state recap Card (`VoteSummary.tsx:172, 187`). Multi-instance but each one is load-bearing.
- Custom token `--color-valide-tint` used via `bg-[var(--color-valide-tint)]` (`VoteSummary.tsx:60`) and `bg-valide-tint` (`VoteSummary.tsx:74`) — the validé chip surface and the row background. Real semantic Slow Food token.
- DOCKED -1: `text-emerald-500` and `border-emerald-500/50` on the OUI thumb button (`ShortlistCard.tsx:256-258`) and on the chip's emerald border (`VoteSummary.tsx:60`) — Tailwind palette literals where a `--color-valide-foreground` / `--color-valide-border` token would close the system. `globals.css` h≈145 (emerald) IS intentional Slow Food per the comments at lines 70-72; the implementation just hasn't been refactored to use a custom CSS variable yet.

### Pillar 4: Typography (4/4)

- `text-title` (Slow Food custom class, defined in globals.css per Phase 7 UI-SPEC) for card titles + recap heading + validé recipe-name display.
- `text-base font-semibold leading-6 line-clamp-1` for recap-row titles, `text-sm font-medium` for chips, `text-xs font-medium` for partner-vote dot labels — three sizes, one font-semibold + one font-medium weight family.
- `font-display italic text-base` (Fraunces) on the pressenti/no-state recap card paragraph (`VoteSummary.tsx:173, 188`) — display moment, used sparingly.

### Pillar 5: Spacing (4/4)

- Tailwind scale: `gap-3 / gap-2 / gap-1.5 / gap-12` (the wide `gap-12` between OUI/NON thumb buttons gives each a deliberate-tap zone). `h-14 w-14` thumb buttons (well above the 48px floor for interactive targets per 07-UI-SPEC).
- Rounded hierarchy: `rounded-full` (chips, dots, thumb buttons) → `rounded-2xl` (cards) → `rounded-xl` (recap rows).
- One `[0.94]` arbitrary scale on the peek card — load-bearing (the visual difference between 0.94 and the next Tailwind step would change the stack reading); annotated by the inline comment at line 5 referencing 03-UI-SPEC.

## Screenshots

- `./screenshots/shortlist-canonical.png` — `/` first-load state on audit day: install-PWA prompt at top, "En train de cuisiner" Pad thai tofu cooking banner, ColdStartChip, then the swipe deck showing 2 articles (Mega ingredient bomb + Pad thai tofu) with OUI/NON overlay states visible. Reproduces P-12-Sh-01 (banner stack visually compressing the deck).
- `./screenshots/shortlist-banner-dismissed.png` — same `/` after dismissing the install-PWA prompt; deck reflows upward, OUI/NON thumb buttons sit at a more comfortable bottom-row position. Confirms the P-12-Sh-01 friction is an *initial-load* layout-compression issue, not a permanent occlusion.

## WALKTHROUGH cross-links (context inherited per D-11)

- WALKTHROUGH.md §Shortlist: 4 probes (P-12-Sh-01..Sh-04) + 3 pass-style observations (chip vocabulary stable, recap CTA tree correct, network log clean modulo React 19 strict-mode double-render).
- 0 Gemini calls — Shortlist scoring is deterministic server-side.
- The 4 frictions stack but no individual one is a blocker; the cumulative dock to Pillar 6 reflects "stacking" rather than "single-killer-bug".
