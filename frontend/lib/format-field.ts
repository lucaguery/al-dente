// Phase 35 ENUM-01 (B-03 two-layer fix) — per-field chip display formatter.
//
// Pure function, no React hooks, called from SystemBubble's summary branch.
// Backend emits structured `{field, value}` ChipPayload items (Plan 35-01);
// this turns it into human-readable French display via the existing
// useEnumLabels infrastructure.
//
// Locked-vocabulary discipline (CLAUDE.md): never invent a parallel
// translation surface — always consume useEnumLabels. Unit suffixes
// (`min`, `personnes`) stay as inline French literals; they don't need
// translation at couple-scale, and a `units.*` namespace would be overkill
// (Phase 35 CONTEXT specifics §3).

import type { AnswerField } from "./enums";

// Structural type matching ReturnType<typeof useEnumLabels> — keeping this
// file React-free so it's trivially testable in isolation.
type EnumLabels = {
  cuisine: (v: string) => string;
  mood: (v: string) => string;
  protein: (v: string) => string;
  season: (v: string) => string;
  difficulty: (v: string) => string;
  field: (key: AnswerField) => string;
};

// Narrow type guard for ingredient items. The backend emits ingredients as
// `list[GeminiIngredient]` (a Pydantic model dumping to `{name, quantity?, unit?}`).
// Defensive shape check — guards against plain-string fallbacks.
const isIngredientObject = (
  v: unknown,
): v is { name?: string; quantity?: number | string; unit?: string } =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Format a single `ChipPayload(field, value)` for display in the SystemBubble
 * summary branch.
 *
 * Returns `{label, display}`:
 * - `label`: French field name from `labels.field(field as AnswerField)`,
 *   with fallback to raw `field` for unknown keys.
 * - `display`: per-field-type French formatting (enum → label,
 *   time → "X min", ingredients → "300 g riz arborio, ...", etc.).
 *
 * Special case `field === "_legacy"`: short-circuits to `{label: "", display: value}`
 * so legacy `list[str]` chips (Plan 35-01 read-side validator coerces them)
 * render verbatim without a `"_legacy : ..."` artifact.
 *
 * Pure: no hooks, no side effects, deterministic.
 */
export function formatFieldChip(
  field: string,
  value: unknown,
  labels: EnumLabels,
): { label: string; display: string } {
  // Legacy bridge — pre-Phase-35 list[str] chips coerce to field=_legacy on
  // the backend; render their pre-baked string verbatim with no label.
  if (field === "_legacy") {
    return { label: "", display: String(value) };
  }

  const label = labels.field(field as AnswerField);

  switch (field) {
    case "cuisine":
      return { label, display: labels.cuisine(String(value)) };

    case "mood":
      // mood is multi-valued post Phase 28 D-12 (list of strings), but we
      // defensively handle scalar shape too.
      if (Array.isArray(value)) {
        return {
          label,
          display: value.map((v) => labels.mood(String(v))).join(", "),
        };
      }
      return { label, display: labels.mood(String(value)) };

    case "main_protein":
      // `none` is already mapped to "Sans protéine" via fr.json enums.protein.none.
      return { label, display: labels.protein(String(value)) };

    case "difficulty":
      return { label, display: labels.difficulty(String(value)) };

    case "seasonality":
      if (Array.isArray(value)) {
        return {
          label,
          display: value.map((v) => labels.season(String(v))).join(", "),
        };
      }
      return { label, display: labels.season(String(value)) };

    case "prep_time_minutes":
    case "cook_time_minutes":
      return { label, display: `${String(value)} min` };

    case "servings":
      return { label, display: `${String(value)} personnes` };

    case "ingredients":
      if (Array.isArray(value)) {
        const parts = value.map((item) => {
          if (isIngredientObject(item)) {
            const quantity = item.quantity ?? "";
            const unit = item.unit ?? "";
            const name = item.name ?? "";
            return `${quantity} ${unit} ${name}`.replace(/\s+/g, " ").trim();
          }
          return String(item);
        });
        return { label, display: parts.join(", ") };
      }
      return { label, display: String(value) };

    case "steps":
      // Length-only summary — full step text would overflow the chip strip
      // (CONTEXT D-01: steps stay as a length summary).
      if (Array.isArray(value)) {
        return { label, display: `${value.length} étapes` };
      }
      return { label, display: String(value) };

    case "tags":
      if (Array.isArray(value)) {
        return { label, display: value.map((v) => String(v)).join(", ") };
      }
      return { label, display: String(value) };

    case "title":
    case "description":
      return { label, display: String(value) };

    default:
      // Forward-compat: unknown field name. Don't crash; surface as
      // `String(value)` so a missed formatter case is visible but harmless.
      return { label, display: String(value) };
  }
}
