import type { ProductAnalysis } from "./types";
import { coercePrice, formatPrice, formatProductTitle } from "./utils";

/** Hostname check used while sanitizing a public URL. The server passes `isBlockedHostname`. */
export type HostBlocker = (hostname: string) => boolean;

/** Public share ids are 10 url-safe characters. The DB check constraint matches this. */
export const SHARE_ID_PATTERN = /^[A-Za-z0-9]{10}$/;

const SHARE_ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const RECOMMENDATIONS = ["buy", "wait", "skip", "consider-alternatives"] as const;
type Recommendation = (typeof RECOMMENDATIONS)[number];

const TIERS = ["premium", "similar", "dupe"] as const;
type Tier = (typeof TIERS)[number];

const PII_QUERY_KEY =
  /^(email|e-mail|user_id|userid|user|uid|phone|token|access_token|refresh_token|id_token|auth|session|session_id|password)$/i;

export interface SharedPrice {
  retailer: string;
  price: number;
  url: string;
  /** False only when a live listing confirmed the figure. */
  estimated: boolean;
}

export interface SharedAlternative {
  name: string;
  brand: string;
  price: number;
  url: string;
  imageUrl?: string;
  reason: string;
  tier: Tier;
  matchScore: number;
  estimated: boolean;
}

export interface SharedVerdict {
  product: {
    name: string;
    brand: string;
    category: string;
    description: string;
    colors: string[];
    imageUrl?: string;
    matchPercent: number;
  };
  verdict: {
    recommendation: Recommendation;
    headline: string;
    reasoning: string;
    worthItScore: number;
  };
  lowestPrice: SharedPrice & { priceVerified: boolean };
  prices: SharedPrice[];
  alternatives: SharedAlternative[];
  reviews: {
    overallRating: number;
    totalReviews: number;
    summary: string;
    pros: string[];
    cons: string[];
    qualityScore: number;
    valueScore: number;
  };
  secondhand: Array<{ name: string; price: number; url: string; estimated: boolean }>;
  saleNote?: string;
}

export function isShareId(id: string): boolean {
  return SHARE_ID_PATTERN.test(id);
}

export function shareIdFromBytes(bytes: Uint8Array): string {
  if (bytes.length < 10) {
    throw new Error("share id entropy must be at least 10 bytes");
  }
  let id = "";
  for (let i = 0; i < 10; i++) {
    id += SHARE_ID_ALPHABET[bytes[i]! % SHARE_ID_ALPHABET.length];
  }
  return id;
}

export function createShareId(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return shareIdFromBytes(bytes);
}

export function sharedVerdictPath(id: string): string {
  return `/v/${id}`;
}

export function verdictTone(recommendation: string): {
  word: string;
  phrase: string;
  color: string;
  onDark: string;
} {
  switch (recommendation) {
    case "buy":
      return { word: "BUY", phrase: "BUY", color: "#059669", onDark: "#34d399" };
    case "wait":
      return { word: "WAIT", phrase: "WAIT", color: "#d97706", onDark: "#fbbf24" };
    case "skip":
      return { word: "SKIP", phrase: "SKIP", color: "#dc2626", onDark: "#f87171" };
    case "consider-alternatives":
      return { word: "DUPES", phrase: "CONSIDER DUPES", color: "#ea580c", onDark: "#fb923c" };
    default:
      return { word: "VERDICT", phrase: "VERDICT", color: "#4f46e5", onDark: "#a5b4fc" };
  }
}

export function verdictSharePhrase(recommendation: string): string {
  return verdictTone(recommendation).phrase;
}

export function sharedVerdictMetadataCopy(verdict: SharedVerdict): { title: string; description: string } {
  const name = formatProductTitle(verdict.product.brand, verdict.product.name) || "This find";
  const shortName = clip(name, 72);
  const phrase = verdictSharePhrase(verdict.verdict.recommendation);
  const title = `${shortName} — Forma says ${phrase}`;
  const price = formatPrice(verdict.lowestPrice.price);
  const headline = verdict.verdict.headline.trim().replace(/[.!?…]+$/, "");
  const pricePhrase =
    verdict.lowestPrice.priceVerified && !verdict.lowestPrice.estimated
      ? `Lowest price ${price}`
      : `Estimated price about ${price}`;
  const description = clip(`${headline}. ${pricePhrase} at ${verdict.lowestPrice.retailer}.`, 200);
  return { title, description };
}

/**
 * Browser-safe prefilter so the share button does not import Node's `net` module.
 * Persisted snapshots are sanitized again with `isBlockedHostname`.
 */
export function basicBlockedHostname(hostname: string): boolean {
  let host = hostname.trim().toLowerCase();
  if (host.endsWith(".")) host = host.slice(0, -1);
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  const zone = host.indexOf("%");
  if (zone !== -1) host = host.slice(0, zone);
  if (!host) return true;

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal" ||
    host === "metadata.goog" ||
    host === "metadata" ||
    host === "instance-data" ||
    host === "::1" ||
    host.startsWith("fe80:") ||
    host.startsWith("fc") ||
    host.startsWith("fd")
  ) {
    return true;
  }

  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;
  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) return true;
  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

/** Whitelist a scan into the public snapshot. Extra fields, account ids, and screenshots are dropped. */
export function toSharedVerdict(
  input: unknown,
  isHostBlocked: HostBlocker = basicBlockedHostname
): SharedVerdict | null {
  if (!isRecord(input)) return null;

  const productRecord = isRecord(input.product)
    ? input.product
    : isRecord(input.identifiedProduct)
      ? input.identifiedProduct
      : null;
  const verdictRecord = isRecord(input.verdict) ? input.verdict : null;
  if (!productRecord || !verdictRecord) return null;

  const recommendation = verdictRecord.recommendation;
  if (!isRecommendation(recommendation)) return null;

  const name = scrubText(productRecord.name, 120);
  const brand = scrubText(productRecord.brand, 80);
  if (!name && !brand) return null;

  const lowest = readPriceRow(input.lowestPrice, isHostBlocked);
  if (!lowest) return null;
  const lowestVerified = isRecord(input.lowestPrice) && input.lowestPrice.priceVerified === true;

  const prices = readPriceList(input.prices, isHostBlocked);
  const priceRows = prices.length > 0 ? prices : [lowest];

  const imageUrl =
    sanitizePublicUrl(productRecord.imageUrl, isHostBlocked) ||
    sanitizePublicUrl(isRecord(input.lowestPrice) ? input.lowestPrice.imageUrl : undefined, isHostBlocked) ||
    "";

  const reviewsRecord = isRecord(input.reviews)
    ? input.reviews
    : isRecord(input.reviewSummary)
      ? input.reviewSummary
      : {};

  const saleNote = readSaleNote(input);
  const headline =
    scrubText(verdictRecord.headline, 180) || `Forma says ${verdictSharePhrase(recommendation)}`;

  const verdict: SharedVerdict = {
    product: {
      name,
      brand,
      category: scrubText(productRecord.category, 60),
      description: scrubText(productRecord.description, 400),
      colors: scrubList(productRecord.colors, 4, 40),
      ...(imageUrl ? { imageUrl } : {}),
      matchPercent: readMatchPercent(productRecord),
    },
    verdict: {
      recommendation,
      headline,
      reasoning: scrubText(verdictRecord.reasoning, 500),
      worthItScore: clampScore(verdictRecord.worthItScore),
    },
    lowestPrice: {
      ...lowest,
      priceVerified: lowestVerified,
      estimated: lowestVerified ? false : lowest.estimated,
    },
    prices: priceRows.slice(0, 4),
    alternatives: readAlternatives(input.alternatives, isHostBlocked),
    reviews: {
      overallRating: clampRating(reviewsRecord.overallRating),
      totalReviews: clampCount(reviewsRecord.totalReviews),
      summary: scrubText(reviewsRecord.summary, 320),
      pros: scrubList(reviewsRecord.pros, 3, 140),
      cons: scrubList(reviewsRecord.cons, 3, 140),
      qualityScore: clampScore(reviewsRecord.qualityScore),
      valueScore: clampScore(reviewsRecord.valueScore),
    },
    secondhand: readSecondhand(input.secondhand, isHostBlocked),
    ...(saleNote ? { saleNote } : {}),
  };

  return verdict;
}

export function shareRequestBody(analysis: ProductAnalysis | SharedVerdict | unknown): { analysis: SharedVerdict } | null {
  const analysisRecord = toSharedVerdict(analysis);
  if (!analysisRecord) return null;
  return { analysis: analysisRecord };
}

/** Browser helper: publish the current verdict and return its public path. */
export async function requestPublicShare(analysis: unknown): Promise<string | null> {
  const body = shareRequestBody(analysis);
  if (!body) return null;

  try {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { path?: unknown };
    if (typeof data.path !== "string" || !/^\/v\/[A-Za-z0-9]{10}$/.test(data.path)) return null;
    return data.path;
  } catch {
    return null;
  }
}

export function sanitizePublicUrl(value: unknown, isHostBlocked: HostBlocker = basicBlockedHostname): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2000) return "";
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return "";

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return "";
  if (url.username || url.password) return "";
  if (isHostBlocked(url.hostname)) return "";

  for (const key of [...url.searchParams.keys()]) {
    if (PII_QUERY_KEY.test(key)) url.searchParams.delete(key);
  }

  return url.toString();
}

function readSaleNote(record: Record<string, unknown>): string | undefined {
  if (typeof record.saleNote === "string") {
    return scrubText(record.saleNote, 140) || undefined;
  }
  const prediction = record.salePrediction;
  if (!isRecord(prediction)) return undefined;
  if (prediction.likelihood !== "high" && prediction.likelihood !== "medium") return undefined;
  return scrubText(prediction.predictedDrop, 140) || undefined;
}

function readMatchPercent(product: Record<string, unknown>): number {
  if (typeof product.matchPercent === "number") return clampScore(product.matchPercent);
  const confidence = typeof product.confidence === "number" ? product.confidence : Number(product.confidence);
  if (!Number.isFinite(confidence) || confidence <= 0) return 0;
  if (confidence <= 1) return Math.round(confidence * 100);
  return clampScore(confidence);
}

function readPriceList(value: unknown, isHostBlocked: HostBlocker): SharedPrice[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => readPriceRow(item, isHostBlocked))
    .filter((price): price is SharedPrice => price !== null)
    .slice(0, 4);
}

function readEstimated(row: Record<string, unknown>): boolean {
  if (row.priceVerified === true || row.estimated === false) return false;
  return true;
}

function readPriceRow(value: unknown, isHostBlocked: HostBlocker): SharedPrice | null {
  if (!isRecord(value)) return null;
  const retailer = scrubText(value.retailer, 80);
  const price = coercePrice(value.price);
  if (!retailer || price === undefined) return null;
  return {
    retailer,
    price,
    url: sanitizePublicUrl(value.url, isHostBlocked),
    estimated: readEstimated(value),
  };
}

function readAlternatives(value: unknown, isHostBlocked: HostBlocker): SharedAlternative[] {
  if (!Array.isArray(value)) return [];
  const alternatives: SharedAlternative[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const name = scrubText(item.name, 120);
    const brand = scrubText(item.brand, 80);
    const price = coercePrice(item.price);
    if ((!name && !brand) || price === undefined) continue;
    const imageUrl = sanitizePublicUrl(item.imageUrl, isHostBlocked);
    const tier = isTier(item.tier) ? item.tier : "similar";
    alternatives.push({
      name,
      brand,
      price,
      url: sanitizePublicUrl(item.url, isHostBlocked),
      ...(imageUrl ? { imageUrl } : {}),
      reason: scrubText(item.reason, 200),
      tier,
      matchScore: clampScore(item.matchScore),
      estimated: readEstimated(item),
    });
    if (alternatives.length >= 4) break;
  }
  return alternatives;
}

function readSecondhand(value: unknown, isHostBlocked: HostBlocker): SharedVerdict["secondhand"] {
  const platforms = Array.isArray(value)
    ? value
    : isRecord(value) && value.available !== false && Array.isArray(value.platforms)
      ? value.platforms
      : [];
  const items: SharedVerdict["secondhand"] = [];
  for (const platform of platforms) {
    if (!isRecord(platform)) continue;
    const name = scrubText(platform.name, 80);
    const price = coercePrice(platform.price);
    if (!name || price === undefined) continue;
    items.push({
      name,
      price,
      url: sanitizePublicUrl(platform.url, isHostBlocked),
      estimated: true,
    });
    if (items.length >= 3) break;
  }
  return items;
}

function scrubList(value: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  const items: string[] = [];
  for (const item of value) {
    const text = scrubText(item, maxLen);
    if (!text) continue;
    items.push(text);
    if (items.length >= maxItems) break;
  }
  return items;
}

function scrubText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const cleaned = value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, max);
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function clampRating(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(Math.min(5, n) * 10) / 10;
}

function clampCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(10_000_000, Math.round(n));
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function isRecommendation(value: unknown): value is Recommendation {
  return typeof value === "string" && (RECOMMENDATIONS as readonly string[]).includes(value);
}

function isTier(value: unknown): value is Tier {
  return typeof value === "string" && (TIERS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
