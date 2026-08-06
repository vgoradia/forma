"use client";

import Link from "next/link";
import { Plus, Shirt } from "lucide-react";
import {
  countWardrobeItems,
  getDemoWardrobeMatches,
  getWardrobeMatchesFromScans,
} from "@/lib/scan-helpers";
import { useScans } from "@/lib/storage";
import { PageContainer } from "@/components/page-container";
import { ProductImage } from "@/components/product-image";

export default function WardrobePage() {
  const scans = useScans();
  const wardrobeItems = getWardrobeMatchesFromScans(scans);
  const displayItems = wardrobeItems.length > 0 ? wardrobeItems : getDemoWardrobeMatches();
  const itemCount = countWardrobeItems(scans);

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between lg:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 lg:text-3xl">Wardrobe</h1>
          <p className="text-sm text-forma-muted lg:text-base">
            {itemCount > 0
              ? `${itemCount} items learned from your scans`
              : "Build your wardrobe from scans"}
          </p>
        </div>
        <Link
          href="/scan?mode=upload"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-forma-primary text-white lg:h-11 lg:w-11"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </div>

      <div className="mb-6 rounded-2xl border border-forma-border bg-white p-5 lg:p-6">
        <div className="flex items-center gap-3 lg:gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 lg:h-14 lg:w-14">
            <Shirt className="h-6 w-6 text-forma-primary" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 lg:text-lg">Smart wardrobe sync</p>
            <p className="text-xs text-forma-muted lg:text-sm">
              Forma learns wardrobe compatibility from every scan. Full closet sync coming in Forma Plus.
            </p>
          </div>
        </div>
        <Link
          href="/scan"
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-forma-primary py-3 text-sm font-semibold text-white sm:w-auto sm:px-8"
        >
          Scan to improve matches
        </Link>
      </div>

      <h2 className="mb-3 text-sm font-semibold text-gray-900 lg:text-base">Recent matches</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {displayItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-center gap-4 rounded-2xl border border-forma-border bg-white p-4 transition hover:shadow-sm"
          >
            <ProductImage
              src={item.imageUrl}
              alt={item.name}
              className="h-16 w-16 shrink-0 rounded-xl lg:h-20 lg:w-20"
            />
            <div>
              <p className="font-medium text-gray-900">{item.name}</p>
              <p className="text-sm text-emerald-600">Matches {item.matches} items in your wardrobe</p>
            </div>
          </Link>
        ))}
      </div>

      <Link href="/scan" className="mt-6 block text-center text-sm font-semibold text-forma-primary">
        Scan something new to find matches
      </Link>
    </PageContainer>
  );
}
