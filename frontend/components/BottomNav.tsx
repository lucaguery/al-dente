"use client";

import Link from "next/link";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, BookOpen, User, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Phase 31 NAV-01 — 3 flat tabs + 1 central elevated « Ajouter » CTA = 4 slots.
// The CTA is the only variant: "central-cta" entry; the rest are variant: "tab".
// All slots remain flex: 1 siblings inside the nav shell (D-03) — adding a 5th
// slot later (gh#26 « Suggérer ») is a one-line TABS extension, no geometry rework.
//
// Active matching uses usePathname() (D-09) — useSelectedLayoutSegment() returns
// "recipes" for BOTH /recipes and /recipes/new, which would double-activate the
// Recettes tab AND the CTA. The segment hook is kept ONLY for the onboarding
// hide gate (D-10).
//
// History: Phase 27 D-11 collapsed 4 tabs → 3 by removing the pending-drafts
// destination. Phase 31 reopens to 4 slots, but the 4th slot is the central CTA
// (capture entry), not a drafts tab. The earlier Phase 27 explanation block is
// superseded by this comment.

type FlatTab = {
  variant: "tab";
  href: string;
  pathname: string;       // exact pathname or prefix for active matching
  matchExact: boolean;    // true = pathname ===, false = pathname.startsWith
  icon: LucideIcon;
  labelKey: "home" | "recipes" | "profile";
};

type CentralCTA = {
  variant: "central-cta";
  href: string;
  pathname: string;       // "/recipes/new" — exact match only
  labelKey: "add";
};

type Tab = FlatTab | CentralCTA;

const TABS: ReadonlyArray<Tab> = [
  { variant: "tab",         href: "/",            pathname: "/",            matchExact: true,  icon: Home,     labelKey: "home"    },
  { variant: "tab",         href: "/recipes",     pathname: "/recipes",     matchExact: false, icon: BookOpen, labelKey: "recipes" },
  { variant: "central-cta", href: "/recipes/new", pathname: "/recipes/new",                                    labelKey: "add"     },
  // gh#31 A3 — Profil tab icon switched from Settings (gear) to User
  // (person silhouette) so the icon matches the "Profil" label semantics
  // instead of reading as a system-settings affordance.
  { variant: "tab",         href: "/settings",    pathname: "/settings",    matchExact: false, icon: User,     labelKey: "profile" },
];

export function BottomNav() {
  const segment = useSelectedLayoutSegment();
  const pathname = usePathname();
  const t = useTranslations("nav");

  // Hidden on onboarding flows per UI-SPEC §"Routes" table (unchanged from v0.1).
  // D-10: segment-based hide gate is kept; usePathname-based gate would be a
  // behavioral change. Both hooks coexist safely (verified in 31-RESEARCH.md).
  if (segment?.startsWith("onboarding")) return null;

  // Active predicate — mutually exclusive across all 4 slots (D-12).
  // The Recettes prefix-match explicitly excludes /recipes/new so the CTA wins
  // there (D-08 / D-09 load-bearing invariant).
  const isActive = (tab: Tab): boolean => {
    if (tab.variant === "central-cta") return pathname === tab.pathname;
    if (tab.matchExact) return pathname === tab.pathname;
    return pathname.startsWith(tab.pathname) && pathname !== "/recipes/new";
  };

  return (
    <nav
      // TODO(productize): move to nav.aria_label key once a new i18n key is
      // permissible. Hardcoded interim is acceptable in v0.1 (French-only)
      // and corrects a pre-existing screen-reader bug where the landmark was
      // mislabeled as "Accueil" (the Home tab string).
      aria-label="Navigation principale"
      className="fixed bottom-0 inset-x-0 min-h-[4.5rem] bg-card/85 backdrop-blur-md border-t border-border flex pb-[env(safe-area-inset-bottom)] z-40"
    >
      {TABS.map((tab) => {
        const active = isActive(tab);

        if (tab.variant === "central-cta") {
          // Central elevated CTA — always-filled circle + additive ring on active (D-11).
          // The circle is the focal point on every screen; the ring is the subtle
          // "you are here" confirmation, not a transformation of the filled affordance.
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={t("add")}
              aria-current={active ? "page" : undefined}
              className="relative flex flex-col items-center justify-center flex-1 gap-1 text-xs font-medium transition-colors duration-fast ease-craft"
            >
              <span
                aria-hidden
                // SOBER-10 — central CTA elevation per locked Phase 31 mockup
                // (.scratch/capture-mockups/1-smart-paste.html): translateY(-12px)
                // + soft drop shadow so the pill reads as "elevated CTA above the
                // row" rather than "the third of four tabs." `-translate-y-3` and
                // `active:scale-95` both feed Tailwind's `transform` utility and
                // compose cleanly (translate stays; scale layers on press). The
                // outer <Link> keeps flex-1 so the four-slot footprint is intact;
                // the lift is purely vertical. `shadow-card` is the project token
                // (frontend/app/globals.css :81 / :312) — reads in light + dark.
                className={`flex items-center justify-center rounded-full bg-primary text-primary-foreground w-14 h-14 -translate-y-3 shadow-card transition-all duration-fast ease-craft active:scale-95${active ? " ring-2 ring-primary/30 ring-offset-1 ring-offset-background" : ""}`}
              >
                <Plus size={24} strokeWidth={2.5} aria-hidden />
              </span>
              <span className={active ? "text-primary" : "text-foreground-muted"}>
                {t("add")}
              </span>
            </Link>
          );
        }

        // variant === "tab" — flat sibling tab with the existing active-pill wash idiom.
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex flex-col items-center justify-center flex-1 gap-1 text-xs font-medium transition-colors duration-fast ease-craft ${
              active ? "text-primary" : "text-foreground-muted"
            }`}
          >
            {/* Active-state pill wash — bg-primary/8 rounded-full h-10 w-10 behind
                the icon. Mirrors Phase 8 CookingBanner informational-chrome wash at
                icon-pill density. Applied ONLY to variant === "tab" — the CTA owns
                its own active treatment (D-11, Pitfall 3 in 31-RESEARCH.md). */}
            {active ? (
              <span
                aria-hidden
                className="absolute inset-x-0 top-2 mx-auto rounded-full h-10 w-10 bg-primary/8 transition-colors duration-fast ease-craft"
              />
            ) : null}
            {/* Icon — sits above the wash via z-10 */}
            <Icon size={24} aria-hidden className="relative z-10" />
            {/* Label — text-xs (12px / line-height 16px), Phase 5 chrome idiom */}
            <span className="relative z-10">{t(tab.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
