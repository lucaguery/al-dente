# Phase 12 walkthrough — canned photo inputs

Per D-13 each photo input is committed for reproducibility. The actual JPGs are
added in Plan 02 (capture-photo probe) if the operator can supply them; if not,
the photo surface is probed with live ad-hoc images and the WALKTHROUGH section
explicitly notes which probe used which input.

Expected files (each ≤200KB, JPEG 75-85%, ~1024px long edge):

| File | Content | Purpose |
|------|---------|---------|
| 01-clean-cookbook.jpg | Well-lit top-down photo of a French cookbook page or printed recipe card | Golden path; Gemini OCR baseline |
| 02-dim-handwritten.jpg | Dimly-lit handwritten recipe (notebook, low contrast) | Edge: handwriting + low light |
| 03-non-recipe-landscape.jpg | A landscape (beach, mountain — anything non-food) | Negative test |

Source: Unsplash CC0 / Pexels (same source pattern as Phase 11 D-20) OR operator-captured originals.
No image with embedded EXIF API keys / location-leaking metadata.
