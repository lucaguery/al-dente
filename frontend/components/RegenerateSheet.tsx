"use client";

// Phase 3 — regenerate filter sheet (SHORTLIST-02 + D-12).
// 03-UI-SPEC.md §Surface 9.

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cuisine, Mood, Protein } from "@/lib/enums";
import type { ShortlistFilters } from "@/lib/shortlist";

export type RegenerateSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (filters: ShortlistFilters) => void;
  submitting?: boolean;
};

const CUISINE_KEYS = Object.values(Cuisine);
const PROTEIN_KEYS = Object.values(Protein);
const MOOD_KEYS = Object.values(Mood);

// Radix Select forbids empty-string values for SelectItem (treats them as the
// placeholder slot). Use sentinel values for the "any" / "none" options and
// translate at the boundary when emitting the typed `ShortlistFilters` payload.
const ANY_CUISINE = "__any__";
const NO_PROTEIN_EXCLUDE = "__none__";

export function RegenerateSheet({
  open,
  onOpenChange,
  onApply,
  submitting,
}: RegenerateSheetProps) {
  const t = useTranslations("home.filters");
  const tEnum = useTranslations("enums");

  const [cuisine, setCuisine] = useState<string>(ANY_CUISINE);
  const [maxPrep, setMaxPrep] = useState<string>("");
  const [excludeProtein, setExcludeProtein] = useState<string>(
    NO_PROTEIN_EXCLUDE,
  );
  const [moods, setMoods] = useState<string[]>([]);

  function reset() {
    setCuisine(ANY_CUISINE);
    setMaxPrep("");
    setExcludeProtein(NO_PROTEIN_EXCLUDE);
    setMoods([]);
  }

  function toggleMood(mood: string) {
    setMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood],
    );
  }

  function handleApply() {
    const parsedPrep = maxPrep ? Number.parseInt(maxPrep, 10) : undefined;
    const filters: ShortlistFilters = {};
    if (cuisine && cuisine !== ANY_CUISINE) filters.cuisine = cuisine;
    if (parsedPrep && Number.isFinite(parsedPrep)) {
      filters.max_prep_time = parsedPrep;
    }
    if (excludeProtein && excludeProtein !== NO_PROTEIN_EXCLUDE) {
      filters.exclude_protein = excludeProtein;
    }
    if (moods.length) filters.required_moods = moods;
    onApply(filters);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[80svh] overflow-y-auto"
      >
        <div className="flex flex-col gap-6 px-6 pt-6 pb-8">
          <SheetTitle className="text-xl font-semibold">
            {t("title")}
          </SheetTitle>
          <SheetDescription className="text-sm text-foreground-muted">
            {t("intro")}
          </SheetDescription>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="filter-cuisine">{t("cuisine_label")}</Label>
              <Select value={cuisine} onValueChange={setCuisine}>
                <SelectTrigger id="filter-cuisine">
                  <SelectValue placeholder={t("cuisine_any")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_CUISINE}>
                    {t("cuisine_any")}
                  </SelectItem>
                  {CUISINE_KEYS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {tEnum(`cuisine.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="filter-max-prep">
                {t("max_prep_time_label")}
              </Label>
              <Input
                id="filter-max-prep"
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                value={maxPrep}
                onChange={(e) => setMaxPrep(e.target.value)}
                placeholder={t("max_prep_time_placeholder")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="filter-exclude-protein">
                {t("exclude_protein_label")}
              </Label>
              <Select
                value={excludeProtein}
                onValueChange={setExcludeProtein}
              >
                <SelectTrigger id="filter-exclude-protein">
                  <SelectValue placeholder={t("exclude_protein_none")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROTEIN_EXCLUDE}>
                    {t("exclude_protein_none")}
                  </SelectItem>
                  {PROTEIN_KEYS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {tEnum(`protein.${p}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium leading-5">
                {t("required_moods_label")}
              </span>
              <div className="flex flex-wrap gap-2">
                {MOOD_KEYS.map((m) => {
                  const active = moods.includes(m);
                  return (
                    <Button
                      key={m}
                      type="button"
                      variant={active ? "default" : "outline"}
                      size="sm"
                      aria-pressed={active}
                      onClick={() => toggleMood(m)}
                      className="h-8 px-3 rounded-full"
                    >
                      {tEnum(`mood.${m}`)}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              type="button"
              variant="default"
              className="h-11"
              disabled={submitting}
              onClick={handleApply}
            >
              {t("apply")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11"
              onClick={reset}
              disabled={submitting}
            >
              {t("reset")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
