"use client";

// Phase 3 stub — the "Finaliser" button on the cooking banner navigates here.
// Phase 4 will replace this with the photo + rating + notes finalization form
// (COOK-03 / COOK-04 / COOK-05). Until then, this route exists solely so the
// banner's <Link> doesn't 404; rendering is a centered EmptyState.

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/EmptyState";
import { OnboardingGuard } from "@/lib/onboarding-guard";

export default function CookingFinalizeStub() {
  const t = useTranslations("home.finalize_stub");
  return (
    <OnboardingGuard>
      <main className="flex flex-col flex-1">
        <EmptyState
          icon={Sparkles}
          heading={t("heading")}
          body={t("body")}
        />
      </main>
    </OnboardingGuard>
  );
}
