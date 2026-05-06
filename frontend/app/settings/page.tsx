"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/SessionProvider";
import { MemberDot } from "@/components/MemberDot";

// Phase 01.1 D-08: read-only settings screen.
// Three blocks: household name, invite code (large + copy), current member.
// No editing — Phase 4 (or productize-later) owns name/color edit and
// leave-household danger zone.

export default function SettingsPage() {
  const t = useTranslations("settings");
  const { status, session } = useSession();
  const [copied, setCopied] = useState(false);

  if (status === "loading") {
    return (
      <section className="flex flex-col flex-1 px-6 pt-6">
        <div className="h-6 w-32 bg-surface-muted animate-pulse rounded" />
      </section>
    );
  }

  if (status !== "authenticated" || !session) {
    // OnboardingGuard normally catches this at the route level; defensive null.
    return null;
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(session.invite_code);
      setCopied(true);
      toast.success(t("invite_code_copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("invite_code_copy_failed"));
    }
  };

  return (
    <section className="flex flex-col flex-1 bg-background">
      <header className="sticky top-0 h-12 px-6 flex items-center bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <h1 className="text-base font-semibold">{t("title")}</h1>
      </header>

      <div className="flex flex-col gap-8 px-6 pt-6 pb-24">
        {/* Household block */}
        <div className="flex flex-col gap-2">
          <span className="text-sm text-foreground-muted">
            {t("household_name_label")}
          </span>
          <span className="text-lg font-medium">{session.household_name}</span>
        </div>

        {/* Invite code block — mirrors onboarding/share-code styling so user recognizes it */}
        <div className="flex flex-col gap-3">
          <span className="text-sm text-foreground-muted">
            {t("invite_code_label")}
          </span>
          <div className="flex items-center gap-3">
            <span
              className="text-[28px] font-mono font-semibold tracking-[0.3em] uppercase"
              aria-label={t("invite_code_aria")}
            >
              {session.invite_code}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={onCopy}
              aria-label={t("invite_code_copy_aria")}
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </Button>
          </div>
          <p className="text-sm text-foreground-muted">
            {t("invite_code_helper")}
          </p>
        </div>

        {/* Current member block */}
        <div className="flex flex-col gap-2">
          <span className="text-sm text-foreground-muted">
            {t("member_label")}
          </span>
          <div className="flex items-center gap-3">
            <MemberDot colorHex={session.me.color_hex} />
            <span className="text-lg font-medium">{session.me.name}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
