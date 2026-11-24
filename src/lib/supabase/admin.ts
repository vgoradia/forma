import { createClient } from "@supabase/supabase-js";
import type { UserPlan } from "@/lib/plan";
import { getSupabaseUrl } from "@/lib/supabase/config";

export function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) return null;

  return createClient(getSupabaseUrl(), serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Persist the plan where the signed-in user cannot change it.
 * GoTrue merges app_metadata, so a later plan-only update does not clear
 * stripe_customer_id. Pass stripeCustomerId to store it in the same write.
 * A null user_metadata.plan deletes the legacy key that used to be client-writable.
 */
export async function setUserPlan(
  userId: string,
  plan: UserPlan,
  options?: { stripeCustomerId?: string }
) {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const stripeCustomerId = options?.stripeCustomerId?.trim();
  const app_metadata: { plan: UserPlan; stripe_customer_id?: string } = { plan };
  if (stripeCustomerId) {
    app_metadata.stripe_customer_id = stripeCustomerId;
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata,
    user_metadata: { plan: null },
  });

  if (error) {
    console.error("setUserPlan failed:", error.message);
    return false;
  }

  return true;
}

const USERS_PER_PAGE = 1000;
const MAX_USER_PAGES = 20;

/**
 * Find an auth user by email. Emails are unique in GoTrue; the admin API
 * only lists users, so this walks pages until the address matches.
 * Throws when the admin API is unavailable so callers can retry.
 */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const target = email.trim().toLowerCase();
  if (!target) return null;

  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase admin is not configured");
  }

  for (let page = 1; page <= MAX_USER_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: USERS_PER_PAGE,
    });
    if (error) {
      console.error("findUserIdByEmail failed:", error.message);
      throw new Error(error.message);
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === target);
    if (match) return match.id;
    if (data.users.length === 0 || data.nextPage == null) return null;
  }

  throw new Error("Supabase user lookup did not finish");
}
