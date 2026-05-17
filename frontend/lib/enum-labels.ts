"use client";

// Translates wire-format enum values (frontend/lib/enums.ts) to French labels
// from the `enums.*` namespace in fr.json. Try/catch is for forward
// compatibility — if a future enum value lands in the wire format before
// fr.json is updated, we fall back to the raw value rather than crashing.

import { useTranslations } from "next-intl";
import type { AnswerField } from "@/lib/enums";

// Phase 28 DETAIL-02 / DETAIL-03 / DETAIL-04 — French labels for the 13
// AnswerField keys, used in:
//   - advisory_resolved ICU substitution: "{field} : {from} → {to} ({status})"
//   - conflict_aria substitution: "Conflit sur le champ {field} — Voir l'avis"
//   - any other contextual display of a field name to the user.
// Static inline map per UI-SPEC §AnswerField Label Map (no i18n namespace
// needed for a 13-key static map; 28-RESEARCH §5 Option A).
const ANSWER_FIELD_LABELS: Record<AnswerField, string> = {
  title: "titre",
  description: "description",
  ingredients: "ingrédients",
  steps: "étapes",
  prep_time_minutes: "temps de préparation",
  cook_time_minutes: "temps de cuisson",
  difficulty: "difficulté",
  servings: "nombre de personnes",
  cuisine: "cuisine",
  mood: "ambiance",
  main_protein: "protéine principale",
  seasonality: "saisons",
  tags: "tags",
};

export function useEnumLabels() {
  const tCuisine = useTranslations("enums.cuisine");
  const tMood = useTranslations("enums.mood");
  const tProtein = useTranslations("enums.protein");
  const tSeason = useTranslations("enums.season");
  // Phase 24 RID-02 — Difficulty labels (fr.json enums.difficulty namespace)
  const tDifficulty = useTranslations("enums.difficulty");
  return {
    cuisine: (v: string) => {
      try {
        return tCuisine(v as never);
      } catch {
        return v;
      }
    },
    mood: (v: string) => {
      try {
        return tMood(v as never);
      } catch {
        return v;
      }
    },
    protein: (v: string) => {
      try {
        return tProtein(v as never);
      } catch {
        return v;
      }
    },
    season: (v: string) => {
      try {
        return tSeason(v as never);
      } catch {
        return v;
      }
    },
    difficulty: (v: string) => {
      try {
        return tDifficulty(v as never);
      } catch {
        return v;
      }
    },
    field: (key: AnswerField): string => ANSWER_FIELD_LABELS[key] ?? key,
  };
}
