---
phase: 07-decide-polish
reviewed: 2026-05-08T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - frontend/app/globals.css
  - frontend/components/ColdStartChip.tsx
  - frontend/lib/motion.ts
  - frontend/components/ShortlistCard.tsx
  - frontend/components/VoteSummary.tsx
  - frontend/components/HomeDecide.tsx
findings:
  critical: 0
  warning: 0
  info: 4
  total: 4
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-05-08
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found (4 info, 0 warning, 0 critical)

## Summary

Phase 7 (Decide polish, Slow Food artisanal v0.2) re-themes the daily decision flow with a swipe deck, 5-state vote chips, delegation card, and cold-start chip. The implementation is correct, well-commented, and respects the documented invariants:

- ShortlistDeck.tsx remains at **141 LOC** (verified — invariant holds; no structural rewrite).
- Vote chips render at `h-8` as **read-only state indicators** — correctly excluded from the 48px D-08 tap-target floor (chips have no `onClick`, render as `<span>`s, contract documented inline at VoteSummary.tsx:50–57).
- `prefers-reduced-motion` is honored via the existing **global CSS clamp** (globals.css:378–385) plus `dragEnabled` short-circuit in ShortlistCard.tsx:103. No per-component override leaks.
- ColdStartChip dismiss button is `h-12 w-12` (DECIDE-05 W4 tap-target gap closed correctly).
- All `useTranslations()` keys verified against `frontend/lib/i18n/fr.json`. **Zero new keys** introduced — `home.shortlist.*`, `home.summary.*`, `home.cold_start.body`, `vote.state.*`, `common.close`, `vote_yes_aria`, `vote_no_aria`, `partner_*_aria`, `toast_*` all pre-exist.
- Motion tokens in `lib/motion.ts` correctly mirror the CSS `--ease-craft` / `--duration-*` triple; `springSnap` is the single new Phase 7 transition and matches 07-UI-SPEC §"Swipe Deck Physics".
- DECIDE-03 token reconciliation comment at globals.css:72 ("CANONICAL — DO NOT introduce `--color-validé-tint`") is in place and load-bearing.

No bugs, no security issues, no critical or warning-class quality issues. Four info-level observations follow.

## Info

### IN-01: Non-ASCII identifier `validéToastedFor` in HomeDecide.tsx

**File:** `frontend/components/HomeDecide.tsx:71, 186, 192`
**Issue:** The `useRef` tracking which recipes have already triggered the Pressenti→Validé celebration toast is named `validéToastedFor` — note the `é` (U+00E9) in the identifier. JS/TS permits non-ASCII identifiers, but the rest of the codebase consistently uses ASCII for identifiers (e.g., `validatedRow` on line 108 of VoteSummary.tsx, `valide` enum value, `bg-valide-tint` token). This breaks `grep "valide"` searches, can confuse some toolchains and search/replace flows, and is inconsistent with the file-local convention. Note that the *i18n key* `toast_validé` (fr.json line 33) is fine — accented characters in user-facing French strings are expected — but JS identifiers should stay ASCII.
**Fix:**
```ts
// Line 71
const valideToastedFor = useRef<Set<string>>(new Set());

// Line 186
!valideToastedFor.current.has(payload.recipe_id)

// Line 192
valideToastedFor.current.add(payload.recipe_id);
```

### IN-02: Inconsistent Tailwind syntax for `--color-valide-tint` token in VoteSummary.tsx

**File:** `frontend/components/VoteSummary.tsx:60, 74`
**Issue:** Two different syntaxes reach the same Phase 3 emerald token within the same file:
- Line 60 (chipClass for `valide`): `bg-[var(--color-valide-tint)]` — arbitrary-value escape.
- Line 74 (rowBgClass for `valide`): `bg-valide-tint` — Tailwind utility resolved through `@theme` mapping in globals.css:73.

Both paths work because globals.css declares `--color-valide-tint: var(--valide-tint);` inside `@theme inline`, which lets Tailwind v4 mint a `bg-valide-tint` utility. The arbitrary-value form is redundant and slightly heavier on the rendered class string. Pick one — `bg-valide-tint` is cleaner and matches the file's other usage one function down.
**Fix:**
```ts
// Line 60
case "valide":
  return `${base} bg-valide-tint text-foreground border border-emerald-500/30`;
```

### IN-03: Dead `partner` guard in vote-drift-detection block

**File:** `frontend/components/HomeDecide.tsx:153`
**Issue:** The drift-detection block reads `if (me && partner)` but `partner` is never referenced inside the block — only `me` is used (implicitly via `payload.member_id !== me.id` is checked separately in the celebration block, but not here either). The drift check operates purely on `shortlist.votes` + `payload`. The `partner` half of the guard is dead.

This isn't a bug — the block executes correctly when both are present — but it's a misleading guard that suggests `partner` is required for drift detection when only `me` would be (and arguably even `me` isn't strictly required for the `console.warn`).
**Fix:**
```ts
// Line 153 — drop the partner half of the guard
if (me) {
  const recipeVotes = [...];
  const local = computeVoteState(recipeVotes, MEMBER_COUNT);
  if (local !== payload.state) {
    console.warn("vote-state drift: local=%s server=%s", local, payload.state);
  }
}
```

### IN-04: Unused `useTranslations` namespace in ShortlistCard front-card body

**File:** `frontend/components/ShortlistCard.tsx:74`
**Issue:** `const t = useTranslations("home.shortlist");` is declared at the top of `ShortlistCard` (line 74) and used only for the partner-aria string at line 115. The hook subscribes the component to next-intl's locale context on every render, which is fine — but the front-card / peek-card rendering of cuisine/mood/prep-time at lines 189–201 displays raw enum strings (`{cuisine}`, `{m}` from `moods`) rather than translating them. Per the project invariant ("All user-facing strings go through `next-intl` from day 1 — hardcoded strings are productize-later debt to avoid"), enum labels for Cuisine and Mood should eventually flow through `vote.state`-style namespaces.

This is **not a v0.1 regression** — it's pre-existing behavior carried forward from Phase 3 and likely tracked elsewhere. Flagging for visibility because it falls under the same i18n invariant explicitly cited in this phase's context. Mark as `// TODO(productize)` if formalizing.
**Fix:**
```tsx
// Add a localized lookup:
const tCuisine = useTranslations("recipe.cuisine");
const tMood = useTranslations("recipe.mood");

// ...
{cuisine && <Badge variant="secondary">{tCuisine(cuisine)}</Badge>}
{moods.map((m) => (
  <Badge key={m} variant="secondary">{tMood(m)}</Badge>
))}
```

(Only land this once the corresponding i18n keys exist — do not add new keys for Phase 7 per the no-new-keys constraint.)

---

_Reviewed: 2026-05-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
