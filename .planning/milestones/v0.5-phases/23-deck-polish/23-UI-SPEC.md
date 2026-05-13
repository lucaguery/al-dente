---
phase: 23
slug: deck-polish
status: draft
shadcn_initialized: true
preset: existing — Slow Food (v0.2, terracotta + warm-cream + Cormorant Garamond italic + paper-grain)
created: 2026-05-12
---

# Phase 23 — UI Design Contract

> Cosmetic polish on an existing swipe deck. No new design system, no new tokens. Consolidates CONTEXT.md `<decisions>` (D-01..D-29) into the visual + interaction contract that gsd-planner and gsd-executor consume. Source of truth for any ambiguity is `.planning/phases/23-deck-polish/23-CONTEXT.md`.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (already initialized — `frontend/components.json`) |
| Preset | Slow Food artisanal (v0.2; Phase 5/9 locked) |
| Component library | shadcn/ui on Radix |
| Icon library | `lucide-react` — only `Heart`, `UtensilsCrossed` remain imported in `ShortlistCard.tsx` after this phase (`X` removed per D-14) |
| Font | Existing — Cormorant Garamond italic (display) + IBM Plex Sans (body). No font change. |
| Motion library | `framer-motion` (existing) |
| Routing | Next.js App Router `useRouter` from `next/navigation` (existing pattern in app) |

**No new design system work.** This phase only retunes interaction on an existing surface.

---

## Scope Boundary

Cosmetic polish on `frontend/components/ShortlistCard.tsx` and `frontend/lib/swipe-tokens.ts`. Single atomic plan, single commit (D-23). `ShortlistDeck.tsx` is not modified (its `committedDirection` / `handleVote` / `submittingFor` / `AnimatePresence` plumbing is byte-identical post-phase).

**Out of scope** (deferred per CONTEXT.md `<deferred>`): bg-tint underneath the ring; Playwright spec for tap-to-detail; visual snapshot tests; snap-zone visual indicators; "love" tier above yes; haptic feedback; `?card=<id>` URL state.

---

## Visual Contract

### What is REMOVED

| Element | File:Line | Replaced by |
|---------|-----------|-------------|
| `OUI` text overlay (rotated -15°, top-left) | `ShortlistCard.tsx:280-296` | Emerald `ring-2` opacity ramp (yes side) |
| `NON` text overlay (rotated +15°, top-right) | `ShortlistCard.tsx:280-296` | Destructive `ring-2` opacity ramp (no side) |
| `<X />` icon on the no-side thumb button | `ShortlistCard.tsx:366` | `<Heart size={24} className="text-foreground-muted" />` (outline) |
| `X` import from `lucide-react` | `ShortlistCard.tsx:19` | Removed entirely |
| `border-destructive/50` on no-side thumb button | `ShortlistCard.tsx:364` | Neutral border (`border-border` or `border-foreground-muted/40` — planner's choice per Claude's Discretion) |
| `hover:bg-destructive/10` on no-side thumb button | `ShortlistCard.tsx:364` | Neutral hover (`hover:bg-foreground-muted/10`) |
| `text-destructive` icon color on no-side button | `ShortlistCard.tsx:366` | `text-foreground-muted` |
| Legacy `SWIPE_SPRING` constant block | `swipe-tokens.ts:20-25` | Deleted (no importers — `transitions.springSnap` already used at L223) |

### What is ADDED

| Element | Token / Value | Notes |
|---------|---------------|-------|
| Yes-side drag-feedback ring | `ring-2` stroke with color `var(--color-valide-foreground)` (#10B981 emerald light / #6EE7B7 emerald-300 dark) | D-02, D-03 — no `ring-offset` |
| No-side drag-feedback ring | `ring-2` stroke with color `var(--destructive)` | D-02 — destructive token unchanged from globals.css L161 |
| Filled-Heart yes-button icon | `<Heart size={24} fill="currentColor" className="text-[var(--color-valide-foreground)]" />` | D-12 — stroke and fill both emerald, fully filled |
| Outline-Heart no-button icon | `<Heart size={24} className="text-foreground-muted" />` (no `fill` prop → outline default in lucide-react) | D-13 |
| `panRef = useRef(false)` in `ShortlistCard` | n/a | D-18 — pan-vs-tap disambiguation flag |
| `onTap` handler on outer `motion.div` | `router.push(`/recipes/${recipe.id}`)` if `!panRef.current && isFront` | D-17, D-18 |

### Tokens used (all pre-existing — NO new tokens added)

| Token | Defined at | Used for |
|-------|------------|----------|
| `--color-valide-foreground` | `globals.css:201` (light) / `:276` (dark) | Yes-side ring stroke + filled Heart icon |
| `--color-valide-border` | `globals.css:203` (light) / `:278` (dark) | Yes-side button border (unchanged from existing) |
| `--destructive` | `globals.css:161` (light) / `:245` (dark) | No-side ring stroke ONLY (REMOVED from no-button chrome per D-13) |
| `--foreground-muted` | `globals.css:182` (light) / `:264` (dark) | No-side Heart icon color + neutral hover |
| `--border` | `globals.css:162` (light) / `:246` (dark) | No-side button border (replaces `border-destructive/50`) |

**`--color-valide-tint`** is referenced by REQUIREMENTS.md DECK-01 wording but is **NOT used in this phase** (D-02). The plan rewrites the REQ wording to match. Note this so future code review doesn't flag absence as drift.

### Stroke and corners

| Property | Value | Rationale |
|----------|-------|-----------|
| Ring stroke width | `ring-2` (Tailwind 2px) | D-03 — crisp; matches `rounded-2xl` card corner cleanly |
| Ring offset | None (no `ring-offset-*`) | D-03 — no "halo gap" |
| Card corner radius | `rounded-2xl` (existing) | Unchanged |

---

## Interaction Contract

### Drag-feedback ring (DECK-01)

- Driven by existing `yesOpacity` / `noOpacity` `useTransform` hooks (`ShortlistCard.tsx:99-108`).
- Ring opacity ramps **linearly** from 0 (at `x=0`) to 1 (at `|x|=SWIPE_OVERLAY_INPUT_PX = 80`) — D-06.
- Implementation pattern (D-04, Claude's Discretion within plan): two absolutely-positioned `motion.div`s with `ring-2` and motion-bound `opacity` is the recommended pattern (cleaner at `rounded-2xl` corners). Alternative: single `motion.div` with `useMotionTemplate` boxShadow. Planner picks based on visual fidelity at the corner radius.
- Gate: rings render only when `isFront && !reducedMotion` (same guard as the deleted OUI/NON block at L280) — D-07.

### Swipe commit thresholds (DECK-02)

| Constant | Old | New | File |
|----------|-----|-----|------|
| `SWIPE_THRESHOLD_PX` | 100 | **140** | `swipe-tokens.ts:5` |
| `SWIPE_VELOCITY_PX_S` | 500 | **750** | `swipe-tokens.ts:8` |
| `SWIPE_OVERLAY_INPUT_PX` | 100 | **80** | `swipe-tokens.ts:18` (semantic now = "ring opacity ramp") |
| `SWIPE_FLYOFF_DURATION_S` | 0.2 | **0.28** | `swipe-tokens.ts:28` |
| `SWIPE_ROTATE_RANGE_DEG` | 15 | 15 (unchanged) | `swipe-tokens.ts:15` |
| `SWIPE_FLY_OFFSCREEN_FACTOR` | 1.4 | 1.4 (unchanged) | `swipe-tokens.ts:11` |

Commit logic at `ShortlistCard.tsx:110-116` is structurally unchanged — only the threshold values shift.

### Thumb buttons (DECK-03)

| Slot | Icon | Color | Border | Hover |
|------|------|-------|--------|-------|
| Yes (right) | `<Heart fill="currentColor" />` | `var(--color-valide-foreground)` | `var(--color-valide-border)` (unchanged) | `color-mix(in srgb, var(--color-valide-foreground) 10%, transparent)` (unchanged) |
| No (left) | `<Heart />` (outline) | `text-foreground-muted` | `border-border` (default; bump to `border-foreground-muted/40` if contrast too low at h-14) | `hover:bg-foreground-muted/10` |

- Both buttons keep: shadcn `Button` `variant="outline"`, `size="icon"`, `h-14 w-14 rounded-full`, `active:scale-95 transition-transform`, `disabled={submittingFor !== null}` — D-15.
- `onVote("yes")` / `onVote("no")` plumbing byte-identical — D-16. Architecture invariant #2 (voting state is computed, not stored) holds.
- Existing translation keys preserved: `vote_yes_aria` → `J'aime cette recette`, `vote_no_aria` → `Pas envie ce soir`.

### Tap-to-detail (DECK-04)

| Step | Behavior |
|------|----------|
| `onPanStart` | `panRef.current = true` |
| `onPanEnd` | Schedule `panRef.current = false` on next tick (`setTimeout(0)` / `rAF` / microtask — planner empirically picks the one that prevents iOS Safari double-fire). |
| `onTap` | `if (!panRef.current && isFront) router.push(`/recipes/${recipe.id}`)` |
| Thumb-button click | Bubbles through their own component (sibling-level in `ShortlistDeck.tsx:183-186`); never reaches the card's `onTap`. **No `stopPropagation` needed** — D-19. |
| Peek cards | `pointer-events-none` (existing) — taps don't reach them. `isFront` check in `onTap` is belt-and-suspenders — D-22. |
| Back from `/recipes/[id]` | No new code. Unvoted-filter in parent `HomeDecide` already returns the same recipe as `remaining[0]` if the user didn't vote — D-20. If the partner voted via realtime while user was on detail, deck may advance: that's correct behavior, not a regression. |
| Tap feedback | **None.** `router.push` fires immediately; iOS Safari native page-transition is the feedback — D-21. No `active:scale`, no `whileTap` brightness, no loading state. |
| Routing | `useRouter` from `next/navigation` (App Router — existing pattern). Path alias `@/*` — invariant from CLAUDE.md §Conventions. |

---

## Motion Contract

| Aspect | Value | Source |
|--------|-------|--------|
| Snap-back spring | `transitions.springSnap` = stiffness 240, damping 28, mass 1.1 | `frontend/lib/motion.ts:24` — **already wired** at `ShortlistCard.tsx:223` (D-09); no change |
| Fly-off duration | 0.28s | `SWIPE_FLYOFF_DURATION_S` after retune (D-08) |
| Fly-off ease | `easeCraft` (`cubic-bezier(0.32, 0.72, 0, 1)`) | `frontend/lib/motion.ts` — unchanged |
| Fly-off translation | `±window.innerWidth * SWIPE_FLY_OFFSCREEN_FACTOR (1.4)` | Unchanged |
| Fly-off rotation | `±12°` (`committedDirection` driven) | Unchanged |
| Card rotation while dragging | `useTransform(x, [-200, 200], [-15°, 15°])` | Unchanged |
| Ring opacity curve | Linear via `useTransform(x, [0, 80], [0, 1])` (yes) / `useTransform(x, [-80, 0], [1, 0])` (no) | D-05, D-06 — no easing function on the transform |
| Card entry (peek → front) | `initial={scale:0.94, y:12, opacity:0.85}` → `animate={scale:1, y:0, opacity:1}` | Unchanged |
| Legacy `SWIPE_SPRING` (400/40) | **Deleted** | D-09 — no importers (grep-verified) |

**Feel target** (D-09 / CONTEXT.md §Specific Ideas): the spring physics on the card provides "lively, slightly-overshooting snap-back"; the ring is just a feedback indicator. Don't add easing to the ring — let the card's spring be the personality.

---

## Accessibility Contract

| Aspect | Behavior | Source |
|--------|----------|--------|
| `prefers-reduced-motion` | Honored via existing `usePrefersReducedMotion()` (`useSyncExternalStore` pattern, `ShortlistCard.tsx:74-76`). Drag disabled, no rotation, no ring, no fly-off. Functional voting via thumb-button taps still works. Tap-to-detail still works (functional path, not motion). | D-07, D-28 |
| Card role | `role="article"` + `aria-labelledby={shortlist-card-${id}-title}` — preserved. Tapping a `role=article` to open detail is an accepted A11y pattern (list of article previews). | Existing L207-208 |
| Thumb-button aria-labels | `t("vote_yes_aria")` = "J'aime cette recette", `t("vote_no_aria")` = "Pas envie ce soir" — preserved verbatim (D-15). | Existing L363, L374 |
| Partner-vote dot aria-label | `t("partner_yes_aria")` / `t("partner_no_aria")` / `t("partner_unvoted_aria")` — preserved. The dot footer inherits the card's `onTap` navigation (D-17); no `stopPropagation` since it's a status display, not a button. | Existing L165-171, L324-338 |
| Disabled state | `disabled={submittingFor !== null}` on both thumb buttons — preserved (D-15). | Existing pattern via `ShortlistDeck.tsx:185` |
| Real-device gate | Operator runs `iOS Settings → Accessibility → Motion → Reduce Motion` toggle pass at phase close, validating: no drag, no ring, no fly-off; both thumb taps still vote; tap-to-detail still navigates. | D-28 |

---

## Copywriting Contract

**No new strings.** This phase removes user-facing strings (OUI / NON overlays) and adds **zero** new ones. The navigation target `/recipes/[id]` is fully styled and translated (Phase 8 + Phase 22 QW-03).

| Element | Status | Translation key |
|---------|--------|-----------------|
| OUI overlay | **DELETED** | (was hardcoded — no key) |
| NON overlay | **DELETED** | (was hardcoded — no key) |
| Yes-button aria-label | Preserved | `home.shortlist.vote_yes_aria` = "J'aime cette recette" |
| No-button aria-label | Preserved | `home.shortlist.vote_no_aria` = "Pas envie ce soir" |
| Partner yes dot | Preserved | `home.shortlist.partner_yes_aria` |
| Partner no dot | Preserved | `home.shortlist.partner_no_aria` |
| Partner unvoted dot | Preserved | `home.shortlist.partner_unvoted_aria` |
| Card title | Preserved | `recipe.title` (data — not a string key) |
| Cuisine / mood labels | Preserved | `useEnumLabels()` (Phase 22 QW-03) |

CLAUDE.md invariant #6 (French-only via `next-intl`) is preserved trivially — no new strings introduced.

---

## Spacing Scale

Inherited from existing design system. Phase 23 makes no spacing changes. For reference:

| Token | Value | Defined |
|-------|-------|---------|
| `--spacing-page-x` | 24px | `globals.css:135` |
| `--spacing-section-y` | 24px | `globals.css:136` |
| `--spacing-stack-y` | 12px | `globals.css:137` |
| Card padding | 20px (`p-5` on body, L301) | Existing |
| Thumb-button row gap | 48px (`gap-12`, L356) | Existing |
| Thumb-button size | 56px (`h-14 w-14`, L364/L375) | Existing |

Exceptions: none.

---

## Typography

Inherited. Phase 23 makes no typography changes. For reference:

| Role | Class | Defined |
|------|-------|---------|
| Card title | `.text-title` (Cormorant Garamond upright, 24px / 1.2, weight 500) | `globals.css:377-383` — applied at L304 |
| Body | `.text-body` (IBM Plex Sans, 16px / 1.55, weight 400) | `globals.css:388-394` |
| Caption | `.text-caption` (IBM Plex Sans, 13px / 1.45) | `globals.css:399-406` |
| Partner-vote footer | `text-xs font-medium text-foreground-muted` (12px, existing) | L335 |

---

## Color

Inherited from `frontend/app/globals.css` v0.2 Slow Food palette (terracotta primary, warm-cream surface, paper-grain texture). Phase 23 adds **no new tokens**.

| Role | Token | Phase 23 use |
|------|-------|--------------|
| Dominant (60%) | `--background` (oklch 0.985 0.008 60) | Page surface — unchanged |
| Secondary (30%) | `--card` (oklch 0.992 0.006 60) | Card surface — unchanged |
| Primary accent (10%) | `--primary` (terracotta, oklch 0.595 0.135 35) | NOT used in this phase |
| Yes-state accent | `--color-valide-foreground` (#10B981 / dark #6EE7B7) | Ring stroke + filled Heart icon |
| Destructive | `--destructive` (oklch 0.55 0.20 25) | No-side ring stroke ONLY (removed from no-button chrome) |
| Neutral foreground | `--foreground-muted` | No-side Heart icon + hover wash |

**Accent reserved for** (post-phase): emerald `--color-valide-foreground` reserved for Validé winning state, cooking-success accent, **and the swipe-deck yes-state feedback** (this phase formalizes the latter — it inherits the same hue semantically). Destructive `--destructive` is reserved for destructive actions across the app and now **the no-side swipe ring feedback only** (no longer the no-button chrome).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `Button` (existing, already in repo) | not required (re-use, no new install) |
| Third-party | none | not applicable |

No `npx shadcn add` calls in this phase. No new components installed. No third-party registries.

---

## Verification Gates

Per D-26 / D-27 / D-28 — verification is grep + manual smoke + real-device reduced-motion pass. No new Playwright specs (preserves Phase 22 "polish phases don't expand the test surface" discipline).

### Grep gates (must all pass)

```bash
grep -n "OUI\|NON" frontend/components/ShortlistCard.tsx
# → zero matches

grep -n "lucide-react" frontend/components/ShortlistCard.tsx | grep -E " X[ ,}]"
# → zero (X import removed)

grep -n "SWIPE_THRESHOLD_PX = 140\|SWIPE_VELOCITY_PX_S = 750\|SWIPE_OVERLAY_INPUT_PX = 80\|SWIPE_FLYOFF_DURATION_S = 0.28" frontend/lib/swipe-tokens.ts
# → 4 matches

grep -rn "SWIPE_SPRING" frontend/
# → zero (legacy constant deleted, no importers)
```

### Manual UI smoke (operator on seeded fixture)

1. Drag front card right ~80px → emerald ring at full opacity → release → snap-back (no commit).
2. Drag front card right ~50px → emerald ring at ~62% opacity → release → snap-back.
3. Drag front card right ~140px → release → fly-off right (0.28s), vote yes posted, deck advances.
4. Drag front card left ~140px → release → fly-off left (0.28s), vote no posted, deck advances (destructive ring visible during drag).
5. Tap front card body → `/recipes/[id]` opens; iOS back gesture → same front card visible.
6. Tap filled-Heart button → vote yes posted, fly-off right, **no** navigation.
7. Tap outline-Heart button → vote no posted, fly-off left, **no** navigation.

### Real-device `prefers-reduced-motion` (D-28)

iOS Settings → Accessibility → Motion → Reduce Motion ON. Verify:

- Front card drag disabled (no movement).
- Both thumb buttons still vote correctly.
- No ring animation visible.
- Tap-to-detail still works (functional path).
- Fly-off animation does not play (`motionExit === undefined` under reduced motion, existing L188).

---

## Open Questions

**None.** CONTEXT.md is comprehensive. Remaining decisions are explicit Claude's Discretion within the plan:

- Ring implementation: two stacked `motion.div`s **vs** single `motion.div` with `useMotionTemplate` boxShadow (CONTEXT.md §Claude's Discretion bullet 1) — recommendation: two stacked divs.
- `border-foreground-muted/40` **vs** `border-border` on no-side Heart button — try `border-border` first; bump if contrast disappears at h-14 (CONTEXT.md §Claude's Discretion bullet 2).
- `setTimeout(0)` **vs** `requestAnimationFrame` **vs** microtask for the `panRef = false` deferral — empirically pick the one that prevents iOS Safari tap-after-drag double-fire (CONTEXT.md §Claude's Discretion bullet 3). Requires iPhone smoke test.
- JSDoc-update inlining style in `swipe-tokens.ts` (CONTEXT.md §Claude's Discretion bullet 4) — minor stylistic call.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (zero new strings; existing keys preserved)
- [ ] Dimension 2 Visuals: PASS (ring stroke + Heart icons consolidated; no new components)
- [ ] Dimension 3 Color: PASS (only pre-existing tokens used; no token drift)
- [ ] Dimension 4 Typography: PASS (no typography changes)
- [ ] Dimension 5 Spacing: PASS (no spacing changes)
- [ ] Dimension 6 Registry Safety: PASS (no new components installed; only existing shadcn `Button` reused)

**Approval:** pending
