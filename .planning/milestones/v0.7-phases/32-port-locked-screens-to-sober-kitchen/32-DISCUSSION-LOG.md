# Phase 32: Port locked screens to Sober Kitchen - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 32-port-locked-screens-to-sober-kitchen
**Areas discussed:** Plan / PR sequencing, Bibliothèque view-switcher scope, Sweep scope edges (spinners + deferred screens), Patine + Marginalia data sourcing

---

## Area selection

**Question:** Which areas do you want to discuss for Phase 32 (Port locked screens to Sober Kitchen)?

| Option | Description | Selected |
|--------|-------------|----------|
| Plan / PR sequencing | Mirror §15.C's 5-PR ladder, compress, or carve differently. | ✓ |
| Bibliothèque view-switcher scope | All 3 views with switcher vs. grid-only. | ✓ |
| Sweep scope edges (spinners + deferred screens) | SOBER-08 strictness + §15.E enforcement. | ✓ |
| Patine + Marginalia data sourcing | `cookCountToPatina` bands + marginalia copy contract. | ✓ |

**User's choice:** All four selected.

---

## Plan / PR sequencing

### Q1 — How should Phase 32 be sliced into plans?

| Option | Description | Selected |
|--------|-------------|----------|
| Faithful §15.C 5-plan ladder (recommended) | 32-01 Tokens → 32-02 Primitives → 32-03 Accueil → 32-04 Bibliothèque → 32-05 Recette. Mirrors the locked doc. | ✓ |
| Compressed 3-plan | Foundation / Screens / Sweep. Fewer setup costs, harder review. | |
| Wider 7-plan split | Adds separate BrandLoader sweep + Marginalia register sweep plans. Maximally atomic. | |

**User's choice:** Faithful 5-plan ladder.

### Q2 — Within the 5-plan ladder, where do the cross-cutting sweeps land?

| Option | Description | Selected |
|--------|-------------|----------|
| Sweeps in 32-02 Primitives (recommended) | Single grep gate at 32-02 close. | ✓ |
| Sweeps ride per-screen | 32-03/04/05 each sweeps its own surfaces; risk of missing onboarding etc. | |
| Sweeps in dedicated 32-06 (close-out plan) | Adds a 6th plan; cleanest verification. | |

**User's choice:** Sweeps in 32-02 Primitives.

---

## Bibliothèque view-switcher scope

### Q1 — Which Bibliothèque views ship in Phase 32?

| Option | Description | Selected |
|--------|-------------|----------|
| All 3 views with persisted switcher (recommended) | Grid + List + Patine, localStorage persistence, anti-flash hydration. | ✓ |
| Grid only — ship ledger-card patine, defer list+patine views | Faster; breaks ROADMAP criterion #2. | |
| Grid + List, defer Patine grouped view | Half-way; switcher paid for once. | |

**User's choice:** All 3 views with persisted switcher.

---

## Sweep scope edges (spinners + deferred screens)

### Q1 — SOBER-08 spinner sweep: how strict is the grep gate?

| Option | Description | Selected |
|--------|-------------|----------|
| Strict: grep returns 0 matches outside BrandLoader (recommended) | Every Loader2 site swaps to BrandLoader; Toaster needs config override. | ✓ |
| Slow-path only with explicit carve-outs | Replace only photo upload + LLM + URL extraction; soft grep gate. | |
| Strict + Toaster substitution policy decided in plan | Strict grep, planner picks Toaster mechanism. | |

**User's choice:** Strict: grep returns 0 matches outside BrandLoader.

### Q2 — §15.E reports Capture (/recipes/new). What's the rule?

| Option | Description | Selected |
|--------|-------------|----------|
| Primitive-level touches only (recommended) | Token leak + SystemBubble spinner swap. Layout/copy frozen. | ✓ |
| Hard freeze — don't touch any file under /recipes/new/ | Spinner sweep skips SystemBubble; conflicts with strict gate above. | |
| Light port — SystemBubble + token swap + Caveat in advisory bubble | Expands scope into composition. | |

**User's choice:** Primitive-level touches only.

---

## Patine + Marginalia data sourcing

### Q1 — `cookCountToPatina(n)` thresholds?

| Option | Description | Selected |
|--------|-------------|----------|
| 0 / 1-2 / 3-10 / >10 (recommended) | Matches doc examples; testable. | ✓ |
| 0 / 1-3 / 4-12 / >12 | Wider Habitudes; harder to reach Héritage. | |
| 0 / 1-5 / 6-20 / >20 | Héritage reserved; risks flat visuals at couple-scale. | |

**User's choice:** 0 / 1-2 / 3-10 / >10.

### Q2 — Marginalia copy: hardcoded i18n, data-derived, or hybrid?

| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid — data when available, hardcoded fallback (recommended) | State-aware Accueil subhead + composed Recette subhead; data-only step marginalia. | ✓ |
| Fully data-derived — marginalia silent when no data | Cleaner contract; risks empty feel early on. | |
| Fully hardcoded i18n | Loses the "your kitchen's history" feel. | |

**User's choice:** Hybrid.

---

## Claude's Discretion

Captured inline in CONTEXT.md `<decisions>` §Claude's Discretion. Highlights:
- Exact `<BrandLoader>` size-variant API shape (single `size` prop vs. named exports).
- `<LedgerCard>` as `Card` wrapper vs. independent component.
- French phrasing within locked i18n key namespaces.
- Toaster loading-icon substitution mechanism.
- Whether `<Marginalia>` composes inside `PinLabel.tsx`.

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` §From discussion. Highlights:
- Recipe `provenance` / `source` field — "de chez maman" mock has no backing column. Future product decision.
- `cooking_logs[].step_notes[]` array — current schema has a single `note` per log. Per-step marginalia deferred.
- Stale §15.E "Réception" line — Inbox removed in Phase 27 D-10. Doc edit deferred.
- Bottom-nav icon swaps (carried from 31-CONTEXT.md).
- Household-level library view preference (per-device localStorage today).
- Marginalia copy *rotation* on Accueil.
- Animated patine state transitions when `cook_count` crosses a threshold.
