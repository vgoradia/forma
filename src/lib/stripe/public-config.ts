export function getFormaPlusPriceLabel(): string {
  return process.env.NEXT_PUBLIC_FORMA_PLUS_PRICE?.trim() || "$9.99/mo";
}

export function isStripePublishableConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());
}
