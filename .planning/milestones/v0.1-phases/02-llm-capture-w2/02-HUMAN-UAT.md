---
status: partial
phase: 02-llm-capture-w2
source: [02-VERIFICATION.md]
started: 2026-05-07T07:30:00Z
updated: 2026-05-07T07:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Voice capture end-to-end (SC-1)
expected: Dictate a French recipe via the voice tab textarea → submit → spinner card appears → both phones receive `recipe.promoted` toast with recipe name within ~10s → recipe appears as structured in library
result: [pending]

### 2. Photo capture end-to-end (SC-2)
expected: Upload 1–4 photos of a recipe → submit → spinner card → Gemini extracts recipe name/ingredients/steps → `recipe.promoted` toast on both phones
result: [pending]

### 3. Voice modify end-to-end (SC-4)
expected: Open an existing recipe detail → tap mic button → VoiceModifySheet opens → type modification instructions → submit → edit form pre-filled with Gemini-modified fields via sessionStorage
result: [pending]

### 4. Promotion failure + retry flow
expected: Simulate a Gemini failure (e.g. invalid API key on Railway) → draft card shows "Échec" badge → tap "Réessayer" → card shows spinner → on next success, card flips to structured
result: [pending]

### 5. 5-tab capture page on iPhone SE (visual + scrollability)
expected: All 5 tabs visible/scrollable on iPhone SE viewport (375×667); no layout overflow; tab icons + labels readable; switching tabs is instant
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
