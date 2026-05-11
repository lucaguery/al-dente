import { getMemberColorVars } from "@/lib/colors";

// 12px solid circle in a member's color. Per UI-SPEC §"Member colors":
// the member dot is the canonical primitive that all other member-color
// usages compose. Phase 20 TOK-02 (D-20-05): we no longer paint with the
// raw `colorHex`; instead the hex is resolved to the `--color-member-*`
// token pair via `getMemberColorVars`, so light/dark variants swap with
// the rest of the design system. Storage of `Member.color_hex` is
// unchanged (D-20-06) — only the render path moved.
export function MemberDot({
  colorHex,
  size = 12,
}: {
  colorHex: string;
  size?: number;
}) {
  const { bgVar, fgVar } = getMemberColorVars(colorHex);
  return (
    <span
      aria-hidden
      className="rounded-full inline-block flex-shrink-0"
      style={{ background: bgVar, color: fgVar, width: size, height: size }}
    />
  );
}
