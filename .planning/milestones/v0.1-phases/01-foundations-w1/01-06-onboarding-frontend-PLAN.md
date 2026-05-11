---
phase: 01-foundations-w1
plan: 06
plan_number: 6
slug: onboarding-frontend
type: execute
wave: 4
depends_on: [frontend-scaffold, onboarding-backend]
files_modified:
  - frontend/lib/i18n/fr.json
  - frontend/lib/auth.ts
  - frontend/lib/onboarding-guard.tsx
  - frontend/components/ColorSwatchPicker.tsx
  - frontend/app/onboarding/welcome/page.tsx
  - frontend/app/onboarding/create/page.tsx
  - frontend/app/onboarding/join/page.tsx
  - frontend/app/onboarding/share-code/page.tsx
  - frontend/app/onboarding/layout.tsx
  - frontend/app/page.tsx
autonomous: false
requirements: [ONBOARD-01, ONBOARD-03, ONBOARD-04, ONBOARD-05, ONBOARD-06]
must_haves:
  truths:
    - "First-launch user sees Welcome → picks Create → fills form → POSTs to backend → sees Share Code → routes to /"
    - "First-launch user sees Welcome → picks Join → enters code → preview disables creator's color → fills form → POSTs to backend → routes to /"
    - "After successful create or join, auth_token is in localStorage and the next launch goes straight to / (skips onboarding)"
    - "On / (home), the bottom nav is visible; on /onboarding/* the bottom nav is hidden"
    - "Color swatch already taken (returned by GET /households/by-code/{code}) renders disabled with a Lock icon and cannot be selected"
    - "All copy comes from frontend/lib/i18n/fr.json (no hardcoded JSX strings)"
  artifacts:
    - path: "frontend/components/ColorSwatchPicker.tsx"
      provides: "5-swatch picker with disabled state per UI-SPEC §Color > Member colors"
    - path: "frontend/lib/auth.ts"
      provides: "saveAuthToken / clearAuthToken / getAuthToken / hasOnboarded localStorage helpers"
    - path: "frontend/app/onboarding/welcome/page.tsx"
      provides: "Welcome screen with Créer / Rejoindre CTAs"
    - path: "frontend/app/onboarding/create/page.tsx"
      provides: "Create-foyer form (household_name, member_name, color_hex)"
    - path: "frontend/app/onboarding/join/page.tsx"
      provides: "Join form with code-preview-driven swatch picker"
    - path: "frontend/app/onboarding/share-code/page.tsx"
      provides: "Post-create screen showing the 6-char code with Copier le code"
  key_links:
    - from: "frontend/app/onboarding/create/page.tsx"
      to: "frontend/lib/api.ts"
      via: "POST /households via api()"
      pattern: "POST.*households"
    - from: "frontend/app/onboarding/join/page.tsx"
      to: "frontend/lib/api.ts"
      via: "GET /households/by-code/{code} for preview, then POST /households/join"
      pattern: "by-code"
    - from: "frontend/app/onboarding/create/page.tsx"
      to: "frontend/lib/auth.ts"
      via: "saveAuthToken(response.auth_token) on success"
      pattern: "saveAuthToken"
---

<objective>
Implement the 3-screen onboarding flow per UI-SPEC.md §"Surface-by-Surface Pinning" §1–§4: Welcome → Create-or-Join → Share-code (Create branch only). All strings come from `frontend/lib/i18n/fr.json` (PWA-04). The flow stores `auth_token` in localStorage on success and routes to `/`. A first-launch guard at `/` redirects to `/onboarding/welcome` when no `auth_token` exists.

ONBOARD-05 has both server (01-04) and client halves: this plan implements the client half — the join screen calls `GET /households/by-code/{code}` first to render the creator's color as a disabled swatch, so the user cannot submit a doomed-to-409 form.

Purpose: ONBOARD-01 (UI side), ONBOARD-03 (share-code screen), ONBOARD-04 (UI side), ONBOARD-05 (UI side — disabled swatches), ONBOARD-06 (3-screen flow + first-launch detection). Honors UI-SPEC.md §1–§4 and §"Color > Member colors".
Output: A working onboarding flow callable on the deployed Vercel build, exercised end-to-end with the deployed Railway backend from 01-04.
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
@frontend/lib/colors.ts
@frontend/lib/api.ts
@frontend/lib/i18n/fr.json
@frontend/components/MemberDot.tsx
@frontend/app/layout.tsx
</context>

<interfaces>
From 01-02 frontend-scaffold:
- `frontend/lib/colors.ts` exports `MEMBER_COLORS: ReadonlyArray<{slot,name,hex,tw}>` and `isValidMemberColor(hex)`.
- `frontend/lib/api.ts` is the `api<T>(path, init)` fetch wrapper that auto-attaches `Authorization: Bearer ${localStorage.auth_token}` and redirects to `/onboarding/welcome` on 401.
- `frontend/lib/i18n/fr.json` has the seed catalog with `nav.*`, `home.*`, `install.*`, `common.*` keys.
- `frontend/components/MemberDot.tsx` exports `MemberDot({colorHex, size})`.
- Bottom nav (`frontend/components/BottomNav.tsx`) hides itself on `/onboarding/*` via `useSelectedLayoutSegment()`.

From 01-04 onboarding-backend (consume — don't redefine):
- `POST /households` body: `{household_name: string, member_name: string, color_hex: string}` → 201 `{household_id, member_id, auth_token, invite_code}`.
- `GET /households/by-code/{code}` → 200 `{household_name: string, taken_colors: string[]}` or 404.
- `POST /households/join` body: `{invite_code: string, member_name: string, color_hex: string}` → 201 same shape as POST /households, or 404 / 409 / 422.

The plan-checker grep `cd frontend && grep -RnE '"[A-ZÀ-Ÿ][a-zà-ÿ ]{4,}"' app/onboarding components/ColorSwatchPicker.tsx | grep -vE '(\.(test|spec))|//.*'` should return zero hits OUTSIDE i18n keys (acceptance per PWA-04 from UI-SPEC §"Copywriting Contract").
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: i18n keys + auth.ts helpers + ColorSwatchPicker component + onboarding layout</name>
  <files>frontend/lib/i18n/fr.json, frontend/lib/auth.ts, frontend/lib/onboarding-guard.tsx, frontend/components/ColorSwatchPicker.tsx, frontend/app/onboarding/layout.tsx</files>
  <read_first>
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Copywriting Contract > Primary CTAs" (exact French strings: `Créer un foyer`, `Rejoindre un foyer`, `Créer le foyer`, `Rejoindre`, `Copier le code`, `J'ai prévenu ma partenaire`)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Copywriting Contract > Error states" (the inline copy for `Le code doit faire 6 caractères`, `Ce code n'existe pas. Vérifie auprès de ta partenaire.`, etc.)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Color > Member colors" (the 5-swatch UI rules — `h-12 w-12 rounded-full`, `gap-3`, disabled = `opacity-40` + Lock icon, selected = `ring-2 ring-foreground ring-offset-4 ring-offset-background`)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Surface-by-Surface Pinning" §2 + §3 (Create + Join screen layouts)
    - frontend/AGENTS.md (Next.js 16 may differ from training data — for App Router layout files + `useRouter`/`useSearchParams` from 'next/navigation', consult `frontend/node_modules/next/dist/docs/01-app/`)
    - For next-intl `useTranslations()` patterns in client components vs server components, query Context7 (`mcp__context7__`). Onboarding screens are CLIENT components (they use form state + router); the layout MAY be a server component.
  </read_first>
  <action>
    1. **Extend `frontend/lib/i18n/fr.json`** — add these keys (preserving the existing seed from 01-02):
       ```json
       {
         "common": { "saving": "Enregistrement…", "saved": "Enregistré", "cancel": "Annuler", "back": "Retour" },
         "nav": { "home": "Accueil", "recipes": "Recettes", "drafts": "À compléter", "more": "Plus" },
         "home": { "title": "Al Dente", "tagline": "Décide ce qu'on mange ensemble." },
         "install": {
           "title": "Installe Al Dente sur ton écran d'accueil",
           "body": "Appuie sur Partager (icône carré + flèche) puis « Sur l'écran d'accueil »."
         },
         "onboarding": {
           "welcome": {
             "tagline": "Décide ce qu'on mange ensemble.",
             "create_cta": "Créer un foyer",
             "join_cta": "Rejoindre un foyer"
           },
           "create": {
             "title": "Nouveau foyer",
             "household_name_label": "Nom du foyer",
             "household_name_placeholder": "Notre cuisine",
             "member_name_label": "Ton prénom",
             "color_label": "Ta couleur",
             "submit": "Créer le foyer"
           },
           "join": {
             "title": "Rejoindre un foyer",
             "code_label": "Code d'invitation",
             "code_placeholder": "ABC123",
             "code_helper": "6 caractères donnés par ta partenaire",
             "member_name_label": "Ton prénom",
             "color_label": "Ta couleur (les couleurs déjà prises sont grisées)",
             "submit": "Rejoindre"
           },
           "share_code": {
             "title": "Foyer créé",
             "body": "Partage ce code avec ta partenaire :",
             "copy_cta": "Copier le code",
             "copied_toast": "Copié dans le presse-papier",
             "done_cta": "J'ai prévenu ma partenaire"
           },
           "errors": {
             "required": "Champ requis",
             "code_format": "Le code doit faire 6 caractères",
             "code_not_found": "Ce code n'existe pas. Vérifie auprès de ta partenaire.",
             "color_taken": "Cette couleur est déjà prise.",
             "network": "Connexion impossible. Réessaie dans un instant."
           }
         }
       }
       ```

    2. **`frontend/lib/auth.ts`**:
       ```ts
       const AUTH_KEY = "auth_token";
       const HOUSEHOLD_KEY = "household_id";
       const MEMBER_KEY = "member_id";

       export function saveAuthToken(token: string, householdId: string, memberId: string): void {
         if (typeof window === "undefined") return;
         localStorage.setItem(AUTH_KEY, token);
         localStorage.setItem(HOUSEHOLD_KEY, householdId);
         localStorage.setItem(MEMBER_KEY, memberId);
       }
       export function clearAuth(): void {
         if (typeof window === "undefined") return;
         localStorage.removeItem(AUTH_KEY);
         localStorage.removeItem(HOUSEHOLD_KEY);
         localStorage.removeItem(MEMBER_KEY);
       }
       export function getAuthToken(): string | null {
         if (typeof window === "undefined") return null;
         return localStorage.getItem(AUTH_KEY);
       }
       export function hasOnboarded(): boolean {
         return getAuthToken() !== null;
       }
       ```

    3. **`frontend/lib/onboarding-guard.tsx`** — small client wrapper that redirects to `/onboarding/welcome` if no token (mounted in `frontend/app/page.tsx` — this implements ONBOARD-06 "runs only on first launch"):
       ```tsx
       "use client";
       import { useEffect, useState, type ReactNode } from "react";
       import { useRouter } from "next/navigation";
       import { hasOnboarded } from "@/lib/auth";

       export function OnboardingGuard({ children }: { children: ReactNode }) {
         const router = useRouter();
         const [ready, setReady] = useState(false);
         useEffect(() => {
           if (!hasOnboarded()) {
             router.replace("/onboarding/welcome");
             return;
           }
           setReady(true);
         }, [router]);
         if (!ready) return null;
         return <>{children}</>;
       }
       ```

    4. **`frontend/components/ColorSwatchPicker.tsx`** — pixel-pinned to UI-SPEC §"Color > Member colors":
       ```tsx
       "use client";
       import { Lock } from "lucide-react";
       import { MEMBER_COLORS } from "@/lib/colors";

       type Props = {
         value: string | null;
         onChange: (hex: string) => void;
         takenColors?: ReadonlyArray<string>;
         "aria-label"?: string;
       };

       export function ColorSwatchPicker({ value, onChange, takenColors = [], ...rest }: Props) {
         return (
           <div role="radiogroup" aria-label={rest["aria-label"]} className="flex flex-row gap-3">
             {MEMBER_COLORS.map((c) => {
               const taken = takenColors.includes(c.hex);
               const selected = value === c.hex;
               return (
                 <button
                   key={c.hex}
                   type="button"
                   role="radio"
                   aria-checked={selected}
                   aria-disabled={taken}
                   disabled={taken}
                   onClick={() => !taken && onChange(c.hex)}
                   className={[
                     "h-12 w-12 rounded-full flex items-center justify-center",
                     "focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2",
                     taken ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                     selected ? "ring-2 ring-foreground ring-offset-4 ring-offset-background" : "",
                   ].join(" ")}
                   style={{ backgroundColor: c.hex }}
                 >
                   {taken ? <Lock className="h-4 w-4 text-white" /> : null}
                 </button>
               );
             })}
           </div>
         );
       }
       ```

    5. **`frontend/app/onboarding/layout.tsx`** — slim shell so the bottom nav stays hidden (the BottomNav component already returns null on `/onboarding/*` per 01-02; this layout is just for breathing room):
       ```tsx
       export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
         return <div className="flex flex-col flex-1 min-h-screen bg-background">{children}</div>;
       }
       ```
  </action>
  <verify>
    <automated>cd frontend && test -f lib/auth.ts && test -f lib/onboarding-guard.tsx && test -f components/ColorSwatchPicker.tsx && test -f app/onboarding/layout.tsx && grep -q "saveAuthToken" lib/auth.ts && grep -q "clearAuth" lib/auth.ts && grep -q "hasOnboarded" lib/auth.ts && grep -q "MEMBER_COLORS" components/ColorSwatchPicker.tsx && grep -q "Lock" components/ColorSwatchPicker.tsx && grep -q "ring-2 ring-foreground" components/ColorSwatchPicker.tsx && grep -q "Décide ce qu'on mange ensemble" lib/i18n/fr.json && grep -q "Créer le foyer" lib/i18n/fr.json && grep -q "code_not_found" lib/i18n/fr.json && grep -q "color_taken" lib/i18n/fr.json && npx tsc --noEmit</automated>
  </verify>
  <done>Helpers + i18n keys + picker + layout in place; TypeScript compiles strict; UI-SPEC class strings present; no hardcoded French copy outside i18n.</done>
</task>

<task type="auto">
  <name>Task 2: 4 onboarding pages + first-launch guard on home</name>
  <files>frontend/app/onboarding/welcome/page.tsx, frontend/app/onboarding/create/page.tsx, frontend/app/onboarding/join/page.tsx, frontend/app/onboarding/share-code/page.tsx, frontend/app/page.tsx</files>
  <read_first>
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Surface-by-Surface Pinning" §1 (Welcome), §2 (Create), §3 (Join), §4 (Share-code) — every Tailwind class string in <action> below comes from there
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Typography > Invite-code display" (`text-[28px] font-mono font-semibold tracking-[0.3em]`)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Interaction Patterns > Forms" (server-validated on submit, no live JS validation in W1, focus management)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Interaction Patterns > Toast vs inline rules" (404 → inline; 5xx → toast; 422 → inline)
    - frontend/AGENTS.md (Next.js 16: client components for forms; use 'use client' directive; useRouter from 'next/navigation')
    - For shadcn `Button`, `Input`, `Label` props (variant, size, onChange, ref, controlled patterns), read `frontend/components/ui/button.tsx`, `input.tsx`, `label.tsx` (already pasted by 01-02)
  </read_first>
  <action>
    All four pages are CLIENT components (`"use client"`). All copy via `useTranslations('onboarding.<screen>')` from `next-intl`. All POST/GET via `api()` from `@/lib/api`. On 422 from server (palette validation) treat the same as `color_taken` since the only client-validated field is invite-code length.

    **`frontend/app/onboarding/welcome/page.tsx`** — UI-SPEC §1:
    - Outer: `flex flex-col flex-1 items-center justify-center px-6 py-16 bg-background`
    - Wordmark `h1`: `text-[28px] font-semibold tracking-tight` displaying `t('home.title')` = "Al Dente"
    - Tagline `p`: `text-base text-foreground-muted mt-2 text-center` displaying `t('onboarding.welcome.tagline')`
    - Spacer `<div className="flex-1" />`
    - Stack: `flex flex-col gap-3 w-full max-w-xs`
      - Primary `Button` `variant="default"` `className="h-11 w-full"` text `t('onboarding.welcome.create_cta')` → `router.push('/onboarding/create')`
      - Secondary `Button` `variant="outline"` `className="h-11 w-full"` text `t('onboarding.welcome.join_cta')` → `router.push('/onboarding/join')`

    **`frontend/app/onboarding/create/page.tsx`** — UI-SPEC §2:
    - Sticky header (`h-12 px-6 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border`):
      - Left: `Button size="icon" variant="ghost" aria-label={t('common.back')}` with `<ChevronLeft />` → `router.back()`
      - Center: `<span className="text-base font-semibold">{t('onboarding.create.title')}</span>`
      - Right: empty spacer to keep title centered
    - Body (`flex flex-col gap-6 px-6 pt-6`):
      - `<div><Label>{t('onboarding.create.household_name_label')}</Label><Input ... placeholder={t('onboarding.create.household_name_placeholder')} maxLength={60} required /></div>`
      - `<div><Label>{t('onboarding.create.member_name_label')}</Label><Input ... maxLength={60} required /></div>`
      - `<div><Label>{t('onboarding.create.color_label')}</Label><ColorSwatchPicker value={color} onChange={setColor} aria-label={t('onboarding.create.color_label')} /></div>`
    - Sticky bottom CTA (`fixed bottom-0 inset-x-0 px-6 pb-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]`):
      - `<Button className="h-11 w-full" disabled={!householdName || !memberName || !color || submitting} onClick={onSubmit}>{submitting ? <><Loader2 className="animate-spin h-4 w-4 mr-2"/> {t('common.saving')}</> : t('onboarding.create.submit')}</Button>`
    - On submit:
      ```ts
      const res = await api<{household_id:string; member_id:string; auth_token:string; invite_code:string}>(
        "/households", { method: "POST", body: JSON.stringify({household_name: householdName, member_name: memberName, color_hex: color}) }
      );
      saveAuthToken(res.auth_token, res.household_id, res.member_id);
      router.replace(`/onboarding/share-code?code=${res.invite_code}`);
      ```
    - Errors: 5xx → `toast.error(t('onboarding.errors.network'))` from `sonner`. Other status (422 etc.) → inline error under last touched field.

    **`frontend/app/onboarding/join/page.tsx`** — UI-SPEC §3:
    - Same shell as Create.
    - Code Input: `className="text-center font-mono tracking-[0.3em] uppercase"` `maxLength={6}` `inputMode="text"` `autoCapitalize="characters"`. On every change, normalize to uppercase + alnum-only via `setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))`.
    - When code length reaches 6: debounce 300ms then `api<{household_name:string; taken_colors:string[]}>("/households/by-code/" + code)`. On 200 → set `takenColors` for the picker, clear inline error. On 404 → set inline error `t('onboarding.errors.code_not_found')`. On other → toast `t('onboarding.errors.network')`.
    - `<ColorSwatchPicker value={color} onChange={setColor} takenColors={takenColors} />`
    - Inline error under code input: `<p className="text-sm text-destructive" role="alert">{codeError}</p>` (only when codeError set).
    - Submit button disabled while preview pending or any field empty.
    - On submit: `POST /households/join` with `{invite_code: code, member_name, color_hex: color}`. On 201 → `saveAuthToken(...)` → `router.replace("/")`. On 404 → inline `code_not_found`. On 409 → inline error under color label `color_taken` (re-fetch preview to refresh disabled swatches). On 422 → same as 409 (palette mismatch; refresh preview).

    **`frontend/app/onboarding/share-code/page.tsx`** — UI-SPEC §4:
    - Pulls `code` from `useSearchParams()`. If missing, `router.replace("/")`.
    - `<h1 className="text-xl font-semibold">{t('onboarding.share_code.title')}</h1>` (`Foyer créé`)
    - `<p className="text-base text-foreground-muted">{t('onboarding.share_code.body')}</p>`
    - Code block: `<div className="text-[28px] font-mono font-semibold tracking-[0.3em] py-6 px-8 bg-surface-muted rounded-lg text-center">{code}</div>`
    - Copy `Button variant="secondary"`: on click `await navigator.clipboard.writeText(code); toast.success(t('onboarding.share_code.copied_toast'))`.
    - Done `Button` `variant="default"` `className="h-11 w-full"` (sticky bottom): `t('onboarding.share_code.done_cta')` → `router.replace("/")`.
    - **No back button on this screen** — once the household exists the user shouldn't be able to "undo" creation by going back.

    **Edit `frontend/app/page.tsx`** — wrap the existing home placeholder content (from 01-02 task 2 step 9 — wordmark + tagline + install hint) in `<OnboardingGuard>`:
    ```tsx
    "use client";
    import { OnboardingGuard } from "@/lib/onboarding-guard";
    // ... existing imports
    export default function HomePage() {
      return (
        <OnboardingGuard>
          {/* keep the existing wordmark/tagline/install-hint content from 01-02 */}
        </OnboardingGuard>
      );
    }
    ```
  </action>
  <verify>
    <automated>cd frontend && test -f app/onboarding/welcome/page.tsx && test -f app/onboarding/create/page.tsx && test -f app/onboarding/join/page.tsx && test -f app/onboarding/share-code/page.tsx && grep -q "OnboardingGuard" app/page.tsx && grep -q "saveAuthToken" app/onboarding/create/page.tsx && grep -q "saveAuthToken" app/onboarding/join/page.tsx && grep -q "by-code/" app/onboarding/join/page.tsx && grep -q "ColorSwatchPicker" app/onboarding/create/page.tsx && grep -q "ColorSwatchPicker" app/onboarding/join/page.tsx && grep -q "navigator.clipboard.writeText" app/onboarding/share-code/page.tsx && grep -q "tracking-\[0.3em\]" app/onboarding/share-code/page.tsx && grep -q "tracking-\[0.3em\]" app/onboarding/join/page.tsx && grep -qE "(disabled.*pending|pending.*disabled)" app/onboarding/join/page.tsx && ! grep -RnE '>(Welcome|Create|Join|Bienvenue|Foyer cré|Décide ce|Partage ce|Code d|Nom du|Ton prénom|Ta couleur)' app/onboarding 2>/dev/null | grep -v 'i18n' && npm run lint && npm run build</automated>
  </verify>
  <done>4 onboarding pages exist; home page is guarded; client-side form validation matches UI-SPEC (server-validated submit, no live field-level JS validation except invite-code length); no hardcoded French copy in JSX; lint + build pass.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Both phones round-trip the onboarding flow</name>
  <what-built>
    Onboarding 3-screen flow live on Vercel against the Railway backend. Welcome → Create → Share-code (Phone A); Welcome → Join → Home (Phone B). auth_token is in localStorage on both phones; subsequent launches skip onboarding.
  </what-built>
  <how-to-verify>
    Claude has pushed to main; Vercel + Railway redeploy automatically. Wait ~60s after push for both deploys. Then on YOUR iPhones:

    1. **Phone A (creator):**
       - Launch the installed PWA. You should see the Welcome screen (no `auth_token` yet).
       - Tap `Créer un foyer`. Fill `Nom du foyer = "Cuisine"`, `Ton prénom = "Luca"`, pick a color. Tap `Créer le foyer`.
       - You should land on the share-code screen with a 6-char code in monospace + wide tracking.
       - Tap `Copier le code`. The toast `Copié dans le presse-papier` should appear.
       - Tap `J'ai prévenu ma partenaire`. You should land on `/` (home placeholder + install hint, with the bottom nav now visible).
       - Force-quit the app and relaunch. You should land directly on `/` (NOT onboarding) — proves the guard works.

    2. **Phone B (joiner):**
       - Launch the installed PWA. You should see Welcome.
       - Tap `Rejoindre un foyer`. Type the 6-char code from Phone A. As you reach the 6th character, the picker should briefly show a loader, then render with Phone A's chosen color **disabled (Lock icon, faded)**.
       - Try tapping the disabled swatch — nothing happens.
       - Pick a different color. Type your name. Tap `Rejoindre`.
       - You should land on `/` with the bottom nav visible.
       - Force-quit + relaunch. Land on `/` directly.

    3. **Negative paths to verify (Phone A or B):**
       - On the join screen, type a wrong code (`ZZZZZZ`). Inline error `Ce code n'existe pas...` should appear under the input within ~500ms.
       - On the create screen, leave a field empty — the submit button stays disabled.

    4. **Cross-phone read:**
       - Open Safari on Phone A → DevTools (you can't, on iOS) — instead just confirm: from Phone A, the app does not crash and the tagline still renders. Use a desktop browser pointed at the Vercel URL to hit `https://<railway>/households/me` with Phone A's `auth_token` (copy it from the iOS Safari Web Inspector if connected to a Mac, or ignore — the round-trip in 01-07 will exercise this more thoroughly). The full INFRA-05/REALTIME path is gated by 01-07.

    Common failure modes:
    - 404 on `GET /households/by-code/...` → CORS misconfigured → check `CORS_ALLOWED_ORIGINS` in Railway env.
    - Code preview never returns → backend not deployed yet, wait for Railway redeploy.
    - Token gets cleared after success → `api.ts` thinks the response was 401 → check `NEXT_PUBLIC_API_BASE` is set in Vercel env.
  </how-to-verify>
  <resume-signal>Type "approved" with a note about which colors each phone picked, OR describe what failed (specific copy / status code).</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → POST /households | Unauthenticated; rate-limit accepted-as-residual |
| browser localStorage | `auth_token` stored here per SPEC.md §Onboarding |
| browser → GET /households/by-code/{code} | Unauthenticated preview; reveals only `household_name` + colors |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-01-06-01 | Tampering | client-side palette bypass (user enters arbitrary hex) | medium | mitigate | Server validates via `is_valid_member_color` (01-04); UI cannot submit non-palette colors because `ColorSwatchPicker` only emits values from `MEMBER_COLORS`. |
| T-01-06-02 | Information Disclosure | localStorage XSS exfiltrates auth_token | medium | accept | Same as 01-02 T-01-02-03 — single-tenant household app, no third-party scripts loaded. `// TODO(productize)` in `lib/auth.ts` already documented. |
| T-01-06-03 | Tampering | join with already-taken color despite UI disable | medium | mitigate | Server returns 409 (01-04 T-01-04-05); UI handles by re-fetching preview + showing inline error. |
| T-01-06-04 | Spoofing | shoulder-surfing the share-code screen | medium | accept | The 6-char code is meant to be shared verbally with a partner; productize-later: rotate-on-tap. |
| T-01-06-05 | Information Disclosure | hardcoded French copy reveals product strings to non-targeted browsers | low | mitigate | All copy in `fr.json` (PWA-04); the JSON file is shipped anyway, but no untranslated leak from JSX. |
| T-01-06-06 | Denial of Service | join-screen preview spams server on every keystroke | low | mitigate | 300ms debounce + only firing when code length === 6 (Task 2). |

No `high` items. Auth surface is in 01-04 (server) and 01-05 (WS); this plan is the UI consumer.
</threat_model>

<verification>
Manual via Task 3 checkpoint on both phones. Coverage:

- ONBOARD-01 ✓ Create screen sends `{household_name, member_name, color_hex}` from the 5-swatch palette.
- ONBOARD-03 ✓ Share-code screen displays the 6-character invite code with `Copier le code` (clipboard write + toast).
- ONBOARD-04 ✓ Join screen sends `{invite_code, member_name, color_hex}` and routes to `/` on 201.
- ONBOARD-05 ✓ Disabled swatch with Lock icon when `taken_colors` includes the hex; can't be selected.
- ONBOARD-06 ✓ 3-screen flow (Welcome / Create-or-Join / Share-code-on-create); first-launch guard sends user to onboarding only when no `auth_token`; subsequent launches go straight to `/`.
</verification>

<success_criteria>
The Task 3 checkpoint passes on both phones. Both `auth_token`s are in localStorage; both members appear in `GET /households/me` for either token.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundations-w1/01-06-SUMMARY.md` documenting:
- The exact i18n keys added (so 01-07 + 01-10 don't redefine them).
- The `OnboardingGuard` pattern and where it's mounted (so 01-07 doesn't redundantly check `hasOnboarded`).
- Any UI-SPEC interpretation points where ambiguity arose.
</output>
