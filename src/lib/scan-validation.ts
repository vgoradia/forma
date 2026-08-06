import type { ProductAnalysis } from "./types";

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
  return {
    ...analysis,
    identifiedProduct: {
      ...product,
      colors: Array.isArray(product.colors) ? product.colors : [],
      materials: Array.isArray(product.materials) ? product.materials : [],
      style: Array.isArray(product.style) ? product.style : [],
      confidence: typeof product.confidence === "number" ? product.confidence : 0,
    },
    alternatives: Array.isArray(analysis.alternatives) ? analysis.alternatives : [],
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
