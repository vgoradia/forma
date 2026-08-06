import type { ProductAnalysis } from "./types";
import { getScan, saveScan } from "./storage";

export function getAnalysisHeroImage(
  analysis: ProductAnalysis,
  imagePreview?: string | null
): string | undefined {
  return (
    imagePreview ??
    analysis.identifiedProduct.imageUrl ??
    analysis.lowestPrice.imageUrl ??
    analysis.prices.find((p) => p.imageUrl)?.imageUrl
  );
}

export function proxiedImageUrl(url: string): string {
  if (url.startsWith("data:") || url.startsWith("/api/image")) return url;
  return `/api/image?url=${encodeURIComponent(url)}`;
}

export async function fetchProductImageUrl(
  analysis: ProductAnalysis,
  query?: string
): Promise<string | undefined> {
  const product = analysis.identifiedProduct;
  const response = await fetch("/api/product-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      brand: product.brand,
      name: product.name,
      colors: product.colors,
      category: product.category,
      query,
      retailer: analysis.lowestPrice.retailer,
    }),
  });

  if (!response.ok) return undefined;
  const data = (await response.json()) as { imageUrl?: string };
  return data.imageUrl;
}

export async function backfillScanImages(scanId: string, query?: string): Promise<boolean> {
  const scan = getScan(scanId);
  if (!scan) return false;

  const hero = getAnalysisHeroImage(scan.analysis, scan.imagePreview);
  if (hero) return false;

  const imageUrl = await fetchProductImageUrl(scan.analysis, query);
  if (!imageUrl) return false;

  saveScan({
    ...scan,
    analysis: {
      ...scan.analysis,
      identifiedProduct: {
        ...scan.analysis.identifiedProduct,
        imageUrl,
      },
      lowestPrice: {
        ...scan.analysis.lowestPrice,
        imageUrl: scan.analysis.lowestPrice.imageUrl ?? imageUrl,
      },
    },
  });

  return true;
}
