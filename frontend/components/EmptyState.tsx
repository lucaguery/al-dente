import Link from "next/link";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";

// UI-SPEC §"Component Inventory > EmptyState.tsx" — paper-grain Card surface
// with display-serif headline; used by drafts inbox today (heading "Tout est
// à jour") and reusable by future Phase 7+ surfaces. The component does NOT
// import Card from @/components/ui/card on purpose — applying `paper-grain`
// + `shadow-card` directly to a div keeps the empty-state shell minimal and
// avoids a Card-Header-Content-Footer subtree just for two text lines.
export function EmptyState({
  icon: Icon,
  heading,
  body,
  cta,
}: {
  icon: ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  heading: string;
  body: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="paper-grain shadow-card flex flex-col items-center text-center px-6 py-12 gap-3 rounded-lg bg-card border border-border">
      <Icon className="text-foreground-muted" size={48} aria-hidden />
      <h2 className="text-title">{heading}</h2>
      <p className="text-base text-foreground-muted max-w-xs">{body}</p>
      {cta ? (
        <Button asChild className="h-12 mt-3">
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}
