const DEFAULT_APP_URL = "https://forma.app";

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
