---
phase: 06-capture-surfaces-polish
verified: 2026-05-08T00:00:00Z
status: human_needed
score: 4/5 must-haves verified
overrides_applied: 0
re_verification: false
human_verification:
  - test: "Open each of the 5 capture surfaces on iPhone Safari PWA standalone and confirm Phase 5 token cohesion is visible: paper-grain on card surfaces (Quick-add photo-picker Card, Voice callout Card, Photo Plus-tiles), terracotta left-border strip on Voice callout, warm shadows"
    expected: "Every surface reads as the Slow Food artisanal identity — no rose/slate remnants, no flat neutral cards. Paper-grain visible as subtle warm noise on all Card surfaces (not on buttons, tab strip, or full-page backgrounds)."
    why_human: "Visual coherence across 5 surfaces cannot be verified by grep. The 'demonstrable on every capture surface' requirement (SC-5) requires human judgment on whether Design Quality, Originality, Craft, and Functionality pillars are satisfied. A /gsd-ui-review scoring run against the 06-UI-SPEC is the intended gate."
  - test: "Trigger a realtime recipe.created event (capture from a second device/browser window) while /inbox is open, then observe the arrival animation"
    expected: "New card slides in from y:12 → y:0 over ~280ms with the easeCraft curve (no flash, no fade-only). Existing cards do not animate on initial page paint."
    why_human: "AnimatePresence wiring is verified in code, but the actual 280ms easeCraft timing and the absence of re-animation on hydration requires live observation against a running server."
  - test: "Wait for a draft recipe to be promoted by Gemini (or trigger promotion via backend test), observe the inbox exit animation"
    expected: "The row fades out via opacity-only over ~150ms (no slide-down). While still present, toggling the isManual state would cross-fade the Brouillon Badge without row jitter."
    why_human: "AnimatePresence exit animations are wiring-verified but the specific 150ms opacity-only vs slide behavior must be confirmed live."
  - test: "Toggle iOS Reduce Motion on, then open /inbox with drafts, then switch to Voice tab"
    expected: "All animations clamp to instant — no slideUp, no cross-fade. Confirm the globals.css prefers-reduced-motion clamp applies (no per-component useReducedMotion() calls)."
    why_human: "CSS media query behavior on iOS Safari PWA standalone cannot be verified by static analysis."
---

# Phase 6: Capture Surfaces Polish Verification Report

**Phase Goal:** Bring every capture entrypoint and the drafts inbox into the new design system, while folding in the W4 PhotoUploader tap-target gap.
**Verified:** 2026-05-08T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User opens any of the 5 capture surfaces and sees a coherent capture experience using Phase 5 tokens (typography, terracotta primary, paper-grain card surfaces, warm shadows) | ? HUMAN | paper-grain verified by grep on Quick-add Card, Voice callout Card, Photo Plus-tiles; terracotta in border-primary/60 and border-primary/30; font-display on Voice span; Tabs primitive inherits terracotta indicator from Phase 5. Visual coherence requires human assessment. |
| 2 | User taps the PhotoUploader sheet's Caméra and Photothèque action buttons and they meet the 48px (h-12) tap-target floor — closing the W4 UI-REVIEW gap | ✓ VERIFIED | `grep -nE '"h-12"' PhotoUploader.tsx` hits lines 230 + 238 (Caméra, Photothèque). Zero h-11 residue. PhotoCaptureTab sheet buttons also at h-12 (lines 170, 178). |
| 3 | User sees the D-Voice deviation copy preserved on the voice capture surface — no in-app Web Speech regression | ✓ VERIFIED | `grep webkitSpeechRecognition\|SpeechRecognition\|getUserMedia\|MediaRecorder VoiceCaptureTab.tsx` → 0 hits. t("idle_helper") rendered at line 74. No Mic import. D-Voice callout Card present at line 72. |
| 4 | User sees recipes in the drafts inbox visually distinguish draft vs structured status and visibly transition when recipe.created / recipe.promoted events arrive | ✓ VERIFIED | RecipeDraftCard: secondary Badge for Brouillon (draft) at line 102, destructive Badge for Échec (failed) at line 118; structured recipes drop from inbox via realtime offPromoted/offUpdated handlers. AnimatePresence initial={false} on inbox list (line 134); slideUp variant on motion.div rows; opacity-only exit transitions.fast. AnimatePresence mode="wait" wraps Brouillon Badge for cross-fade. Real data flows from api<Recipe[]>("/api/recipes?status=draft&limit=200") on mount + realtime updates. |
| 5 | The four design principles (Design Quality, Originality, Craft, Functionality) are demonstrable on every capture surface and /gsd-ui-review can score each pillar against this phase's UI-SPEC | ? HUMAN | Structural implementation verified: paper-grain on card surfaces (not buttons/chrome), display-serif italic on Voice callout (cookbook margin-note register), terracotta-60 left border on Voice card, terracotta-30 dashed border on Plus tiles, h-12 tap floors across all surfaces, AnimatePresence motion. Whether these constitute a demonstrable quality score requires /gsd-ui-review against 06-UI-SPEC. |

**Score:** 3/5 truths fully automated-verified + 2 require human/UI-review assessment

### Plan-Level Must-Haves Summary

**Plan 01 (Phase 5 deferral closure):**

| Truth | Status | Evidence |
|-------|--------|----------|
| Every Title primitive renders with font-display — font-heading is gone | ✓ VERIFIED | All 4 files (alert-dialog:126, card:41, dialog:133, sheet:117) contain font-display. grep returns 0 font-heading hits. |
| globals.css no longer defines --font-heading / --font-sans aliases | ✓ VERIFIED | grep for --font-heading/--font-sans in globals.css: 0 hits. --font-display and --font-body present. @apply font-body on html{} (auto-fixed from orphaned @apply font-sans). |
| styleguide page imports transitions alongside variants | ✓ VERIFIED | Line 14: `import { variants, transitions } from "@/lib/motion"`. transitions is now visibly used at line 254 (WR-02 post-review fix). |

**Plan 02 (Drafts inbox — CAPTURE-13):**

| Truth | Status | Evidence |
|-------|--------|----------|
| /inbox draft cards render as paper-grain surfaces | ✓ VERIFIED | RecipeDraftCard containerClass line 80: "paper-grain flex gap-4 p-3 bg-background..." |
| Empty state rendered as paper-grain Card with display-serif heading | ✓ VERIFIED | EmptyState.tsx line 23: className="paper-grain shadow-card..." line 25: className="text-title" |
| recipe.created slides in from y:12 with easeCraft | ? HUMAN | AnimatePresence+slideUp wiring verified. Live behavior requires real device. |
| recipe.promoted exits via opacity-only 150ms | ? HUMAN | exit={{ opacity: 0, transition: transitions.fast }} wired. Live behavior requires real device. |
| Brouillon Badge wrapped in AnimatePresence | ✓ VERIFIED | Lines 93-105: AnimatePresence mode="wait" initial={false} + motion.span key="brouillon" + variants.fadeIn |
| Delete (h-12 w-12) and retry (h-12) meet 48px floor | ✓ VERIFIED | Lines 121, 138. No h-8 residue. |
| prefers-reduced-motion handled via CSS, no useReducedMotion() | ✓ VERIFIED | 0 useReducedMotion() hits across all touched files. |

**Plan 03 (Capture entry chrome — CAPTURE-08, CAPTURE-09):**

| Truth | Status | Evidence |
|-------|--------|----------|
| Quick-add photo-picker row in paper-grain Card surface | ✓ VERIFIED | page.tsx line 190: Card className="paper-grain shadow-card p-4..." |
| Quick-add submit at h-12 | ✓ VERIFIED | page.tsx line 207: className="h-12 w-full" |
| Full-form submit at h-12 | ✓ VERIFIED | RecipeForm.tsx line 363: className="h-12 w-full" |
| No h-11 w-full in either file | ✓ VERIFIED | 0 hits. |
| Tabs indicator inherits Phase 5 terracotta | ✓ VERIFIED | Phase 5 Tabs primitive wires after:bg-primary indicator (tabs.tsx:69). 5 flex-1 min-w-[64px] triggers confirmed. |

**Plan 04 (Voice tab — CAPTURE-10):**

| Truth | Status | Evidence |
|-------|--------|----------|
| Persistent paper-grain Card with 3px terracotta-60 left border | ✓ VERIFIED | VoiceCaptureTab.tsx line 72: Card className="paper-grain shadow-card border-l-[3px] border-primary/60..." |
| Headline rendered via font-display italic | ✓ VERIFIED | Line 73: span className="font-display italic text-base text-foreground" |
| No webkitSpeechRecognition, getUserMedia, MediaRecorder, SpeechRecognition, Mic icon | ✓ VERIFIED | 0 hits for all forbidden patterns. |
| Envoyer and Recommencer at h-12 | ✓ VERIFIED | Lines 92, 101: className="h-12" on both buttons. |
| idle_helper i18n key reused verbatim, no new keys | ✓ VERIFIED | t("idle_helper") at line 74. No fr.json diff. |

**Plan 05 (Photo surfaces — CAPTURE-11):**

| Truth | Status | Evidence |
|-------|--------|----------|
| PhotoUploader Caméra + Photothèque at h-12 | ✓ VERIFIED | Lines 230, 238: className="h-12" |
| PhotoCaptureTab Caméra + Photothèque at h-12 | ✓ VERIFIED | Lines 170, 178: className="h-12" |
| PhotoCaptureTab submit at h-12 | ✓ VERIFIED | Line 221: className="h-12 w-full" |
| Plus tiles: paper-grain + border-primary/30 | ✓ VERIFIED | PhotoUploader line 218, PhotoCaptureTab line 158: paper-grain...border-primary/30 |
| X overlay: h-7 w-7 visible + before:-inset-2.5 hit pad | ✓ VERIFIED | PhotoUploader line 203, PhotoCaptureTab line 143: h-7 w-7...before:absolute before:-inset-2.5 |
| Filled tiles do NOT have paper-grain | ✓ VERIFIED | No paper-grain on filled tile divs (only on Plus tile button and overlay). |
| No h-11, no border-border on Plus tiles | ✓ VERIFIED | 0 h-11 hits; 0 border-2 border-dashed border-border hits. |

**Plan 06 (URL tab — CAPTURE-12):**

| Truth | Status | Evidence |
|-------|--------|----------|
| Submit at h-12 w-full | ✓ VERIFIED | UrlCaptureTab.tsx line 90: className="h-12 w-full" |
| No h-11 | ✓ VERIFIED | 0 hits |
| URL input keeps font-mono text-sm | ✓ VERIFIED | Line 71 confirmed |
| Helper card keeps bg-muted/60 p-3 | ✓ VERIFIED | Line 83 confirmed |
| Inline error keeps text-sm text-destructive mt-1 | ✓ VERIFIED | Line 79 confirmed |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/components/ui/alert-dialog.tsx` | font-display on AlertDialogTitle | ✓ VERIFIED | Line 126 |
| `frontend/components/ui/card.tsx` | font-display on CardTitle | ✓ VERIFIED | Line 41 |
| `frontend/components/ui/dialog.tsx` | font-display on DialogTitle | ✓ VERIFIED | Line 133 |
| `frontend/components/ui/sheet.tsx` | font-display on SheetTitle | ✓ VERIFIED | Line 117 |
| `frontend/app/globals.css` | no font-heading/font-sans aliases; scrollbar-none wired | ✓ VERIFIED | Aliases removed; scrollbar-none at lines 356-359 (WR-01 fix) |
| `frontend/app/styleguide/page.tsx` | transitions imported and used | ✓ VERIFIED | Line 14 import; line 254 usage (WR-02 fix) |
| `frontend/components/RecipeDraftCard.tsx` | paper-grain + AnimatePresence + h-12 buttons | ✓ VERIFIED | Lines 80, 93-105, 121, 138 |
| `frontend/app/inbox/page.tsx` | AnimatePresence list + Recipe type on deleted handler | ✓ VERIFIED | Lines 104 (Recipe type WR-03 fix), 134, 136-144 |
| `frontend/components/EmptyState.tsx` | paper-grain Card + text-title | ✓ VERIFIED | Lines 23, 25 |
| `frontend/app/recipes/new/page.tsx` | paper-grain Card on photo-picker + h-12 submit | ✓ VERIFIED | Lines 190, 207 |
| `frontend/components/RecipeForm.tsx` | h-12 submit | ✓ VERIFIED | Line 363 |
| `frontend/components/VoiceCaptureTab.tsx` | D-Voice callout Card + font-display italic + h-12 buttons | ✓ VERIFIED | Lines 72-73, 92, 101 |
| `frontend/components/PhotoUploader.tsx` | h-12 sheet buttons + paper-grain Plus tile + X hit-pad | ✓ VERIFIED | Lines 203, 218, 230, 238 |
| `frontend/components/PhotoCaptureTab.tsx` | h-12 sheet+submit + paper-grain Plus tile + X hit-pad | ✓ VERIFIED | Lines 143, 158, 170, 178, 221 |
| `frontend/components/UrlCaptureTab.tsx` | h-12 submit | ✓ VERIFIED | Line 90 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| RecipeDraftCard (containerClass) | .paper-grain CSS utility | className string prepend | ✓ WIRED | Line 80 |
| RecipeDraftCard (Brouillon Badge) | framer-motion AnimatePresence | mode="wait" initial={false} + motion.span variants.fadeIn | ✓ WIRED | Lines 93-105 |
| inbox/page.tsx (drafts list) | framer-motion AnimatePresence | initial={false} + motion.div variants.slideUp + exit opacity-fast | ✓ WIRED | Lines 134-146 |
| inbox/page.tsx (data) | /api/recipes?status=draft | api<Recipe[]>() in useEffect | ✓ FLOWING | Line 44 |
| EmptyState (wrapper) | .paper-grain + .text-title | className direct application | ✓ WIRED | Lines 23, 25 |
| new/page.tsx (photo-picker) | Card + paper-grain | Card className="paper-grain shadow-card p-4..." | ✓ WIRED | Line 190 |
| VoiceCaptureTab (callout) | paper-grain + border-primary/60 | Card className | ✓ WIRED | Line 72 |
| VoiceCaptureTab (callout headline) | font-display italic | span className="font-display italic..." | ✓ WIRED | Line 73 |
| PhotoUploader (Plus tile) | paper-grain + border-primary/30 | button className | ✓ WIRED | Line 218 |
| PhotoUploader (X overlay) | 48px hit pad | before:-inset-2.5 pseudo-element | ✓ WIRED | Line 203 |
| PhotoUploader (sheet buttons) | h-12 tap floor | className="h-12" | ✓ WIRED | Lines 230, 238 |
| PhotoCaptureTab (Plus tile) | paper-grain + border-primary/30 | button className | ✓ WIRED | Line 158 |
| PhotoCaptureTab (X overlay) | 48px hit pad | before:-inset-2.5 pseudo-element | ✓ WIRED | Line 143 |
| UrlCaptureTab (submit) | h-12 tap floor | className="h-12 w-full" | ✓ WIRED | Line 90 |
| D-Voice lock | no webkitSpeechRecognition | absence of forbidden patterns | ✓ WIRED | 0 hits for all 6 forbidden patterns |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| inbox/page.tsx (drafts list) | drafts (Recipe[]) | api<Recipe[]>("/api/recipes?status=draft&limit=200") + realtime onEvent handlers | Yes — real API call + realtime subscription; draftsCache for instant repaint | ✓ FLOWING |
| RecipeDraftCard | recipe prop | Parent (inbox/page.tsx) passes each Recipe from drafts array | Yes — data comes from real API response | ✓ FLOWING |
| EmptyState | heading/body props | i18n via t("empty_heading") / t("empty_body") in inbox/page.tsx | Yes — static i18n strings rendered to user | ✓ FLOWING |
| VoiceCaptureTab | idle_helper text | t("idle_helper") from fr.json | Yes — static i18n string; not dynamic data | ✓ FLOWING |
| PhotoUploader | urls state | useEffect signed-URL refresh from api (unchanged) | Yes — signed URLs from backend; business logic untouched | ✓ FLOWING |
| RecipeForm | form fields | Props from parent (recipeId, structured data); unchanged by Phase 6 | Yes — form state machine unchanged | ✓ FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED for Phase 6 re-theme checks. The surfaces involve a running server + real devices. Structural wiring (imports, classNames, AnimatePresence, API call) fully verified by grep. Live behavioral checks routed to human verification above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CAPTURE-08 | 06-03-PLAN.md | Quick-add capture surface re-themed with new tokens | ✓ SATISFIED | paper-grain Card on photo-picker (page.tsx:190); h-12 submit (page.tsx:207); Phase 5 Tabs+Button primitives inherited |
| CAPTURE-09 | 06-03-PLAN.md | Full-form capture surface re-themed with new tokens | ✓ SATISFIED | h-12 submit (RecipeForm.tsx:363); section spacing audit confirmed; Phase 5 Input/Label/Textarea inherited |
| CAPTURE-10 | 06-04-PLAN.md | Voice capture surface re-themed; D-Voice deviation copy preserved; no in-app mic regression | ✓ SATISFIED | paper-grain+border-primary/60 callout (VoiceCaptureTab:72); font-display italic (line 73); 0 forbidden patterns; h-12 buttons |
| CAPTURE-11 | 06-05-PLAN.md | Photo capture surface re-themed; PhotoUploader sheet buttons at h-12; closes W4 gap | ✓ SATISFIED | PhotoUploader h-12 lines 230/238; PhotoCaptureTab h-12 lines 170/178/221; Plus tile paper-grain+border-primary/30; X overlay before:-inset-2.5 |
| CAPTURE-12 | 06-06-PLAN.md | URL capture surface re-themed | ✓ SATISFIED | h-12 submit (UrlCaptureTab:90); font-mono preserved; bg-muted/60 helper preserved |
| CAPTURE-13 | 06-02-PLAN.md | Drafts inbox re-themed; draft vs structured visual distinction; recipe.created / recipe.promoted transitions | ✓ SATISFIED | paper-grain on draft rows; secondary/destructive badge distinction; AnimatePresence slideUp + opacity exit; EmptyState paper-grain+text-title |

**Orphaned requirements:** None. All 6 CAPTURE requirements are claimed by plans and have implementation evidence.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/app/globals.css` | 356-360 | `scrollbar-none` CSS utility | ℹ️ Info | Added by WR-01 code-review fix — correct implementation, expected artifact |
| `frontend/components/EmptyState.tsx` | 5-9 | Comment mentions `paper-grain` / `shadow-card` tokens (not just className) | ℹ️ Info | Noted in 06-02-SUMMARY.md: comment is prescribed plan content, not duplicate utility application. className uses each utility exactly once. |
| `frontend/app/styleguide/page.tsx` | multiple | Hardcoded French strings bypassing next-intl | ℹ️ Info | Pre-existing; IN-02 from code review; notFound() guard in production prevents regression. |
| `frontend/components/RecipeDraftCard.tsx` | - | Phase 5 type-scale drift (text-base font-semibold vs text-body) | ℹ️ Info | IN-01 from code review; not a blocker; Phase 5 convergence work for Phase 7+. |
| `frontend/components/PhotoCaptureTab.tsx` | 116-117 | text-xl font-semibold instead of text-title | ℹ️ Info | IN-01 from code review; out of Phase 6 scope per UI-SPEC. |

No STUB or MISSING patterns found. No hardcoded empty arrays/objects flowing to rendered UI. No `return null` or placeholder components. All TODO(productize) markers are correctly scoped (D-Quick-Add native picker architectural lock, tab deep-link URL param, PhotoUploader DELETE endpoint).

### Human Verification Required

#### 1. Phase 5 Token Visual Cohesion on All 5 Capture Surfaces

**Test:** On iPhone Safari PWA standalone, open /recipes/new and cycle through all 5 tabs (Rapide, Complète, Voix, Photo, URL). Also visit /inbox.
**Expected:** Every surface reads as the Slow Food artisanal identity. Paper-grain visible as subtle warm noise on: the Quick-add photo-picker Card, the Voice callout Card, the Photo Plus-tile buttons, and draft card rows in the inbox. No rose/slate color tokens remain. Terracotta visible on: Voice callout left border strip, Photo Plus-tile dashed border (faint), primary action buttons. Fraunces display-serif visible on: Voice callout italic headline, EmptyState heading, all Title primitives in dialogs/sheets.
**Why human:** Visual cohesion is a holistic quality judgment. The four design principles (Design Quality, Originality, Craft, Functionality) in SC-5 require /gsd-ui-review scoring against 06-UI-SPEC to quantify — grep cannot score "demonstrable" quality.

#### 2. recipe.created Animation — Slide-in from y:12

**Test:** With /inbox open on one device, capture a recipe from a second device or browser session.
**Expected:** The new draft card slides in from y:12 → y:0 over ~280ms with the easeCraft curve (no instant flash, no fade-only). Existing cards do NOT animate on this event.
**Why human:** AnimatePresence initial={false} + variants.slideUp wiring is verified by grep. The actual 280ms easeCraft timing and absence of re-hydration animation requires a live device with a working WebSocket realtime connection.

#### 3. recipe.promoted Animation — Opacity-only Exit

**Test:** With /inbox open showing at least one processing draft, trigger or wait for Gemini promotion.
**Expected:** The row fades out via opacity-only (no slide-down) over ~150ms (transitions.fast). The row does not linger. The Brouillon Badge cross-fades if it was visible before exit.
**Why human:** The exit animation shape (opacity-only, not positional) requires live observation. The transitions.fast duration (150ms) cannot be verified statically.

#### 4. iOS Reduce Motion Clamp

**Test:** Enable iOS Settings → Accessibility → Motion → Reduce Motion. Open /inbox, observe existing draft cards. Capture a new recipe from a second device.
**Expected:** All animations clamp to instant — the slide-in, any badge cross-fade, and any exit animation are immediate with no motion. The prefers-reduced-motion media query in globals.css should enforce this.
**Why human:** CSS media query behavior in PWA standalone mode requires on-device verification. The absence of useReducedMotion() calls is verified; the CSS clamp effectiveness needs live testing.

### Gaps Summary

No gaps blocking goal achievement. All 6 requirements (CAPTURE-08 through CAPTURE-13) have verified implementation. All 3 code-review warnings were fixed (commits 36954de, ac2fd1f, e82d2e7). The 5 info items from the review are out-of-scope cosmetic observations with no impact on phase goal.

The human_needed status reflects 4 items that require live device testing or a /gsd-ui-review scoring run — specifically: the visual cohesion quality assessment (SC-5, which is the "demonstrable" bar), and the three animation behaviors (slide-in, opacity-exit, reduced-motion) whose wiring is verified but whose timing and feel must be observed live.

---

_Verified: 2026-05-08T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
