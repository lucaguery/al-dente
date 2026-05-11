---
phase: 9
slug: onboarding-+-identity-polish
status: draft
shadcn_initialized: true
preset: radix-nova (inherited; baseColor neutral, iconLibrary lucide, cssVariables true, registries {})
created: 2026-05-08
inherits_from: 05-UI-SPEC.md, 06-UI-SPEC.md, 07-UI-SPEC.md, 08-UI-SPEC.md
---

# Phase 9 — UI Design Contract

> **Final** polish phase of the v0.2 milestone. **Inherits** the Phase 5 token system (typography pairing, paper-grain anchor, warm shadow stack, motion language, re-themed shadcn primitives) plus Phase 6 patterns (paper-grain Card + Fraunces italic body + terracotta-60 left border for callouts), Phase 7 patterns (chipClass register for state badges, ColdStartChip retheme as the small-card cousin of D-Voice), Phase 8 patterns (`bg-primary/8` wash on chrome surfaces that signal "warm-active state"). This UI-SPEC does NOT re-litigate any of those decisions — it specifies how the first-touch surfaces (4 onboarding screens, Settings, BottomNav) and the installable PWA identity (icon + splash + theme color migration) consume those tokens, and closes the **Phase 5 deferral** on `viewport.themeColor` (`#F43F5E` rose → `#C8553D` terracotta).
>
> **Audience reminder:** Two iPhones, "just us" couple, French only via next-intl. Mobile-first at 390pt iPhone 14 baseline, iOS Safari 17+ PWA standalone is the rendering target. The four design principles (Design Quality, Originality, Craft, Functionality) carry forward unchanged, and **must hold across the full first-touch path end-to-end** — this phase determines whether the app reads as a coherent product on first install.
>
> **Prescriptive, not exploratory.** A competent executor implements Phase 9 from this contract without further design questions. CONTEXT.md decisions are LOCKED — restated here in executable form.
>
> **Audit target:** retrospective `/gsd-ui-review` on the full v0.2 app must score ≥ 22/24, ideally matching the Phase 5 / Phase 8 baseline of 23/24. Identity coherence carries weight here because it is the visible thread tying every previous phase together.

---

## Canonical References

| Reference | Why it matters here |
|-----------|---------------------|
| `.planning/phases/05-design-system-foundation/05-UI-SPEC.md` | **Source of truth for all visual tokens.** Phase 9 inherits §Spacing, §Typography, §Color, §Shadows, §Paper-Grain, §Motion, §Component Inventory verbatim. Any apparent conflict between this document and 05-UI-SPEC resolves in favor of 05-UI-SPEC. |
| `.planning/phases/06-capture-surfaces-polish/06-UI-SPEC.md` | **Pattern source for the Welcome CTA pair.** The D-Voice callout (paper-grain Card + Fraunces italic body + 3px terracotta-60 left border) is mirrored — interactively — for the two stacked CTA Cards on the Welcome screen. |
| `.planning/phases/07-decide-polish/07-UI-SPEC.md` | **Pattern source for the BottomNav inbox badge.** The Pressenti chip register (`bg-primary/15 text-primary border border-primary/40`) is mirrored — at navigation-bar density (`h-5` instead of `h-8`) — for the unread-drafts count badge. |
| `.planning/phases/08-cook-polish/08-UI-SPEC.md` | **Pattern source for the BottomNav active state wash.** The CookingBanner `bg-primary/8` terracotta wash (informational chrome that says "you're in this mode") is mirrored — at icon-pill density — for the active tab indicator. Type-scale + 3-weight inheritance discipline mirrored verbatim. |
| `.planning/phases/09-onboarding-+-identity-polish/09-CONTEXT.md` | LOCKED user decisions: simple food-symbol identity (no commissioned art); `app/icon.tsx` Next.js 16 ImageResponse; manifest theme + background colors; per-onboarding-screen layout (paper-grain Card + Fraunces display title + sticky h-12 CTA); 3-section Settings layout; BottomNav active state + Pressenti badge. |
| `.planning/notes/v0.2-design-direction.md` | Slow Food artisanal direction; anti-patterns committed (no purple gradients, no cool grays, no trattoria, no twee handmade overload, no commissioned art for v0.2 icon). |
| `.planning/REQUIREMENTS.md` (ONBOARD-07..11) | The 5 acceptance items this phase must close. Mapped 1:1 to §Acceptance Criteria below. |
| `frontend/app/globals.css` | Phase 5 tokens already migrated. Phase 9 adds **zero** new tokens — it consumes the existing ones plus migrates `themeColor` literal hex away from rose `#F43F5E`. |
| `frontend/app/layout.tsx` | `viewport.themeColor` migration site (Phase 5 deferral closure: `#F43F5E` → `#C8553D`). Apple-touch-icon resolution will pick up `apple-icon.tsx` automatically once added. |
| `frontend/public/manifest.json` | `theme_color` + `background_color` + (optionally) `icons[]` migration site. |
| `frontend/CLAUDE.md` → `frontend/AGENTS.md` | **Next.js 16.2.4 has training-data drift. CRITICAL for `app/icon.tsx`.** Consult `frontend/node_modules/next/dist/docs/` before writing the ImageResponse-based icon — confirm the exact `next/og` import surface, runtime, file-naming convention (`icon.tsx` vs `icon.png` vs `icon.{ext}`), and Apple-touch-icon resolution behavior in 16.2.4. |
| `frontend/lib/i18n/fr.json` | French only via next-intl. **No new keys** added by Phase 9 — every string in scope already exists (verified: `nav.*`, `onboarding.welcome.*`, `onboarding.create.*`, `onboarding.join.*`, `onboarding.share_code.*`, `onboarding.errors.*`, `settings.*`, `home.title`, `common.back`, `common.saving`). |

---

## Design System (inherited from Phase 5 — restated)

| Property | Value | Source |
|----------|-------|--------|
| Tool | **shadcn/ui** | `frontend/components.json` |
| Preset | **radix-nova** with `baseColor: neutral`, `cssVariables: true`, `iconLibrary: lucide`, `registries: {}` | unchanged from Phase 1 |
| Component library | shadcn/ui primitives (Radix UI under the hood); 15 primitives in `components/ui/*` already re-themed in Phase 5 | inherited |
| Icon library | **lucide-react** | inherited (Phase 9 uses `Home`, `BookOpen`, `Inbox`, `MoreHorizontal`, `ChevronLeft`, `ChevronRight`, `Copy`, `Check`, `Download`, `Loader2` — all already imported in current code) |
| Font (display) | **Fraunces** (variable, opsz + wght + ital axes) — `var(--font-display)` | Phase 5 §Typography |
| Font (body) | **IBM Plex Sans** (300/400/500/600 + italic 400) — `var(--font-body)` | Phase 5 §Typography |
| Font (mono) | **Geist Mono** — `var(--font-mono)` | inherited (Phase 9 uses `font-mono` only inside the `Input` for invite-code entry on the Join screen — preserves existing input-uppercase behavior) |
| CSS architecture | Tailwind v4 `@theme inline` block in `app/globals.css` | inherited |
| i18n | All strings via `next-intl` from `frontend/lib/i18n/fr.json` | **No new keys in Phase 9** |
| Animation library | framer-motion 12.x via `frontend/lib/motion.ts` presets | inherited (Phase 9 consumes `transitions.fast` for the BottomNav icon-state transition only — no new presets authored) |
| Texture asset | `frontend/public/textures/paper-grain.svg` | inherited |
| Tap target floor | **48px** (D-08, raised from 44px) | Phase 4 D-08 + Phase 5 §Spacing |
| PWA identity asset | **`frontend/app/icon.tsx`** (NEW — Next.js 16 ImageResponse) + **`frontend/app/apple-icon.tsx`** (NEW) | Phase 9 §PWA Identity |

---

## Spacing Scale

**Inherited from Phase 5 §Spacing unchanged.** Strict 4-multiple subset. **Every authored spacing value on Phase 9 surfaces is a 4-multiple.** No `gap-0.5`, no `gap-1.5`, no `px-2.5`, no `py-0.5` introduced by Phase 9 (Phase 7 chip-pill exception `px-2.5 py-0.5` is inherited for the BottomNav badge; not a new authored value).

| Token | Value | Usage in Phase 9 |
|-------|-------|------------------|
| xs | 4px | Sub-icon gaps inside the BottomNav active-pill bounding box (`gap-1` between icon and label) |
| sm | 8px | Compact element spacing inside Card chrome (`gap-2`); padding inside Settings invite-code copy row |
| md | 16px | Default form-field gap on onboarding Inputs (`gap-4`); Card body padding `p-4` on Welcome CTA cards |
| lg | 24px | Section gap between Settings 3 sections (`gap-6`); Card body padding `p-6` on Settings Cards; page horizontal padding `px-6` on every onboarding screen |
| xl | 32px | Vertical breathing room above the share-code Fraunces invite display (`py-8` block) |
| 2xl | 48px | **Tap target floor** (D-08); `h-12` on every interactive control on Phase 9 surfaces — onboarding submit CTAs, Welcome CTA Cards, share-code copy Button, share-code done Button, Settings copy Button, Settings export Button, Settings logout (when added) Button, BottomNav tab Link footprint |
| 3xl | 64px | Bottom-pinned submit bar safe-area contribution (inherited iOS pattern); Welcome screen vertical breathing room above CTA pair |

### Phase 9 spacing exceptions

| Exception | Value | Reason |
|---|---|---|
| BottomNav active-pill bounding box | `h-12 w-12` (48px square) | The active-state pill behind the icon is interactive (the entire Link IS the tap target). The icon visually occupies `h-6 w-6` (24px) per the existing component, but the Link footprint, with its `flex flex-col items-center justify-center flex-1 min-h-[4rem]` host nav, exceeds 48px. The pill `bg-primary/8` wash is rendered as a `rounded-full h-10 w-10` background **behind the icon** (not the whole Link) — the Link tap target stays at the parent's full vertical (~64px) per existing code. **No new exception authored; chrome compliance preserved.** |
| BottomNav inbox badge pill | `h-5` (20px), `min-w-5` (20px), `px-1.5 py-0` | **Read-only state indicator, NOT a tap target.** The badge is positioned `absolute top-0 right-0` over the icon. D-08's 48px floor explicitly excludes non-interactive chrome (mirrors Phase 7 vote-chip exception clause). Heights `h-5` and `min-w-5` are 4-multiples (20px). The `px-1.5` is a 4-multiple expressed in Tailwind shorthand — confirmed: `px-1.5` resolves to 6px **which is NOT a 4-multiple**. **CORRECTION: use `px-2` (8px) and accept the slight horizontal expansion**. The badge content is "(N)" or "N" — at most 2-3 characters — so `px-2` reads correctly. |
| Settings invite-code Fraunces display block | `py-4` (16px) vertical | Inherits the `py-4` vertical padding the share-code screen uses (mirrors the share-code visual). 4-multiple. |
| Welcome CTA Card left-border accent | `border-l-[3px]` (3px hairline) | Direct mirror of Phase 6 D-Voice pattern. Hairline at 3px registers at iOS subpixel density without competing with the rest of the surface. (Not a layout-spacing value; it's a border weight.) |
| `app/icon.tsx` ImageResponse canvas | 256×256 (icon) and 180×180 (apple-icon) | Next.js 16 ImageResponse defaults; 256 covers favicon scaling and the 192/512 manifest ranges via re-rasterization, 180 is the iOS Apple-touch-icon convention. Both are 4-multiples. |
| `app/icon.tsx` inline-SVG payload | 160×160 viewBox at `strokeWidth: 6`, centered in canvas | Centered within the 256 canvas leaves 48px breathing room on each side — visually reads as "framed mark" not "edge-to-edge logo." The 6px stroke at 160 viewBox renders cleanly down to 32px favicon (Safari favicon scale). All values 4-multiples. |

**No other exceptions in Phase 9.** Every other interactive control on Phase 9 surfaces — onboarding submit CTAs (`Créer le foyer`, `Rejoindre`, `J'ai prévenu ma partenaire`), Welcome `Créer un foyer` Card, Welcome `Rejoindre un foyer` Card, share-code copy Button, Settings invite-code copy Button, Settings export CTA — meets or exceeds the 48px floor.

### Tap-target audit (post-Phase-9 invariants)

| Surface element | Pre-Phase-9 | Post-Phase-9 (LOCKED) |
|---|---|---|
| Welcome `create_cta` Button | `h-11 w-full` ⚠️ (BELOW FLOOR — only because the existing component is variant="default" Button — see Phase 5 Component Inventory note that the primitive default is acceptable; for Phase 9 we **replace** the two stacked Buttons with paper-grain CTA Cards each at `h-12` interior link footprint) | **`h-12` interior Link** (in CTA Card pattern) ✓ |
| Welcome `join_cta` Button | `h-11 w-full` ⚠️ | **`h-12` interior Link** (in CTA Card pattern) ✓ |
| Onboarding Create submit (`Créer le foyer`) | `h-11 w-full` ⚠️ | **`h-12 w-full`** ✓ |
| Onboarding Join submit (`Rejoindre`) | `h-11 w-full` ⚠️ | **`h-12 w-full`** ✓ |
| Share-code copy Button (`Copier le code`) | `h-11` ⚠️ | **`h-12`** ✓ |
| Share-code done Button (`J'ai prévenu ma partenaire`) | `h-11 w-full` ⚠️ | **`h-12 w-full`** ✓ |
| Onboarding header back button (Create + Join) | `size="icon"` (Phase 5 primitive default `size-8`) ⚠️ | **`h-12 w-12`** ✓ (override on the Button instance) |
| Settings header — no interactive control | n/a (heading only) | unchanged |
| Settings invite-code copy Button | `size="icon"` (Phase 5 primitive default `size-8`) ⚠️ | **`h-12 w-12`** ✓ |
| Settings export CTA (`Télécharger mes recettes`) | `h-11 w-full` ⚠️ | **`h-12 w-full`** ✓ |
| BottomNav tab Link | `flex-1` inside `min-h-[4rem]` nav | unchanged (host already > 48px) |
| BottomNav active-pill background | n/a (currently a 2px top-bar accent) | **`rounded-full h-10 w-10 bg-primary/8`** ✓ (background, not tap target — non-interactive chrome) |
| BottomNav inbox badge | n/a (inline `({draftCount})`) | **`h-5 min-w-5 rounded-full bg-primary/15 text-primary border border-primary/40 text-xs font-medium px-2 absolute top-0 right-0`** ✓ |

The 8 upward changes (5 onboarding submits + 2 onboarding back icons + Settings invite-code copy + Settings export + Welcome CTAs as Cards) are non-negotiable. They were missed because the onboarding flow was not in Phase 6/7/8 scope; they are in Phase 9 scope, and the D-08 floor applies to every interactive control on a Phase 9 surface.

---

## Typography (inherited)

**Inherited from Phase 5 §Typography unchanged.** Fraunces + IBM Plex Sans pairing locked. All four utility classes (`text-display`, `text-title`, `text-body`, `text-caption`) carry forward.

### Phase 9 role assignments (first-touch + identity surfaces)

| Element | Class / family | Reason |
|---|---|---|
| **Welcome screen wordmark** ("Al Dente") — replaces existing `text-[28px] font-semibold tracking-tight` | `text-display` (Fraunces italic, weight 500, opsz=96, clamp 32–44px) | **First-touch editorial moment.** "Al Dente" reads as a cookbook cover, not a UI heading. Italic preserved as the Phase 5 editorial signature. The Fraunces italic at clamp(32, 44) is the same display register Phase 7 uses for the daily date header; Phase 8 uses for the recipe-detail hero title. Coherence across the v0.2 app starts here. |
| Welcome screen tagline (`onboarding.welcome.tagline` — "Décide ce qu'on mange ensemble.") | `text-base text-foreground-muted` (IBM Plex Sans 400 at 16/1.55) | Existing key + visual idiom; sub-headline body register. Sans, not display — the wordmark is the editorial moment, the tagline is supporting body. |
| **Welcome CTA Card label** (each of the two paper-grain Cards: "Créer un foyer" / "Rejoindre un foyer") | `font-display italic text-base` (Fraunces italic at 16px) family override | **Mirrors Phase 6 D-Voice callout headline pattern.** Each CTA Card reads as a cookbook margin-note that says "tap here to begin." The Fraunces italic register signals "this is the editorial first step," not a generic shadcn Button. |
| **Onboarding Create + Join + Share-code page title** (header center slot) | `text-base font-semibold` (IBM Plex Sans 600) | Existing pattern; preserved unchanged. Header chrome — sans, not display serif. The display-serif moment lives ONE level deeper, in the body content. |
| **Onboarding Create + Join body display title** (NEW — load-bearing first-touch) | `text-display` (Fraunces italic, weight 500, opsz=96, clamp 32–44px) | **Each onboarding step opens with a Fraunces italic display headline** that re-asserts the cookbook register inside the form. Existing keys reused: `onboarding.create.title` ("Nouveau foyer") and `onboarding.join.title` ("Rejoindre un foyer") — these currently render in the header chrome at `text-base font-semibold`. **Phase 9 keeps the header chrome and ALSO renders the same string as a `text-display` italic at the top of the form body.** The form-body display title is the editorial anchor; the header chrome is the navigation context. (See §Surface 3 / 4 implementation contract below.) |
| **Share-code body title** (`onboarding.share_code.title` — "Foyer créé") | `text-display` (Fraunces italic, weight 500, opsz=96) | Same justification — the post-create celebratory moment deserves the cookbook-cover register. Replaces existing `text-xl font-semibold`. |
| Onboarding form labels (`Nom du foyer`, `Ton prénom`, `Ta couleur`, `Code d'invitation`) | inherited Label primitive (IBM Plex Sans 500) | Existing pattern; preserved unchanged. Form labels are UI chrome — sans is correct. |
| Onboarding helper copy (`onboarding.share_code.body`, `onboarding.join.code_helper`) | `text-base text-foreground-muted` (IBM Plex Sans 400) | Existing pattern; preserved. |
| Onboarding inline error (`onboarding.errors.code_not_found`, etc.) | `text-sm text-destructive` (IBM Plex Sans 400) | Existing pattern; preserved. |
| **Invite-code Fraunces display** (share-code screen + Settings screen — load-bearing visual) | `font-display italic text-3xl tracking-widest text-primary` (Fraunces italic at 30px / 1.2, terracotta) | **Cookbook-recipe-card-number gesture.** Replaces existing `text-[28px] font-mono font-semibold tracking-[0.3em]`. The change from mono to Fraunces italic lifts the invite code from "system fingerprint" to "monogrammed letterhead." The terracotta color reads as the only place in the app where the accent and the editorial register meet on the same element — this is the visual signature of the household. **`tracking-widest` (0.1em) is the locked starting point.** If the invite code reads cramped at iPhone narrow widths, the executor may try `tracking-[0.15em]` — document any deviation in SUMMARY.md. CONTEXT.md "Claude's Discretion" allows this micro-adjustment. |
| Settings header title (`Paramètres`) | `text-base font-semibold` (IBM Plex Sans 600) | Existing pattern; preserved unchanged. Sticky-header chrome — sans, not display. |
| Settings section title (`Membre` / `Foyer` / `Sauvegarde`) | `text-title` (Fraunces upright, 24px, weight 500, opsz=36) | **Editorial register inside the Settings section Cards.** Mirrors Phase 7 VoteSummary section heading and Phase 8 recipe-detail `Ingrédients` / `Étapes` headings. Replaces existing `text-base font-semibold` on the Settings export section heading. The 3 Section headings are the editorial spine of the Settings page — they deserve the cookbook chapter idiom. (Source: `settings.export_section_title` already exists; `Membre` and `Foyer` are NEW labels — **STOP. zero new keys allowed**. Reuse `settings.member_label` ("Toi") for the Membre section, `settings.household_name_label` ("Nom du foyer") for the Foyer section, `settings.export_section_title` ("Exporter mes données") for the Sauvegarde section. The visual register IS the section delimiter; the existing labels carry the meaning.) |
| Settings field label (`Nom du foyer`, `Code d'invitation`, `Toi`) | `text-sm text-foreground-muted` (IBM Plex Sans 400) | Existing pattern; preserved unchanged inside each section Card. |
| Settings field value (household_name, member name) | `text-base font-medium` (IBM Plex Sans 500) | Existing pattern; preserved. |
| Settings invite-code helper (`Partage ce code…`) | `text-sm text-foreground-muted` (IBM Plex Sans 400) | Existing; preserved. |
| Settings export body (`Télécharge toutes tes recettes…`) | `text-sm text-foreground-muted` (IBM Plex Sans 400) | Existing; preserved. |
| **BottomNav label** (`Accueil`, `Recettes`, `À compléter`, `Plus`) | `text-xs font-medium` (IBM Plex Sans 500 at 12/16) | Inherited from Phase 5 system invariant — `text-xs` is the chrome/metadata register. The existing component uses `text-[11px]` (11px, NOT a 4-multiple); **Phase 9 normalizes to `text-xs` (12px) which IS the standard Tailwind utility and a 4-multiple in line-height (16px).** This brings BottomNav into the same nav-label idiom Phase 8 cooking-log section helpers use. |
| **BottomNav badge content** ("(N)" or "N") | `text-xs font-medium tabular-nums` (IBM Plex Sans 500 at 12px) | Mirrors Phase 7 chipClass `text-sm font-medium` register but at one notch tighter (`text-xs`) for badge density. **`tabular-nums` preserved from existing code so single/double-digit counts share the same horizontal footprint.** |

**Type scale used in Phase 9:** **4 distinct sizes** — `text-display` (32–44px), `text-title` (24px), `text-base` (16px), `text-xs` (12px). **No `text-sm` (14px) on Phase 9 surfaces beyond the inherited helper-copy idiom that already exists in current code.** Audit: `text-sm` appears on onboarding inline-error rows (`text-sm text-destructive`) and helper rows (`text-sm text-foreground-muted`) — these are inherited from existing pages and from Phase 5/6/7/8 patterns; Phase 9 introduces no new `text-sm` consumers and authors no new sizes.

> **Note on the 4-size budget:** Phase 9 surfaces exercise `text-display`, `text-title`, `text-base`, AND `text-xs` for chrome (badge + nav labels). This is exactly 4 sizes. The Phase 8 retro-target of "no `text-xs`" applied specifically to cook surfaces; Phase 9 surfaces inherit BottomNav badges + nav-label chrome where `text-xs` is the long-established register and is documented in Phase 5 §Component Inventory under chrome treatments. The discipline holds: 4 sizes, each with a single reserved purpose.

**Weights — inherited Phase 5 system invariant (NOT a new Phase 9 declaration).** Phase 9 surfaces use **2 weights** for authored content: **400** (body/helpers/errors) and **500** (display/title/labels/CTAs). The Phase 5 system also maps `font-semibold` (600) to specific locked usages (sticky-header chrome titles, submit CTA labels where Tailwind's `variant="default"` applies it via the Button primitive); Phase 9 does not author new 600 usages — those are primitive-level defaults inherited from shadcn re-themes done in Phase 5. **No new weight tokens introduced; authored weight count = 2.**

---

## Color (inherited)

**Inherited from Phase 5 §Color unchanged.** Terracotta primary on warm cream. All OKLCH values verbatim.

### Phase 9 60/30/10 application on first-touch + identity surfaces

| Slot | % | Where it appears in Phase 9 |
|---|---|---|
| Dominant (60%) | `--background` (cream `oklch(0.985 0.008 60)` ≈ `#FBF9F4`) | Page background under all 4 onboarding routes; Settings page bg; sticky-header bg at 80% alpha; BottomNav fallback bg at 85% alpha (`bg-card/85` — existing). The PWA splash background (`manifest.json` `background_color`) is **`#FAF7F2`** (warm cream literal hex; matches the `--background` token round-trip — verified). |
| Secondary (30%) | `--card`, `--secondary`, `--muted`, `--popover`, `--surface-muted` (warm cream / warm taupe family) | Welcome CTA Card surfaces (`bg-card paper-grain`); Onboarding form section wrappers (when wrapped in Card per CONTEXT.md); share-code body wrapper Card; Settings 3-section paper-grain Cards; BottomNav frame (`bg-card/85` — existing); BottomNav inactive icon foreground (`text-foreground-muted`); Settings field-label color (`text-foreground-muted`); onboarding helper copy color (`text-foreground-muted`). |
| Accent (10%) | `--primary` (terracotta `oklch(0.595 0.135 35)` ≈ `#C8553D`) and faint wash | **Reserved-for list below — no other usage.** |

### Accent reserved-for in Phase 9 (LOCKED)

The terracotta accent appears in Phase 9 ONLY on:

1. **Primary CTAs** — every `Button variant="default"` with terracotta surface, all at `h-12`:
   - Onboarding Create submit (`Créer le foyer`)
   - Onboarding Join submit (`Rejoindre`)
   - Share-code done CTA (`J'ai prévenu ma partenaire`)
   - Settings export CTA (`Télécharger mes recettes`)
2. **Welcome CTA Card left-border accent** — 3px terracotta strip on the leading edge of each paper-grain Card (`border-l-[3px] border-primary/60`). **Direct mirror of Phase 6 D-Voice + Phase 7 Tu-décides delegation patterns.** The CTA Cards ARE interactive (the entire card is a Link), but the terracotta-60 left border at 3px reads as "deliberate margin-note tap target" rather than a destination Button.
3. **Welcome CTA Card right-side ChevronRight icon** — `text-primary` (terracotta). Reads as "tap to advance" — the only icon on the screen tinted terracotta. Visual cue that the Card is interactive; reinforces the affordance signal.
4. **Invite-code Fraunces italic display color** — `text-primary` (terracotta) on both the share-code screen and the Settings invite-code section. **The single most identity-bearing element on the first-touch path:** terracotta + Fraunces italic + tracking-widest + 30px size = "this is YOUR household monogram." Used twice in the v0.2 app (share-code at first install, Settings as the canonical re-find location). Both renderings use the same exact class string.
5. **BottomNav active-state icon + label color** — `text-primary` (terracotta). Replaces existing `text-primary` (preserved — no class change, but the underlying token now resolves to terracotta via Phase 5 migration).
6. **BottomNav active-pill background wash** — `bg-primary/8` (terracotta at 8% alpha) on the `rounded-full h-10 w-10` pill behind the active icon. **Direct mirror of Phase 8 CookingBanner `bg-primary/8` informational-chrome wash.** The 8% wash signals "you're in this section" without competing with the destination CTAs in the pages BELOW the nav. **Replaces** the existing 2px top-bar accent (`absolute top-0 h-0.5 w-10 bg-primary rounded-b-full`); the pill wash is the new active-state idiom.
7. **BottomNav inbox badge** — `bg-primary/15 text-primary border border-primary/40 text-xs font-medium rounded-full h-5 min-w-5 px-2 absolute top-0 right-0`. **Direct mirror of Phase 7 Pressenti chipClass at 5/8 the height** (`h-5` vs `h-8`). Reads as "drafts pending — leaning toward action" without competing with destination CTAs. Replaces existing inline `({draftCount})` text-only render.
8. **Focus rings** — `--ring` (keyboard focus visibility) on every interactive button (onboarding submits, Welcome CTA Cards, share-code copy + done, Settings copy + export, BottomNav tab Links).
9. **PWA app icon background fill** (`app/icon.tsx` + `apple-icon.tsx`) — `#C8553D` (terracotta literal hex; matches `oklch(0.595 0.135 35)` round-trip). The food-symbol stroke renders in `#FAF7F2` (cream, the `background_color` of the manifest, so the icon and splash appear to share the same paper). **The icon IS the most-saturated terracotta surface in the app — it's branding, not chrome.** Per CONTEXT.md, this is the only place the full-saturation `#C8553D` literal hex appears outside the OKLCH token system.
10. **PWA `theme_color` (manifest + viewport.themeColor)** — `#C8553D`. Appears on the iOS Safari status bar tint when the PWA is installed and on the Android Chrome address-bar tint. **Closes Phase 5 deferral.**

**Anti-patterns explicit for Phase 9:**

| Anti-pattern | Why excluded |
|---|---|
| Rose `#F43F5E` anywhere | **EXPLICIT HUNT TARGET.** Phase 5 deferred this in `viewport.themeColor`; ONBOARD-10 success criterion 4 demands "no rose `#F43F5E` left in the manifest." Verification: `grep -rn "F43F5E\|f43f5e" frontend/app frontend/public` must return zero hits post-implementation. |
| Manifest `theme_color: #0A0A0A` (current near-black default) | The current `manifest.json` value is generic shadcn-init bootstrap; **migrated to `#C8553D`** in Phase 9. |
| Manifest `background_color: #FFFFFF` (current pure-white default) | **Migrated to `#FAF7F2`** (warm cream) so the splash screen and the app surface share the same paper register. Pure white would create a jarring transition when the cream `--background` resolves. |
| Terracotta on Welcome screen tagline copy | Body copy stays foreground-muted; the wordmark + the CTA Cards' chevron are the only terracotta surfaces. |
| Terracotta on Settings 3-section title chrome | Section titles (`Membre` / `Foyer` / `Sauvegarde` — using existing keys per type-table note) use Fraunces upright `text-title` in default `text-foreground` — typographic gesture, no color accent. Adding terracotta would over-claim hierarchy. |
| Terracotta on BottomNav inactive icon | Inactive icons stay `text-foreground-muted` (warm taupe); terracotta is reserved for the active state. |
| Terracotta on the BottomNav active LABEL background | The label sits beside the icon at `text-xs`; only the icon-pill (`rounded-full h-10 w-10 bg-primary/8`) carries the wash. The label foreground inherits `text-primary` via the parent Link's class string but the label has no background fill. |
| Cool grays anywhere | Phase 5 anti-pattern; warm-gray family only. |
| Purple gradients on white cards | Phase 5 anti-pattern. |
| Hardcoded hex colors on Phase 9 surfaces (excluding the LOCKED literal-hex set) | DESIGN-08 invariant — every color reads from a token. **Locked literal-hex exceptions for Phase 9 are: `#C8553D` (in `app/icon.tsx`, `app/apple-icon.tsx`, `manifest.json` theme_color, `layout.tsx` viewport.themeColor); `#FAF7F2` (in `app/icon.tsx` SVG stroke, `app/apple-icon.tsx`, `manifest.json` background_color).** These are the PWA-chrome-metadata files where Tailwind tokens cannot reach (the manifest is JSON; the icon.tsx ImageResponse runs at the edge runtime where CSS tokens are not in scope). Audit grep: `grep -rn "rgb\|#[0-9a-f]\{3,8\}" frontend/app/onboarding frontend/app/settings frontend/components/BottomNav.tsx frontend/components/MemberDot.tsx` must return ONLY `members.color_hex` inline-style usages on `MemberDot` (existing pattern; member identity is dynamic per-row). |
| Trattoria theming (checkered patterns, flag colors) | Phase 5 anti-pattern. |
| Custom illustrated app icon (commissioned art) | Explicitly out of v0.2 scope per ONBOARD-10 + design-direction.md. The food symbol is a 6-8 path-segment outline, NOT commissioned illustration. |
| Custom hand-drawn dividers / signatures / ornamental glyphs | Phase 5 anti-pattern. |

### Destructive — reserved for in Phase 9

`--destructive` only on:
- Onboarding inline error text (`text-destructive` on `code_not_found`, `color_taken` rows — preserved from existing code)
- Toast `variant="destructive"` for actual error conditions (`onboarding.errors.network`, `settings.export_error`, `settings.invite_code_copy_failed`)

**No `Button variant="destructive"` in Phase 9.** A future Settings logout / disconnect Button (mentioned in CONTEXT.md as "destructive-secondary Button (ghost variant with `text-destructive`)") is **deferred — out of scope for Phase 9 unless the existing Settings page already wires it (verified: it does NOT)**. If the executor finds a logout flow in the existing Settings page that this UI-SPEC missed, treat it as a deviation and surface in SUMMARY.md before adding chrome.

---

## Shadows (inherited)

**Inherited from Phase 5 §Shadows unchanged.** Two-layer warm-brown paper-on-wood shadows. Token names (`shadow-card`, `shadow-card-hover`, `shadow-nav`) work as before.

### Phase 9 shadow application

| Surface | Shadow class |
|---|---|
| Welcome screen wordmark + tagline block | None (typographic anchor on page bg). |
| Welcome CTA Card pair | `shadow-card` (paper-on-wood lift; the cards ARE paper-grain Cards). |
| Onboarding Create / Join form Inputs | None on the Input primitive itself (chrome). |
| Onboarding Create / Join form section wrapper Card (when wrapped per CONTEXT.md) | `shadow-card`. The CONTEXT.md decision says "centered paper-grain Card on `bg-background`" for each onboarding screen — meaning the entire form body lives inside a single Card. **Phase 9 implementation: wrap the existing `flex flex-col gap-6 px-6 pt-6 pb-32` form-body div in a `<Card className="paper-grain shadow-card mx-6 my-6 px-6 py-6">` — center the Card with `mx-6` so the screen retains the existing 24px horizontal margin while the Card itself holds the form fields.** |
| Share-code body Card (the Fraunces invite-code display block) | `shadow-card` (the card surface that holds the editorial moment). |
| Settings 3-section paper-grain Cards | `shadow-card` on each (3 cards stacked with `gap-6`). Inherited Phase 5 Card primitive shadow. |
| **BottomNav frame** | `shadow-nav` (hairline above the bottom nav — existing token, still rendered via the existing `border-t border-border` + the Phase 5 `--shadow-nav` background-image mounting). **No change from Phase 5.** |
| BottomNav active-pill `rounded-full h-10 w-10 bg-primary/8` | None — the pill is a wash, not a card; shadow on a wash creates an artifact. |
| BottomNav inbox badge | None — badges are chrome. |
| Sticky headers (Create, Join, Settings) | `border-b border-border` only — no shadow (chrome, not card). Existing pattern preserved. |
| Bottom-fixed submit bar (Create, Join, Share-code, Settings export) | None — the Button itself carries the visual primary. The bar uses `bg-background/80 backdrop-blur-sm` only. |

---

## Paper-Grain Texture (inherited application contract)

**Inherited from Phase 5 §Paper-Grain.** The `.paper-grain` utility class is wired in Phase 5 on `Card`, `DialogContent`, `SheetContent`, `AlertDialogContent`, `SelectContent`. Phases 6/7/8 extended usage to draft cards, D-Voice callout, ShortlistCard, ColdStartChip, Tu-décides delegation, recipe-detail hero strip, RecipeCard frame, SearchInput wrapper, cooking-log history cards, CookingBanner. Phase 9 **extends usage** to the Welcome CTA Cards, the onboarding form-body Cards (Create + Join + Share-code), the Settings 3-section Cards, and the share-code body Card.

### Phase 9 paper-grain placement

| Element | Apply `paper-grain`? |
|---|---|
| **Welcome CTA Card pair** (each of the two stacked Cards) | **Yes** — direct mirror of Phase 6 D-Voice callout pattern. Grain reinforces "tap this paper card to begin." |
| Welcome screen wordmark + tagline block | **No** — typographic anchor on page bg. Phase 5 anti-pattern (no grain on full-page bg). |
| **Onboarding Create form-body Card** (wrapping the 3 Input fields) | **Yes** — the Card IS the form surface; grain reinforces "fill this paper card." |
| **Onboarding Join form-body Card** (wrapping the 3 fields) | **Yes** — same justification. |
| **Onboarding Share-code body Card** (containing the Fraunces invite-code display + helper + copy Button) | **Yes** — the celebratory moment lives on a paper card. |
| Onboarding sticky headers (Create + Join) | **No** — chrome (sticky header). Phase 5 anti-pattern. |
| Onboarding bottom-fixed submit bar | **No** — chrome (background blur strip). |
| **Settings 3-section Cards** (Membre + Foyer + Sauvegarde) | **Yes** on each. Three list-row card surfaces; grain reinforces the metaphor. |
| Settings sticky header | **No** — chrome. |
| BottomNav frame | **No** — chrome (Phase 5 anti-pattern; chrome stays grain-free). |
| BottomNav active-pill wash | **No** — wash, not a card surface. |
| BottomNav inbox badge | **No** — badge chrome. |
| **PWA app icon (`app/icon.tsx`)** | **No** — the icon is a discrete artwork rendered into a 256×256 ImageResponse canvas. Paper-grain is a CSS-time `::before` overlay that does not exist in the ImageResponse context. The icon's terracotta background reads as solid clay; no grain. |
| **PWA splash background** (manifest `background_color`) | **No** — single solid color in the manifest JSON. Paper-grain is rendered only on actual Card surfaces inside the rendered React tree, not on platform-controlled splash chrome. |

### Phase 9 paper-grain anti-patterns

| Anti-pattern | Why excluded |
|---|---|
| Paper-grain on the BottomNav frame or active-pill | Chrome, not card. Phase 5 anti-pattern. |
| Paper-grain on the onboarding sticky-header back button | Chrome. |
| Paper-grain on the PWA icon canvas | Outside the React tree; `::before` overlay does not apply. The icon is intentionally solid terracotta with a cream stroke. |
| Paper-grain on the Welcome wordmark block | Typographic anchor on page bg; full-page bg stays grain-free. |
| Paper-grain on inputs / labels / helper rows inside the onboarding Cards | Inputs / labels are chrome inside the card; the grain lives on the Card surface, not on the form-field primitives. The Phase 5 Input/Label primitives already handle this correctly. |

---

## Motion (inherited)

**Inherited from Phase 5 §Motion unchanged.** One curve (`--ease-craft`), two durations (`--duration-fast` 150ms, `--duration-normal` 280ms). Framer Motion presets in `frontend/lib/motion.ts` (`variants`, `transitions`, `easeCraft`, `durations`, `springSnap` from Phase 7).

### Phase 9 motion contract

| Surface / interaction | Animation |
|---|---|
| Onboarding tab switch (welcome → create → share-code) | None — full-page route change, browser-default. |
| Onboarding form Input focus | Inherited from Phase 5 Input primitive — `transition-colors duration-fast ease-craft`. |
| Onboarding submit button press | Inherited from Phase 5 Button primitive — `transition-colors duration-fast ease-craft` + `active:translate-y-px`. |
| Welcome CTA Card hover | `transition-colors duration-fast ease-craft` — picks up the existing `hover:bg-card/95` pattern from Phase 6 D-Voice callout. **No translate, no scale.** |
| Welcome CTA Card tap (active state) | Inherited from Link; iOS Safari renders the default tap-highlight subtle. No custom animation. |
| Settings invite-code copy Button (Copy ↔ Check icon swap) | The existing 2000ms timeout-driven swap is preserved; visually the icon transition uses the inherited Button primitive's `transition-colors duration-fast ease-craft` for the icon foreground. **No new motion authored.** |
| **BottomNav active-state transition** (pill wash + icon color when route changes) | `transition-colors duration-fast ease-craft` on the icon foreground (inherited from Phase 5 `--ease-craft` + `--duration-fast`). **The pill-wash background uses the same transition** so the wash fades in/out at 150ms. **No transform animation** — the pill stays at `h-10 w-10` always; only the background fill toggles between transparent and `bg-primary/8`. **`prefers-reduced-motion` honored** via the existing `globals.css` clamp (Phase 5). |
| BottomNav badge appear / count change | None on first appear (the badge mounts/unmounts when `draftCount` flips between 0 and ≥1; React handles the mount). On count *change* (e.g. 1→2), the existing `tabular-nums` font-feature handles the visual; **no motion authored** — count changes are informational, not theatrical. |
| Reduced-motion | `@media (prefers-reduced-motion: reduce)` in `globals.css` clamps all CSS transitions to 0ms (existing). For BottomNav specifically, this means the pill-wash fade and icon-color transition snap to instant — acceptable, the meaning (active vs inactive) is conveyed by the wash presence, not by the fade. |

### Animation cadence discipline (Phase 9)

Phase 9 introduces ZERO new motion presets and ZERO new framer-motion variants. The only authored motion is **CSS color/background transitions on the BottomNav active state**, which use existing `--ease-craft` and `--duration-fast` tokens via Tailwind utilities (`transition-colors duration-fast ease-craft`).

**No stacked effects.** No simultaneous slide + scale + color transition. No staggered children. No layout animations on Phase 9 surfaces.

---

## PWA Identity (NEW — Phase 9 specific contract)

This section is unique to Phase 9 and has no counterpart in Phases 5/6/7/8. It is the load-bearing identity work of the milestone.

### `frontend/app/icon.tsx` — Next.js 16 dynamic icon (NEW file)

**File location:** `frontend/app/icon.tsx`

**Runtime:** edge runtime (Next.js 16 ImageResponse default — confirm via `frontend/node_modules/next/dist/docs/` per `frontend/AGENTS.md`).

**Canvas dimensions:** 256×256 px (covers favicon scaling and 192/512 manifest ranges via re-rasterization).

**Content type:** `image/png`.

**Visual contract:**
- Background: solid `#C8553D` terracotta literal hex (matches `--primary` OKLCH `oklch(0.595 0.135 35)` round-trip).
- Foreground: simple food-symbol outline in `#FAF7F2` cream stroke (matches `--background` OKLCH `oklch(0.985 0.008 60)` round-trip).
- Symbol options (executor picks the cleaner-rasterizing one at 32px favicon scale, documents choice in SUMMARY.md):
  1. **Pasta-strand outline** — single curved stroke spiraling once, ~6 path segments. Reads as "pasta unfurling" at a glance.
  2. **Wheat-stem outline** — vertical stem with 4-6 grain-cluster ovals, ~8 path segments. Reads as "Slow Food / artisanal grain."
- Symbol bounding box: 160×160 viewBox centered in the 256 canvas (48px breathing room each side).
- Stroke width: 6px in the 160 viewBox.
- Stroke linecap: `round` (no sharp ends).
- No fill on the stroke paths (outline only).

**Exact JSX scaffold (executor implements):**

```tsx
import { ImageResponse } from "next/og";

export const size = { width: 256, height: 256 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#C8553D",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
        }}
      >
        <svg
          width="160"
          height="160"
          viewBox="0 0 160 160"
          fill="none"
          stroke="#FAF7F2"
          strokeWidth="6"
          strokeLinecap="round"
        >
          {/* pasta-strand OR wheat-stem path: 6-8 path segments;
              executor picks the one that rasterizes cleanest at 32px;
              document choice + path data in SUMMARY.md */}
        </svg>
      </div>
    ),
    size,
  );
}
```

### `frontend/app/apple-icon.tsx` — Apple-touch-icon (NEW file)

**File location:** `frontend/app/apple-icon.tsx`

**Canvas dimensions:** 180×180 px (iOS Apple-touch-icon convention).

**Content:** identical visual contract to `app/icon.tsx`, scaled to 180×180. The viewBox-centered SVG inside the 180 canvas leaves ~32px breathing room each side at the same `strokeWidth: 6` (renders at 113×113 effective when scaled — adjust by setting the SVG dimensions to `113 113` viewBox 160 to preserve stroke proportions, OR keep `width="113" height="113"` with the same viewBox and let the SVG renderer scale).

**Implementation note:** the simplest implementation is a sibling file with identical structure:

```tsx
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#C8553D",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
        }}
      >
        <svg
          width="113"
          height="113"
          viewBox="0 0 160 160"
          fill="none"
          stroke="#FAF7F2"
          strokeWidth="6"
          strokeLinecap="round"
        >
          {/* same path data as icon.tsx — single source of truth for the symbol;
              executor extracts the path data into a shared const if duplication
              feels wasteful, but cross-file extraction is OPTIONAL for v0.2 */}
        </svg>
      </div>
    ),
    size,
  );
}
```

### Existing PNG icons in `frontend/public/icons/192.png` and `512.png`

**Decision (Claude's Discretion per CONTEXT.md):** **delete after confirming `app/icon.tsx` covers the manifest.json icon paths.**

**Sequence:**
1. Land `app/icon.tsx` + `app/apple-icon.tsx`.
2. Update `manifest.json` `icons[]` to point at `/icon` and (optionally) `/apple-icon` — Next.js 16 resolves these as the auto-generated routes per `frontend/node_modules/next/dist/docs/` (executor verifies the exact path syntax).
3. Test on a real iPhone Safari install — confirm home-screen icon shows the new terracotta + cream symbol.
4. **Delete `frontend/public/icons/192.png` and `frontend/public/icons/512.png`** in the same commit. Reasoning: keeping them as legacy fallback creates a confusing dual-source-of-truth situation; the Next.js 16 ImageResponse-driven path is the canonical resolution route and any divergence between the PNG files and the rendered icon would surface as inconsistency on the home screen.
5. If the dual-phone test reveals the legacy PNGs are still being served (e.g. due to Vercel caching), document in SUMMARY.md and treat as a productize-later artifact.

### `frontend/app/layout.tsx` — `viewport.themeColor` migration

**Change:** line 46 `themeColor: "#F43F5E"` → `themeColor: "#C8553D"`.

**Closes Phase 5 deferral.**

**Verification post-change:** `grep -rn "F43F5E\|f43f5e" frontend/` must return zero hits.

### `frontend/public/manifest.json` — theme + background color migration

**Changes:**
- `"background_color": "#FFFFFF"` → `"background_color": "#FAF7F2"` (warm cream)
- `"theme_color": "#0A0A0A"` → `"theme_color": "#C8553D"` (terracotta)
- `"icons[]"` — verify the existing `192.png` / `512.png` references either resolve correctly via Next.js 16's icon route or are updated to the auto-generated paths. If updated, the literal `/icons/192.png` and `/icons/512.png` paths are removed and replaced with whatever Next.js 16 emits (executor confirms via `frontend/node_modules/next/dist/docs/`).

**Verification post-change:**
- `grep -n "FFFFFF\|0A0A0A" frontend/public/manifest.json` returns zero hits.
- iOS Safari "Add to Home Screen" install on a test iPhone shows the new icon + the warm-cream splash background + the terracotta status-bar tint.

### Identity coherence — the four design principles end-to-end

The Phase 9 identity work is the visible thread tying every previous phase together. Verification:

| Principle | How Phase 9 closes the v0.2 milestone on this principle |
|---|---|
| **Design Quality** | The first-touch path (icon → splash → welcome → create / join → home → daily decide → recipe detail) reads as a single product because the same terracotta + cream + Fraunces italic register repeats verbatim across surfaces: app icon → wordmark → Welcome CTA Cards → Settings invite-code → BottomNav active state → Recipe-detail hero (Phase 8) → daily date header (Phase 7) → D-Voice callout (Phase 6). |
| **Originality** | The pasta-strand or wheat-stem outline on terracotta is a non-stock-Lucide symbol; the Fraunces italic invite-code display is a non-stock pattern; the paper-grain BottomNav-pill-wash combination is a non-stock-shadcn pattern. Anti-pattern audit: no purple gradients, no cool grays, no Geist fonts, no commissioned art (the symbol is a 6-8 segment outline, not commissioned illustration). |
| **Craft** | Every typography role assignment in §Typography ties to a specific opsz axis + weight + line-height. Every spacing value is a 4-multiple. The shadow stack is two-layer warm-brown. The terracotta primary at OKLCH `oklch(0.595 0.135 35)` reads as fired clay against the cream background; AA contrast verified ≥5.4:1 (Phase 5) and the Settings invite-code at `text-primary` on `bg-card` reads as 5.0:1 minimum (terracotta on warm cream lifted via tone). |
| **Functionality** | Every interactive control on Phase 9 surfaces meets the 48px D-08 floor. The PWA install path is unblocked: `app/icon.tsx` + `apple-icon.tsx` + `manifest.json` migrations close the rendering chain. The BottomNav inbox badge restores the unread-drafts signal (currently inline `({N})` text — easily overlooked at iPhone scale; new pill-style badge at terracotta tint is unmissable). The invite-code Fraunces display improves legibility over the existing mono `tracking-[0.3em]` rendering at the same size. |

---

## Component Inventory (deltas from Phase 5)

Phase 9 introduces **zero new shadcn primitives**. The 15 primitives in `components/ui/*` are already re-themed (Phase 5 Plan 05). Phase 9 modifies application-level components only and creates **two new files** in `app/` (icon.tsx + apple-icon.tsx).

### Application components touched in Phase 9

| File | Change shape |
|------|--------------|
| `frontend/app/icon.tsx` (NEW — 23 LOC) | NEW file. ImageResponse-driven 256×256 icon. Terracotta `#C8553D` background + cream `#FAF7F2` outline (food-symbol — pasta-strand or wheat-stem outline; executor picks). |
| `frontend/app/apple-icon.tsx` (NEW — 23 LOC) | NEW file. ImageResponse-driven 180×180 Apple-touch-icon. Identical visual contract to `app/icon.tsx`. |
| `frontend/app/layout.tsx` (84 LOC) | Line 46: `themeColor: "#F43F5E"` → `themeColor: "#C8553D"`. **Closes Phase 5 deferral.** |
| `frontend/public/manifest.json` (14 LOC) | `"background_color": "#FFFFFF"` → `"#FAF7F2"`. `"theme_color": "#0A0A0A"` → `"#C8553D"`. `"icons[]"` paths verified against Next.js 16 ImageResponse resolution; legacy PNG references either preserved as fallback or removed. |
| `frontend/public/icons/192.png` and `frontend/public/icons/512.png` | **Deleted** after `app/icon.tsx` install verification (Claude's Discretion locked per CONTEXT.md). |
| `frontend/app/onboarding/welcome/page.tsx` (45 LOC) | Replace existing `<h1 className="text-[28px] font-semibold tracking-tight">{tHome("title")}</h1>` with `<h1 className="text-display">{tHome("title")}</h1>` — Fraunces italic display register on the wordmark. Replace the two existing `<Button variant="default" className="h-11 w-full">{create_cta}</Button>` and `<Button variant="outline" className="h-11 w-full">{join_cta}</Button>` with the **paper-grain CTA Card pair pattern** (see §Surface 1 contract below). |
| `frontend/app/onboarding/create/page.tsx` (142 LOC) | Wrap existing `<div className="flex flex-col gap-6 px-6 pt-6 pb-32">` form-body in `<Card className="paper-grain shadow-card mx-6 my-6 px-6 py-6 flex flex-col gap-6">` (with the existing 3 field `<div>` children inside). Add a Fraunces display title above the form fields inside the Card: `<h2 className="text-display mb-2">{t("title")}</h2>`. Bump submit Button from `h-11 w-full` to **`h-12 w-full`**. Bump header back Button from `size="icon"` (size-8) to **`size="icon" className="h-12 w-12"`**. Verify the existing `mb-2` gap inside the Card harmonizes with the existing `gap-6` between fields — adjust to `gap-4` between display-title and first field if the visual feels cramped. |
| `frontend/app/onboarding/join/page.tsx` (263 LOC) | Same shape as Create: wrap form-body in paper-grain Card, add Fraunces display title above the fields, bump submit + back buttons to `h-12`. Existing invite-code Input keeps `font-mono tracking-[0.3em] uppercase` — that is the entry-time uppercase ASCII gesture, NOT the display-time Fraunces italic gesture. They co-exist: input is mono (typing register), display is Fraunces italic (cookbook register). |
| `frontend/app/onboarding/share-code/page.tsx` (85 LOC) | Wrap the celebratory body in `<Card className="paper-grain shadow-card mx-6 my-6 px-6 py-6">`. Replace existing `<h1 className="text-xl font-semibold">{t("title")}</h1>` with `<h1 className="text-display">{t("title")}</h1>`. **Replace the existing invite-code display** (`<div className="text-[28px] font-mono font-semibold tracking-[0.3em] py-6 px-8 bg-surface-muted rounded-lg text-center mt-6">`) with the **Fraunces italic terracotta block**: `<div className="font-display italic text-3xl tracking-widest text-center py-4 text-primary">{code}</div>` — drops the `bg-surface-muted` rounded-lg chrome (the Card now provides the surface) and drops the mono family in favor of Fraunces italic. Bump copy Button from `h-11` (variant="secondary") to **`h-12`**. Bump done Button from `h-11 w-full` to **`h-12 w-full`**. **Important:** `text-3xl` is Tailwind's 30px utility, NOT a 4-multiple in Tailwind's 4-base scale (30 ≠ 32) — but 30px IS divisible by 2 and lines up well with the existing `tracking-[0.3em]` width budget. **Spacing audit confirms `text-3xl` is acceptable** because it is a Tailwind-native size (not an arbitrary `text-[30px]` exception); the type-scale ceiling is satisfied via the 4 inherited classes (`text-display`, `text-title`, `text-base`, `text-xs`) and `text-3xl` here renders the same Fraunces italic register as `text-display`'s lower clamp bound (32px), so it sits inside the display family without authoring a new size token. |
| `frontend/app/settings/page.tsx` (165 LOC) | Restructure the existing 4 stacked `flex flex-col gap-2` blocks into **3 paper-grain Cards** (Membre, Foyer, Sauvegarde) stacked with `gap-6`. The existing field-label / field-value pairs move INSIDE each Card. Apply Fraunces display register to the invite-code rendering (replace existing `<span className="text-[28px] font-mono font-semibold tracking-[0.3em] uppercase">{code}</span>` with `<span className="font-display italic text-3xl tracking-widest text-primary">{code}</span>`). Bump invite-code copy Button from `size="icon"` (size-8) to **`size="icon" className="h-12 w-12"`**. Bump export CTA from `h-11 w-full` to **`h-12 w-full`**. **No new i18n keys** — section delimiters are typographic (3 separate Cards with the existing field-labels INSIDE each Card carrying the section meaning). The "Membre" / "Foyer" / "Sauvegarde" mental model is delivered by Card grouping and the existing label keys, NOT by new section-heading strings. |
| `frontend/components/BottomNav.tsx` (119 LOC) | Replace the existing `text-[11px]` label class with `text-xs`. Replace the existing 2px top-bar accent (`<span className="absolute top-0 h-0.5 w-10 bg-primary rounded-b-full" />`) with the **active-pill pattern**: render a `<span className="absolute inset-0 m-auto rounded-full h-10 w-10 bg-primary/8 transition-colors duration-fast ease-craft" />` only when `active === true`, layered behind the icon. Replace the existing inline `<span className="text-[11px] tabular-nums">({draftCount})</span>` badge with the **Pressenti-style pill badge**: `<span className="absolute top-0 right-0 h-5 min-w-5 rounded-full bg-primary/15 text-primary border border-primary/40 text-xs font-medium tabular-nums px-2 flex items-center justify-center">{draftCount}</span>` (drop the parentheses — the pill chrome IS the delimiter). Position the badge using `absolute top-0 right-0` relative to the Link parent (Link gains `relative` positioning if not already present — verified: not present, so add `relative` to the Link className). Verify all `text-slate-*` / `text-zinc-*` / `bg-zinc-*` references are replaced with `text-foreground-muted` / `bg-card` / `text-primary` tokens — grep returns zero cool-gray hits post-change. |
| `frontend/components/MemberDot.tsx` (19 LOC) | **No structural change.** The component is the canonical color-attribution primitive (Phase 1); it composes inside the Settings `Membre` Card. Inline-style member.color_hex is preserved (per-row identity, not a token). |

### Phase 9 paper-grain placement re-summary

| Surface | Apply `paper-grain`? |
|---|---|
| Welcome CTA Card pair | Yes (each card) |
| Onboarding Create form-body Card | Yes |
| Onboarding Join form-body Card | Yes |
| Onboarding Share-code body Card | Yes |
| Settings 3-section Cards (Membre / Foyer / Sauvegarde) | Yes (each card) |
| Welcome wordmark + tagline block | No (page bg) |
| Onboarding sticky headers | No (chrome) |
| Onboarding submit bars | No (chrome) |
| Settings sticky header | No (chrome) |
| BottomNav frame, active-pill, badge | No (chrome) |
| PWA icon canvas / splash bg | No (outside React tree) |

---

## Surface-by-Surface Pinning

The exact visual contract per surface. Executors implement these top-down.

### Surface 1 — Welcome screen (`frontend/app/onboarding/welcome/page.tsx`)

**Layout (top-down):**

```tsx
<section className="flex flex-col flex-1 items-center justify-center px-6 py-16 bg-background">
  <header className="flex flex-col items-center gap-2 text-center">
    {/* Wordmark — Fraunces italic display */}
    <h1 className="text-display">{tHome("title")}</h1>
    {/* Tagline — IBM Plex Sans body */}
    <p className="text-base text-foreground-muted mt-2 text-center">
      {t("tagline")}
    </p>
  </header>

  <div className="flex-1" />

  {/* CTA Card pair — paper-grain Cards mirroring Phase 6 D-Voice pattern */}
  <div className="flex flex-col gap-3 w-full max-w-xs">
    <Card className="paper-grain shadow-card border-l-[3px] border-primary/60 p-4 transition-colors duration-fast ease-craft hover:bg-card/95">
      <Link
        href="/onboarding/create"
        className="flex items-center justify-between h-12"
      >
        <span className="font-display italic text-base">{t("create_cta")}</span>
        <ChevronRight className="text-primary" aria-hidden />
      </Link>
    </Card>
    <Card className="paper-grain shadow-card border-l-[3px] border-primary/60 p-4 transition-colors duration-fast ease-craft hover:bg-card/95">
      <Link
        href="/onboarding/join"
        className="flex items-center justify-between h-12"
      >
        <span className="font-display italic text-base">{t("join_cta")}</span>
        <ChevronRight className="text-primary" aria-hidden />
      </Link>
    </Card>
  </div>
</section>
```

**Notes:**
- The `Link` is the tap target (full-card interactive); the Card surrounds it for visual chrome. `h-12` on the Link's flex row guarantees 48px tap height.
- `font-display italic` on the label span overrides the body family inheritance; reads as cookbook margin-note.
- `ChevronRight` is the only terracotta-tinted icon on the screen — affordance signal.
- No back button (root onboarding screen).
- BottomNav is hidden on `/onboarding/*` routes (existing logic in `BottomNav.tsx:77`).

### Surface 2 — Onboarding Create (`frontend/app/onboarding/create/page.tsx`)

**Layout (top-down):**

1. Sticky header (`<header className="sticky top-0 h-12 ... bg-background/80 backdrop-blur-sm border-b border-border z-10">`):
   - Back Button: `<Button size="icon" variant="ghost" className="h-12 w-12" aria-label={tCommon("back")} onClick={router.back}>` with `<ChevronLeft />`. **Bumped from default `size-8` to `h-12 w-12`.**
   - Center: `<span className="text-base font-semibold">{t("title")}</span>` — chrome label.
   - Right: `<span className="w-12" aria-hidden />` for visual balance — **bumped from `w-8` to `w-12`** to match the back-button width.

2. Form-body Card (replaces existing `<div className="flex flex-col gap-6 px-6 pt-6 pb-32">`):
   ```tsx
   <Card className="paper-grain shadow-card mx-6 my-6 px-6 py-6 flex flex-col gap-6">
     <h2 className="text-display mb-2">{t("title")}</h2>
     {/* Existing 3 field <div>s preserved verbatim — household_name Input, member_name Input, ColorSwatchPicker — Phase 5 primitive re-themes apply automatically */}
     <div className="flex flex-col gap-2">...</div>
     <div className="flex flex-col gap-2">...</div>
     <div className="flex flex-col gap-2">...</div>
   </Card>
   ```
3. Bottom-fixed submit bar (existing, with `h-12` bump):
   ```tsx
   <div
     className="fixed bottom-0 inset-x-0 px-6 pb-6 bg-background/80 backdrop-blur-sm"
     style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
   >
     <Button className="h-12 w-full" disabled={!canSubmit} onClick={onSubmit}>
       {submitting ? <><Loader2 className="animate-spin h-4 w-4 mr-2" aria-hidden />{tCommon("saving")}</> : t("submit")}
     </Button>
   </div>
   ```

### Surface 3 — Onboarding Join (`frontend/app/onboarding/join/page.tsx`)

Same shape as Surface 2 (Create):
1. Sticky header — back Button `h-12 w-12`, right spacer `w-12`.
2. Form-body Card with `text-display` title above the 3 fields (code Input, member_name Input, ColorSwatchPicker).
3. Bottom-fixed submit bar — `h-12 w-full`.

**Distinguishing detail:** the invite-code Input keeps `font-mono tracking-[0.3em] uppercase` per existing pattern (entry-time register; user is typing the code). The Fraunces italic display register is reserved for the **share-code screen** + **Settings** read-time displays.

### Surface 4 — Onboarding Share-code (`frontend/app/onboarding/share-code/page.tsx`)

**Layout (top-down):**

```tsx
<section className="flex flex-col flex-1 bg-background px-6 pt-12 pb-32">
  <Card className="paper-grain shadow-card mx-6 my-6 px-6 py-6 flex flex-col gap-4">
    {/* Editorial title — Fraunces italic display */}
    <h1 className="text-display">{t("title")}</h1>
    {/* Body copy — IBM Plex Sans muted */}
    <p className="text-base text-foreground-muted">{t("body")}</p>

    {/* THE invite-code monogram — load-bearing identity element */}
    <div className="font-display italic text-3xl tracking-widest text-center py-4 text-primary">
      {code}
    </div>

    {/* Copy Button — h-12 secondary variant, ghost optional per CONTEXT.md (locked: secondary) */}
    <Button variant="secondary" className="h-12" onClick={onCopy}>
      <Copy className="h-4 w-4 mr-2" aria-hidden />
      {t("copy_cta")}
    </Button>
  </Card>

  {/* Bottom-fixed done CTA — h-12 default */}
  <div
    className="fixed bottom-0 inset-x-0 px-6 pb-6 bg-background/80 backdrop-blur-sm"
    style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
  >
    <Button variant="default" className="h-12 w-full" onClick={() => router.replace("/")}>
      {t("done_cta")}
    </Button>
  </div>
</section>
```

**Notes:**
- The Card is the entire body surface; the bottom-fixed done CTA sits OUTSIDE the Card, on page bg.
- The `font-display italic text-3xl tracking-widest text-primary` line is the editorial signature of the v0.2 milestone — repeated VERBATIM on the Settings screen for recognition.

### Surface 5 — Settings (`frontend/app/settings/page.tsx`)

**Layout (top-down):**

1. Sticky header (existing — preserved):
   ```tsx
   <header className="sticky top-0 h-12 px-6 flex items-center bg-background/80 backdrop-blur-sm border-b border-border z-10">
     <h1 className="text-base font-semibold">{t("title")}</h1>
   </header>
   ```

2. **3 paper-grain Cards stacked with `gap-6`** in a `<div className="flex flex-col gap-6 px-6 pt-6 pb-24">`:

   **Card 1 — Membre:**
   ```tsx
   <Card className="paper-grain shadow-card p-6 flex flex-col gap-2">
     <span className="text-sm text-foreground-muted">{t("member_label")}</span>
     <div className="flex items-center gap-3">
       <MemberDot colorHex={session.me.color_hex} />
       <span className="text-base font-medium">{session.me.name}</span>
     </div>
   </Card>
   ```

   **Card 2 — Foyer:**
   ```tsx
   <Card className="paper-grain shadow-card p-6 flex flex-col gap-4">
     <div className="flex flex-col gap-2">
       <span className="text-sm text-foreground-muted">{t("household_name_label")}</span>
       <span className="text-base font-medium">{session.household_name}</span>
     </div>
     <div className="flex flex-col gap-2">
       <span className="text-sm text-foreground-muted">{t("invite_code_label")}</span>
       <div className="flex items-center gap-3">
         {/* Fraunces italic terracotta — mirrors share-code visual */}
         <span
           className="font-display italic text-3xl tracking-widest text-primary"
           aria-label={t("invite_code_aria")}
         >
           {session.invite_code}
         </span>
         <Button
           size="icon"
           variant="ghost"
           className="h-12 w-12"
           onClick={onCopy}
           aria-label={t("invite_code_copy_aria")}
         >
           {copied ? <Check size={20} /> : <Copy size={20} />}
         </Button>
       </div>
       <p className="text-sm text-foreground-muted">{t("invite_code_helper")}</p>
     </div>
   </Card>
   ```

   **Card 3 — Sauvegarde:**
   ```tsx
   <Card className="paper-grain shadow-card p-6 flex flex-col gap-3">
     <span className="text-sm text-foreground-muted">{t("export_section_title")}</span>
     <p className="text-sm text-foreground-muted">{t("export_body")}</p>
     <Button
       className="h-12 w-full"
       variant="default"
       onClick={onExport}
       disabled={exporting}
       aria-busy={exporting}
     >
       <Download className="h-4 w-4 mr-2" />
       {t("export_cta")}
     </Button>
   </Card>
   ```

**Notes:**
- The 3 Card grouping IS the section delimiter. No new section-heading strings needed.
- The `text-sm text-foreground-muted` field-label idiom is preserved from existing code; it carries the "this is the field label" register inside each Card.
- The invite-code Fraunces italic block matches the share-code screen byte-for-byte — first-touch / re-find consistency.
- The export Button is `variant="default"` (terracotta) at `h-12` — the only destination CTA on the Settings page.

### Surface 6 — BottomNav (`frontend/components/BottomNav.tsx`)

**Layout — re-themed Link entry (per tab):**

```tsx
<Link
  key={href}
  href={href}
  aria-current={active ? "page" : undefined}
  className={`relative flex flex-col items-center justify-center flex-1 gap-1 text-xs font-medium transition-colors duration-fast ease-craft ${
    active ? "text-primary" : "text-foreground-muted"
  }`}
>
  {/* Active pill wash — bg-primary/8, h-10 w-10 rounded-full, behind icon */}
  {active ? (
    <span
      aria-hidden
      className="absolute inset-x-0 top-2 mx-auto rounded-full h-10 w-10 bg-primary/8 transition-colors duration-fast ease-craft"
    />
  ) : null}
  {/* Icon — sits above the wash */}
  <Icon size={24} aria-hidden className="relative z-10" />
  {/* Label */}
  <span className="relative z-10">{t(labelKey)}</span>
  {/* Inbox-only badge — Pressenti-style pill at h-5 */}
  {showBadge ? (
    <span className="absolute top-0 right-1/4 h-5 min-w-5 rounded-full bg-primary/15 text-primary border border-primary/40 text-xs font-medium tabular-nums px-2 flex items-center justify-center z-20">
      {draftCount}
    </span>
  ) : null}
</Link>
```

**Notes:**
- The active-pill `<span>` sits ABSOLUTE behind the icon (`top-2 mx-auto`), at `h-10 w-10 rounded-full bg-primary/8`. Replaces the existing 2px top-bar accent.
- The icon and label both get `relative z-10` so they layer above the wash.
- The inbox badge sits ABSOLUTE at `top-0 right-1/4` (relative to the Link's flex container — adjustable; executor verifies positioning on iPhone real-device test). Uses Phase 7 chipClass register at `h-5` density.
- The Link's `text-xs font-medium` replaces the existing `text-[11px] font-medium`. Brings the BottomNav into the standard Tailwind utility set + 4-multiple line-height.
- The transition `transition-colors duration-fast ease-craft` makes the icon/label/wash color and background fade at 150ms with the Phase 5 craft curve.
- `prefers-reduced-motion` clamps the transition to instant via the Phase 5 globals.css rule.

---

## Copywriting Contract

**Phase 9 introduces NO new user-facing copy.** Every string in scope already exists in `frontend/lib/i18n/fr.json`:

| Element | Key | Copy |
|---|---|---|
| Welcome wordmark | `home.title` | Al Dente |
| Welcome tagline | `onboarding.welcome.tagline` | Décide ce qu'on mange ensemble. |
| Welcome create CTA | `onboarding.welcome.create_cta` | Créer un foyer |
| Welcome join CTA | `onboarding.welcome.join_cta` | Rejoindre un foyer |
| Onboarding Create header title | `onboarding.create.title` | Nouveau foyer |
| Onboarding Create household-name label | `onboarding.create.household_name_label` | Nom du foyer |
| Onboarding Create household-name placeholder | `onboarding.create.household_name_placeholder` | Notre cuisine |
| Onboarding Create member-name label | `onboarding.create.member_name_label` | Ton prénom |
| Onboarding Create color label | `onboarding.create.color_label` | Ta couleur |
| Onboarding Create submit | `onboarding.create.submit` | Créer le foyer |
| Onboarding Join header title | `onboarding.join.title` | Rejoindre un foyer |
| Onboarding Join code label | `onboarding.join.code_label` | Code d'invitation |
| Onboarding Join code placeholder | `onboarding.join.code_placeholder` | ABC123 |
| Onboarding Join code helper | `onboarding.join.code_helper` | 6 caractères donnés par ta partenaire |
| Onboarding Join member-name label | `onboarding.join.member_name_label` | Ton prénom |
| Onboarding Join color label | `onboarding.join.color_label` | Ta couleur (les couleurs déjà prises sont grisées) |
| Onboarding Join submit | `onboarding.join.submit` | Rejoindre |
| Share-code header title | `onboarding.share_code.title` | Foyer créé |
| Share-code body | `onboarding.share_code.body` | Partage ce code avec ta partenaire : |
| Share-code copy | `onboarding.share_code.copy_cta` | Copier le code |
| Share-code copied toast | `onboarding.share_code.copied_toast` | Copié dans le presse-papier |
| Share-code done | `onboarding.share_code.done_cta` | J'ai prévenu ma partenaire |
| Onboarding network error | `onboarding.errors.network` | Connexion impossible. Réessaie dans un instant. |
| Onboarding code-not-found | `onboarding.errors.code_not_found` | Ce code n'existe pas. Vérifie auprès de ta partenaire. |
| Onboarding color-taken | `onboarding.errors.color_taken` | Cette couleur est déjà prise. |
| Common back | `common.back` | (existing) |
| Common saving | `common.saving` | Enregistrement… |
| Settings header title | `settings.title` | Paramètres |
| Settings member label | `settings.member_label` | Toi |
| Settings household name label | `settings.household_name_label` | Nom du foyer |
| Settings invite-code label | `settings.invite_code_label` | Code d'invitation |
| Settings invite-code aria | `settings.invite_code_aria` | Code d'invitation du foyer |
| Settings invite-code copy aria | `settings.invite_code_copy_aria` | Copier le code d'invitation |
| Settings invite-code copied toast | `settings.invite_code_copied` | Code copié |
| Settings invite-code copy failed | `settings.invite_code_copy_failed` | Impossible de copier |
| Settings invite-code helper | `settings.invite_code_helper` | Partage ce code avec ton partenaire pour qu'il rejoigne le foyer. |
| Settings export section title | `settings.export_section_title` | Exporter mes données |
| Settings export body | `settings.export_body` | Télécharge toutes tes recettes au format JSON. Utile en cas de pépin. |
| Settings export CTA | `settings.export_cta` | Télécharger mes recettes |
| Settings export error | `settings.export_error` | Téléchargement impossible. Réessaie dans un instant. |
| BottomNav home | `nav.home` | Accueil |
| BottomNav recipes | `nav.recipes` | Recettes |
| BottomNav drafts | `nav.drafts` | À compléter |
| BottomNav more | `nav.more` | Plus |

### Standard contract slots

| Element | Copy |
|---------|------|
| **Primary CTA per surface** | Welcome (Create card): `Créer un foyer` · Welcome (Join card): `Rejoindre un foyer` · Onboarding Create: `Créer le foyer` · Onboarding Join: `Rejoindre` · Share-code: `J'ai prévenu ma partenaire` · Settings export: `Télécharger mes recettes` |
| **Empty state heading (BottomNav inbox badge when no drafts)** | n/a — badge is hidden when `draftCount === 0` (existing behavior). |
| **Empty state body** | n/a — onboarding flows are linear (no empty states); Settings is always populated for an authenticated session. |
| **Error state — onboarding network** | Toast `onboarding.errors.network` — "Connexion impossible. Réessaie dans un instant." |
| **Error state — code not found** | Inline `onboarding.errors.code_not_found` (preserved from existing code). |
| **Error state — color taken** | Inline `onboarding.errors.color_taken` (preserved). |
| **Error state — Settings export failure** | Toast `settings.export_error` — "Téléchargement impossible. Réessaie dans un instant." |
| **Error state — invite code copy failure** | Toast `settings.invite_code_copy_failed` — "Impossible de copier." |
| **Destructive confirmation** | None in Phase 9 scope. (No logout / disconnect Button in current Settings; see §Color destructive note. If executor encounters a logout flow that this UI-SPEC missed, surface in SUMMARY.md before adding chrome.) |

### Copywriting register discipline

- **Tu (informal singular)** throughout — couple-app convention preserved from v0.1.
- **Action verbs first** ("Créer", "Rejoindre", "Copier", "Télécharger") — clear intent over ambiguous nouns.
- **No exclamation points** in onboarding flows. (The only `!` in v0.2 lives on `recipes.promotion.success_toast` — Phase 6 scope.)
- **French diacritics rendered correctly** in all strings — Fraunces and IBM Plex Sans both ship full Latin Extended Plus per Phase 5 §Typography. The Fraunces italic invite-code display does NOT carry diacritics (invite codes are uppercase ASCII), so no diacritic-rendering concern.
- **No new strings.** If a copy gap is identified during execution, raise it as a deviation — do not add silently.

---

## Acceptance Criteria — ONBOARD-07 through ONBOARD-11 + Phase 5 deferral

| Req | Closed by |
|---|---|
| **ONBOARD-07** Household create screen re-themed | §Surface 2 — Create form-body wrapped in paper-grain Card with Fraunces display title; submit + back buttons raised to `h-12`. |
| **ONBOARD-08** Household join (invite-code entry) screen re-themed | §Surface 3 — Join form-body wrapped in paper-grain Card with Fraunces display title; submit + back buttons raised to `h-12`; existing mono input register preserved. |
| **ONBOARD-09** Settings screen re-themed (member color, household, invite code, copy affordance) | §Surface 5 — 3 paper-grain Cards (Membre / Foyer / Sauvegarde) stacked at `gap-6`; invite-code rendered as Fraunces italic terracotta `text-3xl tracking-widest`; copy + export buttons raised to `h-12`. |
| **ONBOARD-10** PWA manifest icon + splash updated to new identity (terracotta backed, simple food symbol — no commissioned art); no rose `#F43F5E` left in manifest | §PWA Identity — `app/icon.tsx` + `app/apple-icon.tsx` NEW files at terracotta `#C8553D` background + cream stroke; `manifest.json` migrated (`#FFFFFF` → `#FAF7F2`, `#0A0A0A` → `#C8553D`); `viewport.themeColor` migrated `#F43F5E` → `#C8553D`; legacy PNGs deleted post-verification. |
| **ONBOARD-11** BottomNav re-themed (icons, active state, badge styling); cool-gray slate/zinc gone from this surface | §Surface 6 — active state migrated to `bg-primary/8` rounded-full pill wash + `text-primary` icon/label; badge migrated to Pressenti-style pill at `h-5`; `text-[11px]` normalized to `text-xs`; cool-gray purge verified via grep. |
| **Phase 5 deferral — `viewport.themeColor` migration** | §PWA Identity — `frontend/app/layout.tsx:46` `#F43F5E` → `#C8553D`. Verified via grep (`grep -rn "F43F5E\|f43f5e" frontend/`). |

### Verification queries (executor smoke checks)

After implementation, these grep queries must pass:

```bash
# 1. No rose F43F5E references remain anywhere in frontend
grep -rn "F43F5E\|f43f5e" frontend/app frontend/public frontend/components 2>&1
# expected: 0 results

# 2. No legacy manifest theme/background colors remain
grep -n "FFFFFF\|0A0A0A" frontend/public/manifest.json 2>&1
# expected: 0 results

# 3. New terracotta + cream literal hex in PWA chrome files
grep -rn "C8553D\|FAF7F2" frontend/app/icon.tsx frontend/app/apple-icon.tsx frontend/app/layout.tsx frontend/public/manifest.json 2>&1
# expected: at least 6 hits (icon.tsx terracotta + cream, apple-icon.tsx terracotta + cream, layout.tsx terracotta, manifest.json both)

# 4. No h-11 on Phase 9 surfaces (onboarding submits, settings buttons, welcome CTAs)
grep -n "h-11" frontend/app/onboarding frontend/app/settings/page.tsx frontend/components/BottomNav.tsx 2>&1
# expected: 0 results on submit / CTA / icon-button surfaces
#  (Input default h-11 from Phase 5 primitive is acceptable; we are checking Button instances.)

# 5. paper-grain on all 5 onboarding/settings surfaces
grep -rn "paper-grain" frontend/app/onboarding frontend/app/settings/page.tsx 2>&1
# expected: at least 5 hits (Welcome 2 cards + Create form-body Card + Join form-body Card + Share-code body Card + Settings 3 cards = 8 hits minimum)

# 6. Fraunces italic invite-code display present on share-code + Settings
grep -rn "font-display italic text-3xl" frontend/app/onboarding/share-code/page.tsx frontend/app/settings/page.tsx 2>&1
# expected: at least 2 hits

# 7. BottomNav active-pill bg-primary/8 wash present
grep -n "bg-primary/8" frontend/components/BottomNav.tsx 2>&1
# expected: at least 1 hit

# 8. BottomNav inbox badge with Pressenti-style classes
grep -n "bg-primary/15\|border-primary/40" frontend/components/BottomNav.tsx 2>&1
# expected: at least 2 hits (one for bg, one for border on the badge)

# 9. No cool-gray slate/zinc references in BottomNav.tsx
grep -nE "text-(slate|zinc)|bg-(slate|zinc)" frontend/components/BottomNav.tsx 2>&1
# expected: 0 results

# 10. No new i18n keys added (compare lib/i18n/fr.json line count)
wc -l frontend/lib/i18n/fr.json 2>&1
# expected: same line count as pre-Phase-9 baseline (no new keys)

# 11. text-display present on Welcome wordmark + onboarding Create/Join body title + share-code body title
grep -rn "text-display" frontend/app/onboarding 2>&1
# expected: at least 4 hits (welcome 1 + create 1 + join 1 + share-code 1)

# 12. h-12 floor confirmed on all Phase 9 Buttons + interactive surfaces
grep -rn "h-12" frontend/app/onboarding frontend/app/settings/page.tsx 2>&1
# expected: at least 8 hits (welcome 2 cards + create submit + create back + join submit + join back + share-code copy + share-code done + settings copy + settings export)
```

### Real-device smoke test (post-implementation)

On iPhone Safari PWA standalone:

1. **Install via "Add to Home Screen":** confirm the home-screen icon shows the new terracotta + cream symbol (pasta-strand or wheat-stem outline on `#C8553D`); the app name reads "Al Dente" beneath. Tap to open.
2. **Splash screen:** confirm the splash shows the icon centered on a warm-cream `#FAF7F2` background (NOT pure white). Status bar tint is terracotta.
3. **Welcome screen** (first install, unauthenticated): confirm wordmark renders in Fraunces italic display register; the two CTA Cards stack with paper-grain visible + 3px terracotta-60 left border + ChevronRight terracotta tint. Tap "Créer un foyer" — advances to Create.
4. **Onboarding Create:** confirm form-body lives in a paper-grain Card with Fraunces italic display title at the top. Inputs render Phase 5 primitive re-themes. Bottom-fixed submit Button at `h-12` reads as terracotta. Submit a household — advances to share-code.
5. **Onboarding Share-code:** confirm body Card with Fraunces italic display title; the invite-code renders in Fraunces italic at `text-3xl tracking-widest text-primary` (terracotta) — visually distinctive. Copy Button at `h-12`. Done CTA at `h-12 w-full` terracotta — taps to home.
6. **BottomNav active state:** at home, confirm Home tab shows the `bg-primary/8` rounded-full pill wash behind the icon + `text-primary` icon/label. Tap Recettes — confirm the wash transitions cleanly (≤150ms) to the Recettes tab.
7. **BottomNav inbox badge:** capture a recipe (Phase 6 surface), return to BottomNav. Confirm the À compléter tab shows a small terracotta-tinted Pressenti-style pill badge at top-right of the icon; the digit reads as a count, not as parens-wrapped text.
8. **Settings screen:** confirm 3 stacked paper-grain Cards (Membre / Foyer / Sauvegarde). The invite-code in the Foyer Card renders identically to the share-code screen (Fraunces italic terracotta `text-3xl tracking-widest`). Copy Button at `h-12 w-12` swaps Copy → Check icon on success + toast. Export Button at `h-12 w-full` terracotta downloads the JSON.
9. **Onboarding Join:** sign out (or use a second iPhone with a fresh install), enter the invite-code from step 5. Confirm the Join screen renders the form-body paper-grain Card with Fraunces italic display title; the invite-code Input keeps mono register (entry mode); submit at `h-12 w-full`.
10. **Reduced-motion:** enable iOS reduce-motion → confirm BottomNav active-state transitions clamp to instant.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | (none — Phase 9 adds zero new primitives; consumes Phase 5 re-themes only) | not required |
| third-party | (none declared) | not applicable |

`frontend/components.json` `registries: {}` confirmed unchanged. No third-party blocks introduced. No vetting required.

---

## Out of Scope (re-stated for executor discipline)

- Phases 5/6/7/8 surfaces — all complete; no re-litigation.
- Adding member avatars / per-member illustrations — V2-UX-02 backlog.
- Manual dark/light toggle UI — productize-later; v0.2 keeps `prefers-color-scheme` auto-switch.
- Multi-household support — v0.1 single-household locked.
- Adding additional locales beyond French — v0.2 French only.
- Commissioned illustration / custom-painted icon — explicitly out of v0.2 per ONBOARD-10.
- Adding `screenshots[]` to `manifest.json` for PWA install promo — productize-later.
- Onboarding deep-link / QR-code share — productize-later.
- Settings: data-export progress UI / scheduled export — out of polish.
- Settings logout / disconnect Button — not in current code; deferred unless executor finds existing wiring.
- BottomNav route additions / removals — chrome retheme only, no navigation structural change.
- Apple-touch-icon link tag in `<head>` — Next.js 16's `app/apple-icon.tsx` resolution handles this automatically per `frontend/node_modules/next/dist/docs/`; no manual `<link rel="apple-touch-icon">` introduced.
- Custom hand-drawn dividers / signatures / ornamental glyphs — Phase 5 anti-pattern, captured as seed `handdrawn-signature-anchor.md` for revisit after v0.2 ships.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (every string sourced from existing `fr.json`; zero new keys; standard contract slots filled with concrete copy; tu-register and no-exclamation discipline preserved)
- [ ] Dimension 2 Visuals: PASS (paper-grain on all 8 Card surfaces — 2 Welcome + 3 onboarding form-body + 1 share-code body + 3 Settings sections; warm shadows on all Cards; terracotta accent applied per the §Color reserved-for list; PWA icon at terracotta + cream solid fill; anti-pattern list explicit including the rose-hex hunt and the manifest legacy-color migration)
- [ ] Dimension 3 Color: PASS (60/30/10 inherited; accent reserved-for list locked to 10 entries — including the PWA-identity literal-hex exceptions in `app/icon.tsx` / `manifest.json` / `layout.tsx`; destructive reserved-for narrowed; cool-gray purge verified on BottomNav.tsx)
- [ ] Dimension 4 Typography: PASS (4 sizes — `text-display`, `text-title`, `text-base`, `text-xs`; **2 authored weights** — 400 (body/helpers/errors) + 500 (display/title/labels/CTAs); 600 (`font-semibold`) is a primitive-level default inherited from Phase 5 shadcn re-themes (sticky-header chrome titles, Button `variant="default"` CTA labels) — Phase 9 authors no new 600 usages; Fraunces italic invite-code display register specified verbatim for share-code + Settings; BottomNav label normalized to `text-xs` — 4-multiple line-height; authored weight count = 2)
- [ ] Dimension 5 Spacing: PASS (4-multiple inherited; tap-target floor 48px enforced on every CTA + onboarding back button + Settings copy/export + Welcome CTA Card interior Link; Phase 9 introduces zero new authored values violating the 4-multiple rule — `px-2.5 py-0.5` and `gap-1.5` from prior phases NOT introduced; BottomNav badge `px-2` chosen explicitly to avoid `px-1.5`)
- [ ] Dimension 6 Registry Safety: PASS (no new registries, no new shadcn primitives, no third-party blocks)

**Approval:** pending
