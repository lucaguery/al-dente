---
phase: 03
plan: 03
subsystem: frontend-decide-foundation
tags: [frontend, framer-motion, swipe-deck, components, i18n, contracts]
requires:
  - 03-01 (services/voting.py compute_vote_state — branch order is mirrored client-side)
provides:
  - frontend/lib/swipe-tokens.ts (locked motion thresholds)
  - frontend/lib/votes.ts (VoteValue/VoteState types, postVote, delegateShortlist, computeVoteState mirror)
  - frontend/lib/shortlist.ts (fetchTodayShortlist, regenerateShortlist, ShortlistResponse, ShortlistFilters)
  - frontend/lib/cooking.ts (postStartCooking, getActiveCookingLog, CookingLogResponse)
  - frontend/components/ShortlistCard.tsx (drag-x card + ShortlistThumbButtons)
  - frontend/components/VoteSummary.tsx ("Tout vu" summary with computed states)
  - frontend/components/ColdStartChip.tsx (dismissible info chip, sessionStorage flag)
  - frontend/components/RegenerateSheet.tsx (filter form bottom sheet)
  - 25 new i18n keys under home.shortlist / home.summary / home.cooking_banner / home.push / home.cold_start / home.filters / home.empty / home.finalize_stub / vote.state / common.close
affects:
  - frontend/package.json (added framer-motion@^12.38.0)
  - frontend/package-lock.json (regenerated)
  - frontend/lib/i18n/fr.json (extended with Phase 3 namespaces; no existing keys removed)
tech-stack:
  added:
    - framer-motion@^12.38.0 (swipe-deck UX — used only on the front shortlist card)
  patterns:
    - "Frontend mirror of backend pure functions (compute_vote_state) with runtime self-check that throws on bundle if branch order drifts (architecture invariant #2 + 03-RESEARCH.md Pattern 10)"
    - "Pure prop-driven components — no global state, no app/page.tsx wiring (Plan 04 owns integration)"
    - "Sentinel string values for Radix Select 'any/none' options (Radix forbids empty-string SelectItem values)"
    - "sessionStorage dismiss flag pattern for one-shot per-session UI hints (graceful degrade in private-mode Safari via try/catch)"
    - "useMotionValue + useTransform for drag-x rotation (-15..15deg) and yes/no overlay opacity (0..1) tied to drag x"
    - "prefers-reduced-motion gates drag={false} + no rotation + no overlays — thumb buttons remain functional"
key-files:
  created:
    - frontend/lib/swipe-tokens.ts
    - frontend/lib/votes.ts
    - frontend/lib/shortlist.ts
    - frontend/lib/cooking.ts
    - frontend/components/ShortlistCard.tsx
    - frontend/components/VoteSummary.tsx
    - frontend/components/ColdStartChip.tsx
    - frontend/components/RegenerateSheet.tsx
  modified:
    - frontend/package.json
    - frontend/package-lock.json
    - frontend/lib/i18n/fr.json
decisions:
  - "computeVoteState branch order is locked to backend services/voting.py compute_vote_state — runtime self-check fires in non-production builds and console.errors on drift"
  - "Used sentinel string values (__any__, __none__) inside RegenerateSheet for the 'Toutes' / 'Aucune' Select options — Radix Select forbids empty-string SelectItem values; these sentinels are translated to 'omit key from filters payload' at the apply boundary"
  - "ShortlistThumbButtons exported as a sibling component (not a child of the card) — D-03: the thumb-button vote pathway is equally first-class with swipe; Plan 04 will render them under the deck container, not inside any individual card"
  - "ColdStartChip uses sessionStorage (not localStorage) — chip should re-appear at the next session per UI-SPEC §Surface 2. Plan-level note: implementation-notes section of 03-UI-SPEC said 'localStorage' as one option, but the locked surface 2 spec said 'localStorage flag per session' which is sessionStorage semantics; we picked sessionStorage so dismiss is per session (per browser-tab close)"
  - "img tag in ShortlistCard uses a raw <img> with eslint-disable next-line — photo_paths are bucket-relative storage paths and Plan 04 will wrap them in a signed-URL component. Direct rendering is a placeholder behavior, not a final state"
  - "bg-validé-tint and bg-surface-rose-50 are referenced as Tailwind v4 utilities; bg-surface-rose-50 already exists in globals.css; bg-validé-tint will be added by Plan 04 (planner accepted that Tailwind v4 tolerates the unknown utility until then)"
metrics:
  duration: ~25 min
  completed: 2026-05-07
  tasks: 2
  files_created: 8
  files_modified: 3
  commits: 2
---

# Phase 3 Plan 3: Frontend Decide Foundation Summary

Locked the frontend↔backend wire shapes for Phase 3 — installed framer-motion, shipped four typed API client modules, four pure UI components, and 25 locked French i18n strings — so Plan 04 can `import { fetchTodayShortlist, postVote, computeVoteState, ShortlistCard, VoteSummary, ColdStartChip, RegenerateSheet } from "@/..."` and wire end-to-end behavior with zero ambiguity.

## What Was Built

### Lib modules (4 files, 4 contracts)

- **`frontend/lib/swipe-tokens.ts`** — locked motion thresholds (`SWIPE_THRESHOLD_PX=100`, `SWIPE_VELOCITY_PX_S=500`, `SWIPE_FLY_OFFSCREEN_FACTOR=1.4`, `SWIPE_ROTATE_RANGE_DEG=15`, `SWIPE_OVERLAY_INPUT_PX=100`, `SWIPE_SPRING`, `SWIPE_FLYOFF_DURATION_S=0.2`). Pinned per 03-UI-SPEC §Design System; planner does not pick alternatives.

- **`frontend/lib/votes.ts`** — exports:
  - `VoteValue` = `"yes" | "no"`
  - `VoteState` = `"valide" | "pressenti" | "conteste" | "rejete" | "sans_avis"`
  - `ShortlistVote = { shortlist_id, recipe_id, member_id, vote }`
  - `computeVoteState(votes, memberCount=2)` — frontend mirror of backend `services/voting.py::compute_vote_state` with locked branch order: `valide → rejete → conteste → pressenti → sans_avis`
  - `postVote(shortlistId, recipeId, vote)` → `POST /api/shortlists/{shortlistId}/recipes/{recipeId}/vote`
  - `delegateShortlist(shortlistId)` → `POST /api/shortlists/{shortlistId}/delegate`
  - `_selfCheck()` runtime drift detector that throws on bundle-time if branch order ever changes (logs via console.error in non-production builds; the bundle keeps shipping but devs see the error)

- **`frontend/lib/shortlist.ts`** — exports:
  - `ShortlistFilters = { cuisine?, max_prep_time?, exclude_protein?, required_moods? }`
  - `ShortlistResponse = { shortlist_id, date, generation, recipes, votes }`
  - `fetchTodayShortlist()` → `GET /api/shortlists/today` (returns `null` if no row)
  - `regenerateShortlist(filters?)` → `POST /api/shortlists/regenerate` with optional filters

- **`frontend/lib/cooking.ts`** — exports:
  - `CookingLogResponse = { id, recipe_id, household_id, cooked_by_member_id, cooked_at, rating, notes }`
  - `postStartCooking(recipeId)` → `POST /api/recipes/{recipeId}/cook`
  - `getActiveCookingLog()` → `GET /api/cooking-logs/active`

### Components (4 files, 5 exports)

- **`frontend/components/ShortlistCard.tsx`** exports `ShortlistCard` and `ShortlistThumbButtons`:
  - `ShortlistCard` props: `{ recipe, partnerVote: 'yes'|'no'|'unvoted', partnerName, partnerColorHex, onVote, isFront }`
  - Front card: `motion.div drag="x" dragSnapToOrigin dragConstraints={{left:0,right:0}}` with `useMotionValue(0)` for x, `useTransform` for rotation (−15°..+15°) and yes/no overlay opacity (0..1)
  - `onDragEnd` commits a vote when `|offset.x| > 100` OR `|velocity.x| > 500`
  - Peek card (when `isFront=false`): `scale-[0.94] translate-y-3 opacity-60 pointer-events-none`, no drag, no overlays
  - `prefers-reduced-motion: reduce` → drag disabled, no rotation, no overlay icons; thumb buttons remain the only vote pathway (D-03)
  - Partner-vote dot at bottom-right with `aria-label` interpolated via next-intl
  - `ShortlistThumbButtons` props: `{ onVote, disabled? }` — sibling-rendered under the deck container by Plan 04

- **`frontend/components/VoteSummary.tsx`** exports `VoteSummary`, `VoteSummaryMember`, `VoteSummaryProps`:
  - Computes per-recipe state via `computeVoteState` from rows in `votes`
  - **Filters out `rejete` rows** (D-06 — never rendered)
  - CTA logic tree per §Surface 8:
    - Has Validé → "Tu commences ?" + recipe title + `Je commence à cuisiner` (h-14, primary)
    - Else has Pressenti → intro_pressenti + `Tu décides` (primary)
    - Else (all Contesté/Sans avis) → intro_none + `Tu décides` (primary)
    - Always: `Régénérer le shortlist` ghost button at the bottom (h-11)
  - Validé rows tinted `bg-validé-tint border-emerald-500/30`; member dots per row use `MemberDot` for "yes" votes, grey/destructive for unvoted/no

- **`frontend/components/ColdStartChip.tsx`** exports `ColdStartChip`:
  - Dismissible info chip at `mx-6 mt-4 ... bg-surface-rose-50`
  - sessionStorage flag `dismissed_cold_start_chip = "1"`; SSR-safe default of `true` (renders nothing) until effect reads sessionStorage
  - Graceful try/catch around sessionStorage (private-mode Safari can throw)

- **`frontend/components/RegenerateSheet.tsx`** exports `RegenerateSheet`, `RegenerateSheetProps`:
  - Bottom Sheet (`max-h-[80svh] overflow-y-auto`) with: cuisine Select, max-prep Input (number), exclude-protein Select, required-moods chip-toggle row (mood Buttons with `aria-pressed`)
  - Sentinel values `__any__` / `__none__` for the "Toutes" / "Aucune" Select options (Radix forbids empty-string)
  - `handleApply` translates sentinels → omit-key-from-payload, only sends keys with user-set filters
  - Reset button clears all four fields

### i18n keys (25 new keys + 1 added to common)

Inside the existing `home` namespace:
- `home.shortlist.*` — `empty_heading`, `empty_body`, `empty_cta`, `vote_yes_aria`, `vote_no_aria`, `partner_unvoted_aria`, `partner_yes_aria`, `partner_no_aria`, `vote_failed`, `vote_offline`, `toast_validé`, `toast_arrived`
- `home.summary.*` — `heading`, `intro_validated`, `intro_pressenti`, `intro_none`, `cook_cta`, `delegate_cta`, `delegate_helper`, `regenerate_cta`, `delegate_failed`, `regenerate_failed`, `cook_failed`, `toast_delegated`, `toast_cooking_started`
- `home.cooking_banner.*` — `title`, `finalize`, `skip`
- `home.push.*` — `heading`, `body`, `activate`, `later`, `permission_denied`, `subscribe_failed`, `toast_activated`
- `home.cold_start.body`
- `home.filters.*` — `title`, `intro`, `cuisine_label`, `cuisine_any`, `max_prep_time_label`, `max_prep_time_placeholder`, `exclude_protein_label`, `exclude_protein_none`, `required_moods_label`, `apply`, `reset`
- `home.empty.*` — `no_match_heading`, `no_match_body`, `no_match_reset`, `all_rejected_heading`, `all_rejected_body`
- `home.finalize_stub.*` — `heading`, `body`

Top-level:
- `vote.state.*` — `valide`, `pressenti`, `conteste`, `rejete`, `sans_avis` (locked French copy: Validé / Pressenti / Contesté / Rejeté / Sans avis)

Added to existing `common`:
- `common.close = "Fermer"`

All copy locked per 03-UI-SPEC §Copywriting Contract.

### Dependency change

`frontend/package.json`: added `"framer-motion": "^12.38.0"` (resolved version), regenerated `package-lock.json`. Used the legacy `framer-motion` import path (not `motion/react`) per 03-RESEARCH.md Pitfall 3.

## Verification Performed

- `npm install framer-motion@^12` — succeeded, resolves to `12.38.0`
- `node -e` JSON.parse on fr.json + walks every required Phase 3 i18n key path — exits 0 with `i18n OK`
- `node -e` on package.json checks `dependencies['framer-motion']` exists — exits 0 with `framer-motion: ^12.38.0`
- `npx tsc --noEmit` — exits 0, zero errors anywhere in the project
- `grep -E '"valide"|"pressenti"|"conteste"|"rejete"|"sans_avis"' frontend/lib/votes.ts | wc -l` returns 15 (all 5 states present)
- `perl -0777` multi-line regex match for `valide.*pressenti.*conteste.*rejete.*sans_avis` in `lib/votes.ts` returns MATCH (branch order locked)
- All Task 2 acceptance criteria grep counts match expected values:
  - `export function ShortlistCard`: 1
  - `export function ShortlistThumbButtons`: 1
  - `useMotionValue`: 2 (import + call)
  - `useTransform`: 4 (import + 3 calls: rotate, yesOpacity, noOpacity)
  - `prefers-reduced-motion`: 1
  - `drag={dragEnabled`: 1
  - `export function VoteSummary`: 1
  - `computeVoteState`: 2 (import + call)
  - `state !== "rejete"`: 1 (D-06 filter)
  - `home.summary`: 1 (string in code) — actually multiple via `useTranslations("home.summary")`
  - `bg-validé-tint`: 1
  - `export function ColdStartChip`: 1
  - `sessionStorage`: 4 (default check + getItem + setItem + comment)
  - `export function RegenerateSheet`: 1
  - `aria-pressed`: 1 (mood chip toggle)
  - `max_prep_time|exclude_protein|required_moods|cuisine` matches: 17 (well over 4)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Radix Select forbids empty-string SelectItem values**

- **Found during:** Task 2 — RegenerateSheet
- **Issue:** The plan's exact body for `RegenerateSheet.tsx` includes `<SelectItem value="">{t("cuisine_any")}</SelectItem>` and `<SelectItem value="">{t("exclude_protein_none")}</SelectItem>`. Radix UI `Select.Item` throws at runtime if `value=""` because it reserves the empty string for placeholder/clear semantics.
- **Fix:** Introduced sentinel constants `ANY_CUISINE = "__any__"` and `NO_PROTEIN_EXCLUDE = "__none__"`. State defaults are these sentinels; `handleApply` translates them to "omit key from filters payload" (`if (cuisine && cuisine !== ANY_CUISINE) filters.cuisine = cuisine`). The `Reset` button restores sentinels (not empty strings). The translated French labels `t("cuisine_any")` / `t("exclude_protein_none")` are unchanged for users.
- **Files modified:** `frontend/components/RegenerateSheet.tsx`
- **Commit:** f88a4bd

**2. [Rule 1 — Bug] Removed unused local `handleThumbVote` in ShortlistCard**

- **Found during:** Task 2 — ShortlistCard
- **Issue:** The plan's exact body declared `function handleThumbVote(value: VoteValue) { onVote(value); }` inside `ShortlistCard` but never used it (the comment explicitly says "thumb buttons sit OUTSIDE the card"). TypeScript strict mode treats this as `noUnusedLocals` and the file would not compile.
- **Fix:** Removed the unused inner function; documented in the JSX comment that `ShortlistThumbButtons` (exported sibling) is the thumb-button surface. No behavior change — `onVote` flows the same way.
- **Files modified:** `frontend/components/ShortlistCard.tsx`
- **Commit:** f88a4bd

**3. [Rule 1 — Bug] Removed unused token imports in ShortlistCard**

- **Found during:** Task 2 — ShortlistCard
- **Issue:** The plan's import list included `SWIPE_FLY_OFFSCREEN_FACTOR` and `SWIPE_FLYOFF_DURATION_S` but these were never referenced in the function body (they belong to Plan 04's deck container that animates the fly-off post-vote). Strict TypeScript flagged them as unused imports.
- **Fix:** Trimmed the import to only the four constants actually consumed: `SWIPE_OVERLAY_INPUT_PX`, `SWIPE_ROTATE_RANGE_DEG`, `SWIPE_THRESHOLD_PX`, `SWIPE_VELOCITY_PX_S`. The remaining tokens stay in `lib/swipe-tokens.ts` for Plan 04.
- **Files modified:** `frontend/components/ShortlistCard.tsx`
- **Commit:** f88a4bd

**Note on `bg-validé-tint`:** Per the plan, this Tailwind v4 utility is referenced in `VoteSummary` even though the `--color-validé-tint` CSS token will only be added by Plan 04. Tailwind v4 tolerates the unknown utility at build time (it emits no rule and the surface gets no background until Plan 04 ships the `@theme inline` declaration). Not flagged as a deviation — explicitly accepted in the plan's `<interfaces>` block.

## Authentication Gates

None. All API client functions use the existing `api()` wrapper which already handles cookie auth via `credentials: "include"`. No new auth flow introduced.

## Known Stubs

- **Direct `<img src={primaryPhoto}>` in ShortlistCard.** `recipe.photo_paths[0]` is a Supabase-bucket-relative path (e.g. `{household_id}/{recipe_id}/{uuid}.jpg`), not a fetchable URL. As written, the card will render a broken image until Plan 04 wraps it in a signed-URL component (the same pattern Phase 1 established with `getSignedPhotoUrl` in `frontend/lib/recipes.ts`). The plan explicitly documents this in a JSX comment: "consumer (Plan 04) supplies signed URLs via a wrapping component if needed. For now, render directly — placeholder behavior."
- **`ShortlistCard` reads `recipe.id` for the title heading id but never receives a deck context** — `isFront` is the only positional cue. Plan 04 will own the stack-of-2 rendering logic; until then, ShortlistCard is unwired.

These stubs are intentional and tracked: Plan 04 (`03-04` Wave 3) is the consumer that resolves both. Plan 03's contract is "pure components and lib contracts," not end-to-end behavior.

## Threat Flags

None. All new surfaces and trust boundaries documented in the plan's `<threat_model>` apply unchanged. No new network endpoints, auth paths, file access patterns, or schema changes introduced (the lib modules call existing endpoints documented in Plan 02).

## Self-Check: PASSED

Verified files exist on disk:

- `frontend/lib/swipe-tokens.ts` — FOUND
- `frontend/lib/votes.ts` — FOUND
- `frontend/lib/shortlist.ts` — FOUND
- `frontend/lib/cooking.ts` — FOUND
- `frontend/components/ShortlistCard.tsx` — FOUND
- `frontend/components/VoteSummary.tsx` — FOUND
- `frontend/components/ColdStartChip.tsx` — FOUND
- `frontend/components/RegenerateSheet.tsx` — FOUND

Verified commits exist:

- `88eee2c` (Task 1) — FOUND in `git log`
- `f88a4bd` (Task 2) — FOUND in `git log`
