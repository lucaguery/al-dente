---
phase: 260512-lif
plan: 01
type: execute
wave: 1
depends_on: []
subsystem: frontend
tags: [ui, typography, spacing, tokens, tailwind-v4, followup]
requires:
  - frontend/app/globals.css @theme tokens (--spacing-page-x, --spacing-section-y, --spacing-bottom-safe) — added in 260512-l0l
  - frontend/app/globals.css @layer utilities .text-page-header — added in 260512-l0l
provides:
  - Page-chrome rhythm extended into the 5 capture/summary components left out of 260512-l0l
  - Sticky-header register parity on the 3 onboarding pages (create / join / share-code)
affects:
  - frontend/components/VoiceCaptureTab.tsx
  - frontend/components/PhotoCaptureTab.tsx
  - frontend/components/UrlCaptureTab.tsx
  - frontend/components/VoteSummary.tsx
  - frontend/components/CookingLogFinalize.tsx
  - frontend/app/onboarding/create/page.tsx
  - frontend/app/onboarding/join/page.tsx
  - frontend/app/onboarding/share-code/page.tsx
files_modified:
  - frontend/components/VoiceCaptureTab.tsx
  - frontend/components/PhotoCaptureTab.tsx
  - frontend/components/UrlCaptureTab.tsx
  - frontend/components/VoteSummary.tsx
  - frontend/components/CookingLogFinalize.tsx
  - frontend/app/onboarding/create/page.tsx
  - frontend/app/onboarding/join/page.tsx
  - frontend/app/onboarding/share-code/page.tsx
autonomous: true
requirements:
  - QUICK-260512-lif
must_haves:
  truths:
    - "The three capture tabs (Voice / Photo / Url) render with `--spacing-page-x` gutters and `--spacing-section-y` section rhythm — identical to /recipes and /inbox."
    - "Vote summary (both loading-empty branch and main branch) renders with `--spacing-page-x` gutters, `--spacing-bottom-safe` bottom padding, and `--spacing-section-y` section rhythm."
    - "Cooking-log finalize (both loading shell and main) renders with `--spacing-page-x` gutters and `--spacing-bottom-safe` bottom padding."
    - "Onboarding sticky-header titles (`create`, `join` x2, `share-code` if present) read in the Cormorant italic 20px page-header register, matching the sticky headers on /recipes, /inbox, /settings."
    - "No backend / planning / test file is touched; no `next-intl` string, color, or component logic changes."
    - "`cd frontend && npm run build` succeeds with no new TypeScript or ESLint warnings."
  artifacts:
    - path: "frontend/components/VoiceCaptureTab.tsx"
      provides: "Capture tab consuming page-rhythm tokens"
      pattern: "px-\\(--spacing-page-x\\)"
    - path: "frontend/components/PhotoCaptureTab.tsx"
      provides: "Capture tab consuming page-rhythm tokens"
      pattern: "px-\\(--spacing-page-x\\)"
    - path: "frontend/components/UrlCaptureTab.tsx"
      provides: "Capture tab consuming page-rhythm tokens"
      pattern: "px-\\(--spacing-page-x\\)"
    - path: "frontend/components/VoteSummary.tsx"
      provides: "Vote summary consuming page-rhythm tokens (both branches)"
      pattern: "pb-\\(--spacing-bottom-safe\\)"
    - path: "frontend/components/CookingLogFinalize.tsx"
      provides: "Cooking-log finalize consuming page-rhythm tokens (both branches)"
      pattern: "pb-\\(--spacing-bottom-safe\\)"
    - path: "frontend/app/onboarding/create/page.tsx"
      provides: "Sticky-header span lifted to .text-page-header"
      pattern: "text-page-header"
    - path: "frontend/app/onboarding/join/page.tsx"
      provides: "Sticky-header spans (both branches) lifted to .text-page-header"
      pattern: "text-page-header"
    - path: "frontend/app/onboarding/share-code/page.tsx"
      provides: "No sticky-header span exists (no <header> in this file) — VERIFY: if no span, no change needed"
  key_links:
    - from: "frontend/app/globals.css @theme tokens (already defined in 260512-l0l)"
      to: "5 capture/summary components + 3 onboarding pages swept in this plan"
      via: "Tailwind v4 arbitrary-value classes `px-(--spacing-page-x)` / `pb-(--spacing-bottom-safe)` / `gap-(--spacing-section-y)`"
      pattern: "px-\\(--spacing-page-x\\)|pb-\\(--spacing-bottom-safe\\)|gap-\\(--spacing-section-y\\)|text-page-header"
---

<objective>
Follow-up sweep extending the 260512-l0l token system into the components and onboarding-header spans the prior plan explicitly logged as "Out-of-Scope Findings". The token vocabulary already exists in `frontend/app/globals.css` (`--spacing-page-x`, `--spacing-section-y`, `--spacing-bottom-safe`, `.text-page-header`) — DO NOT redefine. This task only converts existing literals to the established tokens, using the EXACT substitution rules from the 260512-l0l PLAN.

Purpose: Close the chrome-consistency gap so capture tabs and summary screens read with the same gutter / bottom clearance / section rhythm as the rest of the app, and so onboarding sticky-header titles share the Cormorant italic page-header register with `/recipes` / `/inbox` / `/settings`.

Output: 8 files modified, pure className refactor, no behavior changes, no string changes, no token changes.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@./CLAUDE.md
@frontend/AGENTS.md
@frontend/app/globals.css
@.planning/quick/260512-l0l-harmonize-typography-and-spacing-across-/260512-l0l-SUMMARY.md
@.planning/quick/260512-l0l-harmonize-typography-and-spacing-across-/260512-l0l-PLAN.md

<interfaces>
<!-- Token vocabulary the executor MUST consume. Defined in 260512-l0l. DO NOT REDEFINE. -->

From frontend/app/globals.css @theme inline (already exists):
```css
--spacing-page-x: 1.5rem;       /* page-level horizontal gutter, replaces px-6 on page chrome */
--spacing-section-y: 1.5rem;    /* inter-section gap on flex/grid page-level stacks, replaces page-level gap-6 */
--spacing-stack-y: 0.75rem;     /* intra-section list density, replaces gap-3 — NOT used in this plan */
--spacing-bottom-safe: 6rem;    /* content clearance above BottomNav, replaces pb-24 */
```

From frontend/app/globals.css @layer utilities (already exists):
```css
.text-page-header {
  font-family: var(--font-display), ui-serif, Georgia, serif;
  font-size: 1.25rem;          /* 20px */
  line-height: 1.2;
  letter-spacing: -0.01em;
  font-weight: 500;
  font-style: italic;
}
```

The Tailwind v4 arbitrary-value syntax (`px-(--spacing-page-x)`) resolves directly to these custom properties — no `tailwind.config.*` is involved. The `.text-page-header` class already locks weight + style + size, so `font-semibold` MUST be dropped when applying it.
</interfaces>

<audit>
**Exact pre-edit findings (verified during planning, against current file contents):**

| File | Line | Current className | Action |
|------|------|-------------------|--------|
| `frontend/components/VoiceCaptureTab.tsx` | 65 | `px-6 pt-6 pb-32 flex flex-col gap-6` | Convert `px-6` + `gap-6`. KEEP `pb-32` (sticky-CTA-bar clearance is deferred per 260512-l0l decisions). |
| `frontend/components/PhotoCaptureTab.tsx` | 114 | `px-6 pt-6 pb-32 flex flex-col gap-6` | Same as above. |
| `frontend/components/UrlCaptureTab.tsx` | 62 | `px-6 pt-6 pb-32 flex flex-col gap-6` | Same as above. |
| `frontend/components/VoteSummary.tsx` | 138 | `flex flex-col flex-1 px-6 pt-6 pb-24 gap-6` (loading-empty branch) | Convert `px-6` + `pb-24` + `gap-6`. |
| `frontend/components/VoteSummary.tsx` | 167 | `flex flex-col flex-1 px-6 pt-6 pb-24 gap-6` (main branch) | Same. |
| `frontend/components/CookingLogFinalize.tsx` | 114 | `flex flex-col flex-1 px-6 pt-6 pb-24 gap-4` (loading shell) | Convert `px-6` + `pb-24`. **KEEP `gap-4`** — it's a loading-pulse density, not a page-section rhythm, and there's no `--spacing-stack-y` for `gap-4`. |
| `frontend/components/CookingLogFinalize.tsx` | 138 | `flex flex-col flex-1 px-6 pt-6 pb-24 gap-8` (main) | Convert `px-6` + `pb-24`. **KEEP `gap-8`** — explicitly larger than the section rhythm; deliberate for the finalize page's sparse stack. |
| `frontend/app/onboarding/create/page.tsx` | 86 | `<span className="text-base font-semibold">{t("title")}</span>` (sticky header) | Replace with `<span className="text-page-header">{t("title")}</span>`. Drop `font-semibold`. |
| `frontend/app/onboarding/join/page.tsx` | 200 | Same span (HOUSEHOLD_FULL branch sticky header) | Same change. |
| `frontend/app/onboarding/join/page.tsx` | 239 | Same span (happy-path sticky header) | Same change. |
| `frontend/app/onboarding/share-code/page.tsx` | — | **NO sticky `<header>` exists** in this file (the page is a single hero `<section>` + a fixed bottom CTA bar). The `<h1>` on line 51 already uses `text-display`. **No header-span change needed for share-code.** The title in the constraints brief referenced the 4-occurrence count from the 260512-l0l SUMMARY, but verification against current file contents shows share-code has no sticky-header `<span>`. Task 2 will VERIFY this with grep and skip if absent. |

**Total expected text-page-header insertions: 3 (not 4).** create:1 + join:2 + share-code:0.

**RegenerateSheet.tsx explicitly SKIPPED** — Sheet-body context, not page chrome (decision locked in constraints).
</audit>

<tasks>

<task type="auto">
  <name>Task 1: Component sweep — apply tokens to 5 capture/summary components</name>
  <files>frontend/components/VoiceCaptureTab.tsx, frontend/components/PhotoCaptureTab.tsx, frontend/components/UrlCaptureTab.tsx, frontend/components/VoteSummary.tsx, frontend/components/CookingLogFinalize.tsx</files>
  <action>
Apply the 260512-l0l substitution rules to the 5 components below. Touch ONLY className strings — no JSX structure changes, no logic, no i18n string changes, no color changes.

**Per-file changes (verbatim — use Edit tool with the OLD-STRING / NEW-STRING shown):**

1. **`frontend/components/VoiceCaptureTab.tsx` line 65** — capture-tab page-chrome wrapper.
   - OLD: `<div className="px-6 pt-6 pb-32 flex flex-col gap-6">`
   - NEW: `<div className="px-(--spacing-page-x) pt-6 pb-32 flex flex-col gap-(--spacing-section-y)">`
   - Notes: `pb-32` STAYS — this tab lives under `recipes/new`'s sticky-CTA bar context (see 260512-l0l decisions; productize-later token). `pt-6` STAYS (no top-padding token in vocabulary).

2. **`frontend/components/PhotoCaptureTab.tsx` line 114** — same shape.
   - OLD: `<div className="px-6 pt-6 pb-32 flex flex-col gap-6">`
   - NEW: `<div className="px-(--spacing-page-x) pt-6 pb-32 flex flex-col gap-(--spacing-section-y)">`
   - DO NOT touch the inner `<h2 className="text-xl font-semibold">{t("empty_heading")}</h2>` on line 116 — the 260512-l0l SUMMARY explicitly says "Surviving `text-xl font-semibold` instances (PhotoCaptureTab line 116, RegenerateSheet line 94) live inside Sheet bodies / empty-state Cards — Card-internal, NOT page chrome, NOT in plan scope." Same boundary holds here. Touch ONLY the page-chrome wrapper on line 114.

3. **`frontend/components/UrlCaptureTab.tsx` line 62** — same shape.
   - OLD: `<div className="px-6 pt-6 pb-32 flex flex-col gap-6">`
   - NEW: `<div className="px-(--spacing-page-x) pt-6 pb-32 flex flex-col gap-(--spacing-section-y)">`

4. **`frontend/components/VoteSummary.tsx` line 138** (loading-empty branch — `rows.length === 0` short-circuit).
   - OLD: `<div className="flex flex-col flex-1 px-6 pt-6 pb-24 gap-6">`
   - NEW: `<div className="flex flex-col flex-1 px-(--spacing-page-x) pt-6 pb-(--spacing-bottom-safe) gap-(--spacing-section-y)">`

5. **`frontend/components/VoteSummary.tsx` line 167** (main branch — the active vote summary).
   - OLD: `<div className="flex flex-col flex-1 px-6 pt-6 pb-24 gap-6">`
   - NEW: `<div className="flex flex-col flex-1 px-(--spacing-page-x) pt-6 pb-(--spacing-bottom-safe) gap-(--spacing-section-y)">`
   - DO NOT touch the row-list `<div className="flex flex-col gap-3">` on line 170 — that's intra-section list density, intentionally a different rhythm.

6. **`frontend/components/CookingLogFinalize.tsx` line 114** (loading shell).
   - OLD: `<main className="flex flex-col flex-1 px-6 pt-6 pb-24 gap-4">`
   - NEW: `<main className="flex flex-col flex-1 px-(--spacing-page-x) pt-6 pb-(--spacing-bottom-safe) gap-4">`
   - KEEP `gap-4` — loading-pulse density (not a page-section rhythm), no token equivalent.

7. **`frontend/components/CookingLogFinalize.tsx` line 138** (main).
   - OLD: `<main className="flex flex-col flex-1 px-6 pt-6 pb-24 gap-8">`
   - NEW: `<main className="flex flex-col flex-1 px-(--spacing-page-x) pt-6 pb-(--spacing-bottom-safe) gap-8">`
   - KEEP `gap-8` — deliberately wider than the section rhythm (sparse finalize layout). No re-tokenization.

**Hard constraints (re-read before each edit):**
- DO NOT touch `RegenerateSheet.tsx` — explicitly skipped (Sheet body, not page chrome).
- DO NOT touch any inner `<Card>`, `<Sheet>`, `<Dialog>`, or row className — only the outermost page-chrome wrapper on the exact line listed.
- DO NOT redefine or modify tokens in `globals.css` — they already exist (verified pre-edit).
- DO NOT introduce `--spacing-sticky-cta-y` — `pb-32` stays literal per 260512-l0l decisions.
- DO NOT change `next-intl` strings, color tokens, or component logic.
- DO NOT add dependencies.
- DO NOT touch backend / planning / test files.
- DO NOT change the `<h2 className="text-xl font-semibold">` on PhotoCaptureTab:116 — it's inside the empty-state Card body, NOT page chrome.

**After all 7 edits, run the post-edit grep to confirm no `px-6 pt-6 pb-{24|32}` page-chrome wrapper remains in these 5 files** (allowed remnants: Card-internal `px-6 py-6`, row `px-3 py-3`, etc.):
```
grep -nE 'px-6 pt-6 pb-(24|32)' frontend/components/VoiceCaptureTab.tsx frontend/components/PhotoCaptureTab.tsx frontend/components/UrlCaptureTab.tsx frontend/components/VoteSummary.tsx frontend/components/CookingLogFinalize.tsx
```
Expected: 0 hits.

And confirm token adoption count climbed:
```
grep -cE 'px-\(--spacing-page-x\)|pb-\(--spacing-bottom-safe\)|gap-\(--spacing-section-y\)' frontend/components/VoiceCaptureTab.tsx frontend/components/PhotoCaptureTab.tsx frontend/components/UrlCaptureTab.tsx frontend/components/VoteSummary.tsx frontend/components/CookingLogFinalize.tsx
```
Expected: VoiceCaptureTab ≥ 2, PhotoCaptureTab ≥ 2, UrlCaptureTab ≥ 2, VoteSummary ≥ 6 (2 branches × 3 tokens), CookingLogFinalize ≥ 4 (2 branches × 2 tokens — gap kept literal).
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/frontend && (grep -nE 'px-6 pt-6 pb-(24|32)' components/VoiceCaptureTab.tsx components/PhotoCaptureTab.tsx components/UrlCaptureTab.tsx components/VoteSummary.tsx components/CookingLogFinalize.tsx; echo "---"; grep -cE 'px-\(--spacing-page-x\)' components/VoiceCaptureTab.tsx components/PhotoCaptureTab.tsx components/UrlCaptureTab.tsx components/VoteSummary.tsx components/CookingLogFinalize.tsx) | tee /tmp/lif-task1-grep.txt && (! grep -E 'px-6 pt-6 pb-(24|32)' /tmp/lif-task1-grep.txt) && echo "TASK1 OK"</automated>
  </verify>
  <done>
- Each of the 5 component files has the outermost page-chrome wrapper converted at the line listed.
- `grep -nE 'px-6 pt-6 pb-(24|32)' frontend/components/{VoiceCaptureTab,PhotoCaptureTab,UrlCaptureTab,VoteSummary,CookingLogFinalize}.tsx` returns 0 hits.
- `grep -E 'px-\(--spacing-page-x\)' frontend/components/{VoiceCaptureTab,PhotoCaptureTab,UrlCaptureTab,VoteSummary,CookingLogFinalize}.tsx` returns ≥ 1 hit per file (5 files → ≥ 5 lines).
- `RegenerateSheet.tsx` was NOT touched (`git diff --stat` confirms).
- No `<Card>` / `<Sheet>` / inner row className changed — only the outermost page-chrome wrapper on the listed lines.
- `cd frontend && npm run build` succeeds (gated by Task 2's final build verification).
  </done>
</task>

<task type="auto">
  <name>Task 2: Onboarding sticky-header register — lift title spans to .text-page-header + final build verification</name>
  <files>frontend/app/onboarding/create/page.tsx, frontend/app/onboarding/join/page.tsx, frontend/app/onboarding/share-code/page.tsx</files>
  <action>
Lift the sticky-header title spans in the onboarding flow to the `.text-page-header` register so they match `/recipes` / `/inbox` / `/settings` / `/recipes/[id]` / `/recipes/new` — the 5 pages where 260512-l0l locked the register. The substitution mirrors Rule 5 of the 260512-l0l PLAN (RecipeForm sticky-header span pattern).

**Per-file changes:**

1. **`frontend/app/onboarding/create/page.tsx` line 86** — the only sticky-header title span in this file.
   - OLD: `<span className="text-base font-semibold">{t("title")}</span>`
   - NEW: `<span className="text-page-header">{t("title")}</span>`
   - The `font-semibold` is DROPPED because `.text-page-header` already locks weight/size/style (per 260512-l0l Task 1's definition: `font-weight: 500; font-style: italic;`). Re-applying `font-semibold` would override the utility's 500 to 600.

2. **`frontend/app/onboarding/join/page.tsx` line 200** — HOUSEHOLD_FULL branch sticky-header title span.
   - OLD: `<span className="text-base font-semibold">{t("title")}</span>`
   - NEW: `<span className="text-page-header">{t("title")}</span>`

3. **`frontend/app/onboarding/join/page.tsx` line 239** — happy-path sticky-header title span.
   - OLD: `<span className="text-base font-semibold">{t("title")}</span>`
   - NEW: `<span className="text-page-header">{t("title")}</span>`

4. **`frontend/app/onboarding/share-code/page.tsx`** — VERIFY before changing.
   Per the planner's audit (verified against current file contents), share-code has NO sticky `<header>` and therefore NO `<span className="text-base font-semibold">` to convert. The page-level title on line 51 is already `<h1 className="text-display">` (the editorial display register, which is correct — it's a hero, not a sticky-header label).
   - REQUIRED CHECK before any edit:
     ```
     grep -n "text-base font-semibold" frontend/app/onboarding/share-code/page.tsx
     ```
     - If output is empty (expected): NO change needed. Skip this file.
     - If a sticky-header span IS found: apply the same `text-base font-semibold` → `text-page-header` substitution at that line.

**Hard constraints:**
- DO NOT change `<h2 className="text-display">` titles inside the form-body Cards (lines 94, 205, 246 in create/join — those are editorial Card titles, deliberately distinct from the sticky-chrome label).
- DO NOT touch the sticky-header `px-(--spacing-page-x)` / `pt-6` / `pb-32` / floating-CTA `px-(--spacing-page-x)` — those were already tokenized by 260512-l0l (verified pre-edit).
- DO NOT change `next-intl` keys or any user-facing text.
- DO NOT touch the back-button `<ChevronLeft />`, `aria-label`, `w-12` spacer, or any other header sibling.
- ONLY the listed `<span>` elements change.

**Post-edit verification (run all four):**

```
# 1. Sticky-header onboarding spans should now use the page-header register.
grep -rn "text-page-header" frontend/app/onboarding/
# Expected: 3 hits (create:1, join:2, share-code:0).

# 2. No `text-base font-semibold` should remain on sticky-header onboarding spans.
#    (Note: other `text-base font-semibold` usages may legitimately remain on
#     NON-sticky elements — e.g. row titles in VoteSummary line 177, Card-internal
#     headings elsewhere. Only the sticky-header onboarding spans are in scope.)
grep -n "text-base font-semibold" frontend/app/onboarding/create/page.tsx frontend/app/onboarding/join/page.tsx frontend/app/onboarding/share-code/page.tsx
# Expected: 0 hits in these three files (create + join + share-code).

# 3. Token adoption count rose across the 8 files in scope.
grep -rcE 'px-\(--spacing-page-x\)|pb-\(--spacing-bottom-safe\)|gap-\(--spacing-section-y\)|text-page-header' frontend/components/VoiceCaptureTab.tsx frontend/components/PhotoCaptureTab.tsx frontend/components/UrlCaptureTab.tsx frontend/components/VoteSummary.tsx frontend/components/CookingLogFinalize.tsx frontend/app/onboarding/create/page.tsx frontend/app/onboarding/join/page.tsx frontend/app/onboarding/share-code/page.tsx
# Expected: total ≥ 18 (Voice 2 + Photo 2 + Url 2 + VoteSummary 6 + CookingLogFinalize 4 + create 1 + join 2 + share-code 0).

# 4. Build clean.
cd frontend && npm run build 2>&1 | tail -30 | grep -E "Compiled successfully|Failed to compile"
# Expected: "✓ Compiled successfully ..." line. No "Failed to compile".
```

  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente && (grep -n "text-base font-semibold" frontend/app/onboarding/create/page.tsx frontend/app/onboarding/join/page.tsx frontend/app/onboarding/share-code/page.tsx; echo "EXPECT-EMPTY") | tee /tmp/lif-task2-grep.txt && (! grep -E '^frontend/app/onboarding/.*text-base font-semibold' /tmp/lif-task2-grep.txt) && (cd frontend && npm run build 2>&1 | tail -30 | grep -q "Compiled successfully") && echo "TASK2 OK"</automated>
  </verify>
  <done>
- `frontend/app/onboarding/create/page.tsx` line 86 span uses `text-page-header`.
- `frontend/app/onboarding/join/page.tsx` lines 200 and 239 spans use `text-page-header`.
- `frontend/app/onboarding/share-code/page.tsx` is unchanged unless a sticky-header span was found (verified via grep — expected: none).
- `grep -rn "text-base font-semibold" frontend/app/onboarding/{create,join,share-code}/page.tsx` returns 0 hits.
- `cd frontend && npm run build` exits 0 with "Compiled successfully" — no new TypeScript or ESLint warnings introduced by these files.
- `git diff --stat` shows exactly 8 files changed (5 components + 3 onboarding pages); RegenerateSheet.tsx is NOT in the diff.
- No `next-intl` string changed, no logic changed, no dependency added.
- No `backend/`, `.planning/` (other than this plan's output), or `tests/` file touched.
  </done>
</task>

</tasks>

<verification>
**Build:** `cd frontend && npm run build` succeeds. The webpack build (per CLAUDE.md note — `next build --webpack` is intentional, not Turbopack) emits no new TypeScript or ESLint errors.

**Adoption grep:**
```
cd /Users/gulu3001/dev/al-dente
grep -rcE 'px-\(--spacing-page-x\)|pb-\(--spacing-bottom-safe\)|gap-\(--spacing-section-y\)|text-page-header' \
  frontend/components/VoiceCaptureTab.tsx \
  frontend/components/PhotoCaptureTab.tsx \
  frontend/components/UrlCaptureTab.tsx \
  frontend/components/VoteSummary.tsx \
  frontend/components/CookingLogFinalize.tsx \
  frontend/app/onboarding/create/page.tsx \
  frontend/app/onboarding/join/page.tsx \
  frontend/app/onboarding/share-code/page.tsx
```
Expected total ≥ 18.

**Outlier closure:**
```
grep -nE 'px-6 pt-6 pb-(24|32)' \
  frontend/components/VoiceCaptureTab.tsx \
  frontend/components/PhotoCaptureTab.tsx \
  frontend/components/UrlCaptureTab.tsx \
  frontend/components/VoteSummary.tsx \
  frontend/components/CookingLogFinalize.tsx
# → 0 hits

grep -n "text-base font-semibold" \
  frontend/app/onboarding/create/page.tsx \
  frontend/app/onboarding/join/page.tsx \
  frontend/app/onboarding/share-code/page.tsx
# → 0 hits
```

**Scope-lock:**
```
git diff --name-only
# Expected exactly:
#   frontend/components/VoiceCaptureTab.tsx
#   frontend/components/PhotoCaptureTab.tsx
#   frontend/components/UrlCaptureTab.tsx
#   frontend/components/VoteSummary.tsx
#   frontend/components/CookingLogFinalize.tsx
#   frontend/app/onboarding/create/page.tsx
#   frontend/app/onboarding/join/page.tsx
# (+ frontend/app/onboarding/share-code/page.tsx ONLY if a sticky-header span was found there)

# RegenerateSheet.tsx must NOT appear:
git diff --name-only | grep RegenerateSheet
# → 0 hits
```

**Functional spot-check (manual, < 60s — not blocking):**
1. `cd frontend && npm run dev`
2. Open `/recipes/new`, switch through the Rapide / Voice / Photo / Url tabs at 390px-wide viewport. Confirm left/right gutters match `/recipes` and `/inbox`.
3. Open the home Decide layer when a shortlist exists. Confirm the VoteSummary section gutters match.
4. Open `/cooking-logs/<id>` finalize flow (or visit when one is pending). Confirm gutters + bottom clearance match.
5. Walk through `/onboarding/welcome` → `create` → `share-code` and `/onboarding/welcome` → `join`. Confirm sticky-header titles read in Cormorant italic 20px (no more `text-base font-semibold` sans-serif outlier).
</verification>

<success_criteria>
- [ ] 5 component files (`VoiceCaptureTab`, `PhotoCaptureTab`, `UrlCaptureTab`, `VoteSummary`, `CookingLogFinalize`) have their outermost page-chrome wrappers converted to tokens at the audit-listed lines.
- [ ] `VoteSummary.tsx` and `CookingLogFinalize.tsx` BOTH branches converted (loading-empty + main for VoteSummary; loading shell + main for CookingLogFinalize).
- [ ] `pb-32` literals KEPT in VoiceCaptureTab / PhotoCaptureTab / UrlCaptureTab (sticky-CTA-bar clearance — productize-later per 260512-l0l decisions).
- [ ] `gap-4` and `gap-8` literals KEPT in CookingLogFinalize (loading-pulse density / sparse-section density — no token equivalent).
- [ ] 3 onboarding sticky-header title spans (create:1 + join:2) lifted to `.text-page-header`; `font-semibold` DROPPED.
- [ ] `share-code/page.tsx` unchanged unless verification grep finds a sticky-header span (expected: none).
- [ ] `RegenerateSheet.tsx` NOT touched (explicitly out of scope — Sheet body, not page chrome).
- [ ] No `globals.css` change — tokens already exist.
- [ ] No `tailwind.config.*` introduced — Tailwind v4 reads `@theme` directly.
- [ ] `cd frontend && npm run build` succeeds with no new warnings.
- [ ] No `next-intl` string changed, no color/logic change, no dependency added.
- [ ] No `backend/`, `tests/`, or `.planning/` file (other than this plan's SUMMARY output) touched.
- [ ] `git diff --name-only` lists exactly the 7-or-8 expected files.
</success_criteria>

<output>
After completion, create `.planning/quick/260512-lif-harmonize-capture-tab-summary-components/260512-lif-SUMMARY.md` with:
- Files touched (count + list)
- Before/after gutter + bottom-padding consistency stats (grep counts)
- One-line visual delta (capture tabs + vote summary + cooking-log finalize + onboarding sticky headers now share chrome with the 260512-l0l 14-file baseline)
- Any deferred concern carried forward (sticky-CTA-bar `pb-32` literal remains a productize-later candidate; RegenerateSheet Sheet-vs-page-chrome disposition deferred)
- Self-check confirming RegenerateSheet.tsx + globals.css were NOT modified
</output>
