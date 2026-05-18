"use client";

// Phase 32 §15.C (SOBER-03) — segmented control for the 3 Bibliothèque views.
// Per CONTEXT D-09 + D-10 + UI-SPEC §9.2.
// State persistence (localStorage["aldente.library.view"]) is owned by the
// PARENT page — this component is a pure controlled segmented input.

import { useTranslations } from "next-intl";
import { LayoutGrid, List, Layers } from "lucide-react";

export type LibraryView = "grid" | "list" | "patina";

export interface LibraryViewSwitchProps {
  value: LibraryView;
  onChange: (next: LibraryView) => void;
  className?: string;
}

const VIEWS: { key: LibraryView; Icon: typeof LayoutGrid }[] = [
  { key: "grid", Icon: LayoutGrid },
  { key: "list", Icon: List },
  { key: "patina", Icon: Layers },
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
              color: active ? "var(--primary)" : "var(--foreground-muted)",
              boxShadow: active ? "var(--shadow-card)" : "none",
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
