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
 * GoTrue merges both metadata objects; a null user_metadata.plan deletes the
 * legacy key that used to be client-writable.
 */
export async function setUserPlan(userId: string, plan: UserPlan) {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { plan },
    user_metadata: { plan: null },
  });

  if (error) {
    console.error("setUserPlan failed:", error.message);
    return false;
  }

  return true;
}
