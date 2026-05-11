---
phase: 01-foundations-w1
plan: 11
plan_number: 11
slug: recipes-frontend-write
type: execute
wave: 9
depends_on: [recipes-frontend-read]
files_modified:
  - frontend/lib/i18n/fr.json
  - frontend/components/PhotoUploader.tsx
  - frontend/components/RecipeForm.tsx
  - frontend/app/recipes/new/page.tsx
  - frontend/app/recipes/[id]/edit/page.tsx
autonomous: false
requirements: [RECIPE-01, RECIPE-02, RECIPE-05, RECIPE-07]
must_haves:
  truths:
    - "/recipes/new tabs between `Rapide` (title + optional photo → POST /recipes/quick then POST /recipes/{id}/photos when a photo was attached → routes to /inbox) and `Complète` (full form → POST /recipes → routes to /recipes/[id])"
    - "/recipes/[id]/edit pre-fills with the recipe's current values, posts a PATCH-style PUT, can flip status from 'draft' to 'structured' (so a quick-add can be promoted via the edit form), routes to /recipes/[id] on success"
    - "PhotoUploader supports up to 4 photos; tapping the empty slot opens a Sheet with `Caméra` / `Photothèque`; tapping ✕ on a thumbnail removes it (currently with a 5s undo toast — no actual server delete in W1, since RECIPE-05 doesn't include photo removal; the X is informational + a productize-later TODO)"
    - "Photo upload calls POST /recipes/{id}/photos (the route from 01-09); 4-photo cap, 8 MiB cap, and unsupported-MIME errors surface as inline errors per UI-SPEC §Copywriting > Error states"
    - "After a successful create, a single sonner success toast `Recette enregistrée` fires (per UI-SPEC §Toast vs inline rules)"
    - "Cuisine, Mood (multi), Protein, Season selects use the wire-format enum values from frontend/lib/enums.ts (no drift from backend) — a small label helper translates the wire value to a French label"
  artifacts:
    - path: "frontend/components/PhotoUploader.tsx"
      provides: "2x2 grid of 96x96 photo slots; Plus icon on empty slot opens a Sheet with Camera/Library options; X on filled slot removes (with undo toast)"
    - path: "frontend/components/RecipeForm.tsx"
      provides: "Reusable form for full create + edit (title, ingredients, steps, prep_time, servings, cuisine, moods, protein, seasonality, tags, photos)"
    - path: "frontend/app/recipes/new/page.tsx"
      provides: "Tabs Rapide/Complète host"
    - path: "frontend/app/recipes/[id]/edit/page.tsx"
      provides: "Pre-filled RecipeForm in edit mode"
  key_links:
    - from: "frontend/components/PhotoUploader.tsx"
      to: "backend/app/routers/photos.py"
      via: "FormData upload to POST /recipes/{id}/photos"
      pattern: "FormData|multipart"
    - from: "frontend/components/RecipeForm.tsx"
      to: "frontend/lib/enums.ts"
      via: "Cuisine / Mood / Protein / Season select options"
      pattern: "Cuisine|Mood|Protein|Season"
---

<objective>
Implement the write side of the recipe library: `/recipes/new` (full + quick toggle), `/recipes/[id]/edit` (with status-flip support so quick-adds can be promoted to structured), and the `PhotoUploader` component that uploads to the multipart endpoint shipped in 01-09. After this plan, the recipe-library success criterion `User creates 10 recipes via a mix of full form and quick-add` is achievable from inside the PWA without curl.

Per UI-SPEC §"Copywriting Contract > Destructive confirmations", the X on a photo thumbnail is paired with an undo toast — but in W1 the backend has no `DELETE /recipes/{id}/photos/{path}` endpoint. To stay honest with that scope: tapping X removes the path from the LOCAL form state (so it won't be saved on the next PUT), and the toast says "Photo retirée. Annuler" with a 5s window where Annuler restores it. The backend bytes remain in Supabase Storage until W4's productize-later cleanup task — this is an acceptable W1 leak since the path is no longer referenced from any recipe row. Document with `// TODO(productize)` on the removal handler.

Purpose: RECIPE-01 (UI side), RECIPE-02 (UI side), RECIPE-05 (edit), RECIPE-07 (UI side). Honors UI-SPEC §"Surface-by-Surface Pinning" §8 + §10 + §"Component Inventory > PhotoUploader.tsx".
Output: A user can sit in front of the PWA and create 10 recipes (mix of quick + full + photo) without touching any developer tool.
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
@frontend/lib/enums.ts
@frontend/lib/i18n/fr.json
@frontend/lib/recipes.ts
@frontend/components/PhotoUploader.tsx
@frontend/components/RealtimeProvider.tsx
@frontend/components/ui/tabs.tsx
@frontend/components/ui/sheet.tsx
@frontend/components/ui/select.tsx
@frontend/components/ui/textarea.tsx
</context>

<interfaces>
From 01-08 recipes-backend:
- `POST /recipes` (full): body matches `RecipeFullCreate` — title required; ingredients/steps/prep_time/servings/cuisine/mood/main_protein/seasonality/tags optional. Returns RecipeResponse.
- `POST /recipes/quick`: body `{title}` only. Returns RecipeResponse with status='draft'.
- `PUT /recipes/{id}`: body `RecipeUpdate` (any subset of writable fields). Status MAY be flipped 'draft' → 'structured' here.

From 01-09 photo-upload-backend:
- `POST /recipes/{id}/photos` multipart `file=@...`. 8 MiB hard cap, JPEG/PNG/HEIC only, 4-photo cap. Returns updated RecipeResponse.

From 01-10 recipes-frontend-read:
- `Recipe` type from `frontend/lib/recipes.ts`.
- `getSignedPhotoUrl(recipeId, path)` for rendering existing photos in the edit form.

From 01-01 shared-vocab:
- `frontend/lib/enums.ts` exports `Cuisine`, `Mood`, `Protein`, `Season` (wire-format string values).

UI-SPEC contracts consumed:
- §"Surface-by-Surface Pinning" §8 (Recipe new — Rapide / Complète tabs at top; Rapide: title + optional photo + Ajouter CTA; Complète: full set of fields + Enregistrer la recette CTA).
- §"Surface-by-Surface Pinning" §10 (PhotoUploader — `grid grid-cols-2 gap-3`, 96x96 slots, X overlay, sheet with Caméra/Photothèque, disabled when 4 photos).
- §"Copywriting Contract > Primary CTAs" — exact verbs (`Ajouter`, `Enregistrer la recette`, `Enregistrer les modifications`, `Ajouter une photo`).
- §"Copywriting Contract > Error states" — `Maximum 4 photos par recette.`, `Photo non envoyée. Vérifie la taille et réessaie.`, etc.
- §"Tap targets" — primary CTAs `h-11`, icon-only buttons `h-11 w-11`.

A small French-label helper for enum values is acceptable scope here; it lives in `frontend/lib/enum-labels.ts` and uses `useTranslations('enums')` keyed under the new `enums.cuisine.italian` etc keys we add to fr.json. (The same helper will be reused on the read-side detail page — 01-10's RecipeCard rendered raw values for v0.1 simplicity; 01-11 promotes that one badge call to use the helper.)
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: i18n enum labels + RecipeForm component (shared by new+edit) + PhotoUploader component</name>
  <files>frontend/lib/i18n/fr.json, frontend/components/PhotoUploader.tsx, frontend/components/RecipeForm.tsx, frontend/lib/enum-labels.ts</files>
  <read_first>
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Component Inventory > PhotoUploader.tsx" (2x2 grid, 96x96 slots, plus icon, sheet with Caméra/Photothèque)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Surface-by-Surface Pinning" §8 (Rapide vs Complète field list)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Copywriting Contract > Primary CTAs" (exact verb conventions)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Copywriting Contract > Error states" (photo-related errors)
    - frontend/lib/enums.ts (the wire-format enum values to translate)
    - SPEC.md §"Locked vocabularies" (the 4 enum sets — these are the only values RecipeForm should accept)
    - For shadcn `Tabs`, `Select`, `Sheet` component APIs (already pasted in 01-02), read the local files: `frontend/components/ui/tabs.tsx`, `frontend/components/ui/select.tsx`, `frontend/components/ui/sheet.tsx`. The shadcn pattern uses Radix primitives; props are stable.
    - For HTML `<input type="file" capture="environment" accept="image/*">` behavior on iOS Safari (the camera-vs-library distinction), query Context7 (`mcp__context7__`) for current MDN guidance. iOS lets the user pick from camera roll OR live capture when `accept` allows it; `capture="environment"` is a hint that biases to back-camera. Two `<input>`s (one with capture, one without) is the simplest "Caméra / Photothèque" UX.
  </read_first>
  <action>
    1. **Extend `frontend/lib/i18n/fr.json`** with enum labels and write-side copy. Add as new top-level `enums` block plus extend `recipes` and add a new `photo_uploader` block:
       ```json
       {
         "enums": {
           "cuisine": {
             "italian": "Italienne",
             "french": "Française",
             "asian": "Asiatique",
             "mediterranean": "Méditerranéenne",
             "middleEastern": "Moyen-orientale",
             "indian": "Indienne",
             "mexican": "Mexicaine",
             "northAfrican": "Maghrébine",
             "american": "Américaine",
             "other": "Autre"
           },
           "mood": {
             "comfort": "Réconfortante",
             "light": "Légère",
             "quick": "Rapide",
             "celebratory": "Festive",
             "adventurous": "Aventureuse"
           },
           "protein": {
             "poultry": "Volaille",
             "redMeat": "Viande rouge",
             "fish": "Poisson",
             "seafood": "Fruits de mer",
             "egg": "Œuf",
             "legume": "Légumineuse",
             "none": "Sans protéine"
           },
           "season": {
             "spring": "Printemps",
             "summer": "Été",
             "autumn": "Automne",
             "winter": "Hiver"
           }
         },
         "recipes": {
           "new": {
             "tab_title": "Nouvelle recette",
             "tab_quick": "Rapide",
             "tab_full": "Complète",
             "title_label": "Titre",
             "title_placeholder": "Carbonara express",
             "ingredients_label": "Ingrédients (un par ligne)",
             "ingredients_placeholder": "200 g de pâtes\\n2 oeufs\\n80 g de pancetta",
             "steps_label": "Étapes (une par ligne)",
             "prep_time_label": "Temps de prép. (min)",
             "servings_label": "Personnes",
             "cuisine_label": "Cuisine",
             "cuisine_none": "Non précisé",
             "mood_label": "Ambiance",
             "protein_label": "Protéine principale",
             "seasonality_label": "Saisons",
             "tags_label": "Tags (un par ligne)",
             "submit_quick": "Ajouter",
             "submit_full": "Enregistrer la recette",
             "uploading_photo": "Envoi de la photo…",
             "saved_toast": "Recette enregistrée",
             "saved_without_photo": "Recette enregistrée, mais la photo n'a pas pu être ajoutée."
           },
           "edit": {
             "title": "Modifier la recette",
             "submit": "Enregistrer les modifications",
             "saved_toast": "Recette modifiée"
           }
         },
         "photo_uploader": {
           "add_label": "Ajouter une photo",
           "remove_label": "Retirer la photo",
           "sheet_title": "Ajouter une photo",
           "sheet_camera": "Caméra",
           "sheet_library": "Photothèque",
           "removed_toast": "Photo retirée",
           "undo_cta": "Annuler",
           "error_limit": "Maximum 4 photos par recette.",
           "error_size": "Photo non envoyée. Vérifie la taille et réessaie.",
           "error_type": "Format de photo non supporté.",
           "error_network": "Photo non envoyée. Vérifie ta connexion et réessaie."
         }
       }
       ```

    2. **`frontend/lib/enum-labels.ts`** — translation helper:
       ```ts
       "use client";
       import { useTranslations } from "next-intl";

       export function useEnumLabels() {
         const tCuisine = useTranslations("enums.cuisine");
         const tMood = useTranslations("enums.mood");
         const tProtein = useTranslations("enums.protein");
         const tSeason = useTranslations("enums.season");
         return {
           cuisine: (v: string) => { try { return tCuisine(v as never); } catch { return v; } },
           mood: (v: string) => { try { return tMood(v as never); } catch { return v; } },
           protein: (v: string) => { try { return tProtein(v as never); } catch { return v; } },
           season: (v: string) => { try { return tSeason(v as never); } catch { return v; } },
         };
       }
       ```
       (The try/catch is for forward compatibility — if a future enum value lands in the wire format before fr.json is updated, we fall back to the raw value rather than crashing.)

    3. **`frontend/components/PhotoUploader.tsx`** — UI-SPEC §10 + integrates POST /recipes/{id}/photos:
       ```tsx
       "use client";
       import { useRef, useState, useEffect } from "react";
       import { useTranslations } from "next-intl";
       import { Plus, X, Camera, ImageIcon } from "lucide-react";
       import { Button } from "@/components/ui/button";
       import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
       import { toast } from "sonner";
       import { getSignedPhotoUrl } from "@/lib/recipes";

       const MAX_PHOTOS = 4;

       type Props = {
         /** If recipeId is null, photos cannot be uploaded yet (e.g. mid-form before save).
          *  In that case the PhotoUploader is read-only / shows nothing — the new-recipe
          *  flow handles photo upload AFTER first save. */
         recipeId: string | null;
         paths: string[];
         onChange: (paths: string[]) => void;
       };

       type RemovedPhoto = { path: string; index: number };

       export function PhotoUploader({ recipeId, paths, onChange }: Props) {
         const t = useTranslations("photo_uploader");
         const fileCameraRef = useRef<HTMLInputElement | null>(null);
         const fileLibraryRef = useRef<HTMLInputElement | null>(null);
         const [urls, setUrls] = useState<Record<string, string>>({});
         const [uploading, setUploading] = useState(false);
         const [removedRecently, setRemovedRecently] = useState<RemovedPhoto | null>(null);

         useEffect(() => {
           if (!recipeId) return;
           let cancelled = false;
           Promise.all(paths.map(async (p) => [p, await getSignedPhotoUrl(recipeId, p)] as const))
             .then((entries) => { if (!cancelled) setUrls(Object.fromEntries(entries)); })
             .catch(() => { /* leave urls empty; render placeholder */ });
           return () => { cancelled = true; };
         }, [recipeId, paths]);

         async function uploadFile(f: File) {
           if (!recipeId) return;
           if (paths.length >= MAX_PHOTOS) { toast.error(t("error_limit")); return; }
           const fd = new FormData();
           fd.append("file", f);
           setUploading(true);
           try {
             const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
             const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/recipes/${recipeId}/photos`, {
               method: "POST",
               headers: token ? { Authorization: `Bearer ${token}` } : {},
               body: fd,
             });
             if (res.status === 413) { toast.error(t("error_size")); return; }
             if (res.status === 415) { toast.error(t("error_type")); return; }
             if (res.status === 409) { toast.error(t("error_limit")); return; }
             if (!res.ok) { toast.error(t("error_network")); return; }
             const recipe = await res.json() as { photo_paths: string[] };
             onChange(recipe.photo_paths);
           } catch {
             toast.error(t("error_network"));
           } finally {
             setUploading(false);
           }
         }

         function removePhoto(path: string) {
           // TODO(productize): W1 has no DELETE /recipes/{id}/photos/{path} endpoint.
           // Removal here only drops the path from local form state; the bytes
           // stay in Supabase Storage until a productize-later cleanup pass.
           const idx = paths.indexOf(path);
           if (idx === -1) return;
           const next = paths.filter((p) => p !== path);
           onChange(next);
           setRemovedRecently({ path, index: idx });
           toast(t("removed_toast"), {
             action: {
               label: t("undo_cta"),
               onClick: () => {
                 const restored = [...next];
                 restored.splice(idx, 0, path);
                 onChange(restored);
                 setRemovedRecently(null);
               },
             },
             duration: 5000,
           });
         }

         const slots: (string | null)[] = [...paths];
         while (slots.length < MAX_PHOTOS) slots.push(null);

         return (
           <div className="grid grid-cols-2 gap-3">
             {slots.map((p, i) => (
               p == null ? (
                 i === paths.length ? (
                   // Empty add slot
                   <Sheet key={`empty-${i}`}>
                     <SheetTrigger asChild>
                       <button
                         type="button"
                         disabled={!recipeId || uploading}
                         aria-label={t("add_label")}
                         className="h-24 w-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center disabled:opacity-50"
                       >
                         <Plus className="h-6 w-6 text-foreground-muted" />
                       </button>
                     </SheetTrigger>
                     <SheetContent side="bottom">
                       <SheetHeader><SheetTitle>{t("sheet_title")}</SheetTitle></SheetHeader>
                       <div className="flex flex-col gap-2 pt-4">
                         <Button variant="secondary" className="h-11" onClick={() => fileCameraRef.current?.click()}>
                           <Camera className="h-4 w-4 mr-2" />{t("sheet_camera")}
                         </Button>
                         <Button variant="secondary" className="h-11" onClick={() => fileLibraryRef.current?.click()}>
                           <ImageIcon className="h-4 w-4 mr-2" />{t("sheet_library")}
                         </Button>
                       </div>
                       <input ref={fileCameraRef} type="file" accept="image/*" capture="environment"
                              className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                       <input ref={fileLibraryRef} type="file" accept="image/*"
                              className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                     </SheetContent>
                   </Sheet>
                 ) : (
                   // Locked-empty (after the 4-photo cap)
                   <div key={`locked-${i}`} aria-hidden className="h-24 w-24" />
                 )
               ) : (
                 <div key={p} className="relative h-24 w-24 rounded-lg overflow-hidden">
                   {urls[p]
                     ? <img src={urls[p]} alt="" className="h-full w-full object-cover" />
                     : <div className="h-full w-full bg-surface-muted" />}
                   <button
                     type="button"
                     aria-label={t("remove_label")}
                     onClick={() => removePhoto(p)}
                     className="absolute top-1 right-1 h-6 w-6 rounded-full bg-foreground/80 text-background flex items-center justify-center"
                   >
                     <X className="h-4 w-4" />
                   </button>
                 </div>
               )
             ))}
           </div>
         );
       }
       ```

    4. **`frontend/components/RecipeForm.tsx`** — shared full-form for new + edit:
       ```tsx
       "use client";
       import { useState } from "react";
       import { useTranslations } from "next-intl";
       import { Loader2, ChevronLeft } from "lucide-react";
       import { Button } from "@/components/ui/button";
       import { Input } from "@/components/ui/input";
       import { Textarea } from "@/components/ui/textarea";
       import { Label } from "@/components/ui/label";
       import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
       import { Cuisine, Mood, Protein, Season } from "@/lib/enums";
       import { useEnumLabels } from "@/lib/enum-labels";
       import { PhotoUploader } from "@/components/PhotoUploader";
       import type { Recipe } from "@/lib/recipes";

       export type RecipeFormValues = {
         title: string;
         ingredients_text: string;  // one per line — server expects array; we split on save
         steps_text: string;        // one per line
         prep_time_minutes: string;
         servings: string;
         cuisine: string;          // "" means none
         mood: string[];
         main_protein: string;     // "" means none
         seasonality: string[];
         tags_text: string;
         photo_paths: string[];
       };

       export function recipeToFormValues(r: Recipe): RecipeFormValues {
         return {
           title: r.title,
           ingredients_text: (r.ingredients ?? []).map(i =>
             [i.quantity, i.unit, i.name].filter(Boolean).join(" ")).join("\\n"),
           steps_text: (r.steps ?? []).join("\\n"),
           prep_time_minutes: r.prep_time_minutes?.toString() ?? "",
           servings: r.servings?.toString() ?? "",
           cuisine: r.cuisine ?? "",
           mood: r.mood ?? [],
           main_protein: r.main_protein ?? "",
           seasonality: r.seasonality ?? ["spring","summer","autumn","winter"],
           tags_text: (r.tags ?? []).join("\\n"),
           photo_paths: r.photo_paths,
         };
       }

       export function formValuesToBody(v: RecipeFormValues) {
         const ingredients = v.ingredients_text.split("\\n").map(s => s.trim()).filter(Boolean)
           .map((line) => {
             // Best-effort parse: leading number + optional unit + rest = name.
             const m = line.match(/^(\\d+(?:[.,]\\d+)?)\\s*([a-zA-Zàâéèêëïîôùûç]+)?\\s*(.*)$/);
             if (!m) return { name: line };
             const qty = parseFloat(m[1].replace(",", "."));
             return { name: m[3] || line, quantity: isNaN(qty) ? null : qty, unit: m[2] || null };
           });
         const steps = v.steps_text.split("\\n").map(s => s.trim()).filter(Boolean);
         const tags = v.tags_text.split("\\n").map(s => s.trim()).filter(Boolean);
         return {
           title: v.title,
           ingredients,
           steps,
           prep_time_minutes: v.prep_time_minutes ? parseInt(v.prep_time_minutes, 10) : undefined,
           servings: v.servings ? parseInt(v.servings, 10) : undefined,
           cuisine: v.cuisine || undefined,
           mood: v.mood,
           main_protein: v.main_protein || undefined,
           seasonality: v.seasonality.length ? v.seasonality : ["spring","summer","autumn","winter"],
           tags,
         };
       }

       type Props = {
         initial?: RecipeFormValues;
         recipeId: string | null;  // null in /new (full); set in /edit
         onSubmit: (body: ReturnType<typeof formValuesToBody>, photoPaths: string[]) => Promise<void>;
         submitLabel: string;
         backHref: string;
         title: string;
       };

       export function RecipeForm({ initial, recipeId, onSubmit, submitLabel, backHref, title }: Props) {
         const t = useTranslations("recipes.new");
         const tCommon = useTranslations("common");
         const labels = useEnumLabels();
         const [v, setV] = useState<RecipeFormValues>(initial ?? {
           title: "", ingredients_text: "", steps_text: "", prep_time_minutes: "",
           servings: "", cuisine: "", mood: [], main_protein: "",
           seasonality: ["spring","summer","autumn","winter"], tags_text: "", photo_paths: [],
         });
         const [submitting, setSubmitting] = useState(false);

         async function handleSubmit() {
           setSubmitting(true);
           try {
             await onSubmit(formValuesToBody(v), v.photo_paths);
           } finally {
             setSubmitting(false);
           }
         }

         return (
           <>
             <header className="sticky top-0 z-10 h-12 px-6 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border">
               <Button size="icon" variant="ghost" aria-label={tCommon("back")} asChild>
                 <a href={backHref}><ChevronLeft className="h-5 w-5" /></a>
               </Button>
               <span className="text-base font-semibold">{title}</span>
               <span className="w-10" aria-hidden />
             </header>
             <div className="flex flex-col gap-6 px-6 pt-6 pb-32">
               <div><Label>{t("title_label")}</Label>
                 <Input value={v.title} onChange={(e) => setV({...v, title: e.target.value})} placeholder={t("title_placeholder")} required maxLength={200} /></div>
               <div><Label>{t("ingredients_label")}</Label>
                 <Textarea rows={6} value={v.ingredients_text} onChange={(e) => setV({...v, ingredients_text: e.target.value})} placeholder={t("ingredients_placeholder")} /></div>
               <div><Label>{t("steps_label")}</Label>
                 <Textarea rows={6} value={v.steps_text} onChange={(e) => setV({...v, steps_text: e.target.value})} /></div>
               <div className="grid grid-cols-2 gap-4">
                 <div><Label>{t("prep_time_label")}</Label>
                   <Input type="number" inputMode="numeric" min={0} max={1440} value={v.prep_time_minutes} onChange={(e) => setV({...v, prep_time_minutes: e.target.value})} /></div>
                 <div><Label>{t("servings_label")}</Label>
                   <Input type="number" inputMode="numeric" min={1} max={99} value={v.servings} onChange={(e) => setV({...v, servings: e.target.value})} /></div>
               </div>
               <div><Label>{t("cuisine_label")}</Label>
                 <Select value={v.cuisine} onValueChange={(val) => setV({...v, cuisine: val === "_none" ? "" : val})}>
                   <SelectTrigger><SelectValue placeholder={t("cuisine_none")} /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="_none">{t("cuisine_none")}</SelectItem>
                     {Object.values(Cuisine).map((c) => <SelectItem key={c} value={c}>{labels.cuisine(c)}</SelectItem>)}
                   </SelectContent>
                 </Select></div>
               <div><Label>{t("mood_label")}</Label>
                 <div className="flex flex-wrap gap-2">
                   {Object.values(Mood).map((m) => {
                     const on = v.mood.includes(m);
                     return (
                       <Button key={m} type="button" variant={on ? "default" : "outline"} size="sm"
                               onClick={() => setV({...v, mood: on ? v.mood.filter(x => x !== m) : [...v.mood, m]})}>
                         {labels.mood(m)}
                       </Button>
                     );
                   })}
                 </div></div>
               <div><Label>{t("protein_label")}</Label>
                 <Select value={v.main_protein} onValueChange={(val) => setV({...v, main_protein: val === "_none" ? "" : val})}>
                   <SelectTrigger><SelectValue placeholder={t("cuisine_none")} /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="_none">{t("cuisine_none")}</SelectItem>
                     {Object.values(Protein).map((p) => <SelectItem key={p} value={p}>{labels.protein(p)}</SelectItem>)}
                   </SelectContent>
                 </Select></div>
               <div><Label>{t("seasonality_label")}</Label>
                 <div className="flex flex-wrap gap-2">
                   {Object.values(Season).map((s) => {
                     const on = v.seasonality.includes(s);
                     return (
                       <Button key={s} type="button" variant={on ? "default" : "outline"} size="sm"
                               onClick={() => setV({...v, seasonality: on ? v.seasonality.filter(x => x !== s) : [...v.seasonality, s]})}>
                         {labels.season(s)}
                       </Button>
                     );
                   })}
                 </div></div>
               <div><Label>{t("tags_label")}</Label>
                 <Textarea rows={3} value={v.tags_text} onChange={(e) => setV({...v, tags_text: e.target.value})} /></div>
               <div><Label>{t("title_label")}</Label>{/* photo section */}</div>
               <PhotoUploader recipeId={recipeId} paths={v.photo_paths} onChange={(p) => setV({...v, photo_paths: p})} />
             </div>
             <div className="fixed bottom-0 inset-x-0 px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-3 bg-background/80 backdrop-blur-sm border-t border-border">
               <Button className="h-11 w-full" disabled={!v.title.trim() || submitting} onClick={handleSubmit}>
                 {submitting ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />{tCommon("saving")}</> : submitLabel}
               </Button>
             </div>
           </>
         );
       }
       ```
       Note: this RecipeForm does NOT use the bottom-nav layout; instead it has its own fixed bottom CTA (UI-SPEC §"Layout & Navigation > Top app bar > Modal-like routes"). The bottom-nav is hidden on the modal-pattern routes via the same `useSelectedLayoutSegment()` trick BottomNav uses for `/onboarding` — extend BottomNav's hidden-segment list to include `recipes/new`, `recipes/[id]/edit` if they shouldn't show the global nav. (UI-SPEC §"Routes (App Router)" lists `/recipes/new` and `/recipes/[id]/edit` as "modal pattern w/ back" — keep BottomNav visible there since the routes table says "Yes" for `Has bottom nav?`. The form's fixed bottom CTA layers on top of the bottom nav via z-index.)
  </action>
  <verify>
    <automated>cd frontend && test -f components/PhotoUploader.tsx && test -f components/RecipeForm.tsx && test -f lib/enum-labels.ts && grep -q "TODO(productize)" components/PhotoUploader.tsx && grep -q "MAX_PHOTOS = 4" components/PhotoUploader.tsx && grep -q "capture=\"environment\"" components/PhotoUploader.tsx && grep -q "FormData" components/PhotoUploader.tsx && grep -q "recipeToFormValues" components/RecipeForm.tsx && grep -q "formValuesToBody" components/RecipeForm.tsx && grep -q "Object.values(Cuisine)" components/RecipeForm.tsx && grep -q "Maximum 4 photos par recette" lib/i18n/fr.json && grep -q "Italienne" lib/i18n/fr.json && grep -q "Volaille" lib/i18n/fr.json && grep -q "Recette enregistrée" lib/i18n/fr.json && npx tsc --noEmit && npm run build</automated>
  </verify>
  <done>3 components + i18n keys exist; build passes; PhotoUploader has the 4-cap, MIME-error i18n strings, and the productize-later marker for the no-server-delete UX.</done>
</task>

<task type="auto">
  <name>Task 2: /recipes/new (Rapide+Complète tabs) and /recipes/[id]/edit pages</name>
  <files>frontend/app/recipes/new/page.tsx, frontend/app/recipes/[id]/edit/page.tsx</files>
  <read_first>
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Surface-by-Surface Pinning" §8 (Rapide vs Complète shape)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Copywriting Contract > Primary CTAs" (Rapide → "Ajouter", Complète → "Enregistrer la recette", Edit → "Enregistrer les modifications")
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Interaction Patterns > Toast vs inline rules" (success → toast 5s; field validation → inline; 5xx → toast)
    - frontend/components/ui/tabs.tsx (shadcn Tabs API)
  </read_first>
  <action>
    1. **`frontend/app/recipes/new/page.tsx`** — UI-SPEC §8 Rapide vs Complète:
       ```tsx
       "use client";
       import { useState } from "react";
       import { useRouter } from "next/navigation";
       import { useTranslations } from "next-intl";
       import { Loader2, ChevronLeft } from "lucide-react";
       import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
       import { Button } from "@/components/ui/button";
       import { Input } from "@/components/ui/input";
       import { Label } from "@/components/ui/label";
       import { toast } from "sonner";
       import { api } from "@/lib/api";
       import { RecipeForm, formValuesToBody } from "@/components/RecipeForm";
       import { OnboardingGuard } from "@/lib/onboarding-guard";
       import type { Recipe } from "@/lib/recipes";

       export default function RecipeNewPage() {
         return <OnboardingGuard><Inner /></OnboardingGuard>;
       }

       function Inner() {
         const router = useRouter();
         const t = useTranslations("recipes.new");
         const tCommon = useTranslations("common");
         const tErr = useTranslations("onboarding.errors");
         const tPhoto = useTranslations("photo_uploader");
         const [tab, setTab] = useState<"quick" | "full">("quick");
         const [quickTitle, setQuickTitle] = useState("");
         const [quickPhoto, setQuickPhoto] = useState<File | null>(null);
         // Two-stage progress: "title" (POSTing /recipes/quick), "photo" (POSTing /photos), null (idle).
         const [quickStage, setQuickStage] = useState<null | "title" | "photo">(null);

         // RECIPE-02: Rapide MUST honor "title only and an optional photo". Two-step flow:
         //   1. POST /recipes/quick { title } → returns the new draft's id
         //   2. If a photo was attached: POST /recipes/{id}/photos (multipart) — same upload helper
         //      shape as PhotoUploader (01-09 endpoint).
         //   3. Toast + route to /inbox regardless of photo outcome (the draft is the durable artifact).
         //   4. If photo upload fails, the draft is still saved — surface a softer toast that says so.
         async function submitQuick() {
           setQuickStage("title");
           let createdId: string | null = null;
           try {
             const r = await api<Recipe>("/recipes/quick", { method: "POST", body: JSON.stringify({title: quickTitle}) });
             createdId = r.id;
           } catch {
             toast.error(tErr("network"));
             setQuickStage(null);
             return;
           }

           // No photo attached → done.
           if (!quickPhoto) {
             toast.success(t("saved_toast"));
             setQuickStage(null);
             router.replace(`/inbox`);
             return;
           }

           // Photo attached → step 2. Reuse the multipart shape from PhotoUploader (01-09 endpoint).
           setQuickStage("photo");
           try {
             const fd = new FormData();
             fd.append("file", quickPhoto);
             const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
             const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/recipes/${createdId}/photos`, {
               method: "POST",
               headers: token ? { Authorization: `Bearer ${token}` } : {},
               body: fd,
             });
             if (!res.ok) {
               // Soft failure: draft was saved; only the photo failed. Tell the user honestly.
               toast.warning(t("saved_without_photo"));
             } else {
               toast.success(t("saved_toast"));
             }
           } catch {
             toast.warning(t("saved_without_photo"));
           } finally {
             setQuickStage(null);
             router.replace(`/inbox`);
           }
         }

         async function submitFull(body: ReturnType<typeof formValuesToBody>) {
           try {
             const r = await api<Recipe>("/recipes", { method: "POST", body: JSON.stringify(body) });
             toast.success(t("saved_toast"));
             router.replace(`/recipes/${r.id}`);
           } catch {
             toast.error(tErr("network"));
           }
         }

         return (
           <Tabs value={tab} onValueChange={(v) => setTab(v as "quick" | "full")}>
             <header className="sticky top-0 z-10 h-12 px-6 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border">
               <Button size="icon" variant="ghost" aria-label={tCommon("back")} asChild>
                 <a href="/recipes"><ChevronLeft className="h-5 w-5" /></a>
               </Button>
               <span className="text-base font-semibold">{t("tab_title")}</span>
               <span className="w-10" aria-hidden />
             </header>
             <TabsList className="mx-6 mt-4">
               <TabsTrigger value="quick" className="flex-1">{t("tab_quick")}</TabsTrigger>
               <TabsTrigger value="full" className="flex-1">{t("tab_full")}</TabsTrigger>
             </TabsList>
             <TabsContent value="quick" className="px-6 pt-6 pb-32 flex flex-col gap-6">
               <div>
                 <Label htmlFor="quick-title">{t("title_label")}</Label>
                 <Input id="quick-title" value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)}
                        placeholder={t("title_placeholder")} maxLength={200} required autoFocus />
               </div>
               {/* RECIPE-02 optional photo. The picker uses native <input type="file"> so it is
                   honest about iOS Safari's capture-or-library affordance — UI-SPEC §10's richer
                   PhotoUploader requires a recipe id (post-save), so for the quick-add pre-save
                   stage we render a simpler picker. The photo is held in component state and
                   uploaded in step 2 of submitQuick. */}
               <div>
                 <Label htmlFor="quick-photo">{tPhoto("add_label")}</Label>
                 <input id="quick-photo" type="file" accept="image/*"
                        className="block w-full text-sm text-foreground"
                        onChange={(e) => setQuickPhoto(e.target.files?.[0] ?? null)} />
                 {quickPhoto != null && (
                   <p className="text-xs text-foreground-muted mt-1">{quickPhoto.name}</p>
                 )}
               </div>
               <div className="fixed bottom-0 inset-x-0 px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-3 bg-background/80 backdrop-blur-sm border-t border-border">
                 <Button className="h-11 w-full" disabled={!quickTitle.trim() || quickStage !== null} onClick={submitQuick}>
                   {quickStage === "title" ? (<><Loader2 className="animate-spin h-4 w-4 mr-2" />{tCommon("saving")}</>)
                     : quickStage === "photo" ? (<><Loader2 className="animate-spin h-4 w-4 mr-2" />{t("uploading_photo")}</>)
                     : t("submit_quick")}
                 </Button>
               </div>
             </TabsContent>
             <TabsContent value="full" className="-mx-6">{/* RecipeForm has its own px-6 wrap and own fixed CTA */}
               <RecipeForm
                 recipeId={null}
                 onSubmit={async (body) => submitFull(body)}
                 submitLabel={t("submit_full")}
                 backHref="/recipes"
                 title={t("tab_title")}
               />
             </TabsContent>
           </Tabs>
         );
       }
       ```
       Note: when in quick mode, photo upload is intentionally skipped — RECIPE-02 says "title only and an optional photo" — but the photo upload route requires a recipe id. The honest workflow: quick-add lands the user on `/inbox`, where tapping the draft routes to `/edit`, where photo upload IS available. This adds one extra tap but keeps the W1 logic linear; documented as a known UX seam.

    2. **`frontend/app/recipes/[id]/edit/page.tsx`** — pre-fill + PUT:
       ```tsx
       "use client";
       import { useEffect, useState } from "react";
       import { useParams, useRouter } from "next/navigation";
       import { useTranslations } from "next-intl";
       import { toast } from "sonner";
       import { api } from "@/lib/api";
       import { RecipeForm, recipeToFormValues, formValuesToBody, type RecipeFormValues } from "@/components/RecipeForm";
       import { OnboardingGuard } from "@/lib/onboarding-guard";
       import type { Recipe } from "@/lib/recipes";

       export default function RecipeEditPage() {
         return <OnboardingGuard><Inner /></OnboardingGuard>;
       }

       function Inner() {
         const params = useParams<{ id: string }>();
         const id = params.id;
         const router = useRouter();
         const t = useTranslations("recipes.edit");
         const tNew = useTranslations("recipes.new");
         const tErr = useTranslations("onboarding.errors");
         const [initial, setInitial] = useState<RecipeFormValues | null>(null);
         const [origStatus, setOrigStatus] = useState<string>("structured");

         useEffect(() => {
           api<Recipe>(`/recipes/${id}`).then((r) => {
             setInitial(recipeToFormValues(r));
             setOrigStatus(r.status);
           }).catch(() => toast.error(tErr("network")));
         }, [id, tErr]);

         async function onSubmit(body: ReturnType<typeof formValuesToBody>) {
           try {
             // If this was a draft and the form is being saved with title + ingredients,
             // promote to structured. This is the W1 path that lets users finish a quick-add
             // via the edit form (W2 layers Gemini promotion via BackgroundTask on top).
             const promote = origStatus === "draft" && body.title.trim() && (body.ingredients?.length ?? 0) > 0;
             const payload = promote ? { ...body, status: "structured" as const } : body;
             const r = await api<Recipe>(`/recipes/${id}`, { method: "PUT", body: JSON.stringify(payload) });
             toast.success(t("saved_toast"));
             router.replace(`/recipes/${r.id}`);
           } catch {
             toast.error(tErr("network"));
           }
         }

         if (!initial) return null;
         return (
           <RecipeForm
             recipeId={id}
             initial={initial}
             onSubmit={onSubmit}
             submitLabel={t("submit")}
             backHref={`/recipes/${id}`}
             title={t("title")}
           />
         );
       }
       ```
  </action>
  <verify>
    <automated>cd frontend && test -f app/recipes/new/page.tsx && test -f app/recipes/\[id\]/edit/page.tsx && grep -q "Tabs" app/recipes/new/page.tsx && grep -q "/recipes/quick" app/recipes/new/page.tsx && grep -q "/photos" app/recipes/new/page.tsx && grep -qE '<input[^>]*type="file"' app/recipes/new/page.tsx && grep -q "FormData" app/recipes/new/page.tsx && grep -q "RecipeForm" app/recipes/new/page.tsx && grep -q "RecipeForm" app/recipes/\[id\]/edit/page.tsx && grep -q "OnboardingGuard" app/recipes/new/page.tsx && grep -q "OnboardingGuard" app/recipes/\[id\]/edit/page.tsx && grep -q '"PUT"' app/recipes/\[id\]/edit/page.tsx && grep -q '"status": "structured"\|status: "structured"' app/recipes/\[id\]/edit/page.tsx && grep -q "saved_without_photo" lib/i18n/fr.json && grep -q "uploading_photo" lib/i18n/fr.json && ! grep -RnE '>(Rapide|Complète|Enregistrer|Ajouter une recette|Cuisine|Ambiance|Saisons)' app/recipes/new app/recipes/\[id\]/edit components/RecipeForm.tsx components/PhotoUploader.tsx 2>/dev/null | grep -v 't("' | grep -v "i18n" && npm run lint && npm run build</automated>
  </verify>
  <done>2 pages exist; build + lint pass; no hardcoded French copy; quick-add flow routes to /inbox; full-form flow routes to /recipes/[id]; edit flow promotes draft→structured when fields populated.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Phase-1 success-criterion smoke — create 10 recipes from inside the PWA, attach photos, edit, verify cross-phone sync</name>
  <what-built>
    Full recipe library write-side live on Vercel. Both phones can create + edit + upload-to recipes from the installed PWA without curl.
  </what-built>
  <how-to-verify>
    Wait for Vercel + Railway redeploy. On YOUR iPhones, both members logged in:

    **Phase 1 success criterion 3 (creating 10 recipes):**

    1. **On Phone A**, hit `/recipes` → tap the `+` icon top-right.
    2. **Quick-add — title only** (tab `Rapide`): type a title, leave the photo picker empty, tap `Ajouter`. You should land on `/inbox` with a `Recette enregistrée` toast and the new draft card visible. The bottom-nav badge bumps. Repeat 3 times with different titles.
    2b. **Quick-add — title + photo** (RECIPE-02 second leg): type a title, tap the photo input and pick a photo from the camera roll, tap `Ajouter`. The CTA spinner should switch from `Enregistrement…` to `Envoi de la photo…` while step 2 (POST /recipes/{id}/photos) runs. On success, you land on `/inbox` with the toast `Recette enregistrée`; tapping into the new draft on the inbox should show the photo populated. **Edge case:** if you have airplane mode toggled on AFTER the title POST but BEFORE the photo POST, you should see toast `Recette enregistrée, mais la photo n'a pas pu être ajoutée.` and the draft is still saved (photo just absent).
    3. **Full-form create** (tab `Complète`): type title, paste a few ingredients (one per line), pick cuisine, pick a mood, pick protein, leave seasonality default, tap `Enregistrer la recette`. You should land on the recipe detail page with all fields rendered, toast firing.
    4. Repeat the full-form flow 4 more times across both phones (use Phone B for some) so the corpus has 5 drafts + 5 structured = **10 recipes**.

    **Phase 1 success criterion 4 (edit + photos + export):**

    5. From `/inbox` on Phone A, tap one of your drafts. The edit form should open pre-filled with the title.
    6. Add ingredients, steps. The form should look identical to the full-form (same RecipeForm component).
    7. Scroll to the photo grid. Tap the `+` empty slot. The Sheet opens with `Caméra` / `Photothèque`. Tap `Photothèque`, pick a photo. Watch the slot populate; the next empty slot becomes the new add button.
    8. Add up to 4 photos. The 5th add-attempt should:
       - Either: the add button disappears at 4 photos (UI hides it after the 4-cap; check UI-SPEC §10 — "Disabled when 4 photos present (no add-slot rendered)").
       - Or: tapping `+` returns the toast `Maximum 4 photos par recette.` if you somehow reach the cap mid-session.
    9. Tap an X on a thumbnail. Toast `Photo retirée. Annuler` appears with 5s window. Tap `Annuler` — the photo restores. Tap X again — wait 5s — refresh the page; the photo is gone from the list (because the next save will commit `photo_paths` without it).
    10. Tap `Enregistrer les modifications`. Land on detail page. Status is now `structured` (since title + ingredients are populated; verify by going back to `/inbox` — this recipe is gone from drafts).

    **Cross-phone sync:**

    11. Both phones at `/recipes`. On Phone A, edit one of the structured recipes — change the title. Save. Within ~500ms, Phone B's list-row title updates silently (no toast on Phone B).
    12. On Phone A, full-form-create a new recipe. Phone B's `/recipes` list shows the new card slide in within ~500ms.

    **Phase 1 success criterion 5 (auth):**

    13. On Phone A, open Safari → Web Inspector (or Settings → Clear Website Data; on iOS without DevTools just tap the Settings → Clear Website Data option for the al-dente.vercel.app entry). Relaunch the PWA. You should be sent back to `/onboarding/welcome`. Verify by trying to navigate manually to `/recipes` — guard redirects to welcome.

    14. (REALTIME-03 already verified at 01-07; not re-tested here.)

    Common failure modes:
    - Photo upload fails silently → check `NEXT_PUBLIC_API_BASE` is set; check network tab for the multipart POST status code.
    - Edit form doesn't pre-fill → check `recipeToFormValues` matches the response shape.
    - Quick-add doesn't show in inbox → check the `recipe.created` event handler in `/inbox/page.tsx` filters on `payload.status === 'draft'`.
    - Promote-on-save doesn't flip status → check the status logic in `/recipes/[id]/edit/page.tsx`; verify the PUT payload includes `status: 'structured'` in the network tab.
  </how-to-verify>
  <resume-signal>Type "approved" when all 14 checks pass on both phones, OR describe what failed.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → POST /recipes/{id}/photos | multipart upload; bytes validated server-side (01-09) |
| browser → POST/PUT /recipes | bearer-protected; 422 on bad enum values |
| client form state (photo_paths) | stripped of removed paths before PUT save |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-01-11-01 | Tampering | client supplies non-palette enum value via SelectItem | medium | mitigate | Select options come from `Object.values(Cuisine)` etc — only wire-format values. Server still validates (01-08 T-01-08-03). |
| T-01-11-02 | Information Disclosure | photo bytes orphan in Supabase Storage when X removes path | low | accept | Documented productize-later cleanup task; no security impact (path no longer referenced from any recipe). |
| T-01-11-03 | Tampering | client sends `status: 'verified'` to bypass any future verification gate | medium | accept | W1 has no `verified` semantic; the schema literal allows it but it's untriggerable from the UI (we only set 'structured'). W2/W4 will add proper gating when `verified` becomes meaningful. |
| T-01-11-04 | Tampering | XSS via title field rendered in detail page | medium | mitigate | React text-node default renders strings safely; no `dangerouslySetInnerHTML`. |
| T-01-11-05 | Spoofing | iOS PWA `<input capture="environment">` hijacked to upload non-photo | medium | mitigate | Server-side magic-byte sniff (01-09 T-01-09-01) is the canonical defense. UI uses `accept="image/*"` as a hint only. |

No `high` items in this plan; the high-severity surfaces (auth, multipart upload, cross-household isolation) live in 01-04 / 01-08 / 01-09.
</threat_model>

<verification>
Manual via the 14-step checkpoint in Task 3.

Final coverage of Phase 1 success criteria after this plan passes:
- ✓ Criterion 1 (PWA install + ping round-trip ~500ms): closed at 01-07.
- ✓ Criterion 2 (household create + invite-code join + member colors): closed at 01-06.
- ✓ Criterion 3 (10 recipes via mix of full + quick + search + cross-phone): closed at 01-10 + this plan.
- ✓ Criterion 4 (edit + ≤4 photos + JSON export): closed at 01-09 (server) + 01-10 (export UI) + this plan (edit UI + photo UI).
- ✓ Criterion 5 (401 without Bearer + WS reconnect after Railway restart): closed at 01-04 (401) + 01-07 (reconnect).

After this plan: the entire Phase 1 surface is real. Plan 01-12 (D-01 cleanup) is gated on the user typing "approved — gate passed" at the end of plan 01-07; once said, 01-12 deletes the ping code on both ends.
</verification>

<success_criteria>
The 14-step checkpoint passes on both phones. RECIPE-01, RECIPE-02, RECIPE-05, RECIPE-07 (UI side) all verified. The Phase 1 dogfood gate is now open: 2 weeks of solo manual use can begin.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundations-w1/01-11-SUMMARY.md` documenting:
- The quick-add → /inbox → /edit UX seam (one extra tap to attach a photo to a quick-add) — flag whether this needs revisiting before W2 ships LLM capture which removes this seam.
- The "X on photo orphans bytes" productize-later task (clean up at W4 when storage limits become real).
- The promote-draft-on-edit logic (no separate /promote endpoint in W1; W2's BackgroundTask path overlays the same column with Gemini-extracted fields).
- A "Phase 1 dogfood gate open" marker — Luca's signal to start using the app daily for 2 weeks before Phase 2.
</output>
