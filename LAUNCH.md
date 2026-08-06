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

## Tomorrow (growth + money) 🚀

These drive users and revenue — the college app story.

### Morning — distribution (2 hours)

| Task | Action |
|------|--------|
| **Friends blast** | Copy/paste to 10+ group chats (see posts below) |
| **Reddit** | Post to r/femalefashionadvice or r/Frugal |
| **TikTok/Reels** | 15-sec screen record: upload → verdict |
| **LinkedIn** | Short post: "I built an AI shopping copilot" + link |

### Afternoon — monetization (1 hour)

| Task | Action |
|------|--------|
| **Amazon Associates** | Sign up → add `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG` in Vercel → redeploy |
| **Check analytics** | Vercel → Analytics → filter `scan_completed` events |
| **Screenshot metrics** | Save for college app (visits, scans, shares) |

### Optional — big spike

| Task | When |
|------|------|
| **Product Hunt** | Schedule Tuesday 12:01 AM PT |
| **Hacker News Show HN** | If you want tech audience |

---

## Copy/paste posts (ready to use)

### Friends / group chat
> I built Forma — paste any product screenshot or link and AI tells you if you should buy it, finds the lowest price + dupes. Free: https://shopwithforma.com/scan?utm_source=share&utm_medium=referral&utm_campaign=forma

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
