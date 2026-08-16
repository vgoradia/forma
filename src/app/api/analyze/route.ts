import { NextRequest, NextResponse } from "next/server";
import { analyzeProduct } from "@/lib/ai";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  sanitizeApiError,
  validateImageUpload,
  validateProductUrl,
  validateTextQuery,
} from "@/lib/security";
import type { AnalyzeInput } from "@/lib/types";

export const maxDuration = 60;

function decodeBase64Image(base64: string): ArrayBuffer | null {
  try {
    const normalized = base64.includes(",") ? base64.split(",").pop()! : base64;
    const buffer = Buffer.from(normalized, "base64");
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  } catch {
    return null;
  }
}

async function parseAnalyzeInput(request: NextRequest): Promise<
  { ok: true; input: AnalyzeInput } | { ok: false; error: string; status: number }
> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const url = formData.get("url") as string | null;
    const query = formData.get("query") as string | null;

    if (file && file.size > 0) {
      const buffer = await file.arrayBuffer();
      const mimeType = file.type || "image/jpeg";
      const imageError = validateImageUpload(buffer, mimeType);
      if (imageError) {
        return { ok: false, error: imageError, status: 400 };
      }

      const base64 = Buffer.from(buffer).toString("base64");
      return { ok: true, input: { type: "image", base64, mimeType } };
    }

    if (url) {
      const urlError = validateProductUrl(url);
      if (urlError) return { ok: false, error: urlError, status: 400 };
      return { ok: true, input: { type: "url", url: url.trim() } };
    }

    if (query) {
      const queryError = validateTextQuery(String(query));
      if (queryError) return { ok: false, error: queryError, status: 400 };
      return { ok: true, input: { type: "text", query: query.trim() } };
    }

    return { ok: false, error: "No input provided", status: 400 };
  }

  const body = (await request.json()) as {
    image?: string;
    mimeType?: string;
    url?: string;
    query?: string;
  };

  if (body.image) {
    const bytes = decodeBase64Image(body.image);
    if (!bytes) {
      return { ok: false, error: "Invalid image data", status: 400 };
    }
    const mimeType = body.mimeType ?? "image/jpeg";
    const imageError = validateImageUpload(bytes, mimeType);
    if (imageError) {
      return { ok: false, error: imageError, status: 400 };
    }
    const base64 = Buffer.from(bytes).toString("base64");
    return { ok: true, input: { type: "image", base64, mimeType } };
  }

  if (body.url) {
    const urlError = validateProductUrl(body.url);
    if (urlError) return { ok: false, error: urlError, status: 400 };
    return { ok: true, input: { type: "url", url: body.url.trim() } };
  }

  if (body.query) {
    const queryError = validateTextQuery(body.query);
    if (queryError) return { ok: false, error: queryError, status: 400 };
    return { ok: true, input: { type: "text", query: body.query.trim() } };
  }

  return { ok: false, error: "No input provided", status: 400 };
}

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
    const parsed = await parseAnalyzeInput(request);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const analysis = await analyzeProduct(parsed.input);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: sanitizeApiError(error, "Analysis failed. Please try again.") },
      { status: 500 }
    );
  }
}
