import type { PriceHistoryPoint, PriceTrendDirection, PriceTrendEstimate, SalePrediction } from "./types";

export const PRICE_ESTIMATE_NOTE =
  "AI estimate, not a live retailer price. Confirm it on the store site before you buy.";

export const PRICE_TREND_NOTE =
  "AI estimate, not real price history. Forma does not track past retailer prices.";

const DIRECTIONS: readonly PriceTrendDirection[] = ["falling", "stable", "rising", "unknown"];

const DOLLAR_AMOUNT = /\$\s?\d[\d,]*(?:\.\d{1,2})?/g;

export function isEstimatedPrice<T extends { priceVerified?: boolean; estimated?: boolean }>(
  row: T | null | undefined
): boolean {
  if (!row) return true;
  return row.priceVerified !== true;
}

/** Model output cannot mark itself verified. Live listings set the flag later. */
export function asUnverifiedEstimate<T extends { priceVerified?: boolean; estimated?: boolean }>(row: T): T {
  return { ...row, priceVerified: false, estimated: true };
}

/** Keep `estimated` aligned with whether a live listing confirmed the figure. */
export function syncEstimateFlag<T extends { priceVerified?: boolean; estimated?: boolean }>(row: T): T {
  const verified = row.priceVerified === true;
  return { ...row, priceVerified: verified, estimated: !verified };
}

export function stripPrecisePrices(text: string): string {
  return text
    .replace(DOLLAR_AMOUNT, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .trim();
}

export function sanitizeMarkdownBand(value: string): string {
  const cleaned = stripPrecisePrices(value);
  if (!cleaned || cleaned.length > 40 || !/\d/.test(cleaned)) return "";
  return cleaned;
}

export function normalizePriceTrend(raw: unknown): PriceTrendEstimate | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const trend = raw as { direction?: unknown; summary?: unknown; typicalMarkdown?: unknown };
  const direction = DIRECTIONS.includes(trend.direction as PriceTrendDirection)
    ? (trend.direction as PriceTrendDirection)
    : "unknown";
  const summary = typeof trend.summary === "string" ? stripPrecisePrices(trend.summary) : "";
  const typicalMarkdown =
    typeof trend.typicalMarkdown === "string" ? sanitizeMarkdownBand(trend.typicalMarkdown) : "";
  if (!summary && !typicalMarkdown && direction === "unknown") return undefined;
  return {
    direction,
    summary,
    ...(typicalMarkdown ? { typicalMarkdown } : {}),
    estimated: true,
  };
}

export function flagModelPriceHistory(
  points: unknown,
  coercePrice: (value: unknown) => number | undefined
): PriceHistoryPoint[] {
  if (!Array.isArray(points)) return [];
  return points.map((point) => {
    const row = point && typeof point === "object" ? (point as { date?: unknown; price?: unknown }) : {};
    return {
      date: typeof row.date === "string" ? row.date : "",
      price: coercePrice(row.price) ?? 0,
      estimated: true,
    };
  });
}

export function flagModelSalePrediction(
  raw: unknown,
  coercePrice: (value: unknown) => number | undefined
): SalePrediction {
  const prediction =
    raw && typeof raw === "object" ? (raw as Partial<SalePrediction> & { estimated?: unknown }) : {};
  const likelihood =
    prediction.likelihood === "high" || prediction.likelihood === "medium" || prediction.likelihood === "low"
      ? prediction.likelihood
      : "low";
  const predictedDrop =
    typeof prediction.predictedDrop === "string" && prediction.predictedDrop.trim()
      ? prediction.predictedDrop.trim()
      : "Unknown";
  return {
    likelihood,
    predictedDrop,
    estimatedSalePrice: coercePrice(prediction.estimatedSalePrice) ?? 0,
    reasoning: typeof prediction.reasoning === "string" ? prediction.reasoning : "",
    estimated: true,
  };
}

export interface PriceTrendView {
  summary: string;
  saleLine?: string;
  footnote: string;
}

const DIRECTION_COPY: Record<PriceTrendDirection, string> = {
  falling: "Typical retail patterns suggest this price may ease. That is a guess, not a recorded drop.",
  stable: "Typical retail patterns suggest this price is fairly steady. That is a guess, not a price history.",
  rising: "Typical retail patterns suggest this price may firm up. That is a guess, not a recorded increase.",
  unknown: "There isn't a reliable signal on whether this price will move.",
};

function softenTiming(value: string | undefined): string {
  if (!value) return "";
  const cleaned = stripPrecisePrices(value).replace(/\s+/g, " ").trim();
  if (!cleaned || /^unknown$/i.test(cleaned) || /^unclear$/i.test(cleaned)) return "";
  return cleaned;
}

/**
 * Qualitative sale/trend copy. Intentionally ignores any stored price-history series
 * so invented monthly prices are never presented as observed history.
 */
export function describePriceTrend(input: {
  priceTrend?: PriceTrendEstimate | null;
  salePrediction?: SalePrediction | null;
}): PriceTrendView {
  const trend = input.priceTrend ?? undefined;
  const prediction = input.salePrediction ?? undefined;
  const fromSummary = trend?.summary ? stripPrecisePrices(trend.summary) : "";
  const summary = fromSummary || DIRECTION_COPY[trend?.direction ?? "unknown"];

  let saleLine: string | undefined;
  if (prediction?.likelihood === "high" || prediction?.likelihood === "medium") {
    const band = trend?.typicalMarkdown ? sanitizeMarkdownBand(trend.typicalMarkdown) : "";
    const timing = softenTiming(prediction.predictedDrop);
    const bits = ["A markdown is possible, but not confirmed."];
    if (band) bits.push(`A rough band is about ${band}.`);
    if (timing) bits.push(`Timing note: ${timing}.`);
    saleLine = bits.join(" ");
  } else if (prediction?.likelihood === "low") {
    saleLine = "No strong reason to wait for a sale. This is not a forecast.";
  }

  return {
    summary,
    saleLine,
    footnote: PRICE_TREND_NOTE,
  };
}
