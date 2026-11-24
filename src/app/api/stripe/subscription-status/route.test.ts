import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  isStripeConfigured: vi.fn(),
  getStripe: vi.fn(),
  findActivePlusSubscription: vi.fn(),
  setUserPlan: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
  }),
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: mocks.isSupabaseConfigured,
}));

vi.mock("@/lib/stripe/config", () => ({
  isStripeConfigured: mocks.isStripeConfigured,
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: mocks.getStripe,
  findActivePlusSubscription: mocks.findActivePlusSubscription,
}));

vi.mock("@/lib/supabase/admin", () => ({
  setUserPlan: mocks.setUserPlan,
}));

import { GET } from "./route";

function user(appPlan?: unknown, userPlan?: unknown) {
  return {
    id: "user-1",
    email: "buyer@example.com",
    app_metadata: appPlan === undefined ? {} : { plan: appPlan },
    user_metadata: userPlan === undefined ? {} : { plan: userPlan },
  };
}

beforeEach(() => {
  mocks.getUser.mockReset();
  mocks.isSupabaseConfigured.mockReset();
  mocks.isStripeConfigured.mockReset();
  mocks.getStripe.mockReset();
  mocks.findActivePlusSubscription.mockReset();
  mocks.setUserPlan.mockReset();
  mocks.isSupabaseConfigured.mockReturnValue(true);
  mocks.isStripeConfigured.mockReturnValue(true);
  mocks.getStripe.mockReturnValue({ stripe: true });
  mocks.setUserPlan.mockResolvedValue(true);
});

describe("GET /api/stripe/subscription-status", () => {
  it("does not treat user_metadata.plan as Plus", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: user(undefined, "plus") } });
    mocks.findActivePlusSubscription.mockResolvedValue(null);

    const response = await GET();

    await expect(response.json()).resolves.toEqual({ plan: "free", configured: true });
    expect(mocks.setUserPlan).not.toHaveBeenCalled();
  });

  it("downgrades app_metadata when Stripe has no active subscription", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: user("plus", "plus") } });
    mocks.findActivePlusSubscription.mockResolvedValue(null);

    const response = await GET();

    await expect(response.json()).resolves.toEqual({ plan: "free", configured: true });
    expect(mocks.setUserPlan).toHaveBeenCalledWith("user-1", "free");
  });

  it("reports Plus from a live Stripe subscription and stores it on app_metadata", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: user("free") } });
    mocks.findActivePlusSubscription.mockResolvedValue({ id: "sub_1" });

    const response = await GET();

    await expect(response.json()).resolves.toEqual({ plan: "plus", configured: true });
    expect(mocks.setUserPlan).toHaveBeenCalledWith("user-1", "plus");
  });

  it("keeps a server-written Plus plan when Stripe is unavailable", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: user("plus", "free") } });
    mocks.findActivePlusSubscription.mockRejectedValue(new Error("down"));

    const response = await GET();

    await expect(response.json()).resolves.toEqual({ plan: "plus", configured: true });
    expect(mocks.setUserPlan).not.toHaveBeenCalled();
  });

  it("does not fall back to user_metadata when Stripe is unavailable", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: user(undefined, "plus") } });
    mocks.findActivePlusSubscription.mockRejectedValue(new Error("down"));

    const response = await GET();

    await expect(response.json()).resolves.toEqual({ plan: "free", configured: true });
  });
});
