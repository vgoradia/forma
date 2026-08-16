# Forma — Launch checklist

**Live URL:** https://shopwithforma.com

---

## Today (product polish + deploy) ✅

Ship these so the product looks professional when you share it.

- [x] Fix favicon / tab icon (Forma logo, not Vercel)
- [x] Analytics events: `scan_completed`, `share_analysis`
- [x] Share links with UTM tracking (`utm_source=share`)
- [x] `/about` page (college app + credibility)
- [x] OG image with real Forma logo
- [x] Landing footer + JSON-LD SEO
- [x] Demo page CTA → drives users to scan
- [x] **Push to GitHub + redeploy on Vercel**
- [x] Confirm `NEXT_PUBLIC_APP_URL=https://www.shopwithforma.com` in Vercel env

---

## Growth day — Saturday Aug 15 🚀

**Pre-flight:** Live site OK (`/analysis/demo` shows Shopbop, auth + Stripe wired). Start here.

### Morning — distribution (~2 hours)

- [ ] **Reddit** — r/femalefashionadvice or r/Frugal (copy below)
- [ ] **X post** — short hook + link (copy below)
- [ ] **LinkedIn** — personal profile post, not a company page (copy below)
- [ ] **TikTok/Reels** — 15-sec screen record (script in `COLLEGE.md`)

**No friends blast** — distribution is public channels only.

**Primary share link:** https://www.shopwithforma.com/scan?utm_source=share&utm_medium=referral&utm_campaign=launch

### Afternoon — monetization + metrics (~1 hour)

- [ ] **Amazon Associates** — sign up at https://affiliate-program.amazon.com
- [ ] Add `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG=yourname-20` in Vercel → Settings → Environment Variables → **Redeploy**
- [ ] **Vercel Analytics** — screenshot visits + `scan_completed` + `share_analysis` events
- [ ] **Fill metrics** in `COLLEGE.md` (Week 1 baseline)

### Optional — big spike (later this week)

- [ ] **Product Hunt** — schedule Tuesday 12:01 AM PT
- [ ] **Hacker News Show HN** — if you want a tech audience

---

## Copy/paste posts (ready to use)

### X (Twitter)
> Built an AI shopping copilot that answers the question TikTok never does: should you actually buy it?
>
> Upload a screenshot → lowest price, dupes, review summary, buy/wait/skip verdict in ~15 sec.
>
> Free: https://www.shopwithforma.com/scan
>
> Would love feedback 🙏

### LinkedIn (personal profile — add screenshot of /analysis/demo)
> I built Forma — an AI shopping copilot for smarter online purchases.
>
> The problem: you see something on TikTok or Pinterest, then spend 45 minutes reverse-image-searching, comparing prices across tabs, and reading reviews — and still aren't sure if you should buy.
>
> Forma collapses that into one upload. Paste a screenshot, link, or product name and get:
> • Live price comparison across retailers
> • Budget dupes + premium alternatives
> • AI review summary (pros, cons, quality score)
> • A clear buy / wait / skip verdict
>
> I built the full stack solo — Next.js, Claude, Serper, deployed at shopwithforma.com with Google auth and Stripe subscriptions.
>
> Try it free (no signup required): https://www.shopwithforma.com/analysis/demo
>
> Would love your feedback — what would make this useful before your next purchase?

### Reddit (r/femalefashionadvice, r/Frugal)
> **Title:** I built a free tool that finds dupes + lowest price from any screenshot
>
> **Body:** Hey — got tired of TikTok shopping rabbit holes so I built Forma. Upload a screenshot or paste a link, get lowest price, alternatives, review summary, and buy/wait/skip verdict. Free, no signup. Would love feedback: https://shopwithforma.com

### TikTok / Instagram story
15-sec screen record: upload screenshot → show verdict card → "link in bio → shopwithforma.com"

### Product Hunt
**Tagline:** AI copilot that tells you whether to buy — not just what to buy  
**Link:** https://shopwithforma.com

---

## Metrics for college apps

Track in Vercel Analytics (Events tab):

| Event | What it means |
|-------|---------------|
| Page views | Total traffic |
| `scan_completed` | Real product usage |
| `share_analysis` | Viral loop working |

**Week 1 goals:** 500+ visits, 100+ scans, 25+ shares

See `COLLEGE.md` for essay paragraphs and demo video script.

---

### Amazon Associates (step-by-step)

1. Go to https://affiliate-program.amazon.com and sign up (use the same email as your site if possible).
2. Complete the profile — website URL: `https://www.shopwithforma.com`, describe Forma as a shopping comparison tool.
3. Once approved, copy your **Store ID** (format: `yourname-20`).
4. Vercel → your Forma project → **Settings** → **Environment Variables**:
   - Name: `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG`
   - Value: `yourname-20`
   - Apply to Production → Save → **Redeploy** (Deployments → ⋯ → Redeploy).
5. Test: run a scan, click an Amazon link, confirm URL contains `tag=yourname-20`.

Code already applies the tag automatically via `src/lib/affiliate.ts` — you only need the env var.

---

## Vercel env vars

| Variable | Required | Value |
|----------|----------|-------|
| `ANTHROPIC_API_KEY` | Yes | your key |
| `SERPER_API_KEY` | Yes | your key |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://www.shopwithforma.com` |
| `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG` | Optional | e.g. `yourname-20` |

---

## Smoke test after deploy

- [ ] Tab shows Forma favicon (not Vercel triangle)
- [ ] `/about` loads
- [ ] `/analysis/demo` → "Scan your own product" CTA
- [ ] Real scan completes with prices + images
- [ ] Share button copies link with `utm_source=share`
- [ ] Link preview shows Forma OG image on iMessage/Twitter
