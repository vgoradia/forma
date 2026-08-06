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
    return direct;
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
    return direct;
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
