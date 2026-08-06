import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Forma — AI Shopping Copilot";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const iconBuffer = await readFile(join(process.cwd(), "public/forma-icon.png"));
  const iconSrc = `data:image/png;base64,${iconBuffer.toString("base64")}`;

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
          <img
            src={iconSrc}
            alt=""
            width={120}
            height={120}
            style={{ borderRadius: 28 }}
          />
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
          <p style={{ fontSize: "22px", color: "#6366f1", marginTop: "-8px" }}>shopwithforma.com</p>
        </div>
      </div>
    ),
    { ...size }
  );
}
