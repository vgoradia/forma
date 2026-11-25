import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { generateMockAnalysis } from "./mock-analysis";
import { isBlockedHostname } from "./security";
import { getVerdictSharePayload } from "./share-url";
import {
  createShareId,
  isShareId,
  sanitizePublicUrl,
  shareIdFromBytes,
  sharedVerdictMetadataCopy,
  shareRequestBody,
  toSharedVerdict,
} from "./shared-verdict";

const USER_EMAIL = "private.user@example.com";
const USER_ID = "11111111-2222-4333-8444-555555555555";

function leakedAnalysis() {
  return {
    id: USER_ID,
    userId: USER_ID,
    user_id: USER_ID,
    email: USER_EMAIL,
    imagePreview: "data:image/png;base64,SECRETSCREENSHOT",
    label: `search from ${USER_EMAIL}`,
    identifiedProduct: {
      name: "Achilles Low",
      brand: "Common Projects",
      category: "Sneakers",
      description: `Email the buyer at ${USER_EMAIL} about user ${USER_ID}.`,
      colors: ["White"],
      confidence: 0.91,
      imageUrl: "data:image/jpeg;base64,SECRETSCREENSHOT",
    },
    verdict: {
      recommendation: "skip",
      headline: "Skip it",
      reasoning: "The markup is not worth it.",
      worthItScore: 40,
    },
    lowestPrice: {
      retailer: "SSENSE",
      price: 425,
      url: `https://www.ssense.com/en-us/men?user_id=${USER_ID}&email=${encodeURIComponent(USER_EMAIL)}&utm_source=shop`,
      priceVerified: true,
      imageUrl: "https://images.example.com/shoe.jpg",
    },
    prices: [
      {
        retailer: "SSENSE",
        price: 425,
        url: "https://www.ssense.com/en-us/men",
      },
    ],
    alternatives: [
      {
        name: "Court Vision",
        brand: "Nike",
        price: 85,
        url: "http://127.0.0.1/secret",
        imageUrl: "blob:http://localhost/abc",
        reason: "Cheaper",
        tier: "dupe",
        matchScore: 70,
      },
    ],
    reviewSummary: {
      overallRating: 4.2,
      totalReviews: 10,
      summary: "Fine leather.",
      pros: ["Leather"],
      cons: ["Price"],
      qualityScore: 80,
      valueScore: 30,
    },
    wardrobeMatches: [{ item: "wardrobe-secret-jacket", compatibility: "high", note: USER_EMAIL }],
    outfitSuggestions: [{ name: "outfit-secret", category: "Top", reason: "nope" }],
    stylingTips: [`Do not store ${USER_EMAIL}`],
    priceHistory: [{ date: "2026-01", price: 999 }],
    salePrediction: { likelihood: "low", predictedDrop: "Never", estimatedSalePrice: 10, reasoning: "no" },
    secondhand: {
      available: true,
      platforms: [{ name: "Depop", price: 120, url: "https://depop.com/products/1" }],
    },
    analyzedAt: new Date().toISOString(),
  };
}

function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

describe("toSharedVerdict", () => {
  it("drops account data, screenshots, and wardrobe notes", () => {
    const shared = toSharedVerdict(leakedAnalysis());
    assert.ok(shared);
    const serialized = JSON.stringify(shared);
    assert.equal(serialized.includes(USER_EMAIL), false);
    assert.equal(serialized.includes(USER_ID), false);
    assert.equal(serialized.includes("SECRETSCREENSHOT"), false);
    assert.equal(serialized.includes("wardrobe-secret"), false);
    assert.equal(serialized.includes("outfit-secret"), false);
    assert.equal(serialized.includes("data:"), false);

    const keys = collectKeys(shared);
    for (const forbidden of ["email", "userId", "user_id", "imagePreview", "wardrobeMatches", "id"]) {
      assert.equal(keys.has(forbidden), false, forbidden);
    }

    assert.equal(shared.product.imageUrl, "https://images.example.com/shoe.jpg");
    assert.equal(shared.product.matchPercent, 91);
    assert.equal(shared.lowestPrice.priceVerified, true);
    assert.equal(shared.lowestPrice.estimated, false);
    assert.equal(shared.lowestPrice.url.includes("user_id"), false);
    assert.equal(shared.lowestPrice.url.includes("utm_source=shop"), true);
    assert.equal(shared.alternatives[0]?.url, "");
    assert.equal(shared.alternatives[0]?.imageUrl, undefined);
    assert.equal(shared.saleNote, undefined);
    assert.equal(shared.secondhand[0]?.name, "Depop");
  });

  it("is idempotent and accepts the public shape", () => {
    const once = toSharedVerdict(leakedAnalysis());
    const twice = toSharedVerdict(once);
    assert.deepEqual(twice, once);
    assert.deepEqual(shareRequestBody(once)?.analysis, once);
  });

  it("sanitizes a full mock analysis without keeping the scan id", () => {
    const analysis = generateMockAnalysis("dress");
    const shared = toSharedVerdict(analysis);
    assert.ok(shared);
    assert.equal(JSON.stringify(shared).includes(analysis.id), false);
    assert.equal(shared.verdict.recommendation, analysis.verdict.recommendation);
    assert.ok(shared.lowestPrice.price > 0);
    assert.equal(shared.lowestPrice.estimated, true);
    assert.equal(shared.lowestPrice.priceVerified, false);
    assert.equal(shared.prices.every((price) => price.estimated === true), true);
    assert.equal(shared.secondhand.every((platform) => platform.estimated === true), true);
    assert.match(sharedVerdictMetadataCopy(shared).description, /Estimated price about/);
    assert.ok(shared.alternatives.length > 0);
  });

  it("rejects a payload that is not a verdict", () => {
    assert.equal(toSharedVerdict({ email: USER_EMAIL, userId: USER_ID }), null);
    assert.equal(toSharedVerdict(null), null);
    assert.equal(
      toSharedVerdict({
        identifiedProduct: { name: "Bag", brand: "Toteme" },
        verdict: { recommendation: "maybe", headline: "Hmm" },
        lowestPrice: { retailer: "Net-a-Porter", price: 100 },
      }),
      null
    );
  });
});

describe("share ids and urls", () => {
  it("builds an unguessable id from bytes", () => {
    const id = shareIdFromBytes(new Uint8Array(10).fill(0));
    assert.equal(id, "2222222222");
    assert.equal(isShareId(id), true);
    assert.equal(isShareId("short"), false);
    assert.equal(isShareId("../etc/passwd"), false);
    assert.equal(isShareId(createShareId()), true);
  });

  it("keeps public product urls and drops private or embedded images", () => {
    assert.equal(sanitizePublicUrl("data:image/png;base64,abc"), "");
    assert.equal(sanitizePublicUrl("http://127.0.0.1/photo.jpg"), "");
    assert.equal(sanitizePublicUrl("javascript:alert(1)"), "");
    const kept = sanitizePublicUrl("https://www.nike.com/t/shoe?token=secret&color=white");
    assert.equal(kept.includes("token="), false);
    assert.equal(kept.includes("color=white"), true);
  });

  it("stores urls only after the hardened host block list", () => {
    assert.equal(sanitizePublicUrl("http://2130706433/latest", isBlockedHostname), "");
    assert.equal(sanitizePublicUrl("http://169.254.169.254/latest/meta-data", isBlockedHostname), "");
    assert.equal(toSharedVerdict(leakedAnalysis(), isBlockedHostname)?.lowestPrice.url.includes("user_id"), false);
  });

  it("builds share copy with a public path and UTM tags", () => {
    const payload = getVerdictSharePayload({
      productTitle: "Nike Court",
      recommendation: "consider-alternatives",
      headline: "Look at the dupes",
      lowestPrice: "$80.00",
      retailer: "Nike",
      path: "/v/abcdefghij",
    });
    assert.match(payload.url, /\/v\/abcdefghij/);
    assert.match(payload.url, /utm_source=share/);
    assert.match(payload.url, /utm_medium=referral/);
    assert.match(payload.url, /utm_campaign=forma/);
    assert.match(payload.title, /CONSIDER DUPES/);
    assert.equal(payload.title.includes("CONSIDER-ALTERNATIVES"), false);
    assert.match(payload.text, /Lowest price \$80\.00 at Nike/);
    const estimated = getVerdictSharePayload({
      productTitle: "Nike Court",
      recommendation: "wait",
      headline: "Maybe later",
      lowestPrice: "$80.00",
      retailer: "Nike",
      priceEstimated: true,
      path: "/v/abcdefghij",
    });
    assert.match(estimated.text, /Estimated price about \$80\.00 at Nike/);
    assert.equal(estimated.text.includes("Lowest price"), false);
    const unnamed = getVerdictSharePayload({
      productTitle: "Red Cowl Neck Slip Dress",
      recommendation: "skip",
      headline: "Skip this $85 dress at Unknown",
      lowestPrice: "$79.00",
      retailer: "Unknown",
      priceEstimated: true,
      path: "/v/abcdefghij",
    });
    assert.equal(unnamed.text.toLowerCase().includes("unknown"), false);
    assert.equal(unnamed.text.includes("$85"), false);
    assert.match(unnamed.text, /\$79\.00/);
    assert.match(unnamed.text, /Estimated price about \$79\.00\./);
    assert.equal(unnamed.title.includes("Unknown"), false);
  });

  it("drops an unknown brand and retailer and matches the shown estimate", () => {
    const shared = toSharedVerdict({
      identifiedProduct: {
        name: "Unknown Red Cowl Neck Slip Dress",
        brand: "Unknown",
        category: "Dresses",
        description: "A cowl neck slip dress at Unknown.",
        colors: ["Red"],
        confidence: 0.7,
      },
      verdict: {
        recommendation: "skip",
        headline: "Skip this $85 dress",
        reasoning: "About $85 at Unknown. A $40 dupe is the better buy.",
        worthItScore: 30,
      },
      lowestPrice: { retailer: "Unknown", price: 79, estimated: true, priceVerified: false },
      prices: [{ retailer: "Unknown", price: 79 }],
      alternatives: [
        {
          name: "Slip Dress",
          brand: "Generic",
          price: 40,
          url: "https://www.example.com/dress",
          reason: "Cheaper",
          tier: "dupe",
          matchScore: 60,
        },
      ],
      reviewSummary: {
        overallRating: 0,
        totalReviews: 0,
        summary: "",
        pros: [],
        cons: [],
        qualityScore: 0,
        valueScore: 0,
      },
      secondhand: { available: false, platforms: [] },
      salePrediction: { likelihood: "low", predictedDrop: "Unknown", estimatedSalePrice: 60, reasoning: "" },
    });
    assert.ok(shared);
    assert.equal(shared.product.brand, "");
    assert.equal(shared.product.name, "Red Cowl Neck Slip Dress");
    assert.equal(shared.lowestPrice.retailer, "");
    assert.equal(shared.lowestPrice.estimated, true);
    assert.equal(shared.lowestPrice.priceVerified, false);
    assert.equal(shared.verdict.headline.includes("$85"), false);
    assert.match(shared.verdict.headline, /\$79\.00/);
    assert.equal(shared.verdict.reasoning.toLowerCase().includes("unknown"), false);
    assert.match(shared.verdict.reasoning, /\$40/);
    assert.equal(shared.alternatives[0]?.brand, "");
    assert.equal(shared.saleNote, undefined);
    const meta = sharedVerdictMetadataCopy(shared);
    assert.match(meta.title, /Red Cowl Neck Slip Dress/);
    assert.equal(meta.title.includes("Unknown"), false);
    assert.match(meta.description, /Estimated price about \$79\.00/);
    assert.equal(meta.description.toLowerCase().includes("unknown"), false);
    assert.equal(meta.description.includes(" at "), false);
  });

  it("writes preview metadata from the public verdict only", () => {
    const shared = toSharedVerdict(leakedAnalysis());
    assert.ok(shared);
    const meta = sharedVerdictMetadataCopy(shared);
    assert.match(meta.title, /Forma says SKIP/);
    assert.match(meta.description, /SSENSE/);
    assert.equal(meta.title.includes(USER_EMAIL), false);
    assert.equal(meta.description.includes(USER_ID), false);
  });
});
