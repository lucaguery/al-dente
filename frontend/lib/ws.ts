"use client";

// Reconnecting WebSocket client for the household-scoped /ws spine
// (01.1 cookie-auth-and-recovery). Auth is now the same-origin
// `aldente_auth` HttpOnly cookie — the browser attaches it to the WS
// upgrade request automatically, so this module no longer takes a token
// parameter or reads from localStorage.
//
// Reconnect cadence is locked by 01-CONTEXT.md "Claude's Discretion":
//   exponential 250ms → 500 → 1000 → 2000 → 5000 (cap 5s, factor=2),
//   maxRetries = Infinity. The exact numerals 250 / 5000 / Infinity MUST
//   appear literally in the constructor call so the verify-grep matches.
//
// On close code 1008 (RFC 6455 policy violation = bad/missing token per
// the 01.1-01 server contract) we DELETE /api/auth/session to clear
// the cookie server-side, wipe legacy localStorage, and redirect to
// /onboarding/welcome.

import { WebSocket as ReconnectingWebSocket } from "partysocket";

/** One frame from the backend; locked in 01-05-SUMMARY.md. */
export type RealtimeEvent<T = unknown> = { type: string; payload: T };

export type RealtimeStatus = "connecting" | "open" | "closed";

export type RealtimeClient = {
  /** Subscribe to a `{type}` event. Returns an unsubscribe fn. */
  onEvent: <T = unknown>(
    type: string,
    handler: (payload: T) => void,
  ) => () => void;
  /** Subscribe to connection-status transitions. Returns an unsubscribe fn. */
  onStatus: (handler: (status: RealtimeStatus) => void) => () => void;
  /** Tear down — closes the socket and removes all listeners. */
  close: () => void;
};

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE;

const LEGACY_KEYS = ["auth_token", "household_id", "member_id"] as const;

function buildWsUrl(): string {
  // Prefer explicit override (local dev pointing direct at Railway).
  if (WS_BASE && WS_BASE.length > 0) {
    return `${WS_BASE.replace(/\/+$/, "")}/ws`;
  }
  // Same-origin: derive ws(s):// from current page origin.
  if (typeof window === "undefined") {
    throw new Error("createRealtimeClient must run in the browser");
  }
  const origin = window.location.origin;
  const wsOrigin = origin.replace(/^http/, "ws"); // http→ws, https→wss
  return `${wsOrigin}/ws`;
}

/**
 * Resolve a direct wss://railway…/ws?token= URL, bypassing the Vercel proxy.
 *
 * Vercel serverless functions have an execution-time limit; long-lived WS
 * connections proxied through next.config rewrites get killed on timeout and
 * partysocket can't reconnect because Vercel won't re-establish the proxy.
 * Connecting directly to Railway avoids that entirely.
 *
 * Returns null on any failure — caller falls back to the same-origin rewrite.
 */
export async function buildDirectWsUrl(): Promise<string | null> {
  try {
    const [cfgRes, tokRes] = await Promise.all([
      fetch("/ws-config"),
      fetch("/api/auth/ws-token", { credentials: "include" }),
    ]);
    if (!cfgRes.ok || !tokRes.ok) return null;
    const { wsBase } = (await cfgRes.json()) as { wsBase: string | null };
    const { token } = (await tokRes.json()) as { token: string };
    if (!wsBase || !token) return null;
    return `${wsBase}/ws?token=${encodeURIComponent(token)}`;
  } catch {
    return null;
  }
}

/**
 * Open a household-scoped WebSocket.
 *
 * Pass a pre-built URL (e.g. from buildDirectWsUrl) to connect directly to
 * Railway.  Omit to fall back to the same-origin Vercel rewrite (cookie auth).
 */
export function createRealtimeClient(url?: string): RealtimeClient {
  const resolvedUrl = url ?? buildWsUrl();
  const socket = new ReconnectingWebSocket(resolvedUrl, [], {
    minReconnectionDelay: 250,
    maxReconnectionDelay: 5000,
    reconnectionDelayGrowFactor: 2,
    maxRetries: Infinity,
  });

  const handlers = new Map<string, Set<(payload: unknown) => void>>();
  const statusHandlers = new Set<(status: RealtimeStatus) => void>();

  const emitStatus = (status: RealtimeStatus) => {
    statusHandlers.forEach((h) => {
      try {
        h(status);
      } catch (err) {
        console.warn("ws: status handler threw", err);
      }
    });
  };

  socket.addEventListener("open", () => emitStatus("open"));
  socket.addEventListener("close", (ev: { code?: number }) => {
    emitStatus("closed");
    if (ev.code === 1008) {
      socket.close();
      try {
        if (typeof window !== "undefined") {
          // Server-side cookie clear via the same path logic as lib/api.ts.
          // In production (API_BASE=""), /api/auth/session rewrites to Railway.
          // In local dev (WS_BASE set), skip the /api/ prefix.
          const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";
          const sessionPath =
            apiBase === "" ? "/api/auth/session" : "/auth/session";
          void fetch(`${apiBase}${sessionPath}`, {
            method: "DELETE",
            credentials: "include",
          }).catch(() => {});
          for (const k of LEGACY_KEYS) {
            try {
              window.localStorage.removeItem(k);
            } catch {
              /* private-mode Safari */
            }
          }
          window.location.href = "/onboarding/welcome";
        }
      } catch {
        /* redirect is the critical bit */
      }
    }
  });
  socket.addEventListener("message", (ev: { data: unknown }) => {
    const raw = ev.data;
    if (typeof raw !== "string") return;
    try {
      const frame = JSON.parse(raw) as RealtimeEvent;
      const set = handlers.get(frame.type);
      if (!set) return;
      set.forEach((h) => {
        try {
          h(frame.payload);
        } catch (err) {
          console.warn(`ws: handler for ${frame.type} threw`, err);
        }
      });
    } catch (err) {
      console.warn("ws: bad frame", err);
    }
  });

  return {
    onEvent<T>(type: string, handler: (payload: T) => void) {
      let set = handlers.get(type);
      if (!set) {
        set = new Set();
        handlers.set(type, set);
      }
      const wrapped = handler as (payload: unknown) => void;
      set.add(wrapped);
      return () => {
        set?.delete(wrapped);
      };
    },
    onStatus(handler) {
      statusHandlers.add(handler);
      return () => {
        statusHandlers.delete(handler);
      };
    },
    close() {
      handlers.clear();
      statusHandlers.clear();
      socket.close();
    },
  };
}
