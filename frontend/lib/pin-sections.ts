// Phase 28 DETAIL-04 — section-to-AnswerField coverage map for the
// detail-page gutter marginalia (UI-SPEC §Layout §1).
//
// Each entry maps a detail-page section name to the AnswerField keys
// whose pinned state should render the gutter « épinglé » label on
// that section header. Multiple pins in the same section render a
// single « épinglé » (one marginalia per section).
//
// Sections NOT currently rendered on /recipes/[id]/page.tsx
// (seasonality, tags) are present in the map for forward-compat;
// call sites should skip rendering when the section element doesn't
// exist (D-05 — data still tracks server-side; surface when render
// site exists).

import type { AnswerField } from "@/lib/enums";

export const PIN_SECTIONS = {
  title: ["title"] as AnswerField[],
  description: ["description"] as AnswerField[],
  metadata: ["cuisine", "mood", "main_protein"] as AnswerField[],
  prep_servings: [
    "prep_time_minutes",
    "cook_time_minutes",
    "servings",
    "difficulty",
  ] as AnswerField[],
  ingredients: ["ingredients"] as AnswerField[],
  steps: ["steps"] as AnswerField[],
  seasonality: ["seasonality"] as AnswerField[],
  tags: ["tags"] as AnswerField[],
} as const;

export type PinSection = keyof typeof PIN_SECTIONS;

/**
 * Return true if any AnswerField in the given section is currently
 * pinned according to `manuallyEditedFields`.
 */
export function isSectionPinned(
  section: PinSection,
  manuallyEditedFields: string[]
): boolean {
  const fields = PIN_SECTIONS[section];
  return fields.some((f) => manuallyEditedFields.includes(f));
}

/**
 * Return the first AnswerField in `section` that is pinned, or null.
 * Used for aria-label substitution on the « conflit » button.
 */
export function firstPinnedFieldInSection(
  section: PinSection,
  manuallyEditedFields: string[]
): AnswerField | null {
  const fields = PIN_SECTIONS[section];
  return fields.find((f) => manuallyEditedFields.includes(f)) ?? null;
}
