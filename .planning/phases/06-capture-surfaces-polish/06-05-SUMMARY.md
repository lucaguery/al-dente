---
phase: 06-capture-surfaces-polish
plan: 05
subsystem: frontend
tags: [phase-6, capture-surfaces, photo-uploader, photo-capture-tab, w4-closure, capture-11, paper-grain, terracotta, hit-pad]
requirements: [CAPTURE-11]
dependency_graph:
  requires:
    - "Phase 5 paper-grain utility (.paper-grain CSS class)"
    - "Phase 5 terracotta primary token (--primary)"
    - "Phase 5 Button primitive (h-12 className override → 48px)"
    - "Phase 5 Sheet primitive (paper-grain'd SheetContent)"
  provides:
    - "PhotoUploader sheet at 48px tap-target floor (CAPTURE-11 W4 closure)"
    - "PhotoCaptureTab sheet at 48px + submit at 48px"
    - "X-overlay 48px hit pad via ::before pseudo (28px visible chrome preserved)"
    - "Plus add-tile reads as a blank recipe card (paper-grain + terracotta-30 dashed border)"
  affects:
    - "frontend/components/PhotoUploader.tsx"
    - "frontend/components/PhotoCaptureTab.tsx"
tech_stack:
  added: []
  patterns:
    - "::before pseudo-element for invisible 48px hit pad expansion (Tailwind v4 `before:absolute before:-inset-2.5 before:content-['']`)"
    - "paper-grain on add-tile button surface (utility class composition)"
    - "border-primary/30 (30% alpha terracotta) for faint card-slot affordance"
key_files:
  created: []
  modified:
    - "frontend/components/PhotoUploader.tsx (2 className edits — Plus tile + X overlay)"
    - "frontend/components/PhotoCaptureTab.tsx (4 className edits — Plus tile + X overlay + 2 sheet buttons + bottom submit)"
decisions:
  - "Visible X-overlay chrome bumped to h-7 w-7 (28px) per UI-SPEC §Spacing exceptions — restraint over button-on-photo dominance"
  - "Hit pad via ::before pseudo (not sibling element) — pseudo doesn't enter React tree, no key/onClick re-route needed (UI-SPEC §X-overlay hit-pad implementation)"
  - "Plus tile dashed border at border-primary/30 alpha — full alpha would compete with primary CTAs (UI-SPEC §Plus-tile dashed-border alpha)"
  - "PhotoUploader sheet buttons already at h-12 in baseline (Phase 5 deferral or earlier polish): defensive verification kept the W4 closure grep-provable regardless of state"
metrics:
  duration: "2m"
  tasks_completed: 2
  files_modified: 2
  commits: 2
  completed_date: "2026-05-08"
---

# Phase 6 Plan 5: PhotoUploader + PhotoCaptureTab — CAPTURE-11 W4 closure

Re-themed both photo capture surfaces to the Phase 5 Slow Food artisanal system AND closed the W4 UI-REVIEW tap-target gap (CAPTURE-11): Plus add-tile now reads as a blank paper recipe card waiting for content (paper-grain + terracotta-30 dashed border), the filled-tile X overlay keeps a small 28px visible chrome but expands to a 48px square hit area via a `::before` pseudo, and every sheet/submit button across both files now sits at `h-12` (48px D-08 floor).

## What Changed

### Task 1 — `frontend/components/PhotoUploader.tsx` (commit `83cead1`)

Two surgical className edits, business logic byte-for-byte unchanged.

**Plus add-tile** (line 218):
```diff
- className="h-24 w-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center disabled:opacity-50"
+ className="paper-grain h-24 w-24 rounded-lg border-2 border-dashed border-primary/30 flex items-center justify-center disabled:opacity-50"
```

**Filled-tile X overlay** (line 203):
```diff
- className="absolute top-1 right-1 h-6 w-6 rounded-full bg-foreground/80 text-background flex items-center justify-center"
+ className="absolute top-1 right-1 h-7 w-7 rounded-full bg-foreground/80 text-background flex items-center justify-center before:absolute before:-inset-2.5 before:content-['']"
```

**Sheet action buttons** (lines 230, 238): already at `h-12` in baseline — verified, no edit needed. CAPTURE-11 W4 closure is grep-provable.

### Task 2 — `frontend/components/PhotoCaptureTab.tsx` (commit `d4e8d50`)

Four className edits, file-state machinery (`addFile`, `removeFile`, `submit`, `useMemo` previews, 18 MB cap) byte-for-byte unchanged.

**Plus add-tile** (line 158): same paper-grain + border-primary/30 swap as PhotoUploader.

**Filled-tile X overlay** (line 143): same h-7 w-7 + before:-inset-2.5 + before:content-[''] expansion as PhotoUploader (note: this surface uses `removeFile(slot.idx)` instead of `removePhoto(slot.path)` — that's a PhotoCaptureTab vs PhotoUploader business-logic difference, preserved).

**Sheet Caméra button** (line 170): `h-11` → `h-12`.

**Sheet Photothèque button** (line 178): `h-11` → `h-12`.

**Bottom submit button** (line 221): `h-11 w-full` → `h-12 w-full`.

## Verification

### Grep proof (cross-file)

| Check | Pattern | Expected | Actual |
|---|---|---|---|
| Plus tile re-themed | `paper-grain.*border-primary/30` | ≥2 (one per file) | 2 (PhotoUploader L218, PhotoCaptureTab L158) |
| X-overlay 28px visible + 48px hit pad | `h-7 w-7.*before:absolute before:-inset-2.5` | ≥2 | 2 (PhotoUploader L203, PhotoCaptureTab L143) |
| h-12 hits across both files | `"h-12"` or `h-12 w-full` | ≥5 (PU sheet ×2 + PCT sheet ×2 + PCT submit ×1) | 5 |
| h-11 residue | `h-11` | 0 | 0 |
| `border-2 border-dashed border-border` residue | exact match | 0 | 0 |
| New i18n keys | `git diff frontend/lib/i18n/fr.json` | empty | empty |

### Lint + typecheck

- `npm run lint -- --no-warn-ignored` → no output (clean)
- `npx tsc --noEmit` → "TypeScript compilation completed" (clean)

### CAPTURE-11 W4 closure (grep-provable)

```bash
grep -n '"h-12"' frontend/components/PhotoUploader.tsx
# 230:                    className="h-12"   ← Caméra
# 238:                    className="h-12"   ← Photothèque
```

Both PhotoUploader sheet action buttons render at the 48px floor — closes the W4 UI-REVIEW gap.

### Real-device smoke test

Deferred to Phase 6 wave-end gate (UI-SPEC §"Real-device smoke test (post-implementation)" steps 5 + 8). The pseudo-element hit pad is a CSS contract — Tailwind v4 emits `position: absolute; top: -10px; right: -10px; bottom: -10px; left: -10px; content: ''` on the `::before` pseudo, which is a standards-conformant approach for expanding pointer hit-testing without growing visible chrome. No iPhone-specific behavior is at risk.

## Deviations from Plan

### Defensive verification (Task 1, Change 3)

The plan instructed defensive verification of the PhotoUploader sheet buttons at `h-12`. Baseline grep showed both already at `h-12` (lines 230, 238) — likely closed during an earlier polish pass (Phase 5 or W4-aftermath). No edit needed for that part of Task 1. The W4 closure is still committed as part of this plan's commit (`83cead1`) because the plan's success criterion "CAPTURE-11 closed via grep" is now provable from this commit's tree state.

Otherwise: plan executed exactly as written.

## Known Stubs

None. All changes are real className edits to existing rendered surfaces; no placeholder data, no hardcoded empty arrays, no mocked components.

## Self-Check: PASSED

- `frontend/components/PhotoUploader.tsx`: FOUND, modified at line 203 (X overlay) and line 218 (Plus tile)
- `frontend/components/PhotoCaptureTab.tsx`: FOUND, modified at lines 143, 158, 170, 178, 221
- Commit `83cead1`: FOUND in `git log --oneline` (`feat(06-05): re-theme PhotoUploader (CAPTURE-11 W4 closure)`)
- Commit `d4e8d50`: FOUND in `git log --oneline` (`feat(06-05): re-theme PhotoCaptureTab to Phase 5 system`)
- Cross-file grep checks: all PASS (paper-grain×2, before:-inset-2.5×2, h-12 ≥5, h-11 = 0, border-border = 0)
- Lint + typecheck: PASS
