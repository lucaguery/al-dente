# UI Review — Capture / Voix

**Audited:** 2026-05-09
**Auditor:** Claude (Phase 13, manual scoring per CONTEXT.md D-06)
**Synthetic env:** [SYNTHETIC] Démo Al Dente @ https://al-dente-pink.vercel.app
**Viewport:** iPhone-shape Chromium 390×844 (isMobile, hasTouch)
**Reach status:** Reached.

## Originality Verdict

**Verdict:** Feels Al Dente ✅

Token compliance + editorial cohesion both pass — and this surface is arguably the most distinctively-styled of the 5 capture flows. The `font-display italic` margin-note helper card with `border-l-[3px] border-primary/60` reads as a real cookbook annotation rather than a tooltip. The copy `Dicte ta recette en français. On la met en forme automatiquement.` instills confidence without bragging about the LLM. Pillar 6 is docked separately for the [filed blocker](https://github.com/lucaguery/al-dente/issues/3) where garbage transcripts leave drafts permanently stuck — a UX gap, not an originality gap.

| Boilerplate elements | Earned elements |
|----------------------|-----------------|
| Plain shadcn `Textarea` for the transcript — no in-app mic UI (correct per D-Voice; iOS PWA Speech API is broken — but the *visual* of a default textarea is starter-tier) (`frontend/components/VoiceCaptureTab.tsx:78-86`) | `paper-grain shadow-card border-l-[3px] border-primary/60` margin-note Card — composed Slow Food token, the cookbook-marginalia register the inline comment claims (`VoiceCaptureTab.tsx:72-76`) |
| Generic two-button row (`flex items-center justify-between gap-3`) — universal "secondary on left, primary on right" form pattern (`VoiceCaptureTab.tsx:88`) | `font-display italic text-base text-foreground` headline inside the Card — Fraunces italic at body size, deliberate display-moment usage per Phase 6 UI-SPEC §Typography (`VoiceCaptureTab.tsx:73-74`) |
| Default toast pattern (`toast.error` / `toast.success`) for empty-transcript and submitted feedback (`VoiceCaptureTab.tsx:46, 52, 55`) | `Dicte ta recette en français. On la met en forme automatiquement.` — copy that promises a slow-down beat, refuses generic "Transcribe your voice" boilerplate (i18n key `recipes.voice.idle_helper`) |

## 6-Pillar Score: 22/24

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| Copywriting | 4/4 | `On la met en forme automatiquement.` is confidence-instilling, French, on-brand. Send=`Envoyer`, Restart=`Recommencer`, empty-state toast specific. Highest copy ceiling of the capture surfaces. |
| Visuals | 4/4 | Italic margin-note Card with primary/60 left border is a genuine visual differentiator — the "annotated cookbook" reading lands. Two-button row keeps focal hierarchy on the primary `Envoyer` CTA. |
| Color | 4/4 | Terracotta primary on (a) `Envoyer` button, (b) the helper Card's `border-primary/60` left edge — two-instance accent, both load-bearing. No raw colors. |
| Typography | 4/4 | `font-display italic text-base` for the headline + IBM Plex Sans default body. 1 explicit size class + 1 display-moment usage = 2 effective sizes. Within ≤4 ceiling. |
| Spacing | 4/4 | Tailwind scale: `gap-6` / `gap-3` / `gap-1.5`, `px-6 pt-6 pb-32` page, `px-4 py-3` Card. One `[3px]` arbitrary value (border thickness for the margin-note register) — load-bearing, not casual. |
| Experience Design | 2/4 | Loading state ✓, disabled state ✓, dedicated `Recommencer` ghost button (thoughtful ergonomic). DOCKED hard: garbage transcripts leave drafts permanently `(extraction en cours…)` with no recovery path other than delete-and-retry (See WALKTHROUGH.md §Capture — Voice — P-12-V01). [[Issue #3](https://github.com/lucaguery/al-dente/issues/3)] |

## Detailed Findings

### Pillar 6: Experience Design (2/4)

- **Garbage transcripts trap drafts at `(extraction en cours…)` indefinitely** — submitting non-recipe content (e.g. `le chat est assis sur le tapis…`) produces a draft whose status remains `draft`, title `(extraction en cours…)`, ingredients `null`, for 3+ minutes (audit didn't wait longer). No `failed` terminal state, no timeout, no UI escalation. The user has no signal whether the model is still trying or silently failed. Only recovery: delete the inbox card. Blocker per D-01: primary intended action non-functional and no actionable feedback. (See WALKTHROUGH.md §Capture — Voice — P-12-V01) [[Issue #3](https://github.com/lucaguery/al-dente/issues/3)]
- **Very-short transcripts pass** — `Pâtes au beurre.` produces a clean structured recipe in ~25s with 2 ingredients. Pass-style finding (See WALKTHROUGH.md §Capture — Voice — P-12-V02). Notable contrast vs P-12-V01: same code path, different content quality → Gemini silently swallows "no recipe found" rather than returning a structured negative.
- **BackgroundTask survives client navigation** — invariant #1 holds; navigating away mid-submit doesn't abort the promotion. Pass-style. (See WALKTHROUGH.md §Capture — Voice — P-12-V03)
- **No surfacing of the `(extraction en cours…)` → terminal failure transition** — the inbox card design assumes promotion always succeeds eventually. Per `frontend/components/VoiceCaptureTab.tsx:54-57` errors at the *capture* stage trigger `tErr("network")`, but post-capture extraction failures have no UI representation.
- **Submit-debounce gap likely propagates** — `setSubmitting(true)` (`VoiceCaptureTab.tsx:49`) gates the second click via state, same React-batching race as P-12-Q03/F03 — likely double-POSTs on iOS double-tap. Not directly probed in WALKTHROUGH but the parser pattern is the same.

### Pillar 1: Copywriting (4/4)

- All strings via `useTranslations("recipes.voice")` + `useTranslations("common")` + `useTranslations("onboarding.errors")` (`VoiceCaptureTab.tsx:33-35`). Invariant #6 honored.
- Idle helper `Dicte ta recette en français. On la met en forme automatiquement.` (i18n: `recipes.voice.idle_helper`) — promises the AI work without flexing on it, and the imperative `Dicte` is more confident than generic `Speak / Type`.
- Send verb `Envoyer`, restart verb `Recommencer` — both clean French, both better than `Submit` / `Reset`.
- Textarea placeholder `Dictez via le clavier 🎤 ou tapez votre recette…` — bridges the iOS-keyboard-mic affordance to the text-paste fallback with a single line; the 🎤 emoji is functional (signals the capture metaphor) not decorative.
- Empty-transcript toast: `recipes.voice.empty_transcript` — fires from `handleSend` when `trimmed` is empty (`VoiceCaptureTab.tsx:45-48`); precise, not the generic "Please fill out this field".

### Pillar 2: Visuals (4/4)

- The margin-note Card creates a genuine focal anchor: helper-then-textarea-then-actions, vertical rhythm uninterrupted. The italic display headline pulls the eye before the textarea claims focus.
- `border-l-[3px] border-primary/60` is a deliberate *cookbook annotation* signal — terracotta accent on the left edge, semitransparent so it reads as ink-bleed rather than a UI accent stripe.
- Two-button row separates "Recommencer" (ghost, low-affordance) from "Envoyer" (primary, high-affordance) — visual weight matches semantic weight.

### Pillar 3: Color (4/4)

- Terracotta accent in two places: primary CTA + helper-Card left border. Both are load-bearing (one is the action, the other is the brand cue).
- `bg-foreground`/`text-foreground`/`border-primary/60` only — no hardcoded hex/rgb literals.

### Pillar 4: Typography (4/4)

- `font-display italic text-base` for the headline — Fraunces italic at body size sits in cookbook-margin-note register exactly as the inline comment claims (per Phase 6 UI-SPEC §Typography). Display moment, single instance.
- IBM Plex Sans default for the textarea + buttons.
- 1 explicit size, 1 display-italic moment — well within thresholds.

### Pillar 5: Spacing (4/4)

- `gap-6` between major sections (Card → textarea → actions), `gap-3` between buttons, `gap-1.5` inside the Card → consistent three-tier hierarchy.
- `min-h-32 max-h-64` on the textarea constrains its growth — ergonomic on a 390-wide viewport (textarea won't overflow the safe area).
- One `[3px]` arbitrary value in `border-l-[3px]` — semantic for the margin-note register; replacing it with the nearest Tailwind scale (`border-l-2` or `border-l-4`) would visually under- or over-state the annotation.

## Screenshots

- `./screenshots/capture-voice-canonical.png` — empty `Voix` tab: italic margin-note Card visible at top, autofocused textarea below, ghost-`Recommencer` left and primary-`Envoyer` right (both disabled).
- `./screenshots/capture-voice-with-transcript.png` — same layout with a French risotto transcript typed in; `Recommencer` and `Envoyer` both now enabled (primary terracotta visible on the right).

## WALKTHROUGH cross-links (context inherited per D-11)

- WALKTHROUGH.md §Capture — Voice: 3 probes (P-12-V01..V03). P-12-V01 ([Issue #3](https://github.com/lucaguery/al-dente/issues/3)) is the dominant Pillar 6 dock. P-12-V02 (sparse transcript pass) and P-12-V03 (BackgroundTask client-navigation robustness) are pass-style findings reinforcing the architecture invariant — recorded as Pillar 6 *positives* in the score reasoning.
- 4 Gemini calls observed (1 golden + 3 probes) — confirms RESEARCH §Surface 3.
- D-Voice locked-since-Phase-2 deviation (no in-app mic) is honored at code level (`VoiceCaptureTab.tsx:1-11`) — verifying that the textarea-only surface is intentional, not a half-finished mic implementation.
