export interface RetailerPrice {
  retailer: string;
  price: number;
  url: string;
  inStock: boolean;
  shipping?: string;
  /** True only when a live retailer listing supplied this price. */
  priceVerified?: boolean;
  /** True when the figure was not confirmed against a live listing. */
  estimated?: boolean;
  listingTitle?: string;
  imageUrl?: string;
}

export interface Alternative {
  name: string;
  brand: string;
  price: number;
  imageUrl?: string;
  url: string;
  matchScore: number;
  reason: string;
  tier: "premium" | "similar" | "dupe";
  priceVerified?: boolean;
  estimated?: boolean;
}

export interface OutfitItem {
  name: string;
  category: string;
  reason: string;
  imageUrl?: string;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
  /** Synthetic point. Forma does not store observed price history. */
  estimated: boolean;
}

export type PriceTrendDirection = "falling" | "stable" | "rising" | "unknown";

/** Qualitative AI guess. Not a chart of observed prices. */
export interface PriceTrendEstimate {
  direction: PriceTrendDirection;
  summary: string;
  typicalMarkdown?: string;
  estimated: true;
}

export interface SalePrediction {
  likelihood: "high" | "medium" | "low";
  predictedDrop: string;
  estimatedSalePrice: number;
  reasoning: string;
  /** Always an AI guess. Forma does not observe sale calendars. */
  estimated: true;
}

export interface ReviewSummary {
  overallRating: number;
  totalReviews: number;
  pros: string[];
  cons: string[];
  summary: string;
  qualityScore: number;
  valueScore: number;
}

export interface WardrobeMatch {
  item: string;
  compatibility: "high" | "medium" | "low";
  note: string;
  imageUrl?: string;
}

export interface ProductAnalysis {
  id: string;
  identifiedProduct: {
    name: string;
    brand: string;
    category: string;
    description: string;
    estimatedRetailPrice: number;
    colors: string[];
    materials: string[];
    style: string[];
    confidence: number;
    imageUrl?: string;
  };
  verdict: {
    recommendation: "buy" | "wait" | "skip" | "consider-alternatives";
    headline: string;
    reasoning: string;
    worthItScore: number;
  };
  prices: RetailerPrice[];
  lowestPrice: RetailerPrice;
  alternatives: Alternative[];
  reviewSummary: ReviewSummary;
  outfitSuggestions: OutfitItem[];
  priceHistory: PriceHistoryPoint[];
  priceTrend?: PriceTrendEstimate;
  salePrediction: SalePrediction;
  stylingTips: string[];
  wardrobeMatches: WardrobeMatch[];
  secondhand: {
    available: boolean;
    platforms: { name: string; price: number; url: string; estimated?: boolean }[];
  };
  matchedListingTitle?: string;
  pricesVerified?: boolean;
  analyzedAt: string;
}

export type AnalyzeInput =
  | { type: "image"; base64: string; mimeType: string }
  | { type: "url"; url: string }
  | { type: "text"; query: string };
