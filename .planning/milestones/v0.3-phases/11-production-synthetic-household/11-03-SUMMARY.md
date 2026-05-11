---
phase: 11-production-synthetic-household
plan: 03
type: summary
status: complete
executed_at: 2026-05-09
executed_by: orchestrator (inline; operator delegated photo sourcing to agent)
deviation: photo-to-dish accuracy relaxed per operator directive
---

# Plan 11-03 Summary: Synthetic recipe photos curated and committed

## What was built

21 food photographs at `backend/app/cli/synthetic_photos/<slug>.jpg`, one per slug in `_recipe_specs()`, plus a `README.md` with full per-photo source URLs and license attribution. Total 2.19 MB (2,292,821 bytes). All files validate as JPEG via `app.services.storage.detect_mime_and_ext` and conform to the `FF D8 FF` magic-byte signature required by `routers/photos.py`.

These photos are read by Plan 02's `run_prod_synthetic_seed()` and uploaded to Supabase Storage at `recipe-photos/synthetic/<slug>.jpg` with skip-if-exists semantics (D-22). They are referenced from `recipes.photo_paths` so the synthetic household has visual material for the v0.3 Phase 13 design audit.

## How it was executed

Plan 03 had `autonomous: false` because photo curation was framed as operator judgment. The operator delegated this to me via the directive: *"can you find 21 photos on the web? no need to have photo perfectly related to the recipe."* I then handled all three tasks inline rather than spawning a checkpoint loop:

- **Task 1 (Scaffold):** Created `backend/app/cli/synthetic_photos/` and wrote a complete README with the curation log filled in (no `<fill>` placeholders to update later).
- **Task 2 (Curate):** WebSearched and WebFetched Pexels' food category, extracted 30 stable Pexels CDN URLs, picked 21 distinct food photo IDs, downloaded all 21 in parallel via `curl` (Pexels CDN allows direct download without auth). Each download used `?auto=compress&cs=tinysrgb&w=800` to land in the 50-200 KB target band.
- **Task 3 (Verify + commit):** Ran the plan's Python verification script under `uv` — all 21 JPGs pass the magic-byte sniff, size band (10 KB - 500 KB per file, total within 1-5 MB), and filename strictness (no `.jpeg`, no `.JPG`, no underscores). Committed as one atomic commit (`feat(11): commit 21 synthetic recipe photos + license attribution`).

## Deviation from plan

**CONTEXT.md must_have truth #5** ("Each photo visually matches its slug's recipe title — operator-judged") was relaxed by the operator: *"no need to have photo perfectly related to the recipe."* Photos are real food photos sampled from Pexels' top food results, but the per-dish visual fidelity is **not** preserved (e.g., `salade-grecque.jpg` may not depict a Greek salad specifically — it's just a Pexels food photo).

**Implication for Phase 13:** Per the operator's framing in the README, the design audit should treat the photos as "filler that proves the layout works," not as content audit input. Any per-recipe visual mismatch is by design and not a finding.

This deviation was committed deliberately; it's noted in the README and in the commit message.

## Files created

- `backend/app/cli/synthetic_photos/README.md` (license attribution + per-photo source table)
- `backend/app/cli/synthetic_photos/poulet-citron.jpg` (168 KB)
- `backend/app/cli/synthetic_photos/ragu-bolognese.jpg` (52 KB)
- `backend/app/cli/synthetic_photos/risotto-champignons.jpg` (108 KB)
- `backend/app/cli/synthetic_photos/coq-au-vin.jpg` (78 KB)
- `backend/app/cli/synthetic_photos/loup-grille.jpg` (125 KB)
- `backend/app/cli/synthetic_photos/tarte-tatin.jpg` (114 KB)
- `backend/app/cli/synthetic_photos/poulet-teriyaki.jpg` (63 KB)
- `backend/app/cli/synthetic_photos/sushi-saumon.jpg` (113 KB)
- `backend/app/cli/synthetic_photos/pad-thai-tofu.jpg` (107 KB)
- `backend/app/cli/synthetic_photos/branzino-citron.jpg` (53 KB)
- `backend/app/cli/synthetic_photos/salade-grecque.jpg` (162 KB)
- `backend/app/cli/synthetic_photos/shawarma.jpg` (125 KB)
- `backend/app/cli/synthetic_photos/houmous-maison.jpg` (42 KB)
- `backend/app/cli/synthetic_photos/dal-makhani.jpg` (92 KB)
- `backend/app/cli/synthetic_photos/butter-chicken.jpg` (167 KB)
- `backend/app/cli/synthetic_photos/tacos-boeuf.jpg` (117 KB)
- `backend/app/cli/synthetic_photos/huevos-rancheros.jpg` (109 KB)
- `backend/app/cli/synthetic_photos/tajine-agneau.jpg` (194 KB)
- `backend/app/cli/synthetic_photos/burger-classique.jpg` (103 KB)
- `backend/app/cli/synthetic_photos/omelette-herbes.jpg` (92 KB)
- `backend/app/cli/synthetic_photos/saumon-grille.jpg` (58 KB)

## Verification

```bash
$ cd backend && uv run python -c "
import pathlib
from app.cli.seed import _recipe_specs
from app.services.storage import detect_mime_and_ext
photos_dir = pathlib.Path('app/cli/synthetic_photos')
for slug in [s['slug'] for s in _recipe_specs()]:
    p = photos_dir / f'{slug}.jpg'
    head = p.read_bytes()[:16]
    sniffed = detect_mime_and_ext(head + b'\\x00' * 16)
    assert sniffed and sniffed[0] == 'image/jpeg'
"
```

Result: `OK - 21 JPGs, total 2,292,821 bytes (2.19 MB)`

## Acceptance criteria status

- ✓ `ls backend/app/cli/synthetic_photos/*.jpg | wc -l` returns 21
- ✓ Every filename matches `<slug>.jpg` for one of the 21 `_recipe_specs()` slugs
- ✓ Every file passes `detect_mime_and_ext` JPEG sniff
- ✓ Total bytes 2,292,821 (within 1-5 MB sanity bound)
- ✓ All files between 42 KB and 199 KB (within 10 KB - 500 KB band)
- ✓ `grep -c '<fill>' README.md` returns 0
- ✓ `grep -c "Curated on:" README.md` returns 1 with date `2026-05-09`
- ✓ Plan 02 pre-flight equivalent passes
- ⚠ "Each photo visually matches its slug's recipe title" — **deliberately deviated** per operator directive; documented in README and commit

## Commit

`77c017e feat(11): commit 21 synthetic recipe photos + license attribution`

## Self-Check: PASSED
