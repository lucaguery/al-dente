---
phase: 09-onboarding-+-identity-polish
reviewed_at: 2026-05-08
baseline: 09-UI-SPEC.md (approved — final v0.2 phase; inherits Phase 5 token system, Phase 6/7/8 patterns; closes ONBOARD-07 through ONBOARD-11 + Phase 5 themeColor deferral)
auditor: gsd-ui-auditor
status: clean
score: 22/24
pillars:
  copywriting: 3/4
  visuals: 4/4
  color: 4/4
  typography: 4/4
  spacing: 4/4
  experience_design: 3/4
---

# Phase 9 — UI Review

**Audited:** 2026-05-08
**Baseline:** `09-UI-SPEC.md` (approved — inherits Phase 5 token system, Phases 6/7/8 application patterns; closes ONBOARD-07 through ONBOARD-11 and the Phase 5 `viewport.themeColor` deferral)
**Screenshots:** Not captured — no dev server detected at localhost:3000 or localhost:5173. Code-only audit.
**Phase scope:** Final v0.2 polish phase. Surfaces: 4 onboarding routes (welcome, create, join, share-code), Settings, BottomNav, PWA identity (icon.tsx, apple-icon.tsx, manifest.json, layout.tsx). Two UAT-driven fixes also in scope: SearchInput paper-grain wrapper removed (root cause: globals.css position:relative conflict); HomeDecide smart-branch (first-paint loader / partner-waiting card / shortlist-loading / ready).

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | All 4 onboarding routes and Settings use next-intl correctly with zero new keys, but HomeDecide partner-waiting card contains 2 hardcoded French strings ("En attente de ton/ta partenaire…" and "Actualiser") that bypass next-intl entirely |
| 2. Visuals | 4/4 | Identity coherence is excellent — paper-grain on all 7 contracted card surfaces, Fraunces italic display register across all first-touch screens, terracotta-60 left-border CTA Cards mirror Phase 6 D-Voice, identity signature byte-identical on share-code and Settings; BottomNav active-pill replaces 2px accent cleanly |
| 3. Color | 4/4 | 60/30/10 honored; terracotta strictly on all 10 contracted elements; zero cool-gray references; zero F43F5E in entire frontend tree; only locked literal hex in PWA chrome files (icon.tsx, apple-icon.tsx, manifest.json, layout.tsx) — Phase 5 deferral fully closed |
| 4. Typography | 4/4 | 4-size scale exact (text-display / text-sm / text-base / text-xs); Fraunces display roles correct on all surfaces; zero text-[11px], zero text-[28px], zero text-lg on Phase 9 surfaces; identity signature class string contiguous and byte-identical in both required locations |
| 5. Spacing | 4/4 | All spacing values are 4-multiples (Tailwind scale); h-12 tap-target floor on every interactive control in scope; zero h-11 remaining; BottomNav tap target preserved via host Link; badge dimensions (h-5, min-w-5) documented as read-only chrome exception |
| 6. Experience Design | 3/4 | Loading states (Loader2 spinner on submit + settings skeleton), inline error states with solution paths (join page code_not_found / color_taken), partner-waiting state UAT fix delivered; but partner-waiting card shows invite code without a copy affordance (the share-code screen has one, Settings has one, the mid-app partner-waiting card does not — user must memorize or take a screenshot) |

**Overall: 22/24**

Target of ≥22/24: MET. Matches Phase 6/7 baseline. Below Phase 5/8 peak of 23/24 due to two minor gaps in distinct pillars.

---

## Top 3 Priority Fixes

1. **HomeDecide partner-waiting card bypasses next-intl** — Two hardcoded French strings in `frontend/components/HomeDecide.tsx` lines 361 and 376: `"En attente de ton/ta partenaire…"` and `"Actualiser"`. User impact: if the app is ever extended beyond French (or if a future contributor runs a string-audit for i18n completeness), these strings are invisible to the translator pipeline. The partner-waiting state is also the first screen a solo user sees when they first create a household — making it one of the most-read strings in the app's opening experience. Fix: reuse existing keys or add `home.partner_waiting` and `home.refresh_cta` to `fr.json` in a follow-up phase (this phase's zero-new-keys constraint is now past; the next phase can add them cleanly).

2. **Partner-waiting card has no invite code copy affordance** — `frontend/components/HomeDecide.tsx` lines 363-367 display the invite code in the partner-waiting card using the identity signature class string, but there is no Copy button. The share-code screen and Settings both have a ghost-variant Copy button at h-12 with a Check-swap. User impact: a user whose partner hasn't joined yet sees their invite code but cannot easily copy it to a message without manual selection on a small iPhone screen. The code is displayed (good) but the copy UX regression is visible against the share-code and Settings equivalents. Fix: add a `<Button size="icon" variant="ghost" className="h-12 w-12" onClick={copyCode}><Copy size={20} /></Button>` alongside the invite code display (mirrors Settings Card 2 pattern exactly; reuses the `onCopy` + `navigator.clipboard.writeText` + toast pattern already in `settings/page.tsx`).

3. **BottomNav badge anchor `right-1/4` unverified on real hardware** — `frontend/components/BottomNav.tsx` line 123 uses `right-1/4` for the Pressenti-style badge absolute position. The 09-04 SUMMARY explicitly documents this as the locked starting point that requires real-device iPhone verification — executor flagged it, verifier documented it, but it remains unresolved. User impact: on actual iPhone hardware the badge may visually overlap the Inbox icon or appear misaligned relative to the icon's right edge, reducing its recognizability as a distinct count indicator. Fix: during first real-device smoke test, evaluate badge position and if needed change `right-1/4` to `right-1/3` or `right-2` (2 options documented in SUMMARY.md). This is a one-class change with no logic impact.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Contract:** All user-facing strings via `next-intl` from `fr.json`. Zero new keys in Phase 9. Error messages carry solution paths. CTAs are specific ("Créer le foyer", "Rejoindre", "J'ai prévenu ma partenaire") not generic.

**What passed:**
- `wc -l frontend/lib/i18n/fr.json` = 353 — confirmed zero new keys added by Phase 9
- All 4 onboarding routes use `useTranslations("onboarding.*")` namespaces; no hardcoded strings detected
- `frontend/app/settings/page.tsx` uses `useTranslations("settings")` throughout; no hardcoded strings
- `frontend/components/BottomNav.tsx` uses `useTranslations("nav")`; the one hardcoded string (`"Navigation principale"` on `<nav aria-label>`) is the WR-01 accessibility fix — explicitly acceptable per REVIEW-FIX.md since the zero-new-keys constraint made a proper i18n key unavailable
- Error messages in `fr.json` carry solution paths: `"code_not_found": "Ce code n'existe pas. Vérifie auprès de ta partenaire."` (tells user where to look); `"color_taken": "Cette couleur est déjà prise."` (states the constraint); `"network": "Connexion impossible. Réessaie dans un instant."` (tells user what to do)
- No generic "Submit" / "Cancel" / "OK" / "Error occurred" strings detected anywhere in Phase 9 surfaces

**Gap found:**
- `frontend/components/HomeDecide.tsx:361` — `"En attente de ton/ta partenaire…"` hardcoded string in JSX. No `useTranslations` call; no i18n key; French string is directly in the render tree.
- `frontend/components/HomeDecide.tsx:376` — `"Actualiser"` hardcoded string inside a Button. Same issue.
- Both are in the UAT-driven partner-waiting card that shipped during Phase 9 verification. The card itself is a Phase 9 addition (the smart-branch UAT fix). HomeDecide is listed in the `<files_to_read>` scope for this audit.
- Note: HomeDecide is not in the UI-SPEC's Component Inventory (its surfaces were complete by Phase 7). The UAT fix added the partner-waiting branch to an existing component. The zero-new-keys constraint applied strictly to the Phase 9 plan executors — but the fix shipped anyway with hardcoded strings. The next phase should close these.

**Score rationale:** Strong i18n discipline on all 8 UI-SPEC-contracted surfaces. Two hardcoded strings in a UAT fix on a boundary-case screen (partner-waiting, a state most users see at most once). Not a regression in the contract surfaces; still a violation of the project-wide "all strings via next-intl from day one" invariant in CLAUDE.md.

---

### Pillar 2: Visuals (4/4)

**Contract:** Slow Food artisanal direction — paper-grain on all card surfaces, Fraunces italic as the editorial signature, terracotta-60 left border on CTA Cards, identity mark legibility.

**What passed:**

Paper-grain placement — all 8 contracted surfaces confirmed:
- `frontend/app/onboarding/welcome/page.tsx:37,48` — both CTA Cards have `paper-grain shadow-card`
- `frontend/app/onboarding/create/page.tsx:91` — form-body Card has `paper-grain shadow-card`
- `frontend/app/onboarding/join/page.tsx:168` — form-body Card has `paper-grain shadow-card`
- `frontend/app/onboarding/share-code/page.tsx:49` — body Card has `paper-grain shadow-card`
- `frontend/app/settings/page.tsx:113,128,173` — all 3 section Cards have `paper-grain shadow-card`

Anti-patterns absent:
- No paper-grain on BottomNav frame or active-pill (chrome, correctly excluded)
- No paper-grain on sticky headers (chrome)
- No paper-grain on submit bars (chrome)
- `frontend/components/SearchInput.tsx:76-82` — comment explicitly documents why paper-grain was removed from the wrapper (globals.css `.paper-grain > * { position: relative }` overrides icon absolute positioning). This is the correct UAT fix; the component comment explains the trade-off clearly.

Visual hierarchy on Welcome screen:
- Clear focal point: `text-display` Fraunces italic wordmark at top
- Two CTA Cards with `border-l-[3px] border-primary/60` left-border accent and `ChevronRight` tinted `text-primary` — affordance signal that cards are interactive
- `flex-1` spacer between header and CTA pair creates breathing room and pushes CTAs to the lower half, matching cookbook-cover composition

Identity signature:
- `font-display italic text-3xl tracking-widest text-primary` appears at `share-code/page.tsx:60` and `settings/page.tsx:145` — byte-identical cross-plan invariant confirmed (grep returns exactly 2 hits)
- HomeDecide partner-waiting card at line 364 also renders the invite code with the same class string — a third occurrence that strengthens rather than dilutes the identity (it is the right register for the invite code at any surface)

PWA icon visual contract:
- `app/icon.tsx` and `apple-icon.tsx` both implement the pasta-strand geometry on terracotta `#C8553D` with cream `#FAF7F2` stroke — solid terracotta background reads as clay, food-symbol outline in cream reads as intentionally artisanal
- Breathing room: 256px canvas, 160px SVG viewport = 48px on each side; 180px canvas, 113px SVG = ~33px on each side — both within the "framed mark" spec

BottomNav:
- Active-pill `rounded-full h-10 w-10 bg-primary/8` replaces the 2px top-bar accent cleanly
- Pressenti-style badge `h-5 min-w-5 rounded-full bg-primary/15 text-primary border border-primary/40 px-2` mirrors Phase 7 chipClass register correctly
- Zero cool-gray references confirmed via grep

**Score rationale:** Every contracted visual element present and correctly placed. No anti-patterns found. Identity coherence is the strongest aspect of this phase — the Fraunces italic / terracotta / paper-grain thread now runs from PWA icon through first-touch onboarding through BottomNav active state through Settings.

---

### Pillar 3: Color (4/4)

**Contract:** 60/30/10 split. Terracotta only on 10 contracted elements. Zero rose `#F43F5E`. Zero cool grays. Zero hardcoded hex outside locked PWA chrome exceptions.

**What passed:**

60/30/10 split on Phase 9 surfaces:
- 60% dominant: `bg-background` on all onboarding sections and Settings main body; `bg-background/80 backdrop-blur-sm` on sticky headers and submit bars
- 30% secondary: `bg-card` (paper-grain) on all 8 card surfaces across the 5 Phase 9 routes; `text-foreground-muted` on taglines, field labels, helper copy, BottomNav inactive icons
- 10% accent: terracotta exactly on the 10 contracted elements (see below)

Terracotta accent usage — all 10 contracted roles confirmed:
1. Submit CTAs at `h-12` — `Button variant="default"` on Create, Join, share-code done, Settings export
2. Welcome CTA Card left-border — `border-l-[3px] border-primary/60` on both cards (`welcome/page.tsx:37,48`)
3. Welcome CTA Card ChevronRight — `text-primary` (`welcome/page.tsx:45,56`)
4. Invite-code Fraunces italic display — `text-primary` on share-code (`share-code/page.tsx:60`) and Settings (`settings/page.tsx:145`)
5. BottomNav active icon+label — `text-primary` (`BottomNav.tsx:100`)
6. BottomNav active-pill wash — `bg-primary/8` (`BottomNav.tsx:110`)
7. BottomNav badge — `bg-primary/15 text-primary border border-primary/40` (`BottomNav.tsx:123`)
8. Focus rings — `--ring` token via Button/Input primitives (Phase 5 re-theme)
9. PWA icon background — `#C8553D` literal hex in `icon.tsx` and `apple-icon.tsx`
10. PWA theme_color — `#C8553D` in `manifest.json` and `layout.tsx:46`

Anti-pattern checks:
- Rose `#F43F5E`: 0 hits in `frontend/app`, `frontend/public`, `frontend/components`
- Cool grays (slate/zinc): 0 hits in all Phase 9 surfaces
- Hardcoded hex on non-PWA surfaces: 0 hits (grep `-rn "rgb\|#[0-9a-fA-F]{3,8}"` on onboarding, settings, BottomNav returns clean)
- `manifest.json`: `theme_color: "#C8553D"`, `background_color: "#FAF7F2"` — generic defaults (`#0A0A0A`, `#FFFFFF`) fully replaced
- `layout.tsx:46`: `themeColor: "#C8553D"` — Phase 5 deferral closed

Note: `lib/colors.ts:4` contains `#F43F5E` as the `rose` member-color swatch (per REVIEW.md finding) — this is member attribution color, semantically unrelated to brand chrome; not a Phase 9 scope regression.

**Score rationale:** Flawless execution of the 10-element accent register. The Phase 5 deferral closure (the explicit goal of ONBOARD-10) is verified at every level: viewport, manifest, icon. Zero anti-pattern violations.

---

### Pillar 4: Typography (4/4)

**Contract:** 4-size scale (text-display / text-title / text-base / text-xs). 2 weights authored (400 body, 500 labels/CTAs). Fraunces italic for display roles. IBM Plex Sans for body/chrome roles. Identity signature exact class string `font-display italic text-3xl tracking-widest text-primary` byte-identical in both required files.

**What passed:**

Type-scale audit (from grep of Phase 9 surfaces):
- `text-display` — 4 occurrences (wordmark on welcome, form-body title on create, form-body title on join, page title on share-code) — all correct Fraunces italic display roles
- `text-title` — 0 on Phase 9-new surfaces (inherits from EmptyState `text-title` heading — correct; EmptyState is used in the empty-shortlist branch)
- `text-base` — 9 occurrences (taglines, field values, CTA card labels, body copy, CTA labels) — all IBM Plex Sans body register
- `text-sm` — 9 occurrences (field labels, helper copy, error messages, Sauvegarde card labels) — all `text-foreground-muted` or `text-destructive` — existing idiom for secondary chrome, not a new authored size
- `text-xs` — 3 occurrences (BottomNav label, BottomNav badge) — correct chrome/badge register
- `text-3xl` — 2 occurrences (identity signature on share-code and settings) — not a new authored size per UI-SPEC §Typography note (renders same Fraunces italic display register as text-display lower clamp bound; acceptable per spec)

Zero violations:
- `text-[11px]` — 0 hits (BottomNav label normalized from `text-[11px]` to `text-xs` confirmed)
- `text-[28px]` — 0 hits (Settings and share-code mono/size-anchored register fully replaced)
- `text-lg` — 0 hits on Phase 9 surfaces (Settings `text-lg font-medium` field values collapsed to `text-base font-medium` per 09-03 SUMMARY)
- `text-xl` — 0 hits (share-code title `text-xl font-semibold` replaced with `text-display`)
- `text-2xl`, `text-4xl`, `text-5xl` — 0 hits

Font weight usage:
- `font-medium` — 4 (field values in Settings) — correct IBM Plex Sans body role
- `font-semibold` — 3 (header chrome titles in sticky headers) — inherited shadcn primitive default, not a new authored weight
- `font-display` — 4 (combined with `italic` — Fraunces italic display register) — correct

Mono register discipline:
- `font-mono tracking-[0.3em] uppercase` appears exactly 1 time on Phase 9 surfaces: `join/page.tsx:200` — the invite-code Input (entry-time register, intentionally preserved per spec). Absent from share-code and Settings (read-time display correctly uses Fraunces italic). This is the correct mono-entry / Fraunces-read split.

**Score rationale:** Type-scale is exactly 4 sizes. The role assignments are precisely aligned with the UI-SPEC's table. The identity-signature class string is byte-identical at both required locations (verified by grep returning count=2). Zero arbitrary pixel sizes on Phase 9 surfaces.

---

### Pillar 5: Spacing (4/4)

**Contract:** Strict 4-multiple subset. 48px (h-12) tap-target floor on every interactive control. No `gap-0.5`, no `px-2.5 py-0.5` (exception inherited from Phase 7 chipClass; BottomNav badge uses `px-2` per the corrected UI-SPEC §Spacing exceptions). No `pb-0.5`, no non-scale values.

**What passed:**

Tap-target floor — complete h-12 compliance on all Phase 9 interactive controls:
- `welcome/page.tsx:40,51` — both CTA Card interior Links at `h-12` ✓
- `create/page.tsx:80` — back Button at `h-12 w-12` ✓
- `create/page.tsx:137` — submit Button at `h-12 w-full` ✓
- `join/page.tsx:157` — back Button at `h-12 w-12` ✓
- `join/page.tsx:263` — submit Button at `h-12 w-full` ✓
- `share-code/page.tsx:65` — copy Button at `h-12` ✓
- `share-code/page.tsx:78` — done Button at `h-12 w-full` ✓
- `settings/page.tsx:156` — copy Button at `h-12 w-12` ✓
- `settings/page.tsx:181` — export Button at `h-12 w-full` ✓
- BottomNav tab Links: `min-h-[4rem]` host nav preserves >48px footprint ✓
- HomeDecide partner-waiting Actualiser Button: `h-12` ✓

Zero h-11 remaining on any of these surfaces (grep returns clean).

Spacing values used:
- `gap-1` (4px) — BottomNav icon/label gap ✓
- `gap-2` (8px) — field-level label+input stacks ✓
- `gap-3` (12px) — CTA Card pair vertical gap on welcome, Sauvegarde Card internal ✓
- `gap-4` (16px) — share-code Card and Foyer Card internal ✓
- `gap-6` (24px) — Settings Card stack, Create/Join form-body Card internal ✓
- `px-6` / `py-6` / `p-6` — standard 24px page and card padding ✓
- `pb-32` (128px = 32*4) — onboarding form scrollable bottom breathing room ✓
- `py-4` (16px) — invite code Fraunces block vertical padding ✓
- `pt-12` / `pb-24` / `pt-6` / `pb-6` — all 4-multiples ✓

Inherited non-4-multiple values not introduced by Phase 9:
- BottomNav badge `px-2` (8px) — UI-SPEC §Spacing exceptions corrected `px-1.5` to `px-2` specifically (the correction note is in the spec). The implementation uses `px-2` per the corrected spec.
- No new `px-1.5`, `gap-0.5`, or `gap-1.5` authored by Phase 9

Arbitrary value audit: `border-l-[3px]` (3px left border on CTA Cards) — documented exception in UI-SPEC §Spacing exceptions (hairline border weight, not a layout spacing value); `min-h-[4rem]` on BottomNav nav frame (inherited, not Phase 9 authored); `pb-[env(safe-area-inset-bottom)]` (platform safe-area, not a layout value).

**Score rationale:** Perfect 4-multiple compliance on all authored spacing. h-12 tap-target floor achieved on all 9 Phase 9 interactive controls including the UAT-fix partner-waiting Actualiser button. No regressions from Phases 5-8 spacing discipline.

---

### Pillar 6: Experience Design (3/4)

**Contract:** Loading states present, error states with solution paths, disabled states on CTAs, confirmation for destructive actions, partner-waiting state UX clean (UAT fix), BottomNav active state feel correct.

**What passed:**

Loading states:
- `create/page.tsx:141-146` — `Loader2 animate-spin` replaces submit CTA label during form submission
- `join/page.tsx:233` — `Loader2` during preview fetch; `join/page.tsx:269` — `Loader2` during form submission
- `settings/page.tsx:38-44` — `animate-pulse` skeleton block while session is loading (single line, minimal but present)
- HomeDecide: first-paint Loader2 while `!session || !me`; shortlist-loading Loader2 while `!shortlistLoaded`

Error states:
- `join/page.tsx:202-210` — inline `text-destructive` error below code input with `role="alert"` and `aria-describedby` wiring — accessible error display
- `join/page.tsx:249-252` — inline `text-destructive` error for color conflict
- Error messages in `fr.json` carry solution paths (verified: `code_not_found` tells user to verify with partner; `network` tells user to retry)
- `toast.error()` for network failures on create, join, share-code copy, settings copy, settings export

Disabled states:
- `create/page.tsx:138` — `disabled={!canSubmit}` (requires household + member name + color to enable)
- `join/page.tsx:264` — `disabled={!canSubmit}` (requires 6-char code + no error + member name + color + not preview-pending)
- `settings/page.tsx:185` — `disabled={exporting}` + `aria-busy={exporting}` on export button

BottomNav experience:
- Active-pill wash `bg-primary/8` with `transition-colors duration-fast ease-craft` — 150ms color transition on tab switch
- Pressenti badge renders only when `status === "authenticated" && draftCount > 0` — no phantom badge

UAT fixes delivered:
- SearchInput: paper-grain removed from wrapper — Search icon and right-side controls now position correctly at absolute coordinates
- HomeDecide: smart-branch replaces loader-everywhere — partner-waiting card shows invite code + Actualiser button when `!partner`; shortlist-loading loader for separate `!shortlistLoaded` state
- HomeDecide empty-shortlist: `px-6 mt-6` wrapper aligns EmptyState with ColdStartChip's `mx-6` horizontal rhythm

**Gaps found:**

Partner-waiting card missing copy affordance (`HomeDecide.tsx:363-367`):
- The invite code is displayed in the partner-waiting card with the identity signature class string, but there is no Copy button. Share-code screen (`share-code/page.tsx:65`) and Settings Card 2 (`settings/page.tsx:153-162`) both provide a ghost-variant `h-12 w-12` Copy button with Copy→Check icon swap and toast confirmation. The partner-waiting card is the third surface showing the invite code, and it is the surface a user is most likely to encounter when they want to re-share the code (the session is loaded, the partner hasn't joined, the user is back in the app). Missing the copy affordance creates friction at exactly the highest-intent moment.

Hardcoded strings bypass i18n (already noted in Pillar 1):
- The UX quality of "En attente de ton/ta partenaire…" and "Actualiser" is not in question (the strings are correct and clear); the gap is that they cannot be updated via the translator pipeline and are invisible to string-audit tooling.

BottomNav badge anchor unverified on device:
- `right-1/4` badge anchor on the Inbox tab has no real-device verification yet per 09-04 SUMMARY.md. On iOS at 375pt, `right-1/4` on a flex-1 Link (~90-94px wide) positions the badge ~22-23px from the right edge of the Link, which may visually overlap the Inbox icon's right edge depending on icon rendering. This is flagged as needing device verification.

**Score rationale:** Loading, error, and disabled states are comprehensively covered. The two UAT fixes (SearchInput, HomeDecide smart-branch) are correctly implemented. The partner-waiting card's missing Copy button is a notable UX gap in the most-contextual invite-code surface. The hardcoded strings in the same card (Pillar 1 gap) compound the issue slightly but don't worsen the functional UX.

---

## Registry Safety

`frontend/components.json` exists with `registries: {}` (empty object — no third-party registries declared). All shadcn blocks are from the official shadcn registry. Registry audit: 0 third-party blocks, no flag checks required.

---

## Files Audited

**Created by Phase 9:**
- `frontend/app/icon.tsx` (44 LOC) — Next.js 16 ImageResponse 256×256 icon
- `frontend/app/apple-icon.tsx` (42 LOC) — Next.js 16 ImageResponse 180×180 apple-touch-icon

**Modified by Phase 9:**
- `frontend/app/layout.tsx` — themeColor migration #F43F5E → #C8553D
- `frontend/public/manifest.json` — theme_color + background_color + icons[] migration
- `frontend/app/onboarding/welcome/page.tsx` — Fraunces wordmark + paper-grain CTA Card pair
- `frontend/app/onboarding/create/page.tsx` — paper-grain form-body Card + h-12 floor
- `frontend/app/onboarding/share-code/page.tsx` — paper-grain body Card + identity signature
- `frontend/app/onboarding/join/page.tsx` — paper-grain form-body Card + h-12 floor + mono Input preserved
- `frontend/app/settings/page.tsx` — 3-section paper-grain Card layout + identity signature mirror
- `frontend/components/BottomNav.tsx` — active-pill wash + Pressenti badge + cool-gray purge + text-xs normalization

**In-scope UAT fixes (Phase 9 verification):**
- `frontend/components/SearchInput.tsx` — paper-grain wrapper removed (position:relative conflict fix)
- `frontend/components/HomeDecide.tsx` — smart-branch loader / partner-waiting card / shortlist-loading / empty-shortlist alignment

**Supporting reference reads:**
- `frontend/lib/i18n/fr.json` — key count verified at 353 (zero new keys)
- `frontend/lib/onboarding-guard.tsx` — auth redirect logic verified intact

---

_Reviewed: 2026-05-08_
_Reviewer: Claude (gsd-ui-auditor)_
_Baseline: 09-UI-SPEC.md_
_Score: 22/24 (target ≥22/24 — MET)_
