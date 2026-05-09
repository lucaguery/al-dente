# UI Review — Cooking Log

**Audited:** 2026-05-09
**Auditor:** Claude (Phase 13, manual scoring per CONTEXT.md D-06)
**Synthetic env:** [SYNTHETIC] Démo Al Dente @ https://al-dente-pink.vercel.app
**Viewport:** iPhone-shape Chromium 390×844 (isMobile, hasTouch)
**Reach status:** Reached. Live state: 1 active cooking log (`Pad thai tofu`, id `c7c92195`); finalize page reachable via the persistent CookingBanner on `/`. CookingBanner + finalize page + RatingPicker observed directly. P-12-CL-04 (TZ-01) is masked for the auditor's CEST cook (UTC date aligned).

## Originality Verdict

**Verdict:** Mixed ⚠

The Cooking Log surface bundles three sub-surfaces (CookingBanner on `/`, the multi-section finalize page at `/cooking-logs/{id}/finalize`, and the per-log denormalized recipe-detail surface) per CONTEXT D-05. Token compliance is firm — `bg-primary/8 paper-grain shadow-card` banner, `text-title` heading, skeleton loaders that animate `bg-surface-muted` rather than a generic Spinner. Editorial cohesion is strong on the *visible* surface (`En train de cuisiner` / `Finaliser` / `rating_helper`). But the surface ships [Issue #5](https://github.com/lucaguery/al-dente/issues/5): re-PUT of an already-finalized log increments `cook_count` despite an explicit docstring claiming idempotency — architecture invariant #3 (denormalized fields kept in sync) violated by the surface that maintains them.

| Boilerplate elements | Earned elements |
|----------------------|-----------------|
| `text-emerald-700 dark:text-emerald-300` Tailwind palette literal on the ChefHat banner icon (`frontend/components/CookingBanner.tsx:39`) — third instance of the emerald-token-completeness gap (Shortlist + Vote already showed it) | `bg-primary/8 paper-grain shadow-card border border-border rounded-2xl` for the persistent CookingBanner — composed Slow Food token, `bg-primary/8` is a deliberate faint-terracotta wash that signals "you're cooking right now" without a generic toast (`CookingBanner.tsx:35`) |
| Default shadcn `Textarea` for notes — themed but plain (`CookingLogFinalize.tsx:186-192`) | Skeleton loader uses `h-8 w-2/3` / `h-4 w-1/2` / `h-32 w-full rounded-lg bg-surface-muted animate-pulse` — actual content-shape placeholders, not a single generic spinner (`CookingLogFinalize.tsx:114-118`) |
| Generic `is_first_finalize` guard documented in `routers/cooking_logs.py:136-160` but **not enforced in code** (cook_count bumps on second PUT — P-12-CL-01) | EmptyState `gone` branch with `Sparkles` icon + `gone_heading/body/cta` (`CookingLogFinalize.tsx:122-133`) — handles the "log was finalized in another tab" race with a graceful copy + recovery CTA, not a generic 404 |

## 6-Pillar Score: 20/24

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| Copywriting | 4/4 | Branching error copy (`save_404` / `save_403` / `save_failed`) — specific per HTTP code; `gone_heading` / `gone_body` for the race state; `helper_keyboard_mic` for the iOS keyboard-mic affordance; `offline` toast on `!navigator.onLine`. Full next-intl. |
| Visuals | 4/4 | CookingBanner with terracotta wash + paper-grain reads as "the kitchen-paper ticket on top of your inbox"; finalize page sections separated by `gap-8` give breathing room; skeleton loaders match content-shape. |
| Color | 3/4 | DOCKED -1 — `text-emerald-700 dark:text-emerald-300` on the ChefHat banner icon (`CookingBanner.tsx:39`). Same emerald-Tailwind-literal pattern that recurs across Shortlist + Vote + Cooking-log surfaces; system has no `--color-cook-active` / `--color-validé-foreground` tokens. |
| Typography | 4/4 | `text-title` heading, `text-base font-semibold leading-6` section headers, `text-sm text-foreground-muted leading-5` helper text — consistent leading explicit per UI-SPEC. |
| Spacing | 4/4 | `gap-3 / gap-4 / gap-6 / gap-8` (the `gap-8` between finalize sections is intentional — gives each (photos / rating / notes) section weight); `min-h-16` banner height + `min-h-32` notes textarea — Tailwind scale. |
| Experience Design | 1/4 | DOCKED HARD — [Issue #5] re-finalize bumps `cook_count` (invariant #3 violated; data corruption); P-12-CL-02 (4000-char raw 422 surfaces as generic toast); P-12-CL-04 (TZ-01 cross-link — blocker masked for auditor's CEST tz); P-12-CL-05 (offline listener no-op). 1/4 reflects "the surface that's supposed to keep `cook_count` honest doesn't". |

## Detailed Findings

### Pillar 6: Experience Design (1/4)

- **Re-finalize increments `cook_count` — invariant #3 violated** — Per the docstring at `routers/cooking_logs.py:136-160`, "Idempotency: re-PUT of an already-finalized log does NOT double-count cook_count". WALKTHROUGH probe verified: 2× PUT to the same log → `cook_count = 2` not `1`. The `is_first_finalize` guard isn't preventing the increment. Real-user impact: a couple finalizing then re-tapping (e.g., to fix a typo in notes) inflates the cook history; the scoring algorithm's recency input gets corrupted. Blocker per D-01 (denormalized fields are corrupted via the UI write path; the algorithm depends on them). (See WALKTHROUGH.md §Cooking Log — P-12-CL-01) [[Issue #5](https://github.com/lucaguery/al-dente/issues/5)]
- **Notes 4000-char cap surfaces as generic 422 toast** — `String should have at most 4000 characters` Pydantic detail is swallowed by the `lib/api.ts` wrapper; user sees `t("save_failed")` (`CookingLogFinalize.tsx:106`) — same UX class as P-12-Q02 (validation→connectivity copy). UI doesn't surface the cap with a counter or truncate gracefully. (See WALKTHROUGH.md §Cooking Log — P-12-CL-02)
- **Second-cook-same-day blocked with clean 409** — pass-style canary for Pattern 7 (one cook per day per household). (See WALKTHROUGH.md §Cooking Log — P-12-CL-03)
- **TZ-01 surface confirmed by code inspection** — `cooking_logs.py:72-78,118-126` compares `func.date(cooked_at)` (UTC date of column) against `DateType.today()` (server-local date). Auditor's CEST cook at UTC 18:10 has aligned dates so the bug doesn't surface this run, but the offset case (e.g. East-Asia user crossing UTC midnight) would render `Cette cuisson n'est plus disponible`. Cross-link to TZ-01 backlog only per D-06; do NOT file new. (See WALKTHROUGH.md §Cooking Log — P-12-CL-04)
- **Offline event listener absent** — `dispatchEvent(new Event('offline'))` triggers no UI feedback; `lib/cooking.tsx`'s `putFinalizeCookingLog` checks `navigator.onLine` (`CookingLogFinalize.tsx:83-86`) but the `/` shell doesn't render an offline indicator at all. Friction now; cross-cuts realtime invariant #4 work. (See WALKTHROUGH.md §Cooking Log — P-12-CL-05)
- **Boundary handling solid** — bad UUID → `404 cooking log not found`; invalid rating → `422 enum`. Pass-style. (See WALKTHROUGH.md §Cooking Log — P-12-CL-06)

### Pillar 1: Copywriting (4/4)

- Branching error copy by HTTP code: `save_404` (log was deleted/finalized elsewhere — auto-redirect), `save_403` (not your household — redirect home), `save_failed` (generic). Each maps to a concrete user mental beat.
- `gone_heading` / `gone_body` / `gone_cta` (`CookingLogFinalize.tsx:127-129`) for the race-with-another-tab case — refuses the boilerplate "Not found".
- `helper_keyboard_mic` (`tNotes("helper_keyboard_mic")`, `CookingLogFinalize.tsx:183`) — surfaces the iOS keyboard-mic affordance (matches the D-Voice deviation pattern from VoiceCaptureTab).
- CookingBanner CTAs: `Finaliser` (verb-action, lucide Sparkles icon-tag) + `Passer` (skip — session-scoped, not delete). Names the verb, not the technical action.

### Pillar 2: Visuals (4/4)

- CookingBanner: `bg-primary/8` faint-terracotta wash + `paper-grain shadow-card` carries an "active state" tone without an alert color — pulls the eye exactly as much as needed.
- Finalize page: 3 sections (Photos / Note + Rating / Notes) each headed with `text-base font-semibold leading-6` and helper paragraph; `gap-8` between sections, `gap-4` within. Real visual rhythm.
- Skeleton loader uses content-shape placeholders (`h-8` for title, `h-4` for subtitle, `h-32` for first content block) instead of a generic spinner — earned loading visual.

### Pillar 3: Color (3/4)

- DOCKED -1 — `text-emerald-700 dark:text-emerald-300` on the ChefHat icon. Tailwind palette literal where a `--color-cook-active` token would close the system. Recurs across multiple surfaces; one fix scope.
- Banner background `bg-primary/8` and ColorPickers' `bg-card/70 backdrop-blur-sm` use semantic tokens correctly. Only the icon foreground reaches for the literal.

### Pillar 4: Typography (4/4)

- `text-title` (Slow Food display class) for page title; `text-base font-semibold leading-6` for section headers; `text-sm text-foreground-muted leading-5` for helper text. Explicit `leading-6` / `leading-5` matches 07-UI-SPEC §Typography.
- `font-display italic` is used elsewhere (Voice + recap), absent here — correct because the cooking-log finalize is a transactional surface, not a display moment.

### Pillar 5: Spacing (4/4)

- Three-tier hierarchy: `gap-8` (between major sections) → `gap-4` (within section: heading↔body) → `gap-1` (within heading: title↔subtitle). The `gap-8` is the right ratio to give Photos / Rating / Notes their separate identity without inserting visual dividers.
- Banner: `mx-6 mt-4 px-4 py-3 min-h-16` — keeps the 64px min-height / safe horizontal margin contract.

## Screenshots

- `./screenshots/cooking-log-finalize.png` — top of `/cooking-logs/{id}/finalize`: page title, recipe sub-header, Photos section heading + helper, photo uploader. Section rhythm visible.
- `./screenshots/cooking-log-finalize-bottom.png` — scrolled to bottom: Notes textarea + the disabled `Finaliser cette cuisson` CTA (disabled because rating is null at audit time). The 4000-char cap from P-12-CL-02 is *not* surfaced as a counter — this is the D-13 dock evidence.

## WALKTHROUGH cross-links (context inherited per D-11)

- WALKTHROUGH.md §Cooking Log: 6 probes (P-12-CL-01..CL-06). P-12-CL-01 [[Issue #5](https://github.com/lucaguery/al-dente/issues/5)] is the dominant Pillar 6 dock. P-12-CL-04 cross-links TZ-01 backlog. P-12-CL-03 + CL-06 are pass-style backend canaries.
- 0 Gemini calls — cooking-log creation is non-AI.
- The `is_first_finalize` guard contract is documented in code but not honored — strongest signal that this surface needs a regression test before [#5] is fixed.
