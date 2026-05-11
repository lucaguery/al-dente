# Phase 9: Onboarding + identity polish - Context

**Gathered:** 2026-05-08
**Status:** Ready for UI-SPEC + planning
**Mode:** Smart discuss (autonomous) — 2 grey areas, mostly defaults; 2 questions overridden in Area 1

<domain>
## Phase Boundary

Bring first-touch and identity surfaces into the Slow Food artisanal design system, closing the Phase 5 deferral on `viewport.themeColor` (rose `#F43F5E` → terracotta `#C8553D`). Surfaces in scope:

- **Onboarding**: `/onboarding/welcome`, `/onboarding/create` (household create), `/onboarding/share-code`, `/onboarding/join` (invite-code entry)
- **Settings** at `/settings`
- **BottomNav** (`components/BottomNav.tsx` — global persistent chrome)
- **PWA identity**:
  - `frontend/app/layout.tsx` — `viewport.themeColor` migration (Phase 5 deferral)
  - `frontend/public/manifest.json` — `theme_color` + `background_color` migration
  - **NEW** `frontend/app/icon.tsx` — Next.js 16 dynamic icon generation (replaces hand-rolled `192.png`/`512.png`)
  - Apple-touch-icon path
- **Identity mark**: simple food-symbol (pasta-strand or wheat-stem outline) on terracotta — NO commissioned art

This phase consumes Phase 5 outputs + Phases 6/7/8 patterns. It does NOT change auth flow, invite-code generation logic, household membership API, or session/cookie wiring — only their visual rendering + the PWA chrome metadata.

**Out of scope:**
- Phases 6/7/8 surfaces (all complete)
- Adding member avatars (cut from v0.1, V2)
- Manual dark/light toggle UI (productize-later)
- Multi-household support (v0.1 single-household locked)
- Adding additional locales beyond French (v0.2 French only)
- Commissioned illustration / custom-painted icon (explicitly out of v0.2 per ONBOARD-10)

</domain>

<decisions>
## Implementation Decisions

### PWA Identity

- **Identity direction**: Simple food symbol (pasta-strand or wheat-stem outline) on terracotta `#C8553D` background. Reads as Slow Food artisanal, less brand-typographic. No commissioned art — paths defined in JSX/SVG inside `app/icon.tsx`.
- **Icon generation**: Use Next.js 16 `frontend/app/icon.tsx` (and `apple-icon.tsx`) — Vercel auto-generates icons via `ImageResponse` at build time. Zero new dependencies (no `sharp`, no `@resvg/resvg-cli`). Keep the existing `192.png` / `512.png` files in `frontend/public/` if they conflict with the new auto-generated icons; otherwise delete them after confirming the App Router resolution works (Next.js prefers `app/icon.tsx` when present per Next.js 16 docs).
- **`viewport.themeColor`** in `frontend/app/layout.tsx`: change from `#F43F5E` (rose) to `#C8553D` (terracotta literal hex; matches `oklch(0.595 0.135 35)` round-trip). Closes Phase 5 deferral.
- **`manifest.json` colors**:
  - `theme_color`: `#C8553D` (terracotta)
  - `background_color`: `#FAF7F2` (warm cream; matches `bg-background` light-mode token)
  - `name`: preserved as "Al Dente"
  - `short_name`: preserved
  - `description`: preserved unless ICU brevity forces a tweak (none expected)

### Onboarding Flow (Welcome → Create → Share-code → Join)

- **Per-screen layout**: centered paper-grain Card on `bg-background`; Fraunces display title (`text-display`) for the primary headline; IBM Plex Sans body copy; sticky `h-12 w-full` primary CTA pinned to the bottom of the card / page.
- **Welcome screen**: hero treatment — Fraunces italic display headline ("Bienvenue chez Al Dente." or existing copy), brief 1-2 line body, two CTAs (`Créer un foyer` / `Rejoindre un foyer`) as a stacked pair of paper-grain Cards (mirroring Phase 6 D-Voice callout pattern but interactive — both at h-12).
- **Create screen**: paper-grain Card with `<Input>` for household name; sticky bottom CTA `Créer le foyer` at h-12.
- **Share-code screen**: paper-grain Card showing the generated invite code in **Fraunces italic at `text-3xl`** with `tracking-widest` for legibility (cookbook-recipe-card-number gesture); copy Button (ghost variant) renders `Copy` icon → swaps to `Check` icon on success + toast confirmation; reuse existing toast keys.
- **Join screen**: paper-grain Card with `<Input>` for invite code (uppercase styling preserved); existing validation copy preserved; sticky bottom CTA at h-12.
- **Reuse**: existing Phase 5 Input + Button primitives, existing OnboardingGuard wrapper, existing `next-intl` keys — zero new keys.

### Settings Screen

- **Layout**: three paper-grain Cards stacked with `gap-6`:
  1. **Membre** — color attribution swatch (existing `MemberDot` component) + member name/role
  2. **Foyer** — household name + **invite-code in Fraunces italic** (consistent with share-code) + Copy button (ghost + Check swap)
  3. **Sauvegarde** — JSON export action button + last-export timestamp if available
- **Sticky header**: existing pattern preserved (back button + screen title in IBM Plex Sans `text-base font-semibold`).
- **Logout / disconnect**: at the bottom of the screen as a destructive-secondary Button (ghost variant with `text-destructive`); preserves existing logout flow.
- **No structural rewrite** — same data flow, same handlers.

### BottomNav

- **Icon set**: existing Lucide icons preserved at `h-6 w-6`.
- **Default state**: `text-foreground-muted` (warm gray).
- **Active state**: `text-primary` (terracotta) icon + `bg-primary/8` rounded-pill background behind the icon (same `bg-primary/8` wash used in Phase 8 CookingBanner — pattern continuity).
- **Badge** (inbox unread count): use the Phase 7 Pressenti pill style — `bg-primary/15 text-primary border border-primary/40 px-2 py-1 text-xs font-medium rounded-full` — but at `h-5 not h-8` (shrink for nav-bar density). Position: top-right of the icon as small overlay.
- **Active-state transition**: `transition-colors transition-transform duration-150 ease-craft` on the icon and its background (Phase 5 motion vocab); honor `prefers-reduced-motion` via existing globals.css clamp.
- **Cool-gray purge**: any remaining `text-slate-*` / `text-zinc-*` / `bg-zinc-*` references in `BottomNav.tsx` get replaced with `text-foreground-muted` / `bg-card` tokens (success criterion 3 explicit).

### Phase 5 `themeColor` Deferral Closure

- **Problem**: Phase 5 verification deferred `viewport.themeColor: "#F43F5E"` (legacy rose) in `layout.tsx`. ONBOARD-10 success criterion 4 requires "no rose `#F43F5E` left in the manifest."
- **Fix**: change line `themeColor: "#F43F5E"` → `themeColor: "#C8553D"` in `layout.tsx` viewport export. ALSO ensure `manifest.json` `theme_color` matches.
- **Verification**: grep `F43F5E` → 0 hits across `frontend/app/`, `frontend/public/`.

### Identity-Mark Implementation Sketch (`app/icon.tsx`)

```tsx
import { ImageResponse } from 'next/og'

export const size = { width: 256, height: 256 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ background: '#C8553D', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
        {/* simple wheat-stem or pasta-strand outline as inline SVG */}
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" stroke="#FAF7F2" strokeWidth="6" strokeLinecap="round">
          {/* outline path TBD by executor — kept simple, ~6-8 path segments */}
        </svg>
      </div>
    ),
    size,
  )
}
```

A sibling `apple-icon.tsx` (180×180) follows the same pattern with size override.

### Claude's Discretion
- Exact pasta-strand vs wheat-stem path geometry — pick whichever rasterizes cleanest at 32px (Safari favicon scale) with the chosen `strokeWidth`. Document choice in SUMMARY.md with one-line rationale.
- Whether to keep the existing `192.png`/`512.png` PNG files in `public/` as Apple-fallback chains, or delete them after confirming `app/icon.tsx` covers all sizes per Next.js 16 docs (consult `frontend/node_modules/next/dist/docs/` per CLAUDE.md drift warning).
- Exact `tracking-widest` vs `tracking-wider` for the invite-code Fraunces italic display — try `tracking-widest` first; visually verify on iPhone.
- Whether to extract a shared `OnboardingCard.tsx` wrapper for the 4 onboarding screens, or keep the layout inline — judgment call based on duplication.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets (post-Phase-5/6/7/8)
- `frontend/components/ui/{card,button,input}.tsx` — Phase 5 re-themed primitives
- `frontend/components/MemberDot.tsx` — existing color-attribution dot
- Phase 6 D-Voice callout pattern (paper-grain Card + Fraunces italic) — mirrored for the welcome CTA pair
- Phase 7 chipClass helper — reused for the BottomNav inbox badge
- Phase 8 CookingBanner `bg-primary/8` wash — mirrored for BottomNav active state
- `frontend/lib/motion.ts` — Phase 5 motion presets

### Established Patterns
- Onboarding routes: `/onboarding/{welcome,create,share-code,join}/page.tsx`
- Settings route: `/settings/page.tsx`
- BottomNav: persistent global chrome in `components/BottomNav.tsx`
- PWA: `frontend/app/layout.tsx` viewport export (Next.js 16 pattern); `frontend/public/manifest.json`; existing PNG icons that may be deprecated
- next-intl keys: `onboarding.welcome.*`, `onboarding.create.*`, `onboarding.join.*`, `onboarding.share_code.*`, `settings.*`, `nav.*`

### Integration Points
- `frontend/app/layout.tsx` — viewport.themeColor migration (Phase 5 deferral)
- `frontend/public/manifest.json` — theme_color + background_color migration
- `frontend/app/icon.tsx` — NEW (Next.js 16 ImageResponse for app icon)
- `frontend/app/apple-icon.tsx` — NEW (Apple-touch-icon equivalent)
- `frontend/app/onboarding/welcome/page.tsx` (45 LOC; retheme + dual paper-grain CTA cards)
- `frontend/app/onboarding/create/page.tsx` (142 LOC; retheme + h-12 CTA)
- `frontend/app/onboarding/share-code/page.tsx` (85 LOC; retheme + Fraunces italic invite code)
- `frontend/app/onboarding/join/page.tsx` (263 LOC; retheme + h-12 CTA)
- `frontend/app/settings/page.tsx` (165 LOC; 3-section paper-grain Card layout)
- `frontend/components/BottomNav.tsx` (119 LOC; icon-state retheme + Pressenti-style badge)

### Constraints from Prior Phases / Project
- Phase 5 token names locked
- Phases 6/7/8 patterns established
- French only via next-intl — zero new keys
- iOS Safari 17+ PWA standalone is the rendering target — themeColor and manifest values must be valid hex for iOS Safari
- Solo dev, ~1 weekend budget — keep PWA identity simple (no commissioned art)
- D-08 floor 48px on interactive controls
- v0.1 token names must NOT break

</code_context>

<specifics>
## Specific Ideas

- **Welcome CTA pair** (paper-grain Cards, both interactive):
  ```tsx
  <div className="flex flex-col gap-3">
    <Card className="paper-grain shadow-card border-l-[3px] border-primary/60 p-4 hover:bg-card/95 transition-colors">
      <Link href="/onboarding/create" className="flex items-center justify-between h-12">
        <span className="font-display italic text-base">Créer un nouveau foyer</span>
        <ChevronRight />
      </Link>
    </Card>
    <Card className="paper-grain shadow-card border-l-[3px] border-primary/60 p-4 hover:bg-card/95 transition-colors">
      <Link href="/onboarding/join" className="flex items-center justify-between h-12">
        <span className="font-display italic text-base">Rejoindre un foyer existant</span>
        <ChevronRight />
      </Link>
    </Card>
  </div>
  ```
- **Invite-code display** (share-code + Settings):
  ```tsx
  <div className="font-display italic text-3xl tracking-widest text-center py-4 text-primary">
    {code}
  </div>
  ```
- **BottomNav active state** (per item):
  ```tsx
  <Link className={cn(
    "flex items-center justify-center h-12 w-12 rounded-full transition-colors transition-transform duration-150 ease-craft",
    isActive && "bg-primary/8 text-primary",
    !isActive && "text-foreground-muted"
  )}>
    <Icon className="h-6 w-6" />
    {badge && <Badge ... />}
  </Link>
  ```
- **Settings Section card**:
  ```tsx
  <Card className="paper-grain shadow-card p-6 flex flex-col gap-4">
    <h2 className="text-title">{t("section.title")}</h2>
    {/* section body */}
  </Card>
  ```
- **`app/icon.tsx`** sketch (see decisions §Identity-Mark Implementation Sketch above) — exact path geometry left to executor judgment.

</specifics>

<deferred>
## Deferred Ideas

- Member avatars / per-member illustrations — V2-UX-02 backlog
- Multi-household support — v0.1 single-household locked
- Manual dark/light toggle UI — productize-later
- Commissioned illustration / custom-painted icon — explicitly out of v0.2 scope
- French alternates / accents in invite-code display (preserve uppercase ASCII per existing v0.1 logic)
- App icon hand-painted assets in `public/icons/*` — current 192.png/512.png either retained as legacy or deleted per Next.js 16 resolution behavior (see Discretion)
- Adding `screenshots[]` to `manifest.json` for PWA install promo — productize-later
- Onboarding deep-link / QR-code share — productize-later
- Settings: data-export progress UI / scheduled export — out of polish

</deferred>
