import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { generateMockAnalysis } from "./mock-analysis";
import {
  collapseRetailerPrices,
  formatRetailerPrice,
  retailerNameFromUrl,
  resolveRetailerLabel,
} from "./retailer-rows";
import { sanitizeProductAnalysis } from "./scan-validation";
import type { RetailerPrice } from "./types";

function row(partial: Partial<RetailerPrice> & Pick<RetailerPrice, "retailer" | "price">): RetailerPrice {
  return {
    url: partial.url ?? "",
    inStock: partial.inStock ?? true,
    estimated: partial.estimated ?? true,
    priceVerified: partial.priceVerified ?? false,
    ...partial,
  };
}

describe("retailer price rows", () => {
  it("collapses the same retailer into one range", () => {
    const prices = collapseRetailerPrices([
      row({ retailer: "Girlinmind", price: 95, url: "https://girlinmind.com/a" }),
      row({ retailer: " girlinmind ", price: 110, url: "https://girlinmind.com/b" }),
      row({ retailer: "GIRLINMIND", price: 85, url: "https://girlinmind.com/c" }),
      row({ retailer: "Nordstrom", price: 90, url: "https://www.nordstrom.com/s/dress" }),
    ]);
    assert.equal(prices.length, 2);
    const girlinmind = prices.find((price) => price.retailer.toLowerCase() === "girlinmind");
    assert.ok(girlinmind);
    assert.equal(girlinmind.price, 85);
    assert.equal(girlinmind.priceHigh, 110);
    assert.equal(formatRetailerPrice(girlinmind.price, girlinmind.priceHigh), "$85.00–$110.00");
    assert.equal(prices[0]?.retailer, "Girlinmind");
  });

  it("keeps a single price when the quotes match", () => {
    const prices = collapseRetailerPrices([
      row({ retailer: "Nordstrom", price: 90 }),
      row({ retailer: "nordstrom", price: 90 }),
    ]);
    assert.equal(prices.length, 1);
    assert.equal(prices[0]?.price, 90);
    assert.equal(prices[0]?.priceHigh, undefined);
    assert.equal(formatRetailerPrice(90), "$90.00");
  });

  it("labels a blank store from its hostname and drops rows with neither", () => {
    assert.equal(retailerNameFromUrl("https://www.nordstrom.com/s/dress?color=red"), "Nordstrom");
    assert.equal(resolveRetailerLabel("", "https://shop.nordstrom.com/s/123"), "Nordstrom");
    assert.equal(resolveRetailerLabel("Unknown", "https://www.nordstrom.com/s/dress"), "Nordstrom");
    assert.equal(resolveRetailerLabel("  ", ""), "");

    const prices = collapseRetailerPrices([
      row({ retailer: "", price: 70, url: "https://www.nordstrom.com/s/dress" }),
      row({ retailer: "Unknown", price: 40, url: "" }),
      row({ retailer: "Revolve", price: 80, url: "" }),
    ]);
    assert.deepEqual(
      prices.map((price) => price.retailer),
      ["Nordstrom", "Revolve"]
    );
    assert.equal(prices.some((price) => !price.retailer.trim()), false);
  });

  it("sanitizes stored scans so the result card never repeats or blanks a store", () => {
    const analysis = generateMockAnalysis("dress");
    analysis.lowestPrice = { ...analysis.lowestPrice, price: 62, retailer: "" };
    analysis.prices = [
      row({ retailer: "Girlinmind", price: 110 }),
      row({ retailer: "girlinmind", price: 85 }),
      row({ retailer: "", price: 70, url: "https://www.nordstrom.com/s/red-dress" }),
      row({ retailer: "N/A", price: 55, url: "" }),
    ];
    analysis.verdict = {
      ...analysis.verdict,
      headline: "Skip it — around $65",
      reasoning: "About 65 dollars, though Depop has it for about $40.",
    };
    analysis.secondhand = {
      available: true,
      platforms: [{ name: "Depop", price: 40, url: "https://www.depop.com/search/?q=dress", estimated: true }],
    };

    const clean = sanitizeProductAnalysis(analysis);
    assert.equal(clean.prices.length, 2);
    assert.equal(clean.prices[0]?.retailer, "Nordstrom");
    assert.equal(clean.prices[1]?.retailer, "Girlinmind");
    assert.equal(clean.prices[1]?.price, 85);
    assert.equal(clean.prices[1]?.priceHigh, 110);
    assert.equal(clean.prices.some((price) => !price.retailer.trim()), false);
    assert.equal(clean.verdict.headline.includes("65"), false);
    assert.match(clean.verdict.headline, /\$62\.00/);
    assert.match(clean.verdict.reasoning, /\$40/);
    assert.equal(clean.verdict.reasoning.includes("65"), false);
    assert.equal(clean.lowestPrice.estimated, true);
    assert.equal(clean.lowestPrice.priceVerified, false);
  });
});
