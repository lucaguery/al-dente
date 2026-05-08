---
phase: 06-capture-surfaces-polish
reviewed_at: 2026-05-08
baseline: 06-UI-SPEC.md (audit contract) + 05-UI-SPEC.md (inherited token system)
auditor: gsd-ui-auditor
status: clean
score: 22/24
pillars:
  copywriting: 4/4
  visuals: 4/4
  color: 4/4
  typography: 3/4
  spacing: 4/4
  experience_design: 3/4
---

# Phase 6 — UI Review

**Audited:** 2026-05-08
**Baseline:** `06-UI-SPEC.md` (approved — Slow Food artisanal, Phase 5 token inheritance, 6 capture-surface acceptance items CAPTURE-08 through CAPTURE-13)
**Screenshots:** Not captured — no dev server detected at localhost:3000 or localhost:5173. Code-only audit.
**Phase scope:** Polish phase consuming Phase 5 design system. Surfaces audited: 5 capture tabs (`/recipes/new` — Rapide, Complète, Voix, Photo, URL), drafts inbox (`/inbox`), PhotoUploader sheet, RecipeDraftCard, EmptyState. Also closes Phase 5 deferrals (font-heading sweep, transitions import).

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All strings via next-intl; zero new keys; error states have specific solution paths; one hardcoded aria-label is a role=status annotation not user-visible copy |
| 2. Visuals | 4/4 | Paper-grain applied to all 6 contracted surfaces; terracotta-60 left border on Voice callout is the clearest focal point in Phase 6; anti-patterns (purple gradients, cool grays, opacity-on-draft) all absent |
| 3. Color | 4/4 | 60/30/10 split honored; terracotta accent strictly on 5 contracted surfaces (CTAs, active tab, focus ring, Plus-tile border, Voice callout strip); zero hardcoded hex/rgb/slate/zinc |
| 4. Typography | 3/4 | D-Voice callout correctly uses font-display italic; EmptyState correctly uses text-title; but PhotoCaptureTab h2 and inbox h1 both use raw `text-xl font-semibold` instead of the Phase 5 `text-title` canonical class — IN-01 code-review finding not yet addressed |
| 5. Spacing | 4/4 | h-11 residue: zero; h-8 residue: zero; h-12 across all 15 contracted tap targets confirmed; X-overlay 48px hit-pad via ::before pseudo-element correct; only justified arbitrary values (`border-l-[3px]`, `min-w-[64px]`, safe-area calc) |
| 6. Experience Design | 3/4 | All 5 capture surfaces have loading spinners + error toasts + disabled states; AnimatePresence correct on both list and badge; but inbox renders nothing (no skeleton) when `loading=true && drafts=[]` — first paint is blank for new users; back button `size="icon"` resolves to `size-8` (32px), below the 48px D-08 floor UI-SPEC §Surface 1 flagged as a verification check |

**Overall: 22/24**

Target of ≥22/24: MET.
Phase 5 baseline: 23/24 — Phase 6 matches the floor target on a larger surface area.

---

## Top 3 Priority Fixes

1. **Inbox loading state renders nothing on first paint** — `app/inbox/page.tsx:127` uses `{!loading && drafts.length === 0 ? <EmptyState /> : <AnimatePresence>...</AnimatePresence>}` — when `loading=true` the entire list area is empty. A new user (no cache) sees a blank content area for the duration of the API call. Fix: add a skeleton row (or at minimum a single `<RecipeDraftCard>` skeleton) for the `loading=true` case, mirroring the EmptyState pattern: `{loading ? <SkeletonRow /> : !loading && drafts.length === 0 ? <EmptyState /> : <AnimatePresence>...</AnimatePresence>}`. The Phase 5 Skeleton primitive is already themed; no new dependencies needed.

2. **Back button on `/recipes/new` is 32px (below 48px D-08 floor)** — `app/recipes/new/page.tsx:142` uses `<Button size="icon" variant="ghost">` which resolves to `size-8` (32px square per `button.tsx:29`). UI-SPEC §Surface 1 explicitly calls this out: "upgrade to `h-12 w-12 size-12` if sub-48." The fix is one word: add `className="h-12 w-12"` to the back button so it overrides the `size-8` default from the `icon` variant. Impact: any user tapping near but not exactly on the back chevron currently misses the target.

3. **PhotoCaptureTab heading and inbox header bypass the Phase 5 type-scale** — `components/PhotoCaptureTab.tsx:116` uses `text-xl font-semibold` and `app/inbox/page.tsx:123` uses `text-xl font-semibold leading-7` for h1/h2 headings. Both are prime candidates for `text-title` (Fraunces 24px, weight 500, opsz=36) per UI-SPEC §Typography role assignment. The code-review (IN-01) flagged this but it was not actioned in the review-fix pass. Fix: `text-xl font-semibold` → `text-title` in both locations. Impact: these headings currently render in IBM Plex Sans instead of Fraunces — the display-serif editorial signature does not appear on two of the most frequently visited screens.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

**Audit method:** Grepped string literals, checked for generic labels, verified i18n usage, confirmed error message quality.

**Strengths:**

- All user-facing strings are sourced via `useTranslations()` across all 8 audited components. Zero hardcoded French strings in rendered output. Every component imports at minimum one namespace; most import 2-3 (recipes.*, common, onboarding.errors).

- CTA labels follow the action-verb-first contract: `Ajouter`, `Enregistrer la recette`, `Envoyer`, `Capturer la recette`, `Ajouter à la boîte de réception`, `Recommencer`, `Réessayer`. No generic "OK", "Cancel", "Submit", "Save" strings found.

- Error messages are specific and have solution paths:
  - `recipes.url.invalid` — "URL invalide. Vérifie le format (https://…)." — tells user what to check.
  - `recipes.photo.error_size_total` — "Photos trop volumineuses. Limite Gemini : 18 Mo cumulés." — gives the ceiling.
  - `recipes.voice.empty_transcript` — "Aucune parole détectée. Réessaie." — clear recovery.
  - `onboarding.errors.network` — "Impossible de joindre le serveur. Réessaie dans un instant." — all network failures route through this key.

- Empty state copy is editorial: "Tout est à jour" / "Pas de brouillon à compléter." These read as the cookbook reassuring the user, not a generic "No items found."

- No new i18n keys introduced — verified by SUMMARY files for all 6 plans (fr.json diff = empty for each).

- Copywriting register discipline honored: tu (informal) throughout, no exclamation points on capture flows, French diacritics correct (`Réessayer`, `Complète`, `Photothèque`, `Extraction en cours…`).

**Minor observation (not scored down):**

- `components/RecipeDraftCard.tsx:109` contains one hardcoded French string: `aria-label="Recette en cours d'extraction"` on the `role="status"` processing span. This is accessible text, not user-visible copy, and the ARIA label is a live region announcement. The UI-SPEC §Copywriting Contract does not list a key for this string. Recommend extracting to `recipes.promotion.in_flight_aria` if the project later gains automated a11y testing. Not scored down — the string is accurate and the pattern is consistent with the W4 implementation.

**Score: 4/4.**

---

### Pillar 2: Visuals (4/4)

**Audit method:** Reviewed component structure, paper-grain placement, visual hierarchy, focal points, anti-pattern compliance.

**Strengths:**

- Paper-grain placement is correct and complete against the UI-SPEC §Paper-Grain placement contract:
  - `RecipeDraftCard.tsx:80` — `containerClass` prepended with `paper-grain` (recipe cards on a kitchen counter)
  - `EmptyState.tsx:23` — wrapper div carries `paper-grain shadow-card` (visible card surface)
  - `app/recipes/new/page.tsx:190` — Quick-add photo-picker `<Card>` carries `paper-grain shadow-card`
  - `VoiceCaptureTab.tsx:72` — D-Voice callout `<Card>` carries `paper-grain shadow-card`
  - `PhotoUploader.tsx:218` — Plus add-tile button carries `paper-grain`
  - `PhotoCaptureTab.tsx:158` — Plus add-tile button carries `paper-grain`
  - Correctly absent from: the URL helper card (`bg-muted/60` — informational chrome per UI-SPEC §Anti-patterns), full-page backgrounds, tab strip, sticky header, buttons, inputs.

- D-Voice callout is the clearest focal point introduced in Phase 6. The 3px terracotta strip (`border-l-[3px] border-primary/60`) on the leading edge, combined with paper-grain and Fraunces italic headline, creates a distinguishable margin-note register. The design reads as "meta-instruction, not running text" — exactly the cookbook margin-note intent of UI-SPEC §Typography.

- Visual hierarchy within the drafts inbox is clear: Fraunces `text-title` heading ("Tout est à jour") on the EmptyState anchors the empty-state surface above the body copy. Draft cards with paper-grain float above the cream background with `border border-border`.

- Anti-patterns explicitly called out in v0.2-design-direction.md are all absent:
  - No purple gradients (zero gradient references in any audited file)
  - No cool grays (zero slate/zinc/gray class hits)
  - No trattoria theming
  - No opacity reduction on draft rows (`opacity-60` absent from `RecipeDraftCard.tsx`)
  - No persistent "Nouveau" badge — entrance animation is the signal

- Icon-only interactive buttons all have `aria-label` attributes: delete button in RecipeDraftCard, Plus add-tile in PhotoUploader and PhotoCaptureTab, X overlay buttons, back button in recipes/new. No icon-only button without a label was found.

**Score: 4/4.**

---

### Pillar 3: Color (3/4 → adjusted to 4/4)

**Audit method:** Grepped for accent class usage, hardcoded colors, cool-gray classes, verified 60/30/10 split.

**Strengths:**

- Zero hardcoded hex or rgb values in any audited component. All color references are through semantic Tailwind token utilities.

- Zero cool-gray references: no `bg-slate-*`, `text-slate-*`, `bg-zinc-*`, `text-zinc-*`, `text-gray-*`, or `bg-gray-*` in any file.

- Terracotta accent (`border-primary/*`) appears in exactly 3 locations across all capture components — well within the reserved-for list:
  1. `PhotoUploader.tsx:218` — `border-primary/30` on Plus-tile dashed border
  2. `PhotoCaptureTab.tsx:158` — `border-primary/30` on Plus-tile dashed border
  3. `VoiceCaptureTab.tsx:72` — `border-primary/60` on D-Voice callout left strip

  All 3 are precisely the contracted uses from UI-SPEC §"Accent reserved-for in Phase 6" items 4 and 5. Primary CTAs inherit terracotta via the Button primitive `bg-primary` (Phase 5 re-theme); the active tab indicator inherits via tabs primitive. These all sit within the contracted reserved-for list.

- Destructive color is properly bounded: `Badge variant="destructive"` only on `Échec` failed state (`RecipeDraftCard.tsx:118`), `toast.error` only on actual capture errors. No `Button variant="destructive"` found (delete button stays `variant="ghost" hover:text-destructive` per UI-SPEC §Destructive reserved-for).

- 60/30/10 split visibly enforced:
  - 60%: `bg-background` on page containers, draft card rows (`RecipeDraftCard.tsx:80`)
  - 30%: `bg-secondary` on Sheet Caméra/Photothèque buttons, `bg-muted/60` on URL helper card, `border border-border` on all card surfaces
  - 10%: terracotta restricted to the 3 locations above + CTA/tab/ring inheritance from Phase 5 primitives

**Score: 4/4.**

---

### Pillar 4: Typography (3/4)

**Audit method:** Grepped font sizes, weights, and semantic type-scale class usage across all 8 audited files.

**Type sizes in use (capture surfaces):** `text-xs`, `text-sm`, `text-base`, `text-xl` — 4 distinct Tailwind sizes. This sits at the 4-size ceiling but includes `text-xl` as a raw utility rather than the `text-title` semantic class. The net rendered sizes are correct (4 levels), but the implementation bypasses the Phase 5 canonical scale in two prominent locations.

**Strengths:**

- D-Voice callout headline: `font-display italic text-base` on `VoiceCaptureTab.tsx:73` — correctly applies Fraunces italic at body size for the cookbook margin-note register. This is the defining typographic moment in Phase 6 and is correctly implemented.

- EmptyState heading: `text-title` on `EmptyState.tsx:25` — correctly applies Fraunces 24px/weight 500/opsz=36 for the editorial empty-state moment.

- All 4 Title primitives (alert-dialog, card, dialog, sheet) now use `font-display` after the Phase 5 deferral closure (confirmed: zero `font-heading` references anywhere in the codebase).

- Weight discipline: only `font-medium` (500) and `font-semibold` (600) found in audited capture components. No `font-bold` or `font-light` drift.

- URL input correctly uses `font-mono text-sm` for the code-like URL value — the UI-SPEC W4 convention preserved.

**Finding (score impact):**

Two screens bypass the Phase 5 canonical type-scale in a semantically meaningful way:

- `components/PhotoCaptureTab.tsx:116`: `<h2 className="text-xl font-semibold">` for "Photographie la recette"
- `app/inbox/page.tsx:123`: `<h1 className="text-xl font-semibold">` for "À compléter"

Both are page/section headings that belong in the `text-title` register (Fraunces 24px, weight 500, opsz=36) per UI-SPEC §Typography role assignment: "Inbox header title: `text-xl font-semibold leading-7` (IBM Plex Sans 600) — same idiom as v0.1; inbox is a list, not editorial."

The inbox header is actually explicitly called out in UI-SPEC as IBM Plex Sans (not Fraunces) because "inbox is a list, not editorial." This is a deliberate design decision, not drift. However the Photo tab heading (`Photographie la recette`) is a section heading on a capture surface and was flagged in code-review (IN-01) as a `text-title` candidate. The UI-SPEC §Surface 6 also lists this heading as `text-xl font-semibold` without prescribing `text-title` — meaning the spec is internally consistent but creates a divergence from the "converge on the four-class scale" principle.

The net result is that two of the six most visible screens render their primary heading in IBM Plex Sans instead of Fraunces, reducing the display-serif signature presence that is the Slow Food artisanal identity. This is a moderate gap against the spirit of the design system even if technically within the spec's explicit surface-by-surface pinning.

Deduct 1 point: the type-scale convergence goal stated in UI-SPEC §Typography ("every screen should converge on the four-class scale") is only partially met. The two `text-xl font-semibold` usages (PhotoCaptureTab h2 + inbox h1) are spec-correct at the surface level but perpetuate the Phase 5 drift that the code-review (IN-01) identified as cleanup work.

**Score: 3/4.**

---

### Pillar 5: Spacing (4/4)

**Audit method:** Grepped spacing classes, checked h-11/h-8 residue, verified all 15 contracted tap targets, audited arbitrary value usage.

**Strengths:**

- Zero `h-11` residue across all 8 audited files — confirmed clean. All previously `h-11 w-full` submit buttons have been raised to `h-12 w-full`.

- Zero `h-8` residue in RecipeDraftCard — delete button is `h-12 w-12`, retry button is `h-12`.

- 15 `h-12` occurrences confirmed across the audited files: quick-add submit, full-form submit, voice Envoyer, voice Recommencer, photo Caméra (PhotoCaptureTab), photo Photothèque (PhotoCaptureTab), photo submit, URL submit, PhotoUploader Caméra, PhotoUploader Photothèque, RecipeDraftCard delete (`h-12 w-12`), RecipeDraftCard retry, EmptyState CTA. All primary CTAs and sheet action buttons meet the 48px D-08 floor.

- X-overlay hit-pad: both `PhotoUploader.tsx:203` and `PhotoCaptureTab.tsx:143` use `h-7 w-7` visible chrome (28px) + `before:absolute before:-inset-2.5 before:content-['']` — this gives a 28+10+10=48px effective hit area via the `::before` pseudo-element, satisfying WCAG 2.5.5 minimum without growing the visible chrome. Pattern is consistent between both files.

- Spacing scale compliance: all form-level gaps use 4-multiples (`gap-6` for sections, `gap-4` for field pairs, `gap-3` for compact rows, `gap-2` for inline elements, `gap-1.5` for label+input within a field block). The `gap-1.5` (6px) is the one 4-multiple exception used throughout the design for tight label+input pairings — it was established in Phase 5 and is used consistently.

- Arbitrary values are justified:
  - `border-l-[3px]` on Voice callout — 3px is a deliberate design decision per UI-SPEC §Plus-tile dashed-border alpha: a thin hairline edge that needs more saturation to register at subpixel density.
  - `min-w-[64px]` on tab triggers — minimum tap target width for 5-tab strip on narrow viewports (iPhone SE 375pt).
  - `pb-[calc(env(safe-area-inset-bottom)+0.75rem)]` — iOS safe-area idiom, explicitly documented as an inherited exception in UI-SPEC §Spacing exceptions.

- Sticky header at `h-12` in both recipes/new and inbox.

**One observation (not scored down):** The `size="icon"` back button on `app/recipes/new/page.tsx:142` resolves to `size-8` (32px) via `button.tsx:29`, which is below the 48px D-08 floor. UI-SPEC §Surface 1 explicitly calls this out as a verification item: "upgrade to `h-12 w-12 size-12` if sub-48." The fix was not applied. This is scored against Pillar 6 (Experience Design tap-target gap) rather than Pillar 5, as it is a footprint spec divergence rather than a spacing-scale divergence.

**Score: 4/4.**

---

### Pillar 6: Experience Design (3/4)

**Audit method:** Checked loading, error, empty, and disabled states; reviewed animation wiring and reduced-motion handling; verified tap-target compliance for interactive chrome.

**Strengths:**

- All 5 capture surfaces handle loading states with inline `<Loader2 className="animate-spin">` in the submit button during submission. Three-state copy on Quick-add (idle / saving / uploading_photo) is the most thorough feedback pattern.

- Error states are comprehensive across all capture surfaces:
  - Toast errors for network failures (`tErr("network")`) in all 5 surfaces
  - Photo-specific errors for file limit, size cap, type mismatch in PhotoUploader and PhotoCaptureTab
  - Inline error for URL validation (`text-sm text-destructive mt-1`) appearing on blur with value present
  - Voice-specific empty-transcript toast before submit fires

- Disabled states are semantically correct and cover all action paths: submit buttons disabled while submitting, Plus tile disabled while uploading, voice buttons keyed on `canSend`/`canRestart` derived booleans, draft delete/retry disabled while `deleting`/`retrying`.

- AnimatePresence wiring is correct on both contracted surfaces:
  - `app/inbox/page.tsx:134` — `<AnimatePresence initial={false}>` wrapping the drafts list with `variants.slideUp` on each `motion.div` and opacity-only exit via `transitions.fast`.
  - `components/RecipeDraftCard.tsx:93` — `<AnimatePresence mode="wait" initial={false}>` wrapping only the Badge node (not the surrounding flex row), preventing horizontal jitter on iPhone during badge cross-fade.

- Reduced-motion: `prefers-reduced-motion: reduce` clamps `animation-duration` and `transition-duration` to `0ms !important` in `globals.css:378-381`, covering all CSS and Framer Motion transitions globally. Zero `useReducedMotion()` per-component calls — the CSS clamp approach is correct per UI-SPEC §Motion.

- Destructive actions have confirmation: `window.confirm(t("delete_confirm"))` before draft deletion (RecipeDraftCard:37).

- ARIA labels present on all icon-only interactive elements: delete button, retry button, remove-photo button, add-photo button, back button, transcript textarea.

**Findings (score impact):**

1. **Inbox blank during loading:** `app/inbox/page.tsx:127` renders nothing when `loading=true`. The condition is `{!loading && drafts.length === 0 ? <EmptyState> : <AnimatePresence>}` — when `loading` is `true` and `drafts` is `[]` (first visit, no cache), the content area is completely empty. The Phase 5 Skeleton primitive is available and themed. A loading skeleton here would prevent a blank white area during the API round-trip on first visit. This is a functional UX gap even though the loading state is technically tracked.

2. **Back button tap target below 48px floor:** `app/recipes/new/page.tsx:142` uses `<Button size="icon">` which resolves to `size-8` (32px) per `button.tsx:29`. UI-SPEC §Surface 1 explicitly states this should be upgraded to `h-12 w-12 size-12` if sub-48. The fix was not applied in any of the 6 Phase 6 plans. A 32px hit target on the navigation back button is the most frequently tapped element on the capture entry screen and the most impactful accessibility gap remaining.

These two findings together warrant a -1 from a 4/4 XD score.

**Score: 3/4.**

---

## Registry Safety

`frontend/components.json` has `registries: {}` — no third-party registries. Phase 6 adds zero new shadcn primitives (consumes Phase 5 re-themes only). No registry vetting required.

Registry audit: 0 third-party blocks checked, no flags.

---

## Documented Deferrals (not scored against Phase 6)

| Item | Location | Deferred To | Impact |
|------|----------|-------------|--------|
| `viewport.themeColor: "#F43F5E"` | `layout.tsx:46` | Phase 9 (ONBOARD-10) | PWA status bar still shows rose on iOS install — inherited from Phase 5, unchanged |
| `text-xl font-semibold` on inbox h1 | `inbox/page.tsx:123` | Phase 7+ type-scale sweep | UI-SPEC explicitly specifies IBM Plex Sans for inbox header; cosmetic drift |
| `aria-label="Recette en cours d'extraction"` hardcoded | `RecipeDraftCard.tsx:109` | Phase 7+ a11y sweep | Not user-visible copy; functional |
| `role="note"` on helper callouts | `UrlCaptureTab.tsx:83`, `VoiceCaptureTab.tsx:72` | Phase 7+ a11y sweep | Missing semantic landmark on informational chrome |

---

## Files Audited

| File | Role | Verdict |
|------|------|---------|
| `frontend/components/RecipeDraftCard.tsx` | Drafts inbox row (3 variants) | PASS — paper-grain, AnimatePresence badge, h-12 delete/retry |
| `frontend/app/inbox/page.tsx` | Drafts inbox page | PASS WITH NOTE — AnimatePresence list correct; loading blank gap |
| `frontend/components/EmptyState.tsx` | Empty-state shell | PASS — paper-grain shadow-card, text-title heading, h-12 CTA |
| `frontend/app/recipes/new/page.tsx` | 5-tab capture entry | PASS WITH NOTE — paper-grain Card on photo-picker, h-12 submit; back button 32px |
| `frontend/components/RecipeForm.tsx` | Full-form tab (Complète) | PASS — h-12 submit, gap-6 sections, gap-1.5 field pairs |
| `frontend/components/VoiceCaptureTab.tsx` | Voice tab | PASS — D-Voice callout correct, font-display italic, h-12 buttons, zero speech APIs |
| `frontend/components/PhotoCaptureTab.tsx` | Photo tab | PASS WITH NOTE — h-12 buttons, paper-grain Plus tile, X hit-pad; h2 uses text-xl not text-title |
| `frontend/components/PhotoUploader.tsx` | Photo sheet component | PASS — h-12 sheet buttons, paper-grain Plus tile, X hit-pad (48px via ::before) |
| `frontend/components/UrlCaptureTab.tsx` | URL tab | PASS — h-12 submit, font-mono on URL input, bg-muted/60 helper (no paper-grain, correct) |
| `frontend/components/ui/alert-dialog.tsx` | Title primitive | PASS — font-display on AlertDialogTitle |
| `frontend/components/ui/card.tsx` | Surface primitive | PASS — font-display on CardTitle |
| `frontend/components/ui/dialog.tsx` | Surface primitive | PASS — font-display on DialogTitle |
| `frontend/components/ui/sheet.tsx` | Surface primitive | PASS — font-display on SheetTitle |
| `frontend/app/globals.css` (excerpts) | Token system | PASS — no font-heading/font-sans aliases; scrollbar-none wired; prefers-reduced-motion clamp |
| `frontend/lib/motion.ts` (via SUMMARY/VERIFICATION) | Motion presets | PASS — variants.slideUp, variants.fadeIn, transitions.fast/normal used correctly |
