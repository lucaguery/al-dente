import { ImageResponse } from "next/og";

export const size = { width: 256, height: 256 };
export const contentType = "image/png";

// Slow Food artisanal identity mark: pasta-strand outline.
// Picked over wheat-stem because the closed spiral rasterizes cleaner
// at 32px favicon scale (no fine grain detail to alias).
// Locked literal hex values per UI-SPEC §"Color > Anti-patterns explicit
// for Phase 9": #C8553D (terracotta bg) + #FAF7F2 (cream stroke) are
// LOCKED LITERAL EXCEPTIONS for the PWA chrome metadata files where
// Tailwind tokens cannot reach (this file runs at the edge runtime).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#C8553D",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
        }}
      >
        <svg
          width="160"
          height="160"
          viewBox="0 0 160 160"
          fill="none"
          stroke="#FAF7F2"
          strokeWidth="6"
          strokeLinecap="round"
        >
          {/* Outer pasta-strand spiral (closed Bézier whorl) */}
          <path d="M 40 80 C 40 50, 70 30, 100 40 S 130 80, 100 100 S 50 110, 40 80 Z" />
          {/* Inner whorl — single curve reading as the pasta unfurling */}
          <path d="M 60 80 C 60 65, 80 55, 95 65" />
        </svg>
      </div>
    ),
    size,
  );
}
