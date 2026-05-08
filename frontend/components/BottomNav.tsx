"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, BookOpen, Inbox, MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { api } from "@/lib/api";
import { useRealtime } from "@/components/RealtimeProvider";
import { useSession } from "@/components/SessionProvider";
import type { Recipe } from "@/lib/recipes";

type Tab = {
  href: string;
  segment: string | null; // selected-segment value when this tab is active; null = home
  icon: LucideIcon;
  labelKey: "home" | "recipes" | "drafts" | "more";
};

const TABS: ReadonlyArray<Tab> = [
  { href: "/", segment: null, icon: Home, labelKey: "home" },
  { href: "/recipes", segment: "recipes", icon: BookOpen, labelKey: "recipes" },
  { href: "/inbox", segment: "inbox", icon: Inbox, labelKey: "drafts" },
  {
    href: "/settings",
    segment: "settings",
    icon: MoreHorizontal,
    labelKey: "more",
  },
];

// UI-SPEC §"Layout & Navigation > Bottom navigation". Fixed at bottom,
// 4 tabs, hidden on /onboarding/* routes, honors iOS safe-area inset.
//
// Plan 01-10 wires the live drafts count: re-fetched on mount AND on every
// `recipe.created` / `recipe.updated` realtime frame (cheap, instant — no
// polling). Per UI-SPEC §"Component Inventory > Correction on drafts-tab
// badge", the badge is hidden when N=0; only N≥1 renders `(N)`.
export function BottomNav() {
  const segment = useSelectedLayoutSegment();
  const t = useTranslations("nav");
  const realtime = useRealtime();
  const { status } = useSession();
  const [draftCount, setDraftCount] = useState(0);

  // Re-fetch drafts count. Authenticated only; while loading or
  // unauthenticated, the effect short-circuits (no state mutation) and the
  // displayed count is gated on `status === "authenticated"` in render.
  // This avoids React 19's `react-hooks/set-state-in-effect` cascade.
  useEffect(() => {
    if (status !== "authenticated") return;
    let alive = true;
    const refetch = () => {
      api<Recipe[]>("/api/recipes?status=draft&limit=200")
        .then((rows) => {
          if (alive) setDraftCount(rows.length);
        })
        .catch(() => {
          // Non-fatal: keep stale count rather than zeroing the badge on
          // a transient network blip.
        });
    };
    refetch();
    if (!realtime) return () => { alive = false; };
    const offCreated = realtime.onEvent("recipe.created", refetch);
    const offUpdated = realtime.onEvent("recipe.updated", refetch);
    return () => {
      alive = false;
      offCreated();
      offUpdated();
    };
  }, [realtime, status]);

  // Hidden on onboarding flows per UI-SPEC §"Routes" table.
  if (segment?.startsWith("onboarding")) return null;

  return (
    <nav
      aria-label={t("home")}
      className="fixed bottom-0 inset-x-0 min-h-[4rem] bg-card/85 backdrop-blur-md border-t border-border flex pb-[env(safe-area-inset-bottom)] z-40"
    >
      {TABS.map(({ href, segment: tabSegment, icon: Icon, labelKey }) => {
        const active = segment === tabSegment;
        const showBadge =
          labelKey === "drafts" &&
          status === "authenticated" &&
          draftCount > 0;
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
            {/* Inbox-only badge — Pressenti-style pill at h-5 nav-bar density.
                Mirrors Phase 7 chipClass register (bg-primary/15 + text-primary
                + border-primary/40) at h-5 min-w-5 px-2. */}
            {showBadge ? (
              <span
                aria-hidden
                className="absolute top-0 right-1/4 h-5 min-w-5 rounded-full bg-primary/15 text-primary border border-primary/40 text-xs font-medium tabular-nums px-2 flex items-center justify-center z-20"
              >
                {draftCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
