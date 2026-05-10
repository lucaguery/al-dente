# UI Review — Settings

**Audited:** 2026-05-10
**Auditor:** Claude (Phase 13, manual scoring per CONTEXT.md D-06)
**Synthetic env:** [SYNTHETIC] Démo Al Dente @ https://al-dente-pink.vercel.app
**Viewport:** iPhone-shape Chromium 390×844 (isMobile, hasTouch)
**Reach status:** Reached. `/settings` renders 4 paper-grain Cards stacked at `gap-6` (Phase 9 D-08 layout): Membre / Foyer / Historique / Sauvegarde. Page title `Paramètres`. Per CONTEXT specifics, Settings carries more Phase 14 weight than its WALKTHROUGH §Settings span suggests because WALKTHROUGH §Settings was thin ("behaves as documented") — this Phase 13 review provides the load-bearing visual + structural assessment of the surface. Cross-cuts: the Sauvegarde Card is also scored separately as the exports surface (`exports-UI-REVIEW.md`); this review focuses on the Membre + Foyer + Historique Cards plus the page-level composition. Note: P-12-S01 confirms **POLISH-02 RESOLVED** — Copy button on invite code shipped during Phase 9 work but was never struck off the v0.2.2 backlog (recommend Phase 14 reconcile).

## Originality Verdict

**Verdict:** Feels Al Dente ✅

Settings is — surprisingly for a typically utility-shaped surface — the 5th surface in this milestone to earn the ✅ verdict. The 4-Card stack (Membre / Foyer / Historique / Sauvegarde) refuses the boilerplate "Settings list" pattern (no left-aligned chevron rows, no toggle-heavy preferences screen, no dark-mode + version-number filler). Each Card has exactly the affordances it needs and nothing more — Membre is read-only identity (color dot + name), Foyer carries the **single most identity-bearing class string in v0.2** (`font-display italic text-3xl tracking-widest text-primary` invite-code rendering, byte-for-byte mirror of share-code per Plan 9 D-08), Historique is a single navigation row to `/cooking-logs`, Sauvegarde is the JSON export. The field-label-as-section-title pattern (e.g. `Toi` / `Nom du foyer` / `Code d'invitation` / `Exporter mes données` rendered as `text-sm text-foreground-muted`) refuses to invent H2 headings — section meaning is delivered by the Card grouping plus the field-label, not by chrome typography. The one structural blocker on this surface ([#8] P-12-S02 — `PATCH /api/households/me` returns 405; member name unchangeable post-onboarding) is real and silent (no UI affordance suggests the user CAN'T fix a typo'd name) — but it's an **architecture invariant gap** ("members own their identity" implication), not a visual or token-compliance failure. Per CONTEXT D-01, the verdict criteria explicitly distinguish "the rendered pixels respect the design system" from "the system intends to be Al Dente AND the rendered state is Slow Food" — this surface satisfies both, and the invariant gap is a Pillar 6 dock target rather than a verdict killer.

| Boilerplate elements | Earned elements |
|----------------------|-----------------|
| Hardcoded `"Historique"` and `"Voir les cuissons récentes"` strings on the Historique Card (`settings/page.tsx:176-179`) — violates architecture invariant #6 (next-intl all-French); the source comment at lines 172-174 honestly marks it as `TODO(productize)` for the v0.2.1 i18n sweep, but the user-visible drift remains | `font-display italic text-3xl tracking-widest text-primary` invite-code rendering on the Foyer Card (`page.tsx:145-150`) — **the single most identity-bearing class string in v0.2**, byte-for-byte mirror of share-code; treats the code as identity artifact (a household monogram) rather than a string of characters |
| The Membre Card's read-only design IS by design but ships with NO indication that editing isn't possible — no `(non-modifiable)` annotation, no `Modifier` button leading to a "feature coming soon" / TODO marker, no productize-later hint; the user has to discover the absence by attempting and failing | Field-label-as-section-title pattern (`text-sm text-foreground-muted` on `Toi` / `Nom du foyer` / `Code d'invitation` / `Exporter mes données`) — the section meaning is delivered by the Card grouping + field-label, refusing the boilerplate "create H2 headings to mark sections" idiom |
| Sauvegarde CTA copy `Télécharger mes recettes` ships with the off-the-shelf lucide `Download` icon — themed but not customized for the JSON-as-recipe-archive metaphor (cross-link Plan 13-03 exports finding) | `<MemberDot>` component on Membre Card (`page.tsx:119`) — explicit Slow Food member-identity component (not a generic colored dot); reuses the same primitive as the partner-vote indicators on shortlist + vote chips |
| No "Quitter le foyer" affordance — once joined, the cookie is binding and there is no in-app off-switch (P-12-S03); friction not blocker because couple-scale rarely exercises it but a productize-later marker is missing | Sticky `Paramètres` header at `top-0 h-12 backdrop-blur-sm border-b border-border z-10` (`page.tsx:104-106`) — ships the production-grade scroll-pinned header chrome that signals depth-on-this-surface (refuses the static H1-at-top boilerplate) |
| 4-Card vertical stack is conventional layout shape — what's earned is each Card's content, not the macro composition | Copy-icon Button with 2-second `Check` icon swap (`page.tsx:154-162` + `setTimeout` at `page.tsx:57`) — refuses the lazy "show toast then revert" pattern; the icon-swap visual feedback is precisely the right level of system response for a clipboard action |

## 6-Pillar Score: 21/24

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| Copywriting | 3/4 | DOCKED -1 — `"Historique"` and `"Voir les cuissons récentes"` strings hardcoded on the Historique Card (`page.tsx:176-179`), violating architecture invariant #6 (next-intl all-French). The source honestly marks this as `TODO(productize)` for the v0.2.1 i18n sweep (cross-link POLISH-01) but the user-visible drift remains until the sweep lands. Otherwise: `Toi` / `Nom du foyer` / `Code d'invitation` / `Exporter mes données` are warm field-labels; `Partage ce code avec ton partenaire pour qu'il rejoigne le foyer.` (invite-code helper) addresses real mental model. |
| Visuals | 4/4 | The Foyer Card invite-code rendering — Fraunces italic terracotta wide-tracking — is the load-bearing identity moment of the entire app (used twice: share-code first-touch + Settings persistent re-find). `<MemberDot>` on Membre Card uses the member's hex-color from `MEMBER_COLORS` (the same palette as ColorSwatchPicker — cross-link onboarding finding). Copy button uses lucide `Copy` icon with `Check` icon swap on tap — production-grade visual feedback. Sticky scroll-pinned header chrome. |
| Color | 4/4 | Pure semantic tokens across all 4 Cards: `paper-grain bg-card shadow-card` chrome, `text-foreground-muted` for labels + helper text, `text-primary` only on the load-bearing display moment (the invite code) and on the Sauvegarde primary CTA. The `<MemberDot>` does pull from `MEMBER_COLORS` hex literals (the same Pillar 3 dock target identified in `onboarding-UI-REVIEW`) — but it's a single `<span style={{backgroundColor}}>` consumer, not a Tailwind palette literal in JSX. The dock would double-count if applied here; the literal is in `lib/colors.ts` and is the same single fix scope. **This surface itself uses no palette literals.** Clean. |
| Typography | 4/4 | Two display moments calibrated correctly: `font-display italic text-3xl tracking-widest` on the invite code (load-bearing), and that's it for display register on Settings — the rest stays in `text-base` (member name, household name) / `text-sm` (field labels, helper, Historique link, Sauvegarde body). The header `text-base font-semibold` for `Paramètres` is appropriate sub-display weight. Refuses to invent typography moments where none are needed. |
| Spacing | 4/4 | Page rhythm: `gap-6` Card stack with `px-6 pt-6 pb-24` page padding (the `pb-24` reserves space for the BottomNav). Each Card uses `p-6 flex flex-col gap-{2,3,4}` internal stack with field-label-on-top + value-below. Tap targets all at the 48px D-08 floor: `h-12 w-12` Copy button (icon-only, square), `h-12 w-full` Sauvegarde CTA, `h-12` Historique link with trailing `<ChevronRight>`. Sticky header `h-12`. Tailwind scale only. |
| Experience Design | 2/4 | DOCKED -2. Two structural items stack: (a) **P-12-S02 [Issue #8] — `PATCH /api/households/me` returns 405; member name unchangeable post-onboarding.** No UI affordance, no edit pencil, no `Modifier` button. The architecture invariant ("members own their identity") implication is silently broken at v0.1 ship. Compounds with O-04 (cannot create new members) — once you onboard with a typo, you're stuck permanently. (b) **P-12-S03 — no "Quitter le foyer" path.** No DELETE route in `households.py`, no UI affordance. Couple-scale (the target audience) rarely exercises this, but the absence is undocumented (no productize-later marker). The 2 frictions visible are: surface ships clean visible artifact (4-Card stack works), but two of the user's natural identity-management actions ("change my name" + "leave this household") have neither implementation nor explicit deferral. (See WALKTHROUGH.md §Settings — P-12-S02, P-12-S03) |

## Detailed Findings

### Card 1 — Membre

- Construction: `paper-grain shadow-card p-6 flex flex-col gap-2`. Field-label `Toi` (next-intl `settings.member_label`) + member identity row (`<MemberDot>` + member name in `text-base font-medium`).
- `<MemberDot>` is the Slow Food member-identity primitive — same component used for partner-vote indicators on shortlist cards + vote chips. The system reuse means the member's chosen color appears with consistent visual register across every surface.
- **Read-only by design** but ships with no indication that editing isn't possible. A `(non-modifiable)` annotation, a disabled-with-tooltip `Modifier` button, or a productize-later hint would close the discoverability gap.
- (See WALKTHROUGH.md §Settings — P-12-S02, P-12-S04 for the structural backing of this read-only choice)

### Card 2 — Foyer

- Construction: `paper-grain shadow-card p-6 flex flex-col gap-4` with two field-stacks (household name + invite code).
- **Identity signature**: invite code rendered with `<span className="font-display italic text-3xl tracking-widest text-primary" aria-label={t("invite_code_aria")}>{session.invite_code}</span>` (`page.tsx:145-150`). The class string is **byte-for-byte identical** to the share-code page's invite-code rendering per the inline source comment at lines 124-128 — the deliberate mirror means a user sees their household monogram in exactly the same visual register at first-touch (share-code) and at any subsequent recall (Settings). This recognition pattern is the load-bearing v0.2 design choice.
- Copy Button: `<Button size="icon" variant="ghost" className="h-12 w-12">` with lucide `Copy` icon → `Check` icon swap via `setCopied(true) + setTimeout` (`page.tsx:53-61`). Tap-target at 48px D-08 floor. The icon-swap visual feedback is precisely the right level of system response — refuses the lazy "toast only" or the over-engineered "pulse animation".
- Helper copy `Partage ce code avec ton partenaire pour qu'il rejoigne le foyer.` (next-intl `settings.invite_code_helper`) — addresses real user intent ("why would I copy this?"), refuses generic "Tap to copy".
- (See WALKTHROUGH.md §Settings — P-12-S01 POLISH-02 resolved: Copy button shipped per Phase 9 D-08)

### Card 3 — Historique

- Construction: `paper-grain shadow-card p-6 flex flex-col gap-3`. Single navigation row to `/cooking-logs`.
- **Hardcoded French copy violation**: `<span>Historique</span>` and `<span>Voir les cuissons récentes</span>` are written directly in JSX at `page.tsx:176, 179` — they should be next-intl keys per architecture invariant #6. The source honestly marks this as `TODO(productize)` for the v0.2.1 i18n sweep alongside the HomeDecide partner-waiting strings (cross-link POLISH-01).
- Link wraps a Button with `variant="ghost"` and `<ChevronRight>` trailing icon — the standard Slow Food navigation row register.
- (See WALKTHROUGH.md §Settings — P-12-S05; cross-link POLISH-01)

### Card 4 — Sauvegarde

- Cross-link to `exports-UI-REVIEW.md` — the JSON export surface scored separately. Same Card chrome construction, scored 19/24 ⚠ on its own (Pillar 6 -3 from offline-button-stays-clickable + double-fetch race + iOS-Safari-tab-not-download annotation). The cross-link means Phase 14 should NOT double-count — the surface appears once in this review for layout context and once in exports-UI-REVIEW for full per-pillar scoring.

### Sticky Header

- `<header className="sticky top-0 h-12 px-6 flex items-center bg-background/80 backdrop-blur-sm border-b border-border z-10">` (`page.tsx:104-106`).
- Production-grade chrome: scroll-pinned, backdrop-blurred, bordered, z-indexed above the BottomNav. Signals "this is a screen with depth" — refuses the static H1-at-top boilerplate.

### Pillar 6: Experience Design (2/4)

- **P-12-S02 [Issue #8] — Member name unchangeable.** `PATCH /api/households/me` returns `405 Method Not Allowed`. No UI affordance, no edit pencil, no `Modifier` button. A user who picked a typo'd name during onboarding has NO recovery path short of (a) the D-07 idempotent rejoin trick (creates a NEW member, leaves the old as DB orphan), or (b) backend admin intervention. **Architecture invariant gap** — the spec's "members own their identity" implication does not hold in v0.1 ship. Compounds with O-04 (cannot create new members).
- **P-12-S03 — No "Quitter le foyer" path.** No DELETE route in `households.py`, no UI affordance. The cookie is binding and there is no in-app off-switch — only a multi-step browser-data clear. Couple-scale rarely exercises this, but the absence is undocumented (no productize-later marker).
- **P-12-S05 — Hardcoded French strings on Historique Card.** Architecture invariant #6 (next-intl) violated user-visibly. The TODO is honestly marked in source; the violation surfaces until the v0.2.1 i18n sweep lands. Cross-link POLISH-01.
- **Pass-style: P-12-S01 — POLISH-02 RESOLVED.** Copy button on invite code shipped per Phase 9 D-08; the v0.2.2 backlog should mark POLISH-02 closed. Backlog hygiene win.
- **Pass-style: P-12-S04 — 200-char member-name boundary probe correctly foreclosed at the only writable entry point.** `<Input maxLength={60}>` on the join form (`join/page.tsx:223-224`) prevents the boundary issue at onboarding time; the absence of a Settings editor (P-12-S02) means the cross-surface boundary probe is moot. **Two-step defense**: server-side validation + client-side maxLength + read-only post-onboarding settings. The shape works for v0.1 ship.

### Pillar 1: Copywriting (3/4)

- DOCKED -1: `Historique` + `Voir les cuissons récentes` hardcoded on Historique Card.
- Field labels: `Toi` (Membre `member_label`) — first-person familiar, refuses formal "Vous" or technical "Member"; `Nom du foyer` (Foyer); `Code d'invitation` (Foyer) with helper `Partage ce code avec ton partenaire pour qu'il rejoigne le foyer.` (warm, intent-named); `Exporter mes données` (Sauvegarde) with body via `exports-UI-REVIEW.md`.
- Sticky header title `Paramètres` (next-intl `settings.title`) — single-word, refuses the over-explicit "Account Settings" / "Application Settings".
- Copy toasts `Copié dans le presse-papier` (success) / `Échec de la copie. Réessaie.` (failure) — concise + actionable.

### Pillar 2: Visuals (4/4)

- The Foyer Card invite-code rendering is the visual identity moment of the entire app — Fraunces italic terracotta wide-tracking; identical class string between share-code and Settings means the recognition pattern is intentional.
- `<MemberDot>` reuse on Membre Card carries member-identity color across every surface that displays members.
- Copy → Check icon swap on tap is the right visual feedback level — production-grade, not over-engineered.
- Sticky scroll-pinned backdrop-blurred header chrome marks the surface as production-quality.
- 4-Card stack composition is conventional but each Card's content earns its place.

### Pillar 3: Color (4/4)

- Pure semantic tokens on this surface: `bg-card`, `paper-grain`, `shadow-card`, `text-foreground-muted`, `text-primary`, `border-border`, `bg-background/80 backdrop-blur-sm`. No Tailwind palette literals in this file.
- The `<MemberDot>` consumes `MEMBER_COLORS` hex via `style={{backgroundColor}}` (production-grade prop-driven) — the dock target lives in `lib/colors.ts`, not here.
- The Sauvegarde CTA is the only `text-primary` use; the invite-code rendering is the only display-register `text-primary` use. Two terracotta moments per page, each load-bearing.

### Pillar 4: Typography (4/4)

- One display moment: invite code in `font-display italic text-3xl tracking-widest`. Load-bearing; nothing else on the page reaches this register.
- `text-base font-semibold` header title; `text-base font-medium` member + household names; `text-sm text-foreground-muted` field labels + helper text. Three sizes, two weights, refuses to invent typography variations.
- The deliberate single-display-moment discipline is the rare thing — most settings pages would put H1 / H2 / H3 hierarchy in for "structure"; this one trusts the Card grouping to do the structuring.

### Pillar 5: Spacing (4/4)

- Page rhythm: `gap-6` Card stack + `px-6 pt-6 pb-24` page padding (the `pb-24` reserves BottomNav clearance).
- Internal Card rhythm: `p-6 flex flex-col gap-{2,3,4}` — `gap-2` on Membre (label + identity row), `gap-4` on Foyer (two field stacks), `gap-3` on Historique + Sauvegarde (label + helper + CTA).
- Tap targets all at 48px D-08 floor: `h-12 w-12` Copy button, `h-12 w-full` Sauvegarde CTA, `h-12` Historique link, sticky header `h-12`.
- Tailwind scale only.

## Screenshots

- `./screenshots/settings-canonical.png` — full-page screenshot of `/settings` showing all 4 Cards stacked: **Membre** (`Toi` field-label + `<MemberDot>` color dot + `Auditor` name), **Foyer** (`Nom du foyer` + `[SYNTHETIC] Démo Al Dente` + `Code d'invitation` field-label + `DEMO01` in Fraunces italic terracotta + Copy button + `Partage ce code...` helper), **Historique** (`Historique` field-label + `Voir les cuissons récentes` link with trailing chevron), **Sauvegarde** (`Exporter mes données` field-label + `Télécharge toutes tes recettes...` body + `Télécharger mes recettes` primary CTA with Download icon). Sticky `Paramètres` header at top, BottomNav at bottom (with active "Plus" tab + inbox badge "9"). Captures the load-bearing identity-signature display moment plus the page-level composition.
- (Cross-reference `exports-canonical.png` for the focused Sauvegarde Card screenshot — scored separately in `exports-UI-REVIEW.md`.)

## WALKTHROUGH cross-links (context inherited per D-11)

- WALKTHROUGH.md §Settings: 5 probes (P-12-S01..S05) + 0 Gemini calls.
- P-12-S01 — POLISH-02 RESOLVED (Copy button shipped during Phase 9 work). Pass-style + backlog hygiene win. Phase 14 should reconcile POLISH-02 status in cross-cutting observations.
- P-12-S02 [Issue #8] — Member name unchangeable (PATCH 405). Pillar 6 -1 driver.
- P-12-S03 — No "Quitter le foyer" affordance. Pillar 6 -1 driver (compounds with S-02).
- P-12-S04 — 200-char member-name boundary probe moot (cross-link S-02). Pass-style on the two-step defense (`maxLength={60}` at join + read-only at settings).
- P-12-S05 — Hardcoded `Historique` strings violate next-intl invariant #6. Pillar 1 -1 driver. Cross-link POLISH-01 (i18n sweep cluster).
- Cross-cuts: Sauvegarde Card scored separately in `exports-UI-REVIEW.md`. Foyer Card invite-code rendering shares display register with `share-code` page (mirrored byte-for-byte per Phase 9 D-08) — cross-link `onboarding-UI-REVIEW.md`.
- 0 Gemini calls — Settings is non-AI.
