import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isStripeConfigured } from "@/lib/stripe/config";
import { createBillingPortalSession, getStripe } from "@/lib/stripe/server";

const NO_BILLING_ACCOUNT =
  "No billing account found for this sign-in. Subscribe to Forma Plus first.";

function storedStripeCustomerId(user: User): string | null {
  const value = user.app_metadata?.stripe_customer_id;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Billing is not configured yet." }, { status: 503 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Sign-in is required." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to manage your subscription." }, { status: 401 });
  }

  const stripe = getStripe();
  let customerId = storedStripeCustomerId(user);

  if (!customerId && user.email) {
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    customerId = customers.data[0]?.id ?? null;
  }

  if (!customerId) {
    return NextResponse.json({ error: NO_BILLING_ACCOUNT }, { status: 404 });
  }

  const session = await createBillingPortalSession(stripe, customerId);
  if (!session.url) {
    return NextResponse.json({ error: "Could not open the billing portal." }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
