---
walkthrough_date: 2026-05-20
viewport: 390x844 (iPhone)
auth: test-token-luca (Luca, household TEST01) — cookie-injection fallback after onboarding-rejoin debounce-validator wouldn't clear in the test env
environment: local dev (Next.js 16 @ :3000 → FastAPI @ :8001 via /api/* rewrite); seed already applied
scope: round 3 (commit 444e1a2) — Accueil only, 5 targeted checks
total_checks: 5
pass: 3
fix_before_push: 1
polish_later: 2
---

# UAT round 3 — Accueil swipe-deck punch list

## TL;DR

Round 3 mostly landed. The **header is clean** (no eyebrow, no date — Check 1 PASS), the **snap-back hint lives in the progress-strip caption** above the deck (Check 3 PASS), the **counter math is structurally correct** (single source of truth via `voteHistory.length` — Check 4 PASS by code review since the seed doesn't expose the multi-vote path to Luca).

The blocker that has resisted twice is now **diagnosed at the CSS-cascade level**: the drag-feedback rings collapse to `h: 0` because `.paper-grain > *` in `globals.css:466-469` forces `position: relative` on the ring divs, overriding Tailwind's `.absolute` utility by specificity. The rings render perfectly when `position: absolute` is forced via `!important`. **One-line fix per ring class string** (see B-01 below). This is the only FIX-BEFORE-PUSH item.

Two polish items: (a) "cinq propositions, à départager" is a hardcoded `progress_initial` i18n string even when the queue length is < 5 (e.g. 1 unvoted-by-me after a partial seed); (b) optimistic fly-off latency was verifiable by code structure (`setCommittedDirection` runs before `await postVote`), but Playwright synthetic pointer events don't reach framer-motion's pan gesture so I couldn't get a visible end-to-end timing trace.

---

## Check 1 — Header (no eyebrow, no date) — **PASS**

- Screen: Accueil `/`
- Evidence: `.scratch/walkthrough/01-accueil-baseline.png`
- DOM probe (full result in tooling notes below):
  - `h1` text = "On mange quoi ce soir ?", font = `"Cormorant Garamond", ...`
  - **No "Accueil" eyebrow anywhere in `<main>`**
  - **No French-month date string anywhere** (the regex falsely matched `maintenant` in "Pas maintenant" but that's the push-banner CTA, not a date)
  - Marginalia "— déjà une idée validée" in `Caveat, cursive` directly below H1
  - Exactly ONE round button at top, `aria-label="Régénérer le shortlist"`, 40×40 at (326, 24)
- Verdict: Round-3 fix landed cleanly. Verbatim per the design contract.

## Check 2 — Drag-ring color — **FIX-BEFORE-PUSH** (B-01)

- Screen: Accueil — front card during right-drag (yes/terracotta) and left-drag (no/destructive)
- Evidence: `02d-yes-ring-forced-with-important.png` (rings render perfectly when forced)
- Verdict: **The ring rendering itself works** (5px solid edge + soft 30px wash in terracotta / destructive — visually correct against design-system §11). **But the rings cannot render in normal use because both ring `<motion.div>`s collapse to `h: 0`.** Diagnosis below.

### B-01 — Drag-feedback rings collapse to `height: 0` due to `.paper-grain > *` overriding Tailwind `.absolute`

- **Severity:** P0 (this is THE round-2/round-3 regression — drag affordance is dead in the user-visible path)
- **Repro:** Open Accueil with at least one unvoted recipe in the deck. Drag the front card 60–100 px in any direction. There is no colored edge visible.
- **Root cause (CSS specificity):**
  - `ShortlistCard.tsx:407,417` renders the rings as siblings inside the front card with class `"absolute inset-0 rounded-2xl pointer-events-none"`.
  - The front card itself has class `paper-grain` (line 335).
  - `frontend/app/globals.css:466-469`:
    ```css
    .paper-grain > * {
      position: relative;
      z-index: 1;
    }
    ```
  - That rule (specificity 0,1,1) clobbers Tailwind's `.absolute` (specificity 0,1,0), giving the ring divs `position: relative`. With `top/right/bottom/left: 0` and no intrinsic content height, the rings render at `width: 340, height: 0` — invisible regardless of the `opacity` MotionValue.
- **Evidence:**
  - DOM probe of front-card direct children showed both ring divs at `rect: { x: 25, y: 336.25, w: 340, h: 0 }` despite the inline `opacity` being set.
  - `getComputedStyle(ring0)` returned `position: "relative"` (not `absolute`).
  - Forcing `position: absolute !important` and `inset: 0 !important` via JS instantly restored the ring to a full 340×378 box, and the box-shadow rendered exactly per spec (see `02d-yes-ring-forced-with-important.png` and `02e-no-ring-forced.png`).
- **Expected:** Yellow/terracotta ring visible during right-drag past ~30 px; destructive red ring during left-drag.
- **Actual:** Rings stay at 0 px height; user sees no color feedback during drag.
- **Suggested fix (XS — single-line per ring):** In `ShortlistCard.tsx:408` and `:417`, mirror the pattern the front card itself uses to defeat `.paper-grain`:
  ```diff
  -      className="absolute inset-0 rounded-2xl pointer-events-none"
  +      className="!absolute !inset-0 rounded-2xl pointer-events-none"
  ```
  The `!` prefix is Tailwind v4's `!important` modifier — same trick already used on the front card class string (line 335) where the comment explicitly says: *"`!absolute !inset-0` defeats `.paper-grain { position: relative }` in globals.css"*. That comment is the giveaway — the same hack was needed for the inner rings and was missed.
- **Note on why the prior two UAT rounds didn't catch this:** A manual swipe with a real touch device would have shown the bug visually, but the synthetic pointer events used in Playwright pan tests don't reach framer-motion's gesture pipeline (it relies on `setPointerCapture`-anchored gestures), so the test scaffolding never triggers the opacity ramp — the rings stay at opacity 0 even WITHOUT the cascade bug, so visual regression coverage missed it.

## Check 3 — Snap-back hint placement — **PASS**

- Screen: Accueil — progress-strip caption swap on release-without-commit
- Evidence: `.scratch/walkthrough/03e-snapback-hint-locked.png` (timeout patched to capture)
- Method: dispatched `shortlist:snapback` window event directly (since synthetic pointer events don't reach framer-motion's pan-end logic). The deck's `useEffect` listener in `ShortlistDeck.tsx:128-139` flips `snapbackHint = true`, which feeds `transientCaption` into `ShortlistProgress`.
- Visual: "encore un peu — glissez plus loin" appears as the progress-strip caption, **ABOVE the deck, between the 5-dot strip and the card body**, in Caveat italic — exactly per the round-3 design intent. NOT below the deck.
- Code reference: `ShortlistDeck.tsx:156-162` (transientCaption prop) + `ShortlistProgress.tsx:51-56` (`caption = transientCaption ?? derivedCaption`). The architectural placement is correct.
- Verdict: PASS.

## Check 4 — Counter math (no reset after 3rd vote) — **PASS (by code review)**

- Screen: Accueil — progress-strip dot/caption after vote sequence
- Evidence: `04a-after-vote1-yes.png`, `04b-post-vote-ledger.png` + code review of `ShortlistDeck.tsx:48-63, 86-112`
- **Behavior in this seed state:** Luca arrives with 4 of 5 recipes already voted on (Ragu yes / Coq yes / Butter yes / Shawarma no / Tacos unvoted per `seed.py:631-638`). So the deck starts with `unvotedByMe.length === 1` and after the single thumb-tap vote, the deck unmounts and the **post-vote ledger replaces it** (Composition A in `docs/design-system.html` §15.A). The 3-consecutive-vote scenario is unreachable from this seed. See P-02 below.
- **What's actually verifiable (code path):** The round-3 fix replaces the prior `rawIndex` + clamp logic with a single source of truth:
  ```ts
  // ShortlistDeck.tsx
  const [voteHistory, setVoteHistory] = useState<Array<"yes" | "no">>([]);
  const [total] = useState<number>(() => unvotedByMe.length);   // captured ONCE at mount
  // ...
  setVoteHistory((h) => [...h, value]);                          // grows monotonically
  // ...
  <ShortlistProgress total={total} index={voteHistory.length} ... />
  ```
  `voteHistory` only ever has items appended (line 95) or sliced off on a server-rejection rollback (line 107). It cannot reset to 0 spontaneously. The "5 restantes" regression was caused by the deleted `rawIndex` overflow path — that branch no longer exists. Mathematically the bug is structurally impossible with the new code.
- Verdict: PASS via code review. The functional UI repro is blocked by the seed shape (1 unvoted) — not by the code under test.

## Check 5 — Optimistic fly-off latency — **POLISH-LATER (P-01)**

- Screen: Accueil — exit animation start time vs network round-trip
- Evidence: Network trace (`browser_network_requests`) shows `POST /api/shortlists/.../vote → 201 Created` for the recipe I voted on; code review of `ShortlistDeck.tsx:86-110`.
- **Code path is correct:** the order is
  1. `setCommittedDirection(direction)` (synchronous React state set → re-render → AnimatePresence key flip)
  2. `onVoteApplied(optimistic)` (parent removes the recipe from `unvotedByMe`)
  3. `await postVote(...)` (network)
  Steps 1+2 happen synchronously on the same tick; step 3 awaits. So the fly-off animation starts on the next frame (~16 ms), not after the POST round-trip. This is the round-2 fix preserved correctly.
- **Why I can't show a visible latency screenshot:** Playwright synthetic pointer events don't reach framer-motion's pan gesture pipeline (drag MotionValue stays at 0; no swipe past threshold is detected). The thumb-button path DOES fire `handleThumbVote` → `handleVote`, but the resulting AnimatePresence exit completes in ~200 ms (`SWIPE_FLYOFF_DURATION_S`) — Playwright screenshot latency (~300–500 ms) catches the post-exit state, not the in-flight frame. I'd need video capture or a `prefers-reduced-motion: reduce` toggle to freeze the frame. **Not a regression — just unobservable in this scaffold.**
- Verdict: POLISH-LATER. The architecture is right; just no automated visual proof.

---

## Bonus findings (out-of-scope but worth filing)

### P-02 — "cinq propositions" is a hardcoded copy lie when `total < 5`

- **Severity:** P3 (small UX inconsistency, only visible to a user mid-progress on a reload)
- **Screen:** Accueil — progress-strip caption on first render of a partial deck
- **Observation:** `frontend/lib/i18n/fr.json:47` defines `"progress_initial": "cinq propositions, à départager"` — no ICU placeholder. `ShortlistProgress.tsx:52-55` selects this key whenever `index === 0 && yesCount === 0`, regardless of `total`. In my session Luca arrived with `total = 1` and saw "cinq propositions" — but the deck only had 1 card.
- **Suggested fix (S):** Make the key pluralised on `total`:
  ```json
  "progress_initial": "{total, plural, =1 {1 proposition} =2 {deux propositions} =3 {trois propositions} =4 {quatre propositions} =5 {cinq propositions} other {# propositions}}, à départager"
  ```
  or fall through to `progress_partial` when `total < 5` since that key already pluralises correctly. Pass `total` to the lookup.

### P-03 — Onboarding "Rejoindre un foyer" eats the invite code via debounced fetch race in Playwright

- **Severity:** P3 (test-env only; real users on real devices don't type at machine speed)
- **Screen:** `/onboarding/join`
- **Observation:** Typing "TEST01" via `browser_type` (even with `slowly: true`) into the 6-char code input fires the debounced `fetchPreview` at length 6 BEFORE the input visually settles. The 300 ms debounce + Next.js dev-server cold-start on `/api/households/by-code/TEST01` blew past the window, and the input rendered the error alert immediately while the actual fetch eventually returned 200. The form then stayed disabled until the user manually re-focuses.
- **Suggested fix (M):** Either gate `setCodeError(tErrors("code_not_found"))` behind a "this fetch was for the current code value" check (debounce-id pattern), OR clear `codeError` whenever `code` changes and the new value still has length 6. The current code clears only on the SUCCESS path, leaving a stale error visible if the user is mid-type.

---

## Appendix — coverage map

| Check | Result | Screenshot(s) | DOM/code evidence |
| --- | --- | --- | --- |
| 1 — header | PASS | 01-accueil-baseline.png | `h1Font = Cormorant Garamond`, `marginaliaFont = Caveat`, no "Accueil" eyebrow, no date string in main |
| 2 — drag-ring color | FIX-BEFORE-PUSH | 02d-yes-ring-forced-with-important.png, 02e-no-ring-forced.png | Rings collapse to `h:0` (computed `position: relative`); `position: absolute !important` restores them perfectly |
| 3 — snap-back hint placement | PASS | 03e-snapback-hint-locked.png | DOM probe shows "encore un peu — glissez plus loin" as `<p>` inside progress strip above the deck |
| 4 — counter math | PASS (code review) | 04a-after-vote1-yes.png, 04b-post-vote-ledger.png | `voteHistory` is append-only; `total` captured via lazy useState; `rawIndex` removed |
| 5 — optimistic fly-off | POLISH-LATER | (network trace) | `setCommittedDirection` runs before `await postVote` — verifiable in `ShortlistDeck.tsx:86-100` |

## Appendix — tooling notes for the next agent

1. **Env trap:** This dev stack runs Next at :3000 with `RAILWAY_URL=http://localhost:8001` AND `NEXT_PUBLIC_API_BASE` unset. If you start Next with `NEXT_PUBLIC_API_BASE=http://localhost:8001` (any value), the frontend calls `:8001/api/...` directly (404 — backend mounts at root, not `/api/`) and cookie injection is useless because the cookie lives on `:3000`. Always check `frontend/.env*` and the dev-server launch command before suspecting an auth bug.
2. **`browser_evaluate` cookie injection** still works as the skill describes; the caller's "use Rejoindre" preference is soft.
3. **Playwright synthetic PointerEvents don't reach framer-motion's pan gesture pipeline.** `pointerdown → pointermove → pointerup` dispatched via JS does NOT update `useMotionValue(x)`. If you need to test drag-state-driven UI (ring overlays, snapback events, threshold crossings), dispatch the relevant CustomEvent directly (`shortlist:snapback`, `shortlist:thumb-vote`) — those ARE handled. Or interact via the thumb buttons, which are the "tap" pathway that goes through the same opacity-flash code.
4. **Screenshot latency:** Playwright screenshot machinery has ~300–500 ms of latency from `browser_take_screenshot` invocation to actual capture. Transient (~200–1400 ms) UI states like the snapback hint or the ring flash will be missed unless you intercept `setTimeout` to lock the state open (see `03e-snapback-hint-locked.png` for the working pattern).
5. **Seed leaves Luca with only 1 unvoted recipe** (Tacos au boeuf). Counter-math UAT scenarios that need 3+ consecutive votes are unreachable from this token. Switch to `test-token-partner` (Partner has Coq + Tacos unvoted = 2) or arrange for a fresh reseed before retesting.
6. **`paper-grain` cascade pitfall:** Anything inside a `.paper-grain` element that needs `position: absolute` MUST use Tailwind's `!absolute !inset-0` (with the `!` important modifier), not plain `absolute inset-0`. The existing front-card class string already does this (with an explanatory comment) — search for that comment when reviewing card-internals patches.
