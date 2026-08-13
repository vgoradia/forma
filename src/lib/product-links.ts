function encodeQuery(query: string): string {
  return encodeURIComponent(query.trim());
}

/** Direct on-site search URLs — always land on the retailer, never Google. */
const RETAILER_SEARCH: Record<string, (query: string) => string> = {
  uniqlo: (q) => `https://www.uniqlo.com/us/en/search?q=${q}`,
  everlane: (q) => `https://www.everlane.com/search?q=${q}`,
  nordstrom: (q) => `https://www.nordstrom.com/sr?keyword=${q}`,
  zara: (q) => `https://www.zara.com/us/en/search?searchTerm=${q}`,
  amazon: (q) => `https://www.amazon.com/s?k=${q}`,
  hm: (q) => `https://www2.hm.com/en_us/search-results.html?q=${q}`,
  "h&m": (q) => `https://www2.hm.com/en_us/search-results.html?q=${q}`,
  cos: (q) => `https://www.cos.com/en_usd/search?q=${q}`,
  asos: (q) => `https://www.asos.com/us/search/?q=${q}`,
  aritzia: (q) => `https://www.aritzia.com/us/en/search?q=${q}`,
  lululemon: (q) => `https://shop.lululemon.com/search?Ntt=${q}`,
  nike: (q) => `https://www.nike.com/w?q=${q}`,
  gap: (q) => `https://www.gap.com/browse/search.do?searchText=${q}`,
  madewell: (q) => `https://www.madewell.com/search?q=${q}`,
  jcrew: (q) => `https://www.jcrew.com/search?Ntt=${q}`,
  "j.crew": (q) => `https://www.jcrew.com/search?Ntt=${q}`,
  reformation: (q) => `https://www.thereformation.com/search?q=${q}`,
  shopbop: (q) => `https://www.shopbop.com/s?keywords=${q}`,
  revolve: (q) => `https://www.revolve.com/r/Search.jsp?search=${q}`,
  ssense: (q) => `https://www.ssense.com/en-us/search?q=${q}`,
  farfetch: (q) => `https://www.farfetch.com/shopping/search/items.aspx?q=${q}`,
  target: (q) => `https://www.target.com/s?searchTerm=${q}`,
  depop: (q) => `https://www.depop.com/search/?q=${q}`,
  poshmark: (q) => `https://poshmark.com/search?query=${q}`,
  ebay: (q) => `https://www.ebay.com/sch/i.html?_nkw=${q}`,
  therealreal: (q) => `https://www.therealreal.com/products?keywords=${q}`,
  "the realreal": (q) => `https://www.therealreal.com/products?keywords=${q}`,
  footlocker: (q) => `https://www.footlocker.com/search?query=${q}`,
  "foot locker": (q) => `https://www.footlocker.com/search?query=${q}`,
  finishline: (q) => `https://www.finishline.com/search?query=${q}`,
  "finish line": (q) => `https://www.finishline.com/search?query=${q}`,
  jdsports: (q) => `https://www.jdsports.com/search/${q}/`,
  "jd sports": (q) => `https://www.jdsports.com/search/${q}/`,
  dickssportinggoods: (q) => `https://www.dickssportinggoods.com/search/SearchDisplay?searchTerm=${q}`,
  "dick's sporting goods": (q) => `https://www.dickssportinggoods.com/search/SearchDisplay?searchTerm=${q}`,
  hibbett: (q) => `https://www.hibbett.com/search?q=${q}`,
  zappos: (q) => `https://www.zappos.com/search?term=${q}`,
  stockx: (q) => `https://stockx.com/search?s=${q}`,
};

export const RETAILER_DOMAINS: Record<string, string> = {
  uniqlo: "uniqlo.com",
  everlane: "everlane.com",
  nordstrom: "nordstrom.com",
  zara: "zara.com",
  amazon: "amazon.com",
  hm: "hm.com",
  cos: "cos.com",
  asos: "asos.com",
  aritzia: "aritzia.com",
  lululemon: "lululemon.com",
  nike: "nike.com",
  gap: "gap.com",
  madewell: "madewell.com",
  jcrew: "jcrew.com",
  reformation: "thereformation.com",
  shopbop: "shopbop.com",
  revolve: "revolve.com",
  depop: "depop.com",
  poshmark: "poshmark.com",
  ebay: "ebay.com",
  therealreal: "therealreal.com",
  ssense: "ssense.com",
  farfetch: "farfetch.com",
  target: "target.com",
  footlocker: "footlocker.com",
  finishline: "finishline.com",
  jdsports: "jdsports.com",
  dickssportinggoods: "dickssportinggoods.com",
  hibbett: "hibbett.com",
  zappos: "zappos.com",
  stockx: "stockx.com",
};

function matchRetailerKey(label: string): string | undefined {
  const normalized = label.toLowerCase().replace(/[^a-z0-9&.\s-]/g, "").trim();

  if (RETAILER_SEARCH[normalized]) return normalized;

  for (const key of Object.keys(RETAILER_SEARCH)) {
    if (normalized.includes(key) || key.includes(normalized)) return key;
  }

  return undefined;
}

export function buildProductSearchUrl(retailer: string, brand: string, name: string): string {
  const query = encodeQuery(buildSearchQueryText(brand, name));
  const retailerKey = matchRetailerKey(retailer);

  if (retailerKey) return RETAILER_SEARCH[retailerKey](query);

  const brandKey = matchRetailerKey(brand);
  const retailerLooksLikeBrand =
    !retailer.trim() ||
    retailer.toLowerCase().includes(brand.toLowerCase()) ||
    brand.toLowerCase().includes(retailer.toLowerCase());

  if (brandKey && retailerLooksLikeBrand) {
    return RETAILER_SEARCH[brandKey](query);
  }

  return `https://www.amazon.com/s?k=${encodeQuery(`${buildSearchQueryText(brand, name)} ${retailer}`.trim())}`;
}

export function buildAlternativeUrl(brand: string, name: string): string {
  return buildProductSearchUrl(brand, brand, name);
}

export function buildSecondhandUrl(platform: string, brand: string, name: string): string {
  const query = encodeQuery(`${brand} ${name}`.trim());
  const key = matchRetailerKey(platform);
  if (key) return RETAILER_SEARCH[key](query);
  return `https://www.depop.com/search/?q=${query}`;
}

export function resolveProductUrl(
  url: string | undefined,
  retailer: string,
  brand: string,
  name: string
): string {
  const direct = url?.trim();
  if (direct && direct !== "#" && direct.startsWith("http") && !isGoogleUrl(direct)) {
    if (isProductDetailUrl(direct)) return direct;
  }
  return buildProductSearchUrl(retailer, brand, name);
}

export function resolveAlternativeUrl(
  url: string | undefined,
  brand: string,
  name: string
): string {
  const direct = url?.trim();
  if (direct && direct !== "#" && direct.startsWith("http") && !isGoogleUrl(direct)) {
    if (isProductDetailUrl(direct)) return direct;
  }
  return buildAlternativeUrl(brand, name);
}

export function resolveSecondhandUrl(
  _url: string | undefined,
  platform: string,
  brand: string,
  name: string
): string {
  return buildSecondhandUrl(platform, brand, name);
}

export function isGoogleUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.includes("google.") || hostname.includes("gstatic.com/shopping");
  } catch {
    return false;
  }
}

export function finalizeRetailerUrl(
  url: string | undefined,
  retailer: string,
  brand: string,
  name: string
): string {
  const trimmed = url?.trim();
  if (trimmed && trimmed !== "#" && isProductDetailUrl(trimmed)) return trimmed;
  return buildProductSearchUrl(retailer, brand, name);
}

export function finalizeAlternativeUrl(
  url: string | undefined,
  brand: string,
  name: string
): string {
  const trimmed = url?.trim();
  if (trimmed && trimmed !== "#" && isProductDetailUrl(trimmed)) return trimmed;
  return buildAlternativeUrl(brand, name);
}

/** True when the URL lands on a specific product page (not search/category). */
export function isProductDetailUrl(url?: string): boolean {
  if (!url?.trim() || !url.startsWith("http") || isGoogleUrl(url)) return false;

  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const host = parsed.hostname.toLowerCase();

    if (host.includes("nike.com") && /\/t\/[^/]+\/[a-z0-9-]+/i.test(path)) return true;
    if (host.includes("amazon.") && /\/dp\/|\/gp\/product\//i.test(path)) return true;
    if (host.includes("footlocker") && /\/product\//i.test(path)) return true;
    if (host.includes("finishline") && /\/product\//i.test(path)) return true;
    if (host.includes("jdsports") && /\/product\//i.test(path)) return true;
    if (host.includes("hibbett") && /\/product\//i.test(path)) return true;
    if (host.includes("dickssportinggoods") && /\/p\//i.test(path)) return true;
    if (host.includes("nordstrom.com") && /\/s\/[^/]+\/\d+/i.test(path)) return true;
    if (host.includes("uniqlo.com") && /\/products\/[^/?#]+/i.test(path)) return true;
    if (host.includes("zara.com") && /\.html$/i.test(path) && !path.includes("/search")) return true;
    if (host.includes("hm.com") && (/productpage\.|\/product\//i.test(path))) return true;
    if (host.includes("asos.com") && /\/prd\//i.test(path)) return true;
    if (host.includes("aritzia.com") && /\/product\//i.test(path)) return true;
    if (host.includes("lululemon.com") && /\/p\//i.test(path)) return true;
    if (host.includes("thereformation.com") && /\/products\//i.test(path)) return true;
    if (host.includes("everlane.com") && /\/products\//i.test(path)) return true;
    if (host.includes("revolve.com") && /\/dp\//i.test(path)) return true;
    if (host.includes("target.com") && /\/p\//i.test(path) && !path.includes("/s?")) return true;
    if (host.includes("ssense.com") && path.split("/").filter(Boolean).length >= 2 && !path.includes("/search")) {
      return true;
    }
    if (host.includes("farfetch.com") && /\/shopping\/[^/?#]+\/item-\d+/i.test(path)) return true;
    if (host.includes("shopbop.com") && /\/vp\//i.test(path)) return true;
    if (host.includes("stockx.com")) {
      const slug = path.split("/").filter(Boolean)[0];
      return Boolean(slug && slug.includes("-") && !slug.includes("search"));
    }
    if (host.includes("adidas.") && /\/[^/]+\/[A-Z0-9]+(?:\.html)?$/i.test(path)) return true;

    if (/\/products\/[^/?#]+/i.test(path) && !path.includes("/search")) return true;
    if (/\/product\/[^/?#]+/i.test(path) && !/\/products\?/i.test(path)) return true;
    if (/\/p\/[^/?#]+/i.test(path)) return true;
    if (/\/dp\/[A-Z0-9]{6,}/i.test(path)) return true;
    if (/\/t\/[^/]+\/[a-z0-9-]+/i.test(path)) return true;

    return false;
  } catch {
    return false;
  }
}

/** True for search pages, category browse URLs, and other non-PDP links. */
export function isGenericSearchUrl(url?: string): boolean {
  if (!url?.trim()) return true;
  if (isProductDetailUrl(url)) return false;

  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    const host = parsed.hostname.toLowerCase();
    const full = url.toLowerCase();

    if (host.includes("nike.com") && (path.startsWith("/w") || full.includes("/w?q="))) return true;

    return /\/search|\/sr\?|searchterm=|\/s\?k=|browse\/search|\/plp\/|\/collection\/|\/browse\/|\/w\?q=/i.test(
      full
    );
  } catch {
    return true;
  }
}

/** Unwrap Google redirect URLs and keep direct retailer product links. */
export function resolveRetailerLink(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;

  let candidate = raw.trim();
  try {
    for (let i = 0; i < 2; i++) {
      const parsed = new URL(candidate);
      const hostname = parsed.hostname.toLowerCase();

      if (hostname.includes("google.")) {
        const wrapped =
          parsed.searchParams.get("q") ??
          parsed.searchParams.get("url") ??
          parsed.searchParams.get("adurl");
        if (wrapped?.startsWith("http")) {
          candidate = wrapped;
          continue;
        }
        return undefined;
      }

      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.toString();
      }
      return undefined;
    }
  } catch {
    return undefined;
  }

  return isGoogleUrl(candidate) ? undefined : candidate;
}

function buildSearchQueryText(brand: string, name: string): string {
  const b = brand.trim();
  const n = name.trim();
  if (!b) return n;
  if (n.toLowerCase().startsWith(b.toLowerCase())) return n;
  return `${b} ${n}`;
}
