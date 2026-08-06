import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Forma — AI Shopping Copilot";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logoBuffer = await readFile(join(process.cwd(), "public/forma-logo.png"));
  const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;

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
          gap: 32,
        }}
      >
        <img src={logoSrc} alt="" width={280} height={280} style={{ objectFit: "contain" }} />
        <p
          style={{
            fontSize: 32,
            fontWeight: 500,
            color: "#A1A1AA",
            maxWidth: 760,
            textAlign: "center",
            lineHeight: 1.35,
            margin: 0,
          }}
        >
          Should you buy it? Forma knows.
        </p>
        <p style={{ fontSize: 22, color: "#6366f1", margin: 0 }}>shopwithforma.com</p>
      </div>
    ),
    { ...size }
  );
}
