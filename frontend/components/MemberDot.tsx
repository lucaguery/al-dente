// 12px solid circle in a member's color. Per UI-SPEC §"Member colors":
// the member dot is the canonical primitive that all other member-color
// usages compose. Inline style is intentional — colors are dynamic and
// resolved from `members.color_hex` per SPEC.md schema.
export function MemberDot({
  colorHex,
  size = 12,
}: {
  colorHex: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className="rounded-full inline-block flex-shrink-0"
      style={{ background: colorHex, width: size, height: size }}
    />
  );
}
