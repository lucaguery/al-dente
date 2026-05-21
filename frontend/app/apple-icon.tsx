import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// ADR-0004 §Logo — iOS Add-to-Home-Screen icon (180×180), Edge runtime.
// Hex values are LOCKED LITERAL EXCEPTIONS duplicated from the design tokens
// (#FAFAF7 surface / #14110D ink / #A8523C centre dot).
//
// Renders the FULL logomark from `frontend/public/logo.svg` — plate edge
// stroke 2 + subtle inner well + 2 seats + centre accent dot — scaled to
// 140×140 inside the 180×180 canvas (~20px breathing room each side, in
// line with the original SVG-export safe-area).
//
// iOS A2HS icon shift: existing installs will see this icon change after
// this commit. Per ADR-0004 §Risk register, no rollback plan during MVP —
// users who want the new icon must remove + re-add the PWA from home screen.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#FAFAF7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
        }}
      >
        <svg
          width="140"
          height="140"
          viewBox="0 0 64 64"
          fill="none"
        >
          {/* Plate edge */}
          <circle cx="32" cy="32" r="27" stroke="#14110D" strokeWidth="2" />
          {/* Subtle inner well */}
          <circle cx="32" cy="32" r="19" stroke="#14110D" strokeWidth="1" opacity="0.22" />
          {/* North seat (member 1) */}
          <circle cx="32" cy="5" r="4" fill="#14110D" />
          {/* South seat (member 2) */}
          <circle cx="32" cy="59" r="4" fill="#14110D" />
          {/* Centre accent dot — terracotta brand atom */}
          <circle cx="32" cy="32" r="3.5" fill="#A8523C" />
        </svg>
      </div>
    ),
    size,
  );
}
