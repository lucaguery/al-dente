// RID-05 — Per-recipe illustration component.
//
// Renders the server-side-sanitized SVG via dangerouslySetInnerHTML when
// recipe.illustration_svg is non-empty; falls back to BrandIcon (RID-01)
// otherwise. Used by inbox list rows (RecipeDraftCard) and recipes library
// list rows (RecipeCard) at ~40x40 leading-slot size.
//
// SECURITY TRUST BOUNDARY (D-38):
//
// dangerouslySetInnerHTML is acceptable here BECAUSE the SVG string passed
// server-side allowlist sanitization via backend/app/services/svg_sanitizer.py.
// The sanitizer enforces:
//   - strict tag allowlist ({svg, path} only)
//   - strict attribute allowlist on each tag
//   - rejection of all event handlers (on*=), style=, href / xlink:href
//   - rejection of CDATA, XML comments, processing instructions, XXE entities
//   - 4 KB size cap
// Any disallowed input returns None at the server, which lands here as
// null/empty illustration_svg → BrandIcon fallback. By construction, only
// sanitized markup reaches this dangerouslySetInnerHTML call.
//
// If the sanitizer is ever weakened, this component becomes an XSS surface.
// DO NOT modify this component to bypass the recipe.illustration_svg check
// or to render unsanitized user input.

import { BrandIcon } from "@/components/BrandIcon";
import type { Recipe } from "@/lib/recipes";

export function RecipeIllustration({
  recipe,
  size = 40,
  className,
}: {
  recipe: Pick<Recipe, "illustration_svg">;
  size?: number;
  className?: string;
}) {
  const svg = recipe.illustration_svg;

  if (svg && svg.trim() !== "") {
    // Sanitized server-side — see D-38 comment above. The wrapping div sets
    // the rendered size; the inner SVG inherits currentColor from text-foreground.
    return (
      <div
        aria-hidden
        style={{ width: size, height: size }}
        className={className}
        // eslint-disable-next-line react/no-danger -- SVG is server-sanitized per D-38
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  // Fallback: brand mark (RID-01). Same size, currentColor stroke — visually
  // coherent with the per-recipe path.
  return <BrandIcon size={size} className={className} />;
}
