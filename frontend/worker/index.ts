/// <reference lib="webworker" />

// Phase 3 — custom service worker entry. Bundled into the main sw.js by
// @ducanh2912/next-pwa via customWorkerSrc: "worker" in next.config.ts.
//
// 03-RESEARCH.md §"Pattern 11: Custom service worker for push event".
//
// Two listeners:
//   - `push`: shows a notification with the payload from send_push_to_household.
//   - `notificationclick`: focuses an existing tab or opens the app.
//
// T-03-05-05 mitigation: notificationclick URL whitelist — only same-origin
// paths starting with "/" are accepted. Never openWindow(arbitrary_url).

declare const self: ServiceWorkerGlobalScope;

type PushPayload = {
  title?: string;
  body?: string;
  url?: string;
};

self.addEventListener("push", (event: PushEvent) => {
  let data: PushPayload = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    // Some pushes have no JSON body — fall back to defaults below.
  }
  const title = data.title || "Al Dente";
  const body = data.body || "Ton shortlist du jour est prêt !";
  const url =
    typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/192.png",
      badge: "/icons/192.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const data = (event.notification.data as { url?: string } | null) ?? null;
  const rawUrl = data?.url;
  // T-03-05-05: only same-origin paths starting with "/".
  const safeUrl =
    typeof rawUrl === "string" && rawUrl.startsWith("/") ? rawUrl : "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        try {
          const clientUrl = new URL(client.url);
          const targetOrigin = new URL(self.registration.scope).origin;
          if (clientUrl.origin === targetOrigin && "focus" in client) {
            await (client as WindowClient).focus();
            if ("navigate" in client && safeUrl !== clientUrl.pathname) {
              await (client as WindowClient).navigate(safeUrl);
            }
            return;
          }
        } catch {
          // ignore malformed client.url
        }
      }
      await self.clients.openWindow(safeUrl);
    })(),
  );
});

export {}; // ensure this file is treated as a module
