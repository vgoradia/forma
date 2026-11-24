import { createHash } from "crypto";
import type { User } from "@supabase/supabase-js";
import { readTrustedPlan } from "@/lib/plan";
import { FREE_SCANS_PER_MONTH } from "@/lib/scan-quota";
import { getSupabaseAdmin, setUserPlan } from "@/lib/supabase/admin";
import { isStripeConfigured } from "@/lib/stripe/config";
import { findActivePlusSubscription, getStripe } from "@/lib/stripe/server";

function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export function guestSubjectKey(ip: string): string {
  const hash = createHash("sha256").update(ip).digest("hex").slice(0, 32);
  return `guest:${hash}`;
}

export function userSubjectKey(userId: string): string {
  return `user:${userId}`;
}

export async function resolveUserPlan(user: User | null): Promise<"plus" | "free"> {
  if (!user) return "free";

  // app_metadata is written only by the service role (Stripe webhook / this server).
  // Never read user_metadata.plan — the client can set that with auth.updateUser.
  if (readTrustedPlan(user) === "plus") {
    return "plus";
  }

  if (!isStripeConfigured() || !user.email) {
    return "free";
  }

  try {
    const stripe = getStripe();
    const subscription = await findActivePlusSubscription(stripe, user.email);
    if (!subscription) return "free";

    // Remember a confirmed subscription so the next scan does not need Stripe.
    void setUserPlan(user.id, "plus");
    return "plus";
  } catch {
    return "free";
  }
}

type UsageState = {
  allowed: boolean;
  remaining: number;
  used: number;
  limit: number;
  enforced: boolean;
};

async function readUsage(subjectKey: string): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin) return 0;

  const { data, error } = await admin
    .from("scan_usage_monthly")
    .select("scan_count")
    .eq("subject_key", subjectKey)
    .eq("month_key", monthKey())
    .maybeSingle();

  if (error) {
    console.warn("scan_usage_monthly read failed:", error.message);
    return 0;
  }

  return data?.scan_count ?? 0;
}

export async function getServerScanUsage(
  subjectKey: string,
  plan: "plus" | "free"
): Promise<UsageState> {
  if (plan === "plus") {
    return {
      allowed: true,
      remaining: FREE_SCANS_PER_MONTH,
      used: 0,
      limit: FREE_SCANS_PER_MONTH,
      enforced: Boolean(getSupabaseAdmin()),
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      allowed: true,
      remaining: FREE_SCANS_PER_MONTH,
      used: 0,
      limit: FREE_SCANS_PER_MONTH,
      enforced: false,
    };
  }

  const used = await readUsage(subjectKey);
  const remaining = Math.max(0, FREE_SCANS_PER_MONTH - used);

  return {
    allowed: used < FREE_SCANS_PER_MONTH,
    remaining,
    used,
    limit: FREE_SCANS_PER_MONTH,
    enforced: true,
  };
}

export async function assertCanAnalyze(options: {
  user: User | null;
  ip: string;
}): Promise<
  | { ok: true; subjectKey: string; plan: "plus" | "free" }
  | { ok: false; status: 402; message: string; used: number; limit: number }
> {
  const plan = await resolveUserPlan(options.user);
  const subjectKey = options.user
    ? userSubjectKey(options.user.id)
    : guestSubjectKey(options.ip);

  const usage = await getServerScanUsage(subjectKey, plan);
  if (!usage.allowed) {
    return {
      ok: false,
      status: 402,
      message:
        "You've used all free scans this month. Upgrade to Forma Plus on Profile for unlimited verdicts.",
      used: usage.used,
      limit: usage.limit,
    };
  }

  return { ok: true, subjectKey, plan };
}

export async function recordServerScanUsage(subjectKey: string, plan: "plus" | "free"): Promise<void> {
  if (plan === "plus") return;

  const admin = getSupabaseAdmin();
  if (!admin) return;

  const month = monthKey();

  const { data: existing, error: readError } = await admin
    .from("scan_usage_monthly")
    .select("scan_count")
    .eq("subject_key", subjectKey)
    .eq("month_key", month)
    .maybeSingle();

  if (readError) {
    console.warn("scan_usage_monthly read failed:", readError.message);
    return;
  }

  const nextCount = (existing?.scan_count ?? 0) + 1;

  const { error: writeError } = await admin.from("scan_usage_monthly").upsert(
    {
      subject_key: subjectKey,
      month_key: month,
      scan_count: nextCount,
    },
    { onConflict: "subject_key,month_key" }
  );

  if (writeError) {
    console.warn("scan_usage_monthly write failed:", writeError.message);
  }
}