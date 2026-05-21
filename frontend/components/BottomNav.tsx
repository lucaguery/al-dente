"use client";

import Link from "next/link";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";
import { useTranslations } from "next-intl";
import { House, LibraryBig, UsersRound, Plus } from "lucide-react";

// ADR-0004 §Bottom navigation (LOAD-BEARING) — icon-only, 60px bar, 36px tap
// pill, 20px icon, 10px pill radius. Lucide icons: House / LibraryBig / Plus /
// UsersRound. Active tab uses --valide-tint background + accent icon.
//
// VoiceOver gate (ADR §Risk register, first bullet — "biggest accessibility
// risk"): without visible text labels, every slot MUST carry aria-label
// inline. Non-deferrable. The previous text-label band is gone.
//
// History: Phase 31 NAV-01 introduced 3 flat tabs + central CTA with text
// labels. Wave 2 of the ADR-0004 migration drops the labels + swaps the icon
// set + collapses bar height 68px → 60px. The 4-slot footprint and the
// central-CTA elevation idiom (-translate-y-3) are preserved. The four slots
// are inlined (no .map abstraction) so each `aria-label=` is grep-visible at
// the source level — the wave-2 verify gate counts them as a non-deferrable
// invariant.
//
// Active matching uses usePathname() (Phase 31 D-09) — useSelectedLayoutSegment()
// returns "recipes" for BOTH /recipes and /recipes/new, which would double-activate
// the Recettes tab AND the CTA. The segment hook is kept ONLY for the onboarding
// hide gate (D-10).

// Shared per-tab class chains — single source of truth so the 4 inline slots
// stay consistent without re-introducing the .map abstraction the verify gate
// pushed us away from.
const tabLinkCls =
  "relative flex items-center justify-center flex-1 transition-colors duration-(--duration-fast) ease-(--ease)";
const tabPillCls = (active: boolean) =>
  `flex items-center justify-center h-9 w-9 rounded-[10px] transition-colors duration-(--duration-fast) ease-(--ease) ${
    active ? "bg-(--valide-tint) text-primary" : "text-muted-foreground"
  }`;

export function BottomNav() {
  const segment = useSelectedLayoutSegment();
  const pathname = usePathname();
  const t = useTranslations("nav");

  // Hidden on onboarding flows per UI-SPEC §"Routes" table (unchanged from v0.1).
  if (segment?.startsWith("onboarding")) return null;

  // Active flags — mutually exclusive across all 4 slots (Phase 31 D-12).
  // The Recettes prefix-match explicitly excludes /recipes/new so the CTA
  // wins there (D-08 / D-09 load-bearing invariant).
  const homeActive = pathname === "/";
  const recipesActive = pathname.startsWith("/recipes") && pathname !== "/recipes/new";
  const ctaActive = pathname === "/recipes/new";
  const settingsActive = pathname.startsWith("/settings");

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 inset-x-0 min-h-[60px] bg-card/85 backdrop-blur-md border-t border-border flex pb-[env(safe-area-inset-bottom)] z-40"
    >
      {/* 1. Accueil tab */}
      <Link
        href="/"
        aria-label={t("home")}
        aria-current={homeActive ? "page" : undefined}
        className={tabLinkCls}
      >
        <span aria-hidden className={tabPillCls(homeActive)}>
          <House size={20} aria-hidden />
        </span>
      </Link>

      {/* 2. Recettes tab */}
      <Link
        href="/recipes"
        aria-label={t("recipes")}
        aria-current={recipesActive ? "page" : undefined}
        className={tabLinkCls}
      >
        <span aria-hidden className={tabPillCls(recipesActive)}>
          <LibraryBig size={20} aria-hidden />
        </span>
      </Link>

      {/* 3. Ajouter — central elevated CTA. Ink-bg on rest, terracotta-bg on
          hover (ADR §Tokens + sketch SKILL.md: "warmth comes from surface +
          accent, not a colored button"). -translate-y-3 lift; active state
          adds a thin terracotta ring rather than a shadow (ADR §Shadows —
          deck card is the ONLY shadow exception, not the nav CTA). */}
      <Link
        href="/recipes/new"
        aria-label={t("add")}
        aria-current={ctaActive ? "page" : undefined}
        className="relative flex flex-col items-center justify-center flex-1 transition-colors duration-(--duration-fast) ease-(--ease)"
      >
        <span
          aria-hidden
          // PUNCH-LIST P-02 (260521-l8g) — elevation grammar = translate + soft
          // drop-shadow. ADR-0004 §Shadows: the deck card is the canonical
          // shadow exception, and the central nav CTA is the only OTHER place
          // where a soft shadow is allowed (it carries the same elevation
          // metaphor — "above the surface"). Shadow params match the deck
          // card token (var(--shadow-deck) decomposed to inline). The active
          // ring is preserved as a separate state affordance.
          className={`flex items-center justify-center rounded-full bg-foreground text-background w-14 h-14 -translate-y-3 shadow-[0px_8px_24px_-8px_rgba(20,17,13,0.18)] transition-all duration-(--duration-fast) ease-(--ease) active:scale-95 hover:bg-primary${ctaActive ? " ring-2 ring-primary/30 ring-offset-1 ring-offset-background" : ""}`}
        >
          <Plus size={20} strokeWidth={2.5} aria-hidden />
        </span>
      </Link>

      {/* 4. Profil tab — UsersRound (two heads) per ADR §Bottom navigation
          table: signals "household" (couple/multi-member) rather than a
          single-user profile icon. */}
      <Link
        href="/settings"
        aria-label={t("profile")}
        aria-current={settingsActive ? "page" : undefined}
        className={tabLinkCls}
      >
        <span aria-hidden className={tabPillCls(settingsActive)}>
          <UsersRound size={20} aria-hidden />
        </span>
      </Link>
    </nav>
  );
}
