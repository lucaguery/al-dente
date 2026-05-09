# UI Review — Vote

**Audited:** 2026-05-09
**Auditor:** Claude (Phase 13, manual scoring per CONTEXT.md D-06)
**Synthetic env:** [SYNTHETIC] Démo Al Dente @ https://al-dente-pink.vercel.app
**Viewport:** iPhone-shape Chromium 390×844 (isMobile, hasTouch)
**Reach status:** Reached. Vote affordances live on the Shortlist deck card (per D-05 surface bundling); vote-state chip rendering observable on the post-deck recap (`VoteSummary`). Audit observed the partner-vote dot footer + chip vocabulary directly; full recap state reached via WALKTHROUGH P-12-Vt-01 evidence (session continuity from Phase 12).

## Originality Verdict

**Verdict:** Mixed ⚠

Token compliance + editorial cohesion both *intend* to be Al Dente — the 5-state chip vocabulary (`Validé / Pressenti / Contesté / Rejeté / Sans avis`) is locked in next-intl, the per-state pill recipe in `chipClass()` is a 07-UI-SPEC contract, and the partner-vote dot footer is a thoughtful affordance. But the surface ships a **load-bearing architectural-invariant violation** ([Issue #4](https://github.com/lucaguery/al-dente/issues/4)): `MEMBER_COUNT = 2` is hard-coded in `HomeDecide.tsx:52` and `VoteSummary.tsx:83`, so `compute_vote_state(...)` mis-renders in any household with ≠2 members. In the audit synthetic env (4 members) the chips are visibly wrong — `Ragu (4 yes)` renders as `Sans avis` instead of `Validé`. The verdict stays "Mixed" because the *visual language* is on-system but the *semantic correctness* fails the invariant the system exists to enforce.

| Boilerplate elements | Earned elements |
|----------------------|-----------------|
| `MEMBER_COUNT = 2` hard-coded constant with a `// v0.1: hard-coded household size; multi-tenant clean.` comment but **no `# TODO(productize)` marker** (`frontend/components/HomeDecide.tsx:52`) — under-tracked productize debt | 5-state pill recipe `chipClass(state)` matching 07-UI-SPEC §"Color > Vote-chip color mapping" — distinct background tint + foreground role + border accent per state, with custom `--color-valide-tint` token (`VoteSummary.tsx:55-70`) |
| `text-emerald-500` palette literal on the OUI thumb button + `border-emerald-500/30` on validé chip border (`ShortlistCard.tsx:258`, `VoteSummary.tsx:60`) — Tailwind palette, not a custom token | Partner-vote dot footer — `MemberDot` for `yes`, `bg-destructive/40` filled circle for `no`, `bg-foreground-muted/40` for `unvoted`, with aria-label interpolating partner name (`ShortlistCard.tsx:204-219`) |
| Default `Promise.all` upsert on concurrent vote — last-write wins with no UI signal of "your vote was overwritten by your partner" (`HomeDecide.tsx`) | Veto-window contract documented in invariant #2 — `valide` chip flips to `pressenti` if a `no` lands later, computed not stored (real architectural decision rendered in pixel-form) |

## 6-Pillar Score: 20/24

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| Copywriting | 4/4 | 5-state chip vocabulary matches locked next-intl (`vote.state.{valide,pressenti,conteste,rejete,sans_avis}`); aria-labels for partner-vote dots use named interpolation `partner_yes_aria` / `partner_no_aria` / `partner_unvoted_aria` (`ShortlistCard.tsx:109-115`); recap CTA verbs match the user's emotional beat. |
| Visuals | 4/4 | 5-state chip pill is genuinely earned — different bg/border/foreground per state. Partner-vote dot footer with `bg-card/70 backdrop-blur-sm` reads as a frosted overlay, not an inline label. Distinct visual semantics for each of the 5 states. |
| Color | 3/4 | DOCKED -1 — same emerald-500 palette literal as Shortlist on the validé chip border (`VoteSummary.tsx:60`). The validé background uses the custom `--color-valide-tint` token correctly; only the border/foreground reach for the literal. Token-system completeness gap. |
| Typography | 4/4 | `text-sm font-medium h-8` pill contract from 07-UI-SPEC; `text-xs font-medium` for partner-name caption; semibold body. Within thresholds. |
| Spacing | 4/4 | Pill geometry `px-2.5 py-0.5 h-8 rounded-full` matches 07-UI-SPEC §"Pill shape contract" exactly across all 5 states. Tailwind scale. |
| Experience Design | 1/4 | DOCKED HARD by [Issue #4]: vote-state chip mis-rendered in non-2-member households — invariant #2 broken. Plus P-12-Vt-03 (cross-link Sh-02 regenerate friction) + P-12-Vt-05 (recipe-detail has no vote affordance — entry-point gap). 1/4 = "Significant issues, contract not met" justified because the 5 chip values are the *primary user-facing artifact* of the voting system. |

## Detailed Findings

### Pillar 6: Experience Design (1/4)

- **`MEMBER_COUNT = 2` hardcoded — vote-state mis-rendered in non-2-member households** — both `HomeDecide.tsx:52` and `VoteSummary.tsx:83` default to `2`. In the audit synthetic env (4 members), live chip rendering for the audit-day shortlist returned: `Ragu (4 yes) → Sans avis` (should be `Validé`), `Coq (2y, 1n) → Validé` (should be `Contesté`), `Butter (2y, 2n) → Validé` (should be `Contesté`), `Shawarma (3 no) → Sans avis` (should be `Rejeté`). The `compute_vote_state(votes, member_count=2)` branches go off-by-N when the household isn't 2. **Architecture invariant #2 broken.** Comment at line 52 acknowledges the limitation but lacks a `# TODO(productize)` tag — productize-debt under-tracked. Severity = blocker per WALKTHROUGH D-01. (See WALKTHROUGH.md §Vote — P-12-Vt-01) [[Issue #4](https://github.com/lucaguery/al-dente/issues/4)]
- **Concurrent yes+no resolves to last-write — pass-style canary** — DB `(shortlist_id, recipe_id, member_id)` upsert via `on_conflict_do_update` resolves cleanly, no 409. Pass-style. (See WALKTHROUGH.md §Vote — P-12-Vt-02)
- **`Régénérer` 422 friction propagates** — same Sh-02 root cause. Cross-cuts the post-decide flow. (See WALKTHROUGH.md §Vote — P-12-Vt-03)
- **Boundary handling solid** — vote on non-shortlist recipe → `400 recipe not in this shortlist`; bad shortlist UUID → `404`; invalid `vote` value → `422`. Pass-style canary for backend boundary handling. (See WALKTHROUGH.md §Vote — P-12-Vt-04)
- **Recipe-detail page has no vote affordance** — `/recipes/{id}` shows only `Modifier par la voix / Modifier la recette / Supprimer / Retour` — no way to change a vote without going back to `/`. Combined with the Sh-02 regenerate friction, a user who exhausts the deck is locked in for the day. Friction stacking. (See WALKTHROUGH.md §Vote — P-12-Vt-05)

### Pillar 1: Copywriting (4/4)

- 5-state chip strings match locked next-intl: `vote.state.valide` = `Validé`, `pressenti` = `Pressenti`, `conteste` = `Contesté`, `rejete` = `Rejeté`, `sans_avis` = `Sans avis` — French past-participle convention is consistent (regression canary noted in WALKTHROUGH pass-style observations).
- aria-label interpolation: `partner_yes_aria` / `partner_no_aria` / `partner_unvoted_aria` with `{name}` substitution (`ShortlistCard.tsx:115`) — accessible without leaking implementation details.
- Recap intro lines: `intro_validated` / `intro_pressenti` / `intro_none` — 3-state branching copy, each calibrated to the emotional beat ("you both agreed", "you partly agreed", "neither path is clear").

### Pillar 2: Visuals (4/4)

- Partner-vote dot footer at `absolute bottom-3 right-3 ... bg-card/70 backdrop-blur-sm rounded-full` — frosted-overlay pattern over the photo region, not a flat label. Real ergonomic differentiator.
- 5 distinct chip surfaces, each with semantic pairing (validé = emerald tint + emerald border, pressenti = primary tint + primary border, conteste = destructive tint + destructive/80 fg, rejete = muted bg + line-through, sans_avis = transparent + border).

### Pillar 3: Color (3/4)

- Validé chip uses `bg-[var(--color-valide-tint)]` (custom Slow Food token ✓) but pairs with `border-emerald-500/30` (Tailwind literal ✗). Same token-completeness crack as Shortlist.
- Pressenti, conteste, rejete, sans_avis all use semantic tokens (`primary`, `destructive`, `muted`, `border`). Only validé reaches for the palette literal — because the system has `--color-valide-tint` for the background but no equivalent `--color-valide-foreground` / `--color-valide-border` token.

### Pillar 4: Typography (4/4)

- `text-sm font-medium h-8` is the 07-UI-SPEC pill contract, applied uniformly across all 5 chip states.
- `text-xs font-medium text-foreground-muted` for the partner-name caption — small but legible.

### Pillar 5: Spacing (4/4)

- Pill geometry `inline-flex items-center rounded-full px-2.5 py-0.5 h-8 w-fit` (`VoteSummary.tsx:57`) — exactly matches the 07-UI-SPEC contract.
- Partner-vote dot footer: `bottom-3 right-3 gap-1.5 px-2 py-1` — Tailwind scale; the `bottom-3 right-3` keeps the footer comfortably inside the rounded card without crowding.

## Screenshots

- `./screenshots/vote-thumb-buttons.png` — `/` post-banner-dismiss state showing the OUI/NON thumb buttons (`H ← X` icon pair) and the partner-vote dot footer (`Luca` caption) on the front Pad thai tofu card. The chip pill itself is rendered on the recap (post-vote-exhaust); evidence for the chip layer comes via WALKTHROUGH P-12-Vt-01 + the per-state class strings in `VoteSummary.tsx:55-70` (which the audit read directly).
- *Note:* the Phase 13 audit reuses the shortlist screenshots for the vote affordances (per CONTEXT D-05: "audit unit = surface, not component" — vote and shortlist share the deck card); separate vote-only screenshots would duplicate evidence.

## WALKTHROUGH cross-links (context inherited per D-11)

- WALKTHROUGH.md §Vote: 5 probes (P-12-Vt-01..Vt-05). P-12-Vt-01 [[Issue #4](https://github.com/lucaguery/al-dente/issues/4)] is the dominant Pillar 6 dock. P-12-Vt-02 + P-12-Vt-04 are pass-style backend-boundary canaries. P-12-Vt-03 cross-links Sh-02. P-12-Vt-05 (no vote on recipe-detail) is friction-stacking.
- 0 Gemini calls — voting is non-AI.
- The chip vocabulary regression canary (5-state names match locked next-intl) is intact.
