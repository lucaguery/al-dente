---
phase_id: "35-enum-extraction-leak-sweep"
phase_name: "Enum + extraction-leak sweep (v0.7.1 Sober Kitchen Finish)"
review_date: "2026-05-18T17:18:04Z"
depth: standard
files_reviewed: 10
files_reviewed_list:
  - backend/app/schemas/recipe_turn.py
  - backend/app/services/llm.py
  - backend/tests/test_llm_thread.py
  - frontend/lib/format-field.ts
  - frontend/components/RecipeThread/SystemBubble.tsx
  - frontend/components/RecipeCard.tsx
  - frontend/components/RecipeRow.tsx
  - frontend/components/VoteSummary.tsx
  - frontend/package.json
  - scripts/check-enum-leak.sh
status: issues_found
critical_count: 0
warning_count: 4
info_count: 6
findings:
  critical: 0
  warning: 4
  info: 6
  total: 10
---

# Phase 35: Code Review Report

**Reviewed:** 2026-05-18T17:18:04Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 35's three-plan B-03 two-layer fix lands cleanly at the structural level: the backend chip-emission loop no longer concatenates Python repr via `str(val)`, the frontend `formatFieldChip` is a well-typed pure function that consumes the existing `useEnumLabels` infrastructure, and ENUM-02/03 add `labels.cuisine(...)` wraps at the three previously-leaking render sites (`RecipeCard`, `RecipeRow`, `VoteSummary`). The grep gate (ENUM-04) is sensibly scoped to string-literal-only positions and works on BSD grep (macOS); a manual smoke test against the post-commit tip exits 0.

Findings cluster on the **transition-shim ambiguity** and **gate precision/recall trade-offs** the plans themselves flag — there are no security defects, no crashing bugs, no broken contracts. The most material warnings are:

1. **MVP-posture tension** — the `_coerce_legacy_chips` Pydantic validator + frontend `typeof chip === "string"` dual-branch is a textbook backward-compat shim. CLAUDE.md's MVP posture explicitly forbids these. Plan 35-01's SUMMARY acknowledges the tension and defends the choice as "the seed re-generates summary turns on each LLM run, so old `list[str]` chips are short-lived" — but the shim is now committed code that will outlive its transition window. (WR-01)
2. **Stale comment in Plan 35-01 about `_FIELD_LABELS_FR`** — the SUMMARY says "completeness.py retains it for prompt-builder use," but a backend-wide grep shows zero consumers inside `completeness.py` itself; the dict is now exercised only by `test_completeness.py`. (WR-04 / IN-02)
3. **Chip display quality for the edge case `mood: []`** — when a previously-set mood is cleared (current=["comfort"], proposed=[]), the new chip emits `{field: "mood", value: []}` and renders as `"ambiance : "` (empty `display` after the array `.join`). The legacy behaviour produced `"ambiance: "` (same result), so this is not a regression — but it is a long-standing UX nit the chip-rewrite did not address. (WR-02)
4. **Grep-gate quoted-string false-positive class** — the gate's filter does not cover quoted-string positions used as wire values inside JSX attributes (e.g. `<SelectItem value="italian">`). The current codebase happens to use variable refs at every such site (verified) so the gate exits clean today, but a future contributor adding a literal `value="italian"` will trip the gate even though it is the wire format, not user copy. The plan's filter exclusions cover TS type-literals and array-of-string defaults but not JSX-attribute wire values. (WR-03)

Everything else is informational: minor style/clarity issues, the Plan SUMMARYs' overstatement of cleanup completeness, and forward-compat notes on field naming.

## Warnings

### WR-01: Dual-layer back-compat shim contradicts MVP no-shim posture

**Files:**
- `backend/app/schemas/recipe_turn.py:256-277` (`_coerce_legacy_chips` validator)
- `frontend/components/RecipeThread/SystemBubble.tsx:121-141` (`typeof chip === "string"` branch + `_legacy` short-circuit)
- `frontend/lib/format-field.ts:58-60` (`_legacy` short-circuit)

**Issue:** CLAUDE.md MVP posture is unambiguous: *"No backward-compatibility shims for breaking schema or API changes. Do clean rewrites: drop old column / endpoint / type, add new shape, rewrite callers in the same change. Don't propose 'stub' or 'both-paths-live' variants."* Phase 35 ships **both** a backend `mode='before'` coercion validator (29 LOC + 2 tests) **and** a frontend dual-shape rendering branch (15 LOC). Plan 35-01's SUMMARY justifies the choice ("summary turns are short-lived — re-generated each LLM run"), but the shim is now permanent code that will exist long past the deploy transition. The CLAUDE.md rule has no "unless transient" clause for MVP.

**Risk:** The `_legacy` field name becomes a load-bearing string spread across three files (backend validator, backend tests, frontend formatter, frontend bubble). If a future refactor changes the sentinel, all four sites must be touched. The shim also adds a code path that production traffic stops exercising as soon as the deploy completes — i.e., dead code in a couple of weeks.

**Fix:** Either (a) drop the shim entirely after one canary deploy cycle by running a one-shot Alembic data migration that re-extracts summary turns or deletes pre-Phase-35 ones (clean MVP rewrite), or (b) explicitly mark the shim with `# TODO(productize)` / `// TODO(productize)` per CLAUDE.md "Productize-later TODOs" so it can be ripped out in a follow-up phase. Recommend (a) given the SUMMARY's own claim that legacy chips are "short-lived."

---

### WR-02: `formatFieldChip` emits empty `display` for cleared-list chips

**File:** `frontend/lib/format-field.ts:68-93` (`mood` and `seasonality` cases)

**Issue:** When a previously-set list field is cleared by an extraction (e.g. `recipe.mood = ["comfort"]` → extracted `mood = []`), the backend's `is_conflict` returns True (different sets), so the field enters `changed_fields` and a chip `{field: "mood", value: []}` is emitted. In `formatFieldChip`, `Array.isArray([]) === true` → `[].map(...).join(", ")` returns `""`. `SystemBubble.tsx:137` then renders `"ambiance : "` (label followed by space-colon-space-empty). The chip pill renders but contains only the label, which is visually ambiguous (looks like a stuck placeholder).

**Risk:** Low — visual quality only. Same behavior existed in the legacy `str(val)` code (`", ".join([])` also produces `""`), so this is not a regression. Worth fixing now that the formatter is structured.

**Fix:** Treat an empty array as "no display value" and either skip the chip entirely (preferable — `_run_thread_llm` should be the gate) or render `"—"`:

```ts
case "mood":
  if (Array.isArray(value)) {
    if (value.length === 0) return { label, display: "—" }; // or: signal upstream to skip
    return { label, display: value.map((v) => labels.mood(String(v))).join(", ") };
  }
  return { label, display: labels.mood(String(value)) };
```

Apply the same guard to `seasonality`, `tags`, `steps` (the `steps` case already handles length explicitly).

A more principled fix lives in the backend: extend the chip-emission filter at `llm.py:932-935` to skip fields where `extracted_map[field]` is an empty list, mirroring the `proposed is not None` guard at line 848.

---

### WR-03: `scripts/check-enum-leak.sh` post-filter does not exclude JSX-attribute wire values

**File:** `scripts/check-enum-leak.sh:84-89` (post-filter regex)

**Issue:** The script catches all `[\"']TOKEN[\"']` occurrences and then drops:
- `import` / `from` lines
- comment-only lines
- TS type-literal positions: `: "italian" |` or `as "italian"`
- arrays of ≥2 quoted enum values

But it does **not** drop JSX attribute wire values like `<SelectItem value="italian">` or `<input data-cuisine="italian" />`. These are legitimate wire-format usages (the dropdown value passed to a controlled component, a data attribute carrying the wire key) — not user-facing copy. The current codebase happens to use variable refs at every such site (verified: `RegenerateSheet.tsx` uses `<SelectItem value={c}>`), so the gate exits 0 today. But the first contributor who hardcodes a JSX attribute will trip the gate against legitimate code.

The script header says the precision-over-recall trade-off is deliberate ("If a legitimate use is blocked, tighten regex token-by-token or add a targeted file exclusion"), so this is a documented gap — but the gap is concrete and predictable. A targeted post-filter pass for the JSX-attribute pattern would close it cheaply.

**Risk:** Low (no current code triggers it), but the gate's "false-positive will block CI" failure mode is a paper cut that will land on whoever next edits `RegenerateSheet.tsx` or adds a new Select dropdown.

**Fix:** Add a post-filter pass for `attr="TOKEN"` inside a JSX opening-tag context. Cheap version:

```bash
| grep -v -E '<[A-Za-z][^>]*[[:space:]][a-z][a-zA-Z]*=[\"']('"$TOKENS"')[\"']'
```

Or, more permissively, exclude any quoted-string match preceded by `=` on the same line:

```bash
| grep -v -E '=[\"']('"$TOKENS"')[\"']'
```

The second form would also drop `const x = "italian"` (an actual leak), so the first form (require `<` earlier on the line) is preferred.

---

### WR-04: Plan 35-01 SUMMARY misstates `_FIELD_LABELS_FR` consumer status

**File:** `.planning/phases/35-enum-extraction-leak-sweep/35-01-SUMMARY.md` ("Auto-removed (Rule 3 — clean up)" §2)

**Issue:** The SUMMARY claims `_FIELD_LABELS_FR` was kept in `completeness.py` "for prompt-builder use," but a repo-wide grep shows:
- `completeness.py` only references the symbol in its own docstring (lines 4, 12, 131)
- `_FIELD_PROMPTS_FR` is the actual prompt-builder consumer — separate dict
- The only runtime consumer is now `test_completeness.py:104,338-342`

So `_FIELD_LABELS_FR` is effectively a test fixture as of Phase 35, not a prompt-builder dependency. The SUMMARY's narrative defends keeping a symbol that no production code uses.

**Risk:** Low — the dict is correct (no functional bug); it's just an inaccurate cleanup claim that future readers will trust. It also means a follow-up cleanup phase can safely delete the dict + update the test, but the SUMMARY discourages that read.

**Fix:** Either delete `_FIELD_LABELS_FR` + update `test_completeness.py` (the cleaner move), or update Plan 35-01's SUMMARY to read "retained for test_completeness.py reference; remove in a follow-up cleanup phase." This is a documentation correctness issue, not a code correctness one.

## Info

### IN-01: Drift between backend `_FIELD_LABELS_FR` and frontend `ANSWER_FIELD_LABELS`

**Files:**
- `backend/app/services/completeness.py:131-145` (`_FIELD_LABELS_FR`)
- `frontend/lib/enum-labels.ts:18-32` (`ANSWER_FIELD_LABELS`)

**Issue:** The two maps drift by design now that the backend no longer renders chip labels, but the doc comment at `completeness.py:128` still says *"Mirrors ANSWER_FIELD_LABELS in frontend/lib/enum-labels.ts (drift = bug category)."* They no longer mirror:

| Field | Backend | Frontend |
|---|---|---|
| `prep_time_minutes` | `préparation` | `temps de préparation` |
| `cook_time_minutes` | `cuisson` | `temps de cuisson` |
| `servings` | `personnes` | `nombre de personnes` |
| `main_protein` | `protéine` | `protéine principale` |
| `seasonality` | `saison` | `saisons` |

Since the backend dict no longer drives user-facing copy, the drift is harmless — but the "drift = bug category" comment is now misleading.

**Fix:** Update the `completeness.py:128` docstring to clarify that `_FIELD_LABELS_FR` is no longer a user-facing-label source post-Phase-35 (or delete the dict per WR-04).

---

### IN-02: `ChipPayload.field` is `str` not `AnswerField` Literal — intentional but undefended

**File:** `backend/app/schemas/recipe_turn.py:226`

**Issue:** The docstring at lines 209-213 explains the intent: chip-emission iterates over **all** changed extracted-map keys, so constraining to `AnswerField` would 422 on future fields. Reasonable. But there is no symmetric assertion at the chip-emission site (`llm.py:933`) that the field name is one of the canonical extracted-map keys. A typo in `extracted_map` keys (e.g. `protine` instead of `protein`) would silently emit a chip with the typo'd name and propagate to the frontend.

**Risk:** Very low — `extracted_map`'s keys are static and tested elsewhere.

**Fix:** Optional. Could add a unit test asserting `set(extracted_map.keys()) <= set(ANSWER_FIELDS) | {"tags"}` (or whatever the canonical set is) to catch future typos.

---

### IN-03: `pytest_asyncio` import unused in `test_llm_thread.py` (pre-existing)

**File:** `backend/tests/test_llm_thread.py:25`

**Issue:** `import pytest_asyncio` is unused (decorators come from `@pytest.mark.asyncio`, not the imported module). Pre-existing — not introduced in Phase 35.

**Fix:** Remove the import in a future cleanup. Phase 35 inherited this from `main`.

---

### IN-04: Comment on `chips` widening references "deploy transition"

**File:** `frontend/components/RecipeThread/SystemBubble.tsx:77-83`

**Issue:** The comment block reads *"…frontend handles both [shapes] during the transition; legacy chips fade out as recipes re-extract."* Once Plan 35-01 ships, the transition window is finite. The comment will go stale if/when the shim is removed (see WR-01). Add a date or version reference so future readers know the lifetime.

**Fix:** `// Phase 35 transition; remove this branch after v0.8 (no pre-Phase-35 chips will survive milestone-archival).`

---

### IN-05: `_FIELD_LABELS_FR` removal claimed but symbol exists in `completeness.py`

**File:** `backend/app/services/completeness.py:131`

**Issue:** Plan 35-01 SUMMARY § "Auto-removed (Rule 3)" item 2 says *"Removed dead `_FIELD_LABELS_FR` import from `llm.py`"* — which is correct for `llm.py`. The dict definition still exists in `completeness.py` (which is fine), but readers of the SUMMARY may infer the entire symbol was removed. Minor wording clarity issue. See also WR-04.

**Fix:** Doc-only — clarify in any forward-referenced doc that the import was removed from `llm.py`, the definition remains in `completeness.py`.

---

### IN-06: `formatFieldChip` switch lacks compile-time exhaustiveness for `AnswerField`

**File:** `frontend/lib/format-field.ts:64-139`

**Issue:** The switch is keyed on `field: string` (not `field: AnswerField`) by design — to handle the `_legacy` sentinel and future fields. But that means TypeScript cannot verify all 13 `AnswerField` values are covered. If a 14th `AnswerField` lands in `enums.ts` without an entry here, it silently falls through to `default` (which `String(value)`s the raw value — potentially leaking a raw enum key like `italian` back into the UI).

**Risk:** Low — covered by ENUM-04's grep gate, but only for string-literal positions. A runtime-driven enum leak would slip past the gate.

**Fix:** Add an exhaustiveness helper that the type system enforces, e.g. a separate inner switch on `field as AnswerField` with `default: assertNever(field)`. This adds about 10 LOC; consider for a polish pass.

---

_Reviewed: 2026-05-18T17:18:04Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
