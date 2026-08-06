import { track } from "@vercel/analytics";

type EventProps = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(name: string, props?: EventProps) {
  try {
    const clean = props
      ? Object.fromEntries(
          Object.entries(props).filter(([, v]) => v !== undefined && v !== null)
        )
      : undefined;
    track(name, clean);
  } catch {
    // Analytics should never break the app.
  }
}
