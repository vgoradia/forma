const MAX_QUERY_LENGTH = 500;
const MAX_URL_LENGTH = 2048;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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

  return false;
}

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return true;

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host.endsWith(".local")
  ) {
    return true;
  }

  if (host === "metadata.google.internal" || host === "metadata.goog") {
    return true;
  }

  if (isPrivateIpv4(host) || isPrivateIpv6(host)) {
    return true;
  }

  return false;
}

function isPrivateIpv4(host: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;

  const octets = match.slice(1).map(Number);
  if (octets.some((n) => n > 255)) return true;

  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;

  return false;
}

function isPrivateIpv6(host: string): boolean {
  const normalized = host.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80:")) return true;
  return false;
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
