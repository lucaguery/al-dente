/**
 * Per ADR-0004 §Member colors, the 5-slot model (rose / amber / emerald /
 * sky / violet) is preserved here for productize-later (3+ member households).
 * On the current Soft warmth Accueil scene, display collapses to 2 visible
 * identities (ink + muted) — see CSS tokens `--color-member-luca` /
 * `--color-member-partner` in `frontend/app/globals.css`. Do not delete the
 * 5 rose/amber/emerald/sky/violet slots.
 */
// Mirror of backend/app/colors.py — drift is a category of bug per CLAUDE.md.
// Per D-04 (CONTEXT.md), Tailwind v4 default 500-shade hex values.
//
// Phase 20 TOK-02 / D-20-05: each entry also carries `bgVar` and `fgVar`
// strings that reference the corresponding `--color-member-{slot}-{bg|fg}`
// tokens declared in `frontend/app/globals.css`. `MemberDot` (and any future
// consumer) renders through these vars so dark-mode swaps stay automatic. The
// raw `hex` field is preserved for backwards-compat with backend storage
// (`Member.color_hex`) and for the rare consumer that needs a literal color
// (e.g. canvas, SVG fill, downstream image-generation).
export const MEMBER_COLORS = [
  {
    slot: 1,
    name: "rose",
    hex: "#F43F5E",
    tw: "rose-500",
    bgVar: "var(--color-member-rose-bg)",
    fgVar: "var(--color-member-rose-foreground)",
  },
  {
    slot: 2,
    name: "amber",
    hex: "#F59E0B",
    tw: "amber-500",
    bgVar: "var(--color-member-amber-bg)",
    fgVar: "var(--color-member-amber-foreground)",
  },
  {
    slot: 3,
    name: "emerald",
    hex: "#10B981",
    tw: "emerald-500",
    bgVar: "var(--color-member-emerald-bg)",
    fgVar: "var(--color-member-emerald-foreground)",
  },
  {
    slot: 4,
    name: "sky",
    hex: "#0EA5E9",
    tw: "sky-500",
    bgVar: "var(--color-member-sky-bg)",
    fgVar: "var(--color-member-sky-foreground)",
  },
  {
    slot: 5,
    name: "violet",
    hex: "#8B5CF6",
    tw: "violet-500",
    bgVar: "var(--color-member-violet-bg)",
    fgVar: "var(--color-member-violet-foreground)",
  },
] as const;

export type MemberColorHex = (typeof MEMBER_COLORS)[number]["hex"];

export const isValidMemberColor = (hex: string): hex is MemberColorHex =>
  MEMBER_COLORS.some((c) => c.hex === hex);

// Resolve a stored `Member.color_hex` to the matching token vars. Fallback
// emits the raw hex (so unknown colors still render somewhat sensibly) and
// white foreground (matches 4/5 slots; amber is the deliberate exception).
export function getMemberColorVars(hex: string): {
  bgVar: string;
  fgVar: string;
} {
  const entry = MEMBER_COLORS.find((c) => c.hex === hex);
  return entry
    ? { bgVar: entry.bgVar, fgVar: entry.fgVar }
    : { bgVar: hex, fgVar: "#FFFFFF" };
}
