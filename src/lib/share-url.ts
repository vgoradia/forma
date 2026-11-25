import { alignVerdictPriceText } from "./price-estimates";
import { formatAtRetailer, stripPlaceholderMentions } from "./product-label";
import { verdictSharePhrase } from "./shared-verdict";
import { coercePrice } from "./utils";

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
  priceEstimated?: boolean;
  path: string;
}): { title: string; text: string; url: string } {
  const url = buildShareUrl(options.path);
  const verdict = verdictSharePhrase(options.recommendation);
  const displayed = coercePrice(options.lowestPrice);
  const cleanedHeadline = stripPlaceholderMentions(options.headline);
  const pricedHeadline = displayed
    ? alignVerdictPriceText(cleanedHeadline, { displayed, shown: [displayed] })
    : cleanedHeadline;
  const headline = pricedHeadline.trim().replace(/[.!?…]+$/, "");
  const title = `${options.productTitle} — Forma says ${verdict}`;
  const pricePhrase = options.priceEstimated
    ? `Estimated price about ${options.lowestPrice}`
    : `Lowest price ${options.lowestPrice}`;
  const atRetailer = formatAtRetailer(options.retailer);
  const text = `Forma says ${verdict}: ${headline}. ${pricePhrase}${atRetailer ? ` ${atRetailer}` : ""}.`;
  return { title, text, url };
}
