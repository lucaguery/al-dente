"use client";

// Mounts a singleton WebSocket connection at the layout root and exposes
// it via React Context. UI-SPEC §"Loading states > Realtime reconnect"
// pins the user-facing rule: silent self-healing for ≤30s, then a single
// destructive Sonner toast surfaces if the WS is still closed.
//
// Phase 01.1: WS is opened only when useSession() reports "authenticated".
// No token parameter needed — the aldente_auth cookie is attached by the
// browser on the same-origin WS upgrade request automatically (D-05).
//
// Module-level singleton + useSyncExternalStore keeps the connection
// stable across re-renders and dodges the React-19 set-state-in-effect
// lint rule.

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  createRealtimeClient,
  type RealtimeClient,
  type RealtimeStatus,
} from "@/lib/ws";
import { useSession } from "@/components/SessionProvider";

// --- Singleton store ---------------------------------------------------------

let clientSingleton: RealtimeClient | null = null;
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

function getSnapshot(): RealtimeClient | null {
  return clientSingleton;
}

function getServerSnapshot(): RealtimeClient | null {
  return null;
}

function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

/**
 * Open (or reuse) the singleton WebSocket.
 * Cookie-auth era: no token parameter — the aldente_auth cookie is sent
 * automatically on the same-origin WS upgrade.
 */
function ensureOpen(): RealtimeClient {
  if (clientSingleton) return clientSingleton;
  clientSingleton = createRealtimeClient();
  notify();
  return clientSingleton;
}

// --- React surface -----------------------------------------------------------

const RealtimeContext = createContext<RealtimeClient | null>(null);

// Threshold (ms) before the "Connexion temporairement perdue" toast surfaces
// per UI-SPEC §"Loading states > Realtime reconnect".
const RECONNECT_TOAST_THRESHOLD_MS = 30_000;

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("realtime");
  const { status } = useSession();

  // useSyncExternalStore returns the live singleton (or null on the
  // server / before first mount) without us ever calling setState inside
  // an effect.
  const client = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Open the WS lazily once the session is authenticated. Re-runs whenever
  // session status changes (e.g. after onboarding refresh()).
  useEffect(() => {
    if (status !== "authenticated") return;
    try {
      ensureOpen();
    } catch (err) {
      // NEXT_PUBLIC_WS_BASE missing — log loudly so Vercel deploys notice.
      console.error("RealtimeProvider: ensureOpen threw", err);
    }
  }, [status]);

  // Reconnect-toast bookkeeping: silent ≤30s, destructive Sonner after.
  // First instant the connection became "closed" (or null if currently open).
  const lostSinceRef = useRef<number | null>(null);
  // Sonner toast id while the destructive toast is up; null when none shown.
  const toastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (!client) return;

    const dismissReconnectToast = () => {
      if (toastIdRef.current != null) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    };
    const showReconnectToastIfDue = () => {
      if (
        lostSinceRef.current != null &&
        toastIdRef.current == null &&
        Date.now() - lostSinceRef.current >= RECONNECT_TOAST_THRESHOLD_MS
      ) {
        toastIdRef.current = toast.error(t("reconnect_lost"), {
          duration: Infinity,
        });
      }
    };

    const offStatus = client.onStatus((status: RealtimeStatus) => {
      if (status === "open") {
        lostSinceRef.current = null;
        dismissReconnectToast();
      } else if (status === "closed") {
        if (lostSinceRef.current == null) {
          lostSinceRef.current = Date.now();
        }
        showReconnectToastIfDue();
      }
    });

    // Poll the threshold once per second so we surface the toast even if
    // partysocket doesn't fire another status event during the closed
    // interval (it only emits "close" on transition, not while waiting).
    const interval = setInterval(showReconnectToastIfDue, 1000);

    return () => {
      clearInterval(interval);
      offStatus();
      dismissReconnectToast();
    };
  }, [client, t]);

  return (
    <RealtimeContext.Provider value={client}>
      {children}
    </RealtimeContext.Provider>
  );
}

/** Returns the singleton RealtimeClient, or null while connecting / unauth'd. */
export function useRealtime(): RealtimeClient | null {
  return useContext(RealtimeContext);
}
