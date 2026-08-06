/** Client-safe affiliate + tracking params for outbound retailer links. */
export function applyAffiliateParams(url: string): string {
  if (!url || url === "#") return url;

  try {
    const parsed = new URL(url);

    if (!parsed.searchParams.has("utm_source")) {
      parsed.searchParams.set("utm_source", "forma");
    }
    if (!parsed.searchParams.has("utm_medium")) {
      parsed.searchParams.set("utm_medium", "affiliate");
    }

    const amazonTag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG;
    if (amazonTag && parsed.hostname.includes("amazon.")) {
      parsed.searchParams.set("tag", amazonTag);
    }

    return parsed.toString();
  } catch {
    return url;
  }
}
