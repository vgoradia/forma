import type Stripe from "stripe";

export function stripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
): string | null {
  if (typeof customer === "string") {
    const id = customer.trim();
    return id || null;
  }
  if (!customer || ("deleted" in customer && customer.deleted)) return null;
  return customer.id;
}

/** Subscription id on a modern Invoice (`parent.subscription_details`). */
export function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent;
  if (parent?.type !== "subscription_details") return null;
  const subscription = parent.subscription_details?.subscription;
  if (!subscription) return null;
  return typeof subscription === "string" ? subscription : subscription.id;
}
