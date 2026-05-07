"use client";

import { useParams } from "next/navigation";
import { OnboardingGuard } from "@/lib/onboarding-guard";
import { CookingLogFinalize } from "@/components/CookingLogFinalize";

export default function CookingFinalizePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  if (!id) return null;
  return (
    <OnboardingGuard>
      <CookingLogFinalize logId={id} />
    </OnboardingGuard>
  );
}
