import type { AnalyzeInput } from "./types";
import {
  findImageForQuery,
  findProductImage,
  getSerperApiKey,
  normalizeImageUrl,
} from "./serper";
import { findOpenGraphImage, findWikipediaImage, resolveImageWithFallbacks } from "./image-fallbacks";
import { sanitizeLabel, sanitizeProductName } from "./product-label";

interface ProductImageInput {
  brand: string;
  name: string;
  colors?: string[];
  category?: string;
  query?: string;
  retailer?: string;
}

function buildProductQuery(product: ProductImageInput): string {
  const colorPart = product.colors?.slice(0, 2).join(" ") ?? "";
  return [sanitizeLabel(product.brand), colorPart, sanitizeProductName(product.name)].filter(Boolean).join(" ").trim();
}

export async function resolveProductImageUrl(
  product: ProductImageInput,
  analyzeInput?: AnalyzeInput
): Promise<string | undefined> {
  const serperKey = getSerperApiKey();
  const userQuery =
    analyzeInput?.type === "text"
      ? analyzeInput.query
      : analyzeInput?.type === "url"
        ? analyzeInput.url
        : product.query;

  if (analyzeInput?.type === "url") {
    const ogImage = await findOpenGraphImage(analyzeInput.url);
    if (ogImage) return ogImage;
  }

  const productInfo = {
    brand: sanitizeLabel(product.brand),
    name: sanitizeProductName(product.name),
    colors: product.colors ?? [],
    category: product.category ?? "",
  };

  const query = userQuery?.trim() || buildProductQuery(product);

  return resolveImageWithFallbacks(query, async () => {
    if (!serperKey) return undefined;
    return (
      (await findProductImage(serperKey, productInfo, userQuery, sanitizeLabel(product.retailer))) ??
      (await findImageForQuery(serperKey, query))
    );
  });
}

export async function resolveQueryImageUrl(query: string): Promise<string | undefined> {
  const serperKey = getSerperApiKey();
  return resolveImageWithFallbacks(query, async () => {
    if (!serperKey) return undefined;
    return findImageForQuery(serperKey, query);
  });
}

export function pickFirstImage(...candidates: Array<string | undefined | null>): string | undefined {
  for (const candidate of candidates) {
    const normalized = normalizeImageUrl(candidate ?? undefined);
    if (normalized) return normalized;
  }
  return undefined;
}

/** Last-resort image lookup when Serper and Wikipedia both miss. */
export async function resolveBrandProductImage(
  brand: string,
  name: string
): Promise<string | undefined> {
  return findWikipediaImage(`${sanitizeLabel(brand)} ${sanitizeProductName(name)}`.trim());
}
