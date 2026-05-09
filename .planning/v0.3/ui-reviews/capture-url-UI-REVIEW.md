# UI Review — Capture / URL

**Audited:** 2026-05-09
**Auditor:** Claude (Phase 13, manual scoring per CONTEXT.md D-06)
**Synthetic env:** [SYNTHETIC] Démo Al Dente @ https://al-dente-pink.vercel.app
**Viewport:** iPhone-shape Chromium 390×844 (isMobile, hasTouch)
**Reach status:** Reached. Surface visually intact; intended action (URL → structured recipe) is gated by URL-01 backlog (`backend/app/routers/recipes.py:481-490` is `# TODO(productize)`).

## Originality Verdict

**Verdict:** Mixed ⚠

This is the thinnest of the 5 capture surfaces — a single URL input + an info panel + a submit CTA. The visuals + tokens are clean and on-brand (font-mono input for URL paste, info panel with `bg-muted/60` and a lucide `Info` icon, semantic destructive color on the inline error). Editorial cohesion is partial: the helper copy `L'extraction automatique arrive bientôt — tu pourras compléter les détails dans la boîte de réception.` is **honest framing of a stub** rather than hidden failure — that's a cohesion *positive*. But the underlying flow doesn't deliver on the surface's promise (the `Ajouter à la boîte de réception` button does work; URL extraction doesn't), which the user only learns after submitting → seeing the URL itself become the recipe title.

| Boilerplate elements | Earned elements |
|----------------------|-----------------|
| Default shadcn `Input` with `font-mono` — themed but still a default input shape (`frontend/components/UrlCaptureTab.tsx:65-77`) | Inline `bg-muted/60 p-3 rounded-lg` info panel with lucide `Info` icon — a deliberate "tell the user the gotcha *before* they submit" affordance, not a generic toast (`UrlCaptureTab.tsx:83-86`) |
| Default `text-destructive` inline error message under invalid URLs (`UrlCaptureTab.tsx:78-80`) | Helper copy `L'extraction automatique arrive bientôt — tu pourras compléter les détails dans la boîte de réception.` — productize-honest framing of URL-01 (i18n: `recipes.url.helper`); refuses the boilerplate "Loading…" / "We're working on it" template by offering an explicit user fallback path (the boîte de réception) |
| Standard primary CTA at the bottom of the column (`UrlCaptureTab.tsx:88-102`) | Defense-in-depth scheme validation: client `new URL(...)` + `protocol === "http:" / https:"` (`UrlCaptureTab.tsx:38-43`), backend re-validates (`422 "url must start with http:// or https://"` per WALKTHROUGH P-12-U04). Earned security posture, not boilerplate. |

## 6-Pillar Score: 21/24

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| Copywriting | 4/4 | Helper copy is productize-honest about URL-01; submit verb `Ajouter à la boîte de réception` names the actual user-visible outcome (not "Submit"); `recipes.url.invalid` for the inline error. Full next-intl. |
| Visuals | 4/4 | Info panel with leading `Info` icon at `mt-0.5 shrink-0` is a tactile UX pattern; `font-mono text-sm` on the input is the right typographic cue for a URL paste field. |
| Color | 4/4 | `bg-muted/60` info panel + `text-destructive` inline error + terracotta primary on submit. 3 semantic tokens, all load-bearing. No raw colors. |
| Typography | 4/4 | `text-sm` body, `text-sm text-destructive` error, `font-mono text-sm` input — 1 size; 1 family deviation (mono for URL paste, deliberate). Within thresholds. |
| Spacing | 4/4 | Tailwind scale: `gap-6 / gap-2 / gap-1.5`, `px-6 pt-6 pb-32` page, `p-3` info panel, `mt-1` / `mt-0.5` ergonomic offsets. |
| Experience Design | 1/4 | DOCKED HARD — the surface's primary intended action is gated by URL-01 (no Gemini call, draft titled with raw URL, user must complete manually). Helper copy mitigates frustration *if it stays in front of the user*; the moment that copy is dropped, the surface becomes a true blocker. (See WALKTHROUGH.md §Capture — URL — P-12-U01) |

## Detailed Findings

### Pillar 6: Experience Design (1/4)

- **URL-01 — primary action is a stub** — POSTing `https://www.marmiton.org/recettes/recette_risotto-aux-champignons_28057.aspx` produces a draft with `title=<raw URL>` (no slug parsing, no Gemini call, no even-best-effort fallback). User-visible artifact: an inbox card titled with the raw URL until the user manually completes it. Per D-13 + D-14: blocker severity, but **cross-link to URL-01 backlog only — do NOT file a new GitHub issue**. The `recipes.url.helper` copy keeps this from being a true silent-failure, which is why the score is 1/4 and not 0/4. (See WALKTHROUGH.md §Capture — URL — P-12-U01)
- **Client-side validation passes** — `new URL(...)` + http/https scheme check (`UrlCaptureTab.tsx:38-43`); button stays disabled until valid. `recipes.url.invalid` inline error fires after blur. Pass-style. (See WALKTHROUGH.md §Capture — URL — P-12-U02)
- **Wikipedia (well-formed non-recipe) URL produces same result as Marmiton** — confirms URL-01 short-circuits *before* any URL classification or Gemini call (no recipe/non-recipe differentiation possible because nothing fetches). Surface gives user no signal which URLs will eventually extract well vs. poorly. (See WALKTHROUGH.md §Capture — URL — P-12-U03)
- **`javascript:` scheme rejected at both layers** — defense-in-depth (client disables button, backend `422`). Pass-style security finding worth recording so future audits detect regression. (See WALKTHROUGH.md §Capture — URL — P-12-U04)
- **Submit-debounce gap likely propagates** — same React-batching race; `setSubmitting(true)` (`UrlCaptureTab.tsx:50`) is not synchronously visible to a fast double-tap. Not directly probed, but the pattern is identical to P-12-Q03/F03/V03/Ph03.

### Pillar 1: Copywriting (4/4)

- All strings via `useTranslations("recipes.url")` + `useTranslations("common")` + `useTranslations("onboarding.errors")` (`UrlCaptureTab.tsx:27-29`). Invariant #6 honored.
- Helper text `recipes.url.helper`: `L'extraction automatique arrive bientôt — tu pourras compléter les détails dans la boîte de réception.` — names URL-01 honestly without using engineering jargon, and gives the user an explicit fallback path (`boîte de réception`).
- Submit verb `Ajouter à la boîte de réception` (`recipes.url.submit`) — names the actual destination. The user knows, before clicking, that the next state is "card in the inbox", not "promoted recipe". Refuses the generic `Submit` / `Capturer` boilerplate.
- Inline error `recipes.url.invalid` — fires only after blur (`touched && value.length > 0 && !isValid`), preventing the noisy "ERROR" before the user has finished typing. Ergonomic.

### Pillar 2: Visuals (4/4)

- Info panel with leading `Info` icon at `mt-0.5 shrink-0` (`UrlCaptureTab.tsx:84`) — `mt-0.5` aligns the icon's optical center with the first line of text; `shrink-0` prevents the icon collapsing on long French lines. Small ergonomic that signals care.
- `font-mono text-sm` on the URL input — typographic cue that this field expects a URL, not a sentence.
- Single CTA at the bottom — focal hierarchy uncontested.

### Pillar 3: Color (4/4)

- Three semantic tokens, all load-bearing: `bg-muted/60` (info panel), `text-destructive` (inline validation error), `bg-primary` (submit CTA, default Button variant). Zero raw `#hex` / `rgb()`.
- Info panel uses `/60` opacity — softer than full `bg-muted`, which keeps the info-not-error reading.

### Pillar 4: Typography (4/4)

- `text-sm` body + `font-mono text-sm` input — 1 size, 1 family deviation (mono for URL).
- No explicit weight classes — relies on default `font-medium` from shadcn `Label`.

### Pillar 5: Spacing (4/4)

- Tailwind scale only: `gap-6` (rows), `gap-2` (info panel icon↔text), `gap-1.5` (label↔input), `px-6 pt-6 pb-32` (page), `p-3` (info panel), `mt-0.5` (icon optical alignment), `mt-1` (inline error offset).
- No `[Npx]` arbitrary values anywhere.

## Screenshots

- `./screenshots/capture-url-canonical.png` — URL tab default state: empty `font-mono` input, `bg-muted/60` info panel with `Info` icon and the productize-honest helper copy, disabled `Ajouter à la boîte de réception` CTA at bottom.
- `./screenshots/capture-url-with-marmiton.png` — input filled with the canonical Marmiton URL; submit button becomes enabled (terracotta primary). Input visibly renders in `font-mono`. (Submit was NOT performed in the audit — synthetic env scope creep avoided per the audit-only constraint.)

## WALKTHROUGH cross-links (context inherited per D-11)

- WALKTHROUGH.md §Capture — URL: 4 probes (P-12-U01..U04) + 1 documented skipped probe (slow-URL via httpbin/delay/30 — skipped because URL-01 short-circuits BEFORE any URL fetch).
- 0 Gemini calls observed — confirms URL-01 short-circuits before any model call.
- URL-01 backlog cross-link: `backend/app/routers/recipes.py:481-490` URL extraction is `# TODO(productize)`. Per WALKTHROUGH §Backlog dedupe, this is the load-bearing follow-up; the user-visible artifact in this audit is acceptable AS LONG AS the helper copy stays in front of the user.
- Notable cohesion *positive*: the helper line is one of the few places in the codebase where productize-later debt is surfaced to the user as a feature ("arrive bientôt") rather than hidden — consistent with the Slow Food editorial voice (honest, unhurried, doesn't oversell).
