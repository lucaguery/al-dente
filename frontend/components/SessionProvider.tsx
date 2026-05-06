"use client";

// Phase 01.1 cookie-auth: identity is server-authoritative.
//
// On mount, calls GET /api/households/me with the aldente_auth cookie
// auto-attached by the browser. The response populates the React context;
// downstream consumers (OnboardingGuard, RealtimeProvider, settings page)
// read identity from useSession() instead of localStorage.
//
// Mirrors RealtimeProvider's singleton + useSyncExternalStore pattern so
// the SSR pass renders a stable "loading" snapshot and the client hydrates
// without a mismatch.

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";

export const SESSION_CHANGED_EVENT = "aldente:session-changed";

export type SessionMember = {
  id: string;
  name: string;
  color_hex: string;
};

export type SessionData = {
  household_id: string;
  household_name: string;
  invite_code: string;
  me: SessionMember;
  members: ReadonlyArray<SessionMember>;
};

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export type SessionContextValue = {
  status: SessionStatus;
  session: SessionData | null;
  refresh: () => Promise<void>;
};

// --- Singleton store (mirrors RealtimeProvider pattern) ---------------------

type Snapshot = { status: SessionStatus; session: SessionData | null };

let snapshot: Snapshot = { status: "loading", session: null };
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

function setSnapshot(next: Snapshot) {
  snapshot = next;
  notify();
}

function getSnapshot(): Snapshot {
  return snapshot;
}

function getServerSnapshot(): Snapshot {
  return { status: "loading", session: null };
}

function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

async function fetchSession(): Promise<void> {
  try {
    const data = await api<SessionData>("/api/households/me");
    setSnapshot({ status: "authenticated", session: data });
  } catch (err) {
    // api() handles 401 by redirecting to /onboarding/welcome and then
    // throwing. Any error here (401 or network) means unauthenticated.
    if (err instanceof Error && err.message === "unauthorized") {
      setSnapshot({ status: "unauthenticated", session: null });
      return;
    }
    setSnapshot({ status: "unauthenticated", session: null });
  }
}

// --- React surface ----------------------------------------------------------

const SessionContext = createContext<SessionContextValue>({
  status: "loading",
  session: null,
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    void fetchSession();
    if (typeof window === "undefined") return;
    const onChanged = () => {
      void fetchSession();
    };
    window.addEventListener(SESSION_CHANGED_EVENT, onChanged);
    return () => {
      window.removeEventListener(SESSION_CHANGED_EVENT, onChanged);
    };
  }, []);

  const value: SessionContextValue = {
    status: snap.status,
    session: snap.session,
    refresh: fetchSession,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}
