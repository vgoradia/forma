import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { ANALYSIS_SYSTEM_PROMPT } from "./analysis-prompt";
import { homeSections } from "./demo-data";
import { generateMockAnalysis } from "./mock-analysis";
import {
  asUnverifiedEstimate,
  describePriceTrend,
  flagModelPriceHistory,
  flagModelSalePrediction,
  isEstimatedPrice,
  normalizePriceTrend,
  stripPrecisePrices,
  syncEstimateFlag,
} from "./price-estimates";
import * as scanHelpers from "./scan-helpers";
import { sanitizeProductAnalysis } from "./scan-validation";
import type { RetailerPrice } from "./types";
import { coercePrice } from "./utils";

describe("model price estimates", () => {
  it("does not let the model mark its own prices as verified", () => {
    const invented = {
      retailer: "Nordstrom",
      price: 178,
      url: "",
      inStock: true,
      priceVerified: true,
      estimated: false,
    };
    const price = asUnverifiedEstimate(invented);
    assert.equal(price.priceVerified, false);
    assert.equal(price.estimated, true);
    assert.equal(isEstimatedPrice(price), true);
  });

  it("keeps a live listing price as verified", () => {
    const price = syncEstimateFlag({
      retailer: "Nordstrom",
      price: 178,
      url: "https://www.nordstrom.com/s/dress",
      inStock: true,
      priceVerified: true,
      estimated: true,
    });
    assert.equal(price.priceVerified, true);
    assert.equal(price.estimated, false);
    assert.equal(isEstimatedPrice(price), false);
  });

  it("treats legacy prices with no flag as estimates", () => {
    const legacy: RetailerPrice = { retailer: "Shopbop", price: 200, url: "#", inStock: true };
    assert.equal(isEstimatedPrice(legacy), true);
    assert.equal(isEstimatedPrice(undefined), true);
  });

  it("flags invented history and sale figures as estimates", () => {
    const history = flagModelPriceHistory(
      [
        { date: "2026-01", price: 223, estimated: false },
        { date: "2026-03", price: "$218" },
      ],
      coercePrice
    );
    assert.equal(history.every((point) => point.estimated === true), true);
    assert.equal(history[1]?.price, 218);

    const sale = flagModelSalePrediction(
      {
        likelihood: "high",
        predictedDrop: "March 20",
        estimatedSalePrice: 186,
        reasoning: "Historical data shows a drop.",
        estimated: false,
      },
      coercePrice
    );
    assert.equal(sale.estimated, true);
    assert.equal(sale.likelihood, "high");
    assert.equal(sale.estimatedSalePrice, 186);
  });

  it("drops dollar amounts from a qualitative trend", () => {
    const trend = normalizePriceTrend({
      direction: "falling",
      summary: "Was $248 in January and is about $218 today.",
      typicalMarkdown: "$40 off",
    });
    assert.ok(trend);
    assert.equal(trend.estimated, true);
    assert.equal(trend.summary.includes("$"), false);
    assert.equal(trend.typicalMarkdown, undefined);
    assert.equal(stripPrecisePrices("about $178 at Nordstrom"), "about at Nordstrom");
  });
});

describe("price trend copy", () => {
  it("does not present a synthetic series as observed history", () => {
    const view = describePriceTrend({
      priceTrend: {
        direction: "stable",
        summary: "Often steady between seasons, previously $223.",
        typicalMarkdown: "15-25%",
        estimated: true,
      },
      salePrediction: {
        likelihood: "medium",
        predictedDrop: "Late March — $186",
        reasoning: "Historical data shows this brand discounts.",
        estimatedSalePrice: 186,
        estimated: true,
      },
    });
    const text = `${view.summary} ${view.saleLine} ${view.footnote}`;
    assert.equal(text.includes("$"), false);
    assert.equal(text.includes("2026-"), false);
    assert.match(view.saleLine ?? "", /not confirmed/);
    assert.match(view.footnote, /not real price history/);
    assert.equal(text.toLowerCase().includes("historical data"), false);
  });

  it("labels the demo analysis as an estimate and ships no seeded price alerts", () => {
    const analysis = generateMockAnalysis("dress");
    assert.equal(analysis.lowestPrice.estimated, true);
    assert.equal(analysis.lowestPrice.priceVerified, false);
    assert.equal(analysis.prices.every((price) => price.estimated === true && price.priceVerified === false), true);
    assert.equal(analysis.salePrediction.estimated, true);
    assert.equal(analysis.priceHistory.every((point) => point.estimated === true), true);
    assert.equal(analysis.priceTrend?.estimated, true);

    const view = describePriceTrend(analysis);
    assert.equal(`${view.summary} ${view.saleLine ?? ""}`.includes("$"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(homeSections, "priceDrops"), false);
    assert.equal("getDemoPriceDrops" in scanHelpers, false);
    assert.equal("getPriceDropAlerts" in scanHelpers, false);
  });

  it("keeps a verified stored price verified and forces sale guesses to stay estimates", () => {
    const analysis = generateMockAnalysis("blazer");
    analysis.lowestPrice = { ...analysis.lowestPrice, priceVerified: true, estimated: true };
    analysis.priceHistory = [{ date: "2026-01", price: 999, estimated: false }];
    const clean = sanitizeProductAnalysis(analysis);
    assert.equal(clean.lowestPrice.priceVerified, true);
    assert.equal(clean.lowestPrice.estimated, false);
    assert.equal(clean.priceHistory[0]?.estimated, true);
    assert.equal(clean.salePrediction.estimated, true);
  });
});

describe("analysis prompt", () => {
  it("tells the model not to invent price history or verified prices", () => {
    assert.match(ANALYSIS_SYSTEM_PROMPT, /priceHistory must be an empty array/);
    assert.match(ANALYSIS_SYSTEM_PROMPT, /Do not invent past prices/);
    assert.match(ANALYSIS_SYSTEM_PROMPT, /Never describe a price as verified/);
    assert.equal(ANALYSIS_SYSTEM_PROMPT.includes('"date": "YYYY-MM"'), false);
    assert.match(ANALYSIS_SYSTEM_PROMPT, /not a scheduled sale/);
  });
});
