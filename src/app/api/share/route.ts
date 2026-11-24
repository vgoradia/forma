import { NextRequest, NextResponse } from "next/server";
import { getAppUrl } from "@/lib/app-url";
import { checkRateLimit, denyRateLimit, getClientIp } from "@/lib/rate-limit";
import { buildShareUrl } from "@/lib/share-url";
import { insertSharedVerdict } from "@/lib/shared-verdict-store";
import { isBlockedHostname } from "@/lib/security";
import { sharedVerdictPath, toSharedVerdict } from "@/lib/shared-verdict";

const MAX_BODY_CHARS = 100_000;
const MAX_SHARES_PER_MINUTE = 20;

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(`share:${getClientIp(request)}`, MAX_SHARES_PER_MINUTE);
  if (!limit.ok) {
    return denyRateLimit(
      limit,
      (seconds) => `Too many shares. Try again in ${seconds}s.`,
      "Try again in a minute."
    );
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_CHARS) {
      return NextResponse.json({ error: "Verdict is too large to share" }, { status: 413 });
    }
    body = JSON.parse(text) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const analysis =
    typeof body === "object" && body !== null && "analysis" in body
      ? (body as { analysis: unknown }).analysis
      : null;
  const verdict = toSharedVerdict(analysis, isBlockedHostname);
  if (!verdict) {
    return NextResponse.json({ error: "That verdict can't be shared" }, { status: 400 });
  }

  const id = await insertSharedVerdict(verdict);
  if (!id) {
    return NextResponse.json({ error: "Sharing is unavailable" }, { status: 503 });
  }

  const path = sharedVerdictPath(id);
  return NextResponse.json({ id, path, url: buildShareUrl(path, getAppUrl()) });
}
