---
status: partial
phase: 04-polish-w4
source: 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md
started: 2026-05-07T22:00:00Z
updated: 2026-05-08T08:00:00Z
---

## Current Test

[testing paused — 2 items blocked by finalize issue (tests 7, 9)]

## Tests

### 1. Finalize Page Renders
expected: Open the app with an active cooking session. Tap "Finaliser" in the CookingBanner on Home. The finalize page loads at /cooking-logs/[id]/finalize and shows three clearly labelled sections: Photos (with a + add tile), Rating (three cards: Adoré / Bien / Passable), and Notes (textarea). Page scrolls as one column.
result: pass

### 2. Submit Button Gated on Rating
expected: On the finalize page, before selecting any rating card, the "Finaliser" button at the bottom is visually disabled (grey, no active border-bottom rebound on tap). It stays disabled even after adding a photo or writing notes.
result: pass

### 3. Rating Picker Selection + Flip
expected: Tap "Adoré" → that card gets a rose border, rose background, and a filled heart icon. The other two cards remain unselected. Then tap "Bien" → Bien gets highlighted, Adoré goes back to its neutral state (no rose lingering). The Finaliser button becomes active (enabled) once any card is selected.
result: pass

### 4. Photo Upload on Finalize Page
expected: Tap the + tile in the Photos section. A sheet opens offering "Caméra" and "Photothèque". Pick a photo from Photothèque. The photo appears in the 2×2 grid as it uploads (no page navigation). A second photo can be added the same way.
result: pass

### 5. Notes Textarea + Helper Text
expected: The Notes section shows a textarea. Below or within it, helper copy reads "Tu peux dicter avec le micro du clavier." (or similar French phrasing directing to the OS keyboard mic). No in-app mic button is visible.
result: pass

### 6. Successful Finalize Flow
expected: With a rating selected (and optionally a photo and notes), tap "Finaliser". The app navigates to Home (/). A toast notification "Bien enregistré." appears briefly. The CookingBanner that was showing at the top of Home is gone.
result: issue
reported: "no it does not work, it says it's impossible"
severity: major

### 7. RecipeCard Living Image
expected: After finalizing a cooking session that included at least one photo, open /recipes. The recipe you just cooked shows the cooking-log photo as its card thumbnail (not the original recipe photo that was there before). Other recipe cards are unaffected.
result: blocked
blocked_by: prior-phase
reason: "block because i can't finalize"

### 8. EmptyState for Stale Finalize URL
expected: Navigate directly to /cooking-logs/<some-old-or-fake-id>/finalize (either a stale deep link or a log you already finalized). The page shows an EmptyState — no finalize form. A "Retour à l'accueil" (or equivalent) CTA button is visible. Tapping it navigates to Home.
result: pass

### 9. Partner Phone Syncs Recipe Photo
expected: On a second phone (or after the partner refreshes /recipes), the recipe that was just finalized also shows the new cooking-log photo thumbnail — not the original recipe photo. The update arrives without a manual page reload (driven by the recipe.updated WebSocket broadcast).
result: blocked
blocked_by: prior-phase
reason: "blocked"

## Summary

total: 9
passed: 6
issues: 1
pending: 0
skipped: 0
blocked: 2

## Gaps

- truth: "Tapping Finaliser with a rating selected navigates to Home with a success toast"
  status: failed
  reason: "User reported: no it does not work, it says it's impossible"
  severity: major
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
