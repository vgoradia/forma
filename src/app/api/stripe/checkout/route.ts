import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getStripePriceId, isStripeConfigured } from "@/lib/stripe/config";
import { getStripe } from "@/lib/stripe/server";

export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Billing is not configured yet." }, { status: 503 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Sign-in is required before upgrading." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Sign in with Google to upgrade." }, { status: 401 });
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();

  const customers = await stripe.customers.list({ email: user.email, limit: 1 });
  const customerId = customers.data[0]?.id;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    customer_email: customerId ? undefined : user.email,
    client_reference_id: user.id,
    line_items: [{ price: getStripePriceId(), quantity: 1 }],
    success_url: `${appUrl}/plus/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/profile?billing=canceled`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
      },
    },
    metadata: {
      supabase_user_id: user.id,
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
