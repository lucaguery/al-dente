---
quick_id: 260520-hpz
status: complete
date: 2026-05-20
commits: [875171c, 14fb3c3, e4f788b, fd4aa3a, 7089bac, 5f9046e, 4b3d61b]
tasks_completed: 7
---

# Summary

Reversed Phase 36 SOBER-09's swipe-deck retire: Accueil now leads with the
Variant A swipe deck on every non-all-voted shortlist render, with VoteSummary
relegated to the terminal "all voted" panel. Migrated the Validé palette off
emerald (Phase 5 lock) onto mono-terracotta per sketch 001 winner — six
semantic tokens shifted in `globals.css`, mirrored in `docs/design-system.html`,
and superseded by ADR-0003. Added the round-2 feedback layer: progress strip
above the deck, snap-back shake + marginalia hint on early release,
thumb-button ring-flash echo, inline commit toast (`Validé · {title}` / `Non
merci · {title}`), and partner-chip ripple on partner-vote echo.

## Per-task commits

| Task | Commit  | Summary                                                |
| ---- | ------- | ------------------------------------------------------ |
| 1    | 875171c | Validé palette tokens emerald → mono-terracotta        |
| 2    | 14fb3c3 | Mirror palette shift into `docs/design-system.html`    |
| 3    | e4f788b | ADR-0003 — mono-terracotta supersedes Phase 5 lock     |
| 4    | fd4aa3a | i18n(fr) — 7 new `home.shortlist.*` feedback keys      |
| 5    | 7089bac | Recreate `ShortlistDeck`; re-wire `HomeDecide`         |
| 6    | 5f9046e | `ShortlistProgress` + snap-back hint + thumb echo      |
| 7    | 4b3d61b | Inline commit toast + partner-chip ripple              |

## Files modified

- **Task 1**: `frontend/app/globals.css`
- **Task 2**: `docs/design-system.html`
- **Task 3**: `docs/adr/0003-validated-color-mono-terracotta.md` (new)
- **Task 4**: `frontend/lib/i18n/fr.json`
- **Task 5**: `frontend/components/ShortlistDeck.tsx` (new), `frontend/components/HomeDecide.tsx`
- **Task 6**: `frontend/components/ShortlistProgress.tsx` (new), `frontend/components/ShortlistCard.tsx`, `frontend/components/ShortlistDeck.tsx`
- **Task 7**: `frontend/components/ShortlistCard.tsx`, `frontend/components/HomeDecide.tsx`

## Verification run

- `grep -nE '#10B981|#047857|...' frontend/app/globals.css` → 1 hit on
  `--color-member-emerald-bg` (explicit Validé/member-slot exception per plan).
- `grep -niE '#10b981|...' docs/design-system.html` → 1 hit on a historical
  `<span class="rm">` diff/changelog entry (not a live token; analogous member-slot
  context).
- `node -e "JSON.parse(...fr.json)"` → exit 0.
- 7 new i18n keys present; `toast_validé` preserved (1 match).
- `cd frontend && npx tsc --noEmit` → no errors in any file touched by this
  plan (HomeDecide, ShortlistCard, ShortlistDeck, ShortlistProgress).
- `cd frontend && npm run lint` → exit 1 with 14 problems (5 errors, 9 warnings).
  **All 14 are pre-existing in unrelated files** (`app/recipes/page.tsx:163`,
  `lib/hooks/useSignedPhotoUrl.ts:36`, `tests/e2e/*.spec.ts` playwright rule
  missing, `public/worker-*.js`, `VoteSummary.tsx` unused vars,
  `RecipeForm.tsx`, `RecipeIllustration.tsx`). Same baseline as before Task 1.
  No new lint debt introduced.

## Deviations from plan

1. **Task 5 — index-clamp via render-time derivation, not effect.** The plan
   specified `useEffect` to reset `index` when `unvotedByMe.length` shrinks
   below current. The project's ESLint config (`react-hooks/set-state-in-effect`)
   forbids `setState` calls inside effect bodies. Replaced the effect with a
   render-time clamp (`rawIndex >= unvotedByMe.length ? 0 : rawIndex`) — same
   semantics, no setState-in-effect violation. Matches React's "you might not
   need an effect" guidance.

2. **Task 6 — `total` captured via lazy useState instead of useRef.** The plan
   suggested a `useRef` to hold the initial-deal length. React 19's
   `react-hooks/refs` lint rule forbids reading or writing `.current` during
   render. Replaced with `useState(() => unvotedByMe.length)` lazy initializer
   — same "captured on first mount" semantics, lint-compliant.

3. **Task 6 — snap-back shake via `animate(x, [...])` imperative call, not
   `useAnimationControls`.** The plan suggested `useAnimationControls`. The
   card's `motion.div` already binds `animate={motionAnimate}` for the spring
   entry, and passing controls to the same prop would conflict with the entry
   animation. Used framer-motion's imperative `animate(MotionValue, [...])`
   instead — drives the same `x` MotionValue the card already styles from, no
   prop conflict.

4. **No `playwright/no-skipped-test` follow-up.** Lint surfaced
   `Definition for rule 'playwright/no-skipped-test' was not found` errors in
   `tests/e2e/capture-url.spec.ts` and `tests/e2e/shortlist-vote.spec.ts`.
   These are pre-existing per the scope-creep guardrail (E2E specs explicitly
   out of scope). Listed under Follow-ups.

## Manual UAT pending

User to run `cd frontend && npm run dev` and walk on a 375px viewport:

- [ ] Deal-in renders → two cards visible (front + peek)
- [ ] Drag right past 140px → terracotta (NOT emerald) ring fills → release → fly-off
- [ ] After commit, `Validé · {title}` toast appears bottom-center for ~1.4s
- [ ] Next card promotes via spring; progress strip advances (dot fills)
- [ ] Tap yes thumb → ring flashes terracotta → fly-off → toast appears
- [ ] Drag right ~50px and release → card shakes; "encore un peu — glissez plus loin" caption appears below for ~1.4s
- [ ] Simulate partner vote (second session) → partner chip on current front card ripples (scale 1 → 1.15 → 1)
- [ ] Vote on all 5 → terminal `<VoteSummary>` panel renders (cook / delegate / regenerate CTAs)
- [ ] Visually confirm: zero emerald hue anywhere on Accueil (header, deck, thumb button, ring, progress strip, cooking banner icon)
- [ ] `prefers-reduced-motion`: deck still works; no shake, no ring-flash, but toast still fires

## Follow-ups

1. **E2E specs reference deleted `<ShortlistCard>` flow.** `tests/e2e/shortlist-vote.spec.ts` and possibly others were authored against the Phase 36 SOBER-09 ledger and/or the original swipe deck. The plan explicitly excluded `tests/e2e/**` from this quick task. A separate quick task should re-record the specs against the restored swipe-deck surface and remove the `playwright/no-skipped-test` lint errors (rule missing from the flat config).

2. **Pre-existing lint debt (out of scope for this quick).** Five existing errors and nine warnings unrelated to this work — track via a separate "lint debt" quick task:
   - `app/recipes/page.tsx:163` — `react-hooks/set-state-in-effect` in `localStorage` init effect.
   - `lib/hooks/useSignedPhotoUrl.ts:36` — same rule on the `path === null` branch.
   - `public/worker-9e66885325cabad7.js` — built artifact lint warnings (gitignore candidate).
   - `components/VoteSummary.tsx:99/101` — unused `_onDelegate`, `_delegateInFlight` (delegate moved out in SOBER-09; props can be removed now that the deck owns the affordance).
   - `RecipeForm.tsx`, `RecipeIllustration.tsx`, `app/recipes/[id]/edit/page.tsx`, `app/recipes/[id]/page.tsx` — minor unused-vars.

3. **Pressenti/Contesté/Rejeté color tokens not introduced.** Per ADR-0003 §Consequences (out of scope for this quick), only the Validé semantic shifted. The progress-strip's voted-no dot reuses `bg-foreground-muted/40` rather than a future `--color-rejete-foreground`. When sketch 002 (state-color map) lands, the strip can swap to the proper token.

4. **Cooking-banner icon hue silently shifted.** `--color-cooking-foreground` migrated to terracotta `#8B331F` (light) / `#F2C7B6` (dark) alongside the Validé tokens (the sibling-token treatment was explicit in the plan). Worth a one-glance visual check on the next active cooking session to confirm the banner reads correctly with the new hue.

5. **`process.env.NODE_ENV` use in `ShortlistCard.tsx`.** Pre-existing (Phase 30 BUG-01); the file already references it for the dev-fallback photo URL. Not introduced by this quick — flagged here only because Task 7 also touched the file and may show up in a code-review diff.
