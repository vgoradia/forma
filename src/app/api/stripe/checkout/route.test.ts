import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  isStripeConfigured: vi.fn(),
  customersList: vi.fn(),
  subscriptionsList: vi.fn(),
  checkoutCreate: vi.fn(),
  portalCreate: vi.fn(),
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
  getStripePriceId: () => "price_test",
}));

vi.mock("@/lib/app-url", () => ({
  getAppUrl: () => "https://www.shopwithforma.com",
}));

vi.mock("@/lib/stripe/server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/stripe/server")>("@/lib/stripe/server");
  return {
    ...actual,
    getStripe: () => ({
      customers: { list: mocks.customersList },
      subscriptions: { list: mocks.subscriptionsList },
      checkout: { sessions: { create: mocks.checkoutCreate } },
      billingPortal: { sessions: { create: mocks.portalCreate } },
    }),
  };
});

import { POST } from "./route";

beforeEach(() => {
  mocks.getUser.mockReset();
  mocks.isSupabaseConfigured.mockReset();
  mocks.isStripeConfigured.mockReset();
  mocks.customersList.mockReset();
  mocks.subscriptionsList.mockReset();
  mocks.checkoutCreate.mockReset();
  mocks.portalCreate.mockReset();
  mocks.isSupabaseConfigured.mockReturnValue(true);
  mocks.isStripeConfigured.mockReturnValue(true);
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "user-1", email: "buyer@example.com" } },
  });
  mocks.customersList.mockResolvedValue({ data: [{ id: "cus_123" }] });
  mocks.subscriptionsList.mockResolvedValue({ data: [] });
  mocks.checkoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/c/test" });
  mocks.portalCreate.mockResolvedValue({ url: "https://billing.stripe.com/session/portal" });
});

describe("POST /api/stripe/checkout", () => {
  it("returns the billing portal when the email already has an active Plus subscription", async () => {
    mocks.subscriptionsList.mockResolvedValue({
      data: [{ id: "sub_1", customer: "cus_123", status: "active" }],
    });

    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "https://billing.stripe.com/session/portal",
    });
    expect(mocks.portalCreate).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "https://www.shopwithforma.com/profile",
    });
    expect(mocks.checkoutCreate).not.toHaveBeenCalled();
  });

  it("starts checkout when the email has no active Plus subscription", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "https://checkout.stripe.com/c/test",
    });
    expect(mocks.portalCreate).not.toHaveBeenCalled();
    expect(mocks.checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "cus_123",
        client_reference_id: "user-1",
      })
    );
  });
});
