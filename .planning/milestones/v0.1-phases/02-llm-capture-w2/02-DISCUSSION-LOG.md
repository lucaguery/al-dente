# Phase 2: LLM Capture (W2) — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 02-llm-capture-w2
**Areas discussed:** Capture entry point, Voice recording UX, Promotion feedback, Gemini failure + voice-modify UX

---

## Capture entry point

| Option | Description | Selected |
|--------|-------------|----------|
| Extend to 5 tabs | Add Voice, Photo, URL tabs to existing /recipes/new Quick+Full | ✓ |
| Action sheet from FAB | Floating + button on recipe list opens bottom sheet | |
| Merge into Quick tab | Mode switcher icons inside Quick tab | |

**User's choice:** Extend to 5 tabs — Rapide / Complète / Voix / Photo / URL
**Notes:** One place to add recipes, different input methods per tab. Consistent with existing tab UX.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Keep Quick as-is | Quick tab retains optional photo input | ✓ |
| Remove photo from Quick | Photo input moves exclusively to Photo tab | |

**User's choice:** Keep Quick as-is
**Notes:** Quick-tab photo = attach without extraction. Photo tab = photo IS the recipe source for Gemini. Different intent, different tab.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Notice in the tab UI | Helper text explaining extraction is coming later | ✓ |
| Silent draft, no mention | URL tab just has input + submit, no explanation | |

**User's choice:** Notice in the tab UI
**Notes:** URL tab shows: "L'extraction automatique arrive bientôt — tu pourras compléter les détails dans la boîte de réception."

---

## Voice recording UX

| Option | Description | Selected |
|--------|-------------|----------|
| Tap to start, tap to stop | First tap starts, second tap stops | ✓ |
| Tap-and-hold to record | Hold button to record, release to submit | |
| Automatic stop on silence | Auto-stop after ~3s of silence | |

**User's choice:** Tap to start, tap to stop

---

| Option | Description | Selected |
|--------|-------------|----------|
| Live rolling transcript | Interim results shown live while speaking | ✓ |
| Waveform animation only | Animated bars + timer, no text until stop | |
| Simple timer + pulsing mic | Minimalist timer and icon only | |

**User's choice:** Live rolling transcript
**Notes:** `interimResults: true` on SpeechRecognition. Interim text in grey, final text in solid.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Show transcript for review | Transcript displayed with Envoyer / Recommencer buttons | ✓ |
| Submit immediately on stop | Transcript sent to backend immediately on tap-stop | |

**User's choice:** Show transcript for review
**Notes:** Review step prevents garbled transcript from reaching Gemini.

---

## Promotion feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Spinner + 'En cours…' label | Draft card shows spinner and label in drafts inbox | ✓ |
| Normal draft card, no indicator | Draft looks like any other draft | |
| Dedicated 'En traitement' section | Separate section at top of inbox for processing drafts | |

**User's choice:** Spinner + "Extraction en cours…" label
**Notes:** Extends RecipeDraftCard. Spinner replaces action buttons while promotion is pending.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Toast + move to recipe list | Toast fires + recipe appears in list + card disappears | ✓ |
| Toast only, user navigates manually | Toast fires but no automatic list update | |
| Silent update only | Silent UI refresh, no toast | |

**User's choice:** Toast + move to recipe list
**Notes:** Toast: "Ta recette « [titre] » est prête !" Both phones get it (household WebSocket broadcast). No forced navigation — user stays on current page.

---

## Gemini failure + voice-modify UX

| Option | Description | Selected |
|--------|-------------|----------|
| Error badge + retry button | Red 'Échec' badge + 'Réessayer' button in inbox | ✓ |
| Draft stays silently, user edits manually | No error indicator, user fills form manually | |
| 1 silent retry, then error badge | Auto-retry once after 30s, then error badge | |

**User's choice:** Error badge + retry button
**Notes:** Backend writes error to `promotion_error TEXT` field (no new status). `promotion_attempts INT` tracks attempts. Retry re-queues BackgroundTask.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Recipe detail page, mic icon in header | Mic icon in header → voice sheet → POST /recipes/{id}/voice-modify | ✓ |
| Edit form only | Mic icon only accessible from inside edit form | |
| Both detail page and edit form | Mic icon in both places | |

**User's choice:** Recipe detail page, mic icon in header

---

| Option | Description | Selected |
|--------|-------------|----------|
| No highlight, just pre-filled form | Edit form opens pre-filled, no diff visualization | ✓ |
| Highlight changed fields | Changed fields get yellow border to show what Gemini modified | |

**User's choice:** No highlight, just pre-filled form
**Notes:** SPEC.md option A: "edit form opens pre-filled for review" — no diff requirement. Diff is productize-later.

---

## Claude's Discretion

- Gemini structured output schema: extract all recipe fields, null for missing, promote if at least `title` is extractable
- Web Speech API `lang: "fr-FR"`
- Photo capture: 1-4 photos, reuse PhotoUploader.tsx, same multipart pattern as Phase 1
- Alembic migration: `promotion_error TEXT`, `promotion_attempts INTEGER NOT NULL DEFAULT 0` on recipes table
- `POST /recipes/{id}/retry-promotion` re-reads `source_capture`, re-queues BackgroundTask

## Deferred Ideas

- Gemini URL extraction — productize-later per CAPTURE-03
- Visual diff on voice-modify — productize-later
- Retry attempt cap (e.g. 3 max) — planner can add a guard but no hard v0.1 requirement
