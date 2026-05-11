---
phase: 06-capture-surfaces-polish
plan: 04
subsystem: frontend / capture-surfaces / voice-tab
tags: [ui-polish, capture, voice, d-voice-deviation, slow-food-identity, accessibility]
requirements:
  closed:
    - CAPTURE-10
dependency_graph:
  requires:
    - phase-05 Card primitive (paper-grain-aware) at frontend/components/ui/card.tsx
    - phase-05 Button primitive supporting h-12 className override
    - phase-05 paper-grain CSS utility (warm noise via mix-blend-mode multiply)
    - phase-05 typography tokens (font-display → Fraunces; --font-display)
    - phase-05 color tokens (--primary terracotta hue, /60 alpha alias)
    - phase-05 shadow tokens (shadow-card)
    - existing i18n key recipes.voice.idle_helper (frontend/lib/i18n/fr.json:200)
  provides:
    - D-Voice persistent callout pattern (paper-grain Card + 3px terracotta-60 left strip + Fraunces italic body-size headline) — referenceable by future capture surfaces if they add deviation copy
    - Confirmed h-12 floor on both Voice tab action buttons
  affects:
    - frontend/components/VoiceCaptureTab.tsx
tech_stack:
  added: []
  patterns:
    - "Inline (not factored) callout markup — UI-SPEC §Surface 5 explicit"
    - "Margin-note typography register: font-display italic at body size, full-strength foreground ink"
    - "Border-l-[3px] @ /60 alpha for 'load-bearing affordance' strips (vs /30 for dashed-border tiles)"
key_files:
  created: []
  modified:
    - frontend/components/VoiceCaptureTab.tsx (+14, -1)
decisions:
  - "Inline callout JSX in VoiceCaptureTab.tsx instead of factoring a shared VoiceDeviationCallout.tsx component (UI-SPEC discretion item, plan-locked)"
  - "Comment text avoids the literal 'webkitSpeechRecognition' symbol to honor the plan's hard invariant ('ensure no SpeechRecognition or webkitSpeechRecognition symbol appears anywhere in the file'). Used the phrase 'browser speech-recognition' instead — same intent, no symbol leak"
metrics:
  tasks_completed: 1
  files_modified: 1
  commits: 1
  duration_minutes: 5
  completed_date: 2026-05-08
---

# Phase 06 Plan 04: D-Voice Callout Polish Summary

**One-liner:** Replaced the muted Voice-tab helper paragraph with a persistent paper-grain Card bearing a 3px terracotta-60 left strip and a Fraunces display-serif italic headline at body size, and raised both action buttons (Envoyer / Recommencer) to the 48px h-12 tap floor — closing CAPTURE-10 while reinforcing the D-Voice deviation lock (zero browser speech-recognition, zero in-app mic chrome).

## What Changed

### Single file modified: `frontend/components/VoiceCaptureTab.tsx`

Three surgical edits, business logic byte-for-byte unchanged:

1. **Card import added** (line 28):
   ```tsx
   import { Card } from "@/components/ui/card";
   ```

2. **Bare paragraph replaced with persistent callout Card** (lines 66–76):
   - Removed: `<p className="text-sm text-muted-foreground">{t("idle_helper")}</p>`
   - Added: 6-line explanatory comment + paper-grain Card with 3px terracotta-60 left strip wrapping a `<span>` headline at `font-display italic text-base text-foreground`.
   - Existing i18n key `recipes.voice.idle_helper` reused verbatim — zero new i18n.

3. **h-12 className added to both action Buttons** (lines 92, 101):
   - `Recommencer` (variant="ghost") and `Envoyer` (variant="default") both now meet the 48px tap floor (D-08 / WCAG 2.5.5 minimum).
   - Order of Button props preserved.

### Business logic preserved (byte-for-byte)
- `useState` for `transcript` + `submitting`
- `handleSend` (calls `postVoiceCapture(trimmed)`, toast.success, `router.replace("/inbox")`)
- `handleRestart` (clears transcript)
- `canSend` / `canRestart` derived booleans
- Toast error paths (`empty_transcript`, network)
- The Textarea (untouched — inherits Phase 5 primitive re-theme automatically)

## Grep Proof (Plan Verification Block)

```
$ grep -nE 'import \{ Card \}' components/VoiceCaptureTab.tsx
28:import { Card } from "@/components/ui/card";

$ grep -nE 'paper-grain shadow-card border-l-\[3px\] border-primary/60' components/VoiceCaptureTab.tsx
72:      <Card className="paper-grain shadow-card border-l-[3px] border-primary/60 px-4 py-3 flex flex-col gap-1.5">

$ grep -nE 'font-display italic' components/VoiceCaptureTab.tsx
73:        <span className="font-display italic text-base text-foreground">

$ grep -nE '"h-12"' components/VoiceCaptureTab.tsx
92:          className="h-12"
101:          className="h-12"

$ grep -nE 'webkitSpeechRecognition|SpeechRecognition|<Mic[ />]|<Microphone|getUserMedia|MediaRecorder' components/VoiceCaptureTab.tsx
(0 hits — exit code 1)

$ grep -nE 'idle_helper' components/VoiceCaptureTab.tsx
74:          {t("idle_helper")}

$ git diff frontend/lib/i18n/fr.json
(no diff — no new i18n keys)
```

All seven verification predicates from `<verification>` block satisfied.

## D-Voice Deviation Lock Invariants — Honored

The plan locked these forbidden patterns; the modified file contains zero of each:

| Forbidden pattern | Status |
|---|---|
| `webkitSpeechRecognition` symbol | absent (0 hits) |
| `SpeechRecognition` symbol | absent (0 hits) |
| `<Mic />` icon import (lucide-react) | absent (0 hits) |
| `<Microphone>` icon | absent (0 hits) |
| `getUserMedia` | absent (0 hits) |
| `MediaRecorder` | absent (0 hits) |
| In-app mic Button | absent (0 hits) |
| Audio file upload path | absent (0 hits) |
| `border-primary/30` on the callout | absent (used `/60` per UI-SPEC §Color) |
| `paper-grain` on Textarea or buttons | absent (only on the Card) |
| Dismiss / "X" button on the callout | absent |
| "Nouveau" / "Beta" badge on callout | absent |
| Shared `VoiceDeviationCallout.tsx` factor | absent (inlined per UI-SPEC) |
| New i18n key | absent (existing `idle_helper` reused) |
| Copy change to placeholder (keyboard-emoji `🎤`) | unchanged |

The keyboard-mic affordance IS the callout. The user dictates via the OS keyboard mic (which surfaces a mic icon in the iOS keyboard once they tap into the Textarea) — not via any in-app chrome.

## Verification Outcomes

### Automated (run from repo root or `frontend/`)

| Check | Expected | Actual | Result |
|---|---|---|---|
| Card import present | ≥1 hit | 1 hit | PASS |
| Callout Card className regex | 1 hit | 1 hit | PASS |
| `font-display italic` headline | 1 hit | 1 hit | PASS |
| `"h-12"` on action Buttons | ≥2 hits | 2 hits | PASS |
| Forbidden mic patterns | 0 hits | 0 hits | PASS |
| `idle_helper` reused | ≥1 hit | 1 hit (line 74) | PASS |
| `git diff frontend/lib/i18n/fr.json` | empty | empty | PASS |
| `npm run lint` | 0 errors | 0 errors (only 2 pre-existing warnings on `public/worker-*.js` — generated, out-of-scope) | PASS |
| `npm run build` | TS compile success | Compiled in 10.9s, TS finished 10.5s, 14/14 static pages generated | PASS |

The build emits an `ENVIRONMENT_FALLBACK` notice during static page collection (proxy fallback when `RAILWAY_URL` is unset in the worktree). This is pre-existing, identical before/after this plan, and unrelated to the change. Out of plan scope per scope-boundary rule.

### Real-Device Smoke Test

Deferred to wave-completion sweep on iPhone Safari PWA standalone (per CLAUDE.md — push to `main` auto-deploys; no manual `vercel --prod`). Expected behaviors per plan §"Real-device smoke test":
- Helper Card renders ABOVE the Textarea with paper-grain texture, 3px terracotta strip on the leading edge, Fraunces italic headline.
- Long-press Textarea → iOS keyboard surfaces its native mic icon — the app shows NO in-app mic button.
- Dictate via keyboard mic, tap `Envoyer` → success toast + `/inbox` redirect.
- Tap `Recommencer` → Textarea clears.
- Both action buttons visually 48px tall in DevTools.

## Deviations from Plan

None — plan executed exactly as written, with one minor self-correction during verification:

The plan's first-pass edit included a JSX comment that contained the literal string `webkitSpeechRecognition` (as an explainer of why the file avoids the API). The plan's hard invariant — "ensure no `SpeechRecognition` or `webkitSpeechRecognition` symbol appears anywhere in the file" — applies to the entire file, not just runtime code. The comment was rewritten to use the phrase `browser speech-recognition` (same intent, no symbol leak). Same edit count, same line count, no behavioral or visual difference. This is consistent with Rule 3 (auto-fix to satisfy a plan invariant) and Rule 2 (auto-honor a security/lock posture stated in the plan); not tracked as a real deviation.

## Threat Flags

None. This plan modifies presentational JSX only; no new trust boundaries, no new network endpoints, no new auth paths, no new schema. The threat register's three accepted threats (T-06-04-01..03) are inherited from prior phases and unchanged. Note the D-Voice deviation lock itself remains a defense-in-depth posture: by NOT capturing audio in-app, the app continues to avoid the entire microphone-permission attack surface.

## Known Stubs

None. The `idle_helper` Card is the surface's intended affordance — no placeholder data, no hardcoded empty values flowing to UI, no "TODO" / "coming soon" copy.

## Commit

| Task | Hash | Message |
|---|---|---|
| 1 | `8c993b7` | `feat(06-04): elevate D-Voice helper to persistent paper-grain callout` |

## Self-Check: PASSED

- File present: `frontend/components/VoiceCaptureTab.tsx` — verified.
- Commit `8c993b7` on `main` — verified via `git log --oneline -1`.
- Plan verification grep predicates — all 7 satisfied.
- D-Voice deviation lock invariants — all 15 satisfied.
- `npm run lint` 0 errors; `npm run build` TS compile success.
