"use client";

// Bibliothèque view switcher — Grille + Liste only.
// PUNCH-LIST D-01 (quick 260521-l8g): the Patine view + Héritage/Habitudes/À l'essai
// IA was dropped in the ADR-0004 cleanup wave (only the CSS class was removed in
// the initial wave; the radio + sectioning survived until this commit).
// State persistence (localStorage["aldente.library.view"]) is owned by the
// PARENT page — this component is a pure controlled segmented input.

import { useTranslations } from "next-intl";
import { LayoutGrid, List } from "lucide-react";

export type LibraryView = "grid" | "list";

export interface LibraryViewSwitchProps {
  value: LibraryView;
  onChange: (next: LibraryView) => void;
  className?: string;
}

const VIEWS: { key: LibraryView; Icon: typeof LayoutGrid }[] = [
  { key: "grid", Icon: LayoutGrid },
  { key: "list", Icon: List },
];

export function LibraryViewSwitch({ value, onChange, className }: LibraryViewSwitchProps) {
  const tAria = useTranslations("home.library.view");
  return (
    <div
      role="radiogroup"
      aria-label="Vue de la bibliothèque"
      className={`inline-flex items-center bg-secondary rounded-full ${className ?? ""}`}
      style={{ padding: "3px", gap: "2px" }}
    >
      {VIEWS.map(({ key, Icon }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={tAria(`${key}.aria`)}
            onClick={() => onChange(key)}
            className="inline-flex items-center justify-center rounded-full transition-all duration-150"
            style={{
              padding: "5px 9px",
              background: active ? "var(--card)" : "transparent",
              color: active ? "var(--primary)" : "var(--muted-foreground)",
              border: active ? "1px solid var(--border)" : "1px solid transparent",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            <Icon size={14} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

export default LibraryViewSwitch;
