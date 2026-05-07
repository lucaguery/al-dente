"use client";

// Phase 3 — cold-start info chip (corpus < 10 recipes).
// Dismissible per session via sessionStorage flag.
// 03-UI-SPEC.md §Surface 2.

import { useSyncExternalStore } from "react";
import { Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "dismissed_cold_start_chip";
const DISMISS_EVENT = "aldente:chip-dismissed";

function subscribe(cb: () => void) {
  window.addEventListener(DISMISS_EVENT, cb);
  return () => window.removeEventListener(DISMISS_EVENT, cb);
}

function getSnapshot(): boolean {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function ColdStartChip() {
  const t = useTranslations("home.cold_start");
  const tCommon = useTranslations("common");

  const dismissed = useSyncExternalStore(subscribe, getSnapshot, () => false);

  function handleDismiss() {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // sessionStorage can throw in private-mode Safari; degrade silently.
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }

  if (dismissed) return null;
  return (
    <div className="mx-6 mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-rose-50 border border-border">
      <Sparkles
        size={16}
        className="text-foreground-muted"
        aria-hidden
      />
      <p className="text-sm font-medium leading-5 flex-1">{t("body")}</p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleDismiss}
        aria-label={tCommon("close")}
      >
        <X size={16} />
      </Button>
    </div>
  );
}
