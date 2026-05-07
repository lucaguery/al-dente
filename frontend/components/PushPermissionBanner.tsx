"use client";

// Phase 3 — D-09: inline push-permission banner.
// Shows ONLY when:
//   - serviceWorker + PushManager available
//   - Notification.permission === "default" (not granted, not denied)
//   - User hasn't dismissed this session (sessionStorage flag)
//   - On iOS: PWA is installed (navigator.standalone === true)
//
// 03-UI-SPEC.md §"Surface 3: Push-permission banner" + §"Push-permission flow".

import { useState, useSyncExternalStore } from "react";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { canReceivePush, registerPushSubscription } from "@/lib/push";

const SESSION_KEY = "dismissed_push_banner_at";

/**
 * Compute whether the banner should be shown based on browser state. This is
 * an external-store read (Notification.permission, sessionStorage, UA) rather
 * than React-owned state, so it lives outside the React state tree and is
 * pulled in via useSyncExternalStore — avoids the set-state-in-effect lint.
 */
function readBannerEligible(): boolean {
  if (typeof window === "undefined") return false;
  if (!canReceivePush()) return false;
  if (Notification.permission !== "default") return false;
  try {
    if (window.sessionStorage.getItem(SESSION_KEY)) return false;
  } catch {
    /* sessionStorage can throw in private mode — fall through */
  }
  return true;
}

// useSyncExternalStore subscribe is a no-op: eligibility only flips via the
// activate / dismiss handlers below (which call setOverrideHidden) — we don't
// need to subscribe to permission/storage changes.
const noopSubscribe = () => () => {};

export function PushPermissionBanner() {
  const t = useTranslations("home.push");
  const [submitting, setSubmitting] = useState(false);
  // overrideHidden lets handleActivate / handleLater hide the banner without
  // touching browser state inside an effect.
  const [overrideHidden, setOverrideHidden] = useState(false);

  // SSR returns false (snapshot for server) — the banner only mounts client-side
  // after hydration, which is correct: we can't access Notification.permission
  // on the server anyway.
  const eligible = useSyncExternalStore(
    noopSubscribe,
    readBannerEligible,
    () => false,
  );

  async function handleActivate() {
    setSubmitting(true);
    try {
      const res = await registerPushSubscription();
      if (res.ok) {
        toast.success(t("toast_activated"));
        setOverrideHidden(true);
      } else if (res.reason === "denied") {
        toast(t("permission_denied"));
        setOverrideHidden(true);
      } else {
        toast.error(t("subscribe_failed"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleLater() {
    try {
      window.sessionStorage.setItem(SESSION_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setOverrideHidden(true);
  }

  if (!eligible || overrideHidden) return null;

  return (
    <div
      role="region"
      aria-labelledby="push-banner-heading"
      className="mx-6 mt-4 flex items-start gap-3 px-4 py-3 rounded-2xl bg-surface-rose-100 border border-border"
    >
      <Bell size={20} className="text-primary mt-0.5" aria-hidden />
      <div className="flex-1 flex flex-col gap-1">
        <span
          id="push-banner-heading"
          className="text-base font-semibold leading-6"
        >
          {t("heading")}
        </span>
        <span className="text-sm text-foreground-muted leading-5">
          {t("body")}
        </span>
      </div>
      <div className="flex flex-col gap-2 ml-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          className="h-9 px-4"
          disabled={submitting}
          onClick={handleActivate}
        >
          {t("activate")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 px-4"
          disabled={submitting}
          onClick={handleLater}
        >
          {t("later")}
        </Button>
      </div>
    </div>
  );
}
