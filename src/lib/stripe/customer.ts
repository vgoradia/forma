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

/**
 * Subscription id for an invoice.
 * Current API versions nest it under `parent.subscription_details`.
 * Older webhook endpoints still send a top-level `subscription` id.
 */
export function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent;
  if (parent?.type === "subscription_details") {
    const subscription = parent.subscription_details?.subscription;
    if (typeof subscription === "string") return subscription;
    if (subscription && typeof subscription === "object") return subscription.id;
  }

  const legacy = (invoice as Stripe.Invoice & { subscription?: string | { id?: string } | null })
    .subscription;
  if (typeof legacy === "string" && legacy.trim()) return legacy;
  if (legacy && typeof legacy === "object" && typeof legacy.id === "string") return legacy.id;
  return null;
}
