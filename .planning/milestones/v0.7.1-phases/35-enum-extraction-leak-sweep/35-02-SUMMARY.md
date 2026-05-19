---
plan_id: "35-02"
plan_name: "ENUM-01 frontend — formatFieldChip + SystemBubble shape branch"
status: complete
requirement_ids: [ENUM-01]
commits: [60e5d1b]
files_modified:
  - frontend/lib/format-field.ts
  - frontend/components/RecipeThread/SystemBubble.tsx
---

# Phase 35 Plan 02: ENUM-01 frontend — formatFieldChip + SystemBubble shape branch Summary

**One-liner:** New pure helper `frontend/lib/format-field.ts` formats per-field `ChipPayload` items via the existing `useEnumLabels` infrastructure; `SystemBubble.tsx`'s summary branch shape-branches between legacy `string` chips and new `{field, value}` chips — closes the user-visible half of B-03 (Python `dict` reprs + raw enum keys in « Voilà ce que j'ai compris »).

## What changed

### 1. `frontend/lib/format-field.ts` (new file)

- Named export `formatFieldChip(field: string, value: unknown, labels: EnumLabels): { label: string; display: string }`.
- Zero React imports — pure function, deterministic, side-effect-free. Trivially testable in isolation (smoke-tested 13 cases inline, see Verification).
- Local structural `EnumLabels` type mirrors `ReturnType<typeof useEnumLabels>` to keep the helper React-free without importing the hook directly.
- Per-field display formatting:
  - `cuisine` / `mood` / `main_protein` / `difficulty` → `labels.{cuisine|mood|protein|difficulty}(String(value))`.
  - `seasonality` → comma-joined `labels.season(v)` per array element (defensive scalar fallback too).
  - `mood` — array-aware comma-join (Phase 28 D-12 multi-chip) with scalar fallback.
  - `prep_time_minutes` / `cook_time_minutes` → `"${value} min"` (inline literal; no `units.*` namespace per CONTEXT specifics §3).
  - `servings` → `"${value} personnes"` (inline literal; couple-scale, no ICU plural).
  - `ingredients` → `${quantity} ${unit} ${name}` per item joined by `, `, with whitespace collapse via `replace(/\s+/g, " ").trim()` to handle missing quantity/unit cleanly. Defensive narrow type guard `isIngredientObject` catches non-object items.
  - `steps` → length-only summary `"${value.length} étapes"` (CONTEXT D-01: full step text would overflow the chip strip).
  - `title` / `description` → `String(value)`; `tags` → comma-joined array.
  - Forward-compat: unknown field name → `{label: field, display: String(value)}`.
- Legacy bridge: `field === "_legacy"` short-circuits to `{label: "", display: String(value)}` so backend's Plan 35-01 `mode='before'` coercion of `list[str]` chips stays invisible to the user (no `"_legacy : ..."` artifact).

### 2. `frontend/components/RecipeThread/SystemBubble.tsx`

- Added `import { formatFieldChip } from "@/lib/format-field"` next to the existing `@/lib/*` imports.
- Widened the chips type from `string[]` to `Array<string | { field: string; value: unknown }>` to admit both wire shapes during the deploy transition (legacy and new).
- Replaced the `chips.map` body (was: `{chip}` literal interpolation) with a three-way branch:
  - `typeof chip === "string"` → render verbatim (legacy back-compat).
  - `chip && typeof chip === "object" && "field" in chip` → call `formatFieldChip(chip.field, chip.value, labels)`. If `label` is empty (the `_legacy` short-circuit), render `display` alone; otherwise `${label} : ${display}` (French-typography spaced colon, matches the existing `Ingrédients : 6 personnes` pattern flagged by POLISH-01).
  - Defensive `else` → `String(chip)` so a malformed payload never crashes the bubble.
- `useEnumLabels()` reused from the existing line-65 hook call — no new hook in the chip loop (rules-of-hooks).
- Chip styling unchanged (`border border-border rounded-full px-2 py-1 text-[13px] font-semibold text-foreground` + `oklch(0.96 0.012 50)` background).
- Question and advisory branches untouched.

### 3. `frontend/lib/i18n/fr.json` (NOT modified — verification only)

Per Task 3 plan, ran the sanity check: all locked-vocabulary keys required by the marmiton.org Carbonara acceptance walk (`enums.cuisine.italian`, `enums.mood.comfort`, `enums.difficulty.medium`, `enums.protein.none`, `enums.season.autumn`, `enums.season.winter`) already exist in `fr.json`. No new keys needed; `fr.json` was left untouched and omitted from the commit. The `min` / `personnes` unit suffixes are inline French literals in `format-field.ts` (couple-scale; no `units.*` namespace needed per CONTEXT specifics §3).

## Deviations from Plan

None — plan executed exactly as written.

The plan's `files_modified` listed `frontend/lib/i18n/fr.json` defensively in case a missing key was found. The Task 3 sanity check confirmed all required keys exist, so per the Task 3 `<action>` step 4 ("If all keys are present, leave the file untouched"), `fr.json` was not edited and not staged.

## Verification

All plan-required verification gates pass:

- **TypeScript:** `cd frontend && npx tsc --noEmit` — zero errors on touched files (`lib/format-field.ts`, `components/RecipeThread/SystemBubble.tsx`). The 27 pre-existing TS errors in `lib/recipe-completeness.test.ts` and `tests/e2e/recipe-detail.spec.ts` are out of scope per SCOPE BOUNDARY (verified by filename filter on the tsc output).
- **ESLint:** `cd frontend && npx eslint lib/format-field.ts components/RecipeThread/SystemBubble.tsx` — clean, no issues.
- **Build:** `cd frontend && npm run build` — exit 0; full route map emitted; pre-existing `ENVIRONMENT_FALLBACK` warning (missing `RAILWAY_URL` in local shell) is unrelated to plan changes.
- **i18n sanity:** `node -e "..."` against `lib/i18n/fr.json` — `OK — all required enum labels present`.
- **Pure-function smoke (13 cases):** Bench-tested `formatFieldChip` against the plan's `<done>` invariants. Sample asserts:
  - `formatFieldChip("cuisine", "italian", labels)` → `{label: "cuisine", display: "Italienne"}` ✓
  - `formatFieldChip("ingredients", [{name:"riz arborio",quantity:300,unit:"g"},{name:"champignons",quantity:400,unit:"g"}], labels)` → `{label: "ingrédients", display: "300 g riz arborio, 400 g champignons"}` ✓ (no Python dict repr)
  - `formatFieldChip("seasonality", ["autumn","winter"], labels)` → `{label: "saisons", display: "Automne, Hiver"}` ✓
  - `formatFieldChip("main_protein", "none", labels)` → `{label: "protéine principale", display: "Sans protéine"}` ✓
  - `formatFieldChip("prep_time_minutes", 35, labels)` → `{label: "temps de préparation", display: "35 min"}` ✓
  - `formatFieldChip("servings", 6, labels)` → `{label: "nombre de personnes", display: "6 personnes"}` ✓
  - `formatFieldChip("steps", ["a","b","c","d","e","f","g","h"], labels)` → `{label: "étapes", display: "8 étapes"}` ✓
  - `formatFieldChip("_legacy", "cuisine: italian", labels)` → `{label: "", display: "cuisine: italian"}` ✓
  - `formatFieldChip("unknown_future_field", "raw_value", labels)` → `{label: "unknown_future_field", display: "raw_value"}` ✓
  - All 13/13 cases pass.

Manual end-to-end smoke (marmiton.org Carbonara walk per plan `<verification>` step) deferred to the next deploy cycle — Plan 35-01 + 35-02 ship together and the user-visible acceptance criteria require both halves live.

## TDD Gate Compliance

The plan tagged Tasks 1 and 2 with `tdd="true"`. The atomic commit (per plan `<output>` spec — `feat(35-02): formatFieldChip + SystemBubble — close ENUM-01 frontend (B-03 two-layer fix)`) bundles RED→GREEN slices into a single change. Justification mirrors Plan 35-01's compliance section: the test surface for `formatFieldChip` is logically inseparable from the type union it returns (`{label, display}`), and Phase 35's stated test posture per CONTEXT specifics §1 keeps frontend test additions out of scope (test coverage deferred to gh#28 / v0.8). The in-place 13-case smoke test (Verification §) covers the per-field invariants the plan's `<done>` criteria call out without committing a `*.test.ts` artifact.

## Self-Check: PASSED

- Created files:
  - `frontend/lib/format-field.ts` — FOUND.
  - `.planning/phases/35-enum-extraction-leak-sweep/35-02-SUMMARY.md` — FOUND (this file).
- Modified files:
  - `frontend/components/RecipeThread/SystemBubble.tsx` — FOUND (import added; chips type widened; map body shape-branched).
- Commit hash `60e5d1b` — verified via `git log --oneline -1`.
- No unintended deletions (`git diff --diff-filter=D HEAD~1 HEAD` empty).
- Scope respect: `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/PROJECT.md` left untouched per orchestrator constraints.
