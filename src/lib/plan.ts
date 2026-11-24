import type { User } from "@supabase/supabase-js";

export type UserPlan = "free" | "plus";

/**
 * Forma Plus is stored on `app_metadata`, which only the service role can write.
 * `user_metadata` is editable by the signed-in user and must never grant Plus.
 */
export function readTrustedPlan(
  user: Pick<User, "app_metadata"> | null | undefined
): UserPlan {
  if (!user) return "free";
  return user.app_metadata?.plan === "plus" ? "plus" : "free";
}

/**
 * Stripe statuses that keep Forma Plus.
 * `past_due`, `unpaid`, and `canceled` revoke it (cancel and failed payment).
 */
export function planForSubscriptionStatus(status: string): UserPlan {
  return status === "active" || status === "trialing" ? "plus" : "free";
}
