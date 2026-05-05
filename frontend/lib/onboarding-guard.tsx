"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { hasOnboarded } from "@/lib/auth";

// First-launch redirect — when no auth_token in localStorage, send the
// user to /onboarding/welcome. Renders nothing until the check has
// settled to avoid a flash of unguarded home content. Implements the
// client half of ONBOARD-06 ("first-launch detection").
//
// Mounted at frontend/app/page.tsx (the home placeholder). Other guarded
// surfaces (recipes, inbox, settings) come online in 01-07 / 01-10 and
// can either reuse this component or rely on the 401-redirect path baked
// into lib/api.ts.
export function OnboardingGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasOnboarded()) {
      router.replace("/onboarding/welcome");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;
  return <>{children}</>;
}
