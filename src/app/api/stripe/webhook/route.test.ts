import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isStripeConfigured: vi.fn(),
  getStripeWebhookSecret: vi.fn(),
  constructEvent: vi.fn(),
  setUserPlan: vi.fn(),
  findUserIdByEmail: vi.fn(),
  customersRetrieve: vi.fn(),
  subscriptionsRetrieve: vi.fn(),
}));

vi.mock("@/lib/stripe/config", () => ({
  isStripeConfigured: mocks.isStripeConfigured,
  getStripeWebhookSecret: mocks.getStripeWebhookSecret,
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mocks.constructEvent },
    customers: { retrieve: mocks.customersRetrieve },
    subscriptions: { retrieve: mocks.subscriptionsRetrieve },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  setUserPlan: mocks.setUserPlan,
  findUserIdByEmail: mocks.findUserIdByEmail,
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
  mocks.findUserIdByEmail.mockReset();
  mocks.customersRetrieve.mockReset();
  mocks.subscriptionsRetrieve.mockReset();
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

    expect(mocks.customersRetrieve).not.toHaveBeenCalled();
    expect(mocks.findUserIdByEmail).not.toHaveBeenCalled();
    expect(mocks.setUserPlan).not.toHaveBeenCalled();
  });

  it("stores the Stripe customer id when subscription checkout completes", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "subscription",
          client_reference_id: "user-1",
          customer: "cus_123",
          metadata: {},
        },
      },
    });

    const response = await post();

    expect(response.status).toBe(200);
    expect(mocks.setUserPlan).toHaveBeenCalledWith("user-1", "plus", {
      stripeCustomerId: "cus_123",
    });
  });

  it("retries checkout completion with the same plan and customer write", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "subscription",
          client_reference_id: "user-1",
          customer: "cus_123",
          metadata: {},
        },
      },
    });

    expect((await post()).status).toBe(200);
    expect((await post()).status).toBe(200);
    expect(mocks.setUserPlan).toHaveBeenCalledTimes(2);
    expect(mocks.setUserPlan).toHaveBeenNthCalledWith(1, "user-1", "plus", {
      stripeCustomerId: "cus_123",
    });
    expect(mocks.setUserPlan).toHaveBeenNthCalledWith(2, "user-1", "plus", {
      stripeCustomerId: "cus_123",
    });
  });

  it("returns 500 when saving the checkout plan fails", async () => {
    mocks.setUserPlan.mockResolvedValue(false);
    mocks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "subscription",
          client_reference_id: "user-1",
          customer: "cus_123",
          metadata: {},
        },
      },
    });

    const response = await post();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Could not save the subscription" });
  });

  it("syncs Plus when a subscription is created already active", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "customer.subscription.created",
      data: { object: { ...subscription("active"), customer: "cus_new" } },
    });

    const response = await post();

    expect(response.status).toBe(200);
    expect(mocks.findUserIdByEmail).not.toHaveBeenCalled();
    expect(mocks.setUserPlan).toHaveBeenCalledWith("user-1", "plus", {
      stripeCustomerId: "cus_new",
    });
  });

  it("does not grant Plus when a created subscription is still incomplete", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "customer.subscription.created",
      data: { object: subscription("incomplete") },
    });

    const response = await post();

    expect(response.status).toBe(200);
    expect(mocks.setUserPlan).toHaveBeenCalledWith("user-1", "free");
  });

  it("links a subscription by the Stripe customer's email when metadata has no user id", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          status: "active",
          customer: "cus_email",
          metadata: {},
          items: { data: [{}] },
        },
      },
    });
    mocks.customersRetrieve.mockResolvedValue({
      id: "cus_email",
      email: "buyer@example.com",
    });
    mocks.findUserIdByEmail.mockResolvedValue("user-from-email");

    const response = await post();

    expect(response.status).toBe(200);
    expect(mocks.customersRetrieve).toHaveBeenCalledWith("cus_email");
    expect(mocks.findUserIdByEmail).toHaveBeenCalledWith("buyer@example.com");
    expect(mocks.setUserPlan).toHaveBeenCalledWith("user-from-email", "plus", {
      stripeCustomerId: "cus_email",
    });
  });

  it("does not write a plan when the customer email matches no Supabase user", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: {
          status: "canceled",
          customer: "cus_unknown",
          metadata: {},
          items: { data: [] },
        },
      },
    });
    mocks.customersRetrieve.mockResolvedValue({
      id: "cus_unknown",
      email: "missing@example.com",
    });
    mocks.findUserIdByEmail.mockResolvedValue(null);

    const response = await post();

    expect(response.status).toBe(200);
    expect(mocks.setUserPlan).not.toHaveBeenCalled();
  });

  it("does not write a plan when the Stripe customer was deleted", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          status: "active",
          customer: "cus_gone",
          metadata: {},
          items: { data: [] },
        },
      },
    });
    mocks.customersRetrieve.mockResolvedValue({ id: "cus_gone", deleted: true });

    const response = await post();

    expect(response.status).toBe(200);
    expect(mocks.findUserIdByEmail).not.toHaveBeenCalled();
    expect(mocks.setUserPlan).not.toHaveBeenCalled();
  });

  it("returns 500 when the email lookup fails so Stripe retries", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "customer.subscription.created",
      data: {
        object: {
          status: "active",
          customer: "cus_email",
          metadata: {},
          items: { data: [] },
        },
      },
    });
    mocks.customersRetrieve.mockResolvedValue({
      id: "cus_email",
      email: "buyer@example.com",
    });
    mocks.findUserIdByEmail.mockRejectedValue(new Error("admin down"));

    const response = await post();

    expect(response.status).toBe(500);
    expect(mocks.setUserPlan).not.toHaveBeenCalled();
  });

  it("returns 500 when a subscription plan write fails", async () => {
    mocks.setUserPlan.mockResolvedValue(false);
    mocks.constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: subscription("active") },
    });

    const response = await post();

    expect(response.status).toBe(500);
  });

  it("syncs the live subscription status after a failed invoice payment", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "invoice.payment_failed",
      data: {
        object: {
          parent: {
            type: "subscription_details",
            subscription_details: { subscription: "sub_past_due" },
          },
        },
      },
    });
    mocks.subscriptionsRetrieve.mockResolvedValue({
      ...subscription("past_due"),
      customer: "cus_past_due",
    });

    const response = await post();

    expect(response.status).toBe(200);
    expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_past_due");
    expect(mocks.setUserPlan).toHaveBeenCalledWith("user-1", "free", {
      stripeCustomerId: "cus_past_due",
    });
  });

  it("keeps Plus when a failed invoice still belongs to an active subscription", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "invoice.payment_failed",
      data: {
        object: {
          parent: {
            type: "subscription_details",
            subscription_details: { subscription: { id: "sub_active" } },
          },
        },
      },
    });
    mocks.subscriptionsRetrieve.mockResolvedValue(subscription("active"));

    const response = await post();

    expect(response.status).toBe(200);
    expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_active");
    expect(mocks.setUserPlan).toHaveBeenCalledWith("user-1", "plus");
  });

  it("ignores a failed invoice that is not for a subscription", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "invoice.payment_failed",
      data: { object: { parent: null } },
    });

    const response = await post();

    expect(response.status).toBe(200);
    expect(mocks.subscriptionsRetrieve).not.toHaveBeenCalled();
    expect(mocks.setUserPlan).not.toHaveBeenCalled();
  });
});
