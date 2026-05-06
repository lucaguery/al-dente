import { NextResponse } from "next/server";

// Server-only: RAILWAY_URL never ships in the browser bundle.
// The frontend fetches /ws-config to learn the Railway WSS URL so it can
// open WebSockets directly (bypassing Vercel's proxy, which drops long-lived
// WS connections on function timeout).
// Path is /ws-config (not /api/*) so the next.config.ts beforeFiles rewrite
// that routes /api/* to Railway does NOT intercept this handler.
export function GET() {
  const railway = (process.env.RAILWAY_URL ?? "").replace(/\/+$/, "");
  const wsBase = railway
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//, "ws://");
  return NextResponse.json({ wsBase: wsBase || null });
}
