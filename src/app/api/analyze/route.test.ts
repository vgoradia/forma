import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { generateMockAnalysis } from "@/lib/mock-analysis";

const mocks = vi.hoisted(() => ({
  analyzeProduct: vi.fn(),
  createClient: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  rpc: vi.fn(),
  setUserPlan: vi.fn(),
  isStripeConfigured: vi.fn(),
}));

vi.mock("@/lib/ai", () => ({
  analyzeProduct: mocks.analyzeProduct,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: mocks.isSupabaseConfigured,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
  setUserPlan: mocks.setUserPlan,
}));

vi.mock("@/lib/stripe/config", () => ({
  isStripeConfigured: mocks.isStripeConfigured,
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: vi.fn(),
  findActivePlusSubscription: vi.fn(),
}));

import { POST } from "./route";

const usage = new Map<string, number>();
const hits = new Map<string, number>();
let currentUser: User | null = null;

function fakeUser(id = "user-1", plan?: "plus"): User {
  return {
    id,
    email: "buyer@example.com",
    app_metadata: plan ? { plan } : {},
    user_metadata: {},
  } as User;
}

function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

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

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new NextRequest("https://www.shopwithforma.com/api/analyze", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-vercel-forwarded-for": "203.0.113.10",
        ...headers,
      },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  usage.clear();
  hits.clear();
  currentUser = fakeUser();
  mocks.analyzeProduct.mockReset();
  mocks.createClient.mockReset();
  mocks.isSupabaseConfigured.mockReset();
  mocks.getSupabaseAdmin.mockReset();
  mocks.rpc.mockReset();
  mocks.setUserPlan.mockReset();
  mocks.isStripeConfigured.mockReset();
  mocks.analyzeProduct.mockResolvedValue(generateMockAnalysis("linen shirt"));
  mocks.isSupabaseConfigured.mockReturnValue(true);
  mocks.isStripeConfigured.mockReturnValue(false);
  mocks.setUserPlan.mockResolvedValue(true);
  mocks.createClient.mockImplementation(async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser } }) },
  }));
  mocks.rpc.mockImplementation(async (fn: string, args: Record<string, unknown>) => {
    if (fn === "rate_limit_hit") {
      const key = String(args.p_key);
      const max = Number(args.p_max);
      const count = (hits.get(key) ?? 0) + 1;
      hits.set(key, Math.min(count, max + 1));
      return { data: count <= max, error: null };
    }
    if (fn === "consume_scan") {
      const key = `${args.p_subject}|${args.p_month}`;
      const limit = Number(args.p_limit);
      const current = usage.get(key) ?? 0;
      if (current >= limit) return { data: [{ allowed: false, used: current }], error: null };
      const used = current + 1;
      usage.set(key, used);
      return { data: [{ allowed: true, used }], error: null };
    }
    if (fn === "release_scan") {
      const key = `${args.p_subject}|${args.p_month}`;
      usage.set(key, Math.max(0, (usage.get(key) ?? 0) - 1));
      return { data: null, error: null };
    }
    return { data: null, error: { message: `unexpected rpc ${fn}` } };
  });
  mocks.getSupabaseAdmin.mockReturnValue({ rpc: mocks.rpc });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.mocked(console.error).mockRestore();
  vi.mocked(console.warn).mockRestore();
});

describe("POST /api/analyze", () => {
  it("reserves a scan before calling the model and keeps it after success", async () => {
    const response = await post({ query: "linen shirt" });

    expect(response.status).toBe(200);
    const sequence = [
      ...mocks.rpc.mock.calls.map((call, index) => ({
        name: String(call[0]),
        order: mocks.rpc.mock.invocationCallOrder[index] ?? 0,
      })),
      {
        name: "analyze",
        order: mocks.analyzeProduct.mock.invocationCallOrder[0] ?? 0,
      },
    ]
      .sort((a, b) => a.order - b.order)
      .map((entry) => entry.name);

    expect(sequence).toEqual(["rate_limit_hit", "rate_limit_hit", "consume_scan", "analyze"]);
    expect(mocks.rpc.mock.calls.some((call) => call[0] === "release_scan")).toBe(false);
    expect(usage.get(`user:user-1|${monthKey()}`)).toBe(1);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "rate_limit_hit",
      expect.objectContaining({ p_key: "analyze:ip:203.0.113.10", p_max: 6, p_window_seconds: 60 })
    );
    expect(mocks.rpc).toHaveBeenCalledWith(
      "rate_limit_hit",
      expect.objectContaining({ p_key: "analyze:user:user-1", p_max: 6 })
    );
  });

  it("releases the reservation when analysis throws", async () => {
    const month = monthKey();
    usage.set(`user:user-1|${month}`, 7);
    mocks.analyzeProduct.mockRejectedValueOnce(new Error("model down"));

    const failed = await post({ query: "linen shirt" });
    expect(failed.status).toBe(500);
    expect(usage.get(`user:user-1|${month}`)).toBe(7);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "release_scan",
      expect.objectContaining({ p_subject: "user:user-1", p_month: month })
    );

    mocks.analyzeProduct.mockResolvedValue(generateMockAnalysis("linen shirt"));
    const recovered = await post({ query: "linen shirt" });
    expect(recovered.status).toBe(200);
    expect(usage.get(`user:user-1|${month}`)).toBe(8);

    const refused = await post({ query: "linen shirt" });
    expect(refused.status).toBe(402);
    await expect(refused.json()).resolves.toMatchObject({
      code: "scan_limit_reached",
      limit: 8,
      used: 8,
    });
  });

  it("releases the reservation when the request cannot be parsed", async () => {
    const month = monthKey();
    usage.set(`user:user-1|${month}`, 7);

    const response = await post({ query: "" });

    expect(response.status).toBe(400);
    expect(usage.get(`user:user-1|${month}`)).toBe(7);
    expect(mocks.analyzeProduct).not.toHaveBeenCalled();
  });

  it("returns guest_limit_reached for the 4th guest scan and prompts via that code", async () => {
    currentUser = null;

    for (let scan = 0; scan < 3; scan += 1) {
      const response = await post({ query: "linen shirt" });
      expect(response.status).toBe(200);
    }

    const blocked = await post({ query: "linen shirt" });
    expect(blocked.status).toBe(402);
    await expect(blocked.json()).resolves.toMatchObject({
      code: "guest_limit_reached",
      limit: 3,
      used: 3,
    });
    expect(mocks.analyzeProduct).toHaveBeenCalledTimes(3);

    const otherNetwork = await post(
      { query: "linen shirt" },
      { "x-vercel-forwarded-for": "198.51.100.50" }
    );
    expect(otherNetwork.status).toBe(200);
  });

  it("reserves Plus scans under the fair-use subject and limit", async () => {
    currentUser = fakeUser("user-9", "plus");

    const response = await post({ query: "linen shirt" });

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "consume_scan",
      expect.objectContaining({ p_subject: "plus:user-9", p_limit: 300 })
    );
  });

  it("rate limits analyze to 6 requests a minute per user id", async () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await post(
        { query: "linen shirt" },
        { "x-vercel-forwarded-for": `203.0.113.${attempt + 1}` }
      );
      expect(response.status).toBe(200);
    }

    const seventh = await post(
      { query: "linen shirt" },
      { "x-vercel-forwarded-for": "203.0.113.40" }
    );
    expect(seventh.status).toBe(429);
    expect(mocks.analyzeProduct).toHaveBeenCalledTimes(6);
  });

  it("rate limits analyze to 6 requests a minute per IP", async () => {
    currentUser = fakeUser("plus-user", "plus");

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await post({ query: "linen shirt" });
      expect(response.status).toBe(200);
    }

    const seventh = await post({ query: "linen shirt" });
    expect(seventh.status).toBe(429);
    expect(mocks.analyzeProduct).toHaveBeenCalledTimes(6);
  });

  it("prefers x-vercel-forwarded-for for the IP bucket", async () => {
    await post(
      { query: "linen shirt" },
      {
        "x-vercel-forwarded-for": "198.51.100.7, 10.0.0.1",
        "x-forwarded-for": "203.0.113.9",
        "x-real-ip": "192.0.2.8",
      }
    );

    expect(mocks.rpc).toHaveBeenCalledWith(
      "rate_limit_hit",
      expect.objectContaining({ p_key: "analyze:ip:198.51.100.7" })
    );
  });

  it("fails closed in production when the admin client or consume_scan is unavailable", async () => {
    await withNodeEnv("production", async () => {
      mocks.getSupabaseAdmin.mockReturnValue(null);
      const missing = await post({ query: "linen shirt" });
      expect(missing.status).toBe(503);
      await expect(missing.json()).resolves.toEqual({
        error: "Scans are temporarily unavailable. Try again in a minute.",
      });

      mocks.getSupabaseAdmin.mockReturnValue({ rpc: mocks.rpc });
      mocks.rpc.mockImplementation(async (fn: string) => {
        if (fn === "rate_limit_hit") return { data: true, error: null };
        return { data: null, error: { message: "relation scan_usage_monthly does not exist" } };
      });
      const broken = await post({ query: "linen shirt" });
      expect(broken.status).toBe(503);
      await expect(broken.json()).resolves.toMatchObject({
        error: "Scans are temporarily unavailable. Try again in a minute.",
        code: "scans_unavailable",
      });
      expect(mocks.analyzeProduct).not.toHaveBeenCalled();
    });
  });

  it("allows the scan in local dev when Supabase admin is missing", async () => {
    await withNodeEnv("development", async () => {
      mocks.getSupabaseAdmin.mockReturnValue(null);
      const response = await post({ query: "linen shirt" });
      expect(response.status).toBe(200);
      expect(mocks.analyzeProduct).toHaveBeenCalledTimes(1);
    });
  });
});
