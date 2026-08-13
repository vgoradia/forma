import type { AnalyzeInput, ProductAnalysis, RetailerPrice } from "./types";
import {
  buildAlternativeUrl,
  buildProductSearchUrl,
  buildSecondhandUrl,
  finalizeAlternativeUrl,
  finalizeRetailerUrl,
  isGenericSearchUrl,
  isProductDetailUrl,
} from "./product-links";
import {
  findBestListing,
  findImageForQuery,
  findProductLinkViaWebSearch,
  findRetailerLinkViaWebSearch,
  getSerperApiKey,
  lookupProductListings,
  mergeListingImage,
  normalizeImageUrl,
  pickDirectShoppingListings,
  type ShoppingLookupResult,
} from "./serper";
import { RETAILER_DOMAINS } from "./product-links";
import { resolveProductImageUrl, resolveQueryImageUrl } from "./resolve-image";
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

async function resolveToProductUrl(
  apiKey: string,
  retailer: string,
  product: ProductAnalysis["identifiedProduct"] | { brand: string; name: string; colors: string[]; category: string },
  userQuery: string | undefined,
  current: RetailerPrice
): Promise<RetailerPrice> {
  if (isProductDetailUrl(current.url)) return current;

  const listingTitle = current.listingTitle;
  const retailersToTry = [retailer, product.brand].filter(
    (label, index, arr) => label && arr.indexOf(label) === index
  );

  for (const label of retailersToTry) {
    const listing = await findRetailerLinkViaWebSearch(
      apiKey,
      label,
      product,
      listingTitle,
      userQuery
    );
    if (listing && isProductDetailUrl(listing.url)) {
      const listingPrice = validPrice(listing.price);
      return {
        ...current,
        url: listing.url,
        retailer: listing.source || label,
        listingTitle: listing.title ?? listingTitle,
        price: listingPrice ?? current.price,
        priceVerified: listingPrice !== undefined ? true : current.priceVerified,
        imageUrl: listing.imageUrl ?? current.imageUrl,
      };
    }
  }

  const fallback = await findProductLinkViaWebSearch(apiKey, product, userQuery, retailer);
  if (fallback && isProductDetailUrl(fallback.url)) {
    const listingPrice = validPrice(fallback.price);
    return {
      ...current,
      url: fallback.url,
      retailer: fallback.source || current.retailer,
      listingTitle: fallback.title ?? listingTitle,
      price: listingPrice ?? current.price,
      priceVerified: listingPrice !== undefined ? true : current.priceVerified,
      imageUrl: fallback.imageUrl ?? current.imageUrl,
    };
  }

  return current;
}

function retailerDomain(label: string): string | undefined {
  const key = label.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [retailer, domain] of Object.entries(RETAILER_DOMAINS)) {
    const rk = retailer.replace(/[^a-z0-9]/g, "");
    if (key.includes(rk) || rk.includes(key)) return domain;
  }
  return undefined;
}

function matchListingForRetailer(
  listings: ReturnType<typeof pickDirectShoppingListings>,
  retailer: string
) {
  const domain = retailerDomain(retailer);
  return (
    listings.find((listing) => {
      const source = listing.source.toLowerCase();
      const label = retailer.toLowerCase();
      return source.includes(label) || label.includes(source);
    }) ??
    (domain ? listings.find((listing) => listing.url.includes(domain)) : undefined)
  );
}

function applyDirectShoppingLinks(
  lookup: ShoppingLookupResult,
  product: ProductAnalysis["identifiedProduct"],
  userQuery: string | undefined,
  lowestPrice: RetailerPrice,
  prices: RetailerPrice[]
): { lowestPrice: RetailerPrice; prices: RetailerPrice[]; matchedListingTitle?: string } {
  const directListings = pickDirectShoppingListings(lookup.items, product, userQuery);
  if (directListings.length === 0) {
    return { lowestPrice, prices };
  }

  const best = mergeListingImage(
    directListings.find((listing) => isProductDetailUrl(listing.url)) ?? directListings[0],
    directListings,
    lookup.items
  );
  const bestPrice = validPrice(best.price);

  const nextLowest: RetailerPrice = {
    ...lowestPrice,
    url: isProductDetailUrl(best.url) ? best.url : lowestPrice.url,
    retailer: best.source || lowestPrice.retailer,
    price: bestPrice ?? lowestPrice.price,
    priceVerified: bestPrice !== undefined ? true : lowestPrice.priceVerified,
    listingTitle: best.title,
    imageUrl: best.imageUrl ?? lowestPrice.imageUrl,
  };

  const nextPrices = prices.map((priceRow) => {
    if (!isGenericSearchUrl(priceRow.url)) return priceRow;

    const shoppingMatch = lookup.items.find((item) => {
      const source = (item.source ?? "").toLowerCase();
      const label = priceRow.retailer.toLowerCase();
      return source.includes(label) || label.includes(source);
    });

    const match =
      matchListingForRetailer(directListings, priceRow.retailer) ??
      (priceRow.retailer === lowestPrice.retailer ? best : undefined);

    if (!match) return priceRow;

    const matchedPrice = validPrice(match.price);
    const nextUrl = isProductDetailUrl(match.url) ? match.url : priceRow.url;
    return {
      ...priceRow,
      url: nextUrl,
      price: matchedPrice ?? priceRow.price,
      priceVerified: matchedPrice !== undefined,
      listingTitle: match.title ?? shoppingMatch?.title,
      imageUrl: match.imageUrl ?? priceRow.imageUrl,
    };
  });

  return {
    lowestPrice: nextLowest,
    prices: nextPrices,
    matchedListingTitle: best.title,
  };
}

async function applyWebSearchLinks(
  apiKey: string,
  _lookup: ShoppingLookupResult,
  product: ProductAnalysis["identifiedProduct"],
  userQuery: string | undefined,
  lowestPrice: RetailerPrice,
  prices: RetailerPrice[]
): Promise<{ lowestPrice: RetailerPrice; prices: RetailerPrice[]; matchedListingTitle?: string }> {
  const nextLowest = await resolveToProductUrl(apiKey, lowestPrice.retailer, product, userQuery, lowestPrice);
  const matchedListingTitle = nextLowest.listingTitle;

  const nextPrices = await Promise.all(
    prices.map(async (priceRow, index) => {
      if (isProductDetailUrl(priceRow.url)) return priceRow;
      if (index >= 3) return priceRow;
      return resolveToProductUrl(apiKey, priceRow.retailer, product, userQuery, priceRow);
    })
  );

  return { lowestPrice: nextLowest, prices: nextPrices, matchedListingTitle };
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

  if (!productImage) {
    productImage = await resolveProductImageUrl(
      {
        brand: product.brand,
        name: product.name,
        colors: product.colors,
        category: product.category,
        retailer: analysis.lowestPrice.retailer,
        query: userQuery,
      },
      input
    );
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
      const imageUrl =
        (await findImageForQuery(serperKey, outfit.name)) ??
        (await resolveQueryImageUrl(outfit.name));
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
      const imageUrl =
        (await findImageForQuery(serperKey, match.item)) ??
        (await resolveQueryImageUrl(match.item));
      wardrobeMatches[index] = { ...match, imageUrl };
    })
  );

  if (!productImage && alternatives[0]?.imageUrl) {
    productImage = normalizeImageUrl(alternatives[0].imageUrl);
  }

  return applyProductImage(analysis, productImage, alternatives, outfitSuggestions, wardrobeMatches);
}

async function enrichImagesWithoutSerper(
  analysis: ProductAnalysis,
  input?: AnalyzeInput
): Promise<ProductAnalysis> {
  const product = analysis.identifiedProduct;
  const userQuery = getUserQuery(input);

  let productImage = normalizeImageUrl(product.imageUrl);
  if (!productImage) {
    productImage = await resolveProductImageUrl(
      {
        brand: product.brand,
        name: product.name,
        colors: product.colors,
        category: product.category,
        retailer: analysis.lowestPrice.retailer,
        query: userQuery,
      },
      input
    );
  }

  const alternatives = await Promise.all(
    analysis.alternatives.map(async (alt) => {
      const existing = normalizeImageUrl(alt.imageUrl);
      if (existing) return { ...alt, imageUrl: existing };
      const imageUrl = await resolveQueryImageUrl(`${alt.brand} ${alt.name}`);
      return { ...alt, imageUrl: imageUrl || undefined };
    })
  );

  const outfitSuggestions = await Promise.all(
    analysis.outfitSuggestions.map(async (outfit) => {
      const existing = normalizeImageUrl(outfit.imageUrl);
      if (existing) return { ...outfit, imageUrl: existing };
      const imageUrl = await resolveQueryImageUrl(outfit.name);
      return { ...outfit, imageUrl };
    })
  );

  const wardrobeMatches = await Promise.all(
    analysis.wardrobeMatches.map(async (match) => {
      const existing = normalizeImageUrl(match.imageUrl);
      if (existing) return { ...match, imageUrl: existing };
      const imageUrl = await resolveQueryImageUrl(match.item);
      return { ...match, imageUrl };
    })
  );

  if (!productImage && alternatives[0]?.imageUrl) {
    productImage = normalizeImageUrl(alternatives[0].imageUrl);
  }

  return applyProductImage(analysis, productImage, alternatives, outfitSuggestions, wardrobeMatches);
}

function applyProductImage(
  analysis: ProductAnalysis,
  productImage: string | undefined,
  alternatives: ProductAnalysis["alternatives"],
  outfitSuggestions: ProductAnalysis["outfitSuggestions"],
  wardrobeMatches: ProductAnalysis["wardrobeMatches"]
): ProductAnalysis {
  return {
    ...analysis,
    identifiedProduct: {
      ...analysis.identifiedProduct,
      imageUrl: productImage,
    },
    lowestPrice: {
      ...analysis.lowestPrice,
      imageUrl: analysis.lowestPrice.imageUrl ?? productImage,
    },
    prices: analysis.prices.map((price) => ({
      ...price,
      imageUrl: price.imageUrl ?? productImage,
    })),
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
      const pdpListing = validListings.find((listing) => isProductDetailUrl(listing.url));
      const best = mergeListingImage(pdpListing ?? validListings[0], validListings, lookup.items);
      const bestPrice = validPrice(best.price)!;
      heroImageFromListing = best.imageUrl;

      lowestPrice = {
        retailer: best.source || retailer,
        price: bestPrice,
        url: isProductDetailUrl(best.url) ? best.url : lowestPrice.url,
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
          url: isProductDetailUrl(merged.url) ? merged.url : buildProductSearchUrl(merged.source, product.brand, product.name),
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
          url:
            merged.url && isProductDetailUrl(merged.url)
              ? merged.url
              : finalizeRetailerUrl(lowestPrice.url, lowestPrice.retailer, product.brand, product.name),
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

    const linked = applyDirectShoppingLinks(lookup, product, userQuery, lowestPrice, prices);
    lowestPrice = linked.lowestPrice;
    prices = linked.prices;
    matchedListingTitle = linked.matchedListingTitle ?? matchedListingTitle;

    if (isGenericSearchUrl(lowestPrice.url) || !isProductDetailUrl(lowestPrice.url) || prices.some((p) => !isProductDetailUrl(p.url))) {
      const webLinked = await applyWebSearchLinks(
        serperKey,
        lookup,
        product,
        userQuery,
        lowestPrice,
        prices
      );
      lowestPrice = webLinked.lowestPrice;
      prices = webLinked.prices;
      matchedListingTitle = webLinked.matchedListingTitle ?? matchedListingTitle;
    }

    if (validPrice(lowestPrice.price) && !isGenericSearchUrl(lowestPrice.url)) {
      pricesVerified = pricesVerified || lowestPrice.priceVerified === true;
    }
  }

  lowestPrice.url = finalizeRetailerUrl(
    lowestPrice.url,
    lowestPrice.retailer,
    product.brand,
    product.name
  );

  prices = prices.map((priceRow) => ({
    ...priceRow,
    url: finalizeRetailerUrl(priceRow.url, priceRow.retailer, product.brand, product.name),
  }));

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

      if (serperKey && index < 5) {
        const listing = await findBestListing(
          serperKey,
          { brand: alt.brand, name: alt.name, colors: product.colors, category: product.category },
          alt.brand,
          `${alt.brand} ${alt.name}`
        );
        const listingPrice = validPrice(listing?.price);
        if (listing?.url && isProductDetailUrl(listing.url)) {
          url = listing.url;
          if (listingPrice) {
            price = listingPrice;
            priceVerified = true;
          }
          imageUrl = listing.imageUrl ?? imageUrl;
        } else if (listing) {
          if (listingPrice) {
            price = listingPrice;
            priceVerified = true;
          }
          imageUrl = listing.imageUrl ?? imageUrl;
        }
      }

      if (serperKey && (isGenericSearchUrl(url) || !isProductDetailUrl(url))) {
        const resolved = await resolveToProductUrl(
          serperKey,
          alt.brand,
          { brand: alt.brand, name: alt.name, colors: product.colors, category: product.category },
          `${alt.brand} ${alt.name}`,
          { retailer: alt.brand, price, url, inStock: true, priceVerified }
        );
        if (isProductDetailUrl(resolved.url)) {
          url = resolved.url;
        }
        imageUrl = imageUrl ?? resolved.imageUrl;
      }

      url = finalizeAlternativeUrl(url, alt.brand, alt.name);

      if (!imageUrl && serperKey) {
        imageUrl =
          (await findImageForQuery(serperKey, `${alt.brand} ${alt.name}`)) ??
          (await resolveQueryImageUrl(`${alt.brand} ${alt.name}`));
      }

      if (!imageUrl) {
        imageUrl = await resolveQueryImageUrl(`${alt.brand} ${alt.name}`);
      }

      return { ...alt, url, price, priceVerified, imageUrl: imageUrl || undefined };
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
  } else {
    enriched = await enrichImagesWithoutSerper(enriched, input);
  }

  return enriched;
}
