// Phase 18 IDM-02 — frontend client for PATCH /api/households/me.
//
// The backend route (Plan 18-01, parallel) returns a MemberPublic shape:
//   { id, name, color_hex, joined_at }
// The frontend only needs the subset that SessionMember exposes
// (id, name, color_hex) — the broader session reconciliation goes
// through SessionProvider.refresh() which calls GET /households/me.
//
// Errors bubble up as the generic api() Error("<status> <statusText>");
// settings/page.tsx branches on the leading 3-digit status code to render
// 409 (name already taken) vs generic-error toast paths.

import { api } from "@/lib/api";
import type { SessionMember } from "@/components/SessionProvider";

export type RenameMeResponse = SessionMember & { joined_at?: string };

export async function renameMe(name: string): Promise<RenameMeResponse> {
  return api<RenameMeResponse>("/api/households/me", {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}
