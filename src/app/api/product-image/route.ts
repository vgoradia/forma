import { NextRequest, NextResponse } from "next/server";
import { findImageForQuery, findProductImage, getSerperApiKey } from "@/lib/serper";

export async function POST(request: NextRequest) {
  const serperKey = getSerperApiKey();
  if (!serperKey) {
    return NextResponse.json({ error: "Serper not configured" }, { status: 503 });
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

    const product = {
      brand: body.brand ?? "",
      name: body.name ?? "",
      colors: Array.isArray(body.colors) ? body.colors : [],
      category: body.category ?? "",
    };

    const imageUrl =
      (await findProductImage(serperKey, product, body.query, body.retailer)) ??
      (body.query ? await findImageForQuery(serperKey, body.query) : undefined) ??
      (await findImageForQuery(serperKey, `${product.brand} ${product.name}`.trim()));

    if (!imageUrl) {
      return NextResponse.json({ error: "No image found" }, { status: 404 });
    }

    return NextResponse.json({ imageUrl });
  } catch {
    return NextResponse.json({ error: "Image lookup failed" }, { status: 500 });
  }
}
