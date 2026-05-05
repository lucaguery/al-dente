// Mirror of backend/app/colors.py — drift is a category of bug per CLAUDE.md.
// Per D-04 (CONTEXT.md), Tailwind v4 default 500-shade hex values.
export const MEMBER_COLORS = [
  { slot: 1, name: "rose", hex: "#F43F5E", tw: "rose-500" },
  { slot: 2, name: "amber", hex: "#F59E0B", tw: "amber-500" },
  { slot: 3, name: "emerald", hex: "#10B981", tw: "emerald-500" },
  { slot: 4, name: "sky", hex: "#0EA5E9", tw: "sky-500" },
  { slot: 5, name: "violet", hex: "#8B5CF6", tw: "violet-500" },
] as const;

export type MemberColorHex = (typeof MEMBER_COLORS)[number]["hex"];

export const isValidMemberColor = (hex: string): hex is MemberColorHex =>
  MEMBER_COLORS.some((c) => c.hex === hex);
