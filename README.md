# Forma — AI Shopping Copilot

Forma helps people make smarter purchasing decisions by combining AI, personalized recommendations, and real-time shopping intelligence into one seamless experience.

**Upload a screenshot, product link, or image → instantly get everything you need to decide whether to buy.**

## Features (v1)

- **Product identification** — Upload screenshots from TikTok, Pinterest, Instagram, or paste product links
- **Price comparison** — Lowest available price across retailers
- **Alternatives & dupes** — Premium upgrades, similar options, and budget-friendly dupes
- **AI review summaries** — Pros, cons, quality scores, and overall verdict
- **Outfit recommendations** — Styling suggestions and wardrobe compatibility
- **Price history & sale predictions** — Know when to buy vs. wait
- **Secondhand options** — Pre-owned alternatives on The RealReal, Depop, Poshmark
- **Buy/Wait/Skip verdict** — Clear recommendation with reasoning

## Quick start

```bash
cd forma
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

- **`/`** — Marketing landing page
- **`/home`** — App dashboard
- **`/scan`** — Analyze products
- **`/onboarding`** — First-time welcome flow

### Enable live AI analysis

1. Copy `.env.example` to `.env.local`
2. Add your `ANTHROPIC_API_KEY` and/or `OPENAI_API_KEY`, plus `SERPER_API_KEY` for live prices
3. Restart the dev server

Without API keys, Forma runs in **demo mode** with realistic sample analyses.

## Deploy & custom domain (Cloudflare)

Forma is a Next.js app. The easiest path is **Vercel for hosting** + **Cloudflare for DNS** (domain registered or managed in Cloudflare).

### 1. Deploy to Vercel

```bash
npm i -g vercel   # optional
cd forma
vercel
```

Or connect the GitHub repo at [vercel.com/new](https://vercel.com/new).

In the Vercel project:

1. **Settings → Environment Variables** — add `ANTHROPIC_API_KEY`, `SERPER_API_KEY`, etc.
2. **Settings → Domains** — add your domain (e.g. `forma.com` and `www.forma.com`)

Vercel will show the DNS records you need.

### 2. Point Cloudflare DNS to Vercel

In [Cloudflare Dashboard](https://dash.cloudflare.com) → your domain → **DNS → Records**:

| Type  | Name | Content              | Proxy        |
|-------|------|----------------------|--------------|
| `CNAME` | `@`  | `cname.vercel-dns.com` | DNS only (grey cloud) |
| `CNAME` | `www` | `cname.vercel-dns.com` | DNS only (grey cloud) |

**Important:** Turn **proxy off** (grey cloud) for these records at first so Vercel can issue SSL. After the domain verifies in Vercel, you can optionally enable Cloudflare proxy (orange cloud).

If Cloudflare won't allow CNAME on apex `@`, use Vercel's **A record** targets instead (shown in Vercel's domain settings), or enable Cloudflare **CNAME flattening** (default on Cloudflare).

### 3. SSL

- Vercel provisions HTTPS automatically once DNS propagates (usually a few minutes).
- In Cloudflare → **SSL/TLS**, set mode to **Full** (not Flexible) when using the orange-cloud proxy.

### Alternative: Cloudflare Pages

You can also deploy directly to Cloudflare Pages:

1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect Git**
2. Build command: `npm run build`
3. Output directory: leave default (Next.js on Pages uses `@cloudflare/next-on-pages` or the official Next.js adapter — check Cloudflare docs for your Next version)
4. Add env vars in Pages settings
5. **Custom domains** → add your domain (DNS is automatic if the domain is already on Cloudflare)

For Next.js 16 with API routes (`/api/analyze`), **Vercel is recommended** unless you configure Cloudflare's Node.js compatibility.

## Tech stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS 4**
- **Anthropic Claude / OpenAI** (analysis)
- **Serper** (live product prices & links)

## Project structure

```
forma/
├── src/app/
│   ├── page.tsx              # Marketing landing
│   ├── (app)/home/           # App dashboard
│   ├── scan/                 # Upload / analyze flow
│   ├── analysis/[id]/        # Results detail
│   ├── onboarding/           # Welcome flow
│   └── api/analyze/          # Analysis API
├── src/components/
├── src/lib/
└── ...
```

## License

Private — All rights reserved.
