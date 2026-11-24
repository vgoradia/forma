import type { Metadata } from "next";
import Link from "next/link";
import { LogoWordmark } from "@/components/logo";

export const metadata: Metadata = {
  title: "Terms of Service — Forma",
  description: "Terms for using Forma.",
};

export default function TermsPage() {
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
        <h1 className="text-2xl font-bold text-gray-900">Terms of Service</h1>
        <p className="mt-1 text-sm text-forma-muted">Last updated: November 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-base font-semibold text-gray-900">Agreement</h2>
            <p>
              By using Forma at shopwithforma.com, you agree to these terms. If you disagree, do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">The service</h2>
            <p>
              Forma provides AI-assisted shopping analysis (prices, dupes, buy/wait/skip verdicts). Results are for
              informational purposes only — not financial, legal, or professional advice. Prices, price trends, and
              sale timing that are not marked verified are AI estimates. They are not observed price history and not a
              promise that a retailer will discount an item. Always verify prices and retailers before purchasing.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">Accounts &amp; Forma Plus</h2>
            <p>
              You may use Forma as a guest within free-tier limits. Forma Plus is a recurring subscription billed through
              Stripe; cancel anytime in the Stripe customer portal linked from your account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">Acceptable use</h2>
            <p>
              Do not abuse the API, scrape the site, upload illegal content, or use Forma to harm others. We may limit or
              terminate access for abuse.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">Intellectual property</h2>
            <p>
              Forma&apos;s brand, software, and design are owned by the operator. You retain rights to content you upload;
              you grant us a license to process it solely to provide the service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">Disclaimer</h2>
            <p>
              The service is provided &quot;as is&quot; without warranties. We are not liable for indirect or consequential
              damages arising from use of Forma or third-party purchases.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">Contact</h2>
            <p>
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