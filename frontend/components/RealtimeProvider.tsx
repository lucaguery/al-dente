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
  buildDirectWsUrl,
  createRealtimeClient,
  type RealtimeClient,
  type RealtimeStatus,
} from "@/lib/ws";
import { useSession, SESSION_CHANGED_EVENT } from "@/components/SessionProvider";
import type { Recipe } from "@/lib/recipes";

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

// In-flight init promise — prevents double-open on React StrictMode double-invoke.
let initPromise: Promise<RealtimeClient> | null = null;

/**
 * Open (or reuse) the singleton WebSocket.
 *
 * Tries to connect directly to Railway (bypassing Vercel's proxy, which kills
 * long-lived WS connections on function timeout). Falls back to the same-origin
 * Vercel rewrite if the direct-URL fetch fails.
 */
async function ensureOpen(): Promise<RealtimeClient> {
  if (clientSingleton) return clientSingleton;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const directUrl = await buildDirectWsUrl();
    clientSingleton = createRealtimeClient(directUrl ?? undefined);
    notify();
    return clientSingleton;
  })();
  try {
    return await initPromise;
  } finally {
    initPromise = null;
  }
}

// --- React surface -----------------------------------------------------------

const RealtimeContext = createContext<RealtimeClient | null>(null);

// Threshold (ms) before the "Connexion temporairement perdue" toast surfaces
// per UI-SPEC §"Loading states > Realtime reconnect".
const RECONNECT_TOAST_THRESHOLD_MS = 30_000;

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("realtime");
  const tPromotion = useTranslations("recipes.promotion");
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
    ensureOpen().catch((err) => {
      console.error("RealtimeProvider: ensureOpen threw", err);
    });
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

  // CAPTURE-04 / D-08: When the backend's BackgroundTask promotes a draft to
  // structured, every connected client in the household receives a
  // `recipe.promoted` frame. Both phones surface the toast — the user's own
  // phone sees a celebration of "their" capture; the partner's phone sees
  // "your other half added a recipe". Per D-08: NO forced navigation.
  //
  // List refetch is the responsibility of the page that mounted: /inbox and
  // /recipes both subscribe to recipe.created/updated/promoted via their
  // own onEvent handlers (see Plans 04 and 05). This provider's only
  // responsibility is the toast.
  useEffect(() => {
    if (!client) return;
    const off = client.onEvent<Recipe>("recipe.promoted", (payload) => {
      toast.success(
        tPromotion("success_toast", { title: payload.title }),
      );
    });
    return off;
  }, [client, tPromotion]);

  // Phase 3 — vote.created. Re-fire as a window CustomEvent so HomeDecide
  // (and any future Decide-layer consumer) can subscribe with a plain
  // `addEventListener` instead of forcing a wider context refactor for v0.1.
  // Same pattern repeats for shortlist.created and cooking.started below.
  useEffect(() => {
    if (!client) return;
    const off = client.onEvent<Phase3VoteEvent>("vote.created", (payload) => {
      if (typeof window === "undefined") return;
      window.dispatchEvent(
        new CustomEvent(VOTE_CREATED_DOM_EVENT, { detail: payload }),
      );
    });
    return off;
  }, [client]);

  // Phase 3 — shortlist.created (APScheduler daily job OR /regenerate).
  useEffect(() => {
    if (!client) return;
    const off = client.onEvent<Phase3ShortlistCreatedEvent>("shortlist.created", (payload) => {
      if (typeof window === "undefined") return;
      window.dispatchEvent(
        new CustomEvent(SHORTLIST_CREATED_DOM_EVENT, { detail: payload }),
      );
    });
    return off;
  }, [client]);

  // Phase 3 — cooking.started (partner tapped "Je commence à cuisiner").
  useEffect(() => {
    if (!client) return;
    const off = client.onEvent<Phase3CookingStartedEvent>("cooking.started", (payload) => {
      if (typeof window === "undefined") return;
      window.dispatchEvent(
        new CustomEvent(COOKING_STARTED_DOM_EVENT, { detail: payload }),
      );
    });
    return off;
  }, [client]);

  // Phase 4 — cooking.finalized (partner finalized the cooking session).
  useEffect(() => {
    if (!client) return;
    const off = client.onEvent<Phase4CookingFinalizedEvent>("cooking.finalized", (payload) => {
      if (typeof window === "undefined") return;
      window.dispatchEvent(
        new CustomEvent(COOKING_FINALIZED_DOM_EVENT, { detail: payload }),
      );
    });
    return off;
  }, [client]);

  // Phase 18 IDM-02 — member.updated. Bridges to SessionProvider so the
  // partner's phone re-fetches /households/me and re-renders their member
  // name + MemberDot displays within ~200ms of the broadcast. The renamer's
  // own phone already calls useSession().refresh() directly from the
  // settings page; this WS-driven path is the partner-phone path that has
  // no local trigger.
  useEffect(() => {
    if (!client) return;
    const off = client.onEvent<MemberUpdatedEvent>("member.updated", (payload) => {
      if (typeof window === "undefined") return;
      window.dispatchEvent(
        new CustomEvent(MEMBER_UPDATED_DOM_EVENT, { detail: payload }),
      );
      // Load-bearing: SessionProvider listens on this event and re-runs
      // fetchSession(). Without this dispatch the partner's UI wouldn't
      // converge until they navigated or refreshed.
      window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
    });
    return off;
  }, [client]);

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

// ---------------------------------------------------------------------------
// Phase 3 — DOM CustomEvent contracts.
//
// The provider re-fires three WS events as window-level CustomEvents so any
// component on the Home tab can subscribe without us threading another React
// context through the tree. Each payload mirrors the backend's WS frame
// (services/realtime.py); the frontend never invents fields.
// ---------------------------------------------------------------------------

export type Phase3VoteEvent = {
  shortlist_id: string;
  recipe_id: string;
  member_id: string;
  vote: "yes" | "no";
  state: "valide" | "pressenti" | "conteste" | "rejete" | "sans_avis";
};

export type Phase3ShortlistCreatedEvent = {
  shortlist_id: string;
  date: string;
  generation: number;
};

export type Phase3CookingStartedEvent = {
  log_id: string;
  recipe_id: string;
  cooked_by_member_id: string;
};

export const VOTE_CREATED_DOM_EVENT = "aldente:vote.created";
export const SHORTLIST_CREATED_DOM_EVENT = "aldente:shortlist.created";
export const COOKING_STARTED_DOM_EVENT = "aldente:cooking.started";

export type Phase4CookingFinalizedEvent = {
  log_id: string;
  recipe_id: string;
  rating: "loved" | "liked" | "disliked" | null;
};

export const COOKING_FINALIZED_DOM_EVENT = "aldente:cooking.finalized";

// Phase 18 IDM-02 — member.updated event.
//
// Backend broadcasts `member.updated` from PATCH /households/me with payload
// {id, name, color_hex} (per CLAUDE.md invariant #4 — every household-affecting
// mutation broadcasts). The frontend's contract is:
//   1. Re-fire as a window CustomEvent so any future consumer that cares about
//      a specific member id can subscribe directly (not load-bearing for v0.4).
//   2. Dispatch SESSION_CHANGED_EVENT so SessionProvider re-fetches
//      /households/me — this IS the load-bearing path. Both the renaming
//      member's own phone (optimistic update + canonical refresh from the
//      Settings page) and the partner's phone re-render their member name +
//      MemberDot displays through this channel.

export type MemberUpdatedEvent = {
  id: string;
  name: string;
  color_hex: string;
};

export const MEMBER_UPDATED_DOM_EVENT = "aldente:member.updated";
