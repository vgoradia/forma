import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  isDuplicateSignup,
  isMissingEmailSignupsTable,
  normalizeSignupEmail,
  normalizeSignupSource,
  normalizeUserAgent,
} from "@/lib/email-signup";
import { checkRateLimit, denyRateLimit, getClientIp } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const MAX_BODY_CHARS = 4_000;
const SIGNUPS_PER_IP_PER_MINUTE = 8;
const SIGNUPS_PER_EMAIL_PER_HOUR = 5;
const UNAVAILABLE = "Email signup isn't available yet. Please try again later.";
const SAVE_FAILED = "We couldn't save that email. Please try again.";

function emailRateKey(email: string): string {
  const hash = createHash("sha256").update(email).digest("hex").slice(0, 32);
  return `email-signup:email:${hash}`;
}

export async function POST(request: Request) {
  try {
    const ipLimit = await checkRateLimit(
      `email-signup:ip:${getClientIp(request)}`,
      SIGNUPS_PER_IP_PER_MINUTE,
      60
    );
    if (!ipLimit.ok) {
      return denyRateLimit(ipLimit, (seconds) => `Too many signups. Try again in ${seconds}s.`, UNAVAILABLE);
    }

    let body: unknown;
    try {
      const text = await request.text();
      if (text.length > MAX_BODY_CHARS) {
        return NextResponse.json({ error: "That signup is too large." }, { status: 413 });
      }
      body = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const record = typeof body === "object" && body !== null ? (body as { email?: unknown; source?: unknown }) : {};
    const email = normalizeSignupEmail(record.email);
    if (!email) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const emailLimit = await checkRateLimit(emailRateKey(email), SIGNUPS_PER_EMAIL_PER_HOUR, 60 * 60);
    if (!emailLimit.ok) {
      return denyRateLimit(emailLimit, (seconds) => `Too many signups. Try again in ${seconds}s.`, UNAVAILABLE);
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
    }

    const { error } = await admin.from("email_signups").insert({
      email,
      source: normalizeSignupSource(record.source),
      user_agent: normalizeUserAgent(request.headers.get("user-agent")),
    });

    if (!error) {
      return NextResponse.json({ ok: true });
    }

    if (isDuplicateSignup(error)) {
      return NextResponse.json({
        ok: true,
        alreadySubscribed: true,
        message: "You're already subscribed.",
      });
    }

    if (isMissingEmailSignupsTable(error)) {
      console.warn("email_signups table is missing");
      return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
    }

    console.warn("email signup insert failed:", error.code ?? "unknown");
    return NextResponse.json({ error: SAVE_FAILED }, { status: 503 });
  } catch {
    console.warn("email signup route failed");
    return NextResponse.json({ error: SAVE_FAILED }, { status: 503 });
  }
}
