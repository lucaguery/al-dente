---
phase: 01-foundations-w1
plan: 10
plan_number: 10
slug: recipes-frontend-read
type: execute
wave: 8
depends_on: [recipes-backend, photo-upload-backend, ping-frontend-and-ws-client]
files_modified:
  - backend/app/main.py
  - backend/app/routers/photos.py
  - backend/app/services/storage.py
  - frontend/lib/i18n/fr.json
  - frontend/lib/recipes.ts
  - frontend/components/RecipeCard.tsx
  - frontend/components/RecipeDraftCard.tsx
  - frontend/components/SearchInput.tsx
  - frontend/app/recipes/page.tsx
  - frontend/app/recipes/[id]/page.tsx
  - frontend/app/inbox/page.tsx
  - frontend/app/settings/page.tsx
  - frontend/components/BottomNav.tsx
autonomous: false
requirements: [RECIPE-03, RECIPE-04, RECIPE-06, RECIPE-08]
must_haves:
  truths:
    - "/recipes shows the household's recipes (paginated, default 50) with a SearchInput that debounces 300ms before calling GET /recipes?q=... — matches by title or by ingredient text per D-03"
    - "/recipes/[id] shows the recipe detail with photos rendered via short-lived signed URLs from Supabase Storage (bucket is private)"
    - "/inbox shows only status='draft' recipes; the bottom-nav `À compléter` tab badge shows the live count, fetched on mount and updated when realtime fires recipe.created/recipe.updated"
    - "/settings has a `Télécharger mes recettes` button that triggers a download of the household's export.json (RECIPE-08)"
    - "Empty states match UI-SPEC §Copywriting > Empty states verbatim (`Aucune recette pour le moment`, `Tout est à jour`, `Aucun résultat pour « {query} »`)"
    - "Recipe detail page handles 404 gracefully (full-page error state, NOT a toast)"
    - "All copy from frontend/lib/i18n/fr.json (no hardcoded JSX strings)"
  artifacts:
    - path: "frontend/components/RecipeCard.tsx"
      provides: "List-row card per UI-SPEC §6 (photo thumbnail + title + meta)"
    - path: "frontend/components/RecipeDraftCard.tsx"
      provides: "Drafts inbox row variant with `Brouillon` badge"
    - path: "frontend/components/SearchInput.tsx"
      provides: "Search input with 300ms debounce + clear button + Loader2 in-input adornment"
    - path: "frontend/lib/recipes.ts"
      provides: "Typed Recipe + Member types and helpers (getSignedPhotoUrl)"
    - path: "frontend/app/recipes/page.tsx"
      provides: "Recipe library list + search"
    - path: "frontend/app/recipes/[id]/page.tsx"
      provides: "Recipe detail (reads only — edit lives in 01-11)"
    - path: "frontend/app/inbox/page.tsx"
      provides: "Drafts inbox tab"
    - path: "frontend/app/settings/page.tsx"
      provides: "Settings page with JSON export button"
    - path: "backend/app/routers/photos.py"
      provides: "(extended) GET /recipes/{id}/photo-url?path=... returns short-lived signed URL"
  key_links:
    - from: "frontend/app/recipes/[id]/page.tsx"
      to: "backend/app/routers/photos.py"
      via: "GET /recipes/{id}/photo-url?path=... → signed URL → <img src=...>"
      pattern: "photo-url"
    - from: "frontend/components/BottomNav.tsx"
      to: "frontend/lib/api.ts"
      via: "GET /recipes?status=draft to populate `À compléter (N)` badge"
      pattern: "status=draft"
---

<objective>
Implement the read-side of the recipe library frontend: list with debounced ILIKE search (RECIPE-03), detail page with signed-URL photo rendering (RECIPE-04 + read counterpart of RECIPE-07), drafts inbox tab (RECIPE-06) with live `(N)` badge on the bottom-nav, and a settings page with JSON export button (RECIPE-08). Write paths (`/recipes/new`, `/recipes/[id]/edit`, photo upload UI) are 01-11.

This plan also adds the small backend helper that 01-09 deferred: `GET /recipes/{id}/photo-url?path=...` returns a 5-minute signed URL because the `recipe-photos` bucket is private. The route lives in `app/routers/photos.py` next to the upload route.

Per UI-SPEC §"Realtime indicators", new rows appearing on the partner's phone are NOT announced via toast — the list-row appearance IS the notification. Realtime list reactivity (subscribing to `recipe.created` / `recipe.updated` and updating the list state) lands here for read views; 01-11 reuses the same hook for the new/edit flows.

Purpose: RECIPE-03 (UI side, debounced ILIKE), RECIPE-04 (detail), RECIPE-06 (drafts inbox + badge), RECIPE-08 (export button). Honors UI-SPEC §6 / §7 / §9 / §11.
Output: Recipe library is browsable on both phones; partner-side new recipes appear within ~500ms; export downloads as a JSON file on iOS Safari.
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
@frontend/lib/api.ts
@frontend/lib/auth.ts
@frontend/lib/datetime.ts
@frontend/lib/enums.ts
@frontend/lib/i18n/fr.json
@frontend/components/BottomNav.tsx
@frontend/components/RealtimeProvider.tsx
@frontend/components/EmptyState.tsx
@frontend/components/MemberDot.tsx
@backend/app/routers/photos.py
@backend/app/services/storage.py
</context>

<interfaces>
From 01-08 recipes-backend:
- `GET /recipes?q=&status=&limit=&offset=` returns `RecipeResponse[]`.
- `GET /recipes/{id}` returns `RecipeResponse` or 404.
- `GET /households/{id}/export.json` returns the JSON blob with `Content-Disposition: attachment`.
- WS frames: `{type: "recipe.created", payload: RecipeResponse}`, `{type: "recipe.updated", payload: RecipeResponse}`.

From 01-09 photo-upload-backend:
- `recipes.photo_paths: string[]` contains paths like `{household_id}/{recipe_id}/{uuid}.jpg`.
- The `recipe-photos` bucket is private; we need short-lived signed URLs to render `<img>` tags. supabase-py has `client.storage.from_(BUCKET).create_signed_url(path, expires_in)`.

From 01-07 ping-frontend-and-ws-client:
- `useRealtime()` hook returns the `RealtimeClient` with `onEvent('type', handler)`.

From 01-02 frontend-scaffold:
- `EmptyState({icon, heading, body, cta?})` component already exists.
- `BottomNav` already renders `À compléter` tab; this plan extends it to populate the badge from real data.

UI-SPEC contracts consumed:
- §"Surface-by-Surface Pinning" §6 (Recipe library list — sticky header, search bar, gap-3 list, RecipeCard shape with 16x16 photo thumbnail + title + meta row).
- §"Surface-by-Surface Pinning" §7 (Recipe detail — sticky header, photo gallery, title, meta chips, ingredients/steps sections, footer meta).
- §"Surface-by-Surface Pinning" §9 (Drafts inbox).
- §"Surface-by-Surface Pinning" §11 (JSON export in /settings).
- §"Interaction Patterns > Search behavior" (300ms debounce, full list on empty query, EmptyState on no-results).
- §"Component Inventory" — `RecipeCard`, `RecipeDraftCard`, `SearchInput` are app-composed components.
- §"Color > Member colors" via `MemberDot` (already done).
- §"Typography" — body 16px/normal/leading-6, label 14px/medium/leading-5, heading 20px/semibold/leading-7, display 28px/semibold.
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Backend signed-URL helper + frontend types/i18n/components (RecipeCard, RecipeDraftCard, SearchInput)</name>
  <files>backend/app/services/storage.py, backend/app/routers/photos.py, frontend/lib/i18n/fr.json, frontend/lib/recipes.ts, frontend/components/RecipeCard.tsx, frontend/components/RecipeDraftCard.tsx, frontend/components/SearchInput.tsx</files>
  <read_first>
    - .planning/phases/01-foundations-w1/01-09-SUMMARY.md (the read-side strategy choice deferred to this plan)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Surface-by-Surface Pinning" §6 (RecipeCard exact classes)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Component Inventory > App-composed components" (RecipeCard / RecipeDraftCard / SearchInput specs)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Interaction Patterns > Search behavior" (300ms debounce)
    - For supabase-py `create_signed_url(path, expires_in)` API, query Context7 (`mcp__context7__`) with the installed supabase version. The Python SDK returns a dict — `{ "signedURL": "...", "signedUrl": "...", "data": ... }` shape varies by version, normalize.
  </read_first>
  <action>
    1. **Extend `backend/app/services/storage.py`** — add a signed-URL helper (do NOT modify the existing upload code):
       ```python
       SIGNED_URL_TTL_SECONDS = 60 * 5  # 5 minutes; FE re-fetches on each detail mount

       def create_signed_photo_url(path: str) -> str:
           """Returns a short-lived URL the frontend can drop into <img src>.
           Path must already be the canonical bucket-relative path that we
           stored in recipes.photo_paths (no `{bucket}/` prefix)."""
           client = _supabase()
           result = client.storage.from_(BUCKET).create_signed_url(path, SIGNED_URL_TTL_SECONDS)
           # supabase-py returns the URL under one of these keys depending on version:
           url = (
               (result or {}).get("signedURL")
               or (result or {}).get("signedUrl")
               or ((result or {}).get("data") or {}).get("signedUrl")
           )
           if not url:
               raise RuntimeError(f"unexpected signed-url response: {result!r}")
           return url
       ```

    2. **Extend `backend/app/routers/photos.py`** — add the read route (do NOT modify the existing POST handler):
       ```python
       from fastapi import Query

       from app.services.storage import create_signed_photo_url

       @router.get("/{recipe_id}/photo-url")
       def signed_photo_url(
           recipe_id: UUID,
           path: str = Query(..., min_length=1, max_length=300),
           member: Member = Depends(current_member),
           db: Session = Depends(get_db),
       ) -> dict:
           # Authorize: recipe must be in the requester's household, AND the path
           # must be ONE OF the recipe's recorded photo_paths. This prevents
           # arbitrary bucket reads via crafted paths (T-01-10-01).
           recipe = db.scalar(select(Recipe).where(
               Recipe.id == recipe_id,
               Recipe.household_id == member.household_id,
           ))
           if recipe is None:
               raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="recipe not found")
           if path not in (recipe.photo_paths or []):
               raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="path not on recipe")
           url = create_signed_photo_url(path)
           return {"url": url, "expires_in": 300}
       ```

    3. **Extend `frontend/lib/i18n/fr.json`** with all the read-side recipe copy (matching UI-SPEC verbatim):
       ```json
       {
         "recipes": {
           "tab_title": "Recettes",
           "search_placeholder": "Chercher par titre ou ingrédient",
           "search_clear": "Effacer la recherche",
           "add_cta_aria": "Ajouter une recette",
           "empty_heading": "Aucune recette pour le moment",
           "empty_body": "Ajoute ta première recette pour commencer.",
           "empty_cta": "Ajouter une recette",
           "no_results_heading": "Aucun résultat pour « {query} »",
           "no_results_body": "Essaie un autre mot-clé ou vérifie l'orthographe.",
           "never_cooked": "Jamais cuisinée",
           "draft_badge": "Brouillon",
           "back_aria": "Retour",
           "edit_aria": "Modifier la recette",
           "no_photo": "Pas encore de photo",
           "section_ingredients": "Ingrédients",
           "section_steps": "Étapes",
           "footer_last_cooked": "Dernière fois : {when}",
           "footer_cook_count": "Cuisinée {count, plural, =0 {0 fois} one {# fois} other {# fois}}",
           "detail_404_heading": "Recette introuvable",
           "detail_404_body": "Cette recette n'existe pas ou a été supprimée.",
           "detail_404_cta": "Retour aux recettes"
         },
         "inbox": {
           "tab_title": "À compléter",
           "empty_heading": "Tout est à jour",
           "empty_body": "Pas de brouillon à compléter. Les recettes ajoutées rapidement atterriront ici."
         },
         "settings": {
           "tab_title": "Plus",
           "export_section_title": "Exporter mes données",
           "export_body": "Télécharge toutes tes recettes au format JSON. Utile en cas de pépin.",
           "export_cta": "Télécharger mes recettes"
         }
       }
       ```

    4. **`frontend/lib/recipes.ts`** — typed model + helpers (mirror RecipeResponse from 01-08):
       ```ts
       import { api } from "@/lib/api";

       export type IngredientItem = { name: string; quantity?: number | null; unit?: string | null };
       export type Recipe = {
         id: string;
         household_id: string;
         created_by_member_id: string;
         status: "draft" | "structured" | "verified";
         title: string;
         source_capture: { type: string; payload?: unknown };
         photo_paths: string[];
         ingredients?: IngredientItem[] | null;
         steps?: string[] | null;
         prep_time_minutes?: number | null;
         servings?: number | null;
         cuisine?: string | null;
         main_protein?: string | null;
         mood: string[];
         seasonality: string[];
         tags: string[];
         last_cooked_at?: string | null;
         cook_count: number;
         created_at: string;
         updated_at: string;
       };

       export type Member = { id: string; name: string; color_hex: string; joined_at: string };

       export async function getSignedPhotoUrl(recipeId: string, path: string): Promise<string> {
         const res = await api<{url: string; expires_in: number}>(
           `/recipes/${recipeId}/photo-url?path=${encodeURIComponent(path)}`
         );
         return res.url;
       }
       ```

    5. **`frontend/components/RecipeCard.tsx`** — UI-SPEC §6 verbatim:
       ```tsx
       "use client";
       import Link from "next/link";
       import { useEffect, useState } from "react";
       import { useTranslations } from "next-intl";
       import { Badge } from "@/components/ui/badge";
       import { formatRelativeFr } from "@/lib/datetime";
       import { getSignedPhotoUrl } from "@/lib/recipes";
       import type { Recipe } from "@/lib/recipes";

       export function RecipeCard({ recipe }: { recipe: Recipe }) {
         const t = useTranslations("recipes");
         const [src, setSrc] = useState<string | null>(null);
         useEffect(() => {
           const first = recipe.photo_paths[0];
           if (!first) return;
           getSignedPhotoUrl(recipe.id, first).then(setSrc).catch(() => setSrc(null));
         }, [recipe.id, recipe.photo_paths]);

         return (
           <Link href={`/recipes/${recipe.id}`}
                 className="flex gap-4 p-3 bg-background rounded-lg border border-border hover:bg-surface-muted transition-colors">
             {src
               ? <img src={src} alt="" className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
               : <div aria-hidden className="h-16 w-16 rounded-lg bg-surface-muted flex-shrink-0" />}
             <div className="flex flex-col gap-1.5 flex-1 min-w-0">
               <h3 className="text-base font-semibold leading-6 line-clamp-1">{recipe.title}</h3>
               <div className="flex items-center gap-2 flex-wrap">
                 {recipe.cuisine && <Badge variant="secondary">{recipe.cuisine}</Badge>}
                 <span className="text-sm text-foreground-muted">
                   {recipe.last_cooked_at
                     ? formatRelativeFr(recipe.last_cooked_at)
                     : t("never_cooked")}
                 </span>
               </div>
             </div>
           </Link>
         );
       }
       ```
       Note: cuisine values are wire-format strings (`italian`, `middleEastern`); for v0.1 we render them as-is in the badge. Productize-later: translate via i18n keys (the enum values are already in `frontend/lib/enums.ts`; a `cuisineLabel(c)` helper that hits `t('enums.cuisine.italian')` is the eventual pattern, but adding it here is scope creep beyond UI-SPEC). The current display is acceptable for v0.1.

    6. **`frontend/components/RecipeDraftCard.tsx`**:
       ```tsx
       "use client";
       import Link from "next/link";
       import { useTranslations } from "next-intl";
       import { Badge } from "@/components/ui/badge";
       import type { Recipe } from "@/lib/recipes";

       export function RecipeDraftCard({ recipe }: { recipe: Recipe }) {
         const t = useTranslations("recipes");
         return (
           <Link href={`/recipes/${recipe.id}/edit`}
                 className="flex gap-4 p-3 bg-background rounded-lg border border-border hover:bg-surface-muted transition-colors">
             <div aria-hidden className="h-16 w-16 rounded-lg bg-surface-muted flex-shrink-0" />
             <div className="flex flex-col gap-1.5 flex-1 min-w-0">
               <h3 className="text-base font-semibold leading-6 line-clamp-1">{recipe.title}</h3>
               <div className="flex items-center gap-2 flex-wrap">
                 <Badge variant="secondary">{t("draft_badge")}</Badge>
               </div>
             </div>
           </Link>
         );
       }
       ```

    7. **`frontend/components/SearchInput.tsx`** — 300ms debounce + clear button + Loader2:
       ```tsx
       "use client";
       import { useEffect, useRef, useState } from "react";
       import { useTranslations } from "next-intl";
       import { Search, X, Loader2 } from "lucide-react";
       import { Input } from "@/components/ui/input";
       import { Button } from "@/components/ui/button";

       type Props = { onQueryChange: (q: string) => Promise<void> | void };

       export function SearchInput({ onQueryChange }: Props) {
         const t = useTranslations("recipes");
         const [value, setValue] = useState("");
         const [pending, setPending] = useState(false);
         const timer = useRef<number | null>(null);

         useEffect(() => {
           if (timer.current != null) window.clearTimeout(timer.current);
           setPending(true);
           timer.current = window.setTimeout(async () => {
             try { await onQueryChange(value); } finally { setPending(false); }
           }, 300);
           return () => { if (timer.current != null) window.clearTimeout(timer.current); };
         }, [value, onQueryChange]);

         return (
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
             <Input
               value={value}
               onChange={(e) => setValue(e.target.value)}
               placeholder={t("search_placeholder")}
               className="pl-10 pr-10"
               aria-label={t("search_placeholder")}
             />
             <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
               {pending && value.length > 0 && <Loader2 className="h-4 w-4 animate-spin text-foreground-muted" />}
               {value.length > 0 && !pending && (
                 <Button size="icon" variant="ghost" aria-label={t("search_clear")}
                         onClick={() => setValue("")} className="h-8 w-8">
                   <X className="h-4 w-4" />
                 </Button>
               )}
             </div>
           </div>
         );
       }
       ```
  </action>
  <verify>
    <automated>cd backend && grep -q "create_signed_photo_url" app/services/storage.py && grep -q "/{recipe_id}/photo-url" app/routers/photos.py && grep -q 'path not on recipe' app/routers/photos.py && cd ../frontend && test -f lib/recipes.ts && test -f components/RecipeCard.tsx && test -f components/RecipeDraftCard.tsx && test -f components/SearchInput.tsx && grep -q "getSignedPhotoUrl" lib/recipes.ts && grep -q "300" components/SearchInput.tsx && grep -q "Brouillon" lib/i18n/fr.json && grep -q "search_placeholder" lib/i18n/fr.json && grep -q "no_results_heading" lib/i18n/fr.json && npx tsc --noEmit && npm run build</automated>
  </verify>
  <done>Backend signed-URL route appended (path-on-recipe authorization included); 3 components exist; types in place; i18n catalog extended; build passes; SearchInput debounces at 300ms.</done>
</task>

<task type="auto">
  <name>Task 2: /recipes list, /recipes/[id] detail, /inbox drafts, /settings export pages — plus BottomNav drafts-count badge wiring</name>
  <files>frontend/app/recipes/page.tsx, frontend/app/recipes/[id]/page.tsx, frontend/app/inbox/page.tsx, frontend/app/settings/page.tsx, frontend/components/BottomNav.tsx</files>
  <read_first>
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Surface-by-Surface Pinning" §6 (list), §7 (detail), §9 (drafts), §11 (export)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Layout & Navigation > Top app bar" (sticky h-12, ChevronLeft + title + optional right action)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Realtime indicators" (no toast on partner-side new event; row-appearance is the notification)
    - .planning/phases/01-foundations-w1/01-CONTEXT.md §"Drafts inbox" (always visible tab; N=0 shows just `À compléter`, N≥1 shows `À compléter (N)`)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Component Inventory > Correction on drafts-tab badge" (badge hidden when N=0)
    - frontend/components/BottomNav.tsx (extend; do NOT replace)
  </read_first>
  <action>
    All page files are CLIENT components (`"use client"` at the top). All copy via `useTranslations()`. All API calls via `api()` from `@/lib/api`. Realtime updates via `useRealtime()` from `@/components/RealtimeProvider`.

    1. **`frontend/app/recipes/page.tsx`** — list + search per UI-SPEC §6:
       - Sticky header `h-12 px-6 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border`:
         - Title `text-xl font-semibold` displaying `t('recipes.tab_title')` ("Recettes")
         - Right: `Button size="icon" variant="ghost" aria-label={t('recipes.add_cta_aria')}` with `<Plus />` → `router.push('/recipes/new')`
       - Search bar wrap: `px-6 py-3 sticky top-12 z-10 bg-background/80 backdrop-blur-sm`
         - `<SearchInput onQueryChange={handleSearch} />`
       - List wrap: `px-6 flex flex-col gap-3 pb-24`
         - State: `const [recipes, setRecipes] = useState<Recipe[]>([])`, `const [query, setQuery] = useState("")`, `const [loading, setLoading] = useState(true)`
         - On mount: `api<Recipe[]>("/recipes").then(setRecipes).finally(() => setLoading(false))`
         - On search: `setQuery(q); api<Recipe[]>(\`/recipes?q=${encodeURIComponent(q)}\`).then(setRecipes)`
         - Realtime: `useRealtime()`'s `onEvent('recipe.created', r => setRecipes(prev => [r, ...prev.filter(p => p.id !== r.id)]))` and `onEvent('recipe.updated', r => setRecipes(prev => prev.map(p => p.id === r.id ? r : p)))`. Note: a partner-created `draft` recipe should NOT appear in `/recipes` (which lists all statuses) — actually per RECIPE-03 the list shows everything; the drafts inbox `/inbox` filters. So `recipes` page shows all. (Keep simple: don't filter on FE.)
       - Empty / no-results: when `recipes.length === 0 && !loading`:
         - if `query.trim() !== ""`: render `<EmptyState icon={Search} heading={t('recipes.no_results_heading', { query })} body={t('recipes.no_results_body')} />`
         - else: render `<EmptyState icon={BookOpen} heading={t('recipes.empty_heading')} body={t('recipes.empty_body')} cta={{ label: t('recipes.empty_cta'), href: '/recipes/new' }} />`
       - Otherwise: `recipes.map(r => <RecipeCard key={r.id} recipe={r} />)`.

    2. **`frontend/app/recipes/[id]/page.tsx`** — detail per UI-SPEC §7:
       - Read `id` from `useParams()`.
       - Sticky header: ChevronLeft (`Button variant="ghost" size="icon"` aria=`t('recipes.back_aria')` → `router.back()`) + (right) `Button variant="ghost" size="icon"` aria=`t('recipes.edit_aria')` with `<Pencil />` → `router.push(\`/recipes/${id}/edit\`)`.
       - State: `const [recipe, setRecipe] = useState<Recipe | null>(null); const [notFound, setNotFound] = useState(false); const [photoUrls, setPhotoUrls] = useState<string[]>([])`.
       - On mount: `api<Recipe>(\`/recipes/${id}\`).then(setRecipe).catch(err => { if (err.message.startsWith('404')) setNotFound(true); else throw err })`. (api.ts throws `Error('${status} ${statusText}')` on non-OK; pattern-match the prefix.)
       - On recipe load: for each `photo_paths[i]` call `getSignedPhotoUrl(id, p)` and update `photoUrls`.
       - Realtime: subscribe to `recipe.updated` and replace local state if `payload.id === id`.
       - 404 branch: render full-page state with EmptyState shape — heading `t('recipes.detail_404_heading')`, body `t('recipes.detail_404_body')`, CTA → `/recipes`.
       - Body (when loaded):
         - Hero: if `photoUrls.length > 0`, horizontal `flex overflow-x-auto snap-x snap-mandatory gap-3 px-6` with each `<img className="h-64 w-64 rounded-lg object-cover snap-start" />`. Else `<div className="mx-6 h-44 rounded-lg bg-surface-muted flex items-center justify-center text-sm text-foreground-muted">{t('recipes.no_photo')}</div>`.
         - Body wrap `px-6 flex flex-col gap-6 pb-24`:
           - Title `<h1 className="text-[28px] font-semibold tracking-tight">{recipe.title}</h1>`
           - Meta row: cuisine Badge (if set), each mood Badge (loop), main_protein Badge (if set), then `<span className="text-sm text-foreground-muted">{recipe.prep_time_minutes ? \`${recipe.prep_time_minutes}min\` : ''}{recipe.servings ? \` · ${recipe.servings} pers.\` : ''}</span>` (only render the spans when values exist).
           - Ingredients section (only if `recipe.ingredients?.length`): `<h2 className="text-xl font-semibold">{t('recipes.section_ingredients')}</h2>` + `<ul className="flex flex-col gap-2">` rendering each as `{quantity ?? ''}{unit ? ' ' + unit : ''} {name}` text-base.
           - Steps section (only if `recipe.steps?.length`): `<h2 className="text-xl font-semibold">{t('recipes.section_steps')}</h2>` + `<ol className="list-decimal list-inside flex flex-col gap-3 text-base">`.
           - Footer meta: `<p className="text-sm text-foreground-muted">{t('recipes.footer_last_cooked', { when: recipe.last_cooked_at ? formatRelativeFr(recipe.last_cooked_at) : t('recipes.never_cooked') })} · {t('recipes.footer_cook_count', { count: recipe.cook_count })}</p>`.

    3. **`frontend/app/inbox/page.tsx`** — drafts inbox per UI-SPEC §9:
       - Sticky header: title `<h1 className="text-xl font-semibold">{t('inbox.tab_title')}</h1>` (no right action).
       - State + realtime mirroring the list page, but always queried with `?status=draft`.
       - Realtime: subscribe to `recipe.created` (only add if `payload.status === 'draft'`); subscribe to `recipe.updated` (if status flipped from draft → structured, REMOVE from local state; if still draft, replace).
       - Render `RecipeDraftCard` per item; tapping a card routes to `/recipes/${id}/edit` (handled inside the card already).
       - Empty: `<EmptyState icon={Inbox} heading={t('inbox.empty_heading')} body={t('inbox.empty_body')} />`.

    4. **`frontend/app/settings/page.tsx`** — export per UI-SPEC §11:
       - Sticky header: title `<h1 className="text-xl font-semibold">{t('settings.tab_title')}</h1>` ("Plus").
       - Body `px-6 pt-6 pb-24 flex flex-col gap-6`:
         - Section: `<h2 className="text-base font-semibold">{t('settings.export_section_title')}</h2>` ("Exporter mes données")
         - `<p className="text-sm text-foreground-muted">{t('settings.export_body')}</p>`
         - `<Button className="h-11 w-full" variant="default" onClick={onExport}><Download className="h-4 w-4 mr-2" />{t('settings.export_cta')}</Button>`
       - `onExport`:
         ```ts
         const householdId = localStorage.getItem("household_id");
         if (!householdId) return;
         // We can't use api() here because we want the raw Response with attachment headers.
         const token = localStorage.getItem("auth_token");
         const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/households/${householdId}/export.json`, {
           headers: { "Authorization": `Bearer ${token}` },
         });
         if (!res.ok) { toast.error(/* network */); return; }
         const blob = await res.blob();
         const url = URL.createObjectURL(blob);
         const a = document.createElement("a");
         a.href = url;
         a.download = `al-dente-recipes-${householdId}.json`;
         document.body.appendChild(a);
         a.click();
         a.remove();
         URL.revokeObjectURL(url);
         ```
       Note: iOS Safari treats `<a download>` differently from desktop — the file may open in a new tab rather than downloading directly. That's acceptable for v0.1; the user can `Share → Save to Files`. Document this as a known iOS PWA quirk in the SUMMARY.

    5. **Extend `frontend/components/BottomNav.tsx`** — populate the `À compléter (N)` badge:
       - On mount (and on every `recipe.created`/`recipe.updated` event from `useRealtime()`), call `api<Recipe[]>("/recipes?status=draft&limit=200")` and store `count = response.length` in local state.
       - Render the tab label as `t('nav.drafts')` ("À compléter") with a conditional `<span className="ml-1 inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-primary text-background text-xs font-medium">{count}</span>` when `count > 0` (UI-SPEC §"Component Inventory > Correction on drafts-tab badge").
       - Don't poll — only re-fetch on WS events (cheap, instant).
  </action>
  <verify>
    <automated>cd frontend && test -f app/recipes/page.tsx && test -f app/recipes/[id]/page.tsx && test -f app/inbox/page.tsx && test -f app/settings/page.tsx && grep -q "useRealtime" app/recipes/page.tsx && grep -q "useRealtime" app/inbox/page.tsx && grep -q "RecipeCard" app/recipes/page.tsx && grep -q "RecipeDraftCard" app/inbox/page.tsx && grep -q "SearchInput" app/recipes/page.tsx && grep -q "getSignedPhotoUrl" app/recipes/\[id\]/page.tsx && grep -q "?status=draft" app/inbox/page.tsx && grep -q "Content-Disposition\|export.json\|al-dente-recipes-" app/settings/page.tsx && grep -q "?status=draft" components/BottomNav.tsx && grep -q "useRealtime" components/BottomNav.tsx && ! grep -RnE '>(Recettes|À compléter|Plus|Aucune recette|Tout est à jour|Pas de brouillon|Exporter|Télécharger|Brouillon|Pas encore de photo|Ingrédients|Étapes|Recette introuvable)' app/recipes app/inbox app/settings components/BottomNav.tsx 2>/dev/null | grep -v 't("' | grep -v "i18n" && npm run lint && npm run build</automated>
  </verify>
  <done>4 pages + BottomNav extension committed; build + lint pass; no hardcoded French strings; realtime hooks wired; export uses raw fetch for download semantics.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Two-phone smoke — list, search, detail, drafts inbox, export</name>
  <what-built>
    Recipe library read-side live on Vercel against Railway. List + search work; detail page renders photos via signed URLs; drafts inbox tab + badge wired; settings → export downloads JSON.
  </what-built>
  <how-to-verify>
    Wait for Vercel + Railway redeploy after the push. On YOUR iPhones:

    1. **Seed data via the API (use a desktop curl with one of the two `auth_token`s from the onboarding gate, or just create from the iOS app once 01-11 ships the new-recipe form). For this checkpoint, seed via curl from a desktop:**
       - `T=<auth_token from Phone A>; BASE=https://<railway>`
       - Create 3 structured recipes with varied titles (`Carbonara`, `Salade de pois chiches`, `Tajine d'agneau`) and 1 draft (`Pain à finir`) via `POST /recipes` and `POST /recipes/quick`.
       - Upload one JPEG to one of them via `POST /recipes/{id}/photos -F file=@/tmp/p.jpg`.

    2. **Phone A — list page (`/recipes` via bottom nav "Recettes" tab):**
       - You should see 4 cards (3 structured + 1 draft mixed in). The Carbonara card shows your uploaded photo as a thumbnail. The other three show the empty zinc-100 placeholder.
       - Tap the search bar; type `pois`. Within 300ms the list should narrow to "Salade de pois chiches".
       - Clear the search (X icon). Full list returns.
       - Type `xyz`. Empty state appears: `Aucun résultat pour « xyz »`.

    3. **Phone A — drafts inbox (`/inbox` via bottom nav "À compléter"):**
       - The bottom-nav tab should show `À compléter (1)` — proves badge count.
       - The page should list only "Pain à finir" with a `Brouillon` badge.
       - Tap the row — you'll be sent to `/recipes/{id}/edit` (404 page, since 01-11 hasn't built that route yet — that's expected; 01-11 fixes it).

    4. **Phone B — same checks. Both phones should see identical content.**

    5. **Realtime smoke (both phones open at /recipes):**
       - From a desktop, `POST /recipes/quick` with title `"Test temps réel"`. Within ~500ms, BOTH phones should see the new card slide into the top of their list (no toast).
       - The bottom-nav `À compléter (N)` badge on BOTH phones should bump from 1 → 2.

    6. **Recipe detail (Phone A, tap any card):**
       - Sticky header with back chevron + edit pencil. Title in 28px semibold. If the recipe has a photo, the gallery scrolls horizontally; tapping a photo doesn't open a lightbox in v0.1 (intentional — productize-later). If no photo, the "Pas encore de photo" placeholder.
       - Ingredients + Étapes sections render only when populated (not shown for the quick-add drafts).
       - Footer says `Dernière fois : jamais cuisinée · Cuisinée 0 fois` (since W1 has no cooking-log creation flow).
       - Tap back chevron → returns to list.

    7. **Detail 404:**
       - On Phone A, manually navigate to `/recipes/00000000-0000-0000-0000-000000000000`. The 404 branch should render with `Recette introuvable` heading + CTA back to list.

    8. **Settings → export:**
       - On Phone A, tap "Plus" tab. See the export section.
       - Tap `Télécharger mes recettes`. iOS Safari behavior: the JSON either downloads to Files OR opens as a tab with the JSON content. Either is acceptable for v0.1.
       - Open the file in a desktop browser or Files app — confirm it's valid JSON with `{ "recipes": [...] }` containing all 4 recipes including `source_capture`, `photo_paths`, etc.

    9. **Cross-household isolation visual sanity:**
       - Doesn't apply at this layer (you only have one household). Trust the backend's curl tests from 01-08.

    Common failure modes:
    - Photo doesn't render → signed-URL endpoint failing → check Railway logs for `path not on recipe` or supabase signed-url errors.
    - Search delays > 1s → debounce too long or backend slow → confirm 300ms in `SearchInput.tsx`.
    - Realtime tab badge doesn't update → BottomNav's `useRealtime()` not subscribing → confirm the `onEvent` handler is registered in `useEffect` with proper cleanup.
    - Export tries to download but iOS Safari blocks → expected if not in standalone PWA mode; relaunch the home-screen icon and retry.
  </how-to-verify>
  <resume-signal>Type "approved" when all 9 checks pass on both phones, OR describe what failed.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → GET /recipes/{id}/photo-url | Bearer-protected; path must match the recipe's photo_paths |
| browser → GET /households/{id}/export.json | Bearer-protected; path must match member's household_id |
| signed-URL ← Supabase | 5-minute TTL; consumed in <img src> directly |
| WS frame → list state | Trusted; only same-household clients see frames |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-01-10-01 | Information Disclosure | crafted `path` query reads arbitrary bucket object | high | mitigate | `signed_photo_url` route checks `path in recipe.photo_paths` (Task 1, photos.py extension); 404 otherwise. |
| T-01-10-02 | Elevation of Privilege | export of another household's recipes | high | mitigate | Reuses 01-08 T-01-08-06 mitigation: path-param household_id MUST equal member.household_id; 404 otherwise. |
| T-01-10-03 | Information Disclosure | signed URL too long-lived | medium | mitigate | TTL = 5 min (Task 1). At iOS Safari refresh cadence, this is enough; revisit if photos grind under poor connectivity. |
| T-01-10-04 | Tampering | XSS via recipe title injecting `<script>` | medium | mitigate | React renders strings as text nodes by default; no `dangerouslySetInnerHTML` anywhere in this plan. |
| T-01-10-05 | Information Disclosure | search query echoed in URL leaks via referrer | low | accept | Search runs as `?q=...` query string per RESTful convention. iOS Safari does NOT send Referer to cross-origin by default with default referrer-policy strict-origin-when-cross-origin (Next.js 16 default). |
| T-01-10-06 | Denial of Service | search debounce racing produces stale results | low | mitigate | Each search call replaces `recipes` state on resolution; if calls race, last-write-wins per `Promise` resolution order. Acceptable for couple-scale; productize-later: cancel-in-flight via AbortController. |
| T-01-10-07 | Spoofing | fake `recipe.created` WS frame from compromised channel | n/a | mitigate-by-design | Only the backend produces frames (01-05 T-01-05-02 enforces channel keying). |

`high` items (01, 02) addressed in this plan.
</threat_model>

<verification>
Manual via the 9-step checkpoint in Task 3. Coverage:

- RECIPE-03 ✓ List shows household recipes with text search debounced 300ms; ILIKE matches title and ingredients (verified by "pois" matching "Salade de pois chiches" via the ingredients field if it was populated, or just title hits).
- RECIPE-04 ✓ Detail page shows all fields, photos via signed URLs, last_cooked_at + cook_count meta.
- RECIPE-06 ✓ Drafts inbox tab + live badge `(N)` updated via realtime.
- RECIPE-08 ✓ Export button downloads `al-dente-recipes-{household_id}.json` containing the full library shape.

After this checkpoint passes, 01-11 (recipes-frontend-write) ships the new/edit forms and the photo uploader UI.
</verification>

<success_criteria>
The 9-step checkpoint passes on both phones. The household library is fully browsable from the PWA; partner-side new recipes appear silently within ~500ms; export works on iOS Safari (download or in-tab JSON view).
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundations-w1/01-10-SUMMARY.md` documenting:
- The signed-URL TTL (5 min — locked).
- Whether iOS Safari downloaded the export file or rendered as a tab (note observed behavior; productize-later: explicit "Save to Files" hint).
- The realtime patterns used in BottomNav, RecipesPage, InboxPage so 01-11 can mirror them for new/edit screens.
</output>
