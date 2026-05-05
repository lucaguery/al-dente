# Mirror of frontend/lib/colors.ts — drift is a category of bug per CLAUDE.md.
# Per D-04 (CONTEXT.md), Tailwind v4 default 500-shade hex values.
MEMBER_COLORS: list[str] = [
    "#F43F5E",  # rose-500
    "#F59E0B",  # amber-500
    "#10B981",  # emerald-500
    "#0EA5E9",  # sky-500
    "#8B5CF6",  # violet-500
]


def is_valid_member_color(hex_value: str) -> bool:
    return hex_value in MEMBER_COLORS
