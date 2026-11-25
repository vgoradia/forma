type ServerEventProps = Record<string, string | number | boolean | null | undefined>;

const DEFAULT_HOST = "https://us.i.posthog.com";

function captureHost(): string | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return null;

  const raw = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_HOST;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Server-side PostHog capture. No-ops when NEXT_PUBLIC_POSTHOG_KEY is unset.
 * Uses the capture HTTP API so the webhook does not need posthog-node.
 * Failures are swallowed: billing must not depend on analytics.
 */
export async function captureServerEvent(
  name: string,
  distinctId: string,
  props?: ServerEventProps
): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  const host = captureHost();
  const id = distinctId.trim();
  if (!key || !host || !id || !name.trim()) return;

  const properties = Object.fromEntries(
    Object.entries(props ?? {}).filter(([, value]) => value !== undefined && value !== null)
  );

  try {
    await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event: name,
        distinct_id: id,
        properties: { ...properties, $lib: "forma-server" },
      }),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Analytics should never break the request that triggered it.
  }
}
