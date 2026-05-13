"use client";

// Phase 27 CAPTURE-01 — user bubble renderer (text / voice / photo / url).
//
// Pending variant (capture mode): adds the X dismiss button (20px circle,
// top-right -8px offset) per UI-SPEC §"Pre-save pending bubble".
// Bubble shell shape per UI-SPEC §"User bubble (text kind)":
// align-self: flex-end; max-width: 78%; bg-primary;
// border-radius: 18px 18px 4px 18px (bottom-right corner cut = user sender);
// padding: 8px 12px; font-size: 14px.

import type React from "react";
import { useTranslations } from "next-intl";
import { Link2, Play, Check, X } from "lucide-react";

import type { PendingBubble, PersistedTurn } from "./types";

type BubbleProps =
  | { variant: "pending"; bubble: PendingBubble; onDismiss: (id: string) => void }
  | { variant: "persisted"; turn: PersistedTurn; resolvedPhotoUrl?: string | null };

// Shared Tailwind class constants for user bubble shells
const USER_BUBBLE_BASE = "self-end max-w-[78%] bg-primary text-primary-foreground shadow-card";
const USER_BUBBLE_RADIUS = "rounded-[18px_18px_4px_18px]";

// Decorative waveform bar heights for voice bubbles
const WAVEFORM_HEIGHTS = [8, 12, 16, 10, 14, 16, 12, 8, 14, 10, 12, 8];

export function Bubble(props: BubbleProps): React.JSX.Element | null {
  const t = useTranslations("recipes.thread");

  // pending variant: narrow on bubble.kind
  if (props.variant === "pending") {
    const { bubble, onDismiss } = props;

    // Defensive: system turn kinds are not emitted as pending bubbles
    if (
      bubble.kind === "text" ||
      bubble.kind === "voice" ||
      bubble.kind === "photo" ||
      bubble.kind === "url"
    ) {
      return (
        <PendingBubbleShell
          bubble={bubble}
          onDismiss={onDismiss}
          dismissLabel={t("bubble_dismiss_aria")}
        />
      );
    }
    return null;
  }

  // persisted variant: narrow on turn.kind
  const { turn } = props;

  // System kinds → handled by SystemBubble
  if (
    turn.kind === "summary" ||
    turn.kind === "question" ||
    turn.kind === "advisory" ||
    turn.kind === "proposal_accepted" ||
    turn.kind === "proposal_dismissed"
  ) {
    return null;
  }

  if (turn.kind === "text") {
    const text = (turn.payload.text as string) ?? "";
    return (
      <div className={`${USER_BUBBLE_BASE} ${USER_BUBBLE_RADIUS} px-3 py-2`}>
        <span className="whitespace-pre-wrap text-[14px] leading-[1.45]">{text}</span>
      </div>
    );
  }

  if (turn.kind === "voice") {
    const transcript = (turn.payload.transcript as string) ?? "";
    return (
      <div className={`${USER_BUBBLE_BASE} ${USER_BUBBLE_RADIUS} px-3 py-2 flex flex-col gap-2 min-w-[180px]`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            aria-hidden
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,255,255,0.25)", color: "white" }}
            tabIndex={-1}
          >
            <Play size={10} fill="currentColor" aria-hidden />
          </button>
          <div className="flex-1 flex gap-1 items-center h-5">
            {WAVEFORM_HEIGHTS.map((h, i) => (
              <span
                key={i}
                aria-hidden
                style={{ width: "2px", height: `${h}px`, background: "rgba(255,255,255,0.85)", display: "inline-block", borderRadius: "1px" }}
              />
            ))}
          </div>
        </div>
        {transcript ? (
          <span className="text-[12px] italic opacity-80 leading-[1.4] whitespace-pre-wrap">{transcript}</span>
        ) : null}
      </div>
    );
  }

  if (turn.kind === "photo") {
    const src = props.resolvedPhotoUrl;
    return (
      <div className={`self-end max-w-[78%] ${USER_BUBBLE_RADIUS} overflow-hidden shadow-card`} style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "4px" }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL; next/Image with custom loader is overkill for dynamic signed URLs
          <img src={src} alt="" className="w-full aspect-[4/3] rounded-[15px] object-cover" />
        ) : (
          <div className="aspect-[4/3] w-full rounded-[15px] bg-muted" aria-hidden />
        )}
      </div>
    );
  }

  if (turn.kind === "url") {
    const rawUrl = (turn.payload.url as string) ?? "";
    let host = rawUrl;
    try { host = new URL(rawUrl).host; } catch { /* fallback to raw URL */ }
    return (
      <div className={`${USER_BUBBLE_BASE} ${USER_BUBBLE_RADIUS} px-3 py-2`}>
        <div className="flex items-center gap-1">
          <Link2 size={12} aria-hidden style={{ opacity: 0.75 }} />
          <span className="font-semibold text-[13px] break-all">{host}</span>
        </div>
      </div>
    );
  }

  // answer kind (UI-SPEC §"User answer bubble") — visual only Phase 27
  if (turn.kind === "answer") {
    const value = String(turn.payload.value ?? "");
    return (
      <div className="self-end inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-[14px] px-3 py-1 text-[13px] font-semibold">
        <Check size={12} aria-hidden />
        {value}
      </div>
    );
  }

  return null;
}

// ─── Pending bubble shell (wrapper with X dismiss button) ─────────────────────

function PendingBubbleShell({
  bubble,
  onDismiss,
  dismissLabel,
}: {
  bubble: PendingBubble;
  onDismiss: (id: string) => void;
  dismissLabel: string;
}) {
  return (
    <div className="relative overflow-visible">
      <PendingBubbleContent bubble={bubble} />
      <DismissButton id={bubble.id} onDismiss={onDismiss} label={dismissLabel} />
    </div>
  );
}

function PendingBubbleContent({ bubble }: { bubble: PendingBubble }) {
  if (bubble.kind === "text") {
    return (
      <div className={`${USER_BUBBLE_BASE} ${USER_BUBBLE_RADIUS} px-3 py-2`}>
        <span className="whitespace-pre-wrap text-[14px] leading-[1.45]">{bubble.text}</span>
      </div>
    );
  }

  if (bubble.kind === "voice") {
    return (
      <div className={`${USER_BUBBLE_BASE} ${USER_BUBBLE_RADIUS} px-3 py-2 flex flex-col gap-2 min-w-[180px]`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            aria-hidden
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,255,255,0.25)", color: "white" }}
            tabIndex={-1}
          >
            <Play size={10} fill="currentColor" aria-hidden />
          </button>
          <div className="flex-1 flex gap-1 items-center h-5">
            {WAVEFORM_HEIGHTS.map((h, i) => (
              <span
                key={i}
                aria-hidden
                style={{ width: "2px", height: `${h}px`, background: "rgba(255,255,255,0.85)", display: "inline-block", borderRadius: "1px" }}
              />
            ))}
          </div>
        </div>
        {bubble.transcript ? (
          <span className="text-[12px] italic opacity-80 leading-[1.4] whitespace-pre-wrap">{bubble.transcript}</span>
        ) : null}
      </div>
    );
  }

  if (bubble.kind === "photo") {
    return (
      <div className={`self-end max-w-[78%] ${USER_BUBBLE_RADIUS} overflow-hidden shadow-card`} style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "4px" }}>
        {bubble.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL; next/Image with custom loader is overkill for blob URLs
          <img src={bubble.previewUrl} alt="" className="w-full aspect-[4/3] rounded-[15px] object-cover" />
        ) : (
          <div className="aspect-[4/3] w-full rounded-[15px] bg-muted" aria-hidden />
        )}
      </div>
    );
  }

  if (bubble.kind === "url") {
    let host = bubble.url;
    try { host = new URL(bubble.url).host; } catch { /* fallback */ }
    return (
      <div className={`${USER_BUBBLE_BASE} ${USER_BUBBLE_RADIUS} px-3 py-2`}>
        <div className="flex items-center gap-1">
          <Link2 size={12} aria-hidden style={{ opacity: 0.75 }} />
          <span className="font-semibold text-[13px] break-all">{host}</span>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Internal: dismiss button (X) for pending bubbles ────────────────────────

function DismissButton({
  id,
  onDismiss,
  label,
}: {
  id: string;
  onDismiss: (id: string) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onDismiss(id)}
      className="absolute flex items-center justify-center"
      style={{
        top: "-8px",
        right: "-8px",
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        background: "var(--foreground)",
        color: "var(--background)",
        opacity: 0.7,
        border: "none",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <X size={10} strokeWidth={2.5} aria-hidden />
    </button>
  );
}
