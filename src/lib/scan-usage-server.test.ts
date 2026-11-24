import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  isStripeConfigured: vi.fn(),
  getStripe: vi.fn(),
  findActivePlusSubscription: vi.fn(),
  setUserPlan: vi.fn(),
}));

vi.mock("@/lib/stripe/config", () => ({
  isStripeConfigured: mocks.isStripeConfigured,
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: mocks.getStripe,
  findActivePlusSubscription: mocks.findActivePlusSubscription,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
  setUserPlan: mocks.setUserPlan,
}));

import { resolveUserPlan } from "./scan-usage-server";

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
  mocks.isStripeConfigured.mockReset();
  mocks.getStripe.mockReset();
  mocks.findActivePlusSubscription.mockReset();
  mocks.setUserPlan.mockReset();
  mocks.getStripe.mockReturnValue({ stripe: true });
  mocks.setUserPlan.mockResolvedValue(true);
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
