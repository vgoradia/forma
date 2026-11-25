"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Link2,
  Bookmark,
  Share2,
  BadgeCheck,
  Star,
  ExternalLink,
  Recycle,
  Check,
} from "lucide-react";
import type { ProductAnalysis } from "@/lib/types";
import { cn, formatAtRetailer, formatPrice, formatProductTitle, sanitizeLabel, stripPlaceholderMentions, toArray } from "@/lib/utils";
import { ProductLink } from "@/components/product-link";
import { PageContainer } from "@/components/page-container";
import { ProductImage, getAnalysisHeroImage } from "@/components/product-image";
import { LogoMark } from "@/components/logo";
import { GUEST_INITIALS } from "@/lib/user";
import { ScoreRing } from "@/components/analysis/score-ring";
import { VerdictBadge } from "@/components/analysis/verdict-badge";
import { getAlternativeTierLabel } from "@/lib/scan-helpers";
import { describePriceTrend, isEstimatedPrice, PRICE_ESTIMATE_NOTE, PRICE_TREND_NOTE } from "@/lib/price-estimates";
import { EstimateBadge, EstimateFootnote } from "@/components/estimate-badge";
import { getPrefs, isBookmarked, toggleBookmark } from "@/lib/storage";
import { subscribeStorage } from "@/lib/storage-events";
import { trackEvent } from "@/lib/analytics";
import { FormaPlusAnalysisUpsell } from "@/components/forma-plus-cta";
import { requestPublicShare } from "@/lib/shared-verdict";
import { getVerdictSharePayload } from "@/lib/share-url";

function Card({ title, children, className }: { title?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-forma-border bg-white p-4 shadow-sm lg:p-5", className)}>
      {title && (
        <h2 className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900 lg:text-base">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

const tierStyles = {
  dupe: "bg-emerald-100 text-emerald-700",
  similar: "bg-sky-100 text-sky-700",
  premium: "bg-violet-100 text-violet-700",
};

export function AnalysisDetail({
  analysis,
  imagePreview,
  scanId,
}: {
  analysis: ProductAnalysis;
  imagePreview?: string;
  scanId?: string;
}) {
  const product = analysis.identifiedProduct;
  const productTitle = formatProductTitle(product.brand, product.name) || product.category || "This item";
  const atRetailer = formatAtRetailer(analysis.lowestPrice.retailer);
  const verdictHeadline = stripPlaceholderMentions(analysis.verdict.headline);
  const verdictReasoning = stripPlaceholderMentions(analysis.verdict.reasoning);
  const colors = toArray(product.colors);
  const match = Math.round(product.confidence * 100);
  const heroImage = getAnalysisHeroImage(analysis, imagePreview);
  const [saved, setSaved] = useState(() => (scanId ? isBookmarked(scanId) : false));
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [showSaleEstimate, setShowSaleEstimate] = useState(true);

  useEffect(() => {
    const read = () => setShowSaleEstimate(getPrefs().salePredictions);
    read();
    return subscribeStorage(read);
  }, []);
  const [sharing, setSharing] = useState(false);
  const publishedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!scanId) return;
    try {
      const savedPath = sessionStorage.getItem(`forma_share_${scanId}`);
      if (savedPath && /^\/v\/[A-Za-z0-9]{10}$/.test(savedPath)) {
        publishedPath.current = savedPath;
      }
    } catch {
      // Private browsing can block sessionStorage. The next share creates a new link.
    }
  }, [scanId]);

  const handleSave = () => {
    if (!scanId) return;
    setSaved(toggleBookmark(scanId));
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    setShareMessage(null);

    const fail = () => {
      setShareMessage("Could not share");
      window.setTimeout(() => setShareMessage(null), 2500);
    };

    try {
      let path = "/analysis/demo";
      if (scanId) {
        if (!publishedPath.current) {
          const published = await requestPublicShare(analysis);
          if (!published) {
            fail();
            return;
          }
          publishedPath.current = published;
          try {
            sessionStorage.setItem(`forma_share_${scanId}`, published);
          } catch {
            // The in-memory path still works until this page unmounts.
          }
        }
        if (!publishedPath.current) {
          fail();
          return;
        }
        path = publishedPath.current;
      }

      const { title, text, url } = getVerdictSharePayload({
        productTitle,
        recommendation: analysis.verdict.recommendation,
        headline: verdictHeadline,
        lowestPrice: formatPrice(analysis.lowestPrice.price),
        retailer: sanitizeLabel(analysis.lowestPrice.retailer),
        priceEstimated: isEstimatedPrice(analysis.lowestPrice),
        path,
      });

      trackEvent("share_analysis", { has_scan_id: Boolean(scanId) });

      if (navigator.share) {
        try {
          await navigator.share({ title, text, url });
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }

      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShareMessage("Verdict link copied!");
      window.setTimeout(() => setShareMessage(null), 2000);
    } catch {
      fail();
    } finally {
      setSharing(false);
    }
  };

  const lowestEstimated = isEstimatedPrice(analysis.lowestPrice);
  const anyPriceEstimated = lowestEstimated || analysis.prices.some((price) => isEstimatedPrice(price));
  const priceTrend = describePriceTrend(analysis);

  return (
    <PageContainer className="pb-28 lg:pb-6">
      {!scanId && (
        <div className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-center lg:mb-6">
          <p className="text-sm font-medium text-gray-900">Demo analysis — see what Forma finds in seconds</p>
          <Link
            href="/scan"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-forma-primary hover:underline"
          >
            Scan your own product
            <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
          </Link>
        </div>
      )}
      <div className="mb-4 flex items-center justify-between lg:mb-6">
        <Link href={scanId ? "/home" : "/"} className="rounded-xl p-2 text-forma-muted hover:bg-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <LogoMark size="sm" className="lg:hidden" />
        <Link
          href="/profile"
          className="h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-violet-200 to-indigo-300 lg:hidden"
        >
          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-indigo-700">
            {GUEST_INITIALS}
          </div>
        </Link>
        <div className="hidden lg:block lg:flex-1" />
      </div>

      <Card className="mb-4 overflow-hidden p-0 lg:mb-6 lg:grid lg:grid-cols-5">
        <ProductImage
          src={heroImage}
          alt={productTitle}
          fit="contain"
          className="h-44 w-full lg:col-span-2 lg:h-auto lg:min-h-[280px]"
        />
        <div className="p-4 lg:col-span-3 lg:p-6">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <VerdictBadge recommendation={analysis.verdict.recommendation} />
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <BadgeCheck className="h-3.5 w-3.5" />
              {match}% match
            </span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 lg:text-2xl">
            {productTitle}
          </h1>
          <p className="mt-1 text-sm text-forma-muted">
            {colors[0] ?? "—"} • {product.category}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-gray-600 lg:text-base">
            {stripPlaceholderMentions(product.description)}
          </p>
          <p className="mt-3 text-sm text-gray-700 lg:text-base">
            {lowestEstimated ? "Estimated price: about " : "Lowest price found: "}
            <span className="font-bold text-emerald-600">{formatPrice(analysis.lowestPrice.price)}</span>
            {atRetailer ? ` ${atRetailer}` : ""}
            {lowestEstimated ? <EstimateBadge /> : " (verified)"}
          </p>
          {lowestEstimated && <EstimateFootnote>{PRICE_ESTIMATE_NOTE}</EstimateFootnote>}
          <p className="mt-2 text-xs text-forma-muted lg:text-sm">
            {analysis.prices.length} retailers compared • {analysis.alternatives.length} better alternatives found
          </p>
          <div className="mt-4 flex justify-center gap-4 lg:justify-start lg:gap-6">
            <ScoreRing score={analysis.verdict.worthItScore} label="Worth it" />
            <ScoreRing score={analysis.reviewSummary.qualityScore} label="Quality" />
            <ScoreRing score={analysis.reviewSummary.valueScore} label="Value" />
          </div>
        </div>
      </Card>

      <div className="mb-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 to-violet-50/80 p-4 lg:mb-5 lg:p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Your verdict</p>
        <p className="mt-1 text-base font-semibold text-gray-900 lg:text-lg">{verdictHeadline}</p>
        <p className="mt-2 text-xs leading-relaxed text-forma-muted lg:text-sm line-clamp-3">
          {verdictReasoning}
        </p>
        <button
          type="button"
          onClick={() => void handleShare()}
          disabled={sharing}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-forma-primary py-3 text-sm font-semibold text-white disabled:opacity-70 lg:w-auto lg:px-6"
        >
          <Share2 className="h-4 w-4" />
          {sharing ? "Creating link…" : "Share verdict"}
        </button>
        {shareMessage && (
          <p className="mt-2 text-center text-xs font-medium text-forma-primary lg:text-left">{shareMessage}</p>
        )}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
        <Link
          href="/scan?mode=upload"
          className="flex items-center justify-center gap-2 rounded-xl bg-forma-primary py-3 text-xs font-semibold text-white lg:text-sm"
        >
          <Camera className="h-4 w-4" /> Scan image
        </Link>
        <Link
          href="/scan?mode=link"
          className="flex items-center justify-center gap-2 rounded-xl border border-forma-border bg-white py-3 text-xs font-semibold text-gray-700 lg:text-sm"
        >
          <Link2 className="h-4 w-4" /> Paste link
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={!scanId}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-semibold lg:text-sm",
            saved
              ? "border-violet-200 bg-violet-50 text-violet-700"
              : "border-forma-border bg-white text-gray-700",
            !scanId && "opacity-50"
          )}
        >
          {saved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          {saved ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => void handleShare()}
          disabled={sharing}
          className="flex items-center justify-center gap-2 rounded-xl border border-forma-border bg-white py-3 text-xs font-semibold text-gray-700 disabled:opacity-70 lg:text-sm sm:hidden"
        >
          <Share2 className="h-4 w-4" /> Share
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mb-6 lg:gap-4">
        <Card
          title={
            anyPriceEstimated ? (
              <>
                Estimated prices
                <EstimateBadge />
              </>
            ) : (
              "Lowest price"
            )
          }
        >
          <div className="space-y-2">
            {analysis.prices.slice(0, 4).map((p, i) => {
              const estimated = isEstimatedPrice(p);
              return (
                <div key={`${p.retailer}-${i}`} className="flex items-center justify-between text-xs lg:text-sm">
                  <span className={cn("font-medium", i === 0 ? "text-gray-900" : "text-forma-muted")}>
                    {sanitizeLabel(p.retailer)}
                  </span>
                  <span className={cn("font-semibold", i === 0 ? "text-emerald-600" : "text-gray-700")}>
                    {estimated ? `about ${formatPrice(p.price)}` : formatPrice(p.price)}
                    {!estimated && (
                      <span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                        verified
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          {anyPriceEstimated && <EstimateFootnote>{PRICE_ESTIMATE_NOTE}</EstimateFootnote>}
          <ProductLink
            href={analysis.lowestPrice.url}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-forma-primary py-2.5 text-xs font-semibold text-white lg:text-sm"
          >
            View product
            <ExternalLink className="h-3.5 w-3.5" />
          </ProductLink>
        </Card>

        <Card title="AI review summary">
          <div className="mb-2 flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-sm font-semibold">{analysis.reviewSummary.overallRating}</span>
            {analysis.reviewSummary.totalReviews > 0 && (
              <span className="text-[10px] text-forma-muted lg:text-xs">
                from {analysis.reviewSummary.totalReviews.toLocaleString()} reviews
              </span>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-forma-muted lg:text-sm">{analysis.reviewSummary.summary}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <ul className="space-y-1">
              {analysis.reviewSummary.pros.slice(0, 2).map((pro) => (
                <li key={pro} className="text-[10px] text-emerald-700 lg:text-xs">
                  + {pro}
                </li>
              ))}
            </ul>
            <ul className="space-y-1">
              {analysis.reviewSummary.cons.slice(0, 2).map((con) => (
                <li key={con} className="text-[10px] text-red-600 lg:text-xs">
                  − {con}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <section className="mb-4 lg:mb-6">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900 lg:text-base">Better alternatives</h2>
          {analysis.alternatives.some((alt) => isEstimatedPrice(alt)) && (
            <EstimateBadge note="Dupe prices are AI estimates unless a live listing verified them." />
          )}
        </div>
        {analysis.alternatives.some((alt) => isEstimatedPrice(alt)) && (
          <p className="mb-3 text-[11px] leading-relaxed text-forma-muted lg:text-xs">
            Dupe prices are AI estimates unless a live listing verified them.
          </p>
        )}
        <div className="flex gap-3 overflow-x-auto hide-scrollbar lg:grid lg:grid-cols-3 lg:overflow-visible xl:grid-cols-4">
          {analysis.alternatives.map((alt) => {
            const altTitle = formatProductTitle(alt.brand, alt.name);
            return (
            <div
              key={alt.name + alt.brand}
              className="w-40 shrink-0 rounded-2xl border border-forma-border bg-white p-3 lg:w-full lg:shrink"
            >
              <ProductImage
                src={alt.imageUrl}
                alt={altTitle}
                className="mb-2 h-20 w-full rounded-xl lg:h-28"
              />
              <span className={cn("mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium", tierStyles[alt.tier])}>
                {getAlternativeTierLabel(alt.tier)}
              </span>
              <p className="line-clamp-2 text-xs font-semibold text-gray-900 lg:text-sm">
                {altTitle}
              </p>
              <p className="mt-1 text-sm font-bold text-gray-900">
                {isEstimatedPrice(alt) ? `about ${formatPrice(alt.price)}` : formatPrice(alt.price)}
              </p>
              <p className="mt-1 line-clamp-2 text-[10px] text-forma-muted lg:text-xs">{alt.reason}</p>
              <ProductLink
                href={alt.url}
                className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-forma-primary lg:text-xs"
              >
                View <ExternalLink className="h-3 w-3" />
              </ProductLink>
            </div>
            );
          })}
        </div>
      </section>

      {analysis.secondhand.available && analysis.secondhand.platforms.length > 0 && (
        <section className="mb-4 lg:mb-6">
          <Card
            title={
              <>
                Buy secondhand
                <EstimateBadge note="Pre-owned prices are AI estimates, not live listings." />
              </>
            }
          >
            <div className="mb-3 flex items-center gap-2 text-xs text-emerald-700 lg:text-sm">
              <Recycle className="h-4 w-4" />
              Pre-owned prices are AI estimates, not live listings.
            </div>
            <div className="space-y-2">
              {analysis.secondhand.platforms.map((platform) => (
                <div
                  key={platform.name}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5"
                >
                  <span className="text-sm font-medium text-gray-900">{platform.name}</span>
                  <ProductLink
                    href={platform.url}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-forma-primary"
                  >
                    about {formatPrice(platform.price)}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </ProductLink>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      <section className="mb-4 lg:mb-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 lg:text-base">Outfit ideas</h2>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar lg:grid lg:grid-cols-3 lg:overflow-visible">
          {analysis.outfitSuggestions.map((outfit) => (
            <div
              key={outfit.name}
              className="w-44 shrink-0 rounded-2xl border border-forma-border bg-white p-3 lg:w-full lg:shrink"
            >
              <ProductImage
                src={outfit.imageUrl}
                alt={outfit.name}
                className="mb-2 h-24 w-full rounded-xl lg:h-32"
              />
              <p className="text-xs font-semibold text-gray-900 lg:text-sm">{outfit.name}</p>
              <p className="mt-1 text-[10px] text-forma-muted lg:text-xs">{outfit.reason}</p>
            </div>
          ))}
        </div>
      </section>

      {analysis.stylingTips.length > 0 && (
        <Card title="Styling tips" className="mb-4 lg:mb-6">
          <ul className="space-y-2">
            {analysis.stylingTips.map((tip) => (
              <li key={tip} className="text-xs leading-relaxed text-gray-700 lg:text-sm">
                • {tip}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mb-6 lg:gap-4">
        {showSaleEstimate && (
          <Card
            title={
              <>
                Estimated price trend
                <EstimateBadge note={PRICE_TREND_NOTE} />
              </>
            }
          >
            <p className="text-sm leading-relaxed text-gray-800">{priceTrend.summary}</p>
            {priceTrend.saleLine && (
              <p className="mt-2 text-xs leading-relaxed text-amber-800 lg:text-sm">{priceTrend.saleLine}</p>
            )}
            <EstimateFootnote>{priceTrend.footnote}</EstimateFootnote>
          </Card>
        )}

        <Card title="Wardrobe compatibility">
          <p className="mb-2 text-xs font-semibold text-emerald-600 lg:text-sm">
            Matches {analysis.wardrobeMatches.length} items in your wardrobe
          </p>
          <div className="space-y-2">
            {analysis.wardrobeMatches.slice(0, 3).map((match) => (
              <div key={match.item} className="flex items-center gap-2">
                <ProductImage
                  src={match.imageUrl}
                  alt={match.item}
                  className="h-8 w-8 shrink-0 rounded-lg lg:h-10 lg:w-10"
                />
                <div className="min-w-0">
                  <p className="line-clamp-1 text-[10px] font-medium text-gray-900 lg:text-sm">{match.item}</p>
                  <p className="text-[10px] text-forma-muted lg:text-xs">{match.note}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {scanId && <FormaPlusAnalysisUpsell className="mt-6" />}
    </PageContainer>
  );
}
