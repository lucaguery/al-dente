---
phase: 06-capture-surfaces-polish
plan: 03
subsystem: capture-surfaces
tags: [phase-6, capture, quick-add, full-form, paper-grain, tap-target, h-12]
requires:
  - Phase 5 Card primitive (paper-grain baked in via card.tsx:15)
  - Phase 5 Button primitive (h-12 + active:translate-y-px + ease-craft)
  - Phase 5 design tokens (shadow-card, --primary terracotta)
provides:
  - "Quick-add photo-picker wrapped in paper-grain Card surface"
  - "Quick-add submit at 48px tap-target floor (h-12)"
  - "Full-form submit at 48px tap-target floor (h-12)"
affects:
  - frontend/app/recipes/new/page.tsx (Quick-add tab body + submit bar)
  - frontend/components/RecipeForm.tsx (Complète tab submit bar)
tech_stack:
  added: []
  patterns:
    - "Paper-grain Card wrapper around native <input type='file'> for visual cohesion"
    - "h-12 (48px) tap-target floor on every primary CTA per D-08"
key_files:
  created: []
  modified:
    - frontend/app/recipes/new/page.tsx
    - frontend/components/RecipeForm.tsx
decisions:
  - "Apply `paper-grain` explicitly to className for grep-traceability even though Phase 5 Card primitive bakes it in (idempotent, per UI-SPEC §'Implementation hint')"
  - "Preserve native <input type='file'> in Quick-add (D-Quick-Add architectural lock — PhotoUploader requires post-save recipe id)"
  - "Skip <Card>-per-section refactor in RecipeForm (UI-SPEC §'Surface 4' explicitly says: existing structural choice — not Phase 6 scope)"
metrics:
  duration: "~5 minutes"
  tasks: 2
  files_modified: 2
  commits: 2
  completed: 2026-05-08
---

# Phase 06 Plan 03: Quick-Add + Full-Form Re-Theme Summary

**One-liner:** Wrapped the Quick-add photo-picker row in a paper-grain Card surface and raised both the Quick-add and Full-form submit buttons from `h-11` to `h-12` (48px D-08 tap-target floor) — closes CAPTURE-08 + CAPTURE-09 with surgical, two-file edits.

---

## What Changed

### Task 1 — `frontend/app/recipes/new/page.tsx` (commit `027292a`)

Three targeted edits inside the Quick-add tab body. Sticky header (line 139) and 5-tab `TabsList` (lines 153–169) untouched — they already inherit Phase 5 token consumption.

1. **Card import added** (line 22):
   ```diff
    import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
    import { Button } from "@/components/ui/button";
   +import { Card } from "@/components/ui/card";
    import { Input } from "@/components/ui/input";
    import { Label } from "@/components/ui/label";
   ```

2. **Photo-picker block wrapped in paper-grain Card** (lines 187–201):
   ```diff
   -        <div className="flex flex-col gap-1.5">
   +        <Card className="paper-grain shadow-card p-4 flex flex-col gap-1.5">
              <Label htmlFor="quick-photo">{tPhoto("add_label")}</Label>
              <input id="quick-photo" type="file" accept="image/*" ... />
              {quickPhoto != null && (<p>{quickPhoto.name}</p>)}
   -        </div>
   +        </Card>
   ```
   Comment extended: `Phase 6 (CAPTURE-08): wrap in paper-grain Card so the row reads as a recipe-card-on-the-counter alongside the form.`
   The native `<input type="file">` and `quickPhoto.name` paragraph are byte-for-byte identical. The `file:bg-secondary file:text-secondary-foreground` Tailwind selectors continue to resolve to warm-taupe under Phase 5 tokens.

3. **Quick-add submit raised to h-12** (line 204):
   ```diff
            <Button
   -          className="h-11 w-full"
   +          className="h-12 w-full"
              disabled={!quickTitle.trim() || quickStage !== null}
              onClick={submitQuick}
            >
   ```
   Three-state copy (`submit_quick` / `saving` / `uploading_photo`) and `<Loader2>` prefix preserved verbatim.

### Task 2 — `frontend/components/RecipeForm.tsx` (commit `71214cc`)

Single targeted edit on the sticky-bottom submit Button. Form structural choices (`flex flex-col gap-6 px-6 pt-6 pb-32` outer, `gap-1.5` label+input pairs, `grid grid-cols-2 gap-4` prep+servings) confirmed unchanged via grep audit — already match UI-SPEC §"Surface 4" contract.

```diff
       <Button
-        className="h-11 w-full"
+        className="h-12 w-full"
         disabled={!v.title.trim() || submitting}
         onClick={handleSubmit}
       >
```

`handleSubmit` and form-state machinery preserved byte-for-byte. Mood / Seasonality `<Button size="sm">` toggle chips left at small size (existing toggle-chip exception per UI-SPEC).

---

## Grep Proof

```bash
# Card import + paper-grain wrapper on Quick-add
$ grep -n 'import { Card }' frontend/app/recipes/new/page.tsx
22: import { Card } from "@/components/ui/card";

$ grep -n 'paper-grain shadow-card p-4' frontend/app/recipes/new/page.tsx
190:        <Card className="paper-grain shadow-card p-4 flex flex-col gap-1.5">

# h-12 floor on both submits, 0 h-11 legacy
$ grep -n 'h-12 w-full' frontend/app/recipes/new/page.tsx frontend/components/RecipeForm.tsx
frontend/app/recipes/new/page.tsx:207:            className="h-12 w-full"
frontend/components/RecipeForm.tsx:363:        className="h-12 w-full"

$ grep -n 'h-11 w-full' frontend/app/recipes/new/page.tsx frontend/components/RecipeForm.tsx
(no output — 0 hits)

# Sticky header structurally unchanged
$ grep -n 'sticky top-0 z-10 h-12 px-6' frontend/app/recipes/new/page.tsx
139:      <header className="sticky top-0 z-10 h-12 px-6 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border">

# 5-tab TabsList preserved (5 triggers, flex-1 min-w-[64px])
$ grep -c 'flex-1 min-w-\[64px\]' frontend/app/recipes/new/page.tsx
5

# No new i18n keys
$ git diff frontend/lib/i18n/fr.json
(no diff)
```

---

## Architectural Locks Honored

- **D-Quick-Add (native picker):** Preserved. The pre-save flow remains `POST /recipes/quick → returned id → POST /recipes/{id}/photos`. PhotoUploader was NOT introduced into Quick-add — it requires a recipe id which only exists post-save. The Card wrapper is purely visual cohesion; `submitQuick` (lines 67–116) is byte-for-byte unchanged.
- **No `?tab=` deep-link:** Existing `// TODO(productize)` line 51 preserved.
- **No `<Card>` per-section in RecipeForm:** UI-SPEC §"Surface 4" explicitly says "If the executor finds NO `<Card>` in the current `RecipeForm.tsx`, that means the form has never used Card-per-section structure — that's an existing structural choice, NOT something Phase 6 changes." Confirmed via `grep -c '<Card' frontend/components/RecipeForm.tsx` = 0; no Card wrappers added.
- **Toggle chips (`size="sm"`) preserved:** Mood / Seasonality buttons stay at the smaller size — toggle-chip exception is implicit in UI-SPEC §"Spacing exceptions".

---

## Deviations from Plan

None — plan executed exactly as written. Both tasks landed with surgical edits matching the plan's diff specifications byte-for-byte.

---

## Verification

### Automated grep checks (passed)

| Check | Expected | Actual |
|-------|----------|--------|
| `import { Card }` in page.tsx | ≥1 | 1 |
| `paper-grain shadow-card p-4` in page.tsx | =1 | 1 |
| `h-12 w-full` in page.tsx + RecipeForm.tsx | ≥2 | 2 |
| `h-11 w-full` in page.tsx + RecipeForm.tsx | =0 | 0 |
| `sticky top-0 z-10 h-12 px-6` in page.tsx | =1 | 1 |
| `flex-1 min-w-[64px]` in page.tsx | ≥5 | 5 |
| `flex flex-col gap-6 px-6 pt-6 pb-32` in RecipeForm.tsx | ≥1 | 1 |
| Diff to `fr.json` | none | none |

### Lint

`npx eslint frontend/app/recipes/new/page.tsx frontend/components/RecipeForm.tsx` → **No issues found.**

### Build

Skipped at this plan boundary — sibling parallel agents (06-01..06-06) have other capture-surface files mid-flight in the working tree; a full `npm run build` would surface their unrelated in-progress state. Out of Rule 3 scope. Build will be run by the orchestrator's verifier after the wave completes.

### Real-device smoke test

Deferred to phase-level UAT (`/recipes/new` Quick-add tab + Complète tab). The two changes are visually subtle (4px button growth + paper-grain noise on a wrapping card) and will be observed alongside the rest of Phase 6 surfaces during the phase-close smoke test described in `06-UI-SPEC.md` §"Real-device smoke test".

---

## Requirements Closed

- **CAPTURE-08** Quick-add capture surface re-themed with new tokens — paper-grain Card wraps photo-picker; submit at h-12; Phase 5 token inheritance verified.
- **CAPTURE-09** Full-form capture surface re-themed with new tokens — submit at h-12; section spacing audit confirmed unchanged (already matched UI-SPEC).

---

## Commits

| Commit | Task | Files |
|--------|------|-------|
| `027292a` | Task 1 — Quick-add photo-picker Card wrap + h-12 submit | `frontend/app/recipes/new/page.tsx` |
| `71214cc` | Task 2 — RecipeForm submit raised to h-12 | `frontend/components/RecipeForm.tsx` |

---

## Self-Check: PASSED

**Files modified (2):**
- `frontend/app/recipes/new/page.tsx` — FOUND
- `frontend/components/RecipeForm.tsx` — FOUND

**Commits (2):**
- `027292a` — FOUND in `git log` (`feat(06-03): wrap Quick-add photo-picker in paper-grain Card and raise submit to h-12`)
- `71214cc` — FOUND in `git log` (`feat(06-03): raise RecipeForm submit button from h-11 to h-12`)

**Acceptance grep (re-run at SUMMARY time):**
- 1 hit for `import { Card }` ✓
- 1 hit for `paper-grain shadow-card p-4` ✓
- 2 hits for `h-12 w-full` (one per file) ✓
- 0 hits for `h-11 w-full` ✓
- 1 hit for sticky-header pattern ✓
- 5 hits for tab-trigger pattern ✓
- 0 i18n diff ✓
