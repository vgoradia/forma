import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeWebhookSecret, isStripeConfigured } from "@/lib/stripe/config";
import { getStripe } from "@/lib/stripe/server";
import { setUserPlan } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function syncPlanFromSubscription(subscription: Stripe.Subscription) {
  const userId =
    subscription.metadata.supabase_user_id ??
    subscription.items.data[0]?.metadata?.supabase_user_id;

  if (!userId) return;

  const active = subscription.status === "active" || subscription.status === "trialing";
  await setUserPlan(userId, active ? "plus" : "free");
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret missing" }, { status: 503 });
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.supabase_user_id;
      if (userId && session.mode === "subscription") {
        await setUserPlan(userId, "plus");
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await syncPlanFromSubscription(subscription);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
