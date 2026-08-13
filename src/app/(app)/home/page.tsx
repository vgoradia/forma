"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Camera,
  Link2,
  ChevronRight,
  BadgeCheck,
} from "lucide-react";
import {
  getContinueSearching,
  getDemoContinueSearching,
  getDemoPriceDrops,
  getDemoRecommended,
  getDemoWardrobeMatches,
  getPriceDropAlerts,
  getRecentScanRows,
  getRecommendedFromScans,
  getWardrobeMatchesFromScans,
} from "@/lib/scan-helpers";
import { getPrefs, isOnboardingComplete, saveScan, useLastScan, useScans } from "@/lib/storage";
import { formatPrice } from "@/lib/utils";
import { HorizontalSection } from "@/components/home/horizontal-section";
import { ProductCard } from "@/components/home/product-card";
import { PageContainer } from "@/components/page-container";
import { ProductImage, getAnalysisHeroImage } from "@/components/product-image";
import { FormaPlusBanner } from "@/components/forma-plus-cta";
import { LogoWordmark } from "@/components/logo";
import { fetchProductImageUrl } from "@/lib/product-images";
import { useUserProfile } from "@/hooks/use-user-profile";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function AppHomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const lastScan = useLastScan();
  const scans = useScans();
  const prefs = useMemo(() => getPrefs(), []);
  const profile = useUserProfile();

  useEffect(() => {
    if (!isOnboardingComplete()) {
      router.replace("/onboarding");
    }
  }, [router]);

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

  const continueSearching =
    scans.length > 0 ? getContinueSearching(scans) : getDemoContinueSearching();
  const priceDrops =
    scans.length > 0 && prefs.salePredictions
      ? getPriceDropAlerts(scans)
      : getDemoPriceDrops();
  const recommended =
    scans.length > 0 ? getRecommendedFromScans(scans) : getDemoRecommended();
  const wardrobeMatches =
    scans.length > 0 ? getWardrobeMatchesFromScans(scans) : getDemoWardrobeMatches();
  const recentScans = getRecentScanRows(scans);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/scan?q=${encodeURIComponent(query.trim())}`);
  };

  const product = lastScan?.analysis.identifiedProduct;
  const lowest = lastScan?.analysis.lowestPrice;

  return (
    <PageContainer>
      <div className="mb-6 flex items-start justify-between lg:mb-8">
        <div>
          <p className="text-sm text-forma-muted">{getGreeting()}, {profile.displayName}</p>
          <div className="mt-1">
            <LogoWordmark size="lg" showTagline />
          </div>
        </div>
        <Link
          href="/profile"
          className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-white lg:hidden"
        >
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-200 to-indigo-300 text-xs font-semibold text-indigo-700">
              {profile.initials}
            </div>
          )}
        </Link>
      </div>

      <div className="mb-8 lg:mb-10">
        <form onSubmit={handleSearch} className="mb-4 lg:max-w-2xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-forma-muted lg:h-5 lg:w-5" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a product, paste a link, or upload a screenshot"
              className="w-full rounded-2xl border border-forma-border bg-white py-3.5 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-forma-primary focus:outline-none focus:ring-2 focus:ring-indigo-100 lg:py-4 lg:text-base"
            />
          </div>
        </form>

        <div className="flex flex-col gap-3 sm:flex-row lg:max-w-2xl">
          <Link
            href="/scan?mode=upload"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-forma-primary py-3 text-sm font-semibold text-white shadow-sm lg:py-3.5 lg:text-base"
          >
            <Camera className="h-4 w-4" />
            Scan image
          </Link>
          <Link
            href="/scan?mode=link"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-forma-border bg-white py-3 text-sm font-semibold text-gray-700 shadow-sm lg:py-3.5 lg:text-base"
          >
            <Link2 className="h-4 w-4" />
            Paste link
          </Link>
        </div>
      </div>

      <FormaPlusBanner variant="compact" className="mb-8" headline="Scan unlimited products with Forma Plus" />

      {lastScan && product && lowest ? (
        <Link
          href={`/analysis/${lastScan.id}`}
          className="mb-8 block rounded-3xl border border-forma-border bg-white p-4 shadow-sm transition hover:shadow-md lg:p-6"
        >
          <span className="mb-3 inline-block rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
            Last search
          </span>
          <div className="flex gap-4 lg:gap-6">
            <ProductImage
              src={getAnalysisHeroImage(lastScan.analysis, lastScan.imagePreview)}
              alt={`${product.brand} ${product.name}`}
              fit="contain"
              className="h-24 w-20 shrink-0 rounded-2xl lg:h-36 lg:w-32"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 lg:text-lg">
                {product.brand} {product.name}
              </p>
              <p className="mt-1 text-sm text-forma-muted">
                {product.colors?.[0] ?? "—"} • {Math.round((product.confidence ?? 0) * 100)}% match
              </p>
              <p className="mt-2 text-sm text-gray-700 lg:text-base">
                Lowest price found:{" "}
                <span className="font-bold text-emerald-600">{formatPrice(lowest.price)}</span> at{" "}
                {lowest.retailer}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-forma-muted lg:text-sm">
              {lastScan.analysis.prices.length} retailers compared •{" "}
              {lastScan.analysis.alternatives.length} better alternatives found
            </p>
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <BadgeCheck className="h-3.5 w-3.5" />
              High confidence
            </span>
          </div>
        </Link>
      ) : (
        <div className="mb-8 rounded-3xl border border-dashed border-forma-border bg-white p-6 text-center lg:p-10">
          <p className="text-sm font-medium text-gray-900 lg:text-base">No searches yet</p>
          <p className="mt-1 text-xs text-forma-muted lg:text-sm">
            Scan an image or paste a link to get started
          </p>
          <Link
            href="/scan"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-forma-primary"
          >
            Start your first scan
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:gap-y-2">
        <HorizontalSection title="Continue searching" href="/scan">
          {continueSearching.map((item) => (
            <ProductCard
              key={item.id}
              name={item.name}
              subtitle={item.subtitle}
              imageUrl={item.imageUrl}
              href={item.href}
            />
          ))}
        </HorizontalSection>

        <HorizontalSection title="Price drops to watch" href="/alerts">
          {(priceDrops.length > 0 ? priceDrops : getDemoPriceDrops()).map((item) => (
            <ProductCard
              key={item.id}
              name={item.name}
              subtitle={item.subtitle}
              price={item.price}
              imageUrl={item.imageUrl}
              href={item.href}
            />
          ))}
        </HorizontalSection>

        <HorizontalSection title="Recommended for you" href="/scan">
          {(recommended.length > 0 ? recommended : getDemoRecommended()).map((item) => (
            <ProductCard
              key={item.id}
              name={item.name}
              subtitle={item.subtitle}
              imageUrl={item.imageUrl}
              href={item.href}
            />
          ))}
        </HorizontalSection>

        <HorizontalSection title="Wardrobe matches" href="/wardrobe">
          {(wardrobeMatches.length > 0 ? wardrobeMatches : getDemoWardrobeMatches()).map((item) => (
            <ProductCard
              key={item.id}
              name={item.name}
              subtitle={item.subtitle}
              imageUrl={item.imageUrl}
              href={item.href}
            />
          ))}
        </HorizontalSection>
      </div>

      <section className="mb-6 lg:mt-4">
        <h2 className="mb-3 text-base font-semibold text-gray-900 lg:text-lg">Recent scans</h2>
        {recentScans.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recentScans.map((item) => (
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
                    <p className="text-sm font-medium text-gray-900">{item.source}</p>
                    <p className="text-xs text-forma-muted">{item.time}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-forma-border bg-white px-4 py-6 text-center text-sm text-forma-muted">
            Your scan history will appear here after your first search.
          </p>
        )}
      </section>
    </PageContainer>
  );
}
