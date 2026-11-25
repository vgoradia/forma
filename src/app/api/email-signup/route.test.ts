import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  rpc: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

import { POST } from "./route";

function request(body: unknown, headers?: HeadersInit) {
  return new Request("https://www.shopwithforma.com/api/email-signup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.10",
      "user-agent": "FormaTest",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.getSupabaseAdmin.mockReset();
  mocks.rpc.mockReset();
  mocks.insert.mockReset();
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.getSupabaseAdmin.mockReturnValue({
    rpc: mocks.rpc,
    from: () => ({ insert: mocks.insert }),
  });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("POST /api/email-signup", () => {
  it("rejects an invalid email before inserting", async () => {
    const response = await POST(request({ email: "not-an-email", source: "landing" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Enter a valid email address." });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("rejects a missing email and a body that is not JSON", async () => {
    const missing = await POST(request({ source: "landing" }));
    expect(missing.status).toBe(400);

    const invalid = await POST(request("{"));
    expect(invalid.status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("stores a lowercased email and asks Postgres to rate-limit the request", async () => {
    const response = await POST(request({ email: "Person@Example.com", source: "Landing page!" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "rate_limit_hit",
      expect.objectContaining({ p_key: "email-signup:ip:203.0.113.10", p_max: 8, p_window_seconds: 60 })
    );
    const emailCall = mocks.rpc.mock.calls.find((call) => String(call[1]?.p_key).startsWith("email-signup:email:"));
    expect(emailCall?.[1].p_key).not.toContain("person@example.com");
    expect(mocks.insert).toHaveBeenCalledWith({
      email: "person@example.com",
      source: "landingpage",
      user_agent: "FormaTest",
    });
  });

  it("treats a duplicate email as already subscribed", async () => {
    mocks.insert.mockResolvedValue({ error: { code: "23505", message: "duplicate key value" } });

    const response = await POST(request({ email: "person@example.com", source: "scan" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, alreadySubscribed: true });
  });

  it("returns a friendly error when the table is missing", async () => {
    mocks.insert.mockResolvedValue({
      error: {
        code: "PGRST205",
        message: "Could not find the table 'public.email_signups' in the schema cache",
      },
    });

    const response = await POST(request({ email: "person@example.com", source: "verdict" }));
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(503);
    expect(body.error).toMatch(/isn't available yet/i);
    expect(body.error).not.toMatch(/schema cache|PGRST205/i);
  });

  it("returns a friendly error when Supabase is not configured", async () => {
    mocks.getSupabaseAdmin.mockReturnValue(null);

    const response = await POST(request({ email: "person@example.com", source: "landing" }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Email signup isn't available yet. Please try again later.",
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("rate-limits with rate_limit_hit and does not insert", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });

    const response = await POST(request({ email: "person@example.com", source: "landing" }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
