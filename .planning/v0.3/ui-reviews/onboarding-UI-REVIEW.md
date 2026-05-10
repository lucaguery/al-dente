# UI Review — Onboarding

**Audited:** 2026-05-10
**Auditor:** Claude (Phase 13, manual scoring per CONTEXT.md D-06)
**Synthetic env:** [SYNTHETIC] Démo Al Dente @ https://al-dente-pink.vercel.app
**Viewport:** iPhone-shape Chromium 390×844 (isMobile, hasTouch)
**Reach status:** Reached. Multi-screen surface per CONTEXT D-05 — 4 screens captured in ONE UI-REVIEW: `welcome`, `create`, `join`, `share-code`. **Capture method**: Option A (direct URL navigation in the auditor's persistent context) — verified working because `welcome` / `create` / `join` have NO route guard (P-12-O01 friction); for `share-code` the route guards via `useEffect` redirect when no `?code=` query param is present, so the share-code surface visual was captured via source review (`frontend/app/onboarding/share-code/page.tsx`) plus the equivalent identity-surface implementation on `/settings` Card 2 ("Foyer", which mirrors the share-code Fraunces-italic display moment per Phase 9 D-08). Auditor session preserved per T-02 — no logout, no re-onboarding.

## Originality Verdict

**Verdict:** Feels Al Dente ✅

Onboarding is the entry point and it earns the verdict by carrying the strongest identity signature in the entire app: the wordmark `Al Dente` in Fraunces italic display on `/onboarding/welcome` is the only place this exact display moment appears outside the share-code page, and it sets the editorial register before any pixel of product surfaces appears. Each of the 4 screens reuses the same design system primitives in surface-specific compositions — paper-grain Cards on welcome (the entry cards), form-shape Cards on create + join (with Fraunces italic display headings inside them — `Nouveau foyer` / `Rejoindre un foyer`), and the share-code Card with `font-display italic text-3xl tracking-widest text-primary` for the invite-code itself. The copy is the load-bearing element: `Décide ce qu'on mange ensemble.` (welcome tagline), `6 caractères donnés par ta partenaire` (join helper — addresses the real mental model "where do I get this?"), `Ta couleur (les couleurs déjà prises sont grisées)` (join color label — explains the gray-disabled state inline), `J'ai prévenu ma partenaire` (share-code done CTA — refuses the generic "Done"). The 5-color member palette (rose/amber/emerald/sky/violet — `frontend/lib/colors.ts`) ships as 5 hex-coded swatches with `aria-disabled` + `<Lock>` icon overlay on taken colors, an unusually careful identity affordance for an MVP. Where the verdict could have slipped: the structural blocker P-12-O04 (5-member capacity ceiling — see audit-time delta in §Pillar 6) is real and blocks future audits, but it does NOT compromise the onboarding *surface design* — the rendered pixels are correct; the ceiling is a backend/palette-completeness issue. The verdict reflects "the system intends to be Al Dente AND the rendered state is Slow Food".

| Boilerplate elements | Earned elements |
|----------------------|-----------------|
| `MEMBER_COLORS` array uses raw Tailwind hex literals (`#F43F5E` rose / `#F59E0B` amber / `#10B981` emerald / `#0EA5E9` sky / `#8B5CF6` violet — `frontend/lib/colors.ts:1-7`) — semantic tokens like `--color-member-rose` would close the system; member identity surfaces 4 places (avatar dot, vote dots, partner-vote indicators, swatch picker) and they all reach for the literal | `Al Dente` wordmark in `font-display italic` Fraunces (`frontend/app/onboarding/welcome/page.tsx`) — load-bearing identity moment; the only place this exact display register appears at this size outside share-code |
| `<input>` invite-code field uses `tracking-[0.3em] uppercase` letter-spacing trick to display `A B C 1 2 3` placeholder spacing — pleasant but a `<input pattern="[A-Z0-9]{6}">` + custom letter-stepper (each char in its own slot) would be the earned implementation; the current spacing is CSS-trickery on a single text input | `6 caractères donnés par ta partenaire` helper text under the code input (`onboarding.join.code_helper`) — addresses the real user mental model ("where do I get this?"), refuses the generic "Enter your invite code" |
| The "Done" affordance pattern (button at bottom of share-code page) is a generic full-width primary button — copy is `J'ai prévenu ma partenaire` which IS earned, but the button shape itself is conventional | `Ta couleur (les couleurs déjà prises sont grisées)` color label (`onboarding.join.color_label`) — explains the gray-disabled state inline within the label, refuses to require the user to discover affordance state via interaction |
| O-04 capacity ceiling: 5-color palette caps household at 5 members; backend has no max-members enforcement returning a distinct 422 — the silent failure (UI shows all swatches taken, no message) is generic-form boilerplate behavior | `<Lock>` icon overlay on taken swatches in `ColorSwatchPicker.tsx:42-46` — the chosen affordance for "this color is taken" is a real visual mark, not just `opacity-40`; refuses the lazy disabled-button-only approach |
| `share-code` route guard is a client-side `useEffect` redirect on missing `?code=` (`share-code/page.tsx:19-23`) — works but a server-side redirect (Next.js middleware or `redirect()` in a Server Component) would be the React 19 / Next.js 16 production-grade idiom; the inconsistency with welcome/create/join (which have NO guard, P-12-O01) is the bigger UX gap | Wordmark + tagline composition on `welcome.tsx` — `Al Dente` Fraunces italic above `Décide ce qu'on mange ensemble.` text-foreground-muted, sets editorial register before any product surface; the tagline is the product positioning in one sentence |

## 6-Pillar Score: 21/24

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| Copywriting | 4/4 | Tagline `Décide ce qu'on mange ensemble.` (welcome) is product positioning in one sentence. Helper `6 caractères donnés par ta partenaire` (join) addresses real mental model. Color label `Ta couleur (les couleurs déjà prises sont grisées)` explains affordance state inline. Done CTA `J'ai prévenu ma partenaire` (share-code) refuses generic "Done". Errors `Ce code n'existe pas. Vérifie auprès de ta partenaire.` are warm + actionable. Full next-intl. |
| Visuals | 4/4 | `Al Dente` wordmark in Fraunces italic on welcome — load-bearing identity moment. Welcome's two paper-grain Cards (Créer / Rejoindre) with `<ChevronRight>` trailing icons are real entry-card register, not generic list items. Color swatch picker has `<Lock>` icon overlay on taken state (`ColorSwatchPicker.tsx:42-46`). Share-code displays the code in `font-display italic text-3xl tracking-widest text-primary` — the same display register as the wordmark, deliberately treating the code as identity artifact. |
| Color | 3/4 | DOCKED -1 — `MEMBER_COLORS` palette ships as raw Tailwind hex literals (`frontend/lib/colors.ts:1-7`); semantic tokens like `--color-member-rose` would close the system and the implementation surfaces these 4 places (avatar dots, vote dots, partner indicators, swatch picker) all reaching for the literal. The same recurring token-completeness pattern as the emerald-Tailwind-literal cluster identified in Plan 13-02. Other palette use is clean: terracotta primary CTAs, paper-grain Card chrome, foreground-muted helper text — all semantic. |
| Typography | 4/4 | Two display moments: `Al Dente` wordmark and the share-code invite-code rendering — both Fraunces italic, both load-bearing. `text-display` class on form Card headings (`Nouveau foyer` / `Rejoindre un foyer`). Standard `text-base font-semibold` field labels. `text-sm text-foreground-muted` helper text. Within scale; uses display moments sparingly + deliberately. |
| Spacing | 4/4 | Welcome's vertical rhythm: wordmark + tagline at top, 75% empty space, two CTA Cards at bottom — the deliberate hold-the-page-empty composition refuses the generic "fill every pixel" and gives the entry moment ceremonial weight. Form Cards use `gap-4` field stacks, `h-12` inputs, `h-12 w-12` color swatches, `flex flex-row gap-3` swatch row. Share-code Card `gap-4` field stack with `py-4` for the code display moment. Tailwind scale only. |
| Experience Design | 2/4 | DOCKED -2. Two structural items stack: (a) **P-12-O01 missing route guard on welcome/join/create** — authenticated users can land on these screens via stale tab / deep-link and start a flow that, if completed with a different name, would overwrite their cookie and destroy their original member-#4 session without confirmation. The share-code page DOES have the redirect guard, so the inconsistency is the structural gap (some onboarding routes self-protect, others don't). (b) **P-12-O04 5-member capacity ceiling + silent failure** — palette has exactly 5 swatches; if all 5 members exist, joining is silently impossible (all swatches show as taken via `<Lock>` overlay, submit stays disabled, no error copy explains "this household is full"). Filed at https://github.com/lucaguery/al-dente/issues/7. The visible chrome handles "color taken" correctly; the structural ceiling has no terminal-state surface. **Audit-time delta** (see below): WALKTHROUGH §Onboarding O-04 stated "palette has only 4 swatches" — live code review (2026-05-10) shows 5 swatches in `MEMBER_COLORS`. The blocker stands (capacity ceiling exists at N=5 instead of N=4) but the audit baseline shifts. |

## Detailed Findings

### Welcome Screen (`/onboarding/welcome`)

- Wordmark + tagline composition: `Al Dente` in Fraunces italic display + `Décide ce qu'on mange ensemble.` in `text-foreground-muted` body. The deliberate top-anchored placement with ~75% empty space below is unusual for a typical app entry (which would fill every pixel) — it reads as ceremonial / editorial.
- Two entry Cards at bottom: `Créer un foyer` + `Rejoindre un foyer`, each with paper-grain Card chrome and trailing `<ChevronRight>` icon. Equal visual weight refuses the "primary action wins" pattern; both paths are first-class.
- **Route guard friction (P-12-O01):** authenticated users see this surface (no redirect-home guard). A user with a stale browser tab can deep-link here and start a destructive re-onboarding flow. (See WALKTHROUGH.md §Onboarding — P-12-O01)

### Create Screen (`/onboarding/create`)

- Form Card with `<h1 className="text-display">Nouveau foyer</h1>` Fraunces italic display heading inside the Card — display register reused inside form chrome.
- Three fields: household name (`Nom du foyer` with placeholder `Notre cuisine` — the placeholder itself is editorial), member name (`Ton prénom`), color picker (`Ta couleur` with 5 swatches: rose / amber / emerald / sky / violet, all enabled because there are no taken_colors at create time).
- Submit CTA `Créer le foyer` ships at the page bottom; disabled visually until all fields are valid.
- **No route guard** (same as welcome — P-12-O01 cluster).
- Color picker swatches show as h-12 w-12 hex-filled circles — no Lock icon at create-time because no colors are taken in the new-household state.

### Join Screen (`/onboarding/join`)

- Form Card with `<h1 className="text-display">Rejoindre un foyer</h1>`.
- Code input shows `A B C 1 2 3` placeholder spacing (achieved via `tracking-[0.3em] uppercase` CSS) — pleasant but not the earned letter-stepper; it's a single `<input>` with display tricks.
- Helper `6 caractères donnés par ta partenaire` directly under the code input — addresses real mental model, refuses generic "Enter invite code" copy.
- Color picker label inline-explains the gray state: `Ta couleur (les couleurs déjà prises sont grisées)`.
- All 5 swatches visible at empty-state (no preview fired yet, no taken_colors known); on code-typed state, the debounced `GET /api/households/by-code/{code}` preview returns `taken_colors: [...]` and the picker grays + lock-icons taken swatches.
- Submit CTA `Rejoindre` (terracotta primary, full-width, h-12); disabled until all valid + color picked.
- **Audit-time delta from WALKTHROUGH O-04**: WALKTHROUGH stated "the locked palette has only 4 swatches per ColorSwatchPicker"; live code review of `frontend/lib/colors.ts` (2026-05-10) shows **5 swatches**: rose / amber / emerald / sky / **violet**. Either the WALKTHROUGH miscounted, or `MEMBER_COLORS` was extended between Phase 12 (2026-05-09) and Phase 13 (2026-05-10) — git log inspection would confirm. The capacity blocker stands but at N=5 instead of N=4. Issue [#7] (https://github.com/lucaguery/al-dente/issues/7) may need text adjustment but the underlying terminal-state UX gap is unchanged.
- **No route guard** (same as welcome/create — P-12-O01 cluster).

### Share-Code Screen (`/onboarding/share-code?code=...`)

- Captured via source review only — direct navigation without `?code=` query param triggers the `useEffect` redirect to `/` (`share-code/page.tsx:19-23`); auditor session is already in a household (`DEMO01`), so no fresh-create state was available without violating T-02.
- Visual composition (per source):
  - Card with `<h1 className="text-display">Foyer créé</h1>` Fraunces italic display heading.
  - Body `Partage ce code avec ta partenaire :` (next-intl `share_code.body`).
  - Code rendered as `<div className="font-display italic text-3xl tracking-widest text-primary text-center py-4">` — Fraunces italic terracotta, generous tracking. **This is the same display register as the wordmark.** Treating the code as an identity artifact (not just a string of characters) is the editorial choice that lifts share-code above the generic "here's your invite code" boilerplate.
  - `<Copy>` icon `Copier le code` secondary Button (`copy_cta`) — copies to clipboard with success toast `Copié dans le presse-papier`.
  - Fixed-bottom primary `J'ai prévenu ma partenaire` Button (`done_cta`) navigates back to `/`.
- **Has route guard** (the `useEffect` redirect on missing `?code=`) — selective onboarding-route protection (the only one of the 4 screens that self-protects).
- Cross-cut to `/settings` Card 2 (Foyer): the same Fraunces-italic-terracotta display register is mirrored on the persistent settings invite-code Card per Phase 9 D-08. So the share-code design is verifiable on `/settings` even when share-code itself is unreachable in the auditor's session — the design system carries the moment forward into the persistent identity surface.
- **POLISH-02 status**: PROJECT.md §Surfaced for follow-up listed POLISH-02 as "Copy button on invite code" — live audit confirms the Copy button DOES exist on share-code AND on `/settings` Card 2 (the snapshot at audit time included `button "Copier le code d'invitation" [ref=e44]`). POLISH-02 appears resolved or filed-but-actually-shipped; recommend reconciliation in Phase 14 cross-cutting observations.

### Pillar 6: Experience Design (2/4)

- **P-12-O01 — missing route guard on 3 of 4 onboarding screens.** `/onboarding/welcome` + `/onboarding/create` + `/onboarding/join` render normally for authenticated users; only `/onboarding/share-code` self-redirects (and only because of the missing query param, not because the user is authenticated). A user with a stale tab can land on welcome, click `Rejoindre un foyer`, type their existing invite code with a different name, and submit — backend will create a new member, frontend will overwrite the cookie via `set_auth_cookie`, original session destroyed. Friction not blocker because the destructive path requires a visible name-change step. (See WALKTHROUGH.md §Onboarding — P-12-O01)
- **P-12-O04 — 5-member capacity ceiling with silent failure terminal state.** When all 5 swatches in `MEMBER_COLORS` are taken (the household has 5 members), the join form shows all swatches with `<Lock>` icon overlay, submit stays disabled, no error message explains "this household is full." The product implicitly caps household size at 5 (the palette length) without documentation or a server-side max-members enforcement. Filed: [#7]. **Audit-time delta**: WALKTHROUGH O-04 stated palette has 4 swatches; live code shows 5 — blocker stands at higher N but text needs reconciliation.
- **P-12-O05 — color collision race friction layered on O-04.** When a user previews a code (3 swatches taken at preview time), picks the only free swatch, and another joiner takes it before submit: backend correctly returns 409, frontend re-fetches preview and updates the picker, but with the household at-capacity this can leave the user in a "all swatches now taken, no recovery path" state. (See WALKTHROUGH.md §Onboarding — P-12-O05)
- **Pass-style: bad invite code surfaces accurate French error.** Typing `ZZZZZZ` returns 404 from `GET /api/households/by-code/ZZZZZZ`; UI shows aria-live error `Ce code n'existe pas. Vérifie auprès de ta partenaire.` — clear, addresses real user mental model. (See WALKTHROUGH.md §Onboarding — P-12-O02)
- **Pass-style: lowercase-to-uppercase auto-filter works.** `e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)` at `join/page.tsx:177-181` correctly converts `demo01` → `DEMO01`. (See WALKTHROUGH.md §Onboarding — P-12-O03)

### Pillar 1: Copywriting (4/4)

- Welcome tagline `Décide ce qu'on mange ensemble.` — product positioning in one sentence; second-person familiar `on mange`, present tense, refuses the generic "Welcome to Al Dente."
- Form headings `Nouveau foyer` / `Rejoindre un foyer` — noun phrases, refuse the imperative "Create a new household".
- Helper `6 caractères donnés par ta partenaire` — addresses the real mental model ("where do I get this?"), refuses generic "Enter your invite code".
- Color label `Ta couleur (les couleurs déjà prises sont grisées)` — explains affordance state inline.
- Done CTA `J'ai prévenu ma partenaire` — first-person past-tense, treats sharing as a relationship moment not a transaction; refuses generic "Done".
- Error copy `Ce code n'existe pas. Vérifie auprès de ta partenaire.` — actionable, names who has the answer, refuses the generic "Invalid code".
- Toast `Copié dans le presse-papier` — concise system response.
- Full next-intl. No drift between rendered strings and `lib/i18n/fr.json`.

### Pillar 2: Visuals (4/4)

- `Al Dente` wordmark in Fraunces italic display on welcome — the editorial signature.
- Two welcome Cards (`Créer` + `Rejoindre`) at the bottom of the page give the entry moment ceremonial weight (the deliberate empty space above is the design choice).
- Color swatch picker uses `<Lock>` icon overlay (`ColorSwatchPicker.tsx:42-46`) on `aria-disabled` taken swatches — refuses the lazy `opacity-40` only approach; the lock icon is a real "system says no" affordance.
- Share-code displays the code in Fraunces italic tracking-widest terracotta — same register as the wordmark, deliberately treating the code as identity artifact.
- Form Cards reuse the system Card chrome consistently across create + join.

### Pillar 3: Color (3/4)

- DOCKED -1: `MEMBER_COLORS` palette in `frontend/lib/colors.ts:1-7` ships as raw Tailwind-aligned hex literals (`#F43F5E` rose / `#F59E0B` amber / `#10B981` emerald / `#0EA5E9` sky / `#8B5CF6` violet); semantic tokens like `--color-member-rose-bg` / `--color-member-rose-foreground` would close the system. The hex-literal pattern surfaces in 4 places (member avatar dot, vote dots, partner-vote indicators, swatch picker itself) — single-token-set fix scope.
- Other palette use is clean: terracotta primary CTAs, paper-grain Card chrome with `bg-card`, foreground-muted helper text, `text-primary` on the share-code display moment. All semantic tokens.
- Cross-link to Plan 13-02 emerald-literal pattern: this is the SAME class of finding (Tailwind palette literals where custom CSS variables would close the system); together with the emerald cluster, the v0.4 token-completeness sweep should treat both as a single coordinated scope.

### Pillar 4: Typography (4/4)

- Two Fraunces italic display moments: wordmark on welcome + invite-code rendering on share-code. Both load-bearing, both used sparingly.
- `text-display` class on form Card headings (`Nouveau foyer` / `Rejoindre un foyer`) — display moment inside the Card chrome, marks the "you are about to commit" register.
- Standard scale otherwise: `text-base font-semibold` field labels, `text-sm text-foreground-muted` helpers, h-12 input field heights.

### Pillar 5: Spacing (4/4)

- Welcome's hold-the-page composition: ~25% top (wordmark + tagline), ~50% empty, ~25% bottom (two CTA Cards) — the deliberate empty space refuses the "fill every pixel" generic onboarding pattern.
- Form Cards use `gap-4` field stacks, h-12 inputs (D-08 floor), h-12 w-12 color swatches with `flex flex-row gap-3` swatch row.
- Share-code Card uses `py-4` around the code display moment to give it air.
- Fixed-bottom Done CTA on share-code uses `pb-6 + env(safe-area-inset-bottom)` for iPhone notch handling — production-grade.
- Tailwind scale only.

## Screenshots

- `./screenshots/onboarding-welcome.png` — full-page screenshot of `/onboarding/welcome`. Shows: `Al Dente` wordmark in Fraunces italic display, tagline `Décide ce qu'on mange ensemble.`, deliberate empty space, two paper-grain CTA Cards at bottom (`Créer un foyer` / `Rejoindre un foyer`) with trailing `<ChevronRight>` icons. Captures the ceremonial entry-moment composition.
- `./screenshots/onboarding-create.png` — full-page screenshot of `/onboarding/create`. Shows: header bar with back chevron + `Nouveau foyer`, form Card with Fraunces italic `Nouveau foyer` heading, household-name input (focused, with placeholder `Notre cuisine`), member-name input, 5-color swatch row (rose/amber/emerald/sky/violet — all enabled at create-time, no taken_colors), disabled `Créer le foyer` Button at bottom.
- `./screenshots/onboarding-join.png` — full-page screenshot of `/onboarding/join`. Shows: header bar with back chevron + `Rejoindre un foyer`, form Card with Fraunces italic heading, code input (focused, with `A B C 1 2 3` letter-spaced placeholder), helper `6 caractères donnés par ta partenaire`, member-name input, 5-color swatch row (all enabled at empty-state — preview hasn't fired yet), inline color label `Ta couleur (les couleurs déjà prises sont grisées)`, disabled `Rejoindre` Button at bottom.
- `./screenshots/onboarding-share-code.png` — captures the **redirect behavior** rather than the share-code surface itself. Direct navigation without `?code=` query param triggers the `useEffect` redirect to `/`; the rendered page is HomeDecide (showing today's shortlist `dimanche 10 mai` recap state with `Validé` chips on `Coq au vin` + `Butter chicken`). Documents the route-guard behavior that distinguishes share-code from welcome/create/join (which have NO guard — P-12-O01). Cross-link to `/settings` Card 2 ("Foyer", with "DEMO01" Fraunces italic terracotta + Copy button) for the equivalent identity-display surface that IS reachable in the auditor's session.

## WALKTHROUGH cross-links (context inherited per D-11)

- WALKTHROUGH.md §Onboarding: 5 probes (P-12-O01..O05) + 0 Gemini calls.
- P-12-O01 (missing route guard) drives Pillar 6 -1.
- P-12-O04 (5-member capacity ceiling, audit-time delta from 4 → 5) drives Pillar 6 -1; filed [#7].
- P-12-O05 (color collision race) is layered on O-04 — same finding cluster.
- P-12-O02 (bad code error) + P-12-O03 (lowercase auto-filter) are pass-style regression canaries.
- POLISH-02 (Copy button on invite code) appears RESOLVED at live audit (button exists at both share-code and `/settings` Card 2) — Phase 14 should reconcile in cross-cutting observations.
- 0 Gemini calls — Onboarding is non-AI.
