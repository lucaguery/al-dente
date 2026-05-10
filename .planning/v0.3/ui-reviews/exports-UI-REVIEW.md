# UI Review — Exports

**Audited:** 2026-05-10
**Auditor:** Claude (Phase 13, manual scoring per CONTEXT.md D-06)
**Synthetic env:** [SYNTHETIC] Démo Al Dente @ https://al-dente-pink.vercel.app
**Viewport:** iPhone-shape Chromium 390×844 (isMobile, hasTouch)
**Reach status:** Reached. Exports surface lives as the bottom (4th) Card on `/settings`. Auditor session active (Auditor / member #4 / `[SYNTHETIC] Démo Al Dente`). Surface contract per WALKTHROUGH §Exports verified via accessibility snapshot.

## Originality Verdict

**Verdict:** Mixed ⚠

Exports is a thin, single-CTA surface inside the Sauvegarde card on `/settings`. Token compliance is firm — `paper-grain bg-card shadow-card rounded-2xl` Card chrome, full-width `h-12` terracotta primary button, and the same `text-sm text-foreground-muted` field-label pattern reused across every other settings Card (Membre / Foyer / Historique / Sauvegarde). Copy is warm and conversational — `Télécharge toutes tes recettes au format JSON. Utile en cas de pépin.` is recognizably French, with `pépin` ("snag") doing real editorial work the boilerplate "Download data" never would. The surface earns its `paper-grain` chrome rather than just inheriting it: the lucide `Download` icon is sized + spaced (`h-4 w-4 mr-2`) for the 48px tap floor, the section-title-as-field-label pattern is the documented v0.2 Slow Food convention, and the `aria-busy={exporting}` / `disabled={exporting}` guard pair is the right accessibility shape. What pulls the verdict down to ⚠ is not visual — it's the WALKTHROUGH-surfaced friction stack (P-12-E02 offline button-state gap, P-12-E03 no-debounce double-fetch, the iOS-Safari PWA "may open in tab not download" comment that ships as plain code commentary instead of a user hint). The pixels are Slow Food; the *interaction* under degraded conditions falls back to generic Sonner-toast + browser-default behavior.

| Boilerplate elements | Earned elements |
|----------------------|-----------------|
| Default lucide `Download` icon (`Download` from `lucide-react`) — themed but not customized for the JSON-as-physical-recipe-card metaphor | `text-sm text-foreground-muted` field-label-as-section-title pattern (`page.tsx:191`) — the Settings convention, reuses 4× across the page rather than inventing a heading |
| Sonner toast as the only failure surface (`toast.error(t("export_error"))` at `page.tsx:80, 96`) — the same generic toast carries network-loss, auth, and 5xx alike with no per-cause copy | Editorial French body copy `Télécharge toutes tes recettes au format JSON. Utile en cas de pépin.` — `pépin` is colloquial, warm, refuses the boilerplate "Download your data" register |
| iOS PWA "may open in new tab" behavior is annotated inline (`page.tsx:92-94`) but ships as a comment, not a user-facing hint — the user discovers it on tap | `paper-grain bg-card shadow-card rounded-2xl p-6 flex flex-col gap-3` Card chrome — same construction as the other 3 Settings Cards (Membre / Foyer / Historique), creating one cohesive Settings layout |
| Filename pattern `al-dente-recipes-${householdId}.json` (`page.tsx:87`) — the household UUID in the filename is technically correct but reads as machine output, not warm artifact (couple-scale users won't recognize the UUID); productize-later finding | `disabled={exporting}` + `aria-busy={exporting}` pair (`page.tsx:200-201`) — the right accessibility primitive for an in-flight async action; refuses the generic "no busy state" boilerplate |

## 6-Pillar Score: 19/24

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| Copywriting | 4/4 | `Exporter mes données` / `Télécharge toutes tes recettes au format JSON. Utile en cas de pépin.` / `Télécharger mes recettes` — three layers of French conversational copy, `pépin` does real editorial work, full next-intl. |
| Visuals | 3/4 | DOCKED -1 — `Download` icon is the off-the-shelf lucide glyph; the surface has nothing visual to differentiate it from any "download data" pattern. The card chrome rescues it via system reuse, but the surface itself is icon + button + body — boilerplate-shaped. |
| Color | 3/4 | DOCKED -1 — terracotta primary on the CTA respects the system; the surface is mono-token (only the primary appears). Lacks any complementary token (e.g., `--color-accent` for the icon, or a paper-grain-on-paper-grain fill differentiation) that would mark this as a Slow Food artifact rather than a generic settings download. |
| Typography | 4/4 | `text-sm text-foreground-muted` for field-label + body; `font-semibold` (Button default) for CTA; `<p className="text-sm text-foreground-muted">` for the explainer. Within scale. Refuses to invent a section heading. |
| Spacing | 4/4 | `p-6 flex flex-col gap-3` Card; `h-12 w-full` CTA (D-08 floor); `mr-2` icon-text margin. Tailwind scale only. Spacing matches the other 3 Settings Cards exactly — section cohesion. |
| Experience Design | 1/4 | DOCKED -3. Three frictions stack: P-12-E02 button stays clickable when `navigator.onLine === false` (the `disabled={exporting}` guard tracks in-flight only, not connectivity); P-12-E03 rapid double-call triggers two full 97KB exports (no debounce, no idempotency, no coalescing — couple-scale cost is theoretical but the friction is real); the iOS-Safari PWA "may open in new tab" annotation that ships as a comment (`page.tsx:92-94`) means real PWA users on iPhone will sometimes see a JSON tab open instead of a download — a known browser quirk handled with documentation but not user feedback. |

## Detailed Findings

### Pillar 6: Experience Design (1/4)

- **Button does not disable on `offline` event.** `disabled={exporting}` only guards in-flight state. After `window.dispatchEvent(new Event('offline'))` the button stays clickable, the click round-trips to a `TypeError("Failed to fetch")`, and the Sonner toast fires with `Téléchargement impossible. Réessaie dans un instant.`. The toast copy is correct French and actionable — but the user only learns they're offline *after* tapping. Friction not blocker; primary action is reachable when online. (See WALKTHROUGH.md §Exports — P-12-E02)
- **No client-side debounce; rapid double-call triggers two full 97KB exports.** `Promise.all([fetch(exportUrl), fetch(exportUrl)])` against `/api/households/{hh}/export.json` returns 200, 200 with 194KB total payload over the wire (97KB × 2). The `disabled={exporting}` UI guard blocks pure double-tap, but the API endpoint races. Couple-scale (4 members × occasional export) means cost is theoretical, but the friction class (no-debounce-on-submit) recurs across capture surfaces (cross-link to P-12-Q03 family). (See WALKTHROUGH.md §Exports — P-12-E03)
- **iOS-Safari PWA "may open in new tab" annotation ships as code comment.** `page.tsx:92-94` documents that PWA standalone mode may open the JSON in a new tab rather than downloading. The handler does no detection, no user-visible hint, and no productize-later i18n key. The user discovers the behavior on tap; the comment prevents *us* from being surprised but doesn't help the user. The TODO("Save to Files" hint) is unfiled.
- **Failure-mode toasts are mono-cause.** `toast.error(t("export_error"))` fires for both `!res.ok` (4xx/5xx server error) and `catch` (network throw / abort). Same copy `Téléchargement impossible. Réessaie dans un instant.` for both. The user can't tell auth failure from network loss from server error. Friction; no blocker because retry is the right next action regardless of cause.
- **Pass-style: aria-busy + disabled pair are correct.** `disabled={exporting}` + `aria-busy={exporting}` (`page.tsx:200-201`) is the right accessibility primitive for an async submit action. Screen readers announce busy state; the visible state is consistent. (See WALKTHROUGH.md §Exports — implicit pass observation.)

### Pillar 1: Copywriting (4/4)

- Section title `Exporter mes données` (`settings.export_section_title` next-intl key) — used as `text-sm text-foreground-muted` field-label per the v0.2 Settings convention; refuses the boilerplate H2 heading.
- Body `Télécharge toutes tes recettes au format JSON. Utile en cas de pépin.` — `pépin` ("snag") is colloquial French, warm, refuses the boilerplate "Download your data" register. This is the editorial work that distinguishes Slow Food copy from generic SaaS copy.
- CTA `Télécharger mes recettes` — verb-object, second-person familiar `tes`, refuses both the imperative "Download" and the generic "Export". The verb names what the user wants (their recipes), not the technical operation.
- Failure copy `Téléchargement impossible. Réessaie dans un instant.` — actionable, second-person familiar `Réessaie`. Mono-cause (see Pillar 6 finding) but the copy itself is good.
- Full next-intl. No drift between rendered strings and `lib/i18n/fr.json` keys (`export_section_title`, `export_body`, `export_cta`, `export_error`).

### Pillar 2: Visuals (3/4)

- `Download` lucide icon on the CTA (`page.tsx:203`) — themed via Button slot but the icon itself is the off-the-shelf glyph. No customization for the JSON-as-recipe-archive metaphor (e.g., a paper/folder-shaped icon would tie to the `paper-grain` Card chrome).
- The surface has no visual hierarchy beyond field-label + body + CTA. No diagram, no preview of what's about to download, no count ("34 recipes"). The contract observed in WALKTHROUGH (`{recipes: [...]}` envelope, 34 entries) doesn't surface to the UI.
- DOCKED -1: the surface is icon + body + button — boilerplate-shaped. The chrome rescues it via reuse, but the surface itself doesn't earn a visual moment.
- Pass-style: Card chrome (`paper-grain bg-card shadow-card rounded-2xl`) is the same construction as the other 3 Settings Cards; the system cohesion lifts the surface above pure boilerplate.

### Pillar 3: Color (3/4)

- Terracotta primary appears once: the CTA `Button` (`variant="default"` resolves to `bg-primary text-primary-foreground` per UI kit). On-system.
- `text-foreground-muted` for both the field-label and the body paragraph — the documented Slow Food muted color.
- DOCKED -1: mono-token surface. No `--color-accent` on the icon, no paper-grain-on-paper-grain fill differentiation, no semantic "data export" tint. The surface uses the system but doesn't express it. Combined with Pillar 2 boilerplate-shape, the surface reads as competent system reuse rather than earned Slow Food expression.

### Pillar 4: Typography (4/4)

- Field-label `text-sm text-foreground-muted` (`page.tsx:190-192`) — the Settings convention.
- Body `text-sm text-foreground-muted` paragraph (`page.tsx:193`) — same scale, same color, deliberate match.
- CTA inherits `font-semibold` from the Button kit at `h-12` (the default Button typography is `text-sm font-medium` per UI-SPEC; the actual rendered weight is the Button kit's choice).
- No display moments (no `font-display italic` Fraunces) — appropriate for a thin utility surface; the display moments live on identity surfaces (Foyer Card invite-code, share-code page).
- No drift; within the locked Slow Food scale.

### Pillar 5: Spacing (4/4)

- Card `p-6 flex flex-col gap-3` — same construction as the other 3 Cards.
- CTA `h-12 w-full` — D-08 48px floor; full-width to match the parent Card's column flow.
- Icon-text margin `mr-2` — the lucide-icon-on-button convention.
- Section gap `gap-6` between Cards (`page.tsx:108`) — the v0.2 Settings stack rhythm.
- Tailwind scale only.

## Screenshots

- `./screenshots/exports-canonical.png` — element-scoped screenshot of the Sauvegarde Card on `/settings`. Shows: section field-label `Exporter mes données`, body copy with `pépin`, terracotta primary CTA with `Download` icon and full text. The bottom-nav inbox-badge "9" is visible at the page bottom (cross-cut to realtime surface — the badge updates via WebSocket).
- `./screenshots/settings-canonical.png` — full-page screenshot of `/settings` showing all 4 Cards stacked (Membre / Foyer / Historique / Sauvegarde). Cross-referenced from settings-UI-REVIEW.md as well; provides whole-page context for the exports Card's position in the Settings stack.

## WALKTHROUGH cross-links (context inherited per D-11)

- WALKTHROUGH.md §Exports: 4 probes (P-12-E01 golden-path pass, P-12-E02 offline button gap, P-12-E03 rapid-double-fetch, P-12-E04 brotli encoding pass) + 0 Gemini calls.
- E-01 + E-04 are pass-style regression canaries (golden-path round-trip + brotli encoding) — load-bearing for Phase 14 ranking as "system works under happy path".
- E-02 + E-03 are the load-bearing user-impact frictions and drive Pillar 6's -3 dock.
- Cross-cut: E-03 (no-debounce-on-submit) is part of the Q03 family seen in capture surfaces — Phase 14 may dedupe these into one cross-cutting observation.
- 0 Gemini calls — Export is deterministic; the surface has no LLM dependency.
