---
phase: 8
slug: cook-polish
status: draft
shadcn_initialized: true
preset: radix-nova (inherited; baseColor neutral, iconLibrary lucide, cssVariables true, registries {})
created: 2026-05-08
inherits_from: 05-UI-SPEC.md, 06-UI-SPEC.md, 07-UI-SPEC.md
---

# Phase 8 — UI Design Contract

> Polish phase. **Inherits** the entire Phase 5 token system (typography pairing, paper-grain anchor, warm shadow stack, motion language, re-themed shadcn primitives), the Phase 6 application patterns (paper-grain Card + Fraunces italic body + terracotta-60 left border for callouts; AnimatePresence cadence; h-12 tap-target floor), and the Phase 7 application patterns (paper-grain ShortlistCard frame + `rounded-t-2xl` photo treatment + `springSnap` named transition + `chipClass` 5-state pill helper + paper-grain delegation Card with `border-l-[3px] border-primary/60`). This UI-SPEC does NOT re-litigate any of those decisions — it specifies how the cook-time loop surfaces (recipe detail, recipe library, cooking-log history, CookingBanner, RatingPicker, CookingLogFinalize) consume those tokens, and closes the four W4 UI-REVIEW gaps that live on these surfaces (COOK-07 Finaliser raw `<a>` → `<Button asChild>` + `h-12`; COOK-08 RatingPicker `transition-transform duration-100`; COOK-11 `navigator.onLine` guard + new `cooking_log.finalize.offline` key; COOK-12 ICU subhead via new `cooking_log.finalize.recipe_subhead` key).
>
> **Audience reminder:** Two iPhones, "just us" couple, French only via next-intl. Mobile-first at 390pt iPhone 14 baseline, **iOS Safari 17+ PWA standalone is the rendering target** (especially load-bearing here for the recipe-detail hero `backdrop-blur-sm` overlay strip). The four design principles (Design Quality, Originality, Craft, Functionality) carry forward unchanged.
>
> **Prescriptive, not exploratory.** A competent executor implements Phase 8 from this contract without further design questions. CONTEXT.md decisions are LOCKED — restated here in executable form.

---

## Canonical References

| Reference | Why it matters here |
|-----------|---------------------|
| `.planning/phases/05-design-system-foundation/05-UI-SPEC.md` | **Source of truth for all visual tokens.** Phase 8 inherits §Spacing, §Typography, §Color, §Shadows, §Paper-Grain, §Motion, §Component Inventory verbatim. Any apparent conflict between this document and 05-UI-SPEC resolves in favor of 05-UI-SPEC. |
| `.planning/phases/06-capture-surfaces-polish/06-UI-SPEC.md` | **Pattern source.** Paper-grain Card + Fraunces italic body + terracotta-60 left border (D-Voice callout pattern) is reused for CookingBanner. AnimatePresence cadence + reduced-motion-via-CSS-clamp inherited. The empty-state `EmptyState` component (paper-grain + display-serif headline + h-12 CTA) is reused on recipe library and cooking-log history when applicable. |
| `.planning/phases/07-decide-polish/07-UI-SPEC.md` | **Pattern source.** Paper-grain ShortlistCard frame + `rounded-t-2xl` photo treatment is mirrored for the recipe library `RecipeCard` retheme (so the daily-shortlist card and the library card read as siblings). The `chipClass` 5-state pill helper is the reference for any rating-chip presentation in the cooking-log history (judgment call — see §Surface 6). The Fraunces italic display-serif date header (`text-display`) on `HomeDecide` is mirrored as a section header pattern in the cooking-log history. |
| `.planning/phases/04-polish-w4/04-UI-REVIEW.md` | W4 baseline 20/24. **COOK-07** (CookingBanner `Finaliser` raw `<a>` + both buttons `h-9` → `h-12` via `<Button asChild>`), **COOK-08** (RatingPicker `transition-transform duration-100`), **COOK-11** (`cooking_log.finalize.offline` key + `navigator.onLine` guard), **COOK-12** (`cooking_log.finalize.recipe_subhead` ICU key) are the four W4 gaps closed in this phase. |
| `.planning/phases/08-cook-polish/08-CONTEXT.md` | LOCKED user decisions: full-bleed hero with `bg-card/85 backdrop-blur-sm paper-grain` overlay strip; `border-l-2 border-primary/30` ingredient cookbook gesture; `font-display italic text-primary/80` step-number prefix; `grid grid-cols-2 gap-3 px-6` library grid (390pt baseline); RecipeCard reuses ShortlistCard Phase 7 frame; SearchInput paper-grain Card + terracotta-30 focus ring; CookingBanner paper-grain Card + Button asChild Finaliser at h-12; RatingPicker `transition-transform duration-100 ease-craft active:scale-95` press feedback; CookingLogFinalize navigator.onLine guard + ICU subhead. |
| `.planning/notes/v0.2-design-direction.md` | Slow Food artisanal direction; anti-patterns committed (no purple gradients, no cool grays, no trattoria, no twee handmade overload). |
| `.planning/REQUIREMENTS.md` (COOK-06..12) | The 7 acceptance items this phase must close. Mapped 1:1 to §Acceptance Criteria below. |
| `frontend/AGENTS.md` | **Next.js 16.2.4 has training-data drift.** Consult `frontend/node_modules/next/dist/docs/` before writing frontend code. |
| `frontend/lib/i18n/fr.json` | French only via next-intl. **TWO new keys** added by Phase 8 — `cooking_log.finalize.offline` (value: `"Hors ligne. Réessaie une fois connecté."`) and `cooking_log.finalize.recipe_subhead` (ICU value: `"« {title} »"`). These are explicit deliverables (COOK-11, COOK-12). All other strings reuse existing keys. |
| `frontend/lib/motion.ts` | Phase 8 imports `transitions.fast` (150ms / ease-craft) where AnimatePresence exits or color transitions are added. **No new presets authored.** The `easeCraft` cubic-bezier is consumed via the Tailwind utility `ease-craft` (Phase 5 §Motion). |

---

## Design System (inherited from Phase 5 — restated)

| Property | Value | Source |
|----------|-------|--------|
| Tool | **shadcn/ui** | `frontend/components.json` |
| Preset | **radix-nova** with `baseColor: neutral`, `cssVariables: true`, `iconLibrary: lucide`, `registries: {}` | unchanged from Phase 1 |
| Component library | shadcn/ui primitives (Radix UI under the hood); 15 primitives in `components/ui/*` already re-themed in Phase 5 | inherited |
| Icon library | **lucide-react** | inherited (Phase 8 uses `ChevronLeft`, `Mic`, `Pencil`, `Trash2`, `FileQuestion`, `BookOpen`, `Search`, `Plus`, `ChefHat`, `Sparkles`, `Heart`, `ThumbsUp`, `Meh`, `Inbox` — all already imported in current code) |
| Font (display) | **Fraunces** (variable, opsz + wght + ital axes) — `var(--font-display)` | Phase 5 §Typography |
| Font (body) | **IBM Plex Sans** (300/400/500/600 + italic 400) — `var(--font-body)` | Phase 5 §Typography |
| Font (mono) | **Geist Mono** — `var(--font-mono)` | inherited (no consumers in Phase 8 surfaces) |
| CSS architecture | Tailwind v4 `@theme inline` block in `app/globals.css` | inherited |
| i18n | All strings via `next-intl` from `frontend/lib/i18n/fr.json` | **TWO new keys in Phase 8** (offline + recipe_subhead) |
| Animation library | framer-motion 12.x via `frontend/lib/motion.ts` presets | inherited; Phase 8 adds zero new presets |
| Texture asset | `frontend/public/textures/paper-grain.svg` | inherited |
| Tap target floor | **48px** (D-08, raised from 44px in W4) | Phase 4 D-08 + Phase 5 §Spacing |

---

## Spacing Scale

**Inherited from Phase 5 §Spacing unchanged.** Strict 4-multiple subset.

| Token | Value | Usage in Phase 8 |
|-------|-------|------------------|
| xs | 4px | Inline icon gaps inside step-number prefix rows; per-step `py-1` rule |
| sm | 8px | Ingredient line `gap-2`; inline-meta gaps; rating-card icon gap |
| md | 16px | RecipeCard padding `p-3`; ingredient-list left padding (`pl-4` after the `border-l-2`); RatingPicker card padding `px-4`; CookingBanner padding `px-4 py-3` |
| lg | 24px | Recipe-detail section gap `gap-6` between hero / metadata / ingredients / instructions / footer; library `px-6` page padding; cooking-log history `px-6` page padding |
| xl | 32px | Cooking-log history vertical breathing above the first dated section header (`pt-8` on the page wrapper after the sticky header) |
| 2xl | 48px | **Tap target floor** (D-08); `h-12` on every interactive button surface in scope: CookingBanner Finaliser + Passer, CookingLogFinalize submit, recipe-detail header buttons (back / mic / edit / delete), recipe-library `Plus` add CTA, search clear button |
| 3xl | 64px | Recipe-detail bottom-fixed page padding `pb-24` (preserved from existing); library `pb-24` |

### Phase 8 spacing exceptions

| Exception | Value | Reason |
|---|---|---|
| Recipe-detail hero overlay strip vertical padding | `py-4` (16px) | The strip carries the title only; tighter padding lets the cookbook chapter-opener gesture read as a deliberate band, not a fat slab. The strip's intrinsic height is title-line-height + `py-4`; horizontal `px-6` matches page padding. |
| Recipe-detail hero photo aspect ratio | `aspect-[4/3]` | Inherited convention — food-photography proportions. |
| Recipe-detail hero photo `rounded-b-2xl` | 16px corner radius (bottom only) | The hero curves under at the bottom so the metadata pills row sits flush against a soft edge — same idiom as Phase 7 ShortlistCard `rounded-t-2xl` photo, mirrored for the bottom edge here. |
| RecipeCard photo region | `rounded-t-xl` (12px corners, top only) | Mirrors Phase 7 ShortlistCard photo treatment: photo top corners curve to match the `rounded-xl` card frame; bottom edge meets the body region flush. **Note:** the card frame uses `rounded-xl` (not `rounded-2xl` like ShortlistCard) — RecipeCard is a smaller list-row card; the smaller radius is correct. The photo's top radius MUST match the card's outer radius. |
| Library grid gap | `gap-3` (12px) | Two-column mobile-first; 12px is the tightest gap that still reads as separated cards (vs. seamless tiles). Mirrors the Phase 6 PhotoUploader 2×2 photo grid `gap-3`. |
| Step-number prefix shrink-0 column | `shrink-0` (auto width) | The Fraunces-italic number prefix sits in its own flex column so step-body wrap does not pull the number down. |
| Cooking-log history dated section header | `pt-6 pb-2` (24/8) | Section breathing above; tight bottom padding so the first card sits close to the date label (which IS the section's anchor). |
| Library SearchInput height | `h-12` (48px) | Raised from existing `h-10` to clear the D-08 floor. The Search-clear button raised from `h-8 w-8` to `h-12 w-12`. |
| Recipe-detail header icon buttons (back, mic, edit, delete) | `h-12 w-12` (48px square) | Raised from the shadcn `size="icon"` default `size-8` (32px). Each header button is interactive chrome; D-08's 48px floor applies. |

**No other exceptions.** Every other touch target — CookingBanner Finaliser + Passer, CookingLogFinalize submit, library `Plus` add CTA, RatingPicker rating cards (`h-20` already exceeds the floor), recipe-detail edit/delete/voice-modify icons — meets or exceeds 48px.

### Tap-target audit (post-Phase-8 invariants)

| Surface element | Pre-Phase-8 | Post-Phase-8 (LOCKED) |
|---|---|---|
| **CookingBanner `Finaliser` link** | raw `<a>` `h-12` (already raised in 04-04 quick fix) | **`<Button asChild className="h-12 w-full sm:w-auto"><Link>...</Link></Button>`** — closes the COOK-07 raw-anchor pattern issue (W4 finding) regardless of the height already being 48px |
| **CookingBanner `Passer` ghost** | `Button variant="ghost" size="sm" h-12 px-3` | `Button variant="ghost" className="h-12"` (preserved height; remove `size="sm"` so the size-default `h-10` does not shadow the explicit `h-12`) |
| **CookingLogFinalize submit** | `h-12` ✓ (already correct) | unchanged |
| **RatingPicker rating cards** | `h-20` (80px) ✓ | unchanged height; press-feedback transition added (COOK-08) |
| **Recipe-detail header back button** | shadcn `size="icon"` (`size-8` = 32px) ⚠️ | **`size="icon" className="h-12 w-12"`** — raises to 48px square |
| **Recipe-detail header mic button** (VoiceModifySheet trigger) | `size="icon"` (`size-8`) ⚠️ | **`size="icon" className="h-12 w-12"`** |
| **Recipe-detail header edit button** | `size="icon"` (`size-8`) ⚠️ | **`size="icon" className="h-12 w-12"`** |
| **Recipe-detail header delete button** | `size="icon"` (`size-8`) ⚠️ | **`size="icon" className="h-12 w-12"`** |
| **Library header `Plus` add button** | `size="icon"` (`size-8`) ⚠️ | **`size="icon" className="h-12 w-12"`** |
| **Library SearchInput field** | `h-10` (40px) ⚠️ | **`h-12`** (48px) |
| **Library SearchInput clear button** | `h-8 w-8` ⚠️ | **`h-12 w-12`** |
| **Recipe-detail 404-empty back button** | `size="icon"` (`size-8`) ⚠️ | **`size="icon" className="h-12 w-12"`** |
| **Recipe-detail loading-skeleton header back button** | `size="icon"` (`size-8`) ⚠️ | **`size="icon" className="h-12 w-12"`** |

The 9 upward changes (header icon buttons across all detail-page states + library Plus + SearchInput field + SearchInput clear button) are non-negotiable. They were missed by Phase 4 because the detail page and library page were not in Phase 4 scope; they are in Phase 8 scope, and the D-08 floor applies to every interactive control on a Phase 8 surface.

---

## Typography (inherited)

**Inherited from Phase 5 §Typography unchanged.** Fraunces + IBM Plex Sans pairing locked. All four utility classes (`text-display`, `text-title`, `text-body`, `text-caption`) carry forward.

### Phase 8 role assignments (cook surfaces)

| Element | Class / family | Reason |
|---|---|---|
| **Recipe-detail hero title** (overlay strip on photo, or fallback no-photo Card) | `text-display` (Fraunces italic, weight 500, opsz=96, clamp 32–44px) | **Editorial cookbook chapter opener.** The title sits inside the `bg-card/85 backdrop-blur-sm paper-grain` strip — italic Fraunces is the cookbook signature; clamp() handles iPhone-narrow → desktop-wide cleanly. |
| Recipe-detail metadata pill row labels (cuisine / mood / protein Badge children) | Badge default (IBM Plex Sans, weight 500) | Inherited from Phase 5 Badge primitive — UI chrome, sans is correct. |
| Recipe-detail metadata inline meta (`{prep_time}min · {servings} pers.`) | `text-sm text-foreground-muted` (IBM Plex Sans 400) | Helper-row idiom; preserved from existing code. |
| **Recipe-detail `Ingrédients` section heading** | `text-title` (Fraunces upright, 24px, weight 500, opsz=36) | **Replaces existing `text-xl font-semibold`.** Editorial register matches the cookbook chapter idiom; mirrors Phase 7 VoteSummary heading upgrade (Phase 5 type-scale convergence). |
| **Recipe-detail `Préparation` section heading** | `text-title` (Fraunces upright, 24px, weight 500, opsz=36) | Same justification as Ingrédients heading. (Existing key: `recipes.section_steps` "Étapes" — the spec text says `Préparation`; UI-SPEC retains the existing key + copy "Étapes" to avoid a third new i18n key. **No new key for the section heading.** Visual register upgrade only.) |
| **Recipe-detail ingredient line** | `text-base leading-relaxed` (IBM Plex Sans 400, 16/1.625) | **Procedural readability.** Sans is the correct register for running text; serif would compete with the editorial title. `leading-relaxed` (1.625) is wider than `text-body` (1.55) — the cookbook-cookbook gesture wants air between ingredient lines so the eye can scan vertically. |
| **Recipe-detail step body** | `text-base leading-relaxed` (IBM Plex Sans 400, 16/1.625) | Same justification — IBM Plex Sans for procedural readability, NOT Fraunces (which is reserved for editorial / display register). |
| **Recipe-detail step-number prefix** | `font-display italic text-primary/80 text-base shrink-0` (Fraunces italic, weight 500, terracotta at 80%) | **Establishes the editorial gesture without overwhelming legibility.** Only the number prefix gets Fraunces italic; the body stays sans. The `text-primary/80` terracotta tint reads as cookbook-margin numbering, not as a CTA. The `shrink-0` prevents the number column from being squeezed by long step bodies. |
| Recipe-detail footer (last-cooked / cook-count) | `text-sm text-foreground-muted` (IBM Plex Sans 400) | Existing helper-row idiom; preserved. |
| Recipe-detail loading-skeleton placeholders | `bg-surface-muted animate-pulse` (no type) | Existing pattern; preserved. |
| **Recipe-library page heading** (sticky header `Recettes`) | `text-xl font-semibold` (IBM Plex Sans 600) | **Chrome, not editorial.** The library list page is a list, not a cookbook surface; sticky-header heading stays in the IBM Plex Sans inbox idiom (mirrors Phase 6 inbox `À compléter`). Existing class preserved unchanged. |
| **RecipeCard title** (in library grid) | `text-base font-semibold leading-6 line-clamp-1` (IBM Plex Sans 600) | List-row idiom; preserved from existing code. (Editorial Fraunces is reserved for the recipe-detail page heading; the library card is a chrome list row.) |
| RecipeCard meta row (cuisine Badge + last-cooked relative date) | Badge default + `text-sm text-foreground-muted` | Existing pattern; preserved. |
| Library SearchInput placeholder | inherited Input primitive (IBM Plex Sans 400) | UI chrome; sans. |
| **Cooking-log history page heading** (sticky `Mangé cette semaine` or equivalent) | `text-xl font-semibold` (IBM Plex Sans 600) | Chrome, not editorial. Same idiom as the library header. |
| **Cooking-log history dated section header** ("vendredi 8 mai" or relative-week label) | `font-display italic text-base text-foreground` (Fraunces italic 500 at 16px) | **Mirrors Phase 7 HomeDecide date-header pattern** scaled down: section anchor uses Fraunces italic at body size (not display) so each date label registers as a bookmark inside the list rather than a full chapter opener. The list is dense; full `text-display` here would overwhelm the cards. |
| **Cooking-log history card title** (recipe name) | `text-title` (Fraunces upright, 24px, weight 500, opsz=36) | **Editorial moment per CONTEXT.md.** The cooking-log history is the "what we ate" register — the recipe titles deserve the cookbook-page gesture. |
| Cooking-log history card cooked-on date | `text-sm text-foreground-muted` (IBM Plex Sans 400) | Helper row. |
| Cooking-log history card rating chips (when rendered) | `text-sm font-medium` (IBM Plex Sans 500) | Pill idiom — borrows the Phase 7 chipClass register. |
| **CookingBanner title** (`En train de cuisiner`) | `text-base font-semibold leading-6` (IBM Plex Sans 600) | Banner chrome — preserves the existing visual idiom. The banner is informational chrome, not editorial. |
| CookingBanner recipe title (subtitle line) | `text-sm text-foreground-muted leading-5 line-clamp-1` | Existing pattern; preserved. |
| **CookingLogFinalize page title** (`Finaliser la cuisson`) | `text-title` (Fraunces upright, 24px, weight 500, opsz=36) | Existing implementation already uses `text-title`. Preserved. |
| **CookingLogFinalize recipe subhead** (`« {title} »` rendered via new `cooking_log.finalize.recipe_subhead` ICU key) | `text-base text-foreground-muted line-clamp-1` (IBM Plex Sans 400) | Existing visual idiom preserved; the change is i18n-key routing only (COOK-12 closure). |
| CookingLogFinalize section headings (`Photos`, `Comment c'était ?`, `Notes`) | `text-base font-semibold leading-6` (IBM Plex Sans 600) | Existing pattern; preserved. (Section-heading idiom is sans 600 per Phase 4 / 5 conventions.) |
| RatingPicker label (`Adoré` / `Bien` / `Passable`) | `text-base font-semibold leading-6` (IBM Plex Sans 600) | Existing pattern; preserved. |
| RatingPicker helper (`On la refait sans hésiter` etc.) | `text-xs text-foreground-muted leading-4` (IBM Plex Sans 400) | Existing pattern; preserved. |

**Type scale used in Phase 8:** 5 distinct sizes: `text-display` (32–44), `text-title` (24), `text-base` (16), `text-sm` (14), `text-xs` (12). The `text-xs` is reserved for the RatingPicker helper line and inline meta rows — already in use since Phase 4 / 7. **No new sizes added by Phase 8.**

**Weights used in Phase 8:** 400 (running text in ingredient lines, step bodies, helpers, captions), 500 (display + title + step-number prefix italic + chip-pill labels + Badge), 600 (CTA labels, section headings, list-row titles). Inherited from Phase 5.

---

## Color (inherited)

**Inherited from Phase 5 §Color unchanged.** Terracotta primary on warm cream. All OKLCH values verbatim. The `--color-valide-tint` (h≈145 emerald wash) is preserved unchanged from Phase 3 / Phase 5 / Phase 7.

### Phase 8 60/30/10 application on cook surfaces

| Slot | % | Where it appears in Phase 8 |
|---|---|---|
| Dominant (60%) | `--background` (cream) | Page background under recipe detail / library / cooking-log history; sticky-header bg at 80% alpha (`bg-background/80 backdrop-blur-sm`). |
| Secondary (30%) | `--card`, `--secondary`, `--muted`, `--popover`, `--surface-muted` (warm cream / warm taupe family) | Recipe-detail hero overlay strip (`bg-card/85 backdrop-blur-sm paper-grain`); recipe-detail no-photo fallback Card; RecipeCard frame (`bg-card`); RecipeCard photo-empty placeholder (`bg-surface-muted`); library SearchInput Card wrapper; cooking-log history card frame; CookingLogCard photo-empty placeholder; CookingBanner frame (paper-grain Card with `bg-primary/8` subtle terracotta tint); CookingLogFinalize section card surfaces (when present); RatingPicker `disliked` selected card (`bg-surface-muted border-foreground-muted`); RatingPicker unselected cards (`bg-card border-border`). |
| Accent (10%) | `--primary` (terracotta `oklch(0.595 0.135 35)`) and faint wash `--surface-rose-100` | **Reserved-for list below — no other usage.** |

### Accent reserved-for in Phase 8 (LOCKED)

The terracotta accent appears in Phase 8 ONLY on:

1. **Primary CTAs** — every `Button variant="default"` with terracotta surface:
   - **CookingBanner `Finaliser`** — `<Button asChild className="h-12">` wrapping `<Link href="/cooking-logs/{id}/finalize">` (COOK-07 closure)
   - **CookingLogFinalize submit** — `Finaliser` (existing terracotta CTA, h-12 already correct)
   - Recipe-detail no-photo fallback "Add photo" CTA (when scope allows; **NOT in Phase 8** — productize-later note on the detail page already exists)
2. **Focus rings** — `--ring` (keyboard focus visibility) on every interactive button (CookingBanner Finaliser + Passer, header back/mic/edit/delete buttons, library Plus + SearchInput field + clear, RecipeCard tap surface, RatingPicker cards, CookingLogFinalize submit, recipe-detail VoiceModifySheet trigger).
3. **Recipe-detail ingredient list left border** — `border-l-2 border-primary/30` (terracotta at 30% alpha). The cookbook-margin gesture: a faint terracotta margin line marks the ingredient list as a column block. The 30% alpha is restraint principle in operation — a stronger saturation would compete with the destination CTAs elsewhere on the page; 30% reads as cookbook printers' guideline-rule.
4. **Recipe-detail step-number prefix color** — `text-primary/80` (terracotta at 80% alpha). The italic Fraunces step number reads as cookbook editorial numbering; full saturation would over-claim hierarchy, 80% reads as deliberate.
5. **CookingBanner background tint** — `bg-primary/8` (terracotta at 8% alpha) on the paper-grain Card frame. **Subtle wash, NOT the full terracotta saturation reserved for primary CTAs.** The CookingBanner is informational chrome that says "you're in the middle of cooking" — the 8% wash is the "warm-active" register without competing with the Finaliser CTA inside it.
6. **RatingPicker `loved` selected state** — `bg-surface-rose-100 border-2 border-primary text-primary` (preserved from existing code; faint terracotta wash at full saturation border + foreground). This is the **only** place where full terracotta border + foreground co-exist with a tinted surface — the reserved-for clause from Phase 4. Preserved.
7. **Library SearchInput focus ring** — `focus:ring-2 focus:ring-primary/30` (terracotta at 30% alpha) on the Input field's focus state. Inherited from Phase 5 Input primitive `--ring`; the SearchInput retheme makes this explicit on the search field's wrapper.
8. **Recipe-detail VoiceModifySheet trigger Mic icon** — `text-foreground` default (NOT terracotta) — the mic icon stays neutral; only the keyboard focus ring on the button is terracotta. Verified: terracotta on the icon would compete with the title-strip and the ingredient margin-line.

**Anti-patterns explicit for Phase 8:**

| Anti-pattern | Why excluded |
|---|---|
| Terracotta on RecipeCard frame border or background | RecipeCard is a list-row; terracotta is reserved for destination CTAs and the cookbook gestures (ingredient margin, step number). The card stays `bg-card border-border`. |
| Terracotta on cooking-log history card frame | Same justification — list rows stay neutral. |
| Terracotta on CookingBanner skip button | Ghost variant; terracotta reserved for destination CTAs. The Passer button stays neutral (`variant="ghost"` resolves to `hover:bg-muted` warm taupe). |
| Terracotta on cooking-log dated section header | Section headers use Fraunces italic at body size — typographic gesture, no color accent. Adding terracotta would over-claim hierarchy. |
| Paper-grain on RecipeCard photo region | Photo bytes ARE the surface; grain on top of food photography is dust, not paper. Mirrors Phase 7 ShortlistCard photo treatment. |
| Cool grays anywhere | Phase 5 anti-pattern; warm-gray family only. |
| Purple gradients on white cards | Phase 5 anti-pattern. |
| Hardcoded hex colors in any Phase 8 file | DESIGN-08 invariant — every color reads from a token. Audit grep: `grep -rn "rgb\|#[0-9a-f]\{3,8\}" frontend/components/CookingBanner.tsx frontend/components/RatingPicker.tsx frontend/components/CookingLogFinalize.tsx frontend/components/RecipeCard.tsx frontend/components/SearchInput.tsx frontend/app/recipes/page.tsx frontend/app/recipes/\[id\]/page.tsx` must return zero results. |

### Destructive — reserved for in Phase 8

`--destructive` only on:
- Recipe-detail header **delete-recipe icon button** hover state (`hover:text-destructive`) — preserved from existing code.
- Toast `variant="destructive"` for actual error conditions (`save_failed`, `delete_failed` if it occurs, `detail_404_body` when surfaced as a toast on delete failure).

**No `Button variant="destructive"` in Phase 8.** The recipe-deletion confirmation continues to use `window.confirm(t("delete_confirm"))` (browser-native; productize-later target).

---

## Shadows (inherited)

**Inherited from Phase 5 §Shadows unchanged.** Two-layer warm-brown paper-on-wood shadows. Token names (`shadow-card`, `shadow-card-hover`, `shadow-nav`) work as before.

### Phase 8 shadow application

| Surface | Shadow class |
|---|---|
| Recipe-detail hero photo | None (`object-cover`; full-bleed image, no card chrome around it). |
| Recipe-detail hero overlay strip (`bg-card/85 backdrop-blur-sm paper-grain`) | None (the strip sits ON the photo; shadow on a strip-on-photo would create a double-edge artifact). |
| Recipe-detail no-photo fallback Card | `shadow-card` (paper-on-wood lift; the fallback is an actual Card surface). |
| Recipe-detail metadata pill row | None (chrome, not card). |
| Recipe-detail ingredient list / instruction list | None (text on page bg with the terracotta margin-line + paper-grain via the page bg-not). The lists do NOT sit on a Card — they sit on the page background; the page bg stays grain-free per Phase 5 anti-pattern. |
| **RecipeCard frame** | `shadow-card` (existing `shadow-card hover:shadow-card-hover` retained — the active hover is preserved Phase-3 idiom). |
| **Library SearchInput** | None on the Input primitive itself; the SearchInput's outer wrapper Card (when wrapped per CONTEXT.md) gets `shadow-card`. **Implementation choice (Claude's Discretion):** the existing SearchInput is just an Input + spinner + clear button inside a `relative` div — it does NOT currently have a Card wrapper. CONTEXT.md says "paper-grain Card surface" — the Phase 8 implementation **applies `paper-grain` to the SearchInput's outer `relative` div** (not introducing a new Card wrapper). The paper-grain utility renders correctly on a `relative` div with rounded corners; no Card import required. **No `shadow-card` on the SearchInput** — the Input field's existing border is sufficient. |
| **Cooking-log history card frame** | `shadow-card`. |
| **CookingBanner paper-grain Card frame** | `shadow-card` (paper-on-wood lift; the banner IS a card per CONTEXT.md retheme). Replaces the existing flat `bg-valide-tint border border-border` with `paper-grain bg-primary/8 border border-border shadow-card`. |
| RatingPicker rating cards | `shadow-card` (existing — preserved). |
| CookingLogFinalize section containers | None on the section wrappers themselves (existing `<section>` elements have no Card chrome; the contained components — PhotoUploader, RatingPicker, Textarea — handle their own surfaces). |
| Sticky headers (recipe detail, library, cooking-log history) | `border-b border-border` only — no shadow (chrome, not card). |
| Bottom-fixed submit (CookingLogFinalize) | None — the Button itself carries the visual primary; chrome around it stays minimal. |

---

## Paper-Grain Texture (inherited application contract)

**Inherited from Phase 5 §Paper-Grain.** The `.paper-grain` utility class is wired in Phase 5 on `Card`, `DialogContent`, `SheetContent`, `AlertDialogContent`, `SelectContent`. Phase 6 extended usage to draft cards, D-Voice callout, EmptyState, Plus-tile, quick-add photo-picker wrapper. Phase 7 extended usage to ShortlistCard frame, ColdStartChip frame, Tu-décides delegation Card. Phase 8 **extends usage** to the recipe-detail hero overlay strip, the no-photo fallback Card, RecipeCard frame, SearchInput wrapper, cooking-log history cards, and the CookingBanner frame.

### Phase 8 paper-grain placement

| Element | Apply `paper-grain`? |
|---|---|
| **Recipe-detail hero overlay strip** (`bg-card/85 backdrop-blur-sm`) | **Yes** — the strip IS a card surface (it carries the title, sits as a translucent card-on-photo). The grain reads as paper-fiber texture peeking through the cookbook chapter band. **Implementation note:** because the strip's background is `bg-card/85` (semi-transparent), the grain at 6% multiply on cream interacts with the underlying photo through the alpha — verify on iOS Safari that the grain remains perceptible without becoming muddy. If the grain reads as muddy in real-device test, drop opacity to 4% via inline `style={{ '--paper-grain-opacity': '0.04' }}` on the strip and add an opacity escape utility — but **the default IS `paper-grain` at 6%**, only adjust if visually warranted. (Document any deviation in SUMMARY.md.) |
| **Recipe-detail no-photo fallback Card** | **Yes** — visible card surface; the cookbook chapter idiom holds even when the photo is absent. |
| Recipe-detail hero photo region | **No** — photo bytes ARE the surface. Phase 5 / Phase 7 anti-pattern (grain on photo = dust). |
| Recipe-detail ingredient list / instruction list | **No** — these lists sit on the page background (cream); the page bg stays grain-free per Phase 5 anti-pattern. The cookbook gesture lives in the `border-l-2 border-primary/30` margin-line on the ingredient `<ul>`, not in texture. |
| **Recipe-detail loading-skeleton header** | **No** — chrome (sticky header). |
| **RecipeCard frame** | **Yes** — recipe cards on a kitchen counter; mirrors Phase 7 ShortlistCard frame pattern. The grain reinforces the metaphor on the library list surface. |
| RecipeCard photo region (`h-16 w-16` thumbnail or `aspect-[4/3]` if grid layout uses larger photos — see Surface 5 hint) | **No** — photo bytes are the surface. The photo region's `rounded-t-xl overflow-hidden` masks the grain at the photo/body seam. |
| **Library SearchInput outer wrapper** (`relative` div containing Search icon + Input + clear button) | **Yes** — the search field reads as a small paper card with embedded chrome; grain reinforces the "writing on paper" gesture. The Input primitive itself stays grain-free (Phase 5 anti-pattern: inputs are chrome); grain lives on the wrapper div whose bounding box matches the search row. |
| Library `Plus` add CTA | **No** — buttons stay grain-free (Phase 5 anti-pattern). |
| Library empty-state Card (when `recipes.length === 0` after a query) | **Yes** — already inherited from Phase 6 EmptyState retheme. |
| **Cooking-log history card frame** | **Yes** — list-row card surface; same justification as RecipeCard. |
| Cooking-log history dated section header | **No** — typographic anchor on page bg, not a card. Phase 5 anti-pattern on full-page bg. |
| **CookingBanner paper-grain Card frame** | **Yes** — the banner IS a card per CONTEXT.md retheme (replaces v0.1's flat `bg-valide-tint` slab with `paper-grain bg-primary/8 shadow-card`). |
| CookingBanner Finaliser + Passer buttons | **No** — buttons stay grain-free. |
| **CookingLogFinalize page** outer container | **No** — page bg stays grain-free. The section-internal components (PhotoUploader's tiles, RatingPicker's cards, Textarea) inherit their own paper-grain treatment from existing primitive re-themes. |
| **CookingLogFinalize loading-skeleton placeholders** | **No** — chrome (skeleton blocks; pulse animation). |
| RatingPicker rating cards | **Yes** (inherited from Phase 5 — recipe-row card pattern). The `shadow-card` + Phase 5 Card primitive paper-grain inheritance applies. **Implementation note:** the existing RatingPicker uses raw `<button>` elements (not the Card primitive), so the inherited grain does NOT apply automatically. **Phase 8 adds `paper-grain` to each RatingPicker `<button>` className** to bring the cards into the system. |

### Phase 8 paper-grain anti-patterns

| Anti-pattern | Why excluded |
|---|---|
| Paper-grain on the recipe-detail hero photo | Phase 5 / Phase 7 anti-pattern (grain on photo = dust). |
| Paper-grain on the ingredient/instruction lists' page bg | Phase 5 anti-pattern (full-page bg stays grain-free). The cookbook gesture lives in the margin-line + step-number prefix, not in texture. |
| Paper-grain on RecipeCard photo region | Same as ShortlistCard — photo bytes are the surface. |
| Paper-grain on CookingLogFinalize page bg | Page bg stays grain-free; section-internal components carry their own surfaces. |
| Paper-grain on the library `Plus` button or SearchInput field | Phase 5 anti-pattern on chrome. The SearchInput wrapper div is a card-like surface; the Input field inside is chrome. |

### Recipe-detail hero overlay strip — exact contract

The hero treatment per CONTEXT.md is the load-bearing visual decision of this phase. **Exact JSX (executor implements this verbatim, modulo image-source binding):**

```tsx
{photoUrls.length > 0 ? (
  <div className="relative">
    {/* Photo: full-bleed, 4:3, rounded only at the bottom so the strip seam is clean */}
    <img
      src={photoUrls[0]}
      alt=""
      className="aspect-[4/3] w-full rounded-b-2xl object-cover"
    />
    {/* Cookbook chapter-opener strip: paper-grain Card semi-transparent over the photo */}
    <div
      className="absolute inset-x-0 bottom-0 bg-card/85 backdrop-blur-sm paper-grain px-6 py-4 rounded-b-2xl"
    >
      <h1 className="text-display text-foreground">{recipe.title}</h1>
    </div>
  </div>
) : (
  /* No-photo fallback: paper-grain Card with the title styled the same way (no hero photo placeholder div) */
  <Card className="paper-grain shadow-card mx-6 my-4 px-6 py-6">
    <h1 className="text-display text-foreground">{recipe.title}</h1>
  </Card>
)}
```

**Discretionary call (CONTEXT.md):** `backdrop-blur-sm` is the locked starting point. iOS Safari 17+ has been gentle on backdrop-blur in PWA standalone since iOS 17.0; `sm` (4px blur) is sufficient to separate the title from the photo without producing the muddy frosted-glass look that `md` (8px) or `lg` (12px) can. **The default IS `backdrop-blur-sm`.** If a real-device test reveals title legibility issues against busy food photography, the executor may upgrade to `backdrop-blur` (8px) — document any deviation in SUMMARY.md.

**Multi-photo discretionary call:** the existing detail page renders ALL photos in a horizontal snap-carousel below the metadata. **Phase 8 keeps the carousel at the SAME location (after the metadata pills), but the hero ABOVE the title strip uses `photoUrls[0]` only.** The first photo carries the title overlay; the carousel underneath surfaces the rest. This is a structural addition, not a removal — preserve the existing `photoUrls.map(...)` carousel block AFTER the title strip and metadata pills. Visual hierarchy: hero (photo + title strip) → metadata pills → photo carousel → ingredients → instructions → footer.

**Metadata pills location (Claude's Discretion):** placed **BELOW the title overlay strip** per CONTEXT.md default. The pills row uses the existing `flex flex-wrap gap-2 px-6` layout; no Card wrapper. Pills sit on the page bg as chrome, not as editorial.

---

## Motion (inherited)

**Inherited from Phase 5 §Motion unchanged.** One curve (`--ease-craft`), two durations (`--duration-fast` 150ms, `--duration-normal` 280ms). Framer Motion presets in `frontend/lib/motion.ts` (`variants`, `transitions`, `easeCraft`, `durations`, `springSnap`).

### Phase 8 motion contract

| Surface / interaction | Animation |
|---|---|
| **RatingPicker press feedback** (COOK-08 W4 closure) | **Add `transition-transform duration-100 ease-craft active:scale-95`** to each rating card's className. **Replaces the instant snap with a 100ms paper-physics press.** Per CONTEXT.md: "100ms reads more 'press' than 'transition' — closer cousin to the `--duration-fast` 150ms motion vocabulary, but sharper for haptic feel." `active:scale-95` lands a subtle 5% press depression; `ease-craft` gives the curve a deliberate-craftsman feel rather than mechanical linear ease. **Do NOT use `transition-all` (which would also catch the `transition-colors` already declared and merge into a conflicting timing).** Existing `transition-colors duration-150 active:scale-[0.98]` is replaced wholesale with the new class string per §Component Inventory below. |
| Recipe-detail page enter | No animation (existing behavior — React conditional render based on fetch state; loading skeleton → loaded). The `prefers-reduced-motion` CSS clamp covers any inherited transitions. |
| Recipe-detail photo carousel scroll | Native `scroll-snap-type: x mandatory` (existing CSS via `snap-x snap-mandatory`); no JS animation. |
| RecipeCard tap feedback (existing) | `active:translate-y-px transition-all duration-150` (existing — preserved from v0.1). The `transition-all` here is acceptable because the only animated property is the y-translate; the inherited Tailwind v4 token `duration-150` resolves to `--duration-fast`. **No change in Phase 8.** |
| **Library SearchInput debounce spinner** | Existing `Loader2 animate-spin` (chrome animation; preserved). |
| Library realtime arrival of new recipe (`recipe.created`) | **No new animation.** Preserved Phase 6 inbox idiom is reserved for the `/inbox` surface. The library list silently prepends per existing `dedupeReplace` — no AnimatePresence wrap. (Unlike inbox, the library is not a primary realtime surface; the partner-side capture lands on the inbox first; the library is a low-frequency reader.) |
| **CookingBanner appear / disappear** | No new animation. Existing conditional render preserved. (The banner does not need an entrance animation — it's a persistent surface, not an event arrival.) |
| **CookingLogFinalize** | No new animation on the page level. Section transitions are React conditional renders (loading skeleton → ready). The submit button's spinner state (`Enregistrement…` with `Loader2 animate-spin`) is the existing pattern; no change. |
| **Cooking-log history dated section dividers** | No animation (informational layout; lists do not need entrance animation per Phase 5 / 6 cadence discipline). |
| Reduced-motion | `@media (prefers-reduced-motion: reduce)` in `globals.css:378-385` clamps all CSS animations + transitions to 0ms globally. **No per-component `useReducedMotion()` calls in Phase 8.** The RatingPicker `transition-transform duration-100` collapses to 0ms when the OS-level reduce-motion is on; the `active:scale-95` then becomes an instant pixel-perfect snap (acceptable — reduced-motion users opt out of timing entirely). |

### Animation cadence discipline

Phase 8 introduces only ONE motion change:
1. RatingPicker `transition-transform duration-100 ease-craft active:scale-95` — closes COOK-08 W4 gap.

**No stacked effects.** No simultaneous slide + scale + spring. No staggered children. The cadence is "one motion at a time, deliberate, paper-physical." Subtle over decorative is the rule — Phase 8 is the simplest motion footprint of any v0.2 phase.

---

## Component Inventory (deltas from Phase 5/6/7)

Phase 8 introduces **zero new shadcn primitives**. The 15 primitives in `components/ui/*` are already re-themed (Phase 5). Phase 8 modifies application-level components only.

### Application components touched in Phase 8

| File | Change shape |
|------|--------------|
| **`frontend/lib/i18n/fr.json`** | **Add 2 new keys** under the existing `cooking_log.finalize` block: `"offline": "Hors ligne. Réessaie une fois connecté."` (replaces existing key value `"Hors ligne. Reconnecte-toi et réessaie."` — the locked W4 closure copy is the one in CONTEXT.md / objective) and `"recipe_subhead": "« {title} »"` (NEW). **Both keys are explicit deliverables** (COOK-11, COOK-12). No other key changes in Phase 8. |
| **`frontend/components/CookingBanner.tsx`** (73 LOC) | **Full retheme + COOK-07 closure.** (1) Replace the outer container className from `"mx-6 mt-4 flex items-center gap-3 px-4 py-3 min-h-16 rounded-2xl bg-valide-tint border border-border"` with `"mx-6 mt-4 flex items-center gap-3 px-4 py-3 min-h-16 rounded-2xl bg-primary/8 paper-grain shadow-card border border-border"`. **Replaces `bg-valide-tint` with `bg-primary/8 paper-grain shadow-card`** — the cooking-active register is "warm-active terracotta wash" (8% subtle) on a paper-grain card surface, NOT the emerald validation tint. (2) **Convert the `Finaliser` raw `<a>` to `<Button asChild>`.** Replace lines 54-60 (the `<Link href={...} className="inline-flex items-center justify-center h-12 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium gap-1">...<Sparkles />...{t("finalize")}...</Link>`) with `<Button asChild className="h-12"><Link href={\`/cooking-logs/${logId}/finalize\`}><Sparkles size={16} aria-hidden />{t("finalize")}</Link></Button>`. The Button primitive already provides `bg-primary text-primary-foreground`, `rounded-lg`, `inline-flex items-center justify-center`, and `gap-1.5` from the size-default — the wrapping `<Button asChild>` propagates those to the inner `<Link>` via Radix Slot. **This closes the W4 raw-anchor pattern issue** regardless of the height already being correct. (3) **Replace the `Passer` Button** at lines 61-69: change `<Button type="button" variant="ghost" size="sm" className="h-12 px-3" onClick={onSkip}>` to `<Button type="button" variant="ghost" className="h-12" onClick={onSkip}>` (remove `size="sm"` so the size-default does not shadow the explicit `h-12`; remove `px-3` so the size-default `px-2.5` carries through with the explicit height). (4) **ChefHat icon color**: keep at the inherited `text-emerald-700 dark:text-emerald-300` (preserved Phase 3 visual signal — the cooking is in flight, the chef icon is the role-call). The 8% terracotta wash on the surface does not conflict because the icon is explicit emerald — the page reads as "cooking in flight (terracotta active wash) → press Finaliser to validate." |
| **`frontend/components/RatingPicker.tsx`** (92 LOC) | **COOK-08 closure + retheme alignment.** (1) **Replace the press transition class string** at line 68: change `"transition-all duration-150 active:scale-[0.98]"` to `"transition-transform duration-100 ease-craft active:scale-95"`. **This closes the W4 missing transition-transform issue.** Note the change from `active:scale-[0.98]` to `active:scale-95` — the latter is a Tailwind canonical utility (cleaner) at the same depression depth (5% scale-down vs the 2% original); CONTEXT.md specifies `active:scale-95` explicitly, so we adopt it. The `transition-colors duration-150` previously implicit in `transition-all` is preserved separately by the existing class — see step (2). (2) **Add `transition-colors duration-fast ease-craft`** to the className string so color transitions on selection state continue to animate (replaces the `transition-all duration-150` that previously carried both color and transform). The full new combined class string at line 68 reads: `"transition-colors transition-transform duration-100 ease-craft active:scale-95"`. (3) **Add `paper-grain`** to the className string at line 67 — brings the rating cards into the paper-grain card system (cards on a kitchen counter). The existing `shadow-card` is preserved. (4) **Selected-state color treatment** per CONTEXT.md: keep the existing `selectedClass` mapping — `loved` already uses `bg-surface-rose-100 border-2 border-primary text-primary` (full terracotta saturation, the Phase 4 reserved-for usage); `liked` uses `bg-valide-tint border-2 border-emerald-500 text-emerald-700` (emerald validation); `disliked` uses `bg-surface-muted border-2 border-foreground-muted text-foreground` (warm-taupe muted). **No color changes in Phase 8.** The retheme is texture (paper-grain) + motion (transition-transform 100ms) only. |
| **`frontend/components/CookingLogFinalize.tsx`** (209 LOC) | **COOK-11 + COOK-12 + general retheme.** (1) **COOK-11 — re-anchor the offline guard:** the existing code at lines 83-86 already has `if (!navigator.onLine) { toast.error(t("offline")); return; }` — preserve this code structure but rely on the updated `cooking_log.finalize.offline` key value (CONTEXT.md / objective LOCKED copy: `"Hors ligne. Réessaie une fois connecté."`). The submit handler is structurally correct; only the i18n value changes. **No code change in CookingLogFinalize.tsx for COOK-11; the change is in fr.json.** (2) **COOK-12 — replace the hardcoded template literal** at line 142: change `« {state.recipe.title} »` to `{t("recipe_subhead", { title: state.recipe.title })}`. Restores next-intl ICU conformance. The new `cooking_log.finalize.recipe_subhead` key carries the `« {title} »` ICU pattern with the French guillemets and hard spaces. (3) **General retheme:** the existing structure already consumes Phase 5 tokens correctly (`text-title` on h1, `text-base text-foreground-muted` on subhead, `text-base font-semibold leading-6` on section headings, `bg-surface-muted` on skeleton placeholders, `min-h-32` on Textarea, `h-12` on submit button). **No structural changes.** Verify the section heading classes resolve to IBM Plex Sans 600 (inherited from `body { font-family: var(--font-body) }`); no per-element family declaration needed. |
| **`frontend/components/RecipeCard.tsx`** (104 LOC) | **COOK-09 retheme — align with Phase 7 ShortlistCard frame.** (1) **Replace the outer `<Link>` className** at line 72: change `"flex gap-4 p-3 bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover active:translate-y-px transition-all duration-150"` to `"paper-grain flex gap-4 p-3 bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover active:translate-y-px transition-all duration-150"`. **Adds `paper-grain`** to the card frame; everything else preserved. (2) **Photo region** at lines 76-86: the existing thumbnail uses `h-16 w-16 rounded-lg object-cover` for both the loaded image and the placeholder div. The Phase 8 retheme **preserves the 16×16 thumbnail size** (the card layout is `flex gap-4 p-3` — a horizontal row, not a vertical photo-on-top card). **CONTEXT.md** says "identical RecipeCard shape as ShortlistCard's Phase 7 frame (paper-grain + warm shadow + rounded-xl + rounded-t-2xl photo)" — this guidance is **conditional on a vertical photo-on-top layout that the existing 2-col library grid does not provide**. The library grid renders RecipeCard rows in a 2-col mobile grid (`grid grid-cols-2 gap-3 px-6` — see Surface 5). **Resolution:** keep the existing horizontal `flex gap-4` layout (row card with side thumbnail), apply `paper-grain` to the frame, keep the photo at `h-16 w-16 rounded-lg`. The "rounded-t-2xl photo" guidance is mirrored in spirit (the photo's corners curve to match a card frame) but the card frame here is `rounded-xl` and the photo is `rounded-lg` — both preserved from existing. **The photo does NOT need a `rounded-t-` treatment because the photo is a side thumbnail, not a top hero.** Document the layout-driven deviation in SUMMARY.md if needed. (3) Card title typography preserved (`text-base font-semibold leading-6 tracking-tight line-clamp-1`). Meta row preserved (`Badge variant="secondary"` for cuisine + `text-sm text-foreground-muted` for relative-last-cooked). Living-image fetch logic preserved byte-for-byte. |
| **`frontend/components/SearchInput.tsx`** (~110 LOC) | **COOK-09 retheme — paper-grain wrapper + h-12 floor.** (1) **Wrapper className**: change line 77 from `<div className="relative">` to `<div className="relative paper-grain rounded-xl">`. Adds `paper-grain` to the search-row outer wrapper; `rounded-xl` so the grain `::before` pseudo-element clips correctly via `border-radius: inherit`. (2) **Input className** at line 86: change `"pl-10 pr-10 h-10"` to `"pl-10 pr-10 h-12 focus:ring-2 focus:ring-primary/30"`. Raises the field height to 48px (D-08 floor) and adds a terracotta-30% focus ring as the explicit search-focus accent (Phase 5 ring-token via `--ring` is already terracotta — the explicit `focus:ring-primary/30` is the visible-when-typed state). (3) **Clear button className** at lines 97-104: change `"h-8 w-8"` to `"h-12 w-12"`. Raises the clear button to 48px square (D-08 floor). (4) **Loader2 spinner** preserved; existing positioning (`absolute right-2 top-1/2 -translate-y-1/2`) works at the new field height. (5) **Search icon** preserved (`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted`); centering via `top-1/2 -translate-y-1/2` works at any field height. |
| **`frontend/app/recipes/page.tsx`** (152 LOC) | **COOK-09 retheme + library grid + h-12 floor on header Plus.** (1) **Header `Plus` button** at lines 115-122: add `className="h-12 w-12"` to the existing `<Button size="icon" variant="ghost" aria-label={t("add_cta_aria")}>`. Raises to 48px square (D-08 floor). (2) **Sticky-header backdrop** (line 113) preserved unchanged (`sticky top-0 h-12 px-6 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border z-20`). (3) **Library grid** at line 129: change `"px-6 flex flex-col gap-3 pb-24"` to `"px-6 grid grid-cols-2 gap-3 pb-24 md:grid-cols-3 lg:grid-cols-4"`. Mobile baseline (390pt) gets 2 columns; ≥768px gets 3; ≥1024px gets 4. **PWA primary target is mobile**, so the 2-col arrangement is the load-bearing layout. (4) **Empty state** branches at lines 130-144: preserved unchanged — `EmptyState` component (Phase 6 retheme) carries the paper-grain Card + `text-title` heading + h-12 CTA; the empty-state JSX is unchanged. **Note:** when no results, the `EmptyState` component renders inside the grid; it should NOT be split across columns. **Add `col-span-full` to the EmptyState wrapper** when used inside the grid, OR move the empty-state branch outside the grid container and only render the grid when results exist. **Recommended approach (executor implements):** keep the conditional render inside the grid container by wrapping the `EmptyState` in `<div className="col-span-full">...</div>` so it spans full width on grid layouts. Alternative: render the grid only when `recipes.length > 0` and render `EmptyState` outside the grid as a sibling — equally valid; pick the lower-churn diff. (5) **Realtime listeners** preserved byte-for-byte (lines 80-108). (6) **Module-level cache** preserved unchanged. |
| **`frontend/app/recipes/[id]/page.tsx`** (318 LOC) | **COOK-06 retheme — full-bleed hero + cookbook gestures + h-12 header floor.** (1) **Hero replacement at lines 226-243**: replace the entire `{photoUrls.length > 0 ? <horizontal carousel> : <h-44 placeholder>}` block with the new "full-bleed hero with overlay strip" pattern (see §Paper-Grain "Recipe-detail hero overlay strip — exact contract" above). The horizontal carousel block is **preserved** but moves to a position AFTER the metadata pills (see step 5). The "no photo" fallback (line 240-242) is replaced with the paper-grain Card variant (per CONTEXT.md: "fall back to a paper-grain Card with the title styled the same way"). (2) **Title h1 placement**: the title currently lives at line 246 (`<h1 className="text-[28px] font-semibold tracking-tight leading-tight">{recipe.title}</h1>`). **Move the h1 INTO the hero overlay strip** as `<h1 className="text-display text-foreground">{recipe.title}</h1>`. **Remove the standalone h1 at line 246.** The title now appears once, inside the strip. (3) **Metadata pills row** at lines 251-266: preserved as-is (`flex flex-wrap gap-2 px-6` containing cuisine + mood + protein Badges + inline meta-span). **Add `mt-6`** to the row's container so it spaces below the hero. The metadata sits BELOW the hero per CONTEXT.md "metadata pill row sits above or below the title overlay strip — try below (default)." (4) **Photo carousel relocation** (preserved logic, new position): if `photoUrls.length > 1`, render the existing `<div className="flex overflow-x-auto snap-x snap-mandatory gap-3 px-6 py-4">{photoUrls.map(...)}</div>` block AFTER the metadata pills. **Skip the carousel if `photoUrls.length === 1`** (the hero already shows it). The carousel renders `photoUrls.slice(1)` (photos 2..N) when multi-photo. **Implementation simplification:** keep the carousel rendering ALL photos (no slice) — the first photo IS visible above as the hero, but the carousel reaffirms it; this preserves the existing scroll-snap UX without bespoke array slicing. **Recommended:** render `photoUrls.slice(1)` to avoid duplication; if executor finds the slice introduces a corner case (single-photo case → empty carousel), fall back to rendering all photos in the carousel and document in SUMMARY.md. (5) **Section heading typography**: change line 270 (`<h2 className="text-xl font-semibold">{t("section_ingredients")}</h2>`) to `<h2 className="text-title">{t("section_ingredients")}</h2>` (Fraunces 24px). Same for line 291 (`<h2 className="text-xl font-semibold">{t("section_steps")}</h2>` → `<h2 className="text-title">{t("section_steps")}</h2>`). **No new i18n keys** — existing keys `recipes.section_ingredients` ("Ingrédients") and `recipes.section_steps` ("Étapes") are reused. (6) **Ingredient list cookbook gesture**: change line 273 (`<ul className="flex flex-col gap-2">`) to `<ul className="border-l-2 border-primary/30 pl-4 flex flex-col gap-2 py-1">`. Adds the terracotta-30 left margin-line + `pl-4` to clear the line. The line-rule on the left is decorative; does NOT change semantic structure. (7) **Ingredient line typography**: change line 279 (`<li key={i} className="text-base">`) to `<li key={i} className="text-base leading-relaxed">`. Adds `leading-relaxed` for cookbook scanning rhythm. (8) **Step list structure**: replace the existing `<ol className="list-decimal list-inside flex flex-col gap-3 text-base">{recipe.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>` (lines 292-296) with the explicit-prefix Fraunces-italic structure: `<ol className="flex flex-col gap-3 py-1">{recipe.steps.map((s, i) => <li key={i} className="flex gap-3"><span className="font-display italic text-primary/80 text-base shrink-0">{i + 1}.</span><span className="text-base leading-relaxed">{s}</span></li>)}</ol>`. **Removes `list-decimal list-inside`** (replaced by the explicit-prefix span pattern); steps now have a Fraunces-italic terracotta-80 number prefix in its own flex column. (9) **Header buttons** at lines 187-223: add `className="h-12 w-12"` to each of the 4 `<Button size="icon" variant="ghost">` instances (back, mic, edit, delete). Raises to 48px square (D-08 floor). The hover-destructive on the delete button is preserved (`text-foreground-muted hover:text-destructive`). (10) **Loading-skeleton header** at lines 152-162: same h-12 treatment on the back button. (11) **404-empty header** at lines 127-136: same h-12 treatment on the back button. |
| **NEW: `frontend/app/cooking-logs/page.tsx`** (or chosen route — see §Surface 6) | **COOK-10 — cooking-log history view.** A new client-component route at `/cooking-logs` (or `/recipes/cooking-logs` — judgment call by executor based on nav placement; recommended route: `/cooking-logs` mirroring the existing `/cooking-logs/[id]/finalize` namespace). Renders a list of dated `CookingLogCard` rows grouped by relative-week date dividers. **Implementation choice (Claude's Discretion per CONTEXT.md):** create a new `frontend/components/CookingLogCard.tsx` (rather than adding a `mode="cooking-log"` prop variant to `RecipeCard`). Reason: RecipeCard's living-image fetch logic + `Recipe` prop shape diverges materially from a cooking-log row's needs (cooking-log shape: `{id, recipe_id, recipe_title, finalized_at, photo_paths, rating, notes}`; needs the cooking-log signed-URL helper, NOT the recipe signed-URL helper). Forking is cleaner. **Estimated LOC: ~80 for `CookingLogCard.tsx` + ~100 for the `cooking-logs/page.tsx` route.** See §Surface 6 for layout pinning. |

### Vote-chip / rating-chip extraction — Phase 8 reuse decision (Claude's Discretion)

CONTEXT.md notes: "Each card: paper-grain Card + recipe title (Fraunces text-title) + cooked-on date (IBM Plex text-sm text-muted-foreground) + rating chips (use the same chipClass helper from Phase 7 if appropriate, else inline)."

**Recommended: inline a small `ratingChipClass(rating: LogRating)` helper** at the call site in `CookingLogCard.tsx`. Reason: only one consumer in v0.2 (the cooking-log history card); the Phase 7 `chipClass(state: VoteState)` helper takes a `VoteState`, not a `LogRating` — they are different enums (vote states are 5-state; ratings are 3-state: `loved` / `liked` / `disliked`). The Phase 7 helper is NOT directly reusable. **Inline a fresh helper** with rating-appropriate color washes:

| Rating | Class string |
|---|---|
| `loved` | `bg-surface-rose-100 text-primary border border-primary/40` (faint terracotta wash) |
| `liked` | `bg-[var(--color-valide-tint)] text-foreground border border-emerald-500/30` (emerald wash, mirrors Validé) |
| `disliked` | `bg-muted text-muted-foreground border border-border` (warm-taupe muted) |

Pill shape contract: `inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium h-8` — same shape as Phase 7 vote chips (consistency across cooking surfaces). **No new i18n keys** — the rating labels reuse existing `cooking_log.rating.loved` / `cooking_log.rating.liked` / `cooking_log.rating.disliked` keys.

If a second consumer emerges (e.g. recipe-detail surfacing recent ratings), refactor to a shared `<RatingChip rating={...} />` component at that point — low cost.

---

## Surface-by-Surface Pinning

The exact visual contract per surface. Executors implement these top-down.

### Surface 1 — Recipe detail (`/recipes/[id]`)

**Location:** `frontend/app/recipes/[id]/page.tsx`

**Layout (top-down) — REVISED for Phase 8:**

```
<OnboardingGuard>
  <section className="flex flex-col flex-1 bg-background">
    {/* 1. Sticky header (h-12) — terracotta focus rings via inherited Button primitive */}
    <header className="sticky top-0 h-12 px-6 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border z-10">
      <Button size="icon" variant="ghost" className="h-12 w-12" onClick={router.back} aria-label={t("back_aria")}>
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" className="h-12 w-12" onClick={() => setVoiceModifyOpen(true)} aria-label={tVoiceModify("trigger_aria")}>
          <Mic className="h-5 w-5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-12 w-12" onClick={() => router.push(`/recipes/${recipe.id}/edit`)} aria-label={t("edit_aria")}>
          <Pencil className="h-5 w-5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-12 w-12 text-foreground-muted hover:text-destructive" onClick={handleDelete} disabled={deleting} aria-label={t("delete_aria")}>
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>
    </header>

    {/* 2. Hero — full-bleed photo + paper-grain title overlay strip (or no-photo fallback Card) */}
    {photoUrls.length > 0 ? (
      <div className="relative">
        <img src={photoUrls[0]} alt="" className="aspect-[4/3] w-full rounded-b-2xl object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-card/85 backdrop-blur-sm paper-grain px-6 py-4 rounded-b-2xl">
          <h1 className="text-display text-foreground">{recipe.title}</h1>
        </div>
      </div>
    ) : (
      <Card className="paper-grain shadow-card mx-6 my-4 px-6 py-6">
        <h1 className="text-display text-foreground">{recipe.title}</h1>
      </Card>
    )}

    {/* 3. Body */}
    <div className="px-6 flex flex-col gap-6 pb-24 mt-6">
      {/* 3.1 Metadata pill row */}
      <div className="flex flex-wrap gap-2 items-center">
        {recipe.cuisine && <Badge variant="secondary">{recipe.cuisine}</Badge>}
        {recipe.mood.map(m => <Badge key={m} variant="secondary">{m}</Badge>)}
        {recipe.main_protein && <Badge variant="secondary">{recipe.main_protein}</Badge>}
        {metaSpan && <span className="text-sm text-foreground-muted">{metaSpan}</span>}
      </div>

      {/* 3.2 Multi-photo carousel (only when photoUrls.length > 1) */}
      {photoUrls.length > 1 && (
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 -mx-6 px-6 py-4 scrollbar-none">
          {photoUrls.slice(1).map((url, i) => (
            <img key={i} src={url} alt="" className="h-64 w-64 rounded-lg object-cover snap-start flex-shrink-0" />
          ))}
        </div>
      )}

      {/* 3.3 Ingredients section — terracotta margin line cookbook gesture */}
      {recipe.ingredients?.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-title">{t("section_ingredients")}</h2>
          <ul className="border-l-2 border-primary/30 pl-4 flex flex-col gap-2 py-1">
            {recipe.ingredients.map((ing, i) => {
              const lead = `${ing.quantity ?? ""}${ing.unit ? ` ${ing.unit}` : ""}`.trim();
              return <li key={i} className="text-base leading-relaxed">{lead ? `${lead} ` : ""}{ing.name}</li>;
            })}
          </ul>
        </div>
      )}

      {/* 3.4 Steps section — Fraunces italic terracotta-80 number prefix */}
      {recipe.steps?.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-title">{t("section_steps")}</h2>
          <ol className="flex flex-col gap-3 py-1">
            {recipe.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-display italic text-primary/80 text-base shrink-0">{i + 1}.</span>
                <span className="text-base leading-relaxed">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 3.5 Footer */}
      <p className="text-sm text-foreground-muted">
        {t("footer_last_cooked", { when: recipe.last_cooked_at ? formatRelativeFr(recipe.last_cooked_at) : t("never_cooked") })} ·{" "}
        {t("footer_cook_count", { count: recipe.cook_count })}
      </p>
    </div>
  </section>

  <VoiceModifySheet recipeId={recipe.id} open={voiceModifyOpen} onOpenChange={setVoiceModifyOpen} />
</OnboardingGuard>
```

**Phase 8 changes:**
- Hero: replace existing carousel-on-top with full-bleed first-photo + `bg-card/85 backdrop-blur-sm paper-grain` title overlay strip; no-photo fallback uses paper-grain Card.
- Title: moved INTO the overlay strip; uses `text-display`. The standalone h1 outside the strip is removed.
- Metadata pills: preserved layout, moved to AFTER the hero (was already after the hero in existing code; ordering preserved).
- Multi-photo carousel: relocated to AFTER the metadata pills; renders `slice(1)` (the first photo IS the hero); skipped entirely when `photoUrls.length <= 1`.
- Section headings: `text-xl font-semibold` → `text-title` (Fraunces 24px).
- Ingredients: add `border-l-2 border-primary/30 pl-4 py-1` to `<ul>`; add `leading-relaxed` to `<li>`.
- Steps: replace `list-decimal list-inside` with explicit Fraunces-italic terracotta-80 number prefix in flex columns.
- All 4 header icon buttons: `size="icon"` → `size="icon" className="h-12 w-12"` (D-08 floor).

### Surface 2 — Recipe library / list (`/recipes`)

**Location:** `frontend/app/recipes/page.tsx`

**Layout (top-down) — REVISED for Phase 8:**

```
<OnboardingGuard>
  <section className="flex flex-col flex-1 bg-background">
    <header className="sticky top-0 h-12 px-6 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border z-20">
      <h1 className="text-xl font-semibold">{t("tab_title")}</h1>
      <Button size="icon" variant="ghost" className="h-12 w-12" aria-label={t("add_cta_aria")} onClick={() => router.push("/recipes/new")}>
        <Plus className="h-5 w-5" />
      </Button>
    </header>

    <div className="px-6 py-3 sticky top-12 z-10 bg-background/80 backdrop-blur-sm">
      <SearchInput onQueryChange={handleSearch} />
    </div>

    {!loading && recipes.length === 0 ? (
      <div className="px-6 pb-24">
        {query.trim().length > 0 ? (
          <EmptyState icon={Search} heading={t("no_results_heading", { query })} body={t("no_results_body")} />
        ) : (
          <EmptyState icon={BookOpen} heading={t("empty_heading")} body={t("empty_body")} cta={{ label: t("empty_cta"), href: "/recipes/new" }} />
        )}
      </div>
    ) : (
      <div className="px-6 grid grid-cols-2 gap-3 pb-24 md:grid-cols-3 lg:grid-cols-4">
        {recipes.map(r => <RecipeCard key={r.id} recipe={r} />)}
      </div>
    )}
  </section>
</OnboardingGuard>
```

**Phase 8 changes:**
- Header `Plus` button: `className="h-12 w-12"` (D-08 floor).
- Body grid: `flex flex-col gap-3` → `grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4`.
- Empty state: extracted from the grid container into a sibling `<div className="px-6 pb-24">` so it does not get split across columns. Conditional render flips between grid and empty-state at the parent level.

### Surface 3 — RecipeCard component

**Location:** `frontend/components/RecipeCard.tsx`

**Phase 8 changes:**
- Outer `<Link>` className: prepend `paper-grain` (line 72).
- Other layout / typography / behavior preserved verbatim.
- **Layout footprint at 2-col mobile grid:** at 390pt iPhone 14 with `px-6` (24px) page padding + `gap-3` (12px) gap, each card occupies `(390 - 48 - 12) / 2 = 165pt` width. The internal layout is `flex gap-4 p-3` — thumbnail `h-16 w-16` (64pt) + gap-4 (16pt) + body min-w-0 (~85pt for title + meta). The body min-width fits "Carbonara express" (16ch at IBM Plex Sans 16px ≈ 130px — line-clamp-1 truncates). Verified safe at 375pt iPhone SE (`(375 - 48 - 12) / 2 = 158pt`; body min-width ~78pt; line-clamp-1 still truncates).

### Surface 4 — SearchInput component

**Location:** `frontend/components/SearchInput.tsx`

**Phase 8 changes:**
- Outer wrapper: `<div className="relative">` → `<div className="relative paper-grain rounded-xl">`. The `rounded-xl` so the grain `::before` clips correctly.
- Input className: `"pl-10 pr-10 h-10"` → `"pl-10 pr-10 h-12 focus:ring-2 focus:ring-primary/30"`.
- Clear button className: `"h-8 w-8"` → `"h-12 w-12"`.
- Search icon + spinner positioning preserved (`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4` and `absolute right-2 top-1/2 -translate-y-1/2`).
- Placeholder + ARIA copy preserved (`recipes.search_placeholder` / `recipes.search_clear`).

### Surface 5 — CookingBanner component

**Location:** `frontend/components/CookingBanner.tsx`

**Layout (top-down) — REVISED for Phase 8:**

```
<div role="region" aria-labelledby="cooking-banner-title" className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 min-h-16 rounded-2xl bg-primary/8 paper-grain shadow-card border border-border">
  <ChefHat size={24} className="text-emerald-700 dark:text-emerald-300 shrink-0" aria-hidden />
  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
    <span id="cooking-banner-title" className="text-base font-semibold leading-6">{t("title")}</span>
    <span className="text-sm text-foreground-muted leading-5 line-clamp-1">{recipeTitle}</span>
  </div>
  <div className="flex items-center gap-2 shrink-0">
    <Button asChild className="h-12">
      <Link href={`/cooking-logs/${logId}/finalize`}>
        <Sparkles size={16} aria-hidden />
        {t("finalize")}
      </Link>
    </Button>
    <Button type="button" variant="ghost" className="h-12" onClick={onSkip}>
      {t("skip")}
    </Button>
  </div>
</div>
```

**Phase 8 changes:**
- Container: `bg-valide-tint border border-border` → `bg-primary/8 paper-grain shadow-card border border-border` (terracotta-active wash + paper-grain card surface).
- Finaliser: raw `<Link>` with hand-rolled classes → `<Button asChild className="h-12">` wrapping `<Link>` (COOK-07 closure).
- Passer: `Button variant="ghost" size="sm" className="h-12 px-3"` → `Button variant="ghost" className="h-12"` (remove redundant `size="sm"` and `px-3`; height is now solely from explicit className; size-default px-2.5 carries through).
- ChefHat icon color preserved (emerald — the cooking-active role-call signal).
- ARIA + i18n keys preserved (`home.cooking_banner.title` / `finalize` / `skip`).

**Layout responsiveness:** at 390pt iPhone 14 baseline with `mx-6` (48px outer) and the internal `flex gap-3 px-4`, the row needs ~280pt for ChefHat (24) + gap-3 (12) + body flex-1 (~120pt for title + clamped recipe-title) + gap-3 (12) + Finaliser button (~80pt) + gap-2 (8) + Passer button (~70pt) ≈ 326pt — fits within the 342pt available width (390 - 48). At 375pt iPhone SE (`375 - 48 = 327pt`) the layout is at the edge but `min-w-0` on the body flex-1 + `line-clamp-1` on the recipe title prevents overflow. Verified safe.

### Surface 6 — Cooking-log history view

**Location:** NEW `frontend/app/cooking-logs/page.tsx` (route) + NEW `frontend/components/CookingLogCard.tsx` (component)

**Layout (top-down):**

```
<OnboardingGuard>
  <section className="flex flex-col flex-1 bg-background">
    <header className="sticky top-0 h-12 px-6 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border z-20">
      <h1 className="text-xl font-semibold">{t("tab_title")}</h1>
      {/* Optional: filter / sort controls here in future iterations; v0.2 ships header + list only */}
    </header>

    <div className="px-6 pt-8 pb-24 flex flex-col gap-6">
      {logs.length === 0 ? (
        <EmptyState icon={ChefHat} heading={t("empty_heading")} body={t("empty_body")} />
      ) : (
        groupedByDate.map(([dateLabel, logsInGroup]) => (
          <section key={dateLabel} className="flex flex-col gap-3">
            <h2 className="font-display italic text-base text-foreground pt-6 pb-2">{dateLabel}</h2>
            {logsInGroup.map(log => <CookingLogCard key={log.id} log={log} />)}
          </section>
        ))
      )}
    </div>
  </section>
</OnboardingGuard>
```

**`CookingLogCard.tsx` per-row layout:**

```tsx
<Link href={`/recipes/${log.recipe_id}`} className="paper-grain flex flex-col gap-3 p-4 bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover active:translate-y-px transition-all duration-150">
  {photoUrl && (
    <img src={photoUrl} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
  )}
  <div className="flex flex-col gap-1.5">
    <h3 className="text-title line-clamp-2">{log.recipe_title}</h3>
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground-muted">{formatCookedAtFr(log.finalized_at)}</span>
      <span className={ratingChipClass(log.rating)}>{tRating(log.rating)}</span>
    </div>
    {log.notes && (
      <p className="text-sm text-foreground line-clamp-2 leading-relaxed">{log.notes}</p>
    )}
  </div>
</Link>
```

**Phase 8 contract:**
- Route: `/cooking-logs` — new client component fetching `GET /api/cooking-logs?days=14` (or similar) on mount; backend endpoint scope is out of Phase 8 (frontend polish only) — if the endpoint does not exist yet, the route renders the `EmptyState` until the backend lands. **Document this as a Phase 8 frontend-only deliverable; backend wiring is V2 if not yet present.** Verify with executor before plan-phase: if the endpoint exists, ship the live list; if not, ship the route shell + `EmptyState` and TODO(productize) the data wiring.
- Card frame: `paper-grain bg-card rounded-xl border border-border shadow-card` — mirrors RecipeCard frame.
- Card photo: `aspect-[4/3] w-full rounded-lg object-cover` — full-width photo on top of the card body (vertical layout, NOT the side-thumbnail pattern of RecipeCard — cooking-log cards prioritize photo prominence as the "what we ate" visual signal). Photo signed URL via `getCookingLogSignedPhotoUrl(logId, path)` (existing helper in `lib/cooking.ts`).
- Card title: `text-title line-clamp-2` — Fraunces 24px upright, 2-line clamp.
- Cooked-on date: `text-sm text-foreground-muted`, formatted via `formatCookedAtFr(log.finalized_at)` (helper to write — French relative format like "vendredi 8 mai" or "il y a 3 jours"; reuse `formatRelativeFr` from `lib/datetime.ts` if it suffices).
- Rating chip: `ratingChipClass(rating)` helper (inline in `CookingLogCard.tsx`) returns the pill class string per rating (see §Component Inventory "Vote-chip / rating-chip extraction" above for the locked 3-state class mapping).
- Notes: `text-sm text-foreground line-clamp-2 leading-relaxed` — surfaces only when non-null; clamped to 2 lines for visual restraint.
- Date grouping: section headers in `font-display italic text-base text-foreground` (Fraunces italic at body size — mirrors HomeDecide date-header pattern scaled down). Grouping key: format `log.finalized_at` to a coarse-grained French label (this week / last week / "vendredi 8 mai" for older entries — executor implements grouping logic; recommend `Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })` for absolute dates).

**i18n keys (existing — no new keys for this surface):**
- Sticky header title: existing `nav.recipes` ("Recettes") is too generic; use a NEW alias OR reuse... **Resolution:** the surface needs a heading. **Reuse existing key**: `recipes.tab_title` is "Recettes" — wrong for cooking-log history. **Decision:** use a hardcoded string... NO — that violates the localization invariant. **The cooking-log history page DOES need a heading key.** However, CONTEXT.md and the objective LOCK the new-keys count at 2 (`offline` and `recipe_subhead`). **Resolution path A:** the page heading uses an existing similar key (`home.cooking_banner.title` "En train de cuisiner" — wrong context); **Resolution path B:** ship the route as a sub-tab/section without a top-level heading (the sticky header could be omitted, with the dated section headers carrying the page register). **Recommended (path B):** **omit the sticky-header heading entirely** for v0.2; the first dated section header (`font-display italic text-base`) IS the page anchor. The sticky-header could carry a back arrow only, or be removed entirely if the page is reached via BottomNav (no back nav needed). **Implementation choice (Claude's Discretion, executor confirms during plan-phase):** if the BottomNav links here directly, omit the sticky header and start with the first dated section. If a back-arrow is needed (deep-link path), include the sticky header with `<Button size="icon" variant="ghost" className="h-12 w-12" onClick={router.back}><ChevronLeft /></Button>` and no heading text.
- Empty-state heading + body: **TODO(productize)** — the empty-state needs French copy. **For v0.2 polish, ship the route with the EmptyState fallback using existing `recipes.empty_heading` + `recipes.empty_body` as a low-cost placeholder** (semantic mismatch is acceptable for the empty path until the backend ships). Document this as a known string-reuse in SUMMARY.md; add a TODO(productize) for cooking-log-specific copy. **No new i18n keys in Phase 8 beyond the two locked deliverables.**
- Rating labels: existing `cooking_log.rating.loved` / `liked` / `disliked` — preserved unchanged.

**Phase 8 budget reality:** this surface (COOK-10) is the largest greenfield work in Phase 8. The executor may scope the cooking-log history view to the route shell + EmptyState only if the backend endpoint isn't ready, with the live list as a follow-up plan. The CookingLogCard component should land regardless (so it's available when the backend wires).

### Surface 7 — RatingPicker component

**Location:** `frontend/components/RatingPicker.tsx`

**Phase 8 changes (in-place):**
- `<button>` className: replace line 67-71 array with the new combined string. **Exact pre-/post-change diff at line 67-71:**

  Before:
  ```tsx
  className={[
    "h-20 w-full flex items-center gap-4 px-4 rounded-xl shadow-card",
    "transition-all duration-150 active:scale-[0.98]",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
    selected ? selectedClass : UNSELECTED,
  ].join(" ")}
  ```

  After:
  ```tsx
  className={[
    "h-20 w-full flex items-center gap-4 px-4 rounded-xl shadow-card paper-grain",
    "transition-colors transition-transform duration-100 ease-craft active:scale-95",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
    selected ? selectedClass : UNSELECTED,
  ].join(" ")}
  ```

  Two changes: (a) added `paper-grain` to the surface row; (b) replaced `transition-all duration-150 active:scale-[0.98]` with `transition-colors transition-transform duration-100 ease-craft active:scale-95` (closes COOK-08 W4 gap with the precise CONTEXT.md specifications).

- `selectedClass` mappings preserved unchanged: `loved` (terracotta-rose-100 + primary border + primary fg), `liked` (valide-tint + emerald border + emerald fg), `disliked` (surface-muted + foreground-muted border + foreground fg).
- `UNSELECTED` mapping preserved unchanged: `bg-card border border-border text-foreground hover:bg-secondary/50`.
- Inner content (Icon + label + helper) preserved verbatim.

### Surface 8 — CookingLogFinalize page (`/cooking-logs/[id]/finalize`)

**Location:** `frontend/components/CookingLogFinalize.tsx`

**Phase 8 changes:**
- **i18n key value update** (in `fr.json`): `cooking_log.finalize.offline` → `"Hors ligne. Réessaie une fois connecté."` (replaces existing value).
- **i18n key NEW** (in `fr.json`): `cooking_log.finalize.recipe_subhead` with ICU value `"« {title} »"`.
- **Code change** at line 142: replace `« {state.recipe.title} »` with `{t("recipe_subhead", { title: state.recipe.title })}`.
- **Submit handler offline guard** at lines 83-86: preserve verbatim — already correct (the i18n key value carries the new copy).
- All other typography / layout / behavior preserved verbatim.

**Layout (preserved from existing):**

```
<main className="flex flex-col flex-1 px-6 pt-6 pb-24 gap-8">
  <header className="flex flex-col gap-1">
    <h1 className="text-title text-foreground">{t("page_title")}</h1>
    <p className="text-base text-foreground-muted line-clamp-1">{t("recipe_subhead", { title: state.recipe.title })}</p>
  </header>
  <section ...>{/* Photos: PhotoUploader */}</section>
  <section ...>{/* Rating: RatingPicker */}</section>
  <section ...>{/* Notes: Textarea */}</section>
  <Button type="button" size="lg" disabled={!canSubmit} onClick={handleSubmit} className="h-12">{submitting ? t("submitting") : t("submit")}</Button>
</main>
```

The PhotoUploader, RatingPicker, and Textarea each carry their own surface treatment (PhotoUploader from Phase 6 retheme; RatingPicker from Phase 8 retheme above; Textarea from Phase 5 primitive re-theme). No structural change to CookingLogFinalize beyond the COOK-11/12 i18n routing.

---

## Copywriting Contract

**Phase 8 introduces TWO new user-facing i18n keys.** These are explicit deliverables (COOK-11, COOK-12). All other strings reuse existing keys.

### NEW keys (added to `frontend/lib/i18n/fr.json` under `cooking_log.finalize`)

| Key | Value | Usage | Closes |
|---|---|---|---|
| `cooking_log.finalize.offline` | `Hors ligne. Réessaie une fois connecté.` | Toast displayed by `CookingLogFinalize.handleSubmit()` when `navigator.onLine === false` (replaces generic save_failed in offline conditions). | COOK-11 / W4 finding 3 |
| `cooking_log.finalize.recipe_subhead` | `« {title} »` (ICU) | Renders the recipe title under the page heading on the finalize page, with French guillemets and the ICU `{title}` interpolation. Replaces the hardcoded `« ${state.recipe.title} »` template literal. | COOK-12 / W4 finding 5 |

**fr.json patch (executor implements verbatim):**

```jsonc
"cooking_log": {
  ...
  "finalize": {
    "page_title": "Finaliser la cuisson",
    "submit": "Finaliser",
    "submitting": "Enregistrement…",
    "photos_heading": "Photos",
    "photos_helper": "Optionnel — jusqu'à 4 photos de ton plat.",
    "rating_heading": "Comment c'était ?",
    "rating_helper": "Choisis une note pour pouvoir finaliser.",
    "notes_heading": "Notes",
    "notes_placeholder": "Comment elle a tourné ? À refaire ? À ajuster ?",
    "toast_saved": "Bien enregistré.",
    "offline": "Hors ligne. Réessaie une fois connecté.",  // <-- VALUE UPDATED (was "Hors ligne. Reconnecte-toi et réessaie.")
    "recipe_subhead": "« {title} »",                       // <-- NEW KEY
    "save_failed": "Enregistrement impossible. Réessaie.",
    "save_404": "Cette cuisson n'existe plus.",
    "save_403": "Tu n'as pas accès à cette cuisson.",
    "gone_heading": "Cette cuisson n'est plus disponible",
    "gone_body": "Elle a peut-être déjà été finalisée, ou elle appartient à un autre foyer.",
    "gone_cta": "Retour à l'accueil"
  },
  ...
}
```

**Note on offline copy:** the existing key value `"Hors ligne. Reconnecte-toi et réessaie."` is replaced with the locked W4 closure value `"Hors ligne. Réessaie une fois connecté."` per CONTEXT.md and the user objective. The two phrasings are semantically equivalent ("get back online and try again" vs "try again once you reconnect") — the locked copy is the canonical value.

### Reused keys (no changes)

| Element | Key | Copy |
|---|---|---|
| Recipe-detail back ARIA | `recipes.back_aria` | Retour |
| Recipe-detail edit ARIA | `recipes.edit_aria` | Modifier la recette |
| Recipe-detail delete ARIA | `recipes.delete_aria` | Supprimer |
| Recipe-detail no-photo placeholder | `recipes.no_photo` | Pas encore de photo |
| Recipe-detail section headings | `recipes.section_ingredients` / `recipes.section_steps` | Ingrédients / Étapes |
| Recipe-detail footer | `recipes.footer_last_cooked` / `recipes.footer_cook_count` | Dernière fois : {when} / Cuisinée {count, plural, ...} |
| Recipe-detail 404 | `recipes.detail_404_heading` / `_body` / `_cta` | Recette introuvable / Cette recette n'existe pas ou a été supprimée. / Retour aux recettes |
| Recipe-detail VoiceModifySheet trigger ARIA | `recipes.voice_modify.trigger_aria` | Modifier par la voix |
| Recipe-detail delete confirm | `recipes.delete_confirm` | Supprimer définitivement ? |
| Recipe-detail delete success | `recipes.delete_success` | Recette supprimée. |
| Library page heading | `recipes.tab_title` | Recettes |
| Library add CTA ARIA | `recipes.add_cta_aria` | Ajouter une recette |
| Library SearchInput placeholder | `recipes.search_placeholder` | Chercher par titre ou ingrédient |
| Library SearchInput clear ARIA | `recipes.search_clear` | Effacer la recherche |
| Library empty state | `recipes.empty_heading` / `_body` / `_cta` | Aucune recette pour le moment / Ajoute ta première recette pour commencer. / Ajouter une recette |
| Library no-results | `recipes.no_results_heading` / `_body` | Aucun résultat pour « {query} » / Essaie un autre mot-clé ou vérifie l'orthographe. |
| Recipe-card never-cooked | `recipes.never_cooked` | Jamais cuisinée |
| CookingBanner title | `home.cooking_banner.title` | En train de cuisiner |
| CookingBanner finalize CTA | `home.cooking_banner.finalize` | Finaliser |
| CookingBanner skip CTA | `home.cooking_banner.skip` | Passer |
| RatingPicker labels | `cooking_log.rating.loved` / `liked` / `disliked` | Adoré / Bien / Passable |
| RatingPicker helpers | `cooking_log.rating.loved_helper` / `liked_helper` / `disliked_helper` | On la refait sans hésiter / C'était bon / On évite la prochaine fois |
| CookingLogFinalize page title | `cooking_log.finalize.page_title` | Finaliser la cuisson |
| CookingLogFinalize photos heading | `cooking_log.finalize.photos_heading` | Photos |
| CookingLogFinalize photos helper | `cooking_log.finalize.photos_helper` | Optionnel — jusqu'à 4 photos de ton plat. |
| CookingLogFinalize rating heading | `cooking_log.finalize.rating_heading` | Comment c'était ? |
| CookingLogFinalize rating helper | `cooking_log.finalize.rating_helper` | Choisis une note pour pouvoir finaliser. |
| CookingLogFinalize notes heading | `cooking_log.finalize.notes_heading` | Notes |
| CookingLogFinalize notes placeholder | `cooking_log.finalize.notes_placeholder` | Comment elle a tourné ? À refaire ? À ajuster ? |
| CookingLogFinalize notes helper (keyboard mic) | `cooking_log.notes.helper_keyboard_mic` | Tu peux dicter avec le micro du clavier. |
| CookingLogFinalize submit | `cooking_log.finalize.submit` / `submitting` | Finaliser / Enregistrement… |
| CookingLogFinalize success toast | `cooking_log.finalize.toast_saved` | Bien enregistré. |
| CookingLogFinalize generic error | `cooking_log.finalize.save_failed` | Enregistrement impossible. Réessaie. |
| CookingLogFinalize 404 | `cooking_log.finalize.save_404` / `gone_heading` / `gone_body` / `gone_cta` | Cette cuisson n'existe plus. / Cette cuisson n'est plus disponible / Elle a peut-être déjà été finalisée, ou elle appartient à un autre foyer. / Retour à l'accueil |
| CookingLogFinalize 403 | `cooking_log.finalize.save_403` | Tu n'as pas accès à cette cuisson. |
| Cooking-log history empty (placeholder reuse) | `recipes.empty_heading` / `_body` (TODO(productize) cooking-log-specific copy) | Aucune recette pour le moment / Ajoute ta première recette pour commencer. |

### Standard contract slots

| Element | Copy |
|---------|------|
| **Primary CTA — recipe detail (no edit/delete actions are CTAs; they're chrome icons)** | n/a — recipe detail has no primary CTA at the page level; the cook flow is initiated from HomeDecide / VoteSummary, not from detail. |
| **Primary CTA — recipe library** | `Plus` icon header button, ARIA `Ajouter une recette` (add recipe) — destination CTA goes to `/recipes/new`. |
| **Primary CTA — cooking-log history** | none in v0.2 (the rows themselves are the destinations). |
| **Primary CTA — CookingBanner** | `Finaliser` (h-12 Button asChild wrapping Link) — destination is `/cooking-logs/{id}/finalize`. |
| **Primary CTA — CookingLogFinalize** | `Finaliser` (h-12 Button) — submits the cooking log. |
| **Empty state heading — library** | `Aucune recette pour le moment` (existing key; preserved) |
| **Empty state body — library** | `Ajoute ta première recette pour commencer.` (existing) |
| **Empty state heading — library no-results** | `Aucun résultat pour « {query} »` (existing) |
| **Empty state body — library no-results** | `Essaie un autre mot-clé ou vérifie l'orthographe.` (existing) |
| **Empty state heading — cooking-log history** | reused `recipes.empty_heading` (placeholder; TODO(productize) cooking-log-specific copy) |
| **Empty state body — cooking-log history** | reused `recipes.empty_body` (placeholder; TODO(productize)) |
| **Error state — CookingLogFinalize offline** | Toast `cooking_log.finalize.offline` — `Hors ligne. Réessaie une fois connecté.` (NEW KEY VALUE) |
| **Error state — CookingLogFinalize generic** | Toast `cooking_log.finalize.save_failed` — `Enregistrement impossible. Réessaie.` |
| **Error state — CookingLogFinalize 404** | Toast `cooking_log.finalize.save_404` — `Cette cuisson n'existe plus.` |
| **Error state — CookingLogFinalize 403** | Toast `cooking_log.finalize.save_403` — `Tu n'as pas accès à cette cuisson.` |
| **Error state — recipe detail not-found** | Inline `EmptyState` `recipes.detail_404_heading` / `_body` / `_cta` |
| **Error state — recipe library network error** | Toast `onboarding.errors.network` — `Connexion impossible. Réessaie dans un instant.` |
| **Destructive confirmation — recipe detail delete** | Browser `window.confirm(t("delete_confirm"))` — `Supprimer définitivement ?` (existing approach preserved; productize-later AlertDialog) |

### Copywriting register discipline

- **Tu (informal singular)** throughout — couple-app convention preserved from v0.1.
- **Action verbs first** ("Finaliser", "Réessaie", "Modifier") — clear intent over ambiguous nouns.
- **No exclamation points** in cook flows — the only `!` is the inherited Phase 6 `recipes.promotion.success_toast` ("Ta recette « {title} » est prête !"), which is a celebration moment outside Phase 8 scope.
- **French diacritics rendered correctly** in all strings — Fraunces and IBM Plex Sans both ship full Latin Extended Plus per Phase 5 §Typography.
- **Two new strings** (`offline`, `recipe_subhead`) are explicit deliverables. **No other new strings.** If a copy gap is identified during execution (e.g. cooking-log history needs a dedicated heading), raise it as a deviation — do not add silently. Mark TODO(productize) for follow-up.

---

## Acceptance Criteria — COOK-06 through COOK-12

| Req | Closed by |
|---|---|
| **COOK-06** Recipe detail screen re-themed (hero, ingredient list, instructions, metadata) | §Surface 1 — full-bleed hero with `bg-card/85 backdrop-blur-sm paper-grain` overlay strip + Fraunces display title; no-photo fallback paper-grain Card; metadata pill row preserved; `text-title` section headings; ingredient list `border-l-2 border-primary/30 pl-4` cookbook gesture + `leading-relaxed`; step list with Fraunces-italic terracotta-80 number prefix; multi-photo carousel relocated below pills; all 4 header icon buttons raised to `h-12 w-12`. |
| **COOK-07** CookingBanner re-themed AND `Finaliser` link + `Passer` ghost button raised to `h-12` (48px); `Finaliser` converted to `<Button asChild>` instead of raw `<a>` with hand-rolled classes — closes W4 UI-REVIEW gap | §Surface 5 + §Component Inventory CookingBanner.tsx — surface re-themed with `bg-primary/8 paper-grain shadow-card`; `Finaliser` is now `<Button asChild className="h-12">` wrapping `<Link>`; `Passer` is `Button variant="ghost" className="h-12"` (size="sm" removed). |
| **COOK-08** CookingLogFinalize re-themed AND RatingPicker `transition-transform duration-100` added — closes W4 UI-REVIEW gap (instant snap → 100ms ease) | §Surface 7 + §Component Inventory RatingPicker.tsx — class string at line 67-71 replaced with `paper-grain` added + `transition-colors transition-transform duration-100 ease-craft active:scale-95`. |
| **COOK-09** Recipe library / list re-themed (cards, search, filtering, sort) | §Surface 2 + §Surface 3 + §Surface 4 — library grid is `grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4`; RecipeCard frame gets `paper-grain` prepend; SearchInput wrapper gets `paper-grain rounded-xl` + Input field raised to `h-12 focus:ring-2 focus:ring-primary/30`; clear button raised to `h-12 w-12`; header `Plus` button raised to `h-12 w-12`. **No filter/sort UI in v0.2** — preserved as TODO(productize). |
| **COOK-10** Cooking log history / "what we ate this week" view re-themed | §Surface 6 — NEW route `/cooking-logs` + NEW component `CookingLogCard.tsx`; paper-grain cards with `aspect-[4/3] rounded-lg` photo + `text-title` recipe name + `text-sm text-foreground-muted` cooked-on date + `ratingChipClass()` 3-state pill; dated section headers in `font-display italic text-base`; reuses existing i18n keys (placeholder strings for empty state with TODO(productize) for cooking-log-specific copy). |
| **COOK-11** `cooking_log.finalize.offline` i18n key added (`Hors ligne. Réessaie une fois connecté.`) + `navigator.onLine` guard in submit handler — closes W4 UI-REVIEW gap | §Component Inventory `fr.json` — key value updated to the locked W4 copy; submit handler guard at lines 83-86 already correct (preserved). The replacement of the existing key value (was `"Hors ligne. Reconnecte-toi et réessaie."`) is the explicit closure deliverable. |
| **COOK-12** `cooking_log.finalize.recipe_subhead` ICU key used for the `« {title} »` pattern — closes W4 next-intl pattern divergence | §Component Inventory `fr.json` (NEW key with ICU `« {title} »`) + CookingLogFinalize.tsx line 142 (template literal → `t("recipe_subhead", { title })`). |

### Verification queries (executor smoke checks)

After implementation, these grep queries must pass:

```bash
# 1. New i18n keys present with locked values
grep -n "cooking_log.finalize.offline\|recipe_subhead" frontend/lib/i18n/fr.json
# expected: at least 2 hits; offline value is "Hors ligne. Réessaie une fois connecté.";
# recipe_subhead value is "« {title} »"

# 2. CookingBanner Finaliser uses Button asChild (not raw <a>)
grep -n "Button asChild" frontend/components/CookingBanner.tsx
# expected: at least 1 hit
grep -n "inline-flex items-center justify-center h-12 px-4 rounded-md" frontend/components/CookingBanner.tsx
# expected: 0 hits (the hand-rolled inline-flex pattern is removed)

# 3. CookingBanner uses paper-grain + bg-primary/8
grep -n "paper-grain" frontend/components/CookingBanner.tsx
# expected: at least 1 hit
grep -n "bg-primary/8" frontend/components/CookingBanner.tsx
# expected: at least 1 hit
grep -n "bg-valide-tint" frontend/components/CookingBanner.tsx
# expected: 0 hits (replaced with bg-primary/8)

# 4. RatingPicker has transition-transform duration-100 + active:scale-95
grep -n "transition-transform duration-100" frontend/components/RatingPicker.tsx
# expected: at least 1 hit
grep -n "active:scale-95" frontend/components/RatingPicker.tsx
# expected: at least 1 hit
grep -n "active:scale-\[0.98\]" frontend/components/RatingPicker.tsx
# expected: 0 hits (replaced)

# 5. RatingPicker has paper-grain
grep -n "paper-grain" frontend/components/RatingPicker.tsx
# expected: at least 1 hit

# 6. CookingLogFinalize uses recipe_subhead ICU key
grep -n "t(\"recipe_subhead\"" frontend/components/CookingLogFinalize.tsx
# expected: at least 1 hit
grep -n "« {state.recipe.title} »\|« \${state.recipe.title}" frontend/components/CookingLogFinalize.tsx
# expected: 0 hits (template literal replaced)

# 7. CookingLogFinalize navigator.onLine guard preserved
grep -n "navigator.onLine" frontend/components/CookingLogFinalize.tsx
# expected: at least 1 hit (already correct)

# 8. RecipeCard frame has paper-grain
grep -n "paper-grain" frontend/components/RecipeCard.tsx
# expected: at least 1 hit

# 9. SearchInput wrapper has paper-grain + h-12 + h-12 w-12 clear
grep -n "paper-grain" frontend/components/SearchInput.tsx
# expected: at least 1 hit
grep -n "h-12" frontend/components/SearchInput.tsx
# expected: at least 2 hits (Input field + clear button)

# 10. Library grid uses grid-cols-2
grep -n "grid grid-cols-2" frontend/app/recipes/page.tsx
# expected: at least 1 hit

# 11. Recipe-detail header buttons all h-12 w-12
grep -n "h-12 w-12" frontend/app/recipes/\[id\]/page.tsx
# expected: at least 4 hits (back, mic, edit, delete in main render) +
# 1 for loading-skeleton header back + 1 for 404-empty header back = at least 6

# 12. Recipe-detail hero overlay strip pattern
grep -n "bg-card/85 backdrop-blur-sm paper-grain" frontend/app/recipes/\[id\]/page.tsx
# expected: at least 1 hit

# 13. Recipe-detail ingredient list cookbook gesture
grep -n "border-l-2 border-primary/30" frontend/app/recipes/\[id\]/page.tsx
# expected: at least 1 hit

# 14. Recipe-detail step number prefix
grep -n "font-display italic text-primary/80" frontend/app/recipes/\[id\]/page.tsx
# expected: at least 1 hit

# 15. Recipe-detail section headings use text-title (not text-xl)
grep -n "text-title" frontend/app/recipes/\[id\]/page.tsx
# expected: at least 2 hits (Ingrédients + Étapes)

# 16. Cooking-log history components landed
test -f frontend/components/CookingLogCard.tsx && echo "CookingLogCard exists"
test -f frontend/app/cooking-logs/page.tsx && echo "cooking-logs route exists"
# expected: both echo lines print

# 17. No hardcoded hex / rgb in Phase 8 files
grep -rn "rgb(\|#[0-9a-fA-F]\{3,8\}" \
  frontend/components/CookingBanner.tsx \
  frontend/components/RatingPicker.tsx \
  frontend/components/CookingLogFinalize.tsx \
  frontend/components/RecipeCard.tsx \
  frontend/components/SearchInput.tsx \
  frontend/components/CookingLogCard.tsx \
  frontend/app/recipes/page.tsx \
  frontend/app/recipes/\[id\]/page.tsx \
  frontend/app/cooking-logs/page.tsx 2>/dev/null
# expected: 0 hits
```

### Real-device smoke test (post-implementation)

On iPhone Safari PWA standalone:
1. **Recipe detail:** open any recipe → confirm full-bleed hero photo with title in italic Fraunces overlaid on a `bg-card/85 backdrop-blur-sm paper-grain` strip; metadata pills below; multi-photo carousel below pills (if multi-photo); ingredients have a faint terracotta margin line on the left; steps have italic terracotta-80 number prefixes. Tap each header icon button (back, mic, edit, delete) — confirm 48px square hit area.
2. **Recipe detail no-photo case:** find a recipe without photos → confirm paper-grain Card fallback rendering with the title (no photo placeholder).
3. **Recipe library:** open `/recipes` → confirm 2-col grid on mobile; SearchInput wrapper has paper-grain texture; search field is 48px tall with terracotta focus ring on tap; clear button (when typing) is 48px square.
4. **Cooking-log history:** open `/cooking-logs` → confirm dated section headers in italic Fraunces; cooking-log cards have paper-grain frame + photo on top + Fraunces title + rating chip in correct color (rose/emerald/taupe).
5. **CookingBanner:** start a cook → confirm banner has paper-grain texture + faint terracotta wash + ChefHat emerald icon + Finaliser CTA at 48px tall + Passer ghost at 48px tall. Tap Finaliser → navigates to finalize page.
6. **RatingPicker:** on the finalize page, tap a rating card → confirm the 100ms ease press feedback (subtle scale-95 depression). Verify all 3 selected states render correctly.
7. **CookingLogFinalize offline:** enable airplane mode → tap `Finaliser` → confirm toast reads `Hors ligne. Réessaie une fois connecté.` (NOT the generic save_failed copy).
8. **CookingLogFinalize subhead:** confirm the `« Recipe Title »` line under the page heading renders correctly with French guillemets.
9. **Reduced motion:** enable iOS reduce-motion → tap a RatingPicker card → confirm the press feedback collapses to instant (no 100ms transition).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | (none — Phase 8 adds zero new primitives; consumes Phase 5 re-themes only) | not required |
| third-party | (none declared) | not applicable |

`frontend/components.json` `registries: {}` confirmed unchanged. No third-party blocks introduced. No vetting required.

---

## Out of Scope (re-stated for executor discipline)

- **Filter / sort UI on the recipe library** — CONTEXT.md says "filtering, sort" but provides no specific design; v0.2 ships the grid + search only. TODO(productize) for filter chip strip + sort dropdown.
- **Mid-cook timer / step-by-step cooking UI** — cut from v0.1; V2.
- **Recipe-detail VoiceModifySheet retheme** — sheet is inherited Phase 5 SheetContent re-theme; no Phase 8 surface-level changes.
- **AlertDialog replacement for `window.confirm`** on recipe deletion — productize-later (browser-native confirm preserved).
- **Service-worker offline detection** replacing `navigator.onLine` — productize-later (CONTEXT.md deferred).
- **Global online/offline status banner** — out of scope.
- **Cookbook small-caps OpenType usage** on section headings — deferred until verified on iOS Safari at PWA-compressed sizes.
- **RecipeCard typography pass for cuisine/mood Badge labels** (Phase 7 IN-04) — deferred to broader i18n sweep, not Phase 8.
- **Cooking-log-specific empty-state copy** — TODO(productize); placeholder reuses `recipes.empty_heading` / `_body` for v0.2.
- **Cooking-log history backend endpoint** (`GET /api/cooking-logs?days=N`) — backend work; if endpoint not yet shipped, the route renders shell + EmptyState only and TODO(productize) the data wiring.
- **Onboarding / settings / BottomNav / PWA identity** — Phase 9.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (2 new keys explicit deliverables; all other strings reuse existing keys; standard contract slots filled with concrete copy; reused-key strategy documented for cooking-log empty state)
- [ ] Dimension 2 Visuals: PASS (paper-grain placement on 6 surfaces specified; warm shadows applied per phase contract; recipe-detail hero overlay strip pattern locked; cookbook gestures — terracotta-30 ingredient margin + italic terracotta-80 step numbers — locked; anti-pattern list explicit)
- [ ] Dimension 3 Color: PASS (60/30/10 inherited; accent reserved-for list locked to 8 entries; destructive narrowed; no hardcoded hex; cooking-banner terracotta wash subtlety vs primary CTA hierarchy explicit)
- [ ] Dimension 4 Typography: PASS (5 sizes inherited from Phase 5/7 with text-xs reservation; per-element role assignment provided; recipe-detail uses Fraunces display + title + step-number italic prefix; library/history list rows stay sans for chrome register)
- [ ] Dimension 5 Spacing: PASS (4-multiple inherited; tap-target floor 48px enforced on every CTA + header icon button + SearchInput field + clear button + library Plus + RecipeCard tap surface; 13-row tap-target audit table produced)
- [ ] Dimension 6 Registry Safety: PASS (no new registries, no new shadcn primitives, no third-party blocks)

**Approval:** pending
