import type { Metadata } from "next";
import Link from "next/link";
import { LogoWordmark } from "@/components/logo";

export const metadata: Metadata = {
  title: "Privacy Policy — Forma",
  description: "How Forma handles your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <header className="border-b border-forma-border bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/">
            <LogoWordmark size="md" />
          </Link>
          <Link href="/scan" className="text-sm font-semibold text-forma-primary">
            Scan
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="text-sm text-forma-muted">Last updated: November 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-base font-semibold text-gray-900">Summary</h2>
            <p>
              Forma (&quot;we&quot;, &quot;us&quot;) operates shopwithforma.com. We collect only what we need to run
              product scans, accounts, and subscriptions. We do not sell your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">What we collect</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Scans:</strong> Images, links, or text you submit for analysis. Guest scan history is stored in
                your browser (localStorage) unless you sign in.
              </li>
              <li>
                <strong>Account:</strong> If you sign in with Google, we receive your name, email, and profile photo from
                Supabase Auth.
              </li>
              <li>
                <strong>Payments:</strong> Stripe processes Forma Plus payments. We do not store card numbers.
              </li>
              <li>
                <strong>Usage:</strong> Anonymous analytics (e.g. page views, scan and share events) via Vercel Analytics.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">How we use data</h2>
            <p>
              To identify products, return prices and verdicts, authenticate users, bill Forma Plus, improve the product,
              and prevent abuse. AI providers (e.g. Anthropic) process scan content only to generate your analysis.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">Affiliate links</h2>
            <p>
              Outbound retailer links may include affiliate parameters. We may earn a commission if you purchase; this does
              not change your price.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">Your choices</h2>
            <p>
              Clear scan data in Profile, sign out, or delete your browser storage. For account deletion, email us (below).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">Contact</h2>
            <p>
              Questions:{" "}
              <a href="mailto:contact@shopwithforma.com" className="text-forma-primary">
                contact@shopwithforma.com
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}