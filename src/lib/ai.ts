import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { AnalyzeInput, ProductAnalysis } from "./types";
import { generateMockAnalysis } from "./mock-analysis";
import { enrichAnalysisLinks } from "./enrich-links";
import { resolveProductUrl, resolveAlternativeUrl, resolveSecondhandUrl } from "./product-links";
import { coercePrice } from "./utils";

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You are Forma, an expert AI shopping copilot for fashion and lifestyle products.
Analyze the input and return ONLY valid JSON (no markdown) matching this schema:
{
  "identifiedProduct": { "name", "brand", "category", "description", "estimatedRetailPrice", "colors", "materials", "style", "confidence" },
  "verdict": { "recommendation": "buy"|"wait"|"skip"|"consider-alternatives", "headline", "reasoning", "worthItScore" },
  "prices": [{ "retailer", "price", "url", "inStock", "shipping?" }],
  "alternatives": [{ "name", "brand", "price", "imageUrl": "", "url", "matchScore", "reason", "tier": "premium"|"similar"|"dupe" }],
  "reviewSummary": { "overallRating", "totalReviews", "pros", "cons", "summary", "qualityScore", "valueScore" },
  "outfitSuggestions": [{ "name", "category", "reason" }],
  "priceHistory": [{ "date": "YYYY-MM", "price" }],
  "salePrediction": { "likelihood": "high"|"medium"|"low", "predictedDrop", "estimatedSalePrice", "reasoning" },
  "stylingTips": string[],
  "wardrobeMatches": [{ "item", "compatibility": "high"|"medium"|"low", "note" }],
  "secondhand": { "available", "platforms": [{ "name", "price", "url" }] }
}
Keep text concise. colors, materials, and style must be JSON arrays of strings. Include 3 alternatives and 3-4 prices.
Be precise about product color in both "name" and "colors" (e.g. "Black Supima Cotton T-Shirt", colors: ["Black"]). Prices are approximate — live retailer prices replace them after analysis.
For prices and alternatives, set "url" to an empty string — real product links are added automatically after analysis.
Respond with a single JSON object only. No markdown, no code fences, no text before or after the JSON.`;

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
  const brand = raw.identifiedProduct?.brand ?? "";
  const name = raw.identifiedProduct?.name ?? "";

  const prices = (Array.isArray(raw.prices) ? raw.prices : []).map((p) => ({
    ...p,
    price: coercePrice(p.price) ?? 0,
    url: resolveProductUrl(p.url, p.retailer, brand, name),
  }));

  const alternatives = (Array.isArray(raw.alternatives) ? raw.alternatives : []).map((alt) => ({
    ...alt,
    price: coercePrice(alt.price) ?? 0,
    url: resolveAlternativeUrl(alt.url, alt.brand, alt.name),
  }));

  const platforms = (Array.isArray(raw.secondhand?.platforms) ? raw.secondhand.platforms : []).map(
    (platform) => ({
      ...platform,
      price: coercePrice(platform.price) ?? 0,
      url: resolveSecondhandUrl(platform.url, platform.name, brand, name),
    })
  );

  return {
    ...raw,
    identifiedProduct: {
      ...raw.identifiedProduct,
      estimatedRetailPrice: coercePrice(raw.identifiedProduct?.estimatedRetailPrice) ?? 0,
      colors: toStringArray(raw.identifiedProduct?.colors),
      materials: toStringArray(raw.identifiedProduct?.materials),
      style: toStringArray(raw.identifiedProduct?.style),
      confidence: confidence > 1 ? confidence / 100 : confidence,
    },
    prices,
    alternatives,
    reviewSummary: {
      ...raw.reviewSummary,
      pros: toStringArray(raw.reviewSummary?.pros),
      cons: toStringArray(raw.reviewSummary?.cons),
    },
    outfitSuggestions: Array.isArray(raw.outfitSuggestions) ? raw.outfitSuggestions : [],
    priceHistory: (Array.isArray(raw.priceHistory) ? raw.priceHistory : []).map((point) => ({
      ...point,
      price: coercePrice(point.price) ?? 0,
    })),
    salePrediction: raw.salePrediction
      ? {
          ...raw.salePrediction,
          estimatedSalePrice: coercePrice(raw.salePrediction.estimatedSalePrice) ?? 0,
        }
      : raw.salePrediction,
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

function parseAnalysis(raw: string): Omit<ProductAnalysis, "id" | "analyzedAt" | "lowestPrice"> {
  return normalizeAnalysis(JSON.parse(extractJson(raw)));
}

function buildUserText(input: AnalyzeInput): string {
  if (input.type === "image") {
    return "Identify this fashion/product item and provide a complete shopping analysis to help me decide whether to buy it.";
  }
  if (input.type === "url") {
    return `Analyze this product link and provide a complete shopping decision analysis: ${input.url}`;
  }
  return `Analyze this product query and provide a complete shopping decision analysis: ${input.query}`;
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
  const lowestPrice = lowestValid ?? {
    retailer: normalized.identifiedProduct.brand || "Unknown",
    price: coercePrice(normalized.identifiedProduct.estimatedRetailPrice) ?? 0,
    url: "#",
    inStock: true,
  };

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

  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No response from AI");
  }

  return finalizeAnalysis(parseAnalysis(textBlock.text));
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
      { role: "system", content: SYSTEM_PROMPT },
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

  if (!apiKey || apiKey === "sk-your-key-here") {
    const query =
      input.type === "text" ? input.query : input.type === "url" ? input.url : undefined;
    analysis = generateMockAnalysis(query);
  } else if (isAnthropicKey(apiKey)) {
    analysis = await analyzeWithAnthropic(input, apiKey);
  } else {
    analysis = await analyzeWithOpenAI(input, apiKey);
  }

  return enrichAnalysisLinks(analysis, input);
}
