"use client";

// Profil page — La Grille · Soft warmth composition (Phase 40 PROF-01).
//
// Replaces the prior 3-Card stack with the literal-sketch composition from
// .claude/skills/sketch-findings-al-dente/sources/002-refresh-direction-explorations/index.html
// lines 1765-1809: hero word + identity line + partner block + stats block +
// 5 numbered hairline rows. No Card components anywhere — only hairline
// borders on the off-white surface (ADR-0004 Type stack + Surface temperature).
//
// Phase 40 CONTEXT.md decisions in effect:
//   D-01 — Shortlist-scheduling row dropped (no such setting exists today;
//          household timezone is fixed at onboarding).
//   D-03 — No Card components. Hairline rows only.
//   D-06 — Stats block fetches once via useEffect on mount; no realtime sub.

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Bell,
  Check,
  ChevronRight,
  Copy,
  Download,
  LogOut,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/components/SessionProvider";
import { MemberDot } from "@/components/MemberDot";
import { VersionFooter } from "@/components/VersionFooter";
import { api } from "@/lib/api";
import { renameMe } from "@/lib/households";
import {
  canReceivePush,
  registerPushSubscription,
  unsubscribePush,
} from "@/lib/push";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

// Push-permission snapshot. Lives at module scope so the useSyncExternalStore
// snapshot getter is referentially stable across renders (Notification.permission
// + canReceivePush() are read fresh each call).
type PushState = "unsupported" | "default" | "granted" | "denied";

function readPushState(): PushState {
  if (typeof window === "undefined") return "unsupported";
  if (!canReceivePush()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return "default";
}

type HouseholdStats = {
  recipes_count: number;
  cooking_logs_count: number;
  votes_count: number;
};

// Format the household-creation month into the La Grille `YYYY.MM` shape
// (e.g. `2026.03`). fr-FR locale renders `MM/YYYY`; we swap order + separator.
function formatCreatedAt(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}.${mm}`;
}

type SessionShape = ReturnType<typeof useSession>["session"];

function NumberedRow({
  index,
  label,
  meta,
  onClick,
  ariaLabel,
}: {
  index: string;
  label: string;
  meta?: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className="flex items-center gap-4 w-full py-4 border-b border-border text-left"
    >
      <span className="text-caption tabular-nums shrink-0 text-foreground font-mono">
        {index}
      </span>
      <span className="flex-1 text-base font-medium">{label}</span>
      {meta !== undefined && meta !== null ? (
        <span className="text-caption text-muted-foreground">{meta}</span>
      ) : null}
      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
    </button>
  );
}

export default function SettingsPage() {
  const t = useTranslations("settings");
  const { status, session, refresh } = useSession();

  // Partner list: everyone except `me`. Sorted by id for determinism.
  const partners = useMemo(() => {
    if (!session) return [];
    return session.members
      .filter((m) => m.id !== session.me.id)
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [session]);

  // Identity line: `maison · CODE · depuis YYYY.MM`. Falls back to empty
  // strings if SessionProvider hasn't filled the relevant fields yet.
  const identityDate = useMemo(() => {
    // session.household_created_at may not be on the SessionResponse today
    // (it isn't in the Pydantic shape) — fall back to empty if missing.
    const raw = (session as SessionShape & { household_created_at?: string })
      ?.household_created_at;
    return formatCreatedAt(raw);
  }, [session]);

  // Stats block — single useEffect fetch on mount (D-06: no realtime sub).
  const [stats, setStats] = useState<HouseholdStats | null>(null);

  useEffect(() => {
    if (!session?.household_id) return;
    let cancelled = false;
    // /api/ prefix in prod (rewritten by next.config.ts to Railway);
    // in local dev (NEXT_PUBLIC_API_BASE set), strip /api/.
    const path =
      API_BASE === ""
        ? `/api/households/${session.household_id}/stats`
        : `/households/${session.household_id}/stats`;
    api<HouseholdStats>(path)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        // Silent fallback — em-dash placeholders remain.
      });
    return () => {
      cancelled = true;
    };
  }, [session?.household_id]);

  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Inline-rename state for `03 Membre`.
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameSubmitting, setRenameSubmitting] = useState(false);

  // Inline-confirm state for `05 Déconnexion`.
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Push-permission snapshot (same useSyncExternalStore pattern as the
  // prior implementation — `pushRefreshKey` bumps after each user action
  // to force a fresh read of Notification.permission).
  const [pushRefreshKey, setPushRefreshKey] = useState(0);
  const [pushSubmitting, setPushSubmitting] = useState(false);
  const pushSnapshot = useSyncExternalStore(
    () => () => {},
    () => `${readPushState()}::${pushRefreshKey}`,
    () => "unsupported::0",
  );
  const pushState = pushSnapshot.split("::")[0] as PushState;

  // Foyer (invite-code copy) inline-expanded state for `02 Foyer`.
  const [foyerOpen, setFoyerOpen] = useState(false);

  const onActivatePush = async () => {
    if (pushSubmitting) return;
    setPushSubmitting(true);
    try {
      const res = await registerPushSubscription();
      if (res.ok) {
        toast.success(t("notifications.activated_toast"));
      } else if (res.reason === "denied") {
        toast(t("notifications.status_denied_explainer"));
      } else {
        toast.error(t("notifications.activate_failed_toast"));
      }
      setPushRefreshKey((k) => k + 1);
    } finally {
      setPushSubmitting(false);
    }
  };

  const onDeactivatePush = async () => {
    if (pushSubmitting) return;
    setPushSubmitting(true);
    try {
      const did = await unsubscribePush();
      if (did) toast.success(t("notifications.deactivated_toast"));
      setPushRefreshKey((k) => k + 1);
    } catch {
      toast.error(t("notifications.activate_failed_toast"));
    } finally {
      setPushSubmitting(false);
    }
  };

  const onDisconnect = async () => {
    if (disconnecting) return;
    setDisconnecting(true);
    try {
      const sessionPath =
        API_BASE === "" ? "/api/auth/session" : "/auth/session";
      await fetch(`${API_BASE}${sessionPath}`, {
        method: "DELETE",
        credentials: "include",
      });
      window.location.href = "/onboarding/welcome";
    } catch {
      toast.error(t("disconnect.error"));
      setDisconnecting(false);
      setConfirmingDisconnect(false);
    }
  };

  if (status === "loading") {
    return (
      <section className="flex flex-col flex-1 px-(--spacing-page-x) pt-6">
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
      </section>
    );
  }

  if (status !== "authenticated" || !session) {
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
    if (trimmed.length === 0) return;
    if (trimmed === session.me.name) {
      onCancelRename();
      return;
    }
    setRenameSubmitting(true);
    try {
      await renameMe(trimmed);
      toast.success(t("member.rename_success_toast"));
      await refresh();
      setRenaming(false);
      setRenameValue("");
    } catch (err) {
      const s = statusOf(err);
      if (s === 409) {
        toast.error(t("member.rename_409_toast"));
      } else {
        toast.error(t("member.rename_error_toast"));
      }
    } finally {
      setRenameSubmitting(false);
    }
  };

  const onExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const householdId = session.household_id;
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
    } catch {
      toast.error(t("export_error"));
    } finally {
      setExporting(false);
    }
  };

  const dash = t("stats.loading_dash");
  const recipesDisplay = stats ? stats.recipes_count.toString() : dash;
  const logsDisplay = stats ? stats.cooking_logs_count.toString() : dash;
  const votesDisplay = stats ? stats.votes_count.toString() : dash;

  // Identity line: `maison · CODE · depuis YYYY.MM`.
  const identityLine = t("identity_format", {
    invite_code: session.invite_code,
    date: identityDate || "—",
  });

  const notificationsMeta =
    pushState === "granted"
      ? t("rows.notifications_on_meta")
      : t("rows.notifications_off_meta");

  return (
    <section className="flex flex-col flex-1 bg-background">
      <div className="flex flex-col px-(--spacing-page-x) pt-8 pb-(--spacing-bottom-safe)">
        {/* Hero word + identity line. */}
        <h1 className="text-3xl font-medium tracking-tight">{t("hero")}</h1>
        <p className="mt-2 text-caption text-muted-foreground tabular-nums">
          {identityLine}
        </p>

        {/* Partner block — `me` + partners as a row of MemberDot + name pairs. */}
        <div className="mt-6 flex flex-col gap-3">
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
              <span className="text-base font-medium">{session.me.name}</span>
            )}
          </div>
          {partners.map((partner) => (
            <div key={partner.id} className="flex items-center gap-3">
              <MemberDot colorHex={partner.color_hex} />
              <span className="text-base font-medium">{partner.name}</span>
            </div>
          ))}
        </div>

        {/* Stats block — three numeric counts, hairline column layout. */}
        <div className="mt-8 grid grid-cols-3 gap-4 border-y border-border py-6">
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-medium tabular-nums">
              {recipesDisplay}
            </span>
            <span className="text-caption text-muted-foreground">
              {t("stats.recipes_label")}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-medium tabular-nums">
              {logsDisplay}
            </span>
            <span className="text-caption text-muted-foreground">
              {t("stats.cooking_logs_label")}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-medium tabular-nums">
              {votesDisplay}
            </span>
            <span className="text-caption text-muted-foreground">
              {t("stats.votes_label")}
            </span>
          </div>
        </div>

        {/* 5 numbered hairline rows. */}
        <div className="mt-2 flex flex-col">
          {/* 01 Notifications — tap toggles push permission. */}
          <NumberedRow
            index="01"
            label={t("rows.notifications")}
            meta={
              <span className="inline-flex items-center gap-1">
                <Bell size={12} className="text-muted-foreground" aria-hidden />
                {notificationsMeta}
              </span>
            }
            onClick={() => {
              if (pushSubmitting) return;
              if (pushState === "granted") void onDeactivatePush();
              else if (pushState === "default") void onActivatePush();
              else if (pushState === "denied")
                toast(t("notifications.status_denied_explainer"));
            }}
          />

          {/* 02 Foyer — tap opens inline invite-code copy affordance. */}
          <NumberedRow
            index="02"
            label={t("rows.foyer")}
            meta={session.household_name || "maison"}
            onClick={() => setFoyerOpen((open) => !open)}
          />
          {foyerOpen ? (
            <div className="flex items-center gap-3 pb-4 -mt-1">
              <span
                className="text-2xl tracking-widest text-primary tabular-nums font-mono"
                aria-label={t("invite_code_aria")}
              >
                {session.invite_code}
              </span>
              <Button
                variant="outline"
                className="h-10"
                onClick={onCopy}
                disabled={copied}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" aria-hidden />
                    {t("invite_code_copied")}
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" aria-hidden />
                    {t("invite_code_copy_cta")}
                  </>
                )}
              </Button>
            </div>
          ) : null}

          {/* 03 Membre — tap opens inline rename. */}
          <NumberedRow
            index="03"
            label={t("rows.membre")}
            meta={session.me.name}
            onClick={onStartRename}
            ariaLabel={t("member.rename_aria")}
          />
          {renaming ? null : null}

          {/* 04 Exporter les données — tap triggers JSON export. */}
          <NumberedRow
            index="04"
            label={t("rows.export")}
            meta={exporting ? <Download size={12} aria-hidden /> : undefined}
            onClick={onExport}
          />

          {/* 05 Déconnexion — tap reveals inline confirmation. */}
          <NumberedRow
            index="05"
            label={t("rows.logout")}
            meta={<LogOut size={12} aria-hidden />}
            onClick={() => setConfirmingDisconnect(true)}
          />
          {confirmingDisconnect ? (
            <div className="flex flex-col gap-2 py-4 -mt-1">
              <p className="text-sm font-medium text-foreground">
                {t("disconnect.confirm_question")}
              </p>
              <div className="flex gap-2">
                <Button
                  className="h-10 flex-1"
                  variant="destructive"
                  onClick={onDisconnect}
                  disabled={disconnecting}
                  aria-busy={disconnecting}
                >
                  {t("disconnect.confirm_cta")}
                </Button>
                <Button
                  className="h-10 flex-1"
                  variant="ghost"
                  onClick={() => setConfirmingDisconnect(false)}
                  disabled={disconnecting}
                >
                  {t("disconnect.cancel")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-12">
          <VersionFooter />
        </div>
      </div>
    </section>
  );
}
