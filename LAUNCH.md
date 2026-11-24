# Forma — Launch playbook

**Positioning:** The buy-or-skip button for viral fashion.  
**URL:** https://www.shopwithforma.com  
**Primary CTA:** https://www.shopwithforma.com/scan

---

## Phase 1 — Product (finish before the launch video)

Do **not** film the launch video until every item here passes on **production** (phone + desktop).

### Core loop
- [ ] Landing → **Get my verdict** → `/scan` loads fast
- [ ] Real scan (screenshot or link) completes in &lt; 30s with prices + dupes
- [ ] Verdict shows **Buy / Wait / Skip** + **Share verdict** copies link with UTM
- [ ] `/analysis/demo` works with no signup (for cold traffic)
- [ ] Google sign-in works (incognito test on www)
- [ ] Free tier shows **8 scans/month** banner; Plus unlocks unlimited (test Stripe checkout once)

### Monetization (week 1 of launch, not day 0 blockers)
- [ ] Amazon Associates approved + `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG` in Vercel → redeploy
- [ ] Click a **Buy** link after scan → Amazon URL contains your `tag=`

### Polish
- [x] B2C positioning (buy or skip, simplified nav)
- [x] Share verdict copy + UTM
- [x] OG / favicon / about page aligned
- [ ] You personally run **3 real scans** on things you’d actually buy

**When Phase 1 is green → Phase 2.**

---

## Phase 2 — Launch video (30 seconds)

One clip for **Reels, TikTok, and X**. Vertical 9:16. Face optional; screen recording is enough.

### Storyboard
| Sec | Visual | On-screen text / VO |
|-----|--------|---------------------|
| 0–3 | TikTok fashion screenshot | “Saw this on TikTok…” |
| 3–8 | Open Forma → paste/upload | “…so I scanned it on Forma” |
| 8–15 | Loading → verdict card | “Buy, Wait, or Skip” |
| 15–22 | Dupes + lowest price | “Cheaper dupe at $XX” |
| 22–27 | Tap **Share verdict** | “Sent it to the group chat” |
| 27–30 | End card: logo + URL | **shopwithforma.com** — free |

### Recording tips
- Use a **real** viral-style product (dress, sneaker, bag) — not demo unless demo looks identical
- End on **SKIP** or **dupe** for drama (more shares than “BUY”)
- Link in bio: `/scan?utm_source=launch&utm_medium=video&utm_campaign=nov2026`

---

## Phase 3 — Socials (same day as video)

### Handles (pick consistent @)
- Instagram / TikTok: `@shopwithforma` or `@formashop` (whatever’s free)
- X: same handle if possible

### Bio (all platforms)
> Buy or skip before you checkout 👗  
> Scan TikTok finds → prices, dupes, verdict  
> Free ↓

**Link:** https://www.shopwithforma.com/scan

### Pin one post
Hook: *“TikTok made you want it. Forma tells you if you should buy it.”*  
Media: launch video  
CTA: link in bio

---

## Phase 4 — Distribution (week 1)

| Channel | Action |
|---------|--------|
| **IG Reels** | Launch video + 2 more scans (different products) |
| **TikTok** | Same video, hashtags `#tiktokmademebuyit` `#fashiondupes` `#shopwithforma` |
| **X** | Founder thread (copy below) + clip |
| **LinkedIn** | Founder story + demo screenshot (credibility) |

**Do not** spam Reddit or friends blast until you have 10+ real stranger scans from social.

### X — launch thread (single post version)
> TikTok never tells you if you should actually buy it.
>
> I built Forma — screenshot the find → buy / wait / skip + lowest price & dupes in ~15 sec.
>
> Free: https://www.shopwithforma.com/scan
>
> Launch video in replies 👇

### LinkedIn
> I’m building Forma — a consumer app for the moment after you see something on TikTok: **should you buy it?**
>
> One scan → prices, dupes, review signal, and a clear buy / wait / skip verdict. Free to start; Forma Plus for unlimited scans and price watches.
>
> Try it: https://www.shopwithforma.com/analysis/demo
>
> [Attach demo or launch video]

---

## Metrics that matter (B2C, not vanity)

| Metric | Week 1 target | Why |
|--------|---------------|-----|
| `scan_completed` | 100+ | Real usage |
| `share_analysis` | 25+ | Viral loop |
| Scan → share rate | 10%+ | Product fit signal |
| Plus checkouts | Any | Someone paid = business |

Track in **Vercel Analytics → Events**.

---

## Vercel env (production)

| Variable | Required |
|----------|----------|
| `ANTHROPIC_API_KEY` | Yes |
| `SERPER_API_KEY` | Yes |
| `NEXT_PUBLIC_APP_URL` | `https://www.shopwithforma.com` |
| `NEXT_PUBLIC_SUPABASE_*` | For Google sign-in |
| `STRIPE_*` | For Forma Plus |
| `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG` | When approved |

---

## What “million-dollar startup” actually means here

1. **One wedge** — social fashion impulse (done in product).  
2. **One loop** — scan → verdict → share (built).  
3. **Two revenue lines** — affiliate on BUY + Forma Plus (wired).  
4. **One channel** — short video until CAC is understood.

Scale comes **after** week-1 retention and shares, not before launch day.

**Your job before we call launch:** Phase 1 checklist on your phone.  
**Our job after:** iterate on whatever breaks in real usage.