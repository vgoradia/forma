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

## 3. Cloudflare domain

In Cloudflare → DNS:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `@` | `cname.vercel-dns.com` | DNS only (grey) |
| CNAME | `www` | `cname.vercel-dns.com` | DNS only (grey) |

In Vercel → Settings → Domains → add your domain.

Set SSL/TLS to **Full** if using orange-cloud proxy.

## 4. Post-deploy smoke test

- [ ] `/` landing loads
- [ ] `/onboarding` → `/home`
- [ ] Upload scan → analysis completes
- [ ] Prices not `$NaN`, images load
- [ ] Share link preview looks good (OG image)
- [ ] Product links open in new tab

## 5. After launch (growth — college app story)

- Product Hunt / Reddit r/femalefashionadvice / TikTok demo
- Track scans via Vercel Analytics
- Affiliate: sign up for retailer programs, replace UTM with real affiliate IDs
- Forma Plus: Stripe when you want revenue metrics
