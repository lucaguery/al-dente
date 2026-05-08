---
phase: 07-decide-polish
verified: 2026-05-08T00:00:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
gaps: []
human_verification:
  - test: "Open daily-decide screen on iPhone Safari PWA (shortlist with ≥1 card) and confirm the Fraunces-italic date header ('vendredi 8 mai' or current day) renders above the deck at the correct typographic scale (32–44px clamp)"
    expected: "Display-serif italic date in Fraunces above the swipe deck, not in IBM Plex Sans, correct French locale lowercase"
    why_human: "text-display utility rendering + Fraunces font loading on iOS Safari PWA requires visual inspection at PWA-compressed size"
  - test: "Swipe a card partially right, then release — confirm spring snap-back feels like 'card on a counter' (stiffness 240 / damping 28 / mass 1.1)"
    expected: "Smooth damped return to center, not rubber-band overshot bounce; tactile difference from default spring is perceptible at 60Hz"
    why_human: "Framer Motion spring physics cannot be verified by grep — requires physical device swipe on dual iPhone setup"
  - test: "Enable iOS Reduce Motion and swipe a card — confirm drag is disabled, rotation overlays absent, snap-back collapses to instant"
    expected: "Deck advances via thumb buttons only; no spring animation; prefers-reduced-motion CSS clamp correctly inherited"
    why_human: "prefers-reduced-motion behavior requires OS setting + physical interaction to verify"
  - test: "Trigger the Pressenti branch (one yes vote, one vote pending) and inspect the 'Tu décides' delegation surface"
    expected: "Paper-grain Card with 3px terracotta left border, Fraunces-italic 16px body, h-12 w-full terracotta CTA — visually reads as 'deliberate, not stock shadcn'"
    why_human: "Visual design quality judgment — DECIDE-04 success criterion 4 requires perceiving intentionality of the affordance, not just class-string presence"
  - test: "Open cold-start state (corpus < 10 recipes) and tap the ColdStartChip dismiss X button"
    expected: "48px (h-12 w-12) touch target is comfortably hittable; chip dismisses; paper-grain card surface with terracotta Sparkles and Fraunces italic body visible"
    why_human: "Tap-target feel and visual retheme require real device interaction on iPhone Safari"
---

# Phase 7: Decide Polish — Verification Report

**Phase Goal:** Re-theme the daily decision flow — shortlist, swipe deck, vote chips, delegation, cold-start — and reconcile the `--color-validé-tint` token naming, while closing the ColdStartChip W4 tap-target gap.
**Verified:** 2026-05-08
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

All 5 roadmap success criteria were derived from the ROADMAP.md Phase 7 section.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees the daily shortlist screen rendered with Phase 5 tokens — terracotta accents, cream surfaces, warm-gray secondary chrome, paper-grain on recipe cards | ✓ VERIFIED | `HomeDecide.tsx:413-415` — `<header><h1 className="text-display text-foreground">` present; `ShortlistCard.tsx:135-136` — `paper-grain bg-card` on both front+peek; `VoteSummary.tsx:127` — `text-title` heading; `h-12` tap-targets throughout |
| 2 | User swipes a recipe in the framer-motion deck and the gesture uses the new motion language (one curve, paper-physics feel) and respects `prefers-reduced-motion` | ✓ VERIFIED (automated) / ? HUMAN (feel) | `motion.ts:24` — `springSnap: { type: "spring", stiffness: 240, damping: 28, mass: 1.1 } satisfies Transition`; `ShortlistCard.tsx:132` — `transition={isFront && !reducedMotion ? transitions.springSnap : undefined}`; physical feel requires human test |
| 3 | User sees the 5 vote-chip states (Validé / Pressenti / Contesté / Rejeté / Sans avis) presented with reconciled token naming — spec, CSS variable, and component class all agree on a single name | ✓ VERIFIED | `globals.css:72-73` — DECIDE-03 comment lock above `--color-valide-tint`; `VoteSummary.tsx:55-69` — `chipClass()` helper with all 5 LOCKED class strings; accented form `--color-validé-tint` absent from all component files |
| 4 | User opens the "Tu décides" delegation surface and the affordance reads as deliberate, not stock shadcn | ✓ VERIFIED (code) / ? HUMAN (perceived quality) | `VoteSummary.tsx:172,187` — `<Card className="paper-grain shadow-card border-l-[3px] border-primary/60 px-4 py-3 flex flex-col gap-3">` both branches; `font-display italic text-base text-foreground` body; deliberateness of feel requires human test |
| 5 | User sees a polished cold-start / empty-shortlist state and the ColdStartChip dismiss button now meets the 48px (h-12) tap-target floor | ✓ VERIFIED | `ColdStartChip.tsx:45,56` — `bg-card paper-grain shadow-card` outer div, `h-12 w-12` dismiss Button; `bg-surface-rose-50` absent; `text-primary` Sparkles; `font-display italic` body |

**Score:** 5/5 truths verified (automated); 3 truths also require human validation for perceptual/quality aspects

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/app/globals.css` | DECIDE-03 invariant lock comment at `--color-valide-tint` | ✓ VERIFIED | Line 72: `/* CANONICAL — DO NOT introduce \`--color-validé-tint\` (with French accent). DECIDE-03 invariant lock. */`; line 73: `--color-valide-tint: var(--valide-tint);` |
| `frontend/components/ColdStartChip.tsx` | Re-themed with paper-grain, terracotta Sparkles, Fraunces italic body, h-12 dismiss | ✓ VERIFIED | `paper-grain shadow-card bg-card` outer div; `text-primary` Sparkles; `font-display italic text-sm text-foreground` body; `h-12 w-12` Button; `bg-surface-rose-50` absent; `h-8 w-8` absent |
| `frontend/lib/motion.ts` | `springSnap` named transition with stiffness 240 / damping 28 / mass 1.1 | ✓ VERIFIED | Line 24: `springSnap: { type: "spring", stiffness: 240, damping: 28, mass: 1.1 } satisfies Transition`; all 3 transitions carry `satisfies Transition`; existing `fast`, `normal`, `swipeCommit`, `easeCraft`, `durations` preserved |
| `frontend/components/ShortlistCard.tsx` | `transitions.springSnap` on front motion.div; `paper-grain` on both variants; `rounded-t-2xl overflow-hidden` on photo region | ✓ VERIFIED | Line 30: import; line 132: `transition={isFront && !reducedMotion ? transitions.springSnap : undefined}`; lines 135-136: `paper-grain` on both variants; line 140: `rounded-t-2xl overflow-hidden`; `rounded-t-xl` absent |
| `frontend/components/VoteSummary.tsx` | `chipClass()` helper (5-state); paper-grain delegation Cards (both branches); `text-title` heading; `h-12` regenerate | ✓ VERIFIED | `chipClass()` at line 55; all 5 LOCKED class strings present; 2x `border-l-[3px] border-primary/60` Card wraps; 2x `font-display italic text-base`; 2x `h-12 w-full`; `h-11` absent; `text-title` at lines 127+157; `h-14 rounded-2xl` cook CTA preserved |
| `frontend/components/HomeDecide.tsx` | Fraunces-italic date header via `text-display` + `Intl.DateTimeFormat('fr-FR')` | ✓ VERIFIED | `formattedDate` const at line 395 (inside component body, after shortlist-null guard); `<header className="px-6 pt-8 pb-2">` at line 413; `<h1 className="text-display text-foreground">` at line 414; `weekday: "long"`, `day: "numeric"`, `month: "long"` options present; no-shortlist branch untouched |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ColdStartChip.tsx` | Phase 5 token system (bg-card, paper-grain, shadow-card) | Tailwind classes | ✓ WIRED | `bg-card paper-grain shadow-card` in outer div className (line 45) |
| `ColdStartChip.tsx` | D-08 48px tap-target floor | `h-12 w-12` dismiss Button | ✓ WIRED | Line 56 confirms `h-12 w-12` |
| `globals.css` | DECIDE-03 token reconciliation | 1-line CSS comment at line 72 | ✓ WIRED | Comment with "DECIDE-03 invariant lock" anchor present; accented form named in comment only, never as declaration |
| `ShortlistCard.tsx` | `frontend/lib/motion.ts` | `import { transitions } from '@/lib/motion'` | ✓ WIRED | Line 30 import + line 132 `transitions.springSnap` consumption |
| `ShortlistCard.tsx` | Phase 5 paper-grain utility | `paper-grain` on both isFront and peek branches | ✓ WIRED | 2 occurrences at lines 135-136 |
| `ShortlistCard.tsx` | prefers-reduced-motion | `isFront && !reducedMotion` guard on transition prop | ✓ WIRED | Line 132 guard; `usePrefersReducedMotion` hook preserved |
| `VoteSummary.tsx` | DECIDE-03 5-state chip mapping | `chipClass(state)` returning per-state pill class strings | ✓ WIRED | Lines 55-69; call site at line 139 (`chipClass(row.state)`) |
| `VoteSummary.tsx` | D-Voice callout pattern (paper-grain Card + border-l-[3px] + Fraunces italic) | Pressenti + fallback Card wraps | ✓ WIRED | Lines 172, 187 both use `paper-grain shadow-card border-l-[3px] border-primary/60`; body at 173, 188 uses `font-display italic text-base text-foreground` |
| `HomeDecide.tsx` | Phase 5 typography (text-display Fraunces italic) | `<h1 className="text-display text-foreground">` | ✓ WIRED | Line 414 |
| `HomeDecide.tsx` | Browser Intl API (no new i18n key) | `new Intl.DateTimeFormat("fr-FR", ...)` | ✓ WIRED | Line 395; `fr.json` diff is empty |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `HomeDecide.tsx` date header | `formattedDate` | `new Intl.DateTimeFormat("fr-FR", {...}).format(new Date())` | Yes — browser API, current locale date | ✓ FLOWING |
| `VoteSummary.tsx` chip display | `row.state` | `useMemo` rows derivation via `computeVoteState(votes, memberCount)` (pre-existing, unchanged) | Yes — computed from real vote data | ✓ FLOWING (unchanged from pre-Phase-7; Phase 7 only changed the class projection) |
| `ShortlistCard.tsx` spring snap | `transitions.springSnap` | Constant from `@/lib/motion` | Yes — compile-time constant with correct values | ✓ FLOWING |
| `ColdStartChip.tsx` dismiss state | `dismissed` (useSyncExternalStore) | `window.sessionStorage.getItem(STORAGE_KEY)` | Yes — sessionStorage gate preserved byte-for-byte | ✓ FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED for behavioral checks requiring a running server (Framer Motion spring physics, iOS Reduce Motion, PWA font loading). These are routed to the human verification section. TypeScript and lint passes were confirmed by the executor in SUMMARY.md files and can be rerun:

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| DECIDE-03 comment lock in globals.css | `grep -c "DECIDE-03 invariant lock" frontend/app/globals.css` | 1 | ✓ PASS |
| ColdStartChip h-12 dismiss | `grep -c "h-12 w-12" frontend/components/ColdStartChip.tsx` | 1 | ✓ PASS |
| ColdStartChip legacy alias absent | `grep -c "bg-surface-rose-50" frontend/components/ColdStartChip.tsx` | 0 | ✓ PASS |
| springSnap exported from motion.ts | `grep -c "springSnap" frontend/lib/motion.ts` | 1 | ✓ PASS |
| ShortlistCard consumes springSnap | `grep -c "transitions.springSnap" frontend/components/ShortlistCard.tsx` | 1 | ✓ PASS |
| ShortlistCard paper-grain ≥ 2 | `grep -c "paper-grain" frontend/components/ShortlistCard.tsx` | 2 | ✓ PASS |
| ShortlistCard rounded-t-2xl | `grep -c "rounded-t-2xl" frontend/components/ShortlistCard.tsx` | 1 | ✓ PASS |
| ShortlistCard rounded-t-xl absent | `grep -c "rounded-t-xl" frontend/components/ShortlistCard.tsx` | 0 | ✓ PASS |
| ShortlistDeck LOC (structural-rewrite prohibition) | `wc -l frontend/components/ShortlistDeck.tsx` | 141 | ✓ PASS |
| chipClass helper present | `grep -c "function chipClass" frontend/components/VoteSummary.tsx` | 1 | ✓ PASS |
| stateClass removed | `grep -c "function stateClass" frontend/components/VoteSummary.tsx` | 0 | ✓ PASS |
| All 5 chip class strings present | valide/pressenti/conteste/rejete/sans_avis case strings | 5/5 | ✓ PASS |
| Delegation Cards ≥ 2 | `grep -c "border-l-\[3px\] border-primary/60" frontend/components/VoteSummary.tsx` | 2 | ✓ PASS |
| VoteSummary h-11 absent | `grep -c "h-11" frontend/components/VoteSummary.tsx` | 0 | ✓ PASS |
| VoteSummary h-14 cook CTA preserved | `grep -c "h-14 rounded-2xl" frontend/components/VoteSummary.tsx` | 1 | ✓ PASS |
| HomeDecide date header present | `grep -c "text-display" frontend/components/HomeDecide.tsx` | 1 | ✓ PASS |
| HomeDecide Intl.DateTimeFormat | `grep -c "Intl.DateTimeFormat" frontend/components/HomeDecide.tsx` | 1 | ✓ PASS |
| HomeDecide fr-FR locale | `grep -c "fr-FR" frontend/components/HomeDecide.tsx` | 1 | ✓ PASS |
| HomeDecide formattedDate ≥ 2 | declaration + JSX interpolation | 2 | ✓ PASS |
| HomeDecide all 5 handlers preserved | `grep -c "handleVoteApplied\|handleDelegate\|..."` | 11 | ✓ PASS |
| HomeDecide 4 realtime listeners preserved | `grep -c "VOTE_CREATED_DOM_EVENT\|..."` | 12 | ✓ PASS |
| No-shortlist branch untouched | no `<header>` or `text-display` in null branch (lines 345-368) | confirmed | ✓ PASS |
| Zero new i18n keys | `git diff frontend/lib/i18n/fr.json` | empty | ✓ PASS |
| No dangerouslySetInnerHTML in any modified file | grep across all 5 modified files | 0 | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DECIDE-01 | 07-04-PLAN | Daily shortlist screen re-themed with new tokens | ✓ SATISFIED | HomeDecide.tsx `text-display` date header + `Intl.DateTimeFormat('fr-FR')` + Phase 5 tokens throughout |
| DECIDE-02 | 07-02-PLAN | Swipe deck refined with new motion language (one curve, paper-physics feel) | ✓ SATISFIED | `springSnap` in motion.ts; ShortlistCard consumes it on front card with `isFront && !reducedMotion` guard; paper-grain on both card variants |
| DECIDE-03 | 07-01-PLAN, 07-03-PLAN | Vote chip presentation refined; `--color-validé-tint` reconciled | ✓ SATISFIED | Comment lock in globals.css:72; `chipClass()` 5-state helper in VoteSummary replaces `stateClass()`; accented form absent from all component files |
| DECIDE-04 | 07-03-PLAN | "Tu décides" delegation surface refined with new tokens | ✓ SATISFIED | Both Pressenti + fallback branches wrapped in `<Card className="paper-grain shadow-card border-l-[3px] border-primary/60">` with Fraunces italic body and `h-12 w-full` CTA |
| DECIDE-05 | 07-01-PLAN | Cold-start / empty-shortlist states polished; ColdStartChip dismiss at h-12 | ✓ SATISFIED | ColdStartChip outer div uses `bg-card paper-grain shadow-card`; dismiss Button is `h-12 w-12`; `bg-surface-rose-50` and `h-8 w-8` both absent |

All 5 phase requirements verified. No orphaned requirements.

### Anti-Patterns Found

The code review (07-REVIEW.md) identified 4 info-level observations. None are blockers for goal achievement:

| File | Issue | Severity | Impact |
|------|-------|----------|--------|
| `HomeDecide.tsx:71,186,192` | Non-ASCII identifier `validéToastedFor` — breaks grep searches, inconsistent with ASCII-only identifier convention | ℹ️ Info | Style inconsistency; no functional impact on Phase 7 goal |
| `VoteSummary.tsx:60,74` | Two syntaxes for same token: `bg-[var(--color-valide-tint)]` (line 60) vs `bg-valide-tint` (line 74 rowBgClass) | ℹ️ Info | Redundant form; both work correctly; `bg-valide-tint` is cleaner |
| `HomeDecide.tsx:153` | Dead `partner` guard in vote-drift-detection block — `partner` is unreferenced inside the if-body | ℹ️ Info | Misleading guard; not a bug; drift detection still works correctly |
| `ShortlistCard.tsx:74` | Raw enum strings (`{cuisine}`, `{m}`) displayed without next-intl translation — pre-existing from Phase 3 | ℹ️ Info (pre-existing) | Pre-existing i18n TODO(productize), carried forward; not introduced by Phase 7 |

None of the above are 🛑 blockers. All are deferred (review explicitly classifies them as info-level; the non-ASCII identifier and token syntax duplication are cleanup candidates for a future commit).

### Human Verification Required

Phase 7 delivers visual + tactile changes exclusively. Automated grep checks confirm all code patterns are present and wired. The following items require a real iPhone to verify goal achievement at the perceptual level mandated by the success criteria:

#### 1. Fraunces date header rendering on iOS Safari PWA (DECIDE-01)

**Test:** Open the daily-decide screen on iPhone Safari with the PWA installed ("Add to Home Screen"). Verify the date header ("vendredi 8 mai" or current day) renders in Fraunces italic at the display-serif scale (32–44px clamp), above the swipe deck.
**Expected:** Legible, editorial Fraunces italic in French lowercase; not IBM Plex Sans; diacritics (é, è, û) render crisply at PWA-compressed size.
**Why human:** `text-display` utility rendering on iOS Safari requires visual inspection — font loading failures or FOUT are not detectable by grep. Fraunces variable font opsz axis at 96 at the display scale is the key thing to verify.

#### 2. Spring snap-back physics (DECIDE-02)

**Test:** On iPhone, swipe a card partially right (not past the commit threshold) and release. Compare the snap-back feel against a default Framer Motion spring.
**Expected:** Card snaps back with a "card on a counter" feel — damped, slightly weighted, no rubber-band bounce. The `mass: 1.1` difference from the default `1.0` should be subtly perceivable at 60Hz.
**Why human:** Tactile spring physics cannot be verified by grep. The `±10% tuning escape hatch` in UI-SPEC requires dual-iPhone validation before any adjustment.

#### 3. prefers-reduced-motion behavior on the swipe deck (DECIDE-02)

**Test:** Enable iOS Accessibility → Reduce Motion. Open the daily-decide screen. Try to swipe a card and confirm drag is disabled, rotation/overlays absent. Use the thumb buttons instead — confirm deck advances correctly.
**Expected:** No spring animation; deck operates on button taps only; `dragEnabled` false path is confirmed.
**Why human:** OS-level Reduce Motion toggle + physical interaction required. Cannot be verified by grep.

#### 4. "Tu décides" delegation Card visual quality (DECIDE-04)

**Test:** Cast a "yes" vote and leave the partner's vote pending. Navigate to VoteSummary (Pressenti branch). Inspect the delegation Card.
**Expected:** Paper-grain texture visible; 3px terracotta left border distinct; Fraunces italic body at 16px reads as an editorial margin note; `h-12 w-full` CTA is comfortably tappable; the Card reads as "deliberate, not stock shadcn" (DECIDE-04 success criterion).
**Why human:** Design quality judgment. Code proves the class strings are present; only visual/tactile inspection confirms the intended aesthetic register.

#### 5. ColdStartChip retheme + dismiss tap target (DECIDE-05)

**Test:** With corpus < 10 recipes, open the daily-decide screen. Verify the ColdStartChip shows a paper-grain card surface, terracotta Sparkles icon, Fraunces italic body. Tap the dismiss X button.
**Expected:** 48px hit area is hittable without precision; chip dismisses; sessionStorage gate prevents reappearance within the session.
**Why human:** Tap-target feel requires physical thumb interaction on iPhone; paper-grain texture visibility depends on screen rendering.

---

## Gaps Summary

No gaps found. All 5 DECIDE requirements are satisfied at the code level. All 5 roadmap success criteria have supporting implementation evidence in the codebase.

The `human_needed` status reflects that 3 of the 5 success criteria include perceptual quality requirements (spring feel, delegation Card deliberateness, font rendering on device) that cannot be determined by static analysis. These are not gaps — they are the normal verification items for a purely visual/tactile Polish phase.

---

_Verified: 2026-05-08_
_Verifier: Claude (gsd-verifier)_
