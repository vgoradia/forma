import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isStripeConfigured } from "@/lib/stripe/config";
import { findActivePlusSubscription, getStripe } from "@/lib/stripe/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ plan: "free", configured: false });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ plan: "free", configured: isStripeConfigured() });
  }

  const metadataPlan = user.user_metadata?.plan;
  if (metadataPlan === "plus") {
    return NextResponse.json({ plan: "plus", configured: isStripeConfigured() });
  }

  if (!isStripeConfigured() || !user.email) {
    return NextResponse.json({ plan: "free", configured: isStripeConfigured() });
  }

  try {
    const stripe = getStripe();
    const subscription = await findActivePlusSubscription(stripe, user.email);
    const plan = subscription ? "plus" : "free";
    return NextResponse.json({ plan, configured: true });
  } catch {
    return NextResponse.json({ plan: "free", configured: isStripeConfigured() });
  }
}
