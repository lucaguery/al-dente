"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";

// Phase 01.1 cookie-auth: first-launch detection is a server check.
// If GET /api/households/me returns 401, SessionProvider sets status to
// "unauthenticated" and we redirect here. While loading, render nothing
// (avoids flash of unguarded home content during the round-trip).

export function OnboardingGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/onboarding/welcome");
    }
  }, [status, router]);

  if (status !== "authenticated") return null;
  return <>{children}</>;
}
