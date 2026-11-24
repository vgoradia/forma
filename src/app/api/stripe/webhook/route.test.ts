import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isStripeConfigured: vi.fn(),
  getStripeWebhookSecret: vi.fn(),
  constructEvent: vi.fn(),
  setUserPlan: vi.fn(),
}));

vi.mock("@/lib/stripe/config", () => ({
  isStripeConfigured: mocks.isStripeConfigured,
  getStripeWebhookSecret: mocks.getStripeWebhookSecret,
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mocks.constructEvent },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  setUserPlan: mocks.setUserPlan,
}));

import { POST } from "./route";

function post() {
  return POST(
    new Request("https://www.shopwithforma.com/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig_test" },
      body: "{}",
    })
  );
}

function subscription(status: string, userId: string | null = "user-1") {
  return {
    status,
    metadata: userId ? { supabase_user_id: userId } : {},
    items: { data: [] },
  };
}

beforeEach(() => {
  mocks.isStripeConfigured.mockReset();
  mocks.getStripeWebhookSecret.mockReset();
  mocks.constructEvent.mockReset();
  mocks.setUserPlan.mockReset();
  mocks.isStripeConfigured.mockReturnValue(true);
  mocks.getStripeWebhookSecret.mockReturnValue("whsec_test");
  mocks.setUserPlan.mockResolvedValue(true);
});

describe("POST /api/stripe/webhook", () => {
  it("rejects an invalid signature without changing a plan", async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error("bad sig");
    });

    const response = await post();

    expect(response.status).toBe(400);
    expect(mocks.setUserPlan).not.toHaveBeenCalled();
  });

  it("grants Plus when subscription checkout completes", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "subscription",
          client_reference_id: "user-1",
          metadata: {},
        },
      },
    });

    const response = await post();

    expect(response.status).toBe(200);
    expect(mocks.setUserPlan).toHaveBeenCalledWith("user-1", "plus");
  });

  it("uses checkout metadata when client_reference_id is absent", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "subscription",
          client_reference_id: null,
          metadata: { supabase_user_id: "user-from-metadata" },
        },
      },
    });

    await post();

    expect(mocks.setUserPlan).toHaveBeenCalledWith("user-from-metadata", "plus");
  });

  it("does not grant Plus for a one-time payment checkout", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "payment",
          client_reference_id: "user-1",
          metadata: {},
        },
      },
    });

    const response = await post();

    expect(response.status).toBe(200);
    expect(mocks.setUserPlan).not.toHaveBeenCalled();
  });

  it.each([
    ["active", "plus"],
    ["trialing", "plus"],
    ["past_due", "free"],
    ["unpaid", "free"],
    ["canceled", "free"],
    ["incomplete", "free"],
    ["incomplete_expired", "free"],
    ["paused", "free"],
  ] as const)("maps subscription status %s to %s", async (status, plan) => {
    mocks.constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: subscription(status) },
    });

    const response = await post();

    expect(response.status).toBe(200);
    expect(mocks.setUserPlan).toHaveBeenCalledWith("user-1", plan);
  });

  it("revokes Plus when the subscription is deleted", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: subscription("canceled") },
    });

    await post();

    expect(mocks.setUserPlan).toHaveBeenCalledWith("user-1", "free");
  });

  it("reads the user id from the subscription item when subscription metadata is empty", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          status: "active",
          metadata: {},
          items: { data: [{ metadata: { supabase_user_id: "user-from-item" } }] },
        },
      },
    });

    await post();

    expect(mocks.setUserPlan).toHaveBeenCalledWith("user-from-item", "plus");
  });

  it("does not write a plan when the subscription has no user id", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: subscription("canceled", null) },
    });

    await post();

    expect(mocks.setUserPlan).not.toHaveBeenCalled();
  });
});
