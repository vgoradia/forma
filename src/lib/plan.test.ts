import { describe, expect, it } from "vitest";
import { planForSubscriptionStatus, readTrustedPlan } from "./plan";

describe("readTrustedPlan", () => {
  it("returns free when there is no user", () => {
    expect(readTrustedPlan(null)).toBe("free");
    expect(readTrustedPlan(undefined)).toBe("free");
  });

  it("returns plus only when app_metadata.plan is exactly plus", () => {
    expect(readTrustedPlan({ app_metadata: { plan: "plus" } })).toBe("plus");
    expect(readTrustedPlan({ app_metadata: { plan: "free" } })).toBe("free");
    expect(readTrustedPlan({ app_metadata: { plan: "Plus" } })).toBe("free");
    expect(readTrustedPlan({ app_metadata: { plan: true } })).toBe("free");
    expect(readTrustedPlan({ app_metadata: {} })).toBe("free");
  });
});

describe("planForSubscriptionStatus", () => {
  it("keeps Plus for an active or trialing subscription", () => {
    expect(planForSubscriptionStatus("active")).toBe("plus");
    expect(planForSubscriptionStatus("trialing")).toBe("plus");
  });

  it("revokes Plus on cancel and payment failure", () => {
    for (const status of [
      "past_due",
      "unpaid",
      "canceled",
      "incomplete",
      "incomplete_expired",
      "paused",
    ]) {
      expect(planForSubscriptionStatus(status)).toBe("free");
    }
  });
});
