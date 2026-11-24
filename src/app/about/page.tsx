import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Code2, Globe, Sparkles, Target, Users } from "lucide-react";
import { LogoWordmark } from "@/components/logo";
import { getAppUrl } from "@/lib/app-url";

export const metadata: Metadata = {
  title: "About Forma — Buy or skip before you checkout",
  description:
    "Forma is the buy-or-skip button for viral fashion. Scan a find, get prices and dupes, and a clear buy / wait / skip verdict. Built by Veer Goradia.",
};

const stats = [
  { label: "Analysis time", value: "10–20 sec" },
  { label: "Retailers compared", value: "18+" },
  { label: "Cost to try", value: "Free" },
];

const stack = [
  "Next.js 16 + TypeScript",
  "Anthropic Claude (product ID + verdicts)",
  "Serper (live prices & images)",
  "Supabase Auth (Google sign-in)",
  "Vercel (hosting + analytics)",
  "Cloudflare (DNS + domain)",
];

export default function AboutPage() {
  const appUrl = getAppUrl();

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <header className="border-b border-forma-border bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/">
            <LogoWordmark size="md" />
          </Link>
          <Link
            href="/scan"
            className="rounded-xl bg-forma-primary px-4 py-2 text-sm font-semibold text-white hover:bg-forma-primary-dark"
          >
            Get my verdict
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="mb-3 text-sm font-medium text-forma-primary">About Forma</p>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Stop impulse-buying what you saw on TikTok
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-forma-muted">
          Forma is a consumer app for one moment: you found something cute on social, and you need to know
          if you should actually buy it. Scan the screenshot or link — get prices, dupes, review signal, and a
          buy / wait / skip verdict in seconds.
        </p>

        <div className="mt-8 grid grid-cols-3 gap-3">
          {stats.map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-forma-border bg-white p-4 text-center">
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="mt-1 text-xs text-forma-muted">{label}</p>
            </div>
          ))}
        </div>

        <section className="mt-12 space-y-8">
          <div className="rounded-2xl border border-forma-border bg-white p-6">
            <div className="mb-3 flex items-center gap-2">
              <Target className="h-5 w-5 text-forma-primary" />
              <h2 className="text-lg font-semibold text-gray-900">The problem</h2>
            </div>
            <p className="text-sm leading-relaxed text-forma-muted">
              Discovery happens on social media. Decision-making happens across a dozen tabs — Google,
              Amazon, Reddit, retailer sites. No single tool tells you whether the purchase is actually
              worth it, what the best alternative is, or when to wait for a sale.
            </p>
          </div>

          <div className="rounded-2xl border border-forma-border bg-white p-6">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-forma-primary" />
              <h2 className="text-lg font-semibold text-gray-900">What Forma does</h2>
            </div>
            <ul className="space-y-2 text-sm text-forma-muted">
              <li>• Scan a screenshot, image, or product link</li>
              <li>• Lowest price + budget dupes side by side</li>
              <li>• Review signal without reading 200 comments</li>
              <li>• One verdict: Buy, Wait, or Skip</li>
              <li>• Share the verdict before your group chat checks out</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-forma-border bg-white p-6">
            <div className="mb-3 flex items-center gap-2">
              <Code2 className="h-5 w-5 text-forma-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Built with</h2>
            </div>
            <ul className="space-y-1.5 text-sm text-forma-muted">
              {stack.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-forma-border bg-white p-6">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-forma-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Founder</h2>
            </div>
            <p className="text-sm leading-relaxed text-forma-muted">
              Forma was designed, built, and shipped end-to-end as a solo project — from product
              vision and UI to AI pipelines, live price integration, and production deployment at{" "}
              <a href={appUrl} className="font-medium text-forma-primary hover:underline">
                shopwithforma.com
              </a>
              .
            </p>
          </div>

          <div className="rounded-2xl border border-forma-border bg-white p-6">
            <div className="mb-3 flex items-center gap-2">
              <Globe className="h-5 w-5 text-forma-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Monetization</h2>
            </div>
            <p className="text-sm leading-relaxed text-forma-muted">
              Forma is free to use. Outbound retailer links include affiliate tracking (Amazon
              Associates and UTM params) so the product can sustain itself as usage grows — without
              paywalls blocking the core experience.
            </p>
          </div>
        </section>

        <div className="mt-12 rounded-2xl bg-forma-primary px-6 py-8 text-center text-white">
          <h2 className="text-xl font-bold">Try it on something you&apos;re thinking about buying</h2>
          <p className="mt-2 text-sm text-indigo-100">Upload a screenshot. Get your verdict in under 20 seconds.</p>
          <Link
            href="/scan"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-forma-primary hover:shadow-lg"
          >
            Scan free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-forma-muted">
          <Link href="/" className="hover:text-gray-700">
            ← Back to home
          </Link>
          {" · "}
          <Link href="/analysis/demo" className="hover:text-gray-700">
            View demo
          </Link>
        </p>
      </main>
    </div>
  );
}
