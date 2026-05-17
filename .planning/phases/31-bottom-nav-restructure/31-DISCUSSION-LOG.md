# Phase 31: Bottom nav restructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 31-bottom-nav-restructure
**Areas discussed:** Tab roster, CTA elevation style, CTA active-state semantics, Label & i18n keys

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Tab roster | How many flat tabs ship now? Today: 3. Mockup: 4 + CTA but Suggérer deferred. | ✓ |
| CTA elevation style | Inline-larger / notched-FAB / background-pill | ✓ |
| CTA active-state semantics | aria-current + visual variant + flat-tab behavior on /recipes/new | ✓ |
| Label & i18n keys | Rename Réglages → Profil; new `nav.add` key | ✓ |

**User's choice:** All four areas selected.

---

## Tab roster

### Q1 — Slot count

| Option | Description | Selected |
|--------|-------------|----------|
| 3 flats + CTA = 4 slots | Accueil / Recettes / [Ajouter CTA] / Réglages. Matches today's tab inventory. | ✓ |
| 5 slots with Suggérer placeholder | Accueil / Suggérer (disabled stub) / [Ajouter CTA] / Recettes / Réglages | |
| 4 slots, CTA dead-center | 2-1-2 symmetric layout (Accueil/Recettes / CTA / Réglages... reordered) | |

**User's choice:** 3 flats + CTA = 4 slots.

### Q2 — Slot order

| Option | Description | Selected |
|--------|-------------|----------|
| Accueil / Recettes / [Ajouter] / Réglages | CTA in slot 3 of 4 (right-of-center) | ✓ |
| Accueil / [Ajouter] / Recettes / Réglages | CTA in slot 2 of 4 (left-of-center) | |
| Accueil / Recettes / Réglages / [Ajouter] | CTA on far right (slot 4) | |

**User's choice:** Accueil / Recettes / [Ajouter] / Réglages.

---

## CTA elevation style

### Q1 — Elevation mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Inline-larger circle | Filled primary circle larger than sibling icon-pills, fully contained in nav bar | ✓ |
| Notched FAB-style | Circle protrudes above the nav bar's top edge with a cut-out | |
| Background pill, no size diff | Same icon size as siblings; CTA differentiated only by filled background | |

**User's choice:** Inline-larger circle.

### Q2 — Size and label

| Option | Description | Selected |
|--------|-------------|----------|
| ~56px circle, label below | Bold contrast (siblings ~40px); 'Ajouter' label below; nav bar grows to ~72-80px | ✓ |
| ~48px circle, label below | Modest contrast; nav bar stays close to today's 4rem | |
| ~56px circle, no label | Large filled circle with white + glyph alone; no visible label | |

**User's choice:** ~56 px circle, label below.

---

## CTA active-state semantics

### Q1 — Active visual treatment

| Option | Description | Selected |
|--------|-------------|----------|
| CTA unchanged + flats inactive | CTA stays filled-primary; aria-current toggles for SR only; flat tabs inactive | |
| CTA gets ring + flats inactive | CTA stays filled-primary AND gains a subtle ring/glow; aria-current set; flat tabs inactive | ✓ |
| CTA scales slightly + flats inactive | CTA scales 1.05× or shows a Caveat marginalia tag; aria-current set | |

**User's choice:** CTA gets ring + flats inactive.

### Q2 — Capture entry route

| Option | Description | Selected |
|--------|-------------|----------|
| /recipes/new | Exact match. CTA active when pathname === '/recipes/new' | ✓ |
| /recipes/new (with prefix match) | Active for any path starting with /recipes/new | |
| Something else | A different route (e.g., /add, /capture) | |

**User's choice:** /recipes/new (exact match).

---

## Label & i18n keys

### Q1 — Settings tab label rename

| Option | Description | Selected |
|--------|-------------|----------|
| Keep 'Réglages' | No label change. nav.settings stays. Lowest churn. | |
| Rename to 'Profil' | Rename nav.settings → nav.profile, value 'Profil'. Icon stays Settings. Route /settings unchanged. | ✓ |
| Rename + rebrand later | Defer rename to Phase 32 / follow-up | |

**User's choice:** Rename to 'Profil'.

---

## Final check

| Option | Description | Selected |
|--------|-------------|----------|
| I'm ready for context | Lock all decisions; note stale 'drafts-tab badge' REQ clause as resolved | ✓ |
| Explore more gray areas | Surface additional gray areas (motion, focus ring, staged rollout, etc.) | |

**User's choice:** I'm ready for context.

---

## Claude's Discretion

- Exact CSS values for the ring active state (token-aware ring color/width).
- Whether to extract a `<CentralCTA />` sub-component or keep inline `variant === "central-cta"` branch.
- Exact nav-bar content height (~72 vs ~80 px) to contain the 56 px CTA + label.
- Whether to migrate the Accueil tab's active check to `usePathname()` too (recommended yes, for consistency).
- `aria-label="Ajouter"` placement (on `<Link>` vs inner `<span class="sr-only">`).

---

## Deferred Ideas

- « Suggérer » tab (gh#26 backlog) — 5th slot, when product design pass completes.
- Bottom-nav icon swaps — Phase 32 or later grooming phase.
- Smart Paste capture-screen redesign — out of scope per REQUIREMENTS.md (competes with v0.6 design lock).
- Motion / animation tokens for the CTA — planner default.

---

## Stale REQ clause resolution

REQ NAV-01 "Drafts-tab badge … remain pixel-correct" is stale. Phase 27 D-11 removed the drafts route + tab + badge. No badge exists in the codebase today. The acceptance clause meaningfully reduces to safe-area inset + onboarding hide preservation, both already honored by today's `BottomNav.tsx` shell.
