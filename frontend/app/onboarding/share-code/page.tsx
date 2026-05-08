"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// UI-SPEC §"Surface-by-Surface Pinning" §4 — Onboarding Share-code.
// Post-create screen. No back button — once the household exists the
// user shouldn't undo creation by going back. Done CTA replaces history
// (router.replace) so back from `/` doesn't bounce here.
// Phase 9 retheme: paper-grain body Card + Fraunces italic display title
// + Fraunces italic terracotta invite-code identity signature
// (`font-display italic text-3xl tracking-widest text-primary`) — this
// exact class string is repeated VERBATIM on the Settings invite-code
// in Plan 03 for first-touch ↔ re-find consistency. h-12 floor on copy
// + done buttons.
function ShareCodeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("onboarding.share_code");
  const tErrors = useTranslations("onboarding.errors");
  // Read directly from URL params — no local state needed (avoids the
  // React-19 setState-in-effect lint rule).
  const code = searchParams.get("code");

  useEffect(() => {
    if (!code) {
      router.replace("/");
    }
  }, [code, router]);

  if (!code) return null;

  async function onCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success(t("copied_toast"));
    } catch {
      toast.error(tErrors("network"));
    }
  }

  return (
    <section className="flex flex-col flex-1 bg-background px-6 pt-12 pb-32">
      <Card className="paper-grain shadow-card px-6 py-6 flex flex-col gap-4">
        {/* Editorial title — Fraunces italic display register. */}
        <h1 className="text-display">{t("title")}</h1>
        {/* Body copy — IBM Plex Sans muted. */}
        <p className="text-base text-foreground-muted">{t("body")}</p>

        {/* THE invite-code monogram — load-bearing identity element.
            Repeated VERBATIM on Settings invite-code (Plan 03) for
            first-touch ↔ re-find consistency. The cookbook-recipe-card-
            number gesture replaces the previous wide-tracked mono
            block. */}
        <div className="font-display italic text-3xl tracking-widest text-center py-4 text-primary">
          {code}
        </div>

        {/* Copy Button — h-12 secondary variant. */}
        <Button variant="secondary" className="h-12" onClick={onCopy}>
          <Copy className="h-4 w-4 mr-2" aria-hidden />
          {t("copy_cta")}
        </Button>
      </Card>

      {/* Bottom-fixed done CTA — h-12 default (terracotta). */}
      <div
        className="fixed bottom-0 inset-x-0 px-6 pb-6 bg-background/80 backdrop-blur-sm"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
      >
        <Button
          variant="default"
          className="h-12 w-full"
          onClick={() => router.replace("/")}
        >
          {t("done_cta")}
        </Button>
      </div>
    </section>
  );
}

// useSearchParams must be wrapped in <Suspense> in Next.js App Router so
// the page can be statically rendered while client-side params hydrate.
export default function OnboardingShareCodePage() {
  return (
    <Suspense fallback={null}>
      <ShareCodeInner />
    </Suspense>
  );
}
