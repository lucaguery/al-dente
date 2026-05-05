"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
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

// Subscriber for useSyncExternalStore — the localStorage-backed token
// doesn't change while a single page is open in v0.1, so a no-op
// subscribe is sufficient. Returning the SSR fallback as `false` matches
// the SSR-rendered HTML ("not yet onboarded → render nothing"),
// avoiding hydration mismatch.
function subscribe() {
  return () => {};
}

export function OnboardingGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  // useSyncExternalStore avoids the React-19 `set-state-in-effect`
  // lint rule while still rendering SSR-safe defaults. The third arg is
  // the server snapshot; on the server we know nothing about
  // localStorage, so we pretend "not yet onboarded" — which causes the
  // server-rendered HTML to be empty (children gated below) until
  // hydration produces the real value.
  const onboarded = useSyncExternalStore(subscribe, hasOnboarded, () => false);

  useEffect(() => {
    if (!onboarded) {
      router.replace("/onboarding/welcome");
    }
  }, [onboarded, router]);

  if (!onboarded) return null;
  return <>{children}</>;
}
