import type { AnalyzeInput, ProductAnalysis, RetailerPrice } from "./types";
import {
  buildAlternativeUrl,
  buildProductSearchUrl,
  buildSecondhandUrl,
} from "./product-links";
import {
  findBestListing,
  findImageForQuery,
  getSerperApiKey,
  lookupProductListings,
  mergeListingImage,
  normalizeImageUrl,
} from "./serper";
import { coercePrice } from "./utils";

function getUserQuery(input?: AnalyzeInput): string | undefined {
  if (!input) return undefined;
  if (input.type === "text") return input.query;
  if (input.type === "url") return input.url;
  return undefined;
}

function validPrice(value: unknown): number | undefined {
  return coercePrice(value);
}

function sanitizeRetailerPrice(price: RetailerPrice, fallback?: RetailerPrice): RetailerPrice {
  const parsed = validPrice(price.price) ?? validPrice(fallback?.price);
  return {
    ...price,
    price: parsed ?? 0,
    priceVerified: parsed !== undefined && price.priceVerified === true,
    imageUrl: normalizeImageUrl(price.imageUrl) ?? normalizeImageUrl(fallback?.imageUrl),
  };
}

async function enrichImages(
  analysis: ProductAnalysis,
  input: AnalyzeInput | undefined,
  serperKey: string,
  heroImageFromListing?: string
): Promise<ProductAnalysis> {
  const product = analysis.identifiedProduct;
  const userQuery = getUserQuery(input);

  let productImage =
    normalizeImageUrl(heroImageFromListing) ?? normalizeImageUrl(product.imageUrl);

  if (!productImage) {
    const lookup = await lookupProductListings(
      serperKey,
      product,
      analysis.lowestPrice.retailer,
      userQuery
    );
    productImage =
      lookup.heroImage ??
      normalizeImageUrl(lookup.withPrice[0]?.imageUrl) ??
      normalizeImageUrl(lookup.relaxed[0]?.imageUrl);
  }

  const alternatives = analysis.alternatives.map((alt) => {
    const existing = normalizeImageUrl(alt.imageUrl);
    return existing ? { ...alt, imageUrl: existing } : alt;
  });

  const outfitSuggestions = [...analysis.outfitSuggestions];
  await Promise.all(
    outfitSuggestions.slice(0, 3).map(async (outfit, index) => {
      const existing = normalizeImageUrl(outfit.imageUrl);
      if (existing) {
        outfitSuggestions[index] = { ...outfit, imageUrl: existing };
        return;
      }
      const imageUrl = await findImageForQuery(serperKey, outfit.name);
      outfitSuggestions[index] = { ...outfit, imageUrl };
    })
  );

  const wardrobeMatches = [...analysis.wardrobeMatches];
  await Promise.all(
    wardrobeMatches.slice(0, 3).map(async (match, index) => {
      const existing = normalizeImageUrl(match.imageUrl);
      if (existing) {
        wardrobeMatches[index] = { ...match, imageUrl: existing };
        return;
      }
      const imageUrl = await findImageForQuery(serperKey, match.item);
      wardrobeMatches[index] = { ...match, imageUrl };
    })
  );

  if (!productImage && alternatives[0]?.imageUrl) {
    productImage = normalizeImageUrl(alternatives[0].imageUrl);
  }

  return {
    ...analysis,
    identifiedProduct: {
      ...product,
      imageUrl: productImage,
    },
    alternatives,
    outfitSuggestions,
    wardrobeMatches,
  };
}

export async function enrichAnalysisLinks(
  analysis: ProductAnalysis,
  input?: AnalyzeInput
): Promise<ProductAnalysis> {
  const product = analysis.identifiedProduct;
  const userQuery = getUserQuery(input);
  const serperKey = getSerperApiKey();
  const retailer = analysis.lowestPrice?.retailer ?? product.brand;

  const aiLowest = sanitizeRetailerPrice(analysis.lowestPrice);
  let lowestPrice = { ...aiLowest };
  let prices = analysis.prices.map((p) => sanitizeRetailerPrice(p));
  let matchedListingTitle: string | undefined;
  let pricesVerified = false;
  let heroImageFromListing: string | undefined;

  if (serperKey) {
    const lookup = await lookupProductListings(serperKey, product, retailer, userQuery);
    const validListings = lookup.withPrice.filter((l) => validPrice(l.price) !== undefined);

    if (validListings.length > 0) {
      const best = mergeListingImage(validListings[0], validListings, lookup.items);
      const bestPrice = validPrice(best.price)!;
      heroImageFromListing = best.imageUrl;

      lowestPrice = {
        retailer: best.source || retailer,
        price: bestPrice,
        url: best.url,
        inStock: true,
        priceVerified: true,
        listingTitle: best.title,
        imageUrl: best.imageUrl,
      };
      matchedListingTitle = best.title;

      prices = validListings.slice(0, 5).map((listing, i) => {
        const merged =
          i === 0 ? best : mergeListingImage(listing, validListings, lookup.items);
        return {
          retailer: merged.source,
          price: validPrice(merged.price)!,
          url: merged.url,
          inStock: true,
          priceVerified: true,
          listingTitle: merged.title,
          imageUrl: merged.imageUrl ?? best.imageUrl,
        };
      });

      pricesVerified = true;
    } else {
      const fallbackListing = lookup.relaxed[0];
      const fallback =
        fallbackListing ??
        (lookup.heroImage
          ? {
              url: "",
              title: product.name,
              source: product.brand,
              imageUrl: lookup.heroImage,
            }
          : null);
      const fallbackPrice = validPrice(fallback?.price);

      if (fallback) {
        const merged = mergeListingImage(
          fallbackListing ?? fallback,
          fallbackListing ? lookup.relaxed : [fallback],
          lookup.items
        );
        heroImageFromListing = merged.imageUrl;
        lowestPrice = {
          ...lowestPrice,
          url: merged.url || lowestPrice.url,
          price: fallbackPrice ?? lowestPrice.price,
          priceVerified: fallbackPrice !== undefined,
          listingTitle: merged.title,
          retailer: merged.source || lowestPrice.retailer,
          imageUrl: merged.imageUrl,
        };
        matchedListingTitle = merged.title;
        pricesVerified = fallbackPrice !== undefined;
      }
    }
  }

  if (!lowestPrice.url || lowestPrice.url === "#") {
    lowestPrice.url = buildProductSearchUrl(lowestPrice.retailer, product.brand, product.name);
  }

  if (!validPrice(lowestPrice.price)) {
    lowestPrice = {
      ...lowestPrice,
      price: validPrice(aiLowest.price) ?? validPrice(product.estimatedRetailPrice) ?? 0,
      priceVerified: false,
    };
    pricesVerified = false;
  }

  const alternatives = await Promise.all(
    analysis.alternatives.map(async (alt, index) => {
      const aiPrice = validPrice(alt.price);
      let url = buildAlternativeUrl(alt.brand, alt.name);
      let price = aiPrice ?? 0;
      let priceVerified = false;
      let imageUrl = normalizeImageUrl(alt.imageUrl);

      if (serperKey && index < 3) {
        const listing = await findBestListing(
          serperKey,
          { brand: alt.brand, name: alt.name, colors: product.colors, category: product.category },
          alt.brand,
          `${alt.brand} ${alt.name}`
        );
        const listingPrice = validPrice(listing?.price);
        if (listing) {
          url = listing.url || url;
          if (listingPrice) {
            price = listingPrice;
            priceVerified = true;
          }
          imageUrl = listing.imageUrl ?? imageUrl;
        }
      }

      if (!imageUrl && serperKey) {
        imageUrl = await findImageForQuery(serperKey, `${alt.brand} ${alt.name}`);
      }

      return { ...alt, url, price, priceVerified, imageUrl: imageUrl ?? "" };
    })
  );

  const platforms = analysis.secondhand.platforms.map((platform) => ({
    ...platform,
    price: validPrice(platform.price) ?? 0,
    url: buildSecondhandUrl(platform.name, product.brand, product.name),
  }));

  const verifiedRetailPrice = validPrice(lowestPrice.price);

  let enriched: ProductAnalysis = {
    ...analysis,
    identifiedProduct: {
      ...product,
      estimatedRetailPrice: verifiedRetailPrice ?? validPrice(product.estimatedRetailPrice) ?? 0,
    },
    prices: pricesVerified ? prices : prices.map((p) => ({ ...p, priceVerified: false })),
    lowestPrice,
    alternatives,
    secondhand: { ...analysis.secondhand, platforms },
    matchedListingTitle,
    pricesVerified,
  };

  if (serperKey) {
    enriched = await enrichImages(enriched, input, serperKey, heroImageFromListing);
  }

  return enriched;
}
