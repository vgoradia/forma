const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "proxy-authorization",
  "set-cookie",
  "x-forwarded-for",
  "x-real-ip",
]);

const SENSITIVE_USER_FIELDS = ["email", "ip_address", "username", "name"] as const;

type ScrubbableEvent = {
  request?: {
    cookies?: unknown;
    data?: unknown;
    env?: unknown;
    headers?: Record<string, unknown>;
    query_string?: unknown;
  };
  user?: Record<string, unknown>;
  extra?: Record<string, unknown>;
};

export function redactEmails(value: string): string {
  return value.replace(EMAIL_PATTERN, "[email]");
}

function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (typeof value === "string") return redactEmails(value);
  if (Array.isArray(value)) return value.map((entry) => scrubValue(entry, depth + 1));
  if (!value || typeof value !== "object") return value;

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key.toLowerCase() === "email" || key.toLowerCase() === "cookie" || key.toLowerCase() === "cookies") {
      continue;
    }
    output[key] = scrubValue(entry, depth + 1);
  }
  return output;
}

/** Strip cookies, auth headers, emails, and IP addresses before an event leaves the app. */
export function scrubSentryEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.env;
    if (event.request.headers) {
      for (const key of Object.keys(event.request.headers)) {
        if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
          delete event.request.headers[key];
        }
      }
    }
    if (typeof event.request.data === "string") {
      event.request.data = redactEmails(event.request.data);
    } else if (event.request.data && typeof event.request.data === "object") {
      event.request.data = scrubValue(event.request.data);
    }
    if (typeof event.request.query_string === "string") {
      event.request.query_string = redactEmails(event.request.query_string);
    }
  }

  if (event.user) {
    for (const field of SENSITIVE_USER_FIELDS) {
      delete event.user[field];
    }
  }

  if (event.extra) {
    event.extra = scrubValue(event.extra) as T["extra"];
  }

  return event;
}
