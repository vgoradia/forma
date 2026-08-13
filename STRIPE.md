# Forma — Stripe billing (Forma Plus)

Forma Plus uses **Stripe Checkout** for subscriptions. Without Stripe env vars, the upgrade button shows a setup message.

## 1. Create a Stripe account

1. Go to [dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Complete business profile (solo founder / individual is fine)

## 2. Create Forma Plus product

1. Stripe Dashboard → **Product catalog → Add product**
2. Name: **Forma Plus**
3. Description: Unlimited scans, wardrobe sync, priority alerts (as you ship them)
4. Pricing: **Recurring** → e.g. **$9.99 / month**
5. Save and copy the **Price ID** (starts with `price_`) → `STRIPE_PRICE_ID`

## 3. API keys

Stripe → **Developers → API keys**

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable key (`pk_live_...` or `pk_test_...`) |
| `STRIPE_SECRET_KEY` | Secret key (`sk_live_...` or `sk_test_...`) |

Use **test keys** until checkout works end-to-end, then switch to live.

## 4. Webhook (production)

Stripe → **Developers → Webhooks → Add endpoint**

| Field | Value |
|-------|--------|
| URL | `https://www.shopwithforma.com/api/stripe/webhook` |
| Events | `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` |

Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### Local webhook testing (optional)

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the signing secret Stripe CLI prints for local `STRIPE_WEBHOOK_SECRET`.

## 5. Supabase service role (recommended)

Webhook updates the user's plan in Supabase metadata.

Supabase → **Settings → API** → copy **service_role** key (keep secret):

```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Without this, plan status still works via live Stripe lookup on profile load, but metadata won't sync instantly.

## 6. Environment variables

Add to `.env.local` and **Vercel → Environment Variables**:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_FORMA_PLUS_PRICE=$9.99/mo
SUPABASE_SERVICE_ROLE_KEY=...   # optional but recommended
```

Redeploy after adding to Vercel.

## 7. Test checkout

1. Sign in at `/login`
2. Go to **Profile → Upgrade to Forma Plus**
3. Use Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC
4. Success → `/plus/success` → profile shows **Forma Plus**

## Notes

- Guests must sign in before upgrading
- Plus features (unlimited scans, etc.) can be gated later — billing infra is ready first
- Switch from test to live keys before real growth push
