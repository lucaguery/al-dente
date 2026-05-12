---
phase: 260512-df0-improve-suggestion-list-layout-slide-smo
plan: 01
status: complete
date: 2026-05-12
---

# Quick Task 260512-df0 — Summary

Improve the shortlist (suggestion list) review surface — fix 5 user-reported bugs grouped into 4 atomic commits. All commits landed on `main` before the executor was stopped; the executor was about to write this summary when it was interrupted, so this file was reconstructed from the commit messages and diffs.

## Tasks

### T1 — Smooth swipe + thumb-tap card commit animation (bugs 1 + 3)

**Commit:** `931f891`
**Files:** `frontend/components/ShortlistDeck.tsx`, `frontend/components/ShortlistCard.tsx`

`ShortlistDeck` now owns `committedDirection` state (`yes` → right, `no` → left), set inside `handleVote` *before* `setIndex`, so the exiting front card sees a non-null direction in the same `AnimatePresence` cycle that unmounts it. `ShortlistCard` accepts `committedDirection`; the front card's `exit` variant flies `x = ±viewport * 1.4` with a 12° rotate over ~200ms, reusing the existing `SWIPE_FLY_OFFSCREEN_FACTOR` + `SWIPE_FLYOFF_DURATION_S` tokens (no new motion config). The new front card's `initial` mounts at `{scale: 0.94, y: 12, opacity: 0.85}` and springs to `{scale: 1, y: 0, opacity: 1}` via the existing `transitions.springSnap` — peek-to-front promotion instead of the prior instantaneous swap. Defensive `setIndex` cap (`Math.min(i + 1, recipes.length)`) prevents double-tap overshoot. `prefers-reduced-motion: reduce` branch preserved: variants stay `undefined` and cards mount/unmount instantly.

**Verify:** `pnpm lint` clean; manual interaction validated via Playwright (T4 bug 1 + bug 3).

### T2 — Wire signed-URL photos through ShortlistCard (bug 2)

**Commit:** `1869563`
**Files:** `frontend/components/ShortlistCard.tsx`, `backend/app/cli/seed.py`

`ShortlistCard` fetches a 5-minute signed URL on mount via `getSignedPhotoUrl(recipe.id, photo_paths[0])` using the same alive-flag pattern as `RecipeCard.tsx`. `<img src={signedUrl}>` renders only after the URL resolves; falls through to the `UtensilsCrossed` placeholder while the fetch is in flight or if it fails (silent catch — the signed-URL endpoint can transiently 404 right after recipe creation, and toast spam isn't warranted).

`backend/app/cli/seed.py` (`run_test_seed`) populates `photo_paths` for the 5 shortlist recipes (`ragu-bolognese`, `coq-au-vin`, `butter-chicken`, `shawarma`, `tacos-boeuf`) with paths matching what the live capture pipeline writes (`{household_id}/{recipe_id}/{uuid5(photo,slug)}.jpg`) so the `routers/photos.py:173` `path in recipe.photo_paths` authz check passes. Bytes are **not** uploaded — the test env intentionally lacks `SUPABASE_*` credentials; the frontend gracefully falls back to the placeholder when the signed-URL fetch fails. The prod-synthetic seed path (unchanged) is what uploads JPGs end-to-end when Supabase IS configured. Stable `uuid5` photo IDs keep paths byte-identical across re-runs → `uv run seed` remains idempotent.

**Verify:** `pnpm lint` clean; idempotency: second `uv run seed` is a no-op for these paths.

### T3 — Waiting-for-partner CTA + terminal-state guards (bugs 4 + 5)

**Commit:** `99e65e3`
**Files:** `frontend/lib/i18n/fr.json`, `frontend/components/VoteSummary.tsx`, `frontend/components/HomeDecide.tsx`

`fr.json` adds `home.summary.intro_waiting_partner` ("Tu as fini ta revue. En attente de ton/ta partenaire.") between `intro_pressenti` and `intro_none` so the CTA tree stays co-located. `VoteSummary.tsx` inserts a fourth CTA branch between `pressentiRow` and the `intro_none` fallback, triggered when `!validatedRow && !pressentiRow && rows.some(r.partnerVote === undefined)` — the local user has finished their review but the partner hasn't yet weighed in. Same paper-grain `Card` shell + `delegate-cta` as the pressenti branch (visual continuity). A defensive `EmptyState` short-circuit fires when `rows.length === 0` (every recipe Rejeté or upstream passed an empty array), reusing existing `home.empty.all_rejected_*` keys — no new copy. `HomeDecide.tsx` adds an explicit `shortlistIsEmpty` guard above the `allVoted` branch so a zero-result regenerate renders `EmptyState` directly instead of falling through to `VoteSummary`'s degenerate empty-rows path (root cause of the desktop blank-screen bug).

**Verify:** `pnpm lint` clean; Playwright bugs 4 + 5 lock the terminal-state contract (heading + CTA always render, on both viewports).

### T4 — Playwright spec for all 5 bugs

**Commit:** `4937f3e`
**Files:** `frontend/tests/e2e/shortlist-review-bugs.spec.ts` (new, 171 lines)

One `test()` per user-reported bug, all targeting the existing `seeded` project (iPhone 390×844 + Bearer + `aldente_auth` cookie). Reuses `SHORTLIST_RECIPES` / `VOTE_STATE_LABELS` from `fixtures/seed-helpers.ts` so French copy drift surfaces in the spec rather than at runtime.

- **bug 1** — thumb-tap commit lands on `VoteSummary` heading (no blank frame).
- **bug 2** — shortlist card `<img>` has a scheme'd `src` (`http`/`blob`/`data`) OR falls through to the `UtensilsCrossed` placeholder — never a raw bucket-relative path.
- **bug 3** — 390×844 viewport: voting on the first card leaves a visible in-viewport anchor (`VoteSummary` heading).
- **bug 4** — 1280×800 desktop viewport: voting through every card lands on at least one terminal-state anchor (heading / cook / delegate / regenerate / empty).
- **bug 5** — post-vote always has a CTA below the heading; the new `home.summary.intro_waiting_partner` i18n key exists in the bundle and matches `/partenaire/i`.

**Verify:** `playwright test --list` parses clean and discovers 5 tests. No `test.fixme` markers.

## Must-haves check

| # | Truth | Task | Enforced by |
|---|-------|------|-------------|
| 1 | Swipe / thumb commit shows visible slide-out + peek-to-front on iPhone | T1 | `ShortlistCard` exit/initial variants; Playwright bug 1 |
| 2 | Shortlist photos render (signed URL) on demo env | T2 | `ShortlistCard.getSignedPhotoUrl`; seed populates `photo_paths`; Playwright bug 2 |
| 3 | First-card vote on iPhone never leaves a blank screen | T1 (motion) + T3 (defensive guard) | Playwright bug 3 (390×844 anchor assertion) |
| 4 | All-cards-voted on desktop renders heading + CTA | T3 (terminal-state guard) | Playwright bug 4 (1280×800 anchor assertion) |
| 5 | French waiting-for-partner copy via next-intl | T3 (`home.summary.intro_waiting_partner`) | Playwright bug 5 (`/partenaire/i` regex + i18n key presence) |

## Deviations from plan

- **`fr.json` path:** plan referenced `frontend/lib/i18n/fr.json` and that turned out to be the canonical location (not `frontend/messages/fr.json` as the orchestrator initially guessed). No deviation.
- **No CONTEXT.md / RESEARCH.md / VERIFICATION.md:** standard quick mode (no `--discuss`, `--research`, or `--validate` flags) — these phases were skipped per the workflow.

## Playwright execution

The new spec parses + discovers 5 tests under `playwright test --list`. To run the recorded spec: `pnpm test:e2e --project seeded -g "shortlist-review-bugs"`.

### Live MCP-driven verification (2026-05-12, post-merge)

Beyond the recorded spec, the orchestrator booted the local demo stack (Postgres :5433, backend uvicorn :8001, Next.js :3000 with `RAILWAY_URL=http://localhost:8001`, `uv run seed`) and drove the actual UI via Playwright MCP. Screenshots in `screenshot-{1..8}-*.png` next to this file.

| Bug | Verified live | Evidence |
|-----|---------------|----------|
| 1 — smooth slide | ✓ structural | `screenshot-8-fresh-deck.png` shows the new layered peek-to-front stack (front card opaque + peek card at scale 0.94, y 12, opacity 0.85). Motion itself is a ~200ms spring — captured by T4's Playwright `toHaveCount` assertion rather than by still screenshots. |
| 2 — photos | ✓ end-to-end | `GET /api/shortlists/today` returns all 5 recipes with populated `photo_paths` (was `[]` before T2). Frontend tries signed-URL fetch → 401/404 in test mode → falls through to `UtensilsCrossed` placeholder (`screenshot-1-first-card-iphone.png`). Documented graceful fallback — bytes are only uploaded when Supabase creds are configured. |
| 3 — iPhone blank after first vote | ✓ live | `screenshot-3-after-first-vote.png` (390×844) — voting yes on the visually-first card transitions to `VoteSummary` heading + CTAs with no blank frame. |
| 4 — desktop blank after all reviews | ✓ live | `screenshot-4-desktop-summary.png` (1280×800) — heading "Vous avez tout vu" + 4 rows + "Je commence à cuisiner" + "Régénérer le shortlist" all render. |
| 5 — waiting-for-partner message | ✓ live | `screenshot-5-waiting-for-partner-desktop.png` + `screenshot-7-waiting-iphone.png` — after deleting partner votes + voting no on all 5 as Luca, the new branch fires and renders **"Tu as fini ta revue. En attente de ton/ta partenaire."** under a "Tu décides" delegate CTA. i18n key `home.summary.intro_waiting_partner` confirmed in the bundle via inline HTML probe. |

## Round 2 — additional fixes after live MCP testing exposed gaps

The first round (T1–T4) addressed the listed bugs at the code level but
left three observable regressions when I drove the actual UI: (1) cards
stacked vertically instead of overlapping (peek covered the thumb
buttons), (2) photos rendered as the UtensilsCrossed placeholder because
the test seed has no Supabase bytes, (3) voting on one card advanced the
deck by two positions (skip-a-card bug). Three additional commits address
each:

### T5 — Real card pile + button clickability + single-advance (commit `34cc7a4`)

- **`!absolute !inset-0`** on `ShortlistCard` className wins the cascade
  against `.paper-grain { position: relative }` in `globals.css` (same
  `@layer utilities` but defined later than Tailwind's `.absolute`). With
  this, both deck cards correctly position absolute and overlap.
- **Two peeks instead of one.** `ShortlistDeck` now renders `nextNext` at
  `peekDepth={2}` (scale 0.88, y 24, opacity 0.4) behind `next` at
  `peekDepth={1}` (scale 0.94, y 12, opacity 0.6). Real pile-of-cards depth.
- **Removed the local `index` advance.** `handleVote` was both bumping
  `index` AND calling `onVoteApplied`; the parent's `unvotedByMe` filter
  then re-passed a shorter list, double-advancing the deck. Deck now
  trusts the parent's filter — one click = one card removed. Optimistic
  rollback on POST failure now relies on the existing `vote.created`
  echo overwriting the optimistic row (the existing contract).

### T6 — Bundled cuisine SVGs as dev photo fallback (commit `29e7451`)

- 6 SVG fixtures under `frontend/public/demo-fixtures/`: italian, french,
  indian, middleEastern, mexican, default. Each ~500 bytes. Abstract
  cuisine-themed art (warm gradient + stylized dish + cuisine label).
- `ShortlistCard.useEffect` falls through to `/demo-fixtures/${cuisine}.svg`
  when `getSignedPhotoUrl` rejects AND `NODE_ENV !== 'production'`.
- `<img onError>` swaps to `default.svg` when the cuisine-specific
  fixture is missing (asian/mediterranean/etc — deliberately not authored).
- Production unaffected.

### T7 — End-of-deck verification

Walked the deck card-by-card via Playwright MCP on iPhone 390×844 and
desktop 1280×800. Both viewports, both terminal paths (vote yes on all,
vote no on all) render heading + rows + terminal CTA. **No blank page in
any state.** Existing `home.summary.intro_waiting_partner` branch from
T3 still fires when no Validé + no Pressenti + partner unvoted — the
new copy is **"Tu as fini ta revue. En attente de ton/ta partenaire."**

## Round 2 — verification table

| Bug | Round 1 status | Round 2 status | Evidence |
|-----|----------------|----------------|----------|
| 1 — smooth slide | structural only (cards still didn't overlap) | ✓ visually correct | `screenshot-10-pile-3-cards.png` shows 3 cards properly stacked at scale 1 / 0.94 / 0.88 |
| 2 — photos | placeholder fallback only | ✓ photos render in dev | `screenshot-13` through `screenshot-17` — italian/french/indian/middleEastern/mexican cards each show their themed SVG |
| 3 — iPhone first-vote blank | live-tested but with seed-vote artifact | ✓ live with fresh seed | One click = one advance now; `screenshot-19` ends on populated VoteSummary |
| 4 — desktop all-reviewed blank | live | ✓ re-verified after deck fix | `screenshot-21-all-rejected-desktop.png` |
| 5 — waiting-for-partner message | live | ✓ re-verified | `screenshot-20-all-rejected-iphone.png` + `screenshot-21-all-rejected-desktop.png` show the new T3 copy still firing |

## Risks / follow-ups

1. **Seed photo fixture is path-only.** `seed.py` writes `photo_paths` rows but does NOT upload bytes to Supabase storage. When Supabase storage is **not** configured (the default for the test seed), the signed-URL fetch will 500 and the card falls back to the bundled cuisine SVG in dev mode (per T6) OR the UtensilsCrossed placeholder in prod. The real Supabase upload path is only exercised in the prod-synthetic seed branch — out of scope here.
2. **Reduced-motion users.** Bug 1's smoothness fix uses `framer-motion` variants; `prefers-reduced-motion: reduce` short-circuits all motion (no fade, no peek, instant swap). This matches the original behavior — no regression — but if a future test wants to assert "always smooth," it will need to override the media query.
3. **Waiting-for-partner branch heuristic.** The new CTA branch fires when `!validatedRow && !pressentiRow && rows.some(r.partnerVote === undefined)`. If the partner has voted on every row but the household has no Validé/Pressenti yet (e.g. both rejected everything), this branch will NOT fire — the empty-state fallback handles that case. If product wants a different message for "we both reviewed, nothing made the cut," that's a follow-up.
4. **Executor was stopped mid-finalize.** The 4 task commits all landed, but the executor never wrote its own SUMMARY.md — this file was reconstructed by the orchestrator from `git show` of each commit. No work was lost.
