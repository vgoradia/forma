import type { ProductAnalysis } from "./types";
import {
  finalizeAlternativeUrl,
  finalizeRetailerUrl,
  resolveSecondhandUrl,
} from "./product-links";

function hasObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isValidProductAnalysis(value: unknown): value is ProductAnalysis {
  if (!hasObject(value)) return false;

  const product = value.identifiedProduct;
  const lowest = value.lowestPrice;
  const verdict = value.verdict;

  return (
    typeof value.id === "string" &&
    hasObject(product) &&
    typeof product.name === "string" &&
    typeof product.brand === "string" &&
    hasObject(lowest) &&
    typeof lowest.retailer === "string" &&
    hasObject(verdict) &&
    Array.isArray(value.prices) &&
    Array.isArray(value.alternatives)
  );
}

export function isValidStoredScan(value: unknown): value is {
  id: string;
  savedAt: string;
  label: string;
  source: string;
  analysis: ProductAnalysis;
  imagePreview?: string;
} {
  if (!hasObject(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.savedAt === "string" &&
    typeof value.label === "string" &&
    typeof value.source === "string" &&
    isValidProductAnalysis(value.analysis)
  );
}

export function sanitizeProductAnalysis(analysis: ProductAnalysis): ProductAnalysis {
  const product = analysis.identifiedProduct;
  const brand = product.brand;
  const name = product.name;

  const lowestPrice = analysis.lowestPrice
    ? {
        ...analysis.lowestPrice,
        url: finalizeRetailerUrl(analysis.lowestPrice.url, analysis.lowestPrice.retailer, brand, name),
      }
    : analysis.lowestPrice;

  return {
    ...analysis,
    identifiedProduct: {
      ...product,
      colors: Array.isArray(product.colors) ? product.colors : [],
      materials: Array.isArray(product.materials) ? product.materials : [],
      style: Array.isArray(product.style) ? product.style : [],
      confidence: typeof product.confidence === "number" ? product.confidence : 0,
    },
    lowestPrice,
    prices: Array.isArray(analysis.prices)
      ? analysis.prices.map((price) => ({
          ...price,
          url: finalizeRetailerUrl(price.url, price.retailer, brand, name),
        }))
      : [],
    alternatives: Array.isArray(analysis.alternatives)
      ? analysis.alternatives.map((alt) => ({
          ...alt,
          url: finalizeAlternativeUrl(alt.url, alt.brand, alt.name),
          imageUrl: alt.imageUrl?.trim() || undefined,
        }))
      : [],
    secondhand: analysis.secondhand
      ? {
          ...analysis.secondhand,
          platforms: (analysis.secondhand.platforms ?? []).map((platform) => ({
            ...platform,
            url: resolveSecondhandUrl(platform.url, platform.name, brand, name),
          })),
        }
      : { available: false, platforms: [] },
    wardrobeMatches: Array.isArray(analysis.wardrobeMatches) ? analysis.wardrobeMatches : [],
    outfitSuggestions: Array.isArray(analysis.outfitSuggestions) ? analysis.outfitSuggestions : [],
    salePrediction: analysis.salePrediction ?? {
      likelihood: "low",
      predictedDrop: "Unknown",
      estimatedSalePrice: analysis.lowestPrice?.price ?? 0,
      reasoning: "",
    },
  };
}
