"use client";

// Mounts a singleton WebSocket connection at the layout root and exposes
// it via React Context. UI-SPEC §"Loading states > Realtime reconnect"
// pins the user-facing rule: silent self-healing for ≤30s, then a single
// destructive Sonner toast surfaces if the WS is still closed.
//
// The WS is opened lazily on first mount when getAuthToken() returns
// non-null. Onboarding routes also rely on this provider being at the
// layout root — they harmlessly no-op until the user has a token.
//
// Module-level singleton + useSyncExternalStore keeps the connection
// stable across re-renders and dodges the React-19 set-state-in-effect
// lint rule (same pattern OnboardingGuard uses for localStorage reads).

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
import { getAuthToken } from "@/lib/auth";

// --- Singleton store ---------------------------------------------------------

let clientSingleton: RealtimeClient | null = null;
let openedFor: string | null = null; // token used to open clientSingleton
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
 * Open (or reuse) the singleton WebSocket bound to the given token.
 * If a different token was previously bound (e.g. user re-onboarded), the
 * old client is closed first.
 */
function ensureOpen(token: string): RealtimeClient {
  if (clientSingleton && openedFor === token) return clientSingleton;
  if (clientSingleton) {
    clientSingleton.close();
    clientSingleton = null;
    openedFor = null;
  }
  clientSingleton = createRealtimeClient(token);
  openedFor = token;
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
  // useSyncExternalStore returns the live singleton (or null on the
  // server / before first mount) without us ever calling setState inside
  // an effect.
  const client = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Open the WS lazily once we're on the client and have a token. Running
  // this in an effect (instead of during render) keeps the SSR pass pure
  // and avoids hydration mismatches.
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    try {
      ensureOpen(token);
    } catch (err) {
      // NEXT_PUBLIC_WS_BASE missing — log loudly so Vercel deploys notice.
      console.error("RealtimeProvider: ensureOpen threw", err);
    }
  }, []);

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
