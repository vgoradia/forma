import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  maybeSingle: vi.fn(),
  createClient: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  isStripeConfigured: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
  setUserPlan: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: mocks.isSupabaseConfigured,
}));

vi.mock("@/lib/stripe/config", () => ({
  isStripeConfigured: mocks.isStripeConfigured,
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: vi.fn(),
  findActivePlusSubscription: vi.fn(),
}));

import { GET } from "./route";

const filters: Array<[string, string]> = [];
let currentUser: User | null = null;

function fakeUser(plan?: "plus"): User {
  return {
    id: "user-1",
    email: "buyer@example.com",
    app_metadata: plan ? { plan } : {},
    user_metadata: {},
  } as User;
}

function request(headers: Record<string, string> = {}) {
  return GET(
    new NextRequest("https://www.shopwithforma.com/api/scan-usage", {
      headers: { "x-forwarded-for": "203.0.113.15", ...headers },
    })
  );
}

beforeEach(() => {
  filters.length = 0;
  currentUser = null;
  mocks.maybeSingle.mockReset();
  mocks.getSupabaseAdmin.mockReset();
  mocks.createClient.mockReset();
  mocks.isSupabaseConfigured.mockReset();
  mocks.isStripeConfigured.mockReset();
  mocks.isSupabaseConfigured.mockReturnValue(true);
  mocks.isStripeConfigured.mockReturnValue(false);
  mocks.maybeSingle.mockResolvedValue({ data: { scan_count: 0 }, error: null });
  mocks.createClient.mockImplementation(async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser } }) },
  }));
  mocks.getSupabaseAdmin.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: (column: string, value: string) => {
          filters.push([column, value]);
          return {
            eq: (column2: string, value2: string) => {
              filters.push([column2, value2]);
              return { maybeSingle: mocks.maybeSingle };
            },
          };
        },
      }),
    }),
  });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.mocked(console.warn).mockRestore();
});

describe("GET /api/scan-usage", () => {
  it("returns enforced false when the usage read fails", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "relation scan_usage_monthly does not exist" },
    });

    const response = await request();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.enforced).toBe(false);
    expect(body.plan).toBe("free");
    expect(body.limit).toBe(3);
  });

  it("returns enforced false when the admin client is missing", async () => {
    mocks.getSupabaseAdmin.mockReturnValue(null);

    const response = await request();
    const body = await response.json();
    expect(body.enforced).toBe(false);
  });

  it("uses the guest cap for signed-out visitors and the free cap for signed-in users", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { scan_count: 3 }, error: null });
    const guest = await request();
    await expect(guest.json()).resolves.toMatchObject({
      plan: "free",
      enforced: true,
      used: 3,
      limit: 3,
      remaining: 0,
      allowed: false,
    });
    expect(filters.some(([, value]) => String(value).startsWith("guest:"))).toBe(true);

    filters.length = 0;
    currentUser = fakeUser();
    mocks.maybeSingle.mockResolvedValue({ data: { scan_count: 2 }, error: null });
    const member = await request();
    await expect(member.json()).resolves.toMatchObject({
      plan: "free",
      enforced: true,
      used: 2,
      limit: 8,
      remaining: 6,
      allowed: true,
    });
    expect(filters).toContainEqual(["subject_key", "user:user-1"]);
  });

  it("reads the Plus fair-use counter", async () => {
    currentUser = fakeUser("plus");
    mocks.maybeSingle.mockResolvedValue({ data: { scan_count: 10 }, error: null });

    const response = await request();
    await expect(response.json()).resolves.toMatchObject({
      plan: "plus",
      enforced: true,
      used: 10,
      limit: 300,
      remaining: 290,
      allowed: true,
    });
    expect(filters).toContainEqual(["subject_key", "plus:user-1"]);
  });
});
