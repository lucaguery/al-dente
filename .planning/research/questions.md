# Research Questions

Open questions surfaced during exploration sessions. Each question has constraints and a "to be answered when" trigger so it gets researched at the right phase, not earlier.

---

## v0.2 polish — typography pairing for Slow Food artisanal direction

**Question:** Which display serif (and sans body pairing) for Al Dente's v0.2 design system, given the constraints below?

**Constraints:**

- Renders French diacritics (à, â, é, è, ê, ë, î, ï, ô, û, ç, œ) cleanly on iOS Safari at PWA-compressed sizes (we don't get to control sub-pixel rendering)
- Harmonizes visually with cream + terracotta + ink palette
- Reads as Slow Food editorial / contemporary Italian cookbook publishing — NOT trattoria-themed, NOT modernist-graphic
- Available via `next/font/google` (Google Fonts) for `display: swap` loading, OR has a clear self-hosted fallback path
- Distinctive enough that the pairing alone is recognizable (typography is the actual signature for this design — paper-grain is supporting, not headline)
- Avoids defaults: NOT Geist alone, NOT Geist + Inter, NOT system stacks
- Body sans must be highly legible at small sizes (recipe ingredient lists, vote-deck meta) and at long-form reading sizes (full recipe instructions)
- Variable-font support preferred (smaller bundle, more weight flexibility)

**Candidate display serifs to evaluate:**

- Fraunces — variable, expressive italic, Google Fonts
- GT Sectra — premium (paid), highly editorial
- PP Editorial New — premium (paid), distinctive italic
- Instrument Serif — Google Fonts, sophisticated
- DM Serif Display — Google Fonts, more decorative
- Recoleta — premium (paid), warm
- GT Super — premium (paid), versatile
- Tiempos Headline — premium (paid), editorial standard

**Candidate body sans:**

- Inter — most legible Google sans; risk: too default
- Geist Sans — already in stack; risk: too default for Originality principle
- DM Sans — Google Fonts, slightly warmer than Inter
- Söhne / similar premium grotesques — paid
- IBM Plex Sans — Google Fonts, distinctive without being weird
- Manrope — Google Fonts, slightly humanist

**Output expected from research:**

1. Recommended pairing (display + body)
2. One backup pairing in case the primary fails on iOS Safari French rendering
3. Specific weights to load (e.g., display: 400 + 400 italic; body: 400 + 500 + 600)
4. Type scale recommendation aligned with the pairing's optical sizing

**Source decisions:**
`.planning/notes/v0.2-design-direction.md`

**To be answered when:** `/gsd-ui-phase` plans the design-system foundation phase of v0.2 (likely Phase 1 of the milestone).
