export function proxiedImageUrl(url: string): string {
  if (url.startsWith("data:") || url.startsWith("/api/image")) return url;
  return `/api/image?url=${encodeURIComponent(url)}`;
}

/** Always proxy external http(s) URLs so retailer/CDN hotlink blocks don't break production. */
export function getDisplayImageSrc(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("data:") || trimmed.startsWith("/")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return proxiedImageUrl(trimmed);
  }
  return trimmed;
}
