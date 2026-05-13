# Phase 23: Deck polish — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-12
**Phase:** 23-deck-polish
**Areas discussed:** Tint feedback (DECK-01/02), Tap-to-detail UX (DECK-04), Heart icon styling (DECK-03), Plan slicing & verification

---

## Tint feedback (DECK-01/02)

### Q1 — Tint mount

| Option | Description | Selected |
|--------|-------------|----------|
| Full-card backdrop layer | Tint covers entire card (photo + body + footer). Matches REQ "full-card color tint" wording. | |
| Photo-only tint | Surgical replacement of L280-296 OUI/NON block. Card body/footer stay legible during drag. | |
| Border-ring glow | Ring-2 fades in around the whole card. Subtler. Deviates from REQ wording. | ✓ |

**User's choice:** Border-ring glow (deviation from REQ wording — flagged for follow-up resolution)
**Notes:** Subtler than a surface tint; user preference for restrained visual language.

### Q2 — Resolving the REQ deviation

| Option | Description | Selected |
|--------|-------------|----------|
| Ring-only, update REQ wording | Lock as ring-only; plan rewrites DECK-01 success criterion. Cleanest. | ✓ |
| Ring + faint bg tint | Layered: ring is primary, faint bg-tint underneath at ~40% ring opacity. Honors original REQ wording too. | |
| Wait — revisit options | Re-show originals. | |

**User's choice:** Ring-only — update REQ wording.
**Notes:** D-01 documents the REQ rewrite obligation; plan will update REQUIREMENTS.md before execution.

### Q3 — Ring ramp

| Option | Description | Selected |
|--------|-------------|----------|
| Earlier than commit (~80px) | Ring full at ~80px, well before 140px commit. Forgiving / feedback-rich. | ✓ |
| Match the threshold (140px) | Ring full exactly at commit point. Cleanest "deliberate" feeling. | |
| Past threshold (~180px) | Ring keeps building past commit. Maximum "rewarded for committing harder" feel. | |

**User's choice:** Earlier than commit (~80px) → `SWIPE_OVERLAY_INPUT_PX = 80`.
**Notes:** 50px casual drift produces ~62% ring opacity — the intended "you're trying something" affordance.

### Q4 — Ring color and stroke

| Option | Description | Selected |
|--------|-------------|----------|
| ring-2 + valide-foreground / destructive | Standard 2px ring, emerald + destructive. Matches Heart-button border palette. | ✓ |
| ring-4 with offset | Heavier ring with 2px halo gap. More dramatic. May fight rounded-2xl. | |
| ring-2 with valide-tint (softer) | Same 2px ring but using soft pastel `--color-valide-tint`. Subtler still. May fade into warm-cream. | |

**User's choice:** ring-2 + valide-foreground / destructive.
**Notes:** Consistent with Validé color story across the app.

---

## Tap-to-detail UX (DECK-04)

### Q1 — Tap target

| Option | Description | Selected |
|--------|-------------|----------|
| Whole front card | Entire card tappable; partner-vote dot footer inherits navigation. | ✓ |
| Photo region only | Only the .aspect-[4/3] photo block is tappable. | |
| Card body excluding footer | Photo + body tappable; footer consumes its own tap. | |

**User's choice:** Whole front card.
**Notes:** Simplest mental model; no stopPropagation needed.

### Q2 — Back-button behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Filter-stays-on-top (no work) | Unvoted-filter automatically gives correct behavior. Zero new code. | ✓ |
| Explicit recipeId URL state | `?card=` URL param; defensive against partner-vote-during-detail. Adds router complexity. | |
| Scroll-restoration via Next.js default | Doesn't apply (vertical scroll, not deck position). | |

**User's choice:** Filter-stays-on-top.
**Notes:** REQ-04 satisfied trivially; no URL state needed.

### Q3 — Tap feedback

| Option | Description | Selected |
|--------|-------------|----------|
| No tap feedback (instant nav) | Native iOS page-transition IS the feedback. Cleanest. | ✓ |
| Subtle scale press (active:scale-[0.98]) | 50ms scale-down before navigate. Mirrors thumb-button pattern. | |
| whileTap brightness pulse | 80ms brightness shift. Different sensory channel. | |

**User's choice:** No tap feedback (instant nav).
**Notes:** Most native-feeling on iPhone.

---

## Heart icon styling (DECK-03)

### Q1 — Heart fill mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| fill='currentColor' on Heart | Stroke and fill share emerald color. Crispest. | ✓ |
| fill + thinner stroke | strokeWidth={1.5} for graphic-icon feel. Diverges from lucide default. | |
| Filled via solid Heart variant | Lucide doesn't ship one; requires second icon set. Over-engineering. | |

**User's choice:** fill='currentColor' on Heart.
**Notes:** Single icon import, minimum change.

### Q2 — No-side neutral color

| Option | Description | Selected |
|--------|-------------|----------|
| Foreground-muted + border-border | Pure neutral; removes destructive-red entirely. Reads "unloved." | ✓ |
| Foreground-muted + destructive border | Compromise: muted icon, destructive ring. Less consistent. | |
| Keep destructive red | "Empty red heart" — reads "rejected." Closer to thumbs-down feel. | |

**User's choice:** Foreground-muted + border-border.
**Notes:** "Single-glyph language, softer than thumbs" milestone wording aligns with the all-neutral no-side.

---

## Plan slicing & verification

### Q1 — Plan slicing

| Option | Description | Selected |
|--------|-------------|----------|
| 4 plans, sequential (Phase 22 pattern) | One plan per req. Atomic revert per req. Hard-serial because of shared files. | |
| 3 plans (pair 01+02) | Pair the swipe-tokens.ts edits; then DECK-03 and DECK-04 separately. Worktree-parallel safe after 23-01. | |
| 1 single plan | All 4 reqs in one atomic commit. Hardest to revert per-req. Matches "phase as one beat." | ✓ |

**User's choice:** 1 single plan.
**Notes:** Deliberate deviation from Phase 22 pattern; rationale captured in D-23.

### Q2 — Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Grep + manual smoke + reduced-motion pass | Phase 22 discipline; no new specs. | ✓ |
| Above + Playwright spec for tap-to-detail | Add ONE spec for DECK-04 routing behavior. ~30 lines. | |
| Above + Playwright + visual snapshot | Snapshot ring opacity at three drag distances. Highest setup cost. | |

**User's choice:** Grep + manual smoke + reduced-motion pass.
**Notes:** Preserves Phase 22 "polish phases don't expand test surface."

---

## Claude's Discretion

- Exact ring implementation pattern (two motion.divs vs useMotionTemplate boxShadow).
- Exact opacity choice for no-side Heart button border (`border-border` vs `border-foreground-muted/40`).
- Exact deferral mechanism for `panRef.current = false` reset (setTimeout(0) vs requestAnimationFrame vs microtask).
- Whether to inline or split JSDoc updates in swipe-tokens.ts.

## Deferred Ideas

- Faint bg-tint underneath the ring (rejected at Area 1; revisitable post-ship).
- Playwright spec for tap-to-detail (rejected at Area 4; preserves Phase 22 discipline).
- Visual snapshot tests (rejected at Area 4; snapshot tooling not wired).
- Card snap-zone visual indicators (brainstorm; new affordance, not in REQ).
- "Love" tier above yes (would break invariant #2; explicitly out per gh#17).
- Per-direction haptic feedback (no-op on iOS Safari standalone).
- `?card=<id>` URL state for back-restoration (unnecessary; filter handles it).
