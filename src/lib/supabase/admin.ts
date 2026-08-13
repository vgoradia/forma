import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/supabase/config";

export function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) return null;

  return createClient(getSupabaseUrl(), serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function setUserPlan(userId: string, plan: "free" | "plus") {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { plan },
  });

  return !error;
}
