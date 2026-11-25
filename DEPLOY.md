# Forma — Ship checklist

Use this when you're ready to go live.

## 1. GitHub

```bash
cd forma
git init
git add .
git commit -m "Forma v1 — AI shopping copilot"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/forma.git
git push -u origin main
```

## 2. Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → Import your repo
2. **Root directory:** `forma` (if repo is the whole Kleos AI folder, set this)
3. **Environment variables:**

| Variable | Required |
|----------|----------|
| `ANTHROPIC_API_KEY` | Yes (or `OPENAI_API_KEY`) |
| `SERPER_API_KEY` | Yes (live prices + images) |
| `NEXT_PUBLIC_APP_URL` | Yes after deploy (e.g. `https://forma.com`) |

4. Deploy → copy your `.vercel.app` URL

## 3. Supabase

In the Supabase SQL editor, run supabase/scan-usage.sql.
The script is safe to re-run, including on a database where `scan_usage_monthly` and `user_scans` do not exist yet.
It creates those tables, row level security, and the service-role functions that enforce guest, free, and Plus fair-use caps, plus the shared rate limiter.

Set `SUPABASE_SERVICE_ROLE_KEY` on Vercel (the same key Plus and share links already use). In production, `/api/analyze` returns 503 when that key or those functions are missing.

Also run `supabase/shared-verdicts.sql` if public share links are not set up yet.

## 4. Cloudflare domain

In Cloudflare → DNS:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `@` | `cname.vercel-dns.com` | DNS only (grey) |
| CNAME | `www` | `cname.vercel-dns.com` | DNS only (grey) |

In Vercel → Settings → Domains → add your domain.

Set SSL/TLS to **Full** if using orange-cloud proxy.

## 5. Post-deploy smoke test

- [ ] `/` landing loads
- [ ] `/onboarding` → `/home`
- [ ] Upload scan → analysis completes
- [ ] Prices not `$NaN`, images load
- [ ] Share link preview looks good (OG image)
- [ ] Product links open in new tab

## 6. After launch (growth — college app story)

- Product Hunt / Reddit r/femalefashionadvice / TikTok demo
- Track scans via Vercel Analytics
- Affiliate: sign up for retailer programs, replace UTM with real affiliate IDs
- Forma Plus: Stripe when you want revenue metrics
