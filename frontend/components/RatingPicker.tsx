"use client";

// UI-SPEC §"Surface 3: RatingPicker.tsx" — three large tappable cards in a
// vertical stack: Adoré (rose) / Bien (emerald) / Passable (neutral).
// Required field — tapping a different card flips selection; tapping the
// same card again does NOT clear (the Finaliser button enforces required).
//
// Reuses existing tokens (post-Phase 20 token sweep — emerald literals replaced by
// semantic --color-valide-* tokens from globals.css, which carry the dark-mode swap):
//   loved    → bg-surface-rose-100 border-2 border-primary text-primary
//   liked    → bg-valide-tint border-2 border-[var(--color-valide-foreground)] text-[var(--color-valide-emphasis)]
//   disliked → bg-surface-muted border-2 border-foreground-muted text-foreground

import { Heart, ThumbsUp, Meh, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LogRating } from "@/lib/cooking";

type CardSpec = {
  value: LogRating;
  Icon: LucideIcon;
  iconFilled?: boolean;
  selectedClass: string;
};

const CARDS: CardSpec[] = [
  {
    value: "loved",
    Icon: Heart,
    iconFilled: true,
    selectedClass:
      "bg-surface-rose-100 border-2 border-primary text-primary",
  },
  {
    value: "liked",
    Icon: ThumbsUp,
    selectedClass:
      "bg-valide-tint border-2 border-[var(--color-valide-foreground)] text-[var(--color-valide-emphasis)]",
  },
  {
    value: "disliked",
    Icon: Meh,
    selectedClass:
      "bg-surface-muted border-2 border-foreground-muted text-foreground",
  },
];

const UNSELECTED =
  "bg-card border border-border text-foreground hover:bg-secondary/50";

type Props = {
  value: LogRating | null;
  onChange: (next: LogRating) => void;
};

export function RatingPicker({ value, onChange }: Props) {
  const t = useTranslations("cooking_log.rating");
  return (
    <div className="flex flex-col gap-3">
      {CARDS.map(({ value: v, Icon, iconFilled, selectedClass }) => {
        const selected = value === v;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(v)}
            className={[
              "h-20 w-full flex items-center gap-4 px-4 rounded-xl shadow-card paper-grain",
              "transition-colors transition-transform duration-100 ease-craft active:scale-95",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
              selected ? selectedClass : UNSELECTED,
            ].join(" ")}
          >
            <Icon
              size={28}
              className="shrink-0"
              fill={iconFilled && selected ? "currentColor" : "none"}
              aria-hidden
            />
            <div className="flex-1 flex flex-col items-start gap-0.5 text-left">
              <span className="text-base font-semibold leading-6">
                {t(v)}
              </span>
              <span className="text-sm text-foreground-muted leading-5">
                {t(`${v}_helper`)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
