import Link from "next/link";
import { getDisplayImageSrc } from "@/lib/image-proxy";
import { LogoWordmark, LogoMark } from "@/components/logo";
import { getAppUrl } from "@/lib/app-url";
import {
  Camera,
  Tag,
  Shirt,
  Shield,
  ArrowRight,
  Search,
  TrendingDown,
  Layers,
  CheckCircle2,
  Users,
  Zap,
} from "lucide-react";

const DEMO_IMAGE =
  "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=800&fit=crop&auto=format&q=80";

const features = [
  {
    icon: Camera,
    title: "Identify instantly",
    description: "Find the exact product from a screenshot, Pinterest pin, TikTok clip, or product link.",
  },
  {
    icon: Tag,
    title: "Compare confidently",
    description: "See the lowest price, better alternatives, budget dupes, and price history in one place.",
  },
  {
    icon: Shirt,
    title: "Style it better",
    description: "Get outfit recommendations and wardrobe compatibility before you purchase.",
  },
  {
    icon: Layers,
    title: "Smarter alternatives",
    description: "Discover premium upgrades, similar options, and budget-friendly dupes side by side.",
  },
  {
    icon: Search,
    title: "AI review summaries",
    description: "Skip hundreds of reviews. Get pros, cons, quality scores, and a clear verdict.",
  },
  {
    icon: TrendingDown,
    title: "Sale predictions",
    description: "Know when to buy and when to wait with price history and sale forecasting.",
  },
];

const steps = [
  { step: "1", title: "Upload", description: "Screenshot, image, or product link" },
  { step: "2", title: "Compare", description: "Retailers, reviews, and alternatives" },
  { step: "3", title: "Decide", description: "Buy with confidence" },
];

const proof = [
  { icon: Zap, label: "10–20 sec", detail: "Average analysis time" },
  { icon: Users, label: "Free to start", detail: "No account required" },
  { icon: CheckCircle2, label: "Buy / Wait / Skip", detail: "Clear AI verdict" },
];

export default function LandingPage() {
  const appUrl = getAppUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Forma",
    url: appUrl,
    description:
      "AI shopping copilot that identifies products, compares prices, finds dupes, and delivers a buy/wait/skip verdict.",
    applicationCategory: "ShoppingApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="sticky top-0 z-50 border-b border-forma-border bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/">
            <LogoWordmark size="md" priority />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-forma-muted hover:text-gray-900">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-forma-muted hover:text-gray-900">
              How it works
            </a>
            <Link href="/analysis/demo" className="text-sm text-forma-muted hover:text-gray-900">
              Live demo
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/scan"
              className="hidden text-sm font-medium text-forma-muted hover:text-gray-900 sm:inline"
            >
              Try now
            </Link>
            <Link
              href="/onboarding"
              className="rounded-xl bg-forma-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forma-primary-dark"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-20 lg:pb-32">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-indigo-100/60 blur-3xl" />
          </div>

          <div className="mx-auto max-w-6xl">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div>
                <p className="mb-4 inline-flex items-center gap-2.5 rounded-full border border-indigo-100 bg-white py-1.5 pl-1.5 pr-3.5 text-sm text-indigo-700">
                  <LogoMark sizePx={28} className="!rounded-lg" priority />
                  Free AI shopping copilot
                </p>
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                  Should you buy it?
                  <span className="mt-2 block text-forma-primary">Forma knows.</span>
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-forma-muted">
                  Paste a TikTok screenshot, Pinterest pin, or product link. Get the lowest price,
                  better dupes, review summary, and a clear buy/wait/skip verdict in seconds.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/scan?mode=upload"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-forma-primary px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-forma-primary-dark"
                  >
                    Try free — scan now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/analysis/demo"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-forma-border bg-white px-6 py-4 text-base font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    See live demo
                  </Link>
                </div>
                <p className="mt-4 text-sm text-forma-muted">No signup • Works on mobile & desktop</p>

                <div className="mt-8 grid grid-cols-3 gap-3">
                  {proof.map(({ icon: Icon, label, detail }) => (
                    <div key={label} className="rounded-xl border border-forma-border bg-white p-3">
                      <Icon className="mb-1 h-4 w-4 text-forma-primary" />
                      <p className="text-xs font-semibold text-gray-900">{label}</p>
                      <p className="text-[10px] text-forma-muted">{detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href="/analysis/demo"
                className="block rounded-3xl border border-forma-border bg-white p-6 shadow-lg shadow-indigo-100/50 transition hover:shadow-xl lg:p-8"
              >
                <div className="mb-4 flex items-center gap-2">
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
                    Live preview
                  </span>
                  <span className="text-xs text-forma-muted">Tap to see full analysis →</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getDisplayImageSrc(DEMO_IMAGE)}
                    alt="Reformation dress"
                    className="h-40 w-full rounded-2xl object-cover sm:col-span-2 sm:h-full sm:min-h-[220px]"
                  />
                  <div className="space-y-3 sm:col-span-3">
                    <div>
                      <p className="text-xs text-forma-muted">Reformation Juliette Knit Dress</p>
                      <p className="text-xs text-forma-muted">Lowest price found</p>
                      <p className="text-2xl font-bold text-emerald-600">$178</p>
                      <p className="text-sm text-gray-600">at Nordstrom</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                      92% match • Buy recommended
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: "Worth it", score: "88" },
                        { label: "Quality", score: "91" },
                        { label: "Value", score: "84" },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl bg-gray-50 p-2">
                          <p className="text-lg font-semibold text-gray-900">{s.score}</p>
                          <p className="text-[10px] text-forma-muted">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-forma-muted">18 retailers • 4 dupes • secondhand options</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-forma-border bg-white px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">How Forma works</h2>
            <p className="mt-3 text-forma-muted">Three steps to a smarter purchase</p>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {steps.map((s) => (
                <div key={s.step} className="flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-forma-primary text-lg font-bold text-white">
                    {s.step}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">{s.title}</h3>
                  <p className="mt-2 text-sm text-forma-muted">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Not just search. Full decision intelligence.
              </h2>
              <p className="mt-3 text-forma-muted">
                Google Lens finds it. Forma tells you if you should buy it — and what to get instead.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-forma-border bg-white p-6 transition hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100">
                    <Icon className="h-5 w-5 text-forma-primary" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-forma-muted">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-8 sm:pb-24">
          <div className="mx-auto max-w-4xl rounded-3xl bg-forma-primary px-8 py-14 text-center text-white sm:px-12">
            <h2 className="text-3xl font-bold sm:text-4xl">Stop overpaying. Start deciding smarter.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-indigo-100">
              Join shoppers using Forma before every purchase. Free to try — upload a screenshot and
              get your verdict in under 20 seconds.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/scan"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-semibold text-forma-primary transition hover:shadow-lg"
              >
                Start scanning free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/analysis/demo"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10"
              >
                View demo analysis
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-forma-border bg-white px-5 py-8 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <LogoWordmark size="sm" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-forma-muted">
              <Link href="/about" className="hover:text-gray-900">
                About
              </Link>
              <Link href="/analysis/demo" className="hover:text-gray-900">
                Demo
              </Link>
              <a
                href="https://github.com/vgoradia/forma"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-900"
              >
                GitHub
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span className="text-sm text-forma-muted">
                Private by design — scans stored locally
              </span>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-6xl text-center text-xs text-forma-muted">
            © 2026 Forma · Built by Veer Goradia
          </p>
        </section>
      </main>
    </div>
  );
}
