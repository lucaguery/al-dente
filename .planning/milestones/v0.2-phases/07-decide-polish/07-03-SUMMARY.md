---
phase: 07-decide-polish
plan: 03
subsystem: ui
tags: [vote-chips, delegation-card, paper-grain, fraunces, terracotta, decide]

requires:
  - phase: 05-design-system-foundation
    provides: "Phase 5 token system (--color-valide-tint, paper-grain, shadow-card, text-title, font-display, primary terracotta, border tokens, muted/destructive scales)"
  - phase: 06-capture-surfaces-polish
    provides: "D-Voice callout pattern (paper-grain Card + Fraunces italic body + 3px terracotta-60 left border) — directly mirrored by the Tu-décides delegation Card in this plan"
provides:
  - "5-state vote-chip presentation: chipClass(state) helper returning the LOCKED pill class strings for Validé / Pressenti / Contesté / Rejeté / Sans avis"
  - "Tu-décides paper-grain delegation Card (Pressenti + all-rejected fallback branches), with Fraunces italic body + h-12 w-full terracotta CTA"
  - "VoteSummary heading at text-title (Fraunces 24px) — Phase 5 type-scale convergence"
  - "Regenerate ghost button at h-12 (D-08 48px tap-target floor closure)"
affects: [07-04 (Phase 7 wave-1 sibling plans), 08-cook-polish (cook surfaces inherit Phase 5 + Phase 6 + Phase 7 patterns)]

tech-stack:
  added: []
  patterns:
    - "chipClass(state) helper as the single per-state class projector — sibling to existing rowBgClass(state); inline (no VoteChip subcomponent extracted in v0.2)"
    - "Inline paper-grain delegation Card markup in VoteSummary (no DelegationCallout.tsx extraction; only one consumer in v0.2)"
    - "Pill chip shape contract for read-only state indicators: inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium h-8 w-fit"

key-files:
  created: []
  modified:
    - frontend/components/VoteSummary.tsx

key-decisions:
  - "Keep chipClass inline (no VoteChip subcomponent) — only one consumer; defer extraction until a second emerges (e.g. ShortlistCard meta row in a future plan)"
  - "Inline paper-grain delegation Card in VoteSummary (no DelegationCallout.tsx) — only two adjacent branches consume it; markup is small enough to keep next to the data"
  - "Validated branch preserved byte-for-byte (anti-pattern guard) — the validated state IS the destination; flat editorial composition reads stronger than another wrapped Card"
  - "w-fit on the chip base shape — prevents the chip from stretching to fill its flex-col parent (chip sits below row title, would otherwise span row width)"

patterns-established:
  - "5-state pill chip color story (DECIDE-03 LOCKED): emerald wash (Validé), terracotta wash (Pressenti), quieted destructive (Contesté), muted+line-through (Rejeté), border-only ghost (Sans avis)"
  - "Tu-décides delegation surface mirrors Phase 6 D-Voice callout: paper-grain Card + 3px terracotta-60 left border + Fraunces italic 16px body + h-12 w-full terracotta CTA"

requirements-completed: [DECIDE-03, DECIDE-04]

duration: 2 min
completed: 2026-05-08
---

# Phase 7 Plan 03: VoteSummary 5-state chip mapping + Tu-décides delegation Card Summary

**5-state vote-chip pill render with LOCKED color story + paper-grain Tu-décides delegation Card mirroring Phase 6 D-Voice pattern, in a single 28-line surgical edit to VoteSummary.tsx (no new files, no new i18n keys, no architectural change).**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-08T11:11:18Z
- **Completed:** 2026-05-08T11:14:14Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Replaced the 9-line `stateClass(state)` helper (text-color only) with a 16-line `chipClass(state)` helper returning the LOCKED 5-state pill class strings per DECIDE-03 contract.
- Wrapped the Pressenti and all-rejected fallback branches in paper-grain Cards with 3px terracotta-60 left border, Fraunces italic 16px body, and h-12 w-full terracotta CTA — mirroring the Phase 6 D-Voice callout pattern (DECIDE-04).
- Upgraded the page heading from `text-xl font-semibold leading-7` to `text-title` (Fraunces 24px), addressing Phase 6 audit IN-01 / Pillar 4 finding.
- Bumped the regenerate ghost Button from `h-11` to `h-12`, closing the D-08 48px tap-target floor gap on a Phase 7 surface (non-negotiable per UI-SPEC §"Tap-target audit").
- Preserved the validated branch byte-for-byte (anti-pattern guard) — flat editorial composition reads as "this is the chosen one," not as another callout.
- Preserved the entire data flow (recipes + votes + me + partner + memberCount + onCookStart + onDelegate + onRegenerate + cookInFlight + delegateInFlight), the rows useMemo, the rowBgClass helper, and the dotForVote helper — byte-for-byte.

## Task Commits

Each task was committed atomically:

1. **Task 1: VoteSummary — replace stateClass with chipClass, upgrade heading, bump regenerate to h-12** — `df72c92` (feat)
2. **Task 2: VoteSummary — wrap pressenti + fallback branches in paper-grain delegation Cards** — `786d7bf` (feat)

## Files Created/Modified

- `frontend/components/VoteSummary.tsx` — 5 surgical edits: (1) `stateClass` → `chipClass` helper rewrite with LOCKED 5-state pill class strings; (2) row state span replaced with `chipClass(row.state)`; (3) heading upgraded to `text-title`; (4) regenerate Button bumped to `h-12`; (5) Pressenti + fallback branches wrapped in paper-grain Card with `border-l-[3px] border-primary/60`, Fraunces italic body, and `h-12 w-full` CTA. Card import added.

## Edit Detail

### Edit 1A — `chipClass(state)` helper (added; replaces `stateClass`)

The full helper as committed:

```tsx
// Phase 7 / DECIDE-03 — 5-state vote-chip pill class strings.
// Locked color mapping per 07-UI-SPEC §"Color > Vote-chip color mapping".
// Pill shape contract (all 5 states): inline-flex items-center rounded-full
// px-2.5 py-0.5 text-sm font-medium h-8. Read-only state indicators (NOT
// tap targets); the D-08 48px floor explicitly excludes non-interactive chrome.
function chipClass(state: VoteState): string {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium h-8 w-fit";
  switch (state) {
    case "valide":
      return `${base} bg-[var(--color-valide-tint)] text-foreground border border-emerald-500/30`;
    case "pressenti":
      return `${base} bg-primary/15 text-primary border border-primary/40`;
    case "conteste":
      return `${base} bg-destructive/10 text-destructive/80 border border-destructive/30`;
    case "rejete":
      return `${base} bg-muted text-muted-foreground line-through`;
    case "sans_avis":
      return `${base} bg-transparent text-muted-foreground border border-border`;
  }
}
```

**Confirmation:** `stateClass` is gone (`grep -c "function stateClass" components/VoteSummary.tsx` → 0). The exhaustive switch covers all 5 `VoteState` members; TypeScript narrows to `never` after the final case so no default branch is needed and `tsc --noEmit` passes cleanly.

### Edit 1B — row state span (before / after)

Before (lines 127–131 pre-edit):

```tsx
<span
  className={`text-sm font-medium leading-5 ${stateClass(row.state)}`}
>
  {tState(row.state)}
</span>
```

After:

```tsx
<span className={chipClass(row.state)}>
  {tState(row.state)}
</span>
```

The wrapping `text-sm font-medium leading-5` was duplicated by the chip's own `text-sm font-medium`, so dropping the outer wrapper is correct. The chip itself sets `inline-flex` so it lays out as a pill within the `flex-col` parent; `w-fit` prevents stretching.

### Edit 1C — heading upgrade

Before:

```tsx
<h2 className="text-xl font-semibold leading-7">{t("heading")}</h2>
```

After:

```tsx
<h2 className="text-title">{t("heading")}</h2>
```

Visual register shifts from "IBM Plex Sans 20px semibold" (UI-row idiom) to "Fraunces 24px editorial" (cookbook chapter heading), matching Phase 5 type-scale convergence.

### Edit 1D — regenerate Button bump

Before: `className="h-11"`. After: `className="h-12"`. D-08 48px tap-target floor closure for an interactive control on a Phase 7 surface — non-negotiable per UI-SPEC §"Tap-target audit".

### Edit 2A / 2B / 2C — Card import + delegation Card wraps

`Card` imported from `@/components/ui/card`. Both delegation branches now use the same Card pattern:

```tsx
<Card className="paper-grain shadow-card border-l-[3px] border-primary/60 px-4 py-3 flex flex-col gap-3">
  <p className="font-display italic text-base text-foreground">
    {t("intro_pressenti")}  {/* or t("intro_none") in fallback */}
  </p>
  <Button
    type="button"
    variant="default"
    className="h-12 w-full"
    disabled={delegateInFlight}
    onClick={onDelegate}
  >
    {t("delegate_cta")}
  </Button>
</Card>
```

className composition: paper-grain (Phase 5 grain anchor) + shadow-card (warm two-layer shadow) + 3px terracotta-60 hairline left border (D-Voice mirror) + 16px horizontal / 12px vertical padding + flex column gap-3.

Body: Fraunces italic at 16px / `text-foreground` (deep ink) — editorial cookbook-margin-note register; mirrors Phase 6 D-Voice callout. Replaces the previous `text-sm text-foreground-muted` UI-helper register.

CTA: drops from `h-14 rounded-2xl` (standalone destination) to `h-12 w-full` (in-Card CTA at the D-08 floor; spans the Card's flex-column width). The handler contract (`type="button"`, `variant="default"`, `disabled={delegateInFlight}`, `onClick={onDelegate}`, `t("delegate_cta")`) is preserved byte-for-byte.

### Validated branch — preserved byte-for-byte

The validated branch (`validatedRow ? <>...</>`) keeps:

- `<p className="text-base font-medium text-foreground">{t("intro_validated")}</p>` (IBM Plex Sans 16px, "Tu commences ?")
- `<p className="text-title line-clamp-1">{validatedRow.recipe.title}</p>` (Fraunces 24px editorial recipe title — already correct pre-Phase 7)
- `<Button variant="default" className="h-14 rounded-2xl" ...><ChefHat size={20} className="mr-2" />{t("cook_cta")}</Button>` (h-14 destination CTA preserved)

**Anti-pattern guard upheld:** the validated state is a "go" signal — flat editorial composition (intro + Fraunces title + terracotta CTA) on the page surface, NOT wrapped in a paper-grain Card. Wrapping would dilute "this is the chosen one."

## Verification Output

All UI-SPEC §"Verification queries" pass:

```
Q8 — h-11 (must be 0) / h-12 / h-14:
  133: ... min-h-14 ...                                     (row container, preserved)
  163: className="h-14 rounded-2xl"                          (validated cook CTA, preserved)
  179: className="h-12 w-full"                               (Pressenti delegation CTA, NEW)
  194: className="h-12 w-full"                               (fallback delegation CTA, NEW)
  206: className="h-12"                                      (regenerate ghost, h-11 → h-12)
  → zero h-11 literal hits ✓

Q9 — text-title (must be ≥ 2):
  127: <h2 className="text-title">{t("heading")}</h2>       (heading upgraded)
  157: <p className="text-title line-clamp-1">              (validated-recipe-title, preserved)
  → 2 hits ✓

Q10 — border-l-[3px] / border-primary/60 / font-display italic:
  172, 187: paper-grain shadow-card border-l-[3px] border-primary/60 ... (2 Card wraps)
  173, 188: font-display italic text-base text-foreground            (2 italic body lines)
  → all 3 patterns present, 2 hits each ✓

Q12 — 5 chip class fragments (one per state branch):
  60: bg-[var(--color-valide-tint)] text-foreground border border-emerald-500/30
  62: bg-primary/15 text-primary border border-primary/40
  64: bg-destructive/10 text-destructive/80 border border-destructive/30
  66: bg-muted text-muted-foreground line-through
  68: bg-transparent text-muted-foreground border border-border
  → all 5 LOCKED class strings present ✓

git diff frontend/lib/i18n/fr.json → zero changes ✓
grep -c "dangerouslySetInnerHTML" → 0 ✓
npx tsc --noEmit → passes ✓
npm run lint → passes (warnings only on untracked frontend/public/worker-9e66885325cabad7.js, pre-existing, out of scope) ✓
```

## Decisions Made

- **Kept `chipClass` inline as a helper function next to `rowBgClass`.** No `VoteChip` subcomponent extracted. Reason: only one consumer in v0.2; matches the existing `rowBgClass(state)` / `dotForVote(vote, color)` helper-locality pattern in the same file. If a second consumer emerges (e.g. inline chip strip on the ShortlistCard meta row in a future plan), refactor to `<VoteChip state={...} />` at that point.
- **Inlined the delegation Card markup in `VoteSummary.tsx`.** No `DelegationCallout.tsx` extracted. Reason: two adjacent branches in the same component, markup is small (1 Card + 1 paragraph + 1 Button), keeps the markup next to the data it reads (`pressentiRow`, `delegateInFlight`, `onDelegate`). Follows CONTEXT.md "Claude's Discretion" guidance.
- **Used `w-fit` in the chip `base` constant.** Prevents the chip from stretching to fill its parent flex column (chip sits below the row title in a `flex-col` and would otherwise span the full row width). Confirmed against Phase 5 token philosophy — chips are narrow state indicators, never block elements.
- **Validated branch left flat (no Card wrap).** Anti-pattern guard upheld per UI-SPEC §Surface 3.

## Deviations from Plan

None - plan executed exactly as written.

The `<read_first>` files were all consulted before editing. Every edit followed the verbatim before/after blocks in the plan. No bug auto-fixes (Rule 1), no missing-critical additions (Rule 2), no blocking-issue fixes (Rule 3), no architectural changes (Rule 4) were needed. The two tasks composed cleanly with the LOCKED Phase 5 token system + Phase 6 D-Voice pattern.

## Issues Encountered

None.

## Authentication Gates

None — pure client-side React + Tailwind + next-intl edits.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DECIDE-03 (5-state vote-chip color mapping) and DECIDE-04 (Tu-décides delegation surface refined) are closed.
- VoteSummary.tsx is the only file in scope for this plan; siblings 07-01 (HomeDecide), 07-02 (ShortlistCard / Deck), 07-04 (ColdStartChip + globals.css comment) cover the rest of Phase 7.
- Zero new i18n keys; the French message catalog is unchanged.
- The chipClass helper provides a clean extension point if a `<VoteChip />` subcomponent emerges in v0.3.

## Self-Check: PASSED

- `[ -f frontend/components/VoteSummary.tsx ]` → FOUND
- `git log --all --oneline | grep df72c92` → FOUND (Task 1 commit)
- `git log --all --oneline | grep 786d7bf` → FOUND (Task 2 commit)

---
*Phase: 07-decide-polish*
*Completed: 2026-05-08*
