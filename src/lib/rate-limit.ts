import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const WINDOW_SECONDS = 60;

/** Burst cap for /api/analyze, applied per IP and per signed-in user id. */
export const ANALYZE_REQUESTS_PER_MINUTE = 6;
export const MAX_IMAGE_LOOKUP_REQUESTS = 30;
export const RATE_LIMIT_WINDOW_SECONDS = WINDOW_SECONDS;

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfter: number }
  | { ok: false; unavailable: true };

function production(): boolean {
  return process.env.NODE_ENV === "production";
}

function firstForwardedIp(value: string | null): string | null {
  if (!value) return null;
  const ip = value.split(",")[0]?.trim();
  return ip ? ip : null;
}

export function getClientIp(request: Request): string {
  return (
    firstForwardedIp(request.headers.get("x-vercel-forwarded-for")) ??
    firstForwardedIp(request.headers.get("x-forwarded-for")) ??
    firstForwardedIp(request.headers.get("x-real-ip")) ??
    "unknown"
  );
}

/**
 * Shared limiter backed by rate_limit_hit. The boolean from Postgres is true
 * when this hit is still inside the window cap.
 * Production fails closed when the admin client or the RPC is unavailable.
 * Local dev stays permissive so missing Supabase does not block the app.
 */
export async function checkRateLimit(
  key: string,
  maxRequests = ANALYZE_REQUESTS_PER_MINUTE,
  windowSeconds = WINDOW_SECONDS
): Promise<RateLimitResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return production() ? { ok: false, unavailable: true } : { ok: true };
  }

  try {
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max: maxRequests,
    });

    if (error || typeof data !== "boolean") {
      if (error) console.warn("rate_limit_hit failed:", error.message);
      return production() ? { ok: false, unavailable: true } : { ok: true };
    }

    if (data) return { ok: true };
    return { ok: false, retryAfter: windowSeconds };
  } catch (error) {
    console.warn("rate_limit_hit failed:", error instanceof Error ? error.message : error);
    return production() ? { ok: false, unavailable: true } : { ok: true };
  }
}

export function denyRateLimit(
  decision: Exclude<RateLimitResult, { ok: true }>,
  limited: (retryAfter: number) => string,
  unavailable: string
) {
  if ("unavailable" in decision) {
    return NextResponse.json({ error: unavailable }, { status: 503 });
  }

  return NextResponse.json(
    { error: limited(decision.retryAfter) },
    { status: 429, headers: { "Retry-After": String(decision.retryAfter) } }
  );
}
