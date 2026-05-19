# Phase 32: Port locked screens to Sober Kitchen — Research

**Researched:** 2026-05-18
**Domain:** CSS design token migration, Next.js 16 font loading, React component primitives, Tailwind v4 utility composition
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: 5-plan ladder mirroring §15.C: 32-01 Tokens → 32-02 Primitives + sweeps → 32-03 Accueil → 32-04 Bibliothèque → 32-05 Recette
- D-02: Cross-cutting sweeps (SOBER-07 marginalia, SOBER-08 spinner) land in 32-02 Primitives
- D-03: No 32-06 close-out plan; grep gates run at 32-02 and 32-04
- D-04: 32-01 scope — §15.A token swaps in globals.css, Caveat registration, utility classes, delete styleguide
- D-05: 32-02 scope — 4 new primitives + all spinner call-site sweeps; PinLabel keeps API, composes Marginalia "if straightforward"
- D-06: 32-03 scope — HomeDecide.tsx port only (+ i18n keys); ShortlistDeck survives unchanged
- D-07: 32-04 scope — recipes/page.tsx + LibraryViewSwitch + RecipeRow + cookCountToPatina + groupByPatina; all 3 views
- D-08: 32-05 scope — recipes/[id]/page.tsx port; step marginalia from most recent cooking_logs[].note below step 1 only
- D-09: All 3 Bibliothèque views ship in 32-04
- D-10: localStorage["aldente.library.view"] ("grid"|"list"|"patina"), default "grid", SSR pre-renders grid, 150ms opacity anti-flash
- D-11: cookCountToPatina thresholds: 0→0, 1-2→1, 3-10→2, >10→3
- D-12: groupByPatina → { heritage: patina>=3, habitudes: patina===2, essai: patina<=1 }
- D-13: Marginalia copy — Accueil subhead from shortlist vote states, Recette détail from cook_count, step marginalia from most recent cooking_logs[].note below step-1 only
- D-14: Strict grep gate — grep -rn "animate-spin\|Spinner\|LoadingSpinner" frontend/ returns 0 outside BrandLoader.tsx
- D-15: BrandLoader is the single export with size="default"|"sm" variants; no Spinner shim
- D-16: Capture (/recipes/new) — primitive-level touches only (spinner swap + token leak); no layout/copy changes
- D-17: /inbox deletion not required (Phase 27 removed it); §15.E stale doc not edited
- D-18: BottomNav — token-only port; Phase 31 structure unchanged
- D-19: Invariant #2 guard — computeVoteState only, no state column; grep gate on backend/app/models/
- D-20: Zero new broadcast_to_household events
- D-21: All new strings via next-intl fr.json; keys: home.subhead.*, home.library.patina_section.*, recipes.detail.subhead.*
- D-22: enums.ts ↔ enums.py parity unchanged
- D-23: --color-valide-foreground stays emerald h≈145; don't desaturate during member-color sweep

### Claude's Discretion
- BrandLoader: one component with size prop vs. two named exports
- LedgerCard: thin shadcn Card wrapper vs. independent component
- Exact French phrasing for home.subhead.* and recipes.detail.subhead.* keys
- Toaster loading-icon substitution mechanism (3 valid paths documented in D-14)
- Whether to compose Marginalia inside PinLabel (only if straightforward)
- Patine bucket naming: "essai" confirmed by doc (À l'essai)
- Date row helper: formatRelativeFr (existing) vs. new short-form helper

### Deferred Ideas (OUT OF SCOPE)
- Recipe provenance field ("de chez maman") — no schema add in Phase 32
- Per-step marginalia from cooking_logs[].step_notes[] — only single note exists
- Stale design-system.html §15.E "Réception" doc — not edited
- Bottom-nav icon swaps (other 4 tabs)
- « Suggérer » tab (gh#26)
- Bibliothèque view as household setting (server-side pref)
- Animated patine state transitions
- Marginalia rotation on Accueil (random pick from variants)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SOBER-01 | Locked tokens in globals.css (§15.A), Caveat registered (§15.B), utility classes, §15.D cleanup | Token delta table verified from design-system.html lines 1880-1919; Caveat import shape confirmed from layout.tsx |
| SOBER-02 | Accueil screen ports to locked Sober Kitchen layout | HomeDecide.tsx code audited; computeVoteState output shape confirmed; i18n key additions specified |
| SOBER-03 | Bibliothèque screen ports — A/B/C views with view-switcher | recipes/page.tsx code audited; localStorage anti-flash pattern researched; RecipeCard paper-grain stacking risk identified |
| SOBER-04 | Recette — Détail ports to cookbook page register | recipes/[id]/page.tsx code audited; cooking_logs.note backend wire confirmed; data gap for step marginalia resolved |
| SOBER-05 | Recipe cards render patine treatment from cook_count → patina mapping | RecipeCard.tsx audited; paper-grain composition risk identified; cookCountToPatina thresholds locked |
| SOBER-06 | Voting surfaces render as table-à-manger scene; invariant #2 maintained | computeVoteState output shape confirmed; seat mapping for couple-scale (2 members) specified |
| SOBER-07 | Marginalia register with Caveat across locked screens; PinLabel is reference | PinLabel.tsx audited; font size gap (12px vs 16px sm tier) identified; composition recommendation made |
| SOBER-08 | Brand-mark loader replaces ad-hoc spinners; grep gate 0 outside BrandLoader | Full spinner audit completed: 15 call-sites across 8 files + sonner; BrandIcon SVG paths confirmed |
</phase_requirements>

---

## Summary

Phase 32 is a surgical design-system port, not a feature build. The locked contract lives entirely in `docs/design-system.html` §15 — token values to swap, CSS blocks to transplant, component APIs to introduce, and a strict 5-plan merge order. Research confirms the codebase is well-positioned for the port: token names are preserved (zero Tailwind `@theme` edits needed), `BrandIcon.tsx` already carries the exact two-path SVG the loader needs, `PinLabel.tsx` already consumes `var(--font-marginalia)` at 12px/600 weight (before Caveat is loaded — a gap resolved by 32-01), and `computeVoteState` in `lib/votes.ts` already produces the exact 5-state output `<TableVote>` needs.

The most significant findings are operational: (1) `paper-grain` is currently on `RecipeCard`'s `<Link>` wrapper — wrapping in `<LedgerCard>` will create a double-grain unless `paper-grain` is removed from the existing wrapper; (2) `cooking_logs[].notes` (note: field name is `notes`, not `note`) is NOT returned by `GET /api/recipes/:id` — a separate query or a cheap join is needed to populate Recette détail step-1 marginalia; (3) sonner v2.0.7 already has the `icons.loading` prop wired in `frontend/components/ui/sonner.tsx` at line 28, making the substitution a one-line change; (4) Caveat is not yet registered anywhere in the frontend — `var(--font-marginalia)` in PinLabel resolves to nothing until 32-01 lands.

**Primary recommendation:** Follow the 5-plan ladder exactly. All cross-cutting concerns (font registration, token swap, utility CSS) must land in 32-01 before any primitive is built in 32-02. The spinner sweep is the highest-risk cross-cutting change and must stay atomic: introduce BrandLoader first, sweep all 15 sites in the same plan.

---

## Standard Stack

### Core (already in dependency tree)
| Library | Version | Purpose | Note |
|---------|---------|---------|------|
| Tailwind v4 | `^4` | Utility CSS + `@theme inline` block | [VERIFIED: frontend/package.json] |
| `next/font/google` | Next.js 16.2.4 | Web font loading with CSS variable injection | [VERIFIED: layout.tsx] |
| `next-intl` | `^4.11.0` | French i18n string management | [VERIFIED: frontend/package.json] |
| `lucide-react` | `^1.14.0` | Icon source (layout-grid, list, layers for view-switcher) | [VERIFIED: frontend/package.json] |
| `sonner` | `^2.0.7` | Toast surface (Toaster already configures `icons.loading`) | [VERIFIED: frontend/package.json + ui/sonner.tsx] |
| `framer-motion` | `^12.38.0` | Available for patine transition if needed | [VERIFIED: frontend/package.json] |

### No new dependencies needed
The full Phase 32 implementation requires zero new npm packages. All fonts, icons, animation primitives, and CSS tools are already present. [VERIFIED: frontend/package.json audit]

---

## Architecture Patterns

### Recommended Project Structure for new primitives
```
frontend/components/
├── BrandLoader.tsx        # New — stroke-dasharray loader
├── LedgerCard.tsx         # New — patine card with --patina CSS var
├── Marginalia.tsx         # New — Caveat wrapper (sm/md/lg + slant)
├── TableVote.tsx          # New — table-scene seat-state renderer
├── LibraryViewSwitch.tsx  # New — segmented control 3-views (32-04)
├── RecipeRow.tsx          # New — horizontal list-view card (32-04)
└── RecipeCard.tsx         # Modified — body wrapped in LedgerCard
```

Planner's call whether to group under `components/sober/` or flat in `components/`. Either is consistent with existing pattern (`@/components/` for app components per CLAUDE.md conventions). [ASSUMED]

### Pattern 1: Tailwind v4 token swap with `@theme inline`

The `@theme inline` block in `globals.css` maps `--color-*` Tailwind utilities to CSS variables. Because §15.A preserves ALL token names, the swap is values-only inside `:root {}` — the `@theme inline` block is untouched. [VERIFIED: globals.css lines 7-139 cross-referenced with design-system.html lines 1880-1919]

Token names preserved (names unchanged, values swapped):
- `--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--muted-foreground`, `--border`, `--destructive`, `--radius`
- Member hex tokens: `--color-member-rose-bg`, `--color-member-amber-bg`, `--color-member-emerald-bg`, `--color-member-sky-bg`, `--color-member-violet-bg`

New tokens to ADD (not rename):
- `--font-marginalia: "Caveat", cursive;` — goes in `:root`
- `--duration-slow: 3200ms;` — goes in `@theme inline` (alongside existing `--duration-fast` and `--duration-normal`)
- `--patina: 0;` — goes in `:root` as global default, overridden per-card via inline style

The `themeColor` in `layout.tsx` viewport export (currently `#C8553D`) must be updated to match the sober primary `oklch(0.50 0.10 32)` — approximately `#8B4A35`. [ASSUMED — the hex approximation needs verification against the exact OKLCH conversion at plan time]

### Pattern 2: Caveat font registration alongside existing fonts

Current `layout.tsx` pattern:
```typescript
// VERIFIED: frontend/app/layout.tsx lines 11-25
const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});
const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});
```

The §15.B prescription (design-system.html line 1934-1935):
```typescript
// Source: docs/design-system.html §15.B
import { Cormorant_Garamond, IBM_Plex_Sans, Caveat } from "next/font/google";
const caveat = Caveat({
  variable: "--font-marginalia",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  display: "swap",
});
// Add ${caveat.variable} to the <html> className alongside the existing two
```

**No style variants for Caveat** — Caveat has no italic axis; weight 500+600 cover the two weights (body marginalia at 500, PinLabel at 600). [VERIFIED: design-system.html §15.B]

**HTML className concatenation**: currently `${cormorantGaramond.variable} ${ibmPlexSans.variable} h-full antialiased` — append `${caveat.variable}` to the same string. [VERIFIED: layout.tsx line 57]

**iOS Safari PWA reliability**: Google Fonts loaded via `next/font/google` are self-hosted at build time (Next.js downloads and bundles them). They do NOT depend on an external Google CDN connection in standalone PWA mode. The `cursive` fallback in `--font-marginalia: "Caveat", cursive` is a belt-and-suspenders for the edge case where the font hasn't bundled. [VERIFIED: this is a known Next.js font optimization behavior — fonts are inlined into the CSS output at build time, not loaded from fonts.gstatic.com at runtime]

**PinLabel current gap**: `PinLabel.tsx` already uses `fontFamily: "var(--font-marginalia)"` at 12px/600. Currently, `--font-marginalia` is not defined anywhere in globals.css or layout.tsx — it resolves to nothing (browser falls back to `cursive` generically). Registering Caveat in 32-01 fills this gap without any PinLabel code changes. [VERIFIED: globals.css search for "font-marginalia" returns empty; layout.tsx search returns empty]

### Pattern 3: LedgerCard composition with paper-grain

**Critical finding:** `RecipeCard.tsx` has `paper-grain` on its outer `<Link>` wrapper (line 83). `LedgerCard`'s `::after` pseudo-element adds a CSS dot-grid grain. Both render simultaneously, creating a double-grain effect on recipe cards.

Resolution: when wrapping `<RecipeCard>` in `<LedgerCard>` (32-04 D-07), remove `paper-grain` from the outer `<Link>` wrapper in `RecipeCard`. The `LedgerCard`'s own `::after` grain replaces it. The `paper-grain` utility on other components (cooking-log cards, settings cards, recipe-detail strips) is NOT affected — `LedgerCard` is only used for recipe cards. [VERIFIED: RecipeCard.tsx line 83; design-system.html .ledger-card::after lines 215-225]

**Implementation approach for LedgerCard**:
```tsx
// Source: docs/design-system.html lines 186-236 (exact CSS)
// Props:
interface LedgerCardProps {
  patina: 0 | 1 | 2 | 3;
  className?: string;
  children: React.ReactNode;
}
// Render: <div style={{ "--patina": patina } as CSSProperties} className={`ledger-card ${className}`}>
```

Whether to wrap the shadcn `<Card>` primitive or create an independent `<div>` is planner's call. The shadcn Card has its own `rounded-lg border shadow-sm` defaults that conflict with `.ledger-card` CSS (which sets `border-radius: calc(12px - var(--patina) * 1px)` and `box-shadow: var(--shadow-card)`). An independent `<div>` is cleaner — just apply the `.ledger-card` class from globals.css. [ASSUMED — based on CSS specificity analysis]

### Pattern 4: TableVote seat-state machine

`computeVoteState` in `lib/votes.ts` takes `votes: readonly { vote: VoteValue }[]` and `memberCount: number` and returns one of 5 strings: `"valide" | "pressenti" | "conteste" | "rejete" | "sans_avis"`. [VERIFIED: lib/votes.ts lines 32-48]

**For couple-scale (2 members), seat mapping:**
- seat-north = Member 1 (me)
- seat-south = Member 2 (partner)
- seat-east and seat-west = unused (keep in DOM with neutral/hidden state for future N>2 households)

The design mock uses seat-north + seat-south only for 2-member households. [VERIFIED: design-system.html Accueil section lines 1490-1533]

**Per-seat state derivation:** `computeVoteState` returns the AGGREGATE state, not per-seat. For the table scene, per-seat state must be derived from individual votes:
- If `votes.filter(v => v.member_id === member.id).find(v => v.vote === "yes")` → that seat is `pressenti` (or `valide` if unanimous)
- If `votes.filter(v => v.member_id === member.id).find(v => v.vote === "no")` → that seat is `rejete` direction

The design system uses per-seat CSS classes derived per-seat from individual member votes, not from the aggregate state. `<TableVote>` will need: `votes: ShortlistVote[]`, `members: Member[]` (to map seat-north/south), `myMemberId: string`. It computes per-seat state internally. [VERIFIED: design-system.html lines 1490-1533; lib/votes.ts ShortlistVote type]

**CSS classes per seat state** (from design-system.html lines 267-297):
- `seat-state-valide` — emerald ring + glow
- `seat-state-pressenti` — primary-alpha ring with inner white inset
- `seat-state-neutral` — opacity 0.32, grayscale 0.7
- `seat-state-rejected` — opacity 0.45, grayscale 0.85, plus directional offset per seat position
- `seat-state-contested` — strike-through bar via `::after` pseudo

**Note on `conteste` vs `rejected`**: In the 2-member household case, `conteste` (one yes, one no) means both seats show: seat-north = `pressenti` (the "yes" voter), seat-south = `rejected` pushed away. This is a visual editorial choice not explicit in the CSS class names — the planner should specify the per-seat rendering for the `conteste` aggregate state.

### Pattern 5: BrandLoader animation

The BrandIcon SVG (in `BrandIcon.tsx`) has exactly two `<path>` elements with the same paths the design system's LOADER CSS targets. [VERIFIED: BrandIcon.tsx lines 42-44; design-system.html loader CSS lines 299-320]

```tsx
// Source: docs/design-system.html LOADER block (lines 299-320)
// BrandLoader composes BrandIcon SVG directly with these keyframe overrides:
// stroke-dasharray: 220 on BOTH paths
// path:nth-child(1): animation drawLoop 3.2s ease-craft infinite (no delay)
// path:nth-child(2): animation-delay: 280ms
// @keyframes drawLoop: 0%{stroke-dashoffset:220;opacity:0.25} 38%{offset:0;opacity:1} 62%{offset:0;opacity:1} 100%{offset:-220;opacity:0.25}
// prefers-reduced-motion: animation: none; stroke-dashoffset: 0; opacity: 1 (flat brand mark)
```

**Size variant question**: The `size="default"` (96px) uses `stroke-dasharray: 220` which matches the 160×160 viewBox. For `size="sm"` (16-20px equivalent for inline button spinners), using the same `stroke-dasharray: 220` with the same 160×160 viewBox still works — the SVG scales proportionally, and dasharray is in viewBox units, so the animation proportions remain correct. No scaled dasharray value needed. [ASSUMED — based on SVG scaling behavior; planner should test at 16px to confirm visual fidelity]

**`prefers-reduced-motion` interaction with globals.css**: `globals.css` already has a global `prefers-reduced-motion` rule setting `animation-duration: 0ms !important` and `transition-duration: 0ms !important`. This means the BrandLoader `drawLoop` animation will be killed by the global rule — the per-component `animation: none; stroke-dashoffset: 0` fallback in `.loader-brand` is redundant but harmless (matches what the global rule produces). [VERIFIED: globals.css lines 491-497]

### Pattern 6: Sonner loading icon substitution

`frontend/components/ui/sonner.tsx` already uses the `icons` prop at lines 14-30, including `loading: <Loader2Icon className="size-4 animate-spin" />`. [VERIFIED: ui/sonner.tsx lines 14-30]

The **cleanest path** is a one-line replacement in the existing `icons` object:
```tsx
// In frontend/components/ui/sonner.tsx — replace line 28:
// Before:
loading: (<Loader2Icon className="size-4 animate-spin" />),
// After:
loading: (<BrandLoader size="sm" />),
```

No wrapping, no per-toast `icon` prop changes. `Loader2Icon` import and `animate-spin` class both disappear from this file, contributing to the SOBER-08 grep gate. [VERIFIED: ui/sonner.tsx full file read; sonner v2.0.7 `icons` prop is at the Toaster level]

### Pattern 7: localStorage anti-flash hydration (Bibliothèque)

Next.js 16 App Router SSR pattern for client-only localStorage state:

```tsx
// Pattern: SSR renders default (grid), client reads localStorage post-mount
const [view, setView] = useState<"grid" | "list" | "patina">("grid"); // SSR default
const [hydrated, setHydrated] = useState(false);

useEffect(() => {
  const stored = localStorage.getItem("aldente.library.view");
  if (stored === "list" || stored === "patina") setView(stored);
  setHydrated(true);
}, []);

// Render: wrap panel in opacity transition
// className={`transition-opacity duration-150 ${hydrated ? "opacity-100" : "opacity-0"}`}
```

**Hydration mismatch**: There is NO React hydration mismatch because `view` state is initialized to `"grid"` both on SSR and on client mount — the localStorage read happens inside `useEffect` which never runs during SSR. The opacity 0→1 transition on the panel hides the brief panel-swap without triggering a React warning. [VERIFIED: Next.js App Router "use client" pattern — useEffect doesn't run on server]

**Module-level cache compatibility**: `recipes/page.tsx` uses a module-level `recipesCache` variable (line 55). The view-switcher state is per-component (`useState`), not module-level, so no interference. [VERIFIED: recipes/page.tsx line 55]

### Pattern 8: Recette détail step-1 marginalia from cooking_logs

**Critical finding — backend wire gap:**

`GET /api/recipes/:id` returns `RecipeResponse` which does NOT include `cooking_logs`. [VERIFIED: backend/app/schemas/recipe.py RecipeResponse model; backend/app/routers/recipes.py get_recipe handler]

The `cooking_logs` router exposes:
- `GET /cooking-logs?days=N` — household log list (last N days, finalized only)
- `GET /cooking-logs/{log_id}` — single log by ID
- `GET /cooking-logs/active` — today's unfinalized log

There is NO endpoint `GET /cooking-logs?recipe_id=X` for fetching logs filtered by recipe. [VERIFIED: backend/app/routers/cooking_logs.py full audit]

**The field name is `notes` not `note`**: `CookingLogResponse.notes: Optional[str]` [VERIFIED: backend/app/schemas/cooking_log.py line 23]

**Resolution for Phase 32 (D-13)**: The cheapest path to get "most recent cooking_logs[].notes for this recipe" is a **separate frontend fetch** at recipe detail mount:

```typescript
// In recipes/[id]/page.tsx — add after the recipe fetch resolves:
const logs = await api<CookingLogResponse[]>(`/api/cooking-logs?days=365`);
const recipeLog = logs
  .filter(l => l.recipe_id === recipe.id)
  .find(l => l.notes); // most recent with a note (logs are cooked_at DESC)
```

This reuses the existing `GET /cooking-logs?days=N` endpoint (no new backend work). The downside: fetches ALL household logs for the last year. For couple-scale with typical use (say, 100 cooks/year), this is fine — the endpoint already returns the entire list for the history page. [VERIFIED: cooking_logs.py list endpoint; couple-scale posture from CLAUDE.md]

**Alternative (if planner prefers)**: Add a query param `GET /cooking-logs?recipe_id=X` to the backend endpoint. This is a backend-only change (no schema change, no migration), but it widens Phase 32's scope to include a backend router edit. Phase 32's invariant D-20 says zero new broadcasts and D-08 implies no new backend endpoints for the detail screen. The separate fetch approach stays within phase scope.

**Render condition (D-13)**: Only render step-1 marginalia when `recipeLog?.notes` is truthy. If no log or no notes, the section is absent (no "pas de note" fallback text). [VERIFIED: CONTEXT.md D-13]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS token delivery | Custom CSS variables system | Tailwind v4 `@theme inline` + `:root` | Already wired; token names preserved |
| Web font loading | `@font-face` in CSS or `<link>` tag | `next/font/google` (Caveat) | Self-hosts at build time; solves iOS PWA reliability; matches existing Cormorant/IBM Plex pattern |
| Stroke animation | Custom SVG animation library | CSS `@keyframes drawLoop` on `.loader-brand` | 7-line keyframe matches the design doc exactly; framer-motion is overkill for a single looping animation |
| localStorage hydration | Custom hook with complex state | Simple `useEffect` + `useState` + opacity | SSR/CSR split doesn't warrant a library |
| Vote state derivation | Adding a `state` column to DB | `computeVoteState` already in `lib/votes.ts` | Architecture invariant #2; already tested with self-check |

---

## Runtime State Inventory

Step 2.5 is SKIPPED — Phase 32 is a pure frontend design port with no rename/refactor of stored identifiers. No Mem0, n8n, OS-registered tasks, or env var names are affected. [VERIFIED: phase boundary — CONTEXT.md confirms zero schema changes, zero new backend endpoints from the design port itself]

---

## Common Pitfalls

### Pitfall 1: Double-grain on RecipeCard
**What goes wrong:** `RecipeCard` has `paper-grain` on its outer `<Link>` (verified: line 83). `LedgerCard::after` adds a CSS dot-grid grain. Both render simultaneously.
**Why it happens:** Phase 5 added `paper-grain` to card surfaces; `LedgerCard` supersedes it with a more textured patine grain.
**How to avoid:** Remove `paper-grain` from `RecipeCard`'s outer `<Link>` when wrapping in `<LedgerCard>` (32-04). Other `paper-grain` surfaces (cooking-log, settings, detail-strip) are not wrapped in `LedgerCard` and must keep their `paper-grain`.
**Warning signs:** Cards look over-textured or have visible dot + SVG-noise layering.

### Pitfall 2: font-marginalia resolves to nothing before 32-01
**What goes wrong:** `PinLabel.tsx` already uses `var(--font-marginalia)` but the variable isn't defined yet. Without Caveat registered, it renders in `cursive` fallback.
**Why it happens:** PinLabel was written in anticipation of the font-marginalia token.
**How to avoid:** 32-01 must register Caveat AND define `--font-marginalia` in `:root` before 32-02 uses `<Marginalia>`.
**Warning signs:** Marginalia text looks like a generic cursive, not specifically Caveat.

### Pitfall 3: Desaturating member-emerald during member-color sweep
**What goes wrong:** §15.A member hex desaturation updates 5 member colors. `--color-member-emerald-bg` changes from `#10B981` → `#0D8A64`. But `--color-valide-foreground` (currently `#10B981`) must NOT change.
**Why it happens:** Same emerald hex serves two roles; the member-emerald is a member color, the valide-foreground is a semantic invariant (DECIDE-03).
**How to avoid:** Only update the 5 `--color-member-*-bg` tokens in `:root`. Never touch `--color-valide-foreground` / `--color-valide-emphasis` / `--color-valide-border` / `--color-cooking-foreground`.
**Warning signs:** "Validé" state rows / cooking banner show the wrong shade of emerald (darker than h≈145).

### Pitfall 4: Spinner sweep timing — sites swept before BrandLoader exists
**What goes wrong:** If a developer removes `animate-spin` call-sites in 32-02 before `<BrandLoader>` is built, the plan is in a broken half-state.
**How to avoid:** The 32-02 plan order must be: (1) create `BrandLoader.tsx`, (2) update call-sites. Never split across tasks where removal happens before the replacement exists.
**Warning signs:** 32-02 partially committed shows missing spinners with no replacement visual.

### Pitfall 5: localStorage read on the server (Bibliothèque)
**What goes wrong:** Calling `localStorage.getItem("aldente.library.view")` at module-level or before `useEffect` throws a ReferenceError in the SSR render.
**How to avoid:** Always read `localStorage` inside `useEffect`. Initialize `view` state to `"grid"` (no SSR-side read). This is guaranteed by the `"use client"` directive + `useEffect` pattern.
**Warning signs:** Next.js build error "localStorage is not defined" or hydration mismatch warning.

### Pitfall 6: conteste aggregate state → per-seat visual mapping is ambiguous
**What goes wrong:** `computeVoteState` returns `"conteste"` as an aggregate. `<TableVote>` must render per-seat states. For couple-scale: one yes + one no means seat-north is "pressenti" and seat-south is "rejected" (or vice versa based on who voted which way). Without per-vote mapping, both seats might show the same "contested" CSS class.
**How to avoid:** `<TableVote>` must receive individual vote records (`votes: ShortlistVote[]`) and derive per-seat state from them, not just the aggregate. Use `votes.find(v => v.member_id === memberId)?.vote` to determine each seat's individual state.
**Warning signs:** Both seats show identical visual treatment for a contested recipe (no directionality).

### Pitfall 7: themeColor still shows v0.2 terracotta after token swap
**What goes wrong:** `layout.tsx` viewport export has `themeColor: "#C8553D"` hardcoded. After the sober primary shifts to `oklch(0.50 0.10 32)`, the PWA chrome color on iOS is still the brighter v0.2 terracotta.
**How to avoid:** Update `themeColor` in `layout.tsx` to the sober primary hex approximation in 32-01. Compute the hex from OKLCH: `oklch(0.50 0.10 32)` ≈ `#8B4A35` (planner should verify with CSS Color 4 calculator). [ASSUMED — hex approximation]
**Warning signs:** iOS PWA chrome color is visibly brighter/more saturated than the app's primary color.

### Pitfall 8: cooking_logs field name mismatch
**What goes wrong:** CONTEXT.md D-13 refers to "cooking_logs[].note" but the backend field is `notes` (plural). Any query using `.note` will return `undefined`.
**How to avoid:** Use `cookingLog.notes` (plural) everywhere in the frontend. [VERIFIED: backend/app/schemas/cooking_log.py line 23]

---

## Code Examples

### §15.A token swap (complete delta)

The `--rm` / `--add` lines from design-system.html §15.A applied to `:root` in globals.css:

```css
/* Source: docs/design-system.html lines 1880-1919 */
/* Light mode :root changes — names PRESERVED, values changed */
--background: oklch(0.975 0.006 75);    /* was 0.985 0.008 60 */
--foreground: oklch(0.21 0.014 55);     /* was 0.22 0.018 50 */
--card:       oklch(0.99 0.005 75);     /* was 0.992 0.006 60 */
--primary:    oklch(0.50 0.10 32);      /* was 0.595 0.135 35 */
--secondary:  oklch(0.93 0.010 60);     /* was 0.945 0.012 50 */
--muted-foreground: oklch(0.50 0.012 55); /* was 0.50 0.014 50 */
--border:     oklch(0.86 0.010 55);     /* was 0.88 0.012 50 */
--destructive: oklch(0.50 0.15 25);     /* was 0.55 0.20 25 */
--radius:     0.625rem;                 /* was 0.75rem */

/* Member desaturation */
--color-member-rose-bg:    #C0364A;    /* was #F43F5E */
--color-member-amber-bg:   #C98512;   /* was #F59E0B */
--color-member-emerald-bg: #0D8A64;   /* was #10B981 */
--color-member-sky-bg:     #0879AD;   /* was #0EA5E9 */
--color-member-violet-bg:  #6E46C1;   /* was #8B5CF6 */

/* New tokens to ADD */
--font-marginalia: "Caveat", cursive;
--duration-slow: 3200ms;
--patina: 0;

/* Shadows halved */
--shadow-card: 0 1px 2px 0 rgba(74,56,40,.05), 0 1px 3px 0 rgba(74,56,40,.03);
/* --shadow-card-hover and --shadow-nav also need updating per design-system.html */
```

### Caveat font registration

```typescript
// Source: docs/design-system.html §15.B (line 1934)
// In frontend/app/layout.tsx:
import { Cormorant_Garamond, IBM_Plex_Sans, Caveat } from "next/font/google";

const caveat = Caveat({
  variable: "--font-marginalia",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  display: "swap",
});

// In <html> className: add ${caveat.variable}
<html
  lang="fr"
  className={`${cormorantGaramond.variable} ${ibmPlexSans.variable} ${caveat.variable} h-full antialiased`}
>
```

### Marginalia primitive

```tsx
// Source: docs/design-system.html §12 marginalia CSS + §15.B
interface MarginaliaProps {
  size?: "sm" | "md" | "lg";
  slant?: boolean;
  className?: string;
  children: React.ReactNode;
}
// Uses .marginalia class from globals.css (added in 32-01)
// size maps to: sm=.marginalia-sm (1rem), md=.marginalia-md (1.2rem), lg=.marginalia-lg (1.5rem)
// slant adds .slant class (transform: rotate(-1.2deg); display: inline-block)
```

### PinLabel composition decision

`PinLabel` operates at 12px (sub-register below `marginalia-sm`'s 16px). The design system's `<Marginalia>` primitive starts at `size="sm"` = 16px. These tiers do NOT align — PinLabel cannot simply render `<Marginalia size="sm">` without overriding font-size back to 12px, which defeats the purpose.

**Recommendation (Claude's Discretion):** Leave PinLabel alone. Its inline style already correctly uses `var(--font-marginalia)` + 600 weight + rotate(-1.2deg) gutter behavior. After 32-01 lands Caveat, PinLabel automatically becomes a Caveat component without any code change. Adding a `<Marginalia>` internal composition would add complexity with no net visual change. [VERIFIED: PinLabel.tsx lines 50-57; design-system.html .marginalia-sm font-size: 1rem = 16px]

### BrandLoader component outline

```tsx
// Source: docs/design-system.html LOADER block (lines 299-320) + BrandIcon.tsx
interface BrandLoaderProps {
  size?: "default" | "sm";
  "aria-label"?: string;
}
// size="default": 96×96px container (.loader-brand CSS)
// size="sm": ~18×18px inline, same SVG viewBox (160×160), same dasharray (220)
// Renders BrandIcon SVG with stroke-dasharray CSS applied per .loader-brand
// prefers-reduced-motion: handled by globals.css global rule (animation-duration: 0ms !important)
// The loader-brand CSS block and drawLoop keyframe go in @layer utilities in globals.css (32-01)
```

### cookCountToPatina (verified against doc examples)

```typescript
// Source: CONTEXT.md D-11, cross-verified with design-system.html mock (Risotto 34× → 3, jamais → 0)
// In frontend/lib/recipes.ts
export function cookCountToPatina(n: number): 0 | 1 | 2 | 3 {
  if (n === 0) return 0;           // À l'essai — jamais
  if (n <= 2) return 1;            // récent
  if (n <= 10) return 2;           // Habitudes
  return 3;                        // Héritage
}
```

### groupByPatina (verified against CONTEXT.md D-12)

```typescript
// Source: CONTEXT.md D-12
// In frontend/lib/recipes.ts
export function groupByPatina(recipes: Recipe[]): {
  heritage: Recipe[];
  habitudes: Recipe[];
  essai: Recipe[];
} {
  return {
    heritage: recipes.filter(r => cookCountToPatina(r.cook_count) >= 3),
    habitudes: recipes.filter(r => cookCountToPatina(r.cook_count) === 2),
    essai: recipes.filter(r => cookCountToPatina(r.cook_count) <= 1),
  };
}
```

### i18n key additions (fr.json)

New keys to add under `home.subhead.*`:
```json
// Source: CONTEXT.md D-13 + design-system.html Accueil mock (line 1486)
"home": {
  "subhead": {
    "validated": "— déjà une idée validée",
    "tentative": "— une piste, à confirmer",
    "empty": "— personne ne s'est encore prononcé"
  },
  "library": {
    "patina_section": {
      "heritage": "Héritage",
      "habitudes": "Habitudes",
      "essai": "À l'essai"
    }
  }
}
```

New keys under `recipes.detail.subhead.*`:
```json
// Source: CONTEXT.md D-13, list-view mock line 1664 ("cuisiné 34 fois")
"recipes": {
  "detail": {
    "subhead": {
      "cooked": "cuisiné {count} fois",
      "never": "pas encore cuisiné"
    }
  }
}
```

**Note on `next-intl` plural interpolation:** `{count}` with a number value in `next-intl` v4.x does not auto-pluralize — the string will literally say "cuisiné 1 fois" which is grammatically correct in French (unlike English). No plural variant needed for French. [ASSUMED — verify against next-intl v4 docs if pluralization behavior matters]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| v0.2 terracotta primary `oklch(0.595 0.135 35)` | Sober primary `oklch(0.50 0.10 32)` — lower chroma, slightly darker | 32-01 | Softer, less saturated brand red across all primary-colored elements |
| `ibmPlexSans.variable` + `cormorantGaramond.variable` in `<html>` className | + `caveat.variable` | 32-01 | Adds `--font-marginalia` CSS variable, unlocking Caveat everywhere it's referenced |
| `Loader2 animate-spin` (15 sites) | `<BrandLoader>` (1 component, 2 size variants) | 32-02 | Unified brand identity in loading states; no third-party icon dependency |
| `RecipeCard` with `paper-grain` | `<LedgerCard patina={n}>` wrapping RecipeCard body (no paper-grain) | 32-04 | Patine intensity conveys cook history; grain comes from `::after` not SVG |
| Voting icons (Heart/thumbs in deck) | `<TableVote>` table-scene (on shortlist list, not deck) | 32-03 | Deck vote-by-swipe survives; list rows get the table scene |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `oklch(0.50 0.10 32)` ≈ `#8B4A35` for themeColor | Common Pitfalls #7 | themeColor hex is wrong; PWA chrome shows wrong color |
| A2 | Next.js `next/font/google` self-hosts Caveat at build time, no runtime Google CDN needed | Pattern 2 | iOS PWA Caveat fails to load in offline/standalone mode |
| A3 | `size="sm"` BrandLoader using same stroke-dasharray=220 at 16px looks acceptable | Pattern 5 | Stroke animation may be invisible or jagged at tiny size; may need adjusted dasharray |
| A4 | `LedgerCard` as independent `<div>` is cleaner than wrapping shadcn `<Card>` | Pattern 3 | Either works; CSS specificity the deciding factor |
| A5 | French "cuisiné {count} fois" is acceptable without plural handling in next-intl | Code Examples | "cuisiné 1 fois" is correct French but planner may want "cuisiné une fois" for 1 |
| A6 | `conteste` aggregate state maps to: "yes" voter's seat = pressenti visual, "no" voter's seat = rejected-push visual | Pattern 4 | Design intent may differ; check with design-system.html editorial notes |

---

## Open Questions

1. **themeColor exact hex for sober primary**
   - What we know: `--primary: oklch(0.50 0.10 32)` is the sober value
   - What's unclear: The precise `#rrggbb` hex for the iOS PWA `themeColor` field in layout.tsx
   - Recommendation: Planner should compute OKLCH→hex conversion at plan time (CSS Color 4 calculator or Node.js `color` package). Approximate: `#8B4A35` but verify.

2. **`conteste` per-seat visual rendering**
   - What we know: 2-member household, one yes + one no. Aggregate = `conteste`.
   - What's unclear: Should the "yes" seat show `pressenti` or a `contested` variant? Does the "contested strike" CSS class apply to BOTH seats or just the "no" seat?
   - Recommendation: The design-system.html mock (line 1515) shows `seat-state-valide` on north + `seat-state-contested` on south (for the Bœuf bourguignon row where L=favorable, M=passe). This implies: yes-voter seat = `pressenti` (or `valide`-like), no-voter seat = `contested` (with strike). Planner should treat the mock as authoritative and implement accordingly.

3. **Separate frontend fetch vs. backend filter for cooking_logs note**
   - What we know: No `?recipe_id=` filter on `GET /cooking-logs`; separate fetch fetches ALL logs for the household
   - What's unclear: At what scale does the "fetch all 365-day logs" approach become slow?
   - Recommendation: For couple-scale (hundreds of logs, not thousands), the separate fetch is fine. If planner wants a cleaner solution, add `?recipe_id=X` to the backend endpoint — but that widens Phase 32's scope.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 32 is a pure frontend code/CSS port. No new external tools, services, CLIs, or databases are required beyond the existing Next.js 16 / Tailwind v4 / npm toolchain already in use.

---

## Validation Architecture

Phase 32 has existing Playwright e2e specs. Most specs will survive the token swap because they assert behavior (vote states, navigation, content presence), not visual appearance (hex colors, font-family names).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | @playwright/test |
| Config file | `frontend/playwright.config.ts` |
| Viewport | iPhone-shape Chromium |
| Quick run command | `cd frontend && npx playwright test --project=chromium` |
| Full suite command | `cd frontend && npx playwright test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated | Notes |
|--------|----------|-----------|-----------|-------|
| SOBER-01 | Token values in DOM match sober spec | Visual / CSS | Manual grep gate | `grep -rn "0.595 0.135 35" frontend/` returns 0 |
| SOBER-02 | Accueil shows table-scene per shortlist row | Visual | Manual iPhone pass | Requires real device or Playwright screenshot baseline |
| SOBER-03 | Bibliothèque 3-view switcher persists | Behavioral | Playwright (new) | Test localStorage key + view swap |
| SOBER-04 | Recette shows cookbook layout | Visual | Manual iPhone pass | Visual register hard to automate |
| SOBER-05 | Cards show patine gradient intensity | Visual | Manual | Pixel-level requires screenshot diff |
| SOBER-06 | TableVote renders 5 states correctly | Behavioral | Playwright (existing `shortlist-vote.spec.ts`) | May need new assertions for seat CSS classes |
| SOBER-07 | Marginalia font is Caveat | Visual | Manual iOS PWA check | §15.D gate |
| SOBER-08 | Zero `animate-spin` outside BrandLoader | Grep gate | Automated | `grep -rn "animate-spin\|Spinner\|LoadingSpinner" frontend/` = 0 outside BrandLoader.tsx |

### Sampling Rate
- **Per plan commit:** `grep -rn "animate-spin" frontend/` (for 32-02) + visual browser check
- **Per wave merge:** Playwright suite on iPhone-shape Chromium
- **Phase gate:** Manual side-by-side iPhone visual pass against `docs/design-system.html` locked screens before `/gsd-verify-work`

### Wave 0 Gaps
- Bibliothèque view-switcher spec (tests localStorage persistence + view panel swap) — new test for 32-04
- TableVote seat CSS class assertions — extend `shortlist-vote.spec.ts` in 32-03

---

## Security Domain

Phase 32 has no new auth surfaces, API endpoints, or user input paths. The design port adds no new attack surface. Security analysis is limited to confirming no regressions:

- **V5 Input Validation**: i18n key additions are string literals in fr.json — no user input, no validation needed
- **V8 Data Protection**: localStorage view preference contains no PII (`"grid"|"list"|"patina"`)
- **HttpOnly cookie invariant #8**: unchanged — no auth changes in Phase 32

No new ASVS categories apply. [VERIFIED: phase boundary — CONTEXT.md confirms zero new API endpoints, zero schema changes]

---

## Sources

### Primary (HIGH confidence)
- `docs/design-system.html` §15 (Mise en code) — authoritative token delta, utility CSS, PR order, cleanup checklist — lines 1872-1997 read directly
- `docs/design-system.html` §Accueil, §Bibliothèque, §Recette — locked screen compositions — lines 1471-1870 read directly
- `frontend/app/globals.css` — current token values, `@theme inline` block, `paper-grain` utility — full file read (498 lines)
- `frontend/app/layout.tsx` — current font registration pattern, `<html>` className shape — full file read
- `frontend/components/ui/sonner.tsx` — Sonner `icons` prop already wired, `Loader2Icon animate-spin` at line 28 — full file read
- `frontend/lib/votes.ts` — `computeVoteState` signature and 5-state output — full file read
- `frontend/components/BrandIcon.tsx` — two-path SVG with exact path strings — full file read
- `frontend/components/RecipeThread/PinLabel.tsx` — 12px/600/var(--font-marginalia) confirmed — full file read
- `frontend/components/RecipeCard.tsx` — `paper-grain` on outer `<Link>` confirmed (line 83) — full file read
- `frontend/lib/recipes.ts` — `Recipe` type with `cook_count: number` confirmed — full file read
- `frontend/lib/shortlist.ts` — `ShortlistResponse` with `votes: ShortlistVote[]` and `recipes: Recipe[]` confirmed
- `backend/app/schemas/recipe.py` — `RecipeResponse` confirmed: no `cooking_logs` field
- `backend/app/schemas/cooking_log.py` — field name is `notes` (plural), not `note` — confirmed line 23
- `backend/app/routers/cooking_logs.py` — no `?recipe_id=` filter endpoint exists — confirmed by full router audit
- Spinner grep audit — 15 call-sites across 8 files + sonner confirmed — bash grep run

### Secondary (MEDIUM confidence)
- Next.js font self-hosting behavior (Google Fonts downloaded at build time) — well-documented Next.js behavior; not re-verified via Context7 this session but consistent with project's existing Cormorant/IBM Plex behavior
- `next-intl` v4 interpolation behavior for `{count}` — consistent with standard ICU message format, French grammatical correctness

### Tertiary (LOW confidence — see Assumptions Log)
- `oklch(0.50 0.10 32)` hex approximation `#8B4A35` — OKLCH→hex not computed with a tool in this session
- `size="sm"` BrandLoader stroke-dasharray=220 at 16px visual quality — not prototype-tested

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all library versions verified from package.json; no new deps needed
- Architecture patterns: HIGH — all patterns derived from verified source files; one low-confidence area (per-seat conteste mapping) flagged as open question
- Pitfalls: HIGH — all 8 pitfalls derived from verified code (double-grain from RecipeCard.tsx line 83; field name from schema; font gap from layout.tsx grep)
- Backend wire gap (cooking_logs): HIGH — confirmed by RecipeResponse schema + cooking_logs router audit

**Research date:** 2026-05-18
**Valid until:** 2026-06-18 (stable stack — Next.js 16, Tailwind v4, sonner v2 unlikely to change in 30 days)
