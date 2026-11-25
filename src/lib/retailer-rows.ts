import { RETAILER_DOMAINS } from "./product-links";
import { sanitizeLabel } from "./product-label";
import { formatPrice } from "./utils";

const PRETTY_NAMES: Record<string, string> = {
  hm: "H&M",
  "h&m": "H&M",
  jcrew: "J.Crew",
  "j.crew": "J.Crew",
  ssense: "SSENSE",
  asos: "ASOS",
  "the realreal": "The RealReal",
  therealreal: "The RealReal",
};

export interface RetailerPriceFields {
  retailer: string;
  price: number;
  url?: string;
  priceHigh?: number;
}

export function normalizeRetailerKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function prettyRetailerKey(key: string): string {
  if (PRETTY_NAMES[key]) return PRETTY_NAMES[key];
  return key.replace(/(^|\s|-)([a-z])/g, (_lead, boundary: string, char: string) => boundary + char.toUpperCase());
}

/** "Nordstrom" from https://www.nordstrom.com/s/dress, or "" when the URL has no hostname. */
export function retailerNameFromUrl(url: string | undefined | null): string {
  if (!url || url === "#") return "";
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
  if (!host || host === "localhost" || host.endsWith(".local")) return "";

  const matches = Object.entries(RETAILER_DOMAINS).filter(
    ([, domain]) => host === domain || host.endsWith(`.${domain}`)
  );
  if (matches.length > 0) {
    const key = matches
      .map(([name]) => name)
      .sort((a, b) => {
        const score = (value: string) =>
          (value.includes(" ") ? 20 : 0) + (value.includes("&") ? 10 : 0) + value.length;
        return score(b) - score(a);
      })[0];
    return key ? prettyRetailerKey(key) : "";
  }

  const labels = host.split(".").filter(Boolean);
  const sld = labels.length >= 2 ? labels[labels.length - 2] : labels[0];
  if (!sld || /^(com|net|org|co|shop|store|www|m)$/.test(sld)) return "";
  return prettyRetailerKey(sld.replace(/[-_]+/g, " "));
}

/** A store name safe to render, using the hostname when the label is blank. */
export function resolveRetailerLabel(retailer: unknown, url?: unknown): string {
  const fromName = sanitizeLabel(retailer);
  if (fromName) return fromName;
  return retailerNameFromUrl(typeof url === "string" ? url : undefined);
}

function preferredRetailerLabel(labels: string[]): string {
  const cleaned = labels.map((label) => label.trim().replace(/\s+/g, " ")).filter(Boolean);
  const mixed = cleaned.filter((label) => label !== label.toUpperCase() && /[A-Z]/.test(label));
  const pool = mixed.length > 0 ? mixed : cleaned;
  pool.sort((a, b) => (b.match(/[A-Z]/g)?.length ?? 0) - (a.match(/[A-Z]/g)?.length ?? 0));
  return pool[0] ?? "";
}

function collapseGroup<T extends RetailerPriceFields>(rows: T[]): T {
  const priced = rows.flatMap((row) => {
    const values = [row.price];
    if (row.priceHigh && row.priceHigh > row.price) values.push(row.priceHigh);
    return values.filter((value) => Number.isFinite(value) && value > 0);
  });
  const cheapest = rows.reduce((best, row) => (row.price < best.price ? row : best));
  if (priced.length === 0) {
    return {
      ...cheapest,
      retailer: preferredRetailerLabel(rows.map((row) => row.retailer)),
      priceHigh: undefined,
    } as T;
  }
  const min = Math.min(...priced);
  const max = Math.max(...priced);
  const urlCarrier =
    rows.find((row) => row.price === min && row.url && row.url !== "#") ??
    rows.find((row) => row.url && row.url !== "#");
  const priceHigh = max - min >= 0.5 ? max : undefined;
  return {
    ...cheapest,
    retailer: preferredRetailerLabel(rows.map((row) => row.retailer)),
    price: min,
    url: urlCarrier?.url || cheapest.url,
    priceHigh,
  } as T;
}

/**
 * One row per retailer. Blank names are filled from the URL or dropped.
 * Differing quotes become a low–high range; identical quotes stay a single price.
 */
export function collapseRetailerPrices<T extends RetailerPriceFields>(rows: readonly T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const retailer = resolveRetailerLabel(row.retailer, row.url);
    if (!retailer) continue;
    const key = normalizeRetailerKey(retailer);
    const next = { ...row, retailer };
    const bucket = groups.get(key);
    if (bucket) bucket.push(next);
    else groups.set(key, [next]);
  }

  return [...groups.values()]
    .map((bucket) => collapseGroup(bucket))
    .sort((a, b) => a.price - b.price || a.retailer.localeCompare(b.retailer));
}

export function formatRetailerPrice(price: number, priceHigh?: number): string {
  const low = formatPrice(price);
  if (priceHigh !== undefined && priceHigh - price >= 0.5) {
    return `${low}–${formatPrice(priceHigh)}`;
  }
  return low;
}
