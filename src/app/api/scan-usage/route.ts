import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/rate-limit";
import {
  getServerScanUsage,
  resolveUserPlan,
  scanLimitFor,
  subjectKeyForScan,
} from "@/lib/scan-usage-server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  let user = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  const plan = await resolveUserPlan(user);
  const subjectKey = subjectKeyForScan(user, ip, plan);
  const usage = await getServerScanUsage(subjectKey, scanLimitFor(user, plan));

  return NextResponse.json({
    plan,
    ...usage,
  });
}