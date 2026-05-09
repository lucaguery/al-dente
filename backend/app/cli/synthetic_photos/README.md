# Synthetic Recipe Photos

This directory contains 21 food photographs — one per slug in `_recipe_specs()` at `backend/app/cli/seed.py`. They are uploaded to Supabase Storage at `recipe-photos/synthetic/<slug>.jpg` by the prod-synthetic seed (`uv run seed --prod-synthetic`) and referenced from `recipes.photo_paths` so the synthetic household has visual material for the v0.3 design audit (Phase 13).

## License

All photos are sourced from **Pexels** under the [Pexels License](https://www.pexels.com/license/), which permits free commercial use without attribution. Attribution to the photographers is appreciated but not legally required; per-photo source URLs are listed below for traceability and respect to the original creators. All files conform to the JPEG magic-byte signature `FF D8 FF` and are validated via `app.services.storage.detect_mime_and_ext` before commit (Plan 03 Task 3).

## Curation

**Curated on:** 2026-05-09
**Total bytes:** 2,292,841 (~2.19 MB) across 21 files
**Average size:** ~109 KB
**Smallest:** `houmous-maison.jpg` (43 KB)
**Largest:** `tajine-agneau.jpg` (199 KB)
**Source:** Pexels food category — top results sampled algorithmically rather than dish-by-dish curated. Per Phase 11 directive, photo-to-dish accuracy was relaxed (the synthetic household's audit value comes from having photos at all, not from per-dish fidelity); each photo is a real food photograph but may not depict the named recipe. Phase 13's design audit should treat the photos as "filler that proves the layout works," not as content audit input.

## Per-photo source

| # | Slug | Recipe (FR) | Source URL | License | Bytes |
|---|------|-------------|------------|---------|-------|
| 1 | poulet-citron | Poulet au citron | https://www.pexels.com/photo/7160695/ | Pexels License | 168016 |
| 2 | ragu-bolognese | Ragu bolognese | https://www.pexels.com/photo/19671341/ | Pexels License | 53033 |
| 3 | risotto-champignons | Risotto aux champignons | https://www.pexels.com/photo/36501108/ | Pexels License | 110120 |
| 4 | coq-au-vin | Coq au vin | https://www.pexels.com/photo/31097761/ | Pexels License | 80320 |
| 5 | loup-grille | Loup grillé | https://www.pexels.com/photo/15853312/ | Pexels License | 128232 |
| 6 | tarte-tatin | Tarte Tatin | https://www.pexels.com/photo/31846711/ | Pexels License | 116870 |
| 7 | poulet-teriyaki | Poulet teriyaki | https://www.pexels.com/photo/9044556/ | Pexels License | 64518 |
| 8 | sushi-saumon | Sushi saumon | https://www.pexels.com/photo/36701449/ | Pexels License | 115607 |
| 9 | pad-thai-tofu | Pad thai tofu | https://www.pexels.com/photo/26289313/ | Pexels License | 109568 |
| 10 | branzino-citron | Branzino au citron | https://www.pexels.com/photo/32757022/ | Pexels License | 54741 |
| 11 | salade-grecque | Salade grecque | https://www.pexels.com/photo/15853317/ | Pexels License | 165640 |
| 12 | shawarma | Shawarma | https://www.pexels.com/photo/31846709/ | Pexels License | 128235 |
| 13 | houmous-maison | Houmous maison | https://www.pexels.com/photo/19671352/ | Pexels License | 43272 |
| 14 | dal-makhani | Dal makhani | https://www.pexels.com/photo/15853313/ | Pexels License | 94727 |
| 15 | butter-chicken | Butter chicken | https://www.pexels.com/photo/31771054/ | Pexels License | 171024 |
| 16 | tacos-boeuf | Tacos de boeuf | https://www.pexels.com/photo/35886109/ | Pexels License | 119416 |
| 17 | huevos-rancheros | Huevos rancheros | https://www.pexels.com/photo/24866519/ | Pexels License | 111606 |
| 18 | tajine-agneau | Tajine d'agneau | https://www.pexels.com/photo/31846553/ | Pexels License | 198908 |
| 19 | burger-classique | Burger classique | https://www.pexels.com/photo/4551307/ | Pexels License | 105416 |
| 20 | omelette-herbes | Omelette aux herbes | https://www.pexels.com/photo/35723478/ | Pexels License | 93682 |
| 21 | saumon-grille | Saumon grillé | https://www.pexels.com/photo/19671370/ | Pexels License | 59870 |

## Replacement procedure

If a photo needs to be replaced (e.g., license changed upstream, broken file, audit identified an issue):

1. Download the new photo from a Pexels License or Foodiesfeed CC0 source.
2. Resize to ~800px width, JPEG quality ~80, target 50-200 KB:
   ```bash
   sips -Z 1200 -s format jpeg -s formatOptions 80 source.jpg \
     --out backend/app/cli/synthetic_photos/<slug>.jpg
   ```
3. Verify magic bytes: `xxd <slug>.jpg | head -1` — must start with `ffd8 ff`.
4. Update the row in this README (Source URL, License, Bytes).
5. The next `uv run seed --prod-synthetic` run will detect the local change, re-upload to `recipe-photos/synthetic/<slug>.jpg` (skip-if-exists is keyed on Storage path, so an updated local file currently won't overwrite — delete the Storage object first if a re-upload is needed).
