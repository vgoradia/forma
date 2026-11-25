import { track } from "@vercel/analytics";

type EventProps = Record<string, string | number | boolean | null | undefined>;
type CleanProps = Record<string, string | number | boolean>;

type PostHogLike = {
  __loaded: boolean;
  init: (key: string, options: Record<string, unknown>) => void;
  capture: (name: string, properties?: CleanProps) => void;
};

const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

let posthogClient: Promise<PostHogLike | null> | null = null;

export function posthogKey(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ?? "";
}

export function posthogHost(): string {
  const raw = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return DEFAULT_POSTHOG_HOST;
    return url.origin;
  } catch {
    return DEFAULT_POSTHOG_HOST;
  }
}

/** Browser Do Not Track. Missing navigator (server, tests) is treated as not set. */
export function isDoNotTrack(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { msDoNotTrack?: string };
  const windowDnt =
    typeof window !== "undefined"
      ? (window as Window & { doNotTrack?: string }).doNotTrack
      : undefined;
  const value = nav.doNotTrack ?? nav.msDoNotTrack ?? windowDnt;
  return value === "1" || value === "yes";
}

function cleanProps(props?: EventProps): CleanProps | undefined {
  if (!props) return undefined;
  const clean = Object.fromEntries(
    Object.entries(props).filter((entry): entry is [string, string | number | boolean] => {
      const value = entry[1];
      return value !== undefined && value !== null;
    })
  );
  return Object.keys(clean).length > 0 ? clean : undefined;
}

function loadPostHog(key: string): Promise<PostHogLike | null> {
  if (!posthogClient) {
    posthogClient = import("posthog-js")
      .then(({ default: posthog }) => {
        if (!posthog.__loaded) {
          posthog.init(key, {
            api_host: posthogHost(),
            autocapture: false,
            capture_pageview: false,
            capture_pageleave: false,
            disable_session_recording: true,
            respect_dnt: true,
            person_profiles: "identified_only",
            persistence: "localStorage+cookie",
            advanced_disable_feature_flags: true,
          });
        }
        return posthog;
      })
      .catch(() => {
        posthogClient = null;
        return null;
      });
  }
  return posthogClient;
}

/**
 * Product events. Vercel Analytics always receives them.
 * PostHog is skipped when NEXT_PUBLIC_POSTHOG_KEY is unset or Do Not Track is on.
 * Session recording stays off.
 */
export function trackEvent(name: string, props?: EventProps) {
  const clean = cleanProps(props);

  try {
    track(name, clean);
  } catch {
    // Analytics should never break the app.
  }

  if (typeof window === "undefined") return;
  const key = posthogKey();
  if (!key || isDoNotTrack()) return;

  void loadPostHog(key)
    .then((posthog) => {
      if (!posthog || isDoNotTrack()) return;
      posthog.capture(name, clean);
    })
    .catch(() => {
      // Analytics should never break the app.
    });
}
