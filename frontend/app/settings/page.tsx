"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import Link from "next/link";
import { Copy, Check, Download, ChevronRight, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSession } from "@/components/SessionProvider";
import { MemberDot } from "@/components/MemberDot";
import { renameMe } from "@/lib/households";

// Phase 01.1 D-08: read-only settings screen with three blocks (household
// name, invite code w/ copy, current member). Phase 01-foundations-w1
// plan 01-10 adds the JSON export section per UI-SPEC §11 / RECIPE-08.
//
// Phase 09-03 (v0.2): restructured into three Card surfaces stacked at
// gap-6 (Membre / Foyer / Sauvegarde mental model) with the Phase 9 identity
// signature on the invite-code (Fraunces italic terracotta — byte-
// identical mirror of share-code Plan 02). Tap-targets bumped to the
// D-08 48px floor. Zero new i18n keys: existing field-labels carry the
// section meaning per UI-SPEC §"Typography > Settings section title".
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
  const { status, session, refresh } = useSession();
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Phase 18 IDM-02 — Membre Card inline rename.
  // `renaming` toggles the name <span> ↔ <Input> swap. `renameValue` is the
  // controlled input. `renameSubmitting` guards against double-submit when
  // Enter and onBlur both fire (Enter triggers blur on most browsers).
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameSubmitting, setRenameSubmitting] = useState(false);

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

  // Phase 18 IDM-02 — extract numeric status from api()'s Error("<status> <text>").
  // The generic api() wrapper has no typed-error surface; this matches the
  // statusOf-style pattern used elsewhere in the codebase.
  const statusOf = (err: unknown): number | null => {
    if (err instanceof Error) {
      const m = err.message.match(/^(\d{3})\s/);
      if (m) return Number(m[1]);
    }
    return null;
  };

  const onStartRename = () => {
    setRenameValue(session.me.name);
    setRenaming(true);
  };

  const onCancelRename = () => {
    setRenaming(false);
    setRenameValue("");
  };

  const onSubmitRename = async () => {
    if (renameSubmitting) return;
    const trimmed = renameValue.trim();
    // Empty submits are a no-op; same-name submits close the input as a no-op
    // (the user opened the input and committed without changes — treat as cancel).
    if (trimmed.length === 0) return;
    if (trimmed === session.me.name) {
      onCancelRename();
      return;
    }
    setRenameSubmitting(true);
    try {
      await renameMe(trimmed);
      toast.success(t("member.rename_success_toast"));
      // Canonical reconciliation: re-fetch /households/me so SessionProvider's
      // snapshot reflects the server truth (optimistic+canonical merge per
      // D-18-07). Both phones converge through this same path — the renamer's
      // phone via this direct refresh call, the partner's phone via
      // RealtimeProvider's member.updated handler (Task 3).
      await refresh();
      setRenaming(false);
      setRenameValue("");
    } catch (err) {
      const status = statusOf(err);
      if (status === 409) {
        toast.error(t("member.rename_409_toast"));
      } else {
        toast.error(t("member.rename_error_toast"));
      }
      // Keep the input open with the rejected value so the user can adjust + retry.
      // useSession().refresh() is NOT called on error — UI never diverges from
      // the server's truth (T-18-02-06).
    } finally {
      setRenameSubmitting(false);
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

      <div className="flex flex-col gap-6 px-6 pt-6 pb-24">

        {/* Card 1 — Membre. Member color attribution + name.
            The "Membre" mental model is delivered by the Card grouping;
            the existing `settings.member_label` ("Toi") field-label inside
            carries the section meaning. NO new section-heading string.
            Phase 18 IDM-02: Pencil affordance swaps the name <span> into an
            <Input>; Enter/blur submit, Escape/cancel-X revert. The submit
            path is renameMe() (PATCH /households/me) with toast + canonical
            session refresh on success, optimistic+canonical merge on error. */}
        <Card className="paper-grain shadow-card p-6 flex flex-col gap-2">
          <span className="text-sm text-foreground-muted">
            {t("member_label")}
          </span>
          <div className="flex items-center gap-3">
            <MemberDot colorHex={session.me.color_hex} />
            {renaming ? (
              <div className="flex flex-1 items-center gap-2">
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void onSubmitRename();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      onCancelRename();
                    }
                  }}
                  onBlur={() => void onSubmitRename()}
                  maxLength={40}
                  aria-label={t("member.rename_label")}
                  autoFocus
                  disabled={renameSubmitting}
                  className="text-base font-medium"
                />
                {/* Cancel-X — onMouseDown (not onClick) so the cancel fires
                    BEFORE the Input's blur handler would trigger onSubmitRename. */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-12 w-12 shrink-0"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onCancelRename();
                  }}
                  aria-label={t("member.cancel_aria")}
                  disabled={renameSubmitting}
                >
                  <X size={20} />
                </Button>
              </div>
            ) : (
              <>
                <span className="text-base font-medium flex-1">
                  {session.me.name}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-12 w-12"
                  onClick={onStartRename}
                  aria-label={t("member.rename_aria")}
                >
                  <Pencil size={18} />
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Card 2 — Foyer. Household name + invite-code identity signature + copy affordance.
            The invite-code rendering MIRRORS share-code (Plan 02) byte-for-byte
            (Fraunces italic, terracotta, wide tracking — see the className below).
            This is the single most identity-bearing class string in v0.2 — used
            twice (share-code first-touch + Settings re-find) for recognition. */}
        <Card className="paper-grain shadow-card p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-foreground-muted">
              {t("household_name_label")}
            </span>
            <span className="text-base font-medium">{session.household_name}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-foreground-muted">
              {t("invite_code_label")}
            </span>
            <div className="flex items-center gap-3">
              {/* IDENTITY SIGNATURE — verbatim mirror of share-code (Plan 02 §Surface 4).
                  Replaces the previous monospace 28px wide-tracked uppercase register.
                  The terracotta + Fraunces italic + wide-tracking combo is the
                  "this is YOUR household monogram" gesture. */}
              <span
                className="font-display italic text-3xl tracking-widest text-primary"
                aria-label={t("invite_code_aria")}
              >
                {session.invite_code}
              </span>
              {/* Copy Button — h-12 w-12 (UI-SPEC tap-target audit row).
                  Bumped from default `size-8`. The Copy → Check icon swap on
                  the 2-second setTimeout is preserved unchanged. */}
              <Button
                size="icon"
                variant="ghost"
                className="h-12 w-12"
                onClick={onCopy}
                aria-label={t("invite_code_copy_aria")}
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </Button>
            </div>
            {/* FIX-04 (Phase 18): explicit text Copy button — discoverable
                affordance the audit found missing. The icon-only Button
                above stays as the keyboard / screen-reader-friendly alias
                AND as the inline visual pair with the invite code itself;
                this h-12 full-width Button is the primary visual affordance.
                Both share `onCopy` so the copy state and toast stay unified. */}
            <Button
              variant="outline"
              className="h-12 w-full"
              onClick={onCopy}
              disabled={copied}
            >
              <Copy className="h-4 w-4 mr-2" aria-hidden />
              {copied ? t("invite_code_copied") : t("invite_code_copy_cta")}
            </Button>
            <p className="text-sm text-foreground-muted">
              {t("invite_code_helper")}
            </p>
          </div>
        </Card>

        {/* Card 3 — Historique des cuissons. Nav entry to /cooking-logs (COOK-10
            from Phase 8). Closes audit MISSING-01 (cooking-log history page
            had no navigation entry point). Hardcoded French copy is a
            TODO(productize) — move to nav.cooking_history.* keys in v0.2.1
            i18n sweep alongside the HomeDecide partner-waiting strings. */}
        <Card className="paper-grain shadow-card p-6 flex flex-col gap-3">
          <span className="text-sm text-foreground-muted">Historique</span>
          <Button asChild className="h-12 w-full" variant="ghost">
            <Link href="/cooking-logs" className="flex items-center justify-between">
              <span>Voir les cuissons récentes</span>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </Card>

        {/* Card 4 — Sauvegarde. JSON export.
            Replaces the previous flat block (lines 145-161). The
            `settings.export_section_title` field-label inside carries the
            section meaning ("Exporter mes données"). NO new section-heading. */}
        <Card className="paper-grain shadow-card p-6 flex flex-col gap-3">
          <span className="text-sm text-foreground-muted">
            {t("export_section_title")}
          </span>
          <p className="text-sm text-foreground-muted">{t("export_body")}</p>
          {/* Export CTA — h-12 w-full (UI-SPEC tap-target audit row).
              Bumped to the 48px D-08 floor. The onExport handler + disabled + aria-busy preserved. */}
          <Button
            className="h-12 w-full"
            variant="default"
            onClick={onExport}
            disabled={exporting}
            aria-busy={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {t("export_cta")}
          </Button>
        </Card>

      </div>
    </section>
  );
}
