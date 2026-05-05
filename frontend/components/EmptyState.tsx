import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// UI-SPEC §"Copywriting > Empty states" — centered, illustration-free,
// heading + body + optional CTA. Used by recipe library, drafts inbox,
// search no-results.
export function EmptyState({
  icon: Icon,
  heading,
  body,
  cta,
}: {
  icon: LucideIcon;
  heading: string;
  body: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-12 gap-3">
      <Icon className="text-foreground-muted" size={48} aria-hidden />
      <h2 className="text-xl font-semibold leading-7">{heading}</h2>
      <p className="text-base text-foreground-muted max-w-xs">{body}</p>
      {cta ? (
        <Button asChild className="mt-3">
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}
