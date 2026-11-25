import type { PriceHistoryPoint, PriceTrendDirection, PriceTrendEstimate, SalePrediction } from "./types";
import { coercePrice, formatPrice } from "./utils";
import { isPlaceholderLabel, stripPlaceholderMentions } from "./product-label";

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

const DOLLAR_TOKEN = /\$\s?\d[\d,]*(?:\.\d{1,2})?/g;
const DOLLAR_RANGE =
  /\$\s?\d[\d,]*(?:\.\d{1,2})?\s*(?:–|—|-|to)\s*\$\s?\d[\d,]*(?:\.\d{1,2})?/gi;

export interface VerdictPriceContext {
  /** Hero price the shopper sees (lowest estimate, or a verified listing). */
  displayed: number;
  /** Product prices shown on the verdict. A mention that already matches one stays. */
  shown?: number[];
  /** Dupe, secondhand, and sale figures that must not be rewritten. */
  preserve?: number[];
}

function positivePrices(values: number[] | undefined): number[] {
  return (values ?? []).filter((price) => Number.isFinite(price) && price > 0);
}

function samePrice(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}

function matchesAny(amount: number, targets: number[]): boolean {
  return targets.some((price) => samePrice(amount, price));
}

function closestDistance(amount: number, targets: number[]): number {
  let best = Infinity;
  for (const price of targets) best = Math.min(best, Math.abs(price - amount));
  return best;
}

/**
 * Close enough to be the item's own price, including a rounded mention
 * ("around $65" next to a $62 estimate). About ±25%, with a small floor so
 * cheap items still snap.
 */
function nearDisplayed(amount: number, displayed: number): boolean {
  const delta = Math.abs(amount - displayed);
  return delta <= Math.max(displayed * 0.25, 8);
}

const APPROX_PRICE =
  /(?:~|≈)\s*\$\s*\d[\d,]*(?:\.\d{1,2})?(?:\s*-?\s*ish\b)?|(?:around|about|roughly|approximately|approx\.?|nearly|close to)\s+\$\s*\d[\d,]*(?:\.\d{1,2})?(?:\s*-?\s*ish\b)?|\$\s*\d[\d,]*(?:\.\d{1,2})?\s*-?\s*ish\b|(?:around|about|roughly|approximately|approx\.?|nearly|close to)\s+\d[\d,]*(?:\.\d{1,2})?\s+dollars?\b/gi;

const OTHER_OFFER =
  /\b(?:dupes?|knock-?offs?|second[-\s]?hand|pre-?owned|resale|thrift(?:ed)?|consignment|on sale|sale price|for sale|markdown|discount(?:ed)?|depop|poshmark|thredup|therealreal|realreal|mercari|grailed|vestiaire)\b/i;

const LISTED_AT_RETAILER =
  /\b(?:lists?|listed|sells?|selling|carries|stocks)\b|\b(?:at|from|via)\s+[A-Z]/;

function mentionWindow(text: string, index: number, length: number): string {
  const before = text.slice(Math.max(0, index - 48), index);
  let after = text.slice(index + length, Math.min(text.length, index + length + 32));
  const nextBreak = after.search(/\$\s?\d|\d[\d,]*\s+dollars?\b|~\s*\$|,|;|\b(?:though|but|while|whereas)\b/i);
  if (nextBreak >= 0) after = after.slice(0, nextBreak);
  return `${before} ${after}`;
}

function amountsIn(text: string): number[] {
  const amounts: number[] = [];
  const pattern =
    /(?:~|≈)\s*\$\s*\d[\d,]*(?:\.\d{1,2})?|\$\s*\d[\d,]*(?:\.\d{1,2})?|\d[\d,]*(?:\.\d{1,2})?\s+dollars?\b/gi;
  for (const part of text.matchAll(pattern)) {
    const value = coercePrice(part[0]);
    if (value !== undefined) amounts.push(value);
  }
  return amounts;
}

function shouldRewriteApproximate(
  amount: number,
  displayed: number,
  shown: number[],
  preserve: number[],
  window: string,
  onlyProductMention: boolean
): boolean {
  if (!Number.isFinite(displayed) || displayed <= 0) return false;
  if (samePrice(amount, displayed)) return false;
  if (matchesAny(amount, preserve)) return false;
  const distDisplayed = Math.abs(amount - displayed);
  const distPreserve = closestDistance(amount, preserve);
  if (distPreserve + 0.5 < distDisplayed) return false;
  if (OTHER_OFFER.test(window)) return false;
  const otherShown = shown.filter((price) => !samePrice(price, displayed));
  if (matchesAny(amount, otherShown) && LISTED_AT_RETAILER.test(window)) return false;
  if (nearDisplayed(amount, displayed)) return true;
  return onlyProductMention;
}

function dollarsIn(match: string): number[] {
  const amounts: number[] = [];
  for (const part of match.matchAll(/\$\s?\d[\d,]*(?:\.\d{1,2})?/g)) {
    const value = coercePrice(part[0]);
    if (value !== undefined) amounts.push(value);
  }
  return amounts;
}

function shouldRewriteAmount(
  amount: number,
  displayed: number,
  shown: number[],
  preserve: number[],
  onlyProductMention: boolean
): boolean {
  if (!Number.isFinite(displayed) || displayed <= 0) return false;
  if (samePrice(amount, displayed) || matchesAny(amount, shown)) return false;
  if (matchesAny(amount, preserve)) return false;
  const distDisplayed = Math.abs(amount - displayed);
  const distPreserve = closestDistance(amount, preserve);
  if (distPreserve + 0.5 < distDisplayed) return false;
  if (nearDisplayed(amount, displayed)) return true;
  return onlyProductMention;
}

/**
 * Rewrite dollar amounts in verdict prose so they match the price on screen.
 * Does not change whether that price is labeled an AI estimate or a verified listing.
 */
export function alignVerdictPriceText(text: string, context: VerdictPriceContext): string {
  if (!text) return text;
  const displayed = context.displayed;
  if (!Number.isFinite(displayed) || displayed <= 0) return text;
  if (!text.includes("$") && !/\bdollars?\b/i.test(text)) return text;

  const shown = positivePrices(context.shown);
  const preserve = positivePrices(context.preserve);
  const shownDistinct = positivePrices([displayed, ...shown]).filter(
    (price, index, all) => all.findIndex((other) => samePrice(other, price)) === index
  );
  const low = Math.min(...shownDistinct);
  const high = Math.max(...shownDistinct);
  const formattedDisplayed = formatPrice(displayed);
  const formattedRange =
    high - low >= 0.5 ? `${formatPrice(low)}–${formatPrice(high)}` : formattedDisplayed;

  const productAmounts = amountsIn(text).filter((amount) => {
    if (matchesAny(amount, preserve)) return false;
    return closestDistance(amount, preserve) + 0.5 >= Math.abs(amount - displayed);
  });
  const onlyProductMention = productAmounts.length === 1;

  const rangePattern = new RegExp(DOLLAR_RANGE.source, DOLLAR_RANGE.flags);
  const approxPattern = new RegExp(APPROX_PRICE.source, APPROX_PRICE.flags);
  const tokenPattern = new RegExp(DOLLAR_TOKEN.source, DOLLAR_TOKEN.flags);

  const withRanges = text.replace(rangePattern, (match) => {
    const [start, end] = dollarsIn(match);
    if (start === undefined || end === undefined) return match;
    const closerToSomethingElse = (amount: number) =>
      matchesAny(amount, preserve) ||
      closestDistance(amount, preserve) + 0.5 < Math.abs(amount - displayed);
    if (closerToSomethingElse(start) && closerToSomethingElse(end)) return match;
    const startKept = !shouldRewriteAmount(start, displayed, shownDistinct, preserve, onlyProductMention);
    const endKept = !shouldRewriteAmount(end, displayed, shownDistinct, preserve, onlyProductMention);
    const onlyRange = dollarsIn(text).length === 2 && productAmounts.length === 2;
    if (startKept && endKept && !onlyRange) return match;
    if (samePrice(start, low) && samePrice(end, high)) return match;
    return formattedRange;
  });

  const withApproximate = withRanges.replace(approxPattern, (match, offset: number, source: string) => {
    const amount = coercePrice(match);
    if (amount === undefined) return match;
    const window = mentionWindow(source, offset, match.length);
    if (!shouldRewriteApproximate(amount, displayed, shownDistinct, preserve, window, onlyProductMention)) {
      return match;
    }
    return formattedDisplayed;
  });

  return withApproximate.replace(tokenPattern, (match, offset: number, source: string) => {
    const amount = coercePrice(match);
    if (amount === undefined) return match;
    if (OTHER_OFFER.test(mentionWindow(source, offset, match.length))) return match;
    if (!shouldRewriteAmount(amount, displayed, shownDistinct, preserve, onlyProductMention)) return match;
    return formattedDisplayed;
  });
}

export function alignVerdictCopy(
  headline: string,
  reasoning: string,
  context: VerdictPriceContext
): { headline: string; reasoning: string } {
  return {
    headline: alignVerdictPriceText(stripPlaceholderMentions(headline), context),
    reasoning: alignVerdictPriceText(stripPlaceholderMentions(reasoning), context),
  };
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
  const dropText = typeof prediction.predictedDrop === "string" ? prediction.predictedDrop.trim() : "";
  const predictedDrop = dropText && !isPlaceholderLabel(dropText) ? dropText : "unclear";
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
