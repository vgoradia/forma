import { describe, expect, it } from "vitest";
import { displayScanQuota, FREE_SCANS_PER_MONTH, GUEST_SCANS_PER_MONTH } from "./scan-quota";

describe("displayScanQuota", () => {
  it("uses server numbers only when the API says they are enforced", () => {
    expect(
      displayScanQuota(
        { enforced: true, used: 3, limit: GUEST_SCANS_PER_MONTH, remaining: 0 },
        FREE_SCANS_PER_MONTH
      )
    ).toEqual({
      used: 3,
      limit: GUEST_SCANS_PER_MONTH,
      remaining: 0,
      enforced: true,
    });
  });

  it("falls back to the local display when enforcement is off", () => {
    expect(
      displayScanQuota(
        { enforced: false, used: 3, limit: 3, remaining: 0 },
        GUEST_SCANS_PER_MONTH
      )
    ).toMatchObject({
      enforced: false,
      limit: GUEST_SCANS_PER_MONTH,
      used: 0,
      remaining: GUEST_SCANS_PER_MONTH,
    });
  });
});
