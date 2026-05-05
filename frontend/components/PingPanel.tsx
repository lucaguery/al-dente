"use client";

// TODO(productize): D-01 — entire file deleted by plan 01-11 once the
// W1 round-trip gate passes on both phones. Plan 01-11 also removes the
// PingPanel mount in app/page.tsx and the ping.* i18n keys in fr.json.
//
// This is the W1 dogfood-gate UI: tap "Envoyer un ping" → POST /pings →
// server broadcasts ping.created → both phones see the new row within
// ~500ms. Reuses the recipe-list-row visual contract from UI-SPEC §6 so
// the gate test exercises something representative.

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useRealtime } from "@/components/RealtimeProvider";

type Ping = {
  id: string;
  household_id: string;
  sent_by_member_id: string;
  note: string | null;
  created_at: string;
};

type Member = {
  id: string;
  name: string;
  color_hex: string;
  joined_at: string;
};

type HouseholdMe = {
  id: string;
  name: string;
  invite_code: string;
  members: Member[];
};

const MAX_PINGS = 50;

function dedupePrepend(prev: Ping[], next: Ping): Ping[] {
  if (prev.some((p) => p.id === next.id)) return prev;
  return [next, ...prev].slice(0, MAX_PINGS);
}

export function PingPanel({ selfMemberId }: { selfMemberId: string | null }) {
  const t = useTranslations("ping");
  const tErr = useTranslations("onboarding.errors");
  const [pings, setPings] = useState<Ping[]>([]);
  const [sending, setSending] = useState(false);
  const [memberColors, setMemberColors] = useState<Record<string, string>>({});
  const realtime = useRealtime();

  // Initial load: most-recent pings + member colour map.
  useEffect(() => {
    let alive = true;
    api<Ping[]>("/pings")
      .then((rows) => {
        if (alive) setPings(rows);
      })
      .catch(() => {
        if (alive) toast.error(tErr("network"));
      });
    api<HouseholdMe>("/households/me")
      .then((h) => {
        if (!alive) return;
        setMemberColors(
          Object.fromEntries(h.members.map((m) => [m.id, m.color_hex])),
        );
      })
      .catch(() => {
        // Non-fatal — pings still render with the fallback grey dot.
      });
    return () => {
      alive = false;
    };
  }, [tErr]);

  // Subscribe to realtime ping.created broadcasts. The onEvent return
  // value is an unsubscribe fn — wire it as the effect's cleanup.
  useEffect(() => {
    if (!realtime) return;
    return realtime.onEvent<Ping>("ping.created", (payload) => {
      setPings((prev) => dedupePrepend(prev, payload));
    });
  }, [realtime]);

  async function send() {
    if (sending) return;
    setSending(true);
    try {
      const created = await api<Ping>("/pings", {
        method: "POST",
        body: JSON.stringify({ note: new Date().toISOString().slice(11, 19) }),
      });
      setPings((prev) => dedupePrepend(prev, created));
    } catch {
      toast.error(tErr("network"));
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="mx-6 mt-4 p-4 gap-4 bg-surface-muted border border-border">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{t("panel_title")}</h2>
        <p className="text-sm text-foreground-muted">{t("panel_body")}</p>
      </div>
      <Button
        className="h-11 w-full"
        onClick={send}
        disabled={sending}
        aria-busy={sending}
      >
        {sending ? (
          <>
            <Loader2 className="animate-spin h-4 w-4" />
            {t("sending")}
          </>
        ) : (
          t("send_cta")
        )}
      </Button>
      <ul className="flex flex-col gap-2">
        {pings.length === 0 ? (
          <li className="text-sm text-foreground-muted">{t("empty")}</li>
        ) : (
          pings.map((p) => {
            const color = memberColors[p.sent_by_member_id] ?? "#A1A1AA";
            const fromSelf =
              selfMemberId !== null && p.sent_by_member_id === selfMemberId;
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border"
              >
                <span
                  aria-hidden
                  className="rounded-full h-3 w-3 flex-shrink-0"
                  style={{ background: color }}
                />
                <span className="text-sm text-foreground">
                  {p.note ?? "ping"}
                </span>
                <span className="ml-auto text-xs text-foreground-muted">
                  {fromSelf
                    ? t("received_from_self")
                    : t("received_from_partner")}
                </span>
              </li>
            );
          })
        )}
      </ul>
    </Card>
  );
}
