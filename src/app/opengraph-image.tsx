import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Forma — AI Shopping Copilot";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1A1B26",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "28px",
          }}
        >
          <div
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "28px",
              background: "#252736",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="72"
              height="72"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M22 38h56l-5 44H27L22 38Z" fill="white" />
              <path
                d="M34 38V30c0-6.6 5.4-12 12-12h8c6.6 0 12 5.4 12 12v8"
                stroke="white"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path d="M38 62 58 42l8 8-6 14-14 6 6-8Z" fill="white" />
              <path
                d="M58 42 66 50 60 64"
                stroke="#5E4BF3"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span style={{ fontSize: "72px", fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>
            Forma
          </span>
          <p
            style={{
              fontSize: "32px",
              fontWeight: 500,
              color: "#A1A1AA",
              maxWidth: "760px",
              textAlign: "center",
              lineHeight: 1.35,
            }}
          >
            Should you buy it? Forma knows.
          </p>
        </div>
      </div>
    ),
    { ...size }
  );
}
