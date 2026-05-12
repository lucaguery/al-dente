---
phase: 260512-gpl
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/app/layout.tsx
  - frontend/app/globals.css
  - frontend/components/RecipeCard.tsx
  - frontend/app/recipes/page.tsx
autonomous: false
requirements:
  - QUICK-260512-GPL-01  # Font swap: Fraunces → Cormorant Garamond globally
  - QUICK-260512-GPL-02  # Recipe library card rebuild: horizontal list-row → 2-col photo-grid (Direction B)

must_haves:
  truths:
    - "Display font (used everywhere `font-display` / `.text-display` / `.text-title` resolves) renders as Cormorant Garamond, not Fraunces."
    - "Invite-code styling (`text-3xl tracking-widest text-primary font-display italic`) on share-code and Settings still reads as a recognizable italic serif."
    - "Recipe library at `/recipes` renders cards as a 2-column photo-on-top grid; each card has a 4:3 photo area with body below."
    - "Each recipe card shows the title in Cormorant Garamond upright (font-display) with line-clamp-2, plus a smaller meta row (cuisine Badge + relative last-cooked or never_cooked fallback)."
    - "Existing data flow preserved: D-05 living-image preference, cooking-log signed-URL fallback, zinc/surface-muted placeholder when no photo, `Link` to `/recipes/${id}`."
    - "Recipe detail, ShortlistCard, RecipeDraftCard, BottomNav, HomeDecide, onboarding screens, Settings, etc. all still render — they pick up the new display font automatically via `--font-display`; none of them break."
  artifacts:
    - path: "frontend/app/layout.tsx"
      provides: "Cormorant_Garamond import from next/font/google bound to --font-display (no axes, weights 400+500, styles normal+italic)"
      contains: "Cormorant_Garamond"
    - path: "frontend/app/globals.css"
      provides: ".text-display and .text-title utilities without font-variation-settings opsz declarations"
      contains: ".text-display"
    - path: "frontend/components/RecipeCard.tsx"
      provides: "Vertical photo-grid card: photo on top (aspect 4/3), body below with font-display title (line-clamp-2) and meta row"
      min_lines: 80
    - path: "frontend/app/recipes/page.tsx"
      provides: "Recipe library grid container holding RecipeCard instances (already grid grid-cols-2 — verify gap matches mockup)"
  key_links:
    - from: "frontend/app/layout.tsx"
      to: "globals.css @theme inline --font-display"
      via: "Cormorant_Garamond variable: '--font-display'"
      pattern: "variable:\\s*['\"]--font-display['\"]"
    - from: "frontend/components/RecipeCard.tsx"
      to: "signed URL endpoints"
      via: "getSignedPhotoUrl / getCookingLogSignedPhotoUrl"
      pattern: "getSignedPhotoUrl|getCookingLogSignedPhotoUrl"
    - from: "frontend/components/RecipeCard.tsx"
      to: "/recipes/[id]"
      via: "Link href"
      pattern: "href=\\{`/recipes/\\$\\{recipe\\.id\\}`\\}"
---

<objective>
Cosmetic UI update with two atomic, related parts:

1. Swap the global display font Fraunces → Cormorant Garamond by replacing the `next/font/google` import in `frontend/app/layout.tsx` and removing the now-invalid `font-variation-settings: "opsz" N` from the `.text-display` / `.text-title` utilities in `frontend/app/globals.css` (Cormorant Garamond is NOT variable; opsz axis does not exist).

2. Rebuild `frontend/components/RecipeCard.tsx` from a horizontal flex list-row (64×64 thumb + flexed text) into a vertical photo-grid card (photo on top at aspect 4/3, body below with Cormorant Garamond title + smaller meta row). Verify `frontend/app/recipes/page.tsx` parent container is the intended 2-col grid (it already uses `grid grid-cols-2 gap-3`; only adjust gap if the mockup feels visibly off).

Purpose: Match the Direction B mockup at `.scratch/ui-proposals.html` — the recipe library should read as a "photo album of dishes" rather than a list of rows, and the global typography should soften from Fraunces' contrast-heavy modern serif to Cormorant Garamond's lighter, more editorial classical serif.

Output: 4 files modified, no schema/API/i18n changes, all existing data flow (D-05 living image, signed URL caching, cooking-log path fallback, realtime list updates) preserved bit-for-bit.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@CLAUDE.md
@frontend/AGENTS.md

@frontend/app/layout.tsx
@frontend/app/globals.css
@frontend/components/RecipeCard.tsx
@frontend/app/recipes/page.tsx
@frontend/lib/recipes.ts

<interfaces>
<!-- Key contracts the executor needs. Embedded so no codebase scavenger hunt. -->

From frontend/lib/recipes.ts:
```typescript
export type Recipe = {
  id: string;
  title: string;
  photo_paths: string[];
  cuisine?: string | null;
  last_cooked_at?: string | null;
  last_cooked_photo_path?: string | null;
  // ...other fields
};

export async function getSignedPhotoUrl(recipeId: string, path: string): Promise<string>;
```

From frontend/lib/cooking.ts:
```typescript
export async function getCookingLogSignedPhotoUrl(logId: string, path: string): Promise<string>;
```

From frontend/lib/datetime.ts:
```typescript
export function formatRelativeFr(iso: string): string;
```

From frontend/app/globals.css (current state, lines 329-349 — the two blocks to edit):
```css
.text-display {
  font-family: var(--font-display), ui-serif, Georgia, serif;
  font-size: clamp(2rem, 6vw, 2.75rem);
  line-height: 1.05;
  letter-spacing: -0.02em;
  font-weight: 500;
  font-style: italic;
  font-variation-settings: "opsz" 96;   /* DROP this line — Cormorant Garamond is not variable */
}
.text-title {
  font-family: var(--font-display), ui-serif, Georgia, serif;
  font-size: 1.5rem;
  line-height: 1.2;
  letter-spacing: -0.015em;
  font-weight: 500;
  font-variation-settings: "opsz" 36;   /* DROP this line */
}
```

From frontend/app/layout.tsx (current state, lines 11-17 — the import to replace):
```typescript
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});
```

From frontend/app/recipes/page.tsx (current state, line 148 — already a grid, no rewrite needed):
```tsx
<div className="px-6 grid grid-cols-2 gap-3 pb-24 md:grid-cols-3 lg:grid-cols-4">
  {recipes.map((r) => <RecipeCard key={r.id} recipe={r} />)}
</div>
```

NOTE: The task brief says "change container from vertical stack to `grid grid-cols-2`" — this is already the case. Only adjust gap value if the mockup visibly demands it.
</interfaces>

<mockup_reference>
@.scratch/ui-proposals.html (open in browser; option 2 = Cormorant Garamond font; direction B = 2-col photo grid). The executor should match the visual feel of direction B card layout: photo dominant, title sits under the photo in classical serif italic-or-upright, meta row understated.
</mockup_reference>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Swap Fraunces → Cormorant Garamond globally (font import + CSS opsz cleanup)</name>
  <files>frontend/app/layout.tsx, frontend/app/globals.css</files>
  <action>
Two small, atomic edits — both required together because dropping the `axes: ["opsz"]` param without also dropping the `font-variation-settings` declarations would silently fail (the rules would be no-ops, but harmless; doing both keeps the CSS honest about what the font actually supports).

**1. `frontend/app/layout.tsx` — replace the Fraunces import.**

Change the named import on line 2 from `Fraunces` to `Cormorant_Garamond` (note: snake-case is the next/font/google convention for two-word families):
```typescript
import { Cormorant_Garamond, IBM_Plex_Sans, Geist_Mono } from "next/font/google";
```

Replace the `fraunces` const block (lines 11-17) with:
```typescript
const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});
```

Key contract points:
- `variable: "--font-display"` is unchanged — every `font-display` Tailwind utility and every `.text-display` / `.text-title` reads this CSS var, so the swap is transparent to all consumers.
- NO `axes` property. Cormorant Garamond is NOT a variable font on Google Fonts; passing `axes: ["opsz"]` would cause `next/font` to throw at build time.
- `weight: ["400", "500"]` mirrors the brief. 400 is the default body display weight; 500 is available if a specific call site reads too thin at large sizes.
- `style: ["normal", "italic"]` is required because `.text-display` uses `font-style: italic` and several components use `className="font-display italic ..."`.

Update the `<html>` className on line 63 to substitute the variable name:
```typescript
<html
  lang="fr"
  className={`${cormorantGaramond.variable} ${ibmPlexSans.variable} ${geistMono.variable} h-full antialiased`}
>
```

Leave `IBM_Plex_Sans`, `Geist_Mono`, `metadata`, `viewport`, and the body / provider tree exactly as they are.

**2. `frontend/app/globals.css` — drop the opsz variation-settings.**

Edit the `.text-display` block (lines 329-337): DELETE the line `font-variation-settings: "opsz" 96;`. Keep every other declaration (font-family, font-size, line-height, letter-spacing, font-weight, font-style: italic).

Edit the `.text-title` block (lines 342-349): DELETE the line `font-variation-settings: "opsz" 36;`. Keep every other declaration.

Update the comment above `.text-display` (line 323-328) so it no longer references "Fraunces italic at opsz=96"; replace with something like:
```
/* Phase 5 §Typography type-scale — Cormorant Garamond italic for the hero
   wordmark and primary display text. Weight 500 (not 700) is the Slow Food
   restraint principle: heavier reads as advertising, not editorial. Italic
   is the cookbook-cover signature. Letter-spacing -0.02em counteracts the
   optical loosening that occurs at large sizes. clamp(32px, 6vw, 44px)
   keeps the headline responsive between iPhone-narrow and desktop reads.
   (Cormorant Garamond is not a variable font — no opsz axis.) */
```

And similarly update the `.text-title` comment (lines 338-341) to reference "Cormorant Garamond upright" and drop the "opsz=36 sweet spot" line. Keep the substance (24px sits at title-sweet-spot for the family, upright for legibility, weight 500 holds restraint pairing).

Leave `.text-body`, `.text-caption`, `.paper-grain`, and the `@theme inline` block at line 10 (`--font-display: var(--font-display);`) untouched.

**Why these two go together:** layout.tsx defines what `--font-display` resolves to; globals.css declares how `.text-display` / `.text-title` consume it. Dropping `axes: ["opsz"]` and keeping `font-variation-settings: "opsz" N` would render correctly (browsers ignore unknown variation axes) but leaves dead code that lies about the font's capabilities. Cleaning both keeps the system honest and makes the next person's grep work.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/frontend && npx tsc --noEmit && npm run lint -- --max-warnings=0 2>&1 | tail -20</automated>
  </verify>
  <done>
- `frontend/app/layout.tsx` imports `Cormorant_Garamond` from `next/font/google`, exposes it on `--font-display`, with `weight: ["400", "500"]` and `style: ["normal", "italic"]`, no `axes` property.
- The `<html>` className substitutes `cormorantGaramond.variable` in place of `fraunces.variable`.
- `frontend/app/globals.css` `.text-display` and `.text-title` blocks no longer contain `font-variation-settings`.
- `tsc --noEmit` passes.
- `npm run lint` passes with zero new warnings.
- (Implicit) `next build --webpack` would succeed; `axes` removal allows the non-variable font to load.
  </done>
</task>

<task type="auto">
  <name>Task 2: Rebuild RecipeCard as vertical photo-grid card (Direction B) and verify library page grid</name>
  <files>frontend/components/RecipeCard.tsx, frontend/app/recipes/page.tsx</files>
  <action>
**1. Rewrite `frontend/components/RecipeCard.tsx` — vertical layout.**

Keep the entire `useEffect` / signed-URL logic (lines 19-67 of the current file) EXACTLY as-is. The D-05 living-image preference, the cooking-log path branch, the `getSignedPhotoUrl` / `getCookingLogSignedPhotoUrl` calls, the `alive` flag, the silent-fallback `.catch()`, and the cleanup function all stay byte-identical. The component still takes `{ recipe }: { recipe: Recipe }`, still uses `useTranslations("recipes")`, still imports the same modules.

Only the JSX return changes. Replace the existing `return (...)` block with the following vertical-card structure:

```tsx
return (
  <Link
    href={`/recipes/${recipe.id}`}
    className="paper-grain flex flex-col bg-card rounded-2xl border border-border shadow-card hover:shadow-card-hover active:translate-y-px transition-all duration-150 overflow-hidden"
  >
    {src ? (
      // eslint-disable-next-line @next/next/no-img-element -- signed URL is short-lived; <Image> with custom loader is overkill
      <img
        src={src}
        alt=""
        className="w-full aspect-[4/3] object-cover"
      />
    ) : (
      <div
        aria-hidden
        className="w-full aspect-[4/3] bg-surface-muted"
      />
    )}
    <div className="flex flex-col gap-1 px-3.5 pt-3 pb-3.5 min-w-0">
      <h3 className="font-display text-lg font-medium leading-tight tracking-tight line-clamp-2">
        {recipe.title}
      </h3>
      <div className="flex items-center gap-1.5 flex-wrap text-xs text-foreground-muted">
        {recipe.cuisine ? (
          <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
            {recipe.cuisine}
          </Badge>
        ) : null}
        {recipe.cuisine ? <span aria-hidden>·</span> : null}
        <span>
          {recipe.last_cooked_at
            ? formatRelativeFr(recipe.last_cooked_at)
            : t("never_cooked")}
        </span>
      </div>
    </div>
  </Link>
);
```

Notes for the executor:
- `overflow-hidden` on the Link wrapper is required so the `rounded-2xl` corners clip the photo's top-left/top-right cleanly (the photo extends edge-to-edge of the card).
- `aspect-[4/3]` uses Tailwind's arbitrary-value syntax — Tailwind v4 supports this natively, no config change needed.
- `font-display` Tailwind utility resolves to `var(--font-display)` via `@theme inline` (already wired in globals.css line 10). After Task 1 ships, this paints in Cormorant Garamond automatically.
- `font-medium` (weight 500) is the safer default for Cormorant Garamond at 18px (`text-lg`) — 400 reads thin in classical serif at card-title sizes. If a visual review later prefers 400, that's a one-line tweak.
- The title is UPRIGHT (no `italic` className). The italic display is reserved for hero/wordmark contexts (`.text-display` global utility, invite-code Settings/share-code, HomeDecide date header). Card titles in a grid read better upright at body-adjacent sizes.
- `line-clamp-2` allows two-line titles common in a narrow 2-col grid (e.g. "Velouté de potimarron rôti aux marrons"); single-line clamp would truncate too aggressively.
- The dot separator (`·`) renders only when there IS a cuisine badge to its left, avoiding a stray leading dot when cuisine is null.
- `text-foreground-muted` and `bg-surface-muted` use the established Slow Food tokens — do NOT use raw zinc-100 / gray-* utilities (invariant: design tokens, not Tailwind literals).
- The cooking-log path branch and signed-URL effect MUST remain bit-identical to the current file — these are load-bearing for D-05 and T-04-01-02 (path-on-recipe validation).

Imports stay the same — `Link`, `useEffect`, `useState`, `useTranslations`, `Badge`, `formatRelativeFr`, `getSignedPhotoUrl`, `getCookingLogSignedPhotoUrl`, `type { Recipe }`. The "use client" directive stays at the top.

The UI-SPEC §6 comment block at the top of the file should be updated to reflect the new layout. Replace the existing comment with something like:
```
// Recipe library card — Direction B (quick-260512-gpl).
// Vertical photo-grid card: 4:3 photo on top + body below with Cormorant
// Garamond title (font-display, upright, line-clamp-2) and a meta row
// (cuisine Badge · relative last-cooked).
//
// The photo path is fetched as a 5-minute signed URL on mount; if the
// recipe has no photos OR the request fails, we render a surface-muted
// placeholder sized to the same 4:3 aspect-ratio container.
//
// D-05 living image: the photo path prefers the most recent cooking-log
// photo over the canonical recipe photo, so the library list reflects
// "your own food". The cooking-log path needs a different signed-URL
// endpoint (path-on-recipe validation T-04-01-02 rejects it on the
// recipe endpoint); we detect it by the `cooking-logs/` prefix and
// extract the log_id from the path layout
// `cooking-logs/{household_id}/{log_id}/{uuid}.{ext}` (segs[2] = log_id).
```

**2. `frontend/app/recipes/page.tsx` — verify the grid container.**

Open the file and look at line 148. The current container is already:
```tsx
<div className="px-6 grid grid-cols-2 gap-3 pb-24 md:grid-cols-3 lg:grid-cols-4">
```

This already matches the brief ("`grid grid-cols-2 gap-3`"). Two options:

- (a) Leave it as-is. The 2-col base + responsive scale to 3/4 cols on tablet/desktop is correct for this PWA; the gap of 3 (0.75rem / 12px) is the brief's primary value.
- (b) If, after Task 1 ships and you eyeball the result against the mockup, the gap feels visibly off, change `gap-3` to `gap-3.5` (14px). This is the only optional tweak in scope. Do NOT change any other class on this line, do NOT remove the responsive `md:` / `lg:` breakpoints, do NOT touch `handleSearch`, `useEffect` realtime subscribers, `EmptyState`, `SearchInput`, or anything else in the file.

The brief explicitly states "Search/empty-state/realtime wiring unchanged" — that's already true for the current file; no changes needed there.

If you pick (b), commit it as a one-liner change to that single class. Otherwise, page.tsx has no edits.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/frontend && npx tsc --noEmit && npm run lint -- --max-warnings=0 2>&1 | tail -20</automated>
  </verify>
  <done>
- `frontend/components/RecipeCard.tsx`: top-level `<Link>` is `flex flex-col` (vertical), has `rounded-2xl overflow-hidden`, and contains a 4:3 photo area on top + body block below.
- The body block has an `<h3>` with `font-display text-lg font-medium ... line-clamp-2` rendering `recipe.title`.
- The meta row contains the cuisine Badge (when present) + a dot separator + relative-last-cooked / never_cooked fallback, all in `text-xs text-foreground-muted`.
- The `useEffect` block (signed-URL fetch, cooking-log path branch, `alive` cleanup, silent catch) is byte-identical to the previous version.
- Imports unchanged; "use client" present; `useTranslations("recipes")` present; `formatRelativeFr` and `t("never_cooked")` still called.
- `frontend/app/recipes/page.tsx` line 148 container is `grid grid-cols-2` (gap-3 or gap-3.5 acceptable); realtime subscribers, search, empty state untouched.
- `tsc --noEmit` passes.
- `npm run lint` passes with zero new warnings.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Visual verification on dev server</name>
  <what-built>
- Display font swapped Fraunces → Cormorant Garamond globally (touches every `.text-display`, `.text-title`, and `font-display` consumer: invite code styling on share-code + Settings, HomeDecide date header, recipe detail title strip, recipe history section headers, instruction step numbers, etc.).
- RecipeCard rebuilt as a 2-col photo-grid card (4:3 photo on top, body below with classical-serif title + meta row).
- Recipe library page (`/recipes`) renders the new cards in the existing 2-col grid.
  </what-built>
  <how-to-verify>
1. Start the frontend dev server: `cd /Users/gulu3001/dev/al-dente/frontend && npm run dev`.
2. Open the mockup reference for side-by-side comparison: open `.scratch/ui-proposals.html` in a second browser tab — option 2 (Cormorant Garamond) + direction B (2-col grid) is the target.
3. Visit `http://localhost:3000/recipes`. Expected:
   - Cards laid out 2 columns on phone-width viewports.
   - Each card has a photo on top (or muted placeholder if no photo) at 4:3 aspect, body below with title in Cormorant Garamond upright, smaller meta row beneath.
   - Title can wrap to 2 lines on long titles; longer titles are clipped at line 2 with ellipsis.
   - `paper-grain` texture still visible on each card.
   - Realtime list updates still arrive when partner-side mutations occur (use the seeded household if possible).
4. Visit `http://localhost:3000/onboarding/share-code` (or trigger from a non-onboarded session). Expected: the invite code displays in `text-3xl tracking-widest text-primary font-display italic` — should now render in Cormorant Garamond italic. The character forms should be recognizably classical-serif (longer ascenders/descenders, lighter strokes than Fraunces). Verify the code is still legible at the larger letter-spacing — Cormorant Garamond italic is narrower than Fraunces italic, so tracking-widest should still feel "spaced out" but the glyphs themselves will be lighter.
5. Visit `http://localhost:3000/settings`. Expected: the foyer-section invite code uses the same Fraunces-italic→Cormorant-italic substitution.
6. Visit `http://localhost:3000/` (HomeDecide). Expected: the Fraunces-italic date header now reads as Cormorant Garamond italic. The display weight is 500 — should not read as "too thin."
7. Visit `http://localhost:3000/recipes/{any-id}` (any recipe detail). Expected: the title strip and any italic display elements (cookbook chapter-opener, numbered instruction steps) all rendered in Cormorant Garamond. NO code in `app/recipes/[id]/page.tsx` changed — it picks up the new font automatically.
8. (Optional) Visit `http://localhost:3000/cooking-logs`. The date-grouped Fraunces-italic section headers should now be Cormorant Garamond italic.
9. Browser devtools → Network tab → reload `/recipes`. Confirm a Cormorant Garamond font file loads (look for `cormorant-garamond` in the woff2 filename). Confirm no Fraunces font file loads.
10. Browser devtools → Elements → inspect a `.text-display` element. Confirm computed style: `font-family: 'Cormorant Garamond', ...` and NO `font-variation-settings` rule shows in computed styles.

If any of the following appear, REJECT and describe:
- Titles render in a system serif (Georgia / ui-serif) — means `--font-display` is not resolving, font import is broken.
- Title weight at the `text-display` or hero level looks too thin/spindly — may need to bump display weight to 500 (already done) or 600 (would need a re-spin).
- Recipe cards still horizontal — RecipeCard didn't pick up the rewrite (cache? hard reload).
- Cards have visible horizontal scroll bars — `overflow-hidden` missing or aspect-ratio class not applying (Tailwind v4 arbitrary value `aspect-[4/3]` should work; if not, try `aspect-ratio: 4/3` inline style as fallback).
- Build error in console mentioning `axes` or `opsz` — Task 1 layout.tsx not fully clean.
  </how-to-verify>
  <resume-signal>Type "approved" to confirm visual match against the mockup. If issues, describe (e.g. "title weight too thin", "gap looks wrong", "invite code unreadable") so a follow-up edit can tune.</resume-signal>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` exits 0 (TypeScript strict passes).
- `npm run lint -- --max-warnings=0` exits 0 (ESLint flat config passes).
- Dev server boots without console errors related to `next/font/google`.
- `/recipes` renders 2-col grid of photo cards.
- Display font visibly changes from Fraunces (modern, high-contrast, geometric) to Cormorant Garamond (classical, lighter, narrower) on every surface using `font-display` / `.text-display` / `.text-title`.
- No deploy: this is a UX iteration during v0.4 follow-up; do NOT push to main without explicit user direction (per project memory: no manual deploys, and the user reviews visually first).
</verification>

<success_criteria>
- Both files in Task 1 edited correctly; both files in Task 2 edited correctly (or page.tsx left alone if gap-3 is fine).
- All 4 must-have truths observably true.
- Visual checkpoint (Task 3) returns "approved" from operator.
- Zero changes to ShortlistCard, RecipeDraftCard, recipe detail page, BottomNav, or any other component file. Zero schema/API/i18n changes.
- All architecture invariants preserved (no token literals introduced; cards still use design tokens; no `state` columns added; no `localStorage` usage; no broken cookie auth; no scope creep into other surfaces).
</success_criteria>

<output>
After completion, create `.planning/quick/260512-gpl-ui-cormorant-garamond-font-swap-directio/260512-gpl-SUMMARY.md` documenting:
- Final font weight chosen for display (400 vs 500) and any letter-spacing tweaks made beyond the brief.
- Whether `gap-3` stayed or was bumped to `gap-3.5`.
- Any visual issues surfaced in checkpoint and how they were resolved.
- Screenshot path(s) if captured.
- Files modified (should be exactly: layout.tsx, globals.css, RecipeCard.tsx, optionally recipes/page.tsx).
</output>
