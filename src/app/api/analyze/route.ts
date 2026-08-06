import { NextRequest, NextResponse } from "next/server";
import { analyzeProduct } from "@/lib/ai";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { AnalyzeInput } from "@/lib/types";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`analyze:${ip}`);

  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limit.retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("image") as File | null;
      const url = formData.get("url") as string | null;
      const query = formData.get("query") as string | null;

      let input: AnalyzeInput;

      if (file && file.size > 0) {
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        input = { type: "image", base64, mimeType: file.type || "image/jpeg" };
      } else if (url) {
        input = { type: "url", url };
      } else if (query) {
        input = { type: "text", query };
      } else {
        return NextResponse.json({ error: "No input provided" }, { status: 400 });
      }

      const analysis = await analyzeProduct(input);
      return NextResponse.json(analysis);
    }

    const body = await request.json();

    let input: AnalyzeInput;
    if (body.image) {
      input = { type: "image", base64: body.image, mimeType: body.mimeType ?? "image/jpeg" };
    } else if (body.url) {
      input = { type: "url", url: body.url };
    } else if (body.query) {
      input = { type: "text", query: body.query };
    } else {
      return NextResponse.json({ error: "No input provided" }, { status: 400 });
    }

    const analysis = await analyzeProduct(input);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Analysis error:", error);
    const message =
      error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
