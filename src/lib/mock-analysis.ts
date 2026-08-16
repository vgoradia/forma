import type { ProductAnalysis } from "./types";
import { resolveProductUrl, resolveAlternativeUrl, resolveSecondhandUrl } from "./product-links";

const img = (id: string, w = 400, h = 500) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;

const DEMO_IMAGES = {
  blazer: {
    hero: img("1591047139829-d91aecb6caea", 600, 800),
    alternatives: [
      img("1594938298603-c8148c4dae35"),
      img("1515886657613-9f3515b0c78f"),
      img("1558769132-cb1aea458c5e"),
    ],
  },
  dress: {
    hero: img("1595777457583-95e059d581b8", 600, 800),
    alternatives: [
      img("1566174053879-31528523f8ae"),
      img("1496747611176-843222e1e57c"),
      img("1469334031218-e382a71b716b"),
    ],
  },
  sneakers: {
    hero: img("1549298916-b41d501d3772", 600, 800),
    alternatives: [
      img("1608231387042-66d1773070a5"),
      img("1542291026-7eec264c27ff"),
      img("1490481651871-ab68de25d43d"),
    ],
  },
};

const DEMO_SCENARIOS: Record<string, Partial<ProductAnalysis>> = {
  blazer: {
    identifiedProduct: {
      name: "Oversized Double-Breasted Blazer",
      brand: "The Frankie Shop",
      category: "Outerwear",
      description:
        "A structured oversized blazer in warm camel with peak lapels, double-breasted closure, and relaxed shoulders. A staple piece that bridges smart-casual and elevated streetwear.",
      estimatedRetailPrice: 295,
      colors: ["Camel", "Warm Beige"],
      materials: ["Wool blend", "Polyester lining"],
      style: ["Minimalist", "Contemporary", "Oversized"],
      confidence: 0.91,
    },
  },
  dress: {
    identifiedProduct: {
      name: "Silk Slip Midi Dress",
      brand: "Reformation",
      category: "Dresses",
      description:
        "A bias-cut silk slip dress in deep burgundy with a cowl neckline and delicate adjustable straps. Falls to mid-calf with a subtle side slit.",
      estimatedRetailPrice: 248,
      colors: ["Burgundy", "Deep Red"],
      materials: ["100% Silk"],
      style: ["Romantic", "Minimal", "Evening"],
      confidence: 0.88,
    },
  },
  sneakers: {
    identifiedProduct: {
      name: "Classic Low-Top Sneaker",
      brand: "Common Projects",
      category: "Footwear",
      description:
        "Minimalist white leather low-top sneakers with gold-stamped serial number on the heel tab. Clean lines, premium Italian leather upper.",
      estimatedRetailPrice: 425,
      colors: ["White", "Off-White"],
      materials: ["Italian leather", "Rubber sole"],
      style: ["Minimalist", "Luxury casual", "Streetwear"],
      confidence: 0.94,
    },
  },
};

function pickScenario(query?: string): keyof typeof DEMO_SCENARIOS {
  const q = (query ?? "").toLowerCase();
  if (q.includes("dress") || q.includes("slip") || q.includes("silk") || q.includes("gown")) {
    return "dress";
  }
  if (
    q.includes("sneaker") ||
    q.includes("shoe") ||
    q.includes("trainer") ||
    q.includes("boot") ||
    q.includes("sandal")
  ) {
    return "sneakers";
  }
  if (
    q.includes("short") ||
    q.includes("pant") ||
    q.includes("trouser") ||
    q.includes("jean") ||
    q.includes("chino") ||
    q.includes("skirt")
  ) {
    return "blazer";
  }
  return "blazer";
}

export function generateMockAnalysis(query?: string): ProductAnalysis {
  const scenario = pickScenario(query);
  const base = DEMO_SCENARIOS[scenario];
  const images = DEMO_IMAGES[scenario as keyof typeof DEMO_IMAGES];
  const product = { ...base.identifiedProduct!, imageUrl: images.hero };

  const prices = [
    { retailer: "Shopbop", price: product.estimatedRetailPrice - 30, url: "#", inStock: true, shipping: "Free" },
    { retailer: "Nordstrom", price: product.estimatedRetailPrice, url: "#", inStock: true, shipping: "Free" },
    { retailer: "Revolve", price: product.estimatedRetailPrice + 10, url: "#", inStock: false },
    { retailer: product.brand, price: product.estimatedRetailPrice - 15, url: "#", inStock: true, shipping: "Free over $150" },
  ].sort((a, b) => a.price - b.price);

  const alternatives: ProductAnalysis["alternatives"] =
    scenario === "blazer"
      ? [
          {
            name: "Oversized Blazer",
            brand: "Zara",
            price: 89,
            imageUrl: "",
            url: "#",
            matchScore: 82,
            reason: "Similar silhouette and camel tone at a fraction of the price",
            tier: "dupe",
          },
          {
            name: "Relaxed Fit Blazer",
            brand: "COS",
            price: 175,
            imageUrl: "",
            url: "#",
            matchScore: 91,
            reason: "Premium construction with nearly identical cut and drape",
            tier: "similar",
          },
          {
            name: "Double Breasted Blazer",
            brand: "Totême",
            price: 520,
            imageUrl: "",
            url: "#",
            matchScore: 78,
            reason: "Higher-end Scandinavian minimalism with superior wool",
            tier: "premium",
          },
        ]
      : scenario === "dress"
        ? [
            {
              name: "Bias Cut Slip Dress",
              brand: "H&M Premium",
              price: 49,
              imageUrl: "",
              url: "#",
              matchScore: 75,
              reason: "Similar silhouette in satin — great for occasional wear",
              tier: "dupe",
            },
            {
              name: "Silk Midi Slip",
              brand: "Everlane",
              price: 168,
              imageUrl: "",
              url: "#",
              matchScore: 88,
              reason: "Real silk at a more accessible price point",
              tier: "similar",
            },
            {
              name: "Cowl Neck Slip Dress",
              brand: "Vince",
              price: 395,
              imageUrl: "",
              url: "#",
              matchScore: 85,
              reason: "Luxury drape and finishing details",
              tier: "premium",
            },
          ]
        : [
            {
              name: "Achilles Low",
              brand: "Koio",
              price: 295,
              imageUrl: "",
              url: "#",
              matchScore: 90,
              reason: "Handcrafted Italian leather with identical aesthetic",
              tier: "similar",
            },
            {
              name: "Clean 90",
              brand: "Axel Arigato",
              price: 245,
              imageUrl: "",
              url: "#",
              matchScore: 85,
              reason: "Scandinavian minimalism at a lower price",
              tier: "similar",
            },
            {
              name: "Court Vision Low",
              brand: "Nike",
              price: 85,
              imageUrl: "",
              url: "#",
              matchScore: 65,
              reason: "Casual alternative — different vibe but clean white look",
              tier: "dupe",
            },
          ];

  const resolvedPrices = prices.map((p) => ({
    ...p,
    url: resolveProductUrl(p.url, p.retailer, product.brand, product.name),
    imageUrl: images.hero,
  }));

  const lowestWithImage = resolvedPrices[0];

  const resolvedAlternatives = alternatives.map((alt, i) => ({
    ...alt,
    imageUrl: images.alternatives[i] ?? undefined,
    url: resolveAlternativeUrl(alt.url, alt.brand, alt.name),
  }));

  const resolvedSecondhand = {
    available: true,
    platforms: [
      { name: "The RealReal", price: Math.round(product.estimatedRetailPrice * 0.55), url: "#" },
      { name: "Depop", price: Math.round(product.estimatedRetailPrice * 0.45), url: "#" },
      { name: "Poshmark", price: Math.round(product.estimatedRetailPrice * 0.5), url: "#" },
    ].map((platform) => ({
      ...platform,
      url: resolveSecondhandUrl(platform.url, platform.name, product.brand, product.name),
    })),
  };

  return {
    id: crypto.randomUUID(),
    identifiedProduct: product,
    verdict: {
      recommendation: scenario === "sneakers" ? "consider-alternatives" : "buy",
      headline:
        scenario === "sneakers"
          ? "Great style, but you're paying a premium for the logo"
          : "Solid investment piece — buy at the lowest price",
      reasoning:
        scenario === "sneakers"
          ? "Common Projects are iconic but the markup is significant. Similar Italian leather alternatives exist at 30% less with comparable quality."
          : "This piece aligns with current trends and has strong versatility. Quality construction justifies the price, especially if you catch a sale.",
      worthItScore: scenario === "sneakers" ? 68 : 84,
    },
    prices: resolvedPrices,
    lowestPrice: lowestWithImage,
    alternatives: resolvedAlternatives,
    reviewSummary: {
      overallRating: 4.3,
      totalReviews: 847,
      pros:
        scenario === "sneakers"
          ? [
              "Premium leather quality",
              "Iconic minimalist design",
              "Comfortable for all-day wear",
              "Versatile with casual and smart outfits",
            ]
          : scenario === "dress"
            ? [
                "Beautiful drape and flattering fit",
                "Versatile for day-to-night styling",
                "True-to-color burgundy shade",
                "Adjustable straps for custom fit",
              ]
            : [
                "Excellent fit and drape",
                "Versatile for multiple occasions",
                "Quality materials that hold up over time",
                "Timeless design won't feel dated",
              ],
      cons:
        scenario === "sneakers"
          ? [
              "High price for minimal branding",
              "White leather scuffs easily",
              "Limited arch support for long walks",
            ]
          : scenario === "dress"
            ? [
                "Delicate silk requires careful handling",
                "Bias cut can cling — size carefully",
                "Dry clean only adds to long-term cost",
              ]
            : [
                "Runs slightly oversized — size down if between sizes",
                "Dry clean only adds to long-term cost",
                "Limited color options available",
              ],
      summary:
        scenario === "sneakers"
          ? "Buyers love the clean aesthetic and leather quality, but many note you're paying heavily for the logo. Consider alternatives if value is the priority."
          : "Buyers consistently praise the quality-to-style ratio. Most reviewers say they'd purchase again, though sizing and care require attention.",
      qualityScore: 88,
      valueScore: scenario === "sneakers" ? 62 : 79,
    },
    outfitSuggestions:
      scenario === "blazer"
        ? [
            { name: "White ribbed tank", category: "Top", reason: "Clean contrast against camel", imageUrl: img("1594938298603-c8148c4dae35") },
            { name: "High-waist wide-leg trousers", category: "Bottom", reason: "Elongates silhouette", imageUrl: img("1515886657613-9f3515b0c78f") },
            { name: "Gold hoop earrings", category: "Accessories", reason: "Warm metal complements camel tones", imageUrl: img("1469334031218-e382a71b716b") },
            { name: "Pointed-toe mules", category: "Shoes", reason: "Polished finish for smart-casual", imageUrl: img("1549298916-b41d501d3772") },
          ]
        : scenario === "dress"
          ? [
              { name: "Strappy heeled sandals", category: "Shoes", reason: "Elegant evening look", imageUrl: img("1549298916-b41d501d3772") },
              { name: "Delicate layered necklaces", category: "Accessories", reason: "Adds dimension to cowl neck", imageUrl: img("1469334031218-e382a71b716b") },
              { name: "Cropped leather jacket", category: "Outerwear", reason: "Edgy contrast for day-to-night", imageUrl: img("1591047139829-d91aecb6caea") },
            ]
          : [
              { name: "Slim-fit chinos", category: "Bottom", reason: "Clean casual pairing", imageUrl: img("1594938298603-c8148c4dae35") },
              { name: "Oversized linen shirt", category: "Top", reason: "Relaxed summer look", imageUrl: img("1566174053879-31528523f8ae") },
              { name: "Minimalist watch", category: "Accessories", reason: "Understated luxury", imageUrl: img("1469334031218-e382a71b716b") },
            ],
    priceHistory: [
      { date: "2025-10", price: product.estimatedRetailPrice + 20 },
      { date: "2025-11", price: product.estimatedRetailPrice },
      { date: "2025-12", price: product.estimatedRetailPrice - 10 },
      { date: "2026-01", price: product.estimatedRetailPrice - 25 },
      { date: "2026-02", price: product.estimatedRetailPrice - 15 },
      { date: "2026-03", price: lowestWithImage.price },
    ],
    salePrediction: {
      likelihood: "medium",
      predictedDrop: "Late March — end of season sale",
      estimatedSalePrice: Math.round(product.estimatedRetailPrice * 0.75),
      reasoning:
        "Historical data shows this brand runs seasonal promotions. Current price is near recent lows — waiting 2-3 weeks could save 15-25%.",
    },
    stylingTips:
      scenario === "blazer"
        ? [
            "Roll sleeves once for a relaxed, intentional look",
            "Layer over monochrome outfits to let the piece be the focal point",
            "Pair with textured fabrics (linen, ribbed knits) for visual interest",
          ]
        : scenario === "dress"
          ? [
              "Add delicate layered jewelry to complement the cowl neckline",
              "Pair with strappy heels for evening or white sneakers for day",
              "Throw on a cropped leather jacket to edge up the silhouette",
            ]
          : [
              "Keep them pristine — white leather elevates any outfit instantly",
              "Pair with slim chinos or tailored denim for a clean line",
              "Skip heavy patterns; let the sneakers anchor a minimal look",
            ],
    wardrobeMatches: [
      { item: "White sneakers", compatibility: "high", note: "Classic smart-casual combo", imageUrl: img("1549298916-b41d501d3772", 200, 200) },
      { item: "Dark wash jeans", compatibility: "high", note: "Effortless everyday pairing", imageUrl: img("1594938298603-c8148c4dae35", 200, 200) },
      { item: "Black ankle boots", compatibility: "medium", note: "Works for evening looks", imageUrl: img("1608231387042-66d1773070a5", 200, 200) },
      { item: "Floral print pieces", compatibility: "low", note: "Clashing aesthetics — keep patterns minimal", imageUrl: img("1566174053879-31528523f8ae", 200, 200) },
    ],
    secondhand: resolvedSecondhand,
    analyzedAt: new Date().toISOString(),
  };
}
