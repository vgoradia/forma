import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  isStripeConfigured: vi.fn(),
  getStripe: vi.fn(),
  findActivePlusSubscription: vi.fn(),
  setUserPlan: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/stripe/config", () => ({
  isStripeConfigured: mocks.isStripeConfigured,
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: mocks.getStripe,
  findActivePlusSubscription: mocks.findActivePlusSubscription,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
  setUserPlan: mocks.setUserPlan,
}));

import { FREE_SCANS_PER_MONTH, GUEST_SCANS_PER_MONTH, PLUS_FAIR_USE_PER_MONTH } from "./scan-quota";
import {
  getServerScanUsage,
  releaseScan,
  reserveScan,
  resolveUserPlan,
} from "./scan-usage-server";

const usage = new Map<string, number>();
let readError: string | null = null;

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

function fakeUser(options: {
  id?: string;
  email?: string | null;
  appPlan?: unknown;
  userPlan?: unknown;
}): User {
  return {
    id: options.id ?? "user-1",
    email: options.email === undefined ? "buyer@example.com" : options.email,
    app_metadata: options.appPlan === undefined ? {} : { plan: options.appPlan },
    user_metadata: options.userPlan === undefined ? {} : { plan: options.userPlan },
  } as User;
}

beforeEach(() => {
  usage.clear();
  readError = null;
  mocks.isStripeConfigured.mockReset();
  mocks.getStripe.mockReset();
  mocks.findActivePlusSubscription.mockReset();
  mocks.setUserPlan.mockReset();
  mocks.rpc.mockReset();
  mocks.from.mockReset();
  mocks.getSupabaseAdmin.mockReset();
  mocks.getStripe.mockReturnValue({ stripe: true });
  mocks.setUserPlan.mockResolvedValue(true);
  mocks.isStripeConfigured.mockReturnValue(false);
  mocks.rpc.mockImplementation(async (fn: string, args: Record<string, unknown>) => {
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
  mocks.from.mockImplementation((table: string) => {
    const filters: Record<string, string> = {};
    const builder = {
      select: () => builder,
      eq: (column: string, value: string) => {
        filters[column] = value;
        return builder;
      },
      maybeSingle: async () => {
        if (readError) return { data: null, error: { message: readError } };
        if (table !== "scan_usage_monthly") {
          return { data: null, error: { message: "missing table" } };
        }
        const key = `${filters.subject_key}|${filters.month_key}`;
        if (!usage.has(key)) return { data: null, error: null };
        return { data: { scan_count: usage.get(key) }, error: null };
      },
    };
    return builder;
  });
  mocks.getSupabaseAdmin.mockReturnValue({ rpc: mocks.rpc, from: mocks.from });
});

describe("resolveUserPlan", () => {
  it("returns free for a signed-out visitor", async () => {
    await expect(resolveUserPlan(null)).resolves.toBe("free");
    expect(mocks.findActivePlusSubscription).not.toHaveBeenCalled();
  });

  it("ignores a self-set user_metadata plan when Stripe has no subscription", async () => {
    mocks.isStripeConfigured.mockReturnValue(true);
    mocks.findActivePlusSubscription.mockResolvedValue(null);

    await expect(resolveUserPlan(fakeUser({ userPlan: "plus" }))).resolves.toBe("free");
    expect(mocks.setUserPlan).not.toHaveBeenCalled();
  });

  it("ignores user_metadata when the Stripe lookup fails", async () => {
    mocks.isStripeConfigured.mockReturnValue(true);
    mocks.findActivePlusSubscription.mockRejectedValue(new Error("stripe down"));

    await expect(resolveUserPlan(fakeUser({ userPlan: "plus" }))).resolves.toBe("free");
    expect(mocks.setUserPlan).not.toHaveBeenCalled();
  });

  it("trusts app_metadata.plan plus without calling Stripe", async () => {
    mocks.isStripeConfigured.mockReturnValue(true);

    await expect(
      resolveUserPlan(fakeUser({ appPlan: "plus", userPlan: "free" }))
    ).resolves.toBe("plus");

    expect(mocks.getStripe).not.toHaveBeenCalled();
    expect(mocks.findActivePlusSubscription).not.toHaveBeenCalled();
    expect(mocks.setUserPlan).not.toHaveBeenCalled();
  });

  it("grants Plus from an active Stripe subscription and caches it on app_metadata", async () => {
    mocks.isStripeConfigured.mockReturnValue(true);
    mocks.findActivePlusSubscription.mockResolvedValue({ id: "sub_1" });

    await expect(resolveUserPlan(fakeUser({ id: "user-9", userPlan: "plus" }))).resolves.toBe(
      "plus"
    );

    expect(mocks.findActivePlusSubscription).toHaveBeenCalledWith(
      { stripe: true },
      "buyer@example.com"
    );
    expect(mocks.setUserPlan).toHaveBeenCalledWith("user-9", "plus");
  });

  it("returns free when Stripe is not configured and app_metadata is not plus", async () => {
    mocks.isStripeConfigured.mockReturnValue(false);

    await expect(resolveUserPlan(fakeUser({ userPlan: "plus", appPlan: "free" }))).resolves.toBe(
      "free"
    );
    expect(mocks.getStripe).not.toHaveBeenCalled();
  });

  it("returns free when the auth user has no email to look up", async () => {
    mocks.isStripeConfigured.mockReturnValue(true);

    await expect(resolveUserPlan(fakeUser({ email: null, userPlan: "plus" }))).resolves.toBe(
      "free"
    );
    expect(mocks.getStripe).not.toHaveBeenCalled();
  });
});

describe("reserveScan", () => {
  it("refuses the 9th free scan", async () => {
    const user = fakeUser({ id: "user-free" });

    for (let scan = 0; scan < FREE_SCANS_PER_MONTH; scan += 1) {
      const result = await reserveScan({ user, ip: "203.0.113.8" });
      expect(result.ok).toBe(true);
    }

    const ninth = await reserveScan({ user, ip: "203.0.113.8" });
    expect(ninth).toMatchObject({
      ok: false,
      status: 402,
      code: "scan_limit_reached",
      used: FREE_SCANS_PER_MONTH,
      limit: FREE_SCANS_PER_MONTH,
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "consume_scan",
      expect.objectContaining({ p_subject: "user:user-free", p_limit: FREE_SCANS_PER_MONTH })
    );
  });

  it("gives guests 3 scans and signed-in free users 8", async () => {
    const ip = "198.51.100.20";

    for (let scan = 0; scan < GUEST_SCANS_PER_MONTH; scan += 1) {
      await expect(reserveScan({ user: null, ip })).resolves.toMatchObject({ ok: true });
    }

    await expect(reserveScan({ user: null, ip })).resolves.toMatchObject({
      ok: false,
      status: 402,
      code: "guest_limit_reached",
      used: GUEST_SCANS_PER_MONTH,
      limit: GUEST_SCANS_PER_MONTH,
    });

    const user = fakeUser({ id: "signed-in" });
    for (let scan = 0; scan < FREE_SCANS_PER_MONTH; scan += 1) {
      await expect(reserveScan({ user, ip })).resolves.toMatchObject({ ok: true });
    }

    await expect(reserveScan({ user, ip })).resolves.toMatchObject({
      ok: false,
      code: "scan_limit_reached",
      limit: FREE_SCANS_PER_MONTH,
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "consume_scan",
      expect.objectContaining({ p_subject: expect.stringMatching(/^guest:/), p_limit: GUEST_SCANS_PER_MONTH })
    );
    expect(mocks.rpc).toHaveBeenCalledWith(
      "consume_scan",
      expect.objectContaining({ p_subject: "user:signed-in", p_limit: FREE_SCANS_PER_MONTH })
    );
  });

  it("caps Plus at the fair-use limit on a separate subject key", async () => {
    const plus = fakeUser({ id: "plus-user", appPlan: "plus" });

    for (let scan = 0; scan < PLUS_FAIR_USE_PER_MONTH; scan += 1) {
      const result = await reserveScan({ user: plus, ip: "203.0.113.40" });
      expect(result.ok).toBe(true);
    }

    await expect(reserveScan({ user: plus, ip: "203.0.113.40" })).resolves.toMatchObject({
      ok: false,
      status: 402,
      code: "fair_use_limit_reached",
      used: PLUS_FAIR_USE_PER_MONTH,
      limit: PLUS_FAIR_USE_PER_MONTH,
    });

    const free = fakeUser({ id: "plus-user", appPlan: "free" });
    await expect(reserveScan({ user: free, ip: "203.0.113.40" })).resolves.toMatchObject({
      ok: true,
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "consume_scan",
      expect.objectContaining({ p_subject: "plus:plus-user", p_limit: PLUS_FAIR_USE_PER_MONTH })
    );
    expect(mocks.rpc).toHaveBeenCalledWith(
      "consume_scan",
      expect.objectContaining({ p_subject: "user:plus-user", p_limit: FREE_SCANS_PER_MONTH })
    );
  });

  it("returns a reserved scan so a later one can proceed", async () => {
    const user = fakeUser({ id: "release-user" });
    const month = monthKey();
    usage.set(`user:release-user|${month}`, FREE_SCANS_PER_MONTH);

    await expect(reserveScan({ user, ip: "203.0.113.7" })).resolves.toMatchObject({
      ok: false,
      code: "scan_limit_reached",
    });

    await releaseScan("user:release-user", month);

    await expect(reserveScan({ user, ip: "203.0.113.7" })).resolves.toMatchObject({
      ok: true,
      reserved: true,
    });
  });

  it("fails closed in production when Supabase or the RPC is unavailable", async () => {
    const user = fakeUser({ id: "user-1" });

    await withNodeEnv("production", async () => {
      mocks.getSupabaseAdmin.mockReturnValue(null);
      await expect(reserveScan({ user, ip: "203.0.113.1" })).resolves.toMatchObject({
        ok: false,
        status: 503,
        code: "scans_unavailable",
        message: "Scans are temporarily unavailable. Try again in a minute.",
      });

      mocks.getSupabaseAdmin.mockReturnValue({ rpc: mocks.rpc, from: mocks.from });
      mocks.rpc.mockResolvedValue({
        data: null,
        error: { message: "function consume_scan does not exist" },
      });
      await expect(reserveScan({ user, ip: "203.0.113.1" })).resolves.toMatchObject({
        ok: false,
        status: 503,
        message: "Scans are temporarily unavailable. Try again in a minute.",
      });
    });
  });

  it("stays permissive in local dev when the usage backend is missing", async () => {
    await withNodeEnv("development", async () => {
      mocks.getSupabaseAdmin.mockReturnValue(null);
      await expect(reserveScan({ user: null, ip: "203.0.113.1" })).resolves.toMatchObject({
        ok: true,
        reserved: false,
      });

      mocks.getSupabaseAdmin.mockReturnValue({ rpc: mocks.rpc, from: mocks.from });
      mocks.rpc.mockResolvedValue({ data: null, error: { message: "down" } });
      await expect(reserveScan({ user: fakeUser({}), ip: "203.0.113.1" })).resolves.toMatchObject({
        ok: true,
        reserved: false,
      });
    });
  });
});

describe("getServerScanUsage", () => {
  it("reports enforced false when the usage read fails", async () => {
    readError = "relation scan_usage_monthly does not exist";

    await expect(getServerScanUsage("user:user-1", FREE_SCANS_PER_MONTH)).resolves.toMatchObject({
      enforced: false,
      used: 0,
      allowed: true,
      limit: FREE_SCANS_PER_MONTH,
    });
  });

  it("reports enforced false when the admin client is missing", async () => {
    mocks.getSupabaseAdmin.mockReturnValue(null);

    const usageState = await getServerScanUsage("guest:abc", GUEST_SCANS_PER_MONTH);
    expect(usageState.enforced).toBe(false);
  });

  it("returns the stored count when the read succeeds", async () => {
    usage.set(`user:user-1|${monthKey()}`, 2);

    await expect(getServerScanUsage("user:user-1", FREE_SCANS_PER_MONTH)).resolves.toEqual({
      allowed: true,
      remaining: 6,
      used: 2,
      limit: FREE_SCANS_PER_MONTH,
      enforced: true,
    });
  });
});
