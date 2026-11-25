import type { ProductAnalysis } from "./types";
import {
  finalizeAlternativeUrl,
  finalizeRetailerUrl,
  resolveSecondhandUrl,
} from "./product-links";
import { isPlaceholderLabel, sanitizeLabel, sanitizeProductName, stripPlaceholderMentions } from "./product-label";
import { alignVerdictCopy, normalizePriceTrend, syncEstimateFlag } from "./price-estimates";
import { stripDuplicateBrand } from "./utils";

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
  const brand = sanitizeLabel(analysis.identifiedProduct.brand);
  const name = stripDuplicateBrand(brand, sanitizeProductName(analysis.identifiedProduct.name));

  const lowestRetailer = sanitizeLabel(analysis.lowestPrice?.retailer);
  const lowestPrice = analysis.lowestPrice
    ? syncEstimateFlag({
        ...analysis.lowestPrice,
        retailer: lowestRetailer,
        url: finalizeRetailerUrl(analysis.lowestPrice.url, lowestRetailer, brand, name),
      })
    : analysis.lowestPrice;

  const priceTrend = normalizePriceTrend(analysis.priceTrend);
  const prediction = analysis.salePrediction;

  const prices = Array.isArray(analysis.prices)
    ? analysis.prices.map((price) => {
        const retailer = sanitizeLabel(price.retailer);
        return syncEstimateFlag({
          ...price,
          retailer,
          url: finalizeRetailerUrl(price.url, retailer, brand, name),
        });
      })
    : [];

  const alternatives = Array.isArray(analysis.alternatives)
    ? analysis.alternatives.map((alt) => {
        const altBrand = sanitizeLabel(alt.brand);
        const altName = stripDuplicateBrand(altBrand, sanitizeProductName(alt.name));
        return syncEstimateFlag({
          ...alt,
          brand: altBrand,
          name: altName,
          url: finalizeAlternativeUrl(alt.url, altBrand, altName),
          imageUrl: alt.imageUrl?.trim() || undefined,
        });
      })
    : [];

  const secondhandPlatforms = (analysis.secondhand?.platforms ?? []).map((platform) => ({
    ...platform,
    url: resolveSecondhandUrl(platform.url, platform.name, brand, name),
    estimated: true,
  }));

  const verdict = alignVerdictCopy(analysis.verdict?.headline ?? "", analysis.verdict?.reasoning ?? "", {
    displayed: lowestPrice?.price ?? 0,
    shown: [lowestPrice?.price ?? 0, ...prices.map((price) => price.price)],
    preserve: [
      ...alternatives.map((alt) => alt.price),
      ...secondhandPlatforms.map((platform) => platform.price),
      prediction?.estimatedSalePrice ?? 0,
    ],
  });

  return {
    ...analysis,
    identifiedProduct: {
      ...analysis.identifiedProduct,
      brand,
      name,
      description: stripPlaceholderMentions(analysis.identifiedProduct.description ?? ""),
      colors: Array.isArray(analysis.identifiedProduct.colors) ? analysis.identifiedProduct.colors : [],
      materials: Array.isArray(analysis.identifiedProduct.materials) ? analysis.identifiedProduct.materials : [],
      style: Array.isArray(analysis.identifiedProduct.style) ? analysis.identifiedProduct.style : [],
      confidence: typeof analysis.identifiedProduct.confidence === "number" ? analysis.identifiedProduct.confidence : 0,
    },
    verdict: {
      ...analysis.verdict,
      headline: verdict.headline,
      reasoning: verdict.reasoning,
    },
    lowestPrice,
    prices,
    alternatives,
    secondhand: {
      available: analysis.secondhand?.available ?? false,
      platforms: secondhandPlatforms,
    },
    wardrobeMatches: Array.isArray(analysis.wardrobeMatches) ? analysis.wardrobeMatches : [],
    outfitSuggestions: Array.isArray(analysis.outfitSuggestions) ? analysis.outfitSuggestions : [],
    priceHistory: Array.isArray(analysis.priceHistory)
      ? analysis.priceHistory.map((point) => ({
          date: point.date,
          price: point.price,
          estimated: true,
        }))
      : [],
    ...(priceTrend ? { priceTrend } : {}),
    salePrediction: {
      likelihood: prediction?.likelihood ?? "low",
      predictedDrop:
        prediction?.predictedDrop && !isPlaceholderLabel(prediction.predictedDrop)
          ? prediction.predictedDrop
          : "unclear",
      estimatedSalePrice: prediction?.estimatedSalePrice ?? analysis.lowestPrice?.price ?? 0,
      reasoning: prediction?.reasoning ?? "",
      estimated: true,
    },
  };
}
