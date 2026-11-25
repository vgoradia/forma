import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { orderAlternatives } from "./alternatives";
import { generateMockAnalysis } from "./mock-analysis";
import { getRecommendedFromScans } from "./scan-helpers";
import { sanitizeProductAnalysis } from "./scan-validation";
import { toSharedVerdict } from "./shared-verdict";
import type { Alternative } from "./types";
import type { StoredScan } from "./storage";

function alt(partial: Pick<Alternative, "name" | "brand" | "price" | "tier">): Alternative {
  return {
    imageUrl: "",
    url: "",
    matchScore: 80,
    reason: "Similar shape",
    estimated: true,
    priceVerified: false,
    ...partial,
  };
}

describe("alternative order", () => {
  it("puts cheaper alternatives before premium and relabels an expensive budget dupe", () => {
    const ordered = orderAlternatives(
      [
        alt({ name: "Silk Slip", brand: "Vince", price: 245, tier: "premium" }),
        alt({ name: "Satin Slip", brand: "Reformation", price: 88, tier: "similar" }),
        alt({ name: "Slip Dress", brand: "Zara", price: 79, tier: "dupe" }),
        alt({ name: "Not a dupe", brand: "Aritzia", price: 120, tier: "dupe" }),
      ],
      85
    );
    assert.deepEqual(
      ordered.map((item) => [item.brand, item.price, item.tier]),
      [
        ["Zara", 79, "dupe"],
        ["Reformation", 88, "similar"],
        ["Aritzia", 120, "similar"],
        ["Vince", 245, "premium"],
      ]
    );
  });

  it("keeps premium last even when that price is lower", () => {
    const ordered = orderAlternatives(
      [
        alt({ name: "Coat", brand: "Toteme", price: 50, tier: "premium" }),
        alt({ name: "Coat", brand: "Zara", price: 79, tier: "dupe" }),
      ],
      85
    );
    assert.equal(ordered[0]?.brand, "Zara");
    assert.equal(ordered[1]?.tier, "premium");
  });

  it("orders dupes on the stored scan, the share page, and history recommendations", () => {
    const analysis = generateMockAnalysis("dress");
    analysis.lowestPrice = { ...analysis.lowestPrice, price: 85 };
    analysis.alternatives = [
      alt({ name: "Cowl Slip", brand: "Vince", price: 245, tier: "premium" }),
      alt({ name: "Bias Slip", brand: "Reformation", price: 88, tier: "similar" }),
      alt({ name: "Slip Dress", brand: "Zara", price: 79, tier: "dupe" }),
    ];

    const clean = sanitizeProductAnalysis(analysis);
    assert.deepEqual(
      clean.alternatives.map((item) => item.brand),
      ["Zara", "Reformation", "Vince"]
    );

    const shared = toSharedVerdict(clean);
    assert.ok(shared);
    assert.deepEqual(
      shared.alternatives.map((item) => item.brand),
      ["Zara", "Reformation", "Vince"]
    );

    const scan = {
      id: "scan-dress",
      analysis: clean,
      source: "upload",
      label: "Image scan",
      savedAt: new Date().toISOString(),
    } as StoredScan;
    const recommended = getRecommendedFromScans([scan]);
    assert.equal(recommended[0]?.name.includes("Zara"), true);
    assert.equal(recommended[1]?.name.includes("Reformation"), true);
  });
});
