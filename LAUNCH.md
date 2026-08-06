# Forma — Launch day checklist

## Before you share publicly

- [ ] Deploy on Vercel (see below)
- [ ] Set all env vars in Vercel dashboard
- [ ] Run one real scan on production URL
- [ ] Sign up for [Amazon Associates](https://affiliate-program.amazon.com/) → add tag to Vercel as `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG`

## 1. Push to GitHub

```bash
cd forma
git add .
git commit -m "Forma v1 — launch ready with analytics and affiliate support"
git push origin main
```

## 2. Vercel deploy

1. [vercel.com/new](https://vercel.com/new) → import repo
2. Environment variables:

| Variable | Required |
|----------|----------|
| `ANTHROPIC_API_KEY` | Yes |
| `SERPER_API_KEY` | Yes |
| `NEXT_PUBLIC_APP_URL` | Yes (your live URL) |
| `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG` | Optional (revenue) |

3. Deploy → Analytics auto-enables on Vercel

## 3. Cloudflare domain

| Type | Name | Content |
|------|------|---------|
| CNAME | `@` | `cname.vercel-dns.com` |
| CNAME | `www` | `cname.vercel-dns.com` |

Grey cloud (DNS only) until Vercel verifies SSL.

## 4. Growth — copy/paste posts

### Friends / group chat
> I built Forma — paste any product screenshot or link and AI tells you if you should buy it, finds the lowest price + dupes. Free: YOUR_URL

### Reddit (r/femalefashionadvice, r/Frugal)
> Title: I built a free tool that finds dupes + lowest price from any screenshot
> Body: Hey — got tired of TikTok shopping rabbit holes so I built Forma. Upload a screenshot or paste a link, get lowest price, alternatives, review summary, and buy/wait/skip verdict. Free, no signup. Would love feedback: YOUR_URL

### TikTok / Instagram story
15-sec screen record: upload screenshot → show verdict card → "link in bio"

### Product Hunt
Schedule Tuesday 12:01 AM PT. Tagline: "AI copilot that tells you whether to buy — not just what to buy"

## 5. Metrics for college apps

Track in Vercel Analytics:
- Total visits week 1
- Goal: 500+ visits, 100+ scans in first 2 weeks

Revenue story: Amazon affiliate tag on outbound links (even $20/month shows monetization thinking)
