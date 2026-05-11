---
phase: 01-foundations-w1
plan: 02
plan_number: 2
slug: frontend-scaffold
type: execute
wave: 2
depends_on: [shared-vocab]
files_modified:
  - frontend/package.json
  - frontend/next.config.ts
  - frontend/app/layout.tsx
  - frontend/app/page.tsx
  - frontend/app/globals.css
  - frontend/middleware.ts
  - frontend/i18n.ts
  - frontend/lib/i18n/fr.json
  - frontend/lib/api.ts
  - frontend/lib/datetime.ts
  - frontend/components/BottomNav.tsx
  - frontend/components/EmptyState.tsx
  - frontend/components/MemberDot.tsx
  - frontend/components/LocaleProvider.tsx
  - frontend/components.json
  - frontend/components/ui/button.tsx
  - frontend/components/ui/input.tsx
  - frontend/components/ui/label.tsx
  - frontend/components/ui/card.tsx
  - frontend/components/ui/badge.tsx
  - frontend/components/ui/sheet.tsx
  - frontend/components/ui/dialog.tsx
  - frontend/components/ui/sonner.tsx
  - frontend/components/ui/skeleton.tsx
  - frontend/components/ui/separator.tsx
  - frontend/components/ui/scroll-area.tsx
  - frontend/components/ui/textarea.tsx
  - frontend/components/ui/select.tsx
  - frontend/components/ui/alert-dialog.tsx
  - frontend/components/ui/tabs.tsx
  - frontend/public/manifest.json
  - frontend/public/icons/192.png
  - frontend/public/icons/512.png
autonomous: false
requirements: [INFRA-01, INFRA-04, PWA-01, PWA-02, PWA-04]
must_haves:
  truths:
    - "App installs on iPhone Safari via Share → Add to Home Screen and launches fullscreen"
    - "Service worker is registered and the app shell loads with no network on second launch"
    - "All visible strings come from frontend/lib/i18n/fr.json (no hardcoded JSX text)"
    - "Frontend deploys to Vercel on push to main"
  artifacts:
    - path: "frontend/public/manifest.json"
      provides: "PWA manifest with name/short_name, 192+512 icons, display=standalone"
    - path: "frontend/next.config.ts"
      provides: "next-pwa plugin wired with default runtime cache strategies"
    - path: "frontend/i18n.ts"
      provides: "next-intl request config (locale=fr)"
    - path: "frontend/lib/i18n/fr.json"
      provides: "French message catalog seed (onboarding/nav/common keys)"
    - path: "frontend/app/layout.tsx"
      provides: "Root layout with LocaleProvider, safe-area insets, Geist fonts, BottomNav slot"
    - path: "frontend/components/BottomNav.tsx"
      provides: "Fixed bottom nav with 4 tabs (Accueil/Recettes/À compléter/Plus)"
  key_links:
    - from: "frontend/app/layout.tsx"
      to: "frontend/i18n.ts"
      via: "NextIntlClientProvider with messages from fr.json"
      pattern: "NextIntlClientProvider"
    - from: "frontend/next.config.ts"
      to: "next-pwa"
      via: "plugin wrapper exporting nextConfig"
      pattern: "next-pwa|withPWA"
---

<objective>
Stand up the frontend PWA shell so both phones can install Al Dente from Safari → Add to Home Screen and launch fullscreen, with `next-intl` French message catalog wired from day one and shadcn/ui primitives in place. Replaces the create-next-app boilerplate with the real layout (Geist font already set, plus iOS safe-area insets, BottomNav, EmptyState placeholders). Also ships a deployable Vercel build (push to main → live).

Purpose: PWA-01 / PWA-02 / PWA-04 / INFRA-04 / INFRA-01. Honors UI-SPEC.md §"Layout & Navigation", §"Color", §"Typography", §"Component Inventory" for Phase 1.
Output: Installable PWA shell on Vercel, French i18n active, shadcn primitives committed, BottomNav rendering on home/recipes/inbox/settings.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundations-w1/01-CONTEXT.md
@.planning/phases/01-foundations-w1/01-UI-SPEC.md
@SPEC.md
@CLAUDE.md
@frontend/AGENTS.md
@frontend/app/layout.tsx
@frontend/app/page.tsx
@frontend/app/globals.css
@frontend/tsconfig.json
@frontend/next.config.ts
@frontend/package.json
@frontend/lib/colors.ts
</context>

<interfaces>
Existing scaffold (do not break):
- `frontend/app/layout.tsx` already imports Geist Sans + Geist Mono via `next/font/google` and exports `RootLayout({ children })`. Keep the font import; replace the metadata + body wiring per UI-SPEC.
- `frontend/app/globals.css` already declares `--color-background`, `--color-foreground`, `--font-sans`, `--font-mono` and a dark-mode `prefers-color-scheme` block. Extend the existing `@theme inline` block; do NOT replace it.
- `frontend/tsconfig.json` already has `paths: { "@/*": ["./*"] }` — use `@/components/...`, `@/lib/...` imports.

From the prior plan:
- `frontend/lib/colors.ts` exports `MEMBER_COLORS` and `isValidMemberColor`.
- `frontend/lib/enums.ts` exports `Season`, `Cuisine`, `Mood`, `Protein` (used by 01-08, not this plan).
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Install dependencies, init shadcn/ui, paste primitives, configure next-pwa + next-intl</name>
  <files>frontend/package.json, frontend/next.config.ts, frontend/components.json, frontend/components/ui/* (15 primitives), frontend/i18n.ts, frontend/middleware.ts, frontend/lib/i18n/fr.json, frontend/public/manifest.json, frontend/public/icons/192.png, frontend/public/icons/512.png</files>
  <read_first>
    - frontend/AGENTS.md (Next.js 16 may differ from training data)
    - frontend/node_modules/next/dist/docs/01-app/ (consult for current App Router APIs before writing layout/middleware code — INDEX FIRST, then read the specific page you need)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Component Inventory > shadcn/ui primitives in scope" (the closed list of 15 primitives to add)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Color" (token names to add to globals.css)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Typography" (4 sizes + 2 weights rule)
    - For next-intl + next-pwa setup details, query Context7 (mcp__context7__) with the exact installed versions before writing config — these libs evolve quickly and training data may be stale. If Context7 is unavailable, fall back to package READMEs in node_modules.
  </read_first>
  <action>
    From `frontend/`:

    1. Install runtime deps: `npm install next-intl next-pwa partysocket sonner lucide-react class-variance-authority clsx tailwind-merge @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-label @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-tabs @radix-ui/react-scroll-area @radix-ui/react-alert-dialog`. (Pick the latest compatible major. `partysocket` is the chosen reconnect library per architecture_constraints — used in 01-05; we install it now to keep dep work in one plan.)
    2. Init shadcn/ui: `npx shadcn@latest init` non-interactively where possible. Accept Tailwind v4 defaults. Resulting `frontend/components.json` MUST set `"$schema": "https://ui.shadcn.com/schema.json"`, `"style": "default"`, `"rsc": true`, `"tsx": true`, `"tailwind": { "css": "app/globals.css", "baseColor": "neutral", "cssVariables": true }`, aliases `{ "components": "@/components", "ui": "@/components/ui", "lib": "@/lib", "utils": "@/lib/utils" }`. If `npx shadcn init` writes a different `baseColor`, fix to `neutral` to match UI-SPEC §Color.
    3. Add primitives: `npx shadcn@latest add button input label card badge sheet dialog sonner skeleton separator scroll-area textarea select alert-dialog tabs`. (15 components, the closed UI-SPEC list.) Verify each lands under `frontend/components/ui/<name>.tsx`.
    4. Wrap `next.config.ts` with `next-pwa`. Use the standard pattern (consult next-pwa README in `frontend/node_modules/next-pwa/`). Output PWA assets to `public/`. In dev, set `disable: process.env.NODE_ENV === 'development'`. Register app-shell precache + runtime NetworkFirst for `/api/*` (per UI-SPEC §Loading states "next-pwa defaults"). Do NOT tune cache strategies further — per CONTEXT.md "Service worker cache: next-pwa defaults only in W1".
    5. Configure `next-intl`:
        - Create `frontend/i18n.ts` exporting the `getRequestConfig` per next-intl App Router docs, with `locale: 'fr'` and `messages` loaded from `frontend/lib/i18n/fr.json`.
        - Create `frontend/middleware.ts` per next-intl middleware docs (locale=fr only, no detection — single locale in v0.1).
        - Create `frontend/lib/i18n/fr.json` with this seed catalog (extend in later plans):
          ```json
          {
            "common": { "saving": "Enregistrement…", "saved": "Enregistré", "cancel": "Annuler", "back": "Retour" },
            "nav": { "home": "Accueil", "recipes": "Recettes", "drafts": "À compléter", "more": "Plus" },
            "home": { "title": "Al Dente", "tagline": "Décide ce qu'on mange ensemble." },
            "install": {
              "title": "Installe Al Dente sur ton écran d'accueil",
              "body": "Appuie sur Partager (icône carré + flèche) puis « Sur l'écran d'accueil »."
            }
          }
          ```
    6. Create `frontend/public/manifest.json`:
       ```json
       {
         "name": "Al Dente",
         "short_name": "Al Dente",
         "description": "Décide ce qu'on mange ensemble.",
         "start_url": "/",
         "display": "standalone",
         "background_color": "#FFFFFF",
         "theme_color": "#0A0A0A",
         "lang": "fr",
         "icons": [
           { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
           { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
         ]
       }
       ```
    7. Generate placeholder icons (`192.png`, `512.png`) — solid `#0A0A0A` background with the wordmark "AD" centered in white Geist Sans-equivalent. ImageMagick is the simplest path: `magick -size 512x512 xc:'#0A0A0A' -gravity center -fill white -font Helvetica-Bold -pointsize 220 -annotate +0+0 'AD' frontend/public/icons/512.png` and a 192px variant. If ImageMagick is not available, use `sharp` from npm in a one-off node script. These are tasteful placeholders — designer pass is V2-UX-02.
    8. Mark anywhere in code where the Vercel deploy hostname will be hardcoded with `// TODO(productize)` once Vercel assigns a domain — this happens in Task 2's checkpoint, but if `NEXT_PUBLIC_API_BASE` is referenced anywhere (e.g., `frontend/lib/api.ts` if you create it here), use `process.env.NEXT_PUBLIC_API_BASE!`.
  </action>
  <verify>
    <automated>cd frontend && test -f components.json && test -f i18n.ts && test -f middleware.ts && test -f lib/i18n/fr.json && test -f public/manifest.json && test -f public/icons/192.png && test -f public/icons/512.png && test -f components/ui/button.tsx && test -f components/ui/input.tsx && test -f components/ui/sonner.tsx && test -f components/ui/alert-dialog.tsx && test -f components/ui/tabs.tsx && grep -q "next-pwa\|withPWA" next.config.ts && grep -q "Décide ce qu'on mange ensemble" lib/i18n/fr.json && grep -q '"lang": "fr"' public/manifest.json && grep -q '"display": "standalone"' public/manifest.json && npm run build</automated>
  </verify>
  <done>All 15 shadcn primitives present in `components/ui/`; manifest + icons + i18n config in place; `npm run build` succeeds (proving next-pwa + next-intl integrate without TS or build errors).</done>
</task>

<task type="auto">
  <name>Task 2: Replace boilerplate layout/page; add LocaleProvider, BottomNav, MemberDot, EmptyState, api.ts, datetime.ts; update globals.css tokens</name>
  <files>frontend/app/layout.tsx, frontend/app/page.tsx, frontend/app/globals.css, frontend/components/LocaleProvider.tsx, frontend/components/BottomNav.tsx, frontend/components/MemberDot.tsx, frontend/components/EmptyState.tsx, frontend/lib/api.ts, frontend/lib/datetime.ts</files>
  <read_first>
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Color > Surface palette (60/30/10)" — list of CSS variables to add (`--color-surface-muted`, `--color-border`, `--color-foreground-muted`, `--color-primary`, `--color-destructive`)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Layout & Navigation > Bottom navigation" + §"Surface-by-Surface Pinning" §5
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Surface-by-Surface Pinning" §12 (PWA install hint — out of scope for this task; the home page just shows the install hint card)
    - frontend/app/globals.css (existing tokens to extend — DO NOT REPLACE)
    - frontend/app/layout.tsx (existing Geist font wiring to KEEP)
  </read_first>
  <action>
    1. Extend `frontend/app/globals.css` — add inside the existing `@theme inline { ... }` block (do not duplicate the block):
       ```css
       --color-surface-muted: #F4F4F5;
       --color-border: #E4E4E7;
       --color-foreground-muted: #52525B;
       --color-primary: #0A0A0A;
       --color-destructive: #DC2626;
       ```
       Add a dark-mode override block (mirroring the existing `:root` dark block) with:
       ```css
       --color-surface-muted: #18181B;
       --color-border: #27272A;
       --color-foreground-muted: #A1A1AA;
       --color-primary: #FAFAFA;
       --color-destructive: #EF4444;
       ```
       Replace the body's `font-family: Arial, Helvetica, sans-serif;` with `font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif;`. Add a global `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0ms !important; transition-duration: 0ms !important; } }` per UI-SPEC §Motion.

    2. Rewrite `frontend/app/layout.tsx`:
       - Keep Geist + Geist_Mono imports (already there).
       - Set `<html lang="fr">` (was "en").
       - Set metadata `title: "Al Dente"`, `description: "Décide ce qu'on mange ensemble."`, `manifest: "/manifest.json"`, `themeColor: "#0A0A0A"` (or use the metadata API per Next.js 16 — consult `frontend/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`).
       - Wrap children in `<NextIntlClientProvider locale="fr" messages={messages}>` (load via the next-intl App Router pattern).
       - On `<body>`, apply UI-SPEC §"Safe-area insets": `style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}` + `className="min-h-full flex flex-col bg-background text-foreground"`.
       - Mount `<BottomNav />` at the end of `<body>` (it's `position: fixed` so it can live in any layout). The bottom-nav is conditionally hidden on `/onboarding/*` routes — implement using `useSelectedLayoutSegment()` inside the BottomNav component itself (return `null` when the segment starts with `onboarding`).

    3. `frontend/components/LocaleProvider.tsx`: thin client wrapper around `<NextIntlClientProvider>` if needed for "use client" boundary. Per next-intl App Router docs, this is sometimes inlined in layout — pick whichever the docs say is current.

    4. `frontend/components/BottomNav.tsx`:
       - `"use client"` (uses `useSelectedLayoutSegment`).
       - Renders a `<nav>` matching UI-SPEC §"Layout & Navigation > Bottom navigation": `fixed bottom-0 inset-x-0 h-16 bg-surface-muted border-t border-border flex pb-[env(safe-area-inset-bottom)]`.
       - 4 tabs as Next `<Link>` items: `/` (Home icon, label `t('nav.home')` = "Accueil"), `/recipes` (BookOpen, "Recettes"), `/inbox` (Inbox, "À compléter" with optional `(N)` badge — N is `0` for now; 01-07 wires the live count), `/settings` (MoreHorizontal, "Plus").
       - Each tab cell: `flex flex-col items-center justify-center flex-1 gap-1 text-[10px] font-medium`. Inactive: `text-foreground-muted`. Active: `text-foreground` + a 2px `h-0.5 w-8 bg-primary` bar at top (use `::before` via Tailwind utilities or a sibling `<span>`).
       - Hidden on onboarding routes (return null) — `useSelectedLayoutSegment()`.
       - Lucide icons from `lucide-react`.

    5. `frontend/components/MemberDot.tsx`:
       ```tsx
       export function MemberDot({ colorHex, size = 12 }: { colorHex: string; size?: number }) {
         return (
           <span
             aria-hidden
             className="rounded-full inline-block flex-shrink-0"
             style={{ background: colorHex, width: size, height: size }}
           />
         );
       }
       ```

    6. `frontend/components/EmptyState.tsx` matching UI-SPEC §"Copywriting > Empty states" shape: `flex flex-col items-center text-center px-6 py-12 gap-3`. Props: `icon: LucideIcon`, `heading: string`, `body: string`, `cta?: { label: string; href: string }`. Icon at 48px (`text-foreground-muted`).

    7. `frontend/lib/api.ts` — fetch wrapper:
       ```ts
       const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
       export async function api<T>(path: string, init?: RequestInit): Promise<T> {
         const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
         const headers = new Headers(init?.headers);
         if (token) headers.set("Authorization", `Bearer ${token}`);
         if (init?.body && !headers.has("Content-Type") && !(init.body instanceof FormData))
           headers.set("Content-Type", "application/json");
         const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
         if (res.status === 401 && typeof window !== "undefined") {
           localStorage.removeItem("auth_token");
           window.location.href = "/onboarding/welcome";
           throw new Error("unauthorized");
         }
         if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
         return res.headers.get("content-type")?.includes("application/json") ? res.json() : (undefined as T);
       }
       ```

    8. `frontend/lib/datetime.ts` per UI-SPEC §"Relative dates":
       ```ts
       export function formatRelativeFr(date: Date | string | null): string {
         if (!date) return "jamais cuisinée";
         const d = typeof date === "string" ? new Date(date) : date;
         const diffDays = Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
         return new Intl.RelativeTimeFormat("fr", { numeric: "auto" }).format(diffDays, "day");
       }
       ```

    9. Replace `frontend/app/page.tsx` with a placeholder home (the real home content is W3 territory): a centered card showing the install hint per UI-SPEC §12 — wordmark "Al Dente" + tagline + the install card (visible only on iOS Safari without `navigator.standalone`). All strings via `useTranslations()` from next-intl. NO hardcoded French text — use `t('home.title')`, `t('home.tagline')`, `t('install.title')`, `t('install.body')`.
  </action>
  <verify>
    <automated>cd frontend && grep -q '"fr"' app/layout.tsx && grep -q "manifest.json" app/layout.tsx && grep -q "safe-area-inset" app/layout.tsx && grep -q "BottomNav" app/layout.tsx && grep -q "color-surface-muted" app/globals.css && grep -q "color-foreground-muted" app/globals.css && grep -q "prefers-reduced-motion" app/globals.css && test -f components/BottomNav.tsx && test -f components/MemberDot.tsx && test -f components/EmptyState.tsx && test -f lib/api.ts && test -f lib/datetime.ts && grep -q "Authorization" lib/api.ts && grep -q "Bearer" lib/api.ts && grep -q "auth_token" lib/api.ts && ! grep -E '>(Welcome|Get started|edit the page)' app/page.tsx && npm run lint && npm run build</automated>
  </verify>
  <done>Build passes lint + production. Layout uses `lang="fr"`, registers manifest, applies safe-area insets, mounts BottomNav. Globals.css has all 5 new color tokens (light + dark) and reduced-motion rule. api.ts attaches Bearer token + handles 401 by clearing token and redirecting to welcome. page.tsx no longer contains any boilerplate strings.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Deploy to Vercel + verify PWA install on iPhone Safari</name>
  <what-built>
    Frontend PWA shell deployed to Vercel:
    - Manifest + icons registered
    - next-pwa service worker precaching app shell
    - next-intl French strings rendering
    - BottomNav fixed at bottom with safe-area inset
    - Install hint card visible on iOS Safari
  </what-built>
  <how-to-verify>
    Claude has run `vercel --yes --prod` from `frontend/` (link the project to GitHub if not already) and reports the deploy URL. Then on YOUR iPhone:

    1. Open the Vercel URL in **Safari** (not Chrome — PWA install on iOS is Safari-only).
    2. Confirm the page renders fullscreen-ish with no errors. Confirm the "Décide ce qu'on mange ensemble." tagline appears (proves next-intl works).
    3. Tap the Share icon (square + arrow) → scroll to "Sur l'écran d'accueil" / "Add to Home Screen". The icon shown should be the placeholder "AD" black-square (not the default Vercel favicon).
    4. Tap Add. Launch the new home-screen icon. The app should open **fullscreen with NO Safari URL bar**. Bottom-nav should sit above the iOS home-indicator (not under it).
    5. On the second phone, repeat steps 1-4. Both phones must launch fullscreen.
    6. Close the app, kill Safari background, turn on Airplane Mode, relaunch from home-screen. The shell should still load (proves service-worker precache).

    If any step fails, report what you saw — common culprits: manifest.json wrong content-type, icons missing alpha, scope mismatch, service worker not registered. Claude will diagnose.
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues. Note: this checkpoint is the front half of the W1 dogfood gate — the full ping round-trip is verified at the end of plan 01-05.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → next-pwa cached assets | Service worker controls all GET responses; can serve stale data |
| browser localStorage | `auth_token` lives here per SPEC.md §Onboarding |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-01-02-01 | Information Disclosure | hardcoded user-facing strings leak product copy in source | low | mitigate | All strings via next-intl from day one (Task 2). PWA-04. |
| T-01-02-02 | Tampering | service-worker serves stale auth-protected data after token revoked | medium | mitigate | next-pwa default is NetworkFirst for `/api/*` (Task 1, step 4); api.ts wipes token + redirects to /onboarding on 401 (Task 2, step 7). |
| T-01-02-03 | Tampering | localStorage XSS exfiltrates auth_token | medium | accept | Single-tenant household app, no third-party scripts loaded; next.config.ts default CSP from Vercel suffices for v0.1. Hardening = productize-later. `// TODO(productize)` documented at top of api.ts. |
| T-01-02-04 | Denial of Service | placeholder icon files corrupt → manifest fails to install | low | mitigate | Verify task 1 produces valid PNGs; Task 3 checkpoint visually confirms install-icon renders. |
| T-01-02-05 | Spoofing | install hint shown when already installed (no `navigator.standalone` check) confuses user | low | mitigate | Hint card hidden when `navigator.standalone === true` per UI-SPEC §12 (Task 2 step 9). |

No `high` threats in this plan. Auth surface is in 01-03 (middleware) and 01-04 (token issuance). The `auth_token` localStorage threat is acknowledged-and-deferred per the v0.1 audience.
</threat_model>

<verification>
Manual:
- Vercel deploy URL is reachable.
- iPhone Safari install succeeds; both phones launch fullscreen.
- Bottom nav visible on `/`, hidden on `/onboarding/welcome` (will be created in 01-04 — verify after that plan).
- Airplane-mode relaunch shows app shell.
- `grep -RE '">[A-Z][a-zà-ÿ ]{4,}<"' frontend/app frontend/components` returns zero hits (no hardcoded JSX strings).
</verification>

<success_criteria>
INFRA-01 ✓ Vercel auto-deploys from main on push.
INFRA-04 ✓ Both phones install via Add to Home Screen and launch fullscreen.
PWA-01 ✓ Manifest + 192/512 icons registered.
PWA-02 ✓ Service worker via next-pwa caches app shell (airplane-mode launch works).
PWA-04 ✓ All strings come from next-intl French catalog (no hardcoded JSX text).
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundations-w1/01-02-SUMMARY.md` documenting Vercel deploy URL, the chosen next-intl/next-pwa versions, and any UI-SPEC interpretations made (e.g., install-hint detection logic).
</output>
