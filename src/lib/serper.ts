import { RETAILER_DOMAINS, resolveRetailerLink } from "./product-links";
import { coercePrice } from "./utils";

export interface SerperListing {
  url: string;
  price?: number;
  title: string;
  source: string;
  imageUrl?: string;
}

interface SerperShoppingItem {
  title?: string;
  source?: string;
  link?: string;
  price?: string;
  imageUrl?: string;
  thumbnail?: string;
  image?: string;
}

interface SerperImageItem {
  imageUrl?: string;
  image?: string;
  thumbnail?: string;
  title?: string;
}

interface SerperSearchResponse {
  knowledgeGraph?: { imageUrl?: string; image?: string };
  shopping?: SerperShoppingItem[];
  answerBox?: { imageUrl?: string; image?: string };
}

interface ProductMatchInfo {
  brand: string;
  name: string;
  colors: string[];
  category: string;
}

const COLOR_WORDS = [
  "black", "white", "green", "blue", "red", "navy", "grey", "gray", "beige",
  "brown", "pink", "purple", "yellow", "orange", "cream", "camel", "burgundy",
  "olive", "khaki", "charcoal", "ivory", "tan", "maroon", "teal",
];

async function serperPost<T>(endpoint: string, body: object, apiKey: string): Promise<T | null> {
  try {
    const response = await fetch(`https://google.serper.dev/${endpoint}`, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey.trim(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gl: "us", hl: "en", num: 15, ...body }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`Serper ${endpoint} failed:`, response.status, detail.slice(0, 200));
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(`Serper ${endpoint} error:`, error);
    return null;
  }
}

export function parseSerperPrice(priceStr?: string | number): number | undefined {
  return coercePrice(priceStr);
}

export function normalizeImageUrl(url?: string): string | undefined {
  if (!url?.trim()) return undefined;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.toString();
  } catch {
    return undefined;
  }
  return undefined;
}

function getDomainForLabel(label: string): string | undefined {
  const key = label.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [retailer, domain] of Object.entries(RETAILER_DOMAINS)) {
    const rk = retailer.replace(/[^a-z0-9]/g, "");
    if (key.includes(rk) || rk.includes(key)) return domain;
  }
  return undefined;
}

export function buildSearchQuery(
  product: ProductMatchInfo,
  userQuery?: string
): string {
  if (userQuery?.trim()) return userQuery.trim();

  const colorPart = product.colors.slice(0, 2).join(" ");
  return [product.brand, colorPart, product.name].filter(Boolean).join(" ").trim();
}

export function scoreListingTitle(
  title: string,
  product: ProductMatchInfo,
  userQuery?: string
): number {
  const t = title.toLowerCase();
  let score = 0;

  const brand = product.brand.toLowerCase();
  if (brand && t.includes(brand)) score += 25;

  for (const color of product.colors) {
    const c = color.toLowerCase();
    if (c && t.includes(c)) score += 45;
  }

  for (const color of COLOR_WORDS) {
    const wanted = product.colors.some((pc) => pc.toLowerCase().includes(color));
    if (!wanted && t.includes(color)) score -= 40;
  }

  for (const word of product.name.toLowerCase().split(/\s+/)) {
    if (word.length > 2 && t.includes(word)) score += 10;
  }

  if (userQuery) {
    for (const word of userQuery.toLowerCase().split(/\s+/)) {
      if (word.length > 2 && t.includes(word)) score += 15;
    }
  }

  if (product.category && t.includes(product.category.toLowerCase())) score += 8;

  return score;
}

export function extractItemImageUrl(item: SerperShoppingItem): string | undefined {
  return (
    normalizeImageUrl(item.imageUrl) ??
    normalizeImageUrl(item.image) ??
    normalizeImageUrl(item.thumbnail)
  );
}

function extractSerperImageItem(item: SerperImageItem): string | undefined {
  return (
    normalizeImageUrl(item.imageUrl) ??
    normalizeImageUrl(item.image) ??
    normalizeImageUrl(item.thumbnail)
  );
}

export function findFirstShoppingImage(items: SerperShoppingItem[]): string | undefined {
  for (const item of items) {
    const url = extractItemImageUrl(item);
    if (url) return url;
  }
  return undefined;
}

export function mergeListingImage(
  primary: SerperListing,
  listings: SerperListing[],
  rawItems?: SerperShoppingItem[]
): SerperListing {
  if (primary.imageUrl) return primary;

  const fromListing = listings.find((l) => l.imageUrl)?.imageUrl;
  if (fromListing) return { ...primary, imageUrl: fromListing };

  const fromRaw = rawItems ? findFirstShoppingImage(rawItems) : undefined;
  if (fromRaw) return { ...primary, imageUrl: fromRaw };

  return primary;
}

function itemToListing(
  item: SerperShoppingItem,
  minScore: number,
  product: ProductMatchInfo,
  userQuery?: string,
  requirePrice = true
): SerperListing | null {
  const title = item.title ?? "";
  const score = scoreListingTitle(title, product, userQuery);
  if (score < minScore) return null;

  const price = parseSerperPrice(item.price);
  const url = resolveRetailerLink(item.link);
  if (!url) return null;
  if (requirePrice && !price) return null;

  return {
    url,
    price,
    title,
    source: item.source ?? product.brand,
    imageUrl: extractItemImageUrl(item),
  };
}

function rawItemToListing(item: SerperShoppingItem, product: ProductMatchInfo): SerperListing | null {
  const url = resolveRetailerLink(item.link);
  if (!url) return null;

  return {
    url,
    price: parseSerperPrice(item.price),
    title: item.title ?? product.name,
    source: item.source ?? product.brand,
    imageUrl: extractItemImageUrl(item),
  };
}

/** Best-effort direct product links from raw Serper shopping results. */
export function pickDirectShoppingListings(
  items: SerperShoppingItem[],
  product: ProductMatchInfo,
  userQuery?: string
): SerperListing[] {
  const sharedImage = findFirstShoppingImage(items);

  return items
    .map((item) => {
      const listing = rawItemToListing(item, product);
      if (!listing) return null;
      const score = scoreListingTitle(listing.title, product, userQuery);
      const withImage = listing.imageUrl
        ? listing
        : sharedImage
          ? { ...listing, imageUrl: sharedImage }
          : listing;
      return { listing: withImage, score };
    })
    .filter((x): x is { listing: SerperListing; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.listing);
}

async function fetchShoppingItems(
  apiKey: string,
  query: string
): Promise<SerperShoppingItem[]> {
  const data = await serperPost<{ shopping?: SerperShoppingItem[] }>(
    "shopping",
    { q: query },
    apiKey
  );
  return data?.shopping ?? [];
}

function scoreAndSortListings(
  items: SerperShoppingItem[],
  product: ProductMatchInfo,
  retailer: string,
  userQuery?: string,
  requirePrice = true
): SerperListing[] {
  const domain = getDomainForLabel(retailer) ?? getDomainForLabel(product.brand);
  const sharedImage = findFirstShoppingImage(items);
  const minScore = requirePrice ? 10 : 0;

  return items
    .map((item) => {
      const listing = itemToListing(item, minScore, product, userQuery, requirePrice);
      if (!listing) return null;
      const domainBoost = domain && listing.url.includes(domain) ? 20 : 0;
      const score = scoreListingTitle(listing.title, product, userQuery) + domainBoost;
      const withImage =
        listing.imageUrl || sharedImage
          ? { ...listing, imageUrl: listing.imageUrl ?? sharedImage }
          : listing;
      return { listing: withImage, score };
    })
    .filter((x): x is { listing: SerperListing; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.listing);
}

export interface ShoppingLookupResult {
  query: string;
  items: SerperShoppingItem[];
  withPrice: SerperListing[];
  relaxed: SerperListing[];
  heroImage?: string;
}

export async function lookupProductListings(
  apiKey: string,
  product: ProductMatchInfo,
  retailer: string,
  userQuery?: string
): Promise<ShoppingLookupResult> {
  const query = buildSearchQuery(product, userQuery);
  const items = await fetchShoppingItems(apiKey, query);
  const withPrice = scoreAndSortListings(items, product, retailer, userQuery, true);
  const relaxed = scoreAndSortListings(items, product, retailer, userQuery, false);
  return {
    query,
    items,
    withPrice,
    relaxed,
    heroImage: findFirstShoppingImage(items),
  };
}

export async function findVerifiedListings(
  apiKey: string,
  product: ProductMatchInfo,
  retailer: string,
  userQuery?: string
): Promise<SerperListing[]> {
  const { withPrice, items } = await lookupProductListings(apiKey, product, retailer, userQuery);
  if (withPrice[0]) {
    return withPrice.map((listing, i) =>
      i === 0 ? mergeListingImage(listing, withPrice, items) : listing
    );
  }
  return withPrice;
}

export async function findBestListing(
  apiKey: string,
  product: ProductMatchInfo,
  retailer: string,
  userQuery?: string
): Promise<SerperListing | null> {
  const { withPrice, relaxed, items, heroImage } = await lookupProductListings(
    apiKey,
    product,
    retailer,
    userQuery
  );

  if (withPrice[0]) return mergeListingImage(withPrice[0], withPrice, items);
  if (relaxed[0]) return mergeListingImage(relaxed[0], relaxed, items);

  if (heroImage) {
    return {
      url: "",
      title: product.name,
      source: product.brand,
      imageUrl: heroImage,
    };
  }

  return null;
}

export async function findImageViaWebSearch(
  apiKey: string,
  query: string
): Promise<string | undefined> {
  const trimmed = query.trim();
  if (!trimmed) return undefined;

  const data = await serperPost<SerperSearchResponse>("search", { q: trimmed }, apiKey);
  if (!data) return undefined;

  const kgImage =
    normalizeImageUrl(data.knowledgeGraph?.imageUrl) ??
    normalizeImageUrl(data.knowledgeGraph?.image);
  if (kgImage) return kgImage;

  const shoppingImage = findFirstShoppingImage(data.shopping ?? []);
  if (shoppingImage) return shoppingImage;

  const answerImage =
    normalizeImageUrl(data.answerBox?.imageUrl) ?? normalizeImageUrl(data.answerBox?.image);
  if (answerImage) return answerImage;

  return undefined;
}

export async function findImageForQuery(
  apiKey: string,
  query: string
): Promise<string | undefined> {
  const trimmed = query.trim();
  if (!trimmed) return undefined;

  const data = await serperPost<{ images?: SerperImageItem[] }>(
    "images",
    { q: trimmed, num: 10 },
    apiKey
  );

  for (const item of data?.images ?? []) {
    const url = extractSerperImageItem(item);
    if (url) return url;
  }

  const webImage = await findImageViaWebSearch(apiKey, trimmed);
  if (webImage) return webImage;

  const shoppingItems = await fetchShoppingItems(apiKey, trimmed);
  return findFirstShoppingImage(shoppingItems);
}

export async function findProductImage(
  apiKey: string,
  product: ProductMatchInfo,
  userQuery?: string,
  retailer?: string
): Promise<string | undefined> {
  const query = buildSearchQuery(product, userQuery);
  const { heroImage, withPrice, relaxed, items } = await lookupProductListings(
    apiKey,
    product,
    retailer ?? product.brand,
    userQuery
  );

  if (heroImage) return heroImage;

  const listing = withPrice[0] ?? relaxed[0];
  if (listing?.imageUrl) return listing.imageUrl;

  const fromItems = findFirstShoppingImage(items);
  if (fromItems) return fromItems;

  const fromImages = await findImageForQuery(apiKey, query);
  if (fromImages) return fromImages;

  return findImageViaWebSearch(apiKey, query);
}

export function getSerperApiKey(): string | undefined {
  const raw = process.env.SERPER_API_KEY?.trim().replace(/^["']|["']$/g, "");
  if (!raw || raw === "your-serper-key-here") return undefined;
  return raw;
}
