import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildProductSearchUrl, resolveRetailerDomain } from "./product-links";
import {
  formatAtRetailer,
  isPlaceholderLabel,
  sanitizeLabel,
  sanitizeProductName,
  stripPlaceholderMentions,
} from "./product-label";
import { getProductName } from "./scan-helpers";
import { generateMockAnalysis } from "./mock-analysis";
import { sanitizeProductAnalysis } from "./scan-validation";
import type { StoredScan } from "./storage";
import { formatProductTitle } from "./utils";

describe("product label sanitizer", () => {
  it("drops placeholder brands from the title", () => {
    assert.equal(formatProductTitle("Unknown", "Red Cowl Neck Slip Dress"), "Red Cowl Neck Slip Dress");
    assert.equal(formatProductTitle("N/A", "Wool Coat"), "Wool Coat");
    assert.equal(formatProductTitle("n.a.", "Wool Coat"), "Wool Coat");
    assert.equal(formatProductTitle("null", "Tee"), "Tee");
    assert.equal(formatProductTitle("Generic", "Black Tee"), "Black Tee");
    assert.equal(formatProductTitle("", "Red Dress"), "Red Dress");
    assert.equal(formatProductTitle("   ", "Red Dress"), "Red Dress");
    assert.equal(isPlaceholderLabel(null), true);
    assert.equal(sanitizeLabel("Unknown"), "");
    assert.equal(sanitizeLabel("  Generic  "), "");
    assert.equal(sanitizeLabel("Reformation"), "Reformation");
  });

  it("strips a placeholder the model baked into the product name", () => {
    assert.equal(sanitizeProductName("Unknown Red Cowl Neck Slip Dress"), "Red Cowl Neck Slip Dress");
    assert.equal(formatProductTitle("Unknown", "Unknown Red Cowl Neck Slip Dress"), "Red Cowl Neck Slip Dress");
    assert.equal(formatProductTitle("", "N/A Wool Coat"), "Wool Coat");
    assert.equal(formatProductTitle("Generic", "Generic Red Dress"), "Red Dress");
  });

  it("keeps real brands, including Generic Surplus", () => {
    assert.equal(formatProductTitle("Nike", "Air Force 1 Low"), "Nike Air Force 1 Low");
    assert.equal(formatProductTitle("Nike", "Nike Air Force 1 Low"), "Nike Air Force 1 Low");
    assert.equal(formatProductTitle("Generic Surplus", "Straight Jeans"), "Generic Surplus Straight Jeans");
    assert.equal(sanitizeProductName("Generic Surplus Straight Jeans"), "Generic Surplus Straight Jeans");
  });

  it("omits an unknown retailer from sentences", () => {
    assert.equal(formatAtRetailer("Unknown"), "");
    assert.equal(formatAtRetailer("N/A"), "");
    assert.equal(formatAtRetailer("null"), "");
    assert.equal(formatAtRetailer(""), "");
    assert.equal(formatAtRetailer("Nordstrom"), "at Nordstrom");
    assert.equal(stripPlaceholderMentions("Shop it at Unknown."), "Shop it.");
    assert.equal(stripPlaceholderMentions("Available at Unknown today."), "Available today.");
    assert.equal(stripPlaceholderMentions("Buy it at Nordstrom."), "Buy it at Nordstrom.");
    assert.equal(stripPlaceholderMentions("Unknown"), "");
  });

  it("does not search for an unknown brand or retailer", () => {
    const url = buildProductSearchUrl("Unknown", "Unknown", "Red Cowl Neck Slip Dress");
    assert.equal(decodeURIComponent(url).toLowerCase().includes("unknown"), false);
    assert.match(decodeURIComponent(url), /Red Cowl Neck Slip Dress/);
    assert.equal(resolveRetailerDomain(""), undefined);
    assert.equal(resolveRetailerDomain("Unknown"), undefined);
    assert.equal(resolveRetailerDomain("N/A"), undefined);
    assert.equal(resolveRetailerDomain("Nordstrom"), "nordstrom.com");
  });

  it("cleans history card titles", () => {
    const analysis = generateMockAnalysis("dress");
    analysis.identifiedProduct.brand = "Unknown";
    analysis.identifiedProduct.name = "Red Cowl Neck Slip Dress";
    const scan = {
      id: "scan-1",
      analysis,
      source: "upload",
      label: "Image scan",
      savedAt: new Date().toISOString(),
    } as StoredScan;
    assert.equal(getProductName(scan), "Red Cowl Neck Slip Dress");
  });
});

describe("stored scans hide placeholder brands and keep the shown price", () => {
  it("rewrites an unknown product and aligns the verdict with the estimate", () => {
    const analysis = generateMockAnalysis("dress");
    analysis.identifiedProduct.brand = "Unknown";
    analysis.identifiedProduct.name = "Red Cowl Neck Slip Dress";
    analysis.identifiedProduct.description = "A slip dress at Unknown.";
    analysis.lowestPrice = {
      ...analysis.lowestPrice,
      retailer: "Unknown",
      price: 79,
      estimated: true,
      priceVerified: false,
    };
    analysis.prices = [{ ...analysis.lowestPrice }];
    analysis.verdict = {
      ...analysis.verdict,
      headline: "Skip this $85 dress",
      reasoning: "It is about $85 at Unknown, though a $40 dupe exists.",
    };
    analysis.alternatives = analysis.alternatives.map((alt, index) =>
      index === 0 ? { ...alt, price: 40 } : alt
    );

    const clean = sanitizeProductAnalysis(analysis);
    assert.equal(clean.identifiedProduct.brand, "");
    assert.equal(clean.identifiedProduct.name, "Red Cowl Neck Slip Dress");
    assert.equal(formatProductTitle(clean.identifiedProduct.brand, clean.identifiedProduct.name), "Red Cowl Neck Slip Dress");
    assert.equal(clean.identifiedProduct.description.toLowerCase().includes("unknown"), false);
    assert.equal(clean.lowestPrice.retailer, "");
    assert.equal(clean.lowestPrice.price, 79);
    assert.equal(clean.lowestPrice.estimated, true);
    assert.equal(clean.lowestPrice.priceVerified, false);
    assert.equal(clean.verdict.headline.includes("$85"), false);
    assert.match(clean.verdict.headline, /\$79\.00/);
    assert.equal(clean.verdict.reasoning.toLowerCase().includes("unknown"), false);
    assert.match(clean.verdict.reasoning, /\$79\.00/);
    assert.match(clean.verdict.reasoning, /\$40/);
    assert.equal(clean.salePrediction.estimated, true);
  });
});
