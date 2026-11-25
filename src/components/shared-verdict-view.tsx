import Link from "next/link";
import { ArrowRight, ExternalLink, Recycle } from "lucide-react";
import { ScoreRing } from "@/components/analysis/score-ring";
import { LogoWordmark } from "@/components/logo";
import { ProductImage } from "@/components/product-image";
import { ProductLink } from "@/components/product-link";
import type { SharedVerdict } from "@/lib/shared-verdict";
import { verdictTone } from "@/lib/shared-verdict";
import { cn, formatAtRetailer, formatPrice, formatProductTitle, sanitizeLabel, stripPlaceholderMentions } from "@/lib/utils";
import { EstimateBadge, EstimateFootnote } from "@/components/estimate-badge";
import { AffiliateLinkNote } from "@/components/affiliate-link-note";
import { EmailSignupForm } from "@/components/email-signup-form";
import { SiteFooter } from "@/components/site-footer";
import { TrackOnMount } from "@/components/track-on-mount";
import { PRICE_ESTIMATE_NOTE, PRICE_TREND_NOTE } from "@/lib/price-estimates";

const verdictLabel: Record<SharedVerdict["verdict"]["recommendation"], string> = {
  buy: "Buy",
  wait: "Wait for sale",
  skip: "Skip",
  "consider-alternatives": "Consider alternatives",
};

const tierLabel = {
  dupe: "Budget dupe",
  similar: "Similar",
  premium: "Premium",
} as const;

const SCAN_HREF = "/scan?utm_source=share&utm_medium=referral&utm_campaign=forma";

const tierStyles = {
  dupe: "bg-emerald-100 text-emerald-700",
  similar: "bg-sky-100 text-sky-700",
  premium: "bg-violet-100 text-violet-700",
};

export function SharedVerdictView({ verdict }: { verdict: SharedVerdict }) {
  const productTitle = formatProductTitle(verdict.product.brand, verdict.product.name) || "This find";
  const atRetailer = formatAtRetailer(verdict.lowestPrice.retailer);
  const tone = verdictTone(verdict.verdict.recommendation);
  const color = verdict.product.colors[0];
  const subtitle = [color, verdict.product.category].filter(Boolean).join(" · ");
  const hasReviews = verdict.reviews.summary.length > 0 || verdict.reviews.overallRating > 0;
  const prices = [...verdict.prices].sort((a, b) => a.price - b.price);

  return (
    <div className="flex min-h-screen flex-col bg-[#f9fafb]">
      <TrackOnMount name="verdict_viewed" source="share" />
      <header className="border-b border-forma-border bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/">
            <LogoWordmark size="md" priority />
          </Link>
          <Link
            href={SCAN_HREF}
            className="rounded-xl bg-forma-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-forma-primary-dark"
          >
            Scan free
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">Shared verdict</p>

        <article className="mt-3 overflow-hidden rounded-3xl border border-forma-border bg-white shadow-sm">
          <div className="grid md:grid-cols-5">
            <ProductImage
              src={verdict.product.imageUrl}
              alt={productTitle}
              fit="contain"
              fallbackClassName="from-indigo-100 to-violet-100"
              className="h-56 w-full md:col-span-2 md:h-full md:min-h-[280px]"
            />
            <div className="p-5 md:col-span-3 md:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
                  style={{ color: tone.color, borderColor: tone.color }}
                >
                  {verdictLabel[verdict.verdict.recommendation]}
                </span>
                {verdict.product.matchPercent > 0 && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {verdict.product.matchPercent}% match
                  </span>
                )}
              </div>
              <p className="mt-4 text-4xl font-bold tracking-tight" style={{ color: tone.color }}>
                {tone.word}
              </p>
              <h1 className="mt-2 text-2xl font-bold text-gray-900">{productTitle}</h1>
              {subtitle && <p className="mt-1 text-sm text-forma-muted">{subtitle}</p>}
              <p className="mt-4 text-lg font-semibold text-gray-900">
                {stripPlaceholderMentions(verdict.verdict.headline)}
              </p>
              <p className="mt-3 text-base text-gray-700">
                {verdict.lowestPrice.estimated ? "Estimated price about " : "Lowest price "}
                <span className="font-bold text-emerald-600">{formatPrice(verdict.lowestPrice.price)}</span>
                {atRetailer ? ` ${atRetailer}` : ""}
                {verdict.lowestPrice.priceVerified ? " · verified" : ""}
                {verdict.lowestPrice.estimated && <EstimateBadge />}
              </p>
              {verdict.lowestPrice.estimated && <EstimateFootnote>{PRICE_ESTIMATE_NOTE}</EstimateFootnote>}
            </div>
          </div>
        </article>

        {verdict.verdict.reasoning && (
          <section className="mt-4 rounded-2xl border border-forma-border bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">Why this verdict</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">
              {stripPlaceholderMentions(verdict.verdict.reasoning)}
            </p>
            {verdict.saleNote && (
              <div className="mt-3">
                <p className="text-sm text-amber-800">
                  <EstimateBadge note={PRICE_TREND_NOTE} />
                  <span className="ml-1">Possible timing, not a confirmed sale: {verdict.saleNote}</span>
                </p>
                <EstimateFootnote>{PRICE_TREND_NOTE}</EstimateFootnote>
              </div>
            )}
          </section>
        )}

        <div className="mt-4 flex justify-center gap-6 rounded-2xl border border-forma-border bg-white py-5">
          <ScoreRing score={verdict.verdict.worthItScore} label="Worth it" />
          <ScoreRing score={verdict.reviews.qualityScore} label="Quality" />
          <ScoreRing score={verdict.reviews.valueScore} label="Value" />
        </div>

        <section className="mt-4 rounded-2xl border border-forma-border bg-white p-5">
          <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900">
            {prices.some((price) => price.estimated) ? "Estimated prices" : "Prices"}
            {prices.some((price) => price.estimated) && <EstimateBadge />}
          </h2>
          <ul className="mt-3 space-y-2">
            {prices.map((price, index) => (
              <li key={`${price.retailer}-${index}`} className="flex items-center justify-between text-sm">
                <span className={index === 0 ? "font-medium text-gray-900" : "text-forma-muted"}>
                  {sanitizeLabel(price.retailer)}
                </span>
                <span className={index === 0 ? "font-semibold text-emerald-600" : "font-medium text-gray-800"}>
                  {price.estimated ? `about ${formatPrice(price.price)}` : formatPrice(price.price)}
                </span>
              </li>
            ))}
          </ul>
          {prices.some((price) => price.estimated) && <EstimateFootnote>{PRICE_ESTIMATE_NOTE}</EstimateFootnote>}
          {verdict.lowestPrice.url && (
            <ProductLink
              href={verdict.lowestPrice.url}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-forma-primary py-2.5 text-sm font-semibold text-white"
            >
              View product
              <ExternalLink className="h-3.5 w-3.5" />
            </ProductLink>
          )}
          <AffiliateLinkNote className="mt-3" />
        </section>

        {verdict.alternatives.length > 0 && (
          <section className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Dupes and alternatives</h2>
              {verdict.alternatives.some((alt) => alt.estimated) && (
                <EstimateBadge note="Dupe prices are AI estimates unless a live listing verified them." />
              )}
            </div>
            {verdict.alternatives.some((alt) => alt.estimated) && (
              <p className="mt-2 text-[11px] leading-relaxed text-forma-muted">
                Dupe prices are AI estimates unless a live listing verified them.
              </p>
            )}
            <div className="mt-3 flex gap-3 overflow-x-auto hide-scrollbar sm:grid sm:grid-cols-2 sm:overflow-visible">
              {verdict.alternatives.map((alt) => {
                const altTitle = formatProductTitle(alt.brand, alt.name);
                return (
                  <div
                    key={`${alt.brand}-${alt.name}`}
                    className="w-52 shrink-0 rounded-2xl border border-forma-border bg-white p-3 sm:w-auto"
                  >
                    <ProductImage src={alt.imageUrl} alt={altTitle} className="mb-2 h-24 w-full rounded-xl" />
                    <span
                      className={cn(
                        "mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                        tierStyles[alt.tier]
                      )}
                    >
                      {tierLabel[alt.tier]}
                    </span>
                    <p className="line-clamp-2 text-sm font-semibold text-gray-900">{altTitle}</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">
                      {alt.estimated ? `about ${formatPrice(alt.price)}` : formatPrice(alt.price)}
                    </p>
                    {alt.reason && <p className="mt-1 line-clamp-2 text-xs text-forma-muted">{alt.reason}</p>}
                    {alt.url && (
                      <ProductLink
                        href={alt.url}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-forma-primary"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </ProductLink>
                    )}
                  </div>
                );
              })}
            </div>
            <AffiliateLinkNote className="mt-3" />
          </section>
        )}

        {hasReviews && (
          <section className="mt-4 rounded-2xl border border-forma-border bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">Reviews</h2>
            {verdict.reviews.overallRating > 0 && (
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {verdict.reviews.overallRating.toFixed(1)}
                {verdict.reviews.totalReviews > 0 && (
                  <span className="font-normal text-forma-muted">
                    {" "}
                    from {verdict.reviews.totalReviews.toLocaleString("en-US")} reviews
                  </span>
                )}
              </p>
            )}
            {verdict.reviews.summary && (
              <p className="mt-2 text-sm leading-relaxed text-gray-700">{verdict.reviews.summary}</p>
            )}
            {(verdict.reviews.pros.length > 0 || verdict.reviews.cons.length > 0) && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <ul className="space-y-1">
                  {verdict.reviews.pros.map((pro) => (
                    <li key={pro} className="text-xs text-emerald-700">
                      + {pro}
                    </li>
                  ))}
                </ul>
                <ul className="space-y-1">
                  {verdict.reviews.cons.map((con) => (
                    <li key={con} className="text-xs text-red-600">
                      − {con}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {verdict.secondhand.length > 0 && (
          <section className="mt-4 rounded-2xl border border-forma-border bg-white p-5">
            <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900">
              <Recycle className="h-4 w-4 text-emerald-600" />
              Secondhand
              <EstimateBadge note="Pre-owned prices are AI estimates, not live listings." />
            </h2>
            <ul className="mt-3 space-y-2">
              {verdict.secondhand.map((platform) => (
                <li
                  key={platform.name}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 text-sm"
                >
                  <span className="font-medium text-gray-900">{platform.name}</span>
                  {platform.url ? (
                    <ProductLink href={platform.url} className="font-semibold text-forma-primary">
                      about {formatPrice(platform.price)}
                    </ProductLink>
                  ) : (
                    <span className="font-semibold text-gray-900">about {formatPrice(platform.price)}</span>
                  )}
                </li>
              ))}
            </ul>
            <AffiliateLinkNote className="mt-3" />
          </section>
        )}

        <section className="mt-8 rounded-3xl bg-[#1A1B26] px-6 py-8 text-center text-white sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200">Try Forma</p>
          <h2 className="mt-2 text-2xl font-bold">Should you buy it?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-300">
            Screenshot a find from TikTok or paste a link. Forma returns a buy, wait, or skip verdict with prices and
            dupes. Free, no account required.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={SCAN_HREF}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-forma-primary px-6 py-3.5 text-sm font-semibold text-white hover:bg-forma-primary-dark sm:w-auto"
            >
              Get my verdict
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/analysis/demo"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-white/15 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/5 sm:w-auto"
            >
              See a demo
            </Link>
          </div>
        </section>

        <EmailSignupForm source="verdict" className="mt-8" />
      </main>
      <SiteFooter />
    </div>
  );
}
