import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { ANALYSIS_SYSTEM_PROMPT } from "./analysis-prompt";
import { homeSections } from "./demo-data";
import { generateMockAnalysis } from "./mock-analysis";
import {
  alignVerdictPriceText,
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

describe("verdict price consistency", () => {
  it("rewrites a nearby product price to the displayed estimate", () => {
    const text = alignVerdictPriceText("Skip this $85 dress.", {
      displayed: 79,
      shown: [79],
    });
    assert.equal(text.includes("$85"), false);
    assert.match(text, /\$79\.00/);
  });

  it("leaves a dupe price alone and still fixes the product price", () => {
    const text = alignVerdictPriceText("The $85 dress loses to a $40 dupe.", {
      displayed: 79,
      shown: [79],
      preserve: [40],
    });
    assert.match(text, /\$79\.00/);
    assert.match(text, /\$40/);
    assert.equal(text.includes("$85"), false);
  });

  it("snaps a product range to the prices actually shown", () => {
    const text = alignVerdictPriceText("Expect $80-$90 before you buy.", {
      displayed: 79,
      shown: [79, 94],
    });
    assert.equal(text.includes("$80"), false);
    assert.equal(text.includes("$90"), false);
    assert.match(text, /\$79\.00–\$94\.00/);
  });

  it("keeps a price that is already on screen", () => {
    const text = alignVerdictPriceText("Nordstrom lists it around $85.", {
      displayed: 79,
      shown: [79, 85],
    });
    assert.match(text, /\$85/);
  });

  it("is idempotent and does not invent a price when none is shown", () => {
    const once = alignVerdictPriceText("Skip this $85 dress.", { displayed: 79, shown: [79] });
    const twice = alignVerdictPriceText(once, { displayed: 79, shown: [79] });
    assert.equal(twice, once);
    assert.equal(alignVerdictPriceText("Skip this $85 dress.", { displayed: 0 }), "Skip this $85 dress.");
  });

  it("replaces the only product mention even when the final price moved further", () => {
    const text = alignVerdictPriceText("Worth about $85.", {
      displayed: 64,
      shown: [64],
      preserve: [30],
    });
    assert.match(text, /\$64\.00/);
    assert.equal(text.includes("$85"), false);
  });

  it("rewrites approximate mentions of the item's own price to the displayed estimate", () => {
    const context = { displayed: 62, shown: [62, 65], preserve: [40, 48] };
    for (const phrase of ["around $65", "~$65", "$65-ish", "about 65 dollars"]) {
      const text = alignVerdictPriceText(`This dress is ${phrase}.`, context);
      assert.match(text, /\$62\.00/, phrase);
      assert.equal(text.includes("65"), false, phrase);
    }
    const once = alignVerdictPriceText("This dress is around $65.", context);
    assert.equal(alignVerdictPriceText(once, context), once);
  });

  it("rewrites a rounded mention inside ±25% even when another price is in the sentence", () => {
    const text = alignVerdictPriceText("It's about $74, and shoppers also see $120.", {
      displayed: 62,
      shown: [62],
    });
    assert.match(text, /\$62\.00/);
    assert.match(text, /\$120/);
    assert.equal(text.includes("74"), false);
  });

  it("leaves dupe, secondhand, and sale prices alone", () => {
    const dupe = alignVerdictPriceText("The $85 dress loses to a $40 dupe.", {
      displayed: 62,
      shown: [62],
      preserve: [40],
    });
    assert.match(dupe, /\$62\.00/);
    assert.match(dupe, /\$40/);

    const secondhand = alignVerdictPriceText("Depop has it for about $40.", {
      displayed: 62,
      shown: [62],
      preserve: [40],
    });
    assert.match(secondhand, /\$40/);
    assert.equal(secondhand.includes("62"), false);

    const sale = alignVerdictPriceText("It goes on sale for around $50.", {
      displayed: 62,
      shown: [62],
      preserve: [48],
    });
    assert.match(sale, /\$50/);
    assert.equal(sale.includes("62"), false);
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

  it("tells the model to return null instead of Unknown and to cite the shown price", () => {
    assert.match(ANALYSIS_SYSTEM_PROMPT, /set "brand" to null/);
    assert.match(ANALYSIS_SYSTEM_PROMPT, /set that "retailer" to null/);
    assert.match(ANALYSIS_SYSTEM_PROMPT, /Never write "Unknown"/);
    assert.match(ANALYSIS_SYSTEM_PROMPT, /Red Cowl Neck Slip Dress/);
    assert.match(ANALYSIS_SYSTEM_PROMPT, /lowest price in "prices"/);
    assert.match(ANALYSIS_SYSTEM_PROMPT, /not "Unknown Red Cowl Neck Slip Dress"/);
    assert.match(ANALYSIS_SYSTEM_PROMPT, /at least one alternative priced below this item/);
    assert.match(ANALYSIS_SYSTEM_PROMPT, /Do not use tier "dupe" for anything that costs more/);
    assert.match(ANALYSIS_SYSTEM_PROMPT, /Put cheaper alternatives before premium ones/);
  });
});
