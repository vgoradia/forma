import { verdictSharePhrase } from "./shared-verdict";

/** Build a shareable URL with referral tracking for growth metrics. */
export function buildShareUrl(path: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const url = new URL(path, base || "https://www.shopwithforma.com");

  if (!url.searchParams.has("utm_source")) {
    url.searchParams.set("utm_source", "share");
  }
  if (!url.searchParams.has("utm_medium")) {
    url.searchParams.set("utm_medium", "referral");
  }
  if (!url.searchParams.has("utm_campaign")) {
    url.searchParams.set("utm_campaign", "forma");
  }

  return url.toString();
}

/** Pre-filled share copy for group chats and social posts. */
export function getFormaShareCopy(url?: string): { text: string; url: string } {
  const shareUrl = url ?? buildShareUrl("/scan");
  const text =
    "Forma is the buy-or-skip button for viral fashion — screenshot a find and get prices, dupes, and a clear verdict. Free:";
  return { text, url: shareUrl };
}

export function getVerdictSharePayload(options: {
  productTitle: string;
  recommendation: string;
  headline: string;
  lowestPrice: string;
  retailer: string;
  path: string;
}): { title: string; text: string; url: string } {
  const url = buildShareUrl(options.path);
  const verdict = verdictSharePhrase(options.recommendation);
  const headline = options.headline.trim().replace(/[.!?…]+$/, "");
  const title = `${options.productTitle} — Forma says ${verdict}`;
  const text = `Forma says ${verdict}: ${headline}. Lowest price ${options.lowestPrice} at ${options.retailer}.`;
  return { title, text, url };
}
