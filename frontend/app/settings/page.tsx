"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/SessionProvider";
import { MemberDot } from "@/components/MemberDot";

// Phase 01.1 D-08: read-only settings screen with three blocks (household
// name, invite code w/ copy, current member). Phase 01-foundations-w1
// plan 01-10 adds the JSON export section per UI-SPEC §11 / RECIPE-08.
//
// Export uses raw `fetch()` instead of api<T>() because we need the
// streamed Blob (not parsed JSON) and the Content-Disposition header.
// Auth travels via the same-origin aldente_auth cookie automatically
// (credentials: "include"). API_BASE === "" in production; the path
// /api/households/{id}/export.json is rewritten by next.config.ts to
// the Railway backend.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const { status, session } = useSession();
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  const onExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const householdId = session.household_id;
      // Use /api/ prefix so Vercel rewrites this to Railway in production
      // (next.config.ts) and the aldente_auth cookie rides along same-origin.
      // In local dev, NEXT_PUBLIC_API_BASE points directly at the backend
      // and the /api/ prefix would 404; strip it.
      const apiPath =
        API_BASE === ""
          ? `/api/households/${householdId}/export.json`
          : `/households/${householdId}/export.json`;
      const res = await fetch(`${API_BASE}${apiPath}`, {
        credentials: "include",
      });
      if (!res.ok) {
        toast.error(t("export_error"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `al-dente-recipes-${householdId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      // iOS Safari quirk: PWA standalone mode may open the JSON in a new
      // tab rather than downloading directly. Either is acceptable for
      // v0.1; productize-later TODO is an explicit "Save to Files" hint.
    } catch {
      toast.error(t("export_error"));
    } finally {
      setExporting(false);
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

        {/* Export block (UI-SPEC §11, RECIPE-08) */}
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">
            {t("export_section_title")}
          </h2>
          <p className="text-sm text-foreground-muted">{t("export_body")}</p>
          <Button
            className="h-11 w-full"
            variant="default"
            onClick={onExport}
            disabled={exporting}
            aria-busy={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {t("export_cta")}
          </Button>
        </div>
      </div>
    </section>
  );
}
