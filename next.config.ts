import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

function analyticsConnectSources(): string {
  const sources = [
    "https://*.ingest.sentry.io",
    "https://*.ingest.us.sentry.io",
    "https://*.ingest.de.sentry.io",
    "https://us.i.posthog.com",
    "https://eu.i.posthog.com",
    "https://us-assets.i.posthog.com",
    "https://eu-assets.i.posthog.com",
  ];
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
  if (host) {
    try {
      const origin = new URL(host).origin;
      if (origin.startsWith("https://") && !sources.includes(origin)) sources.push(origin);
    } catch {
      // A bad host stays out of the policy. Analytics no-ops without a valid URL.
    }
  }
  return sources.join(" ");
}

function contentSecurityPolicy(): string {
  // React's dev overlay uses eval. Production bundles do not, so omit it there.
  const isDev = process.env.NODE_ENV === "development";
  const scriptSrc = [
    "script-src 'self' 'unsafe-inline'",
    isDev ? "'unsafe-eval'" : "",
    "https://va.vercel-scripts.com https://*.vercel-scripts.com",
    "https://us-assets.i.posthog.com https://eu-assets.i.posthog.com",
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://vitals.vercel-insights.com https://va.vercel-scripts.com ${analyticsConnectSources()}`,
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          ...securityHeaders,
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy(),
          },
        ],
      },
    ];
  },
};

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();

export default sentryAuthToken
  ? withSentryConfig(nextConfig, {
      authToken: sentryAuthToken,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      telemetry: false,
      silent: !process.env.CI,
      sourcemaps: { disable: false },
      errorHandler(error: Error) {
        console.warn("Sentry source map upload skipped:", error.message);
      },
      webpack: {
        treeshake: {
          removeDebugLogging: true,
          removeTracing: true,
        },
      },
    })
  : nextConfig;
