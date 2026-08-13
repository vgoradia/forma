export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_PRICE_ID?.trim() &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()
  );
}

export function getStripeSecretKey(): string {
  return process.env.STRIPE_SECRET_KEY!.trim();
}

export function getStripePriceId(): string {
  return process.env.STRIPE_PRICE_ID!.trim();
}

export function getStripePublishableKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!.trim();
}

export function getStripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || undefined;
}
