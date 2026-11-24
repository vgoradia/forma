import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  isStripeConfigured: vi.fn(),
  customersList: vi.fn(),
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
      billingPortal: { sessions: { create: mocks.portalCreate } },
    }),
  };
});

import { POST } from "./route";

function signedInUser(appMetadata: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "buyer@example.com",
    app_metadata: appMetadata,
  };
}

beforeEach(() => {
  mocks.getUser.mockReset();
  mocks.isSupabaseConfigured.mockReset();
  mocks.isStripeConfigured.mockReset();
  mocks.customersList.mockReset();
  mocks.portalCreate.mockReset();
  mocks.isSupabaseConfigured.mockReturnValue(true);
  mocks.isStripeConfigured.mockReturnValue(true);
  mocks.portalCreate.mockResolvedValue({ url: "https://billing.stripe.com/session/portal" });
});

describe("POST /api/stripe/portal", () => {
  it("returns 401 when signed out", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    const response = await POST();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Sign in to manage your subscription.",
    });
    expect(mocks.customersList).not.toHaveBeenCalled();
    expect(mocks.portalCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when the signed-in user has no Stripe customer", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: signedInUser() } });
    mocks.customersList.mockResolvedValue({ data: [] });

    const response = await POST();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "No billing account found for this sign-in. Subscribe to Forma Plus first.",
    });
    expect(mocks.customersList).toHaveBeenCalledWith({ email: "buyer@example.com", limit: 1 });
    expect(mocks.portalCreate).not.toHaveBeenCalled();
  });

  it("opens a portal session for the stored Stripe customer", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: signedInUser({ stripe_customer_id: "cus_stored" }) },
    });

    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "https://billing.stripe.com/session/portal",
    });
    expect(mocks.customersList).not.toHaveBeenCalled();
    expect(mocks.portalCreate).toHaveBeenCalledWith({
      customer: "cus_stored",
      return_url: "https://www.shopwithforma.com/profile",
    });
  });

  it("falls back to the checkout email lookup when no customer id is stored", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: signedInUser({ stripe_customer_id: "  " }) },
    });
    mocks.customersList.mockResolvedValue({ data: [{ id: "cus_email" }] });

    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "https://billing.stripe.com/session/portal",
    });
    expect(mocks.customersList).toHaveBeenCalledWith({ email: "buyer@example.com", limit: 1 });
    expect(mocks.portalCreate).toHaveBeenCalledWith({
      customer: "cus_email",
      return_url: "https://www.shopwithforma.com/profile",
    });
  });
});
