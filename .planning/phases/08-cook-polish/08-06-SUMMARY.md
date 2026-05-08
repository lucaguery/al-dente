---
phase: 08-cook-polish
plan: 08-06
subsystem: frontend / cook-polish
tags: [phase-8, cook-10, cooking-log-history, frontend-polish, slow-food-design]
requires:
  - 08-CONTEXT.md (Phase 8 context — COOK-10 scope + Claude's-Discretion call on CookingLogCard fork)
  - 08-UI-SPEC.md (Phase 8 UI-SPEC §Surface 6 + §Component Inventory + §Acceptance Criteria COOK-10)
  - Phase 5 design tokens (paper-grain, text-title, font-display italic, surface-rose-100, valide-tint, primary)
  - Phase 6 EmptyState component (paper-grain Card + Fraunces text-title heading + h-12 CTA)
  - Phase 7 ShortlistCard frame pattern (paper-grain + warm shadow + rounded-xl)
provides:
  - CookingLogCard.tsx component (paper-grain card with vertical aspect-[4/3] photo on top, Fraunces title, ratingChipClass 3-state pill, optional notes)
  - /cooking-logs route (shell + EmptyState + grouped-by-day list when backend list lands)
  - inline `ratingChipClass(rating: LogRating)` helper (3-state pill with 4-multiple Tailwind spacing — px-2 py-1 h-8)
  - `formatSectionHeaderFr(date)` + `groupLogsByDay(logs)` helpers in `cooking-logs/page.tsx`
affects:
  - none (greenfield — net-new component + net-new route; no existing component edits in this plan)
tech-stack:
  added:
    - none (uses Next.js 16 App Router, React 19, Tailwind v4, lucide-react, next-intl, all already on the stack)
  patterns:
    - "Vertical-photo cooking-log card layout (aspect-[4/3] on top) — different from RecipeCard's horizontal h-16 w-16 side-thumbnail layout because cooking-log cards prioritize 'what we ate' photo prominence over compact list density"
    - "Inline ratingChipClass helper instead of shared <RatingChip /> primitive — only one consumer in v0.2 (cooking-log history); refactor to shared component if a second consumer emerges (e.g. recipe-detail recent-ratings surface)"
    - "Best-effort fetch with silent fallthrough — calls /api/cooking-logs?days=14 and falls through to empty state when the backend list endpoint isn't wired yet (Phase 8 is frontend polish only; backend list is V2 follow-up)"
    - "Absolute-day grouping via local-time YYYY-MM-DD bucket — matches the user's mental model of 'what we ate Friday vs Saturday' even when logs straddle midnight"
key-files:
  created:
    - "frontend/components/CookingLogCard.tsx (123 lines) — paper-grain card with vertical aspect-[4/3] photo + Fraunces text-title + cooked-on date + ratingChipClass pill + optional notes; signed-URL fetch via getCookingLogSignedPhotoUrl"
    - "frontend/app/cooking-logs/page.tsx (146 lines) — client route at /cooking-logs with OnboardingGuard wrapper, best-effort fetch, EmptyState fallback, grouped-by-day section list with Fraunces italic headers"
  modified: []
decisions:
  - "Forked CookingLogCard rather than adding a `mode='cooking-log'` prop to RecipeCard — RecipeCard's living-image fetch logic + horizontal h-16 thumbnail layout diverged materially from a cooking-log row's vertical aspect-[4/3] photo + cooking-log-specific signed-URL helper. Forking keeps both components readable; aligns with CONTEXT.md Claude's-Discretion guidance"
  - "Inlined `ratingChipClass(rating: LogRating)` helper at the call site — only consumer in v0.2; Phase 7 chipClass is keyed on VoteState (5-state) not LogRating (3-state) and is not directly reusable. If a second consumer emerges, refactor to shared <RatingChip /> at that point"
  - "Pill spacing uses 4-multiple Tailwind utilities (px-2 py-1 h-8) per Phase 5 token discipline — UI-SPEC §Component Inventory mentioned `px-2.5 py-0.5` as a comparison reference but the executor plan locks 4-multiples"
  - "Notes line gap inside CookingLogCard body uses gap-2 (not gap-1.5) per Phase 5 4-multiple discipline + plan executor lock"
  - "Best-effort fetch shape: assume `{ logs: CookingLogCardData[] }` from `/api/cooking-logs?days=14` and fall through silently to EmptyState if the endpoint 404s (backend list endpoint not yet wired — Phase 8 is frontend polish only). Forward-compatible for when the backend ships"
  - "Empty-state copy reuses existing `recipes.empty_heading` / `empty_body` keys per UI-SPEC §Surface 6 — v0.2 string budget locked at 2 new keys (both in plan 08-01: `cooking_log.finalize.offline` + `recipe_subhead`). Cooking-log-specific empty copy is TODO(productize)"
  - "Absolute-day grouping via local-time YYYY-MM-DD key + `Intl.DateTimeFormat('fr-FR', { weekday, day, month })` for the section header label (e.g. 'vendredi 8 mai') — pairs naturally with the Fraunces italic gesture from the HomeDecide header (Phase 7) at body scale"
  - "No sticky-header heading on /cooking-logs — UI-SPEC §Surface 6 'Resolution path B' (the first dated section header IS the page anchor); aligns with v0.2 zero-new-i18n-keys-on-this-surface constraint"
metrics:
  duration: "~2 min"
  completed: 2026-05-08
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 08 Plan 08-06: COOK-10 Cooking-Log History View Summary

Greenfield: NEW `CookingLogCard` component (paper-grain Card with vertical aspect-[4/3] photo + Fraunces title + 3-state inline `ratingChipClass` pill + optional notes) + NEW `/cooking-logs` route (best-effort fetch shell with grouped-by-day Fraunces italic section headers and EmptyState fallback for the not-yet-wired backend list endpoint).

## Plan Goal

Implement the cook-polish Slow Food artisanal treatment for the cooking-log history surface (COOK-10 acceptance criterion in Phase 8 UI-SPEC §Surface 6). Two greenfield artifacts:

- `frontend/components/CookingLogCard.tsx` — vertical photo-on-top card mirroring the Phase 7 ShortlistCard frame (paper-grain + rounded-xl + warm shadow) with a Fraunces text-title recipe name, French-relative cooked-on date, 3-state rating pill, and optional clamped notes.
- `frontend/app/cooking-logs/page.tsx` — `/cooking-logs` route shell with OnboardingGuard, best-effort `GET /api/cooking-logs?days=14` fetch, grouped-by-day Fraunces italic section headers, and EmptyState fallback (reusing existing `recipes.empty_heading` / `empty_body` keys per the 2-new-keys-only Phase 8 string budget).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create CookingLogCard component (paper-grain card + vertical aspect-[4/3] photo + Fraunces text-title + ratingChipClass pill + optional notes; inline 3-state pill helper with 4-multiple Tailwind spacing) | `9c47d7f` | `frontend/components/CookingLogCard.tsx` (created, 123 lines) |
| 2 | Create /cooking-logs history route (best-effort fetch + grouped-by-day Fraunces italic headers + EmptyState fallback) | `501e0b1` | `frontend/app/cooking-logs/page.tsx` (created, 146 lines) |

## Verification

- `grep -c "paper-grain" frontend/components/CookingLogCard.tsx` → 2 (1 in className + 1 in comment) ✅
- `grep -c "ratingChipClass" frontend/components/CookingLogCard.tsx` → 3 (1 in comment + 1 declaration + 1 call site) ✅
- `grep -E "className=.*\b(px-2\.5|py-0\.5)\b"` on both files → 0 hits ✅ (no 0.5-multiple Tailwind classes anywhere)
- `grep "gap-1.5"` on both files → 0 hits ✅ (uses gap-2 / gap-3 only per 4-multiple discipline)
- `npx tsc --noEmit` (frontend) → exit 0 ✅ (TypeScript compilation clean)
- File `frontend/components/CookingLogCard.tsx` exists ✅
- File `frontend/app/cooking-logs/page.tsx` exists ✅

## Acceptance Criteria → Closure Mapping

| Req | Plan-08-06 closure |
|---|---|
| **COOK-10** Cooking-log history view re-themed | NEW `CookingLogCard` component with paper-grain frame + vertical aspect-[4/3] photo + Fraunces `text-title` recipe name + `text-sm text-foreground-muted` cooked-on date (via `formatRelativeFr`) + inline `ratingChipClass` 3-state pill (`loved` faint terracotta wash, `liked` emerald wash mirroring Validé, `disliked` warm-taupe muted, all with `px-2 py-1 h-8` 4-multiple spacing); NEW `/cooking-logs` route with grouped-by-day `font-display italic text-base` section headers (Fraunces gesture from Phase 7 HomeDecide scaled down to body size); EmptyState fallback reuses existing `recipes.empty_heading` / `empty_body` keys (Phase 8 budget reality: 2 new keys only, both in plan 08-01) |

## Deviations from Plan

None — plan executed exactly as written. Two minor judgment calls documented under Decisions:

1. **CookingLogCard fork over RecipeCard prop variant** — pre-authorized in CONTEXT.md as Claude's Discretion; CONTEXT.md hints that forking is cleaner because the cooking-log shape diverges from `Recipe` and the photo-namespace requires the cooking-log signed-URL helper rather than the recipe-photo helper.
2. **Sticky-header heading omitted on `/cooking-logs`** — UI-SPEC §Surface 6 explicitly authorizes "Resolution path B" (no sticky-header heading; the first dated section header anchors the page register) to keep within the Phase 8 zero-new-i18n-keys-on-this-surface constraint.

No Rule-1 bug fixes, Rule-2 missing-functionality additions, or Rule-3 blocker resolutions were required.

## Auth Gates

None — greenfield frontend code; no auth-error paths exercised during execution.

## Known Stubs

- **`/cooking-logs` empty-state copy is a placeholder.** UI-SPEC §Surface 6 explicitly authorizes reusing `recipes.empty_heading` (`Aucune recette pour le moment`) and `recipes.empty_body` (`Ajoute ta première recette pour commencer.`) until the backend list endpoint ships. Cooking-log-specific empty copy is **TODO(productize)** — file: `frontend/app/cooking-logs/page.tsx` line 122-126. Mitigation: when the backend list endpoint lands (V2), add cooking-log-specific empty keys (e.g. `cooking_log.history.empty_heading` / `empty_body`) and swap the EmptyState props.
- **`/api/cooking-logs?days=14` endpoint is not yet wired on the backend.** The frontend ships the route shell + EmptyState fallback today; live rows surface automatically when the backend list endpoint lands. Best-effort fetch falls through silently on 404. Mitigation: V2 follow-up plan to wire the backend list endpoint.

These stubs are intentional per UI-SPEC §"Phase 8 budget reality" — Phase 8 is frontend polish only; backend list endpoint is V2 follow-up. The CookingLogCard component is component-complete and ready to render rows the moment the endpoint exists.

## Threat Flags

None — no new network endpoints, auth paths, file access, or schema changes introduced. Reuses the existing `api()` helper (cookie-auth, same-origin, HttpOnly) and the existing `getCookingLogSignedPhotoUrl` helper (5-min signed URL, log-scoped).

## Self-Check: PASSED

- FOUND: `frontend/components/CookingLogCard.tsx` (created, 123 lines)
- FOUND: `frontend/app/cooking-logs/page.tsx` (created, 146 lines)
- FOUND: commit `9c47d7f` (Task 1: CookingLogCard component)
- FOUND: commit `501e0b1` (Task 2: /cooking-logs history route)
- VERIFIED: `paper-grain` appears in CookingLogCard.tsx (1 className use site)
- VERIFIED: `ratingChipClass` declared and called in CookingLogCard.tsx
- VERIFIED: zero `px-2.5` / `py-0.5` usage in className across both files
- VERIFIED: zero `gap-1.5` usage across both files
- VERIFIED: TypeScript compilation clean (`npx tsc --noEmit` exit 0)
