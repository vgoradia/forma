"use client";

import Link from "next/link";
import { Bell, TrendingDown, Bookmark } from "lucide-react";
import {
  getDemoPriceDrops,
  getPriceDropAlerts,
  getProductName,
  getSavedItems,
  getScanImage,
} from "@/lib/scan-helpers";
import { getPrefs, useBookmarkIds, useScans } from "@/lib/storage";
import { formatPrice } from "@/lib/utils";
import { PageContainer } from "@/components/page-container";
import { ProductImage } from "@/components/product-image";

export default function AlertsPage() {
  const scans = useScans();
  const bookmarkIds = useBookmarkIds();
  const prefs = getPrefs();

  const saleAlerts = prefs.salePredictions ? getPriceDropAlerts(scans) : [];
  const savedItems = getSavedItems(scans, bookmarkIds);
  const demoFallback = getDemoPriceDrops();
  const displayAlerts = saleAlerts.length > 0 ? saleAlerts : demoFallback;
  const alertCount = saleAlerts.length + (prefs.savedItemReminders ? savedItems.length : 0);

  return (
    <PageContainer>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl font-bold text-gray-900 lg:text-3xl">Alerts</h1>
        <p className="text-sm text-forma-muted lg:text-base">Price drops and sale predictions</p>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-forma-border bg-white p-4 lg:p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100">
          <Bell className="h-5 w-5 text-forma-primary" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">
            {alertCount > 0 ? `${alertCount} active alert${alertCount === 1 ? "" : "s"}` : "No active alerts yet"}
          </p>
          <p className="text-xs text-forma-muted lg:text-sm">Manage alerts in Settings</p>
        </div>
        <Link href="/profile" className="ml-auto text-xs font-semibold text-forma-primary lg:text-sm">
          Settings
        </Link>
      </div>

      {savedItems.length > 0 && prefs.savedItemReminders && (
        <>
          <h2 className="mb-3 text-sm font-semibold text-gray-900 lg:text-base">Saved items</h2>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {savedItems.map((scan) => (
              <Link
                key={scan.id}
                href={`/analysis/${scan.id}`}
                className="rounded-2xl border border-forma-border bg-white p-4 lg:p-5 transition hover:shadow-sm"
              >
                <div className="flex gap-4">
                  <ProductImage
                    src={getScanImage(scan)}
                    alt={getProductName(scan)}
                    fit="contain"
                    className="h-20 w-16 shrink-0 rounded-xl bg-gray-50 lg:h-24 lg:w-20"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-1 text-xs text-violet-600">
                      <Bookmark className="h-3 w-3" /> Saved
                    </div>
                    <p className="font-medium text-gray-900 lg:text-lg">{getProductName(scan)}</p>
                    <p className="mt-1 text-lg font-bold text-emerald-600">
                      {formatPrice(scan.analysis.lowestPrice.price)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <h2 className="mb-3 text-sm font-semibold text-gray-900 lg:text-base">Price drops to watch</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {displayAlerts.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="rounded-2xl border border-forma-border bg-white p-4 lg:p-5 transition hover:shadow-sm"
          >
            <div className="flex gap-4">
              <ProductImage
                src={item.imageUrl}
                alt={item.name}
                className="h-20 w-16 shrink-0 rounded-xl lg:h-24 lg:w-20"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 lg:text-lg">{item.name}</p>
                <p className="mt-1 text-lg font-bold text-emerald-600">{formatPrice(item.price)}</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 lg:text-sm">
                  <TrendingDown className="h-3.5 w-3.5" />
                  {item.subtitle}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {scans.length === 0 && (
        <p className="mt-6 text-center text-sm text-forma-muted">
          Scan products to get personalized sale predictions here.
        </p>
      )}
    </PageContainer>
  );
}
