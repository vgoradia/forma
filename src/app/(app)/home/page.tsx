"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Camera, ChevronRight, BadgeCheck } from "lucide-react";
import { getRecentScanRows } from "@/lib/scan-helpers";
import { saveScan, useLastScan, useScans } from "@/lib/storage";
import { resolveRetailerLabel } from "@/lib/retailer-rows";
import { formatAtRetailer, formatPrice, formatProductTitle, stripPlaceholderMentions } from "@/lib/utils";
import { alignVerdictPriceText, isEstimatedPrice } from "@/lib/price-estimates";
import { EstimateBadge } from "@/components/estimate-badge";
import { PageContainer } from "@/components/page-container";
import { ProductImage, getAnalysisHeroImage } from "@/components/product-image";
import { FormaPlusBanner } from "@/components/forma-plus-cta";
import { ScanQuotaBanner } from "@/components/scan-quota-banner";
import { VerdictBadge } from "@/components/analysis/verdict-badge";
import { fetchProductImageUrl } from "@/lib/product-images";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useScanQuota } from "@/hooks/use-scan-quota";
import { useSubscriptionPlan } from "@/hooks/use-subscription-plan";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function AppHomePage() {
  const lastScan = useLastScan();
  const scans = useScans();
  const profile = useUserProfile();
  const { plan } = useSubscriptionPlan();
  const quota = useScanQuota();

  useEffect(() => {
    if (!lastScan) return;
    const hero = getAnalysisHeroImage(lastScan.analysis, lastScan.imagePreview);
    if (hero) return;

    let cancelled = false;
    void (async () => {
      const imageUrl = await fetchProductImageUrl(lastScan.analysis, lastScan.label);
      if (!imageUrl || cancelled) return;

      saveScan({
        ...lastScan,
        analysis: {
          ...lastScan.analysis,
          identifiedProduct: {
            ...lastScan.analysis.identifiedProduct,
            imageUrl,
          },
          lowestPrice: {
            ...lastScan.analysis.lowestPrice,
            imageUrl: lastScan.analysis.lowestPrice.imageUrl ?? imageUrl,
          },
        },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [lastScan]);

  const recentScans = getRecentScanRows(scans);
  const product = lastScan?.analysis.identifiedProduct;
  const lowest = lastScan?.analysis.lowestPrice;
  const productTitle = product ? formatProductTitle(product.brand, product.name) || product.category || "This item" : "";
  const atRetailer = lowest ? formatAtRetailer(resolveRetailerLabel(lowest.retailer, lowest.url)) : "";
  const showPlus =
    plan !== "plus" && (scans.length > 0 || quota.remaining <= 2);

  return (
    <PageContainer>
      <div className="mb-8">
        <p className="text-sm text-forma-muted">{getGreeting()}, {profile.displayName}</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 lg:text-3xl">
          Should you buy it?
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-forma-muted lg:text-base">
          Screenshot a TikTok find, paste a link, and get a buy / wait / skip verdict with prices and dupes.
        </p>
      </div>

      <div className="mb-6 space-y-4 lg:max-w-xl">
        <Link
          href="/scan"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-forma-primary py-4 text-base font-semibold text-white shadow-sm transition hover:bg-forma-primary-dark"
        >
          <Camera className="h-5 w-5" />
          Scan something
        </Link>
        <ScanQuotaBanner />
      </div>

      {showPlus && (
        <FormaPlusBanner
          variant="compact"
          className="mb-8"
          headline="Unlimited verdicts with Forma Plus"
        />
      )}

      {lastScan && product && lowest ? (
        <Link
          href={`/analysis/${lastScan.id}`}
          className="mb-8 block rounded-3xl border border-forma-border bg-white p-4 shadow-sm transition hover:shadow-md lg:max-w-2xl lg:p-6"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <VerdictBadge recommendation={lastScan.analysis.verdict.recommendation} />
            <span className="text-xs font-medium text-forma-muted">Latest verdict</span>
          </div>
          <div className="flex gap-4 lg:gap-6">
            <ProductImage
              src={getAnalysisHeroImage(lastScan.analysis, lastScan.imagePreview)}
              alt={productTitle}
              fit="contain"
              className="h-24 w-20 shrink-0 rounded-2xl lg:h-36 lg:w-32"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 lg:text-lg">
                {productTitle}
              </p>
              <p className="mt-2 text-sm text-gray-700">
                {alignVerdictPriceText(stripPlaceholderMentions(lastScan.analysis.verdict.headline), {
                  displayed: lowest.price,
                  shown: [lowest.price, ...lastScan.analysis.prices.map((price) => price.price)],
                  preserve: [
                    ...lastScan.analysis.alternatives.map((alt) => alt.price),
                    ...lastScan.analysis.secondhand.platforms.map((platform) => platform.price),
                    lastScan.analysis.salePrediction?.estimatedSalePrice ?? 0,
                  ],
                })}
              </p>
              <p className="mt-2 text-sm text-gray-700 lg:text-base">
                {isEstimatedPrice(lowest) ? "Estimated: about " : "Lowest: "}
                <span className="font-bold text-emerald-600">{formatPrice(lowest.price)}</span>
                {atRetailer ? ` ${atRetailer}` : ""}
                {isEstimatedPrice(lowest) ? <EstimateBadge /> : " (verified)"}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 border-t border-gray-100 pt-3 text-xs font-semibold text-forma-primary">
            Open full analysis
            <ChevronRight className="h-4 w-4" />
          </div>
        </Link>
      ) : (
        <div className="mb-8 rounded-3xl border border-dashed border-forma-border bg-white p-8 text-center lg:max-w-xl">
          <BadgeCheck className="mx-auto h-8 w-8 text-forma-primary" />
          <p className="mt-3 text-sm font-medium text-gray-900">No verdicts yet</p>
          <p className="mt-1 text-xs text-forma-muted">
            Your buy / wait / skip cards show up here after you scan.
          </p>
        </div>
      )}

      <section className="mb-6 lg:max-w-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Recent scans</h2>
          {recentScans.length > 0 && (
            <Link href="/scan" className="text-xs font-semibold text-forma-primary">
              New scan
            </Link>
          )}
        </div>
        {recentScans.length > 0 ? (
          <div className="grid gap-2">
            {recentScans.slice(0, 6).map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-between rounded-2xl border border-forma-border bg-white px-4 py-3 transition hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-xs font-bold uppercase text-gray-500">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-forma-muted">
                      {item.name === item.source ? item.time : `${item.source} · ${item.time}`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-forma-border bg-white px-4 py-6 text-center text-sm text-forma-muted">
            Scan history stays on this device until you sign in (cloud sync coming).
          </p>
        )}
      </section>
    </PageContainer>
  );
}
