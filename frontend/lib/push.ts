// Phase 3 — Web Push subscription helper.
//
// 03-RESEARCH.md §"Pattern 9 > Frontend subscription flow".

import { api } from "@/lib/api";

/** Convert URL-safe base64 (VAPID public key) to the Uint8Array PushManager wants. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw =
    typeof atob === "function"
      ? atob(b64)
      : Buffer.from(b64, "base64").toString("binary");
  // Allocate a fresh ArrayBuffer (not SharedArrayBuffer) so the Uint8Array is
  // accepted by PushManager.subscribe()'s applicationServerKey: BufferSource.
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

type SubscribeResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "unsupported"
        | "denied"
        | "subscribe_failed"
        | "missing_key"
        | "post_failed";
    };

/** D-09 — Request permission, subscribe via PushManager, POST to backend. */
export async function registerPushSubscription(): Promise<SubscribeResult> {
  if (typeof window === "undefined") return { ok: false, reason: "unsupported" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "unsupported" };
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return { ok: false, reason: "missing_key" };
  }

  // Permission step — caller is responsible for showing the banner first
  // (D-09: NOT requested on page mount).
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return { ok: false, reason: "denied" };
  }

  // Subscribe via PushManager.
  let subscription: PushSubscription;
  try {
    const reg = await navigator.serviceWorker.ready;
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  } catch (err) {
    console.error("push subscribe failed", err);
    return { ok: false, reason: "subscribe_failed" };
  }

  // POST to backend.
  try {
    await api("/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription.toJSON()),
    });
  } catch {
    return { ok: false, reason: "post_failed" };
  }

  return { ok: true };
}

/** Returns true if the current device can receive Web Push (D-09 / Pitfall 6 gate). */
export function canReceivePush(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window))
    return false;
  // iOS gate: Web Push only works in installed PWAs (iOS 16.4+).
  const ua = navigator.userAgent || "";
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (isIos && !standalone) return false;
  return true;
}
