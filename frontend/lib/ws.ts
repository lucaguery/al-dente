"use client";

// Reconnecting WebSocket client for the household-scoped /ws spine
// (01-05 realtime backend). One frame from the backend is shaped
// {type: string, payload: object} per the wire-frame contract documented
// in backend/app/services/realtime.py.
//
// Reconnect cadence is locked by 01-CONTEXT.md "Claude's Discretion":
//   exponential 250ms → 500 → 1000 → 2000 → 5000 (cap 5s, factor=2),
//   maxRetries = Infinity. The exact numerals 250 / 5000 / Infinity MUST
//   appear literally in the constructor call so the verify-grep matches.
//
// Auth: token is shipped via the `?token=<auth_token>` query string. On
// close code 1008 (RFC 6455 policy violation = bad/missing token per the
// 01-05 server contract) we wipe localStorage and route the user back to
// /onboarding/welcome — there's no point retrying with a dead token.
//
// // TODO(productize): the auth_token leaks into Vercel/Railway access
// logs via the query string (T-01-07-03). When Supabase Auth replaces
// invite-code (V2-AUTH-01), switch to the `Sec-WebSocket-Protocol` header.

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

export function createRealtimeClient(token: string): RealtimeClient {
  if (!WS_BASE) throw new Error("NEXT_PUBLIC_WS_BASE not set");

  // partysocket v1.1.x re-exports ReconnectingWebSocket as the named
  // export `WebSocket` (index.d.ts line 64). It accepts a full
  // ws://|wss:// URL string and the four reconnect options below.
  // Verified against frontend/node_modules/partysocket/ws-Cg2f-sDL.d.ts
  // (Options type, lines 54-66) at execution time.
  //
  // NEXT_PUBLIC_WS_BASE is the host (e.g. `wss://api.example.com`),
  // mirroring the NEXT_PUBLIC_API_BASE convention in lib/api.ts. The
  // /ws path lives here so the env var stays a single source of truth
  // for the host.
  const trimmed = WS_BASE.replace(/\/+$/, "");
  const url = `${trimmed}/ws?token=${encodeURIComponent(token)}`;
  const socket = new ReconnectingWebSocket(url, [], {
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
    // 1008 = policy violation = bad/missing token (01-05 server contract).
    // Don't keep retrying with a dead token. Wipe localStorage and route
    // back to onboarding — same auth-wipe flow used by lib/api.ts on 401.
    const code = ev.code;
    if (code === 1008) {
      socket.close();
      try {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("auth_token");
          window.localStorage.removeItem("household_id");
          window.localStorage.removeItem("member_id");
          window.location.href = "/onboarding/welcome";
        }
      } catch {
        // localStorage can throw in private-mode Safari; the redirect is the
        // critical bit and `window.location.href` does not depend on it.
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
