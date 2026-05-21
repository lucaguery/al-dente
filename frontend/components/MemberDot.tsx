import { getMemberColorVars } from "@/lib/colors";

// 12px solid circle in a member's color. Per UI-SPEC §"Member colors":
// the member dot is the canonical primitive that all other member-color
// usages compose. Phase 20 TOK-02 (D-20-05): we no longer paint with the
// raw `colorHex`; instead the hex is resolved to the `--color-member-*`
// token pair via `getMemberColorVars`, so light/dark variants swap with
// the rest of the design system. Storage of `Member.color_hex` is
// unchanged (D-20-06) — only the render path moved.
//
// ADR-0004 §Member colors + PUNCH-LIST D-03/D-04 (quick 260521-l8g):
// the "accueil-collapse" variant overrides the 5-slot palette with the
// 2-identity ink+muted pair on Accueil surfaces only (ledger row avatars,
// pre-vote deck identity dot). Surface order:
//   - position="first"   → background var(--foreground), color var(--background)
//   - position="second"  → background var(--muted-foreground), color var(--background)
// The "slot" default preserves the 5-slot palette for Settings + cooking-logs.
export type MemberDotVariant = "slot" | "accueil-collapse";

export function MemberDot({
  colorHex,
  size = 12,
  variant = "slot",
  position,
}: {
  colorHex: string;
  size?: number;
  variant?: MemberDotVariant;
  /** Required when variant="accueil-collapse" — selects ink (first) vs muted (second). */
  position?: "first" | "second";
}) {
  if (variant === "accueil-collapse") {
    const bg = position === "second" ? "var(--muted-foreground)" : "var(--foreground)";
    return (
      <span
        aria-hidden
        className="rounded-full inline-block flex-shrink-0"
        style={{ background: bg, color: "var(--background)", width: size, height: size }}
      />
    );
  }
  const { bgVar, fgVar } = getMemberColorVars(colorHex);
  return (
    <span
      aria-hidden
      className="rounded-full inline-block flex-shrink-0"
      style={{ background: bgVar, color: fgVar, width: size, height: size }}
    />
  );
}
