---
phase: 09-onboarding-+-identity-polish
verified: 2026-05-08T20:00:00Z
status: human_needed
score: 9/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Install Al Dente via Safari → Add to Home Screen on iPhone and confirm the home-screen icon displays a terracotta (#C8553D) background with a cream food-symbol outline — not the legacy rose #F43F5E or any generic icon"
    expected: "Terracotta-backed pasta-strand identity mark appears on the home screen; warm cream (#FAF7F2) splash background on open; terracotta status-bar tint visible"
    why_human: "PWA install icon and splash chrome require a real iOS device; cannot be verified by grep or build output alone — real-device smoke test is the only way to confirm Safari resolves the Next.js 16 /icon and /apple-icon routes correctly post-deploy"
  - test: "Navigate through all 4 onboarding screens (Welcome → Create → Share-code → Join) and confirm the visual experience reads as a coherent Slow Food first-touch path — Fraunces italic wordmarks, paper-grain Cards, terracotta accents, h-12 tap targets all present and feeling right together"
    expected: "The four design principles (Design Quality, Originality, Craft, Functionality) are visible in the first-touch path; no screen looks unpolished or inconsistent with the rest of the v0.2 app"
    why_human: "Visual coherence and design-principle verification cannot be asserted by grep; requires real-device or browser rendering to confirm the Fraunces italic font loads, paper-grain texture renders, and the identity signature (invite code on share-code and Settings) reads as intended at iPhone scale"
  - test: "Open Settings and verify the 3-Card layout (Membre → Foyer → Sauvegarde) reads naturally; confirm the invite-code in the Foyer Card is visually identical in register to the invite code on the Share-code screen"
    expected: "font-display italic text-3xl tracking-widest text-primary renders as the same Fraunces italic terracotta weight on both surfaces; first-touch ↔ re-find identity thread is visible"
    why_human: "Font rendering confirmation requires a browser; font-display property (swap) could theoretically fall back on slow connections"
  - test: "Tap between BottomNav tabs and confirm the active-state pill wash (bg-primary/8 rounded-full h-10 w-10) appears behind the active icon; confirm the À compléter (Inbox) tab shows a Pressenti-style pill badge when drafts are present"
    expected: "Active tab shows a warm terracotta wash behind the icon, not the old 2px top-bar accent; badge renders as a rounded pill (no parens); transitions feel appropriately fast (150ms) not instant"
    why_human: "Active state visual transition and badge positioning (right-1/4 anchor on real iPhone) require real-device verification; the 09-04 SUMMARY.md notes that no real-device badge-position test was performed — right-1/4 is the plan default but may need adjustment to right-1/3 or right-2 on iPhone"
---

# Phase 9: Onboarding + Identity Polish — Verification Report

**Phase Goal:** Bring the first-touch and identity surfaces — household create/join, settings, BottomNav, and the installable PWA identity (icon + splash) — into the Slow Food design system.
**Verified:** 2026-05-08T20:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Create + join flows present coherently — terracotta accents, warm typography, paper-grain card surfaces | VERIFIED | `paper-grain` in all 4 onboarding pages confirmed; `text-display` on every screen title; `h-12` tap targets present; `#F43F5E` absent from entire frontend tree |
| 2 | Settings renders member color attribution, household info, invite-code, copy affordance with Phase 5 tokens | VERIFIED | 3 `<Card>` instances with `paper-grain shadow-card`; `MemberDot` wired to `session.me.color_hex`; identity signature `font-display italic text-3xl tracking-widest text-primary` at line 145; `h-12 w-12` copy Button; `h-12 w-full` export Button |
| 3 | BottomNav re-themed — warm palette, motion language, zero cool-gray | VERIFIED | `bg-primary/8` active-pill wash present; `bg-primary/15 text-primary border border-primary/40` Pressenti badge present; `text-xs` labels; `duration-fast ease-craft` transitions; zero `text-(slate\|zinc)\|bg-(slate\|zinc)` hits; zero hardcoded hex |
| 4 | Home-screen icon shows new terracotta identity with matching splash — no `#F43F5E` in manifest | VERIFIED (automated) / ? HUMAN (real device) | `manifest.json`: `theme_color: "#C8553D"`, `background_color: "#FAF7F2"`, icons point at `/icon` and `/apple-icon`; `layout.tsx:46`: `themeColor: "#C8553D"`; zero `F43F5E` hits across `app/`, `components/`, `public/`; requires real iPhone to confirm Safari install path resolves correctly |
| 5 | Four design principles hold across first-touch path; app reads as single coherent product | ? HUMAN | Code structure is consistent and correct; actual design-principle verification requires human visual assessment on device |

**Score:** 9/10 must-haves verified (counting roadmap SC 4 as automated-only partial; SC 5 as human-only)

### Deferred Items

None. Phase 9 is the final phase of the v0.2 milestone.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/app/icon.tsx` | Next.js 16 ImageResponse 256×256 terracotta + cream pasta-strand | VERIFIED | 44 lines; `import { ImageResponse } from "next/og"`; `export const size = { width: 256, height: 256 }`; `export const contentType = "image/png"`; `export default function Icon()`; background `#C8553D`; stroke `#FAF7F2` |
| `frontend/app/apple-icon.tsx` | Next.js 16 ImageResponse 180×180, identical visual contract | VERIFIED | 42 lines; identical contract; `size = { width: 180, height: 180 }` |
| `frontend/app/layout.tsx` | viewport.themeColor = `#C8553D` (Phase 5 deferral closure) | VERIFIED | Line 46: `themeColor: "#C8553D"` |
| `frontend/public/manifest.json` | `theme_color = #C8553D`, `background_color = #FAF7F2`, icons → `/icon` + `/apple-icon` | VERIFIED | All values confirmed; legacy `#FFFFFF`/`#0A0A0A` gone; icons reference Next.js file-convention routes |
| `frontend/app/onboarding/welcome/page.tsx` | `text-display` wordmark + 2 paper-grain CTA Cards + h-12 interior Links | VERIFIED | `text-display` at line 24; 2 `paper-grain` Cards with `border-l-[3px] border-primary/60`; `h-12` on both Link interiors |
| `frontend/app/onboarding/create/page.tsx` | Form-body paper-grain Card + `text-display` title + h-12 floor | VERIFIED | `paper-grain` Card at line 91; `text-display` at line 94; `h-12 w-12` back button; `h-12 w-full` submit |
| `frontend/app/onboarding/share-code/page.tsx` | paper-grain Card + `text-display` title + identity signature + h-12 | VERIFIED | `paper-grain` Card at line 49; `text-display` at line 51; identity signature `font-display italic text-3xl tracking-widest text-primary` at line 60; `h-12` on copy and done buttons |
| `frontend/app/onboarding/join/page.tsx` | Form-body paper-grain Card + `text-display` title + h-12 floor + mono Input preserved | VERIFIED | `paper-grain` Card at line 168; `text-display` at line 170; `h-12 w-12` at line 157; `h-12 w-full` at line 263; `tracking-[0.3em]` appears exactly 1 time (entry-time mono Input preserved) |
| `frontend/app/settings/page.tsx` | 3 paper-grain Cards + identity signature + h-12 copy + h-12 export | VERIFIED | 3 `paper-grain` instances; 3 `<Card` instances; identity signature at line 145; `h-12 w-12` copy at line 156; `h-12 w-full` export at line 181; 195 lines total |
| `frontend/components/BottomNav.tsx` | bg-primary/8 active wash + Pressenti badge + text-xs + zero cool-gray | VERIFIED | All acceptance checks pass; `aria-label="Navigation principale"` WR-01 fix confirmed at line 85 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/icon.tsx` | Next.js 16 file-conventions resolver | `export const size\|contentType\|default function` | VERIFIED | All 3 required exports present; `from "next/og"` confirmed; no `next/server` |
| `app/layout.tsx` | `viewport.themeColor` literal hex | `themeColor: "#C8553D"` | VERIFIED | Line 46 confirmed |
| `public/manifest.json` | iOS Safari PWA splash chrome | `"theme_color": "#C8553D"\|"background_color": "#FAF7F2"` | VERIFIED | Both values confirmed; valid JSON |
| `onboarding/welcome/page.tsx` | `@/components/ui/card` | `import { Card } from "@/components/ui/card"` | VERIFIED | Import present |
| `onboarding/share-code/page.tsx` | Phase 9 identity signature | `font-display italic text-3xl tracking-widest text-primary` | VERIFIED | Contiguous substring at line 60 |
| `onboarding/create/page.tsx` | `ColorSwatchPicker` + `@/components/ui/card` | `ColorSwatchPicker` at line 123; Card import present | VERIFIED | Both imports confirmed |
| `app/settings/page.tsx` | Phase 9 identity signature (Plan 02 mirror) | `font-display italic text-3xl tracking-widest text-primary` | VERIFIED | Byte-identical at line 145; cross-plan invariant satisfied |
| `app/settings/page.tsx` | `MemberDot` | `MemberDot colorHex={session.me.color_hex}` at line 118 | VERIFIED | Import at line 10; usage at line 118 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `settings/page.tsx` invite-code | `session.invite_code` | `SessionProvider` (authenticated session) | Yes — real session data from cookie auth | FLOWING |
| `settings/page.tsx` member dot | `session.me.color_hex` | `SessionProvider` | Yes | FLOWING |
| `BottomNav.tsx` badge | `draftCount` | `useState` + `/api/recipes?status=draft&limit=200` fetch in `useEffect` + realtime subscription | Yes — live API call | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| manifest.json is valid JSON | `node --eval 'JSON.parse(...)'` | VALID JSON | PASS |
| icon.tsx exports size, contentType, default | `node -e` source analysis | all 3 present | PASS |
| No `next/server` import (must use `next/og`) | `grep "next/server" icon.tsx apple-icon.tsx` | 0 hits | PASS |
| Zero `F43F5E` in app/, components/, public/ | `grep -rn "F43F5E"` | 0 hits | PASS |
| manifest theme_color = #C8553D, background_color = #FAF7F2 | direct file read | confirmed | PASS |
| PWA install icon + splash chrome on real iPhone | requires real device | not testable without device | SKIP → human |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| ONBOARD-07 | 09-02-PLAN.md | Household create screen re-themed | SATISFIED | `paper-grain` Card + `text-display` title + `h-12` buttons in `create/page.tsx` confirmed |
| ONBOARD-08 | 09-02-PLAN.md | Household join (invite-code entry) screen re-themed | SATISFIED | `paper-grain` Card + `text-display` title + `h-12` buttons + mono Input preserved in `join/page.tsx` confirmed |
| ONBOARD-09 | 09-03-PLAN.md | Settings screen re-themed | SATISFIED | 3 paper-grain Cards; identity signature; `h-12` tap targets; `MemberDot` wired to session |
| ONBOARD-10 | 09-01-PLAN.md | PWA manifest icon + splash updated to new identity | SATISFIED (automated) | `icon.tsx` + `apple-icon.tsx` + manifest + themeColor all updated; Phase 5 deferral closed |
| ONBOARD-11 | 09-04-PLAN.md | BottomNav re-themed | SATISFIED | Active-pill wash, Pressenti badge, text-xs labels, Phase 5 tokens, zero cool-gray |

All 5 ONBOARD requirements (ONBOARD-07 through ONBOARD-11) are covered by the 4 plans. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `BottomNav.tsx` | 81 | `TODO(productize): move to nav.aria_label key` | Info | Intentional deferral — hardcoded `"Navigation principale"` is the accepted WR-01 fix per REVIEW-FIX.md; not a blocker |
| `apple-icon.tsx` | 35-36 | SVG path data duplicated from `icon.tsx` | Info | Documented intentional duplication per UI-SPEC §"PWA Identity" line ~393; no `TODO(productize)` marker present (IN-01 from REVIEW.md — deferred) |

No blockers found. Zero `dangerouslySetInnerHTML` introduced. Zero hardcoded hex in BottomNav. Zero cool-gray references. Zero new i18n keys (fr.json line count = 353).

### Human Verification Required

#### 1. PWA Install Icon and Splash Chrome (Real Device)

**Test:** Push to main, wait ~60s for Vercel auto-deploy. On iPhone Safari, navigate to the deployed URL, tap "Add to Home Screen." Confirm:
  (a) Home-screen icon shows terracotta `#C8553D` background with cream pasta-strand outline
  (b) Opening the installed PWA shows warm cream `#FAF7F2` splash background (not pure white)
  (c) Status bar tints terracotta `#C8553D`
  (d) 32px favicon scaling is clean with no aliasing artifacts on the pasta-strand geometry
**Expected:** Terracotta-backed identity mark; cream splash; terracotta status-bar tint
**Why human:** PWA icon resolution via Next.js 16 file-convention routes (`/icon`, `/apple-icon`) on iOS Safari requires actual device and a real Vercel deploy — no automated substitute exists. The build confirms the routes exist as static prerendered output, but iOS Safari's `<head>` injection and manifest icon resolution are platform behaviors.

#### 2. Onboarding First-Touch Design Coherence

**Test:** Open the app fresh (no session) on iPhone. Navigate Welcome → Create → Share-code (note invite code display) → back to Welcome → Join. Assess whether the four design principles hold: Design Quality (Fraunces italic fonts load cleanly), Originality (paper-grain texture is visible on Cards), Craft (h-12 tap targets feel appropriately sized), Functionality (navigation logic unchanged, forms submit correctly).
**Expected:** Coherent Slow Food artisanal first-touch path; no rose `#F43F5E` anywhere; share-code invite code renders in Fraunces italic terracotta (not mono)
**Why human:** Design-principle assessment ("does this read as artisanal, not generic?") is inherently subjective and requires visual rendering on the target device.

#### 3. Settings Identity-Signature Visual Parity

**Test:** On a logged-in session, open Settings and find the invite code in the Foyer Card. Open the Share-code screen in another tab (or recall from Create flow). Confirm the invite code renders with identical visual weight and register on both surfaces.
**Expected:** `font-display italic text-3xl tracking-widest text-primary` renders identically in both places — the first-touch ↔ re-find identity thread is visible
**Why human:** Font rendering at `text-3xl` in Fraunces italic requires a browser; the class strings are byte-identical (confirmed programmatically) but visual parity confirmation requires rendering.

#### 4. BottomNav Active Wash + Badge Position on iPhone

**Test:** On iPhone, tap each tab in BottomNav. Confirm: (a) active tab shows `bg-primary/8` warm wash behind the icon (not the old 2px top-bar accent); (b) badge position `right-1/4` on the Inbox tab looks correct when a draft count badge is present — if it overlaps with the icon or looks misaligned, note whether `right-1/3` or `right-2` would be better.
**Expected:** Warm rounded-full pill wash; Pressenti-style badge pill at top-right of icon with correct positioning; transitions at ~150ms
**Why human:** The 09-04 SUMMARY.md explicitly documents that no real-device badge-position test was done — `right-1/4` is the plan's locked starting point but the executor flagged it for human verification.

### Gaps Summary

No gaps identified. All automated must-haves pass. The 4 human-verification items are expected at this stage of a frontend-only polish phase — they address:
1. Real-device PWA install icon rendering (untestable without Safari + deploy)
2. Design-principle coherence assessment (inherently subjective/visual)
3. Font rendering parity confirmation
4. BottomNav badge position on physical hardware (flagged by executor as needing real-device check)

The codebase is in the correct state: zero `#F43F5E` anywhere in the frontend tree, all 5 ONBOARD requirements satisfied by grep-verifiable patterns, the WR-01 accessibility bug fixed, and all anti-patterns from the code review either resolved or accepted as intentional deferred items. Proceed to real-device verification.

---

_Verified: 2026-05-08T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
