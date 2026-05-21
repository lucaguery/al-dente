import { ImageResponse } from "next/og";

export const size = { width: 256, height: 256 };
export const contentType = "image/png";

// ADR-0004 §Logo — PWA favicon, runs at Next.js Edge runtime (`ImageResponse`),
// so CSS variables cannot be resolved. Hex values are LOCKED LITERAL EXCEPTIONS
// duplicated from the design tokens:
//   #FAFAF7 — surface bg (replaces the Sober Kitchen terracotta plate)
//   #14110D — ink stroke + seats
//   #A8523C — terracotta centre dot (the brand atom)
// Geometry mirrors `frontend/public/logo-favicon.svg` (simplified — plate edge
// stroke-width 6 + larger centre dot r=9, no inner well, no seats) so the mark
// survives at 16×16 / 32×32 OS-chrome scales. The full logomark with seats +
// inner well lives in `apple-icon.tsx` (rendered at 180×180 where detail reads).
export default function Icon() {
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
          width="160"
          height="160"
          viewBox="0 0 64 64"
          fill="none"
        >
          {/* Thicker plate edge so it survives at 16px */}
          <circle cx="32" cy="32" r="25" stroke="#14110D" strokeWidth="6" />
          {/* Larger centre dot — terracotta brand atom */}
          <circle cx="32" cy="32" r="9" fill="#A8523C" />
        </svg>
      </div>
    ),
    size,
  );
}
