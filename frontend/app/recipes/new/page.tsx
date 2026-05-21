"use client";

// Phase 41 PICK-01 — /recipes/new is now the 5-option picker.
//
// Lineage:
//   - D-01 stateless — every tap creates a fresh draft, no Resume affordance
//   - D-02 Note rapide bypass via in-page modal (no thread mount)
//   - D-09 + D-11 in-thread unification preserved — see /recipes/new/[surface]
//   - Sketch §Ajouter lines 1714-1755
//
// The prior <RecipeThread mode="capture" /> mount that used to live here
// moved to /recipes/new/[surface] (Plan 41-03 Task 2B). MVP no-shim posture:
// the picker IS /recipes/new post-Phase-41; no conditional fallback, no
// feature flag.

import { OnboardingGuard } from "@/lib/onboarding-guard";
import { NouvellePicker } from "@/components/RecipeNew/NouvellePicker";

export default function NouvelleRecettePage() {
  return (
    <OnboardingGuard>
      <NouvellePicker />
    </OnboardingGuard>
  );
}
