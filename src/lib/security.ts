import { BlockList, isIP } from "node:net";

const MAX_QUERY_LENGTH = 500;
const MAX_URL_LENGTH = 2048;
const MAX_REDIRECT_LENGTH = 16_384;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Addresses the image proxy must never connect to. IPv4-mapped IPv6 is not
 * listed here: Node treats that prefix as covering every IPv4 address, so
 * mapped addresses are unwrapped and checked against the IPv4 ranges instead.
 */
const blockedAddresses = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
  ["2001:db8::", 32],
  ["2001::", 32],
  ["2002::", 16],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv6");
}

const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export function validateTextQuery(query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed) return "Query is required";
  if (trimmed.length > MAX_QUERY_LENGTH) {
    return `Query must be ${MAX_QUERY_LENGTH} characters or fewer`;
  }
  return null;
}

export function validateProductUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return "URL is required";
  if (trimmed.length > MAX_URL_LENGTH) return "URL is too long";

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "Invalid URL";
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return "URL must use http or https";
  }

  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    return "URL must use https";
  }

  if (isBlockedHostname(parsed.hostname)) {
    return "URL is not allowed";
  }

  return null;
}

export function validateImageUpload(
  bytes: ArrayBuffer,
  mimeType: string
): string | null {
  if (bytes.byteLength === 0) return "Image is empty";
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return "Image must be 8 MB or smaller";
  }

  const normalizedMime = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (!ALLOWED_IMAGE_MIMES.has(normalizedMime)) {
    return "Unsupported image type";
  }

  if (!looksLikeImage(bytes, normalizedMime)) {
    return "File does not look like a valid image";
  }

  return null;
}

function looksLikeImage(bytes: ArrayBuffer, mimeType: string): boolean {
  const view = new Uint8Array(bytes.slice(0, 12));
  if (view.length < 4) return false;

  if (mimeType.includes("jpeg") && view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) {
    return true;
  }
  if (
    mimeType.includes("png") &&
    view[0] === 0x89 &&
    view[1] === 0x50 &&
    view[2] === 0x4e &&
    view[3] === 0x47
  ) {
    return true;
  }
  if (
    mimeType.includes("gif") &&
    view[0] === 0x47 &&
    view[1] === 0x49 &&
    view[2] === 0x46
  ) {
    return true;
  }
  if (
    mimeType.includes("webp") &&
    view[0] === 0x52 &&
    view[1] === 0x49 &&
    view[2] === 0x46 &&
    view[3] === 0x46 &&
    view[8] === 0x57 &&
    view[9] === 0x45 &&
    view[10] === 0x42 &&
    view[11] === 0x50
  ) {
    return true;
  }
  if (mimeType.includes("heic") || mimeType.includes("heif")) {
    // ftyp box — common for HEIC from phones
    return (
      view[4] === 0x66 &&
      view[5] === 0x74 &&
      view[6] === 0x79 &&
      view[7] === 0x70
    );
  }

  return ALLOWED_IMAGE_MIMES.has(mimeType) && bytes.byteLength >= 64;
}

/** Hostname as it should be compared and resolved: no brackets, zone id, or trailing dot. */
export function normalizeHostname(hostname: string): string {
  let host = hostname.trim().toLowerCase();
  if (host.endsWith(".")) host = host.slice(0, -1);
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  const zone = host.indexOf("%");
  if (zone !== -1) host = host.slice(0, zone);
  return host;
}

function canonicalIpLiteral(hostname: string): string | null {
  const host = normalizeHostname(hostname);
  if (!host) return null;

  const fromUrl = (value: string): string | null => {
    try {
      const formatted = value.includes(":")
        ? new URL(`http://[${value}]`).hostname
        : new URL(`http://${value}`).hostname;
      const bare = normalizeHostname(formatted);
      return isIP(bare) ? bare : null;
    } catch {
      return null;
    }
  };

  if (isIP(host)) return fromUrl(host) ?? host;

  // Decimal, octal, and hex forms. The WHATWG parser rewrites these to dotted IPv4;
  // reject them when that rewrite lands on a non-public address.
  if (/^\d+$/.test(host) || host.includes("0x") || /^0\d+\./.test(host)) {
    return fromUrl(host);
  }

  return null;
}

/** IPv4 embedded in an IPv4-mapped IPv6 address, or null when the address is not mapped. */
function ipv4FromMapped(ipv6: string): string | null {
  const dotted = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ipv6);
  if (dotted) return isIP(dotted[1]) === 4 ? dotted[1] : null;

  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(ipv6);
  if (!hex) return null;
  const high = Number.parseInt(hex[1], 16);
  const low = Number.parseInt(hex[2], 16);
  return `${(high >> 8) & 255}.${high & 255}.${(low >> 8) & 255}.${low & 255}`;
}

export function isIpLiteral(hostname: string): boolean {
  return canonicalIpLiteral(hostname) !== null;
}

/** True for loopback, private, link-local, multicast, reserved, and tunnel addresses. */
export function isBlockedIpAddress(address: string): boolean {
  const canonical = canonicalIpLiteral(address);
  if (!canonical) return false;

  const mapped = ipv4FromMapped(canonical);
  if (mapped) return blockedAddresses.check(mapped, "ipv4");

  if (isIP(canonical) === 4) return blockedAddresses.check(canonical, "ipv4");
  if (isIP(canonical) === 6) return blockedAddresses.check(canonical, "ipv6");
  return true;
}

export function hasBlockedAddress(addresses: readonly string[]): boolean {
  return addresses.length === 0 || addresses.some((address) => isBlockedIpAddress(address));
}

export function isBlockedHostname(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (!host) return true;

  if (isBlockedIpAddress(host)) return true;

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }

  if (
    host === "metadata.google.internal" ||
    host === "metadata.goog" ||
    host === "metadata" ||
    host === "instance-data"
  ) {
    return true;
  }

  return false;
}

/**
 * Absolute URL of one redirect hop when that hop is still a public http(s) URL.
 * Relative and protocol-relative Location values are resolved against the current URL.
 */
export function safeRedirectTarget(currentUrl: string, location: string): string | null {
  const trimmed = location.trim();
  if (!trimmed || trimmed.length > MAX_REDIRECT_LENGTH) return null;

  let next: URL;
  try {
    next = new URL(trimmed, currentUrl);
  } catch {
    return null;
  }

  if (next.href.length > MAX_REDIRECT_LENGTH) return null;
  if (!isAllowedProxyImageUrl(next.href)) return null;
  return next.href;
}

export function isAllowedProxyImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
      return false;
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }
    return !isBlockedHostname(parsed.hostname);
  } catch {
    return false;
  }
}

export function sanitizeApiError(error: unknown, fallback = "Something went wrong"): string {
  if (process.env.NODE_ENV !== "production" && error instanceof Error) {
    return error.message;
  }
  return fallback;
}
