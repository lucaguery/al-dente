# UI Review — Capture / Rapide

**Audited:** 2026-05-09
**Auditor:** Claude (Phase 13, manual scoring per CONTEXT.md D-06)
**Synthetic env:** [SYNTHETIC] Démo Al Dente @ https://al-dente-pink.vercel.app
**Viewport:** iPhone-shape Chromium 390×844 (isMobile, hasTouch — mirrors `frontend/playwright.config.ts`)
**Reach status:** Reached.

## Originality Verdict

**Verdict:** Mixed ⚠

Token compliance is clean — Slow Food terracotta primary, paper-grain Card around the optional photo, two-layer warm-brown shadow-card, no hardcoded colors, IBM Plex Sans body throughout. Editorial cohesion is partial: the placeholder is delightful (`Carbonara express`), but the submit verb is generic (`Ajouter` rather than `Garder` / `Sauvegarder`), and a 422 validation error masquerades as a connectivity error (`Connexion impossible. Réessaie dans un instant.`).

| Boilerplate elements | Earned elements |
|----------------------|-----------------|
| Default shadcn `Tabs`/`TabsList`/`TabsTrigger` primitives — correctly themed but not customized (`frontend/app/recipes/new/page.tsx:154-170`) | `paper-grain shadow-card` Card wrapping the optional photo input — Slow Food token, "recipe-card-on-the-counter" reading per the inline comment (`frontend/app/recipes/new/page.tsx:190`) |
| Native file input styled with default shadcn `file:` utilities (`file:rounded-md file:bg-secondary file:text-secondary-foreground`) — same shape any starter would ship (`frontend/app/recipes/new/page.tsx:192-198`) | Concrete, on-brand placeholder `Carbonara express` (recipes.new.title_placeholder) — refuses the generic `e.g. Recipe name` template |
| Sticky-bottom CTA pattern with `bg-background/80 backdrop-blur-sm` — common iOS-form ergonomic, not particular to Al Dente (`frontend/app/recipes/new/page.tsx:205`) | Two-stage progress copy `Enregistrement…` → `Téléchargement de la photo…` via `quickStage` state machine — refuses the generic "Saving…" fallthrough (`frontend/app/recipes/new/page.tsx:210-223`) |

## 6-Pillar Score: 21/24

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| Copywriting | 3/4 | Full next-intl + FR-only; charming `Carbonara express` placeholder; submit verb `Ajouter` is generic; 422 validation re-toasted as `Connexion impossible` (See WALKTHROUGH.md §Capture — Quick — P-12-Q02). |
| Visuals | 4/4 | Clean focal hierarchy (title → photo Card → sticky CTA); aria-labeled back chevron; paper-grain Card differentiates the optional-photo row from the required title input. |
| Color | 4/4 | Single terracotta accent on the primary CTA; semantic tokens only (`bg-background`, `text-muted-foreground`, `border-border`); zero hardcoded `#hex`/`rgb()`. |
| Typography | 4/4 | 3 distinct sizes (`text-base`, `text-sm`, `text-xs`), 2 weights (`font-semibold`, `file:font-medium`) — both within rubric thresholds. IBM Plex Sans default; Fraunces italic deliberately reserved for display moments elsewhere. |
| Spacing | 4/4 | Tailwind scale only (`gap-6`, `gap-1.5`, `h-12`, `p-4`, `px-6`, `pb-32`, `mt-4`); one `calc(env(safe-area-inset-bottom)+0.75rem)` is the ergonomic safe-area pattern, not arbitrary. |
| Experience Design | 2/4 | Loading + disabled states present (Loader2 with two-stage labels at `frontend/app/recipes/new/page.tsx:210-223`; button disabled when title empty per P-12-Q04). DOCKED for two real user-impact bugs: validation→connectivity copy (P-12-Q02) and lack of submit debounce / idempotency token (See WALKTHROUGH.md §Capture — Quick — P-12-Q03). |

## Detailed Findings

(Order: lowest-scoring pillar first.)

### Pillar 6: Experience Design (2/4)

- **Two-stage loading** — `quickStage` state machine (`frontend/app/recipes/new/page.tsx:58, 210-223`) renders distinct labels (`Enregistrement…` for the title POST, `Téléchargement de la photo…` for the multipart upload). Cleaner than a single generic spinner. ✓
- **Empty-title disabled state** — `disabled={!quickTitle.trim() || quickStage !== null}` (`page.tsx:208`). Pass-style — no backend round-trip on empty input (See WALKTHROUGH.md §Capture — Quick — P-12-Q04).
- **Validation error masquerades as connectivity** — the catch in `submitQuick` (`page.tsx:77-80`) emits `tErr("network")` for *any* `api()` failure, including a 422 from oversized title. User sees `Connexion impossible. Réessaie dans un instant.` and has no signal the title is the cause. (See WALKTHROUGH.md §Capture — Quick — P-12-Q02).
- **No submit debounce / no idempotency-key** — the `quickStage !== null` disable kicks in *after* the first `setQuickStage("title")` resolves. Two synchronous clicks (mimicking iOS double-tap) both pass the gate and produce two `201`s with distinct UUIDs. Per D-13 this is a blocker-severity finding affecting all 5 capture surfaces; the `Ajouter` button does not enter a pending/disabled state synchronously enough. (See WALKTHROUGH.md §Capture — Quick — P-12-Q03).
- **No error boundary observed** — page is wrapped in `OnboardingGuard` (`page.tsx:36-40`) but has no per-tab error boundary; an unhandled render error in `RecipeForm`/`VoiceCaptureTab`/`PhotoCaptureTab`/`UrlCaptureTab` would propagate.

### Pillar 1: Copywriting (3/4)

- All user-facing strings flow through `useTranslations(...)` namespaces (`recipes.new`, `common`, `onboarding.errors`, `photo_uploader`, `recipes.voice`, `recipes.photo`, `recipes.url`) — invariant #6 honored. ✓
- Tab labels via i18n: `Rapide` / `Complète` / `Voix` / `Photo` / `URL`. **Documentation drift** — `CLAUDE.md` Locked vocabularies §"Tab labels" still references "Quick" (See WALKTHROUGH.md §Capture — Quick — P-12-Q01).
- Placeholder `Carbonara express` is concrete + on-brand — refuses the boilerplate `e.g. Recipe name`. ✓
- Submit verb `Ajouter` is functional but generic for an "add a recipe to your shared library" moment. `Garder` / `Sauvegarder` / `Garder cette idée` would carry the Slow Food slow-down editorial voice better.
- Draft badge in inbox is bare `Brouillon` — Phase 12 noted plan/spec referenced richer `Brouillon en attente d'analyse`, but quick capture doesn't enqueue Gemini promotion (so the bare `Brouillon` is *correct* — the docs are wrong). Pillar 1 not docked for this; surface in P-12-Q01's documentation-drift finding.

### Pillar 2: Visuals (4/4)

- Single visual focal point per state: empty form → title input is autofocused (`autoFocus` on `Input` `id="quick-title"`); filled form → sticky `Ajouter` CTA at bottom of viewport.
- Back-chevron is icon-only but `aria-label={tCommon("back")}` (`page.tsx:144`) — passes the icon-only-needs-aria check.
- The `paper-grain shadow-card` Card around the photo input visually separates "optional add-on" from "required title" — the form reads as title-first, photo-secondary without copy needing to say so.
- Tab strip uses `min-w-[64px]` per trigger and `overflow-x-auto scrollbar-none` — gracefully scrolls on narrow viewports without horizontal scrollbar artifacts.

### Pillar 3: Color (4/4)

- Terracotta primary appears once on this surface (the `Ajouter` button via `<Button>` default variant). Single accent, focused.
- Semantic tokens only: `bg-background/80`, `text-foreground`, `border-border`, `text-muted-foreground`, `text-secondary-foreground`. No raw `#hex` or `rgb()` literals.
- `text-xs text-muted-foreground` for the photo filename hint (`page.tsx:200`) — appropriately desaturated; matches Slow Food's "warm-brown notes" palette.

### Pillar 4: Typography (4/4)

- 3 sizes in use (`text-base` for header label, `text-sm` for file input, `text-xs` for filename hint) — within the rubric's ≤4 sizes ceiling.
- 2 weights (`font-semibold` on the header span, `file:font-medium` on the native file button) — within the ≤2 weights ceiling.
- IBM Plex Sans body default per `frontend/app/globals.css`; Fraunces italic intentionally absent here (display moments are reserved for elsewhere — D-02a token-compliant absence).

### Pillar 5: Spacing (4/4)

- Tailwind scale exclusively: `gap-6` / `gap-1.5` between form rows; `h-12` for the CTA; `px-6` page gutter; `pb-32` to clear the sticky CTA + nav; `mt-4` / `mt-1` for header offsets.
- One `pb-[calc(env(safe-area-inset-bottom)+0.75rem)]` (`page.tsx:205`) is the canonical iOS safe-area ergonomic — not an arbitrary `[16px]` value.
- Card uses `p-4`, internal `gap-1.5` — same ratios used elsewhere in the design system.

## Screenshots

- `./screenshots/capture-quick-canonical.png` — empty `/recipes/new` on the `Rapide` tab, autofocused title input, optional-photo paper-grain Card, disabled `Ajouter` CTA at bottom.
- `./screenshots/capture-quick-with-input.png` — title `Tarte aux poireaux` typed; the disabled state on the CTA is the same as canonical (the disable predicate is title-empty, not pristine), illustrating P-12-Q03's race-condition root cause: synchronous double-clicks both pass `disabled={!quickTitle.trim() || quickStage !== null}` because `quickStage` flips only after `submitQuick` resolves the first POST.

## WALKTHROUGH cross-links (context inherited per D-11)

- WALKTHROUGH.md §Capture — Quick: 4 probes (P-12-Q01..Q04). Inheritance: documentation drift is a vocabulary-audit item filed elsewhere (Pillar 1 — surfaced once); P-12-Q02 + P-12-Q03 dock Pillar 6 directly; P-12-Q04 is recorded as the empty-title pass-style finding.
- 0 Gemini calls observed for Quick — confirms Quick is non-AI per RESEARCH §Surface 1.
