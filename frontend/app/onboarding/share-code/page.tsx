"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

// UI-SPEC §"Surface-by-Surface Pinning" §4 — Onboarding Share-code.
// Post-create screen. No back button — once the household exists the
// user shouldn't undo creation by going back. Done CTA replaces history
// (router.replace) so back from `/` doesn't bounce here.
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
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <p className="text-base text-foreground-muted mt-2">{t("body")}</p>

      <div className="text-[28px] font-mono font-semibold tracking-[0.3em] py-6 px-8 bg-surface-muted rounded-lg text-center mt-6">
        {code}
      </div>

      <div className="mt-4">
        <Button
          variant="secondary"
          className="h-11"
          onClick={onCopy}
        >
          <Copy className="h-4 w-4 mr-2" aria-hidden />
          {t("copy_cta")}
        </Button>
      </div>

      <div
        className="fixed bottom-0 inset-x-0 px-6 pb-6 bg-background/80 backdrop-blur-sm"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
      >
        <Button
          variant="default"
          className="h-11 w-full"
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
