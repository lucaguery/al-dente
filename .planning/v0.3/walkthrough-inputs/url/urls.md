# Phase 12 walkthrough — canned URL inputs

Authored: 2026-05-09. Checked: 2026-05-09.

## 01 — Clean recipe site (golden path)
https://www.marmiton.org/recettes/recette_risotto-aux-champignons_28057.aspx

Expected: clean recipe extraction, structured promotion. Note: per URL-01 backlog,
`recipes.py:481-490` is `# TODO(productize)` — drafts created from URL never promote.
The probe documents this as a blocker per D-14 and cross-links URL-01 instead of
filing a new issue.

## 02 — Paywalled site (negative test)
https://www.lemonde.fr/cuisine/

Expected: Gemini cannot read the paywalled body; promotion may fail or produce a
stub. NOTE: paywall behavior is an external-content limitation, not a product bug —
do NOT file a blocker for paywall-induced failure.

## 03 — Non-recipe URL (boundary)
https://en.wikipedia.org/wiki/Risotto

Expected: Wikipedia article, not a recipe. Gemini may extract structured fields
from the article description. Document the actual extracted shape.
