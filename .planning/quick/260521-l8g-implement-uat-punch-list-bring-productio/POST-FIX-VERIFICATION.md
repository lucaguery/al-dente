---
walkthrough_date: 2026-05-21
viewport: 390x844 (iPhone)
auth: test-token-luca (Luca, household TEST01) + test-token-partner (D-04)
environment: local dev (npm run dev) against test seed, backend on :8001
verifies: .planning/quick/260521-l8g-implement-uat-punch-list-bring-productio/260521-l8g-SUMMARY.md
scope: close-out cross-check of 12 findings from .planning/quick/260521-uat-living-system-cross-check/PUNCH-LIST.md (D-05 closed pre-task)
findings_closed: 11 / 12
findings_partial: 0
findings_open: 1
---

# Post-Fix Verification — 260521 UAT Punch List Close-Out

## Summary

11 of 12 closed findings verified as **CLOSED** in the running app. **P-01 (Radix Dialog "Fermer" aria-label) is OPEN** — both the « Ajouter » sheet Close button and the URL-paste dialog Close button still expose `<span class="sr-only">Close</span>` instead of the French « Fermer ». No new bugs were introduced by the fixes. Production has caught up to the La Grille · Soft warmth sketches on every fix tier except P-01.

### Findings to re-verify

### B-01 — Accueil ledger safe-area
- **Status:** CLOSED
- **Evidence:**
  - `/Users/gulu3001/dev/al-dente/.scratch/walkthrough/v2-b01-accueil-ledger-safearea-bottom.png`
  - `<main>` computed style: `padding-bottom: 92px` (5rem + 0.75rem; no safe-area inset in browser)
  - After `window.scrollTo(0, document.body.scrollHeight)` on `/` as Luca (ledger view):
    - Notification banner rect: `{top: 613.89, bottom: 751.89, height: 138}`
    - Nav rect: `{top: 784, bottom: 844, height: 60}`
    - `overlap: false` — 32px gap between banner bottom and nav top, clears the 60px nav + 12px central « + » elevation cleanly.

### B-02 — Bibliothèque Liste view central « + » occlusion
- **Status:** CLOSED
- **Evidence:**
  - `/Users/gulu3001/dev/al-dente/.scratch/walkthrough/v2-b02-liste-bottom-clearance.png`
  - On `/recipes` Liste view, scrolled to bottom: last article bottom = 656, nav top = 784, `overlap: false`. 92px main padding-bottom inherited from shared layout. Grid view has same chrome.

### B-03 — photo-url 404 console noise
- **Status:** CLOSED
- **Evidence:**
  - `browser_console_messages({all: true, level: 'error'})` on `/recipes` after navigation: **0 errors, 0 warnings** at the error level (total 2 messages, none of which are errors). Down from ~48 errors in the prior walk.
  - Seed dropped `photo_paths` for the unbacked recipes; no residual Storage 404 cascade.

### D-01 — Patine view removal
- **Status:** CLOSED
- **Evidence:**
  - `/recipes` snapshot shows `radiogroup "Vue de la bibliothèque"` with exactly 2 radios: `Grille` (checked) and `Liste`. No Patine radio.
  - `document.body.innerHTML.toLowerCase()` contains `patine: false`, `heritage: false`, `habitudes: false`. The three section headings are entirely absent from the DOM.

### D-02 — Ingrédients section terracotta border-left
- **Status:** CLOSED
- **Evidence:**
  - `/Users/gulu3001/dev/al-dente/.scratch/walkthrough/v2-d02-ingredients-no-terracotta.png` (recipe `eb206ed0-…` Ragu bolognese)
  - DOM walk of 5 ancestors above the `<h2>Ingrédients` heading: `borderLeftWidth: "0px"` on all five (H2 → DIV → SECTION → DIV → SECTION). No terracotta vertical bar anywhere on the section. Marginal-note border-left (P-04 fix) is the only intentional border-left on the detail page.

### D-03 — Accueil ledger member avatars (ink + muted)
- **Status:** CLOSED
- **Evidence:**
  - Inspected all 8 avatar spans on `/` as Luca: Luca avatars `backgroundColor: rgb(20, 17, 13)` (= `--foreground` `#14110d`), Partner avatars `backgroundColor: rgb(111, 107, 98)` (= `--muted-foreground` `#6f6b62`). Border `1.5px solid rgb(255, 255, 255)`. No vivid rose / emerald.

### D-04 — Accueil pre-vote deck identity pill
- **Status:** CLOSED
- **Evidence:**
  - `/Users/gulu3001/dev/al-dente/.scratch/walkthrough/v2-d04-prevote-deck-luca-ink.png`
  - Auth as `test-token-partner`, landed on pre-vote deck. The two "Luca : oui" indicator pills inner dot `backgroundColor: rgb(20, 17, 13)` = `--foreground` ink. Outer pill background is the neutral translucent oklab (no rose).

### D-06 — Seed cuisine fix for Poulet au citron
- **Status:** CLOSED
- **Evidence:**
  - `/Users/gulu3001/dev/al-dente/.scratch/walkthrough/v2-d06-poulet-au-citron-cuisine.png`
  - Liste-view row text for `e455207d-…`: `"04Poulet au citronFrançaise · il y a 5 jours"`. Cuisine label reads « Française », not « Italienne ». Seed-data refresh landed.

### P-01 — Radix Dialog « Fermer » aria-label
- **Status:** OPEN
- **Evidence:**
  - `/Users/gulu3001/dev/al-dente/.scratch/walkthrough/v2-p01-close-button-en.png`
  - On `/recipes/new` → tap « + » to open the « Ajouter » sheet: dialog Close button text content = `"Close"`, with the visible label hidden via `<span class="sr-only">Close</span>`. `aria-label` is null on the button (Radix's default DialogContent close).
  - Same on the « Coller un lien » dialog: `<span class="sr-only">Close</span>`.
- **Notes:** Both `DialogContent` instances are using shadcn/ui's default close affordance with an English `sr-only` label. The fix needs the shadcn/Radix close to wrap a localized "Fermer" string (either via the shadcn `Dialog.tsx` patched to use `next-intl`, or by passing a custom close button to the affected dialogs).

### P-02 — Central « + » CTA box-shadow
- **Status:** CLOSED
- **Evidence:**
  - On any screen with BottomNav, the central CTA inner span computes `boxShadow: rgba(20, 17, 13, 0.18) 0px 8px 24px -8px` — exact decomposition of the spec token `0px 8px 24px -8px rgba(20, 17, 13, 0.18)`. Tailwind arbitrary class `shadow-[0px_8px_24px_-8px_rgba(20,17,13,0.18)]` is on the 56×56 inner span along with `-translate-y-3` for elevation.

### P-03 — Heart-off "no" affordance on deck
- **Status:** CLOSED
- **Evidence:**
  - `/Users/gulu3001/dev/al-dente/.scratch/walkthrough/v2-p03-heart-off-icon.png`
  - "Pas envie ce soir" button SVG class: `lucide lucide-heart-off text-foreground-muted` — the explicit Lucide `heart-off` icon (path with the slash through). "J'aime cette recette" uses filled `lucide-heart` with `text-[var(--color-valide-foreground)]`.

### D-05 — Closed pre-task
- **Status:** CLOSED (out of scope for this verification per task brief)

## Verdict

Production caught up to the sketches on **11 of 12** items. The full La Grille · Soft warmth visual system is now in effect — refined-terracotta state colour reserved for validé/active/advisory, ink-and-muted member dots replacing vivid rose/emerald, no terracotta border-rule on the Ingrédients section, Patine view excised from the library, and the central « + » CTA properly elevated with the token-decomposed soft shadow. B-01/B-02 safe-area math is correct (92px padding clears the 60px nav + 12px elevation). Console noise on `/recipes` collapsed from ~48 errors to 0. The single residual is **P-01**: the Radix Dialog Close button still has its default English `sr-only` "Close" label on both the « Ajouter » sheet and the « Coller un lien » dialog — a localisation oversight, fixable in the shadcn `dialog.tsx` wrapper. No new bugs were introduced by the fixes; the marginal-note left hairline (P-04 expected behavior) was not observable on the Ragu bolognese detail (no marginal notes present in this recipe) but no rogue terracotta was found either.
