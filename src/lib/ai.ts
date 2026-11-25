import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { AnalyzeInput, ProductAnalysis } from "./types";
import { generateMockAnalysis } from "./mock-analysis";
import { enrichAnalysisLinks } from "./enrich-links";
import { resolveProductUrl, resolveAlternativeUrl, resolveSecondhandUrl } from "./product-links";
import { sanitizeLabel, sanitizeProductName, stripPlaceholderMentions } from "./product-label";
import { coercePrice, stripDuplicateBrand } from "./utils";
import { ANALYSIS_SYSTEM_PROMPT } from "./analysis-prompt";
import {
  asUnverifiedEstimate,
  flagModelPriceHistory,
  flagModelSalePrediction,
  normalizePriceTrend,
} from "./price-estimates";

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

function getApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY;
}

function isAnthropicKey(key: string): boolean {
  return key.startsWith("sk-ant-");
}

function toStringArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
}

function normalizeAnalysis(
  raw: Omit<ProductAnalysis, "id" | "analyzedAt" | "lowestPrice">
): Omit<ProductAnalysis, "id" | "analyzedAt" | "lowestPrice"> {
  const confidence = raw.identifiedProduct?.confidence ?? 0.8;
  const brand = sanitizeLabel(raw.identifiedProduct?.brand);
  const name = stripDuplicateBrand(brand, sanitizeProductName(raw.identifiedProduct?.name ?? ""));

  const prices = (Array.isArray(raw.prices) ? raw.prices : []).map((p) =>
    asUnverifiedEstimate({
      ...p,
      retailer: sanitizeLabel(p.retailer),
      price: coercePrice(p.price) ?? 0,
      url: resolveProductUrl(p.url, sanitizeLabel(p.retailer), brand, name),
    })
  );

  const alternatives = (Array.isArray(raw.alternatives) ? raw.alternatives : []).map((alt) => {
    const altBrand = sanitizeLabel(alt.brand);
    const altName = stripDuplicateBrand(altBrand, sanitizeProductName(alt.name ?? ""));
    return asUnverifiedEstimate({
      ...alt,
      brand: altBrand,
      name: altName,
      price: coercePrice(alt.price) ?? 0,
      url: resolveAlternativeUrl(alt.url, altBrand, altName),
    });
  });

  const platforms = (Array.isArray(raw.secondhand?.platforms) ? raw.secondhand.platforms : []).map(
    (platform) => ({
      ...platform,
      price: coercePrice(platform.price) ?? 0,
      url: resolveSecondhandUrl(platform.url, platform.name, brand, name),
      estimated: true as const,
    })
  );

  return {
    ...raw,
    identifiedProduct: {
      ...raw.identifiedProduct,
      brand,
      name,
      description: stripPlaceholderMentions(raw.identifiedProduct?.description ?? ""),
      estimatedRetailPrice: coercePrice(raw.identifiedProduct?.estimatedRetailPrice) ?? 0,
      colors: toStringArray(raw.identifiedProduct?.colors),
      materials: toStringArray(raw.identifiedProduct?.materials),
      style: toStringArray(raw.identifiedProduct?.style),
      confidence: confidence > 1 ? confidence / 100 : confidence,
    },
    prices,
    alternatives,
    reviewSummary: {
      overallRating: raw.reviewSummary?.overallRating ?? 4,
      totalReviews: raw.reviewSummary?.totalReviews ?? 0,
      summary: raw.reviewSummary?.summary ?? "",
      qualityScore: raw.reviewSummary?.qualityScore ?? 80,
      valueScore: raw.reviewSummary?.valueScore ?? 75,
      pros: toStringArray(raw.reviewSummary?.pros),
      cons: toStringArray(raw.reviewSummary?.cons),
    },
    outfitSuggestions: Array.isArray(raw.outfitSuggestions) ? raw.outfitSuggestions : [],
    priceHistory: flagModelPriceHistory(raw.priceHistory, coercePrice),
    priceTrend: normalizePriceTrend(raw.priceTrend),
    salePrediction: flagModelSalePrediction(raw.salePrediction, coercePrice),
    verdict: {
      ...raw.verdict,
      headline: stripPlaceholderMentions(raw.verdict?.headline ?? ""),
      reasoning: stripPlaceholderMentions(raw.verdict?.reasoning ?? ""),
    },
    stylingTips: toStringArray(raw.stylingTips),
    wardrobeMatches: Array.isArray(raw.wardrobeMatches) ? raw.wardrobeMatches : [],
    secondhand: {
      available: raw.secondhand?.available ?? false,
      platforms,
    },
  };
}

function extractJson(text: string): string {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in AI response");

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === "\\" && inString) {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") depth++;
    if (char === "}") {
      depth--;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }

  throw new Error("Incomplete JSON in AI response");
}

function repairJson(raw: string): string {
  return raw
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2018|\u2019/g, "'");
}

function parseAnalysis(raw: string): Omit<ProductAnalysis, "id" | "analyzedAt" | "lowestPrice"> {
  const jsonText = extractJson(raw);
  try {
    return normalizeAnalysis(JSON.parse(jsonText));
  } catch {
    return normalizeAnalysis(JSON.parse(repairJson(jsonText)));
  }
}

function buildUserText(input: AnalyzeInput): string {
  if (input.type === "image") {
    return "Identify this fashion/product item and provide a complete shopping analysis to help me decide whether to buy it.";
  }
  if (input.type === "url") {
    return `Analyze this product link and provide a complete shopping decision analysis: ${input.url}`;
  }
  return `Analyze this product query and provide a complete shopping decision analysis. Use the user's exact search terms to identify the most likely product match: ${input.query}`;
}

function finalizeAnalysis(
  analysis: Omit<ProductAnalysis, "id" | "analyzedAt" | "lowestPrice">
): ProductAnalysis {
  const normalized = normalizeAnalysis(analysis);
  const prices = [...normalized.prices]
    .map((p) => ({ ...p, price: coercePrice(p.price) ?? 0 }))
    .filter((p) => coercePrice(p.price) !== undefined || p.price === 0)
    .sort((a, b) => (coercePrice(a.price) ?? Infinity) - (coercePrice(b.price) ?? Infinity));
  const lowestValid = prices.find((p) => coercePrice(p.price) !== undefined);
  const lowestPrice = asUnverifiedEstimate(
    lowestValid ?? {
      retailer: sanitizeLabel(normalized.identifiedProduct.brand),
      price: coercePrice(normalized.identifiedProduct.estimatedRetailPrice) ?? 0,
      url: "#",
      inStock: true,
    }
  );

  return {
    ...normalized,
    id: crypto.randomUUID(),
    prices,
    lowestPrice,
    analyzedAt: new Date().toISOString(),
  };
}

async function analyzeWithAnthropic(input: AnalyzeInput, apiKey: string): Promise<ProductAnalysis> {
  const client = new Anthropic({ apiKey });
  const userText = buildUserText(input);

  const content: Anthropic.MessageCreateParams["messages"][0]["content"] =
    input.type === "image"
      ? [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: input.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: input.base64,
            },
          },
          { type: "text", text: userText },
        ]
      : userText;

  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 4096,
        system: ANALYSIS_SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No response from AI");
      }

      return finalizeAnalysis(parseAnalysis(textBlock.text));
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        console.warn("Anthropic analysis attempt failed, retrying once:", error);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Analysis failed");
}

async function analyzeWithOpenAI(input: AnalyzeInput, apiKey: string): Promise<ProductAnalysis> {
  const openai = new OpenAI({ apiKey });
  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

  if (input.type === "image") {
    userContent.push({
      type: "image_url",
      image_url: {
        url: `data:${input.mimeType};base64,${input.base64}`,
        detail: "high",
      },
    });
    userContent.push({ type: "text", text: buildUserText(input) });
  } else {
    userContent.push({ type: "text", text: buildUserText(input) });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    max_tokens: 2048,
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  return finalizeAnalysis(parseAnalysis(content));
}

export async function analyzeProduct(input: AnalyzeInput): Promise<ProductAnalysis> {
  const apiKey = getApiKey();

  let analysis: ProductAnalysis;

  try {
    if (!apiKey || apiKey === "sk-your-key-here") {
      const query =
        input.type === "text" ? input.query : input.type === "url" ? input.url : undefined;
      analysis = generateMockAnalysis(query);
    } else if (isAnthropicKey(apiKey)) {
      analysis = await analyzeWithAnthropic(input, apiKey);
    } else {
      analysis = await analyzeWithOpenAI(input, apiKey);
    }
  } catch (error) {
    console.error("Core analysis failed:", error);
    throw new Error(
      input.type === "image"
        ? "We couldn't analyze that image. Try a clearer photo or describe the product instead."
        : "We couldn't analyze that product right now. Please try again in a moment."
    );
  }

  return enrichAnalysisLinks(analysis, input);
}
