# Phase 31: Bottom nav restructure - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a central, visually elevated « Ajouter » CTA to the bottom nav on every authenticated, non-onboarding screen, routing to the capture entry at `/recipes/new`. Introduce a per-tab visual variant discriminator (`variant: "tab" | "central-cta"`) so the central CTA is not implemented as an ad-hoc conditional spread across the existing `TABS.map(...)` render.

Out of scope:
- « Suggérer » tab — deferred (gh#26, REQUIREMENTS.md §Out of Scope).
- Icon swaps on the other tabs — `lucide-react` icon set stays (REQ NAV-01 carve-out).
- The Sober Kitchen design-system port itself — Phase 32 owns the token / patine / Cormorant register changes. Phase 31 lands the nav-structure change against today's terracotta tokens; Phase 32 ports the chrome.
- Route renames — `/recipes/new` and `/settings` paths unchanged.

</domain>

<decisions>
## Implementation Decisions

### Tab roster (slots and order)
- **D-01:** **3 flat tabs + 1 central CTA = 4 slots total.** No « Suggérer » placeholder slot, no disabled stub — deferring slot reservation to whenever gh#26 is unblocked. Today's tab inventory is the basis.
- **D-02:** Left → right order: **Accueil / Recettes / [Ajouter CTA] / Profil**. CTA sits in slot 3 of 4 (offset-center; not geometric dead-center, which is fine because the larger CTA size already biases visual weight to the middle-right).
- **D-03:** All 4 slots remain `flex: 1` siblings inside the existing `<nav className="flex">` shell. The CTA does not break out of the flex distribution — its larger circle is contained, not protruding (see D-05).

### CTA visual treatment (elevation)
- **D-04:** **Inline-larger circle, fully contained in the nav bar.** No notch, no FAB protrusion above the bar's top edge. The CTA reads as "elevated" purely through size + filled primary fill versus the flat icon-only siblings.
- **D-05:** **CTA circle ~56 px diameter, white `+` glyph centered.** Sibling icon-pills stay at today's ~40 px wash (`h-10 w-10`). Bold contrast — the CTA is unambiguously the focal point. The nav bar's content height grows from today's `min-h-[4rem]` (64 px) to **~72–80 px content** to contain the circle plus its label without clipping; safe-area inset (`pb-[env(safe-area-inset-bottom)]`) remains additive on top.
- **D-06:** **`Ajouter` label sits below the circle**, matching the sibling tabs' icon-above-label rhythm. Same `text-xs font-medium` register as siblings (don't introduce a new type token — that's Phase 32's job).
- **D-07:** **`main` content padding-bottom must adapt** to the new nav height. Today `app/layout.tsx` reserves `pb-[calc(4rem+env(safe-area-inset-bottom))]`. After D-05 this becomes `pb-[calc(5rem+env(safe-area-inset-bottom))]` (or token-driven equivalent). Audit anywhere else the 4rem nav height is hardcoded.

### CTA active-state semantics
- **D-08:** **Active route match: `pathname === "/recipes/new"` (exact match).** Active when the user is on the capture entry route — not any `/recipes/*` sub-route.
- **D-09:** `useSelectedLayoutSegment()` is **insufficient** for D-08 because `/recipes/new` resolves the `recipes` segment, which would also light up the Recettes tab. Switch the active-detection mechanism to **`usePathname()`** and per-tab predicates. The current segment-based check on the Recettes tab must be updated so it lights up on `/recipes` and `/recipes/[id]` but NOT on `/recipes/new` — otherwise we double-active.
- **D-10:** **Onboarding hide check stays segment-based.** Today's `useSelectedLayoutSegment().startsWith("onboarding")` is the right tool for that gate. Keep `useSelectedLayoutSegment()` for the hide check; add `usePathname()` for active matching. They can coexist in the same component.
- **D-11:** **CTA active visual: filled-primary + subtle ring/glow.** On active, the CTA keeps its always-elevated filled style AND gains a `ring-2 ring-primary/30` (or equivalent) to reinforce "you are here" without breaking the always-elevated affordance. `aria-current="page"` is set on the CTA's `<Link>`.
- **D-12:** **When the CTA is active, the 3 flat tabs render their inactive style** — no pill wash on any of them. Active matching is mutually exclusive across the 4 slots: at most one slot has `aria-current="page"` at any time.

### Per-tab variant discriminator (already prescribed in REQ)
- **D-13:** The `Tab` type gets a `variant: "tab" | "central-cta"` field. The current `TABS` const becomes `ReadonlyArray<Tab>` with the central entry tagged `variant: "central-cta"`. The render switches on `variant` at the top of the map callback (or via a small helper component) — **no conditional spread** mid-JSX.
- **D-14:** The variant discriminator should be reachable by a grep: `grep -rn "variant.*tab\|variant.*central-cta" frontend/` returns the type definition + the per-tab usages. Confirms invariant from ROADMAP success criterion #4.

### Labels and i18n keys
- **D-15:** **Rename `nav.settings` → `nav.profile` in `frontend/lib/i18n/fr.json`, value `"Profil"`.** Component reads `t("profile")` for the Réglages/Profil tab. The route at `/settings` keeps its path — only the nav label and i18n key change. The Settings page itself (its title, heading, copy) is untouched; that's a Phase 32 concern if at all.
- **D-16:** **Add new key `nav.add` with value `"Ajouter"`.** Used as both the visible label below the CTA circle AND as the `aria-label` on the `<Link>` (the `+` glyph carries no accessible name).
- **D-17:** **Icon for the Profil tab stays `Settings` from lucide-react.** Icon swaps are out of scope per REQ NAV-01. The label-rename without an icon-rename is an acceptable interim mismatch — Phase 32 (or a future grooming pass) can reconcile.

### Stale REQ clause resolution
- **D-18:** REQ NAV-01's clause "Drafts-tab badge … remain pixel-correct" is **stale**. Phase 27 D-11 removed the drafts route + tab + badge entirely (see the explanatory block at `BottomNav.tsx` lines 22–33). There is no drafts-tab badge in the codebase today to preserve. The acceptance criterion meaningfully reduces to:
  - Safe-area inset still honored (`pb-[env(safe-area-inset-bottom)]` on the nav element — already in place).
  - `/onboarding/*` hiding still honored (today's segment-based check survives D-10).
  Both are preserved trivially by today's component shell; the discriminator + CTA work compose around them.

### Claude's Discretion
- Exact CSS values for the ring active state (`ring-2 ring-primary/30` is illustrative; the planner picks a token-aware value that pops on the terracotta fill without clashing).
- Whether to extract a `<CentralCTA />` sub-component or inline the `variant === "central-cta"` branch in the existing map callback. Either is fine; the discriminator + grep gate work either way.
- Exact pixel value for the nav-bar content height (~72 vs ~80 px). Aim: the 56 px CTA + label + 8 px breathing room don't clip on iPhone SE-class viewport heights.
- Whether the `usePathname()` migration also rewrites the Accueil tab's active check (today: `segment === null`; tomorrow: `pathname === "/"`). Recommended: yes, consistent mechanism across all 4 slots.
- Where to put the `aria-label="Ajouter"` fallback if the visible label is rendered separately — `<Link>` element vs an inner `<span class="sr-only">`. Either works.

### Folded Todos
None — no todos matched this phase via `gsd-tools todo match-phase`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/REQUIREMENTS.md` §"Bottom nav" — NAV-01 acceptance (prescriptive: variant discriminator, mockup target, aria contract, scope carve-outs).
- `.planning/REQUIREMENTS.md` §"Out of Scope (v0.7)" — « Suggérer » tab deferral (gh#26); bottom-nav icon swaps for the other four tabs deferred.
- `.planning/ROADMAP.md` §"Phase 31: Bottom nav restructure" — success criteria (4 items: visual elevation, aria-current + a11y, badge/safe-area/onboarding preservation, grep gate on variant discriminator).
- `.planning/PROJECT.md` §"Current Milestone" — v0.7 scope, milestone-level decision: per-tab variant discriminator (`variant: "tab" | "central-cta"`) instead of inline conditional spread.

### Visual reference (mockup)
- `.scratch/capture-mockups/1-smart-paste.html` — REQ NAV-01 acceptance target. The mockup shows 5 slots (Accueil / Suggérer / [Ajouter] / Recettes / Profil); Phase 31 ships the 4-slot variant of this (Suggérer deferred). The CTA's filled-primary circle + white `+` glyph + label-below register is locked from this file's `.bottomnav .item.active` styling.

### Design system
- `docs/design-system.html` §15 ("Mise en code") — Sober Kitchen tokens / patine / Caveat. Phase 31 lands the nav structure against **today's** terracotta tokens; Phase 32 ports the chrome to the locked Sober tokens. The §15 Accueil reference shows `BottomNav.tsx` as "inchangé" — that reference is pre-NAV-01 and is superseded by the smart-paste mockup for the bottom-nav contract.

### Architecture invariants (CLAUDE.md)
- `CLAUDE.md` §"Architecture invariants" — invariant #6 (French-only via `next-intl`, day one) — new `nav.add` key + `nav.profile` rename land in `frontend/lib/i18n/fr.json`.
- `CLAUDE.md` §"MVP phase posture" — clean rewrite of the `Tab` type and `TABS` const; drop the old shape rather than feature-flag the variant discriminator.

### Source files (current implementation)
- `frontend/components/BottomNav.tsx` — current `BottomNav` component (3 flat tabs after Phase 27 D-11). Pattern reference: `TABS` const + `.map()` + `useSelectedLayoutSegment()` + `aria-current`. The Phase 27 explanatory block at lines 22–33 documents the 4→3 collapse — Phase 31 reopens to 4 slots but with a different shape (CTA, not drafts).
- `frontend/app/layout.tsx` — mounts `<BottomNav />` and reserves `pb-[calc(4rem+env(safe-area-inset-bottom))]` on `<main>`. D-07 raises this to match the new nav height.
- `frontend/app/onboarding/layout.tsx` — onboarding-route layout that already references nav-hidden state; confirm no conflicting padding/hide logic.
- `frontend/lib/i18n/fr.json` — `nav.{home,recipes,settings}` keys today. D-15/D-16 modify this file (rename settings→profile; add add).
- `frontend/app/recipes/new/page.tsx` — capture entry route; active target for D-08. Confirm route still exists at planning time (it does today).
- `frontend/app/settings/page.tsx` (existence implied by the `/settings` route under `app/`) — settings page; D-17 does NOT modify this; only the nav label changes.

### Test references
- `frontend/tests/e2e/w1-gate.spec.ts`, `frontend/tests/e2e/auth.skip-onboarding.spec.ts`, `frontend/tests/e2e/shortlist-vote.spec.ts`, `frontend/tests/e2e/invite-code-happy-path.spec.ts` — existing specs that reference `BottomNav`. Audit for nav-shape assumptions (e.g., tab count, label strings). The label rename and new CTA may require selector updates.
- `frontend/playwright.config.ts` — iPhone-shape Chromium viewport. The new nav height (D-05) must not regress `toBeInViewport()` assertions on critical surfaces.

### Lucide icon set
- `lucide-react` is the icon source (CLAUDE.md). The CTA uses the `Plus` icon (or an inline `<svg>` with the same glyph); siblings keep `Home`, `BookOpen`, `Settings`. No icon swaps.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- The current `BottomNav` shell (`<nav className="fixed bottom-0 ...">`) is reusable as-is — only the inner mapping logic and the `Tab` type change. The fixed-positioning, blur, border, and safe-area inset all survive untouched.
- `useTranslations("nav")` is already wired; adding `nav.add` and renaming `nav.settings` → `nav.profile` plugs in without provider changes.
- The active-pill wash (`bg-primary/8 rounded-full h-10 w-10`) on sibling tabs can be reused verbatim for the `variant === "tab"` branch. The CTA's `variant === "central-cta"` branch defines its own (larger) circle and ring.
- `lucide-react`'s `Plus` icon is already in the dependency tree (used elsewhere). No new dependency needed.
- `useSelectedLayoutSegment` (from `next/navigation`) survives for the onboarding hide check (D-10).
- `usePathname` (also from `next/navigation`) is the right tool for exact-match active state (D-08 / D-09).

### Established Patterns
- ESLint flat config + TypeScript strict (CLAUDE.md §Conventions). The discriminated-union `Tab` type with `variant: "tab" | "central-cta"` is the idiomatic shape; per-variant fields can be required or excluded via the union (e.g., flat tabs may not need a sub-label, CTA may not need a `segment` field if it switches to pathname).
- Path alias `@/*` → `frontend/` — imports use `@/components/...`, `@/lib/i18n/...`.
- French-only via `next-intl` (invariant #6) — every visible string goes through `useTranslations()`. No hardcoded "Ajouter" or "Profil" outside fr.json.
- `aria-current="page"` is already the established active marker (today's line 56 — `aria-current={active ? "page" : undefined}`). The variant change does NOT change this contract.
- The TODO(productize) marker on line 43 (`aria-label="Navigation principale"`) — leave it; it's an i18n productize-later cut, orthogonal to this phase.

### Integration Points
- The nav mounts in `frontend/app/layout.tsx` (root layout). The padding-bottom on `<main>` (D-07) is the only adjacent change.
- The capture entry route `/recipes/new` mounts the chat-based `RecipeThread` component (Phase 26 CAPTURE-04). Phase 31 does not modify the capture surface itself — only the link to it.
- The settings route at `/settings/page.tsx` is unaffected. The label rename is purely cosmetic in the nav.
- Realtime contract (invariant #4): Phase 31 does NOT add or modify any `broadcast_to_household` calls. The nav has no realtime semantics.

### Pitfalls to avoid
- **Active-state collision on `/recipes/new`.** Today's `useSelectedLayoutSegment()` returns `"recipes"` for both `/recipes` and `/recipes/new`. Without D-09's `usePathname()` switch, both the Recettes tab AND the CTA would render as active. The acceptance criterion "aria-current='page' is set on the central CTA when the user is on the capture entry route" implicitly requires exactly one active slot.
- **Don't lose the onboarding hide.** D-10 keeps `useSelectedLayoutSegment()` for the hide check. Don't replace the hide with a pathname check too eagerly — `usePathname()` returns the full path, so a check like `pathname.startsWith("/onboarding")` works but is a behavioral change; keep the segment-based check.
- **Padding-bottom drift.** If D-07 misses any `pb-16` or `4rem`-hardcoded site in the codebase, the new taller nav clips content. Grep before planning is finished: `grep -rn "pb-16\|pb-\[4rem\|4rem.*nav\|min-h-\[4rem\]" frontend/`.
- **Playwright label assertions.** Any spec that asserts `getByText("Réglages")` would break with the rename. Run `grep -rn "Réglages\|Reglages\|settings.*tab" frontend/tests/` and update selectors.
- **Active-pill wash on the CTA.** The current pill wash (`bg-primary/8`) was designed for the small icon-pill. Apply it ONLY to the `variant === "tab"` branch. The CTA owns its own active treatment (D-11: ring/glow on top of always-filled).
- **Safe-area inset multiplication.** Don't add safe-area padding to BOTH the nav element AND the inner CTA. The nav already pads `pb-[env(safe-area-inset-bottom)]`; the CTA only needs vertical centering within the available space.

</code_context>

<specifics>
## Specific Ideas

- The CTA's always-elevated affordance means the user never needs to "find" the capture entry — it is the visually loudest element on every authenticated screen. That's the entire point of NAV-01; the milestone goal sentence ("the bottom nav's intent is unambiguous") is measured by this.
- The 4-slot layout (vs. the mockup's 5) is a temporary truth — gh#26's Suggérer tab will eventually claim a 5th slot. Don't bake "4" into geometry math (e.g., `width: 25%`); use the existing `flex: 1` siblings pattern so adding a 5th slot later is a one-line `TABS` extension.
- The label rename `Réglages` → `Profil` is a deliberate forward-step toward the mockup's vocabulary even though the icon swap is deferred. The two-step (label now, icon later) is a known-acceptable mismatch — the alternative (icon mismatch is "uglier" so don't rename) would block on a Phase 32 icon decision that the user is not ready to make today.
- The ring/glow on the CTA active state (D-11) is intentionally subtle — the CTA's filled circle is already the loudest element on the bar, so "active" doesn't need to shout. Subtlety reads as confidence; a heavy active glow would read as a button bug.
- `usePathname()` is the load-bearing API switch (D-09). If a future plan recommends keeping `useSelectedLayoutSegment()` alone, that plan is wrong — push back during plan-checker review.

</specifics>

<deferred>
## Deferred Ideas

### From discussion
- **« Suggérer » tab (5th slot).** Reserved by gh#26; backlog item. When unblocked, extend `TABS` by one entry and let the existing `flex: 1` siblings absorb the new slot. No re-layout work needed (per D-03).
- **Bottom-nav icon swaps** (Home → mockup home glyph; BookOpen → Recettes mockup glyph; Settings → Profil user-circle glyph). Explicitly out of scope per REQ NAV-01. Likely lands in Phase 32 (Sober Kitchen port) or a follow-up grooming phase.
- **Smart Paste capture-screen redesign.** The mockup also shows a redesigned capture body (smart-paste field, affordance row). Out of scope per REQUIREMENTS.md §Out of Scope — v0.6 already shipped the chat-based capture surface (CAPTURE-01..04).
- **Motion/animation on CTA tap.** Not raised as a gray area. Default to a standard tactile press effect (e.g., scale-down on `:active`); planner picks the exact token. If `prefers-reduced-motion` matters, planner handles in the standard way.
- **Active-state animation between routes.** Not raised. The ring/glow on active (D-11) is a static state, not an animated transition.

### Already deferred at the milestone level (REQUIREMENTS.md §Out of Scope)
For reference — these are explicitly NOT in Phase 31:
- « Suggérer » tab (gh#26) — backlog, needs product design pass first.
- Bottom-nav icon swaps for the other four tabs — gh#25 brief carve-out.
- « Smart Paste » capture-screen redesign — competes with v0.6 design lock.

### Reviewed Todos (not folded)
None — no todos matched this phase.

</deferred>

---

*Phase: 31-bottom-nav-restructure*
*Context gathered: 2026-05-18*
