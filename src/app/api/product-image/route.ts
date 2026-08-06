import { NextRequest, NextResponse } from "next/server";
import { resolveProductImageUrl, resolveQueryImageUrl } from "@/lib/resolve-image";

export async function POST(request: NextRequest) {
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
      retailer: body.retailer,
      query: body.query,
    };

    const imageUrl =
      (await resolveProductImageUrl(product)) ??
      (body.query ? await resolveQueryImageUrl(body.query) : undefined) ??
      (await resolveQueryImageUrl(`${product.brand} ${product.name}`.trim()));

    if (!imageUrl) {
      return NextResponse.json({ error: "No image found" }, { status: 404 });
    }

    return NextResponse.json({ imageUrl });
  } catch {
    return NextResponse.json({ error: "Image lookup failed" }, { status: 500 });
  }
}
