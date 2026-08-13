import Stripe from "stripe";
import { getStripeSecretKey, isStripeConfigured } from "./config";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecretKey());
  }

  return stripeClient;
}

export async function findActivePlusSubscription(
  stripe: Stripe,
  email: string
): Promise<Stripe.Subscription | null> {
  const customers = await stripe.customers.list({ email, limit: 5 });

  for (const customer of customers.data) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 5,
    });

    const active = subscriptions.data[0];
    if (active) return active;
  }

  return null;
}
