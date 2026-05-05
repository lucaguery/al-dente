"use client";

import { Lock } from "lucide-react";
import { MEMBER_COLORS } from "@/lib/colors";

// 5-swatch member-color picker — UI-SPEC §"Color > Member colors".
// Pinned classes (do not loosen):
//   - `h-12 w-12 rounded-full` swatches in a row, `gap-3`.
//   - Disabled (already taken): `opacity-40` + `Lock` icon overlay.
//   - Selected: `ring-2 ring-foreground ring-offset-4 ring-offset-background`.
// Emits only values from MEMBER_COLORS, mitigating T-01-06-01 (client-
// side palette tampering — server still validates per 01-04).
type Props = {
  value: string | null;
  onChange: (hex: string) => void;
  takenColors?: ReadonlyArray<string>;
  "aria-label"?: string;
};

export function ColorSwatchPicker({
  value,
  onChange,
  takenColors = [],
  ...rest
}: Props) {
  return (
    <div
      role="radiogroup"
      aria-label={rest["aria-label"]}
      className="flex flex-row gap-3"
    >
      {MEMBER_COLORS.map((c) => {
        const taken = takenColors.includes(c.hex);
        const selected = value === c.hex;
        return (
          <button
            key={c.hex}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={taken}
            disabled={taken}
            onClick={() => {
              if (!taken) onChange(c.hex);
            }}
            className={[
              "h-12 w-12 rounded-full flex items-center justify-center",
              "focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2",
              taken ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
              selected
                ? "ring-2 ring-foreground ring-offset-4 ring-offset-background"
                : "",
            ].join(" ")}
            style={{ backgroundColor: c.hex }}
          >
            {taken ? (
              <Lock className="h-4 w-4 text-white" aria-hidden />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
