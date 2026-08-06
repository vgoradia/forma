# Forma — College app narrative

Use this when writing about Forma in applications, interviews, or your portfolio.

## One-line pitch

**Forma** is an AI shopping copilot I built and shipped solo — users upload a product screenshot or link and get live prices, dupes, review summaries, and a buy/wait/skip verdict in under 20 seconds.

**Live:** https://shopwithforma.com

---

## Problem → solution (2 sentences)

Online shoppers discover products on TikTok and Pinterest but waste 30–60 minutes identifying items, comparing prices, and reading reviews across dozens of tabs. Forma collapses that entire workflow into one upload: AI identifies the product, Serper pulls live retailer prices, and Claude synthesizes reviews into a clear purchase verdict.

---

## What you built (technical depth)

| Layer | What you did |
|-------|----------------|
| **Product** | Defined v1 scope, UX flows, buy/wait/skip framework |
| **Frontend** | Next.js 16 App Router, responsive mobile-first UI, localStorage history |
| **AI pipeline** | Claude vision + text for product ID, alternatives, review synthesis, verdict |
| **Data** | Serper Shopping API for live prices; web-search fallbacks for images + direct PDP links |
| **Infra** | Deployed on Vercel, custom domain via Cloudflare, analytics + rate limiting |
| **Growth** | SEO (sitemap, JSON-LD), OG previews, share links with UTM tracking, affiliate monetization |

---

## Impact metrics to track (update weekly)

Fill these in from **Vercel Analytics** → Events:

| Metric | Week 1 goal | Your number |
|--------|-------------|-------------|
| Site visits | 500+ | ___ |
| Scans completed (`scan_completed`) | 100+ | ___ |
| Shares (`share_analysis`) | 25+ | ___ |
| Referral traffic (`utm_source=share`) | 50+ | ___ |

Even modest numbers are fine if you can speak to **growth tactics** (Reddit, TikTok demo, Product Hunt, friend shares).

---

## Sample activities paragraph (150 words)

> I founded and built Forma, an AI shopping copilot that helps people decide whether to buy products found on social media. After noticing friends spend hours reverse-image-searching TikTok finds and still overpaying, I designed a product that accepts screenshots, links, or text queries and returns live prices across retailers, budget dupes, AI-summarized reviews, and a clear buy/wait/skip recommendation. I implemented the full stack — Next.js frontend, Claude API for analysis, Serper for live commerce data, and production deployment with a custom domain. Forma launched at shopwithforma.com with [X] users and [Y] product scans in the first [Z] weeks. I focused on distribution through fashion communities and shareable analysis links, and integrated affiliate tracking for sustainable monetization. The project taught me to ship fast, iterate on real user feedback, and balance AI cost with product quality.

Replace `[X]`, `[Y]`, `[Z]` with real numbers before submitting.

---

## Sample shorter blurb (50 words)

> Built Forma, a live AI shopping copilot (shopwithforma.com) that identifies products from screenshots, compares prices across retailers, and delivers buy/wait/skip verdicts. Solo full-stack project: Next.js, Claude, Serper API, Vercel. [X]+ scans in first month.

---

## Links to include

- **Live app:** https://shopwithforma.com
- **Demo (no signup):** https://shopwithforma.com/analysis/demo
- **About page:** https://shopwithforma.com/about
- **GitHub:** https://github.com/vgoradia/forma

---

## Demo video script (30 sec — great for supplements)

1. Open TikTok screenshot of a dress (3 sec)
2. Upload to Forma `/scan` (3 sec)
3. Show loading → full analysis page (10 sec)
4. Highlight: lowest price, dupe, verdict badge (8 sec)
5. End card: "Forma — shopwithforma.com" (6 sec)

Record on iPhone, add captions, post to TikTok/Reels + link in bio.
