"use client";

// Translates wire-format enum values (frontend/lib/enums.ts) to French labels
// from the `enums.*` namespace in fr.json. Try/catch is for forward
// compatibility — if a future enum value lands in the wire format before
// fr.json is updated, we fall back to the raw value rather than crashing.

import { useTranslations } from "next-intl";

export function useEnumLabels() {
  const tCuisine = useTranslations("enums.cuisine");
  const tMood = useTranslations("enums.mood");
  const tProtein = useTranslations("enums.protein");
  const tSeason = useTranslations("enums.season");
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
    // Phase 24 RID-02 — Difficulty enum label translator. Returns French
    // label for easy/medium/hard; returns the raw value (or empty) for nulls
    // or unknown values (defensive — DB CHECK constraint should already gate
    // this).
    difficulty: (v: string | null | undefined): string => {
      if (!v) return "";
      try {
        return tDifficulty(v as never);
      } catch {
        return v;
      }
    },
  };
}
