import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple-touch-icon: identical visual contract to icon.tsx scaled to 180x180.
// width="113" height="113" with viewBox 0 0 160 160 preserves stroke
// proportions when rendered into the 180x180 canvas, leaving ~32px
// breathing room each side (per UI-SPEC line ~360-361).
// Path data duplicated intentionally — cross-file extraction is OPTIONAL
// for v0.2 per UI-SPEC line ~393.
export default function AppleIcon() {
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
          width="113"
          height="113"
          viewBox="0 0 160 160"
          fill="none"
          stroke="#FAF7F2"
          strokeWidth="6"
          strokeLinecap="round"
        >
          {/* Same pasta-strand geometry as icon.tsx */}
          <path d="M 40 80 C 40 50, 70 30, 100 40 S 130 80, 100 100 S 50 110, 40 80 Z" />
          <path d="M 60 80 C 60 65, 80 55, 95 65" />
        </svg>
      </div>
    ),
    size,
  );
}
