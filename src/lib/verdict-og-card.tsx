import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { verdictTone, type SharedVerdict } from "@/lib/shared-verdict";
import { formatPrice, formatProductTitle } from "@/lib/utils";

export const VERDICT_OG_SIZE = { width: 1200, height: 630 };

let logoSrcPromise: Promise<string> | null = null;

function loadLogoSrc(): Promise<string> {
  if (!logoSrcPromise) {
    logoSrcPromise = readFile(join(process.cwd(), "public/forma-icon.png")).then(
      (buffer) => `data:image/png;base64,${buffer.toString("base64")}`
    );
  }
  return logoSrcPromise;
}

function clip(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export async function renderVerdictImage(verdict: SharedVerdict) {
  const logoSrc = await loadLogoSrc();
  const tone = verdictTone(verdict.verdict.recommendation);
  const title = clip(formatProductTitle(verdict.product.brand, verdict.product.name) || "This find", 64);
  const headline = clip(verdict.verdict.headline, 110);
  const verified = verdict.lowestPrice.priceVerified && !verdict.lowestPrice.estimated;
  const price = formatPrice(verdict.lowestPrice.price);
  const priceLabel = verified ? "Lowest price" : "Estimated price";
  const priceText = verified ? price : `about ${price}`;
  const retailer = clip(verdict.lowestPrice.retailer, 32);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#1A1B26",
          color: "white",
          padding: "56px 64px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* next/og ImageResponse renders a plain img; next/image is not supported here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="" width={72} height={72} style={{ borderRadius: 18 }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 32, fontWeight: 700 }}>Forma</span>
              <span style={{ fontSize: 20, color: "#A1A1AA" }}>Buy or skip</span>
            </div>
          </div>
          <span style={{ fontSize: 22, color: "#A5B4FC" }}>shopwithforma.com</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 84, fontWeight: 800, color: tone.onDark, lineHeight: 1 }}>{tone.word}</span>
          <span style={{ fontSize: 42, fontWeight: 700, lineHeight: 1.15 }}>{title}</span>
          <span style={{ fontSize: 28, color: "#D4D4D8", lineHeight: 1.3 }}>{headline}</span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ fontSize: 24, color: "#A1A1AA" }}>{priceLabel}</span>
          <span style={{ fontSize: 40, fontWeight: 700, color: tone.onDark }}>{priceText}</span>
          <span style={{ fontSize: 24, color: "#E4E4E7" }}>at {retailer}</span>
        </div>
      </div>
    ),
    { ...VERDICT_OG_SIZE }
  );
}
