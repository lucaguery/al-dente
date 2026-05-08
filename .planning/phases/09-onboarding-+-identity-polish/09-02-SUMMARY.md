---
phase: 09-onboarding-+-identity-polish
plan: 02
subsystem: onboarding
tags:
  - onboarding
  - typography
  - paper-grain
  - tap-target
  - identity-signature
requirements_completed:
  - ONBOARD-07
  - ONBOARD-08
dependency_graph:
  requires:
    - Phase 5 — Card primitive with paper-grain utility (frontend/components/ui/card.tsx)
    - Phase 5 — Button primitive (frontend/components/ui/button.tsx)
    - Phase 5 — text-display Fraunces italic typography utility (globals.css)
    - Phase 5 — duration-fast + ease-craft motion presets (globals.css)
    - Phase 6 — D-Voice callout pattern (paper-grain Card + 3px terracotta-60 left border + Fraunces italic headline)
  provides:
    - Welcome wordmark + 2-Card CTA pair (Phase 6 D-Voice mirror at h-12 interior)
    - Share-code Fraunces italic terracotta invite-code identity signature
    - Create + Join paper-grain form-body Card pattern with text-display title
    - h-12 tap-target floor on every onboarding interactive surface
  affects:
    - Plan 09-03 (Settings) — must mirror the byte-identical identity-signature class string `font-display italic text-3xl tracking-widest text-primary` on the Settings invite-code card
tech-stack:
  added: []
  patterns:
    - "Paper-grain Card wrapping a Link as the tap target (welcome CTA pair) — mirrors Phase 6 D-Voice callout but interactive"
    - "Identity-signature class string locked: `font-display italic text-3xl tracking-widest text-primary` (load-bearing, repeated VERBATIM on Settings in Plan 09-03)"
    - "Form-body wrapped in paper-grain Card with text-display Fraunces italic title above fields (Create + Join shape)"
    - "Mono entry-time vs Fraunces italic read-time register split — invite-code Input keeps `text-center font-mono tracking-[0.3em] uppercase` for typing UX, share-code + Settings use Fraunces italic for read-time identity"
key-files:
  created: []
  modified:
    - frontend/app/onboarding/welcome/page.tsx
    - frontend/app/onboarding/create/page.tsx
    - frontend/app/onboarding/share-code/page.tsx
    - frontend/app/onboarding/join/page.tsx
decisions:
  - "Card padding strategy: kept parent `<div className=\"px-6 pt-6 pb-32\">` and let the Card supply its OWN padding via `px-6 py-6` (no `mx-6 my-6` Card margin). This avoids compounded margin (page 24px horizontal + Card mx-6 = 48px gutter feel). Card sits flush left/right inside the page padding band — 'framed by the page', not 'centered with extra gutter'."
  - "Did NOT extract OnboardingCard.tsx wrapper. 4 screens, ~30-line Card wrapper duplication is acceptable (per planner judgment in PLAN.md) — extraction overhead exceeds reuse value at this scale."
  - "Used `tracking-widest` (the locked default, NOT the CONTEXT.md `tracking-[0.15em]` fallback) for the share-code invite-code Fraunces italic display. Test on iPhone deferred to in-flight smoke; fallback can swap if visual review fails."
  - "Reordered share-code invite-code className from `font-display italic text-3xl tracking-widest text-center py-4 text-primary` to `font-display italic text-3xl tracking-widest text-primary text-center py-4` so the literal substring `font-display italic text-3xl tracking-widest text-primary` is contiguous in the JSX. This makes the acceptance grep pass with exactly 1 hit AND locks the byte-identical class string Plan 09-03 will mirror on the Settings invite-code per the cross-plan key_link contract. Final visual rendering identical (CSS class order is irrelevant)."
  - "Welcome screen now uses `<Link>` (Next.js client-side navigation) inside the paper-grain Card instead of `router.push` from `useRouter`. The Link IS the tap target, navigation is href-based. Removed the now-unused `useRouter` import + `Button` import."
metrics:
  duration: ~13 minutes
  tasks_completed: 2
  files_modified: 4
  i18n_keys_added: 0
  i18n_keys_removed: 0
  i18n_keys_unchanged: 353
  completed: "2026-05-08T17:15:00Z"
---

# Phase 9 Plan 02: Onboarding (Welcome / Create / Share-code / Join) Summary

**One-liner:** Re-themed the 4 onboarding screens onto Phase 5 token + Phase 6 D-Voice patterns: Fraunces italic display titles everywhere, paper-grain Cards on every form/body surface, h-12 tap-target floor on every interactive control, and the load-bearing Fraunces italic terracotta invite-code identity signature on share-code (verbatim mirror locked for Plan 09-03 Settings).

## What changed

### Welcome (`frontend/app/onboarding/welcome/page.tsx`)
- Wordmark: `text-[28px] font-semibold tracking-tight` → `text-display` (Fraunces italic display register, matches Phase 7 daily date header + Phase 8 recipe-detail hero)
- 2 plain `<Button>` CTAs replaced with **2 paper-grain Cards** wrapping `<Link>`s:
  - `paper-grain shadow-card border-l-[3px] border-primary/60 p-4 transition-colors duration-fast ease-craft hover:bg-card/95`
  - Interior Link at `flex items-center justify-between h-12`
  - Fraunces italic CTA label (`font-display italic text-base`) + ChevronRight tinted `text-primary`
- Removed unused `useRouter` + `Button` imports (Link href handles nav)

### Share-code (`frontend/app/onboarding/share-code/page.tsx`)
- Body wrapped in `<Card className="paper-grain shadow-card px-6 py-6 flex flex-col gap-4">`
- Title: `text-xl font-semibold` → `text-display`
- Invite-code: replaced the mono `text-[28px] font-mono font-semibold tracking-[0.3em] py-6 px-8 bg-surface-muted rounded-lg text-center mt-6` block with the **identity signature**: `font-display italic text-3xl tracking-widest text-primary text-center py-4` (Fraunces italic terracotta — cookbook-recipe-card-number gesture)
- Copy Button: `h-11` → `h-12`
- Done Button: `h-11 w-full` → `h-12 w-full`

### Create (`frontend/app/onboarding/create/page.tsx`)
- Form-body wrapped in `<Card className="paper-grain shadow-card px-6 py-6 flex flex-col gap-6">`
- New form-body title `<h2 className="text-display">{t("title")}</h2>` above the 3 existing fields
- Back Button bumped from default `size-8` (32px) to `h-12 w-12` (48px D-08 floor)
- Right-side header spacer: `w-8` → `w-12`
- Submit Button: `h-11 w-full` → `h-12 w-full`
- Form state, validation, `onSubmit`, `api()` call, error toast, `Loader2` spinner — all preserved verbatim

### Join (`frontend/app/onboarding/join/page.tsx`)
- Same shape as Create: form-body wrapped in paper-grain Card with `text-display` title
- Back Button `h-12 w-12` + spacer `w-12` + submit `h-12 w-full`
- **Critical preservation:** invite-code Input keeps `text-center font-mono tracking-[0.3em] uppercase` (entry-time mono register — typing UX). The Fraunces italic register is reserved for **read-time** display on share-code + Settings.
- Form state, debounce (300ms `setTimeout`), `fetchPreview`, `statusOf` helper, error handling for 404/409/422, `ColorSwatchPicker` `takenColors`, color/code error inline alerts — all preserved verbatim

## Deviations from Plan

None — plan executed exactly as written, with one acceptance-grep contract deviation handled inline:

- **Class-string ordering deviation (Rule 3 — blocking acceptance grep):** The plan's reference snippet for the share-code identity signature was `font-display italic text-3xl tracking-widest text-center py-4 text-primary`. With this ordering, the acceptance grep pattern `font-display italic text-3xl tracking-widest text-primary` would match 0 times in the actual JSX (the substring is non-contiguous because `text-center py-4` interleaves between `tracking-widest` and `text-primary`). Reordered to `font-display italic text-3xl tracking-widest text-primary text-center py-4` so the literal substring is contiguous → acceptance grep returns exactly 1 hit, and the byte-identical class string Plan 09-03 must mirror is now well-defined. Final visual rendering is identical (Tailwind CSS class order has no semantic effect when classes don't conflict).

## Auth gates

None — pure UI retheme on a logged-out flow.

## Verification results

### Task 1 (Welcome + Share-code)
- `grep -c "text-display" app/onboarding/welcome/page.tsx` = 1 (wordmark)
- `grep -c "paper-grain" app/onboarding/welcome/page.tsx` = 2 actual JSX hits (5 raw incl. comments)
- `grep -c "border-l-\[3px\]" app/onboarding/welcome/page.tsx` = 2 (CTA Cards)
- `grep -c "h-12" app/onboarding/welcome/page.tsx` = 2 actual JSX (4 raw incl. comments)
- `grep -c "h-11" app/onboarding/welcome/page.tsx` = 0
- `grep -c "font-display italic text-base" app/onboarding/welcome/page.tsx` = 2 (CTA labels)
- `grep -c "font-display italic text-3xl tracking-widest text-primary" app/onboarding/share-code/page.tsx` = 1 (the JSX className, after reorder)
- `grep -c "paper-grain" app/onboarding/share-code/page.tsx` = 1 actual JSX (2 raw incl. comment)
- `grep -c "h-12" app/onboarding/share-code/page.tsx` = 2 actual JSX (5 raw incl. comments)
- `grep -c "h-11" app/onboarding/share-code/page.tsx` = 0
- `grep -c "tracking-\[0.3em\]" app/onboarding/share-code/page.tsx` = 0
- `grep -c "text-display" app/onboarding/share-code/page.tsx` = 1
- `npx tsc --noEmit` exits 0
- `npm run lint` exits 0 (2 pre-existing warnings on untracked `public/worker-9e66885325cabad7.js`, out of scope)

### Task 2 (Create + Join)
- Create: `paper-grain` ≥1, `text-display` ≥1, `h-12 w-12` ≥1, `h-12 w-full` ≥1, `h-11` = 0, `w-8"` = 0
- Join: `paper-grain` ≥1, `text-display` ≥1, `h-12 w-12` ≥1, `h-12 w-full` ≥1, `h-11` = 0
- **Mono Input invariant:** `tracking-[0.3em]` in join = exactly 1 (the invite-code Input — preserved as required)
- `npx tsc --noEmit` exits 0
- `npm run lint` exits 0

### Phase-level smoke checks
- `paper-grain` across all 4 onboarding pages: present in every file (welcome 2 / create 1 / share-code 1 / join 1)
- `h-11` across `app/onboarding/`: 0 hits
- `text-display` across `app/onboarding/`: 4 hits (one per screen — wordmark + 3 form/body titles)
- Mono `tracking-[0.3em]` in `app/onboarding/`: exactly 1 hit (Join invite-code Input — entry-time register preserved)
- `wc -l frontend/lib/i18n/fr.json` = 353 (matches pre-Phase-9 baseline; zero new keys)
- `git diff f7f6ee2..HEAD -- frontend/lib/i18n/fr.json` = empty
- `npm run build` succeeds (4 onboarding routes prerendered as static; trailing `RAILWAY_URL not set` warning is the expected env fallback, not a build failure)

## Decisions Made (detailed)

### Card centering: `mx-0` (no Card margin) over `mx-6 my-6`
The plan flagged this as layout-judgment. Chose to keep the parent `<div className="px-6 pt-6 pb-32">` page-padding wrapper and let the Card use its own `px-6 py-6`. The result on iPhone-sized viewports: page has 24px horizontal padding, Card sits flush inside that padding band, Card has 24px interior padding. This reads as "the Card IS the page body with framing", not "the Card is a centered island with double-gutter". If real-device review reveals the Card feels edge-to-edge, swap to `mx-6 my-6` and reduce parent `pt-6` to `pt-0` per the plan's noted alternative.

### OnboardingCard wrapper extraction: NO
Per planner judgment in the plan: 4 screens, each with a ~30-line Card wrapper, and the wrapper differs slightly per screen (welcome has 2 Cards inside a flex container; share-code adds the invite-code monogram inside the Card; create + join wrap a form). Extraction overhead exceeds reuse value at this scale. Documented inline in each page comment.

### `tracking-widest` (locked) over `tracking-[0.15em]` (CONTEXT.md fallback)
Used the plan's primary choice `tracking-widest` (≈ `letter-spacing: 0.1em` per Tailwind v4) for the Fraunces italic invite-code on share-code. The fallback `tracking-[0.15em]` is documented in CONTEXT.md §"Claude's Discretion" but only swapped if real-device visual review on iPhone reveals the locked choice reads as "too tight". Pre-build static review judged `tracking-widest` adequate.

### Identity-signature class-string lock (cross-plan invariant)
The exact class string for the share-code invite-code is now:
```tsx
<div className="font-display italic text-3xl tracking-widest text-primary text-center py-4">
  {code}
</div>
```
**Plan 09-03 MUST repeat this byte-identical** on the Settings "Foyer" Card invite-code element. The contiguous substring `font-display italic text-3xl tracking-widest text-primary` is the locked identity signature; `text-center py-4` is layout chrome that may differ slightly between share-code (centered, py-4) and Settings (per its surrounding layout) — but the typography-bearing classes MUST match.

## Self-Check: PASSED

**Files modified — verified present:**
- `frontend/app/onboarding/welcome/page.tsx` — FOUND
- `frontend/app/onboarding/create/page.tsx` — FOUND
- `frontend/app/onboarding/share-code/page.tsx` — FOUND
- `frontend/app/onboarding/join/page.tsx` — FOUND

**Commits — verified in git log:**
- `549076f` feat(09-02): re-theme Welcome + Share-code onboarding screens — FOUND
- `e74a7ff` feat(09-02): re-theme Create + Join onboarding screens — FOUND
- `1d9f209` fix(09-02): pin identity-signature class string for Plan 03 mirror — FOUND
