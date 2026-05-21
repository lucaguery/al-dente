"use client";

// UI-SPEC §"Surface-by-Surface Pinning" §8 (Complète tab) + edit page form.
// Reused by /recipes/new (full tab) AND /recipes/[id]/edit. The form has its
// own sticky bottom CTA; the global BottomNav is also visible (z-40), and the
// form's CTA layer sits above it.

import { useState, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { BrandLoader } from "@/components/BrandLoader";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cuisine, Difficulty, Mood, Protein, Season } from "@/lib/enums";
import { useEnumLabels } from "@/lib/enum-labels";
import { PhotoUploader } from "@/components/PhotoUploader";
import type { Recipe } from "@/lib/recipes";
import { PinLabel } from "@/components/RecipeThread/PinLabel";
import type { AnswerField } from "@/lib/enums";

// Sentinel select value for "no selection" — Radix Select rejects empty
// strings as item values, so we use a non-wire-format token and translate
// it to undefined at submit time.
const NONE_VALUE = "__none__";

// CAP-03 / D-16-09 — French ingredient unit whitelist.
//
// Lowercased, accent-stripped, with both singular and plural forms covered.
// Compound forms (c.s. / càs / c. à s.) are normalized via a punctuation-
// and-whitespace strip before lookup. The lookup is case-insensitive and
// accent-insensitive — `g`, `G`, `gr`, `gramme`, `grammes` all collapse to
// the canonical wire-format value stored on `recipes.ingredients[].unit`.
//
// When the second token of an ingredient line matches the whitelist, it is
// the `unit`; everything after is the `name`. When it does NOT match,
// the qty stays parsed and the second-token-plus-rest becomes the `name`.
//
// Out of scope (v2): localized rendering — the wire value is whatever the
// user typed (preserving casing/accents), passed through verbatim to the
// detail page. The Gemini extraction path (services/llm.py) returns
// structured `{name, quantity, unit}` directly; the whitelist only governs
// the manual full-form parse (D-16-11).
const FRENCH_UNIT_WHITELIST = new Set([
  // Mass
  "g", "gr", "gramme", "grammes", "kg", "kilo", "kilos", "mg",
  // Volume
  "ml", "cl", "dl", "l", "litre", "litres",
  // US units (occasional French-bilingual recipes)
  "oz", "lb",
  // Spoons / cups — compound forms normalized below before lookup
  "c", "cs", "cc", "c.s.", "c.c.", "cas", "cac",
  "tasse", "tasses",
  // Counts
  "pcs", "piece", "pieces", "gousse", "gousses",
  "pincee", "pincees",
  "branche", "branches", "brin", "brins",
]);

// Normalize a token for whitelist lookup: lowercase, strip accents, collapse
// internal whitespace. Keeps the user's original token for the wire value.
function _normalizeUnitToken(token: string): string {
  return token
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents
    .replace(/\s+/g, ""); // "c. s." → "c.s." → matches "c.s." in whitelist
}

export type RecipeFormValues = {
  title: string;
  ingredients_text: string; // one per line — server expects array; we split on save
  steps_text: string; // one per line
  prep_time_minutes: string;
  // Phase 24 RID-02 new fields
  cook_time_minutes: string;
  difficulty: string; // "" means none (NONE_VALUE sentinel at select)
  description: string;
  servings: string;
  cuisine: string; // "" means none
  mood: string[];
  main_protein: string; // "" means none
  seasonality: string[];
  tags_text: string;
  photo_paths: string[];
};

// RID-03 — ref map for scroll/focus on ?focus= param (D-22, D-23).
// The edit page constructs this map and passes it down so RecipeForm
// stays ignorant of the routing layer. focusRefs is optional so the
// new-recipe full tab can render RecipeForm without any focus wiring.
//
// Each field is typed with the actual DOM element it attaches to —
// `RefObject<T>` is invariant in T under React 19's mutable `current`,
// so a generic `RefObject<HTMLElement>` cannot accept the per-element
// refs the edit page produces via `useRef<HTMLInputElement>(null)`.
export type RecipeFormRefs = {
  title?: RefObject<HTMLInputElement | null>;
  description?: RefObject<HTMLTextAreaElement | null>;
  ingredients?: RefObject<HTMLTextAreaElement | null>;
  steps?: RefObject<HTMLTextAreaElement | null>;
  prep_time_minutes?: RefObject<HTMLInputElement | null>;
  cook_time_minutes?: RefObject<HTMLInputElement | null>;
  servings?: RefObject<HTMLInputElement | null>;
  difficulty?: RefObject<HTMLButtonElement | null>;
  cuisine?: RefObject<HTMLButtonElement | null>;
  mood?: RefObject<HTMLDivElement | null>;
  main_protein?: RefObject<HTMLButtonElement | null>;
};


export type RecipeBody = {
  title: string;
  ingredients?: { name: string; quantity?: number | null; unit?: string | null }[];
  // Phase 42 STEP-02 — backend RecipeUpdate.steps is now `list[StepEntry] | None`.
  // Manual-edit path emits `{ text, ingredient_refs: [] }` (refs lost in the
  // flat textarea round-trip; Gemini re-extract restores them).
  steps?: { text: string; ingredient_refs: string[] }[];
  prep_time_minutes?: number;
  // Phase 24 RID-02 new fields
  cook_time_minutes?: number;
  difficulty?: string;
  description?: string;
  servings?: number;
  cuisine?: string;
  mood: string[];
  main_protein?: string;
  seasonality: string[];
  tags: string[];
};

export function recipeToFormValues(r: Recipe): RecipeFormValues {
  return {
    title: r.title,
    ingredients_text: (r.ingredients ?? [])
      .map((i) =>
        [
          i.quantity != null ? String(i.quantity) : null,
          i.unit ?? null,
          i.name,
        ]
          .filter(Boolean)
          .join(" "),
      )
      .join("\n"),
    // Phase 42 STEP-02 — steps are now StepEntry objects; flatten to text-only
    // lines for the textarea. Round-trip drops ingredient_refs (textarea-edited
    // steps lose ref metadata); a follow-up Gemini re-extract restores them.
    steps_text: (r.steps ?? []).map((s) => s.text).join("\n"),
    prep_time_minutes: r.prep_time_minutes?.toString() ?? "",
    cook_time_minutes: r.cook_time_minutes?.toString() ?? "",
    difficulty: r.difficulty ?? "",
    description: r.description ?? "",
    servings: r.servings?.toString() ?? "",
    cuisine: r.cuisine ?? "",
    mood: r.mood ?? [],
    main_protein: r.main_protein ?? "",
    seasonality:
      r.seasonality && r.seasonality.length > 0
        ? r.seasonality
        : ["spring", "summer", "autumn", "winter"],
    tags_text: (r.tags ?? []).join("\n"),
    photo_paths: r.photo_paths,
  };
}

export function formValuesToBody(v: RecipeFormValues): RecipeBody {
  const ingredients = v.ingredients_text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      // CAP-03 — leading-qty + whitelisted-unit parser. Falls back to
      // {name: line} when no leading qty. The second token is treated as
      // a unit ONLY if its accent-stripped lowercase form is in the
      // FRENCH_UNIT_WHITELIST; otherwise it is the start of the name.
      // See .planning/phases/16-capture-pipeline-correctness/16-CONTEXT.md
      // §D-16-09 for the worked examples.
      const qtyMatch = line.match(/^(\d+(?:[.,]\d+)?)\s+(.*)$/);
      if (!qtyMatch) return { name: line };
      const qtyRaw = qtyMatch[1].replace(",", ".");
      const qty = parseFloat(qtyRaw);
      const rest = qtyMatch[2].trim();
      if (!rest) {
        // "500" with nothing after → treat as name-less qty; keep current
        // fallback behavior (the original parser also fell through here).
        return { name: line };
      }
      // Split rest into [first_token, remainder]. Use a single-space split
      // to keep the user's original casing/accents on the kept tokens.
      const spaceIdx = rest.indexOf(" ");
      const firstToken = spaceIdx === -1 ? rest : rest.slice(0, spaceIdx);
      const remainder =
        spaceIdx === -1 ? "" : rest.slice(spaceIdx + 1).trim();

      const normalized = _normalizeUnitToken(firstToken);
      if (FRENCH_UNIT_WHITELIST.has(normalized)) {
        // The second token is a unit. Everything after is the name.
        // If there's nothing after the unit (e.g. "500 g"), preserve the
        // line as the name to avoid an empty-name row.
        return {
          name: remainder || line,
          quantity: isNaN(qty) ? null : qty,
          unit: firstToken, // preserve the user's original casing
        };
      }
      // The second token is NOT a unit. Treat first_token + remainder as
      // the full name and keep the parsed qty (unit stays null).
      return {
        name: rest,
        quantity: isNaN(qty) ? null : qty,
        unit: null,
      };
    });
  // Phase 42 STEP-02 — emit StepEntry-shaped objects. The manual-edit textarea
  // can't capture ingredient_refs; we send empty arrays so a follow-up Gemini
  // re-extract can repopulate them.
  const steps = v.steps_text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((text) => ({ text, ingredient_refs: [] as string[] }));
  const tags = v.tags_text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    title: v.title.trim(),
    ingredients: ingredients.length > 0 ? ingredients : undefined,
    steps: steps.length > 0 ? steps : undefined,
    prep_time_minutes: v.prep_time_minutes
      ? parseInt(v.prep_time_minutes, 10)
      : undefined,
    cook_time_minutes: v.cook_time_minutes
      ? parseInt(v.cook_time_minutes, 10)
      : undefined,
    difficulty: v.difficulty || undefined,
    description: v.description.trim() || undefined,
    servings: v.servings ? parseInt(v.servings, 10) : undefined,
    cuisine: v.cuisine || undefined,
    mood: v.mood,
    main_protein: v.main_protein || undefined,
    seasonality:
      v.seasonality.length > 0
        ? v.seasonality
        : ["spring", "summer", "autumn", "winter"],
    tags,
  };
}

type Props = {
  initial?: RecipeFormValues;
  recipeId: string | null; // null in /new full tab; set in /edit
  onSubmit: (body: RecipeBody, photoPaths: string[]) => Promise<void>;
  submitLabel: string;
  backHref: string;
  title: string;
  /** When true, render with own header + sticky CTA. /recipes/new full tab
   *  passes false because the page already owns the chrome. */
  withChrome?: boolean;
  /** RID-03 — ref map keyed by FieldKey for scroll/focus via ?focus= param.
   *  Only needed on the edit page; new-recipe form omits it (D-23). */
  focusRefs?: RecipeFormRefs;
  /**
   * Phase 28 DETAIL-04 — pin set, drives per-input « épinglé » Geist Mono
   * pin label next to AnswerField labels (post-ADR-0004; the handwriting
   * variant is dropped). The edit form NEVER shows « conflit » (turn data
   * not fetched here); conflit is detail-page-only per UI-SPEC §Layout §2.
   */
  manuallyEditedFields?: string[];
};

export function RecipeForm({
  initial,
  recipeId,
  onSubmit,
  submitLabel,
  backHref,
  title,
  withChrome = true,
  focusRefs,
  manuallyEditedFields,
}: Props) {
  const t = useTranslations("recipes.new");
  const tCommon = useTranslations("common");
  const labels = useEnumLabels();
  const pinSet = manuallyEditedFields ?? [];

  // Phase 28 DETAIL-04 — render inline « épinglé » Geist Mono pin label next
  // to an AnswerField's form label when that field is pinned (per ADR-0004;
  // the prior handwriting variant is dropped). The edit form NEVER shows
  // « conflit » (turn data is not fetched here); hasConflict is hardcoded
  // false per UI-SPEC §Layout §2.
  const renderInlinePin = (field: AnswerField) =>
    pinSet.includes(field) ? (
      <PinLabel field={field} hasConflict={false} gutter={false} />
    ) : null;

  const [v, setV] = useState<RecipeFormValues>(
    initial ?? {
      title: "",
      ingredients_text: "",
      steps_text: "",
      prep_time_minutes: "",
      cook_time_minutes: "",
      difficulty: "",
      description: "",
      servings: "",
      cuisine: "",
      mood: [],
      main_protein: "",
      seasonality: ["spring", "summer", "autumn", "winter"],
      tags_text: "",
      photo_paths: [],
    },
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onSubmit(formValuesToBody(v), v.photo_paths);
    } finally {
      setSubmitting(false);
    }
  }

  const fields = (
    <div className="flex flex-col gap-(--spacing-section-y) px-(--spacing-page-x) pt-6 pb-32">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <Label htmlFor="rf-title">{t("title_label")}</Label>
          {renderInlinePin("title")}
        </div>
        <Input
          id="rf-title"
          ref={focusRefs?.title}
          value={v.title}
          onChange={(e) => setV({ ...v, title: e.target.value })}
          placeholder={t("title_placeholder")}
          required
          maxLength={200}
        />
      </div>
      {/* RID-02 — Description textarea (D-14). Renders above ingredients so the
          CompletenessCard ?focus=description chip scrolls to it naturally. */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <Label htmlFor="rf-description">{t("description_label")}</Label>
          {renderInlinePin("description")}
        </div>
        <Textarea
          id="rf-description"
          ref={focusRefs?.description}
          rows={3}
          value={v.description}
          onChange={(e) => setV({ ...v, description: e.target.value })}
          placeholder={t("description_placeholder")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <Label htmlFor="rf-ingredients">{t("ingredients_label")}</Label>
          {renderInlinePin("ingredients")}
        </div>
        <Textarea
          id="rf-ingredients"
          ref={focusRefs?.ingredients}
          rows={6}
          value={v.ingredients_text}
          onChange={(e) => setV({ ...v, ingredients_text: e.target.value })}
          placeholder={t("ingredients_placeholder")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <Label htmlFor="rf-steps">{t("steps_label")}</Label>
          {renderInlinePin("steps")}
        </div>
        <Textarea
          id="rf-steps"
          ref={focusRefs?.steps}
          rows={6}
          value={v.steps_text}
          onChange={(e) => setV({ ...v, steps_text: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1">
            <Label htmlFor="rf-prep">{t("prep_time_label")}</Label>
            {renderInlinePin("prep_time_minutes")}
          </div>
          <Input
            id="rf-prep"
            ref={focusRefs?.prep_time_minutes}
            type="number"
            inputMode="numeric"
            min={0}
            max={1440}
            value={v.prep_time_minutes}
            onChange={(e) =>
              setV({ ...v, prep_time_minutes: e.target.value })
            }
          />
        </div>
        {/* RID-02 — Cook time input (D-14) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1">
            <Label htmlFor="rf-cook">{t("cook_time_minutes_label")}</Label>
            {renderInlinePin("cook_time_minutes")}
          </div>
          <Input
            id="rf-cook"
            ref={focusRefs?.cook_time_minutes}
            type="number"
            inputMode="numeric"
            min={0}
            max={1440}
            value={v.cook_time_minutes}
            onChange={(e) =>
              setV({ ...v, cook_time_minutes: e.target.value })
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* RID-02 — Difficulty select (D-14) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1">
            <Label>{t("difficulty_label")}</Label>
            {renderInlinePin("difficulty")}
          </div>
          <Select
            value={v.difficulty === "" ? NONE_VALUE : v.difficulty}
            onValueChange={(val) =>
              setV({ ...v, difficulty: val === NONE_VALUE ? "" : val })
            }
          >
            <SelectTrigger
              className="w-full"
              ref={focusRefs?.difficulty}
            >
              <SelectValue placeholder={t("difficulty_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>{t("difficulty_placeholder")}</SelectItem>
              {Object.values(Difficulty).map((d) => (
                <SelectItem key={d} value={d}>
                  {labels.difficulty(d)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1">
            <Label htmlFor="rf-servings">{t("servings_label")}</Label>
            {renderInlinePin("servings")}
          </div>
          <Input
            id="rf-servings"
            ref={focusRefs?.servings}
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            value={v.servings}
            onChange={(e) => setV({ ...v, servings: e.target.value })}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <Label>{t("cuisine_label")}</Label>
          {renderInlinePin("cuisine")}
        </div>
        <Select
          value={v.cuisine === "" ? NONE_VALUE : v.cuisine}
          onValueChange={(val) =>
            setV({ ...v, cuisine: val === NONE_VALUE ? "" : val })
          }
        >
          <SelectTrigger
            className="w-full"
            ref={focusRefs?.cuisine}
          >
            <SelectValue placeholder={t("cuisine_none")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>{t("cuisine_none")}</SelectItem>
            {Object.values(Cuisine).map((c) => (
              <SelectItem key={c} value={c}>
                {labels.cuisine(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <Label>{t("mood_label")}</Label>
          {renderInlinePin("mood")}
        </div>
        <div
          className="flex flex-wrap gap-2"
          ref={focusRefs?.mood}
          tabIndex={focusRefs?.mood ? -1 : undefined}
        >
          {Object.values(Mood).map((m) => {
            const on = v.mood.includes(m);
            return (
              <Button
                key={m}
                type="button"
                variant={on ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setV({
                    ...v,
                    mood: on
                      ? v.mood.filter((x) => x !== m)
                      : [...v.mood, m],
                  })
                }
              >
                {labels.mood(m)}
              </Button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <Label>{t("protein_label")}</Label>
          {renderInlinePin("main_protein")}
        </div>
        <Select
          value={v.main_protein === "" ? NONE_VALUE : v.main_protein}
          onValueChange={(val) =>
            setV({ ...v, main_protein: val === NONE_VALUE ? "" : val })
          }
        >
          <SelectTrigger
            className="w-full"
            ref={focusRefs?.main_protein}
          >
            <SelectValue placeholder={t("cuisine_none")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>{t("cuisine_none")}</SelectItem>
            {Object.values(Protein).map((p) => (
              <SelectItem key={p} value={p}>
                {labels.protein(p)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("seasonality_label")}</Label>
        <div className="flex flex-wrap gap-2">
          {Object.values(Season).map((s) => {
            const on = v.seasonality.includes(s);
            return (
              <Button
                key={s}
                type="button"
                variant={on ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setV({
                    ...v,
                    seasonality: on
                      ? v.seasonality.filter((x) => x !== s)
                      : [...v.seasonality, s],
                  })
                }
              >
                {labels.season(s)}
              </Button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rf-tags">{t("tags_label")}</Label>
        <Textarea
          id="rf-tags"
          rows={3}
          value={v.tags_text}
          onChange={(e) => setV({ ...v, tags_text: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("photo_section_label")}</Label>
        <PhotoUploader
          recipeId={recipeId}
          paths={v.photo_paths}
          onChange={(p) => setV({ ...v, photo_paths: p })}
        />
      </div>
    </div>
  );

  const submitBar = (
    <div className="fixed bottom-16 inset-x-0 px-(--spacing-page-x) pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 bg-background/80 backdrop-blur-sm border-t border-border z-30">
      <Button
        className="h-12 w-full"
        disabled={!v.title.trim() || submitting}
        onClick={handleSubmit}
      >
        {submitting ? (
          <>
            <BrandLoader size="sm" className="mr-2" />
            {tCommon("saving")}
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </div>
  );

  if (!withChrome) {
    return (
      <>
        {fields}
        {submitBar}
      </>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 h-12 px-(--spacing-page-x) flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border">
        <Button
          size="icon"
          variant="ghost"
          aria-label={tCommon("back")}
          asChild
        >
          <Link href={backHref}>
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <span className="text-page-header">{title}</span>
        <span className="w-10" aria-hidden />
      </header>
      {fields}
      {submitBar}
    </>
  );
}
