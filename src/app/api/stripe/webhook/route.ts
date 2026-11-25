import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { planForSubscriptionStatus } from "@/lib/plan";
import { stripeCustomerId, subscriptionIdFromInvoice } from "@/lib/stripe/customer";
import { getStripeWebhookSecret, isStripeConfigured } from "@/lib/stripe/config";
import { getStripe } from "@/lib/stripe/server";
import { findUserIdByEmail, setUserPlan } from "@/lib/supabase/admin";
import { captureServerEvent } from "@/lib/analytics-server";

export const runtime = "nodejs";

async function resolveSupabaseUserId(
  stripe: Stripe,
  subscription: Stripe.Subscription
): Promise<string | null> {
  const fromMetadata =
    subscription.metadata?.supabase_user_id ||
    subscription.items.data[0]?.metadata?.supabase_user_id;
  if (fromMetadata) return fromMetadata;

  const customerId = stripeCustomerId(subscription.customer);
  if (!customerId) return null;

  const customer = await stripe.customers.retrieve(customerId);
  if ("deleted" in customer && customer.deleted) return null;
  if (!customer.email) return null;

  return findUserIdByEmail(customer.email);
}

/**
 * Writes are merges of the same plan and customer id, so Stripe retries are safe.
 * Returns false only when the Supabase write itself fails.
 */
async function syncPlanFromSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription
): Promise<boolean> {
  const userId = await resolveSupabaseUserId(stripe, subscription);
  if (!userId) return true;

  const plan = planForSubscriptionStatus(subscription.status);
  const customerId = stripeCustomerId(subscription.customer);
  if (customerId) {
    return setUserPlan(userId, plan, { stripeCustomerId: customerId });
  }
  return setUserPlan(userId, plan);
}

async function handleStripeEvent(stripe: Stripe, event: Stripe.Event): Promise<boolean> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.supabase_user_id;
      if (!userId || session.mode !== "subscription") return true;

      const customerId = stripeCustomerId(session.customer);
      const saved = customerId
        ? await setUserPlan(userId, "plus", { stripeCustomerId: customerId })
        : await setUserPlan(userId, "plus");
      if (saved) {
        await captureServerEvent("plus_subscribed", userId, {
          source: "stripe_webhook",
          ...(event.id ? { $insert_id: `plus_subscribed:${event.id}` } : {}),
        });
      }
      return saved;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      return syncPlanFromSubscription(stripe, subscription);
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = subscriptionIdFromInvoice(invoice);
      if (!subscriptionId) return true;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return syncPlanFromSubscription(stripe, subscription);
    }
    default:
      return true;
  }
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

  try {
    const saved = await handleStripeEvent(stripe, event);
    if (!saved) {
      console.error("Stripe webhook could not persist the subscription");
      return NextResponse.json({ error: "Could not save the subscription" }, { status: 500 });
    }
  } catch (error) {
    console.error("Stripe webhook handler failed:", error);
    return NextResponse.json({ error: "Could not save the subscription" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
