import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    enabled: true,
    tracesSampleRate: 0,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    beforeSend(event) {
      return scrubSentryEvent(event);
    },
  });
}

export function onRouterTransitionStart(href: string, navigationType: string) {
  if (!dsn) return;
  Sentry.captureRouterTransitionStart(href, navigationType);
}
