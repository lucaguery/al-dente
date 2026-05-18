"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, BookOpen, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Tab = {
  href: string;
  segment: string | null; // selected-segment value when this tab is active; null = home
  icon: LucideIcon;
  labelKey: "home" | "recipes" | "settings";
};

const TABS: ReadonlyArray<Tab> = [
  { href: "/", segment: null, icon: Home, labelKey: "home" },
  { href: "/recipes", segment: "recipes", icon: BookOpen, labelKey: "recipes" },
  { href: "/settings", segment: "settings", icon: Settings, labelKey: "settings" },
];

// Phase 27 D-11 — 4→3 slot redistribution. The pending-drafts destination was
// deleted along with its route in Plan 27-03 (CAPTURE-02 / D-09). Pending items
// now surface transiently on the recipe detail page's thread-meta state pill
// (Plan 27-05) during the promotion window. The 3 remaining tabs stay at
// flex: 1 and rebalance to 33% width each.
//
// What changed in Phase 27 (see git blame for the previous implementation):
//   - Draft count badge (per-tab state + status=draft refetch) removed
//   - Realtime subscription that refreshed the badge removed
//   - Session auth gate that guarded the badge fetch removed
//   - The fourth TABS entry for the deleted route removed
//   - The associated mail icon import removed
export function BottomNav() {
  const segment = useSelectedLayoutSegment();
  const t = useTranslations("nav");

  // Hidden on onboarding flows per UI-SPEC §"Routes" table (unchanged from v0.1).
  if (segment?.startsWith("onboarding")) return null;

  return (
    <nav
      // TODO(productize): move to nav.aria_label key once a new i18n key is
      // permissible. Hardcoded interim is acceptable in v0.1 (French-only)
      // and corrects a pre-existing screen-reader bug where the landmark was
      // mislabeled as "Accueil" (the Home tab string).
      aria-label="Navigation principale"
      className="fixed bottom-0 inset-x-0 min-h-[4rem] bg-card/85 backdrop-blur-md border-t border-border flex pb-[env(safe-area-inset-bottom)] z-40"
    >
      {TABS.map(({ href, segment: tabSegment, icon: Icon, labelKey }) => {
        const active = segment === tabSegment;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex flex-col items-center justify-center flex-1 gap-1 text-xs font-medium transition-colors duration-fast ease-craft ${
              active ? "text-primary" : "text-foreground-muted"
            }`}
          >
            {/* Active-state pill wash — bg-primary/8 rounded-full h-10 w-10
                behind the icon. Mirrors Phase 8 CookingBanner informational-
                chrome wash at icon-pill density. Replaces the previous 2px
                top-bar accent. */}
            {active ? (
              <span
                aria-hidden
                className="absolute inset-x-0 top-2 mx-auto rounded-full h-10 w-10 bg-primary/8 transition-colors duration-fast ease-craft"
              />
            ) : null}
            {/* Icon — sits above the wash via z-10 */}
            <Icon size={24} aria-hidden className="relative z-10" />
            {/* Label — text-xs (12px / line-height 16px), Phase 5 chrome idiom */}
            <span className="relative z-10">{t(labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
