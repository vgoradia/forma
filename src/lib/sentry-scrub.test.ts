import { describe, expect, it } from "vitest";
import { scrubSentryEvent } from "./sentry-scrub";

describe("scrubSentryEvent", () => {
  it("removes cookies, auth headers, emails, and IP addresses", () => {
    const event = scrubSentryEvent({
      request: {
        cookies: { sb: "session" },
        headers: {
          cookie: "sb=session",
          Authorization: "Bearer secret",
          "x-forwarded-for": "203.0.113.5",
          "content-type": "application/json",
        },
        data: { email: "person@example.com", source: "landing" },
        query_string: "email=person@example.com",
      },
      user: {
        id: "user-1",
        email: "person@example.com",
        ip_address: "203.0.113.5",
        username: "person",
      },
      extra: { note: "reach person@example.com" },
    });

    expect(event.request?.cookies).toBeUndefined();
    expect(event.request?.headers).toEqual({ "content-type": "application/json" });
    expect(event.request?.data).toEqual({ source: "landing" });
    expect(event.request?.query_string).toBe("email=[email]");
    expect(event.user).toEqual({ id: "user-1" });
    expect(event.extra).toEqual({ note: "reach [email]" });
  });
});
