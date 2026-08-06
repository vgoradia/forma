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
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #f5f3ff 0%, #ffffff 50%, #eef2ff 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "#6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "36px",
              fontWeight: 700,
            }}
          >
            F
          </div>
          <span style={{ fontSize: "56px", fontWeight: 700, color: "#111827" }}>Forma</span>
        </div>
        <p style={{ fontSize: "40px", fontWeight: 600, color: "#374151", maxWidth: "900px", lineHeight: 1.3 }}>
          Should you buy it? Forma knows.
        </p>
        <p style={{ fontSize: "28px", color: "#6b7280", marginTop: "20px", maxWidth: "860px" }}>
          Upload a screenshot, link, or image — get prices, alternatives, and a clear verdict in seconds.
        </p>
      </div>
    ),
    { ...size }
  );
}
