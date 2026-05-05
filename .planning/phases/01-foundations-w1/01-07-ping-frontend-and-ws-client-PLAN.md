---
phase: 01-foundations-w1
plan: 07
plan_number: 7
slug: ping-frontend-and-ws-client
type: execute
wave: 5
depends_on: [realtime-and-ping-backend, onboarding-frontend]
files_modified:
  - frontend/lib/i18n/fr.json
  - frontend/lib/ws.ts
  - frontend/components/RealtimeProvider.tsx
  - frontend/app/page.tsx
  - frontend/components/PingPanel.tsx
autonomous: false
requirements: [INFRA-05, REALTIME-01, REALTIME-03]
must_haves:
  truths:
    - "After onboarding, both phones connect to wss://<api>/ws?token=<auth_token> and stay connected"
    - "Tapping 'Envoyer un ping' on Phone A causes a new ping row to appear on Phone B's home screen within ~500ms (the W1 dogfood-gate verification)"
    - "Killing the Railway container (or losing network briefly) causes the WS client to reconnect with exponential backoff (250ms → 500 → 1s → 2s → 5s, cap 5s, infinite retries) per CONTEXT.md"
    - "On 401 close (revoked token) the client clears localStorage and routes to /onboarding/welcome"
    - "The reconnect is silent (no banner) for ≤30s; if reconnection takes longer, a single Sonner destructive toast surfaces per UI-SPEC §Loading states"
  artifacts:
    - path: "frontend/lib/ws.ts"
      provides: "createRealtimeClient() returning a partysocket-backed WS with onEvent(type, handler) subscribe API"
    - path: "frontend/components/RealtimeProvider.tsx"
      provides: "Context provider that opens a WS on mount (when authenticated) and exposes useRealtime()"
    - path: "frontend/components/PingPanel.tsx"
      provides: "Two-button + list panel rendered on home (the W1 round-trip gate UI)"
  key_links:
    - from: "frontend/components/RealtimeProvider.tsx"
      to: "frontend/lib/ws.ts"
      via: "createRealtimeClient(getAuthToken()!) on mount"
      pattern: "createRealtimeClient"
    - from: "frontend/components/PingPanel.tsx"
      to: "frontend/components/RealtimeProvider.tsx"
      via: "useRealtime().onEvent('ping.created', ...)"
      pattern: "onEvent.*ping.created"
    - from: "frontend/lib/ws.ts"
      to: "partysocket"
      via: "import PartySocket from 'partysocket'"
      pattern: "partysocket"
---

<objective>
Wire the frontend WebSocket client and the throwaway ping UI on `/` (home). This is the second half of the W1 dogfood gate (the first half — PWA install — was verified at 01-02 Task 3): both phones now round-trip a ping over WebSockets within ~500ms. Reconnect-with-backoff (`partysocket` per CONTEXT.md) protects against Railway free-tier restarts (REALTIME-03). After this plan passes, the `# TODO(productize): D-01` cleanup plan (01-11) deletes the ping code on both ends.

Per CONTEXT.md, the reconnect is **silent and self-healing**; the user sees no "reconnecting" banner unless reconnection takes >30 seconds.

Purpose: INFRA-05 (closes the loop on the W1 first-concrete-action gate), REALTIME-01 (FE side; subscribes to household-scoped channel), REALTIME-03 (FE reconnect-with-backoff via partysocket).
Output: Tap ping on Phone A → Phone B's list updates within 500ms. Kill Railway → both phones silently re-establish within seconds. The ping panel itself disappears in plan 01-11 once Luca confirms the gate.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundations-w1/01-CONTEXT.md
@.planning/phases/01-foundations-w1/01-UI-SPEC.md
@SPEC.md
@CLAUDE.md
@frontend/AGENTS.md
@frontend/lib/api.ts
@frontend/lib/auth.ts
@frontend/lib/onboarding-guard.tsx
@frontend/app/page.tsx
@frontend/lib/i18n/fr.json
</context>

<interfaces>
From 01-05 realtime-and-ping-backend:
- WS endpoint: `wss://<api>/ws?token=<auth_token>` — close code 1008 on missing/invalid token.
- Frame shape: `{type: string, payload: object}`. The ping event is `{type: "ping.created", payload: {id, household_id, sent_by_member_id, note, created_at}}`.
- HTTP: `POST /pings` (Bearer) → 201 with the same shape; `GET /pings` (Bearer) → most-recent-50 list.
- D-01: this entire surface (POST/GET /pings + ws.py + Ping model + pings table) is deleted in 01-11 once Luca approves the gate.

From 01-06 onboarding-frontend:
- `OnboardingGuard` is already wrapping `app/page.tsx` content; the WS client should only mount inside the guard (after `auth_token` is known).
- `getAuthToken()` from `@/lib/auth` returns the localStorage token or null.

From 01-02 frontend-scaffold:
- `partysocket` is already installed (we front-loaded it into 01-02 Task 1 step 1).
- `sonner` is already installed; `<Toaster />` should be in the root layout (verify in 01-02 Task 2 step 2 — if missing, this plan adds it).

CONTEXT.md locked decisions consumed here:
- "Reconnect-with-backoff — Exponential 250ms→500→1s→2s→5s, cap at 5s, infinite retries. Pick `partysocket` OR hand-rolled — your call, but pick ONE and use it consistently." → we pick `partysocket`.
- UI-SPEC §"Realtime indicators": "Silent self-healing. NO connected indicator in v0.1. NO toast on partner-side `ping.created`/`recipe.created`. The list-row-appearance IS the notification."
- UI-SPEC §"Loading states > Realtime reconnect": "If reconnect fails for >30s consecutively a single `destructive` Sonner toast: `Connexion temporairement perdue...`."
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: lib/ws.ts (partysocket wrapper) + RealtimeProvider context + Sonner Toaster mounted in root layout if missing</name>
  <files>frontend/lib/ws.ts, frontend/components/RealtimeProvider.tsx, frontend/lib/i18n/fr.json, frontend/app/layout.tsx</files>
  <read_first>
    - .planning/phases/01-foundations-w1/01-CONTEXT.md §"Claude's Discretion" — reconnect cadence (250→500→1000→2000→5000ms, cap 5s, infinite); WS auth via `?token=` query string
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Realtime indicators" + §"Loading states > Realtime reconnect" (silent until >30s, then one destructive toast)
    - frontend/AGENTS.md (Next.js 16; client-only WS — RealtimeProvider must be a 'use client' component)
    - For partysocket API — `new PartySocket({host, room?, query, ...})`, `socket.addEventListener('open'|'close'|'message')`, reconnect-control properties — query Context7 (`mcp__context7__`) with the installed `partysocket` version. If unavailable, read `frontend/node_modules/partysocket/dist/index.d.ts` for the type surface (esp. ConstructorOptions and the reconnect/backoff fields).
    - For sonner `<Toaster />` placement in App Router root layout, query Context7 or read `frontend/components/ui/sonner.tsx` (the shadcn paste-in already wraps sonner's Toaster).
  </read_first>
  <action>
    1. **Add i18n keys** to `frontend/lib/i18n/fr.json` (extend the existing `onboarding`/`common`/etc. blocks):
       ```json
       {
         "ping": {
           "panel_title": "Test de connexion",
           "panel_body": "Ce panneau disparaît après le test W1.",
           "send_cta": "Envoyer un ping",
           "sending": "Envoi…",
           "empty": "Aucun ping pour le moment.",
           "received_from_partner": "depuis ta partenaire",
           "received_from_self": "envoyé d'ici"
         },
         "realtime": {
           "reconnect_lost": "Connexion temporairement perdue. Les autres modifications apparaîtront dès la reconnexion."
         }
       }
       ```

    2. **Mount `<Toaster />`** in `frontend/app/layout.tsx` if not already present. Inside the body, after the BottomNav mount: `<Toaster richColors position="top-center" />`. (If 01-02 already mounted it, leave alone — verify with `grep`.)

    3. **`frontend/lib/ws.ts`** — partysocket-backed factory with our event subscription API:
       ```ts
       "use client";
       import PartySocket from "partysocket";

       /**
        * One frame from the backend: {type: string, payload: object}.
        * Defined in 01-05-SUMMARY.md.
        */
       export type RealtimeEvent<T = unknown> = { type: string; payload: T };

       export type RealtimeClient = {
         onEvent: <T = unknown>(type: string, handler: (payload: T) => void) => () => void;
         onStatus: (handler: (status: "connecting" | "open" | "closed") => void) => () => void;
         close: () => void;
       };

       const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE; // e.g. wss://<railway>/ws

       export function createRealtimeClient(token: string): RealtimeClient {
         if (!WS_BASE) throw new Error("NEXT_PUBLIC_WS_BASE not set");
         // CONTEXT.md reconnect contract: 250ms → 500 → 1s → 2s → 5s, cap at 5s, infinite retries.
         // Encoded LITERALLY below so the values are auditable and the verify-grep can match them.
         //
         // We use partysocket's `WebSocket` named export (a drop-in `ReconnectingWebSocket`
         // for plain `ws://`/`wss://` URLs, NOT partykit room-style URLs). Verify against
         // `frontend/node_modules/partysocket/dist/index.d.ts` after install — the export
         // is the `WebSocket` class. If a future version renames it, switch to whichever
         // export accepts a full URL string + the four reconnect options below.
         //
         // Required option contract (non-negotiable, all four MUST appear literally):
         //   minReconnectionDelay: 250
         //   maxReconnectionDelay: 5000
         //   reconnectionDelayGrowFactor: 2
         //   maxRetries: Infinity
         const url = `${WS_BASE}?token=${encodeURIComponent(token)}`;
         const socket: WebSocket = new PartySocket.WebSocket(url, [], {
           minReconnectionDelay: 250,
           maxReconnectionDelay: 5000,
           reconnectionDelayGrowFactor: 2,
           maxRetries: Infinity,
         });

         // Implementation note for the executor:
         //   - After `npm install partysocket` (front-loaded by 01-02), inspect
         //     `frontend/node_modules/partysocket/package.json` for the version, then
         //     `frontend/node_modules/partysocket/dist/index.d.ts` to confirm the export
         //     name. Recent partysocket versions expose `PartySocket.WebSocket` (a
         //     ReconnectingWebSocket subclass that takes a full URL); older versions
         //     expose it as the default `ReconnectingWebSocket` named export.
         //   - If the option keys differ in the installed version (e.g. older API used
         //     `minDelay`/`maxDelay`), translate WHILE keeping the same numeric values
         //     literally in the call. The verify-grep checks for `250` and `5000` and
         //     `Infinity` in the source — those numbers MUST appear in the constructor
         //     call, not in a comment.
         //   - If partysocket cannot meet this contract cleanly in any version, fall
         //     back to a hand-rolled ~30-line `ReconnectingWebSocket` class in this
         //     same file — CONTEXT.md explicitly allows it. Lock the choice in 01-07-SUMMARY.md.

         const handlers = new Map<string, Set<(payload: unknown) => void>>();
         const statusHandlers = new Set<(status: "connecting" | "open" | "closed") => void>();

         socket.addEventListener("open", () => statusHandlers.forEach(h => h("open")));
         socket.addEventListener("close", (ev: CloseEvent) => {
           statusHandlers.forEach(h => h("closed"));
           // 1008 = policy violation = bad token. Don't keep retrying with a dead token.
           if (ev.code === 1008) {
             try { localStorage.removeItem("auth_token"); } catch {}
             window.location.href = "/onboarding/welcome";
           }
         });
         socket.addEventListener("message", (ev: MessageEvent<string>) => {
           try {
             const frame = JSON.parse(ev.data) as RealtimeEvent;
             const set = handlers.get(frame.type);
             set?.forEach(h => h(frame.payload));
           } catch (err) {
             console.warn("ws: bad frame", err);
           }
         });

         return {
           onEvent<T>(type: string, handler: (payload: T) => void) {
             let set = handlers.get(type);
             if (!set) handlers.set(type, (set = new Set()));
             set.add(handler as (payload: unknown) => void);
             return () => set!.delete(handler as (payload: unknown) => void);
           },
           onStatus(handler) {
             statusHandlers.add(handler);
             return () => statusHandlers.delete(handler);
           },
           close() {
             handlers.clear();
             statusHandlers.clear();
             socket.close();
           },
         };
       }
       ```
       **Implementation note for the executor:** the executor MUST verify the partysocket export name (`PartySocket.WebSocket` vs `ReconnectingWebSocket`) and option-key names against `frontend/node_modules/partysocket/dist/index.d.ts` immediately after install. The values 250 / 5000 / Infinity above are NON-NEGOTIABLE — those exact numerals must appear in the constructor call so the verify-grep matches them. If the installed partysocket version cannot satisfy the contract cleanly, fall back to a hand-rolled ~30-line `ReconnectingWebSocket` class in `lib/ws.ts` (CONTEXT.md explicitly allows this). Lock the choice in 01-07-SUMMARY.md.

    4. **`frontend/components/RealtimeProvider.tsx`** — Context wrapper:
       ```tsx
       "use client";
       import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
       import { useTranslations } from "next-intl";
       import { toast } from "sonner";
       import { createRealtimeClient, type RealtimeClient } from "@/lib/ws";
       import { getAuthToken } from "@/lib/auth";

       type Status = "connecting" | "open" | "closed";

       const RealtimeContext = createContext<RealtimeClient | null>(null);

       export function RealtimeProvider({ children }: { children: ReactNode }) {
         const [client, setClient] = useState<RealtimeClient | null>(null);
         const t = useTranslations("realtime");
         const lostSinceRef = useRef<number | null>(null);
         const toastIdRef = useRef<string | number | null>(null);

         useEffect(() => {
           const token = getAuthToken();
           if (!token) return;
           const c = createRealtimeClient(token);
           setClient(c);

           const offStatus = c.onStatus((status: Status) => {
             if (status === "open") {
               lostSinceRef.current = null;
               if (toastIdRef.current != null) {
                 toast.dismiss(toastIdRef.current);
                 toastIdRef.current = null;
               }
             } else if (status === "closed") {
               // Per UI-SPEC: silent for ≤30s. Set a timer; if still closed at 30s, surface the toast.
               if (lostSinceRef.current == null) lostSinceRef.current = Date.now();
               const elapsed = Date.now() - lostSinceRef.current;
               if (elapsed >= 30000 && toastIdRef.current == null) {
                 toastIdRef.current = toast(t("reconnect_lost"), { duration: Infinity });
               }
             }
           });

           // Poll once per second for the 30s threshold (avoids missing the elapsed check
           // when no further status events fire while still closed).
           const interval = setInterval(() => {
             if (lostSinceRef.current != null && toastIdRef.current == null
                 && Date.now() - lostSinceRef.current >= 30000) {
               toastIdRef.current = toast(t("reconnect_lost"), { duration: Infinity });
             }
           }, 1000);

           return () => {
             clearInterval(interval);
             offStatus();
             c.close();
           };
         }, [t]);

         return <RealtimeContext.Provider value={client}>{children}</RealtimeContext.Provider>;
       }

       export function useRealtime(): RealtimeClient | null {
         return useContext(RealtimeContext);
       }
       ```

    5. **Edit `frontend/app/layout.tsx`** — wrap `{children}` (inside the `NextIntlClientProvider` already mounted by 01-02) with `<RealtimeProvider>`. Order: NextIntlClientProvider > RealtimeProvider > children. The provider mounts the WS only when `getAuthToken()` is non-null, which is true on every authenticated route (onboarding screens render their own form-side state and don't need the WS — but mounting at the root is still safe because no token = no WS attempt).
  </action>
  <verify>
    <automated>cd frontend && test -f lib/ws.ts && test -f components/RealtimeProvider.tsx && grep -q "createRealtimeClient" lib/ws.ts && grep -q "NEXT_PUBLIC_WS_BASE" lib/ws.ts && grep -q "1008" lib/ws.ts && grep -q "250" lib/ws.ts && grep -q "5000" lib/ws.ts && grep -q "Infinity" lib/ws.ts && ! grep -q " as never" lib/ws.ts && grep -q "RealtimeProvider" app/layout.tsx && grep -q "Toaster" app/layout.tsx && grep -q "reconnect_lost" lib/i18n/fr.json && grep -q "Connexion temporairement perdue" lib/i18n/fr.json && npx tsc --noEmit && npm run build</automated>
  </verify>
  <done>WS client + provider + i18n keys in place; build passes; 1008 → wipe-and-redirect flow is wired; toast suppression for ≤30s implemented.</done>
</task>

<task type="auto">
  <name>Task 2: PingPanel component + mount on home page</name>
  <files>frontend/components/PingPanel.tsx, frontend/app/page.tsx</files>
  <read_first>
    - .planning/phases/01-foundations-w1/01-CONTEXT.md §"Ping test lifecycle" (D-01 — keep this UI minimal; gets deleted in 01-11)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Surface-by-Surface Pinning" §6 (the recipe-list card pattern; reuse the same row shape for ping list to stay visually consistent — `flex gap-4 p-3 bg-background rounded-lg border border-border`)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Realtime indicators" (no toast on partner-side new event; the list-row appearance IS the notification — same rule applies to pings)
    - frontend/components/MemberDot.tsx (use to color-tag pings by member)
    - SPEC.md §"First concrete action: deploy the skeleton + ping test" (the test we're proving; ~500ms target latency)
  </read_first>
  <action>
    1. **`frontend/components/PingPanel.tsx`** — single self-contained component:
       ```tsx
       "use client";
       // TODO(productize): D-01 — entire file deleted by plan 01-11 after the round-trip gate.
       import { useEffect, useState } from "react";
       import { useTranslations } from "next-intl";
       import { Button } from "@/components/ui/button";
       import { Card } from "@/components/ui/card";
       import { Loader2 } from "lucide-react";
       import { toast } from "sonner";
       import { api } from "@/lib/api";
       import { useRealtime } from "@/components/RealtimeProvider";

       type Ping = {
         id: string;
         household_id: string;
         sent_by_member_id: string;
         note: string | null;
         created_at: string;
       };

       export function PingPanel({ selfMemberId }: { selfMemberId: string | null }) {
         const t = useTranslations("ping");
         const tErr = useTranslations("onboarding.errors");
         const [pings, setPings] = useState<Ping[]>([]);
         const [sending, setSending] = useState(false);
         const realtime = useRealtime();
         const [memberColors, setMemberColors] = useState<Record<string, string>>({});

         useEffect(() => {
           // Initial load
           api<Ping[]>("/pings")
             .then(setPings)
             .catch(() => toast.error(tErr("network")));
           // Member colors for visual tag
           api<{members: Array<{id: string; color_hex: string}>}>("/households/me")
             .then(h => setMemberColors(Object.fromEntries(h.members.map(m => [m.id, m.color_hex]))))
             .catch(() => { /* non-fatal — pings will render without color */ });
         }, []);

         useEffect(() => {
           if (!realtime) return;
           const off = realtime.onEvent<Ping>("ping.created", (payload) => {
             // Dedupe by id (in case the HTTP response and WS frame race)
             setPings(prev => prev.some(p => p.id === payload.id) ? prev : [payload, ...prev].slice(0, 50));
           });
           return off;
         }, [realtime]);

         async function send() {
           setSending(true);
           try {
             const created = await api<Ping>("/pings", {
               method: "POST",
               body: JSON.stringify({ note: new Date().toISOString().slice(11, 19) }),
             });
             // Optimistic — also dedupes when the WS frame arrives.
             setPings(prev => prev.some(p => p.id === created.id) ? prev : [created, ...prev].slice(0, 50));
           } catch {
             toast.error(tErr("network"));
           } finally {
             setSending(false);
           }
         }

         return (
           <Card className="mx-6 mt-4 p-4 flex flex-col gap-4 bg-surface-muted border-border">
             <div className="flex flex-col gap-1">
               <h2 className="text-base font-semibold">{t("panel_title")}</h2>
               <p className="text-sm text-foreground-muted">{t("panel_body")}</p>
             </div>
             <Button className="h-11 w-full" onClick={send} disabled={sending}>
               {sending ? (<><Loader2 className="animate-spin h-4 w-4 mr-2" /> {t("sending")}</>) : t("send_cta")}
             </Button>
             <ul className="flex flex-col gap-2">
               {pings.length === 0 && (
                 <li className="text-sm text-foreground-muted">{t("empty")}</li>
               )}
               {pings.map((p) => {
                 const color = memberColors[p.sent_by_member_id] ?? "#A1A1AA";
                 const fromSelf = selfMemberId !== null && p.sent_by_member_id === selfMemberId;
                 return (
                   <li key={p.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                     <span aria-hidden className="rounded-full h-3 w-3 flex-shrink-0" style={{ background: color }} />
                     <span className="text-sm text-foreground">{p.note ?? "ping"}</span>
                     <span className="ml-auto text-xs text-foreground-muted">
                       {fromSelf ? t("received_from_self") : t("received_from_partner")}
                     </span>
                   </li>
                 );
               })}
             </ul>
           </Card>
         );
       }
       ```

    2. **Edit `frontend/app/page.tsx`** — render the panel inside `OnboardingGuard` along with the existing wordmark + install hint from 01-02. Read the local member id from localStorage (the auth helpers from 01-06 stored it):
       ```tsx
       "use client";
       import { useEffect, useState } from "react";
       import { OnboardingGuard } from "@/lib/onboarding-guard";
       import { PingPanel } from "@/components/PingPanel";
       import { useTranslations } from "next-intl";

       export default function HomePage() {
         const t = useTranslations("home");
         const [memberId, setMemberId] = useState<string | null>(null);
         useEffect(() => { setMemberId(localStorage.getItem("member_id")); }, []);
         return (
           <OnboardingGuard>
             <main className="flex flex-col flex-1 pt-6 pb-24">
               <header className="px-6 flex flex-col gap-1">
                 <h1 className="text-[28px] font-semibold tracking-tight">{t("title")}</h1>
                 <p className="text-base text-foreground-muted">{t("tagline")}</p>
               </header>
               {/* TODO(productize): D-01 — PingPanel removed by 01-11 after the round-trip gate. */}
               <PingPanel selfMemberId={memberId} />
               {/* Existing iOS install-hint card from 01-02 stays here, also under guard */}
             </main>
           </OnboardingGuard>
         );
       }
       ```
  </action>
  <verify>
    <automated>cd frontend && test -f components/PingPanel.tsx && grep -q "TODO(productize): D-01" components/PingPanel.tsx && grep -q "useRealtime" components/PingPanel.tsx && grep -q "ping.created" components/PingPanel.tsx && grep -q "PingPanel" app/page.tsx && grep -q "TODO(productize): D-01" app/page.tsx && grep -q 'useTranslations("onboarding.errors")' components/PingPanel.tsx && ! grep -q "Connexion impossible" components/PingPanel.tsx && ! grep -RnE '>(Test de connexion|Envoyer un ping|Aucun ping)' app/page.tsx components/PingPanel.tsx | grep -v 't("' | grep -v 'i18n' && npm run lint && npm run build</automated>
  </verify>
  <done>PingPanel + home wiring done; build passes; D-01 cleanup markers in place; no hardcoded French strings (everything via `t()`).</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: W1 dogfood gate — both phones round-trip a ping within ~500ms; reconnect after Railway restart</name>
  <what-built>
    Frontend WS client + ping UI live on Vercel against the Railway backend. Both phones can tap "Envoyer un ping" and see the partner's pings appear in real time. Reconnect-with-backoff is silent until 30s, then surfaces a destructive toast.
  </what-built>
  <how-to-verify>
    Claude has pushed to main; wait ~60s for Vercel + Railway redeploys.

    **A — Round-trip gate (the W1 first-concrete-action gate from SPEC.md):**

    1. On both phones, launch the installed PWA. Both should land on `/` (home) with the bottom nav, the "Test de connexion" panel, and an empty ping list.
    2. On Phone A, tap `Envoyer un ping`. Within ~500ms:
       - Phone A's list shows a new row tagged `envoyé d'ici` with Phone A's color dot.
       - Phone B's list shows the SAME row tagged `depuis ta partenaire` with Phone A's color dot.
    3. On Phone B, tap `Envoyer un ping`. Same in reverse.
    4. Repeat 5 times back-and-forth. No row should be missing on either side. Latency should consistently feel sub-second (the "~500ms" target).

    If step 2 fails:
    - List doesn't update at all → WS not connected → check Vercel env `NEXT_PUBLIC_WS_BASE` is `wss://<railway>/ws` (not `https://`).
    - List updates only after manual reload → WS broadcast not firing → check Railway logs for `ws.register household=...` lines on connect.
    - Phone A sees its own ping but not the partner's → cross-household leak NOT happening (good!) but the partner connected with the wrong household → re-onboard Phone B from a clean state (Settings → clear localStorage).

    **B — Reconnect resilience (REALTIME-03):**

    5. With both phones idle on `/`, restart the Railway service (Railway dashboard → service → "Restart"). Within ~30 seconds the WS should silently reconnect (no toast).
    6. While Railway is restarting, tap "Envoyer un ping" on Phone A. The HTTP POST will fail (toast: "Connexion impossible…"). After Railway is back, tap again — succeeds, partner sees it.
    7. **Force a >30s outage:** in the Railway dashboard, "Pause" the service for ~45 seconds, then "Resume". Around the 30-second mark a destructive toast should appear on both phones: `Connexion temporairement perdue…`. The toast should auto-dismiss when the WS reopens.

    **C — Negative path (REALTIME-01 / WS auth):**

    8. From a desktop browser, hit `wss://<railway>/ws?token=BOGUS`. The connection should close with code 1008 immediately (use a browser-console one-liner: `const ws = new WebSocket(URL); ws.onclose = e => console.log(e.code, e.reason);`).
    9. On Phone A, open Safari → Settings → Clear Website Data (or just clear localStorage via Web Inspector if you have a Mac handy). Relaunch the PWA. You should land on Welcome (token gone). Try to deep-link to `/` — the OnboardingGuard should redirect you back to Welcome.

    Check `Railway logs` while doing all the above — you should see clean `ws.register household=...` and `ws.unregister household=...` lines without any unhandled exceptions.

    **D — Sign off the dogfood gate:** After confirming all the above, write a short note in the SUMMARY (or just confirm here): "Both phones installed, both round-trip pings within ~500ms, reconnect works." This is the trigger for plan 01-11 to delete the entire ping surface.
  </how-to-verify>
  <resume-signal>Type "approved — gate passed" (this signals 01-11 cleanup is unblocked), or describe what failed (specific behavior + Railway log line).</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → wss://<api>/ws | Token attached as query param; partysocket reconnect respects token validity |
| browser → POST /pings | Bearer header via api(); 401 → wipe + redirect |
| WS frame → React state | JSON.parse'd; render uses textContent (React default), no innerHTML |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-01-07-01 | Spoofing | partysocket retries with revoked token forever | medium | mitigate | On WS close code 1008 (Task 1, lib/ws.ts), wipe localStorage + redirect to /onboarding/welcome (no further reconnect attempts because partysocket is closed). |
| T-01-07-02 | Tampering | malicious WS frame with `type` overlapping a real handler | medium | mitigate | Backend is the only sender (no peer-to-peer in v0.1); the only source of frames is `services/realtime.broadcast_to_household` which we own. No untrusted producer. |
| T-01-07-03 | Information Disclosure | WS URL with token logged to Vercel/Railway access logs | medium | accept | URL access logs may capture `?token=...`. Productize-later: switch to `Sec-WebSocket-Protocol` header for token. CONTEXT.md `Claude's Discretion` accepted query-string token for v0.1. `// TODO(productize)` documented in lib/ws.ts. |
| T-01-07-04 | Denial of Service | reconnect storm if partysocket misconfigured | medium | mitigate | partysocket caps reconnect delay at 5s with factor=2; the test plan exercises a 45s outage and confirms no log spam in Railway. |
| T-01-07-05 | Information Disclosure | hardcoded ping note exposes user content | low | mitigate | Note is `new Date().toISOString().slice(11,19)` (just the time-of-day) — no PII. Render via React text node, no `dangerouslySetInnerHTML`. |
| T-01-07-06 | Spoofing | "envoyé d'ici" attribution mismatched to wrong member | low | mitigate | Comparison uses `selfMemberId` from localStorage (same source as auth) — cannot mismatch unless localStorage is tampered with, in which case auth is also broken. |

No `high` items. The auth surface that matters (token validation on connect) was mitigated in 01-05 T-01-05-01 / T-01-05-02 server-side.
</threat_model>

<verification>
Manual via Task 3 checkpoint. Coverage:

- INFRA-05 ✓ Both phones round-trip a ping within ~500ms (W1 first-concrete-action gate).
- REALTIME-01 ✓ Both clients subscribe to a household-scoped WS channel; cross-household isolation verified by step 8 (bogus token rejected).
- REALTIME-03 ✓ Reconnect-with-backoff observable via the Railway pause/resume; >30s outage surfaces the destructive toast; <30s is silent.

After this checkpoint passes, plan 01-11 is unblocked to delete ping code on both ends per D-01.
</verification>

<success_criteria>
The Task 3 checkpoint passes on both phones (round-trip + reconnect + bogus-token rejection). The user types "approved — gate passed" which is the signal that the entire infrastructure stack (Vercel + Railway + Supabase + WebSocket + PWA install + bearer auth + onboarding) is validated end-to-end. This is the gate the W1 build plan was budgeted toward.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundations-w1/01-07-SUMMARY.md` documenting:
- Whether `partysocket` worked out-of-box or a hand-rolled `ReconnectingWebSocket` class was needed (and where it lives if so).
- Observed round-trip latency on both phones (target ~500ms).
- Whether the >30s reconnect-toast threshold fired correctly during the Railway pause test.
- Confirmation that the W1 dogfood gate is open — i.e., 01-11 ping-cleanup is unblocked.
</output>
