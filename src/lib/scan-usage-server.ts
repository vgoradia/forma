import { createHash } from "crypto";
import type { User } from "@supabase/supabase-js";
import { readTrustedPlan } from "@/lib/plan";
import {
  FAIR_USE_LIMIT_MESSAGE,
  FREE_LIMIT_MESSAGE,
  FREE_SCANS_PER_MONTH,
  GUEST_LIMIT_MESSAGE,
  GUEST_SCANS_PER_MONTH,
  PLUS_FAIR_USE_PER_MONTH,
  SCANS_UNAVAILABLE_MESSAGE,
} from "@/lib/scan-quota";
import { getSupabaseAdmin, setUserPlan } from "@/lib/supabase/admin";
import { isStripeConfigured } from "@/lib/stripe/config";
import { findActivePlusSubscription, getStripe } from "@/lib/stripe/server";

function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function production(): boolean {
  return process.env.NODE_ENV === "production";
}

export function guestSubjectKey(ip: string): string {
  const hash = createHash("sha256").update(ip).digest("hex").slice(0, 32);
  return `guest:${hash}`;
}

export function userSubjectKey(userId: string): string {
  return `user:${userId}`;
}

/** Plus fair-use is a separate counter so upgrading does not inherit the free tally. */
export function plusSubjectKey(userId: string): string {
  return `plus:${userId}`;
}

export function subjectKeyForScan(user: User | null, ip: string, plan: "plus" | "free"): string {
  if (plan === "plus" && user) return plusSubjectKey(user.id);
  if (user) return userSubjectKey(user.id);
  return guestSubjectKey(ip);
}

export function scanLimitFor(user: User | null, plan: "plus" | "free"): number {
  if (plan === "plus" && user) return PLUS_FAIR_USE_PER_MONTH;
  if (!user) return GUEST_SCANS_PER_MONTH;
  return FREE_SCANS_PER_MONTH;
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

function openUsage(limit: number): UsageState {
  return {
    allowed: true,
    remaining: limit,
    used: 0,
    limit,
    enforced: false,
  };
}

export async function getServerScanUsage(subjectKey: string, limit: number): Promise<UsageState> {
  const admin = getSupabaseAdmin();
  if (!admin) return openUsage(limit);

  const { data, error } = await admin
    .from("scan_usage_monthly")
    .select("scan_count")
    .eq("subject_key", subjectKey)
    .eq("month_key", monthKey())
    .maybeSingle();

  if (error) {
    console.warn("scan_usage_monthly read failed:", error.message);
    return openUsage(limit);
  }

  const used = data?.scan_count ?? 0;
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    remaining,
    used,
    limit,
    enforced: true,
  };
}

type ConsumeRow = { allowed: boolean; used: number };

function readConsumeResult(data: unknown): ConsumeRow | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const record = row as { allowed?: unknown; used?: unknown };
  if (typeof record.allowed !== "boolean") return null;
  const used = typeof record.used === "number" ? record.used : Number(record.used);
  if (!Number.isFinite(used)) return null;
  return { allowed: record.allowed, used };
}

export type ScanReservation =
  | {
      ok: true;
      subjectKey: string;
      month: string;
      plan: "plus" | "free";
      limit: number;
      reserved: boolean;
    }
  | {
      ok: false;
      status: 402 | 503;
      code: "scan_limit_reached" | "guest_limit_reached" | "fair_use_limit_reached" | "scans_unavailable";
      message: string;
      used: number;
      limit: number;
    };

function unavailable(limit: number): ScanReservation {
  return {
    ok: false,
    status: 503,
    code: "scans_unavailable",
    message: SCANS_UNAVAILABLE_MESSAGE,
    used: 0,
    limit,
  };
}

function limitReached(
  user: User | null,
  plan: "plus" | "free",
  used: number,
  limit: number
): ScanReservation {
  if (plan === "plus" && user) {
    return {
      ok: false,
      status: 402,
      code: "fair_use_limit_reached",
      message: FAIR_USE_LIMIT_MESSAGE,
      used,
      limit,
    };
  }

  if (!user) {
    return {
      ok: false,
      status: 402,
      code: "guest_limit_reached",
      message: GUEST_LIMIT_MESSAGE,
      used,
      limit,
    };
  }

  return {
    ok: false,
    status: 402,
    code: "scan_limit_reached",
    message: FREE_LIMIT_MESSAGE,
    used,
    limit,
  };
}

/**
 * Reserve one scan before the model runs. Production refuses the scan when
 * Supabase or consume_scan is unavailable. Local dev allows it.
 */
export async function reserveScan(options: {
  user: User | null;
  ip: string;
}): Promise<ScanReservation> {
  const plan = await resolveUserPlan(options.user);
  const subjectKey = subjectKeyForScan(options.user, options.ip, plan);
  const limit = scanLimitFor(options.user, plan);
  const month = monthKey();
  const admin = getSupabaseAdmin();

  if (!admin) {
    if (production()) return unavailable(limit);
    return { ok: true, subjectKey, month, plan, limit, reserved: false };
  }

  try {
    const { data, error } = await admin.rpc("consume_scan", {
      p_subject: subjectKey,
      p_month: month,
      p_limit: limit,
    });

    if (error) {
      console.warn("consume_scan failed:", error.message);
      if (production()) return unavailable(limit);
      return { ok: true, subjectKey, month, plan, limit, reserved: false };
    }

    const result = readConsumeResult(data);
    if (!result) {
      console.warn("consume_scan returned an unexpected payload");
      if (production()) return unavailable(limit);
      return { ok: true, subjectKey, month, plan, limit, reserved: false };
    }

    if (!result.allowed) {
      return limitReached(options.user, plan, result.used, limit);
    }

    return { ok: true, subjectKey, month, plan, limit, reserved: true };
  } catch (error) {
    console.warn("consume_scan failed:", error instanceof Error ? error.message : error);
    if (production()) return unavailable(limit);
    return { ok: true, subjectKey, month, plan, limit, reserved: false };
  }
}

export async function releaseScan(subjectKey: string, month = monthKey()): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  try {
    const { error } = await admin.rpc("release_scan", {
      p_subject: subjectKey,
      p_month: month,
    });
    if (error) console.warn("release_scan failed:", error.message);
  } catch (error) {
    console.warn("release_scan failed:", error instanceof Error ? error.message : error);
  }
}
