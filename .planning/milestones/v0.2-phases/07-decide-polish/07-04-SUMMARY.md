---
phase: 07-decide-polish
plan: 04
subsystem: frontend / decide-polish
tags: [decide-polish, typography, fraunces, intl, surface-1, header, decide-01]
requires:
  - Phase 5 design-system foundation: text-display utility (Fraunces italic, weight 500, opsz=96, clamp 32-44px)
  - Phase 5 design-system foundation: text-foreground deep-ink color anchor
  - Browser Intl.DateTimeFormat (no polyfill, native browser global)
provides:
  - Display-serif date header above the deck/summary phase swap on HomeDecide (DECIDE-01)
  - Locale-aware French date rendering via browser Intl ("vendredi 8 mai")
affects:
  - frontend/components/HomeDecide.tsx (single file, 16-line insertion)
tech_stack_added: []
tech_stack_patterns:
  - Browser Intl.DateTimeFormat for locale-aware date formatting (no new i18n key)
  - Phase 5 text-display utility for display-serif Fraunces-italic typography
key_files_created: []
key_files_modified:
  - frontend/components/HomeDecide.tsx
decisions:
  - Computed `formattedDate` at render time inside the component body (NOT module scope) so the date stays current across a midnight boundary if the app stays open overnight.
  - Used the standard browser Intl API rather than introducing a fr.json key — UI-SPEC §"Surface 1" point 3 explicitly chose this path; zero diff on frontend/lib/i18n/fr.json is verified.
  - Followed UI-SPEC §"Surface 1" point 4 (NO Card wrap) and Phase 5 invariant (NO paper-grain on chrome) — the date sits as standalone display text on the page background.
  - Preserved the lowercase French convention from Intl ("vendredi 8 mai") — no `.toUpperCase()` on the first letter; UI-SPEC explicitly calls for cookbook-cover voice via Fraunces italic alone, not sentence-case bureaucracy.
  - Header is exclusive to the "shortlist exists" return branch (Edit 1C). The "no shortlist" early-return branch was left byte-for-byte untouched — adding a header to the empty branch would create double-heading composition with the EmptyState component.
metrics:
  duration_minutes: ~25
  files_changed: 1
  insertions: 16
  deletions: 0
  tasks_completed: 1
  completed_date: "2026-05-08"
---

# Phase 7 Plan 04: HomeDecide Fraunces-italic display-serif date header — Summary

DECIDE-01 closed by inserting a `<header><h1>` block above the deck/summary phase swap on HomeDecide, using the Phase 5 `text-display` utility (Fraunces italic) and browser `Intl.DateTimeFormat('fr-FR')` for locale-aware day-of-week + day + month rendering — no new i18n key, all existing handlers and realtime listeners byte-for-byte preserved.

## What Shipped

A single, 16-line insertion in `frontend/components/HomeDecide.tsx`. Two parts:

### 1. `formattedDate` const (component body, after `showCorpusColdStart`)

```tsx
// Phase 7 / DECIDE-01 — display-serif date header above the deck.
// Locale-aware via the standard browser Intl API (no new i18n key per
// 07-UI-SPEC §"Surface 1" point 3). Lowercase per French convention.
// No year — too granular for daily-decide. Example: "vendredi 8 mai".
// Computed at render time (NOT module scope) so the date stays current
// across a midnight boundary if the app stays open overnight.
const formattedDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(new Date());
```

**Position:** lines 389–399 (post-edit).

### 2. `<header><h1>` JSX block (between cold-start chip and deck/summary phase swap)

```tsx
<header className="px-6 pt-8 pb-2">
  <h1 className="text-display text-foreground">{formattedDate}</h1>
</header>
```

**Position:** lines 413–415 (post-edit). Inserted between `{showCorpusColdStart && <ColdStartChip />}` (line 411) and `{allVoted ? (` (line 417).

The visual rhythm now reads: PushPermissionBanner → CookingBanner (conditional) → ColdStartChip (conditional) → date header (`pt-8 pb-2`) → deck/summary phase swap → bottom nav. The 32px top / 8px bottom asymmetry pulls the header up away from the chip and lets it breathe, while the deck container's existing padding resumes rhythm into the cards below.

## Format Produced

`Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })` against `new Date()` produces strings like:

- `vendredi 8 mai`
- `lundi 1er janvier`
- `mercredi 14 août`
- `dimanche 25 décembre`

Lowercase per French convention is **preserved as-is** — UI-SPEC §"Surface 1" calls for the cookbook-cover voice via Fraunces italic typography alone, not sentence-case capitalization.

## Constraint Compliance

### Critical constraints from prompt

| Constraint | Status |
|---|---|
| Date formatting via `Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })` | ✅ literal match, in that exact key order |
| Fraunces display italic via `text-display` className | ✅ `<h1 className="text-display text-foreground">` (italic axis baked into the utility per Phase 5) |
| Preserve all existing handlers, hooks, and realtime listeners byte-for-byte | ✅ verified (grep counts below) |

### Acceptance criteria from PLAN

| Criterion | Result |
|---|---|
| `grep -c "Intl.DateTimeFormat" components/HomeDecide.tsx` | 1 ✅ |
| `grep -c "fr-FR" components/HomeDecide.tsx` | 1 ✅ |
| `grep -c "weekday: \"long\"\|day: \"numeric\"\|month: \"long\""` | 3 ✅ (≥3 required) |
| `grep -c "text-display" components/HomeDecide.tsx` | 1 ✅ |
| `grep -c "<header" components/HomeDecide.tsx` | 1 ✅ |
| `grep -c "<h1" components/HomeDecide.tsx` | 1 ✅ |
| `grep -c "formattedDate" components/HomeDecide.tsx` | 2 ✅ (≥2 required) |
| `grep -c "px-6 pt-8 pb-2" components/HomeDecide.tsx` | 1 ✅ |
| `git diff frontend/lib/i18n/fr.json` zero changes | ✅ (`git diff --stat` returns empty) |
| "no shortlist" branch unmodified — same `<EmptyState ... />` markup | ✅ (no `<header>` or `text-display` insertion in that branch) |
| `grep -c "handleVoteApplied\|handleDelegate\|handleRegenerate\|handleCookStart\|handleBannerSkip"` | 11 ✅ (≥5 required) |
| `grep -c "VOTE_CREATED_DOM_EVENT\|SHORTLIST_CREATED_DOM_EVENT\|COOKING_STARTED_DOM_EVENT\|COOKING_FINALIZED_DOM_EVENT"` | 12 ✅ (≥4 required) |
| `cd frontend && npx tsc --noEmit` | ✅ passes clean |
| `cd frontend && npm run lint` | ✅ 0 errors (only 2 pre-existing warnings in `frontend/public/worker-9e66885325cabad7.js` — out of scope, untracked file) |

### Threat-model verification

| Threat ID | Result |
|---|---|
| T-07-04-03 (XSS via formattedDate) | `grep -c "dangerouslySetInnerHTML"` returns 0 ✅ |

## Behavioral Preservation

Byte-for-byte preserved per UI-SPEC §"Component Inventory > HomeDecide.tsx" ("the cosmetic header addition is the only direct change to HomeDecide.tsx"):

- `"use client"` directive — unchanged
- Phase 3 file-header comment — unchanged
- All imports — unchanged (no new imports added; `Intl.DateTimeFormat` is a browser global)
- `COOK_BANNER_SKIP_KEY`, `MEMBER_COUNT` constants — unchanged
- `Member` type — unchanged
- All state hooks (`shortlist`, `shortlistLoaded`, `activeLog`, `bannerSkipped`, `regenOpen`, `regenSubmitting`, `delegateInFlight`, `cookInFlight`, `validéToastedFor`) — unchanged
- `me` and `partner` `useMemo`s — unchanged
- Initial fetch `useEffect` (Promise.all over `fetchTodayShortlist` + `getActiveCookingLog`) — unchanged
- All four realtime listeners (`vote.created`, `shortlist.created`, `cooking.started`, `cooking.finalized`) — unchanged
- All handlers (`handleVoteApplied`, `handleDelegate`, `handleRegenerate`, `handleCookStart`, `handleBannerSkip`) — unchanged
- `cookingBannerVisible`, `dealableRecipes`, `myVotes`, `unvotedByMe`, `allVoted`, `showCorpusColdStart` derivations — unchanged
- "No shortlist" early-return branch — **untouched per Edit 1C**
- `recipeTitleFor` helper — unchanged

## "No shortlist" Branch — Verification

```tsx
if (shortlist === null) {
  return (
    <div className="flex flex-col flex-1">
      <PushPermissionBanner />
      {cookingBannerVisible && activeLog && (
        <CookingBanner
          logId={activeLog.id}
          recipeTitle=""
          onSkip={handleBannerSkip}
        />
      )}
      <ColdStartChip />
      <EmptyState
        icon={Sparkles}
        heading={tShortlist("empty_heading")}
        body={tShortlist("empty_body")}
        cta={{
          href: "/recipes/new",
          label: tShortlist("empty_cta"),
        }}
      />
    </div>
  );
}
```

No `<header>`, no `text-display`, no `formattedDate` reference — branch is byte-for-byte identical to pre-edit.

## i18n — Zero Diff Confirmation

```bash
$ git diff frontend/lib/i18n/fr.json
$ git diff --stat frontend/lib/i18n/fr.json
# (empty — no output)
```

No new i18n key added. The browser Intl API handles French locale entirely.

## Deviations from Plan

None — plan executed exactly as written.

The single non-cosmetic judgment call was the comment phrasing on the `formattedDate` declaration: an earlier draft used the literal substring `'fr-FR'` inside the comment, which would have made `grep -c "fr-FR"` return 2 instead of the plan-required 1. The comment was rewritten to "the standard browser Intl API" to honor the acceptance criterion exactly. No semantic change.

## Verification Output

```bash
$ cd frontend && grep -n "text-display\|Intl.DateTimeFormat" components/HomeDecide.tsx
395:  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
414:        <h1 className="text-display text-foreground">{formattedDate}</h1>

$ cd frontend && grep -c "Intl.DateTimeFormat\|text-display\|<header" components/HomeDecide.tsx
3

$ cd frontend && npx tsc --noEmit
# (clean exit, no errors)

$ cd frontend && npm run lint
# (0 errors; 2 pre-existing warnings in untracked frontend/public/worker-*.js — out of scope)

$ git diff --stat frontend/lib/i18n/fr.json
# (empty — zero changes)

$ git diff --stat frontend/components/HomeDecide.tsx
 frontend/components/HomeDecide.tsx | 16 ++++++++++++++++
 1 file changed, 16 insertions(+)
```

## Commit

| Task | Description | Commit | Files |
|---|---|---|---|
| 1 | HomeDecide — add Fraunces-italic date header above the deck/summary phase swap | `4a4b6ae` | `frontend/components/HomeDecide.tsx` |

## Self-Check: PASSED

- File `frontend/components/HomeDecide.tsx` exists ✅
- Commit `4a4b6ae` exists in `git log` ✅
- All acceptance criteria greps pass ✅
- TypeScript clean ✅
- ESLint clean (no new errors) ✅
- `frontend/lib/i18n/fr.json` zero diff ✅
- "No shortlist" early-return branch untouched ✅
- All behavioral logic byte-for-byte preserved ✅
