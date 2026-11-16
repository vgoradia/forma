const DEFAULT_APP_URL = "https://www.shopwithforma.com";

export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return DEFAULT_APP_URL;

  try {
    const url = new URL(raw);
    return url.origin;
  } catch {
    return DEFAULT_APP_URL;
  }
}

/** Canonical origin for Supabase OAuth redirects (must match Supabase redirect allow list). */
export function getAuthSiteOrigin(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return window.location.origin;
    }
  }
  return getAppUrl();
}
