import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp, MAX_IMAGE_LOOKUP_REQUESTS } from "@/lib/rate-limit";
import { resolveProductImageUrl, resolveQueryImageUrl } from "@/lib/resolve-image";
import { sanitizeApiError, validateTextQuery } from "@/lib/security";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`product-image:${ip}`, MAX_IMAGE_LOOKUP_REQUESTS);

  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limit.retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  try {
    const body = (await request.json()) as {
      brand?: string;
      name?: string;
      colors?: string[];
      category?: string;
      query?: string;
      retailer?: string;
    };

    const brand = String(body.brand ?? "").slice(0, 120);
    const name = String(body.name ?? "").slice(0, 200);
    const category = String(body.category ?? "").slice(0, 80);
    const retailer = body.retailer ? String(body.retailer).slice(0, 80) : undefined;

    if (body.query) {
      const queryError = validateTextQuery(body.query);
      if (queryError) {
        return NextResponse.json({ error: queryError }, { status: 400 });
      }
    }

    const product = {
      brand,
      name,
      colors: Array.isArray(body.colors)
        ? body.colors.map((c) => String(c).slice(0, 40)).slice(0, 8)
        : [],
      category,
      retailer,
      query: body.query?.trim(),
    };

    const imageUrl =
      (await resolveProductImageUrl(product)) ??
      (product.query ? await resolveQueryImageUrl(product.query) : undefined) ??
      (await resolveQueryImageUrl(`${product.brand} ${product.name}`.trim()));

    if (!imageUrl) {
      return NextResponse.json({ error: "No image found" }, { status: 404 });
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Product image lookup error:", error);
    return NextResponse.json(
      { error: sanitizeApiError(error, "Image lookup failed") },
      { status: 500 }
    );
  }
}
