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
    "I use Forma before buying anything online — paste a screenshot or link and it finds the lowest price, dupes, and tells you buy/wait/skip. Free:";
  return { text, url: shareUrl };
}
