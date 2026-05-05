"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, BookOpen, Inbox, MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Tab = {
  href: string;
  segment: string | null; // selected-segment value when this tab is active; null = home
  icon: LucideIcon;
  labelKey: "home" | "recipes" | "drafts" | "more";
  badge?: number;
};

const TABS: ReadonlyArray<Tab> = [
  { href: "/", segment: null, icon: Home, labelKey: "home" },
  { href: "/recipes", segment: "recipes", icon: BookOpen, labelKey: "recipes" },
  // 01-07 wires the live drafts count; W1 ships with badge=0 (badge hidden when 0).
  { href: "/inbox", segment: "inbox", icon: Inbox, labelKey: "drafts", badge: 0 },
  { href: "/settings", segment: "settings", icon: MoreHorizontal, labelKey: "more" },
];

// UI-SPEC §"Layout & Navigation > Bottom navigation". Fixed at bottom,
// 4 tabs, hidden on /onboarding/* routes, honors iOS safe-area inset.
export function BottomNav() {
  const segment = useSelectedLayoutSegment();
  const t = useTranslations("nav");

  // Hidden on onboarding flows per UI-SPEC §"Routes" table.
  if (segment?.startsWith("onboarding")) return null;

  return (
    <nav
      aria-label={t("home")}
      className="fixed bottom-0 inset-x-0 h-16 bg-surface-muted border-t border-border flex pb-[env(safe-area-inset-bottom)] z-40"
    >
      {TABS.map(({ href, segment: tabSegment, icon: Icon, labelKey, badge }) => {
        const active = segment === tabSegment;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex flex-col items-center justify-center flex-1 gap-1 text-[10px] font-medium ${
              active ? "text-foreground" : "text-foreground-muted"
            }`}
          >
            {active ? (
              <span
                aria-hidden
                className="absolute top-0 h-0.5 w-8 bg-primary rounded-b-full"
              />
            ) : null}
            <Icon size={24} aria-hidden />
            <span className="flex items-center gap-1">
              {t(labelKey)}
              {badge && badge > 0 ? (
                <span className="text-[10px] tabular-nums">({badge})</span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
