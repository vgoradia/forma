import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

import { ANALYZE_REQUESTS_PER_MINUTE, checkRateLimit, getClientIp } from "./rate-limit";

const hits = new Map<string, number>();

async function withNodeEnv<T>(value: string, run: () => Promise<T>): Promise<T> {
  const env = process.env as Record<string, string | undefined>;
  const previous = env.NODE_ENV;
  env.NODE_ENV = value;
  try {
    return await run();
  } finally {
    if (previous === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = previous;
  }
}

beforeEach(() => {
  hits.clear();
  mocks.getSupabaseAdmin.mockReset();
  mocks.rpc.mockReset();
  mocks.rpc.mockImplementation(async (fn: string, args: Record<string, unknown>) => {
    if (fn !== "rate_limit_hit") return { data: null, error: { message: "unexpected" } };
    const key = String(args.p_key);
    const max = Number(args.p_max);
    const count = (hits.get(key) ?? 0) + 1;
    hits.set(key, count);
    return { data: count <= max, error: null };
  });
  mocks.getSupabaseAdmin.mockReturnValue({ rpc: mocks.rpc });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.mocked(console.warn).mockRestore();
});

describe("getClientIp", () => {
  it("reads x-vercel-forwarded-for, then x-forwarded-for, then x-real-ip", () => {
    const vercel = new Request("https://www.shopwithforma.com/api/analyze", {
      headers: {
        "x-vercel-forwarded-for": "198.51.100.10, 10.0.0.1",
        "x-forwarded-for": "203.0.113.5",
        "x-real-ip": "192.0.2.1",
      },
    });
    expect(getClientIp(vercel)).toBe("198.51.100.10");

    const forwarded = new Request("https://www.shopwithforma.com/api/analyze", {
      headers: {
        "x-forwarded-for": "203.0.113.5, 10.0.0.2",
        "x-real-ip": "192.0.2.1",
      },
    });
    expect(getClientIp(forwarded)).toBe("203.0.113.5");

    const real = new Request("https://www.shopwithforma.com/api/analyze", {
      headers: { "x-real-ip": "192.0.2.1" },
    });
    expect(getClientIp(real)).toBe("192.0.2.1");
    expect(getClientIp(new Request("https://www.shopwithforma.com/api/analyze"))).toBe("unknown");
  });
});

describe("checkRateLimit", () => {
  it("allows six hits per key and rejects the seventh", async () => {
    for (let hit = 0; hit < ANALYZE_REQUESTS_PER_MINUTE; hit += 1) {
      await expect(checkRateLimit("analyze:ip:203.0.113.8", ANALYZE_REQUESTS_PER_MINUTE)).resolves.toEqual({
        ok: true,
      });
    }

    await expect(checkRateLimit("analyze:ip:203.0.113.8", ANALYZE_REQUESTS_PER_MINUTE)).resolves.toEqual({
      ok: false,
      retryAfter: 60,
    });
    await expect(checkRateLimit("analyze:ip:198.51.100.2", ANALYZE_REQUESTS_PER_MINUTE)).resolves.toEqual({
      ok: true,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("rate_limit_hit", {
      p_key: "analyze:ip:203.0.113.8",
      p_window_seconds: 60,
      p_max: ANALYZE_REQUESTS_PER_MINUTE,
    });
  });

  it("fails closed in production and stays permissive in local dev", async () => {
    await withNodeEnv("production", async () => {
      mocks.getSupabaseAdmin.mockReturnValue(null);
      await expect(checkRateLimit("analyze:ip:1")).resolves.toEqual({ ok: false, unavailable: true });

      mocks.getSupabaseAdmin.mockReturnValue({ rpc: mocks.rpc });
      mocks.rpc.mockResolvedValue({ data: null, error: { message: "rate_limits missing" } });
      await expect(checkRateLimit("analyze:ip:1")).resolves.toEqual({ ok: false, unavailable: true });
    });

    await withNodeEnv("development", async () => {
      mocks.getSupabaseAdmin.mockReturnValue(null);
      await expect(checkRateLimit("analyze:ip:1")).resolves.toEqual({ ok: true });

      mocks.getSupabaseAdmin.mockReturnValue({ rpc: mocks.rpc });
      mocks.rpc.mockRejectedValue(new Error("network"));
      await expect(checkRateLimit("analyze:ip:1")).resolves.toEqual({ ok: true });
    });
  });
});
