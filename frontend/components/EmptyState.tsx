import Link from "next/link";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";

// ADR-0004 wave 2 — empty-state shell rebased to hairline-only.
// Previously this surface composed `paper-grain shadow-card` on a bare div
// to avoid the Card subtree overhead. Both are dropped per ADR §Shadows +
// §Texture. The shell is now a plain rounded card with border-border and
// bg-card; no depth, no texture. Wave 4 will swap any <BrandIcon> passed in
// via the `icon` prop for the new <AlDenteMark>; this component is icon-
// agnostic so the caller drives that.
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
    <div className="flex flex-col items-center text-center px-6 py-12 gap-3 rounded-lg bg-card border border-border">
      <Icon className="text-muted-foreground" size={48} aria-hidden />
      <h2 className="text-title">{heading}</h2>
      <p className="text-body text-muted-foreground max-w-xs">{body}</p>
      {cta ? (
        <Button asChild className="h-12 mt-3">
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}
